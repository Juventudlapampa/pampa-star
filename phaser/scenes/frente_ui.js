/* ============================================================================
   PAMPA STAR · phaser/scenes/frente_ui.js — EL TIRO DE FRENTE AL ARCO y EL
   TIRO LIBRE (pedido de Rodri del 23/oct). El dibujo y los controles de
   logic/frente.js. Mixin de PampaMatch, como EL TOQUE. Estado "FRENTE": el
   partido de abajo no corre.
   La cámara va detrás de quien patea, un poco a su derecha; el arco al fondo
   y en el medio los que están de verdad en el partido, cada uno con su número.
   Mouse: la mira sigue al puntero, la rueda (o Q y E) cambia la pegada y el
   clic le pega. Dedo (idea de Rodri del 23/oct, balance.frente.gesto): desde
   la pelota, la dirección del arrastre elige el hueco, el largo la fuerza y
   la curva el efecto; al soltar le pega. Teclado: flechas y ENTER o ESPACIO.
   La pegada también con los botones (o 1 a 4). Le pegás cuando la marca de la barra pasa por

   AHORA: eso te perfila, y la pegada sale más justa.
   ========================================================================== */
(function () {
  "use strict";
  var W = 960, H = 540, X_BOT = 838, ANCHO_BOT = 214, X_DEDO = 520;


  Object.assign(window.PampaMatch.prototype, {

    frenteActivo() { return !!(this.FLAGS.tiro_frente && window.PampaFrente); },

    /* TU REMATE o TU TIRO LIBRE. o: { sinIdx (el que ya dejaste atrás en el
       cruce), B (la barrera, en el tiro libre), aviso (el de la falta) } */
    entrarFrente(o) {
      o = o || {};
      var st = this.st, j = st.mios[st.ctrl], C = this.BAL.frente, Fr = window.PampaFrente, self = this;
      var iArq = st.rivales.findIndex(function (r) { return r.pos === "ARQ"; }), arq = st.rivales[iArq];
      var defs = [];
      if (!o.B && !o.penal) st.rivales.forEach(function (r, i) {
        if (r.pos !== "ARQ" && i !== o.sinIdx) defs.push({ ref: i, nombre: r.nombre, numero: r.numero, x: r.x, y: r.y });
      });
      var arqF = o.B ? o.B.arquero : { x: arq.x, y: arq.y, seTira: 0 };
      var foto = Fr.foto({
        tirador: { x: j.x, y: j.y }, arco: { x: st.W, y: st.H / 2 }, am: this.BAL.mundo.arco_medio,
        defensores: defs, barrera: o.B ? o.B.jugadores : null, salta: o.B ? o.B.salta : false,
        arquero: { ref: iArq, nombre: arq.nombre, numero: arq.numero, x: arqF.x, y: arqF.y, seTira: arqF.seTira, nivel: st.rivalKeeperSkill || 50 }
      });
      this.frenteAbrir({
        foto: foto, j: j, esRival: false, libre: !!o.B, penal: !!o.penal, aviso: o.aviso,
        menu: o.B ? C.menu_libre : C.menu_remate,
        alFinal: function (res) { if (o.penal) self.penalRematar(res); else self.frenteRematar(res, !!o.B); }
      });
    },

    /* ══ EL PENAL (decisión que Rodri delegó, 23/oct; logic/penal.js) ══
       TU PENAL: patea quien recibió la falta, desde el punto, contra el
       arquero solo. Los controles son los del remate de frente al arco */
    penalMio(aviso) {
      var st = this.st, PC = this.BAL.penal, j = st.mios[st.ctrl];
      j.x = st.W - PC.punto_px; j.y = st.H / 2; st.pelota.x = j.x; st.pelota.y = j.y;
      var arq = st.rivales.find(function (r) { return r.pos === "ARQ"; });
      if (arq) { arq.x = st.W - 4; arq.y = st.H / 2; }
      this.entrarFrente({ penal: true, aviso: aviso });
    },
    /* EL PENAL DE ELLOS: con tu arquero elegís para dónde tirarte mientras el
       que patea se perfila; su postura es la pista (penal.pateadorCPU) */
    penalRival(tiradorIdx, aviso) {
      var st = this.st, C = this.BAL.frente, PC = this.BAL.penal, Fr = window.PampaFrente, P = window.PampaPartido, self = this;
      var t = st.rivales[tiradorIdx], arco = { x: 0, y: st.H / 2 };
      t.x = PC.punto_px; t.y = st.H / 2; st.pelota.x = t.x; st.pelota.y = t.y;
      var iArq = st.mios.findIndex(function (m) { return m.pos === "ARQ"; }), arqM = st.mios[iArq];
      arqM.x = 4; arqM.y = st.H / 2;
      var foto = Fr.foto({
        tirador: { x: t.x, y: t.y }, arco: arco, am: this.BAL.mundo.arco_medio,
        arquero: { ref: iArq, nombre: arqM.nombre, numero: arqM.numero, x: arqM.x, y: arqM.y, seTira: 0, nivel: P.nivelArqueroDe(arqM.stats) }
      });
      var dec = window.PampaPenal.pateadorCPU((t.stats && t.stats.tiro) || 55, PC, Math.random);
      st.portadorRival = tiradorIdx;
      this.frenteAbrir({
        foto: foto, j: t, esRival: true, libre: false, penal: true, aviso: aviso, cpu: dec, menu: C.menu_remate,
        alFinal: function (res) { self.penalRivalResuelto(res, tiradorIdx); }
      });
    },
    /* lo de tu arquero mientras el otro se perfila: cinco botones (1 a 5),
       las flechas y ENTER, o tocar el arco donde te querés tirar */
    /* EL TELÉFONO LEGIBLE (25/oct): con la letra grande la columna de la
       derecha no entra y la ayuda se salía por abajo. De abajo para arriba,
       cada pieza sube lo justo para no pisar a la de abajo: la ayuda hasta
       536, la barra con su rótulo (AHORA o SE PERFILA) y, si hace falta, lo
       que dice la pegada con los botones. En la PC entra y no se mueve. */
    /* la lectura de arriba (LO TAPA EL 4, ¡bien perfilado!...) va al medio de
       la cancha; en el teléfono, con la letra grande, llegaba al rótulo de
       arriba a la izquierda (· DE FRENTE AL ARCO ·) y se corre lo justo */
    frenteLectura(fr, txt) {
      fr.lectura.setText(txt).setX(W / 2 - 60);
      var bRot = fr.rotulo.getBounds(), bLec = fr.lectura.getBounds();
      if (txt && bLec.x < bRot.right + 8 && bLec.y < bRot.bottom) fr.lectura.x += bRot.right + 8 - bLec.x;
    },
    frenteColumna(fr, rotulo, dichos) {
      var sobra = fr.ayuda.getBounds().bottom - 536;
      if (sobra <= 0) return;
      fr.ayuda.y -= sobra;
      var sube = Math.max(0, fr.barra.y + 18 - (fr.ayuda.getBounds().y - 4));
      fr.barra.y -= sube; rotulo.y -= sube;
      /* lo que dice la pegada cambia al elegir: se mide con el más largo */
      var ahoraDice = fr.dice.text, alto = fr.dice.height;
      dichos.forEach(function (d) { alto = Math.max(alto, fr.dice.setText(d || "").height); });
      fr.dice.setText(ahoraDice);
      var falta = fr.dice.getBounds().y + alto + 4 - rotulo.getBounds().y;
      if (falta <= 0) return;
      fr.dice.y -= falta;
      fr.botones.forEach(function (o) { o.b.y -= falta; o.t.y -= falta; });
    },
    penalArqueroUI(fr, cfg) {
      var self = this, C = this.BAL.frente, PC = this.BAL.penal, Pn = window.PampaPenal;
      var tactil = this.sys.game.device.input.touch;
      fr.penalArq = true; fr.penalDir = null; fr.perfila = this.msV(PC.perfila_ms);
      this.frenteLectura(fr, "¡PENAL PARA EL RIVAL!");
      var lado = cfg.cpu.pista.dir;
      /* la postura: el cuerpo inclinado para el lado de la pista */
      if (fr.tirador && (lado === "izquierda" || lado === "derecha")) fr.tirador.setAngle(lado === "izquierda" ? -7 : 7);
      fr.dedoTxt = this.add.text(X_DEDO, 452, "SE LE VE: " + cfg.cpu.pista.texto, { fontFamily: window.PF.texto, fontSize: "16px", color: "#f6efdc", stroke: "#0a1f13", strokeThickness: 5, align: "center", wordWrap: { width: 380 } }).setOrigin(0.5, 0);
      fr.perfilaTxt = this.add.text(fr.barra.x, fr.barra.y - 6, "SE PERFILA", { fontFamily: window.PF.display, fontSize: "13px", color: "#f6efdc", stroke: "#0a1f13", strokeThickness: 4 }).setOrigin(0, 1);
      [fr.dedoTxt, fr.perfilaTxt].forEach(function (o) { self.cineContent.add(o); });
      var NOMBRES = { izquierda: "◀ IZQUIERDA", medio: "MEDIO", derecha: "DERECHA ▶", arriba: "▲ ARRIBA", abajo: "▼ ABAJO" };
      var elegir = function (d) {
        if (self._fr !== fr || fr.resuelto) return;
        fr.penalDir = d;
        fr.botones.forEach(function (o, i) {
          var sel = o.tid === d;
          o.b.setFillStyle(sel ? 0xffd84d : 0xf6efdc, 0.97).setStrokeStyle(sel ? 5 : 3, 0x0a1f13);
          o.t.setText((tactil ? "" : (i + 1) + "·") + (sel ? "▶ " : "") + o.n);
        });
        if (fr.dice) fr.dice.setText("Te tirás " + self.penalLado(d));
      };
      Pn.DIRS.forEach(function (d, i) {
        var b = self.jugadonBoton(X_BOT, 150 + i * 58, ANCHO_BOT, NOMBRES[d], 0xf6efdc, function () { elegir(d); });
        fr.botones.push({ tid: d, b: b, t: self._jg.botones[self._jg.botones.length - 1], n: NOMBRES[d] });
      });
      fr.dice = this.add.text(X_BOT, 150 + 5 * 58 - 22, "Todavía no elegiste: te quedás parado", { fontFamily: window.PF.texto, fontSize: "14px", color: "#f6efdc", stroke: "#0a1f13", strokeThickness: 4, align: "center", wordWrap: { width: ANCHO_BOT } }).setOrigin(0.5, 0);
      fr.ayuda = this.add.text(X_BOT - ANCHO_BOT / 2, 486, tactil ? "Tocá un lado del arco o un botón antes de que patee"
        : "Flechas o 1 a 5 · ENTER: al medio · clic en el arco", { fontFamily: window.PF.texto, fontSize: "14px", color: "#f6efdc", stroke: "#0a1f13", strokeThickness: 4, wordWrap: { width: ANCHO_BOT } }).setOrigin(0, 0);
      [fr.dice, fr.ayuda].forEach(function (o) { self.cineContent.add(o); });
      this.frenteColumna(fr, fr.perfilaTxt, []);
      var tocar = function (p, sobre) {
        if (self._fr !== fr || fr.resuelto || (sobre && sobre.length)) return;
        var mm = self.frenteMiraDePantalla(fr, p.x, p.y);
        if (Math.abs(mm.u) <= 1.3 && mm.h <= 1.25 && p.y < 440) elegir(Pn.dirDePunto(mm.u, mm.h, PC));
      };
      this.input.on("pointerdown", tocar);
      fr.ev = [["pointerdown", tocar]];
      if (this.input.keyboard) {
        var tecla = function (d) { return function (ev) { if (ev && ev.preventDefault) ev.preventDefault(); elegir(d); }; };
        fr.teclas = [["keydown-LEFT", tecla("izquierda")], ["keydown-RIGHT", tecla("derecha")], ["keydown-UP", tecla("arriba")], ["keydown-DOWN", tecla("abajo")],
          ["keydown-ENTER", tecla("medio")], ["keydown-SPACE", tecla("medio")]];
        ["ONE", "TWO", "THREE", "FOUR", "FIVE"].forEach(function (n, i) { fr.teclas.push(["keydown-" + n, tecla(Pn.DIRS[i])]); });
        fr.teclas.forEach(function (p) { self.input.keyboard.on(p[0], p[1]); });
      }
      this.pedirMusica("jugadon");
      this.time.delayedCall(fr.perfila, function () {
        if (self._fr !== fr) return;
        fr.mira = { u: cfg.cpu.mira.u, h: cfg.cpu.mira.h };
        self.frenteGolpe(cfg.cpu.calidad);
      });
      this.frenteDibujar();
    },
    /* mientras se perfila: adónde te tirás (aro en el arco) y cuánto falta */
    penalDibujar(fr) {
      var g = fr.g, PC = this.BAL.penal;
      g.clear();
      if (fr.penalDir) {
        var P = { izquierda: [-0.7, 0.35], derecha: [0.7, 0.35], medio: [0, 0.35], arriba: [0, 0.8], abajo: [0, 0.08] }[fr.penalDir];
        var pm = this.frentePuntoArco(fr, P[0], P[1]);
        g.lineStyle(7, 0x0a1f13, 0.9); g.strokeCircle(pm.x, pm.y, 20);
        g.lineStyle(4, 0xffd84d, 1); g.strokeCircle(pm.x, pm.y, 20);
        g.fillStyle(0xffd84d, 1); g.fillCircle(pm.x, pm.y, 5);
      }
      var B = fr.barra, bg = fr.barraG, f = Phaser.Math.Clamp(1 - fr.t / fr.perfila, 0, 1);
      bg.setVisible(true).clear();
      bg.fillStyle(0x0a1f13, 0.85); bg.fillRect(B.x - 4, B.y - 4, B.w + 8, 22);
      bg.fillStyle(0xf6efdc, 1); bg.fillRect(B.x, B.y, B.w * f, 14);
    },
    /* el arquero se tira: a un costado estirado, arriba salta, abajo se agacha */
    penalTirada(fr, f, dir, suave) {
      var img = f.img, x = img.x, y = f.y0, ang = 0;
      if (dir === "izquierda" || dir === "derecha") { x = this.frentePuntoArco(fr, dir === "izquierda" ? -0.72 : 0.72, 0).x; ang = dir === "izquierda" ? -55 : 55; y = f.y0 - 0.12 * img.displayHeight; }
      else if (dir === "arriba") y = f.y0 - 0.3 * img.displayHeight;
      else if (dir === "abajo") y = f.y0 + 0.06 * img.displayHeight;
      if (suave) { img.setPosition(x, y).setAngle(ang); return; }
      this.tweens.add({ targets: img, x: x, y: y, angle: ang, duration: this.msV(280), ease: "Sine.easeOut" });
    },
    penalLado(dir) {
      return { izquierda: "a la IZQUIERDA", derecha: "a la DERECHA", medio: "al MEDIO", arriba: "ARRIBA", abajo: "ABAJO" }[dir] || "";
    },
    penalAdonde(zona) {
      var p = zona.split("_");
      return (p[0] === "izq" ? "a la IZQUIERDA" : p[0] === "der" ? "a la DERECHA" : "al MEDIO") + (p[1] === "alto" ? ", arriba" : ", abajo");
    },
    /* TU PENAL, después de la foto: el arquero ya se tiró; el cine de
       siempre muestra el gol, la atajada o el afuera */
    penalRematar(res) {
      var st = this.st, P = window.PampaPartido, C = this.BAL.frente, pn = res.penal;
      P.prepararRemate(st, null, undefined, true);
      this._megaGrito = this.tituloDelGol();
      if (pn.resultado === "gol" || pn.resultado === "atajada") {
        this.zona = res.zona;
        this.res = { outcome: pn.resultado, keeperWins: pn.resultado === "atajada" };
      } else {
        var gy = Math.round(Phaser.Math.Clamp(res.fin.u, -1, 1) * C.zona.gy_max);
        this.zona = { id: pn.resultado === "palo" ? "palo" : "medio_alto", n: pn.resultado === "palo" ? "al palo" : "afuera", bonus: 0, fuera: 1, gy: gy };
        this.res = { outcome: "afuera", keeperWins: false };
      }
      this.entrarCine();
      this.planoViaje();
    },
    /* SU PENAL, después de la foto: afuera o al palo, saque tuyo; al arco,
       el cine de "te rematan" con tu arquero y el porqué */
    penalRivalResuelto(res, tiradorIdx) {
      var st = this.st, C = this.BAL.frente, P = window.PampaPartido, pn = res.penal, self = this;
      if (pn.resultado === "afuera" || pn.resultado === "palo") {
        this.relatar("penal_errado", {});
        this.frenteRivalResuelto({ resultado: pn.resultado }, tiradorIdx);
        return;
      }
      var gol = pn.resultado === "gol";
      var arqM = st.mios.find(function (x) { return x.pos === "ARQ"; });
      P.resolverAtajada(st, "atajar", null, 0, gol);
      var porque = "Penal · te tiraste " + this.penalLado(pn.dir) + " y la pateó " + this.penalAdonde(pn.zona);
      this.res = { outcome: gol ? "gol" : "atajada" };
      this.zona = { id: "rival", gy: Math.round(Phaser.Math.Clamp(res.fin.u, -1, 1) * C.zona.gy_max) };
      this._remRival = {
        arquero: arqM,
        revelar: function () {
          if (gol) {
            self.SFX && self.SFX.net && self.SFX.net();
            self.punch("GOL " + (self.nombreRival ? "DE " + String(self.nombreRival).toUpperCase() : "DEL RIVAL"), porque, 0xe3503e);
            if (self.hinchadaEstalla) self.hinchadaEstalla(-1);
            if (self.efectoGol) self.efectoGol(true);
          } else {
            self.destello(self.uiCam, 60, 255, 255, 255);
            self.SFX && self.SFX.gloves && self.SFX.gloves();
            self.punch("¡ATAJASTE EL PENAL!", porque, 0x5bb8e8);
            if (self.tribunaSaltando) self.tribunaSaltando();
            self.SFX && self.SFX.festejo && self.SFX.festejo(900);
          }
        },
        cerrar: function () {
          self._remRival = null;
          self.salirCine(function () { self.relatar(gol ? "gol_rival" : "arquero_mio"); });
        }
      };
      this.entrarCine();
      this.planoViaje();
    },

    /* EL TIRO LIBRE DE ELLOS: patea el que tenía la pelota, contra tu arco,
       con tu barrera y tu arquero. Lo decide la CPU con lo que ve */
    frenteRival(tiradorIdx, aviso) {
      var st = this.st, C = this.BAL.frente, Fr = window.PampaFrente, P = window.PampaPartido, self = this;
      var t = st.rivales[tiradorIdx], am = this.BAL.mundo.arco_medio, arco = { x: 0, y: st.H / 2 };
      var cand = [];
      st.mios.forEach(function (m, i) { if (m.pos !== "ARQ") cand.push({ ref: i, nombre: m.esVos ? "VOS" : m.nombre, numero: m.numero, x: m.x, y: m.y }); });
      var B = Fr.barrera({ x: t.x, y: t.y }, arco, am, cand, C, Math.random);
      this.frentePararBarrera(B, st.mios);
      var iArq = st.mios.findIndex(function (m) { return m.pos === "ARQ"; }), arqM = st.mios[iArq];
      arqM.x = B.arquero.x; arqM.y = B.arquero.y;
      var foto = Fr.foto({
        tirador: { x: t.x, y: t.y }, arco: arco, am: am, barrera: B.jugadores, salta: B.salta,
        arquero: { ref: iArq, nombre: arqM.nombre, numero: arqM.numero, x: B.arquero.x, y: B.arquero.y, seTira: B.arquero.seTira, nivel: P.nivelArqueroDe(arqM.stats) }
      });
      var dec = Fr.elegirCPU(foto, C, Math.random, (t.stats && t.stats.tiro) || 55);
      st.portadorRival = tiradorIdx;
      this.frenteAbrir({
        foto: foto, j: t, esRival: true, libre: true, aviso: aviso, cpu: dec, menu: C.menu_libre,
        alFinal: function (res) { self.frenteRivalResuelto(res, tiradorIdx); }
      });
    },

    /* los de la barrera se paran donde dice logic/frente.barrera (en el
       estado del partido: después del tiro siguen ahí) */
    frentePararBarrera(B, lista) {
      B.jugadores.forEach(function (b) { var q = lista[b.ref]; if (q) { q.x = b.x; q.y = b.y; } });
    },

    frenteAbrir(cfg) {
      var C = this.BAL.frente, K = C.camara, self = this, Fr = window.PampaFrente;
      /* revisión final del 23/oct: el rótulo de abajo a la izquierda, blanco y
         chico, caía sobre la pierna de quien patea. Va arriba, con fondo */
      this.jugadonAbrir("");
      /* 25/oct, el error de frenteDibujar sin su gráfico: el estado FRENTE se
         ponía acá y fr.g nace más abajo, después de las figuras. Si algo tiraba
         en el medio, cada cuadro llamaba a frenteDibujar sin fr.g y ese error
         tapaba al primero. El estado se pone recién con el frente armado (en
         las tres salidas de abajo); mientras tanto queda en JUGADON, que no
         dibuja nada */
      if (window.PampaTribunaUI) window.PampaTribunaUI.callar(this);
      this.cineBG.clear();
      var m = cfg.foto.m, D = m.dist;
      var ancho = K.ancho_cerca + (K.ancho_lejos - K.ancho_cerca) * Phaser.Math.Clamp((D - K.d_cerca) / (K.d_lejos - K.d_cerca), 0, 1);
      var fr = this._fr = Object.assign({}, cfg, {
        k: ancho * (D + K.atras) / (2 * m.am), hg: 2 * m.am / 3,
        mira: { u: 0, h: 0.35 }, tipo: cfg.menu[0], t: 0, ev: [], teclas: [], botones: [], figs: [], resuelto: false
      });
      if (cfg.cpu) fr.tipo = cfg.cpu.tipo;
      /* revisión final del 23/oct: en el tiro libre la barrera de cinco tapaba
         entero al arquero. La cámara sube (alto_cam_libre) y se ve por arriba */
      if (cfg.libre && K.alto_cam_libre != null) { fr.altoCam = K.alto_cam_libre; fr.hz = K.horizonte_libre; }

      /* los de adelante, de lejos a cerca: el más cercano queda encima */
      var gente = fr.foto.defensores.map(function (d) { return { d: d, arq: false }; });
      gente.push({ d: Object.assign({ d: Fr.local(m, fr.foto.arquero).d, u: Fr.local(m, fr.foto.arquero).u }, fr.foto.arquero), arq: true });
      gente.sort(function (a, b) { return b.d.d - a.d.d; });
      /* y en el teléfono la columna de pegadas tapaba al defensor más cercano
         y el de la otra punta quedaba cortado: el arco va al medio de lo que
         queda libre y, si alguien no entra, la toma se abre (hasta min_zoom) */
      var E = K.encuadre;
      if (E) {
        fr.lim = { izq: E.margen, der: (cfg.cpu && !cfg.penal ? W : X_BOT - ANCHO_BOT / 2) - E.margen };
        fr.cx = (fr.lim.izq + fr.lim.der) / 2;
        var maxD = 0, maxI = 0;
        gente.forEach(function (g) {
          var r = (g.d.u - K.al_costado) * fr.k / Math.max(8, g.d.d + K.atras);
          if (r > maxD) maxD = r; if (-r > maxI) maxI = -r;
        });
        var mitad = (fr.lim.der - fr.lim.izq) / 2 - E.pad;
        fr.k *= Math.max(E.min_zoom, Math.min(1, maxD ? mitad / maxD : 1, maxI ? mitad / maxI : 1));
      }
      this.frenteFondo(fr);
      fr.rotulo = this.add.text(18, 22, cfg.penal ? "· PENAL ·" : cfg.libre ? "· TIRO LIBRE ·" : "· DE FRENTE AL ARCO ·", { fontFamily: window.PF.texto, fontSize: "13px", color: "#f6efdc", backgroundColor: "#0a1f13cc", padding: { x: 6, y: 3 } });
      this.cineContent.add(fr.rotulo);
      var rivalDeEllos = !cfg.esRival, lista = cfg.esRival ? this.st.mios : this.st.rivales;
      /* la barrera no es la misma figura cinco veces: se alternan el lado y la altura */
      var nB = 0, altosB = K.barrera_altos || [1];
      var rotulos = [];
      gente.forEach(function (g) {
        var q = lista[g.d.ref], p = self.frenteP(fr, g.d.d, g.d.u, 0);
        if (p.x < -80 || p.x > W + 80 || p.y < (fr.hz || K.horizonte) - 4) return;
        var alto = 0.74 * fr.hg * p.s, img;
        if (g.arq) {
          var ka = rivalDeEllos ? (self.poseRivalNaranja && self.poseRivalNaranja("arquero_ataja")) : self.poseDePlano("arquero_ataja", q, false);
          img = self.add.image(p.x, p.y, ka || self.figuraArquero("ataja", "frente (arquero)", rivalDeEllos)).setOrigin(0.5, 1);
          img.setScale(self.escalaDePose("arquero_ataja", alto, img));
          self.cineContent.add(img);
        } else {
          var enB = g.d.barrera && cfg.libre;
          var flip = enB ? nB % 2 === 1 : p.x > (fr.cx || W / 2);
          if (enB) { alto *= altosB[nB % altosB.length]; nB++; }
          img = self.figuraDePlano("bloqueo", q, rivalDeEllos, p.x, p.y, alto, flip);
          img.setOrigin(0.5, 1).setPosition(p.x, p.y);
        }
        fr.figs.push({ img: img, d: g.d, arq: g.arq, y0: p.y });
        rotulos.push([img, g.d.numero, rivalDeEllos, g.arq]);
      });

      /* quien patea, de espaldas, abajo a la izquierda, y la pelota a su pie */
      var p0 = this.frenteP(fr, 0, 0, 0);
      var xT = Phaser.Math.Clamp(p0.x, 150, 300);
      fr.tirador = this.figuraDePlano("de_espaldas_sin_pelota", cfg.j, cfg.esRival, xT, H + 28, 340, false);
      fr.tirador.setOrigin(0.5, 1).setPosition(xT, H + 28);
      /* los rótulos, después de todas las figuras (también de quien patea) y el del arquero arriba de todo */
      rotulos.sort(function (a, b) { return (a[3] ? 1 : 0) - (b[3] ? 1 : 0); });
      rotulos.forEach(function (r) { self.frenteNumero(r[0], r[1], r[2], r[3]); });
      var TB = this.texPelota(40);
      var pb = this.frenteP(fr, 9, 4, 0);
      fr.bolaEsc = TB.esc;
      fr.bola = this.add.image(xT + 0.2 * fr.tirador.displayWidth, Math.min(H - 22, pb.y), TB.key).setScale(TB.esc);
      fr.bola0 = { x: fr.bola.x, y: fr.bola.y };
      this.cineContent.add(fr.bola);
      fr.g = this.add.graphics();
      this.cineContent.add(fr.g);

      /* lo que se lee */
      var quien = cfg.j.esVos ? "VOS" : String(cfg.j.numero || "") + " " + String(cfg.j.nombre || "").toUpperCase();
      fr.lectura = this.add.text(W / 2 - 60, 54, "", { fontFamily: window.PF.display, fontSize: "22px", color: "#ffd84d", stroke: "#0a1f13", strokeThickness: 6, align: "center" }).setOrigin(0.5);
      var leyenda = this.frenteLeyenda(fr, quien);
      fr.leyenda = this.add.text(18, 84, leyenda, { fontFamily: window.PF.texto, fontSize: "15px", color: "#f6efdc", stroke: "#0a1f13", strokeThickness: 4, wordWrap: { width: 700 } });
      [fr.lectura, fr.leyenda].forEach(function (o) { self.cineContent.add(o); });
      if (cfg.aviso) {
        fr.aviso = this.add.text(W / 2 - 60, 138, cfg.aviso, { fontFamily: window.PF.display, fontSize: "17px", color: "#0a1f13", backgroundColor: "#ffd84d", padding: { x: 10, y: 6 }, align: "center", wordWrap: { width: 640 } }).setOrigin(0.5, 0);
        this.cineContent.add(fr.aviso);
        this.time.delayedCall(this.msV(C.tiro_libre.aviso_ms), function () { if (self._fr === fr && fr.aviso) fr.aviso.setVisible(false); });
      }

      /* la barra del perfil: la marca va y viene, AHORA es el punto justo */
      var PF = C.perfil;
      fr.barra = { x: X_BOT - ANCHO_BOT / 2, y: 462, w: ANCHO_BOT };
      fr.barraG = this.add.graphics();
      var ahora = this.add.text(fr.barra.x + PF.dulce * fr.barra.w, fr.barra.y - 12, "AHORA", { fontFamily: window.PF.display, fontSize: "13px", color: "#f6efdc", stroke: "#0a1f13", strokeThickness: 4 }).setOrigin(0.5, 1);
      this.cineContent.add(fr.barraG); this.cineContent.add(ahora);

      if (cfg.cpu && cfg.penal) { ahora.setVisible(false); this.penalArqueroUI(fr, cfg); this.estado = "FRENTE"; return; }
      if (cfg.cpu) {
        /* la barra es de quien patea con la mano en el mouse: la CPU no la usa */
        fr.barraG.setVisible(false); ahora.setVisible(false);
        this.frenteLectura(fr, cfg.esRival ? "¡TE PATEAN EL TIRO LIBRE!" : "");
        var ayudaR = this.add.text(X_BOT, 506, "Patea " + quien + " · tu arquero espera", { fontFamily: window.PF.texto, fontSize: "15px", color: "#f6efdc", stroke: "#0a1f13", strokeThickness: 4, align: "center", wordWrap: { width: ANCHO_BOT } }).setOrigin(0.5, 0.5);
        this.cineContent.add(ayudaR);
        this.pedirMusica("jugadon");
        var t0 = this.msV(C.tiro_libre.aviso_ms * 0.6);
        this.time.delayedCall(t0, function () {
          if (self._fr !== fr) return;
          self.tweens.add({ targets: fr.mira, u: cfg.cpu.mira.u, h: cfg.cpu.mira.h, duration: self.msV(700), ease: "Sine.easeInOut" });
        });
        this.time.delayedCall(t0 + this.msV(1000), function () { if (self._fr === fr) self.frenteGolpe(cfg.cpu.calidad); });
        this.frenteDibujar();
        this.estado = "FRENTE";
        return;
      }

      /* las pegadas, en columna a la derecha (1 a 4 en el teclado) */
      cfg.menu.forEach(function (tid, i) {
        var T = C.tipos[tid];
        var b = self.jugadonBoton(X_BOT, 196 + i * 62, ANCHO_BOT, T.n, 0xf6efdc, function () { self.frenteElegir(tid); });
        fr.botones.push({ tid: tid, b: b, t: self._jg.botones[self._jg.botones.length - 1], n: T.n });
      });
      fr.dice = this.add.text(X_BOT, 196 + cfg.menu.length * 62 - 18, "", { fontFamily: window.PF.texto, fontSize: "14px", color: "#f6efdc", stroke: "#0a1f13", strokeThickness: 4, align: "center", wordWrap: { width: ANCHO_BOT } }).setOrigin(0.5, 0);
      this.cineContent.add(fr.dice);
      var tactil = this.sys.game.device.input.touch;
      /* idea de Rodri del 23/oct: en el teléfono, el tiro con el dedo
         (logic/frente.js, gesto); con gesto.activo false, la mira y los botones */
      var conDedo = !!(tactil && C.gesto && C.gesto.activo);
      fr.ayuda = this.add.text(X_BOT - ANCHO_BOT / 2, 486, conDedo ? "Arrastrá y soltá. Largo: fuerza. Curvo: efecto."
        : tactil ? "Arrastrá la mira al hueco y soltá: le pegás"
        : "Mouse: apuntá · rueda, Q o E: la pegada · clic: le pegás",
        { fontFamily: window.PF.texto, fontSize: "14px", color: "#f6efdc", stroke: "#0a1f13", strokeThickness: 4, wordWrap: { width: ANCHO_BOT } }).setOrigin(0, 0);
      this.cineContent.add(fr.ayuda);
      this.frenteColumna(fr, ahora, cfg.menu.map(function (tid) { return C.tipos[tid].dice; }));
      this.frenteElegir(fr.tipo);

      var sobreBoton = function (sobre) { return !!(sobre && sobre.length); };
      var apuntar = function (p) { if (self._fr === fr && !fr.resuelto) { fr.mira = self.frenteMiraDePantalla(fr, p.x, p.y); fr.teclado = false; } };
      var leerGesto = function () {
        var a = self.frentePuntoArco(fr, -1, 0), b = self.frentePuntoArco(fr, 1, 0);
        return Fr.gesto(fr.dedo, { menu: cfg.menu, pelota: fr.bola0, palos: [{ x: a.x, y: a.y }, { x: b.x, y: b.y }] }, C);
      };
      var mover = function (p, sobre) {
        if (self._fr !== fr || fr.resuelto) return;
        if (conDedo && p.wasTouch) {
          var ult = fr.dedo && fr.dedo[fr.dedo.length - 1];
          if (ult && p.isDown && Math.hypot(p.x - ult.x, p.y - ult.y) >= 3) { fr.dedo.push({ x: p.x, y: p.y }); self.frenteDedo(fr, leerGesto()); }
          return;
        }
        if ((!p.wasTouch || p.isDown) && !sobreBoton(sobre) && !fr.arrastraBoton) apuntar(p);
      };
      var bajar = function (p, sobre) {
        if (self._fr !== fr || fr.resuelto) return;
        fr.arrastraBoton = sobreBoton(sobre);
        if (fr.arrastraBoton) return;
        if (conDedo && p.wasTouch) { fr.marcaDedo = null; fr.marcaDedo = self.frentePos(fr); fr.dedo = [{ x: p.x, y: p.y }]; self.frenteDedo(fr, null); return; }
        apuntar(p);
        if (!p.wasTouch) self.frenteGolpe();
        else fr.apuntando = true;
      };
      var soltar = function (p) {
        if (self._fr !== fr || fr.resuelto) return;
        if (fr.dedo) {
          var gg = leerGesto();
          fr.dedo = null;
          if (!gg) fr.marcaDedo = null;
          self.frenteDedo(fr, gg, !gg);
          if (gg) self.frenteGolpe();
        } else if (p.wasTouch && fr.apuntando) { fr.apuntando = false; self.frenteGolpe(); }
        fr.arrastraBoton = false;
      };
      /* en la PC la rueda (o Q y E) cambia la pegada */
      var ciclo = function (d) {
        if (self._fr !== fr || fr.resuelto) return;
        var n = cfg.menu.length, i = cfg.menu.indexOf(fr.tipo);
        self.frenteElegir(cfg.menu[((i < 0 ? 0 : i) + d + n) % n]);
      };
      var rueda = function (p, sobre, dx, dy) { if (dy) ciclo(dy > 0 ? 1 : -1); };
      this.input.on("pointermove", mover); this.input.on("pointerdown", bajar); this.input.on("pointerup", soltar); this.input.on("wheel", rueda);
      fr.ev = [["pointermove", mover], ["pointerdown", bajar], ["pointerup", soltar], ["wheel", rueda]];
      /* abajo al medio: arriba está la leyenda de quiénes están adelante y a
         la izquierda la pelota, de donde sale el dedo */
      fr.dedoTxt = this.add.text(X_DEDO, 466, "", { fontFamily: window.PF.texto, fontSize: "16px", color: "#f6efdc", stroke: "#0a1f13", strokeThickness: 5, align: "center", wordWrap: { width: 380 } }).setOrigin(0.5, 0);
      this.cineContent.add(fr.dedoTxt);
      /* revisión del 23/oct: la calidad sale de la marca al apoyar el dedo;
         se dice abajo al medio hasta que lo apoyás (la ayuda de la columna
         no tiene lugar para una tercera línea) */
      if (conDedo) fr.dedoTxt.setText("Apoyá el dedo en la pelota cuando la marca pasa por AHORA");
      if (this.input.keyboard) {
        var K2 = C.camara;
        var paso = function (du, dh) { return function (ev) { if (self._fr !== fr || fr.resuelto) return; if (ev && ev.preventDefault) ev.preventDefault(); fr.mira = { u: Phaser.Math.Clamp(fr.mira.u + du, -1.2, 1.2), h: Phaser.Math.Clamp(fr.mira.h + dh, 0, 1.15) }; fr.teclado = true; }; };
        var pegar = function (ev) { if (self._fr === fr && !fr.resuelto) { if (ev && ev.preventDefault) ev.preventDefault(); self.frenteGolpe(); } };
        var teclas = [["keydown-LEFT", paso(-K2.paso_u, 0)], ["keydown-RIGHT", paso(K2.paso_u, 0)], ["keydown-UP", paso(0, K2.paso_h)], ["keydown-DOWN", paso(0, -K2.paso_h)],
          ["keydown-A", paso(-K2.paso_u, 0)], ["keydown-D", paso(K2.paso_u, 0)], ["keydown-W", paso(0, K2.paso_h)], ["keydown-S", paso(0, -K2.paso_h)],
          ["keydown-ENTER", pegar], ["keydown-SPACE", pegar], ["keydown-Q", function () { ciclo(-1); }], ["keydown-E", function () { ciclo(1); }]];
        ["ONE", "TWO", "THREE", "FOUR"].slice(0, cfg.menu.length).forEach(function (n, i) {
          teclas.push(["keydown-" + n, function () { if (self._fr === fr && !fr.resuelto) self.frenteElegir(cfg.menu[i]); }]);
        });
        teclas.forEach(function (p) { self.input.keyboard.on(p[0], p[1]); });
        fr.teclas = teclas;
      }
      this.pedirMusica("jugadon");
      this.frenteDibujar();
      this.estado = "FRENTE";
    },

    /* proyección: d hacia el arco, u a la derecha, z para arriba (px de cancha) */
    frenteP(fr, d, u, z) {
      var K = this.BAL.frente.camara, s = fr.k / Math.max(8, d + K.atras);
      return { x: (fr.cx != null ? fr.cx : W / 2) + (u - K.al_costado) * s, y: (fr.hz || K.horizonte) + ((fr.altoCam != null ? fr.altoCam : K.alto_cam) - (z || 0)) * s, s: s };
    },
    frentePuntoArco(fr, u, h) {
      var Fr = window.PampaFrente, m = fr.foto.m, L = Fr.local(m, Fr.puntoDeArco(m, u));
      return this.frenteP(fr, L.d, L.u, h * fr.hg);
    },
    /* el puntero sobre el plano del arco: entre los palos, de 0 al travesaño */
    frenteMiraDePantalla(fr, x, y) {
      var a = this.frentePuntoArco(fr, -1, 0), b = this.frentePuntoArco(fr, 1, 0);
      var u = -1 + 2 * (x - a.x) / ((b.x - a.x) || 1);
      var f = Phaser.Math.Clamp((u + 1) / 2, 0, 1), yg = a.y + (b.y - a.y) * f, alto = fr.hg * (a.s + (b.s - a.s) * f);
      return { u: Phaser.Math.Clamp(u, -1.3, 1.3), h: Phaser.Math.Clamp((yg - y) / alto, 0, 1.25) };
    },

    frenteFondo(fr) {
      var K = this.BAL.frente.camara, HZ = fr.hz || K.horizonte, g = this.cineBG, self = this, Fr = window.PampaFrente, m = fr.foto.m;
      var tinte = this.tinteIlustrado ? this.tinteIlustrado() : null;
      var pintado = !!(this.fondoCine && this.fondoCine("cancha_alta", { y0: HZ }));
      if (!pintado) { g.fillStyle(0x123a5a, 1); g.fillRect(0, 0, W, HZ); g.fillStyle(0x2e7d32, 1); g.fillRect(0, HZ, W, H - HZ); }
      if (this.textures.exists("fondo_tribuna") && (!pintado || !this.ambienteEsPueblo || this.ambienteEsPueblo())) {
        var trib = this.add.image(W / 2, HZ, "fondo_tribuna").setOrigin(0.5, 1);
        trib.setScale(W / trib.width);
        if (tinte != null) trib.setTint(tinte);
        this.cineContent.add(trib);
      }
      var l = this.add.graphics();
      /* el corte del pasto: franjas a lo ancho, cada vez más finas hacia el fondo */
      for (var d = 0; d < m.dist + 260; d += 36) {
        var y1 = this.frenteP(fr, d, 0, 0).y, y2 = this.frenteP(fr, d + 18, 0, 0).y;
        l.fillStyle(0xffffff, 0.06); l.fillRect(0, y2, W, Math.max(1, y1 - y2));
      }
      /* las líneas: el área grande y el área chica, en el piso */
      var A = this.BAL.toque.area, G = m.G, dir = m.dir;
      var linea = function (p1, p2) {
        var a = Fr.local(m, p1), b = Fr.local(m, p2), dmin = 6;
        if (a.d < dmin && b.d < dmin) return;
        if (a.d < dmin) { var f = (dmin - a.d) / (b.d - a.d); a = { d: dmin, u: a.u + (b.u - a.u) * f }; }
        if (b.d < dmin) { var f2 = (dmin - b.d) / (a.d - b.d); b = { d: dmin, u: b.u + (a.u - b.u) * f2 }; }
        var s1 = self.frenteP(fr, a.d, a.u, 0), s2 = self.frenteP(fr, b.d, b.u, 0);
        l.lineBetween(s1.x, s1.y, s2.x, s2.y);
      };
      l.lineStyle(3, 0xeafff0, 0.6);
      [[A.largo_px, A.ancho_medio_px], [m.am, m.am * 2]].forEach(function (c) {
        var x0 = G.x - dir * c[0];
        linea({ x: G.x, y: G.y - c[1] }, { x: x0, y: G.y - c[1] });
        linea({ x: x0, y: G.y - c[1] }, { x: x0, y: G.y + c[1] });
        linea({ x: x0, y: G.y + c[1] }, { x: G.x, y: G.y + c[1] });
      });
      linea({ x: G.x, y: G.y - 420 }, { x: G.x, y: G.y + 420 });
      /* el arco: la red atrás y los palos adelante */
      var pa = Fr.local(m, Fr.puntoDeArco(m, -1)), pb = Fr.local(m, Fr.puntoDeArco(m, 1)), fondo = 20, hg = fr.hg;
      l.lineStyle(1, 0xdfeef6, 0.45);
      for (var k = 0; k <= 10; k++) {
        var f3 = k / 10, du = pa.u + (pb.u - pa.u) * f3, dd = pa.d + (pb.d - pa.d) * f3;
        var n1 = this.frenteP(fr, dd, du, hg), n2 = this.frenteP(fr, dd + fondo, du, 0);
        l.lineBetween(n1.x, n1.y, n2.x, n2.y);
      }
      for (var q = 0; q <= 4; q++) {
        var zq = hg * q / 4, r1 = this.frenteP(fr, pa.d + fondo * (1 - q / 4), pa.u, zq), r2 = this.frenteP(fr, pb.d + fondo * (1 - q / 4), pb.u, zq);
        l.lineBetween(r1.x, r1.y, r2.x, r2.y);
      }
      var a0 = this.frenteP(fr, pa.d, pa.u, 0), a1 = this.frenteP(fr, pa.d, pa.u, hg), b0 = this.frenteP(fr, pb.d, pb.u, 0), b1 = this.frenteP(fr, pb.d, pb.u, hg);
      l.lineStyle(Math.max(3, 0.9 * a0.s), 0xffffff, 1);
      l.lineBetween(a0.x, a0.y, a1.x, a1.y); l.lineBetween(b0.x, b0.y, b1.x, b1.y); l.lineBetween(a1.x, a1.y, b1.x, b1.y);
      this.cineContent.add(l);
    },

    /* el número arriba de la cabeza, con la forma del bando (L11) */
    frenteNumero(img, numero, esRival, arq) {
      var x = img.x, y = img.y - img.displayHeight - 4;
      var t = this.add.text(x, y, (arq ? "ARQ " : "") + String(numero != null ? numero : ""), { fontFamily: window.PF.display, fontSize: "13px", color: "#0a1f13", backgroundColor: esRival ? "#FF8A50" : "#4FC3F7", padding: { left: 20, right: 5, top: 2, bottom: 2 } }).setOrigin(0.5, 1);
      /* el rótulo no se corta en el borde ni queda debajo de los botones */
      var lim = this._fr && this._fr.lim;
      if (lim) t.x = Phaser.Math.Clamp(t.x, lim.izq + t.displayWidth / 2, lim.der - t.displayWidth / 2);
      this.cineContent.add(t);
      this.cineContent.add(this.marcaDeBando(this.add.graphics(), t.x - t.displayWidth / 2 + 10, t.y - t.displayHeight / 2, esRival, 5, 0x0a1f13));
    },
    frenteLeyenda(fr, quien) {
      var nombre = function (d) { return String(d.numero != null ? d.numero : "") + " " + String(d.nombre || "").toUpperCase(); };
      var A = fr.foto.arquero, defs = fr.foto.defensores.slice().sort(function (a, b) { return a.d - b.d; });
      var cerca = defs.filter(function (d) { return Math.abs(d.u) < d.d * 0.6 + 40; }).slice(0, 5).map(nombre);
      if (fr.penal) return fr.esRival ? "Patea " + quien + " · tu arquero: " + nombre(A) : "Patea " + quien + ", solo contra el arquero " + nombre(A);
      if (fr.esRival) return "Patea " + quien + " · tu barrera: " + (cerca.join(", ") || "nadie") + " · tu arquero: " + nombre(A);
      return (fr.libre ? "Barrera: " : "Adelante: ") + (cerca.join(", ") || "nadie") + " · arquero: " + nombre(A);
    },

    frenteElegir(tid, delDedo) {
      var fr = this._fr, C = this.BAL.frente;
      if (!fr || fr.resuelto) return;
      fr.tipo = tid;
      var T = C.tipos[tid];
      /* al palo del arquero: la mira se va al palo donde está él (con el
         dedo no: el hueco lo eligió la dirección del arrastre) */
      if (T.al_palo_arquero && !delDedo) fr.mira = { u: (fr.foto.arquero.u >= 0 ? 1 : -1) * 0.82, h: 0.3 };
      var tactil = this.sys.game.device.input.touch;
      fr.botones.forEach(function (o, i) {
        var sel = o.tid === tid;
        o.b.setFillStyle(sel ? 0xffd84d : 0xf6efdc, 0.97).setStrokeStyle(sel ? 5 : 3, 0x0a1f13);
        o.t.setText((tactil ? "" : (i + 1) + "·") + (sel ? "▶ " : "") + o.n);
      });
      if (fr.dice) fr.dice.setText(T.dice);
    },

    /* el gesto mientras arrastrás: la mira, la pegada y en palabras la
       fuerza, la pegada y si va recta o con curva. corto: soltó sin tiro */
    frenteDedo(fr, G, corto) {
      fr.gesto = G;
      if (G) {
        fr.mira = G.mira;
        if (G.tipo !== fr.tipo) this.frenteElegir(G.tipo, true);
        var curva = G.curvo ? (G.mira.lado > 0 ? "CON CURVA A LA DERECHA" : "CON CURVA A LA IZQUIERDA") : "RECTA";
        fr.dedoTxt.setText(this.BAL.frente.tipos[G.tipo].n + " · FUERZA " + G.palabra + "\n" + curva);
      } else fr.dedoTxt.setText(corto ? "Arrastrá más largo y hacia el arco" : "");
    },

    updateFrente(delta) {
      var fr = this._fr;
      if (!fr || fr.resuelto) return;
      fr.t += delta;
      this.frenteDibujar();
    },
    /* la marca de la barra: va y viene en barrido_ms */
    frentePos(fr) {
      /* revisión del 23/oct: con el dedo, la marca queda quieta donde estaba
         al apoyarlo y de ahí sale la calidad; antes seguía corriendo durante
         el arrastre y contaba la del momento de soltar, que nadie mira */
      if (fr.marcaDedo != null) return fr.marcaDedo;
      var per = this.msV(this.BAL.frente.perfil.barrido_ms), f = (fr.t % (2 * per)) / per;
      return f <= 1 ? f : 2 - f;
    },

    frenteDibujar() {
      var fr = this._fr, C = this.BAL.frente, Fr = window.PampaFrente, g = fr.g, self = this;
      /* en el penal de ellos no se ve adónde va: eso es lo que adivinás */
      if (fr.penalArq) { this.penalDibujar(fr); return; }
      g.clear();
      var T = C.tipos[fr.tipo];
      var L = Fr.leer(fr.foto, fr.mira, fr.tipo, C);
      var tray = Fr.trayectoria(fr.foto.m, L.mira, T), m = fr.foto.m;
      var tapaT = 1;
      if (L.tapa) {
        var mejor = 1e9;
        for (var k = 1; k <= 40; k++) { var p = tray(k / 40), dd = Math.hypot(p.x - L.tapa.x, p.y - L.tapa.y); if (dd < mejor) { mejor = dd; tapaT = k / 40; } }
      }
      /* el camino de la pelota, en puntos, hasta el que la tapa */
      for (var t = 0.08; t <= (L.tapa ? tapaT : 1) + 1e-6; t += 0.07) {
        var q = tray(t), lq = Fr.local(m, q), s = this.frenteP(fr, lq.d, lq.u, q.z * fr.hg);
        g.fillStyle(0x0a1f13, 0.55); g.fillCircle(s.x, s.y, 5);
        g.fillStyle(0xffffff, 0.95); g.fillCircle(s.x, s.y, 3);
      }
      if (L.tapa) {
        var qt = tray(tapaT), lt = Fr.local(m, qt), st2 = this.frenteP(fr, lt.d, lt.u, qt.z * fr.hg);
        g.lineStyle(5, 0x0a1f13, 1); g.lineBetween(st2.x - 11, st2.y - 11, st2.x + 11, st2.y + 11); g.lineBetween(st2.x - 11, st2.y + 11, st2.x + 11, st2.y - 11);
        g.lineStyle(3, 0xffffff, 1); g.lineBetween(st2.x - 9, st2.y - 9, st2.x + 9, st2.y + 9); g.lineBetween(st2.x - 9, st2.y + 9, st2.x + 9, st2.y - 9);
      }
      /* el dedo: su camino desde la pelota (el largo es la fuerza) y la
         barra de la fuerza con sus cortes */
      if (fr.dedo && fr.dedo.length > 1) {
        var A0 = fr.dedo[0], b0 = fr.bola0, GZ = C.gesto;
        g.lineStyle(9, 0x0a1f13, 0.8); g.beginPath(); g.moveTo(b0.x, b0.y);
        fr.dedo.forEach(function (p) { g.lineTo(b0.x + p.x - A0.x, b0.y + p.y - A0.y); });
        g.strokePath();
        g.lineStyle(4, 0xffd84d, 1); g.beginPath(); g.moveTo(b0.x, b0.y);
        fr.dedo.forEach(function (p) { g.lineTo(b0.x + p.x - A0.x, b0.y + p.y - A0.y); });
        g.strokePath();
        if (fr.gesto) {
          var bw = 220, bx = X_DEDO - bw / 2, by = 450;
          g.fillStyle(0x0a1f13, 0.85); g.fillRect(bx - 4, by - 4, bw + 8, 20);
          g.fillStyle(fr.gesto.nivel >= GZ.cortes.length ? 0xf6efdc : 0xffd84d, 1); g.fillRect(bx, by, bw * Math.min(1, fr.gesto.fuerza / GZ.fuerza_max), 12);
          g.fillStyle(0x0a1f13, 1);
          GZ.cortes.forEach(function (c) { g.fillRect(bx + bw * c / GZ.fuerza_max - 1, by - 4, 3, 20); });
        }
      }
      /* la mira: un aro con cruz en el plano del arco */

      var pm = this.frentePuntoArco(fr, L.mira.u, L.mira.h);
      g.lineStyle(6, 0x0a1f13, 0.9); g.strokeCircle(pm.x, pm.y, 15);
      g.lineStyle(3, 0xffd84d, 1); g.strokeCircle(pm.x, pm.y, 15);
      g.lineBetween(pm.x - 22, pm.y, pm.x - 8, pm.y); g.lineBetween(pm.x + 8, pm.y, pm.x + 22, pm.y);
      g.lineBetween(pm.x, pm.y - 22, pm.x, pm.y - 8); g.lineBetween(pm.x, pm.y + 8, pm.x, pm.y + 22);
      var nom = function (j) { return "EL " + String(j.numero != null ? j.numero : "") + " · " + String(j.nombre || "").toUpperCase(); };
      var txt = L.fuera ? "SE VA AFUERA" : L.tapa ? "LO TAPA " + nom(L.tapa) : L.roza ? "LO PUEDE ROZAR " + nom(L.roza)
        : L.margen < 0 ? "AHÍ LLEGA EL ARQUERO" : L.margen > 0.25 ? "LIBRE · lejos del arquero" : "LIBRE · el arquero se estira";
      /* en tu penal el arquero todavía no se movió: se lee adónde va */
      if (fr.penal && !fr.cpu && !L.fuera) {
        var PC = this.BAL.penal;
        txt = "PENAL · " + this.penalAdonde(window.PampaPenal.zonaDe(L.mira.u, L.mira.h, PC)).toUpperCase() + (Math.abs(L.mira.u) > PC.esquina_desde ? " · AL ÁNGULO" : "");
      }
      if (fr.cpu) txt = fr.esRival ? "¡TE PATEAN EL TIRO LIBRE!" : txt;
      if (fr.lectura.text !== txt) this.frenteLectura(fr, txt);
      /* la barra del perfil */
      var B = fr.barra, PF = C.perfil, bg = fr.barraG, pos = this.frentePos(fr);
      bg.clear();
      bg.fillStyle(0x0a1f13, 0.85); bg.fillRect(B.x - 4, B.y - 4, B.w + 8, 22);
      bg.fillStyle(0xf6efdc, 0.35); bg.fillRect(B.x, B.y, B.w, 14);
      bg.fillStyle(0xffd84d, 1); bg.fillRect(B.x + (PF.dulce - PF.ancho * 0.35) * B.w, B.y, PF.ancho * 0.7 * B.w, 14);
      bg.lineStyle(2, 0x0a1f13, 1); bg.strokeRect(B.x + (PF.dulce - PF.ancho * 0.35) * B.w, B.y, PF.ancho * 0.7 * B.w, 14);
      var xc = B.x + pos * B.w;
      bg.fillStyle(0xffffff, 1); bg.fillTriangle(xc - 9, B.y - 12, xc + 9, B.y - 12, xc, B.y + 2);
      bg.fillRect(xc - 2, B.y, 4, 14);
    },

    /* LE PEGA. calidad: la de la CPU; si no, la de la marca en la barra */
    frenteGolpe(calidad) {
      var fr = this._fr, C = this.BAL.frente, Fr = window.PampaFrente, self = this;
      if (!fr || fr.resuelto) return;
      fr.resuelto = true;
      var q = calidad != null ? calidad : Fr.calidadDePerfil(this.frentePos(fr), C);
      var j = fr.j;
      var res = Fr.resolver(fr.foto, { mira: fr.mira, tipo: fr.tipo, calidad: q }, { tiro: (j.stats && j.stats.tiro) || 55, aguanteFrac: (j.aguante != null ? j.aguante : this.BAL.aguante.max) / this.BAL.aguante.max }, C, Math.random);
      res.calidad = q;
      /* el penal lo decide el arquero que se tiró (logic/penal.js): el tuyo
         donde elegiste, el de ellos adivina o se tira a la suerte */
      if (fr.penal) {
        var Pn = window.PampaPenal, PC = this.BAL.penal;
        var dirA = fr.penalArq ? (fr.penalDir || "medio") : Pn.arqueroCPU(fr.mira, fr.foto.arquero.nivel, PC, Math.random).dir;
        res.penal = Pn.resolver({ u: res.fin.u, h: res.fin.h, fuera: res.resultado === "afuera", palo: res.resultado === "palo",
          tipo: C.tipos[fr.tipo], dir: dirA, nivel: fr.foto.arquero.nivel }, PC, Math.random);
      }
      this.frenteFrame(fr);
      this.SFX && this.SFX.kickFuerte && this.SFX.kickFuerte();
      this.frenteLectura(fr, fr.penalArq ? "¡PATEÓ!" : C.tipos[fr.tipo].n + " · " + (q > 0.75 ? "¡bien perfilado!" : q > 0.35 ? "más o menos parado" : "a destiempo"));
      if (fr.dice) fr.dice.setText(fr.penalArq ? "" : C.tipos[fr.tipo].dice);
      if (fr.penal) {
        if (fr.dedoTxt) fr.dedoTxt.setText(fr.penalArq ? "Te tirás " + this.penalLado(res.penal.dir) : "El arquero se tira " + this.penalLado(res.penal.dir));
        if (fr.perfilaTxt) fr.perfilaTxt.setVisible(false);
        fr.barraG.setVisible(false);
      }
      /* la barrera que salta y el arquero que se adelantó se ven ahora */
      /* en MOVIMIENTO SUAVE es corte: la barrera queda arriba y el arquero, donde fue */
      var suave = !!(this.movimientoSuave && this.movimientoSuave());
      fr.figs.forEach(function (f) {
        var alto = f.y0 - 0.125 * f.img.displayHeight, xa = f.arq ? self.frentePuntoArco(fr, res.uArquero, 0).x : 0;
        if (f.d.barrera && fr.foto.salta) { if (suave) f.img.y = alto; else self.tweens.add({ targets: f.img, y: alto, duration: self.msV(220), yoyo: true }); }
        if (f.arq && fr.penal) self.penalTirada(fr, f, res.penal.dir, suave);
        else if (f.arq && fr.foto.arquero.seTira) { if (suave) f.img.x = xa; else self.tweens.add({ targets: f.img, x: xa, duration: self.msV(260), ease: "Sine.easeOut" }); }
      });
      /* la pelota sale por el camino de verdad: hasta el que la tapa, o un
         tramo, y corte seco al cine */
      var m = fr.foto.m, tray = Fr.trayectoria(m, res.fin, C.tipos[fr.tipo]);
      var tFin = res.resultado === "bloqueo" || res.resultado === "desvio" ? this.frenteTDe(tray, res.quien) : 0.55;
      var o = { t: 0 }, b = fr.bola, b0 = fr.bola0;
      this.tweens.add({
        targets: o, t: tFin, duration: this.msV(460), ease: "Quad.easeOut",
        onUpdate: function () {
          var p = tray(o.t), L = Fr.local(m, p), s = self.frenteP(fr, L.d, L.u, p.z * fr.hg);
          var f = Math.min(1, o.t * 6);
          b.setPosition(b0.x + (s.x - b0.x) * f, b0.y + (s.y - b0.y) * f);
          b.setScale(Math.max(0.15, fr.bolaEsc * Math.min(1, s.s / (fr.k / 90))));
        }
      });
      if (res.resultado === "bloqueo" && fr.foto.libre) this.frenteLectura(fr, "¡A LA BARRERA!");
      this.time.delayedCall(this.msV(900), function () { self.frenteCerrar(res, fr); });
    },
    frenteTDe(tray, j) {
      var mejor = 1e9, tb = 0.5;
      if (!j) return tb;
      for (var k = 1; k <= 40; k++) { var p = tray(k / 40), d = Math.hypot(p.x - j.x, p.y - j.y); if (d < mejor) { mejor = d; tb = k / 40; } }
      return tb;
    },
    /* sin botones ni consigna al patear: lo que queda es la jugada */
    frenteFrame(fr) {
      this.jugadonLimpiarBotones();
      fr.botones = [];
      if (fr.ayuda) fr.ayuda.setVisible(false);
      if (fr.aviso) fr.aviso.setVisible(false);
      fr.g.clear();
    },

    /* fr: el frente que pateó. Si en esos 900 ms se abrió otro, el cierre
       viejo no se lleva puesto al nuevo */
    frenteCerrar(res, fr) {
      var self = this;
      if (!fr || fr !== this._fr) return;
      this._fr = null;
      fr.ev.forEach(function (p) { self.input.off(p[0], p[1]); });
      if (this.input.keyboard) fr.teclas.forEach(function (p) { self.input.keyboard.off(p[0], p[1]); });
      this.jugadonLimpiarBotones();
      this.limpiarContenido();
      this.estado = "RESOLUCION";
      fr.alFinal(res);
    },

    /* TU REMATE, DESPUÉS DE LA FOTO: la tapa o la desvía uno (su escena),
       se va afuera o va al arco. El gol lo decide duel.resolveShot con los
       stats de siempre y la zona de la geometría; el cine es el de siempre */
    frenteRematar(res, libre) {
      var st = this.st, P = window.PampaPartido, C = this.BAL.frente;
      var prep = P.prepararRemate(st, null, undefined, libre);
      this._megaGrito = this.tituloDelGol();
      if (res.resultado === "bloqueo" || res.resultado === "desvio") {
        var quien = res.quien ? st.rivales[res.quien.ref] : null;
        var nom = quien ? "EL " + quien.numero + " · " + String(quien.nombre || "").toUpperCase() : "";
        var desvio = res.resultado === "desvio";
        this.escenaDelBloqueo(quien, {
          titulo: desvio ? "¡LA DESVIÓ!" : (res.quien && res.quien.barrera ? "¡DIO EN LA BARRERA!" : "¡SE LA BLOQUEARON!"),
          sub: (desvio ? "La tocó " : "Se metió en el camino ") + nom + ".",
          desenlace: desvio ? "corner" : window.PampaDefinicion.desenlaceBloqueo(this.BAL.definicion || {}),
          previo: () => { this.SFX && this.SFX.kick(); }
        });
        return;
      }
      var gy = Math.round(Phaser.Math.Clamp(res.fin.u, -1, 1) * C.zona.gy_max);
      if (res.resultado === "al_arco") {
        this.zona = res.zona;
        this.res = window.PampaDuel.resolveShot({
          shotPower: prep.shotPower, keeperSkill: prep.keeperSkill, zone: res.zona,
          cfg: { spread: this.BAL.duelo.spread, min: this.BAL.duelo.min, max: this.BAL.duelo.max },
          distancia: prep.distancia, especial: prep.especial, tiro: this.BAL.tiro, penalizaciones: prep.penalizaciones
        });
      } else {
        this.zona = { id: res.resultado === "palo" ? "palo" : "medio_alto", n: res.resultado === "palo" ? "al palo" : "afuera", bonus: 0, fuera: 1, gy: gy };
        this.res = { outcome: "afuera", keeperWins: false };
      }
      this.entrarCine();
      this.planoViaje();
    },

    /* SU TIRO LIBRE, DESPUÉS DE LA FOTO: la barrera o el bloqueo van por
       "te rematan" con su escena; al arco, el mismo cine con tu arquero */
    frenteRivalResuelto(res, tiradorIdx) {
      var st = this.st, C = this.BAL.frente;
      if (res.resultado === "afuera" || res.resultado === "palo") {
        /* saque del fondo para tu equipo */
        st.posesion = "mia";
        var iDef = st.mios.findIndex(function (m) { return m.pos === "DEF"; });
        if (iDef >= 0) st.ctrl = iDef;
        var d0 = st.mios[st.ctrl];
        st.pelota.x = d0.x + 12; st.pelota.y = d0.y;
        st.modo = "juego"; st.cooldown = st.bal.ritmo.cooldown_encuentro_ms;
        window.PampaPartido.saltoReloj(st);
        this.jugadonCerrar();
        this.mostrarResolucion(res.resultado === "palo" ? "¡DIO EN EL PALO!\nSaca tu equipo desde el fondo." : "¡AFUERA!\nSaca tu equipo desde el fondo.", "#7ee08a", { anim: "arquero", gana: true });
        return;
      }
      var bloq = res.resultado === "bloqueo" || res.resultado === "desvio";
      var quien = bloq && res.quien ? st.mios[res.quien.ref] : null;
      var dada = {
        bloqueado: bloq, defensoresEnLinea: bloq ? 1 : 0, defensorMasCerca: quien, motivo: "tiro_libre", barrera: true,
        bonusArquero: bloq ? 0 : -res.zona.bonus
      };
      this.escenaRemateRival(tiradorIdx, false, dada);
    },

    /* LA FALTA. o: { aFavor (el rival te la sacó con falta), infractor,
       accion (quite o bloqueo), holgura }. Devuelve true si se cobró, y ahí
       se encarga del tiro libre; si no, el duelo sigue como siempre */
    cobrarFalta(o) {
      if (!this.FLAGS.tiro_libre || !window.PampaFrente) return false;
      var st = this.st, C = this.BAL.frente, Fr = window.PampaFrente, A = this.BAL.toque.area;
      var sobre = o.aFavor ? st.mios[st.ctrl] : st.rivales[st.portadorRival];
      /* el arquero no sale a cometer faltas a 66 m de su arco */
      if (!sobre || !o.infractor || o.infractor.pos === "ARQ") return false;
      var arco = o.aFavor ? { x: st.W, y: st.H / 2 } : { x: 0, y: st.H / 2 };
      var enArea = Math.abs(arco.x - sobre.x) < A.largo_px && Math.abs(sobre.y - arco.y) < A.ancho_medio_px;
      /* 23/oct, decisión que Rodri delegó: adentro del área, el quite o el
         bloqueo con falta es PENAL (balance.penal, flags.penales) */
      var penal = enArea && !!(this.FLAGS.penales && window.PampaPenal && this.BAL.penal);
      if (enArea && (!penal || this.BAL.penal.acciones.indexOf(o.accion) < 0)) return false;
      var tl = Fr.tiroLibre(sobre.x, sobre.y, arco, C);
      /* la falta táctica (te cierra o lo dejaste pagando) solo a tiro del arco */
      if ((C.falta.solo_a_tiro || []).indexOf(o.accion) >= 0 && !tl.directo) return false;
      var perfil = o.aFavor ? ((st._master && st._master.perfil) || "otro") : "vos";
      var cans = 1 - Phaser.Math.Clamp((o.infractor.aguante != null ? o.infractor.aguante : this.BAL.aguante.max) / this.BAL.aguante.max, 0, 1);
      if (!Fr.hayFalta({ accion: o.accion, perfil: perfil, holgura: o.holgura, cansancio: cans, enArea: enArea }, C, Math.random)) return false;
      var nom = function (j) { return j.numero + " " + String(j.nombre || "").toUpperCase(); };
      var del = function (j) { return j.esVos ? "TUYA" : "DEL " + nom(j); };
      var aQuien = function (j) { return j.esVos ? "VOS" : "EL " + nom(j); };
      if (penal) {
        this.relatar(o.aFavor ? "penal_a_favor" : "penal_en_contra", {});
        this.quitarDuelo(); this.limpiarMenu();
        var avisoP = "¡PENAL! FALTA " + del(o.infractor) + " SOBRE " + aQuien(sobre) + (o.aFavor ? "\nPatea " + (sobre.esVos ? "VOS" : nom(sobre)) : "\nAtajalo con tu arquero");
        if (o.aFavor) this.penalMio(avisoP); else this.penalRival(st.portadorRival, avisoP);
        return true;
      }
      var aviso = "¡FALTA " + del(o.infractor) + " SOBRE " + aQuien(sobre) + "!\nTiro libre " + (o.aFavor ? "a " + tl.metros + " m del arco" : "para el rival a " + tl.metros + " m");
      this.relatar(o.aFavor ? "falta_a_favor" : "falta_en_contra", {});
      this.quitarDuelo(); this.limpiarMenu();
      if (o.aFavor && tl.directo) {
        var cand = [];
        st.rivales.forEach(function (r, i) { if (r.pos !== "ARQ") cand.push({ ref: i, nombre: r.nombre, numero: r.numero, x: r.x, y: r.y }); });
        var B = Fr.barrera({ x: sobre.x, y: sobre.y }, arco, this.BAL.mundo.arco_medio, cand, C, Math.random);
        this.frentePararBarrera(B, st.rivales);
        var arq = st.rivales.find(function (r) { return r.pos === "ARQ"; });
        if (arq) { arq.x = B.arquero.x; arq.y = B.arquero.y; }
        this.entrarFrente({ B: B, aviso: aviso });
      } else if (o.aFavor) {
        this._tituloFlujo = aviso.replace("\n", " ") + " · jugala rápido";
        this.abrirMenuAtaque(null, true);
      } else if (tl.directo) {
        this.frenteRival(st.portadorRival, aviso);
      } else {
        st.modo = "juego"; st.cooldown = st.bal.ritmo.cooldown_encuentro_ms;
        this.mostrarResolucion(aviso + "\nLa juegan rápido.", "#e3503e", { anim: "quite", gana: false });
      }
      return true;
    }
  });
})();
