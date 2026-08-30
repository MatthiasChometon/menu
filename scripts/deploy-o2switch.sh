#!/bin/sh
# Deploys the API and its schema to the o2switch account.
#
#   ./scripts/deploy-o2switch.sh
#
# The front is NOT deployed here: it stays on Netlify, which serves it over a
# trusted certificate for free. o2switch holds the API and the database.
#
# Committed so a deploy is a command someone can read and repeat, rather than a
# sequence of SSH calls remembered by one person — the same reason netlify.toml
# is committed.
#
# What it does NOT do, on purpose:
#   - issue certificates (cPanel → Lets Encrypt™ SSL, once per domain)
#   - touch the secrets in ~/apps/menu-back/.env, which never leave the server
#
# Requirements: the deploy key at ~/.ssh/o2switch_menu, and the current IP
# authorised in cPanel → Autorisation SSH (port 22 is closed by default, and a
# home IP changes).
set -eu

SSH_KEY=${SSH_KEY:-$HOME/.ssh/o2switch_menu}
SSH_HOST=${SSH_HOST:-luzi6802@bouclier.o2switch.net}

# The deploy key is passphrase-protected, so the private file on disk is useless
# on its own — the passphrase lives in an ssh-agent. On Windows that agent is a
# Windows service reachable only by the OS's own ssh.exe, which Git Bash's ssh
# does not talk to; so on Windows we call ssh.exe and hand it the key path in
# Windows form. Everywhere else the plain ssh, with whatever agent or bare key
# is set up, is what runs. SSH_BIN and SSH_KEY can override both.
if [ -z "${SSH_BIN:-}" ]; then
  if [ -x "$WINDIR/System32/OpenSSH/ssh.exe" ] && command -v cygpath >/dev/null 2>&1; then
    SSH_BIN="$WINDIR/System32/OpenSSH/ssh.exe"
    SSH_KEY=$(cygpath -w "$SSH_KEY")
  else
    SSH_BIN=ssh
  fi
fi
APP_ROOT=apps/menu-back
NODE_VERSION=24

# The API answers here, over a Let's Encrypt certificate. The name is a free
# DuckDNS one rather than o2switch's own: odns.fr answers SERVFAIL to the CAA
# lookup Let's Encrypt makes, so no certificate can be issued on it, while
# duckdns.org is on the Public Suffix List and behaves like any real domain.
API_ORIGIN=${API_ORIGIN:-https://menuuu.duckdns.org}
FRONT_URL=${FRONT_URL:-https://menu-semaine-887.netlify.app}

REPO=$(cd "$(dirname "$0")/.." && pwd)
ssh_do() { "$SSH_BIN" -i "$SSH_KEY" -o BatchMode=yes "$SSH_HOST" "$@"; }

echo "==> API $API_ORIGIN, front $FRONT_URL"

# git archive rather than the working tree: what ships is what is committed.
echo "==> envoi des sources"
git -C "$REPO" archive --format=tar HEAD back | ssh_do "mkdir -p ~/$APP_ROOT && tar -x --strip-components=1 -C ~/$APP_ROOT"

# The addresses live beside the secrets in the server's .env, so they are edited
# in place. A missing key is a hard error: a silent no-op here would leave the
# API answering with the previous CORS allowlist and OAuth redirect, and both
# fail in ways that look like something else.
echo "==> mise à jour des adresses dans le .env du serveur"
ssh_do "set -eu
  cd ~/$APP_ROOT
  for pair in 'BACK_URL=$API_ORIGIN' 'FRONT_URL=$FRONT_URL' 'ALLOWED_ORIGINS=$FRONT_URL'; do
    key=\${pair%%=*}
    grep -q \"^\$key=\" .env || { echo \"clé \$key absente de .env\" >&2; exit 1; }
    sed -i \"s|^\$key=.*|\$pair|\" .env
  done"

echo "==> dépendances, compilation, migrations"
ssh_do "set -e
  # -e but not -u: the virtualenv's activate script reads CL_VIRTUAL_ENV before
  # setting it, and would abort under an unset-variable check.
  . ~/nodevenv/$APP_ROOT/$NODE_VERSION/bin/activate
  set -u
  cd ~/$APP_ROOT
  # The CloudLinux selector points node_modules at the virtualenv through a
  # symlink; pnpm empties the target before refilling it and then cannot
  # recreate it, so the app root keeps a real directory of its own.
  [ -L node_modules ] && rm -f node_modules
  mkdir -p node_modules
  pnpm install --frozen-lockfile
  pnpm build
  ./node_modules/.bin/drizzle-kit migrate"

echo "==> redémarrage"
ssh_do "cloudlinux-selector restart --json --interpreter nodejs --app-root $APP_ROOT" >/dev/null
# Passenger answers 503 while it spawns the process, so the first call after a
# restart is the one that wakes it rather than the one that proves it works.
ssh_do "curl -sS -m 60 -o /dev/null -w 'health: HTTP %{http_code}\n' $API_ORIGIN/health"

echo "==> déployé"
echo "    À vérifier après tout changement d'adresse :"
echo "    - console Google : $API_ORIGIN/auth/google/callback en URI de redirection"
echo "    - netlify.toml : les trois variables pointent ici"
