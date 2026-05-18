const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  courseId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  trainerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:       { type: String, required: true },
  url:         { type: String, default: '' },
  type:        { type: String, enum: ['link', 'pdf', 'video', 'note', 'tool'], default: 'link' },
  desc:        { type: String, default: '' },
  tag:         { type: String, default: '' },
  sharedWithStudents: { type: Boolean, default: true },
  fileName: { type: String, default: '' },
  fileSize: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Resource', resourceSchema);