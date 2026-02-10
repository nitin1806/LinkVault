const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path'); // <--- This import was missing!
const { uploadContent, getContent } = require('../controllers/uploadController');

// 1. CONFIGURE LOCAL STORAGE
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure the 'uploads' folder exists in your backend root
    cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
    // Rename file to prevent duplicates: uniqueSuffix-filename.ext
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// POST /api/upload
router.post('/upload', upload.single('file'), uploadContent);

// GET /api/content/:id
router.get('/content/:id', getContent);

module.exports = router;