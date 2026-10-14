FROM node:24-alpine AS base
RUN npm install -g pnpm@10.34.7
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter backend...

FROM deps AS dev
COPY backend backend
COPY packages packages
WORKDIR /app/backend
EXPOSE 4000
CMD ["pnpm", "start:dev"]
