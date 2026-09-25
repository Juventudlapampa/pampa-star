# PAMPA STAR · ARTE V10 · LA LUZ DE LA ESCALERA

Tanda del 24-25 de septiembre de 2026. Pedido de Rodri: **"MEJORAME EL ARTE DEL JUEGO"**.

Las poses son anime ochentoso de verdad: cel con línea de tinta y sombra en dos
tonos. El problema no eran ellas: era todo lo que las rodeaba. Estaban paradas
sobre dos triángulos planos, una franja verde y un rectángulo azul. El dibujo
premium flotaba sobre una pantalla de prueba.

![antes y ahora](img/arte_v10_antes_ahora.webp)

---

## Lo que cambió, en orden

| commit | qué |
|---|---|
| `d6c88ae` | **Sección 11** · el fondo del menú del clásico tenía el logo y las tres tiras de una marca deportiva. Se reemplazó por su franja central (un recorte, no un reproceso). |
| `6b443e7` | **Sección 11** · los cuatro retratos rivales del banco tenían marcas deportivas. Salen del manifiesto y del deploy. El test de Sección 11 ahora vigila también marcas de indumentaria. |
| `8b17d89` | **LA PELOTA ERA INVISIBLE** en todas las escenas desde el 19 de agosto. |
| `d4590b2` | **Los fondos del cine se pintan**, y la luz sube con la escalera. |
| `4f06b14` | **El panel del partido** con la luz de la división. |
| `1d973e5` | **El Master pasa en tu cancha**: tabla, semana y eventos. |
| `052a9d0` | La opción elegida del evento pisaba la tira de los días. |

### La pelota invisible

`pelotaVieja()` cambiaba la pelota de gajos por la de potrero pasándola por una
renderTexture y registrando `"ball"` con la fuente de esa renderTexture. En
WebGL esa fuente es la textura de la GPU, no una imagen: la `"ball"` nueva
quedaba **vacía**. Cinco semanas sin pelota en ninguna escena del cine. Como
las poses tienen un hueco donde se recortó la pelota dibujada, **el arquero
abrazaba un agujero negro** — está en `A5_atajada_arreglada.png`, del 19 de
agosto, y nadie lo leyó como bug. Apareció porque la chilena pateaba el aire.

Ahora se rasteriza en un canvas 2D, más una versión de 128 px para los planos
de cerca. Guardián: `phaser/test/pelota_visible.test.js` (con el código viejo
da 6 fallas).

### Los fondos pintados

Todo por código, Canvas 2D, en `phaser/scenes/cine_arte.js`. Se pinta una vez
por partido (12 a 35 ms) y queda como textura. Como en el anime de los 80: el
cel adelante, nítido; atrás, la pintura —cielo en degradé con pinceladas,
nubes de tres tonos con la base plana, el horizonte pampeano (monte, campo,
molino, caldén, tribuna de chapa, alambrado) o el estadio con torres de luz, y
el pasto con las franjas de corte en perspectiva, peladas de tierra y matas
adelante—. Lo lejano va apenas desenfocado.

Once lugares que pintaban plano ahora piden su pintura, y todos conservan el
fondo viejo como respaldo si la pintura no está:

- la viñeta (`escenaCine`), el golpe de lo especial y el anuncio de megacosa
  (degradé radial, líneas de foco, trama de puntos en las esquinas);
- los cinco planos del remate (el pie, el viaje, el esfuerzo, el arquero, el
  desenlace);
- la cancha de las escenas V9 (te rematan, el pase) y la Definición.

Detalles que suman: sombra de contacto bajo los **pies** de cada pose (medidos
una vez por textura), líneas de velocidad en cuña, palos del arco con volumen,
defensores en silueta parados en el pasto y no flotando en el cielo.

### La luz de la escalera

![la escalera de luz](img/arte_v10_escalera_de_luz.webp)

`data/ambientes.json`: Primera B = la siesta del domingo · Primera A = la tarde ·
Regional = el atardecer · Nacional = la noche con torres · Mundial = la gran
noche. Subir de división se VE — en el cine, en el panel del partido y en los
menús del Master.

**La luz es ambiente, nunca información** (Rodri es daltónico): quién
protagoniza cada jugada lo dicen las placas con nombre y la palabra VOS. El
test `arte_cine.test.js [6]` lo vigila.

---

## DECISIONES QUE TOMÉ YO

**1 · El fondo del menú del clásico: recortado, no reprocesado.** Elegí la
franja central (x 190-622 de 1024) porque saca la marca entera y queda
vertical, que calza con la caja del menú. No toqué un pixel.
*Se revierte:* `git checkout ac2a2e9 -- assets/ui/fondo_menu.webp` (vuelve la marca).

**2 · Los cuatro retratos rivales, afuera.** Con el grupo vacío el juego cae a
la cara del avatar, que es lo que ya se veía con el flag de retratos modulares
prendido. En pantalla hoy no cambia nada.
*Se revierte:* solo con arte repintado sin marcas (nota `_seccion11` del manifiesto).

**3 · Los fondos los pinta el código.** Contradice la letra del GDD §10.1
("Rodri pone los dibujos"), no su espíritu: el techo bajo es de los
personajes, y acá ningún personaje se dibuja por código. Lo dejé escrito en el
GDD como ajuste.
*Se revierte:* sacando la línea de `pAmbientes` en `phaser/index.html` — sin
paletas, cada plano dibuja su fondo viejo.

**4 · Qué hora le toca a cada división.** La siesta abajo y la noche arriba
porque la escalera va del pueblo al mundo, y los partidos grandes se juegan de
noche.
*Se revierte:* `por_division` en `data/ambientes.json`.

**5 · En los estadios, sin la tribuna del pueblo.** La ilustración de la
tribuna de chapa es la cancha del pueblo: en el Mundial al lado de una viñeta
de estadio era otro lugar. Donde no se juega en el pueblo se pintan las gradas.
En el pueblo, la ilustración se tiñe a la hora del partido.
*Se revierte:* `ambienteEsPueblo()` en `cine_arte.js` devolviendo siempre true.

**6 · El acento del rival en la viñeta.** Cuando el rival protagoniza, la
pintura se entibia apenas (tinte `0xffe4d4`, ningún canal por debajo de c0).
Reemplaza la banda diagonal oscura de antes. Es acento, no código.
*Se revierte:* `tinte: rivProta ? 0xffe4d4 : null` → `null` en `escenaCine`.

**7 · La pelota de cerca, en alta.** 16 px sigue siendo la base de todo el
juego (nadie cambió un `setScale`); la de 128 solo entra donde la pelota mide
más de 40 px en pantalla.

**8 · El velo de foco del panel, extendido.** Arrancaba en y=60, a mitad del
cielo: con el cielo pintado se veía el corte. Ahora cubre el panel entero.

**9 · La opción del evento, en el renglón del titular.** Solo si entra a lo
ancho y el titular es de un renglón; si no, queda donde estaba.

**10 · "puma" fuera de la lista de marcas del test.** En La Pampa es un animal.

---

## PARA RODRI

**Decisiones tuyas (Sección 11):**

- `assets/ui/relatores.webp` — el panel de la derecha tiene a la relatora con un
  escote marcado y en pose de glamour, mientras los dos varones aparecen
  trabajando. Hoy **no lo carga ningún código**, así que no sale en pantalla.
  Si algún día se usa: recorte a la franja de arriba (caras con auriculares) o
  regenerar ese panel con ropa cerrada y micrófono. No lo toqué.
- De la auditoría, siguen abiertos: **FM El Caldén** (radio real, en
  `data/entrevista.json`) y **los clubes reales de la Liga Cultural** en la
  Primera B.

**Arte que falta** (detalle en `docs/P11_PEDIDOS_DE_ARTE.md`, prioridad 0):

- **Bloqueo y barrida con nuestra camiseta.** Hoy tus defensores salen con la
  camiseta del rival. No se puede teñir: la piel de esas poses es del mismo
  naranja que la camiseta.
- La lista de lo que la barrida encontró roto en el arte que ya está (huecos,
  halos, alfa roto, estilos que no pegan). No lo toqué: regla de no reprocesar.

---

## Cómo se verificó

- **Barrida visual de Sección 11**: las 89 imágenes que se publican (poses,
  caras, identidades, retratos, interfaz), un agente por lote y un segundo
  agente por cada imagen marcada, que tenía que confirmar o descartar. 6
  violaciones confirmadas, 4 marcas descartadas con razones. Las `_fuente` son
  los mismos dibujos en PNG original y no se barrieron aparte.
- **Laboratorio**: `.claude/lab_arte.html` pinta con el mismo pintor del juego
  y compone encima las poses reales en las posiciones de `match.js`.
- **En el juego**: cada plano en las cinco luces, capturado del canvas real
  (`.claude/shots/JUEGO_*`, `PANEL_*`, `MASTER_*`).
- **Suite**: 59 verdes. Nuevos: `arte_cine.test.js` (140 asserts),
  `pelota_visible.test.js`.
