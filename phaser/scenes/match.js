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
   animaciones y falsa perspectiva (Etapa 4) · economía de aguante (Etapa 5) ·
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
    /* P4 · LOS DE LA TRIBUNA TIENEN CARA. Nelda y el Tuli salían con un
       borrón oscuro dibujado a mano (un fillCircle marrón) que en pantalla se
       leía como un rectángulo vacío. El retrato lo declara data/tribuna.json
       en el campo `retrato` de cada personaje, así que cambiarlo es cambiar
       una línea de JSON, no tocar código. */
    const tri = this.game.registry.get("tribuna");
    if (tri && Array.isArray(tri.personajes)) {
      tri.personajes.forEach((p) => {
        if (p && p.retrato) this.load.image("tribuna_" + p.id, "../" + p.retrato);
      });
    }
    /* V6 §3.2: las POSES ILUSTRADAS del manifest — fallback tolerante: se carga
       lo que exista; lo que falte cae al sprite heroico de código, nada crashea */
    const poses = this.game.registry.get("poses");
    if (poses && poses.poses) {
      const base = poses.base || "assets/poses/";
      Object.keys(poses.poses).forEach(id => {
        const p = poses.poses[id];
        /* W2 · `cargar: false` = la pieza esta en el repo pero el juego NO la
           pide. Es la diferencia entre GUARDADA y CARGADA: guardada no cuesta
           nada, cargada cuesta ancho de banda en cada arranque. Cuando una
           encuentra su lugar se le pone cargar:true y ya. */
        if (p && p.cargar === false) return;
        if (p && p.archivo) this.load.image("pose_" + id, "../" + base + p.archivo);
        /* TANDA DE ARTE A3: los cuadros del CICLO (si el manifest los declara).
           Sin "ciclo" no cambia nada: se usa la pose quieta de siempre. */
        if (p && p.ciclo && p.ciclo.cuadros) p.ciclo.cuadros.forEach((f, k) => {
          this.load.image("pose_" + id + "_c" + k, "../" + base + f);
        });
      });
      /* A4: las siluetas de la tribuna viven en su propio bloque del manifiesto,
         no en `poses`, así que hay que pedirlas aparte. */
      const H = poses.hinchada;
      if (H && Array.isArray(H.siluetas)) H.siluetas.forEach((sil) => {
        if (sil && sil.archivo) this.load.image("pose_" + sil.id, "../" + (H.base || base) + sil.archivo);
      });
      /* ARTE 2: los fondos del manifest (la tribuna detrás del arco) */
      if (poses.fondos) Object.keys(poses.fondos).forEach(id => {
        const f = poses.fondos[id];
        if (f && f.archivo) this.load.image("fondo_" + id, "../" + base + f.archivo);
      });
      /* EDITOR v2: los 8 bustos ilustrados (para duelos y cut-ins, teñidos) */
      const CM = this.game.registry.get("caras");
      if (CM && CM.caras) {
        const baseC = CM.base || "assets/poses/caras/";
        CM.caras.forEach(c => {
          if (c.archivo && !this.textures.exists("cara_" + c.id)) this.load.image("cara_" + c.id, "../" + baseC + c.archivo);
        });
      }
      this.load.on("loaderror", (file) => { /* el fallback del poseSprite cubre el hueco */ });
    }
    /* V7-1 §3: las IDENTIDADES de corrida — manifest propio, cargado acá mismo
       (el loader acepta encolar imágenes al completarse el json); fallback
       tolerante: sin manifest/archivo, el panel usa pose_corriendo */
    this.load.json("identidades_man", "../data/identidades_manifest.json");
    this.load.on("filecomplete-json-identidades_man", (k, t, man) => {
      if (!man || !Array.isArray(man.identidades)) return;
      this._identMan = man;
      const baseI = man.base || "assets/poses/identidades/";
      man.identidades.forEach(d => {
        if (d && d.id && d.archivo) this.load.image("ident_" + d.id, "../" + baseI + d.archivo);
      });
    });
  }

  init() {
    this.BAL = this.game.registry.get("balance");
    this.SFX = window.PampaSFX;
    /* FEATURE FLAGS por etapa (regla de la sesión): se apagan desde balance.json → flags.
       Apagado = comportamiento de la etapa anterior. partido_phaser (fusión) vive en la Etapa Final. */
    this.FLAGS = Object.assign({ e3_menus: true, e4_arte: true, e5_guts: true, e6_cine: true, v4_vista: true, v4_escenas: true, v4_musica: true, v4_relator: true, v4_aereo: true, v4_retratos64: true, v6_tempo: true, v6_definicion: true, v6_secuencias: true, pantalla_partida: true, pulso: true }, this.BAL.flags || {});
    /* ANIME v4 Bloque A: VISTA TÁCTICA ELEVADA (flag v4_vista; apagado = cámara v2).
       La cámara sube a ver la cancha, los 22 son fichas simples, el radar sobra. */
    this._vista4 = !!this.FLAGS.v4_vista;
    this.VI = this.BAL.vista || {};
    /* V7-1: PANTALLA PARTIDA — arriba la escena, abajo el mapa. La ceguera MURIÓ:
       la reemplaza la IMPRECISIÓN del rival en el mapa (retardo + ruido). */
    this._split = !!this.FLAGS.pantalla_partida;
    this._ceguera = false;
    this._imprec = null;
    this._panelReveal = null;
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
    this._hudMarc = this._hudReloj = this._hudGuts = this._hudEnvion = null;   // caches del HUD: el restart los recrea vacíos
    this._btnEnvion = null;
    this.fichasMios = this.fichasRiv = null;                 // Anime A: las fichas mueren con la escena
    this.ringG = this.paseG = null; this._btnCambiar = null;
    this._escSkip = null; this._velRapida = false;           // V6 R4: skip y velocidad, limpios por partido
    this._cineSkip = null; this._cineSaltado = false; this._cineTimer = null;   // V7 §1: skip del cine de 5 planos
    this._colorMapaMio = null;                               // V7 fix: el tono del mapa se recalcula por partido
    this._pulsoAcum = 0; this._pulsoMovioHasta = 0;          // V8 §1: el acumulador del latido, limpio por partido
    this._panelFlip = false;                                 // V8 §3: la memoria del flip del panel
    this._hudFichas = null; this.txtFichas = null;           // V8 §3: las fichas del jugadón, limpias por partido
    this._jg = null; this._jgLogica = null;                  // V8 §3: la plataforma muere con la escena
    this._def = null;                                        // V6 §4: LA DEFINICIÓN muere con la escena
    this._cartas = null;                                     // D1: las cartas arrancan todas listas cada partido
    this.panelLayer = this.panelJug = this.panelPasto = this.panelTribuna = null;   // V7-1: el panel muere con la escena
    this.panelSil = null; this._panelPrev = null;
    /* ══════════════════════════════════════════════════════════════════
       P1 · EL BUG DEL SEGUNDO PARTIDO DE LA CARRERA.

       Phaser NO crea una escena nueva en cada `scene.start("match")`: reusa
       la MISMA instancia y solo vuelve a correr init() y create(). Todo campo
       que se escriba durante el partido y no se reinicie acá llega prendido al
       partido siguiente — y se queda prendido para el resto de la carrera.

       Eso mataba la fecha 2 del Modo Master: `_finalApagado` se prende al
       terminar el partido (PIEL P9, para que el mapa no se repinte encima de
       la pantalla de final) y nunca se apagaba. En la fecha 2 `dibujarRadar()`
       salía por esa guarda en el primer renglón y el mapa quedaba VACÍO para
       siempre: sin cancha, sin jugadores y sin la etiqueta "◄ TU ARCO".
       Reproducido jugando la fecha 1 entera y entrando a la 2.

       Las cuatro son BANDERAS, no objetos: los objetos los recrea create(),
       las banderas no las recrea nadie. El guardián c4_estado_limpio.test.js
       verifica que no aparezca una quinta.
       ══════════════════════════════════════════════════════════════════ */
    this._finalApagado = false;      // el mapa vuelve a dibujarse (ESTE era el bug)
    this._medidoresOcultos = null;   // cache de visibilidad de AGUANTE/ENVIÓN
    this._panVivo = false;           // si el partido terminó a mitad de un paneo
    this._esHeroico = false;         // qué clase de sprite es el portador

    /* Y una REFERENCIA, que es la otra mitad del mismo bug. `_radarTuArco` se
       crea perezoso: `if (!this._radarTuArco) this._radarTuArco = this.add.text(...)`.
       El texto muere con la escena anterior, pero la referencia sobrevive al
       scene.start(): la guarda da falso, no lo recrea, y el frame siguiente le
       manda setText() a un objeto DESTRUIDO. Crash por frame desde el segundo
       partido — el update entero del partido se cae ahí.
       Visto en vivo: active=false, scene=null, y fuera del hudLayer. */
    this._radarTuArco = null;
    this._poseForzada = null;        // P3: la pose del trámite no cruza de partido
    this._tramitesMudos = 0;         // P3: cuántas acciones quedaron sin verse
    this._tramiteMudoUltimo = null;
    this._musicaTrabada = false;     // P5: el partido nuevo vuelve a tener música
    this._temaFinalPuesto = false;   // M5: el tema de urgencia entra una vez por partido
    this._temaFinalMin = null;
  }

  create() {
    window.PampaSprites(this);
    /* A5 · ACA Y NO DESPUES. PampaSprites acaba de generar la textura "ball"
       (el circulo con gajos) y todavia no hay NINGUN sprite usandola: este es
       el unico momento en que se la puede reemplazar sin dejar a un sprite
       apuntando a una textura muerta. Puesta mas abajo, el panel ya tenia su
       pelota creada y el render explotaba con "glTexture of null". */
    this.pelotaVieja();
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
    if (this._pedido && this._pedido.rival) this.nombreRival = this.nombreCorto(this._pedido.rival);
    /* Feel B5: MEGACOSAS de data (nombres pampeanos, costo, nivel) + nivel de carrera */
    this.MEGA = this.game.registry.get("megacosas") || {
      megatiros: [{ id: "calden", n: "Disparo del Caldén", grito: "¡CALDENAZO!", sub: "la fuerza del árbol eterno", aguante: 300, nivel: 1, mult: 1.3, x_min: 680 }],
      megadefensas: []
    };
    /* EL NIVEL. Antes: `if (c && c.nivel)` sobre el save del clasico, que no
       guarda ese campo — la asignacion no corria nunca y el nivel quedaba en 1,
       matando los dos megatiros altos, las tres megadefensas y las secuencias.
       Ahora el Master lo manda por el registry y el clasico lo CALCULA. */
    this._nivelCarrera = 1;
    {
      const mp0 = this.game.registry.get("masterPartido");
      const Ma0 = window.PampaMaster;
      if (mp0 && mp0.nivel) this._nivelCarrera = mp0.nivel | 0;
      else if (Ma0) {
        try {
          const c = JSON.parse(localStorage.getItem("pampa_star_v1"));
          if (c) this._nivelCarrera = Ma0.nivelDeCarreraClasica(c);
        } catch (e) { }
      }
    }
    /* V7 §2: si venimos del MODO MASTER, el rival y la división los manda la
       carrera (fecha real del fixture) — pisa al pedido del clásico */
    this._masterPartido = this.game.registry.get("masterPartido") || null;
    if (this._masterPartido && this._masterPartido.rival) {
      this.nombreRival = this.nombreCorto(this._masterPartido.rival);
      this._pedido = null;   // la carrera Phaser manda; el puente clásico no aplica acá
    }
    /* V6 §8 MODO MASTER: dificultad FIJA por división + perfil de IA por rival
       (flag v6_master; sin carrera Phaser, la división sale del nivel del clásico) */
    this._division = null;
    if (this.FLAGS.v6_master !== false && window.PampaMaster) {
      const Ma = window.PampaMaster;
      this._division = (this._masterPartido && Ma.DIVISIONES.find(d => d.id === this._masterPartido.division))
        || Ma.divisionPorNivel(this._nivelCarrera);
      this._perfilRival = Ma.perfilRival(this.nombreRival);
      Ma.aplicar(this.st, this._division, this._perfilRival);
    }
    /* V8 A1 · LA VIDA: el ORIGEN (stats de por vida) y el MODIFICADOR de ESTA
       fecha (lo que pasó en la semana). Chicos a propósito: dan sabor. */
    this._vidaFicha = null;
    if (this._masterPartido) {
      const vos = this.st.mios.find(j => j.esVos) || this.st.mios[this.st.ctrl];
      const or = this._masterPartido.origen;
      if (or && or.stats && vos && vos.stats) {
        Object.keys(or.stats).forEach(k => { if (vos.stats[k] != null) vos.stats[k] = Phaser.Math.Clamp(vos.stats[k] + or.stats[k], 20, 99); });
      }
      const md = this._masterPartido.mod;
      if (md && md.mod) {
        const M = md.mod, A = this.BAL.aguante;
        if (M.aguante) this.st.mios.forEach(j => { j.aguante = Phaser.Math.Clamp(j.aguante + M.aguante, 60, A.max); });
        if (M.envion) this.st.envion = Phaser.Math.Clamp((this.st.envion || 0) + M.envion, 0, (this.BAL.envion && this.BAL.envion.max) || 100);
        /* el efecto keeper escribia en stats.quite, un campo que NO EXISTE en
           el esquema de stats y que nadie lee para el arquero (su poder sale de
           fisico*0.7 + caracter*0.4). Ahora viaja en st.modVida y lo suma
           opcionesArquero, que es quien decide la atajada. */
        ["tiro", "pase", "gambeta", "fisico", "caracter"].forEach(k => {
          if (M[k] && vos && vos.stats && vos.stats[k] != null) vos.stats[k] = Phaser.Math.Clamp(vos.stats[k] + M[k], 20, 99);
        });
        /* el modificador VIAJA POR EL ESTADO: asi lo lee la logica pura y se
           puede simular en node. duelo y arranque/final entran al poder de tus
           acciones y de las cuatro vias de remate; recuperacion multiplica tu
           regeneracion; keeper va al poder de tu arquero. */
        /* `this._modVida` ya no existe: era la copia de escena que solo leia
           tiroPorComandos. Al mover el efecto a la logica pura se quedo escrita
           y sin lector — o sea, el mismo patron, esta vez creado por el propio
           arreglo. Lo cazo el guardian de desconectados.test.js. */
        this.st.modVida = M;
        this._vidaFicha = md.frase || "";
      }
      /* ============ LA VIDA v2 · CÓMO LLEGÁS DE LA SEMANA ============
         Lo que hiciste de lunes a viernes se siente en la cancha: la ENERGÍA
         que te quedó es tu aguante inicial, el ÁNIMO es el envión con el que
         arrancás y cuánto mejor leés los duelos. Esto NO reemplaza el aguante
         que se gasta jugando: define desde dónde arrancás. */
      const sem = this._masterPartido.semana;
      if (sem) {
        const A = this.BAL.aguante;
        const vos2 = this.st.mios.find(j => j.esVos);
        if (vos2) vos2.aguante = Phaser.Math.Clamp(sem.aguanteInicial || A.max, 60, A.max);
        this.st.envion = Phaser.Math.Clamp(sem.envionInicial || 0, 0, (this.BAL.envion && this.BAL.envion.max) || 100);
        this._lecturaSemana = sem.lectura || 0;      // ±5 a la lectura de los duelos
        this._semanaResumen = sem.resumen || "";
      }
      /* las mejoras permanentes de las semanas jugadas (chiquitas, acumuladas) */
      const mej = this._masterPartido.mejoras;
      if (mej && vos && vos.stats) {
        Object.keys(mej).forEach(k => {
          if (k === "azar") return;
          if (vos.stats[k] != null) vos.stats[k] = Phaser.Math.Clamp(vos.stats[k] + mej[k], 20, 99);
        });
        if (mej.resistencia) this.st.mios.forEach(j => { if (j.esVos) j.aguanteMax = (j.aguanteMax || this.BAL.aguante.max) + mej.resistencia * 4; });
      }
    }

    /* capa de MUNDO (cancha + portador): la ve solo la cámara principal con zoom;
       capa de HUD (radar + marcador + aguante) y capa de MENÚ: solo la cámara de UI fija */
    this.mundoLayer = this.add.container(0, 0);
    this.hudLayer = this.add.container(0, 0);
    this.menuLayer = this.add.container(0, 0);
    this.cineLayer = this.add.container(0, 0).setVisible(false);   // Feel B5: el CINE de 5 planos (pantalla fija)

    this.buildCancha();
    this.buildPortador();
    if (!this.FLAGS.pantalla_partida) this.buildFichas();   // V7-1: el mundo no se dibuja

    /* --- LA CÁMARA (Anime v4 §0: ELEVADA para navegar; la épica vive en las escenas) ---
       v4_vista ON: zoom que muestra la cancha (cobertura afinable) + scroll suave mínimo.
       OFF: la cámara cinematográfica v2 exacta (zoom 2.2 pegada al portador). */
    this._zoomBase = this._vista4
      ? Math.max(960 / this.V2.MUNDO_W, 540 / this.V2.MUNDO_H) / (this.VI.cobertura || 0.85)
      : this.V2.ZOOM;
    const cam = this.cameras.main;
    /* PIEL P1: el marco del partido deja de ser verde plano. El radial va al
       fondo de todo (depth -10000); la cancha y el pasto se dibujan encima y
       conservan su verde, que es campo de juego y no se toca. */
    cam.setBackgroundColor(this.piel().fondo_borde);
    this.fondoDePiel();
    cam.setBounds(0, 0, this.V2.MUNDO_W, this.V2.MUNDO_H);
    const lerp = this._vista4 ? (this.VI.lerp || 0.08) : this.V2.LERP;
    cam.startFollow(this.sprPortador, true, lerp, lerp);
    cam.setDeadzone(this._vista4 ? (this.VI.deadzone_w || 60) : this.V2.DEADZONE_W, this._vista4 ? (this.VI.deadzone_h || 40) : this.V2.DEADZONE_H);
    cam.setZoom(this._zoomBase);
    cam.roundPixels = true;       // scroll sin temblor (equivale al roundPixels del config, sin tocar index.html)

    /* --- V7-1 PANTALLA PARTIDA: el mundo estilo simulador moderno se APAGA; arriba vive el
       panel de ESCENA (ilustración con parallax) y abajo EL MAPA grande, que
       es la superficie de navegación principal. --- */
    if (this._split) {
      this.mundoLayer.setVisible(false);
      this.buildPanelEscena();
      this.children.sendToBack(this.panelLayer);
      cam.ignore(this.panelLayer);
    }
    /* --- ETAPA 2: RADAR + HUD en cámara fija (doc §3/§4) ---
       V6 §1 F1: el radar VUELVE siempre. En pantalla partida es EL MAPA:
       grande, con los dos equipos, y ahí se corre y se apunta. --- */
    this.buildRadar();
    this.buildHUD();
    /* N1: la franja de la tribuna se monta con el HUD y arranca invisible */
    if (window.PampaTribunaUI) window.PampaTribunaUI.montar(this);
    this.buildBotonAccion();
    this.buildCineBase();
    /* P5: si balance.musica.archivos declara rutas, esos temas pasan a sonar
       de archivo y el chiptune se calla para ellos. Vacio = todo sintetizado. */
    /* M3 · el registro es global y una sola vez, no por escena (ver abajo) */
    this.registrarMusicaGlobal();
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
      /* V6 R4 · SKIP: un toque durante la escena adelanta al desenlace */
      if (this.estado === "ESCENA") { this._escSkip && this._escSkip(); return; }
      /* V7 §1: el cine de 5 planos del megatiro también se saltea con un toque */
      if (this.estado === "CINE") { this._cineSkip && this._cineSkip(); return; }
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
      { fontFamily: window.PF.texto, fontSize: Math.round(11 * this._fsMundo) + "px", color: "#f6efdc", backgroundColor: "#0a1f13cc", padding: { x: 6, y: 3 } }).setOrigin(0.5).setDepth(5000);
    this.mundoLayer.add(hint);
    this.uiCam.ignore(hint);   // el ignore del container no cubre hijos agregados después
    this.tweens.add({ targets: hint, alpha: 0, delay: 4000, duration: 600, onComplete: () => hint.destroy() });

    /* V6 §2 R4: ANTES del partido se elige el TEMPO (presets) y la VELOCIDAD.
       Al confirmar, sigue el tutorial de 3 pasos si hace falta. */
    this.menuTempoSiCorresponde();

    /* flag v4_vista APAGADO = comportamiento v2 exacto: también sin cambio automático */
    if (!this._vista4) this.st._noAutoHasta = 9e15;

    /* ANIME D + ADDENDUM B: la dirección musical llega de balance → el motor */
    if (this.SFX && this.SFX.configurarMusica) this.SFX.configurarMusica(this.BAL.musica);
    /* ══════════════════════════════════════════════════════════════════════
       LA ENTRADA A LA CANCHA. "Under the Floodlights" es de UNA PASADA (no
       hace loop): es el tema de salir del túnel, no el del partido.

       Estuvo declarado, con archivo en disco, y NO LO PEDÍA NADIE — lo encontró
       la enumeración de M4, no una lectura del código. Primero lo puse en el
       master, al apretar A LA CANCHA, y ahí se veía el error: el cambio de
       escena lo cortaba a los dos cuadros. Va acá, donde tiene lugar para
       sonar, y cuando termina entra el tema del partido.

       El corte lo maneja alTerminarMusica, que trae su propio tope por si el
       navegador no deja reproducir sin gesto. */
    const msEntrada = (this.BAL.musica && this.BAL.musica.entrada_ms != null)
      ? this.BAL.musica.entrada_ms : 11000;
    if (msEntrada > 0 && this.SFX && this.SFX.alTerminarMusica && this.pedirMusica("entrada")) {
      this.SFX.alTerminarMusica(() => {
        if (this.scene && this.scene.isActive()) this.pedirMusica("partido");
      }, msEntrada);
    } else {
      this.pedirMusica("partido");
    }

    /* ANIME E: EL RELATOR — el partido se cuenta solo (data/relatos.json → relator) */
    this.REL = (this.FLAGS.v4_relator && window.PampaRelator)
      ? window.PampaRelator.crear(this.game.registry.get("relatos") || {}, {})
      : null;
    this.relatar("saque", { rival: this.nombreRival });
    /* §8: el rival tiene identidad — que se sepa a qué juega */
    if (this._perfilRival) this.avisar("⚔ " + this.nombreRival + " juega " + this._perfilRival.n);
  }
  /* el ticker del relator: una frase por vez, en su franja, sin tapar el juego.
     V9 §8 · LA COLA: el HUD se apaga durante el cine, la Definición y el
     Jugadón. Las frases emitidas ahí se escribían sobre una capa invisible y
     se consumían solas — la jugada de peligro, en la práctica, NUNCA se veía.
     Ahora si la capa está apagada la frase ESPERA y sale cuando vuelve. */
  relatar(situacion, ctx) {
    /* N1 · LOS DOS DE LA TRIBUNA. Se enganchan acá, al mismo evento que el
       relator, porque es el único lugar donde el partido ya avisa que pasó
       algo. Pero NO dicen lo mismo: el relator le habla al que juega y estos
       dos se hablan entre ellos. El mapa traduce las claves del relator a las
       de la tribuna; las que no están, no se comentan (mejor callarse que
       decir cualquier cosa). */
    if (window.PampaTribunaUI && this._tribuna) {
      const MAPA = {
        gol: "gol", gol_rival: "gol_rival", atajada: "atajada", arquero_mio: "atajada",
        quite_win: "quite", corte: "quite", gambeta_lose: "error", afuera: "error",
        final: (this.st && this.st.golesMio > this.st.golesRival) ? "resultado_gana"
          : (this.st && this.st.golesMio < this.st.golesRival) ? "resultado_pierde" : "empate",
        urgente: (this.st && this.st.golesMio > this.st.golesRival) ? "ganando_final"
          : (this.st && this.st.golesMio < this.st.golesRival) ? "perdiendo_final" : "empate"
      };
      const ev = MAPA[situacion];
      if (ev) window.PampaTribunaUI.comentar(this, ev);
    }
    if (!this.REL) return;
    const c = Object.assign({ rival: this.nombreRival, pueblo: this._puebloMio || "La Pampa" }, ctx || {});
    if (!c.jugador) { const j = this.st && this.st.mios[this.st.ctrl]; c.jugador = j ? (j.esVos ? "VOS" : j.nombre) : "el pibe"; }
    if (!this.tickerTxt) return;
    const f = this.REL.frase(situacion, c);
    if (!f) return;
    if (this.hudLayer && !this.hudLayer.visible) { this._relPendiente = f; return; }
    this._pintarRelato(f);
  }
  _pintarRelato(f) {
    if (!this.tickerTxt) return;
    const R = this.BAL.relator || {};
    this.tweens.killTweensOf(this.tickerTxt);
    this.tickerTxt.setText("🎙 " + f).setAlpha(1);
    this.tweens.add({ targets: this.tickerTxt, alpha: 0, delay: R.hold_ms || 2800, duration: R.fade_ms || 500 });
  }
  /* lo llama el update cuando el HUD vuelve: la frase guardada sale ahí */
  soltarRelatoPendiente() {
    if (!this._relPendiente || !this.hudLayer || !this.hudLayer.visible) return;
    const f = this._relPendiente; this._relPendiente = null;
    this._pintarRelato(f);
  }
  /* helpers de música (flag v4_musica; el mute vive en SFX, compartido con el clásico) */
  /* ══════════════════════════════════════════════════════════════════════
     P5 · LA MÚSICA CORTA AL TERMINAR, Y NO VUELVE.

     finDelPartido() ya llamaba a musica(null), pero la música seguía igual:
     el update sigue corriendo con el partido terminado y el cambio de portador
     vuelve a llamar musica("propia"/"rival") en cuanto cambia el lado. O sea
     que se apagaba y se volvía a prender sola.

     El arreglo es una TRABA, no un parche en el llamador: con el partido
     terminado esta función no deja pasar nada que no sea el silencio. Así da
     igual quién la llame ni desde dónde.
     ══════════════════════════════════════════════════════════════════════ */
  /* M2 · SE FUE this.musica(). Era la segunda puerta: la que tenía el mapa
     nuevo y la traba, mientras la intro, la definición y el jugadón llamaban a
     SFX.musicaTema() directo y caían al sintetizador. Ahora hay UNA sola,
     pedirMusica(), en el mixin de piel_ui, y la usan las cuatro escenas.
     La traba del final del partido se mudó ahí adentro. */

  /* el cierre: un motivo corto y después el silencio de vestuario. La duración
     sale de balance.musica.final_ms; en 0 corta seco. */
  /* P5 · engancha balance.musica.archivos con el reproductor. Se llama al
     armar el partido: si no hay ninguna ruta declarada, no hace nada y todo
     sigue sintetizado como hasta ahora. */
  /* ══════════════════════════════════════════════════════════════════════
     M3 · SE FUERON mapaDeAudio() Y registrarMusicaDeArchivo() (48 líneas).

     Esta era LA ÚLTIMA PUERTA que quedaba abierta, y la peor, porque no fallaba
     sola: pisaba a la otra. El partido armaba su PROPIO mapa de momentos y lo
     registraba en create(). Ese mapa tenía ocho entradas y no tenía ni
     "definicion" ni "jugadon".

     Como registrarArchivos() REEMPLAZA el registro entero, cada vez que
     arrancaba un partido borraba los doce temas que había puesto la puerta
     global y dejaba ocho. Después entrabas al pasillo, pedía "definicion", no
     estaba registrado... y sonaba el sintetizador. Con M2 solo, el pasillo
     seguía roto: la llamada era correcta y el archivo no estaba.

     Ahora el mapa vive en un solo lado — phaser/logic/musica.js, que es lógica
     pura y se puede correr en node — y el registro es GLOBAL y una sola vez
     (registrarMusicaGlobal, en el mixin de piel_ui). Las cuatro escenas piden
     por nombre de momento y ninguna arma mapas.

     La alternancia por fecha par/impar se mudó tal cual a musica.js.
     ══════════════════════════════════════════════════════════════════════ */
  /* ══════════════════════════════════════════════════════════════════════
     M5 · EL TRAMO FINAL. "Last Ten Seconds" entra en el final del segundo
     tiempo, o antes si vas perdiendo — que es cuando la urgencia es tuya y no
     del reloj. Los dos umbrales son perillas de balance.musica.

     Se llama desde el update; la guarda _temaFinalPuesto hace que entre UNA
     vez y no en cada cuadro.
     ══════════════════════════════════════════════════════════════════════ */
  chequearTramoFinal() {
    if (this._temaFinalPuesto || this._musicaTrabada) return;
    if (!(this.SFX && this.SFX.hayArchivo && this.SFX.hayArchivo("partido_final"))) return;
    const st = this.st; if (!st) return;
    if ((st.periodo | 0) < 2 && st.minuto < 45) return;    // solo en el segundo tiempo
    const M = this.BAL.musica || {};
    const perdiendo = st.golesMio < st.golesRival;
    const umbral = perdiendo ? (M.final_perdiendo_min != null ? M.final_perdiendo_min : 62)
                             : (M.final_tramo_min != null ? M.final_tramo_min : 78);
    if (st.minuto < umbral) return;
    this._temaFinalPuesto = true;
    this._temaFinalMin = +st.minuto.toFixed(1);
    this.pedirMusica("partido_final");
  }

  cerrarMusica() {
    this._musicaTrabada = true;
    const M = this.BAL.musica || {};
    const ms = M.final_ms != null ? M.final_ms : 2600;
    if (ms > 0 && this.SFX && this.SFX.musicaTema) {
      /* el tema de cierre: si hay uno declarado suena, si no baja el volumen */
      /* M2 · el cierre: el festejo suena una vez y después el silencio de
         vestuario. Antes pedía "final", que no existía en el mapa. */
      this._musicaTrabada = false;
      this.pedirMusica("gol_festejo");
      this._musicaTrabada = true;
      this.time.delayedCall(ms, () => {
        this._musicaTrabada = false;
        this.pedirMusica("silencio");
        this._musicaTrabada = true;
      });
    } else {
      this._musicaTrabada = false;
      this.pedirMusica("silencio");
      this._musicaTrabada = true;
    }
  }
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
  /* ============ V9 §10 · EL CAMBIO DE LADO ============
     En el segundo tiempo los equipos se dan vuelta. La SIMULACIÓN no se toca
     (seguís atacando a +x: la IA de los 21, los 17 umbrales de partido.js,
     el Jugadón y la Definición quedan intactos, y con ellos sus tests): lo que
     se espeja es el RENDER. fx() es el único punto de verdad y lo usan aRender,
     aSim y el radar — si se espejara solo uno, el pase tocado en el mapa iría
     al lado equivocado. */
  fx(jx) { return (this.st && this.st.ladoVisual === 2) ? this.st.W - jx : jx; }
  aRender(jx, jy) {
    jx = this.fx(jx);
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
    this.marker = this.add.text(0, 0, "▼ VOS", { fontFamily: window.PF.texto, fontSize: fsM + "px", color: "#ffffff", stroke: "#0a1f13", strokeThickness: this._vista4 ? 6 : 4 })
      .setOrigin(0.5).setDepth(12);
    this.trailG = this.add.graphics().setDepth(8);   // estelas de velocidad (E4)
    this._trail = [];
    this.mundoLayer.add([this.trailG, this.sprPortador, this.sprPelota, this.marker]);
  }

  /* ============ V7-1 · EL PANEL DE ESCENA (arriba): el que corre, GRANDE ============
     Ilustración quieta + parallax (cielo quieto, tribuna lenta, pasto rápido),
     la pelota del juego al pie, bob de carrera, flip por dirección. Los rivales
     cercanos entran como SILUETAS y se revelan recién en el cruce. */
  buildPanelEscena() {
    const Arte = window.PampaAvatarArte;
    this.panelLayer = this.add.container(0, 0);
    const g = this.add.graphics();
    g.fillStyle(0x123a5a, 1); g.fillRect(0, 30, 960, 92);          // cielo (quieto)
    this.panelLayer.add(g);
    if (this.textures.exists("fondo_tribuna")) {
      /* PIEL P7: la baldosa va ESPEJADA. El PNG (1280x720) es una ilustración
         en perspectiva —el techo es una cuña que crece hacia la derecha— así
         que su borde izquierdo (marrón de estructura) contra el derecho (cielo)
         no empalman: eso era el techo "cortándose en seco" a mitad de pantalla,
         y encima el parallax lo paseaba. Con [T | espejo(T)] el empalme del wrap
         es idéntico por construcción y el techo va y vuelve como un estadio. */
      this.panelTribuna = this.add.tileSprite(480, 121, 1920, 90, this.texturaEspejada("fondo_tribuna"));
      this.panelTribuna.setTileScale(0.5);
      this.panelTribuna.tilePositionY = 270;
      this.panelLayer.add(this.panelTribuna);
    } else {
      const t = this.add.rectangle(480, 121, 960, 90, 0x0e2c44, 1);
      this.panelLayer.add(t);
      this.panelTribuna = null;
    }
    /* V9 §9 · LA HINCHADA VIVA: la tribuna era una ilustración quieta con
       parallax. Ahora una capa de siluetas simples se mueve SUAVE todo el
       partido, se agita cuando la jugada se calienta y explota (o se hunde)
       en el gol. Sin arte nuevo: círculo + rectángulo, como en el cine. */
    this.crearHinchadaPanel();
    if (!this.textures.exists("pasto_tile")) Arte.bake(this, "pasto_tile", 64, 64, (gg) => {
      gg.fillStyle(0x2e7d32, 1); gg.fillRect(0, 0, 32, 64);
      gg.fillStyle(0x388e3c, 1); gg.fillRect(32, 0, 32, 64);
      gg.fillStyle(0xffffff, 0.05); gg.fillRect(0, 30, 64, 2);
    });
    this.panelPasto = this.add.tileSprite(480, 231, 960, 146, "pasto_tile");
    this.panelLayer.add(this.panelPasto);
    /* A4 · EL VELO DE FOCO: un negro suave sobre tribuna y pasto que sube
       cuando el protagonista ACTÚA, para que la figura recorte. Va acá, entre
       el fondo y las figuras: nunca oscurece al que corre. */
    /* fillAlpha en 1 y el objeto en alpha 0: en Phaser el sexto parámetro es
       el fillAlpha, y si queda en 0 el rectángulo NO se ve aunque se anime
       .alpha (bug cazado midiendo el brillo del frame real) */
    this.panelVelo = this.add.rectangle(480, 121 + 55, 960, 232, 0x040d08, 1)
      .setOrigin(0.5, 0.5).setAlpha(0);
    this.panelLayer.add(this.panelVelo);
    this._veloObj = 0;
    /* EL PANEL RECORTA LO QUE SE SALE. Las siluetas de rivales se posicionan
       en 236 + clamp(dy*0.25,-34,+40) con hasta 120px de alto: la de mas abajo
       llegaba a y=336, 32px por debajo del borde del panel (304), derramandose
       sobre la franja del relator. panelLayer no tenia mascara ninguna.
       La mascara se arma con la MISMA geometria del panel, asi que si manana la
       maqueta crece, el recorte la sigue sin tocar nada mas. */
    const mkPanel = this.make.graphics({ x: 0, y: 0, add: false });
    mkPanel.fillStyle(0xffffff, 1);
    mkPanel.fillRect(0, 30, 960, (this.VI && this.VI.panel_fin_y != null ? this.VI.panel_fin_y : 304) - 30);
    this.panelLayer.setMask(mkPanel.createGeometryMask());
    this._panelMaskG = mkPanel;
    /* siluetas de rivales cercanos (pool), DETRÁS del que corre */
    this.panelSil = [];
    for (let k = 0; k < 3; k++) {
      const s = this.add.image(0, 0, "__WHITE").setVisible(false);
      this.panelLayer.add(s);
      this.panelSil.push(s);
    }
    /* EL QUE CORRE (pose/identidad se resuelve por frame) + su pelota + su nombre */
    this.panelJug = this.add.image(430, 232, "__WHITE").setVisible(false);
    this.panelLayer.add(this.panelJug);
    this.panelPelota = this.add.sprite(482, 296, "ball").setScale(2);
    this.panelLayer.add(this.panelPelota);
    /* A4 · FRANJA PROPIA para el texto: una banda abajo del panel, fuera del
       cuerpo del sprite. Antes el nombre flotaba a la altura de la cabeza y se
       superponía con la figura grande. */
    const VI = this.VI || {};
    const yFranja = VI.panel_franja_y != null ? VI.panel_franja_y : 292;
    this.panelFranja = this.add.rectangle(480, yFranja, 960, 24, 0x0a1f13, 0.82);
    this.panelLayer.add(this.panelFranja);
    /* C4 · x de 14 a 36: el EMPUJE del bloque B (B6) agranda este panel un 6%
       adentro de su máscara fija, o sea que se come ~29 px de cada costado
       mientras hay un menú abierto. A 14 px la etiqueta del portador quedaba
       en x=-14 y se leía "0 · VOS". 36 la deja adentro con margen. */
    this.panelNombre = this.add.text(36, yFranja, "", { fontFamily: window.PF.texto, fontSize: "13px", fontStyle: "bold", color: "#f6efdc" }).setOrigin(0, 0.5);
    this.panelLayer.add(this.panelNombre);
    this._panelPrev = null;
    this.buildPanelProfundo();
  }

  /* ══════════════════════════════════════════════════════════════════════
     A5 · LA PELOTA VIEJA REEMPLAZA AL CÍRCULO CON GAJOS, EN TODAS PARTES.

     La pelota se dibujaba por código (un círculo blanco con gajos) y esa
     textura, "ball", la usan como quince lugares: el panel, el mapa, el cine,
     el jugadón, la definición y la intro. En vez de tocar los quince, se
     REEMPLAZA LA TEXTURA: si el PNG cargó, "ball" pasa a ser la pelota de
     potrero y todo el juego la hereda sin enterarse.

     Se hace después del preload y antes de construir nada, así que ningún
     sprite queda con la vieja.
     ══════════════════════════════════════════════════════════════════════ */
  pelotaVieja() {
    /* el cargador de poses le pone el prefijo "pose_", asi que la clave real es
       pose_pelota_vieja (la primera version buscaba "pelota_vieja" y no
       reemplazaba nada, sin avisar). */
    const K = "pose_pelota_vieja";
    if (!this.textures.exists(K) || !this.textures.exists("ball")) return false;
    if (this.textures.exists("ball_gajos")) return true;      // ya reemplazada

    /* ⚠ EL TAMAÑO ES EL PUNTO. La "ball" que genera sprites.js mide 16x16 y
       TODO el juego la escala contra ese tamaño (setScale(2), setScale(2.4)…).
       El PNG de la pelota de potrero mide 1500x1496: si se registra tal cual,
       cada setScale(2) la vuelve de 3000 px y llena la pantalla. Visto en
       captura: el panel entero era la pelota.

       Por eso NO se registra el PNG crudo: se RASTERIZA al mismo tamaño que
       tenía la original. El archivo no se toca —se usa tal cual vino— y todos
       los setScale del juego siguen valiendo sin cambiar ninguno. */
    const orig = this.textures.get("ball").getSourceImage();
    const W = orig.width || 16, H = orig.height || 16;
    const rt = this.make.renderTexture({ width: W, height: H, add: false });
    const img = this.add.image(0, 0, K).setOrigin(0, 0).setVisible(false);
    const src = this.textures.get(K).getSourceImage();
    img.setDisplaySize(W, H);
    rt.draw(img, 0, 0);
    img.destroy();
    this.textures.addImage("ball_gajos", orig);               // la de gajos, por si hay que volver
    rt.saveTexture("ball_potrero");
    /* y "ball" pasa a ser la nueva: se quita y se vuelve a poner con el mismo
       nombre, pero ANTES de que exista un solo sprite que la use (esta funcion
       corre en el primer renglon de create) */
    this.textures.remove("ball");
    this.textures.addImage("ball", this.textures.get("ball_potrero").getSourceImage());
    return true;
  }

  /* ══════════════════════════════════════════════════════════════════════════
     P6-B · EL SEGUNDO MODO ESPACIAL DEL PANEL.

     Hasta acá el panel tenía UN encuadre y nada más: de perfil, el que corre,
     con parallax. Un pase de 40 metros y un toque de 3 se dibujaban con la
     misma cámara, a la misma distancia, con el mismo horizonte. Por eso "no
     hay espacio": la distancia se nombraba pero no se representaba.

     Ahora el panel tiene DOS modos y corta entre ellos:
       LATERAL   de perfil — correr, gambetear, el trámite (el de siempre)
       PROFUNDO  la cámara detrás del que la tira, mirando al arco: las líneas
                 convergen al punto de fuga, el que recibe viene de lejos y el
                 que tiró se va de cuadro.

     Las piezas viven adentro de panelLayer, así que heredan su máscara: lo que
     se sale del panel se recorta solo, igual que en el modo lateral.

     El punto de fuga y la línea de cerca son perillas (vista.profundo.vp_y y
     near_y) en coordenadas del panel, que va de y=30 a y=304.
     ══════════════════════════════════════════════════════════════════════════ */
  buildPanelProfundo() {
    if (!this.panelLayer) return;
    this._prof = {
      activo: false, t: 0, dur: 0, accion: null,
      g: this.add.graphics(),                                   // la cancha en fuga
      tirador: this.add.image(0, 0, "__WHITE").setVisible(false),
      receptor: this.add.image(0, 0, "__WHITE").setVisible(false),
      pelota: this.add.sprite(0, 0, "ball").setVisible(false),
      sombraR: this.add.ellipse(0, 0, 40, 12, 0x000000, 0.32).setVisible(false)
    };
    const p = this._prof;
    /* orden de dibujo: cancha, sombra, el que recibe (lejos), la pelota, el
       que tiró (cerca y por lo tanto adelante de todo) */
    this.panelLayer.add([p.g, p.sombraR, p.receptor, p.pelota, p.tirador]);
    p.g.setVisible(false);
  }

  /* ══════════════════════════════════════════════════════════════════════
     B2 · ¿ESTA JUGADA SACA LA CÁMARA DE DONDE ESTABA?

     La decisión es de logic/perspectiva.js (pura, testeable); acá solo se le
     pasan las distancias, que el partido ya calcula. Los umbrales son perillas
     de balance.vista.profundo.

     Los cuatro casos del punto: pase largo, remate desde afuera del área, la
     megacorrida y el saque del arquero. */
  quizasProfundo(accion, ctx, opts) {
    const V = (this.VI && this.VI.profundo) || {};
    if (!window.PampaPersp || !window.PampaPersp.esProfundo) return false;
    if (!window.PampaPersp.esProfundo(accion, ctx || {}, V)) return false;
    return this.entrarProfundo(accion, opts || {});
  }

  /* la geometría del plano profundo, en coordenadas del panel */
  encuadreProfundo() {
    const V = (this.VI && this.VI.profundo) || {};
    return {
      vpX: 480,
      vpY: V.vp_y != null ? V.vp_y : 62,
      nearY: V.near_y != null ? V.near_y : 298,
      k: V.k != null ? V.k : 3
    };
  }

  /* B1 · la cancha en fuga DENTRO del panel: pasto, líneas que convergen y el
     arco chiquito al fondo. Es la misma idea de dibujarCanchaProfunda() del
     cine, redibujada para la ventana del panel en vez de la pantalla entera —
     que es exactamente sacar la maquinaria de donde estaba encerrada. */
  dibujarProfundoEnPanel() {
    const p = this._prof; if (!p) return;
    const g = p.g, E = this.encuadreProfundo(), Per = window.PampaPersp;
    const TECHO = 30, PISO = (this.VI && this.VI.panel_fin_y != null ? this.VI.panel_fin_y : 304);
    g.clear();
    /* cielo */
    g.fillStyle(0x123a5a, 1); g.fillRect(0, TECHO, 960, E.vpY - TECHO + 10);
    /* AFUERA DE LA CANCHA HAY MAS CAMPO, no vacio. Sin esto las dos esquinas
       de abajo quedaban NEGRAS y el plano se leia como un dibujo flotando en
       lugar de un lugar. Visto en la primera captura del modo. */
    g.fillStyle(0x1e5c2e, 1); g.fillRect(0, E.vpY, 960, PISO - E.vpY);
    /* el pasto en cuña: del punto de fuga a los dos bordes de abajo */
    g.fillStyle(0x2a7d3f, 1);
    g.fillPoints([{ x: 0, y: PISO }, { x: 960, y: PISO },
                  { x: E.vpX + 40, y: E.vpY }, { x: E.vpX - 40, y: E.vpY }], true);
    /* las rayas del corte de pasto, en profundidad */
    for (let i = 0; i < 7; i++) {
      const a = Per.aPantalla(i / 7, { k: E.k, vpX: E.vpX, vpY: E.vpY, nearY: PISO });
      const b = Per.aPantalla((i + 0.5) / 7, { k: E.k, vpX: E.vpX, vpY: E.vpY, nearY: PISO });
      const anchoA = 40 + (960 / 2 - 40) * ((a.y - E.vpY) / (PISO - E.vpY));
      const anchoB = 40 + (960 / 2 - 40) * ((b.y - E.vpY) / (PISO - E.vpY));
      g.fillStyle(0x2e8a46, 1);
      g.fillPoints([{ x: E.vpX - anchoA, y: a.y }, { x: E.vpX + anchoA, y: a.y },
                    { x: E.vpX + anchoB, y: b.y }, { x: E.vpX - anchoB, y: b.y }], true);
    }
    /* las líneas que convergen: es LO que dice "esto es profundidad" */
    g.lineStyle(3, 0xeafff0, 0.5);
    g.beginPath(); g.moveTo(E.vpX - 40, E.vpY); g.lineTo(0, PISO);
    g.moveTo(E.vpX + 40, E.vpY); g.lineTo(960, PISO); g.strokePath();
    /* travesaños de referencia: sin estos la profundidad no se lee */
    g.lineStyle(2, 0xeafff0, 0.24);
    for (let i = 1; i <= 5; i++) {
      const sy = Per.aPantalla(i / 6, { k: E.k, vpX: E.vpX, vpY: E.vpY, nearY: PISO }).y;
      const half = 40 + (960 / 2 - 40) * ((sy - E.vpY) / (PISO - E.vpY));
      g.beginPath(); g.moveTo(E.vpX - half, sy); g.lineTo(E.vpX + half, sy); g.strokePath();
    }
    /* el arco, chiquito, al fondo */
    const gw = 74, gh = 30;
    g.fillStyle(0xdfeef6, 0.4);
    for (let x = -gw / 2; x <= gw / 2; x += 7) g.fillRect(E.vpX + x, E.vpY - gh, 1, gh);
    g.fillStyle(0xffffff, 1);
    g.fillRect(E.vpX - gw / 2 - 3, E.vpY - gh - 3, 4, gh + 4);
    g.fillRect(E.vpX + gw / 2, E.vpY - gh - 3, 4, gh + 4);
    g.fillRect(E.vpX - gw / 2 - 3, E.vpY - gh - 3, gw + 7, 4);
  }

  /* B3 · EL CORTE ES EL EFECTO. No hay transición suave: se apaga el modo
     lateral, se prende el profundo y se frena un puñado de cuadros para que el
     cambio se SIENTA. Lo que pidió Rodri no es que exista otro plano — es que
     la cámara salga de donde estaba. */
  entrarProfundo(accion, opts) {
    const V = (this.VI && this.VI.profundo) || {};
    if (V.activo === false || !this._split || !this._prof) return false;
    opts = opts || {};
    const p = this._prof;
    p.activo = true; p.accion = accion; p.t = 0;
    p.dur = opts.dur || V.vuelo_ms || 1150;
    p.desde = this.time.now;
    p.alFinal = opts.alFinal || null;

    /* se apaga el modo lateral (todo lo de perfil) */
    this.modoLateralVisible(false);
    /* se prende el profundo */
    p.g.setVisible(true);
    this.dibujarProfundoEnPanel();

    const E = this.encuadreProfundo();
    /* B5 · YA ESTÁN. Cuando se hizo el modo profundo estas dos poses no
       existían y había que usar 'corriendo', que es de PERFIL: el que la tira
       te mostraba el costado en vez de darte la espalda, y era lo que más se
       notaba del modo. Llegaron con la tanda de las 32.
         de_espaldas  → el que la tira, alejándose de la cámara
         recibiendo   → el que espera el pase, de frente y chico al fondo */
    const kT = this.poseKey("de_espaldas") || this.poseKey("corriendo");
    if (kT) { p.tirador.setTexture(kT).setVisible(true).setOrigin(0.5, 1).setAlpha(1); }
    /* el que recibe: si es del rival, su pose naranja; si es un compañero, la
       de recibir de frente */
    const kR = (opts.rival && this.poseKey("r_corriendo"))
      || this.poseKey("recibiendo") || kT;
    if (kR) { p.receptor.setTexture(kR).setVisible(true).setOrigin(0.5, 1); }
    p.pelota.setVisible(true);
    p.sombraR.setVisible(true);

    /* el freno del corte: el hitstop del bloque B */
    if (window.PampaFeel && window.PampaPersp) {
      const ms = window.PampaPersp.frenoDelCorte(accion, V);
      if (window.PampaFeel.hitstop) window.PampaFeel.hitstop(this, ms);
    }
    this.SFX && this.SFX.whoosh && this.SFX.whoosh(260);
    this._profUltimo = accion;
    return true;
  }

  salirProfundo() {
    const p = this._prof; if (!p || !p.activo) return;
    p.activo = false;
    p.g.setVisible(false);
    p.tirador.setVisible(false); p.receptor.setVisible(false);
    p.pelota.setVisible(false); p.sombraR.setVisible(false);
    this.modoLateralVisible(true);
    const cb = p.alFinal; p.alFinal = null;
    if (cb) cb();
  }

  /* prende o apaga TODO lo del modo lateral de una sola vez: si mañana se
     agrega una pieza al panel de perfil, se agrega acá y los dos modos siguen
     siendo excluyentes. */
  modoLateralVisible(v) {
    [this.panelTribuna, this.panelPasto, this.panelJug, this.panelPelota, this.panelVelo]
      .forEach(o => o && o.setVisible(v));
    (this.panelSil || []).forEach(o => o && o.setVisible(v && o._teniaVis !== false));
    /* la hinchada del panel es un unico Graphics (this._hin.g), no un pool */
    if (this._hin && this._hin.g) this._hin.g.setVisible(v);
    /* el cielo es el primer hijo del panel: en profundo lo dibuja el modo */
    if (this.panelLayer && this.panelLayer.list[0] && this.panelLayer.list[0].type === "Graphics")
      this.panelLayer.list[0].setVisible(v);
  }

  /* B1 · el latido del modo profundo. Lo llama el update en lugar de
     updatePanelEscena mientras dure el viaje. */
  updatePanelProfundo() {
    const p = this._prof; if (!p || !p.activo) return;
    const V = (this.VI && this.VI.profundo) || {};
    const Per = window.PampaPersp, E = this.encuadreProfundo();
    const PISO = (this.VI && this.VI.panel_fin_y != null ? this.VI.panel_fin_y : 304);
    const t = Math.min(1, (this.time.now - p.desde) / Math.max(1, p.dur));
    p.t = t;
    const v = Per.viajeProfundo(t, V);
    const cfg = { k: E.k, vpX: E.vpX, vpY: E.vpY, nearY: PISO };
    const alto = (E.vpY < PISO ? PISO - E.vpY : 200);

    /* el que recibe: viene de lejos creciendo */
    const sR = Per.aPantalla(v.receptor, cfg);
    /* el que recibe viene de lejos, pero NO puede arrancar invisible: al 3.8%
       de escala no se veia que hubiera alguien esperando, y entonces el pase
       parecia ir a la nada. El piso lo pone escala_min. */
    const V2 = (this.VI && this.VI.profundo) || {};
    const escMin = V2.receptor_escala_min != null ? V2.receptor_escala_min : 0.16;
    const escR = (alto * 0.42 * Math.max(escMin, sR.escala)) / Math.max(1, p.receptor.height);
    p.receptor.setPosition(sR.x, sR.y).setScale(escR);
    p.sombraR.setPosition(sR.x, sR.y).setScale(sR.escala * 1.6, sR.escala * 1.6);

    /* la pelota: entre los dos, con su parábola */
    const sB = Per.aPantalla(v.pelota, cfg);
    p.pelota.setPosition(sB.x, sB.y - v.alto * 46 * sB.escala).setScale(2.4 * sB.escala);
    p.pelota.rotation += 0.16;

    /* el que la tiró: crece y se va de cuadro (la cámara lo pasa) */
    const sT = Per.aPantalla(v.tirador, cfg);
    const escT = (alto * 0.62 * sT.escala * v.tiradorEscala) / Math.max(1, p.tirador.height);
    p.tirador.setPosition(sT.x, PISO).setScale(escT).setAlpha(v.tiradorAlpha);

    if (t >= 1) this.salirProfundo();
  }
  /* V7-1 §3: qué ilustración corre arriba — VOS llevás la pose del héroe;
     compañeros y rivales llevan SU identidad, determinista por nombre
     (mismo nombre, misma cara siempre). Fallback: pose_corriendo. */
  identidadDe(j, esRival) {
    const man = this._identMan;
    if (!man || !Array.isArray(man.identidades)) return null;
    const del = man.identidades.filter(d => d.equipo === (esRival ? "rival" : "mio"));
    if (!del.length) return null;
    const d = del[window.PampaAvatar.hashSemilla(j.nombre || "x") % del.length];
    return this.textures.exists("ident_" + d.id) ? "ident_" + d.id : null;
  }
  /* TANDA DE ARTE A3 · EL CICLO DE CORRIDA. Si el manifest declara "ciclo"
     para la pose de correr, el panel alterna sus cuadros mientras el portador
     se mueve (y vuelve al cuadro quieto cuando frena). Los tres cuadros están
     recortados con la MISMA caja, así que no hay que recentrar nada acá: se
     cambia la textura y listo. Sin ciclo declarado, se comporta como antes. */
  /* A4 · el fondo BAJA cuando el protagonista actúa: en LIBRE se corre y se ve
     todo; en cuanto se abre un momento (menú, resolución, escena) el velo sube
     y la figura recorta contra la tribuna y el pasto oscurecidos. */
  velarPanel(delta) {
    if (!this.panelVelo || !this.panelVelo.active) return;
    const V = this.VI || {};
    const actuando = this.estado !== "LIBRE" && this.estado !== "BEAT";
    this._veloObj = actuando ? (V.panel_velo_alpha != null ? V.panel_velo_alpha : 0.45) : 0;
    const paso = Math.min(1, (delta || 16) * 0.006);
    this.panelVelo.setAlpha(this.panelVelo.alpha + (this._veloObj - this.panelVelo.alpha) * paso);
  }
  cuadroDelCiclo(corriendo) {
    const poses = this.game.registry.get("poses");
    const def = poses && poses.poses && poses.poses.corriendo;
    const ciclo = def && def.ciclo;
    if (!ciclo || !ciclo.cuadros || !ciclo.cuadros.length) return null;
    if (!corriendo) return this.textures.exists("pose_corriendo_c0") ? "pose_corriendo_c0" : null;
    const ms = ciclo.ms || 120;
    const i = Math.floor(this.time.now / ms) % ciclo.cuadros.length;
    const k = "pose_corriendo_c" + i;
    return this.textures.exists(k) ? k : null;
  }
  /* ══════════════════════════════════════════════════════════════════════
     P3 · POR QUÉ NO SE VEÍAN LOS QUITES NI LOS REMATES.

     No faltaba una escena: el camino terminaba en una capa INVISIBLE.

     Bloque A manda las acciones de escalón 1 (un quite o un corte fuera del
     último tercio) a mostrarResolucion() en vez de a una viñeta — eso está
     bien, es el diseño. mostrarResolucion llama a animarResolucion(), que
     anima `sprDuelo` o `sprPortador`… y los dos viven en `mundoLayer`, que
     desde la PANTALLA PARTIDA de V7-1 tiene visible = false. Verificado en
     vivo: mundoLayer.visible === false con 5 hijos adentro.

     O sea que la animación corría perfecta, hacia la nada, y en pantalla solo
     quedaba el renglón de texto. Por eso volvió dos veces: cada pasada anterior
     buscó QUÉ escena faltaba, y lo que fallaba era DÓNDE se dibujaba.

     Medido con contadores en un quite de mediocampo:
       quite_ganado 1 · quite_SIN_ESCENA_por_escalon 1 (correcto, es trámite)
       animarResolucion 1 · QUITE_SIN_DUELO 1 → cae a la rama genérica
       generica_gambeta 1 → anima a sprPortador, que es el RIVAL que acaba de
       perder la pelota, con una animación de gambeta. Y todo eso, invisible.

     EL ARREGLO: el trámite se muestra en el PANEL DE LA ESCENA, que es la
     superficie que el jugador está mirando. Se le fuerza la pose de la acción
     por unos cuadros, con un golpe de escala. Es la doctrina de animación de
     V6: pose quieta y corte seco, no interpolación.
     ══════════════════════════════════════════════════════════════════════ */
  /* fuerza la pose del panel por unos ms: así se VE un quite o un remate que
     no llega a viñeta. Devuelve false si no pudo (y eso se cuenta como deuda). */
  poseTramite(poseId, ms) {
    if (!this._split || !this.panelJug) return false;
    const key = this.poseKey(poseId);
    if (!key) return false;
    this._poseForzada = { key: key, hasta: this.time.now + (ms || 700) };
    this.panelJug.setTexture(key);
    /* el golpe: la figura crece y vuelve — que se sienta el impacto */
    this.tweens.killTweensOf(this.panelJug);
    const e0 = this.panelJug.scaleX;
    this.tweens.add({ targets: this.panelJug, scaleX: e0 * 1.14, scaleY: e0 * 1.14,
      duration: 90, yoyo: true, ease: "Quad.easeOut" });
    return true;
  }
  poseDelPanel(p, corriendo) {
    /* P3: mientras dura el trámite, la pose de la acción manda sobre todo lo
       demás — si no, el update la pisa en el cuadro siguiente. */
    if (this._poseForzada) {
      if (this.time.now < this._poseForzada.hasta) return this._poseForzada.key;
      this._poseForzada = null;
    }
    /* VOS corriendo: el ciclo manda (salvo que tengas tintes, que van sobre la
       pose quieta — el ciclo teñido sería un bake por cuadro y no vale la pena) */
    if (p.j.esVos && corriendo && !this.poseHeroeTenida(p.j)) {
      const c = this.cuadroDelCiclo(true);
      if (c) return c;
    }
    if (!p.j.esVos) {
      const k = this.identidadDe(p.j, p.esRival);
      if (k) return k;
    }
    /* V7-1 §4: el que corre arriba TENÉS QUE SER VOS — la pose del héroe
       teñida con tu pinta guardada (piel/pelo del catálogo + tono de camiseta
       del editor v2). Fallback: la pose tal cual. */
    if (p.j.esVos) {
      const k = this.poseHeroeTenida(p.j);
      if (k) return k;
    }
    return this.poseKey("corriendo");
  }
  /* ══════════════════════════════════════════════════════════════════════
     A3 · EL ESCALADO DE LAS FIGURAS ACOSTADAS.

     Todo el juego escala las poses por ALTURA: setScale(altoPedido / imagen.height).
     Eso funciona mientras la figura sea más alta que ancha, que es el caso de
     casi todas. Pero el arquero volando mide 1905x746 y el del rival 1897x650:
     son más anchas que altas, así que a alto completo su ANCHO se sale de la
     pantalla de 960 px.

     La perilla es 'alto_rel' en data/poses_manifest.json: qué fracción del alto
     pedido ocupa ESA pieza. Se calculó una vez de la proporción de cada archivo
     y quedó escrita ahí, con la medida que la justifica, así que retocarla es
     cambiar un número.

     Este helper es el ÚNICO lugar que traduce "quiero esta pose de tal alto" a
     una escala. Si mañana entra otra figura acostada, alcanza con su alto_rel.
     ══════════════════════════════════════════════════════════════════════ */
  escalaDePose(poseId, alturaPedida, imagen) {
    const h = (imagen && imagen.height) || 1;
    const man = this.game.registry.get("poses");
    const def = man && man.poses && man.poses[poseId];
    const rel = (def && def.alto_rel) || 1;
    return (alturaPedida * rel) / h;
  }

  /* B3-D · EL TINTE DE CAMISETA EN LAS ESCENAS.
     Esta función estaba clavada en la pose 'corriendo': teñía esa y nada más.
     Como las escenas usan remate, festejo, gambeta, pared…, en TODAS salía el
     celeste del PNG por más que hubieras elegido Negro tranquera. Ese era el
     reporte de Rodri.
     Ahora recibe QUÉ pose teñir. El id por defecto sigue siendo 'corriendo'
     para que los llamadores viejos anden igual. */
  poseHeroeTenida(j, poseId) {
    const id = poseId || "corriendo";
    const src = this.poseKey(id);
    const poses = this.game.registry.get("poses");
    const def = poses && poses.poses && poses.poses[id];
    if (!src || !def || !def.tonos || this.FLAGS.v7_caras === false || !j.look || !window.PampaAvatarArte) return null;
    const A = window.PampaAvatar;
    const look = A.validarLook(j.look);
    /* V7 §0.2: tintes OPCIONALES — todos en Original: la pose queda tal cual */
    if (!look.tPiel && !look.tPelo && !look.tCam) return null;
    /* la pose entra en la key: si no, la primera que se tiñe queda cacheada
       para todas y aparece un remate donde iba un festejo */
    const key = "poseV_" + id + "_" + look.tPiel + "_" + look.tPelo + "_" + look.tCam;
    if (this.textures.exists(key)) return key;
    const CAT = A.CATALOGO;
    const CM = this.game.registry.get("caras");
    const hx = s => parseInt(String(s).slice(1), 16);
    const T = def.tonos, tol = def.tolerancias || {};
    const mapa = [];
    if (look.tPelo > 0 && T.pelo) mapa.push({ de: hx(T.pelo), a: hx(CAT.colores_pelo[look.tPelo - 1].hex), tol: tol.pelo || 60, y1: def.pelo_y1 != null ? def.pelo_y1 : 0.45 });
    if (look.tPiel > 0 && T.piel) mapa.push({ de: hx(T.piel), a: hx(CAT.pieles[look.tPiel - 1].hex), tol: tol.piel || 80 });
    if (look.tCam > 0 && T.camiseta && CM && CM.camisetas) mapa.push({ de: hx(T.camiseta), a: hx(CM.camisetas[(look.tCam - 1) % CM.camisetas.length].hex), tol: tol.camiseta || 95 });
    window.PampaAvatarArte.tenirImagen(this, src, key, mapa);
    return this.textures.exists(key) ? key : null;
  }
  updatePanelEscena(delta) {
    if (!this._split || !this.panelJug) return;
    const st = this.st, p = this.portadorActual(), j = p.j;
    const prev = this._panelPrev || { x: j.x, y: j.y, clave: p.clave };
    const mismo = prev.clave === p.clave;
    const vx = mismo ? j.x - prev.x : 0, vy = mismo ? j.y - prev.y : 0;
    this._panelPrev = { x: j.x, y: j.y, clave: p.clave };
    /* ══════════════════════════════════════════════════════════════════════
       A1 · POR QUÉ EL JUGADOR CORRÍA PARA ATRÁS.

       No era el arte ni la regla del flip: era la MITAD. La simulación ataca
       siempre a +x, en los dos tiempos — eso es a propósito, y es lo que deja
       intactos los 17 umbrales de partido.js, la IA de los 21 y sus tests. El
       que se da vuelta en el segundo tiempo es el DIBUJO, vía fx().

       El panel no pasaba por ahí. Calculaba el flip con el vx de la
       SIMULACIÓN, así que en el segundo tiempo ibas hacia el arco (vx > 0), la
       cancha te mostraba yendo a la izquierda y la figura miraba a la derecha:
       corriendo de espaldas, todo el segundo tiempo, los dos lados.

       Ya había pasado con el teclado y está arreglado más abajo, con este
       comentario: "con el lado dado vuelta, derecha en pantalla es -x en la
       simulación. Sin esto, en el 2T ibas al arco y corrías para atrás". Era
       el mismo bug en otra superficie; ahora las dos usan la misma verdad.

       vxP = velocidad EN PANTALLA. De acá salen las tres cosas que tienen que
       coincidir con lo que se ve: hacia dónde mira, hacia dónde corre el pasto
       y de qué lado aparecen las siluetas. */
    const espejo = (st.ladoVisual === 2) ? -1 : 1;
    const vxP = vx * espejo;
    /* V8 §1: con el pulso, entre latidos vx es 0 — el bob de corrida se
       sostiene mientras el último latido haya movido (no se corta feo) */
    const corriendo = Math.abs(vx) + Math.abs(vy) > 0.04 || this.time.now < (this._pulsoMovioHasta || 0);
    /* PARALLAX: pasto rápido, tribuna lenta, cielo quieto — V7 §0.3: los
       factores son diales de balance.vista (la corrida tiene que LEERSE) */
    this.panelPasto.tilePositionX += vxP * (this.VI.parallax_pasto != null ? this.VI.parallax_pasto : 1.4);
    this.panelPasto.tilePositionY += vy * (this.VI.parallax_pasto_y != null ? this.VI.parallax_pasto_y : 0.7);
    if (this.panelTribuna) this.panelTribuna.tilePositionX += vxP * (this.VI.parallax_tribuna != null ? this.VI.parallax_tribuna : 0.35);
    /* V9 §9: la tribuna respira siempre y se agita cuando la jugada quema
       (alguien con la pelota en el último cuarto, para cualquiera de los dos) */
    if (this.latirHinchada) {
      const pel = st.pelota, caliente = pel && (pel.x > st.W * 0.74 || pel.x < st.W * 0.26);
      this.latirHinchada(delta, !!caliente);
    }
    /* la ilustración del portador (rival sin revelar = SILUETA) */
    const key = this.poseDelPanel(p, corriendo);
    if (key && this.panelJug.texture.key !== key) {
      this.panelJug.setTexture(key);
      /* A4 · ESCALA Y ENCUADRE: la figura ocupaba un tercio del panel y sobraba
         fondo. Ahora ocupa panel_figura_frac del alto útil, anclada por los PIES
         a la línea del suelo (origin abajo), así nunca se le cortan los pies. */
      const V = this.VI || {};
      /* PIEL P8: el suelo de la figura sale de panel_suelo_y, que ahora está
         ARRIBA de la franja de texto (ver balance.vista): los pies apoyan sobre
         la franja en vez de quedar tapados por ella. */
      const altoUtil = (V.panel_suelo_y != null ? V.panel_suelo_y : 278) - (V.panel_techo_y != null ? V.panel_techo_y : 34);
      const frac = V.panel_figura_frac != null ? V.panel_figura_frac : 0.86;
      this.panelJug.setOrigin(0.5, 1);
      this.panelJug.setScale((altoUtil * frac) / this.panelJug.height);
      this.panelJug.setPosition(this.panelJug.x, V.panel_suelo_y != null ? V.panel_suelo_y : 278);
      this.panelJug.setVisible(true);
    }
    /* V7 §0.1 (playtest): el PORTADOR está SIEMPRE revelado — verlo es el
       drama. Sea tuyo o rival: su identidad, su cara y su nombre. Las
       siluetas quedan SOLO para los rivales SIN pelota (el pool de abajo). */
    this.panelJug.clearTint();
    /* V8 §3: el flip sigue la dirección REAL del movimiento y tiene MEMORIA —
       entre latidos (vx=0) conserva la última; nunca corre de espaldas */
    if (Math.abs(vxP) > 0.02) this._panelFlip = vxP < 0;
    this.panelJug.setFlipX(!!this._panelFlip);
    /* V8 §3: la ZANCADA al latido — la pose se inclina alternando con el
       tuc-tuc (animación limitada estilo consola vieja: dos cuadros) */
    const latidoMs = (this.BAL.pulso && this.BAL.pulso.latido_ms) || 380;
    this.panelJug.setAngle(corriendo ? (Math.floor(this.time.now / latidoMs) % 2 ? 3.5 : -3.5) : 0);
    /* A4: la figura se ancla por los PIES a la línea del suelo; el bob de
       carrera es un rebote chico de esa línea, no un salto del centro */
    const Vp = this.VI || {};
    const suelo = Vp.panel_suelo_y != null ? Vp.panel_suelo_y : 300;
    const cx = Vp.panel_figura_x != null ? Vp.panel_figura_x : 400;
    this.panelJug.y = suelo + (corriendo ? Math.abs(Math.sin(this.time.now * 0.02)) * -4 : 0);
    this.panelJug.x = cx + (corriendo ? Math.cos(this.time.now * 0.013) * 2 : 0);
    /* la pelota del juego al pie (a escala de la figura nueva) */
    const dir = this.panelJug.flipX ? -1 : 1;
    const anchoFig = this.panelJug.displayWidth || 120;
    this.panelPelota.setPosition(cx + anchoFig * 0.34 * dir, suelo - 8 - (corriendo ? Math.abs(Math.sin(this.time.now * 0.02)) * 7 : 0));
    if (corriendo) this.panelPelota.rotation += 0.14 * dir;
    /* A4 · el fondo BAJA cuando el protagonista actúa: en LIBRE se corre y se
       ve todo; en cuanto se abre un momento (menú, resolución, beat) el velo
       sube y la figura recorta contra el fondo oscurecido. */
    this.velarPanel(delta);
    /* quién corre: bando por FORMA (▲/▼) + NÚMERO + NOMBRE (accesibilidad) */
    const nom = (p.esRival ? "▲ " : "▼ ") + (j.numero ? j.numero + " · " : "") + (j.esVos ? "VOS" : (j.nombre || "").toUpperCase().slice(0, 10));
    if (this.panelNombre.text !== nom) this.panelNombre.setText(nom);
    /* SILUETAS de rivales dentro de radio_silueta (posición relativa al portador) */
    const radio = this.VI.radio_silueta || 260;
    let usados = 0;
    for (let i = 0; i < st.rivales.length && usados < this.panelSil.length; i++) {
      const r = st.rivales[i];
      if (r.pos === "ARQ" || (p.esRival && i === p.idx)) continue;
      /* A1 · la silueta de un rival que está ADELANTE tuyo tiene que verse
         adelante. En el segundo tiempo "adelante" es el otro lado de la
         pantalla, así que su posición y su flip pasan por el mismo espejo. */
      const dx = (r.x - j.x) * espejo, dy = r.y - j.y;
      const d = Math.hypot(dx, dy);
      if (d > radio || d < 8) continue;
      const s = this.panelSil[usados++];
      /* V7-1 §3: la silueta lleva la FORMA de su identidad (quién es, recién en el cruce) */
      const kSil = this.identidadDe(r, true) || this.poseKey("corriendo");
      if (kSil && s.texture.key !== kSil) { s.setTexture(kSil); }
      s.setScale((120 - 40 * (d / radio)) / s.height);
      s.setTintFill(0x101820);
      s.setAlpha(0.85);
      s.setPosition(430 + Phaser.Math.Clamp(dx, -radio, radio) * 1.3, 236 + Phaser.Math.Clamp(dy * 0.25, -34, 40));
      s.setFlipX(dx < 0);
      s.setVisible(true);
    }
    for (let k = usados; k < this.panelSil.length; k++) this.panelSil[k].setVisible(false);
  }

  /* ============ ANIME v4 Bloque A · LAS 22 FICHAS ============
     Con la vista elevada, TODOS los jugadores se ven a la vez como sprites
     simples de alta legibilidad (los toscos de la E1: liso vs RAYAS por diseño,
     no solo color). El portador sigue siendo el heroico, apenas más grande.
     Número visible AL PAUSAR (fuera de LIBRE aparecen los dorsales). */
  /* C3 · TAMPOCO ES HUÉRFANO: son las fichas de la CANCHA ENTERA, de antes de la
     pantalla partida. Hoy no se construyen (el único llamador pide
     `!FLAGS.pantalla_partida`, que viene en true) y por eso updateFichas() sale
     por su guarda `!this.fichasMios`. Vive del mismo flag que la vista partida.
     Si se borra el flag pantalla_partida, se van los tres métodos juntos. */
  buildFichas() {
    if (!this._vista4) { this.fichasMios = this.fichasRiv = null; return; }
    const Arte = window.PampaAvatarArte;
    const mk = (j, esRival, i) => {
      const base = (esRival ? "f_riv" : "f_mio") + i;
      Arte.jugador(this, base, j.look || window.PampaAvatar.crearLook(), esRival);
      ["_idle", "_run"].forEach(s => this.textures.get(base + s).setFilter(Phaser.Textures.FilterMode.NEAREST));
      const spr = this.add.sprite(0, 0, base + "_idle");
      const num = this.add.text(0, 0, String(j.numero), { fontFamily: window.PF.texto, fontSize: "20px", color: "#ffffff", stroke: "#0a1f13", strokeThickness: 3, fontStyle: "bold" }).setOrigin(0.5).setVisible(false).setDepth(9);
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
    /* V6 §2 R5 · LA CEGUERA: los rivales no se dibujan en la cancha — solo el
       radar sabe dónde están. radio_revelacion > 0 = perilla de rescate. */
    const cieg = this._ceguera, radioRev = this.VI.radio_revelacion || 0;
    const upd = (arr, js, esRival) => js.forEach((j, i) => {
      const F = arr[i]; if (!F) return;
      const esPortador = (esRival === p.esRival) && i === p.idx;
      const oculto = esRival && cieg &&
        (radioRev <= 0 || Math.hypot(j.x - st.pelota.x, j.y - st.pelota.y) > radioRev);
      F.spr.setVisible(!esPortador && !oculto);
      F.num.setVisible(!esPortador && !oculto && !!mostrarNums);
      if (esPortador || oculto) return;
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
    if (!this.FLAGS.e4_arte || !this._persp) return { x: this.fx(wx / this.SX), y: wy / this.SY };
    const P = this._persp;
    const t = Phaser.Math.Clamp((wy - P.yTop - 16) / (P.yBot - P.yTop - 30), 0, 1);
    const xi = P.insTop + (P.insBot - P.insTop) * t;
    const jx = Phaser.Math.Clamp((wx - xi - 16) / (this.V2.MUNDO_W - 2 * xi - 32), 0, 1) * this.st.W;
    return { x: this.fx(jx), y: t * this.st.H };   // V9 §10: la inversa también espeja
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
    /* V7-1: en pantalla partida el radar ES el mapa — grande, abajo, protagonista */
    /* el ancho baja de 640 a 620: el marco llegaba a x=748 y el boton ACCION
       arranca en 744 (733 con el pulso), o sea se pisaban 15px. */
    const rw = this._split ? 620 : 264, rh = this._split ? 198 : 132;
    const rx = this._split ? 105 : 12, ry = this._split ? 322 : 540 - rh - 12;
    this.radar = { x: rx, y: ry, w: rw, h: rh };
    /* PIEL P1: el marco del mapa era 0x0b3d0b, un verde oscuro que lo hacía
       familia del pasto — de ahí la mancha verde sobre verde. Ahora es el tono
       de marco de la paleta: el verde queda SOLO adentro, que es la cancha. */
    const marco = this.add.rectangle(rx + rw / 2, ry + rh / 2, rw + 6, rh + 6, this.piel().n.marco, 0.96).setStrokeStyle(2, 0xf6efdc, 0.7);
    this.radarMarco = marco;   /* PIEL P9: para poder apagarlo en el final */
    this.radarG = this.add.graphics();
    this.hudLayer.add([marco, this.radarG]);
    /* números de camiseta: 22 textos chiquitos que siguen a su ficha */
    /* L1 · EL NÚMERO AL PISO DE LEGIBILIDAD.
       Medía 9px lógicos = 6,5 px REALES en un teléfono. Su altura de mayúscula
       daba 5,8 minutos de arco contra un umbral de agudeza 20/20 de 5: estaba
       por debajo de lo que el ojo RESUELVE. Y el trazo medía 0,65 px reales,
       que el downscale nearest-neighbour (pixelArt) descarta entero.
       El piso son 16 lógicos = 11,6 reales. Perilla: balance.legibilidad. */
    const LEG = this.BAL.legibilidad || {};
    this.LEG = LEG;
    const numPx = LEG.num_mapa != null ? LEG.num_mapa : 16;
    const mkNum = (n) => {
      const t = this.add.text(0, 0, String(n), { fontFamily: window.PF.texto, fontSize: numPx + "px", color: "#0a1f13", fontStyle: "bold" }).setOrigin(0.5).setDepth(1);
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
    /* V9 B1: el radar se DIBUJA espejado en el 2T (mx usa fx), así que leer el
       toque sin espejar mandaba al jugador al arco equivocado — tocabas donde
       veías el arco rival y corría para atrás. fx() es su propia inversa. */
    const R = this.radar, st = this.st;
    return { x: this.fx((p.x - R.x) / R.w * st.W), y: (p.y - R.y) / R.h * st.H };
  }
  onRadarTap(p) {
    const st = this.st, P = window.PampaPartido, w = this.radarAMundo(p);
    /* V7-1: el mapa es LA superficie de navegación — tocarlo en LIBRE = correr ahí */
    if (this._split && this.estado === "LIBRE" && st.posesion === "mia") {
      this.target = { x: Phaser.Math.Clamp(w.x, 14, st.W - 14), y: Phaser.Math.Clamp(w.y, 14, st.H - 14) };
      return;
    }
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
  /* qué cara pone según el aguante / lado (dolorido si está rendido) */
  _exprPorGuts(gutsVal) {
    return gutsVal < this.BAL.aguante.umbral_rendido ? "dolorido" : "concentrado";
  }
  /* EDITOR v2: el busto ILUSTRADO teñido con la pinta — la MISMA cara en el
     editor, los duelos, los cut-ins y los primeros planos. El roster mapea
     determinista a las 8 caras (mismo id, misma cara). Rival = camiseta naranja. */
  _bustoIlustrado(j, esRival) {
    const CM = this.game.registry.get("caras");
    if (this.FLAGS.v7_caras === false || !CM || !CM.caras || !CM.caras.length) return null;
    const A = window.PampaAvatar, Arte = window.PampaAvatarArte;
    const look = A.validarLook(j.look || {});
    const esMioElegido = !esRival && (j.esVos || j.esAmigo);
    const idx = esMioElegido
      ? look.cara % CM.caras.length
      : A.hashSemilla((j.nombre || "x") + (esRival ? "|r" : "|m")) % CM.caras.length;
    const cara = CM.caras[idx];
    if (!cara || !this.textures.exists("cara_" + cara.id)) return null;
    /* V7 §0.2: tintes OPCIONALES — el roster va con la ilustración ORIGINAL
       (cada cara ya trae su color propio); VOS/amigos con los tintes elegidos.
       Un tinte de pelo que esta cara no admite (manifest) se trata como Original.
       El RIVAL siempre lleva la camiseta teñida a naranja (identidad de bando). */
    const peloOk = cara.tintes_pelo !== false &&
      !(Array.isArray(cara.tintes_pelo_excluye) && look.tPelo > 0 && cara.tintes_pelo_excluye.indexOf(A.CATALOGO.colores_pelo[look.tPelo - 1].id) >= 0);
    const tPiel = esMioElegido ? look.tPiel : 0;
    const tPelo = esMioElegido && peloOk ? look.tPelo : 0;
    const tCam = esMioElegido ? look.tCam : 0;
    if (!tPiel && !tPelo && !tCam && !esRival) return "cara_" + cara.id;   // Original puro
    const key = "caraT_" + idx + "_" + tPiel + "_" + tPelo + "_" + tCam + (esRival ? "_r" : "");
    if (!this.textures.exists(key)) {
      const hx = s => parseInt(String(s).slice(1), 16);
      const T = cara.tonos || {}, tol = CM.tolerancias || {};
      const CAT = A.CATALOGO;
      const mapa = [];
      if (tPelo > 0 && T.pelo && T.pelo !== T.piel) mapa.push({ de: hx(T.pelo), a: hx(CAT.colores_pelo[tPelo - 1].hex), tol: tol.pelo || 46, y1: cara.pelo_y1 != null ? cara.pelo_y1 : 0.5 });
      if (tPiel > 0 && T.piel) mapa.push({ de: hx(T.piel), a: hx(CAT.pieles[tPiel - 1].hex), tol: tol.piel || 85 });
      if (T.camiseta && (esRival || tCam > 0)) mapa.push({ de: hx(T.camiseta), a: esRival ? 0xFF8A50 : hx(CM.camisetas[(tCam - 1) % CM.camisetas.length].hex), tol: tol.camiseta || 95 });
      Arte.tenirImagen(this, "cara_" + cara.id, key, mapa);
    }
    return this.textures.exists(key) ? key : "cara_" + cara.id;
  }
  retratoKey(j, esRival, expresion) {
    /* EDITOR v2 primero: el busto ilustrado teñido (consistencia total) */
    const busto = j ? this._bustoIlustrado(j, !!esRival) : null;
    if (busto) return busto;
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
    const nom = this.add.text(x, 464, (j.esVos ? "VOS" : (j.nombre || "").toUpperCase().slice(0, 12)), { fontFamily: window.PF.texto, fontSize: "12px", color: "#f6efdc", fontStyle: "bold" }).setOrigin(0.5);
    /* §6: nombre + BARRA de aguante (color por umbral) + número SIEMPRE */
    const max = this.BAL.aguante.max, frac = Phaser.Math.Clamp(gutsVal / max, 0, 1);
    const barCol = frac > 0.5 ? 0x2e7d32 : frac > 0.25 ? 0xf9a825 : 0xc62828;
    const barBg = this.add.rectangle(x, 480, 96, 9, 0x0a1f13, 0.9).setStrokeStyle(1, 0xf6efdc, 0.7);
    const bar = this.add.rectangle(x - 48 + 48 * frac, 480, 96 * frac, 7, barCol, 1);
    const aguante = this.add.text(x, 495, "AGUANTE " + Math.round(gutsVal), { fontFamily: window.PF.texto, fontSize: "11px", color: "#ffd84d" }).setOrigin(0.5);
    this.menuLayer.add([marco, img, nom, barBg, bar, aguante]);
  }

  /* ============ ETAPA 3 · EL MENÚ EN CRUZ con pausa (doc §7/§8/§9) ============ */
  buildBotonAccion() {
    if (!this.FLAGS.e3_menus) return;   // sin menús (flag apagado) no hay botón de acción
    /* Feel B3: 64px o más, etiqueta ⚡ ACCIÓN y PULSO sutil cuando hay acciones */
    /* R1: la columna derecha del HUD entra ENTERA. Estaba en x=866 y el botón
       (188 de ancho) llegaba a 960 clavado: el último píxel del lienzo. Con el
       canto, la sombra (+5) y el pulso al 106% se iba entre 5 y 15px afuera —
       invisible cuando era un rect plano, evidente ahora que tiene cuerpo.
       838 + (94+5)*1.06 = 943, o sea 17px de aire. */
    const cont = this.add.container(838, 456);
    const r = this.add.rectangle(0, 0, 188, 68, 0xffd84d, 1).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
    this.txtBotonAccion = this.add.text(0, 0, "⚡ ACCIÓN", { fontFamily: window.PF.display, fontSize: "14px", color: "#0a1f13" }).setOrigin(0.5);
    cont.add([r, this.txtBotonAccion]);
    /* PIEL P2: canto sólido + sombra difusa. El rect sigue siendo el que recibe
       el toque; solo deja de pintarse (ver vestirBoton en scenes/piel_ui.js). */
    this.vestirBoton(r);
    this.hudLayer.add(cont);
    this._btnAccionCont = cont;
    this._btnPulso = this.tweens.add({ targets: cont, scale: 1.06, duration: 560, yoyo: true, repeat: -1, ease: "Sine.easeInOut", paused: true });
    if (this.input.keyboard && !this.sys.game.device.input.touch) {
      /* PIEL P5: subido de y=498. Ahí abajo ahora viven las dos filas de
         medidores (ENVIÓN en 500, AGUANTE en 522) y este chip las pisaba: se
         acomodó una cosa y se destapó el choque con la otra. Va pegado debajo
         del botón ⚡ACCIÓN, que es a lo que se refiere. */
      this._hintEspacio = this.add.text(838, 428, "ESPACIO = ACCIÓN", { fontFamily: window.PF.texto, fontSize: "10px", color: "#0a1f13", backgroundColor: "#ffd84d" }).setOrigin(0.5);
      this.hudLayer.add(this._hintEspacio);
    }
    r.on("pointerdown", (p, x, y, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); this._uiTocado = this.time.now; this.onBotonAccion(); });
    /* Anime A: botón secundario CHICO de ciclado manual en defensa (48px, mobile) */
    if (this._vista4) {
      const bc = this.add.rectangle(838, 396, 92, 48, 0xdcd6c2, 0.92).setStrokeStyle(2, 0x0a1f13).setInteractive({ useHandCursor: true });
      const bct = this.add.text(838, 396, "⇄ OTRO", { fontFamily: window.PF.texto, fontSize: "12px", color: "#0a1f13", fontStyle: "bold" }).setOrigin(0.5);
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
  /* V6 §2 R4: la VELOCIDAD (Normal/Rápida) solo acorta animaciones y tiempos muertos */
  msV(x) { return this._velRapida ? Math.round(x * 0.62) : x; }
  /* ══════════════════════════════════════════════════════════════════════
     PASADA DE COHERENCIA · EL NOMBRE QUE NO SE PARTE.

     Era .toUpperCase().slice(0, 14) y salia "CULTURAL ARGEN" y "DEPORTIVO
     WINI" — cortado a la mitad de la palabra, y en TRES lugares: el marcador
     de arriba, el cartel del resultado y la pantalla de fin.

     Cortar por caracteres es lo que hace eso. Ahora se corta por PALABRA: si
     no entra entero, se abrevia la primera ("CULT. ARGENTINO") y si aun asi no
     entra, se queda con las palabras que entren. Nunca queda una palabra
     partida al medio.
     ══════════════════════════════════════════════════════════════════════ */
  /* el recorte de nombres vive en logic/piel.js: lo usa el marcador de acá y
     tambien la tabla del master, que tenia el mismo problema. */
  nombreCorto(nombre, tope) {
    var P = window.PampaPiel;
    if (P && P.nombreCorto) return P.nombreCorto(nombre, tope || 14);
    return String(nombre || "").toUpperCase().slice(0, tope || 14);
  }


  /* V6 §2 R4: EL TEMPO se elige ANTES de cada partido — tres presets, una perilla.
     Recuerda la última elección (resaltada); teclas 1/2/3 en la compu. */
  menuTempoSiCorresponde() {
    const T = this.BAL.tempo;
    if (!this.FLAGS.v6_tempo || !T || !T.presets) { this.tutorialSiHaceFalta(); return; }
    let ult = null;
    try { ult = JSON.parse(localStorage.getItem("pampa_tempo") || "null"); } catch (e) { }
    ult = ult || { preset: "intermedio", rapida: false };
    this._velRapida = !!ult.rapida;
    this.estado = "TEMPO_MENU";
    this.st.modo = "congelado";
    const velo = this.add.rectangle(480, 270, 960, 540, 0x06120b, 0.72).setInteractive();
    const tit = this.add.text(480, 74, "⏱ ¿QUÉ PARTIDO JUGAMOS?", { fontFamily: window.PF.display, fontSize: "16px", color: "#ffd84d", stroke: "#0a1f13", strokeThickness: 3 }).setOrigin(0.5);
    const sub = this.add.text(480, 104, "el reloj avanza POR MOMENTOS: cada jugada consume minutos del partido", { fontFamily: window.PF.texto, fontSize: "12px", color: "#f6efdc" }).setOrigin(0.5);
    this.menuLayer.add([velo, tit, sub]);
    const PRESETS = [
      { k: "relampago", n: "⚡ RELÁMPAGO", d: "≈8-10 momentos por tiempo · para un rato corto" },
      { k: "intermedio", n: "★ INTERMEDIO", d: "≈16-18 momentos por tiempo · recomendado" },
      { k: "largo", n: "🕰 LARGO", d: "≈35 momentos por tiempo · el clásico entero" }
    ];
    const elegir = (k) => {
      if (this.estado !== "TEMPO_MENU") return;
      T.minutos_por_momento = T.presets[k] || 2.5;
      try { localStorage.setItem("pampa_tempo", JSON.stringify({ preset: k, rapida: this._velRapida })); } catch (e) { }
      this.limpiarMenu();
      this.estado = "LIBRE";
      this.st.modo = "juego";
      this.avisar("Tempo " + k.toUpperCase() + " · " + T.minutos_por_momento + "' por momento");
      /* V8 A1: LA FICHA DEL PARTIDO — por qué hoy te cuesta (o te sobra) */
      if (this._vidaFicha) this.time.delayedCall(1400, () => this.avisar("📋 " + this._vidaFicha));
      this.tutorialSiHaceFalta();
    };
    const _rects = [];
    PRESETS.forEach((p, i) => {
      /* O1 · los tres presets arrancaban en y=176, o sea ARRIBA: era uno de los
         dos grupos de opciones del juego que no caían en la franja de decisión.
         Ahora se ubican con el helper, que es la misma cuenta en todas las
         pantallas. */
      /* cuatro opciones, no tres: el toggle de VELOCIDAD también es elegir, y
         antes vivía suelto en y=470 pisando al tercer preset apenas se movieron
         a la franja. Entra en el mismo reparto. */
      const y = Math.round(window.PampaPiel.yDeOpcion(i, PRESETS.length + 1, 52, this.BAL.piel));
      const r = this.add.rectangle(480, y, 500, 52, p.k === ult.preset ? 0xffd84d : 0xf6efdc, 0.97).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
      const t = this.add.text(480, y - 9, (i + 1) + " · " + p.n + " (" + T.presets[p.k] + "' por momento)", { fontFamily: window.PF.display, fontSize: "10px", color: "#0a1f13" }).setOrigin(0.5);
      const esUltimo = p.k === ult.preset;
      const d = this.add.text(480, y + 11, p.d + (esUltimo ? "  ·  ✔ el de la vez pasada" : ""),
        { fontFamily: window.PF.texto, fontSize: "10px", color: "#365a41" }).setOrigin(0.5);
      this.menuLayer.add([r, t, d]);
      r.on("pointerdown", (pp, xx, yy, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); this._uiTocado = this.time.now; elegir(p.k); });
      _rects.push({ obj: r, cb: () => elegir(p.k) });
    });
    const yVel = Math.round(window.PampaPiel.yDeOpcion(PRESETS.length, PRESETS.length + 1, 52, this.BAL.piel));
    const vr = this.add.rectangle(480, yVel, 420, 46, 0xdcd6c2, 0.95).setStrokeStyle(2, 0x0a1f13).setInteractive({ useHandCursor: true });
    const vt = this.add.text(480, yVel, "", { fontFamily: window.PF.texto, fontSize: "12px", fontStyle: "bold", color: "#0a1f13" }).setOrigin(0.5);
    const pintarVel = () => vt.setText("🎬 VELOCIDAD: " + (this._velRapida ? "RÁPIDA — animaciones cortas" : "NORMAL"));
    pintarVel();
    this.menuLayer.add([vr, vt]);
    const cambiarVel = () => { this._velRapida = !this._velRapida; pintarVel(); const S = window.PampaSFX; if (S && S.ui) S.ui("mover"); };
    vr.on("pointerdown", (pp, xx, yy, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); this._uiTocado = this.time.now; cambiarVel(); });
    _rects.push({ obj: vr, cb: cambiarVel });
    if (this.input.keyboard) {
      this.input.keyboard.once("keydown-ONE", () => elegir("relampago"));
      this.input.keyboard.once("keydown-TWO", () => elegir("intermedio"));
      this.input.keyboard.once("keydown-THREE", () => elegir("largo"));
    }
    /* ══════════════════════════════════════════════════════════════════════
       EL CURSOR, la primera pantalla donde entra.

       Antes esto era: tres tarjetas, el elegido marcado SOLO por ser amarillo
       —que con daltonismo no se distingue— y tres atajos numéricos sueltos. Sin
       flechas, sin nadie enfocado, sin un sonido.

       Ahora se navega con flechas, el cursor VIAJA de una tarjeta a la otra, la
       enfocada se levanta y las escuadras respiran al latido del mundo. El
       amarillo sigue estando, pero ya no es lo único.

       Arranca en el preset RECOMENDADO, no en el primero: abrir con el foco en
       lo que la mayoría va a elegir ahorra dos toques por partido, y son 18
       partidos por temporada.
       ══════════════════════════════════════════════════════════════════════ */
    /* EL FOCO ARRANCA EN EL QUE ELEGISTE LA VEZ PASADA.
       El preset se guardaba en localStorage y se leia (ult.preset) — y despues
       no lo usaba nadie: la pantalla preguntaba igual y arrancaba siempre en el
       mismo lugar. Otro dato escrito, leido y sin conectar.
       En una temporada de 18 fechas son 18 veces la misma pregunta; que al
       menos arranque donde vos ya dijiste que querias. */
    let iInicial = PRESETS.findIndex(p => p.k === ult.preset);
    if (iInicial < 0) iInicial = PRESETS.findIndex(p => p.k === "intermedio");
    this.grupoFoco(_rects, { inicial: iInicial >= 0 ? iInicial : 0 });
    const Sui = window.PampaSFX; if (Sui && Sui.ui) Sui.ui("abrir");
    this.selloMenu();
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
      this._split ? "3/3 · Te movés y pasás TOCANDO\nEL MAPA de abajo" : (this._vista4 ? "3/3 · Para el PASE, tocá el DESTINO\nDIRECTO sobre la cancha" : "3/3 · Para el PASE, tocá el DESTINO\nen el RADAR de abajo a la izquierda")
    ];
    const ANILLOS = [null, { x: 838, y: 456, w: 210, h: 90 },   /* R1: el botón se movió a 838 */
      this._vista4 ? null : { x: this.radar.x + this.radar.w / 2, y: this.radar.y + this.radar.h / 2, w: this.radar.w + 24, h: this.radar.h + 24 }];
    this.estado = "TUTORIAL";
    this.st.modo = "congelado";
    let paso = 0;
    const velo = this.add.rectangle(480, 270, 960, 540, 0x06120b, 0.55).setInteractive();
    /* R2: la caja iba en y=150, sobre el torso de la ilustración (el panel
       ocupa 30..304) — el mismo vicio que el cartel de FINAL antes del P9.
       Misma solución: FRANJA PROPIA abajo, el dibujo queda limpio. El anillo
       amarillo sí puede subir, porque señala, no escribe. */
    const franjaTut = this.add.rectangle(480, 372, 960, 92, 0x0a1f13, 0.94);
    const lineaTut = this.add.rectangle(480, 328, 960, 2, 0xf5c400, 0.65);
    const caja = this.add.text(480, 362, "", { fontFamily: window.PF.texto, fontSize: "16px", color: "#f6efdc", align: "center", lineSpacing: 6 }).setOrigin(0.5);
    const pie = this.add.text(480, 404, "tocá para seguir ▸", { fontFamily: window.PF.texto, fontSize: "11px", color: "#ffd84d" }).setOrigin(0.5);
    const anillo = this.add.graphics();
    this.menuLayer.add([velo, franjaTut, lineaTut, caja, pie, anillo]);
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
    const t = this.add.text(480, 190, "⏸ ENTRETIEMPO", { fontFamily: window.PF.display, fontSize: "18px", color: "#ffd84d" }).setOrigin(0.5);
    const m = this.add.text(480, 218, "VOS " + st.golesMio + " - " + st.golesRival + " " + this.nombreRival + " · el descanso recupera aguante", { fontFamily: window.PF.texto, fontSize: "12px", color: "#f6efdc" }).setOrigin(0.5);
    /* V9 §10: el cambio de lado SE ANUNCIA — si no, darse vuelta se lee como un bug */
    const c = this.add.text(480, 242, "⇄ CAMBIO DE LADO · ahora atacás para el otro arco", { fontFamily: window.PF.texto, fontSize: "12px", color: "#0a1f13", backgroundColor: "#ffd84d", padding: { x: 8, y: 3 } }).setOrigin(0.5);
    this.hudLayer.add([banda, t, m, c]);
    this.cameras.main.ignore([banda, t, m, c]);
    /* la cancha se da vuelta a la vista: medio segundo de giro y ya está */
    this.tweens.add({ targets: c, scaleX: { from: 0.2, to: 1 }, duration: 420, ease: "Back.easeOut" });
    this.tweens.add({ targets: [banda, t, m, c], alpha: 0, delay: 2100, duration: 500, onComplete: () => { banda.destroy(); t.destroy(); m.destroy(); c.destroy(); } });
  }
  onBotonAccion() {
    const st = this.st, P = window.PampaPartido;
    if (!this.FLAGS.e3_menus || this.estado !== "LIBRE") return;
    if (this._hintEspacio) { this._hintEspacio.destroy(); this._hintEspacio = null; }   // ayuda de primera vez: cumplió
    if (st.posesion === "mia") { st.modo = "congelado"; this.abrirMenuAtaque(null, true); }
    /* V6 §1 F4: ESPACIO es SOLO ACCIÓN, NUNCA cambia de jugador (TAB/⇄ = manual) */
  }
  limpiarMenu() {
    /* B6 · se resolvió: la cámara suelta el acercamiento */
    if (window.PampaFeel) window.PampaFeel.soltar(this);
    /* EL CURSOR SE VA CON EL MENÚ. Se le colgó al shutdown de la escena, pero
       un menú se cierra sin cambiar de escena: quedaba una escuadra dibujada
       encima de la viñeta siguiente. Lo vi recién al capturar con tiempo real —
       midiendo a los pisotones no aparecía, porque el cursor se dibuja de una y
       lo que faltaba era ver la pantalla DESPUÉS. */
    if (this.cerrarFoco) this.cerrarFoco();
    if (window.PampaSFX && window.PampaSFX.ui) window.PampaSFX.ui("cerrar");
    this.menuLayer.removeAll(true); this._menuOps = null; this._menuSel = null; this._menuVolver = null; this._paseCancelar = null; }
  /* FEEL B1 · EL BEAT DE TENSIÓN: el cruce se anuncia 600-900ms ANTES del menú —
     zoom leve, riser, y el que entra al duelo aparece deslizándose al plano */
  beatDeTension(j, esRival, texturaFija, abrir) {
    const F = this.BAL.feel || {};
    /* Feel B6: si viene una MEGACOSA rival, el beat SE ALARGA y el sonido cambia:
       sabés que viene algo grande (pero no cuál) */
    const megaViene = !!this._megaRival;
    const durBeat = this.msV(megaViene ? (F.beat_mega_ms || 1400) : (F.beat_encuentro_ms || 750));
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
      const aviso = this.add.text(480, 130, "⚠ ¡ALGO GRANDE SE VIENE!", { fontFamily: window.PF.display, fontSize: "14px", color: "#ff8a50", stroke: "#0a1f13", strokeThickness: 3 }).setOrigin(0.5);
      this.menuLayer.add(aviso);
      this.selloMenu();
      this.tweens.add({ targets: aviso, scale: 1.12, duration: 300, yoyo: true, repeat: 3 });
    }
    const cam = this.cameras.main;
    if (this._split) {
      /* ══════════════════════════════════════════════════════════════════
         P8 · EL QUITE NECESITA SU MOMENTO.

         Rodri: "cuando alguien va a interceptar no se ve que va".

         Era literal. En la pantalla partida este beat NO DIBUJABA NADA: solo
         sonaba el riser y aparecía un texto. Todo lo visual del beat —la
         entrada corriendo de sprDuelo— pasa en mundoLayer, que tiene
         visible = false desde V7-1 (el mismo hueco que P3).

         Ahora el que sale a buscarla ENTRA AL PANEL: la silueta cruza desde su
         costado, creciendo, con líneas de velocidad detrás. Es el tratamiento
         místico del anime, no una corrida literal — y encaja con que las
         siluetas del panel ya son cómo se representa a los rivales cerca.

         Dura lo que dura el beat, así que no agrega tiempo muerto: es el mismo
         momento que ya existía, ahora visible. */
      this.entradaDelQueVa(j, esRival, durBeat);
    } else {
      /* en la vista elevada el beat se ACERCA más (si no, el zoom no se siente) */
      const extraBeat = (F.beat_zoom_extra || 0.12) * (megaViene ? 1.6 : 1) * (this._vista4 ? (this.VI.zoom_beat_mult || 3) : 1);
      cam.zoomTo(this._zoomBase * (1 + extraBeat), durBeat, "Sine.easeInOut");
    }
    if (this.FLAGS.e6_cine) {
      if (megaViene) this.SFX && this.SFX.riserGrande && this.SFX.riserGrande(durBeat / 1000);
      else this.SFX && this.SFX.riser && this.SFX.riser(durBeat / 1000);
    }
    this.time.delayedCall(durBeat, () => { if (this.estado === "BEAT") abrir(); });
  }
  /* P8 · LA ENTRADA DEL QUE VA A BUSCARLA.
     Una silueta que cruza el panel desde su costado, creciendo, con líneas de
     velocidad detrás. No es la figura del jugador: es su SOMBRA, que es como
     el panel ya representa a los rivales cercanos — y además evita depender de
     una pose que puede no existir.
     Perillas en balance.feel: quite_entrada_ms, quite_lineas, quite_alpha. */
  entradaDelQueVa(j, esRival, durMs) {
    if (!this._split || !this.panelLayer) return false;
    const F = this.BAL.feel || {};
    const dur = Math.max(180, Math.round((F.quite_entrada_ms || 0.8) * durMs));
    const V = this.VI || {};
    const suelo = V.panel_suelo_y != null ? V.panel_suelo_y : 278;
    const techo = V.panel_techo_y != null ? V.panel_techo_y : 34;
    const altoUtil = suelo - techo;

    /* la silueta: la pose de corrida, teñida de negro */
    const key = this.poseKey("corriendo");
    if (!key) return false;
    const desde = esRival ? 960 + 80 : -80;
    const hasta = esRival ? 620 : 340;
    const sil = this.add.image(desde, suelo, key).setOrigin(0.5, 1);
    sil.setTint(0x000000).setAlpha(F.quite_alpha != null ? F.quite_alpha : 0.72);
    sil.setScale((altoUtil * 0.42) / sil.height);
    sil.setFlipX(!esRival);
    this.panelLayer.add(sil);

    /* las líneas de velocidad, detrás y en el sentido de la corrida */
    const g = this.add.graphics();
    this.panelLayer.add(g);
    const nL = F.quite_lineas != null ? F.quite_lineas : 9;
    const dibujarLineas = (x, escala) => {
      g.clear();
      const dir = esRival ? 1 : -1;
      for (let i = 0; i < nL; i++) {
        const y = techo + 20 + (i / nL) * (altoUtil - 40) + ((i * 37) % 11);
        const largo = (60 + (i % 4) * 55) * escala;
        /* P8: la intensidad es perilla — con 0.10 base no se veian */
        const aL = F.quite_lineas_alpha != null ? F.quite_lineas_alpha : 0.5;
        g.lineStyle(2 + (i % 3), 0xf6efdc, aL * (0.35 + 0.65 * escala));
        g.beginPath();
        g.moveTo(x + dir * 40, y);
        g.lineTo(x + dir * (40 + largo), y);
        g.strokePath();
      }
    };

    this.tweens.add({
      targets: sil, x: hasta, scale: sil.scale * 1.35,
      duration: dur, ease: "Quad.easeIn",
      onUpdate: (tw) => { dibujarLineas(sil.x, tw.progress); },
      onComplete: () => {
        this.tweens.add({
          targets: sil, alpha: 0, duration: 160,
          onComplete: () => { sil.destroy(); g.destroy(); }
        });
      }
    });
    return true;
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
    /* ── B6 · LA CÁMARA CON INTENCIÓN ──────────────────────────────────
       Un acercamiento lento y continuo MIENTRAS se decide algo. No es un zoom
       de golpe: es el movimiento que le avisa al cuerpo del jugador que algo va
       a pasar. Al resolverse, suelta. El escalón manda: en el trámite la cámara
       no se mueve, porque el push se gasta si se usa siempre — igual que el
       shake. */
    if (window.PampaFeel) {
      window.PampaFeel.empujar(this, this._escalonActual || 2);
    }
    const strip = this.add.rectangle(480, 404, 960, 216, 0x0a1f13, 0.42);
    const tit = this.add.text(480, 306, cfg.titulo, { fontFamily: window.PF.texto, fontSize: "13px", color: "#f6efdc", backgroundColor: "#0a1f13cc", padding: { x: 8, y: 3 }, align: "center", wordWrap: { width: 660 } }).setOrigin(0.5);
    this.menuLayer.add([strip, tit]);
    if (cfg.izq) this.retratoPanel(104, cfg.izq.j, !!cfg.izq.esRival, cfg.izq.aguante);
    if (cfg.der) this.retratoPanel(856, cfg.der.j, cfg.der.esRival !== false, cfg.der.aguante);
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
      /* B2 · la apertura del menú también lleva anticipación y rebote */
      if (window.PampaFeel) window.PampaFeel.aparecer(this, r, { x: x, y: y, scale: 1, desdeX: 480 }, 2);
      const subTxt = op.bloqueada ? ("▨ " + (op.motivo || "no disponible")) : op.sub;
      const t = this.add.text(x, y - (subTxt ? 9 : 0), op.texto, { fontFamily: window.PF.display, fontSize: "10px", color: op.bloqueada ? "#9aa59d" : "#0a1f13" }).setOrigin(0.5);
      this.menuLayer.add([r, t]);
      if (subTxt) { const s = this.add.text(x, y + 13, subTxt, { fontFamily: window.PF.texto, fontSize: "10px", color: op.bloqueada ? "#c76a5e" : "#365a41" }).setOrigin(0.5); this.menuLayer.add(s); }
      if (!op.bloqueada) {
        r.setInteractive({ useHandCursor: true });
        r.on("pointerdown", (p, xx, yy, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); this._uiTocado = this.time.now; op.cb(); });
      }
      this._menuBtns[dir] = r;
    });
    /* opción del CENTRO (p.ej. 🔥 CALDÉN cuando está disponible, sin pisar el TIRO) */
    if (cfg.centro) {
      const c = this.add.rectangle(480, 405, 150, 50, 0xff8c3a, 0.97).setStrokeStyle(2, 0x0a1f13).setInteractive({ useHandCursor: true });
      const ct = this.add.text(480, 398, cfg.centro.texto, { fontFamily: window.PF.display, fontSize: "10px", color: "#0a1f13" }).setOrigin(0.5);
      const cs = this.add.text(480, 416, cfg.centro.sub || "", { fontFamily: window.PF.texto, fontSize: "10px", color: "#5a2d12" }).setOrigin(0.5);
      this.menuLayer.add([c, ct, cs]);
      c.on("pointerdown", (p, xx, yy, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); this._uiTocado = this.time.now; cfg.centro.cb(); });
    }
    if (cfg.volver) {
      this._menuVolver = cfg.volver;
      const v = this.add.rectangle(906, 306, 64, 48, 0xdcd6c2, 0.95).setStrokeStyle(2, 0x0a1f13).setInteractive({ useHandCursor: true });
      const vt = this.add.text(906, 306, "✕", { fontFamily: window.PF.texto, fontSize: "18px", color: "#0a1f13" }).setOrigin(0.5);
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
      izq: { j: st.mios[st.ctrl], aguante: st.mios[st.ctrl].aguante },
      der: rival ? { j: rival, aguante: st.aguanteRival } : null,
      opciones: {
        W: { texto: "➡ PASE", sub: "elegí destino en el radar", cb: () => this.iniciarPaseDirigido(rivalIdx, libre) },
        N: (() => {
          /* V6 §3.4, cableada recién en C4: igual que el uno-dos crece a
             COMBINADA en el sur, la gambeta crece a MEGACORRIDA acá. Estaba
             implementada entera (secuenciaMegacorrida, con sus tres perillas en
             balance.secuencias) pero NADIE se la pedía nunca: el único llamador
             de secuenciaDisponible() preguntaba solo por "combinada", así que
             la rama "megacorrida" de esa misma función era inalcanzable. Lo
             cazó la auditoría de huérfanos; no era código muerto, era un cable
             suelto — una función declarada hecha que nunca se pudo ver jugando. */
          const sec = !libre ? this.secuenciaDisponible("megacorrida") : null;
          if (sec && !gam.bloqueada) {
            return { texto: "🌠 MEGACORRIDA", sub: sec.costo + " aguante · se te van quedando atrás", cb: () => this.secuenciaMegacorrida() };
          }
          return {
            texto: "⚡ GAMBETA", sub: libre ? "seguís corriendo" : "~" + pct(gam) + "% · " + gam.costo + " aguante", bloqueada: !libre && gam.bloqueada, motivo: gam.motivo,
            cb: () => libre ? this.reanudarLibre() : this.resolverAccionAtaque(gam, rivalIdx)
          };
        })(),
        S: (() => {
          /* V6 §3.4: con la progresión, el uno-dos crece a JUGADA COMBINADA (el compa define) */
          const sec = this.secuenciaDisponible("combinada");
          if (sec && !par.bloqueada) return { texto: "🤝 COMBINADA", sub: sec.costo + " aguante · él define", cb: () => this.secuenciaCombinada() };
          return { texto: "🔁 UNO-DOS", sub: par.bloqueada ? null : "~" + pct(par) + "% · " + par.costo + " aguante", bloqueada: par.bloqueada, motivo: par.motivo, cb: () => this.resolverAccionAtaque(par, rivalIdx) };
        })(),
        E: { texto: "🎯 TIRO", sub: puedeT ? "~" + pct(tir) + "% de zafar · " + this.BAL.aguante.costo_tiro + " aguante" : null, bloqueada: !puedeT || tir.bloqueada, motivo: !puedeT ? "desde campo propio no llega" : tir.motivo, cb: () => this.resolverTiro(false, rivalIdx, libre) }
      },
      /* C3 · LAS TRES OPCIONES DE REMATE, no cuatro ni cinco:
           TIRO (E, normal) · MEGATIRO (centro) · GAMBETA-TIRO (botón de arriba).
         El MEGATIRO es la secuencia épica completa: corrida vertical en
         perspectiva + remate con la mega animación. Gasta ficha de tiro. */
      centro: (() => {
        const F = this.jugadonFichas ? this.jugadonFichas() : null;
        /* D1 · si el megatiro no está disponible, el centro es TU CARTA de
           ataque. No compiten: el megatiro es la secuencia del jugadón (gasta
           ficha y te lleva a otra pantalla) y la carta es un golpe adentro de
           este menú. Cuando están los dos, manda el megatiro, que es el más
           raro de ver. */
        if ((!megaListo || !F || F.tiros <= 0) && this.centroDeCarta) {
          const cc = this.centroDeCarta("ataque", () => {
            const c = (this.manoActual() || []).map(m => m.carta).find(c2 => c2.clase === "ataque");
            if (!c) { this.reanudarLibre(); return; }
            if (c.efecto === "poder_tiro") this.resolverTiro(false, rivalIdx, libre);
            else if (c.efecto === "zona_segura") this.resolverTiro(false, rivalIdx, libre);
            else if (c.efecto === "pase_seguro" || c.efecto === "pase_largo") this.iniciarPaseDirigido(rivalIdx, libre);
            else this.reanudarLibre();
          });
          if (cc) return cc;
        }
        if (!megaListo || !F || F.tiros <= 0) return null;
        /* N2 · EL AVISO. Lo que hace que la adaptación sea una decisión y no
           una trampa: si te tienen leído el especial, lo decimos ACÁ, cuando
           lo estás por elegir, no después de que falle. */
        const leido = this.avisoLectura(megaListo.id);
        return {
          texto: "🔥 " + megaListo.n.toUpperCase().slice(0, 15),
          sub: leido ? leido + " · ficha (quedan " + F.tiros + ")"
            : "encarás y definís · ficha (quedan " + F.tiros + ")",
          cb: () => {
            if (!window.PampaJugadon.gastarFicha(F, "tiros")) return;
            this.entrarJugadonGambeta(rivalIdx, { mega: megaListo, marcadores: 3 });
          }
        };
      })(),
      volver: libre ? () => this.reanudarLibre() : null
    });
    /* V8 fix 1 (auditoría de Rodri): las FICHAS se OFRECEN SIEMPRE que queden
       — el recurso épico no depende del momento justo, no del momento ideal.

       C4 · CORRECCIÓN DE ESTE COMENTARIO. Decía "pueden verse los DOS botones"
       (gambeta y súper tiro) y hace rato que es UNO solo: el súper tiro suelto
       se retiró en C3 —rematar sin encarar ya es el TIRO normal— y en V9 §5 se
       le sacó la grilla de zonas. Un comentario que describe una pantalla que
       no existe manda a buscar bugs donde no hay ninguno. */
    /* C3 · la única ficha que se ofrece acá: GAMBETA-TIRO (encarar y definir). */
    if (this.botonJugadon && this.jugadonFichas) {
      const F = this.jugadonFichas();
      if (F.gambetas > 0) {
        this.botonJugadon("🌟 GAMBETA-TIRO (quedan " + F.gambetas + ")", "encarás en la corrida y definís de frente al arco", () => {
          if (window.PampaJugadon.gastarFicha(F, "gambetas")) this.entrarJugadonGambeta(rivalIdx, { marcadores: 2 });
        }, 0);
      }
    }
  }
  abrirMenuDefensa() {
    const st = this.st, P = window.PampaPartido;
    const rival = st.rivales[st.portadorRival];
    this.materializarDuelo(st.mios[st.ctrl], false);   // tu marcador entra a cámara
    const acc = P.accionesDefensa(st);
    const A = id => acc.find(a => a.id === id) || { bloqueada: true, motivo: "no disponible", poder: 0, costo: 0 };
    const pct = a => Math.round(window.PampaDuel.duelChance(a.poder, P.poderRival(st) + 4, this.BAL.duelo) * 100);
    const qui = A("quite"), cor = A("corte"), blo = A("bloqueo");
    const sub = a => a.bloqueada ? null : "~" + pct(a) + "% · " + a.costo + " aguante";
    /* el slot sube a MEGADEFENSA si hay una de ese tipo y la acción base no
       está bloqueada; si no, queda la acción de siempre, igual que antes */
    const yo = st.mios[st.ctrl];
    const megaDe = (tipo, base, texto) => {
      const mg = this.megaDefensaDisponible([tipo], yo);
      if (!mg || base.bloqueada) return { texto, sub: sub(base), bloqueada: base.bloqueada, motivo: base.motivo, cb: () => this.resolverAccionDefensa(base) };
      return {
        texto: "🔥 " + mg.n.toUpperCase(),
        sub: mg.aguante + " aguante · +" + mg.bonus + " de poder",
        cb: () => this.cutInEspecial("¡" + mg.n.toUpperCase() + "!", mg.grito,
          () => this.resolverAccionDefensa({ id: base.id, poder: base.poder + mg.bonus, costo: mg.aguante }), yo, false)
      };
    };
    this.abrirMenuCruz({
      titulo: "🛡 ¡" + this.nombreRival + " avanza! Adivinale la intención (solo ves TUS números)",
      /* §6 literal: ATACANTE a la izquierda, defensor a la derecha */
      izq: { j: rival, esRival: true, aguante: st.aguanteRival },
      der: { j: st.mios[st.ctrl], esRival: false, aguante: st.mios[st.ctrl].aguante },
      opciones: {
        W: { texto: "✂ CORTE", sub: sub(cor), bloqueada: cor.bloqueada, motivo: cor.motivo, cb: () => this.resolverAccionDefensa(cor) },
        /* ══════════════════════════════════════════════════════════════════
           LAS MEGADEFENSAS TENÍAN DATOS, GRITO, BONUS Y NIVEL — Y NINGUNA PUERTA.

           En D1 el centro de esta cruz dejó de ser el SUPERBLOQUEO y pasó a ser
           TU CARTA, con buen motivo. Pero ahí se quedaron sin llamador ¡PAMPERO!
           (tipo quite) y ¡MÉDANO! (tipo bloqueo): el único sitio de todo el
           juego que preguntaba por megaDefensaDisponible era la definición, y
           preguntaba por "atajada". Dos de las tres, invisibles para siempre, y
           encima escondidas atrás del nivel clavado en 1.

           No vuelven al centro — la carta se lo ganó. SUBEN de nivel el mismo
           slot, que es el idioma que ya usa el ataque: la gambeta crece a
           MEGACORRIDA y el uno-dos a COMBINADA en su propio lugar de la cruz.
           ══════════════════════════════════════════════════════════════════ */
        N: megaDe("quite", qui, "🦶 QUITE"),
        E: megaDe("bloqueo", blo, "🧱 BLOQUEO"),
        S: { texto: "⏳ NO MOVERSE", sub: "+" + this.BAL.aguante.recupera_no_moverse + " aguante · el rival sigue", cb: () => this.resolverNoMoverse() }
      },
      /* ══════════════════════════════════════════════════════════════════
         D1 · ACÁ ESTABA EL SUPERBLOQUEO Y AHORA ESTÁ TU CARTA.

         La megadefensa preguntaba "¿tenés nivel y aguante?" — o sea, era del
         EQUIPO, y el puesto del que controlabas no decía nada. La carta
         pregunta "¿quién sos?": el defensor tiene LA BARRIDA, el volante LA
         PRESIÓN, el arquero LA TRANQUERA, y el delantero no tiene ninguna de
         recuperación, así que defendiendo con él el centro queda vacío.

         Eso último no es una falta, es el punto entero: si querés la barrida,
         tenés que estar en el defensor. Elegir a quién le pasás pasa a
         significar algo.

         El mismo lugar, otra ley. Es el centro de la cruz de siempre. */
      centro: this.centroDeCarta ? this.centroDeCarta("recuperacion", () => {
        const c = (this.manoActual() || []).map(m => m.carta).find(c2 => c2.clase === "recuperacion");
        const base = (c && c.efecto === "bonus_atajada") ? blo : qui;
        this.resolverAccionDefensa({ id: base.id, poder: base.poder + ((c && c.valor) || 20), costo: 0 });
      }) : null
    });
    /* V8 §3: el SÚPER QUITE del jugadón (ficha defensiva) */
    if (this.botonJugadon && this.jugadonFichas) {
      const F = this.jugadonFichas();
      if (F.quites > 0) {
        this.botonJugadon("🌟 SÚPER QUITE (quedan " + F.quites + ")", "te metés en su jugada: leé su movida y cerrale el camino", () => {
          if (window.PampaJugadon.gastarFicha(F, "quites")) this.entrarJugadonQuite();
        });
      }
    }
  }
  /* qué MEGADEFENSA está disponible para ese jugador (data + nivel + aguante) */
  megaDefensaDisponible(tipos, j) {
    const nivel = this._nivelCarrera || 1;
    const lista = ((this.MEGA && this.MEGA.megadefensas) || []).filter(m =>
      tipos.indexOf(m.tipo) >= 0 && nivel >= (m.nivel || 1) && j && j.aguante >= (m.aguante || 250));
    return lista.length ? lista[lista.length - 1] : null;
  }

  /* --- resoluciones (doc §7: el CPU eligió en secreto; §9: RESOLUCION sin input) --- */
  resolverAccionAtaque(a, rivalIdx) {
    const st = this.st, P = window.PampaPartido;
    /* Feel B6: si el rival vino con megacosa, pega en este duelo (y la paga) */
    const megaR = this._megaRival; this._megaRival = null;
    const r = P.resolverDuelo(st, { accion: a.id, poder: a.poder, costo: a.costo, bonusRival: megaR ? megaR.bonus : 0 });
    if (megaR) st.aguanteRival = Math.max(0, st.aguanteRival - megaR.aguante * (this.BAL.aguante.cpu_factor_costo || 1));
    /* ANIME B (P2): la GAMBETA se VE — el que encara en pose, el que queda atrás */
    const rivalJ = rivalIdx != null ? st.rivales[rivalIdx] : st.rivales[st.portadorRival];
    if (r.win) {
      P.ganarAtaque(st, a.id, rivalIdx);   // R2: el gambeteado queda pagando atrás
      /* V9 §3: la gambeta ganada SIEMPRE tiene su viñeta (antes, si el rival
         venía con megacosa, se comía la escena y quedaba un cartel), y la
         PARED tiene la suya en vez de resolverse en texto */
      if ((a.id === "gambeta" || a.id === "pared") && this.hayEscenas() && rivalJ) {
        const esPared = a.id === "pared";
        const mostrar = () => this.escenaCine({
          etiqueta: esPared ? "· la pared ·" : "· la gambeta ·",
          prota: { j: st.mios[st.ctrl], esRival: false, anim: esPared ? "pase" : "gambeta" },
          pose: esPared ? "pared" : "gambeta_gana",            // ARTE 2: el quiebre limpio
          rival: { j: rivalJ, esRival: true, anim: "pase" },   // el rival queda barrido atrás
          gana: true, sfx: "whoosh",
          titulo: esPared ? "¡PARED Y A SEGUIR!" : (megaR ? "¡LE GANASTE AL " + megaR.n.toUpperCase() + "!" : "¡LO DEJASTE PAGANDO!"),
          sub: this.subConPorQue(esPared ? "toque, devolución y seguís de largo"
            : (r.matriz === "zafaste" ? "le erraron a la marca y seguís de largo" : "puro coraje: seguís de largo"), r),
          alFinal: () => this.relatar("gambeta_win")
        });
        /* con megacosa rival: primero el cut-in del rival, después la viñeta */
        if (megaR) this.cutInEspecial("¡" + megaR.n.toUpperCase() + "!", megaR.grito, mostrar, rivalJ, true);
        else mostrar();
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
        /* la variante "perdés": VOS trastabillando (gambeta_pierde), la barrida atrás */
        this.escenaCine({
          etiqueta: "· la gambeta ·", accion: "gambeta",
          prota: { j: st.mios[st.ctrl], esRival: false, anim: "gambeta" },
          pose: "gambeta_pierde",                              // ARTE 2: el trastabille
          rival: { j: rivalJ, esRival: true, anim: "pase" },
          gana: false, color: 0xe3503e, sfx: "gloves",
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
      /* BLOQUE A · el quite fuera del área es TRÁMITE: se resuelve en la
         cancha y no corta. Adentro del área sube a jugada y sí se ve — es la
         diferencia entre robarla en el mediocampo y salvarla sobre la línea. */
      if (a.id === "quite" && this.hayEscenas() && rivalJ && this.escalonDe("quite", rivalJ)) {
        /* "la defendés": el RIVAL trastabilla (gambeta_pierde ESPEJADA) y vos abajo */
        this.escenaCine({
          etiqueta: "· el quite ·", accion: "quite_area",
          prota: { j: rivalJ, esRival: true, anim: "gambeta" },
          pose: "gambeta_pierde", poseFlip: true,              // ARTE 2: espejo — pierde él
          rival: { j: st.mios[st.ctrl], esRival: false, anim: "pase" },
          /* G2: sin esto el defensor salía con pose_pared — el toque de primera,
             que es una pose de ATAQUE. Medido contando figuras en la escena.
             Va barrida, que además es lo que dice el subtítulo ("te tiraste al
             piso"). No hay pose de "quite" en assets/poses: ver pedidos de arte. */
          poseRival: "barrida",
          gana: true, color: 0x7ee08a, sfx: "gloves",
          titulo: "¡RECUPERASTE!",
          sub: this.subConPorQue(r.matriz === "leiste" ? "le leíste la intención y te tiraste al piso" : "llegaste primero a la pelota", r),
          alFinal: () => this.relatar("quite_win")   // V9 §8: recuperar ya no es mudo
        });
        return;
      }
      if (a.id === "bloqueo" && this.hayEscenas()) {
        /* ARTE 2: el BLOQUEO defensivo plantado tiene su pose propia */
        this.escenaCine({
          etiqueta: "· el bloqueo ·", accion: "bloqueo",
          prota: { j: st.mios[st.ctrl], esRival: false, anim: "pase" },
          pose: "bloqueo",
          rival: rivalJ ? { j: rivalJ, esRival: true, anim: "tiro" } : null,
          gana: true, sfx: "gloves",
          titulo: "¡BLOQUEADO!",
          sub: this.subConPorQue(r.matriz === "leiste" ? "sabías que venía el tiro" : "pusiste el cuerpo donde dolía", r),
          alFinal: () => this.relatar("quite_win")
        });
        return;
      }
      if (this.hayEscenas() && this.escalonDe("corte", rivalJ)) {
        /* V8 D: el CORTE también se VE arriba (antes se resolvía en texto).
           BLOQUE A: solo si es en zona de peligro; el corte en el mediocampo
           es trámite y se resuelve en la cancha. */
        this.escenaCine({
          etiqueta: "· el corte ·", accion: "corte",
          prota: { j: st.mios[st.ctrl], esRival: false, anim: "pase" },
          pose: "barrida", rapida: true,
          rival: rivalJ ? { j: rivalJ, esRival: true, anim: "pase" } : null,
          /* G2: los dos salían barriéndose. El que perdió el pase no se barre:
             queda descolocado. */
          poseRival: "gambeta_pierde",
          gana: true, color: 0x7ee08a, sfx: "gloves",
          titulo: "¡LA CORTASTE!",
          sub: this.subConPorQue(r.matriz === "leiste" ? "le leíste la línea de pase" : "metiste la pierna a tiempo", r),
          alFinal: () => this.relatar("quite_win")
        });
        return;
      }
      this.mostrarResolucion("¡RECUPERASTE!" + (r.matriz === "leiste" ? "\n(le leíste la intención)" : ""), "#7ee08a", { anim: "quite", gana: true });
    }
    else {
      P.perderDefensa(st);
      /* V9 §3 · TODA defensa fallada se VE — antes solo el quite tenía escena
         y el BLOQUEO FALLIDO (el peor caso: te tirás y el rival se te va) se
         resolvía con un renglón de texto sobre el panel congelado. Mismo molde
         para las tres: el rival de protagonista, quebrando para el otro lado. */
      if (this.hayEscenas() && rivalJ) {
        const T = {
          quite: {
            et: "· te la hicieron ·",
            ti: r.matriz === "teEngano" ? "¡TE AMAGÓ!" : "SE TE ESCAPÓ",
            su: r.matriz === "teEngano" ? "el amague te dejó pagando" : "te ganó por velocidad pura"
          },
          bloqueo: {
            et: "· el bloqueo ·",
            ti: "¡SE TE FUE!",
            su: "te tiraste al bloqueo y te la sacó del pie"
          },
          corte: {
            et: "· el corte ·",
            ti: "¡TE LA PEINÓ!",
            su: "metiste la pierna tarde y la pelota siguió"
          }
        };
        const t = T[a.id] || { et: "· te la hicieron ·", ti: "SE TE ESCAPÓ", su: "quedaste atrás de la jugada" };
        this.escenaCine({
          etiqueta: t.et,
          prota: { j: rivalJ, esRival: true, anim: "gambeta" },
          pose: "gambeta_gana", poseFlip: true,                // ARTE 2: espejo — gana él
          rival: { j: st.mios[st.ctrl], esRival: false, anim: "pase" },
          /* G2: mismo caso que el quite ganado — el que se quedó pagando salía
             con la pose de la pared. Barrida en el bloqueo (te tiraste y te la
             sacó del pie) y en el corte; en el quite fallado quedaste parado. */
          poseRival: a.id === "quite" ? "corriendo" : "barrida",
          gana: true, color: 0xe3503e, sfx: "whoosh",
          titulo: t.ti, sub: this.subConPorQue(t.su, r),
          alFinal: () => this.relatar("gambeta_lose")
        });
        return;
      }
      this.mostrarResolucion(r.matriz === "teEngano" ? "TE ENGAÑÓ CON EL AMAGUE…" : "SE TE ESCAPÓ POR VELOCIDAD…", "#e3503e", { anim: "quite", gana: false });
    }
  }
  resolverNoMoverse() {
    const st = this.st, P = window.PampaPartido;
    const r = P.esperarDefensa(st);
    this.mostrarResolucion("Esperás y juntás aire (+" + r.recupero + " aguante).\nEl rival sigue…", "#f6efdc", null);
  }
  resolverTiro(esCalden, rivalIdx, libre) {
    const st = this.st, P = window.PampaPartido;
    if (!libre && rivalIdx != null) {
      /* la matriz manda: primero zafar del BLOQUEO del defensor (con su megacosa si vino) */
      const megaR = this._megaRival; this._megaRival = null;
      const acc = P.accionesAtaque(st).find(a => a.id === "tiro");
      const r = P.resolverDuelo(st, { accion: "tiro", poder: acc ? acc.poder : 50, costo: 0, bonusRival: megaR ? megaR.bonus : 0 });
      if (megaR) st.aguanteRival = Math.max(0, st.aguanteRival - megaR.aguante * (this.BAL.aguante.cpu_factor_costo || 1));
      if (!r.win) {
        P.perderPelota(st);
        if (megaR) {
          const rival = st.rivales[rivalIdx];
          this.cutInEspecial("¡" + megaR.n.toUpperCase() + "!", megaR.grito, () => {
            this.mostrarResolucion(megaR.grito + "\n¡Te tapó el tiro con un movimiento especial!", "#e3503e", { anim: "gambeta", gana: false });
          }, rival, true);
        } else {
          /* ══════════════════════════════════════════════════════════════
             A2 · "PATEO Y NO HAY ANIMACIÓN", TERCERA VEZ.

             Medido: de las cinco salidas de resolverTiro(), ésta era la única
             que NO pasaba por escenaCine. Apretabas TIRO, el defensor ganaba
             el duelo y lo único que aparecía era un renglón de texto — con
             anim "gambeta", que además es la animación equivocada: nadie
             gambeteó, te taparon.

             Por eso lo veía intermitente y "cuando estoy por ser marcado":
             depende de si ganás el duelo, que es una tirada. Mismo tiro,
             misma posición, a veces se ve y a veces no.

             Ahora tiene su escena, con el DEFENSOR de protagonista y la pose
             de bloqueo, que ya existía en el manifest y no la usaba nadie
             para esto. */
          const rivalJ = rivalIdx != null ? st.rivales[rivalIdx] : null;
          this.escenaDelBloqueo(rivalJ, {
            titulo: r.matriz === "leyeron" ? "¡TE LO LEYERON!" : "¡TE LO TAPARON!",
            sub: r.matriz === "leyeron" ? "Sabían que ibas a patear." : "Se le tiró encima. Pelota de ellos.",
            desenlace: "despeje",
            relato: r.matriz === "leyeron" ? "bloqueo_leido" : "bloqueo"
          });
        }
        return;
      }
    }
    const mega = (esCalden && typeof esCalden === "object") ? esCalden : (esCalden ? this.megaDisponible() : null);
    /* V8 B (playtest): EL TIRO NORMAL VUELVE A SER POR COMANDOS — sin posicionarse,
       sin elegir zona, sin barra. Elijo → ANIMACIÓN → INTRIGA (la pelota
       viajando) → resultado. Lo decisivo es DESDE DÓNDE disparaste; la zona la
       elige el juego (logic/tiro.js tiroAuto). El flag v8_tiro_comandos=false
       devuelve LA DEFINICIÓN de 4 fases, para comparar. */
    /* B2 · DISPARADOR 2 · EL REMATE DESDE AFUERA. La distancia al arco ya la
       usa el partido para decidir si el tiro llega; acá decide además si el
       remate merece cambiar de plano. Desde adentro del área no: ahí ya hay
       viñeta propia y dos cortes seguidos se pisarían. */
    (() => {
      const j = st.mios[st.ctrl];
      if (j) this.quizasProfundo("tiro", { distanciaArco: Math.abs(st.W - j.x) }, { rival: true });
    })();
    if (!mega && this.FLAGS.v8_tiro_comandos !== false) { this.tiroPorComandos(rivalIdx); return; }
    if (!mega && this.FLAGS.v6_definicion) {
      this.entrarDefinicionOf({ rivalIdx: rivalIdx, libre: libre });
      return;
    }
    if (mega && this.FLAGS.e6_cine) {
      /* FEEL B5 · MEGATIRO: anuncio con cut-in y carga → ejecución exigente → CINE de 5 planos */
      this.cutInEspecial("¡" + mega.n.toUpperCase() + "!", (mega.sub || "") + " · " + mega.aguante + " aguante", () => {
        this.dispararConCine(mega, this.ejDeLaSituacion(mega));
      });
    } else {
      this.dispararSimple(mega, this.ejDeLaSituacion(mega));
    }
  }
  /* ============ ANIME v4 Bloque F · LA DECISIÓN AÉREA ============
     El pase largo llega ALTO: cabezazo / volea / chilena (o bajarla y jugar).
     La chilena exige juego aéreo alto y 250 aguante — y tiene la escena más
     espectacular del juego. LA DEFINICIÓN aplica con ventanas más chicas. */
  abrirMenuAereo() {
    const st = this.st, P = window.PampaPartido;
    st.modo = "congelado";
    const acc = P.accionesAereas(st);
    const A = id => acc.find(a => a.id === id) || { bloqueada: true, motivo: "no disponible", poder: 0, costo: 0 };
    const cab = A("cabezazo"), vol = A("volea"), chi = A("chilena");
    const sub = a => a.bloqueada ? null : "~" + Math.round(a.poder) + " de poder · " + a.costo + " aguante";
    this.abrirMenuCruz({
      titulo: "☁ ¡LA PELOTA VIENE ALTA! ¿Cómo la resolvés? (ventanas más exigentes)",
      izq: { j: st.mios[st.ctrl], aguante: st.mios[st.ctrl].aguante },
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
    /* V9 §4: sin aguja. Lo que antes era "ventana más chica" (chilena 0.12,
       aéreo 0.17) ahora es un penal directo a la zona: el remate difícil es
       difícil por lo que es, no porque te pidan reflejos. */
    const F = this.BAL.feel || {};
    const penal = id === "chilena" ? { bonus: 5, fuera: 0.1 } : { bonus: 3, fuera: 0.06 };
    this.dispararAereo(id, this.ejDeLaSituacion(null, penal));
  }
  dispararAereo(id, ej) {
    const st = this.st, P = window.PampaPartido;
    const tirador = st.mios[st.ctrl];
    const enCamino = this.rivalesEnElCamino(tirador);
    const prep = P.prepararRemateAereo(st, id);
    const res = window.PampaDuel.resolveShot({
      shotPower: prep.shotPower, keeperSkill: prep.keeperSkill, zone: ej.zona,
      cfg: { spread: this.BAL.duelo.spread, min: this.BAL.duelo.min, max: this.BAL.duelo.max },
      /* G1: la distancia pesa acá, despues del tope del duelo */
      distancia: prep.distancia, especial: prep.especial, tiro: this.BAL.tiro,
      penalizaciones: prep.penalizaciones
    });
    const snd = this.FLAGS.e6_cine ? this.SFX : null;
    snd && snd.kick();
    const gol = res.outcome === "gol";
    const atajo = res.outcome === "atajada" || res.outcome === "corner";
    const d = this.desenlaceRemate(res);
    const NOM = { cabezazo: "CABEZAZO", volea: "VOLEA", chilena: "CHILENA" };
    const fb = ej.lecturaTexto || (ej.enZona ? "le pegó bien parado" : "le pegó como pudo");
    if (this.hayEscenas()) {
      const arqR = st.rivales.find(jj => jj.pos === "ARQ");
      this.escenaCine({
        etiqueta: id === "chilena" ? "· LA CHILENA ·" : "· " + NOM[id].toLowerCase() + " ·",
        /* V9 B3: la CHILENA usa la pose de chilena. Antes mandaba anim "volea",
           que mapea a "remate", y la pose ilustrada de la chilena no se veía nunca */
        prota: { j: tirador, esRival: false, anim: id },
        pose: id === "chilena" ? "chilena" : (id === "cabezazo" ? "cabezazo" : "remate"),
        protaAngle: id === "chilena" ? -115 : 0,       // la vuelta en el aire
        especial: id === "chilena",
        /* V6 §1 F2: ante todo tiro al arco el arquero vuela, sin excepciones */
        rival: arqR ? { j: arqR, esRival: true, anim: res.outcome === "atajada" ? "atajada" : "estirada" } : null,
        siluetas: enCamino,
        gana: gol,
        poseFinalProta: gol ? "festejo" : undefined,
        titulo: gol ? "¡GOOOL DE " + NOM[id] + "!" : d.titulo,
        sub: gol ? (id === "chilena" ? "el momento más épico del potrero · " + fb : fb) : d.sub + " · " + fb,
        color: d.color,
        sfx: gol ? "goal" : (atajo ? "gloves" : "afuera"),
        hinchada: gol,
        alFinal: () => {
          if (gol) this.efectoGol(false);
          this.relatar(gol ? "gol" : (atajo ? "atajada" : "afuera"), { jugador: tirador.esVos ? "VOS" : tirador.nombre });
        }
      });
      return;
    }
    this.mostrarResolucion((gol ? "¡GOOOL DE " + NOM[id] + "!" : d.titulo) + "\n" + fb,
      "#" + d.color.toString(16).padStart(6, "0"), { anim: id === "cabezazo" ? "cabezazo" : "volea", gana: gol });
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
    this.cineBig = this.add.text(W / 2, H / 2 - 20, "", { fontFamily: window.PF.display, fontSize: "48px", color: "#ffd84d", stroke: "#9c2b1d", strokeThickness: 4 }).setOrigin(0.5).setAlpha(0); this.cineLayer.add(this.cineBig);
    this.cineSub = this.add.text(W / 2, H / 2 + 34, "", { fontFamily: window.PF.texto, fontSize: "16px", color: "#f6efdc" }).setOrigin(0.5).setAlpha(0); this.cineLayer.add(this.cineSub);
    this.cineLabel = this.add.text(16, H - 24, "", { fontFamily: window.PF.texto, fontSize: "12px", color: "#f6efdcaa" }); this.cineLayer.add(this.cineLabel);
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
    /* B3: los dos fallbacks de acá devolvían "cine_jugador", el muñequito de
       bloques. Era uno de los caminos por los que el bug volvía: cualquier
       jugador sin look —o un arranque donde PampaAvatarArte todavía no estaba—
       metía bloques en medio de las ilustraciones. Ahora cae a una pose
       ilustrada y nunca a bloques. */
    if (!j) return this.figuraCine("corriendo", "texturaCineJugador(sin jugador)");
    /* EDITOR v2: el primer plano del esfuerzo es TU busto ilustrado teñido */
    const busto = this._bustoIlustrado(j, false);
    if (busto) return busto;
    if (!j.look) return this.figuraCine("corriendo", "texturaCineJugador(sin look)");
    /* B3: acá se llamaba a PampaAvatarArte.cineJugador(), que dibuja el
       muñequito. Si no hay busto ilustrado, el primer plano va con tu pose de
       corrida TEÑIDA con tu camiseta — sigue siendo vos, sigue siendo dibujo. */
    return this.poseHeroeTenida(j, "corriendo") || this.figuraCine("corriendo", "texturaCineJugador(sin busto)");
  }
  entrarCine() {
    this.quitarDuelo();
    this.estado = "CINE";
    this.mundoLayer.setVisible(false); this.hudLayer.setVisible(false);
    this.cineLayer.setVisible(true);
    this.uiCam.setZoom(1); this.uiCam.centerOn(480, 270);
    /* V7 §1 · SKIP: un toque adelanta directo al desenlace (idempotente) */
    this._cineSaltado = false;
    this._cineSkip = () => {
      if (this._cineSaltado) return; this._cineSaltado = true;
      if (this._cineTimer) { this._cineTimer.remove(false); this._cineTimer = null; }
      if (this.viajeState) this.viajeState.activo = false;
      this.uiCam.setZoom(1); this.uiCam.centerOn(480, 270);
      this.corte(() => this.planoDesenlace());
    };
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
      this.mundoLayer.setVisible(!this._split); this.hudLayer.setVisible(true);
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
    /* B3: era "cine_pie", bloques. Ahora el primer plano del pie es la pose de
       remate ilustrada, encuadrada abajo para que se lea la pierna. */
    const pie = this.add.sprite(W / 2, H / 2 + 10, this.figuraCine("remate", "planoPie"));
    pie.setScale((H * 0.72) / pie.height).setAngle(-8);
    this.cineContent.add(pie);
    this.tweens.add({ targets: pie, scale: 5.2, duration: 260, ease: "Back.easeOut" });
    this.SFX && this.SFX.kick();
    this.uiCam.flash(90, 255, 255, 220);
    this.lineasVelocidad(W / 2, H / 2, 1, 0xffd84d);
    this._cineTimer = this.time.delayedCall(this.msV(C.plano_pie_ms + 240), () => this.corte(() => this.planoViaje()));
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
    this.viajeState = { activo: true, elapsed: 0, dur: this.msV(C.plano_viaje_ms), ball, trail, cfg, vp, zoomed: false };
    this._cineTimer = this.time.delayedCall(this.msV(C.plano_viaje_ms), () => {
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
    /* ── B3 · LA PELOTA VIVA, en TODO el viaje y no solo en el impacto ──
       Antes esto era un setPosition con una rotación fija: un círculo que se
       traslada, que es el objeto que más mira el jugador. Ahora se ESTIRA en la
       dirección real del movimiento —calculada contra el cuadro anterior, no
       supuesta—, deja ESTELA cuando pasa el umbral de velocidad, y la SOMBRA
       del piso se separa cuando está alta y se junta cuando baja, que es lo
       único que comunica altura sin dibujarla. */
    const FE = window.PampaFeel;
    const escBase = C.pelota_escala_base + C.pelota_escala_span * s.escala;
    if (FE) {
      const vx = (s.x - (vs._px != null ? vs._px : s.x)) / Math.max(0.001, delta / 1000);
      const vy = (s.y - (vs._py != null ? vs._py : s.y)) / Math.max(0.001, delta / 1000);
      vs.ball._escBase = escBase;
      vs.ball.setPosition(s.x, s.y).setScale(escBase);
      FE.pelotaEstirar(this, vs.ball, vx, vy);
      const veloc = Math.hypot(vx, vy);
      const O = FE.cfg(this);
      if (veloc > O.estela_desde) {
        vs._estelaT = (vs._estelaT || 0) + delta;
        if (vs._estelaT > (O.estela_ms / O.estela_n)) { vs._estelaT = 0; FE.estela(this, vs.ball, this.cineContent); }
      }
      /* la sombra: pegada al piso de la viñeta, separándose con la altura */
      if (!vs.sombra) {
        vs.sombra = this.add.ellipse(s.x, 0, 20, 7, 0x000000, 0.32);
        if (this.cineContent) this.cineContent.add(vs.sombra);
        if (this.cameras && this.cameras.main) this.cameras.main.ignore(vs.sombra);
      }
      const piso = 540 * 0.86;
      const alto = Math.max(0, piso - s.y);
      vs.sombra.setPosition(s.x, piso)
        .setScale(escBase * (1 - Math.min(0.55, alto / 620)))
        .setAlpha(0.34 * (1 - Math.min(0.7, alto / 700)));
      vs._px = s.x; vs._py = s.y;
    } else {
      vs.ball.setPosition(s.x, s.y).setScale(escBase);
      vs.ball.rotation += 0.3;
    }
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
    this._cineTimer = this.time.delayedCall(this.msV(C.plano_esfuerzo_ms), () => this.corte(() => this.planoArquero()));
  }
  planoArquero() {
    const W = 960, H = 540, C = this.BAL.cine;
    this.limpiarContenido();
    this.cineBG.clear(); this.cineBG.fillStyle(0x0b2416, 1); this.cineBG.fillRect(0, 0, W, H);
    const A = this.arcoCine();
    this.cineBG.fillStyle(0x1f7a3c, 1); this.cineBG.fillRect(0, A.linea, W, H - A.linea);
    this.cineLabel.setText("· el arquero ·");
    /* B3: era "cine_arquero", el muñequito de bloques — ESTA es la figura que
       Rodri capturó. Ahora es la pose ilustrada de estirada. */
    /* P2 · ESTE es el (W/2 + 40, H/2) que marcó Rodri: una coordenada de
       pantalla que no miraba nada. Ahora el plano tiene SU arco —el mismo de
       arcoCine()— y el arquero se para en la línea, adentro de la boca. */
    this.dibujarArcoCine(this.cineBG);
    const arq = this.add.sprite(A.cx + A.voladaX * 0.5, A.linea, this.figuraArquero("vuela", "planoArquero"));
    arq.setOrigin(0.5, 1).setAngle(6)
      .setScale(this.escalaDePose(this._poseArqueroUltima || "arquero_vuela", A.h * 1.15, arq));
    this.cineContent.add(arq);
    this.tweens.add({ targets: arq, scale: arq.scale * 1.35, x: A.cx, angle: 0, duration: C.plano_arquero_ms, ease: "Quad.easeOut" });
    const ball = this.add.sprite(A.izq - 120, A.travesano - 40, "ball").setScale(0.8);
    this.cineContent.add(ball);
    this.tweens.add({ targets: ball, x: A.cx + A.voladaX, y: A.bocaY, scale: 1.9, duration: C.plano_arquero_ms, ease: "Sine.easeIn" });
    this.SFX && this.SFX.crowd(500);
    this._cineTimer = this.time.delayedCall(this.msV(C.plano_arquero_ms), () => this.corte(() => this.planoDesenlace()));
  }
  /* ══════════════════════════════════════════════════════════════════════
     P2 · LA GEOMETRÍA DEL ARCO DEL CINE, EN UN SOLO LUGAR.

     Antes cada plano ponía el arquero en una coordenada de PANTALLA fija
     (W/2 + 40, H/2) que no miraba dónde se había dibujado el arco. Resultado:
     el arquero volaba abajo y al costado del arco —más de la mitad del cuerpo
     por debajo de la línea de gol, sobre el pasto— y encima le tapaba el
     cartel de ¡GOOOL!, que vive en el centro de la pantalla. Medido: cuerpo
     de y=174 a y=346 con la línea en 270, o sea 76 px hundido.

     Ahora el arco se describe UNA vez acá y todo lo demás se cuelga de él: el
     arquero se para en la LÍNEA (los pies en el piso del arco, no en el medio
     de la pantalla), la pelota apunta a la BOCA, el pasto arranca donde
     termina el arco —así se apoya en la cancha en vez de flotar— y los
     carteles bajan a la franja de abajo, que queda libre.

     Todo en coordenadas del lienzo lógico 960x540.
     ══════════════════════════════════════════════════════════════════════ */
  arcoCine() {
    const W = 960, H = 540;
    const w = 300, h = 150;
    const linea = Math.round(H * 0.61);      // el piso del arco = el horizonte del pasto
    return {
      cx: W / 2, linea: linea, w: w, h: h,
      izq: W / 2 - w / 2, der: W / 2 + w / 2,
      travesano: linea - h,
      bocaY: linea - h / 2,                  // el centro de la boca: a donde va la pelota
      voladaX: w * 0.22,                     // cuánto se puede tirar sin salirse de los palos
      carteles: linea + Math.round((H - linea) * 0.42)   // la franja limpia de abajo
    };
  }
  /* dibuja el arco del cine con esa geometría (red, palos y travesaño) */
  dibujarArcoCine(g) {
    const A = this.arcoCine();
    g.fillStyle(0xdfeef6, 0.4);
    for (let x = -A.w / 2; x <= A.w / 2; x += 16) g.fillRect(A.cx + x, A.travesano, 2, A.h);
    for (let y = 0; y <= A.h; y += 14) g.fillRect(A.izq, A.travesano + y, A.w, 2);
    g.fillStyle(0xffffff, 1);
    g.fillRect(A.izq - 6, A.travesano - 6, 8, A.h + 6);
    g.fillRect(A.der, A.travesano - 6, 8, A.h + 6);
    g.fillRect(A.izq - 6, A.travesano - 6, A.w + 14, 8);
    return A;
  }
  planoDesenlace() {
    /* V7 §1: acá se RESUELVE el remate — el skip muere (un toque no puede
       re-entrar y duplicar el gol) */
    this._cineSkip = null; this._cineTimer = null;
    const W = 960, H = 540, C = this.BAL.cine, EP = this.BAL.epica, res = this.res, st = this.st, P = window.PampaPartido;
    this.limpiarContenido();
    this.cineBG.clear(); this.cineBG.fillStyle(0x0b2416, 1); this.cineBG.fillRect(0, 0, W, H);
    /* P2: el pasto arranca en la LÍNEA del arco — el arco se apoya en la
       cancha en vez de flotar 86 px por encima como antes */
    const A = this.arcoCine();
    this.cineBG.fillStyle(0x1f7a3c, 1); this.cineBG.fillRect(0, A.linea, W, H - A.linea);
    this.cineLabel.setText("· el desenlace ·");
    this.dibujarArcoCine(this.cineBG);
    const gx = A.cx, gy = A.linea, gw = A.w, gh = A.h;
    /* P2: los carteles bajan al pasto, debajo del arco. Antes ¡GOOOL! caía en
       el centro de la pantalla, o sea adentro de la boca y justo donde
       aterriza el cuerpo del arquero. */
    this.cineBig.setY(A.carteles);
    this.cineSub.setY(A.carteles + 42);
    /* B3: el otro "cine_arquero". Acá SÍ se sabe cómo terminó, así que el
       arquero va con la pose que corresponde: atajó de rodillas o se estiró. */
    const arq = this.add.sprite(gx, gy, this.figuraArquero(res.outcome === "atajada" ? "ataja" : "vuela", "planoDesenlace"));
    /* A3: idem — la estirada es mas ancha que alta */
    arq.setScale(this.escalaDePose(this._poseArqueroUltima || "arquero_vuela", gh * 1.15, arq));
    /* P2 · LOS PIES EN LA LÍNEA. El origen baja al pie del sprite, así que la
       Y que se le da es el PISO del arquero y no su ombligo: sea cual sea la
       pose y la escala, no se hunde por debajo de la línea de gol. */
    arq.setOrigin(0.5, 1);
    this.cineContent.add(arq);
    const ball = this.add.sprite(gx - 260, A.bocaY, "ball").setScale(1.6); this.cineContent.add(ball);
    const targetY = A.bocaY + (this.zona.gy || 0) * C.drift_mult;
    /* Feel B8: SILENCIO antes de revelar (el vacío en el estómago) */
    const silencio = (this.BAL.feel && this.BAL.feel.silencio_ms) || 500;
    this.musicaDuck(silencio + 300);   // ANIME D: también calla la música del loop
    if (res.outcome === "gol") {
      /* P2 · se tiró para el otro lado: el desvío sale del ANCHO DEL ARCO
         (voladaX), no de un 90 clavado, y los pies siguen en la línea */
      arq.setPosition(gx + (this.zona.gy < 0 ? 1 : -1) * A.voladaX, gy);
      this.tweens.add({ targets: ball, x: gx + (this.zona.gy || 0) * 1.2, y: targetY, scale: 1.2, duration: C.impacto_gol_ms, ease: "Quad.easeIn" });
      this.time.delayedCall(C.impacto_gol_ms + silencio, () => {
        ball.setPosition(gx + (this.zona.gy || 0) * 1.2, targetY);
        this.uiCam.shake(EP.shake_ms, EP.shake_intensidad);
        this.uiCam.flash(EP.flash_ms, 255, 255, 210);
        this.SFX && this.SFX.net(); this.time.delayedCall(EP.fanfarria_delay_ms, () => this.SFX && this.SFX.goal());
        this.burst(ball.x, ball.y);
        this.punch(this._megaGrito || "¡GOOOL!", "¡La clavaste donde el viento no la saca!", 0xffd84d);
        this.golPropio();   // V9: la fiesta completa (tribuna + efecto + saque relatado)
      });
    } else if (res.outcome === "atajada" || res.outcome === "corner") {
      /* G1: los dos son "el arquero llegó", pero terminan distinto — la que
         agarra queda en sus manos, la del córner se le escapa por el costado */
      const corner = res.outcome === "corner";
      /* P2 · la agarra DENTRO de la boca, a la altura de las manos */
      const manosX = gx - A.voladaX * 0.5, manosY = A.bocaY + 10;
      arq.setPosition(gx - A.voladaX * (corner ? 0.8 : 0.35), gy);
      this.tweens.add({ targets: ball, x: manosX, y: manosY, scale: 1.7, duration: C.impacto_atajada_ms, ease: "Quad.easeIn" });
      this.time.delayedCall(C.impacto_atajada_ms + silencio, () => {
        ball.setPosition(manosX, manosY);
        this.uiCam.shake(EP.atajada_shake_ms, EP.atajada_shake_int);
        this.dust(gx - 30, gy - 20);
        const d = this.desenlaceRemate(res);
        this.punch(d.titulo, d.sub, d.color);
        /* la del córner sale DISPARADA al costado; la agarrada queda cerca */
        this.tweens.add({
          targets: ball,
          x: corner ? gx + (d.arriba ? -1 : 1) * (gw / 2 + 140) : gx - 260,
          y: corner ? A.travesano - 20 : gy - 30,
          alpha: corner ? 0.35 : 1,
          duration: EP.rebote_atajada_ms, ease: "Quad.easeOut"
        });
      });
    } else {
      /* P2 · la que se va afuera pasa POR ARRIBA del travesaño, y el arquero
         la mira irse desde su palo */
      arq.setPosition(gx + (this.zona.gy < 0 ? -1 : 1) * A.voladaX * 0.7, gy);
      this.tweens.add({ targets: ball, x: gx + (this.zona.gy < 0 ? -1 : 1) * (gw / 2 + 60), y: A.travesano - 40, scale: 1.0, alpha: 0.3, duration: C.impacto_afuera_ms, ease: "Quad.easeIn" });
      this.time.delayedCall(C.impacto_afuera_ms + silencio - 120, () => {
        const d = this.desenlaceRemate(res);
        this.punch(d.titulo, d.sub, d.color);
      });
    }
    /* V7 §1: la velocidad RÁPIDA acorta el hold (el silencio es sagrado, queda) */
    this.time.delayedCall(C.impacto_gol_ms + silencio + this.msV(C.desenlace_hold_ms), () => this.salirCine());
  }
  /* BLOQUE A · ¿esta acción merece cortar a viñeta?
     Devuelve true si el escalón es 2 o 3. El contexto que sube de escalón sale
     de la cancha: una acción en el último tercio de campo pesa más que la
     misma en el mediocampo, y eso es lo que separa el trámite de la jugada. */
  escalonDe(accion, jugador) {
    const DR = window.PampaDrama;
    if (!DR) return true;
    const st = this.st;
    const j = jugador || (st && st.mios[st.ctrl]);
    const ctx = {
      enArea: !!(j && st && (j.x > st.W * 0.72 || j.x < st.W * 0.28)),
      decisivo: !!(st && st.minuto > 80 && Math.abs(st.golesMio - st.golesRival) <= 1)
    };
    return DR.cortaAVinieta(accion, ctx);
  }

  /* ============ G1 · EL DESENLACE DEL REMATE, EN UN SOLO LUGAR ============
     Los cuatro caminos de remate (simple, con cine, aéreo, mega) resolvían el
     no-gol cada uno por su lado con un `else P.tiroFallado(st)`. Así fue como
     "la sacó al córner" no existía en ninguno. Ahora todos pasan por acá:
     el resultado de duel decide, y ESTA función es la única que toca el estado.
       gol      → la fiesta
       corner   → NO perdés la pelota: la reponés desde el vértice
       atajada  → la agarró: es de él, la perdés
       afuera   → saque del arquero, la perdés
     Devuelve {titulo, sub, color, gana} para que cada escena lo cuente como
     quiera, sin volver a decidir nada.                                     */
  desenlaceRemate(res) {
    const st = this.st, P = window.PampaPartido;
    /* B1 · HITSTOP. El instante del impacto se congela y después arranca de
       golpe. La fuerza depende de qué pasó: el gol es el más largo, la atajada
       y el córner son impactos fuertes, el afuera ni toca a nadie. */
    const FE = window.PampaFeel;
    if (FE) {
      if (res.outcome === "gol") FE.hitstop(this, "gol", 3);
      else if (res.outcome === "atajada" || res.outcome === "corner") FE.hitstop(this, "fuerte", this._escalonActual || 2);
    }
    if (res.outcome === "gol") {
      this.golPropio();
      return { titulo: "¡GOOOL!", sub: "¡La clavaste donde el viento no la saca!", color: 0xffd84d, gana: true };
    }
    if (res.outcome === "corner") {
      const c = P.cornerMio(st);
      this.SFX && this.SFX.gloves();
      return { titulo: "¡LA SACÓ AL CÓRNER!", sub: "No la pudo agarrar: la mandó afuera. Sigue siendo tuya.",
        color: 0x7ee08a, gana: false, corner: true, arriba: c.arriba };
    }
    if (res.outcome === "atajada") {
      /* A4 · la tiene el arquero rival, en SU área — no un defensor cualquiera
         cerca del medio, que es lo que hacía la vieja tiroFallado */
      P.saqueArquero(st, "atajada");
      this.SFX && this.SFX.gloves();
      return { titulo: "¡LA AGARRÓ!", sub: "El arquero la abrazó. Saca él desde el fondo.", color: 0x5bb8e8, gana: false, saque: true };
    }
    /* A4 · se fue: saque de arco, que es lo que pasa de verdad */
    P.saqueArquero(st, "afuera");
    this.SFX && this.SFX.afuera();
    return { titulo: "¡AFUERA!", sub: "Se fue por centímetros. Saque de arco.", color: 0xe3503e, gana: false, saque: true };
  }
  /* ══════════════════════════════════════════════════════════════════════
     PASADA DE COHERENCIA · EL CARTEL NO LE TAPA LA CARA A LA FIGURA.

     El titulo caia en el medio vertical de la escena, que es justo donde esta
     la cara y el pecho del jugador — la ilustracion es lo mejor que tiene la
     viñeta y el texto la partia al medio (se ve en COH_05).

     Baja a la franja de pasto, que ya esta oscura, no tiene dibujo y es donde
     el ojo va despues de mirar la figura. La posicion sale de balance.cine
     para poder moverla sin tocar codigo.
     ══════════════════════════════════════════════════════════════════════ */
  punch(big, sub, colorNum) {
    const hex = "#" + colorNum.toString(16).padStart(6, "0");
    const C = this.BAL.cine || {};
    if (C.titulo_y != null) this.cineBig.y = C.titulo_y;
    if (C.sub_y != null) this.cineSub.y = C.sub_y;
    this.cineBig.setText(big).setColor(hex).setAlpha(1).setScale(0.2).setAngle(-6);
    this.tweens.killTweensOf(this.cineBig);
    /* B2 · el cartel entra con rebote calibrado desde balance.oficio, no con
       un 360 clavado: así la perilla global lo mueve junto con todo lo demás. */
    const OF = window.PampaFeel ? window.PampaFeel.cfg(this) : null;
    this.tweens.add({
      targets: this.cineBig, scale: 1, angle: 0,
      duration: OF ? Math.round((OF.antic_ms + OF.accion_ms) * OF.k) : 360,
      ease: "Back.easeOut", easeParams: OF ? [OF.rebote] : undefined
    });
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
     carrera, pagable con aguante y pasada su línea de cancha. Devuelve el más potente. */
  /* N2 · el texto de "te tienen leído" para el menú, o null si todavía no hay
     nada que avisar. Un menú donde la etiqueta aparece siempre deja de
     comunicar, así que por debajo de balance.lectura.avisa_desde no dice nada. */
  avisoLectura(id) {
    const L = window.PampaLectura, st = this.st;
    if (!L || !st || !st.lectura || !id) return null;
    const e = L.etiqueta(L.lectura(st.lectura, id, st.minuto, this.BAL.lectura), this.BAL.lectura);
    if (!e) return null;
    /* forma además de texto: ojos que se van llenando, para que se note de un
       vistazo sin depender de leer ni del color */
    return ["", "👁", "👁👁", "👁👁👁"][e.nivel] + " " + e.texto;
  }
  megaDisponible() {
    const st = this.st, j = st.mios[st.ctrl];
    if (!j || !j.esVos || st.posesion !== "mia") return null;
    const nivel = this._nivelCarrera || 1;
    const lista = ((this.MEGA && this.MEGA.megatiros) || []).filter(m =>
      nivel >= (m.nivel || 1) && j.aguante >= (m.aguante || 300) && j.x > (m.x_min || 680));
    return lista.length ? lista[lista.length - 1] : null;
  }
  /* ============ V9 §4 · SIN BARRA DE CARGA ============
     Estaba la BARRA DE TIMING: una aguja que iba y venía y había que frenar
     en la zona verde. Eso es un QTE de reflejos, no una decisión de fútbol —
     y encima convivía con otras tres barras. Ahora el equivalente del `ej`
     (zona + ajuste de poder) sale de la SITUACIÓN, igual que en el tiro por
     comandos: desde dónde pateás, el ángulo, el cansancio y cuántos tenés en
     el camino. Mismo contrato de salida, cero input de precisión.
     penal: los remates difíciles (volea, chilena) pagan acá lo que antes
     pagaban con una ventana de aguja más chica. */
  ejDeLaSituacion(mega, penal) {
    const st = this.st, j = st.mios[st.ctrl];
    const defs = this.rivalesEnElCamino ? this.rivalesEnElCamino(j) : 0;
    const auto = window.PampaTiro.tiroAuto({
      x: j.x, y: j.y, W: st.W, H: st.H, arcoMedio: this.BAL.mundo.arco_medio,
      statTiro: (j.stats && j.stats.tiro) || 55,
      aguanteFrac: j.aguante / this.BAL.aguante.max,
      defensores: defs
    });
    const zona = Object.assign({}, auto.zona);
    if (penal) { zona.bonus -= (penal.bonus || 0); zona.fuera += (penal.fuera || 0); }
    if (mega) zona.bonus += ((this.BAL.epica || {}).mega_bonus_zona || 6);
    return {
      zona: zona, lectura: auto.lectura, ajustePoder: auto.ajustePoder,
      enZona: auto.lectura.calidad >= 0.5,
      /* la frase de LECTURA reemplaza al "la aguja se te escapó…" */
      lecturaTexto: this.textoDeLectura(auto.lectura)
    };
  }
  textoDeLectura(L) {
    if (!L) return "";
    if (L.defensores >= 2) return "entre " + L.defensores + ", como se pueda";
    if (L.centrado < 0.35) return "desde el costado, sin ángulo";
    if (L.cerca > 0.8) return "de frente y encima del arco";
    if (L.cerca < 0.35) return "desde muy lejos";
    if (L.defensores === 1) return "con uno encima";
    return "de media distancia";
  }
  /* C3 · NO ES HUÉRFANO, ES LA OTRA PUNTA DE UN FLAG. Con los flags de hoy no
     corre nunca: el único llamador (arriba, en resolverTiro) exige
     `mega && !FLAGS.e6_cine`, y e6_cine viene en true. Pero e6_cine EXISTE
     justo para poder apagar el cine y comparar; si borro esto, el flag miente y
     apagarlo deja el megatiro sin resolver. Se queda, anotado. Si algún día se
     borra el flag e6_cine, este método se va con él. */
  dispararSimple(mega, ej) {
    const st = this.st, P = window.PampaPartido;
    const prep = P.prepararRemate(st, mega || false);
    const res = window.PampaDuel.resolveShot({
      shotPower: prep.shotPower, keeperSkill: prep.keeperSkill, zone: ej.zona,
      cfg: { spread: this.BAL.duelo.spread, min: this.BAL.duelo.min, max: this.BAL.duelo.max },
      /* G1: la distancia pesa acá, despues del tope del duelo */
      distancia: prep.distancia, especial: prep.especial, tiro: this.BAL.tiro,
      penalizaciones: prep.penalizaciones
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
      const atajo = res.outcome === "atajada" || res.outcome === "corner";
      const d = this.desenlaceRemate(res);   // la verdad UNA vez; la escena la cuenta
      const fb = ej.lecturaTexto || (ej.enZona ? "le pegó bien parado" : "le pegó como pudo");
      this.escenaCine({
        etiqueta: "· el remate ·", accion: "remate",
        prota: { j: tirador, esRival: false, anim: "tiro" },
        /* V6 §1 F2: el arquero SIEMPRE se estira — también cuando la pelota se va afuera */
        rival: arqR ? { j: arqR, esRival: true, anim: res.outcome === "atajada" ? "atajada" : "estirada" } : null,
        siluetas: enCamino,
        gana: gol,
        poseFinalProta: gol ? "festejo" : "tiro",
        titulo: gol && mega ? mega.grito : d.titulo,
        sub: gol ? fb : d.sub + " · " + fb,
        color: d.color,
        sfx: gol ? "goal" : (atajo ? "gloves" : "afuera"),
        hinchada: gol,
        alFinal: () => {
          if (gol) this.efectoGol(false);
          this.relatar(gol ? "gol" : (atajo ? "atajada" : "afuera"), { jugador: tirador.esVos ? "VOS" : tirador.nombre });
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
      const d = this.desenlaceRemate(res);
      const titulo = res.outcome === "gol" && mega ? mega.grito : d.titulo;
      this.mostrarResolucion(fb + titulo, "#" + d.color.toString(16).padStart(6, "0"),
        { anim: "tiro", gana: d.gana });
    });
  }
  /* MEGATIRO: el resultado se decide UNA vez (bug del arquero cerrado) y el CINE lo cuenta */
  /* ============ V8 B · EL TIRO POR COMANDOS ============
     Un solo toque: la escena del REMATE (animación), el viaje de la pelota
     (la intriga) y el desenlace. Sin zonas ni barra: la ubicación manda. */
  tiroPorComandos(rivalIdx) {
    const st = this.st, P = window.PampaPartido, Tiro = window.PampaTiro;
    const j = st.mios[st.ctrl];
    /* cuántos rivales están entre vos y el arco (los que "estorban") */
    const defs = st.rivales.filter(r => r.pos !== "ARQ" && r.x > j.x && Math.abs(r.y - j.y) < 150).length;
    const auto = Tiro.tiroAuto({
      x: j.x, y: j.y, W: st.W, H: st.H, arcoMedio: this.BAL.mundo.arco_medio,
      statTiro: (j.stats && j.stats.tiro) || 55,
      aguanteFrac: j.aguante / this.BAL.aguante.max,
      defensores: defs
    });
    const prep = P.prepararRemate(st, null);
    this.res = window.PampaDuel.resolveShot({
      /* el `duelo` ya no se suma aca: entra en prepararRemate, que es la via
         unica de las cuatro pantallas de tiro (antes solo pegaba en esta) */
      shotPower: prep.shotPower + auto.ajustePoder,
      keeperSkill: prep.keeperSkill,
      zone: auto.zona,
      cfg: { spread: this.BAL.duelo.spread, min: this.BAL.duelo.min, max: this.BAL.duelo.max },
      /* G1: la distancia pesa acá, despues del tope del duelo */
      distancia: prep.distancia, especial: prep.especial, tiro: this.BAL.tiro,
      penalizaciones: prep.penalizaciones
    });
    this.zona = auto.zona;
    this._megaGrito = "¡GOOOL!";
    /* ══════════════════════════════════════════════════════════════════════
       A3 · ALGUIEN CORTA EL REMATE.

       La lectura posicional existía desde C1 y la usaba UN solo lado: el
       remate del rival contra vos. De tu lado, los rivales en el camino solo
       servían para dos cosas — empeorarte la puntería y dibujarse como
       siluetas de fondo. Nadie se interponía nunca.

       Es la misma función (logic/definicion.remateAuto, que se llamaba
       "remateRivalAuto" sin tener nada de rival) con el arco al otro lado.
       Misma perilla, mismos números: si tu defensa los corta, la de ellos te
       corta a vos.

       El bloqueo NO es una pelota perdida: rebota. Córner, rebote o despeje,
       repartido por balance.definicion.bloqueo_reparto. Con eso adentro los
       goles por remate bajan de 51,7% a 46,0% y los córners suben 49%.
       ══════════════════════════════════════════════════════════════════════ */
    const D = window.PampaDefinicion;
    if (D && D.remateAuto && this.FLAGS.a3_bloqueo !== false) {
      const lect = D.remateAuto({
        tirador: { x: j.x, y: j.y },
        arco: { x: st.W, y: st.H / 2 },
        defensores: st.rivales.filter(r => r.pos !== "ARQ")
          .map(r => ({ x: r.x, y: r.y, nombre: r.nombre, aguante: r.aguante })),
        arquero: { nivel: 55, aguante: this.BAL.aguante.max },
        aguanteMax: this.BAL.aguante.max,
        cfg: this.BAL.definicion || {}
      });
      if (lect.bloqueado) {
        /* quién se interpuso: el que estaba más cerca de la línea de tiro */
        const cerca = lect.defensorMasCerca;
        const quien = cerca ? st.rivales.find(r => r.x === cerca.x && r.y === cerca.y) : null;
        const como = D.desenlaceBloqueo(this.BAL.definicion || {});
        this.escenaDelBloqueo(quien, {
          titulo: "¡SE LA BLOQUEARON!",
          sub: lect.defensoresEnLinea > 1
            ? "Eran " + lect.defensoresEnLinea + " en el camino: uno se tiró de cara."
            : "Se metió en el camino y se la comió con el cuerpo.",
          desenlace: como,
          previo: () => { this.SFX && this.SFX.kick(); }
        });
        return;
      }
    }
    /* la ESCENA del remate (pose ilustrada + el rival que se tira) y recién
       después el viaje: primero se ve pegarle, después la intriga */
    const rival = rivalIdx != null ? st.rivales[rivalIdx] : null;
    const nDefs = auto.lectura.defensores;
    this.escenaCine({
      etiqueta: "· EL REMATE ·",
      prota: { j, esRival: false, anim: "tiro" },
      pose: "remate", pelotaAlPie: false,
      rival: rival ? { j: rival, esRival: true, anim: "gambeta" } : null,
      siluetas: nDefs > 0 ? nDefs : null,
      gana: true, sfx: "kick",
      /* "¡LE PEGA VOS!" estaba mal dicho: con un compañero queda bien ("¡LE
         PEGA RAMIRO!") pero con vos la persona del verbo cambia. */
      titulo: j.esVos ? "¡LE PEGÁS!" : "¡LE PEGA " + (j.nombre || "").toUpperCase() + "!",
      sub: auto.lectura.dist < 220 ? "de frente al arco, sin pensarlo" : (nDefs ? "entre " + nDefs + " y desde lejos" : "desde afuera del área"),
      alFinal: () => {
        this.SFX && this.SFX.kick();
        this.entrarCine();
        this.planoViaje();   // LA INTRIGA: la pelota viaja y no sabés si entra
      }
    });
  }
  dispararConCine(mega, ej) {
    const st = this.st, P = window.PampaPartido;
    const prep = P.prepararRemate(st, mega);
    this.res = window.PampaDuel.resolveShot({
      shotPower: prep.shotPower, keeperSkill: prep.keeperSkill, zone: ej.zona,
      cfg: { spread: this.BAL.duelo.spread, min: this.BAL.duelo.min, max: this.BAL.duelo.max },
      /* G1: la distancia pesa acá, despues del tope del duelo */
      distancia: prep.distancia, especial: prep.especial, tiro: this.BAL.tiro,
      penalizaciones: prep.penalizaciones
    });
    this.zona = ej.zona;
    this._megaGrito = mega.grito || "¡GOOOL!";
    /* ============ V9 §5 · LA MEGA ANIMACIÓN ============
       El súper tiro es el momento más épico del juego y era el que MENOS se
       veía: cut-in, barra de aguja y directo al cine. Ahora la cadena completa,
       sin pedir un solo reflejo:
         cut-in con el retrato (ya vino de resolverTiro)
         → LA CARGA Y EL IMPACTO: escena especial, pose de remate, doble flash,
           líneas gruesas y las siluetas de contra cuántos la está pateando
         → EL VIAJE: la pelota con líneas de velocidad (planoPie → planoViaje)
         → EL ARQUERO VOLANDO (planoArquero)
         → FREEZE + medio segundo de silencio + desenlace (planoDesenlace). */
    const j = st.mios[st.ctrl];
    const enCamino = this.rivalesEnElCamino(j);
    if (this.hayEscenas()) {
      this.escenaCine({
        etiqueta: "· " + String(mega.n || "EL SÚPER TIRO").toUpperCase() + " ·",
        prota: { j: j, esRival: false, anim: "tiro" },
        pose: "remate", especial: true,
        siluetas: enCamino > 0 ? enCamino : null,
        gana: true, sfx: "kick",
        titulo: "¡" + String(mega.n || "SÚPER TIRO").toUpperCase() + "!",
        sub: (mega.sub || "junta todo lo que le queda") + " · " + (ej.lecturaTexto || ""),
        color: 0xffd84d,
        alFinal: () => {
          this.SFX && this.SFX.kick();
          this.cameras.main.flash(this.BAL.cine.corte_flash_ms, 255, 255, 255);
          this.entrarCine();
          this.planoPie();     // y de acá sale el viaje, el arquero y el desenlace
        }
      });
      return;
    }
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
  /* B3 · ESTE ERA EL CAMINO QUE HACÍA VOLVER EL BUG.
     escenaCine() cae acá cuando no encuentra pose ilustrada, y acá se horneaba
     el muñequito paramétrico con PampaAvatarArte.heroico(). Por eso cada vez
     que se agregaba una escena nueva sin pose asignada, reaparecían los
     bloques: el arreglo anterior recorría las escenas, pero el AGUJERO estaba
     debajo de todas ellas.
     Ahora esta función no sabe dibujar bloques. Traduce a pose ilustrada y
     delega en figuraCine, que nunca devuelve un muñequito. */
  texturaEscena(j, esRival, anim, frame) {
    const esArq = j.pos === "ARQ";
    if (esArq) {
      return this.figuraArquero(anim === "atajada" || anim === "despeje" ? "ataja" : "vuela",
        "texturaEscena(" + (esRival ? "arquero rival" : "tu arquero") + ")");
    }
    /* la acción de la escena → id de pose del manifest, la misma tabla que usa
       poseParaEscena para que no haya dos criterios distintos */
    const id = this.poseParaEscena({ j: j, esRival: esRival, anim: anim }, anim);
    const k = this.figuraCine(id, "texturaEscena(" + anim + ")");
    /* si sos VOS, la pose va con tu camiseta (B3-D) */
    if (!esRival && j.esVos && this.poseHeroeTenida) return this.poseHeroeTenida(j, id) || k;
    if (esRival && this.poseRivalNaranja) return this.poseRivalNaranja(id) || k;
    return k;
  }
  /* ¿contra cuántos pateás? — rivales de campo entre vos y el arco (info de la decisión) */
  /* ══════════════════════════════════════════════════════════════════════
     A2 · A3 · LA ESCENA DEL BLOQUEO.

     Una sola, para los dos modos de que te corten el remate: el marcador que
     te gana el duelo antes de patear, y el que se interpone en el camino de
     la pelota. Las dos cosas son "alguien se metió", así que se cuentan igual.

     El protagonista es EL QUE BLOQUEA, no vos — es su momento. Va con la pose
     "bloqueo" del manifest (el defensor rayado de frente, piernas abiertas),
     que estaba cargada desde la tanda de arte y no la usaba ninguna de las dos
     situaciones.

     desenlace dice qué pasa con la pelota y es lo único que cambia entre las
     dos: "despeje" es de ellos, "corner" sigue siendo tuya, "rebote" te la
     deja picando ahí mismo.
     ══════════════════════════════════════════════════════════════════════ */
  escenaDelBloqueo(defensor, cfg) {
    const st = this.st, P = window.PampaPartido;
    cfg = cfg || {};
    if (cfg.previo) cfg.previo();
    /* la verdad de juego, UNA vez y antes de dibujar (doctrina del proyecto) */
    let sub = cfg.sub || "";
    if (cfg.desenlace === "corner") {
      P.cornerMio(st);
      sub = "La mandó al córner. Sigue siendo tuya.";
    } else if (cfg.desenlace === "rebote") {
      /* queda picando: la pelota es tuya, ahí mismo, y arrancás de nuevo */
      st.posesion = "mia"; st.modo = "juego";
      st.cooldown = st.bal.ritmo.cooldown_encuentro_ms;
      const j = st.mios[st.ctrl];
      st.pelota.x = j.x + 12; st.pelota.y = j.y;
      sub = "Rebotó y quedó picando. ¡Seguí!";
    } else {
      P.perderPelota(st);
    }
    this.SFX && this.SFX.gloves && this.SFX.gloves();
    const volver = () => {
      /* cada desenlace tiene su frase: las cinco situaciones nuevas se
         agregaron a data/relatos.json. Pedirle al relator una situación que
         no existe es fallar en silencio — la lección del Bloque 1. */
      this.relatar(cfg.relato || (cfg.desenlace === "corner" ? "corner"
        : cfg.desenlace === "rebote" ? "rebote" : "bloqueo"), {});
      if (cfg.desenlace === "rebote") this.reanudarLibre && this.reanudarLibre();
    };
    if (!this.hayEscenas() || !defensor) {
      /* sin escenas (flags apagados) sigue habiendo cartel: nunca silencio */
      this.mostrarResolucion((cfg.titulo || "¡BLOQUEADO!") + "\n" + sub, "#e3503e",
        { anim: "bloqueo", gana: false });
      volver();
      return;
    }
    this.escenaCine({
      etiqueta: "· EL BLOQUEO ·", accion: "bloqueo",
      prota: { j: defensor, esRival: true, anim: "bloqueo" },
      pose: "bloqueo",
      rival: { j: st.mios[st.ctrl], esRival: false, anim: "tiro" },
      gana: false,
      titulo: cfg.titulo || "¡BLOQUEADO!",
      sub: sub,
      color: cfg.desenlace === "corner" ? 0x7ee08a : 0xe3503e,
      sfx: "gloves",
      alFinal: volver
    });
  }
  rivalesEnElCamino(j) {
    let n = 0;
    this.st.rivales.forEach(r => { if (r.pos !== "ARQ" && r.x > j.x && Math.abs(r.y - j.y) < 140) n++; });
    return n;
  }
  /* V6 §3.1: ¿qué POSE ILUSTRADA le corresponde a este protagonista? El dueño
     importa (el arte es del héroe celeste / defensor rival rayado / arquero):
     si el dueño no coincide o la pose no existe, se cae al heroico de código. */
  /* V9 B3 · NINGUNA escena cae en el muñequito de bloques. Antes esto devolvía
     null para varios casos (el rival que remata, cualquiera corriendo o
     gambeteando) y ahí aparecía el heroico paramétrico mezclado con las
     ilustraciones. Ahora SIEMPRE hay una pose razonable; el heroico queda solo
     como red de seguridad si el manifest no cargó. */
  poseParaEscena(p, anim) {
    if (!p || !p.j) return null;
    const a = anim || p.anim;
    if (p.j.pos === "ARQ") return (a === "atajada" || a === "despeje") ? "arquero_ataja" : "arquero_vuela";
    if (a === "tiro" || a === "volea" || a === "remate") return "remate";
    if (a === "cabezazo") return "cabezazo";
    if (a === "chilena") return "chilena";
    if (a === "festejo") return "festejo";
    if (a === "bloqueo") return "bloqueo";
    if (a === "pase") return p.esRival ? "barrida" : "pared";   // la barrida ES el defensor rival
    if (a === "gambeta") return "gambeta_gana";
    return "corriendo";   // último recurso: siempre ilustrado, nunca bloques
  }
  /* la pose del ANTAGONISTA del plano (el segundo cuerpo). Este era el agujero
     grande: cfg.rival NUNCA miraba poses, así que el otro cuerpo de la viñeta
     era siempre paramétrico — y en las escenas donde VOS sos el antagonista
     (quite ganado, defensa fallada) el rival lucía ilustrado y VOS de bloques. */
  poseDelAntagonista(cfg) {
    if (!cfg || !cfg.rival || !cfg.rival.j) return null;
    const id = cfg.poseRival || this.poseParaEscena(cfg.rival, cfg.rival.anim);
    if (!id) return null;
    let k = this.poseKey(id);
    if (!k) return null;
    if (cfg.rival.esRival && this.poseRivalNaranja) k = this.poseRivalNaranja(id) || k;
    else if (!cfg.rival.esRival && cfg.rival.j.esVos && this.poseHeroeTenida) k = this.poseHeroeTenida(cfg.rival.j, id) || k;
    return k;
  }
  /* cfg: { etiqueta, prota:{j,esRival,anim}, rival:{j,esRival,anim}|null, gana,
            titulo, sub, color?, sfx?, siluetas?, poseFinalProta?, poseFinalRival?, alFinal } */
  escenaCine(cfg) {
    /* ── BLOQUE A · EL PRESUPUESTO DEL ESCALÓN ────────────────────────────
       Antes toda viñeta duraba lo mismo: 500 de entrada + 800 de pose + 1300
       de hold = 2.600 ms, fuera un pase filtrado o un gol de chilena. Ahora el
       escalón manda: el 3 (gol, megatiro, chilena, final) queda EXACTAMENTE
       igual que hoy, y el 2 (gambeta, remate, atajada, bloqueo) cuesta la
       mitad. El escalón 1 ni llega acá — se resuelve en la cancha.
       El reparto entre los tres planos conserva las proporciones de hoy, así
       que lo único que cambia es cuánto dura, no cómo se ve. */
    const DR = window.PampaDrama;
    const escalon = cfg.escalon != null ? cfg.escalon
      : (DR ? DR.escalonDe(cfg.accion || (cfg.gana === true && cfg.hinchada ? "gol" : "remate"), cfg.ctx) : 3);
    const plan = DR ? DR.planos(cfg.accion || "remate", cfg.ctx, this.BAL.drama) : null;
    const F0 = this.BAL.escena || {};
    const F = plan ? Object.assign({}, F0, {
      entrada_ms: plan.entrada, pose_ms: plan.pose, hold_ms: plan.hold
    }) : F0;
    this._escalonActual = escalon;
    const feel = this.BAL.feel || {};
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
      const tS = this.add.text(W - 16, 40, "entre vos y el arco: " + cfg.siluetas + " + el arquero", { fontFamily: window.PF.texto, fontSize: "12px", color: "#f6efdc", backgroundColor: "#0a1f13cc", padding: { x: 6, y: 3 } }).setOrigin(1, 0);
      this.cineContent.add(tS);
    }
    this.cineLabel.setText(cfg.etiqueta || "");
    /* protagonista y antagonista ENTRAN al plano (tween visual; el hilo va por reloj) */
    /* V6 §3.1 · ANIMACIÓN LIMITADA: si hay POSE ILUSTRADA del manifest, el
       protagonista es UNA imagen quieta, grande — el movimiento lo pone todo
       lo demás (sacudida, líneas, rayas barriendo, flash, freeze). */
    const escProta = (F.escala_prota || 3.4) * (cfg.especial ? 1.25 : 1);
    /* ARTE tanda 2: cfg.pose fuerza una pose puntual (las 4 gambetas, la pared,
       el bloqueo, la corrida) y cfg.poseFlip la espeja según quién gana */
    const poseId = cfg.pose || this.poseParaEscena(cfg.prota);
    let sp;
    if (poseId && this.poseKey(poseId)) {
      /* REINTEGRACIÓN (pedido de Rodri): las escenas llevan el ARTE por bando —
         el rival con su pose teñida a NARANJA; VOS con tu pinta en la corrida
         (megacorrida, combinada y gambetas incluidas) */
      let kPose = this.poseKey(poseId);
      if (cfg.prota && cfg.prota.esRival && this.poseRivalNaranja) kPose = this.poseRivalNaranja(poseId) || kPose;
      else if (cfg.prota && cfg.prota.j && cfg.prota.j.esVos && this.poseHeroeTenida) kPose = this.poseHeroeTenida(cfg.prota.j, poseId) || kPose;
      sp = this.add.image(-200, H * 0.52, kPose);
      sp.setScale((cfg.especial ? 420 : 360) / sp.height);
      if (cfg.poseFlip) sp.setFlipX(true);
      sp._esPose = true;
    } else {
      sp = this.add.sprite(-140, H * 0.58, this.texturaEscena(cfg.prota.j, cfg.prota.esRival, cfg.prota.anim, 1)).setScale(escProta);
    }
    /* V7 §0.1: las poses ya NO traen pelota dibujada (recortadas de los PNG) —
       la pelota es SIEMPRE la del juego. El manifest declara dónde iba
       (pelota:{x,y,r}) y acá se dibuja el sprite "ball" ahí, con ese tamaño,
       espejado si la pose va en flip, entrando pegado a la pose. */
    let posePel = null;
    if (sp._esPose) {
      const pm = this.game.registry.get("poses");
      const defP = pm && pm.poses && pm.poses[poseId];
      if (defP && defP.pelota) posePel = defP.pelota;
    }
    if ((posePel || cfg.pelotaAlPie) && this.textures.exists("ball")) {
      const dW = sp.width * sp.scaleX, dH = sp.height * sp.scaleY;
      const offX = posePel ? (posePel.x - 0.5) * dW * (cfg.poseFlip ? -1 : 1) : 78;
      const offY = posePel ? (posePel.y - 0.5) * dH : 150;
      const ballH = this.textures.get("ball").getSourceImage().height || 16;
      const esc = posePel && posePel.r ? Math.max(1.6, (posePel.r * 2 * dH) / ballH) : 2.4;
      const bb = this.add.sprite(-200 + offX, H * 0.52 + offY, "ball").setScale(esc);
      this.cineContent.add(bb);
      this.tweens.add({ targets: bb, x: W * 0.3 + offX, duration: F.entrada_ms || 420, ease: "Quad.easeOut" });
    }
    if (cfg.protaAngle && !sp._esPose) sp.setAngle(cfg.protaAngle);   // la chilena ilustrada ya viene dada vuelta
    this.cineContent.add(sp);
    /* B2 · el protagonista no entra en línea recta a velocidad constante: se
       pasa un poco del destino y vuelve. Es el rebote, y es lo que separa un
       movimiento dibujado de uno interpolado. En el escalón 1 no hay teatro,
       pero el escalón 1 ni llega acá. */
    if (window.PampaFeel && escalon >= 2) {
      window.PampaFeel.aparecer(this, sp, { x: W * 0.3, y: sp.y, scale: sp.scale, desdeX: -200 }, escalon);
    } else {
      this.tweens.add({ targets: sp, x: W * 0.3, duration: F.entrada_ms || 420, ease: "Quad.easeOut" });
    }
    /* rayas diagonales BARRIENDO la pantalla (fondo que corre, pose que se sostiene) */
    const rayas = [];
    for (let rk = 0; rk < 3; rk++) {
      const ry = this.add.rectangle(W + rk * 340, 120 + rk * 150, 620, 30, 0xffffff, 0.07).setAngle(-24);
      this.cineContent.add(ry); rayas.push(ry);
      this.tweens.add({ targets: ry, x: -400, duration: 900 + rk * 240, repeat: -1 });
    }
    /* sacudida de esfuerzo 2-3px a alta frecuencia (se CLAVA en el freeze) */
    const shakeTw = this.tweens.add({ targets: sp, x: "+=2", y: "-=2", duration: 46, yoyo: true, repeat: -1, delay: F.entrada_ms || 420 });
    if (cfg.especial) {   // la escena más espectacular: doble flash + líneas más gruesas
      this.lineasVelocidad(W * 0.3, H * 0.5, 1.4, 0xffd84d);
      this.time.delayedCall((F.entrada_ms || 420) * 0.6, () => this.uiCam.flash(140, 255, 216, 77));
    }
    let sr = null;
    if (cfg.rival) {
      /* V9 B3: el ANTAGONISTA también va ilustrado (naranja si es rival, con tu
         pinta si sos vos). Antes salía siempre por texturaEscena y por eso el
         muñequito de bloques aparecía mezclado con las ilustraciones —incluso
         del lado tuyo, en las escenas donde el prota es el rival. */
      const kAnt = this.poseDelAntagonista(cfg);
      if (kAnt) {
        sr = this.add.image(W + 140, H * 0.62, kAnt);
        sr.setScale((F.alto_rival || 250) / sr.height);
        sr.setFlipX(true);
        sr._esPose = true;
      } else {
        sr = this.add.sprite(W + 140, H * 0.62, this.texturaEscena(cfg.rival.j, cfg.rival.esRival, cfg.rival.anim, 0)).setScale(F.escala_rival || 2.9).setFlipX(true);
      }
      this.cineContent.add(sr);
      this.tweens.add({ targets: sr, x: W * 0.72, duration: (F.entrada_ms || 420) * 1.15, ease: "Quad.easeOut" });
    }
    /* nombres con placa del bando (celeste vs naranja + texto: forma y palabra, no solo color) */
    const placa = (x, j, esRival) => {
      const t = this.add.text(x, H * 0.84, (j.esVos ? "VOS" : (j.nombre || "").toUpperCase().slice(0, 12)),
        { fontFamily: window.PF.texto, fontSize: "13px", fontStyle: "bold", color: "#0a1f13", backgroundColor: esRival ? "#FF8A50" : "#4FC3F7", padding: { x: 8, y: 3 } }).setOrigin(0.5);
      this.cineContent.add(t);
    };
    placa(W * 0.3, cfg.prota.j, cfg.prota.esRival);
    if (cfg.rival) placa(W * 0.72, cfg.rival.j, cfg.rival.esRival);
    this.lineasVelocidad(W / 2, H * 0.45, 0.9, rivProta ? 0xff8a50 : 0xffd84d);
    this.uiCam.flash(90, 255, 255, 220);
    const snd = this.SFX; snd && snd.whoosh && snd.whoosh(F.entrada_ms || 420);
    /* pose → SILENCIO → DESENLACE → volver (todo por delayedCall, idempotente:
       V6 R4 el SKIP —un toque durante la escena— adelanta a la revelación y cierra) */
    /* V8 D: cfg.rapida = viñeta corta (pases y robos, que pasan seguido) */
    const multR = cfg.rapida ? 0.55 : 1;
    const tPose = this.msV(((F.entrada_ms || 420) + (F.pose_ms || 650)) * multR);
    /* BLOQUE A · EL SILENCIO SEGÚN EL ESCALÓN. Era fijo en 500 ms y no se
       acortaba nunca, ni con la velocidad rápida: en un gol eso es la mitad del
       efecto, pero en una gambeta del minuto 20 es medio segundo de negro por
       una jugada cualquiera, y eso pasa treinta veces por partido. En el
       escalón 3 queda intacto; en el 2 se recorta al 40%. */
    const silencio = escalon >= 3 ? (feel.silencio_ms || 500) : Math.round((feel.silencio_ms || 500) * 0.4);
    const esc = { revelado: false, cerrado: false };
    const revelar = () => {
      if (esc.revelado) return; esc.revelado = true;
      this.uiCam.flash(60, 255, 255, 255);   // V6 §3.1: un frame blanco en el contacto
      if (sp.active && sp._esPose) {
        /* la pose final ilustrada (festejo / arquero que atajó), si existe */
        const finId = this.poseParaEscena(cfg.prota, cfg.poseFinalProta || cfg.prota.anim);
        if (finId && this.poseKey(finId) && finId !== poseId && !cfg.pose) {
          sp.setTexture(this.poseKey(finId));
          sp.setScale(360 / sp.height);
        }
        /* pelota naranja de arquero_ataja_v2: la del juego encima (aviso de arte) */
        const actual = sp.texture && sp.texture.key;
        if (actual === "pose_arquero_ataja" && this.textures.exists("ball")) {
          const bb = this.add.sprite(sp.x + sp.displayWidth * 0.26, sp.y - sp.displayHeight * 0.09, "ball").setScale(2.2);
          this.cineContent.add(bb);
        }
      } else if (sp.active) sp.setTexture(this.texturaEscena(cfg.prota.j, cfg.prota.esRival, cfg.poseFinalProta || cfg.prota.anim, 3));
      /* V9 B3: si el antagonista ya es una pose ilustrada, NO se lo pisa con el
         heroico paramétrico en la revelación (era el otro camino a los bloques) */
      if (sr && sr.active && cfg.rival && !sr._esPose) sr.setTexture(this.texturaEscena(cfg.rival.j, cfg.rival.esRival, cfg.poseFinalRival || cfg.rival.anim, 3));
      /* ══════════════════════════════════════════════════════════════════
         A5 · "CUANDO PATEO ESTÁ BUGUEADO".

         Medido en vivo, en el cuadro exacto de la revelación:
           antes:   el arquero mide 250 px de alto
           después: 2.923 px, en un lienzo de 540

         El golpe de escala del final estaba escrito con las constantes de los
         SPRITES VIEJOS: escala_prota 3,4 y escala_rival 2,9 eran multiplicadores
         para el muñequito paramétrico de 34x50. Cuando V9 B3 pasó los
         antagonistas a ilustraciones (853 px de fuente), este renglón quedó
         multiplicando 853 x 3,25. La pierna del arquero ocupaba cinco pantallas.

         Pasa en TODO remate que no es gol —atajada, afuera, córner, bloqueo—,
         que es la mayoría, y justo en el instante en que mirás para saber si
         entró. Es la misma familia que el resto de esta tanda: un sistema
         nuevo encima de uno viejo, y el renglón que quedó hablando el idioma
         del viejo.

         El arreglo: para una ilustración, el golpe es RELATIVO —un 12% más
         grande de lo que ya está—, que es lo que el efecto quiso decir siempre.
         Las constantes quedan solo para el muñequito, que todavía es la red de
         seguridad si el manifest no cargó. */
      var GOLPE = 1.12;
      if (cfg.gana) {
        if (sp._esPose) sp.setScale(sp.scaleX * GOLPE);
        else sp.setScale((F.escala_prota || 3.4) * (cfg.especial ? 1.25 : 1) * GOLPE);
        this.burst(sp.x, sp.y - 70);
      } else if (sr) {
        if (sr._esPose) sr.setScale(sr.scaleX * GOLPE);
        else sr.setScale((F.escala_rival || 2.9) * GOLPE);
      }
      if (cfg.especial) { this.uiCam.shake(320, 0.012); this.lineasVelocidad(sp.x, sp.y - 40, 1.6, 0xffd84d); }
      if (cfg.hinchada) this.tribunaSaltando();   // V6 P5: la tribuna SALTA en el gol
      this.punch(cfg.titulo, cfg.sub || "", cfg.color != null ? cfg.color : (cfg.gana ? 0xffd84d : 0xe3503e));
      if (snd) {
        if (cfg.sfx === "goal") { snd.net(); this.time.delayedCall(90, () => snd.goal()); }
        else if (cfg.sfx && snd[cfg.sfx]) snd[cfg.sfx]();
      }
      this.uiCam.shake(200, cfg.gana ? 0.008 : 0.005);
    };
    const cerrarYa = () => {
      if (esc.cerrado) return; esc.cerrado = true;
      this._escSkip = null;
      this.cerrarEscena(cfg.alFinal);
    };
    this._escSkip = () => { if (!esc.revelado) revelar(); else cerrarYa(); };
    this.time.delayedCall(tPose, () => {
      if (esc.revelado) return;
      /* V6 §3.1 · EL FREEZE: la imagen SE CLAVA — sacudida y rayas paran, silencio */
      shakeTw.stop();
      rayas.forEach(r => this.tweens.killTweensOf(r));
      if (sp.active && !sp._esPose) sp.setTexture(this.texturaEscena(cfg.prota.j, cfg.prota.esRival, cfg.prota.anim, 2));
      this.musicaDuck(silencio);   // ANIME D: la música CALLA en el silencio pre-desenlace
    });
    this.time.delayedCall(tPose + silencio, revelar);
    this.time.delayedCall(tPose + silencio + this.msV(F.hold_ms || 1150), cerrarYa);
  }
  cerrarEscena(alFinal) {
    /* V6 §3.1: CORTE SECO entre viñetas — negro un instante y de vuelta al
       partido, nada de fundidos (como el manga entre viñetas) */
    this.cineBig.setAlpha(0); this.cineSub.setAlpha(0);
    this.limpiarContenido();
    this.cineBlack.setAlpha(1);   // un instante de NEGRO (la canaleta entre viñetas)
    this.time.delayedCall(70, () => {
      this.cineBlack.setAlpha(0);
      this.cineLayer.setVisible(false);
      this.mundoLayer.setVisible(!this._split); this.hudLayer.setVisible(true);
      this.zoomBase();
      /* el alFinal corre ANTES de liberar: si encadena (otra escena, un menú,
         la definición) fija su estado y NO hay ventana LIBRE donde la sim
         pueda meter un evento encima (carrera real cazada en la combinada) */
      this.estado = "RESOLUCION";
      alFinal && alFinal();
      if (this.estado === "RESOLUCION") this.estado = "LIBRE";
    });
  }
  /* ¿la capa cinemática está activa? (flag B + el sonido/pulido de la E6 acompañan) */
  hayEscenas() { return this.FLAGS.v4_escenas && this.FLAGS.e6_cine; }

  /* ============ V6 §3.4 · LAS SECUENCIAS (el techo de espectáculo) ============
     Jugadas que ENCADENAN escenas del gestor en una sola acción épica.
     Costo alto de aguante, desbloqueo por progresión, firma del crack (VOS). */
  secuenciaDisponible(tipo) {
    const S = this.BAL.secuencias || {};
    const st = this.st, j = st.mios[st.ctrl];
    if (!this.FLAGS.v6_secuencias || !this.hayEscenas() || !j || !j.esVos || st.posesion !== "mia") return null;
    if (tipo === "megacorrida") {
      const costo = S.megacorrida_aguante || 300;
      return (this._nivelCarrera >= (S.megacorrida_nivel || 2) && j.aguante >= costo) ? { costo } : null;
    }
    const costoC = S.combinada_aguante || 160;
    return (this._nivelCarrera >= (S.combinada_nivel || 2) && j.aguante >= costoC && window.PampaPartido.receptoresPase(st).some(r => r.adelante)) ? { costo: costoC } : null;
  }
  /* MEGACORRIDA: se te van quedando rivales atrás uno a uno, y rematás */
  secuenciaMegacorrida() {
    const st = this.st, P = window.PampaPartido, S = this.BAL.secuencias || {};
    /* B2 · DISPARADOR 3 · LA MEGACORRIDA ya es una corrida hacia el arco: el
       plano profundo es literalmente lo que está pasando. */
    this.quizasProfundo("megacorrida", {}, { rival: true });
    const j = st.mios[st.ctrl];
    j.aguante = Math.max(0, j.aguante - (S.megacorrida_aguante || 300));
    const eslabones = S.megacorrida_rivales || 2;
    const delante = st.rivales.map((r, i) => ({ r, i })).filter(o => o.r.pos !== "ARQ" && o.r.x > j.x - 40).sort((a, b) => a.r.x - b.r.x);
    const paso = (k) => {
      if (k >= eslabones || k >= delante.length) { this.entrarDefinicionOf({ libre: true }); return; }   // el remate, con el arquero estirándose
      const rv = delante[k];
      const r = P.resolverDuelo(st, { accion: "gambeta", poder: (j.stats.gambeta || 50) + (S.bonus_duelo || 8), costo: 0 });
      if (r.win) {
        P.ganarAtaque(st, "gambeta", rv.i);
        this.escenaCine({
          etiqueta: "· MEGACORRIDA " + (k + 1) + "/" + eslabones + " ·",
          prota: { j, esRival: false, anim: "gambeta" },
          pose: "corriendo", pelotaAlPie: true,   // ARTE 2: la corrida a fondo (pelota del juego al pie)
          rival: { j: rv.r, esRival: true, anim: "pase" },
          gana: true, sfx: "whoosh",
          titulo: "¡SIGUE LA CORRIDA!", sub: "va quedando gente atrás (" + (k + 1) + " de " + eslabones + ")",
          alFinal: () => { this.relatar("gambeta_win"); paso(k + 1); }
        });
      } else {
        P.perderPelota(st);
        this.escenaCine({
          etiqueta: "· la corrida murió ·",
          prota: { j: rv.r, esRival: true, anim: "pase" },
          rival: { j, esRival: false, anim: "gambeta" },
          gana: true, color: 0xe3503e, sfx: "gloves",
          titulo: "¡TE FRENARON!", sub: "la megacorrida murió en el eslabón " + (k + 1),
          alFinal: () => this.relatar("gambeta_lose")
        });
      }
    };
    paso(0);
  }
  /* JUGADA COMBINADA: pared, se suma un compañero, elegís, y ÉL define */
  secuenciaCombinada() {
    const st = this.st, P = window.PampaPartido, S = this.BAL.secuencias || {};
    const j = st.mios[st.ctrl];
    j.aguante = Math.max(0, j.aguante - (S.combinada_aguante || 160));
    const r = P.resolverDuelo(st, { accion: "pared", poder: (j.stats.pase || 50) + (S.bonus_duelo || 8), costo: 0 });
    if (!r.win) {
      P.perderPelota(st);
      this.escenaCine({
        etiqueta: "· la combinada ·",
        prota: { j: st.rivales[st.portadorRival], esRival: true, anim: "pase" }, rival: null,
        gana: true, color: 0xe3503e, sfx: "gloves",
        titulo: "¡CORTARON LA PARED!", sub: "leyeron la jugada combinada",
        alFinal: () => this.relatar("corte")
      });
      return;
    }
    const rec = P.receptoresPase(st).filter(x => x.adelante)[0] || P.receptoresPase(st)[0];
    this.escenaCine({
      etiqueta: "· JUGADA COMBINADA ·",
      prota: { j, esRival: false, anim: "pase" }, rival: null,
      pose: "pared",                              // ARTE 2: el toque de primera
      gana: true, sfx: "kick",
      titulo: "¡PARED Y SE SUMA " + ((st.mios[rec.idx].nombre || "EL COMPA").toUpperCase().slice(0, 10)) + "!",
      sub: "elegí cómo termina",
      alFinal: () => {
        /* el compañero recibe y elige: CENTRO (llega alta) o AL PIE */
        st.ctrl = rec.idx;
        const c = st.mios[rec.idx];
        c.x = Math.min(c.x + 60, st.W - 90);
        st.pelota.x = c.x + 12; st.pelota.y = c.y;
        this.st.modo = "congelado";
        this.abrirMenuCruz({
          titulo: "🤝 ¡" + (c.nombre || "EL COMPA").toUpperCase() + " LA RECIBE EN EL ÁREA!",
          izq: { j: c, guts: c.aguante },
          opciones: {
            W: { texto: "🎯 AL PIE", sub: "define de remate", cb: () => this.entrarDefinicionOf({ libre: true }) },
            E: { texto: "☁ CENTRO", sub: "la pide ARRIBA (cabeza/chilena)", cb: () => { st._altaHasta = st._t + 6000; this.entrarDefinicionOf({ libre: true }); } }
          },
          volver: null
        });
      }
    });
  }

  /* ============ ETAPA 6 · pulido cinematográfico ============ */
  /* V6 §3.3 P4: el anuncio de MEGACOSA ya no es una franjita — es una ESCENA
     del gestor a pantalla completa: pose ilustrada, rayas barriendo, grito
     grande, carga de aguante visible, y corte seco al siguiente paso. */
  cutInEspecial(titulo, sub, cb, jRet, esRivalRet) {
    if (typeof sub === "function") { cb = sub; sub = null; }   // compat con la firma vieja
    this.quitarDuelo(); this.limpiarMenu();
    this.estado = "ESCENA";
    this.mundoLayer.setVisible(false); this.hudLayer.setVisible(false);
    this.cineLayer.setVisible(true);
    this.uiCam.setZoom(1); this.uiCam.centerOn(480, 270);
    this.limpiarContenido();
    const j = jRet || this.st.mios[this.st.ctrl];
    const g = this.cineBG; g.clear();
    g.fillStyle(0x081c10, 1); g.fillRect(0, 0, 960, 540);
    g.fillStyle(esRivalRet ? 0x2a0b0b : 0x0b1c2a, 1);
    g.fillTriangle(0, 0, 634, 0, 326, 540); g.fillTriangle(0, 0, 326, 540, 0, 540);
    /* pose ilustrada del dueño (mía = remate, rival = barrida); si no, el retrato grande */
    /* B3-E: la pose sale del PUESTO del que hace el especial, no solo del
       bando. Un arquero que hace una megaatajada tiene que verse atajando. */
    const idCut = (jRet && jRet.pos === "ARQ") ? "arquero_ataja" : (esRivalRet ? "barrida" : "remate");
    const spr = this.poseSprite(idCut, -220, 290, 380, () => {
      const im = this.add.image(0, 0, this.retratoKey(j, !!esRivalRet, esRivalRet ? "frustrado" : "triunfante"));
      im.setScale(300 / im.height);
      return im;
    });
    this.cineContent.add(spr);
    this.tweens.add({ targets: spr, x: 300, duration: this.msV(300), ease: "Back.easeOut" });
    for (let rk = 0; rk < 3; rk++) {
      const ry = this.add.rectangle(960 + rk * 320, 110 + rk * 160, 620, 26, 0xffffff, 0.08).setAngle(-24);
      this.cineContent.add(ry);
      this.tweens.add({ targets: ry, x: -400, duration: 800 + rk * 200, repeat: -1 });
    }
    this.lineasVelocidad(480, 250, 1.3, esRivalRet ? 0xff8a50 : 0xffd84d);
    const txt = this.add.text(1300, 210, titulo, { fontFamily: window.PF.display, fontSize: "24px", color: "#ffd84d", stroke: "#9c2b1d", strokeThickness: 4 }).setOrigin(0.5);
    const subTxt = this.add.text(1300, 252, sub || ((j.esVos ? "VOS" : j.nombre) + " toma fuerza…"), { fontFamily: window.PF.texto, fontSize: "14px", color: "#f6efdc" }).setOrigin(0.5);
    this.cineContent.add(txt); this.cineContent.add(subTxt);
    this.tweens.add({ targets: [txt, subTxt], x: 620, duration: this.msV(300), ease: "Back.easeOut" });
    /* Feel B5: CARGA DE AGUANTE VISIBLE — la barra se llena mientras el anuncio dura */
    const cargaBg = this.add.rectangle(620, 320, 340, 14, 0x0a1f13, 0.9).setStrokeStyle(2, 0xf6efdc, 0.8);
    const carga = this.add.rectangle(620 - 168, 320, 4, 10, 0xffd84d, 1).setOrigin(0, 0.5);
    const cargaTxt = this.add.text(620, 340, "cargando aguante…", { fontFamily: window.PF.texto, fontSize: "10px", color: "#ffd84d" }).setOrigin(0.5);
    this.cineContent.add(cargaBg); this.cineContent.add(carga); this.cineContent.add(cargaTxt);
    this.tweens.add({ targets: carga, width: 336, duration: this.msV(820), ease: "Sine.easeIn" });
    this.uiCam.flash(120, 255, 216, 77);
    this.SFX && this.SFX.riserGrande && this.SFX.riserGrande(this.msV(1050) / 1000);
    this.time.delayedCall(this.msV(1150), () => {
      /* corte seco y el flujo sigue (timing del megatiro / resolución de la megadefensa) */
      this.limpiarContenido();
      this.cineBlack.setAlpha(1);
      this.time.delayedCall(60, () => {
        this.cineBlack.setAlpha(0);
        this.cineLayer.setVisible(false);
        this.mundoLayer.setVisible(!this._split); this.hudLayer.setVisible(true);
        this.estado = "RESOLUCION";
        cb();
      });
    });
  }
  /* V6 §3.3 P5: LA HINCHADA ANIMADA — tribuna de siluetas que SALTAN en el gol */
  tribunaSaltando() {
    const g = this.add.graphics();
    g.fillStyle(0x0e2c44, 1); g.fillRect(0, 0, 960, 96);
    this.cineContent.add(g);
    for (let f = 0; f < 2; f++) {
      for (let k = 0; k < 20; k++) {
        const x = 24 + k * 48 + (f % 2) * 24, y = 34 + f * 34;
        const tono = [0xf6efdc, 0xffd84d, 0x4fc3f7, 0xff8a50][(k + f) % 4];
        const cab = this.add.circle(x, y, 7, tono, 0.9);
        const cue = this.add.rectangle(x, y + 13, 12, 14, tono, 0.75);
        this.cineContent.add(cab); this.cineContent.add(cue);
        const salto = 8 + ((k * 7 + f * 5) % 8);
        this.tweens.add({ targets: [cab, cue], y: "-=" + salto, duration: 210 + (k % 4) * 40, yoyo: true, repeat: -1, delay: (k % 5) * 60 });
      }
    }
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
  /* PIEL P9 · la pantalla de final: apaga el partido y deja ver la ilustración */
  pantallaFinal(st) {
    const P = this.piel();
    /* 1) SE APAGA LO QUE YA NO SE JUEGA. El radar con sus 22 números, los dos
       medidores, el botón de acción y el hint del teclado no tienen nada que
       decir con el partido terminado, y son justo lo que el cartel tapaba. */
    const apagar = [this.radarG, this.radarZona, this._btnAccionCont, this._hintEspacio,
      this.gutsG, this.lblGuts, this.txtGuts, this.envionG, this.lblEnvion,
      this.txtEnvion, this.txtEnvionEstado, this.txtFichas, this.tickerTxt];
    apagar.push(this.radarMarco, this._radarTuArco);
    apagar.forEach(o => o && o.setVisible(false));
    (this.radarNumsMios || []).forEach(t => t.setVisible(false));
    (this.radarNumsRiv || []).forEach(t => t.setVisible(false));
    if (this._btnEnvion) this._btnEnvion.forEach(o => o.setVisible(false));
    if (this._btnCambiar) this._btnCambiar.forEach(o => o.setVisible(false));
    if (this.radarMarco) this.radarMarco.setVisible(false);
    this._finalApagado = true;

    /* 2) LA ILUSTRACIÓN QUEDA LIMPIA: el velo del panel baja del todo para que
       la figura recorte, y no se le escribe nada encima. */
    if (this.panelVelo) this.panelVelo.setAlpha(0);

    /* 3) EL RESULTADO, EN SU FRANJA. Abajo del panel, en la zona que dejó
       libre el mapa apagado: no compite con el dibujo. */
    const gano = st.golesMio > st.golesRival, empate = st.golesMio === st.golesRival;
    const franja = this.add.rectangle(480, 380, 960, 86, P.n.caja, 0.94);
    const titulo = this.add.text(480, 356, empate ? "EMPATE" : (gano ? "GANASTE" : "PERDISTE"),
      { fontFamily: window.PF.display, fontSize: "15px", color: empate ? "#f6efdc" : (gano ? P.acento : P.calido) }).setOrigin(0.5);
    const cifra = this.add.text(480, 392, "VOS " + st.golesMio + " - " + st.golesRival + " " + this.nombreRival,
      { fontFamily: window.PF.display, fontSize: "26px", color: "#f6efdc" }).setOrigin(0.5);
    const linea = this.add.rectangle(480, 337, 960, 2, P.n.acento, 0.65);
    this.menuLayer.add([franja, linea, titulo, cifra]);
  }
  finDelPartido() {
    const st = this.st;
    this.estado = "FINAL";     // estado propio: ningún delayedCall de resolución lo puede barrer
    /* PASADA DE COHERENCIA · el botón de ACCIÓN seguía vivo despues del pitazo,
       con su "ESPACIO = ACCIÓN", en la misma pantalla que dice GANASTE. El
       partido termino: no hay accion que hacer. */
    if (this._btnPulso && this._btnPulso.pause) this._btnPulso.pause();
    if (this._btnAccionCont && this._btnAccionCont.setVisible) this._btnAccionCont.setVisible(false);
    if (this._hintEspacio && this._hintEspacio.setVisible) this._hintEspacio.setVisible(false);
    if (this._btnCambiar && this._btnCambiar.setVisible) this._btnCambiar.setVisible(false);
    if (this._btnEnvion && this._btnEnvion.setVisible) this._btnEnvion.setVisible(false);
    this.cerrarMusica();       // P5: motivo de cierre y traba — no se reenciende
    if (this.SFX && this.SFX.musicaUrgente) this.SFX.musicaUrgente(false);
    this.SFX && this.SFX.whistle();
    this.relatar("final");
    this.quitarDuelo();
    this.limpiarMenu();
    /* PIEL P9 · EL FINAL ES UNA PANTALLA, no un cartel encima del partido.
       Antes el texto caía sobre el torso del jugador y el botón se comía la
       franja de arriba del mapa, con el radar y los medidores siguiendo vivos
       debajo. Ahora: se apaga lo que ya no se juega (radar, medidores, botones
       del partido), la ilustración queda LIMPIA, el resultado va en su franja
       propia abajo del todo y el botón vive en el HUD, fuera de la cancha. */
    this.pantallaFinal(st);
    /* V7 §2: la fecha del MODO MASTER devuelve el resultado a la carrera */
    if (this._masterPartido) {
      const b3 = this.add.rectangle(480, 496, 420, 54, 0x7ee08a, 1).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
      const bt3 = this.add.text(480, 496, "▶ SEGUIR LA CARRERA", { fontFamily: window.PF.display, fontSize: "12px", color: "#0a1f13" }).setOrigin(0.5);
      this.menuLayer.add([b3, bt3]);
      b3.on("pointerdown", () => {
        /* LA VIDA v2: el lunes se calcula con cómo TERMINASTE, no solo con el resultado */
        const vosF = st.mios.find(j => j.esVos);
        this.game.registry.set("masterResultado", {
          golesMio: st.golesMio, golesRival: st.golesRival,
          hiceGol: !!this._hiceGol,
          aguanteFinalFrac: vosF ? Math.max(0, Math.min(1, vosF.aguante / this.BAL.aguante.max)) : 0.6,
          golpeFuerte: !!this._golpeFuerte
        });
        this.game.registry.remove("masterPartido");
        this.scene.start("master");
      });
      this.selloMenu();
      return;
    }
    const b = this.add.rectangle(480, 496, 320, 54, 0x7ee08a, 1).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
    const bt = this.add.text(480, 496, "↺ OTRO PARTIDO", { fontFamily: window.PF.display, fontSize: "12px", color: "#0a1f13" }).setOrigin(0.5);
    this.menuLayer.add([b, bt]);
    b.on("pointerdown", () => this.scene.restart());
    /* FUSIÓN: el resultado vuelve a la carrera clásica (mismo formato pampa_star_v1
       vía aplicarFecha del clásico — acá solo se deja el resultado y se vuelve) */
    if (this._pedido) {
      const b2 = this.add.rectangle(480, 398, 460, 54, 0xffd84d, 1).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
      const bt2 = this.add.text(480, 398, "▶ APLICAR Y VOLVER A LA CARRERA", { fontFamily: window.PF.display, fontSize: "10px", color: "#0a1f13" }).setOrigin(0.5);
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
    /* V7-1: el destino del pase se toca EN EL MAPA; sin split, sobre la cancha */
    const hx = this._split ? this.radar.x + this.radar.w / 2 : (this._vista4 ? 480 : this.radar.x + this.radar.w / 2);
    const hy = this._split ? this.radar.y - 14 : (this._vista4 ? 528 : this.radar.y - 26);
    const hint = this.add.text(hx, hy,
      this._split
        ? "➡ PASE: tocá el DESTINO en el MAPA (□ = receptores; más allá = AL VACÍO · ◄► + ENTER, ▲ = al vacío, ESC = volver)"
        : this._vista4
          ? "➡ PASE: tocá el DESTINO sobre la cancha (□ = receptores; más allá = AL VACÍO · ◀▶ + ENTER, ▲ = al vacío, ESC = volver)"
          : "➡ PASE: tocá el DESTINO en el radar\n(más allá del receptor = AL VACÍO · teclado: ◀▶ + ENTER, ▲ = al vacío, ESC = volver)",
      { fontFamily: window.PF.texto, fontSize: "10px", color: "#0a1f13", backgroundColor: "#ffd84d", padding: { x: 6, y: 3 }, align: "center" }).setOrigin(0.5, 1);
    this._paseCancelar = () => {
      if (this._paseOrigen.libre) this.reanudarLibre(); else this.abrirMenuAtaque(this._paseOrigen.rivalIdx, false);
    };
    const cx = this._vista4 ? 906 : this.radar.x + this.radar.w + 36;
    const cy = this._vista4 ? 306 : this.radar.y + 24;
    const cancel = this.add.rectangle(cx, cy, 56, 48, 0xdcd6c2, 0.95).setStrokeStyle(2, 0x0a1f13).setInteractive({ useHandCursor: true });
    const ct = this.add.text(cx, cy, "✕", { fontFamily: window.PF.texto, fontSize: "18px", color: "#0a1f13" }).setOrigin(0.5);
    this.menuLayer.add([hint, cancel, ct]);
    cancel.on("pointerdown", (p, x, y, ev) => {
      ev && ev.stopPropagation && ev.stopPropagation(); this._uiTocado = this.time.now;
      this._paseCancelar && this._paseCancelar();
    });
    this.selloMenu();
  }
  /* ============ FEEL B4 · LA TENSIÓN DEL PASE: nunca más instantáneo ============ */
  /* C4 · se borró distALinea(p, a, b): helper geométrico (distancia de un punto
     a un segmento) sin un solo llamador en todo el repo. Era del cálculo viejo
     de interceptación del pase, que hoy resuelve logic/partido.js. */
  confirmarPase(rec, alVacio) {
    const st = this.st, P = window.PampaPartido;
    this._receptores = null;
    /* foto ANTES de resolver: origen, destino y el rival que puede cortarla */
    const origen = { x: st.mios[st.ctrl].x, y: st.mios[st.ctrl].y };
    const destino = { x: st.mios[rec.idx].x, y: st.mios[rec.idx].y };
    if (alVacio) destino.x = Math.min(destino.x + (this.BAL.partido.vacio_avance || 130), st.W - 60);
    /* V6 §1 F3: solo puede cortarla quien está GEOMÉTRICAMENTE entre pasador y
       receptor, dentro del corredor — nunca uno que quedó detrás o al costado */
    let cortador = null, dMin = 60;
    const pdx = destino.x - origen.x, pdy = destino.y - origen.y, pL2 = pdx * pdx + pdy * pdy || 1;
    st.rivales.forEach((r) => {
      if (r.pos === "ARQ") return;
      const t = ((r.x - origen.x) * pdx + (r.y - origen.y) * pdy) / pL2;
      if (t < 0.1 || t > 0.92) return;
      const d = Math.hypot(r.x - (origen.x + pdx * t), r.y - (origen.y + pdy * t));
      if (d < dMin) { dMin = d; cortador = r; }
    });
    /* la verdad se decide UNA vez en la lógica; el teatro solo la cuenta */
    /* V9 §2: foto de QUIÉN la toca y QUIÉN la espera — resolverPase le pasa el
       control al receptor, así que después ya no se sabe quién fue el pasador */
    const quien = { pateador: st.mios[st.ctrl], receptor: st.mios[rec.idx] };
    let res, texto;
    if (alVacio) {
      res = P.resolverPaseAlVacio(st, rec.idx, rec.pct);
      texto = res.win ? "¡PASE AL VACÍO!\n" + st.mios[st.ctrl].nombre.toUpperCase() + " la agarra en carrera\n(el arquero quedó vendido)" : "¡La adelantaste demasiado!\nPelota rival.";
    } else {
      res = P.resolverPase(st, rec.idx, rec.pct);
      texto = res.win ? "AHORA JUGÁS: " + st.mios[st.ctrl].nombre.toUpperCase() : "¡INTERCEPTADO!\nLeyeron el pase.";
    }
    /* B2 · DISPARADOR 1 · EL PASE LARGO. La distancia ya está: es la que
       separa origen de destino, que se calcularon arriba para saber quién
       puede cortarla. Si pasa el umbral, la cámara se va atrás del que la tira
       y el panel muestra el viaje en profundidad. El pase corto sigue en el
       plano lateral: si cada toque cortara, el corte no significaría nada. */
    const distPase = Math.hypot(destino.x - origen.x, destino.y - origen.y);
    this.quizasProfundo("pase", { distancia: distPase }, { rival: false });
    this.animarPase(origen, destino, alVacio, cortador, res.win, texto, quien, res);
  }
  animarPase(origen, destino, alVacio, cortador, win, texto, quien, res) {
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
        /* ANIME F: el pase largo LLEGA ALTO cerca del arco — se abre la decisión aérea.
           V6 §4: con LA DEFINICIÓN activa, la decisión vive ADENTRO (botones CABEZA/CHILENA). */
        this.quitarDuelo();
        if (this.FLAGS.v6_definicion) this.entrarDefinicionOf({ libre: true });
        else this.abrirMenuAereo();
      } else if (this.hayEscenas() && this.escenaPase) {
        /* V9 §2 · EL PASE SE VE, SIEMPRE Y ENTERO: se acomoda, le pega, la
           pelota VIAJA y —si hay alguien en la línea— el rival se TIRA a
           cortarla, con freeze y silencio antes de saber. Antes solo tenía
           viñeta el caso sin cortador (el menos tenso) y el corte perdido;
           el pase GANADO con un rival lanzándose moría en un cartel. */
        this.quitarDuelo();
        this.zoomBase();
        const st = this.st;
        const cortJ = cortador || (!win ? st.rivales[st.portadorRival] : null);
        this.escenaPase({
          alVacio: alVacio, cortador: cortJ, win: win,
          pateador: (quien && quien.pateador) || st.mios[st.ctrl],
          receptor: (quien && quien.receptor) || st.mios[st.ctrl],
          titulo: win ? (cortJ ? "¡LE PASÓ POR AL LADO!" : texto.split("\n")[0])
            : (alVacio ? "¡NO LLEGÓ!" : "¡CORTADO!"),
          sub: this.porQuePase(res, cortJ, alVacio, win),
          alFinal: () => {
            if (!win) this.relatar("corte");
            this.estado = "LIBRE";
          }
        });
      } else {
        this.mostrarResolucion(texto, win ? "#7ee08a" : "#e3503e", { anim: "pase", gana: win });
      }
    };
    /* V9 §2: en pantalla partida el MAPA ESTÁ APAGADO — toda esta coreografía
       (la pelota viajando, el rival lanzándose, el silencio) se jugaba donde
       nadie la veía, y encima demoraba el desenlace. Con el mapa oculto se va
       derecho a la escena de arriba, que la cuenta entera. */
    if (this._split && this.hayEscenas() && this.escenaPase) {
      this.time.delayedCall(this.msV(90), cerrar);
      return;
    }
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
    const t = this.add.text(480, 226, texto, { fontFamily: window.PF.display, fontSize: "13px", color: colorHex, stroke: "#0a1f13", strokeThickness: 3, align: "center", lineSpacing: 8 }).setOrigin(0.5).setScale(0.3);
    this.menuLayer.add(t);
    this.selloMenu();
    this.tweens.add({ targets: t, scale: 1, duration: 260, ease: "Back.easeOut" });
    this.animarResolucion(animCfg);
    /* FEEL B1: NINGUNA resolución devuelve el control antes del mínimo (teatro obligatorio) */
    this.time.delayedCall(this.msV((this.BAL.feel && this.BAL.feel.resolucion_min_ms) || 1600), () => {
      if (this.estado !== "RESOLUCION") return;
      this.quitarDuelo();
      this.limpiarMenu();
      this.zoomBase();
      this.estado = "LIBRE";
    });
  }
  /* ETAPA 4: la resolución se VE — el que actúa reproduce su animación de 4 frames */
  animarResolucion(cfg) {
    if (!cfg) return;
    /* P3 · PRIMERO EL PANEL, que es lo que se ve. La animación de mundoLayer
       de más abajo se conserva para cuando la pantalla partida esté apagada,
       pero ya no es el único camino — antes era el único, y era invisible. */
    if (this._split) {
      /* SOLO ids que existen en data/poses_manifest.json — pedir una pose que
         no está es volver al silencio de antes. Las 12 que hay: remate,
         chilena, cabezazo, barrida, arquero_vuela, arquero_ataja, festejo,
         gambeta_gana, gambeta_pierde, pared, bloqueo, corriendo.
         El test p3_tramite verifica esta correspondencia contra el manifiesto. */
      const POSE = {
        quite: "barrida", corte: "barrida", bloqueo: "bloqueo",
        tiro: "remate", gambeta: "gambeta_gana", pase: "pared",
        arquero: "arquero_ataja"
      };
      const id = POSE[cfg.anim] || (cfg.gana ? "gambeta_gana" : "gambeta_pierde");
      const listo = this.poseTramite(id, (this.BAL.feel && this.BAL.feel.resolucion_min_ms || 1600) * 0.55);
      /* si NO se pudo, se anota: una acción muda es una deuda, no un silencio.
         El test p3_tramite lee este contador. */
      if (!listo) {
        this._tramitesMudos = (this._tramitesMudos || 0) + 1;
        this._tramiteMudoUltimo = cfg.anim + " (pose " + id + ")";
      }
    }
    if (!this.FLAGS.e4_arte || !this._esHeroico) return;
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
    if (!this.radar) return;
    /* PIEL P9: con el partido terminado el mapa se apaga y no se vuelve a
       dibujar. Sin esta guarda, el update lo repinta en el frame siguiente y
       la etiqueta "TU ARCO" reaparece sobre la pantalla de final. */
    if (this._finalApagado) return;
    const g = this.radarG, R = this.radar, st = this.st;
    g.clear();
    const mx = wx => R.x + this.fx(wx) / st.W * R.w, my = wy => R.y + wy / st.H * R.h;
    /* V9 §10: con el cambio de lado hay que DECIR cuál arco defendés — texto y
       posición, nunca solo el color. Sin esto, darse vuelta se lee como un bug. */
    if (!this._radarTuArco) {
      this._radarTuArco = this.add.text(0, 0, "◄ TU ARCO", { fontFamily: window.PF.texto, fontSize: "10px", color: "#0a1f13", backgroundColor: "#4FC3F7", padding: { x: 4, y: 1 } }).setOrigin(0, 0).setDepth(30);
      this.hudLayer.add(this._radarTuArco);
    }
    const izq = st.ladoVisual !== 2;
    this._radarTuArco.setText(izq ? "◄ TU ARCO" : "TU ARCO ►")
      .setOrigin(izq ? 0 : 1, 0)
      .setPosition(izq ? R.x + 3 : R.x + R.w - 3, R.y + 3)
      .setVisible(true);
    /* V7-1: EL MAPA es protagonista — cancha completa dibujada (pasto, líneas, áreas) */
    if (this._split) {
      g.fillStyle(0x1e6b33, 1); g.fillRect(R.x, R.y, R.w, R.h);
      g.fillStyle(0x236f38, 1);
      for (let fx = 0; fx < 6; fx++) g.fillRect(R.x + fx * R.w / 6, R.y, R.w / 12, R.h);
      g.lineStyle(2, 0xeafff0, 0.6);
      g.strokeRect(R.x + 2, R.y + 2, R.w - 4, R.h - 4);
      g.strokeCircle(mx(st.W / 2), my(st.H / 2), R.h * 0.18);
      g.strokeRect(R.x + 2, my(st.H / 2) - R.h * 0.26, R.w * 0.13, R.h * 0.52);
      g.strokeRect(R.x + R.w - 2 - R.w * 0.13, my(st.H / 2) - R.h * 0.26, R.w * 0.13, R.h * 0.52);
    }
    g.lineStyle(1, 0xeafff0, 0.35);
    g.beginPath(); g.moveTo(mx(st.W / 2), R.y + 2); g.lineTo(mx(st.W / 2), R.y + R.h - 2); g.strokePath();
    /* V7-1 §2.2: IMPRECISIÓN — los rivales SÍ se ven, pero su posición en el
       mapa solo se actualiza cada imprecision_ms y con un desvío de hasta
       imprecision_radio (px de mundo). Los tuyos y la pelota, exactos y fluidos. */
    let posRiv = st.rivales;
    if (this._split) {
      const V = this.BAL.vista || {};
      const ahora = this.time.now;
      /* A2 (playtest): con un MENÚ abierto el mundo se congela ENTERO — la
         imprecisión del mapa dejaba a los rivales saltando mientras leías */
      const congelado = this.estado !== "LIBRE" && this.estado !== "BEAT";
      if (!congelado && (!this._imprec || ahora >= this._imprec.hasta || this._imprec.pos.length !== st.rivales.length)) {
        const rad = V.imprecision_radio != null ? V.imprecision_radio : 60;
        this._imprec = {
          hasta: ahora + (V.imprecision_ms != null ? V.imprecision_ms : 750),
          pos: st.rivales.map(j => {
            const a = Math.random() * Math.PI * 2, d = Math.random() * rad;
            return { x: Phaser.Math.Clamp(j.x + Math.cos(a) * d, 8, st.W - 8), y: Phaser.Math.Clamp(j.y + Math.sin(a) * d, 8, st.H - 8) };
          })
        };
      }
      /* A2: si el menú abrió ANTES del primer latido todavía no hay foto —
         se dibuja con las posiciones reales (nunca null) */
      posRiv = (this._imprec && this._imprec.pos.length === st.rivales.length) ? this._imprec.pos : st.rivales;
    }
    /* rivales: TRIÁNGULOS #FF8A50 */
    st.rivales.forEach((j, i) => {
      const p = posRiv[i] || j;
      const x = mx(p.x), y = my(p.y);
      /* L2 · el TRIÁNGULO es el caso peor: su área útil es la mitad que la de
         un círculo y el ancho crece hacia la base, así que el número va abajo,
         al 75% de la altura, donde el ancho disponible es base·0,75. */
      const TB = (this.LEG && this.LEG.ficha_rival_base != null) ? this.LEG.ficha_rival_base : 30;
      const TH = (this.LEG && this.LEG.ficha_rival_alto != null) ? this.LEG.ficha_rival_alto : 26;
      const ap = y - TH * 0.55, ba = y + TH * 0.45;
      g.fillStyle(0xff8a50, 1); g.fillTriangle(x, ap, x + TB / 2, ba, x - TB / 2, ba);
      g.lineStyle(1.5, 0x0a1f13, 0.9); g.strokeTriangle(x, ap, x + TB / 2, ba, x - TB / 2, ba);
      this.radarNumsRiv[i].setPosition(x, ap + TH * 0.72);
    });
    /* míos: CÍRCULOS con el TONO de camiseta que elegiste en el editor
       (Original = celeste titular) — en el mapa te reconocés por tu color de
       equipo + el NÚMERO + el anillo del controlado (forma, no solo color).
       El rival sigue naranja y TRIÁNGULO: el bando nunca depende del tono. */
    if (this._colorMapaMio == null) {
      this._colorMapaMio = 0x4fc3f7;
      const CMm = this.game.registry.get("caras");
      const vosJ = st.mios.find(jj => jj.esVos);
      if (CMm && CMm.camisetas && vosJ && vosJ.look) {
        const lv = window.PampaAvatar.validarLook(vosJ.look);
        if (lv.tCam > 0) this._colorMapaMio = parseInt(String(CMm.camisetas[(lv.tCam - 1) % CMm.camisetas.length].hex).slice(1), 16);
      }
      /* CONTRASTE DEL NÚMERO Y EL BORDE.
         El número del radar y el anillo eran negros fijos: contra los celestes
         se leían, pero con una camiseta oscura (Negro tranquera, Bordó salitral)
         quedaban negro sobre negro y la ficha desaparecía del mapa. Se elige por
         LUMA del tono: oscuro → tinta clara, claro → tinta oscura. El número
         tiene que leerse siempre, porque en el mapa te reconocés por el número
         tanto como por el color. */
      const c = this._colorMapaMio;
      const luma = 0.2126 * ((c >> 16) & 255) + 0.7152 * ((c >> 8) & 255) + 0.0722 * (c & 255);
      const claro = luma < 128;
      this._tintaMapaMio = claro ? 0xf6efdc : 0x0a1f13;
      this.radarNumsMios.forEach(t => t.setColor(claro ? "#f6efdc" : "#0a1f13"));
    }
    /* L2 · LA FICHA CRECE CON EL NÚMERO. El número de dos dígitos más ancho
       ("88") mide 20x17 lógicos a 16px — medido con la fuente real, no
       estimado. Sobre un círculo de radio 5,5 se pintaba AFUERA de su propia
       ficha. Para que entre centrado hace falta r ≥ 13,1: a la altura del
       texto (±8,5) el ancho disponible del círculo es 2·√(r²−8,5²). */
    const RF = (this.LEG && this.LEG.ficha_r != null) ? this.LEG.ficha_r : 13;
    st.mios.forEach((j, i) => {
      const x = mx(j.x), y = my(j.y);
      g.fillStyle(this._colorMapaMio, 1); g.fillCircle(x, y, RF);
      g.lineStyle(1.5, this._tintaMapaMio, 0.9); g.strokeCircle(x, y, RF);
      if (i === st.ctrl) { g.lineStyle(3, 0xffffff, 1); g.strokeCircle(x, y, RF + 3.5); }
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
    /* PIEL · LA JERARQUÍA DEL MARCADOR.
       Antes el resultado, el rival y la división iban en UN solo texto de 12px,
       y el reloj (14px) terminaba siendo más grande que el resultado: el ojo no
       tenía dónde agarrarse. Ahora son tres cosas distintas:
         RESULTADO  display 17px, crema — lo más grande de la barra
         división   texto 10px, apagado — abajo, que informa y no compite
         reloj      display 14px, acento — a la derecha, su esquina de siempre */
    this.txtMarcador = this.add.text(480, 13, "", { fontFamily: window.PF.display, fontSize: "17px", color: "#f6efdc" }).setOrigin(0.5);
    this.txtDivision = this.add.text(480, 26, "", { fontFamily: window.PF.texto, fontSize: "10px", color: "#9fb3a5" }).setOrigin(0.5);
    this.txtReloj = this.add.text(948, 15, "", { fontFamily: window.PF.display, fontSize: "14px", color: "#ffd84d" }).setOrigin(1, 0.5);
    /* PIEL P5 · LOS DOS MEDIDORES, CADA COSA EN SU LUGAR.
       Antes el número de AGUANTE estaba en y=512 y la barra de ENVIÓN en
       y=503-515: el número se dibujaba literalmente ENCIMA de la otra barra.
       Y la barra de aguante llegaba a y=542 con un canvas de 540, así que
       además se cortaba contra el borde de abajo.
       Ahora cada medidor es una fila: ETIQUETA · barra · NÚMERO, las tres cosas
       una al lado de la otra y ninguna encima de nada. El número siempre a la
       vista, que la lectura no puede depender del color de la barra. */
    const MD = this.MEDIDORES = { xEtq: 754, xBarra: 820, xNum: 948, yEnvion: 500, yGuts: 522, wBarra: 84 };
    this.lblEnvion = this.add.text(MD.xEtq, MD.yEnvion, "ENVIÓN", { fontFamily: window.PF.texto, fontSize: "10px", color: "#9fb3a5" }).setOrigin(0, 0.5);
    this.lblGuts = this.add.text(MD.xEtq, MD.yGuts, "AGUANTE", { fontFamily: window.PF.texto, fontSize: "10px", color: "#9fb3a5" }).setOrigin(0, 0.5);
    this.txtGuts = this.add.text(MD.xNum, MD.yGuts, "", { fontFamily: window.PF.display, fontSize: "13px", color: "#f6efdc" }).setOrigin(1, 0.5);
    this.gutsG = this.add.graphics();
    this.hudLayer.add([barra, this.txtMarcador, this.txtDivision, this.txtReloj, this.gutsG, this.lblGuts, this.txtGuts]);
    /* V6 §2 R3: el MEDIDOR DE ENVIÓN — barra + NÚMERO siempre (accesibilidad) */
    this.envionG = this.add.graphics();
    this.txtEnvion = this.add.text(MD.xNum, MD.yEnvion, "", { fontFamily: window.PF.display, fontSize: "13px", color: "#f6efdc" }).setOrigin(1, 0.5);
    /* el estado del envión (LLENO / EN USO) va en su propia línea arriba: es
       texto, no color, porque el color solo no alcanza para leerlo */
    this.txtEnvionEstado = this.add.text(MD.xEtq, 480, "", { fontFamily: window.PF.texto, fontSize: "10px", color: "#ffd84d" }).setOrigin(0, 0.5);
    this.hudLayer.add([this.envionG, this.lblEnvion, this.txtEnvion, this.txtEnvionEstado]);
    const be = this.add.rectangle(838, 396, 150, 48, 0xffd84d, 0.97).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
    this.vestirBoton(be);   /* PIEL P2 */
    const bet = this.add.text(838, 396, "🌟 POTENCIAR", { fontFamily: window.PF.texto, fontSize: "12px", fontStyle: "bold", color: "#0a1f13" }).setOrigin(0.5);
    this.hudLayer.add([be, bet]);
    this._btnEnvion = [be, bet];
    be.on("pointerdown", (p, x, y, ev) => {
      ev && ev.stopPropagation && ev.stopPropagation(); this._uiTocado = this.time.now;
      const P = window.PampaPartido;
      if (P.gastarEnvionPotencia(this.st)) {
        this.avisar("🌟 ¡EQUIPO ENCENDIDO! (+bonus un rato)");
        this.SFX && this.SFX.goal && this.SFX.crowd && this.SFX.crowd(900);
      }
    });
    /* ANIME E: el ticker del RELATOR · V9 §8: SUBIDO. En y=520 pisaba la banda
       de abajo del mapa (el radar en pantalla partida llega a y≈521) justo
       donde se dibujan las fichas pegadas a la línea de fondo. Ahora vive en
       la franja libre entre el panel de escena (termina en 122) y el marco del
       mapa (arranca en 320), que además es donde está mirando el ojo. */
    const REL = this.BAL.relator || {};
    this.tickerTxt = this.add.text(480, REL.y || 300, "", { fontFamily: window.PF.texto, fontSize: "12px", color: "#f6efdc", backgroundColor: "#0a1f13dd", padding: { x: 10, y: 4 }, align: "center", wordWrap: { width: 560 } }).setOrigin(0.5).setAlpha(0).setDepth(50);
    this.hudLayer.add(this.tickerTxt);
    /* PIEL P6 · EL BOTÓN DE SONIDO, ADENTRO DE LA BARRA DEL MARCADOR.
       Era una caja de 48x48 con borde crema en (36,62): quedaba flotando ENCIMA
       de la ilustración del panel (que arranca en y=30) y se leía como una caja
       blanca enorme tapando el dibujo. Ahora vive en el hueco libre de la
       izquierda de la barra del marcador (que ocupa y 0..30), sin caja propia.
       El ÁREA TÁCTIL sigue siendo de 44px aunque el dibujo mida 26: en celular
       un blanco de 26px no se acierta. */
    const mb = this.add.rectangle(24, 15, 26, 26, 0x0a1f13, 0)
      .setInteractive(new Phaser.Geom.Rectangle(-9, -9, 44, 44), Phaser.Geom.Rectangle.Contains, { useHandCursor: true });
    this._muteTxt = this.add.text(24, 15, (this.SFX && this.SFX.isMuted()) ? "🔇" : "🔊", { fontSize: "15px" }).setOrigin(0.5);
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
    /* PIEL: el RESULTADO va solo y grande; la división abajo, chica */
    const marcador = "VOS " + st.golesMio + " - " + st.golesRival + " " + this.nombreRival;
    if (this._hudMarc !== marcador) { this._hudMarc = marcador; this.txtMarcador.setText(marcador); }
    const division = this._division ? this._division.n : "";
    if (this._hudDiv !== division) { this._hudDiv = division; this.txtDivision.setText(division); }
    /* V8 E (playtest): el reloj se VE — MINUTOS:SEGUNDOS, con los segundos
       redondeados al tramo (balance.tempo.tramo_seg) para que se sienta correr */
    const tramo = (this.BAL.tempo && this.BAL.tempo.tramo_seg) || 15;
    const segs = Math.floor((st.minuto % 1) * 60 / tramo) * tramo;
    const mm = (m > lim ? lim : m), ss = ("0" + segs).slice(-2);
    const reloj = mm + ":" + ss + (m > lim ? "+" : "") + " " + (st.tiempo === 1 ? "1T" : "2T");
    if (this._hudReloj !== reloj) { this._hudReloj = reloj; this.txtReloj.setText(reloj); }
    /* barra de aguante del PORTADOR (si la tiene el rival, su tanque compartido) */
    const p = this.portadorActual();
    const max = this.BAL.aguante.max;
    const val = p.esRival ? this.st.aguanteRival : p.j.aguante;
    const frac = Phaser.Math.Clamp(val / max, 0, 1);
    const color = frac > 0.5 ? 0x2e7d32 : frac > 0.25 ? 0xf9a825 : 0xc62828;
    /* PIEL P5: la barra va en su fila, entre la etiqueta y el número, y NO
       toca el borde de abajo (antes llegaba a y=542 con el canvas en 540). */
    const MD = this.MEDIDORES;
    const bx = MD.xBarra, by = MD.yGuts - 5, bw = MD.wBarra, bh = 10;
    const g = this.gutsG; g.clear();
    g.fillStyle(0x0a1f13, 0.85); g.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
    g.fillStyle(color, 1); g.fillRect(bx, by, bw * frac, bh);
    g.lineStyle(1, 0xf6efdc, 0.8); g.strokeRect(bx, by, bw, bh);
    /* el número solo: la etiqueta "AGUANTE" es un texto fijo al lado */
    const gutsTxt = String(Math.round(val));
    if (this._hudGuts !== gutsTxt) { this._hudGuts = gutsTxt; this.txtGuts.setText(gutsTxt); }
    /* PIEL P5: con el menú de duelo abierto, los retratos ya traen el aguante
       de los dos protagonistas; los medidores del HUD quedaban justo debajo,
       encimados con el del rival. Se esconden mientras dura el menú. */
    /* ...y con el partido TERMINADO tampoco: la pantalla de final los apaga y
       refrescarHUD sigue corriendo, así que sin esto los volvería a encender
       en el frame siguiente. */
    const menuAbierto = this.estado === "MENU" || this.estado === "TEMPO_MENU" ||
      this.estado === "FINAL" || this._finalApagado ||
      (this.menuLayer && this.menuLayer.visible && this.menuLayer.list.length > 0);
    if (this._medidoresOcultos !== menuAbierto) {
      this._medidoresOcultos = menuAbierto;
      [this.gutsG, this.lblGuts, this.txtGuts, this.envionG, this.lblEnvion,
       this.txtEnvion, this.txtEnvionEstado].forEach(o => o && o.setVisible(!menuAbierto));
    }
    /* V8 §3: las FICHAS del jugadón, siempre a la vista (letra + número) */
    if (this.jugadonFichas) {
      const F = this.jugadonFichas();
      const fTxt = "🌟 QUITES " + F.quites + " · GAMBETAS " + F.gambetas + " · TIROS " + F.tiros;
      if (this._hudFichas !== fTxt) {
        this._hudFichas = fTxt;
        if (!this.txtFichas) {
          /* subido de (14,512): ahi tapaba la esquina inferior izquierda del
             mapa (133x17px sobre la linea de fondo de tu arco). Las fichas son
             un dato de estado y viven en la barra de estado. */
          /* C4 · y de 44 a 52: el botón de mute vive en x=24 con 26 px de ancho
             (llega hasta 37) pero su ÁREA TÁCTIL es de 44, o sea que termina en
             46 y el texto arrancaba en 44. Se pisaban por 2 px, y en teléfono
             eso es tocar el mute cuando querías leer las fichas. Medido con el
             barrido de solapes del partido en vivo. */
          this.txtFichas = this.add.text(52, 15, "", { fontFamily: window.PF.texto, fontSize: "11px", color: "#ffd84d" }).setOrigin(0, 0.5);
          this.hudLayer.add(this.txtFichas);
        }
        this.txtFichas.setText(fTxt);
      }
    }
    /* Feel B3: el botón ⚡ACCIÓN pulsa cuando hay acciones disponibles */
    if (this._btnPulso) {
      const activo = this.estado === "LIBRE" && st.posesion === "mia";
      if (activo && this._btnPulso.paused) this._btnPulso.resume();
      else if (!activo && !this._btnPulso.paused) { this._btnPulso.pause(); this._btnAccionCont.setScale(1); }
    }
    /* C4 · CON UN MENÚ ABIERTO, EL BOTÓN ⚡ACCIÓN SE VA. Ya elegiste abrir el
       momento: las opciones están en las cartas, y el botón se queda atrás de la
       ficha del rival asomando el amarillo por los costados con el nombre
       encima. Se veía feo en las dos medidas. Vuelve solo al cerrarse el menú. */
    if (this._btnAccionCont) {
      const conMenu = this.estado === "MENU" || this.estado === "PASE";
      this._btnAccionCont.setVisible(!conMenu);
      if (this._hintEspacio) this._hintEspacio.setVisible(!conMenu);
    }
    /* Anime A: el ⇄ de ciclado manual solo aparece cuando defendés */
    if (this._btnCambiar) {
      const verlo = this.estado === "LIBRE" && st.posesion === "rival";
      this._btnCambiar.forEach(o => o.setVisible(verlo));
    }
    /* V6 R3: barra de ENVIÓN (mérito) + número SIEMPRE; el botón aparece llena y atacando */
    if (this.envionG) {
      const P6 = window.PampaPartido;
      const E = this.BAL.envion || { max: 100 };
      const fracE = Phaser.Math.Clamp((st.envion || 0) / E.max, 0, 1);
      const MDe = this.MEDIDORES;
      const ex = MDe.xBarra, ey = MDe.yEnvion - 4, ew = MDe.wBarra, eh = 8;
      const ge = this.envionG; ge.clear();
      ge.fillStyle(0x0a1f13, 0.85); ge.fillRect(ex - 2, ey - 2, ew + 4, eh + 4);
      ge.fillStyle(0xf9a825, 1); ge.fillRect(ex, ey, ew * fracE, eh);
      ge.lineStyle(1, 0xf6efdc, 0.8); ge.strokeRect(ex, ey, ew, eh);
      /* el número solo; el ESTADO va arriba, en palabras (no en color) */
      const etxt = String(Math.round(st.envion || 0));
      if (this._hudEnvion !== etxt) { this._hudEnvion = etxt; this.txtEnvion.setText(etxt); }
      const estado = P6.envionActivo(st) ? "⚡ ENVIÓN EN USO" : (fracE >= 1 ? "🌟 ENVIÓN LLENO" : "");
      if (this._hudEnvionEst !== estado) { this._hudEnvionEst = estado; this.txtEnvionEstado.setText(estado); }
      if (this._btnEnvion) {
        const verE = this.estado === "LIBRE" && st.posesion === "mia" && P6.envionLleno(st);
        this._btnEnvion.forEach(o => o.setVisible(verE));
      }
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
    /* V7-1: sin mundo no hay cámara ni bake — solo el tema musical del lado */
    if (this._split) {
      if (this.FLAGS.e6_cine) {
        const lado7 = p.esRival ? "rival" : "mia";
        if (lado7 !== this._ladoTema) {
          this._ladoTema = lado7;
          this.SFX && this.SFX.temaPosesion && this.SFX.temaPosesion(lado7);
          /* M2 · el tema del partido NO cambia por posesión: sería un corte de
             pista cada tres segundos. Lo que cambia con la posesión es el
             GOLPE corto (temaPosesion), que es efecto y no música. */
        }
      }
      return;
    }
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
        /* M2 · idem: el loop ya no cambia con la posesión (ver arriba) */
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
    /* V7-1: en pantalla partida SOLO el MAPA navega (tap o arrastre sobre él) */
    if (this._split) {
      if (R && p.x >= R.x && p.x <= R.x + R.w && p.y >= R.y && p.y <= R.y + R.h) {
        const w = this.radarAMundo(p);
        this.target = { x: Phaser.Math.Clamp(w.x, 14, this.st.W - 14), y: Phaser.Math.Clamp(w.y, 14, this.st.H - 14) };
      }
      return;
    }
    if (R && p.x > R.x - 8 && p.x < R.x + R.w + 8 && p.y > R.y - 8) return;   // sobre el radar
    if (this.FLAGS.e3_menus && p.x > 790 && p.y > (this._vista4 ? 360 : 420)) return;   // botones ⚡/⇄ (si existen)
    const w = this.cameras.main.getWorldPoint(p.x, p.y);
    /* Anime A: en la vista elevada el toque se invierte con la MISMA perspectiva
       que el dibujo (aSim) — tocás la franja del fondo y el jugador va al fondo */
    this.target = this._vista4 ? this.aSim(w.x, w.y) : { x: this.fx(w.x / this.SX), y: w.y / this.SY };
  }

  /* ============================== UPDATE ============================== */
  update(time, delta) {
    const st = this.st, P = window.PampaPartido;
    /* PIEL P2: los menús del partido nacen en runtime (duelo, remate, tempo,
       jugadón), así que sus botones se visten acá, apenas aparecen. Cada 6
       frames y con guard: el trabajo real es solo sobre los recién creados. */
    if (this.vestirPendientes) this.vestirPendientes(6);
    /* ETAPA 5: la economía de aguante corre con el flag e5_guts; apagado = tanques quietos (sandbox) */
    if (!this.FLAGS.e5_guts) { st.mios[st.ctrl].aguante = this.BAL.aguante.max; st.aguanteRival = this.BAL.aguante.max; }
    /* V9 §8: la frase emitida con el HUD apagado (cine, Definición, Jugadón)
       espera y sale acá, apenas la capa vuelve. Va ANTES de los returns por
       estado justo para que no dependa de en qué estado esté el partido. */
    if (this._relPendiente && this.soltarRelatoPendiente) this.soltarRelatoPendiente();

    /* Feel B5: el CINE de 5 planos y la BARRA DE TIMING tienen su propio pulso */
    if (this.estado === "CINE") { this.updateViaje(delta); return; }
    if (this.estado === "ESCENA") return;   // Anime B: la viñeta corre por reloj propio
    /* V8 C: el JUGADÓN es un MINIJUEGO — corre su propio latido (movimiento
       libre, rivales que vienen); el partido de abajo sigue congelado */
    if (this.estado === "JUGADON") { if (this.updateJugadonMini) this.updateJugadonMini(delta); return; }
    if (this.estado === "DEFINICION") { this.updateDefinicion(delta); return; }   // V6 §4
    /* §9 EN SERIO: fuera de LIBRE la simulación NO corre (pausa → animación → pausa,
       estados realmente separados — si no, rivalTira/final pisan la resolución) */
    if (this.estado !== "LIBRE") {
      if (this.estado === "MENU" || this.estado === "PASE") this.teclasDeMenu();
      this.dibujarRadar();
      this.refrescarHUD();
      /* A2: con menú abierto NADA se mueve — ni el bob del panel (la escena
         queda clavada como una viñeta mientras decidís) */
      /* P6-B: mientras dura el viaje profundo, el panel lo maneja ÉL. El modo
         lateral ni se actualiza: son excluyentes. */
      if (this._prof && this._prof.activo) this.updatePanelProfundo();
      else if (this._split && this.estado !== "MENU" && this.estado !== "PASE") this.updatePanelEscena(delta);
      else if (this._split && this.velarPanel) this.velarPanel(delta);   // A4: el velo sí sigue vivo
      else { this.updateFichas(true); this.dibujarPaseCancha(); }
      return;
    }

    /* input de movimiento: con pelota movés al portador; SIN pelota movés a tu
       MARCADOR (lo leés en el radar por su anillo — perseguir drena aguante, §7) */
    let input = null;
    if (this.estado === "LIBRE") {
      const ctrl = st.mios[st.ctrl];
      if (this.cursors) {
        let dx = 0, dy = 0;
        if (this.cursors.left.isDown || this.wasd.A.isDown) dx -= 1;
        if (this.cursors.right.isDown || this.wasd.D.isDown) dx += 1;
        if (this.cursors.up.isDown || this.wasd.W.isDown) dy -= 1;
        if (this.cursors.down.isDown || this.wasd.S.isDown) dy += 1;
        /* V9 B1: con el lado dado vuelta, "derecha" en pantalla es -x en la
           simulación. Sin esto, en el 2T ibas al arco y corrías para atrás. */
        if (st.ladoVisual === 2) dx = -dx;
        if (dx || dy) { input = { dx, dy }; this.target = null; }
      }
      if (!input && this.target) {
        const dx = this.target.x - ctrl.x, dy = this.target.y - ctrl.y;
        if (Math.hypot(dx, dy) > 8) input = { dx, dy }; else this.target = null;
      }
    }

    /* flag e3_menus apagado = sandbox de la E1 (sin cruces, remate rival auto-resuelto) */
    if (!this.FLAGS.e3_menus) st.cooldown = 9e9;
    /* V8 §1 · EL PULSO: el partido avanza por LATIDOS discretos (tuc-tuc), no
       por segundos continuos. Cada latido_ms se corre UN tramo de simulación
       (dt_ms); entre latidos el mundo está QUIETO — nadie corre fluido como en
       un simulador moderno. El input vale el que está apretado AL latido. Flag `pulso`
       apagado = el tiempo real viejo, solo para comparar. La sim pura
       (logic/partido.js) no cambia: el pulso es CÓMO se la invoca. */
    let evs;
    if (this.FLAGS.pulso !== false) {
      const PU = this.BAL.pulso || {};
      this._pulsoAcum = (this._pulsoAcum || 0) + delta;
      const latido = PU.latido_ms || 380;
      evs = [];
      if (this._pulsoAcum >= latido) {
        this._pulsoAcum -= latido;
        if (this._pulsoAcum > latido) this._pulsoAcum = 0;   // tras una pausa larga, un solo latido
        evs = P.tick(st, PU.dt_ms || 300, input);
        if (input) this._pulsoMovioHasta = this.time.now + latido + 80;   // el bob del panel no se corta entre latidos
      }
    } else {
      evs = P.tick(st, delta, input);
    }
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
          const defs = ((this.MEGA && this.MEGA.megadefensas) || []).filter(m => (m.tipo === "quite" || m.tipo === "bloqueo") && st.aguanteRival >= (m.aguante || 250));
          if (defs.length) {
            const semilla = ((st.golesMio + st.golesRival) * 7 + Math.floor(st.minuto * 10)) % 100;
            if (semilla / 100 < (F6.mega_prob_caliente || 0.45)) this._megaRival = defs[semilla % defs.length];
          }
        }
        this.beatDeTension(st.rivales[ev.rivalIdx], true, null, () => this.abrirMenuAtaque(ev.rivalIdx, false));
      }
      else if (ev.tipo === "encuentroDef") this.beatDeTension(st.mios[st.ctrl], false, null, () => this.abrirMenuDefensa());
      else if (ev.tipo === "rivalTira") {
        if (this.escenaRemateRival) {
          /* V9 C1: TE REMATAN sin pantalla de gestión — el rival define, tus
             defensores saltan, el arquero vuela. Todo por posición, cansancio
             y nivel, con intriga hasta el final. */
          const arq = st.mios.find(j => j.pos === "ARQ");
          this.beatDeTension(arq, false, "keeper_mio", () => this.escenaRemateRival(ev.rivalIdx));
        }
        /* C3 · acá había un fallback a abrirMenuArquero() —el menú de gestión
           del arquero, con sus tres escenaCine— que era INALCANZABLE: solo
           corría si no existía escenaRemateRival, y esa se define en
           escenas_v9.js, que index.html carga siempre. Verificado con grep: la
           única llamada del proyecto era esta línea. Si algún día escenas_v9.js
           no cargara, el else de abajo resuelve la atajada igual, en texto. */
        else { const res = P.resolverAtajada(st, Math.random() < 0.5 ? "atajar" : "despejar"); aviso = res.golRival ? "GOL DE " + this.nombreRival : "¡La sacó tu arquero!"; }
      }
      else if (ev.tipo === "entretiempo") {
        P.entretiempo(st); this.transicionEntretiempo(); this.relatar("entretiempo");
        aviso = "ENTRETIEMPO — saca " + this.nombreRival;
        /* V9 §8+§10: el 2T ARRANCA de verdad — se anuncia el cambio de lado */
        this.time.delayedCall(this.msV(2400), () => this.relatar("arranca_2t"));
      }
      else if (ev.tipo === "final") this.finDelPartido();
    }

    /* el portador (y SOLO él) se dibuja; si la pelota cambió de dueño, corte de plano.
       V7-1: con pantalla partida el mundo está apagado — nada de esto se dibuja. */
    this.seguirPortador();
    const p = this.portadorActual();
    const wr = this.aRender(p.j.x, p.j.y);
    const wx = wr.x, wy = wr.y;
    const corriendo = (!p.esRival && !!input) || (p.esRival && st.esperaRival <= 0);
    if (this._split) { /* el panel de escena reemplaza al mundo */ }
    else if (this._esHeroico) {
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
    if (!this._split) {
      this.sprPortador.setPosition(wx, wy);
      const wb = this.aRender(st.pelota.x, st.pelota.y);
      this.sprPelota.setPosition(wb.x, wb.y + 34 - (this._botePelota || 0)).setScale(1.6 * this.escalaEn(st.pelota.y));
      this.marker.setText("▼ " + (p.j.esVos ? "VOS" : (p.j.nombre || "").toUpperCase().slice(0, 10)))
        .setPosition(wx, wy - 62);
    }
    /* Feel B8: el tema del avance crece al CRUZAR al campo rival (con la pelota) */
    if (this.FLAGS.e6_cine && st.posesion === "mia") {
      const zona = st.mios[st.ctrl].x > st.W / 2 ? "rival" : "propio";
      if (zona !== this._zonaTema) {
        this._zonaTema = zona;
        this.SFX && this.SFX.temaCampo && this.SFX.temaCampo(zona);
        /* M2 · musicaZona hacía crecer el motivo DEL SINTETIZADOR al cruzar de
         campo. Con archivos no hay motivo que crecer: lo que queda es el golpe
         corto de temaCampo, que es efecto. */
      }
    }
    /* pan vivo: mientras dura el corte, el destino persigue al portador real */
    const cam = this.cameras.main;
    if (this._panVivo && cam.panEffect.isRunning) cam.panEffect.destination.set(wx, wy);
    if (aviso) this.avisar(aviso);

    /* ETAPA 2: radar + HUD, siempre al día (V7-1: panel de escena en lugar del mundo) */
    this.dibujarRadar();
    this.refrescarHUD();
    this.chequearTramoFinal();       // M5
    if (this._prof && this._prof.activo) this.updatePanelProfundo();
    else if (this._split) this.updatePanelEscena(delta);
    else { this.updateFichas(false); this.dibujarPaseCancha(); }
  }

  /* aviso breve anclado al PORTADOR (a donde la cámara va, no de donde viene) */
  avisar(txt) {
    const fs = this._vista4 ? 24 : 12;   // texto del mundo: legible también en la vista elevada
    const t = this.add.text(this.sprPortador.x, this.sprPortador.y - 96, txt, { fontFamily: window.PF.texto, fontSize: fs + "px", color: "#f6efdc", backgroundColor: "#0a1f13dd", padding: { x: 8, y: 4 }, align: "center" })
      .setOrigin(0.5).setDepth(5000);
    this.mundoLayer.add(t);
    if (this.uiCam) this.uiCam.ignore(t);   // hijo dinámico: re-ignorar a mano
    this.tweens.add({ targets: t, alpha: 0, delay: 2200, duration: 500, onComplete: () => t.destroy() });
  }
};
