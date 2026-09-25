/* ============================================================================
   PAMPA STAR · VESTIR CON NUESTRA CAMISETA (logic/vestir.js)

   Las poses de bloqueo y barrida solo existen con el kit del rival. Cuando
   las usa uno de los tuyos, se visten en tiempo de ejecución: la tela pasa a
   celeste, las rayas (la marca no-cromática del rival) se borran, y la piel
   —casi del mismo naranja— queda intacta.

   Se prueba con una imagen SINTÉTICA que reproduce la trampa real:
     · una "camiseta" naranja saturada (hue ~20°) con rayas negras anchas,
       encerrada por una línea de tinta;
     · al lado, una "piel" naranja menos saturada (hue ~24°) con su SOMBRA,
       tan saturada como la tela — sin línea de tinta entre luz y sombra,
       como en un cel de verdad;
     · y las líneas de tinta finas, que no se tocan.

   Y se vigila que los seis lugares donde un jugador tuyo usa esas poses
   pidan la versión vestida.

   Corré:  node phaser/test/vestir.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var V = require(path.join(RAIZ, "phaser/logic/vestir.js"));
function leer(p) { try { return fs.readFileSync(path.join(RAIZ, p), "utf8"); } catch (e) { return ""; } }
var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* ---------- la imagen sintética ---------- */
var W = 160, H = 100;
function imagen() {
  var d = new Uint8ClampedArray(W * H * 4);
  function px(x, y, c, a) { var i = (y * W + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = a == null ? 255 : a; }
  var TINTA = [20, 16, 14], TELA = [252, 132, 76], TELA_SOMBRA = [214, 100, 50], RAYA = [26, 24, 22];
  var PIEL = [252, 180, 130], PIEL_SOMBRA = [220, 118, 70];
  for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) px(x, y, [0, 0, 0], 0);
  /* camiseta: x 10..89, y 10..89, contorno de tinta de 2 px */
  for (y = 10; y < 90; y++) for (x = 10; x < 90; x++) {
    var borde = x < 12 || x > 87 || y < 12 || y > 87;
    if (borde) { px(x, y, TINTA); continue; }
    var enRaya = ((x - 12) % 24) >= 14;                        // rayas de 10 px cada 24
    px(x, y, enRaya ? RAYA : (y > 60 ? TELA_SOMBRA : TELA));
  }
  /* una línea de pliegue fina (2 px) adentro de la tela: es tinta, se respeta */
  for (y = 30; y < 50; y++) { px(15, y, TINTA); px(16, y, TINTA); }
  /* piel: x 100..149, luz arriba y SOMBRA abajo, sin tinta entre las dos */
  for (y = 10; y < 90; y++) for (x = 100; x < 150; x++) {
    var bordeP = x < 102 || x > 147 || y < 12 || y > 87;
    px(x, y, bordeP ? TINTA : (y > 55 ? PIEL_SOMBRA : PIEL));
  }
  return d;
}
function en(d, x, y) { var i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2]]; }
function esCeleste(c) { return c[2] > c[0] + 40 && c[2] > 150; }
function esNaranja(c) { return c[0] > c[2] + 60; }

(function () {
  var d = imagen(), antes = imagen();
  var r = V.vestir(d, W, H, { destino: "#4fc3f7", rayaMaxFrac: 0.1 });
  assert(r.tela > 0, "encontró tela (" + r.tela + " px)");
  /* la tela pasó a celeste, la clara y la de sombra */
  assert(esCeleste(en(d, 20, 20)), "la tela clara pasó a celeste: " + en(d, 20, 20));
  assert(esCeleste(en(d, 20, 70)), "la tela en sombra pasó a celeste: " + en(d, 20, 70));
  /* y conserva la luz: la sombra sigue siendo más oscura que la luz */
  var l = function (c) { return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]; };
  assert(l(en(d, 20, 70)) < l(en(d, 20, 20)) - 10, "la sombra del dibujo sobrevive al teñido");
  /* las rayas se borraron: el centro de una raya ya no es oscuro, es tela */
  var raya = en(d, 31, 40);
  assert(l(en(antes, 31, 40)) < 40, "(la imagen tiene una raya en x=31)");
  assert(esCeleste(raya), "la raya se rellenó con tela celeste: " + raya);
  assert(r.rayas > 0, "hubo píxeles de raya rellenados (" + r.rayas + ")");
  /* la piel NO se tocó: ni la luz ni la sombra (que es tan saturada como la tela) */
  assert(esNaranja(en(d, 120, 30)) && en(d, 120, 30).join() === en(antes, 120, 30).join(), "la piel clara quedó intacta");
  assert(en(d, 120, 70).join() === en(antes, 120, 70).join(), "la SOMBRA de la piel quedó intacta (es el caso que un teñido por color arruina)");
  /* la tinta se respeta: el contorno y el pliegue fino */
  assert(en(d, 10, 50).join() === en(antes, 10, 50).join(), "el contorno de tinta quedó intacto");
  assert(l(en(d, 15, 40)) < 40, "el pliegue fino de 2 px (tinta) NO se tomó por raya");
  console.log("[1] imagen sintética: tela celeste con su luz, rayas borradas, piel y tinta intactas");
})();

/* ---------- sin naranja no hace nada ---------- */
(function () {
  var d = new Uint8ClampedArray(20 * 20 * 4);
  for (var i = 0; i < d.length; i += 4) { d[i] = 80; d[i + 1] = 180; d[i + 2] = 240; d[i + 3] = 255; }
  var copia = d.slice();
  var r = V.vestir(d, 20, 20, {});
  assert(r.tela === 0 && d.every(function (v, k) { return v === copia[k]; }), "una pose que ya es celeste queda igual");
  console.log("[2] sin kit rival, no toca nada");
})();

/* ---------- los datos y los seis lugares ---------- */
(function () {
  var man = JSON.parse(leer("data/poses_manifest.json"));
  assert(man.poses.bloqueo && man.poses.bloqueo.kit === "rival", "el manifiesto marca bloqueo como kit rival");
  assert(man.poses.barrida && man.poses.barrida.kit === "rival", "el manifiesto marca barrida como kit rival");
  var m = leer("phaser/scenes/match.js"), e = leer("phaser/scenes/escenas_v9.js"), d = leer("phaser/scenes/definicion_ui.js"), j = leer("phaser/scenes/jugadon_ui.js"), c = leer("phaser/scenes/cine_arte.js");
  assert(/poseDelEquipo\(id, j\)/.test(c) && /def\.kit !== "rival"/.test(c), "cine_arte: poseDelEquipo viste solo las poses de kit rival");
  var esc = m.slice(m.indexOf("escenaCine(cfg) {"), m.indexOf("cerrarEscena(alFinal) {"));
  assert(/!cfg\.prota\.esRival[^\n]*poseDelEquipo\(poseId, cfg\.prota\.j\)/.test(esc), "la viñeta viste al protagonista tuyo");
  assert(/!cfg\.rival\.esRival && this\.poseDelEquipo/.test(m), "la viñeta viste al antagonista tuyo");
  assert(/poseTramite\(id,[^\n]*mia\)/.test(m), "el trámite del panel viste tu quite");
  assert(/this\.poseDelEquipo \? \(this\.poseDelEquipo\(poseId, j\) \|\| k\) : k/.test(e), "las escenas V9 visten a tus defensores");
  assert(/poseId \+ "_celeste"/.test(e), "las escenas V9 ponen a TU arquero con sus poses celestes");
  assert(/bandoTeatro/.test(d) && /bandoRev/.test(d), "la Definición dice de qué bando es cada cuerpo");
  assert(/poseDelEquipo\("bloqueo", st\.mios\[st\.ctrl\]\)/.test(j), "el súper quite del jugadón te viste a vos");
  var idx = leer("phaser/index.html");
  assert(idx.indexOf('src="logic/vestir.js"') >= 0, "index.html carga logic/vestir.js");
  console.log("[3] manifiesto marcado y los seis lugares piden la pose vestida");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
