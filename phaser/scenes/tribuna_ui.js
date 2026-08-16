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
        var g = sc.add.graphics();
        var quien = sc.add.text(X + 40, y + 4, "", {
          fontFamily: window.PF.texto, fontSize: "12px", fontStyle: "bold", color: "#f5c400"
        });
        var dice = sc.add.text(X + 40, y + 20, "", {
          fontFamily: window.PF.texto, fontSize: "12px", color: "#f6efdc",
          wordWrap: { width: ANCHO - 50 }, lineSpacing: 1
        });
        t.cont.add([g, quien, dice]);
        t.globos.push({ g: g, quien: quien, dice: dice, y: y, cara: i });
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
    b.g.clear();
    /* fondo del globo */
    b.g.fillStyle(0x0a1f13, 0.88);
    b.g.fillRoundedRect(X, b.y, ANCHO, ALTO_GLOBO, 8);
    b.g.lineStyle(2, idx === 0 ? 0x54bcec : 0xff8c3a, 0.9);
    b.g.strokeRoundedRect(X, b.y, ANCHO, ALTO_GLOBO, 8);
    /* la cabecita: dos siluetas distintas, para que se sepa quién habla sin
       leer el nombre y sin depender del color (uno con rodete, otro con gorra) */
    var cx = X + 20, cy = b.y + ALTO_GLOBO / 2;
    b.g.fillStyle(0x2b1d14, 1);
    b.g.fillCircle(cx, cy, 11);
    b.g.fillRoundedRect(cx - 12, cy + 9, 24, 14, 5);
    if (idx === 0) { b.g.fillStyle(0x2b1d14, 1); b.g.fillCircle(cx + 9, cy - 8, 6); }   // el rodete
    else { b.g.fillStyle(0x232323, 1); b.g.fillRoundedRect(cx - 13, cy - 14, 26, 8, 3); b.g.fillRect(cx - 15, cy - 8, 20, 3); }  // la gorra
    b.quien.setText((personaje && personaje.nombre) || "");
    b.dice.setText(texto || "");
  }
})();
