/* ============================================================================
   PAMPA STAR · phaser/scenes/intro.js — EL OPENING (Addendum v6 Parte A)
   La intro estilo anime: 8 planos en 18-25 segundos, TODO en cortes secos.
   El arte ya existe (assets/poses/ + assets/ui/): acá solo se MUEVE.
   Reglas duras (A.4): todo por delayedCall con reloj propio (jamás tweens
   encadenados como hilo), CUALQUIER toque o tecla saltea al título y corta el
   audio limpio, si falta un asset el plano se saltea solo y nada crashea.
   Tiempos, textos y colores en balance.json → intro. Flag intro_opening.
   Se ve UNA vez por sesión; en el editor queda el botón "▶ VER INTRO".
   ========================================================================== */
window.PampaIntro = class PampaIntro extends Phaser.Scene {
  constructor() { super("intro"); }

  preload() {
    this.load.on("loaderror", () => { });   // A.4: nada crashea por un archivo faltante
    this.load.image("i_pueblo", "../assets/ui/fondo_pueblo.webp");
    this.load.image("i_logo", "../assets/ui/logo.webp");
    const man = this.game.registry.get("poses");
    if (man && man.poses) {
      const base = man.base || "assets/poses/";
      Object.keys(man.poses).forEach(id => {
        if (!this.textures.exists("pose_" + id) && man.poses[id].archivo) this.load.image("pose_" + id, "../" + base + man.poses[id].archivo);
      });
      if (man.fondos) Object.keys(man.fondos).forEach(id => {
        if (!this.textures.exists("fondo_" + id) && man.fondos[id].archivo) this.load.image("fondo_" + id, "../" + base + man.fondos[id].archivo);
      });
    }
  }

  create() {
    const BAL = this.game.registry.get("balance") || {};
    this.I = BAL.intro || {};
    const flagOff = BAL.flags && BAL.flags.intro_opening === false;
    if (flagOff || (this.game.registry.get("introVista") && !this.game.registry.get("introPedida"))) {
      this.scene.start("editor");
      return;
    }
    const pedida = this.game.registry.get("introPedida");
    this.game.registry.set("introVista", true);
    this.game.registry.set("introPedida", false);
    this._fin = false;
    this._arranco = false;
    this.SFX = window.PampaSFX;
    if (this.SFX && this.SFX.configurarMusica) this.SFX.configurarMusica(BAL.musica);
    this.cameras.main.setBackgroundColor("#000000");
    this.capa = this.add.container(0, 0);
    this.fxG = this.add.graphics().setDepth(50);
    /* FIX del opening mudo: el navegador exige un GESTO para habilitar audio,
       y cualquier gesto salteaba la intro → LA COMPUERTA: una pantalla previa
       cuyo toque desbloquea el audio Y dispara el opening CON sonido desde el
       primer plano. Si la intro se pidió desde el editor, el gesto ya ocurrió. */
    if (this.I.compuerta === false || pedida) this.arrancarOpening();
    else this.compuerta();
  }

  /* --- LA COMPUERTA: negro, el logo, y "TOCÁ PARA EMPEZAR" pulsando --- */
  compuerta() {
    if (this.textures.exists("i_logo")) {
      const l = this.add.image(480, 210, "i_logo");
      l.setScale(Math.min(1, 540 / l.width));
      this.capa.add(l);
    } else {
      const t = this.add.text(480, 200, "PAMPA STAR", { fontFamily: window.PF.display, fontSize: "40px", color: "#ffd84d", stroke: "#0a1f13", strokeThickness: 10 }).setOrigin(0.5);
      this.capa.add(t);
    }
    const toca = this.add.text(480, 400, this.I.t_compuerta || "👆 TOCÁ PARA EMPEZAR",
      { fontFamily: window.PF.display, fontSize: "15px", color: "#f6efdc", stroke: "#0a1f13", strokeThickness: 6 }).setOrigin(0.5);
    this.capa.add(toca);
    this.tweens.add({ targets: toca, alpha: 0.35, scale: 1.06, duration: 620, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    if (this.input.keyboard && !this.sys.game.device.input.touch) {
      const tk = this.add.text(480, 442, this.I.t_compuerta_teclado || "(o apretá cualquier tecla)",
        { fontFamily: window.PF.texto, fontSize: "12px", color: "#f6efdc99" }).setOrigin(0.5);
      this.capa.add(tk);
    }
    const go = () => {
      if (this._arranco || this._fin) return;
      this._arranco = true;
      this.SFX && this.SFX.unlock && this.SFX.unlock();   // EL GESTO: el audio queda habilitado
      this.arrancarOpening();
    };
    this.input.once("pointerdown", go);
    if (this.input.keyboard) this.input.keyboard.once("keydown", go);
  }

  /* --- el opening en sí (recién acá cualquier toque SALTEA) --- */
  arrancarOpening() {
    this._arranco = true;
    this.corteSeco();
    this._gestoTs = this.time.now;
    this.input.on("pointerdown", () => this.salir());
    if (this.input.keyboard) this.input.keyboard.on("keydown", () => this.salir());
    this.add.text(948, 526, "tocá para saltear ▸", { fontFamily: window.PF.texto, fontSize: "10px", color: "#f6efdc88" }).setOrigin(1, 1).setDepth(99);
    /* la secuencia corre por RELOJ propio: cada plano agenda el siguiente */
    const D = this.I.planos_ms || [3000, 2000, 4000, 2000, 1000, 1500, 2000, 4000];
    const planos = [this.p1, this.p2, this.p3, this.p4, this.p5, this.p6, this.p7, this.p8];
    let t = 60;
    planos.forEach((fn, k) => {
      this.time.delayedCall(t, () => { if (!this._fin) { this.corteSeco(); fn.call(this, D[k]); } });
      t += D[k];
    });
    this.time.delayedCall(t + 600, () => this.salir());
  }

  /* --- utilería del opening --- */
  corteSeco() { this.capa.removeAll(true); this.fxG.clear(); this.tweens.killAll(); }
  salir() {
    if (this._fin) return;
    if (this._gestoTs != null && this.time.now - this._gestoTs < 180) return;   // el gesto de la compuerta no saltea
    this._fin = true;
    this.SFX && this.SFX.musicaTema && this.SFX.musicaTema(null);   // corta el audio limpio
    this.scene.start("editor");
  }
  flashBlanco() { this.cameras.main.flash(70, 255, 255, 255); }
  poseImg(id, x, y, altura) {
    if (!this.textures.exists("pose_" + id)) return null;   // el plano se las arregla
    const s = this.add.image(x, y, "pose_" + id);
    s.setScale(altura / s.height);
    this.capa.add(s);
    return s;
  }
  letraPorLetra(x, y, texto, estilo, msPorLetra) {
    const t = this.add.text(x, y, "", estilo).setOrigin(0.5);
    this.capa.add(t);
    let i = 0;
    this.time.addEvent({
      delay: msPorLetra || 55, repeat: texto.length - 1,
      callback: () => { if (t.active) t.setText(texto.slice(0, ++i)); }
    });
    return t;
  }
  radiales(color, inten) {
    const g = this.fxG;
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      g.lineStyle(2 + 2 * (inten || 1), color, 0.25 + 0.2 * (inten || 1));
      g.beginPath();
      g.moveTo(480 + Math.cos(a) * 90, 270 + Math.sin(a) * 90);
      g.lineTo(480 + Math.cos(a) * 700, 270 + Math.sin(a) * 700);
      g.strokePath();
    }
  }
  rayasBarriendo(color) {
    for (let k = 0; k < 4; k++) {
      const r = this.add.rectangle(960 + k * 300, 90 + k * 130, 700, 26, color || 0xffffff, 0.1).setAngle(-22);
      this.capa.add(r);
      this.tweens.add({ targets: r, x: -420, duration: 460 + k * 120, repeat: -1 });
    }
  }
  temblor(spr) { if (spr) this.tweens.add({ targets: spr, x: "+=2", y: "-=2", duration: 44, yoyo: true, repeat: -1 }); }

  /* --- los 8 planos (A.3) --- */
  p1(dur) {   // EL POTRERO: la tribuna LEJANA detrás, el pueblo delante (parallax de capas §3.1)
    if (this.textures.exists("fondo_tribuna")) {
      const tr = this.add.image(480, 200, "fondo_tribuna");
      const escT = Math.max(960 / tr.width, 400 / tr.height);
      tr.setScale(escT).setAlpha(0.85);
      this.capa.add(tr);
      this.tweens.add({ targets: tr, scale: escT * 1.03, duration: dur, ease: "Sine.easeOut" });   // el fondo lejano, casi quieto
    }
    if (this.textures.exists("i_pueblo")) {
      const f = this.add.image(480, 540, "i_pueblo").setOrigin(0.5, 1);
      const esc = Math.max(960 / f.width, 380 / f.height);
      f.setScale(esc);
      this.capa.add(f);
      this.tweens.add({ targets: f, scale: esc * 1.08, duration: dur, ease: "Sine.easeOut" });     // el cerca, más rápido
    }
    this.letraPorLetra(480, 470, this.I.t_pueblo || "En algún pueblo de La Pampa…",
      { fontFamily: window.PF.display, fontSize: "13px", color: "#f6efdc", stroke: "#0a1f13", strokeThickness: 5 }, 60);
    this.SFX && this.SFX.crowd && this.SFX.crowd(dur);   // el viento lejano
    this.SFX && this.SFX.kick && this.SFX.kick();        // el bombo lejano
  }
  p2() {   // LA CORRIDA: rayas a alta velocidad, el héroe frena en el centro
    this.rayasBarriendo(0xffffff);
    const s = this.poseImg("remate", 1200, 290, 380);
    if (s) { this.tweens.add({ targets: s, x: 480, duration: 320, ease: "Quad.easeOut" }); this.temblor(s); }
    this.SFX && this.SFX.musicaTema && this.SFX.musicaTema("opening");   // la música ARRANCA de golpe
    this.flashBlanco();
  }
  p3(dur) {   // RÁFAGA DE HÉROES: 4 cortes de ~0,7s con flash y golpe
    const orden = [["chilena", 0xffd84d], ["cabezazo", 0x4fc3f7], ["barrida", 0xff8a50], ["arquero_vuela", 0xf6efdc]];
    const paso = dur / orden.length;
    orden.forEach((par, k) => {
      this.time.delayedCall(k * paso, () => {
        if (this._fin) return;
        this.corteSeco();
        this.fxG.clear();
        this.radiales(par[1], 1);
        const s = this.poseImg(par[0], 480, 280, 400);
        this.temblor(s);
        this.flashBlanco();
        this.SFX && this.SFX.kick && this.SFX.kick();   // el golpe sincronizado
      });
    });
  }
  p4() {   // EL GRITO: pose congelada, zoom lento, ¡CALDENAZO! desde abajo
    const s = this.poseImg("remate", 480, 260, 460);
    if (s) this.tweens.add({ targets: s, scale: s.scale * 1.15, y: 300, duration: 1900, ease: "Sine.easeOut" });
    const g = this.add.text(480, 700, this.I.t_grito || "¡CALDENAZO!",
      { fontFamily: window.PF.display, fontSize: "40px", color: "#ffd84d", stroke: "#9c2b1d", strokeThickness: 10 }).setOrigin(0.5);
    this.capa.add(g);
    this.tweens.add({ targets: g, y: 440, duration: 340, ease: "Back.easeOut" });
    this.cameras.main.shake(280, 0.012);
    this.SFX && this.SFX.riserGrande && this.SFX.riserGrande(1.4);
  }
  p5() {   // EL SILENCIO: todo se detiene — el recurso del juego, enseñado antes de jugar
    this.SFX && this.SFX.musicaDuck && this.SFX.musicaDuck(1000);
    if (this.textures.exists("ball")) {
      const b = this.add.sprite(480, 250, "ball").setScale(3);
      this.capa.add(b);
    } else {
      const b = this.add.circle(480, 250, 26, 0xffffff).setStrokeStyle(3, 0x000000);   // la pelota congelada en el aire
      this.capa.add(b);
    }
    const t = this.add.text(480, 420, "…", { fontFamily: window.PF.texto, fontSize: "26px", color: "#f6efdc" }).setOrigin(0.5);
    this.capa.add(t);
  }
  p6() {   // EL ARQUERO: la estirada contra el blanco, la música vuelve de golpe
    const fondo = this.add.rectangle(480, 270, 960, 540, 0xf6efdc, 1);
    this.capa.add(fondo);
    this.radiales(0x0a1f13, 0.8);
    const s = this.poseImg("arquero_vuela", 480, 270, 380);
    this.temblor(s);
    this.SFX && this.SFX.musicaTema && this.SFX.musicaTema(null);
    this.SFX && this.SFX.musicaTema && this.SFX.musicaTema("opening");   // vuelve DE GOLPE
  }
  p7() {   // EL GOL: festejo sobre explosión dorada, hinchada a todo volumen
    this.radiales(0xffd84d, 1.4);
    const s = this.poseImg("festejo", 480, 280, 430);
    this.temblor(s);
    this.flashBlanco();
    this.SFX && this.SFX.goal && this.SFX.goal();
    this.SFX && this.SFX.crowd && this.SFX.crowd(1800);
  }
  p8(dur) {   // EL LOGO: cae, rebota, la bajada letra por letra, acorde final
    const negro = this.add.rectangle(480, 270, 960, 540, 0x000000, 1);
    this.capa.add(negro);
    if (this.textures.exists("i_logo")) {
      const l = this.add.image(480, -220, "i_logo");
      l.setScale(Math.min(1, 620 / l.width));
      this.capa.add(l);
      this.tweens.add({ targets: l, y: 230, duration: 520, ease: "Bounce.easeOut" });
      this.time.delayedCall(540, () => { if (!this._fin) { this.cameras.main.shake(200, 0.01); this.SFX && this.SFX.net && this.SFX.net(); } });
    } else {
      const t = this.add.text(480, 220, "PAMPA STAR", { fontFamily: window.PF.display, fontSize: "44px", color: "#ffd84d", stroke: "#0a1f13", strokeThickness: 10 }).setOrigin(0.5);
      this.capa.add(t);
    }
    this.time.delayedCall(700, () => {
      if (this._fin) return;
      this.letraPorLetra(480, 380, this.I.t_bajada || "DEL POTRERO AL MUNDIAL",
        { fontFamily: window.PF.display, fontSize: "16px", color: "#f6efdc", stroke: "#0a1f13", strokeThickness: 6 }, 55);
    });
    this.time.delayedCall(dur - 500, () => { if (!this._fin) this.cameras.main.fadeOut(480, 0, 0, 0); });   // el ÚNICO fundido: al título
  }
};
