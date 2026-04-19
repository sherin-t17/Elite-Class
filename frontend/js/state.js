window.EC = window.EC || {};

EC.state = {
  currentUser: null,
  currentRole: null,
  authToken: null,
  currentPage: 'dashboard',
  sidebarOpen: false,
  soundEnabled: true,
  students: [],
  tasks: [],
  announcements: [],
  attendance: {
    date: new Date().toDateString(),
    records: []
  },
  leaveRequests: [],
  badges: [],
  season: {
    number: 0,
    name: 'Season data unavailable',
    endsIn: 0,
    currentMilestone: 0,
    milestones: []
  },
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
  myId: null,
  myXp: 0,
  myLevel: '',
  myRank: 0,
  myStreak: 0,
  myBadgeShowcase: [],
  _lastFullBootstrap: 0,
  chatMessagesByContext: {},
  notifications: {
    counts: {},
    seen: {}
  }
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

EC.getStudentByName = (name) => EC.state.students.find(student => student.name === name);

EC.levelFromXp = (xp) => {
  if (xp >= 2000) return 'Legend';
  if (xp >= 1500) return 'Elite';
  if (xp >= 1000) return 'Scholar';
  if (xp >= 500) return 'Rookie';
  return 'Initiate';
};

EC.xpToNextLevel = (xp) => {
  const thresholds = [500, 1000, 1500, 2000, 3000];
  const next = thresholds.find(value => value > xp) || 3000;
  const prev = thresholds[thresholds.indexOf(next) - 1] || 0;
  return {
    current: xp - prev,
    total: next - prev,
    pct: Math.round(((xp - prev) / (next - prev)) * 100)
  };
};
