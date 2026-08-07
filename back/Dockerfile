# syntax=docker/dockerfile:1

# --- base: dependencies shared by every stage ------------------------------
FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app
# pnpm-workspace.yaml carries the allowBuilds approval — without it pnpm refuses
# to run the (approved) native build scripts and aborts the install.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .

# --- dev: hot-reload; the source tree is bind-mounted by compose -----------
FROM base AS dev
EXPOSE 3779
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
CMD ["pnpm", "start:dev"]

# --- build: compile the Nest app -------------------------------------------
FROM base AS build
RUN pnpm build

# --- prod: run the compiled server -----------------------------------------
# Keeps the full dependency tree (drizzle-kit) so the entrypoint can still run
# the migrations — image size traded for a self-contained boot.
#
# No package manager here, deliberately: the entrypoint calls the migration
# binary directly. Going through `pnpm db:migrate` had the container fetch
# corepack's pnpm over the network at every boot and then reinstall all 604
# packages — "Recreating /app/node_modules" — which on a 512 MB instance runs
# it out of memory, and when it does not, outlasts the deploy timeout.
FROM node:24-slim AS prod
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/drizzle.config.ts ./
COPY --from=build /app/tsconfig.json ./
COPY --from=build /app/infrastructure/database/migrations ./infrastructure/database/migrations
# drizzle.config.ts globs the per-slice schemas; keep them so the config loads.
COPY --from=build /app/domain ./domain
COPY docker-entrypoint.sh ./
# The image ships with an unprivileged `node` user; without switching to it the
# server runs as root, so any remote code execution owns the container outright.
RUN chown -R node:node /app
USER node
EXPOSE 3779
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
CMD ["node", "dist/main"]
