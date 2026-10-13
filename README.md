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

Requirements: Docker, or Node.js 22 and pnpm 10.

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:3000
- API health check: http://localhost:4000/api/health

Without Docker (a PostGIS instance must be reachable with the `.env` settings):

```bash
pnpm install
pnpm dev:backend
pnpm dev:frontend
```

## Scripts

| Command          | Description                    |
| ---------------- | ------------------------------ |
| `pnpm lint`      | Lint all packages              |
| `pnpm typecheck` | Type-check all packages        |
| `pnpm test`      | Run unit tests                 |
| `pnpm build`     | Build all packages             |

## Workflow

The project follows Gitflow and Conventional Commits.

- `main`: production releases
- `develop`: integration branch
- `feature/<issue>-<slug>`: branched from and merged into `develop` through a pull request

`main` and `develop` are protected: changes go through pull requests with a passing CI.
