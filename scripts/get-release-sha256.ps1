# Obtiene SHA-256 del certificado de firma release para assetlinks.json (Android App Links).
# Uso:
#   .\scripts\get-release-sha256.ps1
#   .\scripts\get-release-sha256.ps1 -KeystorePath .\apps\mobile-native\android\release.keystore -Alias agora

param(
    [string]$KeystorePath = "apps/mobile-native/android/release.keystore",
    [string]$Alias = "agora",
    [string]$StorePass = $env:AGORA_KEYSTORE_PASSWORD,
    [string]$KeyPass = $env:AGORA_KEY_PASSWORD
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$keystore = Join-Path $root $KeystorePath

if (-not (Test-Path $keystore)) {
    Write-Host "Keystore no encontrado: $keystore"
    Write-Host "Crea el keystore release o pasa -KeystorePath."
    Write-Host ""
    Write-Host "Debug SHA-256 (solo desarrollo):"
    $debugKeystore = Join-Path $env:USERPROFILE ".android\debug.keystore"
    if (Test-Path $debugKeystore) {
        keytool -list -v -keystore $debugKeystore -alias androiddebugkey -storepass android -keypass android |
            Select-String "SHA256:"
    } else {
        Write-Host "  (debug.keystore no encontrado)"
    }
    exit 1
}

if (-not $StorePass) {
    $StorePass = Read-Host "Store password" -AsSecureString
    $StorePass = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($StorePass)
    )
}
if (-not $KeyPass) { $KeyPass = $StorePass }

Write-Host "Keystore: $keystore"
Write-Host "Alias: $Alias"
Write-Host ""

$out = keytool -list -v -keystore $keystore -alias $Alias -storepass $StorePass -keypass $KeyPass 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error ($out -join "`n")
}

$shaLine = $out | Select-String "SHA256:"
if (-not $shaLine) {
    Write-Error "No se encontró SHA256 en la salida de keytool."
}

$sha = ($shaLine -replace ".*SHA256:\s*", "").Trim()
$shaColons = ($sha -replace " ", ":").ToUpperInvariant()

Write-Host "SHA-256 (con dos puntos):"
Write-Host $shaColons
Write-Host ""
Write-Host "Pega en apps/web/public/.well-known/assetlinks.json -> sha256_cert_fingerprints"
