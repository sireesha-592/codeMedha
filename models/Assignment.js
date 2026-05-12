const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: [{ type: String }],
  correctAnswer: { type: String },
  section: { type: String, enum: ['A', 'B', 'C'], required: true },
  marks: { type: Number, required: true }
});

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId },
  selectedAnswer: { type: String },
  isCorrect: { type: Boolean, default: false }
});

const assignmentSchema = new mongoose.Schema({
  title:      { type: String, required: true },
  courseId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  traineeId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dueDate:    { type: String, required: true },

  questions:  [questionSchema],

  // Trainee answers
  answers:    [answerSchema],
  submittedAt: { type: Date, default: null },
  status:     { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' },

  // Score breakdown
  scoreA: { type: Number, default: 0 },
  scoreB: { type: Number, default: 0 },
  scoreC: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Assignment', assignmentSchema);