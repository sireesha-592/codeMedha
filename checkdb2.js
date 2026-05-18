require('dotenv').config();
const mongoose = require('mongoose');
const MONGO_URI = process.env.MONGO_URI;

async function check() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  console.log('═══ QUESTIONS ═══');
  const questions = await db.collection('questions').find({}).toArray();
  console.log(`Total questions: ${questions.length}`);
  questions.slice(0,5).forEach(q => console.log({
    courseId: q.courseId,
    date: q.date,
    section: q.section,
    text: q.text?.substring(0,40),
  }));

  console.log('\n═══ COURSES ═══');
  const courses = await db.collection('courses').find({}).toArray();
  courses.forEach(c => console.log({ _id: c._id, title: c.title }));

  console.log('\n═══ USERS ═══');
  const users = await db.collection('users').find({}).toArray();
  users.forEach(u => console.log({ _id: u._id, name: u.name, role: u.role, enrolledCourse: u.enrolledCourse }));

  console.log('\n═══ ASSIGNMENTS ═══');
  const assignments = await db.collection('assignments').find({}).toArray();
  console.log(`Total: ${assignments.length}`);
  assignments.slice(0,5).forEach(a => console.log({ date: a.date, courseId: a.courseId, title: a.title }));

  await mongoose.disconnect();
}
check().catch(console.error);
