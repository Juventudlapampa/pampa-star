/* ============================================================================
   PAMPA STAR · LA PIEL (lógica pura)
   TANDA DE PIEL (7/ago). Acá vive lo que se puede calcular sin Phaser: la
   paleta resuelta, la aritmética de color del canto de los botones, la regla
   de tracking de las mayúsculas y la escala tipográfica.

   Por qué separado: el proyecto parte DATA (balance.json) / LÓGICA PURA
   (requerible en node, testeable) / RENDER (scenes/). Esto es la segunda, y
   por eso tiene test propio: phaser/test/piel.test.js.

   Regla que este módulo NO cruza: el VERDE DE LA CANCHA. El pasto es campo de
   juego, no marco. La paleta de acá viste el marco y nada más.
   ========================================================================== */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.PampaPiel = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var DEF = {
    fondo_centro: "#14301F", fondo_borde: "#060F0A",
    caja: "#0A1F13", marco: "#0E2A1A",
    acento: "#F5C400", calido: "#FF6B4A",
    texto: "#F6EFDC", texto_apagado: "#9FB3A5",
    canto_px: 7, canto_oscurece: 0.3, sombra_alpha: 0.45, sombra_dy: 6,
    sombra_blur: 10, radio_caja: 10, hunde_px: 4,
    tracking_mayus: 0.16, esc_min: 0.85, esc_max: 1.15
  };

  /* "#rrggbb" o 0xrrggbb → número */
  function num(c) {
    if (typeof c === "number") return c;
    return parseInt(String(c).replace("#", ""), 16) || 0;
  }
  /* número → "#rrggbb" (para estilos de Text, que quieren string) */
  function hex(c) { return "#" + (num(c) >>> 0).toString(16).padStart(6, "0"); }

  function canales(c) { var n = num(c); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function deCanales(r, g, b) {
    var q = function (v) { return Math.max(0, Math.min(255, Math.round(v))); };
    return (q(r) << 16) | (q(g) << 8) | q(b);
  }

  /* EL CANTO: el mismo color, más oscuro. No es negro encima — si fuera negro
     el botón amarillo tendría un canto gris sucio; oscureciendo el propio tono
     el canto se lee como el costado del mismo objeto. */
  function oscurecer(c, frac) {
    var v = canales(c), k = 1 - Math.max(0, Math.min(1, frac == null ? 0.3 : frac));
    return deCanales(v[0] * k, v[1] * k, v[2] * k);
  }
  function aclarar(c, frac) {
    var v = canales(c), k = Math.max(0, Math.min(1, frac || 0));
    return deCanales(v[0] + (255 - v[0]) * k, v[1] + (255 - v[1]) * k, v[2] + (255 - v[2]) * k);
  }

  /* luma perceptual (0-255). Se usa para decidir tinta legible sobre un tono
     cualquiera: con las camisetas oscuras el número del radar desaparecía. */
  function luma(c) { var v = canales(c); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; }
  function esOscuro(c, umbral) { return luma(c) < (umbral == null ? 128 : umbral); }
  /* la tinta que se lee encima de ese fondo */
  function tintaSobre(c, claro, oscuro) {
    return esOscuro(c) ? (claro == null ? 0xf6efdc : num(claro)) : (oscuro == null ? 0x0a1f13 : num(oscuro));
  }

  /* ---------- P4 · LAS MAYÚSCULAS LLEVAN AIRE ----------
     Un texto "en mayúsculas" no es "no tiene minúsculas": "· 12" tampoco las
     tiene y no es un título. Pide al menos dos letras, y que TODAS las letras
     sean mayúsculas. Los acentos cuentan (Ñ, Á): por eso se compara con
     toUpperCase en vez de con un rango A-Z. */
  function esMayusculas(txt) {
    var s = String(txt == null ? "" : txt);
    var letras = s.replace(/[^a-záéíóúüñA-ZÁÉÍÓÚÜÑ]/g, "");
    if (letras.length < 2) return false;
    return letras === letras.toUpperCase();
  }
  /* tracking en PX para un tamaño dado (Phaser pide px, el diseño habla em) */
  function trackingPx(fontSizePx, em) {
    var t = em == null ? DEF.tracking_mayus : em;
    return Math.max(0, Math.round(fontSizePx * t * 10) / 10);
  }

  /* ---------- P5 · ESCALA TIPOGRÁFICA ----------
     Nota honesta: con Phaser.Scale.FIT el ancho lógico es SIEMPRE 960, así que
     esto no cambia nada en las pantallas de hoy. Queda porque el pedido lo
     pide y porque sirve el día que el lienzo deje de ser fijo. El corte real
     de ENVIÓN y AGUANTE se arregló acomodando la maqueta adentro de 960x540. */
  function escala(anchoReal, base, min, max) {
    var b = base || 960;
    var k = (anchoReal || b) / b;
    var lo = min == null ? DEF.esc_min : min, hi = max == null ? DEF.esc_max : max;
    return Math.max(lo, Math.min(hi, k));
  }
  function tam(px, anchoReal, cfg) {
    cfg = cfg || {};
    var k = escala(anchoReal, cfg.base, cfg.esc_min, cfg.esc_max);
    return Math.max(8, Math.round(px * k));
  }

  /* ---------- la paleta resuelta desde balance.piel ---------- */
  function paleta(cfg) {
    var P = {}, k;
    for (k in DEF) if (Object.prototype.hasOwnProperty.call(DEF, k)) P[k] = DEF[k];
    if (cfg && typeof cfg === "object") {
      for (k in cfg) if (Object.prototype.hasOwnProperty.call(cfg, k) && k.charAt(0) !== "_" && cfg[k] != null) P[k] = cfg[k];
    }
    /* versiones numéricas, que es lo que comen fillStyle/setFillStyle */
    P.n = {
      fondo_centro: num(P.fondo_centro), fondo_borde: num(P.fondo_borde),
      caja: num(P.caja), marco: num(P.marco), acento: num(P.acento),
      calido: num(P.calido), texto: num(P.texto), texto_apagado: num(P.texto_apagado)
    };
    return P;
  }

  /* las tres capas de un botón con cuerpo, ya calculadas */
  function capasBoton(color, P) {
    P = P || paleta();
    var c = num(color);
    return {
      cara: c,
      canto: oscurecer(c, P.canto_oscurece),
      cantoPx: P.canto_px,
      sombra: { alpha: P.sombra_alpha, dy: P.sombra_dy, blur: P.sombra_blur },
      radio: P.radio_caja,
      hunde: P.hunde_px,
      tinta: tintaSobre(c, P.texto, P.caja)
    };
  }

  /* ══════════════════════════════════════════════════════════════════════
     O1 · LA FRANJA DE DECISIÓN — "acá elegís", y siempre en el mismo lugar

     El problema medido: de los 12 grupos de opciones del juego, 10 vivían en la
     mitad de abajo y 2 arrancaban arriba (los presets de tempo en y=176 y las
     ranuras de la semana en y=250). El jugador tiene que buscar dónde elegir
     según la pantalla, que es exactamente lo que no puede pasar.

     Ahora la franja es un DATO, no una coordenada suelta repetida en cada
     escena. Todo lo que sea "elegir una de varias" se ubica con estas
     funciones, y el test verifica que ninguna se salga.
     ══════════════════════════════════════════════════════════════════════ */
  function franja(P) {
    P = P || paleta();
    var f = P.franja_decision || {};
    var y0 = f.y_min != null ? f.y_min : 296;
    var y1 = f.y_max != null ? f.y_max : 528;
    return { y0: y0, y1: y1, alto: y1 - y0, centro: (y0 + y1) / 2, pad: f.pad != null ? f.pad : 10 };
  }

  /* la Y del centro de la opción i de n, repartidas en la franja.
     `altoOpcion` es opcional: si se pasa, se garantiza que la opción entera
     (no solo su centro) entra en la franja. */
  function yDeOpcion(i, n, altoOpcion, P) {
    var F = franja(P);
    n = Math.max(1, n || 1);
    var h = altoOpcion || 0;
    var util = F.alto - F.pad * 2;
    var paso = n > 1 ? (util - h) / (n - 1) : 0;
    if (paso < 0) return F.centro;
    return F.y0 + F.pad + h / 2 + i * paso;
  }

  /* ══════════════════════════════════════════════════════════════════════
     BLOQUE E · LA JERARQUÍA — una cosa se mira primero, el resto cede

     Medido antes: en la vista de la semana, 13 de sus 14 textos estaban dentro
     del 72% del tamaño del más grande. O sea que TODO pesaba lo mismo, y
     cuando todo pesa lo mismo el ojo no sabe dónde empezar. Lo mismo en la
     tabla de la temporada (10 de 10) y en la pantalla del evento (4 de 5).

     Cuatro niveles y nada en el medio. La distancia entre niveles es lo que
     hace la jerarquía: si el principal y el secundario se llevan dos píxeles,
     no hay jerarquía, hay ruido.

       1 · EL PRINCIPAL — uno por pantalla. Lo que define la situación.
       2 · el secundario — de qué se trata.
       3 · el dato — números, estados, lo que se consulta.
       4 · el apoyo — lo que casi no se lee. Nunca por debajo del piso de
           legibilidad (12 px lógicos = 8.7 reales en teléfono).
     ══════════════════════════════════════════════════════════════════════ */
  var JERARQUIA = [null, 24, 16, 13, 12];
  function nivel(n) { return (JERARQUIA[n] || 12) + "px"; }
  function nivelPx(n) { return JERARQUIA[n] || 12; }

  /* ¿entran n opciones de ese alto sin solaparse? El helper reparte lo que le
     pidan; decidir cuántas caben es del que dibuja. Sin esto, pedirle 5 de
     52 px a una franja de 232 devuelve posiciones a 40 px de distancia y las
     opciones se pisan — pasó, y lo cazó el test de O1. */
  function caben(n, altoOpcion, P) {
    var F = franja(P);
    return (F.alto - F.pad * 2) >= (n || 1) * (altoOpcion || 0);
  }

  /* ¿este elemento cae dentro de la franja? (lo usa el test) */
  function enFranja(y, alto, P) {
    var F = franja(P);
    var arriba = y - (alto || 0) / 2, abajo = y + (alto || 0) / 2;
    return arriba >= F.y0 - 0.5 && abajo <= F.y1 + 0.5;
  }

  return {
    DEF: DEF, paleta: paleta, capasBoton: capasBoton,
    num: num, hex: hex, oscurecer: oscurecer, aclarar: aclarar,
    luma: luma, esOscuro: esOscuro, tintaSobre: tintaSobre,
    esMayusculas: esMayusculas, trackingPx: trackingPx,
    escala: escala, tam: tam,
    franja: franja, yDeOpcion: yDeOpcion, enFranja: enFranja, caben: caben,
    JERARQUIA: JERARQUIA, nivel: nivel, nivelPx: nivelPx
  };
});
