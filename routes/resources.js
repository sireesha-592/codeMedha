const express  = require('express');
const router   = express.Router();
const auth     = require('../middleware/auth');
const Resource = require('../models/Resource');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');

const trainerOnly = (req, res, next) => {
  if (['teacher', 'trainer', 'admin'].includes(req.user.role)) return next();
  res.status(403).json({ message: 'Trainer access required' });
};

// ── Multer setup ──────────────────────────────────────────────
const uploadDir = path.join(__dirname, '../uploads/resources');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    cb(null, `${Date.now()}_${name}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx',
                     '.txt', '.png', '.jpg', '.jpeg', '.gif', '.zip', '.mp4', '.webm'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`File type ${ext} not allowed`));
  },
});

// ── Upload file & create resource ─────────────────────────────
// POST /api/resources/upload
router.post('/upload', auth, trainerOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const { courseId, title, type, desc, tag, sharedWithStudents } = req.body;
    if (!courseId) return res.status(400).json({ message: 'courseId required' });

    const fileUrl = `/uploads/resources/${req.file.filename}`;
    const resource = await Resource.create({
      courseId,
      trainerId: req.user.id,
      title: title || req.file.originalname,
      url: fileUrl,
      type: type || 'pdf',
      desc: desc || '',
      tag:  tag  || '',
      sharedWithStudents: sharedWithStudents !== 'false',
      fileName: req.file.originalname,
      fileSize: req.file.size,
    });
    res.status(201).json(resource);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── Trainer: add resource ──────────────────────────────────────
// POST /api/resources
router.post('/', auth, trainerOnly, async (req, res) => {
  try {
    const { courseId, title, url, type, desc, tag, sharedWithStudents } = req.body;
    if (!courseId || !title) return res.status(400).json({ message: 'courseId and title required' });
    const resource = await Resource.create({
      courseId, trainerId: req.user.id,
      title, url: url || '', type: type || 'link',
      desc: desc || '', tag: tag || '',
      sharedWithStudents: sharedWithStudents !== false,
    });
    res.status(201).json(resource);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── Trainer: get all resources for course ─────────────────────
// GET /api/resources?courseId=...
router.get('/', auth, async (req, res) => {
  try {
    const { courseId } = req.query;
    const filter = {};
    if (courseId) filter.courseId = courseId;

    // Trainees only see shared resources
    const isTrainer = ['teacher', 'trainer', 'admin'].includes(req.user.role);
    if (!isTrainer) filter.sharedWithStudents = true;

    const resources = await Resource.find(filter).sort({ createdAt: -1 });
    res.json(resources);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── Trainer: update a resource ────────────────────────────────
// PATCH /api/resources/:id
router.patch('/:id', auth, trainerOnly, async (req, res) => {
  try {
    const resource = await Resource.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!resource) return res.status(404).json({ message: 'Not found' });
    res.json(resource);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── Trainer: delete a resource ────────────────────────────────
// DELETE /api/resources/:id
router.delete('/:id', auth, trainerOnly, async (req, res) => {
  try {
    await Resource.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;