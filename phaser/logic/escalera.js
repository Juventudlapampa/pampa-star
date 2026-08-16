/* ============================================================================
   PAMPA STAR · phaser/logic/escalera.js — LÓGICA PURA (sin Phaser, sin DOM)
   BLOQUE C · QUE LA ESCALERA SE SIENTA

   El diagnóstico: la Primera B y el Mundial se ven exactamente igual. Los
   escudos de las selecciones son el mismo escudo geométrico que los clubes de
   pueblo, la cancha es la misma, la tribuna es la misma. El Modo Master
   promete una escalera de cinco escalones y visualmente es plano.

   No se resuelve con arte nuevo: se resuelve haciendo que TODO EL ENVOLTORIO
   cambie por división, con lo que ya existe. Este módulo es la tabla de ese
   envoltorio — cuánta tribuna, cuánto ruido, qué luz, cuánta ceremonia y
   cuánto detalle de escudo le toca a cada escalón.

   EL OBJETIVO, y es un criterio verificable: que alguien que abre una captura
   sepa en qué división está SIN LEER EL TEXTO.
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaEscalera = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* El orden importa: es el que define cuánto sube cada cosa. */
  var ORDEN = ["primera_b", "primera_a", "regional", "nacional", "mundial"];

  /* Cada escalón, con TODO lo que cambia. Los valores son fracciones o
     multiplicadores sobre lo que el juego ya dibuja, para que no haga falta
     ningún asset nuevo. */
  var ESCALONES = {
    primera_b: {
      n: "PRIMERA B", nivel: 0,
      tribuna_densidad: 0.28,      // casi vacía: se ven los huecos entre la gente
      tribuna_movimiento: 0.15,    // apenas se mueve
      hinchada_volumen: 0.35,      // un murmullo con cuatro gritos sueltos
      hinchada_continua: false,
      luz: "tarde",                // el verde de tarde de pueblo
      pasto_tinte: 0x000000, pasto_alpha: 0,
      cielo: 0x2b5f7a,
      ceremonia_ms: 0,             // arrancás y ya
      escudo_detalle: 1            // una franja y una inicial
    },
    primera_a: {
      n: "PRIMERA A", nivel: 1,
      tribuna_densidad: 0.45, tribuna_movimiento: 0.3,
      hinchada_volumen: 0.5, hinchada_continua: false,
      luz: "tarde", pasto_tinte: 0x000000, pasto_alpha: 0,
      cielo: 0x2b5f7a,
      ceremonia_ms: 0, escudo_detalle: 2
    },
    regional: {
      n: "REGIONAL", nivel: 2,
      tribuna_densidad: 0.62, tribuna_movimiento: 0.45,
      hinchada_volumen: 0.65, hinchada_continua: true,
      luz: "atardecer",
      pasto_tinte: 0xff8a50, pasto_alpha: 0.10,
      cielo: 0x6a3a2e,
      ceremonia_ms: 900, escudo_detalle: 3
    },
    nacional: {
      n: "NACIONAL", nivel: 3,
      tribuna_densidad: 0.82, tribuna_movimiento: 0.65,
      hinchada_volumen: 0.82, hinchada_continua: true,
      luz: "noche",
      pasto_tinte: 0x8fd0ff, pasto_alpha: 0.14,
      cielo: 0x101c30,
      ceremonia_ms: 1400, escudo_detalle: 4
    },
    mundial: {
      n: "MUNDIAL", nivel: 4,
      tribuna_densidad: 1, tribuna_movimiento: 1,
      hinchada_volumen: 1, hinchada_continua: true,
      luz: "noche_dura",           // el contraste duro de las luces artificiales
      pasto_tinte: 0xd8f0ff, pasto_alpha: 0.2,
      cielo: 0x060b18,
      ceremonia_ms: 2200,          // entrada con el rival, los escudos enfrentados y una espera
      escudo_detalle: 5
    }
  };

  function de(division) {
    return ESCALONES[division] || ESCALONES.primera_b;
  }
  function nivelDe(division) { return de(division).nivel; }

  /* ¿hay presentación previa? En Primera B no: arrancás y ya. */
  function hayCeremonia(division) { return de(division).ceremonia_ms > 0; }

  /* Cuántas siluetas de tribuna dibujar, dado el máximo que la escena soporta */
  function siluetas(division, maximo) {
    return Math.max(1, Math.round((maximo || 40) * de(division).tribuna_densidad));
  }

  /* EL CRITERIO VERIFICABLE: dos divisiones cualesquiera tienen que
     diferenciarse en al menos `minimo` rasgos VISUALES, para que se note sin
     leer el texto. Devuelve los rasgos en que difieren. */
  var RASGOS_VISUALES = ["tribuna_densidad", "tribuna_movimiento", "luz", "pasto_alpha", "cielo", "escudo_detalle"];
  function diferencias(a, b) {
    var A = de(a), B = de(b), out = [];
    RASGOS_VISUALES.forEach(function (r) {
      var va = A[r], vb = B[r];
      if (typeof va === "number" && typeof vb === "number") {
        if (Math.abs(va - vb) > 0.001) out.push(r);
      } else if (va !== vb) out.push(r);
    });
    return out;
  }

  return {
    ORDEN: ORDEN, ESCALONES: ESCALONES, RASGOS_VISUALES: RASGOS_VISUALES,
    de: de, nivelDe: nivelDe, hayCeremonia: hayCeremonia,
    siluetas: siluetas, diferencias: diferencias
  };
});
