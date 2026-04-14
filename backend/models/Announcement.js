const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    body: String,
    pinned: { type: Boolean, default: false },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    comments: [
      {
        from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: String,
        parentCommentId: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Announcement', AnnouncementSchema);
