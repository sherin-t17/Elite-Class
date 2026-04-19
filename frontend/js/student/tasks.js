window.EC = window.EC || {};

EC.studentTasks = {
  scratchpadContent: {},
  selectedFiles: {},

  render(el) {
    const tasks = EC.state.tasks || [];
    el.innerHTML = `
      <div class="page-header">
        <div><h2 class="page-title">My Tasks</h2><p class="page-subtitle">Open, submit, redo, and track all of your class tasks.</p></div>
      </div>
      <div class="filter-bar">
        <button class="filter-btn active" onclick="EC.studentTasks.filter(this,'all')">All</button>
        <button class="filter-btn" onclick="EC.studentTasks.filter(this,'pending')">Pending</button>
        <button class="filter-btn" onclick="EC.studentTasks.filter(this,'submitted')">Submitted</button>
        <button class="filter-btn" onclick="EC.studentTasks.filter(this,'completed')">Done</button>
        <button class="filter-btn" onclick="EC.studentTasks.filter(this,'redo')">Redo</button>
        <button class="filter-btn" onclick="EC.studentTasks.filter(this,'choice')">Choice</button>
      </div>
      <div id="student-task-list" class="task-list animate-in">
        ${tasks.map(task => this.renderCard(task)).join('')}
      </div>
      ${this.detailModal()}
    `;
  },

  renderCard(task) {
    const isOpenable = ['pending', 'redo', 'submitted', 'completed'].includes(task.status);
    return `
      <div class="task-item priority-${task.priority ? 'high' : 'low'} ${task.status === 'completed' ? 'completed' : ''}" id="task-card-${task.id}" onclick="EC.studentTasks.open('${String(task.id)}')">
        <div class="task-left">
          <div class="task-title-row">
            <span class="task-name">${task.title}</span>
            <span class="tag ${task.diff}">${task.diff}</span>
            <span class="tag cat">${task.cat}</span>
            <span class="tag status-${task.status}">${this.statusLabel(task.status)}</span>
            ${task.isChoice ? '<span class="tag" style="background:#f0fdf4;color:#16a34a">Choice</span>' : ''}
          </div>
          <div class="task-desc">${task.desc || 'No description'}</div>
          <div class="task-meta">
            <span>Due: ${task.due}</span>
            <span>${task.completions || 0}/${task.total || 0} submitted</span>
            <span>${this.answerModeLabel(task.answerMode)}</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
          <div class="task-xp">+${task.xp} XP</div>
          <button class="btn btn-ghost btn-sm" style="padding:4px 8px;font-size:15px;color:var(--text-muted)" title="Bookmark this task" onclick="event.stopPropagation();EC.app.addBookmark({id:'${String(task.id)}',type:'task',title:'${task.title.replace(/'/g, "\\'")}',icon:'&#x1F4CB;',ref:'tasks'})">&#x1F516;</button>
          ${isOpenable ? `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();EC.studentTasks.open('${String(task.id)}')">Open</button>` : ''}
        </div>
      </div>
    `;
  },

  updateTaskCard(taskId) {
    const task = EC.state.tasks.find(t => String(t.id) === String(taskId));
    if (!task) return;
    const card = document.getElementById(`task-card-${taskId}`);
    if (card) {
      const parent = card.parentElement;
      const temp = document.createElement('div');
      temp.innerHTML = this.renderCard(task);
      parent.replaceChild(temp.firstElementChild, card);
    }
  },

  detailModal() {
    return `
      <div class="overlay" id="task-detail-overlay" style="z-index:210">
        <div class="modal modal-lg">
          <div class="modal-header">
            <div>
              <div class="modal-title" id="td-title">Task</div>
              <div class="card-subtitle" id="td-meta"></div>
            </div>
            <button class="modal-close" onclick="EC.studentTasks.close()">X</button>
          </div>
          <div class="modal-body" id="td-body" style="max-height:70vh;overflow-y:auto"></div>
          <div class="modal-footer" id="td-footer"></div>
        </div>
      </div>
    `;
  },

  open(id) {
    const taskId = String(id);
    const task = EC.state.tasks.find(entry => String(entry.id) === taskId);
    if (!task) {
      EC.toast('Task not found.', 'warning');
      return;
    }

    const submission = task.submission || null;
    const isSubmitted = task.status === 'submitted' || task.status === 'completed';
    const isRedo = task.status === 'redo';
    const needsForm = !isSubmitted || isRedo;

    document.getElementById('td-title').textContent = task.title;
    document.getElementById('td-meta').textContent = `${task.cat} • ${this.answerModeLabel(task.answerMode)} • Due: ${task.due} • +${task.xp} XP`;

    let bodyHtml = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">
        <div class="card" style="padding:12px;text-align:center"><div style="font-size:18px;font-weight:700;color:var(--royal)">+${task.xp}</div><div style="font-size:11px;color:var(--text-muted)">XP Reward</div></div>
        <div class="card" style="padding:12px;text-align:center"><div style="font-size:13px;font-weight:700">${task.due}</div><div style="font-size:11px;color:var(--text-muted)">Due Date</div></div>
        <div class="card" style="padding:12px;text-align:center"><div style="font-size:13px;font-weight:700">${this.statusLabel(task.status)}</div><div style="font-size:11px;color:var(--text-muted)">Status</div></div>
      </div>
      <div class="form-group">
        <div class="section-title">Description</div>
        <div style="font-size:14px;color:var(--text-mid);line-height:1.6;background:var(--surface);padding:14px;border-radius:var(--radius-sm)">${task.desc || 'No description'}</div>
      </div>
      ${task.attachmentUrl ? `<div class="form-group"><div class="section-title">Teacher Attachment</div><a href="${task.attachmentUrl}" target="_blank" rel="noopener noreferrer">${task.attachmentName || 'Open file/link'}</a></div>` : ''}
      ${task.isChoice ? this.renderChoiceSection(task) : ''}
    `;

    if (isRedo) {
      bodyHtml += `
        <div class="card" style="padding:16px;margin-bottom:16px;border:1px solid var(--danger);background:var(--danger-bg)">
          <div style="font-weight:700;color:var(--danger)">Redo Requested</div>
          <div style="font-size:13px;color:var(--text-mid);margin-top:6px">${submission?.redoFeedback || 'Teacher asked you to fix this task and submit again.'}</div>
        </div>
      `;
    }

    if (submission && !isRedo) {
      bodyHtml += this.renderSubmittedWork(submission);
    }

    if (needsForm) {
      bodyHtml += this.renderSubmissionForm(task, submission);
    }

    if (task.status === 'completed') {
      bodyHtml += `
        <div class="card" style="padding:18px;text-align:center;background:var(--success-bg);border:1px solid var(--success)">
          <div style="font-weight:700;color:var(--success)">Task Completed</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:6px">${submission?.grade ? `Grade: ${submission.grade}` : 'Reviewed by teacher'}</div>
          ${submission?.feedback ? `<div style="font-size:13px;color:var(--text-mid);margin-top:8px">${submission.feedback}</div>` : ''}
        </div>
      `;
    }

    bodyHtml += `
      <div class="form-group" style="margin-top:16px">
        <div class="section-title">Scratchpad</div>
        <textarea class="scratchpad-textarea" id="scratchpad-area-${taskId}" placeholder="Write your notes here...">${this.scratchpadContent[taskId] || ''}</textarea>
      </div>
    `;

    document.getElementById('td-body').innerHTML = bodyHtml;
    document.getElementById('td-footer').innerHTML = this.renderFooter(task);
    document.getElementById('task-detail-overlay')?.classList.add('open');

    setTimeout(() => {
      if (needsForm && this.canUploadFile(task)) {
        EC.upload?.createZone?.('task-upload-zone', (file) => {
          this.selectedFiles[taskId] = file;
        });
      }
      const scratch = document.getElementById(`scratchpad-area-${taskId}`);
      if (scratch) {
        scratch.addEventListener('input', () => {
          this.scratchpadContent[taskId] = scratch.value;
        });
      }
    }, 0);
  },

  renderSubmittedWork(submission) {
    return `
      <div class="form-group">
        <div class="section-title">Your Submission</div>
        <div class="card" style="padding:16px">
          ${submission.fileName ? `<div style="margin-bottom:8px"><strong>File:</strong> ${submission.fileName} ${submission.fileUrl ? `<a href="${submission.fileUrl}" target="_blank" rel="noopener noreferrer" style="margin-left:8px">Open</a>` : ''}</div>` : ''}
          ${submission.proofUrl ? `<div style="margin-bottom:8px"><strong>URL:</strong> <a href="${submission.proofUrl}" target="_blank" rel="noopener noreferrer">${submission.proofUrl}</a></div>` : ''}
          ${submission.responseText ? `<div style="margin-bottom:8px"><strong>Message:</strong><div style="margin-top:6px;white-space:pre-wrap">${submission.responseText}</div></div>` : ''}
          <div style="font-size:12px;color:var(--text-muted)">Submitted ${formatDateTime(submission.submittedAt || new Date())}</div>
        </div>
      </div>
    `;
  },

  renderSubmissionForm(task, submission) {
    return `
      <div class="form-group">
        <div class="section-title">Submit Your Work</div>
        ${this.canUseUrl(task) ? `<div class="form-group"><label class="form-label">URL</label><input class="form-input" id="task-proof-url" value="${submission?.proofUrl || ''}" placeholder="Paste your link here"></div>` : ''}
        ${this.canUseText(task) ? `<div class="form-group"><label class="form-label">Message</label><textarea class="form-textarea" id="task-response-text" placeholder="Write your answer or explanation">${submission?.responseText || ''}</textarea></div>` : ''}
        ${this.canUploadFile(task) ? `<div class="form-group"><label class="form-label">File Upload</label><div id="task-upload-zone"></div></div>` : ''}
        ${task.answerMode === 'done' ? `<div class="card" style="padding:14px;background:var(--surface);font-size:13px;color:var(--text-mid)">This task only needs a completion confirmation. Click the submit button below when you are done.</div>` : ''}
      </div>
    `;
  },

  renderFooter(task) {
    const taskId = String(task.id);
    if (task.status === 'completed') {
      return `<button class="btn btn-outline" onclick="EC.studentTasks.close()">Close</button>`;
    }
    if (task.status === 'submitted') {
      return `<button class="btn btn-outline" onclick="EC.studentTasks.close()">Close</button>`;
    }
    return `
      <button class="btn btn-outline" onclick="EC.studentTasks.close()">Cancel</button>
      <button class="btn btn-accent" onclick="EC.studentTasks.submit('${taskId}')">${task.answerMode === 'done' ? 'Mark as Done' : task.status === 'redo' ? 'Resubmit Task' : 'Submit Task'}</button>
    `;
  },

  async submit(id) {
    const taskId = String(id);
    const task = EC.state.tasks.find(entry => String(entry.id) === taskId);
    if (!task) return;

    const payload = {
      file: this.selectedFiles[taskId],
      proofUrl: document.getElementById('task-proof-url')?.value?.trim() || '',
      responseText: document.getElementById('task-response-text')?.value?.trim() || ''
    };

    if (!this.validateSubmission(task, payload)) return;

    try {
      const submission = await EC.api.submitTask(taskId, payload);
      task.submission = submission;
      task.status = 'submitted';
      task.completions = (task.completions || 0) + 1;
      delete this.selectedFiles[taskId];
      EC.toast(task.answerMode === 'done' ? 'Task marked as done and sent for review.' : 'Task submitted successfully.', 'success');
      this.open(taskId);
      this.updateTaskCard(taskId);
    } catch (err) {
      EC.toast(err.message || 'Could not submit task', 'danger');
    }
  },

  validateSubmission(task, payload) {
    if (task.answerMode === 'done') return true;
    if (this.canUploadFile(task) && payload.file instanceof File) return true;
    if (this.canUseUrl(task) && payload.proofUrl) return true;
    if (this.canUseText(task) && payload.responseText) return true;
    EC.toast('Add the required file, link, or message before submitting.', 'warning');
    return false;
  },

  canUploadFile(task) {
    return ['file', 'mixed'].includes(task.answerMode);
  },

  canUseUrl(task) {
    return ['link', 'mixed'].includes(task.answerMode);
  },

  canUseText(task) {
    return ['text', 'mixed', 'link'].includes(task.answerMode);
  },

  answerModeLabel(mode) {
    return {
      file: 'File Upload',
      link: 'Link + Message',
      text: 'Message',
      mixed: 'File / Link / Message',
      done: 'Mark as Done',
      choice: 'Choice Task'
    }[mode] || 'Task';
  },

  statusLabel(status) {
    return {
      pending: 'Not Started',
      submitted: 'Submitted',
      completed: 'Done',
      redo: 'Redo'
    }[status] || status;
  },

  renderChoiceSection(task) {
    return `
      <div class="form-group">
        <div class="section-title">Choose Your Problem</div>
        <div class="choice-task-grid">
          ${(task.choices || []).map(choice => `
            <div class="choice-slot ${choice.takenBy ? (choice.takenBy === (EC.state.currentUser?.initials || EC.state.currentUser?.name) ? 'mine' : 'taken') : ''}"
              onclick="EC.studentTasks.claimChoice('${String(task.id)}','${String(choice.id)}')">
              ${choice.name}
              ${choice.takenBy && choice.takenBy !== (EC.state.currentUser?.initials || EC.state.currentUser?.name) ? `<div class="choice-slot-taken-by">Taken</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  async claimChoice(taskId, choiceId) {
    const task = EC.state.tasks.find(entry => String(entry.id) === String(taskId));
    if (!task) return;
    try {
      const updated = await EC.api.claimChoice(String(taskId), String(choiceId));
      Object.assign(task, updated);
      EC.toast('Choice claimed successfully.', 'success');
      this.open(taskId);
      this.updateTaskCard(taskId);
    } catch (err) {
      EC.toast(err.message || 'Could not claim choice', 'danger');
    }
  },

  filter(btn, type) {
    document.querySelectorAll('.filter-btn').forEach(entry => entry.classList.remove('active'));
    btn.classList.add('active');
    let tasks = EC.state.tasks || [];
    if (type === 'pending') tasks = tasks.filter(task => task.status === 'pending');
    if (type === 'submitted') tasks = tasks.filter(task => task.status === 'submitted');
    if (type === 'completed') tasks = tasks.filter(task => task.status === 'completed');
    if (type === 'redo') tasks = tasks.filter(task => task.status === 'redo');
    if (type === 'choice') tasks = tasks.filter(task => task.isChoice);
    const list = document.getElementById('student-task-list');
    if (list) list.innerHTML = tasks.map(task => this.renderCard(task)).join('');
  },

  close() {
    document.getElementById('task-detail-overlay')?.classList.remove('open');
  }
};
