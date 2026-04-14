const express = require('express');
const { verifyToken } = require('../middleware/auth');
const controller = require('../controllers/monthTasksController');

const router = express.Router();

router.get('/stats/:studentId/:batchId', verifyToken, controller.getStats);
router.get('/leaderboard/:batchId', verifyToken, controller.getLeaderboard);
router.get('/daily-summary/:batchId/:date', verifyToken, controller.getDailySummary);

module.exports = router;
