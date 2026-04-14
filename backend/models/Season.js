const mongoose = require('mongoose');

const SeasonSchema = new mongoose.Schema(
  {
    number: Number,
    name: String,
    startDate: Date,
    endDate: Date,
    active: { type: Boolean, default: true },
    milestones: [
      {
        icon: String,
        reward: String,
        done: { type: Boolean, default: false },
        claimable: { type: Boolean, default: false }
      }
    ],
    currentMilestone: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Season', SeasonSchema);