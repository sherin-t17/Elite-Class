const express = require('express');
const multer = require('multer');
const Task = require('../models/Task');
const Submission = require('../models/Submission');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const { teacherOnly, studentOnly } = require('../middleware/roleCheck');
const { awardXp, updateAllRanks } = require('../utils/xpEngine');
const { uploadBuffer } = require('../utils/fileStorage');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Get all tasks
router.get('/', verifyToken, async (req, res) => {
  try {
    const [tasks, submissionCounts, pendingSubmissionCounts, totalStudents] = await Promise.all([
      Task.find()
        .populate('createdBy')
        .populate('choices.takenBy', 'name initials'),
      Submission.aggregate([
        { $group: { _id: '$task', count: { $sum: 1 } } }
      ]),
      Submission.aggregate([
        { $match: { status: { $in: ['submitted', 'late'] } } },
        { $group: { _id: '$task', count: { $sum: 1 } } }
      ]),
      User.countDocuments({ role: 'student' })
    ]);

    const countsByTask = new Map(
      submissionCounts.map(entry => [entry._id.toString(), entry.count])
    );
    const pendingCountsByTask = new Map(
      pendingSubmissionCounts.map(entry => [entry._id.toString(), entry.count])
    );

    if (req.user.role === 'student') {
      const submissions = await Submission.find({ student: req.user.id });
      const tasksWithStatus = tasks.map(task => ({
        ...task.toObject(),
        completions: countsByTask.get(task._id.toString()) || 0,
        pendingGradingCount: pendingCountsByTask.get(task._id.toString()) || 0,
        total: task.totalStudents || totalStudents,
        submission: submissions.find(s => s.task.toString() === task._id.toString())
      }));
      return res.json({ success: true, data: tasksWithStatus });
    }

    res.json({
      success: true,
      data: tasks.map(task => ({
        ...task.toObject(),
        completions: countsByTask.get(task._id.toString()) || 0,
        pendingGradingCount: pendingCountsByTask.get(task._id.toString()) || 0,
        total: task.totalStudents || totalStudents
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create task
router.post('/', verifyToken, teacherOnly, async (req, res) => {
  try {
    const { title, desc, diff, cat, xp, due, priority, isChoice, choices, totalStudents, attachmentUrl, attachmentName, answerMode, choicePrompt } = req.body;
    const task = new Task({
      title,
      desc,
      diff,
      cat,
      xp,
      due,
      priority,
      isChoice,
      choices,
      attachmentUrl,
      attachmentName,
      answerMode,
      choicePrompt,
      totalStudents,
      createdBy: req.user.id
    });
    await task.save();
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Compatibility handler for older teacher review requests hitting /api/tasks/:id
router.post('/:id', verifyToken, teacherOnly, async (req, res, next) => {
  try {
    const { submissionId, grade, feedback, xpAwarded } = req.body || {};
    if (!submissionId) return next();

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    if (grade || xpAwarded !== undefined) {
      submission.grade = grade || submission.grade || '';
      submission.feedback = feedback || '';
      submission.xpAwarded = xpAwarded;
      submission.status = 'graded';
      submission.gradedAt = new Date();
      submission.gradedBy = req.user.id;
      await submission.save();

      if (xpAwarded) {
        await awardXp(submission.student, xpAwarded, `Graded task: ${grade || ''}`);
      }

      return res.json({ success: true, data: submission });
    }

    submission.status = 'redo';
    submission.feedback = '';
    submission.grade = '';
    submission.xpAwarded = 0;
    submission.gradedAt = new Date();
    submission.gradedBy = req.user.id;
    submission.redoFeedback = String(feedback || '').trim();
    await submission.save();

    return res.json({ success: true, data: submission });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Update task
router.put('/:id', verifyToken, teacherOnly, async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete task
router.delete('/:id', verifyToken, teacherOnly, async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Submit task
router.post('/:id/submit', verifyToken, studentOnly, upload.single('file'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    let fileUrl = null;
    let fileName = null;

    if (req.file) {
      const result = await uploadBuffer(req, req.file, 'tasks');
      fileUrl = result.secure_url;
      fileName = req.file.originalname;
    }

    const proofUrl = String(req.body.proofUrl || '').trim();
    const responseText = String(req.body.responseText || '').trim();
    const nextStatus = task.due && new Date() > new Date(task.due) ? 'late' : 'submitted';

    const existing = await Submission.findOne({ task: req.params.id, student: req.user.id });
    if (existing) {
      existing.fileUrl = fileUrl || existing.fileUrl || '';
      existing.fileName = fileName || existing.fileName || '';
      existing.proofUrl = proofUrl || existing.proofUrl || '';
      existing.responseText = responseText || existing.responseText || '';
      existing.submittedAt = new Date();
      existing.status = nextStatus;
      existing.redoFeedback = '';
      await existing.save();
      return res.json({ success: true, data: existing });
    }

    const submission = new Submission({
      task: req.params.id,
      student: req.user.id,
      fileUrl,
      fileName,
      proofUrl,
      responseText,
      submittedAt: new Date(),
      status: nextStatus
    });
    await submission.save();
    res.status(201).json({ success: true, data: submission });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Grade submission
router.post('/:id/grade', verifyToken, teacherOnly, async (req, res) => {
  try {
    const { submissionId, grade, feedback, xpAwarded } = req.body;
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    submission.grade = grade;
    submission.feedback = feedback;
    submission.xpAwarded = xpAwarded;
    submission.status = 'graded';
    submission.gradedAt = new Date();
    submission.gradedBy = req.user.id;
    await submission.save();

    // Award XP
    if (xpAwarded) {
      await awardXp(submission.student, xpAwarded, `Graded task: ${grade}`);
    }

    res.json({ success: true, data: submission });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const handleRedoRequest = async (req, res) => {
  try {
    const { submissionId, feedback } = req.body;
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    submission.status = 'redo';
    submission.feedback = '';
    submission.grade = '';
    submission.xpAwarded = 0;
    submission.gradedAt = new Date();
    submission.gradedBy = req.user.id;
    submission.redoFeedback = String(feedback || '').trim();
    await submission.save();

    res.json({ success: true, data: submission });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

router.put('/:id/redo', verifyToken, teacherOnly, handleRedoRequest);
router.post('/:id/redo', verifyToken, teacherOnly, handleRedoRequest);

// Claim choice task
router.post('/:id/claim/:choiceId', verifyToken, studentOnly, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task || !task.isChoice) {
      return res.status(400).json({ success: false, message: 'Not a choice task' });
    }

    const choice = task.choices.find(c => c.id === parseInt(req.params.choiceId));
    if (!choice) {
      return res.status(404).json({ success: false, message: 'Choice not found' });
    }

    if (choice.takenBy) {
      return res.status(400).json({ success: false, message: 'Choice already taken' });
    }

    choice.takenBy = req.user.id;
    await task.save();
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get task submissions
router.get('/:id/submissions', verifyToken, teacherOnly, async (req, res) => {
  try {
    const submissions = await Submission.find({ task: req.params.id })
      .populate('student')
      .populate('gradedBy');
    res.json({ success: true, data: submissions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
