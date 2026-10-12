/* ============================================================================
   PAMPA STAR · phaser/scenes/toma_remate.js — LA TOMA DEL REMATE (oct 2026)

   Rodri: "agregale cuando va a patear como que se frene o quede suspendido
   el jugador y haya un movimiento de la cámara, como enfocándolo en 3D,
   mientras va subiendo la pierna o bajándola, para darle más épica".

   La toma, de punta a punta (≈1,6 s; el súper tiro ≈2,3 s):
     ENTRADA   corte seco a la pintura; el jugador en el aire, QUIETO. La
               música se va (bajón) y el polvo queda flotando: el tiempo se
               suspendió.
     CARGA     la cámara GIRA alrededor del jugador —la ilustración montada en
               una malla 3D— y se acerca, mientras la pierna SUBE para atrás
               doblando la rodilla (logic/pierna.js). Un riser que crece.
     GOLPE     la pierna baja de golpe. EL CONTACTO es el cuadro en que pasa
               por la pose dibujada: ahí y solo ahí suena la patada, con el
               destello, el congelado y el temblor. La pelota sale disparada.
     FINAL     el pie termina arriba, la cámara se planta, y corte al viaje.

   La pelota es OTRA malla con la misma cámara: así queda pegada al botín
   mientras todo gira, sin calcular proyecciones a mano. En el contacto se
   esconde y sale una pelota 2D desde ese mismo punto de la pantalla.

   No hay dibujos nuevos ni coordenadas inventadas: es la pose "remate" del
   manifest, con los huesos medidos que viven ahí mismo ("pierna").

   Un toque durante la toma adelanta al golpe; otro, la cierra.
   Sin WebGL (o sin huesos en el manifest) la toma no corre y el remate usa
   la viñeta de siempre: puedeTomaDelRemate() lo decide.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.PampaMatch) return;
  var W = 960, H = 540;

  Object.assign(window.PampaMatch.prototype, {
    puedeTomaDelRemate: function () {
      if (!window.PampaPierna || !window.Phaser) return false;
      if (this.FLAGS && this.FLAGS.toma_remate === false) return false;
      var r = this.sys && this.sys.renderer;
      if (!r || r.type !== Phaser.WEBGL || !this.add.plane) return false;
      var man = this.game.registry.get("poses");
      var def = man && man.poses && man.poses.remate;
      return !!(def && def.pierna && this.poseKey && this.poseKey("remate"));
    },

    /* cfg: { j, especial, etiqueta, titulo, sub, siluetas, alFinal } */
    tomaDelRemate: function (cfg) {
      var self = this, PI = window.PampaPierna, FE = window.PampaFeel;
      var man = this.game.registry.get("poses"), def = man.poses.remate;
      var TB = (this.BAL && this.BAL.toma) || {};
      var especial = !!cfg.especial;
      var T = this.msV(especial ? (TB.especial_ms || 2300) : (TB.ms || 1650));

      /* --- el corte a la toma --- */
      this.estado = "ESCENA";
      this.quitarDuelo(); this.limpiarMenu();
      this.mundoLayer.setVisible(false); this.hudLayer.setVisible(false);
      this.cineLayer.setVisible(true);
      this.uiCam.setZoom(1); this.uiCam.centerOn(W / 2, H / 2);
      this.limpiarContenido();
      this.cineBG.clear();
      var pintado = !!(this.fondoCine && (especial
        ? this.fondoCine("golpe", { bando: "oro", cx: 0.42, cy: 0.5 })
        : this.fondoCine("escena", {})));
      if (!pintado) { this.cineBG.fillStyle(0x0b1c2a, 1); this.cineBG.fillRect(0, 0, W, H); }
      this.cineLabel.setText(cfg.etiqueta || "· EL REMATE ·");
      var fondo = this.cineFondo && this.cineFondo.visible ? this.cineFondo : null;
      var fondoX = fondo ? fondo.x : 0;
      if (fondo) fondo.setScale(fondo.scaleX * 1.06);

      /* --- la ilustración en la malla --- */
      var key = this.poseKey("remate");
      if (window.PampaHaloAsegurar) window.PampaHaloAsegurar(key);
      if (cfg.j && cfg.j.esVos && this.poseHeroeTenida) key = this.poseHeroeTenida(cfg.j, "remate") || key;
      var img = this.textures.get(key).getSourceImage();
      var tw = img.width, th = img.height;
      var B = PI.huesos(def.pierna, tw, th);
      var GX = TB.malla || 48;
      var plano = this.add.plane(W * 0.42, H * 0.47, key, null, GX, GX);
      plano.ignoreDirtyCache = true;
      /* LA CÁMARA DE LA MALLA. Phaser ubica la cámara de cada Plane según el
         alto de SU textura (setViewHeight): con eso, 1 unidad de modelo mide
         en pantalla lo que mide la textura de alto. La pelota es otra malla
         con otra textura (128 px): si no se le da LA MISMA cámara que a la
         pose, proyecta ocho veces más chica y en otro lugar (visto en la
         primera prueba: una pelotita en la cadera). Las dos usan th. */
      plano.setViewHeight(th);
      var PX = th, ALTO = especial ? (TB.alto_especial || 420) : (TB.alto || 400);
      var sy0 = ALTO / PX, sx0 = sy0 * (tw / th);
      plano.modelScale.x = sx0; plano.modelScale.y = sy0;
      var vs = plano.vertices, n = vs.length;
      var rx = new Float32Array(n), ry = new Float32Array(n), px = new Float32Array(n), py = new Float32Array(n);
      for (var i = 0; i < n; i++) { rx[i] = vs[i].u * tw; ry[i] = vs[i].v * th; }
      var W8 = PI.pesos(rx, ry, B);
      this.cineContent.add(plano);

      /* --- la pelota: otra malla, misma cámara, pegada al botín --- */
      var pel = def.pelota || { x: 0.884, y: 0.737, r: 0.126 };
      var pelPx = [pel.x * tw, pel.y * th], pelR = pel.r * th;
      var TP = this.texPelota ? this.texPelota(pelR * 2 * sy0) : { key: "ball", esc: 1 };
      var bola = this.add.plane(plano.x, plano.y, TP.key, null, 1, 1);
      bola.ignoreDirtyCache = true;
      bola.setViewHeight(th);
      bola.modelScale.x = sx0; bola.modelScale.y = sy0;
      this.cineContent.add(bola);
      var ponerBola = function (cx, cy, giro) {
        /* el cuadrado de la pelota, en el mismo espacio de modelo que la
           pose; girando despacio (el tiempo está suspendido, no muerto) */
        var bv = bola.vertices, c = Math.cos(giro || 0), sn = Math.sin(giro || 0);
        for (var k = 0; k < bv.length; k++) {
          var ox = (bv[k].u - 0.5) * 2 * pelR, oy = (bv[k].v - 0.5) * 2 * pelR;
          var x = cx + ox * c - oy * sn, y = cy + ox * sn + oy * c;
          bv[k].x = x / tw - 0.5; bv[k].y = 0.5 - y / th;
        }
      };

      /* --- lo que flota: el polvo quieto del tiempo suspendido --- */
      var polvo = this.add.particles(0, 0, "spark", {
        x: { min: 120, max: 840 }, y: { min: 80, max: 470 }, lifespan: 2200,
        speed: { min: 4, max: 14 }, scale: { start: 0.5, end: 0.2 }, alpha: { start: 0.55, end: 0 },
        frequency: 70, tint: especial ? 0xffd84d : 0xf6efdc
      });
      this.cineContent.add(polvo);
      /* el velo: la escena se oscurece en la carga y se abre con el golpe */
      var velo = this.add.rectangle(W / 2, H / 2, W, H, 0x050a12, 0).setDepth(1);
      this.cineContent.add(velo);
      this.cineContent.bringToTop(plano); this.cineContent.bringToTop(bola);
      if (cfg.siluetas) {
        var tS = this.add.text(W - 16, 40, "entre vos y el arco: " + cfg.siluetas + " + el arquero", { fontFamily: window.PF.texto, fontSize: "12px", color: "#f6efdc", backgroundColor: "#0a1f13cc", padding: { x: 6, y: 3 } }).setOrigin(1, 0);
        (this.cineInfo || this.cineContent).add(tS);
      }
      if (especial) {
        this.lineasVelocidad(W * 0.42, H * 0.5, 1.4, 0xffd84d);
        this.punch(cfg.titulo || "¡SÚPER TIRO!", cfg.sub || "", 0xffd84d);
      }

      /* --- el sonido: la música se va y un riser llega justo al golpe --- */
      var co0 = PI.coreografia(0);
      var tGolpe = T * co0.contacto;
      this.musicaDuck(T + 300);
      var snd = this.SFX;
      if (snd) {
        snd.whoosh && snd.whoosh(Math.round(T * 0.14));
        this.time.delayedCall(Math.round(T * 0.12), function () {
          if (est.cerrado) return;
          var ris = especial ? snd.riserGrande : snd.riser;
          ris && ris.call(snd, Math.max(0.3, (tGolpe - T * 0.12) / 1000));
        });
      }

      /* --- la toma corre por un contador (el mismo reloj que todo, ver
             scenes/reloj.js): el progreso maneja pierna, cámara y velo --- */
      var est = { t: 0, contacto: false, cerrado: false, saltada: false };
      var aplicar = function (t) {
        est.t = t;
        var co = PI.coreografia(t);
        PI.posar(rx, ry, W8, B, co, px, py);
        for (var k = 0; k < n; k++) { vs[k].x = px[k] / tw - 0.5; vs[k].y = 0.5 - py[k] / th; }
        var bp = PI.puntoDelPie(pelPx, B, co);
        /* antes del contacto la pelota espera en el piso, donde la va a
           encontrar el pie (no viaja con la pierna hacia atrás) */
        if (!est.contacto) ponerBola(pelPx[0], pelPx[1], t * 1.4); else ponerBola(bp[0], bp[1], t * 1.4);
        var orbit = especial ? 1.3 : 1;
        [plano, bola].forEach(function (m) {
          m.modelRotation.y = co.orbitaY * orbit;
          m.modelRotation.x = co.orbitaX;
          m.modelRotation.z = co.inclinacion;
          m.modelScale.x = sx0 * co.escala; m.modelScale.y = sy0 * co.escala;
        });
        /* el fondo se corre al revés que la cámara: es lo que vende el giro */
        if (fondo) fondo.x = fondoX - co.orbitaY * orbit * 46;
        velo.setAlpha(est.contacto ? 0 : 0.28 * PI.suave(0.05, co0.contacto, t));
        if (!est.contacto && t >= co.contacto) contacto();
      };

      /* --- EL CONTACTO --- */
      var contacto = function () {
        if (est.contacto) return; est.contacto = true;
        snd && snd.kick && snd.kick();
        self.uiCam.flash(especial ? 140 : 90, 255, 255, 235);
        self.uiCam.shake(especial ? 300 : 200, especial ? 0.014 : 0.009);
        if (FE && FE.hitstop) FE.hitstop(self, "fuerte", especial ? 3 : 2);
        /* la pelota sale de donde está en la pantalla (su malla ya proyectada) */
        var bv = bola.vertices, sx = 0, sy = 0, cnt = 0;
        for (var k = 0; k < bv.length; k++) { if (bv[k].tx != null) { sx += bv[k].tx; sy += bv[k].ty; cnt++; } }
        var bx = cnt ? sx / cnt : plano.x + 150, by = cnt ? sy / cnt : plano.y + 100;
        bola.setVisible(false);
        var vuela = self.add.sprite(bx, by, TP.key).setScale(TP.esc * 1.1);
        self.cineContent.add(vuela);
        self.tweens.add({ targets: vuela, x: W + 160, y: by - 150, scale: TP.esc * 2.6, angle: 540,
          duration: Math.round(T * 0.2), ease: "Quad.easeIn" });
        self.lineasVelocidad(bx, by, especial ? 1.8 : 1.3, especial ? 0xffd84d : 0xf6efdc);
        if (self.burst) self.burst(bx, by);
        if (!especial) self.punch(cfg.titulo || "¡LE PEGÁS!", cfg.sub || "", 0xffd84d);
      };

      var cerrar = function () {
        if (est.cerrado) return; est.cerrado = true;
        self._escSkip = null;
        if (contador) contador.stop();
        if (polvo && polvo.stop) polvo.stop();
        if (fondo) { fondo.x = fondoX; fondo.setScale(fondo.scaleX / 1.06); }
        self.respirar && self.respirar();
        /* corte seco: un instante de negro y al viaje */
        self.cineBig.setAlpha(0); self.cineSub.setAlpha(0);
        self.cineBlack.setAlpha(1);
        self.time.delayedCall(60, function () {
          self.cineBlack.setAlpha(0);
          plano.destroy(); bola.destroy();
          self.limpiarContenido();
          if (cfg.alFinal) cfg.alFinal();
        });
      };

      var contador = this.tweens.addCounter({
        from: 0, to: 1, duration: T, ease: "Linear",
        onUpdate: function (tw) { if (!est.cerrado) aplicar(tw.getValue()); },
        onComplete: function () { aplicar(1); self.time.delayedCall(Math.round(T * 0.08), cerrar); }
      });
      aplicar(0);

      /* un toque: al golpe. Otro: afuera. */
      this._escSkip = function () {
        if (!est.contacto) {
          contador.stop();
          var co = PI.coreografia(0);
          aplicar(co.contacto + 0.001);
          var fin = co.contacto + 0.001;
          self.tweens.addCounter({ from: fin, to: 1, duration: Math.round(T * (1 - fin) * 0.5),
            onUpdate: function (tw) { if (!est.cerrado) aplicar(tw.getValue()); },
            onComplete: function () { cerrar(); } });
        } else cerrar();
      };
      return T;
    }
  });
})();
