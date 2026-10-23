/* ============================================================================
   PAMPA STAR · LAS PUERTAS DEL CUIDADO PARA LAS ESCENAS DE MENTIRA
   (ayudante de tests, no es un test)

   Desde L11 toda cámara destella o se sacude por las puertas de piel_ui.js
   (destello, sacudir, alfaNegro, zoomCamara) y los efectos preguntan
   movimientoSuave(). Las escenas armadas a mano de los tests no cargan la
   piel: esto les pone las puertas pasando derecho a su cámara de mentira,
   con cupo siempre y en movimiento COMPLETO (o SUAVE con opts.suave). El
   tope de destellos y el modo SUAVE de verdad los mide cuidado.test.js.

   Uso: require("./_cuidado_de_mentira.js")(escena, { suave: false });
   ========================================================================== */
"use strict";
module.exports = function (s, opts) {
  var suave = !!(opts && opts.suave);
  s.movimientoSuave = function () { return suave; };
  s.cupoDestello = function () { return true; };
  s.destello = function (cam, ms, r, g, b) { if (suave) return false; cam.flash(ms, r, g, b); return true; };
  s.sacudir = function (cam, ms, i, f) { if (suave) return false; cam.shake(ms, i, f); return true; };
  s.alfaNegro = function () { return 1; };
  s.zoomCamara = function (cam, z, ms, e, f) { if (suave) cam.setZoom(z); else cam.zoomTo(z, ms, e, f); };
  return s;
};
