const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { connectToDatabase } = require('./utils/db');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');
const resumeRoutes = require('./routes/resume');
const interviewRoutes = require('./routes/interviews');
const videoInterviewRoutes = require('./routes/videoInterviews');
const User = require('./models/User');
const bcrypt = require('bcrypt');

const app = express();

app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(morgan('dev'));

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/video-interviews', videoInterviewRoutes);

const PORT = process.env.PORT || 5000;

connectToDatabase()
  .then(() => {
    // Seed default admin if not exists
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@local';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
    User.findOne({ email: ADMIN_EMAIL }).then(async (existing) => {
      if (!existing) {
        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
        await User.create({ email: ADMIN_EMAIL, passwordHash, role: 'admin', profile: { fullName: 'Admin' } });
        console.log('Seeded default admin:', ADMIN_EMAIL);
      }
    }).catch((err) => console.error('Admin seed error', err));
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to database', err);
    process.exit(1);
  });


