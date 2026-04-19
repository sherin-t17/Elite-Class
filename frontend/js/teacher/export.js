window.EC = window.EC || {};

EC.teacherExport = {
  render(el) {
    el.innerHTML = `
      <div class="page-header">
        <div><h2 class="page-title">Export Reports</h2><p class="page-subtitle">Download gradebook, student performance, and leaderboard data.</p></div>
      </div>
      <div class="two-col animate-in">
        <div class="card">
          <div class="card-header"><div class="card-title">PDF Reports</div></div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:10px">
            <button class="export-btn pdf" onclick="EC.teacherExport.download('gradebook','pdf')">Gradebook Report PDF</button>
            <button class="export-btn pdf" onclick="EC.teacherExport.download('students','pdf')">Student Performance PDF</button>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Excel Reports</div></div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:10px">
            <button class="export-btn excel" onclick="EC.teacherExport.download('gradebook','excel')">Gradebook Excel</button>
            <button class="export-btn excel" onclick="EC.teacherExport.download('leaderboard','excel')">Leaderboard Excel</button>
          </div>
        </div>
      </div>
    `;
  },

  download(type, format) {
    if (format === 'pdf') {
      EC.api.exportPdf(type).catch(err => EC.toast(err.message || 'Could not export PDF', 'danger'));
      return;
    }
    EC.api.exportExcel(type).catch(err => EC.toast(err.message || 'Could not export Excel', 'danger'));
  }
};
