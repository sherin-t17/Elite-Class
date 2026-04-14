require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const { initMonthTaskCron } = require('./cron/monthTasksCron');

const app = express();
const httpServer = http.createServer(app);
const projectRoot = path.resolve(__dirname, '..');
const frontendDir = path.join(projectRoot, 'frontend');
const frontendIndex = path.join(frontendDir, 'index.html');

const allowedOriginPatterns = [
  /^http:\/\/localhost(?::\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/i,
  /^http:\/\/0\.0\.0\.0(?::\d+)?$/i
];

const configuredOrigins = [
  process.env.CLIENT_URL,
  ...(process.env.CORS_ORIGIN || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
];

const corsOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);

  if (configuredOrigins.includes(origin)) {
    return callback(null, true);
  }

  if (allowedOriginPatterns.some(pattern => pattern.test(origin))) {
    return callback(null, true);
  }

  return callback(new Error(`CORS: origin "${origin}" not allowed`));
};

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => {
    const ip = req.ip || req.socket?.remoteAddress || '';
    return (
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip === '::ffff:127.0.0.1' ||
      ip === 'localhost'
    );
  }
}));
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));
app.get('/sw.js', (req, res) => {
  res.sendFile(path.join(projectRoot, 'sw.js'));
});
app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(projectRoot, 'manifest.json'));
});
app.use(express.static(frontendDir));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

function requireDB(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database not available yet. Please try again in a few seconds.'
    });
  }
  next();
}

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime()
  });
});

app.use('/api/auth', requireDB, require('./routes/auth'));
app.use('/api/users', requireDB, require('./routes/users'));
app.use('/api/tasks', requireDB, require('./routes/tasks'));
app.use('/api/attendance', requireDB, require('./routes/attendance'));
app.use('/api/leave', requireDB, require('./routes/leave'));
app.use('/api/announcements', requireDB, require('./routes/announcements'));
app.use('/api/chat', requireDB, require('./routes/chat'));
app.use('/api/polls', requireDB, require('./routes/polls'));
app.use('/api/squads', requireDB, require('./routes/squads'));
app.use('/api/resources', requireDB, require('./routes/resources'));
app.use('/api/leaderboard', requireDB, require('./routes/leaderboard'));
app.use('/api/gradebook', requireDB, require('./routes/gradebook'));
app.use('/api/seasons', requireDB, require('./routes/seasons'));
app.use('/api/export', requireDB, require('./routes/export'));
app.use('/api/month-tasks', requireDB, require('./routes/monthTaskBatches'));
app.use('/api/month-tasks', requireDB, require('./routes/monthTaskSubmissions'));
app.use('/api/month-tasks', requireDB, require('./routes/monthTaskWarnings'));
app.use('/api/month-tasks', requireDB, require('./routes/monthTaskInsights'));

require('./socket/chat')(io);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  return res.sendFile(frontendIndex);
});

connectDB();
initMonthTaskCron();

const PORT = process.env.PORT || 5050;
httpServer.listen(PORT, () => {
  console.log(`Elite Class backend running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = { app, io };
