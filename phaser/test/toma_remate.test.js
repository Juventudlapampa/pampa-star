/* ============================================================================
   PAMPA STAR · LA TOMA DEL REMATE (oct 2026)

   Rodri: "cuando va a patear, que se frene o quede suspendido el jugador y
   haya un movimiento de la cámara, como enfocándolo en 3D, mientras va
   subiendo la pierna o bajándola, para darle más épica".

   La pierna se mueve deformando la ilustración con dos huesos (cadera y
   rodilla) medidos sobre la pose "remate" (data/poses_manifest.json). Este
   test corre la deformación de verdad (logic/pierna.js) sobre una grilla del
   tamaño de la ilustración y verifica lo que se vio en las capturas:
     · la otra pierna, el torso y la cabeza NO se mueven
     · el botín se mueve ENTERO (con el radio de la pierna, medio botín se
       quedaba atrás y se estiraba como una mancha — visto en la toma v2)
     · la carga lleva el pie para atrás y el final para adelante
     · la patada cae en el contacto: cuando la pierna pasa por la pose dibujada
   y que la toma esté enchufada al remate y al súper tiro.

   Corré:  node phaser/test/toma_remate.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..");
var PI = require(path.join(RAIZ, "logic/pierna.js"));
var MAN = JSON.parse(fs.readFileSync(path.join(RAIZ, "..", "data/poses_manifest.json"), "utf8"));
var MATCH = fs.readFileSync(path.join(RAIZ, "scenes/match.js"), "utf8");
var TOMA = fs.readFileSync(path.join(RAIZ, "scenes/toma_remate.js"), "utf8");
var INDEX = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8");
var BAL = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/balance.json"), "utf8"));

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

var def = MAN.poses.remate.pierna;
var TW = 900, TH = 854;   // pose_remate.webp
var B = PI.huesos(def, TW, TH);

/* ---------- [1] LOS HUESOS SON MEDIDOS, NO INVENTADOS ---------- */
(function () {
  assert(!!def, "la pose remate tiene que traer sus huesos ('pierna') en el manifest");
  ["cadera", "rodilla", "tobillo", "punta"].forEach(function (k) {
    assert(Array.isArray(def[k]) && def[k].length === 2 && def[k][0] > 0 && def[k][0] < 1 && def[k][1] > 0 && def[k][1] < 1,
      "el hueso '" + k + "' va en fracciones de la imagen");
  });
  assert(typeof def._medido === "string" && /grilla/.test(def._medido), "y dice cómo se midió (regla: no se inventan coordenadas)");
  /* la cadena va de arriba-izquierda a abajo-derecha, como la pierna dibujada */
  assert(B.cadera[0] < B.rodilla[0] && B.rodilla[0] < B.tobillo[0] && B.tobillo[0] < B.punta[0], "la pierna va hacia adelante");
  assert(B.r0p > B.r0 && B.r1p > B.r1, "el pie lleva radio propio, más grande que el de la pierna");
  console.log("[1] huesos medidos: cadera " + B.cadera.map(Math.round) + " · rodilla " + B.rodilla.map(Math.round) +
    " · tobillo " + B.tobillo.map(Math.round) + " · punta " + B.punta.map(Math.round));
})();

/* ---------- [2] LO QUE NO ES LA PIERNA NO SE MUEVE ---------- */
(function () {
  /* puntos de la ilustración, en px, que NO son la pierna que patea (mirados
     sobre la grilla): la otra pierna, el botín de atrás, la cabeza, el torso,
     los dos puños y el short arriba del muslo */
  var quietos = { "botín de atrás": [90, 510], "rodilla de atrás": [250, 690], "cabeza": [520, 120],
    "el 10": [320, 230], "puño izquierdo": [30, 225], "puño derecho": [820, 310], "short arriba": [300, 420] };
  var xs = [], ys = [];
  Object.keys(quietos).forEach(function (k) { xs.push(quietos[k][0]); ys.push(quietos[k][1]); });
  var W8 = PI.pesos(xs, ys, B);
  var ox = new Float32Array(xs.length), oy = new Float32Array(xs.length);
  [PI.coreografia(0.65), PI.coreografia(0.9)].forEach(function (co) {
    PI.posar(xs, ys, W8, B, co, ox, oy);
    Object.keys(quietos).forEach(function (k, i) {
      var d = Math.hypot(ox[i] - xs[i], oy[i] - ys[i]);
      assert(d < 2, "'" + k + "' no puede moverse con la pierna (se movió " + d.toFixed(1) + " px)");
    });
  });
  console.log("[2] la otra pierna, el torso, la cabeza y los puños quedan quietos");
})();

/* ---------- [3] EL BOTÍN SE MUEVE ENTERO ---------- */
(function () {
  /* puntos del botín (sus bordes, hasta 100 px del hueso del pie) */
  var bot = [[700, 720], [760, 845], [850, 760], [720, 830], [800, 800]];
  var xs = bot.map(function (p) { return p[0]; }), ys = bot.map(function (p) { return p[1]; });
  var W8 = PI.pesos(xs, ys, B);
  var co = PI.coreografia(0.69);   // la carga más honda
  var ox = new Float32Array(xs.length), oy = new Float32Array(xs.length);
  PI.posar(xs, ys, W8, B, co, ox, oy);
  /* rígido = las distancias entre puntos del botín no cambian */
  var maxDef = 0;
  for (var a = 0; a < bot.length; a++) for (var b = a + 1; b < bot.length; b++) {
    var d0 = Math.hypot(xs[a] - xs[b], ys[a] - ys[b]), d1 = Math.hypot(ox[a] - ox[b], oy[a] - oy[b]);
    maxDef = Math.max(maxDef, Math.abs(d1 - d0) / d0);
  }
  assert(maxDef < 0.08, "el botín tiene que moverse entero: se deformó " + Math.round(maxDef * 100) + "% (era la mancha negra)");
  console.log("[3] el botín se mueve entero (deformación máxima " + Math.round(maxDef * 100) + "%)");
})();

/* ---------- [4] LA COREOGRAFÍA: carga atrás, golpe, final adelante ---------- */
(function () {
  var c0 = PI.coreografia(0), cC = PI.coreografia(0.69), cF = PI.coreografia(0.95);
  assert(c0.cadera === 0 && c0.rodilla === 0, "arranca en la pose dibujada (el jugador suspendido)");
  var pie0 = PI.puntoDelPie(B.punta, B, c0), pieC = PI.puntoDelPie(B.punta, B, cC), pieF = PI.puntoDelPie(B.punta, B, cF);
  assert(pieC[0] < pie0[0] - 60, "en la carga el pie va para ATRÁS (de " + Math.round(pie0[0]) + " a " + Math.round(pieC[0]) + ")");
  assert(pieF[1] < pie0[1] - 40, "en el final el pie SUBE (de " + Math.round(pie0[1]) + " a " + Math.round(pieF[1]) + ")");
  /* el contacto: la cadera cruza el cero justo ahí */
  var k = c0.contacto;
  assert(k > 0.6 && k < 0.85, "el contacto cae en la segunda mitad de la toma (" + k.toFixed(3) + ")");
  var antes = PI.coreografia(k - 0.004), despues = PI.coreografia(k + 0.004);
  assert(antes.cadera > 0 && despues.cadera < 0, "y es el instante en que la pierna pasa por la pose dibujada");
  /* la cámara gira de un lado al otro durante la carga */
  assert(PI.coreografia(0.05).orbitaY > 0.3 && PI.coreografia(0.69).orbitaY < -0.2, "la cámara gira alrededor del jugador");
  assert(PI.coreografia(0.69).escala > 1.08, "y se acerca");
  console.log("[4] carga atrás, golpe en " + Math.round(k * 100) + "% de la toma, final arriba; la cámara gira " +
    PI.coreografia(0.05).orbitaY.toFixed(2) + " → " + PI.coreografia(0.69).orbitaY.toFixed(2) + " rad");
})();

/* ---------- [5] ENCHUFADA: remate y súper tiro, patada en el contacto ---------- */
(function () {
  assert(/<script src="logic\/pierna\.js"><\/script>/.test(INDEX) && /<script src="scenes\/toma_remate\.js"><\/script>/.test(INDEX),
    "index.html carga logic/pierna.js y scenes/toma_remate.js");
  var porCom = MATCH.slice(MATCH.indexOf("  tiroPorComandos(rivalIdx) {"), MATCH.indexOf("  dispararConCine(mega, ej) {"));
  assert(/this\.tomaDelRemate\(\{/.test(porCom), "el remate común usa la toma");
  var mega = MATCH.slice(MATCH.indexOf("  dispararConCine(mega, ej) {"), MATCH.indexOf("  texturaEscena(j, esRival, anim, frame) {"));
  assert(/this\.tomaDelRemate\(\{[^]*?especial: true/.test(mega), "el súper tiro usa la toma especial");
  /* la patada: una sola, dentro de contacto() */
  var kicks = (TOMA.replace(/\/\*[\s\S]*?\*\//g, "").match(/\.kick\(\)/g) || []).length;
  assert(kicks === 1, "la toma suena UNA patada (hay " + kicks + ")");
  assert(/var contacto = function \(\) \{\s*if \(est\.contacto\) return; est\.contacto = true;\s*snd && snd\.kick && snd\.kick\(\);/.test(TOMA),
    "y es lo primero que pasa en el contacto");
  /* las dos mallas comparten cámara (si no, la pelota proyecta 8 veces más chica) */
  assert(/plano\.setViewHeight\(th\)/.test(TOMA) && /bola\.setViewHeight\(th\)/.test(TOMA), "la pose y la pelota con la misma cámara");
  assert(!!BAL.toma && BAL.toma.ms > 0 && BAL.toma.especial_ms > BAL.toma.ms, "las perillas de la toma en balance.json");
  console.log("[5] la toma en el remate y en el súper tiro · una patada, en el contacto");
})();

/* ---------- [6] APAGADA POR PERILLA (pedido de Rodri del 17/oct) ----------
   "Las animaciones 3D rompieron el juego": la toma queda apagada con
   flags.toma_remate = false y vuelven la viñeta EL REMATE y, en el súper
   tiro, la carga y el plano del pie. Se fija que la perilla corte la toma y
   que los dos caminos de antes sigan detrás. */
(function () {
  assert(BAL.flags && BAL.flags.toma_remate === false, "balance.flags.toma_remate queda en false (pedido de Rodri del 17/oct)");
  assert(/if \(this\.FLAGS && this\.FLAGS\.toma_remate === false\) return false;/.test(TOMA), "puedeTomaDelRemate respeta la perilla");
  var rem = MATCH.slice(MATCH.indexOf("this.puedeTomaDelRemate && this.puedeTomaDelRemate()"), MATCH.indexOf("  dispararConCine(mega, ej) {"));
  assert(/this\.escenaCine\(\{\s*etiqueta: "· EL REMATE ·"[^]*?pose: "remate"/.test(rem), "sin la toma, el remate común vuelve a la viñeta EL REMATE");
  var mega = MATCH.slice(MATCH.indexOf("  dispararConCine(mega, ej) {"), MATCH.indexOf("  texturaEscena(j, esRival, anim, frame) {"));
  assert(/pose: "remate", especial: true[^]*?this\.planoPie\(\)/.test(mega), "y el súper tiro a la carga y el plano del pie");
  console.log("[6] la toma apagada por perilla · los caminos de antes siguen");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
