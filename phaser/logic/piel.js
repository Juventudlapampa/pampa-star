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

  /* EL TELÉFONO LEGIBLE (25/oct). Con Scale.FIT el lienzo de 960x540 se ve a
     640x360 en un teléfono apaisado de 360 de alto: 13 px lógicos son 8,7
     reales. `escalaReal` es ancho visible / 960. El factor lleva el texto de
     ref_logico_px a min_real_px reales y nunca achica (en la PC da 1). Cada
     texto suma lo mismo que el de referencia y los más chicos crecen en
     proporción, así un título de 40 no se come la pantalla. */
  function factorTexto(escalaReal, cfg) {
    if (!cfg || !(escalaReal > 0)) return 1;
    var f = cfg.min_real_px / (cfg.ref_logico_px * escalaReal);
    return Math.max(1, Math.min(cfg.tope_factor, f));
  }
  function tamTexto(px, factor, cfg) {
    if (!(factor > 1) || !(px > 0)) return px;
    return Math.round((px + Math.min(px, cfg.ref_logico_px) * (factor - 1)) * 10) / 10;
  }
  /* el factor del juego que corre: cuánto se ve el lienzo y el bloque
     balance.legibilidad.telefono (sin el bloque, 1) */
  function factorDe(game) {
    var L = game.registry.get("balance").legibilidad;
    return factorTexto(game.scale.displaySize.width / game.scale.width, L && L.telefono);
  }
  /* un título y su bajada puestos a mano (y-9 y y+13) se pisan cuando la
     letra crece en el teléfono. Si se tocan, se abren parejo alrededor de su
     medio; si no, quedan donde estaban, así en la PC no se mueve nada.
     Devuelve el alto que ocupan los dos. */
  function separarRenglones(a, b, aire) {
    var A = a.getBounds(), B = b.getBounds();
    var falta = A.bottom + (aire || 0) - B.y;
    if (falta > 0) { a.y -= falta / 2; b.y += falta / 2; }
    return Math.max(A.bottom, B.bottom) - Math.min(A.y, B.y) + Math.max(0, falta);
  }
  /* lo mismo para una columna de textos de arriba abajo: cada uno queda en
     su lugar o, si pisa al de arriba, baja lo justo. Devuelve dónde termina
     el último. */
  /* un botón o una caja que crece: el dibujo y, si se toca, su zona */
  function estirar(r, w, h) {
    r.setSize(w, h);
    if (r.input && r.input.hitArea) r.input.hitArea.setSize(w, h);
    return r;
  }
  function apilarSiPisa(textos, aire) {
    var fondo = -Infinity;
    textos.forEach(function (t) {
      if (!t) return;
      var b = t.getBounds();
      if (b.y < fondo + (aire || 0)) t.y += fondo + (aire || 0) - b.y;
      fondo = t.getBounds().bottom;
    });
    return fondo;
  }

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

  /* 23/oct · DÓNDE VA UNA MARCA SIN PISAR NADA (la ×N de LA SEMANA, que
     iba sobre el borde de la tarjeta). caja {x, y, w, h}: la tarjeta; tam
     {w, h}: la marca; ocupado: lo escrito, en rectángulos {x, y, w, h};
     lugares: centros {x, y} a probar, en orden de preferencia. El aire de un
     lugar es lo que separa la marca del borde de la caja y de lo escrito (en
     negativo, lo que se mete). Devuelve el primero que llega a `aire` o, si
     ninguno llega, el de más aire: { x, y, aire } */
  function lugarLibre(caja, tam, ocupado, lugares, aire) {
    var mejor = null;
    (lugares || []).forEach(function (p) {
      if (mejor && mejor.aire >= aire) return;
      var x0 = p.x - tam.w / 2, y0 = p.y - tam.h / 2, x1 = x0 + tam.w, y1 = y0 + tam.h;
      var a = Math.min(x0 - caja.x, caja.x + caja.w - x1, y0 - caja.y, caja.y + caja.h - y1);
      (ocupado || []).forEach(function (o) {
        a = Math.min(a, Math.max(o.x - x1, x0 - (o.x + o.w), o.y - y1, y0 - (o.y + o.h)));
      });
      if (!mejor || a > mejor.aire) mejor = { x: p.x, y: p.y, aire: a };
    });
    return mejor;
  }

  /* ══════════════════════════════════════════════════════════════════════
     EL NOMBRE QUE ENTRA SIN PARTIRSE.

     Los nombres de club no entran en el marcador ni en la tabla, y hasta la
     pasada de coherencia se cortaban con slice(0, 14): los nombres de dos
     palabras largas salian partidos a la mitad de la segunda, en tres
     lugares distintos.

     Cortar por caracteres es lo que hace eso. Las reglas de acá salen de
     como se abrevia de verdad, en este orden:

       1. si entra, no se toca
       2. se sacan los conectores: "Union de Realico" → "UNION REALICO"
       3. se abrevian las palabras desde la IZQUIERDA, dejando la ULTIMA
          entera: "Estrella de General Pico" → "ESTR. GENERAL PICO" (18);
          GENERAL, INGENIERO, SANTA y COLONIA van siempre como en los
          carteles de ruta, y a 14 queda "GRAL. PICO"
          (la ultima palabra suele ser la localidad, que es lo que identifica
          al club: perderla es peor que abreviar todo lo demas)
       4. recien al final, si nada alcanzo, se corta — pero por PALABRA

     Es logica pura y por eso se puede probar contra los 45 clubes del juego
     sin abrir el navegador.
     ══════════════════════════════════════════════════════════════════════ */
  /* la Y no se saca: "SAL Y CAL" es un nombre, "SAL CAL" no (ver el paso 4) */
  var CONECTORES = ["DE", "DEL", "LA", "EL", "LOS", "LAS", "DA"];
  /* las de los carteles de ruta ("GRAL. PICO", nunca "GEN. PICO") */
  var ABREVIATURAS = { GENERAL: "GRAL.", INGENIERO: "ING.", SANTA: "STA.", COLONIA: "COL." };
  function nombreCorto(nombre, tope) {
    var n = String(nombre == null ? "" : nombre).toUpperCase().trim();
    tope = tope || 14;
    if (n.length <= tope) return n;

    var p = n.split(/\s+/).filter(Boolean);
    if (p.length === 1) return n.slice(0, tope);

    /* 2 · sin conectores */
    var sinCon = p.filter(function (w) { return CONECTORES.indexOf(w) < 0; });
    if (!sinCon.length) sinCon = p;
    if (sinCon.join(" ").length <= tope) return sinCon.join(" ");

    /* 3 · abreviar desde la izquierda, la ultima palabra queda entera */
    for (var corte = 4; corte >= 3; corte--) {
      for (var cuantas = 1; cuantas < sinCon.length; cuantas++) {
        var w = sinCon.map(function (x, k) {
          if (k >= cuantas) return x;
          if (ABREVIATURAS[x]) return ABREVIATURAS[x];
          return x.length <= corte + 1 ? x : x.slice(0, corte) + ".";
        });
        var cand = w.join(" ");
        if (cand.length <= tope) return cand;
      }
    }

    /* 4 · lo ultimo: las palabras enteras que entren, priorizando la ULTIMA
       (la localidad). Si ni la ultima sola entra, ahi si se corta. Un par
       unido por Y entra entero o no entra: a 14 letras "Sal y Cal de
       Macachin" daba "CAL MACACHIN", que se lee como otro club. */
    var ultima = sinCon[sinCon.length - 1];
    if (ultima.length > tope) return ultima.slice(0, tope);
    var out = ultima;
    for (var k = sinCon.length - 2; k >= 0; k--) {
      var abrev;
      if (k >= 2 && sinCon[k - 1] === "Y") { abrev = sinCon.slice(k - 2, k + 1).join(" "); k -= 2; }
      else abrev = ABREVIATURAS[sinCon[k]] || (sinCon[k].length > 4 ? sinCon[k].slice(0, 3) + "." : sinCon[k]);
      if ((abrev + " " + out).length > tope) break;
      out = abrev + " " + out;
    }
    return out;
  }

  return {
    DEF: DEF, paleta: paleta, capasBoton: capasBoton,
    num: num, hex: hex, oscurecer: oscurecer, aclarar: aclarar,
    luma: luma, esOscuro: esOscuro, tintaSobre: tintaSobre,
    esMayusculas: esMayusculas, trackingPx: trackingPx,
    escala: escala, tam: tam,
    franja: franja, yDeOpcion: yDeOpcion, enFranja: enFranja, caben: caben, lugarLibre: lugarLibre,
    nombreCorto: nombreCorto, CONECTORES: CONECTORES,
    JERARQUIA: JERARQUIA, nivel: nivel, nivelPx: nivelPx,
    factorTexto: factorTexto, tamTexto: tamTexto, factorDe: factorDe,
    separarRenglones: separarRenglones, apilarSiPisa: apilarSiPisa, estirar: estirar
  };
});
