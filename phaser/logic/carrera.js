/* ============================================================================
   PAMPA STAR · phaser/logic/carrera.js — EL CÓDIGO DE CARRERA
   (tanda 1.0, L03 · codigo-de-carrera)

   POR QUÉ: una carrera del Master son de 10 a 37 horas (medido en la
   auditoría) y vivía SOLO en localStorage. No había forma de exportarla ni
   de pasarla a otro teléfono (grep de exportar/importar/storage.persist: 0),
   y el respaldo de borrarCarrera está en el mismo almacenamiento. Dato de
   plataforma, no reproducido acá: Safari en iPhone borra el almacenamiento de
   un sitio que no se visita en 7 días si no está instalado como app.

   EL CÓDIGO es la carrera entera en un texto que se puede copiar, mandar por
   mensaje y pegar en otro navegador:

       PAMPA1.<crc32 en hex>.<datos>

     · PAMPA1   quién es y qué versión del código (1). Uno de una versión más
                nueva se rechaza diciendo que hay que actualizar.
     · crc32    de los bytes del JSON: una letra cambiada, uno cortado o uno
                mezclado con otro texto se rechaza con mensaje, sin pisar nada.
     · datos    el JSON del save en UTF-8, comprimido con LZW de ancho variable
                (9 a 16 bits) y escrito en base64 para URL (A-Z a-z 0-9 - _),
                que pasa entero por WhatsApp y no lleva puntos.

   Por qué LZW y no la compresión del navegador: CompressionStream es
   asíncrona y no está en node; esto tiene que correr igual en los dos y en
   el test. El save repite mucho (los nombres de los equipos en el fixture y
   los resultados), que es justo lo que LZW aprovecha.

   importar() pasa lo decodificado por logic/save_master.sanear: un código
   que se lee pero no es una carrera jugable también se rechaza.

   Lógica PURA: corre en node (phaser/test/codigo_carrera.test.js).
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaCarrera = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var PREFIJO = "PAMPA";
  var VERSION_CODIGO = 1;
  var MAX_CODIGOS = 1 << 16;          // el diccionario de LZW llega hasta 16 bits

  /* lo que se le dice a quien juega cuando el código no sirve */
  var ERRORES = {
    vacio: "No pegaste nada todavía.",
    ajeno: "Eso no es un código de carrera de Pampa Star.",
    nuevo: "Este código es de una versión más nueva del juego: recargá la página y probá de nuevo.",
    roto: "El código está incompleto o le cambió alguna letra. Copialo de nuevo, entero.",
    injugable: "El código se leyó, pero la carrera que trae no se puede jugar."
  };

  /* ---------- UTF-8 (los nombres llevan tildes y la ñ) ---------- */
  function aUtf8(texto) {
    var out = [];
    for (var i = 0; i < texto.length; i++) {
      var c = texto.charCodeAt(i);
      if (c >= 0xd800 && c <= 0xdbff && i + 1 < texto.length) {
        var d = texto.charCodeAt(i + 1);
        if (d >= 0xdc00 && d <= 0xdfff) { c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00); i++; }
      }
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }
  function deUtf8(bytes) {
    var s = "", i = 0;
    while (i < bytes.length) {
      var b = bytes[i++], c;
      if (b < 0x80) c = b;
      else if (b >= 0xf0) c = ((b & 7) << 18) | ((bytes[i++] & 63) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
      else if (b >= 0xe0) c = ((b & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
      else c = ((b & 31) << 6) | (bytes[i++] & 63);
      if (c >= 0x10000) { c -= 0x10000; s += String.fromCharCode(0xd800 + (c >> 10), 0xdc00 + (c & 1023)); }
      else s += String.fromCharCode(c);
    }
    return s;
  }

  /* ---------- CRC-32 (el de siempre, polinomio 0xEDB88320) ---------- */
  var TABLA_CRC = null;
  function crc32(bytes) {
    if (!TABLA_CRC) {
      TABLA_CRC = [];
      for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        TABLA_CRC.push(c >>> 0);
      }
    }
    var crc = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) crc = TABLA_CRC[(crc ^ bytes[i]) & 255] ^ (crc >>> 8);
    return ((crc ^ 0xffffffff) >>> 0).toString(16);
  }
  function hex8(h) { while (h.length < 8) h = "0" + h; return h; }

  /* ---------- LZW de ancho variable ----------
     El ancho de cada código es el que alcanza para el diccionario que tenía
     el que comprime al escribirlo. El que descomprime va un paso atrás (arma
     la entrada recién al leer el código siguiente), por eso suma uno. */
  function ancho(n) { var w = 9; while ((1 << w) < n && w < 16) w++; return w; }
  function comprimir(bytes) {
    var dic = new Map(), prox = 256, i;
    for (i = 0; i < 256; i++) dic.set(String.fromCharCode(i), i);
    var bits = [], acum = 0, nAcum = 0;
    var escribir = function (codigo, w) {
      acum |= codigo << nAcum; nAcum += w;
      while (nAcum >= 8) { bits.push(acum & 255); acum >>>= 8; nAcum -= 8; }
    };
    var w = "";
    for (i = 0; i < bytes.length; i++) {
      var c = String.fromCharCode(bytes[i]), wc = w + c;
      if (dic.has(wc)) { w = wc; continue; }
      escribir(dic.get(w), ancho(prox));
      if (prox < MAX_CODIGOS) dic.set(wc, prox++);
      w = c;
    }
    if (w !== "") escribir(dic.get(w), ancho(prox));
    if (nAcum > 0) bits.push(acum & 255);
    return bits;
  }
  /* devuelve los bytes, o null si el código no puede haber salido de comprimir() */
  function descomprimir(bytes) {
    var dic = [], i;
    for (i = 0; i < 256; i++) dic.push(String.fromCharCode(i));
    var pos = 0, total = bytes.length * 8;
    var leer = function (w) {
      if (pos + w > total) return -1;
      var v = 0;
      for (var b = 0; b < w; b++, pos++) if (bytes[pos >> 3] & (1 << (pos & 7))) v |= 1 << b;
      return v;
    };
    var primero = leer(ancho(256));
    if (primero < 0) return [];
    if (primero > 255) return null;
    var prev = dic[primero], out = [prev];
    for (;;) {
      var w = ancho(Math.min(MAX_CODIGOS, dic.length + 1));
      if (total - pos < w) break;            // lo que sobra es relleno del último byte
      var c = leer(w), entrada;
      if (c < dic.length) entrada = dic[c];
      else if (c === dic.length) entrada = prev + prev.charAt(0);
      else return null;
      out.push(entrada);
      if (dic.length < MAX_CODIGOS) dic.push(prev + entrada.charAt(0));
      prev = entrada;
    }
    /* el relleno del último byte tiene que ser ceros: si no, el texto se cortó
       o se le pegó algo */
    while (pos < total) { if (bytes[pos >> 3] & (1 << (pos & 7))) return null; pos++; }
    var s = out.join(""), r = new Array(s.length);
    for (i = 0; i < s.length; i++) r[i] = s.charCodeAt(i);
    return r;
  }

  /* ---------- base64 para URL, sin relleno ---------- */
  var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  function aBase64(bytes) {
    var s = "";
    for (var i = 0; i < bytes.length; i += 3) {
      var n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
      s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
      if (i + 1 < bytes.length) s += B64[(n >> 6) & 63];
      if (i + 2 < bytes.length) s += B64[n & 63];
    }
    return s;
  }
  function deBase64(s) {
    if (s.length % 4 === 1) return null;
    var out = [], acum = 0, n = 0;
    for (var i = 0; i < s.length; i++) {
      var v = B64.indexOf(s.charAt(i));
      if (v < 0) return null;
      acum = (acum << 6) | v; n += 6;
      if (n >= 8) { n -= 8; out.push((acum >> n) & 255); }
    }
    return out;
  }

  /* ---------- la ida: el save a código ---------- */
  function exportar(save) {
    var bytes = aUtf8(JSON.stringify(save));
    return PREFIJO + VERSION_CODIGO + "." + hex8(crc32(bytes)) + "." + aBase64(comprimir(bytes));
  }

  /* ---------- la vuelta: el código a save, o el motivo ----------
     opts.ids y opts.saneo van a save_master.sanear (las divisiones que valen y
     cómo rehacer una temporada). Devuelve { ok, save, reparado, error }. */
  function importar(codigo, opts) {
    opts = opts || {};
    var falla = function (k) { return { ok: false, save: null, reparado: [], error: ERRORES[k], clave: k }; };
    /* se pega con saltos de línea, espacios o comillas de un mensaje: afuera.
       Y se BUSCA el código adentro del texto (no tiene que estar solo): al
       compartir va con un renglón que explica qué es, y se pega todo junto */
    var c = String(codigo == null ? "" : codigo).replace(/[\s"'«»“”]+/g, "");
    if (!c) return falla("vacio");
    var m = /PAMPA(\d+)\.([0-9a-fA-F]{1,8})\.([A-Za-z0-9_-]+)/.exec(c);
    if (!m) return falla(c.toUpperCase().indexOf(PREFIJO) === 0 ? "roto" : "ajeno");
    if (parseInt(m[1], 10) > VERSION_CODIGO) return falla("nuevo");
    var comp = deBase64(m[3]);
    if (!comp) return falla("roto");
    var bytes = descomprimir(comp);
    if (!bytes || !bytes.length) return falla("roto");
    if (hex8(crc32(bytes)) !== hex8(m[2].toLowerCase())) return falla("roto");
    var save;
    try { save = JSON.parse(deUtf8(bytes)); } catch (e) { return falla("roto"); }
    var SM = (typeof window !== "undefined" && window.PampaSaveMaster) || tryRequire("./save_master.js");
    if (!SM) return { ok: true, save: save, reparado: [], error: null, clave: null };
    var r = SM.sanear(save, opts.ids, opts.saneo);
    if (r.irrecuperable || !r.save) return falla("injugable");
    return { ok: true, save: r.save, reparado: r.reparado, error: null, clave: null };
  }
  function tryRequire(p) {
    try { return typeof require === "function" ? require(p) : null; } catch (e) { return null; }
  }

  return {
    VERSION_CODIGO: VERSION_CODIGO, ERRORES: ERRORES,
    exportar: exportar, importar: importar,
    /* por dentro, expuestas para el test */
    comprimir: comprimir, descomprimir: descomprimir, crc32: crc32,
    aUtf8: aUtf8, deUtf8: deUtf8, aBase64: aBase64, deBase64: deBase64
  };
});
