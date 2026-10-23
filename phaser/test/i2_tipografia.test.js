/* ============================================================================
   PAMPA STAR · I2 — LAS DOS CANDIDATAS

   Press Start 2P quedó descartada: rompe la maqueta en dos lugares (el
   marcador con un rival de nombre largo ocupa casi todo el ancho, y
   "GAMBETA-TIRO (quedan 2)" se parte en dos renglones y se sale de su carta).
   Se vio en la captura P9_C_press_start.png.

   Quedan dos, las dos cableadas, y se cambian pegando un par en balance. Este
   test guarda las tres condiciones que hacen que eso sea cierto:
     1. la puesta es una de las dos candidatas
     2. las familias que se nombran existen como archivo y como @font-face
     3. Press Start 2P no volvió a ser candidata

   Corré:  node phaser/test/i2_tipografia.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var BAL = JSON.parse(fs.readFileSync(path.join(RAIZ, "phaser/data/balance.json"), "utf8"));
var HTML = fs.readFileSync(path.join(RAIZ, "phaser/index.html"), "utf8");
var T = BAL.tipografia || {};

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* ---------- [1] LA QUE ESTÁ PUESTA ---------- */
(function () {
  assert(typeof T.display === "string" && T.display.length > 0, "tiene que haber una familia de display puesta");
  assert(typeof T.texto === "string" && T.texto.length > 0, "y una de texto");
  var A = T.display.indexOf("Archivo Black") >= 0;
  var B = T.display.indexOf("Bowlby One") >= 0;
  assert(A || B, "la puesta tiene que ser una de las DOS candidatas (dio: " + T.display + ")");
  assert(typeof T._PUESTA === "string" && T._PUESTA.length > 10,
    "y tiene que estar escrito CUÁL está puesta, para que se pueda cambiar sin preguntar");
  console.log("[1] puesta: " + (A ? "A · Archivo Black" : "B · Bowlby One") + " + " + T.texto.split(",")[0]);
})();

/* ---------- [2] LAS DOS ESTÁN CABLEADAS DE VERDAD ---------- */
(function () {
  /* "cableada" no es que esté nombrada en un comentario: es que el archivo
     exista y que index.html la declare con @font-face. Si falta cualquiera de
     las dos cosas, pegar el par en balance no alcanza. */
  [["Archivo Black", "ArchivoBlack-Regular.ttf"],
   ["Bowlby One", "BowlbyOne-Regular.ttf"],
   ["Pixelify Sans", "PixelifySans-Regular.ttf"],
   ["VT323", "VT323-Regular.ttf"]].forEach(function (par) {
    assert(fs.existsSync(path.join(RAIZ, "assets/fonts", par[1])),
      "falta el archivo assets/fonts/" + par[1]);
    assert(HTML.indexOf("font-family:'" + par[0] + "'") >= 0,
      "index.html tiene que declarar @font-face para '" + par[0] + "'");
  });
  assert(typeof T._LAS_DOS_CANDIDATAS === "string" && T._LAS_DOS_CANDIDATAS.indexOf("Bowlby One") >= 0,
    "el par exacto de la otra candidata tiene que estar escrito para copiar y pegar");
  console.log("[2] las 4 familias de las dos candidatas: archivo + @font-face, las cuatro");
})();

/* ---------- [3] PRESS START 2P NO VOLVIÓ ---------- */
(function () {
  assert(T.display.indexOf("Press Start") < 0,
    "Press Start 2P no puede ser el display: rompe el marcador y la carta de GAMBETA-TIRO");
  assert(T.texto.indexOf("Press Start") < 0, "ni el cuerpo");
  assert(typeof T._DESCARTADA === "string" && /press start/i.test(T._DESCARTADA),
    "y tiene que quedar escrito POR QUÉ se descartó, o dentro de tres meses se vuelve a probar");
  /* la fuente sigue existiendo porque la usa el fallback de window.PF: que no
     sea candidata no es lo mismo que borrarla */
  assert(fs.existsSync(path.join(RAIZ, "assets/fonts/PressStart2P-Regular.ttf")),
    "el archivo sigue estando (lo usa el fallback de PF); lo que se descartó es que sea candidata");
  console.log("[3] Press Start 2P fuera de las candidatas, con el motivo escrito");
})();

/* ---------- [4] LA CARGA ESPERA A LA FAMILIA DE DISPLAY (ola 3) ----------
   index.html esperaba a Press Start 2P (descartada) y no a Archivo Black: con
   red lenta, el marcador salía con la de reserva. Las familias que se esperan
   salen de balance.tipografia. */
(function () {
  var i = HTML.indexOf("const pFuentes"), bloque = i >= 0 ? HTML.slice(i, i + 600) : "";
  assert(i >= 0, "index.html tiene la espera de las fuentes (pFuentes)");
  assert(/tipografia/.test(bloque) && /pBal/.test(bloque), "pFuentes espera a las familias de balance.tipografia, después de leer el balance");
  assert(bloque.indexOf("Press Start") < 0, "pFuentes no nombra a Press Start 2P");
  var m = HTML.match(/const familiasDe = (T => [^\n]+\n[^\n]+);/);
  assert(!!m, "familiasDe saca las familias de display y texto");
  if (m) {
    var fam = new Function("return (" + m[1] + ")")()(T);
    assert(fam.indexOf(T.display.split(",")[0].trim().replace(/'/g, "")) >= 0 && fam.indexOf("VT323") >= 0 && fam.indexOf("monospace") < 0,
      "con el balance de hoy espera a " + T.display.split(",")[0] + " y VT323, sin las genéricas (" + fam.join(", ") + ")");
  }
  console.log("[4] la carga espera a las familias del balance");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
