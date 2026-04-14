const express = require('express');
const ChatMessage = require('../models/ChatMessage');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// Get messages by context
router.get('/', verifyToken, async (req, res) => {
  try {
    const { context, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const messages = await ChatMessage.find({ context })
      .populate('from')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ success: true, data: messages.reverse() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Send message
router.post('/', verifyToken, async (req, res) => {
  try {
    const { context, text, quoted } = req.body;
    const message = new ChatMessage({
      context,
      from: req.user.id,
      text,
      quoted
    });
    await message.save();
    await message.populate('from');
    res.status(201).json({ success: true, data: message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add reaction
router.post('/:id/react', verifyToken, async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await ChatMessage.findById(req.params.id);

    if (!message.reactions.has(emoji)) {
      message.reactions.set(emoji, 0);
    }
    message.reactions.set(emoji, message.reactions.get(emoji) + 1);
    await message.save();

    res.json({ success: true, data: message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;