const mongoose = require('mongoose');

const AcademicSchema = new mongoose.Schema(
  {
    course: { type: String },
    branch: { type: String },
    institution: { type: String },
    graduationYear: { type: Number },
  },
  { _id: false }
);

const ProfileSchema = new mongoose.Schema(
  {
    fullName: { type: String },
    isTech: { type: Boolean, default: null },
    interestedDomains: [{ type: String }],
    academic: AcademicSchema,
    resumeUrl: { type: String },
    resumeText: { type: String },
    certifications: [{ type: String }],
    internships: [{ type: String }],
    tags: [{ type: String }],
    onboardingCompleted: { type: Boolean, default: false },
  },
  { _id: false, timestamps: true }
);

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    profile: ProfileSchema,
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);


