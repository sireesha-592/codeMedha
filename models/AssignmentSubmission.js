const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  answerText: { type: String, default: '' },
  isAnswered: { type: Boolean, default: false },
});

const assignmentSubmissionSchema = new mongoose.Schema({
  traineeId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  date:        { type: String, required: true },
  secA: {
    answers:   [answerSchema],
    answered:  { type: Number, default: 0 },
    total:     { type: Number, default: 20 },
    score:     { type: Number, default: 0 },
  },
  secB: {
    answers:   [answerSchema],
    answered:  { type: Number, default: 0 },
    total:     { type: Number, default: 20 },
    score:     { type: Number, default: 0 },
  },
  secC: {
    answers:   [answerSchema],
    answered:  { type: Number, default: 0 },
    total:     { type: Number, default: 10 },
    score:     { type: Number, default: 0 },
  },
  status:      { type: String, enum: ['not_started', 'in_progress', 'submitted'], default: 'not_started' },
  submittedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);