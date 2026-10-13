FROM node:22-alpine AS base
RUN npm install -g pnpm@10.34.7
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter frontend...

FROM deps AS dev
COPY frontend frontend
COPY packages packages
WORKDIR /app/frontend
EXPOSE 3000
CMD ["pnpm", "dev"]
