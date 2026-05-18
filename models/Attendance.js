const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Course' }, // optional
  date:            { type: String, required: true }, // "YYYY-MM-DD"
  status:          { type: String, enum: ['present', 'absent'], required: true },
  watchedDuration: { type: Number, default: 0 },     // seconds watched
  autoMarked:      { type: Boolean, default: false }, // true = marked by video play
  markedByAdmin:   { type: Boolean, default: false }, // true = admin has finalized this, cannot change
  markedAt:        { type: Date },                    // when admin finalized
}, { timestamps: true });

// One record per student per date
attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);