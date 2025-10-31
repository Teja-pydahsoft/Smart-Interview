const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  const baseFilter = { role: { $ne: 'admin' } }; // exclude admin from list
  let filter = baseFilter;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter = {
      $and: [baseFilter, {
        $or: [
          { email: rx },
          { 'profile.fullName': rx },
          { 'profile.tags': rx },
          { 'profile.interestedDomains': rx },
        ],
      }],
    };
  }

  const users = await User.find(filter, {
    email: 1,
    role: 1,
    createdAt: 1,
    'profile.fullName': 1,
    'profile.onboardingCompleted': 1,
    'profile.academic': 1,
    'profile.isTech': 1,
    'profile.interestedDomains': 1,
    'profile.resumeUrl': 1,
    'profile.certifications': 1,
    'profile.internships': 1,
    'profile.tags': 1,
  }).sort({ createdAt: -1 }).limit(500);

  const data = users.map((u) => ({
    id: u._id,
    email: u.email,
    role: u.role,
    fullName: u.profile?.fullName || '',
    onboardingCompleted: !!u.profile?.onboardingCompleted,
    createdAt: u.createdAt,
    academic: u.profile?.academic || {},
    isTech: u.profile?.isTech ?? null,
    interestedDomains: u.profile?.interestedDomains || [],
    resumeUrl: u.profile?.resumeUrl || '',
    certifications: u.profile?.certifications || [],
    internships: u.profile?.internships || [],
    tags: u.profile?.tags || [],
    performanceScore: (u.profile?.certifications?.length || 0) + (u.profile?.internships?.length || 0),
  }));
  res.json({ users: data });
});

router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === 'admin') return res.status(400).json({ error: 'Cannot delete admin users' });
  await User.deleteOne({ _id: id });
  res.json({ ok: true });
});

module.exports = router;


