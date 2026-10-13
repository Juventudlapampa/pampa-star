/* ============================================================================
   PAMPA STAR · phaser/test/_png.js — LEER Y ESCRIBIR PNG EN NODE (ayudante)

   No es un test (no termina en .test.js). Lo usa metadatos.test.js para
   medir los íconos de la PWA y para generar icon-512-maskable.png.

   Por qué a mano y no con una librería: el repo no tiene dependencias (los
   tests corren con node pelado) y para un ícono alcanza con lo justo: PNG
   de 8 bits por canal, sin entrelazado, en RGBA (tipo 6) o RGB (tipo 2), que
   es lo que son icon-192.png e icon-512.png (medido en su cabecera IHDR).
   zlib viene con node.
   ========================================================================== */
"use strict";
var zlib = require("zlib");

var FIRMA = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/* CRC32 de la especificación PNG (el de zlib no está expuesto en node 22 sin
   tocar internals, y son diez líneas) */
var TABLA = (function () {
  var t = new Uint32Array(256);
  for (var n = 0; n < 256; n++) {
    var c = n;
    for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  var c = 0xffffffff;
  for (var i = 0; i < buf.length; i++) c = TABLA[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* → { ancho, alto, datos: Uint8Array RGBA (4 bytes por píxel) } */
function leer(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 33 || !buf.slice(0, 8).equals(FIRMA)) throw new Error("no es un PNG");
  var p = 8, ihdr = null, idat = [];
  while (p < buf.length) {
    var largo = buf.readUInt32BE(p), tipo = buf.toString("latin1", p + 4, p + 8), d = buf.slice(p + 8, p + 8 + largo);
    if (tipo === "IHDR") ihdr = { ancho: d.readUInt32BE(0), alto: d.readUInt32BE(4), bits: d[8], color: d[9], entrelazado: d[12] };
    else if (tipo === "IDAT") idat.push(d);
    else if (tipo === "IEND") break;
    p += 12 + largo;
  }
  if (!ihdr) throw new Error("PNG sin IHDR");
  if (ihdr.bits !== 8 || (ihdr.color !== 6 && ihdr.color !== 2) || ihdr.entrelazado) {
    throw new Error("PNG no soportado: bits " + ihdr.bits + ", color " + ihdr.color + ", entrelazado " + ihdr.entrelazado);
  }
  var cpp = ihdr.color === 6 ? 4 : 3, W = ihdr.ancho, H = ihdr.alto, fila = W * cpp;
  var crudo = zlib.inflateSync(Buffer.concat(idat));
  var px = new Uint8Array(fila * H), prev = new Uint8Array(fila);
  for (var y = 0; y < H; y++) {
    var f = crudo[y * (fila + 1)], o = y * (fila + 1) + 1, cur = px.subarray(y * fila, (y + 1) * fila);
    for (var x = 0; x < fila; x++) {
      var a = x >= cpp ? cur[x - cpp] : 0, b = prev[x], c = x >= cpp ? prev[x - cpp] : 0, v = crudo[o + x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { var pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[x] = v & 0xff;
    }
    prev = cur;
  }
  var rgba = new Uint8Array(W * H * 4);
  for (var i = 0, j = 0; i < W * H; i++, j += cpp) {
    rgba[i * 4] = px[j]; rgba[i * 4 + 1] = px[j + 1]; rgba[i * 4 + 2] = px[j + 2]; rgba[i * 4 + 3] = cpp === 4 ? px[j + 3] : 255;
  }
  return { ancho: W, alto: H, datos: rgba };
}

function bloque(tipo, datos) {
  var l = Buffer.alloc(4); l.writeUInt32BE(datos.length, 0);
  var td = Buffer.concat([Buffer.from(tipo, "latin1"), datos]);
  var c = Buffer.alloc(4); c.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([l, td, c]);
}

/* RGBA → PNG (filtro "sub" en cada fila: para un ícono de colores planos
   comprime mucho mejor que sin filtro) */
function escribir(img) {
  var W = img.ancho, H = img.alto, fila = W * 4, d = img.datos;
  var crudo = Buffer.alloc((fila + 1) * H);
  for (var y = 0; y < H; y++) {
    var o = y * (fila + 1);
    crudo[o] = 1;
    for (var x = 0; x < fila; x++) {
      var v = d[y * fila + x], a = x >= 4 ? d[y * fila + x - 4] : 0;
      crudo[o + 1 + x] = (v - a) & 0xff;
    }
  }
  var ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([FIRMA, bloque("IHDR", ihdr), bloque("IDAT", zlib.deflateSync(crudo, { level: 9 })), bloque("IEND", Buffer.alloc(0))]);
}

/* el píxel (x, y) como [r, g, b, a] */
function pixel(img, x, y) {
  var i = (y * img.ancho + x) * 4;
  return [img.datos[i], img.datos[i + 1], img.datos[i + 2], img.datos[i + 3]];
}

module.exports = { leer: leer, escribir: escribir, pixel: pixel, crc32: crc32 };
