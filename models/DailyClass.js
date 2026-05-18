const mongoose = require('mongoose');

const dailyClassSchema = new mongoose.Schema({
  courseId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  date:        { type: String, required: true },
  videoPath:   { type: String, required: true },
  title:       { type: String, required: true },
  isActive:            { type: Boolean, default: true },
  expiresAt:           { type: Date, required: true },
  attendanceDeadline:  { type: Date, default: null }, // admin sets deadline for watching; after this, admin marks attendance
}, { timestamps: true });

module.exports = mongoose.model('DailyClass', dailyClassSchema);