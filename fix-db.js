/**
 * fix-db.js  — node fix-db.js (backend folder lo run cheyyandi)
 * ALL collections migrate chestundi: stale courseId → active courseId
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function migrate(Model, staleId, activeId, label) {
  const r1 = await Model.updateMany({ courseId: staleId },            { $set: { courseId: activeId } });
  const r2 = await Model.updateMany({ courseId: staleId.toString() }, { $set: { courseId: activeId } });
  const n = r1.modifiedCount + r2.modifiedCount;
  console.log(`  ${n > 0 ? '✅' : '⬜'} ${label}: ${n} docs migrated`);
  return n;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI, { family: 4 });
  console.log('✅ MongoDB connected\n');

  const Course  = require('./models/Course');
  const User    = require('./models/User');
  const ChatMsg = require('./models/ChatMessage');
  const Question= require('./models/Question');
  const AConfig = require('./models/AssignmentConfig');
  const ASub    = require('./models/AssignmentSubmission');
  let Att, DF, DC;
  try { Att = require('./models/Attendance');    } catch(e){}
  try { DF  = require('./models/DailyFeedback'); } catch(e){}
  try { DC  = require('./models/DailyClass');    } catch(e){}

  const courses = await Course.find().lean();
  if (!courses.length) { console.log('No courses in DB.'); process.exit(0); }

  const sorted = [...courses].sort((a,b) => (b.enrolledStudents?.length||0) - (a.enrolledStudents?.length||0));
  const active = sorted[0];
  const stales = sorted.slice(1);
  const activeId = active._id;

  console.log(`📌 Active course: "${active.title}" (${activeId}) students:${active.enrolledStudents?.length||0}`);

  // Collect ALL courseIds used in data collections (catches orphans even with 1 course)
  const allUsedIds = new Set();
  for (const M of [Question, AConfig, ASub, ChatMsg]) {
    const ids = await M.distinct('courseId');
    ids.forEach(id => allUsedIds.add(id.toString()));
  }
  const activeStr = activeId.toString();
  const orphanIds = [...allUsedIds].filter(id => id !== activeStr);

  if (stales.length === 0 && orphanIds.length === 0) {
    console.log('✅ Everything already uses the correct courseId!');
  }

  // Migrate stale courses
  for (const stale of stales) {
    console.log(`\n🔄 Migrating stale course "${stale.title}" (${stale._id}):`);
    await migrate(Question, stale._id, activeId, 'Questions');
    await migrate(AConfig,  stale._id, activeId, 'AssignmentConfigs');
    await migrate(ASub,     stale._id, activeId, 'AssignmentSubmissions');
    await migrate(ChatMsg,  stale._id, activeId, 'ChatMessages');
    if (Att) await migrate(Att, stale._id, activeId, 'Attendance');
    if (DF)  await migrate(DF,  stale._id, activeId, 'DailyFeedback');
    if (DC)  await migrate(DC,  stale._id, activeId, 'DailyClass');
    const ur = await User.updateMany({ enrolledCourse: stale._id }, { $set: { enrolledCourse: activeId } });
    if (ur.modifiedCount) console.log(`  ✅ Users.enrolledCourse: ${ur.modifiedCount} fixed`);
    await Course.findByIdAndDelete(stale._id);
    console.log(`  🗑  Deleted stale course`);
  }

  // Migrate orphan IDs (data pointing to non-existent courseIds)
  for (const orphanStr of orphanIds) {
    let orphanId;
    try { orphanId = new mongoose.Types.ObjectId(orphanStr); } catch(e) { orphanId = orphanStr; }
    console.log(`\n🔄 Migrating orphan courseId ${orphanStr}:`);
    await migrate(Question, orphanId, activeId, 'Questions');
    await migrate(AConfig,  orphanId, activeId, 'AssignmentConfigs');
    await migrate(ASub,     orphanId, activeId, 'AssignmentSubmissions');
    await migrate(ChatMsg,  orphanId, activeId, 'ChatMessages');
    if (Att) await migrate(Att, orphanId, activeId, 'Attendance');
    if (DF)  await migrate(DF,  orphanId, activeId, 'DailyFeedback');
    if (DC)  await migrate(DC,  orphanId, activeId, 'DailyClass');
  }

  // Sync User.enrolledCourse from Course.enrolledStudents
  for (const sid of (active.enrolledStudents || [])) {
    await User.updateOne({ _id: sid }, { $set: { enrolledCourse: activeId } });
  }
  console.log(`\n✅ User.enrolledCourse synced for all enrolled students`);

  console.log('\n📊 Final counts in active course:');
  console.log(`   Questions        : ${await Question.countDocuments({ courseId: activeId })}`);
  console.log(`   AssignmentConfigs: ${await AConfig.countDocuments({ courseId: activeId })}`);
  console.log(`   Submissions      : ${await ASub.countDocuments({ courseId: activeId })}`);
  console.log(`   ChatMessages     : ${await ChatMsg.countDocuments({ courseId: activeId })}`);

  await mongoose.disconnect();
  console.log('\n🎉 Done! Backend restart cheyyandi.');
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });