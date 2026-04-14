/* ============================================================
   TEACHER SQUAD
   ============================================================ */
window.EC = window.EC || {};

EC.teacherSquad = {
  _editId: null,

  formatSquadId(id) {
    return `'${String(id).replace(/'/g, "\\'")}'`;
  },

  render(el) {
    el.innerHTML = `
      <div class="page-header">
        <div><h2 class="page-title">Squad Manager</h2><p class="page-subtitle">Group students into squads for team competition</p></div>
        <button class="btn btn-accent" onclick="EC.teacherSquad.openCreate()">+ New Squad</button>
      </div>
      <div id="squad-list" class="two-col animate-in"></div>
      ${EC.teacherSquad.createModal()}
      ${EC.teacherSquad.editModal()}
    `;
    EC.teacherSquad.renderList();
  },

  renderList() {
    const el = document.getElementById('squad-list');
    if (!el) return;

    if (!EC.state.squads.length) {
      el.innerHTML = `<div class="card" style="text-align:center;padding:48px;grid-column:1/-1"><div style="font-size:48px;margin-bottom:12px">Teams</div><div style="font-weight:700;font-size:18px;margin-bottom:8px">No squads yet</div><div style="color:var(--text-muted)">Create your first squad to get started</div></div>`;
      return;
    }

    el.innerHTML = EC.state.squads.map(squad => `
      <div class="squad-card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div class="squad-name">${squad.name}</div>
          <div class="tag" style="background:rgba(255,201,38,0.15);color:var(--accent);border:1px solid rgba(255,201,38,0.3)">Rank #${squad.rank}</div>
        </div>
        <div class="squad-members">
          ${squad.members.map(memberId => {
            const student = EC.getStudent(memberId);
            return student ? `<div class="squad-member-avatar" title="${student.name}" style="background:${student.color}">${student.initials}</div>` : '';
          }).join('')}
        </div>
        <div style="margin:10px 0">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:4px"><span>Combined XP</span><span>${Number(squad.totalXp || 0).toLocaleString()}</span></div>
          <div style="height:4px;background:rgba(255,255,255,0.1);border-radius:99px"><div style="height:100%;width:${Math.min((Number(squad.totalXp || 0) / 8000) * 100, 100)}%;background:var(--accent);border-radius:99px"></div></div>
        </div>
        <div style="margin-top:6px;font-size:12px;color:rgba(255,255,255,0.45)">${squad.members.length} members</div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-outline btn-sm" style="border-color:rgba(255,255,255,0.2);color:rgba(255,255,255,0.6)" onclick="EC.teacherSquad.confirmDisband(${EC.teacherSquad.formatSquadId(squad.id)})">Disband</button>
          <button class="btn btn-accent btn-sm" style="flex:1" onclick="EC.teacherSquad.openEdit(${EC.teacherSquad.formatSquadId(squad.id)})">Edit Squad</button>
        </div>
      </div>
    `).join('');
  },

  memberCheckboxes(selectedMembers = []) {
    return EC.state.students.map(student => `
      <label style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--surface);border-radius:var(--radius-sm);margin-bottom:6px;cursor:pointer">
        <input type="checkbox" class="${selectedMembers.length ? 'sq-edit-cb' : 'sq-member-cb'}" value="${student.id}" style="width:16px;height:16px" ${selectedMembers.some(memberId => String(memberId) === String(student.id)) ? 'checked' : ''}>
        <div class="avatar avatar-sm" style="background:${student.color}">${student.initials}</div>
        <div>
          <div style="font-weight:600;font-size:13px">${student.name}</div>
          <div style="font-size:11px;color:var(--text-muted)">${student.level} - ${student.xp} XP</div>
        </div>
      </label>
    `).join('');
  },

  createModal() {
    return `
      <div class="overlay" id="squad-create-overlay" style="z-index:210">
        <div class="modal">
          <div class="modal-header">
            <div class="modal-title">Create Squad</div>
            <button class="modal-close" onclick="EC.teacherSquad.closeCreate()">x</button>
          </div>
          <div class="modal-body" style="max-height:60vh;overflow-y:auto">
            <div class="form-group"><label class="form-label">Squad Name *</label><input class="form-input" id="sq-name" placeholder="e.g. Alpha Squad"></div>
            <div class="form-group"><label class="form-label">Select Members (2-5)</label>
              <div id="sq-members-create">${EC.teacherSquad.memberCheckboxes()}</div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="EC.teacherSquad.closeCreate()">Cancel</button>
            <button class="btn btn-accent" onclick="EC.teacherSquad.create()">Create Squad</button>
          </div>
        </div>
      </div>
    `;
  },

  editModal() {
    return `
      <div class="overlay" id="squad-edit-overlay" style="z-index:210">
        <div class="modal">
          <div class="modal-header">
            <div class="modal-title">Edit Squad</div>
            <button class="modal-close" onclick="EC.teacherSquad.closeEdit()">x</button>
          </div>
          <div class="modal-body" style="max-height:60vh;overflow-y:auto">
            <div class="form-group"><label class="form-label">Squad Name *</label><input class="form-input" id="sq-edit-name" placeholder="Squad name"></div>
            <div class="form-group"><label class="form-label">Select Members</label>
              <div id="sq-members-edit"></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="EC.teacherSquad.closeEdit()">Cancel</button>
            <button class="btn btn-accent" onclick="EC.teacherSquad.saveEdit()">Save Changes</button>
          </div>
        </div>
      </div>
    `;
  },

  openCreate() {
    document.getElementById('squad-create-overlay')?.classList.add('open');
  },

  closeCreate() {
    document.getElementById('squad-create-overlay')?.classList.remove('open');
  },

  openEdit(id) {
    EC.teacherSquad._editId = String(id);
    const squad = EC.state.squads.find(entry => String(entry.id) === String(id));
    if (!squad) return;

    const nameInput = document.getElementById('sq-edit-name');
    if (nameInput) nameInput.value = squad.name;

    const container = document.getElementById('sq-members-edit');
    if (container) container.innerHTML = EC.teacherSquad.memberCheckboxes(squad.members);

    document.getElementById('squad-edit-overlay')?.classList.add('open');
  },

  closeEdit() {
    document.getElementById('squad-edit-overlay')?.classList.remove('open');
  },

  selectedMembers(selector) {
    return Array.from(document.querySelectorAll(selector))
      .map(checkbox => checkbox.value.trim())
      .filter(Boolean);
  },

  async saveEdit() {
    const squad = EC.state.squads.find(entry => String(entry.id) === String(EC.teacherSquad._editId));
    if (!squad) return;

    const name = document.getElementById('sq-edit-name')?.value?.trim();
    if (!name) {
      EC.toast('Enter a squad name', 'danger');
      return;
    }

    const members = EC.teacherSquad.selectedMembers('.sq-edit-cb:checked');
    if (members.length < 2) {
      EC.toast('Select at least 2 members', 'danger');
      return;
    }

    try {
      const updated = await EC.api.updateSquad(squad.id, { name, members });
      Object.assign(squad, updated);
      EC.teacherSquad.closeEdit();
      EC.toast(`Squad "${name}" updated!`, 'success');
      EC.teacherSquad.renderList();
    } catch (err) {
      EC.toast(err.message || 'Could not update squad', 'danger');
    }
  },

  async create() {
    const name = document.getElementById('sq-name')?.value?.trim();
    if (!name) {
      EC.toast('Enter a squad name', 'danger');
      return;
    }

    const members = EC.teacherSquad.selectedMembers('.sq-member-cb:checked');
    if (members.length < 2) {
      EC.toast('Select at least 2 members', 'danger');
      return;
    }

    try {
      const created = await EC.api.createSquad({ name, members });
      EC.state.squads.push(created);
      EC.teacherSquad.closeCreate();
      EC.toast(`Squad "${name}" created!`, 'success');
      EC.teacherSquad.renderList();
    } catch (err) {
      EC.toast(err.message || 'Could not create squad', 'danger');
    }
  },

  async confirmDisband(id) {
    const squad = EC.state.squads.find(entry => String(entry.id) === String(id));
    if (!squad) return;

    if (confirm(`Disband "${squad.name}"? This cannot be undone.`)) {
      try {
        await EC.api.deleteSquad(id);
        EC.state.squads = EC.state.squads.filter(entry => String(entry.id) !== String(id));
        EC.toast('Squad disbanded.', 'warning');
        EC.teacherSquad.renderList();
      } catch (err) {
        EC.toast(err.message || 'Could not delete squad', 'danger');
      }
    }
  }
};
