<#
.SINOPSIS
    Carga en el repo AGORA-app los secretos que necesita «iOS · TestFlight».

.DESCRIPCION
    Ágora se publica con el MISMO equipo de Apple que NEXARA y ARTA (AHNW9K8745),
    así que reusa el certificado de distribución del equipo y la llave de App Store
    Connect que ya tiene ARTA en C:\dev\secrets\arta-ios, y los publica como secretos
    de ESTE repo (GitHub no deja copiar secretos de un repo a otro). Ningún valor se
    imprime ni queda en el historial de PowerShell ni en la línea de comandos.

    Secretos que carga (los nombres que lee .github/workflows/ios-testflight.yml):

      APP_STORE_CONNECT_KEY_ID        del nombre AuthKey_XXXXXXXXXX.p8
      APP_STORE_CONNECT_ISSUER_ID     UUID de App Store Connect > Usuarios y acceso > Integraciones > API
      APP_STORE_CONNECT_PRIVATE_KEY   el texto del .p8
      CERTIFICATE_PRIVATE_KEY         la llave privada (PEM) del certificado de distribución
      DISTRIBUTION_CERT_CER_BASE64    el .cer de distribución en base64

    La llave de App Store Connect necesita rol Admin, o App Manager con acceso a
    «Certificates, Identifiers & Profiles»: el flujo registra el bundle id
    mx.agora.mobile.AgoraApp y crea su perfil con ella (scripts/asc_signing.py).

    Lo corre Adam (custodia de llaves). Requiere GitHub CLI con sesión (gh auth login).

.EJEMPLO
    pwsh -File scripts\subir-secretos-ios.ps1
    pwsh -File scripts\subir-secretos-ios.ps1 -IssuerId 69a6de70-0000-0000-0000-1f2b3c4d5e6f
#>
[CmdletBinding()]
param(
    [string]$Repo = 'AdamPark7014/AGORA-app',
    [string]$Carpeta = 'C:\dev\secrets\arta-ios',
    [string]$IssuerId = ''
)

$ErrorActionPreference = 'Stop'
function Fallo($m) { Write-Host "  ERROR: $m" -ForegroundColor Red; exit 1 }

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Fallo "No hay 'gh' en el PATH. Instala GitHub CLI: https://cli.github.com"
}
& gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  GitHub CLI no tiene sesión. Ejecuta primero:  gh auth login" -ForegroundColor Yellow
    exit 1
}

$p8 = Get-ChildItem -Path $Carpeta -Filter 'AuthKey_*.p8' -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $p8) {
    Fallo "Falta AuthKey_XXXXXXXXXX.p8 en $Carpeta (App Store Connect > Usuarios y acceso > Integraciones > API)."
}
$keyId = $p8.BaseName -replace '^AuthKey_', ''
Write-Host "Llave de App Store Connect: $($p8.Name) -> APP_STORE_CONNECT_KEY_ID = $keyId" -ForegroundColor DarkGray

$llave = Get-ChildItem -Path $Carpeta -Filter '*_distribution.key' -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $llave) { Fallo "No encuentro *_distribution.key (llave privada PEM del certificado) en $Carpeta." }
$cerB64 = Get-ChildItem -Path $Carpeta -Filter '*_distribution.cer.base64.txt' -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $cerB64) { Fallo "No encuentro *_distribution.cer.base64.txt (el .cer de distribución en base64) en $Carpeta." }
Write-Host "Certificado de distribución: $($cerB64.Name) + $($llave.Name)" -ForegroundColor DarkGray

if (-not $IssuerId) {
    $IssuerId = Read-Host 'APP_STORE_CONNECT_ISSUER_ID (UUID encima de la tabla de llaves en App Store Connect)'
}
if ($IssuerId -notmatch '^[0-9a-fA-F-]{36}$') { Fallo 'El Issuer ID debe ser un UUID de 36 caracteres.' }

function Poner([string]$nombre, [string]$valor) {
    # Por stdin: el valor no aparece en la línea de comandos ni en el historial.
    $valor | & gh secret set $nombre --repo $Repo 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Fallo "No se pudo guardar $nombre en $Repo." }
    Write-Host "  ok  $nombre" -ForegroundColor Green
}

Write-Host "Cargando secretos en $Repo ..."
Poner 'APP_STORE_CONNECT_KEY_ID' $keyId
Poner 'APP_STORE_CONNECT_ISSUER_ID' $IssuerId
Poner 'APP_STORE_CONNECT_PRIVATE_KEY' (Get-Content -Raw $p8.FullName)
Poner 'CERTIFICATE_PRIVATE_KEY' (Get-Content -Raw $llave.FullName)
Poner 'DISTRIBUTION_CERT_CER_BASE64' ((Get-Content -Raw $cerB64.FullName).Trim())

Write-Host ''
Write-Host 'Listo. Antes de lanzar «iOS · TestFlight» crea la app en App Store Connect:' -ForegroundColor Cyan
Write-Host '  Apps > + > Nueva app > iOS, bundle mx.agora.mobile.AgoraApp (ver docs/store/README.md).'
