window.EC = window.EC || {};

EC.teacherReview = {
  submissions: [],
  previousPage: 'month-tasks',
  activeSubmission: null,

  async render(el) {
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">Review Page</h2>
          <p class="page-subtitle">Review student submissions from month tasks and the regular task module.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-outline" onclick="EC.navigate('${this.previousPage || 'month-tasks'}')">Back</button>
          <button class="btn btn-outline" onclick="EC.teacherReview.refresh()">Refresh</button>
        </div>
      </div>
      <div id="review-content">
        <div class="card" style="padding:24px;text-align:center;color:var(--text-muted)">Loading submissions...</div>
      </div>
      ${this.reviewModal()}
    `;
    await this.refresh();
  },

  reviewModal() {
    return `
      <div class="overlay" id="month-review-overlay">
        <div class="modal modal-lg">
          <div class="modal-header">
            <div>
              <div class="modal-title" id="month-review-title">Month Task Review</div>
              <div class="card-subtitle" id="month-review-meta"></div>
            </div>
            <button class="modal-close" onclick="EC.teacherReview.closeMonthTaskReview()">X</button>
          </div>
          <div class="modal-body">
            <div id="month-review-proof" style="margin-bottom:14px"></div>
            <div class="form-group">
              <label class="form-label">Review Notes</label>
              <textarea class="form-textarea" id="month-review-notes" placeholder="Add notes for the student"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Score</label>
              <input class="form-input" id="month-review-score" type="number" value="0">
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap">
              <button class="btn btn-outline" onclick="EC.teacherReview.closeMonthTaskReview()">Cancel</button>
              <button class="btn btn-danger" onclick="EC.teacherReview.rejectMonthTaskSubmission()">Reject</button>
              <button class="btn btn-success" onclick="EC.teacherReview.approveMonthTaskSubmission()">Approve</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async refresh() {
    const container = document.getElementById('review-content');
    if (!container) return;

    try {
      const [batches, standardSubmissions] = await Promise.all([
        EC.api.listMonthTaskBatches().catch(() => ({ activeBatchId: null, batches: [] })),
        EC.api.getAllPendingSubmissions().catch(() => [])
      ]);

      const monthTaskSubmissions = batches?.activeBatchId
        ? await EC.api.getMonthTaskPendingSubmissions(batches.activeBatchId).catch(() => [])
        : [];

      this.submissions = [
        ...monthTaskSubmissions.map((entry) => ({ ...entry, reviewType: 'month-task' })),
        ...standardSubmissions.map((entry) => ({ ...entry, reviewType: 'task' }))
      ];
      this.renderList(container);
    } catch (error) {
      container.innerHTML = `<div class="card" style="padding:24px;color:var(--danger)">Error loading submissions: ${error.message || ''}</div>`;
    }
  },

  renderList(container) {
    if (!this.submissions.length) {
      container.innerHTML = `
        <div class="card" style="text-align:center;padding:48px 24px">
          <div style="font-family:'Playfair Display',serif;font-size:22px;font-weight:700;margin-bottom:8px">All caught up</div>
          <div style="color:var(--text-muted)">There are no student submissions waiting for review.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="card">
        <div class="card-body" style="display:grid;gap:12px">
          ${this.submissions.map((submission) => this.renderSubmissionCard(submission)).join('')}
        </div>
      </div>
    `;
  },

  renderSubmissionCard(submission) {
    const title = submission.taskTitle || submission.task?.title || 'Task';
    const submittedAt = submission.submittedAt ? formatDateTime(submission.submittedAt) : 'Pending';
    const badge = submission.reviewType === 'month-task' ? 'Month Task' : 'Task';
    const openAction = submission.reviewType === 'month-task'
      ? `EC.teacherReview.openMonthTaskReview('${submission.id}')`
      : `EC.teacherReview.openTaskReview('${submission.id}')`;

    return `
      <div style="border:1px solid var(--border-soft);border-radius:14px;padding:14px 16px">
        <div style="display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:start">
          <div class="avatar avatar-md" style="background:${submission.studentColor || '#1a3a8f'};background-image:url('${EC.getProfileImageUrl(EC.getStudent(submission.studentId) || { name: submission.studentName, profileImageUrl: '', color: submission.studentColor })}');background-size:cover;background-position:center;color:transparent;">${submission.studentInitials || (submission.studentName || 'S').slice(0, 2).toUpperCase()}</div>
          <div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <strong>${submission.studentName || 'Student'}</strong>
              <span class="tag cat">${badge}</span>
              <span class="tag ${submission.status === 'late' || submission.status === 'failed' ? 'hard' : 'easy'}">${submission.status || 'submitted'}</span>
            </div>
            <div style="font-weight:700;color:var(--royal);margin-top:4px">${title}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Submitted ${submittedAt}</div>
            ${submission.responseText ? `<div style="margin-top:10px;padding:10px;background:var(--surface);border-radius:10px;font-size:13px;white-space:pre-wrap">${submission.responseText}</div>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn btn-accent btn-sm" onclick="${openAction}">Review</button>
            ${submission.fileUrl || submission.proofFileUrl ? `<a class="btn btn-outline btn-sm" href="${submission.fileUrl || submission.proofFileUrl}" target="_blank" rel="noopener noreferrer">Open File</a>` : ''}
            ${submission.proofUrl ? `<a class="btn btn-outline btn-sm" href="${submission.proofUrl}" target="_blank" rel="noopener noreferrer">Open Link</a>` : ''}
          </div>
        </div>
      </div>
    `;
  },

  openTaskReview(submissionId) {
    const submission = this.submissions.find((entry) => String(entry.id) === String(submissionId));
    if (!submission || typeof EC.teacherTasks?.openReview !== 'function') {
      EC.toast('Task review is not available.', 'warning');
      return;
    }

    const originalClose = EC.teacherTasks.closeReview;
    EC.teacherTasks.openReview(submission.taskId || submission.task?._id, submission.studentId, submission.id);
    EC.teacherTasks.closeReview = function() {
      document.getElementById('review-overlay')?.classList.remove('open');
      EC.teacherTasks.closeReview = originalClose;
      EC.teacherReview.refresh();
    };
  },

  openMonthTaskReview(submissionId) {
    const submission = this.submissions.find((entry) => String(entry.id) === String(submissionId));
    if (!submission) return;
    this.activeSubmission = submission;
    document.getElementById('month-review-title').textContent = submission.taskTitle || 'Month Task Review';
    document.getElementById('month-review-meta').textContent = `${submission.studentName || 'Student'} • ${submission.date || ''}`;
    document.getElementById('month-review-notes').value = submission.reviewNotes || '';
    document.getElementById('month-review-score').value = Number(submission.score || 0);
    document.getElementById('month-review-proof').innerHTML = `
      ${submission.responseText ? `<div class="card" style="padding:12px;margin-bottom:10px;background:var(--surface);white-space:pre-wrap">${submission.responseText}</div>` : ''}
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${submission.proofFileUrl ? `<a class="btn btn-outline btn-sm" href="${submission.proofFileUrl}" target="_blank" rel="noopener noreferrer">${submission.proofFileName || 'Open file'}</a>` : ''}
        ${submission.proofUrl ? `<a class="btn btn-outline btn-sm" href="${submission.proofUrl}" target="_blank" rel="noopener noreferrer">Open link</a>` : ''}
      </div>
    `;
    document.getElementById('month-review-overlay')?.classList.add('open');
  },

  closeMonthTaskReview() {
    this.activeSubmission = null;
    document.getElementById('month-review-overlay')?.classList.remove('open');
  },

  async approveMonthTaskSubmission() {
    if (!this.activeSubmission) return;
    await EC.api.approveMonthTaskSubmission(this.activeSubmission.id, {
      reviewNotes: document.getElementById('month-review-notes')?.value || '',
      score: Number(document.getElementById('month-review-score')?.value || 0)
    });
    this.closeMonthTaskReview();
    EC.toast('Month task approved.', 'success');
    await this.refresh();
  },

  async rejectMonthTaskSubmission() {
    if (!this.activeSubmission) return;
    await EC.api.rejectMonthTaskSubmission(this.activeSubmission.id, {
      reviewNotes: document.getElementById('month-review-notes')?.value || '',
      reason: document.getElementById('month-review-notes')?.value || 'Rejected by teacher',
      score: Number(document.getElementById('month-review-score')?.value || 0)
    });
    this.closeMonthTaskReview();
    EC.toast('Month task rejected.', 'success');
    await this.refresh();
  }
};
