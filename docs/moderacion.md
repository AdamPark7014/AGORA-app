# Guía de moderación — Ágora

Paso a paso para quien tiene rol `moderador` (o superior) en el panel
`admin` (desarrollo `:3300`; producción `admin.udlagora.com` cuando exista).

## Principio

La IA **nunca borra sola** salvo línea roja clara (`decision: retirar` con una
de las cinco líneas rojas nombrada, en `@agora/moderation`). El resto se
publica y, si el clasificador pide revisión, entra a la cola humana. El bypass
`MODERACION_OPCIONAL=true` apaga el clasificador: solo reportes humanos
alimentan la cola. En producción ese bypass debe ser **explícito** (la API no
arranca sin `ANTHROPIC_API_KEY` ni el flag).

El clasificador es Claude Haiku 5.5 por la puerta única (`ia.zynoratek.com`,
token del proyecto `agora`), con la política completa en
`packages/moderation/src/prompt.ts`. Si la puerta falla o tarda más de 4 s
(8 s con fotos), se publica y se encola: un proveedor caído no se convierte en
censura.

## Acceso

1. Entra con el mismo OTP `@udlap.mx` que en la web.
2. La cookie de sesión debe compartir dominio (`COOKIE_DOMAIN=.udlagora.com`
   en prod). En local déjalo vacío.
3. Sin permiso `moderacion.cola_ver` la API responde 403 — la UI no es
   autorización.

## Cola diaria

1. Abre **Cola** (`GET /api/moderacion/cola?estado=ABIERTO`).
2. Prioriza reportes repetidos sobre el mismo post y el marcado por IA.
3. Abre el contenido, lee el motivo del reportero y el historial del autor.
4. Decide:
   - **Retirar** — línea roja o acoso claro. Motivo obligatorio (lo ve el autor).
   - **Sin acción** — crítica dura / falso positivo. Cierra el reporte.
5. Nunca actúes sobre un reporte ajeno sin sesión propia: no hay impersonación.

## Marcado por IA

1. Pantalla **Marcado IA** (`GET /api/moderacion/marcado-ia`).
2. Confirma o descarta. Confirmar sin leer es el fallo típico de onboarding.
3. El motivo de cada marca automática es la razón que dio el clasificador
   (máximo 15 palabras). El autor nunca la ve; solo el aviso genérico.
4. Si el clasificador se equivoca en un tipo de caso, se corrige la política
   (`prompt.ts`) y se añade el caso a `packages/moderation/eval/casos.jsonl`
   antes de desplegar.

## Qué no hacer

- No pedir al usuario que «borre por favor» por DM de staff: usa el flujo
  auditable (`POST /moderacion/reportes/:id/resolver`).
- No reutilizar cuentas demo de e2e en producción.
- No poner `DEV_OTP_*` en el `.env` de prod (la API lo rechaza al arrancar).

## Apelaciones

Si el producto expone apelación (`moderacion.apelacion_resolver`), resuélvela
con el mismo criterio de líneas rojas. Si no hay UI aún, el historial del panel
es la fuente de verdad operativa.
