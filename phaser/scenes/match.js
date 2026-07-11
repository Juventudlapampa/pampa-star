/* ============================================================================
   PAMPA STAR · phaser/scenes/match.js — PARTIDO V2 "Cámara Cinematográfica"
   ETAPA 1 — Cámara y mundo lógico (docs/DISENO_PARTIDO_V2_PAMPA_STAR.md §2/§10)

   El cambio madre: el mundo lógico es la cancha completa (2400×1200) y NUNCA
   se dibuja entera en la vista principal. La cámara sigue al portador con
   lerp + deadzone + zoom 2.2, y SOLO el portador de la pelota se materializa
   como sprite grande. Los otros 21 jugadores existen únicamente como
   ENTIDADES LÓGICAS (posición/stats/aguante en logic/partido.js, que no se
   toca: la simulación sigue en su espacio 1050×680 y la escena escala).

   Qué NO hay todavía (a propósito — una etapa por vez, doc §10):
   radar (Etapa 2) · menús/pausa/retratos (Etapa 3) · animaciones y falsa
   perspectiva (Etapa 4) · economía de guts y duelos (Etapa 5) · cine (Etapa 6).
   La escena anterior (Hito 2 + Tanda ABC) vive en git (commit 53f0d80): sus
   menús, el modo cine y LA DEFINICIÓN se reintegran en las etapas 3-6.

   Saves: se leen igual que siempre (pampa_star_v1 + avatares) — retrocompat.
   ========================================================================== */
window.PampaMatch = class PampaMatch extends Phaser.Scene {
  constructor() { super("match"); }

  init() {
    this.BAL = this.game.registry.get("balance");
    /* ETAPA 1 — constantes de cámara y mundo (números del doc §2; se afinan
       por criterio del doc: chico→más zoom, encajonado→más deadzone,
       tiembla→roundPixels/zoom entero. Con el visto bueno pasan a balance.json) */
    this.V2 = {
      MUNDO_W: 2400, MUNDO_H: 1200,
      ZOOM: 2.2, LERP: 0.12,
      DEADZONE_W: 220, DEADZONE_H: 140,
      PAN_CORTE_MS: 300,          // corte de plano al cambiar el dueño de la pelota (250-400ms)
      ESCALA_PORTADOR: 2          // sprite 34×50 ×2 = 100px de mundo ≈ 41% del alto visible (⅓–½ ✓)
    };
    this.target = null;           // hacia dónde corre el portador (coords de SIMULACIÓN)
  }

  create() {
    window.PampaSprites(this);
    const M = this.BAL.mundo;
    /* la simulación vive en 1050×680 (logic/partido.js intacto con todo su
       tuning); la escena escala esas coordenadas al mundo visible 2400×1200 */
    this.SX = this.V2.MUNDO_W / M.ancho;
    this.SY = this.V2.MUNDO_H / M.alto;

    /* --- estado del partido: los 22 como entidades lógicas (mismo save de siempre) --- */
    const plantel = this.armarPlanteles();
    this.st = window.PampaPartido.crearPartido({ bal: this.BAL, mios: plantel.mios, rivales: plantel.rivales });
    this.nombreRival = plantel.nombreRival;
    /* ETAPA 1 (sandbox): sin encuentros (los menús con pausa son la Etapa 3)
       y sin economía de aguante (la Etapa 5 la trae con los duelos) */
    this.st.cooldown = 9e9;

    this.buildCancha();
    this.buildPortador();

    /* --- LA CÁMARA CINEMATOGRÁFICA (doc §2, literal) --- */
    const cam = this.cameras.main;
    cam.setBackgroundColor("#06120b");
    cam.setBounds(0, 0, this.V2.MUNDO_W, this.V2.MUNDO_H);
    cam.startFollow(this.sprPortador, true, this.V2.LERP, this.V2.LERP);
    cam.setDeadzone(this.V2.DEADZONE_W, this.V2.DEADZONE_H);
    cam.setZoom(this.V2.ZOOM);
    cam.roundPixels = true;       // scroll sin temblor (equivale al roundPixels del config, sin tocar index.html)

    /* --- input: táctil primero (tocás/arrastrás y el portador corre hacia ahí),
           teclado en escritorio (flechas o WASD). Sin mouse obligatorio (doc §8).
           El tap de ¡A LA CANCHA! llega con el puntero todavía apretado desde el
           editor: no cuenta hasta el primer toque propio de esta escena. --- */
    this._punteroListo = false;
    this.input.on("pointerdown", (p) => { this._punteroListo = true; this.apuntar(p); });
    this.input.on("pointermove", (p) => { if (p.isDown && this._punteroListo) this.apuntar(p); });
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys("W,A,S,D");
    }

    /* guía breve pegada al portador (no es HUD: el HUD fijo llega en la Etapa 2) */
    const j = this.portadorActual().j;
    const hint = this.add.text(j.x * this.SX, j.y * this.SY + 70, "tocá la cancha (o flechas) para correr",
      { fontFamily: "monospace", fontSize: "11px", color: "#f6efdc", backgroundColor: "#0a1f13cc", padding: { x: 6, y: 3 } }).setOrigin(0.5).setDepth(5000);
    this.tweens.add({ targets: hint, alpha: 0, delay: 4000, duration: 600, onComplete: () => hint.destroy() });
  }

  /* plantel: VOS + amigos de la Capa 3 (save clásico, tolerante) + roster —
     idéntico al partido anterior: los saves existentes cargan igual */
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
        if (idx >= 0 && a.nombre) { usados.add(idx); mios[idx] = { nombre: String(a.nombre).slice(0, 12), pos: p, stats: a.stats, esAmigo: true, vinculo: a.vinculo || 0, lookClasico: a.look }; }
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
    /* looks del editor (Bloque C): VOS/amigos del save, NPCs procedurales */
    const A = window.PampaAvatar;
    let sueltos = null;
    try { const r2 = localStorage.getItem("pampa_star_avatares"); if (r2) sueltos = JSON.parse(r2); } catch (e) { }
    const avs = (career && career.avatares) || sueltos || {};
    mios.forEach((j, i) => {
      if (j.esVos) j.look = A.validarLook(avs.vos || A.migrarDelClasico(career && career.look) || A.lookProcedural(j.nombre || "vos"));
      else if (j.esAmigo) j.look = A.validarLook((avs.amigos && avs.amigos[j.nombre]) || A.migrarDelClasico(j.lookClasico) || A.lookProcedural(j.nombre));
      else j.look = A.lookProcedural((j.nombre || "compa") + "|" + i);
    });
    rivales.forEach((j, i) => { j.look = A.lookProcedural((j.nombre || "rival") + "|" + pueblo + i); });
    return { mios, rivales, nombreRival: pueblo };
  }

  /* ============ LA CANCHA COMPLETA en el mundo 2400×1200 ============
     Se dibuja UNA vez en coordenadas de mundo; la cámara con zoom hace que
     nunca se vea entera (ventana visible ≈ 436×245 de mundo). Vista simple:
     la falsa perspectiva con convergencia es la Etapa 4. */
  buildCancha() {
    const W = this.V2.MUNDO_W, H = this.V2.MUNDO_H, g = this.add.graphics();
    g.setDepth(0);
    /* pasto con franjas de corte (forma, no solo tono) */
    g.fillStyle(0x2a9d4f, 1); g.fillRect(0, 0, W, H);
    g.fillStyle(0x259247, 1);
    for (let x = 0; x < W; x += 300) g.fillRect(x, 0, 150, H);
    /* líneas: perímetro, medio, círculo central, áreas */
    g.lineStyle(6, 0xeafff0, 0.85);
    g.strokeRect(30, 30, W - 60, H - 60);
    g.beginPath(); g.moveTo(W / 2, 30); g.lineTo(W / 2, H - 30); g.strokePath();
    g.strokeCircle(W / 2, H / 2, 160);
    g.strokeRect(30, H / 2 - 320, 330, 640);            // área propia
    g.strokeRect(W - 360, H / 2 - 320, 330, 640);       // área rival
    g.strokeRect(30, H / 2 - 150, 120, 300);            // área chica propia
    g.strokeRect(W - 150, H / 2 - 150, 120, 300);       // área chica rival
    /* puntos de penal + córners */
    g.fillStyle(0xeafff0, 0.85);
    g.fillCircle(260, H / 2, 8); g.fillCircle(W - 260, H / 2, 8);
    /* arcos (marcos blancos + red simple, mirando adentro) */
    const arco = (x0, dir) => {
      const gh = 200, gy = H / 2;
      g.fillStyle(0xffffff, 1);
      g.fillRect(x0, gy - gh / 2 - 6, 10 * dir, 6);                       // travesaño visto de arriba: postes
      g.fillRect(x0, gy - gh / 2, 8 * dir, gh);                           // línea del arco
      g.fillStyle(0xdfeef6, 0.4);
      for (let y = -gh / 2; y <= gh / 2; y += 16) g.fillRect(x0, gy + y, 26 * dir, 2);   // red
      for (let x = 0; x < 26; x += 8) g.fillRect(x0 + x * dir, gy - gh / 2, 2 * dir, gh);
      g.fillStyle(0xffffff, 1);
      g.fillRect(x0, gy - gh / 2 - 4, 28 * dir, 4); g.fillRect(x0, gy + gh / 2, 28 * dir, 4);
    };
    arco(30, 1);            // arco propio (izquierda)
    arco(W - 30, -1);       // arco rival (derecha)
  }

  /* ============ EL PORTADOR: el ÚNICO sprite grande de la vista ============ */
  portadorActual() {
    const st = this.st;
    if (st.posesion === "mia") return { j: st.mios[st.ctrl], idx: st.ctrl, esRival: false, clave: "m" + st.ctrl };
    return { j: st.rivales[st.portadorRival], idx: st.portadorRival, esRival: true, clave: "r" + st.portadorRival };
  }
  bakePortador(p) {
    const base = (p.esRival ? "v2riv" : "v2mio") + p.idx;
    window.PampaAvatarArte.jugador(this, base, p.j.look, p.esRival);
    /* pixel nítido al escalar (equivale al pixelArt del config, sin tocar index.html) */
    ["_idle", "_run"].forEach(s => this.textures.get(base + s).setFilter(Phaser.Textures.FilterMode.NEAREST));
    return base;
  }
  buildPortador() {
    const p = this.portadorActual();
    this._portadorClave = p.clave;
    const base = this.bakePortador(p);
    this._base = base;
    this.sprPortador = this.add.sprite(p.j.x * this.SX, p.j.y * this.SY, base + "_idle")
      .setScale(this.V2.ESCALA_PORTADOR).setDepth(10);
    this.textures.get("ball").setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.sprPelota = this.add.sprite(0, 0, "ball").setScale(1.6).setDepth(11);
    /* marca de control clara: ▼ + nombre (forma + etiqueta, no solo color) */
    this.marker = this.add.text(0, 0, "▼ VOS", { fontFamily: "monospace", fontSize: "11px", color: "#ffffff", stroke: "#0a1f13", strokeThickness: 4 })
      .setOrigin(0.5).setDepth(12);
  }
  /* el corte de plano: la pelota cambió de dueño → pan breve + follow al nuevo portador (doc §2).
     El destino del pan se actualiza cada frame al portador VIVO: si se mueve
     durante los 300ms, la cámara llega a donde está (sin salto seco al enganchar el follow). */
  seguirPortador() {
    const p = this.portadorActual();
    if (p.clave === this._portadorClave) return;
    this._portadorClave = p.clave;
    this._base = this.bakePortador(p);
    this.sprPortador.setTexture(this._base + "_idle");
    const cam = this.cameras.main;
    cam.stopFollow();
    this._panVivo = true;
    cam.pan(p.j.x * this.SX, p.j.y * this.SY, this.V2.PAN_CORTE_MS, "Sine.easeInOut", true, (c, prog) => {
      if (prog === 1) { this._panVivo = false; cam.startFollow(this.sprPortador, true, this.V2.LERP, this.V2.LERP); }
    });
  }

  /* tocar/arrastrar en la cancha = correr hacia ahí (pantalla → mundo → simulación) */
  apuntar(p) {
    const w = this.cameras.main.getWorldPoint(p.x, p.y);
    this.target = { x: w.x / this.SX, y: w.y / this.SY };
  }

  /* ============================== UPDATE ============================== */
  update(time, delta) {
    const st = this.st, P = window.PampaPartido;
    /* ETAPA 1 (sandbox): sin encuentros ni desgaste — ver nota del create() */
    st.cooldown = 9e9;
    st.mios[st.ctrl].aguante = this.BAL.aguante.max;

    /* input → dirección del portador (teclado pisa al táctil si se usa).
       En posesión rival mirás el corte: tu marcador lógico no se maneja todavía (Etapa 3). */
    let input = null;
    if (st.posesion === "mia") {
      const ctrl = st.mios[st.ctrl];
      if (this.cursors) {
        let dx = 0, dy = 0;
        if (this.cursors.left.isDown || this.wasd.A.isDown) dx -= 1;
        if (this.cursors.right.isDown || this.wasd.D.isDown) dx += 1;
        if (this.cursors.up.isDown || this.wasd.W.isDown) dy -= 1;
        if (this.cursors.down.isDown || this.wasd.S.isDown) dy += 1;
        if (dx || dy) { input = { dx, dy }; this.target = null; }
      }
      if (!input && this.target) {
        const dx = this.target.x - ctrl.x, dy = this.target.y - ctrl.y;
        if (Math.hypot(dx, dy) > 8) input = { dx, dy }; else this.target = null;
      }
    } else this.target = null;

    const evs = P.tick(st, delta, input);
    let aviso = null;
    for (const ev of evs) {
      /* Etapa 1: sin menús — solo el esqueleto del reloj (el partido completo vuelve en las etapas 3+) */
      if (ev.tipo === "entretiempo") { P.entretiempo(st); aviso = "ENTRETIEMPO — saca " + this.nombreRival; }
      else if (ev.tipo === "final") aviso = "FINAL " + st.golesMio + "-" + st.golesRival + " — Etapa 1 completa";
      else if (ev.tipo === "rivalTira") {
        /* el rival llegó al área: sin menú de arquero todavía (Etapa 3), la
           atajada se auto-resuelve para que el sandbox no quede congelado */
        const res = P.resolverAtajada(st, Math.random() < 0.5 ? "atajar" : "despejar");
        aviso = res.golRival ? "GOL DE " + this.nombreRival + " — sacás vos"
          : res.retiene ? "¡Tu arquero la retuvo! Salís jugando"
            : res.mia ? "¡Puños afuera! La dividida quedó tuya"
              : "¡Puños afuera! La ganó " + this.nombreRival;
      }
    }

    /* el portador (y SOLO él) se dibuja; si la pelota cambió de dueño, corte de plano */
    this.seguirPortador();
    const p = this.portadorActual();
    const wx = p.j.x * this.SX, wy = p.j.y * this.SY;
    const corriendo = !p.esRival && !!(input);
    this.sprPortador.setPosition(wx, wy)
      .setTexture(this._base + (corriendo && Math.floor(time / 110) % 2 ? "_run" : "_idle"));
    this.sprPelota.setPosition(st.pelota.x * this.SX, st.pelota.y * this.SY + 34);
    this.marker.setText("▼ " + (p.j.esVos ? "VOS" : (p.j.nombre || "").toUpperCase().slice(0, 10)))
      .setPosition(wx, wy - 62);
    /* pan vivo: mientras dura el corte, el destino persigue al portador real */
    const cam = this.cameras.main;
    if (this._panVivo && cam.panEffect.isRunning) cam.panEffect.destination.set(wx, wy);
    if (aviso) this.avisar(aviso);
  }

  /* aviso breve anclado al PORTADOR (a donde la cámara va, no de donde viene) */
  avisar(txt) {
    const t = this.add.text(this.sprPortador.x, this.sprPortador.y - 96, txt, { fontFamily: "monospace", fontSize: "12px", color: "#f6efdc", backgroundColor: "#0a1f13dd", padding: { x: 8, y: 4 }, align: "center" })
      .setOrigin(0.5).setDepth(5000);
    this.tweens.add({ targets: t, alpha: 0, delay: 2200, duration: 500, onComplete: () => t.destroy() });
  }
};
