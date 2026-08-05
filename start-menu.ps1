# menu — one-click launcher: starts Docker if needed, brings up the production
# stack, waits for the site and opens it. Stop it again with menu-down.ps1.
$ErrorActionPreference = 'SilentlyContinue'
$root = $PSScriptRoot

function Write-Step($msg) { Write-Host "  $msg" -ForegroundColor Cyan }

Write-Host ''
Write-Host '  menu de la semaine' -ForegroundColor Green
Write-Host ''

Write-Step 'Demarrage (prod)... (le 1er lancement peut prendre quelques minutes)'
& (Join-Path $root 'menu-up.ps1') -Root $root
if ($LASTEXITCODE -ne 0) {
  Write-Host '  Docker ne repond pas. Lance Docker Desktop a la main puis reessaie.' -ForegroundColor Red
  Read-Host '  Entree pour fermer'
  exit 1
}

Write-Step 'Attente que le site soit pret...'
$ready = $false
for ($i = 0; $i -lt 96; $i++) {
  try {
    $r = Invoke-WebRequest -Uri 'http://localhost:3777/' -TimeoutSec 3 -UseBasicParsing
    if ($r.StatusCode -eq 200) { $ready = $true; break }
  } catch {}
  Start-Sleep 5
}

$lan = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like '192.168.*' } | Select-Object -First 1).IPAddress
Write-Host ''
if ($ready) {
  Write-Host '  Le menu est pret !' -ForegroundColor Green
  Write-Host '    PC        : http://localhost:3777'
  if ($lan) { Write-Host "    Telephone : http://${lan}:3777   (meme WiFi, PUBLIC_HOST=$lan dans .env)" -ForegroundColor Yellow }
  Start-Process 'http://localhost:3777'
} else {
  Write-Host '  Le site se construit encore. Ouvre http://localhost:3777 dans une minute.' -ForegroundColor Yellow
}
Write-Host ''
Start-Sleep 5
