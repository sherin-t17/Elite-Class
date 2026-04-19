const express = require('express');
const { register, login, logout, getMe, googleLogin, getGoogleConfig } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/logout', verifyToken, logout);
router.get('/me', verifyToken, getMe);
router.get('/google-config', getGoogleConfig);

module.exports = router;
