const mongoose = require('mongoose');

const sessionNoteSchema = new mongoose.Schema({
  courseId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  trainerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:       { type: String, required: true }, // 'YYYY-MM-DD'
  topic:      { type: String, required: true },
  content:    { type: String, required: true },
  tags:       [{ type: String }],
  sharedWithStudents: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('SessionNote', sessionNoteSchema);