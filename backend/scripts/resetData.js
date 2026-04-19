const mongoose = require('mongoose');
require('dotenv').config();

const Announcement = require('../models/Announcement');
const Attendance = require('../models/Attendance');
const Badge = require('../models/Badge');
const ChatMessage = require('../models/ChatMessage');
const LeaveRequest = require('../models/LeaveRequest');
const MonthTask = require('../models/MonthTask');
const MonthTaskBatch = require('../models/MonthTaskBatch');
const MonthTaskDailyTopper = require('../models/MonthTaskDailyTopper');
const MonthTaskStat = require('../models/MonthTaskStat');
const MonthTaskSubmission = require('../models/MonthTaskSubmission');
const MonthTaskWarning = require('../models/MonthTaskWarning');
const Poll = require('../models/Poll');
const Resource = require('../models/Resource');
const Season = require('../models/Season');
const Squad = require('../models/Squad');
const Submission = require('../models/Submission');
const Task = require('../models/Task');
const User = require('../models/User');
const WorkbookSheet = require('../models/WorkbookSheet');

async function resetData() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });

  const collections = [
    Announcement,
    Attendance,
    Badge,
    ChatMessage,
    LeaveRequest,
    MonthTask,
    MonthTaskBatch,
    MonthTaskDailyTopper,
    MonthTaskStat,
    MonthTaskSubmission,
    MonthTaskWarning,
    Poll,
    Resource,
    Season,
    Squad,
    Submission,
    Task,
    User,
    WorkbookSheet
  ];

  for (const Model of collections) {
    await Model.deleteMany({});
    console.log(`Cleared ${Model.modelName}`);
  }

  await mongoose.disconnect();
  console.log('Database reset complete.');
}

resetData().catch((error) => {
  console.error('Failed to reset data:', error.message);
  process.exit(1);
});
