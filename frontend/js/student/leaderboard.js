window.EC = window.EC || {};

EC.studentLeaderboard = {
  render(el) {
    const myId = EC.state.myId || 1;
    el.innerHTML = `
      <div class="page-header"><div><h2 class="page-title">&#x1F3C6; Leaderboard</h2><p class="page-subtitle">Compete, improve, and rise through the ranks</p></div></div>
      <div class="tabs">
        <button class="tab-btn active" onclick="EC.studentLeaderboard.tab(this,'alltime')">&#x1F3C6; All-Time</button>
        <button class="tab-btn" onclick="EC.studentLeaderboard.tab(this,'weekly')">&#x1F4C5; This Week</button>
      </div>
      <div id="lb-view" class="animate-in"></div>
    `;
    EC.studentLeaderboard.renderAllTime(myId);
  },

  renderAllTime(myId) {
    const students = EC.state.students;
    const me = EC.getStudent(myId) || students[0] || { id: myId, name: 'Student', rank: 0, xp: 0, tasks: 0, streak: 0 };
    const el = document.getElementById('lb-view');
    if (!el) return;

    el.innerHTML = `
      <div class="two-col-wide">
        <div class="card">
          <div class="card-header"><div class="card-title">&#x1F3C6; All-Time Rankings</div></div>
          <div class="card-body">${students.map(student => EC.gamification.renderLbRow(student, myId)).join('')}</div>
          <div class="card-footer"><div class="personal-best">&#x1F4CC; Your all-time best rank: #${me.rank || '-'} &bull; Current: #${me.rank || '-'}</div></div>
        </div>
        <div>
          ${me.rank === 1 ? `
            <div style="margin-bottom:16px" onclick="EC.showBooyah('You are #1!')">
              <div class="mvp-banner" style="cursor:pointer">
                <span class="mvp-crown">&#x1F451;</span>
                <div><div class="mvp-label">You are MVP!</div><div class="mvp-name">${me.name}</div><div style="font-size:12px;font-weight:500;opacity:0.8">Click to celebrate!</div></div>
              </div>
            </div>` : ''}
          <div class="card">
            <div class="card-header"><div class="card-title">&#x1F3AF; Your Progress</div></div>
            <div class="card-body">
              ${[
                ['XP Earned', '&#x2B50;', me.xp.toLocaleString()],
                ['Tasks Done', '&#x2705;', me.tasks],
                ['Streak', '&#x1F525;', `${me.streak} days`],
                ['Badges', '&#x1F3D6;&#xFE0F;', EC.state.badges.filter(badge => badge.unlocked).length]
              ].map(([label, icon, value]) => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-soft);font-size:14px">${icon} ${label}<strong style="color:var(--royal)">${value}</strong></div>`).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  tab(btn, type) {
    document.querySelectorAll('.tab-btn').forEach(button => button.classList.remove('active'));
    btn.classList.add('active');
    const myId = EC.state.myId || 1;
    const el = document.getElementById('lb-view');
    if (!el) return;

    if (type === 'alltime') {
      EC.studentLeaderboard.renderAllTime(myId);
      return;
    }

    if (type === 'weekly') {
      const weekly = [...EC.state.students].sort((a, b) => b.streak - a.streak);
      el.innerHTML = `
        <div class="card animate-in">
          <div class="card-header"><div class="card-title">&#x1F4C5; Weekly Leaderboard</div><span class="tag status-pending">Resets Monday</span></div>
          <div class="card-body">
            ${weekly.map((student, index) => `
              <div class="lb-row ${student.id === myId ? 'me' : ''}">
                <div class="lb-rank ${index < 3 ? 'top' + (index + 1) : ''}">${index === 0 ? '&#x1F947;' : index === 1 ? '&#x1F948;' : index === 2 ? '&#x1F949;' : '#' + (index + 1)}</div>
                <div class="avatar avatar-sm" style="background:${student.color};background-image:url('${EC.getProfileImageUrl(student)}');background-size:cover;background-position:center;color:transparent;">${student.initials}</div>
                <div class="lb-info"><div class="lb-name">${student.name}</div><div class="lb-sub">&#x1F525; ${student.streak}-day streak</div></div>
                <div class="lb-xp">${student.streak * 40} XP this week</div>
              </div>
            `).join('')}
          </div>
        </div>`;
    }

  }
};
