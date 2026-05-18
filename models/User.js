const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['student', 'teacher', 'trainer', 'admin'], default: 'student' },
  branch:   { type: String },
  semester: { type: String },
  studentId:{ type: String },
  enrolledCourse: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  parentName:  { type: String, default: '' },
  parentPhone: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);