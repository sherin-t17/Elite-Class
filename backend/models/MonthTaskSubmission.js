const mongoose = require('mongoose');

const MonthTaskSubmissionSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'MonthTask', required: true, index: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'MonthTaskBatch', required: true, index: true },
    date: { type: String, required: true },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'submitted', 'approved', 'failed', 'self_declared'],
      default: 'not_started'
    },
    startedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    proofUrl: { type: String, default: '' },
    responseText: { type: String, default: '' },
    proofFileUrl: { type: String, default: '' },
    proofFileName: { type: String, default: '' },
    score: { type: Number, default: 0 },
    negativeMarkApplied: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    rejectedReason: { type: String, default: '' },
    reviewNotes: { type: String, default: '' }
  },
  { timestamps: true }
);

MonthTaskSubmissionSchema.index({ student: 1, task: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('MonthTaskSubmission', MonthTaskSubmissionSchema);
