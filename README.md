# Ágora — red social verificada de la UDLAP

Red cerrada para la comunidad UDLAP: identidad real verificada por correo
`@udlap.mx`, comunidades derivadas del grafo académico, y una política de
contenido de línea roja, no de sensibilidad.

**No afiliado a la Universidad de las Américas Puebla.**

> ⚠ **El nombre es provisional.** "Ágora" está muy poblado en educación en
> México (Ágora UTJ, agora.edu.mx, Agora International Learning). Antes de
> publicar hay que consultar MARCANET del IMPI y registrar un distintivo propio.
> El scope `@agora/*` es un find-and-replace mientras el repo sea privado.

Plan completo: `C:\Users\adpoz\.claude\plans\ve-todos-mis-proyectos-drifting-newell.md`

---

## Fase operativa actual — A6 blindaje (no producto)

**A6-1 (custodia local) está cerrada.** El repo ya es git (`master` + rama
`mejora/ci-y-blindaje`), sin remoto hasta que Adam lo autorice.

| Ítem | % | Estado en disco |
|---|---:|---|
| A6-1 Custodia git local | 100 | ✅ primer commit + relevo |
| A6-2 CI formal (`.github/workflows/`) | 100 | ✅ `ci.yml`: Postgres 17 + Redis, migrate, lint, types, unit, 8 e2e |
| A6-3 `packages/core` y `packages/ui` | 100 | ✅ carpetas vacías **retiradas** (nadie las importaba) |
| A6-4 Retirar `apps/mobile` (Expo) | ~90 | 🟡 matriz actualizada; Expo **sigue** (push prod / AASA aún 🟡) |
| A6-5 Hardening MinIO + moderación | 100 | ✅ policy wiring + tests de rechazo MIME/tope/path + entorno |
| A6-6 Docs operativas (comunidad, moderación, runbook) | 100 | ✅ `docs/comunidad.md`, `docs/moderacion.md`, `docs/runbook.md` |
| A6-7 Deploy `udlagora.com` | 0 | ⏸ `deploy/` listo; lo ejecuta Adam |
| Remoto GitHub privado | 0 | ⏸ lo autoriza Adam — **SIN REMOTO** |
| Marca MARCANET/IMPI | 0 | ⏸ trámite legal de Adam |

**Siguiente fase = A6-7 (deploy) + remoto privado + MARCANET**, todo con
autorización explícita de Adam. Producto funcional (fases 0–7 del README abajo)
≠ listo para operar en producción hasta A6-7.

---

## Arranque

```powershell
.\scripts\arrancar.ps1
```

Levanta Postgres y Redis, migra, siembra el catálogo de la UDLAP y corre las
pruebas. Es idempotente.

A mano:

```bash
pnpm install
pnpm docker:up
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm test
```

**Puertos:** Postgres `5442`, Redis `6382`. No son los de siempre porque tus
otros proyectos ya ocupan 5432-5435 y 6379-6381.

**Antes de dar algo por bueno**, con los servidores levantados:

```bash
pnpm ci:verify && npx playwright test
```

Si `turbo` muere con `spawn UNKNOWN`, no es el proyecto: el **Control de
aplicaciones de Windows** está bloqueando `turbo.exe`. Se ve corriendo el
binario a mano y leyendo el error. Hay que permitirlo en Seguridad de Windows
→ *Control de aplicaciones y explorador*. Mientras tanto:

```bash
pnpm ci:verify:sin-turbo
```

Hace lo mismo con pnpm recursivo, que respeta el orden topológico igual; lo
único que se pierde es la caché.

`ci:verify` compila de verdad (`pnpm build`), y ahí es donde se caen los fallos
de resolución de módulos que `tsc` no ve. La prueba `e2e/humo.spec.ts` recorre
todas las rutas de la web y falla si alguna muestra el diálogo de error de
Next — existe porque la web estuvo devolviendo 500 en todas sus páginas y ni
los tipos ni las unitarias se enteraron.

---

## Estructura

```
apps/
  web/      Next.js 15 — PWA, layout de 3 columnas: feed, eventos,
            aventones, marketplace, mensajes, directorio, perfil       ✅
  api/      NestJS — auth, catálogo, perfil, directorio, feed, eventos,
            mensajería, aventones, marketplace, media                  ✅
  admin/    panel de moderación — SUBDOMINIO propio (:3300)        ✅
  mobile/           Expo SDK 57 — **solo prototipo** (no tienda)              🔵
  mobile-native/    **Producción** — Kotlin Compose + SwiftUI                 ✅
packages/
  config/       tsconfig compartidos                  ✅
  shared/       catálogo UDLAP + identidad            ✅
  contracts/    validadores Zod compartidos           ✅
  auth/         OTP, sesiones, límites de envío       ✅
  rbac/         roles y permisos                      ✅
  db/           Prisma: esquema, migraciones, seed    ✅
  moderation/   política de contenido                 ✅
infra/      docker-compose
scripts/    arrancar.ps1
```

> `packages/core` y `packages/ui` se retiraron en A6-3: estaban vacíos y ningún
> app los importaba. El design system vive en cada cliente; las reglas de
> dominio en `shared` / `contracts` / `moderation`.

**Levantar todo en local:**

```bash
pnpm dev
```

Web en `http://localhost:3200`, API en `http://localhost:4200/api`.

En desarrollo `MAIL_PROVIDER=console`: el código OTP **sale en el log de la
API**, no por correo. Así se prueba el flujo completo sin dar de alta un
dominio en Resend.

**App móvil de producción (100% nativa, como NEXARA):**

```bash
pnpm dev:api
pnpm mobile:android:preview    # emulador + APK debug
pnpm mobile:android:verify     # assembleDebug
```

Código en `apps/mobile-native/` — Kotlin Compose (Android) + SwiftUI (iOS). Auth: `modo: "token"` + Bearer en `SessionStore` cifrado.

**Prototipo Expo (solo referencia):**

```bash
pnpm --filter @agora/mobile dev
```

`apps/mobile/` — copiar flujos contra la API; **no es la app de producción**.

---

## Correo: pasar de desarrollo a producción

En desarrollo `MAIL_PROVIDER=console` y **el código sale en el log de la API,
no por correo**. Para verlo:

```bash
grep -o "codigo para .* [0-9]\{6\}" /tmp/agora-api.log | tail -1
```

Para correo real hay dos proveedores soportados. **Brevo** es el atajo si ya
tienes cuenta (la de `demo.erperiencebt.com.mx` sirve); **Resend** es la
alternativa.

**Con Brevo** — panel → *SMTP & API* → *API Keys*:

```
MAIL_PROVIDER=brevo
BREVO_API_KEY=xkeysib-...
MAIL_FROM=Ágora <hola@tudominio.mx>
```

**Con Resend** — panel → *API Keys*:

```
MAIL_PROVIDER=resend
RESEND_API_KEY=re_...
MAIL_FROM=Ágora <hola@tudominio.mx>
```

Cambiar de proveedor es cambiar `MAIL_PROVIDER`; el resto del `.env` no se toca.

En ambos casos el **dominio del remitente debe estar verificado** en el
proveedor (registros DKIM/SPF en Cloudflare o GoDaddy). Sin eso, cualquier
destinatario que no seas tú devuelve **422**. Y `MAIL_FROM` no puede ser
`@udlap.mx`: ese dominio no es tuyo, no lo vas a poder verificar, y mandar
correo como si fueras la universidad es justo la confusión que el disclaimer
intenta evitar.

**Genera una llave nueva solo para Ágora** en vez de reutilizar la del otro
proyecto. Si algún día hay que revocarla, no se cae `demo.erperiencebt.com.mx`
de paso.

La API valida todo esto **al arrancar**: si falta la llave, el remitente tiene
mal formato o alguien deja `console` con `NODE_ENV=production`, el proceso no
levanta y dice exactamente qué falta. Es preferible que falle el despliegue a
que falle el primer usuario que intenta entrar.

### Cómo se comporta el envío

- **Reintenta** ante 429, 408, 5xx y fallos de red, con espera exponencial
  (400 ms, 800 ms, 1600 ms). La política es idéntica en Brevo y en Resend: el
  bucle vive una sola vez y cada proveedor solo aporta cómo arma su petición.
- **No reintenta** ante 401, 403 ni 422: una llave mal puesta o un dominio sin
  verificar no se arreglan esperando, y reintentar solo le hace creer al
  usuario que su código viene en camino.
- En Resend, todos los intentos comparten `Idempotency-Key`: si el primer envío
  sí llegó pero la respuesta se perdió, el usuario recibe **un** correo, no
  tres. Brevo no tiene esa cabecera, así que la clave viaja como etiqueta para
  poder rastrear un duplicado en su panel.
- `MAIL_FROM` se escribe igual para los dos: `separarRemitente` lo parte en
  `{name, email}` cuando el proveedor lo exige.
- El log registra el destino enmascarado y el id del mensaje, **nunca el
  código**.

---

## Identidad visual

**Base blanca, acento naranja.** El papel cálido de la primera versión se veía
acogedor pero no profesional, y una red social se juzga en el primer segundo.
Blanco limpio (`#ffffff` sobre `#f7f8f9`), bordes finos en vez de sombras
pesadas, y el naranja reservado para lo que se toca.

| Color | Pantone | Hex | Uso |
|---|---|---|---|
| Naranja | 166 C | `#e35205` | Acento, botones, estado activo |
| Verde | 3435 C | `#154734` | Avatares |
| Aqua | 327 C | `#008675` | Etiquetas de generación |
| Oro | 874 C | `#8b6f4e` | Etiquetas de colegio |

El tema oscuro es gris neutro (`#0f1114`), no café: el oscuro cálido anterior
se veía sucio.

**Se usan los colores, nunca el escudo ni el logotipo.** Los colores dan
pertenencia; el escudo daría una afiliación que no existe. El pie de página lo
dice explícitamente en todas las pantallas.

El tema oscuro existe pero es cálido —no el negro verdoso de la primera
versión— y el claro es el primario.

---

## Decisiones que conviene no re-litigar

**Multi-tenant desde el día 1.** El techo de la UDLAP son ~9,000 personas
(8k licenciatura + ~900 posgrado + 763 profesores). `University` como raíz
cuesta horas ahora y evita una reescritura completa el día que entre otra
universidad.

**Comunidades derivadas, no creadas a mano.** Al completar el perfil el usuario
cae automáticamente en ~6 comunidades: escuela, departamento, carrera,
generación, colegio residencial y organizaciones. El grafo ya existe en la
realidad; solo se copia. Por eso un usuario nuevo nunca ve el feed vacío, que
es donde mueren las redes sociales nuevas.

**Feed fan-out on read.** Un `SELECT` indexado por `(communityId, createdAt)`
sobre 9,000 usuarios es instantáneo. Nada de timelines precomputados.

**Verificación por OTP, no por OAuth institucional.** La UDLAP corre sobre
Microsoft 365, así que Entra ID daría verificación perfecta — pero requiere
*admin consent* de TI. El OTP al buzón `@udlap.mx` no necesita permiso de nadie.
Entra ID queda como proveedor enchufable (`ENTRA_ID_ENABLED`).

**Política de línea roja.** Criticar profesores, groserías y humor negro **no se
tocan** — esa es la razón de existir frente a un canal institucional. Solo cinco
cosas se retiran automáticamente, y la IA nunca borra por su cuenta: marca y
encola. Ver `packages/moderation/src/politica.ts`.

---

## El panel de moderación vive en un subdominio

`apps/admin` es una app aparte, no una ruta de la web. En producción va en
**`admin.tudominio.mx`**; en desarrollo, en el puerto **3300**.

```bash
pnpm dev:admin     # solo el panel
```

**Cómo comparten sesión sin un segundo login:** la cookie se emite con
`COOKIE_DOMAIN=".tudominio.mx"`, así que vale igual en `tudominio.mx` y en
`admin.tudominio.mx`. En desarrollo la variable se deja **vacía** — un `domain`
que contenga `localhost` hace que el navegador descarte la cookie y nadie
puede entrar.

`NEXT_PUBLIC_ADMIN_URL` entra además en la lista de orígenes de CORS. Se
enumeran explícitamente y no con comodín: con `credentials: true`, un comodín
sería abrir la sesión a cualquier sitio.

**Por qué separado y no `/admin` dentro de la web:**

- Un despliegue del panel no puede tumbar la red, ni al revés.
- El panel manda `X-Frame-Options: DENY` y `X-Robots-Tag: noindex` sin que eso
  afecte a la app pública.
- Su identidad visual es deliberadamente distinta —densa y oscura— para que
  nadie confunda estar en la app con estar a un clic de suspender a alguien.

**El primer moderador se crea desde la consola**, porque no hay forma de entrar
al panel sin el rol ni de darse el rol desde el panel:

```bash
pnpm rol tu.correo@udlap.mx moderador
```

### Qué hace el panel

| Vista | Para qué |
|---|---|
| **Resumen** | Pendientes, marcado por IA sin revisar, resueltos en 24 h, suspendidos |
| **Cola** | Reportes agrupados por contenido, lo más denunciado primero |
| **Marcado por IA** | Lo que el clasificador marcó y **sigue publicado**, esperando decisión humana |
| **Historial** | Toda acción con su autor y su motivo — es lo que hace posible apelar |

**El motivo es obligatorio en toda acción.** No es un campo opcional: el usuario
afectado tiene derecho a saber por qué se retiró su contenido, y sin motivo
escrito esa promesa no se puede cumplir. La API lo rechaza con 400 si va vacío.

**El permiso se comprueba en el servidor, siempre.** El panel esconde lo que no
te toca, pero eso es cortesía visual; la defensa real es el `PermisoGuard` de
la API, porque un endpoint se puede llamar sin pasar por la interfaz.

---

## Producción

- **Validación de entorno al arrancar** (`apps/api/src/comun/entorno.ts`):
  falla si falta `DATABASE_URL` o `SESSION_SECRET`, si el secreto tiene menos de
  32 caracteres, si `MAIL_PROVIDER=console` con `NODE_ENV=production`, si falta
  `OPENAI_API_KEY` sin declarar `MODERACION_OPCIONAL=true`, o si la URL pública
  no es https.
- **Cabeceras de seguridad** con helmet.
- **Límite por IP** (`@nestjs/throttler`, 60/min y 600/h) además del límite por
  buzón de `@agora/auth`. Ese frena a quien machaca un solo correo; este a quien
  recorre miles de direcciones desde la misma máquina.
- **`TRUST_PROXY=true`** detrás de Traefik/Caddy/Coolify. Sin esto el límite por
  IP ve siempre la IP del proxy y castiga a todos por igual.
- **`GET /api/salud`** consulta la base de verdad, no responde 200 a secas: un
  proceso vivo con la base caída no está sano.
- **Dockerfiles multi-etapa** para api y web, con usuario sin privilegios,
  lockfile congelado, `prisma generate` en build y `output: standalone` en Next.

---

## Seguridad

No repetir lo de NEXARA (credenciales en repo público). Aquí hay datos
personales de miles de personas reales:

1. **Repo privado.** Sin excepciones.
2. `.env` en `.gitignore`. `.env.example` solo lleva **nombres** de variables.
3. `pnpm secrets:scan` antes de cada push (requiere `gitleaks`).
4. Secretos en el gestor del proveedor de deploy, nunca en el repo.
5. Rate limiting en el envío de OTP — sin él, el endpoint es una máquina de
   spam contra los buzones `@udlap.mx` y te ganas el bloqueo del dominio.

También aplica la nueva LFPDPPP (en vigor desde el 21-mar-2025): aviso de
privacidad integral y simplificado, y multas de 100 a 320,000 UMA.

---

## Notas de implementación que ahorran depuración

**La API tiene una sola forma de error.** Todo sale como
`{ mensaje, errores? }`, lo aplica `comun/error.filter.ts` y lo fija
`e2e/api-contrato.spec.ts`. Antes convivían dos —la de `ZodPipe` y la de
Nest— y el cliente probaba tres campos a ver cuál traía algo.

Lo otro que arregla ese filtro: **un fallo inesperado ya no se cuenta**. Un
error de Prisma subía al manejador por omisión de Nest, que responde con el
mensaje de la excepción — y ese mensaje trae nombres de tabla, de columna y a
veces el valor que chocó. Ahora el 500 dice lo mínimo y lleva un `trazaId` que
también aparece en el registro, para poder cruzarlos.

**Los mensajes de validación que Zod genera solo** salían en inglés: un campo
obligatorio vacío pintaba `Required` debajo de la etiqueta. Traducidos en
`packages/contracts/src/mensajes-es.ts`, que vive ahí y no en la API porque los
mismos esquemas se validan también en el cliente.

**`pnpm dev` construye `shared` y `contracts` antes de arrancar.** La API es
CommonJS y los resuelve por `dist`, no por el TypeScript: sin construirlos,
arranca contra código de días atrás y el síntoma es *"no es una función"* para
algo que acabas de escribir. Pasó dos veces.

**El flujo SSE está excluido de la compresión, a propósito y por escrito.**
`compression` acumula bytes antes de mandarlos; aplicado a `text/event-stream`
el evento se queda en el buffer y el globo de notificaciones deja de moverse,
sin error y sin nada en el registro. La librería ya lo evita por su cuenta,
pero eso es un detalle de su implementación y aquí depende de ello algo que se
rompe en silencio.

**El registro anota solo lo lento y lo que falla.** Una línea por petición a
9,000 usuarios es un archivo que nadie lee. Lo interesante es la cola: la
petición de 3 segundos, no las mil de 20 ms. Con
`LOG_TODAS_LAS_PETICIONES=true` se anotan todas para depurar un rato. La cadena
de consulta nunca se escribe — ahí viajan búsquedas y texto que la gente
escribió.

**Hay un solo ESLint para todo el monorepo**, en `eslint.config.mjs` de la
raíz, y corre en un único proceso (`pnpm lint`) en vez de doce vía Turbo.
Antes no había ninguno: la tarea `lint` de `ci:verify` era `next lint` sin
configuración, o sea que preguntaba de forma interactiva y **fallaba siempre**.

El criterio de qué reglas entran: solo las que encuentran errores. El formato
lo resuelve Prettier, y una regla de estilo que discute con Prettier solo
produce ruido que se acaba ignorando. La que justifica el montaje es
`react-hooks/exhaustive-deps`: con casi cien componentes, una dependencia que
falta en un `useEffect` da datos viejos en pantalla sin ningún síntoma al
escribir el código.

Los `any` de los adaptadores de Prisma quedan como **aviso**, no error: ahí el
tipo generado es inmanejable y bloquear por eso solo invita a silenciar la
regla entera.

**Los paquetes del workspace necesitan `transpilePackages` *y* `extensionAlias`.**
`moduleResolution: NodeNext` obliga a escribir `./udlap.js` en un import que
apunta a `udlap.ts`. `tsc` y Node lo entienden; webpack no, y
`transpilePackages` por sí solo no lo arregla — hace que Next compile el
paquete, no que resuelva la ruta. Sin las dos cosas en `next.config.ts`, la web
devuelve **500 en todas sus páginas**.

Esto estuvo roto días sin que se notara, porque en `packages/shared/src` habían
quedado archivos `.js` de una compilación vieja: webpack los resolvía y servía
código de días atrás. `dist/` es el único sitio donde va salida compilada; si
vuelve a aparecer un `.js` dentro de `src/`, es basura y hay que borrarla.

**`output: 'standalone'` solo se enciende en Docker** (`BUILD_STANDALONE=true`).
Para armarlo, Next crea enlaces simbólicos, y en Windows eso exige Modo de
desarrollador. Con la bandera siempre puesta, `pnpm build` **fallaba siempre en
local** después de compilar bien — que es justo por lo que nadie lo corría y el
500 de arriba pasó desapercibido. El build local vuelve a ser una comprobación
previa fiable.

**El límite de peticiones se cuenta por persona, no por IP.** Ágora es una red
de campus: miles de alumnos salen por el NAT de la UDLAP y para el servidor son
una sola IP. Contando por IP, el campus entero compartía el cupo de un usuario
y la app se caía justo donde más se usa. Ver `apps/api/src/comun/limite.guard.ts`.
El envío de OTP mantiene límite propio por IP porque ahí todavía no hay sesión
y cada llamada manda un correo de verdad.

**Los datos caducados se borran solos.** `MantenimientoService` corre a las 4 de
la mañana y limpia códigos OTP, sesiones vencidas y avisos ya leídos. Importa
porque `sessions` se consulta en **cada petición con sesión** y `otp_codes` en
cada inicio: son las dos tablas más calientes y antes no se vaciaban nunca. A
mano: `pnpm db:limpiar-caducados`. Las reglas de retención están en
`apps/api/src/mantenimiento/retencion.ts`, en un solo sitio.

**NestJS no puede correr con `tsx`.** esbuild —que es lo que usa tsx— no emite
`emitDecoratorMetadata`, así que la inyección de dependencias de Nest recibe
`undefined` en todos los constructores. El síntoma es un 500 con
`Cannot read properties of undefined`. Por eso `apps/api` usa `nest start`
(que compila con `tsc`) y no tsx.

**Nada de `ValidationPipe` global.** Arrastra `class-validator`, que aquí no se
usa: la validación es Zod contra `@agora/contracts`, los mismos contratos que
consume la web.

**El generador de Prisma va sin `output` personalizado.** Apuntarlo a
`packages/db/node_modules` rompe la resolución desde `@prisma/client` en un
workspace pnpm.

**El departamento se deriva de la carrera, no se pregunta.** Una prueba e2e
descubrió que el formulario dejaba a todos fuera de la comunidad de su
departamento: nadie la llenaba porque casi nadie sabe a qué departamento
pertenece su licenciatura. Ahora `Carrera` apunta a `Departamento` y el servidor
lo resuelve. Ojo: algunas de las 52 asignaciones son inferencia a partir del
nombre del departamento y no están verificadas contra el catálogo oficial —
se corrigen en `packages/shared/src/udlap.ts` y el seed las reaplica.

**La pantalla de entrada redirige si ya hay sesión.** Antes mostraba el
formulario aunque el encabezado ya dijera tu nombre — la sensación exacta de que
la app te olvidó. La sesión siempre duró 30 días; lo que faltaba era que `/`
la mirara.

**Las columnas `@db.Date` vuelven de Prisma a medianoche UTC.** Comparar contra
medianoche *local* falla: en México (UTC−6) difieren 6 horas y la pregunta del
día se daba por cerrada nada más crearla. Se ancla el día del calendario local
a UTC con `Date.UTC(...)`.

**Nunca corras `next build` mientras `next dev` está vivo.** Comparten la
carpeta `.next` y el build la deja corrupta: el dev empieza a tirar
`Cannot find module './662.js'` y páginas en 500. Se arregla parando el dev,
borrando `.next` y arrancando de nuevo.

**El tope de tamaño se aplica DESPUÉS de saber qué es.** 8 MB para imagen,
60 MB para video: un solo límite dejaría fuera casi cualquier grabación de
teléfono, o permitiría fotos absurdas.

**Un 429 al pedir código no deja al usuario atorado.** Significa "acabas de
pedir uno", no "no se pudo": el código anterior sigue vivo 10 minutos, así que
la app avanza a la pantalla del código y lo dice. Antes te negaba la entrada
justo por tener uno válido.

**Las imágenes y videos se validan por sus primeros bytes, no por el `Content-Type`.**
Ese encabezado lo controla el cliente: cualquiera puede subir un ejecutable
diciendo que es `image/png`. Los *magic bytes* no se pueden falsear sin dejar de
ser una imagen válida. SVG queda fuera a propósito — admite scripts.

**En producción el disco local no sirve para imágenes.** Con más de una réplica
cada contenedor tendría las suyas y la mitad de las fotos daría 404 según a
quién le tocara atender. Por eso `crearAlmacen()` falla al arrancar si
`NODE_ENV=production` y no hay credenciales de S3/R2.

**El feed nunca se cachea en el service worker.** Un feed servido de caché es
peor que uno que no carga: el usuario cree que nadie publicó nada.

**Los puertos no son los de siempre.** Tus otros proyectos ya ocupan 5432-5435 y
6379-6381; además tenías un Postgres en `127.0.0.1:5433` que le ganaba al bind
de Docker en `0.0.0.0` y producía un error de autenticación muy confuso.

## Estado

**Fase 0 completa y Fase 1 funcionando.** Verificado de punta a punta:

- **65 pruebas en verde** (`pnpm test`), typecheck limpio en los 9 workspaces
- Migración aplicada sobre Postgres 17; seed idempotente con 5 escuelas,
  24 departamentos, 52 carreras, 4 colegios y 92 comunidades derivadas
- Flujo OTP probado en navegador: correo no institucional rechazado, código
  correcto acepta, código reusado rechazado, sesión en cookie httpOnly
- Alta de perfil que mete al usuario en sus **5 comunidades automáticas**
- Directorio con búsqueda y filtros por escuela y generación

**Fase 2 funcionando:** feed por comunidades, publicaciones, encuestas con voto
único, reacciones tipo interruptor, página de publicación con comentarios,
moderación previa y service worker instalable.

**Identidad visual completa** con la paleta UDLAP, avatares de iniciales,
tiempos relativos, estados vacíos y esqueletos de carga.

Verificado con **65 pruebas unitarias** y **4 pruebas e2e en Playwright**
(`pnpm e2e`) que recorren el alta completa en un navegador real. `npx playwright
test capturas` regenera las capturas de `capturas/` para revisar el diseño sin
depender de un navegador visible.

**Fases 5 y 6 funcionando** — todo lo que la investigación marcó como
prioritario:

| Pieza | Estado |
|---|---|
| Mensajería directa | ✅ conversación idempotente, no leídos, sondeo cada 5 s |
| Fotos y video | ✅ hasta 4 por publicación, galería adaptativa, video nativo |
| Subida de archivos | ✅ validación por *magic bytes*, disco local en dev / S3 en prod |
| Aventones Puebla–Cholula | ✅ sentido, cuota, lugares, apartar como interruptor |
| Marketplace | ✅ 7 categorías, fotos, apartado/vendido, búsqueda |
| Eventos y fiestas | ✅ 6 tipos, cupo, cooperación, voy / me interesa |
| Layout de 3 columnas | ✅ carriles con comunidades, eventos y gente |

**Mecánicas de hábito y comunidad** — lo que la investigación señaló como lo
que convierte una red de campus en costumbre diaria:

| Pieza | Qué hace |
|---|---|
| **Pregunta del día** | Una pregunta con opciones, distinta cada día. Los resultados **se ocultan hasta responder**: verlos antes sesga la respuesta y quita la razón de tocar algo |
| **Notificaciones** | Campana con contador. **Solo hechos dirigidos**: te comentaron, te reaccionaron, tomaron tu aventón. Nunca "mira lo nuevo del feed" |
| **Cumpleaños** | Quién cumple hoy en tus comunidades. Sin año: sirve para felicitar, no para deducir la edad de nadie |
| **Foto de perfil** | En `/ajustes`, junto con bio y cumpleaños |

La regla de las notificaciones no es purismo: una sola notificación genérica a
la semana ya hace que **10 % las desactive**, y de 2 a 5 semanales el riesgo
sube a **46 %**. Quien las apaga no las vuelve a encender.

**Perfil completo, tipo red social de verdad:**

| Campo | Detalle |
|---|---|
| Portada y foto | Suben por `/media`, misma validación de *magic bytes* |
| Bio, ciudad de origen | Texto libre |
| Instagram | Se limpia lo que pegue el usuario: URL completa, arroba, barra final |
| Intereses | Hasta 10, sin duplicados ni distinción de mayúsculas |
| "Qué busco" | Sale del hallazgo de que buscar equipo es necesidad real sin cubrir |
| Cumpleaños | Mes y día, **sin año** |
| Seguir | `Follow` ya existía en el esquema; ahora está expuesto |
| Cifras | Publicaciones, seguidores, siguiendo |
| Pestañas | Publicaciones e Información |

Las publicaciones de un perfil **solo muestran las de comunidades que compartes
con esa persona**: un perfil no puede ser una puerta trasera al contenido de
otra comunidad.

**Fase 7 — zona pseudónima (`/anonimo`), con las cuatro guardas del plan §1.8:**

| Guarda | Cómo está implementada |
|---|---|
| Anónimo hacia afuera, identificado hacia adentro | El `authorId` real siempre se guarda; la API lo sustituye por el alias **antes** de responder |
| Moderación previa obligatoria | Sin `OPENAI_API_KEY` la zona entera devuelve 503. Es la única parte del producto donde publicar sin filtro no es opción |
| Sin imágenes | No hay subida en esa pantalla: una foto anónima de una persona es la vía directa a la Ley Olimpia, y un clasificador de texto no la ve |
| Alias estable | "Ocelote 772", único por universidad. Da hilo y reputación; el anonimato total de Yik Yak fue lo que lo volvió ingobernable |

Además: tope de **600 caracteres** (un texto largo acumula detalles que
des-anonimizan), reglas visibles antes de escribir, lo anónimo **no aparece** ni
en el feed normal ni en el perfil de su autor, y el panel de moderación **sí
muestra quién escribió** — es la contraparte que hace responsable la zona.

**Visibilidad del perfil:** `UNIVERSIDAD` (por omisión) o `COMUNIDADES`. Con la
restringida, los demás solo ven nombre, carrera y foto. Se resuelve en el
servidor, no filtrando campos en el cliente.

**Onboarding de instalación PWA:** aparece a la tercera visita, no en la
primera. En iOS explica Compartir → Añadir a pantalla de inicio, que es la
única vía y la que casi nadie conoce; en Android usa el prompt nativo.

**Fase 8 — apps nativas:** en curso. La app móvil de **producción** es
`apps/mobile-native` (Kotlin + Jetpack Compose en Android, SwiftUI en iOS),
igual que en NEXARA: 100% nativa, sin WebView, Capacitor ni Expo.

`apps/mobile` (Expo SDK 57) queda como **prototipo** para probar flujos contra
la API durante desarrollo; no es la app de tienda.

### Mobile-native — roadmap de features

Plan maestro por fases: [`docs/super-app-plan.md`](docs/super-app-plan.md).
Matriz pantalla por pantalla: [`docs/native-parity-matrix.md`](docs/native-parity-matrix.md).
Mapa de plataforma: [`docs/architecture.md`](docs/architecture.md).
Comunidad / moderación / ops: [`docs/comunidad.md`](docs/comunidad.md) ·
[`docs/moderacion.md`](docs/moderacion.md) · [`docs/runbook.md`](docs/runbook.md).

| Fase | Alcance | Android | iOS |
|---|---|---|---|
| **0 Fundación** | Login OTP, registro, feed, publicar, eventos, avisos, perfil | ✅ | ✅ core |
| **1 Social core** | NavHost, feed completo, detalle post, DM, perfil ajeno | ✅ | 🟡 (~70 %) |
| **2 Descubrimiento** | Buscar, directorio, hashtags, guardados, pantalla Más | ✅ | ⬜ |
| **3 Marketplace** | Anuncios, aventones, anónimo, detalle evento | ✅ | ⬜ |
| **4 Cuenta + push** | Ajustes, FCM/APNs, moderación staff, legal | ✅ 🟡 FCM prod | ⬜ |
| **5 Wave 5** | iOS hub, seed, FCM prod, offline, analytics | — | en curso |
| **6 Beta** | TestFlight, Play Internal, 50–150 alumnos UDLAP | — | — |

### Comandos mobile-native

```bash
pnpm dev:api                    # API en :4200 (requerido para login)
pnpm mobile:android:preview   # emulador + installDebug + launch (Windows)
pnpm mobile:android:verify    # gradlew :app:assembleDebug sin emulador
```

**Android (Windows):** Android Studio → Open → `apps/mobile-native/android`.

**iOS (Mac):** ver [`apps/mobile-native/ios/README.md`](apps/mobile-native/ios/README.md)
y [`MAC_BUILD_PLAYBOOK.md`](apps/mobile-native/ios/MAC_BUILD_PLAYBOOK.md).

API de desarrollo (emulador Android → PC): `http://10.0.2.2:4200/api`.
Simulador iOS: `http://localhost:4200/api`. Teléfono físico: IP LAN de tu máquina.

Siguiente en código: Wave 5 — paridad iOS (hub + secundarios), seed demo, FCM/APNs
prod, offline básico y analytics. Beta cerrada y cuentas de tienda quedan para
Fase 6.
