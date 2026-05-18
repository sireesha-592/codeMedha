const express    = require('express');
const router     = express.Router();
const auth       = require('../middleware/auth');
const mongoose   = require('mongoose');

// Models (lazy-loaded to avoid circular deps)
const getModels = () => ({
  User:       require('../models/User'),
  Attendance: require('../models/Attendance'),
  Submission: require('../models/AssignmentSubmission'),
});

// ── Middleware: trainer/admin only ────────────────────────────
const trainerOnly = (req, res, next) => {
  if (['teacher', 'trainer', 'admin'].includes(req.user.role)) return next();
  res.status(403).json({ message: 'Trainer access required' });
};

// ═══════════════════════════════════════════════════════════════
//  GET /api/trainer/dashboard
// ═══════════════════════════════════════════════════════════════
router.get('/dashboard', auth, trainerOnly, async (req, res) => {
  try {
    const { User, Attendance, Submission } = getModels();
    const today = new Date().toISOString().split('T')[0];

    const students = await User.find({ role: { $in: ['student'] } }).lean();
    const totalStudents = students.length;
    const studentIds = students.map(s => s._id);

    // Today's attendance
    const attToday = await Attendance.find({ date: today, studentId: { $in: studentIds } }).lean();
    const present   = attToday.filter(a => a.status === 'present').length;
    const absent    = attToday.filter(a => a.status === 'absent').length;
    const notMarked = totalStudents - attToday.length;

    // Today's assignment check
    let assignment = null;
    try {
      const Assign = require('../models/Assignment');
      assignment = await Assign.findOne({ date: today }).lean();
    } catch (e) { /* no Assignment model */ }

    // Today's submissions
    const subs = await Submission.find({ date: today }).lean().catch(() => []);
    const submitted = subs.filter(s => s.status === 'submitted').length;
    const pending   = totalStudents - submitted;
    const ungraded  = subs.filter(s => s.status === 'submitted' && s.gradedAt == null).length;

    // BUG FIX: hasAssignment should check if assignment exists, not just submissions
    const hasAssignment = !!assignment || subs.length > 0;

    res.json({
      today,
      totalStudents,
      attendance:  { present, absent, notMarked },
      submissions: { submitted, pending, ungraded },
      hasAssignment,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  GET /api/trainer/students
// ═══════════════════════════════════════════════════════════════
router.get('/students', auth, trainerOnly, async (req, res) => {
  try {
    const { User } = getModels();
    const { courseId } = req.query;
    const filter = { role: { $in: ['student', 'trainee'] } };
    if (courseId) filter.enrolledCourse = courseId;
    const students = await User.find(filter)
      .select('name email phone enrolledCourse parentName parentPhone')
      .lean();
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  GET /api/trainer/attendance?date=YYYY-MM-DD
// ═══════════════════════════════════════════════════════════════
router.get('/attendance', auth, trainerOnly, async (req, res) => {
  try {
    const { User, Attendance } = getModels();
    const ClassActivity = require('../models/ClassActivity');

    const date     = req.query.date || new Date().toISOString().split('T')[0];
    const courseId = req.query.courseId;

    const userFilter = { role: { $in: ['student', 'trainee'] } };
    if (courseId) userFilter.enrolledCourse = courseId;

    const students   = await User.find(userFilter).select('name email').lean();
    const studentIds = students.map(s => s._id);

    const attRecords      = await Attendance.find({ date, studentId: { $in: studentIds } }).lean();
    const activityRecords = await ClassActivity.find({ date, studentId: { $in: studentIds } }).lean();

    const attMap      = {};
    const activityMap = {};
    attRecords.forEach(a => { attMap[a.studentId.toString()] = a; });
    activityRecords.forEach(a => { activityMap[a.studentId.toString()] = a; });

    const attendance = students.map(s => {
      const sid = s._id.toString();
      const rec = attMap[sid];
      const act = activityMap[sid];
      return {
        student: s,
        status:  rec ? rec.status : 'not_marked',
        // class activity data for trainer to decide attendance
        classActivity: act ? {
          opened:         act.opened,
          openedAt:       act.openedAt,
          watchedSeconds: act.watchedSeconds,
          classDuration:  act.classDuration,
          watchedPercent: act.watchedPercent,
          lastUpdated:    act.lastUpdated,
        } : null,
      };
    });

    res.json({ date, attendance });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  POST /api/trainer/attendance/mark  — mark one student
// ═══════════════════════════════════════════════════════════════
router.post('/attendance/mark', auth, trainerOnly, async (req, res) => {
  try {
    const { Attendance } = getModels();
    const { studentId, date, status } = req.body;
    if (!studentId || !date || !status) return res.status(400).json({ message: 'studentId, date, status required' });

    // BUG FIX: only allow valid enum values ('present' or 'absent')
    if (!['present', 'absent'].includes(status)) {
      return res.status(400).json({ message: 'status must be present or absent' });
    }

    const rec = await Attendance.findOneAndUpdate(
      { studentId, date },
      { $set: { status } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(rec);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  POST /api/trainer/attendance/bulk  — mark all at once
// ═══════════════════════════════════════════════════════════════
router.post('/attendance/bulk', auth, trainerOnly, async (req, res) => {
  try {
    const { Attendance } = getModels();
    const { date, records } = req.body;
    if (!date || !Array.isArray(records)) return res.status(400).json({ message: 'date and records[] required' });

    // BUG FIX: filter out 'not_marked' since it's not a valid enum value in Attendance model
    const validRecords = records.filter(r => ['present', 'absent'].includes(r.status));

    if (validRecords.length === 0) {
      return res.json({ message: '0 records saved (none marked yet)' });
    }

    const ops = validRecords.map(r => ({
      updateOne: {
        filter: { studentId: r.studentId, date },
        update: { $set: { status: r.status } },
        upsert: true,
      }
    }));

    await Attendance.bulkWrite(ops);
    res.json({ message: `${validRecords.length} records saved` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  GET /api/trainer/submissions?date=YYYY-MM-DD
// ═══════════════════════════════════════════════════════════════
router.get('/submissions', auth, trainerOnly, async (req, res) => {
  try {
    const { Submission } = getModels();
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const courseId = req.query.courseId;

    // Check if questions exist for this date (using Question model, not legacy Assignment)
    const Question = require('../models/Question');
    const qFilter = { date };
    if (courseId) qFilter.courseId = courseId;
    const questions = await Question.find(qFilter).sort({ section: 1, order: 1 }).lean();
    const subFilter = { date };
    if (courseId) subFilter.courseId = courseId;
    const submissions = await Submission.find(subFilter)
      .populate('traineeId', 'name email')
      .lean();

    // Show assignment if questions exist OR if there are submissions for that date
    const hasQuestions = questions.length > 0;
    const hasSubmissions = submissions.length > 0;
    const assignment = (hasQuestions || hasSubmissions) ? {
      title: `Assignment (${date})`,
      date,
      questions,
    } : null;

    const normalizedSubs = submissions.map(s => ({
      ...s,
      userId: s.traineeId,
      answers: normalizeAnswers(s),
    }));

    res.json({ date, assignment, submissions: normalizedSubs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Helper: flatten secA/secB/secC answers into [{questionId, answer, section}] for GradeForm
function normalizeAnswers(sub) {
  const out = [];
  for (const [sec, key] of [['A','secA'],['B','secB'],['C','secC']]) {
    const section = sub[key];
    if (!section || !section.answers) continue;
    for (const a of section.answers) {
      out.push({
        questionId: a.questionId?.toString(),
        answer: a.answerText || '',
        section: sec,
      });
    }
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════
//  GET /api/trainer/submissions/student/:studentId
// ═══════════════════════════════════════════════════════════════
router.get('/submissions/student/:studentId', auth, trainerOnly, async (req, res) => {
  try {
    const { Submission } = getModels();

    // BUG FIX: populate assignmentId so frontend can show title and date
    const subs = await Submission.find({ traineeId: req.params.studentId })
      .sort({ createdAt: -1 })
      // Try to populate assignmentId if Assignment model exists
      .lean();

    // Attach assignmentId from date (no separate Assignment document needed)
    const populatedSubs = subs.map(s => ({
      ...s,
      assignmentId: { title: `Assignment (${s.date})`, date: s.date },
    }));

    res.json(populatedSubs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  PATCH /api/trainer/submissions/:id/grade
// ═══════════════════════════════════════════════════════════════
router.patch('/submissions/:id/grade', auth, trainerOnly, async (req, res) => {
  try {
    const { Submission } = getModels();
    const { manualScore, trainerFeedback, questionScores } = req.body;

    // BUG FIX: populate 'traineeId' (correct field name) then normalize to 'userId' for frontend
    const sub = await Submission.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          manualScore:     manualScore ?? null,
          trainerFeedback: trainerFeedback || '',
          questionScores:  questionScores  || [],
          gradedBy:        req.user._id || req.user.id,
          gradedAt:        new Date(),
        }
      },
      { new: true }
    ).populate('traineeId', 'name email');

    if (!sub) return res.status(404).json({ message: 'Submission not found' });

    // Normalize for frontend (frontend uses sub.userId?.name)
    const result = sub.toObject();
    result.userId = result.traineeId;

    res.json({ submission: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  GET /api/trainer/student-weekly-report/:studentId
//  Returns 7-day attendance + assignment data for one student (admin/trainer)
// ═══════════════════════════════════════════════════════════════
router.get('/student-weekly-report/:studentId', auth, trainerOnly, async (req, res) => {
  try {
    const mongoose   = require('mongoose');
    const Attendance = mongoose.model('Attendance');
    const Submission = mongoose.model('AssignmentSubmission');
    const User       = require('../models/User');

    const student = await User.findById(req.params.studentId).lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const now = new Date();
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      last7Days.push(d.toISOString().split('T')[0]);
    }

    const attRecords  = await Attendance.find({ studentId: req.params.studentId, date: { $in: last7Days } }).lean().catch(() => []);
    const dayNames    = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyAtt   = last7Days.map(date => {
      const rec = attRecords.find(r => r.date === date);
      return { date, day: dayNames[new Date(date).getDay()], status: rec ? rec.status : 'no_data' };
    });
    const presentCount = weeklyAtt.filter(d => d.status === 'present').length;
    const absentCount  = weeklyAtt.filter(d => d.status === 'absent').length;
    const classDays    = weeklyAtt.filter(d => d.status !== 'no_class' && d.status !== 'no_data').length;
    const weekPct      = classDays > 0 ? Math.round((presentCount / classDays) * 100) : 0;

    const subs = await Submission.find({ traineeId: req.params.studentId, date: { $in: last7Days } }).lean().catch(() => []);
    const totalScore   = subs.reduce((t, s) => t + ((s.secA?.score || 0) + (s.secB?.score || 0) + (s.secC?.score || 0)), 0);
    const submittedCount = subs.filter(s => s.status === 'submitted' || s.secA || s.secB || s.secC).length;

    // Last 4 weeks trend
    const weeklyTrend = [];
    for (let w = 3; w >= 0; w--) {
      const wDays = [];
      for (let d = 6; d >= 0; d--) {
        const day = new Date(now); day.setDate(now.getDate() - w * 7 - d);
        wDays.push(day.toISOString().split('T')[0]);
      }
      const wRecs    = await Attendance.find({ studentId: req.params.studentId, date: { $in: wDays } }).lean().catch(() => []);
      const wPresent = wRecs.filter(r => r.status === 'present').length;
      const wClass   = wRecs.filter(r => r.status !== 'no_class').length;
      weeklyTrend.push({ week: `Week ${4 - w}`, pct: wClass > 0 ? Math.round((wPresent / wClass) * 100) : 0, present: wPresent, total: wClass });
    }

    res.json({
      student:     { name: student.name, email: student.email, parentName: student.parentName || '', parentPhone: student.parentPhone || '' },
      period:      { from: last7Days[0], to: last7Days[6] },
      attendance:  { days: weeklyAtt, present: presentCount, absent: absentCount, percentage: weekPct },
      assignments: { submitted: submittedCount, totalScore, total: subs.length },
      trend:       weeklyTrend,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  POST /api/trainer/notify-whatsapp
//  Sends WhatsApp message via Twilio (or logs if no credentials)
// ═══════════════════════════════════════════════════════════════
router.post('/notify-whatsapp', auth, trainerOnly, async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) return res.status(400).json({ message: 'phone and message required' });

    // Normalize phone — add country code if missing (India default +91)
    const normalizedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken  = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'; // Twilio sandbox default

    if (!accountSid || !authToken) {
      // Log and simulate success if Twilio not configured
      console.log(`📱 [WhatsApp SIMULATED] To: ${normalizedPhone}\n${message}`);
      return res.json({ success: true, simulated: true, to: normalizedPhone, message });
    }

    const client = require('twilio')(accountSid, authToken);
    const msg = await client.messages.create({
      from: fromNumber,
      to:   `whatsapp:${normalizedPhone}`,
      body: message,
    });

    res.json({ success: true, sid: msg.sid, to: normalizedPhone });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;