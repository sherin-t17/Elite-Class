/* ============================================================
   TEACHER TASKS v3 — Grade modal in front, auto-navigate after grade,
   Remind All button, submitted/not-submitted tabs
   ============================================================ */
window.EC = window.EC || {};

EC.teacherTasks = {
  selectedRemark: null,
  submissionCache: {},

  render(el) {
    const tasks = EC.state.tasks;
    el.innerHTML = `
      <div class="page-header">
        <div><h2 class="page-title">📋 Task Manager</h2><p class="page-subtitle">Create, monitor and grade all class tasks</p></div>
        <div class="page-header-actions">
          <button class="btn btn-accent" onclick="EC.teacherTasks.openCreate()">+ New Task</button>
        </div>
      </div>
      <div class="filter-bar">
        <button class="filter-btn active" onclick="EC.teacherTasks.filter(this,'all')">All</button>
        <button class="filter-btn" onclick="EC.teacherTasks.filter(this,'grading')">⏳ Pending Grading</button>
        <button class="filter-btn" onclick="EC.teacherTasks.filter(this,'choice')">⚡ Choice Tasks</button>
        <button class="filter-btn" onclick="EC.teacherTasks.filter(this,'not-submitted')">❗ Not Submitted</button>
        <button class="filter-btn" onclick="EC.teacherTasks.filter(this,'bonus')">🎁 Bonus</button>
      </div>
      <div id="task-list" class="task-list">
        ${tasks.map(t => EC.teacherTasks.renderTaskCard(t)).join('')}
      </div>
      ${EC.teacherTasks.createModal()}
      ${EC.teacherTasks.taskDetailModal()}
      ${EC.teacherTasks.reviewModal()}
    `;
  },

  renderTaskCard(t) {
    const pct = t.total > 0 ? Math.round(t.completions / t.total * 100) : 0;
    return `
      <div class="task-item priority-${t.priority ? 'high' : 'low'}" onclick="EC.teacherTasks.openTaskDetail(${t.id})">
        <div class="task-left">
          <div class="task-title-row">
            <span class="task-name">${t.title}</span>
            <span class="tag ${t.diff}">${t.diff}</span>
            <span class="tag cat">${t.cat}</span>
            ${t.isChoice ? '<span class="tag" style="background:#f0fdf4;color:#16a34a">⚡ Choice</span>' : ''}
            ${t.priority ? '<span class="tag" style="background:var(--danger-bg);color:var(--danger)">🔴 Urgent</span>' : ''}
          </div>
          <div class="task-desc">${t.desc}</div>
          <div class="task-meta">
            <span>📅 Due: ${t.due}</span>
            <span>👥 ${t.completions}/${t.total} submitted</span>
            <span style="color:var(--danger)">${t.total - t.completions} not submitted</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
          <div class="task-xp">+${t.xp} XP</div>
          <div style="width:90px">
            <div style="font-size:11px;color:var(--text-muted);text-align:right;margin-bottom:3px">${pct}%</div>
            <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
          </div>
          <button class="btn btn-ghost btn-sm" style="padding:4px 8px;font-size:15px;color:var(--text-muted)" title="Bookmark this task"
            onclick="event.stopPropagation();EC.app.addBookmark({id:${t.id},type:'task',title:'${t.title.replace(/'/g, "\\'")}',icon:'📋',ref:'tasks'})">🔖</button>
        </div>
      </div>
    `;
  },

  /* ── TASK DETAIL MODAL with submitted / not-submitted tabs ── */
  taskDetailModal() {
    return `
      <div class="overlay" id="task-detail-overlay" style="z-index:210">
        <div class="modal modal-lg" style="max-width:700px">
          <div class="modal-header">
            <div><div class="modal-title" id="td-teacher-title">Task Details</div><div class="card-subtitle" id="td-teacher-meta"></div></div>
            <button class="modal-close" onclick="EC.teacherTasks.closeDetail()">✕</button>
          </div>
          <div style="display:flex;gap:4px;padding:0 24px 12px;border-bottom:1px solid var(--border)">
            <button class="tab-btn active" id="tt-sub-tab" onclick="EC.teacherTasks.showDetailTab('submitted')">✅ Submitted</button>
            <button class="tab-btn" id="tt-nosub-tab" onclick="EC.teacherTasks.showDetailTab('not-submitted')">❗ Not Submitted</button>
          </div>
          <div class="modal-body" id="td-teacher-body" style="max-height:55vh;overflow-y:auto;padding:0"></div>
          <div class="modal-footer" id="td-teacher-footer"></div>
        </div>
      </div>
    `;
  },

  _detailTaskId: null,

  openTaskDetail(id) {
    EC.teacherTasks._detailTaskId = id;
    const task = EC.state.tasks.find(t => t.id === id);
    if (!task) return;
    document.getElementById('td-teacher-title').textContent = task.title;
    document.getElementById('td-teacher-meta').textContent  = `${task.cat} • ${task.diff} • Due: ${task.due} • +${task.xp} XP`;
    document.getElementById('td-teacher-footer').innerHTML  = '';
    // reset tabs
    document.getElementById('tt-sub-tab')?.classList.add('active');
    document.getElementById('tt-nosub-tab')?.classList.remove('active');
    EC.teacherTasks.showDetailTab('submitted');
    document.getElementById('task-detail-overlay')?.classList.add('open');
  },

  closeDetail() {
    document.getElementById('task-detail-overlay')?.classList.remove('open');
  },

  showDetailTab(tab) {
    document.querySelectorAll('#task-detail-overlay .tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tab === 'submitted' ? 'tt-sub-tab' : 'tt-nosub-tab')?.classList.add('active');

    const task = EC.state.tasks.find(t => t.id === EC.teacherTasks._detailTaskId);
    const body = document.getElementById('td-teacher-body');
    const footer = document.getElementById('td-teacher-footer');
    if (!task || !body) return;

    const submittedStudents   = EC.state.students.slice(0, task.completions);
    const notSubmittedStudents = EC.state.students.slice(task.completions);

    if (tab === 'submitted') {
      body.innerHTML = submittedStudents.length === 0
        ? `<div style="text-align:center;padding:40px;color:var(--text-muted)">No submissions yet</div>`
        : submittedStudents.map(s => `
            <div style="display:flex;align-items:center;gap:12px;padding:14px 24px;border-bottom:1px solid var(--border-soft)">
              <div class="avatar avatar-sm" style="background:${s.color}">${s.initials}</div>
              <div style="flex:1">
                <div style="font-weight:600">${s.name}</div>
                <div style="font-size:12px;color:var(--text-muted)">📎 submission.pdf &nbsp;|&nbsp; 🕐 ${EC.teacherTasks._fakeTime(s.id)}</div>
              </div>
              <button class="btn btn-primary btn-sm" onclick="EC.teacherTasks.closeDetail();setTimeout(()=>EC.teacherTasks.openReview(${task.id},${s.id}),80)">✏️ Grade</button>
              <button class="btn btn-danger btn-sm" onclick="EC.teacherTasks.deleteSubmission(${task.id},${s.id})">🗑</button>
            </div>
          `).join('');
      if (footer) footer.innerHTML = '';
    } else {
      body.innerHTML = notSubmittedStudents.length === 0
        ? `<div style="text-align:center;padding:40px;color:var(--text-muted)">All students submitted! 🎉</div>`
        : notSubmittedStudents.map(s => `
            <div style="display:flex;align-items:center;gap:12px;padding:14px 24px;border-bottom:1px solid var(--border-soft)">
              <div class="avatar avatar-sm" style="background:${s.color}">${s.initials}</div>
              <div style="flex:1">
                <div style="font-weight:600">${s.name}</div>
                <div style="font-size:12px;color:var(--danger)">Not submitted yet</div>
              </div>
            </div>
          `).join('');

      // Remind All button in footer
      if (footer && notSubmittedStudents.length > 0) {
        footer.innerHTML = `
          <button class="btn btn-outline" onclick="EC.teacherTasks.closeDetail()">Close</button>
          <button class="btn btn-accent" onclick="EC.teacherTasks.remindAll(${task.id})">🔔 Remind All (${notSubmittedStudents.length})</button>
        `;
      } else if (footer) {
        footer.innerHTML = '';
      }
    }
  },

  remindAll(taskId) {
    const task = EC.state.tasks.find(t => t.id === taskId);
    const count = task ? task.total - task.completions : 0;
    EC.toast(`Reminder sent to all ${count} pending students!`, 'success');
  },

  deleteSubmission(taskId, studentId) {
    const task = EC.state.tasks.find(t => t.id === taskId);
    if (task && task.completions > 0) task.completions--;
    EC.toast('Submission deleted. Student can resubmit.', 'warning');
    EC.teacherTasks.showDetailTab('submitted');
  },

  _fakeTime(id) {
    const times = ['Today 9:15 AM', 'Today 11:42 PM', 'Yesterday 3:30 PM', 'Apr 8, 2:00 PM', 'Today 8:55 AM'];
    return times[id % times.length];
  },

  /* ── REVIEW MODAL — z-index above task-detail ── */
  reviewModal() {
    return `
      <div class="overlay" id="review-overlay" style="z-index:220">
        <div class="modal modal-lg">
          <div class="modal-header">
            <div><div class="modal-title" id="review-student-name">Review Submission</div><div class="card-subtitle" id="review-task-name"></div></div>
            <button class="modal-close" onclick="EC.teacherTasks.closeReview()">✕</button>
          </div>
          <div class="modal-body" style="max-height:65vh;overflow-y:auto">
            <div class="form-group">
              <div class="section-title">Submitted File</div>
              <div style="background:var(--surface);border-radius:var(--radius-sm);padding:16px;display:flex;align-items:center;gap:12px">
                <span style="font-size:28px">📄</span>
                <div style="flex:1"><div style="font-weight:600" id="review-filename">submission.pdf</div><div style="font-size:12px;color:var(--text-muted)" id="review-submittime">Submitted today</div></div>
                <button class="btn btn-outline btn-sm">Preview</button>
              </div>
            </div>
            <div class="form-group">
              <div class="section-title">Grade Remark</div>
              <div class="remarks-select-grid">
                <button class="remark-chip excellent" onclick="EC.teacherTasks.selectRemark(this,'excellent')">⭐ Excellent (100% XP)</button>
                <button class="remark-chip good"      onclick="EC.teacherTasks.selectRemark(this,'good')">👍 Good (80% XP)</button>
                <button class="remark-chip moderate"  onclick="EC.teacherTasks.selectRemark(this,'moderate')">📝 Moderate (60% XP)</button>
                <button class="remark-chip bad"       onclick="EC.teacherTasks.selectRemark(this,'bad')">⚠️ Poor (40% XP)</button>
              </div>
              <div id="remark-xp-preview" style="font-size:13px;color:var(--text-muted);margin-top:8px"></div>
            </div>
            <div class="form-group"><label class="form-label">Written Feedback</label><textarea class="form-textarea" id="review-feedback" placeholder="Add detailed feedback..."></textarea></div>
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label">Letter Grade</label><input class="form-input" id="review-grade" placeholder="A, B+, etc."></div>
              <div class="form-group"><label class="form-label">XP to Award</label><input class="form-input" id="review-xp" type="number" placeholder="0"></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-warning btn-sm" onclick="EC.teacherTasks.requestRedo()">🔄 Request Redo</button>
            <button class="btn btn-outline" onclick="EC.teacherTasks.closeReview()">Cancel</button>
            <button class="btn btn-accent" onclick="EC.teacherTasks.approveSubmission()">✅ Approve & Award XP</button>
          </div>
        </div>
      </div>
    `;
  },

  _reviewTaskId: null,
  _reviewStudentId: null,

  openReview(taskId, studentId) {
    EC.teacherTasks._reviewTaskId    = taskId;
    EC.teacherTasks._reviewStudentId = studentId;
    EC.teacherTasks.selectedRemark   = null;
    const task    = EC.state.tasks.find(t => t.id === taskId);
    const student = EC.getStudent(studentId);
    document.getElementById('review-student-name').textContent = student ? `${student.name} — Submission` : 'Review Submission';
    document.getElementById('review-task-name').textContent    = task ? `${task.title} • Submitted ${EC.teacherTasks._fakeTime(studentId)}` : '';
    document.getElementById('review-filename').textContent     = student ? `submission_${student.initials.toLowerCase()}.pdf` : 'submission.pdf';
    document.getElementById('review-submittime').textContent   = `Submitted ${EC.teacherTasks._fakeTime(studentId || 1)}`;
    document.getElementById('review-feedback').value          = '';
    document.getElementById('review-grade').value             = '';
    document.getElementById('review-xp').value                = '';
    document.getElementById('remark-xp-preview').textContent  = '';
    document.querySelectorAll('.remark-chip').forEach(b => b.classList.remove('selected'));
    document.getElementById('review-overlay')?.classList.add('open');
  },

  closeReview() {
    document.getElementById('review-overlay')?.classList.remove('open');
    // After closing review, go back to task list view (not detail)
    EC.teacherTasks.render(document.getElementById('page-content-area'));
  },

  selectRemark(btn, type) {
    document.querySelectorAll('.remark-chip').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    const pcts  = { excellent: 100, good: 80, moderate: 60, bad: 40 };
    const task  = EC.state.tasks.find(t => t.id === EC.teacherTasks._reviewTaskId);
    const xp    = task ? Math.round(task.xp * pcts[type] / 100) : 0;
    EC.teacherTasks.selectedRemark = { type, xp };
    const preview = document.getElementById('remark-xp-preview');
    if (preview) preview.textContent = `→ ${xp} XP will be awarded`;
    const gradeMap = { excellent: 'A', good: 'B+', moderate: 'C+', bad: 'D' };
    const gi = document.getElementById('review-grade');
    const xi = document.getElementById('review-xp');
    if (gi) gi.value = gradeMap[type];
    if (xi) xi.value = xp;
  },

  requestRedo() {
    const feedback = document.getElementById('review-feedback')?.value?.trim();
    if (!feedback) { EC.toast('Please add feedback explaining what needs to be redone', 'danger'); return; }
    EC.toast('Redo requested. Student notified with your feedback.', 'warning');
    EC.teacherTasks.closeReview();
  },

  async approveSubmission() {
    if (!EC.teacherTasks.selectedRemark) { EC.toast('Please select a grade remark first', 'danger'); return; }
    const task = EC.state.tasks.find(t => t.id === EC.teacherTasks._reviewTaskId);
    if (!task?.submission?.id && !task?.submission?._id) {
      EC.toast('Live grading needs a real submission from a student account first.', 'warning');
      EC.teacherTasks.closeReview();
      return;
    }
    try {
      await EC.api.gradeTask(EC.teacherTasks._reviewTaskId, {
        submissionId: task.submission.id || task.submission._id,
        grade: document.getElementById('review-grade')?.value || 'A',
        feedback: document.getElementById('review-feedback')?.value || '',
        xpAwarded: Number(document.getElementById('review-xp')?.value || EC.teacherTasks.selectedRemark.xp || 0)
      });
      task.status = 'completed';
      EC.toast(`✅ Approved! ${EC.teacherTasks.selectedRemark.xp} XP awarded.`, 'success');
      EC.teacherTasks.closeReview();
    } catch (err) {
      EC.toast(err.message || 'Could not grade submission', 'danger');
    }
  },

  /* ── CREATE MODAL ── */
  createModal() {
    return `
      <div class="overlay" id="create-task-overlay" style="z-index:210">
        <div class="modal modal-lg">
          <div class="modal-header">
            <div><div class="modal-title">Create New Task</div><div class="card-subtitle">Post a new assignment to your class</div></div>
            <button class="modal-close" onclick="EC.teacherTasks.closeCreate()">✕</button>
          </div>
          <div class="modal-body" style="max-height:65vh;overflow-y:auto">
            <div class="form-group"><label class="form-label">Task Title *</label><input class="form-input" id="new-task-title" placeholder="e.g. Database Design Report"></div>
            <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="new-task-desc" placeholder="What do students need to do..."></textarea></div>
            <div class="form-grid-3">
              <div class="form-group"><label class="form-label">Difficulty</label><select class="form-select" id="new-task-diff"><option>easy</option><option selected>medium</option><option>hard</option></select></div>
              <div class="form-group"><label class="form-label">Category</label><select class="form-select" id="new-task-cat"><option>Development</option><option>Assessment</option><option>Notes</option><option>Bonus</option></select></div>
              <div class="form-group"><label class="form-label">XP Reward</label><input class="form-input" id="new-task-xp" type="number" value="80"></div>
            </div>
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label">Due Date</label><input class="form-input" id="new-task-due" type="date"></div>
              <div class="form-group"><label class="form-label">Due Time</label><input class="form-input" id="new-task-time" type="time" value="23:59"></div>
            </div>
            <div class="form-group" style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--surface);border-radius:var(--radius-sm)">
              <input type="checkbox" id="is-choice-task" style="width:18px;height:18px;cursor:pointer" onchange="EC.teacherTasks.toggleChoiceOptions()">
              <div><label for="is-choice-task" style="font-weight:600;cursor:pointer">⚡ Choice Task Mode</label><div style="font-size:12px;color:var(--text-muted)">Each student picks one item only.</div></div>
            </div>
            <div id="choice-options" style="display:none">
              <div class="form-group"><label class="form-label">Choice Task Question</label><textarea class="form-textarea" id="choice-prompt" placeholder="Write the question or instruction for the choice task."></textarea></div>
              <div class="form-group"><label class="form-label">Choice Items</label><textarea class="form-textarea" id="choice-items" placeholder="One option per line"></textarea></div>
              <div class="form-group"><label class="form-label">Or use count</label><input class="form-input" id="choice-count" type="number" value="20" min="2" max="50"></div>
            </div>
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label">Submission Type</label><select class="form-select" id="new-task-answer-mode"><option value="file">File Upload</option><option value="link">Link</option><option value="text">Message</option><option value="mixed">File / Link / Message</option></select></div>
              <div class="form-group"><label class="form-label">Supporting File / Link</label><input class="form-input" id="new-task-attachment-url" placeholder="Paste a file link or resource URL"></div>
            </div>
            <div class="form-group" style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--surface);border-radius:var(--radius-sm)">
              <input type="checkbox" id="is-challenge" style="width:18px;height:18px;cursor:pointer">
              <div><label for="is-challenge" style="font-weight:600;cursor:pointer">🏆 Challenge Mode</label><div style="font-size:12px;color:var(--text-muted)">Students compete for highest score.</div></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="EC.teacherTasks.closeCreate()">Cancel</button>
            <button class="btn btn-accent" onclick="EC.teacherTasks.createTask()">Post Task 🚀</button>
          </div>
        </div>
      </div>
    `;
  },

  filter(btn, type) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    let tasks = EC.state.tasks;
    if (type === 'grading')      tasks = tasks.filter(t => t.status === 'submitted');
    if (type === 'choice')       tasks = tasks.filter(t => t.isChoice);
    if (type === 'bonus')        tasks = tasks.filter(t => t.cat === 'Bonus');
    if (type === 'not-submitted') tasks = tasks.filter(t => t.completions < t.total && t.status !== 'completed');
    const list = document.getElementById('task-list');
    if (list) list.innerHTML = tasks.map(t => EC.teacherTasks.renderTaskCard(t)).join('');
  },

  openCreate()  { document.getElementById('create-task-overlay')?.classList.add('open'); },
  closeCreate() { document.getElementById('create-task-overlay')?.classList.remove('open'); },

  toggleChoiceOptions() {
    const cb   = document.getElementById('is-choice-task');
    const opts = document.getElementById('choice-options');
    if (opts) opts.style.display = cb?.checked ? '' : 'none';
  },

  async createTask() {
    const title = document.getElementById('new-task-title')?.value?.trim();
    if (!title) { EC.toast('Please enter a task title.', 'danger'); return; }
    try {
      const isChoice = document.getElementById('is-choice-task')?.checked || false;
      const choiceCount = parseInt(document.getElementById('choice-count')?.value || '0', 10);
      const typedChoices = (document.getElementById('choice-items')?.value || '').split('\n').map(item => item.trim()).filter(Boolean);
      const created = await EC.api.createTask({
        title,
        desc: document.getElementById('new-task-desc')?.value || '',
        diff: document.getElementById('new-task-diff')?.value || 'medium',
        cat: document.getElementById('new-task-cat')?.value || 'Development',
        xp: parseInt(document.getElementById('new-task-xp')?.value || '80', 10),
        due: document.getElementById('new-task-due')?.value || '',
        time: document.getElementById('new-task-time')?.value || '23:59',
        isChoice,
        answerMode: isChoice ? 'choice' : (document.getElementById('new-task-answer-mode')?.value || 'file'),
        choicePrompt: document.getElementById('choice-prompt')?.value || '',
        attachmentUrl: document.getElementById('new-task-attachment-url')?.value || '',
        attachmentName: document.getElementById('new-task-attachment-url')?.value ? 'Attached resource' : '',
        choices: isChoice
          ? (typedChoices.length
              ? typedChoices.map((item, index) => ({ id: index + 1, name: item }))
              : Array.from({ length: choiceCount || 20 }, (_, index) => ({ id: index + 1, name: `Problem ${index + 1}` })))
          : [],
        totalStudents: EC.state.students.length
      });
      EC.state.tasks.push(created);
      EC.teacherTasks.closeCreate();
      EC.toast('Task posted! Students have been notified.', 'success');
      EC.teacherTasks.render(document.getElementById('page-content-area'));
    } catch (err) {
      EC.toast(err.message || 'Could not create task', 'danger');
    }
  },
};

EC.teacherTasks.openTaskDetail = async function(id) {
  const taskId = String(id);
  this._detailTaskId = taskId;
  const task = EC.state.tasks.find(t => String(t.id) === taskId);
  if (!task) return;

  document.getElementById('td-teacher-title').textContent = task.title;
  document.getElementById('td-teacher-meta').textContent = `${task.cat} • ${task.diff} • Due: ${task.due} • +${task.xp} XP`;
  document.getElementById('td-teacher-footer').innerHTML = '';
  document.getElementById('tt-sub-tab')?.classList.add('active');
  document.getElementById('tt-nosub-tab')?.classList.remove('active');
  document.getElementById('td-teacher-body').innerHTML = `<div style="padding:24px;color:var(--text-muted)">Loading submissions...</div>`;
  document.getElementById('task-detail-overlay')?.classList.add('open');

  try {
    this.submissionCache[taskId] = await EC.api.getTaskSubmissions(taskId);
  } catch (err) {
    this.submissionCache[taskId] = [];
    EC.toast(err.message || 'Could not load submissions', 'danger');
  }

  this.showDetailTab('submitted');
};

EC.teacherTasks.showDetailTab = function(tab) {
  document.querySelectorAll('#task-detail-overlay .tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tab === 'submitted' ? 'tt-sub-tab' : 'tt-nosub-tab')?.classList.add('active');

  const task = EC.state.tasks.find(t => String(t.id) === String(this._detailTaskId));
  const body = document.getElementById('td-teacher-body');
  const footer = document.getElementById('td-teacher-footer');
  if (!task || !body) return;

  const submissions = this.submissionCache[String(task.id)] || [];
  const submittedIds = new Set(submissions.map(entry => String(entry.studentId)));
  const submittedStudents = submissions;
  const notSubmittedStudents = EC.state.students.filter(student => !submittedIds.has(String(student.id)));

  if (tab === 'submitted') {
    body.innerHTML = submittedStudents.length === 0
      ? `<div style="text-align:center;padding:40px;color:var(--text-muted)">No submissions yet</div>`
      : submittedStudents.map(submission => `
          <div style="display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;padding:16px 24px;border-bottom:1px solid var(--border-soft)">
            <div class="avatar avatar-sm" style="background:${submission.studentColor}">${submission.studentInitials}</div>
            <div>
              <div style="font-weight:700">${submission.studentName || 'Student'}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${submission.fileName || 'No file name'} • ${formatDateTime(submission.submittedAt)}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Status: ${submission.status}</div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
              ${submission.fileUrl ? `<a class="btn btn-outline btn-sm" href="${submission.fileUrl}" target="_blank" rel="noopener noreferrer">Open File</a>` : ''}
              <button class="btn btn-primary btn-sm" onclick="EC.teacherTasks.closeDetail();setTimeout(()=>EC.teacherTasks.openReview(${JSON.stringify(String(task.id))},${JSON.stringify(String(submission.studentId))},${JSON.stringify(String(submission.id))}),80)">Review</button>
            </div>
          </div>
        `).join('');
    if (footer) footer.innerHTML = '';
    return;
  }

  body.innerHTML = notSubmittedStudents.length === 0
    ? `<div style="text-align:center;padding:40px;color:var(--text-muted)">All students submitted.</div>`
    : notSubmittedStudents.map(student => `
        <div style="display:flex;align-items:center;gap:12px;padding:14px 24px;border-bottom:1px solid var(--border-soft)">
          <div class="avatar avatar-sm" style="background:${student.color}">${student.initials}</div>
          <div style="flex:1">
            <div style="font-weight:600">${student.name}</div>
            <div style="font-size:12px;color:var(--danger)">Not submitted yet</div>
          </div>
        </div>
      `).join('');

  if (footer) {
    footer.innerHTML = notSubmittedStudents.length > 0
      ? `<button class="btn btn-outline" onclick="EC.teacherTasks.closeDetail()">Close</button>
         <button class="btn btn-accent" onclick="EC.teacherTasks.remindAll(${JSON.stringify(String(task.id))})">Remind All (${notSubmittedStudents.length})</button>`
      : '';
  }
};

EC.teacherTasks.openReview = function(taskId, studentId, submissionId) {
  this._reviewTaskId = String(taskId);
  this._reviewStudentId = String(studentId);
  this._reviewSubmissionId = String(submissionId || '');
  this.selectedRemark = null;

  const task = EC.state.tasks.find(t => String(t.id) === String(taskId));
  const submission = (this.submissionCache[String(taskId)] || []).find(entry => String(entry.studentId) === String(studentId) || String(entry.id) === String(submissionId));
  const student = EC.getStudent(studentId);

  document.getElementById('review-student-name').textContent = student ? `${student.name} - Submission` : 'Review Submission';
  document.getElementById('review-task-name').textContent = task ? `${task.title} • ${formatDateTime(submission?.submittedAt)}` : '';
  document.getElementById('review-filename').textContent = submission?.fileName || 'No file uploaded';
  document.getElementById('review-submittime').textContent = submission?.submittedAt ? `Submitted ${formatDateTime(submission.submittedAt)}` : 'No submission time';
  document.getElementById('review-feedback').value = submission?.feedback || '';
  document.getElementById('review-grade').value = submission?.grade || '';
  document.getElementById('review-xp').value = submission?.xpAwarded || '';
  document.getElementById('remark-xp-preview').textContent = '';
  document.querySelectorAll('.remark-chip').forEach(b => b.classList.remove('selected'));

  const previewBtn = document.querySelector('#review-overlay .form-group .btn.btn-outline.btn-sm');
  if (previewBtn) {
    if (submission?.fileUrl) {
      previewBtn.style.display = '';
      previewBtn.onclick = () => window.open(submission.fileUrl, '_blank', 'noopener,noreferrer');
    } else {
      previewBtn.style.display = 'none';
      previewBtn.onclick = null;
    }
  }

  document.getElementById('review-overlay')?.classList.add('open');
};

EC.teacherTasks.approveSubmission = async function() {
  if (!this.selectedRemark) {
    EC.toast('Please select a grade remark first', 'danger');
    return;
  }
  if (!this._reviewSubmissionId) {
    EC.toast('Submission not found.', 'danger');
    return;
  }
  try {
    await EC.api.gradeTask(this._reviewTaskId, {
      submissionId: this._reviewSubmissionId,
      grade: document.getElementById('review-grade')?.value || 'A',
      feedback: document.getElementById('review-feedback')?.value || '',
      xpAwarded: Number(document.getElementById('review-xp')?.value || this.selectedRemark.xp || 0)
    });
    const task = EC.state.tasks.find(t => String(t.id) === String(this._reviewTaskId));
    if (task) task.status = 'completed';
    delete this.submissionCache[String(this._reviewTaskId)];
    EC.toast('Submission approved.', 'success');
    this.closeReview();
  } catch (err) {
    EC.toast(err.message || 'Could not grade submission', 'danger');
  }
};

EC.teacherTasks.showDetailTab = function(tab) {
  document.querySelectorAll('#task-detail-overlay .tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tab === 'submitted' ? 'tt-sub-tab' : 'tt-nosub-tab')?.classList.add('active');

  const task = EC.state.tasks.find(t => String(t.id) === String(this._detailTaskId));
  const body = document.getElementById('td-teacher-body');
  const footer = document.getElementById('td-teacher-footer');
  if (!task || !body) return;

  const submissions = this.submissionCache[String(task.id)] || [];
  const submittedIds = new Set(submissions.map(entry => String(entry.studentId)));
  const notSubmittedStudents = EC.state.students.filter(student => !submittedIds.has(String(student.id)));

  if (tab === 'submitted') {
    body.innerHTML = submissions.length === 0
      ? `<div style="text-align:center;padding:40px;color:var(--text-muted)">No submissions yet</div>`
      : submissions.map(submission => `
          <div style="display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:start;padding:16px 24px;border-bottom:1px solid var(--border-soft)">
            <div class="avatar avatar-sm" style="background:${submission.studentColor}">${submission.studentInitials}</div>
            <div>
              <div style="font-weight:700">${submission.studentName || 'Student'}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${submission.fileName || submission.proofUrl || 'No file or link'} • ${formatDateTime(submission.submittedAt)}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Status: ${submission.status}</div>
              ${submission.responseText ? `<div style="font-size:12px;color:var(--text-mid);margin-top:6px;white-space:pre-wrap">${submission.responseText}</div>` : ''}
              ${submission.redoFeedback ? `<div style="font-size:12px;color:var(--danger);margin-top:6px">${submission.redoFeedback}</div>` : ''}
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
              ${submission.fileUrl ? `<a class="btn btn-outline btn-sm" href="${submission.fileUrl}" target="_blank" rel="noopener noreferrer">Open File</a>` : ''}
              ${submission.proofUrl ? `<a class="btn btn-outline btn-sm" href="${submission.proofUrl}" target="_blank" rel="noopener noreferrer">Open Link</a>` : ''}
              <button class="btn btn-primary btn-sm" onclick="EC.teacherTasks.closeDetail();setTimeout(()=>EC.teacherTasks.openReview('${String(task.id)}','${String(submission.studentId)}','${String(submission.id)}'),80)">Review</button>
            </div>
          </div>
        `).join('');
    if (footer) footer.innerHTML = '';
    return;
  }

  body.innerHTML = notSubmittedStudents.length === 0
    ? `<div style="text-align:center;padding:40px;color:var(--text-muted)">All students submitted.</div>`
    : notSubmittedStudents.map(student => `
        <div style="display:flex;align-items:center;gap:12px;padding:14px 24px;border-bottom:1px solid var(--border-soft)">
          <div class="avatar avatar-sm" style="background:${student.color}">${student.initials}</div>
          <div style="flex:1">
            <div style="font-weight:600">${student.name}</div>
            <div style="font-size:12px;color:var(--danger)">Not submitted yet</div>
          </div>
        </div>
      `).join('');

  if (footer) {
    footer.innerHTML = notSubmittedStudents.length > 0
      ? `<button class="btn btn-outline" onclick="EC.teacherTasks.closeDetail()">Close</button>
         <button class="btn btn-accent" onclick="EC.teacherTasks.remindAll('${String(task.id)}')">Remind All (${notSubmittedStudents.length})</button>`
      : '';
  }
};

EC.teacherTasks.openReview = function(taskId, studentId, submissionId) {
  this._reviewTaskId = String(taskId);
  this._reviewStudentId = String(studentId);
  this._reviewSubmissionId = String(submissionId || '');
  this.selectedRemark = null;
  this._reviewSubmission = (this.submissionCache[String(taskId)] || []).find(entry => String(entry.studentId) === String(studentId) || String(entry.id) === String(submissionId)) || null;

  const task = EC.state.tasks.find(t => String(t.id) === String(taskId));
  const student = EC.getStudent(studentId);
  const submission = this._reviewSubmission;

  document.getElementById('review-student-name').textContent = student ? `${student.name} - Submission` : 'Review Submission';
  document.getElementById('review-task-name').textContent = task ? `${task.title} • ${formatDateTime(submission?.submittedAt)}` : '';
  document.getElementById('review-filename').textContent = submission?.fileName || submission?.proofUrl || 'No file uploaded';
  document.getElementById('review-submittime').textContent = submission?.submittedAt ? `Submitted ${formatDateTime(submission.submittedAt)}${submission?.responseText ? ' • Message added' : ''}` : 'No submission time';
  document.getElementById('review-feedback').value = submission?.redoFeedback || submission?.feedback || '';
  document.getElementById('review-grade').value = submission?.grade || '';
  document.getElementById('review-xp').value = submission?.xpAwarded || '';
  document.getElementById('remark-xp-preview').textContent = '';
  document.querySelectorAll('.remark-chip').forEach(b => b.classList.remove('selected'));

  const previewBtn = document.querySelector('#review-overlay .btn.btn-outline.btn-sm');
  if (previewBtn) {
    if (submission?.fileUrl || submission?.proofUrl) {
      previewBtn.style.display = '';
      previewBtn.textContent = submission?.fileUrl ? 'Open File' : 'Open Link';
      previewBtn.onclick = () => window.open(submission.fileUrl || submission.proofUrl, '_blank', 'noopener,noreferrer');
    } else {
      previewBtn.style.display = 'none';
      previewBtn.onclick = null;
    }
  }

  document.getElementById('review-overlay')?.classList.add('open');
};

EC.teacherTasks.requestRedo = async function() {
  const feedback = document.getElementById('review-feedback')?.value?.trim();
  if (!feedback) {
    EC.toast('Please add feedback explaining what needs to be redone', 'danger');
    return;
  }
  if (!this._reviewSubmissionId) {
    EC.toast('Submission not found.', 'danger');
    return;
  }

  try {
    await EC.api.requestTaskRedo(this._reviewTaskId, {
      submissionId: this._reviewSubmissionId,
      feedback
    });
    delete this.submissionCache[String(this._reviewTaskId)];
    EC.toast('Redo requested. Student can reopen and resubmit the task.', 'warning');
    this.closeReview();
  } catch (err) {
    EC.toast(err.message || 'Could not request redo', 'danger');
  }
};

EC.teacherTasks.renderTaskCard = function(t) {
  const pct = t.total > 0 ? Math.round((t.completions / t.total) * 100) : 0;
  return `
    <div class="task-item priority-${t.priority ? 'high' : 'low'}" onclick="EC.teacherTasks.openTaskDetail('${String(t.id)}')">
      <div class="task-left">
        <div class="task-title-row">
          <span class="task-name">${t.title}</span>
          <span class="tag ${t.diff}">${t.diff}</span>
          <span class="tag cat">${t.cat}</span>
          ${t.isChoice ? '<span class="tag" style="background:#f0fdf4;color:#16a34a">Choice</span>' : ''}
          ${t.pendingGradingCount > 0 ? `<span class="tag" style="background:var(--warning-bg);color:var(--warning)">${t.pendingGradingCount} Pending Grade</span>` : ''}
        </div>
        <div class="task-desc">${t.desc}</div>
        <div class="task-meta">
          <span>Due: ${t.due}</span>
          <span>${t.completions}/${t.total} submitted</span>
          <span style="color:var(--danger)">${Math.max(0, (t.total || 0) - (t.completions || 0))} not submitted</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
        <div class="task-xp">+${t.xp} XP</div>
        <div style="width:90px">
          <div style="font-size:11px;color:var(--text-muted);text-align:right;margin-bottom:3px">${pct}%</div>
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        </div>
      </div>
    </div>
  `;
};

EC.teacherTasks.filter = function(btn, type) {
  EC.teacherTasks.applyFilter(btn, type);
};

EC.teacherTasks.applyFilter = async function(btn, type) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  try {
    EC.state.tasks = await EC.api.getTasks();
    await EC.teacherTasks.refreshTaskSubmissionStats();
  } catch (err) {
    EC.toast(err.message || 'Could not refresh tasks', 'danger');
  }

  let tasks = EC.state.tasks || [];
  if (type === 'grading') tasks = tasks.filter(t => Number(t.pendingGradingCount || 0) > 0);
  if (type === 'choice') tasks = tasks.filter(t => t.isChoice);
  if (type === 'bonus') tasks = tasks.filter(t => t.cat === 'Bonus');
  if (type === 'not-submitted') tasks = tasks.filter(t => (t.completions || 0) < (t.total || 0));

  const list = document.getElementById('task-list');
  if (list) list.innerHTML = tasks.map(t => EC.teacherTasks.renderTaskCard(t)).join('');
};

EC.teacherTasks.render = async function(el) {
  try {
    EC.state.tasks = await EC.api.getTasks();
    await EC.teacherTasks.refreshTaskSubmissionStats();
  } catch (err) {
    EC.toast(err.message || 'Could not load tasks', 'danger');
  }

  const tasks = EC.state.tasks || [];
  el.innerHTML = `
    <div class="page-header">
      <div><h2 class="page-title">Task Manager</h2><p class="page-subtitle">Create, monitor and grade all class tasks</p></div>
      <div class="page-header-actions">
        <button class="btn btn-accent" onclick="EC.teacherTasks.openCreate()">+ New Task</button>
      </div>
    </div>
    <div class="filter-bar">
      <button class="filter-btn active" onclick="EC.teacherTasks.applyFilter(this,'all')">All</button>
      <button class="filter-btn" onclick="EC.teacherTasks.applyFilter(this,'grading')">Pending Grading</button>
      <button class="filter-btn" onclick="EC.teacherTasks.applyFilter(this,'choice')">Choice Tasks</button>
      <button class="filter-btn" onclick="EC.teacherTasks.applyFilter(this,'not-submitted')">Not Submitted</button>
      <button class="filter-btn" onclick="EC.teacherTasks.applyFilter(this,'bonus')">Bonus</button>
    </div>
    <div id="task-list" class="task-list">
      ${tasks.map(t => EC.teacherTasks.renderTaskCard(t)).join('')}
    </div>
    ${EC.teacherTasks.createModal()}
    ${EC.teacherTasks.taskDetailModal()}
    ${EC.teacherTasks.reviewModal()}
  `;
};

EC.teacherTasks.refreshTaskSubmissionStats = async function() {
  const tasks = EC.state.tasks || [];
  const results = await Promise.allSettled(
    tasks.map(task => EC.api.getTaskSubmissions(task.id))
  );

  results.forEach((result, index) => {
    if (result.status !== 'fulfilled') return;
    const submissions = result.value || [];
    const task = tasks[index];
    if (!task) return;
    task.completions = submissions.length;
    task.pendingGradingCount = submissions.filter(entry => ['submitted', 'late'].includes(entry.status)).length;
  });
};
