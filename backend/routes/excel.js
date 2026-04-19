const express = require('express');
const { verifyToken } = require('../middleware/auth');
const controller = require('../controllers/excelController');

const router = express.Router();

router.get('/workbooks/:workbookKey', verifyToken, controller.getWorkbook);
router.post('/workbooks/:workbookKey/sheets', verifyToken, controller.createSheet);
router.put('/workbooks/:workbookKey/sheets/:sheetId', verifyToken, controller.updateSheet);
router.delete('/workbooks/:workbookKey/sheets/:sheetId', verifyToken, controller.deleteSheet);
router.put('/workbooks/:workbookKey/permissions', verifyToken, controller.updatePermissions);

module.exports = router;
