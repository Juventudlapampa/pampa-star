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

    /* ================== B3 · LA ÚNICA PUERTA DEL PANEL DE CINE ==================
       Este bug volvió CINCO veces: una figura del cine sale dibujada con el
       muñequito paramétrico de bloques en medio de las ilustraciones.

       Las cuatro veces anteriores se arregló recorriendo las escenas una por
       una. Eso cubre las que existían ese día — no las que se agregan después,
       ni los caminos que el barrido no miró. Esta vez la quinta aparición NO
       estaba en las escenas: estaba en la CADENA DE PLANOS del cine viejo
       (planoPie → planoEsfuerzo → planoArquero → planoDesenlace), que dibujaba
       "cine_arquero" y "cine_jugador" cableados a mano.

       Así que ahora hay UNA sola función por la que puede entrar una figura al
       panel, y no sabe devolver bloques:
         · si la pose pedida existe, la devuelve;
         · si no existe, cae a una pose GENÉRICA ilustrada (nunca a bloques);
         · y si tampoco está la genérica, en desarrollo TIRA ERROR con el nombre
           de quien la pidió, para que se vea en el acto y no dentro de un mes
           en una captura de Rodri.

       Regla dura: nada dentro de cineContent/cineLayer puede usar una textura
       que no venga de acá. El test phaser/test/b3_sin_bloques.test.js lo barre. */
    figuraCine(id, quienLaPide, generica) {
      var gen = generica || "corriendo";
      var k = id ? this.poseKey(id) : null;
      if (k) return k;
      var g = this.poseKey(gen);
      if (g) {
        /* no es un error: es una escena sin pose propia todavía. Se avisa una
           vez por combinación para que quede en la lista de lo que falta. */
        this._faltanPoses = this._faltanPoses || {};
        var marca = (quienLaPide || "?") + ":" + (id || "sin-id");
        if (!this._faltanPoses[marca]) {
          this._faltanPoses[marca] = true;
          if (window.PAMPA_DEV) console.warn("[B3] '" + quienLaPide + "' pidió la pose '" + id +
            "' y no existe. Va con '" + gen + "'. Agregala a data/poses_manifest.json.");
        }
        return g;
      }
      /* ni la genérica: esto sí es un error de instalación, y hay que verlo */
      var msg = "[B3] el panel de cine no tiene NINGUNA pose ilustrada para '" + quienLaPide +
        "' (pidió '" + id + "', genérica '" + gen + "'). Nunca se cae a bloques: revisá que " +
        "data/poses_manifest.json esté cargado y que los PNG existan.";
      if (window.PAMPA_DEV) throw new Error(msg);
      console.error(msg);
      return null;   // el caller decide, pero NUNCA con bloques
    },

    /* la pose del ARQUERO según lo que está haciendo. Existen dos ilustradas:
       arquero_ataja (la retuvo, de rodillas) y arquero_vuela (estirada). */
    figuraArquero(accion, quienLaPide) {
      var id = (accion === "ataja" || accion === "atajada" || accion === "retiene" || accion === "despeje")
        ? "arquero_ataja" : "arquero_vuela";
      return this.figuraCine(id, quienLaPide || "arquero", "arquero_vuela");
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
    /* V7 §0.2: la pose del héroe teñida al NARANJA rival (la camiseta celeste
       del arte base pasa al color de bando; piel y pelo quedan). Cacheada. */
    poseRivalNaranja(id) {
      var src = this.poseKey(id);
      if (!src || !window.PampaAvatarArte || !window.PampaAvatarArte.tenirImagen) return src;
      var key = "poseR_" + id;
      if (this.textures.exists(key)) return key;
      window.PampaAvatarArte.tenirImagen(this, src, key, [{ de: 0x54bcec, a: 0xFF8A50, tol: 95 }]);
      return this.textures.exists(key) ? key : src;
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
      /* V7 §0.2: tu jugador movible es la POSE ILUSTRADA del héroe con tu
         pinta (el heroico de bloques queda de fallback) — SIEMPRE revelado */
      var kCorr = this.poseHeroeTenida ? (this.poseHeroeTenida(st.mios[st.ctrl]) || this.poseKey("corriendo")) : this.poseKey("corriendo");
      if (kCorr) {
        this._def.spr = this.add.image(this._def.jug.x, this._def.jug.y, kCorr);
        this._def.spr.setScale(150 / this._def.spr.height);
      } else {
        var base = this.bakePortador(this.portadorActual());
        this._def.spr = this.add.sprite(this._def.jug.x, this._def.jug.y, base + "_correr_2").setScale(2.1);
      }
      this.cineContent.add(this._def.spr);
      /* defensores REALES en el camino (mín 1 si el cruce venía con rival).
         V7 §1: con la pose ILUSTRADA del bloqueo (el rival plantado) — las
         siluetas de código quedan de fallback si falta el arte. */
      var nDefs = Math.max(opts.rivalIdx != null ? 1 : 0, Math.min(n, 3));
      var kBloq = this.poseKey("bloqueo");
      for (var k = 0; k < nDefs; k++) {
        var dx = W * (0.3 + 0.2 * k), dy = H * (0.34 + 0.06 * (k % 2));
        var spr;
        if (kBloq) {
          spr = this.add.image(dx, dy, kBloq);
          spr.setScale(96 / spr.height);
          /* V7 §0.1: los que llegan son SILUETAS hasta entrar al cruce
             (el rematador y los arqueros van SIEMPRE revelados) */
          spr.setTintFill(0x101820);
        } else {
          var g = this.add.graphics();
          g.fillStyle(0x1a0d08, 0.9); g.fillEllipse(0, -30, 34, 34); g.fillRoundedRect(-20, -16, 40, 66, 10);
          g.fillStyle(0xff8a50, 0.9); g.fillRect(-20, -6, 40, 8);   // franja rival (forma+color)
          spr = this.add.container(dx, dy, [g]);
        }
        this.cineContent.add(spr);
        this._def.defs.push({ spr: spr, x: dx, y: dy, vivo: true });
      }
      /* V7 §1: el arquero rival bajo los palos es una FICHA humana (el sprite
         heroico del arquero, naranja) — el rectángulo queda de fallback */
      /* B3: acá se dibujaba el arquero rival con el muñequito de bloques, y NO
         era un fallback — salía siempre, todo el rato que buscás el ángulo, con
         la tribuna y tu pose ilustradas alrededor. Era el segundo lugar más
         visible del bug. Ahora es la pose ilustrada, teñida de naranja rival. */
      var arqR = st.rivales.find(function (x) { return x.pos === "ARQ"; });
      this._def.arq = null;
      var kArq = this.figuraArquero("vuela", "definición ofensiva (arquero rival)");
      if (kArq) {
        var kNaranja = this.poseRivalNaranja ? (this.poseRivalNaranja("arquero_vuela") || kArq) : kArq;
        this._def.arq = this.add.image(W / 2, 148, kNaranja);
        this._def.arq.setScale(96 / this._def.arq.height);
      }
      if (!this._def.arq) this._def.arq = this.add.rectangle(W / 2, 148, 26, 44, 0xf6c11d).setStrokeStyle(2, 0x0a1f13);
      this.cineContent.add(this._def.arq);
      this.cineLabel.setText("· LA DEFINICIÓN · buscá el ángulo, los defensores se acercan");
      this.defBotonesOf(opts);
      this.selloDef();
      this.musica("rival");   // tensión
      this.relatar("peligro");
    },

    /* V9 C1 · LA PANTALLA DE DEFENSA SE FUE. Rodri la pidió sacar tres veces:
       botones de gestión (plantarse/achicar/aguantar) no son fútbol. Cualquier
       caller viejo cae en la escena nueva, que resuelve por posición y nivel.
       El cuerpo de abajo queda inalcanzable a propósito (referencia histórica). */
    entrarDefinicionDef() {
      if (this.escenaRemateRival) { this.escenaRemateRival(this.st.portadorRival); return; }
      return this._entrarDefinicionDefVieja();
    },
    /* B3: el cuerpo viejo se BORRÓ. No se alcanzaba NUNCA —entrarDefinicionDef
       sale antes por escenaRemateRival, que siempre existe porque escenas_v9.js
       se carga después de match.js y se mezcla en el prototipo— y dibujaba dos
       figuras de bloques que aparecían en toda auditoría como falsos positivos.
       Si algún día se vuelve a llamar, que se vea en el acto. */
    _entrarDefinicionDefVieja() {
      console.error("[B3] _entrarDefinicionDefVieja() no debería llamarse: la definición defensiva la maneja escenaRemateRival().");
      if (this.escenaRemateRival) return this.escenaRemateRival(0);
    },

    selloDef() { /* cineLayer la mira solo uiCam (ya sellado en create); nada extra */ },

    /* ============ FONDO ¾: cielo, TRIBUNA ilustrada, ARCO al fondo, pasto ============ */
    defFondo(esMiArco) {
      var g = this.cineBG;
      g.clear();
      g.fillStyle(0x123a5a, 1); g.fillRect(0, 0, W, 120);                       // cielo
      /* ARTE 2: la tribuna ILUSTRADA como capa lejana detrás del arco (fallback: la de código) */
      if (this.textures.exists("fondo_tribuna")) {
        var trib = this.add.image(W / 2, 128, "fondo_tribuna").setOrigin(0.5, 1);
        trib.setScale(W / trib.width);
        this.cineContent.add(trib);
      } else {
        g.fillStyle(0x0e2c44, 1); g.fillRect(0, 78, W, 42);
        g.fillStyle(0xf6efdc, 0.3); for (var x = 8; x < W; x += 26) g.fillRect(x, 86 + (x % 3) * 6, 4, 4);
      }
      g.fillStyle(0x2e7d32, 1); g.fillRect(0, 120, W, H - 120);                 // pasto
      g.fillStyle(0x388e3c, 1); for (var y = 120; y < H; y += 64) g.fillRect(0, y, W, 32);
      /* EL ARCO al fondo (grande, seis zonas viven acá en fase 2) — en su propio
         graphics DENTRO de cineContent para quedar DELANTE de la tribuna */
      g = this.add.graphics();
      this.cineContent.add(g);
      g.fillStyle(0xffffff, 1);
      g.fillRect(W / 2 - 190, 96, 10, 88); g.fillRect(W / 2 + 180, 96, 10, 88); g.fillRect(W / 2 - 190, 90, 380, 8);
      g.fillStyle(0xdfeef6, 0.35);
      for (var xx = -180; xx <= 180; xx += 18) g.fillRect(W / 2 + xx, 98, 2, 84);
      for (var yy = 100; yy <= 180; yy += 14) g.fillRect(W / 2 - 180, yy, 360, 2);
      /* área */
      g.lineStyle(4, 0xeafff0, 0.7); g.strokeRect(W / 2 - 260, 128, 520, 210);
      if (esMiArco) {
        var t = this.add.text(16, 128, "⚠ TU ARCO", { fontFamily: window.PF.display, fontSize: "11px", color: "#ff8a50", stroke: "#0a1f13", strokeThickness: 2 });
        this.cineContent.add(t);
      }
    },

    /* ============ BOTONES contextuales (48px+, costo en NÚMERO) ============ */
    defBoton(x, texto, sub, color, cb, ancho) {
      var r = this.add.rectangle(x, H - 34, ancho || 148, 52, color || 0xf6efdc, 0.97).setStrokeStyle(2, 0x0a1f13).setInteractive({ useHandCursor: true });
      var t = this.add.text(x, H - 42, texto, { fontFamily: window.PF.display, fontSize: "9px", color: "#0a1f13" }).setOrigin(0.5);
      var s = this.add.text(x, H - 24, sub || "", { fontFamily: window.PF.texto, fontSize: "10px", color: "#365a41" }).setOrigin(0.5);
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
    /* ============ V9 §6 · UNA DECISIÓN, NO UNA CHECKLIST ============
       Había cinco botones (PLANTARSE / BARRIDA / ACHICAR / LÍNEA / QUIETO):
       ninguno salvo BARRIDA costaba nada, ninguno excluía a los otros y
       ninguno cerraba la fase, así que la jugada óptima era tocarlos todos
       mientras corría la barra de carga —cero tensión, cero trade-off—.
       Ahora son TRES, se elige UNA, cuesta y RESUELVE: decidís y ves qué pasó.
       Quién ataja no lo decide un reflejo: lo deciden dónde está tu defensor,
       el nivel de tu arquero y el cansancio. */
    defBotonesDef() {
      var st = this.st, A = this.BAL.aguante, self = this;
      var w = 250, xs = W / 2 - (w + 14);
      var elegir = function (fn) {
        return function () {
          if (self._def.decidido) return;      // una sola vez: es LA decisión
          self._def.decidido = true;
          (self._def.botones || []).forEach(function (b) { if (b.active) b.destroy(); });
          self._def.botones = [];
          fn();
        };
      };
      this.defBoton(xs, "🦵 ME TIRO", A.costo_quite + " · a todo o nada", 0xff8c3a, elegir(function () {
        self.defBarrida();
      }), w);
      this.defBoton(xs + w + 14, "🧤 SALGO A ACHICAR", "el arquero le achica el ángulo", 0xf6efdc, elegir(function () {
        self._def.plan = "achicar";
        if (self._def.arq) self._def.arq.y = 190;
        self.avisarDef("Tu arquero SALE a achicar");
        self.time.delayedCall(self.msV(520), function () { self.defResolverDefensa(); });
      }), w);
      this.defBoton(xs + (w + 14) * 2, "🧱 AGUANTO", "en la línea · juntás aire", 0xf6efdc, elegir(function () {
        self._def.plantado = true;
        st.mios[st.ctrl].aguante = Math.min(A.max, st.mios[st.ctrl].aguante + Math.round((A.recupera_no_moverse || 30) * 0.5));
        self.avisarDef("Te plantás en la línea y juntás aire");
        self.time.delayedCall(self.msV(520), function () { self.defResolverDefensa(); });
      }), w);
      /* los EXTRA no compiten por el mismo lugar: van arriba y no consumen la decisión */
      if (window.PampaPartido.envionLleno(st)) {
        this.defBoton(W / 2, H - 108, 300, "🌟 SÚPER DEFENSA · ENVIÓN lleno", 0xffd84d, function () {
          self._def.superDef = true;
          self.avisarDef("🌟 ¡SÚPER DEFENSA lista! Este remate NO entra");
        }, 300);
      } else {
        var m = this.megaDefensaDisponible(["atajada"], st.mios.find(function (x) { return x.pos === "ARQ"; }));
        if (m) this.defBoton(W / 2, H - 108, 300, "🔥 " + m.n.toUpperCase().slice(0, 14) + " · " + m.aguante, 0xffd84d, function () {
          self._def.mega = m; self.avisarDef("¡" + m.n.toUpperCase() + " lista!");
        }, 300);
      }
    },
    /* V9 §6 · la zona a la que se tira TU ARQUERO. No la elegís en una grilla:
       la elige él, y tu decisión la inclina — si salió a achicar cubre abajo y
       al medio, si te plantaste queda con margen para lo alto. El nivel del
       arquero decide cuánto acierta. */
    zonaDelArquero() {
      var D = window.PampaDefinicion, st = this.st;
      var arq = st.mios.find(function (x) { return x.pos === "ARQ"; });
      var nivel = ((arq && arq.stats && arq.stats.keeper) || 55) / 100;
      var pref = this._def.plan === "achicar"
        ? ["bajo_centro", "bajo_izq", "bajo_der", "alto_centro"]
        : ["alto_centro", "alto_izq", "alto_der", "bajo_centro"];
      /* cuanto mejor el arquero, más chance de leer LA zona real del rival */
      if (Math.random() < 0.25 + nivel * 0.4) return this._def.zonaCPU;
      return pref[Math.floor(Math.random() * pref.length)];
    },
    /* elegida la decisión, el remate se resuelve solo (sin grilla ni aguja) */
    defResolverDefensa() {
      if (!this._def || this._def.fase >= 3) return;
      this._def.fase = 3;
      this._def.zonaCPU = window.PampaDefinicion.eleccionCPU();   // el rival elige a ciegas
      this.defVueloDef();
    },
    avisarDef(txt) {
      if (this._def && this._def.aviso && this._def.aviso.active) this._def.aviso.destroy();
      var t = this.add.text(W / 2, H * 0.16, txt, { fontFamily: window.PF.texto, fontSize: "12px", color: "#f6efdc", backgroundColor: "#0a1f13dd", padding: { x: 8, y: 4 } }).setOrigin(0.5);
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
        var selfB = this;
        this.time.delayedCall(this.msV(700), function () { selfB.defResolverDefensa(); });
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
    /* compatibilidad: si algo todavía llama a defCargaLista, resuelve como la
       decisión nueva (V9 §6) en vez de abrir una grilla que ya no existe */
    defCargaLista() { this.defResolverDefensa(); },
    /* ============ V9 §5+§6 · TRES DECISIONES, NO UNA GRILLA ============
       Había seis rectángulos sobre el arco y, encima, tocar uno frenaba la
       aguja: la decisión táctica pagaba un impuesto de reflejo invisible.
       Quedan las tres que un jugador piensa de verdad —al palo, al medio, al
       ángulo—, las MISMAS del súper tiro del jugadón. La zona interna sigue
       siendo la de logic/definicion.js (gy manda adónde vuela la pelota), así
       que la lógica y sus tests no se tocan. */
    defZonas(ofensiva) {
      var self = this, st = this.st, D = window.PampaDefinicion;
      this._def.zonaRects = [];
      var j = st.mios[st.ctrl];
      var lado = (j && j.y > st.H / 2) ? "izq" : "der";     // cruzado al palo lejano
      var OPC = [
        { t: "🎯 AL PALO", sub: "el más seguro", zona: "bajo_" + lado },
        { t: "💥 AL MEDIO", sub: "a reventarla", zona: "bajo_centro" },
        { t: "⚡ AL ÁNGULO", sub: "donde no llega nadie", zona: "alto_" + lado }
      ];
      var w = 250;
      OPC.forEach(function (o, i) {
        var r = self.defBoton(W / 2 + (i - 1) * (w + 14), o.t, o.sub, 0xffd84d, function () {
          self.defConfirmarZona(o.zona);
        }, w);
        self._def.zonaRects.push(r);
      });
      var ayuda = this.add.text(W / 2, H - 86, "¿DÓNDE la ponés? — el arquero ya eligió su palo, a ciegas",
        { fontFamily: window.PF.texto, fontSize: "12px", color: "#ffd84d", backgroundColor: "#0a1f13dd", padding: { x: 8, y: 4 } }).setOrigin(0.5);
      this.cineContent.add(ayuda);
      this._def.botones.push(ayuda);
      /* elección secreta del otro lado, decidida YA (una sola vez) */
      this._def.zonaCPU = D.eleccionCPU();
    },
    defConfirmarZona(id) {
      if (!this._def || this._def.fase !== 2 || this._def.zonaMia) return;
      this._def.zonaMia = id;
      /* V9 §4: la "ejecución" ya no la mide una aguja — sale del que patea:
         su stat de tiro y lo que le queda de aguante. Elegir es elegir. */
      var jr = this.st.mios[this.st.ctrl];
      var pun = ((jr.stats && jr.stats.tiro) || 55) / 100 * 0.6 + (jr.aguante / this.BAL.aguante.max) * 0.4;
      this._def.aguja.p = 0.5 + (0.5 - pun) * 0.5;
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
      /* G1: la Definición es el mano a mano, así que NO lleva distancia (el
         factor sería 1 igual). Lleva balance.tiro para que acá también el
         arquero pueda mandarla al córner en vez de agarrarla siempre. */
      else res = Duel.resolveShot({ shotPower: poder, keeperSkill: keeper, zone: { bonus: 0, fuera: dz >= 2 ? 0.04 : 0.08, gy: D.zona(this._def.zonaMia).gy }, cfg: { spread: this.BAL.duelo.spread, min: this.BAL.duelo.min, max: this.BAL.duelo.max },
        tiro: this.BAL.tiro });
      var gol = res.outcome === "gol";
      if (bloqueado) P.tiroFallado(st);
      else if (gol) this.golPropio();
      else if (res.outcome === "corner") P.cornerMio(st);
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
      /* V9 §6: TU "zona" ya no se toca en una grilla: la elige tu arquero según
         su nivel y tu decisión (achicar tapa abajo y al medio; aguantar deja
         margen de reacción arriba). La adivinanza sigue existiendo — la resuelve
         el arquero, que para eso está. */
      if (!this._def.zonaMia) this._def.zonaMia = this.zonaDelArquero();
      var dz = D.distZonas(this._def.zonaMia, this._def.zonaTiro);
      /* y el "timing" sale del arquero, no de una aguja: reflejos + cansancio */
      var arqM = st.mios.find(function (x) { return x.pos === "ARQ"; });
      var nivelArq = ((arqM && arqM.stats && arqM.stats.keeper) || 55) / 100;
      var fatiga = st.mios[st.ctrl].aguante / this.BAL.aguante.max;
      var off = (0.5 - (nivelArq * 0.6 + fatiga * 0.4)) * 0.5;
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
      /* ARTE 2: el INTERPONERSE plantado usa pose_bloqueo; la barrida, su pose */
      var poseId = o.ofensiva
        ? (o.bloqueado ? "bloqueo" : o.poseTiro)
        : (o.bloqueado ? (this._def.plantado ? "bloqueo" : "barrida") : "remate");
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
      /* V7 §0.2: EL QUE PATEA con su pose ilustrada (remate/chilena/cabezazo
         según el tiro elegido) — el momento más importante lleva el arte */
      /* V9 B2: acá se dibujaba SEGUNDA VEZ la misma pose del mismo jugador
         (sprPat, alto 240, encima del spr de alto 400): por eso el playtest veía
         dos veces al mismo. El sprite de arriba ya es el que patea. */
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
        /* ARTE 2: el que se PLANTÓ (interponerse/súper defensa) usa pose_bloqueo;
           el que se tiró, la barrida */
        var plantado = this._def && (this._def.plantado || this._def.superDef);
        titulo = o.ofensiva ? "¡BLOQUEADO!" : "¡LA SACÓ TU DEFENSA!";
        sub = o.ofensiva ? "se plantó con todo y la desvió" : (plantado ? "el bloqueo que salva el día" : "la barrida que salva el día");
        color = o.ofensiva ? 0xe3503e : 0x7ee08a;
        poseId = o.ofensiva ? "bloqueo" : (plantado ? "bloqueo" : "barrida");
      } else if (o.ofensiva) {
        /* G1: el no-gol son TRES desenlaces distintos, no dos */
        var corner = o.res.outcome === "corner", agarro = o.res.outcome === "atajada";
        titulo = o.gol ? "¡GOOOL!" : corner ? "¡LA SACÓ AL CÓRNER!" : agarro ? "¡LA AGARRÓ!" : "¡AFUERA!";
        sub = o.gol ? (o.dz >= 2 ? "el arquero fue al otro palo · ¡GRITALO!" : "la clavaste igual")
          : corner ? "no la pudo retener · la jugada sigue siendo tuya"
            : agarro ? (o.dz === 0 ? "te adivinó la zona y se la quedó" : "voló, llegó y la abrazó")
              : "se fue por centímetros";
        color = o.gol ? 0xffd84d : corner ? 0x7ee08a : agarro ? 0x5bb8e8 : 0xe3503e;
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
      /* V7 §0.1: la pelota ilustrada fue recortada del PNG — la del JUEGO se
         dibuja donde el manifest dice que iba (abrazada por el arquero) */
      var pmD = this.game.registry.get("poses");
      var defD = pmD && pmD.poses && pmD.poses[poseId];
      if (defD && defD.pelota && this.textures.exists("ball") && spr.displayWidth) {
        var ballH = this.textures.get("ball").getSourceImage().height || 16;
        var escB = Math.max(1.6, (defD.pelota.r * 2 * spr.displayHeight) / ballH);
        var bb = this.add.sprite(
          spr.x + (defD.pelota.x - 0.5) * spr.displayWidth * (spr.flipX ? -1 : 1),
          spr.y + (defD.pelota.y - 0.5) * spr.displayHeight, "ball").setScale(escB).setAlpha(0);
        this.cineContent.add(bb);
        this.tweens.add({ targets: bb, alpha: 1, duration: 120 });
      }
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
      this.mundoLayer.setVisible(!this._split); this.hudLayer.setVisible(true);
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
            /* V7 §0.1: la silueta se REVELA al entrar al cruce */
            if (dd < 170 && df.spr.clearTint && df.spr.isTinted) df.spr.clearTint();
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
          /* V9 §4+§6: la BARRA DE CARGA del rival murió. Era el único reloj de
             presión de la escena y empujaba a spamear botones antes de que
             llegara al 100%. Ahora el remate sale cuando VOS decidís: queda
             solo la línea de tiro punteada, para saber dónde meterse. */
          /* V9 §6: no hay barra, pero el rival TAMPOCO espera para siempre —
             si te quedás mirando, patea y la jugada se resuelve sola */
          if (!d.decidido) {
            d.espera += delta;
            if (d.espera >= d.esperaMax) {
              d.decidido = true;
              (d.botones || []).forEach(function (b) { if (b.active) b.destroy(); });
              d.botones = [];
              this.avisarDef('¡Te quedaste mirando! El rival define');
              this.defResolverDefensa();
              return;
            }
          }
          var g = d.cargaG; g.clear();
          g.lineStyle(2, 0xffffff, 0.35);
          for (var yy = H * 0.72; yy > 170; yy -= 24) { g.beginPath(); g.moveTo(W * 0.5, yy); g.lineTo(W * 0.5, yy - 12); g.strokePath(); }
        }
      }

    }
  });
})();
