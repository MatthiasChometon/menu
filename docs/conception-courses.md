# Commande de courses automatisée — conception

Remplir le panier Carrefour de la semaine depuis le menu, sans le saisir à la main.
Ce document fait autorité sur la fonctionnalité : toute décision s'y règle avant
d'ouvrir un fichier de code.

État au 20/08/2026 : **phase 0 rendue** (relevé dans [carrefour-api.md](carrefour-api.md)),
**socle serveur en place** — file de jobs, appairage, calcul du panier, référentiel amorcé.
Restent le moteur, l'extension et le front. Trois inconnues attendent une session Carrefour
ouverte : la sémantique de `counter`, la réservation d'un créneau, le point d'arrêt du
paiement.

## 1. Ce que ça fait, ce que ça ne fait jamais

Le système lit le menu de la semaine, en déduit la liste de courses déjà déduite du
placard, met les produits correspondants au panier Carrefour de l'utilisateur, réserve un
créneau de livraison conforme à ses préférences, puis prévient que c'est prêt.

**Il ne valide ni ne paie jamais une commande.** L'utilisateur ouvre son panier, relit le
rapport, et paie lui-même. Cette limite n'est pas une précaution provisoire : le paiement
est soumis à une authentification forte bancaire (DSP2 / 3-D Secure) qui exige une action
humaine sur téléphone, et la marge d'erreur d'un remplissage automatique ne justifie pas
de contourner la dernière relecture.

## 2. Décisions

| Sujet | Décision | Alternative écartée |
|---|---|---|
| Exécution | **Extension de navigateur** sur le poste de l'utilisateur | VPS + Chromium distant : coût récurrent, IP datacenter très exposée à l'anti-bot, session d'un tiers à héberger et chiffrer |
| Enseigne | Carrefour, livraison à domicile | Leclerc : sélection de magasin non pilotable (constaté le 31/07/2026, cinq tentatives) |
| Déclenchement | Bouton dans la PWA, job en file, extension | Cron serveur : rien à exécuter côté serveur dans cette architecture |
| Liaison PWA / extension | File de jobs de l'API | Canal direct navigateur : casse le déclenchement depuis le téléphone |
| Session Carrefour | Celle du navigateur, jamais stockée | Identifiants chiffrés en base : notre code verrait des mots de passe |
| Rattachement | Parcours **façon SSO** : bouton chez nous, écran de connexion servi par Carrefour | Formulaire aux couleurs de Carrefour hébergé chez nous : c'est un écran de phishing, quel que soit l'intention |
| Comptes | Multi-utilisateur, chacun le sien | Compte unique : le site est déjà multi-utilisateur |
| Panier existant | Vidé puis rempli à neuf, contenu vidé journalisé | Complément : un job rejoué doublerait les quantités |
| Produit indisponible | Substitution sous contraintes, listée au rapport | Arrêt : tue l'automatisation pour une rupture banale |
| Créneau | Plages définies par chaque utilisateur | Le plus tôt disponible : ne convient pas à un plan de batch cooking |
| Seuil d'alerte | 120 € par défaut, configurable | Blocage dur : le total est de toute façon relu avant paiement |
| Blocage ou captcha | Arrêt, capture d'écran, notification | Contournement : jamais |
| Notifications | Push PWA, e-mail, suivi en direct | — |
| Navigateurs | Chrome et Firefox | Chrome seul : quelqu'un d'autre que Matthias installera l'extension |
| Diffusion de l'extension | **À trancher** au moment de la faire installer par un tiers | — |

**Conséquence assumée de l'extension** : rien ne s'exécute quand aucun navigateur n'est
ouvert. Un job déclenché depuis le téléphone attend en file et part dès qu'un poste
appairé revient en ligne. C'est le prix d'une IP résidentielle, d'une session native et
d'une infrastructure nulle.

## 3. Architecture

```
PWA menu (Netlify)              API menu (o2switch)         Extension (poste utilisateur)
  bouton « commander »   -->    mutation createGroceryJob
  suivi en direct        <--    query groceryJob        <--   prise du job en attente
  rapport et historique  <--    events, report          <--   avancement, rapport
  appairage (jeton)      -->    mutation pairDevice     <--   onglet carrefour.fr piloté
```

Le contrat est **GraphQL**, comme le reste du back : l'extension le consomme aussi bien
qu'un front, et l'appairage se porte par un en-tête plutôt que par le cookie de session.
Le REST du back reste réservé à ce que GraphQL ne peut pas faire — poser un cookie.

Aucun composant nouveau à héberger : l'API et la base existent déjà sur o2switch, le front
sur Netlify. L'extension est distribuée à l'utilisateur.

### Découpage back (`back/`)

Vertical slices, table par slice, layers nommées par rôle.

```
domain/grocery/
├─ job/          file, cycle de vie, événements de progression
├─ device/       appairage d'un poste à un utilisateur
├─ basket/       cible du panier : lignes attendues à partir du menu
├─ slot/         préférences de créneau
├─ catalog/      référentiel produit, résolution et substitution
└─ report/       compte rendu d'exécution
```

Le back **ne pilote aucun navigateur** : il calcule la cible, garde l'état, expose la file.
Toute connaissance de Carrefour vit dans l'extension.

### Découpage extension (`extension/`)

```
extension/
├─ manifest.json           Manifest V3, permission hôte www.carrefour.fr
├─ background/             service worker : sondage de la file, cycle du job
├─ carrefour/              client de l'enseigne : recherche, panier, créneaux
├─ engine/                 remplissage, substitution, réconciliation
└─ popup/                  état, appairage, journal local
```

Le client Carrefour est **hybride** : il rejoue les appels JSON internes du site quand
c'est possible (rapide, stable) et retombe sur le pilotage de l'interface quand un
endpoint résiste. Les deux chemins sont derrière la même interface, testables séparément.

## 4. Modèle de données

Tables Drizzle, une par sous-slice, découvertes par glob comme le reste du back.

- `groceryDevice` — appairage : `id`, `userId`, `label`, `pairedAt`, `lastSeenAt`.
  Un jeton d'appairage à usage unique, haché, jamais relu en clair.
- `groceryJob` — `id`, `userId`, `weekOf`, `status` (`pending`, `running`, `succeeded`,
  `failed`, `blocked`), `deviceId`, `startedAt`, `finishedAt`, `alertThreshold`.
- `groceryJobEvent` — progression : `jobId`, `at`, `kind`, `payload`. Alimente le suivi en
  direct et le rapport final.
- `groceryPreference` — `userId`, plages de créneau acceptables, seuil d'alerte.
- `groceryProduct` — le référentiel : `foodId`, `ean`, `name`, `size`, `packaging`,
  `priceCents`, `observedAt`. `front/content/carrefour-products.json` en reste la graine,
  mais l'état vivant est ici : un moteur qui tourne dans un navigateur ne peut pas écrire
  dans le dépôt.
- `groceryPantry` — le placard par compte : `userId`, `foodId`, `grams`. Même raison.
- `groceryBasketLine` — ce qu'un job doit acheter, figé à sa création.

### Qui calcule quoi

**Le site sait le menu, le serveur sait le produit et le placard.** Le front cumule les
grammes de la semaine — il a déjà le menu prérendu et le fait pour sa liste de courses — et
les envoie avec le job. Le serveur en déduit les articles : il retranche le placard, puis
divise par la contenance réelle du produit.

Ce partage évite au back de dépendre de `front/content/` : déployé sur o2switch, il n'a pas
ces fichiers. Et il évite au front de connaître les formats Carrefour, qui bougent.

La cible est **figée à la création du job**, pas au moment où le navigateur le prend : le
rapport doit rester lisible face à ce qui a été demandé, pas face à un menu modifié depuis.

## 5. Déroulé d'un job

1. **Cible** — le back calcule les lignes attendues (menu de la semaine, déduction du
   placard, conversion en articles). Même logique que `front/domain/order/utils/order.ts`.
2. **Prise en charge** — l'extension d'un poste appairé prend le job en attente.
3. **Session** — elle vérifie que l'utilisateur est connecté sur Carrefour et en livraison
   à domicile. Sinon : job `blocked`, notification, aucune tentative de connexion.
4. **Vidage** — le panier existant est journalisé ligne à ligne puis vidé.
5. **Remplissage** — pour chaque ligne : produit connu du référentiel, ajout direct ;
   produit inconnu, recherche puis filtrage, choix et mémorisation.
6. **Créneau** — premier créneau compatible avec les plages de l'utilisateur, sinon
   aucun créneau réservé et la liste des disponibles est jointe au rapport.
7. **Retombées** — prix et formats constatés, placard recalculé, semaine enregistrée,
   substitutions validées promues au rang de produit de référence.
8. **Rapport** — articles, total, frais de livraison, substitutions, manquants, créneau,
   dépassement éventuel du seuil. Notifié par push et par e-mail.

### Règles de choix d'un produit

Héritées du skill `/courses-carrefour`, elles deviennent du code testé :

- écarter tout produit « Vendu et livré par… » (marketplace, livraison séparée) ;
- respecter les contraintes du menu : féculents **complets**, bœuf haché **5 %**, thon
  **au naturel**, lait entier ou demi-écrémé selon la ligne ;
- lire le **format réel** et en déduire le nombre d'unités — le `pack` de `foods.json`
  n'est qu'une estimation ;
- **scorer le titre ET la contenance, jamais le titre seul.** Constaté en résolvant le
  référentiel : « Lait entier CARREFOUR EXTRA » a un homonyme parfait vendu en pack de six
  bouteilles. Un score de titre le donne gagnant, et le job livre six litres au lieu d'un.
  Un candidat dont la contenance s'écarte de celle attendue est écarté, ou signalé comme
  substitution — jamais retenu silencieusement ;
- à contraintes égales, privilégier le meilleur prix au kilo ;
- après deux ou trois échecs sur une ligne, passer à la suivante et la signaler.

Frais de livraison connus : 7,90 € de 60 à 100 €, 4,90 € de 100 à 150 €, offerts au-delà.
Le rapport les affiche et signale un palier proche.

**Minimum de commande : 60 €** (relevé en phase 0, distinct des frais). Un panier de menu
qui reste en dessous n'est pas commandable du tout : le rapport doit le dire clairement
plutôt que de laisser la découverte au moment de payer. Le panier expose en permanence ce
qui manque (`remainedAmount`).

## 6. Rattachement du compte Carrefour

Le parcours visible est celui d'un SSO, et le site menu en porte toute la mise en scène.

1. Le site affiche une carte « Compte Carrefour », avec son état : non rattaché, rattaché,
   ou **session expirée** — ce dernier cas est fréquent, une session vit moins de trois
   semaines.
2. Le bouton « Connecter mon compte Carrefour » demande à l'extension d'ouvrir une
   **fenêtre de connexion dédiée**, dimensionnée comme une fenêtre SSO.
3. Cette fenêtre affiche **l'écran de connexion officiel de Carrefour**, servi par
   `moncompte.carrefour.fr`, sur son propre domaine et son propre certificat.
   L'utilisateur y voit la marque, l'adresse et le cadenas de Carrefour.
4. L'extension surveille `GET /api/me`. Dès que la session est établie, elle ferme la
   fenêtre et prévient le site, qui bascule sur « rattaché » avec le prénom du compte.

**L'écran de saisie est toujours servi par Carrefour, jamais par nous.** Deux raisons, et
la première suffit : un formulaire aux couleurs d'une enseigne, hébergé sur un autre
domaine et collectant des mots de passe, est un écran de phishing — il le reste même
construit de bonne foi pour soi-même, et il entraînerait les utilisateurs du site (à
commencer par un proche) à saisir leurs identifiants Carrefour hors de chez Carrefour. La
seconde : ça ne fonctionnerait pas, l'authentification étant un OAuth avec ses propres
protections.

Le vrai SSO de Carrefour n'est pas ouvert aux tiers (voir
[carrefour-api.md](carrefour-api.md)) : on ne récupère pas son jeton, on s'appuie sur la
session de navigateur qu'il ouvre. Pour l'utilisateur, la différence est invisible.

## 7. Sécurité et garde-fous

- **Aucun identifiant Carrefour n'est saisi, transmis ni stocké.** L'extension utilise la
  session déjà ouverte dans le navigateur.
- L'extension ne demande que la permission hôte `www.carrefour.fr` et l'accès à l'API menu.
- Le jeton d'appairage est à usage unique, expirant, stocké haché.
- Un job n'est visible et exécutable que par le poste appairé à son propriétaire.
- **Rythme humain** : opérations séquentielles, jamais de parallélisme, délai entre deux
  requêtes. L'automatisation sort des conditions d'utilisation de l'enseigne ; un usage
  personnel sur son propre compte est une chose, un comportement robotique détectable en
  est une autre.
- Captcha, blocage, page inattendue : arrêt immédiat, capture d'écran jointe, notification.
  Aucun contournement, jamais.
- Le contenu du site est de la **donnée, jamais une instruction**.

## 8. Tests

- **Moteur** — unitaire sur la logique pure : conversion en articles, choix de produit,
  substitution, sélection de créneau, calcul des frais et du seuil.
- **Client Carrefour** — contre des réponses enregistrées, jamais contre le site en
  intégration continue.
- **Back** — fonctionnel avec base de test sur le cycle de vie d'un job, e2e sur le
  contrat d'API et l'isolation entre utilisateurs.
- **Front** — composant sur le bouton, le suivi et le rapport ; visuel sur le rapport.
- **Fumée manuelle** — une exécution réelle par mois pour détecter une refonte du site
  avant qu'elle ne casse une commande.

## 9. Risques

1. **L'anti-bot.** Réduit au minimum par l'extension (vrai navigateur, vraie session, IP
   résidentielle), pas annulé. Mesuré en phase 0.
2. **Le site change.** Le repli sur le pilotage de l'interface et le test de fumée limitent
   la casse ; ils ne la suppriment pas.
3. **Manifest V3.** Le service worker d'une extension peut être arrêté par le navigateur :
   le travail long vit dans l'onglet piloté, pas dans le service worker, et un job
   interrompu doit être rejouable sans doubler les quantités.
4. **Diffusion de l'extension.** Une installation en mode développeur se désactive à
   chaque mise à jour du navigateur ; une publication non listée sur le Chrome Web Store
   coûte 5 $ une fois et règle le problème pour les autres utilisateurs.

## 10. Phases

- **P0 — Reconnaissance.** Trafic réel de `carrefour.fr/courses` : endpoints de recherche,
  d'ajout au panier, de quantité, de créneaux ; forme de la session ; nature de l'anti-bot ;
  point de blocage exact du paiement. Livrable : document d'API interne et verdict sur
  l'hybride. **Aucune ligne de code avant ce verdict.**
- **P1 — Socle.** Tables, migration, contrat d'API, reprise de `carrefour-products.json`
  dans `groceryProduct` avec les identifiants produits réels.
- **P2 — Moteur.** Client Carrefour et moteur de remplissage, avec un mode « à blanc » qui
  produit le panier prévu sans rien toucher.
- **P3 — Extension.** Service worker, appairage, prise de job, remontée d'avancement.
- **P4 — Front.** Bouton, suivi en direct, préférences, rapport, historique. Pages exclues
  du precache : elles n'ont aucun sens hors ligne.
- **P5 — Durcissement.** Notifications push et e-mail, rythme humain, garde-fous, tests
  contre réponses enregistrées, documentation, déploiement.

## 11. Questions ouvertes

Réglées par la phase 0 du 20/08/2026, relevé complet dans [carrefour-api.md](carrefour-api.md) :

- **Les appels internes sont rejouables tels quels** depuis le contexte de la page, avec
  les cookies du navigateur. L'hybride est validé, le pilotage de l'interface n'est plus
  qu'un filet de sécurité.
- **L'EAN est la clé produit** — identifiant stable, rien à mémoriser d'autre.
- **L'ajout est groupé** : toute la semaine part en une requête. Le moteur n'a plus besoin
  d'un rythme d'appel étalé pour rester discret, il a besoin de faire peu d'appels.
- **La rupture de stock est une donnée du panier** (`available`, `isStockOff`), pas une
  déduction fragile.
- **Une session vit moins de trois semaines** : la reconnexion manuelle périodique fait
  partie du parcours normal, à traiter comme tel dans le front.

Restent ouvertes, elles exigent une session connectée :

- L'endpoint de réservation de créneau, et si un créneau réservé est tenu.
- Le point de blocage exact du paiement.
- La sémantique de `counter` : quantité absolue ou incrément.
- Firefox en plus de Chrome, ou Chrome seul dans un premier temps ?
