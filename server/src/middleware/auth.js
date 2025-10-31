const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Import the User model

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    const user = await User.findById(payload.sub).select('-password'); // Fetch user from DB

    if (!user) {
      return res.status(401).json({ error: 'Invalid token: user not found' });
    }

    req.user = user; // Attach the full user object to the request
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') { // Check role from the full user object
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };


