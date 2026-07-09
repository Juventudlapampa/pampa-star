/* ============================================================================
   PAMPA STAR · test de la lógica de duelo (node, sin dependencias)
   Corré:  node phaser/test/duel.test.js
   Cubre el BUG CRÍTICO del playtest: "el arquero atajó y marcó gol igual".
   El invariante que se prueba:  keeperWins  <=>  outcome != 'gol'.  Siempre.
   ========================================================================== */
"use strict";
var D = require("../logic/duel.js");

var pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.error("  ✗ FALLA: " + msg); } }

/* rng determinista: devuelve los valores de la lista, en orden (loop). */
function seq(vals) { var i = 0; return function () { return vals[i++ % vals.length]; }; }

/* ---- 1) El invariante duro: si el arquero gana, NUNCA hay gol --------------- */
(function () {
  // arquero dominante (keeperSkill altísimo): la chance es baja; con rolls altos, siempre atajada.
  var goles = 0, total = 2000;
  for (var i = 0; i < total; i++) {
    var r = D.resolveShot({ shotPower: 40, keeperSkill: 95, zone: { bonus: 0, fuera: 0, gy: 0 }, rng: Math.random });
    if (r.keeperWins) ok(r.outcome !== "gol", "keeperWins=true pero outcome=gol (EL BUG)");
    if (r.outcome === "gol") ok(r.keeperWins === false, "outcome=gol pero keeperWins=true (EL BUG)");
    if (r.outcome === "gol") goles++;
  }
  ok(goles < total, "con un arquero dominante deberían atajarse casi todos (hubo " + goles + "/" + total + " goles)");
  console.log("[1] invariante keeperWins<=>no-gol: verificado en " + total + " tiros");
})();

/* ---- 2) Forzar ATAJADA: roll alto ⇒ el arquero gana ⇒ jamás gol ------------ */
(function () {
  var r = D.resolveShot({ shotPower: 60, keeperSkill: 55, zone: { bonus: 0, fuera: 0.5, gy: 0 }, rng: seq([0.999]) });
  ok(r.outcome === "atajada", "roll=0.999 debe ser atajada, fue " + r.outcome);
  ok(r.keeperWins === true, "atajada debe marcar keeperWins=true");
  console.log("[2] roll alto ⇒ atajada (keeperWins), nunca gol: ok");
})();

/* ---- 3) Forzar GOL: roll bajo y sin 'afuera' ⇒ gol, arquero NO gana -------- */
(function () {
  var r = D.resolveShot({ shotPower: 60, keeperSkill: 40, zone: { bonus: 0, fuera: 0, gy: 44 }, rng: seq([0.01]) });
  ok(r.outcome === "gol", "roll=0.01 sin fuera debe ser gol, fue " + r.outcome);
  ok(r.keeperWins === false, "gol debe marcar keeperWins=false");
  ok(r.gy === 44, "gy debe viajar tal cual de la zona (44), fue " + r.gy);
  console.log("[3] roll bajo ⇒ gol, keeperWins=false, gy propagado: ok");
})();

/* ---- 4) La esquina puede irse AFUERA (ganaba el tiro pero se fue) ---------- */
(function () {
  // primer rng (0.01) hace ganar el tiro; segundo (0.01 < fuera 0.9) lo manda afuera.
  var r = D.resolveShot({ shotPower: 80, keeperSkill: 30, zone: { bonus: 6, fuera: 0.9, gy: -44 }, rng: seq([0.01, 0.01]) });
  ok(r.outcome === "afuera", "debía irse afuera, fue " + r.outcome);
  ok(r.keeperWins === false, "afuera NO es atajada (el arquero no la toca)");
  console.log("[4] esquina afuera: outcome=afuera, keeperWins=false: ok");
})();

/* ---- 5) chancePct coherente y acotado ------------------------------------- */
(function () {
  var a = D.resolveShot({ shotPower: 200, keeperSkill: 0, zone: {}, rng: seq([0.5]) });
  var b = D.resolveShot({ shotPower: 0, keeperSkill: 200, zone: {}, rng: seq([0.5]) });
  ok(a.chancePct <= 95 && a.chancePct >= 7, "chance acotada arriba (fue " + a.chancePct + ")");
  ok(b.chancePct <= 95 && b.chancePct >= 7, "chance acotada abajo (fue " + b.chancePct + ")");
  console.log("[5] chancePct acotada 7..95: ok (" + a.chancePct + " / " + b.chancePct + ")");
})();

/* ---- resumen -------------------------------------------------------------- */
console.log("\n" + (fail === 0 ? "✓ TODOS OK" : "✗ HUBO FALLAS") + " — " + pass + " asserts pasaron, " + fail + " fallaron.");
process.exit(fail === 0 ? 0 : 1);
