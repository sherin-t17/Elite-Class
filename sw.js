/* ============================================================
   ELITE CLASS — SERVICE WORKER (PWA Offline Cache)
   ============================================================ */
const CACHE_NAME = 'elite-class-v5';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/variables.css',
  '/css/global.css',
  '/css/layout.css',
  '/css/animations.css',
  '/css/gamification.css',
  '/css/mobile.css',
  '/js/state.js',
  '/js/api.js',
  '/js/auth.js',
  '/js/app.js',
  '/js/shared/animations.js',
  '/js/shared/sound.js',
  '/js/shared/gamification.js',
  '/js/shared/notifications.js',
  '/js/shared/upload.js',
  '/js/shared/chat.js',
  '/js/teacher/dashboard.js',
  '/js/teacher/tasks.js',
  '/js/teacher/gradebook.js',
  '/js/teacher/attendance.js',
  '/js/teacher/leave-od.js',
  '/js/teacher/students.js',
  '/js/teacher/poll.js',
  '/js/teacher/announcements.js',
  '/js/teacher/squad.js',
  '/js/teacher/export.js',
  '/js/teacher/schedule.js',
  '/js/teacher/resources.js',
  '/js/student/dashboard.js',
  '/js/student/tasks.js',
  '/js/student/profile.js',
  '/js/student/leaderboard.js',
  '/js/student/attendance.js',
  '/js/student/leave-od.js',
  '/js/student/poll.js',
  '/js/student/schedule.js',
  '/js/student/announcements.js',
  '/assets/logo.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // Never cache API calls

  const isAppShellAsset =
    e.request.mode === 'navigate' ||
    /\.(?:css|js|html|json|svg)$/i.test(url.pathname) ||
    url.pathname === '/' ||
    url.pathname === '/manifest.json';

  // Always try network first for app shell assets so refresh loads the latest code.
  if (isAppShellAsset) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then(cached => cached || caches.match('/index.html')))
    );
    return;
  }

  // For non-shell requests, prefer cache-first with a network update fallback.
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request)
        .then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
