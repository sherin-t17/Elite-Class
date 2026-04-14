const express = require('express');
const mongoose = require('mongoose');
const Squad = require('../models/Squad');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const { teacherOnly } = require('../middleware/roleCheck');

const router = express.Router();

function normalizeMemberIds(members) {
  if (!Array.isArray(members)) {
    throw new Error('Members must be an array of student ids.');
  }

  const normalized = [...new Set(
    members
      .map(member => String(member || '').trim())
      .filter(Boolean)
  )];

  if (normalized.length < 2) {
    throw new Error('A squad needs at least 2 members.');
  }

  const invalidId = normalized.find(memberId => !mongoose.Types.ObjectId.isValid(memberId));
  if (invalidId) {
    throw new Error(`Invalid student id: ${invalidId}`);
  }

  return normalized;
}

async function recalculateSquadStats(squad) {
  const memberUsers = await User.find({
    _id: { $in: squad.members },
    role: 'student'
  });

  if (memberUsers.length !== squad.members.length) {
    throw new Error('One or more selected squad members are invalid.');
  }

  squad.totalXp = memberUsers.reduce((sum, member) => sum + Number(member.xp || 0), 0);

  await squad.save();
  await rerankSquads();
  await squad.populate('members');
  return squad;
}

async function rerankSquads() {
  const squads = await Squad.find().sort({ totalXp: -1, createdAt: 1 });
  await Promise.all(
    squads.map((entry, index) => {
      entry.rank = index + 1;
      return entry.save();
    })
  );
}

// Get all squads
router.get('/', verifyToken, async (req, res) => {
  try {
    const squads = await Squad.find()
      .populate('members')
      .sort({ rank: 1, createdAt: 1 });

    res.json({ success: true, data: squads });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create squad
router.post('/', verifyToken, teacherOnly, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const members = normalizeMemberIds(req.body?.members);

    if (!name) {
      return res.status(400).json({ success: false, message: 'Squad name is required.' });
    }

    const squad = new Squad({ name, members });
    await recalculateSquadStats(squad);

    res.status(201).json({ success: true, data: squad });
  } catch (err) {
    const status = /invalid|required|needs at least/i.test(err.message) ? 400 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
});

// Update squad
router.put('/:id', verifyToken, teacherOnly, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const members = normalizeMemberIds(req.body?.members);

    if (!name) {
      return res.status(400).json({ success: false, message: 'Squad name is required.' });
    }

    const squad = await Squad.findById(req.params.id);
    if (!squad) {
      return res.status(404).json({ success: false, message: 'Squad not found.' });
    }

    squad.name = name;
    squad.members = members;
    await recalculateSquadStats(squad);

    res.json({ success: true, data: squad });
  } catch (err) {
    const status = /invalid|required|needs at least|not found/i.test(err.message) ? 400 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
});

// Delete squad
router.delete('/:id', verifyToken, teacherOnly, async (req, res) => {
  try {
    await Squad.findByIdAndDelete(req.params.id);
    await rerankSquads();
    res.json({ success: true, message: 'Squad deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
