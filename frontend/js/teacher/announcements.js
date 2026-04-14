window.EC = window.EC || {};

EC.teacherAnnouncements = {
  render(el) {
    el.innerHTML = `
      <div class="page-header">
        <div><h2 class="page-title">Announcements</h2><p class="page-subtitle">Post updates, pin important notices and reply to students.</p></div>
        <div class="page-header-actions">
          <button class="btn btn-accent" onclick="EC.teacherAnnouncements.openCreate()">+ New Announcement</button>
        </div>
      </div>
      <div id="ann-list">${EC.state.announcements.map(a => EC.teacherAnnouncements.renderCard(a)).join('')}</div>
      ${EC.teacherAnnouncements.createModal()}
    `;
  },

  renderCard(a) {
    const comments = a.comments || [];
    return `
      <div class="card mb-16 animate-in" id="ann-${a.id}">
        <div style="padding:16px 20px;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:flex-start;gap:12px">
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
                ${a.pinned ? '<span class="tag" style="background:#fff8e6;color:#b45309">Pinned</span>' : ''}
                <div style="font-weight:700;font-size:15px">${a.title}</div>
              </div>
              <div style="font-size:12px;color:var(--text-muted)">Posted ${a.time} • ${comments.length} repl${comments.length === 1 ? 'y' : 'ies'}</div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              <button class="btn btn-ghost btn-sm" onclick="EC.teacherAnnouncements.togglePin('${a.id}')" title="${a.pinned ? 'Unpin' : 'Pin'}">${a.pinned ? '📌' : '📍'}</button>
              <button class="btn btn-danger btn-sm" onclick="EC.teacherAnnouncements.delete('${a.id}')">🗑</button>
            </div>
          </div>
        </div>
        <div style="padding:14px 20px">
          <div style="font-size:14px;color:var(--text-mid);line-height:1.6;margin-bottom:12px">${a.body}</div>
          <div style="font-weight:700;font-size:13px;margin-bottom:10px">Replies</div>
          <div style="display:flex;flex-direction:column;gap:10px">${comments.length ? comments.map(comment => EC.teacherAnnouncements.renderComment(comment, a.id)).join('') : `<div style="font-size:13px;color:var(--text-muted)">No replies yet.</div>`}</div>
          <div style="display:flex;gap:8px;margin-top:14px">
            <input class="form-input" style="flex:1" id="teacher-ann-reply-${a.id}" placeholder="Reply to the class or to a student">
            <button class="btn btn-primary btn-sm" onclick="EC.teacherAnnouncements.reply('${a.id}')">Send</button>
          </div>
        </div>
      </div>
    `;
  },

  renderComment(comment, announcementId) {
    return `
      <div style="padding:10px 12px;background:var(--surface);border-radius:10px">
        <div style="font-size:12px;font-weight:700">${comment.authorName} <span style="font-weight:400;color:var(--text-muted)">• ${comment.createdAt}</span></div>
        <div style="font-size:13px;color:var(--text-mid);margin-top:4px">${comment.text}</div>
        <button class="btn btn-ghost btn-sm" style="margin-top:6px;padding:0;color:var(--royal)" onclick="EC.teacherAnnouncements.prefillReply('${announcementId}','${comment.authorName.replace(/'/g, "\\'")}')">Reply</button>
      </div>
    `;
  },

  prefillReply(id, authorName) {
    const input = document.getElementById(`teacher-ann-reply-${id}`);
    if (!input) return;
    input.value = `@${authorName} `;
    input.focus();
  },

  async togglePin(id) {
    const announcement = EC.state.announcements.find(item => String(item.id) === String(id));
    if (!announcement) return;
    const updated = await EC.api.updateAnnouncement(id, { title: announcement.title, body: announcement.body, pinned: !announcement.pinned });
    Object.assign(announcement, updated);
    EC.teacherAnnouncements.render(document.getElementById('page-content-area'));
  },

  async delete(id) {
    await EC.api.deleteAnnouncement(id);
    EC.state.announcements = EC.state.announcements.filter(item => String(item.id) !== String(id));
    EC.teacherAnnouncements.render(document.getElementById('page-content-area'));
  },

  async reply(id) {
    const input = document.getElementById(`teacher-ann-reply-${id}`);
    const text = input?.value?.trim();
    if (!text) return;
    const updated = await EC.api.addAnnouncementComment(id, text);
    const announcement = EC.state.announcements.find(item => String(item.id) === String(id));
    if (announcement) Object.assign(announcement, updated);
    input.value = '';
    EC.teacherAnnouncements.render(document.getElementById('page-content-area'));
  },

  createModal() {
    return `
      <div class="overlay" id="ann-create-modal">
        <div class="modal modal-lg">
          <div class="modal-header">
            <div class="modal-title">New Announcement</div>
            <button class="modal-close" onclick="document.getElementById('ann-create-modal').classList.remove('open')">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group"><label class="form-label">Title</label><input class="form-input" id="ann-title"></div>
            <div class="form-group"><label class="form-label">Content</label><textarea class="form-textarea" id="ann-body" style="min-height:120px"></textarea></div>
            <div style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="ann-pin"><label for="ann-pin">Pin this announcement</label></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="document.getElementById('ann-create-modal').classList.remove('open')">Cancel</button>
            <button class="btn btn-accent" onclick="EC.teacherAnnouncements.post()">Post</button>
          </div>
        </div>
      </div>
    `;
  },

  openCreate() {
    document.getElementById('ann-create-modal')?.classList.add('open');
  },

  async post() {
    const title = document.getElementById('ann-title')?.value?.trim();
    const body = document.getElementById('ann-body')?.value?.trim();
    if (!title || !body) {
      EC.toast('Please fill in title and content', 'danger');
      return;
    }
    const created = await EC.api.createAnnouncement({ title, body, pinned: document.getElementById('ann-pin')?.checked || false });
    EC.state.announcements.unshift(created);
    document.getElementById('ann-create-modal')?.classList.remove('open');
    EC.teacherAnnouncements.render(document.getElementById('page-content-area'));
  }
};
