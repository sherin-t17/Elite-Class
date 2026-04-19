const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    desc: String,
    diff: { type: String, enum: ['easy', 'medium', 'hard'] },
    cat: String,
    xp: Number,
    due: Date,
    priority: { type: Boolean, default: false },
    attachmentUrl: { type: String, default: '' },
    attachmentName: { type: String, default: '' },
    answerMode: {
      type: String,
      enum: ['file', 'link', 'text', 'choice', 'mixed', 'done'],
      default: 'file'
    },
    choicePrompt: { type: String, default: '' },
    isChoice: { type: Boolean, default: false },
    choices: [
      {
        id: Number,
        name: String,
        takenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
      }
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    totalStudents: Number
  },
  { timestamps: true }
);

TaskSchema.index({ createdBy: 1 });
TaskSchema.index({ due: -1 });

module.exports = mongoose.model('Task', TaskSchema);
