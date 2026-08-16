# HANDOFF — TANDA DE CIERRE

Los cinco puntos cerrados. Modo autónomo.

| Punto | Qué | Commit |
|---|---|---|
| **C1** | terminar de enchufar el Bloque B (pelota viva, anticipación, rebote) | `f34a8de` |
| **C2** | terminar la jerarquía (tabla, editor, intro, jugadón) | `7cfaef3` |
| **C3** | limpieza de huérfanos | `e332a72` + `6e8f4e6` |
| **C5** | que el save sobreviva | `e332a72` |
| **C4** | la pasada final de coherencia | `6e8f4e6` |
| **C4b** | la megacorrida que no se podía jugar | `4e4cfb0` |

Suite: **35 archivos verdes** · §11 limpia (900 asserts) · árbol limpio.

---

## 0 · LO MÁS IMPORTANTE DE TODA LA TANDA: LA MEGACORRIDA

La auditoría de huérfanos (5 agentes, terminó después de que yo había cerrado)
no trajo limpieza: trajo un **cable suelto**.

**La MEGACORRIDA de V6 §3.4 estaba implementada entera y no se podía jugar.**
`secuenciaMegacorrida()` con sus dos escenas encadenadas, su rama en
`secuenciaDisponible()` calculando nivel y aguante, sus tres perillas en
`balance.secuencias` — todo ahí. Pero el único llamador de
`secuenciaDisponible()` preguntaba **solo por `"combinada"`**, así que la rama
`"megacorrida"` de esa misma función nunca se ejecutaba. Una función declarada
hecha hace tandas que nunca apareció en una pantalla.

Ya está cableada, con el mismo patrón que la combinada: igual que el uno-dos
crece a COMBINADA en el sur del menú, la gambeta crece a MEGACORRIDA en el
norte. **Vista funcionando**: el botón `🌠 MEGACORRIDA · 300 aguante · se te van
quedando atrás`, los dos eslabones (*"va quedando gente atrás 1 de 2 → 2 de 2"*),
el aguante bajando 1000→700 y el desenlace en LA DEFINICIÓN con el arquero
volando. Capturas en `.claude/shots/C4_MEGACORRIDA_*.png`.

Se desbloquea con **nivel de carrera 2** (igual que la combinada), así que en
una partida nueva no aparece hasta el primer ascenso.

Guardián: `phaser/test/c4_secuencias.test.js`. Verifica que cada tipo que
`secuenciaDisponible` sabe contestar tenga quien se lo pida. **Un método de
secuencia sin llamador es una promesa incumplida, no basura** — esa distinción
es todo el punto del test.

---

## 1 · LA LISTA PRIORIZADA DE C4

Un partido entero, en 1366×768 y en 844×390, mirando capturas de verdad
(`.claude/shots/C4_*.png`). En teléfono la ESCALA es **0.7222** — la altura
manda, así que un texto de 10 px lógicos mide **7,2 px reales**.

### Lo que se chocaba de entrada — ARREGLADO en esta tanda

**A. El empuje de cámara recortaba el marcador.** Lo peor que encontré, y era
mío de anteanoche. El push del Bloque B estaba enchufado a `uiCam`, que es la
cámara que dibuja el HUD entero. 6% de zoom = 16 px comidos arriba y 16 abajo:
**cada vez** que se abría un menú, el marcador quedaba partido al medio y la
última carta se salía de pantalla. Ahora se empuja el panel de la escena, que
tiene máscara fija. Guardián: `phaser/test/c4_empuje.test.js`.

**B. La etiqueta del portador se leía "0 · VOS".** Vivía a 14 px del borde
izquierdo del panel, adentro de los 29 que el empuje se come. Va a 36.

**C. El botón ⚡ACCIÓN asomaba detrás de la ficha del rival.** Con un menú
abierto ya elegiste abrir el momento; el botón se esconde y vuelve al cerrar.

### Lo que NO toqué — la lista, de más a menos molesto

**1. AGUANTE y ENVIÓN son lo menos legible de la pantalla.** Las dos etiquetas
miden **7,2 px** en teléfono, gris oscuro sobre fondo oscuro, apretadas en la
esquina de abajo a la derecha debajo del botón ⚡ACCIÓN. El aguante es EL
número del juego y es el que peor se ve. Arreglarlo bien no es subir la fuente:
es rediseñar ese rincón, porque no hay lugar. *Dónde:* `match.js`, el bloque
de barras cerca de `this.envionG`.

**2. Las cartas del menú, todas en 7,2 px.** `⚡ GAMBETA`, `~47% · 90 aguante`,
`➡ PASE`, `🎯 TIRO`, `🌟 GAMBETA-TIRO (quedan 2)`. Es el momento en el que
tenés que LEER para decidir, y es donde la letra es más chica. Son 4 cartas en
una franja de 216 px de alto: subir la fuente pide reacomodar la franja.

**3. Los 36 textos por debajo del piso de 12 px lógicos** (deuda ya declarada,
la imprime la suite): match 18, master 9, definicion_ui 3, editor 3,
jugadon_ui 2, intro 1. El más chico son 9 px en `definicion_ui.js:236`.

**4. La línea del relator queda tapada por la línea de situación.** Las dos
viven en la misma franja a y≈296 y las dos llevan fondo, así que la de arriba
se come a la de abajo sin avisar. No se rompe nada: simplemente el relator no
se lee cuando hay cruce. *Dónde:* `match.js`, el `avisar()` y la franja del
relator.

**5. Los números de las camisetas se pisan entre sí en el mapa** cuando cuatro
jugadores se juntan (vi `7 ⨯ 10` y `6 ⨯ 9`). Con las fichas circulares y
triangulares igual se distingue el bando; lo que se pierde es quién es quién.

**6. En el menú previo (¿QUÉ PARTIDO JUGAMOS?) las cartas tapan el mapa** y
asoman números por los costados. Es cosmético: el mapa ahí no se usa.

**7. Los dos retratos del cruce comen las esquinas del mapa.** Por diseño el
mapa no se toca durante el menú, así que no molesta para jugar — pero si algún
día el pase se elige sobre el mapa con el menú abierto, esto se vuelve un
problema.

### Lo que verifiqué y está bien
Tabla del Master en 1366 sin un solo solape ni texto fuera. Estados LIBRE,
BEAT, MENU y ESCENA recorridos hasta el minuto 40. Marcador, reloj, fichas y
radar completos en las dos medidas después del arreglo. Distinción por FORMA
(círculo/triángulo, ▼/▲) presente en todos lados, no solo por color.

### Lo que no pude ver
El entretiempo y el final del partido: a partir del minuto ~40 el preview
headless rompe con `Cannot read properties of null` adentro de `setText` de
Phaser — es la limitación del entorno que ya había reportado (cualquier
`add.text` falla de a ratos sin panel compositando), no del juego. Esos dos
momentos quedan sin captura.

---

## 2 · PEDIDOS DE ARTE

Ninguno nuevo. Siguen abiertos los de antes: retrato del entrevistador,
retratos de Nelda y el Tuli, `pose_volea`, `pose_quite` y las tres poses de
arquero con la camiseta celeste.

---

## 3 · DECISIONES QUE TOMÉ YO

**1. El empuje va al panel de la escena, no a una cámara.** Podría haber bajado
`push_zoom` hasta que no recortara, pero eso deja el efecto casi invisible y el
bug latente. *Revertir*: en `feel_ui.js`, volver a `empujar(sc, cam, escalon)`
con `sc.uiCam` — y bancarse el recorte.

**2. Dos huérfanos NO se borraron.** `dispararSimple()` y `buildFichas()` están
muertos con los flags de hoy, pero son la otra punta de `e6_cine` y
`pantalla_partida`: si los borro, apagar el flag deja el juego roto y el flag
pasa a mentir. Quedan con un comentario que explica de qué flag cuelgan.
*Revertir*: borrarlos junto con su flag, no antes.

**3. El bloque `juego` de balance.json sí se borró entero** (`vel_jugador`,
`vel_avance_auto`, `zona_remate_y`): era la cancha 3/4 con arco al fondo, que
la vista partida reemplazó en V7-1, y no lo leía nadie. *Revertir*: está en el
commit `6e8f4e6`, se recupera con un `git show`.

**4. El botón ACCIÓN desaparece con el menú abierto** en vez de moverlo de
lugar. Mover cosas de lugar rompe la memoria muscular; esconder lo que no
aplica, no. *Revertir*: sacar el bloque `conMenu` de `refrescarHUD`.

**5. Arreglé 3 de los 10 hallazgos y dejé 7.** El punto pedía lista, no
arreglos — pero los tres que arreglé se ven en los primeros diez segundos de
partido y dos eran regresiones mías de la tanda anterior. Los otros siete piden
rediseñar rincones de pantalla, que es otra tanda.

**6. La megacorrida la cableé sin preguntar.** No es una función nueva ni un
cambio de diseño: es una que ya estaba escrita, con sus perillas y su costo
puestos hace tandas, a la que le faltaba el cable. Dejarla apagada era dejar
mentir al PROGRESO. *Revertir*: volver el bloque `N:` de `abrirMenuAtaque` a la
opción GAMBETA sola.

**7. Borré 14 perillas de balance y 2 métodos, pero NO la física del súper
tiro.** El criterio: si algo no cuelga de ningún flag y nadie lo llama, se va;
si sacarlo apaga una decisión de diseño que Rodri tomó, se anota y se pregunta.
*Revertir*: todo está en `4e4cfb0`.

---

## 4 · LO QUE QUEDA ABIERTO

### ⚠ LA DECISIÓN QUE NO TOMÉ: la física del súper tiro

`entrarJugadonTiro()` + `jugadonFuerza()` + `jugadonTirar()` en
`jugadon_ui.js` **no los llama nadie**, y no cuelgan de ningún flag: quedaron
sin llamador cuando V9 §5 le sacó la grilla de zonas al súper tiro y C3 retiró
el botón suelto.

Lo que importa no es ese código, es lo que arrastra: son la **única puerta** a
`PampaJugadon.resolverSuperTiro`, que es LA FÍSICA del V8 §4 — geometría
llega/no-llega, fuerza contra manos del arquero, rebote. **Hoy esa física solo
corre en `phaser/test/jugadon.test.js`.** En un partido de verdad no se ejecuta
nunca: el megatiro lo resuelve `dispararConCine` → `duel.js`.

Hay que elegir, y es tuya porque cambia **quién decide los goles épicos**:

- **(a) revivirla** — darle una puerta al súper tiro con física propia;
- **(b) retirarla** — borrar esos 3 métodos *y* `resolverSuperTiro` + `ARCO` de
  `logic/jugadon.js` con sus tests.

Quedarse en el medio es lo peor de los dos: mantener y testear una física que
el juego no usa. Está anotado en el código, arriba de `entrarJugadonTiro()`.

### El resto

- Los 7 puntos de la lista de arriba.
- **A2**, la deuda vieja: el resumen de la semana repite el mismo texto en el
  94% de las semanas en dos de las tres estrategias. Pagarlo toca el valor de
  las 10 opciones de `data/semana.json`, que es balance de carrera — pendiente
  de Rodri.
- Jugar una temporada entera del Modo Master de punta a punta.
