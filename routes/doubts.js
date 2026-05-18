const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const Doubt   = require('../models/Doubt');

const trainerOnly = (req, res, next) => {
  if (['teacher', 'trainer', 'admin'].includes(req.user.role)) return next();
  res.status(403).json({ message: 'Trainer access required' });
};

// ── Trainee: submit a doubt ────────────────────────────────────
// POST /api/doubts
router.post('/', auth, async (req, res) => {
  try {
    const { courseId, question, priority } = req.body;
    if (!courseId || !question) return res.status(400).json({ message: 'courseId and question required' });
    const doubt = await Doubt.create({
      courseId,
      studentId:   req.user.id,
      studentName: req.user.name,
      question,
      priority: priority || 'medium',
    });
    res.status(201).json(doubt);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── Trainee: get my doubts ─────────────────────────────────────
// GET /api/doubts/mine?courseId=...
router.get('/mine', auth, async (req, res) => {
  try {
    const { courseId } = req.query;
    const filter = { studentId: req.user.id };
    if (courseId) filter.courseId = courseId;
    const doubts = await Doubt.find(filter).sort({ createdAt: -1 });
    res.json(doubts);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── Trainer: get all doubts for a course ──────────────────────
// GET /api/doubts?courseId=...&status=pending
router.get('/', auth, trainerOnly, async (req, res) => {
  try {
    const { courseId, status } = req.query;
    const filter = {};
    if (courseId) filter.courseId = courseId;
    if (status && status !== 'all') filter.status = status;
    const doubts = await Doubt.find(filter)
      .populate('studentId', 'name email')
      .sort({ createdAt: -1 });
    res.json(doubts);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── Trainer: resolve a doubt ───────────────────────────────────
// PATCH /api/doubts/:id/resolve
router.patch('/:id/resolve', auth, trainerOnly, async (req, res) => {
  try {
    const { answer } = req.body;
    const doubt = await Doubt.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved', answer: answer || '', resolvedBy: req.user.id, resolvedAt: new Date() },
      { new: true }
    ).populate('studentId', 'name email');
    if (!doubt) return res.status(404).json({ message: 'Doubt not found' });
    res.json(doubt);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── Trainer: delete a doubt ────────────────────────────────────
// DELETE /api/doubts/:id
router.delete('/:id', auth, trainerOnly, async (req, res) => {
  try {
    await Doubt.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;