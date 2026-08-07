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
    }
  };

  window.PampaPielUI = PIEL;
})();
