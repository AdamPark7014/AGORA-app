<#
    Arranque de AGORA-app.

    Levanta Postgres y Redis en Docker, migra la base y siembra el catalogo de
    la UDLAP. Es idempotente: se puede volver a correr sin romper nada.

        cd C:\dev\apps\AGORA-app
        .\scripts\arrancar.ps1

    Mismo patron que UNIVERSIDAD-app\scripts\arrancar.ps1.
#>
[CmdletBinding()]
param(
    [switch]$SinSembrar,
    [switch]$Reiniciar   # borra los volumenes y empieza de cero
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

function Paso($t) { Write-Host ''; Write-Host "-- $t" -ForegroundColor Cyan }
function Aviso($t) { Write-Host "   $t" -ForegroundColor Yellow }

if (-not (Test-Path .env)) {
    Paso 'Creando .env desde la plantilla'
    Copy-Item .env.example .env
    Aviso 'Revisa .env antes de seguir: faltan las claves de correo y moderacion.'
}
if (-not (Test-Path packages\db\.env)) {
    Paso 'Creando packages\db\.env'
    # Prisma lee el .env de su propio paquete, no el de la raiz.
    $linea = (Get-Content .env | Where-Object { $_ -match '^DATABASE_URL=' })
    if (-not $linea) { throw 'Falta DATABASE_URL en .env' }
    Set-Content -Path packages\db\.env -Value $linea -Encoding utf8
}

Paso 'Instalando dependencias'
pnpm install

if ($Reiniciar) {
    Paso 'Borrando contenedores y volumenes'
    docker compose -f infra/docker-compose.yml down --volumes --remove-orphans
}

Paso 'Levantando Postgres y Redis'
docker compose -f infra/docker-compose.yml up -d --wait postgres redis
if ($LASTEXITCODE -ne 0) {
    Aviso 'Si fallo por un puerto ocupado, cambia los puertos en infra\docker-compose.yml'
    Aviso 'y en .env. Tus otros proyectos ya usan 5432-5435 y 6379-6381.'
    throw 'No se pudieron levantar los contenedores'
}

Paso 'Generando el cliente de Prisma'
pnpm db:generate

Paso 'Migrando la base'
pnpm --filter @agora/db exec prisma migrate deploy

if (-not $SinSembrar) {
    Paso 'Sembrando el catalogo de la UDLAP'
    pnpm db:seed
}

Paso 'Corriendo las pruebas'
pnpm test

Write-Host ''
Write-Host 'Listo.' -ForegroundColor Green
Write-Host '  pnpm dev        levanta web y api'
Write-Host '  pnpm db:studio  abre Prisma Studio'
Write-Host ''
