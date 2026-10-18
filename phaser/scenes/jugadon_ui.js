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
  /* cómo se para cada cierre de logic/jugadon.js en el cruce: qué pose, dónde
     y qué dice. Pedido de Rodri del 17/oct (ver entrarJugadonGambeta). */
  var POSTURAS = {
    cierra_izq: { pose: "bloqueo", x: 0.36, alto: 290, dice: "TE CIERRA LA IZQUIERDA" },
    cierra_der: { pose: "bloqueo", x: 0.64, alto: 290, dice: "TE CIERRA LA DERECHA" },
    firme: { pose: "bloqueo", x: 0.5, alto: 290, dice: "SE PLANTA ABIERTO DE PIERNAS" },
    se_tira: { pose: "barrida", x: 0.5, alto: 200, dice: "SE TIRA AL PISO" }
  };

  Object.assign(window.PampaMatch.prototype, {

    jugadonFichas() {
      if (!this.st.fichas) this.st.fichas = window.PampaJugadon.fichasNuevas();
      return this.st.fichas;
    },
    /* Pedido de Rodri del 17/oct: botonJugadon() (la fila de fichas debajo de
       la cruz) se fue. Las fichas se ofrecen adentro de ★ ESPECIAL, que arma
       match.js con el resto de lo especial. */

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
      if (this.respirar) this.respirar();   // oct 2026: sin golpes cortos encima del festejo
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
      /* L09: 13 px y en dos renglones si hace falta ("◀ SALIR POR IZQUIERDA"
         mide 197 y con cinco gestos el botón deja 162) */
      /* textos-tactiles: el número es la tecla; en el teléfono no va */
      var t = this.add.text(x, y, (this.sys.game.device.input.touch ? "" : num + "·") + texto, { fontFamily: window.PF.display, fontSize: this.BAL.legibilidad.texto_decision_min + "px", color: "#0a1f13", align: "center", wordWrap: { width: wpx - 12 } }).setOrigin(0.5);
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
      /* C2 · EL PRINCIPAL DEL JUGADÓN. La pantalla entera existe para leerle la
         intención al rival, así que eso es lo que se mira primero. Antes eran
         15 px y competía con el nombre del rival (13) y los botones (12): tres
         cosas del mismo peso y ninguna dominando. */
      var t = this.add.text(x, y, texto, { fontFamily: window.PF.texto, fontSize: window.PampaPiel.nivel(1), fontStyle: "bold", color: "#0a1f13", backgroundColor: "#ffd84d", padding: { x: 10, y: 5 } }).setOrigin(0.5, 1);
      this.cineContent.add(t);
      this.tweens.add({ targets: t, scale: 1.08, duration: 300, yoyo: true, repeat: -1 });
      return t;
    },

    /* ============ LOS CRUCES DEL GAMBETA-TIRO ============
       Pedido de Rodri del 17/oct: "ahora solo esquivás más o menos dos
       conos". Era cierto: la corrida en profundidad mostraba a los rivales
       chiquitos a lo lejos, se esquivaban corriéndose de costado, y encima
       cada choque abría un menú de cinco clases de obstáculo con su jerga.

       Ahora cada rival que te sale es una VIÑETA GRANDE en dos golpes:
         1. te sale al cruce, enorme, y se le ve CÓMO SE PARA (te cierra un
            lado, se planta abierto de piernas, se tira al piso). Elegís por
            dónde lo pasás: una flecha o tocar ese lado.
         2. corte seco: VOS en primer plano con la gambeta ganada, él quedando
            atrás, líneas de velocidad. O él con la pelota, si te la sacó, y
            el aviso dice qué había que hacer.
       Después del último, el remate. La lectura y el desempate por stats son
       los de logic/jugadon.js (crearGambeta, cruceGambeta, venceA). */
    entrarJugadonGambeta(rivalIdx, opts) {
      var st = this.st, J = window.PampaJugadon;
      var yo = st.mios[st.ctrl];
      opts = opts || {};
      var cuantos = opts.marcadores || 2;
      var defs = [];
      if (rivalIdx != null && st.rivales[rivalIdx]) defs.push(st.rivales[rivalIdx]);
      st.rivales.forEach(function (r, i) {
        if (defs.length >= cuantos || i === rivalIdx || r.pos === "ARQ") return;
        if (Math.hypot(r.x - yo.x, r.y - yo.y) < 260) defs.push(r);
      });
      /* el relleno tambien se deriva, para que un hueco no sea mas duro ni mas
         blando que un rival de verdad */
      while (defs.length < cuantos) defs.push({ nombre: "RIVAL", stats: {} });
      this._jgLogica = J.crearGambeta({
        semilla: (st.golesMio + 1) * 7919 + Math.floor(st.minuto * 100) + st.ctrl,
        marcadores: defs.length,
        atacante: { gambeta: (yo.stats && yo.stats.gambeta) || 55 },
        /* `quite` NO EXISTE en el esquema de stats: los 50 jugadores tienen ocho
           claves y ninguna es esa, asi que el || 55 se cobraba el 100% de las
           veces y TODOS los defensores del jugadon eran identicos. Se deriva de
           fisico y velocidad (logic/partido.quiteDe), que ademas escalan solas
           con la division por PampaMaster.aplicar. */
        defensores: defs.map(function (d) { return { quite: window.PampaPartido.quiteDe(d.stats), nombre: d.nombre }; })
      });
      this._jgMega = opts.mega || null;
      this.jugadonAbrir("");
      this._jgCruce = { resuelto: false, lineas: null };
      this.pedirMusica("jugadon");
      this.jugadonCruce();
    },

    /* golpe 1: el rival te sale al cruce y se le ve cómo se para */
    jugadonCruce() {
      var self = this, J = window.PampaJugadon, g = this._jgLogica, c = this._jgCruce;
      var d = g.defensores[g.paso];
      var post = POSTURAS[d.cierre.id];
      this.jugadonLimpiarBotones();
      this.limpiarContenido();
      this._jg.sprites = [];
      c.resuelto = false;
      /* la cancha en fuga con el arco al fondo: vas hacia allá y él está en el medio */
      this.dibujarCanchaProfunda({ x: W / 2, y: H * 0.22 }, H * 0.95);
      var rx = W * post.x, piso = H - 70;
      var kR = (this.poseRivalNaranja && this.poseRivalNaranja(post.pose)) || this.poseKey(post.pose);
      var sr = kR ? this.add.image(rx, piso, kR) : this.add.rectangle(rx, piso, post.alto * 0.6, post.alto, 0xff8a50);
      sr.setOrigin(0.5, 1).setScale(post.alto / (sr.height || post.alto));
      if (this.sombraBajoPies) this.sombraBajoPies(sr, rx);
      this.cineContent.add(sr);
      /* 17/oct, pedido de Rodri: VOS encarándolo, en primer plano abajo a la
         izquierda, con la pelota del juego al pie (la pose la trae recortada).
         Por eso los botones de los costados suben un poco, sin meterse
         debajo de los globos del relato (arriba a la derecha, hasta y=247). */
      var yo = this.st.mios[this.st.ctrl];
      var kE = (this.poseHeroeTenida && this.poseHeroeTenida(yo, "gambeta_encara")) || this.poseKey("gambeta_encara");
      if (kE) {
        var se = this.add.image(150, H + 8, kE).setOrigin(0.5, 1);
        se.setScale(240 / se.height);
        this.cineContent.add(se);
        var pmE = this.game.registry.get("poses"), pe = pmE && pmE.poses && pmE.poses.gambeta_encara && pmE.poses.gambeta_encara.pelota;
        if (pe) {
          var TPe = this.texPelota(pe.r * 2 * se.displayHeight);
          this.cineContent.add(this.add.sprite(se.x + (pe.x - 0.5) * se.displayWidth, se.y - se.displayHeight + pe.y * se.displayHeight, TPe.key).setScale(TPe.esc));
        }
        this.cineContent.add(this.add.text(se.x + 150, se.y - se.displayHeight + 60, "▼ VOS", { fontFamily: window.PF.display, fontSize: "13px", color: "#0a1f13", backgroundColor: "#4FC3F7", padding: { x: 5, y: 2 } }).setOrigin(0.5));
      }
      /* sin líneas de velocidad acá: van por encima de todo y tachaban los
         botones. Este golpe es para leer; las líneas son del golpe 2. */
      c.lineas = null;

      var tactil = this.sys.game.device.input.touch;
      var cab = (this._jgMega ? "★ " + String(this._jgMega.n || "MEGATIRO").toUpperCase() : "★ GAMBETA-TIRO") +
        " · rival " + (g.paso + 1) + " de " + g.defensores.length + " · " +
        (tactil ? "tocá por dónde lo pasás" : "flechas o tocá: por dónde lo pasás");
      this.cineContent.add(this.add.text(W / 2, 20, cab, { fontFamily: window.PF.display, fontSize: "13px", color: "#f6efdc", backgroundColor: "#0a1f13cc", padding: { x: 8, y: 3 } }).setOrigin(0.5));
      this.cineContent.add(this.add.text(W / 2, 56, "▲ " + String(d.nombre || "RIVAL").toUpperCase().slice(0, 12) + " TE SALE AL CRUCE", { fontFamily: window.PF.display, fontSize: window.PampaPiel.nivel(1), color: "#0a1f13", backgroundColor: "#FF8A50", padding: { x: 12, y: 4 } }).setOrigin(0.5));
      /* lo que hay que leer, en palabras además de en el dibujo */
      this.jugadonGlobo(W / 2, 118, post.dice);

      /* los botones están DONDE pasa la pelota: a los costados, sobre la
         cabeza y entre las piernas. Tocar el lado es elegirlo. */
      J.PASADAS.forEach(function (p) {
        var pos = p.id === "izq" ? [110, 285, 200] : p.id === "der" ? [W - 110, 285, 200]
          : p.id === "sombrerito" ? [rx, piso - post.alto - 30, 180] : [rx, H - 34, 180];
        self.jugadonBoton(pos[0], pos[1], pos[2], p.n, 0xf6efdc, function () { self.jugadonMovida(p.id); });
        if (self.input.keyboard) {
          var ev = "keydown-" + p.tecla;
          var fn = function () { if (self.estado === "JUGADON") self.jugadonMovida(p.id); };
          self.input.keyboard.on(ev, fn);
          (self._jg.teclas = self._jg.teclas || []).push({ ev: ev, fn: fn });
        }
      });
      this.uiCam.flash(80, 255, 255, 220);
      this.SFX && this.SFX.whoosh && this.SFX.whoosh();
    },

    /* golpe 2: lo dejaste atrás, o te la sacó */
    jugadonMovida(movidaId) {
      var self = this, st = this.st, J = window.PampaJugadon, g = this._jgLogica, c = this._jgCruce;
      if (!c || c.resuelto || g.terminado) return;
      c.resuelto = true;
      var d = g.defensores[g.paso];
      var post = POSTURAS[d.cierre.id];
      var vence = J.venceA(d.cierre.id);
      var bienLeido = vence.indexOf(movidaId) >= 0;
      var res = J.cruceGambeta(g, movidaId);
      var yo = st.mios[st.ctrl], B = this.BAL.jugadon || {};
      var nombre = String(d.nombre || "RIVAL").toUpperCase().slice(0, 12);
      this.jugadonLimpiarBotones();
      this.limpiarContenido();
      var bg = this.cineBG; bg.clear();
      if (!this.fondoCine || !this.fondoCine("golpe", { bando: res.gana ? "mio" : "rival", cx: 0.5, cy: 0.5 })) {
        bg.fillStyle(res.gana ? 0x0b1c2a : 0x2a0b0b, 1); bg.fillRect(0, 0, W, H);
      }
      var titulo = function (texto, color) {
        self.cineContent.add(self.add.text(W / 2, 52, texto, { fontFamily: window.PF.display, fontSize: "34px", color: color, stroke: "#0a1f13", strokeThickness: 6, align: "center" }).setOrigin(0.5));
      };
      var bajada = function (texto) {
        self.cineContent.add(self.add.text(W / 2, H - 36, texto, { fontFamily: window.PF.display, fontSize: window.PampaPiel.nivel(2), color: "#f6efdc", backgroundColor: "#0a1f13dd", padding: { x: 10, y: 4 }, align: "center", wordWrap: { width: 860 } }).setOrigin(0.5));
      };
      var kRival = (this.poseRivalNaranja && this.poseRivalNaranja(post.pose)) || this.poseKey(post.pose);

      if (res.gana) {
        /* una sola composición para los cuatro lados: la pose espejada muestra
           el 10 al revés (01), y después de pasarlo el lado ya no importa */
        var xH = W * 0.62, xR = W * 0.22;
        /* el fondo corre al revés de para donde vas */
        for (var i = 0; i < 5; i++) {
          var ry = this.add.rectangle(W + 300, 110 + i * 78, 380 + (i % 2) * 220, 6 + (i % 3) * 5, 0xffffff, 0.22);
          this.cineContent.add(ry);
          this.tweens.add({ targets: ry, x: -300, duration: 420 + i * 70, repeat: -1 });
        }
        /* él, atrás y más chico, quedándose. 17/oct: desparramado
           (r_superado), ya no parado como en el golpe 1 */
        var kSup = this.poseKey("r_superado") || kRival;
        var sr = kSup ? this.add.image(xR, H * 0.8, kSup) : this.add.rectangle(xR, H * 0.8, 100, 170, 0xff8a50);
        sr.setOrigin(0.5, 1).setScale(190 / (sr.height || 190));
        if (sr.setTint) sr.setTint(0xb4b4b4);
        this.cineContent.add(sr);
        this.tweens.add({ targets: sr, x: xR - 50, duration: this.msV(B.paso_ms || 950), ease: "Quad.easeOut" });
        this.cineContent.add(this.add.text(xR, H * 0.8 - sr.displayHeight - 14, "▲ " + nombre, { fontFamily: window.PF.display, fontSize: "13px", color: "#0a1f13", backgroundColor: "#FF8A50", padding: { x: 5, y: 2 } }).setOrigin(0.5));
        /* VOS, en primer plano: la pose quieta, el corte seco */
        var kH = (this.poseHeroeTenida && this.poseHeroeTenida(yo, "gambeta_gana")) || this.poseKey("gambeta_gana");
        var sh = kH ? this.add.image(xH, H * 0.53, kH) : this.add.rectangle(xH, H * 0.53, 200, 380, 0x4fc3f7);
        sh.setScale(400 / (sh.height || 400));
        this.cineContent.add(sh);
        var pm = this.game.registry.get("poses");
        var pp = kH && pm && pm.poses && pm.poses.gambeta_gana && pm.poses.gambeta_gana.pelota;
        if (pp && this.textures.exists("ball")) {
          var dW = sh.displayWidth, dH = sh.displayHeight;
          var bx = sh.x + (pp.x - 0.5) * dW, by = sh.y + (pp.y - 0.5) * dH;
          var TP = this.texPelota(Math.max(25.6, pp.r * 2 * dH));
          var bola = this.add.sprite(bx, by, TP.key).setScale(TP.esc);
          this.cineContent.add(bola);
          /* en el caño y el sombrero la pelota viene de donde pasó: entre sus
             piernas o por arriba de su cabeza */
          if (movidaId === "canio" || movidaId === "sombrerito") {
            bola.setPosition(sr.x, movidaId === "sombrerito" ? sr.y - sr.displayHeight - 40 : sr.y - 24);
            this.tweens.add({ targets: bola, x: bx, y: by, duration: this.msV(380), ease: "Quad.easeIn" });
          }
        }
        c.lineas = { x: xH, y: H * 0.5, inten: 1.2, tinte: 0xffd84d };
        titulo(!bienLeido ? "¡DE PURA GAMBETA!" : movidaId === "canio" ? "¡CAÑO!" : movidaId === "sombrerito" ? "¡SOMBRERO!" : "¡LO DEJASTE PAGANDO!", "#ffd84d");
        bajada(nombre + " QUEDA ATRÁS · " + (g.terminado ? "¡QUEDASTE DE FRENTE AL ARCO!" : "viene el otro"));
        this.uiCam.flash(90, 255, 255, 230);
        this.uiCam.shake(160, 0.006);
        this.SFX && this.SFX.kick && this.SFX.kick();
        this.SFX && this.SFX.whoosh && this.SFX.whoosh();
        this.time.delayedCall(this.msV(B.paso_ms || 950), function () {
          if (g.terminado) self.jugadonRemate(); else self.jugadonCruce();
        });
        return;
      }

      /* te la sacó: él en primer plano con el quite, vos trastabillando atrás.
         17/oct, pedido de Rodri: el quite era el tuyo teñido de naranja, con
         su pelota blanca y negra pintada. Ahora es el dibujo del rival
         (r_quite, a rayas) sin esa pelota, y la del juego va donde estaba. */
      var kQ = this.poseKey("r_quite");
      var sq = kQ ? this.add.image(W * 0.62, H * 0.52, kQ) : this.add.rectangle(W * 0.62, H * 0.52, 200, 360, 0xff8a50);
      sq.setScale(380 / (sq.height || 380));
      var pmQ = this.game.registry.get("poses"), pq = kQ && pmQ && pmQ.poses && pmQ.poses.r_quite && pmQ.poses.r_quite.pelota;
      var kP = (this.poseHeroeTenida && this.poseHeroeTenida(yo, "gambeta_pierde")) || this.poseKey("gambeta_pierde");
      var sp = kP ? this.add.image(W * 0.26, H * 0.56, kP) : this.add.rectangle(W * 0.26, H * 0.56, 130, 240, 0x4fc3f7);
      sp.setScale(260 / (sp.height || 260));
      if (sp.setTint) sp.setTint(0xb4b4b4);
      this.cineContent.add(sp); this.cineContent.add(sq);
      if (pq) {
        var TPq = this.texPelota(pq.r * 2 * sq.displayHeight);
        this.cineContent.add(this.add.sprite(sq.x + (pq.x - 0.5) * sq.displayWidth, sq.y + (pq.y - 0.5) * sq.displayHeight, TPq.key).setScale(TPq.esc));
      }
      c.lineas = { x: W * 0.62, y: H * 0.5, inten: 1, tinte: 0xff8a50 };
      var salidas = J.PASADAS.filter(function (p) { return vence.indexOf(p.id) >= 0; }).map(function (p) { return p.n; });
      titulo("¡TE LA SACÓ " + nombre + "!", "#f6efdc");
      bajada(bienLeido
        ? "lo leíste bien, pero te leyó el cuerpo igual"
        : post.dice.toLowerCase() + ": había que pasarlo " + salidas.join(" o "));
      this.uiCam.shake(200, 0.008);
      this.SFX && this.SFX.gloves && this.SFX.gloves();
      this.time.delayedCall(this.msV(B.caida_ms || 1100), function () {
        self._jgCruce = null; self._jgMega = null;
        self.jugadonCerrar(function () {
          window.PampaPartido.perderPelota(st);
          self.relatar && self.relatar("gambeta_lose");
        });
      });
    },

    /* el ritmo del cruce: las líneas de velocidad se redibujan cada cuadro (la
       pose no se mueve, lo que se mueve es lo demás). Lo llama el update. */
    updateJugadonMini() {
      var c = this._jgCruce;
      if (c && c.lineas) this.lineasVelocidad(c.lineas.x, c.lineas.y, c.lineas.inten, c.lineas.tinte);
    },

    /* pasaste al último: EL REMATE, en el mismo envión. Si la jugada era el
       MEGATIRO, remata con la mega animación (cut-in, impacto, viaje, arquero
       volando); si era la GAMBETA-TIRO, remate normal. En los dos casos NO
       hay pantalla de zonas: la ubicación manda. */
    jugadonRemate() {
      var self = this, st = this.st, mega = this._jgMega;
      this._jgCruce = null; this._jgMega = null;
      st.mios[st.ctrl].x = Math.min(st.W - 60, st.W - 130);   // quedaste en el área
      this.jugadonCerrar(function () {
        if (mega && self.dispararConCine) {
          self.cutInEspecial("¡" + String(mega.n).toUpperCase() + "!", mega.sub || "todo lo que le queda", function () {
            self.dispararConCine(mega, self.ejDeLaSituacion(mega));
          });
        } else {
          self.tiroPorComandos(null);
        }
      });
    },
    jugadonPintarDefensores() { /* V8 C: los rivales viven en updateJugadonMini */ },
    jugadonPintarOpciones() { /* V8 C: las movidas aparecen SOLO en el duelo */ },

    /* ============ EL SÚPER QUITE (2 fichas) ============ */
    entrarJugadonQuite() {
      var st = this.st, J = window.PampaJugadon, self = this;
      var rival = st.rivales[st.portadorRival] || { nombre: "RIVAL", stats: {} };
      this._jgLogica = J.crearQuite({
        semilla: (st.golesRival + 1) * 6271 + Math.floor(st.minuto * 100),
        /* y TU quite cuando el que marca sos vos: mismo problema, misma cuenta */
        defensor: { quite: window.PampaPartido.quiteDe(st.mios[st.ctrl].stats) },
        rival: { gambeta: (rival.stats && rival.stats.gambeta) || 55, nombre: rival.nombre }
      });
      this.jugadonAbrir("🌟 SÚPER QUITE · leé su movida y cerrale el camino");
      var kR = this.poseRivalNaranja ? this.poseRivalNaranja("corriendo") : this.poseKey("corriendo");
      if (kR) { var sr = this.add.image(480, 150, kR); sr.setScale(115 / sr.height); sr.setFlipX(true); this.cineContent.add(sr); }
      this._jg.sprites.push(this.jugadonGlobo(480, 84, "▼ " + (rival.nombre || "RIVAL").toUpperCase().slice(0, 12) + " INSINÚA: " + this._jgLogica.movidaRival.n));
      /* V10: el respaldo era el bloqueo con la camiseta del rival — sos vos: la nuestra */
      var kBloqMio = this.poseDelEquipo ? this.poseDelEquipo("bloqueo", st.mios[st.ctrl]) : this.poseKey("bloqueo");
      var kYo = this.poseHeroeTenida ? (this.poseHeroeTenida(st.mios[st.ctrl]) || kBloqMio) : kBloqMio;
      if (kYo) { var sy = this.add.image(480, 350, kYo); sy.setScale(120 / sy.height); this.cineContent.add(sy); }
      var C = J.CIERRES, wpx = 224;
      C.forEach(function (c, i) {
        var x = W / 2 + (i - (C.length - 1) / 2) * (wpx + 8);
        self.jugadonBoton(x, H - 60, wpx, c.n, 0xf6efdc, function () { self.jugadonQuite(c.id); });
      });
      /* M2 · "urgente" no existía ni en el synth ni en el mapa: no sonaba nada */
      this.pedirMusica("jugadon");
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

    /* ============ EL SÚPER TIRO (2 fichas): la física en pantalla ============

       ⚠ C4 · PENDIENTE DE RODRI — NO BORRAR SIN DECIDIR ESTO PRIMERO.

       Estos tres métodos (entrarJugadonTiro, jugadonFuerza, jugadonTirar) no
       los llama NADIE. No cuelgan de ningún flag: quedaron sin llamador cuando
       V9 §5 sacó la grilla de zonas del súper tiro y C3 retiró el botón suelto.

       Lo que importa no es el código de acá, es lo que arrastra: son la ÚNICA
       puerta a `window.PampaJugadon.resolverSuperTiro`, que es LA FÍSICA del
       V8 §4 —geometría llega/no-llega, fuerza contra manos del arquero,
       rebote—. Hoy esa física solo corre en phaser/test/jugadon.test.js: en un
       partido de verdad no se ejecuta nunca, porque el megatiro se resuelve por
       `dispararConCine` → duel.js.

       O sea que hay que elegir, y la elección es de Rodri porque cambia QUIÉN
       decide los goles épicos:
         (a) revivirla — darle una puerta al súper tiro con física, o
         (b) retirarla — borrar estos 3 métodos Y logic/jugadon.js:
             resolverSuperTiro + ARCO + sus tests.
       Quedarse en el medio es lo peor: mantener y testear una física que el
       juego no usa. Anotado en HANDOFF_CIERRE.md.
       ====================================================================== */
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
      /* B3: el arquero del super tiro salia de BLOQUES durante toda la
         decision —mientras elegis AL PALO / AL MEDIO / AL ANGULO— y recien se
         volvia ilustrado en el vuelo. Ahora arranca ilustrado y el tiro solo
         mueve ese mismo sprite. */
      var karq = this.figuraArquero("vuela", "jugadon (super tiro)");
      if (karq && this.poseRivalNaranja) karq = this.poseRivalNaranja("arquero_vuela") || karq;
      this._jg.arq = karq ? this.add.image(ax, ayPiso - 40, karq) : this.add.rectangle(ax, ayPiso - 40, 30, 60, 0xf6c11d);
      if (karq) this._jg.arq.setScale(120 / this._jg.arq.height);
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
      /* M2 · "urgente" no existía ni en el synth ni en el mapa: no sonaba nada */
      this.pedirMusica("jugadon");
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
      this.SFX && this.SFX.kickFuerte && this.SFX.kickFuerte();
      this.time.delayedCall(this.msV(560), function () {
        var msj, color, snd = self.SFX, hastaExplosion = 0;
        if (res.outcome === "gol") {
          msj = d.llego === false ? "¡GOOOL! ¡NO LLEGÓ!" : "¡GOOOL! ¡SE LE ESCAPÓ!"; color = 0xffd84d;
          /* oct 2026: el gol se anota y se festeja ACÁ, cuando la pelota entra.
             Antes sonaban la red y la fanfarria acá y otra vez —con hitstop y
             destello— al cerrar el jugadón, con la cancha ya de vuelta. */
          self.anotarGolPropio();
          hastaExplosion = self.festejarGolPropio() || 0;
          /* REINTEGRACIÓN: el gol del jugadón con el pulido cinematográfico —
             festejo ilustrado + explosión + LA HINCHADA SALTANDO + relator */
          var kF = self.poseKey && self.poseKey("festejo");
          if (kF) { var sf = self.add.image(W * 0.78, 280, kF); sf.setScale(190 / sf.height); sf.setAlpha(0); self.cineContent.add(sf); self.tweens.add({ targets: sf, alpha: 1, y: 260, duration: 260, ease: "Back.easeOut" }); }
          self.burst && self.burst(W / 2, 250);
          /* la tribuna salta con la explosión del festejo, no acá */
          self.relatar && self.relatar("gol");
        }
        else if (res.outcome === "rebote") { msj = "¡LE REVENTASTE LAS MANOS!"; color = 0xff8c3a; snd && snd.gloves && snd.gloves(); }
        else if (res.outcome === "atajada") { msj = "¡LA AGARRÓ!"; color = 0x5bb8e8; snd && snd.gloves && snd.gloves(); }
        else { msj = "¡AFUERA!"; color = 0xe3503e; snd && snd.afuera && snd.afuera(); }
        self.avisoJugadon(msj, color);
        self.time.delayedCall(Math.max(self.msV(1100), hastaExplosion + 900), function () {
          self.jugadonCerrar(function () {
            var P = window.PampaPartido;
            if (res.outcome === "gol") { /* ya anotado y festejado en el impacto */ }
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
