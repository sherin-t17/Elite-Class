const mongoose = require('mongoose');

const MonthTaskWarningSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'MonthTaskBatch', required: true, index: true },
    warningType: { type: String, enum: ['3_day_skip', '5_day_same_score'], required: true },
    triggeredAt: { type: Date, default: Date.now },
    explanationText: { type: String, default: '' },
    submittedAt: { type: Date, default: null },
    teacherAction: { type: String, enum: ['pending', 'accepted', 'flagged'], default: 'pending' },
    actionedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('MonthTaskWarning', MonthTaskWarningSchema);
