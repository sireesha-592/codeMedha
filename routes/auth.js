const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Course = require('../models/Course');
const auth = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, branch, semester, studentId } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, role, branch, semester, studentId });
    res.json({ message: 'User created', user });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Wrong password' });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update user enrolled course
router.put('/enroll', auth, async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.user.id;

    // Remove student from old course's enrolledStudents (if any)
    const oldUser = await User.findById(userId).lean();
    if (oldUser?.enrolledCourse) {
      await Course.findByIdAndUpdate(oldUser.enrolledCourse, {
        $pull: { enrolledStudents: userId }
      });
    }

    // Update user's enrolledCourse
    const user = await User.findByIdAndUpdate(
      userId,
      { enrolledCourse: courseId },
      { new: true }
    );

    // Add student to new course's enrolledStudents (avoid duplicates)
    await Course.findByIdAndUpdate(courseId, {
      $addToSet: { enrolledStudents: userId }
    });

    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get current user (fresh from DB — ensures enrolledCourse is populated)
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update user name/details (including parent info)
router.put('/update', auth, async (req, res) => {
  try {
    const { name, parentName, parentPhone } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.user.id,
      {
        ...(name        && { name }),
        ...(parentName  !== undefined && { parentName }),
        ...(parentPhone !== undefined && { parentPhone }),
      },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/auth/fix-enrollments — repairs stale user.enrolledCourse fields
// Run once: ensures user.enrolledCourse matches Course.enrolledStudents array
router.post('/fix-enrollments', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const Course = require('../models/Course');
    const courses = await Course.find().lean();
    let fixed = 0;
    for (const course of courses) {
      for (const studentId of (course.enrolledStudents || [])) {
        const updated = await User.findByIdAndUpdate(
          studentId,
          { enrolledCourse: course._id },
          { new: true }
        );
        if (updated) {
          console.log(`✅ Fixed ${updated.name}: enrolledCourse → ${course._id} (${course.title})`);
          fixed++;
        }
      }
    }
    res.json({ message: `Fixed ${fixed} student(s)`, fixed });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// Admin dashboard stats
router.get('/admin-stats', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    const users = await User.find({});
    const students = users.filter(u => u.role === 'student').length;
    const trainers = users.filter(u => u.role === 'trainer' || u.role === 'teacher').length;
    res.json({ students, trainers, total: users.length });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;