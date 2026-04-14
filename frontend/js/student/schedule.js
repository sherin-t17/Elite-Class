window.EC = window.EC || {};

EC.studentSchedule = {
  days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],

  load() {
    EC.loadSchedules();
    return EC.state.schedules || [];
  },

  toDayView() {
    const entries = EC.studentSchedule.load();
    return EC.studentSchedule.days.map(day => ({
      day,
      slots: entries
        .filter(entry => entry.day === day)
        .sort((a, b) => EC.teacherSchedule.toMinutes(a.time) - EC.teacherSchedule.toMinutes(b.time))
        .map(entry => ({
          time: entry.time,
          sub: entry.subject,
          type: entry.type,
          room: entry.room
        }))
    }));
  },

  render(el) {
    const schedule = EC.studentSchedule.toDayView();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];

    el.innerHTML = `
      <div class="page-header"><div><h2 class="page-title">Schedule</h2><p class="page-subtitle">Your weekly timetable</p></div></div>
      <div class="filter-bar animate-in">
        ${schedule.map(day => `<button class="filter-btn ${day.day === today ? 'active' : ''}" onclick="EC.studentSchedule.showDay(this,'${day.day}')">${day.day.slice(0, 3)}</button>`).join('')}
      </div>
      <div id="schedule-day-view" class="animate-in animate-in-delay-1"></div>
    `;

    EC.studentSchedule.renderDay(schedule.find(day => day.day === today) || schedule[0]);
  },

  renderDay(dayData) {
    const el = document.getElementById('schedule-day-view');
    if (!el || !dayData) return;

    el.innerHTML = `
      <div class="card">
        <div class="card-header"><div class="card-title">&#x1F4C5; ${dayData.day}</div><span class="tag cat">${dayData.slots.length} classes</span></div>
        <div class="card-body">
          ${dayData.slots.length === 0
            ? `<div style="font-size:13px;color:var(--text-muted)">No classes scheduled for this day.</div>`
            : dayData.slots.map(slot => `
                <div class="slot-card">
                  <div class="slot-time">${slot.time}</div>
                  <div class="slot-subject">${slot.sub}</div>
                  <div style="font-size:12px;color:var(--text-muted)">${slot.room || 'TBD'}</div>
                  <span class="slot-type ${slot.type}">${slot.type.charAt(0).toUpperCase() + slot.type.slice(1)}</span>
                </div>
              `).join('')}
        </div>
      </div>
    `;
  },

  showDay(btn, dayName) {
    document.querySelectorAll('.filter-btn').forEach(button => button.classList.remove('active'));
    btn.classList.add('active');
    const day = EC.studentSchedule.toDayView().find(entry => entry.day === dayName);
    EC.studentSchedule.renderDay(day);
  }
};
