# Strava Webapp

Gamified web platform connected to Strava. Activities are displayed on a map with tile, municipality and point-of-interest completion, badges, beacons to collect and a community layer.

## Stack

- **Backend**: NestJS, TypeORM
- **Database**: PostgreSQL with PostGIS
- **Frontend**: Next.js, shadcn/ui
- **Tooling**: pnpm workspaces, Docker

## Structure

```
backend/          NestJS API
frontend/         Next.js application
packages/shared/  Types shared between frontend and backend
docker/           Dockerfiles
```

## Getting started

Requirements: Docker, or Node.js 24 and pnpm 10.

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:3000 (the API is also reachable under `/api` through a rewrite)
- API health check: http://localhost:4000/api/health
- Adminer (database UI): http://localhost:8088 — system `PostgreSQL`, server `db`, credentials from `.env` (default `postgres` / `postgres`, database `strava_webapp`)
- Mailpit (outgoing emails): http://localhost:8025
- RustFS console (S3-compatible storage): http://localhost:9001, credentials `rustfsadmin` / `rustfsadmin`

Without Docker (PostGIS, an SMTP server and an S3-compatible storage must be reachable with the `.env` settings):

```bash
pnpm install
pnpm dev:backend
pnpm dev:frontend
```

Database migrations run automatically when the backend starts. `pnpm db:reset` (development only)
drops every table, replays the migrations and empties the object storage (uploaded avatars); it
refuses to run when `NODE_ENV=production`.
To manage migrations manually:

```bash
pnpm --filter backend migration:generate src/database/migrations/<Name>
pnpm --filter backend migration:run
pnpm --filter backend migration:revert
```

## Authentication

- Email and password, with password reset links sent by email. Email address verification is
  not implemented yet.
- Google sign-in, working once `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set (the button is
  always shown, and explains that Google is unavailable otherwise). In the
  Google Cloud console, create an OAuth client of type "Web application" with the authorized
  redirect URI `http://localhost:3000/api/auth/google/callback`. A Google account whose email
  matches an existing account is linked to it; a new one is asked to choose a username.
- Sign-up only asks for an email, a username, a password and the acceptance of the terms of use
  (recorded in `users.terms_accepted_at`); the display name is optional and set from the profile.
- Sessions are stored in the database and identified by an httpOnly, `SameSite=Lax` cookie.
  With "Stay signed in", the cookie lasts 30 days and is extended while used; otherwise it ends
  with the browser and the session expires after 24 hours of inactivity.
  The browser only talks to the frontend origin, which proxies `/api` to the backend.

## Strava

Activities are imported from Strava into the platform's own schema (`activities`, linked to
their provider record through `activity_sources`), so that other sources (Garmin, GPX/FIT files)
can be added later. **No GPS track or location is stored**: the
[Strava API Policy](https://www.strava.com/legal/api_policy) of June 2026 forbids keeping
location data beyond a 7-day cache.

Setup: create an application on https://www.strava.com/settings/api with the authorization
callback domain `localhost`, then fill `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` in `.env`.
A new Strava application only accepts its owner's account until it is reviewed by Strava.

- **Connection**: OAuth 2.0 from the dashboard or the settings. Tokens are encrypted at rest
  (`ENCRYPTION_SECRET`) and the access token (valid 6 hours) is refreshed automatically before it
  expires. Revoking deletes the connection and every activity imported from Strava; so does a
  revocation made from Strava, once confirmed.
- **Synchronization**: a background worker processes a job queue stored in PostgreSQL, so jobs
  survive restarts. The first import reads the most recent activities, up to
  `STRAVA_SYNC_MAX_ACTIVITIES` (50 by default in Docker). The Strava quotas (100 read requests per
  15 minutes, 1,000 per day, for the whole application) are tracked from the response headers:
  when they run out, jobs wait for the next window instead of failing.
- **Webhooks**: Strava pushes an event for each created, updated or deleted activity and for
  revocations. Events are stored, acknowledged within the 2 seconds Strava allows, then processed.
  They are not signed, so their content is never trusted: each one only triggers a read of the
  activity from Strava. Strava gives up after 3 failed deliveries and offers no replay, so a
  periodic reconciliation (every 6 hours and at startup) re-reads the last 30 days to catch events
  missed while the backend was down.
- **Webhooks in development** need a public URL: `docker compose --profile tunnel up` starts a
  Cloudflare quick tunnel, whose random address the backend registers with Strava at startup
  (replacing a previous development tunnel subscription, Cloudflare or ngrok). Without it, the reconciliation and the
  "Synchroniser" button keep the data up to date. Elsewhere, set `STRAVA_WEBHOOK_CALLBACK_URL`.

## Scripts

| Command               | Description                                              |
| --------------------- | -------------------------------------------------------- |
| `pnpm check-all`      | Run every CI check on all packages, sequentially         |
| `pnpm check:backend`  | Backend: lint, type-check, unit tests, e2e tests, build  |
| `pnpm check:frontend` | Frontend: lint, type-check, build                        |
| `pnpm check:shared`   | Shared package: type-check                               |
| `pnpm lint`           | Lint all packages                                        |
| `pnpm typecheck`      | Type-check all packages                                  |
| `pnpm test`           | Run unit tests                                           |
| `pnpm build`          | Build all packages                                       |

The CI runs the same `check:*` commands, so `pnpm check-all` reproduces it locally.

## Workflow

The project follows Gitflow and Conventional Commits.

- `main`: production releases
- `develop`: integration branch
- `feature/<issue>-<slug>`: branched from and merged into `develop` through a pull request

`main` and `develop` are protected: changes go through pull requests with a passing CI.
