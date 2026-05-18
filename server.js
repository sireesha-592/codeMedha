const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');
require('dotenv').config();

const auth   = require('./middleware/auth');
const app    = express();
const server = http.createServer(app);

// ── Socket.IO ─────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: (origin, cb) => {
      if (!origin || ALLOWED_ORIGINS.some(o => origin.startsWith(o))) return cb(null, true);
      cb(new Error('socket CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  }
});
app.set('io', io);

// ── Middleware ────────────────────────────────────────────────
const ALLOWED_ORIGINS = ['http://localhost:3000','https://lms-codemedha.netlify.app', 'https://code-medha-frontend.vercel.app', 'capacitor://localhost', 'http://localhost', 'http://localhost:5000', 'file://', null];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.some(o => origin.startsWith(o))) return callback(null, true);
    callback(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/attendance',   require('./routes/attendance_backend'));
app.use('/api/courses',      require('./routes/courses'));
app.use('/api/assignments',  require('./routes/assignments'));
app.use('/api/classes',      require('./routes/dailyClass'));
app.use('/api/questions',    require('./routes/questions'));
app.use('/api/submissions',  require('./routes/submissions'));
app.use('/api/code-answers', require('./routes/codeAnswer'));
app.use('/api/trainer',      require('./routes/trainer'));
app.use('/api/chat',         require('./routes/chat'));
app.use('/api/daily-feedback', require('./routes/daily-feedback'));
app.use('/api/doubts',        require('./routes/doubts'));
app.use('/api/resources',     require('./routes/resources'));
app.use('/api/session-notes', require('./routes/session-notes'));
app.use('/api/sessions', require('./routes/sessions'));

// ── Weekly Report ─────────────────────────────────────────────
app.get('/api/weekly-report', auth, async (req, res) => {
  try {
    const Attendance = mongoose.model('Attendance');
    const Submission = mongoose.model('AssignmentSubmission');
    const userId = req.user.id;
    const now = new Date();
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      last7Days.push(d.toISOString().split('T')[0]);
    }
    const attRecords = await Attendance.find({ studentId: userId, date: { $in: last7Days } }).lean().catch(() => []);
    const dayNames   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyAtt  = last7Days.map(date => {
      const rec = attRecords.find(r => r.date === date);
      return { date, day: dayNames[new Date(date).getDay()], status: rec ? rec.status : 'no_data' };
    });
    const presentCount = weeklyAtt.filter(d => d.status === 'present').length;
    const absentCount  = weeklyAtt.filter(d => d.status === 'absent').length;
    const classDays    = weeklyAtt.filter(d => d.status !== 'no_class' && d.status !== 'no_data').length;
    const weekPct      = classDays > 0 ? Math.round((presentCount / classDays) * 100) : 0;
    const subs = await Submission.find({ traineeId: userId, date: { $in: last7Days } }).lean().catch(() => []);
    const weeklyTrend  = [];
    for (let w = 3; w >= 0; w--) {
      const weekDays = [];
      for (let d = 6; d >= 0; d--) {
        const day = new Date(now); day.setDate(now.getDate() - w * 7 - d);
        weekDays.push(day.toISOString().split('T')[0]);
      }
      const wRecs    = await Attendance.find({ studentId: userId, date: { $in: weekDays } }).lean().catch(() => []);
      const wPresent = wRecs.filter(r => r.status === 'present').length;
      const wClass   = wRecs.filter(r => r.status !== 'no_class').length;
      weeklyTrend.push({ week: `Week ${4 - w}`, pct: wClass > 0 ? Math.round((wPresent / wClass) * 100) : 0, present: wPresent, total: wClass });
    }
    res.json({
      period:      { from: last7Days[0], to: last7Days[6] },
      attendance:  { days: weeklyAtt, present: presentCount, absent: absentCount, percentage: weekPct },
      assignments: { submitted: subs.filter(s => s.status === 'submitted').length, pending: subs.filter(s => s.status !== 'submitted').length, total: subs.length },
      trend:       weeklyTrend,
    });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ── Socket.IO Events ──────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('🔌 Connected:', socket.id);

  // Personal room (for notifications etc.)
  socket.on('join-user', (userId) => {
    socket.join(`user-${userId}`);
  });

  // ── Join course chat room ──
  // Called by Trainee, Trainer, and Admin when they open Group Chat
  socket.on('join-course-chat', ({ courseId, userId, userName, userRole }) => {
    const roomId = String(courseId);  // always string
    socket.join(`course-${roomId}`);
    socket.data = { userId, userName, userRole, courseId: roomId };
    console.log(`💬 ${userName} (${userRole}) joined course-${roomId}`);
  });

  // ── Leave course chat room ──
  socket.on('leave-course-chat', ({ courseId }) => {
    socket.leave(`course-${courseId}`);
  });

  // ── Send message — saves to ChatMessage model + broadcasts ──
  socket.on('send-chat-message', async ({ courseId, senderId, senderName, senderRole, message, visibility }) => {
    try {
      if (!message?.trim()) return;

      const roomId = String(courseId);  // for socket room name (always string)
      // Save as ObjectId so the DB query (which uses ObjectId) finds it correctly
      const courseObjId = mongoose.Types.ObjectId.isValid(courseId)
        ? new mongoose.Types.ObjectId(courseId)
        : courseId;

      const ChatMessage = require('./models/ChatMessage');
      const msg = await ChatMessage.create({
        courseId: courseObjId,
        senderId,
        senderName,
        senderRole: senderRole || 'student',
        message:    message.trim(),
        visibility: visibility || 'everyone',
      });

      console.log(`📨 Message in course-${roomId} from ${senderName} (${senderRole}): "${message.trim()}"`);

      // broadcast to every socket in this course room — all IDs as strings
      io.to(`course-${roomId}`).emit('chat-message', {
        _id:        msg._id.toString(),
        courseId:   roomId,
        senderId:   msg.senderId?.toString(),
        senderName: msg.senderName,
        senderRole: msg.senderRole,
        message:    msg.message,
        visibility: msg.visibility,
        createdAt:  msg.createdAt,
      });
    } catch (err) {
      console.error('❌ Chat save error:', err.message);
      socket.emit('chat-error', { message: 'Failed to send message' });
    }
  });

  // ── Typing indicators ──
  socket.on('typing',      ({ courseId, userName }) =>
    socket.to(`course-${courseId}`).emit('user-typing',      { userName }));

  socket.on('stop-typing', ({ courseId }) =>
    socket.to(`course-${courseId}`).emit('user-stop-typing'));

  // ── Disconnect ──
  socket.on('disconnect', () => console.log('❌ Disconnected:', socket.id));
});

// ── MongoDB + Start ───────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000, family: 4 })
  .then(async () => {
    console.log('✅ MongoDB connected!');

    try {
      const Course      = require('./models/Course');
      const User        = require('./models/User');
      const ChatMessage = require('./models/ChatMessage');
      const courses     = await Course.find().lean();

      // Step 1: Find the active course (most enrolled students, fallback = first)
      const sorted = [...courses].sort(
        (a, b) => (b.enrolledStudents?.length || 0) - (a.enrolledStudents?.length || 0)
      );
      const activeCourse = sorted[0];
      const staleCourses = sorted.slice(1);

      if (!activeCourse) {
        console.log('⚠️  No courses found in DB');
      } else {
        console.log(`📌 Active course: "${activeCourse.title}" (${activeCourse._id}) | students: ${activeCourse.enrolledStudents?.length || 0}`);

        // Step 2: Migrate ALL data collections from stale courseIds → active courseId
        const migrateAll = async (staleId) => {
          const Question = require('./models/Question');
          const AConfig  = require('./models/AssignmentConfig');
          const ASub     = require('./models/AssignmentSubmission');
          let total = 0;
          for (const Model of [ChatMessage, Question, AConfig, ASub]) {
            const r1 = await Model.updateMany({ courseId: staleId },            { $set: { courseId: activeCourse._id } });
            const r2 = await Model.updateMany({ courseId: staleId.toString() }, { $set: { courseId: activeCourse._id } });
            total += r1.modifiedCount + r2.modifiedCount;
          }
          return total;
        };

        for (const stale of staleCourses) {
          const total = await migrateAll(stale._id);
          if (total > 0) console.log(`🔄 Migrated ${total} docs from ${stale._id} → ${activeCourse._id}`);
        }

        // Also check for orphan courseIds in data (handles cases where course was already deleted)
        const Question = require('./models/Question');
        const usedIds = await Question.distinct('courseId');
        for (const usedId of usedIds) {
          if (usedId.toString() !== activeCourse._id.toString()) {
            const total = await migrateAll(usedId);
            if (total > 0) console.log(`🔄 Migrated ${total} orphan docs from ${usedId} → ${activeCourse._id}`);
          }
        }

        // Step 3: Migrate User.enrolledCourse for any users still on stale courses
        for (const stale of staleCourses) {
          await User.updateMany(
            { enrolledCourse: stale._id },
            { $set: { enrolledCourse: activeCourse._id } }
          );
        }

        // Step 4: Sync User.enrolledCourse from Course.enrolledStudents (source of truth)
        for (const studentId of (activeCourse.enrolledStudents || [])) {
          await User.updateOne(
            { _id: studentId },
            { $set: { enrolledCourse: activeCourse._id } }
          );
        }
        console.log(`✅ enrolledCourse synced for all students → ${activeCourse._id}`);

        // Step 5: Delete stale courses
        for (const stale of staleCourses) {
          await Course.findByIdAndDelete(stale._id);
          console.log(`🗑  Deleted stale course: "${stale.title}" (${stale._id})`);
        }
      }
    } catch (e) {
      console.error('⚠️  Startup sync failed:', e.message);
    }

   const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('❌ DB Error:', err));
module.exports = { io };