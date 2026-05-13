/**
 * Multer File Upload Middleware
 * Handles image upload with size validation (max 2MB)
 */

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../../public/images/users");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Save with timestamp to avoid conflicts
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// Filter file types
const fileFilter = (req, file, cb) => {
  // Allow images only
  const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, GIF, and WebP images are allowed"), false);
  }
};

// Configure multer (2MB max)
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
});

/**
 * Middleware to handle optional image upload
 * If file exists, attaches it to req.file
 * If upload fails, passes error to error handler
 */
const handleImageUpload = upload.single("image");

/**
 * Wrapper to make image upload optional
 */
const optionalImageUpload = (req, res, next) => {
  handleImageUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File size exceeds 2MB limit",
          error: { errorCode: "FILE_TOO_LARGE" },
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message,
        error: { errorCode: "UPLOAD_ERROR" },
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
        error: { errorCode: "INVALID_FILE_TYPE" },
      });
    }
    next();
  });
};

module.exports = {
  optionalImageUpload,
  handleImageUpload,
};
