const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { teacherOnly, studentOnly } = require('../middleware/roleCheck');
const controller = require('../controllers/monthTasksController');

const router = express.Router();

router.get('/warnings', verifyToken, teacherOnly, controller.getWarnings);
router.get('/warnings/mine/:batchId?', verifyToken, studentOnly, controller.getMyWarnings);
router.post('/warnings/:id/explain', verifyToken, studentOnly, controller.submitWarningExplanation);
router.put('/warnings/:id/action', verifyToken, teacherOnly, controller.actionWarning);

module.exports = router;
