/* ============================================================
   ELITE CLASS - SEASONS & DAILY MISSIONS
   ============================================================ */

window.EC = window.EC || {};

EC.seasons = {
  renderBattlePass(el) {
    if (!el) return;
    const s = EC.state.season;

    if (!s || !s.name || !Array.isArray(s.milestones) || !s.milestones.length) {
      el.innerHTML = `
        <div class="battle-pass-track animate-in">
          <div class="bp-header">
            <div>
              <div class="bp-title">Season</div>
              <div class="bp-season">Live season data is not available yet</div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    el.innerHTML = `
      <div class="battle-pass-track animate-in">
        ${s.endsIn <= 3 ? `<div class="season-end-banner">⚡ Season ends in ${s.endsIn} days! Claim your rewards before they expire!</div>` : ''}
        <div class="bp-header">
          <div>
            <div class="bp-title">🏆 ${s.name}</div>
            <div class="bp-season">Ends in ${s.endsIn} days</div>
          </div>
          <button class="btn btn-sm" style="background:rgba(255,255,255,0.18);color:#fff;border:1.5px solid rgba(255,255,255,0.35);font-weight:600" onclick="EC.seasons.showSeasonInfo()">Season Info</button>
        </div>
        <div class="bp-milestones">
          ${s.milestones.map((m, i) => {
            const isDone = i < s.currentMilestone;
            const isCurrent = i === s.currentMilestone;
            const isClaimable = m.claimable;
            let cls = '';
            if (isDone) cls = 'done';
            else if (isClaimable) cls = 'claimable';
            else if (isCurrent) cls = 'current';
            return `
              ${i > 0 ? `<div class="bp-line ${isDone ? 'done' : ''}"></div>` : ''}
              <div class="bp-milestone ${cls}" title="${m.reward}" onclick="EC.seasons.clickMilestone(${i}, '${m.reward}', ${isClaimable})">
                ${m.icon}
                <span class="bp-milestone-label">${i + 1}</span>
              </div>
            `;
          }).join('')}
        </div>
        <div style="margin-top:14px;display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:12px;color:rgba(255,255,255,0.5)">Milestone ${s.currentMilestone}/10 • Complete tasks to advance</div>
          <div style="font-size:12px;color:var(--accent);font-weight:600">🏆 Final Reward: Exclusive Profile Frame</div>
        </div>
      </div>
    `;
  },

  clickMilestone(idx, reward, isClaimable) {
    if (isClaimable) {
      EC.showClaimReward(reward);
      EC.state.season.milestones[idx].claimable = false;
      EC.state.season.milestones[idx].done = true;
    } else {
      EC.toast(`Milestone ${idx + 1}: ${reward}`, 'default', 2000);
    }
  },

  showSeasonInfo() {
    EC.toast(`Season ends in ${EC.state.season.endsIn} days. Top 3 students get exclusive rewards!`, 'default', 4000);
  }
};

EC.dailyMissions = {
  render(el) {
    if (!el) return;
    const missions = EC.state.dailyMissions;

    if (!missions.length) {
      el.innerHTML = `
        <div class="card animate-in">
          <div class="card-header">
            <div>
              <div class="card-title">Daily Missions</div>
              <div class="card-subtitle">No live mission data available</div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    const done = missions.filter(m => m.completed).length;
    el.innerHTML = `
      <div class="card animate-in">
        <div class="card-header">
          <div>
            <div class="card-title">⚡ Daily Missions</div>
            <div class="card-subtitle">${done}/${missions.length} completed today</div>
          </div>
          <div class="tag ${done === missions.length ? 'status-done' : 'status-pending'}">${done === missions.length ? 'All done!' : 'In progress'}</div>
        </div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:10px">
          ${missions.map((m, i) => `
            <div class="mission-item ${m.completed ? 'completed' : ''}" style="opacity:${m.completed ? 0.7 : 1}">
              <div class="mission-icon">${m.icon}</div>
              <div class="mission-info">
                <div class="mission-name" style="${m.completed ? 'text-decoration:line-through;color:var(--text-muted)' : ''}">${m.name}</div>
                <div class="mission-desc">${m.desc}</div>
              </div>
              <div class="mission-xp">+${m.xp} XP</div>
              <div class="mission-check" onclick="EC.dailyMissions.complete(${i})" style="cursor:pointer;font-size:22px" title="${m.completed ? 'Completed' : 'Click to complete'}">
                ${m.completed ? '✅' : '⭕'}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  complete(idx) {
    const mission = EC.state.dailyMissions[idx];
    if (!mission || mission.completed) return;
    mission.completed = true;
    EC.showXp(`+${mission.xp} XP`);
    EC.toast(`Mission complete: ${mission.name}!`, 'success');
    const el = document.getElementById('daily-missions-container');
    if (el) EC.dailyMissions.render(el);
  }
};
