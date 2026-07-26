/* ============================================================================
   PAMPA STAR · test del RELATOR (Anime v4 Bloque E) — node, sin dependencias
   Corré:  node phaser/test/relator.test.js
   ========================================================================== */
"use strict";
var R = require("../logic/relator.js");
var fs = require("fs"), path = require("path");
var data = JSON.parse(fs.readFileSync(path.join(__dirname, "../../data/relatos.json"), "utf8"));

var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.error("  ✗ " + m); } }
function seq(vals) { var i = 0; return function () { return vals[i++ % vals.length]; }; }

/* ---- 1) la data trae el bloque relator con las situaciones del partido ---- */
(function () {
  ok(data.relator && typeof data.relator === "object", "relatos.json tiene bloque relator");
  ["saque", "peligro", "gambeta_win", "gambeta_lose", "corte", "gol", "gol_rival", "atajada", "afuera", "arquero_mio", "urgente", "entretiempo", "final"].forEach(function (s) {
    ok(Array.isArray(data.relator[s]) && data.relator[s].length >= 2, "situación '" + s + "' con 2+ variantes");
  });
  console.log("[1] data del relator: ok");
})();

/* ---- 2) sirve frases, reemplaza los huecos y no conoce situaciones inventadas ---- */
(function () {
  var rel = R.crear(data, { rng: seq([0.0]) });
  var f = rel.frase("gol", { jugador: "Cami", rival: "TOAY", pueblo: "WINIFREDA" });
  ok(typeof f === "string" && f.length > 4, "sirve una frase de gol");
  ok(f.indexOf("{") < 0, "sin huecos sin reemplazar (" + f + ")");
  var g = rel.frase("gol", {});
  ok(g.indexOf("{") < 0, "los huecos caen a valores por defecto");
  ok(rel.frase("no_existe") === null, "situación desconocida → null (no explota)");
  ok(R.crear({}, {}).frase("gol") === null, "sin data → null (tolerante)");
  console.log("[2] frases + huecos: ok");
})();

/* ---- 3) NO repite la misma frase dos veces seguidas por situación ---- */
(function () {
  var rel = R.crear(data, { rng: seq([0.1, 0.1, 0.1, 0.1, 0.1, 0.1]) });   // rng clavado en la misma
  var a = rel.frase("peligro"), b = rel.frase("peligro"), c = rel.frase("peligro");
  ok(a !== b && b !== c, "rng repetido no repite la frase (" + a + " / " + b + ")");
  /* situaciones distintas llevan memoria separada */
  var rel2 = R.crear(data, { rng: seq([0.0]) });
  var p = rel2.frase("saque"), q = rel2.frase("final");
  ok(p !== null && q !== null && p !== q, "memoria por situación, no global");
  console.log("[3] sin repetir: ok");
})();

/* ---- 4) hook del futuro modo streamer: escuchar recibe cada frase ---- */
(function () {
  var rel = R.crear(data, { rng: seq([0.5]) });
  var got = [];
  rel.escuchar(function (ev) { got.push(ev); });
  rel.frase("urgente");
  ok(got.length === 1 && got[0].situacion === "urgente" && typeof got[0].frase === "string", "el oyente recibió {situacion, frase}");
  rel.escuchar("no soy función");   // no explota
  rel.frase("final");
  ok(got.length === 2, "sigue emitiendo con oyentes inválidos ignorados");
  console.log("[4] hook streamer: ok");
})();

/* ---- 5) V9 §8 · TODA clave que el código pide TIENE que existir en el JSON ----
   "quite_win" se llamaba desde el jugadón y no estaba en relatos.json: ganar la
   pelota era el único desenlace mudo del juego, y nada lo cazaba. Ahora sí. */
(function () {
  var fs = require("fs"), path = require("path");
  var dir = path.join(__dirname, "..", "scenes");
  var claves = {};
  fs.readdirSync(dir).filter(function (f) { return f.endsWith(".js"); }).forEach(function (f) {
    var s = fs.readFileSync(path.join(dir, f), "utf8");
    var re = /relatar\(\s*["'`]([a-z0-9_]+)["'`]/gi, m;
    while ((m = re.exec(s))) claves[m[1]] = (claves[m[1]] || []).concat(f);
  });
  var pedidas = Object.keys(claves);
  ok(pedidas.length >= 10, "el barrido encuentra las claves que pide el código (" + pedidas.length + ")");
  pedidas.forEach(function (k) {
    var lista = data.relator[k];
    ok(Array.isArray(lista) && lista.length >= 2,
      "§8 la clave '" + k + "' (la pide " + claves[k][0] + ") existe en relatos.json con 2+ variantes");
  });
  console.log("[5] claves del código ⊂ relatos.json: ok (" + pedidas.length + " claves)");
})();

/* ---- 6) V9 §8 · LA BOLSA: recorre todas antes de repetir ninguna ---- */
(function () {
  var i = 0;
  var rng = function () { i++; return ((i * 37) % 100) / 100; };
  var rel = R.crear(data, { rng: rng });
  var n = data.relator.gambeta_win.length;
  var vistas = {}, seguidas = [];
  for (var k = 0; k < n; k++) { var f = rel.frase("gambeta_win"); vistas[f] = 1; seguidas.push(f); }
  ok(Object.keys(vistas).length === n, "en " + n + " tiradas salieron las " + n + " variantes, sin repetir (" + Object.keys(vistas).length + ")");
  var siguiente = rel.frase("gambeta_win");
  ok(siguiente !== seguidas[seguidas.length - 1], "al rebarajar, la primera no es la última que sonó");
  console.log("[6] bolsa barajada: ok");
})();

console.log("\n" + (fail === 0 ? "✓ TODOS OK" : "✗ HUBO FALLAS") + " — " + pass + " asserts, " + fail + " fallaron.");
process.exit(fail === 0 ? 0 : 1);
