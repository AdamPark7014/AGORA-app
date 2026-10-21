# Google Play: subir Ágora para Android

Estado al 21-10-2026: hay AAB de release firmado y Firebase/FCM real; falta crear la app en
Play Console y subir el AAB (lo hace Adam a mano: la cuenta de desarrollador es la de NEXARA,
«New Engineering Expertise And Resource Advancement», y el archivo pesa más de lo que la
herramienta de subida de Claude admite).

## Archivos

| Qué | Dónde |
|-----|-------|
| AAB firmado | `apps/mobile-native/android/app/build/outputs/bundle/release/app-release.aab` (`.\gradlew.bat :app:bundleRelease`) |
| Llave de subida | `apps/mobile-native/keystore/agora-release.jks` (fuera de git). **Respaldar en OneDrive.** Contraseña en `apps/mobile-native/android/local.properties` (fuera de git). Alias `agora`. |
| Huella SHA-256 de la llave | `66:76:DE:C7:6D:B6:75:78:56:3E:69:B3:C9:C0:BA:A9:4D:89:97:BE:A4:E3:D8:AA:38:18:A6:51:70:16:75:C5` |
| Firebase | Proyecto `agora-udlap`, app Android `mx.agora.mobile.nativeapp`; `google-services.json` real versionado en `apps/mobile-native/android/app/` |

Play App Signing custodia la llave de firma; la de subida se puede restablecer desde la consola si se pierde.

## Pasos en Play Console

1. **Crear app**: nombre «Ágora UDLAP», idioma predeterminado español (México), tipo App, gratis.
   Declaraciones: cumple las políticas del programa y las leyes de exportación de EE. UU.
2. **Pruebas → Pruebas internas → Crear versión**: subir `app-release.aab`, nombre de versión
   `1.0.0 (1)`. La primera subida activa Play App Signing (aceptar).
3. **Configurar la app** (panel «Configura tu app»):
   - Política de privacidad: `https://udlagora.com/privacidad`
   - Acceso a la app: **con restricciones** (requiere correo @udlap.mx). Instrucciones para el
     revisor: «Solo entra quien tiene correo @udlap.mx. Para revisar, usar la cuenta de prueba
     que se indique» → crear una cuenta de prueba con contraseña antes de enviar a revisión.
   - Anuncios: no contiene anuncios.
   - Clasificación de contenido: cuestionario IARC, categoría «Red social / Comunicación»;
     contenido generado por usuarios: sí, con moderación y reporte.
   - Público objetivo: 18+ (universitarios); no dirigida a niños.
   - Apps de noticias: no. COVID: no. Seguridad de los datos: recopila correo, nombre y foto de
     perfil, contenido generado, identificadores de dispositivo (token push); cifrado en tránsito;
     el usuario puede pedir la eliminación desde Ajustes → Eliminar mi cuenta.
   - Categoría: Social. Correo de contacto: `contacto@udlagora.com`.
4. **Ficha de la tienda** (textos abajo; gráficos: ícono 512×512 = `apps/web/public/icono-512.png`,
   gráfico de función 1024×500 por hacer a partir de `og.png`, capturas de teléfono por tomar
   del emulador `nexara_phone`).
5. Enviar la versión interna, probarla en un teléfono, y promover a producción cuando Adam quiera.

## Textos de la ficha

**Nombre:** Ágora UDLAP

**Descripción breve (80):** La red social de la comunidad UDLAP. Solo con correo @udlap.mx.

**Descripción completa:**

Ágora es la red de la comunidad UDLAP: entras con tu correo @udlap.mx y caes directo en las
comunidades de tu escuela, tu carrera, tu generación y tu colegio.

• Feed del campus y de tus comunidades, con publicaciones, encuestas, fotos y video.
• Pregunta del día a hora sorpresa, rachas e insignias.
• Mensajes directos, eventos, aventones y marketplace entre estudiantes.
• Zona anónima con reglas claras y moderación.
• Perfil con la visibilidad que tú decides.

Verificamos el correo institucional una sola vez al crear la cuenta; después entras con tu
contraseña. Ágora es un proyecto independiente hecho por estudiantes y no está afiliada a la
Universidad de las Américas Puebla.
