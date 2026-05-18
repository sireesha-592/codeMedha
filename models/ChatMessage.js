const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  courseId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  senderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
  senderName: { type: String, required: true },

  // 'trainer' added alongside 'teacher' so both role names work
  senderRole: {
    type:    String,
    enum:    ['student', 'teacher', 'trainer', 'admin'],
    default: 'student',
  },

  message: { type: String, required: true, trim: true },

  // everyone = all enrolled students + trainer + admin
  // trainer  = only trainer & admin can see
  // admin    = only admin can see
  visibility: {
    type:    String,
    enum:    ['everyone', 'trainer', 'admin'],
    default: 'everyone',
  },
}, { timestamps: true });

chatMessageSchema.index({ courseId: 1, createdAt: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);