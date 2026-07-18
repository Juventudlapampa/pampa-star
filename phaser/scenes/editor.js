/* ============================================================================
   PAMPA STAR · phaser/scenes/editor.js — EL EDITOR DE PINTA (Bloque C)
   La creación del personaje, versión Phaser: elegís tu pinta por CAPAS
   (piel, corte y color de pelo, ojos, cejas, boca, accesorios, camiseta)
   con steppers ◀ ▶ ETIQUETADOS (cada variante tiene nombre — daltonismo).
   Pestañas: VOS + tus 4 AMIGOS del save clásico (si existen). Se guarda
   RETROCOMPATIBLE en pampa_star_v1 (campo nuevo career.avatares; si no hay
   save, va a pampa_star_avatares). La cara elegida es la que aparece en el
   ZOOM del modo cine. Al terminar: ¡A LA CANCHA! → escena match.
   ========================================================================== */
window.PampaEditor = class PampaEditor extends Phaser.Scene {
  constructor() { super("editor"); }

  /* EDITOR v2: los 8 bustos ilustrados del manifest (tolerante: sin manifest
     o sin PNG, vuelve el avatar de bloques y nada crashea) */
  preload() {
    this.load.on("loaderror", () => { });
    const CM = this.game.registry.get("caras");
    if (CM && CM.caras) {
      const base = CM.base || "assets/poses/caras/";
      CM.caras.forEach(c => {
        if (c.archivo && !this.textures.exists("cara_" + c.id)) this.load.image("cara_" + c.id, "../" + base + c.archivo);
      });
    }
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.W = W; this.H = H;
    const A = window.PampaAvatar;
    this.cameras.main.setBackgroundColor("#06120b");

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
    this.add.text(W / 2, 24, "✎ TU PINTA", { fontFamily: window.PF.display, fontSize: "16px", color: "#ffd84d" }).setOrigin(0.5);
    this.add.text(W / 2, 46, "la cara que elijas es la que aparece en los primeros planos del partido", { fontFamily: window.PF.texto, fontSize: "12px", color: "#f6efdc" }).setOrigin(0.5).setAlpha(0.8);
    this.tabs = [];
    const tw = Math.min(170, (W - 40) / this.personajes.length - 8);
    let tx0 = W / 2 - (this.personajes.length * (tw + 8) - 8) / 2 + tw / 2;
    this.personajes.forEach((p, i) => {
      const r = this.add.rectangle(tx0, 78, tw, 40, 0x0d2a18, 1).setStrokeStyle(2, 0xf6c11d, 0.7).setInteractive({ useHandCursor: true });
      const t = this.add.text(tx0, 78, (i === 0 ? "★ " : "♥ ") + p.nombre.toUpperCase(), { fontFamily: window.PF.texto, fontSize: "13px", color: "#f6efdc" }).setOrigin(0.5);
      r.on("pointerdown", () => { this.sel = i; this.refrescar(); });
      this.tabs.push({ r, t });
      tx0 += tw + 8;
    });

    /* ---- vista previa (izquierda): cara grande + jugador de cancha ---- */
    this.imgCara = this.add.image(170, 240, "__WHITE").setScale(1.5);
    this.imgCancha = this.add.image(300, 250, "__WHITE").setScale(2.4);
    this.txtLabel = this.add.text(210, 372, "", { fontFamily: window.PF.texto, fontSize: "12px", color: "#7ee08a", align: "center", wordWrap: { width: 330 } }).setOrigin(0.5);

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
    let fy = 122;
    CATS.forEach((c, ci) => {
      const cx = 690;
      const lbl = this.add.text(cx - 235, fy - 1, c.n, { fontFamily: window.PF.texto, fontSize: "11px", color: "#f6c11d" }).setOrigin(0, 0.5);
      const mk = (x, d) => {
        const r = this.add.rectangle(x, fy, 52, 44, 0xf6efdc, 1).setStrokeStyle(2, 0x0a1f13).setInteractive({ useHandCursor: true });
        const g = this.add.graphics();
        g.fillStyle(0x0a1f13, 1);
        if (d < 0) g.fillTriangle(x - 9, fy, x + 7, fy - 10, x + 7, fy + 10);   // ◄ dibujado, no glifo
        else g.fillTriangle(x + 9, fy, x - 7, fy - 10, x - 7, fy + 10);        // ► dibujado
        r.on("pointerdown", (p, xx, yy, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); this.filaSel = ci; this.mover(c.k, d); });
        return r;
      };
      mk(cx - 92, -1); mk(cx + 212, 1);
      this.filas[c.k] = this.add.text(cx + 60, fy, "", { fontFamily: window.PF.texto, fontSize: "13px", color: "#f6efdc" }).setOrigin(0.5);
      this.filaRects.push(lbl);
      fy += 46;
    });
    /* teclado: ↑↓ fila, ◄► ciclan (con wrap en ambas direcciones) */
    if (this.input.keyboard) {
      this.input.keyboard.on("keydown-UP", () => { this.filaSel = (this.filaSel + CATS.length - 1) % CATS.length; this.refrescar(); });
      this.input.keyboard.on("keydown-DOWN", () => { this.filaSel = (this.filaSel + 1) % CATS.length; this.refrescar(); });
      this.input.keyboard.on("keydown-LEFT", () => this.mover(CATS[this.filaSel].k, -1));
      this.input.keyboard.on("keydown-RIGHT", () => this.mover(CATS[this.filaSel].k, 1));
    }

    /* ---- abajo: guardar + a la cancha ---- */
    const btn = (x, w, texto, bg, cb) => {
      const r = this.add.rectangle(x, H - 40, w, 52, bg, 1).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
      this.add.text(x, H - 40, texto, { fontFamily: window.PF.display, fontSize: "12px", color: "#0a1f13" }).setOrigin(0.5);
      r.on("pointerdown", cb);
    };
    btn(W / 2 - 190, 300, "💾 GUARDAR PINTA", 0xf6efdc, () => { this.guardar(); this.toast("¡Pinta guardada!"); });
    btn(W / 2 + 170, 320, "▶ ¡A LA CANCHA!", 0x7ee08a, () => { this.guardar(); this.scene.start("match"); });
    /* V7 §2: la CARRERA vive en el Phaser — el Modo Master con temporada y escalera */
    const bc = this.add.rectangle(W - 110, 12 + 22, 200, 44, 0xffd84d, 1).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
    this.add.text(W - 110, 34, "🏆 CARRERA", { fontFamily: window.PF.display, fontSize: "11px", color: "#0a1f13" }).setOrigin(0.5);
    bc.on("pointerdown", () => { this.guardar(); this.scene.start("master"); });
    /* Addendum v6 A.2: repetir el opening a gusto */
    const vi = this.add.text(14, 12, "▶ VER INTRO", { fontFamily: window.PF.texto, fontSize: "11px", color: "#f6efdc", backgroundColor: "#0a1f13aa", padding: { x: 6, y: 4 } }).setInteractive({ useHandCursor: true });
    vi.on("pointerdown", () => { this.game.registry.set("introPedida", true); this.scene.start("intro"); });
    this.txtToast = this.add.text(W / 2, H - 86, "", { fontFamily: window.PF.texto, fontSize: "13px", color: "#7ee08a" }).setOrigin(0.5).setAlpha(0);

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
    p.look[campo] = (((p.look[campo] || 0) + d) % n + n) % n;
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
      if (tPelo > 0 && T.pelo && T.pelo !== T.piel) mapa.push({ de: hx(T.pelo), a: hx(CAT.colores_pelo[tPelo - 1].hex), tol: tol.pelo || 70 });
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
    Arte.jugador(this, "ed_cancha", p.look, false);
    this.imgCancha.setTexture("ed_cancha_idle");
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
