/* ============================================================================
   PAMPA STAR · phaser/scenes/master.js — EL MODO MASTER (V7 §2)
   La carrera ADENTRO del Phaser: elegís tu club de pueblo, jugás la
   temporada de tu división (fixture real de 18 fechas, tabla completa,
   los partidos ajenos se simulan deterministas), y el CAMPEÓN sube un
   escalón de la escalera del potrero al Mundial (divisiones FIJAS de
   logic/master.js). Guardado propio `pampa_master_v1`, retrocompatible:
   no toca el save clásico ni el de avatares. El partido de la fecha se
   juega con el motor de siempre (escena match) — esta escena le pasa el
   rival y recibe el resultado por el registry.
   ========================================================================== */
window.PampaMasterScene = class PampaMasterScene extends Phaser.Scene {
  constructor() { super("master"); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.setBackgroundColor("#06120b");
    this.T = window.PampaTemporada;
    this.Ma = window.PampaMaster;
    this.DIV = this.game.registry.get("divisiones");
    if (!this.T || !this.Ma || !this.DIV || !this.DIV.divisiones) {
      /* fallback tolerante: sin data no hay carrera — se vuelve al editor */
      this.add.text(W / 2, H / 2, "La carrera no pudo cargar\n(faltó data/divisiones.json)\n\nTOCÁ PARA VOLVER", { fontFamily: "monospace", fontSize: "16px", color: "#f6efdc", align: "center" }).setOrigin(0.5);
      this.input.once("pointerdown", () => this.scene.start("editor"));
      return;
    }

    this.save = null;
    try { const r = localStorage.getItem("pampa_master_v1"); if (r) this.save = JSON.parse(r); } catch (e) { }

    /* ¿volvemos de un partido de la fecha? el resultado viene por el registry */
    const res = this.game.registry.get("masterResultado");
    if (res && this.save && this.save.temporada) {
      this.game.registry.remove("masterResultado");
      this.T.jugarFecha(this.save.temporada, res.golesMio | 0, res.golesRival | 0);
      this._ultimo = res;
      this.guardar();
    }

    if (!this.save) this.vistaElegir();
    else this.vistaTemporada();
  }

  guardar() {
    try { localStorage.setItem("pampa_master_v1", JSON.stringify(this.save)); } catch (e) { }
  }
  /* V7 §3 LA MUDANZA: antes de que la carrera Phaser escriba por primera vez,
     el save CLÁSICO entero se respalda UNA vez (nunca se pisa el backup) */
  backupClasico() {
    try {
      const c = localStorage.getItem("pampa_star_v1");
      if (c && !localStorage.getItem("pampa_star_v1_backup_pre_v7")) {
        localStorage.setItem("pampa_star_v1_backup_pre_v7", c);
      }
    } catch (e) { }
  }

  /* ---- botón grande accesible (texto + borde, no solo color) ---- */
  boton(x, y, w, texto, bg, cb) {
    const r = this.add.rectangle(x, y, w, 52, bg, 1).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
    this.add.text(x, y, texto, { fontFamily: "'Press Start 2P',monospace", fontSize: "11px", color: "#0a1f13" }).setOrigin(0.5);
    r.on("pointerdown", (p, xx, yy, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); cb(); });
    return r;
  }

  /* ============ VISTA 1: ELEGIR EL CLUB (una vez) ============ */
  vistaElegir() {
    const W = this.scale.width, H = this.scale.height;
    this.add.text(W / 2, 60, "🏆 MODO MASTER", { fontFamily: "'Press Start 2P',monospace", fontSize: "22px", color: "#ffd84d" }).setOrigin(0.5);
    this.add.text(W / 2, 96, "la carrera: de la PRIMERA B de tu pueblo al MUNDIAL", { fontFamily: "monospace", fontSize: "13px", color: "#f6efdc" }).setOrigin(0.5);
    this.add.text(W / 2, 128, "el campeón SUBE de división — la escalera entera, adentro del juego", { fontFamily: "monospace", fontSize: "11px", color: "#7ee08a" }).setOrigin(0.5).setAlpha(0.9);

    /* tu club: pueblo del roster con su apodo (stepper con flechas dibujadas) */
    const roster = this.game.registry.get("roster");
    this.pueblos = roster && roster.clubes_por_pueblo ? Object.keys(roster.clubes_por_pueblo) : ["Winifreda", "Toay", "General Pico", "Santa Rosa", "Victorica"];
    this.pSel = 0;
    /* si el save clásico tiene club, arranca ahí */
    try {
      const c = JSON.parse(localStorage.getItem("pampa_star_v1"));
      if (c && c.origen && c.origen.localidad) {
        const i = this.pueblos.indexOf(c.origen.localidad);
        if (i >= 0) this.pSel = i;
      }
    } catch (e) { }

    this.add.text(W / 2, 200, "TU CLUB", { fontFamily: "monospace", fontSize: "12px", color: "#f6c11d" }).setOrigin(0.5);
    this.txtPueblo = this.add.text(W / 2, 240, "", { fontFamily: "'Press Start 2P',monospace", fontSize: "14px", color: "#f6efdc" }).setOrigin(0.5);
    this.txtApodo = this.add.text(W / 2, 272, "", { fontFamily: "monospace", fontSize: "12px", color: "#7ee08a" }).setOrigin(0.5);
    const flecha = (x, d) => {
      const r = this.add.rectangle(x, 240, 56, 48, 0xf6efdc, 1).setStrokeStyle(2, 0x0a1f13).setInteractive({ useHandCursor: true });
      const g = this.add.graphics(); g.fillStyle(0x0a1f13, 1);
      if (d < 0) g.fillTriangle(x - 10, 240, x + 8, 229, x + 8, 251);
      else g.fillTriangle(x + 10, 240, x - 8, 229, x - 8, 251);
      r.on("pointerdown", () => { this.pSel = (this.pSel + d + this.pueblos.length) % this.pueblos.length; this.pintarPueblo(); });
    };
    flecha(W / 2 - 220, -1); flecha(W / 2 + 220, 1);
    if (this.input.keyboard) {
      this.input.keyboard.on("keydown-LEFT", () => { this.pSel = (this.pSel + this.pueblos.length - 1) % this.pueblos.length; this.pintarPueblo(); });
      this.input.keyboard.on("keydown-RIGHT", () => { this.pSel = (this.pSel + 1) % this.pueblos.length; this.pintarPueblo(); });
    }
    this.pintarPueblo();

    const arrancarEn = (divId) => {
      this.backupClasico();   // V7 §3: la mudanza respalda el clásico primero
      const club = "Club " + this.pueblos[this.pSel];
      this.save = {
        v: 1, club, division: divId, temporadaN: 1, titulos: [],
        temporada: this.T.crear({
          division: divId, miClub: club,
          rivales: this.DIV.divisiones[divId].rivales,
          semilla: this.Ma.hashClub(club) * 31 + 1
        })
      };
      this.guardar();
      this.scene.restart();
    };
    this.boton(W / 2, H - 156, 420, "▶ ARRANCAR EN LA PRIMERA B", 0x7ee08a, () => arrancarEn(this.Ma.DIVISIONES[0].id));
    /* V7 §3 LA MUDANZA: si el clásico tiene carrera, se puede IMPORTAR — tu
       nivel de allá te ubica en la división que corresponde (con backup) */
    let clasico = null;
    try { clasico = JSON.parse(localStorage.getItem("pampa_star_v1")); } catch (e) { }
    if (clasico && clasico.nivel) {
      const divImp = this.Ma.divisionPorNivel(clasico.nivel | 0);
      this.boton(W / 2, H - 100, 480, "⬆ IMPORTAR TU CARRERA (nivel " + (clasico.nivel | 0) + " → " + divImp.n + ")", 0xffd84d, () => arrancarEn(divImp.id));
      this.add.text(W / 2, H - 72, "el save del clásico queda RESPALDADO (pampa_star_v1_backup_pre_v7) y no se toca", { fontFamily: "monospace", fontSize: "10px", color: "#7ee08a" }).setOrigin(0.5).setAlpha(0.9);
    }
    this.boton(W / 2, H - 40, 300, "✎ VOLVER AL EDITOR", 0xf6efdc, () => this.scene.start("editor"));
  }
  pintarPueblo() {
    const p = this.pueblos[this.pSel];
    const roster = this.game.registry.get("roster");
    const apodo = roster && roster.clubes_por_pueblo && roster.clubes_por_pueblo[p] ? roster.clubes_por_pueblo[p].apodo : "";
    this.txtPueblo.setText("◀ Club " + p + " ▶");
    this.txtApodo.setText(apodo ? '"' + apodo + '" juega acá' : "");
  }

  /* ============ VISTA 2: LA TEMPORADA ============ */
  vistaTemporada() {
    const W = this.scale.width, H = this.scale.height;
    const t = this.save.temporada, T = this.T, Ma = this.Ma;
    const div = Ma.DIVISIONES.find(d => d.id === this.save.division) || Ma.DIVISIONES[0];
    this.add.text(W / 2, 34, "🏆 " + div.n + " · TEMPORADA " + this.save.temporadaN, { fontFamily: "'Press Start 2P',monospace", fontSize: "14px", color: "#ffd84d" }).setOrigin(0.5);
    this.add.text(W / 2, 60, this.save.club + (this.save.titulos.length ? " · ★".repeat(Math.min(5, this.save.titulos.length)) + " " + this.save.titulos.length + " títulos" : ""), { fontFamily: "monospace", fontSize: "12px", color: "#f6efdc" }).setOrigin(0.5);

    /* resultado de la última fecha jugada (si venimos del partido) */
    if (this._ultimo) {
      const gano = this._ultimo.golesMio > this._ultimo.golesRival;
      const empate = this._ultimo.golesMio === this._ultimo.golesRival;
      this.add.text(W / 2, 84, (gano ? "✔ GANASTE " : empate ? "= EMPATASTE " : "✘ PERDISTE ") + this._ultimo.golesMio + "-" + this._ultimo.golesRival, { fontFamily: "monospace", fontSize: "12px", fontStyle: "bold", color: gano ? "#7ee08a" : empate ? "#f6c11d" : "#e3503e" }).setOrigin(0.5);
    }

    /* LA TABLA (monospace, forma antes que color: ► marca mi fila) */
    const pos = T.posiciones(t);
    const x0 = 70, y0 = 116;
    this.add.text(x0, y0 - 2, "#  EQUIPO              PJ  G  E  P   GF  GC  DG  PTS", { fontFamily: "monospace", fontSize: "12px", color: "#f6c11d" });
    pos.forEach((f, i) => {
      const mio = f.equipo === t.miClub;
      const dg = f.gf - f.gc;
      const linea = String(i + 1).padStart(2) + " " + (mio ? "►" : " ") + f.equipo.slice(0, 18).padEnd(18) + " " +
        String(f.pj).padStart(2) + " " + String(f.g).padStart(2) + " " + String(f.e).padStart(2) + " " + String(f.p).padStart(2) + "  " +
        String(f.gf).padStart(3) + " " + String(f.gc).padStart(3) + " " + String(dg).padStart(3) + "  " + String(f.pts).padStart(3);
      this.add.text(x0, y0 + 18 + i * 19, linea, { fontFamily: "monospace", fontSize: "12px", fontStyle: mio ? "bold" : "normal", color: mio ? "#ffd84d" : "#f6efdc" });
    });

    if (!T.terminada(t)) {
      /* la PRÓXIMA fecha: rival + su perfil de IA con nombre (sabés a qué venís) */
      const mp = T.miPartido(t);
      const fechaTxt = "FECHA " + (t.fecha + 1) + " de " + t.fixture.length;
      if (mp) {
        const rival = mp.local === t.miClub ? mp.visita : mp.local;
        const localia = mp.local === t.miClub ? "(de local)" : "(de visita)";
        const perfil = Ma.perfilRival(rival);
        this.add.text(W / 2, H - 150, fechaTxt + " · vs " + rival.toUpperCase() + " " + localia, { fontFamily: "monospace", fontSize: "13px", fontStyle: "bold", color: "#f6efdc" }).setOrigin(0.5);
        this.add.text(W / 2, H - 128, "un equipo " + perfil.n, { fontFamily: "monospace", fontSize: "11px", color: "#7ee08a" }).setOrigin(0.5);
        this.boton(W / 2 - 170, H - 80, 300, "▶ JUGAR LA FECHA", 0x7ee08a, () => {
          this.game.registry.set("masterPartido", { rival, division: this.save.division });
          this.scene.start("match");
        });
      } else {
        this.add.text(W / 2, H - 140, fechaTxt + " · FECHA LIBRE (descansás)", { fontFamily: "monospace", fontSize: "13px", color: "#f6efdc" }).setOrigin(0.5);
        this.boton(W / 2 - 170, H - 80, 300, "▶ PASAR LA FECHA", 0x7ee08a, () => {
          this.T.jugarFecha(t, null, null);
          this.guardar();
          this.scene.restart();
        });
      }
      this.boton(W / 2 + 170, H - 80, 280, "✎ EDITOR / PINTA", 0xf6efdc, () => this.scene.start("editor"));
    } else {
      /* FIN DE TEMPORADA: el veredicto de la escalera */
      const v = T.veredicto(t, Ma.DIVISIONES.map(d => d.id));
      let msj, color;
      if (v.gloria) { msj = "🏆 ¡CAMPEÓN DEL MUNDO! LA GLORIA ETERNA"; color = "#ffd84d"; }
      else if (v.asciende) { msj = "🏆 ¡CAMPEÓN! SUBÍS A " + (Ma.DIVISIONES.find(d => d.id === v.proximaDivision) || {}).n; color = "#ffd84d"; }
      else { msj = "Terminaste " + v.posicion + "º — otra temporada en " + div.n; color = "#f6efdc"; }
      this.add.text(W / 2, H - 140, msj, { fontFamily: "'Press Start 2P',monospace", fontSize: "11px", color }).setOrigin(0.5);
      this.boton(W / 2 - 170, H - 80, 320, "▶ NUEVA TEMPORADA", 0x7ee08a, () => {
        if (v.campeon) this.save.titulos.push({ division: this.save.division, temporada: this.save.temporadaN });
        this.save.division = v.proximaDivision;
        this.save.temporadaN++;
        this.save.temporada = this.T.crear({
          division: this.save.division, miClub: this.save.club,
          rivales: this.DIV.divisiones[this.save.division].rivales,
          semilla: this.Ma.hashClub(this.save.club) * 31 + this.save.temporadaN
        });
        this.guardar();
        this.scene.restart();
      });
      this.boton(W / 2 + 170, H - 80, 280, "✎ EDITOR / PINTA", 0xf6efdc, () => this.scene.start("editor"));
    }
  }
};
