"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotice = exports.updateNotice = exports.createNotice = exports.getNotices = void 0;
const Notice_1 = __importDefault(require("../models/Notice"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const upload_1 = require("../middleware/upload");
const zod_1 = require("zod");
const noticeSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, "Title is required"),
    content: zod_1.z.string().min(1, "Content is required"),
    type: zod_1.z.enum(["general", "emergency", "meal", "maintenance"]),
    priority: zod_1.z.enum(["low", "medium", "high"]),
    isPinned: zod_1.z.string().optional(),
    expiryDate: zod_1.z.string().optional()
});
const getNotices = async (req, res, next) => {
    try {
        const isAdmin = ["house_admin", "assistant_admin"].includes(req.user?.role || "");
        const query = { houseId: req.houseId };
        // Members should not see expired notices
        if (!isAdmin) {
            query.$or = [
                { expiryDate: { $exists: false } },
                { expiryDate: null },
                { expiryDate: { $gt: new Date() } }
            ];
        }
        // Pinned notices first, then newest first
        const notices = await Notice_1.default.find(query)
            .populate("createdBy", "name username")
            .sort({ isPinned: -1, createdAt: -1 });
        return res.status(200).json(notices);
    }
    catch (error) {
        next(error);
    }
};
exports.getNotices = getNotices;
const createNotice = async (req, res, next) => {
    try {
        const data = noticeSchema.parse(req.body);
        const house = req.house;
        let imageUrl = undefined;
        // Process image attachment if present
        if (req.file) {
            // Validate storage limit
            const planLimits = { free: 10 * 1024 * 1024, basic: 50 * 1024 * 1024, pro: 200 * 1024 * 1024 };
            const maxLimit = planLimits[house.plan] || planLimits.free;
            if (house.storageUsed + req.file.size > maxLimit) {
                return res.status(400).json({ message: "Storage limit reached. Cannot attach image." });
            }
            const uploadResult = await (0, upload_1.processUpload)(req.file);
            imageUrl = uploadResult.fileUrl;
            house.storageUsed += uploadResult.fileSize;
            await house.save();
        }
        const notice = await Notice_1.default.create({
            houseId: req.houseId,
            title: data.title,
            content: data.content,
            type: data.type,
            priority: data.priority,
            isPinned: data.isPinned === "true",
            expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
            imageUrl,
            createdBy: req.user._id
        });
        await AuditLog_1.default.create({
            houseId: house._id,
            userId: req.user._id,
            username: req.user.username,
            action: "NOTICE_CREATE",
            details: `Created notice: "${notice.title}" (${notice.type} notice, priority: ${notice.priority})`
        });
        return res.status(201).json(notice);
    }
    catch (error) {
        next(error);
    }
};
exports.createNotice = createNotice;
const updateNotice = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = noticeSchema.parse(req.body);
        const house = req.house;
        const notice = await Notice_1.default.findOne({ _id: id, houseId: req.houseId });
        if (!notice) {
            return res.status(404).json({ message: "Notice not found or unauthorized" });
        }
        let imageUrl = notice.imageUrl;
        if (req.file) {
            const planLimits = { free: 10 * 1024 * 1024, basic: 50 * 1024 * 1024, pro: 200 * 1024 * 1024 };
            const maxLimit = planLimits[house.plan] || planLimits.free;
            if (house.storageUsed + req.file.size > maxLimit) {
                return res.status(400).json({ message: "Storage limit reached. Cannot attach image." });
            }
            const uploadResult = await (0, upload_1.processUpload)(req.file);
            imageUrl = uploadResult.fileUrl;
            house.storageUsed += uploadResult.fileSize;
            await house.save();
        }
        notice.title = data.title;
        notice.content = data.content;
        notice.type = data.type;
        notice.priority = data.priority;
        notice.isPinned = data.isPinned === "true";
        notice.expiryDate = data.expiryDate ? new Date(data.expiryDate) : undefined;
        notice.imageUrl = imageUrl;
        await notice.save();
        await AuditLog_1.default.create({
            houseId: house._id,
            userId: req.user._id,
            username: req.user.username,
            action: "NOTICE_UPDATE",
            details: `Updated notice: "${notice.title}"`
        });
        return res.status(200).json(notice);
    }
    catch (error) {
        next(error);
    }
};
exports.updateNotice = updateNotice;
const deleteNotice = async (req, res, next) => {
    try {
        const { id } = req.params;
        const house = req.house;
        const notice = await Notice_1.default.findOne({ _id: id, houseId: req.houseId });
        if (!notice) {
            return res.status(404).json({ message: "Notice not found or unauthorized" });
        }
        // We do not decrease house storage used unless we track the size of notice images.
        // For simplicity, we just delete the document.
        await Notice_1.default.deleteOne({ _id: id });
        await AuditLog_1.default.create({
            houseId: house._id,
            userId: req.user._id,
            username: req.user.username,
            action: "NOTICE_DELETE",
            details: `Deleted notice: "${notice.title}"`
        });
        return res.status(200).json({ message: "Notice deleted successfully" });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteNotice = deleteNotice;
