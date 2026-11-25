# Plan — refactor `socle` (menu)

Goal: bring the whole monorepo (back, front, extension, Docker, CI) up to
[`docs/best-practices.md`](../best-practices.md) — code that is simple to read, solid and
easy to evolve — **without changing what the user sees**, except for bugs found on the way
(each one with a test that fails without the fix).

Started 2026-11-24. Re-read this file before every step; tick a box only once it is verified.

## Decisions

- **D1 — Branches.** Campaign branch `refactor/socle` (from `main` 2a479ca). Every lot is a
  branch `refactor/socle-<lot>` and a PR into `refactor/socle`, squash-merged after review.
  The final PR `refactor/socle` → `main` stays **open for Matthias**: merging into `main`
  deploys (back cron on o2switch, front via `deploy-front.yml`).
- **D2 — Behaviour.** Refactor only. The GraphQL contract (`schema.gql`) changes only when a
  rule requires it (error codes, bounded arguments), and the front is updated in the same lot.
  Visual baselines are **never** updated: a visual diff is a regression to fix, or a question
  written in the journal for Matthias.
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
  dedicated migration (generated, then checked against prod data with Matthias) does them all.

## Lots

Each lot audits **every file** in its scope against the checklist, fixes, adds the missing
tests, and lists in its PR body the rules checked and what was left (with the reason).

Status per lot: `impl` implementer PR open · `review` LGTM · `ci` green · `ok` my validation · `merged`.

| Lot | Scope | Size (ts+vue lines) |
| --- | --- | --- |
| M1 | Back socle: `main.ts`, `app.module.ts`, `infrastructure/**` (config/env validation, `configureApp`, global error filter, GraphQL hardening, throttler, health, database), `tsconfig`/ESLint strictness, `Dockerfile`, `docker-compose.yml`, `ops/` | ~1.2k + config |
| M2 | Back `domain/grocery` | 3.2k |
| M3 | Back `domain/auth`, `user`, `household`, `profile` | 4.1k |
| M4 | Back `domain/bugReport`, `customRecipe`, `improvementRequest`, `customFood`, `weekPlan`, `weight`, `imageLibrary` | 4.0k |
| M5 | Front socle: `nuxt.config.ts`, `ddd/`, `infrastructure/**` (ui, asset, api, i18n…), `tsconfig`/ESLint, PR CI for front and extension (`ci-front.yml`, `ci-extension.yml`) | ~2k + config |
| M6 | Front `domain/menu` | 5.5k |
| M7 | Front `domain/planner` | 4.8k |
| M8 | Front `domain/order`, `shopping`, `batch`, `today` | 5.6k |
| M9 | Front `domain/weight`, `insights`, `recipe`, `profile`, `library` | 7.6k |
| M10 | Front `domain/auth`, `weekShare`, `onboarding`, `bugReport`, `improvementRequest`, `cooking`, `customCatalog`, `legal`, `progress` | 3.4k |
| M11 | `extension/` | 1.7k |
| M13 | Dependency upgrades (back, front, extension) until `pnpm audit --prod` is clean, then `pnpm audit --prod` in every CI | — |
| M12 | Final pass: duplicates across slices, dead code / unused dependencies (`knip`), README and docs up to date, final PR to `main` | — |

- [x] M1 — impl · review · ci · ok · merged (PR #2, dd84bec)
- [x] M2 — impl · review · ci · ok · merged (PR #3, 4759525)
- [x] M3 — impl · review · ci · ok · merged (PR #5, a10a9ee)
- [x] M4 — impl · review · ci · ok · merged (PR #9, f76b490)
- [x] M5 — impl · review · ci · ok · merged (PR #11, 3175bbc)
- [x] M6 — impl · review · ci · ok · merged (PR #12, fded7a9)
- [ ] M7 — impl · review · ci · ok · merged
- [ ] M8 — impl · review · ci · ok · merged
- [ ] M9 — impl · review · ci · ok · merged
- [ ] M10 — impl · review · ci · ok · merged
- [ ] M11 — impl · review · ci · ok · merged
- [ ] M13 — impl · review · ci · ok · merged
- [ ] M12 — impl · review · ci · ok · merged
- [ ] Final PR `refactor/socle` → `main` opened, left for Matthias

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
  Candidate for deletion, not touched (prod is o2switch): `back/render.yaml`.
  M1 review: `pnpm audit --prod` reports 56 vulnerabilities (27 high, mostly transitive through
  fastify and apollo), so it is not wired into CI yet: needs a dependency-upgrade lot first. The
  prod image keeps the full `node_modules` on purpose: `drizzle-kit` (a dev dependency) runs the
  migrations in the entrypoint. `ops/deploy-o2switch.sh` (rewrites old addresses into `.env`) is a
  deletion candidate with `back/render.yaml`. `ops/deploy.sh` does not poll `/health` after the
  restart: the cron has no public API origin to poll and a new curl step must not be able to break it.
- 2026-11-24 — M1 merged (PR #2): 3 review rounds, 19 findings (4 blockers: env snapshot broke e2e,
  exponential fragment depth, Fastify 4xx turned into 500, proxy chain). Open for Matthias after the
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
  to an unconfirmed address does drop that password. **For Matthias, no slice lot owns it:** e-mail
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
  M3 implementer entry above (case-insensitivity needs Matthias for the prod data check).
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
