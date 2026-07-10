/* ============================================================================
   PAMPA STAR · phaser/scenes/match.js — HITO 2: EL PARTIDO COMPLETO JUGABLE
   Las DOS CAPAS en el partido entero:
     · MODO JUEGO — cancha 3/4 (arco rival al fondo), 22 jugadores por
       formación, RADAR para leer la jugada, movimiento con propósito
       (calibración de balance.json: te alcanzan, perseguir cuesta aguante).
     · MODO CINE — el corte cinematográfico (planos + sprites grandes) en los
       momentos clave: remate (con zonas y Caldén), gambeta importante,
       atajada de tu arquero.
   Encuentros que congelan con menú por rol; duelos con matriz (la decisión
   vive en logic/partido.js); el remate usa logic/duel.js (bug del arquero
   cerrado). Esta escena SOLO dibuja y pregunta: la verdad está en la lógica.
   ========================================================================== */
window.PampaMatch = class PampaMatch extends Phaser.Scene {
  constructor() { super("match"); }

  init() {
    this.BAL = this.game.registry.get("balance");
    this.SFX = window.PampaSFX;
    this.fase = "juego";                 // juego | menu | cine | pausa
    this.target = null;                  // objetivo de arrastre (coords de MUNDO)
  }

  /* ================= PROYECCIÓN mundo(1050×680) ⇄ pantalla ================= */
  setupProyeccion() {
    const W = this.scale.width, H = this.scale.height;
    this.W = W; this.H = H;
    this.PR = { k: 1.7, vpX: W / 2, vpY: 74, nearY: H - 14, farHalf: 132, nearHalf: W / 2 + 90 };
  }
  aPantalla(wx, wy) {   // wx: avance 0(mi arco)→1050(arco rival) · wy: lateral 0..680
    const P = this.PR, M = this.BAL.mundo;
    const d = Phaser.Math.Clamp(wx / M.ancho, 0, 1);
    const s = window.PampaPersp.aPantalla(d, { k: P.k, vpX: P.vpX, vpY: P.vpY, nearY: P.nearY });
    const half = this.halfEn(s.y);
    return { x: P.vpX + (wy / M.alto - 0.5) * 2 * half, y: s.y, escala: s.escala };
  }
  halfEn(sy) { const P = this.PR; return P.farHalf + (P.nearHalf - P.farHalf) * ((sy - P.vpY) / (P.nearY - P.vpY)); }
  aMundo(sx, sy) {      // inversa analítica (para el arrastre)
    const P = this.PR, M = this.BAL.mundo;
    sy = Phaser.Math.Clamp(sy, P.vpY + 2, P.nearY);
    const norm = (sy - P.vpY) / (P.nearY - P.vpY);          // = alturaDesdeVP
    const sFar = 1 / (1 + P.k);
    const raw = sFar + norm * (1 - sFar);
    const d = (1 / raw - 1) / P.k;
    const half = this.halfEn(sy);
    const wy = ((sx - P.vpX) / (2 * half) + 0.5) * M.alto;
    return { x: Phaser.Math.Clamp(d * M.ancho, 0, M.ancho), y: Phaser.Math.Clamp(wy, 0, M.alto) };
  }

  /* ============================== CREATE ============================== */
  create() {
    window.PampaSprites(this);
    this.setupProyeccion();
    this.COL = { pasto: 0x2a9d4f, pasto2: 0x1f7a3c, raya: 0xeafff0, sol: 0xf6c11d, sol2: 0xffd84d, cielo: 0x5bb8e8, crema: 0xf6efdc, tinta: 0x0a1f13, rojo: 0xe3503e, ok: 0x7ee08a };

    /* --- estado del partido (lógica pura) --- */
    const plantel = this.armarPlanteles();
    this.st = window.PampaPartido.crearPartido({ bal: this.BAL, mios: plantel.mios, rivales: plantel.rivales });
    this.nombreRival = plantel.nombreRival;

    /* --- capas --- */
    this.gameLayer = this.add.container(0, 0);
    this.cineLayer = this.add.container(0, 0).setVisible(false).setDepth(3000);
    this.menuLayer = this.add.container(0, 0).setVisible(false).setDepth(4000);
    this.hudLayer = this.add.container(0, 0).setDepth(2000);

    this.buildCancha();
    this.buildJugadores();
    this.buildHUD();
    this.buildRadar();
    this.buildCineBase();

    /* input de campo: arrastrás y el jugador va (coordenadas de mundo) */
    this.input.on("pointerdown", (p) => this.onCampo(p));
    this.input.on("pointermove", (p) => { if (p.isDown) this.onCampo(p); });

    this.cameras.main.setBackgroundColor("#06120b");
    this.avisar("¡ARRANCA EL PARTIDO! Llevá la pelota al arco del fondo.", 2200);
  }

  /* plantel: VOS + amigos de la Capa 3 (del save clásico, tolerante) + roster */
  armarPlanteles() {
    let career = null;
    try { const r = localStorage.getItem("pampa_star_v1"); if (r) career = JSON.parse(r); } catch (e) { }
    const roster = this.game.registry.get("roster");
    const slots = [];
    this.BAL.partido.formacion.forEach(l => { for (let i = 0; i < l.n; i++) slots.push(l.pos); });
    const mios = slots.map(pos => ({ nombre: null, pos }));
    const usados = new Set();
    if (career && career.vida && Array.isArray(career.vida.amigos)) {
      const mapa = { "Arco": "ARQ", "Defensa": "DEF", "Volante": "VOL", "Ataque": "ATA", "ARQ": "ARQ", "DEF": "DEF", "VOL": "VOL", "ATA": "ATA" };
      career.vida.amigos.forEach(a => {
        const p = mapa[a.pos] || "VOL";
        const idx = slots.findIndex((s, i) => s === p && !usados.has(i));
        if (idx >= 0 && a.nombre) { usados.add(idx); mios[idx] = { nombre: String(a.nombre).slice(0, 12), pos: p, stats: a.stats, esAmigo: true, vinculo: a.vinculo || 0 }; }
      });
    }
    const atas = slots.reduce((arr, s, i) => (s === "ATA" && arr.push(i), arr), []);
    const vosIdx = atas[1] != null ? atas[1] : atas[0];
    usados.add(vosIdx);
    mios[vosIdx] = { nombre: (career && career.name) ? String(career.name).slice(0, 10) : "VOS", pos: "ATA", stats: career && career.stats, esVos: true };
    let pool = (roster && roster.jugadores) ? roster.jugadores.slice() : [];
    slots.forEach((s, i) => {
      if (mios[i].nombre) return;
      const k = pool.findIndex(j => j.posicion_motor === s);
      if (k >= 0) { const j = pool.splice(k, 1)[0]; mios[i] = { nombre: j.nombre, pos: s, stats: j.stats_auto }; }
    });
    let pueblo = "RIVAL";
    const rivales = slots.map(s => {
      const k = pool.findIndex(j => j.posicion_motor === s);
      if (k >= 0) { const j = pool.splice(k, 1)[0]; pueblo = j.pueblo.toUpperCase().slice(0, 10); return { nombre: j.nombre, pos: s, stats: j.stats_auto }; }
      return {};
    });
    return { mios, rivales, nombreRival: pueblo };
  }

  /* ============================== LA CANCHA 3/4 ============================== */
  buildCancha() {
    const W = this.W, H = this.H, P = this.PR, g = this.add.graphics();
    // cielo + tribuna al fondo
    g.fillStyle(0x123a5a, 1); g.fillRect(0, 0, W, P.vpY);
    g.fillStyle(0x0e2c44, 1); for (let x = 0; x < W; x += 10) if ((x / 10) % 2) g.fillRect(x, 26, 10, P.vpY - 26);
    // pasto (trapecio)
    g.fillStyle(this.COL.pasto, 1);
    g.fillPoints([{ x: P.vpX - P.nearHalf, y: P.nearY }, { x: P.vpX + P.nearHalf, y: P.nearY }, { x: P.vpX + P.farHalf, y: P.vpY }, { x: P.vpX - P.farHalf, y: P.vpY }], true);
    // franjas transversales por profundidad (paralelas de la proyección real)
    g.lineStyle(2, this.COL.raya, 0.16);
    for (let i = 1; i <= 10; i++) {
      const s = this.aPantalla(i * 105, 340), half = this.halfEn(s.y);
      g.beginPath(); g.moveTo(P.vpX - half, s.y); g.lineTo(P.vpX + half, s.y); g.strokePath();
    }
    // mitad de cancha + laterales
    const mitad = this.aPantalla(525, 340);
    g.lineStyle(3, this.COL.raya, 0.5);
    g.beginPath(); g.moveTo(P.vpX - this.halfEn(mitad.y), mitad.y); g.lineTo(P.vpX + this.halfEn(mitad.y), mitad.y); g.strokePath();
    g.beginPath(); g.moveTo(P.vpX - P.farHalf, P.vpY); g.lineTo(P.vpX - P.nearHalf, P.nearY);
    g.moveTo(P.vpX + P.farHalf, P.vpY); g.lineTo(P.vpX + P.nearHalf, P.nearY); g.strokePath();
    // ARCO RIVAL al fondo, con red
    const gw = 120, gh = 42, gy = P.vpY + 2, gx = P.vpX;
    g.fillStyle(0xdfeef6, 0.45);
    for (let x = -gw / 2; x <= gw / 2; x += 8) g.fillRect(gx + x, gy - gh, 1, gh);
    for (let y = 0; y <= gh; y += 7) g.fillRect(gx - gw / 2, gy - gh + y, gw, 1);
    g.fillStyle(0xffffff, 1);
    g.fillRect(gx - gw / 2 - 3, gy - gh - 3, 4, gh + 4); g.fillRect(gx + gw / 2, gy - gh - 3, 4, gh + 4);
    g.fillRect(gx - gw / 2 - 3, gy - gh - 3, gw + 7, 4);
    // área rival (líneas en el piso)
    g.lineStyle(2, this.COL.raya, 0.4);
    const a1 = this.aPantalla(1050 - 165, 140), a2 = this.aPantalla(1050 - 165, 540);
    g.beginPath(); g.moveTo(a1.x, a1.y); g.lineTo(a2.x, a2.y); g.strokePath();
    this.gameLayer.add(g);
    this.arcoRival = { x: gx, y: gy, w: gw, h: gh };
  }

  buildJugadores() {
    this.sprMios = this.st.mios.map(j => {
      const tx = j.pos === "ARQ" ? "keeper_mio" : "player_idle";
      const s = this.add.sprite(0, 0, tx); this.gameLayer.add(s); return s;
    });
    this.sprRivales = this.st.rivales.map(j => {
      const tx = j.pos === "ARQ" ? "keeper_idle" : "rival_idle";
      const s = this.add.sprite(0, 0, tx); this.gameLayer.add(s); return s;
    });
    this.sprPelota = this.add.sprite(0, 0, "ball"); this.gameLayer.add(this.sprPelota);
    this.marker = this.add.text(0, 0, "▼ VOS", { fontFamily: "monospace", fontSize: "12px", color: "#ffffff", stroke: "#0a1f13", strokeThickness: 4 }).setOrigin(0.5); this.gameLayer.add(this.marker);
  }

  /* ============================== HUD + RADAR ============================== */
  buildHUD() {
    const W = this.W;
    const barra = this.add.rectangle(W / 2, 16, W, 32, 0x0a1f13, 0.85); this.hudLayer.add(barra);
    this.txtMarcador = this.add.text(W / 2, 16, "", { fontFamily: "'Press Start 2P',monospace", fontSize: "13px", color: "#f6efdc" }).setOrigin(0.5); this.hudLayer.add(this.txtMarcador);
    this.txtReloj = this.add.text(W - 12, 16, "0' 1T", { fontFamily: "monospace", fontSize: "14px", color: "#ffd84d" }).setOrigin(1, 0.5); this.hudLayer.add(this.txtReloj);
    this.txtAguante = this.add.text(12, 16, "", { fontFamily: "monospace", fontSize: "12px", color: "#7ee08a" }).setOrigin(0, 0.5); this.hudLayer.add(this.txtAguante);
    // botones contextuales (≥48px de alto, texto + ícono)
    this.btns = {};
    const mkBtn = (key, y, texto, bg) => {
      const c = this.add.container(W - 92, y);
      const r = this.add.rectangle(0, 0, 168, 48, bg, 1).setStrokeStyle(2, 0x0a1f13).setInteractive({ useHandCursor: true });
      const t = this.add.text(0, 0, texto, { fontFamily: "'Press Start 2P',monospace", fontSize: "11px", color: "#0a1f13" }).setOrigin(0.5);
      c.add([r, t]); c.setVisible(false); this.hudLayer.add(c);
      r.on("pointerdown", (p, x, yy, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); this._uiTocado = this.time.now; this.onBoton(key); });
      this.btns[key] = { c, t, r };
    };
    mkBtn("tiro", this.H - 150, "🎯 TIRO", 0xffd84d);
    mkBtn("calden", this.H - 202, "🔥 CALDÉN", 0xff8c3a);
    mkBtn("pase", this.H - 96, "➡️ PASE", 0xf6efdc);
    mkBtn("cambio", this.H - 96, "🔁 CAMBIO", 0x7ee08a);
    // aviso flotante
    this.txtAviso = this.add.text(this.W / 2, 92, "", { fontFamily: "monospace", fontSize: "15px", color: "#f6efdc", backgroundColor: "#0a1f13cc", padding: { x: 10, y: 5 }, align: "center" }).setOrigin(0.5).setAlpha(0).setDepth(2500); this.hudLayer.add(this.txtAviso);
  }
  avisar(txt, ms) {
    this.txtAviso.setText(txt).setAlpha(1);
    this.tweens.killTweensOf(this.txtAviso);
    this.tweens.add({ targets: this.txtAviso, alpha: 0, delay: ms || 1300, duration: 300 });
  }

  buildRadar() {
    const rw = 168, rh = 108, rx = 14, ry = this.H - rh - 14;
    this.radar = { x: rx, y: ry, w: rw, h: rh };
    const marco = this.add.rectangle(rx + rw / 2, ry + rh / 2, rw, rh, 0x0d2a18, 0.88).setStrokeStyle(2, 0xf6c11d, 0.6); this.hudLayer.add(marco);
    this.radarG = this.add.graphics().setDepth(2100); this.hudLayer.add(this.radarG);
    const zona = this.add.zone(rx + rw / 2, ry + rh / 2, rw, rh).setInteractive();
    this.hudLayer.add(zona);
    zona.on("pointerdown", (p, x, yy, ev) => {
      ev && ev.stopPropagation && ev.stopPropagation(); this._uiTocado = this.time.now;
      if (this.fase !== "juego") return;
      const st = this.st;
      const wx = (p.x - rx) / rw * st.W, wy = (p.y - ry) / rh * st.H;
      if (st.posesion === "rival") {
        /* tap en el radar = elegir a quién controlar (cambio libre en defensa) */
        let mejor = -1, md = 1e9;
        st.mios.forEach((j, i) => { if (j.pos === "ARQ") return; const d = Math.hypot(j.x - wx, j.y - wy); if (d < md) { md = d; mejor = i; } });
        if (mejor >= 0 && window.PampaPartido.cambiarA(st, mejor)) { this.avisar("AHORA MARCÁS CON: " + st.mios[mejor].nombre.toUpperCase(), 1100); this.SFX && this.SFX.unlock(); }
      } else {
        this.target = { x: wx, y: wy };   // en ataque: correr hacia ese punto
      }
    });
  }
  dibujarRadar() {
    const g = this.radarG, R = this.radar, st = this.st;
    g.clear();
    const mx = wx => R.x + wx / st.W * R.w, my = wy => R.y + wy / st.H * R.h;
    g.lineStyle(1, 0xeafff0, 0.3);
    g.beginPath(); g.moveTo(mx(525), R.y + 2); g.lineTo(mx(525), R.y + R.h - 2); g.strokePath();
    /* rivales ▲ (forma) */
    st.rivales.forEach(j => {
      const x = mx(j.x), y = my(j.y);
      g.fillStyle(0x14110c, 1); g.fillTriangle(x, y - 3.4, x + 3.2, y + 2.6, x - 3.2, y + 2.6);
      g.lineStyle(1, 0xf6efdc, 0.8); g.strokeTriangle(x, y - 3.4, x + 3.2, y + 2.6, x - 3.2, y + 2.6);
    });
    /* míos ● */
    st.mios.forEach((j, i) => {
      const x = mx(j.x), y = my(j.y);
      g.fillStyle(0xf6efdc, 1); g.fillCircle(x, y, 2.6);
      g.lineStyle(1, 0x0a1f13, 1); g.strokeCircle(x, y, 2.6);
      if (i === st.ctrl) { g.lineStyle(1.6, 0xffd84d, 1); g.strokeCircle(x, y, 5); }   // anillo = controlado
    });
    /* pelota ◎ */
    g.fillStyle(0xffffff, 1); g.fillCircle(mx(st.pelota.x), my(st.pelota.y), 1.4);
    g.lineStyle(1, 0xffffff, 1); g.strokeCircle(mx(st.pelota.x), my(st.pelota.y), 3.4);
  }

  /* input del campo (fuera de UI): arrastre → objetivo de mundo */
  onCampo(p) {
    if (this.fase !== "juego") return;
    if (this.time.now - (this._uiTocado || 0) < 80) return;              // acaba de tocar UI
    const R = this.radar;
    if (p.x > R.x - 6 && p.x < R.x + R.w + 6 && p.y > R.y - 6) return;   // sobre el radar
    if (p.x > this.W - 190 && p.y > this.H - 232) return;                // sobre los botones
    if (p.y < 34) return;                                                // sobre la barra
    this.SFX && this.SFX.unlock();
    this.target = this.aMundo(p.x, p.y);
  }

  onBoton(key) {
    if (this.fase !== "juego") return;
    const st = this.st, P = window.PampaPartido;
    if (key === "cambio" && st.posesion === "rival") { P.cambiarAlMasCercano(st); this.avisar("AHORA MARCÁS CON: " + st.mios[st.ctrl].nombre.toUpperCase(), 1000); }
    if (key === "pase" && st.posesion === "mia") { st.modo = "congelado"; this.abrirMenuPases(false); }
    if (key === "tiro" && st.posesion === "mia" && P.puedeTirar(st)) { st.modo = "congelado"; this.abrirZonas(false); }
    if (key === "calden" && st.posesion === "mia" && P.puedeCalden(st)) { st.modo = "congelado"; this.abrirZonas(true); }
  }

  /* ============================== UPDATE ============================== */
  update(time, delta) {
    if (this.fase === "cine") { this.updateViaje(delta); return; }
    if (this.fase !== "juego") return;
    const st = this.st, P = window.PampaPartido;

    /* input → dirección */
    let input = null;
    const ctrl = st.mios[st.ctrl];
    if (this.target) {
      const dx = this.target.x - ctrl.x, dy = this.target.y - ctrl.y;
      if (Math.hypot(dx, dy) > 8) input = { dx, dy }; else this.target = null;
    }

    const evs = P.tick(st, delta, input);
    for (const ev of evs) {
      if (ev.tipo === "encuentro") { this.target = null; this.abrirMenuAtaque(); }
      else if (ev.tipo === "encuentroDef") { this.target = null; this.abrirMenuDefensa(); }
      else if (ev.tipo === "rivalTira") { this.target = null; this.abrirMenuArquero(); }
      else if (ev.tipo === "entretiempo") { this.target = null; this.panelTiempo("entretiempo"); }
      else if (ev.tipo === "final") { this.target = null; this.panelTiempo("final"); }
    }

    this.dibujarMundo(time);
    this.dibujarRadar();
    this.refrescarHUD();
  }

  dibujarMundo(time) {
    const st = this.st;
    const dibujar = (spr, j, esMio, i) => {
      const s = this.aPantalla(j.x, j.y);
      spr.setPosition(s.x, s.y).setScale(0.65 + 1.45 * s.escala).setDepth(s.y);
      const corre = (esMio && i === st.ctrl && this.target) || (!esMio && i === st.portadorRival && st.posesion === "rival");
      if (j.pos !== "ARQ") {
        const base = esMio ? "player" : "rival";
        spr.setTexture(corre && Math.floor(time / 110) % 2 ? base + "_run" : base + "_idle");
      }
    };
    st.mios.forEach((j, i) => dibujar(this.sprMios[i], j, true, i));
    st.rivales.forEach((j, i) => dibujar(this.sprRivales[i], j, false, i));
    const b = this.aPantalla(st.pelota.x, st.pelota.y);
    this.sprPelota.setPosition(b.x, b.y - 4).setScale(0.7 + 1.1 * b.escala).setDepth(b.y + 1);
    /* marca clara de a quién controlás: ▼ + nombre */
    const c = st.mios[st.ctrl], cs = this.aPantalla(c.x, c.y);
    this.marker.setText("▼ " + (c.esVos ? "VOS" : c.nombre.toUpperCase().slice(0, 9)))
      .setPosition(cs.x, cs.y - 58 * cs.escala - 14).setScale(Math.max(0.8, cs.escala)).setDepth(cs.y + 2);
  }

  refrescarHUD() {
    const st = this.st;
    this.txtMarcador.setText("VOS " + st.golesMio + " - " + st.golesRival + " " + this.nombreRival);
    const lim = st.tiempo === 1 ? 45 : 90;
    const m = Math.floor(st.minuto);
    this.txtReloj.setText((m > lim ? lim + "+'" : m + "'") + " " + (st.tiempo === 1 ? "1T" : "2T"));
    const c = st.mios[st.ctrl];
    const barras = Math.round(Phaser.Math.Clamp(c.aguante, 0, 100) / 10);
    this.txtAguante.setText("AGUANTE " + "█".repeat(barras) + "░".repeat(10 - barras) + (window.PampaPartido.rendido(st) ? " ¡RENDIDO!" : ""));
    this.txtAguante.setColor(window.PampaPartido.rendido(st) ? "#e3503e" : "#7ee08a");
    /* botones contextuales */
    const P = window.PampaPartido, mia = st.posesion === "mia";
    this.btns.pase.c.setVisible(mia && this.fase === "juego");
    this.btns.tiro.c.setVisible(mia && this.fase === "juego" && P.puedeTirar(st) && !P.puedeCalden(st));
    this.btns.calden.c.setVisible(mia && this.fase === "juego" && P.puedeCalden(st));
    if (P.puedeCalden(st)) this.btns.tiro.c.setVisible(false);
    this.btns.cambio.c.setVisible(!mia && this.fase === "juego");
  }

  /* ============================== MENÚS (encuentro) ============================== */
  limpiarMenu() { this.menuLayer.removeAll(true); this.menuLayer.setVisible(false); }
  panelBase(titulo) {
    this.menuLayer.removeAll(true);
    const W = this.W, H = this.H;
    const fondo = this.add.rectangle(W / 2, H / 2, W, H, 0x06120b, 0.72);
    const panel = this.add.rectangle(W / 2, H / 2 + 30, 560, 320, 0x0d2a18, 0.96).setStrokeStyle(3, 0xf6c11d, 0.8);
    const t = this.add.text(W / 2, H / 2 - 100, titulo, { fontFamily: "monospace", fontSize: "17px", color: "#f6efdc", align: "center", wordWrap: { width: 520 } }).setOrigin(0.5);
    this.menuLayer.add([fondo, panel, t]);
    this.menuLayer.setVisible(true);
    this.fase = "menu";
    return t;
  }
  botonMenu(x, y, w, texto, sub, cb, bloqueada, motivo) {
    const bg = bloqueada ? 0x333d36 : 0xf6efdc;
    const r = this.add.rectangle(x, y, w, 54, bg, 1).setStrokeStyle(2, 0x0a1f13);
    const t = this.add.text(x, y - (sub ? 8 : 0), texto, { fontFamily: "'Press Start 2P',monospace", fontSize: "11px", color: bloqueada ? "#9aa59d" : "#0a1f13" }).setOrigin(0.5);
    this.menuLayer.add([r, t]);
    if (sub) { const s = this.add.text(x, y + 13, bloqueada && motivo ? motivo : sub, { fontFamily: "monospace", fontSize: "11px", color: bloqueada ? "#c76a5e" : "#365a41" }).setOrigin(0.5); this.menuLayer.add(s); }
    if (!bloqueada) { r.setInteractive({ useHandCursor: true }); r.on("pointerdown", (p, xx, yy, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); this._uiTocado = this.time.now; this.SFX && this.SFX.unlock(); cb(); }); }
    return r;
  }

  abrirMenuAtaque() {
    const st = this.st, P = window.PampaPartido;
    this.panelBase("⚔ ¡Te salen al cruce! ¿Qué hacés?\n(la matriz: quite>gambeta · corte>pase · bloqueo>tiro — adiviná qué eligen)");
    const acc = P.accionesAtaque(st);
    const W = this.W, H = this.H, y0 = H / 2 - 40;
    acc.forEach((a, i) => {
      const fila = Math.floor(i / 2), col = i % 2;
      const pct = Math.round(window.PampaDuel.duelChance(a.poder, P.poderRival(st), this.BAL.duelo) * 100);
      this.botonMenu(W / 2 - 140 + col * 280, y0 + fila * 66, 260,
        a.ico + " " + a.n, "~" + pct + "% · " + a.costo + " aguante", () => {
          if (a.id === "pase") { this.abrirMenuPases(true); return; }
          if (a.id === "tiro") {
            /* la matriz manda: primero hay que zafar del BLOQUEO del defensor */
            const r = P.resolverDuelo(st, { accion: "tiro", poder: a.poder, costo: 0 });
            if (r.win) { this.avisar(r.matriz === "zafaste" ? "¡Zafaste de la marca!" : "¡Le ganaste al bloqueo!", 900); this.abrirZonas(false, true); }
            else {
              this.limpiarMenu(); P.perderPelota(st);
              this.avisar(r.matriz === "leyeron" ? "¡TE BLOQUEARON EL TIRO! Lo veían venir." : "TE LO TAPARON. Pelota rival.", 1600);
              const pit = P.chequearTiempo(st); if (pit) this.panelTiempo(pit); else this.fase = "juego";
            }
            return;
          }
          this.resolverAtaque(a);
        }, a.bloqueada, a.motivo);
    });
  }
  resolverAtaque(a) {
    const st = this.st, P = window.PampaPartido;
    const r = P.resolverDuelo(st, { accion: a.id, poder: a.poder, costo: a.costo });
    this.limpiarMenu();
    const importante = st.mios[st.ctrl].x > st.W * 0.58 && a.id === "gambeta";
    const despues = () => {
      if (r.win) { P.ganarAtaque(st, a.id); this.avisar(a.id === "pared" ? "¡PARED Y SEGUÍS DE LARGO!" : "¡LO DEJASTE ATRÁS!" + (r.matriz === "zafaste" ? " (le erraron a la marca)" : ""), 1400); }
      else { P.perderPelota(st); this.avisar(r.matriz === "leyeron" ? "¡TE LEYERON LA JUGADA! Pelota rival." : "TE LA SACARON. Pelota rival.", 1600); this.SFX && this.SFX.whistle(); }
      const pit = P.chequearTiempo(st); if (pit) this.panelTiempo(pit); else this.fase = "juego";
    };
    if (importante) this.cineGambeta(r.win, despues); else despues();
  }

  abrirMenuDefensa() {
    const st = this.st, P = window.PampaPartido;
    this.panelBase("🛡 ¡" + this.nombreRival + " avanza con la pelota! Te toca marcar.\n(solo ves TUS números: adivinar la intención rival es el juego)");
    const acc = P.accionesDefensa(st);
    const W = this.W, H = this.H, y0 = H / 2 - 40;
    acc.forEach((a, i) => {
      const pct = Math.round(window.PampaDuel.duelChance(a.poder, P.poderRival(st) + 4, this.BAL.duelo) * 100);
      this.botonMenu(W / 2, y0 + i * 64, 300, a.ico + " " + a.n, "~" + pct + "% · " + a.costo + " aguante", () => {
        const r = P.resolverDuelo(st, { accion: a.id, poder: a.poder, costo: a.costo });
        this.limpiarMenu();
        if (r.win) { P.ganarDefensa(st); this.avisar("¡RECUPERASTE! " + (r.matriz === "leiste" ? "(le leíste la intención)" : ""), 1500); this.SFX && this.SFX.whistle(); }
        else { P.perderDefensa(st); this.avisar(r.matriz === "teEngano" ? "TE ENGAÑÓ CON EL AMAGUE… sigue el rival." : "SE TE ESCAPÓ POR VELOCIDAD…", 1500); }
        const pit = P.chequearTiempo(st); if (pit) this.panelTiempo(pit); else this.fase = "juego";
      }, a.bloqueada, a.motivo);
    });
  }

  abrirMenuPases(desdeEncuentro) {
    const st = this.st, P = window.PampaPartido;
    this.panelBase("➡️ ¿A quién se la das? (adelante rinde más)");
    const rs = P.receptoresPase(st);
    const W = this.W, H = this.H, y0 = H / 2 - 44;
    rs.forEach((r, i) => {
      this.botonMenu(W / 2, y0 + i * 60, 380,
        (r.adelante ? "▲ " : "◀ ") + r.nombre.toUpperCase().slice(0, 12) + " · " + r.pos,
        r.pct + "% · " + r.d + "m" + (r.adelante ? " · adelante" : ""), () => {
          const res = P.resolverPase(st, r.idx, r.pct);
          this.limpiarMenu();
          if (res.win) this.avisar("AHORA JUGÁS: " + st.mios[st.ctrl].nombre.toUpperCase(), 1300);
          else { this.avisar("¡INTERCEPTADO! Leyeron el pase.", 1600); this.SFX && this.SFX.whistle(); }
          const pit = P.chequearTiempo(st); if (pit) this.panelTiempo(pit); else this.fase = "juego";
        });
    });
    this.botonMenu(W / 2, y0 + rs.length * 60 + 6, 380, "◀ VOLVER", desdeEncuentro ? "al encuentro" : "seguir jugando", () => {
      if (desdeEncuentro) this.abrirMenuAtaque();
      else { this.limpiarMenu(); st.modo = "juego"; this.fase = "juego"; }
    });
  }

  /* --- zonas del arco (el apuntado del remate) --- */
  abrirZonas(esCalden, desdeEncuentro) {
    const st = this.st;
    this.panelBase((esCalden ? "🔥 DISPARO DEL CALDÉN — " : "🎯 ") + "¿A qué zona del arco?\n(esquinas: más gol, más riesgo de que se vaya afuera)");
    const zonas = this.BAL.tiro.zonas, W = this.W, H = this.H;
    zonas.forEach((z, i) => {
      const fila = Math.floor(i / 3), col = i % 3;
      this.botonMenu(W / 2 - 180 + col * 180, H / 2 - 20 + fila * 66, 165,
        z.n, "riesgo " + Math.round(z.fuera * 100) + "%", () => this.ejecutarRemate(z, esCalden));
    });
    /* si venís de zafar un encuentro no hay VOLVER gratis: el remate ya está lanzado a decisión */
    if (!desdeEncuentro) this.botonMenu(W / 2, H / 2 + 120, 380, "◀ VOLVER", "seguir jugando", () => { this.limpiarMenu(); st.modo = "juego"; this.fase = "juego"; });
  }

  ejecutarRemate(zona, esCalden) {
    const st = this.st, P = window.PampaPartido;
    /* ===== EL RESULTADO SE DECIDE ACÁ, UNA VEZ (bug del arquero cerrado) ===== */
    const prep = P.prepararRemate(st, esCalden);
    const res = window.PampaDuel.resolveShot({
      shotPower: prep.shotPower, keeperSkill: prep.keeperSkill, zone: zona,
      cfg: { spread: this.BAL.duelo.spread, min: this.BAL.duelo.min, max: this.BAL.duelo.max }
    });
    P.saltoReloj(st);
    this.limpiarMenu();
    this.res = res; this.zona = zona; this.esCalden = !!esCalden;
    this.cameras.main.flash(this.BAL.cine.corte_flash_ms, 255, 255, 255);
    this.time.delayedCall(this.BAL.cine.corte_ms, () => this.startCineRemate());
  }

  /* ============================== MODO CINE ============================== */
  buildCineBase() {
    const W = this.W, H = this.H;
    this.cineBG = this.add.graphics(); this.cineLayer.add(this.cineBG);
    this.cineContent = this.add.container(0, 0); this.cineLayer.add(this.cineContent);
    this.cineFX = this.add.graphics(); this.cineLayer.add(this.cineFX);
    this.cineBig = this.add.text(W / 2, H / 2 - 20, "", { fontFamily: "'Press Start 2P',monospace", fontSize: "48px", color: "#ffd84d", stroke: "#9c2b1d", strokeThickness: 8 }).setOrigin(0.5).setAlpha(0); this.cineLayer.add(this.cineBig);
    this.cineSub = this.add.text(W / 2, H / 2 + 34, "", { fontFamily: "monospace", fontSize: "16px", color: "#f6efdc" }).setOrigin(0.5).setAlpha(0); this.cineLayer.add(this.cineSub);
    this.cineLabel = this.add.text(16, H - 24, "", { fontFamily: "monospace", fontSize: "12px", color: "#f6efdcaa" }); this.cineLayer.add(this.cineLabel);
    this.cineBlack = this.add.rectangle(W / 2, H / 2, W, H, 0x000000).setAlpha(0); this.cineLayer.add(this.cineBlack);
  }
  limpiarContenido() { this.cineContent.removeAll(true); this.cineFX.clear(); }
  corte(fn) {
    this.cineBlack.setAlpha(1);
    this.tweens.add({ targets: this.cineBlack, alpha: 0, duration: this.BAL.cine.corte_ms, delay: 20 });
    this.time.delayedCall(10, fn);
  }
  lineasVelocidad(cx, cy, inten, tinte) {
    const g = this.cineFX, n = this.BAL.cine.lineas_velocidad;
    g.clear();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r0 = 60 + ((i * 53 + this.time.now * 0.25) % 200);
      const r1 = r0 + 70 * inten;
      g.lineStyle(2 + 2 * inten, tinte || 0xffffff, 0.18 + 0.28 * inten);
      g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.strokePath();
    }
  }
  entrarCine() { this.fase = "cine"; this.gameLayer.setVisible(false); this.hudLayer.setVisible(false); this.cineLayer.setVisible(true); this.cameras.main.setZoom(1); this.cameras.main.centerOn(this.W / 2, this.H / 2); }
  salirCine(pit) {
    this.viajeState = null;
    this.cineBig.setAlpha(0); this.cineSub.setAlpha(0);
    this.cameras.main.setZoom(1); this.cameras.main.centerOn(this.W / 2, this.H / 2);
    const ms = this.BAL.cine.corte_ms;
    let hecho = false;
    const volver = () => {
      if (hecho) return; hecho = true;
      this.cineLayer.setVisible(false); this.gameLayer.setVisible(true); this.hudLayer.setVisible(true);
      this.cameras.main.fadeIn(ms, 0, 0, 0);
      if (pit) this.panelTiempo(pit); else { this.st.modo = "juego"; this.fase = "juego"; }
    };
    this.cameras.main.once("camerafadeoutcomplete", volver);
    this.cameras.main.fadeOut(ms, 0, 0, 0);
    this.time.delayedCall(ms + 120, volver);
  }

  /* --- cine del REMATE: pie → viaje (hacia adentro) → esfuerzo → arquero → desenlace --- */
  startCineRemate() {
    this.entrarCine();
    this.planoPie();
  }
  planoPie() {
    const W = this.W, H = this.H, C = this.BAL.cine;
    this.limpiarContenido();
    this.cineBG.clear(); this.cineBG.fillStyle(this.esCalden ? 0x2a130b : 0x0b2416, 1); this.cineBG.fillRect(0, 0, W, H);
    this.cineLabel.setText(this.esCalden ? "· el Caldén toma fuerza ·" : "· el pie ·");
    const pie = this.add.sprite(W / 2, H / 2 + 10, "cine_pie").setScale(0.6).setAngle(-8);
    this.cineContent.add(pie);
    this.tweens.add({ targets: pie, scale: 5.2, duration: 260, ease: "Back.easeOut" });
    this.SFX && this.SFX.kick();
    this.cameras.main.flash(90, 255, 255, 220);
    this.lineasVelocidad(W / 2, H / 2, 1, this.esCalden ? 0xffd84d : 0xffffff);
    this.time.delayedCall(C.plano_pie_ms + (this.esCalden ? 240 : 0), () => this.corte(() => this.planoViaje()));
  }
  planoViaje() {
    const W = this.W, H = this.H, C = this.BAL.cine;
    this.limpiarContenido();
    this.cineLabel.setText("· el viaje ·");
    const vp = { x: W / 2, y: H * 0.24 }, nearY = H * 0.96;
    this.dibujarCanchaProfunda(vp, nearY);
    const ball = this.add.sprite(W / 2, nearY, "ball").setScale(4.2); this.cineContent.add(ball);
    const trail = this.add.particles(0, 0, this.esCalden ? "spark_sol" : "spark", { lifespan: 300, speed: 0, scale: { start: 1.2, end: 0 }, alpha: { start: 0.6, end: 0 }, frequency: 18, follow: ball }); this.cineContent.add(trail);
    this.SFX && this.SFX.whoosh(C.plano_viaje_ms);
    const cfg = { k: C.persp.k, vpX: vp.x, vpY: vp.y, nearY, driftX: (this.zona.gy || 0) * C.drift_mult };
    this.viajeState = { activo: true, elapsed: 0, dur: C.plano_viaje_ms, ball, trail, cfg, vp, zoomed: false };
    this.time.delayedCall(C.plano_viaje_ms, () => {
      if (trail && trail.stop) trail.stop();
      if (this.viajeState) this.viajeState.activo = false;
      this.cameras.main.setZoom(1); this.cameras.main.centerOn(this.W / 2, this.H / 2);
      this.corte(() => this.planoEsfuerzo());
    });
  }
  updateViaje(delta) {
    const vs = this.viajeState; if (!vs || !vs.activo) return;
    vs.elapsed += delta;
    const C = this.BAL.cine;
    const raw = Phaser.Math.Clamp(vs.elapsed / vs.dur, 0, 1);
    const d = 1 - (1 - raw) * (1 - raw);
    const s = window.PampaPersp.aPantalla(d, vs.cfg);
    vs.ball.setPosition(s.x, s.y).setScale(C.pelota_escala_base + C.pelota_escala_span * s.escala);
    vs.ball.rotation += 0.3;
    this.lineasVelocidad(vs.vp.x, vs.vp.y, 0.4 + 0.6 * d, this.esCalden ? 0xffd84d : 0xffffff);
    if (!vs.zoomed && d > C.slowmo_desde) {
      vs.zoomed = true;
      this.cameras.main.zoomTo(C.zoom_viaje, C.camara_pan_ms, "Sine.easeInOut");
      this.cameras.main.pan(vs.vp.x, vs.vp.y + 40, C.camara_pan_ms, "Sine.easeInOut");
      this.SFX && this.SFX.crowd(500);
    }
    if (raw >= 1) vs.activo = false;
  }
  dibujarCanchaProfunda(vp, nearY) {
    const W = this.W, H = this.H, g = this.cineBG;
    g.clear();
    g.fillStyle(0x123a5a, 1); g.fillRect(0, 0, W, vp.y);
    g.fillStyle(this.COL.pasto, 1);
    g.fillPoints([{ x: 0, y: H }, { x: W, y: H }, { x: vp.x + 34, y: vp.y }, { x: vp.x - 34, y: vp.y }], true);
    g.lineStyle(2, this.COL.raya, 0.28);
    for (let i = 1; i <= 9; i++) {
      const s = window.PampaPersp.aPantalla(i / 10, { k: this.BAL.cine.persp.k, vpX: vp.x, vpY: vp.y, nearY });
      const half = 34 + (W / 2 - 34) * ((s.y - vp.y) / (H - vp.y));
      g.beginPath(); g.moveTo(vp.x - half, s.y); g.lineTo(vp.x + half, s.y); g.strokePath();
    }
    g.lineStyle(3, this.COL.raya, 0.5);
    g.beginPath(); g.moveTo(vp.x - 34, vp.y); g.lineTo(0, H); g.moveTo(vp.x + 34, vp.y); g.lineTo(W, H); g.strokePath();
    const gw = 78, gh = 34;
    g.fillStyle(0xdfeef6, 0.45);
    for (let x = -gw / 2; x <= gw / 2; x += 7) g.fillRect(vp.x + x, vp.y - gh, 1, gh);
    for (let y = 0; y <= gh; y += 6) g.fillRect(vp.x - gw / 2, vp.y - gh + y, gw, 1);
    g.fillStyle(0xffffff, 1);
    g.fillRect(vp.x - gw / 2 - 3, vp.y - gh - 3, 4, gh + 4); g.fillRect(vp.x + gw / 2, vp.y - gh - 3, 4, gh + 4);
    g.fillRect(vp.x - gw / 2 - 3, vp.y - gh - 3, gw + 7, 4);
  }
  planoEsfuerzo() {
    const W = this.W, H = this.H, C = this.BAL.cine;
    this.limpiarContenido();
    this.cineBG.clear(); this.cineBG.fillStyle(0x1a1206, 1); this.cineBG.fillRect(0, 0, W, H);
    this.cineLabel.setText("· el esfuerzo ·");
    this.lineasVelocidad(W / 2, H / 2, 1, this.esCalden ? 0xffd84d : 0xffffff);
    const jug = this.add.sprite(W / 2, H / 2 + 20, "cine_jugador").setScale(2.6).setAngle(4);
    this.cineContent.add(jug);
    this.tweens.add({ targets: jug, scale: 3.4, angle: -3, duration: C.plano_esfuerzo_ms, ease: "Sine.easeOut" });
    this.SFX && this.SFX.crowd(400);
    this.time.delayedCall(C.plano_esfuerzo_ms, () => this.corte(() => this.planoArquero()));
  }
  planoArquero() {
    const W = this.W, H = this.H, C = this.BAL.cine;
    this.limpiarContenido();
    this.cineBG.clear(); this.cineBG.fillStyle(0x0b2416, 1); this.cineBG.fillRect(0, 0, W, H);
    this.cineBG.fillStyle(this.COL.pasto2, 1); this.cineBG.fillRect(0, H * 0.62, W, H * 0.38);
    this.cineLabel.setText("· el arquero ·");
    const arq = this.add.sprite(W / 2 + 40, H / 2, "cine_arquero").setScale(1.2).setAngle(6);
    this.cineContent.add(arq);
    this.tweens.add({ targets: arq, scale: 3.0, x: W / 2, angle: 0, duration: C.plano_arquero_ms, ease: "Quad.easeOut" });
    const ball = this.add.sprite(W / 2 - 220, H / 2 - 90, "ball").setScale(0.8);
    this.cineContent.add(ball);
    this.tweens.add({ targets: ball, x: W / 2 + 120, y: H / 2 - 20, scale: 1.9, duration: C.plano_arquero_ms, ease: "Sine.easeIn" });
    this.SFX && this.SFX.crowd(500);
    this.time.delayedCall(C.plano_arquero_ms, () => this.corte(() => this.planoDesenlace()));
  }
  planoDesenlace() {
    const W = this.W, H = this.H, C = this.BAL.cine, EP = this.BAL.epica, res = this.res, st = this.st, P = window.PampaPartido;
    this.limpiarContenido();
    this.cineBG.clear(); this.cineBG.fillStyle(0x0b2416, 1); this.cineBG.fillRect(0, 0, W, H);
    this.cineBG.fillStyle(this.COL.pasto2, 1); this.cineBG.fillRect(0, H * 0.66, W, H * 0.34);
    this.cineLabel.setText("· el desenlace ·");
    const gx = W / 2, gy = H * 0.5, gw = 300, gh = 150;
    this.cineBG.fillStyle(0xdfeef6, 0.4);
    for (let x = -gw / 2; x <= gw / 2; x += 16) this.cineBG.fillRect(gx + x, gy - gh, 2, gh);
    for (let y = 0; y <= gh; y += 14) this.cineBG.fillRect(gx - gw / 2, gy - gh + y, gw, 2);
    this.cineBG.fillStyle(0xffffff, 1);
    this.cineBG.fillRect(gx - gw / 2 - 6, gy - gh - 6, 8, gh + 6); this.cineBG.fillRect(gx + gw / 2, gy - gh - 6, 8, gh + 6);
    this.cineBG.fillRect(gx - gw / 2 - 6, gy - gh - 6, gw + 14, 8);
    const arq = this.add.sprite(gx, gy - 20, "cine_arquero").setScale(2.4); this.cineContent.add(arq);
    const ball = this.add.sprite(gx - 260, gy - 40, "ball").setScale(1.6); this.cineContent.add(ball);
    const targetY = gy - gh * 0.6 + (this.zona.gy || 0) * C.drift_mult;

    let pit = null;
    if (res.outcome === "gol") {
      arq.setPosition(gx + (this.zona.gy < 0 ? 90 : -90), gy - 10);
      this.tweens.add({ targets: ball, x: gx + (this.zona.gy || 0) * 1.2, y: targetY, scale: 1.2, duration: C.impacto_gol_ms, ease: "Quad.easeIn" });
      this.time.delayedCall(C.impacto_gol_ms, () => {
        ball.setPosition(gx + (this.zona.gy || 0) * 1.2, targetY);
        this.cameras.main.shake(EP.shake_ms, EP.shake_intensidad);
        this.cameras.main.flash(EP.flash_ms, 255, 255, 210);
        this.SFX && this.SFX.net(); this.time.delayedCall(EP.fanfarria_delay_ms, () => this.SFX && this.SFX.goal());
        this.burst(ball.x, ball.y);
        this.punch(this.esCalden ? "¡CALDENAZO!" : "¡GOOOL!", this.esCalden ? "¡El árbol eterno rompió la red!" : "¡La clavó donde el viento no la saca!", 0xffd84d);
        this.tweens.add({ targets: ball, y: ball.y + 40, duration: EP.red_sacudida_ms, ease: "Bounce.easeOut" });
        P.golMio(st); pit = P.chequearTiempo(st);
      });
    } else if (res.outcome === "atajada") {
      this.tweens.add({ targets: ball, x: gx - 30, y: gy - 20, scale: 1.7, duration: C.impacto_atajada_ms, ease: "Quad.easeIn" });
      this.time.delayedCall(C.impacto_atajada_ms, () => {
        ball.setPosition(gx - 30, gy - 20);
        this.SFX && this.SFX.gloves(); this.cameras.main.shake(EP.atajada_shake_ms, EP.atajada_shake_int);
        this.dust(gx - 30, gy - 20);
        this.punch("¡LA SACÓ!", "El arquero voló y la manoteó.", 0x5bb8e8);
        this.tweens.add({ targets: ball, x: gx - 260, y: gy + 40, duration: EP.rebote_atajada_ms, ease: "Quad.easeOut" });
        P.tiroFallado(st); pit = P.chequearTiempo(st);
      });
    } else {
      this.tweens.add({ targets: ball, x: gx + (this.zona.gy < 0 ? -1 : 1) * (gw / 2 + 60), y: gy - gh - 30, scale: 1.0, alpha: 0.3, duration: C.impacto_afuera_ms, ease: "Quad.easeIn" });
      this.time.delayedCall(C.impacto_afuera_ms - 120, () => {
        this.SFX && this.SFX.afuera(); this.punch("¡AFUERA!", "Se fue por centímetros. ¡Uf!", 0xe3503e);
        P.tiroFallado(st); pit = P.chequearTiempo(st);
      });
    }
    this.time.delayedCall(C.impacto_gol_ms + C.desenlace_hold_ms, () => this.salirCine(pit));
  }

  /* --- cine corto: GAMBETA importante --- */
  cineGambeta(win, despues) {
    this.entrarCine();
    const W = this.W, H = this.H;
    this.limpiarContenido();
    this.cineBG.clear(); this.cineBG.fillStyle(0x1a1206, 1); this.cineBG.fillRect(0, 0, W, H);
    this.cineLabel.setText("· la gambeta ·");
    this.lineasVelocidad(W / 2, H / 2, 1);
    const jug = this.add.sprite(W / 2 - 70, H / 2 + 16, "cine_jugador").setScale(2.4).setAngle(-4); this.cineContent.add(jug);
    const riv = this.add.sprite(W / 2 + 110, H / 2 + 30, "rival_idle").setScale(4.4).setAngle(6); this.cineContent.add(riv);
    this.tweens.add({ targets: jug, x: W / 2 - 30, scale: 3.1, duration: 420, ease: "Sine.easeOut" });
    this.tweens.add({ targets: riv, x: W / 2 + 190, angle: win ? 28 : 0, alpha: win ? 0.55 : 1, duration: 420, ease: "Quad.easeOut" });
    this.SFX && this.SFX.whoosh(360);
    this.time.delayedCall(560, () => {
      this.punch(win ? "¡LO DEJÓ PAGANDO!" : "¡TE LA SACARON!", win ? "La gambeta del partido." : "El quite fue más fuerte.", win ? 0xffd84d : 0xe3503e);
      this.time.delayedCall(1000, () => { this.salirCine(null); this.time.delayedCall(60, despues); });
    });
  }

  /* --- el remate RIVAL: menú del arquero + cine de la atajada --- */
  abrirMenuArquero() {
    const st = this.st, P = window.PampaPartido;
    this.panelBase("🧤 ¡" + this.nombreRival + " remata! Tu arquero bajo los tres palos…");
    const ops = P.opcionesArquero(st);
    const W = this.W, H = this.H;
    ops.forEach((o, i) => {
      this.botonMenu(W / 2, H / 2 - 20 + i * 66, 320, o.ico + " " + o.n, o.riesgo, () => {
        const res = P.resolverAtajada(st, o.id);
        this.limpiarMenu();
        this.cineAtajadaMia(res);
      });
    });
  }
  cineAtajadaMia(res) {
    this.entrarCine();
    const W = this.W, H = this.H, EP = this.BAL.epica;
    this.limpiarContenido();
    this.cineBG.clear(); this.cineBG.fillStyle(0x0b2416, 1); this.cineBG.fillRect(0, 0, W, H);
    this.cineBG.fillStyle(this.COL.pasto2, 1); this.cineBG.fillRect(0, H * 0.62, W, H * 0.38);
    this.cineLabel.setText("· tu arquero ·");
    const arq = this.add.sprite(W / 2 + 60, H / 2, "cine_arquero_mio").setScale(1.3).setFlipX(true); this.cineContent.add(arq);
    const ball = this.add.sprite(W / 2 + 260, H / 2 - 80, "ball").setScale(0.9); this.cineContent.add(ball);
    this.tweens.add({ targets: arq, scale: 3.0, x: W / 2, duration: 480, ease: "Quad.easeOut" });
    this.tweens.add({ targets: ball, x: W / 2 - 60, y: H / 2 - 10, scale: 1.9, duration: 480, ease: "Sine.easeIn" });
    this.SFX && this.SFX.crowd(500);
    this.time.delayedCall(520, () => {
      if (res.golRival) {
        this.cameras.main.shake(EP.shake_ms, EP.shake_intensidad);
        this.SFX && this.SFX.net();
        this.punch("GOL RIVAL", "No llegó… sacás del medio.", 0xe3503e);
      } else if (res.retiene) {
        this.SFX && this.SFX.gloves(); this.dust(W / 2 - 60, H / 2 - 10);
        this.punch("¡LA SACÓ!", "¡Atajadón! Salís jugando.", 0x5bb8e8);
      } else {
        this.SFX && this.SFX.gloves();
        this.punch("¡PUÑOS AFUERA!", res.mia ? "La dividida quedó para tu equipo." : "La dividida la ganó el rival…", 0x7ee08a);
      }
      const pit = window.PampaPartido.chequearTiempo(this.st);
      this.time.delayedCall(1150, () => this.salirCine(pit));
    });
  }

  /* ============================== ENTRETIEMPO / FINAL ============================== */
  panelTiempo(cual) {
    const st = this.st, W = this.W, H = this.H;
    this.fase = "pausa"; this.target = null;
    this.limpiarMenu();
    const titulo = cual === "entretiempo" ? "⏸ ENTRETIEMPO" : "🏁 FINAL DEL PARTIDO";
    const marcador = "VOS " + st.golesMio + " - " + st.golesRival + " " + this.nombreRival;
    const detalle = cual === "entretiempo"
      ? "El descanso recupera aguante para todo el equipo."
      : (st.golesMio > st.golesRival ? "¡GANASTE! El pueblo festeja." : st.golesMio === st.golesRival ? "Empate con gusto a poco… o a mucho." : "Se perdió. La revancha ya se juega en tu cabeza.");
    this.panelBase(titulo + "\n\n" + marcador + "\n" + detalle);
    this.fase = "pausa";   // panelBase la puso en "menu": esto es una pausa dura
    this.botonMenu(W / 2, H / 2 + 90, 380,
      cual === "entretiempo" ? "▶ SEGUNDO TIEMPO" : "↺ JUGAR OTRO PARTIDO",
      cual === "entretiempo" ? "saca " + this.nombreRival : "arranca de cero", () => {
        this.limpiarMenu();
        if (cual === "entretiempo") { window.PampaPartido.entretiempo(st); this.fase = "juego"; this.avisar("¡Arranca el segundo tiempo!", 1400); }
        else this.scene.restart();
      });
    if (cual === "final") this.SFX && this.SFX.whistle();
  }

  /* ---- efectos ---- */
  punch(big, sub, colorNum) {
    const hex = "#" + colorNum.toString(16).padStart(6, "0");
    this.cineBig.setText(big).setColor(hex).setAlpha(1).setScale(0.2).setAngle(-6);
    this.tweens.killTweensOf(this.cineBig);
    this.tweens.add({ targets: this.cineBig, scale: 1, angle: 0, duration: 360, ease: "Back.easeOut" });
    this.cineSub.setText(sub).setAlpha(0);
    this.tweens.add({ targets: this.cineSub, alpha: 1, duration: 300, delay: 240 });
  }
  burst(x, y) {
    const e = this.add.particles(x, y, "spark_sol", { lifespan: 800, speed: { min: 140, max: 420 }, scale: { start: 1.6, end: 0 }, quantity: 30, angle: { min: 0, max: 360 }, tint: [0xffd84d, 0xffffff, 0x7ee08a], emitting: false });
    this.cineLayer.add(e); e.explode(30); this.time.delayedCall(1000, () => e.destroy());
  }
  dust(x, y) {
    const e = this.add.particles(x, y, "spark", { lifespan: 480, speed: { min: 50, max: 150 }, scale: { start: 1.0, end: 0 }, alpha: { start: 0.5, end: 0 }, quantity: 14, angle: { min: 200, max: 340 }, tint: 0xdfeef6, emitting: false });
    this.cineLayer.add(e); e.explode(14); this.time.delayedCall(700, () => e.destroy());
  }
};
