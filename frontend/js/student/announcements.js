window.EC = window.EC || {};

EC.studentAnnouncements = {
  seenIds: new Set(),

  render(el) {
    const pinned = EC.state.announcements.filter(a => a.pinned);
    const unpinned = EC.state.announcements.filter(a => !a.pinned);
    el.innerHTML = `
      <div class="page-header">
        <div><h2 class="page-title">Announcements</h2><p class="page-subtitle">Updates from your teacher.</p></div>
      </div>
      ${pinned.map(a => EC.studentAnnouncements.renderCard(a)).join('')}
      ${unpinned.map(a => EC.studentAnnouncements.renderCard(a)).join('')}
    `;
  },

  renderCard(a) {
    const isSeen = EC.studentAnnouncements.seenIds.has(a.id);
    const comments = a.comments || [];
    return `
      <div class="card mb-12 animate-in" style="${a.pinned ? 'border-left:3px solid var(--accent)' : ''}">
        <div style="padding:14px 20px;border-bottom:1px solid var(--border)" onclick="EC.studentAnnouncements.markSeen('${a.id}')">
          <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:4px">
            ${a.pinned ? '<span class="tag" style="background:#fff8e6;color:#b45309;flex-shrink:0">&#x1F4CC;</span>' : ''}
            <div style="font-weight:700;flex:1">${a.title}</div>
            ${!isSeen ? '<span style="width:8px;height:8px;background:var(--royal);border-radius:50%;flex-shrink:0;margin-top:6px"></span>' : ''}
            <button class="btn btn-ghost btn-sm" style="padding:2px 6px" onclick="event.stopPropagation();EC.app.addBookmark({id:${JSON.stringify(String(a.id))},type:'announcement',title:'${a.title.replace(/'/g, "\\'")}',icon:'&#x1F4E2;',ref:'announcements'})">&#x1F516;</button>
          </div>
          <div style="font-size:12px;color:var(--text-muted)">${a.time}</div>
        </div>
        <div style="padding:14px 20px">
          <div style="font-size:14px;color:var(--text-mid);line-height:1.6;margin-bottom:14px">${a.body}</div>
          <div style="font-size:13px;font-weight:700;margin-bottom:8px">Replies</div>
          <div style="display:flex;flex-direction:column;gap:10px">${comments.length ? comments.map(comment => `
            <div style="padding:10px 12px;background:var(--surface);border-radius:10px">
              <div style="font-size:12px;font-weight:700">${comment.authorName} <span style="font-weight:400;color:var(--text-muted)">&bull; ${comment.createdAt}</span></div>
              <div style="font-size:13px;color:var(--text-mid);margin-top:4px">${comment.text}</div>
            </div>
          `).join('') : `<div style="font-size:13px;color:var(--text-muted)">No replies yet.</div>`}</div>
          <div style="display:flex;gap:8px;margin-top:8px">
            <input class="form-input" style="flex:1;font-size:13px;padding:8px 12px" id="reply-${a.id}" placeholder="Write a reply...">
            <button class="btn btn-primary btn-sm" onclick="EC.studentAnnouncements.reply('${a.id}')">Send</button>
          </div>
        </div>
      </div>
    `;
  },

  markSeen(id) {
    EC.studentAnnouncements.seenIds.add(id);
  },

  async reply(id) {
    const input = document.getElementById(`reply-${id}`);
    const text = input?.value?.trim();
    if (!text) return;
    const updated = await EC.api.addAnnouncementComment(id, text);
    const announcement = EC.state.announcements.find(a => String(a.id) === String(id));
    if (announcement) Object.assign(announcement, updated);
    input.value = '';
    EC.studentAnnouncements.render(document.getElementById('page-content-area'));
  }
};
