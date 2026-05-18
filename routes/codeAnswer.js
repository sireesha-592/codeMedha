const router  = require('express').Router();
const auth    = require('../middleware/auth');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const CodeAnswer = require('../models/CodeAnswer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/code-answers');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}-${file.originalname}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.html','.css','.js','.jsx','.ts','.tsx','.json','.txt','.zip','.png','.jpg','.jpeg','.gif','.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error('File type not allowed'));
  },
});

// GET — load existing answer for a question
router.get('/:questionId/:date', auth, async (req, res) => {
  try {
    const answer = await CodeAnswer.findOne({
      traineeId:  req.user.id,
      questionId: req.params.questionId,
      date:       req.params.date,
    });
    res.json(answer || null);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /save — auto-save code
router.post('/save', auth, async (req, res) => {
  try {
    const { questionId, courseId, date, code, activeTab } = req.body;
    const answer = await CodeAnswer.findOneAndUpdate(
      { traineeId: req.user.id, questionId, date },
      { $set: { traineeId: req.user.id, questionId, courseId, date, code, activeTab } },
      { upsert: true, new: true }
    );
    res.json(answer);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /upload-file — attach a file to answer
router.post('/upload-file', auth, upload.single('file'), async (req, res) => {
  try {
    const { questionId, courseId, date } = req.body;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const fileInfo = {
      filename: req.file.filename, originalName: req.file.originalname,
      mimetype: req.file.mimetype, size: req.file.size, uploadedAt: new Date(),
    };
    const answer = await CodeAnswer.findOneAndUpdate(
      { traineeId: req.user.id, questionId, date },
      { $set: { traineeId: req.user.id, questionId, courseId, date }, $push: { files: fileInfo } },
      { upsert: true, new: true }
    );
    res.json({ message: 'File uploaded', file: fileInfo, answer });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /delete-file
router.delete('/delete-file', auth, async (req, res) => {
  try {
    const { questionId, date, filename } = req.body;
    const filePath = path.join(__dirname, '../uploads/code-answers', filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    const answer = await CodeAnswer.findOneAndUpdate(
      { traineeId: req.user.id, questionId, date },
      { $pull: { files: { filename } } },
      { new: true }
    );
    res.json({ message: 'Deleted', answer });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /submit — mark code answer submitted
router.post('/submit', auth, async (req, res) => {
  try {
    const { questionId, date } = req.body;
    const answer = await CodeAnswer.findOneAndUpdate(
      { traineeId: req.user.id, questionId, date },
      { $set: { status: 'submitted', submittedAt: new Date() } },
      { new: true }
    );
    res.json(answer);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /admin/:questionId/:date — admin view all trainees' answers
router.get('/admin/:questionId/:date', auth, async (req, res) => {
  try {
    const answers = await CodeAnswer.find({
      questionId: req.params.questionId, date: req.params.date,
    }).populate('traineeId', 'name email').lean();
    res.json(answers);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /admin-trainee/:questionId/:date/:traineeId — admin view one trainee's code answer
router.get('/admin-trainee/:questionId/:date/:traineeId', auth, async (req, res) => {
  try {
    const answer = await CodeAnswer.findOne({
      questionId: req.params.questionId,
      date:       req.params.date,
      traineeId:  req.params.traineeId,
    }).lean();
    res.json(answer || null);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
