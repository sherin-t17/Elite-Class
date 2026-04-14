const Announcement = require('../models/Announcement');

exports.getAll = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate('postedBy')
      .populate('comments.from')
      .sort({ pinned: -1, createdAt: -1 });
    res.json({ success: true, data: announcements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, body } = req.body;
    const announcement = new Announcement({
      title,
      body,
      postedBy: req.user.id
    });
    await announcement.save();
    await announcement.populate('postedBy');
    res.status(201).json({ success: true, data: announcement });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
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
};

exports.delete = async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          comments: { from: req.user.id, text, createdAt: new Date() }
        }
      },
      { new: true }
    ).populate('comments.from');
    res.json({ success: true, data: announcement });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};