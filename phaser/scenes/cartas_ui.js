/* ============================================================================
   PAMPA STAR · phaser/scenes/cartas_ui.js — LAS CARTAS POR PUESTO (D1)

   La parte de PANTALLA de las cartas. Los números y las reglas viven en
   phaser/logic/cartas.js, que es lógica pura y por eso se pudo simular antes
   de escribir una sola línea de esto.

   ═══ DÓNDE APARECEN ═══

   En el CENTRO de la cruz, que es donde antes vivía la megacosa. No es un
   lugar nuevo: es el mismo, con otra ley. Antes el centro preguntaba "¿tenés
   aguante y nivel?"; ahora pregunta "¿quién sos?".

     menú de DEFENSA   la carta de recuperación del que controlás
     menú de ATAQUE    la carta de ataque

   Un delantero no tiene carta de recuperación, así que defendiendo con él el
   centro queda vacío. Eso no es una falta: es el punto. Si querés la barrida,
   tenés que estar en el defensor.

   ═══ EL MOMENTO ═══

   Cada carta tiene su momento de anime, armado con el Bloque B que ya existe:
   HITSTOP al activarla, el SILENCIO de medio segundo, y el cut-in con la
   figura recortada. El plano lo elige el campo `momento` del dato — carga,
   salto, giro, piernas u horizonte — y son variantes de encuadre sobre la
   misma pose, no arte nuevo.
   ========================================================================== */
(function () {
  "use strict";

  Object.assign(window.PampaMatch.prototype, {

    /* el estado de las cartas vive en la escena y se reinicia por partido
       (lección de P1: lo que no se limpia en init() llega prendido al partido
       siguiente y se queda para el resto de la carrera) */
    cartasEstado: function () {
      var C = window.PampaCartas;
      if (!C) return null;
      if (!this._cartas) this._cartas = C.estadoNuevo();
      return this._cartas;
    },

    /* la mano del que estás controlando AHORA */
    manoActual: function () {
      var C = window.PampaCartas, D = this.game.registry.get("megacosas");
      var st = this.st;
      if (!C || !D || !st) return [];
      var j = st.mios[st.ctrl];
      if (!j) return [];
      return C.manoDe(D, this.cartasEstado(), st.ctrl, j, st.minuto || 0);
    },

    /* la opción de centro para la cruz, o null si este jugador no tiene esa
       clase de carta. Devuelve null también si no hay dato: el menú sigue
       andando sin cartas, no se rompe. */
    centroDeCarta: function (clase, alUsar) {
      var self = this, st = this.st;
      var mano = this.manoActual().filter(function (m) { return m.carta.clase === clase; });
      if (!mano.length) return null;
      /* si hay dos de la misma clase (el delantero tiene dos de ataque), se
         ofrece la que ESTÉ LISTA; si las dos están, la más cara, que es la más
         épica y es la que se quiere ver */
      var listas = mano.filter(function (m) { return m.puede; });
      var m = listas.length
        ? listas.sort(function (a, b) { return (b.carta.aguante || 0) - (a.carta.aguante || 0); })[0]
        : mano.sort(function (a, b) { return (a.falta || 0) - (b.falta || 0); })[0];
      var c = m.carta;
      return {
        texto: "🃏 " + String(c.n).toUpperCase().slice(0, 15),
        sub: m.puede ? (c.sub || "") + " · " + c.aguante + " aguante" : m.motivo,
        bloqueada: !m.puede,
        motivo: m.motivo,
        cb: function () {
          if (!m.puede) return;
          var C = window.PampaCartas;
          /* usar() NO recibe el dato: recibe el estado. manoDe() sí lo recibe
             y por eso se colaba un argumento de más acá — lo cazó el navegador
             en la primera prueba, porque le llegaba el JSON donde esperaba el
             estado y escribía la marca de uso adentro del dato. */
          if (!C.usar(self.cartasEstado(), st.ctrl, c, st.mios[st.ctrl], st.minuto || 0)) return;
          self.momentoDeCarta(c, alUsar);
        }
      };
    },

    /* ══════════════════════════════════════════════════════════════════════
       EL MOMENTO DE LA CARTA.

       Bloque B entero, en el orden que corresponde:
         1. HITSTOP: todo se congela al activarla y arranca de golpe
         2. el cut-in con la figura recortada y el grito
         3. el SILENCIO antes del desenlace (lo pone escenaCine)
       Y recién después corre `alFinal`, que es lo que la carta HACE.

       Si las escenas están apagadas por flag, la carta igual funciona: se
       cuenta con un cartel. Una carta que no hace nada visible es peor que
       una carta fea.
       ══════════════════════════════════════════════════════════════════════ */
    momentoDeCarta: function (carta, alFinal) {
      var self = this, st = this.st;
      var j = st.mios[st.ctrl];
      var FE = window.PampaFeel;
      if (FE) FE.hitstop(this, "fuerte", 3);
      this.SFX && this.SFX.riserGrande && this.SFX.riserGrande(0.9);
      var seguir = function () { if (alFinal) alFinal(); };
      if (!this.hayEscenas()) {
        this.mostrarResolucion((carta.grito || "¡" + carta.n + "!") + "\n" + (carta.sub || ""),
          "#ffd84d", { anim: "tiro", gana: true });
        this.time.delayedCall(420, seguir);
        return;
      }
      this.escenaCine({
        etiqueta: "· " + String(carta.n).toLowerCase() + " ·",
        accion: "remate", escalon: 3, especial: true,
        prota: { j: j, esRival: false, anim: "tiro" },
        pose: carta.pose,
        gana: true, color: 0xffd84d, sfx: "kick",
        titulo: carta.grito || ("¡" + String(carta.n).toUpperCase() + "!"),
        sub: (carta.sub || "") + " · " + (this.textoDelMomento ? this.textoDelMomento(carta.momento) : ""),
        alFinal: seguir
      });
    },

    /* el encuadre de cada momento, dicho con palabras: es lo que se lee abajo
       del grito. Los cinco son los que pidió el brief — carga, salto, giro,
       primer plano de piernas y horizonte. */
    textoDelMomento: function (m) {
      var T = {
        carga: "junta todo y suelta",
        salto: "se despega del piso",
        giro: "gira y la acomoda",
        piernas: "las piernas primero",
        horizonte: "levanta la cabeza y la ve"
      };
      return T[m] || "";
    },

    /* la mano, para el HUD: dos casilleros con el estado de cada carta.
       Se dibuja con FORMA además de color — lista es un casillero lleno con
       el nombre, en recarga es uno vacío con los minutos que faltan. */
    textoDeLaMano: function () {
      var mano = this.manoActual();
      if (!mano.length) return "";
      return mano.map(function (m) {
        var n = String(m.carta.n).replace(/^(EL|LA) /, "");
        return (m.puede ? "◆ " : "◇ ") + n + (m.puede ? "" : " " + Math.ceil(m.falta) + "'");
      }).join("   ");
    }
  });
})();
