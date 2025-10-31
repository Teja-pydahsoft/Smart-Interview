const express = require('express');
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

const INTERVIEWS = [
  { id: 'int-frontend-1', title: 'React Frontend Interview', tags: ['frontend'], weight: 1 },
  { id: 'int-backend-1', title: 'Node Backend Interview', tags: ['backend'], weight: 1 },
  { id: 'int-ml-1', title: 'ML Basics Interview', tags: ['machine learning', 'data science'], weight: 1 },
  { id: 'int-devops-1', title: 'DevOps Foundations', tags: ['devops', 'cloud'], weight: 1 },
];

router.get('/', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const userTags = new Set([...(user.profile?.tags || []), ...(user.profile?.interestedDomains || [])]);
  const hasCerts = (user.profile?.certifications || []).length > 0;
  const hasInterns = (user.profile?.internships || []).length > 0;

  const scored = INTERVIEWS.map((iv) => {
    const overlap = iv.tags.filter((t) => userTags.has(t)).length;
    let score = overlap * 10;
    if (hasCerts) score += 5;
    if (hasInterns) score += 5;
    return { ...iv, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  res.json({ interviews: scored });
});

router.post('/score', requireAuth, async (req, res) => {
  // Accepts: { interviewId, score, notes }
  const { interviewId, score } = req.body || {};
  if (!interviewId || typeof score !== 'number') return res.status(400).json({ error: 'Invalid input' });
  // In a real app, persist attempt; here we echo back
  res.json({ ok: true });
});

module.exports = router;


