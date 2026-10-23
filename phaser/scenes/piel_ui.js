/* ============================================================================
   PAMPA STAR · LA PIEL (render)
   TANDA DE PIEL (7/ago). Lo que necesita Phaser: la textura del fondo radial y
   el botón con cuerpo. La aritmética vive en logic/piel.js.

   Se instala como mixin en cualquier escena:  Object.assign(X.prototype, PIEL)

   DOS COSAS QUE COSTARON Y QUEDAN ANOTADAS:

   1) Phaser NO acepta un gradiente como backgroundColor, y fillGradientStyle()
      interpola por vértice (4 esquinas) solo en WebGL — no da un radial de
      verdad y el config es Phaser.AUTO. Por eso el radial se BAKEA una sola
      vez con CanvasTexture + ctx.createRadialGradient y se usa como imagen.

   2) En un Container el orden de dibujo es el ORDEN DE INSERCIÓN, no el depth.
      El canto y la sombra del botón tienen que entrar ANTES que la cara, en el
      mismo container, o tapan el botón. setDepth() acá no sirve de nada.
   ========================================================================== */
(function () {
  "use strict";
  /* M2: los doce temas se registran UNA VEZ para todo el juego, no por escena */
  var MUSICA_REGISTRADA = false;
  /* L06 (carga-liviana): la cola que baja en segundo plano lo de la pantalla
     siguiente. Una sola para todo el juego (vive acá y no en la escena:
     Phaser reusa la instancia y lo que baja no es de nadie) */
  var CALENTADOR = null;
  /* prioridad baja (los navegadores que no la conocen la ignoran) y el cuerpo
     leído entero: si no se lee, la descarga puede quedar a medias y no llegar
     a la caché */
  function bajarSinApuro(ruta) {
    return fetch(ruta, { priority: "low", credentials: "same-origin" }).then(function (r) {
      if (!r.ok) throw new Error("calentar " + r.status + " " + ruta);
      return r.arrayBuffer();
    });
  }
  function calentador() {
    if (CALENTADOR) return CALENTADOR;
    var K = window.PampaCarga;
    if (!K || !K.crearCalentador || typeof fetch !== "function") return null;
    CALENTADOR = K.crearCalentador({ paralelas: 2, pedir: bajarSinApuro });
    window.PampaCalentador = CALENTADOR;
    return CALENTADOR;
  }
  var PIEL = {

    /* ---------- la paleta de esta escena, resuelta una vez ---------- */
    piel: function () {
      if (!this._piel) {
        var bal = this.game.registry.get("balance") || {};
        this._piel = window.PampaPiel.paleta(bal.piel);
      }
      return this._piel;
    },

    /* ---------- P1 · EL FONDO DEL MARCO ----------
       Un radial verde profundo al centro que cae a casi negro en los bordes.
       La textura se bakea UNA vez por juego y la comparten todas las escenas.
       El verde de la cancha no pasa por acá: esto es el marco. */
    texturaFondo: function (w, h) {
      var P = this.piel();
      var W = w || 960, H = h || 540;
      var key = "piel_fondo_" + W + "x" + H + "_" + String(P.fondo_centro).replace("#", "") + String(P.fondo_borde).replace("#", "");
      if (this.textures.exists(key)) return key;
      var tex = this.textures.createCanvas(key, W, H);
      var ctx = tex.getContext();
      /* el foco va un poco arriba del centro, como el radial del juego clásico
         (120% 80% at 50% -10%): la luz cae desde arriba, no desde el medio */
      var cx = W * 0.5, cy = H * 0.18;
      var r = Math.max(W, H) * 0.95;
      var g = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.04, cx, cy, r);
      g.addColorStop(0, P.fondo_centro);
      g.addColorStop(1, P.fondo_borde);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      tex.refresh();
      return key;
    },

    /* pone el fondo radial al fondo de la escena y devuelve la imagen */
    fondoDePiel: function (w, h) {
      var W = w || 960, H = h || 540;
      var img = this.add.image(0, 0, this.texturaFondo(W, H)).setOrigin(0, 0);
      img.setDepth(-10000);
      return img;
    },

    /* ---------- P7 · LA BALDOSA ESPEJADA ----------
       La tribuna se repite en horizontal y se ve la costura donde el techo se
       corta en seco. El PNG (1280x720) es una ILUSTRACIÓN EN PERSPECTIVA: el
       techo es una cuña que crece de izquierda a derecha, así que el borde
       izquierdo (marrón de estructura) y el derecho (celeste de cielo) no
       empalman ni por casualidad — medido, difieren 274 sobre 765 de suma RGB.

       En vez de pedir arte nuevo, se hornea [T | espejo(T)]: la última columna
       de la baldosa doble es la primera columna de T, así que el empalme del
       wrap es IDÉNTICO por construcción, no aproximado. Y una cuña de techo que
       va y vuelve en Λ lee como estadio, no como error. */
    texturaEspejada: function (srcKey) {
      var dst = srcKey + "_esp";
      if (this.textures.exists(dst)) return dst;
      if (!this.textures.exists(srcKey)) return srcKey;
      var src = this.textures.get(srcKey).getSourceImage();
      var w = src.width, h = src.height;
      var tex = this.textures.createCanvas(dst, w * 2, h);
      var ctx = tex.getContext();
      ctx.drawImage(src, 0, 0, w, h);
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(src, -2 * w, 0, w, h);   // la copia espejada, pegada a la derecha
      ctx.restore();
      tex.refresh();
      return dst;
    },

    /* ---------- P2 · EL BOTÓN CON CUERPO ----------
       Tres capas, de atrás para adelante:
         sombra difusa negra   (que despega el botón del fondo)
         canto sólido sin blur (el costado del propio botón, su color oscurecido)
         cara                  (el botón)
       Al presionar, la cara baja `hunde` px y el canto se achica lo mismo: eso
       es lo que se lee como "se hundió".

       Devuelve { cara, canto, sombra, alto, destruir(), zona } — `cara` es el
       Rectangle de siempre, así que el código que ya existía sigue andando.
       `capas` junta las tres para que quien limpie la pantalla las borre todas:
       si el canto no entra al mismo registro que la cara, quedan sombras
       flotando cuando el botón desaparece. */
    botonPiel: function (x, y, w, h, color, opts) {
      opts = opts || {};
      var PP = window.PampaPiel, P = this.piel();
      var cfg = PP.capasBoton(color, P);
      var radio = opts.radio != null ? opts.radio : (opts.pildora ? Math.min(w, h) / 2 : cfg.radio);
      var cantoPx = opts.canto != null ? opts.canto : cfg.cantoPx;
      var capas = [];

      /* 1) la sombra difusa: un Graphics con varias pasadas de alpha bajo.
            Phaser no tiene blur en Graphics, así que se simula con capas
            concéntricas — barato y se ve bien a este tamaño. */
      var som = this.add.graphics();
      var pasos = 4, sa = cfg.sombra.alpha / pasos;
      for (var i = pasos; i >= 1; i--) {
        var crece = (i / pasos) * (cfg.sombra.blur || 10) * 0.5;
        som.fillStyle(0x000000, sa);
        som.fillRoundedRect(x - w / 2 - crece, y - h / 2 + cfg.sombra.dy - crece,
          w + crece * 2, h + crece * 2, radio + crece);
      }
      capas.push(som);

      /* 2) el canto: sólido, sin blur, del propio color oscurecido */
      var canto = this.add.graphics();
      canto.fillStyle(cfg.canto, 1);
      canto.fillRoundedRect(x - w / 2, y - h / 2 + cantoPx, w, h, radio);
      capas.push(canto);

      /* 3) la cara */
      var cara = this.add.graphics();
      var pintarCara = function (dy) {
        cara.clear();
        cara.fillStyle(cfg.cara, opts.alpha != null ? opts.alpha : 1);
        cara.fillRoundedRect(x - w / 2, y - h / 2 + dy, w, h, radio);
        if (opts.borde) {
          cara.lineStyle(opts.bordeGrosor || 2, opts.borde, 1);
          cara.strokeRoundedRect(x - w / 2, y - h / 2 + dy, w, h, radio);
        }
      };
      pintarCara(0);
      capas.push(cara);

      /* la zona clickeable: un rect invisible del tamaño de la cara, con el
         área táctil crecida en celular (44px es el mínimo cómodo) */
      var zona = this.add.rectangle(x, y, Math.max(w, 44), Math.max(h, 44), 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      capas.push(zona);

      /* Al presionar solo se mueve LA CARA: el canto se queda donde está, así
         que la franja de canto que asoma pasa de `cantoPx` a `cantoPx - hunde`.
         Eso es exactamente "el botón se hundió" — no hay que redibujar el
         canto, alcanza con taparlo un poco más. */
      var hundido = false;
      var hundir = function (si) {
        if (hundido === si) return;
        hundido = si;
        pintarCara(si ? cfg.hunde : 0);
        if (opts.alTocar && si) opts.alTocar();
      };
      zona.on("pointerdown", function () { hundir(true); });
      zona.on("pointerup", function () { hundir(false); });
      zona.on("pointerout", function () { hundir(false); });

      var api = {
        cara: cara, canto: canto, sombra: som, zona: zona, capas: capas,
        tinta: cfg.tinta, hundir: hundir,
        setVisible: function (v) { capas.forEach(function (o) { o.setVisible(v); }); return api; },
        destruir: function () { capas.forEach(function (o) { o.destroy(); }); }
      };
      return api;
    },

    /* mete las capas de un botón en un container respetando el orden de
       inserción (sombra y canto primero) */
    botonPielEn: function (contenedor, x, y, w, h, color, opts) {
      var b = this.botonPiel(x, y, w, h, color, opts);
      if (contenedor) b.capas.forEach(function (o) { contenedor.add(o); });
      return b;
    },

    /* ---------- VESTIR UN BOTÓN QUE YA EXISTE ----------
       El juego tiene ~20 botones escritos a mano en 5 archivos, cada uno con
       sus handlers, su registro de limpieza y su lógica de mostrar/ocultar.
       Reescribirlos era garantía de romper algo, así que esto los VISTE:

         · el Rectangle original deja de pintarse (alpha 0) pero sigue vivo —
           conserva TODOS sus listeners, su setVisible y su registro;
         · encima se dibuja la cara redondeada, el canto y la sombra;
         · las capas nuevas se insertan JUSTO DEBAJO del rect, así que respetan
           el orden de inserción del container (donde depth no sirve);
         · las capas quedan colgadas del rect (rect._pielCapas) y siguen su
           visible y su destroy: si no, quedan sombras flotando cuando el botón
           desaparece — que era el bug más probable de toda la tanda.

       Devuelve el rect, para poder encadenar. */
    vestirBoton: function (rect, opts) {
      if (!rect || rect._pielCapas) return rect;
      opts = opts || {};
      var PP = window.PampaPiel, P = this.piel();
      var color = opts.color != null ? opts.color : (rect.fillColor != null ? rect.fillColor : P.n.acento);
      var cfg = PP.capasBoton(color, P);
      var w = rect.width, h = rect.height;
      var radio = opts.radio != null ? opts.radio : (opts.pildora ? Math.min(w, h) / 2 : cfg.radio);
      var cantoPx = opts.canto != null ? opts.canto : cfg.cantoPx;
      /* el rect puede vivir en un container: las capas van a SU mismo padre y
         en SUS coordenadas locales */
      var padre = rect.parentContainer;
      /* las capas se dibujan alrededor de su propio (0,0) y se paran donde
         está el rect: ver `seguir` más abajo */
      var ox = (rect.originX != null ? rect.originX : 0.5), oy = (rect.originY != null ? rect.originY : 0.5);
      var x0 = -w * ox, y0 = -h * oy;

      var som = this.add.graphics();
      var pasos = 4, sa = cfg.sombra.alpha / pasos;
      for (var i = pasos; i >= 1; i--) {
        var crece = (i / pasos) * cfg.sombra.blur * 0.5;
        som.fillStyle(0x000000, sa);
        som.fillRoundedRect(x0 - crece, y0 + cfg.sombra.dy - crece, w + crece * 2, h + crece * 2, radio + crece);
      }
      var canto = this.add.graphics();
      canto.fillStyle(cfg.canto, 1);
      canto.fillRoundedRect(x0, y0 + cantoPx, w, h, radio);
      var cara = this.add.graphics();
      var alphaCara = rect.fillAlpha != null && rect.fillAlpha > 0 ? rect.fillAlpha : 1;
      var pintar = function (dy) {
        cara.clear();
        cara.fillStyle(color, alphaCara);
        cara.fillRoundedRect(x0, y0 + dy, w, h, radio);
      };
      pintar(0);

      var capas = [som, canto, cara];
      if (padre) {
        /* en un Container manda el ORDEN DE INSERCIÓN, no el depth: las capas
           entran en la posición del rect y lo empujan hacia adelante */
        var idx = padre.getIndex(rect);
        capas.forEach(function (o, k) { padre.addAt(o, idx + k); });
      } else {
        /* en la display list de la escena alcanza con mandarlas debajo del rect */
        var lista = this.children;
        capas.forEach(function (o) { lista.moveBelow(o, rect); });
      }
      /* el rect deja de pintarse pero sigue recibiendo el toque */
      rect.setFillStyle(color, 0);
      if (rect.setStrokeStyle) rect.setStrokeStyle();

      /* las capas siguen la suerte del botón */
      var visOrig = rect.setVisible.bind(rect);
      rect.setVisible = function (v) { capas.forEach(function (o) { o.setVisible(v); }); return visOrig(v); };
      /* Revisión final del 17/oct: los botones de la cruz y de ★ ESPECIAL
         entran volando (PampaFeel.aparecer, hasta 30 px corridos y al 86%) y
         vestirPendientes los agarra en cualquier cuadro del vuelo. La cara
         quedaba pintada donde estaba el rect en ese cuadro: corrida, y en la
         grilla la columna derecha tapaba media izquierda. Ahora las capas
         siguen al rect en cada cuadro, vuelo incluido. */
      var seguir = function () {
        capas.forEach(function (o) { o.setPosition(rect.x, rect.y); o.setScale(rect.scale); });
      };
      seguir();
      var escena = this;
      escena.events.on("postupdate", seguir);
      var destOrig = rect.destroy.bind(rect);
      rect.destroy = function () {
        escena.events.off("postupdate", seguir);
        capas.forEach(function (o) { o.destroy(); });
        return destOrig();
      };

      /* y el hundido, que es lo que se lee como "lo apreté" */
      rect.on("pointerdown", function () { pintar(cfg.hunde); });
      rect.on("pointerup", function () { pintar(0); });
      rect.on("pointerout", function () { pintar(0); });

      rect._pielCapas = capas;
      rect._pielRepintar = pintar;
      return rect;
    },

    /* ---------- L4 · EL PISO TÁCTIL ----------
       El piso de accesibilidad táctil es 44 CSS px. En un teléfono apaisado el
       juego escala 0,7222, así que 44 reales son 61 LÓGICOS. Medido: ningún
       botón del juego llegaba — el más alto es 54.

       Se agranda el ÁREA, no el dibujo: el botón se sigue viendo igual y el
       dedo le acierta. El hitArea de Phaser va en coordenadas locales del
       objeto, con (0,0) en su esquina superior izquierda, así que para crecer
       centrado hay que correr el origen en negativo.

       L10 · DOS AGUJEROS QUE QUEDABAN:
         · un objeto que YA era tocable no crecía: en Phaser 3.80
           setInteractive(área) sobre un objeto con input solo lo habilita
           (InputPlugin.enable) y se queda con el área vieja. Por eso los
           botones que vestía vestirPendientes seguían en 52 o 46 de alto
           aunque _tapArea dijera 61. Ahora se cambia el área del input.
         · el piso se mide en pantalla: un objeto achicado con setScale
           necesita un área local más grande para llegar a lo mismo. */
    pisoTactil: function (obj, min) {
      if (!obj || obj._pisoTactil) return obj;
      var LEG = (this.game.registry.get("balance") || {}).legibilidad || {};
      var piso = min != null ? min : (LEG.tap_min != null ? LEG.tap_min : 61);
      var w = obj.width || 0, h = obj.height || 0;
      if (!(w > 0 && h > 0)) return obj;
      var sx = Math.abs(obj.scaleX || 1), sy = Math.abs(obj.scaleY || 1);
      var ha = obj.input && obj.input.hitArea;
      var haW = ha ? (ha.width || (ha.radius || 0) * 2) : w, haH = ha ? (ha.height || (ha.radius || 0) * 2) : h;
      obj._pisoTactil = true;
      if (haW * sx >= piso && haH * sy >= piso) return obj;
      var W = Math.max(w, piso / sx), H = Math.max(h, piso / sy);
      var area = new Phaser.Geom.Rectangle(-(W - w) / 2, -(H - h) / 2, W, H);
      if (obj.input) {
        obj.input.hitArea = area;
        obj.input.hitAreaCallback = Phaser.Geom.Rectangle.Contains;
      } else {
        obj.setInteractive(area, Phaser.Geom.Rectangle.Contains, { useHandCursor: true });
      }
      obj._tapArea = { w: W * sx, h: H * sy };
      return obj;
    },

    /* L10 · TODO lo tocable al piso, no solo los botones con relleno que
       viste vestirPendientes: textos, zonas, círculos, rectángulos sin
       relleno y los de más de 560 de ancho (la entrevista, los eventos).
       Lo usa vestirPendientes y, sin vestir nada, la pantalla de título. */
    pisoTactilTodo: function () {
      var self = this;
      var visitar = function (o) {
        if (!o) return;
        if (o.input && o.input.enabled && !o._pisoTactil) self.pisoTactil(o);
        if (o.type === "Container" || o.type === "Layer") (o.list || []).forEach(visitar);
      };
      this.children.list.forEach(visitar);
    },

    /* ══════════════════════════════════════════════════════════════════════
       L11 · EL CUIDADO: DESTELLOS Y MOVIMIENTO (logic/cuidado.js).

       Toda cámara que destella o se sacude pasa por acá, en todas las
       escenas y sus agregados (el cine, LA ONDA, la Definición, el Jugadón,
       la toma del remate, la intro). cuidado.test.js pone la suite en rojo si
       aparece un .flash( o un .shake( en otro archivo de phaser/scenes.

       El cupo es UNO por escena: el flash, el cuadro crema del gol, el cuadro
       de impacto de LA ONDA y el negro de corte del cine cuentan juntos, como
       los cuenta el ojo. Sin cupo, el flash y los cuadros no salen y el negro
       baja a balance.cuidado.negro_sin_cupo. En MOVIMIENTO SUAVE no hay
       flash ni sacudón, y los zooms de cámara son cortes.
       ══════════════════════════════════════════════════════════════════════ */
    movimientoSuave: function () { return this.game.registry.get("movimiento") === "suave"; },
    cupoDestello: function () {
      var C = this.game.registry.get("balance").cuidado;
      if (!this._limDestellos) this._limDestellos = window.PampaCuidado.limitador({ ventana_ms: C.destellos_ventana_ms, max: C.destellos_max });
      return this._limDestellos.pedir(this.time.now);
    },
    destello: function (cam, ms, r, g, b) {
      if (this.movimientoSuave() || !this.cupoDestello()) return false;
      cam.flash(ms, r, g, b);
      return true;
    },
    sacudir: function (cam, ms, intensidad, forzar) {
      if (this.movimientoSuave()) return false;
      cam.shake(ms, intensidad, forzar);
      return true;
    },
    alfaNegro: function () {
      return this.cupoDestello() ? 1 : this.game.registry.get("balance").cuidado.negro_sin_cupo;
    },
    zoomCamara: function (cam, z, ms, ease, forzar) {
      if (this.movimientoSuave()) { cam.setZoom(z); return; }
      cam.zoomTo(z, ms, ease, forzar);
    },

    /* L10 · EL SONIDO SE APAGA DESDE CADA PANTALLA, CON LA PALABRA A LA VISTA.
       Solo estaba en la PAUSA del partido y en OPCIONES del título: el
       opening, el editor, la tabla y la semana tienen música y no había cómo
       callarla sin salir. Es el mismo interruptor (PampaSFX.setMuted, que ya
       guarda la elección en el aparato) con las mismas palabras que la PAUSA.
       Uno por escena: si la vista ya lo puso, se devuelve ese. origenX: 0 si
       x es el borde izquierdo, 1 si es el derecho. */
    botonSonido: function (x, y, origenX) {
      var S = window.PampaSFX;
      if (this._btnSonido && this._btnSonido.scene) return this._btnSonido;
      var palabra = function () { return S.isMuted() ? "SONIDO: NO" : "SONIDO: SÍ"; };
      var t = this.add.text(x, y, palabra(), {
        fontFamily: window.PF.texto, fontSize: "13px", color: "#f6efdc",
        backgroundColor: "#0a1f13cc", padding: { x: 6, y: 4 }
      }).setOrigin(origenX || 0, 0).setDepth(99);
      this.pisoTactil(t);
      t.on("pointerdown", function (p, xx, yy, ev) {
        ev && ev.stopPropagation && ev.stopPropagation();
        S.setMuted(!S.isMuted());
        t.setText(palabra());
      });
      this._btnSonido = t;
      return t;
    },

    /* ---------- VESTIR LOS QUE VAYAN APARECIENDO ----------
       Los menús del partido (duelo, remate, tempo, jugadón) nacen y mueren en
       runtime, así que no alcanza con vestir en create(). Esto barre la escena
       y viste lo que todavía no esté vestido.

       QUÉ CUENTA COMO BOTÓN, para no vestir de más:
         · Rectangle interactivo (las zonas de toque invisibles quedan afuera
           porque tienen fillAlpha 0),
         · con tamaño de botón (ni un velo de pantalla completa ni una pastilla
           de 4px),
         · que no esté ya vestido.
       Barre cada `cada` frames: con el guard, el trabajo real es solo sobre los
       botones nuevos. */
    vestirPendientes: function (cada) {
      this._pielTick = (this._pielTick || 0) + 1;
      if (cada && (this._pielTick % cada) !== 0) return 0;
      var self = this, n = 0;
      this.pisoTactilTodo();
      var visitar = function (o) {
        if (!o) return;
        if (o.type === "Container" || o.type === "Layer") { (o.list || []).slice().forEach(visitar); return; }
        if (o.type !== "Rectangle" || o._pielCapas) return;
        if (!o.input || !o.input.enabled) return;
        if (!(o.fillAlpha > 0)) return;                       // zonas invisibles: no son botones
        if (o.width < 60 || o.height < 20) return;            // pastillas y marcas
        /* el tope se calibró MIRANDO los rects reales: los presets del partido
           son de 500x72, las ranuras de LA SEMANA de 250x108, y el velo del menú, que
           también es interactivo, mide 960x540. Entre esos está la línea. */
        if (o.width > 560 || o.height > 115) return;          // velos y paneles de fondo
        self.vestirBoton(o);
        self.pisoTactil(o);      /* L4: el área táctil al piso; el dibujo no cambia */
        n++;
      };
      this.children.list.slice().forEach(visitar);
      return n;
    },

    /* ══════════════════════════════════════════════════════════════════════
       M2 · LA UNICA PUERTA DE LA MUSICA.

       Antes habia DOS: this.musica() en el partido (con el mapa nuevo) y
       SFX.musicaTema() directo desde la intro, la definicion y el jugadon.
       Las que iban por la segunda caian al sintetizador viejo SIN AVISAR —
       por eso el bug se veia en cinco lugares distintos siendo uno solo.

       Ahora todas piden por aca, y si el momento no existe SE QUEJA:
         · en desarrollo (localhost) tira un error visible en consola
         · en produccion cae a SILENCIO, nunca al sintetizador
       Fallar en silencio es lo que hizo que esto durara tantas tandas.
       ══════════════════════════════════════════════════════════════════════ */

    /* registra los doce temas una sola vez. Antes cada escena registraba lo
       suyo y pisaba el mapa de las demas: la intro no registraba NADA y el
       master registraba UNA entrada, asi que al volver al partido el mapa
       quedaba con un solo tema. */
    /* REVISIÓN L07 · LA CARRERA DEL MASTER, DESDE CUALQUIER ESCENA. Si el
       Master no pudo guardar (almacenamiento bloqueado o lleno), su carrera
       vive en la copia de la sesión del registry (master.js, guardar), y lo
       que la lee de afuera (el escudo de tu club, el cartel de la intro, la
       alternancia de la música) tiene que ver la misma. Primero la copia; si
       no hay, el almacenamiento (logic/save_master.js, crudoDeLaSesion). */
    crudoDelMaster: function () {
      var SM = window.PampaSaveMaster, mem = null;
      try { mem = this.game.registry.get("masterSaveMemoria"); } catch (e) { mem = null; }
      var leer = function () { return localStorage.getItem("pampa_master_v1"); };
      if (SM && SM.crudoDeLaSesion) return SM.crudoDeLaSesion(mem, leer);
      try { return leer(); } catch (e) { return null; }
    },

    registrarMusicaGlobal: function (forzar) {
      var M = window.PampaMusica, S = window.PampaSFX;
      if (!M || !S || !S.registrarArchivos) return 0;
      var fecha = 0;
      try {
        var sv = JSON.parse(this.crudoDelMaster() || "null");
        fecha = (sv && sv.temporada && sv.temporada.fecha) | 0;
      } catch (e) { }
      var audio = this.game.registry.get("audio");
      if (!audio) return 0;
      var bal = this.game.registry.get("balance") || {};
      /* 20/oct: el estilo de OPCIONES (logic/opciones.js) */
      var estilo = window.PampaOpciones ? window.PampaOpciones.leer(localStorage, bal, audio).estilo : null;
      /* si cambio la fecha o el estilo hay que re-registrar: la alternancia depende de la fecha */
      if (MUSICA_REGISTRADA && !forzar && window.__PAMPA_MUSICA_FECHA === fecha && window.__PAMPA_MUSICA_ESTILO === estilo) return -1;
      var vol = (bal.musica && bal.musica.vol_archivo != null) ? bal.musica.vol_archivo : 0.42;
      var mapa = M.mapaCompleto(audio, fecha, "../assets/musica/", estilo);
      if (!mapa) return 0;
      var n = S.registrarArchivos(mapa, vol);
      MUSICA_REGISTRADA = true;
      window.__PAMPA_MUSICA_FECHA = fecha;
      window.__PAMPA_MUSICA_ESTILO = estilo;
      return n;
    },

    /* LA PUERTA. El momento tiene que estar en PampaMusica.MOMENTOS. */
    pedirMusica: function (momento, opts) {
      var M = window.PampaMusica, S = window.PampaSFX;
      opts = opts || {};
      if (!M || !S || !S.musicaTema) return false;
      if (!M.existe(momento)) {
        var aviso = "[MUSICA] momento desconocido: '" + momento + "'. Los validos: " +
          M.lista().join(", ") + ". Agregalo a phaser/logic/musica.js y dale tema en data/audio.json.";
        if (typeof location !== "undefined" && /localhost|127.0.0.1/.test(location.hostname)) console.error(aviso);
        window.__PAMPA_MUSICA_MALOS = (window.__PAMPA_MUSICA_MALOS || []).concat(momento);
        return false;
      }
      /* ══════════════════════════════════════════════════════════════════
         UNA ESCENA APAGADA NO PIDE MÚSICA.

         Medido en vivo: al terminar el partido, cerrarMusica() programa un
         delayedCall a los 2600 ms para el silencio de vestuario. Si te vas al
         master antes de que dispare, el temporizador llega TARDE y le apaga la
         música a una escena que ya no es la suya. Se vio en la corrida: el
         master pedía "espera" y el partido muerto lo callaba dos cuadros
         después.

         Es la misma familia que el bug de P1 — algo de la escena anterior que
         sigue vivo — pero acá no alcanza con limpiar banderas en init(), porque
         el que habla es un temporizador ya programado. Así que la puerta
         pregunta quién llama: si la escena ya se apagó, no pasa.

         OJO CON EL UMBRAL, que me lo comí de entrada: no sirve preguntar
         isActive(), porque durante create() la escena todavía está en CREATING
         y isActive() da false — y create() es justamente donde cada escena pide
         su tema. Lo que hay que rechazar es lo que viene DESPUÉS de RUNNING:
         SLEEPING (7), SHUTDOWN (8) y DESTROYED (9). Se leen de Phaser cuando
         están, y si no, de los números, que no cambiaron nunca. */
      var SC = (window.Phaser && Phaser.Scenes) || {};
      var dormida = SC.SLEEPING != null ? SC.SLEEPING : 7;
      var est = this.sys && this.sys.settings ? this.sys.settings.status : 0;
      if (est >= dormida) {
        window.__PAMPA_MUSICA_TARDIOS = (window.__PAMPA_MUSICA_TARDIOS || 0) + 1;
        return false;
      }
      /* la traba del final del partido sigue mandando */
      if (this._musicaTrabada && momento && momento !== "silencio") return false;
      this.registrarMusicaGlobal();
      S.musicaTema(momento === "silencio" ? null : momento, !!opts.seco);
      /* L06 (carga-liviana): los temas nacen sin bajar; se precarga solo lo
         que puede sonar después de este momento (logic/musica.js). Revisión
         del lote: opts.cierre (la última fecha del Master) suma el tema del
         título */
      if (S.precargarTemas && M.siguientes) S.precargarTemas(M.siguientes(momento, { cierre: !!opts.cierre }));
      this._musicaMomento = momento;
      this.armarCorteDeMusica();
      return true;
    },

    /* ══════════════════════════════════════════════════════════════════════
       M5 · LA MÚSICA NO SOBREVIVE AL CAMBIO DE ESCENA.

       Es la misma forma que las banderas de P1: Phaser REUSA la instancia de
       la escena, así que lo que quedó prendido sigue prendido. Con la música
       era peor todavía, porque el reproductor es GLOBAL: el tema de la semana
       lo arranca el master y lo sigue sonando el elemento <audio>, que no se
       entera de que cambiamos de escena. Por eso el segundo partido de la
       carrera arrancaba con la música del modo vida.

       Confiar en que cada salida se acuerde de apagar es lo que falló: hay
       nueve puntos que llaman a scene.start() y alcanza con que uno se olvide.
       Así que el corte se engancha UNA vez, acá, al evento shutdown que Phaser
       dispara cuando la escena se apaga. La escena que entra pide su momento
       en create() y lo pisa; la que no pide, queda en silencio, que es lo
       correcto — antes quedaba con lo que hubiera dejado la anterior.

       Se engancha recién cuando la escena pide música por primera vez (no en
       create) para que las escenas que nunca piden no toquen nada.
       ══════════════════════════════════════════════════════════════════════ */
    armarCorteDeMusica: function () {
      if (this._corteMusicaArmado || !this.events) return false;
      this._corteMusicaArmado = true;
      var esc = this;
      /* ONCE, no on (oct 2026): el emisor de la escena SOBREVIVE al shutdown
         —Phaser reusa la instancia— así que con `on` cada reinicio sumaba un
         gancho más. Con dos ganchos, el segundo pedía silencio encima del
         fundido del primero; en el reproductor viejo eso dejaba el tema que
         salía sonando para siempre. `once` se borra solo al disparar, y la
         bandera de abajo lo rearma en el próximo pedido. */
      this.events.once("shutdown", function () {
        esc._corteMusicaArmado = false;     // el once/on muere con el shutdown: hay que rearmar
        esc._musicaMomento = null;
        esc._musicaTrabada = false;         // la traba es POR PARTIDO, no por carrera
        var S = window.PampaSFX;
        /* con FUNDIDO, no seco: si la escena que entra pide su momento en
           create(), el fundido de 300 ms se convierte en un cruce limpio; y si
           no pide nada, termina de bajar y queda el silencio, que es lo que
           corresponde. Cortar seco acá dejaba un bache audible en cada pase. */
        if (S && S.musicaTema) S.musicaTema(null);
      });
      return true;
    },

    /* ══════════════════════════════════════════════════════════════════════
       LAS TRANSICIONES · los nueve cambios de pantalla eran cortes de un cuadro.

       El juego entero está hecho de momentos que respiran —el hitstop antes del
       desenlace, el freeze con silencio, la cámara que empuja mientras decidís—
       y sin embargo pasar de una PANTALLA a otra era un salto seco: un cuadro
       estabas en el editor y al siguiente en la cancha. Es lo primero que hace
       sentir barato un juego que no lo es.

       Un fundido y nada más. No hay wipes ni deslizados: el proyecto ya decidió
       que la épica se hace con la pose quieta y el corte seco DENTRO del
       momento (§ "el anime no anima"), así que entre pantallas lo que
       corresponde es lo sobrio.

       Dos detalles que importan:
         · el velo lleva setScrollFactor(0) y mide de más, porque la cancha
           tiene cámara con zoom y scroll: un rectángulo "de pantalla" atado al
           mundo se corre y deja un borde sin tapar.
         · `_yendo` existe porque dos toques rápidos encadenaban dos scene.start
           y la segunda pisaba a la primera a mitad de camino.
       ══════════════════════════════════════════════════════════════════════ */
    cfgTransicion: function () {
      var P = (this.game.registry.get("balance") || {}).piel || {};
      var T = P.transicion || {};
      return {
        salida: T.salida_ms != null ? T.salida_ms : 200,
        entrada: T.entrada_ms != null ? T.entrada_ms : 240,
        color: T.color != null ? T.color : 0x060f0a
      };
    },
    /* OJO CON EL SEXTO ARGUMENTO. add.rectangle(x, y, w, h, color, alpha) fija
       el alpha del RELLENO, no el del objeto: el GameObject queda en alpha 1
       igual. La primera version de esto creaba el velo con relleno 0 y le
       tweeneaba `.alpha` de 1 a 1 — o sea que el fundido no se veia NUNCA y la
       transicion era el mismo corte seco de antes, con 200 ms de demora. Andaba
       lo suficiente como para parecer que andaba. Ahora el relleno va opaco y
       el que se mueve es el alpha del objeto, que es lo que el tween toca. */
    veloDeTransicion: function (alpha) {
      var T = this.cfgTransicion();
      var v = this.add.rectangle(480, 270, 2400, 1600, T.color, 1);
      v.setAlpha(alpha).setScrollFactor(0).setDepth(99999);
      return v;
    },
    /* la salida: se funde a negro y RECIÉN AHÍ arranca la escena nueva */
    irA: function (escena, datos) {
      if (this._yendo) return false;
      this._yendo = true;
      var self = this, T = this.cfgTransicion();
      var velo = this.veloDeTransicion(0);
      this.tweens.add({
        targets: velo, alpha: 1, duration: T.salida, ease: "Quad.easeIn",
        onComplete: function () { self._yendo = false; self.scene.start(escena, datos); }
      });
      return true;
    },
    /* la entrada: la escena que abre lo hace DESDE negro. Se llama arriba de
       todo en create(), antes de dibujar nada, para que el velo quede sobre lo
       que sea que la escena arme después. */
    entrarDesdeNegro: function () {
      var T = this.cfgTransicion();
      /* LA LECCION DE P1, otra vez: Phaser REUSA la instancia de la escena en
         scene.start(), asi que `_yendo` quedaba en true cuando una transicion
         se cortaba por el medio (por ejemplo si alguien para la escena antes de
         que termine el tween) y desde ahi irA() devolvia false para siempre: la
         pantalla quedaba sin poder salir. Se limpia aca, que es lo primero que
         corre en cada create(). */
      this._yendo = false;
      /* L06: si el cartel de la página ("PAMPA STAR · cargando… NN%") sigue
         a la vista, se va con la primera pantalla que abre (lo saca la
         intro; esto es por si se arranca por otra) */
      if (window.PampaCartel && window.PampaCartel.sacar) window.PampaCartel.sacar();
      var velo = this.veloDeTransicion(1);
      this.tweens.add({
        targets: velo, alpha: 0, duration: T.entrada, ease: "Quad.easeOut",
        onComplete: function () { velo.destroy(); }
      });
      return velo;
    },

    /* ══════════════════════════════════════════════════════════════════════
       L06 · LA BARRA DE CARGA (tanda 1.0, carga-liviana).

       Lo que estaba mal, medido: ningún preload escuchaba "progress" (grep
       vacío en scenes/). Entre una pantalla y la siguiente quedaba el lienzo
       en negro mientras bajaban las poses del partido (2,1 MB) o las caras
       del editor (2,1 MB): con poca señal, decenas de segundos sin saber si
       el juego seguía vivo.

       Ahora cada preload la llama arriba de todo. Aparece recién cuando el
       loader ARRANCA con algo para bajar (si todo está en la caché no se ve
       nada) y se va cuando termina. Dice "CARGANDO EL PARTIDO… 43%": el
       número va escrito, no solo la barra (daltonismo). Si el cartel de la
       página todavía está a la vista (la intro, recién abierto el juego), el
       avance va ahí y no se dibuja nada encima.

       El estado vive en el cierre, no en la escena (P1: Phaser reusa la
       instancia y lo que queda en `this` llega al scene.start siguiente). Se
       desengancha sola al terminar, o al crear la escena: un preload sin
       nada que bajar no dispara "complete", y la intro usa el MISMO loader
       en create() para bajar lo del opening.
       que: lo que se está cargando, en minúscula ("el partido"). */
    barraDeCarga: function (que) {
      var load = this.load, self = this;
      if (!load || typeof load.on !== "function") return null;
      var SC = (window.Phaser && Phaser.Scenes) || {};
      var LOADING = SC.LOADING != null ? SC.LOADING : 3;
      var objs = null, activa = true;
      var titulo = ("Cargando " + (que || "") ).trim().toUpperCase() + "…";
      function cargando() { return !!(self.sys && self.sys.settings && self.sys.settings.status === LOADING); }
      function cartel() {
        var C = window.PampaCartel;
        return C && C.visible && C.visible() ? C : null;
      }
      function dibujar(v) {
        var p = Math.max(0, Math.min(1, v || 0)), pct = Math.floor(p * 100);
        /* revisión del 20/oct: setText sobre un texto destruido ("reading 'cut'")
           tiraba el loop; si la escena borró la barra, se arma de nuevo */
        if (!objs || !objs.txt.active) {
          if (objs) objs.g.destroy();
          var P = self.piel ? self.piel() : {};
          var txt = self.add.text(480, 248, "", {
            fontFamily: window.PF.display, fontSize: "18px", color: P.texto || "#f6efdc"
          }).setOrigin(0.5).setDepth(99990);
          var g = self.add.graphics().setDepth(99990);
          objs = { txt: txt, g: g, ac: (P.n && P.n.acento) || 0xf5c400, tx: (P.n && P.n.texto) || 0xf6efdc };
        }
        objs.txt.setText(titulo + " " + pct + "%");
        var W = 360, H = 18, x = 480 - W / 2, y = 276;
        objs.g.clear();
        objs.g.lineStyle(2, objs.tx, 0.9); objs.g.strokeRect(x, y, W, H);
        objs.g.fillStyle(objs.ac, 1); objs.g.fillRect(x + 3, y + 3, Math.round((W - 6) * p), H - 6);
      }
      function mostrar(v) {
        var C = cartel();
        if (C) { C.fase("escena", v); return; }
        dibujar(v);
      }
      function alEmpezar() {
        if (!activa) return;
        /* lo que se estaba bajando "por las dudas" deja pasar a lo que alguien espera */
        if (CALENTADOR) CALENTADOR.frenar();
        if (!cargando() || !load.list || !load.list.size) return;
        mostrar(0);
      }
      function alProgreso(v) { if (activa && cargando()) mostrar(v); }
      function terminar() {
        if (!activa) return;
        activa = false;
        load.off("start", alEmpezar); load.off("progress", alProgreso); load.off("complete", terminar);
        if (self.events) { self.events.off("create", terminar); self.events.off("shutdown", terminar); }
        if (objs) { objs.txt.destroy(); objs.g.destroy(); objs = null; }
      }
      load.on("start", alEmpezar);
      load.on("progress", alProgreso);
      load.once("complete", terminar);
      /* la escena cortada con el loader andando también la cierra */
      if (this.events && this.events.once) { this.events.once("create", terminar); this.events.once("shutdown", terminar); }
      return { terminar: terminar };
    },

    /* L06: baja en segundo plano lo de la pantalla siguiente (rutas o
       {ruta}); devuelve cuántas entraron a la cola */
    calentarEnSegundoPlano: function (lista) {
      var C = calentador();
      return C ? C.agregar(lista) : 0;
    },

    /* L06: el editor y el Master bajan, mientras se los mira, lo que va a
       pedir el preload del partido (logic/carga.js, listaDelPartido): las
       poses ya no las baja la intro. Las identidades tienen su manifiesto
       aparte (el partido lo pide con load.json): se lee y se suman. */
    calentarElPartido: function () {
      var K = window.PampaCarga, reg = this.game && this.game.registry;
      if (!K || !K.listaDelPartido || !reg) return 0;
      var self = this;
      var n = this.calentarEnSegundoPlano(K.listaDelPartido({
        poses: reg.get("poses"), caras: reg.get("caras"), portraits: reg.get("portraits"), tribuna: reg.get("tribuna")
      }));
      if (typeof fetch === "function") {
        fetch("../data/identidades_manifest.json").then(function (r) { return r.ok ? r.json() : null; })
          .then(function (m) { if (m) self.calentarEnSegundoPlano(K.listaDelPartido({ identidades: m })); })
          .catch(function () { /* sin manifiesto: el partido usa la pose de corrida, como siempre */ });
      }
      return n;
    }
  };

  window.PampaPielUI = PIEL;
})();
