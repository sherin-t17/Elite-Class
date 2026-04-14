/* ============================================================
   ELITE CLASS - GLOBAL STATE MANAGEMENT
   Central store for all app data
   ============================================================ */

window.EC = window.EC || {};

EC.state = {
  // Auth
  currentUser: null,
  currentRole: null, // 'teacher' | 'student'
  authToken: null,

  // Navigation
  currentPage: 'dashboard',
  sidebarOpen: false,

  // Sound
  soundEnabled: true,

  // Data
  students: [],
  tasks: [],
  announcements: [],
  attendance: {
    date: new Date().toDateString(),
    records: []
  },
  leaveRequests: [],
  badges: [],
  dailyMissions: [],
  season: {
    number: 0,
    name: 'Season data unavailable',
    endsIn: 0,
    currentMilestone: 0,
    milestones: []
  },
  squads: [],
  polls: [],
  monthTaskBatches: [],
  monthTasks: [],
  monthTaskSubmissions: [],
  monthTaskStats: [],
  monthTaskWarnings: [],
  bookmarks: [],
  resources: [],
  schedules: [],

  examDays: null,
  nextExam: '',

  // Student-specific
  myId: null,
  myXp: 0,
  myLevel: '',
  myRank: 0,
  myStreak: 0,
  myBadgeShowcase: []
};

EC.defaultSchedules = [];

EC.scheduleStorageKey = () => 'ec_shared_schedule';

EC.loadSchedules = () => {
  try {
    const raw = localStorage.getItem(EC.scheduleStorageKey());
    const parsed = raw ? JSON.parse(raw) : null;
    EC.state.schedules = Array.isArray(parsed) && parsed.length
      ? parsed
      : EC.defaultSchedules.map(entry => ({ ...entry }));
  } catch (error) {
    EC.state.schedules = [];
  }
  return EC.state.schedules;
};

EC.persistSchedules = () => {
  localStorage.setItem(EC.scheduleStorageKey(), JSON.stringify(EC.state.schedules || []));
};

EC.getStudent = (id) => {
  if (id === null || id === undefined) return undefined;
  return EC.state.students.find(student => String(student.id) === String(id));
};
EC.getStudentByName = (name) => EC.state.students.find(s => s.name === name);

EC.levelFromXp = (xp) => {
  if (xp >= 2000) return 'Legend';
  if (xp >= 1500) return 'Elite';
  if (xp >= 1000) return 'Scholar';
  if (xp >= 500) return 'Rookie';
  return 'Initiate';
};

EC.xpToNextLevel = (xp) => {
  const thresholds = [500, 1000, 1500, 2000, 3000];
  const next = thresholds.find(t => t > xp) || 3000;
  const prev = thresholds[thresholds.indexOf(next) - 1] || 0;
  return {
    current: xp - prev,
    total: next - prev,
    pct: Math.round(((xp - prev) / (next - prev)) * 100)
  };
};

EC.heroRoles = {
  tank: { icon: '🛡️', name: 'Tank', desc: 'Highest attendance', color: 'var(--tank-color)' },
  fighter: { icon: '⚔️', name: 'Fighter', desc: 'Most tasks submitted', color: 'var(--fighter-color)' },
  mage: { icon: '🧙', name: 'Mage', desc: 'Highest average grade', color: 'var(--mage-color)' },
  marksman: { icon: '🏹', name: 'Marksman', desc: 'Most consistent', color: 'var(--marksman-color)' },
  assassin: { icon: '🗡️', name: 'Assassin', desc: 'Fastest submissions', color: 'var(--assassin-color)' },
  support: { icon: '💚', name: 'Support', desc: 'Most helpful', color: 'var(--support-color)' },
  guardian: { icon: '🔮', name: 'Guardian', desc: 'Best streaks', color: 'var(--guardian-color)' },
  sage: { icon: '📖', name: 'Sage', desc: 'Most resources used', color: 'var(--sage-color)' }
};
