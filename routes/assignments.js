const router = require('express').Router();
const auth = require('../middleware/auth');

// This route is now handled by submissions.js
// Keeping this file for future use
router.get('/ping', (req, res) => res.json({ ok: true }));

module.exports = router;