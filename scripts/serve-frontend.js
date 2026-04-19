const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const FRONTEND_INDEX = path.join(FRONTEND_DIR, 'index.html');
const DEFAULT_PORT = Number(process.env.FRONTEND_PORT || 5500);
const AUTO_PORT_FALLBACK = String(process.env.FRONTEND_AUTO_PORT_FALLBACK || 'true').toLowerCase() !== 'false';
const MAX_PORT_ATTEMPTS = 10;

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

function toLocalPath(urlPath) {
  if (!urlPath || urlPath === '/') {
    return FRONTEND_INDEX;
  }

  const cleanPath = decodeURIComponent(urlPath.split('?')[0]);
  if (cleanPath === '/frontend' || cleanPath === '/frontend/') {
    return FRONTEND_INDEX;
  }

  if (cleanPath.startsWith('/frontend/')) {
    return path.join(FRONTEND_DIR, path.normalize(cleanPath.slice('/frontend/'.length)));
  }

  if (/^\/(?:css|js|assets)\//.test(cleanPath)) {
    return path.join(FRONTEND_DIR, path.normalize(cleanPath.replace(/^\/+/, '')));
  }

  const normalizedPath = path.normalize(cleanPath).replace(/^([/\\])+/, '');
  return path.join(ROOT_DIR, normalizedPath);
}

function isPathInsideRoot(targetPath) {
  const relativePath = path.relative(ROOT_DIR, targetPath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function requestHandler(req, res) {
  let targetPath = toLocalPath(req.url);

  if (targetPath === path.join(ROOT_DIR, 'frontend')) {
    targetPath = FRONTEND_INDEX;
  }

  if (!isPathInsideRoot(targetPath)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.stat(targetPath, (statError, stats) => {
    if (statError) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const filePath = stats.isDirectory()
      ? path.join(targetPath, 'index.html')
      : targetPath;

    fs.readFile(filePath, (readError, content) => {
      if (readError) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store'
      });
      res.end(content);
    });
  });
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.unref();
    tester.once('error', () => resolve(false));
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, '127.0.0.1');
  });
}

async function startServer(basePort) {
  let selectedPort = basePort;
  let found = await isPortFree(selectedPort);
  let attempts = 0;

  while (!found && AUTO_PORT_FALLBACK && attempts < MAX_PORT_ATTEMPTS) {
    console.warn(`[frontend] Port ${selectedPort} is already in use. Trying ${selectedPort + 1}...`);
    selectedPort += 1;
    attempts += 1;
    found = await isPortFree(selectedPort);
  }

  if (!found) {
    console.error(`[frontend] Port ${selectedPort} is already in use.`);
    console.error('[frontend] Stop the existing process or use FRONTEND_PORT to choose another port.');
    console.error('[frontend] Example: FRONTEND_PORT=5501 npm run dev');
    process.exit(1);
  }

  const server = http.createServer(requestHandler);
  server.on('error', (error) => {
    console.error('[frontend] Server failed to start:', error.message || error);
    process.exit(1);
  });

  server.listen(selectedPort, '127.0.0.1', () => {
    console.log(`Elite Class frontend running on http://127.0.0.1:${selectedPort}/`);
  });
}

startServer(DEFAULT_PORT).catch((error) => {
  console.error('[frontend] Startup failure:', error.message || error);
  process.exit(1);
});
