/* ============================================================================
   PAMPA STAR · phaser/test/_metricas.js — CUÁNTO MIDE UN TEXTO, SIN NAVEGADOR
   (ayudante de los tests, no corre solo)

   Lote L09 (legibilidad-partido). Para probar en node que un rótulo entra en
   su botón hace falta su ANCHO, y el ancho no se inventa: sale de la tabla de
   avances (hmtx) de la tipografía de verdad, la misma que baja el juego desde
   assets/fonts/. Se leen cuatro tablas del .ttf, sin dependencias:
     head  las unidades por em
     hhea  cuántos glifos traen su avance propio
     hmtx  el avance de cada glifo
     cmap  qué glifo es cada letra (formatos 4 y 12, como _cmap.js)

   La letra que la tipografía NO tiene (los emojis, ★ ⚡ 🔥…) la dibuja la
   del sistema: no hay archivo que medir, así que se cuenta ANCHA, 1,3 em.
   Contra Phaser en el navegador de la compu (15/oct, 13 px): "🌠 MEGACORRIDA"
   130 acá y 130 allá, "🌟 GAMBETA-TIRO (quedan 2)" 212,6 y 213, "300 aguante ·
   los dejás atrás" 193,5 y 190, "👁👁👁 te la vieron toda" 163 y 149. O sea
   que esto mide igual o un poco de más, que es el lado seguro.

   OJO, MEDIDO EN EL NAVEGADOR (13/oct): index.html (V8 F) quiere que todo
   texto nazca con el aire de las mayúsculas (piel.tracking_mayus), el
   interletrado (tipografia.letras) y la sombra de PF, re-registrando la
   fábrica `text` de Phaser. Pero GameObjectFactory.register NO pisa un
   nombre que ya existe: la fábrica que corre es la de Phaser, y un texto
   del juego nace con letterSpacing 0 y sombra 0 ("🏆 MODO MASTER": 181 px,
   sin aire). Así que se mide lo que se VE.

     var M = require("./_metricas.js");
     M.ancho("➡ PASE", { fuente: "display", px: 13 })   → px lógicos
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var BAL = JSON.parse(fs.readFileSync(path.join(RAIZ, "phaser/data/balance.json"), "utf8"));

var ARCHIVOS = {
  "Archivo Black": "assets/fonts/ArchivoBlack-Regular.ttf",
  "Pixelify Sans": "assets/fonts/PixelifySans-Regular.ttf",
  "VT323": "assets/fonts/VT323-Regular.ttf",
  "Press Start 2P": "assets/fonts/PressStart2P-Regular.ttf"
};
var EM_AJENA = 1.3;   // una letra que la tipografía no trae (la dibuja la del sistema)

var _cache = {};
function tabla(b, tag) {
  var n = b.readUInt16BE(4);
  for (var i = 0; i < n; i++) {
    var r = 12 + i * 16;
    if (b.toString("latin1", r, r + 4) === tag) return b.readUInt32BE(r + 8);
  }
  return -1;
}
function cargar(nombre) {
  if (_cache[nombre]) return _cache[nombre];
  var b = fs.readFileSync(path.join(RAIZ, ARCHIVOS[nombre]));
  var head = tabla(b, "head"), hhea = tabla(b, "hhea"), hmtx = tabla(b, "hmtx"), cmap = tabla(b, "cmap");
  var upem = b.readUInt16BE(head + 18);
  var nMet = b.readUInt16BE(hhea + 34);
  var avance = function (g) {
    var k = Math.min(g, nMet - 1);
    return b.readUInt16BE(hmtx + k * 4);
  };
  var glifo = {};
  var nSub = b.readUInt16BE(cmap + 2);
  for (var s = 0; s < nSub; s++) {
    var plat = b.readUInt16BE(cmap + 4 + s * 8), enc = b.readUInt16BE(cmap + 6 + s * 8);
    var off = cmap + b.readUInt32BE(cmap + 8 + s * 8), fmt = b.readUInt16BE(off);
    if (!(plat === 0 || (plat === 3 && (enc === 1 || enc === 10)))) continue;
    if (fmt === 4) {
      var seg = b.readUInt16BE(off + 6) / 2, fin = off + 14, ini = fin + seg * 2 + 2,
        delta = ini + seg * 2, rango = delta + seg * 2;
      for (var k = 0; k < seg; k++) {
        var f = b.readUInt16BE(fin + k * 2), a = b.readUInt16BE(ini + k * 2),
          d = b.readInt16BE(delta + k * 2), ro = b.readUInt16BE(rango + k * 2);
        for (var c = a; c <= f && c !== 0xffff; c++) {
          var g;
          if (ro === 0) g = (c + d) & 0xffff;
          else { var p = rango + k * 2 + ro + (c - a) * 2; g = b.readUInt16BE(p); if (g) g = (g + d) & 0xffff; }
          if (g && glifo[c] == null) glifo[c] = g;
        }
      }
    } else if (fmt === 12) {
      var nG = b.readUInt32BE(off + 12);
      for (var j = 0; j < nG; j++) {
        var q = off + 16 + j * 12, c0 = b.readUInt32BE(q), c1 = b.readUInt32BE(q + 4), g0 = b.readUInt32BE(q + 8);
        for (var cc = c0; cc <= c1; cc++) if (glifo[cc] == null && g0 + (cc - c0)) glifo[cc] = g0 + (cc - c0);
      }
    }
  }
  return (_cache[nombre] = { upem: upem, avance: avance, glifo: glifo });
}
/* "'Archivo Black','Pixelify Sans',sans-serif" → ["Archivo Black", "Pixelify Sans"] */
function pila(familia) {
  return String(familia || "").split(",").map(function (x) { return x.trim().replace(/^'|'$/g, "").replace(/^"|"$/g, ""); })
    .filter(function (x) { return ARCHIVOS[x]; });
}
var TP = BAL.tipografia || {};
var FAMILIA = { display: TP.display || "'Archivo Black'", texto: TP.texto || "'Pixelify Sans'" };

/* el ancho de UNA línea, en px lógicos, como lo arma el juego */
function ancho(texto, o) {
  o = o || {};
  var px = o.px || 13;
  var fams = pila(FAMILIA[o.fuente || "texto"] || o.fuente);
  var fuentes = fams.map(cargar);
  var letras = Array.from(String(texto));
  var tot = 0;
  letras.forEach(function (ch) {
    var cp = ch.codePointAt(0);
    if (cp === 0xfe0f || cp === 0x200d) return;              // selectores de emoji: no ocupan
    for (var i = 0; i < fuentes.length; i++) {
      var F = fuentes[i], g = F.glifo[cp];
      if (g != null) { tot += F.avance(g) / F.upem * px; return; }
    }
    tot += EM_AJENA * px;
  });
  return tot;
}
/* las letras que ninguna tipografía de la pila trae */
function ajenas(texto, fuente) {
  var fuentes = pila(FAMILIA[fuente || "texto"] || fuente).map(cargar), out = [];
  Array.from(String(texto)).forEach(function (ch) {
    var cp = ch.codePointAt(0);
    if (cp === 32 || cp === 10 || cp === 0xfe0f) return;
    if (!fuentes.some(function (F) { return F.glifo[cp] != null; })) out.push(ch);
  });
  return out;
}
module.exports = { ancho: ancho, ajenas: ajenas, EM_AJENA: EM_AJENA, FAMILIA: FAMILIA };
