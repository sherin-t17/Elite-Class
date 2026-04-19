const express = require('express');
const multer = require('multer');
const os = require('os');
const { getStudents, getSingle, updateProfile, updateShowcase, uploadProfileImage, updateStudentAdmin } = require('../controllers/usersController');
const { verifyToken } = require('../middleware/auth');
const { teacherOnly } = require('../middleware/roleCheck');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

// Get all students (teacher only)
router.get('/students', verifyToken, teacherOnly, getStudents);

// Get single student profile
router.get('/:id', verifyToken, getSingle);

// Update user profile
router.put('/:id', verifyToken, updateProfile);
router.put('/:id/admin', verifyToken, teacherOnly, updateStudentAdmin);
router.post('/:id/profile-image', verifyToken, upload.single('file'), uploadProfileImage);

// Update badge showcase
router.put('/:id/showcase', verifyToken, updateShowcase);

module.exports = router;
