# Ágora · B «Cholula» (capa wow elegida el 28-10-2026)

La sesión principal eligió por Adam («lo que creas más conveniente»): **B · Cholula como base**, con el momento de la
pregunta de A y solo lo de A que ya da la API. C (Inmersivo) no entra. Referencia visual: canvas
`FWFgnBnjxfAT9HTojpUDuU`, filas «Ronda 3 · capa wow», artboards `WowB-*` (cada uno con claro y oscuro lado a lado).
Conserva la estructura de Feed B (§0 de `diseno-d.md`): encabezado, historias, publicación a todo lo ancho, barra
blanca de cinco. iOS y Android usan exactamente lo de este documento.

## 1. Colores

| Token | Claro (cantera) | Oscuro (obsidiana) | Uso |
|---|---|---|---|
| `fondo` | `#F6F0E7` | `#14100D` | fondo de pantalla (inicio incluido; ya no blanco) |
| `superficie` | `#FFFFFF` | `#1E1814` | tarjetas, boleto, píldoras |
| `superficie2` | `#EDE4D6` | `#2A221C` | chips inactivos, cartel neutro |
| `tinta` | `#1B140F` | `#F6F0E7` | texto principal |
| `secundario` | `#6B5D50` | `#C2B4A4` | texto secundario |
| `borde` | `#E2D6C5` | `#3A2F27` | bordes de 1 |
| `naranja` | `#E35205` | `#FF6B26` | marca, terrazas, punto de avisos |
| `boton` / `sobreBoton` | `#B83C0B` / `#FFFFFF` | `#FF7A3D` / `#1A0E07` | Publicar y botones primarios (contraste ≥ 4.5) |
| `naranjaSuave` / `naranjaTinta` | `#FBE6D9` / `#9A3503` | `#2E1A0F` / `#FFB385` | etiquetas, «PREGUNTA DEL DÍA» |
| `talavera` | `#1E3A8A` | `#1E3A8A` | azul Talavera (con texto blanco) |
| `talaveraTexto` | `#1E3A8A` | `#A9C0FF` | azul como texto |
| `adobe` | `#B5400F` | `#B5400F` | rojo adobe (texto blanco) |
| `jade` | `#0F766E` | `#0F766E` | verde jade (texto blanco) |
| `maiz` | `#E0A82E` | `#E0A82E` | amarillo maíz (texto `#1B140F`) |
| `vivo` | `#15803D` | `#22C55E` | en vivo / a tiempo |

## 2. Color por comunidad (catálogo fijo, en las apps)

Por el prefijo del slug: `carrera:` → **talavera**; `generacion:` → **jade**; `colegio:` → **maíz** (texto oscuro);
`universidad:` (toda la UDLAP) → **adobe**; cualquier otro → **jade**. Se usa en: anillo de la historia, punto de la
píldora, sello de la publicación, publicación tipográfica, portada del perfil (la de tu carrera) y destinos de
Publicar. El texto del sello es el nombre corto en mayúsculas (`SISTEMAS`, `GEN 2024`, `CAIN MURRAY`, `TODA LA
UDLAP`): «Ingeniería en Sistemas Computacionales» → `SISTEMAS` (última palabra significativa si es largo; en duda,
el nombre completo truncado).

## 3. Piezas

- **Talavera**: azulejo de 28×28 (flor de cuatro pétalos azul `#2347A6` sobre blanco, esquinas en triángulo, punto
  central). Franja de 10 de alto bajo el encabezado del inicio y de Mercado; portada del perfil (azul sobre azul
  `#1E3A8A`/`#3557B8`); esquina de la publicación tipográfica; bordes de la «postal».
- **Terrazas**: silueta escalonada de la pirámide (3–4 niveles). Logo junto a «Ágora», marca de pestaña activa (22×6
  bajo el ícono), base del avatar del perfil, motivo de los carteles.
- **Sello**: rectángulo redondeado 8, mayúsculas 12 bold con 0.04em, color de la comunidad.
- **Barra**: la de Feed B, pero Publicar es un rectángulo **relleno** `boton` 52×38 radio 12 con «+» `sobreBoton`, y
  la pestaña activa lleva las terrazas naranjas abajo.
- **Encabezado del inicio**: terrazas naranjas 30×20 + «Ágora» Bricolage 800 28 en `tinta` + debajo la fecha («Miércoles
  28 de octubre»; **sin** «semana 12» hasta que exista la API). A la derecha Avisos (punto) y Mensajes (número).
- **Historias**: cuadrado redondeado 64 radio 18 con la portada, anillo de 4 en el color de la comunidad (3 en `borde`
  si ya se vio) y terrazas del mismo color abajo al centro. «Tu historia»: punteado.
- **Píldoras**: radio 10, con un cuadrito de 8 del color de la comunidad; activa en `tinta`.
- **Boleto de la pregunta (de A)**: tarjeta `superficie` radio 18 con sombra; a la izquierda «PREGUNTA DEL DÍA» +
  pregunta Bricolage 800 19 + opciones 2×2; a la derecha un talón `talavera` de 88 con borde punteado, muescas
  arriba/abajo del color de fondo, «QUEDAN» + `m:ss` Bricolage 800 28 + «a tiempo». Al contestar: barras con la
  mía en naranja y el revelado «Sistemas votó X % … · el campus Y %» (`pregunta/hoy` → `miCarrera`). Esperando:
  «Hoy cae a una hora sorpresa» en el mismo boleto, talón con «HOY» y un reloj.
- **Publicación con foto**: la de Feed B + el sello de la comunidad junto al nombre. **Sin foto**: tarjeta tipográfica
  radio 22 en el color de la comunidad, texto Bricolage 800 26 blanco, esquina de Talavera arriba a la derecha,
  hashtags/«Ver las N respuestas» en `#C9D6FF`; acciones como chips («Me late 18», «Me río 4», «Apoyo 9»).

## 4. Pantallas (ver `WowB-*`)

- **Inicio** (`WowB-Inicio`): encabezado + franja Talavera + historias + píldoras + boleto + publicaciones.
- **Eventos** (`WowB-Eventos`): «Cartelera». Cartel grande para el próximo (o el de hoy con **cuenta regresiva**, de
  A) con día y número gigantes, título, lugar, precio y «N van» (sin «9 de Sistemas»), terrazas de motivo; abajo
  rejilla 2×N de carteles. Color por tipo: FIESTA adobe, DEPORTIVO talavera, CULTURAL jade, ACADEMICO maíz,
  ORGANIZACION/OTRO `superficie2`.
- **Perfil** (`WowB-Perfil`): portada Talavera en el color de tu carrera, avatar 92 con terrazas debajo, nombre
  Bricolage 28, sellos de comunidades, **Sellos** (racha y «a tiempo» de `gamificacion/mio`; insignias que ya
  existan), números, rejilla de 3 con fotos.
- **Primer arranque** (`WowB-Arranque`): «Sube a tu campus»: pirámide de escalones (correo UDLAP ✓, carrera ✓,
  colegio, avisos) que se llenan al avanzar; el último escalón pide el permiso de avisos.
- **Resto** (`WowB-Mercado`, `-Mensajes`, `-Avisos`, `-Aventones`, `-Entrada`, `-Ajustes`): Mercado «El tianguis del
  campus» con etiqueta de precio adobe girada; avisos con sellos por tipo y **agrupados en el cliente**; aventones
  como boletos; entrada con la pirámide; ajustes con «Apariencia: Cantera / Obsidiana / Sistema»; vacíos con
  acciones y aviso de sin conexión.
- **Clip** (`WowB-Clip`): sello redondo de la comunidad y progreso en escalones; sin lugar ni vistas.

## 5. Fuera hasta que exista la API (no se inventa ni se deja hueco)

Presencia («214 en el campus»), «X de tu carrera ya contestaron / van / les late / vieron», notas sobre historias,
«escribiendo…», lugar y vistas de clips, semana del semestre, tiempo de respuesta del vendedor. En la app se quita el
elemento; no va un número de relleno.
