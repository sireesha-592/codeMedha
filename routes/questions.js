const router   = require('express').Router();
const Question = require('../models/Question');
const AssignmentConfig = require('../models/AssignmentConfig');
const auth     = require('../middleware/auth');

// ── POST /  — create one question ───────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const q = await Question.create(req.body);
    res.json(q);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── PUT /:id  — update one question ─────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const q = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(q);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── DELETE /:id  — delete one question ──────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    await Question.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── PUT /deadline/:courseId/:date  — Admin: set/update deadline ──────────────
// Must be BEFORE /:courseId/:date to avoid route conflict
// Body: { deadline: "2025-05-15T18:30:00.000Z" }  (ISO datetime, UTC) or null to reset
router.put('/deadline/:courseId/:date', auth, async (req, res) => {
  try {
    const { courseId, date } = req.params;
    const { deadline } = req.body;
    const config = await AssignmentConfig.findOneAndUpdate(
      { courseId, date },
      { deadline: deadline ? new Date(deadline) : null },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(config);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── GET /:courseId/:date  — fetch questions + deadline ───────────────────────
// Response: { questions: [...], deadline: <ISO string | null> }
// deadline null means "midnight of that date" (original fallback — frontend handles)
router.get('/:courseId/:date', auth, async (req, res) => {
  try {
    const { courseId, date } = req.params;
    const [questions, config] = await Promise.all([
      Question.find({ courseId, date }).sort({ section: 1, order: 1 }),
      AssignmentConfig.findOne({ courseId, date }),
    ]);
    res.json({ questions, deadline: config?.deadline ?? null });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;