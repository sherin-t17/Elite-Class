const { generatePDF, generateExcel } = require('../utils/exportEngine');

exports.exportPDF = async (req, res) => {
  try {
    const { type } = req.query;
    await generatePDF(type, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.exportExcel = async (req, res) => {
  try {
    const { type } = req.query;
    await generateExcel(type, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};