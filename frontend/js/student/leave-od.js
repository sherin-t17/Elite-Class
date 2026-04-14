/* ============================================================
   STUDENT LEAVE/OD — with rejection reason visible
   ============================================================ */
window.EC = window.EC || {};

EC.studentLeave = {
  render(el) {
    el.innerHTML = `
      <div class="page-header">
        <div><h2 class="page-title">📋 Leave / OD</h2><p class="page-subtitle">Apply for leave or OD permission</p></div>
      </div>
      <div class="tab-bar mb-20">
        <button class="tab-btn active" id="sl-new-tab" onclick="EC.studentLeave.showTab('new')">📝 New Request</button>
        <button class="tab-btn" id="sl-hist-tab" onclick="EC.studentLeave.showTab('history')">📜 History</button>
      </div>
      <div id="sl-content">
        ${EC.studentLeave.renderNew()}
      </div>
    `;
  },

  renderNew() {
    return `
      <div class="card animate-in" style="max-width:560px">
        <div style="padding:20px">
          <div style="font-weight:700;font-size:16px;margin-bottom:20px">Submit a New Request</div>
          <div class="form-group">
            <label class="form-label">Request Type</label>
            <div style="display:flex;gap:8px">
              <button class="btn btn-outline" id="type-leave" style="flex:1" onclick="EC.studentLeave.setType('leave',this)">🏖️ Leave</button>
              <button class="btn btn-primary" id="type-od" style="flex:1" onclick="EC.studentLeave.setType('od',this)">🏅 OD</button>
            </div>
          </div>
          <div id="sl-type-selected" style="display:none">
            <div class="form-group"><label class="form-label">Date(s)</label><input class="form-input" id="sl-date" type="date" min="${new Date().toISOString().split('T')[0]}"></div>
            <div class="form-group" id="sl-reason-group"><label class="form-label">Reason</label><textarea class="form-textarea" id="sl-reason" placeholder="Explain your reason clearly..."></textarea></div>
            <div class="form-group" id="sl-od-group" style="display:none"><label class="form-label">OD Details</label><input class="form-input" id="sl-od-event" placeholder="Event name"><input class="form-input" id="sl-od-org" placeholder="Organiser" style="margin-top:8px"><input class="form-input" id="sl-od-loc" placeholder="Location" style="margin-top:8px"></div>
            <button class="btn btn-accent w-full" onclick="EC.studentLeave.submitRequest()">Submit Request</button>
          </div>
          <div id="sl-type-prompt" style="text-align:center;padding:24px;color:var(--text-muted)">Select a request type above to continue</div>
        </div>
      </div>
    `;
  },

  _type: null,
  setType(type, btn) {
    EC.studentLeave._type = type;
    document.querySelectorAll('#sl-new-tab ~ * .btn-outline, #sl-content .btn-primary').forEach(b=>{
      b.classList.remove('btn-primary'); b.classList.add('btn-outline');
    });
    btn.classList.remove('btn-outline'); btn.classList.add('btn-primary');
    document.getElementById('sl-type-selected').style.display = '';
    document.getElementById('sl-type-prompt').style.display = 'none';
    document.getElementById('sl-reason-group').style.display = type==='leave' ? '' : 'none';
    document.getElementById('sl-od-group').style.display = type==='od' ? '' : 'none';
    document.getElementById('sl-reason').placeholder = type==='leave' ? 'Explain your reason clearly...' : '';
  },

  async submitRequest() {
    const date = document.getElementById('sl-date')?.value;
    if (!date) { EC.toast('Please select a date','danger'); return; }
    const type = EC.studentLeave._type;
    if (!type) return;
    let reason = '';
    if (type === 'leave') {
      reason = document.getElementById('sl-reason')?.value?.trim();
      if (!reason) { EC.toast('Please enter a reason','danger'); return; }
    } else {
      const ev  = document.getElementById('sl-od-event')?.value?.trim();
      const org = document.getElementById('sl-od-org')?.value?.trim();
      const loc = document.getElementById('sl-od-loc')?.value?.trim();
      if (!ev) { EC.toast('Please enter event name','danger'); return; }
      reason = `Event: ${ev}${org?' | Organiser: '+org:''}${loc?' | Location: '+loc:''}`;
    }
    try {
      const created = await EC.api.submitLeave({ type, reason, date });
      EC.state.leaveRequests.unshift(created);
      EC.toast('Request submitted. Teacher will review it.','success');
      EC.studentLeave.showTab('history');
    } catch (err) {
      EC.toast(err.message || 'Could not submit request', 'danger');
    }
  },

  renderHistory() {
    const myRequests = EC.state.leaveRequests.filter(r=>r.studentId===(EC.state.myId||1) || r.studentId===1);
    if (!myRequests.length) return `<div class="card" style="text-align:center;padding:40px;color:var(--text-muted)">No requests yet</div>`;
    const statusColor = {pending:'var(--warning)',approved:'var(--success)',rejected:'var(--danger)'};
    const statusIcon  = {pending:'⏳',approved:'✅',rejected:'❌'};
    return myRequests.map(r => `
      <div class="card mb-12 animate-in">
        <div style="padding:16px 20px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
            <span class="tag" style="background:${r.type==='od'?'#fff8e6':'#f0f9ff'};color:${r.type==='od'?'#b45309':'#0369a1'}">${r.type==='od'?'🏅':'🏖️'} ${r.type.toUpperCase()}</span>
            <span class="tag" style="background:${statusColor[r.status]}20;color:${statusColor[r.status]}">${statusIcon[r.status]} ${r.status.charAt(0).toUpperCase()+r.status.slice(1)}</span>
            <span style="font-size:12px;color:var(--text-muted)">📅 ${r.date}</span>
          </div>
          <div style="font-size:14px;color:var(--text-mid)">${r.reason}</div>
          ${r.rejectReason ? `<div style="margin-top:10px;padding:10px;background:var(--danger-bg);border-left:3px solid var(--danger);border-radius:6px;font-size:13px;color:var(--danger)"><strong>Rejection Reason:</strong> ${r.rejectReason}</div>` : ''}
          <div style="font-size:11px;color:var(--text-faint);margin-top:8px">Submitted: ${r.submittedAt}</div>
        </div>
      </div>
    `).join('');
  },

  showTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    document.getElementById(`sl-${tab==='new'?'new':'hist'}-tab`)?.classList.add('active');
    const content = document.getElementById('sl-content');
    if (content) content.innerHTML = tab==='new' ? EC.studentLeave.renderNew() : EC.studentLeave.renderHistory();
  }
};
