"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const getJwtSecret = (name, fallback) => {
    const secret = process.env[name];
    if (!secret && process.env.NODE_ENV === "production") {
        throw new Error(`${name} is required in production`);
    }
    return secret || fallback;
};
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Authentication required: Missing Bearer Token" });
        }
        const token = authHeader.split(" ")[1];
        const secret = getJwtSecret("JWT_ACCESS_SECRET", "development_access_secret_change_me");
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, secret);
        }
        catch (err) {
            return res.status(401).json({ message: "Invalid or expired access token" });
        }
        const user = await User_1.default.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ message: "User account no longer exists" });
        }
        if (user.status === "suspended") {
            return res.status(403).json({ message: "Your account is suspended. Please contact support." });
        }
        // Assign user to request context
        req.user = user;
        next();
    }
    catch (error) {
        console.error("Auth Middleware Error:", error);
        return res.status(500).json({ message: "Internal Server Error during authentication" });
    }
};
exports.authenticate = authenticate;
const authorize = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Forbidden: Access restricted. Required roles: [${allowedRoles.join(", ")}], Your role: ${req.user.role}`
            });
        }
        next();
    };
};
exports.authorize = authorize;
