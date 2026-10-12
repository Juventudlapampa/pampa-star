/* ============================================================================
   PAMPA STAR · L04 — EL GESTO "ATRÁS" DEL TELÉFONO NO TE SACA DEL PARTIDO

   LO QUE ESTABA MAL (medido en el código de antes de este lote):
     · popstate, pushState, beforeunload y pagehide daban 0 resultados en
       phaser/ (grep). En el teléfono el gesto atrás (deslizar desde el borde, que
       en horizontal queda bajo los pulgares) o la tecla atrás salía de la
       página: abierto desde un mensaje en una pestaña sin historial, la
       cerraba; instalado, cerraba la app. El partido se perdía entero;
     · index.html no fijaba overscroll-behavior ni touch-action, y Phaser
       cancela el toque solo cuando el blanco es el lienzo
       ('e.capture&&t.cancelable&&t.target===s&&t.preventDefault()' en
       vendor/phaser.min.js): las bandas negras de Scale.FIT quedaban sin
       protección (deslizar para recargar, mantener apretado para copiar).

   LO QUE SE PRUEBA:
     [1] la tabla de logic/atras.js decidir(): LIBRE, MENU (con y sin
         salida), PASE, PAUSA, DEFINICION, FINAL, el menú de tempo, el Master
         (la semana, con la caja del código), el editor y la intro, con un
         doble atrás dentro y fuera de los 2.000 ms (el criterio de aceptación);
     [2] lo estático de index.html: popstate, pushState, overscroll-behavior,
         touch-action, user-select y callout (con las cajas de texto que lo
         recuperan), disableContextMenu, atras.js cargado y en el precache;
     [3] el script del atrás de index.html CORRIENDO con un historial y un
         juego de mentira: el escalón se pone con el primer toque (y una vez),
         el editor pide confirmar y el segundo atrás sale, el partido recibe
         su decisión, "Algo se trabó" manda, y volver del Master no cuenta
         como el primer atrás del editor;
     [4] el partido (match.js real) cumple cada decisión;
     [5] el Master (master.js real) vuelve a la vista anterior.

   Corré:  node phaser/test/atras.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var RAIZ = path.join(__dirname, "..", "..");
function leer(f) { return fs.readFileSync(path.join(RAIZ, f), "utf8"); }
var INDEX = leer("phaser/index.html");

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

var AT = null;
try { AT = require(path.join(RAIZ, "phaser/logic/atras.js")); } catch (e) { AT = null; }
assert(!!(AT && AT.decidir), "SÍNTOMA: no existe logic/atras.js con decidir()");
if (!AT || !AT.decidir) { console.log("\n✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }

/* ---------- [1] LA TABLA ---------- */
(function () {
  var T = [
    [{ escena: "match", estado: "LIBRE" }, Infinity, "pausa", "partido en LIBRE: abre la PAUSA"],
    [{ escena: "match", estado: "LIBRE" }, 300, "pausa", "partido en LIBRE, doble atrás rápido: sigue pausando, nunca sale"],
    [{ escena: "match", estado: "MENU", menuConSalida: true }, Infinity, "cerrar_menu", "la cruz con ✕: se cierra (lo que hacía ESC)"],
    [{ escena: "match", estado: "MENU", menuConSalida: false }, Infinity, "pausa", "la cruz que hay que contestar: pide la pausa para después"],
    [{ escena: "match", estado: "PASE", menuConSalida: true }, Infinity, "cerrar_menu", "el pase dirigido: se cancela"],
    [{ escena: "match", estado: "PAUSA" }, Infinity, "cerrar_menu", "con la PAUSA abierta: SEGUIR"],
    [{ escena: "match", estado: "PAUSA" }, 200, "cerrar_menu", "con la PAUSA abierta, doble atrás rápido: SEGUIR, no sale"],
    [{ escena: "match", estado: "DEFINICION" }, Infinity, "pausa", "la Definición: la pausa queda pedida"],
    [{ escena: "match", estado: "DEFINICION" }, 500, "pausa", "la Definición, doble atrás: tampoco sale"],
    [{ escena: "match", estado: "ESCENA" }, Infinity, "pausa", "una escena: la pausa queda pedida"],
    [{ escena: "match", estado: "FINAL" }, Infinity, "volver", "la pantalla final: su salida principal"],
    [{ escena: "match", estado: "TEMPO_MENU" }, Infinity, "volver", "el menú de tempo (antes de empezar): vuelve sin jugar"],
    [{ escena: "master", vista: "semana" }, Infinity, "volver", "la semana del Master: la vista anterior"],
    [{ escena: "master", vista: "semana" }, 400, "volver", "la semana, doble atrás: vuelve dos veces, no sale"],
    [{ escena: "master", cajaAbierta: true }, Infinity, "cerrar_menu", "la caja del código de carrera: se cierra"],
    [{ escena: "editor" }, Infinity, "confirmar_salida", "editor, primer atrás: 'Tocá ATRÁS otra vez para salir'"],
    [{ escena: "editor" }, 0, "salir", "editor, segundo atrás en el mismo instante: sale"],
    [{ escena: "editor" }, 1999, "salir", "editor, segundo atrás a los 1.999 ms: sale"],
    [{ escena: "editor" }, 2000, "confirmar_salida", "editor, segundo atrás a los 2.000 ms: vuelve a confirmar"],
    [{ escena: "editor" }, 3500, "confirmar_salida", "editor, segundo atrás a los 3,5 s: vuelve a confirmar"],
    [{ escena: "editor" }, -5, "confirmar_salida", "un tiempo negativo no cuenta como dentro de la ventana"],
    [{ escena: "intro" }, Infinity, "confirmar_salida", "intro, primer atrás: confirmar"],
    [{ escena: "intro" }, 800, "salir", "intro, segundo atrás a los 800 ms: sale"],
    [{ escena: null }, Infinity, "confirmar_salida", "sin juego todavía: confirmar"],
    [null, 100, "salir", "sin estado y dentro de la ventana: sale"]
  ];
  T.forEach(function (c) {
    var d = AT.decidir(c[0], c[1]);
    assert(d === c[2], c[3] + " (dio " + d + ")");
    assert(AT.DECISIONES.indexOf(d) >= 0, "la respuesta es una de las cinco (" + d + ")");
  });
  assert(AT.decidir({ escena: "editor" }, 2500, { ventana: 3000 }) === "salir", "la ventana se puede ajustar (balance.pausa.atras_ventana_ms)");
  var BAL = JSON.parse(leer("phaser/data/balance.json"));
  assert(BAL.pausa && BAL.pausa.atras_ventana_ms === AT.VENTANA_MS && AT.VENTANA_MS === 2000, "la perilla y el valor por defecto dicen lo mismo: 2.000 ms");
  assert(/^Tocá ATRÁS otra vez para salir$/.test(AT.MENSAJE), "el aviso dice qué hacer: " + AT.MENSAJE);
  console.log("[1] la tabla: " + T.length + " casos (LIBRE, MENU, PASE, PAUSA, DEFINICION, FINAL, tempo, Master, editor, intro; dentro y fuera de 2.000 ms)");
})();

/* ---------- [2] LO ESTÁTICO DE index.html ---------- */
(function () {
  assert(/window\.addEventListener\("popstate", AT\.alAtras\)/.test(INDEX), "SÍNTOMA: index.html no escucha popstate");
  assert(/history\.pushState\(\{ pampa: 1 \}, ""\)/.test(INDEX), "SÍNTOMA: index.html no pone su escalón con pushState({pampa:1})");
  var css = INDEX.match(/html,body\{overscroll-behavior:none;[^}]*\}/);
  assert(!!css, "SÍNTOMA: html y body no fijan overscroll-behavior:none (deslizar recarga la página)");
  ["touch-action:none", "user-select:none", "-webkit-user-select:none", "-webkit-touch-callout:none"].forEach(function (p) {
    assert(css && css[0].indexOf(p) >= 0, "html,body fija " + p);
  });
  assert(/textarea,input\{-webkit-user-select:text;user-select:text;-webkit-touch-callout:default;touch-action:auto;\}/.test(INDEX),
    "las cajas de texto recuperan seleccionar y el menú de pegar (el código de carrera se pega manteniendo apretado)");
  assert(/disableContextMenu: true/.test(INDEX), "config.disableContextMenu = true");
  var iAtras = INDEX.indexOf('<script src="logic/atras.js"></script>'), iEsc = INDEX.indexOf('<script src="scenes/');
  assert(iAtras > 0 && iAtras < iEsc, "index.html carga logic/atras.js antes de las escenas");
  assert(/"\.\/logic\/atras\.js"/.test(leer("phaser/sw.js")), "y está en el PRECACHE de sw.js (el juego abre sin red)");
  assert(/<div id="atras-aviso" role="status" aria-live="polite" hidden><\/div>/.test(INDEX), "el aviso de salir existe (DOM, arriba del 'Girá el celular')");
  console.log("[2] popstate + pushState + overscroll/touch-action/user-select/callout + disableContextMenu + atras.js en el precache");
})();

/* ---------- [3] EL SCRIPT DEL ATRÁS, CORRIENDO ---------- */
var bloque = null;
(INDEX.match(/<script>([\s\S]*?)<\/script>/g) || []).forEach(function (s) { if (/window\.PampaAtrasDOM = /.test(s)) bloque = s.replace(/^<script>|<\/script>$/g, ""); });
function mundo(opts) {
  opts = opts || {};
  var T0 = { t: 1000 }, oy = {}, timers = [];
  var hist = { entradas: [opts.estadoInicial || null], i: 0, pushes: 0, backs: 0,
    pushState: function (st) { this.entradas = this.entradas.slice(0, this.i + 1); this.entradas.push(st); this.i++; this.pushes++; },
    back: function () { this.backs++; } };
  Object.defineProperty(hist, "state", { get: function () { return hist.entradas[hist.i]; } });
  var aviso = { hidden: true, textContent: "" };
  var emitidos = [];
  var escena = { key: opts.escena || "editor", estado: opts.estadoAtras || null };
  var juego = {
    registry: { get: function (k) { return k === "balance" ? { pausa: { atras_ventana_ms: 2000 } } : null; } },
    scene: { getScenes: function () {
      return [{ sys: { settings: { key: escena.key } }, estadoAtras: escena.estado ? function () { return Object.assign({}, escena.estado); } : undefined }];
    } },
    events: { emit: function (n, d) { emitidos.push({ n: n, d: d }); } }
  };
  var W = {
    PampaAtras: AT, PAMPA_GAME: juego,
    performance: { now: function () { return T0.t; } },
    addEventListener: function (ev, f) { (oy[ev] = oy[ev] || []).push(f); }
  };
  var ctx = { window: W, history: hist, Date: Date,
    document: { getElementById: function (id) { return id === "atras-aviso" ? aviso : null; } },
    setTimeout: function (f, ms) { var t = { f: f, at: T0.t + ms }; timers.push(t); return t; },
    clearTimeout: function (t) { timers = timers.filter(function (x) { return x !== t; }); } };
  W.history = hist;
  vm.createContext(ctx);
  vm.runInContext(bloque, ctx);
  return {
    W: W, hist: hist, aviso: aviso, emitidos: emitidos, escena: escena,
    disparar: function (ev) { (oy[ev] || []).forEach(function (f) { f({}); }); },
    /* el gesto atrás: el navegador baja un escalón y avisa popstate */
    atras: function () { if (hist.i > 0) hist.i--; (oy.popstate || []).forEach(function (f) { f({ state: hist.state }); }); },
    pasar: function (ms) { T0.t += ms; timers.slice().forEach(function (t) { if (t.at <= T0.t) { timers.splice(timers.indexOf(t), 1); t.f(); } }); }
  };
}
(function () {
  assert(!!bloque, "index.html tiene el script del atrás (PampaAtrasDOM)");
  if (!bloque) return;
  /* el escalón: con el primer toque, una vez */
  var M = mundo();
  assert(M.hist.pushes === 0, "al cargar no se empuja nada (el navegador saltea las entradas sin toque)");
  M.disparar("pointerup");
  assert(M.hist.pushes === 1 && M.hist.state && M.hist.state.pampa === 1, "el primer toque pone el escalón {pampa:1}");
  M.disparar("pointerup"); M.disparar("keydown");
  assert(M.hist.pushes === 1, "los toques siguientes no apilan más escalones");
  var R = mundo({ estadoInicial: { pampa: 1 } });
  R.disparar("touchend");
  assert(R.hist.pushes === 0, "después de recargar el escalón ya está: no se apila otro");

  /* el editor: confirmar y salir */
  M.atras();
  assert(M.hist.pushes === 2 && M.hist.state && M.hist.state.pampa === 1, "editor, primer atrás: el escalón se repone");
  assert(M.aviso.hidden === false && /Tocá ATRÁS otra vez para salir/.test(M.aviso.textContent), "y aparece 'Tocá ATRÁS otra vez para salir' (" + M.aviso.textContent + ")");
  M.pasar(1500);
  assert(M.aviso.hidden === false, "a los 1,5 s el aviso sigue");
  M.atras();
  assert(M.hist.backs === 1 && M.hist.pushes === 2, "segundo atrás a los 1,5 s: NO se repone y se hace history.back() (sale)");
  assert(M.aviso.hidden === true, "y el aviso se va");
  M.disparar("pointerup");
  assert(M.hist.pushes === 3, "si se queda en la página (no había a dónde volver), el próximo toque vuelve a poner el escalón");

  /* fuera de la ventana, vuelve a confirmar */
  var F = mundo(); F.disparar("click");
  F.atras(); F.pasar(2100);
  assert(F.aviso.hidden === true, "a los 2,1 s el aviso ya se fue");
  F.atras();
  assert(F.hist.backs === 0 && F.aviso.hidden === false, "un segundo atrás a los 2,1 s vuelve a pedir confirmación (no sale)");

  /* el partido en LIBRE: el juego recibe la decisión */
  var P = mundo({ escena: "match", estadoAtras: { escena: "match", estado: "LIBRE" } }); P.disparar("pointerup");
  P.atras(); P.atras(); P.atras();
  assert(P.hist.backs === 0 && P.hist.pushes === 4, "en el partido, tres atrás seguidos nunca salen: el escalón se repone siempre");
  var ev = P.emitidos.filter(function (e) { return e.n === "atras"; });
  assert(ev.length === 3 && ev[0].d.decision === "pausa" && ev[0].d.escena === "match", "y el partido recibe 'atras' con la decisión pausa");
  assert(P.aviso.hidden === true, "sin el aviso de salir");

  /* con "Algo se trabó" a la vista, atrás no hace nada */
  var E = mundo({ escena: "match", estadoAtras: { escena: "match", estado: "LIBRE" } }); E.disparar("pointerup");
  E.W.PampaRed = { tipo: "trabado" };
  E.atras();
  assert(E.emitidos.length === 0 && E.hist.pushes === 2 && E.hist.backs === 0, "con el aviso de error a la vista: se repone el escalón y nada más");

  /* del Master al editor y atrás enseguida: no sale (el anterior no pidió confirmar) */
  var X = mundo({ escena: "master", estadoAtras: { escena: "master" } }); X.disparar("pointerup");
  X.atras();
  assert(X.emitidos.length === 1 && X.emitidos[0].d.decision === "volver", "en el Master: 'volver'");
  X.escena.key = "editor"; X.escena.estado = null;
  X.pasar(400);
  X.atras();
  assert(X.hist.backs === 0 && X.aviso.hidden === false, "volver del Master al editor y tocar atrás 0,4 s después pide confirmar, no sale");
  console.log("[3] escalón con el primer toque · editor: confirmar y salir a los 1,5 s · partido: nunca sale · el error manda");
})();

/* ---------- [4] EL PARTIDO CUMPLE ---------- */
(function () {
  var PM = require("./_partido_de_mentira.js");
  var SRC = PM.leer("phaser/scenes/match.js").replace(/\r\n/g, "\n");
  var cre = SRC.slice(SRC.indexOf("  create() {"));
  cre = cre.slice(0, cre.indexOf("\n  }\n"));
  assert(/const alAtrasDelTelefono = \(ev\) => \{ if \(ev && ev\.escena === "match"\) this\.alAtras\(ev\.decision\); \};/.test(cre),
    "create() escucha 'atras' y cumple solo lo que es para el partido");
  assert(/this\.game\.events\.on\("atras", alAtrasDelTelefono\)/.test(cre) &&
    /this\.events\.once\("shutdown", \(\) => this\.game\.events\.off\("atras", alAtrasDelTelefono\)\)/.test(cre),
    "colgado del juego y descolgado con el shutdown (si no, se apilan partido tras partido)");

  var E = PM.escena(), s = E.s;
  s.st.modo = "juego";
  assert(s.alAtras(s.decidirAtras()) === true && s.estado === "PAUSA", "LIBRE + atrás: PAUSA");
  assert(s.alAtras(s.decidirAtras()) === true && s.estado === "LIBRE", "PAUSA + atrás: SEGUIR");
  var cerrado = 0;
  s.estado = "MENU"; s._menuVolver = function () { cerrado++; s.estado = "LIBRE"; };
  s.alAtras(s.decidirAtras());
  assert(cerrado === 1 && s.estado === "LIBRE", "MENU con ✕ + atrás: se cierra la cruz");
  s.estado = "MENU"; s._menuVolver = null;
  s.alAtras(s.decidirAtras());
  assert(s.estado === "MENU" && s._pausaPedida === true, "MENU sin ✕ + atrás: la pausa queda pedida");
  var cancel = 0;
  s._pausaPedida = false; s.estado = "PASE"; s._paseCancelar = function () { cancel++; s.estado = "LIBRE"; };
  s.alAtras(s.decidirAtras());
  assert(cancel === 1, "PASE + atrás: se cancela el pase");
  s.estado = "DEFINICION";
  s.alAtras(s.decidirAtras());
  assert(s.estado === "DEFINICION" && s._pausaPedida === true, "DEFINICION + atrás: no se corta la Definición, la pausa espera");
  /* el menú de tempo: vuelve sin jugar */
  var Tm = PM.escena({ master: true }); Tm.s.estado = "TEMPO_MENU";
  Tm.s.alAtras(Tm.s.decidirAtras());
  assert(Tm.irA.indexOf("master") >= 0 && Tm.s.game.registry.get("masterPartido") === undefined, "TEMPO_MENU + atrás en una fecha: vuelve al Master sin jugar");
  /* el final: la salida principal */
  var Fm = PM.escena(); Fm.s.finDelPartido();
  Fm.s.alAtras(Fm.s.decidirAtras());
  assert(Fm.irA.indexOf("editor") >= 0, "FINAL del amistoso + atrás: VOLVER AL MENÚ");
  /* el evento del juego: solo cumple si es para el partido */
  var G = PM.escena(), sg = G.s; sg.st.modo = "juego";
  var h = function (ev) { if (ev && ev.escena === "match") sg.alAtras(ev.decision); };
  sg.game.events.on("atras", h);
  sg.game.events.emit("atras", { decision: "pausa", escena: "editor" });
  assert(sg.estado === "LIBRE", "un 'atras' de otra escena no toca el partido");
  sg.game.events.emit("atras", { decision: "pausa", escena: "match" });
  assert(sg.estado === "PAUSA", "el suyo sí");
  console.log("[4] match.js: LIBRE→PAUSA→SEGUIR · cruz con ✕ se cierra · sin ✕ y Definición: pausa pedida · tempo y final salen por su puerta");
})();

/* ---------- [5] EL MASTER VUELVE A LA VISTA ANTERIOR ---------- */
(function () {
  var M = require("./_escena_de_mentira.js");
  var A = M.armar(), W = A.window;
  A.localStorage.setItem("pampa_master_v1", JSON.stringify(A.carreraNueva()));
  var antes = A.juegoEventos.listenerCount("atras");
  var s = A.nueva(); s.create();
  assert(A.juegoEventos.listenerCount("atras") === antes + 1, "create() cuelga un oyente de 'atras'");
  assert(typeof s.estadoAtras === "function" && s.estadoAtras().escena === "master", "el Master se presenta (estadoAtras)");
  function atras() { var d = AT.decidir(s.estadoAtras(), Infinity); A.juegoEventos.emit("atras", { decision: d, escena: "master" }); return d; }
  /* la tabla → el editor */
  assert(s.textos().indexOf("PRIMERA B · TEMPORADA 1") >= 0, "control: la escena abre en la tabla");
  atras();
  assert(s._irA.indexOf("editor") >= 0, "tabla + atrás: al editor, de donde se entra (" + s._irA.join(",") + ")");
  /* la semana → la tabla */
  var s2 = A.nueva(); s2.create();
  var rival = (function () { var mp = W.PampaTemporada.miPartido(s2.save.temporada); return mp.local === s2.save.temporada.miClub ? mp.visita : mp.local; })();
  s2.vistaSemana(rival, function () { });
  if (s2._semEvento && !s2._semEventoResuelto) { s2._semEventoResuelto = true; s2.vistaSemana(rival, function () { }); }
  var r0 = s2._restarts;
  var d2 = AT.decidir(s2.estadoAtras(), Infinity);
  A.juegoEventos.emit("atras", { decision: d2, escena: "master" });
  assert(s2._restarts === r0 + 1 && s2._irA.indexOf("editor") < 0, "LA SEMANA + atrás: vuelve a la tabla (restart), no al editor");
  /* el día suelto → la semana */
  s2.vistaElegirDia(0);
  var enDia = s2.textos().join(" | ");
  s2.alAtras("volver");
  var tx = s2.textos().join(" | ");
  assert(tx !== enDia && /LA SEMANA · fecha/.test(tx), "el día suelto + atrás: vuelve a LA SEMANA");
  /* la caja del código: se cierra */
  s2._caja = { el: {} };
  assert(AT.decidir(s2.estadoAtras(), Infinity) === "cerrar_menu", "con la caja del código abierta: cerrar_menu");
  s2.alAtras("cerrar_menu");
  assert(!s2._caja, "y se cierra");
  /* la entrevista: la pregunta anterior */
  var s3 = A.nueva(); s3.vistaOrigen("primera_b", 1, [0]);
  assert(/TU HISTORIA · 2 de 3/.test(s3.textos().join("|")), "control: la entrevista en la pregunta 2");
  s3.alAtras("volver");
  assert(/TU HISTORIA · 1 de 3/.test(s3.textos().join("|")), "entrevista + atrás: la pregunta anterior");
  var r3 = s3._restarts; s3.alAtras("volver");
  assert(s3._restarts === r3 + 1, "desde la primera pregunta: a elegir club");
  /* el oyente se va con la escena */
  var n = A.juegoEventos.listenerCount("atras");
  s.events.emit("shutdown");
  assert(A.juegoEventos.listenerCount("atras") === n - 1, "el shutdown descuelga el oyente (no se apilan entrada tras entrada)");
  console.log("[5] master.js: tabla→editor · semana→tabla · día→semana · caja→se cierra · entrevista→pregunta anterior");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
