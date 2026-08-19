#!/bin/sh
# Deploys the whole app — front, API, schema — to the o2switch account.
#
#   ./scripts/deploy-o2switch.sh menu-chometon.fr
#
# Committed so a deploy is a command someone can read and repeat, rather than a
# sequence of SSH calls remembered by one person. The domain is an argument
# because it reaches into four places at once: the bundle the browser gets, the
# site's own canonical links, the API's CORS allowlist and the OAuth redirect.
#
# What it does NOT do, on purpose:
#   - register the domain or issue certificates (cPanel → Lets Encrypt™ SSL)
#   - touch the secrets in ~/apps/menu-back/.env, which never leave the server
#
# Requirements: the deploy key at ~/.ssh/o2switch_menu, and the current IP
# authorised in cPanel → Autorisation SSH (port 22 is closed by default).
set -eu

DOMAIN=${1:-}
if [ -z "$DOMAIN" ]; then
  echo "usage: $0 <domaine>    exemple: $0 menu-chometon.fr" >&2
  exit 1
fi

SSH_KEY=${SSH_KEY:-$HOME/.ssh/o2switch_menu}
SSH_HOST=${SSH_HOST:-luzi6802@bouclier.o2switch.net}
APP_ROOT=apps/menu-back
NODE_VERSION=24

SITE_ORIGIN="https://$DOMAIN"
API_ORIGIN="https://api.$DOMAIN"

REPO=$(cd "$(dirname "$0")/.." && pwd)
ssh_do() { ssh -i "$SSH_KEY" -o BatchMode=yes "$SSH_HOST" "$@"; }

echo "==> site $SITE_ORIGIN, API $API_ORIGIN"

# --- the API -----------------------------------------------------------------
# git archive rather than the working tree: what ships is what is committed.
echo "==> envoi des sources de l'API"
git -C "$REPO" archive --format=tar HEAD back | ssh_do "mkdir -p ~/$APP_ROOT && tar -x --strip-components=1 -C ~/$APP_ROOT"

# The addresses live beside the secrets in the server's .env, so they are edited
# in place. A missing key is a hard error: a silent no-op here would leave the
# API answering with the previous domain's CORS allowlist and OAuth redirect.
echo "==> mise à jour des adresses dans le .env du serveur"
ssh_do "set -eu
  cd ~/$APP_ROOT
  for pair in 'BACK_URL=$API_ORIGIN' 'FRONT_URL=$SITE_ORIGIN' 'ALLOWED_ORIGINS=$SITE_ORIGIN'; do
    key=\${pair%%=*}
    grep -q \"^\$key=\" .env || { echo \"clé \$key absente de .env\" >&2; exit 1; }
    sed -i \"s|^\$key=.*|\$pair|\" .env
  done"

echo "==> dépendances, compilation, migrations, redémarrage"
ssh_do "set -eu
  . ~/nodevenv/$APP_ROOT/$NODE_VERSION/bin/activate
  cd ~/$APP_ROOT
  # The CloudLinux selector points node_modules at the virtualenv through a
  # symlink; pnpm empties the target before refilling it and then cannot
  # recreate it, so the app root keeps a real directory of its own.
  [ -L node_modules ] && rm -f node_modules
  mkdir -p node_modules
  pnpm install --frozen-lockfile
  pnpm build
  ./node_modules/.bin/drizzle-kit migrate"
ssh_do "cloudlinux-selector restart --json --interpreter nodejs --app-root $APP_ROOT" >/dev/null

# --- the front ---------------------------------------------------------------
# Both GQL variables have to be set: clientHost alone leaves the server-side
# host on its development default, and that default is embedded in the payload
# every page ships. The site's own origin has to be named too, or every
# canonical and hreflang link in the deployed pages points at localhost.
echo "==> génération du front"
cd "$REPO/front"
NUXT_PUBLIC_API_BASE="$API_ORIGIN" \
GQL_HOST="$API_ORIGIN/graphql" \
GQL_CLIENT_HOST="$API_ORIGIN/graphql" \
NUXT_PUBLIC_I18N_BASE_URL="$SITE_ORIGIN" \
  pnpm generate

sed "s|__API_ORIGIN__|$API_ORIGIN|" deploy/htaccess > .output/public/.htaccess
grep -q "$API_ORIGIN" .output/public/.htaccess || { echo "le modèle .htaccess n'a pas été substitué" >&2; exit 1; }

# _nuxt holds hash-named assets, so old builds would pile up there forever;
# everything else is overwritten in place, which keeps the document root's own
# permissions and its cgi-bin untouched.
echo "==> envoi du site"
tar -C .output/public -cf - . | ssh_do "rm -rf ~/public_html/_nuxt && tar -x -C ~/public_html"

echo "==> déployé. Reste à faire une seule fois par domaine :"
echo "    - cPanel → Lets Encrypt™ SSL : un certificat pour $DOMAIN et api.$DOMAIN"
echo "    - console Google : $API_ORIGIN/auth/google/callback en URI de redirection"
