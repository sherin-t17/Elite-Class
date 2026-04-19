window.EC = window.EC || {};

EC.studentProfile = {
  render(el) {
    const myId = EC.state.myId || EC.state.currentUser?.id || 1;
    const existing = EC.getStudent(myId);
    const currentUser = EC.state.currentUser?.id && String(EC.state.currentUser.id) === String(myId)
      ? EC.state.currentUser
      : null;
    const me = existing || (currentUser ? EC.studentProfile.ensureStudentState(currentUser) : null);
    if (!me) {
      el.innerHTML = `<div class="card" style="padding:24px;color:var(--text-muted)">Profile is not available yet.</div>`;
      return;
    }
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

      <div class="card animate-in" style="overflow:hidden;margin-bottom:16px">
        <div style="height:116px;background:linear-gradient(135deg,var(--royal-dark),var(--royal-mid),var(--royal-light));position:relative">
          <div style="position:absolute;inset:0;background:url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\"><defs><pattern id=\"p\" width=\"40\" height=\"40\" patternUnits=\"userSpaceOnUse\"><circle cx=\"20\" cy=\"20\" r=\"1\" fill=\"rgba(255,255,255,0.1)\"/></pattern></defs><rect width=\"100%\" height=\"100%\" fill=\"url(%23p)\"/></svg>')"></div>
        </div>
        <div style="padding:0 24px 24px;position:relative;z-index:1">
          <div style="display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-top:-28px;position:relative;z-index:2">
            <div style="width:72px;height:72px;background:${me.color};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:700;color:#fff;border:3px solid #fff;box-shadow:0 4px 16px rgba(0,0,0,0.15);flex-shrink:0;background-image:url('${EC.getProfileImageUrl(me)}');background-size:cover;background-position:center;color:transparent;">${me.initials}</div>
            <div style="padding:10px 0 4px;flex:1;min-width:220px">
              <div style="font-family:'Playfair Display',serif;font-size:22px;font-weight:700">${me.name}</div>
              <div style="font-size:13px;color:var(--text-muted)">${me.year || '-'} Year &bull; ${me.dept || '-'} &bull; Section ${me.section || '-'} &bull; Reg: ${me.regNo || '-'}</div>
            </div>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px" class="animate-in animate-in-delay-1">
        <div class="card" style="padding:14px;text-align:center"><div style="font-size:22px;font-weight:700;color:var(--royal)">${me.xp}</div><div style="font-size:11px;color:var(--text-muted)">Total XP</div></div>
        <div class="card" style="padding:14px;text-align:center"><div style="font-size:22px;font-weight:700;color:var(--accent-dark)">#${me.rank}</div><div style="font-size:11px;color:var(--text-muted)">Rank</div></div>
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
          ${(EC.state.myBadgeShowcase?.length ? EC.state.myBadgeShowcase : (me.badgeShowcase || [])).map(id => {
            const badge = EC.state.badges.find(entry => entry.id === id);
            if (!badge) return '';
            return `<div style="text-align:center;padding:12px;background:var(--surface);border-radius:12px;min-width:80px">
              <div style="font-size:32px;margin-bottom:6px">${badge.icon}</div>
              <div style="font-size:11px;font-weight:700">${badge.name}</div>
              <div style="font-size:10px;color:var(--tier-${badge.rarity});text-transform:capitalize;margin-top:2px">${badge.rarity}</div>
            </div>`;
          }).join('') || `<div style="font-size:13px;color:var(--text-muted)">Unlocked badges will appear here.</div>`}
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
          <div class="form-group"><label class="form-label">Full Name</label><input class="form-input" id="setup-name" placeholder="Enter your full name" value="${me.name || ''}"></div>
          <div class="form-group"><label class="form-label">Year</label><select class="form-select" id="setup-year"><option value="">Select</option><option>I</option><option>II</option><option>III</option><option>IV</option></select></div>
          <div class="form-group"><label class="form-label">Department</label><select class="form-select" id="setup-dept"><option value="">Select</option><option>AI &amp; DS</option><option>AI &amp; ML</option><option>CSE</option><option>ECE</option><option>CIVIL</option><option>MECH</option><option>CSBS</option></select></div>
          <div class="form-group"><label class="form-label">Section</label><select class="form-select" id="setup-section"><option value="">Select</option><option>A</option><option>B</option><option>C</option><option>D</option></select></div>
          <div class="form-group"><label class="form-label">Register Number</label><input class="form-input" id="setup-regno" placeholder="e.g. 20AI001"></div>
          <button class="btn btn-accent w-full" style="margin-top:8px" onclick="EC.studentProfile.saveSetup()">Continue &rarr;</button>
        </div>
      </div>
    `;
  },

  async saveSetup() {
    const name = document.getElementById('setup-name')?.value?.trim();
    const year = document.getElementById('setup-year')?.value;
    const dept = document.getElementById('setup-dept')?.value;
    const section = document.getElementById('setup-section')?.value;
    const regNo = document.getElementById('setup-regno')?.value?.trim();
    if (!name || !year || !dept || !section || !regNo) {
      EC.toast('Please fill in all fields', 'danger');
      return;
    }

    const me = EC.studentProfile.getCurrentStudent();
    if (!me?.id) {
      EC.toast('Could not load your profile. Please sign in again.', 'danger');
      return;
    }

    try {
      const updated = await EC.api.updateProfile(me.id, {
        name,
        year,
        dept,
        section,
        regNo,
        profileImageUrl: me.profileImageUrl || ''
      });
      EC.studentProfile.syncStudent(updated);
      EC.toast('Profile setup complete! \u{1F389}', 'success');
      EC.app.buildShell();
      EC.studentProfile.render(document.getElementById('page-content-area'));
    } catch (error) {
      EC.toast(error.message || 'Could not save your profile', 'danger');
    }
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
            <div class="form-group"><label class="form-label">Full Name</label><input class="form-input" id="edit-name" value="${me.name || ''}"></div>
            <div class="form-group"><label class="form-label">Year</label><select class="form-select" id="edit-year"><option ${me.year === 'I' ? 'selected' : ''}>I</option><option ${me.year === 'II' ? 'selected' : ''}>II</option><option ${me.year === 'III' ? 'selected' : ''}>III</option><option ${me.year === 'IV' ? 'selected' : ''}>IV</option></select></div>
            <div class="form-group"><label class="form-label">Department</label><select class="form-select" id="edit-dept"><option ${me.dept === 'AI & DS' ? 'selected' : ''}>AI &amp; DS</option><option>AI &amp; ML</option><option>CSE</option><option>ECE</option><option>CIVIL</option><option>MECH</option><option>CSBS</option></select></div>
            <div class="form-group"><label class="form-label">Section</label><select class="form-select" id="edit-section"><option ${me.section === 'A' ? 'selected' : ''}>A</option><option ${me.section === 'B' ? 'selected' : ''}>B</option><option ${me.section === 'C' ? 'selected' : ''}>C</option><option ${me.section === 'D' ? 'selected' : ''}>D</option></select></div>
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
    const me = EC.studentProfile.getCurrentStudent();
    if (me) {
      me.name = document.getElementById('edit-name')?.value?.trim();
      me.year = document.getElementById('edit-year')?.value;
      me.dept = document.getElementById('edit-dept')?.value;
      me.section = document.getElementById('edit-section')?.value;
      me.regNo = document.getElementById('edit-regno')?.value?.trim();
      if (!me.name || !me.year || !me.dept || !me.section || !me.regNo) {
        EC.toast('Please fill in all fields', 'danger');
        return;
      }
      try {
        const file = document.getElementById('edit-profile-image')?.files?.[0];
        let profileImageUrl = me.profileImageUrl || '';
        if (file) {
          const uploaded = await EC.api.uploadProfileImage(me.id, file);
          profileImageUrl = uploaded?.profileImageUrl || uploaded?.data?.profileImageUrl || profileImageUrl;
        }
        const updated = await EC.api.updateProfile(me.id, {
          name: me.name,
          year: me.year,
          dept: me.dept,
          section: me.section,
          regNo: me.regNo,
          profileImageUrl
        });
        EC.studentProfile.syncStudent(updated);
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
    const me = EC.studentProfile.getCurrentStudent();
    const recentXp = Array.isArray(me?.xpLog) ? me.xpLog.slice().reverse() : [];
    return `
      <div class="scroll-panel" style="padding:8px 20px 20px">
        ${recentXp.length
          ? recentXp.map(entry => `
              <div style="display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid var(--border-soft)">
                <div>
                  <div style="font-weight:600">${entry.reason || 'XP update'}</div>
                  <div style="font-size:12px;color:var(--text-muted)">${entry.date ? formatDateTime(entry.date) : 'Just now'}</div>
                </div>
                <div style="font-weight:700;color:${Number(entry.amount || 0) >= 0 ? 'var(--success)' : 'var(--danger)'}">${Number(entry.amount || 0) > 0 ? '+' : ''}${Number(entry.amount || 0)}</div>
              </div>
            `).join('')
          : `<div style="padding-top:12px;color:var(--text-muted);font-size:13px">Your XP activity will appear here once grading and rewards are recorded.</div>`
        }
      </div>
    `;
  },

  fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Could not read the selected image.'));
      reader.readAsDataURL(file);
    });
  },

  getCurrentStudent() {
    const myId = EC.state.myId || EC.state.currentUser?.id;
    return EC.getStudent(myId) || (EC.state.currentUser ? EC.studentProfile.ensureStudentState(EC.state.currentUser) : null);
  },

  ensureStudentState(user) {
    const userId = user?.id || user?._id;
    if (!userId) return null;
    const normalized = {
      id: userId,
      name: user.name || 'Student',
      email: user.email || '',
      initials: user.initials || (user.name || 'Student').split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase(),
      level: user.level || EC.levelFromXp(Number(user.xp || 0)),
      xp: Number(user.xp || 0),
      rank: Number(user.rank || 0),
      streak: Number(user.streak || 0),
      tasks: Number(user.tasksCompleted || user.tasks || 0),
      color: user.color || '#1a3a8f',
      heroRole: user.heroRole || 'mage',
      regNo: user.regNo || '',
      year: user.year || '',
      dept: user.dept || '',
      section: user.section || '',
      motivationQuote: user.motivationQuote || '',
      profileImageUrl: user.profileImageUrl || '',
      xpLog: Array.isArray(user.xpLog) ? user.xpLog : [],
      badgeShowcase: Array.isArray(user.badgeShowcase) ? user.badgeShowcase : [],
      unlockedBadges: Array.isArray(user.unlockedBadges) ? user.unlockedBadges : []
    };
    const existingIndex = EC.state.students.findIndex(student => String(student.id) === String(normalized.id));
    if (existingIndex >= 0) {
      EC.state.students[existingIndex] = { ...EC.state.students[existingIndex], ...normalized };
      return EC.state.students[existingIndex];
    }
    EC.state.students.push(normalized);
    return normalized;
  },

  syncStudent(updated) {
    const student = EC.studentProfile.ensureStudentState(updated);
    if (student) {
      EC.state.currentUser = { ...EC.state.currentUser, ...student };
      EC.state.myId = student.id;
      EC.state.myXp = student.xp;
      EC.state.myLevel = student.level;
      EC.state.myRank = student.rank;
      EC.state.myStreak = student.streak;
      const saved = localStorage.getItem('ec_user');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          parsed.user = { ...parsed.user, ...student };
          localStorage.setItem('ec_user', JSON.stringify(parsed));
        } catch (error) {
          // Ignore malformed session data.
        }
      }
    }
    return student;
  }
};
