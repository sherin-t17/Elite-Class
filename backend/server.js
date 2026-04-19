require('dotenv').config();

const express = require('express');
const http = require('http');
const net = require('net');
const path = require('path');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const { initMonthTaskCron } = require('./cron/monthTasksCron');
const { verifyToken } = require('./middleware/auth');

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
app.use(compression());
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
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

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
app.get('/api/check-updates', requireDB, verifyToken, async (req, res) => {
  try {
    const lastSync = new Date(parseInt(req.query.since) || 0);
    const [tasks, students, announcements, leaveRequests] = await Promise.all([
      mongoose.model('Task').countDocuments({ updatedAt: { $gt: lastSync } }),
      mongoose.model('User').countDocuments({ role: 'student', updatedAt: { $gt: lastSync } }),
      mongoose.model('Announcement').countDocuments({ updatedAt: { $gt: lastSync } }),
      mongoose.model('LeaveRequest').countDocuments({ updatedAt: { $gt: lastSync } })
    ]);
    res.json({
      success: true,
      hasUpdates: (tasks + students + announcements + leaveRequests) > 0,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.use('/api/users', requireDB, require('./routes/users'));
app.use('/api/tasks', requireDB, require('./routes/tasks'));
app.use('/api/attendance', requireDB, require('./routes/attendance'));
app.use('/api/leave', requireDB, require('./routes/leave'));
app.use('/api/announcements', requireDB, require('./routes/announcements'));
app.use('/api/chat', requireDB, require('./routes/chat'));
app.use('/api/polls', requireDB, require('./routes/polls'));
app.use('/api/resources', requireDB, require('./routes/resources'));
app.use('/api/leaderboard', requireDB, require('./routes/leaderboard'));
app.use('/api/gradebook', requireDB, require('./routes/gradebook'));
app.use('/api/seasons', requireDB, require('./routes/seasons'));
app.use('/api/export', requireDB, require('./routes/export'));
app.use('/api/month-tasks', requireDB, require('./routes/monthTaskBatches'));
app.use('/api/month-tasks', requireDB, require('./routes/monthTaskSubmissions'));
app.use('/api/month-tasks', requireDB, require('./routes/monthTaskWarnings'));
app.use('/api/month-tasks', requireDB, require('./routes/monthTaskInsights'));
app.use('/api/excel', requireDB, require('./routes/excel'));

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

const BASE_PORT = Number(process.env.PORT || 5050);
const AUTO_PORT_FALLBACK = String(process.env.AUTO_PORT_FALLBACK || 'true').toLowerCase() !== 'false';
const MAX_PORT_ATTEMPTS = 10;

function isPortFree(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.unref();
    tester.once('error', () => resolve(false));
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, '0.0.0.0');
  });
}

async function startServer(basePort) {
  let selectedPort = basePort;
  let found = await isPortFree(selectedPort);
  let attempts = 0;

  while (!found && AUTO_PORT_FALLBACK && attempts < MAX_PORT_ATTEMPTS) {
    console.warn(`Port ${selectedPort} is already in use. Trying ${selectedPort + 1}...`);
    selectedPort += 1;
    attempts += 1;
    found = await isPortFree(selectedPort);
  }

  if (!found) {
    console.error(`Port ${selectedPort} is already in use.`);
    console.error('Stop the existing process using that port, or start this server with a different PORT.');
    console.error('Examples: `Stop-Process -Id <PID>` or `PORT=5051 npm run dev`.');
    process.exit(1);
  }

  httpServer.on('error', (error) => {
    console.error('Server failed to start:', error);
    process.exit(1);
  });

  httpServer.listen(selectedPort, '0.0.0.0', () => {
    console.log(`Elite Class backend running on http://localhost:${selectedPort}`);
    console.log(`Health check: http://localhost:${selectedPort}/health`);
  });
}

startServer(BASE_PORT).catch((error) => {
  console.error('Startup failure:', error);
  process.exit(1);
});

module.exports = { app, io };
