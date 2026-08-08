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
      var x = rect.x, y = rect.y;
      var ox = (rect.originX != null ? rect.originX : 0.5), oy = (rect.originY != null ? rect.originY : 0.5);
      var x0 = x - w * ox, y0 = y - h * oy;

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
      var destOrig = rect.destroy.bind(rect);
      rect.destroy = function () { capas.forEach(function (o) { o.destroy(); }); return destOrig(); };

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
       centrado hay que correr el origen en negativo. */
    pisoTactil: function (obj, min) {
      if (!obj || obj._pisoTactil) return obj;
      var P = this.piel();
      var LEG = (this.game.registry.get("balance") || {}).legibilidad || {};
      var piso = min != null ? min : (LEG.tap_min != null ? LEG.tap_min : 61);
      var w = obj.width || 0, h = obj.height || 0;
      if (!(w > 0 && h > 0)) return obj;
      if (w >= piso && h >= piso) { obj._pisoTactil = true; return obj; }
      var W = Math.max(w, piso), H = Math.max(h, piso);
      obj.setInteractive(new Phaser.Geom.Rectangle(-(W - w) / 2, -(H - h) / 2, W, H),
        Phaser.Geom.Rectangle.Contains, { useHandCursor: true });
      obj._pisoTactil = true;
      obj._tapArea = { w: W, h: H };
      return obj;
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
    }
  };

  window.PampaPielUI = PIEL;
})();
