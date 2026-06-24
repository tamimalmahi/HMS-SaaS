"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshToken = exports.logout = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("../models/User"));
const House_1 = __importDefault(require("../models/House"));
const RefreshToken_1 = __importDefault(require("../models/RefreshToken"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const zod_1 = require("zod");
const loginSchema = zod_1.z.object({
    username: zod_1.z.string().min(1, "Username is required"),
    password: zod_1.z.string().min(1, "Password is required")
});
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Name must be at least 2 characters"),
    email: zod_1.z.string().email("Invalid email format"),
    phone: zod_1.z.string().min(10, "Phone number must be valid"),
    username: zod_1.z.string().min(3, "Username must be at least 3 characters").regex(/^[a-zA-Z0-9_]+$/, "Username must be alphanumeric or underscores"),
    password: zod_1.z.string().min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain an uppercase letter")
        .regex(/[a-z]/, "Password must contain a lowercase letter")
        .regex(/[0-9]/, "Password must contain a number")
        .regex(/[^A-Za-z0-9]/, "Password must contain a special character"),
    houseName: zod_1.z.string().min(3, "House name must be at least 3 characters"),
    houseSlug: zod_1.z.string().min(3, "Slug must be at least 3 characters").regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric and hyphens only")
});
const generateAccessToken = (user) => {
    if (!process.env.JWT_ACCESS_SECRET && process.env.NODE_ENV === "production") {
        throw new Error("JWT_ACCESS_SECRET is required in production");
    }
    return jsonwebtoken_1.default.sign({ userId: user._id, role: user.role }, process.env.JWT_ACCESS_SECRET || "development_access_secret_change_me", { expiresIn: "15m" });
};
const generateRefreshToken = async (userId) => {
    if (!process.env.JWT_REFRESH_SECRET && process.env.NODE_ENV === "production") {
        throw new Error("JWT_REFRESH_SECRET is required in production");
    }
    const token = jsonwebtoken_1.default.sign({ userId }, process.env.JWT_REFRESH_SECRET || "development_refresh_secret_change_me", { expiresIn: "7d" });
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await RefreshToken_1.default.create({
        userId,
        token,
        expiresAt
    });
    return token;
};
const register = async (req, res, next) => {
    try {
        const data = registerSchema.parse(req.body);
        // Check if slug, email, or username exists
        const existingHouse = await House_1.default.findOne({ slug: data.houseSlug.toLowerCase() });
        if (existingHouse) {
            return res.status(400).json({ message: "House Slug already taken. Please try another one." });
        }
        const existingUser = await User_1.default.findOne({
            $or: [{ email: data.email.toLowerCase() }, { username: data.username.toLowerCase() }]
        });
        if (existingUser) {
            return res.status(400).json({ message: "Username or Email already registered." });
        }
        // 1. Create the House
        const house = await House_1.default.create({
            name: data.houseName,
            slug: data.houseSlug.toLowerCase(),
            plan: "free",
            status: "active"
        });
        // 2. Create the House Admin User
        const salt = await bcryptjs_1.default.genSalt(12);
        const passwordHash = await bcryptjs_1.default.hash(data.password, salt);
        const user = await User_1.default.create({
            name: data.name,
            email: data.email.toLowerCase(),
            phone: data.phone,
            username: data.username.toLowerCase(),
            passwordHash,
            role: "house_admin",
            houseId: house._id,
            status: "active"
        });
        // 3. Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = await generateRefreshToken(String(user._id));
        // Set HTTPOnly cookie for Refresh Token
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        // 4. Audit Log
        await AuditLog_1.default.create({
            houseId: house._id,
            userId: user._id,
            username: user.username,
            action: "HOUSE_REGISTER",
            details: `Registered House Admin and created House: ${house.name} (${house.slug})`,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });
        return res.status(201).json({
            message: "House and Admin registered successfully",
            accessToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                houseId: user.houseId,
                houseSlug: house.slug,
                houseName: house.name,
                branding: house.branding
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.register = register;
const login = async (req, res, next) => {
    try {
        const { username, password } = loginSchema.parse(req.body);
        const user = await User_1.default.findOne({ username: username.toLowerCase() });
        if (!user) {
            return res.status(401).json({ message: "Invalid username or password" });
        }
        if (user.status === "suspended") {
            return res.status(403).json({ message: "Your account is suspended." });
        }
        // Check account lockout
        const LOCK_TIME = 15 * 60 * 1000; // 15 minutes lockout
        if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
            return res.status(429).json({
                message: `Account is temporarily locked. Try again after ${new Date(user.lockUntil).toLocaleTimeString()}`
            });
        }
        // Verify Password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            user.loginAttempts += 1;
            if (user.loginAttempts >= 5) {
                user.lockUntil = new Date(Date.now() + LOCK_TIME);
                await user.save();
                await AuditLog_1.default.create({
                    houseId: user.houseId,
                    userId: user._id,
                    username: user.username,
                    action: "ACCOUNT_LOCKOUT",
                    details: "Account locked due to 5 consecutive failed logins",
                    ipAddress: req.ip,
                    userAgent: req.headers["user-agent"]
                });
                return res.status(429).json({ message: "Too many failed attempts. Account locked for 15 minutes." });
            }
            await user.save();
            return res.status(401).json({ message: "Invalid username or password" });
        }
        // Reset login attempts
        user.loginAttempts = 0;
        user.lockUntil = undefined;
        await user.save();
        // Fetch house details if user belongs to a house
        let houseDetails = null;
        if (user.houseId) {
            const house = await House_1.default.findById(user.houseId);
            if (house) {
                if (house.status === "suspended") {
                    return res.status(403).json({ message: "Your house is suspended by the platform administrator." });
                }
                houseDetails = {
                    name: house.name,
                    slug: house.slug,
                    plan: house.plan,
                    branding: house.branding
                };
            }
        }
        const accessToken = generateAccessToken(user);
        const refreshToken = await generateRefreshToken(String(user._id));
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        await AuditLog_1.default.create({
            houseId: user.houseId,
            userId: user._id,
            username: user.username,
            action: "LOGIN_SUCCESS",
            details: "Successfully logged in",
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });
        return res.status(200).json({
            accessToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                houseId: user.houseId,
                houseSlug: houseDetails?.slug || null,
                houseName: houseDetails?.name || null,
                plan: houseDetails?.plan || null,
                branding: houseDetails?.branding || null
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
const logout = async (req, res, next) => {
    try {
        const token = req.cookies.refreshToken;
        if (token) {
            // Revoke refresh token
            await RefreshToken_1.default.findOneAndUpdate({ token }, { isRevoked: true });
        }
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict"
        });
        if (req.user) {
            await AuditLog_1.default.create({
                houseId: req.user.houseId,
                userId: req.user._id,
                username: req.user.username,
                action: "LOGOUT",
                details: "Logged out successfully",
                ipAddress: req.ip,
                userAgent: req.headers["user-agent"]
            });
        }
        return res.status(200).json({ message: "Logged out successfully" });
    }
    catch (error) {
        next(error);
    }
};
exports.logout = logout;
const refreshToken = async (req, res, next) => {
    try {
        const token = req.cookies.refreshToken;
        if (!token) {
            return res.status(401).json({ message: "Refresh token missing" });
        }
        const tokenDoc = await RefreshToken_1.default.findOne({ token });
        if (!tokenDoc) {
            return res.status(401).json({ message: "Invalid refresh token" });
        }
        // Token theft check
        if (tokenDoc.isUsed || tokenDoc.isRevoked) {
            // Revoke all tokens for this user as a safeguard
            await RefreshToken_1.default.updateMany({ userId: tokenDoc.userId }, { isRevoked: true });
            res.clearCookie("refreshToken");
            return res.status(401).json({ message: "Token reuse detected! All sessions revoked." });
        }
        // Verify token expiry and JWT signature
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_REFRESH_SECRET || "development_refresh_secret_change_me");
        }
        catch (err) {
            return res.status(401).json({ message: "Invalid or expired refresh token" });
        }
        const user = await User_1.default.findById(decoded.userId);
        if (!user || user.status === "suspended") {
            return res.status(401).json({ message: "User suspended or no longer exists" });
        }
        // Mark old token as used
        tokenDoc.isUsed = true;
        await tokenDoc.save();
        // Generate new Access and Refresh tokens
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = await generateRefreshToken(String(user._id));
        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        return res.status(200).json({
            accessToken: newAccessToken
        });
    }
    catch (error) {
        next(error);
    }
};
exports.refreshToken = refreshToken;
