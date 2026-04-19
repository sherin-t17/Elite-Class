const User = require('../models/User');
const { badgeRuleEngine } = require('./badgeEngine');

const LEVEL_THRESHOLDS = {
  'Initiate': 0,
  'Rookie': 500,
  'Scholar': 1000,
  'Elite': 1500,
  'Legend': 2000
};

exports.awardXp = async (userId, amount, reason) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  user.xp += amount;
  user.xpLog.push({ amount, reason, date: new Date() });

  // Recalculate level
  user.level = exports.calculateLevel(user.xp);

  await user.save();

  // Update ranks
  await exports.updateAllRanks();

  await badgeRuleEngine(userId);

  return user;
};

exports.calculateLevel = (xp) => {
  if (xp >= LEVEL_THRESHOLDS.Legend) return 'Legend';
  if (xp >= LEVEL_THRESHOLDS.Elite) return 'Elite';
  if (xp >= LEVEL_THRESHOLDS.Scholar) return 'Scholar';
  if (xp >= LEVEL_THRESHOLDS.Rookie) return 'Rookie';
  return 'Initiate';
};

exports.updateAllRanks = async () => {
  const students = await User.find({ role: 'student' }).sort({ xp: -1 });
  for (let i = 0; i < students.length; i++) {
    students[i].rank = i + 1;
    await students[i].save();
  }
};

exports.updateStreaks = async () => {
  const users = await User.find({ role: 'student' });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const user of users) {
    const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
    let shouldAwardStreakBonus = false;

    if (lastActive) {
      lastActive.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));

      if (daysDiff === 1) {
        user.streak += 1;
        shouldAwardStreakBonus = true;
      } else if (daysDiff > 1) {
        user.streak = 0;
      }
    }
    user.lastActiveDate = new Date();
    await user.save();

    if (shouldAwardStreakBonus) await exports.awardXp(user._id, 5, 'Streak bonus');
    else await badgeRuleEngine(user._id);
  }
};
