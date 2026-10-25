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

  /* 25/oct, Rodri: "le pegué desde un ángulo de abajo, casi lateral, y me
     mostró la animación como si le pegara de mitad de cancha". El lugar del
     remate sale de dónde estaba quien patea: x, y en la cancha, atacando el
     arco de x = W, y = H/2 (el remate rival se pasa girado: W - x, H - y).
     lado -1 = a la izquierda de quien patea (y chica), 1 = a la derecha.
       angulo_*  pegado a la línea de fondo (a menos de angulo_dx) y afuera
                 de los palos (más de palo_px del medio)
       lateral_* el ángulo contra el eje del arco pasa lateral_grados
       frente_cerca / frente_lejos  de frente, según cerca_px
     La vista (cfg.vistas): giro = cuánto se inclina la línea de gol (rad,
     la parte cercana baja del lado de quien patea), corrido = cuánto se corre
     el arco del centro, vpY = la altura del arco, arco = ancho y alto del arco
     al fondo (de costado se ve angosto), viaje = cuánto dura el viaje. La
     pintura se hace del lado derecho y el izquierdo es su espejo. */
  function lugarDelRemate(x, y, W, H, cfg) {
    var dx = Math.max(1, W - x), dy = y - H / 2, ady = Math.abs(dy);
    var grados = Math.atan2(ady, dx) * 180 / Math.PI, dist = Math.sqrt(dx * dx + dy * dy);
    var lado = dy < 0 ? -1 : 1, base;
    if (dx < cfg.angulo_dx && ady > cfg.palo_px) base = "angulo";
    else if (grados > cfg.lateral_grados) base = "lateral";
    else base = dist < cfg.cerca_px ? "frente_cerca" : "frente_lejos";
    var de = base === "angulo" || base === "lateral";
    var s = de ? lado : 0, v = cfg.vistas[base];
    return {
      id: de ? base + (lado < 0 ? "_izq" : "_der") : base, pintura: base, lado: s,
      grados: Math.round(grados), dist: Math.round(dist),
      giro: v.giro, espejo: s < 0, vpX: 0.5 - s * v.corrido, vpY: v.vpY,
      arcoW: v.arco[0], arcoH: v.arco[1], viaje: v.viaje
    };
  }

  /* 25/oct, Rodri: "en la animación del arquero de ¡LA AGARRÓ! está arriba de
     las redes del arco, volando". La pose de la que agarra se escalaba al
     115% del alto del arco (de rodillas, más alto que el travesaño) y quedaba
     donde la había dejado el salto. Acá: alto = altoFrac del arco, los pies
     delante de la línea (adelante px) y la caja entera entre los palos.
     A = arcoCine (izq, der, linea, h); tex = { w, h } de la pose; x = dónde
     la quiere la escena. Devuelve escala, x, y (pies) y la caja que ocupa. */
  function arqueroEnArco(A, tex, x, cfg) {
    var esc = A.h * cfg.alto / tex.h, w = tex.w * esc, h = tex.h * esc;
    var cx = clamp(x, A.izq + w / 2, A.der - w / 2), pies = A.linea + cfg.adelante;
    return { escala: esc, x: cx, y: pies, caja: { izq: cx - w / 2, der: cx + w / 2, arriba: pies - h, abajo: pies } };
  }

  return {
    clamp: clamp, proyectar: proyectar, aPantalla: aPantalla,
    esProfundo: esProfundo, viajeProfundo: viajeProfundo, frenoDelCorte: frenoDelCorte,
    lugarDelRemate: lugarDelRemate, arqueroEnArco: arqueroEnArco
  };
});
