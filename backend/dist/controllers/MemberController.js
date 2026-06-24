"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMember = exports.updateMember = exports.addMember = exports.getMembers = void 0;
const User_1 = __importDefault(require("../models/User"));
const Room_1 = __importDefault(require("../models/Room"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const createMemberSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Name must be at least 2 characters"),
    email: zod_1.z.string().email("Invalid email format"),
    phone: zod_1.z.string().min(10, "Phone number is required"),
    username: zod_1.z.string().min(3, "Username must be at least 3 characters").regex(/^[a-zA-Z0-9_]+$/, "Alphanumeric and underscores only"),
    password: zod_1.z.string().min(8, "Password must be at least 8 characters"),
    role: zod_1.z.enum(["house_admin", "assistant_admin", "member"])
});
const updateMemberSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Name must be at least 2 characters"),
    email: zod_1.z.string().email("Invalid email format"),
    phone: zod_1.z.string().min(10, "Phone number is required"),
    role: zod_1.z.enum(["house_admin", "assistant_admin", "member"]),
    status: zod_1.z.enum(["active", "suspended"])
});
const getMembers = async (req, res, next) => {
    try {
        const members = await User_1.default.find({ houseId: req.houseId }).select("-passwordHash");
        return res.status(200).json(members);
    }
    catch (error) {
        next(error);
    }
};
exports.getMembers = getMembers;
const addMember = async (req, res, next) => {
    try {
        const data = createMemberSchema.parse(req.body);
        const house = req.house;
        // Enforce role restrictions for Free/Basic plans (Assistant Admin requires Pro)
        if (data.role === "assistant_admin" && house.plan !== "pro") {
            return res.status(400).json({ message: "Assistant Admin role is a PRO plan feature. Please upgrade." });
        }
        // Count existing members in this house
        const memberCount = await User_1.default.countDocuments({ houseId: house._id });
        // Validate plan limits (Free: 15, Basic: 30, Pro: 100)
        const planLimits = { free: 15, basic: 30, pro: 100 };
        const maxLimit = planLimits[house.plan] || planLimits.free;
        if (memberCount >= maxLimit) {
            return res.status(400).json({
                message: `Plan limit reached. Your current plan (${house.plan.toUpperCase()}) allows a maximum of ${maxLimit} members. Please upgrade.`
            });
        }
        // Check if user already exists in platform
        const existingUser = await User_1.default.findOne({
            $or: [{ email: data.email.toLowerCase() }, { username: data.username.toLowerCase() }]
        });
        if (existingUser) {
            return res.status(400).json({ message: "Username or Email already registered in the platform." });
        }
        // Hash password
        const salt = await bcryptjs_1.default.genSalt(12);
        const passwordHash = await bcryptjs_1.default.hash(data.password, salt);
        const user = await User_1.default.create({
            name: data.name,
            email: data.email.toLowerCase(),
            phone: data.phone,
            username: data.username.toLowerCase(),
            passwordHash,
            role: data.role,
            houseId: house._id,
            status: "active"
        });
        await AuditLog_1.default.create({
            houseId: house._id,
            userId: req.user._id,
            username: req.user.username,
            action: "MEMBER_ADD",
            details: `Added new member: ${user.name} (${user.username}) as ${user.role}`
        });
        return res.status(201).json({
            message: "Member added successfully",
            member: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                status: user.status
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.addMember = addMember;
const updateMember = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = updateMemberSchema.parse(req.body);
        const house = req.house;
        if (data.role === "assistant_admin" && house.plan !== "pro") {
            return res.status(400).json({ message: "Assistant Admin role is a PRO plan feature. Please upgrade." });
        }
        const member = await User_1.default.findOne({ _id: id, houseId: req.houseId });
        if (!member) {
            return res.status(404).json({ message: "Member not found or unauthorized" });
        }
        // Prevent changing your own admin role or status to lock yourself out
        if (String(member._id) === String(req.user._id)) {
            if (data.role !== member.role || data.status !== member.status) {
                return res.status(400).json({ message: "You cannot change your own role or suspend yourself." });
            }
        }
        // Check if email already taken by someone else
        const emailCheck = await User_1.default.findOne({ email: data.email.toLowerCase(), _id: { $ne: id } });
        if (emailCheck) {
            return res.status(400).json({ message: "Email is already taken by another user." });
        }
        member.name = data.name;
        member.email = data.email.toLowerCase();
        member.phone = data.phone;
        member.role = data.role;
        member.status = data.status;
        await member.save();
        await AuditLog_1.default.create({
            houseId: req.house._id,
            userId: req.user._id,
            username: req.user.username,
            action: "MEMBER_UPDATE",
            details: `Updated member details for ${member.username}: role=${member.role}, status=${member.status}`
        });
        return res.status(200).json({
            message: "Member updated successfully",
            member: {
                id: member._id,
                name: member.name,
                email: member.email,
                phone: member.phone,
                role: member.role,
                status: member.status
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateMember = updateMember;
const deleteMember = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (String(id) === String(req.user._id)) {
            return res.status(400).json({ message: "You cannot delete yourself." });
        }
        const member = await User_1.default.findOne({ _id: id, houseId: req.houseId });
        if (!member) {
            return res.status(404).json({ message: "Member not found or unauthorized" });
        }
        // Unassign from any room before deleting
        await Room_1.default.updateMany({ houseId: req.houseId, occupiedBy: id }, { $pull: { occupiedBy: id } });
        await User_1.default.deleteOne({ _id: id });
        await AuditLog_1.default.create({
            houseId: req.house._id,
            userId: req.user._id,
            username: req.user.username,
            action: "MEMBER_DELETE",
            details: `Removed member: ${member.name} (${member.username})`
        });
        return res.status(200).json({ message: "Member removed from house successfully" });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteMember = deleteMember;
