const Badge = require('../models/Badge');
const LeaveRequest = require('../models/LeaveRequest');
const MonthTaskBatch = require('../models/MonthTaskBatch');
const MonthTaskDailyTopper = require('../models/MonthTaskDailyTopper');
const MonthTaskStat = require('../models/MonthTaskStat');
const MonthTaskSubmission = require('../models/MonthTaskSubmission');
const MonthTaskWarning = require('../models/MonthTaskWarning');
const User = require('../models/User');
const { awardXp } = require('./xpEngine');

function cloneDate(value = new Date()) {
  return new Date(value.getTime());
}

function pad(num) {
  return String(num).padStart(2, '0');
}

function formatDateKey(value = new Date()) {
  const date = cloneDate(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = String(dateKey).split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function adjustToSubmissionDate(value = new Date()) {
  const date = cloneDate(value);
  if (date.getHours() === 0 && date.getMinutes() < 5) {
    date.setDate(date.getDate() - 1);
  }
  return date;
}

function startOfDay(value = new Date()) {
  const date = cloneDate(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value = new Date()) {
  const date = cloneDate(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function getMonthIndex(monthName) {
  return new Date(`${monthName} 1, 2025`).getMonth();
}

function getBatchWindow(batch) {
  const monthIndex = getMonthIndex(batch.monthName);
  const start = new Date(batch.year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(batch.year, monthIndex + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

async function getActiveBatch(now = new Date()) {
  const monthName = now.toLocaleString('en-IN', { month: 'long' });
  const year = now.getFullYear();
  return await MonthTaskBatch.findOne({ monthName, year }).sort({ createdAt: -1 });
}

async function ensureStat(studentId, batchId) {
  let stat = await MonthTaskStat.findOne({ student: studentId, batch: batchId });
  if (!stat) {
    stat = await MonthTaskStat.create({ student: studentId, batch: batchId });
  }
  return stat;
}

async function ensureBadge(name, desc, icon, rarity) {
  let badge = await Badge.findOne({ name });
  if (!badge) {
    badge = await Badge.create({
      name,
      desc,
      icon,
      rarity,
      condition: `month_task_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`
    });
  }
  return badge;
}

async function unlockBadgeIfMissing(userId, badgeName, desc, icon, rarity = 'epic') {
  const [user, badge] = await Promise.all([
    User.findById(userId),
    ensureBadge(badgeName, desc, icon, rarity)
  ]);
  if (!user) return null;
  if (user.unlockedBadges.some(entry => entry.toString() === badge._id.toString())) {
    return badge;
  }
  user.unlockedBadges.push(badge._id);
  await user.save();
  return badge;
}

function buildActivityMap(submissions) {
  const map = new Map();
  submissions.forEach(submission => {
    if (!map.has(submission.date)) {
      map.set(submission.date, { count: 0, score: 0 });
    }
    const entry = map.get(submission.date);
    if (['submitted', 'approved', 'self_declared'].includes(submission.status)) {
      entry.count += 1;
    }
    entry.score += Number(submission.score || 0);
  });
  return map;
}

function getStreakFromDates(dateKeys) {
  if (!dateKeys.length) return 0;
  const sorted = [...new Set(dateKeys)].sort();
  let streak = 0;
  let cursor = parseDateKey(sorted[sorted.length - 1]);
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const current = parseDateKey(sorted[i]);
    if (formatDateKey(current) !== formatDateKey(cursor)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getConsecutiveSkipDays(activityMap, batchWindow) {
  let skips = 0;
  const today = startOfDay(new Date());
  const cursor = new Date(Math.min(today.getTime(), startOfDay(batchWindow.end).getTime()));
  while (cursor >= startOfDay(batchWindow.start)) {
    const entry = activityMap.get(formatDateKey(cursor));
    if (entry && entry.count > 0) break;
    skips += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return skips;
}

function getConsecutiveSameScoreDays(activityMap, batchWindow) {
  const today = startOfDay(new Date());
  const cursor = new Date(Math.min(today.getTime(), startOfDay(batchWindow.end).getTime()));
  let streak = 0;
  let lastScore = null;
  while (cursor >= startOfDay(batchWindow.start)) {
    const entry = activityMap.get(formatDateKey(cursor));
    if (!entry || entry.count === 0) break;
    if (lastScore === null) {
      lastScore = entry.score;
      streak = 1;
    } else if (entry.score === lastScore) {
      streak += 1;
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

async function rebuildStudentStat(studentId, batchId) {
  const [batch, submissions] = await Promise.all([
    MonthTaskBatch.findById(batchId),
    MonthTaskSubmission.find({ student: studentId, batch: batchId }).sort({ submittedAt: 1, createdAt: 1 })
  ]);
  if (!batch) throw new Error('Batch not found');

  const stat = await ensureStat(studentId, batchId);
  const activityMap = buildActivityMap(submissions);
  const activeDates = [...activityMap.entries()]
    .filter(([, value]) => value.count > 0)
    .map(([key]) => key)
    .sort();

  stat.totalCompleted = submissions.filter(entry => entry.status === 'approved').length;
  stat.totalFailed = submissions.filter(entry => entry.status === 'failed').length;
  stat.totalSelfDeclared = submissions.filter(entry => entry.status === 'self_declared').length;
  stat.elitePoints = submissions.reduce((sum, entry) => sum + Number(entry.score || 0), 0);
  stat.streakDays = getStreakFromDates(activeDates);
  stat.consecutiveSkipDays = getConsecutiveSkipDays(activityMap, getBatchWindow(batch));
  stat.consecutiveSameScoreDays = getConsecutiveSameScoreDays(activityMap, getBatchWindow(batch));
  stat.lastActiveDate = activeDates[activeDates.length - 1] || '';
  stat.daysActive = activeDates.length;
  stat.warningCount = await MonthTaskWarning.countDocuments({
    student: studentId,
    batch: batchId,
    teacherAction: 'flagged'
  });
  await stat.save();

  if (stat.totalCompleted >= batch.minimumTarget) {
    await unlockBadgeIfMissing(
      studentId,
      `${batch.monthName} Warrior 🌟`,
      `Reached the minimum month target in ${batch.monthName} ${batch.year}.`,
      '🌟'
    );
  }

  if (stat.totalCompleted >= batch.totalTasks) {
    await unlockBadgeIfMissing(
      studentId,
      `${batch.monthName} Legend 👑`,
      `Completed every task in ${batch.monthName} ${batch.year}.`,
      '👑',
      'legendary'
    );
  }

  return stat;
}

async function getLeaderboard(batchId) {
  const stats = await MonthTaskStat.find({ batch: batchId }).populate('student', 'name initials color');
  return stats
    .filter(entry => entry.student)
    .sort((a, b) => {
      if (b.elitePoints !== a.elitePoints) return b.elitePoints - a.elitePoints;
      if (b.totalCompleted !== a.totalCompleted) return b.totalCompleted - a.totalCompleted;
      return a.student.name.localeCompare(b.student.name);
    })
    .map((entry, index) => ({
      rank: index + 1,
      studentId: entry.student._id,
      name: entry.student.name,
      initials: entry.student.initials,
      color: entry.student.color,
      elitePoints: entry.elitePoints,
      totalCompleted: entry.totalCompleted,
      streakDays: entry.streakDays,
      warningCount: entry.warningCount
    }));
}

async function getDailySummary(batchId, dateKey) {
  const [students, submissions, batch, topThreeRows] = await Promise.all([
    User.find({ role: 'student' }).select('name initials color'),
    MonthTaskSubmission.find({
      batch: batchId,
      date: dateKey,
      status: { $in: ['submitted', 'approved', 'self_declared'] }
    }).populate('student', 'name initials color'),
    MonthTaskBatch.findById(batchId).populate('topPerformerOverride.student', 'name initials color'),
    MonthTaskDailyTopper.find({ batch: batchId, date: dateKey }).populate('student', 'name initials color').sort({ rank: 1 })
  ]);

  const counts = new Map();
  submissions.forEach(entry => {
    const key = entry.student?._id?.toString();
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const inactiveStudents = students.filter(student => !counts.has(student._id.toString()));
  const topFallback = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([studentId, total]) => {
      const student = students.find(row => row._id.toString() === studentId);
      return student ? { student, total } : null;
    })
    .filter(Boolean)[0] || null;

  let topPerformer = topFallback ? {
    studentId: topFallback.student._id,
    name: topFallback.student.name,
    initials: topFallback.student.initials,
    tasksCompleted: topFallback.total
  } : null;

  if (batch?.topPerformerOverride?.date === dateKey && batch.topPerformerOverride.student) {
    topPerformer = {
      studentId: batch.topPerformerOverride.student._id,
      name: batch.topPerformerOverride.student.name,
      initials: batch.topPerformerOverride.student.initials,
      tasksCompleted: counts.get(batch.topPerformerOverride.student._id.toString()) || 0,
      overridden: true
    };
  }

  return {
    date: dateKey,
    totalStudents: students.length,
    completedAtLeastOne: students.length - inactiveStudents.length,
    noTaskStudents: inactiveStudents.map(student => ({
      studentId: student._id,
      name: student.name,
      initials: student.initials
    })),
    topPerformer,
    topThree: topThreeRows.map(entry => ({
      studentId: entry.student?._id,
      name: entry.student?.name || 'Student',
      initials: entry.student?.initials || 'ST',
      tasksCompleted: entry.tasksCompletedToday,
      pointsAwarded: entry.pointsAwarded,
      rank: entry.rank
    }))
  };
}

async function applySubmissionScoreChange(submission, newScore, reason) {
  const previousScore = Number(submission.score || 0);
  const nextScore = Number(newScore || 0);
  const delta = nextScore - previousScore;
  submission.score = nextScore;
  await submission.save();
  if (delta !== 0) {
    await awardXp(submission.student, delta, reason);
  }
}

function normalizeDifficulty(value) {
  const normalized = String(value || 'Medium').trim().toLowerCase();
  if (normalized === 'easy') return 'Easy';
  if (normalized === 'hard') return 'Hard';
  return 'Medium';
}

function normalizeNeedsSubmission(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return ['yes', 'true', '1', 'y'].includes(normalized);
}

function normalizeFrequency(value) {
  return String(value || '').trim().toLowerCase() === 'daily' ? 'daily' : 'once';
}

async function buildTeacherOverview(batchId) {
  const [students, stats, batch] = await Promise.all([
    User.find({ role: 'student' }).select('name initials color'),
    MonthTaskStat.find({ batch: batchId }),
    MonthTaskBatch.findById(batchId)
  ]);
  if (!batch) throw new Error('Batch not found');
  const statMap = new Map(stats.map(entry => [entry.student.toString(), entry]));
  const today = new Date();
  const { start, end } = getBatchWindow(batch);
  const totalDays = Math.max(1, Math.ceil((endOfDay(end) - startOfDay(start)) / 86400000) + 1);
  const elapsedDays = Math.min(totalDays, Math.max(1, Math.ceil((startOfDay(today) - startOfDay(start)) / 86400000) + 1));
  const remainingFraction = Math.max(0, (totalDays - elapsedDays) / totalDays);

  return students.map(student => {
    const stat = statMap.get(student._id.toString());
    const tasksCompleted = stat?.totalCompleted || 0;
    return {
      studentId: student._id,
      name: student.name,
      initials: student.initials,
      color: student.color,
      tasksCompleted,
      tasksFailed: stat?.totalFailed || 0,
      currentStreak: stat?.streakDays || 0,
      elitePoints: stat?.elitePoints || 0,
      warningCount: stat?.warningCount || 0,
      isBehind: remainingFraction < 0.5 && tasksCompleted < Math.ceil(batch.minimumTarget * 0.5)
    };
  });
}

async function resolveExtension(batchId, studentId, dateKey) {
  const batch = await MonthTaskBatch.findById(batchId);
  if (!batch) return null;
  return batch.deadlineExtensions
    .filter((entry) => {
      const appliesToStudent = entry.appliesToAllStudents
        || (entry.student && entry.student.toString() === String(studentId));
      const appliesToDate = entry.scope === 'all' || entry.dateKey === dateKey;
      return appliesToStudent && appliesToDate;
    })
    .sort((a, b) => new Date(b.extendedUntil) - new Date(a.extendedUntil))[0] || null;
}

async function runNegativeMarkJob(dateKey = formatDateKey(new Date(Date.now() - 86400000))) {
  const batches = await MonthTaskBatch.find();
  for (const batch of batches) {
    const submissions = await MonthTaskSubmission.find({
      batch: batch._id,
      date: dateKey,
      status: 'in_progress',
      negativeMarkApplied: false
    });
    for (const submission of submissions) {
      const extension = await resolveExtension(batch._id, submission.student, dateKey);
      if (extension && new Date(extension.extendedUntil) > new Date()) continue;
      submission.status = 'failed';
      submission.negativeMarkApplied = true;
      submission.reviewNotes = 'Negative mark applied by midnight audit.';
      await applySubmissionScoreChange(
        submission,
        Number(batch.negativeMarkValue || -5),
        `Month task negative mark: ${batch.monthName} ${batch.year}`
      );
      await rebuildStudentStat(submission.student, batch._id);
    }
  }
}

async function runDailyTopperJob(dateKey = formatDateKey(new Date(Date.now() - 86400000))) {
  const batches = await MonthTaskBatch.find();
  for (const batch of batches) {
    const submissions = await MonthTaskSubmission.find({
      batch: batch._id,
      date: dateKey,
      status: { $in: ['submitted', 'approved', 'self_declared'] }
    }).populate('student', 'name initials color');

    const counts = new Map();
    submissions.forEach(entry => {
      const key = entry.student?._id?.toString();
      if (!key) return;
      counts.set(key, {
        student: entry.student,
        total: (counts.get(key)?.total || 0) + 1
      });
    });

    const ranking = [...counts.values()]
      .sort((a, b) => b.total - a.total || a.student.name.localeCompare(b.student.name))
      .slice(0, 3);
    if (!ranking.length) continue;

    await MonthTaskDailyTopper.deleteMany({ batch: batch._id, date: dateKey });

    for (let index = 0; index < ranking.length; index += 1) {
      const row = ranking[index];
      let pointsAwarded = 0;
      let is7DayBonus = false;

      if (index === 0) {
        pointsAwarded += 20;
        const recentWins = await MonthTaskDailyTopper.find({
          batch: batch._id,
          student: row.student._id,
          rank: 1
        }).sort({ date: -1 }).limit(6);

        const expectedDates = [];
        const current = parseDateKey(dateKey);
        for (let day = 1; day <= 6; day += 1) {
          current.setDate(current.getDate() - 1);
          expectedDates.push(formatDateKey(current));
        }
        const hasSevenDayRun = expectedDates.every(key => recentWins.some(entry => entry.date === key));
        if (hasSevenDayRun) {
          pointsAwarded += 200;
          is7DayBonus = true;
        }
      }

      await MonthTaskDailyTopper.create({
        batch: batch._id,
        date: dateKey,
        student: row.student._id,
        tasksCompletedToday: row.total,
        pointsAwarded,
        is7DayBonus,
        rank: index + 1
      });

      if (pointsAwarded > 0) {
        await awardXp(row.student._id, pointsAwarded, `Month task daily topper bonus for ${dateKey}`);
        await rebuildStudentStat(row.student._id, batch._id);
      }
    }
  }
}

async function runWarningJob() {
  const batches = await MonthTaskBatch.find();
  for (const batch of batches) {
    const stats = await MonthTaskStat.find({ batch: batch._id });
    for (const stat of stats) {
      if (stat.consecutiveSkipDays >= 3) {
        const exists = await MonthTaskWarning.findOne({
          student: stat.student,
          batch: batch._id,
          warningType: '3_day_skip',
          teacherAction: 'pending'
        });
        if (!exists) {
          await MonthTaskWarning.create({ student: stat.student, batch: batch._id, warningType: '3_day_skip' });
        }
      }

      if (stat.consecutiveSameScoreDays >= 5) {
        const exists = await MonthTaskWarning.findOne({
          student: stat.student,
          batch: batch._id,
          warningType: '5_day_same_score',
          teacherAction: 'pending'
        });
        if (!exists) {
          await MonthTaskWarning.create({ student: stat.student, batch: batch._id, warningType: '5_day_same_score' });
        }
      }
    }
  }
}

async function runStreakJob() {
  const batches = await MonthTaskBatch.find();
  const students = await User.find({ role: 'student' }).select('_id');
  for (const batch of batches) {
    for (const student of students) {
      await rebuildStudentStat(student._id, batch._id);
    }
  }
}

async function createExtension({ batchId, studentId, leaveRequestId, justification, dateKey, teacherId, scope }) {
  const [batch, leaveRequest] = await Promise.all([
    MonthTaskBatch.findById(batchId),
    leaveRequestId ? LeaveRequest.findById(leaveRequestId) : null
  ]);
  if (!batch) throw new Error('Batch not found');

  const normalizedScope = scope === 'all' ? 'all' : 'date';
  const appliesToAllStudents = String(studentId) === 'all';
  const needsApprovedLeave = !appliesToAllStudents && normalizedScope === 'date';

  if (
    needsApprovedLeave
    && (!leaveRequest || leaveRequest.status !== 'approved' || leaveRequest.student.toString() !== String(studentId))
  ) {
    throw new Error('An approved Leave/OD request for this student is required.');
  }

  if ((!dateKey && normalizedScope === 'date') || (!justification && (appliesToAllStudents || normalizedScope === 'all'))) {
    throw new Error('Provide a valid date and justification for this extension.');
  }

  const baseDate = dateKey ? parseDateKey(dateKey) : getBatchWindow(batch).start;
  const batchWindow = getBatchWindow(batch);
  const extendedUntil = normalizedScope === 'all'
    ? endOfDay(batchWindow.end)
    : endOfDay(new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 1));
  batch.deadlineExtensions.push({
    student: appliesToAllStudents ? null : studentId,
    leaveRequest: leaveRequestId || null,
    justification,
    dateKey: normalizedScope === 'all' ? '' : dateKey,
    scope: normalizedScope,
    appliesToAllStudents,
    extendedUntil,
    createdBy: teacherId
  });
  await batch.save();
  return batch.deadlineExtensions[batch.deadlineExtensions.length - 1];
}

module.exports = {
  adjustToSubmissionDate,
  applySubmissionScoreChange,
  buildTeacherOverview,
  createExtension,
  ensureStat,
  formatDateKey,
  getActiveBatch,
  getBatchWindow,
  getDailySummary,
  getLeaderboard,
  normalizeDifficulty,
  normalizeFrequency,
  normalizeNeedsSubmission,
  rebuildStudentStat,
  runDailyTopperJob,
  runNegativeMarkJob,
  runStreakJob,
  runWarningJob
};
