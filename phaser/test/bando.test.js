/* ============================================================================
   PAMPA STAR · EL BANDO CON FORMA Y PALABRA, ADEMÁS DEL COLOR (ola 3, L11)

   Rodri es daltónico y es regla del proyecto: nada se distingue solo por el
   color. Las placas de las viñetas cambiaban solo el fondo (#FF8A50 contra
   #4FC3F7: luminancia 0,443 contra 0,447 en deuteranopía), el panel usaba
   ▼ para lo tuyo y ▲ para el rival mientras el mapa usa círculo y triángulo,
   el cut-in del rival no decía de quién era y el HUD decía AGUANTE siempre,
   fuera el tanque tuyo o el del rival.

   Ahora: círculo lo tuyo y triángulo el rival, dibujados (marcaDeBando: el ●
   no está en las tipografías del juego), y la palabra RIVAL (o TU EQUIPO en
   las placas, que tienen lugar; VOS ya dice de quién es).
   node phaser/test/bando.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var RAIZ = path.join(__dirname, "..", "..");
function leer(f) { return fs.readFileSync(path.join(RAIZ, f), "utf8").replace(/\r\n/g, "\n"); }
var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }
var MATCH = leer("phaser/scenes/match.js"), V9 = leer("phaser/scenes/escenas_v9.js");

/* la forma, de verdad: el cuerpo de marcaDeBando sobre una Graphics de mentira */
var cuerpo = MATCH.match(/  marcaDeBando\(g, x, y, esRival, r, color\) \{\n([\s\S]*?)\n  \}\n/);
assert(!!cuerpo, "match.js tiene marcaDeBando(g, x, y, esRival, r, color)");
var marcaDeBando = new Function("g", "x", "y", "esRival", "r", "color", cuerpo ? cuerpo[1] : "");
function graficos() {
  var g = { hechos: [] };
  ["fillStyle", "fillCircle", "fillTriangle", "clear"].forEach(function (k) { g[k] = function () { g.hechos.push(k); return g; }; });
  return g;
}

/* ---------- [1] la forma ---------- */
(function () {
  var mio = marcaDeBando(graficos(), 10, 10, false, 6, 0), suyo = marcaDeBando(graficos(), 10, 10, true, 6, 0);
  assert(mio.hechos.indexOf("fillCircle") >= 0 && mio.hechos.indexOf("fillTriangle") < 0, "lo tuyo es un círculo, como en el mapa");
  assert(suyo.hechos.indexOf("fillTriangle") >= 0 && suyo.hechos.indexOf("fillCircle") < 0, "lo del rival es un triángulo, como en el mapa");
  console.log("[1] círculo lo tuyo, triángulo el rival");
})();

/* ---------- [2] las placas de las viñetas (placaDePlano, de verdad) ---------- */
(function () {
  var ctx = { window: { PampaMatch: function () { } } };
  vm.createContext(ctx);
  vm.runInContext(leer("phaser/scenes/escenas_v9.js"), ctx, { filename: "escenas_v9.js" });
  var P = ctx.window.PampaMatch.prototype, hechos = [];
  ctx.window.PF = { display: "Press Start 2P", texto: "Pixelify Sans" };
  var escena = {
    marcaDeBando: function (g, x, y, esRival) { hechos.push({ forma: esRival ? "triángulo" : "círculo", x: x, y: y }); return g; },
    add: {
      text: function (x, y, t, st) { var o = { x: x, y: y, text: t, style: st, displayWidth: 120, setOrigin: function () { return o; } }; hechos.push(o); return o; },
      graphics: function () { return graficos(); }
    },
    cineContent: { add: function () { } }
  };
  var tuya = P.placaDePlano.call(escena, 300, 400, { nombre: "Mateo" }, false);
  var rival = P.placaDePlano.call(escena, 600, 400, { nombre: "Valen" }, true);
  var vos = P.placaDePlano.call(escena, 300, 400, { esVos: true }, false);
  assert(tuya.text === "TU EQUIPO · MATEO" && rival.text === "RIVAL · VALEN" && vos.text === "VOS",
    "la placa dice de quién es antes del nombre, en un renglón (" + [tuya.text, rival.text, vos.text].join(" | ") + ")");
  var formas = hechos.filter(function (h) { return h.forma; }).map(function (h) { return h.forma; });
  assert(formas.join() === "círculo,triángulo,círculo", "y lleva la forma del bando (" + formas.join() + ")");
  assert(tuya.style.padding.left >= 30, "la forma va adentro de la placa, en su margen izquierdo");
  /* la del partido (placa, en escenaCine) arma lo mismo */
  assert(/const t = this\.add\.text\(x, H \* 0\.84, \(j\.esVos \? "VOS" : \(esRival \? "RIVAL · " : "TU EQUIPO · "\) \+ \(j\.nombre \|\| ""\)\.toUpperCase\(\)\.slice\(0, 12\)\),[\s\S]{0,400}?this\.marcaDeBando\(this\.add\.graphics\(\), t\.x - t\.displayWidth \/ 2 \+ 16, t\.y, esRival, 7, 0x0a1f13\)/.test(MATCH),
    "la placa de la escena del partido también: nombre, TU EQUIPO o RIVAL, y la forma");
  console.log("[2] placas: nombre + palabra + forma");
})();

/* ---------- [3] el panel, el cut-in y el aguante del HUD ---------- */
(function () {
  assert(!/\? "▲ " : "▼ "/.test(MATCH), "el panel ya no usa ▼ para lo tuyo (el mapa usa círculo)");
  assert(/const nom = \(p\.esRival \? "RIVAL · " : ""\) \+ \(j\.numero/.test(MATCH) && /this\.marcaDeBando\(this\.panelMarca\.clear\(\), 42, this\.panelNombre\.y, p\.esRival, 6, 0xf6efdc\);/.test(MATCH),
    "el panel: el rival dice RIVAL y cada uno lleva su forma al lado del nombre");
  var m = MATCH.match(/this\.panelNombre = this\.add\.text\((\d+),/);
  assert(m && +m[1] - 42 >= 12, "el nombre arranca después de la forma (x=" + (m && m[1]) + ")");
  assert(/\(esRivalRet \? "RIVAL · " : ""\) \+ \(sub \|\|/.test(MATCH) && /this\.marcaDeBando\(this\.add\.graphics\(\), 0, 0, esRivalRet, 7, 0xf6efdc\)/.test(MATCH),
    "el cut-in del rival dice RIVAL y lleva el triángulo, que viaja con el texto");
  assert(/this\.marcaDeBando\(g, MD\.xEtq - 10, MD\.yGuts, p\.esRival, 6, 0xf6efdc\);\s*const lblGuts = p\.esRival \? "AGUANTE RIVAL" : "AGUANTE";/.test(MATCH),
    "el HUD: con la pelota del rival dice AGUANTE RIVAL, con el triángulo");
  var md = MATCH.match(/this\.MEDIDORES = \{ xEtq: (\d+), xBarra: (\d+), xNum: (\d+), yEnvion: \d+, yGuts: \d+, wBarra: (\d+) \}/);
  var finEtq = md ? +md[1] + "AGUANTE RIVAL".length * 6.6 : 0;
  assert(md && finEtq < +md[2] && +md[2] + +md[4] < +md[3] - 4 * 10, "AGUANTE RIVAL (hasta x≈" + Math.round(finEtq) + ") entra antes de la barra, y la barra antes del número");
  console.log("[3] panel, cut-in y HUD");
})();

if (mal === 0) console.log("\n✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("\n✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
