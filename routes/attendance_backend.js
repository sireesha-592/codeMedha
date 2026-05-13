const router = require('express').Router();
const Attendance = require('../models/Attendance');
const auth = require('../middleware/auth');

const isSunday = (dateStr) => new Date(dateStr + 'T12:00:00').getDay() === 0;

const localDateStr = (d) =>
  d.getFullYear() + '-' +
  String(d.getMonth() + 1).padStart(2, '0') + '-' +
  String(d.getDate()).padStart(2, '0');

// GET /api/attendance/stats
router.get('/stats', auth, async (req, res) => {
  try {
    const studentId = req.user.id;
    const records = await Attendance.find({ studentId });

    const validRecords = records.filter(r => !isSunday(r.date));
    const total   = validRecords.length;
    const present = validRecords.filter(r => r.status === 'present').length;
    const absent  = total - present;
    const attendancePercentage = total > 0 ? (present / total) * 100 : 0;

    const presentSet = new Set(validRecords.filter(r => r.status === 'present').map(r => r.date));

    // Streak: walk backwards from today skipping Sundays
    let currentStreak = 0;
    const d = new Date();
    const todayStr = localDateStr(d);

    for (let i = 0; i < 90; i++) {
      const ds = localDateStr(d);
      if (!isSunday(ds)) {
        if (presentSet.has(ds)) {
          currentStreak++;
        } else if (ds === todayStr) {
          // today not marked yet — don't break streak, just skip
        } else {
          break;
        }
      }
      d.setDate(d.getDate() - 1);
    }

    // Last 30 working days for charts
    const last30 = [];
    const walker = new Date();
    let count = 0;
    while (count < 30) {
      const ds = localDateStr(walker);
      if (!isSunday(ds)) {
        const rec = validRecords.find(r => r.date === ds);
        last30.unshift({ date: ds, status: rec ? rec.status : 'no_class' });
        count++;
      }
      walker.setDate(walker.getDate() - 1);
    }

    res.json({ total, present, absent, attendancePercentage: Math.round(attendancePercentage * 10) / 10, currentStreak, last30 });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/attendance/:studentId
router.get('/:studentId', auth, async (req, res) => {
  try {
    const records = await Attendance.find({ studentId: req.params.studentId }).populate('courseId', 'title');
    res.json(records);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/attendance/:studentId/:date
router.get('/:studentId/:date', auth, async (req, res) => {
  try {
    const records = await Attendance.find({ studentId: req.params.studentId, date: req.params.date }).populate('courseId', 'title totalClasses');
    res.json(records);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/attendance/mark
router.post('/mark', auth, async (req, res) => {
  try {
    const { studentId, courseId, date, status } = req.body;
    if (isSunday(date)) return res.status(400).json({ message: 'Sunday is a holiday.' });
    // Prevent duplicate
    const existing = await Attendance.findOne({ studentId, date });
    if (existing) return res.json(existing);
    const record = await Attendance.create({ studentId, courseId, date, status });
    // Emit real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${studentId}`).emit('attendance-update', { status, date, studentId });
    }
    res.json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
