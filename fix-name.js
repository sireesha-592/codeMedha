/**
 * One-time script: Update user name + email in MongoDB
 * 
 * Run from your backend folder:
 *   node fix-name.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, { family: 4 })
  .then(async () => {
    console.log('MongoDB connected');
    const User = require('./models/User');

    const result = await User.updateMany(
      { name: { $in: ['Sai', 'Saii', 'sai', 'saii', 'Sirisha'] } },
      { $set: { name: 'Sirisha', email: 'sirisha@test.com' } }
    );

    console.log(`Updated ${result.modifiedCount} user(s) → name: "Sirisha", email: "sirisha@test.com"`);
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });