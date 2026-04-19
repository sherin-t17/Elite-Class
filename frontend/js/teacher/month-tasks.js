window.EC = window.EC || {};

function monthTaskSubmissionLabel(answerMode) {
  return answerMode === 'done'
    ? 'Mark as Done'
    : answerMode === 'mixed'
      ? 'Flexible'
      : answerMode === 'link_text'
        ? 'Link + Message'
        : 'File Upload';
}

function monthTaskFrequencyLabel(frequency) {
  return frequency === 'daily' ? 'Daily' : 'One Time';
}

EC.teacherMonthTasks = {
  state: {
    loading: false,
    batches: [],
    activeBatchId: null,
    currentBatch: null,
    tasks: [],
    overview: [],
    pendingSubmissions: [],
    summary: null,
    currentTab: 'current'
  },

  render(el) {
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">Month Tasks</h2>
          <p class="page-subtitle">Create monthly challenge batches, upload tasks, review proofs, and monitor who is falling behind.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-outline" onclick="EC.openMonthTaskExcelTab()">Open Excel</button>
          <button class="btn btn-primary" onclick="EC.teacherMonthTasks.openTaskForm()">+ Add Task</button>
          <button class="btn btn-outline" onclick="EC.teacherMonthTasks.downloadTemplate()">Download Excel Template</button>
          <button class="btn btn-accent" onclick="EC.teacherMonthTasks.openBatchForm()">+ New Month Batch</button>
        </div>
      </div>
      <div id="teacher-month-tasks-root">
        <div class="card" style="padding:24px;text-align:center;color:var(--text-muted)">Loading month tasks...</div>
      </div>
      ${this.batchModal()}
      ${this.taskModal()}
      ${this.reviewModal()}
    `;
    this.load();
  },

  async load(batchId) {
    const root = document.getElementById('teacher-month-tasks-root');
    if (root) root.innerHTML = `<div class="card" style="padding:24px;text-align:center;color:var(--text-muted)">Loading month tasks...</div>`;
    try {
      const list = await EC.api.listMonthTaskBatches();
      this.state.batches = list.batches || [];
      this.state.activeBatchId = batchId || this.state.activeBatchId || list.activeBatchId || this.state.batches[0]?.id || null;

      if (!this.state.activeBatchId) {
        this.renderBody();
        return;
      }

      const [batch, tasks, overview, pendingSubmissions] = await Promise.all([
        EC.api.getMonthTaskBatch(this.state.activeBatchId),
        EC.api.getMonthTasks(this.state.activeBatchId),
        EC.api.getMonthTaskOverview(this.state.activeBatchId),
        EC.api.getMonthTaskPendingSubmissions(this.state.activeBatchId)
      ]);
      this.state.currentBatch = batch;
      this.state.tasks = tasks;
      this.state.overview = overview;
      this.state.pendingSubmissions = pendingSubmissions;
      this.state.summary = batch.todaySummary || null;
      this.renderBody();
    } catch (err) {
      if (root) {
        root.innerHTML = `<div class="card" style="padding:24px;color:var(--danger)">Could not load month tasks. ${err.message || ''}</div>`;
      }
    }
  },

  renderBody() {
    const root = document.getElementById('teacher-month-tasks-root');
    if (!root) return;
    const batch = this.state.currentBatch;
    const currentOptions = this.state.batches
      .map(entry => `<option value="${entry.id}" ${entry.id === this.state.activeBatchId ? 'selected' : ''}>${entry.title}</option>`)
      .join('');
    const pastBatches = this.state.batches.filter(entry => entry.id !== this.state.activeBatchId);

    root.innerHTML = `
      <div class="tabs" style="margin-bottom:16px">
        <button class="tab-btn ${this.state.currentTab === 'current' ? 'active' : ''}" onclick="EC.teacherMonthTasks.switchTab('current')">Current Month</button>
        <button class="tab-btn ${this.state.currentTab === 'past' ? 'active' : ''}" onclick="EC.teacherMonthTasks.switchTab('past')">Past Months</button>
      </div>
      ${this.state.currentTab === 'past' ? this.renderPastMonths(pastBatches) : this.renderCurrent(batch, currentOptions)}
    `;
  },

  renderCurrent(batch, currentOptions) {
    if (!batch) {
      return `
        <div class="card" style="padding:32px;text-align:center">
          <div style="font-size:44px;margin-bottom:12px">Month</div>
          <div style="font-family:'Playfair Display',serif;font-size:24px;font-weight:700;margin-bottom:8px">No month batch yet</div>
          <div style="color:var(--text-muted);margin-bottom:20px">Create the first monthly challenge to unlock student and teacher views.</div>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button class="btn btn-accent" onclick="EC.teacherMonthTasks.openBatchForm()">Create Month Batch</button>
            <button class="btn btn-outline" onclick="EC.teacherMonthTasks.openTaskForm()">+ Add Task</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="card mb-16">
        <div class="card-body" style="display:grid;grid-template-columns:2fr 1fr;gap:16px">
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
              <div>
                <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:700;color:var(--royal)">${batch.title}</div>
                <div style="color:var(--text-muted);margin-top:6px">Royal Blue + Gold month challenge with daily monitoring and manual override controls.</div>
              </div>
              <div style="min-width:240px">
                <label class="form-label">Switch Batch</label>
                <select class="form-select" onchange="EC.teacherMonthTasks.selectBatch(this.value)">${currentOptions}</select>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-top:18px">
              ${[
                ['Total Tasks', this.state.tasks.length],
                ['Minimum Target', batch.minimumTarget],
                ['Elite Target', batch.eliteTarget],
                ['Negative Mark', batch.negativeMarkValue],
                ['Pending Reviews', this.state.pendingSubmissions.length]
              ].map(([label, value]) => `
                <div class="card" style="padding:14px;text-align:center">
                  <div style="font-size:22px;font-weight:800;color:var(--royal)">${value}</div>
                  <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em">${label}</div>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="card" style="padding:16px;background:linear-gradient(135deg,var(--royal-dark),var(--royal));color:#fff">
            <div style="font-size:12px;opacity:.8;text-transform:uppercase;letter-spacing:.08em">Daily Summary</div>
            <div style="font-size:28px;font-weight:800;margin-top:8px">${this.state.summary?.completedAtLeastOne || 0}/${this.state.summary?.totalStudents || this.state.overview.length}</div>
            <div style="font-size:13px;opacity:.85;margin-top:6px">students completed at least 1 task today</div>
            <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.18)">
              <div style="font-size:12px;opacity:.8">Top performer</div>
              <div style="font-weight:700;font-size:16px;margin-top:4px">${this.state.summary?.topPerformer?.name || 'No activity yet'}</div>
              <div style="font-size:12px;opacity:.8">${this.state.summary?.topPerformer?.tasksCompleted || 0} tasks today</div>
            </div>
          </div>
        </div>
      </div>

      <div class="two-col-wide">
        <div>
          <div class="card mb-16">
            <div class="card-header"><div class="card-title">Batch Settings</div></div>
            <div class="card-body">
              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label">Negative Mark Value</label>
                  <input class="form-input" id="mt-negative-mark" type="number" value="${batch.negativeMarkValue}">
                </div>
                <div class="form-group">
                  <label class="form-label">Top Performer Override</label>
                  <select class="form-select" id="mt-top-performer">
                    <option value="">Keep automatic</option>
                    ${EC.state.students.map(student => `<option value="${student.id}">${student.name}</option>`).join('')}
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Description</label>
                <textarea class="form-textarea" id="mt-description">${batch.description || ''}</textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Rules</label>
                <textarea class="form-textarea" id="mt-rules">${batch.rules || ''}</textarea>
              </div>
              <div style="display:flex;gap:10px;flex-wrap:wrap">
                <button class="btn btn-primary" onclick="EC.teacherMonthTasks.saveBatchSettings()">Save Batch Settings</button>
                <button class="btn btn-outline" onclick="EC.teacherMonthTasks.saveTopPerformerOverride()">Save Top Performer Override</button>
              </div>
            </div>
          </div>

          <div class="card mb-16">
            <div class="card-header"><div class="card-title">Bulk Upload + Manual Task Entry</div></div>
            <div class="card-body">
              <div class="form-group">
                <label class="form-label">Bulk Excel Upload</label>
                <input class="form-input" id="month-task-excel" type="file" accept=".xlsx,.xls">
                <div style="display:flex;gap:10px;margin-top:10px">
                  <button class="btn btn-accent" onclick="EC.teacherMonthTasks.uploadExcel()">Upload Excel</button>
                  <button class="btn btn-outline" onclick="EC.teacherMonthTasks.downloadTemplate()">Download Template</button>
                </div>
              </div>
              <div style="height:1px;background:var(--border);margin:18px 0"></div>
              <div class="form-grid-3">
                <div class="form-group"><label class="form-label">Task Number</label><input class="form-input" id="mt-task-number" type="number"></div>
                <div class="form-group"><label class="form-label">Difficulty</label><select class="form-select" id="mt-task-difficulty"><option>Easy</option><option selected>Medium</option><option>Hard</option></select></div>
                <div class="form-group"><label class="form-label">Marks / XP Value</label><input class="form-input" id="mt-task-marks" type="number" value="10"></div>
              </div>
              <div class="form-grid-2">
                <div class="form-group"><label class="form-label">Title</label><input class="form-input" id="mt-task-title"></div>
                <div class="form-group"><label class="form-label">Category</label><input class="form-input" id="mt-task-category" value="General"></div>
              </div>
              <div class="form-grid-2">
                <div class="form-group"><label class="form-label">Task Date (Optional)</label><input class="form-input" id="mt-task-date" type="date"></div>
                <div class="form-group"><label class="form-label">Task Link (Optional)</label><input class="form-input" id="mt-task-link" placeholder="https://..."></div>
              </div>
              <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="mt-task-description"></textarea></div>
              <div class="form-group">
                <label class="form-label">Submission Type</label>
                <select class="form-select" id="mt-task-submission-type">
                  <option value="file">File Upload</option>
                  <option value="link_text">Link + Message</option>
                  <option value="mixed">Flexible (File / Link / Message)</option>
                  <option value="done">Mark as Done</option>
                </select>
              </div>
              <button class="btn btn-primary" onclick="EC.teacherMonthTasks.addTask()">Add Task</button>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><div class="card-title">Task Library</div></div>
            <div class="card-body" style="max-height:620px;overflow:auto">
              ${this.state.tasks.length
                ? this.state.tasks.map(task => `
                  <div style="padding:14px 0;border-bottom:1px solid var(--border-soft)">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
                      <div style="font-weight:700">#${task.taskNumber} ${task.title}</div>
                      <div style="display:flex;gap:8px;flex-wrap:wrap">
                        <span class="tag ${String(task.difficulty).toLowerCase()}">${task.difficulty}</span>
                        <span class="tag cat">${task.category}</span>
                        <span class="tag">${task.answerMode === 'done' ? 'Mark as Done' : task.answerMode === 'mixed' ? 'Flexible' : task.answerMode === 'link_text' ? 'Link + Message' : 'File Upload'}</span>
                        <span class="tag status-done">+${task.marks}</span>
                      </div>
                    </div>
                    <div style="font-size:13px;color:var(--text-muted);margin-top:6px">${task.description || 'No description'}</div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
                      <button class="btn btn-outline btn-sm" onclick="EC.teacherMonthTasks.editTask('${task.id}')">Edit</button>
                      <button class="btn btn-danger btn-sm" onclick="EC.teacherMonthTasks.deleteTask('${task.id}')">Delete</button>
                    </div>
                  </div>
                `).join('')
                : `<div style="color:var(--text-muted)">No tasks added yet.</div>`
              }
            </div>
          </div>
        </div>

        <div>
          <div class="card mb-16">
            <div class="card-header"><div class="card-title">Overview Table</div></div>
            <div class="card-body" style="padding:0">
              <div style="max-height:360px;overflow:auto">
                <table style="width:100%;border-collapse:collapse">
                  <thead style="position:sticky;top:0;background:var(--surface)">
                    <tr>
                      <th style="padding:12px;text-align:left">Student</th>
                      <th style="padding:12px;text-align:left">Done</th>
                      <th style="padding:12px;text-align:left">Failed</th>
                      <th style="padding:12px;text-align:left">Streak</th>
                      <th style="padding:12px;text-align:left">ELITE</th>
                      <th style="padding:12px;text-align:left">Warnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this.state.overview.map(row => `
                      <tr style="background:${row.isBehind ? 'rgba(220,38,38,.08)' : 'transparent'};border-top:1px solid var(--border-soft)">
                        <td style="padding:12px;font-weight:600">${row.name}</td>
                        <td style="padding:12px">${row.tasksCompleted}</td>
                        <td style="padding:12px">${row.tasksFailed}</td>
                        <td style="padding:12px">${row.currentStreak}</td>
                        <td style="padding:12px">${row.elitePoints}</td>
                        <td style="padding:12px">${row.warningCount}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="card mb-16">
            <div class="card-header"><div class="card-title">Pending Reviews</div></div>
            <div class="card-body">
              ${this.state.pendingSubmissions.length
                ? this.state.pendingSubmissions.map(submission => `
                  <div style="padding:14px 0;border-bottom:1px solid var(--border-soft)">
                    <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
                      <div>
                        <div style="font-weight:700">${submission.studentName || 'Student'} - ${submission.taskTitle || 'Task'}</div>
                        <div style="font-size:12px;color:var(--text-muted);margin-top:4px">
                          ${submission.status === 'self_declared' ? 'Mark as Done' : 'File Upload'} - ${submission.submittedAt ? formatDateTime(submission.submittedAt) : submission.date}
                        </div>
                        ${submission.proofUrl ? `<div style="font-size:12px;margin-top:6px"><a href="${submission.proofUrl}" target="_blank">Proof URL</a></div>` : ''}
                        ${submission.proofFileUrl ? `<div style="font-size:12px;margin-top:6px"><a href="${submission.proofFileUrl}" target="_blank">${submission.proofFileName || 'Open file'}</a></div>` : ''}
                      </div>
                      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
                        <button class="btn btn-success btn-sm" onclick="EC.teacherMonthTasks.openReview('${submission.id}','approve')">Approve</button>
                        <button class="btn btn-danger btn-sm" onclick="EC.teacherMonthTasks.openReview('${submission.id}','reject')">Reject</button>
                      </div>
                    </div>
                  </div>
                `).join('')
                : `<div style="color:var(--text-muted)">No pending submissions right now.</div>`
              }
            </div>
          </div>

          <div class="card">
            <div class="card-header"><div class="card-title">Deadline Extension</div></div>
            <div class="card-body">
              <div class="form-group">
                <label class="form-label">Student</label>
                <select class="form-select" id="mt-extension-student">
                  ${EC.state.students.map(student => `<option value="${student.id}">${student.name}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Approved Leave / OD Request ID</label>
                <input class="form-input" id="mt-extension-leave-id" placeholder="Paste approved request id">
              </div>
              <div class="form-group">
                <label class="form-label">Date To Extend</label>
                <input class="form-input" id="mt-extension-date" type="date" value="${new Date().toISOString().split('T')[0]}">
              </div>
              <div class="form-group">
                <label class="form-label">Justification</label>
                <textarea class="form-textarea" id="mt-extension-justification" placeholder="Why is the 1-day extension approved?"></textarea>
              </div>
              <button class="btn btn-primary" onclick="EC.teacherMonthTasks.extendDeadline()">Extend By 1 Day</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderPastMonths(batches) {
    return `
      <div class="card">
        <div class="card-body">
          ${batches.length
            ? batches.map(batch => `
              <div style="padding:16px 0;border-bottom:1px solid var(--border-soft);display:flex;justify-content:space-between;gap:12px;align-items:center">
                <div>
                  <div style="font-weight:700">${batch.title}</div>
                  <div style="font-size:13px;color:var(--text-muted)">Targets: ${batch.minimumTarget}/${batch.eliteTarget} - ${batch.totalTasks} tasks</div>
                </div>
                <button class="btn btn-outline btn-sm" onclick="EC.teacherMonthTasks.selectBatch('${batch.id}')">Open</button>
              </div>
            `).join('')
            : `<div style="color:var(--text-muted)">No historical batches yet.</div>`
          }
        </div>
      </div>
    `;
  },

  switchTab(tab) {
    this.state.currentTab = tab;
    this.renderBody();
  },

  selectBatch(batchId) {
    this.state.activeBatchId = batchId;
    this.state.currentTab = 'current';
    this.load(batchId);
  },

  batchModal() {
    return `
      <div class="overlay" id="month-task-batch-modal">
        <div class="modal modal-lg">
          <div class="modal-header">
            <div><div class="modal-title">Create Month Task Batch</div><div class="card-subtitle">The title will auto-generate as MonthName + Year + Month Tasks.</div></div>
            <button class="modal-close" onclick="EC.teacherMonthTasks.closeBatchForm()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label">Month Name</label><input class="form-input" id="mt-batch-month" value="${new Date().toLocaleString('en-IN', { month: 'long' })}"></div>
              <div class="form-group"><label class="form-label">Year</label><input class="form-input" id="mt-batch-year" type="number" value="${new Date().getFullYear()}"></div>
            </div>
            <div class="form-grid-3">
              <div class="form-group"><label class="form-label">Total Tasks</label><input class="form-input" id="mt-batch-total" type="number" value="30"></div>
              <div class="form-group"><label class="form-label">Minimum Target</label><input class="form-input" id="mt-batch-minimum" type="number" value="15"></div>
              <div class="form-group"><label class="form-label">Elite Target</label><input class="form-input" id="mt-batch-elite" type="number" value="30"></div>
            </div>
            <div class="form-group"><label class="form-label">Negative Mark Value</label><input class="form-input" id="mt-batch-negative" type="number" value="-5"></div>
            <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="mt-batch-description"></textarea></div>
            <div class="form-group"><label class="form-label">Rules</label><textarea class="form-textarea" id="mt-batch-rules"></textarea></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="EC.teacherMonthTasks.closeBatchForm()">Cancel</button>
            <button class="btn btn-accent" onclick="EC.teacherMonthTasks.createBatch()">Create Batch</button>
          </div>
        </div>
      </div>
    `;
  },

  taskModal() {
    return `
      <div class="overlay" id="month-task-create-modal">
        <div class="modal modal-lg">
          <div class="modal-header">
            <div><div class="modal-title">Add Month Task</div><div class="card-subtitle">Add one task manually to the selected month batch.</div></div>
            <button class="modal-close" onclick="EC.teacherMonthTasks.closeTaskForm()">&times;</button>
          </div>
          <div class="modal-body">
            <div id="month-task-create-empty" style="display:none;padding:12px 0;color:var(--warning);font-weight:600">
              Create a month batch first, then add tasks to it.
            </div>
            <div class="form-grid-3">
              <div class="form-group"><label class="form-label">Task Number</label><input class="form-input" id="mt-modal-task-number" type="number"></div>
              <div class="form-group"><label class="form-label">Difficulty</label><select class="form-select" id="mt-modal-task-difficulty"><option>Easy</option><option selected>Medium</option><option>Hard</option></select></div>
              <div class="form-group"><label class="form-label">Marks / XP Value</label><input class="form-input" id="mt-modal-task-marks" type="number" value="10"></div>
            </div>
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label">Title</label><input class="form-input" id="mt-modal-task-title"></div>
              <div class="form-group"><label class="form-label">Category</label><input class="form-input" id="mt-modal-task-category" value="General"></div>
            </div>
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label">Task Date (Optional)</label><input class="form-input" id="mt-modal-task-date" type="date"></div>
              <div class="form-group"><label class="form-label">Task Link (Optional)</label><input class="form-input" id="mt-modal-task-link" placeholder="https://..."></div>
            </div>
            <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="mt-modal-task-description"></textarea></div>
            <div class="form-group">
              <label class="form-label">Submission Type</label>
              <select class="form-select" id="mt-modal-task-submission-type">
                <option value="file">File Upload</option>
                <option value="link_text">Link + Message</option>
                <option value="mixed">Flexible (File / Link / Message)</option>
                <option value="done">Mark as Done</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Task Frequency</label>
              <select class="form-select" id="mt-modal-task-frequency">
                <option value="once">One Time</option>
                <option value="daily">Daily</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="EC.teacherMonthTasks.closeTaskForm()">Cancel</button>
            <button class="btn btn-accent" onclick="EC.teacherMonthTasks.addTaskFromModal()">Add Task</button>
          </div>
        </div>
      </div>
    `;
  },

  reviewModal() {
    return `
      <div class="overlay" id="month-task-review-modal">
        <div class="modal">
          <div class="modal-header">
            <div><div class="modal-title">Review Submission</div><div class="card-subtitle" id="month-task-review-title"></div></div>
            <button class="modal-close" onclick="EC.teacherMonthTasks.closeReview()">&times;</button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="month-task-review-id">
            <input type="hidden" id="month-task-review-mode">
            <div class="form-group"><label class="form-label">Score</label><input class="form-input" id="month-task-review-score" type="number"></div>
            <div class="form-group"><label class="form-label">Notes / Reason</label><textarea class="form-textarea" id="month-task-review-notes"></textarea></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="EC.teacherMonthTasks.closeReview()">Cancel</button>
            <button class="btn btn-accent" onclick="EC.teacherMonthTasks.submitReview()">Save</button>
          </div>
        </div>
      </div>
    `;
  },

  openBatchForm() {
    document.getElementById('month-task-batch-modal')?.classList.add('open');
  },

  closeBatchForm() {
    document.getElementById('month-task-batch-modal')?.classList.remove('open');
  },

  openTaskForm() {
    const empty = document.getElementById('month-task-create-empty');
    if (empty) empty.style.display = this.state.currentBatch ? 'none' : '';
    document.getElementById('month-task-create-modal')?.classList.add('open');
  },

  closeTaskForm() {
    document.getElementById('month-task-create-modal')?.classList.remove('open');
  },

  async createBatch() {
    try {
      const batch = await EC.api.createMonthTaskBatch({
        monthName: document.getElementById('mt-batch-month')?.value?.trim(),
        year: Number(document.getElementById('mt-batch-year')?.value || 0),
        totalTasks: Number(document.getElementById('mt-batch-total')?.value || 0),
        minimumTarget: Number(document.getElementById('mt-batch-minimum')?.value || 0),
        eliteTarget: Number(document.getElementById('mt-batch-elite')?.value || 0),
        negativeMarkValue: Number(document.getElementById('mt-batch-negative')?.value || -5),
        description: document.getElementById('mt-batch-description')?.value || '',
        rules: document.getElementById('mt-batch-rules')?.value || ''
      });
      this.closeBatchForm();
      EC.toast('Month batch created successfully.', 'success');
      await this.load(batch.id);
    } catch (err) {
      EC.toast(err.message || 'Could not create batch', 'danger');
    }
  },

  async saveBatchSettings() {
    if (!this.state.currentBatch) return;
    try {
      const batch = await EC.api.updateMonthTaskBatch(this.state.currentBatch.id, {
        monthName: this.state.currentBatch.monthName,
        year: this.state.currentBatch.year,
        totalTasks: this.state.currentBatch.totalTasks,
        minimumTarget: this.state.currentBatch.minimumTarget,
        eliteTarget: this.state.currentBatch.eliteTarget,
        negativeMarkValue: Number(document.getElementById('mt-negative-mark')?.value || 0),
        description: document.getElementById('mt-description')?.value || '',
        rules: document.getElementById('mt-rules')?.value || ''
      });
      this.state.currentBatch = {
        ...this.state.currentBatch,
        ...batch,
        totalTasks: this.state.tasks.length
      };
      EC.toast('Batch settings updated.', 'success');
      this.renderBody();
    } catch (err) {
      EC.toast(err.message || 'Could not update batch', 'danger');
    }
  },

  async saveTopPerformerOverride() {
    if (!this.state.currentBatch) return;
    try {
      const batch = await EC.api.setMonthTaskTopPerformerOverride(this.state.currentBatch.id, {
        studentId: document.getElementById('mt-top-performer')?.value || '',
        date: document.getElementById('mt-top-performer-date')?.value || new Date().toISOString().split('T')[0]
      });
      this.state.currentBatch = {
        ...this.state.currentBatch,
        ...batch,
        totalTasks: this.state.tasks.length
      };
      await this.fetchSelectedDateSummary();
      EC.toast('Top performer override saved.', 'success');
      this.renderBody();
    } catch (err) {
      EC.toast(err.message || 'Could not save override', 'danger');
    }
  },

  async uploadExcel() {
    if (!this.state.currentBatch) return;
    const file = document.getElementById('month-task-excel')?.files?.[0];
    if (!file) {
      EC.toast('Choose an Excel file first.', 'warning');
      return;
    }
    try {
      const result = await EC.api.uploadMonthTaskExcel(this.state.currentBatch.id, file);
      this.upsertTasks(result.tasks || []);
      this.state.selectedDate = this.resolveSelectedDate(this.state.selectedDate);
      await this.fetchSelectedDateSummary();
      EC.toast(`Imported ${result.importedCount} tasks.`, 'success');
      this.renderBody();
    } catch (err) {
      EC.toast(err.message || 'Could not upload Excel file', 'danger');
    }
  },

  async addTask() {
    if (!this.state.currentBatch) return;
    try {
      const submissionType = document.getElementById('mt-task-submission-type')?.value || 'file';
      const frequency = document.getElementById('mt-task-frequency')?.value || 'once';
      const task = await EC.api.createMonthTask(this.state.currentBatch.id, {
        taskNumber: Number(document.getElementById('mt-task-number')?.value || 0),
        title: document.getElementById('mt-task-title')?.value || '',
        description: document.getElementById('mt-task-description')?.value || '',
        difficulty: document.getElementById('mt-task-difficulty')?.value || 'Medium',
        marks: Number(document.getElementById('mt-task-marks')?.value || 0),
        category: document.getElementById('mt-task-category')?.value || 'General',
        taskDate: document.getElementById('mt-task-date')?.value || '',
        taskLink: document.getElementById('mt-task-link')?.value || '',
        frequency,
        needsSubmission: submissionType !== 'done',
        answerMode: submissionType,
        allowFileUpload: submissionType === 'file' || submissionType === 'mixed',
        allowLinkSubmission: submissionType === 'link_text' || submissionType === 'mixed',
        allowTextSubmission: submissionType === 'link_text' || submissionType === 'mixed'
      });
      this.upsertTasks([task]);
      this.state.selectedDate = this.resolveSelectedDate(this.state.selectedDate);
      await this.fetchSelectedDateSummary();
      EC.toast('Task added to the month batch.', 'success');
      this.renderBody();
    } catch (err) {
      EC.toast(err.message || 'Could not add task', 'danger');
    }
  },

  async addTaskFromModal() {
    if (!this.state.currentBatch) {
      EC.toast('Create a month batch first.', 'warning');
      this.closeTaskForm();
      this.openBatchForm();
      return;
    }
    try {
      const submissionType = document.getElementById('mt-modal-task-submission-type')?.value || 'file';
      const frequency = document.getElementById('mt-modal-task-frequency')?.value || 'once';
      const task = await EC.api.createMonthTask(this.state.currentBatch.id, {
        taskNumber: Number(document.getElementById('mt-modal-task-number')?.value || 0),
        title: document.getElementById('mt-modal-task-title')?.value || '',
        description: document.getElementById('mt-modal-task-description')?.value || '',
        difficulty: document.getElementById('mt-modal-task-difficulty')?.value || 'Medium',
        marks: Number(document.getElementById('mt-modal-task-marks')?.value || 0),
        category: document.getElementById('mt-modal-task-category')?.value || 'General',
        taskDate: document.getElementById('mt-modal-task-date')?.value || '',
        taskLink: document.getElementById('mt-modal-task-link')?.value || '',
        frequency,
        needsSubmission: submissionType !== 'done',
        answerMode: submissionType,
        allowFileUpload: submissionType === 'file' || submissionType === 'mixed',
        allowLinkSubmission: submissionType === 'link_text' || submissionType === 'mixed',
        allowTextSubmission: submissionType === 'link_text' || submissionType === 'mixed'
      });
      this.upsertTasks([task]);
      this.state.selectedDate = this.resolveSelectedDate(this.state.selectedDate);
      await this.fetchSelectedDateSummary();
      this.closeTaskForm();
      EC.toast('Task added to the month batch.', 'success');
      this.renderBody();
    } catch (err) {
      EC.toast(err.message || 'Could not add task', 'danger');
    }
  },

  async editTask(taskId) {
    const task = this.state.tasks.find(entry => String(entry.id) === String(taskId));
    if (!task || !this.state.currentBatch) return;
    const title = prompt('Task title', task.title);
    if (!title) return;
    const frequency = prompt('Task frequency (once/daily)', task.frequency || 'once');
    if (!frequency) return;
    const taskDate = prompt('Task date (YYYY-MM-DD, optional)', task.taskDate || '') || '';
    const taskLink = prompt('Task link (optional)', task.taskLink || '') || '';
    try {
      const updatedTask = await EC.api.updateMonthTask(this.state.currentBatch.id, taskId, {
        taskNumber: task.taskNumber,
        title,
        description: task.description,
        difficulty: task.difficulty,
        marks: task.marks,
        category: task.category,
        taskDate,
        taskLink,
        frequency,
        needsSubmission: task.answerMode !== 'done',
        answerMode: task.answerMode,
        allowFileUpload: task.allowFileUpload,
        allowLinkSubmission: task.allowLinkSubmission,
        allowTextSubmission: task.allowTextSubmission
      });
      this.upsertTasks([updatedTask]);
      this.state.selectedDate = this.resolveSelectedDate(this.state.selectedDate);
      await this.fetchSelectedDateSummary();
      this.renderBody();
    } catch (err) {
      EC.toast(err.message || 'Could not update task', 'danger');
    }
  },

  async deleteTask(taskId) {
    if (!this.state.currentBatch) return;
    try {
      await EC.api.deleteMonthTask(this.state.currentBatch.id, taskId);
      this.state.tasks = (this.state.tasks || []).filter(task => String(task.id) !== String(taskId));
      if (this.state.currentBatch) {
        this.state.currentBatch.totalTasks = this.state.tasks.length;
      }
      this.state.selectedDate = this.resolveSelectedDate(this.state.selectedDate);
      await this.fetchSelectedDateSummary();
      this.renderBody();
    } catch (err) {
      EC.toast(err.message || 'Could not delete task', 'danger');
    }
  },

  openReview(submissionId, mode) {
    const submission = this.state.pendingSubmissions.find(entry => entry.id === submissionId);
    if (!submission) return;
    document.getElementById('month-task-review-id').value = submissionId;
    document.getElementById('month-task-review-mode').value = mode;
  document.getElementById('month-task-review-title').textContent = `${submission.studentName || 'Student'} - ${submission.taskTitle || 'Task'}`;
    document.getElementById('month-task-review-score').value = mode === 'approve'
      ? (this.state.tasks.find(task => task.id === submission.taskId)?.marks || 0)
      : (this.state.currentBatch?.negativeMarkValue || -5);
    document.getElementById('month-task-review-notes').value = '';
    document.getElementById('month-task-review-modal')?.classList.add('open');
  },

  closeReview() {
    document.getElementById('month-task-review-modal')?.classList.remove('open');
  },

  async submitReview() {
    const submissionId = document.getElementById('month-task-review-id')?.value;
    const mode = document.getElementById('month-task-review-mode')?.value;
    const score = Number(document.getElementById('month-task-review-score')?.value || 0);
    const notes = document.getElementById('month-task-review-notes')?.value || '';
    try {
      if (mode === 'approve') {
        await EC.api.approveMonthTaskSubmission(submissionId, { score, reviewNotes: notes });
      } else {
        await EC.api.rejectMonthTaskSubmission(submissionId, { score, reason: notes, reviewNotes: notes });
      }
      this.closeReview();
      EC.toast(`Submission ${mode === 'approve' ? 'approved' : 'rejected'}.`, 'success');
      await this.load(this.state.currentBatch.id);
    } catch (err) {
      EC.toast(err.message || 'Could not save review', 'danger');
    }
  },

  async extendDeadline() {
    if (!this.state.currentBatch) return;
    try {
      const studentId = document.getElementById('mt-extension-student')?.value;
      const scope = document.getElementById('mt-extension-scope')?.value || 'date';
      await EC.api.extendMonthTaskDeadline({
        batchId: this.state.currentBatch.id,
        studentId,
        leaveRequestId: document.getElementById('mt-extension-leave-id')?.value?.trim(),
        date: document.getElementById('mt-extension-date')?.value,
        scope,
        justification: document.getElementById('mt-extension-justification')?.value || ''
      });
      EC.toast(
        scope === 'all'
          ? 'Month-wide excuse saved.'
          : studentId === 'all'
            ? 'Deadline extended for all students.'
            : 'Deadline extended by 1 day.',
        'success'
      );
    } catch (err) {
      EC.toast(err.message || 'Could not extend deadline', 'danger');
    }
  },

  downloadTemplate() {
    const csv = [
      'Task Number,Title,Description,Difficulty,Marks/XP Value,Category,Needs Submission (Yes/No),Submission Type (file/link_text/mixed/done),Frequency (once/daily),Task Date (YYYY-MM-DD),Task Link',
      '1,LinkedIn Optimisation,Update profile banner and headline,Easy,10,Branding,No,done,once,2026-04-18,https://classroom.google.com/c/example-task-1',
      '2,LeetCode Problem Solving,Solve at least one problem and submit proof,Medium,5,Coding,Yes,link_text,daily,2026-04-18,https://classroom.google.com/c/example-task-2'
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'month-task-template.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
};

EC.teacherMonthTasks.reviewModal = function() {
  return `
    <div class="overlay" id="month-task-review-modal">
      <div class="modal modal-lg">
        <div class="modal-header">
          <div><div class="modal-title">Review Submission</div><div class="card-subtitle" id="month-task-review-title"></div></div>
          <button class="modal-close" onclick="EC.teacherMonthTasks.closeReview()">X</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="month-task-review-id">
          <input type="hidden" id="month-task-review-mode">
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:16px">
            <div class="card" style="padding:14px">
              <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase">Task Type</div>
              <div id="month-task-review-type" style="font-weight:700;margin-top:6px">-</div>
            </div>
            <div class="card" style="padding:14px">
              <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase">Student</div>
              <div id="month-task-review-student" style="font-weight:700;margin-top:6px">-</div>
            </div>
          </div>
          <div class="card" style="padding:16px;margin-bottom:16px">
            <div style="font-weight:700;margin-bottom:12px">Submitted Proof</div>
            <div style="display:grid;gap:12px">
              <div id="month-task-review-file-wrap" style="display:none">
                <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">File</div>
                <a id="month-task-review-file" class="btn btn-outline btn-sm" target="_blank" rel="noopener noreferrer">Open file</a>
              </div>
              <div id="month-task-review-url-wrap" style="display:none">
                <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">URL</div>
                <a id="month-task-review-url" target="_blank" rel="noopener noreferrer"></a>
              </div>
              <div id="month-task-review-message-wrap" style="display:none">
                <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">Message</div>
                <div id="month-task-review-message" style="background:var(--surface);padding:12px;border-radius:12px;white-space:pre-wrap"></div>
              </div>
              <div id="month-task-review-empty" style="color:var(--text-muted)">No file, URL, or message was submitted.</div>
            </div>
          </div>
          <div class="form-group"><label class="form-label">Score</label><input class="form-input" id="month-task-review-score" type="number"></div>
          <div class="form-group"><label class="form-label">Notes / Reason</label><textarea class="form-textarea" id="month-task-review-notes"></textarea></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="EC.teacherMonthTasks.closeReview()">Cancel</button>
          <button class="btn btn-accent" onclick="EC.teacherMonthTasks.submitReview()">Save</button>
        </div>
      </div>
    </div>
  `;
};

EC.teacherMonthTasks.renderCurrent = function(batch, currentOptions) {
  if (!batch) {
    return `
      <div class="card" style="padding:32px;text-align:center">
        <div style="font-size:44px;margin-bottom:12px">Month Tasks</div>
        <div style="font-family:'Playfair Display',serif;font-size:24px;font-weight:700;margin-bottom:8px">No month batch yet</div>
        <div style="color:var(--text-muted);margin-bottom:20px">Create the first monthly challenge to unlock student and teacher views.</div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-accent" onclick="EC.teacherMonthTasks.openBatchForm()">Create Month Batch</button>
          <button class="btn btn-outline" onclick="EC.teacherMonthTasks.openTaskForm()">Add Task</button>
        </div>
      </div>
    `;
  }

  const pendingGroups = this.state.pendingSubmissions.reduce((acc, submission) => {
    const key = submission.taskTitle || 'Untitled Task';
    if (!acc[key]) acc[key] = [];
    acc[key].push(submission);
    return acc;
  }, {});

  return `
    <div class="card mb-16">
      <div class="card-body" style="display:grid;grid-template-columns:2fr 1fr;gap:16px">
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div>
              <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:700;color:var(--royal)">${batch.title}</div>
              <div style="color:var(--text-muted);margin-top:6px">Manage task library, review student submissions, and track month progress.</div>
            </div>
            <div style="min-width:240px">
              <label class="form-label">Switch Batch</label>
              <select class="form-select" onchange="EC.teacherMonthTasks.selectBatch(this.value)">${currentOptions}</select>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-top:18px">
            ${[
              ['Total Tasks', this.state.tasks.length],
              ['Minimum Target', batch.minimumTarget],
              ['Elite Target', batch.eliteTarget],
              ['Negative Mark', batch.negativeMarkValue],
              ['Pending Reviews', this.state.pendingSubmissions.length]
            ].map(([label, value]) => `
              <div class="card" style="padding:14px;text-align:center">
                <div style="font-size:22px;font-weight:800;color:var(--royal)">${value}</div>
                <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em">${label}</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="card" style="padding:16px;background:linear-gradient(135deg,var(--royal-dark),var(--royal));color:#fff">
          <div style="font-size:12px;opacity:.8;text-transform:uppercase;letter-spacing:.08em">Daily Summary</div>
          <div style="font-size:28px;font-weight:800;margin-top:8px">${this.state.summary?.completedAtLeastOne || 0}/${this.state.summary?.totalStudents || this.state.overview.length}</div>
          <div style="font-size:13px;opacity:.85;margin-top:6px">students completed at least 1 task today</div>
          <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.18)">
            <div style="font-size:12px;opacity:.8">Top performer</div>
            <div style="font-weight:700;font-size:16px;margin-top:4px">${this.state.summary?.topPerformer?.name || 'No activity yet'}</div>
            <div style="font-size:12px;opacity:.8">${this.state.summary?.topPerformer?.tasksCompleted || 0} tasks today</div>
          </div>
        </div>
      </div>
    </div>

    <div class="card mb-16">
      <div class="card-header"><div class="card-title">Pending Reviews</div></div>
      <div class="card-body">
        ${this.state.pendingSubmissions.length
          ? Object.entries(pendingGroups).map(([taskTitle, entries]) => `
              <div style="border:1px solid var(--border);border-radius:16px;padding:16px;margin-bottom:14px">
                <div style="font-weight:800;color:var(--royal);margin-bottom:12px">${taskTitle}</div>
                <div style="display:grid;gap:10px">
                  ${entries.map(submission => `
                    <div style="display:grid;grid-template-columns:1.1fr 1.2fr 1fr auto;gap:12px;align-items:start;padding:12px;border:1px solid var(--border-soft);border-radius:12px;background:var(--surface)">
                      <div>
                        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase">Task Type</div>
                        <div style="font-weight:700;margin-top:6px">${submission.status === 'self_declared' ? 'Mark as Done' : submission.proofFileUrl ? 'File Upload' : submission.proofUrl ? 'Link Submission' : 'Message Submission'}</div>
                      </div>
                      <div>
                        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase">Student Name</div>
                        <div style="font-weight:700;margin-top:6px">${submission.studentName || 'Student'}</div>
                        <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${submission.submittedAt ? formatDateTime(submission.submittedAt) : submission.date || ''}</div>
                      </div>
                      <div>
                        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase">Submitted Items</div>
                        <div style="font-size:13px;margin-top:6px;color:var(--text-mid)">${[submission.proofFileName, submission.proofUrl ? 'URL added' : '', submission.responseText ? 'Message added' : ''].filter(Boolean).join(' - ') || 'No proof details'}</div>
                      </div>
                      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
                        <button class="btn btn-success btn-sm" onclick="EC.teacherMonthTasks.openReview('${submission.id}','approve')">Approve</button>
                        <button class="btn btn-danger btn-sm" onclick="EC.teacherMonthTasks.openReview('${submission.id}','reject')">Reject</button>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')
          : `<div style="color:var(--text-muted)">No pending submissions right now.</div>`
        }
      </div>
    </div>

    <div class="two-col-wide">
      <div>
        <div class="card mb-16">
          <div class="card-header"><div class="card-title">Batch Settings</div></div>
          <div class="card-body">
            <div class="form-grid-2">
              <div class="form-group">
                <label class="form-label">Negative Mark Value</label>
                <input class="form-input" id="mt-negative-mark" type="number" value="${batch.negativeMarkValue}">
              </div>
              <div class="form-group">
                <label class="form-label">Top Performer Override</label>
                <select class="form-select" id="mt-top-performer">
                  <option value="">Keep automatic</option>
                  ${EC.state.students.map(student => `<option value="${student.id}">${student.name}</option>`).join('')}
                </select>
              </div>
            </div>
              <div class="form-group">
                <label class="form-label">Top Performer Date</label>
                <input class="form-input" id="mt-top-performer-date" type="date" value="${new Date().toISOString().split('T')[0]}">
              </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea class="form-textarea" id="mt-description">${batch.description || ''}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Rules</label>
              <textarea class="form-textarea" id="mt-rules">${batch.rules || ''}</textarea>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <button class="btn btn-primary" onclick="EC.teacherMonthTasks.saveBatchSettings()">Save Batch Settings</button>
              <button class="btn btn-outline" onclick="EC.teacherMonthTasks.saveTopPerformerOverride()">Save Top Performer Override</button>
            </div>
          </div>
        </div>

        <div class="card mb-16">
          <div class="card-header"><div class="card-title">Bulk Upload + Manual Task Entry</div></div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Bulk Excel Upload</label>
              <input class="form-input" id="month-task-excel" type="file" accept=".xlsx,.xls">
              <div style="display:flex;gap:10px;margin-top:10px">
                <button class="btn btn-accent" onclick="EC.teacherMonthTasks.uploadExcel()">Upload Excel</button>
                <button class="btn btn-outline" onclick="EC.teacherMonthTasks.downloadTemplate()">Download Template</button>
              </div>
            </div>
              <div style="height:1px;background:var(--border);margin:18px 0"></div>
            <div class="form-grid-3">
              <div class="form-group"><label class="form-label">Task Number</label><input class="form-input" id="mt-task-number" type="number"></div>
              <div class="form-group"><label class="form-label">Difficulty</label><select class="form-select" id="mt-task-difficulty"><option>Easy</option><option selected>Medium</option><option>Hard</option></select></div>
              <div class="form-group"><label class="form-label">Marks / XP Value</label><input class="form-input" id="mt-task-marks" type="number" value="10"></div>
            </div>
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label">Title</label><input class="form-input" id="mt-task-title"></div>
              <div class="form-group"><label class="form-label">Category</label><input class="form-input" id="mt-task-category" value="General"></div>
            </div>
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label">Task Date (Optional)</label><input class="form-input" id="mt-task-date" type="date"></div>
              <div class="form-group"><label class="form-label">Task Link (Optional)</label><input class="form-input" id="mt-task-link" placeholder="https://..."></div>
            </div>
            <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="mt-task-description"></textarea></div>
            <div class="form-group">
              <label class="form-label">Submission Type</label>
              <select class="form-select" id="mt-task-submission-type">
                <option value="file">File Upload</option>
                <option value="link_text">Link + Message</option>
                <option value="mixed">Flexible (File / Link / Message)</option>
                <option value="done">Mark as Done</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Task Frequency</label>
              <select class="form-select" id="mt-task-frequency">
                <option value="once">One Time</option>
                <option value="daily">Daily</option>
              </select>
            </div>
            <button class="btn btn-primary" onclick="EC.teacherMonthTasks.addTask()">Add Task</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">Task Library</div></div>
          <div class="card-body" style="max-height:620px;overflow:auto">
            ${this.state.tasks.length
              ? this.state.tasks.map(task => `
                <div style="padding:14px 0;border-bottom:1px solid var(--border-soft)">
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
                    <div style="font-weight:700">#${task.taskNumber} ${task.title}</div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap">
                      <span class="tag ${String(task.difficulty).toLowerCase()}">${task.difficulty}</span>
                      <span class="tag cat">${task.category}</span>
                      <span class="tag">${monthTaskSubmissionLabel(task.answerMode)}</span>
                      <span class="tag">${monthTaskFrequencyLabel(task.frequency)}</span>
                      <span class="tag status-done">+${task.marks}</span>
                    </div>
                  </div>
                  <div style="font-size:13px;color:var(--text-muted);margin-top:6px">${task.description || 'No description'}</div>
                  <div style="font-size:12px;color:var(--text-muted);margin-top:6px">
                    ${task.taskDate ? `Date: ${task.taskDate}` : 'Date: Not assigned'}
                    ${task.taskLink ? ` - <a href="${task.taskLink}" target="_blank" rel="noopener noreferrer">Open task link</a>` : ''}
                  </div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
                    <button class="btn btn-outline btn-sm" onclick="EC.teacherMonthTasks.editTask('${task.id}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="EC.teacherMonthTasks.deleteTask('${task.id}')">Delete</button>
                  </div>
                </div>
              `).join('')
              : `<div style="color:var(--text-muted)">No tasks added yet.</div>`
            }
          </div>
        </div>
      </div>

      <div>
        <div class="card mb-16">
          <div class="card-header"><div class="card-title">Overview Table</div></div>
          <div class="card-body" style="padding:0">
            <div style="max-height:360px;overflow:auto">
              <table style="width:100%;border-collapse:collapse">
                <thead style="position:sticky;top:0;background:var(--surface)">
                  <tr>
                    <th style="padding:12px;text-align:left">Student</th>
                    <th style="padding:12px;text-align:left">Done</th>
                    <th style="padding:12px;text-align:left">Failed</th>
                    <th style="padding:12px;text-align:left">Streak</th>
                    <th style="padding:12px;text-align:left">ELITE</th>
                    <th style="padding:12px;text-align:left">Warnings</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.state.overview.map(row => `
                    <tr style="background:${row.isBehind ? 'rgba(220,38,38,.08)' : 'transparent'};border-top:1px solid var(--border-soft)">
                      <td style="padding:12px;font-weight:600">${row.name}</td>
                      <td style="padding:12px">${row.tasksCompleted}</td>
                      <td style="padding:12px">${row.tasksFailed}</td>
                      <td style="padding:12px">${row.currentStreak}</td>
                      <td style="padding:12px">${row.elitePoints}</td>
                      <td style="padding:12px">${row.warningCount}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">Deadline Extension</div></div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Student</label>
              <select class="form-select" id="mt-extension-student">
                <option value="all">All Students</option>
                ${EC.state.students.map(student => `<option value="${student.id}">${student.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Extension Scope</label>
              <select class="form-select" id="mt-extension-scope">
                <option value="date">Selected date only</option>
                <option value="all">All remaining month-task dates</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Approved Leave / OD Request ID</label>
              <input class="form-input" id="mt-extension-leave-id" placeholder="Optional for all-student or all-month excuses">
            </div>
            <div class="form-group">
              <label class="form-label">Date To Extend</label>
              <input class="form-input" id="mt-extension-date" type="date" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
              <label class="form-label">Justification</label>
              <textarea class="form-textarea" id="mt-extension-justification" placeholder="Holiday, event, approved OD, or other reason"></textarea>
            </div>
            <button class="btn btn-primary" onclick="EC.teacherMonthTasks.extendDeadline()">Save Extension / Excuse</button>
          </div>
        </div>
      </div>
    </div>
  `;
};

EC.teacherMonthTasks.renderCurrent = function(batch, currentOptions) {
  if (!batch) {
    return `
      <div class="card" style="padding:32px;text-align:center">
        <div style="font-size:44px;margin-bottom:12px">🗓️</div>
        <div style="font-family:'Playfair Display',serif;font-size:24px;font-weight:700;margin-bottom:8px">No month batch yet</div>
        <div style="color:var(--text-muted);margin-bottom:20px">Create the first monthly challenge to unlock student and teacher views.</div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-accent" onclick="EC.teacherMonthTasks.openBatchForm()">➕ Create Month Batch</button>
          <button class="btn btn-outline" onclick="EC.teacherMonthTasks.openTaskForm()">➕ Add Task</button>
        </div>
      </div>
    `;
  }

  const selectedDate = this.resolveSelectedDate(this.state.selectedDate);

  return `
    <div class="card mb-16">
      <div class="card-body" style="display:grid;grid-template-columns:2fr 1fr;gap:16px">
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div>
              <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:700;color:var(--royal)">${batch.title}</div>
              <div style="color:var(--text-muted);margin-top:6px">Manage all month tasks from one section.</div>
            </div>
            <div style="min-width:240px">
              <label class="form-label">Switch Batch</label>
              <select class="form-select" onchange="EC.teacherMonthTasks.selectBatch(this.value)">${currentOptions}</select>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-top:18px">
            ${[
              ['Tasks', this.state.tasks.length],
              ['Minimum', batch.minimumTarget],
              ['Elite', batch.eliteTarget],
              ['Negative', batch.negativeMarkValue],
              ['Reviews', this.state.pendingSubmissions.length]
            ].map(([label, value]) => `
              <div class="card" style="padding:14px;text-align:center">
                <div style="font-size:22px;font-weight:800;color:var(--royal)">${value}</div>
                <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em">${label}</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="card" style="padding:16px;background:linear-gradient(135deg,var(--royal-dark),var(--royal));color:#fff">
          <div style="font-size:12px;opacity:.8;text-transform:uppercase;letter-spacing:.08em">Today Summary</div>
          <div style="font-size:28px;font-weight:800;margin-top:8px">${this.state.summary?.completedAtLeastOne || 0}/${this.state.summary?.totalStudents || this.state.overview.length}</div>
          <div style="font-size:13px;opacity:.85;margin-top:6px">students completed at least 1 task today</div>
          <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.18)">
            <div style="font-size:12px;opacity:.8">Top performer</div>
            <div style="font-weight:700;font-size:16px;margin-top:4px">${this.state.summary?.topPerformer?.name || 'No activity yet'}</div>
            <div style="font-size:12px;opacity:.8">${this.state.summary?.topPerformer?.tasksCompleted || 0} tasks today</div>
          </div>
        </div>
      </div>
    </div>

    <div class="two-col-wide">
      <div>
        <div class="card mb-16">
          <div class="card-header"><div class="card-title">⚙️ Batch Settings</div></div>
          <div class="card-body">
            <div class="form-grid-2">
              <div class="form-group">
                <label class="form-label">Negative Mark Value</label>
                <input class="form-input" id="mt-negative-mark" type="number" value="${batch.negativeMarkValue}">
              </div>
              <div class="form-group">
                <label class="form-label">Top Performer Override</label>
                <select class="form-select" id="mt-top-performer">
                  <option value="">Keep automatic</option>
                  ${EC.state.students.map(student => `<option value="${student.id}">${student.name}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea class="form-textarea" id="mt-description">${batch.description || ''}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Rules</label>
              <textarea class="form-textarea" id="mt-rules">${batch.rules || ''}</textarea>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <button class="btn btn-primary" onclick="EC.teacherMonthTasks.saveBatchSettings()">💾 Save Batch Settings</button>
              <button class="btn btn-outline" onclick="EC.teacherMonthTasks.saveTopPerformerOverride()">👑 Save Top Performer Override</button>
            </div>
          </div>
        </div>

        <div class="card mb-16">
          <div class="card-header"><div class="card-title">📥 Bulk Upload + Manual Task Entry</div></div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Bulk Excel Upload</label>
              <input class="form-input" id="month-task-excel" type="file" accept=".xlsx,.xls">
              <div style="display:flex;gap:10px;margin-top:10px">
                <button class="btn btn-accent" onclick="EC.teacherMonthTasks.uploadExcel()">📤 Upload Excel</button>
                <button class="btn btn-outline" onclick="EC.teacherMonthTasks.downloadTemplate()">📥 Download Template</button>
              </div>
            </div>
            <div style="height:1px;background:var(--border);margin:18px 0"></div>
            <div class="form-grid-3">
              <div class="form-group"><label class="form-label">Task Number</label><input class="form-input" id="mt-task-number" type="number"></div>
              <div class="form-group"><label class="form-label">Difficulty</label><select class="form-select" id="mt-task-difficulty"><option>Easy</option><option selected>Medium</option><option>Hard</option></select></div>
              <div class="form-group"><label class="form-label">Marks / XP Value</label><input class="form-input" id="mt-task-marks" type="number" value="10"></div>
            </div>
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label">Title</label><input class="form-input" id="mt-task-title"></div>
              <div class="form-group"><label class="form-label">Category</label><input class="form-input" id="mt-task-category" value="General"></div>
            </div>
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label">Task Date</label><input class="form-input" id="mt-task-date" type="date" value="${selectedDate}"></div>
              <div class="form-group"><label class="form-label">Task Link</label><input class="form-input" id="mt-task-link" placeholder="https://..."></div>
            </div>
            <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="mt-task-description"></textarea></div>
            <div class="form-group">
              <label class="form-label">Submission Type</label>
              <select class="form-select" id="mt-task-submission-type">
                <option value="file">File Upload</option>
                <option value="link_text">Link + Message</option>
                <option value="mixed">Flexible (File / Link / Message)</option>
                <option value="done">Mark as Done</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Task Frequency</label>
              <select class="form-select" id="mt-task-frequency">
                <option value="once">One Time</option>
                <option value="daily">Daily</option>
              </select>
            </div>
            <button class="btn btn-primary" onclick="EC.teacherMonthTasks.addTask()">➕ Add Task</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">📚 Task Library</div></div>
          <div class="card-body" style="max-height:620px;overflow:auto">
            ${this.state.tasks.length
              ? this.state.tasks.map(task => `
                <div style="padding:14px 0;border-bottom:1px solid var(--border-soft)">
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
                    <div style="font-weight:700">#${task.taskNumber} ${task.title}</div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap">
                      <span class="tag ${String(task.difficulty).toLowerCase()}">${task.difficulty}</span>
                      <span class="tag cat">${task.category}</span>
                      <span class="tag">${monthTaskSubmissionLabel(task.answerMode)}</span>
                      <span class="tag">${monthTaskFrequencyLabel(task.frequency)}</span>
                      <span class="tag status-done">+${task.marks}</span>
                    </div>
                  </div>
                  <div style="font-size:13px;color:var(--text-muted);margin-top:6px">${task.description || 'No description'}</div>
                  <div style="font-size:12px;color:var(--text-muted);margin-top:6px">
                    ${task.taskDate ? `Date: ${task.taskDate}` : 'Date: Not assigned'}
                    ${task.taskLink ? ` &bull; <a href="${task.taskLink}" target="_blank" rel="noopener noreferrer">Open task link</a>` : ''}
                  </div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
                    <button class="btn btn-outline btn-sm" onclick="EC.teacherMonthTasks.editTask('${task.id}')">✏️ Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="EC.teacherMonthTasks.deleteTask('${task.id}')">🗑️ Delete</button>
                  </div>
                </div>
              `).join('')
              : `<div style="color:var(--text-muted)">No tasks added yet.</div>`
            }
          </div>
        </div>
      </div>

      <div>
        <div class="card mb-16">
          <div class="card-header"><div class="card-title">📊 Overview Table</div></div>
          <div class="card-body" style="padding:0">
            <div style="max-height:360px;overflow:auto">
              <table style="width:100%;border-collapse:collapse">
                <thead style="position:sticky;top:0;background:var(--surface)">
                  <tr>
                    <th style="padding:12px;text-align:left">Student</th>
                    <th style="padding:12px;text-align:left">Done</th>
                    <th style="padding:12px;text-align:left">Failed</th>
                    <th style="padding:12px;text-align:left">Streak</th>
                    <th style="padding:12px;text-align:left">ELITE</th>
                    <th style="padding:12px;text-align:left">Warnings</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.state.overview.map(row => `
                    <tr style="background:${row.isBehind ? 'rgba(220,38,38,.08)' : 'transparent'};border-top:1px solid var(--border-soft)">
                      <td style="padding:12px;font-weight:600">${row.name}</td>
                      <td style="padding:12px">${row.tasksCompleted}</td>
                      <td style="padding:12px">${row.tasksFailed}</td>
                      <td style="padding:12px">${row.currentStreak}</td>
                      <td style="padding:12px">${row.elitePoints}</td>
                      <td style="padding:12px">${row.warningCount}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card mb-16">
          <div class="card-header"><div class="card-title">🕒 Pending Reviews</div></div>
          <div class="card-body">
            ${this.state.pendingSubmissions.length
              ? this.state.pendingSubmissions.map(submission => `
                <div style="padding:14px 0;border-bottom:1px solid var(--border-soft)">
                  <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
                    <div>
                      <div style="font-weight:700">${submission.studentName || 'Student'} - ${submission.taskTitle || 'Task'}</div>
                      <div style="font-size:12px;color:var(--text-muted);margin-top:4px">
                        ${submission.status === 'self_declared' ? 'Mark as Done' : 'File Upload'} - ${submission.submittedAt ? formatDateTime(submission.submittedAt) : submission.date}
                      </div>
                    </div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
                      <button class="btn btn-success btn-sm" onclick="EC.teacherMonthTasks.openReview('${submission.id}','approve')">✅ Approve</button>
                      <button class="btn btn-danger btn-sm" onclick="EC.teacherMonthTasks.openReview('${submission.id}','reject')">❌ Reject</button>
                    </div>
                  </div>
                </div>
              `).join('')
              : `<div style="color:var(--text-muted)">No pending submissions right now.</div>`
            }
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">📅 Deadline Extension</div></div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Student</label>
              <select class="form-select" id="mt-extension-student">
                <option value="all">All Students</option>
                ${EC.state.students.map(student => `<option value="${student.id}">${student.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Extension Scope</label>
              <select class="form-select" id="mt-extension-scope">
                <option value="date">Selected date only</option>
                <option value="all">All remaining month-task dates</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Approved Leave / OD Request ID</label>
              <input class="form-input" id="mt-extension-leave-id" placeholder="Optional for all-student or all-month excuses">
            </div>
            <div class="form-group">
              <label class="form-label">Date To Extend</label>
              <input class="form-input" id="mt-extension-date" type="date" value="${selectedDate}">
            </div>
            <div class="form-group">
              <label class="form-label">Justification</label>
              <textarea class="form-textarea" id="mt-extension-justification" placeholder="Holiday, event, approved OD, or other reason"></textarea>
            </div>
            <button class="btn btn-primary" onclick="EC.teacherMonthTasks.extendDeadline()">📌 Save Extension / Excuse</button>
          </div>
        </div>
      </div>
    </div>
  `;
};

EC.teacherMonthTasks.renderCurrent = function(batch, currentOptions) {
  if (!batch) {
    return `
      <div class="card" style="padding:32px;text-align:center">
        <div style="font-size:44px;margin-bottom:12px">&#128467;&#65039;</div>
        <div style="font-family:'Playfair Display',serif;font-size:24px;font-weight:700;margin-bottom:8px">No month batch yet</div>
        <div style="color:var(--text-muted);margin-bottom:20px">Create the first monthly challenge to unlock student and teacher views.</div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-accent" onclick="EC.teacherMonthTasks.openBatchForm()">Create Month Batch</button>
          <button class="btn btn-outline" onclick="EC.teacherMonthTasks.openTaskForm()">+ Add Task</button>
        </div>
      </div>
    `;
  }

  const selectedDate = this.resolveSelectedDate(this.state.selectedDate);
  const selectedSummary = this.state.selectedDateSummary || null;
  const topThree = selectedSummary?.topThree || [];
  const tasksForSelectedDate = this.getTasksForSelectedDate();
  const datedTaskPages = this.getTaskDates();

  return `
    <div class="card mb-16">
      <div class="card-body" style="display:grid;grid-template-columns:2fr 1fr;gap:16px">
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div>
              <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:700;color:var(--royal)">${batch.title}</div>
              <div style="color:var(--text-muted);margin-top:6px">Manage date-wise task pages, separate task links, and daily topper tracking from one month-task section.</div>
            </div>
            <div style="min-width:240px">
              <label class="form-label">Switch Batch</label>
              <select class="form-select" onchange="EC.teacherMonthTasks.selectBatch(this.value)">${currentOptions}</select>
            </div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
            <button class="btn btn-outline" onclick="EC.teacherReview.previousPage='month-tasks';EC.navigate('review')">Review Page</button>
            <button class="btn btn-outline" onclick="EC.excelWorkbook.state.previousPage='month-tasks';EC.navigate('excel-workbook')">Workbook</button>
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:end;margin-top:16px">
            <div style="min-width:220px;flex:1 1 220px">
              <label class="form-label">Open Date Page</label>
              <input class="form-input" type="date" value="${selectedDate}" onchange="EC.teacherMonthTasks.setSelectedDate(this.value)">
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;flex:2 1 360px">
              ${(datedTaskPages.length ? datedTaskPages : [selectedDate]).map(dateValue => `
                <button class="btn ${dateValue === selectedDate ? 'btn-accent' : 'btn-outline'} btn-sm" onclick="EC.teacherMonthTasks.setSelectedDate('${dateValue}')">${monthTaskDisplayDate(dateValue)}</button>
              `).join('')}
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-top:18px">
            ${[
              ['Total Tasks', this.state.tasks.length],
              ['Date Pages', datedTaskPages.length],
              ['Minimum Target', batch.minimumTarget],
              ['Elite Target', batch.eliteTarget],
              ['Pending Reviews', this.state.pendingSubmissions.length]
            ].map(([label, value]) => `
              <div class="card" style="padding:14px;text-align:center">
                <div style="font-size:22px;font-weight:800;color:var(--royal)">${value}</div>
                <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em">${label}</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="card" style="padding:16px;background:linear-gradient(135deg,var(--royal-dark),var(--royal));color:#fff">
          <div style="font-size:12px;opacity:.8;text-transform:uppercase;letter-spacing:.08em">Today Summary</div>
          <div style="font-size:28px;font-weight:800;margin-top:8px">${this.state.summary?.completedAtLeastOne || 0}/${this.state.summary?.totalStudents || this.state.overview.length}</div>
          <div style="font-size:13px;opacity:.85;margin-top:6px">students completed at least 1 task today</div>
          <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.18)">
            <div style="font-size:12px;opacity:.8">Today's top performer</div>
            <div style="font-weight:700;font-size:16px;margin-top:4px">${this.state.summary?.topPerformer?.name || 'No activity yet'}</div>
            <div style="font-size:12px;opacity:.8">${this.state.summary?.topPerformer?.tasksCompleted || 0} tasks today</div>
          </div>
        </div>
      </div>
    </div>

    <div class="two-col-wide" style="margin-bottom:16px">
      <div>
        <div class="card mb-16">
          <div class="card-header"><div class="card-title">Daily Top Performers</div></div>
          <div class="card-body" style="max-height:320px;overflow:auto">
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Separate topper list for ${monthTaskDisplayDate(selectedDate)}</div>
            ${topThree.length
              ? topThree.map(entry => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border-soft)">
                  <div>
                    <div style="font-weight:700">#${entry.rank} ${entry.name}</div>
                    <div style="font-size:12px;color:var(--text-muted)">${entry.tasksCompleted} task${entry.tasksCompleted === 1 ? '' : 's'} completed</div>
                  </div>
                  <span class="tag status-done">+${entry.pointsAwarded}</span>
                </div>
              `).join('')
              : `<div style="color:var(--text-muted)">No topper data for this date yet.</div>`
            }
            <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border-soft)">
              <div style="font-size:12px;color:var(--text-muted)">Selected date summary</div>
              <div style="font-weight:700;margin-top:6px">${selectedSummary?.completedAtLeastOne || 0}/${selectedSummary?.totalStudents || this.state.overview.length} students active</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:6px">${selectedSummary?.topPerformer?.name ? `${selectedSummary.topPerformer.name} leads this date page.` : 'No top performer recorded yet.'}</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">Tasks For Selected Date</div></div>
          <div class="card-body">
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px">Use Excel or manual task entry in this same section. Set Task Date and Task Link for each task to organize date-wise pages without a separate Daily Task card.</div>
            ${tasksForSelectedDate.length
              ? `<div style="display:grid;gap:12px">
                  ${tasksForSelectedDate.map(task => `
                    <div style="padding:14px;border:1px solid var(--border-soft);border-radius:14px;background:var(--surface)">
                      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap">
                        <div>
                          <div style="font-weight:700">#${task.taskNumber} ${task.title}</div>
                          <div style="font-size:12px;color:var(--text-muted);margin-top:6px">${task.description || 'No description'}</div>
                        </div>
                        <div style="display:flex;gap:8px;flex-wrap:wrap">
                          <span class="tag ${String(task.difficulty).toLowerCase()}">${task.difficulty}</span>
                          <span class="tag">${monthTaskSubmissionLabel(task.answerMode)}</span>
                          <span class="tag status-done">+${task.marks}</span>
                        </div>
                      </div>
                      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
                        ${task.taskLink ? `<a class="btn btn-outline btn-sm" href="${task.taskLink}" target="_blank" rel="noopener noreferrer">Open Task Link</a>` : `<span style="font-size:12px;color:var(--text-muted)">No link added yet</span>`}
                        <button class="btn btn-outline btn-sm" onclick="EC.teacherMonthTasks.editTask('${task.id}')">Edit</button>
                      </div>
                    </div>
                  `).join('')}
                </div>`
              : `<div style="color:var(--text-muted)">No dated tasks on ${monthTaskDisplayDate(selectedDate)} yet. Add them manually or import them through Excel.</div>`
            }
          </div>
        </div>
      </div>

      <div>
        <div class="card mb-16">
          <div class="card-header"><div class="card-title">Bulk Upload + Manual Task Entry</div></div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Bulk Excel Upload</label>
              <input class="form-input" id="month-task-excel" type="file" accept=".xlsx,.xls">
              <div style="display:flex;gap:10px;margin-top:10px">
                <button class="btn btn-accent" onclick="EC.teacherMonthTasks.uploadExcel()">Upload Excel</button>
                <button class="btn btn-outline" onclick="EC.teacherMonthTasks.downloadTemplate()">Download Template</button>
              </div>
            </div>
            <div style="height:1px;background:var(--border);margin:18px 0"></div>
            <div class="form-grid-3">
              <div class="form-group"><label class="form-label">Task Number</label><input class="form-input" id="mt-task-number" type="number"></div>
              <div class="form-group"><label class="form-label">Difficulty</label><select class="form-select" id="mt-task-difficulty"><option>Easy</option><option selected>Medium</option><option>Hard</option></select></div>
              <div class="form-group"><label class="form-label">Marks / XP Value</label><input class="form-input" id="mt-task-marks" type="number" value="10"></div>
            </div>
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label">Title</label><input class="form-input" id="mt-task-title"></div>
              <div class="form-group"><label class="form-label">Category</label><input class="form-input" id="mt-task-category" value="General"></div>
            </div>
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label">Task Date</label><input class="form-input" id="mt-task-date" type="date" value="${selectedDate}"></div>
              <div class="form-group"><label class="form-label">Task Link</label><input class="form-input" id="mt-task-link" placeholder="https://..."></div>
            </div>
            <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="mt-task-description"></textarea></div>
            <div class="form-group">
              <label class="form-label">Submission Type</label>
              <select class="form-select" id="mt-task-submission-type">
                <option value="file">File Upload</option>
                <option value="link_text">Link + Message</option>
                <option value="mixed">Flexible (File / Link / Message)</option>
                <option value="done">Mark as Done</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Task Frequency</label>
              <select class="form-select" id="mt-task-frequency">
                <option value="once">One Time</option>
                <option value="daily">Daily</option>
              </select>
            </div>
            <button class="btn btn-primary" onclick="EC.teacherMonthTasks.addTask()">Add Task</button>
          </div>
        </div>

        <div class="card mb-16">
          <div class="card-header"><div class="card-title">Overview Table</div></div>
          <div class="card-body" style="padding:0">
            <div style="max-height:360px;overflow:auto">
              <table style="width:100%;border-collapse:collapse">
                <thead style="position:sticky;top:0;background:var(--surface)">
                  <tr>
                    <th style="padding:12px;text-align:left">Student</th>
                    <th style="padding:12px;text-align:left">Done</th>
                    <th style="padding:12px;text-align:left">Failed</th>
                    <th style="padding:12px;text-align:left">Streak</th>
                    <th style="padding:12px;text-align:left">ELITE</th>
                    <th style="padding:12px;text-align:left">Warnings</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.state.overview.map(row => `
                    <tr style="background:${row.isBehind ? 'rgba(220,38,38,.08)' : 'transparent'};border-top:1px solid var(--border-soft)">
                      <td style="padding:12px;font-weight:600">${row.name}</td>
                      <td style="padding:12px">${row.tasksCompleted}</td>
                      <td style="padding:12px">${row.tasksFailed}</td>
                      <td style="padding:12px">${row.currentStreak}</td>
                      <td style="padding:12px">${row.elitePoints}</td>
                      <td style="padding:12px">${row.warningCount}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">Deadline Extension</div></div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Student</label>
              <select class="form-select" id="mt-extension-student">
                <option value="all">All Students</option>
                ${EC.state.students.map(student => `<option value="${student.id}">${student.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Extension Scope</label>
              <select class="form-select" id="mt-extension-scope">
                <option value="date">Selected date only</option>
                <option value="all">All remaining month-task dates</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Approved Leave / OD Request ID</label>
              <input class="form-input" id="mt-extension-leave-id" placeholder="Optional for all-student or all-month excuses">
            </div>
            <div class="form-group">
              <label class="form-label">Date To Extend</label>
              <input class="form-input" id="mt-extension-date" type="date" value="${selectedDate}">
            </div>
            <div class="form-group">
              <label class="form-label">Justification</label>
              <textarea class="form-textarea" id="mt-extension-justification" placeholder="Holiday, event, approved OD, or other reason"></textarea>
            </div>
            <button class="btn btn-primary" onclick="EC.teacherMonthTasks.extendDeadline()">Save Extension / Excuse</button>
          </div>
        </div>
      </div>
    </div>
  `;
};

EC.teacherMonthTasks.renderCurrent = function(batch, currentOptions) {
  if (!batch) {
    return `
      <div class="card" style="padding:32px;text-align:center">
        <div style="font-size:44px;margin-bottom:12px">&#128467;&#65039;</div>
        <div style="font-family:'Playfair Display',serif;font-size:24px;font-weight:700;margin-bottom:8px">No month batch yet</div>
        <div style="color:var(--text-muted);margin-bottom:20px">Create the first monthly challenge to unlock student and teacher views.</div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-accent" onclick="EC.teacherMonthTasks.openBatchForm()">Create Month Batch</button>
          <button class="btn btn-outline" onclick="EC.teacherMonthTasks.openTaskForm()">+ Add Task</button>
        </div>
      </div>
    `;
  }

  const selectedDate = this.resolveSelectedDate(this.state.selectedDate);
  const selectedSummary = this.state.selectedDateSummary || null;
  const topThree = selectedSummary?.topThree || [];
  const tasksForSelectedDate = this.getTasksForSelectedDate();
  const datedTaskPages = this.getTaskDates();

  return `
    <div class="card mb-16">
      <div class="card-body" style="display:grid;grid-template-columns:2fr 1fr;gap:16px">
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div>
              <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:700;color:var(--royal)">${batch.title}</div>
              <div style="color:var(--text-muted);margin-top:6px">Manage date-wise task pages, separate task links, and daily topper tracking from one month-task section.</div>
            </div>
            <div style="min-width:240px">
              <label class="form-label">Switch Batch</label>
              <select class="form-select" onchange="EC.teacherMonthTasks.selectBatch(this.value)">${currentOptions}</select>
            </div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
            <button class="btn btn-outline" onclick="EC.teacherReview.previousPage='month-tasks';EC.navigate('review')">Review Page</button>
            <button class="btn btn-outline" onclick="EC.excelWorkbook.state.previousPage='month-tasks';EC.navigate('excel-workbook')">Workbook</button>
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:end;margin-top:16px">
            <div style="min-width:220px;flex:1 1 220px">
              <label class="form-label">Open Date Page</label>
              <input class="form-input" type="date" value="${selectedDate}" onchange="EC.teacherMonthTasks.setSelectedDate(this.value)">
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;flex:2 1 360px">
              ${(datedTaskPages.length ? datedTaskPages : [selectedDate]).map(dateValue => `
                <button class="btn ${dateValue === selectedDate ? 'btn-accent' : 'btn-outline'} btn-sm" onclick="EC.teacherMonthTasks.setSelectedDate('${dateValue}')">${monthTaskDisplayDate(dateValue)}</button>
              `).join('')}
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-top:18px">
            ${[
              ['Total Tasks', this.state.tasks.length],
              ['Date Pages', datedTaskPages.length],
              ['Minimum Target', batch.minimumTarget],
              ['Elite Target', batch.eliteTarget],
              ['Pending Reviews', this.state.pendingSubmissions.length]
            ].map(([label, value]) => `
              <div class="card" style="padding:14px;text-align:center">
                <div style="font-size:22px;font-weight:800;color:var(--royal)">${value}</div>
                <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em">${label}</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="card" style="padding:16px;background:linear-gradient(135deg,var(--royal-dark),var(--royal));color:#fff">
          <div style="font-size:12px;opacity:.8;text-transform:uppercase;letter-spacing:.08em">Today Summary</div>
          <div style="font-size:28px;font-weight:800;margin-top:8px">${this.state.summary?.completedAtLeastOne || 0}/${this.state.summary?.totalStudents || this.state.overview.length}</div>
          <div style="font-size:13px;opacity:.85;margin-top:6px">students completed at least 1 task today</div>
          <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.18)">
            <div style="font-size:12px;opacity:.8">Today's top performer</div>
            <div style="font-weight:700;font-size:16px;margin-top:4px">${this.state.summary?.topPerformer?.name || 'No activity yet'}</div>
            <div style="font-size:12px;opacity:.8">${this.state.summary?.topPerformer?.tasksCompleted || 0} tasks today</div>
          </div>
        </div>
      </div>
    </div>

    <div class="two-col-wide" style="margin-bottom:16px">
      <div>
        <div class="card mb-16">
          <div class="card-header"><div class="card-title">Daily Top Performers</div></div>
          <div class="card-body" style="max-height:320px;overflow:auto">
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Separate topper list for ${monthTaskDisplayDate(selectedDate)}</div>
            ${topThree.length
              ? topThree.map(entry => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border-soft)">
                  <div>
                    <div style="font-weight:700">#${entry.rank} ${entry.name}</div>
                    <div style="font-size:12px;color:var(--text-muted)">${entry.tasksCompleted} task${entry.tasksCompleted === 1 ? '' : 's'} completed</div>
                  </div>
                  <span class="tag status-done">+${entry.pointsAwarded}</span>
                </div>
              `).join('')
              : `<div style="color:var(--text-muted)">No topper data for this date yet.</div>`
            }
            <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border-soft)">
              <div style="font-size:12px;color:var(--text-muted)">Selected date summary</div>
              <div style="font-weight:700;margin-top:6px">${selectedSummary?.completedAtLeastOne || 0}/${selectedSummary?.totalStudents || this.state.overview.length} students active</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:6px">${selectedSummary?.topPerformer?.name ? `${selectedSummary.topPerformer.name} leads this date page.` : 'No top performer recorded yet.'}</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">Tasks For Selected Date</div></div>
          <div class="card-body">
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px">Use Excel or manual task entry in this same section. Set Task Date and Task Link for each task to organize date-wise pages without a separate Daily Task card.</div>
            ${tasksForSelectedDate.length
              ? `<div style="display:grid;gap:12px">
                  ${tasksForSelectedDate.map(task => `
                    <div style="padding:14px;border:1px solid var(--border-soft);border-radius:14px;background:var(--surface)">
                      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap">
                        <div>
                          <div style="font-weight:700">#${task.taskNumber} ${task.title}</div>
                          <div style="font-size:12px;color:var(--text-muted);margin-top:6px">${task.description || 'No description'}</div>
                        </div>
                        <div style="display:flex;gap:8px;flex-wrap:wrap">
                          <span class="tag ${String(task.difficulty).toLowerCase()}">${task.difficulty}</span>
                          <span class="tag">${monthTaskSubmissionLabel(task.answerMode)}</span>
                          <span class="tag status-done">+${task.marks}</span>
                        </div>
                      </div>
                      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
                        ${task.taskLink ? `<a class="btn btn-outline btn-sm" href="${task.taskLink}" target="_blank" rel="noopener noreferrer">Open Task Link</a>` : `<span style="font-size:12px;color:var(--text-muted)">No link added yet</span>`}
                        <button class="btn btn-outline btn-sm" onclick="EC.teacherMonthTasks.editTask('${task.id}')">Edit</button>
                      </div>
                    </div>
                  `).join('')}
                </div>`
              : `<div style="color:var(--text-muted)">No dated tasks on ${monthTaskDisplayDate(selectedDate)} yet. Add them manually or import them through Excel.</div>`
            }
          </div>
        </div>
      </div>

      <div>
        <div class="card mb-16">
          <div class="card-header"><div class="card-title">Bulk Upload + Manual Task Entry</div></div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Bulk Excel Upload</label>
              <input class="form-input" id="month-task-excel" type="file" accept=".xlsx,.xls">
              <div style="display:flex;gap:10px;margin-top:10px">
                <button class="btn btn-accent" onclick="EC.teacherMonthTasks.uploadExcel()">Upload Excel</button>
                <button class="btn btn-outline" onclick="EC.teacherMonthTasks.downloadTemplate()">Download Template</button>
              </div>
            </div>
            <div style="height:1px;background:var(--border);margin:18px 0"></div>
            <div class="form-grid-3">
              <div class="form-group"><label class="form-label">Task Number</label><input class="form-input" id="mt-task-number" type="number"></div>
              <div class="form-group"><label class="form-label">Difficulty</label><select class="form-select" id="mt-task-difficulty"><option>Easy</option><option selected>Medium</option><option>Hard</option></select></div>
              <div class="form-group"><label class="form-label">Marks / XP Value</label><input class="form-input" id="mt-task-marks" type="number" value="10"></div>
            </div>
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label">Title</label><input class="form-input" id="mt-task-title"></div>
              <div class="form-group"><label class="form-label">Category</label><input class="form-input" id="mt-task-category" value="General"></div>
            </div>
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label">Task Date</label><input class="form-input" id="mt-task-date" type="date" value="${selectedDate}"></div>
              <div class="form-group"><label class="form-label">Task Link</label><input class="form-input" id="mt-task-link" placeholder="https://..."></div>
            </div>
            <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="mt-task-description"></textarea></div>
            <div class="form-group">
              <label class="form-label">Submission Type</label>
              <select class="form-select" id="mt-task-submission-type">
                <option value="file">File Upload</option>
                <option value="link_text">Link + Message</option>
                <option value="mixed">Flexible (File / Link / Message)</option>
                <option value="done">Mark as Done</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Task Frequency</label>
              <select class="form-select" id="mt-task-frequency">
                <option value="once">One Time</option>
                <option value="daily">Daily</option>
              </select>
            </div>
            <button class="btn btn-primary" onclick="EC.teacherMonthTasks.addTask()">Add Task</button>
          </div>
        </div>

        <div class="card mb-16">
          <div class="card-header"><div class="card-title">Overview Table</div></div>
          <div class="card-body" style="padding:0">
            <div style="max-height:360px;overflow:auto">
              <table style="width:100%;border-collapse:collapse">
                <thead style="position:sticky;top:0;background:var(--surface)">
                  <tr>
                    <th style="padding:12px;text-align:left">Student</th>
                    <th style="padding:12px;text-align:left">Done</th>
                    <th style="padding:12px;text-align:left">Failed</th>
                    <th style="padding:12px;text-align:left">Streak</th>
                    <th style="padding:12px;text-align:left">ELITE</th>
                    <th style="padding:12px;text-align:left">Warnings</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.state.overview.map(row => `
                    <tr style="background:${row.isBehind ? 'rgba(220,38,38,.08)' : 'transparent'};border-top:1px solid var(--border-soft)">
                      <td style="padding:12px;font-weight:600">${row.name}</td>
                      <td style="padding:12px">${row.tasksCompleted}</td>
                      <td style="padding:12px">${row.tasksFailed}</td>
                      <td style="padding:12px">${row.currentStreak}</td>
                      <td style="padding:12px">${row.elitePoints}</td>
                      <td style="padding:12px">${row.warningCount}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">Deadline Extension</div></div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Student</label>
              <select class="form-select" id="mt-extension-student">
                <option value="all">All Students</option>
                ${EC.state.students.map(student => `<option value="${student.id}">${student.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Extension Scope</label>
              <select class="form-select" id="mt-extension-scope">
                <option value="date">Selected date only</option>
                <option value="all">All remaining month-task dates</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Approved Leave / OD Request ID</label>
              <input class="form-input" id="mt-extension-leave-id" placeholder="Optional for all-student or all-month excuses">
            </div>
            <div class="form-group">
              <label class="form-label">Date To Extend</label>
              <input class="form-input" id="mt-extension-date" type="date" value="${selectedDate}">
            </div>
            <div class="form-group">
              <label class="form-label">Justification</label>
              <textarea class="form-textarea" id="mt-extension-justification" placeholder="Holiday, event, approved OD, or other reason"></textarea>
            </div>
            <button class="btn btn-primary" onclick="EC.teacherMonthTasks.extendDeadline()">Save Extension / Excuse</button>
          </div>
        </div>
      </div>
    </div>
  `;
};

EC.teacherMonthTasks.renderCurrent = function(batch, currentOptions) {
  if (!batch) {
    return `
      <div class="card" style="padding:32px;text-align:center">
        <div style="font-size:44px;margin-bottom:12px">&#128467;&#65039;</div>
        <div style="font-family:'Playfair Display',serif;font-size:24px;font-weight:700;margin-bottom:8px">No month batch yet</div>
        <div style="color:var(--text-muted);margin-bottom:20px">Create the first monthly challenge to unlock student and teacher views.</div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-accent" onclick="EC.teacherMonthTasks.openBatchForm()">Create Month Batch</button>
          <button class="btn btn-outline" onclick="EC.teacherMonthTasks.openTaskForm()">+ Add Task</button>
        </div>
      </div>
    `;
  }

  const selectedDate = this.resolveSelectedDate(this.state.selectedDate);
  const topThree = this.state.selectedDateSummary?.topThree || [];
  const datedTaskPages = this.getTaskDates();

  return `
    <div class="card mb-16">
      <div class="card-body" style="display:grid;grid-template-columns:2fr 1fr;gap:16px">
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div>
              <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:700;color:var(--royal)">${batch.title}</div>
              <div style="color:var(--text-muted);margin-top:6px">Manage month tasks, workbook links, daily toppers, and review flow from one section.</div>
            </div>
            <div style="min-width:240px">
              <label class="form-label">Switch Batch</label>
              <select class="form-select" onchange="EC.teacherMonthTasks.selectBatch(this.value)">${currentOptions}</select>
            </div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
            <button class="btn btn-outline" onclick="EC.teacherReview.previousPage='month-tasks';EC.navigate('review')">Review Page</button>
            <button class="btn btn-outline" onclick="EC.excelWorkbook.state.previousPage='month-tasks';EC.navigate('excel-workbook')">Workbook</button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-top:18px">
            ${[
              ['Total Tasks', this.state.tasks.length],
              ['Date Pages', datedTaskPages.length],
              ['Minimum Target', batch.minimumTarget],
              ['Elite Target', batch.eliteTarget],
              ['Pending Reviews', this.state.pendingSubmissions.length]
            ].map(([label, value]) => `
              <div class="card" style="padding:14px;text-align:center">
                <div style="font-size:22px;font-weight:800;color:var(--royal)">${value}</div>
                <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em">${label}</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="card" style="padding:16px;background:linear-gradient(135deg,var(--royal-dark),var(--royal));color:#fff">
          <div style="font-size:12px;opacity:.8;text-transform:uppercase;letter-spacing:.08em">Today Summary</div>
          <div style="font-size:28px;font-weight:800;margin-top:8px">${this.state.summary?.completedAtLeastOne || 0}/${this.state.summary?.totalStudents || this.state.overview.length}</div>
          <div style="font-size:13px;opacity:.85;margin-top:6px">students completed at least 1 task today</div>
          <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.18)">
            <div style="font-size:12px;opacity:.8">Today's top performer</div>
            <div style="font-weight:700;font-size:16px;margin-top:4px">${this.state.summary?.topPerformer?.name || 'No activity yet'}</div>
            <div style="font-size:12px;opacity:.8">${this.state.summary?.topPerformer?.tasksCompleted || 0} tasks today</div>
          </div>
        </div>
      </div>
    </div>

    <div class="card mb-16">
      <div class="card-header"><div class="card-title">Daily Top Performers</div></div>
      <div class="card-body" style="display:grid;grid-template-columns:240px 1fr;gap:16px">
        <div>
          <div class="form-group">
            <label class="form-label">Selected Date</label>
            <input class="form-input" type="date" value="${selectedDate}" onchange="EC.teacherMonthTasks.setSelectedDate(this.value)">
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${(datedTaskPages.length ? datedTaskPages : [selectedDate]).map(dateValue => `
              <button class="btn ${dateValue === selectedDate ? 'btn-accent' : 'btn-outline'} btn-sm" onclick="EC.teacherMonthTasks.setSelectedDate('${dateValue}')">${monthTaskDisplayDate(dateValue)}</button>
            `).join('')}
          </div>
        </div>
        <div style="max-height:220px;overflow:auto">
          ${topThree.length
            ? topThree.map(entry => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border-soft)">
                <div>
                  <div style="font-weight:700">#${entry.rank} ${entry.name}</div>
                  <div style="font-size:12px;color:var(--text-muted)">${entry.tasksCompleted} task${entry.tasksCompleted === 1 ? '' : 's'} completed</div>
                </div>
                <span class="tag status-done">+${entry.pointsAwarded}</span>
              </div>
            `).join('')
            : `<div style="color:var(--text-muted)">No topper data for this date yet.</div>`
          }
        </div>
      </div>
    </div>

    <div class="two-col-wide">
      <div>
        <div class="card mb-16">
          <div class="card-header"><div class="card-title">Bulk Upload + Manual Task Entry</div></div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Bulk Excel Upload</label>
              <input class="form-input" id="month-task-excel" type="file" accept=".xlsx,.xls">
              <div style="display:flex;gap:10px;margin-top:10px">
                <button class="btn btn-accent" onclick="EC.teacherMonthTasks.uploadExcel()">Upload Excel</button>
                <button class="btn btn-outline" onclick="EC.teacherMonthTasks.downloadTemplate()">Download Template</button>
              </div>
            </div>
            <div style="height:1px;background:var(--border);margin:18px 0"></div>
            <div class="form-grid-3">
              <div class="form-group"><label class="form-label">Task Number</label><input class="form-input" id="mt-task-number" type="number"></div>
              <div class="form-group"><label class="form-label">Difficulty</label><select class="form-select" id="mt-task-difficulty"><option>Easy</option><option selected>Medium</option><option>Hard</option></select></div>
              <div class="form-group"><label class="form-label">Marks / XP Value</label><input class="form-input" id="mt-task-marks" type="number" value="10"></div>
            </div>
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label">Title</label><input class="form-input" id="mt-task-title"></div>
              <div class="form-group"><label class="form-label">Category</label><input class="form-input" id="mt-task-category" value="General"></div>
            </div>
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label">Task Date</label><input class="form-input" id="mt-task-date" type="date" value="${selectedDate}"></div>
              <div class="form-group"><label class="form-label">Task Link</label><input class="form-input" id="mt-task-link" placeholder="https://..."></div>
            </div>
            <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="mt-task-description"></textarea></div>
            <div class="form-group">
              <label class="form-label">Submission Type</label>
              <select class="form-select" id="mt-task-submission-type">
                <option value="file">File Upload</option>
                <option value="link_text">Link + Message</option>
                <option value="mixed">Flexible (File / Link / Message)</option>
                <option value="done">Mark as Done</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Task Frequency</label>
              <select class="form-select" id="mt-task-frequency">
                <option value="once">One Time</option>
                <option value="daily">Daily</option>
              </select>
            </div>
            <button class="btn btn-primary" onclick="EC.teacherMonthTasks.addTask()">Add Task</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">Task Library</div></div>
          <div class="card-body" style="max-height:620px;overflow:auto">
            ${this.state.tasks.length
              ? this.state.tasks.map(task => `
                <div style="padding:14px 0;border-bottom:1px solid var(--border-soft)">
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
                    <div style="font-weight:700">#${task.taskNumber} ${task.title}</div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap">
                      <span class="tag ${String(task.difficulty).toLowerCase()}">${task.difficulty}</span>
                      <span class="tag cat">${task.category}</span>
                      <span class="tag">${monthTaskSubmissionLabel(task.answerMode)}</span>
                      <span class="tag">${monthTaskFrequencyLabel(task.frequency)}</span>
                      <span class="tag status-done">+${task.marks}</span>
                    </div>
                  </div>
                  <div style="font-size:13px;color:var(--text-muted);margin-top:6px">${task.description || 'No description'}</div>
                  <div style="font-size:12px;color:var(--text-muted);margin-top:6px">
                    ${task.taskDate ? `Date page: ${task.taskDate}` : 'Date page: Not assigned'}
                    ${task.taskLink ? ` &bull; <a href="${task.taskLink}" target="_blank" rel="noopener noreferrer">Open task link</a>` : ''}
                  </div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
                    <button class="btn btn-outline btn-sm" onclick="EC.teacherMonthTasks.editTask('${task.id}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="EC.teacherMonthTasks.deleteTask('${task.id}')">Delete</button>
                  </div>
                </div>
              `).join('')
              : `<div style="color:var(--text-muted)">No tasks added yet.</div>`
            }
          </div>
        </div>
      </div>

      <div>
        <div class="card mb-16">
          <div class="card-header"><div class="card-title">Overview Table</div></div>
          <div class="card-body" style="padding:0">
            <div style="max-height:360px;overflow:auto">
              <table style="width:100%;border-collapse:collapse">
                <thead style="position:sticky;top:0;background:var(--surface)">
                  <tr>
                    <th style="padding:12px;text-align:left">Student</th>
                    <th style="padding:12px;text-align:left">Done</th>
                    <th style="padding:12px;text-align:left">Failed</th>
                    <th style="padding:12px;text-align:left">Streak</th>
                    <th style="padding:12px;text-align:left">ELITE</th>
                    <th style="padding:12px;text-align:left">Warnings</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.state.overview.map(row => `
                    <tr style="background:${row.isBehind ? 'rgba(220,38,38,.08)' : 'transparent'};border-top:1px solid var(--border-soft)">
                      <td style="padding:12px;font-weight:600">${row.name}</td>
                      <td style="padding:12px">${row.tasksCompleted}</td>
                      <td style="padding:12px">${row.tasksFailed}</td>
                      <td style="padding:12px">${row.currentStreak}</td>
                      <td style="padding:12px">${row.elitePoints}</td>
                      <td style="padding:12px">${row.warningCount}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">Deadline Extension</div></div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Student</label>
              <select class="form-select" id="mt-extension-student">
                <option value="all">All Students</option>
                ${EC.state.students.map(student => `<option value="${student.id}">${student.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Extension Scope</label>
              <select class="form-select" id="mt-extension-scope">
                <option value="date">Selected date only</option>
                <option value="all">All remaining month-task dates</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Approved Leave / OD Request ID</label>
              <input class="form-input" id="mt-extension-leave-id" placeholder="Optional for all-student or all-month excuses">
            </div>
            <div class="form-group">
              <label class="form-label">Date To Extend</label>
              <input class="form-input" id="mt-extension-date" type="date" value="${selectedDate}">
            </div>
            <div class="form-group">
              <label class="form-label">Justification</label>
              <textarea class="form-textarea" id="mt-extension-justification" placeholder="Holiday, event, approved OD, or other reason"></textarea>
            </div>
            <button class="btn btn-primary" onclick="EC.teacherMonthTasks.extendDeadline()">Save Extension / Excuse</button>
          </div>
        </div>
      </div>
    </div>
  `;
};

EC.teacherMonthTasks.renderCurrent = function(batch, currentOptions) {
  if (!batch) {
    return `
      <div class="card" style="padding:32px;text-align:center">
        <div style="font-size:44px;margin-bottom:12px">🗓️</div>
        <div style="font-family:'Playfair Display',serif;font-size:24px;font-weight:700;margin-bottom:8px">No month batch yet</div>
        <div style="color:var(--text-muted);margin-bottom:20px">Create the first monthly challenge to unlock student and teacher views.</div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-accent" onclick="EC.teacherMonthTasks.openBatchForm()">➕ Create Month Batch</button>
          <button class="btn btn-outline" onclick="EC.teacherMonthTasks.openTaskForm()">➕ Add Task</button>
        </div>
      </div>
    `;
  }

  const selectedDate = this.resolveSelectedDate(this.state.selectedDate);

  return `
    <div class="card mb-16">
      <div class="card-body" style="display:grid;grid-template-columns:2fr 1fr;gap:16px">
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div>
              <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:700;color:var(--royal)">${batch.title}</div>
              <div style="color:var(--text-muted);margin-top:6px">Manage all month tasks from one section.</div>
            </div>
            <div style="min-width:240px">
              <label class="form-label">Switch Batch</label>
              <select class="form-select" onchange="EC.teacherMonthTasks.selectBatch(this.value)">${currentOptions}</select>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-top:18px">
            ${[
              ['Tasks', this.state.tasks.length],
              ['Minimum', batch.minimumTarget],
              ['Elite', batch.eliteTarget],
              ['Negative', batch.negativeMarkValue],
              ['Reviews', this.state.pendingSubmissions.length]
            ].map(([label, value]) => `
              <div class="card" style="padding:14px;text-align:center">
                <div style="font-size:22px;font-weight:800;color:var(--royal)">${value}</div>
                <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em">${label}</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="card" style="padding:16px;background:linear-gradient(135deg,var(--royal-dark),var(--royal));color:#fff">
          <div style="font-size:12px;opacity:.8;text-transform:uppercase;letter-spacing:.08em">Today Summary</div>
          <div style="font-size:28px;font-weight:800;margin-top:8px">${this.state.summary?.completedAtLeastOne || 0}/${this.state.summary?.totalStudents || this.state.overview.length}</div>
          <div style="font-size:13px;opacity:.85;margin-top:6px">students completed at least 1 task today</div>
        </div>
      </div>
    </div>

    <div class="two-col-wide">
      <div>
        <div class="card mb-16">
          <div class="card-header"><div class="card-title">⚙️ Batch Settings</div></div>
          <div class="card-body">
            <div class="form-grid-2">
              <div class="form-group">
                <label class="form-label">Negative Mark Value</label>
                <input class="form-input" id="mt-negative-mark" type="number" value="${batch.negativeMarkValue}">
              </div>
              <div class="form-group">
                <label class="form-label">Top Performer Override</label>
                <select class="form-select" id="mt-top-performer">
                  <option value="">Keep automatic</option>
                  ${EC.state.students.map(student => `<option value="${student.id}">${student.name}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea class="form-textarea" id="mt-description">${batch.description || ''}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Rules</label>
              <textarea class="form-textarea" id="mt-rules">${batch.rules || ''}</textarea>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <button class="btn btn-primary" onclick="EC.teacherMonthTasks.saveBatchSettings()">💾 Save Batch Settings</button>
              <button class="btn btn-outline" onclick="EC.teacherMonthTasks.saveTopPerformerOverride()">👑 Save Top Performer Override</button>
            </div>
          </div>
        </div>

        <div class="card mb-16">
          <div class="card-header"><div class="card-title">📥 Bulk Upload + Manual Task Entry</div></div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Bulk Excel Upload</label>
              <input class="form-input" id="month-task-excel" type="file" accept=".xlsx,.xls">
              <div style="display:flex;gap:10px;margin-top:10px">
                <button class="btn btn-accent" onclick="EC.teacherMonthTasks.uploadExcel()">📤 Upload Excel</button>
                <button class="btn btn-outline" onclick="EC.teacherMonthTasks.downloadTemplate()">📥 Download Template</button>
              </div>
            </div>
            <div style="height:1px;background:var(--border);margin:18px 0"></div>
            <div class="form-grid-3">
              <div class="form-group"><label class="form-label">Task Number</label><input class="form-input" id="mt-task-number" type="number"></div>
              <div class="form-group"><label class="form-label">Difficulty</label><select class="form-select" id="mt-task-difficulty"><option>Easy</option><option selected>Medium</option><option>Hard</option></select></div>
              <div class="form-group"><label class="form-label">Marks / XP Value</label><input class="form-input" id="mt-task-marks" type="number" value="10"></div>
            </div>
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label">Title</label><input class="form-input" id="mt-task-title"></div>
              <div class="form-group"><label class="form-label">Category</label><input class="form-input" id="mt-task-category" value="General"></div>
            </div>
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label">Task Date</label><input class="form-input" id="mt-task-date" type="date" value="${selectedDate}"></div>
              <div class="form-group"><label class="form-label">Task Link</label><input class="form-input" id="mt-task-link" placeholder="https://..."></div>
            </div>
            <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="mt-task-description"></textarea></div>
            <div class="form-group">
              <label class="form-label">Submission Type</label>
              <select class="form-select" id="mt-task-submission-type">
                <option value="file">File Upload</option>
                <option value="link_text">Link + Message</option>
                <option value="mixed">Flexible (File / Link / Message)</option>
                <option value="done">Mark as Done</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Task Frequency</label>
              <select class="form-select" id="mt-task-frequency">
                <option value="once">One Time</option>
                <option value="daily">Daily</option>
              </select>
            </div>
            <button class="btn btn-primary" onclick="EC.teacherMonthTasks.addTask()">➕ Add Task</button>
          </div>
        </div>
      </div>

      <div>
        <div class="card mb-16">
          <div class="card-header"><div class="card-title">📊 Overview Table</div></div>
          <div class="card-body" style="padding:0">
            <div style="max-height:360px;overflow:auto">
              <table style="width:100%;border-collapse:collapse">
                <thead style="position:sticky;top:0;background:var(--surface)">
                  <tr>
                    <th style="padding:12px;text-align:left">Student</th>
                    <th style="padding:12px;text-align:left">Done</th>
                    <th style="padding:12px;text-align:left">Failed</th>
                    <th style="padding:12px;text-align:left">Streak</th>
                    <th style="padding:12px;text-align:left">ELITE</th>
                    <th style="padding:12px;text-align:left">Warnings</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.state.overview.map(row => `
                    <tr style="background:${row.isBehind ? 'rgba(220,38,38,.08)' : 'transparent'};border-top:1px solid var(--border-soft)">
                      <td style="padding:12px;font-weight:600">${row.name}</td>
                      <td style="padding:12px">${row.tasksCompleted}</td>
                      <td style="padding:12px">${row.tasksFailed}</td>
                      <td style="padding:12px">${row.currentStreak}</td>
                      <td style="padding:12px">${row.elitePoints}</td>
                      <td style="padding:12px">${row.warningCount}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
};

EC.teacherMonthTasks.renderCurrent = function(batch, currentOptions) {
  if (!batch) {
    return `
      <div class="card" style="padding:32px;text-align:center">
        <div style="font-size:44px;margin-bottom:12px">🗓️</div>
        <div style="font-family:'Playfair Display',serif;font-size:24px;font-weight:700;margin-bottom:8px">No month batch yet</div>
        <div style="color:var(--text-muted);margin-bottom:20px">Create the first monthly challenge to unlock student and teacher views.</div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-accent" onclick="EC.teacherMonthTasks.openBatchForm()">➕ Create Month Batch</button>
          <button class="btn btn-outline" onclick="EC.teacherMonthTasks.openTaskForm()">➕ Add Task</button>
        </div>
      </div>
    `;
  }

  const selectedDate = this.resolveSelectedDate(this.state.selectedDate);

  return `
    <div class="card mb-16">
      <div class="card-body" style="display:grid;grid-template-columns:2fr 1fr;gap:16px">
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div>
              <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:700;color:var(--royal)">${batch.title}</div>
              <div style="color:var(--text-muted);margin-top:6px">Manage all month tasks from one section.</div>
            </div>
            <div style="min-width:240px">
              <label class="form-label">Switch Batch</label>
              <select class="form-select" onchange="EC.teacherMonthTasks.selectBatch(this.value)">${currentOptions}</select>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-top:18px">
            ${[
              ['Tasks', this.state.tasks.length],
              ['Minimum', batch.minimumTarget],
              ['Elite', batch.eliteTarget],
              ['Negative', batch.negativeMarkValue],
              ['Reviews', this.state.pendingSubmissions.length]
            ].map(([label, value]) => `
              <div class="card" style="padding:14px;text-align:center">
                <div style="font-size:22px;font-weight:800;color:var(--royal)">${value}</div>
                <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em">${label}</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="card" style="padding:16px;background:linear-gradient(135deg,var(--royal-dark),var(--royal));color:#fff">
          <div style="font-size:12px;opacity:.8;text-transform:uppercase;letter-spacing:.08em">Today Summary</div>
          <div style="font-size:28px;font-weight:800;margin-top:8px">${this.state.summary?.completedAtLeastOne || 0}/${this.state.summary?.totalStudents || this.state.overview.length}</div>
          <div style="font-size:13px;opacity:.85;margin-top:6px">students completed at least 1 task today</div>
        </div>
      </div>
    </div>

    <div class="two-col-wide">
      <div>
        <div class="card mb-16">
          <div class="card-header"><div class="card-title">⚙️ Batch Settings</div></div>
          <div class="card-body">
            <div class="form-grid-2">
              <div class="form-group">
                <label class="form-label">Negative Mark Value</label>
                <input class="form-input" id="mt-negative-mark" type="number" value="${batch.negativeMarkValue}">
              </div>
              <div class="form-group">
                <label class="form-label">Top Performer Override</label>
                <select class="form-select" id="mt-top-performer">
                  <option value="">Keep automatic</option>
                  ${EC.state.students.map(student => `<option value="${student.id}">${student.name}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea class="form-textarea" id="mt-description">${batch.description || ''}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Rules</label>
              <textarea class="form-textarea" id="mt-rules">${batch.rules || ''}</textarea>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <button class="btn btn-primary" onclick="EC.teacherMonthTasks.saveBatchSettings()">💾 Save Batch Settings</button>
              <button class="btn btn-outline" onclick="EC.teacherMonthTasks.saveTopPerformerOverride()">👑 Save Top Performer Override</button>
            </div>
          </div>
        </div>

        <div class="card mb-16">
          <div class="card-header"><div class="card-title">📥 Bulk Upload + Manual Task Entry</div></div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Bulk Excel Upload</label>
              <input class="form-input" id="month-task-excel" type="file" accept=".xlsx,.xls">
              <div style="display:flex;gap:10px;margin-top:10px">
                <button class="btn btn-accent" onclick="EC.teacherMonthTasks.uploadExcel()">📤 Upload Excel</button>
                <button class="btn btn-outline" onclick="EC.teacherMonthTasks.downloadTemplate()">📥 Download Template</button>
              </div>
            </div>
            <div style="height:1px;background:var(--border);margin:18px 0"></div>
            <div class="form-grid-3">
              <div class="form-group"><label class="form-label">Task Number</label><input class="form-input" id="mt-task-number" type="number"></div>
              <div class="form-group"><label class="form-label">Difficulty</label><select class="form-select" id="mt-task-difficulty"><option>Easy</option><option selected>Medium</option><option>Hard</option></select></div>
              <div class="form-group"><label class="form-label">Marks / XP Value</label><input class="form-input" id="mt-task-marks" type="number" value="10"></div>
            </div>
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label">Title</label><input class="form-input" id="mt-task-title"></div>
              <div class="form-group"><label class="form-label">Category</label><input class="form-input" id="mt-task-category" value="General"></div>
            </div>
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label">Task Date</label><input class="form-input" id="mt-task-date" type="date" value="${selectedDate}"></div>
              <div class="form-group"><label class="form-label">Task Link</label><input class="form-input" id="mt-task-link" placeholder="https://..."></div>
            </div>
            <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="mt-task-description"></textarea></div>
            <div class="form-group">
              <label class="form-label">Submission Type</label>
              <select class="form-select" id="mt-task-submission-type">
                <option value="file">File Upload</option>
                <option value="link_text">Link + Message</option>
                <option value="mixed">Flexible (File / Link / Message)</option>
                <option value="done">Mark as Done</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Task Frequency</label>
              <select class="form-select" id="mt-task-frequency">
                <option value="once">One Time</option>
                <option value="daily">Daily</option>
              </select>
            </div>
            <button class="btn btn-primary" onclick="EC.teacherMonthTasks.addTask()">➕ Add Task</button>
          </div>
        </div>
      </div>

      <div>
        <div class="card mb-16">
          <div class="card-header"><div class="card-title">📊 Overview Table</div></div>
          <div class="card-body" style="padding:0">
            <div style="max-height:360px;overflow:auto">
              <table style="width:100%;border-collapse:collapse">
                <thead style="position:sticky;top:0;background:var(--surface)">
                  <tr>
                    <th style="padding:12px;text-align:left">Student</th>
                    <th style="padding:12px;text-align:left">Done</th>
                    <th style="padding:12px;text-align:left">Failed</th>
                    <th style="padding:12px;text-align:left">Streak</th>
                    <th style="padding:12px;text-align:left">ELITE</th>
                    <th style="padding:12px;text-align:left">Warnings</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.state.overview.map(row => `
                    <tr style="background:${row.isBehind ? 'rgba(220,38,38,.08)' : 'transparent'};border-top:1px solid var(--border-soft)">
                      <td style="padding:12px;font-weight:600">${row.name}</td>
                      <td style="padding:12px">${row.tasksCompleted}</td>
                      <td style="padding:12px">${row.tasksFailed}</td>
                      <td style="padding:12px">${row.currentStreak}</td>
                      <td style="padding:12px">${row.elitePoints}</td>
                      <td style="padding:12px">${row.warningCount}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
};

EC.teacherMonthTasks.renderCurrent = function(batch, currentOptions) {
  if (!batch) {
    return `
      <div class="card" style="padding:32px;text-align:center">
        <div style="font-size:44px;margin-bottom:12px">&#128467;&#65039;</div>
        <div style="font-family:'Playfair Display',serif;font-size:24px;font-weight:700;margin-bottom:8px">No month batch yet</div>
        <div style="color:var(--text-muted);margin-bottom:20px">Create the first monthly challenge to unlock student and teacher views.</div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-accent" onclick="EC.teacherMonthTasks.openBatchForm()">Create Month Batch</button>
          <button class="btn btn-outline" onclick="EC.teacherMonthTasks.openTaskForm()">+ Add Task</button>
        </div>
      </div>
    `;
  }

  const selectedDate = this.resolveSelectedDate(this.state.selectedDate);

  return `
    <div class="card mb-16">
      <div class="card-body" style="display:grid;grid-template-columns:2fr 1fr;gap:16px">
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div>
              <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:700;color:var(--royal)">${batch.title}</div>
              <div style="color:var(--text-muted);margin-top:6px">Manage all month tasks from one section.</div>
            </div>
            <div style="min-width:240px">
              <label class="form-label">Switch Batch</label>
              <select class="form-select" onchange="EC.teacherMonthTasks.selectBatch(this.value)">${currentOptions}</select>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-top:18px">
            ${[
              ['Tasks', this.state.tasks.length],
              ['Minimum', batch.minimumTarget],
              ['Elite', batch.eliteTarget],
              ['Negative Mark', batch.negativeMarkValue],
              ['Pending Reviews', this.state.pendingSubmissions.length]
            ].map(([label, value]) => `
              <div class="card" style="padding:14px;text-align:center">
                <div style="font-size:22px;font-weight:800;color:var(--royal)">${value}</div>
                <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em">${label}</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="card" style="padding:16px;background:linear-gradient(135deg,var(--royal-dark),var(--royal));color:#fff">
          <div style="font-size:12px;opacity:.8;text-transform:uppercase;letter-spacing:.08em">Today Summary</div>
          <div style="font-size:28px;font-weight:800;margin-top:8px">${this.state.summary?.completedAtLeastOne || 0}/${this.state.summary?.totalStudents || this.state.overview.length}</div>
          <div style="font-size:13px;opacity:.85;margin-top:6px">students completed at least 1 task today</div>
          <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.18)">
            <div style="font-size:12px;opacity:.8">Top performer</div>
            <div style="font-weight:700;font-size:16px;margin-top:4px">${this.state.summary?.topPerformer?.name || 'No activity yet'}</div>
            <div style="font-size:12px;opacity:.8">${this.state.summary?.topPerformer?.tasksCompleted || 0} tasks today</div>
          </div>
        </div>
      </div>
    </div>

    <div class="two-col-wide">
      <div>
        <div class="card mb-16">
          <div class="card-header"><div class="card-title"><i class="fa-solid fa-sliders"></i> Batch Settings</div></div>
          <div class="card-body">
            <div class="form-grid-2">
              <div class="form-group">
                <label class="form-label">Negative Mark Value</label>
                <input class="form-input" id="mt-negative-mark" type="number" value="${batch.negativeMarkValue}">
              </div>
              <div class="form-group">
                <label class="form-label">Top Performer Override</label>
                <select class="form-select" id="mt-top-performer">
                  <option value="">Keep automatic</option>
                  ${EC.state.students.map(student => `<option value="${student.id}">${student.name}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea class="form-textarea" id="mt-description">${batch.description || ''}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Rules</label>
              <textarea class="form-textarea" id="mt-rules">${batch.rules || ''}</textarea>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <button class="btn btn-primary" onclick="EC.teacherMonthTasks.saveBatchSettings()"><i class="fa-solid fa-floppy-disk"></i> Save Batch Settings</button>
              <button class="btn btn-outline" onclick="EC.teacherMonthTasks.saveTopPerformerOverride()"><i class="fa-solid fa-crown"></i> Save Top Performer Override</button>
            </div>
          </div>
        </div>

        <div class="card mb-16">
          <div class="card-header"><div class="card-title"><i class="fa-solid fa-file-import"></i> Bulk Upload + Manual Task Entry</div></div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Bulk Excel Upload</label>
              <input class="form-input" id="month-task-excel" type="file" accept=".xlsx,.xls">
              <div style="display:flex;gap:10px;margin-top:10px">
                <button class="btn btn-accent" onclick="EC.teacherMonthTasks.uploadExcel()"><i class="fa-solid fa-upload"></i> Upload Excel</button>
                <button class="btn btn-outline" onclick="EC.teacherMonthTasks.downloadTemplate()"><i class="fa-solid fa-file-arrow-down"></i> Download Template</button>
              </div>
            </div>
            <div style="height:1px;background:var(--border);margin:18px 0"></div>
            <div class="form-grid-3">
              <div class="form-group"><label class="form-label">Task Number</label><input class="form-input" id="mt-task-number" type="number"></div>
              <div class="form-group"><label class="form-label">Difficulty</label><select class="form-select" id="mt-task-difficulty"><option>Easy</option><option selected>Medium</option><option>Hard</option></select></div>
              <div class="form-group"><label class="form-label">Marks / XP Value</label><input class="form-input" id="mt-task-marks" type="number" value="10"></div>
            </div>
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label">Title</label><input class="form-input" id="mt-task-title"></div>
              <div class="form-group"><label class="form-label">Category</label><input class="form-input" id="mt-task-category" value="General"></div>
            </div>
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label">Task Date</label><input class="form-input" id="mt-task-date" type="date" value="${selectedDate}"></div>
              <div class="form-group"><label class="form-label">Task Link</label><input class="form-input" id="mt-task-link" placeholder="https://..."></div>
            </div>
            <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="mt-task-description"></textarea></div>
            <div class="form-group">
              <label class="form-label">Submission Type</label>
              <select class="form-select" id="mt-task-submission-type">
                <option value="file">File Upload</option>
                <option value="link_text">Link + Message</option>
                <option value="mixed">Flexible (File / Link / Message)</option>
                <option value="done">Mark as Done</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Task Frequency</label>
              <select class="form-select" id="mt-task-frequency">
                <option value="once">One Time</option>
                <option value="daily">Daily</option>
              </select>
            </div>
            <button class="btn btn-primary" onclick="EC.teacherMonthTasks.addTask()"><i class="fa-solid fa-plus"></i> Add Task</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title"><i class="fa-solid fa-list"></i> Task Library</div></div>
          <div class="card-body" style="max-height:620px;overflow:auto">
            ${this.state.tasks.length
              ? this.state.tasks.map(task => `
                <div style="padding:14px 0;border-bottom:1px solid var(--border-soft)">
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
                    <div style="font-weight:700">#${task.taskNumber} ${task.title}</div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap">
                      <span class="tag ${String(task.difficulty).toLowerCase()}">${task.difficulty}</span>
                      <span class="tag cat">${task.category}</span>
                      <span class="tag">${monthTaskSubmissionLabel(task.answerMode)}</span>
                      <span class="tag">${monthTaskFrequencyLabel(task.frequency)}</span>
                      <span class="tag status-done">+${task.marks}</span>
                    </div>
                  </div>
                  <div style="font-size:13px;color:var(--text-muted);margin-top:6px">${task.description || 'No description'}</div>
                  <div style="font-size:12px;color:var(--text-muted);margin-top:6px">
                    ${task.taskDate ? `Date: ${task.taskDate}` : 'Date: Not assigned'}
                    ${task.taskLink ? ` &bull; <a href="${task.taskLink}" target="_blank" rel="noopener noreferrer">Open task link</a>` : ''}
                  </div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
                    <button class="btn btn-outline btn-sm" onclick="EC.teacherMonthTasks.editTask('${task.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="EC.teacherMonthTasks.deleteTask('${task.id}')"><i class="fa-solid fa-trash"></i> Delete</button>
                  </div>
                </div>
              `).join('')
              : `<div style="color:var(--text-muted)">No tasks added yet.</div>`
            }
          </div>
        </div>
      </div>

      <div>
        <div class="card mb-16">
          <div class="card-header"><div class="card-title"><i class="fa-solid fa-table"></i> Overview Table</div></div>
          <div class="card-body" style="padding:0">
            <div style="max-height:360px;overflow:auto">
              <table style="width:100%;border-collapse:collapse">
                <thead style="position:sticky;top:0;background:var(--surface)">
                  <tr>
                    <th style="padding:12px;text-align:left">Student</th>
                    <th style="padding:12px;text-align:left">Done</th>
                    <th style="padding:12px;text-align:left">Failed</th>
                    <th style="padding:12px;text-align:left">Streak</th>
                    <th style="padding:12px;text-align:left">ELITE</th>
                    <th style="padding:12px;text-align:left">Warnings</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.state.overview.map(row => `
                    <tr style="background:${row.isBehind ? 'rgba(220,38,38,.08)' : 'transparent'};border-top:1px solid var(--border-soft)">
                      <td style="padding:12px;font-weight:600">${row.name}</td>
                      <td style="padding:12px">${row.tasksCompleted}</td>
                      <td style="padding:12px">${row.tasksFailed}</td>
                      <td style="padding:12px">${row.currentStreak}</td>
                      <td style="padding:12px">${row.elitePoints}</td>
                      <td style="padding:12px">${row.warningCount}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card mb-16">
          <div class="card-header"><div class="card-title"><i class="fa-solid fa-clock-rotate-left"></i> Pending Reviews</div></div>
          <div class="card-body">
            ${this.state.pendingSubmissions.length
              ? this.state.pendingSubmissions.map(submission => `
                <div style="padding:14px 0;border-bottom:1px solid var(--border-soft)">
                  <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
                    <div>
                      <div style="font-weight:700">${submission.studentName || 'Student'} - ${submission.taskTitle || 'Task'}</div>
                      <div style="font-size:12px;color:var(--text-muted);margin-top:4px">
                        ${submission.status === 'self_declared' ? 'Mark as Done' : 'File Upload'} - ${submission.submittedAt ? formatDateTime(submission.submittedAt) : submission.date}
                      </div>
                      ${submission.proofUrl ? `<div style="font-size:12px;margin-top:6px"><a href="${submission.proofUrl}" target="_blank" rel="noopener noreferrer">Proof URL</a></div>` : ''}
                      ${submission.proofFileUrl ? `<div style="font-size:12px;margin-top:6px"><a href="${submission.proofFileUrl}" target="_blank" rel="noopener noreferrer">${submission.proofFileName || 'Open file'}</a></div>` : ''}
                    </div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
                      <button class="btn btn-success btn-sm" onclick="EC.teacherMonthTasks.openReview('${submission.id}','approve')"><i class="fa-solid fa-check"></i> Approve</button>
                      <button class="btn btn-danger btn-sm" onclick="EC.teacherMonthTasks.openReview('${submission.id}','reject')"><i class="fa-solid fa-xmark"></i> Reject</button>
                    </div>
                  </div>
                </div>
              `).join('')
              : `<div style="color:var(--text-muted)">No pending submissions right now.</div>`
            }
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title"><i class="fa-solid fa-calendar-plus"></i> Deadline Extension</div></div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Student</label>
              <select class="form-select" id="mt-extension-student">
                <option value="all">All Students</option>
                ${EC.state.students.map(student => `<option value="${student.id}">${student.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Extension Scope</label>
              <select class="form-select" id="mt-extension-scope">
                <option value="date">Selected date only</option>
                <option value="all">All remaining month-task dates</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Approved Leave / OD Request ID</label>
              <input class="form-input" id="mt-extension-leave-id" placeholder="Optional for all-student or all-month excuses">
            </div>
            <div class="form-group">
              <label class="form-label">Date To Extend</label>
              <input class="form-input" id="mt-extension-date" type="date" value="${selectedDate}">
            </div>
            <div class="form-group">
              <label class="form-label">Justification</label>
              <textarea class="form-textarea" id="mt-extension-justification" placeholder="Holiday, event, approved OD, or other reason"></textarea>
            </div>
            <button class="btn btn-primary" onclick="EC.teacherMonthTasks.extendDeadline()"><i class="fa-solid fa-calendar-check"></i> Save Extension / Excuse</button>
          </div>
        </div>
      </div>
    </div>
  `;
};

EC.teacherMonthTasks.renderCurrent = function(batch, currentOptions) {
  if (!batch) {
    return `
      <div class="card" style="padding:32px;text-align:center">
        <div style="font-size:44px;margin-bottom:12px">&#128467;&#65039;</div>
        <div style="font-family:'Playfair Display',serif;font-size:24px;font-weight:700;margin-bottom:8px">No month batch yet</div>
        <div style="color:var(--text-muted);margin-bottom:20px">Create the first monthly challenge to unlock student and teacher views.</div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-accent" onclick="EC.teacherMonthTasks.openBatchForm()">Create Month Batch</button>
          <button class="btn btn-outline" onclick="EC.teacherMonthTasks.openTaskForm()">+ Add Task</button>
        </div>
      </div>
    `;
  }

  const selectedDate = this.resolveSelectedDate(this.state.selectedDate);

  return `
    <div class="card mb-16">
      <div class="card-body" style="display:grid;grid-template-columns:2fr 1fr;gap:16px">
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div>
              <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:700;color:var(--royal)">${batch.title}</div>
              <div style="color:var(--text-muted);margin-top:6px">Manage all month tasks from one section without separate daily task pages.</div>
            </div>
            <div style="min-width:240px">
              <label class="form-label">Switch Batch</label>
              <select class="form-select" onchange="EC.teacherMonthTasks.selectBatch(this.value)">${currentOptions}</select>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-top:18px">
            ${[
              ['Total Tasks', this.state.tasks.length],
              ['Minimum Target', batch.minimumTarget],
              ['Elite Target', batch.eliteTarget],
              ['Negative Mark', batch.negativeMarkValue],
              ['Pending Reviews', this.state.pendingSubmissions.length]
            ].map(([label, value]) => `
              <div class="card" style="padding:14px;text-align:center">
                <div style="font-size:22px;font-weight:800;color:var(--royal)">${value}</div>
                <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em">${label}</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="card" style="padding:16px;background:linear-gradient(135deg,var(--royal-dark),var(--royal));color:#fff">
          <div style="font-size:12px;opacity:.8;text-transform:uppercase;letter-spacing:.08em">Today Summary</div>
          <div style="font-size:28px;font-weight:800;margin-top:8px">${this.state.summary?.completedAtLeastOne || 0}/${this.state.summary?.totalStudents || this.state.overview.length}</div>
          <div style="font-size:13px;opacity:.85;margin-top:6px">students completed at least 1 task today</div>
          <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.18)">
            <div style="font-size:12px;opacity:.8">Today's top performer</div>
            <div style="font-weight:700;font-size:16px;margin-top:4px">${this.state.summary?.topPerformer?.name || 'No activity yet'}</div>
            <div style="font-size:12px;opacity:.8">${this.state.summary?.topPerformer?.tasksCompleted || 0} tasks today</div>
          </div>
        </div>
      </div>
    </div>

    <div class="two-col-wide">
      <div>
        <div class="card mb-16">
          <div class="card-header"><div class="card-title">Batch Settings</div></div>
          <div class="card-body">
            <div class="form-grid-2">
              <div class="form-group">
                <label class="form-label">Negative Mark Value</label>
                <input class="form-input" id="mt-negative-mark" type="number" value="${batch.negativeMarkValue}">
              </div>
              <div class="form-group">
                <label class="form-label">Top Performer Override</label>
                <select class="form-select" id="mt-top-performer">
                  <option value="">Keep automatic</option>
                  ${EC.state.students.map(student => `<option value="${student.id}">${student.name}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea class="form-textarea" id="mt-description">${batch.description || ''}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Rules</label>
              <textarea class="form-textarea" id="mt-rules">${batch.rules || ''}</textarea>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <button class="btn btn-primary" onclick="EC.teacherMonthTasks.saveBatchSettings()">Save Batch Settings</button>
              <button class="btn btn-outline" onclick="EC.teacherMonthTasks.saveTopPerformerOverride()">Save Top Performer Override</button>
            </div>
          </div>
        </div>

        <div class="card mb-16">
          <div class="card-header"><div class="card-title">Bulk Upload + Manual Task Entry</div></div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Bulk Excel Upload</label>
              <input class="form-input" id="month-task-excel" type="file" accept=".xlsx,.xls">
              <div style="display:flex;gap:10px;margin-top:10px">
                <button class="btn btn-accent" onclick="EC.teacherMonthTasks.uploadExcel()">Upload Excel</button>
                <button class="btn btn-outline" onclick="EC.teacherMonthTasks.downloadTemplate()">Download Template</button>
              </div>
            </div>
            <div style="height:1px;background:var(--border);margin:18px 0"></div>
            <div class="form-grid-3">
              <div class="form-group"><label class="form-label">Task Number</label><input class="form-input" id="mt-task-number" type="number"></div>
              <div class="form-group"><label class="form-label">Difficulty</label><select class="form-select" id="mt-task-difficulty"><option>Easy</option><option selected>Medium</option><option>Hard</option></select></div>
              <div class="form-group"><label class="form-label">Marks / XP Value</label><input class="form-input" id="mt-task-marks" type="number" value="10"></div>
            </div>
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label">Title</label><input class="form-input" id="mt-task-title"></div>
              <div class="form-group"><label class="form-label">Category</label><input class="form-input" id="mt-task-category" value="General"></div>
            </div>
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label">Task Date</label><input class="form-input" id="mt-task-date" type="date" value="${selectedDate}"></div>
              <div class="form-group"><label class="form-label">Task Link</label><input class="form-input" id="mt-task-link" placeholder="https://..."></div>
            </div>
            <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="mt-task-description"></textarea></div>
            <div class="form-group">
              <label class="form-label">Submission Type</label>
              <select class="form-select" id="mt-task-submission-type">
                <option value="file">File Upload</option>
                <option value="link_text">Link + Message</option>
                <option value="mixed">Flexible (File / Link / Message)</option>
                <option value="done">Mark as Done</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Task Frequency</label>
              <select class="form-select" id="mt-task-frequency">
                <option value="once">One Time</option>
                <option value="daily">Daily</option>
              </select>
            </div>
            <button class="btn btn-primary" onclick="EC.teacherMonthTasks.addTask()">Add Task</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">Task Library</div></div>
          <div class="card-body" style="max-height:620px;overflow:auto">
            ${this.state.tasks.length
              ? this.state.tasks.map(task => `
                <div style="padding:14px 0;border-bottom:1px solid var(--border-soft)">
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
                    <div style="font-weight:700">#${task.taskNumber} ${task.title}</div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap">
                      <span class="tag ${String(task.difficulty).toLowerCase()}">${task.difficulty}</span>
                      <span class="tag cat">${task.category}</span>
                      <span class="tag">${monthTaskSubmissionLabel(task.answerMode)}</span>
                      <span class="tag">${monthTaskFrequencyLabel(task.frequency)}</span>
                      <span class="tag status-done">+${task.marks}</span>
                    </div>
                  </div>
                  <div style="font-size:13px;color:var(--text-muted);margin-top:6px">${task.description || 'No description'}</div>
                  <div style="font-size:12px;color:var(--text-muted);margin-top:6px">
                    ${task.taskDate ? `Date: ${task.taskDate}` : 'Date: Not assigned'}
                    ${task.taskLink ? ` &bull; <a href="${task.taskLink}" target="_blank" rel="noopener noreferrer">Open task link</a>` : ''}
                  </div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
                    <button class="btn btn-outline btn-sm" onclick="EC.teacherMonthTasks.editTask('${task.id}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="EC.teacherMonthTasks.deleteTask('${task.id}')">Delete</button>
                  </div>
                </div>
              `).join('')
              : `<div style="color:var(--text-muted)">No tasks added yet.</div>`
            }
          </div>
        </div>
      </div>

      <div>
        <div class="card mb-16">
          <div class="card-header"><div class="card-title">Overview Table</div></div>
          <div class="card-body" style="padding:0">
            <div style="max-height:360px;overflow:auto">
              <table style="width:100%;border-collapse:collapse">
                <thead style="position:sticky;top:0;background:var(--surface)">
                  <tr>
                    <th style="padding:12px;text-align:left">Student</th>
                    <th style="padding:12px;text-align:left">Done</th>
                    <th style="padding:12px;text-align:left">Failed</th>
                    <th style="padding:12px;text-align:left">Streak</th>
                    <th style="padding:12px;text-align:left">ELITE</th>
                    <th style="padding:12px;text-align:left">Warnings</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.state.overview.map(row => `
                    <tr style="background:${row.isBehind ? 'rgba(220,38,38,.08)' : 'transparent'};border-top:1px solid var(--border-soft)">
                      <td style="padding:12px;font-weight:600">${row.name}</td>
                      <td style="padding:12px">${row.tasksCompleted}</td>
                      <td style="padding:12px">${row.tasksFailed}</td>
                      <td style="padding:12px">${row.currentStreak}</td>
                      <td style="padding:12px">${row.elitePoints}</td>
                      <td style="padding:12px">${row.warningCount}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card mb-16">
          <div class="card-header"><div class="card-title">Pending Reviews</div></div>
          <div class="card-body">
            ${this.state.pendingSubmissions.length
              ? this.state.pendingSubmissions.map(submission => `
                <div style="padding:14px 0;border-bottom:1px solid var(--border-soft)">
                  <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
                    <div>
                      <div style="font-weight:700">${submission.studentName || 'Student'} - ${submission.taskTitle || 'Task'}</div>
                      <div style="font-size:12px;color:var(--text-muted);margin-top:4px">
                        ${submission.status === 'self_declared' ? 'Mark as Done' : 'File Upload'} - ${submission.submittedAt ? formatDateTime(submission.submittedAt) : submission.date}
                      </div>
                      ${submission.proofUrl ? `<div style="font-size:12px;margin-top:6px"><a href="${submission.proofUrl}" target="_blank" rel="noopener noreferrer">Proof URL</a></div>` : ''}
                      ${submission.proofFileUrl ? `<div style="font-size:12px;margin-top:6px"><a href="${submission.proofFileUrl}" target="_blank" rel="noopener noreferrer">${submission.proofFileName || 'Open file'}</a></div>` : ''}
                    </div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
                      <button class="btn btn-success btn-sm" onclick="EC.teacherMonthTasks.openReview('${submission.id}','approve')">Approve</button>
                      <button class="btn btn-danger btn-sm" onclick="EC.teacherMonthTasks.openReview('${submission.id}','reject')">Reject</button>
                    </div>
                  </div>
                </div>
              `).join('')
              : `<div style="color:var(--text-muted)">No pending submissions right now.</div>`
            }
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">Deadline Extension</div></div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Student</label>
              <select class="form-select" id="mt-extension-student">
                <option value="all">All Students</option>
                ${EC.state.students.map(student => `<option value="${student.id}">${student.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Extension Scope</label>
              <select class="form-select" id="mt-extension-scope">
                <option value="date">Selected date only</option>
                <option value="all">All remaining month-task dates</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Approved Leave / OD Request ID</label>
              <input class="form-input" id="mt-extension-leave-id" placeholder="Optional for all-student or all-month excuses">
            </div>
            <div class="form-group">
              <label class="form-label">Date To Extend</label>
              <input class="form-input" id="mt-extension-date" type="date" value="${selectedDate}">
            </div>
            <div class="form-group">
              <label class="form-label">Justification</label>
              <textarea class="form-textarea" id="mt-extension-justification" placeholder="Holiday, event, approved OD, or other reason"></textarea>
            </div>
            <button class="btn btn-primary" onclick="EC.teacherMonthTasks.extendDeadline()">Save Extension / Excuse</button>
          </div>
        </div>
      </div>
    </div>
  `;
};

EC.teacherMonthTasks.openReview = function(submissionId, mode) {
  const submission = this.state.pendingSubmissions.find(entry => entry.id === submissionId);
  if (!submission) return;

  document.getElementById('month-task-review-id').value = submissionId;
  document.getElementById('month-task-review-mode').value = mode;
  document.getElementById('month-task-review-title').textContent = `${submission.taskTitle || 'Task'} - ${submission.studentName || 'Student'}`;
  document.getElementById('month-task-review-type').textContent = submission.status === 'self_declared'
    ? 'Mark as Done'
    : submission.proofFileUrl ? 'File Upload'
    : submission.proofUrl ? 'Link Submission'
    : submission.responseText ? 'Message Submission'
    : 'Submission';
  document.getElementById('month-task-review-student').textContent = submission.studentName || 'Student';
  document.getElementById('month-task-review-score').value = mode === 'approve'
    ? (this.state.tasks.find(task => task.id === submission.taskId)?.marks || 0)
    : (this.state.currentBatch?.negativeMarkValue || -5);
  document.getElementById('month-task-review-notes').value = '';

  const fileWrap = document.getElementById('month-task-review-file-wrap');
  const urlWrap = document.getElementById('month-task-review-url-wrap');
  const messageWrap = document.getElementById('month-task-review-message-wrap');
  const emptyState = document.getElementById('month-task-review-empty');

  if (submission.proofFileUrl) {
    fileWrap.style.display = '';
    const fileLink = document.getElementById('month-task-review-file');
    fileLink.href = submission.proofFileUrl;
    fileLink.textContent = submission.proofFileName || 'Open file';
  } else {
    fileWrap.style.display = 'none';
  }

  if (submission.proofUrl) {
    urlWrap.style.display = '';
    const urlLink = document.getElementById('month-task-review-url');
    urlLink.href = submission.proofUrl;
    urlLink.textContent = submission.proofUrl;
  } else {
    urlWrap.style.display = 'none';
  }

  if (submission.responseText) {
    messageWrap.style.display = '';
    document.getElementById('month-task-review-message').textContent = submission.responseText;
  } else {
    messageWrap.style.display = 'none';
  }

  emptyState.style.display = submission.proofFileUrl || submission.proofUrl || submission.responseText ? 'none' : '';
  document.getElementById('month-task-review-modal')?.classList.add('open');
};

function monthTaskSelectedDate(value) {
  const raw = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return new Date().toISOString().split('T')[0];
}

function monthTaskDisplayDate(value) {
  const normalized = monthTaskSelectedDate(value);
  const date = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(date.getTime())) return normalized;
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

EC.teacherMonthTasks.state.selectedDate = EC.teacherMonthTasks.state.selectedDate || new Date().toISOString().split('T')[0];
EC.teacherMonthTasks.state.selectedDateSummary = EC.teacherMonthTasks.state.selectedDateSummary || null;

EC.teacherMonthTasks.getTaskDates = function() {
  return Array.from(new Set(
    (this.state.tasks || [])
      .map(task => String(task.taskDate || '').trim())
      .filter(Boolean)
  )).sort();
};

EC.teacherMonthTasks.getTasksForSelectedDate = function() {
  const selectedDate = monthTaskSelectedDate(this.state.selectedDate);
  return (this.state.tasks || []).filter(task => String(task.taskDate || '').trim() === selectedDate);
};

EC.teacherMonthTasks.resolveSelectedDate = function(preferredDate) {
  const normalizedPreferred = String(preferredDate || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedPreferred)) return normalizedPreferred;
  const availableDates = this.getTaskDates();
  return availableDates[0] || new Date().toISOString().split('T')[0];
};

EC.teacherMonthTasks.fetchSelectedDateSummary = async function() {
  if (!this.state.currentBatch?.id) {
    this.state.selectedDateSummary = null;
    return null;
  }
  const selectedDate = this.resolveSelectedDate(this.state.selectedDate);
  this.state.selectedDate = selectedDate;
  try {
    this.state.selectedDateSummary = await EC.api.getMonthTaskDailySummary(this.state.currentBatch.id, selectedDate);
  } catch (error) {
    this.state.selectedDateSummary = null;
  }
  return this.state.selectedDateSummary;
};

EC.teacherMonthTasks.load = async function(batchId) {
  const root = document.getElementById('teacher-month-tasks-root');
  if (root) root.innerHTML = `<div class="card" style="padding:24px;text-align:center;color:var(--text-muted)">Loading month tasks...</div>`;
  try {
    const list = await EC.api.listMonthTaskBatches();
    this.state.batches = list.batches || [];
    this.state.activeBatchId = batchId || this.state.activeBatchId || list.activeBatchId || this.state.batches[0]?.id || null;

    if (!this.state.activeBatchId) {
      this.state.currentBatch = null;
      this.state.tasks = [];
      this.state.overview = [];
      this.state.pendingSubmissions = [];
      this.state.selectedDateSummary = null;
      this.renderBody();
      return;
    }

    const [batch, tasks, overview, pendingSubmissions] = await Promise.all([
      EC.api.getMonthTaskBatch(this.state.activeBatchId),
      EC.api.getMonthTasks(this.state.activeBatchId),
      EC.api.getMonthTaskOverview(this.state.activeBatchId),
      EC.api.getMonthTaskPendingSubmissions(this.state.activeBatchId)
    ]);

    this.state.currentBatch = batch;
    this.state.tasks = tasks;
    this.state.overview = overview;
    this.state.pendingSubmissions = pendingSubmissions;
    this.state.summary = batch.todaySummary || null;
    this.state.selectedDate = this.resolveSelectedDate(this.state.selectedDate);
    await this.fetchSelectedDateSummary();
    this.renderBody();
  } catch (err) {
    if (root) {
      root.innerHTML = `<div class="card" style="padding:24px;color:var(--danger)">Could not load month tasks. ${err.message || ''}</div>`;
    }
  }
};

EC.teacherMonthTasks.setSelectedDate = async function(dateValue) {
  this.state.selectedDate = this.resolveSelectedDate(dateValue);
  await this.fetchSelectedDateSummary();
  this.renderBody();
};

EC.teacherMonthTasks.upsertTasks = function(nextTasks) {
  const taskMap = new Map((this.state.tasks || []).map(task => [String(task.id), task]));
  for (const task of nextTasks || []) {
    if (!task?.id) continue;
    taskMap.set(String(task.id), task);
  }
  this.state.tasks = Array.from(taskMap.values()).sort((left, right) => {
    return Number(left.taskNumber || 0) - Number(right.taskNumber || 0);
  });
  if (this.state.currentBatch) {
    this.state.currentBatch.totalTasks = this.state.tasks.length;
  }
};

EC.teacherMonthTasks.renderCurrent = function(batch, currentOptions) {
  if (!batch) {
    return `
      <div class="card" style="padding:32px;text-align:center">
        <div style="font-size:44px;margin-bottom:12px">&#128467;&#65039;</div>
        <div style="font-family:'Playfair Display',serif;font-size:24px;font-weight:700;margin-bottom:8px">No month batch yet</div>
        <div style="color:var(--text-muted);margin-bottom:20px">Create the first monthly challenge to unlock student and teacher views.</div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-accent" onclick="EC.teacherMonthTasks.openBatchForm()">Create Month Batch</button>
          <button class="btn btn-outline" onclick="EC.teacherMonthTasks.openTaskForm()">+ Add Task</button>
        </div>
      </div>
    `;
  }

  const selectedDate = this.resolveSelectedDate(this.state.selectedDate);
  const selectedSummary = this.state.selectedDateSummary || null;
  const topThree = selectedSummary?.topThree || [];
  const tasksForSelectedDate = this.getTasksForSelectedDate();
  const datedTaskPages = this.getTaskDates();

  return `
    <div class="card mb-16">
      <div class="card-body" style="display:grid;grid-template-columns:2fr 1fr;gap:16px">
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div>
              <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:700;color:var(--royal)">${batch.title}</div>
              <div style="color:var(--text-muted);margin-top:6px">Manage date-wise task pages, separate task links, and daily topper tracking from one month-task section.</div>
            </div>
            <div style="min-width:240px">
              <label class="form-label">Switch Batch</label>
              <select class="form-select" onchange="EC.teacherMonthTasks.selectBatch(this.value)">${currentOptions}</select>
            </div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
            <button class="btn btn-outline" onclick="EC.teacherReview.previousPage='month-tasks';EC.navigate('review')">Review Page</button>
            <button class="btn btn-outline" onclick="EC.excelWorkbook.state.previousPage='month-tasks';EC.navigate('excel-workbook')">Workbook</button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-top:18px">
            ${[
              ['Total Tasks', this.state.tasks.length],
              ['Date Pages', datedTaskPages.length],
              ['Minimum Target', batch.minimumTarget],
              ['Elite Target', batch.eliteTarget],
              ['Pending Reviews', this.state.pendingSubmissions.length]
            ].map(([label, value]) => `
              <div class="card" style="padding:14px;text-align:center">
                <div style="font-size:22px;font-weight:800;color:var(--royal)">${value}</div>
                <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em">${label}</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="card" style="padding:16px;background:linear-gradient(135deg,var(--royal-dark),var(--royal));color:#fff">
          <div style="font-size:12px;opacity:.8;text-transform:uppercase;letter-spacing:.08em">Today Summary</div>
          <div style="font-size:28px;font-weight:800;margin-top:8px">${this.state.summary?.completedAtLeastOne || 0}/${this.state.summary?.totalStudents || this.state.overview.length}</div>
          <div style="font-size:13px;opacity:.85;margin-top:6px">students completed at least 1 task today</div>
          <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.18)">
            <div style="font-size:12px;opacity:.8">Today's top performer</div>
            <div style="font-weight:700;font-size:16px;margin-top:4px">${this.state.summary?.topPerformer?.name || 'No activity yet'}</div>
            <div style="font-size:12px;opacity:.8">${this.state.summary?.topPerformer?.tasksCompleted || 0} tasks today</div>
          </div>
        </div>
      </div>
    </div>

      <div class="card mb-16">
        <div class="card-header"><div class="card-title">Daily Top Performers</div></div>
        <div class="card-body" style="max-height:320px;overflow:auto">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Separate topper list for ${monthTaskDisplayDate(selectedDate)}</div>
          ${topThree.length
            ? topThree.map(entry => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border-soft)">
                <div>
                  <div style="font-weight:700">#${entry.rank} ${entry.name}</div>
                  <div style="font-size:12px;color:var(--text-muted)">${entry.tasksCompleted} task${entry.tasksCompleted === 1 ? '' : 's'} completed</div>
                </div>
                <span class="tag status-done">+${entry.pointsAwarded}</span>
              </div>
            `).join('')
            : `<div style="color:var(--text-muted)">No topper data for this date yet.</div>`
          }
          <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border-soft)">
            <div style="font-size:12px;color:var(--text-muted)">Selected date summary</div>
            <div style="font-weight:700;margin-top:6px">${selectedSummary?.completedAtLeastOne || 0}/${selectedSummary?.totalStudents || this.state.overview.length} students active</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:6px">${selectedSummary?.topPerformer?.name ? `${selectedSummary.topPerformer.name} leads this date page.` : 'No top performer recorded yet.'}</div>
          </div>
          <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border-soft)">
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">Tasks on this date</div>
            ${tasksForSelectedDate.length
              ? `<div style="display:grid;gap:10px">
                  ${tasksForSelectedDate.map(task => `
                    <div style="padding:12px;border:1px solid var(--border-soft);border-radius:12px;background:var(--surface)">
                      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap">
                        <div>
                          <div style="font-weight:700">#${task.taskNumber} ${task.title}</div>
                          <div style="font-size:12px;color:var(--text-muted);margin-top:6px">${task.description || 'No description'}</div>
                        </div>
                        <div style="display:flex;gap:8px;flex-wrap:wrap">
                          <span class="tag ${String(task.difficulty).toLowerCase()}">${task.difficulty}</span>
                          <span class="tag">${monthTaskSubmissionLabel(task.answerMode)}</span>
                          <span class="tag status-done">+${task.marks}</span>
                        </div>
                      </div>
                      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
                        ${task.taskLink ? `<a class="btn btn-outline btn-sm" href="${task.taskLink}" target="_blank" rel="noopener noreferrer">Open Task Link</a>` : `<span style="font-size:12px;color:var(--text-muted)">No link added yet</span>`}
                        <button class="btn btn-outline btn-sm" onclick="EC.teacherMonthTasks.editTask('${task.id}')">Edit</button>
                      </div>
                    </div>
                  `).join('')}
                </div>`
              : `<div style="color:var(--text-muted)">No dated tasks on ${monthTaskDisplayDate(selectedDate)} yet. Add them manually or import them through Excel.</div>`
            }
          </div>
        </div>
    </div>

    <div class="two-col-wide">
      <div>
        <div class="card mb-16">
          <div class="card-header"><div class="card-title">Bulk Upload + Manual Task Entry</div></div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Bulk Excel Upload</label>
              <input class="form-input" id="month-task-excel" type="file" accept=".xlsx,.xls">
              <div style="display:flex;gap:10px;margin-top:10px">
                <button class="btn btn-accent" onclick="EC.teacherMonthTasks.uploadExcel()">Upload Excel</button>
                <button class="btn btn-outline" onclick="EC.teacherMonthTasks.downloadTemplate()">Download Template</button>
              </div>
            </div>
            <div style="height:1px;background:var(--border);margin:18px 0"></div>
            <div class="form-grid-3">
              <div class="form-group"><label class="form-label">Task Number</label><input class="form-input" id="mt-task-number" type="number"></div>
              <div class="form-group"><label class="form-label">Difficulty</label><select class="form-select" id="mt-task-difficulty"><option>Easy</option><option selected>Medium</option><option>Hard</option></select></div>
              <div class="form-group"><label class="form-label">Marks / XP Value</label><input class="form-input" id="mt-task-marks" type="number" value="10"></div>
            </div>
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label">Title</label><input class="form-input" id="mt-task-title"></div>
              <div class="form-group"><label class="form-label">Category</label><input class="form-input" id="mt-task-category" value="General"></div>
            </div>
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label">Task Date (Daily Page)</label><input class="form-input" id="mt-task-date" type="date" value="${selectedDate}"></div>
              <div class="form-group"><label class="form-label">Task Link (Separate Page Link)</label><input class="form-input" id="mt-task-link" placeholder="https://..."></div>
            </div>
            <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="mt-task-description"></textarea></div>
            <div class="form-group">
              <label class="form-label">Submission Type</label>
              <select class="form-select" id="mt-task-submission-type">
                <option value="file">File Upload</option>
                <option value="link_text">Link + Message</option>
                <option value="mixed">Flexible (File / Link / Message)</option>
                <option value="done">Mark as Done</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Task Frequency</label>
              <select class="form-select" id="mt-task-frequency">
                <option value="once">One Time</option>
                <option value="daily">Daily</option>
              </select>
            </div>
            <button class="btn btn-primary" onclick="EC.teacherMonthTasks.addTask()">Add Task</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">Task Library</div></div>
          <div class="card-body" style="max-height:620px;overflow:auto">
            ${this.state.tasks.length
              ? this.state.tasks.map(task => `
                <div style="padding:14px 0;border-bottom:1px solid var(--border-soft)">
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
                    <div style="font-weight:700">#${task.taskNumber} ${task.title}</div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap">
                      <span class="tag ${String(task.difficulty).toLowerCase()}">${task.difficulty}</span>
                      <span class="tag cat">${task.category}</span>
                      <span class="tag">${monthTaskSubmissionLabel(task.answerMode)}</span>
                      <span class="tag">${monthTaskFrequencyLabel(task.frequency)}</span>
                      <span class="tag status-done">+${task.marks}</span>
                    </div>
                  </div>
                  <div style="font-size:13px;color:var(--text-muted);margin-top:6px">${task.description || 'No description'}</div>
                  <div style="font-size:12px;color:var(--text-muted);margin-top:6px">
                    ${task.taskDate ? `Date page: ${task.taskDate}` : 'Date page: Not assigned'}
                    ${task.taskLink ? ` &bull; <a href="${task.taskLink}" target="_blank" rel="noopener noreferrer">Open task link</a>` : ''}
                  </div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
                    <button class="btn btn-outline btn-sm" onclick="EC.teacherMonthTasks.editTask('${task.id}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="EC.teacherMonthTasks.deleteTask('${task.id}')">Delete</button>
                  </div>
                </div>
              `).join('')
              : `<div style="color:var(--text-muted)">No tasks added yet.</div>`
            }
          </div>
        </div>
      </div>

      <div>

        <div class="card mb-16">
          <div class="card-header"><div class="card-title">Overview Table</div></div>
          <div class="card-body" style="padding:0">
            <div style="max-height:360px;overflow:auto">
              <table style="width:100%;border-collapse:collapse">
                <thead style="position:sticky;top:0;background:var(--surface)">
                  <tr>
                    <th style="padding:12px;text-align:left">Student</th>
                    <th style="padding:12px;text-align:left">Done</th>
                    <th style="padding:12px;text-align:left">Failed</th>
                    <th style="padding:12px;text-align:left">Streak</th>
                    <th style="padding:12px;text-align:left">ELITE</th>
                    <th style="padding:12px;text-align:left">Warnings</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.state.overview.map(row => `
                    <tr style="background:${row.isBehind ? 'rgba(220,38,38,.08)' : 'transparent'};border-top:1px solid var(--border-soft)">
                      <td style="padding:12px;font-weight:600">${row.name}</td>
                      <td style="padding:12px">${row.tasksCompleted}</td>
                      <td style="padding:12px">${row.tasksFailed}</td>
                      <td style="padding:12px">${row.currentStreak}</td>
                      <td style="padding:12px">${row.elitePoints}</td>
                      <td style="padding:12px">${row.warningCount}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">Deadline Extension</div></div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Student</label>
              <select class="form-select" id="mt-extension-student">
                <option value="all">All Students</option>
                ${EC.state.students.map(student => `<option value="${student.id}">${student.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Extension Scope</label>
              <select class="form-select" id="mt-extension-scope">
                <option value="date">Selected date only</option>
                <option value="all">All remaining month-task dates</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Approved Leave / OD Request ID</label>
              <input class="form-input" id="mt-extension-leave-id" placeholder="Optional for all-student or all-month excuses">
            </div>
            <div class="form-group">
              <label class="form-label">Date To Extend</label>
              <input class="form-input" id="mt-extension-date" type="date" value="${selectedDate}">
            </div>
            <div class="form-group">
              <label class="form-label">Justification</label>
              <textarea class="form-textarea" id="mt-extension-justification" placeholder="Holiday, event, approved OD, or other reason"></textarea>
            </div>
            <button class="btn btn-primary" onclick="EC.teacherMonthTasks.extendDeadline()">Save Extension / Excuse</button>
          </div>
        </div>
      </div>
    </div>
  `;
};
