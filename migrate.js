/**
 * LMS Migration Script
 * Run this ONCE in your backend folder:
 *   node migrate.js
 *
 * What it does:
 * 1. assignmentsubmissions: renames userId → traineeId
 * 2. attendances: removes unique index on studentId+date+courseId,
 *    adds new unique index on studentId+date only
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/lmsdb';

async function migrate() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected\n');

  const db = mongoose.connection.db;

  // ─── 1. Fix AssignmentSubmissions: userId → traineeId ───────────
  console.log('📋 Fixing assignmentsubmissions...');
  const subCol = db.collection('assignmentsubmissions');
  
  const subCount = await subCol.countDocuments({ userId: { $exists: true } });
  console.log(`   Found ${subCount} submissions with old userId field`);
  
  if (subCount > 0) {
    await subCol.updateMany(
      { userId: { $exists: true } },
      [{ $set: { traineeId: '$userId' } }]
    );
    await subCol.updateMany(
      { userId: { $exists: true } },
      { $unset: { userId: '' } }
    );
    console.log(`   ✅ Renamed userId → traineeId for ${subCount} submissions`);
  } else {
    console.log('   ℹ️  No old submissions found — skipping');
  }

  // Drop old index if exists (assignmentId+userId)
  try {
    await subCol.dropIndex('assignmentId_1_userId_1');
    console.log('   ✅ Dropped old index assignmentId+userId');
  } catch (e) {
    console.log('   ℹ️  Old index not found — skipping');
  }

  // Create new index: traineeId + date (unique)
  try {
    await subCol.createIndex({ traineeId: 1, date: 1 }, { unique: true });
    console.log('   ✅ Created new index traineeId+date');
  } catch (e) {
    console.log('   ℹ️  Index already exists:', e.message);
  }

  // ─── 2. Fix Attendances: make courseId optional ──────────────────
  console.log('\n📋 Fixing attendances...');
  const attCol = db.collection('attendances');

  // Drop old unique index that included courseId (if any)
  try {
    await attCol.dropIndex('studentId_1_courseId_1_date_1');
    console.log('   ✅ Dropped old attendance index');
  } catch (e) {
    console.log('   ℹ️  Old attendance index not found — skipping');
  }

  // Create new index: studentId + date (unique) 
  try {
    await attCol.createIndex({ studentId: 1, date: 1 }, { unique: true });
    console.log('   ✅ Created new attendance index studentId+date');
  } catch (e) {
    console.log('   ℹ️  Index already exists:', e.message);
  }

  console.log('\n🎉 Migration complete!\n');
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
