const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['teacher', 'student'], required: true },

    // Student-only fields
    regNo: String,
    year: String,
    dept: String,
    section: String,
    color: String,
    initials: String,
    heroRole: {
      type: String,
      enum: ['tank', 'fighter', 'mage', 'marksman', 'assassin', 'support', 'guardian', 'sage']
    },

    // Gamification
    xp: { type: Number, default: 0 },
    level: { type: String, default: 'Initiate' },
    rank: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    lastActiveDate: Date,
    tasksCompleted: { type: Number, default: 0 },
    attendance: { type: Number, default: 0 },

    // Badge showcase
    badgeShowcase: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
    unlockedBadges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
    warningBadgeCount: { type: Number, default: 0 },
    teacherFlags: [
      {
        type: { type: String },
        message: String,
        date: { type: Date, default: Date.now }
      }
    ],

    // Profile extras
    motivationQuote: String,
    profileImageUrl: { type: String, default: '' },
    xpLog: [
      {
        amount: Number,
        reason: String,
        date: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (plainPassword) {
  return await bcrypt.compare(plainPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
