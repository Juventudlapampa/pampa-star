# HANDOFF — TANDA DE PIEL (7/ago)

Nueve puntos, cinco commits, cero cambios de lógica ni de balance de juego.
En vivo: https://juventudlapampa.github.io/pampa-star/phaser/

| # | Punto | Commit |
|---|---|---|
| 1 | Fondo del marco a oscuro | `955ca12` |
| 3 | Segunda tipografía de display | `955ca12` |
| 4 | Mayúsculas con tracking | `955ca12` |
| 5 | El número sale de adentro de la barra | `75aa6b9` |
| 6 | El sonido deja de tapar la ilustración | `75aa6b9` |
| 2 | Botones con cuerpo | `5312d02` |
| 7 | La costura de la tribuna | `edcebdf` |
| 8 | Los pies cortados | `edcebdf` |
| 9 | Pantalla de FINAL propia | `82c54d2` |

Los puntos 1, 3 y 4 fueron juntos porque comparten la paleta y la fábrica de
texto: separarlos dejaba un commit intermedio con el juego a medio vestir.

---

## UN SUPUESTO DEL PEDIDO QUE NO SE SOSTIENE

> *"Todos los tamaños de texto del HUD escalan con el ancho... en 1366x768 hoy se
> corta abajo y ENVIÓN y AGUANTE quedan fuera de pantalla."*

**El corte no era por el ancho de pantalla.** El juego usa `Phaser.Scale.FIT`
con un lienzo lógico de 960×540 fijo: verificado en vivo, `game.scale.width`
sigue valiendo 960 en 1366×768. No hay nada responsive en todo el proyecto
(cero `innerWidth`, cero `resize`, cero `matchMedia`), así que escalar con el
ancho no habría arreglado nada — el ancho nunca cambia.

Lo que sí pasaba: **la maqueta se salía del lienzo**. La barra de aguante iba de
y=528 a y=542 con el canvas terminando en 540, y el número de aguante estaba en
y=512, encima de la barra de *envión* (que ocupaba 503-515). O sea: el número no
estaba sobre su propia barra, estaba sobre la otra.

Se arregló acomodando la maqueta, que es lo que de verdad lo arregla. La escala
tipográfica quedó igual implementada (`piel.escala` / `piel.tam`, perillas
`esc_min` 0.85 y `esc_max` 1.15) porque la pediste y porque sirve el día que el
lienzo deje de ser fijo — pero hoy no cambia nada, y prefiero decirlo a que
descubras que es decorativa.

---

## LO QUE HAY QUE SABER PARA TOCARLO

### La paleta ahora es un dato

`balance.json → piel`. Antes los ~250 tonos de marco estaban a mano en 9
archivos. Cambiás ahí y recargás.

```
fondo_centro #14301F   fondo_borde #060F0A
caja #0A1F13           marco #0E2A1A
acento #F5C400         calido #FF6B4A
texto #F6EFDC          texto_apagado #9FB3A5
```

**El verde de la cancha no vive acá y no se toca desde acá.** La confusión estaba
servida: `0x0b3d0b` era el marco del mapa —verde oscuro, pegado al pasto, parecía
cancha— y ese sí cambió; `0x2e7d32` en master.js parece pasto y es una ranura de
la semana. Por eso no se hizo ningún buscar-y-reemplazar: se tocaron 4 lugares a
mano, y el test `piel.test.js [6]` falla si alguno de los 7 verdes de cancha se
cuela en la paleta del marco.

### Las dos tipografías están cableadas, elegís vos

Como pediste, quedaron las dos. Arranca con **Archivo Black**. Para probar la
otra, una línea en `balance.tipografia.display` y recargás:

```
Archivo Black  →  "'Archivo Black','Pixelify Sans',sans-serif"
Bowlby One     →  "'Bowlby One','Pixelify Sans',sans-serif"
```

Archivo Black es ~5% más angosta: entra "GENERAL PICO" sin achicar y en celular
el marcador queda más holgado. Bowlby One tiene más cara de cartel deportivo.
Las dos son OFL, self-hosted, con licencia en `assets/fonts/README.md` y
precache en `sw.js`.

### El tracking se decide por el contenido, no por la escena

Un texto **todo en mayúsculas** lleva `.16em`; el resto, el interletrado normal.
La regla vive en la fábrica de `add.text`, así que cubre los 132 textos del juego
sin tocar ninguna escena, y `setText` la vuelve a evaluar (el marcador pasa de
"VOS 0 - 0" a "GOL DE VOS" y cambia de categoría).

No cuenta como mayúsculas un texto sin letras (`· 12`) ni de una sola letra: si
no, cada número suelto llevaría tracking de título.

### Los botones se visten, no se reescriben

El juego tiene ~20 botones a mano en 5 archivos, cada uno con sus handlers y su
registro de limpieza. `vestirBoton()` deja el `Rectangle` original vivo (conserva
todos sus listeners) pero sin pintarse, y le dibuja encima cara redondeada, canto
y sombra.

Tres cosas que costaron y están anotadas en el código:

- en un `Container` manda el **orden de inserción**, no el `depth`: las capas
  entran con `addAt` en la posición del rect, o taparían el botón;
- las capas cuelgan del rect y siguen su `setVisible` y su `destroy` — si no,
  quedan **sombras flotando** cuando el botón desaparece;
- los menús del partido nacen en runtime, así que hay un barrido cada 6 frames.

**El filtro se calibró mirando los rects reales**, no a ojo: la primera versión
tenía tope 420 de ancho y dejó los tres presets (500×72) a medio vestir, que se
ve peor que planos. El velo del menú también es interactivo y mide 960×540. La
línea quedó en 60..560 de ancho y 20..115 de alto, y solo rects con `fillAlpha > 0`.

---

## LOS DIAGNÓSTICOS QUE CAMBIARON EL ARREGLO

Tres puntos no eran lo que parecían:

**El sonido** no era "una caja blanca": era un rect de 48×48 con borde crema al
70% sobre el panel de la ilustración (que arranca en y=30). Ahora es el emoji
solo, de 15px, dentro de la barra del marcador — con el área táctil **igual de
44px**, porque en celular un blanco de 26px no se acierta.

**Los pies** no se cortaban contra el borde del panel. El pasto llega a y=304, no
hay máscara y la cámara es la pantalla entera. Los tapaba **la franja de texto**:
un rect de 960×24 en y=280..304 con alpha 0.82, casi opaco, pasándole por encima
a una figura que apoyaba en y=300. `panel_suelo_y` bajó a 278 y la figura apoya
sobre la franja, que ahora hace de piso visual.

**La tribuna** no necesitaba arte nuevo. El PNG (1280×720) es una ilustración *en
perspectiva*: el techo es una cuña que crece hacia la derecha, así que su borde
izquierdo (marrón de estructura) contra el derecho (cielo) difieren 274 sobre 765
de suma RGB. Se hornea `[T | espejo(T)]` en runtime: la última columna de la
baldosa doble es la primera de T, así que **el empalme del wrap es idéntico por
construcción**. Medido después de hornear: diferencia 0.

---

## VERIFICADO EN VIVO

Todo con el juego corriendo, capturado con el server de captura
(`.claude/capture-server.js`, puerto 8125 → `.claude/shots/`).

| Captura | Qué muestra |
|---|---|
| `ANTES_partido_juego_1366x768.png` | el diagnóstico completo: sonido tapando, chorizo apelmazado, ENVIÓN/AGUANTE cortados |
| `DESPUES_p5p6_libre.png` | medidores con etiqueta y número, marcador con jerarquía |
| `DESPUES_p2_preset2.png` | los tres presets con canto y sombra |
| `DESPUES_p7p8.png` | pies completos y techo continuo |
| `DESPUES_p9_final3.png` | pantalla de final limpia |
| `DESPUES_semana_1366x768.png` | la semana con fondo, tipografía y ranuras vestidas |
| `DESPUES_partido_celular.png` | 812×375, nada cortado |

Mediciones puntuales: baldosa espejada 2560×720 con diferencia de bordes **0**
(antes 274) · figura del panel con base en y=278 y alto 210px (antes 213, o sea
no se achicó) · 7 botones vestidos en preset, 4 en la semana.

**En celular vertical el juego pide girar el teléfono** (por diseño, ya estaba),
así que las capturas de celular son apaisadas: 812×375.

---

## LO QUE NO ENTRÓ, Y POR QUÉ

- **El HTML de Expo Carreras nunca llegó.** El pedido decía "Rodri va a pasar" y
  no llegó, así que copié el sistema de la descripción: canto sólido + sombra
  difusa, radial oscuro, dos tipografías con roles, tracking en mayúsculas. Si el
  HTML trae algo más, decime y lo sumo.
- **El aviso "el HTML clásico sigue en /index.html"** sigue ahí abajo. Lo
  mencionaste en la lista de "todo el texto pesa lo mismo" pero no está en los 9
  puntos, y sacarlo es una decisión tuya: es el único enlace al juego viejo.
- **La escala tipográfica no hace nada hoy**, ver arriba.
- Sigue pendiente de la tanda anterior: el muñequito de cancha y el chip "TU
  ARCO" no siguen la camiseta elegida.
