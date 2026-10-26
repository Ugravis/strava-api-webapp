FROM node:24-alpine AS base
RUN npm install -g pnpm@10.34.7
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @kilotrace/backend...

FROM deps AS dev
COPY apps/backend apps/backend
COPY packages packages
WORKDIR /app/apps/backend
EXPOSE 4000
CMD ["pnpm", "start:dev"]

FROM deps AS build
COPY apps/backend apps/backend
COPY packages packages
RUN pnpm --filter @kilotrace/backend build \
  && pnpm --filter @kilotrace/backend deploy --prod --legacy /out

FROM node:24-alpine AS prod
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out/package.json ./
COPY --from=build --chown=node:node /out/node_modules node_modules
COPY --from=build --chown=node:node /app/apps/backend/dist dist
USER node
EXPOSE 4000
CMD ["node", "dist/main"]
