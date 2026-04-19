const User = require('../models/User');
const { uploadBuffer, uploadFile } = require('../utils/fileStorage');
const { awardXp } = require('../utils/xpEngine');

exports.getStudents = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      User.find({ role: 'student' })
        .select('-password')
        .sort({ rank: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments({ role: 'student' })
    ]);

    res.json({
      success: true,
      data: students,
      pagination: { page, limit, total }
    });
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

    const { name, year, dept, section, regNo, profileImageUrl } = req.body;
    const nextProfileImageUrl = typeof profileImageUrl === 'string'
      ? profileImageUrl
      : undefined;
    const updates = {
      ...(typeof name === 'string' && name.trim() ? { name: name.trim() } : {}),
      year,
      dept,
      section,
      regNo,
      ...(nextProfileImageUrl !== undefined ? { profileImageUrl: nextProfileImageUrl } : {})
    };
    if (updates.name) {
      updates.initials = updates.name
        .split(' ')
        .filter(Boolean)
        .map(part => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    ).select('-password');

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

    const uploaded = await uploadFile(req, req.file, 'profiles');
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { profileImageUrl: uploaded.secure_url },
      { new: true }
    ).select('-password');
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateStudentAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updates = {};
    if (typeof req.body.notes === 'string') {
      updates.notes = req.body.notes.trim();
    }

    if (Object.keys(updates).length > 0) {
      Object.assign(user, updates);
      await user.save();
    }

    const xpDelta = Number(req.body.xpDelta || 0);
    const xpReason = String(req.body.xpReason || '').trim();

    let updatedUser = user;
    if (xpDelta !== 0) {
      if (!xpReason) {
        return res.status(400).json({ success: false, message: 'XP reason is required.' });
      }
      if (user.role !== 'student') {
        return res.status(400).json({ success: false, message: 'XP adjustments are only supported for students.' });
      }
      if (xpDelta < 0 && Math.abs(xpDelta) > Number(user.xp || 0)) {
        return res.status(400).json({ success: false, message: 'XP deduction exceeds current student XP.' });
      }

      updatedUser = await awardXp(user._id, xpDelta, xpReason);
    }

    const freshUser = await User.findById(updatedUser._id)
      .select('-password')
      .populate('badgeShowcase unlockedBadges');

    res.json({ success: true, data: freshUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
