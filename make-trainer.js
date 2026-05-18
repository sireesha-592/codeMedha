/**
 * Run this script to update a user's role to 'trainer' in MongoDB
 * Usage: node make-trainer.js
 * Place this file inside: lms-app/backend/
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI, { family: 4 });
  console.log('Connected!\n');

  const db = mongoose.connection.db;
  const users = db.collection('users');

  // Show all users first
  console.log('=== ALL USERS IN DATABASE ===');
  const allUsers = await users.find({}).toArray();
  allUsers.forEach(u => {
    console.log(`  Name: ${u.name} | Email: ${u.email} | Role: ${u.role}`);
  });

  // Update Sirisha's role to trainer
  // Change the email below if different
  const EMAIL_TO_UPDATE = 'sirisha@gmail.com'; // <-- change this if needed

  const result = await users.updateOne(
    { email: EMAIL_TO_UPDATE },
    { $set: { role: 'trainer' } }
  );

  if (result.matchedCount === 0) {
    console.log(`\n❌ No user found with email: ${EMAIL_TO_UPDATE}`);
    console.log('   Check the emails above and update EMAIL_TO_UPDATE in this script.');
  } else {
    console.log(`\n✅ Updated! ${EMAIL_TO_UPDATE} is now role=trainer`);
    console.log('   Now logout and login again in the browser.');
    console.log('   She will be redirected to /trainer automatically.');
  }

  await mongoose.disconnect();
  console.log('Done!');
}

run().catch(console.error);
