/* ============================================================================
   PAMPA STAR · test del MODO MASTER (V6 §8) — node, sin dependencias
   Corré:  node phaser/test/master.test.js
   ========================================================================== */
"use strict";
var M = require("../logic/master.js");
var P = require("../logic/partido.js");
var fs = require("fs"), path = require("path");
var bal = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/balance.json"), "utf8"));

var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.error("  ✗ " + m); } }

/* ---- 1) la escalera: dificultad FIJA y cada ascenso SE SIENTE ---- */
(function () {
  ok(M.DIVISIONES.length === 5 && M.DIVISIONES[0].id === "primera_b" && M.DIVISIONES[4].id === "mundial", "del potrero al Mundial: 5 escalones");
  for (var i = 1; i < M.DIVISIONES.length; i++) {
    ok(M.DIVISIONES[i].mult_stats > M.DIVISIONES[i - 1].mult_stats, "stats suben en " + M.DIVISIONES[i].id);
    ok(M.DIVISIONES[i].keeper > M.DIVISIONES[i - 1].keeper, "el arquero rival sube en " + M.DIVISIONES[i].id);
  }
  ok(M.divisionPorNivel(1).id === "primera_b" && M.divisionPorNivel(2).id === "primera_b", "nivel 1-2 = Primera B");
  ok(M.divisionPorNivel(9).id === "mundial" && M.divisionPorNivel(99).id === "mundial", "nivel alto = Mundial (acotado)");
  console.log("[1] escalera de divisiones: ok");
})();

/* ---- 2) perfiles de IA: deterministas y variados ---- */
(function () {
  ok(M.perfilRival("TOAY").id === M.perfilRival("TOAY").id, "mismo club, mismo perfil SIEMPRE");
  var vistos = {};
  ["TOAY", "WINIFREDA", "GENERAL PICO", "VICTORICA", "EDUARDO CASTEX", "MACACHIN", "REALICO", "QUEMU"].forEach(function (c) { vistos[M.perfilRival(c).id] = true; });
  ok(Object.keys(vistos).length >= 3, "los pueblos juegan distinto (" + Object.keys(vistos).join(", ") + ")");
  ok(M.PERFILES.every(function (p) { var s = p.cpu_pesos.quite + p.cpu_pesos.corte + p.cpu_pesos.bloqueo; return Math.abs(s - 1) < 0.01; }), "los pesos de cada perfil suman 1");
  console.log("[2] perfiles de IA: ok");
})();

/* ---- 3) aplicar: escala rivales y arquero SIN tocar el balance compartido ---- */
(function () {
  function partidoNuevo() {
    var mios = [{ nombre: "Arquero", pos: "ARQ" }];
    for (var i = 0; i < 10; i++) mios.push({ nombre: "Compa " + i, pos: "X" });
    return P.crearPartido({ bal: bal, mios: mios, rivales: [], rng: Math.random });
  }
  var stB = partidoNuevo(), stM = partidoNuevo();
  var balAntes = stB.bal;
  M.aplicar(stB, M.divisionPorNivel(1), M.PERFILES[0]);
  M.aplicar(stM, M.divisionPorNivel(9), M.PERFILES[0]);
  ok(stM.rivalKeeperSkill > stB.rivalKeeperSkill, "el arquero del Mundial es otra cosa (" + stB.rivalKeeperSkill + " vs " + stM.rivalKeeperSkill + ")");
  var pB = stB.rivales[5].stats.tiro, pM = stM.rivales[5].stats.tiro;
  ok(pM > pB, "los rivales del Mundial pegan más fuerte (" + pB + " vs " + pM + ")");
  ok(bal.partido.cpu_pesos.quite === 0.4, "el balance COMPARTIDO no se mutó (retrocompat)");
  ok(stB.bal !== balAntes || stB.bal.partido.cpu_pesos.quite === M.PERFILES[0].cpu_pesos.quite, "el perfil vive en una copia del partido");
  ok(stB._master && stB._master.division === "primera_b", "el partido sabe su división");
  console.log("[3] aplicar división+perfil: ok");
})();

console.log("\n" + (fail === 0 ? "✓ TODOS OK" : "✗ HUBO FALLAS") + " — " + pass + " asserts, " + fail + " fallaron.");
process.exit(fail === 0 ? 0 : 1);
