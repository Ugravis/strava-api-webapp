FROM node:24-alpine AS base
RUN npm install -g pnpm@10.34.7
WORKDIR /app

# Keep in sync with the turbo version of the root package.json.
FROM base AS prune
RUN npm install -g turbo@2.11.8
COPY . .
RUN turbo prune @kilotrace/frontend --docker

FROM base AS deps
COPY --from=prune /app/out/json/ .
RUN pnpm install --frozen-lockfile

FROM deps AS dev
COPY --from=prune /app/out/full/ .
# The app watches its own sources; the workspace packages it imports are built once.
RUN pnpm turbo run build --filter=@kilotrace/frontend^...
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
COPY --from=prune /app/out/full/ .
RUN pnpm turbo run build --filter=@kilotrace/frontend

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
