/* ============================================================================
   PAMPA STAR · BLOQUE A — LOS TRES ESCALONES DEL DRAMA

   Imprime LA CUENTA en cada corrida: cuántos segundos de viñeta tiene un
   partido antes y después del reparto por escalones. Ese número es el punto:
   si el partido se vuelve más corto en tiempo real y más intenso en los picos,
   funcionó.

   Falla si: un trámite corta a viñeta · la jugada no cuesta menos que el
   momento · el escalón 3 cambió respecto de lo que costaba antes (tiene que
   quedar igual: lo que se recorta es lo de abajo) · la perilla global no
   multiplica todo.

   Corré:  node phaser/test/drama.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var D = require(path.join(__dirname, "..", "logic", "drama.js"));
var BAL = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "balance.json"), "utf8"));
var CFG = BAL.drama;

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* cuántas veces pasa cada cosa en un partido. Sale de la lógica: el reloj a
   momentos da ~16-18 momentos por tiempo en el preset intermedio, y cada
   momento termina en un encuentro o un remate. */
var PARTIDO = {
  pase: 14, quite: 8, corte: 5,          // el trámite, lo que más se repite
  gambeta: 7, remate: 6, atajada: 4, bloqueo: 3,
  gol: 2, gol_rival: 1, megatiro: 1
};
var ANTES_MS = 2600;   // lo que costaba TODA viñeta antes del bloque A

/* ---------- LA CUENTA ---------- */
(function () {
  var antes = 0, despues = 0;
  console.log("SEGUNDOS DE VIÑETA POR PARTIDO");
  console.log("  acción       esc  veces   antes      después");
  Object.keys(PARTIDO).forEach(function (a) {
    var v = PARTIDO[a];
    var e = D.escalonDe(a);
    var msA = ANTES_MS * v;                                  // antes TODO cortaba
    var msD = D.cortaAVinieta(a) ? D.presupuesto(a, null, CFG) * v : 0;
    antes += msA; despues += msD;
    console.log("  " + a.padEnd(12) + " " + e + "   " + String(v).padStart(3) + "   " +
      String((msA / 1000).toFixed(1) + "s").padStart(7) + "   " +
      String((msD / 1000).toFixed(1) + "s").padStart(7) + (msD === 0 ? "   ← en la cancha" : ""));
  });
  var pct = Math.round((1 - despues / antes) * 100);
  console.log("  " + "".padEnd(12) + "         TOTAL  " + (antes / 1000).toFixed(1) + "s    " +
    (despues / 1000).toFixed(1) + "s     (−" + pct + "%)");

  assert(despues < antes * 0.6,
    "el partido tiene que perder al menos el 40% del tiempo de viñeta: pasó de " +
    (antes / 1000).toFixed(1) + "s a " + (despues / 1000).toFixed(1) + "s (−" + pct + "%)");

  /* y los picos NO pueden haber perdido nada: lo que se recorta es lo de abajo */
  var golAntes = ANTES_MS, golDespues = D.presupuesto("gol", null, CFG);
  assert(golDespues >= golAntes,
    "el gol no puede costar MENOS que antes (" + golDespues + " contra " + golAntes + "): " +
    "el bloque A recorta el trámite y la jugada, no el momento.");
  console.log("\n[cuenta] el partido pasa de " + (antes / 1000).toFixed(1) + "s a " +
    (despues / 1000).toFixed(1) + "s de viñeta (−" + pct + "%), y el gol sigue costando " + golDespues + " ms");
})();

/* ---------- [1] EL TRÁMITE NO CORTA ---------- */
(function () {
  var tramites = ["pase", "quite", "corte", "saque", "bajarla"];
  tramites.forEach(function (a) {
    assert(!D.cortaAVinieta(a), "'" + a + "' es trámite y NO puede cortar a viñeta");
    assert(D.presupuesto(a, null, CFG) < 500,
      "'" + a + "' tiene que resolverse en menos de 500 ms (dio " + D.presupuesto(a, null, CFG) + ")");
  });
  console.log("[1] los " + tramites.length + " trámites se resuelven en la cancha, en menos de 500 ms");
})();

/* ---------- [2] LOS TRES ESCALONES SE SEPARAN DE VERDAD ---------- */
(function () {
  var t = D.presupuesto("pase", null, CFG);
  var j = D.presupuesto("remate", null, CFG);
  var m = D.presupuesto("gol", null, CFG);
  assert(t < j && j < m, "los tres presupuestos tienen que estar ordenados (dio " + t + " / " + j + " / " + m + ")");
  assert(j <= m * 0.55,
    "la jugada tiene que costar como mucho la mitad del momento: " + j + " contra " + m);
  console.log("[2] trámite " + t + " ms · jugada " + j + " ms · momento " + m + " ms");
})();

/* ---------- [3] EL CONTEXTO PUEDE SUBIR DE ESCALÓN ---------- */
(function () {
  assert(D.escalonDe("quite", { enArea: true }) === 2, "un quite en el área sube a jugada");
  assert(D.escalonDe("remate", { decisivo: true }) === 3, "el remate que define sube a momento");
  assert(D.escalonDe("gambeta", { especial: true }) === 3, "una gambeta especial sube a momento");
  assert(D.escalonDe("pase", null) === 1, "un pase común se queda en trámite");
  console.log("[3] el contexto sube de escalón: quite en el área → jugada · remate decisivo → momento");
})();

/* ---------- [4] EL REPARTO CONSERVA LAS PROPORCIONES ---------- */
(function () {
  var p = D.planos("gol", null, CFG);
  assert(p.entrada + p.pose + p.hold <= p.total + 2 && p.entrada + p.pose + p.hold >= p.total - 2,
    "los tres planos tienen que sumar el total (dio " + (p.entrada + p.pose + p.hold) + " de " + p.total + ")");
  /* el escalón 3 tiene que dar los mismos números que había antes a mano */
  assert(Math.abs(p.entrada - 500) <= 2 && Math.abs(p.pose - 800) <= 2 && Math.abs(p.hold - 1300) <= 2,
    "el escalón 3 tiene que reproducir el reparto de hoy (500/800/1300), dio " +
    p.entrada + "/" + p.pose + "/" + p.hold);
  console.log("[4] el momento reparte 500/800/1300 igual que antes; la jugada, lo mismo a escala");
})();

/* ---------- [5] LA PERILLA GLOBAL MULTIPLICA TODO (B7) ---------- */
(function () {
  var mitad = Object.assign({}, CFG, { intensidad: 0.5 });
  var doble = Object.assign({}, CFG, { intensidad: 2 });
  ["pase", "remate", "gol"].forEach(function (a) {
    var n = D.presupuesto(a, null, CFG);
    assert(Math.abs(D.presupuesto(a, null, mitad) - n / 2) <= 1, "'" + a + "' a intensidad 0.5 tiene que valer la mitad");
    assert(Math.abs(D.presupuesto(a, null, doble) - n * 2) <= 1, "'" + a + "' a intensidad 2 tiene que valer el doble");
  });
  console.log("[5] la perilla global sube y baja la intensidad entera con un número");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
