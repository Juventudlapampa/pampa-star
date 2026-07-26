/* ============================================================================
   PAMPA STAR · phaser/scenes/jugadon_ui.js — LA PLATAFORMA DEL JUGADÓN (V8 §3)
   La escena de acción de las 6 fichas (2 SÚPER QUITES · 2 GAMBETAS · 2 SÚPER
   TIROS por partido). Cancha MÁS ANCHA QUE LARGA, los rivales VIENEN, la
   intención se INSINÚA de los dos lados (lectura mutua, la CPU no copia) y
   el SÚPER TIRO se resuelve por FÍSICA REAL (logic/jugadon.js). Mixin de
   PampaMatch, como la Definición. Estado "JUGADON": la sim no corre.
   ========================================================================== */
(function () {
  "use strict";
  var W = 960, H = 540;

  Object.assign(window.PampaMatch.prototype, {

    jugadonFichas() {
      if (!this.st.fichas) this.st.fichas = window.PampaJugadon.fichasNuevas();
      return this.st.fichas;
    },
    /* el botón EXTRA sobre el menú de cruz — fila 0 y fila 1 (V8 fix 1: las
       fichas se OFRECEN SIEMPRE que queden, así que puede haber dos) */
    botonJugadon(texto, sub, cb, fila) {
      var y = 66 + (fila || 0) * 52;
      var b = this.add.rectangle(480, y, 470, 46, 0xffd84d, 0.97).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
      var t = this.add.text(480, y - 8, texto, { fontFamily: window.PF.display, fontSize: "10px", color: "#0a1f13" }).setOrigin(0.5);
      var s = this.add.text(480, y + 10, sub, { fontFamily: window.PF.texto, fontSize: "12px", color: "#365a41" }).setOrigin(0.5);
      this.menuLayer.add([b, t, s]);
      var self = this;
      b.on("pointerdown", function (p, x, y2, ev) { ev && ev.stopPropagation && ev.stopPropagation(); self._uiTocado = self.time.now; cb(); });
    },

    /* ---- armado común de la plataforma (cancha ANCHA arriba, botones abajo) ---- */
    jugadonAbrir(titulo) {
      this.quitarDuelo(); this.limpiarMenu();
      this.estado = "JUGADON";
      this.st.modo = "congelado";
      this.mundoLayer.setVisible(false); this.hudLayer.setVisible(false);
      this.cineLayer.setVisible(true);
      this.uiCam.setZoom(1); this.uiCam.centerOn(W / 2, H / 2);
      this.limpiarContenido();
      var g = this.cineBG;
      g.clear();
      g.fillStyle(0x081c10, 1); g.fillRect(0, 0, W, H);
      /* la cancha del jugadón: MÁS ANCHA QUE LARGA (960×360 de pasto) */
      g.fillStyle(0x2e7d32, 1); g.fillRect(0, 60, W, 360);
      g.fillStyle(0x388e3c, 1); for (var x = 0; x < W; x += 128) g.fillRect(x, 60, 64, 360);
      g.lineStyle(3, 0xeafff0, 0.5); g.strokeRect(6, 66, W - 12, 348);
      this.cineLabel.setText(titulo);
      this._jg = { sprites: [], botones: [] };
    },
    jugadonCerrar(alFinal) {
      var self = this;
      this.jugadonLimpiarBotones();   // a11y: los listeners de teclado mueren acá
      this.limpiarContenido();
      this.cineLayer.setVisible(false);
      this.mundoLayer.setVisible(!this._split); this.hudLayer.setVisible(true);
      window.PampaPartido.saltoReloj(this.st);   // el jugadón es un MOMENTO
      this.estado = "RESOLUCION";
      if (alFinal) alFinal();
      if (this.estado === "RESOLUCION") { this.st.modo = "juego"; this.estado = "LIBRE"; }
      this.dibujarRadar(); this.refrescarHUD();
    },
    jugadonBoton(x, y, wpx, texto, bg, cb) {
      /* auditoría a11y: cada botón lleva su NÚMERO y responde a esa tecla
         (1..9) — el jugadón es operable solo-dedo Y solo-teclado */
      var num = (this._jg.nBotones = (this._jg.nBotones || 0) + 1);
      var b = this.add.rectangle(x, y, wpx, 54, bg, 0.97).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
      var t = this.add.text(x, y, num + "·" + texto, { fontFamily: window.PF.display, fontSize: "10px", color: "#0a1f13" }).setOrigin(0.5);
      this.cineContent.add(b); this.cineContent.add(t);
      var self = this;
      var disparar = function () { self._uiTocado = self.time.now; cb(); };
      b.on("pointerdown", function (p, xx, yy, ev) { ev && ev.stopPropagation && ev.stopPropagation(); disparar(); });
      if (this.input.keyboard && num <= 9) {
        var teclas = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE"];
        var handler = function () { if (self.estado === "JUGADON" && b.active) disparar(); };
        this.input.keyboard.on("keydown-" + teclas[num - 1], handler);
        this._jg.teclas = this._jg.teclas || [];
        this._jg.teclas.push({ ev: "keydown-" + teclas[num - 1], fn: handler });
      }
      this._jg.botones.push(b, t);
      return b;
    },
    jugadonLimpiarBotones() {
      var self = this;
      (this._jg.botones || []).forEach(function (o) { if (o && o.destroy) o.destroy(); });
      this._jg.botones = [];
      (this._jg.teclas || []).forEach(function (t) { self.input.keyboard && self.input.keyboard.off(t.ev, t.fn); });
      this._jg.teclas = [];
      this._jg.nBotones = 0;
    },
    /* el globo de INTENCIÓN (lectura mutua: texto + flecha, accesible) */
    jugadonGlobo(x, y, texto) {
      var t = this.add.text(x, y, texto, { fontFamily: window.PF.texto, fontSize: "15px", fontStyle: "bold", color: "#0a1f13", backgroundColor: "#ffd84d", padding: { x: 8, y: 4 } }).setOrigin(0.5, 1);
      this.cineContent.add(t);
      this.tweens.add({ targets: t, scale: 1.08, duration: 300, yoyo: true, repeat: -1 });
      return t;
    },

    /* ============ LA GAMBETA — EL MINIJUEGO (V8 C) ============
       Entorno APARTE, cancha más ancha que larga: MOVÉS a tu jugador (dedo o
       flechas), los rivales VIENEN a cerrarte y, cuando uno te alcanza, se
       abre el duelo de LECTURA (tu movida contra su cierre insinuado). Si los
       pasás a todos o llegás al fondo, la jugada TERMINA en remate. */
    entrarJugadonGambeta(rivalIdx) {
      var st = this.st, J = window.PampaJugadon, self = this;
      var yo = st.mios[st.ctrl];
      var defs = [];
      if (rivalIdx != null) defs.push(st.rivales[rivalIdx]);
      st.rivales.forEach(function (r, i) {
        if (defs.length >= 2 || i === rivalIdx || r.pos === "ARQ") return;
        if (Math.hypot(r.x - yo.x, r.y - yo.y) < 220) defs.push(r);
      });
      if (!defs.length) defs.push({ nombre: "RIVAL", stats: { quite: 55 } });
      this._jgLogica = J.crearGambeta({
        semilla: (st.golesMio + 1) * 7919 + Math.floor(st.minuto * 100) + st.ctrl,
        marcadores: defs.length,
        atacante: { gambeta: (yo.stats && yo.stats.gambeta) || 55 },
        defensores: defs.map(function (d) { return { quite: (d.stats && d.stats.quite) || 55, nombre: d.nombre }; })
      });
      this.jugadonAbrir("🌟 EL JUGADÓN · movete y esquivalos — llegá arriba para definir");
      var B = this.BAL.jugadon || {};
      this._jgMini = {
        x: W / 2, y: 380, vel: B.vel_jugador || 320, metaY: B.meta_y || 110,
        rivales: [], duelo: null, terminado: false, t: 0
      };
      var kYo = this.poseHeroeTenida ? (this.poseHeroeTenida(yo) || this.poseKey("corriendo")) : this.poseKey("corriendo");
      var sy = kYo ? this.add.image(this._jgMini.x, this._jgMini.y, kYo) : this.add.rectangle(this._jgMini.x, this._jgMini.y, 40, 90, 0x4fc3f7);
      if (sy.height) sy.setScale(112 / sy.height);
      this.cineContent.add(sy);
      this._jgMini.spr = sy;
      var bola = this.add.sprite(this._jgMini.x + 34, this._jgMini.y + 46, "ball").setScale(1.9);
      this.cineContent.add(bola);
      this._jgMini.bola = bola;
      var kR = this.poseRivalNaranja ? this.poseRivalNaranja("bloqueo") : this.poseKey("bloqueo");
      this._jgLogica.defensores.forEach(function (d, i) {
        var rx = W / 2 + (i === 0 ? -110 : 140), ry = 150 - i * 55;
        var sr = kR ? self.add.image(rx, ry, kR) : self.add.rectangle(rx, ry, 40, 90, 0xff8a50);
        if (sr.height) sr.setScale(100 / sr.height);
        self.cineContent.add(sr);
        var nom = self.add.text(rx, ry - 62, "▲ " + (d.nombre || "RIVAL").toUpperCase().slice(0, 10), { fontFamily: window.PF.texto, fontSize: "13px", color: "#0a1f13", backgroundColor: "#FF8A50", padding: { x: 5, y: 2 } }).setOrigin(0.5);
        self.cineContent.add(nom);
        self._jgMini.rivales.push({ spr: sr, nom: nom, idx: i, vivo: true, vel: (B.vel_rival || 118) + i * 14 });
      });
      /* controles: DEDO (tap/arrastre) y FLECHAS — los dos, siempre */
      this._jgMini.target = null;
      var zona = this.add.rectangle(W / 2, 240, W, 400, 0xffffff, 0.001).setInteractive();
      this.cineContent.add(zona);
      zona.on("pointerdown", function (pp) { self._jgMini.target = { x: pp.x, y: pp.y }; });
      zona.on("pointermove", function (pp) { if (pp.isDown && self._jgMini) self._jgMini.target = { x: pp.x, y: pp.y }; });
      this._jgMini.cursores = this.input.keyboard ? this.input.keyboard.createCursorKeys() : null;
      var ayuda = this.add.text(W / 2, H - 26, "movete con el DEDO o las FLECHAS · llegá arriba para definir", { fontFamily: window.PF.texto, fontSize: "14px", color: "#f6efdc" }).setOrigin(0.5).setAlpha(0.9);
      this.cineContent.add(ayuda);
      this.musica && this.musica("urgente");
    },

    /* el latido del minijuego (lo llama el update: el partido está quieto) */
    updateJugadonMini(delta) {
      var m = this._jgMini, self = this;
      if (!m || m.terminado || m.duelo || !m.spr || !m.spr.active) return;
      var dt = Math.min(0.05, delta / 1000);
      m.t += delta;
      var vx = 0, vy = 0;
      if (m.cursores) {
        if (m.cursores.left.isDown) vx -= 1;
        if (m.cursores.right.isDown) vx += 1;
        if (m.cursores.up.isDown) vy -= 1;
        if (m.cursores.down.isDown) vy += 1;
        if (vx || vy) m.target = null;
      }
      if (!vx && !vy && m.target) {
        var dx = m.target.x - m.x, dy = m.target.y - m.y, d = Math.hypot(dx, dy);
        if (d > 6) { vx = dx / d; vy = dy / d; } else m.target = null;
      }
      if (vx || vy) {
        var n = Math.hypot(vx, vy) || 1;
        m.x = Math.max(60, Math.min(W - 60, m.x + vx / n * m.vel * dt));
        m.y = Math.max(m.metaY - 20, Math.min(410, m.y + vy / n * m.vel * dt));
        m.spr.setFlipX(vx < 0);
        m.spr.setAngle(Math.floor(m.t / 160) % 2 ? 3 : -3);
      } else m.spr.setAngle(0);
      m.spr.setPosition(m.x, m.y);
      m.bola.setPosition(m.x + (m.spr.flipX ? -34 : 34), m.y + 46);
      if (vx || vy) m.bola.rotation += 0.16;
      m.rivales.forEach(function (r) {
        if (!r.vivo || !r.spr.active) return;
        var rdx = m.x - r.spr.x, rdy = m.y - r.spr.y, rd = Math.hypot(rdx, rdy) || 1;
        r.spr.x += rdx / rd * r.vel * dt;
        r.spr.y += rdy / rd * r.vel * dt;
        r.nom.setPosition(r.spr.x, r.spr.y - 62);
        if (rd < ((self.BAL.jugadon && self.BAL.jugadon.contacto) || 78)) self.jugadonDuelo(r);
      });
      if (!m.duelo && !m.terminado && m.y <= m.metaY) self.jugadonRemate();
    },

    /* TE ALCANZÓ: el minijuego se congela y elegís tu movida contra su cierre */
    jugadonDuelo(r) {
      var self = this, g = this._jgLogica, m = this._jgMini;
      if (!m || m.duelo || m.terminado) return;
      m.duelo = r;
      var d = g.defensores[Math.min(r.idx, g.defensores.length - 1)];
      this._jg.sprites.push(this.jugadonGlobo(r.spr.x, r.spr.y - 84, d.cierre.n));
      this.SFX && this.SFX.whoosh && this.SFX.whoosh(220);
      var ops = g.opciones, wpx = Math.min(180, (W - 40) / ops.length - 10);
      ops.forEach(function (mv, i) {
        var x = W / 2 + (i - (ops.length - 1) / 2) * (wpx + 10);
        self.jugadonBoton(x, H - 60, wpx, mv.n, 0xf6efdc, function () { self.jugadonMovida(mv.id, r); });
      });
    },

    jugadonMovida(movidaId, r) {
      var st = this.st, J = window.PampaJugadon, self = this, m = this._jgMini;
      var res = J.cruceGambeta(this._jgLogica, movidaId);
      if (!res) return;
      this.jugadonLimpiarBotones();
      (this._jg.sprites || []).forEach(function (o) { if (o && o.destroy) o.destroy(); });
      this._jg.sprites = [];
      this.SFX && this.SFX.whoosh && this.SFX.whoosh(300);
      if (res.gana) {
        this.avisoJugadon("¡LO PASASTE!", 0x7ee08a);
        if (r) {
          r.vivo = false;
          this.tweens.add({ targets: [r.spr, r.nom], y: "+=170", alpha: 0.25, angle: -60, duration: 420 });
        }
        if (m) m.duelo = null;
        if (m && m.rivales.every(function (x) { return !x.vivo; })) this.time.delayedCall(this.msV(520), function () { self.jugadonRemate(); });
        return;
      }
      if (m) m.terminado = true;
      this.avisoJugadon("¡TE LO LEYÓ!", 0xe3503e);
      this.time.delayedCall(this.msV(900), function () {
        self.jugadonCerrar(function () {
          window.PampaPartido.perderPelota(st);
          self.relatar && self.relatar("gambeta_lose");
        });
      });
    },

    /* pasaste a todos (o llegaste al fondo): la jugada TERMINA en remate */
    jugadonRemate() {
      var self = this, m = this._jgMini, st = this.st;
      if (!m || m.terminado) return;
      m.terminado = true;
      this.jugadonLimpiarBotones();
      this.avisoJugadon("¡QUEDÓ DE FRENTE AL ARCO!", 0xffd84d);
      var F = this.jugadonFichas();
      this.time.delayedCall(this.msV(820), function () {
        st.mios[st.ctrl].x = Math.min(st.W - 60, st.W - 130);   // quedaste en el área
        if (F.tiros > 0 && window.PampaJugadon.gastarFicha(F, "tiros")) {
          self._jgMini = null;
          self.entrarJugadonTiro();
        } else {
          self.jugadonCerrar(function () { self.tiroPorComandos(null); });
        }
      });
    },
    jugadonPintarDefensores() { /* V8 C: los rivales viven en updateJugadonMini */ },
    jugadonPintarOpciones() { /* V8 C: las movidas aparecen SOLO en el duelo */ },

    avisoJugadon(texto, color) {
      var t = this.add.text(W / 2, 250, texto, { fontFamily: window.PF.display, fontSize: "22px", color: "#" + color.toString(16).padStart(6, "0"), stroke: "#0a1f13", strokeThickness: 4 }).setOrigin(0.5).setScale(0.3);
      this.cineContent.add(t);
      this.tweens.add({ targets: t, scale: 1, duration: 260, ease: "Back.easeOut" });
    },

    /* ============ EL SÚPER QUITE (2 fichas) ============ */
    entrarJugadonQuite() {
      var st = this.st, J = window.PampaJugadon, self = this;
      var rival = st.rivales[st.portadorRival] || { nombre: "RIVAL", stats: {} };
      this._jgLogica = J.crearQuite({
        semilla: (st.golesRival + 1) * 6271 + Math.floor(st.minuto * 100),
        defensor: { quite: (st.mios[st.ctrl].stats && st.mios[st.ctrl].stats.quite) || 55 },
        rival: { gambeta: (rival.stats && rival.stats.gambeta) || 55, nombre: rival.nombre }
      });
      this.jugadonAbrir("🌟 SÚPER QUITE · leé su movida y cerrale el camino");
      var kR = this.poseRivalNaranja ? this.poseRivalNaranja("corriendo") : this.poseKey("corriendo");
      if (kR) { var sr = this.add.image(480, 150, kR); sr.setScale(115 / sr.height); sr.setFlipX(true); this.cineContent.add(sr); }
      this._jg.sprites.push(this.jugadonGlobo(480, 84, "▼ " + (rival.nombre || "RIVAL").toUpperCase().slice(0, 12) + " INSINÚA: " + this._jgLogica.movidaRival.n));
      var kYo = this.poseHeroeTenida ? (this.poseHeroeTenida(st.mios[st.ctrl]) || this.poseKey("bloqueo")) : this.poseKey("bloqueo");
      if (kYo) { var sy = this.add.image(480, 350, kYo); sy.setScale(120 / sy.height); this.cineContent.add(sy); }
      var C = J.CIERRES, wpx = 210;
      C.forEach(function (c, i) {
        var x = W / 2 + (i - (C.length - 1) / 2) * (wpx + 8);
        self.jugadonBoton(x, H - 60, wpx, c.n, 0xf6efdc, function () { self.jugadonQuite(c.id); });
      });
      this.musica && this.musica("urgente");
    },
    jugadonQuite(cierreId) {
      var st = this.st, J = window.PampaJugadon, self = this;
      var res = J.resolverQuite(this._jgLogica, cierreId);
      if (!res) return;
      this.jugadonLimpiarBotones();
      this.SFX && this.SFX.gloves && this.SFX.gloves();
      this.avisoJugadon(res.gana ? "¡SE LA SACASTE!" : "¡TE HIZO LA " + res.movidaRival.n + "!", res.gana ? 0x7ee08a : 0xe3503e);
      this.time.delayedCall(this.msV(1000), function () {
        self.jugadonCerrar(function () {
          var P = window.PampaPartido;
          if (res.gana) { P.ganarDefensa(st); self.relatar && self.relatar("quite_win"); }
          else { P.perderDefensa(st); self.relatar && self.relatar("gambeta_lose"); }
        });
      });
    },

    /* ============ EL SÚPER TIRO (2 fichas): la física en pantalla ============ */
    entrarJugadonTiro() {
      var st = this.st, J = window.PampaJugadon, self = this;
      this.jugadonAbrir("🌟 SÚPER TIRO · ¿dónde la ponés? — la física decide");
      /* el ARCO grande (400×140 de lógica, ×1.8 en pantalla) */
      var AW = J.ARCO.w * 1.8, AH = J.ARCO.h * 1.8, ax = W / 2, ayPiso = 380;
      var g = this.add.graphics();
      g.fillStyle(0xdfeef6, 0.35);
      for (var x = -AW / 2; x <= AW / 2; x += 26) g.fillRect(ax + x, ayPiso - AH, 2, AH);
      for (var y = 0; y <= AH; y += 24) g.fillRect(ax - AW / 2, ayPiso - AH + y, AW, 2);
      g.fillStyle(0xffffff, 1);
      g.fillRect(ax - AW / 2 - 8, ayPiso - AH - 8, 10, AH + 8); g.fillRect(ax + AW / 2 - 2, ayPiso - AH - 8, 10, AH + 8);
      g.fillRect(ax - AW / 2 - 8, ayPiso - AH - 8, AW + 18, 10);
      this.cineContent.add(g);
      /* el arquero rival, parado al medio (su ficha humana) */
      var arqR = st.rivales.find(function (r) { return r.pos === "ARQ"; });
      var karq = null;
      try { window.PampaAvatarArte.jugador(this, "jg_arq", (arqR && arqR.look) || window.PampaAvatar.crearLook(), true); karq = "jg_arq_idle"; } catch (e) { }
      this._jg.arq = karq ? this.add.sprite(ax, ayPiso - 40, karq).setScale(2.2) : this.add.rectangle(ax, ayPiso - 40, 30, 60, 0xf6c11d);
      this.cineContent.add(this._jg.arq);
      var lvl = (this._division && this._division.keeper) || st.rivalKeeperSkill || 50;
      var t = this.add.text(ax, ayPiso + 18, "arquero: nivel " + lvl + " · tu fuerza: " + Math.round(this.jugadonFuerza()) + " (tiro + energía)", { fontFamily: window.PF.texto, fontSize: "14px", color: "#f6efdc" }).setOrigin(0.5);
      this.cineContent.add(t);
      /* ============ V9 §5 · NI GRILLA NI ZONAS NUMERADAS ============
         Acá había un arco partido en 6 zonas numeradas, más un hit-rect
         continuo que dejaba tocar hasta el travesaño. Eso es una pantalla de
         apuntado, no un remate. Quedan TRES decisiones de cancha —al palo, al
         medio, al ángulo—, que es lo único que se piensa antes de reventarla.
         Los botones ya traen su número y su tecla (jugadonBoton). */
      var lado = (st.mios[st.ctrl].y > st.H / 2) ? 1 : -1;      // cruzado al palo lejano
      var OPC = [
        { t: "🎯 AL PALO", x: 175 * lado, y: 25 },
        { t: "💥 AL MEDIO", x: 0, y: 20 },
        { t: "⚡ AL ÁNGULO", x: 185 * lado, y: 120 }
      ];
      var wpx = 250;
      OPC.forEach(function (o, i) {
        var bx = W / 2 + (i - 1) * (wpx + 14);
        self.jugadonBoton(bx, H - 58, wpx, o.t, 0xffd84d, function () {
          self.jugadonTirar({ x: o.x, y: o.y }, ax, ayPiso, AW, AH);
        });
      });
      var tAyuda = this.add.text(W / 2, H - 96, "elegí DÓNDE la ponés — la física decide si entra", { fontFamily: window.PF.texto, fontSize: "13px", color: "#f6efdc" }).setOrigin(0.5).setAlpha(0.9);
      this.cineContent.add(tAyuda);
      this.musica && this.musica("urgente");
    },
    jugadonFuerza() {
      var yo = this.st.mios[this.st.ctrl];
      var tiro = (yo.stats && yo.stats.tiro) || 55;
      return tiro + (yo.aguante / this.BAL.aguante.max) * 60;   // la energía suma (doc: fuerza y energía)
    },
    jugadonTirar(zona, ax, ayPiso, AW, AH) {
      /* auditoría: un solo tiro por ficha — el doble tap no dispara dos veces */
      if (this._jg.tirado) return;
      this._jg.tirado = true;
      var st = this.st, J = window.PampaJugadon, self = this;
      var yo = st.mios[st.ctrl];
      var lvl = (this._division && this._division.keeper) || st.rivalKeeperSkill || 50;
      var res = J.resolverSuperTiro({
        semilla: (st.golesMio + st.golesRival + 3) * 104729 + Math.floor(st.minuto * 100),
        fuerza: this.jugadonFuerza(),
        precision: (yo.stats && yo.stats.tiro) || 55,
        zona: zona,
        arquero: { reflejos: lvl, manos: lvl }
      });
      /* el TEATRO cuenta la física: la pelota viaja a la zona REAL, el arquero
         vuela a DONDE ELIGIÓ (no a donde va la pelota) */
      var d = res.detalle || {};
      var zr = d.zonaReal || zona;
      var bx = ax + (zr.x || zona.x) * 1.8, by = ayPiso - (zr.y || zona.y) * 1.8;
      var ball = this.add.sprite(W / 2, 470, "ball").setScale(2.4);
      this.cineContent.add(ball);
      this.tweens.add({ targets: ball, x: bx, y: by, scale: 1.1, duration: this.msV(480), ease: "Quad.easeIn" });
      if (d.arqX !== undefined && this._jg.arq) {
        var karqV = this.poseKey("arquero_vuela");
        if (karqV) { this._jg.arq.destroy(); this._jg.arq = this.add.image(ax, ayPiso - 60, karqV); this._jg.arq.setScale(150 / this._jg.arq.height); this.cineContent.add(this._jg.arq); }
        this.tweens.add({ targets: this._jg.arq, x: ax + d.arqX * 1.8, y: ayPiso - 90, duration: this.msV(460), ease: "Quad.easeOut" });
      }
      this.SFX && this.SFX.kick && this.SFX.kick();
      this.time.delayedCall(this.msV(560), function () {
        var msj, color, snd = self.SFX;
        if (res.outcome === "gol") {
          msj = d.llego === false ? "¡GOOOL! ¡NO LLEGÓ!" : "¡GOOOL! ¡SE LE ESCAPÓ!"; color = 0xffd84d;
          snd && snd.net && snd.net(); snd && snd.goal && snd.goal();
          /* REINTEGRACIÓN: el gol del jugadón con el pulido cinematográfico —
             festejo ilustrado + explosión + LA HINCHADA SALTANDO + relator */
          var kF = self.poseKey && self.poseKey("festejo");
          if (kF) { var sf = self.add.image(W * 0.78, 280, kF); sf.setScale(190 / sf.height); sf.setAlpha(0); self.cineContent.add(sf); self.tweens.add({ targets: sf, alpha: 1, y: 260, duration: 260, ease: "Back.easeOut" }); }
          self.burst && self.burst(W / 2, 250);
          self.tribunaSaltando && self.tribunaSaltando();
          self.relatar && self.relatar("gol");
        }
        else if (res.outcome === "rebote") { msj = "¡LE REVENTASTE LAS MANOS!"; color = 0xff8c3a; snd && snd.gloves && snd.gloves(); }
        else if (res.outcome === "atajada") { msj = "¡LA SACÓ!"; color = 0x5bb8e8; snd && snd.gloves && snd.gloves(); }
        else { msj = "¡AFUERA!"; color = 0xe3503e; snd && snd.afuera && snd.afuera(); }
        self.avisoJugadon(msj, color);
        self.time.delayedCall(self.msV(1100), function () {
          self.jugadonCerrar(function () {
            var P = window.PampaPartido;
            if (res.outcome === "gol") self.golPropio();
            else if (res.outcome === "rebote") {
              /* el rebote queda VIVO: la pelota es tuya pegada al área (la segunda chance épica) */
              st.posesion = "mia";
              st.mios[st.ctrl].x = Math.min(st.W - 60, st.W - 130);
              st.cooldown = st.bal.ritmo.cooldown_encuentro_ms;
            }
            else P.tiroFallado(st);
          });
        });
      });
    }
  });
})();
