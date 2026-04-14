/* ============================================================
   TEACHER SCHEDULE — with Edit option per entry
   ============================================================ */
window.EC = window.EC || {};

EC.teacherSchedule = {
  days: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],

  render(el) {
    EC.loadSchedules();

    el.innerHTML = `
      <div class="page-header">
        <div><h2 class="page-title">📅 Schedule Manager</h2><p class="page-subtitle">Post and manage the class timetable</p></div>
        <div class="page-header-actions">
          <button class="btn btn-accent" onclick="EC.teacherSchedule.openAdd()">+ Add Entry</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
        ${EC.teacherSchedule.days.map(day => {
          const entries = EC.state.schedules.filter(s => s.day === day).sort((a,b) => EC.teacherSchedule.toMinutes(a.time) - EC.teacherSchedule.toMinutes(b.time));
          return `
            <div class="card animate-in">
              <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
                <div style="font-weight:700;font-size:15px">${day}</div>
                <span class="tag" style="background:var(--royal-soft);color:var(--royal)">${entries.length} class${entries.length !== 1 ? 'es' : ''}</span>
              </div>
              <div style="padding:8px 0">
                ${entries.length === 0
                  ? `<div style="padding:12px 16px;font-size:13px;color:var(--text-muted)">No classes scheduled</div>`
                  : entries.map(e => `
                    <div style="padding:10px 16px;border-bottom:1px solid var(--border-soft)">
                      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                        <div style="background:${EC.teacherSchedule._typeColor(e.type)};color:#fff;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;flex-shrink:0">${e.time}</div>
                        <div style="flex:1;font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.subject}</div>
                      </div>
                      <div style="display:flex;align-items:center;justify-content:space-between">
                        <div style="font-size:11px;color:var(--text-muted)">📍 ${e.room}</div>
                        <div style="display:flex;gap:4px">
                          <button class="btn btn-ghost btn-sm" style="padding:3px 7px;font-size:12px" onclick="EC.teacherSchedule.openEdit(${e.id})">✏️</button>
                          <button class="btn btn-ghost btn-sm" style="padding:3px 7px;font-size:12px;color:var(--danger)" onclick="EC.teacherSchedule.deleteEntry(${e.id})">🗑</button>
                        </div>
                      </div>
                    </div>
                  `).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
      ${EC.teacherSchedule.addModal()}
      ${EC.teacherSchedule.editEntryModal()}
    `;
  },

  _typeColor(type) {
    return { lecture:'#1a3a8f', lab:'#059669', seminar:'#d97706', exam:'#dc2626' }[type] || '#6b7aab';
  },

  toMinutes(time12) {
    if (!time12) return 0;
    const [timePart, period = 'AM'] = String(time12).trim().split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
    return (hours * 60) + (minutes || 0);
  },

  addModal() {
    return `
      <div class="overlay" id="schedule-add-modal" style="z-index:210">
        <div class="modal" style="max-width:480px">
          <div class="modal-header">
            <div class="modal-title">Add Schedule Entry</div>
            <button class="modal-close" onclick="document.getElementById('schedule-add-modal').classList.remove('open')">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group"><label class="form-label">Day</label><select class="form-select" id="sch-day"><option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option><option>Saturday</option></select></div>
            <div class="form-group"><label class="form-label">Time</label><input class="form-input" id="sch-time" type="time"></div>
            <div class="form-group"><label class="form-label">Subject *</label><input class="form-input" id="sch-subject" placeholder="e.g. Database Management"></div>
            <div class="form-group"><label class="form-label">Room / Location</label><input class="form-input" id="sch-room" placeholder="e.g. Lab 3, Hall A"></div>
            <div class="form-group"><label class="form-label">Type</label><select class="form-select" id="sch-type"><option value="lecture">Lecture</option><option value="lab">Lab</option><option value="seminar">Seminar</option><option value="exam">Exam</option></select></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="document.getElementById('schedule-add-modal').classList.remove('open')">Cancel</button>
            <button class="btn btn-accent" onclick="EC.teacherSchedule.addEntry()">Add Entry</button>
          </div>
        </div>
      </div>
    `;
  },

  editEntryModal() {
    return `
      <div class="overlay" id="schedule-edit-modal" style="z-index:210">
        <div class="modal" style="max-width:480px">
          <div class="modal-header">
            <div class="modal-title">✏️ Edit Schedule Entry</div>
            <button class="modal-close" onclick="document.getElementById('schedule-edit-modal').classList.remove('open')">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group"><label class="form-label">Day</label><select class="form-select" id="sch-edit-day"><option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option><option>Saturday</option></select></div>
            <div class="form-group"><label class="form-label">Time</label><input class="form-input" id="sch-edit-time" type="time"></div>
            <div class="form-group"><label class="form-label">Subject *</label><input class="form-input" id="sch-edit-subject" placeholder="e.g. Database Management"></div>
            <div class="form-group"><label class="form-label">Room / Location</label><input class="form-input" id="sch-edit-room" placeholder="e.g. Lab 3, Hall A"></div>
            <div class="form-group"><label class="form-label">Type</label><select class="form-select" id="sch-edit-type"><option value="lecture">Lecture</option><option value="lab">Lab</option><option value="seminar">Seminar</option><option value="exam">Exam</option></select></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="document.getElementById('schedule-edit-modal').classList.remove('open')">Cancel</button>
            <button class="btn btn-accent" onclick="EC.teacherSchedule.saveEdit()">Save Changes</button>
          </div>
        </div>
      </div>
    `;
  },

  _editEntryId: null,

  openAdd() { document.getElementById('schedule-add-modal')?.classList.add('open'); },

  openEdit(id) {
    EC.teacherSchedule._editEntryId = id;
    const e = EC.state.schedules.find(s => s.id === id);
    if (!e) return;
    document.getElementById('sch-edit-day').value     = e.day;
    document.getElementById('sch-edit-subject').value = e.subject;
    document.getElementById('sch-edit-room').value    = e.room;
    document.getElementById('sch-edit-type').value    = e.type;
    // Convert 12h time to HH:MM for input
    const t12 = e.time;
    const [timePart, period] = t12.split(' ');
    let [h, m] = timePart.split(':').map(Number);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    document.getElementById('sch-edit-time').value = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    document.getElementById('schedule-edit-modal')?.classList.add('open');
  },

  saveEdit() {
    const id = EC.teacherSchedule._editEntryId;
    const e  = EC.state.schedules.find(s => s.id === id);
    if (!e) return;
    const subject = document.getElementById('sch-edit-subject')?.value?.trim();
    const time    = document.getElementById('sch-edit-time')?.value;
    if (!subject || !time) { EC.toast('Please fill required fields', 'danger'); return; }
    const t12 = new Date('1970-01-01T' + time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    e.day     = document.getElementById('sch-edit-day').value;
    e.time    = t12;
    e.subject = subject;
    e.room    = document.getElementById('sch-edit-room')?.value?.trim() || 'TBD';
    e.type    = document.getElementById('sch-edit-type').value;
    EC.persistSchedules();
    document.getElementById('schedule-edit-modal')?.classList.remove('open');
    EC.toast('Schedule entry updated.', 'success');
    EC.teacherSchedule.render(document.getElementById('page-content-area'));
  },

  addEntry() {
    const subject = document.getElementById('sch-subject')?.value?.trim();
    const time    = document.getElementById('sch-time')?.value;
    if (!subject || !time) { EC.toast('Please fill in required fields', 'danger'); return; }
    const t12 = new Date('1970-01-01T' + time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    EC.state.schedules.push({
      id: Date.now(),
      day:     document.getElementById('sch-day')?.value,
      time:    t12,
      subject,
      room:    document.getElementById('sch-room')?.value?.trim() || 'TBD',
      type:    document.getElementById('sch-type')?.value,
    });
    EC.persistSchedules();
    document.getElementById('schedule-add-modal')?.classList.remove('open');
    EC.toast('Schedule entry added.', 'success');
    EC.teacherSchedule.render(document.getElementById('page-content-area'));
  },

  deleteEntry(id) {
    EC.state.schedules = EC.state.schedules.filter(s => s.id !== id);
    EC.persistSchedules();
    EC.toast('Entry deleted', 'default', 1500);
    EC.teacherSchedule.render(document.getElementById('page-content-area'));
  },
};
