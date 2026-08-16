/* ============================================================================
   PAMPA STAR · phaser/scenes/feel_ui.js — BLOQUE B, EL OFICIO DE LA ANIMACIÓN

   Lo que separa un juego que se ve bien de uno que se siente bien. Nada de
   esto agrega efectos nuevos a la pantalla: cambia CUÁNDO pasan las cosas que
   ya pasaban.

   Todos los tiempos salen de balance.oficio, y hay una perilla global
   (`intensidad`) que los multiplica a todos para poder subir o bajar el
   conjunto con un número.

   REGLA QUE NO SE CRUZA (B7): nada de esto puede sumarle espera al escalón 1.
   Si el trámite se vuelve lento, el juego se arruina aunque cada efecto
   individual esté lindo. Por eso `hitstop` y `empujeDeCamara` no hacen nada
   cuando el escalón es 1.

   Y la regla de accesibilidad: ningún efecto de acá comunica información por
   sí solo. El hitstop refuerza un golpe que además tiene texto y sonido; la
   estela dice "va rápido" pero la velocidad ya se ve. Si algo tuviera que
   comunicar un dato —que el rival te leyó, que el remate fue fuerte— va con
   palabra o con forma, nunca con un destello.
   ========================================================================== */
(function () {
  "use strict";

  function cfg(sc) {
    var b = (sc.BAL || (sc.game && sc.game.registry.get("balance")) || {});
    var o = b.oficio || {};
    return {
      k: o.intensidad != null ? o.intensidad : 1,
      hit_chico: o.hitstop_chico_ms != null ? o.hitstop_chico_ms : 40,
      hit_fuerte: o.hitstop_fuerte_ms != null ? o.hitstop_fuerte_ms : 90,
      hit_gol: o.hitstop_gol_ms != null ? o.hitstop_gol_ms : 140,
      latigazo_ms: o.latigazo_ms != null ? o.latigazo_ms : 150,
      latigazo_x: o.latigazo_veloc != null ? o.latigazo_veloc : 1.35,
      antic_ms: o.anticipacion_ms != null ? o.anticipacion_ms : 120,
      antic_px: o.anticipacion_px != null ? o.anticipacion_px : 10,
      accion_ms: o.accion_ms != null ? o.accion_ms : 180,
      rebote: o.rebote != null ? o.rebote : 1.7,
      estela_n: o.estela_fantasmas != null ? o.estela_fantasmas : 4,
      estela_ms: o.estela_ms != null ? o.estela_ms : 220,
      estela_desde: o.estela_desde_px_s != null ? o.estela_desde_px_s : 420,
      deform_max: o.deformacion_max != null ? o.deformacion_max : 0.45,
      deform_vuelta_ms: o.deformacion_vuelta_ms != null ? o.deformacion_vuelta_ms : 100,
      segunda_ms: o.segunda_accion_ms != null ? o.segunda_accion_ms : 90,
      push_ms: o.push_camara_ms != null ? o.push_camara_ms : 900,
      push_zoom: o.push_camara_zoom != null ? o.push_camara_zoom : 0.06
    };
  }

  window.PampaFeel = {

    /* ── B1 · HITSTOP ─────────────────────────────────────────────────────
       Cuando algo impacta, TODO se congela unos milisegundos y después arranca
       de golpe. Es el recurso que más peso da con menos código.

       Se implementa con timeScale del reloj y de los tweens, no pausando cosas
       una por una: así se congela de verdad todo, incluida la cámara, que es
       parte del efecto. Justo después el mundo reanuda MÁS RÁPIDO de lo normal
       durante `latigazo_ms` y recién ahí recupera velocidad: ese contraste
       entre la pausa y el latigazo es el golpe.

       No hace nada si el escalón es 1: el trámite no se congela. */
    hitstop: function (sc, fuerza, escalon) {
      if (escalon === 1) return 0;
      var C = cfg(sc);
      var ms = Math.round((fuerza === "gol" ? C.hit_gol : fuerza === "fuerte" ? C.hit_fuerte : C.hit_chico) * C.k);
      if (ms <= 0) return 0;
      if (sc._enHitstop) return 0;                 // no se apilan
      sc._enHitstop = true;
      var t = sc.time, tw = sc.tweens;
      t.timeScale = 0.0001;                         // 0 exacto congela el delayedCall de salida
      tw.timeScale = 0.0001;
      /* el temporizador de salida usa el reloj REAL del navegador, porque el de
         la escena está congelado — si usara delayedCall no volvería nunca */
      var vuelta = function () {
        t.timeScale = C.latigazo_x; tw.timeScale = C.latigazo_x;
        window.setTimeout(function () {
          t.timeScale = 1; tw.timeScale = 1; sc._enHitstop = false;
        }, Math.round(C.latigazo_ms * C.k));
      };
      window.setTimeout(vuelta, ms);
      return ms;
    },

    /* ── B2 · ANTICIPACIÓN, ACCIÓN Y REBOTE ───────────────────────────────
       Nada va del punto A al B en línea recta y a velocidad constante: eso es
       lo que hace que se vea "de programación". Tres tiempos: un movimiento
       chico hacia atrás, la acción rápida con curva, y el rebote que se pasa
       del destino y vuelve. */
    aparecer: function (sc, obj, destino, escalon) {
      var C = cfg(sc);
      if (!obj) return;
      var dx = destino && destino.x != null ? destino.x : obj.x;
      var dy = destino && destino.y != null ? destino.y : obj.y;
      var esc = destino && destino.scale != null ? destino.scale : obj.scale;
      /* en el trámite no hay teatro: aparece y ya */
      if (escalon === 1) { obj.setPosition(dx, dy); if (obj.setScale) obj.setScale(esc); return; }
      var dir = (destino && destino.desdeX != null) ? Math.sign(dx - destino.desdeX) || 1 : 1;
      obj.setPosition(dx - dir * C.antic_px * 3, dy);
      if (obj.setScale) obj.setScale(esc * 0.86);
      sc.tweens.add({
        targets: obj, x: dx - dir * C.antic_px, duration: Math.round(C.antic_ms * C.k),
        ease: "Sine.easeOut",
        onComplete: function () {
          sc.tweens.add({
            targets: obj, x: dx, y: dy, scale: esc,
            duration: Math.round(C.accion_ms * C.k),
            ease: "Back.easeOut", easeParams: [C.rebote]
          });
        }
      });
    },

    /* el botón que se hunde antes de rebotar (misma idea, para la UI) */
    pulsar: function (sc, obj) {
      var C = cfg(sc);
      if (!obj || !obj.setScale) return;
      var s = obj.scale || 1;
      sc.tweens.add({
        targets: obj, scale: s * 0.94, duration: Math.round(70 * C.k), ease: "Sine.easeIn",
        yoyo: true, onComplete: function () { obj.setScale(s); }
      });
    },

    /* ── B3 · LA PELOTA VIVA ──────────────────────────────────────────────
       Es el objeto que más mira el jugador y era un círculo que se traslada.
       Se ESTIRA en la dirección del movimiento cuando va rápido y se ACHATA
       contra lo que golpea, recuperando la forma. La sombra se separa cuando
       está en el aire: es lo único que comunica altura sin dibujarla. */
    pelotaEstirar: function (sc, ball, vx, vy) {
      if (!ball || !ball.setScale) return;
      var C = cfg(sc);
      var v = Math.hypot(vx || 0, vy || 0);
      if (v < C.estela_desde * 0.4) { ball.scaleX = ball.scaleY = ball._escBase || ball.scaleX; ball.rotation = 0; return; }
      var f = Math.min(C.deform_max, (v / C.estela_desde) * 0.3);
      var base = ball._escBase || (ball._escBase = ball.scaleX);
      ball.rotation = Math.atan2(vy || 0, vx || 0);
      ball.scaleX = base * (1 + f);
      ball.scaleY = base * (1 - f * 0.7);
    },

    pelotaImpacto: function (sc, ball) {
      if (!ball || !ball.setScale) return;
      var C = cfg(sc);
      var base = ball._escBase || (ball._escBase = ball.scaleX);
      ball.rotation = 0;
      ball.scaleX = base * (1 - C.deform_max * 0.8);
      ball.scaleY = base * (1 + C.deform_max * 0.6);
      sc.tweens.add({
        targets: ball, scaleX: base, scaleY: base,
        duration: Math.round(C.deform_vuelta_ms * C.k), ease: "Back.easeOut"
      });
    },

    /* tres o cuatro fantasmas que se desvanecen detrás */
    estela: function (sc, ball, capa) {
      if (!ball) return;
      var C = cfg(sc);
      var g = sc.add.circle(ball.x, ball.y, (ball.displayWidth || 12) / 2, 0xf6efdc, 0.5);
      if (capa && capa.add) capa.add(g); else if (sc.cameras && sc.cameras.main && sc.uiCam) sc.uiCam.ignore(g);
      g.setDepth((ball.depth || 0) - 1);
      sc.tweens.add({
        targets: g, alpha: 0, scale: 0.6, duration: Math.round(C.estela_ms * C.k),
        ease: "Quad.easeOut", onComplete: function () { g.destroy(); }
      });
    },

    /* ── B4 · SEGUNDA ACCIÓN ──────────────────────────────────────────────
       Las cosas blandas no arrancan ni frenan con el cuerpo. Cuando la cámara
       se sacude, la tribuna se sacude UN POCO DESPUÉS, no en el mismo cuadro.
       Es sutil y es lo que hace que algo se lea como dibujado a mano. */
    segunda: function (sc, fn) {
      var C = cfg(sc);
      sc.time.delayedCall(Math.round(C.segunda_ms * C.k), fn);
    },

    /* ── B6 · LA CÁMARA CON INTENCIÓN ─────────────────────────────────────
       Además del zoom y el shake que ya había: un EMPUJE lento y continuo
       mientras se decide algo, y un retroceso al resolverse. Ese movimiento
       contrario le dice al cuerpo del jugador que algo va a pasar y que ya
       pasó. En el escalón 1 no se mueve: el shake y el push se gastan si se
       usan siempre.

       C4 · EMPUJA EL PANEL, NO LA CÁMARA DE LA INTERFAZ. La primera versión le
       hacía zoom a `uiCam`, y uiCam es la cámara que dibuja el HUD: con 6% de
       zoom se comía 16 px arriba y 16 abajo, o sea que CADA VEZ que se abría un
       menú el marcador quedaba cortado al medio y la última carta se salía de
       pantalla. Visto en captura en 1366x768, estado MENU.

       Lo que se empuja ahora es el PANEL DE LA ESCENA (`panelLayer`), que es
       donde está la acción y que ya tiene su máscara fija: el contenido crece
       adentro de una ventana que no se mueve, que es exactamente lo que hace
       una cámara al acercarse a un plano. El HUD no se toca nunca. Si algún día
       vuelve la cancha entera (flag pantalla_partida en false), el empuje cae
       sobre la cámara del mundo, que ahí sí muestra la acción. */
    _pivote: { x: 480, y: 176 },   // centro del panel de escena (960x232 desde y=60)

    empujar: function (sc, escalon) {
      if (escalon === 1) return;
      var C = cfg(sc);
      var p = sc.panelLayer;
      if (p) {
        if (p._escBase == null) p._escBase = p.scaleX || 1;
        this._escalarPanel(sc, p, p._escBase * (1 + C.push_zoom), Math.round(C.push_ms * C.k), "Sine.easeInOut");
        return;
      }
      var cam = sc.cameras && sc.cameras.main;
      if (!cam) return;
      var z0 = cam._zoomBase != null ? cam._zoomBase : (cam._zoomBase = cam.zoom);
      sc.tweens.add({ targets: cam, zoom: z0 * (1 + C.push_zoom), duration: Math.round(C.push_ms * C.k), ease: "Sine.easeInOut" });
    },
    soltar: function (sc) {
      var C = cfg(sc);
      var p = sc.panelLayer;
      if (p && p._escBase != null) {
        this._escalarPanel(sc, p, p._escBase, Math.round(C.push_ms * 0.45 * C.k), "Quad.easeOut");
        return;
      }
      var cam = sc.cameras && sc.cameras.main;
      if (!cam || cam._zoomBase == null) return;
      sc.tweens.add({ targets: cam, zoom: cam._zoomBase, duration: Math.round(C.push_ms * 0.45 * C.k), ease: "Quad.easeOut" });
    },
    /* el contenedor vive en (0,0): para que crezca desde el CENTRO del panel y
       no desde la esquina, la posición se corrige junto con la escala */
    _escalarPanel: function (sc, p, destino, dur, ease) {
      var pv = this._pivote;
      if (p._twEmpuje) p._twEmpuje.stop();
      p._twEmpuje = sc.tweens.addCounter({
        from: p.scaleX || 1, to: destino, duration: dur, ease: ease,
        onUpdate: function (tw) {
          var s = tw.getValue();
          p.setScale(s);
          p.x = pv.x - pv.x * s;
          p.y = pv.y - pv.y * s;
        }
      });
    },

    /* ── B5 · EL GOL COMO PICO ────────────────────────────────────────────
       El momento más importante del juego, encadenado:
         hitstop largo → destello con la silueta recortada en blanco (UN cuadro,
         como el corte de impacto del anime) → la red se hunde y vuelve → la
         cámara se acerca de golpe y se queda en SILENCIO → y recién ahí entra
         todo junto: cartel, tribuna, sonido, festejo.
       El silencio antes de la explosión es la mitad del efecto. */
    golPico: function (sc, opts) {
      opts = opts || {};
      var C = cfg(sc);
      var b = (sc.BAL || {});
      var silencio = Math.round(((b.feel && b.feel.silencio_ms) || 500) * C.k);
      this.hitstop(sc, "gol", 3);
      /* el cuadro de impacto: silueta blanca sobre fondo oscuro, UN cuadro */
      var W = 960, H = 540;
      var flash = sc.add.rectangle(W / 2, H / 2, W, H, 0xf6efdc, 1).setDepth(9998);
      if (sc.uiCam && sc.cameras && sc.cameras.main) sc.cameras.main.ignore(flash);
      var sil = null;
      if (opts.silueta && sc.textures && sc.textures.exists(opts.silueta)) {
        sil = sc.add.image(W / 2, H / 2, opts.silueta).setTint(0x0a1f13).setDepth(9999);
        if (opts.escala) sil.setScale(opts.escala);
        if (sc.uiCam && sc.cameras && sc.cameras.main) sc.cameras.main.ignore(sil);
      }
      sc.time.delayedCall(Math.round(90 * C.k), function () {
        flash.destroy(); if (sil) sil.destroy();
        if (opts.alSilencio) opts.alSilencio();
        sc.time.delayedCall(silencio, function () { if (opts.alEstallar) opts.alEstallar(); });
      });
      return silencio + Math.round(90 * C.k);
    },

    /* la red que se hunde y vuelve (B4 aplicado al gol) */
    redSacudida: function (sc, red) {
      if (!red) return;
      var C = cfg(sc);
      /* C3 · epica.red_sacudida_ms estaba huérfana: existía la perilla y nadie
         la leía. En vez de borrarla se conecta acá, que es donde tenía sentido
         desde el principio — la red que se hunde y vuelve, en el gol. */
      var b = (sc.BAL || {});
      var total = ((b.epica && b.epica.red_sacudida_ms) || 700) * C.k;
      var x0 = red.x;
      sc.tweens.add({
        targets: red, x: x0 + 10, duration: Math.round(total / 4), ease: "Quad.easeOut",
        yoyo: true, repeat: 1
      });
    },

    cfg: cfg
  };
})();
