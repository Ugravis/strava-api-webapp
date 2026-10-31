# Project Guidelines

## Stack & Commands
- Stack: NestJS, TypeORM, PostgreSQL/PostGIS, Next.js, Tailwind, shadcn/ui, Docker.
- PM: pnpm (use `pnpm --filter <app> <cmd>`).
- Strict TS, mobile-first, responsive, skeleton loaders, SOLID principles.

## Interaction & Git
- Language: French for discussion, English for code/docs/commits.
- Git: Gitflow, Conventional Commits (no AI/Claude mentions). User validates PRs.

## File Inspection & Token Guardrails
- Source code: Max 150 lines per read. If > 150 lines, locate targets via `grep -n` and inspect using `offset`/`limit`.
- Configs/Locks/Data: NEVER read full lockfiles, logs, GeoJSON, GPX, or Docker files. Use `jq`, `yq`, `grep`, `head`, `tail`.
- Tests: Run targeted files only (never full suite). Silence linters (`--quiet`).

## Admin Tables
- Every back-office list uses the data table kit (`@/components/admin/data-table` + `runTableQuery`). Read `docs/admin-tables.md` first (skill `admin-table`).

## Split Panel & Details
- Every side panel uses the split panel kit (`@/components/split-panel`), generic, knowing nothing of tables. Read `docs/split-panel.md` first (skill `split-panel`).
- Every detail of a back-office row (panel, dialog or page) uses the detail kit (`@/components/admin/detail`). Read `docs/admin-detail.md` first (skill `admin-detail`).

## Output Rules
- Output changed lines only (minimal diff style).
- No unrequested architectural overhauls or passive code echoes.

## Task Delegation

Spawn subagents to isolate context, parallelize independent work, or offload bulk mechanical tasks. Don't spawn when the parent needs the reasoning, when synthesis requires holding things together, or when spawn overhead dominates.

Pick the cheapest model that can do the subtask well:
- Haiku: bulk mechanical work, no judgment
- Sonnet: scoped research, code exploration, in-scope synthesis
- Opus: subtasks needing real planning or tradeoffs

If a subagent realizes it needs a higher tier than itself, return to the parent.

Parent owns final output and cross-spawn synthesis. User instructions override.