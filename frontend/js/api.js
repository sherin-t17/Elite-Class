/* ============================================================
   ELITE CLASS - API LAYER
   ============================================================ */

window.EC = window.EC || {};

const BACKEND_ENABLED = true;
const API_PORT = '5050';
const API_HOST = window.location.protocol === 'file:'
  ? 'localhost'
  : (window.location.hostname || 'localhost');
const API_PROTOCOL = window.location.protocol === 'file:'
  ? 'http:'
  : window.location.protocol;
const API_BASE_CANDIDATES = Array.from(new Set([
  ...(window.location.protocol === 'file:' ? [] : ['/api']),
  ...(window.location.protocol === 'file:' ? [] : [`${window.location.origin}/api`]),
  `${API_PROTOCOL}//${API_HOST}:${API_PORT}/api`,
  `${API_PROTOCOL}//localhost:${API_PORT}/api`,
  `${API_PROTOCOL}//127.0.0.1:${API_PORT}/api`,
  `http://localhost:${API_PORT}/api`,
  `http://127.0.0.1:${API_PORT}/api`
]));


const formatShortDate = (value) => {
  if (!value) return 'TBD';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
};

const formatDateTime = (value) => {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatRelativeTime = (value) => {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDateTime(value);
};

const initialsFromName = (name) =>
  (name || 'User')
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const normalizeBadge = (badge) => ({
  id: badge?._id || badge?.id,
  icon: badge?.icon || '🎖️',
  name: badge?.name || 'Badge',
  desc: badge?.desc || '',
  rarity: badge?.rarity || 'common',
  condition: badge?.condition || '',
  unlocked: true
});

const mergeBadgesIntoState = (badgeEntries = []) => {
  const normalized = badgeEntries.filter(entry => entry && typeof entry === 'object').map(normalizeBadge);
  normalized.forEach(badge => {
    const idx = EC.state.badges.findIndex(entry => String(entry.id) === String(badge.id));
    if (idx >= 0) EC.state.badges[idx] = { ...EC.state.badges[idx], ...badge, unlocked: true };
    else EC.state.badges.push(badge);
  });
};

const normalizeStudent = (student, index = 0) => {
  const xp = Number(student?.xp || 0);
  const rank = Number(student?.rank || 0) || index + 1;
  return {
    id: student?._id || student?.id,
    name: student?.name || 'Student',
    initials: student?.initials || initialsFromName(student?.name),
    level: student?.level || EC.levelFromXp(xp),
    xp,
    rank,
    streak: Number(student?.streak || 0),
    tasks: Number(student?.tasksCompleted || student?.tasks || 0),
    attendance: Number(student?.attendance || 0),
    color: student?.color || '#1a3a8f',
    heroRole: student?.heroRole || 'mage',
    regNo: student?.regNo || '',
    year: student?.year || '',
    dept: student?.dept || '',
    section: student?.section || '',
    motivationQuote: student?.motivationQuote || '',
    profileImageUrl: student?.profileImageUrl || '',
    badgeShowcase: (student?.badgeShowcase || []).map(b => b?._id || b?.id || b),
    unlockedBadges: (student?.unlockedBadges || []).map(b => b?._id || b?.id || b)
  };
};

const normalizeTask = (task) => {
  const submissionStatus = task?.submission?.status;
  let status = 'pending';
  if (submissionStatus === 'graded') status = 'completed';
  else if (submissionStatus === 'submitted' || submissionStatus === 'late') status = 'submitted';
  else if (submissionStatus === 'redo') status = 'redo';

  return {
    id: task?._id || task?.id,
    title: task?.title || '',
    desc: task?.desc || '',
    diff: task?.diff || 'medium',
    cat: task?.cat || 'General',
    xp: Number(task?.xp || 0),
    due: formatShortDate(task?.due),
    dueRaw: task?.due || null,
    status,
    priority: Boolean(task?.priority),
    completions: Number(task?.completions || 0),
    pendingGradingCount: Number(task?.pendingGradingCount || 0),
    total: Number(task?.total || task?.totalStudents || 0),
    attachmentUrl: task?.attachmentUrl || '',
    attachmentName: task?.attachmentName || '',
    answerMode: task?.answerMode || (task?.isChoice ? 'choice' : 'file'),
    choicePrompt: task?.choicePrompt || '',
    isChoice: Boolean(task?.isChoice),
    choices: (task?.choices || []).map(choice => ({
      id: choice?.id,
      name: choice?.name,
      takenBy: choice?.takenBy?.initials || choice?.takenBy?.name || choice?.takenBy || null
    })),
    submission: task?.submission || null
  };
};

const normalizeTaskSubmission = (submission) => ({
  id: submission?._id || submission?.id,
  taskId: submission?.task?._id || submission?.task || submission?.taskId,
  studentId: submission?.student?._id || submission?.student || submission?.studentId,
  studentName: submission?.student?.name || submission?.studentName || '',
  studentInitials: submission?.student?.initials || initialsFromName(submission?.student?.name),
  studentColor: submission?.student?.color || '#1a3a8f',
  fileUrl: submission?.fileUrl || '',
  fileName: submission?.fileName || '',
  proofUrl: submission?.proofUrl || '',
  responseText: submission?.responseText || '',
  status: submission?.status || 'submitted',
  submittedAt: submission?.submittedAt || null,
  grade: submission?.grade || '',
  feedback: submission?.feedback || '',
  redoFeedback: submission?.redoFeedback || '',
  xpAwarded: Number(submission?.xpAwarded || 0),
  gradedAt: submission?.gradedAt || null,
  gradedBy: submission?.gradedBy?._id || submission?.gradedBy || null
});

const normalizeAttendance = (attendance) => ({
  date: attendance?.date ? new Date(attendance.date).toDateString() : new Date().toDateString(),
  records: (attendance?.records || []).map(record => ({
    studentId: record?.student?._id || record?.student || record?.studentId,
    status: record?.status || 'absent'
  }))
});

const normalizeLeaveRequest = (request) => ({
  id: request?._id || request?.id,
  studentId: request?.student?._id || request?.student || request?.studentId,
  studentName: request?.student?.name || request?.studentName || 'Student',
  type: request?.type || 'leave',
  reason: request?.reason || '',
  date: formatShortDate(request?.date),
  status: request?.status || 'pending',
  submittedAt: formatDateTime(request?.createdAt || request?.submittedAt),
  rejectReason: request?.rejectionReason || request?.rejectReason || ''
});

const normalizeAnnouncement = (announcement) => ({
  id: announcement?._id || announcement?.id,
  title: announcement?.title || '',
  body: announcement?.body || '',
  pinned: Boolean(announcement?.pinned),
  time: formatRelativeTime(announcement?.createdAt || announcement?.time),
  comments: Array.isArray(announcement?.comments)
    ? announcement.comments.map(comment => ({
        id: comment?._id || comment?.id || `${comment?.from?._id || comment?.from}-${comment?.createdAt || ''}`,
        text: comment?.text || '',
        parentCommentId: comment?.parentCommentId || '',
        createdAt: formatRelativeTime(comment?.createdAt),
        authorId: comment?.from?._id || comment?.from || '',
        authorName: comment?.from?.name || 'User',
        authorInitials: comment?.from?.initials || initialsFromName(comment?.from?.name),
        authorRole: comment?.from?.role || ''
      }))
    : [],
  seenBy: Number(announcement?.seenBy || 0)
});

const normalizePoll = (poll) => ({
  id: poll?._id || poll?.id,
  question: poll?.question || '',
  options: (poll?.options || []).map(option => ({
    text: option?.text || '',
    votes: Array.isArray(option?.votes)
      ? option.votes.map(vote => vote?._id || vote?.id || vote).filter(Boolean).map(String)
      : [],
    voteCount: Array.isArray(option?.votes) ? option.votes.length : Number(option?.votes || 0)
  })),
  active: poll?.active !== false,
  createdAt: formatRelativeTime(poll?.createdAt),
  createdBy: poll?.createdBy?.name || poll?.createdBy || '',
  closedAt: poll?.closedAt || null
});

const normalizeSquad = (squad) => ({
  id: squad?._id || squad?.id,
  name: squad?.name || '',
  members: (squad?.members || []).map(member => member?._id || member?.id || member),
  totalXp: Number(squad?.totalXp || 0),
  rank: Number(squad?.rank || 0)
});

const normalizeResource = (resource) => ({
  id: resource?._id || resource?.id,
  name: resource?.name || '',
  type: resource?.type || 'PDF',
  cat: resource?.cat || 'General',
  size: resource?.size || '-',
  uploadedAt: formatDateTime(resource?.createdAt || resource?.uploadedAt),
  fileUrl: resource?.fileUrl || ''
});

const normalizeChatMessage = (message) => {
  const reactionValue = message?.reactions?.['👍🏼'];
  let reactionCount = 0;

  if (typeof reactionValue === 'number') reactionCount = reactionValue;
  else if (Array.isArray(reactionValue)) reactionCount = reactionValue.length;

  return {
    id: message?._id || message?.id,
    context: message?.context || 'class',
    fromId: message?.from?._id || message?.from?.id || message?.from || '',
    from: message?.from?.name || message?.fromName || 'User',
    initials: message?.from?.initials || initialsFromName(message?.from?.name || message?.fromName),
    role: message?.from?.role || message?.role || 'student',
    text: message?.text || '',
    time: formatDateTime(message?.createdAt || message?.time),
    createdAt: message?.createdAt || message?.time || null,
    quoted: message?.quoted?.text
      ? `${message?.quoted?.from || 'User'}: ${message.quoted.text}`
      : '',
    reactionCount
  };
};

const normalizeSeason = (season) => {
  if (!season) return {
    number: 0,
    name: 'Season data unavailable',
    endsIn: 0,
    currentMilestone: 0,
    milestones: []
  };

  const endDate = season?.endDate ? new Date(season.endDate) : null;
  const endsIn = endDate ? Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000)) : 0;

  return {
    number: Number(season?.number || 1),
    name: season?.name || 'Season',
    endsIn,
    currentMilestone: Number(season?.currentMilestone || 0),
    milestones: (season?.milestones || []).map(milestone => ({
      icon: milestone?.icon || '*',
      reward: milestone?.reward || '',
      done: Boolean(milestone?.done),
      claimable: Boolean(milestone?.claimable)
    }))
  };
};

const normalizeMonthTaskBatch = (batch) => ({
  id: batch?.id || batch?._id,
  monthName: batch?.monthName || '',
  year: Number(batch?.year || 0),
  totalTasks: Number(batch?.totalTasks || 0),
  minimumTarget: Number(batch?.minimumTarget || 0),
  eliteTarget: Number(batch?.eliteTarget || 0),
  negativeMarkValue: Number(batch?.negativeMarkValue || 0),
  description: batch?.description || '',
  rules: batch?.rules || '',
  title: batch?.title || `${batch?.monthName || ''} ${batch?.year || ''} Month Tasks`.trim(),
  todaySummary: batch?.todaySummary || null,
  leaderboard: (batch?.leaderboard || []).map(entry => ({
    rank: Number(entry?.rank || 0),
    studentId: entry?.studentId || entry?.student?._id || entry?.student,
    name: entry?.name || '',
    initials: entry?.initials || initialsFromName(entry?.name),
    color: entry?.color || '#1a3a8f',
    elitePoints: Number(entry?.elitePoints || 0),
    totalCompleted: Number(entry?.totalCompleted || 0),
    streakDays: Number(entry?.streakDays || 0),
    warningCount: Number(entry?.warningCount || 0)
  })),
  dailyTopPerformers: (batch?.dailyTopPerformers || []).map(entry => ({
    rank: Number(entry?.rank || 0),
    studentId: entry?.studentId || entry?.student,
    name: entry?.name || '',
    initials: entry?.initials || initialsFromName(entry?.name),
    tasksCompletedToday: Number(entry?.tasksCompletedToday || entry?.tasksCompleted || 0),
    pointsAwarded: Number(entry?.pointsAwarded || 0)
  })),
  topPerformerOverride: batch?.topPerformerOverride || null
});

const normalizeMonthTaskSubmission = (submission) => ({
  id: submission?.id || submission?._id,
  studentId: submission?.studentId || submission?.student?._id || submission?.student,
  studentName: submission?.studentName || submission?.student?.name || '',
  taskId: submission?.taskId || submission?.task?._id || submission?.task,
  taskTitle: submission?.taskTitle || submission?.task?.title || '',
  batchId: submission?.batchId || submission?.batch?._id || submission?.batch,
  date: submission?.date || '',
  status: submission?.status || 'not_started',
  startedAt: submission?.startedAt || null,
  submittedAt: submission?.submittedAt || null,
  proofUrl: submission?.proofUrl || '',
  responseText: submission?.responseText || '',
  proofFileUrl: submission?.proofFileUrl || '',
  proofFileName: submission?.proofFileName || '',
  score: Number(submission?.score || 0),
  negativeMarkApplied: Boolean(submission?.negativeMarkApplied),
  approvedBy: submission?.approvedBy || null,
  approvedAt: submission?.approvedAt || null,
  rejectedReason: submission?.rejectedReason || '',
  reviewNotes: submission?.reviewNotes || ''
});

const normalizeMonthTask = (task) => ({
  id: task?.id || task?._id,
  batchId: task?.batchId || task?.batch,
  taskNumber: Number(task?.taskNumber || 0),
  title: task?.title || '',
  description: task?.description || '',
  difficulty: task?.difficulty || 'Medium',
  marks: Number(task?.marks || 0),
  category: task?.category || 'General',
  needsSubmission: Boolean(task?.needsSubmission),
  answerMode: task?.answerMode || (task?.needsSubmission ? 'file' : 'done'),
  allowLinkSubmission: Boolean(task?.allowLinkSubmission),
  allowTextSubmission: Boolean(task?.allowTextSubmission),
  allowFileUpload: task?.allowFileUpload !== false,
  submission: task?.submission ? normalizeMonthTaskSubmission(task.submission) : null
});

const normalizeMonthTaskStat = (stat) => ({
  studentId: stat?.studentId || '',
  batchId: stat?.batchId || '',
  totalCompleted: Number(stat?.totalCompleted || 0),
  totalFailed: Number(stat?.totalFailed || 0),
  totalSelfDeclared: Number(stat?.totalSelfDeclared || 0),
  elitePoints: Number(stat?.elitePoints || 0),
  streakDays: Number(stat?.streakDays || 0),
  consecutiveSkipDays: Number(stat?.consecutiveSkipDays || 0),
  consecutiveSameScoreDays: Number(stat?.consecutiveSameScoreDays || 0),
  warningCount: Number(stat?.warningCount || 0),
  daysActive: Number(stat?.daysActive || 0),
  lastActiveDate: stat?.lastActiveDate || '',
  minimumReached: Boolean(stat?.minimumReached),
  eliteReached: Boolean(stat?.eliteReached),
  heatmap: stat?.heatmap || {},
  legendBadge: stat?.legendBadge ? normalizeBadge(stat.legendBadge) : null
});

const normalizeMonthTaskWarning = (warning) => ({
  id: warning?.id || warning?._id,
  studentId: warning?.studentId || warning?.student?._id || warning?.student,
  studentName: warning?.studentName || warning?.student?.name || '',
  batchId: warning?.batchId || warning?.batch?._id || warning?.batch,
  batchTitle: warning?.batchTitle || '',
  warningType: warning?.warningType || '',
  triggeredAt: warning?.triggeredAt || null,
  explanationText: warning?.explanationText || '',
  submittedAt: warning?.submittedAt || null,
  teacherAction: warning?.teacherAction || 'pending',
  actionedAt: warning?.actionedAt || null
});

EC.api = {
  async login(email, password, role) {
    if (!BACKEND_ENABLED) {
      throw new Error('Backend is disabled.');
    }

    const res = await this._post('/auth/login', { email, password, role });
    if (role && res?.user?.role && res.user.role !== role) {
      throw new Error(`This account is registered as ${res.user.role}, not ${role}.`);
    }
    return res;
  },

  async register(name, email, password, role) {
    if (!BACKEND_ENABLED) {
      throw new Error('Backend is disabled.');
    }

    return await this._post('/auth/register', { name, email, password, role });
  },

  async bootstrap() {
    if (!BACKEND_ENABLED || !EC.state.authToken) return;

    const today = new Date().toISOString().split('T')[0];
    const role = EC.state.currentRole;
    const requests = [
      ['students', role === 'teacher' ? this.getStudents() : this.getLeaderboard('alltime')],
      ['tasks', this.getTasks()],
      ['attendance', this.getAttendance(today)],
      ['leaveRequests', this.getLeaveRequests()],
      ['announcements', this.getAnnouncements()],
      ['polls', this.getPolls()],
      ['squads', this.getSquads()],
      ['resources', this.getResources()]
    ];

    if (role === 'student' && EC.state.myId) {
      requests.push(['profile', this.getProfile(EC.state.myId)]);
    }

    const results = await Promise.allSettled(requests.map(([, promise]) => promise));
    results.forEach((result, index) => {
      if (result.status !== 'fulfilled') return;
      const key = requests[index][0];
      const value = result.value;

      if (key === 'profile') {
        mergeBadgesIntoState([...(value?.badgeShowcase || []), ...(value?.unlockedBadges || [])]);
        const normalized = normalizeStudent(value);
        EC.state.currentUser = { ...EC.state.currentUser, ...normalized };
        EC.state.myBadgeShowcase = normalized.badgeShowcase || [];
        const existingIndex = EC.state.students.findIndex(student => student.id === normalized.id);
        if (existingIndex >= 0) EC.state.students[existingIndex] = normalized;
        else EC.state.students.push(normalized);
        return;
      }

      EC.state[key] = value;
    });

    const me = EC.state.students.find(student => student.id === EC.state.myId);
    if (me) {
      EC.state.myXp = me.xp;
      EC.state.myLevel = me.level;
      EC.state.myStreak = me.streak;
      EC.state.myRank = me.rank;
      EC.state.currentUser = { ...EC.state.currentUser, ...me };
    }
    EC.app?.loadBookmarks?.();
  },

  async getProfile(id) {
    const res = await this._get(`/users/${id}`);
    return res.data;
  },

  async getStudents() {
    const res = await this._get('/users/students');
    return (res.data || []).map((student, index) => normalizeStudent(student, index));
  },

  async getTasks() {
    const res = await this._get('/tasks');
    return (res.data || []).map(normalizeTask);
  },

  async createTask(data) {
    const due = data?.due ? new Date(`${data.due}T${data.time || '23:59'}`).toISOString() : null;
    const payload = {
      title: data?.title,
      desc: data?.desc,
      diff: data?.diff,
      cat: data?.cat,
      xp: Number(data?.xp || 0),
      due,
      priority: Boolean(data?.priority),
      isChoice: Boolean(data?.isChoice),
      choices: data?.choices || [],
      totalStudents: Number(data?.totalStudents || EC.state.students.length || 0),
      answerMode: data?.answerMode || (data?.isChoice ? 'choice' : 'file'),
      choicePrompt: data?.choicePrompt || '',
      attachmentUrl: data?.attachmentUrl || '',
      attachmentName: data?.attachmentName || ''
    };
    const res = await this._post('/tasks', payload);
    return normalizeTask(res.data);
  },

  async submitTask(id, payload = {}) {
    const formData = new FormData();
    const file = payload instanceof File ? payload : payload?.file;
    if (file instanceof File) formData.append('file', file);
    if (payload?.proofUrl) formData.append('proofUrl', payload.proofUrl);
    if (payload?.responseText) formData.append('responseText', payload.responseText);
    const res = await this._postForm(`/tasks/${id}/submit`, formData);
    return normalizeTaskSubmission(res.data);
  },

  async gradeTask(id, data) {
    try {
      const res = await this._post(`/tasks/${id}/grade`, data);
      return res.data;
    } catch (err) {
      const fallback = await this._post(`/tasks/${id}`, data);
      return fallback.data;
    }
  },

  async getTaskSubmissions(id) {
    const res = await this._get(`/tasks/${id}/submissions`);
    return (res.data || []).map(normalizeTaskSubmission);
  },

  async requestTaskRedo(id, data) {
    try {
      const res = await this._post(`/tasks/${id}/redo`, data);
      return normalizeTaskSubmission(res.data);
    } catch (err) {
      try {
        const res = await this._put(`/tasks/${id}/redo`, data);
        return normalizeTaskSubmission(res.data);
      } catch (fallbackErr) {
        const legacy = await this._post(`/tasks/${id}`, data);
        return normalizeTaskSubmission(legacy.data);
      }
    }
  },

  async claimChoice(taskId, choiceId) {
    const res = await this._post(`/tasks/${taskId}/claim/${choiceId}`, {});
    return normalizeTask(res.data);
  },

  async getAttendance(date) {
    const res = await this._get(`/attendance?date=${encodeURIComponent(date)}`);
    return normalizeAttendance(res.data);
  },

  async markAttendance(data) {
    const payload = {
      date: data?.date,
      records: (data?.records || []).map(record => ({
        student: record.studentId || record.student,
        status: record.status
      }))
    };
    const res = await this._post('/attendance', payload);
    return normalizeAttendance(res.data);
  },

  async selfMarkAttendance() {
    const res = await this._post('/attendance/self-mark', {});
    return normalizeAttendance(res.data);
  },

  async getLeaveRequests() {
    const endpoint = EC.state.currentRole === 'teacher' ? '/leave' : '/leave/my';
    const res = await this._get(endpoint);
    return (res.data || []).map(normalizeLeaveRequest);
  },

  async submitLeave(data) {
    const res = await this._post('/leave', data);
    return normalizeLeaveRequest(res.data);
  },

  async approveLeave(id) {
    const res = await this._put(`/leave/${id}/approve`, {});
    return normalizeLeaveRequest(res.data);
  },

  async rejectLeave(id, rejectionReason) {
    const res = await this._put(`/leave/${id}/reject`, { rejectionReason });
    return normalizeLeaveRequest(res.data);
  },

  async getAnnouncements() {
    const res = await this._get('/announcements');
    return (res.data || []).map(normalizeAnnouncement);
  },

  async getChatMessages(context = 'class') {
    const res = await this._get(`/chat?context=${encodeURIComponent(context)}`);
    return (res.data || []).map(normalizeChatMessage);
  },

  async sendChatMessage(data) {
    const res = await this._post('/chat', data);
    return normalizeChatMessage(res.data);
  },

  async reactChatMessage(id, emoji = '👍🏼') {
    const res = await this._post(`/chat/${id}/react`, { emoji });
    return normalizeChatMessage(res.data);
  },

  async createAnnouncement(data) {
    const res = await this._post('/announcements', data);
    return normalizeAnnouncement(res.data);
  },

  async updateAnnouncement(id, data) {
    const res = await this._put(`/announcements/${id}`, data);
    return normalizeAnnouncement(res.data);
  },

  async deleteAnnouncement(id) {
    return await this._delete(`/announcements/${id}`);
  },

  async addAnnouncementComment(id, text, parentCommentId = '') {
    const res = await this._post(`/announcements/${id}/comment`, { text, parentCommentId });
    return normalizeAnnouncement(res.data);
  },

  async getGradebook() {
    const res = await this._get('/gradebook');
    return res.data || [];
  },

  async getLeaderboard(type = 'alltime') {
    const res = await this._get(`/leaderboard?type=${encodeURIComponent(type)}`);
    if (type === 'squads') {
      return (res.data || []).map(normalizeSquad);
    }
    return (res.data || []).map((student, index) => normalizeStudent(student, index));
  },

  async getPolls() {
    const res = await this._get('/polls');
    return (res.data || []).map(normalizePoll);
  },

  async createPoll(data) {
    const res = await this._post('/polls', data);
    return normalizePoll(res.data);
  },

  async votePoll(id, optionIdx) {
    const res = await this._post(`/polls/${id}/vote`, { optionIndex: optionIdx });
    return normalizePoll(res.data);
  },

  async closePoll(id) {
    const res = await this._put(`/polls/${id}/close`, {});
    return normalizePoll(res.data);
  },

  async deletePoll(id) {
    return await this._delete(`/polls/${id}`);
  },

  async getSquads() {
    const res = await this._get('/squads');
    return (res.data || []).map(normalizeSquad);
  },

  async createSquad(data) {
    const res = await this._post('/squads', data);
    return normalizeSquad(res.data);
  },

  async updateSquad(id, data) {
    const res = await this._put(`/squads/${id}`, data);
    return normalizeSquad(res.data);
  },

  async deleteSquad(id) {
    return await this._delete(`/squads/${id}`);
  },

  async getResources() {
    const res = await this._get('/resources');
    return (res.data || []).map(normalizeResource);
  },

  async createResource(data) {
    const formData = new FormData();
    formData.append('name', data?.name || '');
    formData.append('type', data?.type || 'PDF');
    formData.append('cat', data?.cat || 'General');
    if (data?.file instanceof File) formData.append('file', data.file);
    const res = await this._postForm('/resources', formData);
    return normalizeResource(res.data);
  },

  async deleteResource(id) {
    return await this._delete(`/resources/${id}`);
  },

  async getResourceBlob(id, download = false) {
    const suffix = download ? '?download=1' : '';
    const response = await this._fetchWithBaseFallback(`/resources/${id}/file${suffix}`, {
      headers: this._headers()
    });
    return await response.blob();
  },

  async getSeason() {
    const res = await this._get('/seasons/active');
    return normalizeSeason(res.data);
  },

  async listMonthTaskBatches() {
    const res = await this._get('/month-tasks');
    return {
      activeBatchId: res.data?.activeBatchId || null,
      batches: (res.data?.batches || []).map(normalizeMonthTaskBatch)
    };
  },

  async getActiveMonthTaskBatch() {
    const res = await this._get('/month-tasks/active/current');
    return normalizeMonthTaskBatch(res.data);
  },

  async createMonthTaskBatch(data) {
    const res = await this._post('/month-tasks/batch', data);
    return normalizeMonthTaskBatch(res.data);
  },

  async updateMonthTaskBatch(id, data) {
    const res = await this._put(`/month-tasks/batch/${id}`, data);
    return normalizeMonthTaskBatch(res.data);
  },

  async getMonthTaskBatch(id) {
    const res = await this._get(`/month-tasks/batch/${id}`);
    return normalizeMonthTaskBatch(res.data);
  },

  async createMonthTask(batchId, data) {
    const res = await this._post(`/month-tasks/batch/${batchId}/task`, data);
    return normalizeMonthTask(res.data);
  },

  async updateMonthTask(batchId, taskId, data) {
    const res = await this._put(`/month-tasks/batch/${batchId}/task/${taskId}`, data);
    return normalizeMonthTask(res.data);
  },

  async deleteMonthTask(batchId, taskId) {
    return await this._delete(`/month-tasks/batch/${batchId}/task/${taskId}`);
  },

  async uploadMonthTaskExcel(batchId, file) {
    const formData = new FormData();
    if (file instanceof File) formData.append('file', file);
    const res = await this._postForm(`/month-tasks/batch/${batchId}/upload-excel`, formData);
    return {
      importedCount: Number(res.data?.importedCount || 0),
      tasks: (res.data?.tasks || []).map(normalizeMonthTask)
    };
  },

  async getMonthTasks(batchId) {
    const res = await this._get(`/month-tasks/batch/${batchId}/tasks`);
    return (res.data || []).map(normalizeMonthTask);
  },

  async getMonthTaskOverview(batchId) {
    const res = await this._get(`/month-tasks/batch/${batchId}/overview`);
    return res.data || [];
  },

  async getMonthTaskPendingSubmissions(batchId) {
    const res = await this._get(`/month-tasks/batch/${batchId}/pending-submissions`);
    return (res.data || []).map(normalizeMonthTaskSubmission);
  },

  async startMonthTask(taskId) {
    const res = await this._post('/month-tasks/start', { taskId });
    return normalizeMonthTaskSubmission(res.data);
  },

  async submitMonthTask(data) {
    const formData = new FormData();
    formData.append('taskId', data?.taskId || '');
    if (data?.proofUrl) formData.append('proofUrl', data.proofUrl);
    if (data?.responseText) formData.append('responseText', data.responseText);
    if (data?.file instanceof File) formData.append('file', data.file);
    const res = await this._postForm('/month-tasks/submit', formData);
    return normalizeMonthTaskSubmission(res.data);
  },

  async approveMonthTaskSubmission(id, data = {}) {
    const res = await this._put(`/month-tasks/submission/${id}/approve`, data);
    return normalizeMonthTaskSubmission(res.data);
  },

  async rejectMonthTaskSubmission(id, data = {}) {
    const res = await this._put(`/month-tasks/submission/${id}/reject`, data);
    return normalizeMonthTaskSubmission(res.data);
  },

  async getMonthTaskStats(studentId, batchId) {
    const res = await this._get(`/month-tasks/stats/${studentId}/${batchId}`);
    return normalizeMonthTaskStat(res.data);
  },

  async getMonthTaskLeaderboard(batchId) {
    const res = await this._get(`/month-tasks/leaderboard/${batchId}`);
    return (res.data || []).map(entry => ({
      rank: Number(entry?.rank || 0),
      studentId: entry?.studentId || '',
      name: entry?.name || '',
      initials: entry?.initials || initialsFromName(entry?.name),
      color: entry?.color || '#1a3a8f',
      elitePoints: Number(entry?.elitePoints || 0),
      totalCompleted: Number(entry?.totalCompleted || 0),
      streakDays: Number(entry?.streakDays || 0),
      warningCount: Number(entry?.warningCount || 0)
    }));
  },

  async getMonthTaskWarnings() {
    const res = await this._get('/month-tasks/warnings');
    return (res.data || []).map(normalizeMonthTaskWarning);
  },

  async getMyMonthTaskWarnings(batchId) {
    const suffix = batchId ? `/${batchId}` : '';
    const res = await this._get(`/month-tasks/warnings/mine${suffix}`);
    return (res.data || []).map(normalizeMonthTaskWarning);
  },

  async explainMonthTaskWarning(id, explanationText) {
    const res = await this._post(`/month-tasks/warnings/${id}/explain`, { explanationText });
    return normalizeMonthTaskWarning(res.data);
  },

  async actionMonthTaskWarning(id, action) {
    const res = await this._put(`/month-tasks/warnings/${id}/action`, { action });
    return normalizeMonthTaskWarning(res.data);
  },

  async extendMonthTaskDeadline(data) {
    const res = await this._post('/month-tasks/extend-deadline', data);
    return res.data;
  },

  async getMonthTaskDailySummary(batchId, date) {
    const res = await this._get(`/month-tasks/daily-summary/${batchId}/${date}`);
    return res.data;
  },

  async setMonthTaskTopPerformerOverride(batchId, data) {
    const res = await this._put(`/month-tasks/batch/${batchId}/top-performer-override`, data);
    return normalizeMonthTaskBatch(res.data);
  },

  async exportPdf(type) {
    const blob = await this._blob(`/export/pdf?type=${encodeURIComponent(type)}`);
    this._downloadBlob(blob, `${type}.pdf`);
  },

  async exportExcel(type) {
    const blob = await this._blob(`/export/excel?type=${encodeURIComponent(type)}`);
    this._downloadBlob(blob, `${type}.xlsx`);
  },

  async updateProfile(id, data) {
    const res = await this._put(`/users/${id}`, data);
    return res.data;
  },

  async uploadProfileImage(id, file) {
    const formData = new FormData();
    if (file instanceof File) formData.append('file', file);
    const res = await this._postForm(`/users/${id}/profile-image`, formData);
    return res.data;
  },

  _headers() {
    return {
      ...(EC.state.authToken ? { Authorization: `Bearer ${EC.state.authToken}` } : {})
    };
  },

  async _get(endpoint) {
    return await this._request(endpoint);
  },

  async _post(endpoint, body) {
    return await this._request(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
  },

  async _put(endpoint, body) {
    return await this._request(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
  },

  async _delete(endpoint) {
    return await this._request(endpoint, { method: 'DELETE' });
  },

  async _postForm(endpoint, formData) {
    return await this._request(endpoint, {
      method: 'POST',
      body: formData
    });
  },

  async _blob(endpoint) {
    const response = await this._fetchWithBaseFallback(endpoint, {
      headers: this._headers()
    });
    return await response.blob();
  },

  _downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },

  async _request(endpoint, options = {}) {
    const response = await this._fetchWithBaseFallback(endpoint, {
      ...options,
      headers: {
        ...this._headers(),
        ...(options.headers || {})
      }
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }

    return { success: true };
  },

  async _fetchWithBaseFallback(endpoint, options = {}) {
    let lastError = null;

    for (const baseUrl of API_BASE_CANDIDATES) {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, options);

        if (!response.ok) {
          const sameOriginApiBase = !/^https?:\/\/(localhost|127\.0\.0\.1):5050\/api$/i.test(baseUrl)
            && (baseUrl === '/api' || baseUrl === `${window.location.origin}/api`);
          if (sameOriginApiBase && [404, 405, 501].includes(response.status)) {
            lastError = new Error(`Skipping ${baseUrl}${endpoint} due to status ${response.status}`);
            continue;
          }
          throw new Error(await this._readError(response));
        }

        return response;
      } catch (error) {
        lastError = error;
        const isNetworkError = error instanceof TypeError || /failed to fetch/i.test(error?.message || '');
        if (!isNetworkError) {
          throw error;
        }
      }
    }

    throw new Error(
      'Could not reach the backend server on port 5050. Make sure the backend is running and open the frontend from localhost or 127.0.0.1.'
    );
  },

  async _readError(response) {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const payload = await response.json().catch(() => null);
      if (payload?.message) return payload.message;
    }

    const text = await response.text().catch(() => '');
    return text || `Request failed with status ${response.status}`;
  }
};
