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
    this.add.text(W / 2, 24, "✎ TU PINTA", { fontFamily: "'Press Start 2P',monospace", fontSize: "16px", color: "#ffd84d" }).setOrigin(0.5);
    this.add.text(W / 2, 46, "la cara que elijas es la que aparece en los primeros planos del partido", { fontFamily: "monospace", fontSize: "12px", color: "#f6efdc" }).setOrigin(0.5).setAlpha(0.8);
    this.tabs = [];
    const tw = Math.min(170, (W - 40) / this.personajes.length - 8);
    let tx0 = W / 2 - (this.personajes.length * (tw + 8) - 8) / 2 + tw / 2;
    this.personajes.forEach((p, i) => {
      const r = this.add.rectangle(tx0, 78, tw, 40, 0x0d2a18, 1).setStrokeStyle(2, 0xf6c11d, 0.7).setInteractive({ useHandCursor: true });
      const t = this.add.text(tx0, 78, (i === 0 ? "★ " : "♥ ") + p.nombre.toUpperCase(), { fontFamily: "monospace", fontSize: "13px", color: "#f6efdc" }).setOrigin(0.5);
      r.on("pointerdown", () => { this.sel = i; this.refrescar(); });
      this.tabs.push({ r, t });
      tx0 += tw + 8;
    });

    /* ---- vista previa (izquierda): cara grande + jugador de cancha ---- */
    this.imgCara = this.add.image(170, 240, "__WHITE").setScale(1.5);
    this.imgCancha = this.add.image(300, 250, "__WHITE").setScale(2.4);
    this.txtLabel = this.add.text(210, 372, "", { fontFamily: "monospace", fontSize: "12px", color: "#7ee08a", align: "center", wordWrap: { width: 330 } }).setOrigin(0.5);

    /* ---- steppers (derecha): ◀ NOMBRE ▶ por categoría ---- */
    const CATS = [
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
      const lbl = this.add.text(cx - 235, fy - 1, c.n, { fontFamily: "monospace", fontSize: "11px", color: "#f6c11d" }).setOrigin(0, 0.5);
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
      this.filas[c.k] = this.add.text(cx + 60, fy, "", { fontFamily: "monospace", fontSize: "13px", color: "#f6efdc" }).setOrigin(0.5);
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
      this.add.text(x, H - 40, texto, { fontFamily: "'Press Start 2P',monospace", fontSize: "12px", color: "#0a1f13" }).setOrigin(0.5);
      r.on("pointerdown", cb);
    };
    btn(W / 2 - 190, 300, "💾 GUARDAR PINTA", 0xf6efdc, () => { this.guardar(); this.toast("¡Pinta guardada!"); });
    btn(W / 2 + 170, 320, "▶ ¡A LA CANCHA!", 0x7ee08a, () => { this.guardar(); this.scene.start("match"); });
    /* Addendum v6 A.2: repetir el opening a gusto */
    const vi = this.add.text(14, 12, "▶ VER INTRO", { fontFamily: "monospace", fontSize: "11px", color: "#f6efdc", backgroundColor: "#0a1f13aa", padding: { x: 6, y: 4 } }).setInteractive({ useHandCursor: true });
    vi.on("pointerdown", () => { this.game.registry.set("introPedida", true); this.scene.start("intro"); });
    this.txtToast = this.add.text(W / 2, H - 86, "", { fontFamily: "monospace", fontSize: "13px", color: "#7ee08a" }).setOrigin(0.5).setAlpha(0);

    this.refrescar();
  }

  mover(campo, d) {
    const A = window.PampaAvatar;
    const p = this.personajes[this.sel];
    const n = A.CATALOGO[A.CAMPOS[campo]].length;
    p.look[campo] = (p.look[campo] + d + n) % n;
    this.refrescar();
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
    /* re-horneo las vistas previas con el look actual */
    Arte.cara(this, "ed_cara", p.look);
    Arte.jugador(this, "ed_cancha", p.look, false);
    this.imgCara.setTexture("ed_cara");
    this.imgCancha.setTexture("ed_cancha_idle");
    this.txtLabel.setText(A.lookLabel(p.look));
    /* etiquetas de los steppers (cada variante con NOMBRE) + la fila activa
       del teclado marcada con ► y color (forma + color, no solo color) */
    if (this.filaRects) this.filaRects.forEach((lbl, i) => {
      lbl.setColor(i === this.filaSel ? "#ffd84d" : "#f6c11d");
      lbl.setText((i === this.filaSel ? "► " : "") + this.CATS[i].n);
    });
    const r = A.resolver(p.look);
    this.filas.piel.setText(r.piel.n);
    this.filas.corte.setText(r.corte.n);
    this.filas.colorPelo.setText(r.colorPelo.n);
    this.filas.ojos.setText(r.ojos.n);
    this.filas.cejas.setText(r.cejas.n);
    this.filas.boca.setText(r.boca.n);
    this.filas.acc.setText(r.acc.n);
    this.filas.camiseta.setText(r.camiseta.n);
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
