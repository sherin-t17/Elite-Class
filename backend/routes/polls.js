const express = require('express');
const Poll = require('../models/Poll');
const { verifyToken } = require('../middleware/auth');
const { teacherOnly, studentOnly } = require('../middleware/roleCheck');
const router = express.Router();

// Get all polls
router.get('/', verifyToken, async (req, res) => {
  try {
    const polls = await Poll.find()
      .populate('createdBy')
      .populate('options.votes');
    res.json({ success: true, data: polls });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create poll
router.post('/', verifyToken, teacherOnly, async (req, res) => {
  try {
    const { question, options } = req.body;
    const poll = new Poll({
      question,
      options: options.map(o => ({ text: o, votes: [] })),
      createdBy: req.user.id
    });
    await poll.save();
    await poll.populate('createdBy');
    res.status(201).json({ success: true, data: poll });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Vote on poll
router.post('/:id/vote', verifyToken, studentOnly, async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found' });
    }
    if (!poll.active) {
      return res.status(400).json({ success: false, message: 'This poll is closed' });
    }
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({ success: false, message: 'Invalid poll option' });
    }

    // Remove previous vote if exists
    poll.options.forEach(opt => {
      opt.votes = opt.votes.filter(v => v.toString() !== req.user.id);
    });

    // Add new vote
    poll.options[optionIndex].votes.push(req.user.id);
    await poll.save();
    await poll.populate('options.votes');

    res.json({ success: true, data: poll });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Close poll
router.put('/:id/close', verifyToken, teacherOnly, async (req, res) => {
  try {
    const poll = await Poll.findByIdAndUpdate(
      req.params.id,
      { active: false, closedAt: new Date() },
      { new: true }
    );
    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found' });
    }
    res.json({ success: true, data: poll });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', verifyToken, teacherOnly, async (req, res) => {
  try {
    const poll = await Poll.findByIdAndDelete(req.params.id);
    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found' });
    }
    res.json({ success: true, message: 'Poll deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
