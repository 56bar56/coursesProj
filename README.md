# Courses Platform

An online learning platform: digital courses (psychometric exam prep, university
math, drawing) plus paid one-on-one mentor consultations. Full business context
is in the two docs at the repo root:

- `Course Website Project - Brief and Plan.docx` — the business idea, target
  market, pricing, and open questions.
- `Course Website - Technical Spec (React and NestJS).docx` — the full domain
  model, API surface, and the build order this project follows.

This README covers what's actually built and how to run it.

## Status: Step 7 of the build order (partial) — Admin: Users & Metrics

Auth/users/roles (Step 1), the course content system (Step 2), payments for
paid courses (Step 3), the quiz engine (Step 4), mentor booking (Step 5),
reviews plus the instructor course-authoring + submission/approval workflow
(Step 6), and now the rest of the admin surface — user management and
platform metrics (Step 7) — are built. **Payouts are deliberately excluded**
from this pass, per an explicit scope call: Step 7 in the spec is "Payouts
and the admin dashboard," and only the admin-dashboard half was requested.
There's no `Payout`/`InstructorProfile` model, no revenue-share computation,
and no instructor earnings UI — that remains unbuilt.

Instructor authoring in this step covers course metadata, modules, and
**text** lessons only — this was a deliberate scope call, not an oversight.
Video upload, downloadable resources, and quiz authoring stay seed-only for
now; an instructor can still submit a real course end-to-end using text
lessons alone, and the submission/approval workflow itself is fully real.
Mentor availability slots are also still seeded, not authored through a
screen.

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
- **Paid enrollment / payments**: `POST /api/payments/checkout` creates an
  `Order` and a checkout session; `POST /api/payments/webhook` (self-verifying
  via a signed request, not behind auth — this is what a real payment
  provider calls) confirms it and creates the enrollment; `GET
  /api/payments/orders` is order history. The order-confirmation logic is
  idempotent under concurrent/duplicate calls (an atomic conditional update,
  not a naive read-then-write) since real providers redeliver webhooks and
  duplicate processing would mean duplicate enrollments/receipt emails.
  A receipt email goes out via Mailpit on successful payment.
- **Lesson content**, gated by enrollment (`GET /api/lessons/:id`): plain text
  for text lessons, a signed streaming URL for video, a signed download URL
  for downloadable resources, and quiz metadata (question count, time limit)
  for quiz lessons.
- **Quiz engine** (`apps/api/src/quizzes/`): multiple-choice and numeric-entry
  questions; `POST /api/quizzes/:quizId/attempts` starts an attempt or
  **resumes** an already-open one rather than creating duplicates (so a
  refresh mid-quiz doesn't lose progress); `POST
  /api/quizzes/attempts/:id/submit` scores it **entirely server-side** —
  correct answers/explanations are never sent to the client before
  submission — and returns a full score report with per-question
  explanations; `GET /api/quizzes/:quizId/attempts` is past-attempt history.
  Scoring is real-world tolerant (numeric answers like `"3"` and `"3.0"` are
  treated as equal, not compared as raw strings). Timing is
  server-authoritative: a `timeLimitSec` quiz flags late submissions using
  the server's own `startedAt` timestamp, never a client-reported elapsed
  time — late attempts are still scored, just flagged. Submitting an attempt
  drives the same lesson-progress system as every other lesson type.
  Double-submission (a double-clicked button, or a redelivered request) is
  handled atomically so it can never create duplicate answer rows or fire
  progress-completion twice.
- **Progress tracking**: mark a lesson complete, resume position for video,
  and a per-course progress summary, all gated the same way.
- **Mentor booking** (`apps/api/src/bookings/`, `apps/api/src/mentors/`):
  `GET /api/mentors` and `GET /api/mentors/:id/availability` are public;
  `POST /api/bookings` atomically claims a slot (`MentorAvailability.status`
  flips `OPEN → BOOKED` via the same conditional-update idiom used for
  payments/quiz idempotency — this is a genuine DB-level lock, not an
  app-level check-then-write, so two students can never win the same slot).
  Payment reuses the existing `Order`/`PaymentProvider` machinery from Step 3
  (`POST /api/payments/booking-checkout`) — `Order.courseId` is now nullable
  with a new `Order.bookingId`, and the webhook handler branches on which is
  set. On successful payment, a booking gets a video-call join link (see
  below) and a calendar invite emailed as a real `.ics` attachment via
  Mailpit; `GET /api/bookings/:id/ics` also offers it as a direct download.
  A failed payment or a `POST /api/bookings/:id/cancel` frees the slot for
  someone else to book — this was caught and fixed via live testing: the
  first schema draft made `Booking.slotId` a hard-unique 1:1 relation, which
  actually made a freed slot un-rebookable (a second booking attempt 500'd
  on the unique constraint, since double-booking prevention already lives in
  `MentorAvailability.status`, not that constraint).
- **Instructor course authoring** (`apps/api/src/instructor-courses/`, distinct
  from the public read-only `CoursesModule`): `POST/GET/PATCH/DELETE
  /api/instructor/courses(/:id)` plus nested module/lesson CRUD
  (`.../modules(/:moduleId)`, `.../modules/:moduleId/lessons(/:lessonId)`),
  all ownership-checked (404, not 403, on someone else's course — same
  existence-hiding convention used everywhere else). A course is a state
  machine: `DRAFT ⇄ edit`, `DRAFT/REJECTED --submit--> PENDING_REVIEW` (blocked
  with 400 until it has at least one lesson), `PENDING_REVIEW
  --admin approve/reject--> PUBLISHED/REJECTED`. Editing is locked outside
  `DRAFT`/`REJECTED` (409) so a course can't be changed after submission
  without going back through review; deleting is likewise only allowed in
  those two statuses. Slugs auto-generate from the title with a numeric-suffix
  fallback on collision. `Course.category` is a fixed allowlist shared by the
  DTO and the frontend `<select>` (not a Prisma enum) so instructor input
  can't fragment the catalogue's exact-match category filter.
- **Reviews** (`apps/api/src/reviews/`): `GET/POST /api/courses/:courseId/reviews`.
  Posting is an upsert keyed on `(userId, courseId)` — resubmitting just edits
  your existing review rather than erroring or duplicating — gated on a
  verified `Enrollment` row (same check `LessonsService` already used).
  Moderation is a soft `hidden` flag, never a hard delete, matching how this
  codebase treats every other record. The list endpoint also returns the
  average rating.
- **Admin course-approval queue** (`apps/api/src/admin/`): `GET
  /api/admin/courses/pending`, `PATCH /api/admin/courses/:id/approve`, `PATCH
  /api/admin/courses/:id/reject` (with a required reason, shown back to the
  instructor), and `PATCH /api/admin/reviews/:id/hide` for review moderation.
- **Admin user management** (`GET /api/admin/users`, same module): paginated,
  searchable (email/displayName, case-insensitive), filterable by role, each
  row annotated with `_count` of owned courses and enrollments for at-a-glance
  context. Role *editing* deliberately isn't duplicated here — it reuses the
  admin-gated `PATCH /api/users/:id/roles` that's existed since Step 1
  (`apps/api/src/users/`), which already refuses to leave a user with zero
  roles (`@ArrayNotEmpty()`); this module's job is visibility, not another
  copy of the mutation.
- **Platform metrics** (`GET /api/admin/metrics`, same module): a snapshot of
  current totals — users by role, courses by status, enrollment/review/
  booking counts (reviews split out hidden vs visible, bookings by status),
  and revenue grouped by currency from `PAID` orders only (summed rather than
  blindly added across currencies, since `Order.currency` is a free string
  field, not fixed to one). No time-series/trend data — a first pass at
  totals, not a full analytics dashboard.
- **Video/file storage stub**: no S3/R2 yet (see note below) — files sit on
  local disk and are served through short-lived, cryptographically signed
  URLs (`/api/storage/stream/:lessonId`, `/api/storage/download/:lessonId`),
  including real HTTP Range support so the video player can seek/scrub. This
  genuinely satisfies the spec's "signed, expiring URL" content-protection
  requirement without standing up any object storage service.

**Frontend** (`apps/web` — React 19 + Vite + Tailwind v4)
- Login, register, and a basic dashboard page showing the logged-in user.
- Course catalogue, course detail (with "enroll for free" or "Buy for $X"
  depending on the course), "My Courses" with progress bars, and a lesson
  player (video/text/resource rendering, mark-complete, resume position).
- Quiz-taking UI inside the lesson player: an intro screen (time limit,
  question count, past attempts), the timed question flow itself (a
  self-correcting countdown computed from a fixed deadline, not a naive
  decrementing timer that drifts on tab-throttling or refresh), and a score
  report with per-question correct/incorrect + explanations.
- A fake checkout page (`/checkout/fake/:orderId`) with "simulate successful
  payment" / "simulate failed payment" buttons, and an order history page
  (`/orders`) — see the payment-provider note below for why this exists.
- Mentor browsing/booking: `/mentors` (list), `/mentors/:id` (availability,
  grouped by day, "Book" goes through the same fake-checkout flow as course
  purchases), `/bookings` (history — join-call link, "add to calendar"
  download, cancel). `/call/stub/:bookingId` is a placeholder page for the
  generated video link (see the video-provider note below).
- Instructor dashboard (`/instructor/courses`, role-gated) — create a course,
  see all of your own courses across every status, and a per-course editor
  (`/instructor/courses/:id`) for metadata, modules, and text lessons, with a
  rejection-reason banner and "Submit for review" — read-only once
  `PENDING_REVIEW`/`PUBLISHED`, matching the backend's edit-lock.
- Admin review queue (`/admin/courses`, role-gated) — approve or reject
  (with a reason) each pending submission, seeing its full module/lesson
  outline first.
- Admin users (`/admin/users`, role-gated) — search, filter by role, and
  paginate all users; each row has per-role checkboxes that mutate
  immediately (same "commit on interaction" convention as the course editor's
  autosave and the mentor booking flow's direct-click booking). Two UX-only
  guardrails mirror server-side invariants rather than inventing new ones: an
  admin can't uncheck a user's last remaining role (the server's
  `@ArrayNotEmpty()` would reject it anyway), and an admin can't edit their
  own row at all, so there's no accidental self-lockout from the very page
  being used to manage access.
- Admin metrics (`/admin/metrics`, role-gated) — plain stat cards (no
  charting library; nothing else in this app charts anything) for user/
  course/enrollment/review/booking counts and revenue by currency.
- Reviews on the course detail page: average rating, the review list, and a
  review form that only renders once `useMyEnrollments()` confirms you're
  enrolled (the server re-checks regardless — this is a UX gate, not the
  security boundary).
- `ProtectedRoute` now takes an optional `role` prop for role-gated routes,
  on top of its existing login check.
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

Note on the payment stub: there's no way to self-host a fake Stripe the way
Mailpit self-hosts SMTP, and no Stripe account exists yet — so payments are
built behind a `PaymentProvider` interface (`apps/api/src/payments/providers/`)
with a `FakePaymentProvider` that simulates the checkout+webhook lifecycle
entirely within the app (the "fake checkout" page's Simulate buttons). The
real `/api/payments/webhook` endpoint is still fully implemented with genuine
HMAC signature verification over the raw request body — it's just never hit
by the app's own UI, only by a manual signed request during testing — so
swapping in real Stripe later means implementing one more class against the
same interface, not a rewrite.

Note on the video-call stub: same reasoning again — no Zoom/Google Meet
account exists yet, so `apps/api/src/bookings/providers/video-call-provider.interface.ts`
defines the seam and `StubVideoCallProvider` returns a placeholder join URL
under this app's own domain. The calendar invite is *not* stubbed — an
`.ics` file is plain text (RFC 5545) and needs no external account, so
`apps/api/src/bookings/ics-builder.ts` generates a real one, attached to the
confirmation email via nodemailer and downloadable directly from the API.

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
`ChangeMe123!`) seeds the instructor account that owns the two seeded
courses — a free one ("Intro to University Math") and a paid one
("Psychometric Verbal Crash Course", $49) — both browsable at `/courses`
once you're logged in as any user, including a fresh one you register
yourself. Use the paid course to try the buy → fake-checkout → order-history
flow. `SEED_MENTOR_EMAIL`/`SEED_MENTOR_PASSWORD` (default
`mentor@courses.local` / `ChangeMe123!`) seeds a mentor with 20 bookable
30-minute slots over the next 10 days ($60 each) — browsable at `/mentors`
by any user. Log in as the seeded instructor to try the real authoring flow
at `/instructor/courses` (create a course, add a module + text lesson,
submit for review), then as the seeded admin to approve/reject it at
`/admin/courses`. `Role.INSTRUCTOR`/`Role.MENTOR`/`Role.ADMIN` are granted
via the admin `PATCH /api/users/:id/roles` endpoint (UI at `/admin/users`),
the seed script, or a secret sign-up code: set `SIGNUP_CODE_INSTRUCTOR` /
`SIGNUP_CODE_MENTOR` / `SIGNUP_CODE_ADMIN` in `apps/api/.env` (16+ chars
each; unset disables that role) and whoever enters the matching code in the
register page's optional "Staff sign-up code" field gets that role instead
of `STUDENT`. A wrong code is rejected with 403 and no account is created.
`/admin/metrics` has a platform-wide numbers snapshot.

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
                           Course/Module/Lesson/Enrollment/LessonProgress +
                           Order + Quiz/Question/Attempt/AttemptAnswer +
                           MentorAvailability/Booking + Review
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
      payments/              Order model, PaymentProvider interface +
                             FakePaymentProvider, checkout/webhook/orders
      quizzes/               attempts (start/resume, submit, history),
                             server-side scoring with numeric tolerance
      bookings/              slot-claim + booking lifecycle, VideoCallProvider
                             interface + stub, ics-builder.ts
      mentors/               public mentor/availability listing + mentor's
                             own read-only availability/bookings
      instructor-courses/   instructor-owned course/module/text-lesson CRUD
                             + submit-for-review, distinct from courses/
      reviews/               rating+text reviews, upsert-on-create, soft-hide
      admin/                 course-approval queue, review moderation,
                             user listing/search, platform metrics
      mail/                 nodemailer -> Mailpit
      prisma/                Prisma client wrapper (NestJS module)
      common/                RBAC guards/decorators, CSRF origin-check guard
  web/    React frontend
    src/
      features/auth/       login/register pages, auth query hooks
      features/courses/     course/enrollment/lesson/progress query hooks
      features/payments/    checkout/order query hooks
      features/quizzes/     QuizSection/QuizIntro/QuizPlayer/ScoreReport,
                            attempt query hooks (mounted inside the lesson
                            player, no dedicated route)
      features/bookings/     mentor/availability/booking query hooks
      features/instructor-courses/  instructor course/module/lesson query hooks
      features/reviews/      review query hooks
      features/admin/         approval-queue/user-management/metrics query hooks
      routes/               HomePage, DashboardPage, CourseCataloguePage,
                            CourseDetailPage, MyCoursesPage, LessonPlayerPage,
                            FakeCheckoutPage, OrderHistoryPage,
                            MentorListPage, MentorAvailabilityPage,
                            BookingHistoryPage, StubCallPage,
                            InstructorDashboardPage, CourseEditorPage,
                            AdminCourseQueuePage, AdminUsersPage,
                            AdminMetricsPage, ProtectedRoute
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
| `npm run prisma:seed` | Seed admin/instructor/mentor users, one free and one paid course (each with a real quiz), and 20 mentor availability slots |
| `npm run prisma:studio` | Open Prisma Studio to browse the DB |
| `npm run test:api` | Run backend unit tests |

## What's next

Payouts — the other half of Step 7 (`Payout`/`InstructorProfile` schema,
revenue-share computation, admin payout runs, instructor earnings UI) —
deliberately excluded from this pass. Real object storage for
instructor-uploaded video/resources, video/quiz authoring UI, a real payment
provider, and a real video-call provider all remain intentionally deferred
until there's a concrete need driving each one.

## License

All rights reserved — see [`LICENSE`](./LICENSE). The source is visible for
portfolio and tooling purposes, but no permission is granted to use, copy,
modify, or distribute it.
