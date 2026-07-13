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

console.log("\n" + (fail === 0 ? "✓ TODOS OK" : "✗ HUBO FALLAS") + " — " + pass + " asserts, " + fail + " fallaron.");
process.exit(fail === 0 ? 0 : 1);
