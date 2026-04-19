const mongoose = require('mongoose');

const WorkbookCellSchema = new mongoose.Schema(
  {
    value: { type: String, default: '' },
    formula: { type: String, default: '' }
  },
  { _id: false }
);

const WorkbookSheetSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    key: { type: String, required: true },
    title: { type: String, required: true },
    type: { type: String, enum: ['grid', 'track', 'department'], default: 'grid' },
    rowCount: { type: Number, default: 30 },
    columnCount: { type: Number, default: 12 },
    columnWidths: { type: [Number], default: [] },
    cells: { type: [[WorkbookCellSchema]], default: [] }
  },
  { _id: false }
);

const WorkbookPermissionSchema = new mongoose.Schema(
  {
    allowStudentEditing: { type: Boolean, default: false },
    editableSheetIds: { type: [String], default: [] }
  },
  { _id: false }
);

const WorkbookSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    title: { type: String, default: 'Workbook' },
    sheets: { type: [WorkbookSheetSchema], default: [] },
    permissions: { type: WorkbookPermissionSchema, default: () => ({}) },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Workbook', WorkbookSchema);
