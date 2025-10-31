const mongoose = require('mongoose');

const VideoInterviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    videoUrl: {
      type: String,
      required: true
    },
    transcript: {
      type: String,
      default: ''
    },
    keywords: {
      type: String,
      default: ''
    },
    topics: {
      type: String,
      default: ''
    },
    duration: {
      type: Number, // in seconds
      required: true
    },
    fileSize: {
      type: Number, // in bytes
      required: true
    },
    scores: {
      clarity: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      },
      relevance: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      },
      presentation: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      },
      overall: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      }
    },
    status: {
      type: String,
      enum: ['processing', 'completed', 'failed'],
      default: 'processing'
    },
    processingError: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('VideoInterview', VideoInterviewSchema);