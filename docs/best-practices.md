# Best practices

Read `docs/lessons-learned.md` too.

One verifiable rule per line, for the whole monorepo (back, front, extension, Docker, CI).
It is the reference of the `refactor/socle` campaign (`docs/plans/refactor-socle.md`):
every lot audits its files against this list, and the reviewer checks every PR against it.

Sources: the back checklist written on 2026-11-01 (verdure PR #3), the revision courses
(TypeScript, Node, Jest, NestJS, GraphQL, Docker, PostgreSQL, back fundamentals) and the
house conventions (architecture, TypeScript, Vue, tests, front, security).

**Context that decides what applies**: one API instance on a shared host (Passenger), one
PostgreSQL, a static or SSR Nuxt front on Netlify, a handful of users. Rules written for
several pods (shared Redis counters, PubSub, outbox, replicas, circuit breakers) are listed
under "Out of scope" at the end, with the reason, instead of being applied for nothing.

**Golden rule**: simple and readable first. A rule never justifies an abstraction that adds
more complexity than it removes (YAGNI, no interface + factory for a single implementation).

---

## 1. Architecture (back and front)

- [ ] Vertical slices: `domain/<slice>` by business sub-domain (singular name), `infrastructure/<role>` by technical role, no `src/`, no `app/`.
- [ ] `infrastructure` never imports `domain` (ESLint `no-restricted-imports`), and holds nothing project-specific (no brand, copy or business data).
- [ ] A slice owns everything about its sub-domain (schema, model, input, repository, service, resolver / pages, components, composables, translations, tests).
- [ ] A slice that holds nothing specific any more is merged into the slice that uses it; a slice that grows too big is split by business sub-domain.
- [ ] File names never repeat their folder (`infrastructure/graphql/module.ts`, `domain/plant/Card.vue`).
- [ ] Tests live next to the code they test, in the slice; no global `test/` folder.
- [ ] Logic repeated across slices is extracted once (injectable helper back, composable front).
- [ ] No dead code: unused exports, files, dependencies, scripts and feature flags are removed.

## 2. Readability (back and front)

- [ ] One level of abstraction per function; the file reads top-down like a story (stepdown rule): intention, steps, sub-operations, technical details.
- [ ] Orchestration, business rules and I/O (SQL, HTTP, files) are never mixed in one function.
- [ ] Function names start with a verb; booleans start with `is` / `has` / `should` / `can`.
- [ ] No vague names (`data`, `info`, `handle`, `process`, `doStuff`, `tmp`, `item2`).
- [ ] Comments only explain a "why" the code cannot express; a comment describing "what" is replaced by a well-named function or removed. Long multi-line comments are a smell.
- [ ] No magic numbers or strings: named constants, wrapped in a function (`plantConstraints()` back, `usePlantConstraints()` front) when shared.
- [ ] Early returns instead of nested `if`; no `else` after `return`.
- [ ] A function has few parameters (≤ 3); beyond, one typed object.
- [ ] Components, services and files stay small enough to read in one screen; a long one is split by responsibility, not arbitrarily.

## 3. TypeScript

- [ ] `strict: true` (back: only `strictPropertyInitialization` off for decorated classes).
- [ ] `noUncheckedIndexedAccess` and `noImplicitOverride` are on, or the reason they are off is written in `tsconfig.json`.
- [ ] No `any` (`@typescript-eslint/no-explicit-any`: error).
- [ ] No non-null assertion `!` in production code (`@typescript-eslint/no-non-null-assertion`: error).
- [ ] No `as unknown as` in production code; `as` only at a framework boundary that cannot be narrowed otherwise. Inference, annotations and generics instead of casts.
- [ ] External data (request body, `fetch` result, `JSON.parse`, `localStorage`, route query, `process.env`, `jsonb`) is `unknown` until validated at runtime; a cast is not validation.
- [ ] `catch (error)` is narrowed (`instanceof Error`) before reading `.message`.
- [ ] A `switch` on a union ends with an exhaustive `default` (`assertNever`), so a new member fails compilation.
- [ ] Closed value sets use `as const` + `(typeof X)[number]`; a TS `enum` only where a library needs one (GraphQL `registerEnumType`).
- [ ] Config and lookup maps use `satisfies` to check their shape without widening.
- [ ] Arrow functions or class methods only (`func-style: expression`, `prefer-arrow-callback`).
- [ ] Every function and method has an explicit return type; front `computed` callbacks too.
- [ ] Variables are typed when inference is vague; `ref(value)` keeps its inferred type, `ref<T>()` only when the initial value cannot carry it.
- [ ] `type` is preferred; `interface` only for back class contracts (front: `consistent-type-definitions: type`).
- [ ] Public types live in a `type.ts` / `<name>.type.ts` file, not inline in a service or component.
- [ ] `undefined` is the absence value; `null` only at the database and GraphQL boundary. No `?? null` conversions inside the app.
- [ ] Imports never carry a `.js` extension; type-only imports use `import type` (except classes injected by Nest).
- [ ] Expected failures of a pure function may return a typed result union instead of throwing.

## 4. Node (back, scripts, extension)

- [ ] No floating promise and no `void` on a promise (`no-floating-promises` with `ignoreVoid: false`): a call is awaited, or, when fire-and-forget on purpose, ends with a `.catch()` that logs (back: Nest `Logger`) or reports (front: `useErrorReporting`) with context.
- [ ] A background task (cron tick, event callback, timer) can never reject unhandled: it catches and logs with context.
- [ ] One failing item does not abort a batch (`Promise.allSettled`, or a per-item `catch`).
- [ ] Independent awaits are not sequential in a loop; concurrency over a big list is bounded.
- [ ] Every outbound HTTP call has a timeout (`AbortSignal.timeout` or the client `timeout`), shorter than our own caller's.
- [ ] Retries only for transient errors (network, timeout, 408, 429, 502/503/504) on idempotent operations, through one shared helper: exponential backoff with full jitter (`random(0, min(cap, base * 2 ** attempt))`), a maximum number of attempts, a cap on the delay, `Retry-After` honoured; never on other 4xx. Polling loops get the same jitter.
- [ ] Front automatic retry (ofetch `retry`) covers reads and transient statuses only (408, 429, 502, 503, 504); a network failure is reported at once, because ofetch cannot tell it from a 500 and retrying a real server bug hides it.
- [ ] Secrets are never put in a URL string; query parameters go through encoded `params`.
- [ ] No `*Sync` fs/crypto call in a request path (boot and CLI scripts excepted); CPU-heavy work (scrypt, sharp) uses the async API.
- [ ] Large files go through streams (`pipeline` from `node:stream/promises`), never `.pipe()` nor a full `readFile`.
- [ ] `bootstrap()` failures are caught, logged and exit with a non-zero code.
- [ ] Long jobs (cron, imports, seeds) are idempotent and can be re-run.
- [ ] A side effect (mail, push, webhook) never fails the main write nor blocks the response: fire-and-forget with an internal catch and log, and a timeout on the external call.
- [ ] Errors from an external HTTP service are mapped on purpose: transport errors, 5xx, 408 and 429 mean "retry later" (503); other 4xx are a refusal; anything unexpected is rethrown and logged with its cause.
- [ ] Production-only behaviour keys on the real runtime signal of the host (Passenger is defined), not on `NODE_ENV`, which the host may leave unset.

## 5. NestJS

- [ ] `app.enableShutdownHooks()` in `main.ts` only; resources (DB pool, timers, cron) are released in a lifecycle hook.
- [ ] One `configureApp(app)` shared by `main.ts` and the e2e tests (same pipes, filters, prefixes, CORS).
- [ ] Environment variables are validated at boot (fail fast) and read through `ConfigService` (`getOrThrow` for required ones), never `process.env` in application code. `.env.example` lists every variable.
- [ ] The server listens on a configurable `PORT`.
- [ ] Every REST body and GraphQL argument is a class with class-validator decorators; the global `ValidationPipe` has `whitelist`, `forbidNonWhitelisted` and `transform`; nested inputs use `@ValidateNested` + `@Type`.
- [ ] Every scalar route param, query param and GraphQL argument with a known format goes through a pipe at the boundary (`ParseUUIDPipe`, `ParseIntPipe`, or a small format pipe for keys and tokens), so a malformed value is a 400 / `BAD_USER_INPUT` before any service or database call.
- [ ] Every REST `@Body` / `@Query` is a validated DTO and every DTO field carries a validator decorator (the whitelist silently strips undecorated fields); numeric env values are parsed strictly (`/^\d+$/`), never with a bare `Number()` or `parseInt`.
- [ ] Third-party query parameters (OAuth callbacks) are read by name through a small pipe that refuses arrays, never a whitelisting DTO that would reject their extra parameters; the test sends the real extra parameters.
- [ ] Controllers and resolvers only translate transport to a service call; business rules live in services; SQL lives in repositories.
- [ ] Repositories return domain types, never ORM row types leaking to resolvers; mapping is explicit.
- [ ] Providers are stateless singletons; no `Scope.REQUEST`; the current user comes from a param decorator (`@CurrentUser()`).
- [ ] Global guards, filters, interceptors and pipes are registered with `APP_*` providers when they need DI.
- [ ] Cross-cutting request concerns are global interceptors, not repeated in handlers: one request log (route, status, duration) and one request timeout.
- [ ] Authentication is default-deny where possible (`@Public()` marks the open routes), and the auth guard runs before any role check.
- [ ] `@Global()` only for config, database and logger modules; `forwardRef` is removed by extracting what both sides need.
- [ ] Non-class injection tokens are `Symbol`s.
- [ ] Shared helpers are `@Injectable` classes named after their role; no `static` members except values needed inside decorators.
- [ ] Logs go through Nest `Logger` with the class name as context, never `console.*` (CLI scripts excepted).
- [ ] Sensitive fields (password hash, token hash) can never reach a response: explicit GraphQL models / response mappers.

## 6. Errors

- [ ] Expected failures are Nest HTTP exceptions (`NotFoundException`, `ConflictException`, …) thrown by services, never a bare `Error` (decision D4 of the plan).
- [ ] One global filter logs unknown errors with context and answers a generic 500 / `INTERNAL_SERVER_ERROR`, never the message, SQL or stack.
- [ ] PostgreSQL errors are mapped: `23505` unique and `23503` foreign key become a 409 conflict, not a 500.
- [ ] GraphQL errors carry a stable `extensions.code` (`UNAUTHENTICATED`, `FORBIDDEN`, `BAD_USER_INPUT`, `NOT_FOUND`, `CONFLICT`); a validation error is never a 500.
- [ ] 401 for missing or invalid credentials, 403 for authenticated but not allowed; a resource the user does not own answers 404 (its existence is not leaked).
- [ ] Status codes are consistent: 201 on create, 204 without body, 409 conflict, 429 rate limited.

## 7. GraphQL

- [ ] Code-first; `schema.gql` is generated and committed; the contract only changes on purpose (any diff of `schema.gql` is explained in the PR).
- [ ] Introspection off in production, playground off, stack traces off (`includeStacktraceInErrorResponses: false`), automatic persisted queries off.
- [ ] Query depth is limited.
- [ ] Lists are `[T!]!`; nullability is deliberate.
- [ ] `@Field(() => Int | Float | ID)` explicit for numbers and ids; enums registered with `registerEnumType`.
- [ ] A `@ResolveField` that hits the database on a list type is batched (DataLoader created per request, results in key order) or joined; never N+1.
- [ ] Every query or mutation on user data is guarded and scoped by the current user id (`where id AND user_id`); never an id or role taken from the input to decide ownership.
- [ ] Pagination arguments are bounded (max page size).
- [ ] The depth limit ignores introspection fields (names starting with `__`), and the standard `getIntrospectionQuery()` still passes where introspection is on.
- [ ] The throttler works in the GraphQL context.
- [ ] Turning introspection off is not treated as authorization.

## 8. PostgreSQL / Drizzle

- [ ] One table per slice in `domain/**/schema.ts`; migrations generated with `pnpm db:generate`, never edited once shipped; a migration never mixes a destructive change with the code that stops using a column (expand, then contract).
- [ ] Columns are `not null` unless absence is meaningful; invariants are enforced in the database (check, unique, foreign key), not only in code.
- [ ] `timestamptz` for instants; `text` rather than `varchar(n)` unless the limit is a business rule.
- [ ] Every foreign key has a deliberate `on delete`; every column used in a frequent `WHERE` or join is indexed (owner `user_id`, token hashes, foreign keys); composite index order is equality columns first, then sort.
- [ ] Queries go through the query builder or the `sql` template (bound parameters); `sql.raw` only for constants; a user-controlled sort column goes through an allow-list.
- [ ] A multi-statement write that must be all-or-nothing runs in `db.transaction`.
- [ ] A read-then-write race is closed by a constraint (`unique`, `on conflict`) or a row lock (`for update`); upserts use `on conflict`, not select-then-insert.
- [ ] Inserts and updates use `returning` instead of a second read.
- [ ] Every list query has a stable `ORDER BY` ending with a unique tie-break (id); nullable sort columns state `nulls first/last`.
- [ ] Paginated lists count with `count(*) over()` in the same round-trip, or only when requested.
- [ ] `count(*)`, `bigint` and `numeric` coming back as strings are converted explicitly.
- [ ] Anti-joins use `not exists`, never `not in`; a left join filters the right table in `ON`.
- [ ] `jsonb` only for genuinely varied data; filtered fields are columns.
- [ ] The pool is closed on shutdown.
- [ ] A state transition guards inside the `UPDATE` (`where status = ...` plus `returning`), so a retry or a double click is idempotent.
- [ ] Nest runs `onModuleDestroy` before `beforeApplicationShutdown`: a module that ends the pool first awaits pending background work, and a shutdown e2e test proves it.
- [ ] A `timestamp` to `timestamptz` change is a deliberate migration of its own (existing values are reinterpreted), never slipped into a refactor.

## 9. Tests (Vitest, Playwright)

- [ ] Tests check behaviour through the public surface (GraphQL, HTTP, rendered component), never implementation details: if a refactor that keeps the behaviour breaks a test, the test is wrong.
- [ ] Mostly integration: back e2e tests boot the real `AppModule` against a dedicated test database (never the dev database); unit tests only for pure logic.
- [ ] No mock-based test that only proves a resolver delegates to a repository; mocks only at real boundaries (external API, mail, push, clock).
- [ ] Arrange / Act / Assert, one behaviour per test, a name that reads as a sentence, identifiers in English.
- [ ] Every test file name contains `.test.` (`.e2e.test.ts`, `.visual.test.ts`); never `.spec.ts`.
- [ ] Every bug fixed during the campaign comes with a test that fails without the fix.
- [ ] Async failures are asserted with `await expect(...).rejects`; boundary cases are table-driven (`it.each`).
- [ ] Time is injected (`now()`) rather than faked when possible; fake timers and mocks are restored after each test (`restoreMocks`); tests are order-independent; an env var changed in a test is restored.
- [ ] The failure path of each external API (timeout, 5xx) has a test.
- [ ] A bug-fix test is proven to fail first (run before the fix, or on a throwaway branch); a test that is green without the fix is rewritten to discriminate or labelled "regression guard, because ...".
- [ ] Race tests are deterministic (barrier or held transaction), never a sleep; a guard added to several methods is tested on each of them.
- [ ] Tests never depend on the machine time zone: pin it explicitly (`Intl.DateTimeFormat` with `timeZone`), never rely on the runner default.
- [ ] A mock cannot prove SQL: repository behaviour is tested against a real PostgreSQL.
- [ ] Critical paths are covered: auth, ownership scoping, validation rejections.
- [ ] Builders (`buildPlant(overrides)`) instead of duplicated literals; no `if` / `for` in tests.
- [ ] Front: components are tested as a user uses them (`renderSuspended` + Testing Library queries by role, label, text), never `wrapper.vm`; loading, error and empty states are tested.
- [ ] Visual regression (Playwright `toHaveScreenshot`, mobile / tablet / desktop × light / dark) stays green; baselines are never updated without the maintainer validating the change.

## 10. Front (Nuxt, Vue)

- [ ] Every slice is a real Nuxt layer with its own `nuxt.config.ts` (even empty); the root config only extends layers and holds the global settings (discovery in `ddd/`).
- [ ] No `utils/` folder in the app: reusable logic is a composable (`useX`) whose helpers are closures inside it and which returns a named API (build-only scripts excepted, as already arranged in menu).
- [ ] REST calls go through the custom `useApi` (custom `useFetch`), never a bare `$fetch`; GraphQL through `useQuery` / `useMutation` (lazy `useAsyncData`, `immediate: false`, first fetch started explicitly).
- [ ] No `try/catch` around API calls: errors are read from `error` / `status`.
- [ ] Cross-cutting HTTP concerns live once, in the `useApi` / GraphQL client interceptors (`onRequest`, `onResponseError`): expired session (401 / `UNAUTHENTICATED`) leads to sign-in, unexpected errors (5xx, network) are reported once, common headers are set there; components never repeat it.
- [ ] Optimistic updates go through `optimisticUpdate` (snapshot, apply, rollback on error).
- [ ] Template refs use `useTemplateRef`; an error message block carries an explicit `role="alert"`.
- [ ] GraphQL types come from codegen (`#gql`), never written by hand; domain types derive from them.
- [ ] The front reacts to the error `code` (`UNAUTHENTICATED`, `FORBIDDEN`, …), never to the message text.
- [ ] Global state is minimal: props down, events up; `useState` only for the session user or a genuinely app-wide command.
- [ ] Business rules are not hidden in components; components stay thin and presentational; pages orchestrate.
- [ ] `defineProps` is always destructured with inline defaults (never `withDefaults`, never `props.x`).
- [ ] A long page or component is split by action / responsibility (dialogs, forms, lists in their own components).
- [ ] Every view that loads data handles the four states: skeleton that mirrors the final layout (with an `sr-only` loading text), error with a retry button, empty state with help text and a call to action, reload without flashing the skeleton (`aria-busy`).
- [ ] A deferred block (client-only, depends on the reader's date or a request) reserves its space with a skeleton, never a provisional value.
- [ ] i18n everywhere: no visible string in templates or scripts; translations per slice (`translation/fr.json`, `en.json`) with fr/en parity; static keys only (never a computed key); `useNuxtApp().$i18n` in scripts, never `useI18n()`.
- [ ] Localized routes through `definePageMeta({ i18n: { paths } })`; links by route name.
- [ ] Form limits mirror the back (max length, required) and long texts never break the layout (`truncate`, `line-clamp`, `break-words`, `min-w-0`).
- [ ] Accessibility (WCAG 2.2 / RGAA 4): landmarks, one `h1`, labels on every control, visible focus, contrast, skip link, `aria-live` for async results, external links announced.
- [ ] Dark mode and full responsive (mobile, tablet, desktop) stay correct; layout never shifts (stable header, `scrollbar-gutter`).
- [ ] Rendering mode is chosen per route (`routeRules`).
- [ ] Feature flags are prefixed `FEATURE_FLAG_` and removed once stable.
- [ ] No secret in the client bundle; session token only in an `httpOnly` cookie, never `localStorage`; no `v-html` with user data.

## 11. Docker and compose

- [ ] Multi-stage build; the final stage holds only what runs (production dependencies, `NODE_ENV=production`).
- [ ] Base image pinned to a version (never `latest`); installs use `--frozen-lockfile`; manifests and lockfile are copied and installed before the sources.
- [ ] The final stage runs as a non-root user (`USER node`) with a `HEALTHCHECK`.
- [ ] `CMD ["node", "dist/main"]` in exec form, never `npm start` / `nest start` (signals reach the process).
- [ ] `.dockerignore` excludes `node_modules`, `dist`, `.git` and every `.env` file; no secret in `ENV`, `ARG` or an image layer.
- [ ] Compose: `depends_on` with `condition: service_healthy` and a `pg_isready` healthcheck; services talk by service name; ports bound to `127.0.0.1`; the database port never public; named volumes; no obsolete `version:` key; `restart: unless-stopped`.
- [ ] Compose ports go through `${BIND_ADDRESS:-127.0.0.1}` so exposure is an explicit choice.
- [ ] Liveness does not touch the database; readiness does.

## 12. Security

- [ ] Authentication endpoints (login, register, password reset, verification) are rate limited, keyed on the real client IP behind the proxy.
- [ ] The request body size is capped (JSON and multipart); uploads check MIME type and size.
- [ ] CORS uses an explicit allowlist with credentials (never `*`, never a reflected origin).
- [ ] Helmet (or equivalent) sets security headers; the front sets a CSP.
- [ ] The JWT secret comes from the environment and is required at boot; the algorithm is fixed; `exp` is enforced.
- [ ] Passwords are hashed with scrypt and compared with `timingSafeEqual`; auth responses never reveal whether an account exists.
- [ ] Session cookie is `httpOnly`, `Secure` when cross-site, `SameSite` set; CSRF is covered by `SameSite` and an `Origin` check where the cookie is `SameSite=None`.
- [ ] Only hashes of single-use tokens are stored; they expire and are consumed once.
- [ ] Ownership is checked on every read and write (IDOR); no mass assignment from inputs.
- [ ] Errors and logs never contain a stack, SQL, password, token or secret.
- [ ] Dependencies are audited in CI (`pnpm audit --prod`).

## 13. Observability and delivery

- [ ] Logs go to stdout through the Nest logger, with context; errors caught in background work are logged, never swallowed.
- [ ] A health endpoint reports the process is up.
- [ ] The process is stateless; files go through the storage abstraction.
- [ ] The same build runs in every environment; only the environment changes.
- [ ] CI runs, on every pull request: format check, lint, typecheck, unit tests, e2e tests (back), build — for back, front and extension.
- [ ] CI workflows declare `permissions: contents: read`, take the pnpm version from `packageManager`, cache every lockfile, and their triggers cover every path the build reads.
- [ ] Commits follow `type(scope): subject`, in English; a wrong commit is amended rather than left in history. Work happens on a feature branch and a pull request; check its base branch before merging.
- [ ] A rule or fix deferred to a later step names an owner step and an exit condition in the plan journal.

## Out of scope (single instance, few users)

Kept here so nobody re-adds them by reflex. Revisit if the app runs on several instances.

- Shared rate-limit counters, sessions or cache in Redis; GraphQL subscriptions PubSub.
- Outbox, message queues, idempotent consumers, `skip locked` workers.
- Circuit breakers, read replicas, advisory locks across pods, `UV_THREADPOOL_SIZE` tuning.
- `Idempotency-Key` on POST, optimistic `version` columns, cursor pagination where lists stay small (bounded offset is fine).
- Correlation ids through `AsyncLocalStorage`, JSON structured logs, p95 / p99 dashboards (Sentry and Passenger logs cover it today).
- `create index concurrently` and `lock_timeout` in migrations (tables are tiny; plain `CREATE INDEX` is fine).
- Image vulnerability scanning, read-only containers, `cap_drop` (the API runs on Passenger, not in Docker, in production).
