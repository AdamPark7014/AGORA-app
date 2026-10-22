# Google Play: subir Ágora para Android

Estado al 22-10-2026: la app **«Ágora UDLAP» ya existe** en Play Console (cuenta de NEXARA,
«New Engineering Expertise And Resource Advancement»; id de app `4973131523055175748`) y la
versión **1 (1.0.0)** de **Prueba interna** está creada con el bundle subido y notas en es-419,
detenida en «Revisar y confirmar»: falta el clic de Adam en **Guardar y publicar** (a Claude se lo
bloquea su clasificador de permisos). Advertencias aceptables: sin testers todavía, sin archivo de
desofuscación y sin símbolos nativos.

**Por qué se subió `agora-1.0.0-play.aab` y no `app-release.aab`:** el bundle de Gradle lleva dentro el
mapa de R8 (80 MB sin comprimir, ~6 MB comprimido) y pasaba el tope de 10 MB de la herramienta de
subida del navegador. Se hizo una copia sin
`BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map`, vuelta a firmar con `jarsigner`
y la llave de subida (4.8 MB, `jar verified`). Para ver trazas legibles en Android vitals, subir
`app/build/outputs/mapping/release/mapping.txt` en App bundle explorer → versión 1 → Archivos de
desofuscación. Las siguientes subidas van por `android-play.yml` (API, sin tope) y llevan el mapa.

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
   - Categoría: Social. Correo de contacto: `contacto@zynoratek.com`.
4. **Ficha de la tienda** (textos abajo; gráficos: ícono 512×512 = `apps/web/public/icono-512.png`,
   gráfico de función 1024×500 por hacer a partir de `og.png`, capturas de teléfono por tomar
   del emulador `nexara_phone`).
5. Enviar la versión interna, probarla en un teléfono, y promover a producción cuando Adam quiera.

## Textos de la ficha

Viven en [`tienda/`](tienda/README.md): `titulo.txt`, `descripcion-corta.txt`, `descripcion-completa.txt` y
`notas-version-1.0.0.txt`, con los gráficos en `tienda/graficos/` y las respuestas de «Contenido de la app»
(Seguridad de los datos, IARC, acceso, público) en [`tienda/PLAY-STORE.md`](tienda/PLAY-STORE.md).
