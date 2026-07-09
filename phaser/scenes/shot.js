/* ============================================================================
   PAMPA STAR · phaser/scenes/shot.js — HITO 1: LA REBANADA ÉPICA
   Solo el remate al arco, con toda la épica: corrida, patada, pelota que vuela
   con curva y estela, arquero que se estira, GOL con la red sacudiéndose o
   ATAJADA con rebote; cámara con zoom, shake, flash y slow-motion; sonido por
   beat. Apuntás TOCANDO el arco. Repetible.

   El RESULTADO lo decide phaser/logic/duel.js (lógica pura). La animación es
   ESCLAVA de ese resultado: nunca lo cambia. (Arreglo del bug del arquero.)
   ========================================================================== */
window.PampaShot = class PampaShot extends Phaser.Scene {
  constructor() { super("shot"); }

  init() {
    this.BAL = this.game.registry.get("balance");
    this.SFX = window.PampaSFX;
    this.busy = false;
    this.dificil = false;                 // toggle: arquero figura (para ver atajadas seguido)
  }

  create() {
    window.PampaSprites(this);          // genera las texturas originales (una sola escena, sin transición)
    const W = this.scale.width, H = this.scale.height;
    this.W = W; this.H = H;
    // paleta identidad Pampa Star (HEX)
    this.COL = { pasto: 0x2a9d4f, pasto2: 0x259247, raya: 0xeafff0, sol: 0xf6c11d, sol2: 0xffd84d, cielo: 0x5bb8e8, crema: 0xf6efdc, tinta: 0x0a1f13, rojo: 0xe3503e, ok: 0x7ee08a };

    // ---- fondo: cielo + tribuna + pasto rayado ----
    this.add.rectangle(W / 2, H / 2, W, H, 0x0c2f1a).setDepth(-10);
    const sky = this.add.graphics().setDepth(-9);
    sky.fillStyle(0x123a5a, 1); sky.fillRect(0, 0, W, 150);
    sky.fillStyle(0x0e2c44, 1); for (let x = 0; x < W; x += 10) if ((x / 10) % 2) sky.fillRect(x, 60, 10, 90); // tribuna
    // pasto
    const grass = this.add.graphics().setDepth(-8);
    grass.fillStyle(this.COL.pasto, 1); grass.fillRect(0, 150, W, H - 150);
    grass.fillStyle(this.COL.pasto2, 1);
    for (let x = -40; x < W; x += 64) { grass.fillTriangle(x, 150, x + 32, 150, x - 60, H, x - 92, H); } // franjas en perspectiva
    grass.lineStyle(3, this.COL.raya, 0.5); grass.beginPath(); grass.moveTo(0, 156); grass.lineTo(W, 156); grass.strokePath();

    // ---- geometría del arco (a la derecha) ----
    this.goalX = W - 150;
    this.mouthTop = 205; this.mouthBot = 400;
    this.midMouth = (this.mouthTop + this.mouthBot) / 2;
    this.netDepth = 90;

    // red (malla de nodos que se sacude) + marco
    this.buildGoal();

    // ---- arquero ----
    this.keeper = this.add.sprite(this.goalX - 30, this.midMouth, "keeper_idle").setDepth(6).setScale(1.9);

    // ---- jugador + pelota ----
    this.startX = 175; this.startY = 372;
    this.kickX = 330; this.kickY = 360;
    this.player = this.add.sprite(this.startX, this.startY, "player_idle").setDepth(7).setScale(2.0);
    this.ball = this.add.sprite(this.startX + 22, this.startY + 14, "ball").setDepth(8).setScale(1.7);
    // flecha ▼ "VOS" sobre el jugador (forma + texto, daltonismo)
    this.marker = this.add.text(this.startX, this.startY - 52, "▼ VOS", { fontFamily: "monospace", fontSize: "13px", color: "#ffffff", stroke: "#0a1f13", strokeThickness: 4 }).setOrigin(0.5).setDepth(9);

    // estela de la pelota (partículas)
    this.trail = this.add.particles(0, 0, "spark", {
      lifespan: 260, speed: 0, scale: { start: 1.1, end: 0 }, alpha: { start: 0.6, end: 0 },
      frequency: -1, quantity: 1, tint: 0xffffff, follow: this.ball
    }).setDepth(7);

    // ---- overlays de UI ----
    this.hint = this.add.text(W / 2, 170, "TOCÁ EL ARCO PARA APUNTAR Y REMATAR", { fontFamily: "monospace", fontSize: "16px", color: "#f6efdc", backgroundColor: "#0a1f13cc", padding: { x: 8, y: 4 } }).setOrigin(0.5).setDepth(20);
    this.bigText = this.add.text(W / 2, H / 2 - 30, "", { fontFamily: "monospace", fontSize: "64px", fontStyle: "bold", color: "#ffd84d", stroke: "#9c2b1d", strokeThickness: 8 }).setOrigin(0.5).setDepth(30).setAlpha(0);
    this.subText = this.add.text(W / 2, H / 2 + 34, "", { fontFamily: "monospace", fontSize: "18px", color: "#f6efdc" }).setOrigin(0.5).setDepth(30).setAlpha(0);

    // botón REPETIR (aparece tras el desenlace)
    this.repeat = this.add.text(W / 2, H - 46, "▶ REPETIR", { fontFamily: "monospace", fontSize: "22px", color: "#0a1f13", backgroundColor: "#ffd84d", padding: { x: 18, y: 10 } }).setOrigin(0.5).setDepth(30).setAlpha(0).setInteractive({ useHandCursor: true });
    this.repeat.on("pointerdown", () => { if (this.repeat.alpha > 0) this.reset(); });

    // toggle dificultad (para ver goles Y atajadas a gusto)
    this.diff = this.add.text(12, 12, "ARQUERO: NORMAL", { fontFamily: "monospace", fontSize: "13px", color: "#0a1f13", backgroundColor: "#7ee08a", padding: { x: 8, y: 5 } }).setDepth(30).setInteractive({ useHandCursor: true });
    this.diff.on("pointerdown", () => {
      this.dificil = !this.dificil;
      this.diff.setText(this.dificil ? "ARQUERO: FIGURA" : "ARQUERO: NORMAL").setBackgroundColor(this.dificil ? "#e3503e" : "#7ee08a");
      this.SFX && this.SFX.unlock();
    });

    // zona interactiva del arco (tap para apuntar+rematar)
    this.aimZone = this.add.zone(this.goalX - 40, this.midMouth, 220, this.mouthBot - this.mouthTop + 60).setOrigin(0.5).setInteractive();
    this.aimZone.on("pointerdown", (p) => { this.SFX && this.SFX.unlock(); this.aimAndShoot(p.y); });
    this.reticle = this.add.text(0, 0, "◎", { fontFamily: "monospace", fontSize: "26px", color: "#ffffff", stroke: "#0a1f13", strokeThickness: 3 }).setOrigin(0.5).setDepth(19).setAlpha(0);

    this.cameras.main.setBackgroundColor("#0c2f1a");
  }

  buildGoal() {
    // nodos de la red (grilla) con resorte
    const cols = 9, rows = 6;
    this.net = { cols, rows, nodes: [] };
    const x0 = this.goalX, x1 = this.goalX + this.netDepth;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const rx = x0 + (x1 - x0) * (c / (cols - 1));
        const ry = this.mouthTop + (this.mouthBot - this.mouthTop) * (r / (rows - 1));
        this.net.nodes.push({ rx, ry, x: rx, y: ry, vx: 0, vy: 0 });
      }
    }
    this.netG = this.add.graphics().setDepth(4);
    // marco (postes + travesaño) delante de la red
    this.frameG = this.add.graphics().setDepth(9);
    this.drawFrame();
    this.drawNet();
  }
  drawFrame() {
    const g = this.frameG; g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillRect(this.goalX - 4, this.mouthTop - 4, 8, this.mouthBot - this.mouthTop + 8); // poste
    g.fillRect(this.goalX - 4, this.mouthTop - 4, this.netDepth, 8);                     // travesaño
    g.fillRect(this.goalX - 4, this.mouthBot - 4, this.netDepth, 8);                     // base
  }
  drawNet() {
    const g = this.netG; g.clear();
    g.lineStyle(1.4, 0xdfeef6, 0.55);
    const N = this.net, idx = (r, c) => r * N.cols + c;
    for (let r = 0; r < N.rows; r++) for (let c = 0; c < N.cols - 1; c++) { const a = N.nodes[idx(r, c)], b = N.nodes[idx(r, c + 1)]; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.strokePath(); }
    for (let c = 0; c < N.cols; c++) for (let r = 0; r < N.rows - 1; r++) { const a = N.nodes[idx(r, c)], b = N.nodes[idx(r + 1, c)]; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.strokePath(); }
  }
  netImpulse(px, py) {
    for (const n of this.net.nodes) {
      const d = Phaser.Math.Distance.Between(px, py, n.rx, n.ry);
      if (d < 70) { const k = (1 - d / 70) * 26; n.vx += k; n.vy += (n.ry - py) * -0.04; } // empuja la malla hacia adentro
    }
    this.netActive = 90; // frames de vida del resorte
  }

  update() {
    // resorte de la red (solo mientras está viva)
    if (this.netActive > 0) {
      this.netActive--;
      for (const n of this.net.nodes) {
        n.vx += (n.rx - n.x) * 0.18; n.vy += (n.ry - n.y) * 0.18;   // resorte al reposo
        n.vx *= 0.82; n.vy *= 0.82;                                  // amortiguación
        n.x += n.vx * 0.2; n.y += n.vy * 0.2;
      }
      this.drawNet();
    }
  }

  // ---- apuntar tocando el arco: la Y del toque elige la zona ----
  aimAndShoot(py) {
    if (this.busy) return;
    const zonas = this.BAL.tiro.zonas;
    const alto = py < this.midMouth;                 // arriba/abajo
    const half = (this.mouthBot - this.mouthTop) / 2;
    const rel = (py - this.midMouth) / half;         // -1..1
    let col = rel < -0.33 ? 0 : rel > 0.33 ? 2 : 1;  // izq/centro/der por la Y (mundo apaisado: el "alto" del arco)
    const id = alto ? [ "alto_izq", "alto_centro", "alto_der" ][col] : [ "bajo_izq", "bajo_centro", "bajo_der" ][col];
    const zona = zonas.find(z => z.id === id) || zonas[4];
    // reticle donde apuntó
    const ty = this.zoneTargetY(zona);
    this.reticle.setPosition(this.goalX + 10, ty).setAlpha(1);
    this.tweens.add({ targets: this.reticle, alpha: 0, duration: 700, delay: 200 });
    this.shoot(zona);
  }

  zoneTargetY(zona) {
    const half = (this.mouthBot - this.mouthTop) / 2 - 12;
    return Phaser.Math.Clamp(this.midMouth + zona.gy * 1.5, this.mouthTop + 10, this.mouthBot - 10);
  }

  shoot(zona) {
    if (this.busy) return;
    this.busy = true;
    this.hint.setAlpha(0);
    const BAL = this.BAL, EP = BAL.epica;

    // ===== EL RESULTADO SE DECIDE ACÁ, UNA VEZ. La anim es esclava. =====
    const keeperSkill = this.dificil ? 92 : 46;
    const res = window.PampaDuel.resolveShot({
      shotPower: 66, keeperSkill, zone: zona,
      cfg: { spread: BAL.duelo.spread, min: BAL.duelo.min, max: BAL.duelo.max }
    });
    const targetY = res.outcome === "afuera"
      ? (zona.gy < 0 ? this.mouthTop - 26 : this.mouthBot + 26)   // pasa por arriba/abajo del palo
      : this.zoneTargetY(zona);

    // ---- 1) CORRIDA ----
    this.player.setTexture("player_run");
    this.SFX && this.SFX.crowd(900);
    this.tweens.add({
      targets: [this.player], x: this.kickX, y: this.kickY, duration: EP.corrida_ms, ease: "Sine.easeIn",
      onUpdate: () => { this.player.setTexture((Math.floor(this.time.now / 90) % 2) ? "player_run" : "player_idle"); }
    });
    // la pelota corre pegada al pie
    this.tweens.add({ targets: [this.ball], x: this.kickX + 24, y: this.kickY + 12, duration: EP.corrida_ms, ease: "Sine.easeIn" });
    this.tweens.add({ targets: [this.marker], x: this.kickX, duration: EP.corrida_ms, ease: "Sine.easeIn" });

    // ---- 2) PATADA ----
    this.time.delayedCall(EP.corrida_ms, () => {
      this.player.setTexture("player_kick");
      this.marker.setAlpha(0);
      this.time.delayedCall(EP.patada_windup_ms, () => {
        this.SFX && this.SFX.kick();
        this.cameras.main.flash(70, 255, 255, 255);
        this.launchBall(res, targetY, zona);
      });
    });
  }

  launchBall(res, targetY, zona) {
    const EP = this.BAL.epica;
    const bx0 = this.ball.x, by0 = this.ball.y;
    const gx = this.goalX + (res.outcome === "gol" ? 40 : 2);
    const ctrlX = (bx0 + gx) / 2, ctrlY = Math.min(by0, targetY) - EP.curva_altura; // punto de control (comba hacia arriba)

    this.trail.setFrequency(24);            // enciende la estela
    this.SFX && this.SFX.whoosh(EP.vuelo_ms);

    // el arquero REACCIONA: se estira hacia la pelota (llega si ataja)
    const keeperY = res.keeperWins ? targetY : Phaser.Math.Clamp(this.midMouth + (targetY - this.midMouth) * 0.5, this.mouthTop + 20, this.mouthBot - 20);
    this.keeper.setTexture("keeper_dive");
    this.tweens.add({ targets: this.keeper, x: this.goalX - 44, y: keeperY, duration: EP.vuelo_ms * 0.9, ease: "Quad.easeOut" });

    // vuelo en dos tramos: normal (0→.66) y SLOW-MOTION (.66→1) con zoom
    const t = { v: 0 };
    const setBall = () => {
      const p = t.v, q = 1 - p;
      const x = q * q * bx0 + 2 * q * p * ctrlX + p * p * gx;
      const y = q * q * by0 + 2 * q * p * ctrlY + p * p * targetY;
      this.ball.setPosition(x, y);
      this.ball.setScale(1.7 - 0.5 * p);      // se aleja: se achica un toque
      this.ball.rotation += 0.35;
    };
    this.tweens.add({
      targets: t, v: 0.66, duration: EP.vuelo_ms * 0.66, ease: "Sine.easeIn", onUpdate: setBall,
      onComplete: () => {
        // ---- 3) EL MOMENTO CLAVE: slow-motion + zoom + "¿llega?" ----
        this.cameras.main.zoomTo(EP.zoom_remate, EP.slowmo_ms, "Sine.easeInOut");
        this.cameras.main.pan(this.goalX - 10, this.midMouth, EP.slowmo_ms, "Sine.easeInOut");
        this.SFX && this.SFX.crowd(500);
        this.tweens.add({
          targets: t, v: 1, duration: EP.vuelo_ms * 0.34 / EP.slowmo_factor, ease: "Sine.easeOut", onUpdate: setBall,
          onComplete: () => this.impact(res, targetY, zona)
        });
      }
    });
  }

  impact(res, targetY, zona) {
    const EP = this.BAL.epica;
    this.trail.setFrequency(-1);            // apaga la estela
    this.cameras.main.zoomTo(1, 420, "Sine.easeInOut");
    this.cameras.main.pan(this.W / 2, this.H / 2, 420, "Sine.easeInOut");

    if (res.outcome === "gol") {
      // ¡GOL! red que revienta + flash + shake + fanfarria
      this.ball.setPosition(this.goalX + 46, targetY);
      this.netImpulse(this.goalX + 20, targetY);
      this.cameras.main.shake(EP.shake_ms, EP.shake_intensidad);
      this.cameras.main.flash(EP.flash_ms, 255, 255, 210);
      this.SFX && this.SFX.net();
      this.time.delayedCall(90, () => this.SFX && this.SFX.goal());
      this.burst(this.goalX + 30, targetY);
      this.punch("¡GOOOL!", "¡La clavó donde el viento no la saca!", this.COL.sol2);
      this.tweens.add({ targets: this.ball, y: targetY + 30, duration: EP.red_sacudida_ms, ease: "Bounce.easeOut" });
    } else if (res.outcome === "atajada") {
      // ¡LA SACÓ! guantes + rebote
      this.ball.setPosition(this.keeper.x + 16, this.keeper.y);
      this.SFX && this.SFX.gloves();
      this.cameras.main.shake(140, 0.006);
      this.dust(this.keeper.x + 16, this.keeper.y);
      this.punch("¡LA SACÓ!", "El arquero voló y la manoteó.", this.COL.cielo);
      // rebote afuera
      this.tweens.add({ targets: this.ball, x: this.keeper.x - 120, y: this.keeper.y + 40, duration: EP.rebote_atajada_ms, ease: "Quad.easeOut" });
      this.tweens.add({ targets: this.ball, scale: 1.7, duration: EP.rebote_atajada_ms });
    } else {
      // ¡AFUERA! pasa de largo el palo
      this.SFX && this.SFX.afuera();
      this.punch("¡AFUERA!", "Se fue por centímetros. ¡Uf!", this.COL.rojo);
      this.tweens.add({ targets: this.ball, x: this.goalX + 240, y: targetY + (zona.gy < 0 ? -80 : 80), alpha: 0.2, duration: 520, ease: "Quad.easeIn" });
    }

    this.time.delayedCall(1100, () => { this.repeat.setAlpha(1); this.busy = false; });
  }

  // ---- efectos ----
  punch(big, sub, colorNum) {
    const hex = "#" + colorNum.toString(16).padStart(6, "0");
    this.bigText.setText(big).setColor(hex).setAlpha(1).setScale(0.2).setAngle(-6);
    this.tweens.add({ targets: this.bigText, scale: 1, angle: 0, duration: 360, ease: "Back.easeOut" });
    this.tweens.add({ targets: this.bigText, scale: 1.06, yoyo: true, repeat: 2, duration: 260, delay: 360 });
    this.subText.setText(sub).setAlpha(0);
    this.tweens.add({ targets: this.subText, alpha: 1, duration: 300, delay: 260 });
  }
  burst(x, y) {
    this.add.particles(x, y, "spark_sol", { lifespan: 700, speed: { min: 120, max: 340 }, scale: { start: 1.4, end: 0 }, quantity: 26, angle: { min: 0, max: 360 }, tint: [0xffd84d, 0xffffff, 0x7ee08a], emitting: false }).setDepth(25).explode(26);
  }
  dust(x, y) {
    this.add.particles(x, y, "spark", { lifespan: 420, speed: { min: 40, max: 120 }, scale: { start: 0.9, end: 0 }, alpha: { start: 0.5, end: 0 }, quantity: 12, angle: { min: 200, max: 340 }, tint: 0xdfeef6, emitting: false }).setDepth(25).explode(12);
  }

  reset() {
    this.repeat.setAlpha(0); this.bigText.setAlpha(0); this.subText.setAlpha(0);
    this.player.setTexture("player_idle").setPosition(this.startX, this.startY);
    this.ball.setTexture("ball").setPosition(this.startX + 22, this.startY + 14).setScale(1.7).setAlpha(1).setRotation(0);
    this.keeper.setTexture("keeper_idle").setPosition(this.goalX - 30, this.midMouth);
    this.marker.setPosition(this.startX, this.startY - 52).setAlpha(1);
    for (const n of this.net.nodes) { n.x = n.rx; n.y = n.ry; n.vx = n.vy = 0; }
    this.netActive = 0; this.drawNet();
    this.hint.setAlpha(1);
    this.busy = false;
  }
};
