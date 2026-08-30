# Déploiement continu

Objectif : un push sur `main` déploie en prod, **sans jamais se reconnecter en SSH**.
Le pare-feu o2switch bloque par IP (le SSH tombe en *timeout*, pas en « auth
refusée ») et l'IP change → on ne pousse jamais *vers* o2switch. On inverse le sens.

## Front : Netlify (GitHub Action)

`.github/workflows/deploy-front.yml` : à chaque push touchant `front/**` (ou le
`schema.gql`), **lint + tests**, puis build statique + `netlify deploy --prod` sur le
site `menu-semaine-887` (id `ccbc7586-c0fe-4630-962b-e67f5ac38039`). Une étape rouge
arrête le job **avant** le déploiement, donc un commit cassé ne part jamais en prod.
Netlify n'est pas derrière le pare-feu → un token suffit. Les types viennent du
`schema.gql` versionné, donc le build ne nécessite aucune API qui tourne.

Réglage unique :
1. Netlify → User settings → Applications → **New access token**.
2. GitHub → repo → Settings → Secrets and variables → Actions → **`NETLIFY_AUTH_TOKEN`**.

Tant que le secret n'est pas posé, le workflow s'exécute en vert et saute le déploiement.

## Back : o2switch (cron qui tire)

`ops/deploy.sh` : lancé par cron toutes les ~3 min, il `git pull` `main` et, s'il y a
du nouveau, **rsync** la source dans l'app dir existante (`~/apps/menu-back`, app root
Passenger inchangé), applique les migrations, rebuild (`nest build`) et
`touch tmp/restart.txt`. Rien n'entre : ni SSH runner, ni IP à autoriser.

**Gate CI.** Avant de déployer, le cron lit le statut du check `back` (workflow
`ci-back.yml`) via l'API GitHub publique : il ne déploie **que si le CI est vert**
(lint, typecheck, tests, migrations sur une DB de test, e2e, build). Un commit qui n'a
pas touché le back n'a pas de check → il passe ; un check en cours → il attend le tick
suivant ; un check rouge → il ne déploie pas.

**Migrations : automatiques.** `drizzle-kit migrate` applique les nouvelles migrations
**avant** le redémarrage, avec le `DATABASE_URL` du `.env` de l'app. Le journal drizzle
de la prod enregistre déjà les migrations appliquées avant ce pipeline (vérifié : 13 =
13 fichiers), donc `migrate` est un **no-op sûr** quand rien de neuf. Les migrations sont
d'abord validées en CI sur une base jetable.

Réglage unique (à faire **une** fois en SSH), tout est dans le one-shot idempotent :

```sh
bash ops/setup-cron.sh   # via scp, ou depuis le clone une fois créé
```

Il génère/teste la clé de déploiement (et affiche la clé publique à ajouter dans GitHub →
repo → Settings → Deploy keys si besoin), clone `~/menu`, et installe le cron. Penser à
placer le `.env` du back dans `~/apps/menu-back/.env` (déjà le cas, l'app tourne déjà
depuis cet emplacement).
