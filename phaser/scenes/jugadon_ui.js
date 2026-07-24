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

    /* ============ LA GAMBETA (2 fichas) ============ */
    entrarJugadonGambeta(rivalIdx) {
      var st = this.st, J = window.PampaJugadon, self = this;
      var yo = st.mios[st.ctrl];
      /* ves cuántos vienen: el del cruce + otro si está cerca */
      var defs = [];
      if (rivalIdx != null) defs.push(st.rivales[rivalIdx]);
      st.rivales.forEach(function (r, i) {
        if (defs.length >= 2 || i === rivalIdx || r.pos === "ARQ") return;
        if (Math.hypot(r.x - yo.x, r.y - yo.y) < 180) defs.push(r);
      });
      if (!defs.length) defs.push({ nombre: "RIVAL", stats: { quite: 55 } });
      this._jgLogica = J.crearGambeta({
        semilla: (st.golesMio + 1) * 7919 + Math.floor(st.minuto * 100) + st.ctrl,
        marcadores: defs.length,
        atacante: { gambeta: (yo.stats && yo.stats.gambeta) || 55 },
        defensores: defs.map(function (d) { return { quite: (d.stats && d.stats.quite) || 55, nombre: d.nombre }; })
      });
      this.jugadonAbrir("🌟 EL JUGADÓN · vienen " + defs.length + " — leé el cierre y elegí tu movida");
      /* VOS abajo (tu pose con tu pinta), los que vienen arriba */
      var kYo = this.poseHeroeTenida ? (this.poseHeroeTenida(yo) || this.poseKey("corriendo")) : this.poseKey("corriendo");
      if (kYo) { var sy = this.add.image(480, 350, kYo); sy.setScale(130 / sy.height); this.cineContent.add(sy); this._jg.yo = sy; }
      this.jugadonPintarDefensores();
      this.jugadonPintarOpciones();
      this.musica && this.musica("urgente");
    },
    jugadonPintarDefensores() {
      var g = this._jgLogica, self = this;
      (this._jg.sprites || []).forEach(function (o) { o.destroy(); });
      this._jg.sprites = [];
      var kR = this.poseRivalNaranja ? this.poseRivalNaranja("bloqueo") : this.poseKey("bloqueo");
      g.defensores.forEach(function (d, i) {
        if (i < g.paso) return;   // ya quedó atrás
        var sx = 300 + i * 360, sy = 140 + i * 30;
        var s = kR ? self.add.image(sx, sy, kR) : self.add.rectangle(sx, sy, 40, 90, 0x1a0d08);
        if (s.setScale && s.height) s.setScale(100 / s.height);
        self.cineContent.add(s);
        self._jg.sprites.push(s);
        /* VIENEN hacia vos (tween corto, la amenaza se siente) */
        self.tweens.add({ targets: s, y: sy + 26, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        if (i === g.paso) {
          var nom = (d.nombre || "RIVAL").toUpperCase().slice(0, 12);
          self._jg.sprites.push(self.jugadonGlobo(sx, sy - 60, "▼ " + nom + ": " + d.cierre.n));
        }
      });
    },
    jugadonPintarOpciones() {
      var g = this._jgLogica, self = this;
      this.jugadonLimpiarBotones();
      var n = g.opciones.length, wpx = Math.min(180, (W - 40) / n - 10);
      g.opciones.forEach(function (m, i) {
        var x = W / 2 + (i - (n - 1) / 2) * (wpx + 10);
        self.jugadonBoton(x, H - 60, wpx, m.n, 0xf6efdc, function () { self.jugadonMovida(m.id); });
      });
    },
    jugadonMovida(movidaId) {
      var st = this.st, J = window.PampaJugadon, self = this;
      var res = J.cruceGambeta(this._jgLogica, movidaId);
      if (!res) return;
      this.SFX && this.SFX.whoosh && this.SFX.whoosh(300);
      if (res.gana && !this._jgLogica.terminado) {
        this.avisoJugadon("¡LO PASASTE!", 0x7ee08a);
        this.jugadonPintarDefensores();
        return;
      }
      var exito = this._jgLogica.exito;
      this.jugadonLimpiarBotones();
      this.avisoJugadon(exito ? "¡LOS DEJASTE ATRÁS!" : "¡" + ((res.defensor && res.defensor.nombre) || "TE") + " TE LEYÓ!", exito ? 0xffd84d : 0xe3503e);
      this.time.delayedCall(this.msV(1000), function () {
        self.jugadonCerrar(function () {
          var P = window.PampaPartido;
          if (exito) {
            P.ganarAtaque(st, "gambeta", null);
            var yo = st.mios[st.ctrl];
            yo.x = Math.min(st.W - 40, yo.x + 150);   // la ventaja: quedaste lanzado
            self.relatar && self.relatar("gambeta_win");
          } else {
            P.perderPelota(st);
            self.relatar && self.relatar("gambeta_lose");
          }
        });
      });
    },
    avisoJugadon(texto, color) {
      var t = this.add.text(W / 2, 250, texto, { fontFamily: window.PF.display, fontSize: "22px", color: "#" + color.toString(16).padStart(6, "0"), stroke: "#0a1f13", strokeThickness: 7 }).setOrigin(0.5).setScale(0.3);
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
      this.jugadonAbrir("🌟 SÚPER TIRO · tocá la ZONA del arco — la física decide");
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
      /* la zona se ELIGE tocando el arco */
      var zonaHit = this.add.rectangle(ax, ayPiso - AH / 2, AW, AH, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      this.cineContent.add(zonaHit);
      zonaHit.on("pointerdown", function (p, xx, yy, ev) {
        ev && ev.stopPropagation && ev.stopPropagation(); self._uiTocado = self.time.now;
        var lx = (p.x - ax) / 1.8;                     // → -200..200
        var ly = (ayPiso - p.y) / 1.8;                 // → 0..140
        self.jugadonTirar({ x: lx, y: ly }, ax, ayPiso, AW, AH);
      });
      /* a11y (auditoría): el arco TAMBIÉN por teclado — 6 zonas numeradas */
      var ZT = [
        { n: "1", x: -185, y: 120, tag: "ángulo izq" }, { n: "2", x: 0, y: 120, tag: "alto medio" }, { n: "3", x: 185, y: 120, tag: "ángulo der" },
        { n: "4", x: -175, y: 25, tag: "palo bajo izq" }, { n: "5", x: 0, y: 20, tag: "al medio" }, { n: "6", x: 175, y: 25, tag: "palo bajo der" }
      ];
      ZT.forEach(function (z) {
        var lz = self.add.text(ax + z.x * 1.8, ayPiso - z.y * 1.8, z.n, { fontFamily: window.PF.display, fontSize: "13px", color: "#ffd84d", stroke: "#0a1f13", strokeThickness: 4 }).setOrigin(0.5).setAlpha(0.85);
        self.cineContent.add(lz);
      });
      var tTeclas = this.add.text(ax, ayPiso + 38, "teclado: 1-6 = la zona numerada · o tocá el arco donde quieras", { fontFamily: window.PF.texto, fontSize: "13px", color: "#f6efdc" }).setOrigin(0.5).setAlpha(0.85);
      this.cineContent.add(tTeclas);
      if (this.input.keyboard) {
        var teclas = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX"];
        this._jg.teclas = this._jg.teclas || [];
        ZT.forEach(function (z, i) {
          var fn = function () { if (self.estado === "JUGADON" && zonaHit.active) { self._uiTocado = self.time.now; self.jugadonTirar({ x: z.x, y: z.y }, ax, ayPiso, AW, AH); } };
          self.input.keyboard.on("keydown-" + teclas[i], fn);
          self._jg.teclas.push({ ev: "keydown-" + teclas[i], fn: fn });
        });
      }
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
            if (res.outcome === "gol") P.golMio(st);
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
