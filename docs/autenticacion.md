# Autenticación: código una vez, contraseña después

Desde el 21-10-2026 Ágora entra como cualquier red social: **correo @udlap.mx +
contraseña**. El código al buzón institucional sigue existiendo, pero solo como
verificación de que la cuenta es de la UDLAP, y se pide **una sola vez**.

## Por qué

Cada entrada dependía de un código por correo. Outlook de la UDLAP tardaba de
segundos a varios minutos en entregarlo (a veces caía en *Otros* o en *Correo no
deseado*) y la gente se quedaba en «Revisa tu correo». La verificación
institucional sigue intacta: solo cambia **cuándo** se pide.

## Los tres caminos

| Caso | Qué pasa |
|------|----------|
| **Cuenta nueva** | «Crea tu cuenta» → código al buzón → se elige contraseña → perfil. |
| **Cuenta de antes (sin contraseña)** | Entra como siempre con el código (botón «¿Olvidaste tu contraseña?» o «Crea tu cuenta», da igual) → se le pide crear contraseña una vez → listo. También puede crearla desde Ajustes → Contraseña, o desde el aviso que ve arriba del feed. |
| **Todos los días** | Correo + contraseña + «Recordarme». Sin código, sin correo. |
| **Olvidé mi contraseña** | Mismo código al buzón → al entrar elige una nueva. Las demás sesiones se cierran. |
| **Cambiar contraseña** | Ajustes → Contraseña, con la actual. Las demás sesiones se cierran. |

El código **no** es un segundo factor: es la raíz de confianza (el buzón
institucional), igual que el «restablecer contraseña» de cualquier sitio.

## API

| Ruta | Sesión | Qué hace |
|------|--------|----------|
| `POST /auth/otp/solicitar` `{email}` | no | Manda el código (204 siempre). Igual que antes. |
| `POST /auth/otp/verificar` `{email, codigo, modo?}` | no | Abre sesión **por código**. Ahora responde también `tieneContrasena`. |
| `POST /auth/entrar` `{email, contrasena, modo?, recordarme?}` | no | Abre sesión por contraseña. `recordarme: false` → sesión de 12 h, no renovable, cookie sin `Expires`. |
| `POST /auth/contrasena` `{contrasena}` | sí | Fija la contraseña **sin la actual**. Permitido si la cuenta no tiene, o si la sesión se abrió por código hace ≤ 30 min. Reemplazar una existente revoca las demás sesiones. |
| `POST /auth/contrasena/cambiar` `{actual, nueva}` | sí | Cambia dando la actual. Revoca las demás sesiones. |
| `GET /auth/yo` | sí | Trae `tieneContrasena` y `viaCodigo`. |

Respuestas de `verificar` y `entrar`: `{ tienePerfil, tieneContrasena }` en modo
cookie; en modo `token` además `token` y `expiraEn`. **Las apps nativas de hoy
siguen funcionando sin cambios**: usan el código y ignoran los campos nuevos.

## Seguridad

- **Hash:** argon2id (`@node-rs/argon2`, binario precompilado; 19 MiB, t=2,
  p=1). Vive en `apps/api/src/auth/contrasena.ts`. Nunca sale de la API ni al
  log (el log solo dice «Contraseña creada/cambiada para <id>»).
- **Sin enumeración:** correo desconocido, cuenta sin contraseña y contraseña
  mal responden **el mismo 401 con el mismo mensaje**, y tardan lo mismo (se
  verifica contra un hash señuelo). El mensaje ya dice «si es tu primera vez o
  aún no tienes contraseña, entra con un código».
- **Intentos:** 5 fallos seguidos (al entrar o al cambiar) bloquean la
  contraseña **15 minutos** (`users.loginFallidos`, `loginBloqueadoHasta`,
  contador incrementado en la base, no en memoria). El código al buzón sigue
  abierto y entrar por cualquier camino limpia el bloqueo. Por IP: 30/min y
  300/h como en `otp/verificar`.
- **Política:** 8–128 caracteres Unicode, no una de las ~25 más filtradas, no
  un solo carácter repetido, no contener el buzón del correo. Reglas en
  `packages/auth/src/contrasena.ts`; mensajes en español con la forma de ZodPipe.
- **Sesiones:** `sessions.viaCodigo` (cómo se abrió) y `sessions.persistente`
  («Recordarme»). Las persistentes duran 180 días y se renuevan con el uso;
  las otras 12 h sin renovar.

## Base de datos

Migración `20261021120000_contrasena`, **solo aditiva** (sin respaldo externo
en el servidor, no hay nada que perder): `users.passwordHash`,
`users.passwordSetAt`, `users.loginFallidos`, `users.loginBloqueadoHasta`;
`sessions.viaCodigo` (default `true`: todas las de antes eran por código),
`sessions.persistente` (default `true`). Se deshace con `DROP COLUMN`.

Nadie migra a mano: cada cuenta crea su contraseña la primera vez que entra
después del despliegue (o cuando quiera, desde Ajustes).

## El código, mientras siga

- Vigencia **15 minutos** (antes 10): Outlook a veces tarda más de 10 en
  entregar y el código llegaba vencido.
- «Reenviar» con cuenta regresiva de 60 s (la API no deja antes), aviso de
  revisar *Otros* / *Correo no deseado*, y el seguimiento de entrega de siempre
  (webhook de Brevo + API de eventos).
- Por qué tarda: no es cosa nuestra. La API entrega a Brevo en < 1 s; Brevo lo
  acepta y Microsoft 365 lo encola (`deferred`/`soft_bounce` en los eventos).
  El remitente `contacto@zynoratek.com` viene de campañas en frío, lo que no
  ayuda a la reputación; `acceso@udlagora.com` ya está autenticado en Brevo y
  es el cambio de `MAIL_FROM` pendiente de Adam.

## Pruebas

- `packages/auth`: política, bloqueo y ventana del código (`contrasena.test.ts`).
- `packages/contracts`: formas de `entrar`, `contrasena`, `contrasena/cambiar`.
- `apps/api/src/auth/auth.contrasena.test.ts`: entrar, bloqueo al quinto fallo,
  mensaje uniforme, crear/reemplazar/cambiar, revocación de otras sesiones.
- `e2e/contrasena.spec.ts` (API real) y `registro-y-feed.spec.ts` (navegador):
  código → contraseña → entrar sin código.

## Pendiente

- Apps nativas (Android/iOS): siguen entrando con código. Falta pantalla de
  contraseña (`POST /auth/entrar` con `modo: 'token'`) y «crear contraseña»
  tras el código.
