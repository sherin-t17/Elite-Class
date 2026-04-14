const express = require('express');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const { teacherOnly } = require('../middleware/roleCheck');
const router = express.Router();

// Get attendance for date
router.get('/', verifyToken, async (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    date.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({ date }).populate('records.student');

    if (!attendance) {
      const students = await User.find({ role: 'student' });
      attendance = new Attendance({
        date,
        records: students.map(s => ({ student: s._id, status: 'absent' }))
      });
      await attendance.save();
      await attendance.populate('records.student');
    }

    res.json({ success: true, data: attendance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Mark attendance
router.post('/', verifyToken, teacherOnly, async (req, res) => {
  try {
    const { date, records } = req.body;
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({ date: attendanceDate });
    if (!attendance) {
      attendance = new Attendance({ date: attendanceDate, records, markedBy: req.user.id });
    } else {
      attendance.records = records;
      attendance.markedBy = req.user.id;
    }

    await attendance.save();
    await attendance.populate('records.student');
    res.json({ success: true, data: attendance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/self-mark', verifyToken, async (req, res) => {
  try {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    let attendance = await Attendance.findOne({ date });
    if (!attendance) {
      const students = await User.find({ role: 'student' });
      attendance = new Attendance({
        date,
        records: students.map(student => ({ student: student._id, status: 'absent' }))
      });
    }

    const minutes = (new Date().getHours() * 60) + new Date().getMinutes();
    if (minutes < 540 || minutes > 570) {
      return res.status(400).json({ success: false, message: 'Attendance can only be marked between 9:00 AM and 9:30 AM.' });
    }

    const existing = attendance.records.find(record => record.student.toString() === req.user.id);
    if (existing) existing.status = 'present';
    else attendance.records.push({ student: req.user.id, status: 'present' });

    await attendance.save();
    await attendance.populate('records.student');
    res.json({ success: true, data: attendance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get student attendance history
router.get('/student/:id', verifyToken, async (req, res) => {
  try {
    const records = await Attendance.find({}).populate('records.student');
    const studentRecords = records.map(r => ({
      date: r.date,
      status: r.records.find(rec => rec.student._id.toString() === req.params.id)?.status
    }));
    res.json({ success: true, data: studentRecords });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get attendance stats
router.get('/stats', verifyToken, teacherOnly, async (req, res) => {
  try {
    const students = await User.find({ role: 'student' });
    const records = await Attendance.find({});

    const stats = students.map(student => {
      const totalDays = records.length;
      const presentDays = records.filter(r =>
        r.records.some(rec => rec.student.toString() === student._id.toString() && rec.status === 'present')
      ).length;
      const percentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : 0;

      return {
        student: student._id,
        name: student.name,
        totalDays,
        presentDays,
        percentage
      };
    });

    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
