const ExcelJS = require('exceljs');
const multer = require('multer');
const os = require('os');
const MonthTask = require('../models/MonthTask');
const MonthTaskBatch = require('../models/MonthTaskBatch');
const Badge = require('../models/Badge');
const MonthTaskDailyTopper = require('../models/MonthTaskDailyTopper');
const MonthTaskStat = require('../models/MonthTaskStat');
const MonthTaskSubmission = require('../models/MonthTaskSubmission');
const MonthTaskWarning = require('../models/MonthTaskWarning');
const User = require('../models/User');
const {
  adjustToSubmissionDate,
  applySubmissionScoreChange,
  buildTeacherOverview,
  createExtension,
  formatDateKey,
  getActiveBatch,
  getDailySummary,
  getLeaderboard,
  normalizeDifficulty,
  normalizeFrequency,
  normalizeNeedsSubmission,
  rebuildStudentStat
} = require('../utils/monthTasksService');
const { uploadBuffer, uploadFile } = require('../utils/fileStorage');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

function monthTaskTitle(batch) {
  return `${batch.monthName} ${batch.year} Month Tasks`;
}

function normalizeBatch(batch) {
  if (!batch) return null;
  return {
    id: batch._id,
    monthName: batch.monthName,
    year: batch.year,
    totalTasks: batch.totalTasks,
    minimumTarget: batch.minimumTarget,
    eliteTarget: batch.eliteTarget,
    negativeMarkValue: batch.negativeMarkValue,
    description: batch.description,
    rules: batch.rules,
    title: monthTaskTitle(batch),
    createdBy: batch.createdBy,
    createdAt: batch.createdAt,
    topPerformerOverride: batch.topPerformerOverride || null
  };
}

function normalizeTask(task) {
  return {
    id: task._id,
    batchId: task.batch,
    taskNumber: task.taskNumber,
    title: task.title,
    description: task.description,
    difficulty: task.difficulty,
    marks: task.marks,
    category: task.category,
    taskDate: task.taskDate || '',
    taskLink: task.taskLink || '',
    frequency: task.frequency || 'once',
    needsSubmission: task.needsSubmission,
    answerMode: task.answerMode || (task.needsSubmission ? 'file' : 'done'),
    allowLinkSubmission: Boolean(task.allowLinkSubmission),
    allowTextSubmission: Boolean(task.allowTextSubmission),
    allowFileUpload: task.allowFileUpload !== false,
    createdAt: task.createdAt
  };
}

function buildSubmissionSettings(answerMode, needsSubmission) {
  const mode = answerMode || (needsSubmission ? 'file' : 'done');
  return {
    needsSubmission,
    answerMode: mode,
    allowFileUpload: mode === 'file' || mode === 'mixed',
    allowLinkSubmission: mode === 'link_text' || mode === 'mixed',
    allowTextSubmission: mode === 'link_text' || mode === 'mixed'
  };
}

function normalizeSubmission(submission) {
  return {
    id: submission._id,
    studentId: submission.student?._id || submission.student,
    studentName: submission.student?.name,
    taskId: submission.task?._id || submission.task,
    taskTitle: submission.task?.title,
    batchId: submission.batch,
    date: submission.date,
    status: submission.status,
    startedAt: submission.startedAt,
    submittedAt: submission.submittedAt,
    proofUrl: submission.proofUrl,
    responseText: submission.responseText,
    proofFileUrl: submission.proofFileUrl,
    proofFileName: submission.proofFileName,
    score: submission.score,
    negativeMarkApplied: submission.negativeMarkApplied,
    approvedBy: submission.approvedBy,
    approvedAt: submission.approvedAt,
    rejectedReason: submission.rejectedReason,
    reviewNotes: submission.reviewNotes
  };
}

function normalizeWarning(warning) {
  return {
    id: warning._id,
    studentId: warning.student?._id || warning.student,
    studentName: warning.student?.name,
    batchId: warning.batch?._id || warning.batch,
    batchTitle: warning.batch ? monthTaskTitle(warning.batch) : undefined,
    warningType: warning.warningType,
    triggeredAt: warning.triggeredAt,
    explanationText: warning.explanationText,
    submittedAt: warning.submittedAt,
    teacherAction: warning.teacherAction,
    actionedAt: warning.actionedAt
  };
}

function monthHasEnded(batch) {
  if (!batch?.monthName || !batch?.year) return false;
  const monthDate = new Date(`${batch.monthName} 1, ${batch.year} 23:59:59`);
  if (Number.isNaN(monthDate.getTime())) return false;
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);
  return new Date() > monthEnd;
}

function normalizeRequestedDateKey(value) {
  const raw = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : '';
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function ensureMonthLegendBadge(studentId, batch, stat, submissions) {
  if (!studentId || !batch || !stat || !monthHasEnded(batch)) return null;
  if ((stat.totalCompleted || 0) < (batch.totalTasks || 0)) return null;
  if ((stat.totalFailed || 0) > 0) return null;
  if ((submissions || []).some(entry => entry.negativeMarkApplied)) return null;

  const badgeName = `${batch.monthName} Legend`;
  const badge = await Badge.findOneAndUpdate(
    { name: badgeName },
    {
      $setOnInsert: {
        icon: '👑',
        desc: `Completed every ${batch.monthName} month task without any penalty.`,
        rarity: 'legendary',
        condition: `Complete all ${batch.monthName} month tasks in time without penalty`
      }
    },
    { new: true, upsert: true }
  );

  const user = await User.findById(studentId);
  if (!user) return null;

  const alreadyUnlocked = (user.unlockedBadges || []).some(entry => entry.toString() === badge._id.toString());
  if (!alreadyUnlocked) {
    user.unlockedBadges.push(badge._id);
    if (!(user.badgeShowcase || []).some(entry => entry.toString() === badge._id.toString())) {
      user.badgeShowcase = [badge._id, ...(user.badgeShowcase || [])].slice(0, 3);
    }
    await user.save();
  }

  return {
    id: badge._id,
    icon: badge.icon,
    name: badge.name,
    desc: badge.desc,
    rarity: badge.rarity,
    newlyUnlocked: !alreadyUnlocked
  };
}

exports.uploadMiddleware = upload.single('file');
exports.excelUploadMiddleware = excelUpload.single('file');

exports.listBatches = async (req, res) => {
  try {
    const page = parsePositiveInteger(req.query.page, 1);
    const limit = parsePositiveInteger(req.query.limit, 0);
    const skip = limit > 0 ? (page - 1) * limit : 0;

    const [total, batches, activeBatch] = await Promise.all([
      MonthTaskBatch.countDocuments(),
      MonthTaskBatch.find()
        .sort({ year: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit > 0 ? limit : 0),
      getActiveBatch()
    ]);

    const effectiveLimit = limit > 0 ? limit : total || 1;
    res.json({
      success: true,
      data: {
        activeBatchId: activeBatch?._id || null,
        batches: batches.map(normalizeBatch),
        pagination: {
          page,
          limit: effectiveLimit,
          total,
          totalPages: Math.max(1, Math.ceil(total / effectiveLimit))
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getActiveBatch = async (req, res) => {
  try {
    const batch = await getActiveBatch();
    if (!batch) {
      return res.status(404).json({ success: false, message: 'No active month task batch found.' });
    }
    res.json({ success: true, data: normalizeBatch(batch) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createBatch = async (req, res) => {
  try {
    const batch = await MonthTaskBatch.create({
      monthName: req.body.monthName,
      year: Number(req.body.year),
      totalTasks: Number(req.body.totalTasks || 0),
      minimumTarget: Number(req.body.minimumTarget || 0),
      eliteTarget: Number(req.body.eliteTarget || 0),
      negativeMarkValue: Number(req.body.negativeMarkValue || -5),
      description: req.body.description || '',
      rules: req.body.rules || '',
      createdBy: req.user.id
    });
    res.status(201).json({ success: true, data: normalizeBatch(batch) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateBatch = async (req, res) => {
  try {
    const batch = await MonthTaskBatch.findByIdAndUpdate(
      req.params.id,
      {
        monthName: req.body.monthName,
        year: Number(req.body.year),
        totalTasks: Number(req.body.totalTasks || 0),
        minimumTarget: Number(req.body.minimumTarget || 0),
        eliteTarget: Number(req.body.eliteTarget || 0),
        negativeMarkValue: Number(req.body.negativeMarkValue || -5),
        description: req.body.description || '',
        rules: req.body.rules || ''
      },
      { new: true }
    );
    res.json({ success: true, data: normalizeBatch(batch) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBatch = async (req, res) => {
  try {
    const [batch, todaySummary, leaderboard, dailyToppers] = await Promise.all([
      MonthTaskBatch.findById(req.params.id).populate('topPerformerOverride.student', 'name initials color'),
      getDailySummary(req.params.id, formatDateKey(new Date())),
      getLeaderboard(req.params.id),
      MonthTaskDailyTopper.find({ batch: req.params.id, date: formatDateKey(new Date()) })
        .populate('student', 'name initials color')
        .sort({ rank: 1 })
    ]);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }
    res.json({
      success: true,
      data: {
        ...normalizeBatch(batch),
        totalTasks: batch.totalTasks || 0,
        leaderboard,
        todaySummary,
        dailyTopPerformers: dailyToppers.map(entry => ({
          rank: entry.rank,
          studentId: entry.student?._id,
          name: entry.student?.name || 'Student',
          initials: entry.student?.initials || 'ST',
          tasksCompletedToday: entry.tasksCompletedToday,
          pointsAwarded: entry.pointsAwarded
        }))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createTask = async (req, res) => {
  try {
    const batch = await MonthTaskBatch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }
    const task = await MonthTask.create({
      batch: batch._id,
      taskNumber: Number(req.body.taskNumber),
      title: req.body.title,
      description: req.body.description || '',
      difficulty: normalizeDifficulty(req.body.difficulty),
      marks: Number(req.body.marks || 0),
      category: req.body.category || 'General',
      taskDate: String(req.body.taskDate || '').trim(),
      taskLink: String(req.body.taskLink || '').trim(),
      frequency: normalizeFrequency(req.body.frequency),
      ...buildSubmissionSettings(
        req.body.answerMode,
        Boolean(req.body.needsSubmission)
      ),
      createdBy: req.user.id
    });
    await MonthTaskBatch.findByIdAndUpdate(batch._id, { $inc: { totalTasks: 1 } });
    res.status(201).json({ success: true, data: normalizeTask(task) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.uploadExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Excel file is required.' });
    }

    const batch = await MonthTaskBatch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return res.status(400).json({ success: false, message: 'Excel sheet is empty.' });
    }

    const created = [];
    sheet.eachRow((row, index) => {
      if (index === 1) return;
      const values = row.values || [];
      created.push({
        taskNumber: Number(values[1]),
        title: String(values[2] || '').trim(),
        description: String(values[3] || '').trim(),
        difficulty: normalizeDifficulty(values[4]),
        marks: Number(values[5] || 0),
        category: String(values[6] || 'General').trim(),
        taskDate: String(values[10] || '').trim(),
        taskLink: String(values[11] || '').trim(),
        ...buildSubmissionSettings(
          String(values[8] || '').trim().toLowerCase() || undefined,
          normalizeNeedsSubmission(values[7])
        ),
        frequency: normalizeFrequency(values[9])
      });
    });

    let createdCount = 0;
    for (const row of created) {
      if (!row.taskNumber || !row.title) continue;
      const result = await MonthTask.updateOne(
        { batch: batch._id, taskNumber: row.taskNumber },
        {
          $set: row,
          $setOnInsert: {
            batch: batch._id,
            createdBy: req.user.id
          }
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
      createdCount += result.upsertedCount || 0;
    }

    if (createdCount > 0) {
      await MonthTaskBatch.findByIdAndUpdate(batch._id, { $inc: { totalTasks: createdCount } });
    }

    const taskNumbers = created
      .filter(row => row.taskNumber && row.title)
      .map(row => row.taskNumber);
    const tasks = await MonthTask.find({
      batch: batch._id,
      taskNumber: { $in: taskNumbers }
    }).sort({ taskNumber: 1 });

    res.json({
      success: true,
      data: {
        importedCount: tasks.length,
        tasks: tasks.map(normalizeTask)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBatchTasks = async (req, res) => {
  try {
    const tasks = await MonthTask.find({ batch: req.params.id }).sort({ taskNumber: 1 });
    const submissions = req.user.role === 'student'
      ? await MonthTaskSubmission.find({ batch: req.params.id, student: req.user.id }).sort({ date: -1, updatedAt: -1 })
      : [];
    const selectedDateKey = normalizeRequestedDateKey(req.query.date) || formatDateKey(adjustToSubmissionDate(new Date()));
    const submissionsByTask = submissions.reduce((map, entry) => {
      const key = entry.task.toString();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(entry);
      return map;
    }, new Map());

    res.json({
      success: true,
      data: tasks.map(task => ({
        ...normalizeTask(task),
        completedDays: (submissionsByTask.get(task._id.toString()) || []).filter((entry) =>
          ['submitted', 'approved', 'self_declared'].includes(entry.status)
        ).length,
        submission: (() => {
          const taskSubmissions = submissionsByTask.get(task._id.toString()) || [];
          const currentSubmission = task.frequency === 'daily'
            ? taskSubmissions.find((entry) => entry.date === selectedDateKey) || null
            : taskSubmissions[0] || null;
          return currentSubmission ? normalizeSubmission(currentSubmission) : null;
        })()
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.startTask = async (req, res) => {
  try {
    const task = await MonthTask.findById(req.body.taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const dateKey = normalizeRequestedDateKey(req.body.date)
      || formatDateKey(adjustToSubmissionDate(new Date()));
    let submission = await MonthTaskSubmission.findOne(
      task.frequency === 'daily'
        ? { student: req.user.id, task: task._id, date: dateKey }
        : { student: req.user.id, task: task._id }
    ).sort({ date: -1, updatedAt: -1 });
    if (!submission) {
      submission = await MonthTaskSubmission.create({
        student: req.user.id,
        task: task._id,
        batch: task.batch,
        date: dateKey,
        status: 'in_progress',
        startedAt: new Date()
      });
    } else if (submission.status === 'not_started') {
      submission.status = 'in_progress';
      submission.startedAt = new Date();
      submission.date = dateKey;
      await submission.save();
    }

    await rebuildStudentStat(req.user.id, task.batch);
    res.json({ success: true, data: normalizeSubmission(submission) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.submitTask = async (req, res) => {
  try {
    const task = await MonthTask.findById(req.body.taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const dateKey = normalizeRequestedDateKey(req.body.date)
      || formatDateKey(adjustToSubmissionDate(new Date()));
    let proofFileUrl = '';
    let proofFileName = '';
    if (req.file) {
      const uploaded = await uploadFile(req, req.file, 'month-tasks');
      proofFileUrl = uploaded.secure_url;
      proofFileName = req.file.originalname;
    }

    let submission = await MonthTaskSubmission.findOne(
      task.frequency === 'daily'
        ? { student: req.user.id, task: task._id, date: dateKey }
        : { student: req.user.id, task: task._id }
    ).sort({ date: -1, updatedAt: -1 });
    if (!submission) {
      submission = new MonthTaskSubmission({
        student: req.user.id,
        task: task._id,
        batch: task.batch,
        startedAt: new Date()
      });
    }

    submission.date = dateKey;
    submission.submittedAt = new Date();
    submission.proofUrl = req.body.proofUrl || submission.proofUrl || '';
    submission.responseText = req.body.responseText || submission.responseText || '';
    submission.proofFileUrl = proofFileUrl || submission.proofFileUrl || '';
    submission.proofFileName = proofFileName || submission.proofFileName || '';
    submission.status = task.answerMode === 'done' ? 'self_declared' : 'submitted';
    if (!submission.startedAt) submission.startedAt = new Date();
    await submission.save();

    await rebuildStudentStat(req.user.id, task.batch);
    res.status(201).json({ success: true, data: normalizeSubmission(submission) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const task = await MonthTask.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.taskNumber = Number(req.body.taskNumber || task.taskNumber);
    task.title = req.body.title ?? task.title;
    task.description = req.body.description ?? task.description;
    task.difficulty = normalizeDifficulty(req.body.difficulty || task.difficulty);
    task.marks = Number(req.body.marks ?? task.marks);
    task.category = req.body.category ?? task.category;
    task.taskDate = String(req.body.taskDate ?? task.taskDate ?? '').trim();
    task.taskLink = String(req.body.taskLink ?? task.taskLink ?? '').trim();
    task.frequency = normalizeFrequency(req.body.frequency || task.frequency);
    Object.assign(
      task,
      buildSubmissionSettings(
        req.body.answerMode || task.answerMode,
        req.body.needsSubmission === undefined ? task.needsSubmission : Boolean(req.body.needsSubmission)
      )
    );
    await task.save();

    res.json({ success: true, data: normalizeTask(task) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await MonthTask.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await MonthTaskSubmission.deleteMany({ task: task._id });
    await MonthTask.findByIdAndDelete(task._id);
    await MonthTaskBatch.findByIdAndUpdate(task.batch, { $inc: { totalTasks: -1 } });

    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listPendingSubmissions = async (req, res) => {
  try {
    const submissions = await MonthTaskSubmission.find({
      batch: req.params.batchId,
      status: { $in: ['submitted', 'self_declared'] }
    })
      .populate('student', 'name initials color')
      .populate('task');
    res.json({ success: true, data: submissions.map(normalizeSubmission) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.approveSubmission = async (req, res) => {
  try {
    const submission = await MonthTaskSubmission.findById(req.params.id).populate('task');
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }
    submission.status = 'approved';
    submission.approvedBy = req.user.id;
    submission.approvedAt = new Date();
    submission.reviewNotes = req.body.reviewNotes || '';
    await submission.save();
    await applySubmissionScoreChange(
      submission,
      Number(req.body.score ?? submission.task?.marks ?? 0),
      `Month task approved: ${submission.task?.title || 'Task'}`
    );
    await rebuildStudentStat(submission.student, submission.batch);
    res.json({ success: true, data: normalizeSubmission(submission) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.rejectSubmission = async (req, res) => {
  try {
    const submission = await MonthTaskSubmission.findById(req.params.id).populate('task batch');
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }
    submission.status = 'failed';
    submission.rejectedReason = req.body.reason || 'Rejected by teacher';
    submission.reviewNotes = req.body.reviewNotes || '';
    submission.approvedBy = req.user.id;
    submission.approvedAt = new Date();
    await submission.save();
    await applySubmissionScoreChange(
      submission,
      Number(req.body.score ?? submission.batch?.negativeMarkValue ?? -5),
      `Month task rejected: ${submission.task?.title || 'Task'}`
    );
    await rebuildStudentStat(submission.student, submission.batch._id || submission.batch);
    res.json({ success: true, data: normalizeSubmission(submission) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const [stat, submissions, allSubmissions, batch] = await Promise.all([
      MonthTaskStat.findOne({ student: req.params.studentId, batch: req.params.batchId }),
      MonthTaskSubmission.find({
        student: req.params.studentId,
        batch: req.params.batchId,
        status: { $in: ['submitted', 'approved', 'self_declared'] }
      }).sort({ date: 1 }),
      MonthTaskSubmission.find({
        student: req.params.studentId,
        batch: req.params.batchId
      }),
      MonthTaskBatch.findById(req.params.batchId)
    ]);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const heatmap = {};
    submissions.forEach(entry => {
      heatmap[entry.date] = (heatmap[entry.date] || 0) + 1;
    });
    const legendBadge = await ensureMonthLegendBadge(req.params.studentId, batch, stat || {}, allSubmissions || []);

    res.json({
      success: true,
      data: {
        studentId: req.params.studentId,
        batchId: req.params.batchId,
        totalCompleted: stat?.totalCompleted || 0,
        totalFailed: stat?.totalFailed || 0,
        totalSelfDeclared: stat?.totalSelfDeclared || 0,
        elitePoints: stat?.elitePoints || 0,
        streakDays: stat?.streakDays || 0,
        consecutiveSkipDays: stat?.consecutiveSkipDays || 0,
        consecutiveSameScoreDays: stat?.consecutiveSameScoreDays || 0,
        warningCount: stat?.warningCount || 0,
        daysActive: stat?.daysActive || 0,
        lastActiveDate: stat?.lastActiveDate || '',
        minimumReached: (stat?.totalCompleted || 0) >= batch.minimumTarget,
        eliteReached: (stat?.totalCompleted || 0) >= batch.eliteTarget,
        heatmap,
        legendBadge
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await getLeaderboard(req.params.batchId);
    res.json({ success: true, data: leaderboard });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getWarnings = async (req, res) => {
  try {
    const warnings = await MonthTaskWarning.find({ explanationText: { $ne: '' } })
      .populate('student', 'name initials color')
      .populate('batch')
      .sort({ triggeredAt: -1 });
    res.json({ success: true, data: warnings.map(normalizeWarning) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyWarnings = async (req, res) => {
  try {
    const query = { student: req.user.id, teacherAction: 'pending' };
    if (req.params.batchId) query.batch = req.params.batchId;
    const warnings = await MonthTaskWarning.find(query).sort({ triggeredAt: -1 });
    res.json({ success: true, data: warnings.map(normalizeWarning) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.submitWarningExplanation = async (req, res) => {
  try {
    const warning = await MonthTaskWarning.findById(req.params.id);
    if (!warning || warning.student.toString() !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Warning not found' });
    }
    warning.explanationText = String(req.body.explanationText || '').trim();
    warning.submittedAt = new Date();
    await warning.save();
    res.json({ success: true, data: normalizeWarning(warning) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.actionWarning = async (req, res) => {
  try {
    const warning = await MonthTaskWarning.findById(req.params.id);
    if (!warning) {
      return res.status(404).json({ success: false, message: 'Warning not found' });
    }
    if (!['accepted', 'flagged'].includes(req.body.action)) {
      return res.status(400).json({ success: false, message: 'Action must be accepted or flagged.' });
    }
    warning.teacherAction = req.body.action;
    warning.actionedAt = new Date();
    await warning.save();

    if (req.body.action === 'flagged') {
      await User.findByIdAndUpdate(warning.student, {
        $inc: { warningBadgeCount: 1 },
        $push: {
          teacherFlags: {
            type: warning.warningType,
            message: `Month task warning flagged on ${formatDateKey(new Date())}`
          }
        }
      });
    }

    await rebuildStudentStat(warning.student, warning.batch);
    res.json({ success: true, data: normalizeWarning(warning) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.extendDeadline = async (req, res) => {
  try {
    const extension = await createExtension({
      batchId: req.body.batchId,
      studentId: req.body.studentId,
      leaveRequestId: req.body.leaveRequestId,
      justification: req.body.justification || '',
      dateKey: req.body.date,
      scope: req.body.scope,
      teacherId: req.user.id
    });
    res.status(201).json({ success: true, data: extension });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getDailySummary = async (req, res) => {
  try {
    const summary = await getDailySummary(req.params.batchId, req.params.date);
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getOverview = async (req, res) => {
  try {
    const overview = await buildTeacherOverview(req.params.batchId);
    res.json({ success: true, data: overview });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.setTopPerformerOverride = async (req, res) => {
  try {
    const batch = await MonthTaskBatch.findByIdAndUpdate(
      req.params.batchId,
      {
        topPerformerOverride: {
          student: req.body.studentId || null,
          date: req.body.date || formatDateKey(new Date())
        }
      },
      { new: true }
    ).populate('topPerformerOverride.student', 'name initials color');
    res.json({ success: true, data: normalizeBatch(batch) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
