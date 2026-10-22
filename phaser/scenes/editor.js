/* ============================================================================
   PAMPA STAR · phaser/scenes/editor.js — EL EDITOR DE PINTA (Bloque C)
   La creación del personaje, versión Phaser: elegís tu pinta por CAPAS
   (piel, corte y color de pelo, ojos, cejas, boca, accesorios, camiseta)
   con steppers ◀ ▶ ETIQUETADOS (cada variante tiene nombre — daltonismo).
   Pestañas: VOS + tus 4 AMIGOS del save clásico (si existen). Se guarda
   RETROCOMPATIBLE en pampa_star_v1 (campo nuevo career.avatares; si no hay
   save, va a pampa_star_avatares). La cara elegida es la que aparece en el
   ZOOM del modo cine. Al terminar se vuelve a la carrera (o a la entrevista).
   ========================================================================== */
window.PampaEditor = class PampaEditor extends Phaser.Scene {
  constructor() { super("editor"); }

  /* EDITOR v2: los 8 bustos ilustrados del manifest (tolerante: sin manifest
     o sin PNG, vuelve el avatar de bloques y nada crashea) */
  preload() {
    /* L05: una cara que no bajó se vuelve a pedir una vez (logic/carga.js);
       si vuelve a fallar, queda el avatar de bloques como antes */
    if (window.PampaCarga) window.PampaCarga.reintentarUnaVez(this.load);
    /* L06: "CARGANDO LAS CARAS… NN%" en vez del lienzo en negro (si la
       intro ya las bajó en segundo plano, no aparece) */
    if (this.barraDeCarga) this.barraDeCarga("las caras");
    const CM = this.game.registry.get("caras");
    if (CM && CM.caras) {
      const base = CM.base || "assets/poses/caras/";
      CM.caras.forEach(c => {
        /* OJOS (tanda 1.0): la cara fuera de rotación no se baja */
        if (c.archivo && c.en_rotacion !== false && !this.textures.exists("cara_" + c.id)) this.load.image("cara_" + c.id, "../" + base + c.archivo);
      });
    }
  }

  create() {
    this.entrarDesdeNegro();
    /* L06 (carga-liviana): mientras se elige la pinta, en segundo plano, lo
       que va a pedir el partido (antes lo bajaba la intro, antes de la compuerta) */
    if (this.calentarElPartido) this.calentarElPartido();
    const W = this.scale.width, H = this.scale.height;
    this.W = W; this.H = H;
    const A = window.PampaAvatar;
    /* PIEL P1: fondo radial en vez del verde plano. El color de cámara queda
       como borde (lo de afuera del lienzo con Scale.FIT). */
    this.cameras.main.setBackgroundColor(this.piel().fondo_borde);
    this.fondoDePiel();

    /* ---- el save (tolerante): VOS + amigos ---- */
    this.career = null;
    try { const r = localStorage.getItem("pampa_star_v1"); if (r) this.career = JSON.parse(r); } catch (e) { }
    let sueltos = null;
    try { const r2 = localStorage.getItem("pampa_star_avatares"); if (r2) sueltos = JSON.parse(r2); } catch (e) { }
    const avs = (this.career && this.career.avatares) || sueltos || {};
    this.personajes = [{
      clave: "vos",
      nombre: (this.career && this.career.name) ? String(this.career.name).slice(0, 10) : "VOS",
      look: A.validarLook(avs.vos || A.migrarDelClasico(this.career && this.career.look) || A.crearLook())
    }];
    if (this.career && this.career.vida && Array.isArray(this.career.vida.amigos)) {
      this.career.vida.amigos.slice(0, 4).forEach(a => {
        if (!a || !a.nombre) return;
        const nom = String(a.nombre).slice(0, 12);
        this.personajes.push({
          clave: nom,
          nombre: nom,
          look: A.validarLook((avs.amigos && avs.amigos[nom]) || A.migrarDelClasico(a.look) || A.lookProcedural(nom))
        });
      });
    }
    this.sel = 0;

    /* ---- título + pestañas ---- */
    /* C2 · el PRINCIPAL del editor es TU PINTA: es de lo único que se trata la
       pantalla. La explicación de abajo pasa a apoyo.
       D5 · VENÍS A ARMAR LA PINTA ANTES DE LA ENTREVISTA: cuando el master te
       manda para acá con una carrera pendiente, el editor es el paso 1 de
       arrancar. El título lo dice en el mismo lugar (antes iba en otro renglón
       encima de este y se pisaban) y abajo queda una sola salida. */
    const pendiente = !!this.game.registry.get("carreraPendiente");
    this.add.text(W / 2, 30, pendiente ? "PASO 1 DE 2 · ARMÁ TU PINTA" : "TU PINTA", { fontFamily: window.PF.display, fontSize: window.PampaPiel.nivel(1), color: "#ffd84d" }).setOrigin(0.5);
    this.add.text(W / 2, 50, pendiente ? "después te van a entrevistar, y te van a ver así" : "la cara que elijas es la que aparece en los primeros planos del partido", { fontFamily: window.PF.texto, fontSize: window.PampaPiel.nivel(3), color: pendiente ? "#7ee08a" : "#f6efdc" }).setOrigin(0.5).setAlpha(0.8);
    this.tabs = [];
    const tw = Math.min(170, (W - 40) / this.personajes.length - 8);
    let tx0 = W / 2 - (this.personajes.length * (tw + 8) - 8) / 2 + tw / 2;
    this.personajes.forEach((p, i) => {
      const r = this.add.rectangle(tx0, 80, tw, 36, 0x0d2a18, 1).setStrokeStyle(2, 0xf6c11d, 0.7).setInteractive({ useHandCursor: true });
      const t = this.add.text(tx0, 80,(i === 0 ? "★ " : "♥ ") + p.nombre.toUpperCase(), { fontFamily: window.PF.display, fontSize: "13px", color: "#f6efdc" }).setOrigin(0.5);
      r.on("pointerdown", () => { const S = window.PampaSFX; if (S && S.ui) S.ui("mover"); this.sel = i; this.refrescar(); });
      this.tabs.push({ r, t });
      tx0 += tw + 8;
    });

    /* ---- vista previa (izquierda): cara grande + jugador de cancha ---- */
    /* A3 (playtest): el muñequito de bloques SE VA del editor — no aportaba y
       molestaba. Queda SOLO la cara ilustrada, grande y centrada. */
    this.imgCara = this.add.image(250, 240, "__WHITE").setScale(1.5);
    this.imgCancha = null;
    this.txtLabel = this.add.text(210, 372, "", { fontFamily: window.PF.texto, fontSize: "13px", color: "#cfe9d4", align: "center", wordWrap: { width: 320 }, backgroundColor: "#0a1f13e6", padding: { x: 10, y: 6 } }).setOrigin(0.5);

    /* ---- steppers (derecha) ----
       EDITOR v2: el creador de caras por rectángulos SE RETIRA — stepper grande
       de CARA (busto ilustrado) + los TINTES que se mantienen: PIEL, COLOR DE
       PELO y CAMISETA (tiñen los tonos planos del PNG). Ojos/cejas/boca
       desaparecen: la expresión ya viene en la ilustración. Sin manifest o sin
       PNGs → vuelve el editor de bloques completo (fallback tolerante). */
    this.CM = this.game.registry.get("caras");
    this._v2 = !!(this.CM && this.CM.caras && this.CM.caras.length && this.textures.exists("cara_" + this.CM.caras[0].id));
    const CATS = this._v2
      ? [{ k: "cara", n: "CARA" }, { k: "piel", n: "PIEL" }, { k: "colorPelo", n: "COLOR DE PELO" }, { k: "camiseta", n: "CAMISETA" }]
      : [
        { k: "piel", n: "PIEL" }, { k: "corte", n: "CORTE DE PELO" }, { k: "colorPelo", n: "COLOR DE PELO" },
        { k: "ojos", n: "OJOS" }, { k: "cejas", n: "CEJAS" }, { k: "boca", n: "BOCA" },
        { k: "acc", n: "ACCESORIO" }, { k: "camiseta", n: "CAMISETA" }
      ];
    /* V7-1 fix: los glifos ◀/▶ se rompían en las fuentes del celu (dos ▶ por
       fila) — las flechas ahora se DIBUJAN (triángulos, independientes de la
       fuente), los botones miden 48px+, y hay TECLADO: ↑↓ elige la fila
       (resaltada), ◄► cicla en ambas direcciones. */
    this.filas = {}; this.filaRects = []; this.CATS = CATS; this.filaSel = 0;
    this._filaCajas = []; this._botones = [];
    let fy = 122;
    CATS.forEach((c, ci) => {
      const cx = 690;
      const lbl = this.add.text(cx - 235, fy - 1, c.n, { fontFamily: window.PF.texto, fontSize: "13px", color: "#f6c11d" }).setOrigin(0, 0.5);
      const mk = (x, d) => {
        const r = this.add.rectangle(x, fy, 52, 44, 0xf6efdc, 1).setStrokeStyle(2, 0x0a1f13).setInteractive({ useHandCursor: true });
        const g = this.add.graphics();
        g.fillStyle(0x0a1f13, 1);
        if (d < 0) g.fillTriangle(x - 9, fy, x + 7, fy - 10, x + 7, fy + 10);   // ◄ dibujado, no glifo
        else g.fillTriangle(x + 9, fy, x - 7, fy - 10, x - 7, fy + 10);        // ► dibujado
        r.on("pointerdown", (p, xx, yy, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); this.filaSel = ci; this.mover(c.k, d); });
        return r;
      };
      /* EDITOR: el control se agrupa. Antes las flechas estaban en cx-92 y
         cx+212 con el valor en cx+60: 152px de aire a cada lado, la fila
         desparramada de punta a punta. Ahora [◄ valor ►] se lee como una sola
         cosa, y el grupo entero termina en x=914 (46px de aire al filo). */
      mk(cx - 18, -1); mk(cx + 198, 1);
      this.filas[c.k] = this.add.text(cx + 90, fy, "", { fontFamily: window.PF.texto, fontSize: "13px", color: "#f6efdc", align: "center" }).setOrigin(0.5);
      this.filaRects.push(lbl);
      /* la caja del foco es la FILA ENTERA, no la etiqueta: de la etiqueta
         (cx-235) hasta el filo de la flecha derecha (cx+198+26). Va declarada
         porque el label mide 60px y el cursor abrazaria solo eso. */
      this._filaCajas.push({ x: cx - 241, y: fy - 24, w: 471, h: 48 });
      fy += 46;
    });
    /* ══════════════════════════════════════════════════════════════════════
       EL EDITOR ES EL ULTIMO GRUPO, Y ES DISTINTO A LOS OTROS SIETE.

       En la semana, el mapa, la entrevista, el pasillo y la cruz, las flechas
       MUEVEN EL FOCO y Enter confirma. Aca no: una fila es un SELECTOR, y
       izquierda/derecha CAMBIAN EL VALOR. Meterle grupoFoco con su teclado le
       robaria las flechas y romperia lo unico que el editor hace.

       Asi que el foco entra con sinTeclado y las teclas siguen siendo del
       editor: arriba/abajo mueven, izquierda/derecha ciclan. Lo que se gana es
       lo que le faltaba y el resto del juego ya tenia — la escuadra que viaja,
       la elevacion, el pulso y la VOZ. El resalte de ► + color se queda: es
       otro canal mas, y sin color no se pierde.

       Y los BOTONES DE ABAJO entran al recorrido. Antes no habia forma de
       llegar a GUARDAR ni a la cancha con el teclado: se armaba la pinta con
       las flechas y despues habia que tocar la pantalla. */
    if (this.input.keyboard) {
      const irA = (i) => {
        const n = CATS.length + this._botones.length;
        this.filaSel = (i + n) % n;
        if (this._foco) this._foco.mover(this.filaSel);
        this.refrescar();
      };
      this.input.keyboard.on("keydown-UP", () => irA(this.filaSel - 1));
      this.input.keyboard.on("keydown-DOWN", () => irA(this.filaSel + 1));
      this.input.keyboard.on("keydown-LEFT", () => { if (this.filaSel < CATS.length) this.mover(CATS[this.filaSel].k, -1); });
      this.input.keyboard.on("keydown-RIGHT", () => { if (this.filaSel < CATS.length) this.mover(CATS[this.filaSel].k, 1); });
      this.input.keyboard.on("keydown-ENTER", () => {
        const b = this._botones[this.filaSel - CATS.length];
        if (b && b.cb) b.cb();
        else if (this.filaSel < CATS.length) this.mover(CATS[this.filaSel].k, 1);   // en una fila, Enter cicla
      });
    }

    /* ---- abajo: guardar + a la cancha ---- */
    const btn = (x, w, texto, bg, accion, sonido) => {
      const cb = () => { const S = window.PampaSFX; if (S && S.ui) S.ui(sonido || "confirmar"); accion(); };
      const r = this.add.rectangle(x, H - 40, w, 52, bg, 1).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
      this.add.text(x, H - 40, texto, { fontFamily: window.PF.display, fontSize: "13px", color: "#0a1f13" }).setOrigin(0.5);
      r.on("pointerdown", cb);
      this._botones.push({ obj: r, cb: cb });
      return r;
    };
    let volver;
    if (pendiente) {
      /* 20/oct, Rodri: con la carrera recién elegida no había cómo volver y
         ESC no hacía nada. VOLVER guarda la pinta y deja el pendiente como
         está: JUGAR CARRERA, en el título, trae de vuelta a este paso.
         Revisión del 22/oct: así la localidad ya no se podía cambiar. VOLVER
         lleva al paso de antes, el mapa, con la localidad elegida marcada, y
         del mapa ◀ VOLVER AL MENÚ va al título */
      volver = btn(105, 170, "◀ VOLVER", 0xf6efdc, () => {
        this.guardar();
        this.game.registry.set("carreraPendiente", null);
        this.irA("master");
      }, "volver");
      btn(W / 2 - 145, 250, "💾 GUARDAR PINTA", 0xf6efdc, () => { this.guardar(); this.toast("¡Pinta guardada!"); });
      /* "🏆 CARRERA" arriba a la derecha no se lee como "seguí por acá", y
         ¡A LA CANCHA! te sacaba de la carrera: con la carrera pendiente, la
         salida hacia adelante es esta */
      btn(W / 2 + 170, 320, "▶ LISTO, A LA ENTREVISTA", 0x7ee08a, () => { this.guardar(); this.irA("master"); });
    } else {
      btn(W / 2 - 190, 300, "💾 GUARDAR PINTA", 0xf6efdc, () => { this.guardar(); this.toast("¡Pinta guardada!"); });
      /* 20/oct, Rodri: ¡A LA CANCHA! y 🏆 CARRERA sueltos acá eran la entrada
         del juego, y "no es un juego así". La entrada es la pantalla de título
         (scenes/titulo.js); al editor se llega desde la tabla de la carrera,
         y se vuelve a ella */
      volver = btn(W / 2 + 170, 320, "▶ VOLVER A LA CARRERA", 0x7ee08a, () => { this.guardar(); this.irA("master"); });
    }
    if (this.input.keyboard) {
      const alEsc = this._botones.find(b => b.obj === volver).cb;
      this.input.keyboard.on("keydown-ESC", alEsc);
    }
    /* Addendum v6 A.2: repetir el opening a gusto */
    const vi = this.add.text(14, 12, "▶ VER INTRO", { fontFamily: window.PF.texto, fontSize: "13px", color: "#f6efdc", backgroundColor: "#0a1f13aa", padding: { x: 6, y: 4 } }).setInteractive({ useHandCursor: true });
    vi.on("pointerdown", () => { this.game.registry.set("introPedida", true); this.irA("intro"); });
    /* L07 · PANTALLA COMPLETA (scenes/pantalla_ui.js), al lado de VER INTRO:
       los dos son de la pantalla, no de la pinta. Medido en captura a
       800x360: VER INTRO termina en x≈85 y lo de arriba al centro ("PASO 1
       DE 2", "la cara que elijas…") arranca en x≈278; la cara, en y≈85.
       Arranca en x=100 y crece a la derecha: la pastilla más larga ("SALIR
       DE PANTALLA COMPLETA", 13 px) llega a ≈310. Con la cara en y≥85 y el
       renglón de y=56 arrancando en 278, el área (de y=0 a tap_min) solo
       roza el principio de ese renglón, que no se toca. Sin API (iPhone) o
       con la app instalada, no aparece. */
    if (this.botonPantalla) this.botonPantalla(Math.ceil(vi.x + vi.width) + 8, 22, { largo: true, desdeArriba: true, desdeIzquierda: true });
    this.txtToast = this.add.text(W / 2, H - 86, "", { fontFamily: window.PF.texto, fontSize: "13px", color: "#7ee08a" }).setOrigin(0.5).setAlpha(0);
    /* TANDA 1.0 · LA VERSIÓN A LA VISTA. Si alguien de una localidad avisa
       "se me trabó", lo primero que hay que saber es qué versión tenía, y no
       se veía en ningún lado (vivía adentro de sw.js). Chica, arriba a la
       derecha. Abajo, al lado del botón verde, "versión v19-1.0-playtest"
       se metía en el botón (20/oct). Sale de window.PAMPA_VERSION, la misma
       que lleva el informe. */
    if (window.PAMPA_VERSION) {
      this.add.text(W - 10, 8, "versión " + window.PAMPA_VERSION, { fontFamily: window.PF.texto, fontSize: "13px", color: "#9fb3a5" })
        .setOrigin(1, 0).setAlpha(0.85);
    }

    /* el cursor, sin teclado: las flechas las maneja el editor (ver arriba).
       Las filas van con caja declarada; los botones con la suya real. */
    if (this.grupoFoco) {
      const items = this.CATS.map((c, i) => ({
        obj: this.filaRects[i], caja: this._filaCajas[i],
        cb: () => this.mover(c.k, 1)
      })).concat(this._botones.map(b => ({ obj: b.obj, cb: b.cb })));
      if (items.length) this.grupoFoco(items, { inicial: 0, sinTeclado: true, alMover: (i) => { this.filaSel = i; } });
    }

    this.refrescar();
  }

  /* V7 §0.2: ¿este color de pelo vale para esta cara? (0 = Original vale siempre;
     el manifest declara caras que no tiñen el pelo o excluyen colores puntuales) */
  tinteValido(cara, tPelo) {
    if (tPelo === 0) return true;
    if (cara.tintes_pelo === false) return false;
    if (Array.isArray(cara.tintes_pelo_excluye)) {
      const id = window.PampaAvatar.CATALOGO.colores_pelo[tPelo - 1].id;
      if (cara.tintes_pelo_excluye.indexOf(id) >= 0) return false;
    }
    return true;
  }
  mover(campo, d) {
    /* 20/oct, Rodri: cambiar la pinta no sonaba. Suena como el cursor del
       resto del juego, más agudo hacia adelante y más grave hacia atrás */
    const S = window.PampaSFX; if (S && S.ui) S.ui(d > 0 ? "abrir" : "cerrar");
    const A = window.PampaAvatar;
    const p = this.personajes[this.sel];
    /* V7 §0.2 (v2): los TINTES son opcionales — ciclan n+1 valores con el 0 =
       "Original"; editan tPiel/tPelo/tCam y sincronizan el campo viejo (>0)
       para que el jugador de cancha/bloques refleje la elección. */
    const T = this._v2 ? { piel: "tPiel", colorPelo: "tPelo", camiseta: "tCam" }[campo] : null;
    if (T) {
      const nT = campo === "camiseta"
        ? ((this.CM.camisetas ? this.CM.camisetas.length : 3) + 1)
        : A.CATALOGO[A.CAMPOS[campo]].length + 1;
      let v = (((p.look[T] || 0) + d) % nT + nT) % nT;
      if (T === "tPelo") {
        const cara = this.CM.caras[(p.look.cara || 0) % this.CM.caras.length];
        let vueltas = 0;
        while (!this.tinteValido(cara, v) && vueltas++ < nT) v = ((v + (d > 0 ? 1 : -1)) % nT + nT) % nT;
      }
      p.look[T] = v;
      /* V7 §1: piel/pelo se sincronizan al catálogo (cancha y bloques siguen la
         elección); la CAMISETA no — look.camiseta es la FORMA (lisa/banda/cuello)
         del kit de cancha, y el tono del busto no la pisa */
      if (v > 0 && campo !== "camiseta") p.look[campo] = v - 1;
      this.refrescar();
      return;
    }
    /* v2: CARA cicla sobre el manifest; fallback: catálogo completo */
    const n = campo === "cara" ? this.CM.caras.length
      : A.CATALOGO[A.CAMPOS[campo]].length;
    /* OJOS (tanda 1.0): la cara fuera de rotación (la de ojos cerrados) se
       saltea, como el pelo saltea los tintes que una cara no admite. Antes,
       desde Clásico un solo toque a la izquierda caía justo en ella. */
    if (campo === "cara" && A.ciclarCara) p.look.cara = A.ciclarCara(A.validarLook(p.look).cara, d);
    else p.look[campo] = (((p.look[campo] || 0) + d) % n + n) % n;
    /* al cambiar de cara, un tinte de pelo que esa cara no admite vuelve a Original */
    if (campo === "cara" && this._v2) {
      const cara = this.CM.caras[p.look.cara % this.CM.caras.length];
      if (!this.tinteValido(cara, p.look.tPelo || 0)) p.look.tPelo = 0;
    }
    this.refrescar();
  }
  /* V7 §0.2: el busto elegido — SIN teñir si los tintes están en Original
     (la ilustración manda); teñido solo en lo elegido (cacheado por combinación) */
  bustoTenido(look) {
    const A = window.PampaAvatar, Arte = window.PampaAvatarArte;
    const l = A.validarLook(look);
    const cara = this.CM.caras[l.cara % this.CM.caras.length];
    if (!cara || !this.textures.exists("cara_" + cara.id)) return null;
    const CAT = A.CATALOGO;
    const tPelo = this.tinteValido(cara, l.tPelo) ? l.tPelo : 0;
    if (!l.tPiel && !tPelo && !l.tCam) return "cara_" + cara.id;   // Original puro
    const key = "caraT_" + l.cara + "_" + l.tPiel + "_" + tPelo + "_" + l.tCam;
    if (!this.textures.exists(key)) {
      const hx = s => parseInt(String(s).slice(1), 16);
      const T = cara.tonos || {}, tol = this.CM.tolerancias || {};
      const mapa = [];
      if (tPelo > 0 && T.pelo && T.pelo !== T.piel) mapa.push({ de: hx(T.pelo), a: hx(CAT.colores_pelo[tPelo - 1].hex), tol: tol.pelo || 46, y1: cara.pelo_y1 != null ? cara.pelo_y1 : 0.5 });
      if (l.tPiel > 0 && T.piel) mapa.push({ de: hx(T.piel), a: hx(CAT.pieles[l.tPiel - 1].hex), tol: tol.piel || 85 });
      if (l.tCam > 0 && T.camiseta && this.CM.camisetas) mapa.push({ de: hx(T.camiseta), a: hx(this.CM.camisetas[(l.tCam - 1) % this.CM.camisetas.length].hex), tol: tol.camiseta || 95 });
      Arte.tenirImagen(this, "cara_" + cara.id, key, mapa);
    }
    return this.textures.exists(key) ? key : "cara_" + cara.id;
  }

  refrescar() {
    const A = window.PampaAvatar, Arte = window.PampaAvatarArte;
    const p = this.personajes[this.sel];
    /* pestaña activa marcada por borde grueso + flecha ► (no solo color) */
    this.tabs.forEach((tb, i) => {
      tb.r.setStrokeStyle(i === this.sel ? 4 : 2, i === this.sel ? 0xffd84d : 0xf6c11d, i === this.sel ? 1 : 0.5);
      tb.t.setColor(i === this.sel ? "#ffd84d" : "#f6efdc");
      tb.t.setText((i === this.sel ? "► " : "") + (i === 0 ? "★ " : "♥ ") + this.personajes[i].nombre.toUpperCase());
    });
    const l = A.validarLook(p.look);
    if (this._v2) {
      /* EDITOR v2: el busto ilustrado TEÑIDO, grande — la cara que sos en todos lados */
      const key = this.bustoTenido(p.look);
      if (key) {
        this.imgCara.setTexture(key);
        this.imgCara.setScale(300 / this.imgCara.height).setPosition(190, 235);
      }
    } else {
      Arte.cara(this, "ed_cara", p.look);
      this.imgCara.setTexture("ed_cara").setScale(1.5);
    }
    /* V7 fix editor: el muñequito de bloques INSINÚA lo elegido — piel/pelo de
       los tintes (u Original: los colores de la ilustración) + el corte que
       más se parece a la cara (corte_bloques del manifest) */
    const r = A.resolver(p.look);
    /* V7 §0.2: los tintes con NOMBRE — "Original" respeta la ilustración */
    const CAT = A.CATALOGO;
    const nTin = (v, lista) => v > 0 ? lista[v - 1].n : "Original";
    this.txtLabel.setText(this._v2
      ? (this.CM.caras[l.cara % this.CM.caras.length].n + " · piel " + nTin(l.tPiel, CAT.pieles).toLowerCase() + " · pelo " + nTin(l.tPelo, CAT.colores_pelo).toLowerCase())
      : A.lookLabel(p.look));
    /* etiquetas de los steppers (cada variante con NOMBRE) + la fila activa
       del teclado marcada con ► y color (forma + color, no solo color) */
    if (this.filaRects) this.filaRects.forEach((lbl, i) => {
      lbl.setColor(i === this.filaSel ? "#ffd84d" : "#f6c11d");
      lbl.setText((i === this.filaSel ? "► " : "") + this.CATS[i].n);
    });
    /* solo las filas del set ACTIVO (v2 = cara + tintes con "Original") */
    if (this.filas.cara) this.filas.cara.setText(this.CM.caras[l.cara % this.CM.caras.length].n);
    if (this.filas.piel) this.filas.piel.setText(this._v2 ? nTin(l.tPiel, CAT.pieles) : r.piel.n);
    if (this.filas.corte) this.filas.corte.setText(r.corte.n);
    if (this.filas.colorPelo) this.filas.colorPelo.setText(this._v2 ? nTin(l.tPelo, CAT.colores_pelo) : r.colorPelo.n);
    if (this.filas.ojos) this.filas.ojos.setText(r.ojos.n);
    if (this.filas.cejas) this.filas.cejas.setText(r.cejas.n);
    if (this.filas.boca) this.filas.boca.setText(r.boca.n);
    if (this.filas.acc) this.filas.acc.setText(r.acc.n);
    if (this.filas.camiseta) this.filas.camiseta.setText(this._v2 && this.CM.camisetas
      ? nTin(l.tCam, this.CM.camisetas)
      : r.camiseta.n);
  }

  /* guarda RETROCOMPATIBLE: solo AGREGA career.avatares (el clásico lo ignora) */
  guardar() {
    const avs = { vos: this.personajes[0].look, amigos: {} };
    this.personajes.slice(1).forEach(p => { avs.amigos[p.clave] = p.look; });
    try {
      if (this.career) {
        this.career.avatares = avs;
        localStorage.setItem("pampa_star_v1", JSON.stringify(this.career));
      } else {
        localStorage.setItem("pampa_star_avatares", JSON.stringify(avs));
      }
    } catch (e) { }
  }

  toast(txt) {
    this.txtToast.setText(txt).setAlpha(1);
    this.tweens.killTweensOf(this.txtToast);
    this.tweens.add({ targets: this.txtToast, alpha: 0, delay: 900, duration: 400 });
  }
};

/* PIEL P2: las pantallas de esta escena se arman de una sola vez (no hay
   update que barra), así que se visten los botones al terminar de construir
   cada vista. Se envuelven los métodos en vez de tocar su cuerpo: así el día
   que se agregue una vista nueva, basta con sumarla a esta lista. */
["create", "vistaSemana", "vistaElegirDia", "vistaFecha", "vistaTabla", "vistaResultado"]
  .forEach(function (n) {
    var orig = window.PampaEditor.prototype[n];
    if (typeof orig !== "function") return;
    window.PampaEditor.prototype[n] = function () {
      var r = orig.apply(this, arguments);
      if (this.vestirPendientes) this.vestirPendientes();
      return r;
    };
  });

