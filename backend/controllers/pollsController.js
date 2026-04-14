const Poll = require('../models/Poll');

exports.getAll = async (req, res) => {
  try {
    const polls = await Poll.find()
      .populate('createdBy')
      .populate('options.votes');
    res.json({ success: true, data: polls });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
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
};

exports.vote = async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const poll = await Poll.findById(req.params.id);

    poll.options.forEach(opt => {
      opt.votes = opt.votes.filter(v => v.toString() !== req.user.id);
    });

    poll.options[optionIndex].votes.push(req.user.id);
    await poll.save();
    await poll.populate('options.votes');

    res.json({ success: true, data: poll });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.closePoll = async (req, res) => {
  try {
    const poll = await Poll.findByIdAndUpdate(
      req.params.id,
      { active: false, closedAt: new Date() },
      { new: true }
    );
    res.json({ success: true, data: poll });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};