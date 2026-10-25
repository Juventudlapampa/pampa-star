/* ============================================================================
   PAMPA STAR · phaser/scenes/ceremonia_ui.js — EL FINAL DE LA CARRERA, EN PANTALLA

   Pedido de Rodri (25/oct): "ganar el Mundial es una línea chica y un botón
   que te lo hace jugar de nuevo, y los ascensos no tienen escena". Cuatro
   vistas del Master, con el arte que ya existe y sin dibujar nada nuevo:

     vistaCeremonia   el título con ascenso, el descenso, la gloria del
                      Mundial y el título defendido como leyenda. Tres cortes
                      secos (pose quieta): el titular sobre la tribuna, tu
                      pose con el relator, y la tribuna con la lista de lo que
                      cambia. Un toque o ENTER saltea al último corte.
     vistaCierre      después del Mundial, Nito Carrizo te vuelve a sentar en
                      la radio de la tarde y cita lo que contestaste la
                      primera vez.
     vistaTuCarrera   de dónde saliste, por dónde pasaste, goles y títulos.
     vistaCreditos    los créditos de la página y del README, y la elección:
                      SEGUIR COMO LEYENDA o NUEVA CARRERA.

   Las decisiones están en logic/final.js; los textos, en data/final.json;
   las perillas, en balance.final y flags.carrera_final.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.PampaMasterScene) return;
  var F = function () { return window.PampaFinal; };
  var CREMA = "#f6efdc", ORO = "#ffd84d", OSCURO = "#0a1f13", VERDE = "#7ee08a";

  var VISTAS = {
    /* los marcadores de los textos de data/final.json para esta temporada */
    datosDeCeremonia: function (v) {
      var fin = this.game.registry.get("final") || {};
      var nom = function (id) {
        return (fin.divisiones && fin.divisiones[id]) || { n: id, de: "de " + id, en: "en " + id, a: "a " + id };
      };
      var d = nom(this.save.temporada.division), p = nom(v.proximaDivision);
      var def = ((this.save.leyenda || {}).defendidos | 0) + (v.defendido ? 1 : 0);
      return {
        club: this.save.club, pueblo: this.save.pueblo || "La Pampa", posicion: v.posicion,
        titulos: F().titulosTexto((this.save.titulos || []).length),
        defendidos: def, defendidos_texto: def === 1 ? "1 título defendido" : def + " títulos defendidos",
        div: d.n, div_de: d.de, div_en: d.en, div_a: d.a,
        prox: p.n, prox_de: p.de, prox_en: p.en, prox_a: p.a
      };
    },

    /* lo que dice la lista de la ceremonia: qué cambia y qué se destraba */
    listaDeCeremonia: function (tipo, v, C, datos) {
      var Fi = F(), divs = this.Ma.DIVISIONES;
      if (tipo === "titulo" || tipo === "descenso") {
        var items = Fi.cambiosDeDivision(divs, this.save.temporada.division, v.proximaDivision);
        if (tipo === "titulo") {
          var antes = this.nivelDeLaCarrera();
          var despues = Math.max(antes, this.Ma.nivelDeDivision(v.proximaDivision));
          items = items.concat(Fi.desbloqueosDe(antes, despues, this.game.registry.get("megacosas"), this.game.registry.get("balance")));
        } else items.push({ marca: "■", texto: Fi.poner(C.conservas, datos) });
        return items;
      }
      return [{ marca: "▶", texto: Fi.poner(C.sigue, datos) }];
    },

    /* ══════════════════════════════════════════════════════════════════════
       LA CEREMONIA. La tribuna, tu pose y las caras se piden recién acá (la
       tabla no las carga: se ven una vez por temporada). */
    vistaCeremonia: function (v) {
      var self = this, Fi = F();
      var fin = this.game.registry.get("final");
      var tipo = Fi.ceremoniaDe(v), C = fin.ceremonias[tipo];
      var man = this.game.registry.get("poses") || {};
      var base = man.base || "assets/poses/";
      var faltan = 0;
      var pedir = function (clave, ruta) {
        if (self.textures.exists(clave) || !ruta) return;
        self.load.image(clave, "../" + ruta);
        faltan++;
      };
      var pz = man.poses && man.poses[C.pose];
      pedir("pose_" + C.pose, pz && pz.archivo ? base + pz.archivo : null);
      var tr = man.fondos && man.fondos.tribuna;
      pedir("fondo_tribuna", tr && tr.archivo ? base + tr.archivo : null);
      var H = man.hinchada;
      if (H && Array.isArray(H.siluetas)) H.siluetas.forEach(function (s) { pedir("pose_" + s.id, (H.base || base) + s.archivo); });
      this.vaciarVista();
      this._atrasVista = function () { self.scene.restart(); };
      if (this.fondoDelMaster) this.fondoDelMaster();
      this.pedirMusica(tipo === "descenso" ? "derrota" : "hype");
      var armar = function () { if (self.sys.isActive()) self.vistaCeremoniaArmada(v, tipo, C); };
      if (!faltan) { armar(); return; }
      this.add.text(this.scale.width / 2, this.scale.height / 2, "...", { fontFamily: window.PF.texto, fontSize: "19px", color: CREMA }).setOrigin(0.5);
      this.load.once("complete", armar);
      this.load.start();
    },

    vistaCeremoniaArmada: function (v, tipo, C) {
      var self = this, Fi = F();
      var W = this.scale.width, H = this.scale.height;
      var bal = this.game.registry.get("balance") || {};
      var ms = ((bal.final || {}).plano_ms) || 1500;
      var datos = this.datosDeCeremonia(v);
      var festejo = tipo !== "descenso";
      this.vaciarVista();
      this._atrasVista = function () { seguir(); };
      if (this.fondoDelMaster) this.fondoDelMaster();
      var vuelta = (this.save.temporadaN | 0);
      var elegir = function (lista) { return lista && lista.length ? lista[vuelta % lista.length] : null; };

      /* fondo: la tribuna a lo ancho, la hinchada abajo y un velo para leer */
      if (this.textures.exists("fondo_tribuna")) {
        var fondo = this.add.image(W / 2, H / 2, "fondo_tribuna");
        fondo.setScale(Math.max(W / fondo.width, H / fondo.height));
      }
      var man = this.game.registry.get("poses") || {};
      var sil = ((man.hinchada || {}).siluetas || []).filter(function (s) { return self.textures.exists("pose_" + s.id); });
      var cuantas = festejo ? 6 : 2;
      for (var h = 0; h < Math.min(cuantas, sil.length * 2); h++) {
        var s = sil[(h + vuelta) % sil.length];
        var im = this.add.image(70 + h * ((W - 140) / Math.max(1, cuantas - 1)), H + 10, "pose_" + s.id).setOrigin(0.5, 1);
        im.setScale(150 / im.height);
        if (h % 2) im.setFlipX(true);
      }
      this.add.rectangle(0, 0, W, H, 0x06120b, festejo ? 0.5 : 0.7).setOrigin(0, 0);

      this.add.text(W - 16, 14, C.rotulo, { fontFamily: window.PF.texto, fontSize: "13px", color: CREMA, backgroundColor: "#0a1f13cc", padding: { x: 6, y: 3 } }).setOrigin(1, 0);
      var cortes = [], k = 0, ev = null, botonSeguir = null;
      var seguir = function () {
        if (k < cortes.length) { saltar(); return; }
        self.save.ceremoniaVista = self.save.temporadaN;
        self.guardar();
        if (tipo === "gloria") self.vistaCierre(v);
        else self.scene.restart();
      };
      var siguiente = function () {
        if (k >= cortes.length) return;
        cortes[k++]();
        if (k < cortes.length) ev = self.time.delayedCall(ms, siguiente);
      };
      var saltar = function () {
        if (ev) { ev.remove(false); ev = null; }
        while (k < cortes.length) cortes[k++]();
      };

      /* CORTE 1 · el titular */
      cortes.push(function () {
        var t1 = self.add.text(W / 2, 74, Fi.poner(C.titular, datos).toUpperCase(), {
          fontFamily: window.PF.display, fontSize: "34px", color: festejo ? ORO : "#f0b0a8",
          stroke: OSCURO, strokeThickness: 6, align: "center"
        }).setOrigin(0.5);
        if (t1.width > W - 40) t1.setScale((W - 40) / t1.width);
        self.add.text(W / 2, 122, Fi.poner(C.bajada, datos).toUpperCase(), {
          fontFamily: window.PF.texto, fontSize: "19px", fontStyle: "bold", color: CREMA,
          stroke: OSCURO, strokeThickness: 4
        }).setOrigin(0.5);
        if (festejo) self.destello(self.cameras.main, 70, 255, 255, 255);
      });

      /* CORTE 2 · tu pose y el relator */
      cortes.push(function () {
        var clave = self.poseConTuPinta(C.pose);
        if (clave) {
          var p = self.add.image(160, H - 6, clave).setOrigin(0.5, 1);
          p.setScale(360 / p.height);
        }
        var REL = self.game.registry.get("relatos") || {};
        var rel = (REL.relatores || []).filter(function (r) { return r.id === C.relator; })[0];
        var dice = Fi.poner(elegir(C.dice) || "", datos);
        var xg = 330, yg = 166;
        if (rel && self.textures.exists("relatores")) {
          var marco = self.add.graphics();
          marco.fillStyle(0x0e2a1a, 1); marco.fillRect(xg - 2, yg - 2, 72, 72);
          self.caraDeRelator(xg + 34, yg + 34, 68, rel.id);
          marco.lineStyle(3, 0xf5c400, 1); marco.strokeRect(xg - 2, yg - 2, 72, 72);
        }
        var bx = xg + 86, bw = W - 24 - bx;
        var txt = self.add.text(bx + 14, yg + 26, dice, { fontFamily: window.PF.texto, fontSize: "17px", color: OSCURO, wordWrap: { width: bw - 28 }, lineSpacing: 2 });
        var alto = Math.max(72, txt.height + 36);
        var globo = self.add.graphics();
        globo.fillStyle(0xf6efdc, 0.97); globo.fillRoundedRect(bx, yg - 2, bw, alto, 6);
        globo.fillTriangle(bx + 1, yg + 22, bx + 1, yg + 42, bx - 14, yg + 32);
        globo.lineStyle(3, 0x0a1f13, 1); globo.strokeRoundedRect(bx, yg - 2, bw, alto, 6);
        self.add.text(bx + 14, yg + 6, rel ? rel.nombre.toUpperCase() : "EL RELATOR", { fontFamily: window.PF.texto, fontSize: "13px", fontStyle: "bold", color: "#365a41" });
        txt.setDepth(1);
      });

      /* CORTE 3 · la tribuna, la lista y SEGUIR */
      cortes.push(function () {
        var trib = self.game.registry.get("tribuna") || {};
        var nombres = {};
        (trib.personajes || []).forEach(function (p) { nombres[p.id] = p.nombre; });
        var y = 262;
        (elegir(C.tribuna) || []).forEach(function (d, i) {
          var yy = y + i * 34;
          var clave = "personaje_" + d.quien;
          if (self.textures.exists(clave)) {
            var R = 14, im = self.add.image(346, yy, clave);
            im.setScale((R * 2.2) / im.height);
            var mk = self.make.graphics({ x: 0, y: 0, add: false });
            mk.fillStyle(0xffffff); mk.fillCircle(346, yy, R);
            im.setMask(mk.createGeometryMask());
          }
          /* quién habla, por el nombre y por la forma (▲ Nelda, ▼ el Tuli,
             como en la franja del partido) */
          self.add.text(368, yy, (d.quien === "nelda" ? "▲ " : "▼ ") + (nombres[d.quien] || d.quien).toUpperCase() + ": " + d.texto, {
            fontFamily: window.PF.texto, fontSize: "15px", color: CREMA, backgroundColor: "#0a1f13cc", padding: { x: 6, y: 3 },
            wordWrap: { width: W - 392 }
          }).setOrigin(0, 0.5);
        });
        var items = self.listaDeCeremonia(tipo, v, C, datos);
        var yl = 340;
        self.add.rectangle(330, yl - 8, W - 354, 30 + items.length * 26, 0x0a1f13, 0.88).setOrigin(0, 0).setStrokeStyle(2, 0xf5c400, 0.9);
        self.add.text(346, yl, Fi.poner(C.lista, datos).toUpperCase(), { fontFamily: window.PF.texto, fontSize: "14px", fontStyle: "bold", color: ORO });
        items.forEach(function (it, i) {
          self.add.text(346, yl + 24 + i * 26, it.marca + " " + it.texto, { fontFamily: window.PF.texto, fontSize: "15px", color: CREMA, wordWrap: { width: W - 390 } });
        });
        botonSeguir = self.boton(W - 190, H - 34, 320, tipo === "gloria" ? "▶ A LA RADIO" : "▶ SEGUIR", festejo ? 0xffd84d : 0x7ee08a, seguir);
        if (self.grupoFoco) self.grupoFoco([{ obj: botonSeguir, cb: seguir }], { inicial: 0, volver: seguir });
        if (self.vestirPendientes) self.vestirPendientes();
      });

      /* un toque en cualquier lado (o ENTER) saltea al último corte */
      var zona = this.add.zone(0, 0, W, H).setOrigin(0, 0).setInteractive();
      zona.setDepth(-2);
      zona.on("pointerdown", function (p, x, y, e) { if (e && e.stopPropagation) e.stopPropagation(); if (k < cortes.length) saltar(); });
      this.atajo("ENTER", function () { if (k < cortes.length) saltar(); });
      this.atajo("SPACE", function () { if (k < cortes.length) saltar(); });
      siguiente();
    },

    /* ══════════════════════════════════════════════════════════════════════
       LA SEGUNDA ENTREVISTA. Los mismos dos retratos y el mismo globo de la
       primera (globosDeLaEntrevista), una voz por vez. Un toque, ENTER o
       SEGUIR completan la frase o pasan a la siguiente. */
    vistaCierre: function (v) {
      var self = this, Fi = F();
      var W = this.scale.width, H = this.scale.height;
      var fin = this.game.registry.get("final"), E = this.game.registry.get("entrevista") || {};
      var vida = this.game.registry.get("vida") || {};
      this.vaciarVista();
      this._atrasVista = function () { self.scene.restart(); };
      if (this.fondoDelMaster) this.fondoDelMaster();
      this.pedirMusica("espera");
      var lineas = Fi.segundaEntrevista(this.save, vida.origen, E, fin.cierre);
      this.add.text(W / 2, 34, fin.cierre.rotulo, { fontFamily: window.PF.display, fontSize: "13px", color: ORO }).setOrigin(0.5);
      var voces = this.globosDeLaEntrevista(E);
      var i = 0;
      var cuenta = this.add.text(W / 2, H - 92, "", { fontFamily: window.PF.texto, fontSize: "13px", color: CREMA }).setOrigin(0.5);
      var mostrar = function () {
        cuenta.setText((i + 1) + " de " + lineas.length);
        voces.decir(lineas[i].quien, lineas[i].texto, null);
      };
      var seguir = function () {
        if (self.completarEscritura()) return;
        if (i < lineas.length - 1) { i++; mostrar(); return; }
        self.vistaTuCarrera(v);
      };
      var zona = this.add.zone(0, 0, W, H).setOrigin(0, 0).setInteractive();
      zona.setDepth(-2);
      zona.on("pointerdown", function (p, x, y, e) { if (e && e.stopPropagation) e.stopPropagation(); seguir(); });
      var b = this.boton(W / 2, H - 50, 300, "▸ SEGUIR", 0xffd84d, seguir);
      if (this.grupoFoco) this.grupoFoco([{ obj: b, cb: seguir }], { inicial: 0 });
      mostrar();
    },

    /* ══════════════════════════════════════════════════════════════════════
       TU CARRERA. Lo que el save tiene anotado; lo que no, se dice que no. */
    vistaTuCarrera: function (v) {
      var self = this, Fi = F();
      var W = this.scale.width, H = this.scale.height;
      this.vaciarVista();
      this._atrasVista = function () { self.scene.restart(); };
      if (this.fondoDelMaster) this.fondoDelMaster();
      this.pedirMusica("opening");
      var r = Fi.tuCarrera(this.T, this.save, this.Ma.DIVISIONES, v);
      this.add.text(W / 2, 30, "TU CARRERA", { fontFamily: window.PF.display, fontSize: "19px", color: ORO }).setOrigin(0.5);
      /* de dónde saliste: la localidad y dónde aprendiste, como lo dijiste */
      var vida = this.game.registry.get("vida") || {};
      var el = this.save.origen && this.save.origen.elecciones;
      var donde = el && vida.origen && vida.origen[0] && vida.origen[0].opciones[el[0]];
      this.add.text(W / 2, 58, r.club + " · " + (r.pueblo || "La Pampa") + (donde ? " · aprendiste " + donde.corto.toLowerCase() : ""), {
        fontFamily: window.PF.texto, fontSize: "15px", color: CREMA }).setOrigin(0.5);

      var COLS = [
        { n: "TEMP.", x: 96, d: 1 }, { n: "DIVISIÓN", x: 110, d: 0 }, { n: "PUESTO", x: 300, d: 1 },
        { n: "PTS", x: 350, d: 1 }, { n: "G-E-P", x: 440, d: 1 }, { n: "GF-GC", x: 520, d: 1 },
        { n: "TUS GOLES", x: 620, d: 1 }, { n: "", x: 640, d: 0 }
      ];
      var y0 = 92;
      COLS.forEach(function (c) { self.add.text(c.x, y0, c.n, { fontFamily: window.PF.texto, fontSize: "13px", color: "#f6c11d" }).setOrigin(c.d, 0); });
      var MAX = 13, filas = r.filas.slice(-MAX);
      filas.forEach(function (f, i) {
        var y = y0 + 22 + i * 20;
        var marca = f.gloria ? "★ CAMPEÓN DEL MUNDO" : f.defendido ? "★ DEFENDIDO" : f.asciende ? "★ CAMPEÓN ▲ SUBISTE"
          : f.campeon ? "★ CAMPEÓN" : f.desciende ? "▼ BAJASTE" : "";
        var vals = f.soloTitulo
          ? [String(f.temporada), f.divisionN, "", "", "", "", "", "★ CAMPEÓN (sin la tabla anotada)"]
          : [String(f.temporada), f.divisionN, f.puesto + "º", String(f.pts), f.g + "-" + f.e + "-" + f.p, f.gf + "-" + f.gc,
            typeof f.golesTuyos === "number" ? String(f.golesTuyos) : "—", marca];
        var est = { fontFamily: window.PF.texto, fontSize: "14px", color: f.campeon ? ORO : CREMA, fontStyle: f.campeon ? "bold" : "normal" };
        COLS.forEach(function (c, k) { if (vals[k]) self.add.text(c.x, y, vals[k], est).setOrigin(c.d, 0); });
      });
      var yT = y0 + 22 + Math.max(1, filas.length) * 20 + 14;
      var totales = "★ " + Fi.titulosTexto(r.titulos) + " · " + r.temporadas + (r.temporadas === 1 ? " temporada" : " temporadas")
        + " · " + r.golesEquipo + " goles de tu equipo · " + r.golesTuyos + " tuyos";
      this.add.text(W / 2, yT, totales, { fontFamily: window.PF.texto, fontSize: "15px", fontStyle: "bold", color: ORO, backgroundColor: "#0a1f13cc", padding: { x: 8, y: 4 } }).setOrigin(0.5, 0);
      var notas = [];
      if (r.filas.length > MAX) notas.push("Se ven las últimas " + MAX + " de " + r.filas.length + ".");
      if (r.temporadasSinAnotar > 0) notas.push((r.temporadasSinAnotar === 1 ? "Una temporada se jugó" : r.temporadasSinAnotar + " temporadas se jugaron") + " antes de que el juego anotara la tabla: de esas quedan los títulos.");
      if (r.golesSinAnotar) notas.push("Tus goles se cuentan desde que el juego empezó a anotarlos.");
      if (notas.length) this.add.text(W / 2, yT + 34, notas.join(" "), { fontFamily: window.PF.texto, fontSize: "13px", color: CREMA, align: "center", wordWrap: { width: 820 } }).setOrigin(0.5, 0);
      var b = this.boton(W / 2, H - 40, 300, "▶ CRÉDITOS", 0xffd84d, function () { self.vistaCreditos(v); });
      if (this.grupoFoco) this.grupoFoco([{ obj: b, cb: function () { self.vistaCreditos(v); } }], { inicial: 0 });
    },

    /* ══════════════════════════════════════════════════════════════════════
       LOS CRÉDITOS Y LA ELECCIÓN. Desde acá el Mundial ganado no se vuelve a
       jugar como si nada: o se sigue como leyenda (otra cuenta, sin
       descenso) o se empieza otra carrera, con esta respaldada. */
    vistaCreditos: function (v) {
      var self = this, Fi = F();
      var W = this.scale.width, H = this.scale.height;
      var fin = this.game.registry.get("final"), cr = fin.creditos, el = fin.eleccion;
      var bal = this.game.registry.get("balance") || {};
      this.vaciarVista();
      this._atrasVista = function () { self.vistaTuCarrera(v); };
      if (this.fondoDelMaster) this.fondoDelMaster();
      this.pedirMusica("opening");
      if (!this.save.final_visto) { this.save.final_visto = true; this.guardar(); }
      this.add.text(W / 2, 30, cr.rotulo, { fontFamily: window.PF.display, fontSize: "19px", color: ORO }).setOrigin(0.5);
      var y = 64;
      cr.lineas.forEach(function (l) {
        self.add.text(W / 2, y, l.rubro.toUpperCase(), { fontFamily: window.PF.texto, fontSize: "13px", color: "#f6c11d" }).setOrigin(0.5, 0);
        var t = self.add.text(W / 2, y + 17, l.texto, { fontFamily: window.PF.texto, fontSize: "15px", color: CREMA, align: "center", wordWrap: { width: 780 } }).setOrigin(0.5, 0);
        y += 17 + t.height + 12;
      });
      var datos = { div_en: (fin.divisiones[(bal.final || {}).leyenda_division] || {}).en || "" };
      this.add.text(W / 2, Math.max(y + 8, 372), el.rotulo, { fontFamily: window.PF.display, fontSize: "15px", color: ORO }).setOrigin(0.5);
      var leyenda = function () {
        Fi.seguirComoLeyenda(self.T, self.save, v, self.Ma.DIVISIONES, { crear: function (d, n) { return self.temporadaNueva(d, n); } }, bal.final);
        self.guardar();
        self.scene.restart();
      };
      var nueva = function () { self.vistaBorrarCarrera(); };
      var bL = this.boton(W / 2 - 228, H - 64, 430, el.leyenda, 0xffd84d, leyenda, Fi.poner(el.leyenda_sub, datos));
      var bN = this.boton(W / 2 + 228, H - 64, 430, el.nueva, 0xf6efdc, nueva, el.nueva_sub);
      if (this.grupoFoco) this.grupoFoco([{ obj: bL, cb: leyenda }, { obj: bN, cb: nueva }], { inicial: 0, volver: function () { self.vistaTuCarrera(v); } });
    }
  };

  Object.assign(window.PampaMasterScene.prototype, VISTAS);
  window.PampaMasterScene.envolverVistas(["vistaCeremonia", "vistaCeremoniaArmada", "vistaCierre", "vistaTuCarrera", "vistaCreditos"]);
})();
