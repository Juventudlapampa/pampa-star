/* ============================================================================
   PAMPA STAR · LAS TRANSICIONES

   Los cambios de pantalla eran cortes de UN CUADRO: un cuadro estabas en el
   editor y al siguiente en la cancha. El juego entero está hecho de momentos
   que respiran —el hitstop antes del desenlace, el freeze con silencio, la
   cámara que empuja mientras decidís— y entre pantallas no había nada.

   Un fundido y nada más. Sin wipes ni deslizados: el proyecto ya decidió que
   la épica se hace con la pose quieta y el corte seco DENTRO del momento, así
   que entre pantallas corresponde lo sobrio.

   Y DOS BUGS QUE TUVO ESTA MISMA TANDA, porque los dos son de manual:

   1. add.rectangle(x, y, w, h, color, alpha) fija el alpha del RELLENO, no el
      del objeto. La primera versión creaba el velo con relleno 0 y le tweeneaba
      `.alpha` de 1 a 1: el fundido no se veía NUNCA y la transición era el mismo
      corte seco, con 200 ms de demora. Andaba lo suficiente como para parecer
      que andaba.
   2. `_yendo` no se limpiaba en create(). Phaser REUSA la instancia de la
      escena, así que una transición cortada por el medio lo dejaba en true y
      desde ahí irA() devolvía false para siempre: la pantalla quedaba sin poder
      salir. Es la lección de P1, otra vez.

   Corré:  node phaser/test/transiciones.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
function leer(p) { try { return fs.readFileSync(path.join(RAIZ, p), "utf8"); } catch (e) { return ""; } }
function sinComentarios(s) {
  var out = "", i = 0, n = s.length, j;
  while (i < n) {
    if (s[i] === "/" && s[i + 1] === "*") { j = s.indexOf("*/", i + 2); i = j < 0 ? n : j + 2; continue; }
    if (s[i] === "/" && s[i + 1] === "/") { j = s.indexOf("\n", i); i = j < 0 ? n : j; continue; }
    out += s[i++];
  }
  return out;
}

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

var PIEL = leer("phaser/scenes/piel_ui.js");
var bal = JSON.parse(leer("phaser/data/balance.json"));
var ESCENAS = ["editor", "intro", "master", "match"];

/* ---------- [1] NINGUNA PANTALLA CAMBIA DE GOLPE ---------- */
(function () {
  var sueltos = [];
  ESCENAS.forEach(function (e) {
    var cod = sinComentarios(leer("phaser/scenes/" + e + ".js"));
    var n = (cod.match(/this\.scene\.start\(/g) || []).length;
    if (n) sueltos.push(e + ".js (" + n + ")");
  });
  assert(sueltos.length === 0,
    "estos cambian de pantalla sin fundido: " + sueltos.join(", ") + ". Tienen que pasar por irA().");
  var conIrA = 0;
  ESCENAS.forEach(function (e) { conIrA += (sinComentarios(leer("phaser/scenes/" + e + ".js")).match(/this\.irA\(/g) || []).length; });
  assert(conIrA >= 12, "tienen que estar los doce cambios de escena con fundido (hay " + conIrA + ")");
  /* el único scene.start legítimo vive adentro de irA */
  var dentro = (sinComentarios(PIEL).match(/scene\.start\(/g) || []).length;
  assert(dentro === 1, "el único scene.start() del proyecto tiene que ser el de adentro de irA() (hay " + dentro + ")");
  console.log("[1] " + conIrA + " cambios de pantalla con fundido · 0 cortes secos");
})();

/* ---------- [2] LOS DOS LADOS DEL FUNDIDO ---------- */
(function () {
  assert(/irA: function/.test(PIEL), "tiene que existir la salida");
  assert(/entrarDesdeNegro: function/.test(PIEL), "y la entrada");
  ESCENAS.forEach(function (e) {
    var cod = leer("phaser/scenes/" + e + ".js");
    assert(/this\.entrarDesdeNegro\(\)/.test(cod), e + ".js tiene que abrir desde negro, o se ve el salto al entrar");
  });
  /* y la escena nueva arranca DESPUÉS del fundido, no antes */
  var cuerpo = PIEL.slice(PIEL.indexOf("irA: function"), PIEL.indexOf("entrarDesdeNegro"));
  assert(/onComplete[\s\S]{0,120}scene\.start/.test(cuerpo),
    "scene.start tiene que ir en el onComplete del tween: si va antes, el fundido no se ve");
  console.log("[2] las " + ESCENAS.length + " escenas abren desde negro y la nueva arranca al terminar el fundido");
})();

/* ---------- [3] EL BUG DEL SEXTO ARGUMENTO ---------- */
(function () {
  /* add.rectangle(x,y,w,h,color,alpha) fija el alpha del RELLENO. Si el velo se
     crea con relleno variable y se tweenea `.alpha`, el fundido no se ve. */
  var velo = PIEL.slice(PIEL.indexOf("veloDeTransicion: function"), PIEL.indexOf("irA: function"));
  assert(/add\.rectangle\([^)]*,\s*1\)/.test(sinComentarios(velo)),
    "el relleno del velo tiene que ir OPACO (el sexto argumento en 1)");
  assert(/setAlpha\(alpha\)/.test(velo),
    "y el que se mueve tiene que ser el alpha del OBJETO, que es lo que el tween toca");
  console.log("[3] relleno opaco + alpha del objeto · el fundido se ve de verdad");
})();

/* ---------- [4] LA LECCIÓN DE P1 ---------- */
(function () {
  var entrada = PIEL.slice(PIEL.indexOf("entrarDesdeNegro: function"));
  assert(/this\._yendo = false/.test(entrada),
    "_yendo tiene que limpiarse en la entrada: Phaser reusa la instancia y una transición cortada " +
    "por el medio deja la pantalla sin poder salir");
  /* y la guarda tiene que existir, o dos toques encadenan dos scene.start */
  assert(/if \(this\._yendo\) return false/.test(PIEL), "dos toques rápidos no pueden encadenar dos transiciones");
  console.log("[4] _yendo se limpia en cada create y frena el doble toque");
})();

/* ---------- [5] EL VELO CUBRE AUNQUE LA CÁMARA SE MUEVA ---------- */
(function () {
  /* la cancha tiene cámara con zoom y scroll: un rectángulo "de pantalla" atado
     al mundo se corre y deja un borde sin tapar */
  assert(/setScrollFactor\(0\)/.test(PIEL), "el velo tiene que ser fijo a la pantalla");
  assert(/2400, 1600/.test(PIEL), "y medir de más, para cubrir con zoom");
  assert(/setDepth\(99999\)/.test(PIEL), "y estar por encima de todo");
  console.log("[5] fijo, sobredimensionado y por encima de todo");
})();

/* ---------- [6] LAS PERILLAS ESTÁN Y SE USAN ---------- */
(function () {
  var T = bal.piel && bal.piel.transicion;
  assert(T, "tiene que existir balance.piel.transicion");
  assert(T.salida_ms > 0 && T.entrada_ms > 0, "con sus dos tiempos");
  assert(T.color != null, "y su color");
  assert(typeof bal.piel._transicion_nota === "string" && bal.piel._transicion_nota.indexOf("440") >= 0,
    "la nota tiene que decir lo que se siente (la suma de los dos tiempos)");
  assert(T.salida_ms + T.entrada_ms === 440, "y coincidir con el número que la nota declara");
  /* el color no es negro puro: es el fondo_borde de la paleta */
  assert(T.color === 0x060f0a, "el fundido va al color del mundo, no a negro puro");
  console.log("[6] salida " + T.salida_ms + "ms + entrada " + T.entrada_ms + "ms = " +
    (T.salida_ms + T.entrada_ms) + "ms · color 0x" + T.color.toString(16).padStart(6, "0"));
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
