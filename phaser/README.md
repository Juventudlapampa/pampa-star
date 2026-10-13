# `phaser/` · el juego

Acá vive PAMPA STAR: lo que abre ▶ JUGAR desde la portada (`../index.html`,
el link oficial). Phaser 3.80.1 y JavaScript sin paso de compilación,
servido tal cual por GitHub Pages. Se instala como app (PWA) con
`manifest.webmanifest` y `sw.js`. Qué es el juego y cómo se juega: el
[README de la raíz](../README.md) y el documento raíz,
[`docs/PAMPA_STAR_GDD.md`](../docs/PAMPA_STAR_GDD.md).

**Abrirlo:** desde la raíz del repo, `node server.js` y
`http://localhost:8123/phaser/`.

## Arquitectura: DATOS + LÓGICA PURA + RENDER

Tres capas separadas. La lógica y los datos no saben que existe Phaser: si
algún día el juego se porta a otro motor, esas dos capas viajan tal cual y
solo se reescribe el render.

| Capa | Dónde | Qué |
|---|---|---|
| **DATOS** | `../data/*.json` · `data/balance.json` | El contenido y los números, fuera del código: divisiones, plantel, relatos, entrevista, semana, eventos de la temporada, megacosas, audio y los manifiestos del arte. `balance.json` tiene las perillas del juego; cada bloque lleva su `_nota`, que cuenta qué se midió y por qué vale lo que vale. |
| **LÓGICA PURA** | `logic/*.js` | Módulos UMD sin Phaser ni DOM: corren en el navegador y en node, y se prueban en node. El partido (`partido`, `duel`, `tiro`, `definicion`, `jugadon`, `drama`, `lectura`), la carrera (`master`, `temporada`, `save_master`, `carrera`, `escalera`, `semana`, `vida`), el relato y la música (`relator`, `musica`), y lo del aparato (`carga`, `memoria`, `entorno`, `atras`). |
| **RENDER** | `scenes/*.js` · `audio/sfx.js` | Phaser y Web Audio. |

## Las escenas

Cuatro escenas de Phaser, en el orden en que se recorren:

- **`intro.js`**: la compuerta (el primer toque desbloquea el audio y, en
  Android, pide la pantalla completa) y el opening, que se ve una vez por
  aparato.
- **`editor.js`**: la pinta (cara, piel, pelo y camiseta).
- **`master.js`**: la carrera: el mapa de las localidades, la entrevista, la
  tabla, la semana y el código de carrera.
- **`match.js`**: el partido.

El resto de `scenes/` son **mixins**: se suman a una escena con
`Object.assign(window.PampaMatch.prototype, …)` y le agregan una parte sin
agrandar `match.js`. Por ejemplo `definicion_ui.js` (el mano a mano con el
arquero), `jugadon_ui.js`, `cartas_ui.js`, `cine_arte.js` y
`toma_remate.js`. Tres entran en las cuatro escenas: `piel_ui.js` (la piel
común y la única puerta de la música, `pedirMusica`), `foco_ui.js` (el
cursor para jugar con el teclado) y `pantalla_ui.js` (la pantalla
completa). `reloj.js` hace que las animaciones y las esperas avancen con un
solo reloj.

Dos reglas que se cumplen en todas:

- **Estado limpio en `init()`.** Phaser reusa la instancia de la escena en
  cada `scene.start()`: todo estado nuevo (banderas, cachés, contadores) se
  reinicia en `init()`. Lo vigila `test/p1_estado_limpio.test.js`.
- **La pose ilustrada no se anima:** queda quieta y con corte seco; lo que se
  mueve es todo lo demás (el fondo, las líneas de velocidad, la cámara).

## El arranque y la caché

`index.html` muestra el cartel de carga desde el primer byte, carga la
lógica, Phaser y las escenas, y baja el arte de a poco, a medida que hace
falta (`logic/carga.js`). `sw.js` guarda el código con red primero (un
deploy nuevo llega en la próxima apertura) y los assets con caché primero y
una huella por archivo (no se baja de nuevo lo que no cambió). Todo archivo
nuevo que carga `index.html` va también al `PRECACHE` de `sw.js`;
`test/sw_precache.test.js` lo controla.

## Los tests

```bash
bash test.sh                          # desde la raíz: la suite entera
node phaser/test/seccion11.test.js    # un archivo suelto
```

Cada archivo de `test/*.test.js` corre en node, sin navegador, y termina con
`process.exit`: un test que falla frena la suite. El encabezado de cada uno
cuenta qué estaba mal y cómo se midió. Los que necesitan una escena la
arman de mentira (`_escena_de_mentira.js`, `_partido_de_mentira.js`,
`_sw_de_mentira.js`). Los guardianes que conviene conocer:

- `seccion11.test.js`: nada de marcas, clubes, medios ni juegos ajenos, y
  sin apuestas, en el producto y en los dos README.
- `desconectados.test.js`: lo que se construyó tiene que estar conectado (que
  algo lo llame y que se vea), no en una capa invisible o detrás de un flag.
- `p1_estado_limpio.test.js`: el estado de cada escena se reinicia en
  `init()`.
- `sw_precache.test.js`: lo que carga el juego está en la caché del worker.

## Sin terceros

Las ilustraciones, el logo y las poses son originales del proyecto, y los
archivos de `../assets/` no se reprocesan: lo que haga falta se compone en
el juego o en un archivo nuevo. Phaser va en `vendor/` (licencia MIT). Las
tipografías son OFL (`../assets/fonts/README.md`). Nada de arte, sonido,
nombres ni terminología de otros juegos: de los juegos de fútbol por
comandos se toma la forma de jugar, nada más.
