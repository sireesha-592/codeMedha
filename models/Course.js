const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title:            { type: String, required: true },
  description:      { type: String, default: '' },
  technologies:     [{ type: String }],           // e.g. ['MongoDB','Express','React','Node.js']
  syllabus:         [{ week: String, topics: String }], // week-wise syllabus
  teacherId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  totalClasses:     { type: Number, default: 0 },
  enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);