/* ============================================================================
   PAMPA STAR · phaser/logic/ambiente.js — LA LUZ DE LA ESCALERA (lógica pura)

   Qué ambiente le toca a un partido según su división, y las herramientas
   que el pintor del cine (scenes/cine_arte.js) necesita y que conviene
   poder probar sin navegador: el azar con semilla —cada fondo sale SIEMPRE
   igual, así la cancha de la Primera B es la misma cancha toda la
   temporada— y la aritmética de color.

   Los datos viven en data/ambientes.json. Esto no dibuja nada.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PampaAmbiente = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* el id del ambiente para una división del Master (o el de sin división:
     amistoso, clásico, carrera de siempre) */
  function ambienteDe(divId, data) {
    var mapa = (data && data.por_division) || {};
    var id = (divId && mapa[divId]) || mapa.sin_division || "tarde";
    var amb = data && data.ambientes && data.ambientes[id];
    if (!amb) {
      /* el mapa nombra un ambiente que no está: se cae al primero que haya */
      var ids = Object.keys((data && data.ambientes) || {});
      id = ids[0] || null;
      amb = id ? data.ambientes[id] : null;
    }
    return { id: id, pal: amb };
  }

  /* mulberry32 sembrado con un texto: misma semilla, mismo fondo */
  function rngDe(semilla) {
    var s = String(semilla == null ? "pampa" : semilla), h = 1779033703 ^ s.length;
    for (var i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    var a = h >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* "#rrggbb" → [r,g,b] (0-255). Tolera números (0xrrggbb). */
  function rgb(hex) {
    if (typeof hex === "number") return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
    var h = String(hex || "#000000").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (!isFinite(n)) n = 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function aHex(c) {
    return "#" + c.map(function (v) {
      var x = Math.max(0, Math.min(255, Math.round(v))).toString(16);
      return x.length < 2 ? "0" + x : x;
    }).join("");
  }
  /* mezcla lineal de dos colores, t en [0,1] */
  function mezclar(a, b, t) {
    var A = rgb(a), B = rgb(b);
    return aHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
  }
  /* t>0 aclara hacia blanco, t<0 oscurece hacia negro */
  function luz(c, t) { return t >= 0 ? mezclar(c, "#ffffff", t) : mezclar(c, "#000000", -t); }
  /* "rgba(...)" para el canvas */
  function rgba(c, a) { var C = rgb(c); return "rgba(" + C[0] + "," + C[1] + "," + C[2] + "," + (a == null ? 1 : a) + ")"; }
  /* lo que hace setTint de Phaser: multiplicar canal por canal. Sirve para
     que lo pintado por código calce con una ilustración teñida. */
  function multiplicar(a, b) {
    var A = rgb(a), B = rgb(b);
    return aHex([A[0] * B[0] / 255, A[1] * B[1] / 255, A[2] * B[2] / 255]);
  }
  /* número 0xrrggbb para Phaser (setTint) */
  function aNumero(c) { var C = rgb(c); return (C[0] << 16) | (C[1] << 8) | C[2]; }
  /* luminancia relativa (WCAG), para vigilar contrastes en los tests */
  function luminancia(c) {
    var C = rgb(c).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * C[0] + 0.7152 * C[1] + 0.0722 * C[2];
  }

  /* la clave de textura de un fondo pintado: el ambiente y todo lo que
     cambie el dibujo. Dos pedidos iguales comparten textura. */
  function clave(tipo, ambId, extra) {
    return "cine_" + tipo + "_" + (ambId || "x") + (extra ? "_" + extra : "");
  }
  /* la clave completa de un pedido: el golpe no depende de la hora sino del
     bando Y del centro (el plano del pie lo centra, la chilena lo corre a la
     izquierda: si compartieran textura, el segundo heredaría el centro del
     primero); la cancha alta depende de dónde empieza y del color de la
     costura. */
  function claveDeFondo(tipo, ambId, o) {
    o = o || {};
    if (tipo === "golpe") {
      var cx = Math.round((o.cx != null ? o.cx : 0.42) * 100), cy = Math.round((o.cy != null ? o.cy : 0.5) * 100);
      return clave("golpe", "golpe", (o.bando || "mio") + "_" + cx + "_" + cy);
    }
    if (tipo === "cancha_alta") return clave(tipo, ambId, String(o.y0 || "") + (o.tierra ? String(o.tierra).replace("#", "") : ""));
    /* 25/oct: el viaje desde donde se pateó, una pintura por vista (la izquierda es el espejo) */
    if (tipo === "profunda" && o.lugar) return clave(tipo, ambId, o.lugar.pintura);
    return clave(tipo, ambId, "");
  }
  /* qué pinturas hay que soltar al cambiar de ambiente. El registro es exacto
     (clave → ambiente) porque "noche" es parte de "gran_noche" y buscar por
     texto borraría de más; y porque el juego tiene OTRAS texturas que
     empiezan con "cine_" (cine_pie, cine_red…) que no son pinturas. */
  function pinturasDeOtroAmbiente(pintadas, ambId) {
    return Object.keys(pintadas || {}).filter(function (k) { return pintadas[k] !== ambId; });
  }

  return {
    ambienteDe: ambienteDe, rngDe: rngDe,
    rgb: rgb, aHex: aHex, mezclar: mezclar, luz: luz, rgba: rgba, aNumero: aNumero, multiplicar: multiplicar,
    luminancia: luminancia, clave: clave, claveDeFondo: claveDeFondo,
    pinturasDeOtroAmbiente: pinturasDeOtroAmbiente
  };
});
