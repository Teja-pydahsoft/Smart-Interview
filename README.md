# Interview Portal

## Quick start

1. Server
   - Open a terminal in `server/`
   - Copy `.env` (optional); defaults will work for local dev
   - Run:
     - `npm install`
     - `npm run dev`

   The server starts on `http://localhost:5000` and will seed a default admin on first boot.

2. Client
   - Open another terminal in `client/`
   - Run:
     - `npm install`
     - `npm run dev`

   The client starts on `http://localhost:5173` with a proxy to the server.

## Accounts

- Admin login:
  - Username: `admin` (or `admin@local`)
  - Password: `admin123`

- Student login: register via the UI.

## Features

- Dynamic, responsive UI optimized for desktop and laptop screens.
- Animated backgrounds and smooth transitions.
- Role-based auth with token + role in responses and protected routes.
- Student onboarding (Step 1 & Step 2) stores full profile and academic details.
- Resume upload with robust PDF/DOCX parsing and profile enrichment.

## Admin Dashboard

- Route: `/admin`
- Includes:
  - Search by name, email, interested domains, or tags
  - Student table with: course, branch, institute, grad year, domains, tags, performance score
  - Delete non-admin users
  - Animated visual background
  - Admin entries are excluded from the list

## Resume Parsing

- Endpoint: `POST /api/resume/upload` (multipart, field: `resume`)
- PDF: Parsed using `pdfjs-dist` for higher-fidelity extraction; falls back to `pdf-parse` if needed
- DOCX: Parsed using `mammoth`
- Extracted signals saved to `profile`:
  - `resumeUrl`, `resumeText`
  - `tags` (naive domain detection)
  - `certifications`, `internships`

## API Summary

- Auth
  - `POST /api/auth/register` { email, password }
  - `POST /api/auth/login` { email|"admin", password } → returns `{ token, role, onboardingCompleted }`
- Profile
  - `GET /api/profile/me`
  - `PUT /api/profile/step1` { fullName, academic { course, branch, institution, graduationYear } }
  - `PUT /api/profile/step2` { isTech, interestedDomains[] }
  - `PUT /api/profile/complete`
- Resume
  - `POST /api/resume/upload` (file `resume`: pdf/docx)
- Admin
  - `GET /api/admin/users?q=...` (excludes admins; returns full profile fields)
  - `DELETE /api/admin/users/:id`

## Dev Notes

- Client reads `token`/`role` from `localStorage` and listens to an `auth-changed` event for instant redirects after login.
- The layout adjusts to larger screens; container sizes are widened on key pages to utilize desktop width.


