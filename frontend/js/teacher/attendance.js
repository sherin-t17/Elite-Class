window.EC = window.EC || {};

EC.teacherAttendance = {
  async render(el) {
    const approved = EC.state.leaveRequests.filter(request => request.status === 'approved');
    el.innerHTML = `
      <div class="page-header">
        <div><h2 class="page-title">Attendance</h2><p class="page-subtitle">Attendance, leave/OD sync, reward points and manual corrections in one place.</p></div>
        <div class="page-header-actions">
          <button class="btn btn-outline btn-sm" onclick="EC.api.exportExcel('attendance')">Export</button>
        </div>
      </div>

      <div class="two-col-wide">
        <div class="card">
          <div class="card-header"><div class="card-title">Class Status Table</div></div>
          <div class="card-body" style="padding:0">
            <div style="max-height:68vh;overflow:auto">
              <table style="width:100%;border-collapse:collapse">
                <thead style="position:sticky;top:0;background:var(--surface)">
                  <tr>
                    <th style="padding:12px;text-align:left">Student</th>
                    <th style="padding:12px;text-align:left">Attendance</th>
                    <th style="padding:12px;text-align:left">Leave / OD</th>
                    <th style="padding:12px;text-align:left">Points</th>
                    <th style="padding:12px;text-align:left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${EC.state.students.map(student => {
                    const record = EC.state.attendance.records.find(item => String(item.studentId) === String(student.id));
                    const request = approved.find(item => String(item.studentId) === String(student.id));
                    const attendanceStatus = request?.type || record?.status || 'absent';
                    const points = (request ? 1 : 0) + (attendanceStatus === 'present' ? 0 : attendanceStatus === 'absent' ? -5 : 0);
                    return `
                      <tr style="border-top:1px solid var(--border-soft)">
                        <td style="padding:12px;font-weight:700">${student.name}</td>
                        <td style="padding:12px;text-transform:uppercase">${attendanceStatus}</td>
                        <td style="padding:12px">${request ? `${request.type.toUpperCase()} • ${request.date}` : 'None'}</td>
                        <td style="padding:12px;color:${points >= 0 ? 'var(--success)' : 'var(--danger)'}">${points}</td>
                        <td style="padding:12px">
                          <div style="display:flex;gap:6px;flex-wrap:wrap">
                            <button class="btn btn-success btn-sm" onclick="EC.teacherAttendance.setStatus('${student.id}','present')">Present</button>
                            <button class="btn btn-danger btn-sm" onclick="EC.teacherAttendance.setStatus('${student.id}','absent')">Absent</button>
                            <button class="btn btn-outline btn-sm" onclick="EC.teacherAttendance.setStatus('${student.id}','od')">OD</button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <div class="card mb-16">
            <div class="card-header"><div class="card-title">Points Logic</div></div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:10px">
              <div>Present marked honestly: no penalty.</div>
              <div>Leave / OD approved: +1 point.</div>
              <div>Unauthorized absence: -5 points.</div>
              <div>Proxy / misuse detected later: 50% current points can be removed manually.</div>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><div class="card-title">Approved Leave / OD</div></div>
            <div class="card-body" style="max-height:320px;overflow:auto">
              ${approved.length ? approved.map(item => `
                <div style="padding:12px 0;border-bottom:1px solid var(--border-soft)">
                  <div style="font-weight:700">${item.studentName}</div>
                  <div style="font-size:12px;color:var(--text-muted)">${item.type.toUpperCase()} • ${item.date}</div>
                </div>
              `).join('') : `<div style="color:var(--text-muted)">No approved leave or OD requests yet.</div>`}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async setStatus(studentId, status) {
    const existing = EC.state.attendance.records.find(record => String(record.studentId) === String(studentId));
    if (existing) existing.status = status;
    else EC.state.attendance.records.push({ studentId, status });
    try {
      const today = new Date().toISOString().split('T')[0];
      EC.state.attendance = await EC.api.markAttendance({ date: today, records: EC.state.attendance.records });
      EC.teacherAttendance.render(document.getElementById('page-content-area'));
    } catch (err) {
      EC.toast(err.message || 'Could not save attendance', 'danger');
    }
  },

  markStudentOD(studentId, date) {
    const record = EC.state.attendance.records.find(item => String(item.studentId) === String(studentId));
    if (record) record.status = 'od';
    else EC.state.attendance.records.push({ studentId, status: 'od' });
  }
};
