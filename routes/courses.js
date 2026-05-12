const router = require('express').Router();
const Course = require('../models/Course');
const auth = require('../middleware/auth');

// Get all courses for a student
router.get('/:studentId', auth, async (req, res) => {
  try {
    const courses = await Course.find({ enrolledStudents: req.params.studentId });
    res.json(courses);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Create a course (teacher)
router.post('/', auth, async (req, res) => {
  try {
    const course = await Course.create(req.body);
    res.json(course);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;