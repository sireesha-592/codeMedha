const express     = require('express');
const router      = express.Router();
const auth        = require('../middleware/auth');
const SessionNote = require('../models/SessionNote');

const trainerOnly = (req, res, next) => {
  if (['teacher', 'trainer', 'admin'].includes(req.user.role)) return next();
  res.status(403).json({ message: 'Trainer access required' });
};

// ── Trainer: create session note ──────────────────────────────
// POST /api/session-notes
router.post('/', auth, trainerOnly, async (req, res) => {
  try {
    const { courseId, date, topic, content, tags, sharedWithStudents } = req.body;
    if (!courseId || !topic || !content) return res.status(400).json({ message: 'courseId, topic and content required' });
    const note = await SessionNote.create({
      courseId, trainerId: req.user.id,
      date: date || new Date().toISOString().split('T')[0],
      topic, content,
      tags: tags || [],
      sharedWithStudents: sharedWithStudents !== false && sharedWithStudents !== 'false',
    });
    res.status(201).json(note);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── GET notes ─────────────────────────────────────────────────
// Trainer gets all; trainee gets only sharedWithStudents=true
// GET /api/session-notes?courseId=...
router.get('/', auth, async (req, res) => {
  try {
    const { courseId } = req.query;
    const filter = {};
    if (courseId) filter.courseId = courseId;

    const isTrainer = ['teacher', 'trainer', 'admin'].includes(req.user.role);
    if (!isTrainer) filter.sharedWithStudents = true;

    const notes = await SessionNote.find(filter).sort({ date: -1, createdAt: -1 });
    res.json(notes);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── Trainer: update note ──────────────────────────────────────
// PATCH /api/session-notes/:id
router.patch('/:id', auth, trainerOnly, async (req, res) => {
  try {
    const note = await SessionNote.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!note) return res.status(404).json({ message: 'Not found' });
    res.json(note);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── Trainer: delete note ──────────────────────────────────────
// DELETE /api/session-notes/:id
router.delete('/:id', auth, trainerOnly, async (req, res) => {
  try {
    await SessionNote.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;