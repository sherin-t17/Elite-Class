const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { teacherOnly } = require('../middleware/roleCheck');
const { getGradebook } = require('../controllers/gradebookController');
const router = express.Router();

router.get('/', verifyToken, teacherOnly, getGradebook);

module.exports = router;
