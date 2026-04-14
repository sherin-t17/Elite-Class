const User = require('../models/User');
const Task = require('../models/Task');
const Submission = require('../models/Submission');

exports.getGradebook = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' });
    const tasks = await Task.find();
    const submissions = await Submission.find().populate('student task');

    const gradebook = students.map(student => {
      const studentSubmissions = submissions.filter(
        s => s.student._id.toString() === student._id.toString()
      );
      return {
        student: student._id,
        name: student.name,
        grades: tasks.map(task => {
          const submission = studentSubmissions.find(s => s.task._id.toString() === task._id.toString());
          return {
            taskId: task._id,
            taskTitle: task.title,
            grade: submission?.grade || '-',
            feedback: submission?.feedback || ''
          };
        })
      };
    });

    res.json({ success: true, data: gradebook });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};