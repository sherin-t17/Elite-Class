window.EC = window.EC || {};

EC.teacherExplanations = {
  async render(el) {
    el.innerHTML = `
      <div class="page-header">
        <div><h2 class="page-title">💬 Explanations</h2><p class="page-subtitle">Review warning explanations using the same quick approval pattern as Leave / OD.</p></div>
      </div>
      <div id="teacher-explanations-root">
        <div class="card" style="padding:24px;text-align:center;color:var(--text-muted)">Loading explanations…</div>
      </div>
    `;
    try {
      const warnings = await EC.api.getMonthTaskWarnings();
      const pending = warnings.filter(entry => entry.teacherAction === 'pending');
      document.getElementById('teacher-explanations-root').innerHTML = pending.length
        ? pending.map(entry => `
          <div class="card mb-16 animate-in">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px">
              <div>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                  <div style="font-weight:700;font-size:16px">${entry.studentName}</div>
                  <span class="tag" style="background:var(--warning-bg);color:var(--warning)">${entry.warningType === '3_day_skip' ? '3-day skip' : '5-day same score'}</span>
                </div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:6px">${formatDateTime(entry.triggeredAt)} • ${entry.batchTitle || 'Month Tasks'}</div>
                <div style="font-size:14px;color:var(--text-mid);line-height:1.65;margin-top:12px;background:var(--surface);padding:14px;border-radius:var(--radius-sm)">
                  ${entry.explanationText || 'No explanation submitted yet.'}
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:8px;min-width:130px">
                <button class="btn btn-success btn-sm" onclick="EC.teacherExplanations.action('${entry.id}','accepted')">Accept</button>
                <button class="btn btn-danger btn-sm" onclick="EC.teacherExplanations.action('${entry.id}','flagged')">Flag</button>
              </div>
            </div>
          </div>
        `).join('')
        : `<div class="card" style="padding:32px;text-align:center"><div style="font-size:40px;margin-bottom:10px">✅</div><div style="font-weight:700;font-size:20px">No pending explanations</div><div style="color:var(--text-muted);margin-top:8px">Students with active warnings will appear here after they submit their explanations.</div></div>`;
    } catch (err) {
      document.getElementById('teacher-explanations-root').innerHTML = `<div class="card" style="padding:24px;color:var(--danger)">Could not load explanations. ${err.message || ''}</div>`;
    }
  },

  async action(id, action) {
    try {
      await EC.api.actionMonthTaskWarning(id, action);
      EC.toast(action === 'accepted' ? 'Explanation accepted.' : 'Explanation flagged and warning badge added.', 'success');
      this.render(document.getElementById('page-content-area'));
    } catch (err) {
      EC.toast(err.message || 'Could not update explanation', 'danger');
    }
  }
};
