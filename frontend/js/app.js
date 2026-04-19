/* ============================================================
   ELITE CLASS - APP ROUTER & SHELL v3
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

EC.notifications = {
  pollTimer: null,
  initialized: false,

  storageKey() {
    return `ec_notifications_${EC.state.currentRole || 'guest'}_${EC.state.myId || 'anon'}`;
  },

  loadSeen() {
    if (this.initialized) return EC.state.notifications.seen || {};
    try {
      const raw = localStorage.getItem(this.storageKey());
      EC.state.notifications.seen = raw ? JSON.parse(raw) : {};
    } catch (error) {
      EC.state.notifications.seen = {};
    }
    this.initialized = true;
    return EC.state.notifications.seen;
  },

  persistSeen() {
    localStorage.setItem(this.storageKey(), JSON.stringify(EC.state.notifications.seen || {}));
  },

  trackedPages() {
    const nav = EC.state.currentRole === 'teacher' ? EC.app.teacherNav : EC.app.studentNav;
    return nav.filter(item => item && item.id).map(item => item.id);
  },

  entryCopies(count, buildKey) {
    return Array.from({ length: Math.max(0, Number(count || 0)) }, (_, index) => buildKey(index));
  },

  sectionEntries(sectionId) {
    const myId = String(EC.state.currentUser?.id || '');
    const role = EC.state.currentRole;

    switch (sectionId) {
      case 'tasks':
        if (role === 'teacher') {
          return (EC.state.tasks || []).flatMap(task =>
            this.entryCopies(task.pendingGradingCount, index => `task:${task.id}:pending:${task.updatedAt || ''}:${index}`)
          );
        }
        return (EC.state.tasks || []).map(task => `task:${task.id}:${task.status}:${task.updatedAt || task.dueRaw || ''}`);
      case 'month-tasks':
        return [
          ...(EC.state.monthTaskBatches || []).map(batch => `batch:${batch.id}:${batch.updatedAt || ''}`),
          ...(EC.state.monthTaskWarnings || []).map(warning => `warning:${warning.id}:${warning.teacherAction}:${warning.actionedAt || warning.submittedAt || warning.triggeredAt || ''}`)
        ];
      case 'gradebook':
        return (EC.state.tasks || []).flatMap(task =>
          this.entryCopies(task.pendingGradingCount, index => `gradebook:${task.id}:${task.updatedAt || ''}:${index}`)
        );
      case 'review':
        return (EC.state.tasks || []).flatMap(task =>
          this.entryCopies(task.pendingGradingCount, index => `review:${task.id}:${task.updatedAt || ''}:${index}`)
        );
      case 'students':
        return (EC.state.students || []).map(student => [
          'student',
          student.id,
          student.updatedAt || '',
          student.xp,
          student.tasks,
          student.regNo,
          student.section
        ].join(':'));
      case 'leaderboard':
        return (EC.state.students || []).map(student => `leaderboard:${student.id}:${student.rank}:${student.xp}:${student.streak}`);
      case 'profile':
        return EC.state.currentUser ? [[
          'profile',
          EC.state.currentUser.id,
          EC.state.currentUser.updatedAt || '',
          EC.state.currentUser.name || '',
          EC.state.currentUser.regNo || '',
          EC.state.currentUser.section || ''
        ].join(':')] : [];
      case 'poll':
        return (EC.state.polls || []).flatMap(poll => {
          if (role === 'teacher' && String(poll.createdById || '') === myId) {
            return (poll.options || []).flatMap((option, optionIndex) =>
              (option.votes || [])
                .filter(voterId => String(voterId) !== myId)
                .map(voterId => `poll-vote:${poll.id}:${optionIndex}:${voterId}`)
            );
          }
          return String(poll.createdById || '') === myId
            ? []
            : [`poll:${poll.id}:${poll.active}:${poll.closedAt || ''}:${poll.updatedAt || poll.createdAtRaw || ''}`];
        });
      case 'announcements':
        return (EC.state.announcements || []).flatMap(announcement => {
          const entries = [];
          if (String(announcement.postedById || '') !== myId) {
            entries.push(`announcement:${announcement.id}:${announcement.updatedAt || announcement.createdAt || ''}`);
          }
          (announcement.comments || []).forEach(comment => {
            if (String(comment.authorId || '') !== myId) {
              entries.push(`announcement-comment:${announcement.id}:${comment.id}:${comment.rawCreatedAt || ''}`);
            }
          });
          return entries;
        });
      case 'leave-od':
        if (role === 'teacher') {
          return (EC.state.leaveRequests || [])
            .filter(request => request.status === 'pending')
            .map(request => `leave:${request.id}:pending:${request.createdAt || ''}`);
        }
        return (EC.state.leaveRequests || [])
          .filter(request => request.status !== 'pending')
          .map(request => `leave:${request.id}:${request.status}:${request.reviewedAt || request.createdAt || ''}`);
      case 'explanations':
        return (EC.state.monthTaskWarnings || [])
          .filter(warning => warning.teacherAction === 'pending' && warning.explanationText)
          .map(warning => `explanation:${warning.id}:${warning.submittedAt || warning.triggeredAt || warning.createdAt || ''}`);
      case 'review':
        return (EC.state.tasks || []).flatMap(task =>
          this.entryCopies(task.pendingGradingCount, index => `review:${task.id}:${task.updatedAt || ''}:${index}`)
        );
      case 'chat':
        return (EC.state.chatMessagesByContext?.class || [])
          .filter(message => String(message.fromId || '') !== myId)
          .map(message => `chat:${message.id}:${message.createdAt || ''}`);
      case 'schedule':
        return (EC.state.schedules || []).map(entry => `schedule:${entry.id}:${entry.day}:${entry.time}:${entry.subject}:${entry.room}:${entry.type}`);
      case 'resources':
        return (EC.state.resources || [])
          .filter(resource => String(resource.uploadedById || '') !== myId)
          .map(resource => `resource:${resource.id}:${resource.updatedAt || resource.createdAt || ''}`);
      case 'bookmarks':
        return (EC.state.bookmarks || []).map(bookmark => `bookmark:${bookmark.type}:${bookmark.id}`);
      case 'dashboard':
      case 'export':
      default:
        return [];
    }
  },

  ensureBaseline() {
    const seen = this.loadSeen();
    const tracked = this.trackedPages();
    if (Object.keys(seen).length) return;
    tracked.forEach(sectionId => {
      if (sectionId === 'dashboard') return;
      seen[sectionId] = this.sectionEntries(sectionId);
    });
    EC.state.notifications.seen = seen;
    this.persistSeen();
  },

  countFor(sectionId) {
    const seen = this.loadSeen();
    const currentEntries = this.sectionEntries(sectionId);
    const seenEntries = new Set(Array.isArray(seen[sectionId]) ? seen[sectionId] : []);
    return currentEntries.filter(entry => !seenEntries.has(entry)).length;
  },

  markSeen(sectionId) {
    if (!sectionId || sectionId === 'dashboard') return;
    this.loadSeen();
    EC.state.notifications.seen[sectionId] = this.sectionEntries(sectionId);
    this.persistSeen();
  },

  refreshCounts() {
    this.ensureBaseline();
    const tracked = this.trackedPages();
    const counts = {};
    let persistNeeded = false;

    tracked.forEach(sectionId => {
      if (sectionId === 'dashboard') return;
      if (EC.state.currentPage === sectionId) {
        const nextEntries = this.sectionEntries(sectionId);
        const currentSeen = EC.state.notifications.seen?.[sectionId] || [];
        if (JSON.stringify(currentSeen) !== JSON.stringify(nextEntries)) {
          EC.state.notifications.seen[sectionId] = nextEntries;
          persistNeeded = true;
        }
        counts[sectionId] = 0;
        return;
      }
      counts[sectionId] = this.countFor(sectionId);
    });

    counts.dashboard = tracked
      .filter(sectionId => sectionId !== 'dashboard')
      .reduce((sum, sectionId) => sum + Number(counts[sectionId] || 0), 0);

    EC.state.notifications.counts = counts;
    if (persistNeeded) this.persistSeen();
    EC.app?.renderNavBadges?.();
  },

  async refreshRemoteData() {
    if (!EC.state.authToken) return;
    try {
      // Smart polling: only full bootstrap if data is stale (5 mins)
      const now = Date.now();
      if (!EC.state._lastFullBootstrap || (now - EC.state._lastFullBootstrap > 300000)) {
        await EC.api.bootstrap();
        EC.state._lastFullBootstrap = now;
      }

      const extraRequests = [
        EC.api.getChatMessages('class').then(messages => {
          if (!EC.state.chatMessagesByContext) EC.state.chatMessagesByContext = {};
          EC.state.chatMessagesByContext.class = messages;
        }),
        EC.api.listMonthTaskBatches()
          .then(result => {
            EC.state.monthTaskBatches = result?.batches || [];
          })
          .catch(() => {}),
        (EC.state.currentRole === 'teacher'
          ? EC.api.getMonthTaskWarnings()
          : EC.api.getMyMonthTaskWarnings()
        ).then(warnings => {
          EC.state.monthTaskWarnings = warnings || [];
        }).catch(() => {})
      ];
      await Promise.allSettled(extraRequests);
    } finally {
      this.refreshCounts();
    }
  },

  async init() {
    this.initialized = false;
    this.loadSeen();
    EC.loadSchedules();
    this.refreshCounts();
    this.startPolling();
  },

  startPolling() {
    this.stopPolling();
    this.pollTimer = window.setInterval(() => {
      this.refreshRemoteData().catch(() => {});
    }, 15000);
  },

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
};

EC.app = {
  teacherNav: [
    {section:'Main'},
    {id:'dashboard',     icon:'🏠', label:'Dashboard'},
    {id:'tasks',         icon:'✅', label:'Task Manager'},
    {id:'review',        icon:'📝', label:'Review Page'},
    {id:'month-tasks',   icon:'🗓️', label:'Month Tasks'},
    {id:'excel-workbook', icon:'📒', label:'Workbook'},
    {id:'gradebook',     icon:'📘', label:'Gradebook'},
    {id:'students',      icon:'🎓', label:'Student Profiles'},
    {id:'leaderboard',   icon:'🏆', label:'Leaderboard'},
    {section:'Engagement'},
    {id:'announcements', icon:'📢', label:'Announcements'},
    {id:'leave-od',      icon:'📝', label:'Leave / OD'},
    {id:'explanations',  icon:'📄', label:'Explanations'},
    {id:'poll',          icon:'📊', label:'Polls'},
    {id:'chat',          icon:'💬', label:'Class Chat'},
    {section:'Manage'},
    {id:'schedule',      icon:'⏰', label:'Schedule Manager'},
    {id:'resources',     icon:'📂', label:'Resources Manager'},
    {id:'bookmarks',     icon:'🔖', label:'Saved Items'},
    {id:'export',        icon:'📤', label:'Export Reports'},
  ],
  studentNav: [
    {section:'Main'},
    {id:'dashboard',     icon:'🏠', label:'Dashboard'},
    {id:'tasks',         icon:'✅', label:'My Tasks'},
    {id:'month-tasks',   icon:'🗓️', label:'Month Tasks'},
    {id:'leaderboard',   icon:'🏆', label:'Leaderboard'},
    {id:'profile',       icon:'🙋', label:'My Profile'},
    {id:'poll',          icon:'📊', label:'Polls'},
    {section:'Class'},
    {id:'announcements', icon:'📢', label:'Announcements'},
    {id:'leave-od',      icon:'📝', label:'Leave / OD'},
    {id:'chat',          icon:'💬', label:'Chat'},
    {id:'schedule',      icon:'⏰', label:'Schedule'},
    {id:'resources',     icon:'📂', label:'Resources'},
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
    await EC.api.ensureBackendReady();
    await EC.api.bootstrap();
    await EC.notifications.init();
    EC.app.buildShell();
    const initialPage = new URLSearchParams(window.location.search).get('page') || 'dashboard';
    EC.app.navigate(initialPage);
    EC.checkDeadlines();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(registration => {
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
        <div class="brand-icon"><img src="assets/logo.svg" alt="Elite Class" onerror="this.parentElement.textContent='EC'"></div>
        <div class="brand-text">
          <div class="brand-name">Elite Class</div>
          <div class="brand-role">${role === 'teacher' ? 'Teacher Portal' : 'Student Portal'}</div>
        </div>
      </div>
      <div class="sidebar-user" onclick="EC.navigate(EC.state.currentRole==='teacher'?'students':'profile')">
        <div class="avatar avatar-sm avatar-ring" style="background:${role === 'teacher' ? '#1a3a8f' : EC.getStudent(EC.state.myId || 1)?.color || '#1a3a8f'};background-image:url('${EC.getProfileImageUrl(user || {})}');background-size:cover;background-position:center;color:transparent;">${(user?.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</div>
        <div class="user-info">
          <div class="user-name">${user?.name || 'User'}</div>
          ${role === 'student' ? `<div class="user-level">Level ${EC.state.myLevel || 'Rookie'} - #${EC.state.myRank || '?'}</div>` : `<div class="user-level">Teacher</div>`}
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
          <button class="sidebar-footer-btn" id="pwa-install-btn" onclick="EC.app.promptInstall()" title="Install App" style="display:none">Install App</button>
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

    EC.app.renderNavBadges();
  },

  renderNavBadges() {
    const counts = EC.state.notifications?.counts || {};
    const navIds = (EC.state.currentRole === 'teacher' ? EC.app.teacherNav : EC.app.studentNav)
      .filter(item => item && item.id)
      .map(item => item.id);

    navIds.forEach(id => {
      const navEl = document.getElementById(`nav-${id}`);
      if (!navEl) return;
      let badge = navEl.querySelector('.nav-badge');
      const count = Number(counts[id] || 0);
      if (count <= 0) {
        if (badge) badge.remove();
        return;
      }
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'nav-badge red';
        navEl.appendChild(badge);
      }
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.style.display = '';
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
    if (EC.state.currentPage) EC.notifications?.markSeen?.(EC.state.currentPage);
    if (pageId !== 'chat') EC.chat?.stopPolling?.();
    EC.state.currentPage = pageId;

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const navEl = document.getElementById(`nav-${pageId}`);
    if (navEl) navEl.classList.add('active');

    const role = EC.state.currentRole;
    const nav  = role === 'teacher' ? EC.app.teacherNav : EC.app.studentNav;
    const item = nav.find(n => n.id === pageId);
    const titleEl = document.getElementById('topbar-title');
    if (titleEl) {
      if (item) titleEl.innerHTML = `${item.icon} <span>${item.label}</span>`;
      else if (pageId === 'excel-workbook') titleEl.innerHTML = `📒 <span>Workbook</span>`;
    }

    const content = document.getElementById('page-content-area');
    if (!content) return;
    content.scrollTop = 0;
    EC.sound?.click?.();
    EC.app.closeSidebar();

    // Lazy load data for the target page
    EC.api.bootstrap().then(() => {
      if (role === 'teacher') {
        switch (pageId) {
          case 'dashboard':     EC.teacherDashboard.render(content); break;
          case 'tasks':         EC.teacherTasks.render(content); break;
          case 'review':        EC.teacherReview.render(content); break;
          case 'month-tasks':   EC.teacherMonthTasks.render(content); break;
          case 'gradebook':     EC.teacherGradebook.render(content); break;
          case 'students':      EC.teacherStudents.render(content); break;
          case 'leaderboard':   EC.teacherLeaderboard.render(content); break;
          case 'announcements': EC.teacherAnnouncements.render(content); break;
          case 'leave-od':      EC.teacherLeave.render(content); break;
          case 'explanations':  EC.teacherExplanations.render(content); break;
          case 'poll':          EC.teacherPoll.render(content); break;
          case 'chat':          EC.app.renderChat(content); break;
          case 'schedule':      EC.teacherSchedule.render(content); break;
          case 'resources':     EC.teacherResources.render(content); break;
          case 'bookmarks':     EC.app.renderBookmarks(content); break;
          case 'export':        EC.teacherExport.render(content); break;
          case 'excel-workbook': EC.excelWorkbook.render(content); break;
          default:              EC.teacherDashboard.render(content);
        }
      } else {
        switch (pageId) {
          case 'dashboard':     EC.studentDashboard.render(content); break;
          case 'tasks':         EC.studentTasks.render(content); break;
          case 'month-tasks':   EC.studentMonthTasks.render(content); break;
          case 'leaderboard':   EC.studentLeaderboard.render(content); break;
          case 'profile':       EC.studentProfile.render(content); break;
          case 'excel-workbook': EC.excelWorkbook.render(content); break;
          case 'announcements': EC.studentAnnouncements.render(content); break;
          case 'leave-od':      EC.studentLeave.render(content); break;
          case 'poll':          EC.studentPoll.render(content); break;
          case 'chat':          EC.app.renderChat(content); break;
          case 'schedule':      EC.studentSchedule.render(content); break;
          case 'resources':     EC.studentResources.render(content); break;
          case 'bookmarks':     EC.app.renderBookmarks(content); break;
          default:              EC.studentDashboard.render(content);
        }
      }
      EC.notifications?.refreshCounts?.();
    });
  },

  renderChat(el) {
    el.innerHTML = `
      <div class="page-header"><div><h2 class="page-title">Class Chat</h2><p class="page-subtitle">Real-time class discussion</p></div></div>
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
             <div style="font-size:32px;margin-bottom:16px;font-weight:700">SAVE</div>
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
                  <button class="btn btn-ghost btn-sm" type="button" style="color:var(--danger);font-size:16px;padding:4px 8px" title="Remove bookmark" data-bookmark-action="remove" data-bookmark-id="${String(b.id)}" data-bookmark-type="${b.type}">Remove</button>
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
    EC.notifications?.refreshCounts?.();
    EC.toast('Bookmarked', 'success', 1800);
  },

  removeBookmark(id, type) {
    EC.state.bookmarks = EC.state.bookmarks.filter(b => !(String(b.id) === String(id) && b.type === type));
    EC.app.persistBookmarks();
    EC.notifications?.refreshCounts?.();
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
    EC.app.renderNavBadges();
  },

  toggleSound() {
    EC.state.soundEnabled = !EC.state.soundEnabled;
    const btn = document.getElementById('sound-btn');
    if (btn) btn.innerHTML = `${EC.state.soundEnabled ? '🔊' : '🔇'} Sound`;
    const topbarBtn = document.getElementById('topbar-sound');
    if (topbarBtn) topbarBtn.innerHTML = EC.state.soundEnabled ? '🔊' : '🔇';
    EC.toast(EC.state.soundEnabled ? 'Sound on' : 'Sound off', 'default', 1500);
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
