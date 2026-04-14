const mongoose = require('mongoose');

const SquadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    totalXp: { type: Number, default: 0 },
    rank: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Squad', SquadSchema);