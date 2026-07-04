# Análisis del motor "Cinematic Soccer" de Tecmo (Captain Tsubasa I y II, NES/Famicom) para replicar en PAMPA STAR

## TL;DR
- **Captain Tsubasa de Tecmo NO es un juego de fútbol de acción en tiempo real: es un "RPG de fútbol cinemático" donde solo controlás con la cruceta al jugador que tiene la pelota** (corriendo hacia donde vos querés), y cada vez que un rival lo intercepta o vos apretás un botón, la acción se congela y aparece un menú de comandos que se resuelve como un duelo de estadísticas + azar, animado con dramatismo estilo anime. Tecmo bautizó este sistema "Cinematic Soccer", inaugurado con Captain Tsubasa (Famicom, 28 de abril de 1988) y reutilizado en las secuelas.
- **La presentación es de doble capa:** una vista de acción cercana arriba (un solo jugador corriendo de frente a cámara con scroll de fondo, el remate, el arquero volando) y un radar/minimapa abajo con los 22 jugadores como números. En Captain Tsubasa Vol. II: Super Striker (Tecmo, Famicom, 20 de julio de 1990) el radar muestra a todos en tiempo real —"the mini-map now displays the position of each player on the field in real-time, even showing their number… The game finally feels like a soccer game, instead of a vaguely-RPG inspired sequence of random encounters" (Hardcore Gaming 101)— lo que es la mejora clave sobre el primero.
- **Para PAMPA STAR:** replicá el bucle "correr con propósito → encuentro que congela el tiempo → menú contextual por rol → resolución animada con azar ponderado por stats y energía (GUTS)", con reloj que baja a saltos, tiempo de descuento impredecible y recuperación de energía en el entretiempo. NADA de esto está protegido por copyright (las mecánicas son libres); solo evitá assets, sprites, nombres de jugadores y nombres de movimientos de Tecmo.

## Key Findings

**1. Es un motor de comandos, no de acción.** Tecmo lo llamó oficialmente "Cinematic Soccer" (Hardcore Gaming 101: "The gameplay employs a system dubbed 'Cinematic Soccer' by Tecmo, which was then used in the following three Tsubasa-licensed games they made"). El único control directo es mover con la cruceta al futbolista que tiene la pelota; todo lo demás (pase, tiro, gambeta, quite, corte, bloqueo) se elige de un menú contextual que aparece al frenarse la acción. El resultado se decide por estadísticas de los jugadores enfrentados más azar, y se muestra animado.

**2. Vista de doble capa.** La pantalla se divide: arriba, la "vista de acción" tipo Tecmo Theater (fondo, un sprite de jugador en movimiento y la pelota); abajo, un radar/minimapa del campo con números (blancos = tu equipo, azules/rojos = rival). Solo se ve un jugador a la vez en la vista de acción: el que tiene la pelota (o, defendiendo, el rival que la lleva).

**3. La gran diferencia CT1 vs CT2 es el radar.** En el primer juego el minimapa solo muestra tu posición, no la de los rivales ni la de tus compañeros (para verlos hay que intentar un pase). En CT2 el radar muestra a los 22 jugadores en tiempo real con su número, lo que transforma la estrategia y hace que —según Hardcore Gaming 101— "por fin se sienta un juego de fútbol en lugar de una secuencia de encuentros aleatorios de vago corte RPG".

**4. Energía GUTS es el corazón del sistema.** Toda acción gasta GUTS; los movimientos especiales gastan muchísimo. Cuando un jugador queda con poca energía (bajo ~100) queda casi inútil: solo puede pasar o seguir corriendo. Se recupera parcialmente en el entretiempo.

**5. El tiempo pasa a saltos, con descuento impredecible.** El reloj cuenta hacia atrás y baja cada vez que ejecutás un comando (en tiempo real solo mientras gambeteás/corrés). CT2 agregó tiempo de descuento señalado por el árbitro, así que no sabés exactamente cuándo termina.

## Details

### 1. El movimiento del jugador (con y sin pelota)

**Con la pelota:** controlás a UN solo jugador —el que tiene la pelota— con la cruceta, moviéndolo libremente por el campo hacia donde quieras. En la vista de acción se lo ve corriendo de frente/diagonal a la cámara, y el fondo hace scroll para dar sensación de avance (Hardcore Gaming 101 describe que "el jugador corre sobre un campo que muestra de forma antinatural la curvatura de la Tierra"). El movimiento es lento y con propósito: la filosofía del guide de Kaitou_KiD es que mientras mantenés la pelota "cada 10 segundos avanzás un paso" y volvés a decidir. No es correr rápido apretando botones; es avanzar deliberadamente evaluando el radar.

**Representación:** en la vista de acción, el portador de la pelota se ve como sprite corriendo; en el radar, tu portador es una pelotita (o tu número resaltado con brillo). En CT1, mientras dribleás/corrés, el reloj corre en tiempo real, penalizándote por demorar.

**Sin la pelota (en tu ataque):** los compañeros se mueven por IA; NO los controlás individualmente salvo al elegir destino de pase/pared. En CT1 ni siquiera ves a tus compañeros hasta que intentás pasar.

**Sin la pelota (defendiendo):** en CT1 no controlás a nadie mientras el rival ataca: esperás pasivamente a que el rival "tropiece" con uno de tus jugadores y ahí se dispara el menú. En CT2 sí podés mover a un defensor para acercarlo a la pelota o ponerlo en la trayectoria de un pase/tiro, aunque el cambio de jugador es engorroso (ver punto 5).

### 2. La cámara con zoom y las transiciones (flujo escena por escena)

No hay "zoom" continuo tipo lente; es un CORTE entre dos modos de presentación, muy al estilo del anime (Hardcore Gaming 101 señala que este estilo "over-the-top", con "special shots deforming the soccer ball which then takes improbable trajectories", inspiró la película Shaolin Soccer):

- **Escena A — Vista de campo/radar (planificación):** cuando movés al portador, la mirada útil es el radar inferior. Ahí "ves" el campo entero como números. Vos decidís hacia dónde correr mirando ese mapa.
- **Escena B — Vista de acción cercana (corriendo):** simultáneamente, arriba, el jugador con la pelota corre de frente a cámara con fondo en scroll. Da la sensación de carrera dramática hacia el arco.
- **Escena C — El encuentro (corte a duelo):** cuando un defensor intercepta (o vos frenás para actuar), la acción se detiene y aparece el menú de comandos. Es el "momento de decisión".
- **Escena D — Resolución animada:** elegido el comando, la pantalla CORTA a una animación dedicada: el pase volando, la gambeta cara a cara, el arquero estirándose, y sobre todo los remates especiales con animación propia (la pelota se deforma, gira, revienta la red). HG101: "se juega en un estilo pensado para emular el anime, con tomas dramáticas de tu jugador y los rivales, la pelota surcando el cielo, el arquero estirándose para atajarla".
- **Escena E — Vuelta al campo:** terminada la animación, se vuelve a la vista A/B en la nueva posición.

CT2 mejora los "ángulos y tomas de cámara durante los partidos" y suma primeros planos de las caras de los jugadores importantes en acciones fuertes. Para PAMPA STAR: pensá en "corte cinematográfico" (cambio de escena/encuadre) más que en zoom analógico. Mobile-first: la escena B/D ocupa la pantalla grande, el radar es una franja fija.

### 3. El disparo de los "encuentros"

Un encuentro (freno + menú) se dispara por dos vías:
- **Automática:** cuando un jugador rival hace CONTACTO con tu portador de la pelota (entra en su casilla/radio). Golden Quarter: "te vas a ver forzado a frenar y elegir un comando cuando un jugador rival hace contacto con tu portador de la pelota".
- **Voluntaria:** cuando vos apretás B para abrir el menú (por ejemplo para tirar cerca del arco).

**El tiempo se congela** durante el menú: "tenés todo el tiempo que quieras para elegir un comando una vez que aparece" (Golden Quarter). No hay presión de reloj dentro del menú.

**Qué defensor te intercepta:** el que hace contacto físico en el campo según las posiciones. En CT1, como no ves a los rivales, es casi un "encuentro aleatorio" tipo RPG. En CT2, al ver el radar, podés intentar esquivar a rivales específicos (incluso identificar por número al más peligroso y evitarlo). El defensor rival también elige una acción; si su acción no coincide con la tuya, la tuya puede fallar o triunfar (ej.: pass cut es más efectivo si el rival justo pasó; tackle si el rival justo dribleó).

### 4. El apuntado y la dirección

- **Pase:** en CT2 podés dirigir el pase a CUALQUIER punto del campo (mejora clave). En CT1 el menú te da 4 compañeros/opciones y cada una resalta la posición de ese jugador en el mapa; elegís de esa lista, no apuntás libremente. Al iniciar un pase se revela el mapa con los 11 rivales (en CT1) para que veas trayectorias.
- **Gambeta (Dribble):** si estás marcado, el comando "arriba" te hace intentar superar al/los marcadores; si estás libre, sigue moviéndote. No podés driblar a 4+ jugadores seguidos salvo con mucha suerte.
- **Pared (One-Two / "Combi"):** comando "abajo"; requiere un compañero cerca. Devuelve la pelota a tu jugador tras el pase. Sirve para zafar de marcas.
- **Tiro:** comando "derecha". Si tirás desde tu propio campo, no llega al arco (los tiros normales deben hacerse en campo rival); los tiros ESPECIALES siempre llegan sin importar la posición. El apuntado fino al arco NO es manual en el tiro normal: se resuelve por stats vs. arquero + azar. En tiros libres directos elegís entre 2 opciones (izquierda/derecha de la barrera); en penales, 3 opciones (izquierda/centro/derecha).
- **"Through" (dejar pasar la pelota):** con balón aéreo en área rival, comando "abajo" finge tomar la pelota y la deja pasar; muestra la trayectoria y si va a un compañero podés dejarla, desequilibrando al arquero (aumenta chance de gol).
- **En córner/tiro libre (CT2):** podés reposicionar a tus jugadores en el área antes de ejecutar.

### 5. El cambio de jugador

- **En ataque:** controlás siempre al que tiene la pelota; "cambiás" pasándola (el control pasa al receptor). No cambiás libremente entre compañeros.
- **En defensa:** aquí está la diferencia. En CT1 NO controlás a nadie: esperás a que el rival choque con un jugador tuyo. En CT2 SÍ podés elegir qué defensor controlar, ciclando con los botones A (número mayor) y B (número menor). HG101 critica que este ciclado numérico es lento y poco práctico (si tu 10 pierde el duelo, el siguiente puede ser el 4 o el 2 y hay que ciclar rápido, en lugar del sistema estándar de "seleccionar al defensor más cercano a la pelota"). Nota de balance: cada vez que el rival ejecuta una acción, el juego cambia automáticamente tu control a otro jugador, lo que complica defender.
- **Restricción citada en un cheat:** en ciertos contextos "solo podés cambiar jugadores cuando metés un gol o cuando hay un foul"; el cambio de líneas/formación se hace en el menú Team Data (en pausa o entretiempo).

### 6. El reloj y la estructura del partido

Confirmado con el MANUAL oficial de Tecmo (transcripción japonesa) y análisis de ROM:
- **Duración:** Captain Tsubasa II usa dos tiempos de **30 minutos de reloj virtual** (algunos partidos, 35 minutos). El manual dice: "el tiempo de partido viene en dos tipos: mitades de 30 minutos y mitades de 35 minutos". NO son 45 (los 45 aparecen recién en Captain Tsubasa IV — no los confundas). En caso de empate en eliminatoria: alargue de dos tiempos de 15 minutos; si persiste, definición por penales.
- **Cómo corre:** cuenta hacia ATRÁS y (manual) "el tiempo mostrado disminuye cada vez que ejecutás un comando (durante la gambeta baja en tiempo real)". La unidad de tick es ~10 segundos de juego (movimiento/gambeta gastan "3 guts cada 10 segundos"; recuperación pasiva "2 cada 10 segundos"). Es decir, el tiempo avanza por jugada/acción, no como cronómetro continuo, salvo mientras corrés con la pelota.
- **Descuento:** CT2 agregó tiempo de descuento señalado por el árbitro; aunque el reloj llegue a cero, el árbitro puede seguir hasta que suene el silbato final, y no sabés cuándo. El primer juego NO tenía esto (terminaba justo en 0). HG101: "here the referee just signals we're entering stoppage time, meaning the period or match can end any time, but you do not know when. This makes for some nail-biting endings of matches". Esto genera finales de infarto.
- **Entretiempo:** sí hay descanso. Los equipos NO cambian de lado (siempre jugás hacia la derecha). En el entretiempo se recupera GUTS (ver punto 9) y podés ajustar formación/táctica y, con la selección de Japón, hacer sustituciones (hasta 3).
- **Sensación del paso del tiempo:** como el reloj avanza por acción, "hacer tiempo" (pasar la pelota atrás, paredes) sirve tanto para quemar minutos como para recargar GUTS de tus figuras; es una mecánica estratégica real citada en todos los guides.

### 7. La vista del campo / minimapa (radar)

- **CT1:** el radar inferior muestra SOLO tu posición; no ves rivales ni compañeros. Para revelar a los 11 rivales hay que intentar un pase (y ahí no ves a tus compañeros). Esto hace la planificación frustrante y "de encuentro aleatorio".
- **CT2:** el radar muestra a los 22 jugadores en tiempo real, cada uno con su número (Hardcore Gaming 101: "the mini-map now displays the position of each player on the field in real-time, even showing their number"); blancos = tuyos, azules = rivales; el portador es una pelotita y tu jugador controlado tiene un brillo/marca. Esta vista amplia CONVIVE con la vista de acción cercana (arriba la carrera, abajo el mapa) y es la que usás para decidir hacia dónde ir, a quién pasar y a quién evitar.
- Para PAMPA STAR (mobile-first): radar como franja/HUD siempre visible; la vista de acción ocupa el grueso de la pantalla. Adoptá el modelo CT2 (radar completo en tiempo real) porque el modelo CT1 es reconocidamente frustrante.

### 8. El sistema de comandos por rol

El menú es contextual (cambia según: tenés/no tenés la pelota, y la pelota está a ras de piso o aérea, y en qué zona del campo). Mapeo de la cruceta (CT2, guides Kaitou_KiD/EonLeader):

**A) Con pelota a ras del piso (libre o marcado):**
- Izquierda = Pase
- Arriba = Gambeta
- Abajo = Pared (1-2)
- Derecha = Tiro

**B) Sin pelota, marcando al rival:**
- Izquierda = Corte de pase (pass cut) — mejor si el rival pasa
- Arriba = Quite (tackle) — mejor si el rival dribla
- Derecha = Bloqueo (block) — mejor si el rival tira
- Abajo = No moverse (mantener marca / descansar guts / permitir sumar más marcadores)

**C) Balón aéreo en área rival (con pelota):** Izquierda = Pase; Arriba = Trap (bajar la pelota); Abajo = Through (dejar pasar); Derecha = Tiro (volea/cabezazo/chilena/especial aéreo).

**D) Balón aéreo en tu área (defendiendo):** Izquierda = Corte; Arriba = Follow/seguir; Abajo = Nada; Derecha = Clear (despejar) o "seriai" (disputar, cambia dirección de la pelota).

**Arquero:** atajar (catch) o despejar de puño (punch); en CT2 puede disputar un centro o esperar. Algunos arqueros tienen atajadas especiales (cuestan GUTS).

**Resolución de cada duelo:** cada jugador tiene valores numéricos por acción (Dribble, Pass, Shoot, Tackle, Block, Cut; y para balón aéreo: Trap, Shoot, Thru, Clear, Compete; arqueros: Catch, Punch, Stop Drib, Stop Shot, Jump). Solo ves los stats de TU jugador, no los del rival. El resultado se calcula comparando el stat relevante de ambos + azar; además influye qué acción eligió cada uno (piedra-papel-tijera parcial: cut vence pase, tackle vence gambeta, block vence tiro). GUTS altos aumentan efectividad. Un hilo de GameDev.net y las tablas de stats de Neoseeker (autor Binta) confirman la estructura numérica; el cálculo exacto de probabilidad no está documentado oficialmente por Tecmo.

### 9. El sistema de energía "GUTS"

- **Qué es:** medidor de stamina por jugador, proporcional a su nivel. Tsubasa llega a ~880 en el tramo final; jugadores normales rondan 400–750.
- **Consumo:** TODA acción gasta GUTS. Valores citados (CT2, guides): pase normal ~20; tackle/pass-cut normales ~50; tiro normal 80–90; pared 60; gambeta continua ~3 GUTS cada 10 segundos de juego (se drena rápido si demorás). Especiales carísimos: Drive Shot 200, Overhead 160, Drive Overhead 320–360, Cyclone 400, Neo Tiger 370, Gammen Block 400, etc.
- **Efecto en lo que podés hacer:** si un jugador se queda con pocos GUTS (bajo ~100) queda "inútil": solo puede pasar o correr, y conviene sustituirlo o hacerlo descansar. No podés lanzar un especial si no te alcanzan los GUTS.
- **Recuperación:** pasiva mientras el jugador NO tiene la pelota (~2 GUTS cada 10 segundos de juego, nivel bajo). En el ENTRETIEMPO se recupera 1/8 del máximo de GUTS (redondeado hacia abajo) para jugadores normales; antes del alargue, 1/4 del máximo. (Confirmado por análisis de ROM de CT2 y corroborado por la guía de consumo de Captain Tsubasa III, mismo motor: "Halftime recovery amount is 1/8 of player's maximum guts".) Un caso especial —Jun Misugi, personaje con problema cardíaco— recupera solo 1/16 y consume 1,5× lo normal. Nota de balance clásico y desbalanceado: los rivales controlados por la CPU tienen GUTS ilimitados y pueden spamear especiales.
- **Detalle:** un jugador "volado" por un choque/lesión pierde 64 GUTS (dato de CT3, mismo motor).

### 10. La sensación épica y dramática

Qué hace que se sienta épico en vez de "un simple menú":
- **Animaciones dedicadas de cada remate/movimiento especial:** cada especial tiene su animación propia; la pelota se deforma, gira, curva y hasta revienta la red. HG101: "cada movimiento tiene su animación particular y todas son deslumbrantes… la pelota se balancea, gira y se curva en todas direcciones". Este estilo over-the-top de tiros que deforman la pelota es tan icónico que, según HG101, "inspiró la película Shaolin Soccer".
- **El corte dramático:** el cambio de la vista de mapa a la toma cercana del rematador, el primer plano de la cara del jugador clave, el arquero volando.
- **El suspenso del azar:** como el pase/tiro se resuelve con stats + azar y no sabés los números del rival, hay tensión real de "¿llega o lo cortan?". Los rivales pueden "aparecer" a cortar tiros, y hay eventos de historia (goles automáticos, desbloqueo de nuevos tiros cuando el arquero te ataja 2-3 veces).
- **La música que cambia por contexto:** un tema cuando tenés la pelota, otro cuando la tiene el rival, y uno MÁS URGENTE en los últimos ~5 minutos del tiempo (HG101). Los equipos importantes tienen su propio tema, reforzando la tensión del partido. La banda sonora de CT2 fue compuesta por Keiji Yamagishi, Mayuko Okamura (música de las escenas cinemáticas) y Mikio Saito, e incorpora "Moete Hero", el tema del anime; la música cambia según qué equipo controla la pelota.
- **El tiempo de descuento impredecible (CT2):** finales de infarto defendiendo un resultado sin saber cuándo pita el árbitro.
- **La progresión RPG:** tus jugadores suben de nivel al ganar (y también al perder, aunque menos), lo que da sensación de campaña épica; podés reintentar partidos infinitas veces.

## Recommendations (para el diseño de PAMPA STAR)

**Fase 1 — Núcleo del motor (replicá esto primero):**
1. Implementá el bucle de doble capa: canvas de acción (arriba/grande) + radar en tiempo real estilo CT2 (abajo/franja fija). Mobile-first: acción a pantalla casi completa, radar como HUD persistente.
2. Control: cruceta virtual (o swipe/hold) que mueve SOLO al portador; avance "con propósito" (paso discreto cada ~tick). No dupliques el modelo CT1 sin radar de rivales: es frustrante.
3. Encuentro: al contacto de un defensor con el portador (o al tocar el botón de menú), congelá el tiempo y abrí un menú contextual de 4 direcciones por rol.
4. Resolución: duelo stat_atacante vs stat_defensor con azar ponderado + modificador piedra-papel-tijera (corte>pase, quite>gambeta, bloqueo>tiro) + bonus por GUTS. Mostrá solo los stats del jugador propio.

**Fase 2 — Sistemas de tensión:**
5. GUTS: costo por acción, especiales caros, "inutilización" bajo umbral, recuperación pasiva fuera de balón y recuperación de 1/8 del máximo en el entretiempo. Decidí si la CPU también gasta GUTS (recomendado que SÍ, a ~50% de costo como hizo CT5, para evitar el desbalance clásico de GUTS ilimitados de la CPU).
6. Reloj: cuenta regresiva que baja por acción (tick ~10s virtuales) + tiempo real durante la carrera; dos tiempos (elegí 30 min virtuales como CT2, o configurable); descuento impredecible señalado por el árbitro; entretiempo con recuperación de energía.
7. Animaciones de resolución con corte cinematográfico + primer plano; música que cambia por posesión y una pista "urgente" en los últimos minutos.

**Fase 3 — Profundidad y épica:**
8. Progresión tipo RPG (los jugadores suben stats), tácticas (formaciones 4-3-3/4-4-2/3-5-2/tipo Brasil, y defensa normal/press/contra), y movimientos especiales ORIGINALES (inventados por vos) con animación propia y costo de energía alto.
9. Eventos guionados (desbloqueo de un supertiro tras varios intentos, goles dramáticos) para el modo historia.

**Umbrales que cambian decisiones de diseño:** si los playtesters sienten el partido "pasivo/aleatorio" → adoptá control de defensor tipo CT2 pero con selección del más cercano (no ciclado numérico, que es el defecto reconocido de CT2). Si sienten que las figuras dominan de más → subí costos de GUTS y bajá recuperación. Si sienten poca tensión → reforzá música urgente + descuento impredecible.

## Caveats
- **Copyright:** las MECÁNICAS y la ESTRUCTURA de presentación (motor de comandos, doble vista, GUTS, duelos por stats) no son protegibles y podés replicarlas libremente. Lo prohibido son assets, sprites, personajes, nombres propios y nombres de movimientos específicos de Tecmo/Captain Tsubasa. Diseñá contenido 100% original.
- **Fuentes y precisión:** los valores de GUTS y stats provienen de guías de fans (GameFAQs, Neoseeker) y análisis de ROM; el cálculo EXACTO de probabilidad de los duelos nunca fue documentado oficialmente por Tecmo (los propios fans lo desconocen). Tratalos como referencia de diseño, no como fórmula canónica.
- **CT1 vs CT2 — diferencias relevantes de motor:** (a) radar completo en tiempo real en CT2 vs. radar ciego en CT1; (b) pase libre a cualquier zona en CT2 vs. 4 opciones en CT1; (c) control de defensor en CT2 vs. defensa pasiva en CT1; (d) tiempo de descuento en CT2 (inexistente en CT1); (e) pared/1-2 y más opciones de arquero en CT2. Recomiendo basar PAMPA STAR en CT2, que es el motor maduro.
- **Duración exacta (30/35 min) y fracciones de recuperación** vienen del manual japonés y análisis de ROM; ninguna guía en inglés lo afirma explícitamente, y algunos partidos podrían variar. El "45 minutos" pertenece a Captain Tsubasa IV, no a CT2.
- **Versión occidental:** "Tecmo Cup Soccer Game" (Tecmo, NES, 24 de septiembre de 1992) es el CT1 japonés con personajes cambiados (Tsubasa → Robin Field) y arqueros mucho más difíciles ("The quality of all goalkeepers in the game was dramatically upgraded, with some GKs… being able to stop the special shot of Robin", Wikipedia); mismo motor. CT2 nunca salió oficialmente fuera de Japón (existen fan-translations al inglés, español, turco, árabe y farsi).