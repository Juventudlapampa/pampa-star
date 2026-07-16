/* ============================================================================
   PAMPA STAR · phaser/scenes/definicion_ui.js — LA DEFINICIÓN v2 (V6 §4)
   La escena estrella, OFENSIVA y DEFENSIVA, con las poses ilustradas de Rodri.
   Cuatro fases: POSICIÓN (correr y buscar el ángulo) → EJECUCIÓN (el duelo de
   seis zonas + la barra de timing) → EL VUELO (poses + líneas de velocidad)
   → EL DESENLACE (freeze + medio segundo de silencio + revelación).
   Se mezcla en PampaMatch (mixin): la lógica pura vive en logic/definicion.js.
   Las poses se cargan del manifest con FALLBACK tolerante: si falta el archivo,
   cae al sprite heroico de código y nada crashea (§3.2).
   ========================================================================== */
(function () {
  "use strict";
  var W = 960, H = 540;

  Object.assign(window.PampaMatch.prototype, {

    /* pose ilustrada del manifest, o null si no está (el caller cae al heroico) */
    poseKey(id) {
      var k = "pose_" + id;
      return this.textures.exists(k) ? k : null;
    },
    /* sprite de pose con fallback: pose ilustrada grande o heroico escalado */
    poseSprite(id, x, y, alturaDeseada, fallback) {
      var k = this.poseKey(id);
      if (k) {
        var s = this.add.image(x, y, k);
        s.setScale(alturaDeseada / s.height);
        return s;
      }
      var fb = fallback && fallback();
      if (fb) { fb.setPosition(x, y); return fb; }
      return this.add.rectangle(x, y, alturaDeseada * 0.5, alturaDeseada, 0x0a1f13, 0.8);
    },

    /* ============ ENTRADAS ============ */
    entrarDefinicionOf(opts) {
      opts = opts || {};
      var st = this.st, DL = this.BAL.definicion || {};
      this.quitarDuelo(); this.limpiarMenu();
      this.estado = "DEFINICION";
      st.modo = "congelado";
      this.mundoLayer.setVisible(false); this.hudLayer.setVisible(false);
      this.cineLayer.setVisible(true);
      this.uiCam.setZoom(1); this.uiCam.centerOn(W / 2, H / 2);
      this.limpiarContenido();
      var j = st.mios[st.ctrl];
      var n = this.rivalesEnElCamino(j);
      this._def = {
        modo: "of", fase: 1, t: 0,
        tiroTipo: opts.tiroTipo || "remate",
        jug: { x: W * 0.5, y: H * 0.72 },
        defs: [], angulo: 0.5,
        aguja: { t0: 0, p: 0, parada: false },
        zonaMia: null, zonaCPU: null,
        botones: [], shakeSpr: null
      };
      this.defFondo(false);
      /* tu jugador: heroico movible buscando el ángulo */
      var base = this.bakePortador(this.portadorActual());
      this._def.spr = this.add.sprite(this._def.jug.x, this._def.jug.y, base + "_correr_2").setScale(2.1);
      this.cineContent.add(this._def.spr);
      /* defensores REALES en el camino (mín 1 si el cruce venía con rival) */
      var nDefs = Math.max(opts.rivalIdx != null ? 1 : 0, Math.min(n, 3));
      for (var k = 0; k < nDefs; k++) {
        var dx = W * (0.3 + 0.2 * k), dy = H * (0.34 + 0.06 * (k % 2));
        var g = this.add.graphics();
        g.fillStyle(0x1a0d08, 0.9); g.fillEllipse(0, -30, 34, 34); g.fillRoundedRect(-20, -16, 40, 66, 10);
        g.fillStyle(0xff8a50, 0.9); g.fillRect(-20, -6, 40, 8);   // franja rival (forma+color)
        var cont = this.add.container(dx, dy, [g]);
        this.cineContent.add(cont);
        this._def.defs.push({ spr: cont, x: dx, y: dy, vivo: true });
      }
      /* el arquero rival, chiquito bajo los palos */
      this._def.arq = this.add.rectangle(W / 2, 148, 26, 44, 0xf6c11d).setStrokeStyle(2, 0x0a1f13);
      this.cineContent.add(this._def.arq);
      this.cineLabel.setText("· LA DEFINICIÓN · buscá el ángulo, los defensores se acercan");
      this.defBotonesOf(opts);
      this.selloDef();
      this.musica("rival");   // tensión
      this.relatar("peligro");
    },

    entrarDefinicionDef() {
      var st = this.st, DL = this.BAL.definicion || {};
      this.quitarDuelo(); this.limpiarMenu();
      this.estado = "DEFINICION";
      st.modo = "congelado";
      this.mundoLayer.setVisible(false); this.hudLayer.setVisible(false);
      this.cineLayer.setVisible(true);
      this.uiCam.setZoom(1); this.uiCam.centerOn(W / 2, H / 2);
      this.limpiarContenido();
      var tirador = st.rivales[st.portadorRival];
      this._def = {
        modo: "def", fase: 1, t: 0,
        tirador: tirador,
        jug: { x: W * 0.42, y: H * 0.5 },      // TU defensor, movible
        carga: 0, cargaMs: this.msV(DL.carga_ms || 4200),
        plan: "linea",                          // linea | achicar (arquero)
        plantado: false, barridaHecha: false, defensorVivo: true,
        aguja: { t0: 0, p: 0, parada: false },
        zonaMia: null, zonaTiro: null,
        botones: []
      };
      this.defFondo(true);
      /* EL REMATADOR: con la ceguera, recién acá le ves la cara (revelación) */
      var baseR = "h_riv" + ((tirador.numero || 1) - 1);
      window.PampaAvatarArte.heroico(this, baseR, tirador.look || window.PampaAvatar.crearLook(), "rival", tirador.numero, undefined, !this._bakes.has(baseR));
      this._bakes.add(baseR);
      this._def.sprTirador = this.add.sprite(W * 0.5, H * 0.76, baseR + "_tiro_1").setScale(2.3);
      this.cineContent.add(this._def.sprTirador);
      var placa = this.add.text(W * 0.5, H * 0.94, "⚔ " + (tirador.nombre || "EL RIVAL").toUpperCase() + " CARGA EL REMATE", { fontFamily: "monospace", fontSize: "13px", fontStyle: "bold", color: "#0a1f13", backgroundColor: "#FF8A50", padding: { x: 8, y: 3 } }).setOrigin(0.5);
      this.cineContent.add(placa);
      /* TU defensor (movible) y TU arquero (posicionable) */
      var arq = st.mios.find(function (x) { return x.pos === "ARQ"; });
      var baseD = this.bakePortador({ j: st.mios[st.ctrl], idx: st.ctrl, esRival: false, clave: "m" + st.ctrl });
      this._def.spr = this.add.sprite(this._def.jug.x, this._def.jug.y, baseD + "_correr_2").setScale(1.7);
      this.cineContent.add(this._def.spr);
      this._def.arq = this.add.rectangle(W / 2, 150, 28, 46, 0x1d4fd6).setStrokeStyle(2, 0xffffff);
      this.cineContent.add(this._def.arq);
      /* barra de CARGA del rematador (la tensión es de reloj) */
      this._def.cargaG = this.add.graphics();
      this.cineContent.add(this._def.cargaG);
      this.cineLabel.setText("· TE REMATAN · metete en la línea; tu arquero espera tu orden");
      this.defBotonesDef();
      this.selloDef();
      this.musica("rival");
      this.relatar("peligro");
    },

    selloDef() { /* cineLayer la mira solo uiCam (ya sellado en create); nada extra */ },

    /* ============ FONDO ¾: cielo, tribuna, ARCO al fondo, pasto ============ */
    defFondo(esMiArco) {
      var g = this.cineBG;
      g.clear();
      g.fillStyle(0x123a5a, 1); g.fillRect(0, 0, W, 120);                       // cielo
      g.fillStyle(0x0e2c44, 1); g.fillRect(0, 78, W, 42);                       // tribuna
      g.fillStyle(0xf6efdc, 0.3); for (var x = 8; x < W; x += 26) g.fillRect(x, 86 + (x % 3) * 6, 4, 4);   // gente
      g.fillStyle(0x2e7d32, 1); g.fillRect(0, 120, W, H - 120);                 // pasto
      g.fillStyle(0x388e3c, 1); for (var y = 120; y < H; y += 64) g.fillRect(0, y, W, 32);
      /* EL ARCO al fondo (grande, seis zonas viven acá en fase 2) */
      g.fillStyle(0xffffff, 1);
      g.fillRect(W / 2 - 190, 96, 10, 88); g.fillRect(W / 2 + 180, 96, 10, 88); g.fillRect(W / 2 - 190, 90, 380, 8);
      g.fillStyle(0xdfeef6, 0.35);
      for (var xx = -180; xx <= 180; xx += 18) g.fillRect(W / 2 + xx, 98, 2, 84);
      for (var yy = 100; yy <= 180; yy += 14) g.fillRect(W / 2 - 180, yy, 360, 2);
      /* área */
      g.lineStyle(4, 0xeafff0, 0.7); g.strokeRect(W / 2 - 260, 128, 520, 210);
      if (esMiArco) {
        var t = this.add.text(16, 128, "⚠ TU ARCO", { fontFamily: "'Press Start 2P',monospace", fontSize: "11px", color: "#ff8a50", stroke: "#0a1f13", strokeThickness: 4 });
        this.cineContent.add(t);
      }
    },

    /* ============ BOTONES contextuales (48px+, costo en NÚMERO) ============ */
    defBoton(x, texto, sub, color, cb) {
      var r = this.add.rectangle(x, H - 34, 148, 52, color || 0xf6efdc, 0.97).setStrokeStyle(2, 0x0a1f13).setInteractive({ useHandCursor: true });
      var t = this.add.text(x, H - 42, texto, { fontFamily: "'Press Start 2P',monospace", fontSize: "9px", color: "#0a1f13" }).setOrigin(0.5);
      var s = this.add.text(x, H - 24, sub || "", { fontFamily: "monospace", fontSize: "10px", color: "#365a41" }).setOrigin(0.5);
      this.cineContent.add(r); this.cineContent.add(t); this.cineContent.add(s);
      var self = this;
      r.on("pointerdown", function (p, xx, yy, ev) { ev && ev.stopPropagation && ev.stopPropagation(); self._uiTocado = self.time.now; cb(); });
      this._def.botones.push(r, t, s);
      return r;
    },
    defBotonesOf(opts) {
      var st = this.st, A = this.BAL.aguante, P = window.PampaPartido, self = this;
      var j = st.mios[st.ctrl];
      var xs = 100, paso = 160;
      this.defBoton(xs, "🎯 TIRO", A.costo_tiro + " de aguante", 0xffd84d, function () { self.defElegirTiro("remate", A.costo_tiro); });
      var alta = P.pelotaAltaVigente(st);
      if (alta) {
        var accA = P.accionesAereas(st);
        var cab = accA.find(function (a) { return a.id === "cabezazo"; });
        var chi = accA.find(function (a) { return a.id === "chilena"; });
        if (cab && !cab.bloqueada) this.defBoton(xs + paso, "🎯 CABEZA", cab.costo + " de aguante", 0xf6efdc, function () { self.defElegirTiro("cabezazo", cab.costo); });
        if (chi && !chi.bloqueada) this.defBoton(xs + paso * 2, "🌪 CHILENA", chi.costo + " · ¡la gloria!", 0xff8c3a, function () { self.defElegirTiro("chilena", chi.costo); });
      } else {
        this.defBoton(xs + paso, "🌀 GAMBETA", A.costo_gambeta + " · saca a uno", 0xf6efdc, function () { self.defGambeta(); });
        this.defBoton(xs + paso * 2, "🔁 PARED", A.costo_pared + " · barata", 0xf6efdc, function () { self.defPared(); });
      }
      this.defBoton(xs + paso * 3, "➡ PASE", "salir del momento", 0xdcd6c2, function () { self.salirDefinicion(function () { self.iniciarPaseDirigido(null, true); }); });
    },
    defBotonesDef() {
      var st = this.st, A = this.BAL.aguante, self = this;
      var xs = 100, paso = 152;
      this.defBoton(xs, "🧱 PLANTARSE", "en la línea · " + (A.costo_bloqueo || 70), 0xf6efdc, function () { self._def.plantado = true; self.avisarDef("Te plantás en la línea de tiro"); });
      this.defBoton(xs + paso, "🦵 BARRIDA", A.costo_quite + " · a todo o nada", 0xff8c3a, function () { self.defBarrida(); });
      this.defBoton(xs + paso * 2, "🧤 ACHICAR", "el arquero SALE", 0xf6efdc, function () { self._def.plan = "achicar"; self._def.arq.y = 190; self.avisarDef("Tu arquero achica el ángulo"); });
      this.defBoton(xs + paso * 3, "📏 LÍNEA", "margen de reacción", 0xf6efdc, function () { self._def.plan = "linea"; self._def.arq.y = 150; self.avisarDef("Tu arquero espera en la línea"); });
      /* V6 R3: la SÚPER DEFENSA del envión lleno — bloqueo SEGURO, mérito gastado */
      if (window.PampaPartido.envionLleno(st)) {
        this.defBoton(xs + paso * 4, "🌟 SÚPER DEF.", "ENVIÓN lleno · segura", 0xffd84d, function () {
          self._def.superDef = true;
          self.avisarDef("🌟 ¡SÚPER DEFENSA lista! Este remate NO entra");
        });
        return;
      }
      var m = this.megaDefensaDisponible(["atajada"], st.mios.find(function (x) { return x.pos === "ARQ"; }));
      if (m) this.defBoton(xs + paso * 4, "🔥 " + m.n.toUpperCase().slice(0, 10), m.aguante + " · segura", 0xffd84d, function () { self._def.mega = m; self.avisarDef("¡" + m.n.toUpperCase() + " lista!"); });
      else this.defBoton(xs + paso * 4, "⏳ QUIETO", "+" + A.recupera_no_moverse + " de aguante", 0xdcd6c2, function () {
        st.mios[st.ctrl].aguante = Math.min(A.max, st.mios[st.ctrl].aguante + A.recupera_no_moverse);
        self.avisarDef("Juntás aire (+" + A.recupera_no_moverse + ")");
      });
    },
    avisarDef(txt) {
      if (this._def && this._def.aviso && this._def.aviso.active) this._def.aviso.destroy();
      var t = this.add.text(W / 2, H * 0.16, txt, { fontFamily: "monospace", fontSize: "12px", color: "#f6efdc", backgroundColor: "#0a1f13dd", padding: { x: 8, y: 4 } }).setOrigin(0.5);
      this.cineContent.add(t);
      this._def.aviso = t;
      this.tweens.add({ targets: t, alpha: 0, delay: 1500, duration: 400 });
    },

    /* --- acciones de la fase 1 ofensiva --- */
    defGambeta() {
      var st = this.st, P = window.PampaPartido, self = this;
      var vivos = this._def.defs.filter(function (d) { return d.vivo; });
      if (!vivos.length) { this.avisarDef("No tenés a nadie encima"); return; }
      var acc = P.accionesAtaque(st).find(function (a) { return a.id === "gambeta"; });
      if (!acc || acc.bloqueada) { this.avisarDef("▨ " + ((acc && acc.motivo) || "sin aguante")); return; }
      var yo = st.mios[st.ctrl];
      var r = P.resolverDuelo(st, { accion: "gambeta", poder: acc.poder, costo: acc.costo });
      if (r.win) {
        var d = vivos[0]; d.vivo = false;
        this.tweens.add({ targets: d.spr, x: d.spr.x - 120, alpha: 0.25, angle: -70, duration: 420 });
        this._def.angulo = Math.min(1, this._def.angulo + 0.15);
        this.avisarDef("¡Lo dejaste pagando! Mejor ángulo");
        this.SFX && this.SFX.whoosh && this.SFX.whoosh(300);
      } else {
        P.perderPelota(st);
        this.salirDefinicion(function () {
          self.escenaCine({
            etiqueta: "· la gambeta ·",
            prota: { j: st.rivales[st.portadorRival], esRival: true, anim: "pase" },
            rival: { j: yo, esRival: false, anim: "gambeta" },
            gana: true, color: 0xe3503e, sfx: "gloves",
            titulo: "TE LA SACARON", sub: "quisiste una de más en el área",
            alFinal: function () { self.relatar("gambeta_lose"); }
          });
        }, true);
      }
    },
    defPared() {
      var st = this.st, P = window.PampaPartido;
      var A = this.BAL.aguante;
      if (!P.accionesAtaque(st).find(function (a) { return a.id === "pared"; }) || st.mios[st.ctrl].aguante < A.costo_pared) { this.avisarDef("▨ sin compañero o sin aguante"); return; }
      st.mios[st.ctrl].aguante = Math.max(0, st.mios[st.ctrl].aguante - A.costo_pared);
      var vivos = this._def.defs.filter(function (d) { return d.vivo; });
      if (vivos.length) {
        var d = vivos[0]; d.vivo = false;
        this.tweens.add({ targets: d.spr, y: d.spr.y - 60, alpha: 0.25, duration: 380 });
      }
      this._def.angulo = Math.min(1, this._def.angulo + 0.1);
      this.avisarDef("¡PARED! El compañero te la devuelve limpia");
      this.SFX && this.SFX.kick && this.SFX.kick();
    },
    defBarrida() {
      var st = this.st, P = window.PampaPartido, self = this;
      if (this._def.barridaHecha) return;
      this._def.barridaHecha = true;
      var acc = P.accionesDefensa(st).find(function (a) { return a.id === "quite"; });
      var r = P.resolverDuelo(st, { accion: "quite", poder: (acc ? acc.poder : 50) + 6, costo: acc ? acc.costo : 50 });
      if (r.win) {
        P.ganarDefensa(st);
        this.salirDefinicion(function () {
          self.escenaCine({
            etiqueta: "· la barrida ·",
            prota: { j: st.mios[st.ctrl], esRival: false, anim: "pase" },
            rival: { j: self._def && self._def.tirador ? self._def.tirador : st.rivales[0], esRival: true, anim: "tiro" },
            gana: true, sfx: "gloves", poseIlustrada: "barrida",
            titulo: "¡SE LA SACASTE!", sub: "barrida heroica antes del remate",
            alFinal: function () { self.relatar("gambeta_win"); }
          });
        }, true);
      } else {
        this._def.defensorVivo = false;
        this.tweens.add({ targets: this._def.spr, x: this._def.spr.x - 130, angle: -80, alpha: 0.4, duration: 420 });
        this.avisarDef("¡Te pasó de largo! Quedaste fuera de la jugada");
      }
    },

    /* --- FASE 2: el duelo de SEIS ZONAS + la aguja --- */
    defElegirTiro(tipo, costo) {
      var st = this.st;
      if (!this._def || this._def.fase !== 1) return;   // guard: fuera de la fase de posición no hay tiro
      this._def.tiroTipo = tipo;
      this._def.costo = costo;
      this._def.fase = 2;
      this._def.aguja.t0 = this.time.now;
      this._def.botones.forEach(function (b) { b.destroy(); });
      this._def.botones = [];
      this.defZonas(true);
    },
    defCargaLista() {   // defensiva: el rival ya cargó — te toca elegir zona
      this._def.fase = 2;
      this._def.aguja.t0 = this.time.now;
      this._def.botones.forEach(function (b) { b.destroy(); });
      this._def.botones = [];
      this.defZonas(false);
    },
    defZonas(ofensiva) {
      var D = window.PampaDefinicion, self = this;
      var g = this.add.graphics();
      this.cineContent.add(g);
      this._def.zonasG = g;
      this._def.zonaSel = 4;
      this._def.zonaRects = [];
      var x0 = W / 2 - 180, y0 = 98, cw = 120, ch = 43;
      D.ZONAS.forEach(function (z, i) {
        var zx = x0 + z.col * cw, zy = y0 + z.fila * ch;
        var r = self.add.rectangle(zx + cw / 2, zy + ch / 2, cw - 6, ch - 6, 0xf6efdc, 0.14).setStrokeStyle(2, 0xffffff, 0.9).setInteractive({ useHandCursor: true });
        var t = self.add.text(zx + cw / 2, zy + ch / 2, z.n, { fontFamily: "monospace", fontSize: "11px", fontStyle: "bold", color: "#ffffff", stroke: "#0a1f13", strokeThickness: 3 }).setOrigin(0.5);
        self.cineContent.add(r); self.cineContent.add(t);
        r.on("pointerdown", function (p, xx, yy, ev) { ev && ev.stopPropagation && ev.stopPropagation(); self._uiTocado = self.time.now; self.defConfirmarZona(z.id); });
        self._def.zonaRects.push(r);
      });
      var ayuda = this.add.text(W / 2, H - 86, ofensiva
        ? "☝ TOCÁ LA ZONA (eso frena la aguja) — el arquero eligió la suya A CIEGAS"
        : "☝ TOCÁ TU ZONA (eso frena tu reacción) — el rival ya eligió la suya",
        { fontFamily: "monospace", fontSize: "11px", color: "#ffd84d", backgroundColor: "#0a1f13dd", padding: { x: 8, y: 4 } }).setOrigin(0.5);
      this.cineContent.add(ayuda);
      this._def.agujaG = this.add.graphics();
      this.cineContent.add(this._def.agujaG);
      /* elección secreta del otro lado, decidida YA (una sola vez) */
      this._def.zonaCPU = D.eleccionCPU();
    },
    defConfirmarZona(id) {
      if (!this._def || this._def.fase !== 2 || this._def.zonaMia) return;
      this._def.zonaMia = id;
      var F = this.BAL.feel || {};
      var periodo = F.barra_periodo_ms || 900;
      var fase = ((this.time.now - this._def.aguja.t0) % periodo) / periodo;
      this._def.aguja.p = fase < 0.5 ? fase * 2 : 2 - fase * 2;
      this._def.fase = 3;
      if (this._def.modo === "of") this.defVueloOf(); else this.defVueloDef();
    },

    /* --- FASE 3+4 ofensiva: el vuelo y el desenlace --- */
    defVueloOf() {
      var st = this.st, P = window.PampaPartido, D = window.PampaDefinicion, Duel = window.PampaDuel;
      var DL = this.BAL.definicion || {}, F = this.BAL.feel || {}, self = this;
      var j = st.mios[st.ctrl];
      /* 1) tirada de BLOQUEO de los defensores vivos que quedaron cerca */
      var vivos = this._def.defs.filter(function (d) { return d.vivo; });
      var dMedia = vivos.length ? vivos.reduce(function (a, d) { return a + Math.hypot(d.spr.x - self._def.spr.x, d.spr.y - self._def.spr.y); }, 0) / vivos.length : 999;
      var pBloqueo = D.chanceBloqueo(vivos.length, dMedia * 0.55, DL);
      var bloqueado = Math.random() < pBloqueo;
      /* 2) la verdad del remate, decidida UNA vez */
      var off = this._def.aguja.p - 0.5;
      var tim = D.efectoTiming(off, DL.zona_timing || 0.2, DL);
      var dz = D.distZonas(this._def.zonaMia, this._def.zonaCPU);
      /* el gasto de aguante y el salto de reloj viven en la LÓGICA (una sola vez) */
      var esAereo = this._def.tiroTipo === "cabezazo" || this._def.tiroTipo === "chilena" || this._def.tiroTipo === "volea";
      var prep = esAereo ? P.prepararRemateAereo(st, this._def.tiroTipo) : P.prepararRemate(st, false);
      var poder = prep.shotPower + tim.dPoder + (this._def.angulo - 0.5) * (DL.angulo_peso || 16);
      var keeper = prep.keeperSkill + D.bonusArqueroPorZona(dz, DL);
      var res;
      if (bloqueado) res = { outcome: "bloqueado" };
      else if (Math.random() < tim.fueraProb) res = { outcome: "afuera" };
      else res = Duel.resolveShot({ shotPower: poder, keeperSkill: keeper, zone: { bonus: 0, fuera: dz >= 2 ? 0.04 : 0.08, gy: D.zona(this._def.zonaMia).gy }, cfg: { spread: this.BAL.duelo.spread, min: this.BAL.duelo.min, max: this.BAL.duelo.max } });
      var gol = res.outcome === "gol";
      if (!bloqueado) { if (gol) P.golMio(st); else P.tiroFallado(st); }
      else P.tiroFallado(st);
      this.defTeatroFinal({
        ofensiva: true, gol: gol, bloqueado: bloqueado, res: res, dz: dz, tim: tim,
        poseTiro: this._def.tiroTipo === "chilena" ? "chilena" : this._def.tiroTipo === "cabezazo" ? "cabezazo" : "remate"
      });
    },

    /* --- FASE 3+4 defensiva --- */
    defVueloDef() {
      var st = this.st, P = window.PampaPartido, D = window.PampaDefinicion, self = this;
      var DL = this.BAL.definicion || {};
      this._def.zonaTiro = this._def.zonaCPU;   // dónde patea el rival (ya decidido)
      var dz = D.distZonas(this._def.zonaMia, this._def.zonaTiro);
      var off = this._def.aguja.p - 0.5;
      var tim = D.efectoTiming(off, DL.zona_timing || 0.2, DL);
      /* bloqueo previo de TU defensor si quedó plantado/vivo cerca de la línea */
      var pBloqueo = 0;
      if (this._def.defensorVivo) {
        var lx = W * 0.5, ly = (H * 0.76 + 150) / 2;   // punto medio de la línea de tiro
        var dLinea = Math.hypot(this._def.spr.x - lx, this._def.spr.y - ly);
        pBloqueo = D.chanceBloqueo(1, dLinea * (this._def.plantado ? 0.5 : 0.9), DL);
      }
      var bloqueado = Math.random() < pBloqueo;
      /* V6 R3: la SÚPER DEFENSA gasta el envión y bloquea SEGURO */
      if (this._def.superDef && P.gastarEnvionSuper(st)) bloqueado = true;
      var bonus = D.bonusArqueroPorZona(dz, DL) + (tim.enZona ? (DL.dulce_bonus || 8) : -8);
      var ach = this._def.plan === "achicar" ? D.efectoAchicar(this._def.zonaTiro, DL) : { dArquero: 0 };
      bonus += ach.dArquero;
      if (this._def.mega) {
        var arq = st.mios.find(function (x) { return x.pos === "ARQ"; });
        if (arq) arq.aguante = Math.max(0, arq.aguante - this._def.mega.aguante);
        bonus += this._def.mega.bonus || 20;
      }
      var res = bloqueado ? { golRival: false, bloqueado: true } : P.resolverAtajada(st, "atajar", null, bonus);
      if (bloqueado) {
        P.saltoReloj(st);   // el bloqueo también es un MOMENTO (consume su bloque de reloj)
        st.posesion = "mia"; st.ctrl = st.mios.findIndex(function (x) { return x.pos === "DEF"; });
        st.modo = "juego"; st.cooldown = st.bal.ritmo.cooldown_encuentro_ms;
      }
      this.defTeatroFinal({ ofensiva: false, gol: !!res.golRival, bloqueado: bloqueado, retiene: !!res.retiene, dz: dz });
    },

    /* --- EL TEATRO: pose + líneas + FREEZE + silencio + revelación --- */
    defTeatroFinal(o) {
      var self = this, F = this.BAL.feel || {}, D = window.PampaDefinicion;
      this._def.fase = 4;
      if (this._def.zonasG && this._def.zonasG.active) this._def.zonasG.clear();
      (this._def.zonaRects || []).forEach(function (r) { if (r.active) r.disableInteractive(); });
      this.limpiarContenido();
      this.cineBG.clear();
      this.cineBG.fillStyle(0x081c10, 1); this.cineBG.fillRect(0, 0, W, H);
      this.cineBG.fillStyle(o.ofensiva ? 0x0b1c2a : 0x2a0b0b, 1);
      this.cineBG.fillTriangle(0, 0, W * 0.66, 0, W * 0.34, H); this.cineBG.fillTriangle(0, 0, W * 0.34, H, 0, H);
      this.cineBG.fillStyle(0x1f7a3c, 1); this.cineBG.fillRect(0, H * 0.82, W, H * 0.18);
      /* LA POSE ilustrada (quieta, grande) — todo lo demás se mueve */
      var poseId = o.ofensiva ? o.poseTiro : (o.bloqueado ? "barrida" : "remate");
      var jj = o.ofensiva ? this.st.mios[this.st.ctrl] : (this._def.tirador || this.st.rivales[0]);
      var spr = this.poseSprite(poseId, W * 0.34, H * 0.52, 400, function () {
        var b = (o.ofensiva ? "h_mio" + self.st.ctrl : "h_riv" + ((jj.numero || 1) - 1));
        var k = b + "_tiro_2";
        return self.textures.exists(k) ? self.add.sprite(0, 0, k).setScale(3.6) : null;
      });
      this.cineContent.add(spr);
      this._def.shakeSpr = spr;   // sacudida 2-3px de esfuerzo (updateDefinicion)
      this.lineasVelocidad(W / 2, H * 0.45, 1.2, o.ofensiva ? 0xffd84d : 0xff8a50);
      this.uiCam.flash(90, 255, 255, 235);
      var snd = this.FLAGS.e6_cine ? this.SFX : null;
      snd && snd.kick();
      /* la pelota viaja a la zona; el arquero VUELA con su pose */
      var z = D.zona(o.ofensiva ? this._def.zonaMia : this._def.zonaTiro);
      var bx = W / 2 - 180 + z.col * 120 + 60, by = 98 + z.fila * 43 + 21;
      var ball = this.add.sprite(W * 0.42, H * 0.6, "ball").setScale(2.2);
      this.cineContent.add(ball);
      this.tweens.add({ targets: ball, x: bx, y: by, scale: 0.9, duration: this.msV(520), ease: "Quad.easeIn" });
      var arqPose = this.poseSprite("arquero_vuela", W * 0.74, H * 0.4, 260, function () { return null; });
      this.cineContent.add(arqPose);
      var zA = D.zona(o.ofensiva ? this._def.zonaCPU : this._def.zonaMia);
      this.tweens.add({ targets: arqPose, x: W / 2 - 180 + zA.col * 120 + 60, y: 98 + zA.fila * 43 + 40, duration: this.msV(520), ease: "Quad.easeOut" });
      /* FREEZE + medio segundo de SILENCIO absoluto + REVELACIÓN */
      var tVuelo = this.msV(560);
      var silencio = F.silencio_ms || 500;
      this.time.delayedCall(tVuelo, function () {
        self._def.congelado = true;   // freeze: la sacudida para, todo se clava
        self.musicaDuck(silencio + 300);
      });
      this.time.delayedCall(tVuelo + silencio, function () { self.defRevelacion(o); });
    },
    defRevelacion(o) {
      var self = this, snd = this.FLAGS.e6_cine ? this.SFX : null;
      this.limpiarContenido();
      this.cineBG.fillStyle(0x081c10, 0.6); this.cineBG.fillRect(0, 0, W, H);
      var titulo, sub, color, poseId, jr;
      if (o.bloqueado) {
        titulo = o.ofensiva ? "¡BLOQUEADO!" : "¡LA SACÓ TU DEFENSA!";
        sub = o.ofensiva ? "se tiró con todo y la desvió" : "la barrida que salva el día";
        color = o.ofensiva ? 0xe3503e : 0x7ee08a;
        poseId = "barrida";
      } else if (o.ofensiva) {
        titulo = o.gol ? "¡GOOOL!" : (o.res.outcome === "atajada" ? "¡LA SACÓ!" : "¡AFUERA!");
        sub = o.gol ? (o.dz >= 2 ? "el arquero fue al otro palo · ¡GRITALO!" : "la clavaste igual") : (o.res.outcome === "atajada" ? (o.dz === 0 ? "te adivinó la zona" : "voló y llegó") : "se fue por centímetros");
        color = o.gol ? 0xffd84d : (o.res.outcome === "atajada" ? 0x5bb8e8 : 0xe3503e);
        poseId = o.gol ? "festejo" : "arquero_ataja";
      } else {
        titulo = o.gol ? "GOL DE " + this.nombreRival : "¡ATAJADÓN!";
        sub = o.gol ? (o.dz >= 2 ? "te fue al otro palo…" : "no alcanzó…") : (o.dz === 0 ? "¡LE ADIVINASTE LA ZONA!" : "¡llegaste con lo justo!");
        color = o.gol ? 0xe3503e : 0x7ee08a;
        poseId = o.gol ? "arquero_vuela" : "arquero_ataja";
      }
      var spr = this.poseSprite(poseId, W * 0.5, H * 0.48, 420, function () { return null; });
      this.cineContent.add(spr);
      spr.setAlpha(0); this.tweens.add({ targets: spr, alpha: 1, duration: 120 });
      this.lineasVelocidad(W / 2, H * 0.45, 1.4, color);
      this.punch(titulo, sub, color);
      this.uiCam.flash(110, 255, 255, 255);
      this.uiCam.shake(240, 0.01);
      var esFiesta = (o.ofensiva && o.gol) || (!o.ofensiva && !o.gol);
      if (snd) {
        if (o.ofensiva && o.gol) { snd.net(); this.time.delayedCall(90, function () { snd.goal(); }); }
        else if (!o.ofensiva && o.gol) snd.golEnContra && snd.golEnContra();
        else { snd.gloves(); if (!o.ofensiva) { snd.crowd && snd.crowd(1400); this.time.delayedCall(120, function () { snd.goal(); }); } }   // la atajada SE GRITA
      }
      if (esFiesta) { this.burst(W * 0.5, H * 0.4); this.tribunaSaltando(); }   // V6 P5: la tribuna salta
      this.relatar(o.ofensiva ? (o.gol ? "gol" : (o.bloqueado || o.res.outcome === "atajada" ? "atajada" : "afuera")) : (o.gol ? "gol_rival" : "arquero_mio"));
      this.time.delayedCall(this.msV(1250), function () { self.salirDefinicion(); });
    },

    salirDefinicion(alFinal, sinRestaurarEstado) {
      this._def = null;
      this.limpiarContenido();
      this.cineLayer.setVisible(false);
      this.mundoLayer.setVisible(true); this.hudLayer.setVisible(true);
      this.uiCam.fadeIn(this.BAL.cine.corte_ms, 0, 0, 0);
      this.zoomBase();
      if (alFinal) { alFinal(); return; }
      if (!sinRestaurarEstado) {
        this.estado = "LIBRE";
        this.st.modo = "juego";
        this.musica(this.st.posesion === "mia" ? "propia" : "rival");
      }
    },

    /* ============ el PULSO de la definición (llamado desde update) ============ */
    updateDefinicion(delta) {
      var d = this._def; if (!d) { this.estado = "LIBRE"; return; }
      var DL = this.BAL.definicion || {};
      d.t += delta;
      /* sacudida de esfuerzo de la pose (2-3 px, alta frecuencia) — para en el FREEZE */
      if (d.shakeSpr && d.shakeSpr.active && !d.congelado) {
        d.shakeSpr.x += Math.sin(d.t * 0.09) * 1.4;
        d.shakeSpr.y += Math.cos(d.t * 0.11) * 1.1;
      }
      if (d.fase === 1) {
        /* mover al jugador (dedo = arrastre; teclado = flechas) */
        var vx = 0, vy = 0;
        if (this.cursors) {
          if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= 1;
          if (this.cursors.right.isDown || this.wasd.D.isDown) vx += 1;
          if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= 1;
          if (this.cursors.down.isDown || this.wasd.S.isDown) vy += 1;
        }
        var p = this.input.activePointer;
        if (p && p.isDown && p.y < H - 70 && this.time.now - (this._uiTocado || 0) > 120) {
          vx = Math.sign(p.x - d.spr.x) * (Math.abs(p.x - d.spr.x) > 8 ? 1 : 0);
          vy = Math.sign(p.y - d.spr.y) * (Math.abs(p.y - d.spr.y) > 8 ? 1 : 0);
        }
        var vel = (DL.jugador_px_s || 160) * delta / 1000;
        if ((vx || vy) && d.spr.active && (d.modo !== "def" || d.defensorVivo)) {
          d.spr.x = Math.max(90, Math.min(W - 90, d.spr.x + vx * vel));
          d.spr.y = Math.max(H * 0.3, Math.min(H * 0.8, d.spr.y + vy * vel));
        }
        if (d.modo === "of") {
          /* el ángulo mejora en el centro y cerca del arco; los defensores APRIETAN */
          d.angulo = Math.max(0, Math.min(1, 1 - Math.abs(d.spr.x - W / 2) / (W / 2) - (d.spr.y - H * 0.3) / (H * 0.9) + 0.42));
          var vAc = (DL.def_acercan_px_s || 34) * delta / 1000;
          for (var i = 0; i < d.defs.length; i++) {
            var df = d.defs[i]; if (!df.vivo) continue;
            var dd = Math.hypot(d.spr.x - df.spr.x, d.spr.y - df.spr.y) || 1;
            df.spr.x += (d.spr.x - df.spr.x) / dd * vAc;
            df.spr.y += (d.spr.y - df.spr.y) / dd * vAc;
            if (dd < (DL.contacto_px || 34)) {   // te alcanzaron: te la sacan
              var st = this.st, P = window.PampaPartido, self = this;
              P.perderPelota(st);
              this.salirDefinicion(function () {
                self.escenaCine({
                  etiqueta: "· te apretaron ·",
                  prota: { j: st.rivales[st.portadorRival], esRival: true, anim: "pase" },
                  rival: null, gana: true, color: 0xe3503e, sfx: "gloves",
                  titulo: "¡TE LA QUITARON!", sub: "esperaste de más y te comieron el ángulo",
                  alFinal: function () { self.relatar("gambeta_lose"); }
                });
              }, true);
              return;
            }
          }
        } else {
          /* defensiva: la CARGA del rematador avanza; al 100% patea */
          d.carga = Math.min(1, d.carga + delta / d.cargaMs);
          var g = d.cargaG; g.clear();
          g.fillStyle(0x0a1f13, 0.9); g.fillRect(W / 2 - 152, H * 0.86, 304, 16);
          g.fillStyle(d.carga > 0.75 ? 0xc62828 : 0xf9a825, 1); g.fillRect(W / 2 - 150, H * 0.86 + 2, 300 * d.carga, 12);
          g.lineStyle(2, 0xf6efdc, 0.9); g.strokeRect(W / 2 - 152, H * 0.86, 304, 16);
          /* línea de tiro punteada (rematador → arco) para saber dónde meterse */
          g.lineStyle(2, 0xffffff, 0.35);
          for (var yy = H * 0.72; yy > 170; yy -= 24) { g.beginPath(); g.moveTo(W * 0.5, yy); g.lineTo(W * 0.5, yy - 12); g.strokePath(); }
          if (d.carga >= 1) this.defCargaLista();
        }
      } else if (d.fase === 2 && d.agujaG && !d.zonaMia) {
        /* la aguja del timing corre mientras elegís zona */
        var F = this.BAL.feel || {};
        var periodo = F.barra_periodo_ms || 900;
        var fase = ((this.time.now - d.aguja.t0) % periodo) / periodo;
        d.aguja.p = fase < 0.5 ? fase * 2 : 2 - fase * 2;
        var ga = d.agujaG, bx = W / 2 - 180, by = H - 62, bw = 360, bh = 22;
        ga.clear();
        ga.fillStyle(0x0a1f13, 0.92); ga.fillRect(bx - 4, by - 4, bw + 8, bh + 8);
        ga.fillStyle(0x333d36, 1); ga.fillRect(bx, by, bw, bh);
        var zw = bw * ((this.BAL.definicion && this.BAL.definicion.zona_timing) || 0.2);
        ga.fillStyle(0x2e7d32, 1); ga.fillRect(bx + bw / 2 - zw / 2, by, zw, bh);
        ga.lineStyle(2, 0xffffff, 1); ga.strokeRect(bx + bw / 2 - zw / 2, by, zw, bh);
        var ax = bx + bw * d.aguja.p;
        ga.fillStyle(0xffd84d, 1); ga.fillRect(ax - 3, by - 7, 6, bh + 14);
        ga.fillTriangle(ax - 8, by - 12, ax + 8, by - 12, ax, by - 3);
      }
    }
  });
})();
