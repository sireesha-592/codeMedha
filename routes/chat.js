const express      = require('express');
const router       = express.Router();
const auth         = require('../middleware/auth');
const ChatMessage  = require('../models/ChatMessage');
const mongoose     = require('mongoose');

// ── visibility filter ─────────────────────────────────────────
const canSee = (msg, user) => {
  const role = user.role || 'student';
  const uid  = (user._id || user.id)?.toString();
  if (role === 'admin') return true;
  if (msg.visibility === 'everyone') return true;
  if (msg.visibility === 'trainer' && (role === 'teacher' || role === 'trainer')) return true;
  if ((msg.visibility === 'trainer' || msg.visibility === 'admin') &&
       msg.senderId?.toString() === uid) return true;
  return false;
};

// GET /api/chat/active-course — returns the single canonical course for group chat
// Source of truth: Course.enrolledStudents array (NOT user.enrolledCourse which may be stale)
router.get('/active-course', auth, async (req, res) => {
  try {
    const Course = require('../models/Course');
    const { id, role } = req.user;

    const courses = await Course.find().lean();
    if (!courses.length) return res.status(404).json({ message: 'No courses found' });

    let best;

    if (role === 'student') {
      // For student: find the course where THEY are in enrolledStudents array
      const enrolled = courses.find(c =>
        c.enrolledStudents?.some(sid => sid.toString() === id.toString())
      );
      best = enrolled || courses[0];
    } else {
      // For admin/trainer/teacher: pick course with most enrolled students
      const withStudents = courses.filter(c => (c.enrolledStudents?.length || 0) > 0);
      best = withStudents.length > 0
        ? withStudents.reduce((a, b) => b.enrolledStudents.length > a.enrolledStudents.length ? b : a)
        : courses[0];
    }

    console.log(`📌 active-course for ${role} (${id}): "${best.title}" (${best._id}) | enrolled: ${best.enrolledStudents?.length || 0}`);
    return res.json({ courseId: best._id.toString(), title: best.title });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get('/:courseId', auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const limit = parseInt(req.query.limit) || 100;

    // Accept courseId whether stored as ObjectId or plain string
    let query;
    if (mongoose.Types.ObjectId.isValid(courseId)) {
      query = {
        $or: [
          { courseId: new mongoose.Types.ObjectId(courseId) },
          { courseId: courseId },
        ]
      };
    } else {
      query = { courseId };
    }

    const all = await ChatMessage.find(query)
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();

    const visible = all.filter(m => canSee(m, req.user));
    res.json(visible);
  } catch (err) {
    console.error('Chat GET error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/chat/:courseId  — REST send (fallback) ──────────
router.post('/:courseId', auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { message, visibility } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message required' });

    const msg = await ChatMessage.create({
      courseId,
      senderId:   req.user._id || req.user.id,
      senderName: req.user.name,
      senderRole: req.user.role || 'student',
      message:    message.trim(),
      visibility: visibility || 'everyone',
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`course-${courseId}`).emit('chat-message', {
        _id:        msg._id,
        courseId:   msg.courseId,
        senderId:   msg.senderId,
        senderName: msg.senderName,
        senderRole: msg.senderRole,
        message:    msg.message,
        visibility: msg.visibility,
        createdAt:  msg.createdAt,
      });
    }

    res.status(201).json(msg);
  } catch (err) {
    console.error('Chat POST error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/chat/:courseId/:msgId ─────────────────────────
router.delete('/:courseId/:msgId', auth, async (req, res) => {
  try {
    const msg = await ChatMessage.findById(req.params.msgId);
    if (!msg) return res.status(404).json({ message: 'Not found' });

    const uid     = (req.user._id || req.user.id)?.toString();
    const isOwner = msg.senderId?.toString() === uid;
    const isPriv  = ['admin', 'trainer', 'teacher'].includes(req.user.role);

    if (!isOwner && !isPriv) return res.status(403).json({ message: 'Not allowed' });

    await msg.deleteOne();

    const io = req.app.get('io');
    if (io) io.to(`course-${req.params.courseId}`).emit('chat-message-deleted', { _id: req.params.msgId });

    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;