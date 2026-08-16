/* ============================================================================
   PAMPA STAR · phaser/scenes/semana_ui.js — N4, LA SEMANA COMO ESCENARIO

   Antes la semana eran tres cajas vacías con "＋ elegí qué hacés" adentro y un
   botón. Tres ranuras de un formulario. Ahora cada ranura es un LUGAR: cuando
   elegís, la caja se convierte en la postal del sitio donde pasó la cosa — el
   potrero, la casa, el patio del asado, la cancha del club, la ruta, la
   escuela — y al final se lee el repaso de la semana como quien la cuenta.

   REGLA QUE NO SE CRUZA: acá NO hay un solo número. Ni las stats, ni la
   energía, ni el ánimo, ni qué opción está disponible. Todo eso sigue viviendo
   en logic/semana.js y en data/semana.json, intactos. Esto es puesta en
   escena: la misma decisión, contada distinto.

   Los escenarios se dibujan con Graphics, sin assets nuevos: siluetas de
   frente, pocas formas, la paleta del juego. Alcanza para que se reconozca el
   lugar de un vistazo, que es todo lo que tienen que hacer.
   ========================================================================== */
(function () {
  "use strict";

  var C = {
    cielo_dia: 0x1b4a5c, cielo_tarde: 0x6a3a2e, cielo_noche: 0x101c30,
    tierra: 0x6b4a2f, pasto: 0x2e7d32, pasto_seco: 0x7a7a3a,
    pared: 0xd9c9a8, techo: 0x8a3b2a, madera: 0x5a3d24,
    linea: 0x0a1f13, luz: 0xf5c400, humo: 0x9fb3a5, asfalto: 0x3a3a40
  };

  /* cada lugar es una función que dibuja adentro de un rect (0,0,w,h) local */
  var ESCENARIOS = {
    /* la cancha del club: paredón, arco y la línea del área */
    club: function (g, w, h) {
      g.fillStyle(C.cielo_dia, 1); g.fillRect(0, 0, w, h * 0.52);
      g.fillStyle(C.pasto, 1); g.fillRect(0, h * 0.52, w, h * 0.48);
      g.fillStyle(C.pared, 0.85); g.fillRect(w * 0.06, h * 0.3, w * 0.88, h * 0.24);
      g.fillStyle(C.linea, 0.35); g.fillRect(w * 0.06, h * 0.3, w * 0.88, 3);
      /* el arco */
      g.lineStyle(3, 0xf6efdc, 0.95);
      g.strokeRect(w * 0.34, h * 0.4, w * 0.32, h * 0.16);
      g.lineStyle(1, 0xf6efdc, 0.5);
      for (var i = 1; i < 5; i++) g.lineBetween(w * 0.34 + i * (w * 0.32 / 5), h * 0.4, w * 0.34 + i * (w * 0.32 / 5), h * 0.56);
      g.lineStyle(2, 0xf6efdc, 0.6);
      g.strokeRect(w * 0.2, h * 0.6, w * 0.6, h * 0.3);
    },
    /* el potrero: tierra pelada, dos palos torcidos, un poste de luz */
    potrero: function (g, w, h) {
      g.fillStyle(C.cielo_tarde, 1); g.fillRect(0, 0, w, h * 0.6);
      g.fillStyle(C.tierra, 1); g.fillRect(0, h * 0.6, w, h * 0.4);
      g.fillStyle(C.pasto_seco, 0.5);
      for (var i = 0; i < 7; i++) g.fillRect((i * 37) % w, h * 0.62 + (i % 3) * 6, 14, 3);
      /* los dos palos, uno más torcido que el otro */
      g.lineStyle(4, C.madera, 1);
      g.lineBetween(w * 0.28, h * 0.62, w * 0.3, h * 0.34);
      g.lineBetween(w * 0.72, h * 0.62, w * 0.69, h * 0.36);
      g.lineStyle(3, C.madera, 0.85);
      g.lineBetween(w * 0.3, h * 0.34, w * 0.69, h * 0.36);
      /* la pelota */
      g.fillStyle(0xf6efdc, 1); g.fillCircle(w * 0.52, h * 0.78, 5);
    },
    /* la casa: techo a dos aguas, una ventana con luz */
    casa: function (g, w, h) {
      g.fillStyle(C.cielo_noche, 1); g.fillRect(0, 0, w, h);
      g.fillStyle(0xf6efdc, 0.55);
      g.fillCircle(w * 0.82, h * 0.2, 3); g.fillCircle(w * 0.9, h * 0.32, 2); g.fillCircle(w * 0.72, h * 0.14, 2);
      g.fillStyle(C.tierra, 1); g.fillRect(0, h * 0.78, w, h * 0.22);
      g.fillStyle(C.pared, 1); g.fillRect(w * 0.24, h * 0.44, w * 0.52, h * 0.36);
      g.fillStyle(C.techo, 1);
      g.beginPath();
      g.moveTo(w * 0.18, h * 0.46); g.lineTo(w * 0.5, h * 0.24); g.lineTo(w * 0.82, h * 0.46);
      g.closePath(); g.fillPath();
      g.fillStyle(C.luz, 1); g.fillRect(w * 0.36, h * 0.54, w * 0.14, h * 0.13);
      g.fillStyle(C.madera, 1); g.fillRect(w * 0.58, h * 0.58, w * 0.1, h * 0.22);
    },
    /* el patio del asado: la parrilla y el humo */
    patio: function (g, w, h) {
      g.fillStyle(C.cielo_tarde, 1); g.fillRect(0, 0, w, h * 0.62);
      g.fillStyle(C.pasto, 0.75); g.fillRect(0, h * 0.62, w, h * 0.38);
      g.fillStyle(C.pared, 0.9); g.fillRect(0, h * 0.34, w * 0.3, h * 0.3);
      /* la parrilla */
      g.fillStyle(C.linea, 1); g.fillRect(w * 0.42, h * 0.56, w * 0.3, h * 0.06);
      g.lineStyle(3, C.linea, 1);
      g.lineBetween(w * 0.46, h * 0.62, w * 0.46, h * 0.8);
      g.lineBetween(w * 0.68, h * 0.62, w * 0.68, h * 0.8);
      g.fillStyle(C.luz, 0.9); g.fillRect(w * 0.45, h * 0.52, w * 0.24, h * 0.04);
      g.fillStyle(0xff6b4a, 0.8); g.fillRect(w * 0.48, h * 0.5, w * 0.18, h * 0.03);
      /* el humo */
      g.fillStyle(C.humo, 0.35);
      g.fillCircle(w * 0.54, h * 0.38, 11); g.fillCircle(w * 0.62, h * 0.28, 8); g.fillCircle(w * 0.5, h * 0.2, 6);
    },
    /* la ruta: el camino que se va, un cartel y el horizonte pampeano */
    ruta: function (g, w, h) {
      g.fillStyle(C.cielo_dia, 1); g.fillRect(0, 0, w, h * 0.58);
      g.fillStyle(C.pasto_seco, 0.85); g.fillRect(0, h * 0.58, w, h * 0.42);
      g.fillStyle(C.asfalto, 1);
      g.beginPath();
      g.moveTo(w * 0.42, h * 0.58); g.lineTo(w * 0.58, h * 0.58);
      g.lineTo(w * 0.86, h); g.lineTo(w * 0.14, h);
      g.closePath(); g.fillPath();
      g.fillStyle(0xf6efdc, 0.9);
      g.fillRect(w * 0.49, h * 0.64, 3, 8); g.fillRect(w * 0.49, h * 0.78, 4, 12); g.fillRect(w * 0.48, h * 0.94, 5, 14);
      /* el cartel */
      g.fillStyle(C.madera, 1); g.fillRect(w * 0.78, h * 0.42, 4, h * 0.22);
      g.fillStyle(0x0e2a1a, 1); g.fillRect(w * 0.68, h * 0.3, w * 0.24, h * 0.14);
      g.lineStyle(2, 0xf6efdc, 0.8); g.strokeRect(w * 0.68, h * 0.3, w * 0.24, h * 0.14);
    },
    /* la escuela: el frente y el mástil */
    escuela: function (g, w, h) {
      g.fillStyle(C.cielo_dia, 1); g.fillRect(0, 0, w, h * 0.72);
      g.fillStyle(C.tierra, 0.8); g.fillRect(0, h * 0.72, w, h * 0.28);
      g.fillStyle(C.pared, 1); g.fillRect(w * 0.16, h * 0.36, w * 0.68, h * 0.38);
      g.fillStyle(C.techo, 0.9); g.fillRect(w * 0.13, h * 0.32, w * 0.74, h * 0.06);
      g.fillStyle(C.cielo_noche, 0.85);
      g.fillRect(w * 0.24, h * 0.46, w * 0.1, h * 0.11);
      g.fillRect(w * 0.45, h * 0.46, w * 0.1, h * 0.11);
      g.fillRect(w * 0.66, h * 0.46, w * 0.1, h * 0.11);
      g.fillStyle(C.madera, 1); g.fillRect(w * 0.45, h * 0.6, w * 0.1, h * 0.14);
      g.lineStyle(3, 0xf6efdc, 0.9); g.lineBetween(w * 0.9, h * 0.2, w * 0.9, h * 0.72);
    },
    /* la ranura vacía: la pampa sola, esperando que pase algo */
    vacio: function (g, w, h) {
      g.fillStyle(C.cielo_dia, 0.5); g.fillRect(0, 0, w, h * 0.62);
      g.fillStyle(C.pasto_seco, 0.35); g.fillRect(0, h * 0.62, w, h * 0.38);
      g.lineStyle(2, 0xf6efdc, 0.28);
      g.lineBetween(0, h * 0.62, w, h * 0.62);
      /* un caldén chico en el horizonte, para que no sea una caja vacía */
      g.fillStyle(0x0e2a1a, 0.55);
      g.fillRect(w * 0.78, h * 0.5, 3, h * 0.13);
      g.fillCircle(w * 0.79, h * 0.48, 9);
    }
  };

  window.PampaSemanaUI = {
    ESCENARIOS: ESCENARIOS,
    lugares: function () { return Object.keys(ESCENARIOS); },

    /* dibuja el escenario de un lugar adentro de un rect de pantalla.
       Devuelve el Container, con la máscara colgada para que se destruya con él. */
    escenario: function (sc, x, y, w, h, lugar) {
      var cont = sc.add.container(x, y);
      var g = sc.add.graphics();
      var f = ESCENARIOS[lugar] || ESCENARIOS.vacio;
      g.setPosition(-w / 2, -h / 2);
      f(g, w, h);
      /* recorte: los escenarios dibujan de 0..w y 0..h, pero algunos (la ruta)
         se pasan a propósito para que la perspectiva no termine en el borde */
      var m = sc.make.graphics({ x: x - w / 2, y: y - h / 2, add: false });
      m.fillStyle(0xffffff, 1); m.fillRect(0, 0, w, h);
      g.setMask(m.createGeometryMask());
      cont.add(g);
      cont._mascara = m;
      return cont;
    },

    /* EL REPASO: la semana contada como la contaría alguien, no como una lista.
       Sale de lo que ya eligió el jugador; no calcula nada nuevo. */
    repaso: function (elegidas, opciones) {
      var hechas = (elegidas || []).map(function (id) {
        return (opciones || []).find(function (o) { return o.id === id; });
      }).filter(Boolean);
      if (!hechas.length) return "Una semana entera por delante y nada decidido todavía.";
      var dias = ["El lunes", "El miércoles", "El viernes"];
      var partes = hechas.map(function (o, i) {
        var d = dias[i] || "Después";
        return d + " " + (o.repaso || primeraEnMinuscula(o.n));
      });
      if (hechas.length === 1) return partes[0] + ". Y todavía queda semana.";
      if (hechas.length === 2) return partes[0] + ". " + partes[1] + ". Falta un día.";
      return partes[0] + ". " + partes[1] + ". " + partes[2] + ".";
    }
  };

  function primeraEnMinuscula(s) {
    var t = String(s || "").replace(/^[^\wáéíóúñ]+/i, "").trim();   // el emoji del nombre
    return t.charAt(0).toLowerCase() + t.slice(1);
  }
})();
