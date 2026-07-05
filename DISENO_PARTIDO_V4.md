# DISEÑO — PARTIDO v4: LAS DOS CAPAS (dirigís la jugada, no manejás un muñeco)

> Documento de diseño para Claude Code, **en orden de implementación**. REEMPLAZA el motor de partido actual. Fuentes: playtest de Rodri, informe de arquitectura del motor "Cinematic Soccer" de Tecmo (CT2/NES como referencia madura) y PAMPA_STAR_FILTRO_INFORME.md. Regla de oro: replicamos MECÁNICA y ESTRUCTURA de presentación (no son protegibles); **jamás** assets, sprites, código, personajes, nombres de jugadores ni nombres de tiros de Tecmo/Captain Tsubasa. Contenido 100% original. Nunca menores; nada de apuestas.
>
> **No romper lo que ya anda alrededor:** temporada, vida y amigos, avatar con origen, data de tiros especiales, guardado retrocompatible. El save no conoce el motor: nada de eso debería tocarse.

## 0. El error de raíz y el fix

Las versiones anteriores hicieron un juego de "manejar UN muñeco con la cruceta" y le pegaron menús encima. El motor real es otro: **un RPG de fútbol cinemático de dos capas**. Abajo (o al costado), un radar del campo entero donde LEÉS la jugada y decidís; arriba, una vista de acción donde se VE el drama (el pibe corriendo, el cruce, el remate, el arquero volando). Movés con propósito, y cuando hay contacto el tiempo se CONGELA y elegís del menú. No hay reflejos: hay lectura, decisión y suspenso. La cámara no hace zoom analógico: hace **CORTES de escena estilo anime** entre las capas.

---

## 1. LAS DOS CAPAS DE VISTA (el corazón del fix — se construye primero)

### 1.1 Vista de acción (la protagonista)
- Ocupa casi toda la pantalla (mobile apaisado).
- Muestra **solo el drama actual**, nunca los 22: el portador corriendo en diagonal/frente a cámara con el fondo de césped en scroll (sensación de carrera), el rival que se le viene, el remate, el arquero.
- Defendiendo, muestra al rival que lleva la pelota (y a tu defensor controlado cuando se acerca).
- Pixel art original, paleta de DIRECCION_ARTE_SONIDO.md.

### 1.2 Radar (la lectura)
- **Franja fija, siempre visible** (inferior o lateral según pruebe mejor en apaisado; semi-transparente).
- Campo entero **bien dimensionado y proporcionado** (105×68 unidades lógicas internas), con líneas, áreas y círculo central.
- Los **22 jugadores en tiempo real**, como puntos numerados: claros = tuyos, oscuros = rival. El portador lleva una pelotita; tu jugador controlado, un brillo/marca.
- Es donde decidís: a dónde correr, a quién esquivar (ves el número del peligroso), a quién pasar.
- Es **superficie táctil**: tocarlo lo agranda a pantalla (modo apuntado, ver 4) o cambia de defensor (ver 5).

### 1.3 El flujo de escenas (cómo alternan)
- **Escena A — Planificación:** juego libre. Radar para leer + vista de acción con el portador corriendo. El reloj corre.
- **Escena B — El encuentro:** contacto → el tiempo se CONGELA, corte con acercamiento al cruce (los dos, cara a cara) y aparece el menú. Sin presión de reloj adentro del menú.
- **Escena C — Resolución animada:** elegido el comando, corte a una animación dedicada: la gambeta, el pase volando, el tiro con la pelota deformándose, el arquero estirándose. Acá vive la épica.
- **Escena D — Vuelta al campo:** se retoma A en la nueva situación, radar actualizado.
- Transiciones rápidas (barrido/flash pixel de 200–300ms), nunca cortes secos que desorienten. El ciclo A→B→C→D es el latido del partido.

## 2. MOVIMIENTO CON PROPÓSITO

- Controlás **un solo jugador a la vez**: en ataque, siempre el portador; en defensa, un defensor elegido (ver 5). El resto se mueve por IA de formación (activos cerca de la pelota, posicionales como escenografía viva).
- Control mobile: **mantener y arrastrar** en la mitad izquierda = dirección de carrera (stick virtual sutil, sin botonera nerviosa). El jugador avanza **lento y deliberado**; velocidad según stats. La gracia es colocarte para el próximo encuentro, no correr.
- Correr con la pelota drena Guts de a poco y hace correr el reloj: demorar cuesta. Sin pelota (tu delantero desmarcándose no se controla; eso lo hace la IA).

## 3. EL DISPARO DEL ENCUENTRO

- **Trigger automático:** un rival entra en el **radio de encuentro** del portador (constante tunable, arranque: ~2 unidades lógicas; escala levemente con la Defensa del rival). Congela + menú.
- **Quién intercepta:** el rival que hizo contacto. Si entran 2+ a la vez, lidera el de mayor Defensa y los demás suman una penalización de "doble marca" al atacante (data).
- **Trigger voluntario:** botón **"Jugada"** (derecha de la pantalla): abre el menú sin necesidad de rival — para tirar al arco, pasar o armar pared cuando estás libre.
- La cámara corta al cruce con acercamiento (escena B). El menú es de 4 opciones grandes, cómodas al pulgar.

## 4. EL APUNTADO

- **Pase:** elegís "Pase" → el radar se agranda a pantalla completa (todo pausado). Tocás **un compañero** o **un punto libre del campo** (pase al espacio). Se dibuja la trayectoria; si hay rivales cerca de la línea, se ven (el riesgo es legible). Confirmás → escena de viaje de la pelota con la tensión del "¿llega o la cortan?" (resuelta por Velocidad del receptor vs corte del rival + distancia). **El control pasa al receptor si llega.**
- **Tiro:** disponible solo en campo rival (los especiales pueden más, según su data). Al elegir "Tiro", el arco aparece en **6 zonas tocables** (3 columnas × 2 alturas). Esquinas y palos rinden más pero arriesgan salir afuera; al medio es seguro pero atajable. El arquero resuelve por fórmula: `Atajada = Atajar + (Potencia + Técnica)/4` contra la fuerza del tiro con **decaimiento por distancia y ángulo**.
- **Gambeta:** sin apuntado; si ganás el duelo elegís lado de salida (izquierda/centro/derecha).
- **Pared (1-2):** requiere un compañero cerca; lo tocás en el radar; la pelota va y vuelve sola, zafás de la marca. Cara en Guts, bonifica el duelo siguiente.
- **Pelota aérea en el área rival** (menú contextual alterno): Bajarla / Pase / **Dejarla pasar** (finta que desequilibra al arquero si atrás viene un compañero) / Volea o especial aéreo.

## 5. EL CAMBIO DE JUGADOR

- **En ataque:** controlás siempre al portador; el control **viaja con el pase**. No se cicla entre compañeros (así funciona el modelo: posicionás a los demás pasándola). Excepción: en córners y tiros libres podés **reposicionar** a tus jugadores en el área antes de ejecutar.
- **En defensa:** control libre de un defensor, de dos maneras: **botón "Cambio"** que selecciona al compañero **más cercano a la pelota** (fix del defecto reconocido del original, que ciclaba por número y era engorroso), o **tocando directamente un jugador tuyo en el radar**. Lo movés para cerrarle el paso al portador o pararte en la línea de un pase.
- **Auto-switch:** cuando el rival ejecuta una acción (pase, gambeta ganada), el control salta solo al defensor más cercano a la nueva situación.

## 6. EL RELOJ

- **Dos tiempos de 45 minutos virtuales.** El reloj avanza **a saltos**: +1' cada `SEGUNDOS_POR_MINUTO` de juego libre (constante afinable, **default 15**) y +1' por cada encuentro resuelto. NO corre durante menús, apuntado ni escenas de resolución.
- **Descuento impredecible:** al llegar a 45', el árbitro señala descuento y el tiempo sigue entre 1' y 4' extra al azar. No sabés cuándo pita: finales de infarto defendiendo un resultado.
- **Entretiempo:** pantalla simple de estadísticas; recuperación de Guts = **1/8 del máximo** por jugador; **el arquero solo recupera si le convirtieron** (regla nuestra del filtro, mantiene la tensión del asedio). No se cambia de lado: siempre atacás hacia la derecha (simplifica lectura y motor).
- **Eliminatorias empatadas:** alargue de 2×15 (recuperación previa de 1/4) y si persiste, **penales**: elegís zona del arco (3 opciones), el arquero elige la suya; stats + azar.

## 7. COMANDOS POR ROL (menús contextuales)

- **Con pelota (piso):** Gambeta / Pase / Pared / Tiro (+ **Especial** cuando corresponde, ver 8).
- **Defensa (marcando):** Quite / Corte de pase / Bloqueo / Aguantar (mantener marca y ahorrar Guts; permite que llegue un segundo marcador).
- **Arquero (en el clímax del tiro rival):** Atajar (retiene, más difícil) / Despejar (más seguro, deja rebote vivo). En centros: Salir a cortar / Esperar.
- **Resolución = duelo:** stat del atacante vs stat del defensor + azar, con la **matriz de ventajas**: el corte de pase le gana al pase, el quite le gana a la gambeta, el bloqueo le gana al tiro (y cada ataque esquiva a la defensa equivocada). Los Guts altos bonifican. **Solo ves tus stats, nunca los del rival**: adivinar la intención es el juego mental.
- **IA rival con perfiles** por jugador (agresivo entra, lector corta, cauto bloquea) para que la adivinanza tenga patrón y no sea ruido.
- Stats nucleares (ya existen, se reponderan): Ofensiva, Defensa, Velocidad, Potencia, Técnica.

## 8. GUTS (la economía del esfuerzo)

- **Todo cuesta** (valores nuestros, tabla data tunable): pase ~20, quite/corte ~50, pared ~60, tiro ~80, correr con pelota ~3 por tick, especiales 160–400 según jerarquía.
- **Umbral de rendido (~100):** por debajo, el jugador solo puede pasar y correr; conviene hacerlo descansar (la IA rival también lo explota).
- **Recuperación:** pasiva leve sin pelota; entretiempo 1/8 del máximo (arquero: solo si le convirtieron); antes del alargue, 1/4.
- **La CPU también gasta Guts** (al 75% del costo en categorías altas, 100% en las bajas): evita el desbalance clásico de la CPU con energía infinita.
- **Desgaste del arquero:** los tiros potentes le drenan Guts aunque ataje → el **asedio** (tirarle hasta cansarlo y liquidarlo con un tiro simple al final) es estrategia emergente legítima.
- **Megatiros contextuales:** el comando Especial aparece en el menú **solo si** (a) alcanzan los Guts y (b) la jugada cumple las condiciones de ese tiro (data por especial: el Caldén pide pase alto desde la banda llegando al área; otros piden racha de duelos ganados, o distancia concreta). Así se sienten ganados. Nombres pampeanos, siempre.

## 9. LA ÉPICA (por qué no se siente "un menú")

1. **Animaciones dedicadas por resolución**, sobre todo los especiales: cada uno con su animación propia — la pelota se deforma, toma comba imposible, revienta la red. Es la firma visual del género y es lo que el jugador espera.
2. **El corte dramático + primer plano:** cut-in del retrato pixel del rematador (y del arquero rival en atajadas heroicas) antes de la resolución.
3. **El suspenso del azar:** no conocés los stats del rival; el viaje del pase y el tiro siempre tienen un "¿llega?".
4. **La música por estado** (ya diseñada): tema de posesión, tema de amenaza rival, tema urgente en los últimos ~10', stingers de gol/atajada/especial.
5. **El descuento impredecible** (sección 6): la tensión de no saber cuándo pita.
6. **Gancho guionado para el modo historia:** si el arquero rival te ataja el mismo especial 2–3 veces en un partido, se desbloquea una variante más potente (evento raro, data). Semilla de progresión épica.

## 10. ORDEN DE BUILD (commit por etapa, en este orden)

1. **Las dos capas:** vista de acción + radar en tiempo real con los 22 numerados, campo 105×68, flujo de escenas A→D con transiciones.
2. **Movimiento + reloj:** arrastre del portador, IA de formación, reloj a saltos 45'/15s + descuento impredecible.
3. **Encuentros + comandos + matriz:** radio, triggers automático y voluntario, menús por rol, duelos stats+azar+matriz, perfiles de IA.
4. **Apuntado:** radar ampliado para pases (compañero o espacio), arco en 6 zonas, gambeta con lado, pared, viaje de la pelota con tensión.
5. **Guts + especiales contextuales:** economía completa, desgaste del arquero, CPU que gasta, condiciones de habilitación, cut-ins y animaciones dedicadas.
6. **Cambio de jugador defensivo + pulido:** botón "más cercano", toque en radar, auto-switch, balance general (radios, costos, duración), partido completo de punta a punta.

## 11. FUERA DE ALCANCE DEL v4

Identidad (intro/logo/título/transiciones de menú) y comentarista: capa de presentación (Prompt 2). Tácticas defensivas seleccionables (normal/presión/contragolpe), Work Rate atado a Guts y rasgos de amigos: capa de balance posterior. Empaquetado ejecutable: etapa final.

## 12. CONTROL DE PLAYTEST (las preguntas que definen el v4)

¿Sentís que dirigís la jugada leyendo el radar, y no que manejás un muñeco? ¿El corte a la vista de acción pone la épica (el cruce, el remate, el arquero)? ¿Los encuentros tienen juego mental (adivinar al rival importa)? ¿El apuntado de pase en el radar y el arco en 6 zonas van bien al dedo? ¿Llegás a los megatiros y se sienten ganados? ¿45'/15s con descuento va, o ajustamos el tick? Umbrales acordados: si se siente pasivo/aleatorio → reforzar control defensivo; si las figuras dominan → subir costos de Guts; si falta tensión → más música urgente y descuento.
