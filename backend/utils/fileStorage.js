const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;

const PLACEHOLDER_VALUES = new Set([
  '',
  'your_cloudinary_name',
  'your_api_key',
  'your_api_secret'
]);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

function hasCloudinaryConfig() {
  return ![
    process.env.CLOUDINARY_CLOUD_NAME,
    process.env.CLOUDINARY_API_KEY,
    process.env.CLOUDINARY_API_SECRET
  ].some(value => PLACEHOLDER_VALUES.has(String(value || '').trim()));
}

function sanitizeFileName(fileName = 'file') {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'file';

  return `${base}${ext.toLowerCase()}`;
}

function formatSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function saveFileLocally(req, file, folder = 'general') {
  const safeFolder = String(folder || 'general').replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
  const uploadDir = path.join(__dirname, '..', 'uploads', safeFolder);
  await fs.mkdir(uploadDir, { recursive: true });

  const fileName = `${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(file.originalname)}`;
  const fullPath = path.join(uploadDir, fileName);
  await fs.writeFile(fullPath, file.buffer);

  return {
    secure_url: `${req.protocol}://${req.get('host')}/uploads/${safeFolder}/${fileName}`,
    bytes: file.size
  };
}

async function uploadBuffer(req, file, folder = 'elite-class') {
  if (!file) return null;

  if (hasCloudinaryConfig()) {
    try {
      return await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { resource_type: 'auto', folder },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(file.buffer);
      });
    } catch (error) {
      console.warn(`[FileStorage] Cloudinary upload failed for "${folder}", falling back to local storage: ${error.message}`);
    }
  }

  return await saveFileLocally(req, file, folder);
}

async function uploadFile(req, file, folder = 'elite-class') {
  if (!file || !file.path) return null;

  if (hasCloudinaryConfig()) {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        resource_type: 'auto',
        folder
      });
      // Cleanup temp file
      await fs.unlink(file.path).catch(() => {});
      return result;
    } catch (error) {
      console.warn(`[FileStorage] Cloudinary upload failed for "${folder}", falling back to local storage: ${error.message}`);
    }
  }

  // Fallback to local uploads directory
  const safeFolder = String(folder || 'general').replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
  const uploadDir = path.join(__dirname, '..', 'uploads', safeFolder);
  await fs.mkdir(uploadDir, { recursive: true });

  const fileName = `${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(file.originalname)}`;
  const fullPath = path.join(uploadDir, fileName);
  
  await fs.rename(file.path, fullPath);

  return {
    secure_url: `${req.protocol}://${req.get('host')}/uploads/${safeFolder}/${fileName}`,
    bytes: file.size
  };
}

module.exports = {
  formatSize,
  hasCloudinaryConfig,
  uploadBuffer,
  uploadFile
};
