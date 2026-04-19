/* ============================================================
   ELITE CLASS — FILE UPLOAD HANDLER
   Uses cloud storage (Cloudinary/Firebase/S3) via backend.
   Backend stores only the file URL, not the file itself.
   ============================================================ */

window.EC = window.EC || {};

EC.upload = {
  MAX_SIZE_MB: 100, // With cloud storage
  ALLOWED_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg','image/png','image/gif','image/webp',
    'video/mp4','video/webm',
    'text/plain','text/csv',
    'application/zip','application/x-zip-compressed',
  ],
  ALLOWED_EXT: ['pdf','doc','docx','xls','xlsx','ppt','pptx','jpg','jpeg','png','gif','mp4','txt','csv','zip'],

  getIcon(type) {
    if (type?.includes('pdf'))   return '📄';
    if (type?.includes('word') || type?.includes('doc')) return '📝';
    if (type?.includes('excel') || type?.includes('sheet')) return '📊';
    if (type?.includes('presentation') || type?.includes('ppt')) return '📋';
    if (type?.includes('image')) return '🖼️';
    if (type?.includes('video')) return '🎥';
    if (type?.includes('zip'))   return '📦';
    return '📁';
  },

  formatSize(bytes) {
    if (bytes < 1024)        return bytes + ' B';
    if (bytes < 1024*1024)   return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/(1024*1024)).toFixed(1) + ' MB';
  },

  validate(file) {
    if (!file) return { ok:false, error:'No file selected.' };
    const maxBytes = EC.upload.MAX_SIZE_MB * 1024 * 1024;
    if (file.size > maxBytes) return { ok:false, error:`File too large. Max ${EC.upload.MAX_SIZE_MB}MB.` };
    const ext = file.name.split('.').pop().toLowerCase();
    if (!EC.upload.ALLOWED_EXT.includes(ext)) return { ok:false, error:`File type .${ext} not allowed.` };
    return { ok:true };
  },

  // Create drag-drop upload zone
  createZone(containerId, onFile) {
    const el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = `
      <div class="submit-area" id="${containerId}-zone" role="button" tabindex="0" aria-label="Upload file" style="cursor:pointer">
        <div class="si">📎</div>
        <div style="font-weight:600;font-size:14px;margin-bottom:4px">Drop your file here or click to browse</div>
        <div style="font-size:12px;color:var(--text-muted)">PDF, DOCX, XLSX, PPTX, Images, Videos • Max ${EC.upload.MAX_SIZE_MB}MB</div>
        <input type="file" id="${containerId}-input" style="display:none" accept="${EC.upload.ALLOWED_EXT.map(e=>'.'+e).join(',')}">
      </div>
      <div id="${containerId}-preview" style="display:none;background:var(--surface);border-radius:var(--radius-sm);padding:12px 14px;display:flex;align-items:center;gap:12px;margin-top:10px">
        <span id="${containerId}-file-icon" style="font-size:28px"></span>
        <div style="flex:1;min-width:0">
          <div id="${containerId}-file-name" style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div>
          <div id="${containerId}-file-size" style="font-size:12px;color:var(--text-muted)"></div>
        </div>
        <button onclick="EC.upload.clearZone('${containerId}')" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--text-muted)">✕</button>
      </div>
    `;

    const zone  = el.querySelector(`#${containerId}-zone`);
    const input = el.querySelector(`#${containerId}-input`);

    zone.addEventListener('click', () => input.click());
    zone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        input.click();
      }
    });
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.borderColor='var(--royal)'; zone.style.background='var(--royal-soft)'; });
    zone.addEventListener('dragleave', () => { zone.style.borderColor=''; zone.style.background=''; });
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.style.borderColor=''; zone.style.background='';
      const file = e.dataTransfer.files[0];
      if (file) EC.upload._handleFile(containerId, file, onFile);
    });
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) EC.upload._handleFile(containerId, file, onFile);
    });
  },

  _handleFile(containerId, file, onFile) {
    const val = EC.upload.validate(file);
    if (!val.ok) { EC.toast(val.error, 'danger'); return; }

    const preview  = document.getElementById(`${containerId}-preview`);
    const zone     = document.getElementById(`${containerId}-zone`);
    const fileIcon = document.getElementById(`${containerId}-file-icon`);
    const fileName = document.getElementById(`${containerId}-file-name`);
    const fileSize = document.getElementById(`${containerId}-file-size`);

    if (fileIcon) fileIcon.textContent = EC.upload.getIcon(file.type);
    if (fileName) fileName.textContent = file.name;
    if (fileSize) fileSize.textContent = EC.upload.formatSize(file.size);
    if (preview)  { preview.style.display = 'flex'; }
    if (zone)     zone.style.display = 'none';

    if (onFile) onFile(file);
  },

  clearZone(containerId) {
    const preview = document.getElementById(`${containerId}-preview`);
    const zone    = document.getElementById(`${containerId}-zone`);
    const input   = document.getElementById(`${containerId}-input`);
    if (preview) preview.style.display = 'none';
    if (zone)    zone.style.display = '';
    if (input)   input.value = '';
  }
};
