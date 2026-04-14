window.EC = window.EC || {};

EC.studentProfile = {
  render(el) {
    const myId = EC.state.myId || 1;
    const me = EC.getStudent(myId) || EC.state.students[0];
    const xpInfo = EC.xpToNextLevel(me.xp);

    if (!me.year && !me.dept) {
      EC.studentProfile.renderSetup(el, me);
      return;
    }

    el.innerHTML = `
      <div class="page-header">
        <div><h2 class="page-title">&#x1F3AF; My Profile</h2><p class="page-subtitle">Your achievements, stats and progress</p></div>
        <div class="page-header-actions">
          <button class="btn btn-outline" onclick="EC.studentProfile.renderEdit()">&#x270F;&#xFE0F; Edit Profile</button>
        </div>
      </div>

      <div class="card mb-16 animate-in" style="background:linear-gradient(135deg,var(--royal-dark),var(--royal));padding:16px 20px;border-left:4px solid var(--accent)">
        <div style="font-size:14px;font-weight:600;color:#fff;line-height:1.6">${EC.studentProfile.getMotivationQuote(me)}</div>
      </div>

      <div class="card animate-in" style="overflow:hidden;margin-bottom:16px">
        <div style="height:100px;background:linear-gradient(135deg,var(--royal-dark),var(--royal-mid),var(--royal-light));position:relative">
          <div style="position:absolute;inset:0;background:url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\"><defs><pattern id=\"p\" width=\"40\" height=\"40\" patternUnits=\"userSpaceOnUse\"><circle cx=\"20\" cy=\"20\" r=\"1\" fill=\"rgba(255,255,255,0.1)\"/></pattern></defs><rect width=\"100%\" height=\"100%\" fill=\"url(%23p)\"/></svg>')"></div>
        </div>
        <div style="padding:0 24px 24px;position:relative">
          <div style="display:flex;align-items:flex-end;gap:16px;margin-top:-32px">
            <div style="width:72px;height:72px;background:${me.color};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:700;color:#fff;border:3px solid #fff;box-shadow:0 4px 16px rgba(0,0,0,0.15);flex-shrink:0;${me.profileImageUrl ? `background-image:url('${me.profileImageUrl}');background-size:cover;background-position:center;color:transparent;` : ''}">${me.initials}</div>
            <div style="padding-bottom:4px;flex:1">
              <div style="font-family:'Playfair Display',serif;font-size:22px;font-weight:700">${me.name}</div>
              <div style="font-size:13px;color:var(--text-muted)">${me.year || 'II'} Year &bull; ${me.dept || 'AI & DS'} &bull; Section ${me.section || 'A'} &bull; Reg: ${me.regNo || '20AI001'}</div>
            </div>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:16px" class="animate-in animate-in-delay-1">
        <div class="card" style="padding:14px;text-align:center"><div style="font-size:22px;font-weight:700;color:var(--royal)">${me.xp}</div><div style="font-size:11px;color:var(--text-muted)">Total XP</div></div>
        <div class="card" style="padding:14px;text-align:center"><div style="font-size:22px;font-weight:700;color:var(--accent-dark)">#${me.rank}</div><div style="font-size:11px;color:var(--text-muted)">Rank</div></div>
        <div class="card" style="padding:14px;text-align:center"><div style="font-size:22px;font-weight:700;color:var(--success)">${me.attendance}%</div><div style="font-size:11px;color:var(--text-muted)">Attendance</div></div>
        <div class="card" style="padding:14px;text-align:center"><div style="font-size:22px;font-weight:700;color:var(--info)">&#x1F525;${me.streak}</div><div style="font-size:11px;color:var(--text-muted)">Day Streak</div></div>
        <div class="card" style="padding:14px;text-align:center"><div style="font-size:22px;font-weight:700;color:var(--royal)">${me.tasks}</div><div style="font-size:11px;color:var(--text-muted)">Tasks Done</div></div>
      </div>

      <div class="card mb-16 animate-in animate-in-delay-2" style="padding:20px">
        <div style="display:flex;justify-content:space-between;margin-bottom:10px">
          <div><div style="font-weight:700">${me.level}</div><div style="font-size:12px;color:var(--text-muted)">Current Level</div></div>
          <div style="text-align:right"><div style="font-weight:700">${xpInfo.current} / ${xpInfo.total} XP</div><div style="font-size:12px;color:var(--text-muted)">To next level</div></div>
        </div>
        <div class="progress-track" style="height:12px"><div class="progress-fill" style="width:${xpInfo.pct}%;background:linear-gradient(90deg,var(--royal),var(--royal-light))"></div></div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:6px">${xpInfo.pct}% to next level</div>
      </div>

      <div class="card mb-16 animate-in animate-in-delay-3" style="padding:20px">
        <div style="font-weight:700;font-size:15px;margin-bottom:14px">&#x1F3D6;&#xFE0F; Badge Showcase</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          ${EC.state.myBadgeShowcase.map(id => {
            const badge = EC.state.badges.find(entry => entry.id === id);
            if (!badge) return '';
            return `<div style="text-align:center;padding:12px;background:var(--surface);border-radius:12px;min-width:80px">
              <div style="font-size:32px;margin-bottom:6px">${badge.icon}</div>
              <div style="font-size:11px;font-weight:700">${badge.name}</div>
              <div style="font-size:10px;color:var(--tier-${badge.rarity});text-transform:capitalize;margin-top:2px">${badge.rarity}</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="card mb-16 animate-in">
        <div style="padding:16px 20px;border-bottom:1px solid var(--border);font-weight:700">All Badges (${EC.state.badges.filter(badge => badge.unlocked).length}/${EC.state.badges.length} unlocked)</div>
        <div style="padding:16px 20px">
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:12px">
            ${EC.state.badges.map(badge => `
              <div style="text-align:center;opacity:${badge.unlocked ? 1 : 0.4}" title="${badge.desc}">
                <div style="font-size:28px;margin-bottom:4px;filter:${badge.unlocked ? 'none' : 'grayscale(1)'}">${badge.icon}</div>
                <div style="font-size:11px;font-weight:600">${badge.name}</div>
                <div style="font-size:10px;color:var(--tier-${badge.rarity});text-transform:capitalize">${badge.rarity}</div>
                ${!badge.unlocked ? '<div style="font-size:10px;color:var(--text-faint)">&#x1F512; Locked</div>' : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="card animate-in">
        <div style="padding:16px 20px;border-bottom:1px solid var(--border);font-weight:700">&#x1F4C8; XP History</div>
        ${EC.studentProfile.renderXpLog()}
      </div>

      ${EC.studentProfile.editModal(me)}
    `;
  },

  renderSetup(el, me) {
    el.innerHTML = `
      <div style="max-width:520px;margin:40px auto">
        <div class="card" style="padding:32px">
          <div style="text-align:center;margin-bottom:28px">
            <div style="font-size:48px;margin-bottom:8px">&#x1F44B;</div>
            <div style="font-family:'Playfair Display',serif;font-size:24px;font-weight:700">Welcome to Elite Class!</div>
            <div style="font-size:14px;color:var(--text-muted);margin-top:6px">Complete your profile to get started</div>
          </div>
          <div class="form-group"><label class="form-label">Year</label><select class="form-select" id="setup-year"><option value="">Select</option><option>I</option><option>II</option><option>III</option><option>IV</option></select></div>
          <div class="form-group"><label class="form-label">Department</label><select class="form-select" id="setup-dept"><option value="">Select</option><option>AI &amp; DS</option><option>AI &amp; ML</option><option>CSE</option><option>ECE</option><option>CIVIL</option><option>MECH</option><option>CSBS</option></select></div>
          <div class="form-group"><label class="form-label">Section</label><select class="form-select" id="setup-section"><option value="">Select</option><option>A</option><option>B</option><option>C</option><option>D</option></select></div>
          <div class="form-group"><label class="form-label">Register Number</label><input class="form-input" id="setup-regno" placeholder="e.g. 20AI001"></div>
          <button class="btn btn-accent w-full" style="margin-top:8px" onclick="EC.studentProfile.saveSetup()">Continue &rarr;</button>
        </div>
      </div>
    `;
  },

  saveSetup() {
    const year = document.getElementById('setup-year')?.value;
    const dept = document.getElementById('setup-dept')?.value;
    const section = document.getElementById('setup-section')?.value;
    const regNo = document.getElementById('setup-regno')?.value?.trim();
    if (!year || !dept || !section) {
      EC.toast('Please fill in all fields', 'danger');
      return;
    }
    const me = EC.getStudent(EC.state.myId || 1);
    if (me) {
      me.year = year;
      me.dept = dept;
      me.section = section;
      me.regNo = regNo;
    }
    EC.toast('Profile setup complete! \u{1F389}', 'success');
    EC.studentProfile.render(document.getElementById('page-content-area'));
  },

  editModal(me) {
    return `
      <div class="overlay" id="profile-edit-modal">
        <div class="modal" style="max-width:480px">
          <div class="modal-header">
            <div class="modal-title">&#x270F;&#xFE0F; Edit Profile</div>
            <button class="modal-close" onclick="document.getElementById('profile-edit-modal').classList.remove('open')">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group"><label class="form-label">Year</label><select class="form-select" id="edit-year"><option>I</option><option ${me.year === 'II' ? 'selected' : ''}>II</option><option ${me.year === 'III' ? 'selected' : ''}>III</option><option>IV</option></select></div>
            <div class="form-group"><label class="form-label">Department</label><select class="form-select" id="edit-dept"><option ${me.dept === 'AI & DS' ? 'selected' : ''}>AI &amp; DS</option><option>AI &amp; ML</option><option>CSE</option><option>ECE</option><option>CIVIL</option><option>MECH</option><option>CSBS</option></select></div>
            <div class="form-group"><label class="form-label">Section</label><select class="form-select" id="edit-section"><option ${me.section === 'A' ? 'selected' : ''}>A</option><option>B</option><option>C</option><option>D</option></select></div>
            <div class="form-group"><label class="form-label">Register Number</label><input class="form-input" id="edit-regno" value="${me.regNo || ''}"></div>
            <div class="form-group"><label class="form-label">Profile Picture</label><input class="form-input" id="edit-profile-image" type="file" accept="image/*"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="document.getElementById('profile-edit-modal').classList.remove('open')">Cancel</button>
            <button class="btn btn-accent" onclick="EC.studentProfile.saveEdit()">Save Changes</button>
          </div>
        </div>
      </div>
    `;
  },

  renderEdit() {
    document.getElementById('profile-edit-modal')?.classList.add('open');
  },

  async saveEdit() {
    const me = EC.getStudent(EC.state.myId || 1);
    if (me) {
      me.year = document.getElementById('edit-year')?.value;
      me.dept = document.getElementById('edit-dept')?.value;
      me.section = document.getElementById('edit-section')?.value;
      me.regNo = document.getElementById('edit-regno')?.value?.trim();
      try {
        const updated = await EC.api.updateProfile(me.id, {
          year: me.year,
          dept: me.dept,
          section: me.section,
          regNo: me.regNo,
          motivationQuote: me.motivationQuote || ''
        });
        Object.assign(me, updated);
        EC.state.currentUser = { ...EC.state.currentUser, ...updated };
        const file = document.getElementById('edit-profile-image')?.files?.[0];
        if (file) {
          const withImage = await EC.api.uploadProfileImage(me.id, file);
          Object.assign(me, withImage);
          EC.state.currentUser = { ...EC.state.currentUser, ...withImage };
        }
      } catch (err) {
        EC.toast(err.message || 'Could not update profile', 'danger');
        return;
      }
    }
    document.getElementById('profile-edit-modal')?.classList.remove('open');
    EC.toast('Profile updated!', 'success');
    EC.app.buildShell();
    EC.studentProfile.render(document.getElementById('page-content-area'));
  },

  renderXpLog() {
    return `
      <div style="padding:20px;color:var(--text-muted);font-size:13px">
        Your XP activity log will appear here once live grading and reward events are recorded.
      </div>
    `;
  },

  getMotivationQuote(me) {
    if (me.rank === 1) return "You're at the top! Don't let anyone catch you \u{1F451}";
    if (me.rank <= 3) return "So close to the top! Just a few more XP and the crown is yours \u{1F3C6}";
    if (me.rank <= 10) return "You're in the top 10 - push harder and break into the top 3 \u{1F4AA}";
    if (me.rank <= 20) return "The leaderboard is watching. Make your move \u{1F4C8}";
    if (me.streak >= 7) return "ON FIRE! Keep this streak alive - you're unstoppable \u{1F525}\u{1F525}";
    if (me.streak === 0) return "Streak lost, but the game isn't over. Come back stronger today \u{1F4AB}";
    return 'Every legend started from the bottom. Your time is coming \u26A1';
  }
};
