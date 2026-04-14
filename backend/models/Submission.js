const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fileUrl: String,
    fileName: String,
    proofUrl: { type: String, default: '' },
    responseText: { type: String, default: '' },
    submittedAt: Date,
    status: { type: String, enum: ['submitted', 'graded', 'late', 'redo'], default: 'submitted' },
    grade: String,
    gradePoints: Number,
    feedback: String,
    redoFeedback: { type: String, default: '' },
    xpAwarded: Number,
    gradedAt: Date,
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    choiceId: Number
  },
  { timestamps: true }
);

module.exports = mongoose.model('Submission', SubmissionSchema);
