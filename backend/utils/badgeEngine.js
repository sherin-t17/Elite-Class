const Badge = require('../models/Badge');
const MonthTaskSubmission = require('../models/MonthTaskSubmission');
const Submission = require('../models/Submission');
const User = require('../models/User');

const RULE_DEFINITIONS = [
  {
    name: 'Beginner',
    icon: '🌱',
    desc: 'Earn at least 100 XP.',
    rarity: 'common',
    condition: 'xp_gte_100'
  },
  {
    name: 'Intermediate',
    icon: '⚙️',
    desc: 'Earn at least 500 XP.',
    rarity: 'rare',
    condition: 'xp_gte_500'
  },
  {
    name: 'Advanced',
    icon: '🚀',
    desc: 'Earn at least 1000 XP.',
    rarity: 'epic',
    condition: 'xp_gte_1000'
  },
  {
    name: 'Starter',
    icon: '🧩',
    desc: 'Complete at least 5 tasks.',
    rarity: 'common',
    condition: 'tasks_gte_5'
  },
  {
    name: 'Worker',
    icon: '🏗️',
    desc: 'Complete at least 20 tasks.',
    rarity: 'rare',
    condition: 'tasks_gte_20'
  },
  {
    name: 'Master',
    icon: '🏆',
    desc: 'Complete at least 50 tasks.',
    rarity: 'legendary',
    condition: 'tasks_gte_50'
  },
  {
    name: 'Consistent Learner',
    icon: '📚',
    desc: 'Maintain a 3 day streak.',
    rarity: 'common',
    condition: 'streak_gte_3'
  },
  {
    name: 'Dedicated',
    icon: '🔥',
    desc: 'Maintain a 7 day streak.',
    rarity: 'rare',
    condition: 'streak_gte_7'
  },
  {
    name: 'Elite Streak',
    icon: '👑',
    desc: 'Maintain a 30 day streak.',
    rarity: 'legendary',
    condition: 'streak_gte_30'
  },
  {
    name: 'First Star',
    icon: '⭐',
    desc: 'Start your first streak day.',
    rarity: 'common',
    condition: 'streak_1'
  },
  {
    name: 'On Fire',
    icon: '🔥',
    desc: 'Achieve a 7 day streak.',
    rarity: 'rare',
    condition: 'streak_7'
  },
  {
    name: 'Class Champion',
    icon: '👑',
    desc: 'Reach rank #1 in the class.',
    rarity: 'epic',
    condition: 'rank_1'
  },
  {
    name: 'Elite',
    icon: '💎',
    desc: 'Reach Elite level.',
    rarity: 'epic',
    condition: 'level_elite'
  }
];

function parseThresholdCondition(condition, prefix) {
  const match = String(condition || '').match(new RegExp(`^${prefix}(\\d+)$`));
  return match ? Number(match[1]) : null;
}

async function ensureRuleBadges() {
  await Promise.all(RULE_DEFINITIONS.map((rule) => (
    Badge.findOneAndUpdate(
      { name: rule.name },
      {
        $setOnInsert: {
          icon: rule.icon,
          desc: rule.desc,
          rarity: rule.rarity,
          condition: rule.condition
        }
      },
      { upsert: true, new: true }
    )
  )));
}

async function getUserBadgeStats(user) {
  const [gradedTaskCount, approvedMonthTaskCount] = await Promise.all([
    Submission.countDocuments({ student: user._id, status: 'graded' }),
    MonthTaskSubmission.countDocuments({ student: user._id, status: 'approved' })
  ]);

  return {
    xp: Number(user.xp || 0),
    streak: Number(user.streak || 0),
    completedTasks: Math.max(
      Number(user.tasksCompleted || 0),
      Number(gradedTaskCount || 0) + Number(approvedMonthTaskCount || 0)
    ),
    rank: Number(user.rank || 0),
    level: String(user.level || '')
  };
}

function evaluateBadgeCondition(condition, stats) {
  const value = String(condition || '').trim();
  const xpThreshold = parseThresholdCondition(value, 'xp_gte_');
  if (xpThreshold !== null) return stats.xp >= xpThreshold;

  const taskThreshold = parseThresholdCondition(value, 'tasks_gte_');
  if (taskThreshold !== null) return stats.completedTasks >= taskThreshold;

  const streakThreshold = parseThresholdCondition(value, 'streak_gte_');
  if (streakThreshold !== null) return stats.streak >= streakThreshold;

  if (value === 'streak_1') return stats.streak >= 1;
  if (value === 'streak_7') return stats.streak >= 7;
  if (value === 'rank_1') return stats.rank === 1;
  if (value === 'level_elite') return ['Elite', 'Legend'].includes(stats.level);
  return false;
}

async function badgeRuleEngine(userId) {
  if (!userId) return { unlockedNow: [], stats: null };

  await ensureRuleBadges();

  const user = await User.findById(userId).populate('unlockedBadges');
  if (!user) return { unlockedNow: [], stats: null };

  const stats = await getUserBadgeStats(user);
  const badges = await Badge.find();
  const unlockedSet = new Set((user.unlockedBadges || []).map((badge) => String(badge._id || badge)));
  const showcaseSet = new Set((user.badgeShowcase || []).map((badge) => String(badge)));
  const unlockedNow = [];

  for (const badge of badges) {
    const badgeId = String(badge._id);
    if (unlockedSet.has(badgeId)) continue;
    if (!evaluateBadgeCondition(badge.condition, stats)) continue;

    user.unlockedBadges.push(badge._id);
    unlockedSet.add(badgeId);
    unlockedNow.push({
      id: badge._id,
      name: badge.name,
      icon: badge.icon,
      rarity: badge.rarity
    });

    if (!showcaseSet.has(badgeId)) {
      user.badgeShowcase = [badge._id, ...(user.badgeShowcase || []).filter((entry) => String(entry) !== badgeId)].slice(0, 3);
      showcaseSet.clear();
      (user.badgeShowcase || []).forEach((entry) => showcaseSet.add(String(entry)));
    }
  }

  if (unlockedNow.length) {
    await user.save();
  }

  return {
    unlockedNow,
    stats,
    unlockedBadgeIds: [...unlockedSet]
  };
}

async function checkBadges(userId) {
  return await badgeRuleEngine(userId);
}

async function seedBadges() {
  await ensureRuleBadges();
}

module.exports = {
  badgeRuleEngine,
  checkBadges,
  seedBadges
};
