# 🥗 Le Menu

**A weekly meal planner that weighs your food for you** — it composes a week of meals
tailored to your nutrition profile, works out every recipe to the gram, builds an
offline shopping list ordered by aisle, and can even **fill an online grocery basket**
from the menu (you review and pay — it never does).

### ▶️ Live demo — **[menu.mtxlab.xyz](https://menu.mtxlab.xyz)**

Installable as an app and usable **offline** — the shopping list stays readable with no
signal, in the middle of the supermarket. Sign in with Google or an email address.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Nuxt](https://img.shields.io/badge/Nuxt%204-00DC82?style=flat-square&logo=nuxt&logoColor=white)
![Vue](https://img.shields.io/badge/Vue%203-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white)
![GraphQL](https://img.shields.io/badge/GraphQL-E10098?style=flat-square&logo=graphql&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

---

## What it does

- **A menu weighed for you** — from a short questionnaire (sex, age, height, weight,
  activity, goal…), the app computes calorie and macro targets, then **scales every
  recipe's grammes to your profile**: the same recipe serves a bulk, a maintenance or a
  cut, and follows your measurements as they change.
- **Every recipe in detail** — tagged ingredients, quantities adapted to the portion,
  and each **micronutrient as a share of the daily target**.
- **A batch-cooking plan** to prepare the week in one go.
- **A checkable shopping list**, ordered by aisle, that persists **offline**.
- **Auto-filled grocery basket** — an optional browser extension fills a Carrefour
  delivery basket from the menu. **Nothing is ever confirmed or paid** — you check and
  order yourself.
- **Built for real use** — installable **PWA that works offline**, French/English i18n,
  dark mode, full loading/empty/error states, and a visual-regression-tested UI.
- **Accounts** — Google OAuth and email/password with mandatory email verification and
  password reset, over a JWT httpOnly cookie.

## The interesting bit: the auto-fill extension

The site never holds your grocery-store password. Instead, an optional **Manifest V3
extension** (Chrome **and** Firefox) does the filling **inside your own shop session**:
a content-script **bridge** pairs the browser to your account over a same-origin
`postMessage` handshake (no token ever shown), a background worker **claims fill jobs
from a queue**, matches each ingredient to a real product, honours your delivery-slot
preferences — and stops there. It **reads whether you are signed in and fills the
basket, but never confirms or pays**: the last step, and the money, stay yours. When no
paired browser is online, a run simply waits instead of failing.

## Tech stack

| Layer         | Stack |
| ------------- | ----- |
| **Frontend**  | Nuxt 4 · Vue 3 · TypeScript · Nuxt UI · Tailwind CSS v4 · `@nuxtjs/i18n` · nuxt-graphql-client (typed codegen) · PWA · static generation → **Netlify** |
| **Backend**   | NestJS · Fastify · GraphQL (Apollo, code-first) · Drizzle ORM · PostgreSQL · JWT auth · Nodemailer → **o2switch** |
| **Extension** | Manifest V3 · TypeScript · Vite · Chrome **and** Firefox · content-script bridge + background worker |
| **Tooling**   | pnpm monorepo · Docker Compose · Vitest · Playwright (visual regression) · Python (macro validation, image generation) · ESLint / Prettier |

## Architecture

- **Monorepo** — `front/`, `back/`, `extension/`, one clone, one `docker compose up`.
- **Vertical-slice architecture** — each feature is a slice split into `domain/` and
  `infrastructure/`, with a strict one-way dependency (`infrastructure ↛ domain`). On
  the front, each slice is a real Nuxt **layer**; on the back, Drizzle uses one table
  per slice with auto-discovery.
- **Typed end to end** — the GraphQL schema is generated code-first on the back and the
  front's client + types are generated from it, so a breaking change is a compile error,
  not a runtime surprise.
- **Offline-first** — the site is statically generated and cached by a service worker;
  recipes and the shopping list stay usable with no network.
- **Same-site auth** — the session cookie is scoped to a shared parent domain across
  subdomains, so first-party auth keeps working even under Safari's third-party cookie
  blocking.
- **Tested at every level** — pure-logic unit tests, back-end functional tests on a real
  test database, e2e contract tests, component tests "as a user" (Testing Library), and
  deterministic **visual regression** (Playwright).

## Run it locally

Everything comes up with one command — PostgreSQL, the API and the front, wired together:

```bash
git clone https://github.com/MatthiasChometon/menu.git
cd menu
cp back/.env.example back/.env   # set Google credentials to enable Google login
docker compose up                # front, API and Postgres
```

| Service | URL                           |
| ------- | ----------------------------- |
| Front   | http://localhost:3777         |
| GraphQL | http://localhost:3779/graphql |
| Postgres| localhost:5433                |

Source is bind-mounted, so edits hot-reload both the back and the front. Build the
extension separately with `cd extension && pnpm install && pnpm build` (→ `dist/` for
Chrome, `dist-firefox/` for Firefox), then load it unpacked from `chrome://extensions`.

## Project structure

```
menu/
├─ front/       Nuxt app       (Nuxt UI · Tailwind · i18n · PWA; menu data in front/content/)
├─ back/        NestJS API     (Fastify · Apollo GraphQL · Drizzle/Postgres; accounts & profiles)
├─ extension/   MV3 extension  (Chrome + Firefox; auto-fills the grocery basket)
└─ scripts/     Python tooling (macro validation, image generation)
```

## Deployment

The front is a static build on **Netlify** ([menu.mtxlab.xyz](https://menu.mtxlab.xyz)),
the API and PostgreSQL run on **o2switch** (`api.menu.mtxlab.xyz`), and the dish photos
are served from a same-site subdomain to stay first-party. Migrations (Drizzle) run on
deploy.

---

Built by [Matthias Chometon](https://www.linkedin.com/in/matthias-chometon-99371a177/).
