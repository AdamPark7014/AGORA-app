# Qué le falta a Ágora — investigación

_Agosto 2026. Fuentes primarias marcadas con **[P]**._

---

## Respuesta corta

Lo que falta **no es más red social, es utilidad**. El feed y el directorio ya están;
lo que convierte una app de campus en hábito es resolver un dolor que hoy cuesta
dinero o tiempo. En la UDLAP ese dolor está documentado y tiene cifras: **el
autobús no corre fines de semana y cuesta $16 por viaje, el estacionamiento pasa
de $1,000 al semestre, y 80 % de la comunidad tiene beca**.

Las tres cosas que más mueven la aguja, en orden:

1. **Aventones Puebla–Cholula** — el único hueco con dolor monetizable y precedente
   mexicano que funcionó (UABC, 400+ conductores).
2. **Mensajería directa** — sin ella el directorio es un catálogo muerto: ves a
   alguien y no puedes escribirle.
3. **Imágenes** — sin fotos no hay marketplace, ni memes, ni evidencia del parcial.

Y una advertencia que la evidencia deja clarísima: **la moderación es el costo
real, no la infraestructura**. Fizz opera con ~15 moderadores por campus. Yik Yak
murió dos veces por esto.

---

## Hallazgos

### 1. Qué convierte una red de campus en hábito diario

**El número que importa: Fizz llegó a 95 % de los ~7,600 licenciados de Stanford,
con 50-60 % de sus usuarios activos *cada día*.** [P] TechCrunch, 4-oct-2022.
En Rice fue 70 %. Eso significa que en su mejor caso, ~52 % del campus entero
abría la app a diario.

Sidechat lleva **tres años entre las cuatro redes más usadas por universitarios
en EE. UU., por encima de TikTok y Snapchat**, con al menos la mitad de los
licenciados activos. Harvard Magazine, 2025.

Lo que tienen en común los que sobreviven:

- **Contenido hiperlocal que no existe en otro lado.** No compiten con Instagram
  por fotos bonitas; ganan porque son el único lugar donde se habla del parcial
  de ayer.
- **Utilidad transaccional además de conversación.** Fizz añadió marketplace
  entre marzo y mayo de 2024 y reportó **50,000 anuncios y 150,000 mensajes
  directos** en los primeros meses. TechCrunch, 3-jul-2024. En sep-2025 se metió
  hasta a entrega de despensa.
- **Velocidad de moderación.** Fizz retira publicaciones en **menos de un minuto
  en promedio**. [P] TechCrunch 2022. Eso no se logra con un cron: se logra con
  gente.

### 2. Tácticas de lanzamiento que funcionaron de verdad

**El lanzamiento es físico, no digital.** Fizz repartió volantes por debajo de las
puertas de los dormitorios de Stanford a las 6 a.m. y regaló donas afuera de
Hameetman; **para la hora de la cena la app había tomado el campus**. En Pepperdine
metieron 1,000 donas y **lo tomaron en tres horas**. Forbes, 18-abr-2025 y
Business of Creators.

Hoy Fizz **no gasta un peso en marketing**: "el producto se difunde de boca en
boca". Su fundador ha visitado personalmente más de 220 campus.

**Tamaño de la red atómica.** Andrew Chen: la primera red atómica es *más chica y
más específica de lo que uno espera* — del orden de **cientos de personas en un
momento concreto**, no un segmento entero. Lenny's Newsletter / *The Cold Start
Problem*.

> **Traducción a la UDLAP:** el objetivo del primer mes **no** son 9,000 usuarios.
> Son ~300-500 personas de un solo nicho denso — Ingeniería en Sistemas más una o
> dos generaciones — con la mayoría publicando. Una red de 300 activos vale más
> que 3,000 registrados que no vuelven.

### 3. Necesidades reales de un estudiante UDLAP, con cifras

Esta es la sección con la evidencia más fuerte, y es toda **[P]** de udlap.mx.

**Transporte** — [P] `online.udlap.mx/servicios/transportes`, otoño 2026:

| Dato | Valor |
|---|---|
| Rutas | 5: Puebla, Circuito, CAPU (Forjadores), Prolongación Reforma, Paseo Bravo |
| Días de servicio | **Lunes a viernes únicamente** |
| Boleto sencillo | **$16.00 MXN** |
| Bono del semestre | **$1,121.00 MXN** (baja $50 por semana transcurrida) |
| Vigencia | 10-ago al 11-dic-2026 |
| Dónde se compra | Solo 3 puntos físicos en campus |

**El servicio no opera sábados ni domingos.** Ese hueco es total: cualquier
actividad de fin de semana — eventos, trabajos en equipo, vida social — no tiene
transporte institucional.

**Estacionamiento** — El Sol de Puebla: el sticker SAO cuesta **más de $1,000 al
semestre**, y sin él son **$17 diarios**. Los alumnos reclamaron que se reinstauró
y subió **sin justificación y avisando solo por correo**, y señalaron que pesa
porque **80 % de la comunidad tiene beca**. _(Nota: la cobertura localizada es de
2022; no encontré confirmación de las tarifas 2025-2026.)_

**Precedente mexicano que sí funcionó:** Hoop Carpool en la UABC Mexicali — piloto
en 2025-1, registro **con correo institucional**, **más de 400 alumnos** dados de
alta como conductores, e incentivo de **estacionamiento preferente**. El Imparcial
y Noro, jun-2025 y ene-2026. La UABC además desarrolla su propia app de carpool.

**Lo que UDLAP Life ya cubre y no hay que tocar:** horario, calificaciones,
kardex, estado de cuenta, menú del comedor, rutas de transporte, control de acceso.

**El hueco real:** nada de eso es social ni transaccional entre alumnos. Comprar,
vender, pedir aventón, buscar equipo, prestar apuntes, organizar algo — todo eso
vive hoy en grupos de WhatsApp sin identidad verificada, sin buscador y sin memoria.

### 4. Notificaciones y retención con Gen Z

Los datos de 2026 son severos y van en contra de lo que hace todo el mundo:

- **67 % prefiere una notificación al día o menos.**
- **Una sola notificación por semana ya hace que 10 % las desactive.**
- **De 2 a 5 por semana → 46 % de riesgo de que las apaguen.**
- **De 6 a 10 por semana → 32 % se da de baja.**
- Las **personalizadas rinden ~4× el CTR** de las genéricas.
- Las apps que **piden permiso con claridad y dejan controlar la frecuencia** tienen
  **30-40 % más opt-in**. MoEngage, Reteno, Sleeknote, MediaPost (2026).

> **Traducción:** una notificación diaria de "mira lo nuevo del feed" es la forma
> más rápida de que apaguen los avisos. Solo notificar lo dirigido: te
> respondieron, te mencionaron, alguien tomó tu aventón, cerró tu encuesta.

**PWA en iOS.** La fricción es real: hay que tocar Compartir → Añadir a pantalla de
inicio, y **la mayoría de la gente no sabe que esa opción existe**. Pero con una
guía explícita en pantalla se reportan **~85 % de instalación** — el instructivo
*es* la superficie de conversión. En Android el navegador ofrece el banner solo.

### 5. Los riesgos que matan estos productos

**Moderación — el asesino número uno.**

- **Yik Yak murió en 2017** tras crecer más rápido de lo que podía moderar:
  amenazas de bomba y raciales en 1,600 escuelas, un alumno de Missouri detenido
  en 2015 por amenazar con matar estudiantes negros. Pasó de **1.8 M de descargas
  en sep-2014 a 125,000 dos años después**. Las universidades lo bloquearon y eso
  cortó el crecimiento de raíz. Failory, EM360, EBSCO.
- **Fizz, hoy, con moderación seria, sigue teniendo víctimas:** en Trinity College
  un estudiante **intentó suicidarse** tras acoso en la app, primavera 2025.
  Trinitonian, 6-nov-2025. En GWU los alumnos dicen que dañó el discurso del
  campus. GW Hatchet, 29-sep-2025.
- **El sistema de Fizz falla por diseño**: ningún moderador puede retirar solo una
  publicación aunque acose o ponga en peligro a alguien — hace falta **mayoría de
  votos** entre moderadores anónimos entre sí. Un moderador renunció tras pedírsele
  publicar 30 veces al día durante un mes. Trinitonian, 2025.
- **Bloqueos institucionales:** NCCU restringió Fizz en 2024, y el sistema UNC
  completo adoptó política contra apps anónimas. Campus Echo.
- **Desinformación en emergencias:** en el falso tiroteo de Claremont del
  13-mar-2025, en Fizz circularon ubicaciones y confirmaciones falsas del atacante.
  The Student Life.

**Escala de moderación necesaria:** Fizz operaba **~15 moderadores pagados por
escuela** en 2022 [P], y para 2024 reportaba **4,000 moderadores voluntarios en 240
campus** (~17 por campus). El modelo cambió de pagado a voluntario, pero el número
por campus **no bajó**.

**Feed vacío.** Ágora ya lo resolvió estructuralmente con comunidades derivadas —
un usuario nuevo nunca ve el feed en blanco. Esa decisión estaba bien tomada.

**Estacionalidad.** El semestre termina el 26-nov y los finales van del 1 al 8-dic.
Después hay ~6 semanas muertas. Una red de campus **no tiene tráfico en vacaciones**,
y esa caída no significa que el producto falle.

### 6. Monetización — la parte incómoda

**Los números de Fizz, que es el mejor caso del sector:**

- **~$4.1 M USD de ingresos estimados en 2024**, valuación $12.2 M. GetLatka
  _(estimación de tercero, no cifra auditada)_.
- Opera en **~240-250 campus**. Eso da **~$17,000 USD por campus al año**.
- Modelo: publicidad. **Un anunciante por día**, en el espacio superior del feed.
  Una app de citas obtuvo **11.5 % de CTR** y subió del puesto ~200 al 40 en la
  App Store. AdExchanger.

> **La cuenta honesta para Ágora:** un solo campus de 9,000 personas, al mejor
> rendimiento conocido del sector, da del orden de **$17,000 USD (~320,000 MXN) al
> año en bruto**. Eso no es una empresa; es un ingreso lateral decente. Y Fizz
> llega a esa cifra con 30 empleados de tiempo completo y publicidad nacional que
> un campus solo no puede vender.

**Viable en una red de 9,000 universitarios mexicanos:**

- **Negocios locales de Cholula y Angelópolis** — bares, cafés, papelerías, rentas
  de cuarto. Es el inventario que sí puedes vender tú, y le sirve al alumno.
- **Comisión sobre marketplace** — solo cuando haya volumen real.
- **Publicaciones patrocinadas de organizaciones estudiantiles** (hay 200+).

**No viable a esta escala:**

- **Suscripción de usuario.** 80 % de la comunidad tiene beca; cobrar por entrar a
  la red social del campus mata la densidad, que es el único activo.
- **Publicidad programática.** 9,000 usuarios no interesan a ninguna red de
  anuncios; el CPM sería ridículo.
- **Venta de datos.** Además de ilegal bajo la nueva LFPDPPP, destruye la
  confianza que es la razón de existir del producto.

---

## Contradicciones y huecos

- **Moderadores de Fizz: ¿pagados o voluntarios?** TechCrunch 2022 dice "~15
  moderadores pagados por escuela"; TechCrunch 2024 dice "4,000 moderadores
  voluntarios" en 240 campus. Probablemente cambiaron el modelo al escalar, pero
  ninguna fuente lo dice explícitamente.
- **Ingresos de Fizz:** los $4.1 M son estimación de GetLatka, no cifra auditada ni
  confirmada por la empresa. Trátalo como orden de magnitud, no como dato.
- **Tarifas de estacionamiento UDLAP:** la cobertura que encontré es de 2022. Las
  cifras de $1,000/semestre y $17/día **no están confirmadas para 2025-2026**.
- **Retención específica de Sidechat y Jodel:** no es pública. Solo hay
  benchmarks genéricos de la industria (4 % de retención a día 30), que no aplican
  a redes cerradas de alta densidad.
- **No encontré comunidad UDLAP en Reddit ni foros abiertos.** Puede significar que
  la conversación vive en WhatsApp e Instagram — lo cual es una oportunidad — o que
  mi búsqueda no llegó. Vale la pena confirmarlo preguntando en el campus.

---

## Qué verificar antes de decidir

1. **Tarifas vigentes de estacionamiento y transporte 2026-2027.** Llamar a
   Servicios Escolares. Todo el argumento de aventones depende de cuánto duele hoy.
2. **Si hay servicio de transporte los fines de semana.** La página oficial dice
   lunes a viernes, pero conviene confirmarlo en la ventanilla.
3. **Cuánta gente de tu generación conmuta y en qué rutas.** Una encuesta de 30
   personas en tu salón vale más que toda esta investigación para decidir si
   aventones es lo primero.
4. **Postura de TI de la UDLAP ante una app estudiantil no oficial.** El precedente
   de UNC y NCCU bloqueando Fizz es real. Vale saber si te van a bloquear el
   dominio antes de invertir un semestre.
5. **Cuántos moderadores puedes conseguir.** Si no consigues 5-10 personas de
   confianza dispuestas a moderar, **no enciendas la zona anónima**. Nunca.

---

## Recomendaciones priorizadas

| # | Qué | Por qué ahora | Esfuerzo |
|---|---|---|---|
| 1 | **Mensajería directa** | Sin ella el directorio es un catálogo muerto: ves a alguien y no puedes escribirle | Alto |
| 2 | **Subida de imágenes** | Bloquea marketplace, memes y evidencia. Es prerequisito de casi todo lo demás | Medio |
| 3 | **Aventones Puebla–Cholula** | Único dolor con cifras duras y precedente mexicano probado. El bus no corre fines de semana | Medio |
| 4 | **Marketplace** | Fizz: 50k anuncios en meses. Da utilidad sin necesitar masa social | Medio |
| 5 | **Panel de moderación** (`apps/admin`) | Hoy la IA marca contenido y **no hay dónde revisarlo**. Es el riesgo que mata productos | Medio |
| 6 | **Onboarding de instalación PWA** | ~85 % de instalación con guía explícita vs. casi nada sin ella | Bajo |
| 7 | **Notificaciones solo dirigidas** | Una al día genérica y apagan los avisos para siempre | Bajo |
| 8 | Zona pseudónima | Solo con moderadores reclutados y panel funcionando | Alto |

**Lo que NO haría:** competir con UDLAP Life en horarios y calificaciones, cobrar
suscripción, o encender lo anónimo antes que el panel de moderación.

---

## Fuentes

**Primarias**
- [P] [Transportes UDLAP — rutas, horarios y costos](https://online.udlap.mx/servicios/transportes/)
- [P] [Estacionamientos UDLAP](https://online.udlap.mx/servicios/estacionamientos.aspx)
- [P] [Fizz en Stanford — 95 % de adopción, moderación, DAU (TechCrunch, oct-2022)](https://techcrunch.com/2022/10/04/fizz-app-college-stanford-social/)
- [P] [Fizz Marketplace (TechCrunch, jul-2024)](https://techcrunch.com/2024/07/03/fizz-the-anonymous-gen-z-social-app-adds-a-marketplace-for-college-students/)
- [P] [Fizz — publicidad para anunciantes](https://fizz.social/advertise)

**Prensa y análisis**
- [Fizz nacional y estrategia de crecimiento (Forbes, abr-2025)](https://www.forbes.com/sites/ianshepherd/2025/04/18/gen-zs-underground-social-network-just-went-national-and-its-blowing-up/)
- [Fizz y publicidad — CTR y modelo (AdExchanger)](https://www.adexchanger.com/marketers/new-social-media-platform-fizz-gives-brands-a-crash-course-in-marketing-to-college-students/)
- [Intento de suicidio tras acoso en Fizz (Trinitonian, nov-2025)](https://trinitonian.com/2025/11/06/fizz-users-cause-crises/)
- [Fizz daña el discurso del campus (GW Hatchet, sep-2025)](https://gwhatchet.com/2025/09/29/anonymous-social-media-app-harms-campus-discourse-students/)
- [NCCU restringe Fizz (Campus Echo)](https://campusecho.com/students-claim-fizz-fuels-bullying-chancellor-dixon-disapproves-of-the-apps-misuse/)
- [Desinformación en el falso tiroteo de Claremont (The Student Life)](https://tsl.news/fizz-social-media/)
- [Sidechat entre las 4 redes más usadas (Harvard Magazine)](https://www.harvardmagazine.com/undergraduate-column/harvard-sidechat-anonymous-social-media-app)
- [Por qué murió Yik Yak (Failory)](https://www.failory.com/cemetery/yik-yak)
- [Yik Yak: cronología y cifras (EM360)](https://em360tech.com/tech-articles/why-did-yik-yak-fail-how-messaging-app-died)
- [Hoop Carpool en UABC — 400+ conductores (El Imparcial)](https://www.elimparcial.com/mxl/mexicali/2025/06/08/mas-de-400-estudiantes-de-la-uabc-se-registraron-para-hacer-carpool/)
- [UABC desarrolla su app de carpool (El Imparcial, ene-2026)](https://www.elimparcial.com/mxl/mexicali/2026/01/28/uabc-desarrolla-aplicacion-de-carpool-para-universitarios/)
- [Quejas por tarifas de estacionamiento UDLAP (El Sol de Puebla)](https://oem.com.mx/elsoldepuebla/local/alumnos-denuncian-tarifas-altas-en-estacionamiento-de-la-udlap-19549798)
- [Red atómica (Lenny's Newsletter)](https://www.lennysnewsletter.com/p/atomic-network)
- [Estadísticas de notificaciones push 2026 (Sleeknote)](https://sleeknote.com/blog/push-notification-statistics)
- [Gen Z y límites en mensajes (MediaPost, mar-2026)](https://www.mediapost.com/publications/article/413980/text-reflex-gen-z-millennials-opt-in-for-message.html)
- [PWA en iOS 2026 — fricción de instalación (MobiLoud)](https://www.mobiloud.com/blog/progressive-web-apps-ios)
- [Ingresos estimados de Fizz (GetLatka)](https://getlatka.com/companies/joinfizz.com)
