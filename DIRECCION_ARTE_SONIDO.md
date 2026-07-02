# PAMPA STAR — Dirección de arte y sonido: alternativas

> Investigación y curaduría para decidir la dirección estética. NO es integración:
> nada de esto toca el index.html. Regla dura de todo el documento: solo material
> de uso legal y libre (CC0, royalty-free o CC-BY con atribución permitida para
> uso público e institucional). Nada con copyright, nada de Tecmo/Captain Tsubasa,
> nada de procedencia dudosa. Verificado el 2026-07-02; las licencias pueden
> cambiar: re-chequear la página de licencia al momento de bajar cualquier cosa.

---

# SONIDO

## Opción A — Chiptune enriquecido (evolución de lo actual)

**Cómo suena.** Sigue siendo 8-bit generado por código (WebAudio, sin archivos),
pero deja de sonar a "beep de prueba" y pasa a sonar a *banda sonora* de NES
tardía: esas bandas sonoras épicas se lograban con 4 canales bien usados, no
con más tecnología. Concretamente:

- **Más capas:** hoy hay 2–3 voces (bajo triángulo + melodía cuadrada + hat).
  Un tema épico usa 5–6: dos cuadradas en armonía (terceras/quintas), triángulo
  de bajo, arpegio rápido que simula acordes (el truco clásico de la época),
  percusión de ruido con dos timbres, y eco fingido (repetir la nota a menor
  volumen 90ms después: profundidad sin reverb).
- **Temas por momento, con leitmotiv:** un motivo de 4–6 notas de PAMPA STAR
  que aparezca en todos lados: lento y solemne en el ascenso, a doble tempo en
  los últimos minutos, en tono mayor triunfal en el Mundial. Eso es lo que hace
  "épico" a un chiptune: la memoria melódica, no el timbre.
- **Música adaptativa por capas:** el mismo tema suma pistas según el contexto
  (posesión = base; entrás al área = se suma la segunda cuadrada; mano a mano =
  percusión doble). Con WebAudio es barato: son GainNodes que se abren y cierran.
- **Momentos grandes:** fanfarrias compuestas (8–12 segundos, no loops) para
  campeonato, ascenso, debut en el Mundial, con silencio dramático previo
  (cortar TODO 400ms antes del acorde final: el truco emocional más barato que
  existe).

**Trabajo.** Medio: es composición, no programación nueva (el motor de
secuenciador ya existe en el proyecto). Estimado: 6–10 temas cortos + 4
fanfarrias. El costo es tiempo de iterar melodías, no código.

**Licencia.** Perfecta por definición: todo generado por código propio,
100% original, cero dependencias, cero archivos. Peso agregado al juego: 0 KB.

## Opción B — Épico / cinematográfico (archivos de audio)

**Cómo suena.** Orquesta, coros, percusión grande, hinchada real. El gol se
festeja con una oleada de multitud sampleada y un stinger orquestal. Requiere
archivos (MP3/OGG), preloading, y manejo de peso (un loop orquestal de 2 min
en OGG decente ≈ 2–4 MB; el juego hoy pesa ~60 KB — multiplicás el peso ×100,
relevante en celular con datos).

**Bancos verificados, con licencia exacta:**

| Fuente | Qué tiene | Licencia (verificada) | Condición |
|---|---|---|---|
| [OpenGameArt — colección CC0 Cinematic Music](https://opengameart.org/content/cc0-cinematic-music) y [CC0 Music](https://opengameart.org/content/cc0-music-0) | Loops orquestales épicos (ej. [Battle March](https://opengameart.org/content/battle-march-epic-orchestral-music-loop)) | **CC0** | Ninguna. Filtrar SIEMPRE por CC0 en el buscador; OGA mezcla licencias |
| [Freesound](https://freesound.org) | SFX: hinchadas, estadios, silbatos, pelotazos reales | **Mixta: filtrar por CC0** | El buscador tiene filtro de licencia. CC0 = sin condiciones; CC-BY = citar autor. Evitar los CC-BY-NC |
| [Pixabay Audio](https://pixabay.com/music/) | Música épica y SFX, catálogo enorme | **Pixabay Content License** ([resumen](https://pixabay.com/service/license-summary/)) | Uso comercial permitido, sin atribución. No se puede redistribuir el archivo suelto ni reclamar autoría. Ver FAQ por casos borde |
| [Incompetech (Kevin MacLeod)](https://incompetech.com/music/royalty-free/licenses/) | 2000+ temas, mucho épico/cinemático | **CC-BY 4.0** | Atribución OBLIGATORIA con formato exacto: `"Título" Kevin MacLeod (incompetech.com) — CC BY 4.0`. Válido para uso público e institucional. Alternativa: pagar licencia sin atribución (USD 30/tema) |
| [Sonniss GDC Bundles](https://sonniss.com/gameaudiogdc/) | GB de SFX profesionales de estudios reales | **Royalty-free propia** ([licencia](https://sonniss.com/gdc-bundle-license/)) | Uso comercial ilimitado, sin atribución. NO revender los sonidos sueltos. Calidad muy superior al promedio libre |
| FreePD | Era el mejor banco CC0 de música | **CC0**, pero **el sitio cerró** | El catálogo sobrevive en [Internet Archive](https://archive.org/details/freepd) y [GitHub](https://github.com/0lhi/FreePD). Sigue siendo CC0 legal |

**Qué NO usar:** Bensound y similares (los "free" exigen su licencia paga para
la mayoría de los usos), YouTube Audio Library (términos atados a YouTube),
Uppbeat (modelo de créditos/suscripción con condiciones), cualquier "OST rip"
o cover del tema de Captain Tsubasa (el arreglo también tiene copyright), y
cualquier pack sin página de licencia explícita (procedencia dudosa = afuera).

**Trabajo.** Medio-alto: curar (escuchar mucho para encontrar coherencia entre
pistas de autores distintos — el riesgo n°1 de esta opción es que suene a
collage), normalizar volúmenes, recortar loops, armar el preloader y el manejo
de datos móviles. Y mantener un archivo `CREDITOS.md` si entra algo CC-BY.

## Opción híbrida (A+B) — la que más rinde

Chiptune enriquecido como identidad base + **samples solo para lo que el
chiptune no puede hacer: la multitud**. Una hinchada real CC0 (Freesound) bajo
el gol y en los momentos grandes transforma la épica percibida con UN archivo
de ~200 KB, sin romper la identidad 8-bit. Es el patrón de los juegos retro
modernos: timbres chip + "aire" sampleado.

---

# ARTE

## Opción A — Pixel-art retro mejorado (evolución de lo actual)

**Cómo se ve.** El mismo lenguaje, ejecutado más rico. La épica visual del
estilo Tsubasa NES no venía del detalle sino de la *puesta en escena*, y eso
es replicable con mecánica original:

- **Cut-ins dramáticos:** retratos pixel grandes (48×48/64×64) que irrumpen en
  pantalla en el tiro especial o la atajada clave, con líneas de velocidad
  dibujadas por código. Es EL recurso de época y hoy no lo tenemos. Personajes
  100% propios (vos y tus amigos con sus variantes de pinta ya definidas).
- **Sprites de partido a 24×24** (hoy 8×16 aprox): espacio para peinados y
  patrones de camiseta legibles en cancha, coherente con la biblia de arte y
  su regla de daltonismo (forma antes que color).
- **Escenario vivo:** tribuna con damero animado de 2 cuadros, banderas, la
  pampa en el horizonte con parallax simple detrás de la cancha.
- **Efectos de código:** screen-shake en el gol, flash de paleta invertida en
  el especial, estela de la pelota. Cuestan poco y rinden mucho.
- Opcional: filtro scanlines/CRT sutil vía CSS (`repeating-linear-gradient`),
  activable, para el toque nostálgico.

**Trabajo.** Medio: es más de lo mismo que ya funciona. Los cut-ins son el
único asset nuevo grande. Todo generable por código o dibujado propio.

**Licencia.** Todo propio u opcionalmente [Kenney](https://kenney.nl/assets)
(CC0) para ítems genéricos. Cero riesgo.

## Opción B — Más pulido / ilustrado (assets de bancos)

**Cómo se ve.** Estilo vector plano tipo Kenney: limpio, moderno, "de juego
casual pulido". Personajes ilustrados con proporciones más reales, interfaz
suave, degradados.

**Bancos verificados:**

| Fuente | Qué tiene | Licencia | Condición |
|---|---|---|---|
| [Kenney — All-in-1](https://kenney.itch.io/kenney-game-assets) / [kenney.nl](https://kenney.nl/assets) | 60.000+ assets vector/2D coherentes entre sí, UI, ítems | **CC0** | Ninguna. Crédito opcional. Es el único banco con estilo consistente a esta escala |
| [chasersgaming — Asset Pack Football/Soccer](https://chasersgaming.itch.io/asset-pack-football-soccer) | Assets de fútbol específicos | **CC0** | Ninguna |
| [itch.io filtro assets CC0](https://itch.io/game-assets/assets-cc0) + [tag soccer](https://itch.io/game-assets/tag-soccer) | Variado | **Mixta: verificar cada pack** | Solo entrar por el filtro CC0; el tag general mezcla de todo |
| [CraftPix freebies](https://craftpix.net/freebies/) | Personajes y UI ilustrados, buena factura | **Licencia propia royalty-free** | Uso comercial sin atribución; prohibido revender los assets. No es CC0: guardar copia de sus términos |
| [OpenGameArt filtro CC0](https://opengameart.org/content/cc0-resources) | Variado | **CC0 (filtrado)** | Filtrar siempre; calidad dispareja |

**El problema honesto de esta opción:** no existe un banco libre con
"personajes de fútbol ilustrados, épicos, consistentes y personalizables".
Kenney es coherente pero su estilo es neutro-casual, no épico; lo demás es
retazos. Ir a ilustrado implica o aceptar estilo genérico de banco, o dibujar
ilustración propia (trabajo alto, otra habilidad). Además rompe dos cosas que
ya tenemos resueltas: la personalización pixel de amigos con variantes
etiquetadas (accesibilidad daltonismo) y la identidad-homenaje del proyecto.

**Trabajo.** Alto en total: rehacer TODO el arte actual (cancha, sprites, HUD,
avatares, pantallas) para que no queden dos estilos conviviendo, que es el peor
resultado posible ("juego de retazos").

---

# COHERENCIA ARTE ↔ SONIDO

| Combinación | Resultado |
|---|---|
| Pixel mejorado + chiptune enriquecido | Coherente, identidad fuerte ✔ |
| Pixel mejorado + híbrido (chip + multitud sampleada) | Coherente y más épico ✔✔ |
| Pixel + orquesta cinematográfica | Choque: se siente disfraz |
| Ilustrado + orquesta | Coherente, pero pierde el homenaje y cuesta 3× |
| Ilustrado + chiptune | Choque inverso |

# RECOMENDACIÓN

**Quedarse retro y subir la ejecución: Arte Opción A + Sonido híbrido (A con
capas y leitmotiv + hinchada sampleada CC0 para los momentos grandes).**

Razones: (1) la identidad del proyecto ES el homenaje NES — la épica del
Tsubasa original nunca fue fidelidad audiovisual, fue puesta en escena:
cut-ins, silencio antes del gol, leitmotiv — y todo eso es replicable por
código sin un solo archivo con riesgo de licencia; (2) es la única dirección
donde arte y sonido combinan sin rehacer nada: la Opción B de arte obliga a
rehacer todo el juego visual para no quedar en collage; (3) el costo legal y
de mantenimiento es cero (todo propio/CC0, un solo sample de multitud CC0 de
Freesound), clave para un proyecto público e institucional; (4) pesa casi nada,
y esto se juega en celulares con datos.

La épica que buscás está en tres inversiones concretas, en este orden:
**cut-ins de tiro especial** (arte), **leitmotiv con capas adaptativas**
(sonido) y **multitud sampleada bajo los goles** (el único archivo externo).
Con eso el Mundial y el ascenso van a sentirse enormes sin traicionar al juego.

---

*Nada de esto se integró: documento de decisión. Cuando se elija dirección,
el detalle de implementación va a la biblia de arte y al módulo de audio.*
