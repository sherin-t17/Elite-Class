window.EC = window.EC || {};

EC.teacherLeaderboard = {
  async render(el) {
    el.innerHTML = `
      <div class="page-header">
        <div><h2 class="page-title">Leaderboard</h2><p class="page-subtitle">Dedicated student ranking view for teachers.</p></div>
      </div>
      <div class="tabs">
        <button class="tab-btn active" onclick="EC.teacherLeaderboard.switchTab(this,'alltime')">All-Time</button>
        <button class="tab-btn" onclick="EC.teacherLeaderboard.switchTab(this,'weekly')">This Week</button>
      </div>
      <div id="teacher-leaderboard-view" class="animate-in"></div>
    `;
    this.renderRows(EC.state.students || []);
  },

  async switchTab(btn, type) {
    document.querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('active'));
    btn.classList.add('active');

    if (type === 'weekly') {
      try {
        const weekly = await EC.api.getLeaderboard('weekly');
        this.renderRows(weekly || []);
        return;
      } catch (err) {
        EC.toast(err.message || 'Could not load weekly leaderboard', 'danger');
      }
    }

    this.renderRows(EC.state.students || []);
  },

  renderRows(students) {
    const view = document.getElementById('teacher-leaderboard-view');
    if (!view) return;

    view.innerHTML = `
      <div class="card">
        <div class="card-header"><div class="card-title">Class Rankings</div></div>
        <div class="card-body">
          ${(students || []).length
            ? students.map(student => EC.gamification.renderLbRow(student, null)).join('')
            : `<div style="color:var(--text-muted)">No leaderboard data available.</div>`
          }
        </div>
      </div>
    `;
  }
};
