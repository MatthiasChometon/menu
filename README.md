# Menu de la semaine

Le menu de prise de masse de la semaine, lisible sur téléphone : les repas jour par jour
avec leurs apports, le détail de chaque recette, le plan de batch cooking du dimanche et
la liste de courses cochable rangée dans l'ordre des rayons.

Site statique, installable comme une application et consultable **hors ligne** — la liste
de courses reste utilisable sans réseau en rayon.

**En ligne** : https://menu-semaine-887.netlify.app

## Démarrer

```bash
pnpm install
pnpm dev            # http://localhost:3777 (port dans .env)
```

| Commande                                       | Effet                                                          |
| ---------------------------------------------- | -------------------------------------------------------------- |
| `pnpm generate`                                | site statique complet dans `.output/public`                    |
| `pnpm preview`                                 | sert le site généré                                            |
| `pnpm test`                                    | tests unitaires et de composants (Vitest)                      |
| `pnpm test:visual`                             | régression visuelle mobile / tablette / desktop, light et dark |
| `pnpm test:visual:update`                      | met à jour les captures de référence                           |
| `pnpm lint` · `pnpm format` · `pnpm typecheck` | qualité                                                        |

## Où vivent les données

Le dossier `content/` est la **source de vérité**, partagée avec le skill Claude
`menu-semaine`. Aucune donnée nutritionnelle n'est dupliquée dans le code.

| Fichier                         | Contenu                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------- |
| `content/foods.json`            | les aliments : macros pour 100 g, rayon, prix au kilo, icône, unité de vente |
| `content/recipes.json`          | les recettes : nom fr/en, ingrédients de référence, étapes fr/en, temps      |
| `content/menus/AAAA-MM-JJ.json` | un menu par semaine, nommé d'après son lundi                                 |

### Ajouter une semaine

Déposer un fichier dans `content/menus/`, vérifier, régénérer :

```bash
python scripts/check_menu.py content/menus/2026-08-10.json --courses
pnpm generate
```

Aucun code à modifier : le site découvre les menus par glob, affiche le plus récent et
garde les précédents dans le sélecteur de semaine. `check_menu.py` sort en erreur tant
qu'un jour s'écarte des cibles — un menu ne se publie pas sans qu'il soit au vert.

## Les images

Les photos vivent dans `assets/images/recipe/<recipeId>.webp` et
`assets/images/food/<foodId>.webp`. Une image absente affiche un pictogramme : le site ne
casse jamais et n'émet aucune requête inutile.

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

Slices verticales, chacune étant une vraie layer Nuxt déclarée par son `nuxt.config.ts` ;
`ddd/index.ts` dérive du système de fichiers les `extends`, le CSS, les traductions, les
types et le préfixe des composants.

```
domain/menu       la semaine, les données (aliments, recettes, menus) et les calculs
domain/recipe     le détail d'une recette, ses portions et ses étapes
domain/batch      le plan de batch cooking du dimanche
domain/shopping   la liste de courses par rayon
infrastructure/   ui (thème et primitives), i18n, accessibilité
```

`infrastructure` n'importe jamais `domain` — la règle est tenue par ESLint.

## Rendu

Tout est prérendu (`nitro.prerender`) : les menus changent une fois par semaine, et c'est
ce qui rend le site instantané et lisible hors ligne. Le service worker précache
l'ensemble des pages générées.
