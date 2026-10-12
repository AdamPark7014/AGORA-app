# Para Cursor: lo que falta (12-10-2026)

Claude Code dejó en `main` las etapas 1 a 4 (ver `.ai/RELEVO.md`). Esto es lo que queda, en orden.
Reglas de siempre: solo `main`, commits chicos, pruebas en verde antes de cada push
(`cd apps/api && pnpm test`, `pnpm lint`, `pnpm check-types`), restaurar `*.tsbuildinfo` tras el
typecheck. Claude revisa y pule lo que hagas.

## 1. Desplegar (tú puedes: tienes terminal en la compu de Adam)

```powershell
cd C:\dev\apps\AGORA-app
git checkout -- apps/web/tsconfig.tsbuildinfo apps/admin/tsconfig.tsbuildinfo
git pull --rebase origin main
pwsh -File scripts\desplegar.ps1
```

- El script respalda Postgres, etiqueta `agora-api/web:prev-<fecha>`, sube con `git archive` + `scp`,
  construye api y web (la migración `20261012120000_pregunta_relampago` se aplica sola al arrancar la
  api), reinstala la ruta de Traefik y corre el smoke. Se detiene al primer error.
- **Nunca se ha corrido.** Si falla por algo del propio script (PowerShell, rutas, puerto), arréglalo y
  commitéalo. Si falla el build o el smoke, no improvises en el servidor: rollback con las imágenes
  `prev-<fecha>` (cabecera del script) y deja el log en `.ai/RELEVO.md`.
- Verificar después:
  - `https://udlagora.com/api/salud` → `ok`.
  - `/media/...` sigue sirviendo imágenes.
  - Un `PUT` a `/media/x` da 404.
  - En el feed aparece la pregunta del día, y en Ajustes el interruptor "⚡ Avísame cuando caiga la
    pregunta".

## 2. Servidor (por SSH, después del despliegue)

- **Alerta de disco:** cron de `scripts/vigilar-disco.sh` cada 15 min. Adam crea un tema en ntfy.sh y
  lo pone en `ALERTA_URL` (instrucciones en la cabecera del script).
- **Respaldo externo:** `scripts/respaldo-externo.sh`.
  - Destino recomendado: **Cloudflare R2**, que Adam ya usa. Configurarlo en rclone envuelto en un remoto
    `crypt`.
  - Variables en `deploy/.env`: `RESPALDO_DESTINO` y `RESPALDO_PING_URL` (healthchecks.io).
  - Cron diario 03:15.
  - Probar un restore una vez (en una base aparte, nunca sobre la de producción).
- **Errores:** `SENTRY_DSN` en `deploy/.env` (sentry.io, plan gratis), luego
  `docker compose -f deploy/docker-compose.yml up -d api`.
- **Caída:** monitor de UptimeRobot o healthchecks.io sobre `https://udlagora.com/api/salud`.

## 3. Correo de acceso desde udlagora.com

- Hoy el código de acceso sale desde un remitente que no es del dominio, y las bandejas UDLAP lo tratan
  peor.
- En Brevo: Senders & Domains → agregar `udlagora.com` → copiar los registros (código de Brevo, DKIM,
  DMARC) a Cloudflare DNS. Adam tiene el dominio en Cloudflare; la extensión de Claude en su Chrome
  puede ayudar.
- Cuando Brevo marque el dominio como autenticado:
  1. En `deploy/.env` del servidor pon `MAIL_FROM=Ágora <acceso@udlagora.com>`.
  2. Corre `docker compose -f deploy/docker-compose.yml up -d api`.
  3. Prueba con `scripts/probar-correo.ts` o pidiendo un código real.

## 4. Pregunta relámpago en las apps nativas

La API ya manda estos campos en `GET /pregunta/hoy` y en `POST /pregunta/:id/responder`. Todos son
opcionales para no romper versiones viejas:

| Campo | Qué es |
|---|---|
| `abreAt` | ISO o null. Hora sorpresa del día. Null = abierta todo el día (preguntas viejas). |
| `aTiempoHasta` | ISO o null. Fin de la ventana de 2 minutos. |
| `abierta` | bool. `false` = todavía no cae. |
| `aTiempo` | bool o null. Solo si ya contestaste. |
| `totalATiempo` | int o null. Solo si ya contestaste. |
| `miCarrera` | `{ nombre, total, votos: { "<indice>": n } }` o null. Solo si ya contestaste. |

Además, `PATCH /perfil` acepta `avisoPregunta: Boolean` y `GET /perfil/mio` lo devuelve.

**Referencia:** la web, en `apps/web/componentes/pregunta-del-dia.tsx`. Copiar el comportamiento:

- `abierta == false` → tarjeta "⚡ Hoy cae a una hora sorpresa", sin pregunta ni opciones, y volver a
  pedir la pregunta al llegar `abreAt`.
- Abierta, sin contestar y antes de `aTiempoHasta` → cuenta regresiva "⚡ m:ss para contestar a tiempo".
- Ya contestada → sello "⚡ Contestaste a tiempo" o "Contestaste tarde", con "· N a tiempo hoy", y
  "tu carrera X%" junto a cada opción.
- En Ajustes, el interruptor de `avisoPregunta`.
- El push llega con `tipo = "PREGUNTA"` y `url = "/feed"`. Abrirlo debe llevar al feed.

**Dónde:**

- Android:
  - `data/api/Apis.kt` (`PreguntaHoyDto`): los campos nuevos, todos con valor por defecto.
  - `ui/components/PreguntaDelDiaBanner.kt`.
  - `AjustesScreen.kt`.
  - `push/AgoraNotifications.kt`.
  - `assembleDebug` y las pruebas unitarias tienen que quedar en verde.
- iOS:
  - `Data/AgoraApi.swift`, con los campos opcionales.
  - `UI/Components/PreguntaDelDiaBanner.swift`.
  - Ajustes.
  - `Push/AppDelegate.swift`.
  - iOS no se puede compilar sin Mac: escríbelo con cuidado y márcalo **SIN COMPILAR** en el relevo.

## 5. Aviso de privacidad (espera datos de Adam)

- El borrador completo para la LFPDPPP está en `docs/legal/aviso-privacidad-borrador.md`.
- Faltan tres datos de Adam: responsable (persona o razón social), domicilio y correo de privacidad.
- Con esos datos:
  1. Reemplaza el contenido de `apps/web/app/privacidad/page.tsx` con el borrador, respetando el estilo
     de `apps/web/app/reglas/page.tsx`.
  2. Borra el borrador del repo.
  3. Recomienda a Adam que lo revise un abogado antes del lanzamiento.

## 6. Solo Adam

- Arreglar el cobro de GitHub Actions: CI no corre desde el 27-09.

## Después (no urgente, de la auditoría)

- Índice para el feed por `(communityId, estado, createdAt)`; medir con `EXPLAIN` primero.
- Paginación de comentarios en el detalle.
- Pasar los flujos SSE (notificaciones y chat) a Redis pub/sub antes de correr más de una instancia de
  la API.
- Carrera de reacciones (doble toque rápido) con `upsert` o una clave única.
- Mover la creación del `User` al momento de verificar el código, no al pedirlo.
