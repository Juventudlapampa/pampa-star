/* ============================================================================
   PAMPA STAR · L04 — EL AMISTOSO TIENE SALIDA Y TODO PARTIDO SE PUEDE PAUSAR

   LO QUE ESTABA MAL (medido en el código de antes de este lote):
     · al terminar un amistoso el único botón era "↺ OTRO PARTIDO"
       (scene.restart). Con la PWA instalada, que no tiene barra ni botón
       atrás, no había forma de volver al menú sin cerrar la app;
     · no había pausa: ESC solo cancelaba menús y un mensaje en medio del
       partido dejaba el reloj corriendo;
     · la pantalla final no tenía cursor: ni Enter ni flechas.

   LO QUE SE PRUEBA, con los métodos REALES de scenes/match.js sobre un
   partido de mentira (_partido_de_mentira.js) y logic/partido.js de verdad:
     [1] en PAUSA, 20 cuadros de 300 ms no mueven st.minuto ni st._t, y tick()
         no se llama ni una vez (el criterio de aceptación). Antes de medir,
         se comprueba que los mismos 20 ticks SÍ mueven el reloj en juego:
         si no, el test no estaría midiendo nada.
     [2] la cruz: SEGUIR / SONIDO / salida, con el cursor en SEGUIR, botones
         del alto del piso táctil, y el SONIDO que se prende y se apaga.
     [3] las teclas: P abre y cierra, ESC cierra, la pausa pedida en una
         jugada entra en el primer cuadro de LIBRE.
     [4] las salidas de la pausa: el amistoso vuelve al editor; la fecha del
         Master vuelve al Master sin anotar resultado.
     [5] TODO ESTADO FINAL TIENE SALIDA (amistoso, Master y el puente con el
         clásico), con cursor; las salidas entran después de la espera y una
         tecla sostenida no las confirma. Atrás y ESC esperan lo mismo y
         hacen lo del botón donde arranca el cursor: en el puente con el
         clásico, APLICAR, que escribe pampa_resultado_phaser (revisión L04).
     [6] el botón ⏸ del HUD: área táctil del piso, sin pisar al 🔊.
     [7] (revisión L04) la repetición de tecla: en el partido la filtra
         Phaser; el filtro de foco_ui es el que cuenta en el Master.

   Corré:  node phaser/test/pausa.test.js
   ========================================================================== */
"use strict";
var PM = require("./_partido_de_mentira.js");
var SRC = PM.leer("phaser/scenes/match.js").replace(/\r\n/g, "\n");

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* el reloj de la simulación, con un espía en tick() */
function espiarTick(E) {
  var P = E.W.PampaPartido, orig = P.tick, n = { veces: 0 };
  P.tick = function () { n.veces++; return orig.apply(this, arguments); };
  n.soltar = function () { P.tick = orig; };
  return n;
}

/* ---------- [0] LA PAUSA EXISTE ---------- */
(function () {
  var E = PM.escena(), faltan = ["abrirPausa", "cerrarPausa", "pedirPausa", "alternarPausa", "salirDelPartido", "buildBotonPausa", "salidasDelFinal"]
    .filter(function (k) { return typeof E.s[k] !== "function"; });
  assert(faltan.length === 0, "SÍNTOMA: el partido no tiene pausa ni salidas (faltan " + faltan.join(", ") + ")");
  if (faltan.length) {
    console.log("\n✗ " + mal + " FALLARON (" + ok + " ok)");
    process.exit(1);
  }
})();

/* ---------- [1] EN PAUSA EL RELOJ NO CORRE ---------- */
(function () {
  var E = PM.escena(), s = E.s, P = E.W.PampaPartido;
  /* el control: en juego, 20 ticks de 300 ms SÍ mueven el reloj */
  var C = PM.escena(), stC = C.s.st;
  stC.modo = "juego";
  var m0 = stC.minuto;
  for (var i = 0; i < 20; i++) C.W.PampaPartido.tick(stC, 300, null);
  assert(stC.minuto > m0, "control: en juego 20 ticks tienen que mover el reloj (" + m0 + " → " + stC.minuto + ")");

  s.st.modo = "juego"; s.estado = "LIBRE";
  assert(s.abrirPausa() === true, "abrirPausa() desde LIBRE abre la pausa");
  assert(s.estado === "PAUSA" && s.st.modo === "congelado", "PAUSA con st.modo 'congelado' (" + s.estado + ", " + s.st.modo + ")");
  var min = s.st.minuto, t = s.st._t, espia = espiarTick(E);
  for (var k = 0; k < 20; k++) s.update(k * 300, 300);
  assert(s.st.minuto === min, "SÍNTOMA: en PAUSA, 20 cuadros de 300 ms movieron st.minuto (" + min + " → " + s.st.minuto + ")");
  assert(s.st._t === t, "y tampoco st._t, el reloj de la simulación (" + t + " → " + s.st._t + ")");
  assert(espia.veces === 0, "update() no llama a tick() en PAUSA (lo llamó " + espia.veces + " veces)");
  /* y aunque alguien llamara a tick directo, el modo congelado lo frena */
  for (var j = 0; j < 20; j++) P.tick(s.st, 300, { dx: 1, dy: 0 });
  assert(s.st.minuto === min, "20 tick() directos en PAUSA tampoco mueven el reloj: st.modo congelado");
  espia.soltar();
  assert(s.estado === "PAUSA", "después de 20 cuadros sigue en PAUSA: nada la cierra sola");
  assert(s.cerrarPausa() === true && s.estado === "LIBRE" && s.st.modo === "juego", "cerrarPausa() vuelve a LIBRE y a 'juego'");
  var m1 = s.st.minuto;
  for (var q = 0; q < 20; q++) P.tick(s.st, 300, null);
  assert(s.st.minuto > m1, "y el reloj vuelve a correr");
  console.log("[1] en PAUSA 20 cuadros: minuto " + min.toFixed(3) + " → " + s.st.minuto.toFixed(3) + " recién al seguir · tick() llamado 0 veces");
})();

/* ---------- [2] LA CRUZ DE LA PAUSA ---------- */
(function () {
  var E = PM.escena(), s = E.s, tap = E.BAL.legibilidad.tap_min;
  s.abrirPausa();
  var tx = E.textos();
  assert(tx.some(function (x) { return /PAUSA/.test(x); }), "la pausa se titula PAUSA (" + tx.join(" | ") + ")");
  assert(tx.indexOf("▶ SEGUIR") >= 0, "tiene ▶ SEGUIR");
  assert(tx.indexOf("🔊 SONIDO: SÍ") >= 0, "tiene 🔊 SONIDO: SÍ (ícono + palabra, no solo color)");
  assert(tx.indexOf("◀ VOLVER AL MENÚ") >= 0, "en el amistoso, la salida es ◀ VOLVER AL MENÚ");
  var bs = E.botones();
  /* TANDA 1.0, TEMPO-1: eran tres. La VELOCIDAD vivía en el menú de tempo
     de antes de cada partido, que se fue (decisión de Rodri, 13/oct: el
     tempo se elige al crear la carrera); se cambia acá, al lado del SONIDO */
  assert(bs.length === 4, "cuatro botones en la cruz: SEGUIR, SONIDO, VELOCIDAD y la salida (" + bs.length + ")");
  assert(bs.every(function (b) { return b.height >= tap && b.width >= tap; }), "cada botón mide al menos el piso táctil (" + tap + ")");
  assert(s._foco && s._foco.vivo && s._foco.i === 0, "el cursor arranca puesto, en el primero");
  assert(s._foco && E.textoCerca(s._foco.items[0].obj).indexOf("SEGUIR") >= 0, "y el primero es SEGUIR: un Enter de reflejo no te saca del partido");
  /* los textos de decisión, del piso de legibilidad para arriba (13 px) */
  var chicos = s.menuLayer.list.filter(function (o) { return o.type === "Text" && parseInt(o.style.fontSize, 10) < 13; });
  assert(chicos.length === 0, "ningún texto de la pausa baja de 13 px (" + chicos.map(function (o) { return o.text; }).join(", ") + ")");
  /* el sonido: se prende y se apaga, y el cartel lo dice con palabra */
  var son = bs.filter(function (b) { return /SONIDO/.test(E.textoCerca(b)); })[0];
  E.tocar(son);
  assert(s.SFX.isMuted() === true && E.textos().indexOf("🔇 SONIDO: NO") >= 0, "SONIDO apaga y el botón dice 🔇 SONIDO: NO");
  E.tocar(son);
  assert(s.SFX.isMuted() === false && E.textos().indexOf("🔊 SONIDO: SÍ") >= 0, "otro toque lo vuelve a prender (el juego no queda muteado)");
  assert(s.estado === "PAUSA", "tocar SONIDO no cierra la pausa");
  /* la velocidad: NORMAL de entrada, se cambia con palabra y queda guardada
     en el aparato (pampa_velocidad) para el partido siguiente */
  assert(!s._velRapida && E.textos().indexOf("VELOCIDAD: NORMAL") >= 0, "la VELOCIDAD arranca NORMAL y lo dice");
  var vel = bs.filter(function (b) { return /VELOCIDAD/.test(E.textoCerca(b)); })[0];
  E.tocar(vel);
  assert(s._velRapida === true && E.textos().indexOf("VELOCIDAD: RÁPIDA") >= 0 && E.textos().indexOf("animaciones más cortas") >= 0,
    "tocar VELOCIDAD la pasa a RÁPIDA y el botón lo dice con palabras");
  assert(E.ls.getItem("pampa_velocidad") === "rapida" && s.msV(1000) === 620, "RÁPIDA queda guardada y acorta los tiempos (msV)");
  E.tocar(vel);
  assert(s._velRapida === false && E.ls.getItem("pampa_velocidad") === null && E.textos().indexOf("VELOCIDAD: NORMAL") >= 0, "otro toque vuelve a NORMAL y borra la marca");
  assert(s.estado === "PAUSA", "tocar VELOCIDAD no cierra la pausa");
  /* ENTER confirma lo que tiene el cursor: lo devolvemos a SEGUIR.
     OJO (revisión L04): en el partido de VERDAD esta repetición ni llega,
     porque ENTER tiene objeto Key y Phaser no emite keydown-ENTER para una
     Key que ya estaba apretada. Acá el teclado de mentira la emite igual y
     se prueba el filtro de foco_ui; el caso donde ese filtro es lo único
     que hay, el Master, está en [7]. */
  s._foco.mover(0, true);
  E.tecla("ENTER", { repeat: true });
  assert(s.estado === "PAUSA", "un ENTER SOSTENIDO (repeat) no confirma: confirmar es apretar");
  E.tecla("ENTER", {});
  assert(s.estado === "LIBRE" && s.st.modo === "juego", "ENTER sobre SEGUIR vuelve a LIBRE");
  assert(E.botones().length === 0 && !s._foco, "al seguir, la cruz y el cursor se van");

  /* la ayuda de teclado: en la compu sí, en el teléfono no (revisión L04:
     Phaser crea el teclado también en el celular, y la línea salía ahí) */
  var K = PM.escena(); K.s.abrirPausa();
  assert(K.textos().some(function (x) { return /^teclado:/.test(x); }), "con teclado y sin pantalla táctil, la pausa dice las teclas");
  var Tt = PM.escena({ tactil: true }); Tt.s.abrirPausa();
  assert(!Tt.textos().some(function (x) { return /teclado/.test(x); }), "SÍNTOMA: en el teléfono la pausa muestra la ayuda de teclado (" + Tt.textos().join(" | ") + ")");

  var M = PM.escena({ master: true });
  M.s.abrirPausa();
  var txm = M.textos();
  assert(txm.indexOf("◀ SALIR DEL PARTIDO") >= 0 && txm.indexOf("la fecha queda para jugarla de nuevo") >= 0,
    "en una fecha del Master la salida dice qué pasa con la fecha (" + txm.join(" | ") + ")");
  console.log("[2] la cruz: SEGUIR (con el cursor) · SONIDO SÍ/NO · VOLVER AL MENÚ o SALIR DEL PARTIDO, botones de " + tap + " de alto");
})();

/* ---------- [3] LAS TECLAS Y LA PAUSA PEDIDA ---------- */
(function () {
  var E = PM.escena(), s = E.s;
  /* create() conecta las teclas: se corre solo ese pedazo (el keydown real) */
  var cre = SRC.slice(SRC.indexOf("  create() {"));
  assert(/keydown-P", \(\) => this\.alternarPausa\(\)\)/.test(cre), "create() conecta la tecla P a alternarPausa()");
  /* ESC es el atrás del teclado (L04): la misma tabla que el gesto del teléfono */
  assert(/keydown-ESC", \(\) => this\.alAtras\(this\.decidirAtras\(\)\)\)/.test(cre), "create() conecta ESC al atrás (alAtras(decidirAtras()))");
  /* la escena de mentira no corre create(): las teclas se conectan a mano, igual que ahí */
  s.input.keyboard.on("keydown-P", function () { s.alternarPausa(); });
  s.input.keyboard.on("keydown-ESC", function () { s.alAtras(s.decidirAtras()); });
  s.st.modo = "juego";
  E.tecla("P");
  assert(s.estado === "PAUSA", "P abre la pausa");
  E.tecla("P");
  assert(s.estado === "LIBRE", "P otra vez, sigue");
  E.tecla("P"); E.tecla("ESC");
  assert(s.estado === "LIBRE" && E.botones().length === 0, "ESC cierra la pausa y no la vuelve a abrir");

  /* en una jugada no se abre encima: se pide */
  s.estado = "ESCENA"; s.st.modo = "congelado";
  E.tecla("P");
  assert(s.estado === "ESCENA" && s._pausaPedida === true, "en una ESCENA la pausa queda pedida, no se abre encima");
  assert(E.avisos.some(function (a) { return /pausa entra/.test(a.t); }), "y se avisa que entra al terminar la jugada");
  s.update(0, 16);
  assert(s.estado === "ESCENA", "mientras dura la escena no entra");
  /* la jugada termina: reanudarLibre() de verdad */
  s.quitarDuelo = function () { }; s.zoomBase = function () { };
  s.reanudarLibre();
  var espia = espiarTick(E);
  s.update(16, 16);
  assert(s.estado === "PAUSA" && s.st.modo === "congelado", "en el primer cuadro de LIBRE la pausa pedida entra (" + s.estado + ")");
  assert(espia.veces === 0, "antes de que corra un solo latido");
  espia.soltar();
  assert(s._pausaPedida === false, "y deja de estar pedida");
  /* en el FINAL no hay nada que pausar */
  s.cerrarPausa(); s.estado = "FINAL";
  assert(s.pedirPausa() === false && !s._pausaPedida, "en el FINAL no se pide pausa");
  console.log("[3] P abre y cierra · ESC sigue · pedida en una ESCENA, entra en el primer cuadro de LIBRE");
})();

/* ---------- [4] LAS SALIDAS DE LA PAUSA ---------- */
(function () {
  var E = PM.escena(), s = E.s;
  s.abrirPausa();
  var salir = E.botones().filter(function (b) { return /VOLVER AL MENÚ/.test(E.textoCerca(b)); })[0];
  E.tocar(salir);
  assert(E.irA.indexOf("titulo") >= 0, "amistoso: VOLVER AL MENÚ va a la pantalla de título, por pedido de Rodri del 20/oct: la entrada es la pantalla de título (" + E.irA.join(",") + ")");
  assert(E.restarts === 0, "y no arranca otro partido");

  var M = PM.escena({ master: true }), sm = M.s, anotado = 0;
  sm.anotarResultadoEnLaCarrera = function () { anotado++; return true; };
  sm.abrirPausa();
  var salirM = M.botones().filter(function (b) { return /SALIR DEL PARTIDO/.test(M.textoCerca(b)); })[0];
  M.tocar(salirM);
  assert(M.irA.indexOf("master") >= 0, "Master: SALIR DEL PARTIDO vuelve al Master (" + M.irA.join(",") + ")");
  assert(sm.game.registry.get("masterPartido") === undefined, "la fecha que se jugaba sale del registry (¡A LA CANCHA! no la vuelve a jugar con resultado)");
  assert(anotado === 0 && sm.game.registry.get("masterResultado") === undefined, "y NO se anota resultado: la fecha queda para repetir");
  /* la regla de Rodri la cumple el Master con la marca de L03: semana cerrada → REPETIR */
  var MASTER = PM.leer("phaser/scenes/master.js");
  assert(/semanaCerrada\(this\.save\)[\s\S]{0,400}REPETIR EL PARTIDO/.test(MASTER),
    "el Master ofrece ↺ REPETIR EL PARTIDO cuando la semana ya está cerrada (no se rehace ni se vuelve a sumar)");
  console.log("[4] pausa → amistoso al editor · fecha del Master al Master, sin resultado y con REPETIR");
})();

/* ---------- [5] TODO ESTADO FINAL TIENE SALIDA ---------- */
(function () {
  /* principal: lo que tiene que hacer el botón donde arranca el cursor, que
     es también lo que hacen atrás y ESC (revisión L04). En el partido que
     pide el clásico es APLICAR: escribe pampa_resultado_phaser y vuelve al
     clásico, que desde L08 vive en ../clasico/index.html (la raíz es la
     portada). Antes atrás y ESC ahí iban al editor y la fecha se perdía. */
  function aplicado(E) {
    var r = null;
    try { r = JSON.parse(E.ls.getItem("pampa_resultado_phaser")); } catch (e) { r = null; }
    return !!r && r.fecha === 3 && r.golesMio === 2 && r.golesRival === 1 && E.W.location.href === "../clasico/index.html" && E.irA.length === 0;
  }
  var casos = [
    { n: "amistoso", o: {}, sale: function (E) { return E.irA.indexOf("titulo") >= 0; },
      principal: function (E) { return E.irA.join(",") === "titulo"; } },
    { n: "fecha del Master", o: { master: true }, sale: function (E) { return E.irA.indexOf("master") >= 0 && !!E.s.game.registry.get("masterResultado"); },
      principal: function (E) { return E.irA.join(",") === "master" && !!E.s.game.registry.get("masterResultado"); } },
    { n: "partido pedido por el clásico", o: { pedido: true }, sale: function (E) { return E.irA.indexOf("titulo") >= 0 || /index\.html/.test(E.W.location.href); },
      principal: aplicado }
  ];
  var espera = E0().BAL.pausa.final_espera_ms;
  function E0() { return PM.escena(); }
  /* un final 2-1, como el del primer caso */
  function terminado(o) { var X = PM.escena(o); X.s.st.golesMio = 2; X.s.st.golesRival = 1; X.s.finDelPartido(); return X; }
  casos.forEach(function (c) {
    var E = PM.escena(c.o), s = E.s;
    s.st.golesMio = 2; s.st.golesRival = 1;
    s.finDelPartido();
    assert(s.estado === "FINAL", c.n + ": el final es su estado (FINAL)");
    assert(E.botones().length === 0, c.n + ": en el cuadro del pitazo todavía no hay botones (ESPACIO venía apretado)");
    assert(E.timers.some(function (t) { return t.ms === espera; }), c.n + ": las salidas entran a los " + espera + " ms");
    /* atrás y ESC también esperan: en el pitazo no hacen nada */
    assert(!s._salidaFinal, c.n + ": en el pitazo todavía no hay salida para atrás ni ESC");
    s.alAtras(s.decidirAtras());
    assert(E.irA.length === 0 && E.restarts === 0 && !E.W.location.href && s.estado === "FINAL",
      c.n + ": un atrás o un ESC en el pitazo no saltea el resultado (" + E.irA.join(",") + ")");
    E.correrTimers();
    var bs = E.botones();
    assert(bs.length >= 1, c.n + ": hay al menos un botón (" + bs.length + ")");
    assert(s._foco && s._foco.vivo && s._foco.i === 0, c.n + ": con el cursor puesto");
    assert(s._salidaFinal === s._foco.items[0].cb, c.n + ": la salida de atrás y ESC es el botón donde arranca el cursor");
    /* el botón donde arranca el cursor saca de la pantalla */
    var E2 = terminado(c.o); E2.correrTimers();
    E2.tecla("SPACE", { repeat: true });
    assert(E2.irA.length === 0 && E2.restarts === 0 && !E2.W.location.href, c.n + ": ESPACIO sostenido no elige nada");
    E2.tecla("ENTER", {});
    assert(c.principal(E2), c.n + ": ENTER elige lo que tiene el cursor, la salida principal (" + E2.irA.join(",") + E2.W.location.href + ")");
    /* y alguno de los botones es una SALIDA (no otro partido) */
    var algunaSale = bs.some(function (b) {
      var E3 = terminado(c.o); E3.correrTimers();
      var b3 = E3.botones().filter(function (x) { return x.x === b.x && x.y === b.y; })[0];
      E3.tocar(b3);
      return c.sale(E3);
    });
    assert(algunaSale, c.n + ": al menos un botón SALE de la pantalla final (no solo OTRO PARTIDO)");
    var E4 = terminado(c.o); E4.correrTimers();
    E4.s.alAtras(E4.s.decidirAtras());
    assert(c.principal(E4), c.n + ": atrás (y ESC) con los botones a la vista hace lo mismo que la salida principal (" +
      E4.irA.join(",") + " " + E4.W.location.href + " " + E4.ls.getItem("pampa_resultado_phaser") + ")");
    assert(bs.every(function (b) { return b.height >= 54; }), c.n + ": botones del final de 54 o más de alto");
  });
  /* el amistoso: las dos, y el cursor en VOLVER AL MENÚ */
  var A = PM.escena(); A.s.finDelPartido(); A.correrTimers();
  var tA = A.textos();
  assert(tA.indexOf("◀ VOLVER AL MENÚ") >= 0 && tA.indexOf("↺ OTRO PARTIDO") >= 0, "amistoso: VOLVER AL MENÚ y OTRO PARTIDO (" + tA.join(" | ") + ")");
  assert(/VOLVER AL MENÚ/.test(A.textoCerca(A.s._foco.items[0].obj)), "el cursor arranca en VOLVER AL MENÚ");
  var otro = A.botones().filter(function (b) { return /OTRO PARTIDO/.test(A.textoCerca(b)); })[0];
  A.tocar(otro);
  assert(A.restarts === 1, "OTRO PARTIDO sigue arrancando otro partido");
  /* el ⏸ del HUD se apaga en el final */
  var src = SRC.slice(SRC.indexOf("  pantallaFinal(st) {"));
  src = src.slice(0, src.indexOf("\n  }\n"));
  assert(/this\._btnPausa\) this\._btnPausa\.forEach\(o => o\.setVisible\(false\)\)/.test(src), "pantallaFinal apaga el botón ⏸ PAUSA");
  console.log("[5] los 3 finales tienen salida con cursor, a los " + espera + " ms · ESPACIO sostenido no elige · ENTER sí");
})();

/* ---------- [6] EL BOTÓN ⏸ DEL HUD ---------- */
(function () {
  var E = PM.escena(), s = E.s, tap = E.BAL.legibilidad.tap_min;
  s.buildBotonPausa();
  var zona = s._btnPausa && s._btnPausa[2];
  assert(!!(zona && zona.input && zona.input.hitArea), "el ⏸ tiene su zona de toque");
  var h = zona.input.hitArea, x0 = zona.x - zona.width / 2 + h.x, y0 = zona.y - zona.height / 2 + h.y;
  assert(h.height >= tap, "el área del ⏸ mide " + h.height + " de alto (piso " + tap + ")");
  assert(Math.round(y0) === 0, "y arranca en el borde de arriba (y=" + y0 + "): un dedo no toca fuera del lienzo");
  /* el 🔊 vive en (24,15), 26x26, con área de 44 centrada: termina en x=46 */
  assert(x0 > 46, "no pisa el área del 🔊, que termina en x=46 (el ⏸ arranca en " + x0 + ")");
  var x1 = x0 + h.width;
  /* Pedido de Rodri del 17/oct: fichas y mano pasaron de 11 a 13 px y bajaron
     a una fila propia (y 39), la mano a continuación de las fichas; las dos
     siguen arrancando en x=136 */
  assert((SRC.match(/this\.add\.text\(136, 39,/g) || []).length === 2 && x1 <= 136,
    "las fichas y la mano arrancan en x=136, después del área del ⏸ (" + x1 + ")");
  assert(/⏸ PAUSA/.test(E.textos(s.hudLayer).join("|")), "el botón dice PAUSA, no solo el ícono");
  E.tocar(zona);
  assert(s.estado === "PAUSA", "tocarlo en LIBRE abre la pausa");
  console.log("[6] ⏸ PAUSA: área " + h.width + "x" + h.height + " desde y=0, x " + x0 + "→" + x1 + " (el 🔊 termina en 46)");
})();

/* ---------- [7] LA REPETICIÓN DE TECLA: DÓNDE PASABA DE VERDAD (revisión L04) ----------
   El porqué que dejó el lote (ESPACIO sostenido elegía el primer botón del
   final o de la pausa) no podía pasar en el partido: ahí ESPACIO y ENTER
   tienen objeto Key y Phaser filtra la repetición antes. Medido en el
   motor y en match.js. Donde el filtro de foco_ui es lo único que hay es
   en las escenas sin objetos Key: el Master. Con el foco_ui de antes de
   L04, un ENTER sostenido en ¿EMPEZAR OTRA CARRERA? confirmaba SEGUIR con
   la primera repetición (medido con este mismo armado). */
(function () {
  var PH = PM.leer("phaser/vendor/phaser.min.js");
  assert(PH.indexOf("a&&(h=a.isDown,a.onDown(n)),n.cancelled||a&&h||") >= 0,
    "el motor no emite keydown-X para una Key que ya estaba apretada (KeyboardPlugin.update de Phaser 3.80)");
  assert(/this\.cursors = this\.input\.keyboard\.createCursorKeys\(\);/.test(SRC) && /this\.keyEnter = this\.input\.keyboard\.addKey\("ENTER"\);/.test(SRC),
    "y el partido crea las Key de ESPACIO (createCursorKeys) y de ENTER: ahí la repetición no llega al cursor");
  var MA = require("./_escena_de_mentira.js"), A = MA.armar();
  assert(!/createCursorKeys|addKey\(/.test(PM.leer("phaser/scenes/master.js")), "el Master no crea objetos Key: el filtro es el de foco_ui");
  A.localStorage.setItem("pampa_master_v1", JSON.stringify(A.carreraNueva()));
  var m = A.nueva(); m.create(); m.vistaBorrarCarrera();
  assert(m._foco && m._foco.vivo && m._foco.i === 0, "control: ¿EMPEZAR OTRA CARRERA? abre con el cursor en SEGUIR");
  var r0 = m._restarts;
  m.input.keyboard.emit("keydown-ENTER", { keyCode: 13, repeat: true });
  assert(m._restarts === r0, "SÍNTOMA: en el Master un ENTER sostenido (repeat) confirmó el botón del cursor");
  m.input.keyboard.emit("keydown-ENTER", { keyCode: 13 });
  assert(m._restarts === r0 + 1, "control: un ENTER apretado sí confirma");
  console.log("[7] repetición: en el partido la filtra Phaser (Key de ESPACIO y ENTER) · en el Master, foco_ui");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
