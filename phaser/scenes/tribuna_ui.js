/* ============================================================================
   PAMPA STAR · phaser/scenes/tribuna_ui.js — N1, LOS DOS DE LA TRIBUNA

   Una franja al costado donde NELDA y EL TULI comentan el partido entre ellos.
   No es el relator: el relator le habla al que juega, y estos dos se hablan
   entre ellos mientras vos jugás. Por eso van juntos y no se pisan — uno dice
   la jugada, el otro contesta.

   DÓNDE VA, y por qué ahí: se midió la ocupación del lienzo durante el partido
   por bandas de 45 px, y la de y=135..250 tenía un objeto por banda contra los
   6-10 del resto. Es el costado del panel de escena: no tapa la ilustración
   del portador, no tapa el mapa de cancha (que es la superficie de navegación)
   ni la fila de botones de abajo.

   LAS FRASES SON DATA (data/tribuna.json). Agregar un intercambio es agregar
   un {a, b} a la lista, sin tocar una línea de código.

   NO SE REPITE dos veces seguidas: se lleva el índice del último intercambio
   usado POR EVENTO, y si el evento vuelve a salir se elige otro. Con seis por
   evento eso alcanza para que no cante.
   ========================================================================== */
(function () {
  "use strict";

  var ANCHO = 226, X = 726, Y0 = 122, ALTO_GLOBO = 58;
  /* P4 · cuánto entra cada caja para distinguirse por LUGAR (ver pintar).
     La de arriba se corre a la IZQUIERDA y la de abajo se queda en su sitio:
     correrla a la derecha la sacaba de pantalla (726 + 14 + 226 = 966 sobre un
     lienzo de 960, visto en la captura). Con este esquema las dos entran y el
     escalón lateral sigue siendo de 28 px, que se nota. */
  var SANGRIA = 28;

  window.PampaTribunaUI = {
    /* construye la franja una vez, al armar la escena. Silenciosa hasta que
       pasa algo: arranca vacía y no ocupa lugar visual si el partido no habló. */
    montar: function (sc) {
      var D = sc.game.registry.get("tribuna");
      if (!D || !D.dialogos || !D.personajes) return null;
      var t = {
        data: D,
        usados: {},          // último intercambio por evento
        cont: sc.add.container(0, 0),
        globos: []
      };
      for (var i = 0; i < 2; i++) {
        var y = Y0 + i * (ALTO_GLOBO + 10);
        /* P4 · LA CAJA DEL QUE HABLA SE DISTINGUE SIN COLOR.
           Rodri es daltónico, así que el borde azul contra el naranja no
           alcanza. Las dos cajas se separan por LUGAR y por FORMA:
             · la de arriba (Nelda)   entra 14 px desde la izquierda y lleva ▲
             · la de abajo (el Tuli)  entra 14 px desde la derecha y lleva ▼
           El color queda como refuerzo, no como información. */
        var dx = (i === 0) ? -SANGRIA : 0;
        var g = sc.add.graphics();
        /* el retrato de verdad, recortado en redondo dentro del globo */
        var cara = sc.add.image(X + dx + 26, y + ALTO_GLOBO / 2, "__WHITE")
          .setVisible(false);
        var quien = sc.add.text(X + dx + 50, y + 4, "", {
          fontFamily: window.PF.texto, fontSize: "12px", fontStyle: "bold", color: "#f5c400"
        });
        var dice = sc.add.text(X + dx + 50, y + 20, "", {
          fontFamily: window.PF.texto, fontSize: "12px", color: "#f6efdc",
          wordWrap: { width: ANCHO - 60 }, lineSpacing: 1
        });
        t.cont.add([g, cara, quien, dice]);
        t.globos.push({ g: g, cara: cara, quien: quien, dice: dice, y: y, dx: dx, idx: i });
      }
      t.cont.setAlpha(0);
      /* la franja vive en la cámara de UI, como el resto del HUD */
      if (sc.uiCam && sc.cameras && sc.cameras.main) sc.cameras.main.ignore(t.cont);
      sc._tribuna = t;
      return t;
    },

    /* pinta un intercambio para un evento. `evento` es la misma clave que usa
       el relator (gol, atajada, quite...), así que engancharlo es una línea. */
    comentar: function (sc, evento) {
      var t = sc._tribuna;
      if (!t) return false;
      var bloque = t.data.dialogos.find(function (d) { return d.evento === evento; });
      if (!bloque || !bloque.intercambios.length) return false;
      var n = bloque.intercambios.length;
      var prev = t.usados[evento];
      var i = Math.floor(Math.random() * n);
      if (n > 1 && i === prev) i = (i + 1) % n;      // nunca el mismo dos veces seguidas
      t.usados[evento] = i;
      var inter = bloque.intercambios[i];
      var P = t.data.personajes;
      pintar(sc, t, 0, P[0], inter.a);
      pintar(sc, t, 1, P[1], inter.b);
      t.cont.setAlpha(1);
      if (t._irse) t._irse.remove();
      t._irse = sc.time.delayedCall(6000, function () {
        sc.tweens.add({ targets: t.cont, alpha: 0, duration: 500 });
      });
      return true;
    },

    ANCHO: ANCHO, X: X, Y0: Y0
  };

  /* un globo: la cabecita del que habla + el fondo + el texto */
  function pintar(sc, t, idx, personaje, texto) {
    var b = t.globos[idx];
    var x0 = X + b.dx;
    b.g.clear();
    /* fondo del globo */
    b.g.fillStyle(0x0a1f13, 0.9);
    b.g.fillRoundedRect(x0, b.y, ANCHO, ALTO_GLOBO, 8);
    b.g.lineStyle(2, idx === 0 ? 0x54bcec : 0xff8c3a, 0.9);
    b.g.strokeRoundedRect(x0, b.y, ANCHO, ALTO_GLOBO, 8);
    /* P4 · LA FLECHA: quién habla se sabe por la FORMA, no por el color.
       La de arriba apunta arriba, la de abajo apunta abajo. */
    var fx = x0 + ANCHO - 11, fy = b.y + 11;
    b.g.fillStyle(0xf6efdc, 0.95);
    if (idx === 0) b.g.fillTriangle(fx, fy - 5, fx - 5, fy + 4, fx + 5, fy + 4);
    else b.g.fillTriangle(fx, fy + 5, fx - 5, fy - 4, fx + 5, fy - 4);

    var cx = x0 + 26, cy = b.y + ALTO_GLOBO / 2, R = 21;
    /* P4 · EL RETRATO. Si el personaje declaró uno en data/tribuna.json y la
       textura cargó, va la cara de verdad recortada en redondo. Si no cargó
       (sin server, archivo movido), queda el borrón de antes: feo, pero nunca
       un hueco. */
    var key = personaje && personaje.id ? "tribuna_" + personaje.id : null;
    if (key && sc.textures.exists(key)) {
      b.cara.setTexture(key);
      var alto = b.cara.height || 1;
      b.cara.setScale((R * 2.05) / alto);
      b.cara.setPosition(cx, cy).setVisible(true);
      if (!b.mask) {
        b.maskG = sc.make.graphics({ x: 0, y: 0, add: false });
        b.maskG.fillStyle(0xffffff);
        b.maskG.fillCircle(cx, cy, R);
        b.mask = b.maskG.createGeometryMask();
        b.cara.setMask(b.mask);
      }
      /* el aro: le da borde a la cara y la separa del fondo del globo */
      b.g.lineStyle(2, idx === 0 ? 0x54bcec : 0xff8c3a, 1);
      b.g.strokeCircle(cx, cy, R);
    } else {
      b.cara.setVisible(false);
      b.g.fillStyle(0x2b1d14, 1);
      b.g.fillCircle(cx, cy, 11);
      b.g.fillRoundedRect(cx - 12, cy + 9, 24, 14, 5);
    }
    b.quien.setPosition(x0 + 50, b.y + 4);
    b.dice.setPosition(x0 + 50, b.y + 20);
    b.quien.setText((personaje && personaje.nombre) || "");
    b.dice.setText(texto || "");
  }
})();
