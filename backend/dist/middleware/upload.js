"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.singleUpload = exports.processUpload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const cloudinary_1 = require("cloudinary");
// Ensure local uploads directory exists
const UPLOADS_DIR = path_1.default.join(__dirname, "../../uploads");
if (!fs_1.default.existsSync(UPLOADS_DIR)) {
    fs_1.default.mkdirSync(UPLOADS_DIR, { recursive: true });
}
// Multer Storage Configuration (Memory storage if Cloudinary, Disk storage if Local fallback)
const storage = multer_1.default.memoryStorage();
// File filter to restrict uploads to allowed types (Images & PDF)
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error("Invalid file type. Allowed: JPEG, PNG, WebP, PDF"));
    }
};
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB Limit
    fileFilter
});
// Configure Cloudinary if keys are provided
const isCloudinaryConfigured = () => {
    return !!(process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET);
};
if (isCloudinaryConfigured()) {
    cloudinary_1.v2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
}
// Service helper to process upload
const processUpload = async (file) => {
    const fileName = `${Date.now()}-${path_1.default.basename(file.originalname).replace(/\s+/g, "_")}`;
    if (isCloudinaryConfigured()) {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary_1.v2.uploader.upload_stream({
                folder: "hms_saas",
                resource_type: file.mimetype === "application/pdf" ? "raw" : "image"
            }, (error, result) => {
                if (error)
                    return reject(error);
                resolve({
                    fileUrl: result?.secure_url || "",
                    fileName: file.originalname,
                    fileSize: file.size
                });
            });
            uploadStream.end(file.buffer);
        });
    }
    else {
        // Local fallback: write buffer to file system
        const filePath = path_1.default.join(UPLOADS_DIR, fileName);
        fs_1.default.writeFileSync(filePath, file.buffer);
        // We assume the server runs on localhost:PORT
        const port = process.env.PORT || 5000;
        const fileUrl = `/uploads/${fileName}`; // Relative URL or full absolute URL
        return {
            fileUrl,
            fileName: file.originalname,
            fileSize: file.size
        };
    }
};
exports.processUpload = processUpload;
exports.singleUpload = upload.single("file");
