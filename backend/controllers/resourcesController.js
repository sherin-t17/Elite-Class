const cloudinary = require('cloudinary').v2;
const Resource = require('../models/Resource');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.getAll = async (req, res) => {
  try {
    const resources = await Resource.find().populate('uploadedBy').sort({ createdAt: -1 });
    res.json({ success: true, data: resources });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.upload = async (req, res) => {
  try {
    const { name, type, cat } = req.body;

    let fileUrl = null;
    let size = null;

    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { resource_type: 'auto' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });
      fileUrl = result.secure_url;
      size = `${(req.file.size / 1024).toFixed(2)} KB`;
    }

    const resource = new Resource({
      name,
      type,
      cat,
      fileUrl,
      size,
      uploadedBy: req.user.id
    });
    await resource.save();
    await resource.populate('uploadedBy');
    res.status(201).json({ success: true, data: resource });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await Resource.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Resource deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};