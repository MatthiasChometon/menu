# API interne Carrefour — relevé de reconnaissance

Observé le 20/08/2026 sur `www.carrefour.fr/courses`, en session **non connectée**, mode
livraison à domicile. Complète la [conception](conception-courses.md) : c'est le verdict
de la phase 0.

## Verdict

**L'approche hybride est validée.** Les appels internes sont rejouables tels quels depuis
le contexte de la page, avec les cookies du navigateur et aucun jeton à forger. Une
extension avec la permission hôte `www.carrefour.fr` peut piloter l'intégralité du panier
sans jamais cliquer.

Trois découvertes changent la conception :

1. **L'EAN est la clé produit.** Pas d'identifiant maison à mémoriser : le code-barres
   suffit à ajouter un produit. Le référentiel devient stable et lisible.
2. **L'ajout est groupé.** `items` est un tableau : les trente-quatre articles d'une
   semaine partent en **une seule requête**, pas trente-quatre. Le remplissage devient
   quasi instantané et le profil d'appel cesse d'être robotique.
3. **Il y a un minimum de commande de 60 €**, distinct des frais de livraison. Le panier
   expose en permanence ce qui manque pour l'atteindre.

## Prérequis à tout appel

L'en-tête **`accept: application/json` est obligatoire**. Sans lui, les endpoints
renvoient le HTML de l'application avec un statut trompeur (200 sur le document, 404 sur
le corps JSON) — piège coûteux si on ne le sait pas.

Le service de rattachement (`1415-151-900733` en livraison Lyon 7) se lit dans n'importe
quel produit du panier : `product.attributes.offerServiceId`. Il ne doit pas être écrit en
dur, il dépend du service et de l'adresse.

## Endpoints

### `GET /api/me`

État de connexion. Renvoie le compte, ou l'équivalent invité.

### `GET /api/cart`

Le panier complet. Champs utiles au-delà des lignes :

| Champ | Sens |
|---|---|
| `totalAmount` | **Produits plus frais de livraison** — ce n'est pas le prix des courses |
| `totalProductsPrice` (= `totalPrice`) | **Les courses seules.** C'est le sous-total que le site affiche |
| `totalAmountWithoutServices` | **Piège** : le nom promet les produits seuls, mais sur un vrai panier il valait le total, frais compris. Ne pas s'en servir |
| `totalAvailableQuantity` | Nombre d'articles. `items[]` compte les rayons, pas les articles |
| `remainingAmountToNextDeliveryFeeThreshold` | Ce qui manque pour atteindre la tranche de frais moins chère |
| `remainedAmount` | Ce qui manque pour atteindre le minimum de 60 € |
| `deliveryFees` | Frais appliqués |
| `nextDeliveryFeeThresholdLevel` | Palier de frais courant |
| `slot`, `slotRef`, `isSlotBooked`, `isSlotAvailable`, `noSlot`, `slotFailures` | Tout l'état du créneau |
| `facilityServiceId` | Le service de rattachement |

Les lignes sont groupées par rayon : `items[].products[].product.attributes` porte `ean`,
`title`, `brand`, `offerServiceId`, `categories`, et la ligne porte `counter`,
`totalItemPrice`, `available`, `isStockOff`.

`isStockOff` et `available` donnent la **rupture de stock sans aucun parsing** — la
substitution peut se décider sur une donnée fiable.

### `PATCH /api/cart` — ajouter, modifier une quantité

```json
{
  "trackingRequest": { "pageType": "search", "pageId": "search" },
  "items": [
    { "basketServiceId": "1415-151-900733", "counter": 1,
      "ean": "3560070510771", "subBasketType": "drive_clcv" }
  ]
}
```

Réponse : le panier recalculé. **`counter: 0` ne retire pas la ligne** (200, sans effet) —
la sémantique exacte de `counter` (absolu ou incrément) reste à confirmer avant d'écrire
le réglage des quantités.

### `DELETE /api/cart` — vider

```json
{ "subBasketType": "drive_clcv", "serviceId": "1415-151-900733" }
```

Réponse `204`. C'est l'opération de vidage complet utilisée en début de job.

### Recherche : `GET /s?q=<termes>`

Il n'y a **pas d'API de recherche à appeler** : la page est rendue côté serveur et
contient déjà tout. `POST /api/marketing/search` ne sert pas les résultats.

Points d'ancrage dans le HTML, tous stables et sémantiques :

| Donnée | Ancrage |
|---|---|
| EAN | `<article data-testId="<ean>">` |
| Titre | `data-testid="product-card-title"` |
| Format | `.product-list-card-plp-grid__packaging` (« 500g ») |
| Fiche | `href="/p/<slug>-<ean>"` |

Un `window.__INITIAL_STATE__` est également présent et reste à explorer : s'il porte les
prix structurés, il est préférable au parsing HTML.

## Protection

Cloudflare est en frontal. **Aucune signature d'anti-bot comportemental** (pas de
`datadome`, pas de `_abck` ni `bm_sz` d'Akamai) sur les cookies observés. En contexte
navigateur réel, les appels passent sans friction.

Cela ne change pas la règle de rythme humain : la protection peut être activée à tout
moment, et l'ajout groupé rend de toute façon le volume d'appels négligeable.

## Connexion : un vrai SSO, mais fermé

L'authentification passe par **Carrefour Connect**, un OAuth 2 / OpenID Connect servi par
`moncompte.carrefour.fr` (ForgeRock, chemin `/iam/XUI/#login`) :

```
/iam/oauth2/CarrefourConnect/authorize
  ?client_id=carrefour_onecarrefour_web
  &redirect_uri=https://www.carrefour.fr/login/check
  &response_type=code&scope=openid iam …&realm=/CarrefourConnect
```

**Ce SSO ne nous est pas ouvert** : le `client_id` appartient au site Carrefour et le
`redirect_uri` est restreint à ses propres domaines. Il faudrait que Carrefour enregistre
notre application comme client — ce qui n'arrivera pas.

La conséquence est bonne quand même : on ne consomme pas le **jeton** du SSO, on consomme
la **session navigateur** qu'il établit. Le parcours visible est identique à un « Se
connecter avec Google » (voir la conception, § rattachement).

## Durée de vie de session

La session ouverte le 03/08/2026 était **expirée au 20/08** — moins de trois semaines.
L'utilisateur devra se reconnecter lui-même périodiquement ; le job doit détecter
l'expiration proprement (`GET /api/me`) et la signaler sans jamais tenter de se connecter.

## Créneaux : `GET /api/timeslots?facilityServiceId=<id>`

Observé le 20/08/2026, session ouverte.

```
timeslots[] : { availableDay, daySlot: "friday", day: "V.", date: "21 Aou", cells[] }
cells[]     : { ref, hourStart "06h30", hourEnd "08h30", available, selected, fees,
                date: { begin, end, cutoff }, fillRate, capacityMax, capacityUsed,
                dayTime: "morning", facilityServiceId, storeRef }
```

`cutoff` est l'heure limite pour commander ce créneau — à respecter, sinon le créneau
retenu ne vaut rien. `fees` porte les frais **de ce créneau** : ils varient d'un créneau à
l'autre, le total du panier ne les connaît qu'après coup.

Le panier expose en permanence le créneau courant (`slot`) avec son `ref`, `isBooked`,
`isDefault` : **un créneau par défaut est déjà pré-sélectionné**, non réservé.

### Réserver : `PUT /api/cart/slot`

```json
{ "slotRef": "ad87d9b8-…", "origin": "timeslots", "facilityServiceId": "1415-151-900733" }
```

Le panier repasse aussitôt `isSlotBooked: true` et son `slot.expiresInMinutes` à **20**.
La retenue vaut donc une vingtaine de minutes — le « Disponible pendant 1 min » affiché
dans le bandeau d'accueil dit autre chose. Vingt minutes suffisent largement à un
remplissage, mais l'ordre reste **remplir puis réserver** : prendre un créneau d'abord,
c'est risquer de le perdre en cours de route.

Les heures du panier sont en **UTC** (`slot.hour: "15h00"` pour un créneau de 17h), celles
de `/api/timeslots` en heure locale avec décalage. Comparer les deux sans y prendre garde
décale tout de deux heures.

## Savoir si la session est ouverte : pas d'endpoint

**`/api/me` répond 404 qu'il y ait une session ou non**, et il en va de même de
`/api/user`, `/api/customer`, `/api/account`, `/api/loyalty`. S'y fier ferait refuser tous
les runs sur une session parfaitement valide — l'erreur a été commise puis corrigée.

La page, elle, dit la vérité : elle propose « Me connecter » à un visiteur et affiche
« Bonjour &lt;prénom&gt; » à un compte. Le moteur tourne dans cette page, donc il lit la
réponse là où l'utilisateur la lit lui-même.

## Reste à observer, session ouverte requise

- L'appel qui réserve réellement un créneau (le tunnel s'ouvre mais reste à parcourir
  avec un panier rempli).
- Le point de blocage exact du paiement.
- La sémantique de `counter` — **sans objet** : le moteur écrit, relit le panier et corrige
  l'écart, ce qui est juste sous les deux lectures possibles.
