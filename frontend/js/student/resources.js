/* ============================================================
   ELITE CLASS - STUDENT RESOURCES
   ============================================================ */
window.EC = window.EC || {};

EC.studentResources = {
  icons: {
    PDF: '&#x1F4C4;',
    Excel: '&#x1F4CA;',
    PPT: '&#x1F4D1;',
    Image: '&#x1F5BC;&#xFE0F;',
    Video: '&#x1F3A5;',
    Audio: '&#x1F3B5;'
  },

  getById(id) {
    return (EC.state.resources || []).find((resource) => String(resource.id) === String(id));
  },

  ensureBookmarks() {
    if (!Array.isArray(EC.state.bookmarks)) EC.state.bookmarks = [];
  },

  typeIcon(type) {
    return EC.studentResources.icons[type] || '&#x1F4CE;';
  },

  render(el) {
    if (!EC.state.resources) EC.state.resources = [];

    const categories = [...new Set(EC.state.resources.map((resource) => resource.cat))];

    el.innerHTML = `
      <div class="page-header">
        <div><h2 class="page-title">&#x1F4DA; Resources</h2><p class="page-subtitle">Study materials uploaded by your teacher</p></div>
      </div>
      <div class="form-group mb-16">
        <input class="form-input" id="res-search" placeholder="Search resources..." oninput="EC.studentResources.search(this.value)" style="max-width:320px">
      </div>
      <div id="res-list">
        ${categories.length === 0
          ? `<div class="card" style="text-align:center;padding:32px;color:var(--text-muted)">No resources available yet.</div>`
          : categories.map((category) => `
              <div class="card mb-16 animate-in">
                <div style="padding:14px 20px;border-bottom:1px solid var(--border);font-weight:700;font-size:15px">&#x1F4C1; ${category}</div>
                ${EC.state.resources
                  .filter((resource) => resource.cat === category)
                  .map((resource) => EC.studentResources.row(resource, { teacherMode: false }))
                  .join('')}
              </div>
            `).join('')
        }
      </div>
    `;

    EC.studentResources.bindActions(el);
  },

  bindActions(root) {
    const scope = root?.querySelector('#res-list') || root?.querySelector('#res-teacher-list') || root;
    if (!scope || scope.dataset.resourceBound === 'true') return;

    scope.addEventListener('click', (event) => {
      const button = event.target.closest('[data-resource-action]');
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();

      const resourceId = button.getAttribute('data-resource-id');
      const resource = EC.studentResources.getById(resourceId);
      const action = button.getAttribute('data-resource-action');

      if (action === 'open') EC.studentResources.open(resource);
      if (action === 'download') EC.studentResources.download(resource);
      if (action === 'bookmark') EC.studentResources.bookmark(resourceId);
      if (action === 'delete' && EC.teacherResources?.deleteResource) EC.teacherResources.deleteResource(resourceId);
    });

    scope.dataset.resourceBound = 'true';
  },

  async open(resource) {
    if (!resource?.id) {
      EC.toast('This resource does not have a file attached yet.', 'warning');
      return;
    }

    try {
      const blob = await EC.api.getResourceBlob(resource.id, false);
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch (err) {
      EC.toast(err.message || 'Could not open resource', 'danger');
    }
  },

  async download(resource) {
    if (!resource?.id) {
      EC.toast('This resource does not have a file attached yet.', 'warning');
      return;
    }

    try {
      const blob = await EC.api.getResourceBlob(resource.id, true);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = resource.name || 'resource';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch (err) {
      EC.toast(err.message || 'Could not download resource', 'danger');
    }
  },

  bookmark(resourceId) {
    const resource = EC.studentResources.getById(resourceId);
    if (!resource) {
      EC.toast('Resource not found', 'warning');
      return;
    }

    EC.app.addBookmark({
      id: String(resource.id),
      type: 'resource',
      title: resource.name,
      icon: '&#x1F4DA;',
      ref: 'resources'
    });

    const page = document.getElementById('page-content-area');
    if (EC.state.currentRole === 'teacher') EC.teacherResources.render(page);
    else EC.studentResources.render(page);
  },

  row(resource, options = {}) {
    const { teacherMode = false } = options;
    const isBookmarked = (EC.state.bookmarks || []).find(
      (bookmark) => String(bookmark.id) === String(resource.id) && bookmark.type === 'resource'
    );

    return `
      <div style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--border-soft)">
        <div style="font-size:26px;min-width:36px;text-align:center">${EC.studentResources.typeIcon(resource.type)}</div>
        <div style="flex:1">
          <div style="font-weight:600">${resource.name}</div>
          <div style="font-size:12px;color:var(--text-muted)">${resource.type} &bull; ${resource.size || '-'} &bull; Added ${resource.uploadedAt}</div>
        </div>
        <button class="btn btn-outline btn-sm" type="button" data-resource-action="open" data-resource-id="${String(resource.id)}">Open</button>
        <button class="btn btn-outline btn-sm" type="button" data-resource-action="download" data-resource-id="${String(resource.id)}">&#x2B07; Download</button>
        <button class="btn btn-ghost btn-sm" type="button" style="padding:5px 9px;font-size:16px;color:${isBookmarked ? 'var(--warning)' : 'var(--text-muted)'}" title="${isBookmarked ? 'Already bookmarked' : 'Bookmark'}" data-resource-action="bookmark" data-resource-id="${String(resource.id)}">&#x1F516;</button>
        ${teacherMode ? `<button class="btn btn-danger btn-sm" type="button" style="padding:5px 12px" data-resource-action="delete" data-resource-id="${String(resource.id)}" title="Delete resource">Delete</button>` : ''}
      </div>
    `;
  },

  search(query) {
    const q = String(query || '').toLowerCase();
    const list = document.getElementById(EC.state.currentRole === 'teacher' ? 'res-teacher-list' : 'res-list');
    if (!list) return;

    if (!q) {
      const page = document.getElementById('page-content-area');
      if (EC.state.currentRole === 'teacher') EC.teacherResources.render(page);
      else EC.studentResources.render(page);
      return;
    }

    const filtered = (EC.state.resources || []).filter(
      (resource) => resource.name.toLowerCase().includes(q) || resource.cat.toLowerCase().includes(q)
    );

    list.innerHTML = filtered.length === 0
      ? `<div class="card" style="text-align:center;padding:32px;color:var(--text-muted)">No resources match "${query}"</div>`
      : `<div class="card animate-in">${filtered.map((resource) => EC.studentResources.row(resource, { teacherMode: EC.state.currentRole === 'teacher' })).join('')}</div>`;

    EC.studentResources.bindActions(document.getElementById('page-content-area'));
  }
};
