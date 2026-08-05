# Stop menu (prod, local): stops the containers but keeps them and their data
# volumes, so the next start is fast and the accounts survive.
param([string]$Root = 'C:\projets\menu')
$ErrorActionPreference = 'SilentlyContinue'

Set-Location $Root
docker compose -f docker-compose.prod.yml stop
exit 0
