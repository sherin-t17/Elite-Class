const User = require('../models/User');
const { uploadBuffer } = require('../utils/fileStorage');

exports.getStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .select('-password')
      .sort({ rank: 1 });
    res.json({ success: true, data: students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSingle = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('badgeShowcase unlockedBadges');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Cannot edit other profiles' });
    }

    const { year, dept, section, regNo, motivationQuote, heroRole, profileImageUrl } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { year, dept, section, regNo, motivationQuote, heroRole, profileImageUrl },
      { new: true }
    );

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateShowcase = async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Cannot edit other profiles' });
    }

    const { badgeShowcase } = req.body;
    if (badgeShowcase.length > 3) {
      return res.status(400).json({ success: false, message: 'Maximum 3 badges' });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { badgeShowcase }, { new: true });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.uploadProfileImage = async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Cannot edit other profiles' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Choose an image to upload.' });
    }

    const uploaded = await uploadBuffer(req, req.file, 'profiles');
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { profileImageUrl: uploaded.secure_url },
      { new: true }
    );
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
