/* ============================================================================
   PAMPA STAR · LA ONDA DE LAS JUGADAS (scenes/onda_ui.js)

   Pedido de Rodri del 20/oct: la gambeta (y otras) floja; que se sienta como
   un anime de fútbol de los 80, sin animar las ilustraciones. Lo que fija:
     [1] la perilla existe y el cuadro de impacto, que es lo único que alarga
         la jugada, no pasa de 300 ms;
     [2] las seis jugadas (gambeta, pared, pase, quite, corte, bloqueo) llegan
         a la onda, ganadas y perdidas, y con la perilla en 0 la viñeta vuelve
         a las líneas radiales de antes;
     [3] corriendo el módulo con una escena de mentira: el sacudón solo en los
         choques, el impacto dura lo que dice balance, la hinchada grabada
         según quién ganó, y con "reducir movimiento" no hay sacudón, ni
         impacto, ni nada que se mueva;
     [4] index.html lo carga y el service worker lo guarda.

   Corré:  node phaser/test/onda.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
function leer(f) { return fs.readFileSync(path.join(RAIZ, f), "utf8"); }
var BAL = JSON.parse(leer("phaser/data/balance.json"));
var ONDA = leer("phaser/scenes/onda_ui.js");
var MATCH = leer("phaser/scenes/match.js");
var V9 = leer("phaser/scenes/escenas_v9.js");

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* ---------- [1] LA PERILLA ---------- */
(function () {
  var o = BAL.onda;
  assert(o && typeof o.intensidad === "number" && o.intensidad > 0, "balance.onda.intensidad existe y está prendida");
  assert(typeof o.impacto_ms === "number" && o.impacto_ms > 0 && o.impacto_ms <= 300,
    "el cuadro de impacto alarga la jugada y no puede pasar de 300 ms (dio " + o.impacto_ms + ")");
  ["corte_cerca", "corte_revela", "sacudon_ms", "sacudon", "lineas"].forEach(function (k) {
    assert(typeof o[k] === "number" && o[k] > 0, "balance.onda." + k + " es un número");
  });
  console.log("[1] perilla balance.onda, impacto de " + o.impacto_ms + " ms");
})();

/* ---------- [2] LAS SEIS JUGADAS LLEGAN ---------- */
(function () {
  function cuenta(src, re) { return (src.match(re) || []).length; }
  assert(cuenta(MATCH, /jugada: esPared \? "pared" : "gambeta", aFavor: true/g) === 1, "la gambeta y la pared ganadas");
  assert(cuenta(MATCH, /jugada: "gambeta", aFavor: false/g) === 2, "la gambeta perdida y la que te sacan con megacosa");
  assert(cuenta(MATCH, /jugada: "pared", aFavor: false/g) === 1, "la pared cortada");
  assert(cuenta(MATCH, /jugada: "quite", aFavor: true/g) === 1, "el quite ganado");
  assert(cuenta(MATCH, /jugada: "corte", aFavor: true/g) === 1, "el corte ganado");
  assert(cuenta(MATCH, /jugada: "bloqueo", aFavor: true/g) === 1, "el bloqueo ganado");
  assert(cuenta(MATCH, /jugada: "bloqueo", aFavor: false/g) === 1, "el remate tuyo que te bloquean");
  assert(cuenta(MATCH, /jugada: a\.id, aFavor: false/g) === 1, "la defensa fallada (quite, corte o bloqueo)");
  assert(/jugada: cfg\.alVacio \? "vacio" : "pase"/.test(V9), "el pase y el pase al vacío");
  assert(/if \(!onda\) this\.lineasVelocidad\(W \/ 2, H \* 0\.45/.test(MATCH),
    "con la perilla en 0 (o sin jugada) la viñeta vuelve a sus líneas radiales");
  assert(/if \(!onda\) self\.lineasVelocidad\(258/.test(V9), "y el pase también");
  console.log("[2] gambeta, pared, pase, quite, corte y bloqueo, ganados y perdidos");
})();

/* ---------- [3] EL MÓDULO CORRIENDO ---------- */
function armar(onda, reducir) {
  var reg = { shakes: [], sfx: [], timers: [], tweens: [], eventos: [] };
  function obj(tipo) {
    var o = {
      type: tipo, x: 0, y: 0, scaleX: 1, scaleY: 1, angle: 0, alpha: 1, active: true, visible: true,
      originX: 0.5, originY: 0.5, flipX: false, width: 100, height: 100, displayWidth: 100, displayHeight: 100,
      texture: { key: "t" }, frame: { name: "f" }, parentContainer: null, _oye: {},
      destroy: function () { this.active = false; (this._oye.destroy || []).forEach(function (l) { l.fn.call(l.ctx); }); },
      once: function (n, fn, ctx) { (this._oye[n] = this._oye[n] || []).push({ fn: fn, ctx: ctx }); return this; },
      setPosition: function (x, y) { this.x = x; this.y = y; return this; },
      setScale: function (a, b) { this.scaleX = a; this.scaleY = b == null ? a : b; return this; }
    };
    /* lo que no se imita (setAngle, fillTriangle, lineBetween…) devuelve el
       objeto, para que se pueda encadenar como en Phaser */
    var p = new Proxy(o, {
      get: function (t, k) {
        if (k in t) return t[k];
        if (typeof k === "string" && /^(set|fill|line|stroke|clear)/.test(k)) return function () { return p; };
        return undefined;
      }
    });
    return p;
  }
  function contenedor() {
    var c = obj("Container");
    c.list = [];
    c.add = function (x) { c.list.push(x); x.parentContainer = c; return c; };
    c.addAt = function (x, i) { c.list.splice(i, 0, x); x.parentContainer = c; return c; };
    c.getIndex = function (x) { return c.list.indexOf(x); };
    return c;
  }
  var mk = function (tipo) { return function () { var o = obj(tipo); if (typeof arguments[0] === "number") { o.x = arguments[0]; o.y = arguments[1]; } return o; }; };
  var sc = {
    BAL: { onda: onda },
    msV: function (x) { return x; },
    add: { graphics: mk("Graphics"), text: mk("Text"), image: mk("Image"), sprite: mk("Sprite"), rectangle: mk("Rectangle") },
    cineContent: contenedor(), cineInfo: contenedor(), cineBG: obj("Graphics"), cineFondo: obj("Image"),
    tweens: {
      add: function (c) { reg.tweens.push(c); c.stop = function () {}; return c; },
      addCounter: function (c) { reg.tweens.push(c); c.stop = function () {}; return c; },
      killTweensOf: function () {}
    },
    time: {
      delayedCall: function (ms, fn) { var t = { ms: ms, fn: fn, remove: function () { t.fuera = true; } }; reg.timers.push(t); return t; },
      addEvent: function (c) { reg.eventos.push(c); c.remove = function () {}; return c; }
    },
    uiCam: { shake: function (d, i, f) { reg.shakes.push([d, i, f]); } },
    SFX: {
      crowd: function (a, b) { reg.sfx.push("crowd"); }, festejo: function () { reg.sfx.push("festejo"); },
      afuera: function () { reg.sfx.push("afuera"); }
    },
    texPelota: function () { return { key: "ball", esc: 1 }; }
  };
  var win = {
    PF: { display: "x" },
    matchMedia: function (q) { return { matches: !!reducir && /prefers-reduced-motion: reduce/.test(q) }; }
  };
  new Function("window", ONDA)(win);
  return { O: win.PampaOnda, sc: sc, reg: reg };
}
function figura(sc, x) { var f = sc.add.image(x, 280); sc.cineContent.add(f); return f; }

(function () {
  var o = BAL.onda;
  /* la perilla en 0 apaga todo */
  var A0 = armar(Object.assign({}, o, { intensidad: 0 }));
  assert(A0.O.entrada(A0.sc, { jugada: "gambeta", flujo: -1, tNombre: 100, aFavor: true }) === null,
    "con intensidad 0 no hay onda");

  ["gambeta", "pared", "pase", "vacio", "quite", "corte", "bloqueo"].forEach(function (k) {
    assert(typeof armar(o).O.NOMBRES[k] === "string", "la jugada " + k + " tiene su nombre grande");
  });

  /* un choque ganado (el quite): sacudón, impacto de impacto_ms, rumor de la hinchada */
  var A = armar(o), sc = A.sc, reg = A.reg;
  var sp = figura(sc, 288), sr = figura(sc, 691);
  var h = A.O.entrada(sc, { jugada: "quite", flujo: 1, tNombre: 120, aFavor: true });
  assert(h && reg.tweens.some(function (t) { return t.repeat === -1 && t.onUpdate; }), "las líneas corren mientras se sostiene la pose");
  A.O.clavar(sc, h, sp, sr, null);
  assert(sc.cineContent.scaleX > 1, "en el silencio hay un corte seco más cerca (escala " + sc.cineContent.scaleX + ")");
  var terminado = 0;
  var dura = A.O.impacto(sc, h, { sp: sp, sr: sr, choque: true, alTerminar: function () { terminado++; } });
  assert(dura === o.impacto_ms, "el impacto dura balance.onda.impacto_ms (dio " + dura + ")");
  assert(reg.shakes.length === 1 && reg.shakes[0][0] === o.sacudon_ms && Math.abs(reg.shakes[0][1] - o.sacudon * o.intensidad) < 1e-9 && reg.shakes[0][2] === true,
    "en un choque, un sacudón de sacudon_ms con fuerza sacudon (dio " + JSON.stringify(reg.shakes) + ")");
  var tImp = reg.timers.filter(function (t) { return t.ms === o.impacto_ms; });
  assert(tImp.length === 1, "el final del impacto se agenda a los impacto_ms");
  tImp[0].fn();
  assert(terminado === 1, "y al terminar sigue la revelación");
  A.O.revelar(sc, h, { sp: sp, sr: sr, bola: null, soltar: true, protaEsVos: false, dir: -1, foco: sr });
  assert(reg.sfx.join(",") === "crowd", "el quite ganado suena con el rumor de la hinchada (dio " + reg.sfx.join(",") + ")");
  assert(sc.cineInfo.list.length >= 10, "la tribuna en primer plano aparece en la revelación");

  /* sin choque (la gambeta ganada): no hay sacudón de la onda */
  var B = armar(o), spB = figura(B.sc, 288), srB = figura(B.sc, 691);
  var hB = B.O.entrada(B.sc, { jugada: "gambeta", flujo: -1, tNombre: 120, aFavor: true });
  B.O.impacto(B.sc, hB, { sp: spB, sr: srB, choque: false, alTerminar: function () {} });
  assert(B.reg.shakes.length === 0, "la gambeta ganada no es un choque: sin sacudón de la onda");

  /* el bloqueo ganado festeja; lo que sale contra vos, el "uhhh" */
  var C = armar(o), spC = figura(C.sc, 288), srC = figura(C.sc, 691);
  var hC = C.O.entrada(C.sc, { jugada: "bloqueo", flujo: -1, tNombre: 120, aFavor: true });
  C.O.revelar(C.sc, hC, { sp: spC, sr: srC, soltar: false });
  var D = armar(o), spD = figura(D.sc, 288), srD = figura(D.sc, 691);
  var hD = D.O.entrada(D.sc, { jugada: "gambeta", flujo: -1, tNombre: 120, aFavor: false });
  D.O.revelar(D.sc, hD, { sp: spD, sr: srD, soltar: false });
  assert(C.reg.sfx.join(",") === "festejo" && D.reg.sfx.join(",") === "afuera",
    "bloqueo ganado: festejo; jugada en contra: el uhhh (dio " + C.reg.sfx.join(",") + " / " + D.reg.sfx.join(",") + ")");

  /* reducir movimiento: sin sacudón, sin impacto, sin nada que corra */
  var R = armar(o, true), spR = figura(R.sc, 288), srR = figura(R.sc, 691);
  var hR = R.O.entrada(R.sc, { jugada: "corte", flujo: -1, tNombre: 120, aFavor: true });
  var listo = 0;
  var durR = R.O.impacto(R.sc, hR, { sp: spR, sr: srR, choque: true, alTerminar: function () { listo++; } });
  R.O.revelar(R.sc, hR, { sp: spR, sr: srR, soltar: false });
  assert(durR === 0 && listo === 1, "con reducir movimiento no hay cuadro de impacto: la revelación sigue en el acto");
  assert(R.reg.shakes.length === 0, "con reducir movimiento no hay sacudón");
  assert(!R.reg.tweens.some(function (t) { return t.repeat === -1; }), "con reducir movimiento ni las líneas ni la tribuna se mueven");
  console.log("[3] sacudón solo en choques, impacto de " + o.impacto_ms + " ms, hinchada según quién ganó, reducir movimiento respetado");
})();

/* ---------- [4] SE CARGA ---------- */
(function () {
  assert(/<script src="scenes\/onda_ui\.js"><\/script>/.test(leer("phaser/index.html")), "index.html carga scenes/onda_ui.js");
  assert(/"\.\/scenes\/onda_ui\.js"/.test(leer("phaser/sw.js")), "el service worker lo guarda para jugar sin red");
  console.log("[4] index.html y sw.js");
})();

if (mal === 0) console.log("\n✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("\n✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
