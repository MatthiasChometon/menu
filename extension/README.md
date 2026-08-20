# Extension — courses Carrefour

Prend les commandes en attente sur l'API du menu et remplit le panier Carrefour du
navigateur où elle est installée. **Elle ne valide ni ne paie jamais une commande.**

## Pourquoi une extension

Le moteur a besoin de la session Carrefour de l'utilisateur. Depuis une page web tierce
elle est inatteignable : le navigateur bloque la lecture des réponses (CORS) et n'envoie
pas les cookies `SameSite`. Une extension déclare `www.carrefour.fr` dans ses permissions
et travaille dans un onglet du site, où les appels sont same-origin.

Conséquence assumée : rien ne tourne quand le navigateur est fermé. Un job déclenché depuis
le téléphone attend, et part au prochain démarrage.

## Où tourne quoi

| Contexte | Rôle |
|---|---|
| `background/` | Service worker : sonde la file, ouvre l'onglet, remonte l'avancement, notifie |
| `carrefour/content.ts` | Injecté dans la page du magasin — **le seul endroit où les cookies partent** |
| `engine/` | Décide quoi acheter. Ne connaît ni le réseau ni le navigateur, donc se teste seul |
| `menu/` | Client GraphQL de l'API du menu, authentifié par le jeton d'appairage |
| `popup/` | Adresse de l'API et jeton d'appairage |

## Développer

```bash
pnpm install
pnpm test        # le moteur, sans navigateur ni magasin
pnpm build       # produit dist/
```

Puis dans Chrome : `chrome://extensions`, mode développeur, « Charger l'extension non
empaquetée », choisir `dist/`.

## Le point qui compte

Le magasin peut lire `counter` comme une quantité ou comme un incrément — la question n'a
pas été tranchée par l'observation, et n'a pas besoin de l'être : le moteur **relit le
panier et corrige l'écart**. Il tombe juste dans les deux cas, et signale honnêtement un
manque quand le magasin refuse de monter (rupture de stock). Deux tests couvrent chacune
des deux lectures.
