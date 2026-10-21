<#
.SINOPSIS
    Carga en el repo AGORA-app los secretos que necesita «Android · Play».

.DESCRIPCION
    Toma la llave de SUBIDA de Ágora tal como la lee Gradle en esta PC
    (apps/mobile-native/android/local.properties → RELEASE_STORE_FILE, RELEASE_STORE_PASSWORD,
    RELEASE_KEY_ALIAS, RELEASE_KEY_PASSWORD; el .jks vive en apps/mobile-native/keystore/, fuera de
    git) y la publica como secretos de ESTE repo con `gh secret set` por stdin. Ningún valor se
    imprime ni queda en el historial de PowerShell ni en la línea de comandos.

    Secretos que carga (los nombres que lee .github/workflows/android-play.yml):

      ANDROID_UPLOAD_KEYSTORE_BASE64   el .jks en base64
      ANDROID_KEYSTORE_PASSWORD        RELEASE_STORE_PASSWORD
      ANDROID_KEY_ALIAS                RELEASE_KEY_ALIAS
      ANDROID_KEY_PASSWORD             RELEASE_KEY_PASSWORD

    Play registra como llave de subida la del PRIMER .aab que se sube: no crear otra llave después.
    Lo corre Adam (custodia de llaves). Requiere GitHub CLI con sesión (gh auth login).

.EJEMPLO
    pwsh -File scripts\subir-secretos-android.ps1
#>
[CmdletBinding()]
param(
    [string]$Repo = 'AdamPark7014/AGORA-app',
    [string]$LocalProperties = (Join-Path $PSScriptRoot '..\apps\mobile-native\android\local.properties')
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

if (-not (Test-Path $LocalProperties)) {
    Fallo "No encuentro $LocalProperties (ahí están RELEASE_STORE_FILE y las contraseñas de la llave de subida)."
}

# clave=valor por línea; los valores se usan tal cual (Gradle los lee igual).
function Read-Properties([string]$ruta) {
    $props = @{}
    foreach ($linea in [System.IO.File]::ReadAllLines($ruta)) {
        $l = $linea.Trim()
        if ($l -eq '' -or $l.StartsWith('#') -or $l.StartsWith('!')) { continue }
        $i = $l.IndexOf('=')
        if ($i -lt 1) { continue }
        $props[$l.Substring(0, $i).Trim()] = $l.Substring($i + 1).Trim()
    }
    return $props
}

$props = Read-Properties $LocalProperties
foreach ($campo in 'RELEASE_STORE_FILE', 'RELEASE_STORE_PASSWORD', 'RELEASE_KEY_ALIAS', 'RELEASE_KEY_PASSWORD') {
    if (-not $props[$campo]) { Fallo "local.properties no trae $campo." }
}

# RELEASE_STORE_FILE es relativo a apps/mobile-native/android (rootProject.file en build.gradle.kts),
# o absoluto.
$androidDir = Split-Path -Parent $LocalProperties
$rutaJks = $props.RELEASE_STORE_FILE
if (-not [System.IO.Path]::IsPathRooted($rutaJks)) { $rutaJks = Join-Path $androidDir $rutaJks }
$rutaJks = [System.IO.Path]::GetFullPath($rutaJks)
if (-not (Test-Path $rutaJks)) { Fallo "No encuentro el keystore $rutaJks (RELEASE_STORE_FILE)." }
Write-Host "Llave de subida: $rutaJks (alias $($props.RELEASE_KEY_ALIAS))" -ForegroundColor DarkGray

function Poner([string]$nombre, [string]$valor) {
    # Por stdin: el valor no aparece en la línea de comandos ni en el historial.
    $valor | & gh secret set $nombre --repo $Repo 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Fallo "No se pudo guardar $nombre en $Repo." }
    Write-Host "  ok  $nombre" -ForegroundColor Green
}

$base64 = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($rutaJks))
try {
    Write-Host "Cargando secretos en $Repo ..."
    Poner 'ANDROID_UPLOAD_KEYSTORE_BASE64' $base64
    Poner 'ANDROID_KEYSTORE_PASSWORD' $props.RELEASE_STORE_PASSWORD
    Poner 'ANDROID_KEY_ALIAS' $props.RELEASE_KEY_ALIAS
    Poner 'ANDROID_KEY_PASSWORD' $props.RELEASE_KEY_PASSWORD
}
finally {
    $base64 = $null
    $props = $null
}

Write-Host ''
Write-Host 'Listo. Lanza «Android · Play» en GitHub (Actions > Android · Play > Run workflow) con la versión' -ForegroundColor Cyan
Write-Host 'y el versionCode; el .aab queda en el artefacto agora-aab. La primera subida a Play Console es a mano'
Write-Host '(docs/PLAY_STORE.md) y registra este certificado como llave de subida de la app.'
