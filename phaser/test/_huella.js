/* ============================================================================
   PAMPA STAR · phaser/test/_huella.js — LA HUELLA DE LOS ASSETS (ayudante)

   No es un test (no termina en .test.js): lo usan sw_precache.test.js, que
   genera y controla ASSETS_HUELLA de phaser/sw.js, y cache_versiones.test.js.

   POR QUÉ HUELLA Y NO "ACORDARSE DE SUBIR LA VERSIÓN": de los 16 commits que
   tocaron assets/ desde el 17/jul, 13 no tocaron sw.js (lo midió la
   auditoría). Entre ellos d6c88ae, el fondo del menú que tenía el logo de una
   marca: quien ya tenía ese archivo en caché lo siguió viendo hasta el
   siguiente cambio de versión. Ahora cada asset lleva en sw.js su tamaño y un
   pedazo de su SHA-256; si el archivo cambia y sw.js no, la suite se pone en
   rojo, y el service worker vuelve a bajar SOLO ese archivo.

   QUÉ ENTRA: todo lo que está debajo de assets/ (menos assets/_fuente/, que
   es material crudo que el juego no pide, y los .md), el motor
   (phaser/vendor/*.js) y los íconos de la PWA (tres desde L08: el maskable). Todo eso cambia muy de vez
   en cuando y pesa: 14,1 MB de assets servidos + 1,2 MB de motor (medido con
   du sobre git ls-files).

   FORMATO: "tamaño-hash12", con el hash = los primeros 12 caracteres
   hexadecimales del SHA-256 del archivo. El service worker calcula lo mismo
   con crypto.subtle cuando rescata un asset de una caché vieja, así que tiene
   que ser exactamente este algoritmo.
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path"), crypto = require("crypto");

var RAIZ = path.join(__dirname, "..", "..");
var LARGO_HASH = 12;

function huellaDeBuffer(buf) {
  return buf.length + "-" + crypto.createHash("sha256").update(buf).digest("hex").slice(0, LARGO_HASH);
}
function huellaArchivo(ruta) { return huellaDeBuffer(fs.readFileSync(ruta)); }

/* las rutas relativas a la raíz del repo, con barras normales, ordenadas */
function listarAssets(raiz) {
  raiz = raiz || RAIZ;
  var out = [];
  function andar(dir) {
    fs.readdirSync(path.join(raiz, dir)).forEach(function (n) {
      var rel = dir + "/" + n;
      var st = fs.statSync(path.join(raiz, rel));
      if (st.isDirectory()) { if (rel !== "assets/_fuente") andar(rel); return; }
      if (/\.md$/i.test(n)) return;
      out.push(rel);
    });
  }
  andar("assets");
  fs.readdirSync(path.join(raiz, "phaser/vendor")).forEach(function (n) {
    if (/\.js$/.test(n)) out.push("phaser/vendor/" + n);
  });
  fs.readdirSync(path.join(raiz, "phaser")).forEach(function (n) {
    /* L08: también icon-512-maskable.png (el ícono que recortan los
       lanzadores de Android): cambia tan poco como los otros dos */
    if (/^icon-\d+(-maskable)?\.png$/.test(n)) out.push("phaser/" + n);
  });
  return out.sort();
}

function calcularHuella(raiz) {
  raiz = raiz || RAIZ;
  var h = {};
  listarAssets(raiz).forEach(function (r) { h[r] = huellaArchivo(path.join(raiz, r)); });
  return h;
}

/* el bloque de texto tal cual va en sw.js */
function bloqueHuella(h) {
  var ks = Object.keys(h).sort();
  return "const ASSETS_HUELLA = {\n" + ks.map(function (k, i) {
    return "  " + JSON.stringify(k) + ": " + JSON.stringify(h[k]) + (i < ks.length - 1 ? "," : "");
  }).join("\n") + "\n};";
}

var RE_BLOQUE = /const ASSETS_HUELLA = \{[\s\S]*?\n\};/;

/* lee ASSETS_HUELLA del texto de sw.js sin ejecutarlo */
function leerHuella(swTexto) {
  var m = swTexto.match(RE_BLOQUE);
  if (!m) return null;
  try { return JSON.parse(m[0].replace(/^const ASSETS_HUELLA = /, "").replace(/;$/, "")); }
  catch (e) { return null; }
}

function escribirHuella(swRuta, h) {
  var txt = fs.readFileSync(swRuta, "utf8");
  if (!RE_BLOQUE.test(txt)) throw new Error("sw.js no tiene el bloque const ASSETS_HUELLA = {...};");
  fs.writeFileSync(swRuta, txt.replace(RE_BLOQUE, bloqueHuella(h)));
}

/* qué cambió entre lo que dice sw.js y lo que hay en disco */
function diferencias(enSw, enDisco) {
  var d = { nuevos: [], cambiados: [], sobran: [] };
  Object.keys(enDisco).forEach(function (k) {
    if (!(k in enSw)) d.nuevos.push(k);
    else if (enSw[k] !== enDisco[k]) d.cambiados.push(k);
  });
  Object.keys(enSw).forEach(function (k) { if (!(k in enDisco)) d.sobran.push(k); });
  return d;
}

module.exports = {
  RAIZ: RAIZ, LARGO_HASH: LARGO_HASH, huellaDeBuffer: huellaDeBuffer, huellaArchivo: huellaArchivo,
  listarAssets: listarAssets, calcularHuella: calcularHuella, bloqueHuella: bloqueHuella,
  leerHuella: leerHuella, escribirHuella: escribirHuella, diferencias: diferencias
};
