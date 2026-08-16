/* ============================================================================
   PAMPA STAR · BLOQUE C — QUE LA ESCALERA SE SIENTA

   El diagnóstico: la Primera B y el Mundial se veían exactamente igual. Mismo
   escudo, misma cancha, misma tribuna. El Modo Master promete cinco escalones
   y visualmente era plano.

   EL CRITERIO, y es lo que este test verifica: que alguien que abre una
   captura sepa en qué división está SIN LEER EL TEXTO. Para eso, dos
   divisiones cualesquiera tienen que diferenciarse en varios rasgos visuales a
   la vez, y los vecinos —que son los más difíciles— en al menos tres.

   Falla si: dos divisiones vecinas se parecen demasiado · algo no sube de
   forma monótona con el escalón · la Primera B tiene ceremonia · el Mundial no
   la tiene · el escudo no gana detalle.

   Corré:  node phaser/test/escalera.test.js
   ========================================================================== */
"use strict";
var path = require("path");
var E = require(path.join(__dirname, "..", "logic", "escalera.js"));

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* ---------- LA TABLA, IMPRESA ---------- */
console.log("EL ENVOLTORIO, ESCALÓN POR ESCALÓN");
console.log("  división     tribuna  movim  hinchada  luz          ceremonia  escudo");
E.ORDEN.forEach(function (d) {
  var e = E.de(d);
  console.log("  " + e.n.padEnd(12) +
    String(Math.round(e.tribuna_densidad * 100) + "%").padStart(6) + "  " +
    String(Math.round(e.tribuna_movimiento * 100) + "%").padStart(5) + "  " +
    String(Math.round(e.hinchada_volumen * 100) + "%").padStart(7) + "   " +
    e.luz.padEnd(12) + String(e.ceremonia_ms + "ms").padStart(8) + "  detalle " + e.escudo_detalle);
});

/* ---------- [1] TODO SUBE CON EL ESCALÓN ---------- */
(function () {
  var suben = ["tribuna_densidad", "tribuna_movimiento", "hinchada_volumen", "ceremonia_ms", "escudo_detalle"];
  suben.forEach(function (r) {
    for (var i = 1; i < E.ORDEN.length; i++) {
      var a = E.de(E.ORDEN[i - 1])[r], b = E.de(E.ORDEN[i])[r];
      assert(b >= a, "'" + r + "' tiene que subir o mantenerse de " + E.ORDEN[i - 1] + " a " + E.ORDEN[i] +
        " (dio " + a + " → " + b + ")");
    }
  });
  console.log("\n[1] los " + suben.length + " rasgos que suben lo hacen de forma monótona en los 5 escalones");
})();

/* ---------- [2] LOS EXTREMOS SON OTRO MUNDO ---------- */
(function () {
  var d = E.diferencias("primera_b", "mundial");
  assert(d.length >= 5,
    "la Primera B y el Mundial tienen que diferenciarse en al menos 5 rasgos visuales (difieren en " +
    d.length + ": " + d.join(", ") + ")");
  var b = E.de("primera_b"), m = E.de("mundial");
  assert(m.tribuna_densidad >= b.tribuna_densidad * 3,
    "la tribuna del Mundial tiene que estar al menos 3 veces más llena que la de Primera B");
  console.log("[2] Primera B contra Mundial: difieren en " + d.length + " rasgos (" + d.join(", ") + ")");
})();

/* ---------- [3] HASTA LOS VECINOS SE DISTINGUEN ---------- */
(function () {
  var peor = null, peorN = 99;
  for (var i = 1; i < E.ORDEN.length; i++) {
    var d = E.diferencias(E.ORDEN[i - 1], E.ORDEN[i]);
    if (d.length < peorN) { peorN = d.length; peor = E.ORDEN[i - 1] + " vs " + E.ORDEN[i]; }
    assert(d.length >= 3,
      "los vecinos " + E.ORDEN[i - 1] + " y " + E.ORDEN[i] + " se diferencian en solo " + d.length +
      " rasgos (" + d.join(", ") + "): son los más difíciles de distinguir y hacen falta al menos 3");
  }
  console.log("[3] el par de vecinos más parecido (" + peor + ") difiere en " + peorN + " rasgos");
})();

/* ---------- [4] LA CEREMONIA: ABAJO NO, ARRIBA SÍ ---------- */
(function () {
  assert(!E.hayCeremonia("primera_b"), "en Primera B se arranca y ya: nada de presentación");
  assert(!E.hayCeremonia("primera_a"), "en Primera A tampoco");
  assert(E.hayCeremonia("mundial"), "en el Mundial tiene que haber entrada");
  assert(E.de("mundial").ceremonia_ms > E.de("regional").ceremonia_ms,
    "la ceremonia del Mundial tiene que ser más larga que la del Regional");
  console.log("[4] ceremonia: primera_b y primera_a sin nada · mundial " + E.de("mundial").ceremonia_ms + " ms");
})();

/* ---------- [5] LA TRIBUNA SE LLENA DE VERDAD ---------- */
(function () {
  var max = 40;
  var b = E.siluetas("primera_b", max), m = E.siluetas("mundial", max);
  assert(b < max * 0.4, "en Primera B la tribuna tiene que verse VACÍA (dio " + b + " de " + max + ")");
  assert(m === max, "en el Mundial tiene que estar llena (dio " + m + " de " + max + ")");
  console.log("[5] tribuna: " + b + " siluetas en Primera B contra " + m + " en el Mundial");
})();

/* ---------- [6] EL SONIDO ACOMPAÑA, Y NO SOLO SUBE DE VOLUMEN ---------- */
(function () {
  assert(!E.de("primera_b").hinchada_continua, "en Primera B la hinchada es un murmullo con gritos sueltos");
  assert(E.de("mundial").hinchada_continua, "en el Mundial es un rugido continuo");
  console.log("[6] la hinchada pasa de gritos sueltos a rugido continuo, no solo de volumen");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
