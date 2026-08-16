/* ============================================================================
   PAMPA STAR · phaser/logic/lectura.js — LÓGICA PURA (sin Phaser, sin DOM)
   N2 · EL RIVAL TE LEE LOS ESPECIALES

   El problema: el pelotazo, el caño, los megatiros y las megadefensas no tenían
   costo. Encontrabas el que funcionaba y lo repetías los 90 minutos.

   De las tres salidas posibles, ésta es la que premia VARIAR en vez de castigar
   USAR: cobrarle energía al especial castiga sin enseñar nada, y subirle el
   nivel al rival ensucia el balance de la carrera entera. Acá el efecto es
   LOCAL AL PARTIDO —la lectura arranca en cero cada domingo— y lo que hace es
   contarte algo: "este equipo ya te vio hacer eso tres veces".

   CÓMO FUNCIONA
     · cada especial tiene su propia lectura, por separado: que te lean el
       Tornado no les dice nada sobre el Caldén;
     · cada uso la sube `sube_por_uso`;
     · el tiempo la baja `baja_por_minuto` — si dejás de abusar, se olvidan;
     · la lectura se traduce en una penalización al poder del especial, con
       tope `penal_max`: aunque te lean perfecto, el especial nunca deja de
       existir, solo deja de ser gratis.

   Y SE AVISA ANTES. etiqueta() devuelve el texto que va en el menú, para que el
   jugador lo sepa cuando elige y no cuando falla. Eso es lo que convierte la
   adaptación en una decisión y no en una trampa.
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaLectura = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  function cfgDe(cfg) {
    cfg = cfg || {};
    return {
      sube_por_uso: cfg.sube_por_uso != null ? cfg.sube_por_uso : 0.34,
      baja_por_minuto: cfg.baja_por_minuto != null ? cfg.baja_por_minuto : 0.022,
      max: cfg.max != null ? cfg.max : 1,
      penal_max: cfg.penal_max != null ? cfg.penal_max : 0.42,
      avisa_desde: cfg.avisa_desde != null ? cfg.avisa_desde : 0.3
    };
  }

  /* el estado arranca vacío CADA PARTIDO: la lectura no viaja a la carrera */
  function nuevo() { return { usos: {}, minuto: 0 }; }

  /* la lectura de un especial AHORA: lo acumulado menos lo que se olvidaron */
  function lectura(est, id, minuto, cfg) {
    var C = cfgDe(cfg);
    if (!est || !est.usos || !est.usos[id]) return 0;
    var u = est.usos[id];
    var m = minuto != null ? minuto : (est.minuto || 0);
    var pasados = Math.max(0, m - u.ultimo);
    return clamp(u.nivel - pasados * C.baja_por_minuto, 0, C.max);
  }

  /* registrar un uso: sube desde el nivel YA DECAÍDO, no desde el guardado.
     Si no, dos usos separados por medio partido sumarían como dos seguidos. */
  function registrar(est, id, minuto, cfg) {
    var C = cfgDe(cfg);
    est = est || nuevo();
    est.usos = est.usos || {};
    var actual = lectura(est, id, minuto, cfg);
    est.usos[id] = { nivel: clamp(actual + C.sube_por_uso, 0, C.max), ultimo: minuto || 0 };
    est.minuto = minuto || 0;
    return est;
  }

  /* cuánto poder pierde el especial: 0 = intacto, penal_max = leído del todo */
  function penalidad(l, cfg) {
    var C = cfgDe(cfg);
    return clamp(l, 0, C.max) * C.penal_max;
  }

  /* el poder ya penalizado (lo que consume quien resuelve el especial) */
  function poderConLectura(poder, l, cfg) {
    return poder * (1 - penalidad(l, cfg));
  }

  /* EL AVISO, que es lo que hace que esto sea una decisión y no una trampa.
     Devuelve null mientras no haya nada que avisar: un menú lleno de etiquetas
     que siempre dicen algo deja de comunicar. */
  function etiqueta(l, cfg) {
    var C = cfgDe(cfg);
    if (l < C.avisa_desde) return null;
    if (l < 0.6) return { texto: "te empiezan a leer", nivel: 1 };
    if (l < 0.85) return { texto: "te tienen leído", nivel: 2 };
    return { texto: "te la vieron toda", nivel: 3 };
  }

  /* para la UI: el estado completo de un especial en una sola llamada */
  function estadoDe(est, id, minuto, cfg) {
    var l = lectura(est, id, minuto, cfg);
    return {
      id: id, lectura: l,
      penalidad: penalidad(l, cfg),
      etiqueta: etiqueta(l, cfg),
      usos: (est && est.usos && est.usos[id]) ? 1 : 0
    };
  }

  return {
    nuevo: nuevo, lectura: lectura, registrar: registrar,
    penalidad: penalidad, poderConLectura: poderConLectura,
    etiqueta: etiqueta, estadoDe: estadoDe, cfgDe: cfgDe
  };
});
