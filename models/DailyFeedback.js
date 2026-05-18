const mongoose = require('mongoose');

const DailyFeedbackSchema = new mongoose.Schema({
  courseId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  traineeId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
  date:       { type: String, required: true },   // "YYYY-MM-DD"
  feedback:   { type: String, required: true },
  rating:     { type: Number, min: 1, max: 5, default: null },
  adminId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:  { type: Date, default: Date.now },
  updatedAt:  { type: Date, default: Date.now },
});

DailyFeedbackSchema.index({ courseId: 1, traineeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyFeedback', DailyFeedbackSchema);