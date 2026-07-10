/* ============================================================================
   PAMPA STAR · test de la perspectiva del modo cine (node, sin dependencias)
   Corré:  node phaser/test/perspectiva.test.js
   ========================================================================== */
"use strict";
var P = require("../logic/perspectiva.js");
var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.error("  ✗ " + m); } }
var approx = (a, b) => Math.abs(a - b) < 1e-6;

/* extremos: cerca (d=0) escala 1 y abajo; lejos (d=1) chico y en el punto de fuga */
(function () {
  var cerca = P.proyectar(0, { k: 3 }), lejos = P.proyectar(1, { k: 3 });
  ok(approx(cerca.escala, 1), "d=0 escala debe ser 1, fue " + cerca.escala);
  ok(approx(cerca.alturaDesdeVP, 1), "d=0 alturaDesdeVP debe ser 1, fue " + cerca.alturaDesdeVP);
  ok(approx(lejos.alturaDesdeVP, 0), "d=1 alturaDesdeVP debe ser 0 (punto de fuga), fue " + lejos.alturaDesdeVP);
  ok(lejos.escala < cerca.escala, "lejos debe ser más chico que cerca");
  console.log("[1] extremos cerca/lejos: ok");
})();

/* monotonía: al alejarse, la escala y la altura SIEMPRE bajan (nunca vuelve grande) */
(function () {
  var prevE = Infinity, prevH = Infinity, monot = true;
  for (var i = 0; i <= 20; i++) {
    var r = P.proyectar(i / 20, { k: 3 });
    if (r.escala > prevE + 1e-9 || r.alturaDesdeVP > prevH + 1e-9) monot = false;
    prevE = r.escala; prevH = r.alturaDesdeVP;
  }
  ok(monot, "escala y altura deben decrecer monótonamente con la profundidad");
  console.log("[2] monotonía: ok");
})();

/* mapeo a pantalla: cerca abajo, lejos en el arco; el drift (apuntar al palo) crece hacia el fondo */
(function () {
  var cfg = { k: 3, vpX: 480, vpY: 150, nearY: 500, driftX: 80 };
  var cerca = P.aPantalla(0, cfg), lejos = P.aPantalla(1, cfg);
  ok(approx(cerca.y, 500), "cerca debe estar en nearY, fue " + cerca.y);
  ok(approx(lejos.y, 150), "lejos debe estar en vpY, fue " + lejos.y);
  ok(approx(cerca.x, 480), "cerca no debe tener drift (x=vpX), fue " + cerca.x);
  ok(approx(lejos.x, 560), "lejos debe tener drift completo (vpX+driftX), fue " + lejos.x);
  console.log("[3] mapeo a pantalla + drift: ok");
})();

console.log("\n" + (fail === 0 ? "✓ TODOS OK" : "✗ HUBO FALLAS") + " — " + pass + " asserts, " + fail + " fallaron.");
process.exit(fail === 0 ? 0 : 1);
