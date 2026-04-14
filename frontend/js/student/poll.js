window.EC = window.EC || {};

EC.studentPoll = {
  myVoteIndex(poll) {
    const myId = String(EC.state.myId || EC.state.currentUser?.id || '');
    return (poll.options || []).findIndex(option => (option.votes || []).map(String).includes(myId));
  },

  totalVotes(poll) {
    return (poll.options || []).reduce((sum, option) => sum + Number(option.voteCount || option.votes?.length || 0), 0);
  },

  render(el) {
    const polls = EC.state.polls || [];
    el.innerHTML = `
      <div class="page-header">
        <div><h2 class="page-title">Polls</h2><p class="page-subtitle">Vote once and change your choice anytime before the poll closes.</p></div>
      </div>
      ${polls.length === 0 ? `<div class="card" style="padding:28px;text-align:center;color:var(--text-muted)">No polls available right now.</div>` : ''}
      ${polls.map(poll => EC.studentPoll.renderCard(poll)).join('')}
    `;
  },

  renderCard(poll) {
    const selectedIndex = EC.studentPoll.myVoteIndex(poll);
    const totalVotes = EC.studentPoll.totalVotes(poll);

    return `
      <div class="card mb-16 animate-in">
        <div class="card-header">
          <div class="card-title">${poll.question}</div>
          <span class="tag ${poll.active ? 'status-done' : 'status-pending'}">${poll.active ? 'Active' : 'Closed'}</span>
        </div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:10px">
          ${(poll.options || []).map((option, index) => {
            const count = Number(option.voteCount || option.votes?.length || 0);
            const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
            const isSelected = selectedIndex === index;
            const showResults = !poll.active || selectedIndex !== -1;

            return `
              <button
                class="poll-option"
                type="button"
                onclick="EC.studentPoll.vote('${poll.id}', ${index})"
                ${poll.active ? '' : 'disabled'}
                style="text-align:left;position:relative;overflow:hidden;border:${isSelected ? '1px solid var(--royal)' : '1px solid var(--border-soft)'};background:${isSelected ? 'rgba(26,58,143,0.08)' : 'var(--surface)'}"
              >
                ${showResults ? `<div class="poll-bar" style="width:${pct}%"></div>` : ''}
                <div style="position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%">
                  <span style="font-weight:600;font-size:14px">${isSelected ? '&#x25C9;' : '&#x25CB;'} ${option.text}</span>
                  <span class="poll-pct">${showResults ? `${pct}% (${count})` : ''}</span>
                </div>
              </button>
            `;
          }).join('')}
          <div style="font-size:12px;color:var(--text-muted)">
            ${totalVotes} total vote${totalVotes === 1 ? '' : 's'} &bull; Created ${poll.createdAt}${selectedIndex !== -1 ? ' &bull; Your vote is saved' : ''}
          </div>
        </div>
      </div>
    `;
  },

  async vote(id, optionIndex) {
    try {
      const updated = await EC.api.votePoll(id, optionIndex);
      const index = (EC.state.polls || []).findIndex(item => String(item.id) === String(id));
      if (index >= 0) EC.state.polls[index] = updated;
      EC.studentPoll.render(document.getElementById('page-content-area'));
    } catch (err) {
      EC.toast(err.message || 'Could not submit vote', 'danger');
    }
  }
};
