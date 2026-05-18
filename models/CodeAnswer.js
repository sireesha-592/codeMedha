const mongoose = require('mongoose');

const codeAnswerSchema = new mongoose.Schema({
  traineeId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questionId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  courseId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  date:        { type: String, required: true },
  code: {
    html:        { type: String, default: '' },
    css:         { type: String, default: '' },
    javascript:  { type: String, default: '' },
    react:       { type: String, default: '' },
  },
  activeTab:   { type: String, enum: ['html','css','javascript','react'], default: 'html' },
  files: [{
    filename:     { type: String },
    originalName: { type: String },
    mimetype:     { type: String },
    size:         { type: Number },
    uploadedAt:   { type: Date, default: Date.now },
  }],
  status:      { type: String, enum: ['draft','submitted'], default: 'draft' },
  submittedAt: { type: Date },
}, { timestamps: true });

codeAnswerSchema.index({ traineeId: 1, questionId: 1, date: 1 }, { unique: true });
module.exports = mongoose.model('CodeAnswer', codeAnswerSchema);
