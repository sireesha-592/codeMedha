const router = require('express').Router();
const AssignmentSubmission = require('../models/AssignmentSubmission');
const auth = require('../middleware/auth');

// ── Helper: recalculate answered + score from isAnswered flags ──────────────
function recalcSection(sec, qMarkMap) {
  let answered = 0, score = 0;
  (sec.answers || []).forEach(a => {
    if (a.isAnswered) {
      answered++;
      score += qMarkMap[a.questionId?.toString()] || 0;
    }
  });
  sec.answered = answered;
  sec.score    = score;
}

// ── Helper: sync submission answers to current questions ────────────────────
// Match by questionId first, then fallback to position to preserve answers after question re-save
function syncAnswers(submission, questions) {
  ['A', 'B', 'C'].forEach(sec => {
    const secKey = `sec${sec}`;
    const secQs  = questions.filter(q => q.section === sec).sort((a, b) => (a.order || 0) - (b.order || 0));
    const existing = submission[secKey].answers || [];

    // Build map: questionId -> existing answer
    const byId = {};
    existing.forEach(a => { if (a.questionId) byId[a.questionId.toString()] = a; });

    const newAnswers = secQs.map((q, i) => {
      // 1) Match by questionId (same questions, no re-save)
      const matched = byId[q._id.toString()];
      if (matched) {
        const text = matched.answerText || '';
        return { questionId: q._id, answerText: text, isAnswered: matched.isAnswered || text.trim().length > 0 };
      }
      // 2) Fallback: match by position (questions re-created, preserve text)
      const byPos = existing[i];
      const text = byPos?.answerText || '';
      return { questionId: q._id, answerText: text, isAnswered: text.trim().length > 0 };
    });
    submission[secKey].answers = newAnswers;
  });
}

router.get('/all', auth, async (req, res) => {
  try {
    const submissions = await AssignmentSubmission.find({ traineeId: req.user.id }).sort({ date: -1 });
    res.json(submissions);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/admin/all', auth, async (req, res) => {
  try {
    const User     = require('../models/User');
    const Question = require('../models/Question');
    const filter   = {};
    if (req.query.date)      filter.date      = req.query.date;
    if (req.query.traineeId) filter.traineeId = req.query.traineeId;

    const submissions = await AssignmentSubmission.find(filter).sort({ submittedAt: -1, createdAt: -1 }).lean();
    const traineeIds  = [...new Set(submissions.map(s => s.traineeId.toString()))];
    const users       = await User.find({ _id: { $in: traineeIds } }).select('name email').lean();
    const userMap     = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    const enriched = await Promise.all(submissions.map(async (sub) => {
      const questions = await Question.find({ courseId: sub.courseId, date: sub.date }).lean();
      const qMap = {};
      questions.forEach(q => { qMap[q._id.toString()] = q; });

      // Build position-based arrays per section for fallback matching
      const qBySection = { A: [], B: [], C: [] };
      questions.forEach(q => { if (qBySection[q.section]) qBySection[q.section].push(q); });
      ['A','B','C'].forEach(s => qBySection[s].sort((a,b) => (a.order||0)-(b.order||0)));

      const enrichSec = (sec, secLetter) => {
        const secQsByPos = qBySection[secLetter] || [];
        const enrichedAnswers = (sec?.answers || []).map((a, i) => {
          // Match by questionId first
          let q = qMap[a.questionId?.toString()];
          // Fallback: match by position within this section
          if (!q) q = secQsByPos[i];
          return {
            ...a,
            questionText: q?.text || `Question ${i+1}`,
            marks:        q?.marks || 0,
            section:      q?.section || secLetter,
          };
        });
        const answeredCount = enrichedAnswers.filter(a => a.isAnswered).length;
        const totalScore    = enrichedAnswers.reduce((sum, a) => a.isAnswered ? sum + (a.marks || 0) : sum, 0);
        return { ...sec, answered: answeredCount, score: totalScore, answers: enrichedAnswers };
      };

      return {
        ...sub,
        trainee: userMap[sub.traineeId.toString()] || { name: 'Unknown', email: '' },
        secA: enrichSec(sub.secA, 'A'),
        secB: enrichSec(sub.secB, 'B'),
        secC: enrichSec(sub.secC, 'C'),
      };
    }));
    res.json(enriched);
  } catch (err) { console.error(err); res.status(400).json({ message: err.message }); }
});

router.get('/leaderboard', auth, async (req, res) => {
  try {
    const User       = require('../models/User');
    const Attendance = require('../models/Attendance');
    const submissions = await AssignmentSubmission.find({ status: 'submitted' });
    const byTrainee   = {};
    submissions.forEach(s => {
      if (!s.traineeId) return;
      const id = s.traineeId.toString();
      if (!byTrainee[id]) byTrainee[id] = { totalScore: 0, submitted: 0, dates: [] };
      // Use manualScore (trainer-graded) if published; otherwise 0
      byTrainee[id].totalScore += (s.scorePublished && s.manualScore != null) ? s.manualScore : 0;
      byTrainee[id].submitted  += 1;
      byTrainee[id].dates.push(s.date);
    });
    const allAttendance = await Attendance.find({});
    const attByUser     = {};
    allAttendance.forEach(a => {
      const id = a.studentId.toString();
      if (!attByUser[id]) attByUser[id] = { present: 0, total: 0 };
      if (a.status !== 'no_class') {
        attByUser[id].total++;
        if (a.status === 'present') attByUser[id].present++;
      }
    });
    const traineeIds  = Object.keys(byTrainee);
    const users       = await User.find({ _id: { $in: traineeIds } }).select('name email role');
    const leaderboard = users
      .filter(u => u.role !== 'teacher')
      .map(u => {
        const id  = u._id.toString();
        const td  = byTrainee[id] || { totalScore: 0, submitted: 0 };
        const att = attByUser[id] || { present: 0, total: 0 };
        const attPct    = att.total > 0 ? Math.round((att.present / att.total) * 100) : 0;
        const composite = Math.round((td.totalScore / Math.max(td.submitted * 130, 1)) * 70 + (attPct / 100) * 30);
        return { userId: id, name: u.name, totalScore: td.totalScore, submitted: td.submitted, attPct, attPresent: att.present, attTotal: att.total, composite };
      })
      .sort((a, b) => b.totalScore - a.totalScore || b.attPct - a.attPct);
    res.json({ leaderboard, myId: req.user.id });
  } catch (err) { console.error(err); res.status(400).json({ message: err.message }); }
});

// GET single submission — recalculate counts on load
router.get('/:traineeId/:date', auth, async (req, res) => {
  try {
    const submission = await AssignmentSubmission.findOne({
      traineeId: req.params.traineeId,
      date:      req.params.date,
    });
    if (!submission) return res.json(null);

    const Question = require('../models/Question');
    const questions = await Question.find({ courseId: submission.courseId, date: submission.date }).lean();
    const qMarkMap  = {};
    questions.forEach(q => { qMarkMap[q._id.toString()] = q.marks; });

    // Only sync answered count — score is set by trainer, not auto-calculated
    let changed = false;
    ['A', 'B', 'C'].forEach(sec => {
      const secKey = `sec${sec}`;
      let answeredCount = 0;
      (submission[secKey].answers || []).forEach(a => {
        if (a.isAnswered) answeredCount++;
      });
      if (submission[secKey].answered !== answeredCount) {
        submission[secKey].answered = answeredCount;
        changed = true;
      }
    });
    if (changed) await submission.save();
    res.json(submission);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// POST /init — create or sync existing submission
router.post('/init', auth, async (req, res) => {
  try {
    const { traineeId, courseId, date, secAQuestions, secBQuestions, secCQuestions } = req.body;
    const allQuestions = [...(secAQuestions || []), ...(secBQuestions || []), ...(secCQuestions || [])];

    console.log(`[INIT] traineeId=${traineeId} date=${date} questions=${allQuestions.length}`);

    const existing = await AssignmentSubmission.findOne({ traineeId, date });

    if (existing) {
      console.log(`[INIT] Found existing, status=${existing.status}`);

      // If already submitted — just return as-is, don't overwrite answers
      if (existing.status === 'submitted') {
        console.log(`[INIT] Submission is submitted — returning without sync`);
        return res.json(existing);
      }

      console.log(`[INIT] Syncing answers... secA before:`, existing.secA.answers.length);
      syncAnswers(existing, allQuestions);

      // Score is set by trainer — only sync answered counts on re-init

      console.log(`[INIT] After sync - secA answered:${existing.secA.answered} secB:${existing.secB.answered} secC:${existing.secC.answered}`);
      await existing.save();
      return res.json(existing);
    }

    console.log(`[INIT] Creating new submission`);
    const makeAnswers = (qs) => (qs || []).map(q => ({ questionId: q._id, answerText: '', isAnswered: false }));
    const submission = await AssignmentSubmission.findOneAndUpdate(
      { traineeId, date },
      {
        $setOnInsert: {
          traineeId, courseId, date,
          secA: { answers: makeAnswers(secAQuestions), total: 20, answered: 0, score: 0 },
          secB: { answers: makeAnswers(secBQuestions), total: 20, answered: 0, score: 0 },
          secC: { answers: makeAnswers(secCQuestions), total: 10, answered: 0, score: 0 },
          status: 'in_progress',
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(submission);
  } catch (err) {
    if (err.code === 11000) {
      const existing = await AssignmentSubmission.findOne({ traineeId: req.body.traineeId, date: req.body.date });
      return res.json(existing);
    }
    res.status(400).json({ message: err.message });
  }
});

// PATCH /answer — save one answer
router.patch('/answer', auth, async (req, res) => {
  try {
    const { traineeId, date, section, questionId, answerText, marks } = req.body;
    const secKey = `sec${section}`;

    console.log(`\n[ANSWER] section=${section} questionId=${questionId} text="${answerText?.substring(0,20)}"`);

    const submission = await AssignmentSubmission.findOne({ traineeId, date });
    if (!submission) {
      console.log(`[ANSWER] ERROR: no submission found for traineeId=${traineeId} date=${date}`);
      return res.status(404).json({ message: 'Submission not found' });
    }

    const allIds = submission[secKey].answers.map(a => a.questionId?.toString()).filter(Boolean);
    console.log(`[ANSWER] submission has ${allIds.length} answers for sec${section}`);
    console.log(`[ANSWER] looking for questionId: ${questionId}`);
    console.log(`[ANSWER] stored ids (first 3):`, allIds.slice(0,3));

    let idx = submission[secKey].answers.findIndex(a => a.questionId.toString() === questionId.toString());
    console.log(`[ANSWER] findIndex result: ${idx}`);

    if (idx === -1) {
      // questionId not found — maybe questions were re-saved with new _ids
      // Try to find by fetching questions and matching by position
      const Question = require('../models/Question');
      const currentQs = await Question.find({ courseId: submission.courseId, date: submission.date, section }).sort({ order: 1 }).lean();
      const posInCurrent = currentQs.findIndex(q => q._id.toString() === questionId.toString());
      if (posInCurrent !== -1 && submission[secKey].answers[posInCurrent]) {
        // Found by position — update existing slot with new questionId
        idx = posInCurrent;
        submission[secKey].answers[idx].questionId = questionId;
        console.log(`[ANSWER] Matched by position ${posInCurrent}`);
      } else {
        // No match at all — push new entry
        console.log(`[ANSWER] No match — pushing new`);
        submission[secKey].answers.push({ questionId, answerText, isAnswered: answerText.trim().length > 0 });
        idx = submission[secKey].answers.length - 1;
      }
    }
    submission[secKey].answers[idx].answerText = answerText;
    submission[secKey].answers[idx].isAnswered  = answerText.trim().length > 0;

    // Count answered questions for progress bar (score = 0 until trainer grades)
    let answeredCount = 0;
    submission[secKey].answers.forEach(a => {
      if (a.isAnswered) answeredCount++;
    });
    submission[secKey].answered = answeredCount;
    // DO NOT auto-calculate score — trainer manually grades after submission

    console.log(`[ANSWER] saving — answered=${answeredCount} score=${totalScore}`);
    await submission.save();
    console.log(`[ANSWER] saved OK`);
    res.json(submission);
  } catch (err) {
    console.error('[ANSWER] ERROR:', err);
    res.status(400).json({ message: err.message });
  }
});

router.patch('/submit', auth, async (req, res) => {
  try {
    const { traineeId, date } = req.body;
    const submission = await AssignmentSubmission.findOneAndUpdate(
      { traineeId, date },
      { status: 'submitted', submittedAt: new Date() },
      { new: true }
    );
    const io = req.app.get('io');
    if (io) io.to(`user-${traineeId}`).emit('submission-update', { status: 'submitted', date, traineeId });
    res.json(submission);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// PATCH /reset — Admin: reopen a submitted assignment (clears submit status, keeps answers)
router.patch('/reset', auth, async (req, res) => {
  try {
    const { traineeId, date } = req.body;
    const submission = await AssignmentSubmission.findOneAndUpdate(
      { traineeId, date },
      { status: 'in_progress', $unset: { submittedAt: 1 } },
      { new: true }
    );
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    const io = req.app.get('io');
    if (io) io.to(`user-${traineeId}`).emit('submission-update', { status: 'in_progress', date, traineeId });
    res.json(submission);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// DELETE /:traineeId/:date — Admin: fully delete a submission so student can start fresh
router.delete('/:traineeId/:date', auth, async (req, res) => {
  try {
    const result = await AssignmentSubmission.findOneAndDelete({
      traineeId: req.params.traineeId,
      date:      req.params.date,
    });
    if (!result) return res.status(404).json({ message: 'Submission not found' });
    res.json({ message: 'Submission deleted — student can start fresh', deleted: true });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ── PATCH /publish — Admin: publish score+feedback to trainee ──────────────
router.patch('/publish', auth, async (req, res) => {
  try {
    const { traineeId, date, adminFeedback } = req.body;
    const submission = await AssignmentSubmission.findOneAndUpdate(
      { traineeId, date },
      {
        scorePublished: true,
        publishedAt:    new Date(),
        adminFeedback:  adminFeedback || '',
      },
      { new: true }
    );
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    const io = req.app.get('io');
    if (io) io.to(`user-${traineeId}`).emit('score-published', {
      date,
      manualScore:     submission.manualScore,
      trainerFeedback: submission.trainerFeedback,
      adminFeedback:   submission.adminFeedback,
    });
    res.json(submission);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ── PATCH /unpublish — Admin: hide score from trainee ───────────────────────
router.patch('/unpublish', auth, async (req, res) => {
  try {
    const { traineeId, date } = req.body;
    const submission = await AssignmentSubmission.findOneAndUpdate(
      { traineeId, date },
      { scorePublished: false, $unset: { publishedAt: 1 } },
      { new: true }
    );
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    res.json(submission);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

module.exports = router;

// TEMP DEBUG: check raw DB state
router.get('/debug/:traineeId/:date', auth, async (req, res) => {
  try {
    const sub = await AssignmentSubmission.findOne({
      traineeId: req.params.traineeId,
      date: req.params.date,
    }).lean();
    if (!sub) return res.json({ error: 'not found' });
    
    const result = {
      status: sub.status,
      secA: {
        answered: sub.secA.answered,
        score: sub.secA.score,
        sampleAnswers: sub.secA.answers.slice(0,3).map(a => ({
          questionId: a.questionId,
          isAnswered: a.isAnswered,
          answerText: a.answerText?.substring(0, 50),
        }))
      },
      secB: { answered: sub.secB.answered },
      secC: { answered: sub.secC.answered },
    };
    res.json(result);
  } catch (err) { res.status(400).json({ message: err.message }); }
});