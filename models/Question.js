const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  courseId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  date:      { type: String, required: true },
  section:   { type: String, enum: ['A', 'B', 'C'], required: true },
  text:      { type: String, required: true },
  marks:     { type: Number, required: true },
  order:     { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);