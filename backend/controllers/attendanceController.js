const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');

exports.getAttendance = async (req, res) => {
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
};

exports.markAttendance = async (req, res) => {
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
};

exports.getStudentHistory = async (req, res) => {
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
};

exports.getStats = async (req, res) => {
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
};

exports.selfMarkAttendance = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can self-mark attendance.' });
    }

    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const windowStart = 9 * 60;
    const windowEnd = 9 * 60 + 30;
    if (minutes < windowStart || minutes > windowEnd) {
      return res.status(400).json({ success: false, message: 'Attendance can only be marked between 9:00 AM and 9:30 AM.' });
    }

    const date = new Date();
    date.setHours(0, 0, 0, 0);

    const approvedRequest = await LeaveRequest.findOne({
      student: req.user.id,
      date,
      status: 'approved'
    });

    let attendance = await Attendance.findOne({ date });
    if (!attendance) {
      const students = await User.find({ role: 'student' });
      attendance = new Attendance({
        date,
        records: students.map(student => ({ student: student._id, status: 'absent' }))
      });
    }

    const record = attendance.records.find(entry => String(entry.student) === String(req.user.id));
    const nextStatus = approvedRequest ? approvedRequest.type : 'present';
    if (record) {
      record.status = nextStatus;
    } else {
      attendance.records.push({ student: req.user.id, status: nextStatus });
    }

    await attendance.save();
    await attendance.populate('records.student');
    res.json({ success: true, data: attendance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
