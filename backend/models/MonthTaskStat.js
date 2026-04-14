const mongoose = require('mongoose');

const MonthTaskStatSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'MonthTaskBatch', required: true, index: true },
    totalCompleted: { type: Number, default: 0 },
    totalFailed: { type: Number, default: 0 },
    totalSelfDeclared: { type: Number, default: 0 },
    elitePoints: { type: Number, default: 0 },
    streakDays: { type: Number, default: 0 },
    consecutiveSkipDays: { type: Number, default: 0 },
    consecutiveSameScoreDays: { type: Number, default: 0 },
    warningCount: { type: Number, default: 0 },
    daysActive: { type: Number, default: 0 },
    lastActiveDate: { type: String, default: '' }
  },
  { timestamps: true }
);

MonthTaskStatSchema.index({ student: 1, batch: 1 }, { unique: true });

module.exports = mongoose.model('MonthTaskStat', MonthTaskStatSchema);
