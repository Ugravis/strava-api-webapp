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
- Mailpit (outgoing emails): http://localhost:8025
- RustFS console (S3-compatible storage): http://localhost:9001, credentials `rustfsadmin` / `rustfsadmin`

Without Docker (PostGIS, an SMTP server and an S3-compatible storage must be reachable with the `.env` settings):

```bash
pnpm install
pnpm dev:backend
pnpm dev:frontend
```

Database migrations run automatically when the backend starts. To manage them manually:

```bash
pnpm --filter backend migration:generate src/database/migrations/<Name>
pnpm --filter backend migration:run
pnpm --filter backend migration:revert
```

## Authentication

- Email and password, with email verification and password reset links sent by email.
- Google sign-in, enabled when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. In the
  Google Cloud console, create an OAuth client of type "Web application" with the authorized
  redirect URI `http://localhost:3000/api/auth/google/callback`. A Google account whose email
  matches an existing account is linked to it; a new one is asked to choose a username.
- Sessions are stored in the database and identified by an httpOnly, `SameSite=Lax` cookie.
  The browser only talks to the frontend origin, which proxies `/api` to the backend.

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
