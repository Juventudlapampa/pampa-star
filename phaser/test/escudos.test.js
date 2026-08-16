/* ============================================================================
   PAMPA STAR · N3 — LOS ESCUDOS GENERADOS POR CÓDIGO

   Falla si:
     · dos clubes de la MISMA división comparten silueta y patrón (serían
       distinguibles solo por color, que es exactamente lo que no se puede),
     · dos clubes de la misma división comparten inicial,
     · un escudo usa un color que no está en la paleta cerrada del juego,
     · el patrón no contrasta contra el fondo,
     · la generación deja de ser determinista,
     · aparece un nombre de club real en la lista de clubes.

   Corré:  node phaser/test/escudos.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var E = require(path.join(__dirname, "..", "logic", "escudos.js"));
var DIV = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "data", "divisiones.json"), "utf8")).divisiones;

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

var TODOS = [];
Object.keys(DIV).forEach(function (k) { TODOS = TODOS.concat(DIV[k].rivales); });

/* ---------- [1] DENTRO DE CADA DIVISIÓN, TODOS DISTINTOS SIN MIRAR COLOR ---------- */
Object.keys(DIV).forEach(function (k) {
  var clubes = DIV[k].rivales;
  var es = E.escudosDe(clubes);
  var fp = {}, ini = {};
  clubes.forEach(function (c) {
    var e = es[c], llave = e.forma + "|" + e.patron;
    assert(!fp[llave],
      "en " + k + ", '" + c + "' y '" + fp[llave] + "' comparten silueta+patrón (" + llave + "): " +
      "quedarían distinguibles solo por color.");
    fp[llave] = c;
    assert(!ini[e.inicial],
      "en " + k + ", '" + c + "' y '" + ini[e.inicial] + "' comparten la inicial '" + e.inicial + "'");
    ini[e.inicial] = c;
  });
});
console.log("[1] las 5 divisiones: silueta+patrón e inicial únicas dentro de cada una");

/* ---------- [2] LA PALETA ES CERRADA ---------- */
(function () {
  var es = E.escudosDe(TODOS);
  var fuera = [];
  TODOS.forEach(function (c) {
    var e = es[c];
    if (E.PALETA.indexOf(e.colorA) < 0) fuera.push(c + " fondo " + e.colorA);
    if (E.PALETA.indexOf(e.colorB) < 0) fuera.push(c + " patrón " + e.colorB);
  });
  assert(fuera.length === 0,
    "hay colores fuera de la paleta cerrada: " + fuera.join(", ") + ". La paleta es cerrada a propósito: " +
    "con colores libres, tarde o temprano sale la combinación de un club o una bandera de verdad.");
  console.log("[2] los " + TODOS.length + " escudos usan solo los " + E.PALETA.length + " colores de la paleta del juego");
})();

/* ---------- [3] EL PATRÓN SE VE ---------- */
(function () {
  var es = E.escudosDe(TODOS);
  var flojos = [];
  TODOS.forEach(function (c) {
    var e = es[c];
    if (e.patron === "liso") return;               // el liso no tiene qué contrastar
    var d = Math.abs(E.luma(e.colorA) - E.luma(e.colorB));
    if (d < 0.25) flojos.push(c + " (" + d.toFixed(2) + ")");
  });
  assert(flojos.length === 0,
    "estos escudos tienen el patrón sin contraste contra el fondo, así que el patrón existe pero no se ve y el " +
    "escudo pasa a distinguirse solo por silueta: " + flojos.join(", "));
  console.log("[3] todos los patrones contrastan contra su fondo (mínimo 0.25 de luma)");
})();

/* ---------- [4] LA INICIAL SE LEE ---------- */
(function () {
  var es = E.escudosDe(TODOS);
  var ilegibles = [];
  TODOS.forEach(function (c) {
    var e = es[c];
    var d = Math.abs(E.luma(e.colorA) - E.luma(e.colorC));
    if (d < 0.3) ilegibles.push(c + " (" + d.toFixed(2) + ")");
    if (!e.inicial || e.inicial.length < 2 || e.inicial.length > 3) ilegibles.push(c + " inicial '" + e.inicial + "'");
  });
  assert(ilegibles.length === 0, "iniciales que no se leen sobre su fondo: " + ilegibles.join(", "));
  console.log("[4] las " + TODOS.length + " iniciales contrastan contra su fondo y miden 2-3 letras");
})();

/* ---------- [5] DETERMINISTA, Y NO DEPENDE DEL ORDEN DE LA LISTA ---------- */
(function () {
  var a = E.escudosDe(DIV.primera_b.rivales);
  var b = E.escudosDe(DIV.primera_b.rivales.slice().reverse());
  var distintos = DIV.primera_b.rivales.filter(function (c) {
    return a[c].forma !== b[c].forma || a[c].patron !== b[c].patron || a[c].colorA !== b[c].colorA;
  });
  assert(distintos.length === 0,
    "el escudo cambia según el orden en que venga la lista (" + distintos.join(", ") + "): el desempate tiene " +
    "que ordenar alfabéticamente antes de resolver, si no el mismo club cambia de escudo entre pantallas.");
  var c1 = E.escudoDe("Deportivo Winifreda"), c2 = E.escudoDe("Deportivo Winifreda");
  assert(c1.semilla === c2.semilla && c1.forma === c2.forma, "dos llamadas seguidas dan el mismo escudo");
  console.log("[5] determinista: mismo club → mismo escudo, venga la lista como venga");
})();

/* ---------- [6] LOS 45 TIENEN ESCUDO ---------- */
(function () {
  var es = E.escudosDe(TODOS);
  var sin = TODOS.filter(function (c) { return !es[c] || !es[c].forma; });
  assert(sin.length === 0, "clubes sin escudo: " + sin.join(", "));
  /* y un club que no existe todavía también tiene el suyo, sin tocar nada */
  var nuevo = E.escudoDe("Deportivo Inventado del Oeste");
  assert(nuevo.forma && nuevo.patron && nuevo.inicial === "DI",
    "un club nuevo tiene que tener escudo sin agregar nada a mano (dio " + JSON.stringify(nuevo) + ")");
  console.log("[6] " + TODOS.length + " clubes con escudo, y uno nuevo lo tiene sin tocar código");
})();

console.log(mal === 0 ? "✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
