/**
 * LMS Migration 2 — Clean duplicates then create indexes
 * Run: node migrate2.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function migrate() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected\n');

  const db = mongoose.connection.db;

  // ─── 1. Clean duplicate AssignmentSubmissions ────────────────
  console.log('📋 Cleaning duplicate assignmentsubmissions...');
  const subCol = db.collection('assignmentsubmissions');

  // Find all duplicates (same traineeId + date)
  const subDups = await subCol.aggregate([
    { $group: {
        _id: { traineeId: '$traineeId', date: '$date' },
        ids: { $push: '$_id' },
        count: { $sum: 1 }
    }},
    { $match: { count: { $gt: 1 } } }
  ]).toArray();

  console.log(`   Found ${subDups.length} duplicate groups in submissions`);

  for (const dup of subDups) {
    // Keep the latest one (last in array), delete the rest
    const toDelete = dup.ids.slice(0, -1);
    await subCol.deleteMany({ _id: { $in: toDelete } });
    console.log(`   🗑️  Deleted ${toDelete.length} duplicate(s) for date=${dup._id.date}`);
  }

  // Drop old index if exists
  try { await subCol.dropIndex('traineeId_1_date_1'); } catch(e) {}
  
  // Create fresh unique index
  await subCol.createIndex({ traineeId: 1, date: 1 }, { unique: true });
  console.log('   ✅ Created unique index traineeId+date\n');

  // ─── 2. Clean duplicate Attendances ─────────────────────────
  console.log('📋 Cleaning duplicate attendances...');
  const attCol = db.collection('attendances');

  const attDups = await attCol.aggregate([
    { $group: {
        _id: { studentId: '$studentId', date: '$date' },
        ids: { $push: '$_id' },
        count: { $sum: 1 }
    }},
    { $match: { count: { $gt: 1 } } }
  ]).toArray();

  console.log(`   Found ${attDups.length} duplicate groups in attendance`);

  for (const dup of attDups) {
    const toDelete = dup.ids.slice(0, -1);
    await attCol.deleteMany({ _id: { $in: toDelete } });
    console.log(`   🗑️  Deleted ${toDelete.length} duplicate(s) for date=${dup._id.date}`);
  }

  // Drop old index
  try { await attCol.dropIndex('studentId_1_date_1'); } catch(e) {}
  try { await attCol.dropIndex('studentId_1_courseId_1_date_1'); } catch(e) {}

  // Create fresh unique index
  await attCol.createIndex({ studentId: 1, date: 1 }, { unique: true });
  console.log('   ✅ Created unique index studentId+date\n');

  // ─── 3. Show current data summary ───────────────────────────
  console.log('📊 Current DB Summary:');
  const subTotal = await subCol.countDocuments();
  const attTotal = await attCol.countDocuments();
  const subSubmitted = await subCol.countDocuments({ status: 'submitted' });
  console.log(`   Submissions: ${subTotal} total, ${subSubmitted} submitted`);
  console.log(`   Attendance:  ${attTotal} records`);

  console.log('\n🎉 Migration 2 complete! Now restart your backend.\n');
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
