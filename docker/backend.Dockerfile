FROM node:24-alpine AS base
RUN npm install -g pnpm@10.34.7
WORKDIR /app

# Keep in sync with the turbo version of the root package.json.
FROM base AS prune
RUN npm install -g turbo@2.11.8
COPY . .
RUN turbo prune @kilotrace/backend --docker

FROM base AS deps
COPY --from=prune /app/out/json/ .
RUN pnpm install --frozen-lockfile

FROM deps AS dev
COPY --from=prune /app/out/full/ .
# The app watches its own sources; the workspace packages it imports are built once.
RUN pnpm turbo run build --filter=@kilotrace/backend^...
WORKDIR /app/apps/backend
EXPOSE 4000
CMD ["pnpm", "dev"]

FROM deps AS build
COPY --from=prune /app/out/full/ .
RUN pnpm turbo run build --filter=@kilotrace/backend \
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
