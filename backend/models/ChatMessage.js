const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema(
  {
    context: String,
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: String,
    quoted: {
      messageId: mongoose.Schema.Types.ObjectId,
      text: String,
      from: String
    },
    reactions: { type: Map, of: [String], default: {} }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
