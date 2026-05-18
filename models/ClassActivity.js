const mongoose = require('mongoose');

const classActivitySchema = new mongoose.Schema({
  studentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  classId:      { type: mongoose.Schema.Types.ObjectId, ref: 'DailyClass', required: true },
  courseId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  date:         { type: String, required: true }, // "YYYY-MM-DD"
  opened:       { type: Boolean, default: false }, // did trainee open the class page
  openedAt:     { type: Date },                    // first time opened
  watchedSeconds: { type: Number, default: 0 },   // total seconds watched
  classDuration:  { type: Number, default: 0 },   // total video duration in seconds
  watchedPercent: { type: Number, default: 0 },   // watchedSeconds / classDuration * 100
  lastUpdated:  { type: Date, default: Date.now },
}, { timestamps: true });

// One record per student per class
classActivitySchema.index({ studentId: 1, classId: 1 }, { unique: true });

module.exports = mongoose.model('ClassActivity', classActivitySchema);