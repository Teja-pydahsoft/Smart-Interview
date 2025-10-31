const fs = require('fs').promises;
const path = require('path');

// TODO: Replace this mock with a real speech-to-text implementation
// For example, using Google Cloud Speech-to-Text as previously configured
/*
const speech = require('@google-cloud/speech');
const speechClient = new speech.SpeechClient({
  keyFilename: path.join(__dirname, 'your-google-cloud-key-file.json'),
});
*/

/**
 * MOCK: Transcribes speech from a video/audio file to text.
 * @param {Object} options - The options for transcription.
 * @returns {Promise<Object>} - A mock transcript object.
 */
async function transcribeVideo(options) {
  console.log('Using mock transcription service...');
  // Simulate a delay to mimic a real API call
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    transcript: 'Hello, this is a mock transcript. In a real implementation, this text would be the result of processing the audio from the video file. The purpose of this mock is to allow the application to function without a valid API key. It includes keywords like experience, skills, and project to allow for testing of the keyword extraction functionality.',
    words: [],
    confidence: 0.95,
    processingTime: 2,
    language: 'en-US',
    metadata: {},
  };
}

/**
 * Extracts keywords and topics from a transcript
 * @param {string} transcript - The transcript text
 * @returns {Object} Extracted keywords and topics
 */
function extractKeywordsAndTopics(transcript) {
  const commonKeywords = [
    'experience', 'skills', 'project', 'team', 'leadership',
    'development', 'design', 'problem-solving', 'communication',
    'collaboration', 'innovation', 'results', 'success', 'challenge',
    'solution', 'implementation', 'strategy', 'analysis', 'improvement'
  ];

  const keywords = [];
  const words = transcript.toLowerCase().split(/\s+/);
  
  commonKeywords.forEach(keyword => {
    if (words.includes(keyword)) {
      keywords.push({
        text: keyword,
        relevance: (0.7 + Math.random() * 0.3).toFixed(2)
      });
    }
  });

  // Add some random keywords if not enough are found
  while (keywords.length < 5) {
    const randomKeyword = commonKeywords[Math.floor(Math.random() * commonKeywords.length)];
    if (!keywords.find(k => k.text === randomKeyword)) {
      keywords.push({
        text: randomKeyword,
        relevance: (0.6 + Math.random() * 0.2).toFixed(2)
      });
    }
  }

  keywords.sort((a, b) => b.relevance - a.relevance);

  const topics = [
    { name: 'Professional Experience', confidence: (0.8 + Math.random() * 0.19).toFixed(2) },
    { name: 'Technical Skills', confidence: (0.75 + Math.random() * 0.2).toFixed(2) },
    { name: 'Project Management', confidence: (0.7 + Math.random() * 0.25).toFixed(2) }
  ];

  return {
    keywords: keywords.slice(0, 10),
    topics
  };
}

module.exports = {
  transcribeVideo,
  extractKeywordsAndTopics
};
