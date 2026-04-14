const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const User = require('../models/User');
const Task = require('../models/Task');
const Submission = require('../models/Submission');
const Attendance = require('../models/Attendance');

exports.generatePDF = async (type, res) => {
  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="elite-class-${type}.pdf"`);
  doc.pipe(res);

  if (type === 'attendance') {
    await exports.pdfAttendance(doc);
  } else if (type === 'gradebook') {
    await exports.pdfGradebook(doc);
  } else if (type === 'students') {
    await exports.pdfStudents(doc);
  }

  doc.end();
};

exports.pdfAttendance = async (doc) => {
  doc.fontSize(20).text('Attendance Report', { align: 'center' });
  doc.fontSize(12).text(`Generated: ${new Date().toDateString()}`, { align: 'center' });
  doc.moveDown();

  const records = await Attendance.find().populate('records.student');
  for (const record of records) {
    doc.fontSize(11).text(`Date: ${new Date(record.date).toDateString()}`);
    for (const attendance of record.records) {
      doc.fontSize(10).text(`  ${attendance.student.name}: ${attendance.status}`);
    }
    doc.moveDown();
  }
};

exports.pdfGradebook = async (doc) => {
  doc.fontSize(20).text('Gradebook', { align: 'center' });
  doc.fontSize(12).text(`Generated: ${new Date().toDateString()}`, { align: 'center' });
  doc.moveDown();

  const submissions = await Submission.find()
    .populate('student')
    .populate('task');

  for (const submission of submissions) {
    doc.fontSize(10).text(
      `${submission.student.name} - ${submission.task.title}: ${submission.grade || 'N/A'}`
    );
  }
};

exports.pdfStudents = async (doc) => {
  doc.fontSize(20).text('Student Report', { align: 'center' });
  doc.fontSize(12).text(`Generated: ${new Date().toDateString()}`, { align: 'center' });
  doc.moveDown();

  const students = await User.find({ role: 'student' }).sort({ xp: -1 });
  for (const student of students) {
    doc.fontSize(10).text(
      `${student.rank}. ${student.name} (${student.level}) - XP: ${student.xp}`
    );
  }
};

exports.generateExcel = async (type, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(type);

  if (type === 'attendance') {
    await exports.excelAttendance(worksheet);
  } else if (type === 'gradebook') {
    await exports.excelGradebook(worksheet);
  } else if (type === 'leaderboard') {
    await exports.excelLeaderboard(worksheet);
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="elite-class-${type}.xlsx"`);
  await workbook.xlsx.write(res);
};

exports.excelAttendance = async (worksheet) => {
  worksheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Student', key: 'student', width: 25 },
    { header: 'Status', key: 'status', width: 12 }
  ];

  const records = await Attendance.find().populate('records.student');
  for (const record of records) {
    for (const attendance of record.records) {
      worksheet.addRow({
        date: new Date(record.date).toDateString(),
        student: attendance.student.name,
        status: attendance.status
      });
    }
  }
};

exports.excelGradebook = async (worksheet) => {
  worksheet.columns = [
    { header: 'Student', key: 'student', width: 25 },
    { header: 'Task', key: 'task', width: 25 },
    { header: 'Grade', key: 'grade', width: 10 },
    { header: 'Feedback', key: 'feedback', width: 30 }
  ];

  const submissions = await Submission.find()
    .populate('student')
    .populate('task');

  for (const submission of submissions) {
    worksheet.addRow({
      student: submission.student.name,
      task: submission.task.title,
      grade: submission.grade || 'N/A',
      feedback: submission.feedback || ''
    });
  }
};

exports.excelLeaderboard = async (worksheet) => {
  worksheet.columns = [
    { header: 'Rank', key: 'rank', width: 8 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Level', key: 'level', width: 15 },
    { header: 'XP', key: 'xp', width: 12 },
    { header: 'Streak', key: 'streak', width: 10 }
  ];

  const students = await User.find({ role: 'student' }).sort({ xp: -1 });
  for (const student of students) {
    worksheet.addRow({
      rank: student.rank,
      name: student.name,
      level: student.level,
      xp: student.xp,
      streak: student.streak
    });
  }
};