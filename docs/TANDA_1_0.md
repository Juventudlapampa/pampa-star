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
