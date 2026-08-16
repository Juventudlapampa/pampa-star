/* ============================================================================
   PAMPA STAR · phaser/logic/drama.js — LÓGICA PURA (sin Phaser, sin DOM)
   BLOQUE A · LOS TRES ESCALONES DEL DRAMA

   El diagnóstico: hoy TODA acción significativa corta a una viñeta de 2.600 ms
   (entrada 500 + pose 800 + hold 1.300), más 500 de silencio en algunas.
   Un pase lateral y un gol de chilena cuestan lo mismo en tiempo de pantalla.
   Cuando todo es épico, nada lo es.

   LOS TRES ESCALONES

   1 · EL TRÁMITE — pase corto que sale, quite simple, corte, salida del
       arquero. NO corta a viñeta: se resuelve en la cancha. El jugador no
       pierde el hilo. Presupuesto: menos de 500 ms.

   2 · LA JUGADA — gambeta, pared, remate normal, atajada, bloqueo. Corta a
       viñeta, pero a la mitad de lo que dura hoy.

   3 · EL MOMENTO — gol, megatiro, chilena, gol en contra, atajada imposible,
       el final del partido, el ascenso, el descenso. Viñeta completa con todo
       el arsenal. Son pocos por partido y por eso pueden costar caro.

   Este módulo NO dibuja ni mide tiempo: clasifica y reparte presupuesto. La
   escena le pregunta cuánto le toca a cada plano y obedece. Así el reparto es
   testeable en node y la cuenta de "cuántos segundos de viñeta tiene un
   partido" se puede hacer sin abrir el juego.
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaDrama = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* La clasificación por defecto. Vive acá y no en balance.json porque no es
     una perilla de ajuste: es una decisión de diseño sobre qué merece pantalla.
     Los PRESUPUESTOS sí son perillas. */
  var ESCALON = {
    /* 1 · el trámite */
    pase: 1, pase_ok: 1, corte: 1, quite: 1, saque: 1, salida_arquero: 1,
    bajarla: 1, pase_vacio: 1,

    /* 2 · la jugada */
    gambeta: 2, gambeta_gana: 2, gambeta_pierde: 2, pared: 2, combinada: 2,
    tiro: 2, remate: 2, atajada: 2, bloqueo: 2, quite_area: 2, cabezazo: 2,
    volea: 2, corner: 2, afuera: 2, pase_interceptado: 2,

    /* 3 · el momento */
    gol: 3, gol_rival: 3, megatiro: 3, calden: 3, chilena: 3, super_tiro: 3,
    atajada_imposible: 3, megacorrida: 3, jugadon: 3, final: 3,
    ascenso: 3, descenso: 3, gloria: 3
  };

  function cfgDe(cfg) {
    cfg = cfg || {};
    return {
      escalon1_ms: cfg.escalon1_ms != null ? cfg.escalon1_ms : 420,
      escalon2_ms: cfg.escalon2_ms != null ? cfg.escalon2_ms : 1250,
      escalon3_ms: cfg.escalon3_ms != null ? cfg.escalon3_ms : 2600,
      /* la perilla global de B7: multiplica TODO de una */
      intensidad: cfg.intensidad != null ? cfg.intensidad : 1
    };
  }

  /* qué escalón le toca a una acción. `contexto` puede subirla de categoría:
     un quite adentro del área o una atajada que salva un gol cantado suben. */
  function escalonDe(accion, contexto) {
    var base = ESCALON[accion] != null ? ESCALON[accion] : 2;
    contexto = contexto || {};
    if (contexto.decisivo) return 3;           // el gol que define, la atajada que salva
    if (contexto.enArea && base === 1) return 2;
    if (contexto.especial && base < 3) return 3;
    return base;
  }

  /* el presupuesto TOTAL en ms para esa acción */
  function presupuesto(accion, contexto, cfg) {
    var C = cfgDe(cfg);
    var e = escalonDe(accion, contexto);
    var ms = e === 1 ? C.escalon1_ms : e === 2 ? C.escalon2_ms : C.escalon3_ms;
    return Math.round(ms * C.intensidad);
  }

  /* ¿corta a viñeta? El escalón 1 se resuelve en la cancha, y esa es la
     diferencia que más se siente: el partido deja de frenarse por un pase. */
  function cortaAVinieta(accion, contexto) { return escalonDe(accion, contexto) >= 2; }

  /* Cómo se reparte el presupuesto entre los planos de la viñeta. Se conservan
     las proporciones de hoy (500/800/1300 sobre 2600) para que el escalón 3 se
     vea exactamente igual que antes y solo cambien los de abajo. */
  var REPARTO = { entrada: 500 / 2600, pose: 800 / 2600, hold: 1300 / 2600 };

  function planos(accion, contexto, cfg) {
    var total = presupuesto(accion, contexto, cfg);
    return {
      escalon: escalonDe(accion, contexto),
      total: total,
      entrada: Math.round(total * REPARTO.entrada),
      pose: Math.round(total * REPARTO.pose),
      hold: Math.round(total * REPARTO.hold)
    };
  }

  /* LA CUENTA DEL BLOQUE A: cuántos segundos de viñeta tiene un partido.
     `frecuencias` es {accion: veces por partido}. Devuelve el total en segundos
     con el reparto actual, para poder comparar antes y después. */
  function cuentaDelPartido(frecuencias, cfg) {
    var total = 0, detalle = [];
    Object.keys(frecuencias || {}).forEach(function (a) {
      var veces = frecuencias[a] || 0;
      var p = presupuesto(a, null, cfg);
      var esc = escalonDe(a, null);
      var ms = cortaAVinieta(a, null) ? p * veces : 0;
      total += ms;
      detalle.push({ accion: a, escalon: esc, veces: veces, unitario: p, total_ms: ms });
    });
    detalle.sort(function (x, y) { return y.total_ms - x.total_ms; });
    return { segundos: Math.round(total / 100) / 10, ms: total, detalle: detalle };
  }

  return {
    ESCALON: ESCALON, REPARTO: REPARTO,
    escalonDe: escalonDe, presupuesto: presupuesto, planos: planos,
    cortaAVinieta: cortaAVinieta, cuentaDelPartido: cuentaDelPartido, cfgDe: cfgDe
  };
});
