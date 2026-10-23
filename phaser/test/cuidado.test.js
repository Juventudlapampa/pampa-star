/* ============================================================================
   PAMPA STAR · NUNCA MÁS DE 3 DESTELLOS POR SEGUNDO, Y EL MOVIMIENTO SUAVE
   (ola 3, L11)

   La pauta WCAG 2.3.1: nada destella más de tres veces en un segundo. Había
   18 flash de cámara sueltos, el cuadro crema del gol, el cuadro de impacto
   de LA ONDA y los negros de corte del cine, y el salteo sin antirrebote:
   tocando seguido, la megacorrida llegaba a 6 destellos en un segundo.
   Ahora todo pasa por las puertas de piel_ui.js con el limitador de
   logic/cuidado.js, y el modo MOVIMIENTO SUAVE (OPCIONES, o el
   prefers-reduced-motion del sistema) apaga sacudones, destellos, líneas de
   velocidad, zooms y la toma 3D del remate.
   node phaser/test/cuidado.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var RAIZ = path.join(__dirname, "..", "..");
function leer(f) { return fs.readFileSync(path.join(RAIZ, f), "utf8").replace(/\r\n/g, "\n"); }
var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }
var C = require("../logic/cuidado.js");
var BAL = JSON.parse(leer("phaser/data/balance.json"));
var CU = BAL.cuidado;

/* el peor segundo: cuántos destellos caen en la ventana de 1 s más cargada */
function peorSegundo(ts) {
  var peor = 0;
  ts.forEach(function (t0) { peor = Math.max(peor, ts.filter(function (t) { return t >= t0 && t < t0 + 1000; }).length); });
  return peor;
}

/* ---------- [1] el limitador ---------- */
(function () {
  assert(CU.destellos_max <= 3 && CU.destellos_ventana_ms >= 1000, "balance.cuidado no deja pasar de 3 destellos en 1000 ms (" + CU.destellos_max + " en " + CU.destellos_ventana_ms + ")");
  var L = C.limitador({ ventana_ms: CU.destellos_ventana_ms, max: CU.destellos_max });
  var pasan = [0, 100, 200, 270, 370, 470].filter(function (t) { return L.pedir(t); });
  assert(pasan.length <= 3 && peorSegundo(pasan) <= 3, "la secuencia 0, 100, 200, 270, 370 y 470 ms deja pasar 3 o menos (" + pasan.join(", ") + ")");
  assert(L.pedir(1000) && !L.pedir(1050), "al segundo vuelve a haber cupo, de a uno (1000 sí, 1050 no)");
  /* mil tandas al azar, como un partido tocado a lo loco */
  var peor = 0, semilla = 7;
  function azar() { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647; }
  for (var k = 0; k < 1000; k++) {
    var Lk = C.limitador({ ventana_ms: CU.destellos_ventana_ms, max: CU.destellos_max }), t = 0, hechos = [];
    for (var i = 0; i < 40; i++) { t += Math.floor(azar() * 400); if (Lk.pedir(t)) hechos.push(t); }
    peor = Math.max(peor, peorSegundo(hechos));
  }
  assert(peor <= 3, "en mil tandas al azar, el peor segundo tiene " + peor + " destellos");
  console.log("[1] limitador: " + pasan.length + " de 6 en la ráfaga · peor segundo al azar " + peor);
})();

/* ---------- [2] el modo MOVIMIENTO ---------- */
(function () {
  var vacio = { getItem: function () { return null; } };
  var roto = { getItem: function () { throw new Error("bloqueado"); } };
  var reduce = function (q) { return { matches: /prefers-reduced-motion: reduce/.test(q) }; };
  var noReduce = function () { return { matches: false }; };
  assert(C.leer(vacio, reduce) === "suave", "con reducir movimiento en el sistema y sin elección guardada: SUAVE");
  assert(C.leer(vacio, noReduce) === "completo", "sin pedido del sistema: COMPLETO");
  assert(C.leer({ getItem: function () { return "completo"; } }, reduce) === "completo", "lo elegido en OPCIONES manda sobre el sistema");
  assert(C.leer({ getItem: function () { return "rarísimo"; } }, reduce) === "suave", "un valor raro guardado vale como no elegido");
  assert(C.leer(roto, reduce) === "suave", "con el almacenamiento bloqueado, el del sistema");
  var st = {};
  assert(C.guardar({ setItem: function (k, v) { st[k] = v; } }, "suave") && st[C.CLAVE] === "suave", "se guarda en " + C.CLAVE);
  var INDEX = leer("phaser/index.html");
  assert(/<script src="logic\/cuidado\.js"><\/script>/.test(INDEX) && /game\.registry\.set\("movimiento", window\.PampaCuidado\.leer\(localStorage, window\.matchMedia/.test(INDEX),
    "index.html carga logic/cuidado.js y deja el modo en el registro al arrancar");
  assert(/"\.\/logic\/cuidado\.js"/.test(leer("phaser/sw.js")), "y va en el PRECACHE del service worker");
  console.log("[2] SUAVE por el sistema, OPCIONES manda, se guarda");
})();

/* ---------- [3] el guardián: nadie destella por fuera de las puertas ---------- */
(function () {
  var dir = path.join(RAIZ, "phaser/scenes"), sueltos = [];
  fs.readdirSync(dir).filter(function (f) { return f.endsWith(".js") && f !== "piel_ui.js"; }).forEach(function (f) {
    leer("phaser/scenes/" + f).split("\n").forEach(function (l, i) {
      if (/\.flash\(|\.shake\(/.test(l)) sueltos.push(f + ":" + (i + 1));
      if (/cineBlack\.setAlpha\(1\)/.test(l)) sueltos.push(f + ":" + (i + 1) + " (negro entero sin cupo)");
    });
  });
  assert(sueltos.length === 0, "SÍNTOMA: un .flash( o un .shake( o un negro de corte por fuera de piel_ui.js no cuenta en el cupo: " + sueltos.join(" | "));
  var FEEL = leer("phaser/scenes/feel_ui.js"), ONDA = leer("phaser/scenes/onda_ui.js");
  assert(/var conCuadro = !sc\.movimientoSuave\(\) && sc\.cupoDestello\(\);/.test(FEEL), "el cuadro crema del gol pide cupo (y en SUAVE no sale)");
  assert(/if \(C\.quieto \|\| !sc\.cupoDestello\(\)\) \{ o\.alTerminar\(\); return 0; \}/.test(ONDA) && /quieto: sc\.movimientoSuave\(\),/.test(ONDA),
    "el cuadro de impacto de LA ONDA pide cupo, y en SUAVE la onda queda quieta");
  var MATCH = leer("phaser/scenes/match.js");
  var toque = MATCH.slice(MATCH.indexOf('this.input.on("pointerdown", (p) => {'));
  assert(/if \(this\.estado === "ESCENA" \|\| this\.estado === "CINE"\) \{\s*if \(this\.time\.now - \(this\._ultSalteo != null \? this\._ultSalteo : -Infinity\) < this\.BAL\.cuidado\.skip_min_ms\) return;\s*this\._ultSalteo = this\.time\.now;\s*\}\s*\/\*[^*]*\*\/\s*if \(this\.estado === "ESCENA"\) \{ this\._escSkip/.test(toque),
    "el salteo con un toque tiene antirrebote ANTES de saltear la escena o el cine");
  assert(CU.skip_min_ms >= 300, "el antirrebote es de 300 ms o más (" + CU.skip_min_ms + ")");
  console.log("[3] guardián: 0 destellos por fuera · gol y onda con cupo · salteo con antirrebote");
})();

/* ---------- [4] las puertas de verdad, en una escena ---------- */
function escena(modo) {
  var ctx = { window: { PampaCuidado: C }, Phaser: {} };
  vm.createContext(ctx);
  vm.runInContext(leer("phaser/scenes/piel_ui.js"), ctx, { filename: "piel_ui.js" });
  var P = ctx.window.PampaPielUI, R = { flashes: [], shakes: [], zooms: [] };
  var s = { time: { now: 0 }, game: { registry: { get: function (k) { return k === "balance" ? BAL : k === "movimiento" ? modo : null; } } } };
  ["movimientoSuave", "cupoDestello", "destello", "sacudir", "alfaNegro", "zoomCamara"].forEach(function (k) { s[k] = P[k]; });
  s.cam = {
    flash: function () { R.flashes.push(s.time.now); }, shake: function () { R.shakes.push(s.time.now); },
    zoomTo: function (z) { R.zooms.push("tween " + z); }, setZoom: function (z) { R.zooms.push("corte " + z); }
  };
  return { s: s, R: R };
}
(function () {
  /* la megacorrida tocada a lo loco: cada viñeta que entra pide su destello
     y su negro de corte; un toque cada 50 ms saltea a la siguiente, con el
     antirrebote del partido */
  var E = escena("completo"), s = E.s, negros = [];
  var ult = null, salteos = 0;
  for (var t = 0; t <= 3000; t += 50) {
    s.time.now = t;
    if (ult == null || t - ult >= CU.skip_min_ms) {
      ult = t; salteos++;
      s.destello(s.cam, 90, 255, 255, 235);
      if (s.alfaNegro() === 1) negros.push(t);
    }
  }
  var todos = E.R.flashes.concat(negros).sort(function (a, b) { return a - b; });
  assert(peorSegundo(todos) <= 3, "60 toques en 3 s: el peor segundo tiene " + peorSegundo(todos) + " destellos contando flash y negros (" + salteos + " salteos)");
  assert(salteos <= Math.ceil(3000 / CU.skip_min_ms) + 1, "el antirrebote deja " + salteos + " salteos en 3 s");
  s.time.now = 10000; var lleno = [s.alfaNegro(), s.alfaNegro(), s.alfaNegro(), s.alfaNegro()];
  assert(lleno.join() === "1,1,1," + CU.negro_sin_cupo, "sin cupo, el negro de corte baja a " + CU.negro_sin_cupo + " (" + lleno.join() + ")");
  /* SUAVE: ni flash ni sacudón; el zoom es un corte */
  var S = escena("suave");
  S.s.destello(S.s.cam, 90, 255, 255, 255); S.s.sacudir(S.s.cam, 200, 0.01); S.s.zoomCamara(S.s.cam, 1.2, 400, "Sine.easeInOut");
  assert(S.R.flashes.length === 0 && S.R.shakes.length === 0 && S.R.zooms.join() === "corte 1.2", "en SUAVE: sin destello, sin sacudón y el zoom es un corte (" + S.R.zooms.join() + ")");
  var K = escena("completo");
  K.s.sacudir(K.s.cam, 200, 0.01); K.s.zoomCamara(K.s.cam, 1.2, 400, "Sine.easeInOut");
  assert(K.R.shakes.length === 1 && K.R.zooms.join() === "tween 1.2", "en COMPLETO, como siempre");
  console.log("[4] puertas: " + E.R.flashes.length + " flash y " + negros.length + " negros enteros en 3 s · SUAVE apaga");
})();

/* ---------- [5] SUAVE en el partido: la toma 3D, las líneas, la cámara viva ---------- */
(function () {
  var ctx = { window: { PampaPierna: {}, Phaser: { WEBGL: 2 }, PampaMatch: function () { } }, Phaser: { WEBGL: 2 } };
  vm.createContext(ctx);
  vm.runInContext(leer("phaser/scenes/toma_remate.js"), ctx, { filename: "toma_remate.js" });
  var T = ctx.window.PampaMatch.prototype;
  var esc = function (suave) {
    return { movimientoSuave: function () { return suave; }, FLAGS: {}, sys: { renderer: { type: 2 } }, add: { plane: function () { } },
      game: { registry: { get: function () { return { poses: { remate: { pierna: {} } } }; } } }, poseKey: function () { return "pose_remate"; } };
  };
  assert(T && T.puedeTomaDelRemate.call(esc(false)) === true, "control: con todo lo que pide, la toma 3D del remate se puede");
  assert(T && T.puedeTomaDelRemate.call(esc(true)) === false, "en SUAVE, puedeTomaDelRemate() da false y vuelve la viñeta (la toma gira 63°)");
  var MATCH = leer("phaser/scenes/match.js");
  assert(/g\.clear\(\);\s*if \(this\.movimientoSuave\(\)\) return;/.test(MATCH), "en SUAVE no hay líneas de velocidad");
  assert((MATCH.match(/if \(this\.movimientoSuave\(\)\) return;[^\n]*\n\s*if \(CV\.activa === false/g) || []).length === 2, "en SUAVE la cámara viva del cine no se mueve (el dolly y el golpe de zoom)");
  assert(!/\.zoomTo\(/.test(MATCH.replace(/this\.uiCam\.zoomTo\([^)]*\)/g, "")) , "los zooms de la cámara del partido pasan por zoomCamara (en SUAVE, corte)");
  assert(/empujar: function \(sc, escalon\) \{\s*if \(escalon === 1\) return;\s*if \(sc\.movimientoSuave\(\)\) return;/.test(leer("phaser/scenes/feel_ui.js")), "en SUAVE la cámara no empuja mientras decidís");
  assert(/temblor\(spr\) \{ if \(spr && !this\.movimientoSuave\(\)\)/.test(leer("phaser/scenes/intro.js")), "en SUAVE el opening no tiembla");
  console.log("[5] SUAVE: sin toma 3D, sin líneas, sin cámara viva, sin empuje, sin temblor");
})();

/* ---------- [6] OPCIONES: MOVIMIENTO, COMPLETO o SUAVE ---------- */
(function () {
  var M = require("./_escena_de_mentira.js");
  var A = M.armar({ logicaExtra: ["phaser/logic/opciones.js"], escena: "phaser/scenes/titulo.js", clase: "PampaTitulo", key: "titulo" });
  A.window.PampaSFX = { ui: function () { }, isMuted: function () { return false; }, setMuted: function () { }, setVolumenes: function () { } };
  A.registry.set("movimiento", "completo");
  var s = A.nueva();
  s.crudoDelMaster = function () { return null; };
  s.pedirMusica = function () { return true; };
  s.create();
  s.vistaOpciones();
  assert(s.textos().indexOf("MOVIMIENTO") >= 0 && s.textos().indexOf("» COMPLETO") >= 0, "OPCIONES tiene MOVIMIENTO, con COMPLETO marcado por forma (») y palabra");
  var su = s.children.list.filter(function (o) { return o.type === "Text" && o.text === "SUAVE"; })[0];
  s.tocar(su.x, su.y);
  assert(A.registry.get("movimiento") === "suave" && A.store[C.CLAVE] === "suave" && s.textos().indexOf("» SUAVE") >= 0,
    "tocar SUAVE lo elige, lo deja en el registro para el partido y lo guarda en el aparato");
  console.log("[6] OPCIONES: MOVIMIENTO se elige y se guarda");
})();

if (mal === 0) console.log("\n✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("\n✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
