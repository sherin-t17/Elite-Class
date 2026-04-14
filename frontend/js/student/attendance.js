window.EC = window.EC || {};

EC.studentAttendance = {
  render(el) {
    const todayRecord = EC.state.attendance?.records?.find(record => String(record.studentId) === String(EC.state.myId));
    const leaveCount = EC.state.leaveRequests.filter(request => request.status === 'approved' && request.type === 'leave').length;
    const odCount = EC.state.leaveRequests.filter(request => request.status === 'approved' && request.type === 'od').length;
    const rewardPoints = odCount + leaveCount;
    const status = todayRecord?.status || 'absent';
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const inWindow = minutes >= 540 && minutes <= 570;

    el.innerHTML = `
      <div class="page-header">
        <div><h2 class="page-title">Attendance</h2><p class="page-subtitle">Self-mark attendance between 9:00 AM and 9:30 AM. Leave/OD updates sync here automatically.</p></div>
      </div>

      <div class="two-col-wide">
        <div>
          <div class="card mb-16">
            <div class="card-header"><div class="card-title">Today</div></div>
            <div class="card-body">
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
                <div class="card" style="padding:14px;text-align:center"><div style="font-size:22px;font-weight:800;color:${status === 'present' ? 'var(--success)' : status === 'od' || status === 'leave' ? 'var(--royal)' : 'var(--danger)'}">${status.toUpperCase()}</div><div style="font-size:11px;color:var(--text-muted)">Current status</div></div>
                <div class="card" style="padding:14px;text-align:center"><div style="font-size:22px;font-weight:800;color:var(--royal)">${rewardPoints}</div><div style="font-size:11px;color:var(--text-muted)">Reward points</div></div>
                <div class="card" style="padding:14px;text-align:center"><div style="font-size:22px;font-weight:800;color:var(--warning)">${leaveCount}</div><div style="font-size:11px;color:var(--text-muted)">Approved leave</div></div>
                <div class="card" style="padding:14px;text-align:center"><div style="font-size:22px;font-weight:800;color:var(--info)">${odCount}</div><div style="font-size:11px;color:var(--text-muted)">Approved OD</div></div>
              </div>
              <div style="margin-top:16px;padding:14px;border-radius:12px;background:var(--surface)">
                <div style="font-weight:700">Attendance window</div>
                <div style="font-size:13px;color:var(--text-muted);margin-top:4px">Mark yourself present only between 9:00 AM and 9:30 AM. Proxy misuse can lead to a 50% points cut.</div>
                <button class="btn btn-accent" style="margin-top:12px" ${inWindow && status !== 'present' ? '' : 'disabled'} onclick="EC.studentAttendance.markPresent()">${status === 'present' ? 'Already marked present' : inWindow ? 'Mark Present' : 'Window closed'}</button>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><div class="card-title">Rules</div></div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:10px">
              <div>Present inside the window: no penalty.</div>
              <div>Late marking: -1, -3, -5, then -10 points/day after 3 days.</div>
              <div>Valid Leave / OD: +1 point per approved request.</div>
              <div>Unauthorized absence: -5 points.</div>
            </div>
          </div>
        </div>

        <div>
          <div class="card">
            <div class="card-header"><div class="card-title">Recent Leave / OD Sync</div></div>
            <div class="card-body" style="max-height:460px;overflow:auto">
              ${(EC.state.leaveRequests || []).length ? EC.state.leaveRequests.map(request => `
                <div style="padding:12px 0;border-bottom:1px solid var(--border-soft)">
                  <div style="font-weight:700">${request.type.toUpperCase()} • ${request.date}</div>
                  <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${request.reason}</div>
                  <div style="font-size:12px;margin-top:4px;color:${request.status === 'approved' ? 'var(--success)' : request.status === 'rejected' ? 'var(--danger)' : 'var(--warning)'}">${request.status}</div>
                </div>
              `).join('') : `<div style="color:var(--text-muted)">No leave or OD requests yet.</div>`}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async markPresent() {
    try {
      EC.state.attendance = await EC.api.selfMarkAttendance();
      EC.toast('Attendance marked successfully.', 'success');
      EC.studentAttendance.render(document.getElementById('page-content-area'));
    } catch (err) {
      EC.toast(err.message || 'Could not mark attendance', 'danger');
    }
  }
};
