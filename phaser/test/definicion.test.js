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

console.log("\n" + (fail === 0 ? "✓ TODOS OK" : "✗ HUBO FALLAS") + " — " + pass + " asserts, " + fail + " fallaron.");
process.exit(fail === 0 ? 0 : 1);
