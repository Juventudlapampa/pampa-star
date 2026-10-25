/* ============================================================================
   PAMPA STAR · phaser/scenes/titulo.js — LA PANTALLA DE TÍTULO

   Pedido de Rodri del 20/oct: después de la intro aparecían "¡A LA CANCHA!"
   y "🏆 CARRERA" sueltos en el editor de la pinta, y "no es un juego así".
   Ahora la intro trae acá: el logo y tres opciones grandes.

     JUGAR CARRERA    el Modo Master de siempre (con carrera nueva: el club,
                      la pinta y la entrevista, como antes)
     PARTIDO RÁPIDO   un partido suelto contra un rival de la Primera B; no
                      toca la carrera guardada (registry partidoRapido, que
                      match.js lee cuando no hay masterPartido)
     OPCIONES         sonido, volúmenes, estilo de música, duración de los
                      partidos y velocidad (logic/opciones.js)

   Teclado (flechas y ENTER), mouse y dedo, con el cursor del resto del juego.
   ========================================================================== */
window.PampaTitulo = class PampaTitulo extends Phaser.Scene {
  constructor() { super("titulo"); }

  init() {
    this._vista = "menu";
    this._atajos = [];
    this._fila = 0;
    this._aviso = "";
  }

  preload() {
    if (!this.textures.exists("d_logo")) this.load.image("d_logo", "../assets/ui/pampa-star-logo.webp");
  }

  create() {
    this.entrarDesdeNegro();
    this.BAL = this.game.registry.get("balance") || {};
    this.O = window.PampaOpciones;
    this.op = this.O.leer(localStorage, this.BAL, this.game.registry.get("audio"));
    const alAtrasDelTelefono = (ev) => { if (ev && ev.escena === "titulo") this.alAtras(ev.decision); };
    this.game.events.on("atras", alAtrasDelTelefono);
    this.events.once("shutdown", () => { this.game.events.off("atras", alAtrasDelTelefono); this.soltarAtajos(); });
    this.vistaMenu();
    /* 20/oct, Rodri: el estilo se elegía a ciegas. El título y OPCIONES
       suenan la espera del estilo elegido (en CUARTETO, ROCK y RAP es el
       tema de la semana), y al cambiar de estilo cambia acá mismo */
    this.pedirMusica("espera");
  }

  /* el atrás del teléfono: en OPCIONES vuelve al título (logic/atras.js);
     en el título pide confirmar la salida, como hacía el editor */
  estadoAtras() { return { escena: "titulo", vista: this._vista }; }
  alAtras(d) {
    if (d !== "volver" || this._vista !== "opciones") return false;
    const S = window.PampaSFX; if (S && S.ui) S.ui("volver");
    this.vistaMenu("opciones");
    return true;
  }

  atajo(tecla, fn) {
    if (!this.input.keyboard) return;
    this.input.keyboard.on("keydown-" + tecla, fn);
    this._atajos.push(["keydown-" + tecla, fn]);
  }
  soltarAtajos() {
    const kb = this.input && this.input.keyboard;
    this._atajos.forEach((p) => { if (kb) kb.off(p[0], p[1]); });
    this._atajos = [];
  }
  vaciar() {
    if (this.cerrarFoco) this.cerrarFoco();
    this.soltarAtajos();
    this.children.list.slice().forEach((o) => { if (o && o.destroy) o.destroy(); });
    this.cameras.main.setBackgroundColor(this.piel().fondo_borde);
    this.fondoDePiel();
  }

  /* ============ EL TÍTULO ============ */
  /* foco: "opciones" al volver de OPCIONES, para que el cursor quede donde estaba */
  vistaMenu(foco) {
    this._vista = "menu";
    this.vaciar();
    const W = this.scale.width, H = this.scale.height;
    /* el logo a la izquierda y las opciones a la derecha: la columna de
       botones queda bajo la mano derecha en el teléfono apaisado */
    if (this.textures.exists("d_logo")) {
      const l = this.add.image(250, H / 2 - 6, "d_logo");
      l.setScale(Math.min(440 / l.width, 430 / l.height));
    } else {
      this.add.text(250, H / 2, "PAMPA STAR", { fontFamily: window.PF.display, fontSize: "32px", color: "#ffd84d", stroke: "#0a1f13", strokeThickness: 5 }).setOrigin(0.5);
    }
    const club = this.clubDeLaCarrera();
    const OPS = [
      { t: "▶ JUGAR CARRERA", s: club ? "seguís con " + club : "elegís tu localidad, armás la pinta y arranca la Primera B", color: 0x7ee08a, cb: () => this.jugarCarrera() },
      { t: "PARTIDO RÁPIDO", s: "un partido suelto: no cuenta para tu carrera", color: 0xffd84d, cb: () => this.partidoRapido() },
      { t: "OPCIONES", s: "sonido, música, duración y movimiento", color: 0xf6efdc, cb: () => this.vistaOpciones() }
    ];
    const x = 700, w = 450, h = 76;
    const items = OPS.map((o, i) => {
      const y = 168 + i * 100;
      const r = this.add.rectangle(x, y, w, h, o.color, 1).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
      const ti = this.add.text(x, y - 13, o.t, { fontFamily: window.PF.display, fontSize: "17px", color: "#0a1f13" }).setOrigin(0.5);
      const su = this.add.text(x, y + 17, o.s, { fontFamily: window.PF.texto, fontSize: "15px", color: "#365a41", align: "center", wordWrap: { width: w - 24 } }).setOrigin(0.5);
      /* en el teléfono la bajada va en dos renglones: el botón crece */
      const hh = Math.max(h, Math.ceil(window.PampaPiel.separarRenglones(ti, su, 0) + 8));
      if (hh > h) {
        window.PampaPiel.estirar(r, w, hh);
        const corre = y - (ti.getBounds().y + su.getBounds().bottom) / 2;
        ti.y += corre; su.y += corre;
      }
      const cb = () => { const S = window.PampaSFX; if (S && S.ui) S.ui("confirmar"); o.cb(); };
      r.on("pointerdown", (p, xx, yy, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); cb(); });
      return { obj: r, caja: { x: x - w / 2, y: y - hh / 2, w: w, h: hh }, cb: o.cb };
    });
    const vi = this.add.text(14, 12, "▶ VER INTRO", { fontFamily: window.PF.texto, fontSize: "13px", color: "#f6efdc", backgroundColor: "#0a1f13aa", padding: { x: 6, y: 4 } });
    if (this.pisoTactil) this.pisoTactil(vi);
    if (!vi.input) vi.setInteractive({ useHandCursor: true });
    const verIntro = () => { this.game.registry.set("introPedida", true); this.irA("intro"); };
    vi.on("pointerdown", verIntro);
    const pant = this.botonPantalla ? this.botonPantalla(Math.ceil(vi.x + vi.width) + 8, 22, { largo: true, desdeArriba: true, desdeIzquierda: true }) : null;
    /* revisión final del 23/oct: VER INTRO y PANTALLA COMPLETA no estaban en
       el cursor y con teclado no se llegaba; desde JUGAR CARRERA, ◀ o ▲ */
    items.push({ obj: vi, cb: verIntro });
    if (pant) items.push({ obj: pant.zona, cb: () => this.alternarPantallaCompleta() });
    if (this.grupoFoco) this.grupoFoco(items, { inicial: foco === "opciones" ? OPS.findIndex(o => o.t === "OPCIONES") : 0 });
    if (this.input.keyboard && !this.sys.game.device.input.touch) {
      this.add.text(14, H - 10, "flechas y ENTER para elegir", { fontFamily: window.PF.texto, fontSize: "13px", color: "#9fb3a5" }).setOrigin(0, 1);
    }
    if (window.PAMPA_VERSION) {
      this.add.text(W - 10, H - 8, "versión " + window.PAMPA_VERSION, { fontFamily: window.PF.texto, fontSize: "13px", color: "#9fb3a5" }).setOrigin(1, 1).setAlpha(0.85);
    }
  }

  clubDeLaCarrera() {
    try {
      const sv = JSON.parse(this.crudoDelMaster() || "null");
      return sv && sv.club ? String(sv.club) : null;
    } catch (e) { return null; }
  }

  jugarCarrera() {
    this.game.registry.remove("partidoRapido");
    /* volviste del editor con la carrera a medio crear: se sigue en la pinta */
    this.irA(this.game.registry.get("carreraPendiente") ? "editor" : "master");
  }

  /* un rival de la Primera B al azar, con el nivel de la Primera B y la
     duración de OPCIONES. Nada de esto pasa por el save del Master. */
  partidoRapido() {
    const div = this.game.registry.get("divisiones").divisiones.primera_b;
    const rivales = div.rivales;
    this.game.registry.remove("masterPartido");
    this.game.registry.set("partidoRapido", {
      rival: rivales[Math.floor(Math.random() * rivales.length)],
      division: "primera_b",
      nivel: window.PampaMaster.nivelDeDivision("primera_b"),
      tempo: this.op.duracion
    });
    this.irA("match");
  }

  /* ============ OPCIONES ============ */
  filasDeOpciones() {
    const O = this.O, op = this.op, S = window.PampaSFX;
    const audio = this.game.registry.get("audio");
    const estilos = O.estilos(this.BAL, audio);
    const nivel = (k) => ({ tipo: "nivel", valor: op[k], cambiar: (d) => this.cambiarNivel(k, d) });
    return [
      { n: "SONIDO", tipo: "chips",
        chips: [{ k: false, n: "SÍ" }, { k: true, n: "NO" }], valor: !!(S && S.isMuted && S.isMuted()),
        elegir: (k) => { if (S && S.setMuted) S.setMuted(k); } },
      Object.assign({ n: "MÚSICA" }, nivel("musica")),
      Object.assign({ n: "EFECTOS" }, nivel("efectos")),
      /* 23/oct: con MEZCLA en la lista, abajo del rótulo se dice qué hace */
      { n: "ESTILO DE MÚSICA", sub: estilos.some((e) => e.k === "mezcla") ? this.BAL.musica.mezcla.d : null, tipo: "chips",
        chips: estilos.map((e) => ({ k: e.k, n: e.n, d: e.disponible ? "" : "próximamente", bloqueada: !e.disponible })),
        valor: op.estilo,
        elegir: (k) => {
          op.estilo = k; this.guardarOpciones();
          if (this.registrarMusicaGlobal) this.registrarMusicaGlobal(true);
          this.pedirMusica("espera");
        } },
      { n: "DURACIÓN", sub: "partido rápido y carrera nueva", tipo: "chips",
        chips: O.duraciones(this.BAL).map((o) => ({ k: o.k, n: o.n, d: o.d })), valor: op.duracion,
        elegir: (k) => { op.duracion = k; this.guardarOpciones(); } },
      { n: "VELOCIDAD", tipo: "chips",
        chips: [{ k: false, n: "NORMAL", d: "animaciones enteras" }, { k: true, n: "RÁPIDA", d: "más cortas" }],
        valor: O.velocidadRapida(localStorage),
        elegir: (k) => O.ponerVelocidad(localStorage, k) },
      /* L11 · MOVIMIENTO SUAVE: sin sacudones, sin destellos, sin líneas de
         velocidad y con cortes en vez de zooms (logic/cuidado.js). Arranca en
         lo que pidió el sistema (prefers-reduced-motion) hasta que se elige */
      { n: "MOVIMIENTO", sub: "si te marea la pantalla", tipo: "chips",
        chips: [{ k: "completo", n: "COMPLETO", d: "todo el efecto" }, { k: "suave", n: "SUAVE", d: "sin destellos" }],
        valor: this.game.registry.get("movimiento"),
        elegir: (k) => { this.game.registry.set("movimiento", k); window.PampaCuidado.guardar(localStorage, k); } }
    ];
  }

  guardarOpciones() {
    this.O.aplicar(window.PampaSFX, this.op);
    this._aviso = this.O.guardar(localStorage, this.op) ? "" : "este navegador no guarda: vale hasta que cierres el juego";
  }

  cambiarNivel(k, d) {
    const S = window.PampaSFX;
    const n = this.op[k] + d;
    if (n < 0 || n > this.O.NIVELES) { if (S && S.ui) S.ui("bloqueado"); return; }
    this.op[k] = n;
    this.guardarOpciones();
    if (S && S.ui) S.ui(d > 0 ? "abrir" : "cerrar");
    this.vistaOpciones();
  }

  /* en una fila de chips, ◄ ► van al vecino que se puede elegir; si no hay
     ninguno para ese lado suena el "no" y se dice por qué */
  moverChip(f, d) {
    const S = window.PampaSFX;
    const i0 = f.chips.findIndex((c) => c.k === f.valor);
    const n = f.chips.length;
    for (let paso = 1; paso < n; paso++) {
      const c = f.chips[((i0 + d * paso) % n + n) % n];
      if (!c.bloqueada) { this.elegirChip(f, c); return; }
    }
    this.chipBloqueado(f);
    if (S && S.ui) S.ui("bloqueado");
  }
  elegirChip(f, c) {
    const S = window.PampaSFX;
    if (c.bloqueada) { this.chipBloqueado(f); if (S && S.ui) S.ui("bloqueado"); return; }
    f.elegir(c.k);
    if (S && S.ui) S.ui("confirmar");
    this.vistaOpciones();
  }
  chipBloqueado(f) {
    const faltan = f.chips.filter((c) => c.bloqueada).map((c) => c.n);
    const lista = faltan.length > 1 ? faltan.slice(0, -1).join(", ") + " y " + faltan[faltan.length - 1] : faltan.join("");
    this._aviso = lista + ": próximamente, todavía no tienen temas";
    this.vistaOpciones();
  }

  vistaOpciones() {
    this._vista = "opciones";
    this.vaciar();
    const W = this.scale.width, H = this.scale.height;
    this.add.text(40, 34, "OPCIONES", { fontFamily: window.PF.display, fontSize: window.PampaPiel.nivel(1), color: "#ffd84d" }).setOrigin(0, 0.5);
    this.add.text(W - 40, 34, "se guarda solo, en este aparato", { fontFamily: window.PF.texto, fontSize: "15px", color: "#cfe9d4" }).setOrigin(1, 0.5);
    const filas = this.filasDeOpciones();

    /* L11: con MOVIMIENTO son siete filas. Cada 60 desde 88, la última termina
       en 474 y ◀ VOLVER baja a H-32: ningún área táctil (61 de alto) pisa el
       dibujo de otra fila ni el de VOLVER */
    const alto = 52;
    const lbls = filas.map((f, i) => {
      const y = 88 + i * 60;
      const lbl = this.add.text(40, f.sub ? y - 9 : y, f.n, { fontFamily: window.PF.texto, fontSize: "19px", color: "#f6c11d" }).setOrigin(0, 0.5);
      const sub = f.sub ? this.add.text(40, y + 13, f.sub, { fontFamily: window.PF.texto, fontSize: "13px", color: "#cfe9d4" }).setOrigin(0, 0.5) : null;
      if (sub) window.PampaPiel.separarRenglones(lbl, sub, 0);
      return [lbl, sub];
    });
    /* los controles arrancan en 300 o, en el teléfono, después del rótulo
       más largo */
    const x0 = Math.max(300, Math.ceil(Math.max(...lbls.flat().filter(Boolean).map(t => t.getBounds().right)) + 12));
    const items = filas.map((f, i) => {
      const y = 88 + i * 60;
      const lbl = lbls[i][0];
      if (f.tipo === "nivel") this.dibujarNivel(f, x0, y, i);
      else this.dibujarChips(f, x0, y, i, Math.min(620, W - 30 - x0));
      return { obj: lbl, caja: { x: 30, y: y - alto / 2 - 2, w: W - 60, h: alto + 4 },
        cb: () => (f.tipo === "nivel" ? f.cambiar(1) : this.moverChip(f, 1)) };
    });
    /* VOLVER, abajo a la izquierda; el aviso (si hay) a su derecha */
    const yv = H - 32, wv = 240;
    const bv = this.add.rectangle(30 + wv / 2, yv, wv, 52, 0xf6efdc, 1).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
    this.add.text(30 + wv / 2, yv, "◀ VOLVER", { fontFamily: window.PF.display, fontSize: "13px", color: "#0a1f13" }).setOrigin(0.5);
    const volver = () => { const S = window.PampaSFX; if (S && S.ui) S.ui("volver"); this._aviso = ""; this._fila = 0; this.vistaMenu("opciones"); };
    bv.on("pointerdown", (p, xx, yy, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); volver(); });
    items.push({ obj: bv, caja: { x: 30, y: yv - 26, w: wv, h: 52 }, cb: volver });
    if (this._aviso) {
      this.add.text(30 + wv + 24, yv, "✗ " + this._aviso, { fontFamily: window.PF.texto, fontSize: "15px", color: "#f6efdc", wordWrap: { width: W - wv - 100 } }).setOrigin(0, 0.5);
    }
    /* las flechas: ↑↓ cambian de fila, ◄► cambian el valor (como el editor
       de la pinta), ENTER confirma VOLVER o avanza el valor, ESC vuelve */
    const n = items.length;
    const ir = (i) => { this._fila = (i + n) % n; if (this._foco) this._foco.mover(this._fila); };
    const lado = (d) => {
      const f = filas[this._fila];
      if (!f) return;
      if (f.tipo === "nivel") f.cambiar(d);
      else this.moverChip(f, d);
    };
    this.atajo("UP", () => ir(this._fila - 1));
    this.atajo("DOWN", () => ir(this._fila + 1));
    this.atajo("LEFT", () => lado(-1));
    this.atajo("RIGHT", () => lado(1));
    this.atajo("ENTER", (ev) => { if (!(ev && ev.repeat)) items[this._fila].cb(); });
    this.atajo("ESC", volver);
    if (this.grupoFoco) this.grupoFoco(items, { inicial: Math.min(this._fila, n - 1), sinTeclado: true, alMover: (i) => { this._fila = i; } });
  }

  /* [◄] ■■■■■■■□□□ 7 de 10 [►] */
  dibujarNivel(f, x0, y, fila) {
    const N = this.O.NIVELES;
    const flecha = (x, d) => {
      const r = this.add.rectangle(x, y, 52, 46, 0xf6efdc, 1).setStrokeStyle(2, 0x0a1f13).setInteractive({ useHandCursor: true });
      const g = this.add.graphics();
      g.fillStyle(0x0a1f13, 1);
      if (d < 0) g.fillTriangle(x - 9, y, x + 7, y - 10, x + 7, y + 10);
      else g.fillTriangle(x + 9, y, x - 7, y - 10, x - 7, y + 10);
      r.on("pointerdown", (p, xx, yy, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); this._fila = fila; f.cambiar(d); });
    };
    flecha(x0 + 26, -1);
    const g = this.add.graphics();
    for (let k = 0; k < N; k++) {
      const bx = x0 + 66 + k * 24;
      if (k < f.valor) { g.fillStyle(0xffd84d, 1); g.fillRect(bx, y - 14, 18, 28); }
      else { g.lineStyle(2, 0xf6efdc, 0.7); g.strokeRect(bx + 1, y - 13, 16, 26); }
    }
    flecha(x0 + 66 + N * 24 + 30, 1);
    this.add.text(x0 + 66 + N * 24 + 72, y, f.valor === 0 ? "0 de " + N + ", apagado" : f.valor + " de " + N,
      { fontFamily: window.PF.texto, fontSize: "19px", color: "#f6efdc" }).setOrigin(0, 0.5);
  }

  /* una pastilla por valor; la elegida va llena y con ✔ (no solo el color) */
  dibujarChips(f, x0, y, fila, ancho) {
    const n = f.chips.length, aire = 10;
    const cabe = Math.floor((ancho - aire * (n - 1)) / n);
    /* las letras primero: en el teléfono "animaciones enteras" no entra en
       150 y la pastilla se estira hasta lo que deja la fila */
    const letras = f.chips.map((c) => {
      const si = c.k === f.valor;
      const col = si ? "#0a1f13" : c.bloqueada ? "#9fb3a5" : "#f6efdc";
      const t = this.add.text(0, c.d ? y - 10 : y, (si ? "» " : "") + c.n, { fontFamily: window.PF.texto, fontSize: "19px", color: col }).setOrigin(0.5);
      const d = c.d ? this.add.text(0, y + 13, c.d, { fontFamily: window.PF.texto, fontSize: "13px", color: si ? "#365a41" : "#cfe9d4" }).setOrigin(0.5) : null;
      const alto = d ? window.PampaPiel.separarRenglones(t, d, 0) : t.height;
      return [t, d, alto];
    });
    const pide = Math.max(...letras.map(([t, d]) => Math.max(t.width, d ? d.width : 0) + 16));
    const w = Math.min(Math.max(150, Math.ceil(pide)), cabe);
    /* y crece de alto hasta 58 (las filas van cada 60) si lo de adentro no entra en 52 */
    const hC = Math.min(58, Math.max(52, Math.ceil(Math.max(...letras.map(l => l[2])) + 6)));
    f.chips.forEach((c, k) => {
      const x = x0 + w / 2 + k * (w + aire);
      const si = c.k === f.valor;
      const r = this.add.rectangle(x, y, w, hC, si ? 0xffd84d : 0x0d2a18, 1)
        .setStrokeStyle(2, si ? 0x0a1f13 : 0xf6efdc, c.bloqueada ? 0.4 : 0.9).setInteractive({ useHandCursor: true });
      letras[k].slice(0, 2).forEach(t => { if (t) { t.setX(x); this.children.bringToTop(t); } });
      r.on("pointerdown", (p, xx, yy, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); this._fila = fila; this.elegirChip(f, c); });
    });
  }
};

/* L10: el piso táctil también acá. Las vistas se arman de una vez (no hay
   update que barra): al terminar cada una, pisoTactilTodo lleva todo lo
   tocable a legibilidad.tap_min (las pastillas de OPCIONES medían 52 de alto
   y las flechas de MÚSICA y EFECTOS 52x46). Sin vestir: el título tiene su
   propio dibujo. */
Object.getOwnPropertyNames(window.PampaTitulo.prototype)
  .filter(function (n) { return n === "create" || /^vista[A-Z]/.test(n); })
  .forEach(function (n) {
    var orig = window.PampaTitulo.prototype[n];
    if (typeof orig !== "function") return;
    window.PampaTitulo.prototype[n] = function () {
      var r = orig.apply(this, arguments);
      if (this.pisoTactilTodo) this.pisoTactilTodo();
      return r;
    };
  });
