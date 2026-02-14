const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Controllers
const { 
  uploadContent, 
  getContent, 
  deleteContent, 
  getUserDashboard, 
  toggleLinkStatus 
} = require('../controllers/uploadController');
const { register, login } = require('../controllers/authController');

// Middleware
const { protect, optionalAuth } = require('../middleware/auth');

// Configure Local Storage for Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// AUTHENTICATION ROUTES 
router.post('/auth/register', register);
router.post('/auth/login', login);

// PUBLIC / GUEST ROUTES 
router.post('/upload', optionalAuth, upload.single('file'), uploadContent);
router.get('/content/:id', getContent);
router.delete('/content/:id', deleteContent);

// PROTECTED DASHBOARD ROUTES 
router.get('/dashboard/links', protect, getUserDashboard);
router.put('/dashboard/links/:id/toggle', protect, toggleLinkStatus);

module.exports = router;