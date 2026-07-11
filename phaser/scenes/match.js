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
   animaciones y falsa perspectiva (Etapa 4) · economía de guts (Etapa 5) ·
   cine/cut-ins (Etapa 6). Del §7 quedan SIN implementar (decisión anotada
   para Rodri, no son bugs): los menús de RECEPCIÓN (Trap/Through/volea/
   cabezazo al recibir — hoy el pase da control directo y el "through" vive
   dentro del pase dirigido), el Despeje de jugador en área propia y el
   "achicar" del arquero en el mano a mano.
   La escena anterior (Hito 2 + Tanda ABC) vive en git (commit 53f0d80): sus
   menús, el modo cine y LA DEFINICIÓN se reintegran en las etapas 3-6.

   Saves: se leen igual que siempre (pampa_star_v1 + avatares) — retrocompat.
   ========================================================================== */
window.PampaMatch = class PampaMatch extends Phaser.Scene {
  constructor() { super("match"); }

  /* retratos del banco (doc §6): se cargan acá; sin server/archivo, cae a la cara del avatar */
  preload() {
    this._retratos = { companero: [], rival: [] };
    const man = this.game.registry.get("portraits");
    if (man && Array.isArray(man.retratos)) {
      man.retratos.forEach((r, i) => {
        const key = "retrato_" + i;
        this.load.image(key, "../" + r.archivo);
        (r.arquetipo === "rival" ? this._retratos.rival : this._retratos.companero).push(key);
      });
    }
  }

  init() {
    this.BAL = this.game.registry.get("balance");
    this.SFX = window.PampaSFX;
    /* FEATURE FLAGS por etapa (regla de la sesión): se apagan desde balance.json → flags.
       Apagado = comportamiento de la etapa anterior. partido_phaser (fusión) vive en la Etapa Final. */
    this.FLAGS = Object.assign({ e3_menus: true, e4_arte: true, e5_guts: true, e6_cine: true }, this.BAL.flags || {});
    this.estado = "LIBRE";               // LIBRE_CORRIENDO | MENU (pausa) | PASE (apuntando) | RESOLUCION (doc §9)
    /* ETAPA 1 — constantes de cámara y mundo (números del doc §2; se afinan
       por criterio del doc: chico→más zoom, encajonado→más deadzone,
       tiembla→roundPixels/zoom entero. Con el visto bueno pasan a balance.json) */
    this.V2 = {
      MUNDO_W: 2400, MUNDO_H: 1200,
      ZOOM: 2.2, LERP: 0.12,
      DEADZONE_W: 220, DEADZONE_H: 140,
      PAN_CORTE_MS: 300,          // corte de plano al cambiar el dueño de la pelota (250-400ms)
      ESCALA_PORTADOR: 2,         // sprite tosco 34×50 ×2 = 100px de mundo ≈ 41% del alto visible (⅓–½ ✓)
      ESCALA_HEROICO: 1.0         // sprite heroico 48×108 (cuerpo ~91px) ≈ 37% del alto visible (⅓–½ ✓)
    };
    this.target = null;           // hacia dónde corre el portador (coords de SIMULACIÓN)
    this.sprDuelo = null;         // limpio ante scene.restart (el objeto viejo murió con la escena)
    this._bakes = new Set();      // re-horneado fresco POR PARTIDO (la pinta pudo cambiar)
    this._persp = null;
    this._urgente = false;        // el anuncio de los últimos 5' vuelve a armarse cada partido
    this._ladoTema = null;        // el motivo musical suena al cambiar el LADO, no en cada pase
    this._hudMarc = this._hudReloj = this._hudGuts = null;   // caches del HUD: el restart los recrea vacíos
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

    /* capa de MUNDO (cancha + portador): la ve solo la cámara principal con zoom;
       capa de HUD (radar + marcador + guts) y capa de MENÚ: solo la cámara de UI fija */
    this.mundoLayer = this.add.container(0, 0);
    this.hudLayer = this.add.container(0, 0);
    this.menuLayer = this.add.container(0, 0);

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

    /* --- ETAPA 2: RADAR + HUD en cámara fija (doc §3/§4) --- */
    this.buildRadar();
    this.buildHUD();
    this.buildBotonAccion();
    this.uiCam = this.cameras.add(0, 0, 960, 540);
    cam.ignore([this.hudLayer, this.menuLayer]);
    this.uiCam.ignore(this.mundoLayer);

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
      this.keyEnter = this.input.keyboard.addKey("ENTER");
      /* ESPACIO = el botón de acción (doc §8); ESC = cancelar (todo se puede sin mouse) */
      this.input.keyboard.on("keydown-SPACE", (ev) => { ev.preventDefault && ev.preventDefault(); this.onBotonAccion(); });
      this.input.keyboard.on("keydown-ESC", () => {
        if (this.estado === "PASE" && this._paseCancelar) this._paseCancelar();
        else if (this.estado === "MENU" && this._menuVolver) this._menuVolver();
      });
    }

    /* guía breve pegada al portador */
    const j = this.portadorActual().j;
    const wj = this.aRender(j.x, j.y);
    const hint = this.add.text(wj.x, wj.y + 70, "tocá la cancha (o flechas) para correr",
      { fontFamily: "monospace", fontSize: "11px", color: "#f6efdc", backgroundColor: "#0a1f13cc", padding: { x: 6, y: 3 } }).setOrigin(0.5).setDepth(5000);
    this.mundoLayer.add(hint);
    this.uiCam.ignore(hint);   // el ignore del container no cubre hijos agregados después
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
    if (this.FLAGS.e4_arte) { this.buildCanchaPerspectiva(); return; }
    const W = this.V2.MUNDO_W, H = this.V2.MUNDO_H, g = this.add.graphics();
    g.setDepth(0);
    this.mundoLayer.add(g);
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

  /* ============ ETAPA 4 · CANCHA EN FALSA PERSPECTIVA (dirección de arte) ============
     Lados convergiendo hacia el fondo (arriba = lejos), leve curvatura de
     horizonte, franjas horizontales #2E7D32/#388E3C que se AFINAN a lo lejos,
     y los sprites se achican con la profundidad (escalaEn). */
  buildCanchaPerspectiva() {
    const W = this.V2.MUNDO_W, H = this.V2.MUNDO_H, g = this.add.graphics();
    g.setDepth(0);
    this.mundoLayer.add(g);
    const yTop = 96, yBot = H - 22, insTop = 170, insBot = 20;
    this._persp = { yTop, yBot, insTop, insBot };   // lo usa aRender() para remapear la sim al trapecio
    const xIzq = y => insTop + (insBot - insTop) * ((y - yTop) / (yBot - yTop));
    const xDer = y => W - xIzq(y);
    /* cielo + tribuna + HORIZONTE CURVO (la leve curvatura de la Tierra) */
    g.fillStyle(0x123a5a, 1); g.fillRect(0, 0, W, yTop);
    g.fillStyle(0x0e2c44, 1); for (let x = 0; x < W; x += 26) g.fillRect(x, 10, 13, 44);
    g.fillStyle(0xf6efdc, 0.25); for (let x = 10; x < W; x += 40) g.fillRect(x, 22 + Math.floor(8 * Math.sin(x * 0.01)), 3, 3);   // gente
    g.fillStyle(0x1b5e20, 1); g.fillEllipse(W / 2, yTop + 30, W * 1.12, 78);
    /* pasto: FRANJAS HORIZONTALES en dos verdes, más finas hacia el fondo */
    let y = yBot, i = 0;
    while (y > yTop) {
      const t = (y - yTop) / (yBot - yTop);
      const h = Math.max(24, 26 + 66 * t);
      g.fillStyle(i % 2 ? 0x2e7d32 : 0x388e3c, 1);
      g.fillRect(0, Math.max(yTop, y - h), W, Math.min(h, y - yTop));
      y -= h; i++;
    }
    /* cuñas laterales oscuras = la convergencia hacia el fondo */
    g.fillStyle(0x14352a, 1);
    g.fillTriangle(0, yTop, insTop, yTop, insBot, yBot); g.fillTriangle(0, yTop, insBot, yBot, 0, yBot);
    g.fillTriangle(W, yTop, W - insTop, yTop, W - insBot, yBot); g.fillTriangle(W, yTop, W - insBot, yBot, W, yBot);
    /* líneas: perímetro trapezoidal + medio + círculo elíptico + áreas */
    g.lineStyle(6, 0xeafff0, 0.85);
    g.strokePoints([{ x: insTop, y: yTop }, { x: W - insTop, y: yTop }, { x: W - insBot, y: yBot }, { x: insBot, y: yBot }], true, true);
    g.beginPath(); g.moveTo(W / 2, yTop); g.lineTo(W / 2, yBot); g.strokePath();
    g.strokeEllipse(W / 2, (yTop + yBot) / 2, 340, 250);
    const area = (lado) => {   // trapecio del área siguiendo la perspectiva
      const y0 = (yTop + yBot) / 2 - 320, y1 = (yTop + yBot) / 2 + 320;
      const x0 = lado > 0 ? xIzq(y0) : xDer(y0), x1 = lado > 0 ? xIzq(y1) : xDer(y1);
      const prof = 330 * lado;
      g.strokePoints([{ x: x0, y: y0 }, { x: x0 + prof, y: y0 }, { x: x1 + prof, y: y1 }, { x: x1, y: y1 }], false, true);
      g.fillStyle(0xeafff0, 0.85); g.fillCircle((lado > 0 ? xIzq((yTop + yBot) / 2) : xDer((yTop + yBot) / 2)) + 240 * lado, (yTop + yBot) / 2, 8);
    };
    area(1); area(-1);
    /* arcos sobre las líneas de gol (blancos con red) */
    const arco = (lado) => {
      const yc = (yTop + yBot) / 2, gh = 210;
      const gx = lado > 0 ? xIzq(yc) : xDer(yc), dir = lado;
      g.fillStyle(0xffffff, 1);
      g.fillRect(gx - (dir > 0 ? 8 : 0), yc - gh / 2, 8, gh);
      g.fillStyle(0xdfeef6, 0.4);
      for (let yy = -gh / 2; yy <= gh / 2; yy += 16) g.fillRect(gx, yc + yy, 28 * -dir, 2);
      for (let xx = 0; xx < 28; xx += 8) g.fillRect(gx - xx * dir, yc - gh / 2, 2, gh);
      g.fillStyle(0xffffff, 1);
      g.fillRect(gx - (dir > 0 ? 30 : -2), yc - gh / 2 - 4, 30, 4); g.fillRect(gx - (dir > 0 ? 30 : -2), yc + gh / 2, 30, 4);
    };
    arco(1); arco(-1);
  }

  /* ============ EL PORTADOR: el ÚNICO sprite grande de la vista ============ */
  portadorActual() {
    const st = this.st;
    if (st.posesion === "mia") return { j: st.mios[st.ctrl], idx: st.ctrl, esRival: false, clave: "m" + st.ctrl };
    return { j: st.rivales[st.portadorRival], idx: st.portadorRival, esRival: true, clave: "r" + st.portadorRival };
  }
  bakePortador(p) {
    const Arte = window.PampaAvatarArte;
    if (this.FLAGS.e4_arte) {
      /* ETAPA 4: sprite HEROICO ¾ trasero con kit (celeste liso vs naranja a rayas).
         Fresco una vez por partido (fuerza): la pinta pudo cambiar en el editor. */
      const esArq = p.j.pos === "ARQ";
      const base = (p.esRival ? "h_riv" : "h_mio") + p.idx;
      if (!this._bakes) this._bakes = new Set();
      const fresco = !this._bakes.has(base); this._bakes.add(base);
      Arte.heroico(this, base, p.j.look, esArq ? (p.esRival ? "arqRival" : "arqMio") : (p.esRival ? "rival" : "mio"),
        p.j.numero, esArq ? ["parado", "estirada", "atajada", "despeje"] : undefined, fresco);
      this._esHeroico = true; this._escalaBase = this.V2.ESCALA_HEROICO;
      this._animIdle = esArq ? "_parado_" : "_correr_";
      return base;
    }
    const base = (p.esRival ? "v2riv" : "v2mio") + p.idx;
    Arte.jugador(this, base, p.j.look, p.esRival);
    ["_idle", "_run"].forEach(s => this.textures.get(base + s).setFilter(Phaser.Textures.FilterMode.NEAREST));
    this._esHeroico = false; this._escalaBase = this.V2.ESCALA_PORTADOR;
    return base;
  }
  /* escala por profundidad (E4): más lejos (arriba) = más chico */
  escalaEn(jy) { return this.FLAGS.e4_arte ? (0.82 + 0.36 * (jy / this.st.H)) : 1; }
  /* sim → mundo de RENDER: con la cancha en perspectiva (E4) el rectángulo de la
     simulación se remapea AL TRAPECIO dibujado (nadie pisa el cielo ni las cuñas) */
  aRender(jx, jy) {
    if (!this.FLAGS.e4_arte || !this._persp) return { x: jx * this.SX, y: jy * this.SY };
    const P = this._persp;
    const y = P.yTop + 16 + (jy / this.st.H) * (P.yBot - P.yTop - 30);
    const t = (y - P.yTop) / (P.yBot - P.yTop);
    const xi = P.insTop + (P.insBot - P.insTop) * t;
    const x = xi + 16 + (jx / this.st.W) * (this.V2.MUNDO_W - 2 * xi - 32);
    return { x, y };
  }
  buildPortador() {
    const p = this.portadorActual();
    this._portadorClave = p.clave;
    const base = this.bakePortador(p);
    this._base = base;
    const w0 = this.aRender(p.j.x, p.j.y);
    this.sprPortador = this.add.sprite(w0.x, w0.y, base + (this._esHeroico ? this._animIdle + "1" : "_idle"))
      .setScale(this._escalaBase).setDepth(10);
    this.textures.get("ball").setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.sprPelota = this.add.sprite(0, 0, "ball").setScale(1.6).setDepth(11);
    /* marca de control clara: ▼ + nombre (forma + etiqueta, no solo color) */
    this.marker = this.add.text(0, 0, "▼ VOS", { fontFamily: "monospace", fontSize: "11px", color: "#ffffff", stroke: "#0a1f13", strokeThickness: 4 })
      .setOrigin(0.5).setDepth(12);
    this.trailG = this.add.graphics().setDepth(8);   // estelas de velocidad (E4)
    this._trail = [];
    this.mundoLayer.add([this.trailG, this.sprPortador, this.sprPelota, this.marker]);
  }

  /* ============ ETAPA 2 · RADAR (doc §3): la ÚNICA vista de la cancha entera ============
     Graphics fijo redibujado por frame desde las 22 entidades lógicas (el plan
     barato del doc, seguro en gama baja). Accesibilidad: forma + color + número:
     míos = CÍRCULOS #4FC3F7 · rivales = TRIÁNGULOS #FF8A50 · pelota = ROMBO
     blanco con borde negro · anillo blanco en quien controlás. */
  buildRadar() {
    const rw = 264, rh = 132, rx = 12, ry = 540 - rh - 12;
    this.radar = { x: rx, y: ry, w: rw, h: rh };
    const marco = this.add.rectangle(rx + rw / 2, ry + rh / 2, rw + 6, rh + 6, 0x0b3d0b, 0.92).setStrokeStyle(2, 0xf6efdc, 0.7);
    this.radarG = this.add.graphics();
    this.hudLayer.add([marco, this.radarG]);
    /* números de camiseta: 22 textos chiquitos que siguen a su ficha */
    const mkNum = (n) => {
      const t = this.add.text(0, 0, String(n), { fontFamily: "monospace", fontSize: "9px", color: "#0a1f13", fontStyle: "bold" }).setOrigin(0.5).setDepth(1);
      this.hudLayer.add(t); return t;
    };
    this.radarNumsMios = this.st.mios.map(j => mkNum(j.numero));
    this.radarNumsRiv = this.st.rivales.map(j => mkNum(j.numero));
    /* zona interactiva (el pase dirigible y el cambio en defensa la usan en la Etapa 3) */
    this.radarZona = this.add.zone(rx + rw / 2, ry + rh / 2, rw, rh).setInteractive();
    this.hudLayer.add(this.radarZona);
    this.radarZona.on("pointerdown", (p, x, y, ev) => {
      ev && ev.stopPropagation && ev.stopPropagation();
      this._uiTocado = this.time.now;
      this.onRadarTap(p);
    });
  }
  radarAMundo(p) {   // punto del radar → coordenadas de SIMULACIÓN
    const R = this.radar, st = this.st;
    return { x: (p.x - R.x) / R.w * st.W, y: (p.y - R.y) / R.h * st.H };
  }
  onRadarTap(p) {
    const st = this.st, P = window.PampaPartido, w = this.radarAMundo(p);
    if (this.estado === "PASE") {
      /* PASE DIRIGIBLE (doc §7): tocás el destino en el radar. El receptor es el
         más cercano al punto; si tocaste MÁS ALLÁ de él (hacia el arco), es AL VACÍO. */
      let mejor = null, md = 1e9;
      this._receptores.forEach(r => {
        const j = st.mios[r.idx], d = Math.hypot(j.x - w.x, j.y - w.y);
        if (d < md) { md = d; mejor = r; }
      });
      if (!mejor) return;
      const alVacio = mejor.adelante && w.x > st.mios[mejor.idx].x + 40;
      this.confirmarPase(mejor, alVacio);
    } else if (this.estado === "LIBRE" && st.posesion === "rival") {
      /* en defensa: tap en el radar elige a quién controlás */
      let mejor = -1, md = 1e9;
      st.mios.forEach((j, i) => { if (j.pos === "ARQ") return; const d = Math.hypot(j.x - w.x, j.y - w.y); if (d < md) { md = d; mejor = i; } });
      if (mejor >= 0 && P.cambiarA(st, mejor)) this.avisar("Marcás con " + st.mios[mejor].nombre.toUpperCase());
    }
  }

  /* ============ ETAPA 3 · RETRATOS (doc §6, banco de Rodri) ============ */
  _caraDe(j, lado) {
    const key = "cara_" + lado + (j.numero || 0);
    if (!this.textures.exists(key)) window.PampaAvatarArte.cara(this, key, j.look || window.PampaAvatar.crearLook());
    return key;
  }
  retratoKey(j, esRival) {
    /* VOS y tus amigos: la cara del avatar que eligieron en el editor.
       El resto: retrato del banco por arquetipo (determinista por nombre). */
    if (!esRival && (j.esVos || j.esAmigo) && j.look) return this._caraDe(j, "m");
    const pool = this._retratos[esRival ? "rival" : "companero"].filter(k => this.textures.exists(k));
    if (pool.length) return pool[window.PampaAvatar.hashSemilla(j.nombre || "x") % pool.length];
    return this._caraDe(j, esRival ? "r" : "m");
  }
  retratoPanel(x, j, esRival, gutsVal) {
    const key = this.retratoKey(j, esRival);
    const img = this.add.image(x, 386, key);
    const esc = 132 / img.height; img.setScale(esc);
    const marco = this.add.rectangle(x, 386, img.width * esc + 10, 142, 0x0a1f13, 0.55).setStrokeStyle(2, esRival ? 0xff8a50 : 0x4fc3f7);
    const nom = this.add.text(x, 464, (j.esVos ? "VOS" : (j.nombre || "").toUpperCase().slice(0, 12)), { fontFamily: "monospace", fontSize: "12px", color: "#f6efdc", fontStyle: "bold" }).setOrigin(0.5);
    /* §6: nombre + BARRA de guts (color por umbral) + número SIEMPRE */
    const max = this.BAL.aguante.max, frac = Phaser.Math.Clamp(gutsVal / max, 0, 1);
    const barCol = frac > 0.5 ? 0x2e7d32 : frac > 0.25 ? 0xf9a825 : 0xc62828;
    const barBg = this.add.rectangle(x, 480, 96, 9, 0x0a1f13, 0.9).setStrokeStyle(1, 0xf6efdc, 0.7);
    const bar = this.add.rectangle(x - 48 + 48 * frac, 480, 96 * frac, 7, barCol, 1);
    const guts = this.add.text(x, 495, "GUTS " + Math.round(gutsVal), { fontFamily: "monospace", fontSize: "11px", color: "#ffd84d" }).setOrigin(0.5);
    this.menuLayer.add([marco, img, nom, barBg, bar, guts]);
  }

  /* ============ ETAPA 3 · EL MENÚ EN CRUZ con pausa (doc §7/§8/§9) ============ */
  buildBotonAccion() {
    if (!this.FLAGS.e3_menus) return;   // sin menús (flag apagado) no hay botón de acción
    const r = this.add.rectangle(876, 462, 150, 56, 0xffd84d, 1).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
    this.txtBotonAccion = this.add.text(876, 462, "☰ ACCIÓN", { fontFamily: "'Press Start 2P',monospace", fontSize: "11px", color: "#0a1f13" }).setOrigin(0.5);
    this.hudLayer.add([r, this.txtBotonAccion]);
    r.on("pointerdown", (p, x, y, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); this._uiTocado = this.time.now; this.onBotonAccion(); });
  }
  /* transición de ENTRETIEMPO (E6): fundido + banner con el marcador */
  transicionEntretiempo() {
    this.SFX && this.SFX.whistle();
    if (!this.FLAGS.e6_cine) return;
    const st = this.st;
    this.cameras.main.fadeIn(700, 6, 18, 11);
    const banda = this.add.rectangle(480, 200, 960, 84, 0x0a1f13, 0.9);
    const t = this.add.text(480, 190, "⏸ ENTRETIEMPO", { fontFamily: "'Press Start 2P',monospace", fontSize: "18px", color: "#ffd84d" }).setOrigin(0.5);
    const m = this.add.text(480, 218, "VOS " + st.golesMio + " - " + st.golesRival + " " + this.nombreRival + " · el descanso recupera aguante", { fontFamily: "monospace", fontSize: "12px", color: "#f6efdc" }).setOrigin(0.5);
    this.hudLayer.add([banda, t, m]);
    this.cameras.main.ignore([banda, t, m]);
    this.tweens.add({ targets: [banda, t, m], alpha: 0, delay: 2100, duration: 500, onComplete: () => { banda.destroy(); t.destroy(); m.destroy(); } });
  }
  onBotonAccion() {
    const st = this.st, P = window.PampaPartido;
    if (!this.FLAGS.e3_menus || this.estado !== "LIBRE") return;
    if (st.posesion === "mia") { st.modo = "congelado"; this.abrirMenuAtaque(null, true); }
    else { P.cambiarAlMasCercano(st); this.avisar("Marcás con " + st.mios[st.ctrl].nombre.toUpperCase()); }   // defensor más cercano (doc §7)
  }
  limpiarMenu() { this.menuLayer.removeAll(true); this._menuOps = null; this._menuSel = null; this._menuVolver = null; this._paseCancelar = null; }
  /* ⚠ Phaser: ignore(container) taggea solo a los hijos EXISTENTES — todo lo que
     se agrega al menú DESPUÉS hay que re-ignorarlo o se dibuja duplicado en la
     cámara con zoom. Llamar esto al final de cada armado de menú. */
  selloMenu() { this.cameras.main.ignore(this.menuLayer); }
  /* materializa al SEGUNDO sprite grande del cruce (doc §1 permite portador+rival+arquero) */
  materializarDuelo(j, esRival, texturaFija) {
    this.quitarDuelo();
    const Arte = window.PampaAvatarArte;
    let tx, escala = this.V2.ESCALA_PORTADOR;
    if (this.FLAGS.e4_arte) {
      /* MISMA clave que el portador (idx = numero-1): un solo horneado por jugador */
      const esArq = j.pos === "ARQ";
      this._dueloBase = (esRival ? "h_riv" : "h_mio") + ((j.numero || 1) - 1);
      this._dueloEsArq = esArq;
      if (!this._bakes) this._bakes = new Set();
      const fresco = !this._bakes.has(this._dueloBase); this._bakes.add(this._dueloBase);
      Arte.heroico(this, this._dueloBase, j.look || window.PampaAvatar.crearLook(),
        esArq ? (esRival ? "arqRival" : "arqMio") : (esRival ? "rival" : "mio"),
        j.numero, esArq ? ["parado", "estirada", "atajada", "despeje"] : undefined, fresco);
      tx = this._dueloBase + (esArq ? "_parado_0" : "_correr_1");
      escala = this.V2.ESCALA_HEROICO * this.escalaEn(j.y);
    } else if (texturaFija) tx = texturaFija;
    else {
      const base = (esRival ? "v2riv" : "v2mio") + "d" + (j.numero || 0);
      Arte.jugador(this, base, j.look || window.PampaAvatar.crearLook(), esRival);
      tx = base + "_idle";
      this._dueloBase = null;
    }
    const wd = this.aRender(j.x, j.y);
    /* oclusión coherente con la perspectiva: el que está más CERCA (abajo) tapa */
    const prof = j.y > this.portadorActual().j.y ? 11 : 9;
    this.sprDuelo = this.add.sprite(wd.x, wd.y, tx).setScale(escala).setDepth(prof);
    this.mundoLayer.add(this.sprDuelo);
    if (this.uiCam) this.uiCam.ignore(this.sprDuelo);
  }
  quitarDuelo() { if (this.sprDuelo) { this.sprDuelo.destroy(); this.sprDuelo = null; } }
  /* la cruz: opciones en W/N/E/S como el pad del original (doc §8) */
  abrirMenuCruz(cfg) {
    this.estado = "MENU";
    this.limpiarMenu();
    const strip = this.add.rectangle(480, 404, 960, 216, 0x0a1f13, 0.42);
    const tit = this.add.text(480, 306, cfg.titulo, { fontFamily: "monospace", fontSize: "13px", color: "#f6efdc", backgroundColor: "#0a1f13cc", padding: { x: 8, y: 3 }, align: "center", wordWrap: { width: 660 } }).setOrigin(0.5);
    this.menuLayer.add([strip, tit]);
    if (cfg.izq) this.retratoPanel(104, cfg.izq.j, !!cfg.izq.esRival, cfg.izq.guts);
    if (cfg.der) this.retratoPanel(856, cfg.der.j, cfg.der.esRival !== false, cfg.der.guts);
    const POS = { N: [480, 352], S: [480, 458], W: [318, 405], E: [642, 405] };
    this._menuOps = {}; this._menuSel = null; this._menuBtns = {};
    ["N", "S", "W", "E"].forEach(dir => {
      const op = cfg.opciones[dir];
      if (!op) return;
      this._menuOps[dir] = op;
      const [x, y] = POS[dir];
      const bg = op.bloqueada ? 0x333d36 : 0xf6efdc;
      /* bloqueado se ve por TEXTURA (rayado ▨) + motivo escrito, no solo por el gris */
      const r = this.add.rectangle(x, y, 176, 50, bg, 0.97).setStrokeStyle(2, 0x0a1f13);
      const subTxt = op.bloqueada ? ("▨ " + (op.motivo || "no disponible")) : op.sub;
      const t = this.add.text(x, y - (subTxt ? 9 : 0), op.texto, { fontFamily: "'Press Start 2P',monospace", fontSize: "10px", color: op.bloqueada ? "#9aa59d" : "#0a1f13" }).setOrigin(0.5);
      this.menuLayer.add([r, t]);
      if (subTxt) { const s = this.add.text(x, y + 13, subTxt, { fontFamily: "monospace", fontSize: "10px", color: op.bloqueada ? "#c76a5e" : "#365a41" }).setOrigin(0.5); this.menuLayer.add(s); }
      if (!op.bloqueada) {
        r.setInteractive({ useHandCursor: true });
        r.on("pointerdown", (p, xx, yy, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); this._uiTocado = this.time.now; op.cb(); });
      }
      this._menuBtns[dir] = r;
    });
    /* opción del CENTRO (p.ej. 🔥 CALDÉN cuando está disponible, sin pisar el TIRO) */
    if (cfg.centro) {
      const c = this.add.rectangle(480, 405, 150, 50, 0xff8c3a, 0.97).setStrokeStyle(2, 0x0a1f13).setInteractive({ useHandCursor: true });
      const ct = this.add.text(480, 398, cfg.centro.texto, { fontFamily: "'Press Start 2P',monospace", fontSize: "10px", color: "#0a1f13" }).setOrigin(0.5);
      const cs = this.add.text(480, 416, cfg.centro.sub || "", { fontFamily: "monospace", fontSize: "10px", color: "#5a2d12" }).setOrigin(0.5);
      this.menuLayer.add([c, ct, cs]);
      c.on("pointerdown", (p, xx, yy, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); this._uiTocado = this.time.now; cfg.centro.cb(); });
    }
    if (cfg.volver) {
      this._menuVolver = cfg.volver;
      const v = this.add.rectangle(906, 306, 64, 48, 0xdcd6c2, 0.95).setStrokeStyle(2, 0x0a1f13).setInteractive({ useHandCursor: true });
      const vt = this.add.text(906, 306, "✕", { fontFamily: "monospace", fontSize: "18px", color: "#0a1f13" }).setOrigin(0.5);
      this.menuLayer.add([v, vt]);
      v.on("pointerdown", (p, xx, yy, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); this._uiTocado = this.time.now; cfg.volver(); });
    }
    this.selloMenu();
  }
  menuSeleccionar(dir) {
    if (!this._menuOps || !this._menuOps[dir]) return;
    this._menuSel = dir;
    Object.keys(this._menuBtns).forEach(d => this._menuBtns[d].setStrokeStyle(d === dir ? 4 : 2, d === dir ? 0xffd84d : 0x0a1f13));
  }
  teclasDeMenu() {
    if (!this.cursors) return;
    const JD = Phaser.Input.Keyboard.JustDown;
    if (this.estado === "MENU") {
      if (JD(this.cursors.left)) this.menuSeleccionar("W");
      if (JD(this.cursors.right)) this.menuSeleccionar("E");
      if (JD(this.cursors.up)) this.menuSeleccionar("N");
      if (JD(this.cursors.down)) this.menuSeleccionar("S");
      if (JD(this.keyEnter) && this._menuSel) {
        const op = this._menuOps[this._menuSel];
        if (op && !op.bloqueada) op.cb();
      }
    } else if (this.estado === "PASE" && this._receptores) {
      if (JD(this.cursors.left)) { this._recSel = (this._recSel + this._receptores.length - 1) % this._receptores.length; }
      if (JD(this.cursors.right)) { this._recSel = (this._recSel + 1) % this._receptores.length; }
      if (JD(this.keyEnter)) { this.confirmarPase(this._receptores[this._recSel], false); return; }   // confirmado: no evaluar más teclas
      if (JD(this.cursors.up)) { const r = this._receptores[this._recSel]; if (r && r.adelante) this.confirmarPase(r, true); }
    }
  }

  /* --- los menús por situación (doc §7) --- */
  abrirMenuAtaque(rivalIdx, libre) {
    const st = this.st, P = window.PampaPartido;
    const rival = rivalIdx != null ? st.rivales[rivalIdx] : null;
    if (rival) this.materializarDuelo(rival, true);
    const acc = P.accionesAtaque(st);
    const A = id => acc.find(a => a.id === id) || { bloqueada: true, motivo: "no disponible", poder: 0, costo: 0 };
    const pct = a => Math.round(window.PampaDuel.duelChance(a.poder, P.poderRival(st), this.BAL.duelo) * 100);
    const puedeC = P.puedeCalden(st), puedeT = P.puedeTirar(st);
    const gam = A("gambeta"), par = A("pared"), tir = A("tiro");
    this.abrirMenuCruz({
      titulo: rival ? "⚔ ¡" + (rival.nombre || "el rival").toUpperCase() + " te sale al cruce! (eligen en secreto: quite>gambeta · corte>pase · bloqueo>tiro)" : "¿Qué hacés?",
      izq: { j: st.mios[st.ctrl], guts: st.mios[st.ctrl].aguante },
      der: rival ? { j: rival, guts: st.aguanteRival } : null,
      opciones: {
        W: { texto: "➡ PASE", sub: "elegí destino en el radar", cb: () => this.iniciarPaseDirigido(rivalIdx, libre) },
        N: {
          texto: "⚡ GAMBETA", sub: libre ? "seguís corriendo" : "~" + pct(gam) + "% · " + gam.costo + " guts", bloqueada: !libre && gam.bloqueada, motivo: gam.motivo,
          cb: () => libre ? this.reanudarLibre() : this.resolverAccionAtaque(gam, rivalIdx)
        },
        S: { texto: "🔁 UNO-DOS", sub: par.bloqueada ? null : "~" + pct(par) + "% · " + par.costo + " guts", bloqueada: par.bloqueada, motivo: par.motivo, cb: () => this.resolverAccionAtaque(par, rivalIdx) },
        E: { texto: "🎯 TIRO", sub: puedeT ? "~" + pct(tir) + "% de zafar · " + this.BAL.aguante.costo_tiro + " guts" : null, bloqueada: !puedeT || tir.bloqueada, motivo: !puedeT ? "desde campo propio no llega" : tir.motivo, cb: () => this.resolverTiro(false, rivalIdx, libre) }
      },
      /* el CALDÉN convive con el tiro normal (§7: opciones separadas) — va al centro */
      centro: puedeC ? { texto: "🔥 CALDÉN", sub: this.BAL.aguante.costo_calden + " guts · especial", cb: () => this.resolverTiro(true, rivalIdx, libre) } : null,
      volver: libre ? () => this.reanudarLibre() : null
    });
  }
  abrirMenuDefensa() {
    const st = this.st, P = window.PampaPartido;
    const rival = st.rivales[st.portadorRival];
    this.materializarDuelo(st.mios[st.ctrl], false);   // tu marcador entra a cámara
    const acc = P.accionesDefensa(st);
    const A = id => acc.find(a => a.id === id) || { bloqueada: true, motivo: "no disponible", poder: 0, costo: 0 };
    const pct = a => Math.round(window.PampaDuel.duelChance(a.poder, P.poderRival(st) + 4, this.BAL.duelo) * 100);
    const qui = A("quite"), cor = A("corte"), blo = A("bloqueo");
    const sub = a => a.bloqueada ? null : "~" + pct(a) + "% · " + a.costo + " guts";
    this.abrirMenuCruz({
      titulo: "🛡 ¡" + this.nombreRival + " avanza! Adivinale la intención (solo ves TUS números)",
      /* §6 literal: ATACANTE a la izquierda, defensor a la derecha */
      izq: { j: rival, esRival: true, guts: st.aguanteRival },
      der: { j: st.mios[st.ctrl], esRival: false, guts: st.mios[st.ctrl].aguante },
      opciones: {
        W: { texto: "✂ CORTE", sub: sub(cor), bloqueada: cor.bloqueada, motivo: cor.motivo, cb: () => this.resolverAccionDefensa(cor) },
        N: { texto: "🦶 QUITE", sub: sub(qui), bloqueada: qui.bloqueada, motivo: qui.motivo, cb: () => this.resolverAccionDefensa(qui) },
        E: { texto: "🧱 BLOQUEO", sub: sub(blo), bloqueada: blo.bloqueada, motivo: blo.motivo, cb: () => this.resolverAccionDefensa(blo) },
        S: { texto: "⏳ NO MOVERSE", sub: "+" + this.BAL.aguante.recupera_no_moverse + " guts · el rival sigue", cb: () => this.resolverNoMoverse() }
      }
    });
  }
  abrirMenuArquero() {
    const st = this.st, P = window.PampaPartido;
    const arq = st.mios.find(j => j.pos === "ARQ");
    this.materializarDuelo(arq, false, "keeper_mio");
    const ops = P.opcionesArquero(st);
    this.abrirMenuCruz({
      titulo: "🧤 ¡" + this.nombreRival + " remata! Tu arquero bajo los tres palos…",
      izq: { j: arq, guts: arq.aguante },
      der: { j: st.rivales[st.portadorRival], guts: st.aguanteRival },
      opciones: {
        W: { texto: "🧤 " + ops[0].n, sub: ops[0].riesgo, cb: () => this.resolverArquero(ops[0].id) },
        N: { texto: "👊 " + ops[1].n, sub: ops[1].riesgo, cb: () => this.resolverArquero(ops[1].id) }
      }
    });
  }

  /* --- resoluciones (doc §7: el CPU eligió en secreto; §9: RESOLUCION sin input) --- */
  resolverAccionAtaque(a, rivalIdx) {
    const st = this.st, P = window.PampaPartido;
    const r = P.resolverDuelo(st, { accion: a.id, poder: a.poder, costo: a.costo });
    if (r.win) {
      P.ganarAtaque(st, a.id);
      this.mostrarResolucion(a.id === "pared" ? "¡PARED Y SEGUÍS DE LARGO!" : "¡GAMBETA Y DE LARGO!" + (r.matriz === "zafaste" ? "\n(le erraron a la marca)" : ""), "#7ee08a", { anim: "gambeta", gana: true });
    } else {
      P.perderPelota(st);
      this.mostrarResolucion(r.matriz === "leyeron" ? "¡TE LEYERON LA JUGADA!\nPelota rival." : "TE LA SACARON.\nPelota rival.", "#e3503e", { anim: "gambeta", gana: false });
    }
  }
  resolverAccionDefensa(a) {
    const st = this.st, P = window.PampaPartido;
    const r = P.resolverDuelo(st, { accion: a.id, poder: a.poder, costo: a.costo });
    if (r.win) { P.ganarDefensa(st); this.mostrarResolucion("¡RECUPERASTE!" + (r.matriz === "leiste" ? "\n(le leíste la intención)" : ""), "#7ee08a", { anim: "quite", gana: true }); }
    else { P.perderDefensa(st); this.mostrarResolucion(r.matriz === "teEngano" ? "TE ENGAÑÓ CON EL AMAGUE…" : "SE TE ESCAPÓ POR VELOCIDAD…", "#e3503e", { anim: "quite", gana: false }); }
  }
  resolverNoMoverse() {
    const st = this.st, P = window.PampaPartido;
    const r = P.esperarDefensa(st);
    this.mostrarResolucion("Esperás y juntás aire (+" + r.recupero + " guts).\nEl rival sigue…", "#f6efdc", null);
  }
  resolverArquero(id) {
    const st = this.st, P = window.PampaPartido;
    const res = P.resolverAtajada(st, id);
    const snd = this.FLAGS.e6_cine ? this.SFX : null;
    if (res.golRival) { this.efectoGol(true); this.mostrarResolucion("GOL DE " + this.nombreRival + "…\nSacás del medio.", "#e3503e", { anim: "arquero", gana: false }); }
    else if (res.retiene) { snd && snd.gloves(); this.mostrarResolucion("¡LA RETUVO TU ARQUERO!\nSalís jugando.", "#7ee08a", { anim: "arquero", gana: true }); }
    else { snd && snd.gloves(); this.mostrarResolucion(res.mia ? "¡PUÑOS AFUERA!\nLa dividida quedó tuya." : "¡PUÑOS AFUERA!\nLa ganó " + this.nombreRival + "…", "#f6efdc", { anim: "arquero", gana: true }); }
  }
  resolverTiro(esCalden, rivalIdx, libre) {
    const st = this.st, P = window.PampaPartido;
    if (!libre && rivalIdx != null) {
      /* la matriz manda: primero zafar del BLOQUEO del defensor */
      const acc = P.accionesAtaque(st).find(a => a.id === "tiro");
      const r = P.resolverDuelo(st, { accion: "tiro", poder: acc ? acc.poder : 50, costo: 0 });
      if (!r.win) {
        P.perderPelota(st);
        this.mostrarResolucion(r.matriz === "leyeron" ? "¡TE BLOQUEARON EL TIRO!\nLo veían venir." : "TE LO TAPARON.\nPelota rival.", "#e3503e", { anim: "gambeta", gana: false });
        return;
      }
    }
    const rematar = () => {
      const prep = P.prepararRemate(st, esCalden);
      const res = window.PampaDuel.resolveShot({
        shotPower: prep.shotPower, keeperSkill: prep.keeperSkill, zone: { bonus: 0, fuera: 0.05, gy: 0 },
        cfg: { spread: this.BAL.duelo.spread, min: this.BAL.duelo.min, max: this.BAL.duelo.max }
      });
      const snd = this.FLAGS.e6_cine ? this.SFX : null;   // flag apagado = Etapa 5 exacta (sin SFX de acción)
      snd && snd.kick();
      if (res.outcome === "gol") {
        P.golMio(st);
        this.efectoGol(false);
        this.mostrarResolucion((esCalden ? "¡CALDENAZO!\n" : "¡GOOOL!\n") + (prep.arqueroVendido ? "(el arquero estaba vendido)" : "¡La clavaste!"), "#ffd84d", { anim: "tiro", gana: true });
      }
      else if (res.outcome === "atajada") { P.tiroFallado(st); snd && snd.gloves(); this.mostrarResolucion("¡LA SACÓ EL ARQUERO!", "#5bb8e8", { anim: "tiro", gana: false }); }
      else { P.tiroFallado(st); snd && snd.afuera(); this.mostrarResolucion("¡AFUERA!\nSe fue por centímetros…", "#e3503e", { anim: "tiro", gana: false }); }
    };
    /* E6: el tiro ESPECIAL entra con CUT-IN de pantalla (retrato grande + banner) */
    if (esCalden && this.FLAGS.e6_cine) this.cutInEspecial("¡DISPARO DEL CALDÉN!", rematar);
    else rematar();
  }

  /* ============ ETAPA 6 · pulido cinematográfico ============ */
  cutInEspecial(titulo, cb) {
    this.estado = "RESOLUCION";
    this.limpiarMenu();
    const j = this.st.mios[this.st.ctrl];
    const franja = this.add.rectangle(480, 270, 1100, 190, 0x2a130b, 0.94).setStrokeStyle(4, 0xffd84d).setAngle(-4);
    const img = this.add.image(-140, 270, this.retratoKey(j, false));
    img.setScale(180 / img.height);
    const txt = this.add.text(1150, 258, titulo, { fontFamily: "'Press Start 2P',monospace", fontSize: "22px", color: "#ffd84d", stroke: "#0a1f13", strokeThickness: 8 }).setOrigin(0.5);
    const sub = this.add.text(1150, 292, (j.esVos ? "VOS" : j.nombre) + " toma fuerza del árbol eterno…", { fontFamily: "monospace", fontSize: "13px", color: "#f6efdc" }).setOrigin(0.5);
    this.menuLayer.add([franja, img, txt, sub]);
    this.selloMenu();
    this.tweens.add({ targets: img, x: 200, duration: 260, ease: "Back.easeOut" });
    this.tweens.add({ targets: [txt, sub], x: 560, duration: 260, ease: "Back.easeOut" });
    this.cameras.main.flash(120, 255, 216, 77);
    this.SFX && this.SFX.whoosh(700);
    this.time.delayedCall(950, () => { this.limpiarMenu(); cb(); });
  }
  /* la RED se sacude: sacudón + chispas en la boca del arco.
     El gol EN CONTRA se distingue también por sonido (notas que bajan) y chispas frías. */
  efectoGol(arcoIzquierdo) {
    if (!this.FLAGS.e6_cine) return;   // flag apagado = Etapa 5 exacta (silencio)
    const st = this.st, enContra = arcoIzquierdo;
    const w = this.aRender(enContra ? 20 : st.W - 20, st.H / 2);
    const e = this.add.particles(w.x, w.y, enContra ? "spark" : "spark_sol", {
      lifespan: 700, speed: { min: 120, max: 360 }, scale: { start: 1.4, end: 0 }, quantity: 26,
      angle: { min: 0, max: 360 }, tint: enContra ? [0xdfeef6, 0x9aa5b0] : [0xffd84d, 0xffffff], emitting: false
    });
    this.mundoLayer.add(e);
    e.explode(26);
    this.time.delayedCall(900, () => e.destroy());
    this.cameras.main.shake(240, 0.011);
    this.SFX && this.SFX.net();
    this.time.delayedCall(90, () => this.SFX && (enContra ? (this.SFX.golEnContra && this.SFX.golEnContra()) : this.SFX.goal()));
  }
  reanudarLibre() {
    this.st.modo = "juego";
    this.quitarDuelo();
    this.limpiarMenu();
    this.estado = "LIBRE";
  }
  finDelPartido() {
    const st = this.st;
    this.estado = "FINAL";     // estado propio: ningún delayedCall de resolución lo puede barrer
    this.SFX && this.SFX.whistle();
    this.quitarDuelo();
    this.limpiarMenu();
    const t = this.add.text(480, 250, "🏁 FINAL: VOS " + st.golesMio + " - " + st.golesRival + " " + this.nombreRival, { fontFamily: "'Press Start 2P',monospace", fontSize: "16px", color: "#ffd84d", stroke: "#0a1f13", strokeThickness: 6, align: "center" }).setOrigin(0.5);
    const b = this.add.rectangle(480, 330, 320, 54, 0x7ee08a, 1).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
    const bt = this.add.text(480, 330, "↺ OTRO PARTIDO", { fontFamily: "'Press Start 2P',monospace", fontSize: "11px", color: "#0a1f13" }).setOrigin(0.5);
    this.menuLayer.add([t, b, bt]);
    b.on("pointerdown", () => this.scene.restart());
    this.selloMenu();
  }

  /* --- PASE dirigido tocando el radar (doc §7/§8) --- */
  iniciarPaseDirigido(rivalIdx, libre) {
    const st = this.st, P = window.PampaPartido;
    const rs = P.receptoresPase(st);
    if (!rs.length) { this.avisar("No hay a quién dársela…"); return; }
    this.limpiarMenu();
    this.estado = "PASE";
    this._receptores = rs; this._recSel = 0;
    this._paseOrigen = { rivalIdx, libre };
    const hint = this.add.text(this.radar.x + this.radar.w / 2, this.radar.y - 26,
      "➡ PASE: tocá el DESTINO en el radar\n(más allá del receptor = AL VACÍO · teclado: ◀▶ + ENTER, ▲ = al vacío, ESC = volver)",
      { fontFamily: "monospace", fontSize: "10px", color: "#0a1f13", backgroundColor: "#ffd84d", padding: { x: 6, y: 3 }, align: "center" }).setOrigin(0.5, 1);
    this._paseCancelar = () => {
      if (this._paseOrigen.libre) this.reanudarLibre(); else this.abrirMenuAtaque(this._paseOrigen.rivalIdx, false);
    };
    const cancel = this.add.rectangle(this.radar.x + this.radar.w + 36, this.radar.y + 24, 56, 48, 0xdcd6c2, 0.95).setStrokeStyle(2, 0x0a1f13).setInteractive({ useHandCursor: true });
    const ct = this.add.text(this.radar.x + this.radar.w + 36, this.radar.y + 24, "✕", { fontFamily: "monospace", fontSize: "18px", color: "#0a1f13" }).setOrigin(0.5);
    this.menuLayer.add([hint, cancel, ct]);
    cancel.on("pointerdown", (p, x, y, ev) => {
      ev && ev.stopPropagation && ev.stopPropagation(); this._uiTocado = this.time.now;
      this._paseCancelar && this._paseCancelar();
    });
    this.selloMenu();
  }
  confirmarPase(rec, alVacio) {
    const st = this.st, P = window.PampaPartido;
    this._receptores = null;
    let res, texto;
    if (alVacio) {
      res = P.resolverPaseAlVacio(st, rec.idx, rec.pct);
      texto = res.win ? "¡PASE AL VACÍO!\n" + st.mios[st.ctrl].nombre.toUpperCase() + " la agarra en carrera\n(el arquero quedó vendido)" : "¡La adelantaste demasiado!\nPelota rival.";
    } else {
      res = P.resolverPase(st, rec.idx, rec.pct);
      texto = res.win ? "Pase justo.\nAHORA JUGÁS: " + st.mios[st.ctrl].nombre.toUpperCase() : "¡INTERCEPTADO!\nLeyeron el pase.";
    }
    this.mostrarResolucion(texto, res.win ? "#7ee08a" : "#e3503e", { anim: "pase", gana: res.win });
  }

  /* --- RESOLUCION (doc §9): sin input, se muestra el desenlace y se reanuda --- */
  mostrarResolucion(texto, colorHex, animCfg) {
    this.estado = "RESOLUCION";
    this.limpiarMenu();
    const t = this.add.text(480, 226, texto, { fontFamily: "'Press Start 2P',monospace", fontSize: "13px", color: colorHex, stroke: "#0a1f13", strokeThickness: 5, align: "center", lineSpacing: 8 }).setOrigin(0.5).setScale(0.3);
    this.menuLayer.add(t);
    this.selloMenu();
    this.tweens.add({ targets: t, scale: 1, duration: 260, ease: "Back.easeOut" });
    this.animarResolucion(animCfg);
    this.time.delayedCall(1050, () => {
      /* si durante la resolución se abrió OTRO momento (p.ej. rivalTira, que no
         espera cooldown), ese menú manda: no lo barremos ni tocamos el estado */
      if (this.estado !== "RESOLUCION") return;
      this.quitarDuelo();
      this.limpiarMenu();
      this.estado = "LIBRE";
    });
  }
  /* ETAPA 4: la resolución se VE — el que actúa reproduce su animación de 4 frames */
  animarResolucion(cfg) {
    if (!cfg || !this.FLAGS.e4_arte || !this._esHeroico) return;
    if (cfg.anim === "arquero") {
      if (this.sprDuelo && this._dueloBase && this._dueloEsArq)
        this.reproducirAnim(this.sprDuelo, this._dueloBase, cfg.gana ? ((this.st.golesRival + Math.floor(this.st.minuto)) % 2 ? "atajada" : "despeje") : "estirada", 900);
      return;
    }
    if (cfg.anim === "quite" && cfg.gana && this.sprDuelo && this._dueloBase && !this._dueloEsArq) {
      /* recuperaste VOS: la animación es de TU marcador (el sprite del duelo), no del rival */
      this.reproducirAnim(this.sprDuelo, this._dueloBase, "pase", 900);   // barrida baja
      return;
    }
    /* variedad del remate: tiro raso / volea / cabezazo (se ven y se distinguen) */
    const variedad = ["tiro", "volea", "cabezazo"][(this.st.golesMio + this.st.golesRival + Math.floor(this.st.minuto * 10)) % 3];
    const mapa = { gambeta: "gambeta", pase: "pase", quite: "gambeta", tiro: variedad };
    this.reproducirAnim(this.sprPortador, this._base, mapa[cfg.anim] || "gambeta", cfg.anim === "tiro" && cfg.gana ? 480 : 900);
    if (cfg.anim === "tiro" && cfg.gana)
      this.time.delayedCall(500, () => { if (this.sprPortador.active) this.reproducirAnim(this.sprPortador, this._base, "festejo", 520); });
  }
  /* UN solo ciclo (0→3) sosteniendo el último frame: las acciones no se "rebobinan" */
  reproducirAnim(spr, base, anim, dur) {
    let f = 0;
    this.time.addEvent({
      delay: Math.max(50, dur / 5), repeat: 4,
      callback: () => {
        if (!spr.active) return;
        const key = base + "_" + anim + "_" + Math.min(f++, 3);
        if (this.textures.exists(key)) spr.setTexture(key);
      }
    });
  }
  dibujarRadar() {
    const g = this.radarG, R = this.radar, st = this.st;
    g.clear();
    const mx = wx => R.x + wx / st.W * R.w, my = wy => R.y + wy / st.H * R.h;
    g.lineStyle(1, 0xeafff0, 0.35);
    g.beginPath(); g.moveTo(mx(st.W / 2), R.y + 2); g.lineTo(mx(st.W / 2), R.y + R.h - 2); g.strokePath();
    /* rivales: TRIÁNGULOS #FF8A50 */
    st.rivales.forEach((j, i) => {
      const x = mx(j.x), y = my(j.y);
      g.fillStyle(0xff8a50, 1); g.fillTriangle(x, y - 6, x + 5.5, y + 4.5, x - 5.5, y + 4.5);
      g.lineStyle(1, 0x0a1f13, 0.9); g.strokeTriangle(x, y - 6, x + 5.5, y + 4.5, x - 5.5, y + 4.5);
      this.radarNumsRiv[i].setPosition(x, y + 0.5);
    });
    /* míos: CÍRCULOS #4FC3F7 (+ anillo blanco en el controlado) */
    st.mios.forEach((j, i) => {
      const x = mx(j.x), y = my(j.y);
      g.fillStyle(0x4fc3f7, 1); g.fillCircle(x, y, 5.5);
      g.lineStyle(1, 0x0a1f13, 0.9); g.strokeCircle(x, y, 5.5);
      if (i === st.ctrl) { g.lineStyle(2, 0xffffff, 1); g.strokeCircle(x, y, 8); }
      this.radarNumsMios[i].setPosition(x, y);
    });
    /* apuntando el pase: CUADRADO (forma) alrededor de cada receptor; grueso = elegido con teclado */
    if (this.estado === "PASE" && this._receptores) {
      this._receptores.forEach((r, k) => {
        const j = st.mios[r.idx], x = mx(j.x), y = my(j.y);
        g.lineStyle(k === this._recSel ? 3 : 1.5, 0xffd84d, 1);
        g.strokeRect(x - 9, y - 9, 18, 18);
      });
    }
    /* pelota: ROMBO blanco con borde negro, arriba de todo */
    const bx = mx(st.pelota.x), by = my(st.pelota.y);
    g.fillStyle(0xffffff, 1);
    g.fillPoints([{ x: bx, y: by - 5 }, { x: bx + 4, y: by }, { x: bx, y: by + 5 }, { x: bx - 4, y: by }], true);
    g.lineStyle(1.5, 0x000000, 1);
    g.strokePoints([{ x: bx, y: by - 5 }, { x: bx + 4, y: by }, { x: bx, y: by + 5 }, { x: bx - 4, y: by }], true, true);
  }

  /* ============ ETAPA 2 · HUD fijo (doc §4) ============ */
  buildHUD() {
    const barra = this.add.rectangle(480, 15, 960, 30, 0x0a1f13, 0.85);
    this.txtMarcador = this.add.text(480, 15, "", { fontFamily: "'Press Start 2P',monospace", fontSize: "12px", color: "#f6efdc" }).setOrigin(0.5);
    this.txtReloj = this.add.text(948, 15, "", { fontFamily: "monospace", fontSize: "14px", color: "#ffd84d" }).setOrigin(1, 0.5);
    /* guts del portador: color por umbral + SIEMPRE el número exacto (no depende del color) */
    this.txtGuts = this.add.text(948, 512, "", { fontFamily: "monospace", fontSize: "12px", color: "#f6efdc" }).setOrigin(1, 0.5);
    this.gutsG = this.add.graphics();
    this.hudLayer.add([barra, this.txtMarcador, this.txtReloj, this.gutsG, this.txtGuts]);
  }
  refrescarHUD() {
    const st = this.st;
    const m = Math.floor(st.minuto), lim = st.tiempo === 1 ? 45 : 90;
    const marcador = "VOS " + st.golesMio + " - " + st.golesRival + " " + this.nombreRival;
    if (this._hudMarc !== marcador) { this._hudMarc = marcador; this.txtMarcador.setText(marcador); }
    const reloj = (m > lim ? lim + "+'" : m + "'") + " " + (st.tiempo === 1 ? "1T" : "2T");
    if (this._hudReloj !== reloj) { this._hudReloj = reloj; this.txtReloj.setText(reloj); }
    /* barra de guts del PORTADOR (si la tiene el rival, su tanque compartido) */
    const p = this.portadorActual();
    const max = this.BAL.aguante.max;
    const val = p.esRival ? this.st.aguanteRival : p.j.aguante;
    const frac = Phaser.Math.Clamp(val / max, 0, 1);
    const color = frac > 0.5 ? 0x2e7d32 : frac > 0.25 ? 0xf9a825 : 0xc62828;
    const bx = 948 - 170, by = 528, bw = 170, bh = 12;
    const g = this.gutsG; g.clear();
    g.fillStyle(0x0a1f13, 0.85); g.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
    g.fillStyle(color, 1); g.fillRect(bx, by, bw * frac, bh);
    g.lineStyle(1, 0xf6efdc, 0.8); g.strokeRect(bx, by, bw, bh);
    const gutsTxt = "GUTS " + Math.round(val);
    if (this._hudGuts !== gutsTxt) { this._hudGuts = gutsTxt; this.txtGuts.setText(gutsTxt); }
    /* E6: los ÚLTIMOS 5 MINUTOS se anuncian (tictac + reloj marcado con ⏰, no solo color).
       TODO el bloque bajo el flag: apagado = reloj plano de la Etapa 5. */
    if (this.FLAGS.e6_cine) {
      if (!this._urgente && st.tiempo === 2 && st.minuto >= 85) {
        this._urgente = true;
        this.txtReloj.setColor("#c62828");
        this.SFX && this.SFX.temaUrgente && this.SFX.temaUrgente();
        this.avisar("⏰ ¡ÚLTIMOS MINUTOS!");
      }
      if (this._urgente) this.txtReloj.setText("⏰ " + this.txtReloj.text.replace("⏰ ", ""));
    }
  }
  /* el corte de plano: la pelota cambió de dueño → pan breve + follow al nuevo portador (doc §2).
     El destino del pan se actualiza cada frame al portador VIVO: si se mueve
     durante los 300ms, la cámara llega a donde está (sin salto seco al enganchar el follow). */
  seguirPortador() {
    const p = this.portadorActual();
    if (p.clave === this._portadorClave) return;
    this._portadorClave = p.clave;
    this.target = null;               // cambió el dueño: el destino viejo no vale
    this._base = this.bakePortador(p);
    /* sin flipX: el dorsal horneado debe leerse derecho (accesibilidad) */
    this.sprPortador.setTexture(this._base + (this._esHeroico ? this._animIdle + "1" : "_idle")).setScale(this._escalaBase).setFlipX(false);
    const cam = this.cameras.main;
    /* E6: el corte de plano se SIENTE — flash breve + motivo musical al cambiar el LADO
       (no en cada pase entre compañeros: el hook es por POSESIÓN) */
    if (this.FLAGS.e6_cine) {
      cam.flash(90, 255, 255, 235);
      const lado = p.esRival ? "rival" : "mia";
      if (lado !== this._ladoTema) { this._ladoTema = lado; this.SFX && this.SFX.temaPosesion && this.SFX.temaPosesion(lado); }
    }
    cam.stopFollow();
    this._panVivo = true;
    const wp = this.aRender(p.j.x, p.j.y);
    cam.pan(wp.x, wp.y, this.V2.PAN_CORTE_MS, "Sine.easeInOut", true, (c, prog) => {
      if (prog === 1) { this._panVivo = false; cam.startFollow(this.sprPortador, true, this.V2.LERP, this.V2.LERP); }
    });
  }

  /* tocar/arrastrar en la cancha = correr hacia ahí (pantalla → mundo → simulación) */
  apuntar(p) {
    if (this.estado !== "LIBRE") return;                                // en menú/pase/resolución no se corre
    if (this.time.now - (this._uiTocado || 0) < 80) return;             // acaba de tocar UI (radar/botones)
    const R = this.radar;
    if (R && p.x > R.x - 8 && p.x < R.x + R.w + 8 && p.y > R.y - 8) return;   // sobre el radar
    if (this.FLAGS.e3_menus && p.x > 790 && p.y > 420) return;          // sobre el botón de acción (si existe)
    const w = this.cameras.main.getWorldPoint(p.x, p.y);
    this.target = { x: w.x / this.SX, y: w.y / this.SY };
  }

  /* ============================== UPDATE ============================== */
  update(time, delta) {
    const st = this.st, P = window.PampaPartido;
    /* ETAPA 5: la economía de guts corre con el flag e5_guts; apagado = tanques quietos (sandbox) */
    if (!this.FLAGS.e5_guts) { st.mios[st.ctrl].aguante = this.BAL.aguante.max; st.aguanteRival = this.BAL.aguante.max; }

    /* §9 EN SERIO: fuera de LIBRE la simulación NO corre (pausa → animación → pausa,
       estados realmente separados — si no, rivalTira/final pisan la resolución) */
    if (this.estado !== "LIBRE") {
      if (this.estado === "MENU" || this.estado === "PASE") this.teclasDeMenu();
      this.dibujarRadar();
      this.refrescarHUD();
      return;
    }

    /* input de movimiento: con pelota movés al portador; SIN pelota movés a tu
       MARCADOR (lo leés en el radar por su anillo — perseguir drena guts, §7) */
    let input = null;
    if (this.estado === "LIBRE") {
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
    }

    /* flag e3_menus apagado = sandbox de la E1 (sin cruces, remate rival auto-resuelto) */
    if (!this.FLAGS.e3_menus) st.cooldown = 9e9;
    const evs = P.tick(st, delta, input);
    let aviso = null;
    for (const ev of evs) {
      /* ETAPA 3: los cruces abren el MENÚ con pausa (doc §7/§9) */
      if (ev.tipo === "encuentro") this.abrirMenuAtaque(ev.rivalIdx, false);
      else if (ev.tipo === "encuentroDef") this.abrirMenuDefensa();
      else if (ev.tipo === "rivalTira") {
        if (this.FLAGS.e3_menus) this.abrirMenuArquero();
        else { const res = P.resolverAtajada(st, Math.random() < 0.5 ? "atajar" : "despejar"); aviso = res.golRival ? "GOL DE " + this.nombreRival : "¡La sacó tu arquero!"; }
      }
      else if (ev.tipo === "entretiempo") { P.entretiempo(st); this.transicionEntretiempo(); aviso = "ENTRETIEMPO — saca " + this.nombreRival; }
      else if (ev.tipo === "final") this.finDelPartido();
    }

    /* el portador (y SOLO él) se dibuja; si la pelota cambió de dueño, corte de plano */
    this.seguirPortador();
    const p = this.portadorActual();
    const wr = this.aRender(p.j.x, p.j.y);
    const wx = wr.x, wy = wr.y;
    const corriendo = (!p.esRival && !!input) || (p.esRival && st.esperaRival <= 0);
    if (this._esHeroico) {
      /* ciclo de correr de 4 frames + escala por profundidad (E4) */
      const f = corriendo ? Math.floor(time / 110) % 4 : 1;
      this.sprPortador.setTexture(this._base + this._animIdle + f).setScale(this._escalaBase * this.escalaEn(p.j.y));
      /* ESTELAS: el pasto transmite velocidad cuando el portador corre (E4) */
      if (corriendo) {
        const u = this._trail[this._trail.length - 1];
        if (!u || Math.hypot(wx - u.x, wy - u.y) > 14) { this._trail.push({ x: wx, y: wy + 34 }); if (this._trail.length > 6) this._trail.shift(); }
      } else this._trail.length = 0;
      const tg = this.trailG; tg.clear();
      for (let i = 1; i < this._trail.length; i++) {
        tg.lineStyle(3, 0xffffff, 0.08 + 0.3 * (i / this._trail.length));
        tg.beginPath(); tg.moveTo(this._trail[i - 1].x, this._trail[i - 1].y); tg.lineTo(this._trail[i].x, this._trail[i].y); tg.strokePath();
      }
    } else {
      this.sprPortador.setPosition(wx, wy)
        .setTexture(this._base + (corriendo && Math.floor(time / 110) % 2 ? "_run" : "_idle"));
    }
    this.sprPortador.setPosition(wx, wy);
    const wb = this.aRender(st.pelota.x, st.pelota.y);
    this.sprPelota.setPosition(wb.x, wb.y + 34).setScale(1.6 * this.escalaEn(st.pelota.y));
    this.marker.setText("▼ " + (p.j.esVos ? "VOS" : (p.j.nombre || "").toUpperCase().slice(0, 10)))
      .setPosition(wx, wy - 62);
    /* pan vivo: mientras dura el corte, el destino persigue al portador real */
    const cam = this.cameras.main;
    if (this._panVivo && cam.panEffect.isRunning) cam.panEffect.destination.set(wx, wy);
    if (aviso) this.avisar(aviso);

    /* ETAPA 2: radar + HUD, siempre al día */
    this.dibujarRadar();
    this.refrescarHUD();
  }

  /* aviso breve anclado al PORTADOR (a donde la cámara va, no de donde viene) */
  avisar(txt) {
    const t = this.add.text(this.sprPortador.x, this.sprPortador.y - 96, txt, { fontFamily: "monospace", fontSize: "12px", color: "#f6efdc", backgroundColor: "#0a1f13dd", padding: { x: 8, y: 4 }, align: "center" })
      .setOrigin(0.5).setDepth(5000);
    this.mundoLayer.add(t);
    if (this.uiCam) this.uiCam.ignore(t);   // hijo dinámico: re-ignorar a mano
    this.tweens.add({ targets: t, alpha: 0, delay: 2200, duration: 500, onComplete: () => t.destroy() });
  }
};
