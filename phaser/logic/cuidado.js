/* ============================================================================
   PAMPA STAR · phaser/logic/cuidado.js — DESTELLOS Y MOVIMIENTO (lógica pura)

   Ola 3, L11. Juegan menores y es un lanzamiento público.

   LOS DESTELLOS. La pauta WCAG 2.3.1 pide que nada destelle más de tres veces
   en un segundo. El partido tenía 18 flash de cámara, el cuadro crema del
   gol, el cuadro de impacto de LA ONDA y los negros de corte del cine, y
   tocando seguido para saltear, la megacorrida llegaba a 6 destellos en un
   segundo. limitador() es el historial: deja pasar un destello si en la
   ventana anterior hubo menos de `max`, así en NINGUNA ventana de ese largo
   entran más de `max`. Los números van en balance.cuidado.

   EL MOVIMIENTO. "completo" o "suave" (sin sacudones ni destellos, sin líneas
   de velocidad, cortes en vez de zooms y sin la toma 3D del remate). Se elige
   en OPCIONES y queda en el aparato; sin elección guardada manda lo que
   pidió el sistema operativo (prefers-reduced-motion).

   Sin DOM ni Phaser: lo prueba phaser/test/cuidado.test.js en node.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PampaCuidado = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var CLAVE = "pampa_movimiento";
  var MODOS = ["completo", "suave"];

  function limitador(cfg) {
    var ventana = cfg.ventana_ms, max = cfg.max, hechos = [];
    return {
      pedir: function (t) {
        while (hechos.length && t - hechos[0] >= ventana) hechos.shift();
        if (hechos.length >= max) return false;
        hechos.push(t);
        return true;
      },
      hechos: hechos
    };
  }

  function inicial(guardado, prefiereReducir) {
    if (MODOS.indexOf(guardado) >= 0) return guardado;
    return prefiereReducir ? "suave" : "completo";
  }

  /* ls: localStorage (puede tirar en una ventana privada o con el sitio
     bloqueado: ahí no hay elección guardada). medios: window.matchMedia */
  function leer(ls, medios) {
    var g = null;
    try { g = ls.getItem(CLAVE); } catch (e) { }
    return inicial(g, !!(medios && medios("(prefers-reduced-motion: reduce)").matches));
  }

  function guardar(ls, modo) {
    try { ls.setItem(CLAVE, modo); return true; } catch (e) { return false; }
  }

  return { CLAVE: CLAVE, MODOS: MODOS, limitador: limitador, inicial: inicial, leer: leer, guardar: guardar };
});
