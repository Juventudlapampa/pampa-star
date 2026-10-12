# El audio, la sincronía y la toma del remate (octubre 2026)

Dos pedidos de Rodri, en este orden:

1. *"Agregale cuando va a patear como que se frene o quede suspendido el jugador y haya un movimiento de la cámara, como enfocándolo en 3D, mientras va subiendo la pierna o bajándola, para darle más épica. Mejorale las dinámicas a todo el arte."*
2. A mitad de esa tanda: *"Lo probé al juego y ME DESCAJETASTE los audios. Miralos todos y acomodalos, en todas las instancias. Aparte está desincronizado el tema de tiros, de cuándo festeja goles, de que es azaroso las mecánicas de que a veces tiene animación y a veces no."*

Se hizo primero lo segundo, porque estaba roto lo que ya había.

## Cómo se midió: el oído de prueba

No puedo escuchar el juego. Por eso armé `.claude/oido.js` (no va al repo), que se carga en la página antes que el juego y hace tres cosas:

- **Desvía todo el audio a un analizador con ganancia 0.** La música y los efectos suenan para el juego (sus elementos reproducen, con su volumen), pero no salen por los parlantes. No se muteó el juego.
- **Usa un reloj virtual.** `setTimeout`, `setInterval` y el loop de Phaser avanzan juntos, así el pane oculto (que frena los timers reales) no falsea las medidas.
- **Registra cada sonido y qué se ve en ese cuadro:** la etiqueta del plano, el cartel y el estado. Además muestrea los `<audio>` cuadro a cuadro y anota cuando hay dos sonando a la vez.

Con eso, cada problema de abajo tiene su registro de antes y de después.

## Lo que estaba roto y cómo quedó

| # | Problema | Medido antes | Después | Commit |
|---|---|---|---|---|
| 1 | **Dos y tres temas a la vez.** El tema que sale baja en 300 ms y recién al final se pausa. Cualquier otro pedido mataba *todos* los fundidos, incluido el de salida, y el tema quedaba colgado para siempre. Al cambiar de escena pasaba siempre: el shutdown pide silencio y la escena nueva pide su tema en el mismo cuadro. | Volvés al master: "Under the Floodlights" sigue debajo de la espera. Vas al partido: "Low Light Protocol" sigue en loop todo el partido. | Entre temas solo queda el cruce de 300 ms. El test hace 15 de 15 con el reproductor nuevo y 3 de 15 con el viejo. | `15875d8` |
| 2 | **La mezcla.** La música tapaba casi todo. | Música -22 dB. Patada -25, silbato -29, afuera -32, whoosh -35, hinchada **-44** (no se oía). | Golpes -17/-18 (4 a 5 dB arriba de la música), silbato y afuera -21, hinchada -26, interfaz -31/-36. Limitador a -6 dBFS. | `ca2039a` |
| 3 | **Dos relojes.** Los tweens de Phaser miden con la hora de la pared; los `delayedCall` miden con el delta suavizado del loop, que descarta los cuadros de más de 200 ms. Con una traba (un fondo que se pinta, un teléfono lento) se separan. | Viaje de 1 s con una traba de 380 ms: la pelota llega a los 1027 ms y la red suena a los 1378 ms, **351 ms tarde**. | Llegan juntas, con un cuadro de diferencia fija. `scenes/reloj.js`. | `d89d068` |
| 4 | **La partitura del gol.** Medio juego festejaba el gol cuando lo *decidía*, antes de mostrarlo, y después lo volvía a festejar. | Cabezazo: la fanfarria **3 veces**, la primera con la escena recién entrando. Súper tiro: 3 patadas. Remate común: 2 patadas, 2 redes y 2 fanfarrias. | Patada en el contacto, red en el impacto, silencio, y fanfarria más hinchada al estallar. **Una vez cada una**, en los siete caminos. | `efdc985` |
| 5 | **"A veces tiene animación y a veces no."** Cinco salidas de duelo terminaban en un renglón de texto mientras la misma acción, en otra situación, tenía viñeta. Además, la viñeta del corte cobraba el presupuesto del trámite y duraba 0,6 s. | Quite y corte en el medio de la cancha, pared perdida, megacosa contra gambeta y megacosa contra tiro: todos en texto. | Toda acción resuelta tiene viñeta. El escalón decide solo si es rápida o entera. | `fc5f8aa` |

Detalles que salieron de las capturas y se arreglaron en el mismo commit que su punto:

- La silueta del "cuadro de impacto" del gol usaba la escala 2,4 del muñequito viejo. Con la ilustración de 853 px se veía solo un pedazo de short. Ahora se escala por el alto de la pantalla.
- Las notas de posesión sonaban 80 ms después de cerrar la escena del gol, encima de la fanfarria. Ahora hay un respiro de 1,5 s al volver de una escena.
- El gancho de shutdown se sumaba en cada reinicio de escena (`on` en vez de `once`).
- El mute dejaba el tema en volumen 0 al sacarlo, y no se aplicaba a los otros elementos.

## La toma del remate (`f07b46f`)

Unos 1,65 s en el remate común y 2,3 s en el súper tiro. Reemplaza la viñeta "EL REMATE" y, en el súper tiro, la carga y el plano del pie:

- **Entrada:** corte a la pintura. El jugador queda quieto en el aire, la música se va y el polvo queda flotando.
- **Carga:** la ilustración va montada en una malla 3D de Phaser. La cámara gira alrededor del jugador y se acerca, el fondo se corre al revés, la pierna sube para atrás doblando la rodilla y el cuerpo se echa atrás. Suena un riser que llega justo al golpe.
- **Golpe:** la pierna baja de golpe. La patada suena en el contacto (cuando la pierna pasa por la pose dibujada), con destello, congelado y temblor, y la pelota sale disparada desde el botín.
- **Final:** el pie queda arriba y se corta al viaje.

No hay dibujos nuevos ni coordenadas inventadas. Los huesos de la pierna (cadera, rodilla, tobillo y punta) se midieron sobre una grilla de 50 px de `pose_remate.webp`, y el radio del botín contando sus píxeles: llega a 100 px del hueso. Todo eso está en `data/poses_manifest.json`. `logic/pierna.js` hace la deformación en lógica pura, testeada en node.

Dos cosas que aparecieron en las pruebas:

- Phaser ubica la cámara de cada malla según el alto de **su** textura. La pelota es otra malla, y proyectaba 8 veces más chica hasta que se le dio la misma cámara que a la pose.
- Con el radio de la pierna, medio botín se quedaba atrás y se estiraba como una mancha. Por eso el botín tiene su propio radio.

## La cámara viva (`c247c72`)

"Mejorale las dinámicas a todo el arte", respetando la doctrina de que la pose no se anima. Mientras la pose se sostiene, la cámara se acerca. Las figuras se acercan más que el fondo pintado, que además se corre al revés (el paralaje de la cámara multiplano). En el silencio la cámara se clava, y en la revelación hay un golpe de zoom que entra y vuelve.

Vale para todas las viñetas, el cut-in de los especiales, el remate del rival y el pase.

## DECISIONES QUE TOMÉ YO

Cada una con su porqué y con cómo volver atrás.

1. **Los valores de la mezcla.** Elegí los números de `balance.audio_mezcla` por medición, no de oído; no lo puedo escuchar. Es la perilla más probable de tocar después de jugarlo.
   *Revertir:* poner todos los efectos en 1 (y el bus en 0,8). El limitador queda igual; no cambia nada mientras no se pase de -6 dBFS.
2. **Un solo reloj para todo el juego.** Es un cambio global: todos los tweens de todas las escenas miden con el delta del loop. Lo verifiqué en el partido, el master y la intro.
   *Revertir:* sacar la llamada a `PampaUnSoloReloj` del `postBoot` en `phaser/index.html`.
3. **El trámite con viñeta.** Va en contra del Bloque A, que decía que el quite del medio de la cancha no corta. Lo decidí porque Rodri lo reportó por cuarta vez como "azaroso". Calculo que suma entre 7 y 12 s de viñetas por partido.
   *Revertir:* `balance.drama.tramite_con_vinieta: false`.
4. **El gol: cartel en el impacto, fanfarria al estallar.** El cartel aparece con la red y la fanfarria llega después del silencio. Antes, en algunos caminos, el cartel salía después. La escena se queda abierta 900 ms después de la explosión.
5. **El respiro de 1,5 s para las notas de posesión y de campo** al volver de una escena. Lo que pasó adentro ya se contó.
   *Revertir:* el número en `respirar()` de `match.js`.
6. **La toma reemplaza la viñeta del remate y, en el súper tiro, la carga y el plano del pie.**
   *Revertir:* `flags.toma_remate: false`.
7. **Lo que la toma no toca:** la chilena y el cabezazo siguen con su viñeta, porque solo se midieron los huesos del remate. La definición tampoco cambia. Medir los huesos de esas poses es el paso siguiente si se quiere.
8. **Saltear la toma con un toque** adelanta el golpe, pero el riser que ya estaba programado termina de sonar (unos 0,7 s) encima del viaje. Un sonido sintetizado ya programado no se puede cortar sin rehacer el sintetizador.
9. **Vestir con nuestra camiseta las dos poses del rival** (unos 150 ms cada una) sigue pasando al arrancar el partido. Cae mientras está abierto el menú de tempo, que es una pantalla quieta, y con un solo reloj ya no desincroniza nada.

## Para Rodri

- **Jugalo con sonido y decime cómo queda la mezcla.** Todos los volúmenes salieron de mediciones; si algo suena fuerte o flojo, es un número en `balance.audio_mezcla`.
- **La toma del remate.** Fijate si la pierna que sube y baja se lee bien en el teléfono. Si querés que la chilena y el cabezazo también la tengan, hay que medir sus huesos (sin dibujos nuevos).
