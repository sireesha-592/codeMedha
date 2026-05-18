const mongoose = require('mongoose');

// Stores the deadline (and any future per-assignment config) for a given course+date.
// One document per (courseId, date) pair.
const assignmentConfigSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  date:     { type: String, required: true },          // "YYYY-MM-DD"
  deadline: { type: Date,   default: null },           // null = midnight of that date (original behaviour)
}, { timestamps: true });

assignmentConfigSchema.index({ courseId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('AssignmentConfig', assignmentConfigSchema);