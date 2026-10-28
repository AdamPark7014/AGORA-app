# Fichas de tienda de Ágora (App Store y Google Play)

Todo lo que piden las dos tiendas para publicar Ágora, en un solo lugar. Los `.txt` son el texto exacto que va
en cada campo (sin el salto de línea final); los PNG, los gráficos ya al tamaño de cada tienda. El proceso de
publicación (secretos, flujos de GitHub Actions, primera subida) está en [`../store/README.md`](../store/README.md)
y [`../PLAY_STORE.md`](../PLAY_STORE.md).

**Estado al 22-10-2026**
- **App Store Connect ya tiene** nombre, subtítulo, descripción, palabras clave, texto promocional, URLs,
  categorías, clasificación por edad (17+ / 18+) e información de revisión con la cuenta demo, subidos por API
  con `scripts/tienda/asc-ficha.py`. Falta: capturas de iPhone, etiqueta de privacidad (§5 de
  [`IOS-APP-STORE.md`](IOS-APP-STORE.md), solo se llena en la consola) y enlazar la build.
- **Play Console** se llena por navegador (no hay cuenta de servicio): campo por campo en
  [`PLAY-STORE.md`](PLAY-STORE.md).
- **Antes de mandar a revisión:** producción tiene 0 publicaciones. Un revisor que entra a un feed vacío puede
  rechazar por app incompleta; hace falta contenido real del equipo (bienvenida, eventos reales del campus).

| Documento | Para qué |
|---|---|
| [`IOS-APP-STORE.md`](IOS-APP-STORE.md) | App Store Connect: qué subió el script, edad, etiqueta de privacidad respuesta por respuesta, revisión, pendientes |
| [`PLAY-STORE.md`](PLAY-STORE.md) | Play Console: ficha campo por campo, Seguridad de los datos, clasificación IARC, público, acceso, anuncios y demás declaraciones |
| `graficos/` | `icono-512.png` (Play), `icono-1024.png` (sin alfa, el mismo de la app), `grafico-funciones-1024x500.png` (Play) |
| `capturas/<plataforma>/` | Capturas enmarcadas que se suben (las genera `scripts/tienda/enmarcar.py`) |
| `scripts/tienda/` | `asc-ficha.py` (ficha de iOS por API), `iconos-tienda.py`, `grafico-funciones.py`, `enmarcar.py` + `capturas-plan.json`, `marca.py` (colores y fuente) |

## Campos y límites

| Archivo | Campo | Límite | Hoy |
|---|---|---|---|
| `titulo.txt` | Nombre de la app (las dos tiendas) | 30 | 11 |
| `descripcion-corta.txt` | Play: descripción breve | 80 | 77 |
| `descripcion-completa.txt` | Play: descripción completa | 4,000 | ~1,690 |
| `notas-version-1.0.0.txt` | Play: novedades de la versión | 500 | 334 |
| `ios/subtitulo.txt` | App Store: subtítulo | 30 | 28 |
| `ios/texto-promocional.txt` | App Store: texto promocional | 170 | 151 |
| `ios/descripcion.txt` | App Store: descripción (hoy igual a la de Play) | 4,000 | ~1,690 |
| `ios/palabras-clave.txt` | App Store: palabras clave, por comas y sin espacios | 100 | 100 |
| `ios/notas-revision.txt` | App Store: notas para la revisión (inglés) | 4,000 | ~1,890 |

`asc-ficha.py` vuelve a medir los de iOS antes de subir y se niega si alguno pasa el límite o menciona Android.

## URLs públicas

| Qué | URL |
|---|---|
| Sitio | https://udlagora.com |
| Aviso de privacidad | https://udlagora.com/privacidad |
| Soporte | https://udlagora.com/soporte |
| Eliminar la cuenta (Play lo pide aparte) | https://udlagora.com/eliminar-cuenta |
| Términos / Reglas | https://udlagora.com/terminos · https://udlagora.com/reglas |
| Correo de contacto | contacto@zynoratek.com (buzón de Zynora Tek; udlagora.com no tiene MX) |

## Cuenta de revisión

Apple y Google entran con una cuenta real de producción creada para eso el 22-10: `@revision_tiendas`,
miembro solo de la plaza del campus, visibilidad COMUNIDADES, bio que dice que no es una persona. El correo y
la contraseña viven **solo** en `C:\dev\secrets\agora-store\cuenta-revision.txt` (fuera del repo, que es
público). En App Store Connect ya están puestos por API; en Play Console los pega Adam en «Acceso a la app».
Si los revisores publican algo de prueba, aparece en la plaza: se puede retirar desde moderación.

## Cuenta oficial @agora y contenido de bienvenida

Opción b de Adam (28-10): la cuenta del equipo, `@agora` («Ágora»), publica la bienvenida para que el inicio
de una cuenta nueva no salga vacío, sin hacerse pasar por estudiantes. En la plaza del campus quedan la
bienvenida, un clip, una encuesta, «Qué hay en Ágora» (tres fotos) y las cinco líneas rojas, además del evento
en línea «Semana de bienvenida en Ágora» (29-10 al 7-11). Todo sale de `scripts/bienvenida/`: `generar.py`
dibuja las fotos y el clip con la marca, `crear-cuenta-oficial.mjs` crea la cuenta y `publicar.py` publica por
la API (no repite nada si @agora ya publicó). El correo es un @udlap.mx que nadie recibe, así que solo se entra
con la contraseña; los dos viven **solo** en `C:\dev\secrets\agora-store\cuenta-oficial.txt`. La cuenta no tiene
rol de staff, así que no lleva insignia de verificada. `ios-capturas.yml` repite esta bienvenida en CI y captura
el inicio que ve una cuenta nueva (`inicio-bienvenida`).

## Reglas del texto

- Español de México, tuteo, sin exclamaciones ni «gratis», «mejor», «#1», «nuevo» en título o descripción breve.
- Nada que prometa lo que la app no hace. Ejemplo real: hasta el 26-10 la ficha y las notas no decían que un
  filtro automático revisa cada publicación, porque producción no lo tenía. Desde el 26-10 sí lo tiene (Claude
  por la puerta única: retira las cinco líneas rojas y manda lo dudoso a la cola), así que ya se puede decir.
- Siempre el aviso de no afiliación a la UDLAP. El nombre «Ágora UDLAP» usa la marca de la universidad: si
  Apple o Google lo objetan (suplantación / propiedad intelectual), el plan B es «Ágora · Red del campus».
- La sección de privacidad de la descripción, el aviso público, `PrivacyInfo.xcprivacy` y las respuestas de
  Seguridad de los datos y de la etiqueta de Apple dicen lo mismo. Si la app empieza a recoger algo nuevo,
  cambian todos en el mismo commit.

## Regenerar gráficos y capturas

```
py -3 scripts/tienda/iconos-tienda.py
py -3 scripts/tienda/grafico-funciones.py
py -3 scripts/tienda/enmarcar.py --plataforma android-telefono --entrada <carpeta con las capturas crudas>
py -3 scripts/tienda/enmarcar.py --plataforma ios-6.9 --entrada <carpeta con las capturas crudas>
py -3 scripts/tienda/asc-ficha.py            # sube textos y capturas de iOS
```

Las capturas se toman con **datos de demo locales** (API local + seed), nunca de producción: ahí hay datos de
estudiantes reales.
