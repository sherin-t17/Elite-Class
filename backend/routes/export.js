const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { teacherOnly } = require('../middleware/roleCheck');
const { generatePDF, generateExcel } = require('../utils/exportEngine');
const router = express.Router();

// Export PDF
router.get('/pdf', verifyToken, teacherOnly, async (req, res) => {
  try {
    const { type } = req.query;
    await generatePDF(type, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Export Excel
router.get('/excel', verifyToken, teacherOnly, async (req, res) => {
  try {
    const { type } = req.query;
    await generateExcel(type, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;