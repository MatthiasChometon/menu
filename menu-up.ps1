# Core bring-up for menu (prod, local). No UI — start-menu.ps1 wraps it.
# Starts Docker Desktop if it is off, then brings the stack up in the background.
param([string]$Root = 'C:\projets\menu')
$ErrorActionPreference = 'SilentlyContinue'

function Test-Docker { docker ps *> $null; return $? }

if (-not (Test-Docker)) {
  $exe = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
  if (Test-Path $exe) { Start-Process $exe }
  for ($i = 0; $i -lt 60; $i++) { Start-Sleep 3; if (Test-Docker) { break } }
  if (-not (Test-Docker)) { Write-Error 'Docker ne repond pas.'; exit 1 }
}

Set-Location $Root
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans
exit $LASTEXITCODE
