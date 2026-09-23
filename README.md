# Courses Platform

An online learning platform: digital courses (psychometric exam prep, university
math, drawing) plus paid one-on-one mentor consultations. Full business context
is in the two docs at the repo root:

- `Course Website Project - Brief and Plan.docx` — the business idea, target
  market, pricing, and open questions.
- `Course Website - Technical Spec (React and NestJS).docx` — the full domain
  model, API surface, and the build order this project follows.

This README covers what's actually built and how to run it.

## Status: Step 2 of the build order — Courses, Lessons, Progress

Auth/users/roles (Step 1) plus the course content system (Step 2) are built.
Payments, the quiz engine, mentor bookings, the instructor marketplace, and
payouts/admin (Steps 3–7 of the spec) do not exist yet. There is also no
instructor-authoring UI yet — the one course in the system is seeded, not
created through a screen (that's Step 6 per the spec).

### What works right now

**Backend** (`apps/api` — NestJS 11 + Prisma 7 + PostgreSQL)
- Register / login / logout with JWT access + refresh tokens stored in
  `httpOnly` cookies (never exposed to JS).
- Refresh-token rotation with reuse detection — if a stolen/replayed refresh
  token is ever presented, every session for that user is revoked.
- Email verification and password reset flows (emails go to a local Mailpit
  inbox in dev, not a real provider).
- Role-based access control — a user can hold `STUDENT`, `INSTRUCTOR`,
  `MENTOR`, and/or `ADMIN` roles simultaneously.
- `GET/PATCH /api/users/me`, plus an admin-only endpoint to change another
  user's roles.
- Password hashing with Argon2id; baseline CSRF protection via an
  Origin-header check on state-changing requests.
- **Course catalogue**: public browse/search (`GET /api/courses`) and course
  detail with a modules/lessons outline (`GET /api/courses/:slug`).
- **Free enrollment**: `POST /api/enrollments`, `GET /api/enrollments/me`.
  Paid enrollment (Step 3) isn't wired up — enrolling in a priced course is
  rejected for now.
- **Lesson content**, gated by enrollment (`GET /api/lessons/:id`): plain text
  for text lessons, a signed streaming URL for video, a signed download URL
  for downloadable resources, and a "coming soon" placeholder for quiz
  lessons (the real quiz engine is Step 4).
- **Progress tracking**: mark a lesson complete, resume position for video,
  and a per-course progress summary, all gated the same way.
- **Video/file storage stub**: no S3/R2 yet (see note below) — files sit on
  local disk and are served through short-lived, cryptographically signed
  URLs (`/api/storage/stream/:lessonId`, `/api/storage/download/:lessonId`),
  including real HTTP Range support so the video player can seek/scrub. This
  genuinely satisfies the spec's "signed, expiring URL" content-protection
  requirement without standing up any object storage service.

**Frontend** (`apps/web` — React 19 + Vite + Tailwind v4)
- Login, register, and a basic dashboard page showing the logged-in user.
- Course catalogue, course detail (with an "enroll for free" flow), "My
  Courses" with progress bars, and a lesson player (video/text/resource/quiz
  rendering, mark-complete, resume position).
- Full English/Hebrew i18n with automatic RTL layout switching (via the
  language toggle in the header) — this was built in from the start, not
  bolted on later.
- Session handling via TanStack Query: silent token refresh on a 401, cookie
  based (no tokens ever touch `localStorage`).

**Nothing here talks to real Stripe/S3/email providers yet** — those are
intentionally stubbed for local dev (see below). Note on the storage stub:
we originally planned to stub S3 locally with MinIO (mirroring the
Mailpit-for-email approach), but MinIO's Docker Hub images were pulled and
its open-source edition was archived in 2026 — so instead of standing up any
object-storage container, video/resource files are just served from local
disk behind self-signed URLs (see above). The API contract (a lesson returns
a content URL) won't need to change when real S3/R2 is eventually wired up
for instructor uploads.

## Prerequisites

- Node.js 20+ (built and tested on Node 24)
- npm 10+
- Docker Desktop (for local Postgres + Mailpit — the two only external
  dependencies)

## Getting started

```bash
# 1. Install dependencies (installs both apps via npm workspaces)
npm install

# 2. Copy env files and fill in real values if needed (defaults work for local dev)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 3. Start Postgres + Mailpit
npm run docker:up

# 4. Create the database schema and seed an admin user
npm run prisma:migrate
npm run prisma:seed

# 5. Run both apps in dev mode
npm run dev
```

Then open:

| What | URL |
|---|---|
| Web app | http://localhost:5173 |
| API | http://localhost:3001/api |
| API health check | http://localhost:3001/api/health |
| Mailpit (dev email inbox — verification/reset emails land here) | http://localhost:8025 |
| Prisma Studio (DB browser) | `npm run prisma:studio` → http://localhost:5555 |

The seeded admin login is whatever you set `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD` to in `apps/api/.env` (defaults to
`admin@courses.local` / `ChangeMe123!`). Likewise `SEED_INSTRUCTOR_EMAIL` /
`SEED_INSTRUCTOR_PASSWORD` (default `instructor@courses.local` /
`ChangeMe123!`) seeds the instructor account that owns the one seeded free
course ("Intro to University Math", browsable at `/courses` once you're
logged in as any user — including a fresh one you register yourself).

The seed script also tries to download a small sample video for the seeded
course's video lesson (so the player has something real to play/scrub). If
you run the seed offline, that download is skipped with a warning — the
course still seeds fine, just with a video lesson that 404s until either you
get network access and re-run the seed, or drop a file at
`apps/api/local-uploads/videos/sample-lesson.mp4` yourself. Everything else
(text lesson, downloadable resource, quiz placeholder) works regardless.

### If port 5432 is already in use

`docker-compose.yml` maps Postgres to host port **5433**, not 5432 — on the
machine this was built on, a pre-existing native Postgres install was already
bound to 5432, and it silently intercepted connections meant for the
container (which shows up as a confusing "wrong password" error even with
correct credentials). If 5433 also collides with something on your machine,
change the port mapping in `docker-compose.yml` and the port in
`apps/api/.env`'s `DATABASE_URL` together.

## Project structure

```
apps/
  api/    NestJS backend
    prisma/schema.prisma   User/RefreshToken/VerificationToken +
                           Course/Module/Lesson/Enrollment/LessonProgress
    local-uploads/          video/resource files for the storage stub (gitignored)
    src/
      auth/                register, login, refresh, logout, verify-email,
                            forgot/reset-password
      users/                profile + admin role management
      courses/              public catalogue + course detail
      enrollments/           free enrollment, "my courses"
      lessons/               enrollment-gated lesson content delivery
      progress/              mark-complete, resume position, progress summary
      storage/               self-signed URLs + local-disk file streaming
                             (Range-request support for video seeking)
      mail/                 nodemailer -> Mailpit
      prisma/                Prisma client wrapper (NestJS module)
      common/                RBAC guards/decorators, CSRF origin-check guard
  web/    React frontend
    src/
      features/auth/       login/register pages, auth query hooks
      features/courses/     course/enrollment/lesson/progress query hooks
      routes/               HomePage, DashboardPage, CourseCataloguePage,
                            CourseDetailPage, MyCoursesPage, LessonPlayerPage,
                            ProtectedRoute
      i18n/                 en/he translation bundles
      lib/                  API client (cookie-based, auto-refresh on 401)
docker-compose.yml           Postgres + Mailpit for local dev
```

## Useful scripts (run from repo root)

| Command | What it does |
|---|---|
| `npm run dev` | Runs both API and web dev servers concurrently |
| `npm run docker:up` / `docker:down` | Start/stop Postgres + Mailpit |
| `npm run prisma:migrate` | Apply schema migrations (dev) |
| `npm run prisma:seed` | Seed the admin/instructor users + one free course |
| `npm run prisma:studio` | Open Prisma Studio to browse the DB |
| `npm run test:api` | Run backend unit tests |

## What's next

Following the spec's build order: payments + paid enrollment, then the quiz
engine (timed attempts — the real differentiator per the business plan),
then mentor availability/booking, then reviews and the instructor
marketplace (this is when a real course-authoring UI and real object storage
for instructor-uploaded video would make sense), then payouts/admin.
