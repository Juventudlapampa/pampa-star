/* ============================================================================
   PAMPA STAR · phaser/test/_cmap.js — QUÉ LETRAS TIENE UNA TIPOGRAFÍA
   (ayudante de los tests, no corre solo)

   Revisión del lote L08c. La decisión del estudio de diseño (13/oct) es que
   ninguna información viaje en glifos que no están en las tipografías del
   juego: el navegador los pide a otra tipografía del sistema y salen
   distintos en cada teléfono (o no salen). "(⋮)" en los pasos del menú de
   INSTALAR salía como "(:)" en Pixelify Sans: U+22EE no está en su tabla.
   Esto lee la tabla de caracteres (cmap) del .ttf de verdad, sin
   dependencias: los subtablas de formato 4 (el plano básico) y 12 (todo
   Unicode), las dos que traen las tipografías de assets/fonts/.

     var C = require("./_cmap.js");
     C.letras("assets/fonts/PixelifySans-Regular.ttf")   → Set de códigos
     C.faltan(texto, set)                                → ["⋮ U+22EE", …]
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");

function letras(ruta) {
  var b = fs.readFileSync(path.isAbsolute(ruta) ? ruta : path.join(RAIZ, ruta));
  var nTablas = b.readUInt16BE(4), cmap = -1;
  for (var i = 0; i < nTablas; i++) {
    var r = 12 + i * 16;
    if (b.toString("latin1", r, r + 4) === "cmap") { cmap = b.readUInt32BE(r + 8); break; }
  }
  if (cmap < 0) throw new Error(ruta + ": sin tabla cmap");
  var set = new Set(), nSub = b.readUInt16BE(cmap + 2);
  for (var s = 0; s < nSub; s++) {
    var plat = b.readUInt16BE(cmap + 4 + s * 8), enc = b.readUInt16BE(cmap + 6 + s * 8);
    var off = cmap + b.readUInt32BE(cmap + 8 + s * 8), fmt = b.readUInt16BE(off);
    /* solo las de Unicode (plataforma 0, o 3 con codificación 1 o 10) */
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
          else {
            var p = rango + k * 2 + ro + (c - a) * 2;
            g = b.readUInt16BE(p); if (g) g = (g + d) & 0xffff;
          }
          if (g) set.add(c);
        }
      }
    } else if (fmt === 12) {
      var nG = b.readUInt32BE(off + 12);
      for (var j = 0; j < nG; j++) {
        var q = off + 16 + j * 12, c0 = b.readUInt32BE(q), c1 = b.readUInt32BE(q + 4), g0 = b.readUInt32BE(q + 8);
        for (var cc = c0; cc <= c1; cc++) if (g0 + (cc - c0)) set.add(cc);
      }
    }
  }
  return set;
}

/* los caracteres del texto que la tipografía no tiene (espacios aparte:
   el salto de línea no se dibuja) */
function faltan(texto, set) {
  var out = [];
  Array.from(String(texto)).forEach(function (ch) {
    var cp = ch.codePointAt(0);
    if (cp === 10 || cp === 13) return;
    if (!set.has(cp)) {
      var e = ch + " U+" + cp.toString(16).toUpperCase();
      if (out.indexOf(e) < 0) out.push(e);
    }
  });
  return out;
}

module.exports = { letras: letras, faltan: faltan };
