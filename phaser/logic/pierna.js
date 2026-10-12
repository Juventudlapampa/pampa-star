/* ============================================================================
   PAMPA STAR · phaser/logic/pierna.js — LA PIERNA QUE SE MUEVE (oct 2026)
   LÓGICA PURA (sin Phaser, sin DOM): se corre en node.

   Rodri: "cuando va a patear, que se frene o quede suspendido el jugador y
   haya un movimiento de la cámara, como enfocándolo en 3D, mientras va
   subiendo la pierna o bajándola, para darle más épica".

   Las poses son UNA ilustración cada una (la regla es no reprocesarlas ni
   pedir dibujos nuevos para esto). Para que la pierna suba y baje sin dibujar
   cuadros nuevos, la ilustración se monta en una malla y se deforma con dos
   huesos, como un muñeco de papel con alfileres en la cadera y la rodilla:

        cadera ──── rodilla ──── tobillo ── punta
           (gira el muslo)  (dobla la pierna)

   Cada vértice de la malla tiene dos pesos, calculados UNA vez sobre la pose
   en reposo:
     · cuánto lo arrastra la cadera (0 en el short y el torso, 1 del muslo
       para abajo)
     · cuánto lo dobla la rodilla (0 hasta la rodilla, 1 de la canilla al pie)
   y los dos se apagan lejos de la pierna (r0 → r1), así la otra pierna, los
   brazos y la cabeza quedan quietos.

   Los puntos NO se inventan: viven en data/poses_manifest.json (pose
   "remate", clave "pierna") medidos sobre una grilla de la ilustración.

   Ángulos en radianes, en pantalla (y hacia abajo): POSITIVO = la pierna va
   para ATRÁS (la carga), NEGATIVO = para adelante (el remate y el final).
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaPierna = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function suave(a, b, x) {
    var t = (x - a) / (b - a);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return t * t * (3 - 2 * t);
  }
  /* proyección de p sobre el segmento a→b: t (sin recortar) y distancia */
  function proy(px, py, a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1;
    var t = ((px - a[0]) * dx + (py - a[1]) * dy) / L2;
    var tc = t < 0 ? 0 : t > 1 ? 1 : t;
    var qx = a[0] + dx * tc, qy = a[1] + dy * tc;
    return { t: t, d: Math.hypot(px - qx, py - qy) };
  }
  function rot(x, y, cx, cy, a) {
    if (!a) return [x, y];
    var c = Math.cos(a), s = Math.sin(a), dx = x - cx, dy = y - cy;
    return [cx + dx * c - dy * s, cy + dx * s + dy * c];
  }
  /* los huesos en píxeles de la textura, desde la definición del manifest
     (fracciones de la imagen, como pelota{x,y}) */
  function huesos(def, w, h) {
    var P = function (k) { return [def[k][0] * w, def[k][1] * h]; };
    return {
      cadera: P("cadera"), rodilla: P("rodilla"), tobillo: P("tobillo"), punta: P("punta"),
      r0: (def.r0 || 0.07) * w, r1: (def.r1 || 0.12) * w,
      /* el botín es más ancho que la pierna: su propio radio (si no, la mitad
         del botín se queda atrás y se estira como una mancha) */
      r0p: (def.r0_pie || def.r0 || 0.07) * w, r1p: (def.r1_pie || def.r1 || 0.12) * w
    };
  }

  /* pesos de cada punto (xs, ys en px de la textura, en reposo) */
  function pesos(xs, ys, B) {
    var n = xs.length, hw = new Float32Array(n), kw = new Float32Array(n);
    var lMuslo = Math.hypot(B.rodilla[0] - B.cadera[0], B.rodilla[1] - B.cadera[1]);
    var lCan = Math.hypot(B.tobillo[0] - B.rodilla[0], B.tobillo[1] - B.rodilla[1]);
    var lPie = Math.hypot(B.punta[0] - B.tobillo[0], B.punta[1] - B.tobillo[1]);
    for (var i = 0; i < n; i++) {
      var a = proy(xs[i], ys[i], B.cadera, B.rodilla);
      var b = proy(xs[i], ys[i], B.rodilla, B.tobillo);
      var c = proy(xs[i], ys[i], B.tobillo, B.punta);
      /* s: dónde cae a lo largo de la pierna (0 cadera, 1 rodilla, 2 punta) */
      var d, s;
      if (a.d <= b.d && a.d <= c.d) { d = a.d; s = a.t; }
      else if (b.d <= c.d) { d = b.d; s = 1 + b.t * lCan / (lCan + lPie); }
      else { d = c.d; s = 1 + (lCan + c.t * lPie) / (lCan + lPie); }
      var kp = suave(1.45, 1.75, s);
      var r0 = B.r0 + ((B.r0p || B.r0) - B.r0) * kp, r1 = B.r1 + ((B.r1p || B.r1) - B.r1) * kp;
      var m = 1 - suave(r0, r1, d);
      hw[i] = m * suave(-0.08, 0.35, s);
      kw[i] = m * suave(0.82, 1.12, s);
    }
    return { hw: hw, kw: kw, largo: lMuslo + lCan + lPie };
  }

  /* posa los puntos con los ángulos de cadera y rodilla. outX/outY pueden
     ser los mismos arreglos de entrada si no hace falta el reposo. */
  function posar(xs, ys, W8, B, ang, outX, outY) {
    var ac = ang.cadera || 0, ar = ang.rodilla || 0;
    for (var i = 0; i < xs.length; i++) {
      /* la rodilla primero (en reposo) y después la cadera arrastra todo */
      var q = rot(xs[i], ys[i], B.rodilla[0], B.rodilla[1], ar * W8.kw[i]);
      q = rot(q[0], q[1], B.cadera[0], B.cadera[1], ac * W8.hw[i]);
      outX[i] = q[0]; outY[i] = q[1];
    }
  }

  /* dónde queda un punto rígido del pie (la punta, la pelota) con esa pose */
  function puntoDelPie(p, B, ang) {
    var q = rot(p[0], p[1], B.rodilla[0], B.rodilla[1], ang.rodilla || 0);
    return rot(q[0], q[1], B.cadera[0], B.cadera[1], ang.cadera || 0);
  }

  /* ══════════════════════════════════════════════════════════════════════
     LA COREOGRAFÍA DE LA TOMA, en un solo lugar y en función del tiempo.

     t va de 0 a 1 a lo largo de la toma. Devuelve los ángulos de la pierna
     y los de la cámara (órbita alrededor del jugador). Los tiempos son
     fracciones: la escena los convierte a ms con su duración.

       entrada   0 → e      el jugador quieto, suspendido; la cámara arranca
       carga     e → g      la pierna SUBE para atrás doblando la rodilla, la
                            cámara gira alrededor y se acerca
       golpe     g → g+d    la pierna BAJA de golpe: el contacto es cuando
                            pasa por la pose dibujada (ángulos 0)
       final     → 1        el pie termina arriba y la cámara se asienta
     ══════════════════════════════════════════════════════════════════════ */
  var COREO = {
    entrada: 0.14, golpe: 0.70, dura_golpe: 0.07,
    carga: { cadera: 0.42, rodilla: 0.85 },
    remate: { cadera: -0.42, rodilla: -0.12 },
    orbita: { desde: 0.7, hasta: -0.4, golpe: -0.08, tilt: 0.06 },
    /* el cuerpo acompaña: se echa atrás cargando y se tira adelante al pegar */
    inclinacion: { carga: -0.07, golpe: 0.05 },
    acercar: 0.14
  };
  function facil(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }     // in-out
  function salida(t) { return 1 - Math.pow(1 - t, 3); }                                       // out
  function coreografia(t, cfg) {
    var C = cfg || COREO, e = C.entrada, g = C.golpe, d = C.dura_golpe;
    var cad = 0, rod = 0, k;
    if (t <= e) { cad = 0; rod = 0; }
    else if (t < g) {
      k = facil((t - e) / (g - e));
      cad = C.carga.cadera * k; rod = C.carga.rodilla * k;
    } else if (t < g + d) {
      /* el golpe: de la carga al remate, pasando por 0 (el contacto) */
      k = (t - g) / d;
      cad = C.carga.cadera + (C.remate.cadera - C.carga.cadera) * k;
      rod = C.carga.rodilla + (C.remate.rodilla - C.carga.rodilla) * k;
    } else {
      k = salida(Math.min(1, (t - g - d) / Math.max(0.0001, 1 - g - d)));
      /* el final: el pie arriba y vuelve apenas */
      cad = C.remate.cadera * (1 - 0.25 * k); rod = C.remate.rodilla * (1 - 0.4 * k);
    }
    /* la cámara: gira toda la carga, en el golpe se planta casi de frente */
    var oy;
    if (t < g) oy = C.orbita.desde + (C.orbita.hasta - C.orbita.desde) * facil(Math.min(1, t / g));
    else oy = C.orbita.hasta + (C.orbita.golpe - C.orbita.hasta) * salida(Math.min(1, (t - g) / Math.max(0.0001, 1 - g)));
    var ox = C.orbita.tilt * Math.sin(Math.PI * Math.min(1, t / g));
    var esc = 1 + C.acercar * facil(Math.min(1, t / g));
    var inc = t < g ? C.inclinacion.carga * facil(Math.max(0, (t - e) / (g - e)))
      : C.inclinacion.carga + (C.inclinacion.golpe - C.inclinacion.carga) * salida(Math.min(1, (t - g) / Math.max(0.0001, d * 2)));
    /* el instante del contacto: cuando la cadera cruza el cero en el golpe */
    var contacto = g + d * (C.carga.cadera / (C.carga.cadera - C.remate.cadera));
    return { cadera: cad, rodilla: rod, orbitaY: oy, orbitaX: ox, inclinacion: inc, escala: esc, contacto: contacto };
  }

  return {
    suave: suave, huesos: huesos, pesos: pesos, posar: posar, puntoDelPie: puntoDelPie,
    coreografia: coreografia, COREO: COREO
  };
});
