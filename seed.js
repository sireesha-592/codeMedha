// Run: node seed_fresh.js
// Deletes ALL attendance for the student, inserts fresh 7 days present.

require('dotenv').config();
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  date:            { type: String, required: true },
  status:          { type: String, enum: ['present', 'absent'], required: true },
  watchedDuration: { type: Number, default: 0 },
  autoMarked:      { type: Boolean, default: false },
  markedByAdmin:   { type: Boolean, default: false },
  markedAt:        { type: Date },
}, { timestamps: true });
attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

const userSchema = new mongoose.Schema({
  name: String, email: String, role: String,
  enrolledCourse: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
}, { timestamps: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);
const User       = mongoose.model('User', userSchema);

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000, family: 4 });
  console.log('✅ Connected!\n');

  const student = await User.findOne({ role: { $in: ['student', 'trainee'] } });
  if (!student) { console.log('❌ No student found!'); process.exit(1); }
  console.log(`👤 Student: ${student.name} (${student._id})`);

  // Delete ALL existing attendance
  const deleted = await Attendance.deleteMany({ studentId: student._id });
  console.log(`🗑️  Deleted ${deleted.deletedCount} old records\n`);

  // Insert fresh 7 days
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  console.log('📅 Inserting:', dates.join(', '));

  for (const date of dates) {
    await Attendance.create({
      studentId: student._id,
      courseId:  student.enrolledCourse,
      date, status: 'present',
      watchedDuration: 60, markedByAdmin: true, markedAt: new Date(),
    });
    console.log(`  ✅ ${date} → present`);
  }

  console.log('\n🎉 Done! 7 fresh records. Refresh dashboard!');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(e => { console.error('❌', e.message); process.exit(1); });