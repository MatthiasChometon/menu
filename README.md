# Menu de la semaine

Le menu de la semaine, lisible sur téléphone : les repas jour par jour avec leurs apports,
le détail de chaque recette, le plan de batch cooking du dimanche et la liste de courses
cochable rangée dans l'ordre des rayons.

Les quantités s'adaptent au profil de chacun — taille, poids, âge, niveau d'activité et
objectif — pour que la même recette serve aussi bien une prise de masse qu'un maintien ou
une perte de poids.

Le front est un site statique, installable comme une application et consultable **hors
ligne** : la liste de courses reste utilisable sans réseau en rayon.

**En ligne** : https://menu-semaine-887.netlify.app — l'adresse garde l'ancien nom du
projet : elle est déjà installée comme application sur un téléphone, et la renommer
casserait le raccourci.

## Structure

Un seul dépôt, une brique par dossier :

```
menu/
├─ front/     Nuxt — le site (données du menu dans front/content/)
├─ back/      NestJS — comptes et profils nutritionnels
└─ scripts/   outillage Python : validation des macros, courses, images
```

## Démarrer

### Avec Docker — toute la stack en une commande

```bash
cp back/.env.example back/.env    # y mettre ses identifiants Google
docker compose up                 # front, API et Postgres
```

Front sur http://localhost:3777, GraphQL sur http://localhost:3779/graphql, Postgres sur
5433. Le code est monté dans les conteneurs : une modification est reprise en une vingtaine
de secondes, des deux côtés.

Le premier démarrage installe les dépendances dans un volume et la première page demande
une bonne minute à compiler, le temps que Vite traverse le montage Windows ; ensuite tout
répond à la seconde. Les démarrages suivants réutilisent l'installation.

Pour la version de production (application compilée, site prérendu) :

```bash
docker compose -f docker-compose.prod.yml up --build
```

Ou, sous Windows, un double-clic sur `start-menu.bat` : il démarre Docker s'il est éteint,
lance la prod et affiche l'adresse à ouvrir sur le téléphone. `menu-down.ps1` arrête tout.

Pour consulter le site depuis un téléphone du même réseau, renseigner son IP locale dans
`PUBLIC_HOST` (voir `.env.example`) — la connexion Google, elle, n'accepte que `localhost`,
il faut alors utiliser le formulaire e-mail / mot de passe.

### Sans Docker

```bash
docker compose up postgres        # juste la base
cd back && pnpm install && pnpm db:migrate && pnpm start:dev
cd front && pnpm install && pnpm dev     # http://localhost:3777 (port dans .env)
```

Toutes les commandes ci-dessous se lancent depuis `front/`.

| Commande                                       | Effet                                                          |
| ---------------------------------------------- | -------------------------------------------------------------- |
| `pnpm generate`                                | site statique complet dans `.output/public`                    |
| `pnpm preview`                                 | sert le site généré                                            |
| `pnpm test`                                    | tests unitaires et de composants (Vitest)                      |
| `pnpm test:visual`                             | régression visuelle mobile / tablette / desktop, light et dark |
| `pnpm test:visual:update`                      | met à jour les captures de référence                           |
| `pnpm lint` · `pnpm format` · `pnpm typecheck` | qualité                                                        |

## Où vivent les données

Le dossier `front/content/` est la **source de vérité**, partagée avec le skill Claude
`menu`. Aucune donnée nutritionnelle n'est dupliquée dans le code.

| Fichier                               | Contenu                                                                      |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| `front/content/foods.json`            | les aliments : macros pour 100 g, rayon, prix au kilo, icône, unité de vente |
| `front/content/recipes.json`          | les recettes : nom fr/en, ingrédients de référence, étapes fr/en, temps      |
| `front/content/menus/AAAA-MM-JJ.json` | un menu par semaine, nommé d'après son lundi                                 |

### Ajouter une semaine

Déposer un fichier dans `front/content/menus/`, vérifier, régénérer — les scripts se
lancent depuis la racine :

```bash
python scripts/check_menu.py front/content/menus/2026-08-10.json --courses
cd front && pnpm generate
```

Aucun code à modifier : le site découvre les menus par glob, affiche le plus récent et
garde les précédents dans le sélecteur de semaine. `check_menu.py` sort en erreur tant
qu'un jour s'écarte des cibles — un menu ne se publie pas sans qu'il soit au vert.

## Les images

Les photos vivent dans `front/assets/images/recipe/<recipeId>.webp` et
`front/assets/images/food/<foodId>.webp`. Une image absente affiche un pictogramme : le
site ne casse jamais et n'émet aucune requête inutile.

Pour les générer avec ComfyUI (Juggernaut XL v9 Photo), **le GPU doit être libre** :

```bash
# ComfyUI doit tourner sur http://127.0.0.1:8188
python scripts/generate_images.py --only chiliChicken   # un essai
python scripts/generate_images.py --all                 # les 50 images
```

Le workflow est dans `scripts/comfy/food-photo.api.json` (format API) et les sujets dans
`scripts/comfy/prompts.json` — un style commun pour les plats, un autre pour les
ingrédients, chaque entrée ne décrivant que son sujet.

## Architecture

Slices verticales des deux côtés. Côté front, chaque slice est une vraie layer Nuxt
déclarée par son `nuxt.config.ts` ; `ddd/index.ts` dérive du système de fichiers les
`extends`, le CSS, les traductions, les types et le préfixe des composants.

```
front/domain/menu       la semaine, les données (aliments, recettes, menus) et les calculs
front/domain/recipe     le détail d'une recette, ses portions et ses étapes
front/domain/batch      le plan de batch cooking du dimanche
front/domain/shopping   la liste de courses par rayon
front/infrastructure/   ui (thème et primitives), i18n, accessibilité
```

`infrastructure` n'importe jamais `domain` — la règle est tenue par ESLint.

## Rendu

Les recettes et les menus sont prérendus (`nitro.prerender`) : ils changent une fois par
semaine, et c'est ce qui rend le site instantané et lisible hors ligne. Le service worker
précache l'ensemble des pages générées. Le back ne sert que l'identité et le profil, si
bien que les quantités se recalculent côté client et que l'app reste utilisable sans
réseau une fois le profil chargé.
