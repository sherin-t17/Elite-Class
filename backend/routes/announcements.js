const express = require('express');
const Announcement = require('../models/Announcement');
const { verifyToken } = require('../middleware/auth');
const { teacherOnly } = require('../middleware/roleCheck');
const router = express.Router();

// Get all announcements
router.get('/', verifyToken, async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate('postedBy')
      .populate('comments.from')
      .sort({ pinned: -1, createdAt: -1 });
    res.json({ success: true, data: announcements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create announcement
router.post('/', verifyToken, teacherOnly, async (req, res) => {
  try {
    const { title, body, pinned } = req.body;
    const announcement = new Announcement({
      title,
      body,
      pinned: Boolean(pinned),
      postedBy: req.user.id
    });
    await announcement.save();
    await announcement.populate('postedBy');
    res.status(201).json({ success: true, data: announcement });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update announcement
router.put('/:id', verifyToken, teacherOnly, async (req, res) => {
  try {
    const { title, body, pinned } = req.body;
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      { title, body, pinned },
      { new: true }
    ).populate('postedBy');
    res.json({ success: true, data: announcement });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete announcement
router.delete('/:id', verifyToken, teacherOnly, async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add comment
router.post('/:id/comment', verifyToken, async (req, res) => {
  try {
    const { text, parentCommentId } = req.body;
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          comments: { from: req.user.id, text, parentCommentId: parentCommentId || '', createdAt: new Date() }
        }
      },
      { new: true }
    )
      .populate('postedBy')
      .populate('comments.from');
    res.json({ success: true, data: announcement });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
