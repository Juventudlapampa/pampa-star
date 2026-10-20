/* ============================================================================
   PAMPA STAR · phaser/scenes/toque_ui.js — EL TOQUE (playtest del 20/oct, 5)
   El dibujo y los controles de logic/toque.js. Mixin de PampaMatch, como el
   jugadón. Estado "TOQUE": el partido de abajo no corre.
   Mouse: el jugador va hacia el puntero y el clic le pega. Dedo: arrastrás
   para moverte y tocás ¡PEGALE!. Teclado: flechas o WASD y ESPACIO.
   ========================================================================== */
(function () {
  "use strict";
  /* SESGO: lo cercano se corre a la izquierda, así el arco se ve de tres cuartos */
  var W = 960, H = 540, X0 = 70, PXM = 68.3, Y_LEJOS = 300, Y_CERCA = 470, HPX = 58, SESGO = 18;

  Object.assign(window.PampaMatch.prototype, {

    toqueEnArea() {
      if (!this.FLAGS.toque) return false;
      var st = this.st, j = st.mios[st.ctrl], A = this.BAL.toque.area;
      return st.W - j.x < A.largo_px && Math.abs(j.y - st.H / 2) < A.ancho_medio_px;
    },
    toqueAPantalla(x, z, h) {
      var D = this.BAL.toque.cancha.D, s = 0.8 + 0.2 * z / D;
      return { x: X0 + x * PXM - (z - D / 2) * SESGO, y: Y_LEJOS + (Y_CERCA - Y_LEJOS) * z / D - h * HPX * s, s: s };
    },
    toqueAMundo(sx, sy) {
      var D = this.BAL.toque.cancha.D, z = (sy - Y_LEJOS) / (Y_CERCA - Y_LEJOS) * D;
      return { x: (sx - X0 + (z - D / 2) * SESGO) / PXM, z: z };
    },

    /* alFinal({ zona, texto, res }): la zona va a duel.resolveShot por el
       camino de siempre (ejDeLaSituacion o tiroPorComandos) */
    entrarToque(alFinal) {
      var st = this.st, j = st.mios[st.ctrl], C = this.BAL.toque, T = window.PampaToque, self = this;
      this._toqueN = (this._toqueN || 0) + 1;
      var e = T.crearJugada({
        semilla: (st.golesMio * 31 + st.golesRival * 17 + this._toqueN) * 7919 + Math.floor(st.minuto * 100),
        cfg: C,
        jugador: { stats: j.stats, aguanteFrac: j.aguante / this.BAL.aguante.max, pie: T.pieDe(j) }
      });
      this.jugadonAbrir("· EL TOQUE · " + e.origen.n);
      this.estado = "TOQUE";
      this.cineBG.clear();
      this.toqueFondo();
      /* teñir las poses ahora y no en el golpe (cada una cuesta su tirón) */
      ["corriendo", "recibiendo", "remate", "volea", "cabezazo", "chilena"].forEach(function (p) { self.poseDePlano(p, j, false); });
      var alta = e.T.h > C.tecnicas.volea.h[1], baja = e.T.h <= C.tecnicas.remate.h[1];
      var tq = this._tq = { e: e, j: j, alFinal: alFinal, pre: 0.8, obj: null, teclado: false, ev: [], teclas: [], alta: alta };
      tq.sombra = this.add.ellipse(0, 0, 32, 12, 0x000000, 0.4);
      tq.anillo = this.add.graphics();
      tq.marca = this.add.text(0, 0, alta ? "CABEZA" : (e.jug.pie === "izq" ? "PIE IZQ" : "PIE DER"),
        { fontFamily: window.PF.texto, fontSize: "14px", color: "#0a1f13", backgroundColor: "#f6efdc", padding: { x: 4, y: 1 } }).setOrigin(0.5, 0);
      tq.mira = this.add.graphics();
      tq.prota = this.add.image(0, 0, this.poseDePlano("recibiendo", j, false)).setOrigin(0.5, 1);
      var TB = this.texPelota(34);
      tq.bola = this.add.image(0, 0, TB.key).setScale(TB.esc);
      tq.bolaEsc = TB.esc;
      [tq.sombra, tq.anillo, tq.marca, tq.mira, tq.prota, tq.bola].forEach(function (o) { self.cineContent.add(o); });

      var tactil = this.sys.game.device.input.touch;
      var pie = e.jug.pie === "izq" ? "IZQUIERDO" : "DERECHO";
      var info = this.add.text(18, 14, (j.esVos ? "VOS" : String(j.nombre || "").toUpperCase()) + " · PIE HÁBIL: " + pie,
        { fontFamily: window.PF.display, fontSize: "15px", color: "#f6efdc", stroke: "#0a1f13", strokeThickness: 4 });
      tq.lectura = this.add.text(W / 2, 64, "¡AHÍ VIENE!", { fontFamily: window.PF.display, fontSize: "24px", color: "#ffd84d", stroke: "#0a1f13", strokeThickness: 6 }).setOrigin(0.5);
      var ayuda = this.add.text(18, H - 50, tactil ? "arrastrá para acomodarte · tocá ¡PEGALE! cuando llega" : "mouse o flechas: te acomodás · clic o ESPACIO: le pegás",
        { fontFamily: window.PF.texto, fontSize: "16px", color: "#f6efdc", stroke: "#0a1f13", strokeThickness: 4 }).setOrigin(0, 0.5);
      [info, tq.lectura, ayuda].forEach(function (o) { self.cineContent.add(o); });
      this.jugadonBoton(W - 120, H - 34, 200, "¡PEGALE!", 0xffd84d, function () { self.toquePegar(); });

      var mover = function (p) { if (self._tq === tq && (!p.wasTouch || p.isDown)) tq.obj = self.toqueAMundo(p.x, p.y); };
      var bajar = function (p) {
        if (self._tq !== tq) return;
        if (p.wasTouch) tq.obj = self.toqueAMundo(p.x, p.y);
        else self.toquePegar();
      };
      var tecla = function (ev) { if (self._tq === tq) { if (ev && ev.preventDefault) ev.preventDefault(); self.toquePegar(); } };
      this.input.on("pointermove", mover); this.input.on("pointerdown", bajar);
      tq.ev = [["pointermove", mover], ["pointerdown", bajar]];
      if (this.input.keyboard) {
        this.input.keyboard.on("keydown-SPACE", tecla); this.input.keyboard.on("keydown-ENTER", tecla);
        tq.teclas = [["keydown-SPACE", tecla], ["keydown-ENTER", tecla]];
      }
      this.pedirMusica("jugadon");
      this.toqueDibujar(0);
    },

    toqueFondo() {
      var tinte = this.tinteIlustrado ? this.tinteIlustrado() : null;
      var pintado = !!(this.fondoCine && this.fondoCine("cancha_alta", { y0: 262 }));
      var g = this.cineBG;
      if (!pintado) { g.fillStyle(0x123a5a, 1); g.fillRect(0, 0, W, 262); g.fillStyle(0x2e7d32, 1); g.fillRect(0, 262, W, H - 262); }
      if (this.textures.exists("fondo_tribuna") && (!pintado || !this.ambienteEsPueblo || this.ambienteEsPueblo())) {
        var trib = this.add.image(W / 2, 262, "fondo_tribuna").setOrigin(0.5, 1);
        trib.setScale(W / trib.width);
        if (tinte != null) trib.setTint(tinte);
        this.cineContent.add(trib);
      }
      /* franjas del corte de pasto, la línea del área y el arco, en perspectiva */
      var L = this.BAL.toque.cancha.L, D = this.BAL.toque.cancha.D, self = this, l = this.add.graphics();
      var P = function (x, z, h) { return self.toqueAPantalla(x, z, h || 0); };
      for (var x = -1; x < L + 1; x += 3) {
        var a = P(x, -1), b = P(x + 1.5, -1), c = P(x + 1.5, D + 0.4), d = P(x, D + 0.4);
        l.fillStyle(0xffffff, 0.06); l.fillPoints([a, b, c, d], true);
      }
      l.lineStyle(3, 0xeafff0, 0.55);
      var a1 = P(9.2, -1), a2 = P(9.2, D + 0.4); l.lineBetween(a1.x, a1.y, a2.x, a2.y);
      var g1 = P(11.7, 1), g2 = P(11.7, 4), t1 = P(11.7, 1, 2.44), t2 = P(11.7, 4, 2.44);
      l.lineStyle(1, 0xdfeef6, 0.4);
      for (var k = 0; k <= 6; k++) { var n1 = P(11.7, 1 + k * 0.5, 2.44), n2 = P(12.4, 1 + k * 0.5, 0); l.lineBetween(n1.x, n1.y, n2.x, n2.y); }
      l.lineStyle(5, 0xffffff, 1);
      l.lineBetween(g1.x, g1.y, t1.x, t1.y); l.lineBetween(g2.x, g2.y, t2.x, t2.y); l.lineBetween(t1.x, t1.y, t2.x, t2.y);
      this.cineContent.add(l);
      var karq = this.poseRivalNaranja ? this.poseRivalNaranja("arquero_ataja") : null;
      if (!karq) karq = this.figuraArquero("ataja", "toque (arquero rival)", true);
      var pa = P(12.1, 2.5);
      var arq = this.add.image(pa.x, pa.y, karq).setOrigin(0.5, 1);
      arq.setScale(this.escalaDePose("arquero_ataja", 1.9 * HPX * pa.s, arq));
      this.cineContent.add(arq);
    },

    updateToque(delta) {
      var tq = this._tq;
      if (!tq || tq.resuelto) return;
      var dt = Math.min(0.05, delta / 1000), e = tq.e;
      var k = this.cursors, w = this.wasd;
      if (k && w) {
        var dx = ((k.right.isDown || w.D.isDown) ? 1 : 0) - ((k.left.isDown || w.A.isDown) ? 1 : 0);
        var dz = ((k.down.isDown || w.S.isDown) ? 1 : 0) - ((k.up.isDown || w.W.isDown) ? 1 : 0);
        if (dx || dz) { tq.obj = { x: e.jug.x + dx * 0.8, z: e.jug.z + dz * 0.8 }; tq.teclado = true; }
        else if (tq.teclado) { tq.obj = null; tq.teclado = false; }
      }
      if (tq.pre > 0) {
        tq.pre -= dt;
        if (tq.pre <= 0) tq.lectura.setText(tq.alta ? "VIENE ALTA · ponete abajo y saltá" : (e.T.h <= this.BAL.toque.tecnicas.remate.h[1] ? "VIENE BAJA · que caiga en tu pie" : "VIENE A MEDIA ALTURA · de volea"));
      } else {
        var antes = { x: e.jug.x, z: e.jug.z };
        window.PampaToque.paso(e, dt, tq.obj);
        tq.corre = Math.hypot(e.jug.x - antes.x, e.jug.z - antes.z) > 0.002;
        tq.izq = e.jug.x < antes.x - 0.001;
      }
      this.toqueDibujar(dt);
      if (e.fin) this.toqueResolver();
    },

    toquePegar() {
      var tq = this._tq;
      if (!tq || tq.pre > 0 || tq.e.golpe || tq.e.fin) return;
      if (window.PampaToque.pegar(tq.e)) this.SFX && this.SFX.whoosh();
    },

    toqueDibujar(dt) {
      var tq = this._tq, e = tq.e, j = e.jug, T = window.PampaToque, C = this.BAL.toque;
      var b = T.bolaEn(e, e.golpe ? Math.min(e.t, e.golpe.tc) : e.t);
      var pj = this.toqueAPantalla(j.x, j.z, 0);
      var pose = "recibiendo", lift = 0;
      if (e.golpe) {
        pose = C.tecnicas[e.golpe.tecnica].pose;
        if (e.golpe.tecnica === "cabezazo" || e.golpe.tecnica === "chilena") {
          var f = Math.min(1, (e.t - e.golpe.ts) / C.tecnicas[e.golpe.tecnica].swing);
          lift = j.salto * Math.sin(f * Math.PI / 2) * HPX * pj.s;
        }
      } else if (tq.corre) pose = "corriendo";
      if (tq.poseAhora !== pose) {
        tq.prota.setTexture(this.poseDePlano(pose, tq.j, false));
        tq.prota.setScale(this.escalaDePose(pose, 1.85 * HPX * pj.s, tq.prota));
        tq.poseAhora = pose;
      }
      var bob = pose === "corriendo" ? Math.abs(Math.sin(this.time.now / 70)) * 4 : 0;
      tq.prota.setPosition(pj.x, pj.y - lift - bob);
      tq.prota.setFlipX(pose === "corriendo" && !!tq.izq);

      /* el punto dulce: ahí tiene que caer la sombra de la pelota */
      var pd = T.puntoDulce(e, tq.alta ? "cabezazo" : "remate", tq.alta ? 0 : j.lado), ps = this.toqueAPantalla(pd.x, pd.z, 0);
      tq.anillo.clear();
      tq.anillo.fillStyle(0xffffff, e.golpe ? 0 : 0.14);
      tq.anillo.fillEllipse(ps.x, ps.y, 46 * ps.s, 18 * ps.s);
      tq.anillo.lineStyle(4, 0xffffff, e.golpe ? 0.3 : 0.95);
      tq.anillo.strokeEllipse(ps.x, ps.y, 46 * ps.s, 18 * ps.s);
      tq.marca.setPosition(ps.x, ps.y + 10 * ps.s);

      tq.mira.clear();
      if (tq.obj && !e.golpe && !tq.teclado) {
        var pm = this.toqueAPantalla(tq.obj.x, tq.obj.z, 0);
        tq.mira.lineStyle(2, 0xffffff, 0.6);
        tq.mira.lineBetween(pm.x - 7, pm.y - 3, pm.x + 7, pm.y + 3); tq.mira.lineBetween(pm.x - 7, pm.y + 3, pm.x + 7, pm.y - 3);
      }

      var p0 = this.toqueAPantalla(b.x, b.z, 0), pb = this.toqueAPantalla(b.x, b.z, b.h);
      tq.sombra.setPosition(p0.x, p0.y).setScale(p0.s).setAlpha(0.25 + 0.45 * (1 - Math.min(1, b.h / 3)));
      tq.bola.setPosition(pb.x, pb.y).setScale(tq.bolaEsc * pb.s);
      tq.bola.rotation += dt * 9;
      var cc = this.cineContent;
      if (b.z >= j.z) cc.bringToTop(tq.bola);
      else if (cc.getIndex(tq.bola) > cc.getIndex(tq.prota)) cc.moveTo(tq.bola, cc.getIndex(tq.prota));
    },

    toqueResolver() {
      var tq = this._tq, e = tq.e, res = e.fin, C = this.BAL.toque, T = window.PampaToque, self = this;
      tq.resuelto = true;
      var zona = T.zonaDeContacto(res, C), texto = T.textoDeContacto(res, C);
      tq.anillo.clear(); tq.marca.setVisible(false); tq.mira.clear();
      if (res.contacto) {
        if (zona.id === "angulo") { this.SFX && this.SFX.kickFuerte(); this.uiCam.shake(140, 0.006); }
        else this.SFX && this.SFX.kick();
        var alto = zona.id === "angulo" ? 2.2 : (zona.id === "palo" ? 0.6 : 1.5);
        var meta = this.toqueAPantalla(11.8, 2.5 + Math.sign(zona.gy) * 1.3, alto);
        this.tweens.add({ targets: tq.bola, x: meta.x, y: meta.y, scale: tq.bolaEsc * 0.7, duration: this.msV(300), ease: "Quad.easeOut" });
      }
      tq.lectura.setText(zona.dice);
      var t2 = this.add.text(W / 2, 100, texto + " · " + zona.n, { fontFamily: window.PF.texto, fontSize: "20px", color: "#f6efdc", stroke: "#0a1f13", strokeThickness: 5 }).setOrigin(0.5);
      this.cineContent.add(t2);
      this.tweens.add({ targets: tq.lectura, scale: 1.25, duration: 160, yoyo: true });
      this.time.delayedCall(this.msV(1200), function () { self.toqueCerrar({ zona: zona, texto: texto, res: res }); });
    },

    toqueCerrar(salida) {
      var tq = this._tq, self = this;
      this._tq = null;
      tq.ev.forEach(function (p) { self.input.off(p[0], p[1]); });
      tq.teclas.forEach(function (p) { self.input.keyboard.off(p[0], p[1]); });
      this.jugadonLimpiarBotones();
      this.limpiarContenido();
      this.estado = "RESOLUCION";
      tq.alFinal(salida);
    }
  });
})();
