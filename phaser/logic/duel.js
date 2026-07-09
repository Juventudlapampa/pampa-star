/* ============================================================================
   PAMPA STAR · phaser/logic/duel.js — LÓGICA PURA (sin Phaser, sin DOM)
   Resolución de duelos y del remate. Este módulo es la ÚNICA fuente de verdad
   del resultado: la animación es ESCLAVA de lo que devuelve resolveShot().
   Se puede requerir desde node (tests) o cargar como global en el browser.

   >>> BUG CRÍTICO que arregla (feedback de playtest): "el arquero atajó y marcó
       gol igual". Causa: la animación y el resultado estaban desacoplados.
       Fix de raíz: resolveShot() decide UNA vez; expone `outcome` y el flag
       `keeperWins`, y garantiza el invariante  keeperWins  <=>  outcome != 'gol'.
       El test phaser/test/duel.test.js lo cubre.
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaDuel = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* Chance del atacante (0..1) según su fuerza contra la del defensor/arquero.
     Curva suave y acotada: nunca 0% ni 100% (siempre hay épica del "¿entra?"). */
  function duelChance(atk, def, cfg) {
    cfg = cfg || {};
    var spread = cfg.spread || 58;   // cuánto pesa la diferencia de fuerza
    var min = cfg.min != null ? cfg.min : 0.07;
    var max = cfg.max != null ? cfg.max : 0.95;
    return clamp(0.5 + (atk - def) / spread, min, max);
  }

  /* ---- Remate al arco -------------------------------------------------------
     Entradas (todas explícitas y testeables):
       shotPower   número — fuerza del remate (stat tiro + bonus de zona)
       keeperSkill número — capacidad del arquero (atajada)
       zone        {id, bonus, fuera, gy} — la zona elegida del arco:
                     bonus  suma/resta a la chance (esquina rinde más)
                     fuera  prob. de irse AFUERA si el tiro ganaba (riesgo)
                     gy     desplazamiento vertical del destino (para la anim)
       rng         function()->[0,1) — inyectable (tests deterministas)
     Devuelve un objeto INMUTABLE de resultado. La animación NO lo puede cambiar:
       outcome     'gol' | 'atajada' | 'afuera'
       keeperWins  true si el arquero se queda con la pelota (atajada)
       chancePct   entero 0..100 (para mostrar)
       gy          la Y de destino (la anim la usa tal cual)
     INVARIANTE (cubierto por test): keeperWins === (outcome !== 'gol').
  --------------------------------------------------------------------------- */
  function resolveShot(opts) {
    var rng = opts.rng || Math.random;
    var zone = opts.zone || { bonus: 0, fuera: 0, gy: 0 };
    var chance = duelChance((opts.shotPower || 0) + (zone.bonus || 0), opts.keeperSkill || 0, opts.cfg);
    var roll = rng();
    var ganaTiro = roll < chance;          // ¿el rematador le ganó al arquero?

    var outcome, keeperWins;
    if (!ganaTiro) {
      outcome = "atajada";                 // el arquero se queda con ella
      keeperWins = true;
    } else if (zone.fuera && rng() < zone.fuera) {
      outcome = "afuera";                  // ganaba, pero se fue por centímetros
      keeperWins = false;                  // el arquero NO ataja (la pelota se va)
    } else {
      outcome = "gol";
      keeperWins = false;
    }

    // Cinturón y tiradores: el invariante se hace cumplir acá, no en la anim.
    if (keeperWins && outcome === "gol") outcome = "atajada";   // jamás gol si el arquero ganó
    if (outcome === "gol" && keeperWins) keeperWins = false;

    return Object.freeze({
      outcome: outcome,
      keeperWins: keeperWins,
      chancePct: Math.round(chance * 100),
      roll: roll,
      gy: zone.gy || 0
    });
  }

  return { clamp: clamp, duelChance: duelChance, resolveShot: resolveShot };
});
