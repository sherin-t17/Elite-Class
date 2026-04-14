const express = require('express');
const multer = require('multer');
const path = require('path');
const Resource = require('../models/Resource');
const { verifyToken } = require('../middleware/auth');
const { teacherOnly } = require('../middleware/roleCheck');
const { formatSize, uploadBuffer } = require('../utils/fileStorage');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Get all resources
router.get('/', verifyToken, async (req, res) => {
  try {
    const resources = await Resource.find().populate('uploadedBy').sort({ createdAt: -1 });
    res.json({ success: true, data: resources });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id/file', verifyToken, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource?.fileUrl) {
      return res.status(404).json({ success: false, message: 'File not found for this resource.' });
    }

    const asDownload = req.query.download === '1';
    const parsedUrl = new URL(resource.fileUrl);

    if (parsedUrl.pathname.startsWith('/uploads/')) {
      const uploadsRoot = path.join(__dirname, '..', 'uploads');
      const relativePath = decodeURIComponent(parsedUrl.pathname.replace(/^\/uploads\//, ''));
      const filePath = path.normalize(path.join(uploadsRoot, relativePath));

      if (!filePath.startsWith(uploadsRoot)) {
        return res.status(400).json({ success: false, message: 'Invalid file path.' });
      }

      if (asDownload) {
        return res.download(filePath, resource.name || path.basename(filePath));
      }

      return res.sendFile(filePath);
    }

    const upstream = await fetch(resource.fileUrl);
    if (!upstream.ok) {
      return res.status(502).json({ success: false, message: 'Could not fetch the resource file.' });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    const contentType = upstream.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    const safeName = JSON.stringify(resource.name || 'resource');
    res.setHeader('Content-Disposition', `${asDownload ? 'attachment' : 'inline'}; filename=${safeName}`);
    return res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Upload resource
router.post('/', verifyToken, teacherOnly, upload.single('file'), async (req, res) => {
  try {
    const { name, type, cat } = req.body;

    let fileUrl = null;
    let size = null;

    if (req.file) {
      const result = await uploadBuffer(req, req.file, 'resources');
      fileUrl = result.secure_url;
      size = formatSize(req.file.size);
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
});

// Delete resource
router.delete('/:id', verifyToken, teacherOnly, async (req, res) => {
  try {
    await Resource.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Resource deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
