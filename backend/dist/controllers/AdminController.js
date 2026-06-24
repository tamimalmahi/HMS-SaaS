"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlatformAuditLogs = exports.getSystemAnalytics = exports.updateHousePlan = exports.updateHouseStatus = exports.getHouses = void 0;
const House_1 = __importDefault(require("../models/House"));
const User_1 = __importDefault(require("../models/User"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const zod_1 = require("zod");
const updateStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(["active", "suspended"])
});
const updatePlanSchema = zod_1.z.object({
    plan: zod_1.z.enum(["free", "basic", "pro"])
});
const getHouses = async (req, res, next) => {
    try {
        const houses = await House_1.default.find().sort({ createdAt: -1 });
        return res.status(200).json(houses);
    }
    catch (error) {
        next(error);
    }
};
exports.getHouses = getHouses;
const updateHouseStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = updateStatusSchema.parse(req.body);
        const house = await House_1.default.findById(id);
        if (!house) {
            return res.status(404).json({ message: "House not found" });
        }
        house.status = status;
        await house.save();
        await AuditLog_1.default.create({
            houseId: null, // System-level
            userId: req.user._id,
            username: req.user.username,
            action: "ADMIN_HOUSE_STATUS",
            details: `Platform admin set house: ${house.name} (${house.slug}) status to ${status}`
        });
        return res.status(200).json({
            message: `House status updated to ${status}`,
            house
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateHouseStatus = updateHouseStatus;
const updateHousePlan = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { plan } = updatePlanSchema.parse(req.body);
        const house = await House_1.default.findById(id);
        if (!house) {
            return res.status(404).json({ message: "House not found" });
        }
        const oldPlan = house.plan;
        house.plan = plan;
        await house.save();
        await AuditLog_1.default.create({
            houseId: null,
            userId: req.user._id,
            username: req.user.username,
            action: "ADMIN_HOUSE_PLAN",
            details: `Platform admin upgraded house: ${house.name} plan from ${oldPlan} to ${plan}`
        });
        return res.status(200).json({
            message: `House plan updated to ${plan}`,
            house
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateHousePlan = updateHousePlan;
const getSystemAnalytics = async (req, res, next) => {
    try {
        const totalHouses = await House_1.default.countDocuments();
        const activeHouses = await House_1.default.countDocuments({ status: "active" });
        const suspendedHouses = await House_1.default.countDocuments({ status: "suspended" });
        const totalMembers = await User_1.default.countDocuments({ role: "member" });
        const totalAdmins = await User_1.default.countDocuments({ role: "house_admin" });
        // Plan distributions
        const freePlans = await House_1.default.countDocuments({ plan: "free" });
        const basicPlans = await House_1.default.countDocuments({ plan: "basic" });
        const proPlans = await House_1.default.countDocuments({ plan: "pro" });
        // Sum up overall storage bytes
        const houses = await House_1.default.find().select("storageUsed");
        const totalStorageBytes = houses.reduce((sum, h) => sum + h.storageUsed, 0);
        return res.status(200).json({
            houses: {
                total: totalHouses,
                active: activeHouses,
                suspended: suspendedHouses
            },
            users: {
                members: totalMembers,
                admins: totalAdmins,
                total: totalMembers + totalAdmins
            },
            plans: {
                free: freePlans,
                basic: basicPlans,
                pro: proPlans
            },
            storage: {
                totalBytes: totalStorageBytes,
                totalMB: (totalStorageBytes / (1024 * 1024)).toFixed(2)
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getSystemAnalytics = getSystemAnalytics;
const getPlatformAuditLogs = async (req, res, next) => {
    try {
        const logs = await AuditLog_1.default.find().sort({ createdAt: -1 }).limit(100);
        return res.status(200).json(logs);
    }
    catch (error) {
        next(error);
    }
};
exports.getPlatformAuditLogs = getPlatformAuditLogs;
