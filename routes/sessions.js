const router  = require('express').Router();
const auth    = require('../middleware/auth');
const UserSession = require('../models/UserSession');
const User    = require('../models/User');

// ── POST /api/sessions/login  — called on every login ─────────
router.post('/login', auth, async (req, res) => {
  try {
    const session = await UserSession.create({
      userId:    req.user.id,
      role:      req.user.role,
      loginAt:   new Date(),
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
      userAgent: req.headers['user-agent'] || '',
    });
    res.json({ sessionId: session._id });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── POST /api/sessions/logout  — called on logout / tab-close ─
router.post('/logout', auth, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ message: 'sessionId required' });

    const session = await UserSession.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const logoutAt = new Date();
    const diffMins = Math.round((logoutAt - new Date(session.loginAt)) / 60000);
    const duration = Math.max(1, diffMins); // minimum 1 minute
    await UserSession.findByIdAndUpdate(sessionId, { logoutAt, duration });
    res.json({ ok: true, duration });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── GET /api/sessions/all  — admin: all sessions with user info
router.get('/all', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });

    const { role, userId, from, to } = req.query;
    const filter = {};

    // Filter by role — trainer, teacher, student (not admin)
    if (role) {
      filter.role = role;
    } else {
      filter.role = { $in: ['trainer', 'teacher', 'student'] };
    }

    if (userId) filter.userId = userId;

    if (from || to) {
      filter.loginAt = {};
      if (from) filter.loginAt.$gte = new Date(from);
      if (to)   filter.loginAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }

    const sessions = await UserSession.find(filter)
      .populate('userId', 'name email role')
      .sort({ loginAt: -1 })
      .limit(500)
      .lean();

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/sessions/users  — list of trainers+students for filter dropdown
router.get('/users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const users = await User.find({ role: { $in: ['trainer', 'teacher', 'student'] } }, 'name email role').lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/sessions/summary  — per-user stats for dashboard cards
router.get('/summary', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });

    const users = await User.find({ role: { $in: ['trainer', 'teacher', 'student'] } }, 'name email role').lean();

    const summaries = await Promise.all(users.map(async (u) => {
      const sessions = await UserSession.find({ userId: u._id }).sort({ loginAt: -1 }).lean();
      const totalSessions = sessions.length;
      const totalMinutes  = sessions.filter(s => s.duration != null).reduce((sum, s) => sum + (s.duration || 0), 0);
      const lastSession   = sessions[0] || null;
      return {
        user: u,
        totalSessions,
        totalMinutes,
        avgMinutes: totalSessions > 0 ? Math.round(totalMinutes / sessions.filter(s => s.duration != null).length || 0) : 0,
        lastLogin: lastSession?.loginAt || null,
        lastLogout: lastSession?.logoutAt || null,
        currentlyOnline: lastSession && !lastSession.logoutAt,
      };
    }));

    res.json(summaries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

// ── POST /api/sessions/beacon-logout  — called by sendBeacon on tab close
// No auth middleware (token is in body since sendBeacon can't set headers reliably)
router.post('/beacon-logout', async (req, res) => {
  try {
    const { sessionId, token } = req.body;
    if (!sessionId) return res.status(400).json({ message: 'sessionId required' });

    // Verify token manually
    const jwt = require('jsonwebtoken');
    let decoded;
    try { decoded = jwt.verify(token, process.env.JWT_SECRET); }
    catch (e) { return res.status(401).json({ message: 'Invalid token' }); }

    const session = await UserSession.findById(sessionId);
    if (!session || session.logoutAt) return res.json({ ok: true }); // already logged out

    // Verify session belongs to this user
    if (session.userId.toString() !== decoded.id) return res.status(403).json({ message: 'Forbidden' });

    const logoutAt = new Date();
    const diffMins = Math.round((logoutAt - new Date(session.loginAt)) / 60000);
    const duration = Math.max(1, diffMins);
    await UserSession.findByIdAndUpdate(sessionId, { logoutAt, duration });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});