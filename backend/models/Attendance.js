const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    records: [
      {
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['present', 'absent', 'od', 'leave'] }
      }
    ],
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Attendance', AttendanceSchema);