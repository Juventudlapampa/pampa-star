/* ============================================================================
   PAMPA STAR · test de la EJECUCIÓN del tiro (node, sin dependencias)
   Corré:  node phaser/test/tiro.test.js
   ========================================================================== */
"use strict";
var T = require("../logic/tiro.js");
var D = require("../logic/duel.js");
var fs = require("fs"), path = require("path");
var bal = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/balance.json"), "utf8"));
var cfg = bal.tiro_ejecucion;

var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.error("  ✗ " + m); } }
var rngCero = function () { return 0.5; };   // (rng*2-1)=0 → sin ruido: ejecución determinista

/* ---- 1) el punto dulce de potencia rinde más que el tirito y que el cañonazo ---- */
(function () {
  var dulce = T.evaluarEjecucion({ aimX: 0.8, aimY: 0.3, potencia: (cfg.potencia_dulce[0] + cfg.potencia_dulce[1]) / 2, curva: 0, statTiro: 90, cfg: cfg, rng: rngCero });
  var flojo = T.evaluarEjecucion({ aimX: 0.8, aimY: 0.3, potencia: 0.15, curva: 0, statTiro: 90, cfg: cfg, rng: rngCero });
  var pasado = T.evaluarEjecucion({ aimX: 0.8, aimY: 0.3, potencia: 1.0, curva: 0, statTiro: 90, cfg: cfg, rng: rngCero });
  ok(dulce.zona.bonus > flojo.zona.bonus, "punto dulce > tirito flojo (" + dulce.zona.bonus.toFixed(1) + " > " + flojo.zona.bonus.toFixed(1) + ")");
  ok(pasado.zona.fuera > dulce.zona.fuera, "cañonazo pasado arriesga más afuera (" + pasado.zona.fuera.toFixed(2) + " > " + dulce.zona.fuera.toFixed(2) + ")");
  console.log("[1] potencia con punto dulce: ok");
})();

/* ---- 2) apuntar a la esquina rinde más que al medio, pero arriesga más ---- */
(function () {
  var esquina = T.evaluarEjecucion({ aimX: 0.95, aimY: 0.6, potencia: 0.75, curva: 0, statTiro: 90, cfg: cfg, rng: rngCero });
  var medio = T.evaluarEjecucion({ aimX: 0, aimY: 0, potencia: 0.75, curva: 0, statTiro: 90, cfg: cfg, rng: rngCero });
  ok(esquina.zona.bonus > medio.zona.bonus, "esquina > al medio en bonus");
  ok(esquina.zona.fuera > medio.zona.fuera, "esquina arriesga más afuera");
  ok(Math.abs(esquina.zona.gy) > Math.abs(medio.zona.gy), "gy sigue la puntería (cine)");
  console.log("[2] esquina vs medio: ok");
})();

/* ---- 3) pasarse del palo (aim fuera del arco) castiga fuerte el 'fuera' ---- */
(function () {
  var adentro = T.evaluarEjecucion({ aimX: 0.9, aimY: 0, potencia: 0.75, curva: 0, statTiro: 90, cfg: cfg, rng: rngCero });
  var afuera = T.evaluarEjecucion({ aimX: 1.3, aimY: 0, potencia: 0.75, curva: 0, statTiro: 90, cfg: cfg, rng: rngCero });
  ok(afuera.zona.fuera > adentro.zona.fuera + 0.1, "pasarse del palo dispara el fuera (" + afuera.zona.fuera.toFixed(2) + ")");
  ok(afuera.detalle.seFuePorBorde, "detalle marca que se fue por el borde");
  ok(Math.abs(afuera.zona.gy) <= cfg.gy_max, "gy queda acotado al arco aunque el aim se pase");
  console.log("[3] pasarse del palo: ok");
})();

/* ---- 4) STATS = margen de error: mismo aim, el stat alto tiembla menos ---- */
(function () {
  // rng fijo en 0.99 → el ruido empuja al máximo: con stat alto casi no mueve
  var rngPeor = function () { return 0.99; };
  var crack = T.evaluarEjecucion({ aimX: 0.7, aimY: 0, potencia: 0.75, curva: 0, statTiro: 90, cfg: cfg, rng: rngPeor });
  var pibe = T.evaluarEjecucion({ aimX: 0.7, aimY: 0, potencia: 0.75, curva: 0, statTiro: 30, cfg: cfg, rng: rngPeor });
  ok(crack.detalle.ruido < pibe.detalle.ruido, "stat alto → menos ruido (" + crack.detalle.ruido.toFixed(2) + " < " + pibe.detalle.ruido.toFixed(2) + ")");
  ok(Math.abs(crack.detalle.ax - 0.7) < Math.abs(pibe.detalle.ax - 0.7), "el crack clava más cerca de donde apuntó");
  console.log("[4] destreza vs stats (ruido): ok");
})();

/* ---- 5) la curva controlada suma; el peso_destreza escala todo ---- */
(function () {
  var conCurva = T.evaluarEjecucion({ aimX: 0.5, aimY: 0, potencia: 0.75, curva: 0.6, statTiro: 90, cfg: cfg, rng: rngCero });
  var sinCurva = T.evaluarEjecucion({ aimX: 0.5, aimY: 0, potencia: 0.75, curva: 0, statTiro: 90, cfg: cfg, rng: rngCero });
  ok(conCurva.zona.bonus > sinCurva.zona.bonus, "la comba suma bonus");
  var cfgSinPeso = Object.assign({}, cfg, { peso_destreza: 0 });
  var neutro = T.evaluarEjecucion({ aimX: 0.95, aimY: 0.6, potencia: 1.0, curva: 0.9, statTiro: 90, cfg: cfgSinPeso, rng: rngCero });
  ok(Math.abs(neutro.zona.bonus) < 0.001, "peso_destreza=0 → la ejecución no pesa (bonus " + neutro.zona.bonus.toFixed(3) + ")");
  console.log("[5] curva + peso_destreza: ok");
})();

/* ---- 6) INTEGRACIÓN: la zona de ejecución alimenta resolveShot sin romper el invariante ---- */
(function () {
  var ej = T.evaluarEjecucion({ aimX: 0.9, aimY: 0.5, potencia: 0.75, curva: 0.4, statTiro: 80, cfg: cfg, rng: rngCero });
  var r = D.resolveShot({ shotPower: 66, keeperSkill: 999, zone: ej.zona, rng: function () { return 0.99; } });
  ok(r.keeperWins && r.outcome !== "gol", "arquero imbatible: jamás gol (invariante intacto con zona de ejecución)");
  var r2 = D.resolveShot({ shotPower: 999, keeperSkill: 1, zone: ej.zona, rng: function () { return 0.01; } });
  ok(!r2.keeperWins || r2.outcome !== "gol", "coherencia keeperWins ⇔ outcome");
  ok(typeof ej.calidad === "number" && ej.calidad >= 0 && ej.calidad <= 1, "calidad acotada 0..1");
  console.log("[6] integración con duel.resolveShot: ok");
})();

console.log("\n" + (fail === 0 ? "✓ TODOS OK" : "✗ HUBO FALLAS") + " — " + pass + " asserts, " + fail + " fallaron.");
process.exit(fail === 0 ? 0 : 1);
