const express = require('express');
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId, { passwordHash: 0 });
  res.json({ user });
});

router.put('/step1', requireAuth, async (req, res) => {
  const { fullName, academic } = req.body;
  const user = await User.findByIdAndUpdate(
    req.userId,
    { $set: { 'profile.fullName': fullName, 'profile.academic': academic } },
    { new: true }
  );
  res.json({ user });
});

router.put('/step2', requireAuth, async (req, res) => {
  const { isTech, interestedDomains } = req.body;
  const user = await User.findByIdAndUpdate(
    req.userId,
    { $set: { 'profile.isTech': isTech, 'profile.interestedDomains': interestedDomains || [] } },
    { new: true }
  );
  res.json({ user });
});

router.put('/complete', requireAuth, async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.userId,
    { $set: { 'profile.onboardingCompleted': true } },
    { new: true }
  );
  res.json({ user });
});

module.exports = router;


