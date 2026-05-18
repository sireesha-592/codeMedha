const express      = require('express');
const router       = express.Router();
const auth         = require('../middleware/auth');
const DailyFeedback = require('../models/DailyFeedback');
const User         = require('../models/User');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Attendance   = require('../models/Attendance');

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
};

// GET /api/daily-feedback/trainees?courseId=xxx&date=YYYY-MM-DD
// Admin: get all trainees in a course with their daily summary
router.get('/trainees', auth, adminOnly, async (req, res) => {
  try {
    const { courseId, date } = req.query;
    if (!courseId || !date) return res.status(400).json({ message: 'courseId and date required' });

    const trainees = await User.find({ role: 'trainee', enrolledCourse: courseId }).select('_id name email');

    const [submissions, attendances, feedbacks] = await Promise.all([
      AssignmentSubmission.find({ courseId, date }),
      Attendance.find({ date, studentId: { $in: trainees.map(t => t._id) } }),
      DailyFeedback.find({ courseId, date }),
    ]);

    const subMap  = {};
    submissions.forEach(s => { subMap[s.traineeId?.toString()] = s; });
    const attMap  = {};
    attendances.forEach(a => { attMap[a.studentId?.toString()] = a; });
    const fbMap   = {};
    feedbacks.forEach(f => { fbMap[f.traineeId?.toString()] = f; });

    const result = trainees.map(t => {
      const id  = t._id.toString();
      const sub = subMap[id];
      const att = attMap[id];
      const fb  = fbMap[id];
      return {
        trainee: { _id: t._id, name: t.name, email: t.email },
        attendance: att ? att.status : 'absent',
        assignment: sub
          ? { submitted: true, manualScore: sub.manualScore, scorePublished: sub.scorePublished }
          : { submitted: false },
        feedback: fb || null,
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/daily-feedback
// Admin: save or update feedback for a trainee
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { courseId, traineeId, date, feedback, rating } = req.body;
    if (!courseId || !traineeId || !date || !feedback)
      return res.status(400).json({ message: 'courseId, traineeId, date, feedback required' });

    const doc = await DailyFeedback.findOneAndUpdate(
      { courseId, traineeId, date },
      { feedback, rating: rating || null, adminId: req.user._id, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/daily-feedback/bulk
// Admin: save feedback for multiple trainees at once
router.post('/bulk', auth, adminOnly, async (req, res) => {
  try {
    const { courseId, date, feedbacks } = req.body;
    // feedbacks: [{ traineeId, feedback, rating }]
    if (!courseId || !date || !Array.isArray(feedbacks))
      return res.status(400).json({ message: 'courseId, date, feedbacks[] required' });

    const ops = feedbacks
      .filter(f => f.feedback?.trim())
      .map(f => ({
        updateOne: {
          filter: { courseId, traineeId: f.traineeId, date },
          update: { $set: { feedback: f.feedback, rating: f.rating || null, adminId: req.user._id, updatedAt: new Date() } },
          upsert: true,
        },
      }));

    if (ops.length) await DailyFeedback.bulkWrite(ops);
    res.json({ saved: ops.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/daily-feedback/trainee?courseId=xxx
// Trainee: get their own feedback history
router.get('/trainee', auth, async (req, res) => {
  try {
    const { courseId } = req.query;
    const query = { traineeId: req.user._id };
    if (courseId) query.courseId = courseId;

    const feedbacks = await DailyFeedback.find(query).sort({ date: -1 }).limit(30);
    res.json(feedbacks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;