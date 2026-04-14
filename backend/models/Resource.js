const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ['PDF', 'Excel', 'PPT', 'Image', 'Video', 'Audio'] },
    cat: String,
    fileUrl: String,
    size: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Resource', ResourceSchema);