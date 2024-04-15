import multer from "multer";

// Set up memory storage
const storage = multer.memoryStorage();

// Initialize upload with memory storage
export const uploadMiddleware = multer({
  storage: storage,
  limits: { fileSize: 10000000 }, // Limit file size to 10MB
}).single("image"); // Accepts only a single file upload from the field named 'image'
