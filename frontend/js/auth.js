/* ============================================================
   ELITE CLASS — AUTH MODULE v2
   Fixed: logout now uses #auth-container (not old login-screen IDs)
   ============================================================ */
window.EC = window.EC || {};

EC.auth = {
  init() {
    const saved = sessionStorage.getItem('ec_user');
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
        sessionStorage.removeItem('ec_user');
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
    EC.state.currentUser = data.user;
    EC.state.currentRole = data.user.role;
    EC.state.authToken   = data.token;
    EC.state.myId        = data.user.id;
    EC.state.myXp        = data.user.xp    || 0;
    EC.state.myLevel     = data.user.level || EC.levelFromXp(data.user.xp || 0);
    EC.state.myStreak    = data.user.streak || 0;
    EC.state.myRank      = data.user.rank   || 0;
    sessionStorage.setItem('ec_user', JSON.stringify(data));
    EC.app?.loadBookmarks?.();
  },

  logout() {
    EC.chat?.stopPolling?.();

    // Clear session
    sessionStorage.removeItem('ec_user');
    EC.state.currentUser = null;
    EC.state.currentRole = null;
    EC.state.authToken   = null;
    EC.state.bookmarks   = [];

    // Hide app
    const app = document.getElementById('app');
    if (app) app.classList.remove('visible');

    // Show auth container and reset to login panel
    const authContainer = document.getElementById('auth-container');
    if (authContainer) authContainer.style.display = 'flex';

    // Reset sliding panel back to login (remove toggled class)
    const authWrapper = document.getElementById('auth-wrapper');
    if (authWrapper) authWrapper.classList.remove('toggled');

    EC.toast('Logged out successfully.', 'default');
  },
};
