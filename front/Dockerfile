# syntax=docker/dockerfile:1
#
# nuxt-graphql-client generates its types by introspecting the LIVE back, and
# `nuxt prepare` (the postinstall hook) already triggers it — so the install and
# the build can only run once the GraphQL API answers. They therefore happen at
# container start (see docker-entrypoint.sh), not at image-build time: the image
# only carries the source and pnpm.

FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
# node_modules lives in a named volume, so on a container recreate `pnpm build`
# runs against a pre-existing install. pnpm 11's pre-run "verify deps" would then
# try to reinstall and, finding a mismatch, abort trying to purge node_modules
# with no TTY (ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY). Skip that check and
# never block on an interactive purge confirmation — the deps are already there.
ENV npm_config_verify_deps_before_run=false npm_config_confirm_modules_purge=false
RUN corepack enable
WORKDIR /app
COPY . .

# --- dev: hot-reload; the source tree is bind-mounted by compose -----------
FROM base AS dev
ENV MODE=dev
EXPOSE 3777
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
# `--host` takes a value in nuxi: `--host --port 3777` would make it swallow
# `--port` as the hostname and read `3777` as the positional rootDir, starting
# an empty project (the app then falls back to the Nuxt welcome page). Pass an
# explicit host so both flags parse and the rootDir stays the working dir.
CMD ["pnpm", "exec", "nuxt", "dev", "--host", "0.0.0.0", "--port", "3777"]

# --- prod: build once at first boot, then serve the prerendered output ------
# `nuxt build` (not `generate`) so the output ships with a server able to serve
# it; every route is prerendered all the same, which is what keeps the PWA
# usable offline.
FROM base AS prod
ENV MODE=prod NODE_ENV=production PORT=3777
EXPOSE 3777
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
CMD ["node", ".output/server/index.mjs"]
