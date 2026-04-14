const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { teacherOnly } = require('../middleware/roleCheck');
const controller = require('../controllers/monthTasksController');

const router = express.Router();

router.get('/', verifyToken, controller.listBatches);
router.get('/active/current', verifyToken, controller.getActiveBatch);
router.post('/batch', verifyToken, teacherOnly, controller.createBatch);
router.put('/batch/:id', verifyToken, teacherOnly, controller.updateBatch);
router.get('/batch/:id', verifyToken, controller.getBatch);
router.post('/batch/:id/task', verifyToken, teacherOnly, controller.createTask);
router.put('/batch/:id/task/:taskId', verifyToken, teacherOnly, controller.updateTask);
router.delete('/batch/:id/task/:taskId', verifyToken, teacherOnly, controller.deleteTask);
router.post('/batch/:id/upload-excel', verifyToken, teacherOnly, controller.excelUploadMiddleware, controller.uploadExcel);
router.get('/batch/:id/tasks', verifyToken, controller.getBatchTasks);
router.get('/batch/:batchId/overview', verifyToken, teacherOnly, controller.getOverview);
router.get('/batch/:batchId/pending-submissions', verifyToken, teacherOnly, controller.listPendingSubmissions);
router.put('/batch/:batchId/top-performer-override', verifyToken, teacherOnly, controller.setTopPerformerOverride);

module.exports = router;
