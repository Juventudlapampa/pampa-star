/* ============================================================================
   PAMPA STAR · phaser/scenes/match.js — HITO 1 (rehecho): EL TURNO
   Dos modos de presentación que se turnan:
     · MODO JUEGO  — cancha 3/4, movés al jugador HACIA el arco al fondo.
     · MODO CINE   — al rematar, CORTA a una secuencia de PLANOS cinematográficos:
                     el pie, el VIAJE (la pelota se aleja HACIA ADENTRO con
                     perspectiva + estela + líneas de velocidad), el esfuerzo,
                     el arquero, y el desenlace (gol/atajada). Slow-mo, shake,
                     flash. Al terminar, VUELVE al modo juego.
   El resultado lo decide phaser/logic/duel.js (puro); la anim es esclava.
   La profundidad la calcula phaser/logic/perspectiva.js (puro).
   ========================================================================== */
window.PampaMatch = class PampaMatch extends Phaser.Scene {
  constructor() { super("match"); }

  init() {
    this.BAL = this.game.registry.get("balance");
    this.SFX = window.PampaSFX;
    this.dificil = false;
    this.modo = "juego";
    this.busy = false;
  }

  create() {
    window.PampaSprites(this);
    const W = this.scale.width, H = this.scale.height;
    this.W = W; this.H = H;
    this.COL = { pasto: 0x2a9d4f, pasto2: 0x1f7a3c, raya: 0xeafff0, sol: 0xf6c11d, sol2: 0xffd84d,
      cielo: 0x5bb8e8, crema: 0xf6efdc, tinta: 0x0a1f13, rojo: 0xe3503e, ok: 0x7ee08a, night: 0x06120b };

    this.gameLayer = this.add.container(0, 0);
    this.cineLayer = this.add.container(0, 0).setVisible(false);

    this.buildJuego();
    this.buildCineBase();

    // toggle dificultad (texto + color: se lee por la palabra, no solo color)
    this.diff = this.add.text(12, 12, "ARQUERO: NORMAL", { fontFamily: "monospace", fontSize: "13px", color: "#0a1f13", backgroundColor: "#7ee08a", padding: { x: 8, y: 5 } }).setDepth(60).setInteractive({ useHandCursor: true });
    this.diff.on("pointerdown", (p, x, y, ev) => { ev && ev.stopPropagation && ev.stopPropagation();
      this.dificil = !this.dificil;
      this.diff.setText(this.dificil ? "ARQUERO: FIGURA" : "ARQUERO: NORMAL").setBackgroundColor(this.dificil ? "#e3503e" : "#7ee08a");
      this.SFX && this.SFX.unlock();
    });

    this.cameras.main.setBackgroundColor("#06120b");
    this.entrarJuego();
  }

  /* =================== MODO JUEGO — cancha 3/4, movés al arco =================== */
  buildJuego() {
    const W = this.W, H = this.H, G = this.gameLayer;
    // perspectiva de la cancha: punto de fuga arriba-centro (el arco al fondo)
    this.jVP = { x: W / 2, y: 96 };
    this.jNearY = H - 8;
    // cielo + tribuna
    const bg = this.add.graphics();
    bg.fillStyle(0x123a5a, 1); bg.fillRect(0, 0, W, 90);
    bg.fillStyle(0x0e2c44, 1); for (let x = 0; x < W; x += 10) if ((x / 10) % 2) bg.fillRect(x, 40, 10, 50);
    G.add(bg);
    // cancha (trapecio que converge al arco) + rayas transversales por perspectiva
    const pitch = this.add.graphics();
    const topL = W * 0.40, topR = W * 0.60, top = 92;
    pitch.fillStyle(this.COL.pasto, 1);
    pitch.fillPoints([{ x: 0, y: H }, { x: W, y: H }, { x: topR, y: top }, { x: topL, y: top }], true);
    pitch.fillStyle(this.COL.pasto2, 1);
    for (let i = 0; i < 8; i++) {   // rayas horizontales, más juntas hacia el fondo
      const d = i / 8, y = top + (H - top) * (d * d);   // perspectiva: se acercan arriba
      const t = (y - top) / (H - top), xl = topL + (0 - topL) * t, xr = topR + (W - topR) * t;
      if (i % 2 === 0) pitch.fillRect(xl, y, xr - xl, Math.max(3, 16 * t));
    }
    pitch.lineStyle(3, this.COL.raya, 0.5);
    pitch.beginPath(); pitch.moveTo(topL, top); pitch.lineTo(0, H); pitch.moveTo(topR, top); pitch.lineTo(W, H); pitch.strokePath();
    G.add(pitch);
    // ARCO al fondo (chico, "lejos")
    const goal = this.add.graphics();
    const gw = 96, gh = 40, gx = W / 2, gy = top + 6;
    goal.fillStyle(0xdfeef6, 0.5);
    for (let x = -gw / 2; x <= gw / 2; x += 8) goal.fillRect(gx + x, gy - gh, 1, gh);
    for (let y = 0; y <= gh; y += 7) goal.fillRect(gx - gw / 2, gy - gh + y, gw, 1);
    goal.fillStyle(0xffffff, 1);
    goal.fillRect(gx - gw / 2 - 3, gy - gh - 3, 4, gh + 3); goal.fillRect(gx + gw / 2, gy - gh - 3, 4, gh + 3);
    goal.fillRect(gx - gw / 2 - 3, gy - gh - 3, gw + 7, 4);
    G.add(goal);
    this.jGoal = { x: gx, y: gy, w: gw, h: gh };
    // arquero del modo juego (chiquito, en el arco)
    this.jKeeper = this.add.sprite(gx, gy - 6, "keeper_idle").setScale(0.9); G.add(this.jKeeper);
    // jugador + pelota (cerca, abajo)
    this.startX = W / 2; this.startY = H - 70;
    this.jPlayer = this.add.sprite(this.startX, this.startY, "player_idle").setScale(2.2); G.add(this.jPlayer);
    this.jBall = this.add.sprite(this.startX + 16, this.startY + 12, "ball").setScale(1.8); G.add(this.jBall);
    this.jMarker = this.add.text(this.startX, this.startY - 58, "▼ VOS", { fontFamily: "monospace", fontSize: "13px", color: "#ffffff", stroke: "#0a1f13", strokeThickness: 4 }).setOrigin(0.5); G.add(this.jMarker);
    // HUD
    this.jHint = this.add.text(W / 2, 108, "ARRASTRÁ para llevar al jugador al arco", { fontFamily: "monospace", fontSize: "15px", color: "#f6efdc", backgroundColor: "#0a1f13cc", padding: { x: 8, y: 4 } }).setOrigin(0.5); G.add(this.jHint);
    this.jRematar = this.add.text(W / 2, H - 30, "⚽ ¡REMATÁ! (tocá el arco)", { fontFamily: "'Press Start 2P',monospace", fontSize: "13px", color: "#0a1f13", backgroundColor: "#ffd84d", padding: { x: 12, y: 8 } }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false);
    this.jRematar.on("pointerdown", (p, x, y, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); this.rematar(this.zonaPorX(this.jPlayer.x)); });
    G.add(this.jRematar);

    // input: arrastre para mover; tocar el arco (en rango) apunta y remata
    this.target = null;
    this.input.on("pointerdown", (p) => this.onPointer(p));
    this.input.on("pointermove", (p) => { if (p.isDown) this.onPointer(p); });
  }
  onPointer(p) {
    if (this.modo !== "juego" || this.busy) return;
    // tocar el arco cuando estás en rango = apuntar + rematar
    if (this.enRango() && p.y < this.BAL.juego.zona_remate_y + 40 && Math.abs(p.x - this.jGoal.x) < this.jGoal.w) {
      this.rematar(this.zonaPorX(p.x)); return;
    }
    this.target = { x: Phaser.Math.Clamp(p.x, 40, this.W - 40), y: Phaser.Math.Clamp(p.y, 120, this.H - 40) };
  }
  enRango() { return this.jPlayer.y < this.BAL.juego.zona_remate_y; }
  zonaPorX(x) {
    const z = this.BAL.tiro.zonas, rel = (x - this.jGoal.x) / (this.jGoal.w / 2); // -1..1
    const col = rel < -0.33 ? 0 : rel > 0.33 ? 2 : 1;
    const alto = Math.random() < 0.5;
    return (alto ? [z[0], z[1], z[2]] : [z[3], z[4], z[5]])[col];
  }

  entrarJuego() {
    this.modo = "juego"; this.busy = false; this.target = null;
    this.gameLayer.setVisible(true); this.cineLayer.setVisible(false);
    this.cameras.main.setZoom(1); this.cameras.main.centerOn(this.W / 2, this.H / 2);
    this.jPlayer.setTexture("player_idle").setPosition(this.startX, this.startY);
    this.jBall.setPosition(this.startX + 16, this.startY + 12).setVisible(true);
    this.jMarker.setPosition(this.startX, this.startY - 58).setVisible(true);
    this.jHint.setVisible(true); this.jRematar.setVisible(false);
  }

  update(time, delta) {
    // MODO CINE: la pelota del VIAJE se aleja hacia adentro, por TIEMPO (no por tween)
    if (this.modo === "cine") { this.updateViaje(delta); return; }
    if (this.modo !== "juego" || this.busy) return;
    const dt = delta / 1000, J = this.BAL.juego;
    const p = this.jPlayer;
    if (this.target) {
      const dx = this.target.x - p.x, dy = this.target.y - p.y, d = Math.hypot(dx, dy);
      if (d > 2) {
        const v = J.vel_jugador * dt;
        p.x += dx / d * Math.min(v, d); p.y += dy / d * Math.min(v, d);
        p.setTexture((Math.floor(time / 90) % 2) ? "player_run" : "player_idle");
      } else p.setTexture("player_idle");
    }
    p.y -= J.vel_avance_auto * dt;                         // deriva lenta hacia el arco
    p.y = Phaser.Math.Clamp(p.y, this.jGoal.y + 40, this.H - 30);
    // la pelota y el nombre siguen al jugador; escala por "profundidad" (más lejos = más chico)
    const prof = Phaser.Math.Clamp((this.startY - p.y) / (this.startY - this.jGoal.y - 40), 0, 1);
    p.setScale(2.2 - 1.0 * prof);
    this.jBall.setPosition(p.x + 12 * (1 - prof), p.y + 10 * (1 - prof)).setScale(1.8 - 0.8 * prof);
    this.jMarker.setPosition(p.x, p.y - 58 * (1 - prof) - 18).setScale(1 - 0.4 * prof);
    // arquero del arco atajando la sombra del jugador
    this.jKeeper.x = this.jGoal.x + Phaser.Math.Clamp((p.x - this.jGoal.x) * 0.25, -this.jGoal.w / 2 + 8, this.jGoal.w / 2 - 8);
    // prompt de remate
    this.jRematar.setVisible(this.enRango());
    this.jHint.setVisible(!this.enRango());
  }

  /* la PELOTA del viaje: se aleja hacia el arco al fondo (perspectiva), por tiempo */
  updateViaje(delta) {
    const vs = this.viajeState; if (!vs || !vs.activo) return;
    vs.elapsed += delta;
    const raw = Phaser.Math.Clamp(vs.elapsed / vs.dur, 0, 1);
    const d = 1 - (1 - raw) * (1 - raw);                         // easeOut: rápido y luego lento (slow-mo natural)
    const s = window.PampaPersp.aPantalla(d, vs.cfg);
    vs.ball.setPosition(s.x, s.y).setScale(0.5 + 3.7 * s.escala); // grande cerca → chica lejos
    vs.ball.rotation += 0.3;
    this.lineasVelocidad(vs.vp.x, vs.vp.y, 0.4 + 0.6 * d);       // líneas de velocidad más intensas al fondo
    if (!vs.zoomed && d > this.BAL.cine.slowmo_desde) {          // el momento clave: zoom + tensión
      vs.zoomed = true;
      this.cameras.main.zoomTo(1.25, 420, "Sine.easeInOut");
      this.cameras.main.pan(vs.vp.x, vs.vp.y + 40, 420, "Sine.easeInOut");
      this.SFX && this.SFX.crowd(500);
    }
    if (raw >= 1) vs.activo = false;
  }

  /* =================== EL CORTE juego → cine =================== */
  rematar(zona) {
    if (this.busy || this.modo !== "juego") return;
    this.busy = true; this.target = null;
    this.SFX && this.SFX.unlock();
    // ===== EL RESULTADO SE DECIDE ACÁ, UNA VEZ. La anim es esclava. =====
    const BAL = this.BAL;
    const keeperSkill = this.dificil ? BAL.duelo.keeper_skill.figura : BAL.duelo.keeper_skill.normal;
    const res = window.PampaDuel.resolveShot({
      shotPower: BAL.duelo.shot_power, keeperSkill, zone: zona,
      cfg: { spread: BAL.duelo.spread, min: BAL.duelo.min, max: BAL.duelo.max }
    });
    // corte seco a negro y arranca el cine
    this.cameras.main.flash(120, 255, 255, 255);
    this.cameras.main.shake(90, 0.006);
    this.time.delayedCall(90, () => this.startCine(res, zona));
  }

  /* =================== MODO CINE — la secuencia de planos =================== */
  buildCineBase() {
    const W = this.W, H = this.H;
    this.cineBG = this.add.graphics(); this.cineLayer.add(this.cineBG);       // fondo por plano
    this.cineContent = this.add.container(0, 0); this.cineLayer.add(this.cineContent);
    this.cineFX = this.add.graphics().setDepth(5); this.cineLayer.add(this.cineFX); // líneas de velocidad
    this.cineBig = this.add.text(W / 2, H / 2 - 20, "", { fontFamily: "'Press Start 2P',monospace", fontSize: "52px", color: "#ffd84d", stroke: "#9c2b1d", strokeThickness: 8 }).setOrigin(0.5).setDepth(40).setAlpha(0); this.cineLayer.add(this.cineBig);
    this.cineSub = this.add.text(W / 2, H / 2 + 34, "", { fontFamily: "monospace", fontSize: "17px", color: "#f6efdc" }).setOrigin(0.5).setDepth(40).setAlpha(0); this.cineLayer.add(this.cineSub);
    this.cineLabel = this.add.text(16, H - 26, "", { fontFamily: "monospace", fontSize: "12px", color: "#f6efdcaa" }).setDepth(40); this.cineLayer.add(this.cineLabel);
    this.cineBlack = this.add.rectangle(W / 2, H / 2, W, H, 0x000000).setDepth(50).setAlpha(0); this.cineLayer.add(this.cineBlack);
  }
  limpiarContenido() { this.cineContent.removeAll(true); this.cineFX.clear(); }
  corte(fn) {   // negro seco entre planos
    const ms = this.BAL.cine.corte_ms;
    this.cineBlack.setAlpha(1);
    this.tweens.add({ targets: this.cineBlack, alpha: 0, duration: ms, delay: 20 });
    this.time.delayedCall(10, fn);
  }

  startCine(res, zona) {
    this.modo = "cine";
    this.gameLayer.setVisible(false); this.cineLayer.setVisible(true);
    this.cameras.main.setZoom(1); this.cameras.main.centerOn(this.W / 2, this.H / 2);
    this.res = res; this.zona = zona;
    this.planoPie();
  }

  // --- PLANO 1: EL PIE ---
  planoPie() {
    const W = this.W, H = this.H, C = this.BAL.cine;
    this.limpiarContenido();
    this.cineBG.clear(); this.cineBG.fillStyle(0x0b2416, 1); this.cineBG.fillRect(0, 0, W, H);
    this.cineLabel.setText("· el pie ·");
    const pie = this.add.sprite(W / 2, H / 2 + 10, "cine_pie").setScale(0.6).setAngle(-8);
    this.cineContent.add(pie);
    this.tweens.add({ targets: pie, scale: 5.2, duration: 260, ease: "Back.easeOut" });
    this.SFX && this.SFX.kick();
    this.cameras.main.flash(90, 255, 255, 220);
    this.lineasVelocidad(W / 2, H / 2, 1);
    this.time.delayedCall(C.plano_pie_ms, () => this.corte(() => this.planoViaje()));
  }

  // --- PLANO 2: EL VIAJE (la pelota HACIA ADENTRO, perspectiva + profundidad) ---
  planoViaje() {
    const W = this.W, H = this.H, C = this.BAL.cine;
    this.limpiarContenido();
    this.cineLabel.setText("· el viaje ·");
    const vp = { x: W / 2, y: H * 0.24 };
    const nearY = H * 0.96;
    // fondo: cancha en perspectiva hacia el punto de fuga + arco al fondo
    this.dibujarCanchaProfunda(vp, nearY);
    // pelota que se aleja
    const ball = this.add.sprite(W / 2, nearY, "ball").setScale(4.2).setDepth(3);
    this.cineContent.add(ball);
    const trail = this.add.particles(0, 0, "spark", { lifespan: 300, speed: 0, scale: { start: 1.0, end: 0 }, alpha: { start: 0.55, end: 0 }, frequency: 22, follow: ball, tint: 0xffffff }).setDepth(2);
    this.cineContent.add(trail);
    this.SFX && this.SFX.whoosh(C.plano_viaje_ms);
    const driftX = (this.zona.gy || 0) * 1.4;
    const cfg = { k: C.persp.k, vpX: vp.x, vpY: vp.y, nearY: nearY, driftX: driftX };
    // La pelota que se aleja HACIA ADENTRO se anima por TIEMPO en update() (no por tween):
    // así avanza siempre y es la pieza que se puede verificar. El avance del plano lo manda el reloj.
    this.viajeState = { activo: true, elapsed: 0, dur: C.plano_viaje_ms, ball, trail, cfg, vp, zoomed: false };
    this.time.delayedCall(C.plano_viaje_ms, () => { if (trail && trail.stop) trail.stop(); if (this.viajeState) this.viajeState.activo = false; this.corte(() => this.planoEsfuerzo()); });
  }
  dibujarCanchaProfunda(vp, nearY) {
    const W = this.W, H = this.H, g = this.cineBG;
    g.clear();
    g.fillStyle(0x123a5a, 1); g.fillRect(0, 0, W, vp.y);                     // cielo
    g.fillStyle(this.COL.pasto, 1);                                          // cancha (trapecio a fuga)
    g.fillPoints([{ x: 0, y: H }, { x: W, y: H }, { x: vp.x + 34, y: vp.y }, { x: vp.x - 34, y: vp.y }], true);
    // rayas transversales por profundidad (más juntas hacia el fondo)
    g.lineStyle(2, this.COL.raya, 0.28);
    for (let i = 1; i <= 9; i++) {
      const d = i / 10, s = window.PampaPersp.aPantalla(d, { k: this.BAL.cine.persp.k, vpX: vp.x, vpY: vp.y, nearY: nearY });
      const t = s.alturaDesdeVP === undefined ? 0 : 0; // usamos y directo
      const halfW = (W / 2) * (s.y - vp.y) / (nearY - vp.y);
      g.beginPath(); g.moveTo(vp.x - halfW, s.y); g.lineTo(vp.x + halfW, s.y); g.strokePath();
    }
    // líneas laterales
    g.lineStyle(3, this.COL.raya, 0.5);
    g.beginPath(); g.moveTo(vp.x - 34, vp.y); g.lineTo(0, H); g.moveTo(vp.x + 34, vp.y); g.lineTo(W, H); g.strokePath();
    // ARCO al fondo (en el punto de fuga)
    const gw = 78, gh = 34;
    g.fillStyle(0xdfeef6, 0.45);
    for (let x = -gw / 2; x <= gw / 2; x += 7) g.fillRect(vp.x + x, vp.y - gh, 1, gh);
    for (let y = 0; y <= gh; y += 6) g.fillRect(vp.x - gw / 2, vp.y - gh + y, gw, 1);
    g.fillStyle(0xffffff, 1);
    g.fillRect(vp.x - gw / 2 - 3, vp.y - gh - 3, 4, gh + 4); g.fillRect(vp.x + gw / 2, vp.y - gh - 3, 4, gh + 4);
    g.fillRect(vp.x - gw / 2 - 3, vp.y - gh - 3, gw + 7, 4);
    // arquero chico en el arco (se agranda en su propio plano)
    this.cineArqPos = { x: vp.x, y: vp.y - 4 };
  }
  lineasVelocidad(cx, cy, inten) {
    const g = this.cineFX, n = this.BAL.cine.lineas_velocidad, W = this.W, H = this.H;
    g.clear();
    const fase = (this.time.now * 0.004) % 1;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + fase * 0.3;
      const r0 = 60 + ((i * 53 + this.time.now * 0.25) % 200);   // el dash viaja hacia afuera
      const r1 = r0 + 70 * inten;
      g.lineStyle(2 + 2 * inten, 0xffffff, 0.18 + 0.28 * inten);
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      g.strokePath();
    }
  }

  // --- PLANO 3: EL ESFUERZO (inserto rápido) ---
  planoEsfuerzo() {
    const W = this.W, H = this.H, C = this.BAL.cine;
    this.limpiarContenido();
    this.cineBG.clear(); this.cineBG.fillStyle(0x1a1206, 1); this.cineBG.fillRect(0, 0, W, H);
    this.cineLabel.setText("· el esfuerzo ·");
    this.lineasVelocidad(W / 2, H / 2, 1);
    const jug = this.add.sprite(W / 2, H / 2 + 20, "cine_jugador").setScale(2.6).setAngle(4);
    this.cineContent.add(jug);
    this.tweens.add({ targets: jug, scale: 3.4, angle: -3, duration: C.plano_esfuerzo_ms, ease: "Sine.easeOut" });
    this.SFX && this.SFX.crowd(400);
    this.time.delayedCall(C.plano_esfuerzo_ms, () => this.corte(() => this.planoArquero()));
  }

  // --- PLANO 4: EL ARQUERO ---
  planoArquero() {
    const W = this.W, H = this.H, C = this.BAL.cine;
    this.limpiarContenido();
    this.cineBG.clear(); this.cineBG.fillStyle(0x0b2416, 1); this.cineBG.fillRect(0, 0, W, H);
    // pasto en el piso
    this.cineBG.fillStyle(this.COL.pasto2, 1); this.cineBG.fillRect(0, H * 0.62, W, H * 0.38);
    this.cineLabel.setText("· el arquero ·");
    const arq = this.add.sprite(W / 2 + 40, H / 2, "cine_arquero").setScale(1.2).setAngle(6);
    this.cineContent.add(arq);
    this.tweens.add({ targets: arq, scale: 3.0, x: W / 2, angle: 0, duration: C.plano_arquero_ms, ease: "Quad.easeOut" });
    // la pelota chica llega hacia los guantes
    const ball = this.add.sprite(W / 2 - 220, H / 2 - 90, "ball").setScale(0.8);
    this.cineContent.add(ball);
    this.tweens.add({ targets: ball, x: W / 2 + 120, y: H / 2 - 20, scale: 1.9, duration: C.plano_arquero_ms, ease: "Sine.easeIn" });
    this.SFX && this.SFX.crowd(500);
    this.time.delayedCall(C.plano_arquero_ms, () => this.corte(() => this.planoDesenlace()));
  }

  // --- PLANO 5: EL DESENLACE ---
  planoDesenlace() {
    const W = this.W, H = this.H, C = this.BAL.cine, EP = this.BAL.epica, res = this.res;
    this.limpiarContenido();
    this.cineBG.clear(); this.cineBG.fillStyle(0x0b2416, 1); this.cineBG.fillRect(0, 0, W, H);
    this.cineBG.fillStyle(this.COL.pasto2, 1); this.cineBG.fillRect(0, H * 0.66, W, H * 0.34);
    this.cineLabel.setText("· el desenlace ·");
    // arco enmarcado (cerca) + red
    const gx = W / 2, gy = H * 0.5, gw = 300, gh = 150;
    this.cineBG.fillStyle(0xdfeef6, 0.4);
    for (let x = -gw / 2; x <= gw / 2; x += 16) this.cineBG.fillRect(gx + x, gy - gh, 2, gh);
    for (let y = 0; y <= gh; y += 14) this.cineBG.fillRect(gx - gw / 2, gy - gh + y, gw, 2);
    this.cineBG.fillStyle(0xffffff, 1);
    this.cineBG.fillRect(gx - gw / 2 - 6, gy - gh - 6, 8, gh + 6); this.cineBG.fillRect(gx + gw / 2, gy - gh - 6, 8, gh + 6);
    this.cineBG.fillRect(gx - gw / 2 - 6, gy - gh - 6, gw + 14, 8);
    const arq = this.add.sprite(gx, gy - 20, "cine_arquero").setScale(2.4);
    this.cineContent.add(arq);
    const ball = this.add.sprite(gx - 260, gy - 40, "ball").setScale(1.6);
    this.cineContent.add(ball);
    const targetY = gy - gh * 0.6 + (this.zona.gy || 0) * 1.4;

    // el TWEEN mueve la pelota (visual); el IMPACTO lo dispara el RELOJ (robusto ante cualquier loop)
    if (res.outcome === "gol") {
      arq.setPosition(gx + (this.zona.gy < 0 ? 90 : -90), gy - 10);   // el arquero llega tarde al otro lado
      this.tweens.add({ targets: ball, x: gx + (this.zona.gy || 0) * 1.2, y: targetY, scale: 1.2, duration: 340, ease: "Quad.easeIn" });
      this.time.delayedCall(340, () => {
        ball.setPosition(gx + (this.zona.gy || 0) * 1.2, targetY);
        this.cameras.main.shake(EP.shake_ms, EP.shake_intensidad);
        this.cameras.main.flash(EP.flash_ms, 255, 255, 210);
        this.SFX && this.SFX.net(); this.time.delayedCall(EP.fanfarria_delay_ms, () => this.SFX && this.SFX.goal());
        this.burst(ball.x, ball.y);
        this.punch("¡GOOOL!", "¡La clavó donde el viento no la saca!", 0xffd84d);
        this.tweens.add({ targets: ball, y: ball.y + 40, duration: EP.red_sacudida_ms, ease: "Bounce.easeOut" });
      });
    } else if (res.outcome === "atajada") {
      this.tweens.add({ targets: ball, x: gx - 30, y: gy - 20, scale: 1.7, duration: 320, ease: "Quad.easeIn" });
      this.time.delayedCall(320, () => {
        ball.setPosition(gx - 30, gy - 20);
        this.SFX && this.SFX.gloves(); this.cameras.main.shake(EP.atajada_shake_ms, EP.atajada_shake_int);
        this.dust(gx - 30, gy - 20);
        this.punch("¡LA SACÓ!", "El arquero voló y la manoteó.", 0x5bb8e8);
        this.tweens.add({ targets: ball, x: gx - 260, y: gy + 40, duration: EP.rebote_atajada_ms, ease: "Quad.easeOut" });
      });
    } else {
      this.tweens.add({ targets: ball, x: gx + (this.zona.gy < 0 ? -1 : 1) * (gw / 2 + 60), y: gy - gh - 30, scale: 1.0, alpha: 0.3, duration: 420, ease: "Quad.easeIn" });
      this.time.delayedCall(300, () => { this.SFX && this.SFX.afuera(); this.punch("¡AFUERA!", "Se fue por centímetros. ¡Uf!", 0xe3503e); });
    }
    this.time.delayedCall(340 + C.desenlace_hold_ms, () => this.volverAJuego());
  }

  volverAJuego() {
    this.cineBig.setAlpha(0); this.cineSub.setAlpha(0);
    this.cameras.main.zoomTo(1, 200); this.cameras.main.centerOn(this.W / 2, this.H / 2);
    this.corte(() => this.entrarJuego());
  }

  // ---- efectos ----
  punch(big, sub, colorNum) {
    const hex = "#" + colorNum.toString(16).padStart(6, "0");
    this.cineBig.setText(big).setColor(hex).setAlpha(1).setScale(0.2).setAngle(-6);
    this.tweens.killTweensOf(this.cineBig);
    this.tweens.add({ targets: this.cineBig, scale: 1, angle: 0, duration: 360, ease: "Back.easeOut" });
    this.cineSub.setText(sub).setAlpha(0);
    this.tweens.add({ targets: this.cineSub, alpha: 1, duration: 300, delay: 240 });
  }
  burst(x, y) {
    const e = this.add.particles(x, y, "spark_sol", { lifespan: 800, speed: { min: 140, max: 420 }, scale: { start: 1.6, end: 0 }, quantity: 30, angle: { min: 0, max: 360 }, tint: [0xffd84d, 0xffffff, 0x7ee08a], emitting: false }).setDepth(45);
    this.cineLayer.add(e); e.explode(30); this.time.delayedCall(1000, () => e.destroy());
  }
  dust(x, y) {
    const e = this.add.particles(x, y, "spark", { lifespan: 480, speed: { min: 50, max: 150 }, scale: { start: 1.0, end: 0 }, alpha: { start: 0.5, end: 0 }, quantity: 14, angle: { min: 200, max: 340 }, tint: 0xdfeef6, emitting: false }).setDepth(45);
    this.cineLayer.add(e); e.explode(14); this.time.delayedCall(700, () => e.destroy());
  }
};
