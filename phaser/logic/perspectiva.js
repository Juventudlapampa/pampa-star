/* ============================================================================
   PAMPA STAR · phaser/logic/perspectiva.js — LÓGICA PURA (sin Phaser, sin DOM)
   La matemática de la PROFUNDIDAD del modo cine: un punto que se aleja hacia el
   arco al fondo (la pelota viajando HACIA ADENTRO de la pantalla). Devuelve la
   escala y la altura en pantalla; el render solo la posiciona. Portable a Godot.

   d (profundidad) ∈ [0,1]:  0 = cerca de la cámara (grande, abajo)
                             1 = lejos, en el arco (chico, arriba, punto de fuga)
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaPersp = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* Proyecta una profundidad d a:
       escala        1 (cerca) → sFar (lejos), caída perspectívica (rápido y luego lento)
       alturaDesdeVP 1 (cerca, abajo) → 0 (lejos, en el punto de fuga)
     cfg.k = fuerza de la perspectiva (más alto = converge más rápido). */
  function proyectar(d, cfg) {
    cfg = cfg || {};
    var k = cfg.k || 3;
    d = clamp(d, 0, 1);
    var raw = 1 / (1 + d * k);          // 1 → 1/(1+k)
    var sFar = 1 / (1 + k);
    var norm = (raw - sFar) / (1 - sFar); // 1 (cerca) → 0 (lejos)
    return { escala: raw, alturaDesdeVP: norm };
  }

  /* Mapea la proyección a coordenadas de PANTALLA dado el encuadre:
       vpX, vpY   punto de fuga (el arco, arriba)
       nearY      la línea de "cerca" (abajo)
       driftX     desvío horizontal en el punto de fuga (apuntar a un palo): px en el arco
     Devuelve {x, y, escala}. */
  function aPantalla(d, cfg) {
    var p = proyectar(d, cfg);
    var vpX = cfg.vpX || 0, vpY = cfg.vpY || 0, nearY = cfg.nearY || 0;
    var driftX = (cfg.driftX || 0) * (1 - p.alturaDesdeVP); // el desvío crece hacia el arco
    return {
      x: vpX + driftX,
      y: vpY + (nearY - vpY) * p.alturaDesdeVP,
      escala: p.escala
    };
  }

  return { clamp: clamp, proyectar: proyectar, aPantalla: aPantalla };
});
