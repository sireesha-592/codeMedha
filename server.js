const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

const auth = require('./middleware/auth');

const app = express();
const server = http.createServer(app);

// ── Socket.IO Setup ──
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io accessible in routes
app.set('io', io);

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/attendance',  require('./routes/attendance_backend'));
app.use('/api/courses',     require('./routes/courses'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/classes',     require('./routes/dailyClass'));
app.use('/api/questions',   require('./routes/questions'));
app.use('/api/submissions', require('./routes/submissions'));

// ── Weekly Report Route ──
app.get('/api/weekly-report', auth, async (req, res) => {
  try {
    const Attendance = mongoose.model('Attendance');
    const Submission = mongoose.model('AssignmentSubmission');

    const userId = req.user.id;
    const now = new Date();

    // Last 7 days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      last7Days.push(d.toISOString().split('T')[0]);
    }

    // Attendance records for this week (field is 'studentId' in Attendance model)
    const attRecords = await Attendance.find({
      studentId: userId,
      date: { $in: last7Days }
    }).lean().catch(() => []);

    const weeklyAtt = last7Days.map(date => {
      const rec = attRecords.find(r => r.date === date);
      const d = new Date(date);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return {
        date,
        day: days[d.getDay()],
        status: rec ? rec.status : 'no_data'
      };
    });

    const presentCount = weeklyAtt.filter(d => d.status === 'present').length;
    const absentCount  = weeklyAtt.filter(d => d.status === 'absent').length;
    const classDays    = weeklyAtt.filter(d => d.status !== 'no_class' && d.status !== 'no_data').length;
    const weekPct      = classDays > 0 ? Math.round((presentCount / classDays) * 100) : 0;

    // Submissions this week (field is 'traineeId' in AssignmentSubmission model)
    const subs = await Submission.find({
      traineeId: userId,
      date: { $in: last7Days }
    }).lean().catch(() => []);

    const submitted = subs.filter(s => s.status === 'submitted').length;
    const pending   = subs.filter(s => s.status !== 'submitted').length;

    // Last 4 weeks comparison
    const weeklyTrend = [];
    for (let w = 3; w >= 0; w--) {
      const weekDays = [];
      for (let d = 6; d >= 0; d--) {
        const day = new Date(now);
        day.setDate(now.getDate() - (w * 7) - d);
        weekDays.push(day.toISOString().split('T')[0]);
      }
      const wRecords = await Attendance.find({ studentId: userId, date: { $in: weekDays } }).lean().catch(() => []);
      const wPresent = wRecords.filter(r => r.status === 'present').length;
      const wClass   = wRecords.filter(r => r.status !== 'no_class').length;
      weeklyTrend.push({
        week: `Week ${4 - w}`,
        pct: wClass > 0 ? Math.round((wPresent / wClass) * 100) : 0,
        present: wPresent,
        total: wClass
      });
    }

    res.json({
      period: { from: last7Days[0], to: last7Days[6] },
      attendance: {
        days: weeklyAtt,
        present: presentCount,
        absent: absentCount,
        percentage: weekPct
      },
      assignments: { submitted, pending, total: subs.length },
      trend: weeklyTrend
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch weekly report' });
  }
});

// ── Socket.IO Events ──
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-user', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined their room`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// MongoDB connect
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  family: 4
})
  .then(() => {
    console.log('MongoDB connected!');
    server.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch(err => console.log('DB Error:', err));

module.exports = { io };
