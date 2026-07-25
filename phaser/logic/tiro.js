/* ============================================================================
   PAMPA STAR · phaser/logic/tiro.js — LÓGICA PURA del TIRO CON EJECUCIÓN
   Se construye por DECISIÓN y se define por DESTREZA: la jugada se arma
   eligiendo, pero el REMATE lo ejecutás VOS (puntería + potencia + curva).
   Este módulo convierte tu ejecución en una "zona" para duel.resolveShot:
   el invariante del arquero sigue intacto (acá no se decide gol, se PREPARA).

   Entradas (todas [-1..1] o [0..1], sin unidades de pantalla — portable):
     aimX     -1 palo izquierdo … +1 palo derecho (0 = al medio)
     aimY     -1 raso … +1 alto (0 = media altura)
     potencia 0..1 (el punto dulce vive en cfg.potencia_dulce)
     curva    -1..1 (comba; le complica la vida al arquero)
     statTiro stat del rematador: MÁS stat = MENOS ruido (margen de error)
   cfg = balance.tiro_ejecucion · rng inyectable (tests).
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaTiro = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  function evaluarEjecucion(opts) {
    var cfg = opts.cfg, rng = opts.rng || Math.random;
    var stat = opts.statTiro != null ? opts.statTiro : 50;

    /* 1) el RUIDO: tu puntería tiembla menos cuanto mejor es el jugador */
    var statFactor = clamp((stat - 30) / 60, 0, 1);            // 30→0 (mucho ruido) … 90→1 (pulso firme)
    var ruido = cfg.ruido_max * (1 - statFactor);
    var ax = clamp((opts.aimX || 0) + (rng() * 2 - 1) * ruido, -1.35, 1.35);
    var ay = clamp((opts.aimY || 0) + (rng() * 2 - 1) * ruido, -1.35, 1.35);

    /* 2) la POTENCIA: punto dulce; floja la ataja fácil, pasada se va */
    var p = clamp(opts.potencia != null ? opts.potencia : 0.7, 0, 1);
    var dulce = cfg.potencia_dulce;
    var bonusPot = 0, fueraPot = 0;
    if (p < dulce[0]) bonusPot = -(dulce[0] - p) * cfg.penal_potencia_floja;   // tirito: regalo al arquero
    else if (p > dulce[1]) fueraPot = (p - dulce[1]) * cfg.fuera_potencia_pasada;
    else bonusPot = 4;                                                          // en el punto justo: premio

    /* 3) la ESQUINA: apuntar fino rinde más pero arriesga; pasarse del palo es afuera casi seguro */
    var borde = Math.max(Math.abs(ax), Math.abs(ay));
    var bonusEsq = cfg.bonus_esquina * clamp(borde, 0, 1);
    var fueraEsq = cfg.fuera_esquina * borde * borde;
    var fueraBorde = borde > 1 ? clamp((borde - 1) * cfg.fuera_borde, 0, 0.9) : 0;

    /* 4) la CURVA: comba controlada suma; sobregirarla también arriesga */
    var cu = clamp(opts.curva || 0, -1, 1);
    var bonusCurva = cfg.curva_bonus * Math.abs(cu);
    var fueraCurva = Math.abs(cu) > 0.85 ? (Math.abs(cu) - 0.85) * 0.4 : 0;

    /* 5) mezcla DESTREZA vs STATS: cuánto pesa tu ejecución (afinable) */
    var w = cfg.peso_destreza;
    var bonus = (bonusEsq + bonusPot + bonusCurva) * w;
    var fuera = clamp((fueraEsq + fueraPot + fueraBorde + fueraCurva) * w + 0.02 * (1 - w), 0, 0.95);

    /* calidad 0..1 para el relato ("¡ejecución perfecta!") */
    var calidad = clamp(
      0.5
      + (bonusPot > 0 ? 0.2 : bonusPot / (cfg.penal_potencia_floja * 2))
      + clamp(borde, 0, 1) * 0.2
      - fueraBorde * 0.8
      + Math.abs(cu) * 0.1, 0, 1);

    return {
      zona: { n: "ejecución", bonus: bonus, fuera: fuera, gy: clamp(ax, -1, 1) * cfg.gy_max },
      calidad: calidad,
      detalle: { ax: ax, ay: ay, potencia: p, curva: cu, ruido: ruido, seFuePorBorde: borde > 1 }
    };
  }

  /* ============ V8 B · EL TIRO TSUBASA (sin minijuego, sin elegir zona) ============
     El remate común es: elijo → ANIMACIÓN → INTRIGA → resultado. La zona la
     decide el JUEGO, no una pantalla: sale de DÓNDE disparaste (ángulo y
     distancia), el CANSANCIO del que patea, su puntería y los defensores en el
     camino, más azar acotado. Lo decisivo es la ubicación; la adrenalina es no
     saber si entra mientras la pelota viaja.
     params: { x, y, W, H, arcoMedio, statTiro, aguanteFrac, defensores, rng }
     devuelve { zona, ajustePoder, riesgoFuera, lectura } — puro y testeable. */
  function tiroAuto(params) {
    var p = params || {};
    var W = p.W || 1050, H = p.H || 680, arco = p.arcoMedio || 55;
    var rng = p.rng || Math.random;
    var x = p.x != null ? p.x : W * 0.8, y = p.y != null ? p.y : H / 2;
    var stat = clamp(p.statTiro != null ? p.statTiro : 55, 1, 99);
    var energia = clamp(p.aguanteFrac != null ? p.aguanteFrac : 1, 0, 1);
    var defs = Math.max(0, p.defensores | 0);

    /* 1) la GEOMETRÍA manda: distancia al arco y ángulo (centrado = mejor) */
    var dx = Math.max(1, W - x), dy = y - H / 2;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var cerca = clamp(1 - (dist - arco) / (W * 0.55), 0, 1);        // 1 = encima del arco
    var centrado = clamp(1 - Math.abs(dy) / (H * 0.45), 0, 1);      // 1 = de frente
    /* 2) el estado del que patea */
    var puntería = stat / 100 * 0.6 + energia * 0.4;
    /* 3) el juego ELIGE dónde va: cuanto mejor la situación, más al ángulo */
    var calidad = clamp(cerca * 0.45 + centrado * 0.3 + puntería * 0.25 + (rng() - 0.5) * 0.18, 0, 1);
    var lado = dy === 0 ? (rng() < 0.5 ? -1 : 1) : (dy > 0 ? -1 : 1);   // cruzado al palo lejano
    var zona;
    if (calidad > 0.72) zona = { id: "angulo", n: "al ángulo", bonus: 6, fuera: 0.1, gy: lado * 42 };
    else if (calidad > 0.5) zona = { id: "palo", n: "al palo", bonus: 4, fuera: 0.07, gy: lado * 34 };
    else if (calidad > 0.3) zona = { id: "medio_alto", n: "alto al medio", bonus: -1, fuera: 0.04, gy: lado * 12 };
    else zona = { id: "medio", n: "al medio", bonus: -4, fuera: 0.02, gy: 0 };
    /* 4) los DEFENSORES en el camino descuentan (y pueden desviarla afuera) */
    var estorbo = Math.min(3, defs) * 5;
    var ajustePoder = Math.round(cerca * 10 + centrado * 6 - estorbo);
    var riesgoFuera = clamp(zona.fuera + (1 - puntería) * 0.14 + Math.min(3, defs) * 0.03, 0, 0.55);
    return {
      zona: zona, ajustePoder: ajustePoder, riesgoFuera: riesgoFuera,
      lectura: { dist: Math.round(dist), cerca: +cerca.toFixed(2), centrado: +centrado.toFixed(2), calidad: +calidad.toFixed(2), defensores: Math.min(3, defs) }
    };
  }

  return { clamp: clamp, evaluarEjecucion: evaluarEjecucion, tiroAuto: tiroAuto };
});
