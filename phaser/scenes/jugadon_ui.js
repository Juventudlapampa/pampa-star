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
      /* D1 · ESTABA EN y=66 Y y=118, o sea ARRIBA DE TODO, mientras el menú en
         cruz de la misma pantalla vive en 352/405/458. En el mismo cuadro había
         opciones arriba y abajo: era el caso más flagrante de O1, y el guardián
         no lo veía porque busca coordenadas literales y acá la Y salía de una
         cuenta.
         Ahora las fichas son una FILA al pie de la franja de decisión, debajo
         de la opción S del menú (458 + 25 de alto = 483). Dos fichas entran
         lado a lado; nunca hubo más de dos. */
      var P = window.PampaPiel, cfg = (this.game.registry.get("balance") || {}).piel;
      var F = P ? P.franja(cfg) : { y1: 528 };
      var y = Math.round(F.y1 - 24);
      var col = (fila || 0);
      var ancho = 228, x = 480 + (col === 0 ? -(ancho / 2 + 6) : (ancho / 2 + 6));
      var b = this.add.rectangle(x, y, ancho, 44, 0xffd84d, 0.97).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
      var t = this.add.text(x, y - 8, texto, { fontFamily: window.PF.display, fontSize: "10px", color: "#0a1f13", align: "center", wordWrap: { width: ancho - 16 } }).setOrigin(0.5);
      var s = this.add.text(x, y + 10, sub, { fontFamily: window.PF.texto, fontSize: "12px", color: "#365a41", align: "center", wordWrap: { width: ancho - 16 } }).setOrigin(0.5);
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
      /* C2 · EL PRINCIPAL DEL JUGADÓN. La pantalla entera existe para leerle la
         intención al rival, así que eso es lo que se mira primero. Antes eran
         15 px y competía con el nombre del rival (13) y los botones (12): tres
         cosas del mismo peso y ninguna dominando. */
      var t = this.add.text(x, y, texto, { fontFamily: window.PF.texto, fontSize: window.PampaPiel.nivel(1), fontStyle: "bold", color: "#0a1f13", backgroundColor: "#ffd84d", padding: { x: 10, y: 5 } }).setOrigin(0.5, 1);
      this.cineContent.add(t);
      this.tweens.add({ targets: t, scale: 1.08, duration: 300, yoyo: true, repeat: -1 });
      return t;
    },

    /* ============ C2 · LA CORRIDA VERTICAL (el entorno épico) ============
       El minijuego dejó de ser una cancha acostada: ahora es LA VISTA EN
       PROFUNDIDAD —la misma del cine— con el arco al fondo. Venís corriendo
       hacia el arco, los rivales crecen desde el fondo saliéndote al cruce,
       los esquivás moviéndote a los lados, y si llegás, REMATÁS. Gambeta y
       remate en un solo entorno: si te sale, sos el crack; si no, te la sacan.

       La profundidad la calcula logic/perspectiva.js (la misma pura de
       siempre): d en [0,1], 0 = cerca de la cámara (abajo, grande), 1 = el
       arco al fondo (arriba, chico). lx en [-1,1] es el corrimiento lateral. */
    entrarJugadonGambeta(rivalIdx, opts) {
      var st = this.st, J = window.PampaJugadon, self = this;
      var yo = st.mios[st.ctrl];
      opts = opts || {};
      var cuantos = opts.marcadores || 2;
      var defs = [];
      if (rivalIdx != null && st.rivales[rivalIdx]) defs.push(st.rivales[rivalIdx]);
      st.rivales.forEach(function (r, i) {
        if (defs.length >= cuantos || i === rivalIdx || r.pos === "ARQ") return;
        if (Math.hypot(r.x - yo.x, r.y - yo.y) < 260) defs.push(r);
      });
      while (defs.length < cuantos) defs.push({ nombre: "RIVAL", stats: { quite: 55 } });
      this._jgLogica = J.crearGambeta({
        semilla: (st.golesMio + 1) * 7919 + Math.floor(st.minuto * 100) + st.ctrl,
        marcadores: defs.length,
        atacante: { gambeta: (yo.stats && yo.stats.gambeta) || 55 },
        defensores: defs.map(function (d) { return { quite: (d.stats && d.stats.quite) || 55, nombre: d.nombre }; })
      });
      this._jgMega = opts.mega || null;
      this.jugadonAbrir(opts.mega
        ? "🔥 " + String(opts.mega.n || "MEGATIRO").toUpperCase() + " · encará y definí"
        : "🌟 GAMBETA-TIRO · encará, esquivalos y definí");

      var B = this.BAL.jugadon || {};
      var C = this.BAL.cine || {};
      var vp = { x: W / 2, y: H * 0.22 }, nearY = H * 0.95;
      this._jgMini = {
        vertical: true, d: 0, lx: 0, vp: vp, nearY: nearY,
        k: (C.persp && C.persp.k) || 3,
        velD: B.vel_avance != null ? B.vel_avance : 0.34,
        velLx: B.vel_lateral != null ? B.vel_lateral : 1.5,
        meta: B.meta_d != null ? B.meta_d : 0.92,
        rivales: [], duelo: null, terminado: false, t: 0, target: null
      };
      /* el fondo: la cancha en fuga con el arco arriba (la del cine) */
      this.dibujarCanchaProfunda(vp, nearY);

      var kYo = this.poseHeroeTenida ? (this.poseHeroeTenida(yo) || this.poseKey("corriendo")) : this.poseKey("corriendo");
      var sy = kYo ? this.add.image(W / 2, nearY, kYo) : this.add.rectangle(W / 2, nearY, 40, 90, 0x4fc3f7);
      sy._altoBase = sy.height || 90;
      this.cineContent.add(sy);
      this._jgMini.spr = sy;
      var bola = this.add.sprite(W / 2, nearY, "ball").setScale(2.2);
      this.cineContent.add(bola);
      this._jgMini.bola = bola;

      /* P7 · LA SECUENCIA DE OBSTÁCULOS. Antes los rivales eran todos el mismo
         objeto y la única respuesta era esquivar de costado. Ahora cada uno
         trae su TIPO —te cierra un lado, se tira al piso, se planta, vienen dos,
         o directamente es un pozo del potrero— y cada tipo pide un gesto
         distinto. La secuencia sale de logic/jugadon.js: determinista por
         semilla y sin dos iguales seguidos. */
      var statG = (yo.stats && yo.stats.gambeta) || 55;
      var CFGO = (this.BAL.jugadon && this.BAL.jugadon.obstaculos) || {};
      this._jgMini.cfgObs = CFGO;
      this._jgMini.obstaculos = J.secuenciaObstaculos(
        this._jgLogica.defensores.length, statG,
        (st.golesMio + 1) * 7919 + Math.floor(st.minuto * 100) + st.ctrl + 13, CFGO);
      /* P1 · lo que la corrida ARRASTRA de un obstaculo al siguiente. Sin esto
         los tres obstaculos son tres preguntas sueltas; con esto son una
         jugada. lateral se cobra al final, en el angulo del remate. */
      this._jgMini.ctx = { arrastre: null, lateral: 0 };
      this._jgMini.statG = statG;
      this._jgMini.gestos = J.gestosDe(statG);
      var OBS = this._jgMini.obstaculos;
      /* los rivales te esperan escalonados hacia el arco */
      var kR = this.poseRivalNaranja ? (this.poseRivalNaranja("bloqueo") || this.poseKey("bloqueo")) : this.poseKey("bloqueo");
      this._jgLogica.defensores.forEach(function (d, i) {
        var obs = OBS[i] || OBS[0];
        var sr = kR ? self.add.image(0, 0, kR) : self.add.rectangle(0, 0, 40, 90, 0xff8a50);
        sr._altoBase = sr.height || 90;
        self.cineContent.add(sr);
        var nom = self.add.text(0, 0, "▲ " + String(d.nombre || "RIVAL").toUpperCase().slice(0, 10), { fontFamily: window.PF.texto, fontSize: window.PampaPiel.nivel(4), color: "#0a1f13", backgroundColor: "#FF8A50", padding: { x: 5, y: 2 } }).setOrigin(0.5);
        self.cineContent.add(nom);
        /* P7 · el POZO no es un rival: no lleva figura ni nombre de jugador.
           Es la cancha jugando, y se tiene que ver distinto o no se entiende. */
        if (obs && obs.pose === null) {
          sr.setVisible(false);
          nom.setText("▬ " + obs.n);
        } else {
          nom.setText("▲ " + String(d.nombre || "RIVAL").toUpperCase().slice(0, 10));
        }
        self._jgMini.rivales.push({
          spr: sr, nom: nom, idx: i, vivo: true, obs: obs,
          d: 0.34 + i * 0.26,
          lx: i % 2 === 0 ? -0.35 : 0.4,
          vel: (B.vel_rival_lat != null ? B.vel_rival_lat : 0.5) + i * 0.1
        });
      });

      /* controles: DEDO (arrastre lateral) y FLECHAS — el avance es solo */
      var zona = this.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 0.001).setInteractive();
      this.cineContent.add(zona);
      zona.on("pointerdown", function (pp) { self._jgMini.target = pp.x; });
      zona.on("pointermove", function (pp) { if (pp.isDown && self._jgMini) self._jgMini.target = pp.x; });
      this._jgMini.cursores = this.input.keyboard ? this.input.keyboard.createCursorKeys() : null;
      var ayuda = this.add.text(W / 2, H - 20, "esquivá con el DEDO o con las FLECHAS · avanzás solo hacia el arco", { fontFamily: window.PF.texto, fontSize: "14px", color: "#f6efdc" }).setOrigin(0.5).setAlpha(0.9);
      this.cineContent.add(ayuda);
      /* M2 · "urgente" no existía ni en el synth ni en el mapa: no sonaba nada */
      this.pedirMusica("jugadon");
      this.pintarCorridaVertical(0);
    },

    /* dibuja el cuadro: cada figura en su profundidad, con su escala */
    pintarCorridaVertical(delta) {
      var m = this._jgMini, P = window.PampaPersp;
      if (!m || !m.vertical || !m.spr || !m.spr.active) return;
      var cfg = { k: m.k, vpX: m.vp.x, vpY: m.vp.y, nearY: m.nearY };
      var anchoEn = function (s) { return 60 + 300 * s.escala; };
      var yo = P.aPantalla(m.d, cfg);
      var xYo = yo.x + m.lx * anchoEn(yo);
      m.spr.setPosition(xYo, yo.y);
      m.spr.setScale((150 * yo.escala) / m.spr._altoBase);
      if (m.spr.setDepth) m.spr.setDepth(20);
      if (m.bola && m.bola.active) {
        m.bola.setPosition(xYo + 26 * yo.escala, yo.y + 42 * yo.escala);
        m.bola.setScale(2.4 * yo.escala);
        m.bola.rotation += 0.12;
        m.bola.setDepth(21);
      }
      m.rivales.forEach(function (r) {
        if (!r.spr || !r.spr.active) return;
        var s = P.aPantalla(r.d, cfg);
        var x = s.x + r.lx * anchoEn(s);
        r.spr.setPosition(x, s.y);
        r.spr.setScale((150 * s.escala) / r.spr._altoBase);
        if (r.spr.setDepth) r.spr.setDepth(Math.round((1 - r.d) * 10));
        if (r.nom && r.nom.active) {
          r.nom.setPosition(x, s.y - 78 * s.escala);
          r.nom.setScale(Math.max(0.6, s.escala));
          r.nom.setVisible(r.vivo);
        }
      });
    },

    /* el latido del minijuego (lo llama el update: el partido está quieto) */
    updateJugadonMini(delta) {
      var m = this._jgMini, self = this;
      if (!m || m.terminado || m.duelo || !m.spr || !m.spr.active || !m.vertical) return;
      var dt = Math.min(0.05, delta / 1000);
      m.t += delta;
      var vx = 0;
      if (m.cursores) {
        if (m.cursores.left.isDown) vx -= 1;
        if (m.cursores.right.isDown) vx += 1;
        if (vx) m.target = null;
      }
      if (!vx && m.target != null) {
        var dxT = (m.target - W / 2) / (W / 2) - m.lx;
        if (Math.abs(dxT) > 0.03) vx = dxT > 0 ? 1 : -1; else m.target = null;
      }
      m.lx = Math.max(-1, Math.min(1, m.lx + vx * m.velLx * dt));
      /* la corrida no se frena: siempre vas hacia el arco */
      m.d = Math.min(1, m.d + m.velD * dt);
      var B = this.BAL.jugadon || {};
      m.rivales.forEach(function (r) {
        if (!r.vivo) return;
        var dif = m.lx - r.lx;
        r.lx += Math.max(-1, Math.min(1, dif)) * r.vel * dt;
        var cerca = Math.abs(m.d - r.d) < (B.contacto_d != null ? B.contacto_d : 0.055);
        var encima = Math.abs(m.lx - r.lx) < (B.contacto_lx != null ? B.contacto_lx : 0.3);
        if (cerca && encima) self.jugadonDuelo(r);
      });
      this.pintarCorridaVertical(delta);
      if (!m.duelo && !m.terminado && m.d >= m.meta) this.jugadonRemate();
    },

    jugadonDuelo(r) {
      var self = this, g = this._jgLogica, m = this._jgMini;
      if (!m || m.duelo || m.terminado) return;
      m.duelo = r;
      /* el aviso del obstaculo ANTERIOR ("¡LO DEJASTE PAGANDO!") se quedaba en
         pantalla encima del siguiente: se ve en la captura de la primera
         vuelta. Al abrir un duelo nuevo, lo viejo se va. */
      if (this._jgAviso && this._jgAviso.destroy) { this._jgAviso.destroy(); this._jgAviso = null; }
      var d = g.defensores[Math.min(r.idx, g.defensores.length - 1)];
      /* P7 · SE ANUNCIA EL OBSTÁCULO, no el cierre genérico. Lo que aparece es
         qué se te viene encima, y los botones son los GESTOS que sabés hacer.
         Sin el anuncio esto sería adivinar; con el anuncio es leer y reaccionar. */
      var obs = r.obs || null;
      var J2 = window.PampaJugadon, CFGO = m.cfgObs || {};
      var clase = obs ? (obs.clase || "gesto") : "gesto";

      /* ══════════════════════════════════════════════════════════════════
         P1 · LO QUE SE MUESTRA DEPENDE DE LA CLASE.

         Antes se anunciaba el obstaculo y se ofrecian los gestos, siempre
         igual. Ahora cada clase se presenta distinto, porque si el jugador no
         ve QUE CLASE DE PREGUNTA le estan haciendo, la variedad no existe
         aunque este implementada. Arriba de todo va lo que pide la clase
         (CLASES[x].n), que es la unica manera de que se entienda sin tutorial.
         ══════════════════════════════════════════════════════════════════ */
      var dec = obs ? J2.declaracionDe(obs, CFGO, null, m.statG) : null;
      r.dec = dec;
      var titulo = obs ? obs.n : d.cierre.n;
      this._jg.sprites.push(this.jugadonGlobo(r.spr.x || W / 2, (r.spr.y || H / 2) - 84, titulo));

      /* la etiqueta de CLASE: que te estan pidiendo */
      var cl = J2.CLASES && J2.CLASES[clase];
      if (cl) {
        var tc = this.add.text(W / 2, 34, "· " + cl.n.toUpperCase() + " ·", {
          fontFamily: window.PF.texto, fontSize: "13px", color: "#ffd84d",
          backgroundColor: "#0a1f13cc", padding: { x: 8, y: 3 }
        }).setOrigin(0.5);
        this.cineContent.add(tc); this._jg.sprites.push(tc);
      }

      /* LA DECLARACION del que te lee, y EL CANTITO si se lo viste */
      if (dec && dec.declarado) {
        var td = this.add.text(W / 2, 66, "amaga para " + (dec.declarado === "izq" ? "SU IZQUIERDA ◀" : "▶ SU DERECHA"), {
          fontFamily: window.PF.texto, fontSize: "14px", fontStyle: "bold", color: "#f6efdc",
          backgroundColor: "#2a0b0bcc", padding: { x: 8, y: 3 }
        }).setOrigin(0.5);
        this.cineContent.add(td); this._jg.sprites.push(td);
        if (dec.pista) {
          /* el cantito: se ve porque tenes gambeta. Lleva FORMA (el ojo) ademas
             de color, que es la regla del proyecto. */
          var tp = this.add.text(W / 2, 94, "👁 LE VISTE EL AMAGUE: va para el otro lado", {
            fontFamily: window.PF.texto, fontSize: "14px", fontStyle: "bold", color: "#0a1f13",
            backgroundColor: "#7ee08a", padding: { x: 8, y: 3 }
          }).setOrigin(0.5);
          this.cineContent.add(tp); this._jg.sprites.push(tp);
          this.SFX && this.SFX.temaCampo && this.SFX.temaCampo("rival");
        }
      }

      this.SFX && this.SFX.whoosh && this.SFX.whoosh(220);
      var ops = obs ? J2.opcionesDeObstaculo(obs, m.statG)
                    : ((m.gestos && m.gestos.length) ? m.gestos : g.opciones);
      var wpx = Math.min(200, (W - 40) / ops.length - 10);
      ops.forEach(function (mv, i) {
        var x = W / 2 + (i - (ops.length - 1) / 2) * (wpx + 10);
        var b = self.jugadonBoton(x, H - 60, wpx, mv.n, 0xf6efdc, function () { self.jugadonMovida(mv.id, r); });
        /* el subtitulo de las clases que tienen dos salidas: sin el, "POR
           AFUERA" y "POR EL MEDIO" no dicen que te cuesta cada una */
        if (mv.sub) {
          /* ARRIBA del botón, no abajo: medido en vivo, abajo caía en y=512 y
             el renglón de ayuda de la corrida vive en y=520 — se pisaban y el
             subtítulo no se leía. Y sin el subtítulo, "POR AFUERA" no dice qué
             te cuesta, que es toda la gracia de la clase. */
          var ts = self.add.text(x, H - 104, mv.sub, {
            fontFamily: window.PF.texto, fontSize: "12px", color: "#dcd6c2",
            align: "center", wordWrap: { width: wpx + 8 }
          }).setOrigin(0.5);
          self.cineContent.add(ts); self._jg.sprites.push(ts);
        }
      });

      /* ══════════════════════════════════════════════════════════════════
         P1 · EL RELOJ. La unica clase con tiempo, y por eso la unica que sale
         como mucho una vez por corrida y solo al final (ver la advertencia en
         logic/jugadon.js). Si se acaba, NO elige el juego por vos al azar: te
         cierra el lado y perdes, que es la consecuencia de no decidir.
         Con balance.jugadon.obstaculos.reloj_ms en 0 no existe. */
      if (clase === "reloj") {
        var ms = CFGO.reloj_ms != null ? CFGO.reloj_ms : 1200;
        if (ms > 0) {
          var barra = this.add.rectangle(W / 2, H - 96, 320, 12, 0xe3503e, 1).setOrigin(0.5);
          this.cineContent.add(barra); this._jg.sprites.push(barra);
          this.tweens.add({ targets: barra, scaleX: 0, duration: this.msV(ms), ease: "Linear" });
          r._relojTimer = this.time.delayedCall(this.msV(ms), function () {
            if (m.terminado || !m.duelo) return;
            self.jugadonMovida(null, r);
          });
        }
      }
    },

    jugadonMovida(movidaId, r) {
      var st = this.st, J = window.PampaJugadon, self = this, m = this._jgMini;
      /* P7 · con obstáculo tipado, la LECTURA manda y no hay azar: el gesto
         correcto pasa siempre y el equivocado nunca. El azar sigue viviendo en
         el duelo cara a cara de cruceGambeta, que es otro momento del juego.
         Sin obstáculo (corridas viejas) cae al camino de antes. */
      /* P1 · TODO pasa por resolverObstaculo, que es la puerta unica de las
         cinco clases. Antes esto llamaba a pasaObstaculo, que solo sabe de la
         clase gesto: con las clases nuevas habria devuelto false siempre y el
         pasillo se habria vuelto imposible sin un solo error visible. */
      var res;
      if (r && r._relojTimer) { r._relojTimer.remove(false); r._relojTimer = null; }
      if (r && r.obs) {
        var ctx = Object.assign({}, (m && m.ctx) || {}, r.dec || {});
        var ro = J.resolverObstaculo(r.obs, movidaId, ctx, (m && m.cfgObs) || {});
        res = { gana: ro.pasa, obstaculo: r.obs, motivo: ro.motivo, clase: ro.clase };
        /* lo que la corrida se lleva al obstaculo siguiente */
        if (m) m.ctx = { arrastre: ro.arrastre, lateral: ro.lateral };
        if (ro.costo) {
          var jy = st.mios[st.ctrl];
          if (jy) jy.aguante = Math.max(0, jy.aguante - ro.costo);
        }
        if (ro.pasa) this._jgLogica.paso = Math.min(this._jgLogica.paso + 1, this._jgLogica.defensores.length);
        else { this._jgLogica.terminado = true; this._jgLogica.exito = false; }
      } else {
        res = J.cruceGambeta(this._jgLogica, movidaId);
      }
      if (!res) return;
      this.jugadonLimpiarBotones();
      (this._jg.sprites || []).forEach(function (o) { if (o && o.destroy) o.destroy(); });
      this._jg.sprites = [];
      this.SFX && this.SFX.whoosh && this.SFX.whoosh(300);
      if (res.gana) {
        /* P1 · el aviso dice QUE paso, no "lo pasaste". Con cinco clases,
           pasar por proteger la pelota y pasar por leerle el amague son dos
           cosas distintas y tienen que leerse distinto. */
        this.avisoJugadon(res.motivo ? "¡" + String(res.motivo).toUpperCase() + "!" : "¡LO PASASTE!", 0x7ee08a);
        if (r) {
          r.vivo = false;
          this.tweens.add({ targets: [r.spr, r.nom], y: "+=170", alpha: 0.25, angle: -60, duration: 420 });
        }
        if (m) m.duelo = null;
        if (m && m.rivales.every(function (x) { return !x.vivo; })) this.time.delayedCall(this.msV(520), function () { self.jugadonRemate(); });
        return;
      }
      if (m) m.terminado = true;
      /* P7 · decir POR QUÉ no pasó: con obstáculos tipados el error es de
         lectura, así que el aviso tiene que nombrar el gesto que hacía falta. */
      this.avisoJugadon(res.motivo
        ? "¡" + String(res.motivo).toUpperCase() + "!"
        : (res.obstaculo ? "¡" + res.obstaculo.n + "!" : "¡TE LO LEYÓ!"), 0xe3503e);
      this.time.delayedCall(this.msV(900), function () {
        self.jugadonCerrar(function () {
          window.PampaPartido.perderPelota(st);
          self.relatar && self.relatar("gambeta_lose");
        });
      });
    },

    /* C2: llegaste al fondo de la corrida → EL REMATE, en el mismo envión.
       Si la jugada era el MEGATIRO, remata con la mega animación (cut-in,
       impacto, viaje, arquero volando); si era la GAMBETA-TIRO, remate normal.
       En los dos casos NO hay pantalla de zonas: la ubicación manda. */
    jugadonRemate() {
      var self = this, m = this._jgMini, st = this.st;
      if (!m || m.terminado) return;
      m.terminado = true;
      this.jugadonLimpiarBotones();
      var mega = this._jgMega;
      this.avisoJugadon(mega ? "¡SE ARMA EL " + String(mega.n || "MEGATIRO").toUpperCase() + "!" : "¡QUEDÓ DE FRENTE AL ARCO!", 0xffd84d);
      /* ══════════════════════════════════════════════════════════════════
         P1 · LA ENVENENADA SE COBRA ACA.

         Salir por afuera te corrio hacia la linea, y eso NO se cobro en el
         obstaculo: se cobra ahora, en el angulo del remate. logic/tiro.js ya
         sabia leerlo (usa centrado), solo faltaba que algo lo moviera.

         Medido: con lateral 0 la calidad del remate es 0,86; con 0,42 baja a
         0,72 y con 0,84 a 0,54. Salir dos veces por afuera te cuesta un tercio
         del remate — que es exactamente lo que la clase promete. */
      var latFinal = (m && m.ctx && m.ctx.lateral) || 0;
      this.time.delayedCall(this.msV(820), function () {
        st.mios[st.ctrl].x = Math.min(st.W - 60, st.W - 130);   // quedaste en el área
        if (latFinal > 0) {
          var haciaAbajo = (st.mios[st.ctrl].y || st.H / 2) >= st.H / 2;
          st.mios[st.ctrl].y = Math.max(24, Math.min(st.H - 24,
            st.H / 2 + (haciaAbajo ? 1 : -1) * latFinal * (st.H * 0.42)));
        }
        self._jgMini = null;
        self._jgMega = null;
        self.jugadonCerrar(function () {
          if (mega && self.dispararConCine) {
            self.cutInEspecial("¡" + String(mega.n).toUpperCase() + "!", mega.sub || "todo lo que le queda", function () {
              self.dispararConCine(mega, self.ejDeLaSituacion(mega));
            });
          } else {
            self.tiroPorComandos(null);
          }
        });
      });
    },
    jugadonPintarDefensores() { /* V8 C: los rivales viven en updateJugadonMini */ },
    jugadonPintarOpciones() { /* V8 C: las movidas aparecen SOLO en el duelo */ },

    avisoJugadon(texto, color) {
      /* uno por vez: el aviso queda guardado para que el duelo siguiente lo
         pueda barrer. Sin esto se apilaban y el de la jugada anterior tapaba
         al nuevo (visto en la captura de P1). */
      if (this._jgAviso && this._jgAviso.destroy) this._jgAviso.destroy();
      var t = this.add.text(W / 2, 250, texto, { fontFamily: window.PF.display, fontSize: "22px", color: "#" + color.toString(16).padStart(6, "0"), stroke: "#0a1f13", strokeThickness: 4, align: "center", wordWrap: { width: 760 } }).setOrigin(0.5).setScale(0.3);
      this.cineContent.add(t);
      this._jgAviso = t;
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
        else if (res.outcome === "atajada") { msj = "¡LA AGARRÓ!"; color = 0x5bb8e8; snd && snd.gloves && snd.gloves(); }
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
