const router = require('express').Router();
const AssignmentSubmission = require('../models/AssignmentSubmission');
const auth = require('../middleware/auth');

// ── GET /api/submissions/all
router.get('/all', auth, async (req, res) => {
  try {
    const submissions = await AssignmentSubmission.find({ traineeId: req.user.id })
      .sort({ date: -1 });
    res.json(submissions);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── GET /api/submissions/:traineeId/:date
router.get('/:traineeId/:date', auth, async (req, res) => {
  try {
    const submission = await AssignmentSubmission.findOne({
      traineeId: req.params.traineeId,
      date: req.params.date,
    });
    res.json(submission || null);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── POST /api/submissions/init
router.post('/init', auth, async (req, res) => {
  try {
    const { traineeId, courseId, date, secAQuestions, secBQuestions, secCQuestions } = req.body;
    let existing = await AssignmentSubmission.findOne({ traineeId, date });
    if (existing) return res.json(existing);

    const makeAnswers = (questions) =>
      questions.map(q => ({
        questionId: q._id,
        answerText: '',
        isAnswered: false,
      }));

    const submission = await AssignmentSubmission.create({
      traineeId, courseId, date,
      secA: { answers: makeAnswers(secAQuestions), total: 20, answered: 0, score: 0 },
      secB: { answers: makeAnswers(secBQuestions), total: 20, answered: 0, score: 0 },
      secC: { answers: makeAnswers(secCQuestions), total: 10, answered: 0, score: 0 },
      status: 'in_progress',
    });
    res.json(submission);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── PATCH /api/submissions/answer
router.patch('/answer', auth, async (req, res) => {
  try {
    const { traineeId, date, section, questionId, answerText, marks } = req.body;
    const secKey = `sec${section}`;
    const submission = await AssignmentSubmission.findOne({ traineeId, date });
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    const idx = submission[secKey].answers.findIndex(
      a => a.questionId.toString() === questionId
    );
    const wasAnswered = submission[secKey].answers[idx].isAnswered;
    submission[secKey].answers[idx].answerText = answerText;
    submission[secKey].answers[idx].isAnswered = answerText.trim().length > 0;

    if (!wasAnswered && answerText.trim().length > 0) {
      submission[secKey].answered += 1;
      submission[secKey].score += marks;
    } else if (wasAnswered && answerText.trim().length === 0) {
      submission[secKey].answered -= 1;
      submission[secKey].score -= marks;
    }

    await submission.save();
    res.json(submission);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── PATCH /api/submissions/submit
router.patch('/submit', auth, async (req, res) => {
  try {
    const { traineeId, date } = req.body;
    const submission = await AssignmentSubmission.findOneAndUpdate(
      { traineeId, date },
      { status: 'submitted', submittedAt: new Date() },
      { new: true }
    );
    // Emit real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${traineeId}`).emit('submission-update', {
        status: 'submitted', date, traineeId
      });
    }
    res.json(submission);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});


// ── GET /api/submissions/admin/all  (teacher/admin only — all trainees' submissions)
router.get('/admin/all', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    const Question = require('../models/Question');

    // Optional filters: ?date=2026-05-13 or ?traineeId=xxx
    const filter = {};
    if (req.query.date)      filter.date      = req.query.date;
    if (req.query.traineeId) filter.traineeId = req.query.traineeId;

    const submissions = await AssignmentSubmission.find(filter)
      .sort({ submittedAt: -1, createdAt: -1 })
      .lean();

    // Attach trainee name + populate question texts for answers
    const traineeIds = [...new Set(submissions.map(s => s.traineeId.toString()))];
    const users = await User.find({ _id: { $in: traineeIds } }).select('name email').lean();
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    // For each submission, attach question text to each answer
    const enriched = await Promise.all(submissions.map(async (sub) => {
      const questions = await Question.find({ courseId: sub.courseId, date: sub.date }).lean();
      const qMap = {};
      questions.forEach(q => { qMap[q._id.toString()] = q; });

      const enrichSec = (sec) => ({
        ...sec,
        answers: (sec?.answers || []).map(a => ({
          ...a,
          questionText: qMap[a.questionId?.toString()]?.text || 'Question not found',
          marks: qMap[a.questionId?.toString()]?.marks || 0,
          section: qMap[a.questionId?.toString()]?.section || '',
        }))
      });

      return {
        ...sub,
        trainee: userMap[sub.traineeId.toString()] || { name: 'Unknown', email: '' },
        secA: enrichSec(sub.secA),
        secB: enrichSec(sub.secB),
        secC: enrichSec(sub.secC),
      };
    }));

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
});

// ── GET /api/submissions/leaderboard
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    // Get all submitted assignments grouped by trainee
    const submissions = await AssignmentSubmission.find({ status: 'submitted' });

    // Group by traineeId
    const byTrainee = {};
    submissions.forEach(s => {
      const id = s.traineeId.toString();
      if (!byTrainee[id]) byTrainee[id] = { totalScore: 0, submitted: 0, dates: [] };
      const score = (s.secA?.score || 0) + (s.secB?.score || 0) + (s.secC?.score || 0);
      byTrainee[id].totalScore += score;
      byTrainee[id].submitted  += 1;
      byTrainee[id].dates.push(s.date);
    });

    // Fetch all attendance for each trainee
    const Attendance = require('../models/Attendance');
    const allAttendance = await Attendance.find({});
    const attByUser = {};
    allAttendance.forEach(a => {
      const id = a.studentId.toString();
      if (!attByUser[id]) attByUser[id] = { present: 0, total: 0 };
      if (a.status !== 'no_class') {
        attByUser[id].total++;
        if (a.status === 'present') attByUser[id].present++;
      }
    });

    // Fetch users
    const traineeIds = Object.keys(byTrainee);
    const users = await User.find({ _id: { $in: traineeIds } }).select('name email role');

    const leaderboard = users
      .filter(u => u.role !== 'teacher')
      .map(u => {
        const id = u._id.toString();
        const td = byTrainee[id] || { totalScore: 0, submitted: 0 };
        const att = attByUser[id] || { present: 0, total: 0 };
        const attPct = att.total > 0 ? Math.round((att.present / att.total) * 100) : 0;
        // Composite score: 70% assignments + 30% attendance
        const composite = Math.round((td.totalScore / Math.max(td.submitted * 130, 1)) * 70 + (attPct / 100) * 30);
        return {
          userId:     id,
          name:       u.name,
          totalScore: td.totalScore,
          submitted:  td.submitted,
          attPct,
          attPresent: att.present,
          attTotal:   att.total,
          composite,
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore || b.attPct - a.attPct);

    res.json({ leaderboard, myId: req.user.id });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;