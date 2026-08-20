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
| `totalAmountWithoutServices` | Produits seuls |
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

## Reste à observer, session ouverte requise

- L'endpoint de réservation de créneau, et si un créneau réservé est tenu.
- Le point de blocage exact du paiement, et si `subBasketType: "drive_clcv"` change en
  livraison à domicile connectée.
- La sémantique de `counter`.
