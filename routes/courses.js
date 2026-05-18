const router = require('express').Router();
const Course = require('../models/Course');
const auth   = require('../middleware/auth');

// GET /api/courses — Admin/Trainer → all, Student → enrolled
router.get('/', auth, async (req, res) => {
  try {
    const { id, role } = req.user;
    if (role === 'admin' || role === 'trainer' || role === 'teacher') {
      const courses = await Course.find().lean();
      return res.json(courses);
    }
    const courses = await Course.find({ enrolledStudents: id }).lean();
    return res.json(courses);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// GET /api/courses/id/:courseId — get single course by ID
router.get('/id/:courseId', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId).lean();
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// GET /api/courses/:studentId — backward compat
router.get('/:studentId', auth, async (req, res) => {
  try {
    const courses = await Course.find({ enrolledStudents: req.params.studentId }).lean();
    res.json(courses);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// POST /api/courses
router.post('/', auth, async (req, res) => {
  try {
    const course = await Course.create(req.body);
    res.json(course);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// PUT /api/courses/:courseId — update course info
router.put('/:courseId', auth, async (req, res) => {
  try {
    const { title, description, technologies, syllabus } = req.body;
    const id = req.params.courseId;
    if (!id || id.length !== 24) return res.status(400).json({ message: 'Invalid course ID: ' + id });
    const course = await Course.findByIdAndUpdate(
      id,
      { $set: { title, description, technologies: technologies || [], syllabus: syllabus || [] } },
      { new: true, runValidators: false }
    );
    if (!course) return res.status(404).json({ message: 'Course not found for ID: ' + id });
    res.json(course);
  } catch (err) {
    console.error('PUT /courses error:', err.message);
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/courses/:courseId
router.delete('/:courseId', auth, async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json({ message: 'Course deleted' });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

module.exports = router;