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
    /* D1 · LOS SEIS FONDOS DE CLAUDE DESIGN. Son 1920x1080 planos y de poco
       contraste, hechos para ir DETRÁS: resuelven que siete de los ocho planos
       fueran figuras flotando en negro puro.
       D2 · las dos versiones del logo. D4 · el cartel del pueblo. */
    ["bg-01-cielo-atardecer", "bg-02-alambrado-campo", "bg-03-tribuna-tablones",
     "bg-04-tierra-pasto-seco", "bg-05-horizonte-molino", "bg-06-noche-luces"]
      .forEach((k, i) => this.load.image("bg" + (i + 1), "../assets/ui/" + k + ".webp"));
    this.load.image("d_logo", "../assets/ui/pampa-star-logo.webp");
    this.load.image("d_cartel", "../assets/ui/cartel-pueblo.webp");
    const man = this.game.registry.get("poses");
    if (man && man.poses) {
      const base = man.base || "assets/poses/";
      Object.keys(man.poses).forEach(id => {
        /* cargar:false existe para dejar una pieza guardada SIN gastar ancho
           de banda, y el preload la ignoraba: las marcadas se bajaban igual, o
           sea justo lo contrario de para lo que esta la bandera. */
        if (man.poses[id].cargar === false) return;
        if (!this.textures.exists("pose_" + id) && man.poses[id].archivo) this.load.image("pose_" + id, "../" + base + man.poses[id].archivo);
      });
      if (man.fondos) Object.keys(man.fondos).forEach(id => {
        if (man.fondos[id].cargar === false) return;
        if (!this.textures.exists("fondo_" + id) && man.fondos[id].archivo) this.load.image("fondo_" + id, "../" + base + man.fondos[id].archivo);
      });
    }
  }

  create() {
    this.entrarDesdeNegro();
    const BAL = this.game.registry.get("balance") || {};
    this.I = BAL.intro || {};
    const flagOff = BAL.flags && BAL.flags.intro_opening === false;
    if (flagOff || (this.game.registry.get("introVista") && !this.game.registry.get("introPedida"))) {
      this.irA("editor");
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
    if (this.textures.exists("d_logo") || this.textures.exists("i_logo")) {
      /* D2 · la PANTALLA DE INICIO (la compuerta) también lleva el nombre */
      const l = this.add.image(480, 210, this.textures.exists("d_logo") ? "d_logo" : "i_logo");
      l.setScale(Math.min(1, 540 / l.width));
      this.capa.add(l);
    } else {
      const t = this.add.text(480, 200, "PAMPA STAR", { fontFamily: window.PF.display, fontSize: "40px", color: "#ffd84d", stroke: "#0a1f13", strokeThickness: 5 }).setOrigin(0.5);
      this.capa.add(t);
    }
    const toca = this.add.text(480, 400, this.I.t_compuerta || "👆 TOCÁ PARA EMPEZAR",
      { fontFamily: window.PF.display, fontSize: "15px", color: "#f6efdc", stroke: "#0a1f13", strokeThickness: 3 }).setOrigin(0.5);
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
    /* I1 · era gris translúcido (#f6efdc88) a 10 px sobre negro, y en el plano
       del pueblo —fondo claro— directamente desaparecía. Si es la ÚNICA salida
       de una intro de 20 segundos, tiene que verse siempre: ahora va con su
       propia cajita oscura, que funciona sobre cualquier fondo. */
    this.add.text(948, 526, "tocá para saltear ▸", {
      fontFamily: window.PF.texto, fontSize: "12px", color: "#f6efdc",
      backgroundColor: "#0a1f13cc", padding: { x: 7, y: 3 }
    }).setOrigin(1, 1).setDepth(99);
    /* la secuencia corre por RELOJ propio: cada plano agenda el siguiente */
    const D = this.I.planos_ms || [3000, 2000, 4000, 2000, 1000, 1500, 2000, 4000];
    /* I1 · p4 (EL GRITO, con vos) va ANTES que p3 (la ráfaga, que abría con un
       rival). Es la primera imagen del juego: tiene que estar el protagonista.
       Los tiempos siguen saliendo en el mismo orden de balance.intro.planos_ms,
       así que el plano largo sigue siendo el largo. */
    const planos = [this.p1, this.p2, this.p4, this.p3, this.p5, this.p6, this.p7, this.p8];
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
    /* M4 · acá había un "por las dudas" (pedirMusica si existe, si no
       SFX.musicaTema directo). Ese por-las-dudas ES la segunda puerta: el
       mixin de piel se aplica a las cuatro escenas en el arranque, así que
       pedirMusica siempre está. Si algún día no estuviera, quiero que reviente
       y no que se cuele música vieja por atrás. */
    this.pedirMusica("silencio");
    this.irA("editor");
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
  /* I1 · EL TEMBLOR PELEABA POR LA MISMA PROPIEDAD QUE LAS ENTRADAS.
     Era un tween infinito sobre x/y con valores relativos: capturaba la
     posición al arrancar y oscilaba alrededor de ESE punto para siempre,
     pisando lo que escribiera el tween de entrada. Por eso el héroe del plano 2
     se quedaba clavado en x=1200, fuera de pantalla (medido en vivo).
     Ahora tiembla por ÁNGULO, que no la usa nadie más. */
  temblor(spr) { if (spr) this.tweens.add({ targets: spr, angle: 1.4, duration: 44, yoyo: true, repeat: -1 }); }

  /* ══════════════════════════════════════════════════════════════════════
     I1 · EL FONDO. Siete de los ocho planos eran una figura recortada sobre
     NEGRO PURO, así que la intro se leía como "pantalla negra con dibujos" en
     vez de como una película. Es el mismo problema que P6 pero acá: no había
     espacio, había figuras.

     Este helper pinta un lugar con lo que ya existe: cielo, horizonte y pasto.
     No hace falta arte nuevo — con que haya ALGO detrás, la figura pasa a
     estar en un lado. Los tonos por plano vienen del parámetro, así que la
     secuencia puede ir cambiando de luz sin cambiar de sitio. */
  /* D1 · EL FONDO DEL PLANO.
     Si el plano declaró uno de los seis PNG, va ese —estirado a pantalla— y
     encima el velo de luminosidad. Si no, queda el fondo pintado a mano de I1,
     que ya era mejor que el negro.

     EL VELO ES LA CONDICIÓN QUE PUSO RODRI: "los fondos NO pueden competir con
     la figura; si alguno queda muy presente, bajale la luminosidad". Por eso
     cada plano puede pedir su luz (1 = tal cual vino, 0.5 = a media luz) y lo
     que se baja es el brillo, no el fondo: el dibujo sigue siendo el mismo. */
  fondoDeDiseno(key, luz) {
    if (!this.textures.exists(key)) return false;
    const im = this.add.image(480, 270, key);
    im.setScale(Math.max(960 / im.width, 540 / im.height));
    this.capa.add(im);
    const l = luz != null ? luz : 0.62;
    if (l < 1) {
      const velo = this.add.rectangle(480, 270, 960, 540, 0x000000, 1 - l);
      this.capa.add(velo);
    }
    return true;
  }
  fondoIntro(cielo, pasto, horizonte) {
    const hy = horizonte != null ? horizonte : 300;
    const g = this.add.graphics();
    g.fillStyle(cielo != null ? cielo : 0x123a5a, 1); g.fillRect(0, 0, 960, hy);
    g.fillStyle(pasto != null ? pasto : 0x1f7a3c, 1); g.fillRect(0, hy, 960, 540 - hy);
    /* las franjas del corte de pasto, que ENSANCHAN hacia adelante: da fuga
       sin dibujar nada en perspectiva */
    g.fillStyle(0x000000, 0.06);
    let y = hy, alto = 6, k = 0;
    while (y < 540) { if (k % 2 === 0) g.fillRect(0, y, 960, alto); y += alto; alto += 5; k++; }
    g.fillStyle(0xeafff0, 0.18); g.fillRect(0, hy, 960, 2);
    this.capa.add(g);
    /* la tribuna lejana, si está: convierte el campo en un partido */
    if (this.textures.exists("fondo_tribuna")) {
      const tr = this.add.image(480, hy, "fondo_tribuna").setOrigin(0.5, 1);
      tr.setScale(Math.max(960 / tr.width, (hy * 0.5) / tr.height)).setAlpha(0.55);
      this.capa.add(tr);
    }
    return g;
  }

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
    /* I1 · a 60 ms por letra, los 27 caracteres tardaban 1,6 s de los 3 s del
       plano: durante más de la mitad se leía "En algún pueblo de La Pamp".
       A 34 ms termina en el primer tercio. Y va con franja propia: era texto
       claro sobre cielo claro y camino de tierra claro, el peor contrastado
       del juego. */
    const fr = this.add.rectangle(480, 470, 960, 30, 0x0a1f13, 0.72);
    this.capa.add(fr);
    /* D4 · EL CARTEL DEL PUEBLO. Su lugar natural es este plano: el que
       presenta de dónde sos. Va al costado, chico, como un cartel de ruta de
       verdad — no como ilustración protagonista. */
    if (this.textures.exists("d_cartel")) {
      const c = this.add.image(806, 356, "d_cartel");
      c.setScale(196 / c.height).setAlpha(0.96);
      this.capa.add(c);
      /* D4 · y el cartel DICE algo: el pueblo del jugador, que sale del save.
         Un cartel de ruta en blanco es una ilustracion; con el nombre es la
         entrada a TU pueblo, que es de lo que habla el plano. Sin save todavia
         (primera partida) no se escribe nada y queda el cartel limpio. */
      var pueblo = null;
      try { var sv = JSON.parse(localStorage.getItem("pampa_master_v1") || "null");
        pueblo = sv && sv.pueblo; } catch (e) {}
      if (!pueblo) { try { var cl = JSON.parse(localStorage.getItem("pampa_star_v1") || "null");
        pueblo = cl && cl.origen && cl.origen.localidad; } catch (e) {} }
      if (pueblo) {
        const tp = this.add.text(c.x - 2, c.y - 6, String(pueblo).toUpperCase(), {
          fontFamily: window.PF.display, fontSize: "13px", color: "#1c3a24"
        }).setOrigin(0.5);
        this.capa.add(tp);
      }
    }
    this.letraPorLetra(480, 470, this.I.t_pueblo || "En algún pueblo de La Pampa…",
      { fontFamily: window.PF.display, fontSize: "15px", color: "#f6efdc", stroke: "#0a1f13", strokeThickness: 3 }, 34);
    this.SFX && this.SFX.crowd && this.SFX.crowd(dur);   // el viento lejano
    this.SFX && this.SFX.kick && this.SFX.kick();        // el bombo lejano
  }
  p2() {   // D1 · LA PELOTA QUIETA: antes de que empiece todo
    /* I1 · ERA EL PEOR PLANO DE LA INTRO: dos segundos de pantalla negra con
       dos barras gris oscurísimo. Dos cosas lo mataban — no tenía fondo, y el
       héroe se quedaba fuera de cuadro en x=1200 porque el temblor le pisaba
       el tween de entrada (ver temblor()). Las dos arregladas. */
    /* D1 · bg-04 (tierra y pasto seco) y la pelota vieja quieta encima. Era el
       plano de los 2 segundos de negro; ahora es el silencio de antes del
       partido: la pelota sola en el potrero. Sin rayas ni figura — el que
       corre entra en el plano siguiente. */
    if (!this.fondoDeDiseno("bg4", 0.78)) this.fondoIntro(0x2a2016, 0x3a2f18, 320);
    if (this.textures.exists("pose_pelota_vieja")) {
      const pel = this.add.image(480, 400, "pose_pelota_vieja");
      pel.setScale(150 / pel.height);
      this.capa.add(pel);
    }
    /* I1 · NACE DONDE TIENE QUE VERSE. Medido en vivo: los tweens de esta
       escena no avanzan (progress 0 tras 24 cuadros, con el reloj corriendo
       bien — los delayedCall de los planos sí disparan). Todo lo que dependía
       de un tween para ENTRAR al cuadro no entraba nunca: el héroe se quedaba
       en x=1200, el grito en y=700 y el logo en y=-220.
       Regla nueva para la intro: nada que tenga que verse depende de un tween.
       Los tweens quedan solo para el adorno — si corren, suma; si no, el plano
       se lee igual. */

    /* M2 · por la puerta. Antes esto llamaba a SFX.musicaTema directo, y como
       la intro nunca registraba archivos, sonaba el SINTETIZADOR — el "trailer
       con música vieja" que reportó Rodri. */
    this.pedirMusica("opening");
    this.flashBlanco();
  }
  /* ══════════════════════════════════════════════════════════════════════
     I1 · EL PROTAGONISTA VA PRIMERO.

     Antes el plano más largo del comienzo (4 segundos) lo abría la ráfaga de
     héroes, y su primera figura era un jugador de camiseta NARANJA a rayas con
     el número 4 — o sea un rival. Vos aparecías recién en el plano siguiente.
     Es la primera imagen del juego y el protagonista no estaba.

     Ahora el orden es: EL GRITO (vos, con tu pose y tu nombre en pantalla) y
     DESPUÉS la ráfaga. Lo que se hizo fue intercambiar p3 y p4 en la lista del
     scheduler, así que los dos métodos siguen contando lo mismo y sus tiempos
     siguen saliendo de balance.intro.planos_ms — solo cambió quién entra
     primero.
     ══════════════════════════════════════════════════════════════════════ */
  p3(dur) {   // RÁFAGA DE HÉROES: 4 cortes de ~0,7s con flash y golpe
    const orden = [["chilena", 0xffd84d], ["cabezazo", 0x4fc3f7], ["barrida", 0xff8a50], ["arquero_vuela", 0xf6efdc]];
    const paso = dur / orden.length;
    orden.forEach((par, k) => {
      this.time.delayedCall(k * paso, () => {
        if (this._fin) return;
        this.corteSeco();
        this.fxG.clear();
        /* I1 · cada corte de la ráfaga tiene su lugar: el color del cielo
           cambia con la figura, así la ráfaga late sin quedar en el vacío */
        /* D1 · bg-05 (horizonte con molino): la ráfaga late contra el campo */
        if (!this.fondoDeDiseno("bg5", 0.55)) this.fondoIntro([0x2a1c3a, 0x123a5a, 0x3a2418, 0x14303f][k % 4], 0x1d6b34, 300 + k * 12);
        this.radiales(par[1], 1);
        const s = this.poseImg(par[0], 480, 280, 400);
        this.temblor(s);
        this.flashBlanco();
        this.SFX && this.SFX.kick && this.SFX.kick();   // el golpe sincronizado
      });
    });
  }
  p4() {   // EL GRITO: pose congelada, zoom lento, ¡CALDENAZO! desde abajo
    /* I1 · con fondo (era otra figura flotando en negro) y el grito ENTRANDO
       desde más cerca: salía de y=700, o sea 160 px por debajo de la pantalla,
       y si el tween se demoraba el cartel no llegaba a verse nunca en su
       propio plano. Ahora sale de 560 y entra igual de golpe. */
    /* D1 · bg-01 (cielo de atardecer): el grito va contra el cielo */
    if (!this.fondoDeDiseno("bg1", 0.72)) this.fondoIntro(0x2a1c3a, 0x1d6b34, 330);
    const s = this.poseImg("remate", 480, 260, 460);
    if (s) this.tweens.add({ targets: s, scale: s.scale * 1.15, y: 300, duration: 1900, ease: "Sine.easeOut" });
    /* I1 · el grito NACE en su lugar (ver p2): antes salía de abajo de la
       pantalla y no llegaba nunca a su propio plano */
    const g = this.add.text(480, 440, this.I.t_grito || "¡CALDENAZO!",
      { fontFamily: window.PF.display, fontSize: "40px", color: "#ffd84d", stroke: "#9c2b1d", strokeThickness: 5 }).setOrigin(0.5);
    this.capa.add(g);
    this.tweens.add({ targets: g, scale: 1.06, duration: 220, yoyo: true, repeat: 2 });
    this.cameras.main.shake(280, 0.012);
    this.SFX && this.SFX.riserGrande && this.SFX.riserGrande(1.4);
  }
  p5() {   // EL SILENCIO: todo se detiene — el recurso del juego, enseñado antes de jugar
    /* I1 · el silencio es a propósito, pero con TODO en negro no se leía como
       una pausa: se leía como otro plano vacío más. Con el campo detrás y la
       luz baja, la quietud se nota porque hay algo que podría moverse. */
    /* D1 · bg-02 (alambrado y campo): quieto y vacío, que es el punto */
    if (!this.fondoDeDiseno("bg2", 0.5)) this.fondoIntro(0x0e2036, 0x14522a, 300);
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
    /* I1 · era el ÚNICO plano con fondo crema claro y rayos gris verdoso, en
       una secuencia de negros y cálidos apagados. Con cortes secos ese cambio
       de valor pegaba como un flash, y no parecía intencional porque el
       arquero no es un momento más importante que los otros. Ahora es un
       atardecer: sigue siendo el más claro de los ocho —el arquero recorta— sin
       salirse de la paleta. */
    /* D1 · bg-03 (tribuna de tablones): el arquero contra la gente */
    if (!this.fondoDeDiseno("bg3", 0.8)) this.fondoIntro(0xc86a3a, 0x2a6b38, 300);
    this.radiales(0x0a1f13, 0.8);
    const s = this.poseImg("arquero_vuela", 480, 270, 380);
    this.temblor(s);
    /* M2 · vuelve DE GOLPE: seco, sin fundido, que es el efecto del plano */
    this.pedirMusica("silencio", { seco: true });
    this.pedirMusica("opening", { seco: true });
  }
  p7() {   // EL GOL: festejo sobre explosión dorada, hinchada a todo volumen
    /* I1 · el mejor plano de los ocho ya era éste; solo le faltaba el lugar */
    /* D1 · bg-06 (noche con luces): el gol, bajo los reflectores */
    if (!this.fondoDeDiseno("bg6", 0.7)) this.fondoIntro(0x1a1030, 0x1f7a3c, 320);
    this.radiales(0xffd84d, 1.4);
    const s = this.poseImg("festejo", 480, 280, 430);
    this.temblor(s);
    this.flashBlanco();
    this.SFX && this.SFX.goal && this.SFX.goal();
    this.SFX && this.SFX.crowd && this.SFX.crowd(1800);
  }
  p8(dur) {   // EL LOGO: el nombre del juego, la bajada letra por letra, acorde final
    /* I1 · el cierre SÍ se queda en negro, y a propósito: es el único plano
       donde el vacío es el punto (el título respirando). Los otros siete ya
       tienen su lugar. */
    const negro = this.add.rectangle(480, 270, 960, 540, 0x000000, 1);
    this.capa.add(negro);
    if (this.textures.exists("i_logo")) {
      /* I1 · el logo NACE en su lugar. Antes caía de y=-220 con un rebote, y
         como los tweens de esta escena no avanzan, el cierre de la intro no
         mostraba el nombre del juego NUNCA: quedaba solo la bajada. */
      /* D2 · el logo de Claude Design si está; si no, el de antes */
      const kL = this.textures.exists("d_logo") ? "d_logo" : "i_logo";
      const l = this.add.image(480, 210, kL);
      l.setScale(Math.min(1, 620 / l.width, 300 / l.height));
      this.capa.add(l);
      this.time.delayedCall(540, () => { if (!this._fin) { this.cameras.main.shake(200, 0.01); this.SFX && this.SFX.net && this.SFX.net(); } });
    } else {
      const t = this.add.text(480, 220, "PAMPA STAR", { fontFamily: window.PF.display, fontSize: "44px", color: "#ffd84d", stroke: "#0a1f13", strokeThickness: 5 }).setOrigin(0.5);
      this.capa.add(t);
    }
    this.time.delayedCall(700, () => {
      if (this._fin) return;
      this.letraPorLetra(480, 380, this.I.t_bajada || "DEL POTRERO AL MUNDIAL",
        { fontFamily: window.PF.display, fontSize: "16px", color: "#f6efdc", stroke: "#0a1f13", strokeThickness: 3 }, 55);
    });
    this.time.delayedCall(dur - 500, () => { if (!this._fin) this.cameras.main.fadeOut(480, 0, 0, 0); });   // el ÚNICO fundido: al título
  }
};
