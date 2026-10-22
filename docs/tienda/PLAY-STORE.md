# Google Play: ficha de Ágora, campo por campo

App «Ágora UDLAP» (id `4973131523055175748`, paquete `mx.agora.mobile.nativeapp`, cuenta de NEXARA), idioma
predeterminado español (Latinoamérica, es-419). Prueba interna 1.0.0 (1) publicada el 22-10. No hay cuenta de
servicio de la API de Play: todo esto se llena en el navegador (Claude in Chrome con la sesión de Adam).
Lo único que Claude no teclea son las credenciales de la cuenta demo (§4): las pega Adam.

## 1. Ficha principal de Play Store (Crecer → Presencia en Play Store → Ficha principal)

| Campo | Valor |
|---|---|
| Nombre de la app (30) | `titulo.txt` → Ágora UDLAP |
| Descripción breve (80) | `descripcion-corta.txt` |
| Descripción completa (4,000) | `descripcion-completa.txt` |
| Ícono (512 × 512, PNG 32 bits) | `graficos/icono-512.png` |
| Gráfico de funciones (1024 × 500, PNG 24 bits sin alfa) | `graficos/grafico-funciones-1024x500.png` |
| Capturas de teléfono (2 a 8, 9:16) | `capturas/android-telefono/*.png` (1080 × 1920) |
| Capturas de tablet de 7" y 10" | Opcionales; sin ellas la app no sale como «diseñada para tablets» |
| Video | Ninguno |

## 2. Configuración de la tienda (Presencia en Play Store → Configuración de la tienda)

| Campo | Valor |
|---|---|
| Tipo / categoría | App · Social |
| Etiquetas | Redes sociales, Comunidad, Eventos (las que la consola ofrezca más cercanas) |
| Correo electrónico | contacto@zynoratek.com |
| Sitio web | https://udlagora.com |
| Teléfono | Vacío (opcional) |

## 3. Política → Contenido de la app

| Declaración | Respuesta |
|---|---|
| Política de privacidad | https://udlagora.com/privacidad |
| Anuncios | La app **no** contiene anuncios |
| Acceso a la app | **Toda o parte de la funcionalidad está restringida** → §4 |
| Clasificación de contenido | Cuestionario IARC → §5 |
| Público objetivo | **18 años o más** únicamente; no atrae a niños |
| Apps de noticias | No |
| Apps gubernamentales | No |
| Funciones financieras | Ninguna |
| Salud | Ninguna |
| ID de publicidad | **No** usa el ID de publicidad (el manifest no declara `AD_ID`) |
| Seguridad de los datos | §6 |
| Permisos de fotos y videos | No aplica: usa el selector de fotos del sistema, sin `READ_MEDIA_*` |

Permisos del APK (manifest): `INTERNET`, `ACCESS_NETWORK_STATE`, `POST_NOTIFICATIONS`. Nada de ubicación,
contactos, cámara, micrófono ni almacenamiento.

## 4. Acceso a la app (instrucciones para el revisor)

- Nombre de las instrucciones: «Cuenta de revisión».
- Usuario y contraseña: los de `C:\dev\secrets\agora-store\cuenta-revision.txt` (**los pega Adam**).
- Instrucciones (inglés):

  > Only people with a university e-mail (@udlap.mx) can sign up; new accounts verify that mailbox with a
  > one-time code. This review account already has a profile and a password: open the app, tap «Entrar»,
  > type the e-mail and password and you are in. No code is needed.

## 5. Clasificación de contenido (IARC)

Correo para el certificado: contacto@zynoratek.com. Categoría: **Redes sociales, foros, blogs y contenido
compartido por usuarios** (o «Social / Comunicación» si la consola la nombra así).

| Pregunta | Respuesta |
|---|---|
| Violencia, miedo, contenido sexual, drogas, alcohol, tabaco, apuestas | No |
| Lenguaje grosero o humor crudo | Sí, leve (la reacción «no mames» y lo que escriben los usuarios) |
| ¿Los usuarios pueden interactuar o intercambiar contenido? | Sí (publicaciones, comentarios, mensajes directos) |
| ¿Comparte la ubicación del usuario con otros? | No |
| ¿Permite comprar bienes digitales? | No |
| ¿Acceso web sin restricciones? | No |
| ¿Hay forma de reportar y bloquear? | Sí: reportar desde «…» en publicaciones, comentarios, mensajes y perfiles; bloquear y silenciar |

## 6. Seguridad de los datos

Coincide con https://udlagora.com/privacidad y con la etiqueta de Apple (`IOS-APP-STORE.md` §5).

**Descripción general**

| Pregunta | Respuesta |
|---|---|
| ¿Recopila o comparte datos de usuario de los tipos requeridos? | **Sí** |
| ¿Todos los datos se encriptan en tránsito? | **Sí** (HTTPS) |
| ¿Permite crear una cuenta? | **Sí**: nombre de usuario y contraseña (más un código de un solo uso al registrarse) |
| URL para pedir la eliminación de la cuenta | https://udlagora.com/eliminar-cuenta |
| ¿Se puede pedir que se borren datos sin borrar la cuenta? | **Sí**: editar o borrar el perfil y lo publicado desde la app; por correo a contacto@zynoratek.com |
| ¿Se comparten datos con terceros? | **No** (Hetzner, Cloudflare, Brevo, FCM son proveedores que procesan por cuenta de Ágora; Play no lo cuenta como compartir) |
| Revisión de seguridad independiente | No |

**Tipos de datos** (todos: recopilados, no compartidos, sin procesamiento efímero):

| Categoría → tipo | ¿Obligatorio? | Finalidad |
|---|---|---|
| Información personal → Nombre | Obligatorio | Funciones de la app, administración de la cuenta |
| Información personal → Dirección de correo electrónico | Obligatorio | Funciones de la app, administración de la cuenta |
| Información personal → ID de usuario | Obligatorio | Funciones de la app, administración de la cuenta |
| Información personal → Otra información (cumpleaños sin año, carrera, generación, colegio, ciudad, Instagram, intereses) | Opcional | Funciones de la app |
| Fotos y videos → Fotos | Opcional | Funciones de la app |
| Fotos y videos → Videos | Opcional | Funciones de la app |
| Mensajes → Otros mensajes en la app (mensajes directos) | Opcional | Funciones de la app |
| Actividad en la app → Interacciones en la app (seguir, guardar, reaccionar, rachas) | Obligatorio | Funciones de la app, estadísticas |
| Actividad en la app → Otro contenido generado por el usuario (publicaciones, comentarios, eventos, aventones, anuncios) | Opcional | Funciones de la app |
| ID de dispositivo u otros → ID del dispositivo (token de notificaciones de FCM) | Opcional | Funciones de la app |

**No** se recopila: ubicación, información financiera, salud, contactos, calendario, audio, archivos,
historial web, búsquedas, registros de fallos ni diagnósticos de la app Android (no lleva SDK de fallos).

## 7. Después de la ficha

1. **Prueba cerrada:** las cuentas personales creadas después de nov-2023 necesitan 12 testers durante 14 días
   antes de producción. La de NEXARA está a nombre de una organización; si la consola no pide la prueba
   cerrada en «Panel → Producción», se pasa directo de prueba interna a producción.
2. **Producción → Crear versión** con el AAB de «Android · Play» (versionCode mayor) y `notas-version-1.0.0.txt`.
3. Países: México (o todos).
4. Enviar a revisión. La primera revisión tarda de 1 a 7 días.
