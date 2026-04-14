const mongoose = require('mongoose');

const BadgeSchema = new mongoose.Schema(
  {
    icon: String,
    name: { type: String, required: true, unique: true },
    desc: String,
    rarity: { type: String, enum: ['common', 'rare', 'epic', 'legendary'] },
    condition: String
  },
  { timestamps: true }
);

module.exports = mongoose.model('Badge', BadgeSchema);