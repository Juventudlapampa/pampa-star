/* ============================================================================
   PAMPA STAR · phaser/logic/memoria.js — LA MEMORIA DE TEXTURAS (lógica pura)

   Tanda 1.0, lote L06 (texturas-presupuesto). Lo que estaba mal, medido con
   node sobre los encabezados de los webp/png que piden los cuatro preload:
   69 texturas, 100,8 Mpx = 384,6 MB en la placa de video (RGBA, 4 bytes por
   píxel: Phaser las sube al crearlas), nada se liberaba, y ninguna había
   pensado en el teléfono:
     · pampa-star-logo (2400x2200, 20,1 MB) se ve a 360x330 en la compuerta;
     · el logo horizontal (4280x640, 10,4 MB) se ve a 230x34 en el Master;
     · el cartel del pueblo (2000x1800, 13,7 MB) se ve a 196 de alto;
     · los seis fondos de la intro (1920x1080, 7,9 MB cada uno) se ven a
       960x540, que es todo el lienzo;
     · Nelda y el Tuli se cargaban DOS veces, con dos claves (19 MB).
   En un teléfono de gama baja eso termina en la pestaña muerta (y la página
   recargada a mitad de la fecha duplicaba mejoras, ver L03).

   Lo que decide este módulo, sin tocar un solo archivo de assets/:
     · ladoMaximo(clave, arte): el tope de lado EN MEMORIA de cada textura,
       según su prefijo (balance.arte). Las poses, las caras y las
       identidades quedan afuera: logic/vestir.js y logic/halo.js miden en
       píxeles (las tolerancias, la franja del recorte) y achicarlas les
       cambiaría la cuenta;
     · medidaConTope(clave, w, h, arte): a qué medida se achica (o null);
     · mb(w, h) y resumen(lista): para window.__PAMPA_TEX y ?perf=1.
   El achique lo hace el gancho de texturas de scenes/cine_arte.js
   (PampaHaloEnganchar), apenas la textura entra al juego. Las escenas
   escalan por el alto de la textura ("altura / textura.height"), así que
   nada se mueve de lugar.

   Lo prueba phaser/test/presupuesto_texturas.test.js.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PampaMemoria = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* lo mismo que balance.arte, por si el balance no llegó (respaldo) */
  var DEF = {
    max_lado_px: 1024,
    max_lado_chicas_px: 512,
    tope_prefijos: ["bg", "i_", "fondo_"],
    chicas_prefijos: ["d_", "personaje_", "tribuna_", "retrato_"],
    tope_excepto: ["fondo_tribuna"]
  };

  function empieza(clave, lista) {
    for (var i = 0; i < (lista || []).length; i++) if (String(clave).indexOf(lista[i]) === 0) return true;
    return false;
  }

  /* el lado máximo en memoria de una textura, o 0 si no tiene tope */
  function ladoMaximo(clave, arte) {
    var A = arte || DEF;
    var ex = A.tope_excepto || DEF.tope_excepto;
    if (ex.indexOf(clave) >= 0) return 0;
    if (empieza(clave, A.chicas_prefijos || DEF.chicas_prefijos)) return A.max_lado_chicas_px || DEF.max_lado_chicas_px;
    if (empieza(clave, A.tope_prefijos || DEF.tope_prefijos)) return A.max_lado_px || DEF.max_lado_px;
    return 0;
  }

  /* la medida achicada (proporcional, redondeada) o null si no hace falta */
  function medidaConTope(clave, w, h, arte) {
    var tope = ladoMaximo(clave, arte);
    if (!tope || !(w > 0) || !(h > 0) || Math.max(w, h) <= tope) return null;
    var f = tope / Math.max(w, h);
    return { w: Math.max(1, Math.round(w * f)), h: Math.max(1, Math.round(h * f)), factor: f };
  }

  /* MB de una textura RGBA en la placa de video */
  function mb(w, h) { return (w * h * 4) / 1048576; }

  /* [{w,h}] → { n, mb } */
  function resumen(lista) {
    var n = 0, t = 0;
    (lista || []).forEach(function (x) { if (x && x.w > 0 && x.h > 0) { n++; t += mb(x.w, x.h); } });
    return { n: n, mb: Math.round(t * 10) / 10 };
  }

  return { DEF: DEF, ladoMaximo: ladoMaximo, medidaConTope: medidaConTope, mb: mb, resumen: resumen };
});
