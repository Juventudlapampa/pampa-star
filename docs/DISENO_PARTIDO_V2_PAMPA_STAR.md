# PAMPA STAR — Diseño del Partido v2 ("Cámara Cinematográfica")

**Documento de diseño ejecutable para Claude Code.**
Repo: `Juventudlapampa/pampa-star` · Motor: Phaser 3 · Único agente autorizado a tocar `index.html`: Claude Code.
Fuente de investigación: `PAMPA STAR: Diseño Técnico de Cámara Cinemática y Mecánicas estilo Captain Tsubasa para Phaser 3` (subir ambos documentos al repo, carpeta `/docs`).

---

## 0. Diagnóstico: por qué el partido actual no se siente Tsubasa

El partido actual renderiza la cancha completa con 22 sprites chicos vistos desde lejos. Ese marco conceptual es el opuesto exacto al del Captain Tsubasa de Tecmo, donde la vista de acción muestra únicamente al portador de la pelota, grande, con el campo en perspectiva, y la cancha entera existe solo en el radar. De esa raíz salen los cuatro problemas reportados: la cámara lejana, las animaciones y caras que no se aprecian, la pobreza de opciones de juego, y el control incómodo.

**Este documento corrige el marco, no los síntomas.** No se ajustan números sobre el código actual de partido: se reconstruye la escena de partido según el modelo de abajo. El resto del juego (carrera, guardado, menús fuera del partido) no se toca.

---

## 1. Principio rector (no negociable en la implementación)

La escena de partido tiene DOS representaciones simultáneas del mismo mundo lógico:

1. **Vista de acción (principal):** primer plano del jugador con la pelota, sprite grande, campo en falsa perspectiva. Nunca se ven más de 3 sprites grandes a la vez (portador, rival del cruce, arquero). Si en algún momento hay más de 3 sprites grandes en cámara, la implementación está rota.
2. **Radar (mini-mapa):** cancha entera esquemática con los 22 jugadores como fichas numeradas, actualizadas en tiempo real. Es la única vista donde se ve la cancha completa.

Los 22 jugadores existen siempre como **entidades lógicas** (posición, stats, guts, estado), pero solo se materializa el sprite grande de quien está en cámara.

---

## 2. Mundo lógico y cámara

El mundo lógico es la cancha completa en coordenadas: **2400 × 1200 px**. Nunca se dibuja entera en la vista principal.

```js
// Config base (mobile-first apaisado)
scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 960, height: 540 },
render: { roundPixels: true, pixelArt: true }

// Cámara principal
const cam = this.cameras.main;
cam.setBounds(0, 0, 2400, 1200);
cam.startFollow(portador, true, 0.12, 0.12); // lerp: scroll suave, no por pantallas
cam.setDeadzone(220, 140);
cam.setZoom(2.2); // el portador debe ocupar entre un tercio y la mitad de la altura visible
```

Criterios de ajuste durante la iteración: si el jugador se ve chico, subir el zoom; si se siente "encajonado", agrandar la deadzone; si el scroll tiembla, verificar `roundPixels` y usar zoom en valores enteros cuando sea posible. Cuando la pelota cambia de dueño (pase, quite, despeje), la cámara hace `startFollow` sobre el nuevo portador con una transición breve (pan de 250–400 ms), evocando el corte de plano cinematográfico.

En portrait, mostrar pantalla de "girá el teléfono" detectando `this.scale.on('orientationchange', ...)`.

---

## 3. Radar

Segunda cámara chica y fija en la franja inferior de la pantalla, o alternativamente un `Graphics` con `setScrollFactor(0)` si el rendimiento en gama baja cae de ~50 fps (la alternativa Graphics es más barata y es el plan B automático).

```js
const radar = this.cameras.add(x, y, radarW, radarH);
radar.setZoom(radarW / 2400);
radar.setScroll(0, 0);
radar.setBackgroundColor(0x0B3D0B); // verde cancha oscuro #0B3D0B
cam.ignore(radarBlips);
radar.ignore([...spritesGrandes, ...hudElements]);
```

**Accesibilidad cromática (requisito duro del proyecto):** las fichas de los dos equipos se distinguen por **forma además de color**, nunca por color solo. Equipo propio: **círculos** en celeste claro **#4FC3F7**. Equipo rival: **triángulos** en naranja quemado **#FF8A50**. Pelota: **rombo blanco #FFFFFF** con borde negro **#000000**. El jugador actualmente controlado lleva un anillo blanco #FFFFFF alrededor de su ficha. Cada ficha muestra su número de camiseta.

---

## 4. HUD fijo

Marcador, tiempo, mitad y barra de guts del portador, con `setScrollFactor(0)`. La barra de guts usa relleno verde **#2E7D32** cuando está por encima de la mitad, amarillo **#F9A825** entre la mitad y el cuarto, y rojo **#C62828** por debajo del cuarto, siempre acompañada del número exacto de guts para no depender del color.

---

## 5. Sprites grandes y animaciones

Cada jugador visible en la vista de acción usa un spritesheet grande que, con el zoom aplicado, ocupa entre un tercio y la mitad de la altura visible. Las animaciones mínimas del portador son: correr, gambeta, pase, tiro raso, volea, cabezazo y festejo. Las del defensor: marcar, quite y bloqueo. Las del arquero: parado, estirada, atajada y despeje de puño.

El nivel de detalle apunta al estándar de Captain Tsubasa II (animaciones variadas y dinámicas), no al del primer juego. Se implementan primero versiones simples de dos a cuatro frames para validar el flujo, y se enriquecen después: la presentación es una pendiente que se sube por etapas, no un requisito de la primera entrega.

El campo se dibuja en falsa perspectiva: líneas laterales que convergen hacia el arco lejano y una leve curvatura del horizonte. Técnica: fondo `tileSprite` con líneas pre-dibujadas en perspectiva, más escalado del sprite según su profundidad lógica (más lejos en el eje Y lógico, sprite más chico). Parallax opcional en capas con `setScrollFactor` (tribunas lentas atrás).

---

## 6. Retratos y caras (usa el banco de imágenes existente)

Los retratos salen del **banco de imágenes de Rodri** (carpeta `assets_drive` del proyecto). No se generan imágenes nuevas por código ni se usan assets de Tecmo. Claude Code debe primero listar el banco y armar un `portraits_manifest.json` que mapee cada archivo a un jugador o arquetipo, y recién después cablear los paneles.

Los retratos aparecen en tres contextos. En el **menú de comandos**, un panel fijo (`Container` con `setScrollFactor(0)`) muestra el busto del portador con su nombre y su barra de guts. En el **cruce o duelo**, el panel muestra dos bustos enfrentados: atacante a la izquierda, defensor a la derecha, cada uno con nombre y guts. En los **tiros especiales**, un cut-in de pantalla más grande con el retrato y la animación del tiro.

---

## 7. Sistema de comandos completo (el mapa contextual)

El juego se juega en pausas: al tocar el botón de acción o al cruzarse con un rival, la simulación se pausa (`this.physics.pause()` o flag propio) y aparece el menú contextual. Las opciones dependen de la situación:

**Con la pelota en el piso:** Pase (dirigible tocando el destino en el radar), Gambeta (si estás marcado intenta superar al rival; si estás libre, seguís corriendo), Uno-Dos (pared, requiere compañero cerca, cuesta ~60 guts) y Tiro (~80 guts el tiro normal; desde campo propio no llega salvo tiros especiales).

**Recibiendo en zona rival, pelota baja:** Pase, Trap (controlar), **Pase al vacío / Through** (dejás pasar la pelota fingiendo controlarla, mostrando la trayectoria; si hay un compañero en línea, desacomoda al arquero) y Tiro de volea.

**Recibiendo pelota alta:** Pase, Trap, Through y Tiro aéreo (cabezazo o especial).

**En área propia con pelota:** Pase, Trap y Despeje.

**Defendiendo en el piso:** Corte de pase, Quite, Bloqueo y No moverse (sirve para acumular marca o recuperar guts).

**Marcando en el aire:** Corte de pase, Seguir (esperar el control del rival), Despeje y No moverse.

**Arquero:** contra tiro, Atajar o Despejar de puño; en el mano a mano, achicar para frenar la gambeta o cubrir el tiro.

**Selección de defensor:** en vez del ciclado por número del original (lento e incómodo), un botón selecciona automáticamente al defensor más cercano a la pelota.

**Resolución de duelos:** el CPU elige su acción en secreto y el resultado se resuelve por stats de ambos jugadores más un componente aleatorio acotado. La animación cinematográfica muestra el desenlace.

**Economía de guts:** mantener la gambeta consume ~3 guts cada 10 segundos; la recuperación sin pelota es de ~2 guts cada 10 segundos; en el entretiempo se recupera un octavo del máximo. Tiro normal 80 guts, tiros especiales escalan (hasta 400 en el más caro). Un jugador por debajo de ~100 guts queda casi inutilizado. Esta economía es lo que impide spamear al crack y le da peso a las decisiones.

---

## 8. Controles (táctil y teclado, sin mouse)

El control primario es **táctil**: botones en pantalla de al menos 48 × 48 px. Movimiento del portador con joystick virtual o zonas de toque en el lado izquierdo; botón de acción en el lado derecho que abre el menú de comandos. Dentro del menú, las opciones son botones grandes tocables, dispuestos en cruz (evocando el D-pad del original). El pase dirigido se resuelve tocando el punto de destino directamente sobre el radar.

En escritorio, todo lo anterior se duplica con teclado: flechas o WASD para moverse, y las cuatro opciones del menú mapeadas a las flechas más Enter. **El mouse no es requisito para ninguna acción del partido.**

---

## 9. Máquina de estados del partido

```
LIBRE_CORRIENDO  →  (botón de acción o cruce con rival)  →  MENU_PAUSA
MENU_PAUSA       →  (elección del jugador y del CPU)      →  RESOLUCION
RESOLUCION       →  (animación cinematográfica terminada) →  LIBRE_CORRIENDO
                     (gol / lateral / falta / fin de tiempo → estados especiales con su cinemática y reanudación)
```

Durante `MENU_PAUSA` la física está pausada y el panel de retratos visible. Durante `RESOLUCION` no hay input del jugador. El ritmo pausa → animación → pausa es el corazón del feel Tsubasa: si el partido se siente apurado o amontonado, revisar que estos estados estén realmente separados.

**Ambientación sonora (etapa posterior, dejar los hooks listos):** un tema cuando tenés la pelota, otro cuando la tiene el rival, y uno más urgente en los últimos cinco minutos. El segundo tiempo termina con descuento sorpresa (el jugador no sabe el segundo exacto del final).

---

## 10. Plan de implementación por etapas, con criterio de aceptación

Cada etapa se implementa, se prueba en el celular de Rodri, y recién con su visto bueno se pasa a la siguiente. Los saves existentes deben seguir funcionando después de cada etapa (retrocompatibilidad siempre).

**Etapa 1 — Cámara y mundo (el cambio madre).** Mundo lógico 2400×1200, cámara con follow, zoom y deadzone, solo el portador materializado como sprite grande. *Aceptación: en el celu, el jugador con la pelota se ve grande (un tercio a la mitad de la pantalla de alto), la cámara lo sigue suave, y nunca se ve la cancha entera en la vista principal.*

**Etapa 2 — Radar y HUD.** Mini-mapa con las 22 fichas (círculos #4FC3F7 propios, triángulos #FF8A50 rivales, rombo blanco la pelota), marcador y guts fijos. *Aceptación: mirando solo el radar se entiende dónde está todo el mundo, y las fichas se distinguen por forma sin depender del color.*

**Etapa 3 — Menú de comandos con pausa y retratos.** Máquina de estados completa, panel con retrato del banco de imágenes, menú contextual con las opciones del punto 7 (incluyendo pase al vacío y uno-dos). *Aceptación: al cruzarte con un rival el juego se pausa, ves tu cara y la del rival, elegís con un toque, y la resolución se muestra antes de seguir.*

**Etapa 4 — Animaciones y perspectiva.** Spritesheets con las animaciones mínimas, campo en falsa perspectiva con convergencia y curvatura. *Aceptación: la gambeta, el pase y el tiro se ven y se distinguen; el campo da sensación de profundidad.*

**Etapa 5 — Economía de guts, duelos por stats y defensa mejorada.** Costos y recuperación del punto 7, resolución secreta del CPU, selección automática del defensor más cercano. *Aceptación: un partido completo se juega de punta a punta y las decisiones tienen costo real.*

**Etapa 6 — Pulido cinematográfico.** Cut-ins de tiros especiales, cortes de cámara en cambios de posesión, hooks de música por posesión y descuento sorpresa. *Aceptación: el partido "se siente Tsubasa" según el criterio de Rodri, que es el juez final del feel.*

---

## 11. No negociables del proyecto (heredados, se repiten para que Claude Code no los pierda)

No se usan nombres reales de menores. No hay mecánicas de apuestas ni dinero real en ninguna forma. No se usan assets, sprites, nombres ni marcas de Tecmo o Captain Tsubasa: se replica mecánica, cámara y presentación con arte cien por ciento original. El modelo de datos es neutro en género en todos sus campos. Los saves son retrocompatibles después de cada cambio. Claude Code es el único agente que edita `index.html`; nunca corren dos agentes sobre el mismo archivo. Toda referencia de color en el código y en la interfaz se acompaña de forma o etiqueta, nunca color solo.
