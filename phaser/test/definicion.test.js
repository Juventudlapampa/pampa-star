/* ============================================================================
   PAMPA STAR · test de LA DEFINICIÓN v2 (V6 §4) — node, sin dependencias
   Corré:  node phaser/test/definicion.test.js
   ========================================================================== */
"use strict";
var D = require("../logic/definicion.js");

var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.error("  ✗ " + m); } }
function seq(vals) { var i = 0; return function () { return vals[i++ % vals.length]; }; }

/* ---- 1) las 6 zonas: etiqueta + grilla propias (nunca solo color) ---- */
(function () {
  ok(D.ZONAS.length === 6, "6 zonas");
  ok(D.ZONAS.every(function (z) { return z.n && z.n.length >= 2; }), "todas con ETIQUETA");
  var claves = {};
  D.ZONAS.forEach(function (z) { claves[z.col + "," + z.fila] = true; });
  ok(Object.keys(claves).length === 6, "posiciones de grilla únicas (forma, no color)");
  console.log("[1] zonas: ok");
})();

/* ---- 2) la adivinanza: coincidir ataja, errar por dos deja al arquero pagando ---- */
(function () {
  ok(D.distZonas("alto_izq", "alto_izq") === 0, "misma zona → 0");
  ok(D.distZonas("alto_izq", "alto_centro") === 1, "al lado → 1");
  ok(D.distZonas("alto_izq", "bajo_der") === 2, "cruzado → 2");
  ok(D.distZonas("bajo_centro", "alto_centro") === 1, "misma columna, otra fila → 1");
  var cfg = {};
  ok(D.bonusArqueroPorZona(0, cfg) > D.bonusArqueroPorZona(1, cfg), "coincidir > a una");
  ok(D.bonusArqueroPorZona(1, cfg) > D.bonusArqueroPorZona(2, cfg), "a una > a dos");
  ok(D.bonusArqueroPorZona(2, cfg) < 0, "a dos o más: el arquero llega MAL");
  console.log("[2] adivinanza de zonas: ok");
})();

/* ---- 3) el timing: dulce suma, flojo la sirve, pasado la manda afuera ---- */
(function () {
  var dulce = D.efectoTiming(0, 0.2, {});
  ok(dulce.enZona && dulce.dPoder > 0 && dulce.fueraProb === 0, "en el punto dulce: más poder");
  var floja = D.efectoTiming(-0.3, 0.2, {});
  ok(!floja.enZona && floja.dPoder < 0 && floja.fueraProb === 0, "floja: menos poder (atajable)");
  var pasada = D.efectoTiming(0.4, 0.2, {});
  ok(!pasada.enZona && pasada.fueraProb > 0, "pasada: riesgo de irse AFUERA");
  ok(D.efectoTiming(0.9, 0.2, {}).fueraProb <= 0.55, "el riesgo de afuera está acotado");
  console.log("[3] timing: ok");
})();

/* ---- 4) el bloqueo del defensor en la línea ---- */
(function () {
  ok(D.chanceBloqueo(0, 50, {}) === 0, "sin defensores en línea no hay bloqueo");
  var lejos = D.chanceBloqueo(1, 110, {});
  var cerca = D.chanceBloqueo(1, 20, {});
  ok(cerca > lejos && lejos > 0, "más cerca = más bloqueo (" + cerca.toFixed(2) + " > " + lejos.toFixed(2) + ")");
  ok(D.chanceBloqueo(3, 0, {}) <= 0.6, "el bloqueo está acotado (nunca es seguro)");
  console.log("[4] bloqueo: ok");
})();

/* ---- 5) achicar: gana abajo, vendido arriba a los ángulos ---- */
(function () {
  var abajo = D.efectoAchicar("bajo_centro", {});
  ok(abajo.dArquero > 0 && !abajo.vendido, "achicar contra tiro bajo: el arquero gana");
  var angulo = D.efectoAchicar("alto_izq", {});
  ok(angulo.dArquero < 0 && angulo.vendido, "achicar y te la tiran al ángulo alto: vendido");
  console.log("[5] achicar: ok");
})();

/* ---- 6) la elección del CPU es válida y varía ---- */
(function () {
  var ids = D.ZONAS.map(function (z) { return z.id; });
  var vistos = {};
  for (var i = 0; i < 60; i++) vistos[D.eleccionCPU(seq([i / 60]))] = true;
  ok(Object.keys(vistos).every(function (k) { return ids.indexOf(k) >= 0; }), "siempre elige una zona real");
  ok(Object.keys(vistos).length >= 5, "elige variado (" + Object.keys(vistos).length + "/6)");
  console.log("[6] elección CPU: ok");
})();

/* ---- 7) V9 C1 · TE REMATAN: se resuelve por posición, cansancio y nivel ---- */
(function () {
  var cfg = { bloqueo_radio: 120, bloqueo_base: 0.18, bloqueo_cercania: 0.25, bloqueo_max: 0.6 };
  var arco = { x: 0, y: 340 };
  var base = { tirador: { x: 300, y: 340 }, arco: arco, arquero: { nivel: 55, aguante: 1000 }, aguanteMax: 1000, cfg: cfg };
  function con(defs, extra) {
    var p = Object.assign({}, base, extra || {});
    p.defensores = defs;
    p.rng = p.rng || function () { return 0.99; };   // por defecto: NO bloquea
    return D.remateRivalAuto(p);
  }
  /* nadie en el camino */
  var solo = con([{ x: 800, y: 100, nombre: "lejos" }]);
  ok(solo.defensoresEnLinea === 0, "un defensor lejísimos no cuenta como en la línea");
  ok(solo.pBloqueo === 0, "sin nadie en la línea la chance de bloqueo es 0");
  ok(solo.motivo === "solo_ante_el_arquero", "y el motivo lo dice (fue: " + solo.motivo + ")");
  /* tres cruzados y pegados a la línea */
  var muchos = con([{ x: 250, y: 340, nombre: "a" }, { x: 200, y: 345, nombre: "b" }, { x: 150, y: 335, nombre: "c" }]);
  ok(muchos.defensoresEnLinea === 3, "tres en el corredor se cuentan (fueron " + muchos.defensoresEnLinea + ")");
  ok(muchos.pBloqueo > solo.pBloqueo, "más gente en el camino = más chance de bloqueo");
  ok(muchos.defensorMasCerca && muchos.defensorMasCerca.nombre, "informa QUIÉN es el que está más cerca (para el cartel)");
  /* uno detrás del tirador no bloquea nada */
  var atras = con([{ x: 400, y: 340, nombre: "quedó atrás" }]);
  ok(atras.defensoresEnLinea === 0, "el que quedó detrás del tirador no está en el camino");
  /* el ARQUERO: nivel y tanque mueven el bonus, y de lejos llega mejor */
  var flojo = con([], { arquero: { nivel: 30, aguante: 1000 } });
  var crack = con([], { arquero: { nivel: 90, aguante: 1000 } });
  ok(crack.bonusArquero > flojo.bonusArquero, "mejor arquero, más bonus (" + flojo.bonusArquero + " vs " + crack.bonusArquero + ")");
  var fundido = con([], { arquero: { nivel: 55, aguante: 50 } });
  var entero = con([], { arquero: { nivel: 55, aguante: 1000 } });
  ok(fundido.bonusArquero < entero.bonusArquero, "arquero fundido ataja menos (" + fundido.bonusArquero + " vs " + entero.bonusArquero + ")");
  ok(fundido.motivo === "arquero_fundido" || fundido.motivo === "de_lejos", "el motivo nombra al arquero fundido (fue: " + fundido.motivo + ")");
  var cerca = con([], { tirador: { x: 80, y: 340 } });
  var lejos = con([], { tirador: { x: 900, y: 340 } });
  ok(lejos.bonusArquero > cerca.bonusArquero, "de lejos el arquero llega mejor que en el mano a mano");
  /* el bloqueo SÍ sale cuando la tirada acompaña */
  var bloquea = con([{ x: 250, y: 340, nombre: "a" }, { x: 220, y: 342, nombre: "b" }], { rng: function () { return 0.01; } });
  ok(bloquea.bloqueado === true && bloquea.motivo === "bloqueo", "con la tirada a favor, bloquean y el motivo es 'bloqueo'");
  /* determinismo: mismos datos y mismo rng, mismo resultado */
  var a1 = con([{ x: 250, y: 340, nombre: "a" }], { rng: function () { return 0.3; } });
  var a2 = con([{ x: 250, y: 340, nombre: "a" }], { rng: function () { return 0.3; } });
  ok(a1.bloqueado === a2.bloqueado && a1.bonusArquero === a2.bonusArquero, "determinista con el mismo rng");
  console.log("[7] te rematan sin pantalla de gestión: ok");
})();

/* ---- 8) TANDA 1.0 · los botones EXTRA de la defensa tienen texto y responden ----
   defBoton recibe (x, texto, sub, color, cb, ancho), con la y clavada en la
   fila de abajo. SÚPER DEFENSA y la megadefensa lo llamaban como si recibiera
   la y: defBoton(W/2, H-108, 300, "🌟 SÚPER DEFENSA · ENVIÓN lleno", color, fn, 300).
   Medido con estos mismos stubs antes del arreglo: los textos eran los
   NÚMEROS 432 y 300, el rect recibía una función como ancho y un string como
   color, caía en y=506 encima de los tres botones de la decisión, y al
   tocarlo saltaba "TypeError: cb is not a function".
   Se carga el mixin de verdad (scenes/definicion_ui.js) sobre una escena de
   mentira: lo que se mide es el código que corre en el juego. */
(function () {
  var vm = require("vm"), fs = require("fs"), path = require("path");
  var src = fs.readFileSync(path.join(__dirname, "../scenes/definicion_ui.js"), "utf8");
  function Escena() {}
  var win = {
    PampaMatch: Escena, PF: { display: "display", texto: "texto" },
    PampaPartido: { envionLleno: function (st) { return st.envion >= 100; } }
  };
  vm.runInNewContext(src, { window: win, Math: Math, console: console });
  ok(typeof Escena.prototype.defBotonEn === "function", "tiene que existir defBotonEn(x, y, texto, sub, color, cb, ancho)");

  function armar(envion, mega) {
    var e = new Escena(), rects = [], textos = [], avisos = [];
    function objeto(o) {
      o.handlers = {}; o.active = true;
      o.setOrigin = o.setStrokeStyle = o.setInteractive = function () { return o; };
      o.on = function (ev, fn) { o.handlers[ev] = fn; return o; };
      o.destroy = function () { o.active = false; };
      return o;
    }
    e.add = {
      rectangle: function (x, y, w, h, color) { var r = objeto({ x: x, y: y, w: w, h: h, color: color }); rects.push(r); return r; },
      text: function (x, y, txt, style) { var t = objeto({ x: x, y: y, text: txt, style: style }); textos.push(t); return t; }
    };
    e.cineContent = { add: function () {} };
    e.time = { now: 1000, delayedCall: function () {} };
    e.msV = function (x) { return x; };
    e.BAL = { aguante: { costo_quite: 120, max: 1000, recupera_no_moverse: 30 } };
    e.st = { envion: envion, ctrl: 1, mios: [{ pos: "ARQ", aguante: 900 }, { pos: "ATA", aguante: 800 }] };
    e._def = { botones: [] };
    e.megaDefensaDisponible = function () { return mega; };
    e.avisarDef = function (t) { avisos.push(t); };
    e.defBotonesDef();
    return { e: e, rects: rects, textos: textos, avisos: avisos };
  }
  function tocar(r) {
    var ev = { stopPropagation: function () {} };
    try { r.handlers.pointerdown({}, 0, 0, ev); return null; } catch (err) { return err; }
  }

  /* con el ENVIÓN lleno: SÚPER DEFENSA */
  var a = armar(100, null);
  ok(a.textos.every(function (t) { return typeof t.text === "string"; }),
    "todos los textos de los botones tienen que ser string (salían los números 432 y 300): " +
    a.textos.map(function (t) { return JSON.stringify(t.text); }).join(", "));
  var sd = a.rects.filter(function (r) { return r.y === 432; });
  ok(sd.length === 1, "el botón extra va en y=432 (H-108), arriba de la fila de la decisión (había " + sd.length + ")");
  ok(sd[0] && sd[0].w === 300, "y mide 300 de ancho, un número (recibía " + (sd[0] && typeof sd[0].w) + ")");
  ok(sd[0] && typeof sd[0].color === "number", "y el color es un número (recibía el texto del botón)");
  var tSD = a.textos.filter(function (t) { return t.y < 432 && t.y > 400; }).map(function (t) { return t.text; });
  ok(tSD.indexOf("🌟 SÚPER DEFENSA") >= 0, "el título del botón es '🌟 SÚPER DEFENSA' (salió " + JSON.stringify(tSD) + ")");
  ok(a.textos.some(function (t) { return t.text === "ENVIÓN lleno" && t.y > 432; }), "y abajo, chico, 'ENVIÓN lleno'");
  var fila = a.rects.filter(function (r) { return r.y === 506; });
  ok(fila.length === 3, "la fila de la decisión sigue siendo de tres en y=506 (hay " + fila.length + ")");
  var err = sd[0] ? tocar(sd[0]) : new Error("no hay botón");
  ok(!err, "tocarlo no puede tirar excepción (tiraba 'cb is not a function'): " + (err && err.message));
  ok(a.e._def.superDef === true, "y prende la SÚPER DEFENSA de este remate");
  ok(a.avisos.some(function (t) { return t.indexOf("¡SÚPER DEFENSA lista!") >= 0; }), "y lo avisa: '🌟 ¡SÚPER DEFENSA lista!'");
  ok(a.e._def.decidido !== true, "y NO consume la decisión: los tres de abajo siguen disponibles");

  /* sin envión pero con megadefensa del arquero */
  var b = armar(10, { n: "Tranquera", aguante: 250 });
  var mg = b.rects.filter(function (r) { return r.y === 432; });
  ok(mg.length === 1 && mg[0].w === 300, "la megadefensa usa el mismo lugar: y=432, 300 de ancho");
  ok(b.textos.some(function (t) { return t.text === "🔥 TRANQUERA"; }), "con su nombre arriba ('🔥 TRANQUERA')");
  ok(b.textos.some(function (t) { return t.text === "250 aguante"; }), "y el costo en número abajo ('250 aguante')");
  var err2 = mg[0] ? tocar(mg[0]) : new Error("no hay botón");
  ok(!err2, "tocarla no puede tirar excepción: " + (err2 && err2.message));
  ok(b.e._def.mega && b.e._def.mega.n === "Tranquera", "y deja la megadefensa elegida");

  /* sin envión ni megadefensa: no hay botón extra */
  var c = armar(10, null);
  ok(c.rects.filter(function (r) { return r.y === 432; }).length === 0, "sin envión ni megadefensa no aparece ningún botón extra");
  console.log("[8] botones extra de la defensa: texto string, y=432, ancho 300, el toque responde");
})();

console.log("\n" + (fail === 0 ? "✓ TODOS OK" : "✗ HUBO FALLAS") + " — " + pass + " asserts, " + fail + " fallaron.");
process.exit(fail === 0 ? 0 : 1);
