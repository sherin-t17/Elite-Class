const mongoose = require('mongoose');

const MonthTaskDailyTopperSchema = new mongoose.Schema(
  {
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'MonthTaskBatch', required: true, index: true },
    date: { type: String, required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tasksCompletedToday: { type: Number, default: 0 },
    pointsAwarded: { type: Number, default: 0 },
    is7DayBonus: { type: Boolean, default: false },
    rank: { type: Number, default: 1 }
  },
  { timestamps: true }
);

MonthTaskDailyTopperSchema.index({ batch: 1, date: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('MonthTaskDailyTopper', MonthTaskDailyTopperSchema);
