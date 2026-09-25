/* ============================================================================
   PAMPA STAR · phaser/scenes/cine_arte.js — LOS FONDOS PINTADOS DEL CINE

   Las poses son anime ochentoso de verdad: cel con línea de tinta y sombra en
   dos tonos. Hasta acá estaban paradas sobre dos triángulos planos, una franja
   verde y un rectángulo azul. El dibujo premium flotaba sobre un fondo de
   pantalla de prueba.

   Acá se pintan los fondos como en el anime de esa época: el personaje es un
   cel y atrás hay una PINTURA —cielo en degradé, nubes con el lado del sol
   iluminado y la base plana, el horizonte pampeano con caldén, molino y
   alambrado, la tribuna de chapa del pueblo o el estadio con torres de luz, y
   el pasto con las franjas de corte en perspectiva—. El fondo va apenas
   desenfocado, como una cámara con poca profundidad de campo, así el cel
   queda nítido adelante.

   Todo es código: Canvas 2D, pintado UNA vez por partido y guardado como
   textura (una pintura por plano y por ambiente). No se toca ningún archivo
   ilustrado.

   La luz la pone la división (data/ambientes.json): la Primera B es la
   siesta del domingo, el Mundial es la gran noche. La luz es ambiente, nunca
   información: quién protagoniza cada jugada lo dicen las placas con nombre y
   la palabra VOS.

   Dos piezas:
     window.PampaPintor  · pinta sobre un contexto 2D. No sabe nada de Phaser
                           (se puede usar en una página suelta para probar).
     mixin de PampaMatch · fondoCine(tipo, opciones) pone la pintura detrás
                           del plano; si algo falla devuelve false y el plano
                           dibuja su fondo de siempre.
   ========================================================================== */
(function () {
  "use strict";
  var A = window.PampaAmbiente;
  if (!A) return;
  var W = 960, H = 540, PI2 = Math.PI * 2;
  var rgba = A.rgba, luz = A.luz, mezclar = A.mezclar;

  /* ---------------------------------------------------------------- útiles */
  function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, PI2); c.fill(); }
  function elipse(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, PI2); c.fill(); }
  function linea(c, x1, y1, x2, y2) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
  function lienzo(w, h) {
    var cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    return cv;
  }

  var P = {

    /* ============================================================ EL CIELO */
    cielo: function (c, yHor, pal, r) {
      var g = c.createLinearGradient(0, 0, 0, yHor);
      var st = pal.cielo;
      for (var i = 0; i < st.length; i++) g.addColorStop(i / (st.length - 1), st[i]);
      c.fillStyle = g; c.fillRect(0, 0, W, yHor + 2);
      /* pinceladas horizontales tenues: el gouache de los fondos de los 80 */
      for (i = 0; i < 110; i++) {
        var y = r() * yHor, w = 90 + r() * 280, x = r() * (W + 80) - 80;
        c.fillStyle = rgba(r() < 0.55 ? "#ffffff" : "#000000", 0.01 + r() * 0.018);
        c.fillRect(x, y, w, 1 + r() * 2.5);
      }
      /* de noche, estrellas (pocas: la luz del estadio las apaga) */
      if (pal.luces && !pal.sol) {
        for (i = 0; i < 70; i++) {
          c.fillStyle = rgba("#ffffff", 0.25 + r() * 0.5);
          var s = r() < 0.12 ? 2 : 1;
          c.fillRect(Math.floor(r() * W), Math.floor(r() * yHor * 0.7), s, s);
        }
      }
    },

    sol: function (c, yHor, pal) {
      var S = pal.sol;
      if (!S) return null;
      var sx = W * S.x, sy = yHor * S.y;
      c.save();
      c.globalCompositeOperation = "screen";
      var g = c.createRadialGradient(sx, sy, 0, sx, sy, S.halo_r);
      g.addColorStop(0, rgba(S.halo, S.halo_a));
      g.addColorStop(0.3, rgba(S.halo, S.halo_a * 0.45));
      g.addColorStop(1, rgba(S.halo, 0));
      c.fillStyle = g; c.fillRect(0, 0, W, yHor + 4);
      c.restore();
      c.save();
      c.shadowColor = S.halo; c.shadowBlur = S.r * 0.9;
      c.fillStyle = S.disco; circ(c, sx, sy, S.r);
      c.restore();
      return { x: sx, y: sy };
    },

    /* ---- una nube de anime: cuerpo en sombra, la masa iluminada corrida
       hacia la luz, un brillo arriba y la BASE PLANA (el sello del cúmulo).
       Al atardecer la luz viene de abajo y se da vuelta. ---- */
    nube: function (c, x, y, w, h, N, r, solX) {
      var n = 6 + Math.floor(r() * 4), b = [], i, t, bell, rr;
      /* la separación entre bollos no puede ganarle al radio: si le gana, la
         nube sale como un collar de perlas sueltas */
      var paso = w * 0.9 / (n - 1);
      for (i = 0; i < n; i++) {
        t = i / (n - 1);
        bell = Math.sin(Math.PI * (0.08 + 0.84 * t));
        rr = Math.max(h * (0.26 + 0.44 * bell), paso * (0.62 + 0.4 * bell)) * (0.85 + 0.3 * r());
        b.push({ x: x + (t - 0.5) * w * 0.9, y: y - rr * 0.5 - h * 0.28 * bell * (0.6 + 0.6 * r()), r: rr });
      }
      var extra = 2 + Math.floor(r() * 3);
      for (i = 0; i < extra; i++) {
        var p = b[1 + Math.floor(r() * (n - 2))];
        b.push({ x: p.x + (r() - 0.5) * p.r, y: p.y - p.r * (0.35 + 0.35 * r()), r: p.r * (0.5 + 0.3 * r()) });
      }
      var abajo = !!N.desde_abajo, dx = solX == null ? 1 : (solX > x ? 1 : -1);
      c.save();
      c.beginPath(); c.rect(x - w, y - h * 4, w * 2, h * 4); c.clip();
      c.fillStyle = N.sombra;
      b.forEach(function (o) { circ(c, o.x, o.y, o.r); });
      /* un medio tono entre la sombra y la luz: el tercer tono del fondo pintado */
      c.fillStyle = mezclar(N.sombra, N.luz, 0.5);
      b.forEach(function (o) { circ(c, o.x + dx * o.r * 0.08, o.y + (abajo ? 0.12 : -0.12) * o.r, o.r * 0.92); });
      c.fillStyle = N.luz;
      b.forEach(function (o) { circ(c, o.x + dx * o.r * 0.18, o.y + (abajo ? 0.26 : -0.26) * o.r, o.r * 0.8); });
      c.fillStyle = rgba("#ffffff", abajo ? 0.12 : 0.5);
      b.forEach(function (o) { if (r() < 0.55) circ(c, o.x + dx * o.r * 0.3, o.y - o.r * 0.45, o.r * 0.36); });
      c.restore();
      /* la base plana: una línea del color de abajo */
      c.fillStyle = rgba(N.base, abajo ? 0.9 : 0.55);
      c.fillRect(x - w * 0.42, y - 2, w * 0.84, abajo ? 3 : 2);
    },

    nubes: function (c, yHor, pal, r, solX, cant, escala) {
      var N = pal.nube, k, n = cant == null ? N.n : cant, e = escala || 1;
      if (!N || !n) return;
      for (k = 0; k < n; k++) {
        var w = (130 + r() * 170) * e, h = (34 + r() * 36) * e;
        var x = (k + 0.5) / n * W + (r() - 0.5) * (W / n) * 0.7;
        var y = yHor * (0.2 + r() * 0.42) + h * 0.5;
        P.nube(c, x, y, w, h, N, r, solX);
      }
      /* estratos finitos cerca del horizonte */
      for (k = 0; k < 5; k++) {
        c.fillStyle = rgba(N.luz, 0.22 + r() * 0.2);
        elipse(c, r() * W, yHor * (0.72 + r() * 0.22), (60 + r() * 150) * e, (1.5 + r() * 2.2) * e);
      }
    },

    /* ======================================================= EL HORIZONTE */
    /* una línea de montes lejanos: copas chiquitas en racimos, con bruma */
    lejanos: function (c, y, alto, color, r) {
      c.fillStyle = color;
      c.fillRect(0, y - 1, W, 4);
      var x = -10;
      while (x < W + 10) {
        var largo = 30 + r() * 110;
        if (r() < 0.72) {
          var n = Math.max(2, Math.floor(largo / 8));
          for (var i = 0; i < n; i++) {
            var rr = alto * (0.35 + 0.65 * r());
            circ(c, x + (i / n) * largo, y - rr * 0.75, rr);
          }
        }
        x += largo + r() * 40;
      }
    },

    /* el molino pampeano: torre reticulada, rueda de aspas y cola */
    molino: function (c, x, yBase, h, color) {
      var top = yBase - h, ancho = h * 0.24, i;
      c.strokeStyle = color; c.fillStyle = color;
      c.lineWidth = Math.max(1, h * 0.028);
      linea(c, x - ancho / 2, yBase, x - h * 0.025, top + h * 0.16);
      linea(c, x + ancho / 2, yBase, x + h * 0.025, top + h * 0.16);
      c.lineWidth = Math.max(0.8, h * 0.016);
      for (i = 1; i <= 4; i++) {
        var yy = yBase - i * h * 0.17, f = (yBase - yy) / (h * 0.84);
        var hw = ancho / 2 + (h * 0.025 - ancho / 2) * f;
        linea(c, x - hw, yy, x + hw, yy);
        var yy2 = yy + h * 0.17, f2 = (yBase - yy2) / (h * 0.84), hw2 = ancho / 2 + (h * 0.025 - ancho / 2) * f2;
        linea(c, x - hw2, yy2, x + hw, yy);
      }
      /* la rueda */
      var cx = x, cy = top + h * 0.1, R = h * 0.23, n = 16;
      c.lineWidth = Math.max(0.8, h * 0.012);
      c.beginPath(); c.arc(cx, cy, R, 0, PI2); c.stroke();
      for (i = 0; i < n; i++) {
        var a = i / n * PI2, a2 = a + 0.13;
        c.beginPath();
        c.moveTo(cx + Math.cos(a) * R * 0.28, cy + Math.sin(a) * R * 0.28);
        c.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        c.lineTo(cx + Math.cos(a2) * R, cy + Math.sin(a2) * R);
        c.closePath(); c.fill();
      }
      circ(c, cx, cy, R * 0.16);
      /* la cola */
      c.lineWidth = Math.max(0.8, h * 0.016);
      linea(c, cx, cy, cx + R * 1.5, cy + R * 0.05);
      c.beginPath();
      c.moveTo(cx + R * 1.2, cy - R * 0.3); c.lineTo(cx + R * 1.75, cy - R * 0.22);
      c.lineTo(cx + R * 1.75, cy + R * 0.34); c.lineTo(cx + R * 1.2, cy + R * 0.26);
      c.closePath(); c.fill();
    },

    /* el caldén: tronco corto y torcido, ramas que se abren, copa de paraguas */
    calden: function (c, x, yBase, h, pal, r) {
      var tronco = luz(pal.monte, -0.25), i;
      c.fillStyle = tronco; c.strokeStyle = tronco;
      c.beginPath();
      c.moveTo(x - h * 0.06, yBase); c.lineTo(x + h * 0.07, yBase);
      c.lineTo(x + h * 0.045, yBase - h * 0.3); c.lineTo(x - h * 0.03, yBase - h * 0.32);
      c.closePath(); c.fill();
      c.lineCap = "round";
      var ramas = [[-0.42, 0.58, 0.05], [-0.2, 0.7, 0.04], [0.12, 0.72, 0.04], [0.4, 0.6, 0.045], [0.02, 0.78, 0.03]];
      ramas.forEach(function (q) {
        c.lineWidth = h * q[2];
        c.beginPath(); c.moveTo(x, yBase - h * 0.3);
        c.quadraticCurveTo(x + h * q[0] * 0.4, yBase - h * (q[1] - 0.1), x + h * q[0], yBase - h * q[1]);
        c.stroke();
      });
      c.lineCap = "butt";
      /* la copa: racimos achatados sobre una cúpula ancha */
      var hojas = [];
      for (i = 0; i < 46; i++) {
        var t = r(), cx = x + (t - 0.5) * h * 1.4;
        var dome = Math.sqrt(Math.max(0, 1 - Math.pow((cx - x) / (h * 0.72), 2)));
        hojas.push({ x: cx, y: yBase - h * 0.6 - dome * h * 0.26 * (0.4 + 0.6 * r()), r: h * (0.06 + 0.07 * r()) });
      }
      c.fillStyle = pal.monte;
      hojas.forEach(function (o) { elipse(c, o.x, o.y, o.r * 1.35, o.r * 0.8); });
      c.fillStyle = pal.monte_luz;
      hojas.forEach(function (o) { if (r() < 0.62) elipse(c, o.x - o.r * 0.25, o.y - o.r * 0.3, o.r * 0.9, o.r * 0.5); });
    },

    /* el alambrado: postes de madera desparejos y cinco hilos */
    alambrado: function (c, y, alto, pal, r) {
      var madera = luz(pal.monte, -0.1), x = 4;
      c.strokeStyle = rgba(luz(pal.lejos, -0.3), 0.55); c.lineWidth = 1;
      for (var k = 0; k < 5; k++) { var yy = y - alto * (0.18 + k * 0.18); linea(c, 0, yy, W, yy + (r() - 0.5)); }
      while (x < W) {
        var ah = alto * (0.95 + r() * 0.2), an = Math.max(2, alto * 0.14);
        c.fillStyle = madera; c.fillRect(x, y - ah, an, ah);
        c.fillStyle = rgba("#ffffff", 0.12); c.fillRect(x, y - ah, 1, ah);
        x += alto * (2.6 + r() * 1.6);
      }
    },

    /* la hinchada: cabezas en filas, casi todas oscuras, algunas camisetas
       claras y algún brazo arriba */
    gente: function (c, x0, x1, yBase, filas, paso, cab, pal, r, luzArriba) {
      for (var f = 0; f < filas; f++) {
        var y = yBase - f * cab * 3.2, x = x0 + r() * paso;
        while (x < x1) {
          var col = pal.gente[Math.floor(r() * pal.gente.length)];
          if (r() < 0.55) col = pal.gente[Math.floor(r() * 3)];
          col = luz(col, luzArriba ? (f / filas) * 0.18 : -(f / filas) * 0.1);
          c.fillStyle = col;
          c.fillRect(x - cab, y - cab * 0.4, cab * 2, cab * 2.6);
          c.fillStyle = luz(col, -0.25);
          circ(c, x, y - cab * 1.2, cab * 0.95);
          if (r() < 0.12) {
            c.strokeStyle = col; c.lineWidth = Math.max(1, cab * 0.5);
            linea(c, x + cab * 0.8, y - cab * 0.2, x + cab * 1.3, y - cab * 3);
          }
          x += paso * (0.75 + r() * 0.5);
        }
      }
    },

    /* la tribuna del pueblo: techo de chapa acanalada inclinado, postes,
       la gente abajo a la sombra y la baranda */
    tribunaPueblo: function (c, x, yBase, w, h, pal, r) {
      var techoY = yBase - h, i;
      c.fillStyle = luz(pal.chapa, -0.55);
      c.fillRect(x, techoY + h * 0.1, w, h * 0.9);
      P.gente(c, x + 4, x + w - 4, yBase - h * 0.08, 4, h * 0.075, Math.max(1.6, h * 0.028), pal, r, false);
      c.fillStyle = luz(pal.chapa, -0.4);
      for (i = 0; i <= 5; i++) c.fillRect(x + (w - 4) * i / 5, techoY + h * 0.08, Math.max(2, h * 0.035), h * 0.92);
      /* el techo */
      c.beginPath();
      c.moveTo(x - w * 0.03, techoY + h * 0.14); c.lineTo(x + w * 1.03, techoY + h * 0.2);
      c.lineTo(x + w * 1.0, techoY + h * 0.04); c.lineTo(x + w * 0.0, techoY - h * 0.02);
      c.closePath();
      c.fillStyle = pal.chapa; c.fill();
      c.save(); c.clip();
      c.strokeStyle = rgba(luz(pal.chapa, -0.35), 0.7); c.lineWidth = 1;
      for (i = 0; i < w * 1.1; i += 5) linea(c, x - w * 0.03 + i, techoY - h * 0.05, x - w * 0.03 + i + 2, techoY + h * 0.22);
      c.fillStyle = rgba(luz(pal.chapa, 0.35), 0.5);
      c.fillRect(x - w * 0.05, techoY - h * 0.05, w * 1.1, h * 0.04);
      c.restore();
      /* la baranda */
      c.fillStyle = luz(pal.chapa, -0.2);
      c.fillRect(x - 2, yBase - h * 0.14, w + 4, Math.max(2, h * 0.03));
    },

    /* las torres de luz: la columna, el tablero de lámparas y el halo */
    torre: function (c, x, yPie, alto, pal, r, escala) {
      var e = escala || 1, top = yPie - alto;
      c.fillStyle = luz(pal.monte, 0.05);
      c.fillRect(x - 2 * e, top, 4 * e, alto);
      c.save();
      c.globalCompositeOperation = "screen";
      var g = c.createRadialGradient(x, top, 0, x, top, 150 * e);
      g.addColorStop(0, rgba("#fffbe8", 0.75)); g.addColorStop(0.25, rgba("#fff0c0", 0.28)); g.addColorStop(1, rgba("#fff0c0", 0));
      c.fillStyle = g; c.fillRect(x - 160 * e, top - 160 * e, 320 * e, 320 * e);
      /* el cono que baja a la cancha */
      var g2 = c.createLinearGradient(0, top, 0, yPie + 80);
      g2.addColorStop(0, rgba("#fff6d8", 0.12)); g2.addColorStop(1, rgba("#fff6d8", 0));
      c.fillStyle = g2;
      c.beginPath(); c.moveTo(x - 10 * e, top); c.lineTo(x + 10 * e, top); c.lineTo(x + 140 * e, yPie + 80); c.lineTo(x - 140 * e, yPie + 80); c.closePath(); c.fill();
      c.restore();
      c.fillStyle = "#2a2e3a"; c.fillRect(x - 16 * e, top - 10 * e, 32 * e, 14 * e);
      c.fillStyle = "#fffbe8";
      for (var i = 0; i < 4; i++) for (var j = 0; j < 2; j++) c.fillRect(x - 14 * e + i * 7.5 * e, top - 8 * e + j * 6 * e, 5 * e, 4 * e);
    },

    /* el estadio: gradas en bandas con la gente en puntitos, techo y torres */
    estadio: function (c, yBase, alto, pal, r, tipo) {
      var bandas = tipo === "estadio_chico" ? 1 : (tipo === "estadio_grande" ? 3 : 2);
      var hb = alto / bandas, b, x, y;
      for (b = 0; b < bandas; b++) {
        var y1 = yBase - (b + 1) * hb, y0 = yBase - b * hb;
        var fondo = luz(pal.chapa, 0.1 + b * 0.04);
        c.fillStyle = fondo; c.fillRect(0, y1, W, hb);
        var paso = tipo === "estadio_chico" ? 4 : 3;
        for (y = y1 + 3; y < y0 - 2; y += paso) {
          for (x = r() * paso; x < W; x += paso * (0.8 + r() * 0.5)) {
            var col = pal.gente[Math.floor(r() * pal.gente.length)];
            c.fillStyle = rgba(col, 0.55 + r() * 0.45);
            c.fillRect(x, y, 2, 2);
          }
        }
        /* la luz de las torres cae arriba de cada banda */
        var g = c.createLinearGradient(0, y1, 0, y0);
        g.addColorStop(0, rgba("#000000", 0.35)); g.addColorStop(0.3, rgba("#000000", 0)); g.addColorStop(1, rgba("#000000", 0.15));
        c.fillStyle = g; c.fillRect(0, y1, W, hb);
        c.fillStyle = rgba("#ffffff", 0.18); c.fillRect(0, y0 - 2, W, 1);
      }
      /* flashes de cámaras en la gran noche */
      if (tipo === "estadio_grande") {
        c.save(); c.globalCompositeOperation = "screen";
        for (var k = 0; k < 26; k++) {
          var fx = r() * W, fy = yBase - r() * alto;
          var gf = c.createRadialGradient(fx, fy, 0, fx, fy, 7);
          gf.addColorStop(0, rgba("#ffffff", 0.95)); gf.addColorStop(1, rgba("#ffffff", 0));
          c.fillStyle = gf; c.fillRect(fx - 7, fy - 7, 14, 14);
        }
        c.restore();
      }
      /* el borde del techo */
      c.fillStyle = luz(pal.chapa, -0.3);
      c.fillRect(0, yBase - alto - 10, W, 10);
      c.fillStyle = rgba("#ffffff", 0.12); c.fillRect(0, yBase - alto - 10, W, 1);
      /* los carteles de la baranda: lisos, sin marca */
      var cx = 0, alt = Math.max(6, alto * 0.08), tonos = [luz(pal.monte_luz, 0.1), luz(pal.chapa, 0.25)];
      for (k = 0; cx < W; k++) {
        var cw = 70 + r() * 60;
        c.fillStyle = tonos[k % 2]; c.fillRect(cx, yBase - alt, cw - 3, alt);
        c.fillStyle = rgba("#ffffff", 0.2); c.fillRect(cx, yBase - alt, cw - 3, 1);
        cx += cw;
      }
    },

    /* ============================================================ EL PASTO
       yHor = el horizonte (hacia donde fugan las franjas); yIni = desde dónde
       se pinta (puede ser más abajo: detrás del alambrado ya no es cancha). */
    pasto: function (c, yHor, yIni, pal, r, o) {
      o = o || {};
      var span = H - yIni, st = pal.pasto, i;
      var g = c.createLinearGradient(0, yIni, 0, H);
      for (i = 0; i < st.length; i++) g.addColorStop(i / (st.length - 1), st[i]);
      c.fillStyle = g; c.fillRect(0, yIni, W, span + 2);
      /* las franjas de corte, en perspectiva: y = yHor + C / d */
      var C = (H - yHor) * 1.0, paso = o.paso || 0.55, d = 1, k = 0;
      while (k < 200) {
        var yA = yHor + C / d, yB = yHor + C / (d + paso);
        if (yA - yB < 0.8 || yB < yIni) break;
        if (k % 2 === 1) { c.fillStyle = rgba("#ffffff", pal.franja); c.fillRect(0, yB, W, yA - yB); }
        else { c.fillStyle = rgba("#000000", pal.franja * 0.55); c.fillRect(0, yB, W, yA - yB); }
        d += paso; k++;
      }
      /* peladas de tierra (la cancha del pueblo) */
      var np = o.peladas != null ? o.peladas : (pal.peladas || 0);
      for (i = 0; i < np; i++) {
        var py = yIni + span * (0.35 + r() * 0.55), prof = (py - yHor) / (H - yHor);
        var px = W * (0.1 + r() * 0.8), rx = (40 + r() * 60) * prof * 1.6, ry = rx * 0.2;
        /* la pelada: varias manchas que se pisan (borde irregular), núcleo
           más gastado, y piedritas y terrones sueltos */
        for (var m = 0; m < 4; m++) {
          var mx = px + (r() - 0.5) * rx * 0.9, my = py + (r() - 0.5) * ry * 0.9, mr = rx * (0.45 + r() * 0.4);
          var gt = c.createRadialGradient(mx, my, 0, mx, my, mr);
          gt.addColorStop(0, rgba(pal.tierra, 0.8)); gt.addColorStop(0.7, rgba(pal.tierra, 0.55)); gt.addColorStop(1, rgba(pal.tierra, 0));
          c.save(); c.translate(mx, my); c.scale(1, ry / rx); c.translate(-mx, -my);
          c.fillStyle = gt; c.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
          c.restore();
        }
        for (m = 0; m < rx * 0.8; m++) {
          c.fillStyle = rgba(r() < 0.5 ? luz(pal.tierra, 0.3) : luz(pal.tierra, -0.35), 0.7);
          var s = Math.max(1, prof * 2);
          c.fillRect(px + (r() - 0.5) * rx * 1.3, py + (r() - 0.5) * ry * 1.3, s, s * 0.7);
        }
      }
      /* textura: briznas cortas, más grandes cuanto más cerca */
      for (i = 0; i < 2200; i++) {
        var y = yIni + span * Math.pow(r(), 0.8), f = (y - yHor) / (H - yHor);
        var L = 1 + 7 * f;
        c.fillStyle = rgba(r() < 0.5 ? luz(st[1], 0.3) : luz(st[3], -0.3), 0.22 + r() * 0.2);
        c.fillRect(r() * W, y - L, Math.max(1, f * 1.6), L);
      }
      /* marquitas de tinta: la "v" de pasto que el dibujante hace a mano (la
         misma que tiene la tierra de la tribuna ilustrada). Pocas y solo de
         la mitad para adelante, para que no se vuelva un patrón */
      c.strokeStyle = rgba(luz(st[3], -0.45), 0.4); c.lineWidth = 1;
      for (i = 0; i < 70; i++) {
        var ty = yIni + span * (0.45 + 0.55 * r()), tf = (ty - yHor) / (H - yHor), tl = 3 + 6 * tf, tx = r() * W;
        c.beginPath();
        c.moveTo(tx - tl * 0.5, ty - tl); c.lineTo(tx, ty); c.lineTo(tx + tl * 0.35, ty - tl * 1.1);
        c.moveTo(tx + tl * 0.9, ty - tl * 0.7); c.lineTo(tx + tl * 1.1, ty);
        c.stroke();
      }
      /* la bruma pegada al horizonte */
      var gb = c.createLinearGradient(0, yIni, 0, yIni + 40);
      gb.addColorStop(0, rgba(pal.bruma, 0.5)); gb.addColorStop(1, rgba(pal.bruma, 0));
      c.fillStyle = gb; c.fillRect(0, yIni, W, 40);
      /* de noche, los charcos de luz de las torres sobre el césped */
      if (pal.luces && !pal.sol) {
        c.save(); c.globalCompositeOperation = "screen";
        [0.22, 0.78].forEach(function (fx) {
          var cx = W * fx, cy = yIni + span * 0.55;
          var gl = c.createRadialGradient(cx, cy, 0, cx, cy, W * 0.4);
          gl.addColorStop(0, rgba("#dfffd0", 0.22)); gl.addColorStop(1, rgba("#dfffd0", 0));
          c.fillStyle = gl; c.fillRect(0, yIni, W, span);
        });
        c.restore();
      }
    },

    /* matas en primer plano: enmarcan abajo y dan escala */
    matas: function (c, pal, r) {
      var oscuro = luz(pal.pasto[3], -0.35);
      c.fillStyle = oscuro;
      for (var x = -4; x < W + 4; x += 3 + r() * 4) {
        var borde = Math.abs(x / W - 0.5) * 2;
        var alto = 4 + Math.pow(borde, 2) * 26 + r() * 8;
        c.beginPath();
        c.moveTo(x - 2.5, H); c.lineTo(x + (r() - 0.5) * 8, H - alto); c.lineTo(x + 2.5, H);
        c.closePath(); c.fill();
      }
    },

    vineta: function (c, fuerza) {
      var g = c.createRadialGradient(W / 2, H * 0.48, H * 0.35, W / 2, H * 0.48, W * 0.72);
      g.addColorStop(0, rgba("#000000", 0)); g.addColorStop(1, rgba("#000000", fuerza));
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    },

    /* el fondo lejano de una cancha: pueblo (campo, caldén, molino, tribuna de
       chapa, alambrado) o estadio (gradas y torres). Devuelve dónde empieza
       el pasto de la cancha. */
    lejano: function (c, yHor, pal, r, o) {
      o = o || {};
      var e = o.escala || 1;
      if (pal.tribuna === "pueblo") {
        P.lejanos(c, yHor, 7 * e, pal.lejos, r);
        var gc = c.createLinearGradient(0, yHor, 0, yHor + 14 * e);
        gc.addColorStop(0, pal.campo[0]); gc.addColorStop(1, pal.campo[1]);
        c.fillStyle = gc; c.fillRect(0, yHor + 1, W, 14 * e + 2);
        if (o.molino !== false) P.molino(c, W * (o.molinoX || 0.62), yHor + 5 * e, 54 * e, luz(pal.lejos, -0.35));
        if (o.calden !== false) P.calden(c, W * (o.caldenX || 0.86), yHor + 14 * e, 128 * e, pal, r);
        if (o.tribuna !== false) P.tribunaPueblo(c, W * (o.tribunaX || 0.02), yHor + 18 * e, W * (o.tribunaW || 0.4), 76 * e, pal, r);
        P.alambrado(c, yHor + 20 * e, 15 * e, pal, r);
        return yHor + 20 * e;
      }
      /* estadio: las gradas arrancan un poco más adelante del horizonte */
      var base = yHor + 22 * e, alto = (pal.tribuna === "estadio_chico" ? 70 : (pal.tribuna === "estadio_grande" ? 150 : 110)) * e;
      if (pal.tribuna === "estadio_chico") {
        P.lejanos(c, yHor, 8 * e, pal.lejos, r);
        P.estadio(c, base, alto, pal, r, pal.tribuna);
        P.torre(c, W * 0.1, base - alto, 120 * e, pal, r, e);
        P.torre(c, W * 0.9, base - alto, 120 * e, pal, r, e);
      } else {
        [0.08, 0.92].concat(pal.tribuna === "estadio_grande" ? [0.33, 0.67] : []).forEach(function (fx) {
          P.torre(c, W * fx, base - alto, (pal.tribuna === "estadio_grande" ? 90 : 120) * e, pal, r, e);
        });
        P.estadio(c, base, alto, pal, r, pal.tribuna);
      }
      return base;
    },

    /* ======================================================= COMPOSICIONES */

    /* ESCENA: la viñeta de la jugada. Cámara baja (el horizonte abajo, mucho
       cielo: el plano heroico), el fondo desenfocado y matas adelante. */
    escena: function (c, pal, r, o) {
      var yHor = Math.round(H * 0.62);
      var cv = lienzo(W, H), f = cv.getContext("2d");
      P.cielo(f, yHor, pal, r);
      var sol = P.sol(f, yHor, pal);
      P.nubes(f, yHor, pal, r, sol ? sol.x : null);
      var yCancha = P.lejano(f, yHor, pal, r, {});
      /* profundidad de campo: todo lo lejano, apenas fuera de foco */
      c.filter = "blur(1.3px)";
      c.drawImage(cv, 0, 0);
      c.filter = "none";
      P.pasto(c, yHor, yCancha, pal, r, {});
      P.matas(c, pal, r);
      P.vineta(c, pal.luces && !pal.sol ? 0.5 : 0.32);
    },

    /* GOLPE: el fondo abstracto del momento fuerte —degradé radial, líneas de
       foco que convergen sin tocar el centro y trama de puntos en las
       esquinas—. No depende de la hora: depende del bando. */
    golpe: function (c, cols, r, o) {
      o = o || {};
      var cx = W * (o.cx != null ? o.cx : 0.42), cy = H * (o.cy != null ? o.cy : 0.5);
      var R = Math.hypot(W, H) * 0.62, i;
      var g = c.createRadialGradient(cx, cy, 0, cx, cy, R);
      g.addColorStop(0, cols[0]); g.addColorStop(0.2, cols[1]); g.addColorStop(0.55, cols[2]); g.addColorStop(1, cols[3]);
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      /* trama de puntos (screentone) en las esquinas */
      for (var y = 4; y < H; y += 9) {
        for (var x = 4 + ((y / 9) % 2) * 4.5; x < W; x += 9) {
          var dn = Math.hypot((x - cx) / (W * 0.6), (y - cy) / (H * 0.6));
          if (dn < 0.78) continue;
          c.fillStyle = rgba(cols[3], 0.4);
          circ(c, x, y, Math.min(3.4, (dn - 0.78) * 7));
        }
      }
      /* las líneas de foco */
      for (i = 0; i < 170; i++) {
        var a = r() * PI2, co = Math.cos(a), si = Math.sin(a);
        var rin = 0.3 + r() * 0.22;
        var tx = cx + co * W * 0.5 * rin, ty = cy + si * H * 0.5 * rin;
        var ox = cx + co * 1300, oy = cy + si * 1300;
        var w = r() < 0.08 ? 16 + r() * 10 : 2 + r() * 8;
        var oscura = r() < 0.16;
        c.fillStyle = oscura ? rgba(cols[3], 0.3) : rgba("#ffffff", 0.22 + r() * 0.5);
        c.beginPath();
        c.moveTo(tx, ty); c.lineTo(ox - si * w, oy + co * w); c.lineTo(ox + si * w, oy - co * w);
        c.closePath(); c.fill();
      }
    },

    /* PROFUNDA: el plano del viaje, desde atrás del que patea hacia el arco.
       La fuga y el ancho del pasillo son los mismos que usa la pelota
       (PampaPersp), así la pelota viaja SOBRE esta cancha. */
    profunda: function (c, pal, r, o) {
      o = o || {};
      var vp = o.vp || { x: W / 2, y: H * 0.24 }, nearY = o.nearY || H * 0.96, k = o.k || 2.2;
      var Pp = window.PampaPersp, yHor = vp.y;
      var cv = lienzo(W, H), f = cv.getContext("2d");
      P.cielo(f, yHor + 30, pal, r);
      var sol = P.sol(f, yHor, pal);
      P.nubes(f, yHor, pal, r, sol ? sol.x : null, 3, 0.6);
      P.lejano(f, yHor - 18, pal, r, { escala: 0.55, tribunaX: 0.08, tribunaW: 0.3, molinoX: 0.28, caldenX: 0.8 });
      c.filter = "blur(1px)"; c.drawImage(cv, 0, 0); c.filter = "none";
      P.pasto(c, yHor - 18, yHor - 7, pal, r, { paso: 0.35, peladas: pal.peladas ? 2 : 0 });
      /* las líneas de cal sobre el mismo pasillo que usa la pelota */
      function yDe(d) { return Pp ? Pp.aPantalla(d, { k: k, vpX: vp.x, vpY: vp.y, nearY: nearY }).y : vp.y + (nearY - vp.y) * (1 - d); }
      function mitad(y) { return 34 + (W / 2 - 34) * ((y - vp.y) / (H - vp.y)); }
      function pt(u, d) { var y = yDe(d); return { x: vp.x + u * mitad(y), y: y }; }
      c.strokeStyle = rgba("#f4fff0", 0.62); c.lineCap = "round";
      function tramo(u1, d1, u2, d2, ancho) {
        var a = pt(u1, d1), b = pt(u2, d2);
        c.lineWidth = ancho; linea(c, a.x, a.y, b.x, b.y);
      }
      var L = 1.3;
      /* la línea de gol, de lado a lado */
      c.lineWidth = 2; linea(c, 0, yDe(1) + 1, W, yDe(1) + 1);
      /* el área grande y el área chica */
      tramo(-5.5, 1, -5.5, 0.34, 2 * L); tramo(5.5, 1, 5.5, 0.34, 2 * L); tramo(-5.5, 0.34, 5.5, 0.34, 2.4 * L);
      tramo(-2.5, 1, -2.5, 0.8, 1.6 * L); tramo(2.5, 1, 2.5, 0.8, 1.6 * L); tramo(-2.5, 0.8, 2.5, 0.8, 1.8 * L);
      var pen = pt(0, 0.56);
      c.fillStyle = rgba("#f4fff0", 0.7); elipse(c, pen.x, pen.y, 4, 1.8);
      /* el arco al fondo: red con fondo, palos con sombra */
      var gw = 78, gh = 34, gx = vp.x - gw / 2, gy = vp.y - gh;
      c.fillStyle = rgba("#000000", 0.22); c.fillRect(gx, gy, gw, gh);
      c.strokeStyle = rgba("#e8f2f6", 0.5); c.lineWidth = 1;
      for (var x = 0; x <= gw; x += 6) linea(c, gx + x, gy, gx + x, gy + gh);
      for (var y = 0; y <= gh; y += 5) linea(c, gx, gy + y, gx + gw, gy + y);
      c.fillStyle = rgba("#000000", pal.sombra * 0.6);
      c.beginPath(); c.moveTo(gx - 3, vp.y); c.lineTo(gx + gw + 4, vp.y); c.lineTo(gx + gw + 20, vp.y + 5); c.lineTo(gx + 14, vp.y + 5); c.closePath(); c.fill();
      c.fillStyle = "#ffffff";
      c.fillRect(gx - 3, gy - 3, 4, gh + 3); c.fillRect(gx + gw, gy - 3, 4, gh + 3); c.fillRect(gx - 3, gy - 3, gw + 7, 4);
      c.fillStyle = "#b8c4cc";
      c.fillRect(gx - 1, gy, 2, gh); c.fillRect(gx + gw + 2, gy, 2, gh); c.fillRect(gx - 1, gy, gw + 3, 1);
      P.vineta(c, 0.3);
    },

    /* ARCO: el plano de frente al arco (el arquero, el desenlace). El arco lo
       dibuja la escena encima con su geometría (arcoCine); acá va lo que está
       detrás y alrededor: el fondo, el pasto, la línea de gol, las áreas, el
       interior en sombra y la SOMBRA del arco en el césped. */
    arco: function (c, pal, r, o) {
      var Ag = o.arco;
      var yHor = Math.round(Ag.linea - Ag.h * 0.66);
      var cv = lienzo(W, H), f = cv.getContext("2d");
      P.cielo(f, yHor + 30, pal, r);
      var sol = P.sol(f, yHor, pal);
      P.nubes(f, yHor, pal, r, sol ? sol.x : null, 4, 0.8);
      var yCancha = P.lejano(f, yHor, pal, r, { escala: 0.95, tribunaX: 0.18, tribunaW: 0.64, molinoX: 0.08, caldenX: 0.93 });
      c.filter = "blur(1.5px)"; c.drawImage(cv, 0, 0); c.filter = "none";
      P.pasto(c, yHor, yCancha, pal, r, { paso: 0.45, peladas: pal.peladas ? 3 : 0 });
      /* la sombra del arco: de día una, con torres dos (una por torre) */
      var dirs = pal.sol ? [((sol && sol.x > W / 2) ? -1 : 1) * 0.55] : [-0.4, 0.4];
      dirs.forEach(function (dx) {
        c.fillStyle = rgba("#000000", pal.sombra * (pal.sol ? 0.5 : 0.32));
        var sx = dx * Ag.h, sy = Ag.h * 0.2;
        [Ag.izq - 6, Ag.der].forEach(function (px) {
          c.beginPath();
          c.moveTo(px, Ag.linea); c.lineTo(px + 8, Ag.linea); c.lineTo(px + 8 + sx, Ag.linea + sy); c.lineTo(px + sx, Ag.linea + sy);
          c.closePath(); c.fill();
        });
        c.beginPath();
        c.moveTo(Ag.izq - 6 + sx, Ag.linea + sy); c.lineTo(Ag.der + 8 + sx, Ag.linea + sy);
        c.lineTo(Ag.der + 8 + sx, Ag.linea + sy + 6); c.lineTo(Ag.izq - 6 + sx, Ag.linea + sy + 6);
        c.closePath(); c.fill();
      });
      /* la línea de gol y el área chica */
      c.fillStyle = rgba("#f4fff0", 0.72);
      c.fillRect(0, Ag.linea - 1, W, 4);
      c.strokeStyle = rgba("#f4fff0", 0.66); c.lineWidth = 3;
      var chicaAdel = Ag.linea + 64, abreI = Ag.izq - Ag.w * 0.42, abreD = Ag.der + Ag.w * 0.42;
      linea(c, Ag.izq - Ag.w * 0.3, Ag.linea, abreI, chicaAdel);
      linea(c, Ag.der + Ag.w * 0.3, Ag.linea, abreD, chicaAdel);
      c.lineWidth = 3.5; linea(c, abreI, chicaAdel, abreD, chicaAdel);
      /* el área grande: la línea de adelante, casi en el borde */
      c.lineWidth = 5; linea(c, -20, Ag.linea + 176, W + 20, Ag.linea + 176);
      c.fillStyle = rgba("#f4fff0", 0.75); elipse(c, Ag.cx, Ag.linea + 128, 7, 2.6);
      /* el interior del arco en sombra: se lee como un volumen, no como una
         reja pintada sobre el cielo */
      var gi = c.createLinearGradient(0, Ag.travesano, 0, Ag.linea);
      gi.addColorStop(0, rgba("#000000", 0.32)); gi.addColorStop(1, rgba("#000000", 0.14));
      c.fillStyle = gi; c.fillRect(Ag.izq, Ag.travesano, Ag.w, Ag.h);
      /* el fondo de la red: su borde de abajo queda más arriba (está más lejos) */
      c.strokeStyle = rgba("#e8f2f6", 0.35); c.lineWidth = 2;
      linea(c, Ag.izq + 16, Ag.linea - 16, Ag.der - 16, Ag.linea - 16);
      linea(c, Ag.izq, Ag.linea, Ag.izq + 16, Ag.linea - 16);
      linea(c, Ag.der, Ag.linea, Ag.der - 16, Ag.linea - 16);
      P.matas(c, pal, r);
      P.vineta(c, pal.luces && !pal.sol ? 0.45 : 0.28);
    },

    /* CANCHA ALTA: el pasto debajo de la tribuna ilustrada (fondo_tribuna
       tapa todo lo de arriba). Solo el césped, con su fuga. */
    canchaAlta: function (c, pal, r, o) {
      var y0 = o.y0 || Math.round(H * 0.34);
      c.fillStyle = pal.pasto[0]; c.fillRect(0, 0, W, H);
      /* en las divisiones de estadio la ilustración de la tribuna del pueblo
         no va (sería la cancha del pueblo en el Mundial): se pinta el estadio
         de la misma división, así la escena y la viñeta de al lado son el
         mismo lugar */
      if (pal.tribuna !== "pueblo") {
        var e = y0 / 184, cv = lienzo(W, H), f = cv.getContext("2d");
        P.cielo(f, y0, pal, r);
        P.nubes(f, y0 * 0.7, pal, r, null, 2, 0.5 * e);
        P.lejano(f, y0 - 22 * e, pal, r, { escala: e });
        c.filter = "blur(1.2px)"; c.drawImage(cv, 0, 0); c.filter = "none";
        P.pasto(c, y0 - 46, y0, pal, r, { paso: 0.4 });
        P.vineta(c, 0.3);
        return;
      }
      P.pasto(c, y0 - 46, y0, pal, r, { paso: 0.4 });
      /* la costura con la ilustración: la tribuna termina en tierra seca, así
         que el pasto no arranca en seco — hay una banda de tierra que se va
         cubriendo de pasto, con matas que asoman */
      /* #d1a36f: el color medido al pie de fondo_tribuna.webp (x 500, 6 px
         arriba del borde). Si la ilustración va teñida, llega ya multiplicado */
      var tierra = o.tierra || "#d1a36f";
      var gt = c.createLinearGradient(0, y0, 0, y0 + 26);
      gt.addColorStop(0, rgba(tierra, 1)); gt.addColorStop(0.45, rgba(mezclar(tierra, pal.pasto[0], 0.5), 0.8)); gt.addColorStop(1, rgba(pal.pasto[0], 0));
      c.fillStyle = gt; c.fillRect(0, y0, W, 26);
      c.fillStyle = luz(pal.pasto[1], -0.1);
      for (var x = 0; x < W; x += 2 + r() * 5) {
        var alto = 3 + r() * 9, yb = y0 + 10 + r() * 14;
        c.beginPath(); c.moveTo(x - 1.5, yb); c.lineTo(x + (r() - 0.5) * 4, yb - alto); c.lineTo(x + 1.5, yb); c.closePath(); c.fill();
      }
      P.vineta(c, 0.26);
    },

    /* la puerta de entrada: pinta un tipo de fondo sobre un contexto 960x540 */
    pintar: function (c, tipo, pal, golpes, o) {
      o = o || {};
      var r = A.rngDe(o.semilla || tipo);
      c.save();
      c.clearRect(0, 0, W, H);
      if (tipo === "golpe") P.golpe(c, (golpes && golpes[o.bando || "mio"]) || ["#ffffff", "#aaaaaa", "#555555", "#000000"], r, o);
      else if (tipo === "escena") P.escena(c, pal, r, o);
      else if (tipo === "profunda") P.profunda(c, pal, r, o);
      else if (tipo === "arco") P.arco(c, pal, r, o);
      else if (tipo === "cancha_alta") P.canchaAlta(c, pal, r, o);
      c.restore();
    }
  };
  window.PampaPintor = P;

  /* ======================================================================
     EL MIXIN: la escena pide un fondo por tipo y lo recibe detrás del plano.
     ====================================================================== */
  if (!window.PampaMatch) return;
  /* las pinturas vivas: clave de textura → ambiente (las texturas son del
     juego entero, no de la escena, así que el registro también) */
  var PINTADAS = {};
  /* los pies medidos de cada pose (clave de textura → fracciones) */
  var PIES = {};
  Object.assign(window.PampaMatch.prototype, {

    /* el ambiente del partido: la división del Master, o el de sin división */
    ambienteDelPartido() {
      var data = this.game.registry.get("ambientes");
      if (!data || !data.ambientes) return { id: null, pal: null, data: null };
      var div = this._masterPartido && this._masterPartido.division;
      var amb = A.ambienteDe(div, data);
      amb.data = data;
      return amb;
    },

    /* la textura de un fondo, pintada la primera vez y reusada después.
       Devuelve la clave, o null si no se puede pintar. */
    texturaDeFondo(tipo, o) {
      o = o || {};
      var amb = this.ambienteDelPartido();
      if (!amb.data || (!amb.pal && tipo !== "golpe")) return null;
      var key = A.claveDeFondo(tipo, amb.id, o);
      if (this.textures.exists(key)) return key;
      /* un ambiente por vez en memoria: al cambiar de división, las pinturas
         de la anterior se van (cada una son 2 MB de textura) */
      if (tipo !== "golpe") {
        var self = this;
        A.pinturasDeOtroAmbiente(PINTADAS, amb.id).forEach(function (k) {
          if (self.textures.exists(k)) self.textures.remove(k);
          delete PINTADAS[k];
        });
      }
      var ct = this.textures.createCanvas(key, W, H);
      if (!ct) return null;
      try {
        P.pintar(ct.getContext(), tipo, amb.pal, amb.data.golpe, Object.assign({ semilla: key }, o));
        ct.refresh();
        if (tipo !== "golpe") PINTADAS[key] = amb.id;
      } catch (e) {
        console.error("[cine_arte] no se pudo pintar " + key + ": " + (e && e.message));
        this.textures.remove(key);
        return null;
      }
      return key;
    },

    /* pone la pintura detrás del plano. false = el plano dibuja su fondo viejo */
    fondoCine(tipo, o) {
      if (!this.cineFondo) return false;
      var key = null;
      try { key = this.texturaDeFondo(tipo, o); } catch (e) { key = null; }
      if (!key) { this.cineFondo.setVisible(false); return false; }
      this.cineFondo.setTexture(key).setPosition(W / 2, H / 2).setScale(1).setAlpha(1).clearTint().setVisible(true);
      if (o && o.tinte != null) this.cineFondo.setTint(o.tinte);
      return true;
    },

    /* ¿se juega en la cancha del pueblo? (si no, es estadio y la ilustración
       de la tribuna de chapa no va) */
    ambienteEsPueblo() {
      var amb = this.ambienteDelPartido();
      return !amb.pal || amb.pal.tribuna === "pueblo";
    },

    /* el tinte que pasa una ilustración pintada de día a la hora del partido */
    tinteIlustrado() {
      var amb = this.ambienteDelPartido();
      var t = amb.pal && amb.pal.tinte_ilustrado;
      return t ? A.aNumero(t) : null;
    },

    /* la sombra de contacto: sin ella la figura flota sobre el pasto */
    sombraDeFigura(x, yPiso, ancho) {
      var amb = this.ambienteDelPartido();
      var a = (amb.pal && amb.pal.sombra) || 0.3;
      var s = this.add.ellipse(x, yPiso, ancho, Math.max(8, ancho * 0.13), 0x000000, a);
      this.cineContent.addAt(s, 0);
      return s;
    },

    /* dónde están los PIES de una pose: la franja más baja con pixeles
       opacos, medida una vez por textura. Las poses no apoyan en el centro de
       la imagen —la gambeta carga el peso a la derecha, la chilena apoya la
       espalda— y una sombra centrada queda al lado de los pies, no debajo.
       Devuelve fracciones de la imagen: {cx, w, yb}. */
    pieDePose(key) {
      if (PIES[key]) return PIES[key];
      var def = { cx: 0.5, w: 0.5, yb: 1 };
      try {
        var src = this.textures.get(key).getSourceImage();
        var cw = 96, ch = Math.max(8, Math.round(src.height * cw / src.width));
        var cv = lienzo(cw, ch), x = cv.getContext("2d", { willReadFrequently: true });
        x.drawImage(src, 0, 0, cw, ch);
        var d = x.getImageData(0, 0, cw, ch).data, yb = -1, fila, i;
        for (fila = ch - 1; fila >= 0 && yb < 0; fila--) {
          for (i = 0; i < cw; i++) if (d[(fila * cw + i) * 4 + 3] > 60) { yb = fila; break; }
        }
        if (yb < 0) return (PIES[key] = def);
        var banda = Math.max(2, Math.round(ch * 0.07)), mn = cw, mx = -1;
        for (fila = Math.max(0, yb - banda); fila <= yb; fila++) {
          for (i = 0; i < cw; i++) if (d[(fila * cw + i) * 4 + 3] > 60) { if (i < mn) mn = i; if (i > mx) mx = i; }
        }
        PIES[key] = { cx: (mn + mx + 1) / 2 / cw, w: Math.max(0.12, (mx - mn + 1) / cw), yb: (yb + 1) / ch };
      } catch (e) { PIES[key] = def; }
      return PIES[key];
    },

    /* la sombra de una figura ya puesta, bajo sus pies, en su x FINAL (la
       figura puede estar todavía entrando al plano) */
    sombraBajoPies(sp, xFinal) {
      if (!sp || !sp.texture) return null;
      var p = this.pieDePose(sp.texture.key);
      var dw = sp.displayWidth, dh = sp.displayHeight;
      var ox = (p.cx - 0.5) * dw * (sp.flipX ? -1 : 1);
      var y = sp.y - dh * sp.originY + p.yb * dh;
      return this.sombraDeFigura(xFinal + ox, y - 2, Math.max(70, Math.min(240, p.w * dw * 1.25)));
    }
  });
})();
