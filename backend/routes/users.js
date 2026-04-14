const express = require('express');
const multer = require('multer');
const { getStudents, getSingle, updateProfile, updateShowcase, uploadProfileImage } = require('../controllers/usersController');
const { verifyToken } = require('../middleware/auth');
const { teacherOnly } = require('../middleware/roleCheck');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Get all students (teacher only)
router.get('/students', verifyToken, teacherOnly, getStudents);

// Get single student profile
router.get('/:id', verifyToken, getSingle);

// Update user profile
router.put('/:id', verifyToken, updateProfile);
router.post('/:id/profile-image', verifyToken, upload.single('file'), uploadProfileImage);

// Update badge showcase
router.put('/:id/showcase', verifyToken, updateShowcase);

module.exports = router;
