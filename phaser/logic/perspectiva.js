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

  /* ══════════════════════════════════════════════════════════════════════
     P6-B · CUÁNDO LA CANCHA CAMBIA DE COMPOSICIÓN, Y CÓMO SE MUEVE.

     Rodri: "cuando hay un pase largo o un remate, la composición del campo
     CAMBIA — la cámara avanza, las distancias se reencuadran, aparece una
     nueva realidad espacial".

     Acá vive la decisión y el movimiento; el dibujo vive en la escena. Es
     lógica pura: se puede correr en node y se puede portar a Godot.
     ══════════════════════════════════════════════════════════════════════ */

  /* B2 · ¿esta acción saca la cámara de donde estaba?
     Los umbrales son de balance (vista.profundo); las distancias ya las
     calcula el partido, así que acá no se mide nada nuevo. */
  function esProfundo(accion, ctx, cfg) {
    cfg = cfg || {};
    ctx = ctx || {};
    if (cfg.activo === false) return false;
    switch (accion) {
      /* el pase LARGO. Uno corto se juega en el plano lateral: si cada toque
         cortara de cámara, el corte dejaría de significar algo. */
      case "pase":
        return (ctx.distancia || 0) >= (cfg.pase_dist != null ? cfg.pase_dist : 300);
      /* el remate DESDE AFUERA. De adentro del área ya hay viñeta propia. */
      case "tiro":
        return (ctx.distanciaArco || 0) >= (cfg.tiro_dist != null ? cfg.tiro_dist : 260);
      /* estas dos son de por sí una corrida hacia el arco */
      case "megacorrida": return cfg.megacorrida !== false;
      case "saque": return cfg.saque !== false;
      default: return false;
    }
  }

  /* B1 · EL VIAJE. t ∈ [0,1] es el avance del vuelo; devuelve dónde está cada
     cosa EN PROFUNDIDAD en ese momento.

     La clave de que se sienta "la cámara avanza" y no "un dibujo se mueve":
     el que la tiró se ACERCA a la cámara y se va de cuadro (crece y se
     desvanece), y el que recibe se ACERCA también (de lejos a media
     distancia). Los dos vienen hacia vos = la cámara avanzó entre ellos.

     Si solo se moviera la pelota, sería el mismo plano con un objeto cruzando,
     que es exactamente lo que había antes. */
  function viajeProfundo(t, cfg) {
    cfg = cfg || {};
    t = clamp(t, 0, 1);
    var lerp = function (a, b, u) { return a + (b - a) * u; };
    /* la pelota sale rápido y llega frenando: es un pase, no un láser */
    var tp = 1 - (1 - t) * (1 - t);

    var recD0 = cfg.receptor_d0 != null ? cfg.receptor_d0 : 0.94;
    var recD1 = cfg.receptor_d1 != null ? cfg.receptor_d1 : 0.42;
    var receptor = lerp(recD0, recD1, tp);

    var tirD0 = cfg.tirador_d0 != null ? cfg.tirador_d0 : 0.10;
    var tirD1 = cfg.tirador_d1 != null ? cfg.tirador_d1 : 0.0;
    var tirador = lerp(tirD0, tirD1, t);

    return {
      t: t,
      tirador: tirador,
      receptor: receptor,
      /* la pelota va DEL que la tiró AL que recibe, en la profundidad de los dos */
      pelota: lerp(tirador, receptor, tp),
      /* el que la tiró se va de cuadro: crece y se desvanece */
      tiradorAlpha: clamp(1 - t / (cfg.tirador_sale != null ? cfg.tirador_sale : 0.55), 0, 1),
      tiradorEscala: lerp(1, cfg.tirador_crece != null ? cfg.tirador_crece : 1.8, t),
      /* la altura del vuelo: una parábola sobre el tiempo REAL, no sobre el
         suavizado — con tp el pico caía en t=0.25 y la pelota parecía subir de
         golpe y planear. Con t, sube y baja parejo como un pase levantado. */
      alto: 4 * t * (1 - t)
    };
  }

  /* B3 · el corte es seco: no hay transición, pero SÍ hay un freno de un
     puñado de cuadros para que se sienta el golpe (el hitstop del bloque B).
     Devuelve cuántos ms frenar según lo que se está por mostrar. */
  function frenoDelCorte(accion, cfg) {
    cfg = cfg || {};
    var base = cfg.corte_freno_ms != null ? cfg.corte_freno_ms : 90;
    return accion === "tiro" || accion === "megacorrida" ? Math.round(base * 1.6) : base;
  }

  return {
    clamp: clamp, proyectar: proyectar, aPantalla: aPantalla,
    esProfundo: esProfundo, viajeProfundo: viajeProfundo, frenoDelCorte: frenoDelCorte
  };
});
