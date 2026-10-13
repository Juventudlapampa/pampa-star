/* ============================================================================
   PAMPA STAR · phaser/scenes/pantalla_ui.js — PANTALLA COMPLETA (render)
   Tanda 1.0, lote L07-celular (pantalla-completa).

   Lo que estaba mal, medido: requestFullscreen, startFullscreen y
   orientation.lock daban 0 resultados en phaser/ (grep). En un Android
   apaisado de 915x412 con la barra del navegador, el lienzo se ve a 0,659; a
   pantalla completa sería 0,763: todo un 16% más grande. Y la compuerta
   escuchaba pointerdown, que con el dedo NO cuenta como gesto para pedir
   pantalla completa (la especificación da "activación" al soltar: pointerup
   o touchend; al apoyar, solo con el mouse).

   Lo que hay acá:
     1) EL PARCHE DE PHASER. ScaleManager.startFullscreen de Phaser 3.80.1
        llama a requestFullscreen y TIRA la promesa que devuelve. Si el
        navegador dice que no (sin gesto, un iframe sin permiso), el rechazo
        no lo atrapa nadie y LA RED DE ERRORES lo recibe como
        unhandledrejection: medido en el navegador del panel, un
        startFullscreen() sin gesto sacó "Algo se trabó" con "TypeError:
        Permissions check failed". El parche hace lo mismo que el original y
        además atrapa la promesa: un no del navegador es FULLSCREEN_FAILED,
        como Phaser ya tenía previsto, y no un error del juego.
     2) EL MIXIN (las cuatro escenas, como la piel y el cursor):
        pantallaCompleta(origen) decide con logic/entorno.js
        (decidirPantallaCompleta) y pide; al entrar, traba la orientación en
        horizontal (screen.orientation.lock: en Android solo anda
        a pantalla completa, y es lo que deja el juego apaisado aunque la
        rotación automática esté apagada). botonPantalla() dibuja el botón
        "PANTALLA" con su ícono de cuatro esquinas dibujado (no un carácter:
        ⛶ no está en la tipografía del juego y en muchos teléfonos sale como
        un cuadrado vacío) y lo atiende al SOLTAR el dedo.

   La pantalla completa es la de TODA LA PÁGINA (config.scale.fullscreenTarget
   en index.html), no la del lienzo: los avisos DOM ("Algo se trabó", la caja
   del código de carrera, el atrás, la versión nueva) tienen que seguir a la
   vista, y a pantalla completa solo se ve lo que está adentro del elemento.
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- 1) el parche: la promesa de requestFullscreen ---------- */
  var SM = window.Phaser && Phaser.Scale && Phaser.Scale.ScaleManager && Phaser.Scale.ScaleManager.prototype;
  if (SM && !SM.__pampaPantalla) {
    SM.startFullscreen = function (opciones) {
      if (opciones === undefined) opciones = { navigationUI: "hide" };
      var fs = this.fullscreen, sm = this;
      if (!fs || !fs.available) { this.emit(Phaser.Scale.Events.FULLSCREEN_UNSUPPORTED); return false; }
      if (document.fullscreenElement || document.webkitFullscreenElement) return false;
      var blanco = this.getFullscreenTarget(), p;
      /* revisión L07 · LA RAMA "keyboard" DE PHASER, SOLO CON PREFIJO. La
         detección del vendor elige "requestFullscreen" primero y pone
         keyboard = true si existe Element.ALLOW_KEYBOARD_INPUT (la
         constante vieja de WebKit). Con requestFullscreen SIN prefijo
         (el navegador de fábrica del iPad, y el de las compus de la misma
         marca, desde su versión 16.4), pasar ese número donde va
         un FullscreenOptions es un TypeError por WebIDL: la promesa se
         rechaza, termina en FULLSCREEN_FAILED y el botón PANTALLA queda
         muerto. El número es del pedido viejo (webkitRequestFullScreen);
         al sin prefijo van las opciones. A confirmar en un iPad. */
      var conTeclado = fs.keyboard && fs.request !== "requestFullscreen";
      try {
        p = conTeclado ? blanco[fs.request](Element.ALLOW_KEYBOARD_INPUT) : blanco[fs.request](opciones);
      } catch (e) { this.fullscreenErrorHandler(e); return false; }
      if (p && typeof p.then === "function") p.then(null, function (e) { sm.fullscreenErrorHandler(e); });
      return true;
    };
    SM.__pampaPantalla = true;
  }

  function activa() {
    try { return !!(document.fullscreenElement || document.webkitFullscreenElement); } catch (e) { return false; }
  }
  function tactil() {
    try { return !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches); } catch (e) { return false; }
  }
  function instalada() {
    var R = window.PampaRed;
    if (R && R.instalada) return R.instalada();
    try { return !!(window.matchMedia && window.matchMedia("(display-mode: standalone)").matches); } catch (e) { return false; }
  }

  window.PampaPantallaUI = {
    /* lo que logic/entorno.js necesita saber, medido ahora */
    entornoPantalla: function (origen) {
      var fsDev = this.scale && this.scale.fullscreen;
      var habilitada = true;
      try { if (document.fullscreenEnabled === false) habilitada = false; } catch (e) { }
      var P = (this.game.registry.get("balance") || {}).pantalla || {};
      return {
        origen: origen || "boton",
        disponible: !!(fsDev && fsDev.available) && habilitada,
        activa: activa(),
        instalada: instalada(),
        tactil: tactil(),
        embebido: !!window.PAMPA_EMBEBIDO,
        auto: P.auto
      };
    },

    /* la pide si corresponde. Tiene que llamarse ADENTRO del manejador de un
       toque al soltar (pointerup) o de una tecla: si no, el navegador dice
       que no (y ahora eso ya no es un error, ver el parche) */
    pantallaCompleta: function (origen) {
      var E = window.PampaEntorno, sc = this.scale;
      if (!E || !E.decidirPantallaCompleta || !sc) return false;
      var d = E.decidirPantallaCompleta(this.entornoPantalla(origen));
      if (!d.pedir) return false;
      var self = this;
      var alEntrar = function () { sc.off(Phaser.Scale.Events.FULLSCREEN_FAILED, alFallar); self.trabarHorizontal(); };
      var alFallar = function () { sc.off(Phaser.Scale.Events.ENTER_FULLSCREEN, alEntrar); };
      sc.once(Phaser.Scale.Events.ENTER_FULLSCREEN, alEntrar);
      sc.once(Phaser.Scale.Events.FULLSCREEN_FAILED, alFallar);
      try { sc.startFullscreen({ navigationUI: "hide" }); }
      catch (e) { alFallar(); sc.off(Phaser.Scale.Events.FULLSCREEN_FAILED, alFallar); return false; }
      return true;
    },
    /* horizontal aunque el teléfono gire; si el navegador no lo deja (la
       compu, iPhone, algunos navegadores de Android), no pasa nada */
    trabarHorizontal: function () {
      try {
        var o = window.screen && window.screen.orientation;
        if (o && typeof o.lock === "function") {
          var p = o.lock("landscape");
          if (p && typeof p.catch === "function") p.catch(function () { });
        }
      } catch (e) { }
    },
    alternarPantallaCompleta: function () {
      if (activa()) { try { this.scale.stopFullscreen(); } catch (e) { } return "salir"; }
      return this.pantallaCompleta("boton") ? "entrar" : "nada";
    },

    /* ══════════════════════════════════════════════════════════════════════
       EL BOTÓN "PANTALLA". o = {
         capa       container al que se suma (el HUD del partido);
         largo      "PANTALLA COMPLETA" en vez de "PANTALLA" (el editor);
         soloEntrar se esconde a pantalla completa (en el partido: de ahí se
                    sale con el atrás del teléfono o con ESC, y un botón al
                    lado de PAUSA que diga SALIR se confunde con irse);
         tap        alto del área táctil (balance.legibilidad.tap_min: 61
                    lógicos, 44 px reales en el teléfono);
         desdeArriba el área baja desde y=0 (pegado al borde de arriba el dedo
                    no toca fuera del lienzo: igual que ⏸ PAUSA);
         desdeIzquierda x es el borde izquierdo y no el centro (el texto
                    cambia de largo y el botón crece hacia la derecha);
         desdeDerecha x es el borde DERECHO (crece hacia la izquierda: en
                    el partido, pegado al reloj sin pisarlo);
         xDe        función que da x en cada pintada, en vez del x fijo (el
                    partido la calcula con el ancho medido del reloj);
         alApoyar   (ev) al apoyar: el partido corta ahí el toque, para que
                    no llegue al mapa }
       Devuelve null si no sirve (sin API, o instalada): no hay botón muerto. */
    botonPantalla: function (x, y, o) {
      o = o || {};
      var E = window.PampaEntorno;
      if (!E || !E.mostrarBotonPantalla || !E.mostrarBotonPantalla(this.entornoPantalla("boton"))) return null;
      var self = this, sc = this.scale;
      var tap = o.tap || (((this.game.registry.get("balance") || {}).legibilidad || {}).tap_min) || 61;
      var H = 24, ICO = 12, AIRE = 8, ENTRE = 6;
      var g = this.add.graphics();
      var t = this.add.text(0, y, "", { fontFamily: window.PF.texto, fontSize: "13px", fontStyle: "bold", color: "#f6efdc" }).setOrigin(0, 0.5);
      var zona = this.add.rectangle(x, y, 10, H, 0x0a1f13, 0);
      var piezas = [g, t, zona];
      if (o.capa) o.capa.add(piezas);
      var pintar = function () {
        if (!t.scene) return;
        var dentro = activa();
        var ver = !(o.soloEntrar && dentro);
        piezas.forEach(function (p) { p.setVisible(ver); });
        if (zona.input) zona.input.enabled = ver;
        if (!ver) return;
        t.setText(dentro ? "SALIR DE PANTALLA COMPLETA" : (o.largo ? "PANTALLA COMPLETA" : "PANTALLA"));
        var xx = o.xDe ? o.xDe() : x;
        var W = AIRE + ICO + ENTRE + Math.ceil(t.width) + AIRE;
        var x0 = o.desdeIzquierda ? xx : o.desdeDerecha ? Math.round(xx - W) : Math.round(xx - W / 2);
        t.setX(x0 + AIRE + ICO + ENTRE);
        g.clear();
        g.fillStyle(0x0a1f13, 0.9); g.fillRoundedRect(x0, y - H / 2, W, H, 8);
        g.lineStyle(2, 0xf6efdc, 0.75); g.strokeRoundedRect(x0, y - H / 2, W, H, 8);
        /* el ícono: cuatro esquinas. Hacia AFUERA = agrandar; hacia ADENTRO
           = achicar. La forma cambia además del texto (no solo el color) */
        var cx = x0 + AIRE + ICO / 2, cy = y, r = ICO / 2, b = 4;
        g.lineStyle(2, 0xffd84d, 1);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s) {
          /* la esquina (px, py) del cuadrado; el vértice de la L va en la
             esquina (agrandar) o corrido b hacia el centro (achicar) */
          var px = cx + s[0] * r, py = cy + s[1] * r;
          var vx = dentro ? px - s[0] * b : px, vy = dentro ? py - s[1] * b : py;
          g.beginPath();
          g.moveTo(dentro ? px : vx - s[0] * b, vy);
          g.lineTo(vx, vy);
          g.lineTo(vx, dentro ? py : vy - s[1] * b);
          g.strokePath();
        });
        zona.setPosition(x0 + W / 2, y);
        zona.setSize(W, H);
        var arriba = o.desdeArriba ? (y - H / 2) : (tap - H) / 2;
        zona.setInteractive(new Phaser.Geom.Rectangle(-3, -arriba, W + 6, Math.max(tap, H)), Phaser.Geom.Rectangle.Contains, { useHandCursor: true });
        if (zona.input) zona.input.hitArea.setTo(-3, -arriba, W + 6, Math.max(tap, H));
      };
      zona.on("pointerdown", function (p, lx, ly, ev) {
        if (ev && ev.stopPropagation) ev.stopPropagation();
        if (o.alApoyar) o.alApoyar(ev);
      });
      /* AL SOLTAR: con el dedo es el único momento en que el navegador deja */
      zona.on("pointerup", function (p, lx, ly, ev) {
        if (ev && ev.stopPropagation) ev.stopPropagation();
        var S = window.PampaSFX; if (S && S.ui) S.ui("abrir");
        self.alternarPantallaCompleta();
      });
      var EV = Phaser.Scale.Events;
      sc.on(EV.ENTER_FULLSCREEN, pintar);
      sc.on(EV.LEAVE_FULLSCREEN, pintar);
      this.events.once("shutdown", function () { sc.off(EV.ENTER_FULLSCREEN, pintar); sc.off(EV.LEAVE_FULLSCREEN, pintar); });
      pintar();
      return { g: g, t: t, zona: zona, pintar: pintar };
    }
  };
})();
