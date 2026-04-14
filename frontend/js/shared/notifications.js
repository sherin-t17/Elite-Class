/* ============================================================
   ELITE CLASS — NOTIFICATIONS & TOAST SYSTEM  (Role-aware)
   ============================================================
   • Toast system (unchanged)
   • Bell icon removed — unread dots shown per nav section instead
   • Teacher sees: student messages, leave requests, task submissions
   • Student sees: new tasks, announcements, leave approvals
   ============================================================ */

window.EC = window.EC || {};

/* ─── TOAST ─────────────────────────────────────────────── */
EC.toast = (message, type = 'default', duration = 3500) => {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { default:'ℹ️', success:'✅', danger:'❌', warning:'⚠️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type] || '💬'}</span><span style="flex:1">${message}</span><button style="background:none;border:none;color:rgba(255,255,255,0.5);cursor:pointer;font-size:16px;padding:0 0 0 8px" onclick="this.parentElement.remove()">×</button>`;
  container.appendChild(el);

  if (type === 'success') EC.sound?.notify?.();
  if (type === 'danger')  EC.sound?.error?.();

  setTimeout(() => {
    el.classList.add('fade-out');
    setTimeout(() => el.remove(), 350);
  }, duration);
};

/* ─── ROLE-AWARE UNREAD STATE ────────────────────────────── */
/*
  EC.state.unread is a map of  navId → count  e.g:
    { announcements: 2, tasks: 1, chat: 5, 'leave-od': 1 }

  Teacher unread sources  → chat messages from students, leave requests, task submissions
  Student unread sources  → new tasks posted, new announcements, chat messages, leave status changes

  Counts are derived from live state only.
*/
EC.unread = {
  init() {
    if (!EC.state.unread) EC.state.unread = {};

    const role = EC.state.currentRole;
    if (role === 'teacher') {
      EC.state.unread['leave-od']      = EC.state.leaveRequests?.filter(r => r.status === 'pending').length || 0;
      EC.state.unread['chat']          = EC.state.unread['chat'] ?? 0;
      EC.state.unread['tasks']         = EC.state.tasks?.filter(t => t.status === 'submitted').length || 0;
    } else {
      EC.state.unread['tasks']         = EC.state.tasks?.filter(t => t.status === 'pending').length || 0;
      EC.state.unread['announcements'] = EC.state.announcements?.length || 0;
      EC.state.unread['chat']          = EC.state.unread['chat'] ?? 0;
    }
    EC.unread.render();
  },

  /* Render unread dots/badges on sidebar nav items */
  render() {
    if (!EC.state.unread) return;
    Object.entries(EC.state.unread).forEach(([navId, count]) => {
      const el = document.getElementById(`nav-${navId}`);
      if (!el) return;
      let badge = el.querySelector('.nav-badge.unread-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'nav-badge red unread-badge';
        el.appendChild(badge);
      }
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = '';
      } else {
        badge.style.display = 'none';
      }
    });
  },

  /* Call this when a section is visited to clear its unread dot */
  markRead(navId) {
    if (!EC.state.unread) return;
    EC.state.unread[navId] = 0;
    EC.unread.render();
  },

  /* Increment unread count for a nav item (e.g. when a new event arrives) */
  bump(navId, amount = 1) {
    if (!EC.state.unread) EC.state.unread = {};
    EC.state.unread[navId] = (EC.state.unread[navId] || 0) + amount;
    EC.unread.render();
  },
};

/* ─── AUTO CLEAR UNREAD WHEN NAVIGATING ─────────────────── */
/* Patch EC.navigate to auto-clear unread dot on the visited page */
const _origNavigate = EC.navigate || null;
EC._unreadPatchNavigate = function(pageId) {
  EC.unread.markRead(pageId);
  if (_origNavigate) _origNavigate(pageId);
  else if (EC.app?.navigate) EC.app.navigate(pageId);
};
/* Note: app.js calls EC.navigate = page => EC.app.navigate(page)
   after this file loads (scripts order). We patch after DOMContentLoaded. */
document.addEventListener('DOMContentLoaded', () => {
  if (EC.app?.navigate) {
    const original = EC.app.navigate.bind(EC.app);
    EC.app.navigate = function(pageId) {
      EC.unread?.markRead(pageId);
      original(pageId);
    };
    EC.navigate = page => EC.app.navigate(page);
  }
});

/* ─── 24h DEADLINE REMINDER CHECK ───────────────────────── */
EC.checkDeadlines = () => {
  EC.state.tasks?.forEach(task => {
    if (task.status === 'pending') {
      const due  = new Date(task.due + ', 2025');
      const diff = (due - new Date()) / (1000 * 60 * 60);
      if (diff > 0 && diff <= 24) {
        EC.toast(`⏰ Task "${task.title}" is due in less than 24 hours!`, 'warning', 5000);
      }
    }
  });
};

/* ─── PERFORMANCE ALERTS (Teacher) ──────────────────────── */
EC.getAlertStudents = () => {
  return EC.state.students?.filter(() => {
    const submitted = EC.state.tasks?.filter(t =>
      t.status === 'submitted' || t.status === 'completed'
    ).length || 0;
    return (EC.state.tasks?.length || 0) - submitted >= 3;
  }) || [];
};
