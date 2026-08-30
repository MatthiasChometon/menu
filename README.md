# Le Menu

Application web de planification de repas et de courses, pensée pour un usage quotidien
au téléphone. Elle compose un **menu de la semaine adapté au profil nutritionnel** de chaque
utilisateur, détaille chaque recette au gramme près, dresse la **liste de courses** rangée
par rayon, et peut même **remplir automatiquement un panier de courses en ligne** à partir
du menu.

**➡️ En ligne : [menu.mtxlab.xyz](https://menu.mtxlab.xyz)** — installable comme une
application, et consultable **hors ligne** (la liste de courses reste utilisable sans réseau,
en plein supermarché).

---

## Ce que fait l'application

- **Un menu hebdomadaire pesé pour vous.** À partir d'un court questionnaire (sexe, âge,
  taille, poids, activité, objectif…), l'app calcule des cibles caloriques et de
  macronutriments, puis **ajuste les grammages de chaque recette au profil** : la même
  recette sert une prise de masse, un maintien ou une perte de poids.
- **Le détail de chaque recette** : ingrédients balisés, quantités adaptées à la portion,
  et la **part de chaque micronutriment** dans la cible journalière.
- **Un plan de batch cooking** pour tout préparer en une fois.
- **Une liste de courses cochable**, rangée dans l'ordre des rayons, qui persiste hors ligne.
- **Comptes multi-utilisateurs** : chacun a son profil et ses semaines.
- **Remplissage automatique du panier Carrefour** via une extension de navigateur : le
  panier se remplit depuis le menu, mais **rien n'est jamais validé ni payé** — l'utilisateur
  vérifie et commande lui-même.
- **PWA installable et hors ligne**, interface **bilingue** (fr/en), **mode sombre**.

## Stack technique

| Brique | Technologies |
| --- | --- |
| **Front** | Nuxt 4 · Vue 3 · TypeScript · Nuxt UI + Tailwind CSS v4 · `@nuxtjs/i18n` · `nuxt-graphql-client` (codegen) · `@vite-pwa/nuxt` (offline) |
| **Back** | NestJS · Fastify · GraphQL (Apollo, code-first) · Drizzle ORM · PostgreSQL · authentification maison (Google OAuth + e-mail/mot de passe) · JWT en cookie `httpOnly` |
| **Extension** | Manifest V3 · TypeScript · Vite · Chrome **et** Firefox |
| **Tests** | Vitest · `@nuxt/test-utils` + Testing Library · Playwright (régression visuelle) |
| **Outillage** | Python (validation des macros, génération d'images) · pnpm workspace · Docker Compose |
| **Déploiement** | Front statique sur **Netlify** · API + PostgreSQL sur **o2switch** · images sur un sous-domaine same-site |

## Points d'architecture

Le projet est un terrain d'expérimentation d'une architecture propre et testable :

- **Vertical slices.** Front comme back sont découpés par domaine métier
  (`domain/auth`, `domain/planner`, `domain/order`…), chaque tranche autonome. Côté front,
  chaque tranche est une **vraie layer Nuxt** ; côté back, une **règle de dépendance à sens
  unique** (infrastructure ↛ domaine) est vérifiée par ESLint.
- **GraphQL code-first typé de bout en bout.** Le schéma est généré depuis le back (NestJS)
  puis consommé par le front via codegen — les requêtes sont typées à la compilation.
- **Authentification auto-hébergée.** Google OAuth **et** e-mail/mot de passe (scrypt),
  vérification d'e-mail obligatoire, réinitialisation par lien à durée de vie limitée,
  session en cookie `httpOnly` `Secure` — architecture **same-site** (sous-domaines) pour
  rester compatible avec le blocage des cookies tiers de Safari.
- **Hors ligne d'abord.** Le site est **prérendu (SSG)** et mis en cache par un service
  worker : les recettes et la liste de courses restent lisibles sans réseau.
- **Stratégie de test à plusieurs niveaux.** Tests unitaires (logique pure), tests
  fonctionnels du back sur une **vraie base de test**, tests e2e de contrat, tests de
  composants « comme un utilisateur » (Testing Library), et **régression visuelle**
  déterministe (Playwright).
- **Une extension MV3 multi-navigateurs** qui parle au site via un pont same-site
  (`postMessage`), remplit un panier en agissant dans la session de l'utilisateur, sans
  jamais manipuler ses identifiants.

## Structure du dépôt

Monorepo, une brique par dossier :

```
menu/
├─ front/        Nuxt — le site (données du menu dans front/content/)
├─ back/         NestJS — comptes, profils nutritionnels, file de commandes
├─ extension/    Extension MV3 (Chrome + Firefox) de remplissage du panier
└─ scripts/      Outillage Python : validation des macros, images
```

## Démarrer

### Avec Docker — toute la stack en une commande

```bash
cp back/.env.example back/.env    # y renseigner ses identifiants Google
docker compose up                 # front, API et Postgres
```

Front sur `http://localhost:3777`, GraphQL sur `http://localhost:3779/graphql`, Postgres sur
`5433`. Le code est monté dans les conteneurs : une modification est reprise en une vingtaine
de secondes, des deux côtés.

### Sans Docker

Prérequis : **Node 24**, **pnpm**, un **PostgreSQL** local.

```bash
# API
cd back && pnpm install
cp .env.example .env               # DATABASE_URL, JWT_SECRET, GOOGLE_*…
pnpm drizzle-kit migrate
pnpm start:dev                     # http://localhost:3779

# Front (dans un autre terminal)
cd front && pnpm install
pnpm dev                           # http://localhost:3777
```

### L'extension

```bash
cd extension && pnpm install
pnpm build                         # → dist/ (Chrome) et dist-firefox/ (Firefox)
```

Puis chargez `extension/dist` dans `chrome://extensions` (mode développeur).

## Tests

```bash
# Front — unitaires, composants, visuels
cd front && pnpm test

# Back — unitaires, fonctionnels (base de test), e2e
cd back && pnpm test
```

## Déploiement

- **Front** : build statique (`pnpm generate`) publié sur **Netlify**.
- **API + base** : NestJS servi par Passenger sur **o2switch**, PostgreSQL managé sur la
  même infrastructure, migrations Drizzle jouées au déploiement.
- **Images** : servies depuis un **sous-domaine same-site** pour rester en première partie.

---

> Projet personnel, développé pour un usage réel au quotidien. Le code, les textes et les
> visuels sont l'œuvre de son auteur ; les valeurs nutritionnelles proviennent de tables de
> composition publiques.
