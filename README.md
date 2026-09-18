# Courses Platform

An online learning platform: digital courses (psychometric exam prep, university
math, drawing) plus paid one-on-one mentor consultations. Full business context
is in the two docs at the repo root:

- `Course Website Project - Brief and Plan.docx` — the business idea, target
  market, pricing, and open questions.
- `Course Website - Technical Spec (React and NestJS).docx` — the full domain
  model, API surface, and the build order this project follows.

This README covers what's actually built and how to run it.

## Status: Step 1 of the build order — Auth, Users, Roles

Only the foundation is built so far: project scaffolding plus a complete
authentication system. Courses, lessons, quizzes, payments, and bookings
(steps 2–7 of the spec) do not exist yet.

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

**Frontend** (`apps/web` — React 19 + Vite + Tailwind v4)
- Login, register, and a basic dashboard page showing the logged-in user.
- Full English/Hebrew i18n with automatic RTL layout switching (via the
  language toggle in the header) — this was built in from the start, not
  bolted on later.
- Session handling via TanStack Query: silent token refresh on a 401, cookie
  based (no tokens ever touch `localStorage`).

**Nothing here talks to real Stripe/S3/email providers yet** — those are
intentionally stubbed for local dev (see below).

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
`admin@courses.local` / `ChangeMe123!`).

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
    prisma/schema.prisma   User, RefreshToken, VerificationToken models
    src/
      auth/                register, login, refresh, logout, verify-email,
                            forgot/reset-password
      users/                profile + admin role management
      mail/                 nodemailer -> Mailpit
      prisma/                Prisma client wrapper (NestJS module)
      common/                RBAC guards/decorators, CSRF origin-check guard
  web/    React frontend
    src/
      features/auth/       login/register pages, auth query hooks
      routes/               HomePage, DashboardPage, ProtectedRoute
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
| `npm run prisma:seed` | Seed the admin user |
| `npm run prisma:studio` | Open Prisma Studio to browse the DB |
| `npm run test:api` | Run backend unit tests |

## What's next

Following the spec's build order, the next step is the course/module/lesson
data model and lesson player, seeded with one free course — then payments,
the quiz engine, mentor bookings, reviews/marketplace, and payouts/admin, in
that order.
