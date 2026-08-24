/* ============================================================================
   PAMPA STAR · phaser/scenes/foco_ui.js — EL CURSOR

   Antes: cuatro navegaciones por teclado, cuatro resaltes caseros distintos, y
   cinco grupos de opciones sin navegación ninguna. Si soltabas el mouse, el
   juego no te contestaba: no había nada en pantalla que dijera dónde estabas
   parado.

   ═══ EL CURSOR ES UNO SOLO Y VIAJA ═══

   No se prende el ítem: se MUEVE un marcador del lugar viejo al nuevo, con un
   tween corto. Eso es lo que hace que el ojo lo siga en vez de tener que buscar
   de nuevo dónde quedó.

   ═══ CUATRO CANALES, NINGUNO SOLO-COLOR ═══

   Rodri es daltónico, así que un resalte que solo cambia de tono no existe.

     1. FORMA      dos escuadras de esquina abrazando el ítem. Es la marca de
                   arcade de toda la vida y se lee sin distinguir un solo color.
     2. ELEVACIÓN  el ítem enfocado SE LEVANTA: escala y sombra. Es la sombra
                   que pidió Rodri, y sale de las mismas perillas que ya usa
                   la piel de los botones.
     3. PULSO      las escuadras respiran, y respiran al MISMO tempo que el
                   mundo (balance.pulso.latido_ms), no a un ritmo inventado.
                   Eso es el "titilando".
     4. VOZ        SFX.ui("mover") al moverse, "confirmar" al elegir,
                   "bloqueado" cuando no se puede.

   ═══ EL DEDO Y EL TECLADO DEJAN EL CURSOR EN EL MISMO LUGAR ═══

   Tocar con el dedo también mueve el cursor. Si cada entrada dejara el foco en
   un lado distinto, el jugador perdería el hilo de dónde estaba.
   ========================================================================== */
(function () {
  "use strict";

  var FOCO = {

    /* ══════════════════════════════════════════════════════════════════════
       grupoFoco(items, opts) — la única puerta.

       items: [{ obj, cb, bloqueada, motivo }]
         obj  el Rectangle/Text/Image que se enfoca (de ahí salen sus medidas)
         cb   qué pasa al confirmar
       opts: { inicial, volver, sinTeclado }

       Devuelve un manejador con mover/activar/destruir. Al cambiar de vista se
       destruye solo: cuelga del shutdown de la escena, igual que el corte de
       música — nueve scene.start() y alcanzaba con que uno se olvidara.
       ══════════════════════════════════════════════════════════════════════ */
    grupoFoco: function (items, opts) {
      var self = this, F = window.PampaFoco;
      opts = opts || {};
      if (!F || !items || !items.length) return null;
      this.cerrarFoco();

      var cajas = items.map(function (it) {
        var o = it.obj;
        if (!o) return { x: 0, y: 0, w: 0, h: 0, oculta: true };
        var w = o.displayWidth || o.width || 0, h = o.displayHeight || o.height || 0;
        var ox = o.originX != null ? o.originX : 0, oy = o.originY != null ? o.originY : 0;
        return {
          x: o.x - w * ox, y: o.y - h * oy, w: w, h: h,
          bloqueada: !!it.bloqueada,
          oculta: (o.visible === false) || w <= 0 || h <= 0
        };
      });

      var P = (this.game.registry.get("balance") || {}).piel || {};
      var CF = P.foco || {};
      var cap = this.add.container(0, 0).setDepth(CF.depth != null ? CF.depth : 950);
      var g = this.add.graphics();
      cap.add(g);

      var G = {
        items: items, cajas: cajas, i: -1, cap: cap, g: g,
        _tw: null, _pulso: null, _teclas: [], vivo: true
      };

      /* ── DIBUJAR LAS ESCUADRAS ── */
      var dibujar = function (c, k) {
        g.clear();
        if (!c) return;
        var m = CF.margen != null ? CF.margen : 6;
        var L = CF.largo != null ? CF.largo : 16;
        var gr = CF.grosor != null ? CF.grosor : 3;
        var x0 = c.x - m, y0 = c.y - m, x1 = c.x + c.w + m, y1 = c.y + c.h + m;
        var col = c.bloqueada ? (CF.color_bloqueada != null ? CF.color_bloqueada : 0xe3503e)
                              : (CF.color != null ? CF.color : 0xffd84d);
        g.lineStyle(gr, col, 1);
        /* las cuatro esquinas, cada una dos trazos */
        [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]].forEach(function (e) {
          g.beginPath(); g.moveTo(e[0] + e[2] * L, e[1]); g.lineTo(e[0], e[1]); g.lineTo(e[0], e[1] + e[3] * L); g.strokePath();
        });
        g.setScale(k == null ? 1 : k);
      };

      /* ── LA ELEVACIÓN: el ítem enfocado se levanta ── */
      var elevar = function (idx, si) {
        var o = items[idx] && items[idx].obj;
        if (!o || !o.setScale) return;
        if (si) {
          if (o.__escBase == null) o.__escBase = o.scale != null ? o.scale : 1;
          self.tweens.add({ targets: o, scale: o.__escBase * (CF.escala != null ? CF.escala : 1.04),
            duration: CF.ms != null ? CF.ms : 90, ease: "Quad.easeOut" });
        } else if (o.__escBase != null) {
          self.tweens.add({ targets: o, scale: o.__escBase, duration: CF.ms != null ? CF.ms : 90 });
        }
      };

      /* ── MOVER: el cursor VIAJA, no se teletransporta ── */
      G.mover = function (idx, callado) {
        if (!G.vivo || idx == null || idx < 0 || !G.cajas[idx] || idx === G.i) return false;
        var antes = G.i;
        if (antes >= 0) elevar(antes, false);
        G.i = idx;
        elevar(idx, true);
        var c = G.cajas[idx];
        if (antes < 0) { dibujar(c); cap.setPosition(0, 0); }
        else {
          /* el viaje: se dibuja en el destino y se lleva el contenedor desde
             el desplazamiento del origen hasta cero */
          var a = G.cajas[antes];
          dibujar(c);
          cap.setPosition(a.x - c.x, a.y - c.y);
          if (G._tw) G._tw.stop();
          G._tw = self.tweens.add({ targets: cap, x: 0, y: 0,
            duration: CF.ms != null ? CF.ms : 90, ease: "Quad.easeOut" });
        }
        if (!callado) { var S = window.PampaSFX; if (S && S.ui) S.ui("mover"); }
        if (opts.alMover) opts.alMover(idx, G.items[idx]);
        return true;
      };

      /* ── ACTIVAR ── */
      G.activar = function () {
        if (!G.vivo || G.i < 0) return false;
        var it = G.items[G.i], S = window.PampaSFX;
        if (!it) return false;
        if (it.bloqueada) {
          /* NO es silencio: suena el no, el cursor tiembla y se dice el motivo.
             Antes, Enter sobre una bloqueada no hacía absolutamente nada y el
             jugador creía que el juego se colgó. */
          if (S && S.ui) S.ui("bloqueado");
          var c = G.cajas[G.i];
          self.tweens.add({ targets: cap, x: { from: -4, to: 0 }, duration: 70, yoyo: true, repeat: 1 });
          if (it.motivo && self.avisar) self.avisar("✗ " + it.motivo);
          return false;
        }
        if (S && S.ui) S.ui("confirmar");
        if (it.cb) it.cb();
        return true;
      };

      /* ── EL PULSO: las escuadras respiran al tempo del mundo ── */
      var latido = ((this.game.registry.get("balance") || {}).pulso || {}).latido_ms || 440;
      G._pulso = this.tweens.add({
        targets: g, alpha: { from: 1, to: CF.pulso_min != null ? CF.pulso_min : 0.45 },
        duration: Math.round(latido / 2), yoyo: true, repeat: -1, ease: "Sine.easeInOut"
      });

      /* ── TECLADO ── */
      if (!opts.sinTeclado && this.input.keyboard) {
        var mapa = { LEFT: "izq", RIGHT: "der", UP: "arriba", DOWN: "abajo",
                     A: "izq", D: "der", W: "arriba", S: "abajo" };
        Object.keys(mapa).forEach(function (t) {
          var h = function () { if (G.vivo) G.mover(F.vecino(G.cajas, G.i, mapa[t])); };
          self.input.keyboard.on("keydown-" + t, h);
          G._teclas.push([t, h]);
        });
        ["ENTER", "SPACE"].forEach(function (t) {
          var h = function () { if (G.vivo) G.activar(); };
          self.input.keyboard.on("keydown-" + t, h);
          G._teclas.push([t, h]);
        });
        if (opts.volver) {
          var hv = function () {
            if (!G.vivo) return;
            var S = window.PampaSFX; if (S && S.ui) S.ui("volver");
            opts.volver();
          };
          this.input.keyboard.on("keydown-ESC", hv);
          G._teclas.push(["ESC", hv]);
        }
      }

      /* ── EL DEDO TAMBIÉN MUEVE EL CURSOR ── */
      items.forEach(function (it, k) {
        var o = it.obj;
        if (!o || !o.setInteractive) return;
        if (!o.input) o.setInteractive({ useHandCursor: true });
        o.on("pointerdown", function () { G.mover(k, true); });
      });

      G.destruir = function () {
        if (!G.vivo) return;
        G.vivo = false;
        if (G._tw) G._tw.stop();
        if (G._pulso) G._pulso.stop();
        G._teclas.forEach(function (p) { self.input.keyboard && self.input.keyboard.off("keydown-" + p[0], p[1]); });
        G._teclas = [];
        items.forEach(function (it) {
          var o = it.obj;
          if (o && o.__escBase != null && o.setScale) { o.setScale(o.__escBase); o.__escBase = null; }
        });
        if (cap && cap.destroy) cap.destroy(true);
      };

      /* el foco arranca PUESTO: un menú que abre sin nadie elegido te obliga a
         un toque de más antes de poder hacer nada */
      G.mover(F.primero(cajas, opts.inicial), true);
      this._foco = G;

      /* se limpia solo al cambiar de vista o de escena */
      if (!this._focoShutdown) {
        this._focoShutdown = true;
        this.events.on("shutdown", function () { self._focoShutdown = false; self.cerrarFoco(); });
      }
      return G;
    },

    cerrarFoco: function () {
      if (this._foco && this._foco.destruir) this._foco.destruir();
      this._foco = null;
    }
  };

  window.PampaFocoUI = FOCO;
})();
