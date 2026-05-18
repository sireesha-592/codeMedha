/**
 * Setup Script:
 * 1. Teacher account create చేస్తుంది (లేకపోతే)
 * 2. Yesterday submission details చూపిస్తుంది
 * Run: node setup.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected\n');
  const db = mongoose.connection.db;

  // ─── 1. Create teacher account ───────────────────────────
  console.log('👤 Checking teacher account...');
  const users = db.collection('users');
  
  const existing = await users.findOne({ role: { $in: ['teacher','trainer','admin'] } });
  if (existing) {
    console.log(`   ✅ Teacher already exists: ${existing.name} (${existing.email}) role=${existing.role}`);
  } else {
    const hashed = await bcrypt.hash('Trainer@123', 10);
    await users.insertOne({
      name: 'Trainer',
      email: 'trainer@lms.com',
      password: hashed,
      role: 'teacher',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('   ✅ Teacher account created!');
    console.log('   📧 Email: trainer@lms.com');
    console.log('   🔑 Password: Trainer@123');
  }

  // ─── 2. Show yesterday submission details ────────────────
  console.log('\n📋 Submission answers check...');
  const subCol = db.collection('assignmentsubmissions');
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yDate = yesterday.toISOString().split('T')[0];
  
  const sub = await subCol.findOne({ date: yDate });
  if (!sub) {
    console.log(`   No submission found for ${yDate}`);
    // Show most recent submission with answers
    const recent = await subCol.findOne({ 'secA.answered': { $gt: 0 } });
    if (recent) {
      console.log(`   Most recent submission WITH answers: date=${recent.date}`);
      const sample = recent.secA?.answers?.slice(0,2) || [];
      sample.forEach((a,i) => console.log(`   Q${i+1}: "${a.answerText?.substring(0,50)}" isAnswered=${a.isAnswered}`));
    } else {
      console.log('   ❌ No submissions have answers saved at all!');
      console.log('   This means Save button was never clicked in the assignment page.');
    }
  } else {
    console.log(`   Submission for ${yDate}:`);
    console.log(`   status=${sub.status} secA.answered=${sub.secA?.answered}`);
    const sample = sub.secA?.answers?.slice(0,3) || [];
    if (sample.length === 0) {
      console.log('   ❌ No answers in secA at all!');
    } else {
      sample.forEach((a,i) => console.log(`   Q${i+1}: "${a.answerText?.substring(0,60)}" isAnswered=${a.isAnswered}`));
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
