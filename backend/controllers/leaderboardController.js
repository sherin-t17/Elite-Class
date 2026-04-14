const User = require('../models/User');
const Squad = require('../models/Squad');

exports.getLeaderboard = async (req, res) => {
  try {
    const { type = 'alltime' } = req.query;

    if (type === 'alltime') {
      const students = await User.find({ role: 'student' })
        .sort({ xp: -1 })
        .limit(50);
      return res.json({ success: true, data: students });
    }

    if (type === 'weekly') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const students = await User.find({ role: 'student' }).populate('xpLog');
      const weekly = students
        .map(s => ({
          ...s.toObject(),
          weeklyXp: s.xpLog
            .filter(log => new Date(log.date) > sevenDaysAgo)
            .reduce((sum, log) => sum + log.amount, 0)
        }))
        .sort((a, b) => b.weeklyXp - a.weeklyXp)
        .slice(0, 50);
      return res.json({ success: true, data: weekly });
    }

    if (type === 'improved') {
      const students = await User.find({ role: 'student' })
        .sort({ level: -1, xp: -1 })
        .limit(50);
      return res.json({ success: true, data: students });
    }

    if (type === 'squads') {
      const squads = await Squad.find()
        .populate('members')
        .sort({ rank: 1 });
      return res.json({ success: true, data: squads });
    }

    res.json({ success: true, data: [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};