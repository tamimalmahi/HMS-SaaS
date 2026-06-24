"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadBrandingImages = exports.updateSettings = exports.updateBranding = exports.getBrandingAndSettings = void 0;
const House_1 = __importDefault(require("../models/House"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const upload_1 = require("../middleware/upload");
const zod_1 = require("zod");
const updateBrandingSchema = zod_1.z.object({
    primaryColor: zod_1.z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color"),
    secondaryColor: zod_1.z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color")
});
const updateSettingsSchema = zod_1.z.object({
    dueDate: zod_1.z.string().min(1).max(2).regex(/^\d+$/, "Must be a valid day number"),
    mealRateCalculationMode: zod_1.z.enum(["fixed", "dynamic"])
});
const getBrandingAndSettings = async (req, res, next) => {
    try {
        const slug = req.params.houseSlug;
        const house = await House_1.default.findOne({ slug: slug.toLowerCase() });
        if (!house) {
            return res.status(404).json({ message: "House not found" });
        }
        if (house.status === "suspended") {
            return res.status(403).json({ message: "House is suspended" });
        }
        return res.status(200).json({
            name: house.name,
            slug: house.slug,
            logo: house.logo,
            coverImage: house.coverImage,
            branding: house.branding,
            settings: house.settings,
            plan: house.plan
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getBrandingAndSettings = getBrandingAndSettings;
const updateBranding = async (req, res, next) => {
    try {
        const house = req.house;
        const { primaryColor, secondaryColor } = updateBrandingSchema.parse(req.body);
        house.branding = { primaryColor, secondaryColor };
        await house.save();
        await AuditLog_1.default.create({
            houseId: house._id,
            userId: req.user._id,
            username: req.user.username,
            action: "HOUSE_BRANDING_UPDATE",
            details: `Updated branding colors to Primary: ${primaryColor}, Secondary: ${secondaryColor}`
        });
        return res.status(200).json({
            message: "Branding updated successfully",
            branding: house.branding
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateBranding = updateBranding;
const updateSettings = async (req, res, next) => {
    try {
        const house = req.house;
        const { dueDate, mealRateCalculationMode } = updateSettingsSchema.parse(req.body);
        house.settings = { dueDate, mealRateCalculationMode };
        await house.save();
        await AuditLog_1.default.create({
            houseId: house._id,
            userId: req.user._id,
            username: req.user.username,
            action: "HOUSE_SETTINGS_UPDATE",
            details: `Updated settings: Due Date: ${dueDate}, Meal Rate: ${mealRateCalculationMode}`
        });
        return res.status(200).json({
            message: "Settings updated successfully",
            settings: house.settings
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateSettings = updateSettings;
const uploadBrandingImages = async (req, res, next) => {
    try {
        const house = req.house;
        const type = req.params.imageType; // "logo" or "cover"
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        if (type !== "logo" && type !== "cover") {
            return res.status(400).json({ message: "Invalid image type requested" });
        }
        // Check Plan limitations (Free: 10MB, Basic: 50MB, Pro: 200MB)
        const planLimits = { free: 10 * 1024 * 1024, basic: 50 * 1024 * 1024, pro: 200 * 1024 * 1024 };
        const maxLimit = planLimits[house.plan] || planLimits.free;
        if (house.storageUsed + req.file.size > maxLimit) {
            return res.status(400).json({ message: "Storage limit reached. Please upgrade your subscription plan." });
        }
        const uploadResult = await (0, upload_1.processUpload)(req.file);
        // Update house record
        if (type === "logo") {
            house.logo = uploadResult.fileUrl;
        }
        else {
            house.coverImage = uploadResult.fileUrl;
        }
        house.storageUsed += uploadResult.fileSize;
        await house.save();
        await AuditLog_1.default.create({
            houseId: house._id,
            userId: req.user._id,
            username: req.user.username,
            action: "HOUSE_MEDIA_UPLOAD",
            details: `Uploaded house ${type} image: ${uploadResult.fileName} (${(uploadResult.fileSize / 1024).toFixed(1)} KB)`
        });
        return res.status(200).json({
            message: `House ${type} uploaded successfully`,
            fileUrl: uploadResult.fileUrl,
            storageUsed: house.storageUsed
        });
    }
    catch (error) {
        next(error);
    }
};
exports.uploadBrandingImages = uploadBrandingImages;
