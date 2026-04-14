const mongoose = require('mongoose');

const DEFAULT_URI = 'mongodb://localhost:27017/eliteclass';
const FAST_RETRY_MS = 10_000;
const SLOW_RETRY_MS = 30_000;

let retryTimer = null;
let isConnecting = false;

function getMongoUri() {
  return (process.env.MONGODB_URI || '').trim() || DEFAULT_URI;
}

function getCredentialIssue(uri) {
  const credentialsMatch = uri.match(/^mongodb(?:\+srv)?:\/\/([^@]+)@/i);

  if (!credentialsMatch) {
    return null;
  }

  const credentials = credentialsMatch[1];

  if (!credentials.includes(':')) {
    return 'MongoDB URI contains a username but no password. Use "mongodb+srv://USERNAME:PASSWORD@..." or "mongodb://USERNAME:PASSWORD@...".';
  }

  const [, password = ''] = credentials.split(':');

  if (!password) {
    return 'MongoDB URI contains an empty password. Add the Atlas database user password to MONGODB_URI.';
  }

  if (/^(YOUR_ATLAS_DB_PASSWORD|<PASSWORD>|password)$/i.test(password)) {
    return 'MongoDB URI is still using a placeholder password. Replace it with the real Atlas database user password.';
  }

  return null;
}

function clearRetryTimer() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function scheduleReconnect(delayMs, reason) {
  if (retryTimer || isConnecting || mongoose.connection.readyState === 1) {
    return;
  }

  if (reason) {
    console.warn(reason);
  }

  console.warn(`    Server will keep running. Retrying in ${Math.round(delayMs / 1000)} seconds...`);

  retryTimer = setTimeout(() => {
    retryTimer = null;
    connectDB();
  }, delayMs);
}

async function connectDB() {
  const uri = getMongoUri();
  const credentialIssue = getCredentialIssue(uri);

  if (credentialIssue) {
    scheduleReconnect(
      SLOW_RETRY_MS,
      `MongoDB configuration error: ${credentialIssue}`
    );
    return;
  }

  if (isConnecting || mongoose.connection.readyState === 1) {
    return;
  }

  isConnecting = true;

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    clearRetryTimer();

    const { host, name } = mongoose.connection;
    console.log(`MongoDB connected: ${host}/${name}`);
  } catch (err) {
    const isAuthError = /auth/i.test(err.message);
    const retryDelay = isAuthError ? SLOW_RETRY_MS : FAST_RETRY_MS;

    console.warn(`MongoDB connection failed: ${err.message}`);
    scheduleReconnect(retryDelay);
  } finally {
    isConnecting = false;
  }
}

mongoose.connection.on('connected', () => {
  clearRetryTimer();
});

mongoose.connection.on('disconnected', () => {
  scheduleReconnect(FAST_RETRY_MS, 'MongoDB disconnected.');
});

mongoose.connection.on('error', (err) => {
  console.warn(`MongoDB error: ${err.message}`);
});

module.exports = connectDB;
