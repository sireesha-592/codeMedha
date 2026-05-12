const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  date:      { type: String, required: true }, // format: "2024-04-14"
  status:    { type: String, enum: ['present', 'absent'], required: true }
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);