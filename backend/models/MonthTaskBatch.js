const mongoose = require('mongoose');

const MonthTaskBatchSchema = new mongoose.Schema(
  {
    monthName: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    totalTasks: { type: Number, required: true, default: 0 },
    minimumTarget: { type: Number, required: true, default: 0 },
    eliteTarget: { type: Number, required: true, default: 0 },
    negativeMarkValue: { type: Number, required: true, default: -5 },
    description: { type: String, default: '' },
    rules: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    topPerformerOverride: {
      student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      date: { type: String, default: '' }
    },
    deadlineExtensions: [
      {
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        leaveRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveRequest', default: null },
        justification: { type: String, default: '' },
        dateKey: { type: String, required: true },
        extendedUntil: { type: Date, required: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

MonthTaskBatchSchema.virtual('title').get(function title() {
  return `${this.monthName} ${this.year} Month Tasks`;
});

module.exports = mongoose.model('MonthTaskBatch', MonthTaskBatchSchema);
