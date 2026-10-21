<#
  Despliegue de Ágora a udlagora.com desde la compu de Adam.

  Uso (desde C:\dev\apps\AGORA-app, con main al día):
    pwsh -File scripts\desplegar.ps1

  Qué hace, en orden, y se detiene al primer error:
    1. Exige un árbol limpio y que main local sea igual a origin/main.
    2. Respalda Postgres en el servidor (scripts/backup-pg.sh).
    3. Etiqueta las imágenes actuales como agora-api/web:prev-<fecha> (rollback).
    4. Sube el código con git archive (deploy/.env del servidor no se toca).
    5. Reconstruye api y web; las migraciones se aplican solas al arrancar la api.
    6. Reinstala la ruta de Traefik y corre el smoke.

  Rollback:
    ssh ... "docker tag agora-api:prev-<fecha> agora-api:latest && docker tag agora-web:prev-<fecha> agora-web:latest &&
             cd /var/www/udlagora-app && docker compose -f deploy/docker-compose.yml up -d --no-build --no-deps api web"
  Ojo: el rollback no deshace migraciones (las de hoy solo agregan columnas, no estorban al código viejo).
#>
param(
  [string]$Servidor = 'root@5.78.215.109',
  [string]$Llave = "$env:USERPROFILE\.ssh\id_ed25519_nexara_hetzner",
  [string]$Remoto = '/var/www/udlagora-app',
  # Salta la exigencia de árbol limpio. Solo cuando otra sesión tiene trabajo a medias en
  # archivos que no entran en las imágenes (p. ej. las apps nativas): lo que se sube sigue
  # siendo `git archive HEAD`, y HEAD tiene que seguir siendo igual a origin/main.
  [switch]$PermitirSinCommitear
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

function Paso($texto) { Write-Host "`n== $texto" -ForegroundColor Cyan }
function Falla($texto) { Write-Host "`nERROR: $texto" -ForegroundColor Red; exit 1 }

# El puerto cambia según la red; se prueba 2222 y luego 22.
$Puerto = $null
foreach ($p in 2222, 22) {
  ssh -i $Llave -p $p -o ConnectTimeout=8 -o BatchMode=yes $Servidor 'true' 2>$null
  if ($LASTEXITCODE -eq 0) { $Puerto = $p; break }
}
if (-not $Puerto) { Falla "No hay SSH a $Servidor ni por 2222 ni por 22." }
# Keepalive: el build tarda minutos y sin él la conexión se cortaba a la mitad (19-10).
$ssh = @('-i', $Llave, '-p', $Puerto, '-o', 'ServerAliveInterval=20', '-o', 'ServerAliveCountMax=15', $Servidor)

Paso '1/6 Revisando el código local'
# Los tsbuildinfo cambian con cada typecheck local y no son código.
git checkout -- '*.tsbuildinfo' 2>$null
if (-not $PermitirSinCommitear -and (git status --porcelain --untracked-files=no)) { Falla 'Hay cambios sin commitear. Commitea o descártalos antes de desplegar (o -PermitirSinCommitear si son de otra sesión y no entran en las imágenes).' }
if ($PermitirSinCommitear -and (git status --porcelain --untracked-files=no)) { Write-Host 'Aviso: hay cambios sin commitear que NO se despliegan (se sube git archive HEAD).' -ForegroundColor Yellow }
git fetch -q origin main
if ((git rev-parse HEAD) -ne (git rev-parse origin/main)) { Falla 'main local no es igual a origin/main. Corre: git pull --rebase origin main' }
$commit = git rev-parse --short HEAD
$fecha = Get-Date -Format 'yyyyMMdd-HHmm'
Write-Host "Desplegando $commit por el puerto $Puerto"

Paso '2/6 Respaldando la base del servidor'
ssh @ssh "cd $Remoto && bash scripts/backup-pg.sh && ls -1t /var/backups/udlagora | head -1"
if ($LASTEXITCODE -ne 0) { Falla 'El respaldo falló; no se toca nada más.' }

Paso '3/6 Guardando las imágenes actuales para rollback'
ssh @ssh "docker tag agora-api:latest agora-api:prev-$fecha && docker tag agora-web:latest agora-web:prev-$fecha && echo prev-$fecha"
if ($LASTEXITCODE -ne 0) { Falla 'No se pudieron etiquetar las imágenes actuales.' }

Paso '4/6 Subiendo el código'
$tar = Join-Path $env:TEMP "agora-$commit.tar.gz"
# autocrlf=false: el servidor es Linux; con CRLF el entrypoint de la api no arranca (07-10).
git -c core.autocrlf=false archive --format=tar.gz -o $tar HEAD
scp -i $Llave -P $Puerto $tar "${Servidor}:/tmp/agora-$commit.tar.gz"
if ($LASTEXITCODE -ne 0) { Falla 'No se pudo subir el código.' }
ssh @ssh "cd $Remoto && tar -xzf /tmp/agora-$commit.tar.gz && rm /tmp/agora-$commit.tar.gz && echo $commit > DESPLEGADO"
if ($LASTEXITCODE -ne 0) { Falla 'No se pudo extraer el código en el servidor.' }
Remove-Item $tar

Paso '5/6 Construyendo api y web (tarda varios minutos)'
# --no-deps: sin él compose intenta recrear minio-init y su imagen minio/mc ya no se puede bajar (07-10).
# El build corre en el servidor con nohup y aquí solo se consulta: el 19-10 la conexión SSH se cortó tres
# veces a media construcción (aun con keepalive) y el build moría con ella.
$log = "/tmp/agora-build-$fecha.log"
ssh @ssh "cd $Remoto && rm -f $log.exit && nohup sh -c 'docker compose -f deploy/docker-compose.yml up -d --build --no-deps api web > $log 2>&1; echo `$? > $log.exit' > /dev/null 2>&1 &"
if ($LASTEXITCODE -ne 0) { Falla 'No se pudo arrancar la construcción en el servidor.' }
$salida = $null
for ($i = 0; $i -lt 120 -and $null -eq $salida; $i++) {
  Start-Sleep -Seconds 15
  $r = ssh @ssh "cat $log.exit 2>/dev/null; tail -1 $log 2>/dev/null"
  if ($LASTEXITCODE -eq 0 -and $r) {
    $lineas = @($r)
    if ($lineas.Count -ge 2 -and $lineas[0] -match '^\d+$') { $salida = [int]$lineas[0] } else { Write-Host "  ... $($lineas[-1])" }
  }
}
ssh @ssh "tail -15 $log; cd $Remoto && docker compose -f deploy/docker-compose.yml ps api web"
if ($salida -ne 0) { Falla "La construcción falló (log en el servidor: $log). Rollback con las imágenes prev-$fecha (ver cabecera del script)." }

Paso '6/6 Ruta de Traefik y smoke'
# Hasta 6 intentos: Traefik tarda en ver los contenedores nuevos y el primero daba 502 (19-10).
ssh @ssh "cd $Remoto && bash deploy/install-traefik-route.sh && for i in 1 2 3 4 5 6; do sleep 15; RESOLVE=udlagora.com:443:127.0.0.1 bash scripts/smoke-udlagora.sh && exit 0; echo reintento `$i; done; exit 1"
if ($LASTEXITCODE -ne 0) { Falla "El smoke falló. Revisa: docker logs agora-api --tail 80. Rollback: imágenes prev-$fecha." }

Write-Host "`nListo: $commit en udlagora.com. Rollback disponible: prev-$fecha" -ForegroundColor Green
