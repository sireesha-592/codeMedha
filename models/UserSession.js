const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role:      { type: String, enum: ['student', 'trainer', 'teacher', 'admin'], required: true },
  loginAt:   { type: Date, required: true },
  logoutAt:  { type: Date, default: null },
  duration:  { type: Number, default: null }, // minutes
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('UserSession', userSessionSchema);