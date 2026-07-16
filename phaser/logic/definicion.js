/* ============================================================================
   PAMPA STAR · phaser/logic/definicion.js — LA DEFINICIÓN v2 (lógica pura)
   V6 §4: el duelo de SEIS ZONAS del arco (elección a ciegas y simultánea),
   la tirada de bloqueo del defensor en la línea, y los modificadores del
   remate/atajada. La ESCENA solo compone; los números viven acá y en balance.
   Accesibilidad: cada zona tiene ETIQUETA y posición de grilla propias —
   nunca se distinguen solo por color. Corre en node (tests) y en el browser.
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaDefinicion = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* las 6 zonas del arco: grilla 3×2 (col 0-2, fila 0 arriba / 1 abajo) */
  var ZONAS = [
    { id: "alto_izq", n: "ÁNGULO IZQ", col: 0, fila: 0, gy: -44 },
    { id: "alto_centro", n: "ALTO MEDIO", col: 1, fila: 0, gy: 0 },
    { id: "alto_der", n: "ÁNGULO DER", col: 2, fila: 0, gy: 44 },
    { id: "bajo_izq", n: "PALO IZQ", col: 0, fila: 1, gy: -38 },
    { id: "bajo_centro", n: "AL MEDIO", col: 1, fila: 1, gy: 0 },
    { id: "bajo_der", n: "PALO DER", col: 2, fila: 1, gy: 38 }
  ];
  function zona(id) { return ZONAS.find(function (z) { return z.id === id; }) || ZONAS[4]; }
  /* distancia de adivinanza: Chebyshev en la grilla (0 = coincide, 1 = al lado, 2 = lejos) */
  function distZonas(idA, idB) {
    var a = zona(idA), b = zona(idB);
    return Math.max(Math.abs(a.col - b.col), Math.abs(a.fila - b.fila));
  }
  /* el arquero CPU elige a ciegas (leve sesgo al centro, como un arquero real) */
  function eleccionCPU(rng) {
    rng = rng || Math.random;
    var pesos = [0.14, 0.18, 0.14, 0.16, 0.22, 0.16];
    var r = rng(), acc = 0;
    for (var i = 0; i < ZONAS.length; i++) { acc += pesos[i]; if (r < acc) return ZONAS[i].id; }
    return ZONAS[4].id;
  }
  /* la adivinanza modula al ARQUERO: coincide → atajada casi segura; a una → difícil; a 2+ → llega mal */
  function bonusArqueroPorZona(dist, cfg) {
    cfg = cfg || {};
    if (dist <= 0) return cfg.coincide != null ? cfg.coincide : 55;
    if (dist === 1) return cfg.a_una != null ? cfg.a_una : 10;
    return cfg.a_dos != null ? cfg.a_dos : -25;
  }
  /* el TIMING modula la potencia: punto dulce; floja la ataja, pasada se va */
  function efectoTiming(off, zonaAncho, cfg) {
    cfg = cfg || {};
    var enZona = Math.abs(off) <= zonaAncho / 2;
    if (enZona) return { enZona: true, dPoder: cfg.dulce_bonus != null ? cfg.dulce_bonus : 8, fueraProb: 0 };
    if (off < 0) return { enZona: false, dPoder: cfg.floja_penal != null ? -cfg.floja_penal : -22, fueraProb: 0 };
    return { enZona: false, dPoder: 0, fueraProb: clamp((off - zonaAncho / 2) * (cfg.pasada_fuera_mult || 1.6), 0, cfg.pasada_fuera_max || 0.55) };
  }
  /* tirada de BLOQUEO del defensor en la línea (fase previa al arquero) */
  function chanceBloqueo(defensoresEnLinea, distMedia, cfg) {
    cfg = cfg || {};
    if (!defensoresEnLinea) return 0;
    var base = (cfg.bloqueo_base != null ? cfg.bloqueo_base : 0.18) * defensoresEnLinea;
    var cercania = clamp(1 - distMedia / (cfg.bloqueo_radio || 120), 0, 1);
    return clamp(base + cercania * (cfg.bloqueo_cercania != null ? cfg.bloqueo_cercania : 0.25), 0, cfg.bloqueo_max || 0.6);
  }
  /* ACHICAR del arquero: reduce las zonas útiles del rematador, pero lo alto lo vende */
  function efectoAchicar(zonaTiro, cfg) {
    cfg = cfg || {};
    var z = zona(zonaTiro);
    if (z.fila === 0 && z.col !== 1) return { dArquero: -(cfg.achicar_vendido != null ? cfg.achicar_vendido : 18), vendido: true };
    return { dArquero: cfg.achicar_bonus != null ? cfg.achicar_bonus : 14, vendido: false };
  }
  return {
    ZONAS: ZONAS, zona: zona, distZonas: distZonas, eleccionCPU: eleccionCPU,
    bonusArqueroPorZona: bonusArqueroPorZona, efectoTiming: efectoTiming,
    chanceBloqueo: chanceBloqueo, efectoAchicar: efectoAchicar
  };
});
