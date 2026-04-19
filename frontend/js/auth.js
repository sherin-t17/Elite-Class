/* ============================================================
   ELITE CLASS — AUTH MODULE v2
   Fixed: logout now uses #auth-container (not old login-screen IDs)
   ============================================================ */
window.EC = window.EC || {};

const AUTH_STORAGE_KEY = 'ec_user';

const resetUserScopedState = () => {
  EC.state.currentUser = null;
  EC.state.currentRole = null;
  EC.state.authToken = null;
  EC.state.currentPage = 'dashboard';
  EC.state.students = [];
  EC.state.tasks = [];
  EC.state.announcements = [];
  EC.state.attendance = { date: new Date().toDateString(), records: [] };
  EC.state.leaveRequests = [];
  EC.state.badges = [];
  EC.state.polls = [];
  EC.state.monthTaskBatches = [];
  EC.state.monthTasks = [];
  EC.state.monthTaskSubmissions = [];
  EC.state.monthTaskStats = [];
  EC.state.monthTaskWarnings = [];
  EC.state.bookmarks = [];
  EC.state.resources = [];
  EC.state.examDays = null;
  EC.state.nextExam = '';
  EC.state.myId = null;
  EC.state.myXp = 0;
  EC.state.myLevel = '';
  EC.state.myRank = 0;
  EC.state.myStreak = 0;
  EC.state.myBadgeShowcase = [];
  EC.state.chatMessagesByContext = {};
  EC.state.notifications = { counts: {}, seen: {} };
};

EC.auth = {
  init() {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        EC.state.currentUser = data.user;
        EC.state.currentRole = data.user.role;
        EC.state.authToken   = data.token;
        EC.state.myId        = data.user.id;
        EC.state.myXp        = data.user.xp    || 0;
        EC.state.myLevel     = data.user.level || EC.levelFromXp(data.user.xp || 0);
        EC.state.myStreak    = data.user.streak || 0;
        EC.state.myRank      = data.user.rank   || 0;
        return true;
      } catch (e) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }

    const handoffKey = new URLSearchParams(window.location.search).get('sessionKey');
    if (handoffKey) {
      try {
        const handoffRaw = localStorage.getItem(`ec_session_handoff_${handoffKey}`);
        if (handoffRaw) {
          localStorage.setItem(AUTH_STORAGE_KEY, handoffRaw);
          localStorage.removeItem(`ec_session_handoff_${handoffKey}`);
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete('sessionKey');
          window.history.replaceState({}, document.title, cleanUrl.toString());
          return this.init();
        }
      } catch (error) {
        localStorage.removeItem(`ec_session_handoff_${handoffKey}`);
      }
    }
    return false;
  },

  async login(email, password, role) {
    try {
      const res = await EC.api.login(email, password, role);
      if (!res.success) throw new Error(res.message || 'Login failed');
      EC.auth._saveSession(res);
      return true;
    } catch (e) {
      EC.toast(e.message || 'Login failed. Check your credentials.', 'danger');
      return false;
    }
  },

  async loginWithGoogle(credential, role) {
    try {
      const res = await EC.api.googleLogin(credential, role);
      if (!res.success) throw new Error(res.message || 'Google sign-in failed');
      EC.auth._saveSession(res);
      return true;
    } catch (e) {
      EC.toast(e.message || 'Google sign-in failed.', 'danger');
      return false;
    }
  },

  async register(name, email, password, role) {
    try {
      const res = await EC.api.register(name, email, password, role);
      if (!res.success) throw new Error(res.message || 'Registration failed');
      EC.toast('Account created! Please log in.', 'success');
      return true;
    } catch (e) {
      EC.toast(e.message || 'Registration failed.', 'danger');
      return false;
    }
  },

  _saveSession(data) {
    resetUserScopedState();
    EC.state.currentUser = data.user;
    EC.state.currentRole = data.user.role;
    EC.state.authToken   = data.token;
    EC.state.myId        = data.user.id;
    EC.state.myXp        = data.user.xp    || 0;
    EC.state.myLevel     = data.user.level || EC.levelFromXp(data.user.xp || 0);
    EC.state.myStreak    = data.user.streak || 0;
    EC.state.myRank      = data.user.rank   || 0;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
    EC.app?.loadBookmarks?.();
  },

  logout() {
    EC.chat?.stopPolling?.();
    EC.notifications?.stopPolling?.();

    // Clear session
    localStorage.removeItem(AUTH_STORAGE_KEY);
    resetUserScopedState();

    // Hide app
    const app = document.getElementById('app');
    if (app) app.classList.remove('visible');

    // Show auth container and reset to login panel
    const authContainer = document.getElementById('auth-container');
    if (authContainer) authContainer.style.display = 'flex';

    // Reset sliding panel back to login (remove toggled class)
    const authWrapper = document.getElementById('auth-wrapper');
    if (authWrapper) authWrapper.classList.remove('toggled');
    if (typeof window.clearAuthFormFields === 'function') {
      window.clearAuthFormFields();
    }

    EC.toast('Logged out successfully.', 'default');
  },
};

const AUTH_DEFAULTS = {
  loginRole: 'teacher',
  registerRole: 'student'
};

const authUiState = {
  loginRole: AUTH_DEFAULTS.loginRole,
  registerRole: AUTH_DEFAULTS.registerRole,
  loginBusy: false,
  registerBusy: false
};

const updateRoleButtons = (containerId, role) => {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('.auth-role-btn').forEach((button) => {
    button.classList.toggle('active', button.textContent.trim().toLowerCase() === role);
  });
};

const setButtonBusyState = (button, busy, idleLabel, busyLabel) => {
  if (!button) return;
  button.disabled = busy;
  button.textContent = busy ? busyLabel : idleLabel;
};

const sanitizeEmail = (value) => String(value || '').trim().toLowerCase();

window.setLoginRole = (role) => {
  authUiState.loginRole = role === 'student' ? 'student' : 'teacher';
  updateRoleButtons('login-role-toggle', authUiState.loginRole);
};

window.setRegRole = (role) => {
  authUiState.registerRole = role === 'teacher' ? 'teacher' : 'student';
  updateRoleButtons('reg-role-toggle', authUiState.registerRole);
};

window.showRegister = () => {
  document.getElementById('auth-wrapper')?.classList.add('toggled');
  window.setRegRole(authUiState.registerRole);
  document.getElementById('reg-name')?.focus();
};

window.showLogin = () => {
  document.getElementById('auth-wrapper')?.classList.remove('toggled');
  window.setLoginRole(authUiState.loginRole);
  document.getElementById('login-email')?.focus();
};

window.togglePassword = (inputId, toggleButton) => {
  const input = document.getElementById(inputId);
  if (!input) return;

  const shouldShow = input.type === 'password';
  input.type = shouldShow ? 'text' : 'password';

  const icon = toggleButton?.querySelector('i');
  if (icon) {
    icon.classList.toggle('fa-eye', !shouldShow);
    icon.classList.toggle('fa-eye-slash', shouldShow);
  }

  toggleButton?.setAttribute('aria-label', shouldShow ? 'Hide password' : 'Show password');
};

window.clearAuthFormFields = () => {
  ['login-email', 'login-password', 'reg-name', 'reg-email', 'reg-password', 'reg-confirm']
    .forEach((id) => {
      const input = document.getElementById(id);
      if (input) input.value = '';
    });

  authUiState.loginBusy = false;
  authUiState.registerBusy = false;
  authUiState.loginRole = AUTH_DEFAULTS.loginRole;
  authUiState.registerRole = AUTH_DEFAULTS.registerRole;

  setButtonBusyState(document.getElementById('login-btn-el'), false, 'Sign In', 'Signing In...');

  document.querySelectorAll('.auth-password-toggle').forEach((button) => {
    const icon = button.querySelector('i');
    if (icon) {
      icon.classList.add('fa-eye');
      icon.classList.remove('fa-eye-slash');
    }
    button.setAttribute('aria-label', 'Show password');
  });

  const loginPassword = document.getElementById('login-password');
  const regPassword = document.getElementById('reg-password');
  const regConfirm = document.getElementById('reg-confirm');
  if (loginPassword) loginPassword.type = 'password';
  if (regPassword) regPassword.type = 'password';
  if (regConfirm) regConfirm.type = 'password';

  window.setLoginRole(AUTH_DEFAULTS.loginRole);
  window.setRegRole(AUTH_DEFAULTS.registerRole);
};

window.doLogin = async () => {
  if (authUiState.loginBusy) return false;

  const email = sanitizeEmail(document.getElementById('login-email')?.value);
  const password = String(document.getElementById('login-password')?.value || '');
  const button = document.getElementById('login-btn-el');

  if (!email) {
    EC.toast('Enter your email address.', 'warning');
    document.getElementById('login-email')?.focus();
    return false;
  }

  if (!password) {
    EC.toast('Enter your password.', 'warning');
    document.getElementById('login-password')?.focus();
    return false;
  }

  authUiState.loginBusy = true;
  setButtonBusyState(button, true, 'Sign In', 'Signing In...');

  try {
    const loggedIn = await EC.auth.login(email, password, authUiState.loginRole);
    if (!loggedIn) return false;
    await EC.app.launch();
    return true;
  } finally {
    authUiState.loginBusy = false;
    setButtonBusyState(button, false, 'Sign In', 'Signing In...');
  }
};

window.doRegister = async () => {
  if (authUiState.registerBusy) return false;

  const name = String(document.getElementById('reg-name')?.value || '').trim();
  const email = sanitizeEmail(document.getElementById('reg-email')?.value);
  const password = String(document.getElementById('reg-password')?.value || '');
  const confirmPassword = String(document.getElementById('reg-confirm')?.value || '');
  const button = document.querySelector('.auth-creds.signup .auth-submit');

  if (!name) {
    EC.toast('Enter your full name.', 'warning');
    document.getElementById('reg-name')?.focus();
    return false;
  }

  if (!email) {
    EC.toast('Enter your email address.', 'warning');
    document.getElementById('reg-email')?.focus();
    return false;
  }

  if (password.length < 6) {
    EC.toast('Password must be at least 6 characters.', 'warning');
    document.getElementById('reg-password')?.focus();
    return false;
  }

  if (password !== confirmPassword) {
    EC.toast('Passwords do not match.', 'warning');
    document.getElementById('reg-confirm')?.focus();
    return false;
  }

  authUiState.registerBusy = true;
  setButtonBusyState(button, true, 'Create Account', 'Creating...');

  try {
    const registered = await EC.auth.register(name, email, password, authUiState.registerRole);
    if (!registered) return false;

    window.showLogin();
    const loginEmail = document.getElementById('login-email');
    if (loginEmail) loginEmail.value = email;
    const loginPassword = document.getElementById('login-password');
    if (loginPassword) loginPassword.value = '';
    document.getElementById('reg-password').value = '';
    document.getElementById('reg-confirm').value = '';
    return true;
  } finally {
    authUiState.registerBusy = false;
    setButtonBusyState(button, false, 'Create Account', 'Creating...');
  }
};
