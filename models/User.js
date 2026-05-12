const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['student', 'teacher'], default: 'student' },
  branch:   { type: String },
  semester: { type: String },
  studentId:{ type: String },
  enrolledCourse: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);