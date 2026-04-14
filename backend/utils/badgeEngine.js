const User = require('../models/User');
const Badge = require('../models/Badge');
const Submission = require('../models/Submission');

exports.checkBadges = async (userId) => {
  const user = await User.findById(userId).populate('unlockedBadges');
  const badges = await Badge.find();

  for (const badge of badges) {
    if (user.unlockedBadges.some(b => b._id.toString() === badge._id.toString())) {
      continue; // Already unlocked
    }

    let shouldUnlock = false;

    if (badge.condition === 'streak_7' && user.streak >= 7) {
      shouldUnlock = true;
    } else if (badge.condition === 'streak_1' && user.streak >= 1) {
      shouldUnlock = true;
    } else if (badge.condition === 'rank_1' && user.rank === 1) {
      shouldUnlock = true;
    } else if (badge.condition === 'level_elite' && user.level === 'Elite') {
      shouldUnlock = true;
    }
    // Add more badge condition checks as needed

    if (shouldUnlock) {
      user.unlockedBadges.push(badge._id);
      await user.save();
    }
  }
};

exports.seedBadges = async () => {
  const badges = [
    {
      icon: '🔥',
      name: 'On Fire',
      desc: 'Achieved 7-day streak',
      rarity: 'rare',
      condition: 'streak_7'
    },
    {
      icon: '⭐',
      name: 'First Star',
      desc: 'Submitted your first task',
      rarity: 'common',
      condition: 'streak_1'
    },
    {
      icon: '👑',
      name: 'Class Champion',
      desc: 'Ranked #1 in the class',
      rarity: 'epic',
      condition: 'rank_1'
    },
    {
      icon: '🚀',
      name: 'Rocket Start',
      desc: 'First to submit a task',
      rarity: 'rare',
      condition: 'first_submit'
    },
    {
      icon: '⚡',
      name: 'Speed Demon',
      desc: 'Submitted 5 tasks 24h early',
      rarity: 'epic',
      condition: 'tasks_speed_5'
    },
    {
      icon: '📚',
      name: 'Scholar',
      desc: 'Got 10 A-grade tasks',
      rarity: 'epic',
      condition: 'tasks_10_A'
    },
    {
      icon: '🎯',
      name: 'Perfect Aim',
      desc: 'Got 3 assessments full marks',
      rarity: 'legendary',
      condition: 'assess_3_100'
    },
    {
      icon: '💎',
      name: 'Elite',
      desc: 'Reached Elite level',
      rarity: 'epic',
      condition: 'level_elite'
    },
    {
      icon: '💻',
      name: 'Code Wizard',
      desc: 'Got 5 coding tasks with A grade',
      rarity: 'epic',
      condition: 'code_A_5'
    },
    {
      icon: '💰',
      name: 'Diamond Coder',
      desc: 'Completed legendary bonus task',
      rarity: 'legendary',
      condition: 'bonus_done'
    },
    {
      icon: '🤝',
      name: 'Helper',
      desc: 'Sent 10 chat messages',
      rarity: 'common',
      condition: 'helper_10'
    },
    {
      icon: '📅',
      name: 'Attendance King',
      desc: 'Achieved 100% monthly attendance',
      rarity: 'rare',
      condition: 'attendance_100'
    }
  ];

  for (const badgeData of badges) {
    const exists = await Badge.findOne({ name: badgeData.name });
    if (!exists) {
      await Badge.create(badgeData);
    }
  }
};