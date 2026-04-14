window.EC = window.EC || {};

EC.teacherPoll = {
  totalVotes(poll) {
    return (poll.options || []).reduce((sum, option) => sum + Number(option.voteCount || option.votes?.length || 0), 0);
  },

  render(el) {
    const polls = EC.state.polls || [];
    el.innerHTML = `
      <div class="page-header">
        <div><h2 class="page-title">Polls</h2><p class="page-subtitle">Create class polls and track live answers.</p></div>
        <button class="btn btn-accent" onclick="EC.teacherPoll.openCreate()">+ Create Poll</button>
      </div>
      ${polls.length === 0 ? `<div class="card" style="padding:28px;text-align:center;color:var(--text-muted)">No polls created yet.</div>` : ''}
      ${polls.map(poll => `
        <div class="card mb-16 animate-in">
          <div class="card-header">
            <div class="card-title">${poll.question}</div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <span class="tag ${poll.active ? 'status-done' : 'status-pending'}">${poll.active ? 'Active' : 'Closed'}</span>
              ${poll.active ? `<button class="btn btn-outline btn-sm" onclick="EC.teacherPoll.closePoll('${poll.id}')">Close</button>` : ''}
              <button class="btn btn-danger btn-sm" onclick="EC.teacherPoll.deletePoll('${poll.id}')">Delete</button>
            </div>
          </div>
          <div class="card-body">
            ${(poll.options || []).map(option => {
              const total = EC.teacherPoll.totalVotes(poll);
              const count = Number(option.voteCount || option.votes?.length || 0);
              const pct = total ? Math.round((count / total) * 100) : 0;
              return `<div class="poll-option"><div class="poll-bar" style="width:${pct}%"></div><span style="position:relative;font-weight:600;font-size:14px">${option.text}</span><span class="poll-pct">${pct}% (${count})</span></div>`;
            }).join('')}
            <div style="font-size:12px;color:var(--text-muted);margin-top:8px">${EC.teacherPoll.totalVotes(poll)} total votes &bull; Created ${poll.createdAt}</div>
          </div>
        </div>
      `).join('')}
      <div class="overlay" id="create-poll-overlay">
        <div class="modal modal-sm">
          <div class="modal-header"><div class="modal-title">Create Poll</div><button class="modal-close" onclick="EC.teacherPoll.closeCreate()">&times;</button></div>
          <div class="modal-body">
            <div class="form-group"><label class="form-label">Question</label><input class="form-input" id="poll-question" placeholder="Ask the class anything..."></div>
            <div class="form-group"><label class="form-label">Options</label><div id="poll-options"><input class="form-input mb-8" placeholder="Option 1"><input class="form-input mb-8" placeholder="Option 2"><input class="form-input mb-8" placeholder="Option 3"></div><button class="btn btn-ghost btn-sm" onclick="EC.teacherPoll.addOption()">+ Add option</button></div>
          </div>
          <div class="modal-footer"><button class="btn btn-outline" onclick="EC.teacherPoll.closeCreate()">Cancel</button><button class="btn btn-accent" onclick="EC.teacherPoll.createPoll()">Post Poll</button></div>
        </div>
      </div>
    `;
  },

  openCreate() {
    document.getElementById('create-poll-overlay')?.classList.add('open');
  },

  closeCreate() {
    document.getElementById('create-poll-overlay')?.classList.remove('open');
  },

  addOption() {
    const container = document.getElementById('poll-options');
    if (!container) return;
    const input = document.createElement('input');
    input.className = 'form-input mb-8';
    input.placeholder = `Option ${container.children.length + 1}`;
    container.appendChild(input);
  },

  async createPoll() {
    const question = document.getElementById('poll-question')?.value?.trim();
    const options = Array.from(document.querySelectorAll('#poll-options input')).map(input => input.value.trim()).filter(Boolean);

    if (!question || options.length < 2) {
      EC.toast('Enter a question and at least 2 options', 'danger');
      return;
    }

    try {
      const created = await EC.api.createPoll({ question, options });
      EC.state.polls.unshift(created);
      EC.teacherPoll.closeCreate();
      EC.teacherPoll.render(document.getElementById('page-content-area'));
    } catch (err) {
      EC.toast(err.message || 'Could not create poll', 'danger');
    }
  },

  async closePoll(id) {
    try {
      const updated = await EC.api.closePoll(id);
      const poll = EC.state.polls.find(item => String(item.id) === String(id));
      if (poll) Object.assign(poll, updated);
      EC.teacherPoll.render(document.getElementById('page-content-area'));
    } catch (err) {
      EC.toast(err.message || 'Could not close poll', 'danger');
    }
  },

  async deletePoll(id) {
    if (!confirm('Delete this poll? This cannot be undone.')) return;
    try {
      await EC.api.deletePoll(id);
      EC.state.polls = (EC.state.polls || []).filter(item => String(item.id) !== String(id));
      EC.toast('Poll deleted', 'default', 1800);
      EC.teacherPoll.render(document.getElementById('page-content-area'));
    } catch (err) {
      EC.toast(err.message || 'Could not delete poll', 'danger');
    }
  }
};
