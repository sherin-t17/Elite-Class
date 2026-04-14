const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { teacherOnly, studentOnly } = require('../middleware/roleCheck');
const controller = require('../controllers/monthTasksController');

const router = express.Router();

router.post('/start', verifyToken, studentOnly, controller.startTask);
router.post('/submit', verifyToken, studentOnly, controller.uploadMiddleware, controller.submitTask);
router.put('/submission/:id/approve', verifyToken, teacherOnly, controller.approveSubmission);
router.put('/submission/:id/reject', verifyToken, teacherOnly, controller.rejectSubmission);
router.post('/extend-deadline', verifyToken, teacherOnly, controller.extendDeadline);

module.exports = router;
