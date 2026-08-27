param(
  [switch]$SkipBuild
)

# Verificación build Android nativo Ágora (sin emulador)
# Uso: pnpm mobile:android:verify

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$androidDir = Join-Path $repoRoot "apps\mobile-native\android"
$gradlew = Join-Path $androidDir "gradlew.bat"

if (-not (Test-Path $gradlew)) {
  throw "No se encontró gradlew en $androidDir"
}

Push-Location $androidDir
try {
  if (-not $SkipBuild) {
    Write-Host "==> gradlew :app:assembleDebug" -ForegroundColor Cyan
    & $gradlew :app:assembleDebug
    if ($LASTEXITCODE -ne 0) {
      throw "assembleDebug falló con código $LASTEXITCODE"
    }
    Write-Host "==> BUILD SUCCESSFUL" -ForegroundColor Green
  } else {
    Write-Host "==> SkipBuild: no se compiló" -ForegroundColor Yellow
  }

  $apk = Join-Path $androidDir "app\build\outputs\apk\debug\app-debug.apk"
  if (Test-Path $apk) {
    $size = (Get-Item $apk).Length
    Write-Host "APK: $apk ($([math]::Round($size / 1MB, 2)) MB)" -ForegroundColor Green
  } else {
    Write-Warning "APK no encontrado en $apk"
  }
} finally {
  Pop-Location
}
