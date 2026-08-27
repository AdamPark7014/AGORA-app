# Estándares de interfaz — investigación y plan de aplicación

_Agosto 2026. Fuentes primarias marcadas con **[P]**._

---

## Respuesta corta

La interfaz de Ágora ya es limpia, pero **falla tres cosas que ninguna red grande
falla**, y una de ellas es un incumplimiento de accesibilidad medible:

1. **En teléfono no hay navegación.** Debajo de 860 px se oculta el carril
   izquierdo y no lo reemplaza nada. Ningún producto real hace esto: todos usan
   barra inferior de 3 a 5 destinos.
2. **Áreas táctiles por debajo del mínimo.** El botón de quitar miniatura mide
   22×22 px; **WCAG 2.2 AA exige 24×24** y Apple recomienda 44×44.
3. **Se carga una tipografía que no se usa.** Fraunces sigue en el `layout` pero
   el CSS reescrito ya no la referencia: son bytes que empeoran el LCP a cambio
   de nada.

Lo demás son mejoras de grado, no defectos.

---

## Hallazgos

### 1. Medidas concretas

| Medida | Valor | Fuente |
|---|---|---|
| Objetivo táctil mínimo | **24×24 px CSS**, nivel **AA** (SC 2.5.8) | **[P]** W3C WCAG 2.2 |
| Objetivo táctil recomendado | **44×44 pt** | Apple HIG |
| Contraste texto normal | **4.5:1** | **[P]** W3C, SC 1.4.3 |
| Contraste texto grande (≥24 px, o ≥18.66 px en negrita) | **3:1** | **[P]** W3C |
| Contraste de componentes de interfaz y anillos de foco | **3:1** (SC 1.4.11) | **[P]** W3C |
| Grosor del indicador de foco | **≥2 px** con **3:1** entre estado enfocado y no enfocado | **[P]** W3C, SC 2.4.13 |

WCAG 2.2 admite excepciones al tamaño táctil: si un círculo de 24 px centrado en
cada objetivo no toca otro objetivo, el control puede ser menor. Es una salida
válida para iconos apretados, pero no para un botón suelto.

> **Contra Ágora:** `.miniatura-quitar` mide 22×22 px y está pegado a la esquina
> de la miniatura. No cumple ni por tamaño ni por separación.

### 2. Navegación móvil

**Material Design 3** es explícito: la barra de navegación lleva **de 3 a 5
destinos**. Menos de tres, usa pestañas; más de cinco, no.

En iOS la `UITabBar` estándar mide **390×49 pt con iconos de 25×25 pt**, y esa
altura es justo la que sostiene el mínimo de 44 pt de Apple.

> **Contra Ágora:** hoy el móvil se queda **sin ninguna navegación**. El menú
> tiene 8 destinos, así que la barra inferior debe llevar los 4 o 5 principales
> y el resto pasa a "Más".

### 3. Patrones de feed

**NN/g**: el scroll infinito encaja en sitios de estructura plana donde el
contenido fluye y todo es igual de relevante — **redes sociales, exactamente**.
Un estudio en *Information Systems Journal* halló que incluso una interrupción
corta, como pulsar "Siguiente", basta para que el usuario cambie de tarea.

Pero NN/g y Baymard coinciden en su punto débil: **rompe el regreso**. Quien
vuelve atrás pierde el sitio, y no se puede enlazar una posición.

NN/g propone tres alternativas: **botón de cargar más**, paginación integrada en
el scroll, y páginas tradicionales.

> **Veredicto para Ágora:** botón "Cargar más". El feed hoy trae 20
> publicaciones y **se acaba sin decir nada** — ni carga más ni avisa de que hay
> más. Es el peor de los tres mundos.

**Esqueleto contra girador:** los esqueletos hacen percibir la carga entre **20 y
30 % más rápida** y reducen el rebote entre **9 y 20 %** aun sin cambiar el
tiempo real. La regla práctica: **nada de 0 a 300 ms** (nadie percibe ese
retraso), girador para acciones cortas, esqueleto para contenido.

### 4. Rendimiento — Core Web Vitals

**[P]** web.dev, actualizado 31-oct-2024. Se miden en el **percentil 75**,
separando móvil de escritorio:

| Métrica | Bueno |
|---|---|
| LCP | **≤ 2.5 s** |
| INP | **≤ 200 ms** |
| CLS | **≤ 0.1** |

**INP sustituyó definitivamente a FID** en 2024.

**`content-visibility: auto`** permite al navegador saltarse el renderizado de lo
que está fuera de pantalla. El artículo de web.dev reporta **7× de mejora: de
232 ms a 30 ms**. Requiere `contain-intrinsic-size`, porque sin él los elementos
ocultos miden cero y **la barra de desplazamiento salta**. **[P]** web.dev

> **Para Ágora:** es la técnica de mayor rendimiento por línea escrita en un
> feed largo, y son dos propiedades CSS.

### 5. Lo que hace que una interfaz se sienta amateur

Coinciden todas las fuentes:

- **Espaciado y tamaños inconsistentes** — el delator número uno. La solución es
  una escala, no ojo.
- **Tres o más tipografías.** El estándar es **máximo dos**: una para títulos y
  otra para texto, y la jerarquía se logra con peso, tamaño y color dentro de
  esas familias.
- **Jerarquía débil**: títulos de tamaño parecido y pesos inconsistentes.
- **Espacio en blanco insuficiente alrededor de los títulos.**

---

## Plan de aplicación, priorizado

| # | Qué | Por qué | Impacto |
|---|---|---|---|
| 1 | **Barra inferior en móvil**, 5 destinos + "Más" | Hoy el teléfono no tiene navegación | Crítico |
| 2 | **Áreas táctiles ≥44 px**; arreglar el botón de 22 px | Incumple WCAG 2.2 AA | Crítico |
| 3 | **Quitar la fuente cargada y sin usar** | Bytes que empeoran el LCP a cambio de nada | Alto |
| 4 | **Escala tipográfica explícita** en tokens | Es el delator de amateurismo número uno | Alto |
| 5 | **`content-visibility` + `contain-intrinsic-size`** en tarjetas del feed | 7× reportado, dos líneas de CSS | Alto |
| 6 | **`aspect-ratio` en toda imagen** | CLS ≤ 0.1 | Alto |
| 7 | **Botón "Cargar más"** | El feed hoy se corta en silencio | Alto |
| 8 | **Foco visible en enlaces**, no solo en botones | SC 2.4.13: 2 px y 3:1 | Medio |
| 9 | **Nada de girador antes de 300 ms** | Evita el parpadeo en cargas rápidas | Medio |

---

## Contradicciones y huecos

- **Las medidas de Instagram, X y Reddit no son públicas.** Nadie publica su
  ancho de feed ni su escala tipográfica. Lo que sí es verificable son los
  estándares de plataforma (Material, HIG) y las normas (WCAG); el resto sería
  medir capturas, que no es fuente.
- **La cifra de "20-30 % más rápido" de los esqueletos** viene de blogs de
  diseño que citan un estudio de 2018 en ResearchGate. No pude verificar la
  metodología del original; trátala como orden de magnitud.
- **Focus Appearance (2.4.13) es AAA, no AA.** El requisito AA aplicable es
  2.4.11 *Focus Not Obscured*. Aun así, 2 px y 3:1 es el estándar de facto y
  cuesta lo mismo cumplirlo.

## Fuentes

**Primarias**
- [P] [Core Web Vitals — web.dev](https://web.dev/articles/vitals)
- [P] [content-visibility — web.dev](https://web.dev/articles/content-visibility)
- [P] [WCAG 2.2 — Target Size (Minimum), SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [P] [WCAG 2.2 — Focus Appearance, SC 2.4.13](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html)
- [Material Design 3 — Navigation bar](https://m3.material.io/components/navigation-bar/guidelines)

**Análisis**
- [NN/g — Infinite Scrolling: When to Use It, When to Avoid It](https://www.nngroup.com/articles/infinite-scrolling-tips/)
- [NN/g — 3 alternativas al scroll infinito](https://www.nngroup.com/videos/alternatives-to-infinite-scrolling/)
- [WebAIM — Contrast and Color Accessibility](https://webaim.org/articles/contrast/)
- [Esqueletos contra giradores](https://www.onething.design/post/skeleton-screens-vs-loading-spinners)
- [20 errores de tipografía en diseño de interfaz](https://supercharge.design/blog/20-common-typography-mistakes-in-ui-design)
