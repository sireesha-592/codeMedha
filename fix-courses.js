// Run once: node fix-courses.js
// Deletes DBMS/OS courses, creates MERN Full Stack, enrolls all trainees

require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI;

async function fixCourses() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected\n');

  // 1. Show current state
  const allCourses = await Course.find({});
  const students = await User.find({ role: 'student' });

  console.log('📋 Current courses in DB:');
  allCourses.forEach(c => console.log(`   - "${c.title}" (${c._id}) | enrolled: ${c.enrolledStudents?.length || 0}`));

  console.log('\n👥 Trainees:');
  students.forEach(s => console.log(`   - ${s.name} | enrolledCourse: ${s.enrolledCourse || 'NONE'}`));

  // 2. Check if MERN already exists
  let mernCourse = allCourses.find(c =>
    c.title.toLowerCase().includes('mern') ||
    c.title.toLowerCase().includes('full stack')
  );

  if (!mernCourse) {
    console.log('\n➕ Creating MERN Full Stack Development course...');
    mernCourse = await Course.create({
      title: 'MERN Full Stack Development',
      description: 'Master the complete MERN stack — MongoDB, Express.js, React, Node.js. Build and deploy full-stack web applications.',
      technologies: ['MongoDB', 'Express.js', 'React', 'Node.js', 'JavaScript', 'HTML5', 'CSS3', 'Git', 'REST API', 'JWT', 'Socket.IO'],
      syllabus: [
        { week: 'Week 1-2',   topics: 'HTML5, CSS3, Flexbox, Grid, Responsive Design' },
        { week: 'Week 3-4',   topics: 'JavaScript ES6+, DOM, Fetch API, Async/Await' },
        { week: 'Week 5-7',   topics: 'React — Components, Hooks, Router, Axios' },
        { week: 'Week 8-10',  topics: 'Node.js, Express.js, REST APIs, JWT Auth' },
        { week: 'Week 11-12', topics: 'MongoDB, Mongoose, CRUD, Aggregation' },
        { week: 'Week 13-14', topics: 'Full Stack Integration, Socket.IO, Deployment' },
      ],
      enrolledStudents: students.map(s => s._id),
    });
    console.log(`✅ Created: "${mernCourse.title}" (${mernCourse._id})`);
  } else {
    console.log(`\n✏️  Updating existing course: "${mernCourse.title}"`);
    mernCourse.title = 'MERN Full Stack Development';
    if (!mernCourse.technologies || mernCourse.technologies.length === 0) {
      mernCourse.technologies = ['MongoDB', 'Express.js', 'React', 'Node.js', 'JavaScript', 'HTML5', 'CSS3', 'Git', 'REST API', 'JWT', 'Socket.IO'];
    }
    if (!mernCourse.syllabus || mernCourse.syllabus.length === 0) {
      mernCourse.syllabus = [
        { week: 'Week 1-2',   topics: 'HTML5, CSS3, Flexbox, Grid, Responsive Design' },
        { week: 'Week 3-4',   topics: 'JavaScript ES6+, DOM, Fetch API, Async/Await' },
        { week: 'Week 5-7',   topics: 'React — Components, Hooks, Router, Axios' },
        { week: 'Week 8-10',  topics: 'Node.js, Express.js, REST APIs, JWT Auth' },
        { week: 'Week 11-12', topics: 'MongoDB, Mongoose, CRUD, Aggregation' },
        { week: 'Week 13-14', topics: 'Full Stack Integration, Socket.IO, Deployment' },
      ];
    }
    mernCourse.enrolledStudents = students.map(s => s._id);
    await mernCourse.save();
    console.log(`✅ Updated: "${mernCourse.title}" (${mernCourse._id})`);
  }

  // 3. Delete DBMS, Operating System courses
  console.log('\n🗑  Deleting wrong courses...');
  const toDelete = allCourses.filter(c =>
    c._id.toString() !== mernCourse._id.toString()
  );
  if (toDelete.length === 0) {
    console.log('   ℹ️  No other courses to delete');
  }
  for (const c of toDelete) {
    await Course.findByIdAndDelete(c._id);
    console.log(`   🗑  Deleted: "${c.title}"`);
  }

  // 4. Enroll all students in MERN course
  console.log('\n👥 Enrolling trainees...');
  for (const student of students) {
    await User.findByIdAndUpdate(student._id, { enrolledCourse: mernCourse._id });
    console.log(`   ✅ ${student.name} → enrolled in MERN Full Stack`);
  }

  console.log('\n🎉 Done! All fixed.');
  console.log(`\nSummary:`);
  console.log(`   Course: "MERN Full Stack Development" (${mernCourse._id})`);
  console.log(`   Trainees enrolled: ${students.length}`);
  process.exit(0);
}

fixCourses().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
