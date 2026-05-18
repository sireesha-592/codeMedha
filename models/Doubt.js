const mongoose = require('mongoose');

const doubtSchema = new mongoose.Schema({
  courseId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  studentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentName: { type: String },
  question:    { type: String, required: true },
  priority:    { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  status:      { type: String, enum: ['pending', 'resolved'], default: 'pending' },
  answer:      { type: String, default: '' },
  resolvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt:  { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Doubt', doubtSchema);