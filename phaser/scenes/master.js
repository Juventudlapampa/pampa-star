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
    /* PIEL P1: fondo radial (ver editor.js) */
    this.cameras.main.setBackgroundColor(this.piel().fondo_borde);
    this.fondoDePiel();
    this.T = window.PampaTemporada;
    this.Ma = window.PampaMaster;
    this.DIV = this.game.registry.get("divisiones");
    if (!this.T || !this.Ma || !this.DIV || !this.DIV.divisiones) {
      /* fallback tolerante: sin data no hay carrera — se vuelve al editor */
      this.add.text(W / 2, H / 2, "La carrera no pudo cargar\n(faltó data/divisiones.json)\n\nTOCÁ PARA VOLVER", { fontFamily: window.PF.texto, fontSize: "16px", color: "#f6efdc", align: "center" }).setOrigin(0.5);
      this.input.once("pointerdown", () => this.scene.start("editor"));
      return;
    }

    this.save = null;
    try { const r = localStorage.getItem("pampa_master_v1"); if (r) this.save = JSON.parse(r); } catch (e) { }

    /* ¿volvemos de un partido de la fecha? el resultado viene por el registry.
       (§4 inline: scene.restart() reusa la instancia — _ultimo se limpia acá
       para que el cartel del resultado viejo no reaparezca tras un restart) */
    this._ultimo = null;
    const res = this.game.registry.get("masterResultado");
    if (res && this.save && this.save.temporada) {
      this.game.registry.remove("masterResultado");
      this.T.jugarFecha(this.save.temporada, res.golesMio | 0, res.golesRival | 0);
      this._ultimo = res;
      /* ============ LA VIDA v2 · EL LUNES DESPUÉS ============
         Se recupera energía según lo que costó el partido, el ánimo sube o
         baja según el resultado, y si te dieron un golpe fuerte arrastrás una
         molestia que la semana que viene podés curar. Y arranca otra semana. */
      if (window.PampaSemana) {
        const cfgS = (this.game.registry.get("balance") || {}).semana || {};
        const lunes = window.PampaSemana.lunesDespues(this.save, res, cfgS);
        this.save.animo = lunes.animo;
        this.save.desgaste = lunes.desgaste;
        this.save.molestia = lunes.molestia;
        this.save.semana = null;          // la semana nueva se arma al entrar
        this.save.semanaResumen = null;
        this._lunes = lunes;
      }
      /* V8 A1: la racha alimenta los eventos condicionales; el modificador de
         la fecha se LIMPIA acá (nunca se arrastra al partido siguiente) */
      const dif = (res.golesMio | 0) - (res.golesRival | 0);
      this.save.racha = dif > 0 ? Math.max(1, (this.save.racha | 0) + 1) : dif < 0 ? Math.min(-1, (this.save.racha | 0) - 1) : 0;
      if (window.PampaVida) window.PampaVida.limpiar(this.save);
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
    this.add.text(x, y, texto, { fontFamily: window.PF.display, fontSize: "11px", color: "#0a1f13" }).setOrigin(0.5);
    r.on("pointerdown", (p, xx, yy, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); cb(); });
    return r;
  }

  /* ============ VISTA 1: ELEGIR EL CLUB (una vez) ============ */
  vistaElegir() {
    const W = this.scale.width, H = this.scale.height;
    this.add.text(W / 2, 60, "🏆 MODO MASTER", { fontFamily: window.PF.display, fontSize: "22px", color: "#ffd84d" }).setOrigin(0.5);
    this.add.text(W / 2, 96, "la carrera: de la PRIMERA B de tu pueblo al MUNDIAL", { fontFamily: window.PF.texto, fontSize: "13px", color: "#f6efdc" }).setOrigin(0.5);
    this.add.text(W / 2, 128, "el campeón SUBE de división — la escalera entera, adentro del juego", { fontFamily: window.PF.texto, fontSize: "11px", color: "#7ee08a" }).setOrigin(0.5).setAlpha(0.9);

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

    this.add.text(W / 2, 200, "TU CLUB", { fontFamily: window.PF.texto, fontSize: "12px", color: "#f6c11d" }).setOrigin(0.5);
    this.txtPueblo = this.add.text(W / 2, 240, "", { fontFamily: window.PF.display, fontSize: "14px", color: "#f6efdc" }).setOrigin(0.5);
    this.txtApodo = this.add.text(W / 2, 272, "", { fontFamily: window.PF.texto, fontSize: "12px", color: "#7ee08a" }).setOrigin(0.5);
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
      /* V8 A1 · EL ORIGEN: tres preguntas antes de la primera fecha */
      this.vistaOrigen(divId);
    };
    this._crearCarrera = (divId, origen) => {
      const club = "Club " + this.pueblos[this.pSel];
      this.save = {
        v: 1, club, pueblo: this.pueblos[this.pSel], division: divId, temporadaN: 1, titulos: [],
        origen: origen || null, bolsaEventos: [], modFecha: null, racha: 0,
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
      this.add.text(W / 2, H - 72, "el save del clásico queda RESPALDADO (pampa_star_v1_backup_pre_v7) y no se toca", { fontFamily: window.PF.texto, fontSize: "10px", color: "#7ee08a" }).setOrigin(0.5).setAlpha(0.9);
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

  /* ============ V8 A1 · PARTE 1: DE DÓNDE SALÍS (3 pantallas, una vez) ============
     Elegís por identificación: los números NO se muestran. Cada elección deja
     stats y una frase que el relator cita después. */
  vistaOrigen(divId, paso, elegidas) {
    const W = this.scale.width, H = this.scale.height;
    const V = window.PampaVida, D = this.game.registry.get("vida");
    if (!V || !D || !D.origen) { this._crearCarrera(divId, null); return; }
    paso = paso || 0; elegidas = elegidas || [];
    this.children.removeAll();
    const p = D.origen[paso];
    this.add.text(W / 2, 48, "TU HISTORIA · " + (paso + 1) + " de 3", { fontFamily: window.PF.display, fontSize: "13px", color: "#ffd84d" }).setOrigin(0.5);
    this.add.text(W / 2, 84, p.pregunta, { fontFamily: window.PF.texto, fontSize: "19px", color: "#f6efdc" }).setOrigin(0.5);
    p.opciones.forEach((o, i) => {
      const y = 150 + i * 88;
      const r = this.add.rectangle(W / 2, y, 720, 74, 0xf6efdc, 0.97).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
      this.add.text(W / 2, y - 12, (i + 1) + " · " + o.t, { fontFamily: window.PF.display, fontSize: "11px", color: "#0a1f13" }).setOrigin(0.5);
      this.add.text(W / 2, y + 16, o.sub || "", { fontFamily: window.PF.texto, fontSize: "14px", color: "#365a41" }).setOrigin(0.5);
      const elegir = () => {
        const nuevas = elegidas.concat([i]);
        if (paso < D.origen.length - 1) this.vistaOrigen(divId, paso + 1, nuevas);
        else this._crearCarrera(divId, V.aplicarOrigen(D, nuevas));
      };
      r.on("pointerdown", (pp, xx, yy, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); elegir(); });
      if (this.input.keyboard) this.input.keyboard.once("keydown-" + ["ONE", "TWO", "THREE", "FOUR"][i], elegir);
    });
    this.add.text(W / 2, H - 26, "elegí con el dedo o con las teclas 1-4 · no hay opción mala", { fontFamily: window.PF.texto, fontSize: "13px", color: "#7ee08a" }).setOrigin(0.5).setAlpha(0.9);
  }

  /* ============ V8 A1 · PARTE 2: LA SEMANA (antes de cada fecha) ============ */
  /* ============ LA VIDA v2 · LA SEMANA CON ENERGÍA ============
     Una sola pantalla: arriba los dos medidores con NÚMERO (nunca solo barra),
     en el medio las tres ranuras (lunes, miércoles, viernes), abajo el botón
     de jugar. Tres toques y estás en la cancha. El evento pampeano queda
     arriba, como sabor, y puede cambiar los costos de la semana. */
  vistaSemana(rival, alJugar) {
    const W = this.scale.width, H = this.scale.height;
    const S = window.PampaSemana, D = this.game.registry.get("semana");
    if (!S || !D) { this.vistaEvento(rival, alJugar); return; }
    const cfg = (this.game.registry.get("balance") || {}).semana || {};
    if (!this.save.semana) this.save.semana = S.nuevaSemana(this.save, cfg);
    const sem = this.save.semana;
    this._semRival = rival; this._semJugar = alJugar;
    this.children.removeAll();

    this.add.text(W / 2, 30, "LA SEMANA · fecha " + ((this.save.temporada.fecha | 0) + 1), { fontFamily: window.PF.display, fontSize: "13px", color: "#ffd84d" }).setOrigin(0.5);
    this.add.text(W / 2, 54, "contra " + rival, { fontFamily: window.PF.texto, fontSize: "14px", color: "#f6efdc" }).setOrigin(0.5);

    /* --- LOS DOS MEDIDORES: barra Y número, siempre --- */
    const medidor = (x, y, etiqueta, valor, color) => {
      this.add.text(x, y - 16, etiqueta + " " + Math.round(valor) + "/100", { fontFamily: window.PF.texto, fontSize: "14px", fontStyle: "bold", color: "#f6efdc" }).setOrigin(0, 0.5);
      const g = this.add.graphics();
      g.fillStyle(0x0a1f13, 0.9); g.fillRect(x, y, 300, 18);
      g.fillStyle(color, 1); g.fillRect(x + 2, y + 2, Math.max(0, Math.min(296, 296 * valor / 100)), 14);
      g.lineStyle(2, 0xf6efdc, 0.8); g.strokeRect(x, y, 300, 18);
    };
    medidor(W / 2 - 320, 96, "⚡ ENERGÍA", sem.energia, 0x7ee08a);
    medidor(W / 2 + 20, 96, "🧠 ÁNIMO", sem.animo, 0x4fc3f7);
    if (sem.molestia) this.add.text(W / 2, 132, "🩹 arrastrás una molestia de la fecha pasada", { fontFamily: window.PF.texto, fontSize: "13px", color: "#e3503e" }).setOrigin(0.5);

    /* --- EL EVENTO DE LA SEMANA (sabor + modificador) --- */
    if (this._semEvento === undefined) this._semEvento = this.eventoDeLaSemana(rival);
    const ev = this._semEvento;
    if (ev && ev.texto) {
      this.add.text(W / 2, 162, "📰 " + ev.texto, { fontFamily: window.PF.texto, fontSize: "14px", color: "#ffd84d", align: "center", wordWrap: { width: 760 } }).setOrigin(0.5);
    }

    /* --- LAS TRES RANURAS --- */
    const nombres = ["LUNES", "MIÉRCOLES", "VIERNES"];
    const anchoR = 250, x0 = W / 2 - anchoR - 14;
    nombres.forEach((n, i) => {
      /* O1 · las ranuras vivían en y=250, o sea ARRIBA: el otro de los dos
         grupos que no caían en la franja de decisión. Bajan al mismo lugar
         donde se elige en todas las demás pantallas. */
      const x = x0 + i * (anchoR + 14);
      const y = Math.round(window.PampaPiel.yDeOpcion(0, 2, 108, (this.game.registry.get("balance") || {}).piel));
      const elegida = sem.elegidas[i];
      const op = elegida ? D.opciones.find(o => o.id === elegida) : null;
      const r = this.add.rectangle(x, y, anchoR, 108, op ? 0x2e7d32 : 0x0a1f13, op ? 0.9 : 0.55)
        .setStrokeStyle(3, op ? 0x7ee08a : 0xf6efdc, 0.9);
      this.add.text(x, y - 38, n, { fontFamily: window.PF.display, fontSize: "10px", color: "#ffd84d" }).setOrigin(0.5);
      if (op) {
        this.add.text(x, y - 4, op.n, { fontFamily: window.PF.texto, fontSize: "15px", color: "#f6efdc", align: "center", wordWrap: { width: anchoR - 20 } }).setOrigin(0.5);
        this.add.text(x, y + 32, this.textoEfecto(op), { fontFamily: window.PF.texto, fontSize: "12px", color: "#dcd6c2", align: "center", wordWrap: { width: anchoR - 20 } }).setOrigin(0.5);
      } else {
        r.setInteractive({ useHandCursor: true });
        this.add.text(x, y + 2, "＋ elegí qué hacés", { fontFamily: window.PF.texto, fontSize: "15px", color: "#f6efdc" }).setOrigin(0.5);
        r.on("pointerdown", (pp, xx, yy, e2) => { e2 && e2.stopPropagation && e2.stopPropagation(); this.vistaElegirDia(i); });
        if (this.input.keyboard) this.input.keyboard.once("keydown-" + ["ONE", "TWO", "THREE"][i], () => this.vistaElegirDia(i));
      }
    });

    /* --- CÓMO LLEGÁS + JUGAR --- */
    const llega = S.comoLlegas(sem, cfg);
    this.add.text(W / 2, 206, "🗓 " + llega.resumen, { fontFamily: window.PF.texto, fontSize: "16px", color: "#7ee08a", align: "center" }).setOrigin(0.5);
    this.add.text(W / 2, 234, "vas a arrancar el partido con " + llega.aguanteInicial + " de aguante y " + llega.envionInicial + " de envión",
      { fontFamily: window.PF.texto, fontSize: "13px", color: "#dcd6c2" }).setOrigin(0.5);
    if (sem.espiado) this.add.text(W / 2, 258, "👀 los fuiste a ver: sabés a qué juegan", { fontFamily: window.PF.texto, fontSize: "13px", color: "#ffd84d" }).setOrigin(0.5);

    const listo = sem.elegidas.every(e => e);
    /* boton() toma x como CENTRO. Acá había un W/2-170 heredado del layout de
       DOS botones lado a lado de la vista de temporada, pero en la semana hay
       uno solo: quedaba corrido a la izquierda. Se ve en la captura vieja. */
    const yJugar = Math.round(window.PampaPiel.yDeOpcion(1, 2, 92, (this.game.registry.get("balance") || {}).piel));
    this.boton(W / 2, yJugar, 340, listo ? "▶ JUGAR LA FECHA" : "▶ JUGAR ASÍ (te queda semana sin usar)", listo ? 0x7ee08a : 0xdcd6c2, () => {
      this.cerrarSemana(alJugar);
    });
    this.add.text(W / 2, H - 22, "tres toques y a la cancha (teclas 1 · 2 · 3)", { fontFamily: window.PF.texto, fontSize: "12px", color: "#f6efdc" }).setOrigin(0.5).setAlpha(0.85);
  }
  /* el texto del efecto, en números claros (nunca solo color) */
  textoEfecto(o) {
    const t = [];
    if (o.energia_costo) t.push("−" + o.energia_costo + " energía");
    if (o.energia_recupera) t.push("+" + o.energia_recupera + " energía");
    if (o.animo) t.push((o.animo > 0 ? "+" : "") + o.animo + " ánimo");
    if (o.stat) t.push("+" + (o.stat_mas || 1) + " " + (o.stat === "azar" ? "a una stat al azar" : o.stat));
    if (o.cura_molestia) t.push("cura la molestia");
    if (o.espia_rival) t.push("ves cómo juega el rival");
    if (o.evita) t.push("te sacás el problema de encima");
    if (o.riesgo_golpe) t.push("riesgo de llegar golpeado");
    return t.join(" · ");
  }
  /* la elección de UN día: las opciones disponibles, con su costo a la vista */
  vistaElegirDia(ranura) {
    const W = this.scale.width, H = this.scale.height;
    const S = window.PampaSemana, D = this.game.registry.get("semana");
    const cfg = (this.game.registry.get("balance") || {}).balance || {};
    const bal = (this.game.registry.get("balance") || {}).semana || {};
    const sem = this.save.semana;
    const ctx = { origen: (this.save.origen && this.save.origen.marcas && this.save.origen.marcas[0]) || null };
    const ops = S.opcionesPara(D, sem, ctx);
    this.children.removeAll();
    this.add.text(W / 2, 34, ["LUNES", "MIÉRCOLES", "VIERNES"][ranura] + " · ¿qué hacés?", { fontFamily: window.PF.display, fontSize: "13px", color: "#ffd84d" }).setOrigin(0.5);
    this.add.text(W / 2, 60, "te quedan " + sem.energia + " de energía", { fontFamily: window.PF.texto, fontSize: "14px", color: "#f6efdc" }).setOrigin(0.5);
    const porFila = 2, ancho = 380, alto = 74;
    ops.slice(0, 8).forEach((o, i) => {
      const cx = W / 2 + (i % porFila === 0 ? -ancho / 2 - 10 : ancho / 2 + 10);
      const cy = 118 + Math.floor(i / porFila) * (alto + 12);
      const alcanza = (o.energia_costo || 0) <= sem.energia;
      const r = this.add.rectangle(cx, cy, ancho, alto, alcanza ? 0xf6efdc : 0x555f57, alcanza ? 0.97 : 0.6).setStrokeStyle(3, 0x0a1f13);
      this.add.text(cx, cy - 16, o.n, { fontFamily: window.PF.display, fontSize: "10px", color: "#0a1f13" }).setOrigin(0.5);
      this.add.text(cx, cy + 6, o.sub, { fontFamily: window.PF.texto, fontSize: "12px", color: "#365a41" }).setOrigin(0.5);
      this.add.text(cx, cy + 26, this.textoEfecto(o), { fontFamily: window.PF.texto, fontSize: "12px", color: alcanza ? "#0a1f13" : "#e3503e", align: "center", wordWrap: { width: ancho - 16 } }).setOrigin(0.5);
      if (!alcanza) return;
      r.setInteractive({ useHandCursor: true });
      r.on("pointerdown", (pp, xx, yy, e2) => {
        e2 && e2.stopPropagation && e2.stopPropagation();
        const nueva = S.elegir(D, sem, ranura, o.id, bal);
        if (nueva) {
          this.save.semana = nueva;
          if (o.riesgo_golpe && Math.random() < o.riesgo_golpe) this.save.semana.molestia = true;
          this.guardar();
        }
        this.vistaSemana(this._semRival, this._semJugar);
      });
    });
    this.boton(W / 2 - 110, H - 60, 220, "◀ VOLVER", 0xdcd6c2, () => this.vistaSemana(this._semRival, this._semJugar));
  }
  /* el evento pampeano de la semana: sabor arriba + posible modificador */
  eventoDeLaSemana(rival) {
    const V = window.PampaVida, D = this.game.registry.get("vida"), t = this.save.temporada;
    if (!V || !D || !D.eventos) return null;
    const pos = this.T.posiciones(t);
    const idxMio = pos.findIndex(f => f.equipo === t.miClub), idxRival = pos.findIndex(f => f.equipo === rival);
    const ctx = {
      fecha: t.fecha, division: this.save.division,
      clasico: (this.save.pueblo && rival.indexOf(this.save.pueblo) >= 0) || false,
      posMia: idxMio + 1, posRival: idxRival + 1, racha: this.save.racha | 0,
      marcas: (this.save.origen && this.save.origen.marcas) || []
    };
    const sel = V.elegirEvento(D, this.save.bolsaEventos || [], ctx, this.Ma.hashClub(this.save.club) + t.fecha * 7919 + this.save.temporadaN * 13);
    if (!sel) return null;
    this.save.bolsaEventos = sel.vistos;
    return sel.evento;
  }
  /* cerrar la semana: lo que elegiste se convierte en cómo llegás al domingo */
  cerrarSemana(alJugar) {
    const S = window.PampaSemana;
    const cfg = (this.game.registry.get("balance") || {}).semana || {};
    const sem = this.save.semana || S.nuevaSemana(this.save, cfg);
    const llega = S.comoLlegas(sem, cfg);
    /* los permanentes se guardan en la carrera (chiquitos, para siempre) */
    this.save.mejoras = this.save.mejoras || {};
    Object.keys(sem.permanentes || {}).forEach(k => {
      this.save.mejoras[k] = (this.save.mejoras[k] || 0) + sem.permanentes[k];
    });
    this.save.semanaResumen = llega;
    this._semEvento = undefined;
    this.guardar();
    alJugar();
  }

  vistaEvento(rival, alJugar) {
    const W = this.scale.width, H = this.scale.height;
    const V = window.PampaVida, D = this.game.registry.get("vida"), t = this.save.temporada;
    if (!V || !D || !D.eventos) { alJugar(); return; }
    const pos = this.T.posiciones(t);
    const idxMio = pos.findIndex(f => f.equipo === t.miClub), idxRival = pos.findIndex(f => f.equipo === rival);
    const ctx = {
      fecha: t.fecha, division: this.save.division,
      clasico: (this.save.pueblo && rival.indexOf(this.save.pueblo) >= 0) || false,
      posMia: idxMio + 1, posRival: idxRival + 1, racha: this.save.racha | 0,
      marcas: (this.save.origen && this.save.origen.marcas) || []
    };
    const sel = V.elegirEvento(D, this.save.bolsaEventos || [], ctx, this.Ma.hashClub(this.save.club) + t.fecha * 7919 + this.save.temporadaN * 13);
    if (!sel) { alJugar(); return; }
    this.save.bolsaEventos = sel.vistos;
    this.children.removeAll();
    this.add.text(W / 2, 54, "LA SEMANA", { fontFamily: window.PF.display, fontSize: "13px", color: "#ffd84d" }).setOrigin(0.5);
    this.add.text(W / 2, 132, sel.evento.texto, { fontFamily: window.PF.texto, fontSize: "20px", color: "#f6efdc", align: "center", wordWrap: { width: 780 }, lineSpacing: 8 }).setOrigin(0.5);
    sel.evento.opciones.forEach((o, i) => {
      const y = 280 + i * 92;
      const r = this.add.rectangle(W / 2, y, 700, 72, 0xf6efdc, 0.97).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
      this.add.text(W / 2, y, (i + 1) + " · " + o.texto, { fontFamily: window.PF.display, fontSize: "11px", color: "#0a1f13" }).setOrigin(0.5);
      const elegir = () => {
        this.save.modFecha = V.aplicarEleccion(sel.evento, i);
        this.guardar();
        alJugar();
      };
      r.on("pointerdown", (pp, xx, yy, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); elegir(); });
      if (this.input.keyboard) this.input.keyboard.once("keydown-" + ["ONE", "TWO"][i], elegir);
    });
    this.add.text(W / 2, H - 26, "dos toques y a la cancha (teclas 1-2)", { fontFamily: window.PF.texto, fontSize: "13px", color: "#7ee08a" }).setOrigin(0.5).setAlpha(0.9);
  }

  /* ============ VISTA 2: LA TEMPORADA ============ */
  vistaTemporada() {
    const W = this.scale.width, H = this.scale.height;
    const t = this.save.temporada, T = this.T, Ma = this.Ma;
    const div = Ma.DIVISIONES.find(d => d.id === this.save.division) || Ma.DIVISIONES[0];
    this.add.text(W / 2, 34, "🏆 " + div.n + " · TEMPORADA " + this.save.temporadaN, { fontFamily: window.PF.display, fontSize: "14px", color: "#ffd84d" }).setOrigin(0.5);
    this.add.text(W / 2, 60, this.save.club + (this.save.titulos.length ? " · ★".repeat(Math.min(5, this.save.titulos.length)) + " " + this.save.titulos.length + " títulos" : ""), { fontFamily: window.PF.texto, fontSize: "12px", color: "#f6efdc" }).setOrigin(0.5);

    /* resultado de la última fecha jugada (si venimos del partido) */
    if (this._ultimo) {
      const gano = this._ultimo.golesMio > this._ultimo.golesRival;
      const empate = this._ultimo.golesMio === this._ultimo.golesRival;
      this.add.text(W / 2, 84, (gano ? "✔ GANASTE " : empate ? "= EMPATASTE " : "✘ PERDISTE ") + this._ultimo.golesMio + "-" + this._ultimo.golesRival, { fontFamily: window.PF.texto, fontSize: "12px", fontStyle: "bold", color: gano ? "#7ee08a" : empate ? "#f6c11d" : "#e3503e" }).setOrigin(0.5);
    }

    /* LA TABLA (monospace, forma antes que color: ► marca mi fila) */
    const pos = T.posiciones(t);
    const x0 = 70, y0 = 116;
    /* A4 · la zona de descenso se marca con FORMA (▼ + línea de corte), no con
       color: el color solo no sirve. La zona no existe en la división más baja. */
    const cfgP = (this.game.registry.get("balance") || {}).partido || {};
    const idsDiv = Ma.DIVISIONES.map(d => d.id);
    const hayAbajo = idsDiv.indexOf(t.division) > 0;
    const zona = hayAbajo ? T.zonaDescenso(t, cfgP) : [];
    this.add.text(x0, y0 - 2, "#  EQUIPO              PJ  G  E  P   GF  GC  DG  PTS", { fontFamily: window.PF.texto, fontSize: "12px", color: "#f6c11d" });
    pos.forEach((f, i) => {
      const mio = f.equipo === t.miClub;
      const enZona = zona.indexOf(i + 1) >= 0;
      const dg = f.gf - f.gc;
      const linea = String(i + 1).padStart(2) + (enZona ? "▼" : " ") + (mio ? "►" : " ") + f.equipo.slice(0, 17).padEnd(17) + " " +
        String(f.pj).padStart(2) + " " + String(f.g).padStart(2) + " " + String(f.e).padStart(2) + " " + String(f.p).padStart(2) + "  " +
        String(f.gf).padStart(3) + " " + String(f.gc).padStart(3) + " " + String(dg).padStart(3) + "  " + String(f.pts).padStart(3);
      const y = y0 + 18 + i * 19;
      /* N3 · el escudo del club, generado por código a partir del nombre.
         Chico (15 px) va sin inicial a propósito: a ese tamaño la letra no se
         lee y ensucia — manda la silueta, que es lo que distingue. */
      if (window.PampaEscudosUI && window.PampaEscudos) {
        const esc = window.PampaEscudosUI.deClub(this, f.equipo, pos.map(p => p.equipo));
        /* a la IZQUIERDA del número y no al lado del nombre: la tabla es
           monospace con padStart y meterle un objeto en el medio le rompe la
           alineación a todas las columnas. Acá el margen ya estaba libre. */
        window.PampaEscudosUI.dibujar(this, x0 - 20, y + 6, 15, esc);
      }
      /* la línea de corte: se ve DÓNDE empieza la zona aunque no leas los ▼.
         Va en y-4 y no en el medio del paso (y-9): el texto tiene origen
         arriba-izquierda, así que a media distancia la línea TACHA la fila
         de arriba en vez de separarla. Verificado en captura. */
      if (enZona && zona.indexOf(i) < 0) this.add.rectangle(x0 + 230, y - 4, 470, 1, 0xe3503e).setOrigin(0.5, 0.5).setAlpha(0.7);
      this.add.text(x0, y, linea, { fontFamily: window.PF.texto, fontSize: "12px", fontStyle: mio ? "bold" : "normal", color: mio ? "#ffd84d" : "#f6efdc" });
    });
    /* A4 · el aviso: ver venir el golpe ANTES de la última fecha */
    if (T.enZonaDescenso(t, idsDiv, cfgP)) {
      const faltan = t.fixture.length - t.fecha;
      const abajo = (Ma.DIVISIONES[idsDiv.indexOf(t.division) - 1] || {}).n || "abajo";
      this.add.text(W / 2, y0 - 22,
        faltan > 0
          ? "▼ ZONA DE DESCENSO · " + T.miPosicion(t) + "º · si termina así te vas a " + abajo + " (faltan " + faltan + ")"
          : "▼ ZONA DE DESCENSO · " + T.miPosicion(t) + "º",
        /* 14 y no 12 como la tabla: es el aviso más importante de la pantalla y
           a 12 lógicos son 8.7 px reales en teléfono (la deuda de legibilidad) */
        { fontFamily: window.PF.texto, fontSize: "14px", fontStyle: "bold", color: "#e3503e" }).setOrigin(0.5);
    }

    if (!T.terminada(t)) {
      /* la PRÓXIMA fecha: rival + su perfil de IA con nombre (sabés a qué venís) */
      const mp = T.miPartido(t);
      const fechaTxt = "FECHA " + (t.fecha + 1) + " de " + t.fixture.length;
      if (mp) {
        const rival = mp.local === t.miClub ? mp.visita : mp.local;
        const localia = mp.local === t.miClub ? "(de local)" : "(de visita)";
        const perfil = Ma.perfilRival(rival);
        const tFecha = this.add.text(W / 2 + 16, H - 150, fechaTxt + " · vs " + rival.toUpperCase() + " " + localia, { fontFamily: window.PF.texto, fontSize: "13px", fontStyle: "bold", color: "#f6efdc" }).setOrigin(0.5);
        /* N3 · acá el escudo va GRANDE y con inicial: es el rival del domingo,
           la única pantalla donde mirás a un club a la cara */
        if (window.PampaEscudosUI && window.PampaEscudos) {
          const escR = window.PampaEscudosUI.deClub(this, rival, pos.map(p => p.equipo));
          window.PampaEscudosUI.dibujar(this, tFecha.x - tFecha.width / 2 - 24, H - 150, 30, escR);
        }
        this.add.text(W / 2, H - 128, "un equipo " + perfil.n, { fontFamily: window.PF.texto, fontSize: "11px", color: "#7ee08a" }).setOrigin(0.5);
        this.boton(W / 2 - 170, H - 80, 300, "▶ JUGAR LA FECHA", 0x7ee08a, () => {
          /* V8 A1: primero LA SEMANA (dos toques), después la cancha */
          this.vistaSemana(rival, () => {
            this.game.registry.set("masterPartido", {
              rival, division: this.save.division,
              mod: this.save.modFecha || null,
              origen: this.save.origen || null,
              semana: this.save.semanaResumen || null,
              mejoras: this.save.mejoras || null
            });
            this.scene.start("match");
          });
        });
      } else {
        this.add.text(W / 2, H - 140, fechaTxt + " · FECHA LIBRE (descansás)", { fontFamily: window.PF.texto, fontSize: "13px", color: "#f6efdc" }).setOrigin(0.5);
        this.boton(W / 2 - 170, H - 80, 300, "▶ PASAR LA FECHA", 0x7ee08a, () => {
          this.T.jugarFecha(t, null, null);
          this.guardar();
          this.scene.restart();
        });
      }
      this.boton(W / 2 + 170, H - 80, 280, "✎ EDITOR / PINTA", 0xf6efdc, () => this.scene.start("editor"));
    } else {
      /* FIN DE TEMPORADA: el veredicto de la escalera */
      const v = T.veredicto(t, Ma.DIVISIONES.map(d => d.id), cfgP);
      let msj, color;
      if (v.gloria) { msj = "🏆 ¡CAMPEÓN DEL MUNDO! LA GLORIA ETERNA"; color = "#ffd84d"; }
      else if (v.asciende) { msj = "🏆 ¡CAMPEÓN! SUBÍS A " + (Ma.DIVISIONES.find(d => d.id === v.proximaDivision) || {}).n; color = "#ffd84d"; }
      /* A4 · con todas las letras: se dice que se descendió y a dónde */
      else if (v.desciende) { msj = "▼ DESCENSO · terminaste " + v.posicion + "º y bajás a " + (Ma.DIVISIONES.find(d => d.id === v.proximaDivision) || {}).n; color = "#e3503e"; }
      else { msj = "Terminaste " + v.posicion + "º — otra temporada en " + div.n; color = "#f6efdc"; }
      this.add.text(W / 2, H - 140, msj, { fontFamily: window.PF.display, fontSize: "11px", color }).setOrigin(0.5);
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

/* PIEL P2: las pantallas de esta escena se arman de una sola vez (no hay
   update que barra), así que se visten los botones al terminar de construir
   cada vista. Se envuelven los métodos en vez de tocar su cuerpo: así el día
   que se agregue una vista nueva, basta con sumarla a esta lista. */
["create", "vistaSemana", "vistaElegirDia", "vistaFecha", "vistaTabla", "vistaResultado"]
  .forEach(function (n) {
    var orig = window.PampaMasterScene.prototype[n];
    if (typeof orig !== "function") return;
    window.PampaMasterScene.prototype[n] = function () {
      var r = orig.apply(this, arguments);
      if (this.vestirPendientes) this.vestirPendientes();
      return r;
    };
  });

