/* ============================================================
   ELITE CLASS — APP ROUTER & SHELL v3
   ============================================================ */
window.EC = window.EC || {};

EC.triggerEnterAction = function(target) {
  if (!target) return false;
  if (target.closest('[contenteditable="true"]')) return false;

  const tagName = target.tagName?.toLowerCase() || '';
  const inputType = (target.type || '').toLowerCase();
  const placeholder = (target.getAttribute('placeholder') || '').toLowerCase();
  const fieldId = (target.id || '').toLowerCase();

  if (tagName === 'textarea' && !target.dataset.enterSubmit) return false;
  if (inputType === 'file') return false;
  if (
    inputType === 'search' ||
    fieldId.includes('search') ||
    placeholder.includes('search')
  ) {
    return false;
  }

  const scopes = [
    target.closest('.overlay.open .modal'),
    target.closest('.modal'),
    target.closest('.card'),
    target.closest('.auth-creds'),
    document.getElementById('page-content-area')
  ].filter(Boolean);

  const isVisible = (el) => Boolean(el && el.offsetParent !== null && !el.disabled);
  const selectors = [
    '[data-enter-submit="true"]',
    '.modal-footer .btn.btn-accent',
    '.modal-footer .btn.btn-primary',
    '.btn.btn-accent',
    '.btn.btn-primary',
    '.auth-submit'
  ];

  for (const scope of scopes) {
    for (const selector of selectors) {
      const button = scope.querySelector(selector);
      if (isVisible(button)) {
        button.click();
        return true;
      }
    }
  }

  return false;
};

EC.app = {
  teacherNav: [
    {section:'Main'},
    {id:'dashboard',     icon:'📊', label:'Dashboard'},
    {id:'tasks',         icon:'📋', label:'Task Manager'},
    {id:'month-tasks',   icon:'🗓️', label:'Month Tasks'},
    {id:'gradebook',     icon:'📒', label:'Gradebook'},
    {id:'students',      icon:'👥', label:'Student Profiles'},
    {id:'leaderboard',   icon:'🏅', label:'Leaderboard'},
    {section:'Engagement'},
    {id:'announcements', icon:'📢', label:'Announcements'},
    {id:'attendance',    icon:'✅', label:'Attendance'},
    {id:'leave-od',      icon:'📋', label:'Leave / OD'},
    {id:'explanations',  icon:'💬', label:'Explanations'},
    {id:'poll',          icon:'📊', label:'Polls'},
    {id:'squads',        icon:'⚔️', label:'Squad Manager'},
    {id:'chat',          icon:'💬', label:'Class Chat'},
    {section:'Manage'},
    {id:'schedule',      icon:'📅', label:'Schedule Manager'},
    {id:'resources',     icon:'📚', label:'Resources Manager'},
    {id:'bookmarks',     icon:'🔖', label:'Saved Items'},
    {id:'export',        icon:'📤', label:'Export Reports'},
  ],
  studentNav: [
    {section:'Main'},
    {id:'dashboard',     icon:'🏠', label:'Dashboard'},
    {id:'tasks',         icon:'📋', label:'My Tasks'},
    {id:'month-tasks',   icon:'🗓️', label:'Month Tasks'},
    {id:'leaderboard',   icon:'🏅', label:'Leaderboard'},
    {id:'profile',       icon:'🎯', label:'My Profile'},
    {id:'poll',          icon:'📊', label:'Polls'},
    {section:'Class'},
    {id:'announcements', icon:'📢', label:'Announcements'},
    {id:'attendance',    icon:'✅', label:'Attendance'},
    {id:'leave-od',      icon:'📋', label:'Leave / OD'},
    {id:'chat',          icon:'💬', label:'Chat'},
    {id:'schedule',      icon:'📅', label:'Schedule'},
    {id:'resources',     icon:'📚', label:'Resources'},
    {id:'bookmarks',     icon:'🔖', label:'Saved Items'},
  ],

  init() {
    if (!EC.app._enterShortcutBound) {
      document.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
        if (!EC.triggerEnterAction(event.target)) return;
        event.preventDefault();
      });
      EC.app._enterShortcutBound = true;
    }

    if (EC.auth.init()) {
      EC.app.launch();
    }
  },

  bookmarkStorageKey() {
    return `ec_bookmarks_${EC.state.currentRole || 'guest'}_${EC.state.myId || 'anon'}`;
  },

  loadBookmarks() {
    try {
      const raw = localStorage.getItem(EC.app.bookmarkStorageKey());
      EC.state.bookmarks = raw ? JSON.parse(raw) : [];
    } catch (error) {
      EC.state.bookmarks = [];
    }
  },

  persistBookmarks() {
    localStorage.setItem(EC.app.bookmarkStorageKey(), JSON.stringify(EC.state.bookmarks || []));
  },

  async launch() {
    // Hide auth container
    const auth = document.getElementById('auth-container');
    if (auth) auth.style.display = 'none';
    document.getElementById('app').classList.add('visible');
    await EC.api.bootstrap();
    EC.app.buildShell();
    EC.app.navigate('dashboard');
    EC.checkDeadlines();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').then(registration => {
        registration.update().catch(() => {});
      }).catch(() => {});
    }
  },

  buildShell() {
    const role   = EC.state.currentRole;
    const user   = EC.state.currentUser;
    const nav    = role === 'teacher' ? EC.app.teacherNav : EC.app.studentNav;
    const xpInfo = EC.xpToNextLevel(EC.state.myXp || 0);

    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    sidebar.innerHTML = `
      <div class="sidebar-brand">
        <div class="brand-icon"><img src="assets/logo.svg" alt="Elite Class" onerror="this.parentElement.innerHTML='👑'"></div>
        <div class="brand-text">
          <div class="brand-name">Elite Class</div>
          <div class="brand-role">${role === 'teacher' ? 'Teacher Portal' : 'Student Portal'}</div>
        </div>
      </div>
      <div class="sidebar-user" onclick="EC.navigate(EC.state.currentRole==='teacher'?'students':'profile')">
        <div class="avatar avatar-sm avatar-ring" style="background:${role === 'teacher' ? '#1a3a8f' : EC.getStudent(EC.state.myId || 1)?.color || '#1a3a8f'};${user?.profileImageUrl ? `background-image:url('${user.profileImageUrl}');background-size:cover;background-position:center;color:transparent;` : ''}">${(user?.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</div>
        <div class="user-info">
          <div class="user-name">${user?.name || 'User'}</div>
          ${role === 'student' ? `<div class="user-level">⭐ ${EC.state.myLevel || 'Rookie'} • #${EC.state.myRank || '?'}</div>` : `<div class="user-level">👩‍🏫 Teacher</div>`}
        </div>
      </div>
      ${role === 'student' ? `<div class="sidebar-xp-mini"><div class="xp-mini-label"><span>XP</span><span>${EC.state.myXp}</span></div><div class="xp-mini-track"><div class="xp-mini-fill" style="width:${xpInfo.pct}%"></div></div></div>` : ''}
      <nav class="sidebar-nav" id="sidebar-nav">
        ${nav.map(item => {
          if (item.section) return `<div class="nav-section">${item.section}</div>`;
          return `<div class="nav-item" id="nav-${item.id}" onclick="EC.navigate('${item.id}')">
            <span class="nav-icon">${item.icon}</span>
            <span>${item.label}</span>
            ${item.badge ? `<span class="nav-badge ${item.badgeRed ? 'red' : ''}">${item.badge}</span>` : ''}
          </div>`;
        }).join('')}
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-footer-actions">
          <button class="sidebar-footer-btn" id="pwa-install-btn" onclick="EC.app.promptInstall()" title="Install App" style="display:none">📲 Install App</button>
          <button class="sidebar-footer-btn" onclick="EC.app.toggleSound()" id="sound-btn">${EC.state.soundEnabled ? '🔊' : '🔇'} Sound</button>
          <button class="sidebar-footer-btn danger" onclick="EC.auth.logout()">🚪 Logout</button>
        </div>
      </div>
    `;

    const titleEl = document.getElementById('topbar-title');
    if (titleEl) titleEl.innerHTML = 'Elite <span>Class</span>';

    const backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) backdrop.addEventListener('click', EC.app.closeSidebar);

    // PWA install
    EC.app._deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      EC.app._deferredPrompt = e;
      const btn = document.getElementById('pwa-install-btn');
      if (btn) btn.style.display = '';
    });
  },

  promptInstall() {
    if (EC.app._deferredPrompt) {
      EC.app._deferredPrompt.prompt();
      EC.app._deferredPrompt.userChoice.then(() => { EC.app._deferredPrompt = null; });
    } else {
      EC.toast('Use browser menu -> "Add to Home Screen" to install', 'default', 4000);
    }
  },

  navigate(pageId) {
    if (pageId !== 'chat') EC.chat?.stopPolling?.();
    EC.state.currentPage = pageId;

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const navEl = document.getElementById(`nav-${pageId}`);
    if (navEl) navEl.classList.add('active');

    const role = EC.state.currentRole;
    const nav  = role === 'teacher' ? EC.app.teacherNav : EC.app.studentNav;
    const item = nav.find(n => n.id === pageId);
    const titleEl = document.getElementById('topbar-title');
    if (titleEl && item) titleEl.innerHTML = `${item.icon} <span>${item.label}</span>`;

    const content = document.getElementById('page-content-area');
    if (!content) return;
    content.scrollTop = 0;
    EC.sound?.click?.();
    EC.app.closeSidebar();

    if (role === 'teacher') {
      switch (pageId) {
        case 'dashboard':     EC.teacherDashboard.render(content); break;
        case 'tasks':         EC.teacherTasks.render(content); break;
        case 'month-tasks':   EC.teacherMonthTasks.render(content); break;
        case 'gradebook':     EC.teacherGradebook.render(content); break;
        case 'students':      EC.teacherStudents.render(content); break;
        case 'leaderboard':   EC.teacherLeaderboard.render(content); break;
        case 'announcements': EC.teacherAnnouncements.render(content); break;
        case 'attendance':    EC.teacherAttendance.render(content); break;
        case 'leave-od':      EC.teacherLeave.render(content); break;
        case 'explanations':  EC.teacherExplanations.render(content); break;
        case 'poll':          EC.teacherPoll.render(content); break;
        case 'squads':        EC.teacherSquad.render(content); break;
        case 'chat':          EC.app.renderChat(content); break;
        case 'schedule':      EC.teacherSchedule.render(content); break;
        case 'resources':     EC.teacherResources.render(content); break;
        case 'bookmarks':     EC.app.renderBookmarks(content); break;
        case 'export':        EC.teacherExport.render(content); break;
        default:              EC.teacherDashboard.render(content);
      }
    } else {
      switch (pageId) {
        case 'dashboard':     EC.studentDashboard.render(content); break;
        case 'tasks':         EC.studentTasks.render(content); break;
        case 'month-tasks':   EC.studentMonthTasks.render(content); break;
        case 'leaderboard':   EC.studentLeaderboard.render(content); break;
        case 'profile':       EC.studentProfile.render(content); break;
        case 'announcements': EC.studentAnnouncements.render(content); break;
        case 'attendance':    EC.studentAttendance.render(content); break;
        case 'leave-od':      EC.studentLeave.render(content); break;
        case 'poll':          EC.studentPoll.render(content); break;
        case 'chat':          EC.app.renderChat(content); break;
        case 'schedule':      EC.studentSchedule.render(content); break;
        case 'resources':     EC.studentResources.render(content); break;
        case 'bookmarks':     EC.app.renderBookmarks(content); break;
        default:              EC.studentDashboard.render(content);
      }
    }
  },

  renderChat(el) {
    el.innerHTML = `
      <div class="page-header"><div><h2 class="page-title">💬 Class Chat</h2><p class="page-subtitle">Real-time class discussion</p></div></div>
      <div class="card animate-in" style="height:calc(100vh - 200px);overflow:hidden;display:flex;flex-direction:column">
        <div style="flex:1;overflow:hidden" id="main-chat-area"></div>
      </div>
    `;
    EC.chat.render(document.getElementById('main-chat-area'), 'class');
  },

  renderBookmarks(el) {
    if (!EC.state.bookmarks) EC.state.bookmarks = [];
    const grouped = {
      task: EC.state.bookmarks.filter(b => b.type === 'task'),
      announcement: EC.state.bookmarks.filter(b => b.type === 'announcement'),
      resource: EC.state.bookmarks.filter(b => b.type === 'resource'),
    };
    const labels = { task: 'Tasks', announcement: 'Announcements', resource: 'Resources' };

    el.innerHTML = `
      <div class="page-header">
        <div><h2 class="page-title">Saved Items</h2><p class="page-subtitle">Your bookmarked tasks, announcements and resources</p></div>
      </div>
      ${EC.state.bookmarks.length === 0
        ? `<div class="card animate-in" style="text-align:center;padding:56px 24px">
             <div style="font-size:32px;margin-bottom:16px;font-weight:700">🔖</div>
             <div style="font-family:'Playfair Display',serif;font-size:20px;font-weight:700;margin-bottom:8px">No bookmarks yet</div>
             <div style="color:var(--text-muted);font-size:14px">Use the bookmark icon on any task, resource, or announcement to keep it here.</div>
           </div>`
        : Object.entries(grouped).map(([type, items]) => items.length === 0 ? '' : `
            <div class="card mb-16 animate-in">
              <div style="padding:14px 20px;border-bottom:1px solid var(--border);font-weight:700;font-size:15px">${labels[type]}</div>
              ${items.map(b => `
                <div style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--border-soft)">
                  <span style="font-size:14px;font-weight:700;min-width:40px">${b.icon || 'ITEM'}</span>
                  <div style="flex:1;font-weight:500;font-size:14px">${b.title}</div>
                  <button class="btn btn-outline btn-sm" type="button" data-bookmark-action="open" data-bookmark-id="${String(b.id)}" data-bookmark-type="${b.type}" data-bookmark-ref="${b.ref || ''}">Open</button>
                  <button class="btn btn-ghost btn-sm" type="button" style="color:var(--danger);font-size:16px;padding:4px 8px" title="Remove bookmark" data-bookmark-action="remove" data-bookmark-id="${String(b.id)}" data-bookmark-type="${b.type}">🔖</button>
                </div>
              `).join('')}
            </div>
          `).join('')
      }
    `;

    EC.app.bindBookmarkActions(el);
  },

  bindBookmarkActions(root) {
    if (!root || root.dataset.bookmarkBound === 'true') return;

    root.addEventListener('click', (event) => {
      const button = event.target.closest('[data-bookmark-action]');
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();

      const action = button.getAttribute('data-bookmark-action');
      const id = button.getAttribute('data-bookmark-id');
      const type = button.getAttribute('data-bookmark-type');
      const ref = button.getAttribute('data-bookmark-ref') || '';

      if (action === 'open') EC.app.openBookmark(id, type, ref);
      if (action === 'remove') EC.app.removeBookmark(id, type);
    });

    root.dataset.bookmarkBound = 'true';
  },

  addBookmark(item) {
    if (!EC.state.bookmarks) EC.state.bookmarks = [];
    const normalizedItem = { ...item, id: String(item.id) };
    const exists = EC.state.bookmarks.find(b => String(b.id) === normalizedItem.id && b.type === normalizedItem.type);
    if (exists) { EC.toast('Already bookmarked', 'default', 1500); return; }
    EC.state.bookmarks.push(normalizedItem);
    EC.app.persistBookmarks();
    EC.toast('Bookmarked 🔖', 'success', 1800);
  },

  removeBookmark(id, type) {
    EC.state.bookmarks = EC.state.bookmarks.filter(b => !(String(b.id) === String(id) && b.type === type));
    EC.app.persistBookmarks();
    EC.app.renderBookmarks(document.getElementById('page-content-area'));
    EC.toast('Bookmark removed', 'default', 1500);
  },

  openBookmark(id, type, ref) {
    const bookmark = (EC.state.bookmarks || []).find(b => String(b.id) === String(id) && b.type === type);
    if (!bookmark) {
      EC.toast('Saved item not found', 'warning');
      return;
    }

    if (type === 'task') {
      EC.navigate(ref || 'tasks');
      setTimeout(() => {
        if (EC.state.currentRole === 'teacher' && EC.teacherTasks?.openTaskDetail) {
          EC.teacherTasks.openTaskDetail(String(id));
          return;
        }
        if (EC.studentTasks?.open) EC.studentTasks.open(String(id));
      }, 120);
      return;
    }

    if (type === 'resource') {
      EC.navigate(ref || 'resources');
      const resource = (EC.state.resources || []).find(entry => String(entry.id) === String(id));
      if (!resource) {
        EC.toast('Resource not found', 'warning');
        return;
      }
      setTimeout(() => {
        if (EC.state.currentRole === 'teacher' && EC.teacherResources?.open) {
          EC.teacherResources.open(resource);
          return;
        }
        if (EC.studentResources?.open) EC.studentResources.open(resource);
      }, 120);
      return;
    }

    EC.navigate(ref || 'announcements');
  },

  updateNavBadges() {
    const pending = EC.state.leaveRequests.filter(r => r.status === 'pending').length;
    const leaveEl = document.getElementById('nav-leave-od');
    if (leaveEl) {
      let badge = leaveEl.querySelector('.nav-badge');
      if (!badge) { badge = document.createElement('span'); badge.className = 'nav-badge red'; leaveEl.appendChild(badge); }
      badge.textContent = pending;
      badge.style.display = pending > 0 ? '' : 'none';
    }
  },

  toggleSound() {
    EC.state.soundEnabled = !EC.state.soundEnabled;
    const btn = document.getElementById('sound-btn');
    if (btn) btn.innerHTML = `${EC.state.soundEnabled ? '🔊' : '🔇'} Sound`;
    EC.toast(EC.state.soundEnabled ? '🔊 Sound on' : '🔇 Sound off', 'default', 1500);
  },

  openSidebar() {
    document.getElementById('sidebar')?.classList.add('open');
    document.getElementById('sidebar-backdrop')?.classList.add('show');
  },
  closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-backdrop')?.classList.remove('show');
  },
};

EC.navigate = page => EC.app.navigate(page);

EC.teacherLeaderboard = {
  render(el) {
    const students = EC.state.students;
    el.innerHTML = `
      <div class="page-header"><div><h2 class="page-title">🏅 Leaderboard</h2><p class="page-subtitle">Full class rankings and performance</p></div></div>
      <div class="tabs">
        <button class="tab-btn active" onclick="EC.teacherLeaderboard.tab(this,'alltime')">🏆 All-Time</button>
        <button class="tab-btn" onclick="EC.teacherLeaderboard.tab(this,'weekly')">📅 This Week</button>
        <button class="tab-btn" onclick="EC.teacherLeaderboard.tab(this,'squads')">👥 Squads</button>
      </div>
      <div id="tlb-view" class="animate-in"></div>
    `;
    EC.teacherLeaderboard.renderAllTime();
  },
  renderAllTime() {
    const students = EC.state.students;
    const el = document.getElementById('tlb-view');
    if (!el) return;
    el.innerHTML = `
      <div class="two-col-wide">
        <div class="card">
          <div class="card-header"><div class="card-title">All-Time Rankings</div></div>
          <div class="card-body">${students.map(st => EC.gamification.renderLbRow(st, null)).join('')}</div>
        </div>
        <div>
          <div class="card">
            <div class="card-header"><div class="card-title">Class Summary</div></div>
            <div class="card-body">
              ${[['Total XP (class)','XP', students.reduce((a,s)=>a+s.xp,0).toLocaleString()],
                 ['Avg Attendance','AT', Math.round(students.reduce((a,s)=>a+s.attendance,0)/students.length)+'%'],
                 ['Top Streak','ST', Math.max(...students.map(s=>s.streak))+' days'],
                 ['Tasks Submitted','TS', students.reduce((a,s)=>a+s.tasks,0)]
                ].map(([l,i,v])=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-soft);font-size:14px">${i} ${l}<strong style="color:var(--royal)">${v}</strong></div>`).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  },
  tab(btn, type) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const el = document.getElementById('tlb-view');
    if (!el) return;
    if (type === 'alltime') { EC.teacherLeaderboard.renderAllTime(); return; }
    if (type === 'weekly') {
      const weekly = [...EC.state.students].sort((a, b) => b.streak - a.streak);
      el.innerHTML = `<div class="card animate-in"><div class="card-header"><div class="card-title">📅 Weekly Leaderboard</div><span class="tag status-pending">Resets Monday</span></div><div class="card-body">${weekly.map((st,i) => `<div class="lb-row"><div class="lb-rank ${i<3?'top'+(i+1):''}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)}</div><div class="avatar avatar-sm" style="background:${st.color}">${st.initials}</div><div class="lb-info"><div class="lb-name">${st.name}</div><div class="lb-sub">🔥 ${st.streak}-day streak</div></div><div class="lb-xp">${st.streak*40} XP</div></div>`).join('')}</div></div>`;
    }
    if (type === 'squads') {
      el.innerHTML = `<div class="card animate-in"><div class="card-header"><div class="card-title">👥 Squad Leaderboard</div></div><div class="card-body" id="tlb-squad-lb"></div></div>`;
      EC.gamification.renderSquads(document.getElementById('tlb-squad-lb'));
    }
  }
};
