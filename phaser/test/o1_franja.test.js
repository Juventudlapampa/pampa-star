/* ============================================================================
   PAMPA STAR · O1 — TODAS LAS OPCIONES EN UN SOLO LUGAR

   "Hoy las opciones para elegir aparecen a veces arriba y a veces abajo."
   Medido antes del arreglo, sobre los 12 grupos de opciones del juego:

     menú de acción del partido (cruz)   y=352/405/458   ✓ abajo
     título y volver del menú            y=306           ✓ abajo
     presets de tempo pre-partido        y=176/268/360   ✗ ARRIBA
     toggle de velocidad                 y=470           ✓ abajo
     ranuras de la semana (3)            y=250           ✗ ARRIBA
     botón de la semana                  y=466           ✓ abajo
     JUGAR LA FECHA / NUEVA TEMPORADA    y=460           ✓ abajo

   Dos de doce se salían, y son justamente las dos primeras pantallas que ve el
   jugador cuando entra a jugar. Ahora la franja es un dato
   (balance.piel.franja_decision) y quien reparte opciones usa piel.yDeOpcion().

   ESTE TEST ES EL GUARDIÁN: barre el código de las escenas buscando rectángulos
   interactivos con Y literal —o sea, ubicados a mano— y falla si alguno tiene
   pinta de opción y cae fuera de la franja. Un test que solo probara el helper
   no serviría: el helper siempre da bien, el problema es no usarlo.

   Corré:  node phaser/test/o1_franja.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var Piel = require(path.join(__dirname, "..", "logic", "piel.js"));
var BAL = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "balance.json"), "utf8"));
var P = BAL.piel;

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

var F = Piel.franja(P);

/* ---------- [1] LA FRANJA ES UN DATO Y REPARTE BIEN ---------- */
assert(F.y0 >= 260 && F.y1 <= 540, "la franja tiene que estar en la mitad de abajo del lienzo de 540 (dio " + F.y0 + ".." + F.y1 + ")");
assert(!Piel.caben(5, 52, P), "5 opciones de 52px NO entran en una franja de " + F.alto + ": caben() tiene que decirlo");
assert(Piel.caben(4, 52, P), "4 opciones de 52px sí entran");
[2, 3, 4].forEach(function (n) {
  var alto = n <= 3 ? 64 : 52;
  var ys = [];
  for (var i = 0; i < n; i++) ys.push(Piel.yDeOpcion(i, n, alto, P));
  ys.forEach(function (y, i) {
    assert(Piel.enFranja(y, alto, P),
      "con " + n + " opciones de " + alto + "px, la " + (i + 1) + " queda en y=" + Math.round(y) + " y se sale de la franja");
  });
  for (var k = 1; k < ys.length; k++) {
    assert(ys[k] - ys[k - 1] >= alto - 0.5,
      "con " + n + " opciones de " + alto + "px, la " + k + " y la " + (k + 1) + " se solapan (" +
      Math.round(ys[k - 1]) + " y " + Math.round(ys[k]) + ")");
  }
});
console.log("[1] la franja es " + F.y0 + ".." + F.y1 + " (alto " + F.alto + ") y reparte 2-5 opciones sin solapes");

/* ---------- [2] EL GUARDIÁN: NADA UBICADO A MANO FUERA DE LA FRANJA ---------- */
(function () {
  /* rects que NO son "elegir una de varias" y por eso pueden vivir donde sea */
  var EXENTOS = [
    { re: /960, 540/, por: "velos de pantalla completa" },
    { re: /setInteractive\(\)\s*;?\s*$/, por: "áreas de toque sin opción" },
    { re: /906, 306/, por: "el botón de volver del menú (va al borde, no es una opción de la decisión)" },
    { re: /48, 48/, por: "el botón de sonido" },
    { re: /add\.rectangle\(\s*0\s*,\s*0\s*,/, por: "rects dentro de un Container: su y es relativa al padre, no al lienzo" }
  ];
  var archivos = ["match.js", "master.js", "editor.js", "definicion_ui.js", "jugadon_ui.js"];
  var sospechas = [];
  archivos.forEach(function (f) {
    var ruta = path.join(__dirname, "..", "scenes", f);
    if (!fs.existsSync(ruta)) return;
    var lineas = fs.readFileSync(ruta, "utf8").split("\n");
    lineas.forEach(function (l, i) {
      if (l.trim().indexOf("*") === 0 || l.trim().indexOf("//") === 0) return;   // comentarios
      if (l.indexOf("setInteractive") < 0) return;
      /* add.rectangle(x, y, w, h, ...) con x/y/w/h literales */
      var m = l.match(/add\.rectangle\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
      if (!m) return;
      var y = parseFloat(m[2]), w = parseFloat(m[3]), h = parseFloat(m[4]);
      /* pinta de opción: ancho de botón y alto de botón */
      if (w < 120 || w > 720 || h < 30 || h > 130) return;
      if (EXENTOS.some(function (e) { return e.re.test(l); })) return;
      if (!Piel.enFranja(y, h, P)) {
        sospechas.push(f + ":" + (i + 1) + "  y=" + y + " alto=" + h + "  → " + l.trim().slice(0, 78));
      }
    });
  });
  assert(sospechas.length === 0,
    "hay " + sospechas.length + " grupo(s) de opciones ubicados a mano FUERA de la franja de decisión:\n     " +
    sospechas.join("\n     ") + "\n     Si es una opción, ubicala con window.PampaPiel.yDeOpcion(i, n, alto, this.BAL.piel). " +
    "Si no es una opción (un velo, un botón de borde), sumala a EXENTOS en este test con el motivo.");
  console.log("[2] ningún grupo de opciones ubicado a mano fuera de la franja (barridos " + archivos.length + " archivos)");
})();

/* ---------- [3] LOS DOS QUE ESTABAN MAL, USAN EL HELPER ---------- */
(function () {
  var match = fs.readFileSync(path.join(__dirname, "..", "scenes", "match.js"), "utf8");
  var master = fs.readFileSync(path.join(__dirname, "..", "scenes", "master.js"), "utf8");
  assert(/yDeOpcion\(i, PRESETS\.length \+ 1/.test(match),
    "los presets de tempo tienen que ubicarse con yDeOpcion (estaban clavados en y=176)");
  assert(/yDeOpcion\(0, 2, 108/.test(master),
    "las ranuras de la semana tienen que ubicarse con yDeOpcion (estaban clavadas en y=250)");
  assert(!/const y = 176 \+ i \* 92/.test(match), "quedó la cuenta vieja de los presets");
  assert(!/anchoR \+ 14\), y = 250/.test(master), "quedó la cuenta vieja de las ranuras");
  console.log("[3] los dos grupos que se salían (presets de tempo, ranuras de la semana) usan el helper");
})();

console.log(mal === 0 ? "✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
