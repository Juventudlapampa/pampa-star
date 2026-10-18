/* ============================================================================
   PAMPA STAR · phaser/scenes/escenas_v9.js — LAS ESCENAS QUE FALTABAN (V9)
   Playtest Rodri: "el problema es COBERTURA PARCIAL de animaciones". Algunas
   acciones tenían su escena y otras se resolvían con un renglón de texto —y
   en pantalla partida ese renglón va a mundoLayer, que está APAGADO, así que
   directamente no se veía NADA (el caso del pase y el del bloqueo fallido).
   Regla dura de esta tanda: ninguna acción se resuelve solo con texto.

   Acá viven las escenas nuevas, como mixin de PampaMatch (mismo patrón que
   definicion_ui.js y jugadon_ui.js). Todas usan el lienzo del cine
   (cineLayer/cineBG/cineContent) y cierran por cerrarEscena(alFinal), así que
   heredan el corte seco entre viñetas y el SKIP de un toque.
   ========================================================================== */
(function () {
  "use strict";
  var W = 960, H = 540;
  if (!window.PampaMatch) return;

  Object.assign(window.PampaMatch.prototype, {

    /* ---- apertura común de una escena del cine (idéntica a escenaCine) ---- */
    _abrirEscena(etiqueta) {
      this.estado = "ESCENA";
      this.quitarDuelo(); this.limpiarMenu();
      this.mundoLayer.setVisible(false); this.hudLayer.setVisible(false);
      this.cineLayer.setVisible(true);
      this.uiCam.setZoom(1); this.uiCam.centerOn(W / 2, H / 2);
      this.limpiarContenido();
      this.cineLabel.setText(etiqueta || "");
    },

    /* ---- fondo de cancha con profundidad: tribuna arriba, pasto en fuga ----
       (la tribuna es la ilustrada si está; encima le corre la hinchada viva) */
    fondoDeCancha(conTribuna) {
      var g = this.cineBG, horizonte = Math.round(H * 0.34);
      g.clear();
      /* ARTE · el pasto pintado (cine_arte.js), con la costura de tierra que
         lo une al pie de la ilustración. De noche la ilustración, que está
         pintada de día, se tiñe a la hora del partido: la noche americana */
      var tinte = this.tinteIlustrado ? this.tinteIlustrado() : null;
      var tierra = tinte != null && window.PampaAmbiente ? window.PampaAmbiente.multiplicar("#d1a36f", tinte) : null;
      var pintado = !!(this.fondoCine && this.fondoCine("cancha_alta", { y0: horizonte, tierra: tierra }));
      if (!pintado) {
        g.fillStyle(0x0e2c44, 1); g.fillRect(0, 0, W, horizonte);
        g.fillStyle(0x1f7a3c, 1); g.fillRect(0, horizonte, W, H - horizonte);
        /* franjas de pasto que se ENSANCHAN hacia adelante: da la fuga sin 3D */
        g.fillStyle(0x2e7d32, 1);
        var y = horizonte, alto = 7, k = 0;
        while (y < H) {
          if (k % 2 === 0) g.fillRect(0, y, W, alto);
          y += alto; alto += 6; k++;
        }
        g.fillStyle(0xeafff0, 0.2); g.fillRect(0, horizonte, W, 3);
      }
      /* la tribuna de chapa es la del pueblo: en estadio la pintura ya trae las
         gradas (y si no hubo pintura, vuelve la ilustración: nunca queda vacío) */
      var esPueblo = !pintado || !this.ambienteEsPueblo || this.ambienteEsPueblo();
      if (conTribuna !== false && esPueblo && this.textures.exists("fondo_tribuna")) {
        var t = this.add.image(W / 2, horizonte, "fondo_tribuna").setOrigin(0.5, 1);
        t.setScale(W / t.width);
        if (tinte != null) t.setTint(tinte);
        this.cineContent.add(t);
      }
      /* ACA LLAMABA A this.hinchadaViva(), que NO EXISTE en ningun archivo.
         La guarda `&& this.hinchadaViva` lo volvia un no-op silencioso, asi que
         la tribuna del cine nunca cobraba vida y nadie se enteraba.
         La hinchada que SI existe es crearHinchadaPanel() + latirHinchada(), y
         es del PANEL lateral: escribe en panelLayer y guarda su estado en
         this._hin, que el update hace latir. Reusarla aca chocaria con esa
         instancia, asi que hacerla para el cine es trabajo de arte nuevo, no un
         cable suelto. Se saca la llamada muerta y queda anotado: el fondo del
         cine ya dibuja la tribuna ILUSTRADA (fondo_tribuna) arriba de esta
         linea, que es lo que se ve hoy. */
      return horizonte;
    },

    /* pose lista para el plano: la del héroe con su pinta, la del rival en naranja */
    poseDePlano(poseId, j, esRival) {
      var k = this.poseKey(poseId);
      if (!k) return null;
      /* V10: TU arquero tiene sus poses propias (_celeste); el plano de "te
         rematan" pedía la genérica y tu arquero volaba de naranja */
      if (!esRival && this.poseKey(poseId + "_celeste")) return this.poseKey(poseId + "_celeste");
      if (esRival && this.poseRivalNaranja) return this.poseRivalNaranja(poseId) || k;
      /* B3-D: antes solo teñía la pose 'corriendo' — en el resto salía el
         celeste del PNG aunque hubieras elegido otra camiseta. */
      var kh = (j && j.esVos && this.poseHeroeTenida) ? this.poseHeroeTenida(j, poseId) : null;
      if (kh) return kh;
      /* V10: tus defensores con bloqueo/barrida salían con la camiseta del
         rival (esas dos poses solo existen con ese kit): van vestidos con la nuestra */
      return this.poseDelEquipo ? (this.poseDelEquipo(poseId, j) || k) : k;
    },
    figuraDePlano(poseId, j, esRival, x, y, alto, flip) {
      var k = this.poseDePlano(poseId, j, esRival), sp;
      /* quien corre en la viñeta (el que recibe el pase) lleva su identidad,
         con su número; antes era tu ilustración espejada y se leía "01" */
      if (poseId === "corriendo" && j && !j.esVos && this.identidadDe) {
        var ki = this.identidadDe(j, esRival);
        if (ki && flip && this.textures.exists(ki + "_izq")) { k = ki + "_izq"; flip = false; }
        else if (ki) k = ki;
      }
      if (k) {
        sp = this.add.image(x, y, k);
        /* A3: por alto_rel del manifiesto — las figuras acostadas (el arquero
           volando mide 1905x746) necesitan su propia fraccion o se salen de
           pantalla al escalarlas por altura */
        /* V10: la escala con las proporciones de la pose que SALIÓ (la de tu
           arquero, _celeste, tiene otro alto_rel que la genérica) */
        var idEf = k.indexOf("pose_") === 0 ? k.slice(5) : poseId;
        sp.setScale(this.escalaDePose ? this.escalaDePose(idEf, alto, sp) : (alto / sp.height));
      } else {
        sp = this.add.rectangle(x, y, alto * 0.32, alto, esRival ? 0xff8a50 : 0x4fc3f7);
      }
      if (flip) sp.setFlipX(true);
      this.cineContent.add(sp);
      return sp;
    },
    /* placa con el nombre (forma + palabra, nunca solo el color) */
    placaDePlano(x, y, j, esRival) {
      var t = this.add.text(x, y, (j && j.esVos ? "VOS" : ((j && j.nombre) || "RIVAL").toUpperCase().slice(0, 12)),
        { fontFamily: window.PF.display, fontSize: "13px", color: "#0a1f13", backgroundColor: esRival ? "#FF8A50" : "#4FC3F7", padding: { x: 8, y: 3 } }).setOrigin(0.5);
      this.cineContent.add(t);
      return t;
    },

    /* ======================================================================
       §9 · LA HINCHADA VIVA (en el panel de juego, todo el partido)
       Tres estados, uno solo por vez: RESPIRA (siempre, 2px), SE AGITA (la
       jugada se pone caliente, 6px y más rápido) y ESTALLA (gol propio: 16px
       y saltan; gol en contra: se hunden y se quedan quietas).
       ====================================================================== */
    /* ══════════════════════════════════════════════════════════════════
       A4 · LA TRIBUNA DEJA DE SER TODA LA MISMA PERSONA.

       Eran 26 siluetas idénticas dibujadas con Graphics: un círculo y un
       rectángulo, todas del mismo alto, cambiando solo el tono. Ahora son las
       cinco siluetas ilustradas —parado, mate, bombo, bandera, bebé a upa— y
       la MEZCLA varía con la división, que ya estaba modulada por la escalera:
       en la Primera B hay gente parada y algún mate; en el Mundial aparecen el
       bombo y las banderas.

       Los pesos están en poses_manifest.hinchada.mezcla, uno por división.
       Si las imágenes no cargaron, se vuelve solo al dibujo de antes: la
       tribuna nunca queda vacía.
       ══════════════════════════════════════════════════════════════════ */
    crearHinchadaPanel() {
      var V = (this.BAL.vista || {}), cfg = V.hinchada || {};
      if (cfg.activa === false) { this._hin = null; return; }
      var n = cfg.siluetas || 26, y0 = cfg.y || 108, tonos = [0x0a1f13, 0x143224, 0x1d2f3f, 0x24374a];
      var g = this.add.graphics();
      this.panelLayer.add(g);
      this._hin = { g: g, n: n, y0: y0, t: 0, amp: cfg.amp_base != null ? cfg.amp_base : 2, ampObj: cfg.amp_base != null ? cfg.amp_base : 2, hundida: 0, tonos: tonos, vel: 1, imgs: [] };

      /* la mezcla de esta división */
      var man = this.game.registry.get("poses");
      var H = man && man.hinchada;
      var divId = (this._division && this._division.id) || (this._masterPartido && this._masterPartido.division) || "primera_b";
      var pesos = (H && H.mezcla && (H.mezcla[divId] || H.mezcla.primera_b)) || null;
      var bolsa = [];
      if (H && pesos) {
        H.siluetas.forEach(function (s) {
          var w = pesos[s.id] || 0;
          for (var i = 0; i < w; i++) bolsa.push(s.id);
        });
      }
      this._hin.gente = [];
      for (var k = 0; k < n; k++) {
        var elegida = bolsa.length ? bolsa[(k * 7 + (k % 5) * 3) % bolsa.length] : null;
        var tex = elegida ? ("pose_" + elegida) : null;
        var p = {
          x: 14 + k * (932 / n) + (k % 2) * 8,
          fase: (k % 7) * 0.9 + (k % 3) * 0.4,
          tono: tonos[k % tonos.length],
          alto: 9 + (k % 3) * 2,
          sil: elegida
        };
        /* la silueta ilustrada, en negro, si la textura está */
        if (tex && this.textures.exists(tex)) {
          var im = this.add.image(p.x, y0, tex).setOrigin(0.5, 1);
          im.setScale((cfg.alto_silueta || 26) / im.height);
          im.setTint(0x000000).setAlpha(0.92);
          this.panelLayer.add(im);
          this._hin.imgs.push({ im: im, p: p });
        }
        this._hin.gente.push(p);
      }
      this._hin.conImagenes = this._hin.imgs.length > 0;
    },
    /* la llama updatePanelEscena, una vez por frame */
    latirHinchada(delta, caliente) {
      var h = this._hin;
      if (!h || !h.g) return;
      var cfg = (this.BAL.vista || {}).hinchada || {};
      h.t += delta * 0.001 * h.vel;
      /* objetivo de amplitud: respira / se agita — el estallido lo pone hinchadaEstalla */
      if (!h.estallando) {
        h.ampObj = caliente ? (cfg.amp_caliente || 6) : (cfg.amp_base != null ? cfg.amp_base : 2);
        h.vel = caliente ? 2.2 : 1;
      }
      h.amp += (h.ampObj - h.amp) * Math.min(1, delta * 0.006);      // se acomoda suave
      var g = h.g;
      g.clear();
      /* A4 · con las siluetas ilustradas, lo que salta son las IMÁGENES y el
         Graphics no dibuja nada. Sin ellas, el dibujo de antes sigue en pie:
         la tribuna nunca queda vacía. */
      if (h.conImagenes) {
        for (var i = 0; i < h.imgs.length; i++) {
          var o = h.imgs[i];
          var s2 = Math.abs(Math.sin(h.t * 3 + o.p.fase)) * h.amp;
          o.im.y = h.y0 - s2 + h.hundida;
        }
        return;
      }
      for (var k = 0; k < h.gente.length; k++) {
        var p = h.gente[k];
        var salto = Math.abs(Math.sin(h.t * 3 + p.fase)) * h.amp;
        var y = h.y0 - salto + h.hundida;
        g.fillStyle(p.tono, 0.9);
        g.fillRect(p.x - 3, y, 6, p.alto);                            // el cuerpo
        g.fillCircle(p.x, y - 2, 3);                                  // la cabeza
      }
    },
    /* signo 1 = gol propio (explotan) · -1 = gol en contra (se hunden y callan) */
    hinchadaEstalla(signo) {
      var h = this._hin, self = this;
      if (!h) return;
      var cfg = (this.BAL.vista || {}).hinchada || {};
      h.estallando = true;
      if (signo < 0) { h.ampObj = 0; h.vel = 0.4; h.hundida = cfg.hundida || 5; }
      else { h.ampObj = cfg.amp_gol || 16; h.vel = 3.4; h.hundida = 0; }
      this.time.delayedCall(this.msV(cfg.estallido_ms || 1800), function () {
        if (!self._hin) return;
        self._hin.estallando = false; self._hin.hundida = 0; self._hin.vel = 1;
      });
    },

    /* ======================================================================
       §8+§9 · TODO GOL PROPIO PASA POR ACÁ. Antes la fiesta dependía del
       camino: el gol del cine (el del megatiro, el mejor filmado) no llamaba
       ni a la tribuna ni a efectoGol, y después de un gol el relator no volvía
       a hablar nunca — "saque" sonaba una sola vez, en el minuto 0.
       ====================================================================== */
    /* `quien` es opcional: por defecto la metio el que controlas, que es lo
       que pasa en las cuatro vias de gol. La COMBINADA la define un compañero y
       ahi el que llame pasa el suyo. */
    /* ══════════════════════════════════════════════════════════════════
       LA PARTITURA DEL GOL (oct 2026, "está desincronizado cuándo festeja
       goles"). golPropio hacía DOS cosas en el mismo instante: anotar el gol
       (la verdad) y festejarlo (lo que se ve y se oye). Y la mitad de los
       caminos lo llamaba cuando el juego DECIDE el remate, antes de que la
       escena lo muestre. Medido con un oído de prueba en un cabezazo:
         0 ms     se decide → hitstop y destello encima de la escena que entra
         683 ms   la red y la fanfarria… con el jugador todavía entrando
         1217 ms  la revelación: la red y la fanfarria OTRA VEZ
         1917 ms  al cerrar la escena: la red y la fanfarria por TERCERA vez
       Te enterabas del gol por el sonido, antes de verlo, y tres veces.

       Ahora son dos piezas:
         anotarGolPropio()    la verdad, UNA vez, cuando se decide
         festejarGolPropio()  la fiesta, UNA vez, cuando se VE la pelota entrar
       y golPropio() = las dos juntas, para los caminos donde decidir y ver
       son el mismo instante (el desenlace del cine).
       La red suena en el impacto; la fanfarria y la hinchada, al estallar
       después del silencio. Nadie más toca la red ni la fanfarria de un gol.
       ══════════════════════════════════════════════════════════════════ */
    golPropio(quien, opts) {
      this.anotarGolPropio(quien);
      return this.festejarGolPropio(opts);
    },
    anotarGolPropio(quien) {
      window.PampaPartido.golMio(this.st, quien);
    },
    /* opts.alEstallar: lo que la escena quiera sumar a la explosión (el
       cartel, el festejo ilustrado). Devuelve los ms hasta la explosión, para
       que la escena se quede abierta lo suficiente para verla. */
    festejarGolPropio(opts) {
      var self = this, st = this.st;
      opts = opts || {};
      /* el saque del arquero, cuando el partido vuelve a correr: antes iba a
         un tiempo fijo y, si la escena seguía abierta, el plano profundo se
         armaba debajo de ella sin que nadie lo viera */
      var alSaque = function () {
        var n = 0;
        var probar = function () {
          if (self.estado !== "LIBRE" && n++ < 30) { self.time.delayedCall(200, probar); return; }
          self.relatar("saque_gol");
          /* B2 · DISPARADOR 4 · EL SAQUE DEL ARQUERO. Despues del gol la pelota
             vuelve al centro desde el fondo: es el otro momento en que la
             cancha se mira a lo largo. */
          self.quizasProfundo && self.quizasProfundo("saque", {}, { rival: false });
        };
        self.time.delayedCall(self.msV(1600), probar);
      };
      /* EL IMPACTO: la red, en el mismo cuadro en que la pelota la toca */
      this.SFX && this.SFX.net && this.SFX.net();
      var FE = window.PampaFeel;
      if (!FE) {
        if (this.efectoGol) this.efectoGol(false);
        if (this.cineLayer && this.cineLayer.visible && this.tribunaSaltando) this.tribunaSaltando();
        if (this.hinchadaEstalla) this.hinchadaEstalla(1);
        if (opts.alEstallar) opts.alEstallar();
        alSaque();
        return 0;
      }
      /* ── B5 · EL GOL COMO PICO ────────────────────────────────────────
         Era el momento más importante del juego y compartía tratamiento con
         todo lo demás: efecto, tribuna y relator disparaban los tres a la vez,
         en el mismo cuadro. Ahora es una secuencia encadenada:

           hitstop largo (el instante se congela)
             → UN cuadro de destello con la silueta recortada, como el corte de
               impacto del anime
             → la red se hunde y vuelve, y la cámara se queda quieta
             → SILENCIO (feel.silencio_ms) — y esto es la mitad del efecto
             → y recién ahí entra TODO junto: cartel, tribuna, sonido, festejo.

         B4 (segunda acción): la tribuna no salta en el mismo cuadro que el
         efecto de cámara, entra unos milisegundos después. */
      var j = st.mios[st.ctrl];
      var sil = (this.texturaEscena && j) ? this.texturaEscena(j, false, "festejo", 0) : null;
      /* LA SILUETA DEL CUADRO DE IMPACTO ENTRA ENTERA. La escala 2,4 era del
         muñequito de 34x50: con la ilustración del festejo (853 px de alto)
         daba 2.000 px y en pantalla quedaba un pedazo de short y camiseta en
         negro (visto en la captura del cabezazo, oct 2026). Es la misma familia
         que el arquero de 2.923 px de A5. Se escala por ALTO de pantalla. */
      var srcSil = sil && this.textures.exists(sil) ? this.textures.get(sil).getSourceImage() : null;
      var escSil = srcSil && srcSil.height ? Math.min(2.4, 430 / srcSil.height) : 2.4;
      return FE.golPico(this, {
        silueta: sil,
        escala: escSil,
        alSilencio: function () {
          /* durante el silencio solo se mueve la red: nada de música ni cartel */
          if (self.musicaDuck) self.musicaDuck(((self.BAL.feel && self.BAL.feel.silencio_ms) || 500) + 200);
          if (self.redSprite) FE.redSacudida(self, self.redSprite);
        },
        alEstallar: function () {
          /* LA EXPLOSIÓN: fanfarria + hinchada (efectoGol ya no toca la red) */
          if (self.efectoGol) self.efectoGol(false);
          if (opts.alEstallar) opts.alEstallar();
          /* B4: lo blando llega después que el cuerpo */
          FE.segunda(self, function () {
            if (self.cineLayer && self.cineLayer.visible && self.tribunaSaltando) self.tribunaSaltando();
            if (self.hinchadaEstalla) self.hinchadaEstalla(1);
          });
          alSaque();
        }
      });
    },
    /* C4 · se borró golEnContraDeLosNuestros(): nadie la llamaba y lo único
       que hacía —hundir la tribuna cuando convierte el rival— ya lo hace el
       gol rival de verdad, más abajo en este mismo archivo. Era un duplicado
       inalcanzable, no un hueco. */

    /* ======================================================================
       §7 · POR QUÉ SALIÓ ASÍ — la línea corta bajo el desenlace.
       La lógica pura ya devuelve el término que decidió (motivo); acá solo se
       traduce a cancha. Nunca inventa: si no hay motivo, no dice nada.
       ====================================================================== */
    porQueDuelo(res) {
      if (!res || !res.motivo) return "";
      var leido = res.matriz === "leyeron" || res.matriz === "teEngano";
      var M = {
        ajustado: "por centímetros",
        lectura: leido ? "te leyeron la jugada" : "lo leíste bien",
        cansado: "venías cansado",
        entero: "llegaste entero",
        envion: "con el envión a favor",
        megacosa: "el rival sacó algo de arriba",
        rival_fundido: "los tenés fundidos",
        parejo: ""
      };
      return M[res.motivo] || "";
    },
    /* el sub de la escena: lo que pasó + por qué, sin repetirse ni quedar vacío */
    subConPorQue(base, res) {
      var p = this.porQueDuelo(res);
      if (!p) return base || "";
      if (!base) return p;
      return base + " · " + p;
    },
    porQuePase(res, cortador, alVacio, win) {
      var m = res && res.motivo;
      if (!win) {
        if (m === "tapado" || cortador) return "estaba parado en la línea de pase · pelota rival";
        if (m === "largo") return "la puso demasiado larga · pelota rival";
        if (m === "ajustado") return "por centímetros · pelota rival";
        return "no le llegó a nadie · pelota rival";
      }
      if (cortador) return m === "ajustado" ? "se la tiró y la pasó raspando" : "se tiró y no llegó";
      if (alVacio) return "la dejó en el camino y pica al espacio";
      return m === "largo" ? "pase largo, justo al pie" : "toque y a seguir";
    },

    /* ======================================================================
       C1 · TE REMATAN — como en el original, sin pantalla de gestión defensiva.
       El rival define, tus defensores saltan o se tiran, el arquero vuela o
       no llega. Todo resuelto por posición, cansancio, nivel del arquero y
       quién está en el camino (logic/definicion.js → remateRivalAuto), con
       intriga hasta el final: freeze y medio segundo de silencio antes de
       saber. Cero botones de gestión (plantarse, achicar, aguantar). Desde
       L04b, con el envión lleno, antes del remate va UNA pregunta con dos
       botones (preguntarSuperDefensa, más abajo: SÚPER DEFENSA o guardar
       el envión); sin el envión lleno no hay ninguna y lo demás es igual.
       ====================================================================== */
    /* L04b · superDef: lo que se contestó en preguntarSuperDefensa (true =
       SÚPER DEFENSA, false = guardar el envión). Sin contestar (undefined) y
       con el envión lleno, primero se pregunta. */
    escenaRemateRival(tiradorIdx, superDef) {
      var self = this, st = this.st, P = window.PampaPartido, D = window.PampaDefinicion;
      var feel = this.BAL.feel || {}, EP = this.BAL.escena_pase || {};
      var EV = this.BAL.envion || {};
      if (superDef === undefined && EV.super_pregunta !== false && this.preguntarSuperDefensa && P.envionLleno(st)) {
        this.preguntarSuperDefensa(tiradorIdx);
        return;
      }
      var tirador = st.rivales[tiradorIdx != null ? tiradorIdx : st.portadorRival] || st.rivales[0];
      var arqM = st.mios.find(function (x) { return x.pos === "ARQ"; });
      var aguanteMax = this.BAL.aguante.max;

      /* ---- LA VERDAD, UNA SOLA VEZ (antes de dibujar nada) ---- */
      var lectura = D.remateRivalAuto({
        tirador: { x: tirador.x, y: tirador.y },
        arco: { x: 0, y: st.H / 2 },                       // mi arco vive en x=0 de la simulación
        defensores: st.mios.filter(function (j) { return j.pos !== "ARQ"; })
          .map(function (j) { return { x: j.x, y: j.y, nombre: j.nombre, esVos: j.esVos, aguante: j.aguante }; }),
        /* idem: el nivel del arquero se deriva, no sale de un campo inexistente */
        arquero: { nivel: window.PampaPartido.nivelArqueroDe(arqM && arqM.stats), aguante: arqM ? arqM.aguante : aguanteMax },
        aguanteMax: aguanteMax,
        cfg: this.BAL.definicion || {}
      });
      /* L04b: la SÚPER DEFENSA gasta el envión y el remate no entra; pone el
         cuerpo quien juega (logic/definicion.conSuperDefensa) */
      if (superDef === true && P.gastarEnvionSuper(st)) {
        lectura = D.conSuperDefensa(lectura, st.mios.find(function (x) { return x.esVos; }) || null);
      }
      var res = lectura.bloqueado
        ? { golRival: false, bloqueado: true }
        : P.resolverAtajada(st, "atajar", null, lectura.bonusArquero);
      if (lectura.bloqueado) {
        P.saltoReloj(st);
        st.posesion = "mia";
        var idxDef = st.mios.findIndex(function (x) { return x.pos === "DEF"; });
        st.ctrl = idxDef >= 0 ? idxDef : st.ctrl;
        st.modo = "juego"; st.cooldown = st.bal.ritmo.cooldown_encuentro_ms;
      }

      /* ---- EL TEATRO ---- */
      this._abrirEscena("· te rematan ·");
      var horizonte = this.fondoDeCancha(true);
      var tEntrada = this.msV(EP.entrada_ms || 340);
      var silencio = feel.silencio_ms || 500;
      var tHold = this.msV(EP.hold_ms || 900);

      /* el rematador rival, grande, pegándole */
      var rem = this.figuraDePlano("remate", tirador, true, 300, Math.round(H * 0.66), 300, false);
      /* las placas van sobre la cabeza: a los pies quedaban debajo del cartel
         ("¡ATAJADÓN!" en y 452) y de su bajada (y 492), que las pisaban */
      this.placaDePlano(300, rem.y - rem.displayHeight / 2 - 16, tirador, true);
      var bola = this.add.sprite(360, H * 0.66 + 70, "ball").setScale(2.4);
      this.cineContent.add(bola);
      this.tweens.add({ targets: rem, x: 260, duration: tEntrada, ease: "Quad.easeOut" });

      /* MIS defensores en el camino: saltan o se tiran (los reales, con nombre) */
      var enLinea = Math.min(3, lectura.defensoresEnLinea);
      var figs = [];
      for (var k = 0; k < enLinea; k++) {
        var jd = lectura.defensorMasCerca && k === 0 ? lectura.defensorMasCerca : null;
        var f = this.figuraDePlano(k === 0 ? "bloqueo" : "barrida", jd, false, 560 + k * 90, Math.round(H * 0.6) - k * 20, 230 - k * 22, true);
        figs.push(f);
        if (jd) this.placaDePlano(560, f.y - f.displayHeight / 2 - 16, jd, false);
      }
      /* el arquero, al fondo. 17/oct: con la estirada larga de perfil, la
         misma del salto lento de tu remate (planoDesenlace) */
      var arqSpr = this.figuraDePlano("arquero_estirada_celeste", arqM, false, 840, Math.round(H * 0.46), 190, true);

      var esc = { revelado: false, cerrado: false };
      /* la pelota sale disparada hacia el arco */
      this.time.delayedCall(tEntrada, function () {
        self.uiCam.flash(70, 255, 200, 120);
        self.SFX && self.SFX.kick && self.SFX.kick();
        self.lineasVelocidad(360, H * 0.6, 1.1, 0xff8a50);
        var destinoX = lectura.bloqueado ? 560 : 830;
        self.tweens.add({ targets: bola, x: destinoX, y: H * 0.5, angle: 900, duration: self.msV(520), ease: "Sine.easeIn" });
        figs.forEach(function (f, i) {
          self.tweens.add({ targets: f, y: "-=" + (30 + i * 8), angle: -14, duration: 260, yoyo: true });   // saltan
        });
      });
      /* LA CÁMARA VIVA (match.js): se acerca mientras le pega y viaja */
      if (this.dollyCine) this.dollyCine(tEntrada + this.msV(520), 1.2);
      /* FREEZE + silencio: no sabés si la frenan */
      this.time.delayedCall(tEntrada + this.msV(520), function () {
        if (self.pararDolly) self.pararDolly();
        self.musicaDuck(silencio);
        self.cineFX.clear();
        self.tweens.killTweensOf(bola);
      });

      var revelar = function () {
        if (esc.revelado) return; esc.revelado = true;
        if (self.golpeDeCamara) self.golpeDeCamara(res.golRival ? 1.4 : 1);
        var quien = lectura.defensorMasCerca;
        if (lectura.bloqueado) {
          self.uiCam.flash(60, 255, 255, 255);
          self.SFX && self.SFX.choque && self.SFX.choque();
          if (figs[0] && figs[0].active) self.tweens.add({ targets: figs[0], scale: figs[0].scale * 1.14, duration: 240 });
          /* revisión L04b: decía "te tiraste", y la figura de quien juega es
             la pose "bloqueo" (de pie, brazos cruzados: el cuerpo en la
             línea; l04b_4_super_defensa_revela.png). El cartel dice lo que
             se ve, como el bloqueo común de abajo. */
          if (lectura.superDefensa) self.punch("🌟 ¡SÚPER DEFENSA!", "pusiste el cuerpo con todo el envión · pelota nuestra", 0xffd84d);
          else self.punch("¡LA BLOQUEÓ" + (quien ? " " + String(quien.esVos ? "VOS" : quien.nombre).toUpperCase() : "") + "!",
            "puso el cuerpo en la línea · pelota nuestra", 0x7ee08a);
          if (self.tribunaSaltando) self.tribunaSaltando();
        } else if (!res.golRival) {
          self.uiCam.flash(60, 255, 255, 255);
          self.SFX && self.SFX.gloves && self.SFX.gloves();
          /* OJOS (tanda 1.0): acá tu arquero pasaba a arquero_ataja_celeste,
             de rodillas con los ojos cerrados. Ahora el despeje (ojos
             abiertos, los puños contra la pelota), pedido con el id completo
             porque poseDePlano("arquero_despeje") no existe sin sufijo. Esa
             pose trae la pelota PINTADA en el puño: la del juego se esconde,
             o se ven dos. */
          var conDespeje = false;
          if (arqSpr && arqSpr.active) {
            var kAt = self.poseDePlano("arquero_despeje_celeste", arqM, false);
            if (kAt && arqSpr.setTexture) { arqSpr.setTexture(kAt); arqSpr.setScale(210 / arqSpr.height); conDespeje = true; }
            self.tweens.add({ targets: arqSpr, x: 800, scale: arqSpr.scale * 1.1, duration: 260 });
          }
          if (bola.active) { bola.setPosition(806, H * 0.5); if (conDespeje) bola.setVisible(false); }
          self.punch("¡ATAJADÓN!", self.porQueRemateRival(lectura, res), 0x5bb8e8);
          if (self.tribunaSaltando) self.tribunaSaltando();
          self.SFX && self.SFX.festejo && self.SFX.festejo(900);
        } else {
          self.uiCam.shake(280, 0.01);
          self.SFX && self.SFX.net && self.SFX.net();
          if (bola.active) self.tweens.add({ targets: bola, x: 880, y: H * 0.42, duration: 220 });
          /* 17/oct, pedido de Rodri: tu arquero quedaba colgado en el aire.
             Corte seco a él tirado en el piso, mirando la pelota adentro */
          var kCaido = self.poseDePlano("arquero_caido_celeste", arqM, false);
          if (kCaido && arqSpr && arqSpr.active && arqSpr.setTexture) {
            self.tweens.killTweensOf(arqSpr);
            arqSpr.setTexture(kCaido).setFlipX(false).setAngle(0).setOrigin(0.5, 1).setPosition(850, Math.round(H * 0.65));
            arqSpr.setScale(self.escalaDePose("arquero_caido_celeste", 160, arqSpr));
          }
          self.punch("GOL DE " + String(self.nombreRival || "ELLOS").toUpperCase(), self.porQueRemateRival(lectura, res), 0xe3503e);
          if (self.hinchadaEstalla) self.hinchadaEstalla(-1);
          if (self.efectoGol) self.efectoGol(true);
        }
      };
      var cerrarYa = function () {
        if (esc.cerrado) return; esc.cerrado = true;
        self._escSkip = null;
        self.cerrarEscena(function () {
          self.relatar(lectura.bloqueado ? "quite_win" : (res.golRival ? "gol_rival" : "arquero_mio"));
        });
      };
      this._escSkip = function () { if (!esc.revelado) revelar(); else cerrarYa(); };
      var tRevela = tEntrada + this.msV(520) + silencio;
      this.time.delayedCall(tRevela, revelar);
      this.time.delayedCall(tRevela + tHold, cerrarYa);
    },
    /* ======================================================================
       L04b · LA SÚPER DEFENSA TIENE PUERTA.

       El GDD (5.4): el envión lleno se gasta en potenciar al equipo o en una
       Súper Defensa que bloquea un remate de forma segura. La mitad
       defensiva no se podía usar jugando: su consumo (gastarEnvionSuper) y
       su botón vivían en defBotonesDef(), la pantalla de gestión defensiva
       que la V9 C1 sacó y que no tiene llamador. Con el envión lleno y
       defendiendo, el 🌟 del HUD no aparecía (es POTENCIAR, solo con la
       pelota): el mérito ganado se quedaba quieto.

       La puerta está donde el GDD la pone: cuando el rival te va a rematar.
       Un plano quieto con el rematador (la pose no se anima) y una pregunta,
       sin reloj, porque el envión es mérito y no reflejo:
         🌟 SÚPER DEFENSA  → gasta el envión, el remate no entra, pelota tuya
         ◀ GUARDAR EL ENVIÓN → el remate de siempre, que puede entrar
       No es la pantalla de gestión que se sacó: no hay plantarse, achicar
       ni aguantar, es una sola carta y solo cuando la tenés. Los botones
       responden balance.envion.super_espera_ms después de abrirse (ESPACIO
       viene apretado del partido y en el cursor confirma). El estado es
       SUPERDEF: espera a quien juega, como un menú (el vigía de SEGUIR
       IGUAL no lo cuenta como trabado, index.html), y un toque fuera de los
       botones no decide nada.
       ====================================================================== */
    preguntarSuperDefensa(tiradorIdx) {
      var self = this, st = this.st, EV = this.BAL.envion || {};
      var tirador = st.rivales[tiradorIdx != null ? tiradorIdx : st.portadorRival] || st.rivales[0];
      var tap = ((this.BAL.legibilidad || {}).tap_min) || 61;
      this._abrirEscena("· te van a rematar ·");
      this.estado = "SUPERDEF";
      this._escSkip = null;
      /* los dos de la tribuna se callan: sus globos caían sobre la pregunta */
      if (window.PampaTribunaUI && window.PampaTribunaUI.callar) window.PampaTribunaUI.callar(this);
      this.fondoDeCancha(true);
      /* el rematador, donde lo pone el plano del remate: el corte al plano
         siguiente es seco y la figura no salta */
      this.figuraDePlano("remate", tirador, true, 300, Math.round(H * 0.66), 300, false);
      this.placaDePlano(300, H * 0.92, tirador, true);
      /* la pregunta, a la derecha (el rematador ocupa de x≈150 a 450) */
      var X = 700, ANCHO = 400;
      var nom = String((tirador && tirador.nombre) || "el rival").toUpperCase();
      var t1 = this.add.text(X, 126, "⚠ ¡" + nom + " TE VA A REMATAR!", {
        fontFamily: window.PF.display, fontSize: "16px", color: "#ffd84d", align: "center",
        backgroundColor: "#0a1f13dd", padding: { x: 10, y: 6 }, wordWrap: { width: ANCHO }
      }).setOrigin(0.5);
      var t2 = this.add.text(X, 174, "🌟 Tenés el ENVIÓN lleno: ¿lo usás?", {
        fontFamily: window.PF.texto, fontSize: "15px", color: "#f6efdc",
        backgroundColor: "#0a1f13dd", padding: { x: 8, y: 4 }
      }).setOrigin(0.5);
      this.cineContent.add(t1); this.cineContent.add(t2);
      var decidido = false;
      var decidir = function (usar) {
        if (decidido) return;
        decidido = true;
        if (self.cerrarFoco) self.cerrarFoco();
        self.escenaRemateRival(tiradorIdx, !!usar);
      };
      var OPS = [
        { y: 262, color: 0xffd84d, t: "🌟 SÚPER DEFENSA", s: "gastás el envión · este remate no entra", usar: true },
        /* revisión L04b: decía "atajan tu defensa y tu arquero", una promesa
           que el remate común no cumple (56 goles en 200, y a veces no hay
           nadie tuyo en la línea). Es texto de decisión: dice lo que pasa. */
        { y: 350, color: 0xf6efdc, t: "◀ GUARDAR EL ENVIÓN", s: "el envión sigue lleno · el remate puede entrar", usar: false }
      ];
      var poner = function () {
        if (decidido || self.estado !== "SUPERDEF") return;
        var items = [];
        OPS.forEach(function (op) {
          var r = self.add.rectangle(X, op.y, ANCHO, tap, op.color, 0.97).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
          var tt = self.add.text(X, op.y - 11, op.t, { fontFamily: window.PF.display, fontSize: "15px", color: "#0a1f13" }).setOrigin(0.5);
          var ts = self.add.text(X, op.y + 15, op.s, { fontFamily: window.PF.texto, fontSize: "13px", color: "#365a41" }).setOrigin(0.5);
          self.cineContent.add(r); self.cineContent.add(tt); self.cineContent.add(ts);
          r.on("pointerdown", function (p, xx, yy, ev) {
            ev && ev.stopPropagation && ev.stopPropagation();
            self._uiTocado = self.time.now;
            decidir(op.usar);
          });
          items.push({ obj: r, caja: { x: X - ANCHO / 2, y: op.y - tap / 2, w: ANCHO, h: tap }, cb: function () { decidir(op.usar); } });
        });
        /* el cursor arranca en la SÚPER DEFENSA: es la pregunta */
        if (self.grupoFoco) self.grupoFoco(items, { inicial: 0 });
      };
      var espera = EV.super_espera_ms != null ? EV.super_espera_ms : 450;
      if (espera > 0) this.time.delayedCall(espera, poner);
      else poner();
    },
    /* la línea corta de por qué (C1 usa el motivo de la lógica pura) */
    porQueRemateRival(lectura, res) {
      var M = {
        bloqueo: "puso el cuerpo en la línea",
        solo_ante_el_arquero: "quedó solo contra tu arquero",
        de_lejos: "le pegó de lejos y tu arquero la vio venir",
        arquero_fundido: "tu arquero venía fundido",
        mano_a_mano: "mano a mano, cara a cara"
      };
      var base = M[lectura.motivo] || "";
      var extra = lectura.defensoresEnLinea
        ? " · " + lectura.defensoresEnLinea + (lectura.defensoresEnLinea === 1 ? " tuyo en el camino" : " tuyos en el camino")
        : " · no había nadie en el camino";
      return base + extra;
    },

    /* ======================================================================
       §2 · EL PASE — se acomoda, le pega, la pelota VIAJA, y si hay alguien
       en la línea el rival se TIRA a cortarla: freeze, silencio, desenlace.
       cfg = { alVacio, cortador, receptor, pateador, win, titulo, sub, alFinal }
       ====================================================================== */
    escenaPase(cfg) {
      var self = this, feel = this.BAL.feel || {}, EP = this.BAL.escena_pase || {};
      var hayCorte = !!cfg.cortador;
      this._abrirEscena(cfg.alVacio ? "· al vacío ·" : "· el pase ·");
      var horizonte = this.fondoDeCancha(true);

      var tEntrada = this.msV(EP.entrada_ms || 340);
      var tViaje = this.msV((EP.viaje_ms || 620) * (cfg.alVacio ? 1.25 : 1));
      var silencio = feel.silencio_ms || 500;
      var tHold = this.msV(EP.hold_ms || 900);

      /* el que la toca: entra desde la izquierda con la pelota al pie */
      var yPie = Math.round(H * 0.66);
      var pat = this.figuraDePlano("pared", cfg.pateador, false, 130, yPie, 300, false);
      this.placaDePlano(180, H * 0.9, cfg.pateador, false);
      var bola = this.add.sprite(180, yPie + 96, "ball").setScale(2.4);
      this.cineContent.add(bola);
      this.tweens.add({ targets: [pat], x: 210, duration: tEntrada, ease: "Quad.easeOut" });
      this.tweens.add({ targets: [bola], x: 258, duration: tEntrada, ease: "Quad.easeOut" });

      /* el que la espera: más chico y más arriba = más lejos */
      var rec = this.figuraDePlano("corriendo", cfg.receptor, false, 806, Math.round(H * 0.5), 190, true);
      if (cfg.receptor) this.placaDePlano(806, H * 0.7, cfg.receptor, false);
      if (cfg.alVacio) this.tweens.add({ targets: rec, x: 750, y: H * 0.56, duration: tEntrada + tViaje, ease: "Sine.easeIn" });

      var destino = { x: cfg.alVacio ? 750 : 790, y: (cfg.alVacio ? H * 0.56 : H * 0.5) + 78 };
      var cruce = { x: 500, y: Math.round((yPie + 96 + destino.y) / 2) };
      var cort = null;
      var esc = { revelado: false, cerrado: false };

      /* --- LA PEGADA: flash, líneas y la pelota sale --- */
      this.time.delayedCall(tEntrada, function () {
        if (!bola.active) return;
        self.uiCam.flash(70, 255, 255, 220);
        self.lineasVelocidad(258, yPie, 0.9, 0xffd84d);
        self.SFX && self.SFX.kick && self.SFX.kick();
        var t1 = hayCorte ? Math.round(tViaje * 0.55) : tViaje;
        self.tweens.add({ targets: bola, x: hayCorte ? cruce.x : destino.x, y: hayCorte ? cruce.y : destino.y, duration: t1, ease: hayCorte ? "Sine.easeIn" : "Sine.easeInOut" });
        self.tweens.add({ targets: bola, angle: 720, duration: t1 });
      });

      /* LA CÁMARA VIVA: se acerca durante la pegada y el viaje */
      if (this.dollyCine) this.dollyCine(tEntrada + tViaje, 1);
      /* --- EL QUE SE TIRA: entra al cruce y todo se CLAVA (freeze + silencio) --- */
      if (hayCorte) {
        this.time.delayedCall(tEntrada + Math.round(tViaje * 0.18), function () {
          cort = self.figuraDePlano("barrida", cfg.cortador, true, W + 120, cruce.y - 40, 250, true);
          self.placaDePlano(W - 150, H * 0.9, cfg.cortador, true);
          self.tweens.add({ targets: cort, x: cruce.x + 96, angle: -18, duration: Math.round(tViaje * 0.42), ease: "Quad.easeIn" });
          self.SFX && self.SFX.whoosh && self.SFX.whoosh();
        });
        this.time.delayedCall(tEntrada + Math.round(tViaje * 0.55), function () {
          if (self.pararDolly) self.pararDolly();
          self.musicaDuck(silencio);              // el silencio antes de saber
          self.cineFX.clear();
          self.tweens.killTweensOf(bola);
          if (cort) self.tweens.killTweensOf(cort);
        });
      }

      var revelar = function () {
        if (esc.revelado) return; esc.revelado = true;
        if (self.pararDolly) self.pararDolly();
        if (self.golpeDeCamara) self.golpeDeCamara(0.8);
        if (cfg.win) {
          self.uiCam.flash(60, 255, 255, 255);
          self.SFX && self.SFX.whoosh && self.SFX.whoosh();
          if (bola.active) self.tweens.add({ targets: bola, x: destino.x, y: destino.y, angle: 1080, duration: self.msV(320), ease: "Sine.easeOut" });
          if (cort && cort.active) self.tweens.add({ targets: cort, y: "+=26", angle: -74, alpha: 0.45, duration: 320 });
          if (rec && rec.active) self.tweens.add({ targets: rec, scale: rec.scale * 1.12, duration: 260 });
          self.punch(cfg.titulo || (hayCorte ? "¡PASÓ ENTRE LAS PIERNAS!" : "¡LA PUSO JUSTO!"),
            cfg.sub || (cfg.alVacio ? "la dejó en el camino y pica al espacio" : "toque y a seguir"), 0x7ee08a);
        } else {
          self.SFX && self.SFX.choque && self.SFX.choque();
          self.uiCam.shake(220, 0.006);
          if (cort && cort.active) {
            if (bola.active) bola.setPosition(cort.x - 30, cort.y + 60);
            self.tweens.add({ targets: cort, scale: cort.scale * 1.14, angle: 0, duration: 280 });
          }
          self.punch(cfg.titulo || (hayCorte ? "¡CORTADO!" : "¡LA TIRÓ LARGA!"),
            cfg.sub || (hayCorte ? "estaba parado en la línea de pase · pelota rival" : "nadie la alcanzó · pelota rival"), 0xe3503e);
        }
      };
      var cerrarYa = function () {
        if (esc.cerrado) return; esc.cerrado = true;
        self._escSkip = null;
        self.cerrarEscena(cfg.alFinal);
      };
      this._escSkip = function () { if (!esc.revelado) revelar(); else cerrarYa(); };

      var tRevela = hayCorte ? tEntrada + Math.round(tViaje * 0.55) + silencio : tEntrada + tViaje;
      this.time.delayedCall(tRevela, revelar);
      this.time.delayedCall(tRevela + tHold, cerrarYa);
    }

  });
})();
