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

   NO SE REPITE: un intercambio no vuelve hasta que salieron todos los otros
   de su evento (22/oct, Rodri: la misma frase salía tres veces en un
   partido). Cada partido baraja el orden de cada evento una vez y lo recorre
   en rueda: es la única forma de que eso valga siempre, también al dar la
   vuelta.
   ========================================================================== */
(function () {
  "use strict";

  /* 19/oct · 234 y no 226: a 13 px dos frases pasaban a tres renglones y se
     salían del globo; con 174 de texto entran todas en dos. El borde derecho
     sigue en 952. */
  var ANCHO = 234, X = 718, Y0 = 122, ALTO_GLOBO = 58;
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
        orden: {},           // el orden barajado de cada evento
        dichos: {},          // cuántos dijo cada evento en este partido
        ultimo: {},          // el último intercambio de cada evento
        ronda: {},           // los que ya salieron en esta vuelta de cada evento
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
          fontFamily: window.PF.texto, fontSize: "13px", fontStyle: "bold", color: "#f5c400"
        });
        var dice = sc.add.text(X + dx + 50, y + 20, "", {
          fontFamily: window.PF.texto, fontSize: "13px", color: "#f6efdc",
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
    /* jugada: la situación del relator que lo disparó (afuera, arquero_mio...) */
    comentar: function (sc, evento, jugada) {
      var t = sc._tribuna;
      if (!t) return false;
      /* revisión del 22/oct: durante el cine no se charla encima; lo último
         que comentaron sale cuando vuelve el partido (soltar). Lo mismo en
         EL TOQUE (segunda revisión del 22/oct) y en las viñetas, que van
         en ESCENA: te rematan y el cut-in del SÚPER TIRO (23/oct) */
      if (sc.estado === "CINE" || sc.estado === "TOQUE" || sc.estado === "ESCENA") { t.pendiente = { evento: evento, jugada: jugada }; return false; }
      var bloque = t.data.dialogos.find(function (d) { return d.evento === evento; });
      if (!bloque || !bloque.intercambios.length) return false;
      var n = bloque.intercambios.length;
      var orden = t.orden[evento];
      if (!orden || orden.length !== n) {
        orden = t.orden[evento] = [];
        for (var k = 0; k < n; k++) orden.splice(Math.floor(Math.random() * (k + 1)), 0, k);
      }
      /* 23/oct · LA TRIBUNA MIRA EL MARCADOR: solo los que valen ahora, y
         entre esos el que no salió en esta vuelta (la rueda sigue siendo
         la misma para todos: un intercambio no vuelve antes que los otros) */
      var aptos = orden.filter(function (k) { return vale(bloque.intercambios[k], sc.st, jugada, !!sc._rapido); });
      if (!aptos.length) return false;
      var ronda = t.ronda[evento] || (t.ronda[evento] = []);
      var libres = aptos.filter(function (k) { return ronda.indexOf(k) < 0; });
      if (!libres.length) {
        ronda.length = 0;
        libres = aptos.filter(function (k) { return k !== t.ultimo[evento]; });
        if (!libres.length) libres = aptos;
      }
      var i = libres[0];
      ronda.push(i);
      t.dichos[evento] = (t.dichos[evento] || 0) + 1;
      t.ultimo[evento] = i;
      var inter = bloque.intercambios[i];
      var P = t.data.personajes;
      /* 23/oct, Rodri: gol_companero nombra al que la metió */
      var g = sc.st && sc.st.mios && sc.st.mios[sc.st.goleador];
      var nombre = g ? g.nombre : "";
      pintar(sc, t, 0, P[0], inter.a.replace(/\{goleador\}/g, nombre));
      pintar(sc, t, 1, P[1], inter.b.replace(/\{goleador\}/g, nombre));
      if (!this.esquivar(sc)) return false;
      t.cont.setAlpha(1);
      if (t._irse) t._irse.remove();
      t._irse = sc.time.delayedCall(6000, function () {
        sc.tweens.add({ targets: t.cont, alpha: 0, duration: 500 });
      });
      return true;
    },

    /* L04b · se callan de golpe. La franja vive arriba de todo (cámara de
       UI), también arriba del cine: en la pregunta de la SÚPER DEFENSA los
       dos globos (x 698-952, y 122-248) caían encima del título y de la
       pregunta (l04b_4_cursor_en_guardar.png). Mientras se decide algo, no
       se charla: el próximo comentar() los vuelve a mostrar. */
    callar: function (sc) {
      var t = sc && sc._tribuna;
      if (!t) return false;
      if (t._irse) { t._irse.remove(); t._irse = null; }
      if (sc.tweens && sc.tweens.killTweensOf) sc.tweens.killTweensOf(t.cont);
      t.cont.setAlpha(0);
      return true;
    },
    soltar: function (sc) {
      var t = sc && sc._tribuna;
      if (!t || !t.pendiente) return false;
      var p = t.pendiente;
      t.pendiente = null;
      return this.comentar(sc, p.evento, p.jugada);
    },

    /* 18/oct · LOS GLOBOS NO TAPAN FIGURAS. En "te rematan" el arquero va
       arriba a la derecha (x 699-981, y 176-320) y los globos (x 698-952,
       y 122-248) le caían encima. Con las figuras de la escena, la franja se
       corre al lugar libre más cercano al suyo, medido sobre la caja de cada
       figura (tamaño en pantalla y origen) en una grilla de 10 px, con aire
       para el acercamiento de la cámara viva. Si
       no hay lugar se callan. Las figuras las anota la escena en
       sc._figurasCine; sin figuras, la franja vuelve a su sitio. */
    esquivar: function (sc) {
      var t = sc && sc._tribuna;
      if (!t) return false;
      var lugar = { dx: 0, dy: 0 };
      if (sc._figurasCine) {
        var AIRE = 10, MARGEN = 8, W = 960, H = 540;
        var x0 = X - SANGRIA, y0 = Y0, w = ANCHO + SANGRIA, h = Math.max(2 * ALTO_GLOBO + 10, t.alto || 0);
        var cajas = sc._figurasCine.map(function (f) {
          var izq = f.x - f.displayWidth * f.originX, arriba = f.y - f.displayHeight * f.originY;
          return { left: izq, top: arriba, right: izq + f.displayWidth, bottom: arriba + f.displayHeight };
        });
        var libres = [];
        for (var dy = Math.ceil((MARGEN - y0) / 10) * 10; y0 + dy + h <= H - MARGEN; dy += 10) {
          for (var dx = Math.ceil((MARGEN - x0) / 10) * 10; x0 + dx + w <= W - MARGEN; dx += 10) {
            var x = x0 + dx, y = y0 + dy;
            var choca = cajas.some(function (b) {
              return x < b.right + AIRE && x + w > b.left - AIRE && y < b.bottom + AIRE && y + h > b.top - AIRE;
            });
            if (!choca) libres.push({ dx: dx, dy: dy });
          }
        }
        if (!libres.length) { this.callar(sc); return false; }
        libres.sort(function (a, b) { return (Math.abs(a.dx) + Math.abs(a.dy)) - (Math.abs(b.dx) + Math.abs(b.dy)); });
        lugar = libres[0];
      }
      t.cont.setPosition(lugar.dx, lugar.dy);
      /* la máscara redonda de cada cara no vive en la franja: se corre aparte */
      t.cont.list.forEach(function (o) { if (o.mask) o.mask.geometryMask.setPosition(lugar.dx, lugar.dy); });
      return true;
    },

    ANCHO: ANCHO, X: X, Y0: Y0
  };

  /* 23/oct · después del 1-1 del rival Nelda decía "Ese gol lo hicimos
     nosotros, no ellos", y ganando 2-1, "no nos hicieron ni una clara". El
     "si" de cada intercambio (data/tribuna.json, _si) se mira contra el
     marcador, que ya cuenta el gol que se comenta. Sin marcador (una escena
     que no es un partido) ni jugada, esa parte de la condición no filtra. */
  /* revisión final del 23/oct: "Tres puntos" en el partido rápido, que no
     cuenta para la carrera. si.carrera: solo en una fecha de la carrera */
  function vale(inter, st, jugada, rapido) {
    var si = inter.si;
    if (!si) return true;
    if (si.jugada && jugada && si.jugada.indexOf(jugada) < 0) return false;
    if (si.carrera && rapido) return false;
    if (!st) return true;
    var dif = st.golesMio - st.golesRival;
    var va = dif > 0 ? "ganando" : (dif < 0 ? "perdiendo" : "empatando");
    if (si.va && [].concat(si.va).indexOf(va) < 0) return false;
    if (si.por != null && Math.abs(dif) !== si.por) return false;
    if (si.hicimos != null && (st.golesMio > 0) !== si.hicimos) return false;
    if (si.nos_hicieron != null && (st.golesRival > 0) !== si.nos_hicieron) return false;
    if (si.antes_del != null && !(st.minuto < si.antes_del)) return false;
    return true;
  }

  /* un globo: la cabecita del que habla + el fondo + el texto */
  function pintar(sc, t, idx, personaje, texto) {
    var b = t.globos[idx];
    var x0 = X + b.dx;
    /* EL TELÉFONO LEGIBLE (25/oct): con la letra grande el nombre y lo que
       dice no entraban en 58. Lo que dice va debajo del nombre, el globo crece
       a lo que ocupa y el de abajo arranca 10 después (en la PC, como antes) */
    if (b.y0 == null) b.y0 = b.y;
    b.y = idx === 1 ? Math.max(b.y0, t.globos[0].fin + 10) : b.y0;
    b.quien.setPosition(x0 + 50, b.y + 4);
    b.quien.setText((personaje && personaje.nombre) || "");
    b.dice.setPosition(x0 + 50, Math.max(b.y + 20, Math.ceil(b.quien.getBounds().bottom) - 2));
    b.dice.setText(texto || "");
    var altoG = Math.max(ALTO_GLOBO, Math.ceil(b.dice.getBounds().bottom - b.y + 1));
    b.fin = b.y + altoG;
    if (idx === 1) t.alto = b.fin - Y0;
    b.g.clear();
    /* fondo del globo */
    b.g.fillStyle(0x0a1f13, 0.9);
    b.g.fillRoundedRect(x0, b.y, ANCHO, altoG, 8);
    b.g.lineStyle(2, idx === 0 ? 0x54bcec : 0xff8c3a, 0.9);
    b.g.strokeRoundedRect(x0, b.y, ANCHO, altoG, 8);
    /* P4 · LA FLECHA: quién habla se sabe por la FORMA, no por el color.
       La de arriba apunta arriba, la de abajo apunta abajo. */
    var fx = x0 + ANCHO - 11, fy = b.y + 11;
    b.g.fillStyle(0xf6efdc, 0.95);
    if (idx === 0) b.g.fillTriangle(fx, fy - 5, fx - 5, fy + 4, fx + 5, fy + 4);
    else b.g.fillTriangle(fx, fy + 5, fx - 5, fy - 4, fx + 5, fy - 4);

    var cx = x0 + 26, cy = b.y + altoG / 2, R = 21;
    /* P4 · EL RETRATO. Si el personaje declaró uno en data/tribuna.json y la
       textura cargó, va la cara de verdad recortada en redondo. Si no cargó
       (sin server, archivo movido), queda el borrón de antes: feo, pero nunca
       un hueco. */
    /* L06: la clave del personaje (la misma del Master): una sola textura por archivo */
    var key = personaje && personaje.id ? (window.PampaCarga && window.PampaCarga.claveDeTribuna ? window.PampaCarga.claveDeTribuna(personaje) : "personaje_" + personaje.id) : null;
    if (key && sc.textures.exists(key)) {
      b.cara.setTexture(key);
      var alto = b.cara.height || 1;
      b.cara.setScale((R * 2.05) / alto);
      b.cara.setPosition(cx, cy).setVisible(true);
      if (!b.mask) {
        b.maskG = sc.make.graphics({ x: 0, y: 0, add: false });
        b.mask = b.maskG.createGeometryMask();
        b.cara.setMask(b.mask);
      }
      b.maskG.clear().fillStyle(0xffffff).fillCircle(cx, cy, R);
      /* el aro: le da borde a la cara y la separa del fondo del globo */
      b.g.lineStyle(2, idx === 0 ? 0x54bcec : 0xff8c3a, 1);
      b.g.strokeCircle(cx, cy, R);
    } else {
      b.cara.setVisible(false);
      b.g.fillStyle(0x2b1d14, 1);
      b.g.fillCircle(cx, cy, 11);
      b.g.fillRoundedRect(cx - 12, cy + 9, 24, 14, 5);
    }
  }
})();
