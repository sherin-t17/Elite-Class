/* ============================================================
   TEACHER STUDENTS — XP reduce validation, removed "(teacher only)" labels
   ============================================================ */
window.EC = window.EC || {};

EC.teacherStudents = {
  render(el) {
    el.innerHTML = `
      <div class="page-header">
        <div><h2 class="page-title">👥 Student Profiles</h2><p class="page-subtitle">View, monitor and manage all students</p></div>
      </div>
      <div class="student-grid animate-in">
        ${EC.state.students.map(s => EC.teacherStudents.renderCard(s)).join('')}
      </div>
      ${EC.teacherStudents.profileModal()}
      ${EC.teacherStudents.xpReduceModal()}
    `;
  },

  renderCard(s) {
    return `
      <div class="card student-card animate-in" onclick="EC.teacherStudents.openProfile(${s.id})" style="cursor:pointer;transition:all 0.2s" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
          <div class="avatar" style="background:${s.color};width:48px;height:48px;font-size:16px;font-weight:700;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff">${s.initials}</div>
          <div style="flex:1">
            <div style="font-weight:700;font-size:15px">${s.name}</div>
            <div style="font-size:12px;color:var(--text-muted)">${s.level} • Rank #${s.rank}</div>
          </div>
          ${s.tasks < 3 ? '<span class="tag" style="background:var(--danger-bg);color:var(--danger)">⚠️ Alert</span>' : ''}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
          <div style="background:var(--surface);border-radius:8px;padding:8px;text-align:center"><div style="font-size:18px;font-weight:700;color:var(--royal)">${s.xp}</div><div style="font-size:10px;color:var(--text-muted)">XP</div></div>
          <div style="background:var(--surface);border-radius:8px;padding:8px;text-align:center"><div style="font-size:18px;font-weight:700;color:var(--success)">${s.attendance}%</div><div style="font-size:10px;color:var(--text-muted)">Attendance</div></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div></div>
          <div style="font-size:12px;color:var(--text-muted)">🔥 ${s.streak}d streak</div>
        </div>
      </div>
    `;
  },

  _openId: null,

  openProfile(id) {
    EC.teacherStudents._openId = id;
    const s    = EC.getStudent(id);
    if (!s) return;
    const body = document.getElementById('sp-body');
    if (!body) return;

    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid var(--border)">
        <div class="avatar" style="background:${s.color};width:64px;height:64px;font-size:22px;font-weight:700;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff">${s.initials}</div>
        <div>
          <div style="font-family:'Playfair Display',serif;font-size:22px;font-weight:700">${s.name}</div>
          <div style="font-size:13px;color:var(--text-muted)">${s.level} • Rank #${s.rank}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
        <div class="card" style="text-align:center;padding:14px"><div style="font-size:22px;font-weight:700;color:var(--royal)">${s.xp}</div><div style="font-size:11px;color:var(--text-muted)">Total XP</div></div>
        <div class="card" style="text-align:center;padding:14px"><div style="font-size:22px;font-weight:700;color:var(--success)">${s.attendance}%</div><div style="font-size:11px;color:var(--text-muted)">Attendance</div></div>
        <div class="card" style="text-align:center;padding:14px"><div style="font-size:22px;font-weight:700;color:var(--accent-dark)">${s.tasks}</div><div style="font-size:11px;color:var(--text-muted)">Tasks Done</div></div>
        <div class="card" style="text-align:center;padding:14px"><div style="font-size:22px;font-weight:700;color:var(--info)">🔥${s.streak}</div><div style="font-size:11px;color:var(--text-muted)">Day Streak</div></div>
      </div>

      <div class="form-group">
        <div class="section-title">Private Notes</div>
        <textarea class="form-textarea" id="student-notes-${s.id}" placeholder="Add private notes about this student..." style="min-height:80px">${s.notes || ''}</textarea>
        <button class="btn btn-outline btn-sm" style="margin-top:8px" onclick="EC.teacherStudents.saveNotes(${s.id})">💾 Save Notes</button>
      </div>

      <div style="background:var(--danger-bg);border:1px solid var(--danger);border-radius:var(--radius-sm);padding:16px;margin-top:16px">
        <div style="font-weight:700;color:var(--danger);margin-bottom:8px">⚠️ Reduce XP</div>
        <div style="font-size:13px;color:var(--text-mid);margin-bottom:12px">Deduct XP for missed tasks, misconduct or other reasons. Student sees reason in their XP log.</div>
        <button class="btn btn-danger btn-sm" onclick="EC.teacherStudents.openXpReduce(${s.id})">− Reduce XP</button>
      </div>
    `;
    document.getElementById('student-profile-modal')?.classList.add('open');
  },

  saveNotes(id) {
    const s   = EC.getStudent(id);
    const val = document.getElementById(`student-notes-${id}`)?.value;
    if (s) s.notes = val;
    EC.toast('Notes saved', 'success');
  },

  profileModal() {
    return `
      <div class="overlay" id="student-profile-modal" style="z-index:210">
        <div class="modal modal-lg">
          <div class="modal-header">
            <div class="modal-title">Student Profile</div>
            <button class="modal-close" onclick="document.getElementById('student-profile-modal').classList.remove('open')">✕</button>
          </div>
          <div class="modal-body" id="sp-body" style="max-height:70vh;overflow-y:auto"></div>
        </div>
      </div>
    `;
  },

  openXpReduce(id) {
    EC.teacherStudents._openId = id;
    const s = EC.getStudent(id);
    if (!s) return;
    const label = document.getElementById('xp-reduce-student');
    if (label) label.textContent = `Reduce XP for ${s.name} (Current: ${s.xp} XP)`;
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
            <div class="modal-title">⚠️ Reduce XP</div>
            <button class="modal-close" onclick="document.getElementById('xp-reduce-modal').classList.remove('open')">✕</button>
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

  confirmXpReduce() {
    const id     = EC.teacherStudents._openId;
    const amount = parseInt(document.getElementById('xp-reduce-amount')?.value);
    const reason = document.getElementById('xp-reduce-reason')?.value?.trim();
    const errEl  = document.getElementById('xp-reduce-error');
    const s      = EC.getStudent(id);

    if (!amount || amount <= 0) {
      if (errEl) { errEl.textContent = 'Please enter a valid amount to deduct.'; errEl.style.display = ''; }
      return;
    }
    if (!reason) {
      if (errEl) { errEl.textContent = 'Reason is required.'; errEl.style.display = ''; }
      return;
    }
    // Check if student has enough XP
    if (s && amount > s.xp) {
      if (errEl) {
        errEl.textContent = `${s.name} only has ${s.xp} XP. You cannot deduct ${amount} XP.`;
        errEl.style.display = '';
      }
      return;
    }
    if (s) {
      s.xp = Math.max(0, s.xp - amount);
      if (errEl) errEl.style.display = 'none';
      EC.toast(`−${amount} XP deducted from ${s.name}. Reason logged.`, 'warning');
      document.getElementById('xp-reduce-modal')?.classList.remove('open');
      EC.teacherStudents.render(document.getElementById('page-content-area'));
    }
  },
};
