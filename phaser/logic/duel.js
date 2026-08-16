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

  /* ---- G1 · LA DISTANCIA PESA -----------------------------------------------
     Antes la distancia entraba restándole fuerza al remate, y no alcanzaba:
     duelChance está acotada arriba en 0.95, así que en cuanto el poder le
     sacaba ~26 puntos al arquero la chance quedaba pegada al tope y daba lo
     mismo patear desde el área chica que desde el campo propio. Medido con un
     jugador de tiro 85 contra arquero normal: 95% desde el área y 91% desde el
     propio campo. Por eso la distancia ahora es un FACTOR aparte, que se
     aplica DESPUÉS del tope: el techo de la chance baja con los metros.

     Curva: 1.0 hasta `referencia` px (el área, donde la distancia no debería
     decidir nada), y de ahí cae como 1/(1+t³) con t medido en `media_vida`.
     El cubo es lo que hace que sea plana cerca y se derrumbe lejos, que es lo
     que se quiere: dentro del área manda el duelo, afuera manda la distancia.
     `piso` deja siempre una rendija, porque el gol imposible existe.        */
  function factorDistancia(d, cfg, especial) {
    cfg = cfg || {};
    if (d == null) return 1;                       // sin distancia: como antes
    var ref = cfg.referencia != null ? cfg.referencia : 90;
    var media = (especial ? cfg.media_vida_especial : cfg.media_vida) || (especial ? 380 : 210);
    var piso = cfg.piso != null ? cfg.piso : 0.03;
    var t = Math.max(0, d - ref) / media;
    return clamp(1 / (1 + t * t * t), piso, 1);
  }

  /* ---- Remate al arco -------------------------------------------------------
     Entradas (todas explícitas y testeables):
       shotPower   número — fuerza del remate (stat tiro + bonus de zona)
       keeperSkill número — capacidad del arquero (atajada)
       zone        {id, bonus, fuera, gy} — la zona elegida del arco:
                     bonus  suma/resta a la chance (esquina rinde más)
                     fuera  prob. de irse AFUERA si el tiro ganaba (riesgo)
                     gy     desplazamiento vertical del destino (para la anim)
       distancia   número — px hasta el arco. Si falta, se comporta como antes.
       especial    bool — Caldén/megatiro: aguanta más metros, pero no es inmune
       tiro        cfg de balance.tiro (curva de distancia + reparto del no-gol)
       rng         function()->[0,1) — inyectable (tests deterministas)
     Devuelve un objeto INMUTABLE de resultado. La animación NO lo puede cambiar:
       outcome     'gol' | 'atajada' | 'corner' | 'afuera'
       keeperWins  true SOLO si el arquero se queda con la pelota ('atajada')
       chancePct   entero 0..100 (para mostrar)
       gy          la Y de destino (la anim la usa tal cual)
     INVARIANTE (cubierto por test): outcome === 'gol' ⇒ keeperWins === false,
     y keeperWins === true ⇒ outcome === 'atajada'.

     EL NO-GOL SE REPARTE EN TRES, porque "el arquero no hace nada" era parte
     del problema: de lejos la pelota se va afuera más seguido que ser atajada,
     y de las que ataja, las que le llegan fuertes NO las retiene: las manda al
     córner. "La agarró" y "la sacó al córner" son resultados distintos y con
     consecuencias distintas — con el córner la jugada sigue siendo tuya.     */
  function resolveShot(opts) {
    var rng = opts.rng || Math.random;
    var zone = opts.zone || { bonus: 0, fuera: 0, gy: 0 };
    var T = opts.tiro || {};
    var poder = (opts.shotPower || 0) + (zone.bonus || 0);
    var fd = factorDistancia(opts.distancia, T, opts.especial);
    var base = duelChance(poder, opts.keeperSkill || 0, opts.cfg);
    var chance = base * fd;
    var roll = rng();
    var ganaTiro = roll < chance;          // ¿el rematador le ganó al arquero?

    var outcome, keeperWins = false;
    if (ganaTiro) {
      outcome = (zone.fuera && rng() < zone.fuera) ? "afuera" : "gol";
    } else {
      /* de lejos, lo que no entra se va afuera: al arquero ni le llega */
      var pAfuera = clamp((1 - fd) * (T.afuera_lejos != null ? T.afuera_lejos : 0.6), 0, 0.8);
      if (rng() < pAfuera) {
        outcome = "afuera";
      } else {
        /* La agarró vs la sacó al córner: lo decide la fuerza contra las manos.
           Ojo con la base: si arranca en 0.5 el arquero casi nunca retiene,
           porque el poder del rematador le gana SIEMPRE por diseño (50 de tiro
           más el bonus de aguante contra 46 de arquero normal). Medido con base
           0.5: 566 córners contra 76 agarradas. Lo normal tiene que ser que la
           agarre y lo notable que se le escape, así que la base es alta y la
           fuerza pesa con su propio peso, más suave que en el duelo. */
        var base = T.retiene_base != null ? T.retiene_base : 0.75;
        var peso = T.retiene_peso_fuerza || 116;
        var pRetiene = clamp(base + ((opts.keeperSkill || 0) - poder) / peso,
          T.retiene_min != null ? T.retiene_min : 0.15,
          T.retiene_max != null ? T.retiene_max : 0.9);
        if (rng() < pRetiene) { outcome = "atajada"; keeperWins = true; }
        else outcome = "corner";
      }
    }

    // Cinturón y tiradores: el invariante se hace cumplir acá, no en la anim.
    if (outcome === "gol") keeperWins = false;      // jamás "el arquero ganó" con gol
    if (keeperWins && outcome !== "atajada") keeperWins = false;

    return Object.freeze({
      outcome: outcome,
      keeperWins: keeperWins,
      chancePct: Math.round(chance * 100),
      basePct: Math.round(base * 100),
      factorDist: Math.round(fd * 1000) / 1000,
      roll: roll,
      gy: zone.gy || 0
    });
  }

  return { clamp: clamp, duelChance: duelChance, resolveShot: resolveShot, factorDistancia: factorDistancia };
});
