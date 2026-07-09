# PAMPA STAR — Migración a Phaser (documento maestro)

> El HTML crudo validó el diseño. Ahora el corazón del juego es la ÉPICA: animaciones dramáticas, cortes de cámara, el remate que emociona. Eso pide un motor de juego. Migramos a **Phaser 3** (sobre PixiJS), sin dejar el navegador ni el mobile-first. Godot queda como destino final si algún día se quiere ejecutable/app: con el diseño validado, ese salto será fácil.

---

## 1. Por qué migramos (el diagnóstico)

El motor actual es un `index.html` con sprites dibujados a mano por código, sin librería de animación ni sistema de escenas. Sirvió para lo caro: validar el diseño. Pero para lo que sigue —animaciones de remate, pelota que vuela, arquero que se estira, red que revienta, corte cinematográfico— cada efecto cuesta el triple y queda mediocre. Phaser trae ya hechos: escenas, animaciones de sprites, cámara con zoom y shake, tweens, partículas, audio y física.

**El HTML no se tira.** Queda como está, jugable, de referencia viva del diseño. Phaser se construye AL LADO, en una carpeta nueva.

## 2. Lo que VIAJA intacto (no se reescribe)

Todo el contenido y el diseño ya validado: el roster (`data/roster_pampeano.json`), los diálogos y relatos (`data/relatos.json`), las ilustraciones ya optimizadas (`assets/ui/`), los clubes de la Liga Cultural y la estructura de la temporada, la escalera de categorías, la capa de vida y amigos, el avatar con origen (localidad, rasgo, estilo, puntos), el lore adaptativo, las tres voces del relato (Pichi el Bagual, el Profe, Delfina Roldán), el diseño de la Selección y el Mundial, y **las constantes de balance afinadas jugando** (velocidades, radios, reloj, umbrales, costos de Guts). Todos los documentos de diseño siguen siendo la fuente.

## 3. Lo que se REESCRIBE

Solo el motor de partido y la capa de presentación: renderizado, animaciones, cámara, input y audio.

## 4. Los tres problemas a resolver en la migración (feedback de playtest)

**a. BUG del arquero (crítico).** Se pateó, el arquero atajó, y marcó gol igual. La resolución del duelo está desconectada del resultado. Hay que arreglarlo y dejarlo cubierto por tests: el resultado del duelo determina el desenlace, siempre.

**b. Calibración de velocidad y persecución.** Hoy el jugador propio es más rápido que todos: nadie lo alcanza, y cuando no tiene la pelota puede perseguir infinitamente. Eso mata la tensión. En el modelo correcto: se avanza LENTO y con esfuerzo, los defensores cierran el paso, y perseguir tiene costo (Guts) y no es infinito. Los rivales deben poder alcanzarte. Constantes afinables.

**c. LA ÉPICA (la razón de la migración).** El juego tiene que SER de animaciones, con el jugador moviendo el mapa entre medio. Hoy hay mecánica sin espectáculo. Faltan: animación de patear, la pelota viajando con curva, la tensión de si el arquero llega, la atajada, la red que revienta, el corte de cámara con zoom, el flash de impacto, el slow motion en el momento clave. Sin eso, se siente vacío.

**d. Audio.** El chiptune actual no tiene alma. Hay sonidos propuestos en `ASSETS_INVENTARIO.md` esperando aprobación. La música va por capas según estado (posesión, amenaza, últimos minutos) con stingers para gol, atajada y tiro especial.

## 5. Arquitectura (pensada para un futuro porteo a Godot)

Carpeta nueva `phaser/`, separada del HTML actual. Reglas: **la DATA nunca se entierra en el código** (roster, clubes, textos, constantes en JSON), la lógica de juego (duelos, Guts, temporada) va en módulos puros e independientes del renderizado, y el renderizado/animación queda aislado en la capa Phaser. Así, el día del porteo a Godot, la data y la lógica se copian y solo se reescribe la presentación.

Escenas de Phaser: Boot/Preload, Menú, Creación de avatar, Partido (con sub-estados: campo, encuentro, resolución cinemática), Temporada, Semana/Vida.

## 6. Plan por hitos (con playtest entre cada uno)

**HITO 1 — La rebanada épica.** Solo la secuencia de remate al arco, con toda la épica: corrida, patada, pelota que vuela con curva, arquero que se estira, gol con la red sacudiéndose o atajada con rebote; cámara con zoom, shake, flash y un instante de slow motion; sonido acompañando. Nada más. **Esta es la prueba de fuego:** si ese remate emociona, la migración vale y seguimos. Va a estar más pelado que el HTML actual: es lo esperable.

**HITO 2 — El partido jugable.** Las dos capas (radar para leer + acción con zoom), movimiento con propósito bien calibrado, encuentro que congela y menú por rol, duelos por stats y Guts con el bug del arquero resuelto, cambio de jugador, apuntado, reloj a saltos y entretiempo.

**HITO 3 — Animaciones completas.** Gambeta, pase, quite, corte, pared, pelota aérea, córner, y los tiros especiales (Disparo del Caldén) con su animación dedicada y dramática.

**HITO 4 — La carrera.** Portar temporada, tabla, vida y amigos, avatar con origen, lore.

**HITO 5 — Presentación y audio.** Las tres voces del relato, el editor de pinta por capas, la música por estados con leitmotiv.

**HITO 6 — Escalera y Mundial.** Ascensos, fichajes, rotación de amigos, Selección y Mundial.

## 7. Reglas que no se tocan

Mobile-first apaisado, sin descargas. Todo original: nada de assets, sprites, música, código ni nombres de Tecmo/Captain Tsubasa (solo se emula la forma de jugar). Nunca nombres de personas reales ni de menores; los amigos los nombra quien juega. Nada de apuestas ni casino. Guardado retrocompatible. Colores en HEX y toda distinción con etiqueta o forma, nunca solo por color (daltonismo). Textos en voseo rioplatense y género neutro.

---

## 8. PROMPT MAESTRO (pegar en Claude Code)

```
Continuás PAMPA STAR (repo Juventudlapampa/pampa-star). ANTES DE TOCAR NADA leé: index.html, PROGRESO.md, ASSETS_INVENTARIO.md, DISENO_PARTIDO_V4.md, DISENO_PRESENTACION.md, DISENO_SELECCION_MUNDIAL.md, DIRECCION_ARTE_SONIDO.md, data/roster_pampeano.json y data/relatos.json.

DECISIÓN TOMADA: migramos el motor a PHASER 3. El HTML crudo validó el diseño, pero el corazón del juego es la ÉPICA (animaciones dramáticas, cortes de cámara, el remate que emociona) y eso pide un motor de juego. Phaser da escenas, animaciones, cámara con zoom/shake, tweens, partículas y audio. Seguimos en navegador y mobile-first.

NO BORRES NI ROMPAS EL HTML ACTUAL: queda jugable como referencia viva del diseño. Phaser se construye AL LADO, en una carpeta nueva phaser/.

ARQUITECTURA (obligatoria, pensada para un futuro porteo a Godot):
- La DATA (roster, clubes, textos, lore, constantes de balance) va en JSON, NUNCA enterrada en el código.
- La LÓGICA de juego (duelos, Guts, reloj, temporada) va en módulos puros, independientes del renderizado.
- El RENDERIZADO y las animaciones quedan aislados en la capa Phaser.

EMPEZÁ SOLO POR EL HITO 1 — LA REBANADA ÉPICA. No construyas el juego entero. Quiero únicamente la secuencia de remate al arco, con toda la épica:
- El jugador corre y patea (animación de patada real).
- La pelota vuela con curva y velocidad (tween), con estela.
- El arquero reacciona y se estira hacia la pelota.
- Desenlace: GOL con la red sacudiéndose, o ATAJADA con rebote.
- Cámara: zoom al momento del remate, shake en el impacto, flash, y un instante de slow motion en el momento clave.
- Sonido acompañando cada beat (patada, vuelo, impacto, red, grito de gol).
- Que se pueda repetir la jugada para probarla muchas veces.
Sprites: usá los que ya existen o generá originales/CC0. NADA de Tecmo/Captain Tsubasa.

ARREGLÁ ADEMÁS, en la lógica que escribas:
1. BUG CRÍTICO: hoy el arquero ataja y marca gol igual. El resultado del duelo DEBE determinar el desenlace, siempre. Cubrilo con un test.
2. CALIBRACIÓN: hoy mi jugador es más rápido que todos, nadie me alcanza, y puedo perseguir infinito. El avance debe ser LENTO y con esfuerzo, los defensores deben poder cerrarme el paso, y perseguir debe tener costo de Guts y no ser infinito. Dejá esas constantes afinables y bien nombradas.

REGLAS QUE NO SE TOCAN: mobile-first apaisado; todo original (nada de assets, sprites, música, código ni nombres de Tecmo/Captain Tsubasa); nunca personas reales ni menores; nada de apuestas; colores en HEX y ninguna distinción solo por color (soy daltónico); voseo rioplatense y género neutro.

Commiteá y pusheá por parte, actualizá PROGRESO.md, y FRENÁ AL TERMINAR EL HITO 1 para que yo lo pruebe. La prueba es una sola: si ese remate me emociona, seguimos con el resto de los hitos.
```

---

*Hitos siguientes (2 a 6) en la sección 6. No los dispares sin jugar el hito anterior: cada playtest es lo que viene salvando este proyecto.*
