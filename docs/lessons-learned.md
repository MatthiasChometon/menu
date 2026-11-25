# Lessons learned

Pitfalls met during the `refactor/socle` campaign and earlier work. One line each: the rule, then why.
Complements `docs/best-practices.md` (the checklist); read both before starting a lot.

## Campaign and process

- Work in your own worktree and check the current branch before every commit; another session may switch branches in the shared folder.
- Never kill a process or port you did not start, and never rewrite a branch another session is using; report it instead.
- Write a plan file first for any task over about three steps, reread it before each step, and tick a box only once the work is done and verified.
- Do not tick lot boxes yourself: add a journal entry in `docs/plans/refactor-socle.md`; a rule deferred to a later lot is listed there with an owner lot and an exit condition.
- Remaining `null` types and test harnesses not on the shared test-app helper are listed in the journal with an owner lot, never silently kept.
- One back lot at a time per repo: two lots generating a Drizzle migration at once produce the same migration number.
- Several parallel workers only on disjoint files, and the real limit is machine memory, not API quota; run heavy suites once, and rerun once before calling a failure a regression (contention causes false failures).
- Read every diff before merging: recurring defects are a regressed lower bound, a clause treated as administrative that carried a condition, and a last tweak never re-tested.
- Two branches building the same mechanism merge without conflict but leave duplicates; after each merge check for duplicated functions and constants and keep the narrower one.
- Before building a feature, check it does not already exist.
- A wrong commit is fixed by amending (then force-push on an unshared branch) so history stays readable; commit messages are English `type(scope): subject`, no trailer.
- With a multi-line commit message in a POSIX shell use a real heredoc (`git commit -F - <<'EOF'`); PowerShell here-strings (`@'...'@`) leave stray `@` characters.
- Check a pull request's base branch before merging it (`gh pr view N --json baseRefName`); a wrong base merges into someone else's branch.
- Scripts that rewrite a data file encode the new content first, back up, write a `.tmp` and `os.replace`; opening with `'wb'` before encoding truncates the file when encoding fails.
- Logs and temporary files go in the worktree (git-ignored) or a scratch folder, never a shared system temp path; PR bodies and commit messages go in a per-lot file.

## Tests and CI

- Run only the tests of the touched files locally; the full suite is the CI job (`gh pr checks`). A test can pass alone and fail in the full suite.
- Prove each bug fix fails first (pre-fix run, or a throwaway CI branch); a test green on the probe is rewritten to discriminate or labelled "regression guard, because ...".
- Race tests are deterministic (barrier or held transaction); a guard added to several methods is tested on each.
- Tests that change `process.env` restore it afterwards.
- A mock cannot prove SQL, and a mock-only test of delegation proves nothing; use the real database.
- Tests never pin a time zone: build dates with `Intl.DateTimeFormat` and an explicit `timeZone`. On Windows, `TZ=` only honours POSIX names (`UTC`, `PST8PDT`).
- `prettier --check` fails on Windows CRLF worktrees: run it on touched files only, and treat Linux CI as the authority.
- Visual baselines are never updated during a refactor.
- Front CI: `permissions: contents: read`, pnpm from `packageManager`, every lockfile cached, triggers cover everything the build reads. A front without a PR workflow gets one.
- Editor language servers report false "Cannot find name" on Nuxt auto-imports; `nuxt typecheck` is the authority.

## Back

- Env is validated in `bootstrap()`, not in `ConfigModule.validate`; numeric env values are parsed strictly (`/^\d+$/`).
- Every REST `@Body` / `@Query` is a validated DTO; the whitelist strips any field without a decorator.
- Third-party query parameters (OAuth callbacks) go through a small pipe that refuses arrays, never a whitelisting DTO; test with the real extra parameters.
- The GraphQL depth limit ignores fields starting with `__`, and `getIntrospectionQuery()` must still pass.
- Production-only checks key on Passenger (`typeof PhusionPassenger !== 'undefined'`), not `NODE_ENV`.
- `timestamp` to `timestamptz` is never done inside a slice lot (existing values are reinterpreted); list the columns instead.
- Side effects (mail, push) never fail the main write nor block the response: fire-and-forget with an internal catch and log, and a timeout on external calls.
- State transitions guard in the `UPDATE` (`where status = ...` plus `returning`) so a retry is idempotent.
- External HTTP errors: only transport errors, 5xx, 408 and 429 mean "retry" (503); other 4xx are a refusal; the unexpected is rethrown and logged with its cause.
- Do not use `void` on a promise: use `.catch()` with logging; use one shared retry helper (exponential backoff with full jitter).
- Nest `close()` runs `onModuleDestroy` (pool closed) before `beforeApplicationShutdown`: delay closing the pool until background work has settled, and prove it with a shutdown e2e test.
- Compose ports go through `${BIND_ADDRESS:-127.0.0.1}`.

## Front

- Cross-cutting HTTP concerns (401 redirect, error reporting, headers) live once in the interceptors.
- `useTemplateRef` for template refs; `role="alert"` is explicit on error blocks.
- New user-visible behaviour is announced in the PR and tested.
- Existing locale decides the tone of new copy; check it before adding strings.

## Menu specifics

- Back tests regenerate `back/infrastructure/graphql/schema.gql` with a different printer: run `git checkout -- back/infrastructure/graphql/schema.gql` before committing unless the contract changes on purpose.
- Background tasks go through the shared `BackgroundTasks` helper; the database module awaits `BackgroundTasks.settled()` before ending the pool.
