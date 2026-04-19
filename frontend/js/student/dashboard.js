window.EC = window.EC || {};

EC.studentDashboard = {
  render(el) {
    const s = EC.state;
    const myId = s.myId || 1;
    const me = EC.getStudent(myId) || s.students[0];
    const xpInfo = EC.xpToNextLevel(me.xp);
    const pendingTasks = s.tasks.filter(task => task.status === 'pending').length;

    el.innerHTML = `
      <div class="stats-grid animate-in">
        <div class="stat-card blue"><div class="stat-icon">&#x2B50;</div><div class="stat-value">${me.xp.toLocaleString()}</div><div class="stat-label">Total XP</div><div class="stat-change up">&uarr; ${me.level}</div></div>
        <div class="stat-card yellow"><div class="stat-icon">&#x1F3C5;</div><div class="stat-value">#${me.rank}</div><div class="stat-label">Class Rank</div><div class="stat-change up">Top ${Math.round(me.rank / s.students.length * 100)}%</div></div>
        <div class="stat-card green"><div class="stat-icon">&#x1F525;</div><div class="stat-value">${me.streak}</div><div class="stat-label">Day Streak</div><div class="stat-change up">Keep it going!</div></div>
        <div class="stat-card red"><div class="stat-icon">&#x1F4CB;</div><div class="stat-value">${pendingTasks}</div><div class="stat-label">Pending Tasks</div><div class="stat-change down">Need attention</div></div>
      </div>

      <div class="two-col animate-in animate-in-delay-2" style="margin-bottom:24px">
        <div class="card">
          <div class="card-body">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
              <div class="avatar avatar-lg" style="background:${me.color};background-image:url('${EC.getProfileImageUrl(me)}');background-size:cover;background-position:center;color:transparent;">${me.initials}</div>
              <div style="flex:1">
                <div style="font-family:'Playfair Display',serif;font-size:18px;font-weight:700">${me.name}</div>
                <div style="font-size:13px;color:var(--text-muted)">${me.level} &bull; Rank #${me.rank}</div>
              </div>
            </div>
            <div style="margin-bottom:6px;display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted)"><span>XP to next level</span><span>${xpInfo.current}/${xpInfo.total}</span></div>
            <div id="xp-bar-profile"></div>
            <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
              <span class="tag status-done">&#x1F525; ${me.streak}-day streak</span>
              ${me.rank === 1 ? '<span class="tag" style="background:var(--warning-bg);color:var(--warning)">&#x1F451; Class #1</span>' : ''}
              <span class="tag cat">${me.tasks} tasks done</span>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-body" style="display:flex;align-items:center;gap:14px;height:100%">
            <span style="font-size:36px">&#x1F3C6;</span>
            <div style="flex:1">
              <div style="font-weight:700;font-size:15px">Leaderboard Snapshot</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:3px">Your rank: #${me.rank}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${me.xp.toLocaleString()} XP earned so far</div>
              <button class="btn btn-sm" style="margin-top:10px;background:var(--accent);color:#000;font-weight:700;border:none;padding:7px 16px;border-radius:8px;cursor:pointer" onclick="EC.navigate('leaderboard')">View Leaderboard &rarr;</button>
            </div>
          </div>
        </div>
      </div>

      <div class="two-col-wide animate-in animate-in-delay-3">
        <div>
          <div class="card">
            <div class="card-header"><div class="card-title">&#x1F4CB; Upcoming Tasks</div><button class="btn btn-outline btn-sm" onclick="EC.navigate('tasks')">View All</button></div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:10px">
              ${s.tasks.filter(task => task.status === 'pending').slice(0, 3).map(task => `
                <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--surface);border-radius:var(--radius-sm)">
                  <span class="tag ${task.diff}">${task.diff}</span>
                  <div style="flex:1"><div style="font-weight:600;font-size:13px">${task.title}</div><div style="font-size:12px;color:var(--text-muted)">Due: ${task.due}</div></div>
                  <div class="task-xp">+${task.xp} XP</div>
                  <button class="btn btn-primary btn-sm" onclick="EC.navigate('tasks')">Start &rarr;</button>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        <div>
          <div class="card mb-16">
            <div class="card-header"><div class="card-title">&#x1F3C5; Leaderboard</div><button class="btn btn-outline btn-sm" onclick="EC.navigate('leaderboard')">Full View</button></div>
            <div class="card-body">
              ${s.students.slice(0, 5).map(student => EC.gamification.renderLbRow(student, myId)).join('')}
              <div class="personal-best">&#x1F4CC; Your personal best: #${me.rank} &mdash; keep pushing!</div>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><div class="card-title">&#x1F4E2; Latest Announcement</div></div>
            <div class="card-body">
              ${s.announcements.slice(0, 1).map(announcement => `
                <div>
                  <div style="font-weight:700;font-size:14px;margin-bottom:6px">${announcement.title}</div>
                  <div style="font-size:13px;color:var(--text-mid);line-height:1.5">${announcement.body.slice(0, 120)}...</div>
                  <div style="font-size:12px;color:var(--text-muted);margin-top:6px">${announcement.time}</div>
                  <button class="btn btn-outline btn-sm mt-8" onclick="EC.navigate('announcements')">Read All</button>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    EC.gamification.renderXpBar(document.getElementById('xp-bar-profile'), me.xp);
  }
};
