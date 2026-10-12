# PAMPA STAR · TANDA 1.0

La tanda que termina Pampa Star 1.0: el indie que se va a jugar en toda la
provincia, sobre todo en el celular. El backlog completo está en
`.claude/tanda_1_0/olas.json` (seis olas, con el porqué, el criterio de
aceptación y cómo verlo en pantalla de cada ítem) y la definición de terminado
en `.claude/tanda_1_0/definicion_terminado.json`.

Acá queda, ítem por ítem, qué estaba mal, qué se hizo y cómo se verificó. Al
final de cada lote, las decisiones que tomé yo, con el porqué y cómo volver
atrás.

---

## Ola 1 · Que nada se rompa — lote L01-errores

### red-de-errores · ninguna excepción congela el juego ni deja la pantalla negra

**Qué estaba mal (medido).** No había ni un `onerror` ni un
`unhandledrejection` en todo `phaser/` (grep vacío, sin contar vendor). El loop
de Phaser 3.80 es `step(t){ callback(t); if (running) requestAnimationFrame(step) }`:
si el callback tira, el cuadro siguiente no se pide nunca. La auditoría lo midió
con un `delayedCall` que tiraba: `loop.frame` quedó en 4119→4119 con
`running=true`, el juego congelado y nada que se entere. Con `scenes/match.js`
sin bajar, el juego arrancaba igual en la intro y al ir a la cancha quedaban 0
escenas: lienzo negro. Y la PWA instalada (`display: standalone`) no tiene
botón de recargar.

**Qué se hizo** (`phaser/index.html`):

1. **La red va primero**, en un script ES5 antes de `vendor/phaser.min.js`: si
   el motor no baja, el script que lo usa tira y alguien lo ve.
2. **El paso del juego envuelto.** `PampaRed.envolver(Phaser)` cambia
   `Phaser.Game.prototype.step` por uno con try/catch, antes de `new
   Phaser.Game` (`Game.start()` ata `this.step.bind(this)` a su loop). El error
   se guarda en `localStorage.pampa_ultimo_error` (mensaje, dónde, stack
   recortado, escena y estado del partido) y aparece el aviso **"Algo se
   trabó"**: VOLVER AL MENÚ, RECARGAR, SEGUIR IGUAL y COPIAR INFORME. Mientras
   está a la vista, el juego se pausa (`game.pause()`): el loop sigue vivo, el
   partido no corre detrás de la caja.
3. **El tope.** Tres errores sin ~2 s de juego limpio en el medio →
   `loop.sleep()` y ya no se ofrece SEGUIR IGUAL. VOLVER AL MENÚ despierta el
   loop, frena todas las escenas, arranca el editor y no toca el save.
4. **Afuera del loop.** Un listener de `error` (en captura, porque un
   `<script>` que no baja dispara en el elemento y no burbujea) y otro de
   `unhandledrejection`. Los toques los procesa Phaser en el evento del DOM, no
   en el cuadro, así que un error de un toque sale por acá.
5. **Integridad al arrancar.** `arrancarCon` chequea `Phaser`, las cuatro
   clases de escena (`PampaIntro`, `PampaEditor`, `PampaMasterScene`,
   `PampaMatch`) y `PampaPartido`, `PampaTemporada`, `PampaMaster`,
   `PampaAvatar`, `PampaSFX`, más cualquier `<script>` que no haya bajado. Si
   falta algo no crea el juego: **"No terminó de bajar el juego"** con
   REINTENTAR. Un script que no baja lo muestra al toque, sin esperar las
   fuentes.
6. **`.catch` en el `Promise.all` del arranque**: lo que pasaba adentro del
   `then` (arrancarCon, `new Phaser.Game`) se perdía en una promesa rechazada.
7. Con el aviso a la vista, el teclado es del aviso: Phaser escucha en `window`
   y un ESPACIO le abría el menú de jugadas al partido de atrás. Se corta la
   propagación en captura, no el default (Enter sobre un botón lo sigue
   apretando).

**Cómo se verificó.**

- `phaser/test/red_de_errores.test.js` (88 asserts). Lo estático: la red antes
  del motor, los dos listeners, el step envuelto, la lista de obligatorios con
  las 4 clases de escena (y que sean las mismas de `config.scene` y que algún
  script las publique), el chequeo y el envoltorio antes de `new Phaser.Game`,
  el `.catch`. Lo que corre: el script real de index.html con un window y un
  juego de mentira cuyo step tira. El error no se escapa, se guarda, aparece
  el aviso, el juego se pausa, al tercero `loop.sleep`, VOLVER AL MENÚ
  despierta y va al editor sin tocar el save, y el juego limpio resetea la
  cuenta. Probé el test rompiendo la red a propósito (tope y teclado
  apagados): falla con los mensajes de cada síntoma.
- **En el navegador integrado**, el error exacto de la auditoría
  (`scene.getScene('match').time.delayedCall(10,()=>{null.x})` en un partido
  del Master). Aparece "Algo se trabó" con sus cuatro botones, el juego
  pausado, `loop.frame` 54→66→96 (el loop sigue) y `pampa_ultimo_error` con
  escena `match` y estado `LIBRE · 1T`. Un clic de verdad en VOLVER AL MENÚ
  deja el editor activo (`l01_volver_menu_editor.png`), `loop.running=true`,
  el juego despausado, el frame subiendo (2507→2597), `masterPartido` fuera
  del registry y el save intacto.
- **El aviso DOM, mirado.** La captura del panel integrado no dibuja con la
  ventana atrás (se colgó dos veces), así que el aviso se fotografió con el
  mismo Chrome de la máquina, sin ventana y mudo, cargando el juego real en
  un arnés (`.claude/l01_forzar.html`): `l01_trabado_960.png` (960x540) y
  `l01_trabado_800x360_copiar3.png` (celular apaisado, con el informe
  abierto). **REINTENTAR**: copia de index.html con `scenes/match.js`
  apuntando a un archivo que no existe (`.claude/l01_sin_match.html`), en
  `l01_no_bajo_800x360.png`: "No terminó de bajar el juego" con REINTENTAR y
  COPIAR INFORME, en vez del lienzo negro.

### version-e-informe-de-error · versión visible e informe para copiar y mandar

**Qué estaba mal (medido).** `version` y `VERSION` daban 0 resultados en
intro.js y editor.js. La única versión del juego era `VERSION = "v16-toma"`
adentro de `sw.js:10`, donde nadie la ve. Si alguien de una localidad avisa
"se me trabó", no había forma de saber qué versión tenía ni en qué pantalla
estaba, y el error guardado no se podía mandar.

**Qué se hizo.**

- `window.PAMPA_VERSION` en index.html, **igual** a la `VERSION` de sw.js
  (un test lo controla: se suben juntas). Se ve chica abajo a la derecha del
  editor ("versión v16-toma", 12 px, en la esquina libre a la derecha de ¡A LA
  CANCHA!) y en el pie del aviso.
- `phaser/logic/informe.js` (lógica pura, UMD): `armar()` escribe el informe
  en 8-10 renglones (versión, escena y estado del partido, primera línea del
  error, dónde, pantalla, si está instalada, navegador y hora).
  **Nunca lleva nombre, apodo, club ni nada del save.** No lee el save para
  escribir: lo lee sólo para TAPAR. `secretosDelSave()` junta los valores de
  las claves privadas (`name`, `nombre`, `apodo`, `club`, `miClub`, `equipo`,
  `pueblo`, `localidad`, `amigos`…) y `tapar()` los reemplaza por `[…]` en
  todo el texto, también si vienen adentro del mensaje del error. El estado
  del partido va sólo con números y el estado en mayúsculas. `dónde` prefiere
  el primer renglón del stack que es código del juego antes que el motor.
- En el aviso, **COPIAR INFORME**: el texto queda a la vista, seleccionado,
  con la ayuda "Copiá este texto y mandalo a quien te pasó el juego". Si
  `navigator.clipboard` confirma, el botón pasa a "✓ INFORME COPIADO" (tilde
  y texto, no sólo color).
- `balance.contacto` (`mail`, `formulario`), **vacío** por defecto: el destino
  lo define la Subsecretaría. Si se carga, el aviso lo muestra.
- `logic/informe.js` entra en index.html y en el PRECACHE de sw.js.

**Cómo se verificó.**

- `phaser/test/informe.test.js` (53 asserts): el informe trae versión y
  escena y es corto. Con un save que tiene nombre, apodo, club, localidad y
  amigos, ninguno aparece, ni siquiera cuando el mensaje del error los trae
  adentro o viene un save de contrabando en los datos. Están `dónde` en
  Chrome y en Firefox/Safari, el estado sólo con números, `PAMPA_VERSION ===
  VERSION` de sw.js, el precache, la versión en el editor y `contacto` vacío.
  `red_de_errores.test.js [4]` corre COPIAR con y sin portapapeles sobre el
  script real.
- **En pantalla.** En el panel integrado el clic de verdad en COPIAR INFORME
  cayó al texto a mano, porque el portapapeles no da permiso adentro del
  panel. El informe leído del cuadro:
  `versión: v16-toma · escena: match · LIBRE · 1T 0' · 0-0 · error: TypeError…`.
  En Chrome sin ventana, `l01_trabado_800x360_copiar3.png` muestra la ayuda y
  el texto seleccionado. **Lo que se encontró mirando:** con la ayuda debajo
  del texto, a 800x360 quedaba fuera de la caja, y en Chrome sin ventana
  `clipboard.writeText` no contesta nunca (ni sí ni no), así que el botón
  parecía no hacer nada. Ahora la ayuda va arriba del texto y se muestra al
  toque, y el ✓ llega sólo si el portapapeles confirma. La versión en el
  editor se ve en `l01_volver_menu_editor.png`.

**Pendiente.** No existe todavía una pantalla de CRÉDITOS en Phaser: la crea
`creditos` (ola 5, L22). Ahí hay que mostrar `window.PAMPA_VERSION`.

### avisos-visibles · avisar() escribe en una capa que se ve

**Qué estaba mal (medido).** `avisar()` hacía `mundoLayer.add(t)`, y con
`pantalla_partida` (el default) esa capa está apagada desde `create()`. Diez
avisos no se vieron nunca: "⏰ ¡ÚLTIMOS MINUTOS!", "No hay a quién dársela…"
(tocar PASE parecía no hacer nada), "⚔ <rival> juega <perfil>" (la única pista
del perfil adentro del partido), "Marcás con…" (tres llamadas), "🌟 ¡EQUIPO
ENCENDIDO!", el tempo elegido, la ficha de la semana y el "✗ motivo" de una
opción bloqueada (foco_ui.js). Lo marcaron cuatro auditorías. Es el caso diez
de la enfermedad de lo construido y desconectado.

**Qué se hizo** (`phaser/scenes/match.js`, `balance.avisos`):

- Con pantalla partida, `avisar()` encola y `pintarAviso()` escribe en
  **hudLayer**. El aviso va en la **columna izquierda del panel**, apoyado en
  y=276, arriba de "▼10 · VOS" y del relator: 14 px, fondo oscuro, corte a
  250 px. Dos a la vez como mucho, el más nuevo abajo (como un chat). El
  resto espera en cola (tope 4, el más viejo se cae) y el mismo texto
  repetido no se encola dos veces.
- Espera, como la frase del relator, si el HUD está apagado (cine,
  Definición, Jugadón). Si está abierto el menú de tempo o el tutorial
  también espera, y esa espera no lo vence: el perfil del rival sale en
  `create()`, con el menú de tempo encima, y ahora se lee al cerrarlo. Un
  aviso que esperó al HUD más de `vence_ms` (8 s) ya no sale.
- Con el partido terminado no se escribe nada: `pantallaFinal()` llama a
  `limpiarAvisos()` y con `_finalApagado` no se encola.
- La ficha de la semana ("📋 …") va al **ticker del relator**, que ya tenía
  su espera. Se abrió `anunciarEnTicker(frase, ícono)`, y la línea pendiente
  se guarda entera, con su ícono.
- Con `pantalla_partida` apagada sigue el aviso viejo pegado al portador
  (`avisarEnElMundo`), que es el único caso en que el mundo se ve. La guía
  "tocá la cancha (o flechas) para correr" pasó a ese mismo caso: con
  pantalla partida se escribía en la capa apagada.
- `_avisos` y `_avisosCola` se reinician en `init()` (patrón P1).

**Cómo se verificó.**

- `desconectados.test.js` gana la parte **[5]**. Carga la clase de match.js
  con un Phaser de mentira y llama a `avisar()` sobre una escena con pantalla
  partida. El texto queda en un contenedor visible que `uiCam` no ignora, a
  y∈[250,300], con ≥13 px y fondo oscuro. También están la cola (dos a la vez,
  el tercero espera y sale cuando uno se va), el HUD apagado, el menú de tempo
  sin vencimiento, el vencimiento, el final y el modo sin pantalla partida.
  Además hay un **censo**: todo texto que match.js manda a `mundoLayer` tiene
  que estar detrás de `if (!this._split)` o anotado (hoy son 4: la guía,
  detrás de la guarda, y el ▼ del portador, los números de las fichas y
  `avisarEnElMundo`, mirados). Probé el test volviendo `avisar` a la capa del
  mundo: falla con "SÍNTOMA DEL CASO DIEZ".
- **En el navegador integrado**, en un partido del Master contra Espejo de
  Sal (capturas del lienzo en `.claude/shots/`):
  - `l01_antes_aviso.png` (ANTES): `avisar("⏰ ¡ÚLTIMOS MINUTOS!")` no se ve.
  - `l01_aviso_perfil.png`: el primer intento, al centro, se leía pero
    **tapaba la pelota** del portador. Por eso se fue a la columna izquierda.
  - `l01_aviso_perfil2.png`: el perfil del rival esperó detrás del menú de
    tempo y salió al cerrarlo, con "Tempo INTERMEDIO" abajo. La pelota y los
    pies quedan a la vista.
  - `l01_ultimos_minutos.png`: minuto 85 del 2T, "⏰ ¡ÚLTIMOS MINUTOS!" junto al
    relator y a los globos de la tribuna, sin pisarse.
  - `l01_pase_sin_receptor.png`: PASE sin receptores muestra "No hay a quién
    dársela…" (dos llamadas, un aviso).
  - `l01_motivo_bloqueada.png`: activar TIRO bloqueado con el cursor muestra
    "✗ desde campo propio no llega".
  - `l01_cola_y_ficha.png` / `l01_ficha_ticker.png`: un aviso emitido con el
    HUD apagado sale cuando vuelve, y la ficha de la semana se lee en el
    ticker.
  - `l01_final_sin_avisos.png`: en la pantalla final no queda ningún aviso, y
    uno emitido después no aparece.

---

### DECISIONES QUE TOMÉ YO (L01-errores)

1. **El juego se pausa mientras está el aviso "Algo se trabó"**
   (`game.pause()`; el loop sigue vivo y `loop.frame` sigue subiendo). El
   ítem pedía seguir pasando cuadros y dormir el loop al tercer error. Pero el
   aviso tapa toda la pantalla, y con el juego corriendo atrás el partido
   seguía: el rival podía meter un gol que nadie veía. *Revertir:* sacar la
   línea `g.pause()` de `R.mostrar` en index.html.
2. **SEGUIR IGUAL** (no estaba pedido). Muchas excepciones son de un solo
   cuadro: un `delayedCall` que tira no vuelve a dispararse (Phaser lo marca
   como despachado antes de llamarlo). Sin esta opción, cualquier error así
   te sacaba de la fecha. No se ofrece después del tope. *Revertir:* borrar el
   botón `tb-seguir`. **Cambió en la revisión del lote:** tampoco se ofrece con
   una escena a medio armar, y después de apretarlo vigila que el partido
   siga (ver "Revisión del lote L01", puntos 1 y 4).
3. **"Tres errores seguidos" = tres errores sin ~2 s de juego limpio en el
   medio** (`limpiosParaOlvidar: 120` cuadros), no tres cuadros consecutivos.
   Con la pausa nunca hay dos cuadros seguidos con error, y apretar SEGUIR
   IGUAL sobre un error de todos los cuadros tiene que terminar en el tope.
   *Ajustar:* `tope` y `limpiosParaOlvidar` en `window.PampaRed`.
4. **VOLVER AL MENÚ saca `masterPartido` del registry.** Si quedaba, ¡A LA
   CANCHA! del editor volvía a jugar esa fecha y el resultado se cargaba a la
   carrera. El save no se toca. La fecha queda para jugarla desde CARRERA (lo
   de no rehacer la semana es del lote L03/L04).
5. **Durante el arranque los errores se registran pero no se muestran**, salvo
   un `<script>` que no bajó. Decide el chequeo de integridad: un error en un
   archivo no obligatorio no tiene por qué frenar el juego, y si después
   rompe algo, lo agarra el step.
6. **Lo que se ignora:** errores de otro origen (extensiones del navegador),
   "Script error." sin objeto, los avisos de ResizeObserver y las promesas de
   audio rechazadas con `AbortError` o `NotAllowedError` (un `play()` cortado o
   sin gesto todavía). Mostrar "Algo se trabó" por eso sería mentir.
7. **La versión NO se subió** (sigue `v16-toma`). Subir `VERSION` en sw.js barre
   TODO el caché de assets en `activate`, y el crítico de la ola 2 (L05,
   `cache-que-no-se-tira`) pide justamente no hacer eso. Se sube en el
   deploy, con la estrategia nueva. El test obliga a que index.html y sw.js
   digan lo mismo. **Cambió en la revisión del lote:** la versión que se ve y
   el nombre del caché se separaron, así que subirla ya no barre nada, y pasó
   a `v17-1.0-l01` (ver "Revisión del lote L01", punto 9).
8. **El informe tapa de más antes que de menos.** `equipo` también se tapa (los
   clubes de la tabla son ficticios) y los secretos de menos de 3 letras no se
   tapan, porque se comerían palabras del mensaje. `dónde` prefiere el código
   del juego antes que `vendor/phaser.min.js`.
9. **Los avisos en la columna izquierda del panel, no al centro.** El ítem
   decía "franja fija sobre el mapa, y≈250-300". La altura se respetó, pero
   centrado tapaba la pelota del portador (figura anclada en x=400, pies y
   pelota entre 275 y 525, visto en `l01_aviso_perfil.png`), y a la derecha
   están los globos de la tribuna (x≥698). *Revertir:* `balance.avisos.x`, y
   el origen en `pintarAviso`.
10. **El informe queda siempre a la vista al apretar COPIAR**, aunque el
    portapapeles ande: así se ve qué se manda, y que no lleva ningún nombre.
    (En la revisión se arregló que a 800x360 se viera el final del informe y
    no el principio: punto 10 de abajo.)

### Revisión del lote L01 (dos revisores, once hallazgos)

Los once se comprobaron contra el código y, los que se ven, en el navegador.
Los once eran reales; el sexto ("VOLVER AL MENÚ no rearranca el editor") era
el caso 2 del primero y se arregló junto con él. Cada punto es un commit.
Las capturas están en `.claude/shots/rev_*.png`; las del aviso DOM salen de
un navegador sin ventana y mudo, porque la captura del panel integrado no
dibuja con la ventana atrás (se colgó otra vez). El arnés está en
`.claude/rev_forzar.html`.

1. **VOLVER AL MENÚ no volvía al menú si el error salió de un create()**
   (`index.html`, commit 9a3b732). Tres casos, medidos con el Phaser de
   verdad: (a) `processQueue` de Phaser 3.80 no vacía la cola si una op tira,
   y desde la segunda visita el create corre adentro de la cola (el Loader
   saltea lo ya bajado): tras VOLVER AL MENÚ, el cuadro siguiente re-corría
   `[stop editor, start master]` y volvía a la escena rota (editor 5→8,
   master 8→4, el mismo error otra vez); (b) con el editor roto en CREATING,
   `SceneManager.start` no hace nada en START..CREATING: el aviso se iba y
   quedaba el editor a medio armar (`rev_antes_editor_roto.png`); (c) si tira
   el init de la primera escena, Game.start nunca corre y loop.wake() sólo
   prende un rAF vacío. Ahora: se vacía la cola vieja, se frenan TODAS las
   escenas (el menú también) y se arranca el editor; si no queda RUNNING, el
   aviso vuelve con sólo RECARGAR; con una escena a medio armar no se ofrece
   SEGUIR IGUAL; sin juego andando, sólo RECARGAR. Verificado: test [5] con
   un SceneManager de mentira que copia la semántica de 3.80 (con el código
   anterior fallaban 12 asserts) y en el navegador los cuatro casos
   (`rev_a_…`, `rev_b_…`, `rev_c_solo_recargar_800x360.png`,
   `rev_d_sin_loop_800x360.png`).
2. **La flecha quedaba apretada después de SEGUIR IGUAL** (commit 67d96ae).
   El keyup se corta con el aviso y Phaser sólo resetea teclas con el BLUR o
   con la pausa de la ESCENA. Medido: el jugador corrió solo de x=505 a
   x=521,5. Ahora SEGUIR y VOLVER AL MENÚ sueltan las teclas de todas las
   escenas (`resetKeys`); con el arreglo, quieto (505→505).
3. **Un script que bajó pero no se pudo leer se informaba como "conexión
   floja"** (commit 61dd511). El "no bajó: PampaMatch" pisaba el SyntaxError.
   Ahora, si ningún `<script>` falló al bajar y falta una clase, el aviso es
   "El juego no pudo arrancar" (habla del navegador y de la señal), y el
   informe lleva el primer error del arranque, dónde (del evento: el stack de
   un SyntaxError no trae renglones "at") y "no arrancó: PampaMatch".
   Verificado con una copia de index.html con un match.js roto
   (`rev_no_abre_800x360.png`).
4. **SEGUIR IGUAL podía dejar el partido colgado sin aviso** (commit
   fef99eb). Si el callback que tiró era el que avanzaba la jugada, el
   partido quedaba en ESCENA/RESOLUCIÓN con el reloj en 0:00 para siempre
   (`rev_vigia_colgado_6s.png`). Ahora un vigía: si después de SEGUIR el
   partido no cambia de estado ni corre su reloj durante
   `balance.red_de_errores.vigia_seguir_ms` (12 s), el aviso vuelve sin
   SEGUIR. Verificado: a los 12 s vuelve; con un error suelto en LIBRE se
   desarma a los 300 ms y no hubo aviso falso en 20 s.
5. **La cola de avisos mostraba "Marcás con" viejos o contradictorios**
   (commit 75c2411). `avisar(txt, {clave, toque})`: el de la misma clave se
   reemplaza en su lugar; el que contesta a un toque sale ya y, si no hay
   lugar, saca al más viejo. Verificado: cuatro toques reales al mapa dejan un
   solo "Marcás con BRUNO" (`rev_marcas_con_4toques.png`), y PASE sin
   receptores con dos avisos a la vista sale en el mismo cuadro
   (`rev_pase_sin_receptor_ya.png`).
6. **La ficha de la semana no esperaba al tutorial y la pisaba el relator**
   (commit 0e24df2). La franja del ticker ahora espera también detrás del menú
   de tempo y del tutorial, y la ficha va con prioridad: durante su tiempo, la
   frase del relator espera detrás. **Encontrado verificándolo:** al elegir el
   tempo, el tutorial se abría un renglón DESPUÉS de soltar los avisos, así
   que el tempo y el perfil del rival se pintaban y quedaban tapados por el
   velo. Ahora el tutorial se abre antes. Y `_relPendiente` no se reiniciaba
   en `init()` (P1). Verificado: `rev_tutorial_sin_nada_detras.png` y
   `rev_tras_tutorial_ficha_y_avisos.png` (perfil, tempo y ficha a la vista
   al cerrar el tutorial).
7. **El censo [5] daba por guardado cualquier texto después de un `if
   (!this._split)`** (commit 4c1e778). Ahora sigue la profundidad de llaves.
   Con un texto metido fuera de la guarda en create(), el censo nuevo falla;
   el anterior daba 55 verdes.
8. **Sección 11: "WhatsApp" y nombres de navegadores en comentarios**
   (commit 30fbc15). Reescritos ("para pegar en un mensaje", stacks "con at"
   y "con @", "un navegador sin ventana"), y también la _nota vieja de
   `audio_mezcla` que decía "en Chrome".
9. **La versión visible no distinguía builds** (commit 5536aed). `CACHE`
   (nombre del caché, queda "v16-toma") y `VERSION` (la que se ve) van
   separados en sw.js; la versión pasa a `v17-1.0-l01`. Verificado: el
   service worker nuevo conservó una pose ya bajada en el caché y barrió uno
   viejo; el editor dice "versión v17-1.0-l01" (`rev_version_editor.png`).
10. **A 800x360, con el informe abierto, no se veían el título ni las
    primeras líneas** (commit 018dad5). El informe vuelve a su primer
    renglón después del `select()`, y a 420 px de alto o menos la caja aprieta
    sus aires (los botones siguen de 48 px). Verificado:
    `rev_copiar_antes_60000.png` (antes) y `rev_copiar_final_800x360.png`
    (todo a la vista, del título a la versión, con versión, escena y error).

**PASO DEL DEPLOY (obligatorio desde ahora).** En cada publicación que toque
`phaser/`, subir juntas `VERSION` de `phaser/sw.js` y `window.PAMPA_VERSION`
de `phaser/index.html` (informe.test.js obliga a que sean iguales). Subirla
ya no barre el caché de assets: eso lo hace `CACHE`, que no se toca hasta
L05 (`cache-que-no-se-tira`), donde se reemplaza por las dos cachés.

### DECISIONES QUE TOMÉ YO (revisión del lote L01)

1. **VOLVER AL MENÚ frena también el menú y lo rearranca**, aunque esté
   RUNNING (Phaser haría lo mismo con un start sobre una escena corriendo).
   Si el menú no arranca, el aviso vuelve con sólo RECARGAR en vez de
   recargar solo: antes recargaba sin decir nada y, si el error se repetía,
   la persona no entendía qué pasaba. *Revertir:* en `R.volverAlMenu`, el
   `catch` puede volver a `location.reload()`.
2. **Una escena "a medio armar" es una activa en START, INIT o CREATING en
   reposo.** `bootScene` es sincrónico, así que no hay otra forma de quedar
   ahí. INIT sin `active` es la escena agregada que nunca arrancó, y LOADING
   es esperar archivos: ninguna de las dos cuenta. *Ajustar:* `R.escenaRota`.
3. **El keyup se sigue cortando con el aviso a la vista**, y al salir se
   sueltan todas las teclas. Dejarlo pasar (la otra opción del revisor) no
   alcanzaba: Phaser emite `keyup-X` aunque nunca haya visto el keydown.
4. **"El juego no pudo arrancar" cuando faltan clases pero ningún script
   falló al bajar**, haya o no un error registrado. Un archivo cortado a la
   mitad también da un SyntaxError, por eso el texto nombra la señal y el
   navegador. Ofrece REINTENTAR, igual que "no bajó".
5. **El vigía de SEGUIR IGUAL espera 12 s y sólo mira el partido.** Medido en
   un partido entero del Master jugado al azar: el tramo más largo sin cambio
   en un estado automático fue el CINE (2,8 s); la cadena más larga posible
   (megacorrida) son 2 viñetas de 2,6 s. Los estados que esperan a quien
   juega (MENU, PASE, TEMPO_MENU, TUTORIAL, FINAL, DEFINICION, JUGADON) no
   cuentan: la Definición espera el toque indefinidamente (medido: 333 s
   quieta sin que nadie toque). El editor y el Master no tienen vigía: son
   pantallas que esperan un toque. *Ajustar:*
   `balance.red_de_errores.vigia_seguir_ms`.
6. **Las claves de avisos:** `marcacion` ("Marcás con…", las tres llamadas),
   `pase` ("No hay a quién dársela…") y `motivo` (el "✗ motivo" de
   foco_ui.js), las tres como respuesta a un toque. El resto de los avisos
   sigue en la cola común. *Ajustar:* el segundo argumento de cada
   `avisar()`.
7. **La frase del relator que llega con la ficha a la vista no se tira: espera
   detrás** (un solo lugar de espera, y una frase no desplaza a una ficha que
   espera). Sale tarde, como ya pasaba con las frases que esperan al HUD
   (V9 §8).
8. **El guardián de Sección 11 no se amplió a navegadores ni redes.** El ítem
   `navegadores-de-redes-y-guardado` del backlog necesita reconocer esos
   nombres en el user agent; ampliarlo hoy lo dejaría en rojo.
9. **La versión `v17-1.0-l01`**: número nuevo (la tanda 1.0 cambia mucho) y
   el lote, para que cada lote que se publique se distinga (`-l02`…).
   *Revertir:* volver `VERSION`/`PAMPA_VERSION` a "v16-toma"; `CACHE` no hace
   falta tocarlo.

### Deudas que vi y no son de este lote

- **El botón ⚡ACCIÓN reaparece en la pantalla final.** `pantallaFinal()` lo
  apaga, pero `refrescarHUD()` (match.js, "C4 · CON UN MENÚ ABIERTO…") lo
  vuelve a prender en cada cuadro salvo en MENU/PASE. Visto en
  `l01_final_sin_avisos.png`.
- Con un menú de duelo abierto, el título del duelo ("⚔ ¡X te sale al
  cruce!…") cae en la misma línea que el ticker del relator (y≈300) y lo tapa
  (`l01_cola_y_ficha.png`).
- `relatar()` todavía completa `c.jugador` con "el pibe" cuando no hay
  jugador (lenguaje institucional, ola 3).

---

## Ola 1 · Que nada se rompa — lote L02-partido-roto

### corner-no-congela · después de "¡LA SACÓ AL CÓRNER!" el partido sigue

**Qué estaba mal (medido).** `cornerMio()` (logic/partido.js) era la única
salida de un remate que no devolvía `st.modo` a `"juego"`: `kickoff` y
`saqueArquero` sí. El córner llega siempre congelado (lo congela el encuentro
en `tick()` o `onBotonAccion` al abrir el menú de jugadas), y `tick()` sale en
su primer renglón si el modo no es `"juego"`. Medido en node: después de
`cornerMio`, 20 ticks de 300 ms con `dx=-1` dejan el minuto en 0 → 0 y al
jugador en x 1020 → 1020. La auditoría midió 0,94 congelamientos por partido,
en el 58-63% de los partidos; mientras dura, el partido tampoco puede
terminar. Solo se destrababa tocando ACCIÓN.

**Qué se hizo.** `cornerMio` deja `st.modo = "juego"`, el cooldown de siempre
(`ritmo.cooldown_encuentro_ms`, el respiro antes del próximo cruce) y
`st.esperaRival = 0` (el saque es tuyo: la espera de un rival que la pisaba no
cruza al córner). La escena no corre la simulación fuera de LIBRE (`update`
sale antes), así que dejarlo en juego al decidir no adelanta nada mientras se
ve la escena del remate: el reloj arranca cuando vuelve el control. Es la
misma forma en que ya terminaban la atajada y el afuera. El córner como
situación propia (CENTRO o CORTO) sigue siendo del ítem `cpu-y-pelota-parada`.

**Cómo se verificó.**

- `a_remate.test.js` [4] suma cinco asserts: el modo queda en juego, la espera
  del rival en 0, el cooldown es el de balance, y con 20 ticks de 300 ms con
  `dx=-1` el minuto avanza y el jugador se mueve. Contra la `cornerMio` vieja
  fallan cuatro ("quedó 'congelado'", "minuto 0 → 0", "x 1020 → 1020").
- **En el navegador integrado**, por el camino real: partido del Master en
  LIBRE, ⚡ACCIÓN (que congela) → 🎯 TIRO, con el desenlace forzado a córner
  (`PampaDuel.resolveShot` devuelve `corner` una vez). Con la `cornerMio` vieja
  emulada en la página: sale "¡LA SACÓ AL CÓRNER!", vuelve el control y,
  después de 6 s con un destino marcado, el reloj sigue en **2:00 1T**, el 10
  clavado en el banderín de arriba y `st.modo = "congelado"`
  (`l02_corner_antes_b.png`). Con la nueva: **4:30 1T** al volver
  (`l02_corner_despues_a.png`, el 10 en el banderín de abajo), el 10 sale del
  vértice (x 1020 → 970) y a los pocos segundos **4:45 1T** con un rival que le
  sale al cruce (`l02_corner_despues_c.png`).

### boton-super-defensa · SÚPER DEFENSA y la megadefensa con su texto y un toque que responde

**Qué estaba mal (medido).** `defBoton` recibe `(x, texto, sub, color, cb,
ancho)` con la y clavada en la fila de abajo (H-34), y los dos botones extra
de la defensa lo llamaban como si recibiera la y:
`defBoton(W/2, H-108, 300, "🌟 SÚPER DEFENSA · ENVIÓN lleno", color, fn, 300)`.
Corrido un lugar: el botón decía **432** y **300**, el rect recibía una función
como ancho y el texto como color, caía en y=506 encima de los tres botones de
la decisión, y al tocarlo saltaba `TypeError: cb is not a function`.

**Qué se hizo** (scenes/definicion_ui.js). `defBotonEn(x, y, texto, sub,
color, cb, ancho)` es el botón con la y como parámetro, y `defBoton` queda
como su atajo de la fila de abajo, con los mismos textos y tamaños. Los dos
extras pasan por `defBotonEn` en y=432 con texto y sub separados:
"🌟 SÚPER DEFENSA" / "ENVIÓN lleno" y "🔥 <MEGA>" / "<aguante> aguante" (el
costo en número, como en el resto de los botones de la Definición).

**Ojo, y es lo más importante de este ítem:** `defBotonesDef()` **no tiene
llamador**. La V9 C1 sacó la pantalla de defensa a pedido de Rodri ("botones
de gestión no son fútbol"), `entrarDefinicionDef()` sale siempre por
`escenaRemateRival()`, que no tiene botones, y `desconectados.test.js` la
tiene en `MUERTOS_OK` con ese motivo. O sea que el bug era real pero no se
podía ver jugando. El arreglo es para que, si alguien vuelve a abrir esa
pantalla, no explote; **no la recableé**, porque es una decisión de diseño
(ver deudas).

**Cómo se verificó.**

- `definicion.test.js` [8] carga el mixin de verdad sobre una escena de
  mentira (stubs de `add.rectangle`, `add.text`, `cineContent`): 21 asserts.
  Los textos de los botones son string; con el envión lleno hay UN rect en
  y=432, de 300 de ancho y con color numérico; la fila de la decisión sigue
  siendo de tres en y=506; el `pointerdown` corre sin excepción, prende
  `superDef` y avisa "¡SÚPER DEFENSA lista!" sin consumir la decisión. Sin
  envión y con megadefensa, "🔥 TRANQUERA" / "250 aguante" y el toque la deja
  elegida. Sin ninguna de las dos, no hay botón extra. Contra el código viejo
  fallan 16 (los textos salían `432, 300`).
- **En el navegador integrado**, con la pantalla defensiva armada a mano
  dentro del partido (el fondo de tu arco, `_def` en modo def y
  `defBotonesDef()`), porque jugando no se llega: el botón dorado
  "SÚPER DEFENSA / ENVIÓN lleno" arriba de ME TIRO / SALGO A ACHICAR /
  AGUANTO (`l02_superdef_1_boton.png`); el toque emitido sobre ese rect no
  tira y aparece "★ ¡SÚPER DEFENSA lista! Este remate NO entra"
  (`l02_superdef_2_tocado.png`). Con el envión en 0 y el arquero con nivel y
  aguante, "LA TRANQUERA / 300 aguante" y "¡LA TRANQUERA lista!"
  (`l02_superdef_3_mega.png`).

### estado-limpio-partido · el guardián P1 ve de verdad y la memoria del partido arranca de cero

**Qué estaba mal (medido).**

- **El guardián estaba ciego.** La regex del paso [4] de
  `p1_estado_limpio.test.js` había perdido las barras invertidas
  (`/ifs*(s*!s*this.(_?[A-Za-z][w]*)s*)/`): 0 líneas contra 19 reales, o sea
  verde sin mirar nada. El barrido leía solo match.js, y los mixins
  (definicion_ui, escenas_v9, piel_ui…) escriben en la misma instancia. [1]
  solo mira booleanos, así que no ve caches de texto. Y había un agujero más
  que encontré al arreglarlo: el barrido leía el código con comentarios, y el
  propio init() tiene un comentario que dice
  `this._radarTuArco = this.add.text(...)`, que contaba como reinicio.
- **Lo que cruzaba de partido.** `_hudDiv`: `txtDivision` nace vacío en
  buildHUD y el cache decía que "PRIMERA B" ya estaba puesto, así que desde la
  fecha 2 (y en ↺ OTRO PARTIDO) el marcador mostraba la división vacía.
  `_tribunaCansancio`: el partido 2 heredaba la marca "t2" y, cansado en el
  2T, la tribuna no comentaba. Y `_hudEnvionEst`, `_escalonActual`,
  `_poseArqueroUltima`, `_megaGrito` (se leen con un valor por defecto, `|| 2`,
  `|| "arquero_vuela"`, `|| "¡GOOOL!"`, y el primer uso agarraba el del partido
  anterior), `_lecturaSemana` y `_semanaResumen` (se escriben solo si la fecha
  trae semana).
- El comentario de init nombraba un `c4_estado_limpio.test.js` que no existe.

**Qué se hizo.**

- `p1_estado_limpio.test.js`:
  - [0] arma la lista de archivos solo: los `Object.assign(window.PampaMatch.prototype, …)`,
    los mixins que index.html mete en las cuatro escenas (piel y foco) y los
    ayudantes que reciben la escena como `sc` (feel_ui, tribuna_ui): 11
    archivos. Los comentarios se sacan antes de barrer.
  - [2] suma por nombre los reinicios nuevos (con el síntoma de cada uno).
  - [4] con la regex arreglada, sobre todos los archivos, y cuenta las guardas
    `if (!this.X)` que ve (23): si la cuenta cae, el regex se rompió otra vez.
  - [5] **nuevo**: todo campo que se escribe en el partido y se lee como
    memoria (se compara con `===`/`!==`, se niega, hace de guarda o tiene un
    valor por defecto con `||`) y que no se reinicia en init(), en create()
    ni en el cuerpo de los `build*` que create() llama (más `armarPlanteles`)
    → falla con nombre y línea. Lo de un callback en la misma línea
    (`r.on("pointerdown", () => { this._uiTocado = … })`) no cuenta como
    reinicio. Lista blanca `CRUZA_A_PROPOSITO`, cada entrada con su motivo y,
    si alega que se restaura sola, la prueba de que la restauración sigue ahí:
    `_piel`, `_pielTick`, `_yendo`, `_corteMusicaArmado`, `_focoShutdown`,
    `_enHitstop`, `_faltanPoses`. Una entrada que ya no hace falta también
    falla.
  - [6] **el guardián se prueba a sí mismo**: en una copia de match.js le saca
    a init `this._radarTuArco = null`, el de `_hudDiv` y el de
    `_tribunaCansancio`, y exige que los cace.
- `match.js` init(): reinicia los del ítem (`_hudDiv`, `_hudEnvionEst`,
  `_tribunaCansancio`, `_escalonActual`, `_poseArqueroUltima`, `_lecturaSemana = 0`,
  `_semanaResumen = ""`; `_relPendiente` ya lo había puesto L01) y los diez
  que encontró [5]: `_megaGrito`, `_dueloJ`, el menú (`_menuOps`, `_menuSel`,
  `_menuVolver`, `_paseCancelar`, `_menuBtns`), el pase dirigido
  (`_receptores`, `_recSel`), `viajeState`, `_dolly`, la corrida
  (`_animIdle`, `_corriendoDesde`, `_botePelota`), `_hin` (la hinchada del
  panel), `_hintEspacio` (buildBotonAccion solo la crea con teclado) y
  `_uiTocado`. Cada uno con el valor que tenía en el primer partido de la
  sesión, que es el camino probado. Comentario de init corregido.

**Cómo se verificó.**

- Con el init viejo, el guardián nuevo falla: [2] nombra `_hudDiv`,
  `_hudEnvionEst`, `_tribunaCansancio`, `_escalonActual`, `_poseArqueroUltima`,
  `_lecturaSemana` y `_semanaResumen`, y [5] lista 18 campos con línea de
  escritura y de lectura. Con el arreglo, 55 asserts verdes. Sacando a mano
  `this._radarTuArco = null;` del match.js real (y restaurándolo), rojo en [2],
  [4] y [5].
- **En el navegador integrado**, jugando por los botones (con el save del
  pane respaldado antes y restaurado después): fecha 1 del Master (semana →
  ▶ JUGAR LA FECHA → partido → ▶ SEGUIR LA CARRERA), fecha 2 igual, y dos
  amistosos seguidos con ↺ OTRO PARTIDO. Los cuatro dicen **PRIMERA B** bajo el
  marcador (`l02_p1_fecha1_hud.png`, `l02_p1_fecha2_final_div.png`,
  `l02_p1_amistoso2_div.png`), y en el 2T de cada uno, con el aguante bajo,
  Nelda y el Tuli comentan el cansancio (`comentar("cansancio")` una vez por
  partido; `l02_p1_fecha1_cansado.png`, `l02_p1_fecha2_cansado.png`,
  `l02_p1_amistoso2_cansado.png`). El reloj se adelantó al 44' y al 89' para
  no jugar los noventa: los entretiempos y finales son los de verdad. Para ver
  que la prueba discrimina, en un tercer amistoso emulé el init viejo (que no
  tocaba `_hudDiv` ni `_tribunaCansancio`): salió sin división y, cansado en el
  2T, sin ningún comentario (`l02_p1_antes_amistoso3.png`).

### DECISIONES QUE TOMÉ YO (L02-partido-roto)

1. **El córner también pone `esperaRival = 0`**, además de lo que pedía el
   ítem para el modo y el cooldown: si la jugada venía de un rival que la
   pisaba, esa espera no tiene nada que ver con tu saque. *Revertir:* sacar la
   línea en `cornerMio`.
2. **No recableé la pantalla de defensa de la Definición.** El arreglo de los
   botones queda latente porque `defBotonesDef()` no tiene llamador por pedido
   de Rodri (V9 C1). Volver a abrirla cambia el diseño del remate rival, y no
   es de este lote. Para verlo en pantalla la armé a mano en la página.
3. **[5] cuenta como "se rehace en cada partido" lo que asignan los `build*`
   que create() llama y `armarPlanteles`**, solo en el cuerpo del método y
   antes de un callback en la misma línea. Sin eso, la lista blanca hubiera
   tenido cuarenta entradas de objetos que create() ya reconstruye. *Ajustar:*
   la expresión de constructores en `analizar()`.
4. **Ante la duda, a init y no a la lista blanca.** De los 18 que salieron,
   reinicié todos los que son estado del partido, aunque algunos no rompieran
   nada visible hoy (`_uiTocado` es un tiempo del reloj global, siempre en el
   pasado; `_dueloJ` solo se mira con `sprDuelo`, que init ya limpia). La
   lista blanca quedó para lo que cruza A PROPÓSITO (paletas, contadores,
   banderas que se restauran solas al apagarse la escena).
5. **La versión sube a `v17-1.0-l02`** (index.html y sw.js, iguales), como
   dice el paso del deploy de L01: este lote toca phaser/. No barre el caché
   de assets. *Revertir:* volver las dos a `v17-1.0-l01`.

### Deudas que vi y no son de este lote

- **La SÚPER DEFENSA del envión no se puede usar jugando.** Su único consumo
  (`gastarEnvionSuper`, en `defVueloDef`) y su botón viven en la pantalla de
  defensa sin llamador. El envión lleno en defensa no hace nada: el botón
  🌟 del HUD solo aparece con la pelota (potenciar). Hace falta que Rodri
  decida si la escena "te rematan" ofrece algo con el envión lleno o si el
  envión pasa a ser solo de ataque (y entonces se borra la súper defensa y se
  corrige el texto del GDD).
- **El botón ⚡ACCIÓN reaparece en la pantalla final** (ya anotada en L01):
  visto otra vez en `l02_p1_fecha1_final.png`, con "ESPACIO = ACCIÓN".
- La semana muestra **"🔥 ASADO CON LOS PIBES"** (data/semana.json); ya está en
  el ítem de lenguaje institucional de la ola 3.
- En el Master, el menú "¿QUÉ PARTIDO JUGAMOS?" sale en cada fecha; elegir el
  tempo una vez al crear la carrera ya es un ítem del backlog.

---

## Ola 1 · Que nada se rompa — lote L03-saves

Los cuatro ítems tocan la carrera del Master y comparten una herramienta
nueva de prueba: `phaser/test/_escena_de_mentira.js` (no es un test: `test.sh`
corre solo los `*.test.js`). Carga `scenes/master.js` y `scenes/foco_ui.js`
REALES en node con un Phaser de mentira que imita lo que importa acá: la lista
de dibujo y la de entrada (un objeto destruido sale de las dos; uno sacado sin
destruir sigue tocable), el emisor con la semántica de eventemitter3 (el emit
recorre una copia de los oyentes), el toque (`tocar(x, y)`), el teclado
(`teclas("ONE")`) y los `delayedCall` disparados a mano. Así los criterios de
aceptación se miden con el código del juego y no con una copia.

### master-sin-fantasmas · las vistas se vacían de verdad

**Qué estaba mal (medido).** Las cinco vistas que se repintan sin cambiar de
escena (entrevista, semana, evento, día suelto, confirmación de borrar)
limpiaban con el `removeAll` del DisplayList. En Phaser 3.80.1 eso es
`Structs.List.removeAll(skipCallback)`: saca de la lista de dibujo pero no
destruye, y `removeAll(true)` tampoco (el `true` solo saltea callbacks). Con
el código de antes sobre la escena de mentira: la semana tenía 13 zonas
táctiles con 8 a la vista, tocar (100,514) o (60,514) abría "¿EMPEZAR OTRA
CARRERA?" (el ✕ de la tabla seguía ahí abajo), la entrevista pasaba de 4 a 8 a
16 zonas, y después de 4 repintados de la semana había 4 oyentes de la tecla 1
y UNA tecla llenaba 3 ranuras (los `keyboard.once` se apilaban). `foco_ui.js`
colgaba un `events.on("shutdown")` por arranque: 1, 2, 3, 4.

**Qué se hizo.**
- `master.js`: `init()` (la escena no tenía) que reinicia lo que es memoria de
  una entrada: atajos, reloj de la semana, evento, música, la caja del código.
  `vaciarVista()` cierra el cursor, suelta los atajos y el reloj de la semana
  y DESTRUYE cada hijo; reemplaza las cinco llamadas. `atajo()` y
  `soltarAtajos()`: los atajos de una vista se anotan y se van con ella.
- El momento de la acción (la animación de cada acción de la semana) suelta
  los atajos y el cursor de la semana de abajo: con el momento abierto, otra
  tecla o un Enter sobre la tarjeta enfocada llenaba otra ranura. Ahora se
  saltea también con Enter o Espacio.
- `foco_ui.js`: `events.once("shutdown")`, que la bandera vuelve a armar.
- `cine_arte.js`: el comentario que nombraba el `removeAll`.

**Cómo se verificó.**
- `vistas_limpias.test.js` (25 asserts): el guardián estático (ni
  `children.removeAll(` ni `events.on("shutdown"` en `phaser/scenes`, ni
  `keyboard.once` en `master.js`) y los cuatro síntomas corriendo el código
  real. Contra el `master.js` y el `foco_ui.js` de antes da 14 fallas con los
  números de arriba (`node phaser/test/vistas_limpias.test.js <viejo/master.js>
  <viejo/foco_ui.js>`).
- **En el navegador integrado** (mudo, con el arnés del oído), con clics y
  teclas de verdad sobre el lienzo: tabla 3 zonas = 3 visibles, evento 2,
  semana 8 = 8; los toques en (100,514), (60,514) y (200,470) no cambian de
  pantalla; la tecla 1 llena solo el lunes y la 2 con el momento abierto no
  hace nada (`l03_v1_semana_una_ranura.png`); la entrevista 4 → 4 → 4
  (`l03_v1_entrevista_p3.png`); oyentes de shutdown 13 en cuatro arranques
  seguidos (los de Phaser más uno del cursor, constante).

### save-idempotente · recargar no duplica mejoras y el resultado se guarda al pitazo

**Qué estaba mal (medido).** Con el `master.js` de antes: tres ENTRENAR TIRO
(+3), a la cancha, y cuatro "recargas" (crear la escena desde el save y tocar
JUGAR LA FECHA) dejaban tiro en **+15**. `cerrarSemana` sumaba los
permanentes en cada llamada; la semana solo se daba por terminada al volver
con el resultado, que vivía en el registry (memoria de la página) y se
escribía al tocar SEGUIR: cerrar la pestaña en GANASTE perdía la fecha. El
evento de la semana se volvía a sortear con la bolsa ya gastada (otro evento,
otra decisión).

**Qué se hizo.**
- `logic/semana.js`: todo lo de una fecha se marca con LA FECHA (temporada +
  número). `claveDeFecha` / `esLaFecha`; `semanaCerrada` (reconoce también una
  semana cerrada por el código de antes: `semanaResumen` + semana armada sin
  marca, porque solo cerrarSemana escribe ese resumen y el lunes lo vuelve a
  null); `cerrarSemana` (la cuenta que vivía en master.js, igual, pero suma
  una vez por fecha y la segunda llamada devuelve lo que dejó la primera);
  `eventoDeLaFecha` (se sortea una vez y queda en `save.eventoFecha`, con su
  `resuelto`); `anotarResultado` y `resultadoQueCorresponde`.
- `master.js`: `create` aplica el resultado de esta fecha, venga del save
  (`resultadoPendiente`) o del registry, una sola vez, y lo borra; un
  pendiente de otra fecha se tira. `irALaCancha()` arma `masterPartido` con
  `temporadaN` y `fecha` y deja `save.enCancha`. Con la semana ya cerrada, la
  tabla ofrece **↺ REPETIR EL PARTIDO** con el renglón "volviste sin terminar
  el partido: la semana ya está jugada y entrás como llegaste": va directo a la
  cancha, sin rehacer la semana ni el evento (la regla de Rodri para abandonar
  una fecha). `prepararEvento()` lee el evento anotado.
- `match.js`: `finDelPartido` anota el resultado en `pampa_master_v1` AL
  PITAZO (`anotarResultadoEnLaCarrera`); el registry queda de respaldo.
- `lesion.test.js` [4] prueba la molestia de la semana corriendo
  `cerrarSemana` (antes buscaba la línea en master.js, que se mudó).

**Cómo se verificó.**
- `save_idempotente.test.js` (45 asserts): cinco cierres de la misma semana
  con el save ida y vuelta por JSON dejan tiro en +3; master real con 4
  recargas: REPETIR en las cuatro, tiro +3, mismo evento, misma bolsa, misma
  decisión, y REPETIR manda a la cancha lo mismo; un pendiente con el
  registry también cargado y tres entradas a la escena avanzan la fecha
  exactamente 1 y la tabla dice ✔ GANASTE 2-1; un pendiente viejo o un
  resultado sin marca no se aplican; el pitazo está antes del botón.
  `save_viejo.test.js` [8]: una semana cerrada por el código de antes no
  vuelve a sumar.
- **En el navegador integrado**: semana con ENTRENAR TIRO (+1), JUGAR ASÍ,
  partido con tiro 51. Tres recargas de la página: la tabla dice ↺ REPETIR EL
  PARTIDO con su aviso (`l03_v2_recarga1_tabla.png`), el partido arranca con
  tiro 51 y el save sigue en +1, con el mismo evento y la misma bolsa. Final
  forzado (reloj al 92' con el marcador 2-1, el pitazo de verdad): en GANASTE
  el save ya tiene `resultadoPendiente` sin tocar SEGUIR
  (`l03_v2_ganaste.png`); se navega fuera (la pestaña cerrada) y al volver la
  tabla tiene la fecha sumada: PJ 1, 2-1, 3 puntos, FECHA 2 de 18
  (`l03_v2_volver_tabla_sumada.png`).

### save-saneado · un save roto no traba el Master

**Qué estaba mal (medido en la auditoría).** `master.create` hacía
`JSON.parse` y usaba el save tal cual: sin `titulos` tiraba TypeError en la
tabla, sin `tabla` en `temporada.posiciones()`, y la pantalla quedaba sin
botones en cada entrada. Un JSON cortado caía en silencio a elegir club y la
carrera nueva pisaba el texto sin respaldo. `v: 1` se escribía y no lo leía
nadie.

**Qué se hizo.**
- `logic/save_master.js` (nuevo, UMD puro): `sanear(crudo, idsDivisiones,
  opts)` → `{ save, reparado[], irrecuperable, motivo }`. Completa los campos
  que fueron llegando con las tandas, lee la versión, limpia la semana en
  curso y las marcas por fecha sin forma, y valida la temporada: resultados
  legibles; fixture (si no sirve, se rearma desde el orden de la tabla, que es
  el de `crear`); tabla (si falta, se rearma desde los resultados y sale igual
  a la que había); números de la tabla; tu club adentro; división entre las
  que existen; fecha entre 0 y el largo del fixture. Al final la prueba con la
  lógica de la temporada (posiciones, una fecha, el veredicto): si no se
  juega, irrecuperable.
- `master.js`: `create` sanea antes de usar y guarda lo reparado. Lo
  irrecuperable se copia tal cual a `pampa_master_v1_corrupta` y
  `vistaSaveRoto` dice **"Tu carrera guardada no se pudo leer. Quedó un
  respaldo."** con ▶ EMPEZAR OTRA y ✎ VOLVER AL EDITOR. La carrera nueva
  escribe `v` con la constante del módulo.
- `index.html` lo carga y `sw.js` lo precachea.

**Cómo se verificó.**
- `save_corrupto.test.js` (115 asserts): 25 variantes (cortado, `[]`, `{}`,
  un texto, un número, sin títulos, sin tabla, división inexistente, fecha 99,
  negativa o de texto, sin miClub, miClub ajeno, fixture roto, números rotos,
  temporada que no es objeto, semana y mejoras con basura, save viejo sin
  campos nuevos, marcas rotas…): ninguna tira y cada una sale jugable o
  irrecuperable. 400 saves mutados al azar: 359 jugables, 41 irrecuperables, 0
  excepciones, 0 a medias. Master real: sin títulos y sin tabla aparece la
  tabla con sus botones; cortado, el aviso, las dos salidas, el cursor en
  VOLVER y el respaldo.
- **En el navegador integrado**: un save sin `titulos` cargado a mano abre la
  tabla con JUGAR LA FECHA, EDITOR / PINTA y la salida, y queda guardado con
  `titulos: []` (`l03_v3_sin_titulos_tabla.png`); uno cortado a 300 letras
  muestra el aviso (`l03_v3_save_cortado.png`), el texto queda igual en
  `pampa_master_v1_corrupta` y el save no se toca.

### codigo-de-carrera · el respaldo de la carrera: código para exportar e importar, y storage.persist

**Qué estaba mal.** La carrera (de 10 a 37 horas) vivía solo en
localStorage; grep de exportar, importar y `storage.persist` en `phaser/`: 0.
El respaldo de borrarCarrera está en el mismo almacenamiento. Dato de
plataforma, no reproducido: el navegador de algunos teléfonos borra el
almacenamiento de un sitio que no se visita en 7 días si no está instalado.

**Qué se hizo.**
- `logic/carrera.js` (nuevo, UMD puro): `exportar(save)` →
  `PAMPA1.<crc32>.<datos>`: el JSON en UTF-8, comprimido con LZW de ancho
  variable (9 a 16 bits) y en base64 para URL. Mide de 2.900 a 4.100 letras
  (de 2,3 a 2,8 veces menos que el JSON). `importar(codigo)` busca el código
  adentro del texto pegado (saltos de línea, espacios, comillas o el renglón
  del mensaje adelante), verifica versión y CRC, descomprime y lo pasa por
  `sanear`. Cada rechazo tiene su mensaje: vacío, ajeno, de una versión más
  nueva, incompleto o con una letra cambiada, o sin carrera jugable.
- `master.js`: en la tabla, **💾 código de carrera** (espejo de la salida,
  abajo a la derecha) abre la vista del código con club, división, temporada,
  fecha y largo: 📋 COPIAR EL CÓDIGO (si el navegador no deja, una caja con el
  texto seleccionado para copiarlo a mano) y 📤 COMPARTIR cuando el navegador
  tiene `navigator.share`. Al elegir club, **📋 PEGAR UN CÓDIGO** abre la caja
  para pegar: un código malo dice el motivo (✗ y texto) y no toca nada; uno
  bueno respalda lo que hubiera en `pampa_master_v1_borrada`, trae la carrera
  y pide `navigator.storage.persist()`. Crear la carrera también lo pide.
- La caja es DOM (un textarea es lo único que acepta "mantener apretado →
  pegar" en cualquier teléfono), con la piel del aviso de error en
  `index.html` (`#cajacodigo`). Corta las teclas Y los toques, y apaga la
  entrada de la escena mientras está abierta: probando con un clic de verdad,
  SEGUIR ESA CARRERA apretaba también ARRANCAR EN LA PRIMERA B, que estaba
  debajo (Phaser escucha mousedown y touchstart en `window`), y se iba al
  editor.

**Cómo se verificó.**
- `codigo_carrera.test.js` (67 asserts): ida y vuelta deepEqual en cuatro
  carreras (recién creada, a mitad, terminada, club con tildes y ñ); 7
  alterados (una letra, cortado, letras de más, crc cambiado, dos pegados) y 5
  ajenos rechazados con su mensaje; 3 envueltos que entran; 300 alteraciones
  de una letra al azar: 300 rechazadas, 0 entran, 0 excepciones; LZW y base64
  con 60 tiras al azar y el diccionario lleno, CRC estándar; y master real con
  una caja de DOM de mentira (alterado: mensaje, save intacto y los toques no
  pasan; bueno: respaldo, persist y misma fecha).
- **En el navegador integrado**, con dos orígenes como dos navegadores
  (`localhost:8123` y `127.0.0.1:8123` tienen almacenamientos separados): en
  localhost, una carrera en la fecha 6 abre la vista del código
  (`l03_v4_vista_codigo.png`); COPIAR con un clic de verdad: el navegador del
  panel niega el portapapeles ("Write permission denied") y aparece la caja
  con el código seleccionado. En 127.0.0.1, vacío, PEGAR UN CÓDIGO: con una
  letra cambiada dice "✗ El código está incompleto o le cambió alguna letra.
  Copialo de nuevo, entero.", la escena sigue en elegir club y el
  almacenamiento sigue vacío; el bueno, con el renglón del mensaje adelante,
  trae la carrera: FECHA 6 de 18 y la tabla idéntica a la de localhost
  (`l03_v4_tabla_origen.png` y `l03_v4_destino_tabla.png`). A 800x360 la caja
  entra entera, con botones de 48 px.

### DECISIONES QUE TOMÉ YO (L03-saves)

1. **Los atajos se sueltan, no se leen de un oyente único.** De las dos
   salidas que daba el ítem elegí anotar cada atajo y soltarlo en
   `vaciarVista()` (`atajo()` / `soltarAtajos()`): cambia menos el código de
   cada vista. *Revertir:* volver a `keyboard.once` (vuelve el bug).
2. **El momento de la acción se lleva los atajos y el cursor**, y se saltea con
   Enter o Espacio. No lo pedía el ítem, pero era la misma clase de bug (una
   tecla, dos ranuras). *Revertir:* sacar las líneas del principio y del final
   de `momentoDeAccion`.
3. **El guardián mira el texto crudo, comentarios incluidos**: un
   `children.removeAll(` escrito como receta en un comentario se copia. Por eso
   cambié el comentario de `cine_arte.js`. *Aflojar:* sacar los comentarios
   antes de buscar en `vistas_limpias.test.js` [1].
4. **Un resultado sin marca de fecha no se aplica.** El arnés de pruebas arma
   `masterPartido` a mano, sin fecha: desde ahora ese partido NO le suma una
   fecha a la carrera al tocar SEGUIR (antes sí, aunque no fuera la fecha que
   tocaba). Para probar el Master entero hay que entrar por JUGAR LA FECHA.
   *Revertir:* que `resultadoQueCorresponde` acepte uno del registry sin
   `temporadaN` ni `fecha`.
5. **REPETIR EL PARTIDO aparece con la semana cerrada**, no con `enCancha`:
   así también lo ve un save que cerró la semana con el código de antes.
   `enCancha` queda escrito para la regla de abandono de L04 (PAUSA → SALIR).
   *Revertir:* la condición `repetir` de `vistaTemporada`.
6. **El evento se guarda por id**, no entero: si mañana cambia el texto en
   `data/eventos_temporada.json`, la semana en curso muestra el nuevo; si el id
   desaparece, esa semana no tiene evento.
7. **Saneo:** la división inexistente hace volver a empezar la temporada en la
   de la marca de agua (`nivelMax`) o en la primera, conservando títulos,
   mejoras y origen; la fecha fuera de rango vuelve a la de los resultados (no
   a cero); sin club, JSON roto o algo que no es un objeto son irrecuperables.
   En la pantalla del save roto el cursor arranca en VOLVER AL EDITOR, y
   EMPEZAR OTRA no pisa `pampa_master_v1_borrada` (el roto ya quedó en
   `_corrupta`).
8. **El código no se achica más**: no saqué el fixture (que se puede rearmar)
   ni los nombres repetidos. Con LZW genérico la ida y vuelta es exacta por
   construcción y el código entra en un mensaje (≈4.000 letras). *Achicar:*
   sacar `temporada.fixture` antes de exportar y rearmarlo al importar.
9. **`storage.persist` se pide al crear y al traer una carrera**, no en cada
   entrada (en algunos navegadores muestra un permiso).
10. **La versión sube a `v17-1.0-l03`** (index.html y sw.js, iguales), por el
    paso del deploy. No barre el caché de assets. *Revertir:* volver a
    `v17-1.0-l02`.

### Deudas que vi y no son de este lote

- En la tabla, el renglón **"✔ GANASTE 2-1" pisa el nombre del club** (y=84
  contra y=78), visible en `l03_v2_volver_tabla_sumada.png`. Ya pasaba antes
  al volver con SEGUIR.
- El botón **⚡ACCIÓN reaparece en la pantalla final** (ya anotada en L01 y
  L02), visto otra vez en `l03_v2_ganaste.png`.
- Elegir club dice "de la PRIMERA B de tu **pueblo** al MUNDIAL": va con el
  ítem de lenguaje institucional de la ola 3.
- El portapapeles automático no se pudo ver funcionando en el panel (lo niega
  el navegador del panel); en el test corre con un portapapeles de mentira y en
  el panel se vio el camino de la caja. Falta mirarlo en un teléfono.
