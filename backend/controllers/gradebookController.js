const User = require('../models/User');
const Task = require('../models/Task');

exports.getGradebook = async (req, res) => {
  try {
    const tasks = await Task.find({}, { _id: 1, title: 1 }).lean();
    const gradebook = await User.aggregate([
      { $match: { role: 'student' } },
      {
        $lookup: {
          from: 'submissions',
          let: { studentId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$student', '$$studentId'] }
              }
            },
            {
              $project: {
                _id: 0,
                task: 1,
                grade: 1,
                feedback: 1
              }
            }
          ],
          as: 'submissionDocs'
        }
      },
      {
        $project: {
          _id: 0,
          student: '$_id',
          name: 1,
          submissionDocs: 1
        }
      }
    ]);

    const normalizedGradebook = gradebook.map((student) => ({
      student: student.student,
      name: student.name,
      grades: tasks.map((task) => {
        const submission = student.submissionDocs.find(
          entry => String(entry.task) === String(task._id)
        );

        return {
          taskId: task._id,
          taskTitle: task.title,
          grade: submission?.grade || '-',
          feedback: submission?.feedback || ''
        };
      })
    }));

    res.json({ success: true, data: normalizedGradebook });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
