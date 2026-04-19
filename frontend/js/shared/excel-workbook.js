window.EC = window.EC || {};

EC.excelWorkbook = {
  state: {
    workbookKey: 'month-task-workbook',
    workbook: null,
    currentSheetId: '',
    activeCell: { row: 0, col: 0 },
    editingCell: null,
    previousPage: 'month-tasks',
    saving: false,
    clipboard: null
  },

  async render(el) {
    el.innerHTML = `
      <div class="page-header workbook-header">
        <div>
          <h2 class="page-title">Workbook</h2>
          <p class="page-subtitle">Shared Excel workspace for workbook, track sheet, and department sheet.</p>
        </div>
        <div class="page-header-actions workbook-actions">
          <button class="btn btn-outline" type="button" onclick="EC.excelWorkbook.goBack()">Back</button>
          <button class="btn btn-outline" type="button" onclick="EC.excelWorkbook.createSheet()">Add Sheet</button>
          <button class="btn btn-outline" type="button" onclick="EC.excelWorkbook.addRow()">+ Row</button>
          <button class="btn btn-outline" type="button" onclick="EC.excelWorkbook.deleteRow()">- Row</button>
          <button class="btn btn-outline" type="button" onclick="EC.excelWorkbook.addColumn()">+ Column</button>
          <button class="btn btn-outline" type="button" onclick="EC.excelWorkbook.deleteColumn()">- Column</button>
          <button class="btn btn-outline" type="button" onclick="EC.excelWorkbook.copyCell()">Copy</button>
          <button class="btn btn-outline" type="button" onclick="EC.excelWorkbook.pasteCell()">Paste</button>
          <button class="btn btn-accent" type="button" onclick="EC.excelWorkbook.saveCurrentSheet()">Save</button>
        </div>
      </div>
      <div id="excel-workbook-root">
        <div class="card" style="padding:24px;text-align:center;color:var(--text-muted)">Loading workbook...</div>
      </div>
    `;

    await this.loadWorkbook();
  },

  async loadWorkbook() {
    const root = document.getElementById('excel-workbook-root');
    try {
      this.state.workbook = await EC.api.getExcelWorkbook(this.state.workbookKey);
      if (!this.state.currentSheetId || !this.getCurrentSheet()) {
        this.state.currentSheetId = this.state.workbook?.sheets?.[0]?.id || '';
      }
      this.state.editingCell = null;
      this.renderLayout();
    } catch (error) {
      if (root) {
        root.innerHTML = `<div class="card" style="padding:24px;color:var(--danger)">Could not load workbook. ${error.message || ''}</div>`;
      }
    }
  },

  getCurrentSheet() {
    return (this.state.workbook?.sheets || []).find((sheet) => sheet.id === this.state.currentSheetId) || null;
  },

  isTeacher() {
    return EC.state.currentRole === 'teacher';
  },

  canEditSheet(sheet = this.getCurrentSheet()) {
    return Boolean(sheet?.canEdit);
  },

  renderLayout() {
    const root = document.getElementById('excel-workbook-root');
    const workbook = this.state.workbook;
    const sheet = this.getCurrentSheet();
    if (!root || !workbook || !sheet) return;

    root.innerHTML = `
      <div class="two-col-wide workbook-shell">
        <div>
          <div class="card mb-16">
            <div class="card-body workbook-toolbar">
              <div>
                <div class="workbook-caption">Current Sheet</div>
                <div class="workbook-sheet-title">${sheet.title}</div>
                <div class="workbook-meta">${sheet.type === 'grid' ? 'Editable workbook sheet' : sheet.type === 'track' ? 'Teacher monitoring sheet' : 'Department grouping sheet'}</div>
              </div>
              <div class="workbook-inline-actions">
                <input class="form-input" id="excel-sheet-title" placeholder="Sheet name" value="${this.escapeAttribute(sheet.title)}" ${sheet.type !== 'grid' || !this.isTeacher() ? 'disabled' : ''}>
                <button class="btn btn-outline btn-sm" type="button" onclick="EC.excelWorkbook.renameCurrentSheet()" ${sheet.type !== 'grid' || !this.isTeacher() ? 'disabled' : ''}>Rename</button>
                <button class="btn btn-danger btn-sm" type="button" onclick="EC.excelWorkbook.deleteCurrentSheet()" ${sheet.type !== 'grid' || !this.isTeacher() ? 'disabled' : ''}>Delete</button>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-body workbook-grid-wrap">
              ${this.renderGrid(sheet)}
            </div>
          </div>
          <div class="workbook-tabs">
            ${(workbook.sheets || []).map((entry) => `
              <button class="workbook-tab ${entry.id === sheet.id ? 'active' : ''}" type="button" onclick="EC.excelWorkbook.openSheet('${entry.id}')">
                ${entry.title}
              </button>
            `).join('')}
          </div>
        </div>
        <div>
          <div class="card mb-16">
            <div class="card-header"><div class="card-title">Access</div></div>
            <div class="card-body">
              <div class="workbook-access-row">
                <span>Teacher control</span>
                <strong>${this.isTeacher() ? 'Full access' : 'Teacher override active'}</strong>
              </div>
              <div class="workbook-access-row">
                <span>Student mode</span>
                <strong>${this.canEditSheet(sheet) ? 'Edit' : 'View only'}</strong>
              </div>
              <div class="workbook-access-row">
                <span>Last updated</span>
                <strong>${workbook.updatedAt ? formatDateTime(workbook.updatedAt) : 'Not saved yet'}</strong>
              </div>
            </div>
          </div>
          ${this.isTeacher() ? this.renderPermissions() : ''}
          <div class="card">
            <div class="card-header"><div class="card-title">Instructions</div></div>
            <div class="card-body">
              <div class="workbook-note">Single click selects a cell.</div>
              <div class="workbook-note">Double click or press Enter to edit.</div>
              <div class="workbook-note">Click outside the input to save the value.</div>
              <div class="workbook-note">Track Sheet updates task scores and status.</div>
              <div class="workbook-note">Department Sheet updates student department mapping.</div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderPermissions() {
    const workbook = this.state.workbook;
    const editableIds = workbook?.permissions?.editableSheetIds || [];
    return `
      <div class="card mb-16">
        <div class="card-header"><div class="card-title">Student Editing</div></div>
        <div class="card-body">
          <label class="workbook-toggle">
            <input type="checkbox" id="excel-allow-student-editing" ${workbook?.permissions?.allowStudentEditing ? 'checked' : ''}>
            <span>Allow Student Editing</span>
          </label>
          <div class="workbook-permission-list">
            ${(workbook?.sheets || []).filter((sheet) => sheet.type === 'grid').map((sheet) => `
              <label class="workbook-toggle">
                <input type="checkbox" class="excel-edit-sheet" value="${sheet.id}" ${!editableIds.length || editableIds.includes(sheet.id) ? 'checked' : ''}>
                <span>${sheet.title}</span>
              </label>
            `).join('')}
          </div>
          <button class="btn btn-primary btn-sm" type="button" onclick="EC.excelWorkbook.savePermissions()">Save Access</button>
        </div>
      </div>
    `;
  },

  renderGrid(sheet) {
    const columnCount = Math.max(1, Number(sheet.columnCount || 1));
    const cells = Array.isArray(sheet.cells) ? sheet.cells : [];
    const canEdit = this.canEditSheet(sheet);

    return `
      <table class="excel-grid">
        <thead>
          <tr>
            <th class="excel-index">#</th>
            ${Array.from({ length: columnCount }, (_, colIndex) => `
              <th style="width:${Number(sheet.columnWidths?.[colIndex] || 120)}px">${this.columnLabel(colIndex)}</th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${cells.map((row, rowIndex) => `
            <tr>
              <td class="excel-index">${rowIndex + 1}</td>
              ${row.map((cell, colIndex) => this.renderCell(cell, rowIndex, colIndex, canEdit)).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },

  renderCell(cell, rowIndex, colIndex, canEdit) {
    const isActive = this.state.activeCell.row === rowIndex && this.state.activeCell.col === colIndex;
    const isEditing = this.state.editingCell && this.state.editingCell.row === rowIndex && this.state.editingCell.col === colIndex && canEdit;
    const value = String(cell?.formula || cell?.value || '');

    if (isEditing) {
      return `
        <td class="excel-cell active">
          <input
            class="excel-cell-input"
            id="excel-cell-editor"
            value="${this.escapeAttribute(value)}"
            onblur="EC.excelWorkbook.commitEdit(this.value)"
            onkeydown="EC.excelWorkbook.handleEditorKeydown(event)"
            autofocus
          >
        </td>
      `;
    }

    return `
      <td
        class="excel-cell ${isActive ? 'active' : ''} ${canEdit ? '' : 'readonly'}"
        onclick="EC.excelWorkbook.selectCell(${rowIndex}, ${colIndex})"
        ondblclick="EC.excelWorkbook.startEdit(${rowIndex}, ${colIndex})"
      >
        <div class="excel-cell-text">${this.escapeHtml(value) || '&nbsp;'}</div>
      </td>
    `;
  },

  selectCell(row, col) {
    this.state.activeCell = { row, col };
    this.renderLayout();
  },

  startEdit(row = this.state.activeCell.row, col = this.state.activeCell.col) {
    const sheet = this.getCurrentSheet();
    if (!this.canEditSheet(sheet)) {
      EC.toast('Editing is disabled for this sheet.', 'warning');
      return;
    }
    this.state.activeCell = { row, col };
    this.state.editingCell = { row, col };
    this.renderLayout();
    const input = document.getElementById('excel-cell-editor');
    if (input) input.select();
  },

  handleEditorKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commitEdit(event.target.value);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.state.editingCell = null;
      this.renderLayout();
    }
  },

  commitEdit(value) {
    const sheet = this.getCurrentSheet();
    const editing = this.state.editingCell;
    if (!sheet || !editing) return;
    const cell = sheet.cells?.[editing.row]?.[editing.col];
    if (!cell) return;
    cell.value = String(value ?? '');
    cell.formula = String(value || '').startsWith('=') ? String(value) : '';
    this.state.editingCell = null;
    this.renderLayout();
    this.saveCurrentSheet(true);
  },

  openSheet(sheetId) {
    this.state.currentSheetId = sheetId;
    this.state.activeCell = { row: 0, col: 0 };
    this.state.editingCell = null;
    this.renderLayout();
  },

  ensureSize(sheet, rowCount, columnCount) {
    const rows = Math.max(1, rowCount);
    const cols = Math.max(1, columnCount);
    sheet.rowCount = rows;
    sheet.columnCount = cols;
    sheet.cells = Array.isArray(sheet.cells) ? sheet.cells : [];
    while (sheet.cells.length < rows) {
      sheet.cells.push(Array.from({ length: cols }, () => ({ value: '', formula: '' })));
    }
    sheet.cells = sheet.cells.slice(0, rows).map((row) => {
      const nextRow = Array.isArray(row) ? row.slice(0, cols) : [];
      while (nextRow.length < cols) nextRow.push({ value: '', formula: '' });
      return nextRow.map((cell) => ({
        value: String(cell?.value ?? ''),
        formula: String(cell?.formula ?? '')
      }));
    });
  },

  addRow() {
    const sheet = this.getCurrentSheet();
    if (!this.canEditSheet(sheet)) return EC.toast('Editing is disabled for this sheet.', 'warning');
    this.ensureSize(sheet, (sheet.rowCount || 1) + 1, sheet.columnCount || 1);
    this.renderLayout();
  },

  deleteRow() {
    const sheet = this.getCurrentSheet();
    if (!this.canEditSheet(sheet)) return EC.toast('Editing is disabled for this sheet.', 'warning');
    if ((sheet.rowCount || 1) <= 1) return EC.toast('At least one row must remain.', 'warning');
    sheet.cells.splice(this.state.activeCell.row, 1);
    this.ensureSize(sheet, sheet.cells.length, sheet.columnCount || 1);
    this.state.activeCell.row = Math.max(0, this.state.activeCell.row - 1);
    this.renderLayout();
  },

  addColumn() {
    const sheet = this.getCurrentSheet();
    if (!this.canEditSheet(sheet)) return EC.toast('Editing is disabled for this sheet.', 'warning');
    this.ensureSize(sheet, sheet.rowCount || 1, (sheet.columnCount || 1) + 1);
    sheet.columnWidths = [...(sheet.columnWidths || []), 120];
    this.renderLayout();
  },

  deleteColumn() {
    const sheet = this.getCurrentSheet();
    if (!this.canEditSheet(sheet)) return EC.toast('Editing is disabled for this sheet.', 'warning');
    if ((sheet.columnCount || 1) <= 1) return EC.toast('At least one column must remain.', 'warning');
    sheet.cells = (sheet.cells || []).map((row) => row.filter((_, colIndex) => colIndex !== this.state.activeCell.col));
    sheet.columnWidths = (sheet.columnWidths || []).filter((_, colIndex) => colIndex !== this.state.activeCell.col);
    this.ensureSize(sheet, sheet.rowCount || 1, (sheet.columnCount || 1) - 1);
    this.state.activeCell.col = Math.max(0, this.state.activeCell.col - 1);
    this.renderLayout();
  },

  async createSheet() {
    if (!this.isTeacher()) {
      EC.toast('Only teachers can create sheets.', 'warning');
      return;
    }
    const title = window.prompt('Enter a sheet name', `Sheet${(this.state.workbook?.sheets || []).length + 1}`);
    if (title === null) return;
    await EC.api.createExcelSheet(this.state.workbookKey, title);
    await this.loadWorkbook();
  },

  async deleteCurrentSheet() {
    const sheet = this.getCurrentSheet();
    if (!sheet || sheet.type !== 'grid') return;
    if (!window.confirm(`Delete ${sheet.title}?`)) return;
    await EC.api.deleteExcelSheet(this.state.workbookKey, sheet.id);
    this.state.currentSheetId = '';
    await this.loadWorkbook();
  },

  renameCurrentSheet() {
    const sheet = this.getCurrentSheet();
    const input = document.getElementById('excel-sheet-title');
    if (!sheet || !input) return;
    sheet.title = String(input.value || '').trim() || sheet.title;
    this.renderLayout();
  },

  async saveCurrentSheet(silent = false) {
    const sheet = this.getCurrentSheet();
    if (!sheet || !this.canEditSheet(sheet) || this.state.saving) return;

    this.state.saving = true;
    try {
      const saved = await EC.api.saveExcelSheet(this.state.workbookKey, sheet.id, {
        title: sheet.title,
        rowCount: sheet.rowCount,
        columnCount: sheet.columnCount,
        columnWidths: sheet.columnWidths || [],
        cells: sheet.cells || []
      });
      const index = (this.state.workbook?.sheets || []).findIndex((entry) => entry.id === sheet.id);
      if (index >= 0) this.state.workbook.sheets[index] = saved;
      if (!silent) EC.toast('Workbook saved.', 'success');
      await this.loadWorkbook();
    } catch (error) {
      EC.toast(error.message || 'Could not save workbook.', 'danger');
    } finally {
      this.state.saving = false;
    }
  },

  async savePermissions() {
    if (!this.isTeacher()) return;
    const allowStudentEditing = Boolean(document.getElementById('excel-allow-student-editing')?.checked);
    const editableSheetIds = Array.from(document.querySelectorAll('.excel-edit-sheet:checked')).map((input) => input.value);
    this.state.workbook = await EC.api.updateExcelPermissions(this.state.workbookKey, {
      allowStudentEditing,
      editableSheetIds
    });
    this.renderLayout();
    EC.toast('Student editing permissions updated.', 'success');
  },

  copyCell() {
    const sheet = this.getCurrentSheet();
    const cell = sheet?.cells?.[this.state.activeCell.row]?.[this.state.activeCell.col];
    if (!cell) return;
    this.state.clipboard = { value: cell.value || '', formula: cell.formula || '' };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(cell.formula || cell.value || '').catch(() => {});
    }
    EC.toast('Cell copied.', 'success');
  },

  async pasteCell() {
    const sheet = this.getCurrentSheet();
    if (!this.canEditSheet(sheet)) return EC.toast('Editing is disabled for this sheet.', 'warning');
    let payload = this.state.clipboard;
    if (!payload && navigator.clipboard?.readText) {
      try {
        const text = await navigator.clipboard.readText();
        payload = { value: text, formula: text.startsWith('=') ? text : '' };
      } catch (error) {
        payload = null;
      }
    }
    if (!payload) return EC.toast('Clipboard is empty.', 'warning');
    const cell = sheet?.cells?.[this.state.activeCell.row]?.[this.state.activeCell.col];
    if (!cell) return;
    cell.value = String(payload.value || '');
    cell.formula = String(payload.formula || '');
    this.renderLayout();
  },

  columnLabel(index) {
    let value = index + 1;
    let label = '';
    while (value > 0) {
      const remainder = (value - 1) % 26;
      label = String.fromCharCode(65 + remainder) + label;
      value = Math.floor((value - 1) / 26);
    }
    return label;
  },

  escapeAttribute(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  },

  escapeHtml(value) {
    return this.escapeAttribute(value);
  },

  goBack() {
    EC.navigate(this.state.previousPage || 'month-tasks');
  }
};

document.addEventListener('keydown', (event) => {
  if (EC.state.currentPage !== 'excel-workbook') return;
  if (event.target?.closest?.('#excel-cell-editor')) return;
  if (event.key === 'Enter') {
    event.preventDefault();
    EC.excelWorkbook.startEdit();
  }
});

EC.openMonthTaskExcelTab = function() {
  if (!EC.state?.authToken) {
    EC.toast('Please sign in before opening the workbook.', 'warning');
    return;
  }
  EC.excelWorkbook.state.previousPage = EC.state.currentPage || 'month-tasks';
  EC.navigate('excel-workbook');
};
