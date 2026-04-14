const Squad = require('../models/Squad');
const User = require('../models/User');

exports.getAll = async (req, res) => {
  try {
    const squads = await Squad.find()
      .populate('members')
      .sort({ rank: 1 });
    res.json({ success: true, data: squads });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, members } = req.body;
    const squad = new Squad({ name, members });
    await squad.save();
    await squad.populate('members');
    res.status(201).json({ success: true, data: squad });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, members } = req.body;
    const squad = await Squad.findByIdAndUpdate(
      req.params.id,
      { name, members },
      { new: true }
    ).populate('members');

    const memberUsers = await User.find({ _id: { $in: members } });
    squad.totalXp = memberUsers.reduce((sum, m) => sum + m.xp, 0);

    const allSquads = await Squad.find().sort({ totalXp: -1 });
    squad.rank = allSquads.findIndex(s => s._id.toString() === squad._id.toString()) + 1;

    await squad.save();
    res.json({ success: true, data: squad });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await Squad.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Squad deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};