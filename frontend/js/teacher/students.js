window.EC = window.EC || {};

EC.teacherStudents = {
  state: {
    profileCache: {}
  },

  render(el) {
    el.innerHTML = `
      <div class="page-header">
        <div><h2 class="page-title">Student Profiles</h2><p class="page-subtitle">View, monitor, and manage all students.</p></div>
      </div>
      <div class="student-grid animate-in">
        ${EC.state.students.map(student => this.renderCard(student)).join('')}
      </div>
      ${this.profileModal()}
      ${this.xpReduceModal()}
    `;
  },

  renderCard(student) {
    return `
      <div class="card student-card animate-in" onclick="EC.teacherStudents.openProfile('${student.id}')" style="cursor:pointer;transition:all 0.2s" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
          <div class="avatar" style="background:${student.color};width:48px;height:48px;font-size:16px;font-weight:700;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;background-image:url('${EC.getProfileImageUrl(student)}');background-size:cover;background-position:center;color:transparent;">${student.initials}</div>
          <div style="flex:1">
            <div style="font-weight:700;font-size:15px">${student.name}</div>
            <div style="font-size:12px;color:var(--text-muted)">${student.level} • Rank #${student.rank}</div>
          </div>
          ${student.tasks < 3 ? '<span class="tag" style="background:var(--danger-bg);color:var(--danger)">Alert</span>' : ''}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
          <div style="background:var(--surface);border-radius:8px;padding:8px;text-align:center"><div style="font-size:18px;font-weight:700;color:var(--royal)">${student.xp}</div><div style="font-size:10px;color:var(--text-muted)">XP</div></div>
          <div style="background:var(--surface);border-radius:8px;padding:8px;text-align:center"><div style="font-size:18px;font-weight:700;color:var(--accent-dark)">${student.tasks || 0}</div><div style="font-size:10px;color:var(--text-muted)">Tasks</div></div>
        </div>
        <div style="display:flex;justify-content:flex-end;font-size:12px;color:var(--text-muted)">🔥 ${student.streak}d streak</div>
      </div>
    `;
  },

  _openId: null,

  async openProfile(id) {
    this._openId = String(id);
    const modal = document.getElementById('student-profile-modal');
    const body = document.getElementById('sp-body');
    if (!body) return;

    modal?.classList.add('open');
    body.innerHTML = `<div class="card" style="padding:24px;text-align:center;color:var(--text-muted)">Loading student profile...</div>`;

    try {
      const fallback = EC.getStudent(id) || {};
      const profile = await EC.api.getProfile(id);
      const full = {
        ...fallback,
        ...profile,
        id: profile?.id || profile?._id || fallback.id,
        badgeShowcase: (profile?.badgeShowcase || fallback.badgeShowcase || []).map(b => b?._id || b?.id || b),
        unlockedBadges: (profile?.unlockedBadges || fallback.unlockedBadges || []).map(b => b?._id || b?.id || b)
      };
      this.state.profileCache[String(id)] = full;
      this.renderProfile(full);
    } catch (err) {
      body.innerHTML = `<div class="card" style="padding:24px;color:var(--danger)">Could not load student profile. ${err.message || ''}</div>`;
    }
  },

  renderProfile(student) {
    const body = document.getElementById('sp-body');
    if (!body || !student) return;

    const showcase = (student.badgeShowcase || [])
      .map(id => EC.state.badges.find(entry => String(entry.id) === String(id)))
      .filter(Boolean);
    const unlocked = (student.unlockedBadges || [])
      .map(id => EC.state.badges.find(entry => String(entry.id) === String(id)))
      .filter(Boolean);
    const recentXp = Array.isArray(student.xpLog) ? student.xpLog.slice().reverse().slice(0, 6) : [];

    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid var(--border)">
        <div class="avatar" style="background:${student.color || '#1a3a8f'};width:76px;height:76px;font-size:24px;font-weight:700;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;background-image:url('${EC.getProfileImageUrl(student)}');background-size:cover;background-position:center;color:transparent;">${student.initials || 'ST'}</div>
        <div style="flex:1">
          <div style="font-family:'Playfair Display',serif;font-size:24px;font-weight:700">${student.name || 'Student'}</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:4px">${student.level || 'Initiate'} • Rank #${student.rank || 0}</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:4px">${student.email || 'No email'} • ${student.year || '-'} Year • ${student.dept || '-'} • Section ${student.section || '-'} • Reg: ${student.regNo || '-'}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
        <div class="card" style="text-align:center;padding:14px"><div style="font-size:22px;font-weight:700;color:var(--royal)">${student.xp || 0}</div><div style="font-size:11px;color:var(--text-muted)">Total XP</div></div>
        <div class="card" style="text-align:center;padding:14px"><div style="font-size:22px;font-weight:700;color:var(--accent-dark)">${student.tasks || 0}</div><div style="font-size:11px;color:var(--text-muted)">Tasks Done</div></div>
        <div class="card" style="text-align:center;padding:14px"><div style="font-size:22px;font-weight:700;color:var(--success)">${(student.unlockedBadges || []).length}</div><div style="font-size:11px;color:var(--text-muted)">Badges</div></div>
        <div class="card" style="text-align:center;padding:14px"><div style="font-size:22px;font-weight:700;color:var(--info)">🔥${student.streak || 0}</div><div style="font-size:11px;color:var(--text-muted)">Day Streak</div></div>
      </div>

      <div style="display:grid;grid-template-columns:1.2fr .8fr;gap:16px;margin-bottom:16px">
        <div class="card" style="padding:16px">
          <div style="font-weight:700;margin-bottom:10px">Full Details</div>
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 16px;font-size:13px">
            <div><strong>Unlocked Badges:</strong> ${unlocked.length}</div>
            <div><strong>Showcase Badges:</strong> ${showcase.length}</div>
            <div><strong>Profile Image:</strong> ${student.profileImageUrl ? 'Uploaded' : 'Default avatar'}</div>
          </div>
        </div>
        <div class="card" style="padding:16px">
          <div style="font-weight:700;margin-bottom:10px">Badge Showcase</div>
          ${showcase.length
            ? `<div style="display:flex;gap:10px;flex-wrap:wrap">${showcase.map(badge => `
                <div style="min-width:78px;text-align:center;background:var(--surface);padding:10px;border-radius:12px">
                  <div style="font-size:24px">${badge.icon}</div>
                  <div style="font-size:11px;font-weight:700;margin-top:6px">${badge.name}</div>
                </div>
              `).join('')}</div>`
            : `<div style="color:var(--text-muted);font-size:13px">No showcase badges yet.</div>`
          }
        </div>
      </div>

      <div class="card" style="padding:16px;margin-bottom:16px">
        <div style="font-weight:700;margin-bottom:10px">Recent XP Activity</div>
        <div style="max-height:240px;overflow:auto">
        ${recentXp.length
          ? recentXp.map(entry => `
              <div style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-soft)">
                <div>
                  <div style="font-weight:600">${entry.reason || 'XP update'}</div>
                  <div style="font-size:12px;color:var(--text-muted)">${entry.date ? formatDateTime(entry.date) : 'Just now'}</div>
                </div>
                <div style="font-weight:700;color:${Number(entry.amount || 0) >= 0 ? 'var(--success)' : 'var(--danger)'}">${Number(entry.amount || 0) > 0 ? '+' : ''}${Number(entry.amount || 0)}</div>
              </div>
            `).join('')
          : `<div style="color:var(--text-muted);font-size:13px">No XP history recorded yet.</div>`
        }
        </div>
      </div>

      <div class="form-group">
        <div class="section-title">Private Notes</div>
        <textarea class="form-textarea" id="student-notes-${student.id}" placeholder="Add private notes about this student..." style="min-height:80px">${student.notes || ''}</textarea>
        <button class="btn btn-outline btn-sm" style="margin-top:8px" onclick="EC.teacherStudents.saveNotes('${student.id}')">Save Notes</button>
      </div>

      <div style="background:var(--danger-bg);border:1px solid var(--danger);border-radius:var(--radius-sm);padding:16px;margin-top:16px">
        <div style="font-weight:700;color:var(--danger);margin-bottom:8px">Reduce XP</div>
        <div style="font-size:13px;color:var(--text-mid);margin-bottom:12px">Deduct XP for missed tasks, misconduct, or other reasons. The student sees the reason in their XP log.</div>
        <button class="btn btn-danger btn-sm" onclick="EC.teacherStudents.openXpReduce('${student.id}')">- Reduce XP</button>
      </div>
    `;
  },

  async saveNotes(id) {
    const value = document.getElementById(`student-notes-${id}`)?.value || '';
    try {
      const updated = await EC.api.updateStudentAdmin(id, { notes: value });
      const merged = { ...(this.state.profileCache[String(id)] || EC.getStudent(id) || {}), ...updated };
      this.state.profileCache[String(id)] = merged;
      const studentIndex = EC.state.students.findIndex(student => String(student.id) === String(id));
      if (studentIndex >= 0) {
        EC.state.students[studentIndex] = { ...EC.state.students[studentIndex], ...updated };
      }
      EC.toast('Notes saved', 'success');
    } catch (err) {
      EC.toast(err.message || 'Could not save notes', 'danger');
    }
  },

  profileModal() {
    return `
      <div class="overlay" id="student-profile-modal" style="z-index:210">
        <div class="modal modal-lg">
          <div class="modal-header">
            <div class="modal-title">Student Profile</div>
            <button class="modal-close" onclick="document.getElementById('student-profile-modal').classList.remove('open')">X</button>
          </div>
          <div class="modal-body" id="sp-body" style="max-height:70vh;overflow-y:auto"></div>
        </div>
      </div>
    `;
  },

  openXpReduce(id) {
    this._openId = String(id);
    const student = this.state.profileCache[String(id)] || EC.getStudent(id);
    if (!student) return;
    const label = document.getElementById('xp-reduce-student');
    if (label) label.textContent = `Reduce XP for ${student.name} (Current: ${student.xp} XP)`;
    document.getElementById('xp-reduce-amount').value = '';
    document.getElementById('xp-reduce-reason').value = '';
    document.getElementById('xp-reduce-error').style.display = 'none';
    document.getElementById('xp-reduce-modal')?.classList.add('open');
  },

  xpReduceModal() {
    return `
      <div class="overlay" id="xp-reduce-modal" style="z-index:220">
        <div class="modal" style="max-width:440px">
          <div class="modal-header">
            <div class="modal-title">Reduce XP</div>
            <button class="modal-close" onclick="document.getElementById('xp-reduce-modal').classList.remove('open')">X</button>
          </div>
          <div class="modal-body">
            <div id="xp-reduce-student" style="font-weight:600;margin-bottom:16px;color:var(--text-mid)"></div>
            <div id="xp-reduce-error" style="display:none;background:var(--danger-bg);border:1px solid var(--danger);border-radius:8px;padding:10px 14px;font-size:13px;color:var(--danger);margin-bottom:12px;font-weight:600"></div>
            <div class="form-group"><label class="form-label">Amount to Deduct *</label><input class="form-input" id="xp-reduce-amount" type="number" min="1" placeholder="e.g. 50"></div>
            <div class="form-group"><label class="form-label">Reason *</label><textarea class="form-textarea" id="xp-reduce-reason" placeholder="Reason for XP deduction (visible to student in their XP log)"></textarea></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="document.getElementById('xp-reduce-modal').classList.remove('open')">Cancel</button>
            <button class="btn btn-danger" onclick="EC.teacherStudents.confirmXpReduce()">Confirm Reduction</button>
          </div>
        </div>
      </div>
    `;
  },

  async confirmXpReduce() {
    const id = this._openId;
    const amount = parseInt(document.getElementById('xp-reduce-amount')?.value, 10);
    const reason = document.getElementById('xp-reduce-reason')?.value?.trim();
    const errEl = document.getElementById('xp-reduce-error');
    const student = this.state.profileCache[String(id)] || EC.getStudent(id);

    if (!amount || amount <= 0) {
      if (errEl) {
        errEl.textContent = 'Please enter a valid amount to deduct.';
        errEl.style.display = '';
      }
      return;
    }
    if (!reason) {
      if (errEl) {
        errEl.textContent = 'Reason is required.';
        errEl.style.display = '';
      }
      return;
    }
    if (student && amount > student.xp) {
      if (errEl) {
        errEl.textContent = `${student.name} only has ${student.xp} XP. You cannot deduct ${amount} XP.`;
        errEl.style.display = '';
      }
      return;
    }
    if (student) {
      try {
        const updated = await EC.api.updateStudentAdmin(id, { xpDelta: -amount, xpReason: reason });
        const merged = { ...student, ...updated };
        this.state.profileCache[String(id)] = merged;
        const studentIndex = EC.state.students.findIndex(entry => String(entry.id) === String(id));
        if (studentIndex >= 0) {
          EC.state.students[studentIndex] = {
            ...EC.state.students[studentIndex],
            ...updated,
            tasks: EC.state.students[studentIndex].tasks
          };
        }
        if (errEl) errEl.style.display = 'none';
        EC.toast(`-${amount} XP deducted from ${student.name}. Reason logged.`, 'warning');
        document.getElementById('xp-reduce-modal')?.classList.remove('open');
        if (this.state.profileCache[String(id)]) this.renderProfile(this.state.profileCache[String(id)]);
        this.render(document.getElementById('page-content-area'));
      } catch (err) {
        if (errEl) {
          errEl.textContent = err.message || 'Could not reduce XP.';
          errEl.style.display = '';
        }
      }
    }
  }
};
