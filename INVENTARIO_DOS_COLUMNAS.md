# INVENTARIO — LAYOUT DE DOS COLUMNAS (8/ago)

Lo que pediste antes de mover nada. Cinco frentes, uno por condición (D1-D5).

---

## EL TITULAR: SON DOS PROBLEMAS, NO UNO

**Dos columnas NO agranda un solo píxel de texto.** Con `Scale.FIT` la escala la
manda el ALTO: 390/540 = 0,7222 en un teléfono, y sigue siendo 0,7222 aunque el
lienzo pase a 1170×540. Lo único que compran las dos columnas son ~210px lógicos
de ancho (+22%) y la vertical que se libera.

Eso separa lo que veníamos tratando como una sola cosa:

| | qué lo arregla |
|---|---|
| **La figura se ve chica** (lo que viste) | dos columnas — la figura deja de compartir el alto y pasa de 152 a ~335 px reales |
| **Los números del mapa no se leen** (lo que encontró el inventario) | subir el tamaño; las columnas no lo tocan |

---

## D3 · EL PISO DE LEGIBILIDAD, Y UN BUG QUE YA ESTÁ ACTIVO

Pediste fijar un piso. El piso es **16 px lógicos** para el número de camiseta.
Hoy son **9**, y eso no es "chico": está por debajo del umbral de RESOLUCIÓN.

Los números, medidos:

- 9 px lógicos → **6,5 px reales** a 844×390.
- Altura de mayúscula real **4,55 px** (Pixelify Sans tiene capHeight 0,700 em,
  medido del TTF) → **5,8 minutos de arco** a distancia de brazo. El umbral de
  agudeza 20/20 es 5 arcmin: está en el límite de lo que el ojo resuelve, con
  cero margen para movimiento o vista cansada.
- El trazo del dígito mide **0,65 px reales**. Con `pixelArt: true` el navegador
  baja 960→693 con nearest-neighbour y **descarta filas enteras**: no es que se
  vea chico, es que se le caen trazos y el 8 y el 6 se vuelven la misma mancha.
- Y aparte: dos dígitos miden 10,55 lógicos sobre un círculo de 11 de diámetro,
  así que **el número ya se pinta afuera de su ficha**.

Esto pega justo en la regla de daltonismo del proyecto, que dice que en el mapa
te reconocés por el número tanto como por el color. Si el número no se resuelve,
el color queda solo.

**Dos criterios independientes convergen en 16:** por agudeza (10 arcmin de cap
para lectura al vuelo) sale ≥15,5 lógicos; por trazo (≥1 px real para sobrevivir
el downscale) sale ≥13,9.

Dato relacionado: **ningún botón del juego llega al piso táctil de 44 CSS px**
—haría falta 61 lógicos y el más alto es 54— y casi ningún texto llega a 12 CSS
px (haría falta 17; el cuerpo está en 10-14).

---

## D1 · EL DISPARO Y EL RESIZE

- **Listeners de resize en el proyecto: cero.** Hay que crear el enganche.
- El evento `RESIZE` de Phaser **sirve como disparador, no como dato**: en FIT
  `gameSize` y `baseSize` son siempre 960×540 y `displaySize` conserva 16:9.
- **`scale.parentSize` es el único** que refleja el viewport real (probado:
  parent 1100×500 → parentSize 1100×500, ratio 2,2). Con una guarda obligatoria:
  cuando la media query de portrait pone `#game` en `display:none`,
  `parentSize` se va a **0×0** y el ratio da **NaN**.
- **`Phaser.Scale.Events.ORIENTATION_CHANGE` está muerto** acá:
  `updateOrientation()` calcula con `gameSize`, así que siempre dice
  "landscape-primary" aunque el viewport esté en vertical. No sirve.
- Para USAR el ancho extra hay que `scale.setGameSize(1170, 540)` en caliente.
  Probado en vivo: las barras casi desaparecen.
- **Trampa del listener zombie**: el ScaleManager es del GAME, no de la escena.
  Si se engancha en `create()` sin desenganchar en `shutdown`, cada
  `scene.restart()` (el botón "↺ OTRO PARTIDO") deja un listener apuntando a una
  escena muerta.
- La media query de `index.html:32` (portrait + 820px) ya es un umbral de
  proporción: tiene que entrar en la misma tabla que el 1,95, no quedar suelta.

## D4 · ROTAR EN CALIENTE

`this.st` es **data pura sin una sola referencia a Phaser** (los 22 jugadores,
pelota, minuto, goles, envión, fichas), así que rehacer los visuales dejando el
estado intacto es viable.

Pero **no se puede cambiar `_split` en caliente y ya**: `buildFichas()` y
`buildPanelEscena()` solo corren en `create()`, así que quedaría pantalla negra
o cancha vacía. Y si se reconstruye a mano hay que ocuparse de: los **36
`delayedCall` en vuelo** y ~30 tweens que quedan apuntando a objetos destruidos,
los caches `_hudMarc/_hudDiv/_hudReloj/_hudGuts/_hudEnvion/_hudFichas` que dejan
los textos vacíos hasta que el valor cambie, el tween infinito `_btnPulso`, y
`this._def`/`this._jg` que apuntan a sprites de `cineContent`.

## D5 · LOS SAVES ESTÁN A SALVO

Ninguna de las 10 claves de localStorage guarda un dato de vista, y `_split` es
runtime puro (una asignación en `match.js:93`, sin bloque `flags` que lo pise,
sin UI que lo cambie, sin serialización). Para que siga siendo así: no persistir
la elección de layout dentro de `pampa_star_v1` ni `pampa_master_v1` — si hay
que recordarla, clave propia, como ya hace `pampa_tempo`.

---

## D2 · QUÉ SE ROMPE — 55 elementos

**7 de riesgo alto** (mover mal rompe la jugabilidad),
28 medio, 20 bajo.

### Riesgo alto

| Qué | Dónde | Hoy | En dos columnas | Riesgo |
|---|---|---|---|---|
| ESCENA · LA MÁSCARA de recorte del panel (createGeometryMask) | `phaser/scenes/match.js:644-648` | mkPanel.fillRect(0, 30, 960, (VI.panel_fin_y ?? 304) − 30) → recorta a x 0..960, y 30..304. Se guarda en this._panelMask | Es la pieza estructural del layout nuevo: en dos columnas la máscara pasa de ser una banda horizontal a ser un rectángulo alto, y es lo único que impide que las siluetas y la figura se derramen sobre el mapa y el HUD. Tres cosas: (1) hay que darle x e y de la columna, no solo el alto; (2) si agregás | alto |
| MAPA · geometría base rw/rh/rx/ry | `phaser/scenes/match.js:952-954` | split: rw=620, rh=198, rx=105, ry=322 → ocupa x 105..725, y 322..520. Se guarda en this.radar = {x,y,w,h} | Estas CUATRO líneas son el punto de verdad del mapa entero: marco, zona táctil, los 22 números, TU ARCO, los cuadrados del pase, radarAMundo, el guard de apuntar y el anillo del tutorial derivan todos de this.radar. Cambiás los cuatro números y el mapa se muda solo. El comentario de la línea 950 avi | alto |
| MAPA · zona interactiva (radarZona) | `phaser/scenes/match.js:970-976` | zone(rx + rw/2, ry + rh/2, rw, rh).setInteractive() · su pointerdown hace stopPropagation y setea _uiTocado | Se muda solo. Lo importante es que NO se puede achicar por debajo del rect visible del mapa: si la zona queda más chica que el dibujo, hay una franja donde ves cancha y el toque se te va a onCanchaTapPase (ver el ítem del toque en PASE). | alto |
| MAPA · los 22 números de camiseta | `phaser/scenes/match.js:964 (creación) · 3130 y 3162 (posició` | text de 9px, origin(0.5), color elegido por LUMA de tu camiseta (3152-3155) · se posicionan sobre cada ficha con mx()/my | La posición se muda sola. El PROBLEMA es el cuerpo: 9px sobre un mapa de 620px ya es chico; en una columna derecha de ~300px las fichas se solapan y los números se vuelven ilegibles. Y como el mapa distingue bando por FORMA + NÚMERO (no por color), perder el número es perder la lectura del mapa. Si  | alto |
| MAPA · el guard de navegación en apuntar() | `phaser/scenes/match.js:3410-3415` | if (this._split) { si el toque cae dentro del rect de this.radar → this.target = radarAMundo(p); return; } | Se muda solo con this.radar, pero es EL punto donde se rompe la jugabilidad si algo queda desalineado: si el rect que testea acá no coincide con el mapa que se dibuja, el jugador deja de correr y no hay ningún error en consola. Verificalo primero, antes que nada cosmético. | alto |
| SUELTO · el toque en estado PASE cae en onCanchaTapPase | `phaser/scenes/match.js:282 (el handler) y 916-929 (la funció` | if (this._vista4 && this.estado === 'PASE') → onCanchaTapPase(p), que usa this.cameras.main.getWorldPoint sobre el mundo | Riesgo de jugabilidad puro, no de píxeles: apuntando un pase, cualquier toque fuera del mapa (o sea toda la ilustración) confirma un pase con un destino calculado sobre una cámara que no se está viendo. Hoy queda medio disimulado; con una columna izquierda grande y alta, la mitad de la pantalla pasa | alto |
| TUTORIAL · los ANILLOS que señalan (el que apunta al botón de ACCIÓN) | `phaser/scenes/match.js:1206-1207` | [null, {x:838, y:456, w:210, h:90}, (_vista4 ? null : caja del radar)] — el paso 2 tiene el 838,456 COPIADO a mano del b | Es una duplicación explícita de la posición del botón de ACCIÓN. Si movés el botón y no esto, el anillo señala un lugar vacío en el primer partido de cada jugador nuevo — y como el tutorial se ve UNA sola vez, no lo vas a notar probando (hay que borrar tutorialPartido del save para volver a verlo).  | alto |


### Riesgo medio

| Qué | Dónde | Hoy | En dos columnas | Riesgo |
|---|---|---|---|---|
| ESCENA · tribuna (tileSprite con parallax, o rect de reserva) | `phaser/scenes/match.js:607-609 (fallback en 612)` | tileSprite(480, 121, 1920x90) con tileScale .5 y tilePositionY 270 → cubre y 76..166 · fallback rect(480, 121, 960x90) | El 1920 es 'dos veces el lienzo' para que el wrap de la baldosa espejada no se vea. Si la columna es más angosta, el 1920 sobra pero no molesta; lo que sí hay que mover es el centro (480) y revisar que el ancho siga siendo ≥2x el de la columna. El tilePositionY 270 elige QUÉ franja del PNG se ve: si | medio |
| ESCENA · LA HINCHADA VIVA (26 siluetas que respiran, se agitan y estallan) | `phaser/scenes/escenas_v9.js:93-106 (dibuja en 120-129)` | y0 = balance.vista.hinchada.y = 108 · x = 14 + k*(932/26) + (k%2)*8 → x 14..~950 · las posiciones se calculan UNA vez y  | El y sale de balance (fácil) pero el ANCHO (el 932 y el 14) está clavado en el código y asume el lienzo entero. En dos columnas te queda media hinchada cantando arriba del mapa. Hay que pasarle el ancho del panel (o leer la geometría del panelLayer). Además la clave 'hinchada' NO está en el BALANCE_ | medio |
| ESCENA · EL VELO DE FOCO (oscurece el fondo cuando el protagonista actúa) | `phaser/scenes/match.js:634 (se anima en velarPanel, 691-698)` | rect(480, 176, 960x232) fillAlpha 1 con el objeto en alpha 0 → sube a balance.vista.panel_velo_alpha (0.45) fuera de LIB | CRÍTICO de cosmética: 960x232 clavado. En dos columnas se derrama sobre el mapa y el HUD y los oscurece cada vez que abrís un menú. Tiene que tomar exactamente la caja del panel. Ojo con el truco documentado en el comentario: el fillAlpha va en 1 y el alpha del objeto en 0 — si lo reescribís con fil | medio |
| ESCENA · LA FIGURA (panelJug): posición, escala y anclaje por los pies | `phaser/scenes/match.js:657 (encuadre en 784-788, bob y zanca` | x = vista.panel_figura_x = 400 · y = vista.panel_suelo_y = 278 · origin(0.5, 1) · alto = (panel_suelo_y 278 − panel_tech | Este es el que MENOS duele: los cuatro números son diales de balance.vista y con cambiarlos ahí la figura se muda sin tocar código. PERO: el encuadre solo se recalcula cuando CAMBIA la textura (784: 'if (key && this.panelJug.texture.key !== key)'). Si tocás los diales en caliente no pasa nada hasta  | medio |
| ESCENA · las SILUETAS de rivales cercanos (pool de 3) | `phaser/scenes/match.js:651-655 (se ubican en 835-838)` | x = 430 + clamp(dx, ±260)*1.3 → puede ir de x=−8 a x=768 · y = 236 + clamp(dy*0.25, −34, +40) → 202..276 · alto hasta 12 | El peor de todo el panel: cinco literales (430, 260, 1.3, 236, 120) y ninguno en balance. El 430 es 'el centro de la figura' pero está escrito aparte del panel_figura_x=400, o sea que ya hoy están 30px desfasados. En dos columnas se van a salir de la columna por el costado derecho — y de ahí la másc | medio |
| ESCENA · franja de texto + nombre del portador + etiqueta ▼ 10 · VOS | `phaser/scenes/match.js:666 (franja) y 668 (texto); el string` | franja rect(480, vista.panel_franja_y = 292, 960x24, alpha .82) → y 280..304 · texto en (14, 292) origin(0, 0.5) · el st | La y es dial, el ancho no. La franja de 960 se va a comer el pie del mapa. Y el x=14 del texto es 'margen izquierdo del lienzo' → pasa a ser margen de la columna. Cuidado: panel_suelo_y (278) está calibrado para que los pies apoyen JUSTO ARRIBA de esta franja (es el fix P8 documentado en balance) —  | medio |
| MAPA · etiqueta 'TU ARCO' (◄ o ►, cambia en el 2T) | `phaser/scenes/match.js:3078-3086` | text 10px en (R.x + 3, R.y + 3) origin(0,0) si atacás a la derecha, o (R.x + R.w − 3, R.y + 3) origin(1,0) si te diste v | Se muda solo. Único cuidado: si el mapa se angosta, esta etiqueta (que mide ~60px) se come una porción grande de la esquina y puede taparte fichas del área. Con un mapa angosto conviene sacarla ARRIBA del marco en vez de adentro. | medio |
| MAPA · cuadrados amarillos de receptores del pase | `phaser/scenes/match.js:3166-3170 (y el gemelo sobre la canch` | strokeRect(x−9, y−9, 18, 18) · grosor 3 si es el elegido con teclado, 1.5 si no | El 18px fijo es el problema si el mapa se achica: los cuadrados de dos receptores cercanos se van a fundir en una mancha. Escalar el 18 con R.w (por ejemplo R.w/34). | medio |
| COLUMNA · botón ⚡ ACCIÓN (container + rect + texto + pulso) | `phaser/scenes/match.js:1104-1113` | container(838, 456) con rect 188x68 · con el pulso al 106% ocupa x 743..933, y 422..490 · el comentario de 1099-1103 doc | Es el ancla de toda la columna derecha (838). Al ser un container, moverlo es UNA línea y los hijos lo siguen — el más fácil del bloque. Pero acordate del margen: el ancho real es 188 × 1.06 + 5 de sombra ≈ 204px, así que la columna necesita ≥210px útiles o el botón se sale igual que antes. | medio |
| COLUMNA · botón ⇄ OTRO (cambio manual de marcador en defensa) | `phaser/scenes/match.js:1125-1126 (visibilidad en 3322-3325)` | rect(838, 396, 92x48) + texto(838, 396) · visible solo en LIBRE con posesión rival · vive en el array this._btnCambiar | OJO: comparte la coordenada EXACTA (838, 396) con el botón POTENCIAR. Hoy no chocan porque son mutuamente excluyentes por visibilidad (uno es defendiendo, el otro atacando), pero son dos objetos distintos con el mismo número escrito en dos lugares del archivo. Si movés uno y no el otro no lo vas a n | medio |
| COLUMNA · botón 🌟 POTENCIAR (gastar el envión) | `phaser/scenes/match.js:3214-3218 (visibilidad en 3342-3345)` | rect(838, 396, 150x48) + texto(838, 396) · visible solo con envión lleno atacando · array this._btnEnvion | Ver el ítem de ⇄ OTRO: misma coordenada, otro tamaño (150 vs 92). Se mudan de a dos. | medio |
| COLUMNA · etiquetas y números de ENVIÓN y AGUANTE | `phaser/scenes/match.js:3202-3209` | lblEnvion(754, 500) · lblGuts(754, 522) · txtEnvion(948, 500) origin(1,.5) · txtGuts(948, 522) origin(1,.5) | Todos leen MEDIDORES. Se mudan solos. Lo único a revisar: la fila mide 194px de punta a punta (de xEtq 754 a xNum 948) — si la columna se angosta, ETIQUETA·barra·NÚMERO en una sola línea deja de entrar y hay que apilar (etiqueta arriba, barra+número abajo). | medio |
| COLUMNA · estado del envión ('⚡ EN USO' / '🌟 LLENO') | `phaser/scenes/match.js:3212 (se pinta en 3340-3341)` | text(754, 480) 10px amarillo — el ÚNICO del bloque que NO usa MEDIDORES: el 480 está escrito a mano | Es la fuga del objeto MEDIDORES. Movés MEDIDORES y este se queda solo arriba. Metelo al objeto como 'yEstado' antes de mudar nada. | medio |
| SUELTO · el ✕ de cancelar el PASE | `phaser/scenes/match.js:2862-2865` | cx = 906, cy = 306 (rama _vista4, que es la que corre) · rect 56x48 + texto ✕ · vive en menuLayer | El (906, 306) es una esquina que en el layout nuevo probablemente ya no exista como hueco. Va junto al mapa (es lo que cancela el pase que se apunta ahí): anclalo a radar.x + radar.w + margen, radar.y. | medio |
| SUELTO · el ✕ de volver del MENÚ EN CRUZ | `phaser/scenes/match.js:1389-1390` | rect(906, 306, 64x48) + texto ✕ — MISMA coordenada que el ✕ del pase, distinto tamaño (64 vs 56) | Segundo literal 906,306 en otro lugar del archivo. Son dos ✕ que quieren estar en el mismo lugar y se escriben por separado. Unificalos en el LAY antes de mudar o vas a mover uno solo. | medio |
| SUELTO · hint del PASE ('tocá el DESTINO en el MAPA…') | `phaser/scenes/match.js:2850-2858` | split: (radar.x + radar.w/2, radar.y − 14) origin(0.5, 1) — o sea, pegado ARRIBA del mapa | Se muda solo con el mapa. PERO el texto mide ~600px a 10px: si el mapa pasa a una columna angosta, el cartel se sale por los dos costados. Hay que acortar el texto o agregarle wordWrap al ancho del mapa. | medio |
| SUELTO · el ticker del RELATOR | `phaser/scenes/match.js:3233 (se pinta en 353-359)` | text(480, balance.relator.y = 300) origin(0.5) · wordWrap 560 · depth 50 · fondo #0a1f13dd | La y es dial pero el x no. Hoy vive en la franja libre entre el panel (termina en 304) y el mapa (empieza en 319) — esa franja DESAPARECE en dos columnas. Es la decisión de diseño más importante del bloque suelto: ¿el relator va abajo de la escena, abajo del mapa, o en la columna? Además: la clave ' | medio |
| SUELTO · el MENÚ EN CRUZ (strip, título y las 4 direcciones + centro) | `phaser/scenes/match.js:1354-1385` | strip(480, 404, 960x216) → y 296..512 · título(480, 306) wrap 660 · N(480,352) S(480,458) W(318,405) E(642,405), botones | Es un overlay que ocupa la mitad de abajo del lienzo ENTERO — hoy tapa el mapa entero (322..520) mientras decidís. Con dos columnas hay una pregunta nueva: ¿la cruz sigue siendo full-width tapando todo, o se mete en la columna izquierda (bajo la escena, que es donde está el drama) dejando el mapa a  | medio |
| SUELTO · los PANELES DE RETRATO del duelo (izq y der) | `phaser/scenes/match.js:1080-1092, llamados desde 1357-1358` | x fijo: 104 (izquierda) y 856 (derecha) · retrato en y=386 alto 132 · marco(x,386) · nombre(x,464) · barra bg(x,480) 96x | El 104 y el 856 son 'los dos bordes del lienzo'. En dos columnas dejan de ser simétricos respecto de nada. Y el 856 cae JUSTO sobre la columna derecha del HUD (que hoy vive en 754..948) — por eso existe el apagado de medidores del ítem anterior. Si la cruz se muda a la columna izquierda, estos dos r | medio |
| SUELTO · mostrarResolucion (el cartel de texto del desenlace) | `phaser/scenes/match.js:3021` | text(480, 226) display 13px centrado, entra con scale 0.3→1 · vive en menuLayer | Cae encima del panel de escena (30..304), o sea sobre el torso de la figura — el mismo vicio que ya corregiste en el tutorial y en el final con franjas propias. Es el candidato natural a mudarse a la franja de texto junto con el ticker. | medio |
| SUELTO · botón extra del JUGADÓN sobre el menú en cruz | `phaser/scenes/jugadon_ui.js:21-29` | rect(480, 66 + fila*52, 470x46) + dos textos · fila 0 → y=66, fila 1 → y=118 · vive en menuLayer, o sea ARRIBA de la esc | Es el único pedazo de los mixins que la mudanza toca. 470px de ancho centrados en 480 = atraviesa las dos columnas. Y como se ofrecen SIEMPRE que queden fichas (fix de la auditoría V8), pueden verse los dos apilados sobre la ilustración. Hay que decidir dónde viven: con la cruz, o en la columna. | medio |
| SUELTO · banner de ENTRETIEMPO (con el aviso de cambio de lado) | `phaser/scenes/match.js:1251-1255` | banda(480, 200, 960x84) + tres textos en y 190, 218 y 242 · vive en hudLayer con ignore de la cámara del mundo | Cae sobre el panel de escena. El texto del cambio de lado es información que NO se puede perder (sin él, darse vuelta se lee como bug). Reubicar sobre la franja de texto o sobre el mapa. | medio |
| SUELTO · avisar() — los mensajes cortos del partido | `phaser/scenes/match.js:3616-3622 (llamado en 305, 336, 1007,` | texto anclado a sprPortador.x/y − 96, agregado a this.mundoLayer — y mundoLayer está en setVisible(false) desde la línea | HALLAZGO: hoy avisar() es INVISIBLE en pantalla partida. Nunca se ven 'Marcás con X', 'Tempo INTERMEDIO', '⏰ ¡ÚLTIMOS MINUTOS!', '🌟 ¡EQUIPO ENCENDIDO!' ni la ficha de LA VIDA ('📋 …'). No es un problema de la mudanza — es un bug que la mudanza es la ocasión de arreglar, porque la columna derecha al | medio |
| TUTORIAL · velo, franja, línea, caja y pie (lo que acomodaste) | `phaser/scenes/match.js:1211-1219` | velo(480,270) 960x540 alpha .55 · franjaTut(480, 372, 960x92) → y 326..418 · lineaTut(480, 328, 960x2) · caja(480, 362)  | La franja ocupa 326..418, que es exactamente el aire entre el panel (termina en 304) y el pie del mapa — aire que en dos columnas ya no existe con esa forma. Es el bloque que más se resiente. Sugerencia: definir LAY.franja una sola vez y que la usen tutorial, pantallaFinal, ticker y mostrarResolucio | medio |
| FINAL · franja, título, cifra y línea (lo que acomodaste) | `phaser/scenes/match.js:2775-2780` | franja(480, 380, 960x86) → y 337..423 · titulo(480, 356) display 15px · cifra(480, 392) display 26px · linea(480, 337, 9 | Ocupa casi la misma banda que el tutorial (337..423 vs 326..418) — son el mismo hueco resuelto dos veces. El comentario de 2772-2773 explica por qué está ahí: 'la zona que dejó libre el mapa apagado'. En dos columnas el mapa apagado deja libre OTRA zona (la columna entera), así que el razonamiento s | medio |
| FINAL · la lista de lo que se apaga | `phaser/scenes/match.js:2756-2765 (+ el flag _finalApagado en` | array de 13 objetos: radarG, radarZona, _btnAccionCont, _hintEspacio, gutsG, lblGuts, txtGuts, envionG, lblEnvion, txtEn | No es una coordenada pero es el inventario más completo que ya tenés del HUD: si en la mudanza CREÁS un objeto nuevo (un contenedor de columna, una franja de avisos), tenés que acordarte de agregarlo acá o va a quedar encendido sobre la pantalla de final. Y si AGRUPÁS objetos en un container, esta l | medio |
| FINAL · los guards _finalApagado | `phaser/scenes/match.js:3072 (dibujarRadar) y 3292 (refrescar` | dos returns tempranos que impiden que el update repinte el mapa y los medidores en el frame siguiente al final | No se toca, pero es la razón por la que el final se ve limpio. Si en la mudanza agregás una función de dibujo nueva por frame (por ejemplo un repintado del panel según la columna), necesita el mismo guard o el cartel del final se va a llenar de cosas encima otra vez. | medio |
| FINAL · los tres botones | `phaser/scenes/match.js:2801 (SEGUIR LA CARRERA), 2819 (OTRO ` | (480, 496) 420x54 · (480, 496) 320x54 · (480, 398) 460x54 | Dos notas: (a) el de 'APLICAR Y VOLVER A LA CARRERA' está en y=398, o sea DENTRO de la franja del final (337..423) — hoy ya se superpone con la cifra del resultado cuando venís de la carrera clásica; conviene arreglarlo en la misma pasada; (b) los tres asumen ancho de lienzo (460px centrados) y no e | medio |


### Riesgo bajo

| Qué | Dónde | Hoy | En dos columnas | Riesgo |
|---|---|---|---|---|
| BARRA · fondo de la barra de estado | `phaser/scenes/match.js:3182` | rect(480, 15, 960x30, 0x0a1f13 alpha .85) → ocupa y 0..30 de punta a punta | Decidir primero si la barra sigue cruzando las DOS columnas (recomendado: sí, es el techo del lienzo) o si se parte. Si sigue entera, no se toca. Si se parte, es el objeto que define el ancho de las dos columnas y hay que sacarlo a una constante de layout. | bajo |
| BARRA · marcador (VOS n - n RIVAL) | `phaser/scenes/match.js:3190 (pinta en 3257-3258)` | text(480, 13) origin(0.5) · display 17px · centrado en el lienzo entero | El 480 deja de ser 'el centro' — pasa a ser el centro de nada. Recentrarlo sobre la columna de escena (que es donde el ojo está) o dejarlo centrado sobre el lienzo a propósito. Cuidado con el largo variable: el nombre del rival llega a 14 caracteres. | bajo |
| BARRA · división (bajo el marcador) | `phaser/scenes/match.js:3191 (pinta en 3259-3260)` | text(480, 26) origin(0.5) · texto 10px #9fb3a5 | Va pegado al marcador: se mueve con él, mismo x, y+13. Si la barra baja de 30px de alto, este es el primero que no entra. | bajo |
| BARRA · reloj (mm:ss + 1T/2T, con ⏰ en los últimos 5') | `phaser/scenes/match.js:3192 (color rojo y ⏰ en 3352 y 3358)` | text(948, 15) origin(1, 0.5) · display 14px · pegado al borde derecho del lienzo | El 948 es 'borde derecho menos 12'. Si la columna derecha se ensancha, sigue funcionando; si la barra se parte por columna, pasa a ser borde de la columna. Ojo que el prefijo ⏰ le agrega ancho a la izquierda sin avisar (se concatena en el propio texto). | bajo |
| BARRA · botón de mute (zona táctil de 44px con dibujo de 26) | `phaser/scenes/match.js:3242-3244` | rect(24, 15, 26x26, alpha 0) con hitArea Rectangle(-9, -9, 44, 44) + texto emoji en (24, 15) | Se mueve entero (rect + texto comparten x,y). NO tocar el hitArea de 44px: es lo que lo hace acertable en celular. Si lo movés, movelo con las dos coordenadas juntas o el emoji se separa de su zona táctil. | bajo |
| BARRA · chip de FICHAS del jugadón (QUITES · GAMBETAS · TIROS) | `phaser/scenes/match.js:3309 (se crea perezoso dentro de refr` | text(44, 15) origin(0, 0.5) · texto 11px · el string completo mide ~200px, o sea ocupa x 44..245 | Dos trampas: (a) nace DENTRO de refrescarHUD, no en buildHUD — si movés buildHUD y te olvidás de este, queda solo; (b) arranca en 44 justo al lado del mute y crece hacia la derecha, así que si el marcador se recentra a la izquierda se van a chocar. Recomendado: anclarlo al mute (mute.x + 20) en vez  | bajo |
| ESCENA · cielo (la banda azul de arriba) | `phaser/scenes/match.js:598` | g.fillRect(0, 30, 960, 92) → x 0..960, y 30..122 | Es un graphics pintado una sola vez con el ancho del lienzo entero. Hay que redibujarlo al ancho de la columna izquierda. No tiene dial en balance: los cuatro números están escritos en la línea. | bajo |
| ESCENA · pasto (tileSprite con parallax x/y) | `phaser/scenes/match.js:626` | tileSprite(480, 231, 960x146) → y 158..304 | Ancho y centro al de la columna. El alto (146) es lo que da la sensación de suelo: si la columna es alta y flaca, el pasto va a querer crecer y hay que decidir a mano cuánto. Sin dial en balance hoy. | bajo |
| ESCENA · la pelota del juego al pie de la figura | `phaser/scenes/match.js:659 (se reposiciona cada frame en 813` | init (482, 296) · por frame: x = panel_figura_x + anchoFigura*0.34*dir, y = panel_suelo_y − 8 − bob | Se muda sola con la figura porque deriva de panel_figura_x/panel_suelo_y. El (482,296) del constructor es un valor muerto de un frame. No hacer nada, solo no 'arreglarlo' a mano. | bajo |
| MAPA · marco (el borde de la paleta) | `phaser/scenes/match.js:958 (guardado en this.radarMarco)` | rect(rx + rw/2, ry + rh/2, rw+6 x rh+6) con stroke crema → 102..728 x 319..523 | Se muda solo con this.radar. No tocar. | bajo |
| MAPA · dibujo de la cancha (pasto, franjas, círculo, áreas) | `phaser/scenes/match.js:3088-3097` | 6 franjas de R.w/12 · círculo de radio R.h*0.18 · áreas de R.w*0.13 x R.h*0.52 | Todo en fracciones de R.w/R.h, o sea que se adapta solo. Es el ejemplo a copiar para el resto. No tocar. | bajo |
| MAPA · guards muertos de la vista vieja (no-split) | `phaser/scenes/match.js:3417-3418` | 'if (p.x > R.x − 8 && ... ) return' y 'if (p.x > 790 && p.y > 360) return' (los botones ⚡/⇄) | Hoy no corren (están después del return del split) pero el 790 y el 360 son la sombra de la columna derecha. Si algún día apagás pantalla_partida quedan desfasados. Anotarlo, no urgente. | bajo |
| COLUMNA · chip 'ESPACIO = ACCIÓN' | `phaser/scenes/match.js:1119 (se autodestruye al primer uso, ` | text(838, 428) 10px, fondo amarillo · solo en escritorio (no en touch) | Va pegado arriba del botón de ACCIÓN. Muévelo con él (838, botón.y − 28). El comentario de 1115-1118 avisa que ya estuvo en y=498 y pisaba los medidores: si la columna se reordena, revisá que no vuelva a caer sobre ENVIÓN/AGUANTE. | bajo |
| COLUMNA · el objeto MEDIDORES (la grilla de las dos filas) | `phaser/scenes/match.js:3201` | { xEtq: 754, xBarra: 820, xNum: 948, yEnvion: 500, yGuts: 522, wBarra: 84 } | La MEJOR noticia del bloque: los dos medidores enteros (4 textos + 2 barras) salen de este único objeto. Cambiás seis números y las dos filas se mudan completas. Es exactamente el patrón que conviene extender al resto del layout. Lo único fuera de él es txtEnvionEstado (ver abajo). | bajo |
| COLUMNA · las dos barras dibujadas (gutsG y envionG) | `phaser/scenes/match.js:3277-3281 (aguante) y 3331-3336 (envi` | aguante: (820, 517) 84x10 · envión: (820, 496) 84x8 · redibujadas cada frame desde MEDIDORES | Derivan de MEDIDORES (xBarra, wBarra, y − 5 / y − 4). Se mudan solas. El comentario 3193-3200 documenta que ya se cortaron contra el borde de abajo una vez (llegaban a y=542 con lienzo de 540): si en el layout nuevo bajás la fila, respetá ese techo. | bajo |
| COLUMNA · el ocultamiento en bloque de los medidores con menú abierto | `phaser/scenes/match.js:3291-3298` | lista fija de 7 objetos que se apagan cuando estado es MENU/TEMPO_MENU/FINAL o menuLayer tiene hijos | Si en dos columnas los medidores YA NO quedan tapados por los retratos del duelo (que hoy viven en y=386-495), este apagado deja de tener sentido y conviene sacarlo — el jugador podría ver su aguante mientras decide. Decisión de diseño, no de coordenadas. | bajo |
| SUELTO · velo de menú a pantalla completa (tempo y tutorial) | `phaser/scenes/match.js:1150 (tempo, alpha .72) y 1211 (tutor` | rect(480, 270, 960x540).setInteractive() — el lienzo entero, y además es el que come el toque | No se toca: son overlays de pantalla completa a propósito (el menú de tempo y el tutorial tapan todo). Lo que sí cambia es qué se ve DEBAJO. Anotado por completitud. | bajo |
| SUELTO · aviso '⚠ ¡ALGO GRANDE SE VIENE!' del beat de tensión | `phaser/scenes/match.js:1290` | text(480, 130) display 14px naranja, con tween de escala · menuLayer | Sobre la ilustración, a la altura de la cabeza. Mismo tratamiento que mostrarResolucion. | bajo |
| TUTORIAL · el texto del paso 3/3 | `phaser/scenes/match.js:1204` | split → '3/3 · Te movés y pasás TOCANDO\nEL MAPA de abajo' | Dice 'de abajo'. Si el mapa pasa a la derecha, el texto miente. Cambiarlo a 'EL MAPA de la derecha' o quitarle la ubicación y confiar en el anillo. | bajo |
| FUERA DE ALCANCE (confirmado) · el CINE, escenaCine, cutInEspecial, LA DEFINICIÓN y EL JUGADÓN | `match.js:1876-2115 y 2364+ · definicion_ui.js:52-54 · jugado` | los cinco hacen mundoLayer.setVisible(false) + hudLayer.setVisible(false) + cineLayer.setVisible(true) + uiCam.centerOn( | NO se tocan: son tomas de pantalla completa, el layout de dos columnas no existe mientras corren. La única excepción es botonJugadon (jugadon_ui.js:21), que no es del cine sino del menú en cruz. Vale confirmarlo para no perder tiempo auditando 1200 líneas de mixins. | bajo |


---

## D2 bis · QUÉ OTRAS PANTALLAS NECESITAN VARIANTE

SOLO DOS PANTALLAS NECESITAN VARIANTE DE VERDAD: `vistaTemporada` (la tabla) y `vistaSemana`. Son las únicas donde el problema es topológico — demasiadas bandas apiladas en 540 — y donde mover la mitad al costado libera alto para que las filas crezcan. Todo lo demás ya es de una columna full-bleed (intro, cine, definición, jugadón) o ya es de dos columnas (editor, elegirDia): ahí el ancho extra se consume solo, en la barra de botones, y no hace falta una maqueta nueva.

LA ADVERTENCIA QUE CAMBIA EL PLAN: con Scale.FIT en un 844×390, la escala es LIMITADA POR EL ALTO (390/540 = 0.7222) — y sigue siendo 0.7222 si el lienzo pasa a 1170×540. Dos columnas NO agranda un solo píxel de texto. Lo único que compra son ~210px lógicos de ancho (de 960 a 1170, +22%) y las bandas que puedas mudar de la columna vertical. Si el objetivo real es que se LEA, eso es un pase de escala tipográfica (o bajar el alto lógico), no un pase de columnas. Los dos problemas son distintos y conviene no mezclarlos: hoy ningún botón del juego llega al piso de 44 CSS px (haría falta 61 lógicos; el más alto es 54) y casi ningún texto llega a 12 CSS px (haría falta 17 lógicos; el cuerpo está en 10-14).

ORDEN QUE PROPONGO: (1) desbloquear — `uiCam` de 960×540 fija y los `var W=960,H=540` de módulo, sin eso las tres pantallas de cine ni se enteran de que hay lienzo nuevo; (2) las dos variantes reales; (3) el pase de escala, que es transversal y arregla más que las columnas; (4) los tres retoques sueltos con riesgo alto (el desborde de vistaElegir, el ahogo de 11px del súper tiro, el tracking de la tabla).

---

## EL ORDEN QUE PROPONGO

1. **El pase de legibilidad** (números del mapa a 16, fichas que los contengan,
   piso táctil de los botones). Arregla un problema de accesibilidad que ya está
   activo, es transversal y no depende del layout.
2. **Desbloquear el lienzo**: `uiCam` está fija en 960×540 y hay `var W=960,
   H=540` de módulo; sin eso las pantallas de cine ni se enteran de que hay
   lienzo nuevo.
3. **Las dos columnas** en el partido, que es donde la figura gana x2,2.
4. **Las dos variantes que de verdad las necesitan**: la tabla de temporada y LA
   SEMANA. El resto (intro, cine, definición, jugadón, editor) ya son de una
   columna full-bleed o ya son de dos: el ancho extra se consume solo.
