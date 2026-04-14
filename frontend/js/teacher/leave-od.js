window.EC = window.EC || {};

EC.teacherLeave = {
  render(el) {
    el.innerHTML = `
      <div class="page-header">
        <div><h2 class="page-title">Leave / OD Requests</h2><p class="page-subtitle">Review, approve or reject student leave and OD applications.</p></div>
      </div>
      <div class="tab-bar mb-20">
        <button class="tab-btn active" id="tab-pending" onclick="EC.teacherLeave.showTab('pending')">Pending <span class="nav-badge red">${EC.state.leaveRequests.filter(request => request.status === 'pending').length}</span></button>
        <button class="tab-btn" id="tab-history" onclick="EC.teacherLeave.showTab('history')">History</button>
      </div>
      <div id="leave-content">${EC.teacherLeave.renderPending()}</div>
      ${EC.teacherLeave.rejectModal()}
    `;
  },

  renderPending() {
    const pending = EC.state.leaveRequests.filter(request => request.status === 'pending');
    if (!pending.length) {
      return `<div class="card animate-in" style="text-align:center;padding:40px"><div style="font-size:18px;font-weight:700">All clear</div><div style="color:var(--text-muted);margin-top:8px">No pending leave or OD requests.</div></div>`;
    }
    return pending.map(request => EC.teacherLeave.renderCard(request)).join('');
  },

  renderHistory() {
    const history = EC.state.leaveRequests.filter(request => request.status !== 'pending');
    if (!history.length) {
      return `<div class="card animate-in" style="text-align:center;padding:40px;color:var(--text-muted)">No history yet.</div>`;
    }
    return history.map(request => EC.teacherLeave.renderCard(request, true)).join('');
  },

  renderCard(request, isHistory = false) {
    const student = EC.getStudent(request.studentId);
    const statusColor = request.status === 'approved' ? 'var(--success)' : request.status === 'rejected' ? 'var(--danger)' : 'var(--warning)';
    return `
      <div class="card mb-16 animate-in">
        <div style="display:flex;align-items:flex-start;gap:14px;padding:20px">
          <div class="avatar avatar-sm" style="background:${student?.color || '#1a3a8f'};flex-shrink:0">${student?.initials || '?'}</div>
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
              <div style="font-weight:700;font-size:15px">${request.studentName}</div>
              <span class="tag" style="background:${request.type === 'od' ? '#fff8e6' : '#f0f9ff'};color:${request.type === 'od' ? '#b45309' : '#0369a1'}">${request.type.toUpperCase()}</span>
              ${isHistory ? `<span class="tag" style="background:${statusColor}20;color:${statusColor}">${request.status}</span>` : ''}
            </div>
            <div style="font-size:13px;color:var(--text-mid)">Date: ${request.date} • Submitted: ${request.submittedAt}</div>
            <div style="font-size:14px;color:var(--text-mid);line-height:1.6;margin-top:10px">${request.reason}</div>
            ${request.rejectReason ? `<div style="margin-top:10px;padding:10px;background:var(--danger-bg);border-left:3px solid var(--danger);border-radius:6px;font-size:13px;color:var(--danger)">Rejection reason: ${request.rejectReason}</div>` : ''}
          </div>
          ${!isHistory ? `
            <div style="display:flex;flex-direction:column;gap:8px;flex-shrink:0">
              <button class="btn btn-success btn-sm" onclick="EC.teacherLeave.approve('${request.id}')">Approve</button>
              <button class="btn btn-danger btn-sm" onclick="EC.teacherLeave.openReject('${request.id}')">Reject</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  },

  rejectModal() {
    return `
      <div class="overlay" id="reject-modal">
        <div class="modal" style="max-width:480px">
          <div class="modal-header">
            <div class="modal-title">Reject Request</div>
            <button class="modal-close" onclick="EC.teacherLeave.closeReject()">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Rejection Reason</label>
              <textarea class="form-textarea" id="reject-reason-input" placeholder="Explain why this request is rejected." rows="4" style="min-height:120px"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="EC.teacherLeave.closeReject()">Cancel</button>
            <button class="btn btn-danger" onclick="EC.teacherLeave.confirmReject()">Confirm Rejection</button>
          </div>
        </div>
      </div>
    `;
  },

  _rejectId: null,

  openReject(id) {
    EC.teacherLeave._rejectId = id;
    const input = document.getElementById('reject-reason-input');
    if (input) input.value = '';
    document.getElementById('reject-modal')?.classList.add('open');
  },

  closeReject() {
    document.getElementById('reject-modal')?.classList.remove('open');
  },

  async approve(id) {
    try {
      const updated = await EC.api.approveLeave(id);
      const index = EC.state.leaveRequests.findIndex(request => String(request.id) === String(updated.id));
      if (index >= 0) EC.state.leaveRequests[index] = updated;
      if (updated.type === 'od' || updated.type === 'leave') {
        EC.teacherAttendance.markStudentOD(updated.studentId, updated.date);
      }
      EC.app.updateNavBadges();
      EC.toast(updated.type === 'od' ? 'OD approved and synced to attendance.' : 'Leave approved.', 'success');
      EC.teacherLeave.render(document.getElementById('page-content-area'));
    } catch (err) {
      EC.toast(err.message || 'Could not approve request', 'danger');
    }
  },

  async confirmReject() {
    const reason = document.getElementById('reject-reason-input')?.value?.trim();
    if (!reason) {
      EC.toast('Please enter a rejection reason', 'danger');
      return;
    }
    try {
      const updated = await EC.api.rejectLeave(EC.teacherLeave._rejectId, reason);
      const index = EC.state.leaveRequests.findIndex(request => String(request.id) === String(updated.id));
      if (index >= 0) EC.state.leaveRequests[index] = updated;
      EC.teacherLeave.closeReject();
      EC.app.updateNavBadges();
      EC.toast('Request rejected.', 'warning');
      EC.teacherLeave.render(document.getElementById('page-content-area'));
    } catch (err) {
      EC.toast(err.message || 'Could not reject request', 'danger');
    }
  },

  showTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(button => button.classList.remove('active'));
    document.getElementById(`tab-${tab}`)?.classList.add('active');
    const content = document.getElementById('leave-content');
    if (!content) return;
    content.innerHTML = tab === 'pending' ? EC.teacherLeave.renderPending() : EC.teacherLeave.renderHistory();
  }
};
