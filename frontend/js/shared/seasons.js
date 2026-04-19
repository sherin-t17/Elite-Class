/* ============================================================
   ELITE CLASS - SEASONS
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
        ${s.endsIn <= 3 ? `<div class="season-end-banner">âš¡ Season ends in ${s.endsIn} days! Claim your rewards before they expire!</div>` : ''}
        <div class="bp-header">
          <div>
            <div class="bp-title">ðŸ† ${s.name}</div>
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
          <div style="font-size:12px;color:rgba(255,255,255,0.5)">Milestone ${s.currentMilestone}/10 â€¢ Complete tasks to advance</div>
          <div style="font-size:12px;color:var(--accent);font-weight:600">ðŸ† Final Reward: Exclusive Profile Frame</div>
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
