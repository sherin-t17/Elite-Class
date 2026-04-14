const express = require('express');
const Season = require('../models/Season');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const { teacherOnly } = require('../middleware/roleCheck');
const router = express.Router();

// Get active season
router.get('/active', verifyToken, async (req, res) => {
  try {
    const season = await Season.findOne({ active: true });
    res.json({ success: true, data: season });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Claim milestone
router.post('/:id/claim/:milestoneIdx', verifyToken, async (req, res) => {
  try {
    const season = await Season.findById(req.params.id);
    if (!season) {
      return res.status(404).json({ success: false, message: 'Season not found' });
    }

    const milestone = season.milestones[req.params.milestoneIdx];
    if (!milestone || !milestone.claimable) {
      return res.status(400).json({ success: false, message: 'Milestone not claimable' });
    }

    milestone.done = true;
    await season.save();
    res.json({ success: true, data: season });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;