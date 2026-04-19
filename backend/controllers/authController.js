const jwt = require('jsonwebtoken');
const https = require('https');
const crypto = require('crypto');
const User = require('../models/User');

const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

const buildUserPayload = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  xp: user.xp,
  level: user.level,
  streak: user.streak,
  rank: user.rank,
  color: user.color,
  initials: user.initials,
  heroRole: user.heroRole,
  attendance: user.attendance,
  tasksCompleted: user.tasksCompleted,
  regNo: user.regNo,
  year: user.year,
  dept: user.dept,
  section: user.section,
  motivationQuote: user.motivationQuote || '',
  profileImageUrl: user.profileImageUrl || ''
});

const signAuthToken = (user) => jwt.sign(
  { id: user._id, name: user.name, email: user.email, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN }
);

const fetchGoogleTokenInfo = (credential) => new Promise((resolve, reject) => {
  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
  https.get(url, (response) => {
    let raw = '';
    response.on('data', chunk => { raw += chunk; });
    response.on('end', () => {
      try {
        const parsed = JSON.parse(raw || '{}');
        if (response.statusCode && response.statusCode >= 400) {
          reject(new Error(parsed.error_description || parsed.error || 'Google verification failed'));
          return;
        }
        resolve(parsed);
      } catch (error) {
        reject(new Error('Could not verify Google sign-in token'));
      }
    });
  }).on('error', () => reject(new Error('Could not reach Google to verify the sign-in token')));
});

exports.register = async (req, res) => {
  try {
    const normalizedEmail = String(req.body.email || '').trim().toLowerCase();
    const { name, password, role, regNo, year, dept, section } = req.body;

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }

      exists.name = name || exists.name;
      exists.email = normalizedEmail;
      exists.password = password;
      exists.role = role || exists.role;
      if (exists.role === 'student') {
        exists.regNo = regNo ?? exists.regNo;
        exists.year = year ?? exists.year;
        exists.dept = dept ?? exists.dept;
        exists.section = section ?? exists.section;
      }
      await exists.save();

      const token = signAuthToken(exists);

      return res.status(200).json({
        success: true,
        message: 'Existing account updated. You can log in with the new password now.',
        token,
        user: buildUserPayload(exists)
      });
    }

    const initials = name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
    const color = colors[Math.floor(Math.random() * colors.length)];

    const user = new User({
      name,
      email: normalizedEmail,
      password,
      role,
      initials,
      color,
      ...(role === 'student' && { regNo, year, dept, section })
    });

    await user.save();

    const token = signAuthToken(user);

    res.status(201).json({
      success: true,
      token,
      user: buildUserPayload(user)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      if (user.authProvider === 'google') {
        return res.status(401).json({
          success: false,
          message: 'This account uses Google sign-in. Use the Google button to continue.'
        });
      }
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (password && typeof user.hasHashedPassword === 'function' && !user.hasHashedPassword()) {
      user.password = password;
      if (user.authProvider !== 'google') {
        user.authProvider = 'local';
      }
      await user.save();
    }

    const token = signAuthToken(user);

    res.json({
      success: true,
      token,
      user: buildUserPayload(user)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getGoogleConfig = (req, res) => {
  res.json({
    success: true,
    data: {
      clientId: process.env.GOOGLE_CLIENT_ID || ''
    }
  });
};

exports.googleLogin = async (req, res) => {
  try {
    const credential = String(req.body.credential || '').trim();
    const requestedRole = String(req.body.role || '').trim();

    if (!credential) {
      return res.status(400).json({ success: false, message: 'Google sign-in token is required' });
    }

    if (!requestedRole || !['teacher', 'student'].includes(requestedRole)) {
      return res.status(400).json({ success: false, message: 'Choose Teacher or Student before continuing with Google' });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ success: false, message: 'Google sign-in is not configured yet on the server' });
    }

    const googleProfile = await fetchGoogleTokenInfo(credential);
    if (!googleProfile?.sub || !googleProfile?.email) {
      return res.status(401).json({ success: false, message: 'Invalid Google account response' });
    }

    if (String(googleProfile.aud || '') !== process.env.GOOGLE_CLIENT_ID) {
      return res.status(401).json({ success: false, message: 'Google sign-in client mismatch' });
    }

    if (String(googleProfile.email_verified || '') !== 'true') {
      return res.status(401).json({ success: false, message: 'Use a verified Google account to continue' });
    }

    const email = String(googleProfile.email).trim().toLowerCase();
    let user = await User.findOne({
      $or: [{ googleId: googleProfile.sub }, { email }]
    });

    if (user && user.role !== requestedRole) {
      return res.status(409).json({
        success: false,
        message: `This Google account is already linked as ${user.role}, not ${requestedRole}.`
      });
    }

    if (!user) {
      const name = String(googleProfile.name || googleProfile.given_name || email.split('@')[0] || 'User').trim();
      const initials = name
        .split(' ')
        .filter(Boolean)
        .map(part => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      const color = colors[Math.floor(Math.random() * colors.length)];

      user = new User({
        name,
        email,
        password: crypto.randomBytes(24).toString('hex'),
        role: requestedRole,
        initials,
        color,
        authProvider: 'google',
        googleId: googleProfile.sub,
        profileImageUrl: String(googleProfile.picture || '')
      });
    } else {
      user.name = String(googleProfile.name || user.name || '').trim() || user.name;
      user.email = email;
      user.authProvider = 'google';
      user.googleId = googleProfile.sub;
      if (!user.profileImageUrl && googleProfile.picture) {
        user.profileImageUrl = String(googleProfile.picture);
      }
    }

    await user.save();

    res.json({
      success: true,
      token: signAuthToken(user),
      user: buildUserPayload(user)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.logout = (req, res) => {
  res.json({ success: true, message: 'Logged out' });
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('badgeShowcase unlockedBadges');
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
