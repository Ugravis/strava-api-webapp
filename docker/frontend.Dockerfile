FROM node:24-alpine AS base
RUN npm install -g pnpm@10.34.7
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @kilotrace/frontend...

FROM deps AS dev
COPY apps/frontend apps/frontend
COPY packages packages
WORKDIR /app/apps/frontend
EXPOSE 3000
CMD ["pnpm", "dev"]

FROM deps AS build
# Read at build time: rewrites and public variables are compiled into the bundle.
ARG API_INTERNAL_URL=http://backend:4000
ARG NEXT_PUBLIC_SITE_URL
ENV API_INTERNAL_URL=$API_INTERNAL_URL \
  NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
  NEXT_TELEMETRY_DISABLED=1
COPY apps/frontend apps/frontend
COPY packages packages
RUN pnpm --filter @kilotrace/frontend build

FROM node:24-alpine AS prod
ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1 \
  HOSTNAME=0.0.0.0 \
  PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/apps/frontend/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/frontend/.next/static apps/frontend/.next/static
COPY --from=build --chown=node:node /app/apps/frontend/public apps/frontend/public
USER node
EXPOSE 3000
CMD ["node", "apps/frontend/server.js"]
