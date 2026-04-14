const mongoose = require('mongoose');

const PollSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: [
      {
        text: String,
        votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
      }
    ],
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    closedAt: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model('Poll', PollSchema);