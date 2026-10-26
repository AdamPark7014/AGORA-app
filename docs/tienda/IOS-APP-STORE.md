# App Store Connect: ficha de Ágora

App `Ágora UDLAP` (id `6825863471`), bundle `mx.agora.mobile.AgoraApp`, equipo `AHNW9K8745` (cuenta de NEXARA),
idioma principal es-MX. Build en TestFlight: 1.0.0 desde «iOS · TestFlight».

## 1. Lo que sube `scripts/tienda/asc-ficha.py` (hecho el 22-10)

| Campo | Valor |
|---|---|
| Versión | 1.0.0 (la consola la creó como «1.0»; el script la renombró) |
| Nombre / subtítulo | `titulo.txt` / `ios/subtitulo.txt` |
| Descripción, palabras clave, texto promocional | `ios/descripcion.txt`, `ios/palabras-clave.txt`, `ios/texto-promocional.txt` |
| URL de soporte / marketing | https://udlagora.com/soporte · https://udlagora.com |
| URL del aviso de privacidad | https://udlagora.com/privacidad |
| Categorías | Redes sociales (principal) · Estilo de vida (secundaria) |
| Clasificación por edad | §4 |
| Información de revisión | §6 |
| Capturas | `capturas/ios-6.9/*.png` (1320 × 2868) cuando existan; `--sin-capturas` las salta |

Para repetirlo: `py -3 scripts/tienda/asc-ficha.py` (idempotente). `--build N` enlaza una build ya procesada.

## 2. Lo que solo se hace en la consola

1. **Etiqueta de privacidad** (App Privacy): §5, respuesta por respuesta.
2. **Precio y disponibilidad:** gratis; México (o todos los países, da igual: solo entra quien tiene @udlap.mx).
3. **Enlazar la build** si no se usó `--build`, y **Agregar para revisión → Enviar**.
4. Revisar las cuatro pestañas del gestor de capturas (iPhone, iPad, Watch, iMessage): la app es solo iPhone y
   un juego de capturas escondido en iPad tumbó tres envíos de NEXARA.

## 3. Capturas

iPhone 6.9" (1320 × 2868), de 3 a 10, en `capturas/ios-6.9/`. Se toman en el simulador con la API local y el
seed de demo (nunca producción) y se enmarcan con `enmarcar.py --plataforma ios-6.9`. Pedido a la sesión de
móvil el 22-10: que `ios.yml` deje un artefacto con `feed`, `evento`, `aventones`, `mercado`, `mensajes` y
`perfil` en claro y oscuro.

## 4. Clasificación por edad (cuestionario de Apple)

| Pregunta | Respuesta | Por qué |
|---|---|---|
| Groserías o humor crudo | Poco frecuente o leve | La reacción «no mames» y lo que publiquen los estudiantes |
| Todo lo demás de contenido (violencia, sexual, drogas, terror, médico, armas, apuestas simuladas, concursos) | Ninguno | |
| Contenido generado por usuarios | Sí | Feed, comentarios, fotos y video |
| Mensajes y chat | Sí | Mensajes directos |
| Redes sociales | Sí | |
| Acceso web sin restricciones, apuestas, cajas de botín, anuncios, control parental, verificación de edad, salud | No | |
| Ajuste de clasificación | **17+** (18+ en el sistema nuevo) | Chat con desconocidos del campus y zona anónima; Play también va a 18+ |

Resultado verificado por API: `appStoreAgeRating = SEVENTEEN_PLUS`, `ageRatingOverrideV2 = EIGHTEEN_PLUS`.

## 5. Etiqueta de privacidad (App Privacy)

**¿Recopilas datos?** Sí. **¿Rastreo (tracking)?** No, ninguno de estos datos se usa para rastrear ni se
combina con datos de terceros. Coincide con `apps/mobile-native/ios/Resources/PrivacyInfo.xcprivacy` y con
https://udlagora.com/privacidad.

| Tipo de dato (Apple) | Qué es en Ágora | Ligado a la identidad | Finalidad |
|---|---|---|---|
| Información de contacto → Nombre | Nombre y apellidos del perfil | Sí | Funcionalidad de la app |
| Información de contacto → Correo electrónico | Correo @udlap.mx (y personal opcional mientras se confirma el UDLAP) | Sí | Funcionalidad de la app |
| Contenido del usuario → Fotos o videos | Fotos y videos que publica, foto de perfil y portada | Sí | Funcionalidad de la app |
| Contenido del usuario → Otro contenido del usuario | Publicaciones, comentarios, mensajes directos, anuncios, eventos, aventones, encuestas | Sí | Funcionalidad de la app |
| Identificadores → ID de usuario | Id interno y nombre de usuario | Sí | Funcionalidad de la app |
| Identificadores → ID del dispositivo | Token de notificaciones (APNs) | Sí | Funcionalidad de la app |
| Datos de uso → Interacción con el producto | Seguir, guardar, reaccionar, rachas, insignias y eventos de uso que la app manda a `POST /analytics/evento` (entrar, confirmar un evento, publicar) | Sí | Funcionalidad de la app; Analíticas |
| Diagnóstico → Datos de fallos | Mensaje y traza de los cierres inesperados, con la versión, que la app manda a `POST /analytics/crash` con la sesión | Sí | Funcionalidad de la app; Analíticas |
| Otros datos → Otros tipos de datos | Cumpleaños sin año, carrera, generación, colegio, ciudad de origen, Instagram, intereses | Sí | Funcionalidad de la app |

**No** se recopila: ubicación, contactos, salud, finanzas, compras, historial de navegación o de búsqueda,
datos sensibles, audio. La app no tiene anuncios ni SDKs de terceros (el push de iOS va directo a APNs; los
fallos y eventos de uso van a la API propia).

`PrivacyInfo.xcprivacy` declara los fallos como **no** ligados: hay que cambiarlo a ligado (la API los guarda
con el id del usuario) para que coincida con esta tabla. Pedido a la sesión de móvil.

## 6. Información de revisión

- **Cuenta demo:** correo y contraseña de `C:\dev\secrets\agora-store\cuenta-revision.txt`; «Se requiere
  inicio de sesión» marcado. Puestos por API: nunca se escriben en el repo ni en el chat.
- **Contacto:** el mismo de la ficha de NEXARA (copiado por API a `contacto-revision.txt`).
- **Notas:** `ios/notas-revision.txt` (inglés): cómo entrar, qué probar, cumplimiento de 1.2 (términos con cero
  tolerancia al registrarse, reportar, bloquear, revisión de reportes en menos de 24 h, reglas enlazadas) y de
  5.1.1(v) (eliminar cuenta dentro de la app).

## 7. Riesgos de revisión que quedan

| Riesgo | Guía | Estado |
|---|---|---|
| Feed vacío en producción | 2.1 / 4.2 | Hace falta contenido real del equipo antes de enviar |
| Nombre con la marca UDLAP | 5.2.1 (propiedad intelectual) | Aviso de no afiliación en descripción y app; plan B «Ágora · Red del campus» |
| Términos con cero tolerancia al registrarse | 1.2 | Web y Android listos el 22-10; iOS pedido a la sesión de móvil |
| Sin filtro automático de contenido | 1.2 («método para filtrar») | Resuelto el 26-10: filtro previo con Claude encendido en producción (retira las cinco líneas rojas, lo dudoso va a la cola humana), además de reportes en < 24 h |
| Moderación de reportes en 24 h | 1.2 | Es un compromiso con Apple: alguien tiene que revisar la cola de moderación a diario |
