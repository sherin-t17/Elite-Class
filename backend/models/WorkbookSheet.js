const mongoose = require('mongoose');

const WorkbookSheetSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    title: { type: String, default: 'Workbook' },
    cells: {
      type: [[String]],
      default: () => Array.from({ length: 30 }, () => Array.from({ length: 12 }, () => ''))
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorkbookSheet', WorkbookSheetSchema);
