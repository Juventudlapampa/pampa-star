# PAMPA STAR — Documento de Diseño Técnico: Cámara, Presentación y Mecánicas "Cinematic Soccer" (estilo Captain Tsubasa Tecmo) para Phaser 3

## TL;DR
- El "secreto" de Captain Tsubasa NO es una cámara de fútbol normal: es un motor "Cinematic Soccer / Tecmo Theater" donde la pantalla se parte en dos — la mitad **SUPERIOR** muestra una vista cercana y grande del jugador con la pelota corriendo hacia el arco (con fondo/campo en perspectiva y curvatura del horizonte), y la mitad **INFERIOR** muestra el radar (mini-mapa con todos los jugadores como números) más marcador/tiempo/guts. La cancha entera SOLO se ve en el radar, **nunca** en la vista de acción. Como resume Hardcore Gaming 101: *"The only character you see is the one who has the ball, in a camera-facing running animation at the top of the screen. The other players on the field are also moving, but aren't shown at all until you either pass... or attempt an action."*
- El juego se juega en **pausas**: cuando movés al jugador o te cruzás con un rival, la acción se detiene y aparece un MENÚ de comandos (gambeta, pase, uno-dos, tiro / quite, corte, bloqueo) con la cara/retrato del jugador y sus guts; los cruces y jugadas se resuelven con animaciones dramáticas de sprites grandes estilo anime. Existe el pase al vacío ("Through"/"Thru").
- Para PAMPA STAR en Phaser 3: usá una cámara principal con `startFollow` + `deadzone` + `setZoom` sobre un mundo grande (no dibujes toda la cancha en pantalla), una SEGUNDA cámara pequeña fija como radar/minimapa (con `setZoom` chico e `ignore`), sprites grandes de ~⅓ a ½ de la altura de la vista, retratos tipo busto anime en los cuadros de comando, y campo en falsa perspectiva. Todo mobile-first apaisado con `Scale.FIT`.

---

## Key Findings

1. **Captain Tsubasa nunca muestra la cancha entera en la vista principal.** Según Hardcore Gaming 101 (Hugo Labrande), en el motor "Tecmo Theater" *"the top half of the screen only represents at any given point a background, a moving player sprite, and the ball"* ("la mitad superior de la pantalla solo representa, en cualquier momento dado, un fondo, un sprite de jugador en movimiento y la pelota"). La cancha completa con los 22 jugadores solo existe en el radar del sector inferior. Tu problema actual (22 jugadores chiquitos, vista de lejos) es exactamente lo que Tecmo evitó: ellos muestran un primer plano y delegan la "vista general" al radar.

2. **La cámara es de tipo cinematográfico/close-up, no un scroll libre de cancha completa.** El único personaje visible en la vista de acción es el que tiene la pelota, en animación corriendo hacia la cámara/hacia el arco. Los demás no se dibujan en la vista grande; solo aparecen como números en el radar (Captain Tsubasa II) o al intentar un pase (primer juego).

3. **El juego fluye por menús con pausa ("Cinematic Soccer").** La acción se pausa al apretar botón o al cruzarte con un rival, dándote tiempo de elegir en un menú. Esto crea el ritmo pausa→animación→pausa que hace que NO se sienta amontonado.

4. **Diferencia clave entre el 1º y el 2º juego = el radar.** En el primer *Captain Tsubasa* (Famicom, 1988), el mini-mapa solo muestra tu posición; para ver a los rivales tenés que intentar un pase (ahí aparecen los 11 rivales en un mapa, pero no tus compañeros). En *Captain Tsubasa Vol. II: Super Striker* (Tecmo, Famicom, lanzado el 20 de julio de 1990, exclusivo de Japón), el radar muestra en tiempo real la posición de TODOS los jugadores con su número. Para PAMPA STAR conviene copiar el modelo del 2 (radar completo en tiempo real).

5. **Retratos/caras tipo busto anime existen y se usan en los cuadros.** Hay una hoja de sprites dedicada de "Portraits" para *Captain Tsubasa Vol. II* en The Spriters Resource. Los retratos/fotos aparecen junto al nombre y los guts del jugador, especialmente para jugadores estrella, y las expresiones faciales de jugadores importantes se muestran durante acciones potentes (HG101: *"the facial expressions of important players are sometimes displayed during a particularly strong action"*).

6. **El set de mecánicas es completo y por contexto.** Con pelota: Gambeta, Pase, Uno-Dos, Tiro (y especiales). Sin pelota: Quite, Corte de pase, Bloqueo, No moverse. En zona alta/aérea: Trap, Centro/Clear, Cabezazo/Volea, y el PASE AL VACÍO ("Through"). Arquero: Atajar, Despejar de puño, achicar en el mano a mano.

---

## Details

### 1. LA CÁMARA Y EL SCROLL (escena por escena)

**Cómo era en Tecmo (el modelo a replicar):**
- La pantalla NES (256×240) se divide horizontalmente. La **mitad superior** es la "ventana de acción": muestra fondo/campo en perspectiva, el sprite grande del jugador con la pelota, y la pelota. La **mitad inferior** contiene el radar/mini-mapa más la información (marcador, tiempo, mitad, guts/energía y stats del jugador).
- El jugador con la pelota corre "hacia arriba" (hacia el arco), en animación de cara a la cámara. El resto del equipo y los rivales NO se dibujan en la ventana de acción — solo el portador y, cuando aplica, el rival que lo enfrenta.
- Cuando apretás B para abrir el menú de comandos, la imagen del campo se reacomoda/desplaza al lado del jugador y aparece el menú ("¿Qué hacés?") con las opciones en las direcciones del D-pad.
- El campo se dibuja en **falsa perspectiva**: en el primer juego el terreno muestra de forma exagerada la curvatura de la Tierra. Textual de HG101: *"the player runs on a field that unnaturally shows the Earth's curvature, the facial expressions of important players are sometimes displayed during a particularly strong action, the ball breaks the net when the shot is too strong."* Esto da profundidad de "estás dentro de la cancha" en lugar de vista cenital.

**Traducción a tu problema:** el Captain Tsubasa real NO scrollea una cancha completa mostrando 22 muñequitos; muestra un primer plano del portador. La sensación de scroll viene de que el fondo/campo se anima mientras el jugador corre, y de los cortes de plano (cuts) cinematográficos, no de una cámara de estadio alejada.

**Para PAMPA STAR (recomendación de cámara):**
- Definí un **mundo lógico grande** (la cancha completa en coordenadas, p.ej. 2400×1200 px) que NUNCA se ve entero en la vista principal.
- Cámara principal: `this.cameras.main.startFollow(jugadorConPelota, true, 0.12, 0.12)` (lerp suave para scroll fluido, no por pantallas) + `setBounds(0,0,2400,1200)` + `setDeadzone(ancho, alto)` para que la cámara no tiemble con micro-movimientos.
- `setZoom(2)` o más para que el jugador se vea grande (ocupando gran parte de la vista). El zoom es lo que reemplaza a "sprites grandes vistos de cerca".
- El scroll debe ser **suave** (lerp), no por pantallas, para acompañar la corrida.

### 2. VISTA DE ACCIÓN vs RADAR

- **Vista de acción (principal):** primer plano del portador, sprite grande, animaciones visibles (correr, gambetear, patear), fondo/campo en perspectiva. Da: quién tiene la pelota, qué está haciendo, la dramatización de la jugada.
- **Radar (mini-mapa):** representación esquemática de la cancha entera con números (azules = tu equipo, rojos/blancos = rival según el juego). Da: posición de todos, hacia dónde pasar, dónde están los marcadores, geometría táctica.
- **Confirmado:** la cancha entera solo se ve en el radar. En *Captain Tsubasa II* el radar muestra a todos en tiempo real con número; en el 1 solo te muestra a vos (los rivales aparecen al iniciar un pase, y ahí no ves a tus compañeros).

### 3. SPRITES GRANDES Y ANIMACIONES

- En la ventana de acción hay UN sprite de jugador grande dominando la mitad superior (más la pelota). No es un muñequito cenital.
- Animaciones confirmadas: correr/gambetear, pase, uno-dos, tiro raso, volea (pelota baja), cabezazo (pelota alta), chilena/overhead (pelota alta, especial), trap/control, despeje, quite/tackle, bloqueo, corte de pase, y el arquero atajando/estirándose/despejando de puño.
- En el primer juego algunas animaciones eran simples. Textual de HG101: *"a head shot is literally just the player sprite being moved around, and a straight shot is a simple 2-frame animation."* En *Captain Tsubasa II* las animaciones son *"more varied (since there are more possible actions and shots), more detailed, and more dynamic, with a tight pace... great camera shots and angles during the matches... giving the game a very cinematic feel"* (HG101). **Recomendación:** apuntá al estándar del 2, no del 1.

### 4. LAS CARAS / RETRATOS EN LOS CUADROS

- Existen retratos/bustos tipo anime (hay hoja "Portraits" ripeada de *Captain Tsubasa Vol. II* en The Spriters Resource).
- Se muestran junto al nombre y los guts del jugador; para jugadores estrella aparece la foto/retrato además del sprite. Las expresiones faciales de jugadores importantes se muestran durante acciones potentes (tiros especiales, atajadas).
- En los cuadros de comando de tiro, las direcciones del D-pad se muestran a la derecha del radar y el jugador que patea aparece con su nombre y guts debajo (convención de toda la serie).
- Se usan para: menú de comandos, momentos clave (tiros especiales, con cut-in), y cruces/duelos, donde se muestran planos dramáticos del jugador propio y los rivales.

### 5. OPCIONES DE JUEGO / COMANDOS COMPLETOS (mapa exacto de Captain Tsubasa II)

**Con la pelota en el piso (libre o marcado):**
- Izquierda = **Pase** (dirigible a cualquier parte del campo en el 2; 4 opciones fijas en el 1).
- Arriba = **Gambeta** (si estás marcado, intentás pasar al rival; si estás libre, seguís corriendo).
- Abajo = **Uno-Dos** (pared; requiere un compañero cerca; ~60 guts).
- Derecha = **Tiro** (cuesta 80 guts un tiro normal; desde tu propia mitad no llega salvo especiales).

**Recibiendo en zona rival, pelota baja:** Pase / Trap / **Through (pase al vacío)** / Tiro (volea). El "Through" deja pasar la pelota fingiendo tomarla, mostrando la trayectoria; si hay un compañero en línea, desequilibra al arquero.

**Recibiendo en zona rival, pelota alta:** Pase / Trap / **Through** / Tiro (cabezazo o especial aéreo).

**En tu propia área, con pelota:** Pase / Trap / Clear (despeje).

**Sin la pelota / defendiendo (en el piso):** Izquierda = Corte de pase (Pass cut), Arriba = Quite (Tackle), Derecha = Bloqueo (Block), Abajo = No moverse (para marcar con más jugadores o descansar guts).

**Marcando en el aire:** Corte de pase / Follow (seguir y esperar el control del rival) / Clear / No moverse.

**Marcando en zona rival (aérea):** Corte de pase / Press (desviar de pecho) / No moverse.

**Arquero:** en el aire = saltar a cortar o quedarse; mano a mano = parar gambeta (arriba) o parar tiro (izq/der); contra tiro = Atajar (Catch, izq/der) o Despejar de puño (Punch, arriba).

**Selección de jugador en defensa:** se cicla el jugador controlado con A (número mayor) / B (número menor). Esto era lento/incómodo en el original — recomendación abajo para mejorarlo.

**Sistema de energía (Guts/GP):** cada acción consume guts. Datos concretos (dikr, GameFAQs): mantener gambeta consume ~3 guts cada 10 segundos de juego; recuperación automática (sin pelota) ~2 guts/10s; en el entretiempo se recupera 1/8 del máximo del jugador. Un tiro normal cuesta 80 guts; los especiales escalan (p.ej. el Cyclone Shot de Tsubasa = 400 guts). Si un jugador baja de ~100 guts queda casi inútil. Esto es el freno que evita spamear al crack.

**Tácticas de equipo:** formaciones (4-3-3, 4-4-2, 3-5-2, tipo Brasil) y tipos de defensa (Normal, Press, Contragolpe).

### 6. EL MOMENTO DEL CRUCE / DUELO

- Cuando un defensor sale al cruce, la acción se pausa y aparece el menú (marcar / quite / corte). El CPU también elige una acción en secreto, y el resultado se resuelve por stats + una parte aleatoria.
- Visualmente se muestran planos dramáticos del jugador propio y del/los rival(es); los jugadores estrella muestran su cara/retrato. Existe un evento explícito de "confrontación" donde los jugadores se enfrentan cara a cara.
- **Nota:** aunque los retratos/bustos y los planos dramáticos de ambos están confirmados, no hallé una fuente que describa palabra por palabra las dos caras "enfrentadas lado a lado en un mismo recuadro" para las versiones NES; ese framing de doble retrato es una inferencia razonable a partir de "planos dramáticos de tu jugador y los rivales" + la hoja de retratos. Para PAMPA STAR es un diseño válido y fiel al espíritu.

### 7. EL RITMO Y EL FLUJO

- **Pausado (menú):** cuando tomás una decisión (pase, tiro, quite) o te cruzás con un rival. Da tiempo a pensar; es RPG por turnos disfrazado de fútbol.
- **Fluye (movimiento + animación):** la corrida del portador y las animaciones cinematográficas de la jugada resuelta.
- Evita sentirse **amontonado** porque nunca ves 22 sprites peleando: ves 1 (o 2 en el cruce) grandes, y la táctica global la leés en el radar. Evita sentirse **apurado** porque las decisiones son en pausa.
- Detalles de tensión (música de Keiji Yamagishi, textual HG101): *"a tune plays when you have the ball, another one when the opposing team has it, and a more urgent one plays on the last five minutes of a period"* — es decir, tema distinto según quién tiene la pelota y tema más urgente en los últimos 5 minutos. El 2 además agrega tiempo de descuento sorpresa (no sabés cuándo termina).

---

## Recommendations (implementación en Phaser 3, mobile-first)

**Etapa 0 — Config mobile-first apaisado.**
```js
scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 960, height: 540 },
render: { roundPixels: true, pixelArt: true }
```
Diseñá a 16:9 apaisado, detectá `this.scale.on('orientationchange', ...)` y mostrá "girá el teléfono" en portrait. Botones táctiles ≥ 48×48 px.

**Etapa 1 — Separar mundo lógico de vista (LO MÁS IMPORTANTE, corrige tu bug).**
- Creá un mundo grande (ej. 2400×1200). NO dibujes la cancha entera en pantalla.
- Cámara principal:
```js
const cam = this.cameras.main;
cam.setBounds(0, 0, 2400, 1200);
cam.startFollow(ballCarrier, true, 0.12, 0.12); // lerp = scroll suave
cam.setDeadzone(220, 140);
cam.setZoom(2.2); // jugador grande
```
- Activá `roundPixels` para pixel-art nítido; mantené el zoom en enteros si podés para evitar jitter.

**Etapa 2 — Radar como segunda cámara fija (minimapa).**
```js
const radar = this.cameras.add(xEsquina, yEsquina, radarW, radarH);
radar.setZoom(radarW / 2400);   // ver toda la cancha
radar.setScroll(0, 0);
radar.setBackgroundColor(0x0b3d0b);
cam.ignore(radarBlips);                       // la main no dibuja los puntitos
radar.ignore([ ...spritesGrandes, hudElements ]); // el radar no dibuja sprites grandes ni HUD
```
Los "jugadores" en el radar son puntos/números (Graphics o sprites chicos) actualizados cada frame desde las posiciones lógicas de los 22 jugadores. **Alternativa más barata en perf:** dibujar el radar con un `Graphics` fijo (`setScrollFactor(0)`) en vez de segunda cámara.

**Etapa 3 — HUD fijo.** Marcador, tiempo y guts con `setScrollFactor(0)` para que no se muevan con el scroll.

**Etapa 4 — Sprites grandes + animaciones.**
- Cada jugador = spritesheet grande (que a zoom ocupe ~⅓–½ de la altura visible). Definí `this.anims.create` para: correr, gambeta, pase, tiro, volea, cabezazo, chilena, y arquero (parado, salto/vuelo, atajada, puño).
- En la vista de acción, dibujá solo al portador (+ rival en el cruce). No instancies 22 sprites grandes a la vez: mantené 22 entidades lógicas (posición, stats) y materializá el sprite grande solo de quien está en cámara.

**Etapa 5 — Retratos/caras en cuadros de comando.**
- Guardá bustos tipo anime (arte 100% original) como imágenes. Cuando se abre el menú de comandos o hay un cruce, mostrá un panel (Container fijo con `setScrollFactor(0)`) con el retrato del jugador, su nombre y su barra de guts.
- En el cruce/duelo: panel con DOS retratos enfrentados (atacante a la izquierda, defensor a la derecha) + las opciones. Es la interpretación fiel del "plano dramático de tu jugador y el rival".
- Para tiros especiales: cut-in de pantalla completa con el retrato y animación.

**Etapa 6 — Campo en perspectiva con profundidad.**
- Dibujá las líneas de la cancha con convergencia (líneas laterales que se juntan hacia el arco lejano) y una leve curvatura del horizonte para evocar la "curvatura de la Tierra" de Tecmo.
- Técnica simple: fondo en `tileSprite` con líneas pre-dibujadas en perspectiva + escalado de sprites según su "profundidad" (y-lógico): más lejos = sprite más chico, más cerca = más grande. Opcional: parallax con `setScrollFactor` en capas (tribunas atrás lentas, línea de fondo rápida).

**Etapa 7 — Flujo de comandos (máquina de estados).**
- Estados: `LIBRE_CORRIENDO` (cámara sigue, mueve el portador) → al apretar acción o cruzar rival → `MENU_PAUSA` (physics pause, aparece panel + retratos) → `RESOLUCION` (animación cinematográfica) → vuelve a `LIBRE_CORRIENDO`.
- Pausá la simulación con `this.physics.pause()` / tu propio flag durante el menú para lograr el ritmo pausa→animación.

**Etapa 8 — Defensa mejorada (corregí el defecto del original).**
- En vez de ciclar por número (A/B) como el original —que HG101 marca como lento e incómodo— implementá "seleccionar el defensor más cercano a la pelota" con un botón: es el estándar moderno y más cómodo en touch.

**Benchmarks / umbrales que cambian decisiones:**
- Si en un dispositivo gama baja el radar como 2ª cámara baja de ~50 fps, cambiá a radar dibujado con `Graphics` fijo (una sola pasada de render).
- Si el jugador se ve chico, subí `zoom` hasta que el portador ocupe ~⅓–½ de la altura; si se ve "encajonado", agrandá la `deadzone`.
- Si el scroll "tiembla", activá `roundPixels` y mantené zoom entero.
- Si hay >6–8 sprites grandes simultáneos en cámara, estás rompiendo el modelo Tecmo: reducí a portador + rival + arquero.

---

## Caveats
- *Captain Tsubasa Vol. II* fue exclusivo de Famicom (Japón, 20/07/1990); casi toda la doc en inglés viene de fan-translations, FAQs de GameFAQs (Kaitou_KiD, EonLeader, dikr), Hardcore Gaming 101, Wikipedia y wikis de fans. Los mapeos de comandos son muy consistentes entre fuentes.
- No hallé una fuente que confirme palabra por palabra el framing de "dos caras enfrentadas en un mismo recuadro" en las versiones NES; los retratos/bustos y los planos dramáticos de ambos jugadores SÍ están confirmados, pero el doble-retrato lado a lado es una reconstrucción de diseño (fiel al espíritu, no citada textual).
- Detalles finos de proporción de sprites (qué % exacto de pantalla ocupa el jugador) no están documentados numéricamente; la guía "⅓–½ de la altura" es una recomendación de diseño basada en el hecho documentado de que "la mitad superior es fondo + un sprite + pelota".
- La cita del "photograph junto a name/guts" proviene de un FAQ de *Captain Tsubasa V* (SNES), describiendo la convención de la serie; sirve como corroboración de la serie, no como cita específica del NES. La evidencia NES-específica del retrato es la hoja "Portraits" de The Spriters Resource.
- Todo el arte (jugadores, caras, nombres, equipos) debe ser 100% original: este documento replica MECÁNICA, CÁMARA y PRESENTACIÓN, no assets de Tecmo. Los términos de Tecmo (nombres de jugadores, técnicas como "Drive Shot") se citan solo como referencia de análisis, no para copiar.