const router = require('express').Router();
const Question = require('../models/Question');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  try {
    const q = await Question.create(req.body);
    res.json(q);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const q = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(q);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Question.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/:courseId/:date', auth, async (req, res) => {
  try {
    const questions = await Question.find({
      courseId: req.params.courseId,
      date: req.params.date,
    }).sort({ section: 1, order: 1 });
    res.json(questions);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;