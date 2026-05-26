// routes/run-code.js
const express = require('express');
const router  = express.Router();
const vm      = require('vm');
const auth    = require('../middleware/auth');

router.post('/', auth, (req, res) => {
  const { language, code } = req.body;
  if (!code) return res.json({ output: '', error: 'No code provided' });

  // Only JavaScript supported via vm module
  if (language !== 'javascript' && language !== 'react') {
    return res.json({ output: '', error: `Language '${language}' not supported yet. Only JavaScript is supported.` });
  }

  try {
    const logs = [];
    const context = vm.createContext({
      console: {
        log:   (...args) => logs.push(args.map(String).join(' ')),
        error: (...args) => logs.push('ERROR: ' + args.map(String).join(' ')),
        warn:  (...args) => logs.push('WARN: ' + args.map(String).join(' ')),
        info:  (...args) => logs.push(args.map(String).join(' ')),
      },
      Math, JSON, Array, Object, String, Number, Boolean, Date,
      parseInt, parseFloat, isNaN, isFinite,
      setTimeout: () => {}, setInterval: () => {}, clearTimeout: () => {}, clearInterval: () => {},
    });

    const result = vm.runInContext(code, context, { timeout: 5000 });
    
    // If code returns a value and no console.log, show the result
    if (logs.length === 0 && result !== undefined) {
      logs.push(String(result));
    }

    res.json({ output: logs.join('\n') || '(no output)', error: '' });
  } catch (err) {
    res.json({ output: '', error: err.message });
  }
});

module.exports = router;
