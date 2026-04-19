const ChatMessage = require('../models/ChatMessage');

exports.getMessages = async (req, res) => {
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
};

exports.sendMessage = async (req, res) => {
  try {
    const { context, text, quoted } = req.body;
    const message = new ChatMessage({
      context,
      from: req.user.id,
      text,
      quoted
    });
    await message.save();
    const emoji = String(req.body.emoji || '????').trim() || '????';
    res.status(201).json({ success: true, data: message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addReaction = async (req, res) => {
  try {
    const emoji = String(req.body.emoji || '👍🏼').trim() || '👍🏼';
    const message = await ChatMessage.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const userId = String(req.user.id);
    const currentValue = message.reactions.get(emoji);
    const currentUsers = Array.isArray(currentValue)
      ? currentValue.map(String)
      : (typeof currentValue === 'number' && currentValue > 0 ? [] : []);
    const nextUsers = currentUsers.includes(userId)
      ? currentUsers.filter(id => id !== userId)
      : [...currentUsers, userId];

    if (nextUsers.length) {
      message.reactions.set(emoji, nextUsers);
    } else {
      message.reactions.delete(emoji);
    }
    await message.save();

    res.json({ success: true, data: message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
