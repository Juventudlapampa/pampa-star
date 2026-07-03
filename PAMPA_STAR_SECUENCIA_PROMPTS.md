# PAMPA STAR — Secuencia de prompts (para disparar en orden)

> Trabajá esto de arriba hacia abajo. Cada prompt va a Claude Code salvo que diga otra cosa. REGLA DE ORO: donde dice CONTROL, PARÁ, jugá, y dame feedback antes de disparar el siguiente. Cada etapa se apoya en que la anterior se sienta bien; saltear el playtest es construir a ciegas. Yo integro tu feedback en el prompt que siga.

---

## PROMPT 1 — Build del Partido v3 → Code

```
Continuás PAMPA STAR (repo Juventudlapampa/pampa-star). ANTES DE TOCAR NADA:
1) Sumá y commiteá los dos documentos que el diseño dejó sin commitear: DISENO_PARTIDO_V3.md y DISENO_PRESENTACION.md.
2) Leé index.html, DISENO_PARTIDO_V3.md, DISENO_PARTIDO_V2.md, DIRECCION_ARTE_SONIDO.md y PROGRESO.md.

Construí el PARTIDO v3 siguiendo DISENO_PARTIDO_V3.md al pie. Es la vuelta que hace que el partido se sienta Captain Tsubasa de verdad. Trabajá de corrido, commiteá y pusheá por etapa, actualizá PROGRESO.md, frená solo si algo rompe el juego.

Puntos clave del documento a respetar:
- Todos los jugadores en cancha, moviéndose despacio por formación; distinguí los activos cerca de la pelota de los posicionales (escenografía viva).
- EL FLUJO DE ESCENAS: después de cada jugada la vista transiciona y re-muestra la situación; la pelota viaja con la tensión de si el pase llega o lo cortan. Reemplazá el "los jugadores desaparecen cuando los paso" por este flujo.
- Defensa: al perder la pelota, persecución/cambio con el jugador más cercano, según el diseño.
- MEGATIROS: arreglá el bug de los tiros especiales que quedaron huérfanos tras la reescritura v2, y que el menú los ofrezca cuando estoy en posición de remate con Guts.
- Ritmo pausado con tensión, no un corre-corre.

REGLAS: mobile-first apaisado; index.html; guardado retrocompatible; todo original, nada de Tecmo/Captain Tsubasa; nunca menores; nada de apuestas. No rompas la temporada, la vida ni el avatar que ya andan alrededor.
```

### ⛔ CONTROL 1 — Jugá el partido v3 y decime: ¿se siente el flujo de escenas y la ansiedad del pase? ¿Llegás a los megatiros? ¿La defensa funciona? Con tu feedback ajusto antes de seguir.

---

## PROMPT 2 — Build de la Presentación → Code

```
Continuás PAMPA STAR (repo Juventudlapampa/pampa-star). ANTES DE TOCAR NADA leé index.html, DISENO_PRESENTACION.md y PROGRESO.md.

Construí la CAPA DE PRESENTACIÓN según DISENO_PRESENTACION.md. Commiteá por parte, actualizá PROGRESO.md, frená solo si algo rompe el juego.

1. EDITOR DE PINTA POR CAPAS. El avatar modular por capas (piel, camiseta, cara, pelo, vincha, accesorios) dibujado por código, con las variantes del documento; cada una con etiqueta o forma, nunca solo color; colores en HEX. Migración retrocompatible del avatar viejo. El mismo editor para los 4 amigos.

2. "ELEGÍ TU RELATO". Las tres voces ficticias del documento (el streamer, la cabina y la tele) con su banco de líneas por evento. El jugador elige la modalidad; el relato aparece DESPUÉS del desenlace de cada jugada, respetando el flujo del v3, con variantes para no repetirse.

REGLAS: mobile-first apaisado; index.html; guardado retrocompatible; todo original; nunca personas, programas ni medios reales; nunca menores; nada de apuestas.
```

### ⛔ CONTROL 2 — Jugá con las voces del relato y probá el editor de pinta. Decime si el relato suma o distrae, y si el editor te gusta.

---

## PROMPT 3 — Build de la Escalera de ascensos y fichajes → Code

```
Continuás PAMPA STAR (repo Juventudlapampa/pampa-star). ANTES DE TOCAR NADA leé index.html, el DISENO, el addendum, la hoja de ruta y PROGRESO.md.

Construí la ESCALERA DE ASCENSOS Y FICHAJES, el corazón de la carrera. Trabajá de corrido, commiteá y pusheá por escalón o parte, actualizá PROGRESO.md, frená solo si algo rompe el juego.

1. CADENA DE CATEGORÍAS (como data, con dificultad creciente): Primera B, Primera A (Liga Cultural), Torneo Regional Federal Amateur, Ascenso AFA (Federal A / Primera Nacional, con Ferro de General Pico), Primera División (River, Boca y los grandes reales) y Europa (clubes con nombres genéricos, sin marcas reales del exterior). Cada categoría con sus clubes y su nivel de fuerza.
2. ASCENSO Y FICHAJES. Al terminar una temporada, según mi campaña, asciendo con el club o me llegan ofertas de categorías más altas. Flujo: aparecen ofertas (club, categoría, condiciones), elijo, me transfiero. Mecanismo general para todos los escalones; probalo en el salto de B a A.
3. ROTACIÓN DE AMIGOS. Al transferirme, algunos amigos vienen conmigo, a otros los venden o se quedan, y aparecen caras nuevas para reclutar. Que llevar o perder un amigo tenga peso.
4. DIFICULTAD creciente por categoría.

NO HAGAS AHORA (etapas aparte): la Selección y el Mundial, y los planteles reales con nombres de jugadores. Los rivales siguen genéricos o procedurales.

REGLAS: nombres reales solo de clubes (River, Boca, Ferro públicos; Europa genérico), NUNCA jugadores menores; mobile-first apaisado; index.html; original, nada de Tecmo/Captain Tsubasa; nada de apuestas; guardado retrocompatible.
```

### ⛔ CONTROL 3 — Jugá varias temporadas y ascendé. Decime si el fichaje se siente épico y si la rotación de amigos pega emocionalmente.

---

## PROMPT 4 — Música chiptune enriquecida → Code

```
Continuás PAMPA STAR (repo Juventudlapampa/pampa-star). Componé la música como chiptune original, integrada al motor de audio que ya existe. Replicá la ESTRUCTURA por estado del fútbol arcade (inspiración, no copia): un tema para cuando tengo la pelota, otro para cuando ataca el rival, uno más urgente y a mayor tempo para los últimos minutos de cada tiempo, y golpes cortos para el gol, la atajada y el tiro especial. Sumá un leitmotiv de pocas notas de PAMPA STAR que aparezca en todos lados y cambie de tono según el momento (solemne en el ascenso, triunfal en el Mundial). Todo ORIGINAL: nunca copies melodías de Captain Tsubasa ni de ningún tema con copyright. Respetá el volumen, mute y desbloqueo al primer toque que ya existen. Commiteá y actualizá PROGRESO.md.
```

### ⛔ CONTROL 4 — Escuchá y decime si la música acompaña sin cansar.

---

## FASE FINAL (después de todo lo de arriba)

Estos son condimentos y cada uno necesita un paso de diseño o de datos antes del build, así que los prompts los armo cuando lleguemos, con tu feedback fresco: la Selección y el Mundial (el clímax), los planteles reales de Primera A y B (cosecha de nombres adultos de los medios, con las guardas de siempre), el modo femenino (activar el modelo neutro), y las lesiones, la moral y la prensa post partido. No los dispares a ciegas; los diseñamos primero.

---

## Recordatorio de orquestación

Todos estos prompts son de Code (construyen el index.html), así que van de a uno, en orden, esperando el playtest entre cada uno. Cowork ya entregó los diseños que hacían falta; si en algún control tu feedback pide rediseñar algo, eso vuelve a Cowork antes de que Code lo construya.
