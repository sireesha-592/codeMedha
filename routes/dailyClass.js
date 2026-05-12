const router  = require('express').Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const DailyClass = require('../models/DailyClass');
const auth    = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/classes';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /mp4|mov|avi|mkv|webm/;
    allowed.test(path.extname(file.originalname).toLowerCase())
      ? cb(null, true)
      : cb(new Error('Only video files allowed'));
  },
});

/* ── Admin: upload today's class ── */
router.post('/upload', auth, upload.single('video'), async (req, res) => {
  try {
    const { courseId, date, title } = req.body;
    // Expire ALL previous classes (not just same courseId)
    await DailyClass.updateMany({}, { isActive: false });
    const classDate = new Date(date + 'T00:00:00');
    const expiresAt = new Date(classDate);
    expiresAt.setHours(23, 59, 59, 0);
    const dailyClass = await DailyClass.create({
      courseId, date, title,
      videoPath: req.file.path,
      isActive:  true,
      expiresAt,
    });
    res.json({ message: 'Class uploaded successfully', dailyClass });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/* ── Get ALL classes (for notifications page) ── */
router.get('/all', auth, async (req, res) => {
  try {
    const classes = await DailyClass.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('courseId', 'title');
    res.json(classes);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/* ── Get today's active class (no courseId needed — for dashboard) ── */
router.get('/today', auth, async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    // Find any class for today — isActive OR date matches today
    const dailyClass = await DailyClass.findOne({
      $or: [
        { date: todayStr, isActive: true },
        { date: todayStr },
      ]
    }).populate('courseId', 'title');
    res.json(dailyClass || null);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/* ── Get today's class with courseId (kept for compatibility) ── */
router.get('/today/:courseId', auth, async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    // Try with courseId first, fallback to any today class
    let dailyClass = await DailyClass.findOne({
      courseId: req.params.courseId,
      date: todayStr,
    });
    if (!dailyClass) {
      // Fallback: any active class today regardless of courseId
      dailyClass = await DailyClass.findOne({ date: todayStr });
    }
    res.json(dailyClass || null);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/* ── Get class for a specific date ── */
router.get('/date/:courseId/:date', auth, async (req, res) => {
  try {
    let dailyClass = await DailyClass.findOne({
      courseId: req.params.courseId,
      date: req.params.date,
    });
    if (!dailyClass) {
      dailyClass = await DailyClass.findOne({ date: req.params.date });
    }
    res.json(dailyClass || null);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/* ── Stream video ── */
router.get('/stream/:id', async (req, res) => {
  try {
    const dailyClass = await DailyClass.findById(req.params.id);
    if (!dailyClass) return res.status(404).json({ message: 'Class not found' });

    const todayStr  = new Date().toISOString().split('T')[0];
    const classDate = (dailyClass.date || '').split('T')[0];
    if (classDate !== todayStr) {
      return res.status(403).json({ message: 'Class has expired or is not yet active' });
    }

    const videoPath = dailyClass.videoPath;
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ message: 'Video file not found on server' });
    }

    const stat     = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range    = req.headers.range;

    const secHeaders = {
      'Content-Type':           'video/mp4',
      'Cache-Control':          'no-store, no-cache, must-revalidate',
      'Pragma':                 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition':    'inline',
    };

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end   = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunk = end - start + 1;
      res.writeHead(206, {
        ...secHeaders,
        'Content-Range':  `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges':  'bytes',
        'Content-Length': chunk,
      });
      fs.createReadStream(videoPath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        ...secHeaders,
        'Accept-Ranges':  'bytes',
        'Content-Length': fileSize,
      });
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (err) {
    console.error('Stream error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
