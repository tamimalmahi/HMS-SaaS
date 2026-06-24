import multer from "multer";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { Request, Response, NextFunction } from "express";

// Ensure local uploads directory exists
const UPLOADS_DIR = path.join(__dirname, "../../uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer Storage Configuration (Memory storage if Cloudinary, Disk storage if Local fallback)
const storage = multer.memoryStorage();

// File filter to restrict uploads to allowed types (Images & PDF)
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Allowed: JPEG, PNG, WebP, PDF"));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB Limit
  fileFilter
});

// Configure Cloudinary if keys are provided
const isCloudinaryConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// Service helper to process upload
export const processUpload = async (file: Express.Multer.File): Promise<{ fileUrl: string; fileName: string; fileSize: number }> => {
  const fileName = `${Date.now()}-${path.basename(file.originalname).replace(/\s+/g, "_")}`;
  
  if (isCloudinaryConfigured()) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "hms_saas",
          resource_type: file.mimetype === "application/pdf" ? "raw" : "image"
        },
        (error, result) => {
          if (error) return reject(error);
          resolve({
            fileUrl: result?.secure_url || "",
            fileName: file.originalname,
            fileSize: file.size
          });
        }
      );
      uploadStream.end(file.buffer);
    });
  } else {
    // Local fallback: write buffer to file system
    const filePath = path.join(UPLOADS_DIR, fileName);
    fs.writeFileSync(filePath, file.buffer);
    
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

export const singleUpload = upload.single("file");
