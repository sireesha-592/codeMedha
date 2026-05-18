const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId },
  answerText: { type: String, default: '' },
  isAnswered: { type: Boolean, default: false },
});

const sectionSchema = new mongoose.Schema({
  answers:  { type: [answerSchema], default: [] },
  total:    { type: Number, default: 0 },
  answered: { type: Number, default: 0 },
  score:    { type: Number, default: 0 },
});

const questionScoreSchema = new mongoose.Schema({
  questionIndex: Number,
  score: Number,
  maxScore: Number,
  feedback: String,
});

const assignmentSubmissionSchema = new mongoose.Schema(
  {
    traineeId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    date:       { type: String, required: true },   // "YYYY-MM-DD"
    secA:       { type: sectionSchema, default: () => ({}) },
    secB:       { type: sectionSchema, default: () => ({}) },
    secC:       { type: sectionSchema, default: () => ({}) },
    status:     { type: String, enum: ['in_progress', 'submitted'], default: 'in_progress' },
    submittedAt: Date,

    // ─── Grading fields ───────────────────────────────────────
    manualScore:     { type: Number, default: null },
    maxScore:        { type: Number, default: null },
    questionScores:  [questionScoreSchema],
    trainerFeedback: { type: String, default: '' },
    gradedBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    gradedAt:        { type: Date, default: null },

    // ─── Publishing fields ────────────────────────────────────
    // Admin publishes score+feedback to trainee after trainer grades
    scorePublished:  { type: Boolean, default: false },
    publishedAt:     { type: Date, default: null },
    adminFeedback:   { type: String, default: '' },   // Admin's overall feedback
  },
  { timestamps: true }
);

// One submission per trainee per date
assignmentSubmissionSchema.index({ traineeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);