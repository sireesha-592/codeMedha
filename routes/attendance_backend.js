const router = require('express').Router();
const Attendance    = require('../models/Attendance');
const ClassActivity = require('../models/ClassActivity');
const auth = require('../middleware/auth');

const isSunday = (dateStr) => new Date(dateStr + 'T12:00:00').getDay() === 0;

const localDateStr = (d) =>
  d.getFullYear() + '-' +
  String(d.getMonth() + 1).padStart(2, '0') + '-' +
  String(d.getDate()).padStart(2, '0');

// GET /api/attendance/stats  — trainee's own stats
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

    let currentStreak = 0;
    const d = new Date();
    const todayStr = localDateStr(d);

    for (let i = 0; i < 90; i++) {
      const ds = localDateStr(d);
      if (!isSunday(ds)) {
        if (presentSet.has(ds)) {
          currentStreak++;
        } else if (ds === todayStr) {
          // today not marked yet — don't break streak
        } else {
          break;
        }
      }
      d.setDate(d.getDate() - 1);
    }

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

    res.json({
      total, present, absent,
      attendancePercentage: Math.round(attendancePercentage * 10) / 10,
      currentStreak, last30,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/attendance/today-status  — trainee: get today's attendance status + class deadline
router.get('/today-status', auth, async (req, res) => {
  try {
    const studentId = req.user.id;
    const todayStr  = new Date().toISOString().split('T')[0];

    const DailyClass = require('../models/DailyClass');
    const [attRecord, classToday] = await Promise.all([
      Attendance.findOne({ studentId, date: todayStr }),
      DailyClass.findOne({ date: todayStr }).sort({ createdAt: -1 }),
    ]);

    let myActivity = null;
    if (classToday) {
      myActivity = await ClassActivity.findOne({ studentId, classId: classToday._id });
    }

    res.json({
      date: todayStr,
      status: attRecord?.status || 'not_marked',
      attendanceDeadline: classToday?.attendanceDeadline || null,
      deadlinePassed: classToday?.attendanceDeadline ? new Date() > new Date(classToday.attendanceDeadline) : false,
      hasClass: !!classToday,
      classTitle: classToday?.title || null,
      opened: myActivity?.opened || false,
      watchedPercent: myActivity?.watchedPercent || 0,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/attendance/class-activity/:date
// Admin reads all student activities for a given date + their mark status
router.get('/class-activity/:date', auth, async (req, res) => {
  try {
    const { date } = req.params;
    const DailyClass = require('../models/DailyClass');

    const [activities, classForDate, allAttendance] = await Promise.all([
      ClassActivity.find({ date })
        .populate('studentId', 'name email')
        .populate('classId', 'title date')
        .sort({ watchedPercent: -1 }),
      DailyClass.findOne({ date }).sort({ createdAt: -1 }),
      Attendance.find({ date }),
    ]);

    // Attach markedByAdmin + status to each activity
    const result = activities.map(a => {
      const att = allAttendance.find(r => r.studentId?.toString() === a.studentId?._id?.toString());
      return {
        ...a.toObject(),
        attendanceStatus: att?.status || null,
        markedByAdmin: att?.markedByAdmin || false,
        markedAt: att?.markedAt || null,
      };
    });

    res.json({
      activities: result,
      attendanceDeadline: classForDate?.attendanceDeadline || null,
      deadlinePassed: classForDate?.attendanceDeadline
        ? new Date() > new Date(classForDate.attendanceDeadline) : false,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});


// GET /api/attendance/:studentId/month/:year/:month  — all records for a month (batch)
router.get('/:studentId/month/:year/:month', auth, async (req, res) => {
  try {
    const { studentId, year, month } = req.params;
    const mm = month.padStart(2, '0');
    const prefix = `${year}-${mm}`;
    const records = await Attendance.find({
      studentId,
      date: { $regex: `^${prefix}` }
    });
    res.json(records);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/attendance/:studentId  — all records for a student
router.get('/:studentId', auth, async (req, res) => {
  try {
    const records = await Attendance.find({ studentId: req.params.studentId });
    res.json(records);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/attendance/:studentId/:date
router.get('/:studentId/:date', auth, async (req, res) => {
  try {
    const records = await Attendance.find({
      studentId: req.params.studentId,
      date: req.params.date,
    });
    res.json(records);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/attendance/mark  — admin/trainer manually marks attendance (NOT auto)
router.post('/mark', auth, async (req, res) => {
  try {
    const { studentId, courseId, date, status, watchedDuration } = req.body;
    if (!studentId || !date || !status) {
      return res.status(400).json({ message: 'studentId, date, status required' });
    }
    if (isSunday(date)) {
      return res.status(400).json({ message: 'Sunday is a holiday.' });
    }

    // ── Enforce attendance deadline: admin cannot mark before deadline ──
    const DailyClass = require('../models/DailyClass');
    const classForDate = await DailyClass.findOne({ date }).sort({ createdAt: -1 });
    if (classForDate?.attendanceDeadline) {
      const deadline = new Date(classForDate.attendanceDeadline);
      if (new Date() < deadline) {
        return res.status(403).json({
          message: `Cannot mark attendance before deadline: ${deadline.toLocaleString('en-IN')}`,
          deadlineNotReached: true,
          deadline: classForDate.attendanceDeadline,
        });
      }
    }

    const existing = await Attendance.findOne({ studentId, date });
    if (existing) {
      // ── Block re-marking: once admin marks, it's final ──
      if (existing.markedByAdmin) {
        return res.status(403).json({
          message: `Attendance already marked as "${existing.status}" and cannot be changed.`,
          alreadyMarked: true,
          status: existing.status,
        });
      }
      // First time admin marks (record existed from auto/other source)
      existing.status = status;
      existing.markedByAdmin = true;
      existing.markedAt = new Date();
      if (watchedDuration && watchedDuration > (existing.watchedDuration || 0)) {
        existing.watchedDuration = watchedDuration;
      }
      await existing.save();
      // Emit socket update to trainee
      const io = req.app.get('io');
      if (io) {
        io.to(`user-${studentId}`).emit('attendance-update', { status, date, studentId });
        io.emit('trainer-attendance-update', { studentId, date, status });
      }
      return res.json(existing);
    }

    const record = await Attendance.create({
      studentId,
      courseId: courseId || null,
      date,
      status,
      watchedDuration: watchedDuration || 0,
      autoMarked: false,
      markedByAdmin: true,
      markedAt: new Date(),
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user-${studentId}`).emit('attendance-update', { status, date, studentId });
      io.emit('trainer-attendance-update', { studentId, date, status });
    }

    res.json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/attendance/track-activity
// Trainee side calls this when: class page opens, video plays, video progress updates
// Admin/trainer reads this to decide attendance — not auto-mark
router.post('/track-activity', auth, async (req, res) => {
  try {
    const {
      classId,
      courseId,
      date,
      opened,
      watchedSeconds,
      classDuration,
    } = req.body;

    const studentId = req.user.id;

    if (!classId || !date) {
      return res.status(400).json({ message: 'classId and date required' });
    }

    // Upsert activity record
    let activity = await ClassActivity.findOne({ studentId, classId });

    if (!activity) {
      activity = new ClassActivity({
        studentId,
        classId,
        courseId: courseId || null,
        date,
        opened: opened || false,
        openedAt: opened ? new Date() : undefined,
        watchedSeconds: watchedSeconds || 0,
        classDuration: classDuration || 0,
        watchedPercent: 0,
        lastUpdated: new Date(),
      });
    } else {
      // opened: set to true, never reset to false
      if (opened && !activity.opened) {
        activity.opened = true;
        activity.openedAt = new Date();
      }
      // watchedSeconds: keep the highest value
      if (watchedSeconds && watchedSeconds > activity.watchedSeconds) {
        activity.watchedSeconds = watchedSeconds;
      }
      if (classDuration && classDuration > 0) {
        activity.classDuration = classDuration;
      }
      activity.lastUpdated = new Date();
    }

    // Calculate watch %
    if (activity.classDuration > 0) {
      activity.watchedPercent = Math.min(
        100,
        Math.round((activity.watchedSeconds / activity.classDuration) * 100)
      );
    }

    await activity.save();

    res.json({ success: true, activity });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;