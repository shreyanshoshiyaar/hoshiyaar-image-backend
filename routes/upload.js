import "dotenv/config";
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

import Image from "../models/Image.js";

// Configure Cloudinary from env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const router = express.Router();

// Multer disk storage to avoid keeping many large files in memory
const uploadDir = path.join(process.cwd(), "tmp", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const MAX_FILES = 200;
const MAX_FILE_SIZE_MB = 50;

const upload = multer({
  storage,
  limits: {
    files: MAX_FILES,
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
  },
});

router.post(
  "/",
  upload.array("images", MAX_FILES),
  async (req, res) => {
    try {
      if (!process.env.CLOUDINARY_CLOUD_NAME) {
        return res.status(500).json({
          error: "Cloudinary credentials are not configured on the server.",
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No images received." });
      }

      if (req.files.length > MAX_FILES) {
        return res.status(400).json({
          error: `Too many files. Maximum allowed is ${MAX_FILES}.`,
        });
      }

      const uploaded = [];

      for (const file of req.files) {
        const filePath = file.path;

        // Wrap cloudinary upload into a promise
        // Upload sequentially to control memory and bandwidth
        // For Render free tier this is safer than parallel 200 uploads
        const result = await cloudinary.uploader.upload(filePath, {
          resource_type: "image",
          folder: process.env.CLOUDINARY_FOLDER || "img-to-link",
        });

        // Clean up local file
        fs.unlink(filePath, () => {});

        const recordData = {
          publicId: result.public_id,
          url: result.secure_url,
          originalName: file.originalname,
          sizeBytes: file.size,
          format: result.format,
        };

        // Save to MongoDB if connected
        let savedDoc = null;
        if (process.env.MONGODB_URI) {
          try {
            savedDoc = await Image.create(recordData);
          } catch (dbErr) {
            console.error("Failed to save image metadata:", dbErr.message);
          }
        }

        uploaded.push({
          ...recordData,
          id: savedDoc ? savedDoc._id : null,
        });
      }

      return res.json({
        count: uploaded.length,
        images: uploaded,
      });
    } catch (err) {
      console.error("Upload error:", err);
      return res.status(500).json({
        error: "Failed to upload images.",
        details: err.message,
      });
    }
  }
);

// Multer error handler (file size, limits, etc.)
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: `File too large. Max size is ${MAX_FILE_SIZE_MB}MB per image.`,
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        error: `Too many files. Maximum allowed is ${MAX_FILES}.`,
      });
    }
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

export default router;

