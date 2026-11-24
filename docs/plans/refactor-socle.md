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
| M12 | Final pass: duplicates across slices, dead code / unused dependencies (`knip`), README and docs up to date, final PR to `main` | — |

- [ ] M1 — impl · review · ci · ok · merged
- [ ] M2 — impl · review · ci · ok · merged
- [ ] M3 — impl · review · ci · ok · merged
- [ ] M4 — impl · review · ci · ok · merged
- [ ] M5 — impl · review · ci · ok · merged
- [ ] M6 — impl · review · ci · ok · merged
- [ ] M7 — impl · review · ci · ok · merged
- [ ] M8 — impl · review · ci · ok · merged
- [ ] M9 — impl · review · ci · ok · merged
- [ ] M10 — impl · review · ci · ok · merged
- [ ] M11 — impl · review · ci · ok · merged
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
