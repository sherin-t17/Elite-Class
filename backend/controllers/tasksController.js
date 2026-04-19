const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const Task = require('../models/Task');
const Submission = require('../models/Submission');
const { awardXp } = require('../utils/xpEngine');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.getAll = async (req, res) => {
  try {
    const tasks = await Task.find().populate('createdBy').lean();

    if (req.user.role === 'student') {
      const submissions = await Submission.find({ student: req.user.id }).lean();
      const tasksWithStatus = tasks.map(task => ({
        ...task,
        submission: submissions.find(s => s.task.toString() === (task._id || task.id).toString())
      }));
      return res.json({ success: true, data: tasksWithStatus });
    }

    res.json({ success: true, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, desc, diff, cat, xp, due, priority, isChoice, choices, totalStudents } = req.body;
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
      totalStudents,
      createdBy: req.user.id
    });
    await task.save();
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.submit = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    let fileUrl = null;
    let fileName = null;

    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { resource_type: 'auto' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });
      fileUrl = result.secure_url;
      fileName = req.file.originalname;
    }

    const existing = await Submission.findOne({ task: req.params.id, student: req.user.id });
    if (existing) {
      existing.fileUrl = fileUrl;
      existing.fileName = fileName;
      existing.submittedAt = new Date();
      existing.status = task.due && new Date() > new Date(task.due) ? 'late' : 'submitted';
      await existing.save();
      return res.json({ success: true, data: existing });
    }

    const submission = new Submission({
      task: req.params.id,
      student: req.user.id,
      fileUrl,
      fileName,
      submittedAt: new Date(),
      status: task.due && new Date() > new Date(task.due) ? 'late' : 'submitted'
    });
    await submission.save();
    res.status(201).json({ success: true, data: submission });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.grade = async (req, res) => {
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

    if (xpAwarded) {
      await awardXp(submission.student, xpAwarded, `Graded task: ${grade}`);
    }

    res.json({ success: true, data: submission });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.claimChoice = async (req, res) => {
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
};

exports.getSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ task: req.params.id })
      .populate('student')
      .populate('gradedBy');
    res.json({ success: true, data: submissions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};