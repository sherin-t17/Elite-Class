const mongoose = require('mongoose');

const MonthTaskSchema = new mongoose.Schema(
  {
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'MonthTaskBatch', required: true, index: true },
    taskNumber: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
    marks: { type: Number, default: 0 },
    category: { type: String, default: 'General' },
    needsSubmission: { type: Boolean, default: true },
    answerMode: {
      type: String,
      enum: ['done', 'file', 'link_text', 'mixed'],
      default: 'file'
    },
    allowLinkSubmission: { type: Boolean, default: false },
    allowTextSubmission: { type: Boolean, default: false },
    allowFileUpload: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

MonthTaskSchema.index({ batch: 1, taskNumber: 1 }, { unique: true });

module.exports = mongoose.model('MonthTask', MonthTaskSchema);
