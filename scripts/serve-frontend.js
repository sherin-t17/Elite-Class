const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_INDEX = path.join(ROOT_DIR, 'frontend', 'index.html');
const DEFAULT_PORT = Number(process.env.FRONTEND_PORT || 5500);

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
  const normalizedPath = path.normalize(cleanPath).replace(/^([/\\])+/, '');
  return path.join(ROOT_DIR, normalizedPath);
}

function isPathInsideRoot(targetPath) {
  const relativePath = path.relative(ROOT_DIR, targetPath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

const server = http.createServer((req, res) => {
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
});

server.listen(DEFAULT_PORT, '127.0.0.1', () => {
  console.log(`Elite Class frontend running on http://127.0.0.1:${DEFAULT_PORT}/frontend/`);
});
