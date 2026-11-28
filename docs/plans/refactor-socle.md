# Plan — refactor `socle` (menu)

Goal: bring the whole monorepo (back, front, extension, Docker, CI) up to
[`docs/best-practices.md`](../best-practices.md) — code that is simple to read, solid and
easy to evolve — **without changing what the user sees**, except for bugs found on the way
(each one with a test that fails without the fix).

Started 2026-11-24. Re-read this file before every step; tick a box only once it is verified.

## Decisions

- **D1 — Branches.** Campaign branch `refactor/socle` (from `main` 2a479ca). Every lot is a
  branch `refactor/socle-<lot>` and a PR into `refactor/socle`, squash-merged after review.
  The final PR `refactor/socle` → `main` stays **open for the maintainer**: merging into `main`
  deploys (back cron on the shared host, front via `deploy-front.yml`).
- **D2 — Behaviour.** Refactor only. The GraphQL contract (`schema.gql`) changes only when a
  rule requires it (error codes, bounded arguments), and the front is updated in the same lot.
  Visual baselines are **never** updated: a visual diff is a regression to fix, or a question
  written in the journal for the maintainer.
- **D3 — Review loop.** Implementer (one agent, its lot only) → picky reviewer (separate
  agent, comments on the PR with numbered findings) → implementer fixes → reviewer re-reviews
  until LGTM → I read the diff, check CI and run the checks, then merge.
- **D4 — Errors.** Services keep throwing Nest HTTP exceptions (a conscious choice: simple, no
  extra error hierarchy). One global filter turns unknown errors into a generic 500 / GraphQL
  `INTERNAL_SERVER_ERROR`, maps SQLSTATE `23505` / `23503` to a conflict, and every GraphQL
  error carries a stable `extensions.code`.
- **D5 — Enums.** TS `enum` only when registered in GraphQL (`registerEnumType`); `as const`
  unions everywhere else.
- **D6 — Scope.** Rules listed under "Out of scope" in the checklist are not applied (single
  instance, few users).
- **D7 — One back lot at a time** (Drizzle migration numbers would collide). Back and front lots
  of this repo are not run at the same time either (the front depends on `schema.gql`).
- **D8 — Checks before every push**, in each touched package: `pnpm lint`, `pnpm format:check`,
  `pnpm typecheck`, `pnpm test`, `pnpm build`; front `pnpm typecheck` (`nuxt typecheck`) is the
  authority. Back e2e tests need PostgreSQL: Docker is off on this PC, so they run in CI
  (`ci-back.yml` runs on every PR touching `back/`).
- **D9 — No deployment, no merge into `main`, no Docker restart** during the campaign.
- **D11 — `timestamp` → `timestamptz`** is not done inside slice lots: a generated
  `SET DATA TYPE timestamptz` has no `USING ... AT TIME ZONE 'UTC'` and would shift production
  data by the server time zone. Slice lots list their timestamp columns in the journal; one
  dedicated migration (generated, then checked against prod data with the maintainer) does them all.

## Lots

Each lot audits **every file** in its scope against the checklist, fixes, adds the missing
tests, and lists in its PR body the rules checked and what was left (with the reason).

Status per lot: `impl` implementer PR open · `review` LGTM · `ci` green · `ok` my validation · `merged`.

| Lot | Scope                                                                                                                                                                                                                                                                                                                                                             | Size (ts+vue lines) |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| M1  | Back socle: `main.ts`, `app.module.ts`, `infrastructure/**` (config/env validation, `configureApp`, global error filter, GraphQL hardening, throttler, health, database), `tsconfig`/ESLint strictness, `Dockerfile`, `docker-compose.yml`, `ops/`                                                                                                                | ~1.2k + config      |
| M2  | Back `domain/grocery`                                                                                                                                                                                                                                                                                                                                             | 3.2k                |
| M3  | Back `domain/auth`, `user`, `household`, `profile`                                                                                                                                                                                                                                                                                                                | 4.1k                |
| M4  | Back `domain/bugReport`, `customRecipe`, `improvementRequest`, `customFood`, `weekPlan`, `weight`, `imageLibrary`                                                                                                                                                                                                                                                 | 4.0k                |
| M5  | Front socle: `nuxt.config.ts`, `ddd/`, `infrastructure/**` (ui, asset, api, i18n…), `tsconfig`/ESLint, PR CI for front and extension (`ci-front.yml`, `ci-extension.yml`)                                                                                                                                                                                         | ~2k + config        |
| M6  | Front `domain/menu`                                                                                                                                                                                                                                                                                                                                               | 5.5k                |
| M7  | Front `domain/planner`                                                                                                                                                                                                                                                                                                                                            | 4.8k                |
| M8  | Front `domain/order`, `shopping`, `batch`, `today`                                                                                                                                                                                                                                                                                                                | 5.6k                |
| M9  | Front `domain/weight`, `insights`, `recipe`, `profile`, `library` (also: show an alert when `useMyFoods().hasFailed` / `useMyRecipes().hasFailed` is true in the library panels, with a test; handed over by M10)                                                                                                                                                 | 7.6k                |
| M10 | Front `domain/auth`, `weekShare`, `onboarding`, `bugReport`, `improvementRequest`, `cooking`, `customCatalog`, `legal`, `progress`                                                                                                                                                                                                                                | 3.4k                |
| M11 | `extension/`                                                                                                                                                                                                                                                                                                                                                      | 1.7k                |
| M14 | Transverse, runs before M8: no `void` on a promise anywhere (back, front, extension; ESLint `ignoreVoid: false`), one shared retry helper with exponential backoff + full jitter on outbound idempotent calls and polling, back global interceptors (request log, timeout), front `useApi` / GraphQL interceptors (401 to sign-in, report unexpected errors once) | repo-wide           |
| M13 | Dependency upgrades (back, front, extension) until `pnpm audit --prod` is clean, then `pnpm audit --prod` in every CI                                                                                                                                                                                                                                             | —                   |
| M15 | Performance: k6 suite on every API operation with failing per-operation budgets chosen from UX rules, full profiles weekly, time budgets in the back e2e tests (median + SQL query count), Playwright screen timings, Vitest timeouts and benches, Lighthouse CI budgets (section "Performance lot")                                                              | —                   |
| M12 | Final pass: duplicates across slices, dead code / unused dependencies (`knip`), README and docs up to date, final PR to `main`                                                                                                                                                                                                                                    | —                   |

- [x] M1 — impl · review · ci · ok · merged (PR #2, dd84bec)
- [x] M2 — impl · review · ci · ok · merged (PR #3, 4759525)
- [x] M3 — impl · review · ci · ok · merged (PR #5, a10a9ee)
- [x] M4 — impl · review · ci · ok · merged (PR #9, f76b490)
- [x] M5 — impl · review · ci · ok · merged (PR #11, 3175bbc)
- [x] M6 — impl · review · ci · ok · merged (PR #12, fded7a9)
- [x] M7 — impl · review · ci · ok · merged (PR #13, c6734e4)
- [x] M14 — impl · review · ci · ok · merged (PR #14, 0288698)
- [x] M8 — impl · review · ci · ok · merged (PR #17, 5e5b1ae)
- [x] M9 — impl · review · ci · ok · merged (PR #20, be0bae9); M9 review nits for M12: anchor `query me` in the e2e stub with `/query\s+me\b/`, and build the Intl stub with `Object.create(Intl)` instead of `{...Intl}`
- [x] M10 — impl · review · ci · ok · merged (PR #19, d31a3a1); also from M14: the sign-in redirect survives the Google OAuth round trip (carried in `state`, tested)
- [x] M11 — impl · review · ci · ok · merged (PR #15, 1aa82aa; deploy the back before the extension); also from M14: `claim`/`report`/`finish` and the carrefour PATCH retried with a server-checked idempotency key, or the reason recorded
- [x] M13 — impl · review · ci · ok · merged (PR #21, 303a9b0)
- [ ] M15 — impl · review · ci · ok · merged (after M13; before M12)
- [ ] M12 — impl · review · ci · ok · merged; also from M14: mail and push sends retried with an idempotency key, or recorded as not needed (duplicate acceptable); also (maintainer decision 2026-11-26): no personal first name left in test fixtures or design docs (`front/**/*.test.ts` household and ingredient fixtures, `docs/conception-courses.md`), neutral names instead
- [ ] Final PR `refactor/socle` → `main` opened, left for the maintainer

## Performance lot (M15) — load tests and time budgets that fail

Requested by the maintainer on 2026-11-25: k6, "test as much as possible", and code tests that
**fail when something is too slow**, not just a smoke run, with budgets chosen from UX rules.
Model: `devops/load/` and `.github/workflows/load.yml` of the shop site repo (k6 2.3.0, a
replica on the runner, profiles).

### Budgets come from UX rules, not from what the code does today

A budget is what a person accepts, then split between the network, the API and the rendering.
A baseline measured on CI only checks that the budget is reachable; **if the code is slower than
the UX budget, the test is red and that is a bug to fix** (never a budget to raise).

| UX rule (source)                                                           | Threshold    | Budget it gives                                                                                                              |
| -------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Feels instantaneous (Nielsen 0.1 s; RAIL "response")                       | 100 ms       | visible feedback after a tap or click (pressed state, skeleton, optimistic update) ≤ 100 ms                                  |
| Interaction to Next Paint, "good" (Core Web Vitals)                        | 200 ms (p75) | INP ≤ 200 ms on every page; no long task > 50 ms on the main thread during an interaction                                    |
| Doherty threshold (flow is kept)                                           | 400 ms       | a mutation (save, toggle, add) answers in p95 ≤ 400 ms end to end, API p95 ≤ 250 ms                                          |
| Flow of thought kept (Nielsen 1 s; RAIL "load" ≤ 1 s on a warm navigation) | 1 s          | main content of a screen visible ≤ 1 s after a client-side navigation; the API reads that feed it p95 ≤ 300 ms, p99 ≤ 800 ms |
| Largest Contentful Paint, "good" (Core Web Vitals)                         | 2.5 s (p75)  | LCP ≤ 2.5 s on a cold load (Lighthouse mobile, slow 4G); FCP ≤ 1.8 s; TTFB ≤ 800 ms                                          |
| Cumulative Layout Shift, "good"                                            | 0.1          | CLS ≤ 0.1; every deferred block reserves its place (skeleton)                                                                |
| Attention limit (Nielsen 10 s)                                             | 10 s         | any operation over 1 s shows progress; over 10 s it runs in the background with a notification, never a blocking wait        |

Under load (k6 `load` profile, expected peak × 3) the same p95 budgets hold; under `spike` p95
may reach 2× for the duration of the spike, never more; `http_req_failed` < 1 % everywhere.

### Work

1. **k6 suite in `devops/load/`** (TypeScript, own `package.json`, linted and typechecked in CI):
   one scenario per API operation (every GraphQL query and mutation, the REST routes, the extension endpoints `claim` / `report` / `finish`), with seeded realistic data (several accounts with
   full data, not an empty database) and per-request `check`s on the status and the body shape.
   Profiles: `smoke`, `load` (expected peak × 3), `spike`, `stress`, `soak` (30 min, watches
   memory and pool growth), `breakpoint` (ramping arrival rate until a threshold aborts: the
   maximum sustainable throughput goes in the job summary).
2. **Budgets that fail**: one `devops/load/budgets.ts` file, values from the table above, per
   operation tag: `http_req_duration{op:...}` p95 and p99, `http_req_failed` < 1 %, `checks`
   > 99 %; `abortOnFail` on the breakpoint run. Tightening is free; loosening needs the
   > maintainer's OK in the PR.
3. **Realistic constraints**: the API runs on the runner held to the shared host's limits
   (1 CPU, 512 MB heap, same Node and PostgreSQL major versions, same pool size), PostgreSQL as a
   service container. **Never load the production host** (a light pass of a few requests at
   most, under the rate limit).
4. **CI** (`load.yml`, `permissions: contents: read`): on every PR touching `back/**`, `front/**`
   or `devops/load/**`: `smoke` + a short `load` (≤ 5 min), red on any threshold breach. Weekly
   cron (Monday 03:00 UTC) + `workflow_dispatch`: `load`, `spike`, `stress`, `soak`,
   `breakpoint`, report as an artifact, summary in `$GITHUB_STEP_SUMMARY`.
5. **Time budgets in the code tests** (they fail when too slow):
   - back e2e: a shared helper measures each operation over N >= 10 calls on seeded data and
     asserts the **median** under its UX budget; one budget test per operation;
   - deterministic proxies wherever they exist: the **number of SQL queries** per request is
     constant whatever the number of rows (N+1 guard, counted through the Drizzle logger), lists
     are paginated or bounded, hot queries use their index (`EXPLAIN` asserted on the largest
     tables);
   - `pg_stat_statements` on the CI PostgreSQL; the 10 slowest statements of the load run in the
     job summary;
   - Vitest: explicit `testTimeout` / `hookTimeout` per config so a hung or slow test fails;
     `vitest bench` on the hot pure functions with a stored baseline;
   - front, Playwright on the built app with seeded data and CPU throttling ×4: for each main
     screen, time from navigation to its main content visible (user timing marks), budget 1 s
     warm / LCP 2.5 s cold; INP of the main interactions <= 200 ms; skeleton visible <= 100 ms;
   - front, **Lighthouse CI on the runner only** (never locally: it saturates the dev machine)
     on the main pages: LCP, CLS, TBT < 200 ms, total JS and image weight budgets, all blocking.
6. **Anti-flake rules**: no timing assertion on a single sample; CI re-runs a failed timing test
   once before reporting; a budget that flakes twice in a week is investigated (real slowness or
   a wrong budget), never silently raised.
7. The PR lists every operation and screen with its budget, the UX rule behind it and the
   measured value, plus the breakpoint throughput. Every budget the current code misses is a
   separate `fix(...)` commit (slow query, missing index, N+1, waterfall of requests, heavy
   render), with the budget test proven red before the fix.

## Journal

- 2026-11-24 — Worktree `C:\projets\menu-socle` on `refactor/socle`. Checklist
  `docs/best-practices.md` written (courses + verdure back checklist + house conventions).
  Plan written.
- 2026-11-24 — M1 (back socle). Turned on: `noImplicitOverride`, `noFallthroughCasesInSwitch`,
  `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`; ESLint `no-floating-promises`,
  `no-unsafe-argument` (were warnings), `eqeqeq` (null allowed), `no-console`.
  **Deferred to the last back slice lot** (every occurrence must be fixed first, most are in `domain/`):
  `noUncheckedIndexedAccess` (28 sites: user repository 5, grocery e2e 5, throttler guard 2 now fixed,
  grocery report/mail 2, grocery job repository 2, target.service.test 2, one each in weight, weekPlan,
  profile, improvementRequest, household, device, seeder test, customRecipe, customFood, bugReport
  repositories), `exactOptionalPropertyTypes` (10 errors),
  `@typescript-eslint/no-unnecessary-condition` (~35 errors), `no-non-null-assertion` (7),
  `consistent-type-definitions` (fastify module augmentation in domain needs `interface`).
  Candidate for deletion, not touched (prod is the shared host): `back/render.yaml`.
  M1 review: `pnpm audit --prod` reports 56 vulnerabilities (27 high, mostly transitive through
  fastify and apollo), so it is not wired into CI yet: needs a dependency-upgrade lot first. The
  prod image keeps the full `node_modules` on purpose: `drizzle-kit` (a dev dependency) runs the
  migrations in the entrypoint. `ops/deploy-o2switch.sh` (rewrites old addresses into `.env`) is a
  deletion candidate with `back/render.yaml`. `ops/deploy.sh` does not poll `/health` after the
  restart: the cron has no public API origin to poll and a new curl step must not be able to break it.
- 2026-11-24 — M1 merged (PR #2): 3 review rounds, 19 findings (4 blockers: env snapshot broke e2e,
  exponential fragment depth, Fastify 4xx turned into 500, proxy chain). Open for the maintainer after the
  final merge: check on the real server that a spoofed `X-Forwarded-For` does not change the rate-limit
  bucket. Added lot M13 (dependency upgrades + `pnpm audit` in CI), run before M12.
- 2026-11-24 — M2 (back `domain/grocery`). Done: every `noUncheckedIndexedAccess` site of the slice
  fixed (flag still off, last back lot turns it on; `insertedRow` helper in
  `infrastructure/database/rows.ts` for `insert ... returning`); job status / event kind typed on the
  column (`$type`, no migration) instead of cast; job + basket lines created in one transaction;
  stable `ORDER BY` (claim, basket lines, push, slots); `close` takes one object and throws
  `NotFoundException` from the service like `reportEvent`; the report notification can no longer fail a
  closed run; same food observed twice in one run no longer 500s (upsert hit one row twice); a malformed
  UUID argument is a `BAD_USER_INPUT` instead of a 500; seeder validates the JSON file at runtime and
  the seed script exits non-zero on failure; dead code removed (`PushMessage`, `pantry.set`,
  `ReferenceEntry`). Deferred on purpose: scalar arguments without a length cap (`label`, `endpoint`;
  moving them into input types changes the contract the extension and front use); slot window
  `endMinute > startMinute` and concurrent `replace` on slots (needs a constraint, so a migration).
  Review round: `finish` only closes a RUNNING run (a retry returns the stored run, no second mail:
  the extension retries a close with `FAILED`, which used to overwrite a success); the report goes out
  in the background (`GroceryReportNotifier`, web-push call capped at 5 s, drained on shutdown; the pantry and prices restate shares the status flip transaction) so a dead mail or push
  service cannot hold the browser; `GroceryService` split (notifier, `CatalogAbsorber`); an event can
  only be appended to a RUNNING run, in one statement; `recordPrices` in one transaction and after the
  upsert; indexes on every FK and on the claim query (migration 0015); tests for the failure paths and
  the all-or-nothing writes. Deferred: `timestamp` to `timestamptz` (see D11); SMTP transport timeouts (infrastructure/mail, not this lot).
- 2026-11-24 — M2 merged (PR #3): 3 review rounds, 20 findings (round 2 blocker: the cupboard/price
  restate ran after the committed close, so a crash lost it for good; now restate + status flip share one
  transaction). Accepted as-is: a retried SUCCEEDED close on an already-closed run does the restate work
  before rolling it back (rare, harmless); no test that this rollback leaves the cupboard untouched.
  Push body money format is now "84,50 €" like the mail and the front.
- 2026-11-24 — M3 (back `domain/auth`, `user`, `household`, `profile`). Done: a link (verification,
  reset) is spent in one transaction with the write it authorises (`AuthTokenRepository.spend`, atomic
  `delete ... returning`), so two holders cannot both use it and a failed write no longer burns it;
  sign-up lets the unique key decide (`on conflict do nothing`), so two simultaneous sign-ups of one
  address both answer 202; Google sign-in is one upsert (no race), and it drops a password set on an
  address that was never confirmed (pre-hijack); an unknown address now pays the scrypt cost like a
  real one (`pretendToVerify`); OAuth state compared in constant time; outbound HTTP to Google capped
  at 5 s, no reply maps to 503 instead of a raw 500; production-only checks (JWT secret, guest list)
  key on Passenger through `infrastructure/config/runtime.ts` (shared with `main.ts`), not on
  `NODE_ENV`; household cap checked and inserted under a lock on the owner row (no overshoot by
  concurrent adds); a malformed UUID on `removeHouseholdMember` is `BAD_USER_INPUT`; `$type` on the
  enum text columns replaces the casts (no migration); `noUncheckedIndexedAccess` sites fixed in the
  three repositories (flag still off); `FRONT_URL` trimming in one helper; dead code removed
  (`consume`, `dropExpired`, `countByOwner`). Migration 0016: unique index on `auth_token.token_hash`,
  index on `household_member.owner_id`. Deferred on purpose: timestamp columns to `timestamptz` (D11:
  `user.email_verified_at`, `blocked_at`, `created_at`; `auth_token.expires_at`;
  `household_member.created_at`; `profile.updated_at`); e-mail case-insensitivity (needs a data check
  and a migration); mail sends stay awaited (a failed verification mail must surface; background sends
  need mail timeouts and a drain, infrastructure/mail lot), so forgot-password and resend still differ
  in timing between known and unknown addresses; logout does not revoke the 30-day JWT.
- 2026-11-24 — M3 review round. Race tests now hold a transaction (`holdTransaction`, uncommitted
  account row or `FOR UPDATE` on the owner) so the second call provably meets the contested state;
  Google callback query is a validated DTO (arrays refused with 400, Google's extra parameters
  dropped); a failure of Google is 503 only for no reply, timeout or 5xx (cause code logged, never the
  request), 4xx stays 401, anything else rethrows; the 5 s cap is asserted on the module wiring
  (`googleHttpModule`); reset-password checks the link is live before hashing; the blocked check runs
  before the upsert, and `oauth_state` is cleared on every callback outcome; one `FRONT_URL`
  normalisation (`frontUrl`). **Residual risk (not changed in this lot, verification flow untouched):**
  an address squatted by a password sign-up keeps the squatter's password if the real owner confirms
  through the e-mail link (confirming signs them in and leaves the hash); mitigation is forgot-password,
  which replaces the password and retires every session (covered by an HTTP-level test). Linking Google
  to an unconfirmed address does drop that password. **For the maintainer, no slice lot owns it:** e-mail
  case-insensitivity (case variants bypass the unique key and the conflict handling): needs a prod data
  check for case duplicates (`select lower(email), count(*) from "user" group by 1 having count(*) > 1`)
  before a unique `lower(email)` index. Awaited mail sends (forgot-password / resend / register timing
  between known and unknown addresses): owner M13 / infrastructure mail (transport timeouts, drain).
  JWT not revoked on logout: accepted, the guard checks `sessionVersion` and a reset retires sessions.
- 2026-11-24 — M3 merged (PR #5): 4 review rounds, 18 findings. Bugs fixed with fail-first proven on probes #6/#7
  (list in the PR body): sign-up race on a taken address, Google upsert race, household cap race, link burnt by a
  failed write, unknown-email login timing, Google callback refusing an array `state`, `oauth_state` cookie left on
  failure, blocked account modified before the check, made-up reset token costing a hash, Google 4xx/408/429 mapping.
  Regression guards (not red on a probe, labelled in the PR body): two holders of one link, Google extra params → 302,
  Passenger-keyed checks, malformed UUID, constant-time state. Residual risk and e-mail case-insensitivity: see the
  M3 implementer entry above (case-insensitivity needs the maintainer for the prod data check).
- 2026-11-24 — M4 (back `domain/bugReport`, `improvementRequest`, `customFood`, `customRecipe`,
  `weekPlan`, `weight`, `imageLibrary`; last back slice lot). **Strictness turned on, one commit each:**
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, ESLint `no-unnecessary-condition`,
  `no-non-null-assertion`, `consistent-type-definitions: type`; every occurrence in the package fixed.
  Fixed: bug and idea announcements run in the background (`infrastructure/background` `BackgroundTasks`,
  drained on shutdown, mail transport capped at 10 s; the daily cap is decided in the request, the
  sending is not); custom food and recipe caps are checked and inserted under a lock on the owner row
  (`addUnlessFull`, no overshoot by concurrent creates); `deleteCustomFood`, `deleteCustomRecipe` and
  `deleteWeightEntry` refuse a malformed id as `BAD_USER_INPUT` (was a 500); `weekOf` of `myWeekPlan`,
  `deleteWeekPlan` and `saveWeekPlan` must be a real day; `weight.date` must be a real day; the
  upload route takes a validated params DTO and removes the photograph it replaces (and a file whose
  manifest write failed); the database module awaits `BackgroundTasks.settled()` before ending the
  pool, and the grocery report goes through `BackgroundTasks` (Nest's `close()` runs `onModuleDestroy`
  BEFORE `beforeApplicationShutdown` and `onApplicationShutdown`, so no shutdown hook can drain work that
  reads the database; a report in flight was lost). Services extracted for customFood, customRecipe, weight; email label maps are keyed
  by their enum. Shared test-app helper everywhere in scope. **Left on purpose:** `timestamp` columns
  for D11: `bug_report.created_at`, `improvement_request.created_at`, `custom_recipe.created_at`,
  `custom_food.created_at`, `week_plan.updated_at`, `weight.created_at`; the `string | null` of
  `userId`/`reportedBy`/`requestedBy` mirror nullable columns (`on delete set null`) and stay at the
  boundary; duplicate ingredient `foodId`s in a custom recipe are still merged silently by the
  `Object.fromEntries` storage shape; `RECIPE_ID` (weekPlan) and the food id pattern (customRecipe) are
  two copies of one rule. **For M12 (infrastructure):** the HTML `escape` helper is copied in the two
  report emails and the grocery report mail; the lock + count + insert cap body is copied between
  customFood, customRecipe and household (a shared `insertUnlessFull` helper). **Deletion candidates:** none.
- 2026-11-24 — M4 merged (PR #9): 2 review rounds, 12 findings. All deferred strict flags are on in `back`.
  Shutdown fix: Nest runs `onModuleDestroy` before `beforeApplicationShutdown`, so background work is drained by the
  database module itself (`BackgroundTasks.settled()`, ceiling 120 s) — covers the M2 grocery notifier too.
  Back socle of menu is done; next M5 (front socle + CI front/extension).
- 2026-11-24 — M5 (front socle: `nuxt.config.ts`, `infrastructure/**`, `app.vue`, tsconfig/ESLint, CI).
  **Turned on:** TS `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noImplicitReturns`,
  `noUnusedLocals`, `noUnusedParameters` (zero errors; Nuxt 4 already sets `noUncheckedIndexedAccess`);
  type-aware ESLint (`projectService`, so `pnpm lint` is slower, about 2 min) with `no-explicit-any`,
  `eqeqeq`, `no-console` (CLI scripts excepted), `no-non-null-assertion` (tests excepted),
  `no-floating-promises`, `no-unnecessary-condition`: all on for `infrastructure/**` and root files,
  **off for `domain/**` through one block at the end of the `eslint.config.ts` rules, which the last
  front slice lot (M10) deletes.** Counts to fix in the domain: `no-non-null-assertion` ~29 (IntroSlides,
  usePlannerWeek, useWeightChart production; the rest tests are already exempt), `no-floating-promises` 2
  (`menu/layout/Header.vue`, `weight/Form.vue`), `no-unnecessary-condition` ~22, `no-console` 1
  (`planner/usePlanner.ts:988`). **Deferred (M10):** `exactOptionalPropertyTypes`: ~35 errors in domain
  slices (planner `PreferencesPanel.vue` Nuxt UI `USelect` handlers 6, library 4, `domain/menu/utils` 3,
  one each across 17 other slices) **plus 14 in `.nuxt/gql/default.ts` (generated GraphQL client) and 1 in
  `eslint.config.ts`**: M10 must decide how to cope with the generated file (exclude it from the app
  tsconfig or keep the flag off). Visual tests are not in CI: baselines are `*-win32.png` only, a Linux
  runner has none and renders fonts differently; the Playwright `*.e2e.test.ts` suites need Chromium and a
  preview server, they stay local. **New CI:** `ci-front.yml` (lint, format, typecheck, unit tests, build)
  and `ci-extension.yml` (same, extension has no `packageManager`, so pnpm is pinned in the workflow; M11
  may add the field). **Bug fixed:** the build scripts `pnpm icons|og|seed-images|photos` all crashed
  ("front root not found"): `paths.ts` looked for the removed `ddd/index.ts`; now it looks for
  `package.json` (test `paths.test.ts`, red on the old code); after the fix the regenerated icons and
  OG cards are byte-identical to the committed ones. **Also:** `infrastructure/asset/utils` (auto-imported
  into the app for nothing, against the "no utils/" rule) moved next to its scripts; the plate drawing
  duplicated in `icons.ts` and `og.ts` is one `drawPlate`; the image manifest read at build is validated
  and capped at 10 s; the recipe list read at build is validated; `buildWorkflow` names the node a
  template lacks; Dockerfile prod `HEALTHCHECK`, `.dockerignore` covers every `.env.*`, `.env.example`
  lists the Sentry and `GQL_SCHEMA` variables. Security (no secret in the bundle: the Sentry DSN is
  public by construction, source maps are deleted after upload; CSP in `hosting/public/_headers`) and the
  a11y of the socle components (skip link, `main` landmark, labelled dialog controls, `aria-pressed`,
  `prefers-reduced-motion`, high-contrast mode) were checked: nothing to change. **Left on purpose, for the
  lot that owns it:** `infrastructure/asset` and `infrastructure/ui/style` hold brand-specific content
  (plate palette, OG copy, menu colours; the checklist wants `infrastructure` project-agnostic): a
  `domain/brand` slice or a move into `domain/menu` is a decision for M6; `domain/menu/utils` and
  `domain/order/utils` (the "no utils/" rule) are M6/M8; `readContent`/`readJsonAt` in
  `asset/scripts/content.ts` trust the JSON they parse (build scripts, the `check` script validates the
  content); `useDisplayPreferences` keeps module-level shared refs on purpose (documented there).
  **Deletion candidates:** none.
  M5 addendum: the extension tests depended on the machine time zone (failed on the UTC CI runner). It was a
  real bug, not a test quirk: `extension/domain/carrefour/slot.ts` now reads weekday and minute in
  `Europe/Paris`. The extension build imports `front/domain/order`; installing the front runs its
  `nuxt prepare` postinstall, so `ci-extension.yml` installs it (both lockfiles cached) and triggers on
  `front/**`. `extension/package.json` now declares `packageManager` (pnpm 11.9.0), which the workflow reads.
  Owners and exit conditions: the visual and Playwright e2e suites stay out of CI until M11 adds
  `ci-e2e.yml` with Linux baselines created there (baselines are never updated during the campaign
  otherwise). Two defensive guards kept on purpose:
  `document.fonts` (old browsers have no FontFaceSet; carries an eslint-disable) and `canvas.toBlob` (covered by a test; it
  needs no directive). `CRC_TABLE[...] ?? 0` in `asset/scripts/workflow.ts` is kept: a throwing access would
  add a branch nothing can reach.
- 2026-11-24 — M5 merged (PR #11): 2 review rounds, 9 findings. Front and extension now have PR CI.
  Prod bug found by the reviewer: the extension read Carrefour slots in the browser's time zone (hidden by a test TZ pin);
  fixed to Europe/Paris. Next: M6 (front `domain/menu`).
- 2026-11-24 — M6 (front `domain/menu`), PR #12 on `refactor/socle-m6`. **Turned on:** `utils/` dissolved into pure
  composables (`useNutrition`, `useTarget`, `useFoodSubstitutes`, `useCatalogBuilder`, `useMenuBuilder`). Only
  `useNutrition`, `useTarget`, `useCatalogBuilder` and `useMenuBuilder` are free of Nuxt auto-imports (a test
  guards them) because `check.ts`, `loader.ts` and `domain/order/scripts/order.ts` run them under tsx;
  `useFoodSubstitutes`, `useFoods`, `useRecipes`, `useSeasonings` use auto-imports. `check --courses --detail`
  and `order` outputs verified identical before/after (diff in the PR body) and a test pins the totals of
  the published week. `useComposedMenu` and `buildMenu` share one tail (`useMenuBuilder`); the ring geometry is
  shared (`useRing`). No dynamic i18n keys left in the slice (`useMenuLabels`, tested for completeness in fr and
  en; `@intlify/vue-i18n/no-dynamic-keys` is `error` on `domain/menu/**`). Persisted localStorage state is
  validated (`useStoredValue` + guards, a corrupted-storage test per store; one bad entry drops the whole value,
  on purpose). `useImages` no longer casts the manifest. Home page split (`ExampleBanner`, `WeekSummary`);
  behaviour change, announced in the PR: a failed week fetch shows an alert (`role="alert"`) with a retry
  instead of looking like an empty week (tested). **Brand moved into the slice:** palette, fonts and macro
  colours are `domain/menu/style/tokens.css`, imported by `infrastructure/ui/style/main.css` through the
  `#brand-tokens` alias (verdure V5 pattern; Tailwind reads `@theme` only in the importing file); the plate
  palette, icon, OG card scripts and their fonts are `domain/menu/scripts/brand/`. Generated icons and OG
  cards are byte-identical (sha256 in the PR body). Left in `infrastructure/seo/public`: the generated brand files (favicon, PWA icons, OG cards), the served root of the seo layer. **Owner M12** (duplicates / dead code, with the infrastructure review): exit condition = `infrastructure/asset` (generic tooling: `generate`, `seed`, `paths`, `content`, workflow) and `infrastructure/seo` audited against the checklist, and the generated files either moved under the menu slice's `public/` or kept with a written reason.
  **Known visual failure:** `batch page in light` (mobile, tablet) fails locally on stale Windows baselines (taken on
  "Semaine du 19 septembre"), because `domain/menu/pages/index.visual.test.ts` does not freeze the clock; not caused by this
  lot. **Owner M8 (batch lot):** exit condition = clock frozen in the visual test and the baselines regenerated in M8.
  **Exempted rules (M5 block) inside the slice:** `no-non-null-assertion` 0, `no-floating-promises` 1 (fixed),
  `no-unnecessary-condition` 1 (fixed), `no-console` 18 in `scripts/check.ts` (allowed by the scripts override).
  The `domain/**` block is therefore not needed for this slice. **Other slices still using dynamic keys**
  `menu.day.*`, `menu.meal.*`, `menu.macroShort.*`: `domain/batch/components/Containers.vue` (owner M8, batch)
  and `domain/library/components/RecipeCard.vue` and `Filters.vue` (owner M9, library): each must switch to
  `useMenuLabels` and turn `no-dynamic-keys` on for its slice in its own lot (exit condition: rule `error`
  on the slice, lint green).
  Observation: `infrastructure/images/nuxt.config.ts` `isImageManifest` rejects a manifest carrying a numeric
  `version`. **Deletion candidates:** none.
- 2026-11-25 — M6 merged (PR #12, fded7a9): 3 review rounds (11 + 7 findings + nits). Local: lint, typecheck,
  vitest 109/601, build green. Next: M7.
- 2026-11-25 — M7 (front `domain/planner`), PR on `refactor/socle-m7`. **Turned on:** `domain/planner` leaves the M5
  exemption block of `eslint.config.ts` (planner errors 6 -> 0: 4 `no-unnecessary-condition`, 1 `no-console`,
  1 `no-non-null-assertion`, `no-floating-promises` was already 0; `domain/menu` stays at 0) and joins `domain/menu`
  under `@intlify/vue-i18n/no-dynamic-keys`. **Done:** every planner label goes through literal keys
  (`usePlannerLabels`, plus `macroLabel`/`macroLongLabel` added to `useMenuLabels`); `usePlannerHistory` and
  `usePlannerPreferences` read persisted values through the M6 `useStoredValue` guards, one corrupted-input test
  each; week days are Europe/Paris calendar days (`usePlannerWeek` helpers, tests use explicit UTC instants, no
  zone pinned); constants of `usePlanner` moved to `usePlannerRules` (it no longer exports `MACRO_ORDER`); the
  failed save no longer logs (`saveFailed` is the signal); new `SaveStatus.vue` keeps a persistent `role="status"`
  region and an explicit `role="alert"` on failure, each with a test. `usePlanner.test.ts` (12 tests) pins the
  facade before the changes. **Review round 1:** `usePlanner.ts` split into a ~90-line facade plus `usePlannerDays/Selection/Spread/Scoring/Swaps/Generation/Saving` behind the same return type (`usePlanner.test.ts` now 39 tests, written before the split); `loadFailed` state with `role="alert"` and a retry in `composer.vue` (`LoadFailed.vue`); `useWeekPlanStore.load` throws instead of swallowing; a failed save keeps its cause and goes to Sentry through the new `useErrorReporting`; `useComposedMenu` reports an unreadable week instead of hiding it; failure shown inside the persistent status region, no nested alert; `saveStateOf` plus one test per state; one shared `useRecipeQuantities`; Paris-day tests proven under `UTC`, `LINT-14`, `PST8PDT` and red under UTC with the old local-time `startOf`. **Deferred:** (1) `exactOptionalPropertyTypes`: 13 planner errors (`PreferencesPanel.vue` 6, `usePlanner.ts` 2, `SaveStatus.test.ts` 1, `DishPicker`/`DishDetail`/`DayPlanner`/`AutoCompose` 1 each; 57 in the front, 14 in generated `.nuxt/gql`) -> M10, exit: flag on in `strictnessFlags` with `nuxt typecheck` at 0. (2) Local-time `Date` helpers in other slices -> M8 for `batch/useBatchContainers`, `order`, `shopping`, `today`; M9 for `weight/useWeightDates`, `insights`, `recipe`, `profile`, `library`; M10 for `menu/useNextWeek`, `menu/useWeekLabel`, `menu/DayCard`; exit in each: they use the Paris helpers of `usePlannerWeek`. (3) `composer.vue` `toLocaleTimeString` for the saved-at time still uses the device zone -> M10, exit: formatted with `timeZone: 'Europe/Paris'`. (4) `useWeekPlanStore` coerces an unknown API enum to Monday/lunch -> M10, exit: unknown value rejected like the stored-value guards. **Deletion candidates checked by grep:** `useGenerateFirstWeek` (menu `ComposePrompt`, onboarding `GenerateStep`) and `varietyWindowWeeks` are used (kept); `DEFAULT_LENGTH` and `weekToCompose` are used inside `usePlannerWeek` (kept); `ApiPlannedDay` (used by `useWeekPlanStore`) and `usePlannerHistory.entries` (used by its tests) are live: nothing to delete.
- 2026-11-25 — M7 merged (PR #13, c6734e4): 3 review rounds (12 + 3 findings). Round 2 caught a data-loss path (save allowed after a failed week read), fixed with a failing-first test. Local: lint, typecheck, build, vitest 117/674 green. Next: M8 (freezes the clock in the batch visual test).
- 2026-11-25 — Checklist gap found by the maintainer: §4 allowed `void` + internal catch, the retry line had no jitter, nothing on interceptors. Checklist updated (§4 no `void`, retries with full jitter through one helper; §5 global request log + timeout interceptors; §10 client interceptors for 401 and error reporting). Lot M14 applies it repo-wide before M8, so M8-M11 start from the rule. `unwrapRef`: no occurrence in the repo or its history.
- 2026-11-25 — M14 (back, front, extension), PR #14 on `refactor/socle-m14`, review round 1 applied. **Turned on:** `@typescript-eslint/no-floating-promises` with `ignoreVoid: false` in back, front and extension; every `void promise` became an `await` or a `.catch` that reports. **Retries:** full-jitter backoff in one module shared by front and extension (`front/infrastructure/api/utils/backoff.ts`, imported by the extension); the back keeps its own twin `retryTransient` (another deployable, no shared package, ~20 lines), used for the Google `userinfo` read only. Extension shop reads/search go through `fetchWithRetry` (the caller's abort signal is kept); `bookSlot` is a single attempt, since idempotency of the shop PUT is unproven. The extension poll is ONE periodic alarm, recreated at worker start if missing, with the jitter as a random sleep (max 5 s, an MV3 worker can be stopped after ~30 s idle) inside the run; a failing run still gets the next tick. The front also jitters ofetch's own read retry and restricts it to the transient statuses 408/429/502/503/504: front auto-retry covers transient statuses only; a network failure is reported at once (ofetch cannot tell it from a 500). **Back:** request log moved to a Fastify `onResponse` hook (so guard/throttler refusals 401/403/429/404 are logged: method, route pattern, status, duration, never token, cookie, body or query; tested); GraphQL: the interceptor logs successful operations, and the exception filter logs every refusal or failure as `Type.field <status> <CODE>` (so a guard refusal is logged once, with its code, never arguments or tokens). 30 s timeout interceptor does not cancel the handler, and exempts the image upload route (`@SkipTimeout`) and subscriptions. New pipes: `deviceLabelPipe` (device pairing) and `pushEndpointPipe` (https URL, length cap), each with a test giving BAD_USER_INPUT before the service runs. **Front:** 401/UNAUTHENTICATED goes to `/profil?redirect=<safe path>`, 5xx and network failures are reported once (WeakSet keyed by the response/cause the interceptor saw; a call about to be retried is not reported yet); tested with the real ofetch chain. `safeRedirectPath` covers encoded, tab/newline and scheme variants; `expireSession` ignores a trailing slash on the sign-in page. **Deferred (owner, exit condition):** (1) mail (nodemailer) and push (web-push) sends are not retried -> M12; exit: the send carries an idempotency key and goes through `retryTransient`, or M12 records it as not needed because a duplicate message is acceptable. (2) Menu `claim`/`report`/`finish` calls and the carrefour `put` PATCH stay at one attempt -> M11; exit: the server side dedupes each call by an idempotency key sent by the extension and they go through `fetchWithRetry`, or M11 records why not. (3) The sign-in redirect is lost on the Google OAuth round trip -> M10; exit: the redirect travels in the OAuth `state` and a test lands back on it. **Deletion candidates:** the per-component `void refresh()` copies are gone.
- 2026-11-25 — M14 merged (PR #14, 0288698): 4 review rounds (3 major, 8 minor, 7 nits). Local: back lint/typecheck/build/test 211, extension 62, front lint/typecheck + vitest 124 files / 774 tests; local front `pnpm build` stalls at Nitro under memory pressure (1 GB free, other sessions), CI front build green is the authority. Deferrals copied into the M10, M11 and M12 boxes. Checklist: front auto-retry covers transient statuses only. Next: M8.
- 2026-11-25 — M11 (extension + back claim/report + CI e2e), PR on `refactor/socle-m11`. **Deploy order: the back before the extension** (the extension always sends `claimKey` and `eventId`, which an older back rejects; an older extension still works on the new back). **Idempotent retries (M14 deferral 2):** `claim` sends a per-call `claimKey` (new nullable column `grocery_job.claim_key`, unique with `device_id`, migration 0017 by `pnpm db:generate`; the same key returns the run the first call claimed), `report` sends a per-event `eventId` (insert `on conflict do nothing` then lookup of the recorded event), `finish` was already idempotent (UPDATE guarded on `status = RUNNING` + `returning`). All three, and the session report, go through `fetchWithRetry`; both GraphQL arguments are optional so an older extension still works (`schema.gql` edited by hand for the two arguments; the printer churn was reverted). e2e tests for the three retries run in CI only (Docker off locally). **Carrefour PATCH (`put`) stays at one attempt, reason recorded at the call:** third party, no key can be checked, and whether `counter` is an amount or an increment is unknown, so a retry could add a quantity twice; I did not probe it against the live shop (it would change a real cart). Exit: a measured probe showing the shop sets the quantity (not adds), then `put` goes through `fetchWithRetry`. **Bugs fixed (failing-first proven locally against the old code):** the progress listener was added per run and never removed, so later runs reported to earlier runs (and the notification was lost when `finish` failed); shop reads treated a 5xx as an empty cart or an empty search, so a run carried on without emptying the real cart (`expectOk`). **Audit:** the other extension files already follow the checklist (no `void`, return types, no `.js` imports). **CI:** `.github/workflows/ci-e2e.yml` runs the Playwright behaviour + visual suites with `--update-snapshots=missing` and uploads the written `*-linux.png` as the `linux-baselines` artifact; committing them is a person's decision (owner: Matthias, exit: baselines reviewed by eye and committed); visual stability of the batch page depends on the M8 clock freeze. **Deletion candidates:** none.
- 2026-11-25 — M8 (front `domain/order`, `shopping`, `batch`, `today`), PR on `refactor/socle-m8`. **Turned on:** the four slices
  leave the M5 exemption block of `eslint.config.ts` and join `@intlify/vue-i18n/no-dynamic-keys`; the block stays for the
  slices of the remaining lots (exit condition: the last slice lot deletes it). **Done:** the menu visual suite waits for
  the network and freezes the clock (no baseline touched); `domain/order/utils` dissolved into `useOrderLines`,
  `usePantryStock`, `useBridgeMessages`, `types/order.type.ts` (the extension and the scripts that imported it follow);
  every dynamic key replaced by literal maps (`useOrderLabels`, `useShoppingAisles`, `useMenuLabels` for meals and days);
  Paris-day helpers replace local `Date` code in batch, today and shopping (`shiftedBy`, `parisMinutesOf` exported from
  `usePlannerWeek`); batch timers, daily checklist, pantry, cart, spend and eaters are read through `useStoredValue`
  guards, one corrupted-input test each; failed loads are announced (`role="alert"`) with a retry on the menu, batch,
  cooking-mode, shopping, today and order screens, and failed saves/pairing/push are reported through `reportError`.
  **Bugs fixed (own `fix` commits, failing-first):** a refused clipboard left the share button loading for good; an
  unreadable device list made `Setup` auto-pair a stray browser and `Button` claim none was paired.
  **Deferred:** `useWeekStatus` (menu slice) still reads local-time `getDay` / `new Date(weekOf + 'T00:00:00')`, so
  `isWithin`, `statusOf`, `dayIndexOf` and the demo-menu lookup in `useToday` stay local-time — owner lot: M12 (final pass,
  `domain/menu` merged in M6), exit: they use the planner Paris helpers. Remaining `null` types: GraphQL
  boundary values in order and shopping (`!= null`, `number | null` from the API) — owner: M12, exit: the front
  GraphQL types are mapped to `undefined` at the API boundary.
  **Review round 1:** GraphQL operations are no longer reported by the components (`gqlErrors.client.ts` already does, checklist
  §10): one `useAttempt` composable holds the failed flag, `reportError` stays for non-GraphQL failures (clipboard, push,
  polling). Every failure state now has a test that fails when the code is removed: `Setup` (3), `Threshold`, `SlotWindows`,
  `PushToggle`, the order-button queue failure, the `order:follow` poll surviving a failed round. The corrupted-input claim is
  now true for each store: the `shopping:eaters` copy is covered by `useShoppingEatersStore.test.ts`. Stored-value guards
  reject what the app cannot write: timers need whole non-negative seconds and a real `endAt`, glass counts are whole numbers
  up to 8. The Paris midnight-edge tests added to `usePlannerWeek` and `useDailyChecklist` are **regression guards** (those
  helpers already read Paris in M7, so they pass on the old code); the discriminating test for the M8 change is
  `featuredSlotOf` in `useToday.test.ts`: 5 tests red on the old `useToday.ts` under `TZ=UTC` and `TZ=LINT-14`, green on the new one. `todayKey` is `daysFrom(startOf(now))[0]`, covered by the `startOf` guards. **Visual suite:** `pnpm test:visual` run once locally on Windows, 154 passed (24 menu visual shots); the clock frozen at 2026-09-19 10:00 +02:00 renders the same as the 15:35 baselines, no baseline touched or regenerated. The M7 line "baselines regenerated in M8" is therefore settled as "not needed": the freeze is the whole fix, and the Linux baselines CI writes stay a person's decision (M11). **Known gaps:** `Button` hides the
  order button while the device list failed, the retry is the only action offered; `useToday` picks the day on the Paris
  calendar while `demoMenuForToday` still uses the local `isWithin`, so for a signed-out visitor the two can differ near
  midnight until M12 moves them. `useTimerChime` swaps its guard for `typeof AudioContext` (unrelated to the slices' rules, untested, noted in
  the PR). The retry tests wait on the calls made instead of sleeping 300 ms. The files in `domain/order/composables` that
  export no composable lose the `use` prefix (`orderLines`, `pantryStock`, `bridgeMessages`); `describeOrderLine`, French
  for the CLI only, lives in `scripts/`.
- 2026-11-25 — M10 (front `domain/auth`, `weekShare`, `onboarding`, `bugReport`, `improvementRequest`, `cooking`, `customCatalog`, `legal`, `progress`; also M14's Google redirect), PR on `refactor/socle-m10`. **Turned on:** `no-dynamic-keys`, `no-non-null-assertion`, `no-unnecessary-condition` and `no-console` now apply to the nine slices (added to the two lists in `eslint.config.ts`; the block is not deleted, M9's slices are still in it, expect a one-line merge conflict there). Static i18n keys (`EmailForm`, `legal/Document`, `legal/Footer`); validated storage through `useStoredValue` (onboarding flag and draft, cooking diary); a failure state with `role="alert"` and a test on every surface that can fail: e-mail verification and password reset ('unavailable' apart from 'invalid link', retry on verification), the week-share card (`weekShare.failed`), reports and suggestions screens (admin check, list load with retry, status/block actions), both feedback dialogs, the custom foods/recipes load (`hasFailed`); `useAttempt` moved to `infrastructure/monitoring` and reused; `useAuth` deadline timer cleared; Google sign-in carries the page to return to in the OAuth `state` (validated both ends, covered over HTTP in `auth.e2e.test.ts`). Also from M7: `menu/useNextWeek`, `menu/useWeekLabel` and the composer's saved-at time on `Europe/Paris`; `useWeekPlanStore.fromApi` refuses an unknown day or slot instead of coercing it. **Deferred:** (1) `exactOptionalPropertyTypes` (about 35 domain errors, 14 in generated `.nuxt/gql/default.ts`, 1 in `eslint.config.ts`) -> M12, exit: flag on in `strictnessFlags` with `nuxt typecheck` at 0. (2) `menu/DayCard.vue` `dateLabel`/`isPast`, `menu/pages/index.vue` `dateOf` and `WeekPicker.dateOf` still build local-midnight `Date`s -> M12, exit: the day travels as a 'YYYY-MM-DD' string and is formatted with `timeZone: 'Europe/Paris'`. (3) `MyFoodsPanel`/`recettes.vue` (owner M9, library) should show an alert when `useMyFoods().hasFailed` / `useMyRecipes().hasFailed` is true -> M9, exit: the alert and its test exist. (4) `useBugReport`/`useImprovement` and the two admin pages are near-twins; merging them would touch the GraphQL operations of two back slices -> M12 (duplicates across slices), exit: one feedback composable and one admin list component. **Deletion candidates checked by grep:** `useCardCanvas.download` and `shareCard` (still used by `insights/MonthlyRecapCard` and the `useWeekShareCard` tests; remove with M9 when that card moves to the `OrFail` variants); nothing else unused. **Remaining `null` types:** `useOnboardingDraftProfile` (storage boundary, on purpose), GraphQL `reportedBy`/`requestedBy` (generated types), `Card.vue` canvas ref checks. **`timestamp` columns:** none in the front.
- 2026-11-25 — M9 (front `domain/weight`, `insights`, `recipe`, `profile`, `library`; also the library alerts handed over by M10), PR on `refactor/socle-m9`. **Turned on:** `no-dynamic-keys`, `no-non-null-assertion`, `no-unnecessary-condition` and `no-console` now cover these five slices; the M5 exemption block in `eslint.config.ts` is deleted, so `no-dynamic-keys` covers every domain slice. Static i18n keys everywhere; one shared `auth/components/SignInOptions.vue`. **Failure states (`useAttempt`, explicit `role="alert"`, a test each):** weigh-in load (retry), save and removal; profile answers load (retry) and save; household load (retry) and member removal; progression table; library own foods/recipes load (retry, the M10 hand-over), food and recipe save, removal of an own food/recipe; monthly recap card (draw/download/share). `isUnauthenticated` is exported from the GraphQL interceptor: a signed-out read still answers empty, any other failure is no longer passed off as "nothing yet" (`useWeightLog`, `useProfile`, `useHousehold`). `useRecipeNotes` reads through a validated serializer (legacy bare text kept, 400-character cap). **Bugs fixed (red first, run against the old code):** impossible dates accepted by `isValidDate`; `todayDate`, season month, recap filename and DST-week `weeksBetween` on the device zone instead of Paris; stale `today` in weigh-in validation; silent draw/download/share failures in the recap card; swallowed load errors in profile/household; unhandled rejections on weigh-in and own-recipe removal; unbounded stored recipe note. **Deletion candidates:** `useCardCanvas.download`/`shareCard` deleted (M10 candidate); nothing else unused. **Deferred:** (1) `exactOptionalPropertyTypes` -> M12, exit: flag on in `strictnessFlags` with `nuxt typecheck` at 0. (2) Local-midnight `T00:00:00` parses in `menu/DayCard`, `menu/pages/index`, `WeekPicker`, `AdherenceHistory`, `PlanNextWeek`, `useWeekStatus`, `weekShare/Card` -> M12, exit: day carried as 'YYYY-MM-DD' and formatted with `timeZone: 'Europe/Paris'`. (3) Remaining `null` types (generated GraphQL, storage boundaries) -> M12, exit: none left outside generated code. **Review round 1:** the recipe page (household/profile load) and the monthly recap card (weigh-in load) now show an alert with a retry and a test each (`recipe.portionsFailed`, `insights.recap.loadFailed`); the Paris-calendar helpers moved from `planner/usePlannerWeek` to the new `infrastructure/calendar` layer (`parisCalendar.ts`, with their tests), so `weight` and `library` no longer import the planner (that is the only cross-slice import removed: others remain, see Review round 2); the recipe-note cap counts code points (emoji on the boundary tested, legacy-text test labelled a regression guard; red proof: the old `slice` fails the new assertion); the coach card's failed alert no longer resets when the verdict changes (`useAttempt` clears on success only), now covered by a test; unnecessary cast removed from the interceptor. **Review round 2:** the claim that no slice imports another slice was false and is withdrawn: the one-way slice rule is not yet enforced. Remaining cross-slice imports in `front/domain`, outside tests (grep on relative imports): `menu` -> `planner` (2), `today` -> `planner` (1), `planner` -> `menu` (1), `planner` -> `profile` (1), `shopping` -> `profile` (1), `insights` -> `menu` (8) and `weight` (2), `library` -> `menu` (1) and `customCatalog` (4), `order` -> `menu` (8), `customCatalog` -> `menu` (1). **Deferred, owner M12:** exit = every cross-slice import either moved to an `infrastructure` layer or to the owning slice's public types, or listed with a written reason, and an ESLint `no-restricted-imports` rule forbids the rest (the `menu` <-> `planner` pair is a cycle to break first). `useHousehold` now fails explicitly on a reply without its list (the e2e API stub in `dialogs.e2e.test.ts` answers every list read with a well-formed empty reply and refuses an unstubbed one); `useAdherence` exposes `hasFailed`/`dismissFailure` when the saved weeks are unreadable (`useStoredValue` takes an `onRejected` callback) and the recap card says so with an alert; the recipe-note cap now cuts on graphemes (`Intl.Segmenter`). **`timestamp` columns:** none in the front.
- 2026-11-26 — M13 (dependency upgrades; `pnpm audit --prod --audit-level=low` in every CI), PR on `refactor/socle-m13`.
  **Result:** `pnpm audit --prod` reports no known vulnerability in `back`, `front` and `extension` (back had 56 findings, front 126,
  extension none). New blocking step `Audit production dependencies` in `ci-back`, `ci-front` and `ci-extension`
  (`pnpm audit --prod --audit-level=low`, no `continue-on-error`); `ci-e2e` installs the same front lockfile, which `ci-front`
  audits, so it has no step of its own. **Nothing is ignored:** every advisory had a fix.
  **Back:** in-range upgrade of every dependency; `fastify` pinned to 5.12.8 (the version `@nestjs/platform-fastify` 11.2 ships);
  `nodemailer` 9 to 10 in its own commit (only breaking change of 10.0.0: Node 20 floor; typecheck, build and mail tests unchanged).
  **Front:** `pnpm update --prod` (Nuxt 4.7, `@nuxt/ui` 4.13, Vue 3.5.46, `@nuxtjs/i18n`, Sentry) plus targeted updates of
  transitive packages. Nuxt 4.7 types `useFetch` options per known server route and defaults to GET; `useApi` now accepts
  `AnyServerRouteMethod` (the calls go to an external API). It also reads the preview command from the config, not from the
  generated output: the e2e web server runs `nuxt preview` with `NITRO_PRESET=static`, for that process only; the site it serves
  is built by the same `pnpm generate` the deploy runs, so the output is identical.
  **Overrides (`pnpm-workspace.yaml`), each pinned inside the major that fixes it, scoped to its parent where one parent needs it:**
  `@graphql-tools/utils@<12.0.2` to `^12.0.2` in both packages (back asked for 11, front for 9, 10 and 11; only 12.0.2+ is fixed, so
  this is the one deliberate major jump, to 12 and never 13; codegen output, build and the 973 front tests were checked against it);
  `@nuxt/devtools>simple-git` to `^4.0.1` (3.x is vulnerable, critical; `@simple-git/argv-parser` follows from simple-git 4 itself, no
  override); `lodash@<4.17.24` and `immutable@<3.8.4` inside their own major; `minimatch` to `^11.0.1` only under `readdir-glob`,
  `graphql-config`, `eslint` and `@eslint/config-array` (fixed from 11.0.1 only; a global jump breaks `eslint-plugin-import-x`).
  The `zod` override was not needed once the lockfile was refreshed and is gone.
  **Exit condition, checked by a script:** `ops/check-overrides.mjs` (workflow `check-overrides`: every Monday 06:17 UTC, on pull
  requests touching a `pnpm-workspace.yaml`, and on demand) removes each override in a temp copy, resolves again and audits; it fails
  when the audit stays clean, i.e. the parent now resolves a fixed version, and names the override to delete. A network, registry
  or resolve error is not read as "still needed": one retry, then exit 1 with "could not be checked" (outcomes tested in
  \`ops/check-overrides.test.mjs\`, run in the workflow). The workflow also runs on pull requests touching any \`package.json\` or
  \`pnpm-lock.yaml\` of the three packages. Owner: the maintainer,
  who removes what it reports. Run by hand: `node ops/check-overrides.mjs back front`. `fastify` is exempt (it dedupes a package,
  it is not an advisory).
  **Front dev dependencies not updated:** `pnpm update` over the whole tree fails, 2026-11-26, with
  `ERR_PNPM_NO_MATCHING_VERSION No matching version found for mdn-data@2.37.2` (chain `@nuxt/eslint@1.17.0` > `@nuxt/eslint-config` >
  `eslint-plugin-unicorn@73.0.0` > `@eslint/css-tree@4.1.3`). Owner: the maintainer. Retry on 2026-12-03 with `pnpm update` in `front`
  (any dev-only advisory does not reach `pnpm audit --prod`); drop this line once it resolves.
  **Mail (the M3 deferral):** the transport already had 10 s connection, greeting and socket timeouts (M4). Register,
  `resend-verification` and `forgot-password` no longer await the mail server: the lookup, the token and the send run through
  `BackgroundTasks` on every branch, so a known and an unknown address answer in the same time, a slow or dead server shows
  nowhere in the response, and a refused send is logged (it used to turn a recorded sign-up into an error; the reader asks for
  another link). Drained on shutdown by the shared registry (M4). The e2e `post` helper waits for background work, so tests read
  the mail a request produced. `domain/auth/mailWithoutWaiting.test.ts` covers: the three routes hand the mail over without waiting
  (mail server that never answers, known and unknown address), a slow send is still pending when the call is back, and a refused
  send is logged, not thrown, on all four sends (reset, resend, register new account, register taken address). Red on the old
  behaviour: with failures not logged the four refusal tests fail; with register awaiting the mail, four register tests fail. The
  e2e suite is CI only (no Postgres locally). `extension` needed no change.
- 2026-11-26 — M13 merged (PR #21, 303a9b0): 4 review rounds (3 major, 6 minor, 2 nits). Overrides pinned inside the fixing major and scoped to parents; `ops/check-overrides.mjs` (with `node --test` tests) fails on a useless override and on an unreadable audit report, runs weekly and on any PR touching a manifest or lockfile. Mail sends no longer awaited (register, resend, reset), fail-first proven by mutation for each route. Next: M15.
- 2026-11-26 — M15 back half (PR #22, draft, box not ticked: the front half belongs to another lot):
  **Turned on:** `devops/load/` k6 suite (TypeScript, k6 2.3.0) playing every GraphQL operation and every REST route in six
  profiles (smoke, load, spike, stress, soak, breakpoint); `.github/workflows/load.yml` (pull request: smoke + load; Monday 03:00 UTC
  and on demand: all six) with the API held to one core and 512 MB (`taskset -c 0 node --max-old-space-size=512`), k6 on the other
  cores, Postgres 17 with `pg_stat_statements` (ten slowest statements and RSS/CPU in the job summary). Back e2e budgets
  (`back/infrastructure/performance/`): median of 15 samples per operation (read 100 ms, mutation 100 ms, credential 100 ms,
  upload 250 ms), a query-count guard per operation (N+1) and EXPLAIN checks (no sequential scan on the hot tables). Pure hot
  functions have benches. Budgets, in ms (p95 / p99): read 300 / 800, mutation 250 / 800, credential 250 / 800, upload 250 / 800 (the mutation numbers: the plan gives no more room).
  **Measured on CI (full dispatch, 45755175894 on 794f461):** every operation within budget, failed 0.00 %. Load: read p95 at most 16 ms,
  mutation at most 20 ms (p99 53 ms), login 46 ms, upload 57 ms. Soak 30 min: RSS 358 to 430 MB, flat, p95 7 ms. Breakpoint: the API
  gives way at about 395 operations per second on one core.
  **Budgets missed: three, all in the code, fixed there.** The EXPLAIN check had a regex typo (a lone backslash-b in a template literal is a
  backspace) and could never fail; fixed, it went red on `weight`, `custom_food` and `custom_recipe` read by account with no index
  (run 45747548600) and the migration `0018_user_scoped_read_indexes` fixes them. The credential and upload budgets had been set
  looser than the plan without approval; they now sit at the mutation numbers and the code meets them. Other first-run reds were
  test and fixture faults, fixed as such; no budget was loosened and no job made non-blocking.
  **Guards added after review:** coverage derived from the schema and the controllers (a new operation
  without a k6 scenario and a budget fails `coverage.e2e.test.ts`), per-operation `checks` and `http_reqs` thresholds, class latencies
  computed by the summary, a failed `pg_stat_statements` read fails the job, N+1 counted at two list lengths for the four
  list-writing mutations plus a refusal of a thousand-item list, other accounts' rows (300 accounts) in the world and the k6 database,
  Postgres pinned to core 1 (API core 0, k6 the rest). The suite has one administrator, `admin@example.com`; a second one doubled the announcements the bug-report tests hold back.
  **Deferred:** the front half (web vitals, bundle and interaction budgets): owner lot M15 front, exit when its PR is merged.
  Mail send time stays out of the budgets (sent in the background, M3). A baseline on the real shared host: owner the maintainer,
  exit when a run of the `load` workflow against it is decided (hosting decision, not a code one).
  **Deletion candidates:** none.
- 2026-11-26 — M12a (first half of M12: the nits and duplicates that touch no dependency), PR on `refactor/socle-m12a`. **M9 nits:** the e2e stub matches `/query\s+me\b/` (so `query meals` cannot be taken for `me`), and the no-`Intl.Segmenter` test builds its stub with `Object.create(Intl, ...)` instead of spreading (a spread copies only own enumerable members, which silently drops anything the prototype chain provides). **Duplicates (M3 journal):** one `escapeHtml` in `back/infrastructure/mail/escape.ts` (with a test) for the bug-report, improvement-request and grocery-report mails; one `insertUnlessFull` in `back/domain/user/insert-unless-full.ts` (lock on the owner row, count, insert) for customFood, customRecipe and household. It lives in the user slice, not in `infrastructure`, because the lock is on the `user` table and infrastructure may not import a domain. Behaviour unchanged, covered by the existing cap e2e tests (including the concurrent-add ones). **Mail and push retries (M14 deferral 1): no retry for now, recorded.** The duplicate itself is not the problem (a second verification or reset mail is harmless). The real reason is that a failure can be ambiguous: SMTP has no idempotency key, so an error after the DATA phase (a timeout waiting for the answer, a dropped connection) cannot be told apart from a message the server accepted and delivered. A failure before DATA (connection refused, connection timeout) would be safe to retry once through `retryTransient`; web-push has no key either (its `Topic` header only replaces a message still waiting on the push service). Not done now because every send is already fire-and-forget, capped by a timeout and logged on failure (M3/M4), and a lost message is recoverable: verification and reset links are re-requested by the person, the report mails are notices that also sit in the admin list, and a lost push is followed by the mail. No retry code is added; revisit only if the logs show real losses (owner: the maintainer, exit: a send-failure rate worth a retry, then a single retry limited to failures before DATA, with a `Message-ID` the server can dedupe). **Anonymisation (maintainer decision):** household and ingredient fixtures in `useHouseholdQuantities.test.ts` and `IngredientList.test.ts` use neutral names (Alex, Sam, Charlie, Robin, Jo), and `docs/conception-courses.md` says "the maintainer". **Left on purpose (cannot or must not change):** the author field of the three `package.json`, the clone URL in the README and the `REPO` / `REPO_URL` values in `ops/deploy.sh` and `ops/setup-cron.sh` (GitHub repository address), the README credit line, and the legal notice translations (`front/domain/legal`, a legal publisher mention that is required); also one comment in `front/infrastructure/monitoring/nuxt.config.ts` naming a sibling repository. **Deletion candidates:** none (`knip` is M12b).

- 2026-11-26 — M15 front half (PR #23, base `refactor/socle`; the back half is a separate PR, so a one-line conflict here
  is expected). Turned on: Playwright timing suite on the generated site (`pnpm test:perf`: API stubbed, CDP CPU x4,
  Pixel 7 viewport, fixed clock, median of 10 passes, one worker, Event Timing for INP with an error when no entry exists,
  layout-shift and LCP observers, rAF probes for "main visible" and "first visible change"); budgets in one file
  (`infrastructure/performance/budgets.ts`: main content 1 s warm, LCP 2.5 s cold, INP 200 ms, feedback 100 ms, CLS 0.1);
  nine screens, 24 tests, all blocking in `.github/workflows/perf-front.yml` (`timings`, `bench`, `lighthouse`; no
  `continue-on-error`, one automatic retry in CI at most). Lighthouse CI on the runner only (calibrated slowdown, median of
  5, LCP, CLS, TBT < 200 ms, script and image weight). `vitest bench` baseline (`bench/baseline.json`, fails beyond 2x)
  and explicit test timeouts. Bugs the budgets found, each its own commit with the red run recorded in the PR: `/recettes`
  layout shift 0.154 (seasonal banner arriving late: height reserved); signed-in screens shift 0.108-0.113 (header grew 4 px
  when the avatar replaced its skeleton: height held); week and recipes warm navigation 1.04-1.09 s (seven closed days
  and 144 recipe cards drawn at once: bodies drawn on first open, list drawn 12 at a time); composer tap feedback 124-129 ms
  (every candidate dish re-ranked by a week simulation in the tap's own render: ranked after paint); shopping/today warm
  feedback 142-284 ms (navigation bar throttled by 200 ms: throttle 0); error reporter in the first-paint script
  (about 137 KB: fetched on the first error instead). A probe bug found on the way (week toggle selected the meal options
  menu). All 24 timing tests green on two runners of different speed (warm main content 253-677 ms, INP <= 76 ms, CLS <= 0.008).
  **Lighthouse job (budgets unchanged): script weight now passes, TBT and LCP stay red.** The weight budget is a transfer
  size: `resource-summary:script:size` counts compressed bytes as served, and 350 KB there is 350 KiB = 358,400 B (the
  earlier "358-378 KB" figures were decimal kilobytes of transfer, not raw size). Reducing first-load code, one commit each:
  i18n message compiler dropped (`bundle.runtimeOnly`, messages precompiled at build); the three feedback dialogs, the
  display-preferences dialog, the recipe and food forms, the planner panels loaded on first open (`useOpenedOnce` plus `Lazy`
  components; entry chunk 905,952 -> 686,048 B raw, 266 -> 213 KB transferred); day cards `hydrate-on-visible`; bottom-bar
  and lazy-chunk prefetch hints removed; select and account menu no longer preloaded; language picker a native select;
  week select lazy; day and meal action menus loaded on first touch (`ActionsMenu`). Home page script weight 375,735 ->
  363,296 (select and menus made touch-only) -> 323,778 B (action menus); the other four URLs 349,8xx-351,426 B, all under
  358,400.
  **Lighthouse reference (maintainer approval 2026-11-26, PageSpeed Insights reference):** a fixed CPU slowdown of 4x
  instead of the multiplier calibrated per runner (about 6.6 on the CI runners); calibration script and workflow step
  removed (`ci(lighthouse)` commit). Budgets unchanged.
  **Calibrated x4 (maintainer approval 2026-11-27, supersedes the fixed 4):** `cpuSlowdown = max(1, 4 x benchmarkIndex /
REFERENCE_BENCHMARK_INDEX)` for Lighthouse and the Playwright perf run, so the times are projected onto the real
  app whatever the machine. REFERENCE_BENCHMARK_INDEX = 2950 (constant of `front/perf-calibration.cjs`, the median of the CI runners and the constant common to the three projects; this repository's own median of the 22
  per-run benchmarkIndex medians is 2800, within 10 %, so 2950 is kept; not the outdated 1500-2000 of the Lighthouse documentation), the speed at which the 4x of the PageSpeed mid-tier
  phone is held; the factor only divides the host's speed out (Lighthouse documentation, "CPU throttling": the multiplier
  stands for the gap between the host and the target device as `benchmarkIndex` measures it). Each perf job runs
  `pnpm calibrate` (3 warm-up runs); indexes more than 15 % off their median make it fail and it is rerun once, then the
  job is red (not conclusive). `LH-SUMMARY` lines end with the warm-up benchmarkIndex, the factor and the free RAM.
  LCP 3 s sur les pages texte : accord du maintainer du 27/11 ; cause : script d'entrée compté par Lantern
  (`/`, `/composer`, `/courses` in `lighthouserc.cjs` via `assertMatrix`; photo pages stay at 2.5 s, TBT 200, CLS 0.1).
  Photo pages, maintainer option A (27/11): photographs served from the site itself (AVIF/WebP 320-1024 px built by
  `infrastructure/images/scripts/localizeImages.ts`, `srcset` + `sizes`, LCP image preloaded with `imagesrcset`, <= 60 KB).
  Budgets unchanged. The Playwright run is throttled by the same factor, so its medians are compared as they are:
  dividing a median measured under the factor by that same factor would cancel the projection.
  Then, each measured in CI (medians of 5): modulepreload links dropped for every non-entry chunk (simulated first paint
  3.0 -> 2.56 s on every URL); the entry animation starts at opacity 0.6 instead of 0 (an element at opacity 0 is not
  counted as painted, so the hero text became the LCP candidate only after the fade had started: LCP 5.0-5.6 -> 2.7-2.9 s
  on `/`, `/composer`, `/recette`); the JSON catalogs emitted as `JSON.parse` strings (`vite.json.stringify`, kept: TBT at the
  calibrated multiplier 366 -> 338, 686 -> 625, 613 -> 472, 330 -> 275, 277 -> 252 ms). Tried and reverted: inlining the
  entry stylesheet (LCP -0.12 to -0.25 s but TBT +100 ms and a timing test failed: 232 KB of CSS parsed in the document).
  **At 4x, last measured figures (TBT ms / LCP ms, budget 200 / 2500; head 87ca6e5):** `/` 151 / 2728; `/composer` 225 / 2875; `/courses` 207 / 2783; `/recettes` 90 / 5658; `/recette/thaiPeanutChickenBowl` 194 / 5699 (the last two LCP are bimodal between runs, about 2.7 s or 5.7 s). CLS and weights pass.
  **Remaining cause per URL.** LCP: on every URL the LCP element is in the generated HTML and paints with the first frame
  (observed LCP = observed FCP, 120-170 ms); the simulated value is the simulated first paint (about 2.56 s: HTML plus the
  render-blocking entry stylesheet, 755 ms of wasted time in the audit, on a 150 ms RTT, 1.6 Mbps link) plus 150-300 ms of
  tasks, so the 2.5 s budget sits under the cost of the first request chain on a static host. TBT: `/composer` is the
  entry chunk evaluation (about 860 ms of scripting) plus the page chunk; `/courses` the entry chunk plus a 136 ms lazy
  chunk. Each also shows one 125-145 ms long task (entry evaluation) near 330 ms. **Item not done: recipe and food data out
  of the entry chunk** (about 40 consumers read the catalogs synchronously; a lazy load only moves the bytes into a request
  waterfall). Options left: (1) split the entry chunk by screen (the composer and courses logic out of the shared entry);
  (2) a hosting-model change (edge or server rendering of the first view): maintainer decision; (3) a lighter first
  stylesheet (critical rules only). Not changed: any budget. Notes: the
  bench baseline was produced on Windows and CI passes it with the 2x tolerance, so it should be regenerated on the runner
  once; a vitest worker teardown error shows up now and then when three monitoring test files run together locally (not in CI).
- 2026-11-26 — M15 front half, local measurement pass (box stays unticked until the PR merges). Machine: Lighthouse
  benchmarkIndex 1606-1997 against a reference of 2950 (common to the three projects; this repository median 2800 over 22 CI reports), CPU slowdown calibrated to
  `4 x benchmarkIndex / 2950` (2.44-2.84) by one tested helper (`perf-calibration.cjs`) read by Lighthouse and the
  Playwright suite; budgets unchanged. Found and fixed on the way: the hosted image manifest carries `"version": 1`, which
  the validator rejected, so every build baked an empty manifest (no photographs, no preload) — now only the string maps
  are kept and `check:generated` fails a build without photographs. Recipe pages and `/recettes` preload their first
  photograph (the image is read once in setup: a `useHead` callback runs after setup, outside the Nuxt context, and `runWithContext` cannot be used there because it is typed `T | Promise<T>` and returned a Promise, which produced `/[object Promise]` routes). The photograph warm-up started 1.2 s
  after idle and pulled up to 6.8 MB into a first load; it now starts on the first gesture (or after 30 s): home page
  image bytes 3.3 MB -> 0.24 MB. Local calibrated results (median of 5): LCP 4.4-6.2 s (budget 2.5 s, red), CLS <= 0.052,
  script <= 342 KB, image weight green except `/composer` (2.05 MB) and `/courses` borderline; TBT 1.1-1.8 s on a loaded
  machine (113-173 ms on the quiet baseline; the same on the old warm-up, so machine load, not a regression).
  Playwright timings, calibrated: 24 of 24 pass (cold LCP 450-708 ms, 1.5-1.7 s on two signed-in screens; CLS <= 0.093).
  Observed FCP equals observed LCP and DOMContentLoaded is 0.3-0.5 s, so nothing hides the page; the simulated LCP
  inflation is to be confirmed on a quiet runner. The 232 KB entry stylesheet is one Tailwind utilities layer (31 KB
  compressed) and is kept as is.
- 2026-11-26 — M15 front half, CI Lighthouse pass (4x CPU slowdown pinned). Cuts pushed: a photograph is requested only
  when it nears the screen (library page: one eager card instead of three; `/recettes` photo weight 706 KB -> 69 KB) and
  GraphQL documents go through a 90-line fetch client instead of graphql-request plus the `graphql` package (entry
  chunk -91 KB unminified, checked with `nuxt analyze`). CI medians before -> after: `/` 2876 -> 2869 ms, `/courses`
  2707 -> 2642, `/composer` 2952 -> 2869, `/recettes` 5636 -> 5767, `/recette/thaiPeanutChickenBowl` 5415 -> 5939 (TBT
  80-154 ms on a faster runner, benchmarkIndex about 4000). LCP did not move with bytes or CPU, so the recipe and food
  data were NOT moved out of the entry chunk (estimated gain under 100 ms against a 2.5 s gap). Cause on the photo pages:
  the simulated LCP image load runs 4.1-5.3 s for 70-96 KB. The photographs come from another origin
  (images.menu.mtxlab.xyz, observed RTT 153 ms on top of the 150 ms simulated), so every first photograph pays a
  connection setup (TCP, TLS, request) and TCP slow start at about 300 ms per round trip; the text-only pages sit at 2.9 s.
  Remaining options, all outside the front slice: (1) serve the photographs from the page's own origin (copy them into
  the build, about 11 MB, or proxy them), (2) next lot, back: resized AVIF/WebP variants from `back/domain/imageLibrary`
  with `srcset`/`sizes` in the front; estimate 1 lot, 65-96 KB heroes down to 20-35 KB and 4-6 KB thumbnails, which lowers
  transfer time but not the connection setup, so it alone is unlikely to bring `/recettes` and `/recette` under 2.5 s.
  Budgets untouched.

### M15 front half, entry split by screen: nothing left to split

`nuxt analyze` of the entry (1,246,894 B unminified, about 201 KB gz in CI): Vue, Nuxt, vue-router, unhead,
the i18n runtime, Nuxt UI with reka-ui and tailwind-merge make about 830 KB of it, and every screen needs them.
The i18n messages are already per locale and lazy, Sentry loads on the first failure, the GraphQL runtime is
the lite client. What only some screens use is the recipe and food catalogue (143 KB raw, about 30 KB gz,
imported by 28 files) and the generated GraphQL SDK (26 KB raw): together under 40 KB gz, about 30 ms of
simulated LCP, so the -150 KB gz target is out of reach without dropping Nuxt UI. The `LH-SUMMARY` line
(benchmarkIndex, LCP and TBT per URL) is now printed by the Lighthouse job.

### M15 front: entry chunk and the photographs the host lacks (2026-11-27)

- Entry chunk measured with `nuxt analyze` (gz, per module, summed before compression so the parts overstate the real
  220 KB gz): nuxt runtime 55, domain 51 (of which `recipes.json` 20.5 and `foods.json` 4.8, read synchronously by
  `recipeCatalog`), `@vue/runtime-core` 38, `@nuxt/ui` 29 (`tailwind-merge` 12), i18n runtime 42 (messages are already
  one lazy file per locale), unhead 16, vue-router 15 (+5), reka-ui 15, icon client bundle + iconify 21, vueuse 9.
  The Sentry client chunk (85) is separate. A target of 100 KB gz is out of reach without making the recipe catalogue
  asynchronous, which every page and the prerender read synchronously.
- Hydration deferred (`Lazy...` + `hydrate-on-visible`) below the fold: seasoning/pantry blocks and aisles of
  `/courses`, the household balance of `/composer`, the reminders of `/`; the week's day cards already were. E2E test:
  `courses.e2e.test.ts` (first tap on an item is taken).
- Photographs listed by the image host's manifest and answering 404 (existing fault of the host, not invented here):
  equipment/colander.ae85e743, container.104562a9, cookingVessel.c58bd4e2, cuttingBoard.3add2bc8, knife.3dc0ee49,
  ladle.21e5d554, mixingBowl.a63c2675, ovenTray.98629283, scale.0a7c5e4f (all `.webp`). `pnpm check:generated` fails for
  any other referenced photograph the host lacks (`KNOWN_MISSING_ON_HOST` in `localImages.ts`).
- Cut 1, catalogue out of the entry: `domain/menu/plugins/loadCatalog.ts` (enforce `pre`, awaited before mount) imports
  `recipes.json` and `foods.json` dynamically and fills the reactive catalogues; `useMenu` builds its menus on first
  use instead of at import. Entry 220 -> 196.9 KB gz (`recipes.js` is its own 20.5 KB chunk). Domain code left in the
  entry is 26 KB gz: the week header, solver and week store, which every page's header needs (selected week, today).
  Cut 3, icons: the client bundle already holds only the 173 icons the scan finds (52.7 KB raw, 10.5 gz), nothing more
  to drop. Cut 4: `pnpm check:generated` now measures the entry script (ceiling 198 000 B gz, `entryChunk.ts`) and
  fails if the recipe catalogue is back in it. The 120 KB target is not reached: what is left is the framework
  (nuxt 55, vue 47, i18n 42, @nuxt/ui + reka + tailwind 56, unhead 16, router 20).
- 2026-11-28 — M15 front, second cut (CSS, blur, and what was tried and dropped).
  Step 1, CSS: Nuxt UI writes every colour variant of every component (entry css 232 KB raw). Limiting Tailwind's
  sources, `componentDetection` and `theme.colors` changed nothing, so `pnpm generate` now prunes after the build
  (`infrastructure/performance/pruneCss.ts`): a rule is dropped if a class it requires appears in no shipped .js/.html
  (escapes kept, keyframes/@property/@font-face untouched). 232 KB -> 143 KB raw (gz 29.9 -> ~19 KB). 60 KB is not
  reachable without editing the Nuxt UI theme generation. `check:generated` fails above 150 000 B
  (`stylesheet.ts`). Local layout/recalc at 4x did not move measurably (~650/445 ms before and after).
  Step 3: `backdrop-blur-lg` and the translucent background removed from Header and BottomNav (opaque `bg-default`);
  local layout unchanged within noise, no baseline moved.
  Step 2, `content-visibility: auto` + `contain-intrinsic-size` below the fold: tried and reverted. No measurable
  layout gain at 4x (layout ~610-790 / recalc ~410-650 ms, same as without), and it moved the full-page visual
  baselines (week page 3280 -> 3471 px high on mobile; shopping/tablet 3700 -> 3652): skipped blocks are not painted
  in full-page captures. Baselines are not to be changed here, hence dropped.
  Step 4, deferring WeekPicker hydration: not done. The e2e preview has a single week, so both arrows are disabled
  and there is no first click to prove (the mandatory test cannot exercise it); the picker is at the top of the page,
  so `hydrate-on-visible` would hydrate at once anyway.
  Step 5, progressive lists: not done, same reason as 2 (fewer server-rendered elements moves the full-page baselines).
  Known, not caused by this cut (identical at HEAD): visual failures mobile week-light (3280 vs 3285 px), tablet and
  desktop batch-light (5613 vs 5614); local perf test CLS 0.36 on the shopping list (0.361 at HEAD, footer shift);
  `pointer.e2e` "keeps the hand" fails about one run in three on desktop (cursor read on a node replaced by hydration).

### 2026-11-28 — M15 front, third cut (CLS, visual, pointer, TBT, LCP)

- CLS of `/courses`: the three aisle blocks were `Lazy` + `hydrate-on-visible` but are only drawn after mount, so the chunk load left a window with neither skeleton nor list and the footer jumped (0.36-0.41). They are eager again and drawn one section per task by `useStagedReveal` behind the skeleton, which stays until the last one is in. Perf test "shopping list cold": CLS 0.001 / 0.01.
- Visual 1-5 px: `git bisect` between 396f2c8 (green) and origin/refactor/socle 10f3ad0 (red) gives M5 (#11, 3175bbc) as first bad commit: the baselines are already red upstream (week-light mobile 3281 vs 3280, batch-light tablet/desktop 5614 vs 5613). On this branch a further +4 px came from `min-h-10` on the header end block; it is `min-h-9` now (same height as upstream, avatar `size-9`).
- `pointer.e2e` "keeps the hand": the control was read while the prerendered skeleton was still being swapped (a detached node has no cursor); it now waits on the list itself. 10 runs in a row green.
- TBT: `useStagedReveal` (from verdure 023c6b4), `UiPlainButton` / `UiPlainBadge` (classes compared with the Nuxt UI theme per variant, size and color; `type="button"`, aria-label kept) in the meal rows and the actions menu.
- LCP photo pages (CI report, /recettes): TTFB 453 ms, load delay 303 ms, load time 87 ms, render delay 2013 ms (70 %); TBT is only 60-110 ms there and the image is discoverable, `fetchpriority=high`, eager, so the render delay is simulated main-thread work of the 197 KB entry bundle, not blocking time.

### 2026-11-28 — M15 front, fourth cut (entry chunk, plain shell, M5 regression)

- Entry script 197 KB -> 168.7 KB gzipped (ceiling `ENTRY_CHUNK_BUDGET_GZIP_BYTES` 198 000 -> 169 000). Source-map attribution of the chunk showed `UApp` (toaster, reka tooltip and config providers), `UButton` / `UAvatar` / `ULink` (header, three FABs, `error.vue`, which Nuxt inlines in the entry) and with them `tailwind-merge` (30 KB), the button theme (12 KB) and `tailwind-variants`. Now: `UiAppProviders` gives the Nuxt UI components what they read from `UApp` (locale, portal target) and nothing else; `LazyUToaster` is mounted on the first toast (`useOpenedOnce`); header, FABs and `error.vue` use `UiPlainButton` (now also a link with `to`), the avatar is `LazyUAvatar` inside the lazy account menu, the skeleton a plain span. `@nuxtjs/i18n`: `compositionOnly` and `fullInstall: false` added to `runtimeOnly` + `dropMessageCompiler` (messages are precompiled; en and fr pages checked in the e2e runs). Locale files of Nuxt UI (fr + en, 7 KB) and the icon client bundle (57 KB) are the next largest items.
- FAB buttons: `UiPlainButton` has no tailwind-merge, so the FABs' `rounded-full` lost to its `rounded-md`; they now use `rounded-full!`.
- Visual baselines (fix of M5 regression, partly): ruled out by a fresh `pnpm generate` + visual run each time: the `?.` of `useHead` in `app.vue`, the strictness flags of `nuxt.config.ts`, the manifest validation (already replaced by `imageManifestFrom`, 338 webp baked in). Found while comparing the captures: below-the-fold blocks of `/` (`hydrate-on-visible`: day cards, reminders, footer) stay in the prerendered French when the visitor's locale is English until they are scrolled into view, so the baselines (English everywhere) cannot match; making them `hydrate-on-idle` gets the content right but is a TBT trade-off left to the coordinator. The 1 px height is not explained yet: with the header opaque (163d4ee) the first rows differ in colour, and the extra pixel is a sub-pixel accumulation above the footer.

## 2026-11-28 - M15 front, fifth cut (English visitor, staged reveal, plain buttons, images in CI)

- **English visitor seeing French (bug, fixed).** The locale arrives by client detection, not by route: `/` is
  prerendered in French (`prefix_except_default`), then `detectBrowserLanguage` (`redirectOn: 'root'`) moves an
  English browser to `/en` at hydration. Lazy components with `hydrate-on-visible` keep the prerendered French
  markup until scrolled to, so every card below the fold and the footer stayed French. The cards, the reminders,
  the footer and the composer's day planners and household balance are now drawn by `useStagedReveal` (one block per
  task after the first paint, a skeleton holding each place), in the language the page is in. Test:
  `domain/menu/pages/index.e2e.test.ts` (en, no scroll, no French word on the page).
- `UiPlainButton` gained `xl`, `outline` (primary) and `block`, each checked against the Nuxt UI `button` theme in
  `plainButton.test.ts`; the three `UButton` of `/` are replaced.
- `localizeImages` retries a failed request (4 attempts, growing pause) and `public/img` is cached between CI runs
  (`actions/cache`, `restore-keys`), so a run starts from the photographs already converted and a dropped
  connection no longer fails the job.
- **M5 regression (1 px, week-light mobile 3281 vs 3280; batch-light tablet 5614 vs 5613, desktop 5550 vs 5549).**
  Not fixed, investigation stopped. Eliminated: the `?.` in `app.vue` `useHead`, the strictness flags of
  `nuxt.config.ts`, the image-manifest validation (fixed upstream, 338 webp baked in), and the French/English
  hydration gap above (still 1 px after it). Owner: M12b. Exit condition: the three baselines match on the
  generated site with no baseline change, or the extra pixel is attributed to a named element and accepted by
  the coordinator.
- Not done: the top blocks of `/` (plan-next-week, summary, adherence) are still drawn with the page; staging them
  needs a reserved height per state, otherwise it adds layout shift.

### 2026-11-28 - M15, sixth cut (composer TBT, LCP path, images)

- **/composer TBT 276 -> 548.** Long task: the entry script (`Bp7TQv37.js`), 247 ms -> 508 ms at the hydration
  time. The staging of the day planners added to the composer was useless (the prerender never has a week, so
  nothing was server-rendered there) and is reverted. A real hydration mismatch was found on /composer: the
  prerender wrote the default targets while the first client render drew the profile skeleton
  (`useProfile().isLoading` was true on the client only). `isLoading` is now true until mounted, on both sides;
  /composer, /courses, /recettes and the recipe page hydrate with no mismatch. `/` still mismatches for an
  English visitor, by design (French prerender, switched to English at hydration).
- **LCP of the photo pages (simulated 2.7 s, observed render delay 100 ms).** The simulation charges every request
  started before the LCP: the entry script (169 KB gz, started at 53 ms), the stylesheet (21 KB), the payload
  (15 KB), two fonts (45 KB), against a 1.6 Mbit/s link, which is why the photograph (23 KB) lands late. The
  entry script does nothing for what is painted, so the generated pages now start it on `load` (or after 4 s):
  `deferEntryScript.ts`, run after the prune in `pnpm generate`. Hydration starts later by the time the page takes
  to load; to be confirmed by the CI numbers (LCP and TBT).
- **Images.** Source: `https://images.menu.mtxlab.xyz` (the author's own host), 169 photographs listed in the
  manifest (9 more are listed but absent), 9.5 MB; the 1216 generated files are 23 MB. They are not in the
  repository: left to the maintainer's decision.

### 2026-11-28 - M15, seventh cut (LHR of 283822d read, defer reverted)

- `deferEntryScript.ts` reverted: no effect on the simulated LCP (2640 / 2709 before and after), and a 4 s fallback
  on hydration is a risk for INP.
- LHR of the CI run (recipe / `/recettes` / `/composer`): simulated FCP 1844 / 1884 / 1849 ms against observed
  119 / 154 / 154 ms; simulated LCP 2640 / 2709 / 2526 ms against observed 119 / 154 / 154. The lcp-breakdown is
  TTFB 455 ms (17 %), render delay 1968 / 1783 / 2071 ms (66-82 %): the load of the photograph is not the cost, the
  simulated paint is. Critical chain, identical on the three pages: document 16 KB -> entry CSS 20 KB (the only
  render-blocking resource, 455 ms wasted) -> two woff2 fonts 30 + 15 KB, and the entry script 165 KB with its
  imports 32 + 5 + 21 + 3 KB. Largest element: the `<img>` (avif 768 w, eager, fetchpriority high, discoverable) on
  the two photo pages, a `<p>` of text on /composer. The payload preload is not in the chain.
- TBT by URL: the entry chunk evaluates 287 / 475 / 572 ms (long tasks 194 / 192 / 458 ms); `/composer` adds a
  second chunk, 199 ms (99 + 87 ms tasks).
- `/composer`: the dish pickers are hydrated on the first interaction (`hydrate-on-interaction`), not at load. The
  mount of the page dropped from ~600 ms to ~330 ms at 4x CPU, the longest task from ~944 to ~630 ms.

### 2026-11-28 - M15, eighth cut (critical CSS)

- The generated pages have no `modulepreload` and no font preload in the head (checked in the HTML), so there was
  nothing to remove there: the entry imports and the fonts are discovered at run time, from the script and from the
  stylesheet.
- Critical CSS: `inlineCriticalCss.ts` (beasties, after the prune) inlines the rules the first paint needs and loads
  the stylesheet without blocking. Beasties drops the `@font-face` style written by the fonts module (the family
  is reached through a custom property), so it is put back as it was. The stylesheet check counts a file once.
  The visual baselines are unchanged (the batch light one also fails without this step, locally).
- Composer: the second re-render was not isolated. An unreachable API (as in Lighthouse CI) fails two requests
  and loads the Sentry client on the page; deferring that load until idle changed nothing measurable, so it was
  not kept.

- Critical CSS measured on CI (run of 0875025) and reverted: simulated FCP 1844 -> 2110 ms on every page, photo LCP
  unchanged (2709 / 2711), TBT unchanged within noise. Inlining the rules and still fetching the full stylesheet
  costs more than the blocking request it removes.

## M15 front : réduction de l'entrée (28/11)

- Carte de l'entrée (gzip estimé) : Vue runtime 22K, iconify 6.5K, reactivity 6.3K, vue-router 5.3K, intlify 5.3K, runtime-dom 4.7K, NuxtLink 3.7K, vue-i18n 3.5K, asyncData 3K, vueuse 2.8K ; Sentry, client GraphQL et catalogue i18n étaient déjà hors de l'entrée.
- Coupe : le bundle d'icônes `@nuxt/icon` (≈ 11 Ko gzip) se charge à la demande côté navigateur (`lazyIconBundlePlugin`, plugin Vite client branché par le hook `vite:extendConfig`), le serveur garde le bundle synchrone (`iconBundle.server.ts`). Entrée 168 282 -> 156 854 o gzip, plafond `check:generated` 169 000 -> 157 000. Test e2e : une icône dessinée après le chargement apparaît toujours.
- Bancs Lighthouse CI : une API factice (`mock-api.cjs`) répond UNAUTHENTICATED comme la prod pour un visiteur, plutôt que des pages sans requête au chargement : mêmes données en prod, et plus d'erreurs réseau qui chargeaient Sentry pendant la mesure.

## M15 front : messages par page, polices, runs d'un tour (28/11)

- Assertions du run 46119647007 (commit 91ee5b8) : une seule échoue, le LCP de la page recette (2567 ms pour 2500). Ni CLS ni TBT. Reste environ 67 ms, soit 14 Ko gzip avant le LCP.
- Polices : sous-ensemble des polices générées (`subsetGeneratedFonts.ts`), rendu inchangé.
- Messages i18n par page : coque (`<locale>.shell.json`, 4,1 Ko gzip contre 19,3) chargée avec toutes les pages ; le reste de chaque domaine (`<locale>.json`) est un chunk chargé avec la route, selon `definePageMeta({ translations: [...] })`. Plugin `domainMessages.ts` : le chargement part dans `beforeEach` (en parallèle du chunk de page) et est attendu dans `beforeResolve` ; `i18n:beforeLocaleSwitch` charge la langue cible avant le re-rendu. Les fichiers chargés à la demande sont précompilés par `lazyMessagesPlugin` (le navigateur n'a pas de compilateur de messages). Clés statiques uniquement.
- Garde-fous : `locales.test.ts` (fr/en synchro par fichier, coque et reste), `domainKeys.test.ts` (une clé lue dans un autre domaine doit être dans sa coque ou dans un domaine chargé par toutes les pages du lecteur), `pageMessages.e2e.test.ts` (21 chemins x fr/en + changement de langue, aucune clé brute visible, 43/43), plafonds gzip par fichier dans `check:generated` (`checkPageMessages.ts` : coque 4 500 o, domaine 5 000 o).
- Entrée : le plugin la faisait passer à 157 959 o (plafond 157 000, non relevé). Coupe : la liste de collections d'icônes (`icon.collections`, 200 noms Iconify jamais utilisés, deux collections servent : lucide, simple-icons) -> 156 858 o. Plafond inchangé.
- Image recette : `HERO_SIZES` (736 px au-delà de 800 px, sinon 100vw - 32 px) correspond à la largeur affichée (`max-w-3xl` moins le padding) ; la variante 768 est choisie à 412 px x 1,75. L'écart 22,7 contre 17,7 Ko vient du contenu de la photo, pas du choix de variante. Qualité inchangée.
- TBT 1460 ms sur `/courses` : tâche unique de 1613 ms dans l'entrée au tout premier run du groupe (les autres runs : 158-199 ms), même heure de départ : bruit du runner, pas un bug déterministe.
- Les chunks propres à la page recette (≈ 12 Ko) : à mesurer sur le LHR du run suivant, après la coupe des messages.

### M15 front : CI sur 11e3559 (28/11)

- Relance du job Lighthouse : mêmes chiffres, donc pas du bruit. LCP recette 2558, TBT `/` 219, `/composer` 300, `/courses` 221 (un run à 490), `/recettes` 92, recette 94.
- Le TBT monte de 30 à 120 ms sur toutes les pages depuis la découpe des messages : le script d'entrée passe de 409 à 584 ms (`/recettes`), à taille égale.
- Pas reproduit en local (profil CDP, CPU x4, 7 runs : 1405 ms contre 1389 ms pour `/composer`), ni avec `runtimeOnly`/`dropMessageCompiler` alignés sur Nuxt. Cause non isolée.
- Bissection par la CI impossible sans relever le plafond d'entrée (157 000 o), refusé : le job échoue avant Lighthouse si `icon.collections` est retiré.

### M15 front : diagnostic et revert de la découpe (28/11)

- Plafond relevé à 160 000 o pour UN run (2b0d309), remis à 157 000 o dans df21534. Sans `icon.collections` ni découpe : TBT `/` 189, composer 254, courses 107 ; avec la découpe et la liste : 219 / 300 / 221.
- Découpe des messages annulée (df21534) : -12 ms de LCP recette pour +30 à +120 ms de TBT. Après annulation (avec `icon.collections`) : LCP 2183 / 2349 / 2184 / recette 2557 / recettes 2409 ; TBT 216 / 211 / 203 / 71 / 65.
- Sans `icon.collections` après annulation : TBT 243 / 213 / 241, donc l'écart des runs CI à config égale est de ±30 ms : le TBT du canal est trop bruité pour trancher un levier de 20 ms. `icon.collections` conservé (entrée -1,1 Ko).
- Reste : TBT texte 3-16 ms au-dessus de 200 et LCP recette 57 ms au-dessus de 2500 ; il faut un vrai levier (travail du script d'entrée, hydratation différée du bas de page), pas un réglage.

### M15 front : chargement différé des composants (28/11)

- Chunks de la page recette : données de toutes les recettes (20,7 Ko gz) et des aliments (5,2 Ko), Sentry client (32 Ko), tailwind-merge/tv (13,4 Ko), bundle d'icônes (10,9 Ko) ; Select + floating-ui + FocusScope + Textarea (~50 Ko) venaient de `USelect`, `UTextarea` (note) et `UAlert`.
- Essai : `Lazy*` + `hydrate-on-idle` / `hydrate-on-visible` sur ces composants (recette, composer, courses, accueil) : -50 Ko avant le LCP, mais CI pire : TBT 253 / 290 / 150, LCP recette 2571, job timings en échec. Annulé.
- Reste sans levier simple : données de recettes en un seul chunk, Sentry, tv.

### M15 front : données de recettes par recette (28/11)

- f914e87 + c36493c : le catalogue lu par toutes les pages n'a plus les étapes (19,4 -> 5,7 Ko gz) ; une chunk par recette (`virtual:recipe-steps/<id>`, ~1 Ko) est chargée par la page recette (embarquée dans son payload), le dialogue de plat et le mode cuisine. Test : la chunk d'une recette ne contient aucune autre recette. Entrée 156 203 o.
- CI (index runner 2500, plus lent que 2950 du run précédent) : LCP `/` 2197, composer 2349, courses 2185, recette 2561, recettes 2411 ; TBT 234 / 219 / 284 / 74 / 72. Au run précédent (même code, runner à 2950) : TBT texte 196 / 178 / 156, mais recette 2569. Le LCP recette ne bouge pas : les données ne sont pas sur son chemin critique.
- Sentry : déjà chargé seulement à la première erreur ; avec l'API simulée de la CI il n'est jamais demandé (vérifié en local : 0 requête sur `/` et sur une recette). Le différer après idle ajouterait 32 Ko de téléchargement pendant la mesure : non fait.
