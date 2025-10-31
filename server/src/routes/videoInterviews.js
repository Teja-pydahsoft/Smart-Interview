const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const VideoInterview = require('../models/VideoInterview');
const { requireAuth } = require('../middleware/auth');

// Configure storage for video uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e12).toString(36);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /webm|mp4|mov|avi/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only video files are allowed'));
  }
});

// Upload video interview
router.post('/upload', requireAuth, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No video file uploaded' });
    }

    const { duration } = req.body;
    
    // Use AI processing for scoring and transcription
    const videoAnalysis = require('../utils/videoAnalysis');
    
    // Create new video interview record
    const videoInterview = new VideoInterview({
      userId: req.user.id,
      videoUrl: `/uploads/${req.file.filename}`,
      duration: parseInt(duration) || 0,
      fileSize: req.file.size,
      status: 'processing'
    });
    
    await videoInterview.save();
    
    // Process asynchronously with our AI utilities
    (async () => {
      try {
        // Import speech-to-text service
        const speechToText = require('../utils/speechToText');
        
        // Analyze video for scores
        const analysisResults = await videoAnalysis.analyzeVideo({
          filePath: req.file.path,
          duration: parseInt(duration) || 0,
          size: req.file.size
        });
        
        // Generate transcript using dedicated speech-to-text service
        const transcriptionResults = await speechToText.transcribeVideo({
          filePath: req.file.path,
          language: 'en-US',
          enablePunctuation: true
        });
        
        // Extract keywords and topics from transcript
        const contentAnalysis = speechToText.extractKeywordsAndTopics(transcriptionResults.transcript);
        
        // Update the record with results
        await VideoInterview.findByIdAndUpdate(videoInterview._id, {
          transcript: transcriptionResults.transcript,
          scores: analysisResults.scores,
          keywords: contentAnalysis.keywords.map(k => k.text).join(', '),
          topics: contentAnalysis.topics.map(t => t.name).join(', '),
          status: 'completed'
        });
        
        console.log(`Video interview ${videoInterview._id} processing completed`);
      } catch (error) {
        console.error('Error processing video:', error);
        await VideoInterview.findByIdAndUpdate(videoInterview._id, { 
          status: 'failed',
          processingError: error.message 
        });
      }
    })();
    
    res.status(201).json({ 
      message: 'Video uploaded successfully and processing started',
      videoInterview
    });
  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all video interviews for a user
router.get('/', requireAuth, async (req, res) => {
  try {
    const videoInterviews = await VideoInterview.find({ userId: req.user.id })
      .sort({ createdAt: -1 });
    
    res.json(videoInterviews);
  } catch (error) {
    console.error('Error fetching video interviews:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific video interview
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const videoInterview = await VideoInterview.findById(req.params.id);
    
    if (!videoInterview) {
      return res.status(404).json({ message: 'Video interview not found' });
    }
    
    // Check ownership
    if (videoInterview.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    res.json(videoInterview);
  } catch (error) {
    console.error('Error fetching video interview:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;