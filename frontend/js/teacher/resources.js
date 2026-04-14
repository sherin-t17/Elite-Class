window.EC = window.EC || {};

EC.teacherResources = {
  fileTypeOptions: ['PDF', 'Excel', 'PPT', 'Image', 'Video', 'Audio'],

  render(el) {
    if (!EC.state.resources) EC.state.resources = [];

    const categories = [...new Set(EC.state.resources.map((resource) => resource.cat))];

    el.innerHTML = `
      <div class="page-header">
        <div><h2 class="page-title">Resources Manager</h2><p class="page-subtitle">Upload and manage study materials for your class</p></div>
        <div class="page-header-actions">
          <button class="btn btn-accent" type="button" onclick="EC.teacherResources.openUpload()">+ Upload File</button>
        </div>
      </div>

      <div id="res-upload-panel" style="display:none" class="card mb-20 animate-in">
        <div style="padding:14px 20px;border-bottom:1px solid var(--border);font-weight:700;font-size:15px">Upload New Resource</div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:14px">
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <div style="flex:2;min-width:220px">
              <label class="form-label">File Name / Title</label>
              <input class="form-input" id="res-upload-name" placeholder="Leave blank to use the file name">
            </div>
            <div style="flex:1;min-width:150px">
              <label class="form-label">File Type</label>
              <select class="form-input" id="res-upload-type">
                ${EC.teacherResources.fileTypeOptions.map((type) => `<option>${type}</option>`).join('')}
              </select>
            </div>
            <div style="flex:1;min-width:150px">
              <label class="form-label">Category</label>
              <input class="form-input" id="res-upload-cat" placeholder="e.g. Notes, Development">
            </div>
          </div>

          <div>
            <label class="form-label">Choose File</label>
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
              <button class="btn btn-outline" type="button" onclick="EC.teacherResources.pickFile()">Select File</button>
              <input type="file" id="res-upload-file" style="display:none" onchange="EC.teacherResources.handleFileSelect(this.files && this.files[0])">
              <div id="res-upload-file-name" style="font-size:13px;color:var(--text-muted)">No file selected</div>
            </div>
          </div>

          <div style="display:flex;gap:10px">
            <button class="btn btn-primary" type="button" onclick="EC.teacherResources.saveUpload()">Add Resource</button>
            <button class="btn btn-ghost" type="button" onclick="EC.teacherResources.closeUpload()">Cancel</button>
          </div>
        </div>
      </div>

      <div class="form-group mb-16">
        <input class="form-input" id="res-teacher-search" placeholder="Search resources..." oninput="EC.studentResources.search(this.value)" style="max-width:320px">
      </div>

      <div id="res-teacher-list">
        ${categories.length === 0
          ? `<div class="card animate-in" style="text-align:center;padding:56px 24px">
               <div style="font-family:'Playfair Display',serif;font-size:18px;font-weight:700;margin-bottom:8px">No resources yet</div>
               <div style="color:var(--text-muted);font-size:14px">Click "+ Upload File" to add study materials for your students.</div>
             </div>`
          : categories.map((category) => `
              <div class="card mb-16 animate-in">
                <div style="padding:14px 20px;border-bottom:1px solid var(--border);font-weight:700;font-size:15px">&#x1F4C1; ${category}</div>
                ${EC.state.resources
                  .filter((resource) => resource.cat === category)
                  .map((resource) => EC.studentResources.row(resource, { teacherMode: true }))
                  .join('')}
              </div>
            `).join('')
        }
      </div>
    `;

    EC.studentResources.bindActions(el);
  },

  open(resource) {
    return EC.studentResources.open(resource);
  },

  inferType(fileName = '') {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'PDF';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'Excel';
    if (['ppt', 'pptx'].includes(ext)) return 'PPT';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'Image';
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'Video';
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'Audio';
    return 'PDF';
  },

  getSelectedFile() {
    return document.getElementById('res-upload-file')?.files?.[0] || null;
  },

  setSelectedFileLabel(file) {
    const label = document.getElementById('res-upload-file-name');
    if (!label) return;
    label.textContent = file ? `${file.name} (${(file.size / 1024).toFixed(1)} KB)` : 'No file selected';
  },

  handleFileSelect(file) {
    if (!file) {
      EC.teacherResources.setSelectedFileLabel(null);
      return;
    }

    const nameInput = document.getElementById('res-upload-name');
    const typeInput = document.getElementById('res-upload-type');

    if (nameInput && !nameInput.value.trim()) nameInput.value = file.name;
    if (typeInput) typeInput.value = EC.teacherResources.inferType(file.name);

    EC.teacherResources.setSelectedFileLabel(file);
  },

  openUpload() {
    const panel = document.getElementById('res-upload-panel');
    if (panel) {
      panel.style.display = '';
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },

  closeUpload() {
    const panel = document.getElementById('res-upload-panel');
    if (panel) panel.style.display = 'none';

    const nameEl = document.getElementById('res-upload-name');
    const typeEl = document.getElementById('res-upload-type');
    const catEl = document.getElementById('res-upload-cat');
    const fileEl = document.getElementById('res-upload-file');

    if (nameEl) nameEl.value = '';
    if (typeEl) typeEl.value = 'PDF';
    if (catEl) catEl.value = '';
    if (fileEl) fileEl.value = '';

    EC.teacherResources.setSelectedFileLabel(null);
  },

  pickFile() {
    document.getElementById('res-upload-file')?.click();
  },

  async saveUpload() {
    const file = EC.teacherResources.getSelectedFile();
    const nameInput = document.getElementById('res-upload-name');
    const name = nameInput?.value.trim() || file?.name || '';
    const type = document.getElementById('res-upload-type')?.value || EC.teacherResources.inferType(file?.name);
    const cat = document.getElementById('res-upload-cat')?.value.trim() || 'General';

    if (!file) {
      EC.toast('Please choose a file to upload.', 'warning');
      return;
    }

    if (!name) {
      EC.toast('Please enter a file name.', 'warning');
      return;
    }

    try {
      const created = await EC.api.createResource({ name, type, cat, file });
      EC.state.resources.unshift(created);
      EC.toast(`"${name}" uploaded successfully.`, 'success');
      EC.teacherResources.closeUpload();
      EC.teacherResources.render(document.getElementById('page-content-area'));
    } catch (err) {
      EC.toast(err.message || 'Could not upload resource', 'danger');
    }
  },

  async deleteResource(id) {
    const resource = EC.studentResources.getById(id);
    if (!resource) {
      EC.toast('Resource not found', 'warning');
      return;
    }
    if (!confirm(`Delete "${resource.name}"? This cannot be undone.`)) return;

    try {
      await EC.api.deleteResource(id);
      EC.state.resources = EC.state.resources.filter((entry) => String(entry.id) !== String(id));
      EC.state.bookmarks = (EC.state.bookmarks || []).filter(
        (bookmark) => !(String(bookmark.id) === String(id) && bookmark.type === 'resource')
      );
      EC.app.persistBookmarks();
      EC.toast('Resource deleted', 'default', 1800);
      EC.teacherResources.render(document.getElementById('page-content-area'));
    } catch (err) {
      EC.toast(err.message || 'Could not delete resource', 'danger');
    }
  }
};
