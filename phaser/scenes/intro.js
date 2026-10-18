/* ============================================================================
   PAMPA STAR · phaser/scenes/intro.js — EL OPENING (Addendum v6 Parte A)
   La intro estilo anime: 8 planos en 18-25 segundos, TODO en cortes secos.
   El arte ya existe (assets/poses/ + assets/ui/): acá solo se MUEVE.
   Reglas duras (A.4): todo por delayedCall con reloj propio (jamás tweens
   encadenados como hilo), CUALQUIER toque o tecla saltea al título y corta el
   audio limpio, si falta un asset el plano se saltea solo y nada crashea.
   Tiempos, textos y colores en balance.json → intro. Flag intro_opening.
   Se ve UNA vez por APARATO (tanda 1.0, L08: la marca va a localStorage,
   pampa_intro_vista); en el editor queda el botón "▶ VER INTRO".
   ========================================================================== */
window.PampaIntro = class PampaIntro extends Phaser.Scene {
  constructor() { super("intro"); }

  /* P1: Phaser reusa la instancia en cada scene.start ("VER INTRO" del
     editor vuelve acá): lo de la carga del opening arranca de cero */
  init() {
    this._fin = false;
    this._arranco = false;
    this._openingListo = false;
    this._esperando = false;
    this._cargaOpening = null;
    this._imgsListas = false;
    this._temaPedido = false;
    this._temaListo = false;
    this._topeTema = null;
    this._espera = null;
    this._tocaTxt = null;
    this._teclaTxt = null;
    this._salteoArmado = false;
    this._directo = false;   // L08: la compuerta va directo al editor (el opening ya se vio en este aparato)
  }

  /* ══════════════════════════════════════════════════════════════════════
     L08 (opening-una-vez) · EL OPENING, UNA VEZ POR APARATO.

     Lo que estaba mal: la marca de "ya se vio" vivía solo en el registry de
     Phaser (introVista), que muere con la página. Cada vez que se abría el
     link o se recargaba, otra vez los 19,5 s de planos (la suma de
     balance.intro.planos_ms) y otra vez a bajar lo del opening (1,45 MB,
     medido en carga_liviana.test.js) antes de llegar al editor.

     Ahora la marca queda además en localStorage (pampa_intro_vista = "1"),
     y se escribe cuando el opening ARRANCA de verdad (arrancarOpening): si
     alguien cierra la página en la compuerta, o la saltea mientras todavía
     bajaba, no lo vio y la próxima vez le toca. Con la marca, la compuerta
     sigue estando, porque su toque es el gesto que desbloquea el audio y el
     que en Android pide la pantalla completa, pero lleva directo al editor
     (salir()): no se baja ni se arma nada del opening. VER INTRO del editor
     (introPedida) lo sigue mostrando, y balance.intro.una_vez_por_aparato
     en false vuelve a lo de antes (una vez por sesión). Las dos lecturas van
     dentro de try: con el almacenamiento bloqueado, el opening se ve como
     la primera vez y nada se traba. */
  openingVistoEnElAparato() {
    if (this.I && this.I.una_vez_por_aparato === false) return false;
    try { return localStorage.getItem(window.PampaIntro.CLAVE_VISTA) === "1"; } catch (e) { return false; }
  }
  marcarOpeningVisto() {
    if (this.I && this.I.una_vez_por_aparato === false) return;
    try { localStorage.setItem(window.PampaIntro.CLAVE_VISTA, "1"); } catch (e) { }
  }

  preload() {
    /* A.4: nada crashea por un archivo faltante (el plano se saltea solo).
       L05: con señal floja, lo que falla se vuelve a pedir UNA vez
       (logic/carga.js); si vuelve a fallar, sigue sin él como antes. */
    if (window.PampaCarga) window.PampaCarga.reintentarUnaVez(this.load);
    /* L06 (carga-liviana): el avance va al cartel de la página, que sigue a
       la vista hasta el create */
    if (this.barraDeCarga) this.barraDeCarga("el arranque");
    /* ══════════════════════════════════════════════════════════════════════
       L06 · ANTES DE LA COMPUERTA, SOLO LA COMPUERTA.

       Lo que estaba mal, medido con node sobre los manifiestos: este preload
       pedía las 40 imágenes de poses_manifest (todas las poses y fondos) más
       las diez de assets/ui: 3,33 MB, y recién con todo eso aparecía "TOCÁ
       PARA EMPEZAR". El opening usa 18 (1,45 MB) y la compuerta, el logo
       (94 KB). Sumado a los scripts, los JSON y las tipografías, la compuerta
       llegaba con 4,28 MB bajados en negro: 35 s a 1 Mbps.

       Ahora el preload baja SOLO el logo de la compuerta. Lo del opening
       (PampaIntro.UI_OPENING más balance.intro.poses_intro y fondos_intro)
       se baja en create(), con la compuerta ya a la vista; el resto de las
       poses las pide el partido, y el editor y el Master las bajan antes,
       en segundo plano (logic/carga.js). */
    window.PampaIntro.UI_COMPUERTA.forEach((u) => {
      if (!this.textures.exists(u.clave)) this.load.image(u.clave, u.ruta);
    });
  }

  /* lo que usa el opening (logic/carga.js, listaDelOpening) */
  listaOpening() {
    const C = window.PampaCarga;
    if (!C || !C.listaDelOpening) return [];
    return C.listaDelOpening(this.I || {}, this.game.registry.get("poses"), window.PampaIntro.UI_OPENING);
  }

  /* L06 · lo del opening se baja con la compuerta a la vista, con el mismo
     loader de la escena (create corre con la escena viva: el loader anda) */
  cargarOpening() {
    if (this._cargaOpening || this._openingListo) return;
    this.bajarTemaDelOpening();
    const falta = this.listaOpening().filter((x) => !this.textures.exists(x.clave));
    if (!falta.length || !this.load || typeof this.load.start !== "function") { this.imagenesListas(); return; }
    this._cargaOpening = { v: 0, n: falta.length };
    falta.forEach((x) => this.load.image(x.clave, x.ruta));
    this.load.on("progress", (v) => {
      if (this._cargaOpening) this._cargaOpening.v = v;
      if (this._espera) this.pintarEspera();
    });
    this.load.once("complete", () => this.imagenesListas());
    this.load.start();
  }

  /* ══════════════════════════════════════════════════════════════════════
     REVISIÓN DEL LOTE L06 · EL TEMA DEL OPENING, CON LA COMPUERTA.
     Lo que estaba mal, medido por quien hizo el lote: los <audio> nacen con
     preload="none" y la música se registraba recién en el primer
     pedirMusica, que en la intro es p2: el tema del opening (422 KB) recién
     pudo sonar 4,2 s después de pedirse, y el opening se ve UNA vez por
     aparato, justo en la primera visita, con poca señal. La compuerta
     existe para que suene desde el primer plano, y p2 y el grito salían
     mudos. Ahora, junto con las imágenes: se registra la música (la misma
     puerta de piel_ui.js: registrarMusicaGlobal) y se precarga el tema del
     opening. Y la espera ("CARGANDO LA INTRO… NN%") espera también a que
     el tema pueda sonar entero, con tope: balance.intro.tema_tope_ms
     después de que llegan las imágenes (si el tema falla o no hay red, el
     opening arranca igual, como antes). */
  bajarTemaDelOpening() {
    if (this._temaPedido) return;
    this._temaPedido = true;
    const S = window.PampaSFX;
    const n = this.registrarMusicaGlobal ? this.registrarMusicaGlobal() : 0;
    if (!S || !S.precargarTemas || !S.cuandoTemaListo || !n || (S.hayArchivo && !S.hayArchivo("opening"))) { this._temaListo = true; return; }
    S.precargarTemas(["opening"]);
    S.cuandoTemaListo("opening", () => { this._temaListo = true; this.quizasListo(); });
  }
  imagenesListas() {
    this._imgsListas = true;
    if (this._cargaOpening) this._cargaOpening.v = 1;
    if (this._espera) this.pintarEspera();
    if (!this._temaListo && !this._topeTema && this.time) {
      const tope = this.I && this.I.tema_tope_ms != null ? this.I.tema_tope_ms : 4000;
      this._topeTema = this.time.delayedCall(tope, () => { this._temaListo = true; this.quizasListo(); });
    }
    this.quizasListo();
  }
  quizasListo() { if (this._imgsListas && this._temaListo) this.openingListo(); }

  openingListo() {
    if (this._openingListo) return;
    this._openingListo = true;
    if (this._cargaOpening) this._cargaOpening.v = 1;
    /* lo que viene después del opening es el editor: sus caras (2,1 MB),
       en segundo plano, mientras la compuerta espera el toque. Si el opening
       ya arrancó, esperan a que su música pueda sonar (p2) */
    if (!this._arranco) this.calentarElEditor();
    if (this._esperando && !this._fin) { this._esperando = false; this.arrancarOpening(); }
  }
  calentarElEditor() {
    if (window.PampaCarga && this.calentarEnSegundoPlano) {
      this.calentarEnSegundoPlano(window.PampaCarga.listaDelEditor(this.game.registry.get("caras")));
    }
  }

  /* después del toque (o de VER INTRO): si lo del opening ya está, arranca;
     si no, la compuerta pasa a decir cuánto falta y arranca sola al llegar */
  seguirAlOpening() {
    this.cargarOpening();   // si ya está todo en memoria, lo marca listo en el acto
    if (this._openingListo) { this.arrancarOpening(); return; }
    this._esperando = true;
    this.mostrarEspera();
  }

  /* "CARGANDO LA INTRO… 43%" con su barra (el número escrito: no solo la
     barra), en el lugar de "TOCÁ PARA EMPEZAR". Mientras espera, un toque
     saltea al editor, como en el opening. Revisión del lote: decía "EL
     OPENING", y el botón del editor que lleva acá dice "▶ VER INTRO": la
     misma pantalla con dos nombres (y uno en inglés). El texto va en
     balance.intro.t_cargando_intro, como los otros t_ de la intro. */
  mostrarEspera() {
    if (this._tocaTxt) { this.tweens.killTweensOf(this._tocaTxt); this._tocaTxt.setVisible(false); }
    if (this._teclaTxt) this._teclaTxt.setVisible(false);
    const y = this.I.compuerta_toca_y || 360;
    const txt = this.add.text(480, y, "", { fontFamily: window.PF.display, fontSize: "15px", color: "#f6efdc", stroke: "#0a1f13", strokeThickness: 3 }).setOrigin(0.5);
    const g = this.add.graphics();
    this.capa.add(txt); this.capa.add(g);
    this._espera = { txt: txt, g: g, y: y };
    this.pintarEspera();
    this.armarSalteo();
  }
  pintarEspera() {
    const E = this._espera;
    if (!E || !E.txt.active) return;
    const v = this.avanceDelOpening(), pct = Math.floor(Math.max(0, Math.min(1, v)) * 100);
    E.txt.setText((this.I.t_cargando_intro || "CARGANDO LA INTRO…") + " " + pct + "%");
    const W = 300, H = 14, x = 480 - W / 2, y = E.y + 22;
    E.g.clear();
    E.g.lineStyle(2, 0xf6efdc, 0.9); E.g.strokeRect(x, y, W, H);
    E.g.fillStyle(0xf5c400, 1); E.g.fillRect(x + 3, y + 3, Math.round((W - 6) * v), H - 6);
  }

  /* cuánto de lo del opening ya está: las imágenes pesan 1,36 MB y el tema
     0,24 (medido en el disco: lo de listaDelOpening y Victory_Lap_At_Dawn.ogg, el
     del 17/oct, 255 KB), así que el tema es el 15% de la barra; el loader da el avance de las
     imágenes y el tema suma entero cuando puede sonar (o vence su tope) */
  avanceDelOpening() {
    const PESO_TEMA = 0.15;
    const vImg = this._imgsListas ? 1 : (this._cargaOpening ? this._cargaOpening.v : 0);
    return vImg * (1 - PESO_TEMA) + (this._temaListo ? PESO_TEMA : 0);
  }

  create() {
    /* L06 (carga-liviana): el cartel de la página ("PAMPA STAR · cargando…
       NN%"), que estaba desde el primer byte, se va acá. Revisión del lote:
       el service worker se instala recién cuando la intro TERMINA (salir(),
       o acá mismo si no hay intro): su instalación (el código otra vez y
       tres temas, ~1 MB) le peleaba la señal a lo del opening, que baja con
       la compuerta a la vista (index.html, LA RED) */
    if (window.PampaCartel) window.PampaCartel.sacar();
    /* 17/oct: las muestras de los efectos (audio/sfx.js, LAS MUESTRAS), una
       vez por sesión y con la compuerta ya a la vista */
    const S = window.PampaSFX;
    if (S && S.cargarMuestras) S.cargarMuestras("../assets/sonidos/");
    this.entrarDesdeNegro();
    const BAL = this.game.registry.get("balance") || {};
    this.I = BAL.intro || {};
    const flagOff = BAL.flags && BAL.flags.intro_opening === false;
    const pedida = this.game.registry.get("introPedida");
    /* L08: ¿ya se vio en este aparato? (VER INTRO lo pide igual) */
    const yaVisto = !pedida && this.openingVistoEnElAparato();
    /* sin compuerta no hay gesto que cuidar: con la marca, directo al editor */
    if (flagOff || (this.game.registry.get("introVista") && !pedida) || (yaVisto && this.I.compuerta === false)) {
      if (window.PampaRegistrarSW) window.PampaRegistrarSW();
      this.irA("editor");
      return;
    }
    if (window.PampaRegistrarSW) window.PampaRegistrarSW("espera");
    this.game.registry.set("introVista", true);
    this.game.registry.set("introPedida", false);
    this._fin = false;
    this._arranco = false;
    this.SFX = window.PampaSFX;
    this.cameras.main.setBackgroundColor("#000000");
    this.capa = this.add.container(0, 0);
    this.fxG = this.add.graphics().setDepth(50);
    /* FIX del opening mudo: el navegador exige un GESTO para habilitar audio,
       y cualquier gesto salteaba la intro → LA COMPUERTA: una pantalla previa
       cuyo toque desbloquea el audio Y dispara el opening CON sonido desde el
       primer plano. Si la intro se pidió desde el editor, el gesto ya ocurrió. */
    /* L06: con la compuerta a la vista se baja lo del opening; sin compuerta
       (o pedida desde el editor) se espera a que esté, mostrando cuánto falta */
    /* L08: con el opening ya visto en este aparato, la compuerta queda (el
       gesto) pero su toque va al editor; mientras espera, en vez de lo del
       opening se bajan las caras del editor, que es adonde va */
    this._directo = yaVisto;
    if (this.I.compuerta === false || pedida) this.seguirAlOpening();
    else if (this._directo) { this.compuerta(); this.calentarElEditor(); }
    else { this.compuerta(); this.cargarOpening(); }
  }

  /* --- LA COMPUERTA: negro, el logo, y "TOCÁ PARA EMPEZAR" pulsando --- */
  compuerta() {
    /* L04b · LA COMPUERTA SIN PISARSE A 800x360. Dos cruces medidos:
       · el logo (pampa-star-logo.webp, 2400x2200) iba escalado por ANCHO
         (540/2400 = 0,225, 540x495 centrado en y=210): su dibujo, medido por
         el alfa (> 16) del archivo, ocupa las filas 22 a 2115, o sea del
         lienzo y=-32 a 438. Se salía por arriba y "TOCÁ PARA EMPEZAR" (y=400)
         caía encima de las letras de STAR;
       · el aviso del atrás del teléfono ("Tocá ATRÁS otra vez para salir",
         DOM, 18 px fijos, abajo de todo) a 800x360 arranca en y=292 CSS, que
         con el lienzo a 0,667 es y=438 del juego: tapaba por 2 s el renglón
         "(o apretá cualquier tecla)" (y=442). A 568x320, el teléfono apaisado
         más bajo que se usa, arranca en y=425 del juego.
       Ahora el logo va escalado por ALTO (balance.intro.compuerta_logo_alto,
       330: el dibujo llega a y≈329) y los dos renglones suben a su franja
       propia (360 y 392): todo termina en y≈399, arriba de 425. */
    const Q = this.I;
    const altoLogo = Q.compuerta_logo_alto || 330;
    if (this.textures.exists("d_logo") || this.textures.exists("i_logo")) {
      /* D2 · la PANTALLA DE INICIO (la compuerta) también lleva el nombre */
      const l = this.add.image(480, Q.compuerta_logo_y != null ? Q.compuerta_logo_y : 12, this.textures.exists("d_logo") ? "d_logo" : "i_logo").setOrigin(0.5, 0);
      l.setScale(Math.min(1, 540 / l.width, altoLogo / l.height));
      this.capa.add(l);
    } else {
      const t = this.add.text(480, 200, "PAMPA STAR", { fontFamily: window.PF.display, fontSize: "40px", color: "#ffd84d", stroke: "#0a1f13", strokeThickness: 5 }).setOrigin(0.5);
      this.capa.add(t);
    }
    const toca = this.add.text(480, Q.compuerta_toca_y || 360, Q.t_compuerta || "👆 TOCÁ PARA EMPEZAR",
      { fontFamily: window.PF.display, fontSize: "15px", color: "#f6efdc", stroke: "#0a1f13", strokeThickness: 3 }).setOrigin(0.5);
    this.capa.add(toca);
    this._tocaTxt = toca;   // L06: si al tocar falta lo del opening, este renglón pasa a decir cuánto
    this.tweens.add({ targets: toca, alpha: 0.35, scale: 1.06, duration: 620, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    if (this.input.keyboard && !this.sys.game.device.input.touch) {
      const tk = this.add.text(480, Q.compuerta_tecla_y || 392, Q.t_compuerta_teclado || "(o apretá cualquier tecla)",
        { fontFamily: window.PF.texto, fontSize: "12px", color: "#f6efdc99" }).setOrigin(0.5);
      this.capa.add(tk);
      this._teclaTxt = tk;   // L06: la espera usa su renglón (visto en captura: la barra le quedaba encima)
    }
    const go = () => {
      if (this._arranco || this._fin) return;
      this._arranco = true;
      this.SFX && this.SFX.unlock && this.SFX.unlock();   // EL GESTO: el audio queda habilitado
      /* L07 · PANTALLA COMPLETA Y HORIZONTAL (scenes/pantalla_ui.js). En el
         teléfono, sin la barra del navegador el lienzo pasa de 0,659 a 0,763
         (un 16% más grande), y trabado en horizontal no se da vuelta aunque
         la rotación automática esté apagada. La guarda la pone
         logic/entorno.js (decidirPantallaCompleta): solo si el navegador
         tiene la API y no está instalada (la app instalada ya abre así),
         y la compuerta la pide sola solo con el dedo (balance.pantalla.auto).
         En iPhone no hay API para la página: no pide nada. */
      if (this.pantallaCompleta) this.pantallaCompleta("compuerta");
      /* L08: el opening ya se vio en este aparato: el toque hizo lo suyo
         (audio y pantalla completa) y se va al editor, sin planos */
      if (this._directo) { this.salir(); return; }
      this.seguirAlOpening();   // L06: arranca ya, o cuando termine de bajar lo suyo
    };
    /* L07 · AL SOLTAR, no al apoyar: con el dedo, pointerdown llega con el
       touchstart, que NO da permiso para pedir pantalla completa (la
       activación de un toque es al soltar: touchend o pointerup). Con el
       mouse, el permiso del mousedown dura hasta el pointerup. El salteo de
       después (armarSalteo) sigue con pointerdown: ese toque ya es otro. */
    this.input.once("pointerup", go);
    if (this.input.keyboard) this.input.keyboard.once("keydown", go);
  }

  /* --- el opening en sí (recién acá cualquier toque SALTEA) --- */
  arrancarOpening() {
    this._arranco = true;
    this._esperando = false;
    /* L06: con el opening corriendo, la señal es para su música: lo que se
       bajaba en segundo plano y no salió todavía se frena (vuelve en p2,
       cuando el tema ya puede sonar, o en el preload del editor) */
    if (window.PampaCalentador) window.PampaCalentador.frenar();
    this.corteSeco();
    this._espera = null;
    this.armarSalteo();
    /* L08: recién acá el opening se VE: la marca del aparato va ahora (ver
       openingVistoEnElAparato) */
    this.marcarOpeningVisto();
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

  /* cualquier toque o tecla saltea al editor. Se arma UNA vez: al tocar la
     compuerta (si falta lo del opening, ya mientras espera) o al arrancar */
  armarSalteo() {
    this._gestoTs = this.time.now;
    if (this._salteoArmado) return;
    this._salteoArmado = true;
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
  }

  /* --- utilería del opening --- */
  corteSeco() { this.capa.removeAll(true); this.fxG.clear(); this.tweens.killAll(); }
  salir() {
    if (this._fin) return;
    if (this._gestoTs != null && this.time.now - this._gestoTs < 180) return;   // el gesto de la compuerta no saltea
    this._fin = true;
    /* revisión L06: lo del opening ya no hace falta: ahora sí se instala el
       service worker (index.html, LA RED) */
    if (window.PampaRegistrarSW) window.PampaRegistrarSW();
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
    const man = this.game.registry.get("poses"), def = man && man.poses && man.poses[id];
    const conPelota = !!(def && def.pelota && this.textures.exists("pose_pelota_vieja") && this.add.container);
    const s = this.add.image(conPelota ? 0 : x, conPelota ? 0 : y, "pose_" + id);
    s.setScale(altura / s.height);
    /* OJOS (tanda 1.0) · LA PELOTA EN SU HUECO. Las poses que declaran
       'pelota' en el manifest traen la pelota RECORTADA del webp, y acá nadie
       la ponía: en la ráfaga de héroes el cabezazo salía SIN CARA (el hueco
       se come la frente, los ojos y la nariz; ver _pelota_en_la_cara en
       data/poses_manifest.json) y la chilena pateaba un agujero, en el
       opening que ve toda persona que arranca. Ahora la pelota de potrero va
       DETRÁS de la pose, en el {x,y,r} del manifest y con ese tamaño, y las
       dos en un contenedor: el temblor y el zoom del plano mueven a las dos
       juntas y el hueco no se corre. */
    if (conPelota) {
      const dW = s.displayWidth, dH = s.displayHeight;
      const b = this.add.image((def.pelota.x - 0.5) * dW, (def.pelota.y - 0.5) * dH, "pose_pelota_vieja");
      b.setScale((def.pelota.r * 2 * dH) / (b.height || 1));
      const grupo = this.add.container(x, y, [b, s]);
      this.capa.add(grupo);
      return grupo;
    }
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
      try { var sv = JSON.parse((this.crudoDelMaster ? this.crudoDelMaster() : localStorage.getItem("pampa_master_v1")) || "null");
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
    this.letraPorLetra(480, 470, this.I.t_pueblo || "En alguna localidad de La Pampa…",
      { fontFamily: window.PF.display, fontSize: "15px", color: "#f6efdc", stroke: "#0a1f13", strokeThickness: 3 }, 34);
    /* 17/oct, Rodri: en la intro sonaba un chiptune que no tenía nada que
       ver. Eran los efectos sintetizados del partido (bombo, riser, la
       fanfarria del gol en onda cuadrada) disparados encima del tema, que no
       los acompaña. Quedan la música, la hinchada y la red del logo. */
    this.SFX && this.SFX.crowd && this.SFX.crowd(dur);   // el viento lejano
    /* 17/oct: el tema del opening nuevo dura 20 s y los ocho planos 19,5:
       arranca acá, con el primer plano, y suena entero y de corrido hasta el
       logo. Antes arrancaba en p2 y p6 lo cortaba y lo volvía a empezar. */
    this.pedirMusica("opening");
    /* L06: las caras del editor, recién cuando el tema del opening tiene con
       qué sonar hasta el final (antes se repartían la señal con él) */
    if (this.SFX && this.SFX.cuandoSuenaListo) this.SFX.cuandoSuenaListo(() => this.calentarElEditor());
    else this.calentarElEditor();
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
  p6() {   // EL ARQUERO: la estirada contra el blanco, la música vuelve del bajón de p5
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
    /* la música vuelve sola: el musicaDuck de p5 dura lo que el plano */
  }
  p7() {   // EL GOL: festejo sobre explosión dorada, hinchada a todo volumen
    /* I1 · el mejor plano de los ocho ya era éste; solo le faltaba el lugar */
    /* D1 · bg-06 (noche con luces): el gol, bajo los reflectores */
    if (!this.fondoDeDiseno("bg6", 0.7)) this.fondoIntro(0x1a1030, 0x1f7a3c, 320);
    this.radiales(0xffd84d, 1.4);
    const s = this.poseImg("festejo", 480, 280, 430);
    this.temblor(s);
    this.flashBlanco();
    this.SFX && this.SFX.festejo && this.SFX.festejo(1800);
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

/* L06 (carga-liviana) · LAS ILUSTRACIONES DE assets/ui QUE PIDE LA INTRO.
   La compuerta, en el preload (es lo único que hace falta para ver "TOCÁ
   PARA EMPEZAR"); las del opening, en create(), con la compuerta a la vista
   (junto con balance.intro.poses_intro y fondos_intro, logic/carga.js).
   D1 · los seis fondos de Claude Design: 1920x1080 planos y de poco
   contraste, hechos para ir DETRÁS (resuelven que siete de los ocho planos
   fueran figuras flotando en negro puro). D2 · las dos versiones del logo.
   D4 · el cartel del pueblo. */
/* L08 (opening-una-vez) · la marca del aparato: "1" cuando el opening ya
   arrancó una vez acá (ver openingVistoEnElAparato) */
window.PampaIntro.CLAVE_VISTA = "pampa_intro_vista";

window.PampaIntro.UI_COMPUERTA = [
  { clave: "d_logo", ruta: "../assets/ui/pampa-star-logo.webp" }
];
window.PampaIntro.UI_OPENING = [
  { clave: "i_pueblo", ruta: "../assets/ui/fondo_pueblo.webp" },
  { clave: "i_logo", ruta: "../assets/ui/logo.webp" },
  { clave: "bg1", ruta: "../assets/ui/bg-01-cielo-atardecer.webp" },
  { clave: "bg2", ruta: "../assets/ui/bg-02-alambrado-campo.webp" },
  { clave: "bg3", ruta: "../assets/ui/bg-03-tribuna-tablones.webp" },
  { clave: "bg4", ruta: "../assets/ui/bg-04-tierra-pasto-seco.webp" },
  { clave: "bg5", ruta: "../assets/ui/bg-05-horizonte-molino.webp" },
  { clave: "bg6", ruta: "../assets/ui/bg-06-noche-luces.webp" },
  { clave: "d_cartel", ruta: "../assets/ui/cartel-pueblo.webp" }
];
