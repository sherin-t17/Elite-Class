window.EC = window.EC || {};

EC.teacherGradebook = {
  async render(el) {
    el.innerHTML = `
      <div class="page-header">
        <div><h2 class="page-title">Gradebook</h2><p class="page-subtitle">Submission status, grades and teacher feedback across the class.</p></div>
        <div class="page-header-actions">
          <button class="export-btn pdf" onclick="EC.api.exportPdf('gradebook')">Export PDF</button>
          <button class="export-btn excel" onclick="EC.api.exportExcel('gradebook')">Export Excel</button>
        </div>
      </div>
      <div class="card"><div class="card-body" style="text-align:center;color:var(--text-muted)">Loading gradebook...</div></div>
    `;

    try {
      const rows = await EC.api.getGradebook();
      const tasks = EC.state.tasks.filter(task => task.cat !== 'Bonus');
      el.innerHTML = `
        <div class="page-header">
          <div><h2 class="page-title">Gradebook</h2><p class="page-subtitle">Submission status, grades and teacher feedback across the class.</p></div>
          <div class="page-header-actions">
            <button class="export-btn pdf" onclick="EC.api.exportPdf('gradebook')">Export PDF</button>
            <button class="export-btn excel" onclick="EC.api.exportExcel('gradebook')">Export Excel</button>
          </div>
        </div>
        <div class="card animate-in">
          <div class="card-header">
            <div class="card-title">Class Grades Overview</div>
            <input class="form-input" placeholder="Search student..." oninput="EC.teacherGradebook.search(this.value)" style="width:220px">
          </div>
          <div class="gradebook-wrapper" style="overflow:auto;max-height:70vh">
            <table class="gradebook-table">
              <thead>
                <tr>
                  <th style="min-width:180px;position:sticky;left:0;background:var(--royal)">Student</th>
                  ${tasks.map(task => `<th style="min-width:120px">${task.title}</th>`).join('')}
                </tr>
              </thead>
              <tbody id="gradebook-body">
                ${rows.map(row => `
                  <tr>
                    <td style="position:sticky;left:0;background:#fff;z-index:1;font-weight:700">${row.name}</td>
                    ${row.grades.map(grade => `
                      <td style="vertical-align:top">
                        <div style="font-weight:700">${grade.grade || '-'}</div>
                        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${grade.feedback || 'No remarks yet'}</div>
                        <button class="btn btn-ghost btn-sm" style="margin-top:6px;padding:0;color:var(--royal)" onclick="EC.navigate('tasks')">Grade / review</button>
                      </td>
                    `).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (err) {
      el.innerHTML += `<div class="card" style="margin-top:16px;padding:20px;color:var(--danger)">Could not load gradebook. ${err.message || ''}</div>`;
    }
  },

  search(value) {
    const query = value.toLowerCase();
    document.querySelectorAll('#gradebook-body tr').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
  }
};
