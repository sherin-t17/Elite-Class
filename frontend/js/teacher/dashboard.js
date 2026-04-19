window.EC = window.EC || {};

EC.teacherDashboard = {
  render(el) {
    const s = EC.state;
    const alertStudents = s.students.filter(student => student.tasks < 12);
    const pendingLeave = s.leaveRequests.filter(request => request.status === 'pending').length;
    const topStudent = s.students[0];
    const hasExamSchedule = Number.isFinite(Number(s.examDays)) && Number(s.examDays) >= 0 && Boolean(s.nextExam);
    const submittedTasks = s.tasks.filter(task => task.completions > 0).length;

    el.innerHTML = `
      <div class="stats-grid animate-in">
        <div class="stat-card blue"><div class="stat-icon">👥</div><div class="stat-value">${s.students.length}</div><div class="stat-label">Total Students</div><div class="stat-change up">Active class</div></div>
        <div class="stat-card green"><div class="stat-icon">🚀</div><div class="stat-value">${submittedTasks}</div><div class="stat-label">Tasks With Submissions</div><div class="stat-change up">${s.tasks.length} active task${s.tasks.length === 1 ? '' : 's'}</div></div>
        <div class="stat-card yellow"><div class="stat-icon">📋</div><div class="stat-value">${s.tasks.length}</div><div class="stat-label">Active Tasks</div><div class="stat-change up">${submittedTasks} with submissions</div></div>
        <div class="stat-card red"><div class="stat-icon">⚠️</div><div class="stat-value">${alertStudents.length}</div><div class="stat-label">Students Behind</div><div class="stat-change down">Need attention</div></div>
      </div>

      <div class="two-col animate-in animate-in-delay-2" style="margin-bottom:16px">
        ${hasExamSchedule
          ? `<div class="exam-countdown">
              <div class="countdown-icon">📚</div>
              <div>
                <div class="countdown-days">${s.examDays}</div>
                <div class="countdown-label">days until</div>
                <div class="countdown-exam">${s.nextExam}</div>
              </div>
            </div>`
          : `<div class="card">
              <div class="card-body" style="display:flex;align-items:center;gap:14px">
                <span style="font-size:36px">🗓️</span>
                <div style="flex:1">
                  <div style="font-weight:700;font-size:15px">Exam schedule not added yet</div>
                  <div style="font-size:12px;color:var(--text-muted);margin-top:3px">Add the upcoming exam details when they are finalized.</div>
                </div>
              </div>
            </div>`}
        <div class="card">
          <div class="card-body" style="display:flex;align-items:center;gap:14px">
            <span style="font-size:36px">📊</span>
            <div style="flex:1">
              <div style="font-weight:700;font-size:15px">Class Overview</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:3px">${pendingLeave} pending leave request${pendingLeave === 1 ? '' : 's'}</div>
              <button class="btn btn-sm" style="margin-top:10px;background:var(--accent);color:#000;font-weight:700;border:none;padding:7px 16px;border-radius:8px;cursor:pointer" onclick="EC.navigate('leaderboard')">View Leaderboard</button>
            </div>
          </div>
        </div>
      </div>

      <div class="two-col-wide animate-in animate-in-delay-2">
        <div>
          <div class="mvp-banner">
            <span class="mvp-crown">👑</span>
            <div>
              <div class="mvp-label">MVP of the Week</div>
              <div class="mvp-name">${topStudent ? topStudent.name : 'No student data yet'}</div>
              <div style="font-size:12px;font-weight:500;opacity:0.8">${topStudent ? `${topStudent.xp} XP • ${topStudent.streak}-day streak` : 'Waiting for live data.'}</div>
            </div>
          </div>

          ${alertStudents.length > 0 ? `
            <div class="card mb-20">
              <div class="card-header"><div class="card-title">Students Needing Attention</div><span class="tag" style="background:var(--danger-bg);color:var(--danger)">${alertStudents.length} flagged</span></div>
              <div class="card-body">
                ${alertStudents.map(student => `
                  <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--danger-bg);border-radius:var(--radius-sm);border-left:3px solid var(--danger);margin-bottom:8px">
                    <div class="avatar avatar-sm" style="background:${student.color};background-image:url('${EC.getProfileImageUrl(student)}');background-size:cover;background-position:center;color:transparent;">${student.initials}</div>
                    <div style="flex:1"><div style="font-weight:600;font-size:13px">${student.name}</div><div style="font-size:12px;color:var(--danger)">Only ${student.tasks} tasks • missing work</div></div>
                    <button class="btn btn-outline btn-sm" onclick="EC.navigate('students')">View</button>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div class="card">
            <div class="card-header"><div class="card-title">Recent Submissions</div><button class="btn btn-outline btn-sm" onclick="EC.navigate('tasks')">All Tasks</button></div>
            <div class="card-body">
              ${s.tasks.some(task => task.completions > 0)
                ? s.tasks.filter(task => task.completions > 0).slice(0, 3).map(task => `
                    <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--surface);border-radius:var(--radius-sm);margin-bottom:8px">
                      <div class="avatar avatar-sm">📄</div>
                      <div style="flex:1"><div style="font-weight:600;font-size:13px">${task.title}</div><div style="font-size:12px;color:var(--text-muted)">${task.completions} submission${task.completions === 1 ? '' : 's'} received</div></div>
                      <button class="btn btn-primary btn-sm" onclick="EC.navigate('tasks')">Review</button>
                    </div>
                  `).join('')
                : `<div style="font-size:13px;color:var(--text-muted)">No recent submissions yet.</div>`
              }
            </div>
          </div>
        </div>

        <div>
          <div class="card mb-16">
            <div class="card-header"><div class="card-title">Top Students</div><button class="btn btn-outline btn-sm" onclick="EC.navigate('leaderboard')">Full Leaderboard</button></div>
            <div class="card-body">${s.students.slice(0, 5).map(student => EC.gamification.renderLbRow(student, null)).join('')}</div>
          </div>
          ${pendingLeave > 0 ? `
            <div class="card" style="border-left:4px solid var(--warning)">
              <div class="card-header"><div class="card-title">Pending Leave/OD</div><span class="nav-badge">${pendingLeave}</span></div>
              <div class="card-body">
                ${s.leaveRequests.filter(request => request.status === 'pending').map(request => `
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
                    <div class="avatar avatar-sm" style="background:${EC.getStudent(request.studentId)?.color || '#1a3a8f'};background-image:url('${EC.getProfileImageUrl(EC.getStudent(request.studentId) || { name: request.studentName, profileImageUrl: '' })}');background-size:cover;background-position:center;color:transparent;">${request.studentName.split(' ').map(part => part[0]).join('')}</div>
                    <div style="flex:1"><div style="font-weight:600;font-size:13px">${request.studentName}</div><div style="font-size:12px;color:var(--text-muted)">${request.type.toUpperCase()} • ${request.date}</div></div>
                    <button class="btn btn-success btn-sm" onclick="EC.teacherLeave.approve('${request.id}')">✓</button>
                    <button class="btn btn-danger btn-sm" onclick="EC.teacherLeave.openReject('${request.id}')">✕</button>
                  </div>
                `).join('')}
                <button class="btn btn-outline btn-sm w-full mt-8" onclick="EC.navigate('leave-od')">Manage All</button>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
};
