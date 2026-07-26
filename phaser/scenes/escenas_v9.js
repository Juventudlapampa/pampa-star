/* ============================================================================
   PAMPA STAR · phaser/scenes/escenas_v9.js — LAS ESCENAS QUE FALTABAN (V9)
   Playtest Rodri: "el problema es COBERTURA PARCIAL de animaciones". Algunas
   acciones tenían su escena y otras se resolvían con un renglón de texto —y
   en pantalla partida ese renglón va a mundoLayer, que está APAGADO, así que
   directamente no se veía NADA (el caso del pase y el del bloqueo fallido).
   Regla dura de esta tanda: ninguna acción se resuelve solo con texto.

   Acá viven las escenas nuevas, como mixin de PampaMatch (mismo patrón que
   definicion_ui.js y jugadon_ui.js). Todas usan el lienzo del cine
   (cineLayer/cineBG/cineContent) y cierran por cerrarEscena(alFinal), así que
   heredan el corte seco entre viñetas y el SKIP de un toque.
   ========================================================================== */
(function () {
  "use strict";
  var W = 960, H = 540;
  if (!window.PampaMatch) return;

  Object.assign(window.PampaMatch.prototype, {

    /* ---- apertura común de una escena del cine (idéntica a escenaCine) ---- */
    _abrirEscena(etiqueta) {
      this.estado = "ESCENA";
      this.quitarDuelo(); this.limpiarMenu();
      this.mundoLayer.setVisible(false); this.hudLayer.setVisible(false);
      this.cineLayer.setVisible(true);
      this.uiCam.setZoom(1); this.uiCam.centerOn(W / 2, H / 2);
      this.limpiarContenido();
      this.cineLabel.setText(etiqueta || "");
    },

    /* ---- fondo de cancha con profundidad: tribuna arriba, pasto en fuga ----
       (la tribuna es la ilustrada si está; encima le corre la hinchada viva) */
    fondoDeCancha(conTribuna) {
      var g = this.cineBG, horizonte = Math.round(H * 0.34);
      g.clear();
      g.fillStyle(0x0e2c44, 1); g.fillRect(0, 0, W, horizonte);
      g.fillStyle(0x1f7a3c, 1); g.fillRect(0, horizonte, W, H - horizonte);
      /* franjas de pasto que se ENSANCHAN hacia adelante: da la fuga sin 3D */
      g.fillStyle(0x2e7d32, 1);
      var y = horizonte, alto = 7, k = 0;
      while (y < H) {
        if (k % 2 === 0) g.fillRect(0, y, W, alto);
        y += alto; alto += 6; k++;
      }
      g.fillStyle(0xeafff0, 0.2); g.fillRect(0, horizonte, W, 3);
      if (conTribuna !== false && this.textures.exists("fondo_tribuna")) {
        var t = this.add.image(W / 2, horizonte, "fondo_tribuna").setOrigin(0.5, 1);
        t.setScale(W / t.width);
        this.cineContent.add(t);
      }
      if (conTribuna !== false && this.hinchadaViva) this.hinchadaViva(this.cineContent, horizonte);
      return horizonte;
    },

    /* pose lista para el plano: la del héroe con su pinta, la del rival en naranja */
    poseDePlano(poseId, j, esRival) {
      var k = this.poseKey(poseId);
      if (!k) return null;
      if (esRival && this.poseRivalNaranja) return this.poseRivalNaranja(poseId) || k;
      if (j && j.esVos && poseId === "corriendo" && this.poseHeroeTenida) return this.poseHeroeTenida(j) || k;
      return k;
    },
    figuraDePlano(poseId, j, esRival, x, y, alto, flip) {
      var k = this.poseDePlano(poseId, j, esRival), sp;
      if (k) {
        sp = this.add.image(x, y, k);
        sp.setScale(alto / sp.height);
      } else {
        sp = this.add.rectangle(x, y, alto * 0.32, alto, esRival ? 0xff8a50 : 0x4fc3f7);
      }
      if (flip) sp.setFlipX(true);
      this.cineContent.add(sp);
      return sp;
    },
    /* placa con el nombre (forma + palabra, nunca solo el color) */
    placaDePlano(x, y, j, esRival) {
      var t = this.add.text(x, y, (j && j.esVos ? "VOS" : ((j && j.nombre) || "RIVAL").toUpperCase().slice(0, 12)),
        { fontFamily: window.PF.texto, fontSize: "13px", fontStyle: "bold", color: "#0a1f13", backgroundColor: esRival ? "#FF8A50" : "#4FC3F7", padding: { x: 8, y: 3 } }).setOrigin(0.5);
      this.cineContent.add(t);
      return t;
    },

    /* ======================================================================
       §7 · POR QUÉ SALIÓ ASÍ — la línea corta bajo el desenlace.
       La lógica pura ya devuelve el término que decidió (motivo); acá solo se
       traduce a cancha. Nunca inventa: si no hay motivo, no dice nada.
       ====================================================================== */
    porQueDuelo(res) {
      if (!res || !res.motivo) return "";
      var leido = res.matriz === "leyeron" || res.matriz === "teEngano";
      var M = {
        ajustado: "por centímetros",
        lectura: leido ? "te leyeron la jugada" : "lo leíste bien",
        cansado: "venías cansado",
        entero: "llegaste entero",
        envion: "con el envión a favor",
        megacosa: "el rival sacó algo de arriba",
        rival_fundido: "los tenés fundidos",
        parejo: ""
      };
      return M[res.motivo] || "";
    },
    porQuePase(res, cortador, alVacio, win) {
      var m = res && res.motivo;
      if (!win) {
        if (m === "tapado" || cortador) return "estaba parado en la línea de pase · pelota rival";
        if (m === "largo") return "la puso demasiado larga · pelota rival";
        if (m === "ajustado") return "por centímetros · pelota rival";
        return "no le llegó a nadie · pelota rival";
      }
      if (cortador) return m === "ajustado" ? "se la tiró y la pasó raspando" : "se tiró y no llegó";
      if (alVacio) return "la dejó en el camino y el pibe pica";
      return m === "largo" ? "pase largo, justo al pie" : "toque y a seguir";
    },

    /* ======================================================================
       §2 · EL PASE — se acomoda, le pega, la pelota VIAJA, y si hay alguien
       en la línea el rival se TIRA a cortarla: freeze, silencio, desenlace.
       cfg = { alVacio, cortador, receptor, pateador, win, titulo, sub, alFinal }
       ====================================================================== */
    escenaPase(cfg) {
      var self = this, feel = this.BAL.feel || {}, EP = this.BAL.escena_pase || {};
      var hayCorte = !!cfg.cortador;
      this._abrirEscena(cfg.alVacio ? "· al vacío ·" : "· el pase ·");
      var horizonte = this.fondoDeCancha(true);

      var tEntrada = this.msV(EP.entrada_ms || 340);
      var tViaje = this.msV((EP.viaje_ms || 620) * (cfg.alVacio ? 1.25 : 1));
      var silencio = feel.silencio_ms || 500;
      var tHold = this.msV(EP.hold_ms || 900);

      /* el que la toca: entra desde la izquierda con la pelota al pie */
      var yPie = Math.round(H * 0.66);
      var pat = this.figuraDePlano("pared", cfg.pateador, false, 130, yPie, 300, false);
      this.placaDePlano(180, H * 0.9, cfg.pateador, false);
      var bola = this.add.sprite(180, yPie + 96, "ball").setScale(2.4);
      this.cineContent.add(bola);
      this.tweens.add({ targets: [pat], x: 210, duration: tEntrada, ease: "Quad.easeOut" });
      this.tweens.add({ targets: [bola], x: 258, duration: tEntrada, ease: "Quad.easeOut" });

      /* el que la espera: más chico y más arriba = más lejos */
      var rec = this.figuraDePlano("corriendo", cfg.receptor, false, 806, Math.round(H * 0.5), 190, true);
      if (cfg.receptor) this.placaDePlano(806, H * 0.7, cfg.receptor, false);
      if (cfg.alVacio) this.tweens.add({ targets: rec, x: 750, y: H * 0.56, duration: tEntrada + tViaje, ease: "Sine.easeIn" });

      var destino = { x: cfg.alVacio ? 750 : 790, y: (cfg.alVacio ? H * 0.56 : H * 0.5) + 78 };
      var cruce = { x: 500, y: Math.round((yPie + 96 + destino.y) / 2) };
      var cort = null;
      var esc = { revelado: false, cerrado: false };

      /* --- LA PEGADA: flash, líneas y la pelota sale --- */
      this.time.delayedCall(tEntrada, function () {
        if (!bola.active) return;
        self.uiCam.flash(70, 255, 255, 220);
        self.lineasVelocidad(258, yPie, 0.9, 0xffd84d);
        self.SFX && self.SFX.kick && self.SFX.kick();
        var t1 = hayCorte ? Math.round(tViaje * 0.55) : tViaje;
        self.tweens.add({ targets: bola, x: hayCorte ? cruce.x : destino.x, y: hayCorte ? cruce.y : destino.y, duration: t1, ease: hayCorte ? "Sine.easeIn" : "Sine.easeInOut" });
        self.tweens.add({ targets: bola, angle: 720, duration: t1 });
      });

      /* --- EL QUE SE TIRA: entra al cruce y todo se CLAVA (freeze + silencio) --- */
      if (hayCorte) {
        this.time.delayedCall(tEntrada + Math.round(tViaje * 0.18), function () {
          cort = self.figuraDePlano("barrida", cfg.cortador, true, W + 120, cruce.y - 40, 250, true);
          self.placaDePlano(W - 150, H * 0.9, cfg.cortador, true);
          self.tweens.add({ targets: cort, x: cruce.x + 96, angle: -18, duration: Math.round(tViaje * 0.42), ease: "Quad.easeIn" });
          self.SFX && self.SFX.whoosh && self.SFX.whoosh(240);
        });
        this.time.delayedCall(tEntrada + Math.round(tViaje * 0.55), function () {
          self.musicaDuck(silencio);              // el silencio antes de saber
          self.cineFX.clear();
          self.tweens.killTweensOf(bola);
          if (cort) self.tweens.killTweensOf(cort);
        });
      }

      var revelar = function () {
        if (esc.revelado) return; esc.revelado = true;
        if (cfg.win) {
          self.uiCam.flash(60, 255, 255, 255);
          self.SFX && self.SFX.whoosh && self.SFX.whoosh(300);
          if (bola.active) self.tweens.add({ targets: bola, x: destino.x, y: destino.y, angle: 1080, duration: self.msV(320), ease: "Sine.easeOut" });
          if (cort && cort.active) self.tweens.add({ targets: cort, y: "+=26", angle: -74, alpha: 0.45, duration: 320 });
          if (rec && rec.active) self.tweens.add({ targets: rec, scale: rec.scale * 1.12, duration: 260 });
          self.punch(cfg.titulo || (hayCorte ? "¡PASÓ ENTRE LAS PIERNAS!" : "¡LA PUSO JUSTO!"),
            cfg.sub || (cfg.alVacio ? "la dejó en el camino y el pibe pica" : "toque y a seguir"), 0x7ee08a);
        } else {
          self.SFX && self.SFX.gloves && self.SFX.gloves();
          self.uiCam.shake(220, 0.006);
          if (cort && cort.active) {
            if (bola.active) bola.setPosition(cort.x - 30, cort.y + 60);
            self.tweens.add({ targets: cort, scale: cort.scale * 1.14, angle: 0, duration: 280 });
          }
          self.punch(cfg.titulo || (hayCorte ? "¡CORTADO!" : "¡LA TIRÓ LARGA!"),
            cfg.sub || (hayCorte ? "estaba parado en la línea de pase · pelota rival" : "nadie la alcanzó · pelota rival"), 0xe3503e);
        }
      };
      var cerrarYa = function () {
        if (esc.cerrado) return; esc.cerrado = true;
        self._escSkip = null;
        self.cerrarEscena(cfg.alFinal);
      };
      this._escSkip = function () { if (!esc.revelado) revelar(); else cerrarYa(); };

      var tRevela = hayCorte ? tEntrada + Math.round(tViaje * 0.55) + silencio : tEntrada + tViaje;
      this.time.delayedCall(tRevela, revelar);
      this.time.delayedCall(tRevela + tHold, cerrarYa);
    }

  });
})();
