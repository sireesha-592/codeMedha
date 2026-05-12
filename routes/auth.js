const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
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
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { enrolledCourse: req.body.courseId },
      { new: true }
    );
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update user name/details
router.put('/update', auth, async (req, res) => {
  try {
    const { name } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { ...(name && { name }) },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;