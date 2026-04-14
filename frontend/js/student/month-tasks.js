window.EC = window.EC || {};

EC.studentMonthTasks = {
  state: {
    batch: null,
    tasks: [],
    stats: null,
    leaderboard: [],
    warnings: [],
    currentTab: 'tasks'
  },

  render(el) {
    el.innerHTML = `
      <div id="student-month-task-root">
        <div class="card" style="padding:24px;text-align:center;color:var(--text-muted)">Loading month tasks...</div>
      </div>
      ${this.detailModal()}
    `;
    this.load();
  },

  async load() {
    const root = document.getElementById('student-month-task-root');
    try {
      const activeBatch = await EC.api.getActiveMonthTaskBatch();
      const [batch, tasks, stats, leaderboard, warnings] = await Promise.all([
        EC.api.getMonthTaskBatch(activeBatch.id),
        EC.api.getMonthTasks(activeBatch.id),
        EC.api.getMonthTaskStats(EC.state.myId, activeBatch.id),
        EC.api.getMonthTaskLeaderboard(activeBatch.id),
        EC.api.getMyMonthTaskWarnings(activeBatch.id)
      ]);
      this.state.batch = batch;
      this.state.tasks = tasks;
      this.state.stats = stats;
      this.state.leaderboard = leaderboard;
      this.state.warnings = warnings;
      await this.syncLegendBadge();
      this.renderBody();
    } catch (err) {
      if (root) {
        root.innerHTML = `<div class="card" style="padding:24px;color:var(--danger)">Month Tasks are not available yet. ${err.message || ''}</div>`;
      }
    }
  },

  renderBody() {
    const root = document.getElementById('student-month-task-root');
    if (!root || !this.state.batch || !this.state.stats) return;
    const batch = this.state.batch;
    const stats = this.state.stats;
    const completed = stats.totalCompleted;
    const total = this.state.tasks.length;
    const firstStagePct = batch.minimumTarget ? Math.min(100, Math.round((Math.min(completed, batch.minimumTarget) / batch.minimumTarget) * 100)) : 0;
    const secondStagePct = batch.eliteTarget > batch.minimumTarget
      ? Math.min(100, Math.round((Math.max(completed - batch.minimumTarget, 0) / (batch.eliteTarget - batch.minimumTarget)) * 100))
      : 0;

    root.innerHTML = `
      <div class="page-header">
        <div><h2 class="page-title">${batch.title}</h2><p class="page-subtitle">Push to the minimum target, chase the elite target, and keep your streak alive every day.</p></div>
      </div>
      ${this.renderWarnings()}
      <div class="card mb-16" style="background:linear-gradient(135deg,var(--royal-dark),var(--royal));color:#fff">
        <div class="card-body">
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px">
            ${[
              [`${completed}/${total}`, 'Tasks completed this month'],
              [stats.daysActive, 'Days active this month'],
              [stats.streakDays, 'Current streak'],
              [stats.elitePoints, 'ELITE Points earned']
            ].map(([value, label]) => `
              <div style="background:rgba(255,255,255,.08);padding:16px;border-radius:14px">
                <div style="font-size:28px;font-weight:800">${value}</div>
                <div style="font-size:12px;opacity:.85">${label}</div>
              </div>
            `).join('')}
          </div>
          <div style="margin-top:18px">
            <div style="display:flex;justify-content:space-between;gap:10px;font-size:12px;opacity:.9;margin-bottom:8px">
              <span>Minimum target progress</span>
              <span>${batch.minimumTarget} -> ${batch.eliteTarget}</span>
            </div>
            <div style="background:rgba(255,255,255,.15);border-radius:999px;height:16px;overflow:hidden">
              <div style="height:100%;width:${firstStagePct}%;background:#4da3ff;display:inline-block"></div><div style="height:100%;width:${secondStagePct}%;background:#f4c542;display:inline-block"></div>
            </div>
            ${stats.minimumReached ? `<div style="margin-top:10px;font-weight:700;color:#ffe184">Minimum Goal Reached</div>` : ''}
          </div>
        </div>
      </div>

      <div class="tabs" style="margin-bottom:16px">
        <button class="tab-btn ${this.state.currentTab === 'tasks' ? 'active' : ''}" onclick="EC.studentMonthTasks.switchTab('tasks')">Tasks</button>
        <button class="tab-btn ${this.state.currentTab === 'leaderboard' ? 'active' : ''}" onclick="EC.studentMonthTasks.switchTab('leaderboard')">Monthly Leaderboard</button>
      </div>

      ${this.state.currentTab === 'leaderboard' ? this.renderLeaderboard() : this.renderTaskView()}
    `;
  },

  renderWarnings() {
    const pending = this.state.warnings.filter(entry => !entry.explanationText);
    if (!pending.length) return '';
    return pending.map(entry => `
      <div class="card mb-16" style="border:2px solid var(--warning);background:var(--warning-bg)">
        <div class="card-body">
          <div style="font-weight:800;color:var(--warning)">Warning explanation required</div>
          <div style="font-size:14px;color:var(--text-mid);margin-top:6px">
            ${entry.warningType === '3_day_skip'
              ? 'You completed 0 tasks for 3 consecutive days.'
              : 'Your daily score total stayed the same for 5 consecutive days.'}
          </div>
          <textarea class="form-textarea" id="month-warning-${entry.id}" placeholder="Explain what happened before you continue" style="margin-top:12px"></textarea>
          <button class="btn btn-accent" style="margin-top:12px" onclick="EC.studentMonthTasks.submitWarning('${entry.id}')">Submit Explanation</button>
        </div>
      </div>
    `).join('');
  },

  renderTaskView() {
    const topThree = this.state.batch.dailyTopPerformers || [];
    return `
      <div class="two-col-wide">
        <div>
          <div class="card mb-16">
            <div class="card-header"><div class="card-title">Monthly Activity Heatmap</div></div>
            <div class="card-body">${this.renderHeatmap()}</div>
          </div>
          <div class="card">
            <div class="card-header"><div class="card-title">Task Grid</div></div>
            <div class="card-body" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;max-height:840px;overflow:auto">
              ${this.state.tasks.map(task => this.renderTaskCard(task)).join('')}
            </div>
          </div>
        </div>
        <div>
          <div class="card mb-16">
            <div class="card-header"><div class="card-title">Daily Top Performers</div></div>
            <div class="card-body" style="max-height:280px;overflow:auto">
              ${topThree.length
                ? topThree.map(entry => `
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border-soft)">
                    <div><strong>#${entry.rank} ${entry.name}</strong><div style="font-size:12px;color:var(--text-muted)">${entry.tasksCompletedToday} tasks today</div></div>
                    <span class="tag status-done">+${entry.pointsAwarded}</span>
                  </div>
                `).join('')
                : `<div style="color:var(--text-muted)">No topper data yet today.</div>`
              }
            </div>
          </div>
          <div class="card">
            <div class="card-header"><div class="card-title">Milestones</div></div>
            <div class="card-body">
              <div style="padding:12px 0">
                <div style="font-weight:700">${batchLabel(this.state.batch.monthName, 'Legend')}</div>
                <div style="font-size:12px;color:var(--text-muted)">Complete all ${this.state.batch.totalTasks} tasks for this month without any penalty to unlock this badge automatically after the month ends.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderLeaderboard() {
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">This Month Rankings</div></div>
        <div class="card-body" style="max-height:540px;overflow:auto">
          ${(this.state.leaderboard || []).map(entry => `
            <div class="lb-row">
              <div class="lb-rank ${entry.rank < 4 ? 'top' + entry.rank : ''}">${entry.rank === 1 ? '1' : entry.rank === 2 ? '2' : entry.rank === 3 ? '3' : '#' + entry.rank}</div>
              <div class="avatar avatar-sm" style="background:${entry.color}">${entry.initials}</div>
              <div class="lb-info">
                <div class="lb-name">${entry.name}</div>
                <div class="lb-sub">${entry.totalCompleted} approved tasks • ${entry.streakDays} day streak</div>
              </div>
              <div class="lb-xp">${entry.elitePoints} EP</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  renderHeatmap() {
    const map = this.state.stats?.heatmap || {};
    const days = Object.keys(map).sort();
    if (!days.length) return `<div style="color:var(--text-muted)">No active days yet. Finish one task today to light up the month.</div>`;
    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(72px,1fr));gap:10px">
        ${days.map(day => `
          <div style="background:${map[day] ? 'rgba(34,197,94,.15)' : 'rgba(148,163,184,.12)'};border:1px solid ${map[day] ? 'rgba(34,197,94,.35)' : 'var(--border)'};padding:12px;border-radius:12px;text-align:center">
            <div style="font-size:12px;color:var(--text-muted)">${day.slice(8)}</div>
            <div style="font-weight:800;color:${map[day] ? 'var(--success)' : 'var(--text-muted)'}">${map[day] || 0}</div>
          </div>
        `).join('')}
      </div>
    `;
  },

  renderTaskCard(task) {
    const status = task.submission?.status || 'not_started';
    const statusLabel = ['submitted', 'approved', 'failed', 'self_declared'].includes(status) ? 'Submitted' : 'Not Started';
    const statusTone = statusLabel === 'Submitted'
      ? 'background:rgba(34,197,94,.14);color:var(--success);border:1px solid rgba(34,197,94,.25)'
      : 'background:rgba(148,163,184,.14);color:var(--text-muted);border:1px solid var(--border)';

    return `
      <div class="card" style="cursor:pointer;border:${statusLabel === 'Submitted' ? '1px solid rgba(34,197,94,.25)' : '1px solid var(--border)'}" onclick="EC.studentMonthTasks.openTask('${task.id}')">
        <div class="card-body">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
            <div style="font-weight:800;color:var(--royal)">#${task.taskNumber}</div>
            <span class="tag" style="${statusTone}">${statusLabel}</span>
          </div>
          <div style="font-weight:700;font-size:16px;margin-top:8px">${task.title}</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:8px;line-height:1.6">${task.description || 'No description'}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
            <span class="tag ${String(task.difficulty).toLowerCase()}">${task.difficulty}</span>
            <span class="tag cat">${task.category}</span>
            <span class="tag">${task.answerMode === 'done' ? 'Mark as Done' : task.answerMode === 'mixed' ? 'Flexible Answer' : task.answerMode === 'link_text' ? 'Link / Message' : 'File Upload'}</span>
            <span class="tag status-done">+${task.marks}</span>
          </div>
          <div style="margin-top:12px;font-size:12px;color:var(--text-muted)">Status: ${statusLabel}</div>
        </div>
      </div>
    `;
  },

  detailModal() {
    return `
      <div class="overlay" id="student-month-task-modal">
        <div class="modal modal-lg">
          <div class="modal-header">
            <div><div class="modal-title" id="student-month-task-title">Task</div><div class="card-subtitle" id="student-month-task-meta"></div></div>
            <button class="modal-close" onclick="EC.studentMonthTasks.closeTask()">X</button>
          </div>
          <div class="modal-body" id="student-month-task-body"></div>
        </div>
      </div>
    `;
  },

  async openTask(taskId) {
    const task = this.state.tasks.find(entry => entry.id === taskId);
    if (!task) return;
    if (!task.submission) {
      try {
        task.submission = await EC.api.startMonthTask(task.id);
      } catch (err) {
        EC.toast(err.message || 'Could not mark task as started', 'warning');
      }
    }
    document.getElementById('student-month-task-title').textContent = `#${task.taskNumber} ${task.title}`;
    document.getElementById('student-month-task-meta').textContent = `${task.category} • ${task.difficulty} • +${task.marks}`;
    document.getElementById('student-month-task-body').innerHTML = `
      <div style="font-size:14px;color:var(--text-mid);line-height:1.7;margin-bottom:16px">${task.description || 'No description'}</div>
      <div class="form-group"><label class="form-label">Link / Current URL</label><input class="form-input" id="student-month-task-proof-url" value="${task.submission?.proofUrl || ''}" placeholder="LinkedIn post, portfolio, GitHub repo, etc."></div>
      <div class="form-group"><label class="form-label">Message / Explanation</label><textarea class="form-textarea" id="student-month-task-response-text" placeholder="Write your answer or message here">${task.submission?.responseText || ''}</textarea></div>
      <div class="form-group"><label class="form-label">Upload file</label><input class="form-input" id="student-month-task-file" type="file" accept=".pdf,image/*,.doc,.docx,.zip"></div>
      <div class="form-group">
        <div style="font-size:12px;color:var(--text-muted)">Teacher approval is still required after you submit or mark as done.</div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button class="btn btn-outline" onclick="EC.studentMonthTasks.closeTask()">Close</button>
        <button class="btn btn-accent" onclick="EC.studentMonthTasks.submitTask('${task.id}')">${task.needsSubmission ? 'Submit Task' : 'Mark as Done'}</button>
      </div>
    `;
    document.getElementById('student-month-task-modal')?.classList.add('open');
  },

  closeTask() {
    document.getElementById('student-month-task-modal')?.classList.remove('open');
  },

  async submitTask(taskId) {
    const task = this.state.tasks.find(entry => entry.id === taskId);
    if (!task) return;
    try {
      task.submission = await EC.api.submitMonthTask({
        taskId,
        proofUrl: document.getElementById('student-month-task-proof-url')?.value || '',
        responseText: document.getElementById('student-month-task-response-text')?.value || '',
        file: document.getElementById('student-month-task-file')?.files?.[0]
      });
      this.closeTask();
      EC.toast(task.needsSubmission ? 'Task submitted for teacher review.' : 'Marked as done. Waiting for teacher approval.', 'success');
      await this.load();
    } catch (err) {
      EC.toast(err.message || 'Could not submit task', 'danger');
    }
  },

  async submitWarning(id) {
    const explanationText = document.getElementById(`month-warning-${id}`)?.value?.trim();
    if (!explanationText) {
      EC.toast('Please write an explanation first.', 'warning');
      return;
    }
    try {
      await EC.api.explainMonthTaskWarning(id, explanationText);
      EC.toast('Explanation submitted.', 'success');
      await this.load();
    } catch (err) {
      EC.toast(err.message || 'Could not submit explanation', 'danger');
    }
  },

  switchTab(tab) {
    this.state.currentTab = tab;
    this.renderBody();
  },

  async syncLegendBadge() {
    const legendBadge = this.state.stats?.legendBadge;
    if (!legendBadge || !EC.state.myId) return;

    const badgeExists = EC.state.badges.some(entry => String(entry.id) === String(legendBadge.id));
    if (!badgeExists) EC.state.badges.push({ ...legendBadge, unlocked: true });

    if (!EC.state.myBadgeShowcase.some(entry => String(entry) === String(legendBadge.id))) {
      EC.state.myBadgeShowcase = [legendBadge.id, ...EC.state.myBadgeShowcase].slice(0, 3);
    }

    const me = EC.getStudent(EC.state.myId);
    if (me) {
      me.unlockedBadges = Array.from(new Set([...(me.unlockedBadges || []), legendBadge.id]));
      me.badgeShowcase = EC.state.myBadgeShowcase;
    }

    if (legendBadge.newlyUnlocked) {
      const seenKey = `ec_seen_badge_${EC.state.myId}_${legendBadge.id}`;
      if (!sessionStorage.getItem(seenKey)) {
        sessionStorage.setItem(seenKey, '1');
        EC.showBooyah(`Booyah! You obtained ${legendBadge.name}`);
        setTimeout(() => EC.showBadgeUnlock(legendBadge), 250);
      }
    }
  }
};

function batchLabel(monthName, suffix) {
  return `${monthName} ${suffix}`;
}

EC.studentMonthTasks.renderTaskCard = function(task) {
  const status = task.submission?.status || 'not_started';
  const statusLabel = {
    not_started: 'Pending',
    in_progress: 'Pending',
    submitted: 'Submitted',
    self_declared: 'Submitted',
    approved: 'Done',
    failed: 'Redo'
  }[status] || 'Pending';
  const statusTone = {
    Pending: 'background:rgba(148,163,184,.14);color:var(--text-muted);border:1px solid var(--border)',
    Submitted: 'background:rgba(34,197,94,.14);color:var(--success);border:1px solid rgba(34,197,94,.25)',
    Done: 'background:rgba(59,130,246,.14);color:var(--royal);border:1px solid rgba(59,130,246,.25)',
    Redo: 'background:var(--danger-bg);color:var(--danger);border:1px solid rgba(220,38,38,.25)'
  }[statusLabel];

  return `
    <div class="card" style="cursor:pointer;border:${statusLabel === 'Submitted' ? '1px solid rgba(34,197,94,.25)' : statusLabel === 'Redo' ? '1px solid rgba(220,38,38,.25)' : statusLabel === 'Done' ? '1px solid rgba(59,130,246,.25)' : '1px solid var(--border)'}" onclick="EC.studentMonthTasks.openTask('${task.id}')">
      <div class="card-body">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
          <div style="font-weight:800;color:var(--royal)">#${task.taskNumber}</div>
          <span class="tag" style="${statusTone}">${statusLabel}</span>
        </div>
        <div style="font-weight:700;font-size:16px;margin-top:8px">${task.title}</div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:8px;line-height:1.6">${task.description || 'No description'}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
          <span class="tag ${String(task.difficulty).toLowerCase()}">${task.difficulty}</span>
          <span class="tag cat">${task.category}</span>
          <span class="tag">${task.answerMode === 'done' ? 'Mark as Done' : task.answerMode === 'mixed' ? 'Flexible Answer' : task.answerMode === 'link_text' ? 'Link / Message' : 'File Upload'}</span>
          <span class="tag status-done">+${task.marks}</span>
        </div>
        <div style="margin-top:12px;font-size:12px;color:var(--text-muted)">Status: ${statusLabel}</div>
      </div>
    </div>
  `;
};

EC.studentMonthTasks.openTask = async function(taskId) {
  const task = this.state.tasks.find(entry => entry.id === taskId);
  if (!task) return;

  const status = task.submission?.status || 'not_started';
  if (!task.submission) {
    try {
      task.submission = await EC.api.startMonthTask(task.id);
    } catch (err) {
      EC.toast(err.message || 'Could not mark task as started', 'warning');
    }
  }

  const isRedo = status === 'failed';
  const isDone = status === 'approved';

  document.getElementById('student-month-task-title').textContent = `#${task.taskNumber} ${task.title}`;
  document.getElementById('student-month-task-meta').textContent = `${task.category} • ${task.difficulty} • +${task.marks}`;
  document.getElementById('student-month-task-body').innerHTML = `
    <div style="font-size:14px;color:var(--text-mid);line-height:1.7;margin-bottom:16px">${task.description || 'No description'}</div>
    ${isRedo ? `<div class="card" style="padding:14px;margin-bottom:16px;border:1px solid var(--danger);background:var(--danger-bg)"><div style="font-weight:700;color:var(--danger)">Redo Required</div><div style="font-size:12px;color:var(--text-mid);margin-top:6px">${task.submission?.reviewNotes || task.submission?.rejectedReason || 'Teacher rejected this answer. Please update and resubmit it.'}</div></div>` : ''}
    ${isDone ? `<div class="card" style="padding:14px;margin-bottom:16px;border:1px solid rgba(59,130,246,.25);background:rgba(59,130,246,.08)"><div style="font-weight:700;color:var(--royal)">Task Approved</div><div style="font-size:12px;color:var(--text-mid);margin-top:6px">${task.submission?.reviewNotes || 'This month task was approved by your teacher.'}</div></div>` : ''}
    <div class="form-group"><label class="form-label">Link / Current URL</label><input class="form-input" id="student-month-task-proof-url" value="${task.submission?.proofUrl || ''}" placeholder="LinkedIn post, portfolio, GitHub repo, etc."></div>
    <div class="form-group"><label class="form-label">Message / Explanation</label><textarea class="form-textarea" id="student-month-task-response-text" placeholder="Write your answer or message here">${task.submission?.responseText || ''}</textarea></div>
    <div class="form-group"><label class="form-label">Upload file</label><input class="form-input" id="student-month-task-file" type="file" accept=".pdf,image/*,.doc,.docx,.zip"></div>
    <div class="form-group">
      <div style="font-size:12px;color:var(--text-muted)">Teacher approval is still required after you submit or mark as done.</div>
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn btn-outline" onclick="EC.studentMonthTasks.closeTask()">Close</button>
      ${isDone ? '' : `<button class="btn btn-accent" onclick="EC.studentMonthTasks.submitTask('${task.id}')">${isRedo ? 'Resubmit Task' : (task.needsSubmission ? 'Submit Task' : 'Mark as Done')}</button>`}
    </div>
  `;
  document.getElementById('student-month-task-modal')?.classList.add('open');
};
