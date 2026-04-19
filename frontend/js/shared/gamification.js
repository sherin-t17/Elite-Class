/* ============================================================
   ELITE CLASS - GAMIFICATION ENGINE
   XP, levels, badges, hero roles
   ============================================================ */

window.EC = window.EC || {};

EC.gamification = {
  renderXpBar(el, xp, showLabel = true) {
    if (!el) return;
    const info = EC.xpToNextLevel(xp);
    el.innerHTML = `
      <div class="xp-bar-container">
        <div class="xp-bar-fill" style="width:${info.pct}%">
          <div class="xp-bar-glow"></div>
        </div>
        ${showLabel ? `<div class="xp-bar-label">${info.current} / ${info.total} XP</div>` : ''}
      </div>
    `;
  },

  renderLbRow(student, myId, prevRanks = {}) {
    const isMe = student.id === myId;
    const prevRank = prevRanks[student.id] || student.rank;
    const change = prevRank - student.rank;
    const changeHtml = change > 0
      ? `<span class="lb-change up">▲${change}</span>`
      : change < 0
        ? `<span class="lb-change down">▼${Math.abs(change)}</span>`
        : `<span class="lb-change same">-</span>`;

    const rankClass = student.rank === 1 ? 'top1' : student.rank === 2 ? 'top2' : student.rank === 3 ? 'top3' : '';
    const rankIcon = student.rank === 1 ? '🥇' : student.rank === 2 ? '🥈' : student.rank === 3 ? '🥉' : `#${student.rank}`;

    return `
      <div class="lb-row ${isMe ? 'me' : ''}">
        <div class="lb-rank ${rankClass}">${student.rank <= 3 ? rankIcon : student.rank}</div>
        ${student.rank === 1 ? '<span class="lb-crown">👑</span>' : ''}
        <div class="avatar avatar-sm" style="background:${student.color};background-image:url('${EC.getProfileImageUrl(student)}');background-size:cover;background-position:center;color:transparent;">${student.initials}</div>
        <div class="lb-info">
          <div class="lb-name ${student.streak >= 7 ? 'on-fire' : ''}">${student.name}${isMe ? ' <span style="font-size:10px;font-weight:600;color:var(--royal)">(You)</span>' : ''}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:2px"><div class="lb-sub">${student.level}</div></div>
        </div>
        ${changeHtml}
        <div class="lb-xp">${student.xp.toLocaleString()} XP</div>
      </div>
    `;
  },

  renderHeroRoles(el, myRole) {
    if (!el) return;
    el.innerHTML = '';
  },

  renderBadges(el, showcaseIds = []) {
    if (!el) return;
    const badges = EC.state.badges;
    if (!badges.length) {
      el.innerHTML = '<div style="font-size:13px;color:var(--text-muted)">Badges will appear once they are loaded from the backend.</div>';
      return;
    }

    el.innerHTML = `
      <div class="badge-grid">
        ${badges.map(b => `
          <div class="badge-item" onclick="EC.gamification.showBadgeInfo(${b.id})" title="${b.name}">
            <div class="badge-icon-wrap rarity-${b.rarity} ${b.unlocked ? '' : 'locked'}">
              ${b.icon}
              ${!b.unlocked ? '<div class="badge-locked-overlay">🔒</div>' : ''}
            </div>
            <div class="badge-name">${b.name}</div>
            <div class="badge-rarity" style="color:var(--tier-${b.rarity})">${b.rarity}</div>
          </div>
        `).join('')}
      </div>
    `;
  },

  showBadgeInfo(id) {
    const badge = EC.state.badges.find(b => b.id === id);
    if (!badge) return;
    if (!badge.unlocked) {
      EC.toast(`🔒 "${badge.name}" - ${badge.desc}`, 'default', 3000);
    } else {
      EC.toast(`✅ "${badge.name}" - Earned! ${badge.desc}`, 'success', 3000);
    }
  }
};
