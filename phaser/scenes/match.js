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
    this.FLAGS = Object.assign({ e3_menus: true, e4_arte: true, e5_guts: true, e6_cine: true, v4_vista: true, v4_escenas: true, v4_musica: true, v4_relator: true, v4_aereo: true, v4_retratos64: true }, this.BAL.flags || {});
    /* ANIME v4 Bloque A: VISTA TÁCTICA ELEVADA (flag v4_vista; apagado = cámara v2).
       La cámara sube a ver la cancha, los 22 son fichas simples, el radar sobra. */
    this._vista4 = !!this.FLAGS.v4_vista;
    this.VI = this.BAL.vista || {};
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
    this._zonaTema = null;        // el tema del avance (propio/rival) arranca de cero
    this._megaRival = null;
    this._timing = null;
    this._hudMarc = this._hudReloj = this._hudGuts = null;   // caches del HUD: el restart los recrea vacíos
    this.fichasMios = this.fichasRiv = null;                 // Anime A: las fichas mueren con la escena
    this.ringG = this.paseG = null; this._btnCambiar = null;
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
    /* FUSIÓN (flag partido_phaser): si la carrera clásica pidió este partido,
       el rival lleva el nombre del club real y el final ofrece volver con el resultado */
    this._pedido = null;
    try { const r = localStorage.getItem("pampa_pedido_phaser"); if (r) this._pedido = JSON.parse(r); } catch (e) { }
    if (this._pedido && this._pedido.rival) this.nombreRival = String(this._pedido.rival).toUpperCase().slice(0, 14);
    /* Feel B5: MEGACOSAS de data (nombres pampeanos, costo, nivel) + nivel de carrera */
    this.MEGA = this.game.registry.get("megacosas") || {
      megatiros: [{ id: "calden", n: "Disparo del Caldén", grito: "¡CALDENAZO!", sub: "la fuerza del árbol eterno", guts: 300, nivel: 1, mult: 1.3, x_min: 680 }],
      megadefensas: []
    };
    this._nivelCarrera = 1;
    try { const c = JSON.parse(localStorage.getItem("pampa_star_v1")); if (c && c.nivel) this._nivelCarrera = c.nivel | 0; } catch (e) { }

    /* capa de MUNDO (cancha + portador): la ve solo la cámara principal con zoom;
       capa de HUD (radar + marcador + guts) y capa de MENÚ: solo la cámara de UI fija */
    this.mundoLayer = this.add.container(0, 0);
    this.hudLayer = this.add.container(0, 0);
    this.menuLayer = this.add.container(0, 0);
    this.cineLayer = this.add.container(0, 0).setVisible(false);   // Feel B5: el CINE de 5 planos (pantalla fija)

    this.buildCancha();
    this.buildPortador();
    this.buildFichas();

    /* --- LA CÁMARA (Anime v4 §0: ELEVADA para navegar; la épica vive en las escenas) ---
       v4_vista ON: zoom que muestra la cancha (cobertura afinable) + scroll suave mínimo.
       OFF: la cámara cinematográfica v2 exacta (zoom 2.2 pegada al portador). */
    this._zoomBase = this._vista4
      ? Math.max(960 / this.V2.MUNDO_W, 540 / this.V2.MUNDO_H) / (this.VI.cobertura || 0.85)
      : this.V2.ZOOM;
    const cam = this.cameras.main;
    cam.setBackgroundColor("#06120b");
    cam.setBounds(0, 0, this.V2.MUNDO_W, this.V2.MUNDO_H);
    const lerp = this._vista4 ? (this.VI.lerp || 0.08) : this.V2.LERP;
    cam.startFollow(this.sprPortador, true, lerp, lerp);
    cam.setDeadzone(this._vista4 ? (this.VI.deadzone_w || 60) : this.V2.DEADZONE_W, this._vista4 ? (this.VI.deadzone_h || 40) : this.V2.DEADZONE_H);
    cam.setZoom(this._zoomBase);
    cam.roundPixels = true;       // scroll sin temblor (equivale al roundPixels del config, sin tocar index.html)

    /* --- ETAPA 2: RADAR + HUD en cámara fija (doc §3/§4) ---
       Anime A: con la cancha entera visible el radar SOBRA — no se construye
       (el pase dirigido se toca directo sobre la cancha) */
    if (!this._vista4) this.buildRadar(); else this.radar = null;
    this.buildHUD();
    this.buildBotonAccion();
    this.buildCineBase();
    this.uiCam = this.cameras.add(0, 0, 960, 540);
    cam.ignore([this.hudLayer, this.menuLayer, this.cineLayer]);
    this.uiCam.ignore(this.mundoLayer);

    /* --- input: táctil primero (tocás/arrastrás y el portador corre hacia ahí),
           teclado en escritorio (flechas o WASD). Sin mouse obligatorio (doc §8).
           El tap de ¡A LA CANCHA! llega con el puntero todavía apretado desde el
           editor: no cuenta hasta el primer toque propio de esta escena. --- */
    this._punteroListo = false;
    this.input.on("pointerdown", (p) => {
      this._punteroListo = true;
      /* Anime A: sin radar, el PASE se toca DIRECTO sobre la cancha */
      if (this._vista4 && this.estado === "PASE") { this.onCanchaTapPase(p); return; }
      this.apuntar(p);
    });
    this.input.on("pointermove", (p) => { if (p.isDown && this._punteroListo) this.apuntar(p); });
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys("W,A,S,D");
      this.keyEnter = this.input.keyboard.addKey("ENTER");
      /* ESPACIO = el botón de acción (doc §8); ESC = cancelar (todo se puede sin mouse) */
      this.input.keyboard.on("keydown-SPACE", (ev) => {
        ev.preventDefault && ev.preventDefault();
        if (this.estado === "TIMING") { this.pararAguja(); return; }   // Feel B5: ESPACIO para la aguja
        this.onBotonAccion();
      });
      this.input.keyboard.on("keydown-ESC", () => {
        if (this.estado === "PASE" && this._paseCancelar) this._paseCancelar();
        else if (this.estado === "MENU" && this._menuVolver) this._menuVolver();
      });
      /* Anime A: ESPACIO es SOLO acción — el ciclado manual (que casi no hace falta
         con el cambio automático) vive en TAB */
      this.input.keyboard.on("keydown-TAB", (ev) => {
        ev.preventDefault && ev.preventDefault();
        if (this.estado !== "LIBRE" || this.st.posesion !== "rival") return;
        window.PampaPartido.cambiarAlMasCercano(this.st);
        this.avisar("Marcás con " + this.st.mios[this.st.ctrl].nombre.toUpperCase());
      });
    }

    /* guía breve pegada al portador (los textos del MUNDO escalan con la vista elevada) */
    this._fsMundo = this._vista4 ? Math.round(this.V2.ZOOM / this._zoomBase * 10) / 10 : 1;
    const j = this.portadorActual().j;
    const wj = this.aRender(j.x, j.y);
    const hint = this.add.text(wj.x, wj.y + 70, "tocá la cancha (o flechas) para correr",
      { fontFamily: "monospace", fontSize: Math.round(11 * this._fsMundo) + "px", color: "#f6efdc", backgroundColor: "#0a1f13cc", padding: { x: 6, y: 3 } }).setOrigin(0.5).setDepth(5000);
    this.mundoLayer.add(hint);
    this.uiCam.ignore(hint);   // el ignore del container no cubre hijos agregados después
    this.tweens.add({ targets: hint, alpha: 0, delay: 4000, duration: 600, onComplete: () => hint.destroy() });

    /* Feel B3: tutorial de 3 pasos la primera vez (flag en el save) */
    this.tutorialSiHaceFalta();

    /* flag v4_vista APAGADO = comportamiento v2 exacto: también sin cambio automático */
    if (!this._vista4) this.st._noAutoHasta = 9e15;

    /* ANIME D: la música arranca con el partido (tema por posesión, en loop) */
    this.musica(this.st.posesion === "mia" ? "propia" : "rival");

    /* ANIME E: EL RELATOR — el partido se cuenta solo (data/relatos.json → relator) */
    this.REL = (this.FLAGS.v4_relator && window.PampaRelator)
      ? window.PampaRelator.crear(this.game.registry.get("relatos") || {}, {})
      : null;
    this.relatar("saque", { rival: this.nombreRival });
  }
  /* el ticker del relator: una frase por vez, abajo, sin tapar el juego */
  relatar(situacion, ctx) {
    if (!this.REL) return;
    const c = Object.assign({ rival: this.nombreRival, pueblo: this._puebloMio || "La Pampa" }, ctx || {});
    if (!c.jugador) { const j = this.st && this.st.mios[this.st.ctrl]; c.jugador = j ? (j.esVos ? "VOS" : j.nombre) : "el pibe"; }
    const f = this.REL.frase(situacion, c);
    if (!f || !this.tickerTxt) return;
    this.tweens.killTweensOf(this.tickerTxt);
    this.tickerTxt.setText("🎙 " + f).setAlpha(1);
    this.tweens.add({ targets: this.tickerTxt, alpha: 0, delay: 2800, duration: 500 });
  }
  /* helpers de música (flag v4_musica; el mute vive en SFX, compartido con el clásico) */
  musica(tema) { if (this.FLAGS.v4_musica && this.FLAGS.e6_cine && this.SFX && this.SFX.musicaTema) this.SFX.musicaTema(tema); }
  musicaDuck(ms) { if (this.FLAGS.v4_musica && this.FLAGS.e6_cine && this.SFX && this.SFX.musicaDuck) this.SFX.musicaDuck(ms); }

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
    /* Anime E: tu pueblo (del origen de la carrera) para el grito de gol del relator */
    this._puebloMio = (career && career.origen && career.origen.localidad) ? String(career.origen.localidad).toUpperCase().slice(0, 16) : "LA PAMPA";
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
      this._esHeroico = true; this._escalaBase = this.escalaHeroico();
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
  /* Anime A: en la vista elevada el portador es apenas mayor que las fichas (la épica va a las escenas) */
  escalaHeroico() { return this.V2.ESCALA_HEROICO * (this._vista4 ? (this.VI.escala_portador || 0.6) : 1); }
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
    /* marca de control clara: ▼ + nombre (forma + etiqueta, no solo color).
       En la vista elevada el texto del mundo se agranda para leerse igual. */
    const fsM = this._vista4 ? 22 : 11;
    this.marker = this.add.text(0, 0, "▼ VOS", { fontFamily: "monospace", fontSize: fsM + "px", color: "#ffffff", stroke: "#0a1f13", strokeThickness: this._vista4 ? 6 : 4 })
      .setOrigin(0.5).setDepth(12);
    this.trailG = this.add.graphics().setDepth(8);   // estelas de velocidad (E4)
    this._trail = [];
    this.mundoLayer.add([this.trailG, this.sprPortador, this.sprPelota, this.marker]);
  }

  /* ============ ANIME v4 Bloque A · LAS 22 FICHAS ============
     Con la vista elevada, TODOS los jugadores se ven a la vez como sprites
     simples de alta legibilidad (los toscos de la E1: liso vs RAYAS por diseño,
     no solo color). El portador sigue siendo el heroico, apenas más grande.
     Número visible AL PAUSAR (fuera de LIBRE aparecen los dorsales). */
  buildFichas() {
    if (!this._vista4) { this.fichasMios = this.fichasRiv = null; return; }
    const Arte = window.PampaAvatarArte;
    const mk = (j, esRival, i) => {
      const base = (esRival ? "f_riv" : "f_mio") + i;
      Arte.jugador(this, base, j.look || window.PampaAvatar.crearLook(), esRival);
      ["_idle", "_run"].forEach(s => this.textures.get(base + s).setFilter(Phaser.Textures.FilterMode.NEAREST));
      const spr = this.add.sprite(0, 0, base + "_idle");
      const num = this.add.text(0, 0, String(j.numero), { fontFamily: "monospace", fontSize: "20px", color: "#ffffff", stroke: "#0a1f13", strokeThickness: 5, fontStyle: "bold" }).setOrigin(0.5).setVisible(false).setDepth(9);
      this.mundoLayer.add([spr, num]);
      if (this.uiCam) { this.uiCam.ignore(spr); this.uiCam.ignore(num); }   // se crean antes de uiCam: el create re-sella
      return { spr, num, lx: j.x, ly: j.y, base };
    };
    this.fichasMios = this.st.mios.map((j, i) => mk(j, false, i));
    this.fichasRiv = this.st.rivales.map((j, i) => mk(j, true, i));
    this.ringG = this.add.graphics().setDepth(8.5);   // anillo blanco en tu MARCADOR (forma, no solo color)
    this.paseG = this.add.graphics().setDepth(8.6);   // receptores del pase, dibujados SOBRE la cancha
    this.mundoLayer.add([this.ringG, this.paseG]);
  }
  updateFichas(mostrarNums) {
    if (!this._vista4 || !this.fichasMios) return;
    const st = this.st, p = this.portadorActual();
    const paso = Math.floor(this.time.now / 240) % 2;
    const escF = this.VI.escala_ficha || 1.3;
    const upd = (arr, js, esRival) => js.forEach((j, i) => {
      const F = arr[i]; if (!F) return;
      const esPortador = (esRival === p.esRival) && i === p.idx;
      F.spr.setVisible(!esPortador);
      F.num.setVisible(!esPortador && !!mostrarNums);
      if (esPortador) return;
      const w = this.aRender(j.x, j.y);
      const movio = Math.hypot(j.x - F.lx, j.y - F.ly) > 0.6; F.lx = j.x; F.ly = j.y;
      const e = escF * this.escalaEn(j.y);
      F.spr.setPosition(w.x, w.y).setScale(e).setDepth(4 + 4 * (j.y / st.H))
        .setTexture(F.base + (movio && paso ? "_run" : "_idle"));
      F.num.setPosition(w.x, w.y - 34 * e);
    });
    upd(this.fichasMios, st.mios, false);
    upd(this.fichasRiv, st.rivales, true);
    /* los containers de Phaser dibujan por ORDEN DE ALTA: el depth de los hijos
       recién manda si se ordena — así el de abajo (más cerca) tapa al de arriba */
    this.mundoLayer.sort("depth");
    /* en defensa, TU marcador lleva anillo blanco + etiqueta ▼ del portador rival aparte */
    const g = this.ringG; g.clear();
    if (st.posesion === "rival" && st.ctrl >= 0) {
      const c = st.mios[st.ctrl], w = this.aRender(c.x, c.y);
      g.lineStyle(4, 0xffffff, 0.95); g.strokeCircle(w.x, w.y + 14, 26);
      g.lineStyle(2, 0x0a1f13, 0.8); g.strokeCircle(w.x, w.y + 14, 29);
    }
  }
  /* pantalla→simulación: la INVERSA de aRender (para tocar el pase sobre la cancha) */
  aSim(wx, wy) {
    if (!this.FLAGS.e4_arte || !this._persp) return { x: wx / this.SX, y: wy / this.SY };
    const P = this._persp;
    const t = Phaser.Math.Clamp((wy - P.yTop - 16) / (P.yBot - P.yTop - 30), 0, 1);
    const xi = P.insTop + (P.insBot - P.insTop) * t;
    const jx = Phaser.Math.Clamp((wx - xi - 16) / (this.V2.MUNDO_W - 2 * xi - 32), 0, 1) * this.st.W;
    return { x: jx, y: t * this.st.H };
  }
  /* PASE DIRIGIBLE sobre la cancha (Anime A): mismo criterio que el radar de la v2 —
     receptor más cercano al toque; MÁS ALLÁ de él (hacia el arco) = AL VACÍO */
  onCanchaTapPase(pointer) {
    if (this.time.now - (this._uiTocado || 0) < 80) return;
    const st = this.st;
    const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const w = this.aSim(wp.x, wp.y);
    let mejor = null, md = 1e9;
    (this._receptores || []).forEach(r => {
      const j = st.mios[r.idx], d = Math.hypot(j.x - w.x, j.y - w.y);
      if (d < md) { md = d; mejor = r; }
    });
    if (!mejor) return;
    const alVacio = mejor.adelante && w.x > st.mios[mejor.idx].x + 40;
    this.confirmarPase(mejor, alVacio);
  }
  /* receptores marcados SOBRE la cancha: CUADRADO amarillo (grueso = elegido con teclado) */
  dibujarPaseCancha() {
    if (!this.paseG) return;
    const g = this.paseG; g.clear();
    if (this.estado !== "PASE" || !this._receptores) return;
    this._receptores.forEach((r, k) => {
      const j = this.st.mios[r.idx], w = this.aRender(j.x, j.y);
      g.lineStyle(k === this._recSel ? 6 : 3, 0xffd84d, 1);
      g.strokeRect(w.x - 34, w.y - 34, 68, 68);
      if (r.adelante) { g.lineStyle(3, 0xffffff, 0.9); g.strokeTriangle(w.x + 44, w.y - 8, w.x + 44, w.y + 8, w.x + 56, w.y); }   // ▶ = puede ir al vacío
    });
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
  /* ANIME v4 Bloque C: RETRATO MODULAR 64×64 con EXPRESIÓN por momento del partido.
     Determinista por look → mismo id, misma cara. Cacheado por look+expresión. */
  _retrato64(j, expresion) {
    const look = j.look || window.PampaAvatar.crearLook();
    const semilla = window.PampaAvatar.hashSemilla(JSON.stringify(look));
    const key = "r64_" + semilla + "_" + (expresion || "concentrado");
    if (!this.textures.exists(key)) window.PampaAvatarArte.retrato64(this, key, look, expresion);
    return key;
  }
  /* qué cara pone según el guts / lado (dolorido si está rendido) */
  _exprPorGuts(gutsVal) {
    return gutsVal < this.BAL.aguante.umbral_rendido ? "dolorido" : "concentrado";
  }
  retratoKey(j, esRival, expresion) {
    /* ANIME C: el camino nuevo es el MODULAR (flag v4_retratos64, default ON) —
       cara generable y determinista para TODO el roster, con expresión. */
    if (this.FLAGS.v4_retratos64 && j && j.look) return this._retrato64(j, expresion);
    /* banco webp como capa alternativa (flag off): VOS/amigos del editor, resto del banco */
    if (!esRival && (j.esVos || j.esAmigo) && j.look) return this._caraDe(j, "m");
    const pool = this._retratos[esRival ? "rival" : "companero"].filter(k => this.textures.exists(k));
    if (pool.length) return pool[window.PampaAvatar.hashSemilla(j.nombre || "x") % pool.length];
    return this._caraDe(j, esRival ? "r" : "m");
  }
  retratoPanel(x, j, esRival, gutsVal, expresion) {
    const key = this.retratoKey(j, esRival, expresion || this._exprPorGuts(gutsVal));
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
    /* Feel B3: 64px o más, etiqueta ⚡ ACCIÓN y PULSO sutil cuando hay acciones */
    const cont = this.add.container(866, 456);
    const r = this.add.rectangle(0, 0, 188, 68, 0xffd84d, 1).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
    this.txtBotonAccion = this.add.text(0, 0, "⚡ ACCIÓN", { fontFamily: "'Press Start 2P',monospace", fontSize: "12px", color: "#0a1f13" }).setOrigin(0.5);
    cont.add([r, this.txtBotonAccion]);
    this.hudLayer.add(cont);
    this._btnAccionCont = cont;
    this._btnPulso = this.tweens.add({ targets: cont, scale: 1.06, duration: 560, yoyo: true, repeat: -1, ease: "Sine.easeInOut", paused: true });
    if (this.input.keyboard && !this.sys.game.device.input.touch) {
      this._hintEspacio = this.add.text(866, 498, "ESPACIO = ACCIÓN", { fontFamily: "monospace", fontSize: "10px", color: "#0a1f13", backgroundColor: "#ffd84d" }).setOrigin(0.5);
      this.hudLayer.add(this._hintEspacio);
    }
    r.on("pointerdown", (p, x, y, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); this._uiTocado = this.time.now; this.onBotonAccion(); });
    /* Anime A: botón secundario CHICO de ciclado manual en defensa (48px, mobile) */
    if (this._vista4) {
      const bc = this.add.rectangle(866, 396, 92, 48, 0xdcd6c2, 0.92).setStrokeStyle(2, 0x0a1f13).setInteractive({ useHandCursor: true });
      const bct = this.add.text(866, 396, "⇄ OTRO", { fontFamily: "monospace", fontSize: "12px", color: "#0a1f13", fontStyle: "bold" }).setOrigin(0.5);
      this.hudLayer.add([bc, bct]);
      this._btnCambiar = [bc, bct];
      bc.on("pointerdown", (p, x, y, ev) => {
        ev && ev.stopPropagation && ev.stopPropagation(); this._uiTocado = this.time.now;
        if (this.estado !== "LIBRE" || this.st.posesion !== "rival") return;
        window.PampaPartido.cambiarAlMasCercano(this.st);
        this.avisar("Marcás con " + this.st.mios[this.st.ctrl].nombre.toUpperCase());
      });
    }
  }
  /* Feel B3: la PRIMERA vez que se juega, tres pasos superpuestos al juego real */
  tutorialSiHaceFalta() {
    let visto = false;
    try {
      const c = localStorage.getItem("pampa_star_v1");
      if (c) visto = !!JSON.parse(c).tutorialPartido;
      else visto = localStorage.getItem("pampa_tutorial_partido") === "1";
    } catch (e) { }
    if (visto || !this.FLAGS.e3_menus) return;
    const PASOS = [
      "1/3 · Movés con el DEDO sobre la cancha\n(o con las flechas / WASD)",
      "2/3 · ⚡ ACCIÓN abre el menú de jugadas\n(en teclado: ESPACIO)",
      this._vista4 ? "3/3 · Para el PASE, tocá el DESTINO\nDIRECTO sobre la cancha" : "3/3 · Para el PASE, tocá el DESTINO\nen el RADAR de abajo a la izquierda"
    ];
    const ANILLOS = [null, { x: 866, y: 456, w: 210, h: 90 },
      this._vista4 ? null : { x: this.radar.x + this.radar.w / 2, y: this.radar.y + this.radar.h / 2, w: this.radar.w + 24, h: this.radar.h + 24 }];
    this.estado = "TUTORIAL";
    this.st.modo = "congelado";
    let paso = 0;
    const velo = this.add.rectangle(480, 270, 960, 540, 0x06120b, 0.55).setInteractive();
    const caja = this.add.text(480, 150, "", { fontFamily: "monospace", fontSize: "16px", color: "#f6efdc", backgroundColor: "#0a1f13ee", padding: { x: 16, y: 12 }, align: "center", lineSpacing: 6 }).setOrigin(0.5);
    const pie = this.add.text(480, 210, "tocá para seguir ▸", { fontFamily: "monospace", fontSize: "11px", color: "#ffd84d" }).setOrigin(0.5);
    const anillo = this.add.graphics();
    this.menuLayer.add([velo, caja, pie, anillo]);
    this.selloMenu();
    const pintar = () => {
      caja.setText(PASOS[paso]);
      anillo.clear();
      const a = ANILLOS[paso];
      if (a) { anillo.lineStyle(4, 0xffd84d, 1); anillo.strokeRoundedRect(a.x - a.w / 2, a.y - a.h / 2, a.w, a.h, 12); }
    };
    pintar();
    velo.on("pointerdown", (p, x, y, ev) => {
      ev && ev.stopPropagation && ev.stopPropagation(); this._uiTocado = this.time.now;
      paso++;
      if (paso < PASOS.length) { pintar(); return; }
      /* fin: se guarda en el save (retrocompatible: campo nuevo) y no vuelve salvo reset */
      try {
        const raw = localStorage.getItem("pampa_star_v1");
        if (raw) { const c = JSON.parse(raw); c.tutorialPartido = true; localStorage.setItem("pampa_star_v1", JSON.stringify(c)); }
        else localStorage.setItem("pampa_tutorial_partido", "1");
      } catch (e) { }
      this.limpiarMenu();
      this.st.modo = "juego";
      this.estado = "LIBRE";
    });
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
    if (this._hintEspacio) { this._hintEspacio.destroy(); this._hintEspacio = null; }   // ayuda de primera vez: cumplió
    if (st.posesion === "mia") { st.modo = "congelado"; this.abrirMenuAtaque(null, true); }
    /* Anime A: ESPACIO/⚡ es SOLO acción — en defensa el cambio es automático (TAB/⇄ = manual) */
    else if (!this._vista4) { P.cambiarAlMasCercano(st); this.avisar("Marcás con " + st.mios[st.ctrl].nombre.toUpperCase()); }   // defensor más cercano (doc §7, cámara v2)
  }
  limpiarMenu() { this.menuLayer.removeAll(true); this._menuOps = null; this._menuSel = null; this._menuVolver = null; this._paseCancelar = null; }
  /* FEEL B1 · EL BEAT DE TENSIÓN: el cruce se anuncia 600-900ms ANTES del menú —
     zoom leve, riser, y el que entra al duelo aparece deslizándose al plano */
  beatDeTension(j, esRival, texturaFija, abrir) {
    const F = this.BAL.feel || {};
    /* Feel B6: si viene una MEGACOSA rival, el beat SE ALARGA y el sonido cambia:
       sabés que viene algo grande (pero no cuál) */
    const megaViene = !!this._megaRival;
    const durBeat = megaViene ? (F.beat_mega_ms || 1400) : (F.beat_encuentro_ms || 750);
    this.estado = "BEAT";
    this.materializarDuelo(j, esRival, texturaFija);
    if (this.sprDuelo) {
      const destinoX = this.sprDuelo.x;
      this.sprDuelo.x += esRival ? 150 : -150;
      this.sprDuelo.setAlpha(0.4);
      this.tweens.add({ targets: this.sprDuelo, x: destinoX, alpha: 1, duration: durBeat * 0.8, ease: "Quad.easeOut" });
      /* Feel B7: entra CORRIENDO al plano, no teletransportado */
      if (this._dueloBase && !this._dueloEsArq) this.reproducirAnim(this.sprDuelo, this._dueloBase, "correr", durBeat * 0.8);
    }
    if (megaViene) {
      this.relatar("peligro");   // Anime E: el relator también lo huele
      const aviso = this.add.text(480, 130, "⚠ ¡ALGO GRANDE SE VIENE!", { fontFamily: "'Press Start 2P',monospace", fontSize: "14px", color: "#ff8a50", stroke: "#0a1f13", strokeThickness: 5 }).setOrigin(0.5);
      this.menuLayer.add(aviso);
      this.selloMenu();
      this.tweens.add({ targets: aviso, scale: 1.12, duration: 300, yoyo: true, repeat: 3 });
    }
    const cam = this.cameras.main;
    /* en la vista elevada el beat se ACERCA más (si no, el zoom no se siente) */
    const extraBeat = (F.beat_zoom_extra || 0.12) * (megaViene ? 1.6 : 1) * (this._vista4 ? (this.VI.zoom_beat_mult || 3) : 1);
    cam.zoomTo(this._zoomBase * (1 + extraBeat), durBeat, "Sine.easeInOut");
    if (this.FLAGS.e6_cine) {
      if (megaViene) this.SFX && this.SFX.riserGrande && this.SFX.riserGrande(durBeat / 1000);
      else this.SFX && this.SFX.riser && this.SFX.riser(durBeat / 1000);
    }
    this.time.delayedCall(durBeat, () => { if (this.estado === "BEAT") abrir(); });
  }
  /* devuelve la cámara a su zoom base tras el drama del beat */
  zoomBase() { this.cameras.main.zoomTo(this._zoomBase || this.V2.ZOOM, 420, "Sine.easeInOut"); }
  /* ⚠ Phaser: ignore(container) taggea solo a los hijos EXISTENTES — todo lo que
     se agrega al menú DESPUÉS hay que re-ignorarlo o se dibuja duplicado en la
     cámara con zoom. Llamar esto al final de cada armado de menú. */
  selloMenu() { this.cameras.main.ignore(this.menuLayer); }
  /* materializa al SEGUNDO sprite grande del cruce (doc §1 permite portador+rival+arquero) */
  materializarDuelo(j, esRival, texturaFija) {
    if (this.sprDuelo && this._dueloJ === j) return;   // ya entró en el beat: no re-hornear ni parpadear
    this.quitarDuelo();
    this._dueloJ = j;
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
      escala = this.escalaHeroico() * this.escalaEn(j.y);
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
  quitarDuelo() { if (this.sprDuelo) { this.sprDuelo.destroy(); this.sprDuelo = null; } this._dueloJ = null; }
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
    const megaListo = this.megaDisponible(), puedeT = P.puedeTirar(st);
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
      /* el MEGATIRO (de data, con nombre pampeano) convive con el tiro normal — va al centro */
      centro: megaListo ? { texto: "🔥 " + megaListo.n.toUpperCase().slice(0, 15), sub: megaListo.guts + " guts · especial", cb: () => this.resolverTiro(megaListo, rivalIdx, libre) } : null,
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
      },
      /* Feel B6: TU megacosa defensiva — misma gramática que el megatiro */
      centro: (() => {
        const m = this.megaDefensaDisponible(["quite", "bloqueo"], st.mios[st.ctrl]);
        if (!m) return null;
        return {
          texto: "🔥 " + m.n.toUpperCase().slice(0, 15), sub: m.guts + " guts · especial",
          cb: () => this.cutInEspecial("¡" + m.n.toUpperCase() + "!", m.guts + " guts", () => {
            st.mios[st.ctrl].aguante = Math.max(0, st.mios[st.ctrl].aguante - m.guts);
            const base = m.tipo === "quite" ? qui : blo;
            this.resolverAccionDefensa({ id: base.id, poder: base.poder + (m.bonus || 16), costo: 0 });
          })
        };
      })()
    });
  }
  /* qué MEGADEFENSA está disponible para ese jugador (data + nivel + guts) */
  megaDefensaDisponible(tipos, j) {
    const nivel = this._nivelCarrera || 1;
    const lista = ((this.MEGA && this.MEGA.megadefensas) || []).filter(m =>
      tipos.indexOf(m.tipo) >= 0 && nivel >= (m.nivel || 1) && j && j.aguante >= (m.guts || 250));
    return lista.length ? lista[lista.length - 1] : null;
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
      },
      /* Feel B6: la MEGAATAJADA del arquero */
      centro: (() => {
        const m = this.megaDefensaDisponible(["atajada"], arq);
        if (!m) return null;
        return {
          texto: "🔥 " + m.n.toUpperCase().slice(0, 15), sub: m.guts + " guts · especial",
          cb: () => this.cutInEspecial("¡" + m.n.toUpperCase() + "!", m.guts + " guts", () => {
            arq.aguante = Math.max(0, arq.aguante - m.guts);
            this.resolverArquero("atajar", m.bonus || 20, m.grito);
          })
        };
      })()
    });
  }

  /* --- resoluciones (doc §7: el CPU eligió en secreto; §9: RESOLUCION sin input) --- */
  resolverAccionAtaque(a, rivalIdx) {
    const st = this.st, P = window.PampaPartido;
    /* Feel B6: si el rival vino con megacosa, pega en este duelo (y la paga) */
    const megaR = this._megaRival; this._megaRival = null;
    const r = P.resolverDuelo(st, { accion: a.id, poder: a.poder, costo: a.costo, bonusRival: megaR ? megaR.bonus : 0 });
    if (megaR) st.aguanteRival = Math.max(0, st.aguanteRival - megaR.guts * (this.BAL.aguante.cpu_factor_costo || 1));
    /* ANIME B (P2): la GAMBETA se VE — el que encara en pose, el que queda atrás */
    const rivalJ = rivalIdx != null ? st.rivales[rivalIdx] : st.rivales[st.portadorRival];
    if (r.win) {
      P.ganarAtaque(st, a.id);
      if (a.id === "gambeta" && !megaR && this.hayEscenas() && rivalJ) {
        this.escenaCine({
          etiqueta: "· la gambeta ·",
          prota: { j: st.mios[st.ctrl], esRival: false, anim: "gambeta" },
          rival: { j: rivalJ, esRival: true, anim: "pase" },   // el rival queda barrido atrás
          gana: true, sfx: "whoosh",
          titulo: "¡LO DEJASTE PAGANDO!", sub: r.matriz === "zafaste" ? "le erraron a la marca y seguís de largo" : "puro coraje: seguís de largo",
          alFinal: () => this.relatar("gambeta_win")
        });
        return;
      }
      const texto = megaR ? "¡LE GANASTE AL " + megaR.n.toUpperCase() + "!\nMomento para el recuerdo." : (a.id === "pared" ? "¡PARED Y SEGUÍS DE LARGO!" : "¡GAMBETA Y DE LARGO!" + (r.matriz === "zafaste" ? "\n(le erraron a la marca)" : ""));
      this.mostrarResolucion(texto, "#7ee08a", { anim: "gambeta", gana: true });
    } else if (megaR) {
      /* la megacosa rival se hizo sentir: cut-in del rival + teatro */
      P.perderPelota(st);
      const rival = rivalIdx != null ? st.rivales[rivalIdx] : st.rivales[st.portadorRival];
      this.cutInEspecial("¡" + megaR.n.toUpperCase() + "!", megaR.grito, () => {
        this.mostrarResolucion(megaR.grito + "\nTe la sacó con un movimiento especial.", "#e3503e", { anim: "gambeta", gana: false });
      }, rival, true);
    } else {
      P.perderPelota(st);
      if (a.id === "gambeta" && this.hayEscenas() && rivalJ) {
        /* la variante "perdés": el defensor se planta y te la saca */
        this.escenaCine({
          etiqueta: "· la gambeta ·",
          prota: { j: rivalJ, esRival: true, anim: "pase" },
          rival: { j: st.mios[st.ctrl], esRival: false, anim: "gambeta" },
          gana: true, color: 0xe3503e, sfx: "gloves",
          titulo: r.matriz === "leyeron" ? "¡TE LEYERON!" : "TE LA SACARON",
          sub: r.matriz === "leyeron" ? "el quite estaba preparado · pelota rival" : "se plantó justo · pelota rival",
          alFinal: () => this.relatar("gambeta_lose")
        });
        return;
      }
      this.mostrarResolucion(r.matriz === "leyeron" ? "¡TE LEYERON LA JUGADA!\nPelota rival." : "TE LA SACARON.\nPelota rival.", "#e3503e", { anim: "gambeta", gana: false });
    }
  }
  resolverAccionDefensa(a) {
    const st = this.st, P = window.PampaPartido;
    const rivalJ = st.rivales[st.portadorRival];
    const r = P.resolverDuelo(st, { accion: a.id, poder: a.poder, costo: a.costo });
    /* ANIME B (P2): las dos variantes defensivas de la gambeta — te la hacen / la defendés */
    if (r.win) {
      P.ganarDefensa(st);
      if (a.id === "quite" && this.hayEscenas() && rivalJ) {
        this.escenaCine({
          etiqueta: "· el quite ·",
          prota: { j: st.mios[st.ctrl], esRival: false, anim: "pase" },   // la barrida baja
          rival: { j: rivalJ, esRival: true, anim: "gambeta" },
          gana: true, sfx: "gloves",
          titulo: "¡RECUPERASTE!", sub: r.matriz === "leiste" ? "le leíste la intención y te tiraste al piso" : "llegaste primero a la pelota"
        });
        return;
      }
      this.mostrarResolucion("¡RECUPERASTE!" + (r.matriz === "leiste" ? "\n(le leíste la intención)" : ""), "#7ee08a", { anim: "quite", gana: true });
    }
    else {
      P.perderDefensa(st);
      if (a.id === "quite" && this.hayEscenas() && rivalJ) {
        this.escenaCine({
          etiqueta: "· te la hicieron ·",
          prota: { j: rivalJ, esRival: true, anim: "gambeta" },
          rival: { j: st.mios[st.ctrl], esRival: false, anim: "pase" },
          gana: true, color: 0xe3503e, sfx: "whoosh",
          titulo: r.matriz === "teEngano" ? "¡TE AMAGÓ!" : "SE TE ESCAPÓ",
          sub: r.matriz === "teEngano" ? "el amague te dejó pagando" : "te ganó por velocidad pura"
        });
        return;
      }
      this.mostrarResolucion(r.matriz === "teEngano" ? "TE ENGAÑÓ CON EL AMAGUE…" : "SE TE ESCAPÓ POR VELOCIDAD…", "#e3503e", { anim: "quite", gana: false });
    }
  }
  resolverNoMoverse() {
    const st = this.st, P = window.PampaPartido;
    const r = P.esperarDefensa(st);
    this.mostrarResolucion("Esperás y juntás aire (+" + r.recupero + " guts).\nEl rival sigue…", "#f6efdc", null);
  }
  resolverArquero(id, bonus, grito) {
    const st = this.st, P = window.PampaPartido;
    const tiradorR = st.rivales[st.portadorRival];
    const res = P.resolverAtajada(st, id, null, bonus || 0);
    const snd = this.FLAGS.e6_cine ? this.SFX : null;
    /* ANIME B (P1): también TU arco es una escena — el rival patea, TU arquero vuela */
    if (this.hayEscenas()) {
      const arq = st.mios.find(j => j.pos === "ARQ");
      if (res.golRival) this.escenaCine({
        etiqueta: "· te rematan ·",
        prota: { j: tiradorR, esRival: true, anim: "tiro" },
        rival: arq ? { j: arq, esRival: false, anim: "estirada" } : null,
        gana: true, color: 0xe3503e, sfx: "golEnContra",
        titulo: "GOL DE " + this.nombreRival, sub: "se estiró y no llegó… sacás del medio",
        alFinal: () => { this.efectoGol(true); this.relatar("gol_rival"); }
      });
      else if (res.retiene) this.escenaCine({
        etiqueta: "· tu arquero ·",
        prota: { j: arq, esRival: false, anim: "atajada" },
        rival: { j: tiradorR, esRival: true, anim: "tiro" },
        gana: true, sfx: "gloves",
        titulo: grito || "¡LA RETUVO!", sub: "tu arquero se quedó con la pelota · salís jugando",
        alFinal: () => this.relatar("arquero_mio")
      });
      else this.escenaCine({
        etiqueta: "· tu arquero ·",
        prota: { j: arq, esRival: false, anim: "despeje" },
        rival: { j: tiradorR, esRival: true, anim: "tiro" },
        gana: true, color: 0xf6efdc, sfx: "gloves",
        titulo: "¡PUÑOS AFUERA!", sub: res.mia ? "la dividida quedó tuya" : "la ganó " + this.nombreRival + "…",
        alFinal: () => this.relatar("arquero_mio")
      });
      return;
    }
    if (res.golRival) { this.efectoGol(true); this.mostrarResolucion("GOL DE " + this.nombreRival + "…\nSacás del medio.", "#e3503e", { anim: "arquero", gana: false }); }
    else if (res.retiene) { snd && snd.gloves(); this.mostrarResolucion((grito ? grito + "\n" : "") + "¡LA RETUVO TU ARQUERO!\nSalís jugando.", "#7ee08a", { anim: "arquero", gana: true }); }
    else { snd && snd.gloves(); this.mostrarResolucion(res.mia ? "¡PUÑOS AFUERA!\nLa dividida quedó tuya." : "¡PUÑOS AFUERA!\nLa ganó " + this.nombreRival + "…", "#f6efdc", { anim: "arquero", gana: true }); }
  }
  resolverTiro(esCalden, rivalIdx, libre) {
    const st = this.st, P = window.PampaPartido;
    if (!libre && rivalIdx != null) {
      /* la matriz manda: primero zafar del BLOQUEO del defensor (con su megacosa si vino) */
      const megaR = this._megaRival; this._megaRival = null;
      const acc = P.accionesAtaque(st).find(a => a.id === "tiro");
      const r = P.resolverDuelo(st, { accion: "tiro", poder: acc ? acc.poder : 50, costo: 0, bonusRival: megaR ? megaR.bonus : 0 });
      if (megaR) st.aguanteRival = Math.max(0, st.aguanteRival - megaR.guts * (this.BAL.aguante.cpu_factor_costo || 1));
      if (!r.win) {
        P.perderPelota(st);
        if (megaR) {
          const rival = st.rivales[rivalIdx];
          this.cutInEspecial("¡" + megaR.n.toUpperCase() + "!", megaR.grito, () => {
            this.mostrarResolucion(megaR.grito + "\n¡Te tapó el tiro con un movimiento especial!", "#e3503e", { anim: "gambeta", gana: false });
          }, rival, true);
        } else {
          this.mostrarResolucion(r.matriz === "leyeron" ? "¡TE BLOQUEARON EL TIRO!\nLo veían venir." : "TE LO TAPARON.\nPelota rival.", "#e3503e", { anim: "gambeta", gana: false });
        }
        return;
      }
    }
    const mega = (esCalden && typeof esCalden === "object") ? esCalden : (esCalden ? this.megaDisponible() : null);
    if (mega && this.FLAGS.e6_cine) {
      /* FEEL B5 · MEGATIRO: anuncio con cut-in y carga → ejecución exigente → CINE de 5 planos */
      this.cutInEspecial("¡" + mega.n.toUpperCase() + "!", (mega.sub || "") + " · " + mega.guts + " guts", () => {
        this.abrirTiming(mega, (ej) => this.dispararConCine(mega, ej));
      });
    } else {
      /* FEEL B5 · tiro normal (o mega sin cine): LA BARRA DE TIMING — el tiro se EJECUTA */
      this.abrirTiming(mega, (ej) => this.dispararSimple(mega, ej));
    }
  }
  /* ============ ANIME v4 Bloque F · LA DECISIÓN AÉREA ============
     El pase largo llega ALTO: cabezazo / volea / chilena (o bajarla y jugar).
     La chilena exige juego aéreo alto y 250 guts — y tiene la escena más
     espectacular del juego. LA DEFINICIÓN aplica con ventanas más chicas. */
  abrirMenuAereo() {
    const st = this.st, P = window.PampaPartido;
    st.modo = "congelado";
    const acc = P.accionesAereas(st);
    const A = id => acc.find(a => a.id === id) || { bloqueada: true, motivo: "no disponible", poder: 0, costo: 0 };
    const cab = A("cabezazo"), vol = A("volea"), chi = A("chilena");
    const sub = a => a.bloqueada ? null : "~" + Math.round(a.poder) + " de poder · " + a.costo + " guts";
    this.abrirMenuCruz({
      titulo: "☁ ¡LA PELOTA VIENE ALTA! ¿Cómo la resolvés? (ventanas más exigentes)",
      izq: { j: st.mios[st.ctrl], guts: st.mios[st.ctrl].aguante },
      opciones: {
        W: { texto: "🎯 CABEZAZO", sub: sub(cab), bloqueada: cab.bloqueada, motivo: cab.motivo, cb: () => this.resolverTiroAereo("cabezazo") },
        N: { texto: "⚡ VOLEA", sub: sub(vol), bloqueada: vol.bloqueada, motivo: vol.motivo, cb: () => this.resolverTiroAereo("volea") },
        S: { texto: "🌪 CHILENA", sub: chi.bloqueada ? null : sub(chi) + " · ¡la gloria!", bloqueada: chi.bloqueada, motivo: chi.motivo, cb: () => this.resolverTiroAereo("chilena") },
        E: { texto: "⬇ BAJARLA", sub: "control y a jugar", cb: () => { P.bajarla(st); this.reanudarLibre(); } }
      },
      volver: null
    });
  }
  resolverTiroAereo(id) {
    const F = this.BAL.feel || {};
    const zona = id === "chilena" ? (F.barra_zona_chilena || 0.12) : (F.barra_zona_aerea || 0.17);
    this.abrirTiming(null, (ej) => this.dispararAereo(id, ej), zona);
  }
  dispararAereo(id, ej) {
    const st = this.st, P = window.PampaPartido;
    const tirador = st.mios[st.ctrl];
    const enCamino = this.rivalesEnElCamino(tirador);
    const prep = P.prepararRemateAereo(st, id);
    const res = window.PampaDuel.resolveShot({
      shotPower: prep.shotPower, keeperSkill: prep.keeperSkill, zone: ej.zona,
      cfg: { spread: this.BAL.duelo.spread, min: this.BAL.duelo.min, max: this.BAL.duelo.max }
    });
    const snd = this.FLAGS.e6_cine ? this.SFX : null;
    snd && snd.kick();
    const gol = res.outcome === "gol";
    if (gol) P.golMio(st); else P.tiroFallado(st);
    const NOM = { cabezazo: "CABEZAZO", volea: "VOLEA", chilena: "CHILENA" };
    const fb = ej.enZona ? "¡Ejecución justa!" : "la aguja se te escapó…";
    if (this.hayEscenas()) {
      const arqR = st.rivales.find(jj => jj.pos === "ARQ");
      this.escenaCine({
        etiqueta: id === "chilena" ? "· LA CHILENA ·" : "· " + NOM[id].toLowerCase() + " ·",
        prota: { j: tirador, esRival: false, anim: id === "cabezazo" ? "cabezazo" : "volea" },
        protaAngle: id === "chilena" ? -115 : 0,       // la vuelta en el aire
        especial: id === "chilena",
        rival: arqR ? { j: arqR, esRival: true, anim: gol ? "estirada" : (res.outcome === "atajada" ? "atajada" : "parado") } : null,
        siluetas: enCamino,
        gana: gol,
        poseFinalProta: gol ? "festejo" : undefined,
        titulo: gol ? "¡GOOOL DE " + NOM[id] + "!" : (res.outcome === "atajada" ? "¡LA SACÓ!" : "¡AFUERA!"),
        sub: gol ? (id === "chilena" ? "el momento más épico del potrero · " + fb : fb) : fb,
        color: gol ? 0xffd84d : (res.outcome === "atajada" ? 0x5bb8e8 : 0xe3503e),
        sfx: gol ? "goal" : (res.outcome === "atajada" ? "gloves" : "afuera"),
        alFinal: () => {
          if (gol) this.efectoGol(false);
          this.relatar(gol ? "gol" : (res.outcome === "atajada" ? "atajada" : "afuera"), { jugador: tirador.esVos ? "VOS" : tirador.nombre });
        }
      });
      return;
    }
    this.mostrarResolucion((gol ? "¡GOOOL DE " + NOM[id] + "!" : res.outcome === "atajada" ? "¡LA SACÓ EL ARQUERO!" : "¡AFUERA!") + "\n" + fb,
      gol ? "#ffd84d" : "#e3503e", { anim: id === "cabezazo" ? "cabezazo" : "volea", gana: gol });
  }

  /* ============ FEEL B5 · EL CINE DE 5 PLANOS (reintegrado de 53f0d80) ============
     Pie → VIAJE (la pelota HACIA ADENTRO con perspectiva real) → esfuerzo →
     arquero → desenlace. Vive en cineLayer (pantalla fija, uiCam): es un panel
     de presentación, no sprites del mundo — el presupuesto de 3 se respeta. */
  buildCineBase() {
    const W = 960, H = 540;
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
  texturaCineJugador() {
    const j = this.st.mios[this.st.ctrl];
    if (!j || !j.look || !window.PampaAvatarArte) return "cine_jugador";
    const key = "cine_look_" + this.st.ctrl;
    window.PampaAvatarArte.cineJugador(this, key, j.look);
    return key;
  }
  entrarCine() {
    this.quitarDuelo();
    this.estado = "CINE";
    this.mundoLayer.setVisible(false); this.hudLayer.setVisible(false);
    this.cineLayer.setVisible(true);
    this.uiCam.setZoom(1); this.uiCam.centerOn(480, 270);
  }
  salirCine() {
    this.viajeState = null;
    this.cineBig.setAlpha(0); this.cineSub.setAlpha(0);
    this.uiCam.setZoom(1); this.uiCam.centerOn(480, 270);
    const ms = this.BAL.cine.corte_ms;
    let hecho = false;
    const volver = () => {
      if (hecho) return; hecho = true;
      this.cineLayer.setVisible(false);
      this.mundoLayer.setVisible(true); this.hudLayer.setVisible(true);
      this.uiCam.fadeIn(ms, 0, 0, 0);
      this.zoomBase();
      this.estado = "LIBRE";
    };
    this.uiCam.once("camerafadeoutcomplete", volver);
    this.uiCam.fadeOut(ms, 0, 0, 0);
    this.time.delayedCall(ms + 140, volver);
  }
  planoPie() {
    const W = 960, H = 540, C = this.BAL.cine;
    this.limpiarContenido();
    this.cineBG.clear(); this.cineBG.fillStyle(0x2a130b, 1); this.cineBG.fillRect(0, 0, W, H);
    this.cineLabel.setText("· el pie ·");
    const pie = this.add.sprite(W / 2, H / 2 + 10, "cine_pie").setScale(0.6).setAngle(-8);
    this.cineContent.add(pie);
    this.tweens.add({ targets: pie, scale: 5.2, duration: 260, ease: "Back.easeOut" });
    this.SFX && this.SFX.kick();
    this.uiCam.flash(90, 255, 255, 220);
    this.lineasVelocidad(W / 2, H / 2, 1, 0xffd84d);
    this.time.delayedCall(C.plano_pie_ms + 240, () => this.corte(() => this.planoViaje()));
  }
  planoViaje() {
    const W = 960, H = 540, C = this.BAL.cine;
    this.limpiarContenido();
    this.cineLabel.setText("· el viaje ·");
    const vp = { x: W / 2, y: H * 0.24 }, nearY = H * 0.96;
    this.dibujarCanchaProfunda(vp, nearY);
    const ball = this.add.sprite(W / 2, nearY, "ball").setScale(4.2); this.cineContent.add(ball);
    const trail = this.add.particles(0, 0, "spark_sol", { lifespan: 300, speed: 0, scale: { start: 1.2, end: 0 }, alpha: { start: 0.6, end: 0 }, frequency: 18, follow: ball }); this.cineContent.add(trail);
    this.SFX && this.SFX.whoosh(C.plano_viaje_ms);
    const cfg = { k: C.persp.k, vpX: vp.x, vpY: vp.y, nearY, driftX: (this.zona.gy || 0) * C.drift_mult };
    this.viajeState = { activo: true, elapsed: 0, dur: C.plano_viaje_ms, ball, trail, cfg, vp, zoomed: false };
    this.time.delayedCall(C.plano_viaje_ms, () => {
      if (trail && trail.stop) trail.stop();
      if (this.viajeState) this.viajeState.activo = false;
      this.uiCam.setZoom(1); this.uiCam.centerOn(480, 270);
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
    this.lineasVelocidad(vs.vp.x, vs.vp.y, 0.4 + 0.6 * d, 0xffd84d);
    if (!vs.zoomed && d > C.slowmo_desde) {
      vs.zoomed = true;
      this.uiCam.zoomTo(C.zoom_viaje, C.camara_pan_ms, "Sine.easeInOut");
      this.uiCam.pan(vs.vp.x, vs.vp.y + 40, C.camara_pan_ms, "Sine.easeInOut");
      this.SFX && this.SFX.crowd(500);
    }
    if (raw >= 1) vs.activo = false;
  }
  dibujarCanchaProfunda(vp, nearY) {
    const W = 960, H = 540, g = this.cineBG;
    g.clear();
    g.fillStyle(0x123a5a, 1); g.fillRect(0, 0, W, vp.y);
    g.fillStyle(0x2a9d4f, 1);
    g.fillPoints([{ x: 0, y: H }, { x: W, y: H }, { x: vp.x + 34, y: vp.y }, { x: vp.x - 34, y: vp.y }], true);
    g.lineStyle(2, 0xeafff0, 0.28);
    for (let i = 1; i <= 9; i++) {
      const s = window.PampaPersp.aPantalla(i / 10, { k: this.BAL.cine.persp.k, vpX: vp.x, vpY: vp.y, nearY });
      const half = 34 + (W / 2 - 34) * ((s.y - vp.y) / (H - vp.y));
      g.beginPath(); g.moveTo(vp.x - half, s.y); g.lineTo(vp.x + half, s.y); g.strokePath();
    }
    g.lineStyle(3, 0xeafff0, 0.5);
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
    const W = 960, H = 540, C = this.BAL.cine;
    this.limpiarContenido();
    this.cineBG.clear(); this.cineBG.fillStyle(0x1a1206, 1); this.cineBG.fillRect(0, 0, W, H);
    this.cineLabel.setText("· el esfuerzo ·");
    this.lineasVelocidad(W / 2, H / 2, 1, 0xffd84d);
    const jug = this.add.sprite(W / 2, H / 2 + 20, this.texturaCineJugador()).setScale(2.6).setAngle(4);
    this.cineContent.add(jug);
    this.tweens.add({ targets: jug, scale: 3.4, angle: -3, duration: C.plano_esfuerzo_ms, ease: "Sine.easeOut" });
    this.SFX && this.SFX.crowd(400);
    this.time.delayedCall(C.plano_esfuerzo_ms, () => this.corte(() => this.planoArquero()));
  }
  planoArquero() {
    const W = 960, H = 540, C = this.BAL.cine;
    this.limpiarContenido();
    this.cineBG.clear(); this.cineBG.fillStyle(0x0b2416, 1); this.cineBG.fillRect(0, 0, W, H);
    this.cineBG.fillStyle(0x1f7a3c, 1); this.cineBG.fillRect(0, H * 0.62, W, H * 0.38);
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
    const W = 960, H = 540, C = this.BAL.cine, EP = this.BAL.epica, res = this.res, st = this.st, P = window.PampaPartido;
    this.limpiarContenido();
    this.cineBG.clear(); this.cineBG.fillStyle(0x0b2416, 1); this.cineBG.fillRect(0, 0, W, H);
    this.cineBG.fillStyle(0x1f7a3c, 1); this.cineBG.fillRect(0, H * 0.66, W, H * 0.34);
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
    /* Feel B8: SILENCIO antes de revelar (el vacío en el estómago) */
    const silencio = (this.BAL.feel && this.BAL.feel.silencio_ms) || 500;
    this.musicaDuck(silencio + 300);   // ANIME D: también calla la música del loop
    if (res.outcome === "gol") {
      arq.setPosition(gx + (this.zona.gy < 0 ? 90 : -90), gy - 10);
      this.tweens.add({ targets: ball, x: gx + (this.zona.gy || 0) * 1.2, y: targetY, scale: 1.2, duration: C.impacto_gol_ms, ease: "Quad.easeIn" });
      this.time.delayedCall(C.impacto_gol_ms + silencio, () => {
        ball.setPosition(gx + (this.zona.gy || 0) * 1.2, targetY);
        this.uiCam.shake(EP.shake_ms, EP.shake_intensidad);
        this.uiCam.flash(EP.flash_ms, 255, 255, 210);
        this.SFX && this.SFX.net(); this.time.delayedCall(EP.fanfarria_delay_ms, () => this.SFX && this.SFX.goal());
        this.burst(ball.x, ball.y);
        this.punch(this._megaGrito || "¡GOOOL!", "¡La clavaste donde el viento no la saca!", 0xffd84d);
        P.golMio(st);
      });
    } else if (res.outcome === "atajada") {
      this.tweens.add({ targets: ball, x: gx - 30, y: gy - 20, scale: 1.7, duration: C.impacto_atajada_ms, ease: "Quad.easeIn" });
      this.time.delayedCall(C.impacto_atajada_ms + silencio, () => {
        ball.setPosition(gx - 30, gy - 20);
        this.SFX && this.SFX.gloves(); this.uiCam.shake(EP.atajada_shake_ms, EP.atajada_shake_int);
        this.dust(gx - 30, gy - 20);
        this.punch("¡LA SACÓ!", "El arquero voló y la manoteó.", 0x5bb8e8);
        this.tweens.add({ targets: ball, x: gx - 260, y: gy + 40, duration: EP.rebote_atajada_ms, ease: "Quad.easeOut" });
        P.tiroFallado(st);
      });
    } else {
      this.tweens.add({ targets: ball, x: gx + (this.zona.gy < 0 ? -1 : 1) * (gw / 2 + 60), y: gy - gh - 30, scale: 1.0, alpha: 0.3, duration: C.impacto_afuera_ms, ease: "Quad.easeIn" });
      this.time.delayedCall(C.impacto_afuera_ms + silencio - 120, () => {
        this.SFX && this.SFX.afuera(); this.punch("¡AFUERA!", "Se fue por centímetros. ¡Uf!", 0xe3503e);
        P.tiroFallado(st);
      });
    }
    this.time.delayedCall(C.impacto_gol_ms + silencio + C.desenlace_hold_ms, () => this.salirCine());
  }
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

  /* qué MEGATIRO está disponible: de data (nombre pampeano), desbloqueado por nivel de
     carrera, pagable con guts y pasada su línea de cancha. Devuelve el más potente. */
  megaDisponible() {
    const st = this.st, j = st.mios[st.ctrl];
    if (!j || !j.esVos || st.posesion !== "mia") return null;
    const nivel = this._nivelCarrera || 1;
    const lista = ((this.MEGA && this.MEGA.megatiros) || []).filter(m =>
      nivel >= (m.nivel || 1) && j.aguante >= (m.guts || 300) && j.x > (m.x_min || 680));
    return lista.length ? lista[lista.length - 1] : null;
  }
  /* la BARRA DE TIMING (Feel B5): frenás la aguja en la zona buena — dedo o teclado, jamás mouse obligatorio.
     zonaOverride (Anime F): los tiros aéreos usan ventanas más exigentes. */
  abrirTiming(mega, alRematar, zonaOverride) {
    const F = this.BAL.feel || {};
    this.estado = "TIMING";
    this.limpiarMenu();
    this._timing = {
      mega, alRematar, zonaOverride,
      t0: this.time.now,
      periodo: F.barra_periodo_ms || 900,
      zona: zonaOverride != null ? zonaOverride : (mega ? (F.barra_zona_mega || 0.13) : (F.barra_zona_normal || 0.24)),
      p: 0, parada: false
    };
    const velo = this.add.rectangle(480, 270, 960, 540, 0x06120b, 0.3).setInteractive();
    const tit = this.add.text(480, 226, mega ? "⚡ ¡PARÁ LA AGUJA EN LA ZONA! (ventana exigente)" : "🎯 ¡PARÁ LA AGUJA EN LA ZONA!",
      { fontFamily: "monospace", fontSize: "14px", color: "#f6efdc", backgroundColor: "#0a1f13dd", padding: { x: 10, y: 5 } }).setOrigin(0.5);
    const ayuda = this.add.text(480, 356, "tocá la pantalla (o ESPACIO / ENTER)", { fontFamily: "monospace", fontSize: "11px", color: "#ffd84d" }).setOrigin(0.5);
    this._timingG = this.add.graphics();
    this.menuLayer.add([velo, tit, ayuda, this._timingG]);
    this.selloMenu();
    velo.on("pointerdown", (p, x, y, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); this._uiTocado = this.time.now; this.pararAguja(); });
  }
  dibujarTiming() {
    const T = this._timing; if (!T || !this._timingG || T.parada) return;
    const g = this._timingG, bx = 480 - 210, by = 288, bw = 420, bh = 30;
    const fase = ((this.time.now - T.t0) % T.periodo) / T.periodo;
    T.p = fase < 0.5 ? fase * 2 : 2 - fase * 2;   // la aguja va y viene
    g.clear();
    g.fillStyle(0x0a1f13, 0.92); g.fillRect(bx - 4, by - 4, bw + 8, bh + 8);
    g.fillStyle(0x333d36, 1); g.fillRect(bx, by, bw, bh);
    /* ZONA BUENA centrada, marcada con borde blanco + etiqueta (forma + texto, no solo color) */
    const zx = bx + bw * (0.5 - T.zona / 2), zw = bw * T.zona;
    g.fillStyle(0x2e7d32, 1); g.fillRect(zx, by, zw, bh);
    g.lineStyle(2, 0xffffff, 1); g.strokeRect(zx, by, zw, bh);
    if (!this._timingTxtJusto) {
      this._timingTxtJusto = this.add.text(480, by + bh + 16, "▲ JUSTO ACÁ", { fontFamily: "monospace", fontSize: "11px", color: "#f6efdc" }).setOrigin(0.5);
      this.menuLayer.add(this._timingTxtJusto);
      this.selloMenu();
    }
    const ax = bx + bw * T.p;
    g.fillStyle(0xffd84d, 1); g.fillRect(ax - 3, by - 8, 6, bh + 16);
    g.fillTriangle(ax - 8, by - 14, ax + 8, by - 14, ax, by - 4);
  }
  pararAguja() {
    const T = this._timing; if (!T || T.parada) return;
    T.parada = true;
    this._timingTxtJusto = null;
    const st = this.st, stats = st.mios[st.ctrl].stats || {};
    /* la aguja modula POTENCIA y COLOCACIÓN vía logic/tiro.js (la destreza pesa, los stats también) */
    const off = T.p - 0.5;
    const enZona = Math.abs(off) <= T.zona / 2;
    const potencia = enZona ? 0.75 : (off < 0 ? 0.75 + off * 0.9 : 0.75 + off * 0.5);
    const ej = window.PampaTiro.evaluarEjecucion({
      aimX: off * 1.8, aimY: 0.3, potencia: Phaser.Math.Clamp(potencia, 0.1, 1), curva: 0,
      statTiro: stats.tiro != null ? stats.tiro : 50, cfg: this.BAL.tiro_ejecucion
    });
    ej.enZona = enZona;
    this._timing = null;
    this.limpiarMenu();
    T.alRematar(ej);
  }
  dispararSimple(mega, ej) {
    const st = this.st, P = window.PampaPartido;
    const prep = P.prepararRemate(st, mega || false);
    const res = window.PampaDuel.resolveShot({
      shotPower: prep.shotPower, keeperSkill: prep.keeperSkill, zone: ej.zona,
      cfg: { spread: this.BAL.duelo.spread, min: this.BAL.duelo.min, max: this.BAL.duelo.max }
    });
    const snd = this.FLAGS.e6_cine ? this.SFX : null;
    snd && snd.kick();
    /* ANIME B (P1): el tiro se VE — viñeta pateador vs arquero rival, con las
       siluetas de cuántos tenés en el camino. La verdad ya está decidida. */
    if (this.hayEscenas()) {
      const tirador = st.mios[st.ctrl];
      const arqR = st.rivales.find(jj => jj.pos === "ARQ");
      const enCamino = this.rivalesEnElCamino(tirador);
      const gol = res.outcome === "gol";
      if (gol) P.golMio(st); else P.tiroFallado(st);   // la verdad UNA vez; la escena la cuenta
      const fb = ej.enZona ? "¡Ejecución justa!" : "la aguja se te escapó…";
      this.escenaCine({
        etiqueta: "· el remate ·",
        prota: { j: tirador, esRival: false, anim: "tiro" },
        rival: arqR ? { j: arqR, esRival: true, anim: gol ? "estirada" : (res.outcome === "atajada" ? "atajada" : "parado") } : null,
        siluetas: enCamino,
        gana: gol,
        poseFinalProta: gol ? "festejo" : "tiro",
        titulo: gol ? (mega ? mega.grito : "¡GOOOL!") : (res.outcome === "atajada" ? "¡LA SACÓ!" : "¡AFUERA!"),
        sub: gol ? fb : (res.outcome === "atajada" ? "el arquero voló y la manoteó · " + fb : "se fue por centímetros · " + fb),
        color: gol ? 0xffd84d : (res.outcome === "atajada" ? 0x5bb8e8 : 0xe3503e),
        sfx: gol ? "goal" : (res.outcome === "atajada" ? "gloves" : "afuera"),
        alFinal: () => {
          if (gol) this.efectoGol(false);
          this.relatar(gol ? "gol" : (res.outcome === "atajada" ? "atajada" : "afuera"), { jugador: tirador.esVos ? "VOS" : tirador.nombre });
        }
      });
      return;
    }
    /* Feel B8: SILENCIO de medio segundo antes de REVELAR el desenlace del tiro */
    this.estado = "RESOLUCION";
    this.limpiarMenu();
    const silencio = this.FLAGS.e6_cine ? ((this.BAL.feel && this.BAL.feel.silencio_ms) || 500) : 0;
    if (silencio) this.musicaDuck(silencio);
    this.time.delayedCall(silencio, () => {
      const fb = ej.enZona ? "¡EJECUCIÓN JUSTA!\n" : "la aguja se te escapó…\n";
      if (res.outcome === "gol") { P.golMio(st); this.efectoGol(false); this.mostrarResolucion(fb + (mega ? mega.grito : "¡GOOOL!"), "#ffd84d", { anim: "tiro", gana: true }); }
      else if (res.outcome === "atajada") { P.tiroFallado(st); snd && snd.gloves(); this.mostrarResolucion(fb + "¡LA SACÓ EL ARQUERO!", "#5bb8e8", { anim: "tiro", gana: false }); }
      else { P.tiroFallado(st); snd && snd.afuera(); this.mostrarResolucion(fb + "¡AFUERA!", "#e3503e", { anim: "tiro", gana: false }); }
    });
  }
  /* MEGATIRO: el resultado se decide UNA vez (bug del arquero cerrado) y el CINE lo cuenta */
  dispararConCine(mega, ej) {
    const st = this.st, P = window.PampaPartido;
    const prep = P.prepararRemate(st, mega);
    this.res = window.PampaDuel.resolveShot({
      shotPower: prep.shotPower, keeperSkill: prep.keeperSkill, zone: ej.zona,
      cfg: { spread: this.BAL.duelo.spread, min: this.BAL.duelo.min, max: this.BAL.duelo.max }
    });
    this.zona = ej.zona;
    this._megaGrito = mega.grito || "¡GOOOL!";
    this.SFX && this.SFX.kick();
    this.cameras.main.flash(this.BAL.cine.corte_flash_ms, 255, 255, 255);
    this.entrarCine();
    this.planoPie();
  }

  /* ============ ANIME v4 Bloque B · LA CAPA CINEMÁTICA ============
     Gestor único: recibe tipo de acción, protagonistas y desenlace, y compone
     la viñeta a pantalla completa con poses ESTÁTICAS de los heroicos (2-4 por
     escena), efectos y texto. Vive en cineLayer (uiCam, panel de UI): el
     presupuesto de 3 sprites del mundo no se toca. El hilo avanza POR RELOJ
     (lección del Hito 1: los tweens son solo movimiento visual). */
  texturaEscena(j, esRival, anim, frame) {
    const esArq = j.pos === "ARQ";
    const base = (esRival ? "h_riv" : "h_mio") + ((j.numero || 1) - 1);
    if (!this._bakes) this._bakes = new Set();
    const fresco = !this._bakes.has(base); this._bakes.add(base);
    window.PampaAvatarArte.heroico(this, base, j.look || window.PampaAvatar.crearLook(),
      esArq ? (esRival ? "arqRival" : "arqMio") : (esRival ? "rival" : "mio"),
      j.numero, esArq ? ["parado", "estirada", "atajada", "despeje"] : undefined, fresco);
    const key = base + "_" + anim + "_" + (frame || 0);
    return this.textures.exists(key) ? key : base + (esArq ? "_parado_0" : "_correr_1");
  }
  /* ¿contra cuántos pateás? — rivales de campo entre vos y el arco (info de la decisión) */
  rivalesEnElCamino(j) {
    let n = 0;
    this.st.rivales.forEach(r => { if (r.pos !== "ARQ" && r.x > j.x && Math.abs(r.y - j.y) < 140) n++; });
    return n;
  }
  /* cfg: { etiqueta, prota:{j,esRival,anim}, rival:{j,esRival,anim}|null, gana,
            titulo, sub, color?, sfx?, siluetas?, poseFinalProta?, poseFinalRival?, alFinal } */
  escenaCine(cfg) {
    const F = this.BAL.escena || {}, feel = this.BAL.feel || {};
    this.estado = "ESCENA";
    this.quitarDuelo(); this.limpiarMenu();
    this.mundoLayer.setVisible(false); this.hudLayer.setVisible(false);
    this.cineLayer.setVisible(true);
    this.uiCam.setZoom(1); this.uiCam.centerOn(480, 270);
    this.limpiarContenido();
    const W = 960, H = 540, g = this.cineBG, rivProta = !!cfg.prota.esRival;
    g.clear();
    g.fillStyle(0x081c10, 1); g.fillRect(0, 0, W, H);
    /* banda diagonal del bando protagonista + pasto al pie (viñeta de manga) */
    g.fillStyle(rivProta ? 0x2a0b0b : 0x0b1c2a, 1);
    g.fillTriangle(0, 0, W * 0.66, 0, W * 0.34, H); g.fillTriangle(0, 0, W * 0.34, H, 0, H);
    g.fillStyle(0x1f7a3c, 1); g.fillRect(0, H * 0.8, W, H * 0.2);
    g.fillStyle(0x2e7d32, 1); for (let x = 0; x < W; x += 120) g.fillRect(x, H * 0.8, 60, H * 0.2);
    /* siluetas: CONTRA CUÁNTOS pateás (defensores en el camino; el arquero es el rival del plano) */
    if (cfg.siluetas != null) {
      for (let k = 0; k < Math.min(cfg.siluetas, 5); k++) {
        const sx = W * 0.5 + k * 62, sy = H * 0.4 - k * 24, e = 1 - k * 0.13;
        g.fillStyle(0x0a1f13, 0.75);
        g.fillEllipse(sx, sy - 58 * e, 24 * e, 24 * e); g.fillRoundedRect(sx - 15 * e, sy - 46 * e, 30 * e, 60 * e, 8);
      }
      const tS = this.add.text(W - 16, 40, "entre vos y el arco: " + cfg.siluetas + " + el arquero", { fontFamily: "monospace", fontSize: "12px", color: "#f6efdc", backgroundColor: "#0a1f13cc", padding: { x: 6, y: 3 } }).setOrigin(1, 0);
      this.cineContent.add(tS);
    }
    this.cineLabel.setText(cfg.etiqueta || "");
    /* protagonista y antagonista ENTRAN al plano (tween visual; el hilo va por reloj) */
    const escProta = (F.escala_prota || 3.4) * (cfg.especial ? 1.25 : 1);
    const sp = this.add.sprite(-140, H * 0.58, this.texturaEscena(cfg.prota.j, cfg.prota.esRival, cfg.prota.anim, 1)).setScale(escProta);
    if (cfg.protaAngle) sp.setAngle(cfg.protaAngle);   // Anime F: la CHILENA da la vuelta en el aire
    this.cineContent.add(sp);
    this.tweens.add({ targets: sp, x: W * 0.3, duration: F.entrada_ms || 420, ease: "Quad.easeOut" });
    if (cfg.especial) {   // la escena más espectacular: doble flash + líneas más gruesas
      this.lineasVelocidad(W * 0.3, H * 0.5, 1.4, 0xffd84d);
      this.time.delayedCall((F.entrada_ms || 420) * 0.6, () => this.uiCam.flash(140, 255, 216, 77));
    }
    let sr = null;
    if (cfg.rival) {
      sr = this.add.sprite(W + 140, H * 0.62, this.texturaEscena(cfg.rival.j, cfg.rival.esRival, cfg.rival.anim, 0)).setScale(F.escala_rival || 2.9).setFlipX(true);
      this.cineContent.add(sr);
      this.tweens.add({ targets: sr, x: W * 0.72, duration: (F.entrada_ms || 420) * 1.15, ease: "Quad.easeOut" });
    }
    /* nombres con placa del bando (celeste vs naranja + texto: forma y palabra, no solo color) */
    const placa = (x, j, esRival) => {
      const t = this.add.text(x, H * 0.84, (j.esVos ? "VOS" : (j.nombre || "").toUpperCase().slice(0, 12)),
        { fontFamily: "monospace", fontSize: "13px", fontStyle: "bold", color: "#0a1f13", backgroundColor: esRival ? "#FF8A50" : "#4FC3F7", padding: { x: 8, y: 3 } }).setOrigin(0.5);
      this.cineContent.add(t);
    };
    placa(W * 0.3, cfg.prota.j, cfg.prota.esRival);
    if (cfg.rival) placa(W * 0.72, cfg.rival.j, cfg.rival.esRival);
    this.lineasVelocidad(W / 2, H * 0.45, 0.9, rivProta ? 0xff8a50 : 0xffd84d);
    this.uiCam.flash(90, 255, 255, 220);
    const snd = this.SFX; snd && snd.whoosh && snd.whoosh(F.entrada_ms || 420);
    /* pose → SILENCIO → DESENLACE → volver (todo por delayedCall) */
    const tPose = (F.entrada_ms || 420) + (F.pose_ms || 650);
    const silencio = feel.silencio_ms || 500;
    this.time.delayedCall(tPose, () => {
      if (sp.active) sp.setTexture(this.texturaEscena(cfg.prota.j, cfg.prota.esRival, cfg.prota.anim, 2));
      this.musicaDuck(silencio);   // ANIME D: la música CALLA en el silencio pre-desenlace
    });
    this.time.delayedCall(tPose + silencio, () => {
      if (sp.active) sp.setTexture(this.texturaEscena(cfg.prota.j, cfg.prota.esRival, cfg.poseFinalProta || cfg.prota.anim, 3));
      if (sr && sr.active && cfg.rival) sr.setTexture(this.texturaEscena(cfg.rival.j, cfg.rival.esRival, cfg.poseFinalRival || cfg.rival.anim, 3));
      if (cfg.gana) { sp.setScale((F.escala_prota || 3.4) * (cfg.especial ? 1.25 : 1) * 1.12); this.burst(sp.x, sp.y - 70); }
      if (cfg.especial) { this.uiCam.shake(320, 0.012); this.lineasVelocidad(sp.x, sp.y - 40, 1.6, 0xffd84d); }
      else if (sr) sr.setScale((F.escala_rival || 2.9) * 1.12);
      this.punch(cfg.titulo, cfg.sub || "", cfg.color != null ? cfg.color : (cfg.gana ? 0xffd84d : 0xe3503e));
      if (snd) {
        if (cfg.sfx === "goal") { snd.net(); this.time.delayedCall(90, () => snd.goal()); }
        else if (cfg.sfx && snd[cfg.sfx]) snd[cfg.sfx]();
      }
      this.uiCam.shake(200, cfg.gana ? 0.008 : 0.005);
    });
    this.time.delayedCall(tPose + silencio + (F.hold_ms || 1150), () => this.cerrarEscena(cfg.alFinal));
  }
  cerrarEscena(alFinal) {
    this.cineBig.setAlpha(0); this.cineSub.setAlpha(0);
    const ms = this.BAL.cine.corte_ms;
    let hecho = false;
    const volver = () => {
      if (hecho) return; hecho = true;
      this.limpiarContenido();
      this.cineLayer.setVisible(false);
      this.mundoLayer.setVisible(true); this.hudLayer.setVisible(true);
      this.uiCam.fadeIn(ms, 0, 0, 0);
      this.zoomBase();
      this.estado = "LIBRE";
      alFinal && alFinal();
    };
    this.uiCam.once("camerafadeoutcomplete", volver);
    this.uiCam.fadeOut(ms, 0, 0, 0);
    this.time.delayedCall(ms + 140, volver);
  }
  /* ¿la capa cinemática está activa? (flag B + el sonido/pulido de la E6 acompañan) */
  hayEscenas() { return this.FLAGS.v4_escenas && this.FLAGS.e6_cine; }

  /* ============ ETAPA 6 · pulido cinematográfico ============ */
  cutInEspecial(titulo, sub, cb, jRet, esRivalRet) {
    if (typeof sub === "function") { cb = sub; sub = null; }   // compat con la firma vieja
    this.estado = "RESOLUCION";
    this.limpiarMenu();
    const j = jRet || this.st.mios[this.st.ctrl];
    const franja = this.add.rectangle(480, 270, 1100, 190, esRivalRet ? 0x2a0b0b : 0x2a130b, 0.94).setStrokeStyle(4, esRivalRet ? 0xff8a50 : 0xffd84d).setAngle(-4);
    /* ANIME C: el que carga un especial va TRIUNFANTE (o el rival, desafiante = frustrado) */
    const img = this.add.image(-140, 270, this.retratoKey(j, !!esRivalRet, esRivalRet ? "frustrado" : "triunfante"));
    img.setScale(180 / img.height);
    const txt = this.add.text(1150, 258, titulo, { fontFamily: "'Press Start 2P',monospace", fontSize: "22px", color: "#ffd84d", stroke: "#0a1f13", strokeThickness: 8 }).setOrigin(0.5);
    const subTxt = this.add.text(1150, 292, sub || ((j.esVos ? "VOS" : j.nombre) + " toma fuerza…"), { fontFamily: "monospace", fontSize: "13px", color: "#f6efdc" }).setOrigin(0.5);
    /* Feel B5: CARGA DE GUTS VISIBLE — la barra se llena mientras el anuncio dura */
    const cargaBg = this.add.rectangle(560, 330, 340, 14, 0x0a1f13, 0.9).setStrokeStyle(2, 0xf6efdc, 0.8);
    const carga = this.add.rectangle(560 - 168, 330, 4, 10, 0xffd84d, 1).setOrigin(0, 0.5);
    const cargaTxt = this.add.text(560, 348, "cargando guts…", { fontFamily: "monospace", fontSize: "10px", color: "#ffd84d" }).setOrigin(0.5);
    this.menuLayer.add([franja, img, txt, subTxt, cargaBg, carga, cargaTxt]);
    this.selloMenu();
    this.tweens.add({ targets: img, x: 200, duration: 260, ease: "Back.easeOut" });
    this.tweens.add({ targets: [txt, subTxt], x: 560, duration: 260, ease: "Back.easeOut" });
    this.tweens.add({ targets: carga, width: 336, duration: 820, ease: "Sine.easeIn" });
    this.cameras.main.flash(120, 255, 216, 77);
    this.SFX && this.SFX.whoosh(700);
    this.time.delayedCall(1050, () => { this.limpiarMenu(); cb(); });
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
    /* Feel B8: explosión de HINCHADA en el gol (y rumor apagado en el gol en contra) */
    this.SFX && this.SFX.crowd && this.SFX.crowd(enContra ? 600 : 1600);
    this.time.delayedCall(90, () => this.SFX && (enContra ? (this.SFX.golEnContra && this.SFX.golEnContra()) : this.SFX.goal()));
  }
  reanudarLibre() {
    this.st.modo = "juego";
    this.quitarDuelo();
    this.limpiarMenu();
    this.zoomBase();
    this.estado = "LIBRE";
  }
  finDelPartido() {
    const st = this.st;
    this.estado = "FINAL";     // estado propio: ningún delayedCall de resolución lo puede barrer
    this.musica(null);         // ANIME D: silencio de vestuario
    if (this.SFX && this.SFX.musicaUrgente) this.SFX.musicaUrgente(false);
    this.SFX && this.SFX.whistle();
    this.relatar("final");
    this.quitarDuelo();
    this.limpiarMenu();
    const t = this.add.text(480, 250, "🏁 FINAL: VOS " + st.golesMio + " - " + st.golesRival + " " + this.nombreRival, { fontFamily: "'Press Start 2P',monospace", fontSize: "16px", color: "#ffd84d", stroke: "#0a1f13", strokeThickness: 6, align: "center" }).setOrigin(0.5);
    const b = this.add.rectangle(480, 330, 320, 54, 0x7ee08a, 1).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
    const bt = this.add.text(480, 330, "↺ OTRO PARTIDO", { fontFamily: "'Press Start 2P',monospace", fontSize: "11px", color: "#0a1f13" }).setOrigin(0.5);
    this.menuLayer.add([t, b, bt]);
    b.on("pointerdown", () => this.scene.restart());
    /* FUSIÓN: el resultado vuelve a la carrera clásica (mismo formato pampa_star_v1
       vía aplicarFecha del clásico — acá solo se deja el resultado y se vuelve) */
    if (this._pedido) {
      const b2 = this.add.rectangle(480, 398, 460, 54, 0xffd84d, 1).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
      const bt2 = this.add.text(480, 398, "▶ APLICAR Y VOLVER A LA CARRERA", { fontFamily: "'Press Start 2P',monospace", fontSize: "10px", color: "#0a1f13" }).setOrigin(0.5);
      this.menuLayer.add([b2, bt2]);
      b2.on("pointerdown", () => {
        try {
          localStorage.setItem("pampa_resultado_phaser", JSON.stringify({ fecha: this._pedido.fecha | 0, golesMio: st.golesMio, golesRival: st.golesRival, ts: Date.now() }));
          localStorage.removeItem("pampa_pedido_phaser");
        } catch (e) { }
        window.location.href = "../index.html";
      });
    }
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
    /* Anime A: sin radar el destino se toca sobre la CANCHA; el hint baja al pie */
    const hx = this._vista4 ? 480 : this.radar.x + this.radar.w / 2;
    const hy = this._vista4 ? 528 : this.radar.y - 26;
    const hint = this.add.text(hx, hy,
      this._vista4
        ? "➡ PASE: tocá el DESTINO sobre la cancha (□ = receptores; más allá = AL VACÍO · ◀▶ + ENTER, ▲ = al vacío, ESC = volver)"
        : "➡ PASE: tocá el DESTINO en el radar\n(más allá del receptor = AL VACÍO · teclado: ◀▶ + ENTER, ▲ = al vacío, ESC = volver)",
      { fontFamily: "monospace", fontSize: "10px", color: "#0a1f13", backgroundColor: "#ffd84d", padding: { x: 6, y: 3 }, align: "center" }).setOrigin(0.5, 1);
    this._paseCancelar = () => {
      if (this._paseOrigen.libre) this.reanudarLibre(); else this.abrirMenuAtaque(this._paseOrigen.rivalIdx, false);
    };
    const cx = this._vista4 ? 906 : this.radar.x + this.radar.w + 36;
    const cy = this._vista4 ? 306 : this.radar.y + 24;
    const cancel = this.add.rectangle(cx, cy, 56, 48, 0xdcd6c2, 0.95).setStrokeStyle(2, 0x0a1f13).setInteractive({ useHandCursor: true });
    const ct = this.add.text(cx, cy, "✕", { fontFamily: "monospace", fontSize: "18px", color: "#0a1f13" }).setOrigin(0.5);
    this.menuLayer.add([hint, cancel, ct]);
    cancel.on("pointerdown", (p, x, y, ev) => {
      ev && ev.stopPropagation && ev.stopPropagation(); this._uiTocado = this.time.now;
      this._paseCancelar && this._paseCancelar();
    });
    this.selloMenu();
  }
  /* ============ FEEL B4 · LA TENSIÓN DEL PASE: nunca más instantáneo ============ */
  distALinea(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1;
    const t = Phaser.Math.Clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / L2, 0, 1);
    return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
  }
  confirmarPase(rec, alVacio) {
    const st = this.st, P = window.PampaPartido;
    this._receptores = null;
    /* foto ANTES de resolver: origen, destino y el rival que puede cortarla */
    const origen = { x: st.mios[st.ctrl].x, y: st.mios[st.ctrl].y };
    const destino = { x: st.mios[rec.idx].x, y: st.mios[rec.idx].y };
    if (alVacio) destino.x = Math.min(destino.x + (this.BAL.partido.vacio_avance || 130), st.W - 60);
    let cortador = null, dMin = 60;
    st.rivales.forEach((r) => {
      if (r.pos === "ARQ") return;
      const d = this.distALinea(r, origen, destino);
      if (d < dMin) { dMin = d; cortador = r; }
    });
    /* la verdad se decide UNA vez en la lógica; el teatro solo la cuenta */
    let res, texto;
    if (alVacio) {
      res = P.resolverPaseAlVacio(st, rec.idx, rec.pct);
      texto = res.win ? "¡PASE AL VACÍO!\n" + st.mios[st.ctrl].nombre.toUpperCase() + " la agarra en carrera\n(el arquero quedó vendido)" : "¡La adelantaste demasiado!\nPelota rival.";
    } else {
      res = P.resolverPase(st, rec.idx, rec.pct);
      texto = res.win ? "AHORA JUGÁS: " + st.mios[st.ctrl].nombre.toUpperCase() : "¡INTERCEPTADO!\nLeyeron el pase.";
    }
    this.animarPase(origen, destino, alVacio, cortador, res.win, texto);
  }
  animarPase(origen, destino, alVacio, cortador, win, texto) {
    this.estado = "RESOLUCION";
    this.limpiarMenu();
    const snd = this.FLAGS.e6_cine ? this.SFX : null;
    const wA = this.aRender(origen.x, origen.y), wB = this.aRender(destino.x, destino.y);
    const cam = this.cameras.main;
    cam.stopFollow();
    const peligro = !!cortador;
    /* trayectoria punteada del pase al vacío + el compañero corriendo a buscarla */
    const linea = this.add.graphics().setDepth(7);
    this.mundoLayer.add(linea); this.uiCam.ignore(linea);
    if (alVacio) {
      linea.lineStyle(3, 0xffd84d, 0.8);
      const seg = 12, n = Math.floor(Math.hypot(wB.x - wA.x, wB.y - wA.y) / (seg * 2));
      for (let i = 0; i < n; i++) {
        const t0 = (i * 2 * seg) / (n * 2 * seg), t1 = ((i * 2 + 1) * seg) / (n * 2 * seg);
        linea.beginPath();
        linea.moveTo(wA.x + (wB.x - wA.x) * t0, wA.y + (wB.y - wA.y) * t0);
        linea.lineTo(wA.x + (wB.x - wA.x) * t1, wA.y + (wB.y - wA.y) * t1);
        linea.strokePath();
      }
    }
    /* la cámara acompaña a la pelota en su viaje */
    const durVuelo = alVacio ? 850 : 650;
    cam.pan(wB.x, wB.y, durVuelo + (peligro ? 700 : 150), "Sine.easeInOut", true);
    snd && snd.whoosh(durVuelo);
    const bola = this.sprPelota;
    bola.setPosition(wA.x, wA.y);
    const cerrar = () => {
      linea.destroy();
      if (win && this.FLAGS.v4_aereo && this.FLAGS.e3_menus &&
        window.PampaPartido.pelotaAltaVigente(this.st) && window.PampaPartido.puedeTirar(this.st)) {
        /* ANIME F: el pase largo LLEGA ALTO cerca del arco — se abre la decisión aérea */
        this.quitarDuelo();
        this.abrirMenuAereo();
      } else if (win && !peligro) {
        /* pase seguro: fluye sin fricción — aviso chico y a jugar */
        this.quitarDuelo();
        this.zoomBase();
        this.estado = "LIBRE";
        this.avisar(texto.split("\n")[0]);
      } else if (!win && this.hayEscenas()) {
        /* ANIME B (P3): nunca más "perdiste la pelota" solo en el título —
           el CORTE es una viñeta: el defensor que se lanzó, en primer plano */
        const cortJ = cortador || this.st.rivales[this.st.portadorRival];
        this.escenaCine({
          etiqueta: "· el corte ·",
          prota: { j: cortJ, esRival: true, anim: "pase" },   // lanzado a cortarla
          rival: null,
          gana: true, color: 0xe3503e, sfx: "gloves",
          titulo: alVacio ? "¡NO LLEGÓ!" : "¡CORTADO!",
          sub: alVacio ? "la adelantaste demasiado y la leyeron · pelota rival" : "se lanzó a la línea de pase · pelota rival",
          alFinal: () => this.relatar("corte")
        });
      } else {
        this.mostrarResolucion(texto, win ? "#7ee08a" : "#e3503e", { anim: "pase", gana: win });
      }
    };
    /* LA SECUENCIA AVANZA POR RELOJ (robusto — lección del Hito 1: los tweens
       son solo movimiento visual, jamás el hilo de la historia) */
    if (!peligro) {
      this.tweens.add({ targets: bola, x: wB.x, y: wB.y + 34, duration: durVuelo, ease: "Sine.easeInOut" });
      this.time.delayedCall(durVuelo + 80, cerrar);
      return;
    }
    /* HAY PELIGRO: el rival se LANZA al corte — medio segundo de suspenso antes de saber */
    const F = this.BAL.feel || {};
    const silencio = F.silencio_ms || 500;
    const tMedio = Math.round(durVuelo * 0.55);
    const wM = { x: (wA.x + wB.x) / 2, y: (wA.y + wB.y) / 2 };
    this.materializarDuelo(cortador, true);
    if (this.sprDuelo) {
      const desde = this.aRender(cortador.x, cortador.y);
      this.sprDuelo.setPosition(desde.x, desde.y);
      this.tweens.add({ targets: this.sprDuelo, x: wM.x + (win ? 26 : 0), y: wM.y + 6, duration: tMedio + 480, ease: "Quad.easeIn" });
    }
    this.tweens.add({ targets: bola, x: wM.x, y: wM.y + 30, duration: tMedio, ease: "Sine.easeIn" });
    this.time.delayedCall(tMedio, () => this.musicaDuck(silencio));   // ANIME D: suspenso sin música
    /* EL MOMENTO: la pelota llega al cruce… suspenso… y recién ahí se revela */
    this.time.delayedCall(tMedio + silencio, () => {
      if (win) {
        snd && snd.whoosh(300);
        this.tweens.add({ targets: bola, x: wB.x, y: wB.y + 34, duration: Math.round(durVuelo * 0.45), ease: "Sine.easeOut" });
        if (this.sprDuelo) this.tweens.add({ targets: this.sprDuelo, alpha: 0.5, angle: 18, duration: 300 });   // se lanzó y pasó de largo
      } else {
        snd && snd.gloves();
        bola.setPosition(wM.x, wM.y + 30);
        if (this.sprDuelo && this._dueloBase) this.reproducirAnim(this.sprDuelo, this._dueloBase, "gambeta", 700);   // se la queda
      }
    });
    this.time.delayedCall(tMedio + silencio + (win ? Math.round(durVuelo * 0.45) + 60 : 420), cerrar);
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
    /* FEEL B1: NINGUNA resolución devuelve el control antes del mínimo (teatro obligatorio) */
    this.time.delayedCall((this.BAL.feel && this.BAL.feel.resolucion_min_ms) || 1600, () => {
      if (this.estado !== "RESOLUCION") return;
      this.quitarDuelo();
      this.limpiarMenu();
      this.zoomBase();
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
    if (!this.radar) return;   // Anime A: en la vista elevada no hay radar
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
    /* ANIME E: el ticker del RELATOR (una línea abajo, no tapa el juego) */
    this.tickerTxt = this.add.text(480, 520, "", { fontFamily: "monospace", fontSize: "12px", color: "#f6efdc", backgroundColor: "#0a1f13dd", padding: { x: 10, y: 4 }, align: "center", wordWrap: { width: 560 } }).setOrigin(0.5).setAlpha(0);
    this.hudLayer.add(this.tickerTxt);
    /* ANIME D: botón SONIDO de verdad (48px, PC y mobile) — mismo mute que el clásico */
    const mb = this.add.rectangle(36, 62, 48, 48, 0x0a1f13, 0.72).setStrokeStyle(2, 0xf6efdc, 0.7).setInteractive({ useHandCursor: true });
    this._muteTxt = this.add.text(36, 62, (this.SFX && this.SFX.isMuted()) ? "🔇" : "🔊", { fontSize: "22px" }).setOrigin(0.5);
    this.hudLayer.add([mb, this._muteTxt]);
    mb.on("pointerdown", (p, x, y, ev) => {
      ev && ev.stopPropagation && ev.stopPropagation(); this._uiTocado = this.time.now;
      if (!this.SFX) return;
      this.SFX.setMuted(!this.SFX.isMuted());
      this._muteTxt.setText(this.SFX.isMuted() ? "🔇" : "🔊");
    });
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
    /* Feel B3: el botón ⚡ACCIÓN pulsa cuando hay acciones disponibles */
    if (this._btnPulso) {
      const activo = this.estado === "LIBRE" && st.posesion === "mia";
      if (activo && this._btnPulso.paused) this._btnPulso.resume();
      else if (!activo && !this._btnPulso.paused) { this._btnPulso.pause(); this._btnAccionCont.setScale(1); }
    }
    /* Anime A: el ⇄ de ciclado manual solo aparece cuando defendés */
    if (this._btnCambiar) {
      const verlo = this.estado === "LIBRE" && st.posesion === "rival";
      this._btnCambiar.forEach(o => o.setVisible(verlo));
    }
    /* E6: los ÚLTIMOS 5 MINUTOS se anuncian (tictac + reloj marcado con ⏰, no solo color).
       TODO el bloque bajo el flag: apagado = reloj plano de la Etapa 5. */
    if (this.FLAGS.e6_cine) {
      if (!this._urgente && st.tiempo === 2 && st.minuto >= 85) {
        this._urgente = true;
        this.txtReloj.setColor("#c62828");
        this.SFX && this.SFX.temaUrgente && this.SFX.temaUrgente();
        if (this.FLAGS.v4_musica && this.SFX && this.SFX.musicaUrgente) this.SFX.musicaUrgente(true);   // ANIME D: tictac EN el loop
        this.avisar("⏰ ¡ÚLTIMOS MINUTOS!");
        this.relatar("urgente");
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
      if (lado !== this._ladoTema) {
        this._ladoTema = lado;
        this.SFX && this.SFX.temaPosesion && this.SFX.temaPosesion(lado);
        this.musica(lado === "rival" ? "rival" : "propia");   // ANIME D: el loop cambia con la posesión
      }
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
    if (this.FLAGS.e3_menus && p.x > 790 && p.y > (this._vista4 ? 360 : 420)) return;   // botones ⚡/⇄ (si existen)
    const w = this.cameras.main.getWorldPoint(p.x, p.y);
    /* Anime A: en la vista elevada el toque se invierte con la MISMA perspectiva
       que el dibujo (aSim) — tocás la franja del fondo y el jugador va al fondo */
    this.target = this._vista4 ? this.aSim(w.x, w.y) : { x: w.x / this.SX, y: w.y / this.SY };
  }

  /* ============================== UPDATE ============================== */
  update(time, delta) {
    const st = this.st, P = window.PampaPartido;
    /* ETAPA 5: la economía de guts corre con el flag e5_guts; apagado = tanques quietos (sandbox) */
    if (!this.FLAGS.e5_guts) { st.mios[st.ctrl].aguante = this.BAL.aguante.max; st.aguanteRival = this.BAL.aguante.max; }

    /* Feel B5: el CINE de 5 planos y la BARRA DE TIMING tienen su propio pulso */
    if (this.estado === "CINE") { this.updateViaje(delta); return; }
    if (this.estado === "ESCENA") return;   // Anime B: la viñeta corre por reloj propio
    if (this.estado === "TIMING") {
      this.dibujarTiming();
      if (this.keyEnter && Phaser.Input.Keyboard.JustDown(this.keyEnter)) this.pararAguja();
      return;
    }
    /* §9 EN SERIO: fuera de LIBRE la simulación NO corre (pausa → animación → pausa,
       estados realmente separados — si no, rivalTira/final pisan la resolución) */
    if (this.estado !== "LIBRE") {
      if (this.estado === "MENU" || this.estado === "PASE") this.teclasDeMenu();
      this.dibujarRadar();
      this.refrescarHUD();
      this.updateFichas(true);        // Anime A: pausado = DORSALES visibles
      this.dibujarPaseCancha();       // receptores del pase sobre la cancha
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
      /* FEEL B1: los cruces se ANUNCIAN con un beat de tensión ANTES del menú
         (zoom leve + riser + el rival entrando al plano) — nunca un menú de golpe */
      if (ev.tipo === "encuentro") {
        /* Feel B6: en MOMENTOS CALIENTES (cerca de su arco, con tanque) el rival puede
           venir con una MEGACOSA — decidido por la situación del duelo, no azar puro */
        this._megaRival = null;
        const F6 = this.BAL.feel || {};
        if (this.FLAGS.e6_cine && st.mios[st.ctrl].x > (F6.mega_x_caliente || 700)) {
          const defs = ((this.MEGA && this.MEGA.megadefensas) || []).filter(m => (m.tipo === "quite" || m.tipo === "bloqueo") && st.aguanteRival >= (m.guts || 250));
          if (defs.length) {
            const semilla = ((st.golesMio + st.golesRival) * 7 + Math.floor(st.minuto * 10)) % 100;
            if (semilla / 100 < (F6.mega_prob_caliente || 0.45)) this._megaRival = defs[semilla % defs.length];
          }
        }
        this.beatDeTension(st.rivales[ev.rivalIdx], true, null, () => this.abrirMenuAtaque(ev.rivalIdx, false));
      }
      else if (ev.tipo === "encuentroDef") this.beatDeTension(st.mios[st.ctrl], false, null, () => this.abrirMenuDefensa());
      else if (ev.tipo === "rivalTira") {
        if (this.FLAGS.e3_menus) {
          const arq = st.mios.find(j => j.pos === "ARQ");
          this.beatDeTension(arq, false, "keeper_mio", () => this.abrirMenuArquero());
        }
        else { const res = P.resolverAtajada(st, Math.random() < 0.5 ? "atajar" : "despejar"); aviso = res.golRival ? "GOL DE " + this.nombreRival : "¡La sacó tu arquero!"; }
      }
      else if (ev.tipo === "entretiempo") { P.entretiempo(st); this.transicionEntretiempo(); this.relatar("entretiempo"); aviso = "ENTRETIEMPO — saca " + this.nombreRival; }
      else if (ev.tipo === "final") this.finDelPartido();
    }

    /* el portador (y SOLO él) se dibuja; si la pelota cambió de dueño, corte de plano */
    this.seguirPortador();
    const p = this.portadorActual();
    const wr = this.aRender(p.j.x, p.j.y);
    const wx = wr.x, wy = wr.y;
    const corriendo = (!p.esRival && !!input) || (p.esRival && st.esperaRival <= 0);
    if (this._esHeroico) {
      /* Feel B7: ciclo de correr de 6 FRAMES + escala por profundidad */
      const esCorrer = this._animIdle === "_correr_";
      const nF = esCorrer ? 6 : 4;
      const f = corriendo ? Math.floor(time / 95) % nF : (esCorrer ? 2 : 1);
      this.sprPortador.setTexture(this._base + this._animIdle + f).setScale(this._escalaBase * this.escalaEn(p.j.y));
      /* la pelota PEGADA AL PIE con su propio rebote (sigue el ciclo de la corrida) */
      this._botePelota = corriendo && !p.esRival ? [0, 4, 6, 0, 4, 6][f] || 0 : 0;
      if (corriendo) this.sprPelota.rotation += 0.18;
      /* ESTELAS + LÍNEAS DE VELOCIDAD cuando corre A FONDO (>600ms sostenido) */
      if (corriendo) {
        if (!this._corriendoDesde) this._corriendoDesde = time;
        const u = this._trail[this._trail.length - 1];
        if (!u || Math.hypot(wx - u.x, wy - u.y) > 14) { this._trail.push({ x: wx, y: wy + 34 }); if (this._trail.length > 6) this._trail.shift(); }
      } else { this._trail.length = 0; this._corriendoDesde = 0; }
      const tg = this.trailG; tg.clear();
      for (let i = 1; i < this._trail.length; i++) {
        tg.lineStyle(3, 0xffffff, 0.08 + 0.3 * (i / this._trail.length));
        tg.beginPath(); tg.moveTo(this._trail[i - 1].x, this._trail[i - 1].y); tg.lineTo(this._trail[i].x, this._trail[i].y); tg.strokePath();
      }
      if (corriendo && this._corriendoDesde && time - this._corriendoDesde > 600) {
        /* a fondo: ráfagas horizontales detrás del héroe (anime puro) */
        for (let k = 0; k < 3; k++) {
          const ly = wy - 24 + k * 22, lx = wx - 34 - (k % 2) * 10;
          tg.lineStyle(2, 0xffffff, 0.35 - k * 0.08);
          tg.beginPath(); tg.moveTo(lx, ly); tg.lineTo(lx - 26 - (time / 40 % 12), ly); tg.strokePath();
        }
      }
    } else {
      this.sprPortador.setPosition(wx, wy)
        .setTexture(this._base + (corriendo && Math.floor(time / 110) % 2 ? "_run" : "_idle"));
    }
    this.sprPortador.setPosition(wx, wy);
    const wb = this.aRender(st.pelota.x, st.pelota.y);
    this.sprPelota.setPosition(wb.x, wb.y + 34 - (this._botePelota || 0)).setScale(1.6 * this.escalaEn(st.pelota.y));
    this.marker.setText("▼ " + (p.j.esVos ? "VOS" : (p.j.nombre || "").toUpperCase().slice(0, 10)))
      .setPosition(wx, wy - 62);
    /* Feel B8: el tema del avance crece al CRUZAR al campo rival (con la pelota) */
    if (this.FLAGS.e6_cine && st.posesion === "mia") {
      const zona = st.mios[st.ctrl].x > st.W / 2 ? "rival" : "propio";
      if (zona !== this._zonaTema) { this._zonaTema = zona; this.SFX && this.SFX.temaCampo && this.SFX.temaCampo(zona); }
    }
    /* pan vivo: mientras dura el corte, el destino persigue al portador real */
    const cam = this.cameras.main;
    if (this._panVivo && cam.panEffect.isRunning) cam.panEffect.destination.set(wx, wy);
    if (aviso) this.avisar(aviso);

    /* ETAPA 2: radar + HUD, siempre al día (Anime A: fichas en lugar de radar) */
    this.dibujarRadar();
    this.refrescarHUD();
    this.updateFichas(false);
    this.dibujarPaseCancha();
  }

  /* aviso breve anclado al PORTADOR (a donde la cámara va, no de donde viene) */
  avisar(txt) {
    const fs = this._vista4 ? 24 : 12;   // texto del mundo: legible también en la vista elevada
    const t = this.add.text(this.sprPortador.x, this.sprPortador.y - 96, txt, { fontFamily: "monospace", fontSize: fs + "px", color: "#f6efdc", backgroundColor: "#0a1f13dd", padding: { x: 8, y: 4 }, align: "center" })
      .setOrigin(0.5).setDepth(5000);
    this.mundoLayer.add(t);
    if (this.uiCam) this.uiCam.ignore(t);   // hijo dinámico: re-ignorar a mano
    this.tweens.add({ targets: t, alpha: 0, delay: 2200, duration: 500, onComplete: () => t.destroy() });
  }
};
