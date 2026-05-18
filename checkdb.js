/**
 * DB Check Script — submissions & attendance data చూపిస్తుంది
 * Run: node checkdb.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function check() {
  console.log('🔌 Connecting...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected\n');

  const db = mongoose.connection.db;
  const subCol = db.collection('assignmentsubmissions');
  const attCol = db.collection('attendances');

  // Show all submissions raw
  console.log('═══ SUBMISSIONS (all) ═══');
  const subs = await subCol.find({}).toArray();
  subs.forEach(s => {
    console.log({
      _id: s._id,
      traineeId: s.traineeId,
      userId: s.userId,       // old field still there?
      date: s.date,
      status: s.status,
      secA_answered: s.secA?.answered,
      secB_answered: s.secB?.answered,
      secC_answered: s.secC?.answered,
      submittedAt: s.submittedAt,
      createdAt: s.createdAt,
    });
  });

  console.log('\n═══ ATTENDANCE (all) ═══');
  const atts = await attCol.find({}).toArray();
  atts.forEach(a => {
    console.log({
      studentId: a.studentId,
      date: a.date,
      status: a.status,
      courseId: a.courseId,
    });
  });

  console.log('\n═══ INDEXES ═══');
  const subIdx = await subCol.indexes();
  console.log('Submission indexes:', subIdx.map(i => i.name));
  const attIdx = await attCol.indexes();
  console.log('Attendance indexes:', attIdx.map(i => i.name));

  await mongoose.disconnect();
}

check().catch(err => { console.error(err); process.exit(1); });
