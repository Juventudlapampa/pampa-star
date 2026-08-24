/* ============================================================================
   PAMPA STAR · phaser/scenes/master.js — EL MODO MASTER (V7 §2)
   La carrera ADENTRO del Phaser: elegís tu club de pueblo, jugás la
   temporada de tu división (fixture real de 18 fechas, tabla completa,
   los partidos ajenos se simulan deterministas), y el CAMPEÓN sube un
   escalón de la escalera del potrero al Mundial (divisiones FIJAS de
   logic/master.js). Guardado propio `pampa_master_v1`, retrocompatible:
   no toca el save clásico ni el de avatares. El partido de la fecha se
   juega con el motor de siempre (escena match) — esta escena le pasa el
   rival y recibe el resultado por el registry.
   ========================================================================== */
window.PampaMasterScene = class PampaMasterScene extends Phaser.Scene {
  constructor() { super("master"); }

  /* A1 · los retratos de los personajes CON NOMBRE (Nito, el DT, el utilero).
     Viven en portraits_manifest.personajes y no en el pool `retratos`, que el
     partido usa para dar cara al azar: si estuvieran ahi, Nito podria salir de
     defensor del rival. */
  preload() {
    /* D2 · el logo HORIZONTAL (4280x640) para la franja de arriba del Master,
       y D3 · el escudo del club propio. */
    this.load.image("d_logo_h", "../assets/ui/pampa-star-logo-horizontal.webp");
    this.load.image("d_escudo", "../assets/ui/escudo-club.webp");
    /* ══════════════════════════════════════════════════════════════════════
       D3 · D5 · LAS POSES QUE NECESITA EL MASTER.

       La entrevista te muestra a VOS y cada acción de la semana tiene su
       figura, así que esta escena necesita poses — antes no cargaba ninguna.

       La lista NO está escrita a mano: sale de data/semana.json (el campo
       pose de cada acción) más la de la entrevista. Agregar una acción nueva
       con su pose la carga sola. Y la ruta se arma desde el manifest, que es
       la regla desde W1: una ruta concatenada a mano es invisible para el
       barrido de peso y se escapa de la conversión a webp.
       ══════════════════════════════════════════════════════════════════════ */
    const pm = this.game.registry.get("poses");
    const dSem = this.game.registry.get("semana");
    const necesarias = ["recibiendo"];
    if (dSem && Array.isArray(dSem.opciones)) {
      dSem.opciones.forEach((o) => { if (o && o.pose && necesarias.indexOf(o.pose) < 0) necesarias.push(o.pose); });
    }
    necesarias.forEach((id) => {
      const d = pm && pm.poses && pm.poses[id];
      if (d && d.archivo && !this.textures.exists("pose_" + id)) this.load.image("pose_" + id, "../assets/poses/" + d.archivo);
    });
    const man = this.game.registry.get("portraits");
    if (man && Array.isArray(man.personajes)) {
      man.personajes.forEach((p) => {
        /* W2: los que no tienen lugar todavia no se cargan (ver poses_manifest) */
        if (p && p.cargar === false) return;
        if (p && p.archivo && p.id) this.load.image("personaje_" + p.id, "../" + p.archivo);
      });
    }
  }

  create() {
    /* D5 · volviste del editor con la pinta puesta: ahora sí, la entrevista.
       Se consume el pendiente antes de nada para que un restart no lo repita. */
    const pend = this.game.registry.get("carreraPendiente");
    if (pend && pend.division) {
      this.game.registry.set("carreraPendiente", null);
      this._pendienteOrigen = pend.division;
    }
    const W = this.scale.width, H = this.scale.height;
    /* PIEL P1: fondo radial (ver editor.js) */
    this.cameras.main.setBackgroundColor(this.piel().fondo_borde);
    this.fondoDePiel();
    this.T = window.PampaTemporada;
    this.Ma = window.PampaMaster;
    this.DIV = this.game.registry.get("divisiones");
    if (!this.T || !this.Ma || !this.DIV || !this.DIV.divisiones) {
      /* fallback tolerante: sin data no hay carrera — se vuelve al editor */
      this.add.text(W / 2, H / 2, "La carrera no pudo cargar\n(faltó data/divisiones.json)\n\nTOCÁ PARA VOLVER", { fontFamily: window.PF.texto, fontSize: "16px", color: "#f6efdc", align: "center" }).setOrigin(0.5);
      this.input.once("pointerdown", () => this.scene.start("editor"));
      return;
    }

    this.save = null;
    try { const r = localStorage.getItem("pampa_master_v1"); if (r) this.save = JSON.parse(r); } catch (e) { }

    /* ¿volvemos de un partido de la fecha? el resultado viene por el registry.
       (§4 inline: scene.restart() reusa la instancia — _ultimo se limpia acá
       para que el cartel del resultado viejo no reaparezca tras un restart) */
    this._ultimo = null;
    const res = this.game.registry.get("masterResultado");
    if (res && this.save && this.save.temporada) {
      this.game.registry.remove("masterResultado");
      this.T.jugarFecha(this.save.temporada, res.golesMio | 0, res.golesRival | 0);
      this._ultimo = res;
      /* ============ LA VIDA v2 · EL LUNES DESPUÉS ============
         Se recupera energía según lo que costó el partido, el ánimo sube o
         baja según el resultado, y si te dieron un golpe fuerte arrastrás una
         molestia que la semana que viene podés curar. Y arranca otra semana. */
      if (window.PampaSemana) {
        const cfgS = (this.game.registry.get("balance") || {}).semana || {};
        const lunes = window.PampaSemana.lunesDespues(this.save, res, cfgS);
        this.save.animo = lunes.animo;
        this.save.desgaste = lunes.desgaste;
        this.save.molestia = lunes.molestia;
        this.save.semana = null;          // la semana nueva se arma al entrar
        this.save.semanaResumen = null;
        this._lunes = lunes;
      }
      /* V8 A1: la racha alimenta los eventos condicionales; el modificador de
         la fecha se LIMPIA acá (nunca se arrastra al partido siguiente) */
      const dif = (res.golesMio | 0) - (res.golesRival | 0);
      this.save.racha = dif > 0 ? Math.max(1, (this.save.racha | 0) + 1) : dif < 0 ? Math.min(-1, (this.save.racha | 0) - 1) : 0;
      if (window.PampaVida) window.PampaVida.limpiar(this.save);
      this.guardar();
    }

    /* D5 · volviste del editor: la entrevista, sin pasar de nuevo por elegir
       club (el club ya lo elegiste antes de ir a armar la pinta). */
    if (this._pendienteOrigen) {
      const div = this._pendienteOrigen;
      this._pendienteOrigen = null;
      this.vistaOrigen(div);
      return;
    }
    if (!this.save) this.vistaElegir();
    else this.vistaTemporada();
  }

  /* ══════════════════════════════════════════════════════════════════════
     M2 · LA MÚSICA DEL MASTER. Esta escena NO TENÍA MÚSICA: se salía del
     partido y quedaba en silencio hasta el siguiente. Ahora tiene los dos
     temas lentos del set:
       espera → la tabla de la temporada (89 BPM en mayor, luminoso)
       semana → las decisiones de la semana (Fa menor, el único triste)
     Y la ALTERNANCIA de M4: semana/semana_alt cambian por fecha, igual que los
     del partido, así que dos semanas seguidas no suenan igual.
     Si no hay archivos, no suena nada — el sintetizador es del partido. */
  /* M4 · SE FUE musicaMaster(). Era un envoltorio de una línea sobre
     pedirMusica(), y el problema no era que sobrara: era que el test de
     enumeración NO PUEDE VER a través de él. La enumeración lee el código y
     saca los momentos que se piden; con la llamada escondida detrás de una
     variable, "semana" y "espera" no aparecían y el test los daba por no
     usados. Un momento que el test no ve es un momento que puede quedar sin
     archivo sin que nadie se entere — que es de dónde salió todo esto.

     Regla: los momentos se piden con la cadena literal, en el lugar donde
     pasan. Nada de envoltorios. */



  guardar() {
    try { localStorage.setItem("pampa_master_v1", JSON.stringify(this.save)); } catch (e) { }
  }
  /* V7 §3 LA MUDANZA: antes de que la carrera Phaser escriba por primera vez,
     el save CLÁSICO entero se respalda UNA vez (nunca se pisa el backup) */
  backupClasico() {
    try {
      const c = localStorage.getItem("pampa_star_v1");
      if (c && !localStorage.getItem("pampa_star_v1_backup_pre_v7")) {
        localStorage.setItem("pampa_star_v1_backup_pre_v7", c);
      }
    } catch (e) { }
  }

  /* ---- botón grande accesible (texto + borde, no solo color) ---- */
  boton(x, y, w, texto, bg, cb) {
    const r = this.add.rectangle(x, y, w, 52, bg, 1).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
    this.add.text(x, y, texto, { fontFamily: window.PF.display, fontSize: "11px", color: "#0a1f13" }).setOrigin(0.5);
    r.on("pointerdown", (p, xx, yy, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); cb(); });
    return r;
  }

  /* ============ VISTA 1: ELEGIR EL CLUB (una vez) ============ */
  vistaElegir() {
    const W = this.scale.width, H = this.scale.height;
    this.add.text(W / 2, 26, "🏆 MODO MASTER", { fontFamily: window.PF.display, fontSize: "18px", color: "#ffd84d" }).setOrigin(0.5);
    this.add.text(W / 2, 54, "de la PRIMERA B de tu pueblo al MUNDIAL · el campeón SUBE de división", { fontFamily: window.PF.texto, fontSize: "13px", color: "#f6efdc" }).setOrigin(0.5);

    /* tu club: pueblo del roster con su apodo (stepper con flechas dibujadas) */
    const roster = this.game.registry.get("roster");
    this.pueblos = roster && roster.clubes_por_pueblo ? Object.keys(roster.clubes_por_pueblo) : ["Winifreda", "Toay", "General Pico", "Santa Rosa", "Victorica"];
    this.pSel = 0;
    /* si el save clásico tiene club, arranca ahí */
    try {
      const c = JSON.parse(localStorage.getItem("pampa_star_v1"));
      if (c && c.origen && c.origen.localidad) {
        const i = this.pueblos.indexOf(c.origen.localidad);
        if (i >= 0) this.pSel = i;
      }
    } catch (e) { }

    /* ══════════════════════════════════════════════════════════════════════
       D4 · EL MAPA EN VEZ DE LA LISTA CON FLECHITAS.

       Antes: un nombre en el medio y dos flechas. Para ver los diez pueblos
       había que apretar diez veces, y en ningún momento sabías DÓNDE queda el
       tuyo — que es lo único que un pueblo tiene para decirte antes de que
       empiece la carrera.

       Ahora están los diez a la vez, ubicados. El elegido se marca con ANILLO
       + estrella + nombre grande, no solo con color: la regla de siempre.

       Es un mapa ESQUEMÁTICO POR ZONAS, y se dice en pantalla. El proyecto no
       tiene coordenadas de ningún pueblo y la orden prohíbe inventarlas, así
       que lo que hay es la zona (dato del roster) y el punto cae adentro de la
       caja de su zona. Cuando Rodri cargue x/y exactos, cada pueblo que los
       tenga deja de ser esquemático sin tocar una línea de código.
       ══════════════════════════════════════════════════════════════════════ */
    /* el mapa y la ficha se leen como un bloque, así que se centra el BLOQUE:
       antes se centraba el mapa y la ficha lo empujaba todo a la derecha (se
       ve en la primera captura). Y el alto termina arriba del botón. */
    const anchoFicha = 232, aire = 18, anchoMapa = 330;
    const x0Bloque = Math.round((W - (anchoMapa + aire + anchoFicha)) / 2);
    this.mapaCaja = { x: x0Bloque, y: 74, w: anchoMapa, h: 254, wFicha: anchoFicha, aire };
    this.dibujarMapa();
    if (this.input.keyboard) {
      this.input.keyboard.on("keydown-LEFT", () => { this.pSel = (this.pSel + this.pueblos.length - 1) % this.pueblos.length; this.dibujarMapa(); });
      this.input.keyboard.on("keydown-RIGHT", () => { this.pSel = (this.pSel + 1) % this.pueblos.length; this.dibujarMapa(); });
    }

    /* ══════════════════════════════════════════════════════════════════════
       D5 · PRIMERO LA PINTA, DESPUÉS LA ENTREVISTA.

       El orden estaba al revés: te hacían las tres preguntas de origen y
       recién después elegías cómo sos. Así, en la entrevista no había a quién
       mostrar — literalmente: la pinta todavía no existía.

       Ahora se pasa por el editor primero y la entrevista te sienta enfrente
       de Nito con la pinta que acabás de elegir. Es un cambio de ORDEN, no de
       contenido: las preguntas, las respuestas y los stats que dejan son
       exactamente los mismos, y o2_entrevista.test.js lo sigue verificando.

       El registry lleva a dónde volver; el editor no necesita saber nada de la
       carrera, solo que hay algo pendiente. */
    const arrancarEn = (divId) => {
      this.backupClasico();   // V7 §3: la mudanza respalda el clásico primero
      this.game.registry.set("carreraPendiente", { division: divId });
      this.scene.start("editor");
    };
    this._crearCarrera = (divId, origen) => {
      const club = "Club " + this.pueblos[this.pSel];
      this.save = {
        v: 1, club, pueblo: this.pueblos[this.pSel], division: divId, temporadaN: 1, titulos: [],
        origen: origen || null, bolsaEventos: [], modFecha: null, racha: 0,
        temporada: this.T.crear({
          division: divId, miClub: club,
          rivales: this.DIV.divisiones[divId].rivales,
          semilla: this.Ma.hashClub(club) * 31 + 1
        })
      };
      this.guardar();
      this.scene.restart();
    };
    this.boton(W / 2, H - 156, 420, "▶ ARRANCAR EN LA PRIMERA B", 0x7ee08a, () => arrancarEn(this.Ma.DIVISIONES[0].id));
    /* V7 §3 LA MUDANZA: si el clásico tiene carrera, se puede IMPORTAR — tu
       nivel de allá te ubica en la división que corresponde (con backup) */
    let clasico = null;
    try { clasico = JSON.parse(localStorage.getItem("pampa_star_v1")); } catch (e) { }
    if (clasico && clasico.nivel) {
      const divImp = this.Ma.divisionPorNivel(clasico.nivel | 0);
      this.boton(W / 2, H - 100, 480, "⬆ IMPORTAR TU CARRERA (nivel " + (clasico.nivel | 0) + " → " + divImp.n + ")", 0xffd84d, () => arrancarEn(divImp.id));
      this.add.text(W / 2, H - 72, "el save del clásico queda RESPALDADO (pampa_star_v1_backup_pre_v7) y no se toca", { fontFamily: window.PF.texto, fontSize: "10px", color: "#7ee08a" }).setOrigin(0.5).setAlpha(0.9);
    }
    this.boton(W / 2, H - 40, 300, "✎ VOLVER AL EDITOR", 0xf6efdc, () => this.scene.start("editor"));
  }
  /* ══════════════════════════════════════════════════════════════════════
     D4 · EL MAPA. Se redibuja entero al cambiar de pueblo: son diez puntos y
     un contorno, no hay nada que optimizar, y redibujar entero evita la clase
     de bug donde queda medio estado del dibujo anterior.
     ══════════════════════════════════════════════════════════════════════ */
  dibujarMapa() {
    const M = window.PampaMapa;
    const C = this.mapaCaja;
    if (this._mapaCapa) this._mapaCapa.destroy(true);
    const capa = this.add.container(0, 0);
    this._mapaCapa = capa;
    const roster = this.game.registry.get("roster") || {};
    const clubes = roster.clubes_por_pueblo || {};
    if (!M) {
      /* sin el módulo no se rompe la pantalla: se cae a la lista de siempre */
      const t = this.add.text(C.x + C.w / 2, C.y + C.h / 2, this.pueblos.join("\n"),
        { fontFamily: window.PF.texto, fontSize: "13px", color: "#f6efdc", align: "center" }).setOrigin(0.5);
      capa.add(t);
      return;
    }
    const ubic = M.ubicar(this.pueblos.map(p => Object.assign({ nombre: p }, clubes[p] || {})));
    const aX = f => C.x + f * C.w, aY = f => C.y + f * C.h;

    /* --- el contorno de la provincia --- */
    const g = this.add.graphics(); capa.add(g);
    const pts = M.CONTORNO.map(p => [aX(p[0]), aY(p[1])]);
    g.fillStyle(0x14301f, 1); g.lineStyle(3, 0x7ee08a, 0.9);
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath(); g.fillPath(); g.strokePath();

    /* --- las zonas, nombradas: el mapa es esquemático y se dice --- */
    /* la etiqueta va en la ESQUINA de su caja, no en el medio: en el medio
       quedaba abajo de los nombres de los pueblos y las dos cosas se pisaban
       (se ve en la primera captura). Las cajas se solapan, así que el centro
       es justo donde hay más pueblos. */
    Object.keys(M.ZONAS).forEach(z => {
      const Z = M.ZONAS[z];
      const t = this.add.text(aX(Z.x0) + 4, aY(Z.y0) + 2, Z.n,
        { fontFamily: window.PF.texto, fontSize: "12px", color: "#2f5c40" }).setOrigin(0, 0);
      capa.add(t);
    });

    /* --- los pueblos --- */
    const sel = this.pueblos[this.pSel];
    ubic.forEach(p => {
      const x = aX(p.x), y = aY(p.y);
      const esSel = p.nombre === sel;
      const punto = this.add.circle(x, y, esSel ? 8 : 5, esSel ? 0xffd84d : 0xf6efdc, 1)
        .setStrokeStyle(2, 0x0a1f13);
      capa.add(punto);
      if (esSel) {
        /* FORMA además de color: anillo + estrella. Un punto que solo cambia
           de tono no se distingue, y esa es una regla del proyecto. */
        const anillo = this.add.circle(x, y, 16).setStrokeStyle(3, 0xffd84d, 1);
        const est = this.add.text(x, y - 22, "★", { fontFamily: window.PF.texto, fontSize: "16px", color: "#ffd84d" }).setOrigin(0.5);
        capa.add([anillo, est]);
      }
      /* el nombre siempre visible: son diez, entran */
      const nom = this.add.text(x, y + (esSel ? 16 : 11), p.nombre,
        { fontFamily: window.PF.texto, fontSize: esSel ? "13px" : "12px",
          fontStyle: esSel ? "bold" : "normal", color: esSel ? "#ffd84d" : "#dcd6c2",
          backgroundColor: "#0a1f13cc", padding: { x: 3, y: 1 } }).setOrigin(0.5, 0);
      capa.add(nom);
      /* tocar el punto (o su nombre) lo elige */
      [punto, nom].forEach(o => {
        o.setInteractive({ useHandCursor: true });
        o.on("pointerdown", (pp, xx, yy, e2) => {
          e2 && e2.stopPropagation && e2.stopPropagation();
          const i = this.pueblos.indexOf(p.nombre);
          if (i >= 0 && i !== this.pSel) { this.pSel = i; this.dibujarMapa(); }
        });
      });
    });

    /* --- la ficha del elegido: club, apodo y en qué división arranca --- */
    const info = clubes[sel] || {};
    const divN = (this.Ma && this.Ma.DIVISIONES && this.Ma.DIVISIONES[0]) ? this.Ma.DIVISIONES[0].n : "PRIMERA B";
    const anchoF = C.wFicha || 216, medioF = anchoF / 2;
    const fx = C.x + C.w + (C.aire || 18);
    const fichaY = C.y + 14;
    const ficha = this.add.rectangle(fx + medioF, fichaY + 66, anchoF, 148, 0x0a1f13, 0.72).setStrokeStyle(3, 0xffd84d, 0.9);
    capa.add(ficha);
    capa.add(this.add.text(fx + medioF, fichaY + 12, "★ TU CLUB", { fontFamily: window.PF.texto, fontSize: "12px", color: "#f6c11d" }).setOrigin(0.5));
    capa.add(this.add.text(fx + medioF, fichaY + 40, "Club " + sel, { fontFamily: window.PF.texto, fontSize: "15px", fontStyle: "bold", color: "#f6efdc", align: "center", wordWrap: { width: 200 } }).setOrigin(0.5));
    if (info.apodo) capa.add(this.add.text(fx + medioF, fichaY + 76, '"' + info.apodo + '"', { fontFamily: window.PF.texto, fontSize: "12px", color: "#7ee08a", align: "center", wordWrap: { width: 200 } }).setOrigin(0.5));
    capa.add(this.add.text(fx + medioF, fichaY + 112, "arranca en " + divN, { fontFamily: window.PF.texto, fontSize: "12px", color: "#dcd6c2" }).setOrigin(0.5));
    const zN = (M.ZONAS[info.zona] || {}).n || "—";
    capa.add(this.add.text(fx + medioF, fichaY + 132, "zona " + zN.toLowerCase(), { fontFamily: window.PF.texto, fontSize: "12px", color: "#9fb3a5" }).setOrigin(0.5));

    /* --- y se dice que el mapa es esquemático --- */
    const exactos = M.cuantosExactos(ubic);
    capa.add(this.add.text(C.x + C.w / 2, C.y + C.h + 8,
      exactos === ubic.length ? "ubicaciones exactas"
        : "mapa por zonas · las ubicaciones exactas van cuando estén los datos",
      { fontFamily: window.PF.texto, fontSize: "12px", color: "#7a8a80" }).setOrigin(0.5, 0));
  }

  /* ============ V8 A1 · PARTE 1: DE DÓNDE SALÍS (3 pantallas, una vez) ============
     Elegís por identificación: los números NO se muestran. Cada elección deja
     stats y una frase que el relator cita después. */
  vistaOrigen(divId, paso, elegidas) {
    const W = this.scale.width, H = this.scale.height;
    const V = window.PampaVida, D = this.game.registry.get("vida");
    if (!V || !D || !D.origen) { this._crearCarrera(divId, null); return; }
    paso = paso || 0; elegidas = elegidas || [];
    this.children.removeAll();
    const p = D.origen[paso];
    /* O2 · LA ENTREVISTA. El contenido y las consecuencias son EXACTAMENTE las
       mismas —los stats salen de D.origen y esta pantalla no los mira—; lo que
       cambia es que ahora hay alguien enfrente preguntando. Si falta
       data/entrevista.json, se cae al texto plano de siempre. */
    const E = this.game.registry.get("entrevista");
    const qe = E && E.preguntas && E.preguntas[p.id];
    this.add.text(W / 2, 34, "TU HISTORIA · " + (paso + 1) + " de 3", { fontFamily: window.PF.display, fontSize: "13px", color: "#ffd84d" }).setOrigin(0.5);
    if (qe) this.entrevistador(E, qe.dice);
    /* D5 · y de este lado estás vos, con la pinta que elegiste recién */
    if (qe) this.entrevistado();
    else this.add.text(W / 2, 84, p.pregunta, { fontFamily: window.PF.texto, fontSize: "19px", color: "#f6efdc" }).setOrigin(0.5);
    /* O1 · las cuatro respuestas estaban en columna desde y=150, o sea ARRIBA.
       Bajan a la franja de decisión: 4 de 52 px entran justo en los 212 útiles
       (piel.caben lo confirma). Arriba queda el que pregunta, que es lo que se
       mira; abajo lo que se toca. */
    const pielCfg = (this.game.registry.get("balance") || {}).piel;
    p.opciones.forEach((o, i) => {
      const y = Math.round(window.PampaPiel.yDeOpcion(i, p.opciones.length, 52, pielCfg));
      const r = this.add.rectangle(W / 2, y, 720, 52, 0xf6efdc, 0.97).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
      /* la respuesta DICHA reemplaza al rótulo, pero el subtítulo original
         queda: es lo que le dice al jugador qué tipo de jugador está eligiendo */
      const dicha = qe && qe.respuestas && qe.respuestas[i];
      this.add.text(W / 2, y - 9, (i + 1) + " · " + (dicha || o.t), { fontFamily: window.PF.display, fontSize: "10px", color: "#0a1f13", align: "center", wordWrap: { width: 680 } }).setOrigin(0.5);
      this.add.text(W / 2, y + 13, o.sub || "", { fontFamily: window.PF.texto, fontSize: "12px", color: "#365a41" }).setOrigin(0.5);
      const elegir = () => {
        const nuevas = elegidas.concat([i]);
        if (paso < D.origen.length - 1) this.vistaOrigen(divId, paso + 1, nuevas);
        else this._crearCarrera(divId, V.aplicarOrigen(D, nuevas));
      };
      r.on("pointerdown", (pp, xx, yy, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); elegir(); });
      if (this.input.keyboard) this.input.keyboard.once("keydown-" + ["ONE", "TWO", "THREE", "FOUR"][i], elegir);
    });
    /* V1 (cantidad + alineación): estaba en H-26, o sea DEBAJO de la cuarta
       opción, y quedaba tapado. Y decía dos cosas: cómo se toca (que el jugador
       descubre solo) y que no hay opción mala (que sí importa, porque saca el
       miedo a equivocarse). Queda la segunda, arriba de las opciones. */
    this.add.text(W / 2, 246, "no hay opción mala: elegís quién sos, no cuánto sumás", { fontFamily: window.PF.texto, fontSize: "13px", color: "#7ee08a" }).setOrigin(0.5).setAlpha(0.9);
  }

  /* O2 · EL ENTREVISTADOR: quién pregunta, y la pregunta como globo de diálogo.
     Se dibuja con Graphics — no hay retrato de periodista en assets/, y pedirlo
     era detener el punto. La silueta con el micrófono alcanza para que se
     entienda que hay alguien enfrente; el retrato queda como pedido de arte. */
  entrevistador(E, dice) {
    const W = this.scale.width;
    const x = 96, y = 108;
    const g = this.add.graphics();
    /* A1 · EL RETRATO DE NITO. Antes esto era un muneco geometrico —un circulo
       de cabeza, un rectangulo de torso y un microfono dibujado— que se leia
       como periodista solo por el microfono. Ahora es el retrato de verdad,
       recortado en redondo dentro de su marco.
       Si el retrato no cargo, cae solo al muneco de antes: la entrevista nunca
       queda con un hueco. */
    const kNito = "personaje_nito";
    const conRetrato = this.textures.exists(kNito);
    g.fillStyle(0x0e2a1a, 1); g.fillRoundedRect(x - 52, y - 46, 104, 116, 10);
    if (conRetrato) {
      const R = 40, cy = y + 4;
      const im = this.add.image(x, cy, kNito);
      im.setScale((R * 2.1) / im.height);
      const mk = this.make.graphics({ x: 0, y: 0, add: false });
      mk.fillStyle(0xffffff); mk.fillCircle(x, cy, R);
      im.setMask(mk.createGeometryMask());
      g.lineStyle(3, 0xf5c400, 1); g.strokeCircle(x, cy, R);
    } else {
    g.fillStyle(0x2b1d14, 1);
    g.fillCircle(x, y - 8, 26);                      // cabeza
    g.fillRoundedRect(x - 34, y + 22, 68, 44, 8);    // torso
    g.fillStyle(0xf6efdc, 0.9); g.fillRect(x - 22, y + 30, 44, 8);   // el cuello de la camisa
    /* el micrófono, que es lo que lo hace legible como periodista */
    g.fillStyle(0x232323, 1); g.fillRoundedRect(x + 26, y + 2, 12, 34, 5);
    g.fillStyle(0x9fb3a5, 1); g.fillCircle(x + 32, y + 2, 9);
    }
    /* el globo de diálogo */
    /* D5 · el globo llegaba hasta W-40 y ahora hay ALGUIEN de ese lado: tu
       retrato ocupa de W-144 a W-40, así que el texto se metía abajo y la
       pregunta quedaba cortada a la mitad. El globo termina antes del marco. */
    const bx = 172, bw = (W - 156) - bx;
    const globo = this.add.graphics();
    globo.fillStyle(0xf6efdc, 0.97);
    globo.fillRoundedRect(bx, y - 52, bw, 104, 12);
    globo.fillTriangle(bx, y - 4, bx, y + 20, bx - 16, y + 6);
    globo.lineStyle(3, 0x0a1f13, 1);
    globo.strokeRoundedRect(bx, y - 52, bw, 104, 12);
    this.add.text(bx + 16, y - 40, (E.entrevistador && E.entrevistador.nombre) || "", {
      fontFamily: window.PF.texto, fontSize: "12px", fontStyle: "bold", color: "#365a41", wordWrap: { width: bw - 32 }
    });
    this.add.text(bx + 16, y - 18, dice, {
      fontFamily: window.PF.texto, fontSize: "15px", color: "#0a1f13", wordWrap: { width: bw - 32 }, lineSpacing: 2
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     D5 · EL ENTREVISTADO SOS VOS.

     Nito ya tenía su retrato; del otro lado no había nadie. Ahora la pinta que
     acabás de armar en el editor se sienta enfrente: la MISMA figura que
     después corre en el panel del partido, con tus tintes.

     Sin arte nuevo: es la pose "recibiendo" del manifest —el jugador de frente,
     brazos abajo, mirando— que es la única que sirve para alguien sentado
     escuchando una pregunta. Queda anotado en el HANDOFF que la pose propia de
     "sentado en la entrevista" no existe y sería arte nuevo.
     ══════════════════════════════════════════════════════════════════════ */
  entrevistado() {
    const W = this.scale.width, H = this.scale.height;
    const x = W - 92, y = 118;
    const g = this.add.graphics();
    g.fillStyle(0x0e2a1a, 1); g.fillRoundedRect(x - 52, y - 46, 104, 116, 10);
    const key = this.poseConTuPinta("recibiendo");
    if (key) {
      const R = 40, cy = y + 4;
      const im = this.add.image(x, cy, key);
      /* encuadrado en la CARA: la pose es de cuerpo entero y acá se mira a los
         ojos, así que se escala grande y se recorta en redondo por arriba */
      im.setScale((R * 5.6) / im.height);
      im.y = cy + im.displayHeight * 0.30;
      const mk2 = this.make.graphics({ x: 0, y: 0, add: false });
      mk2.fillStyle(0xffffff); mk2.fillCircle(x, cy, R);
      im.setMask(mk2.createGeometryMask());
      g.lineStyle(3, 0x4fc3f7, 1); g.strokeCircle(x, cy, R);
    } else {
      g.fillStyle(0x2b1d14, 1); g.fillCircle(x, y - 8, 26);
      g.fillStyle(0x4fc3f7, 1); g.fillRoundedRect(x - 34, y + 22, 68, 44, 8);
    }
    /* la placa: bando por FORMA además de color (▼ tuyo, como en el partido) */
    this.add.text(x, y + 80, "▼ VOS", {
      fontFamily: window.PF.texto, fontSize: "13px", fontStyle: "bold",
      color: "#0a1f13", backgroundColor: "#4FC3F7", padding: { x: 8, y: 3 }
    }).setOrigin(0.5);
  }

  /* ══════════════════════════════════════════════════════════════════════
     D5 · LA POSE CON TU PINTA.

     Mismo procedimiento que el panel del partido: el manifest declara los tonos
     de origen (piel, pelo, camiseta) y sus tolerancias, y PampaAvatarArte los
     reemplaza por los del catálogo según tu look. La pose teñida queda cacheada
     con el look en la clave — si no, la primera que se tiñe vale para todas.

     Con todo en "Original" (sin tintes) no se hornea nada y va la pose tal cual,
     que es lo correcto: no hay nada que cambiar.
     ══════════════════════════════════════════════════════════════════════ */
  poseConTuPinta(id) {
    const base = "pose_" + id;
    if (!this.textures.exists(base)) return null;
    const A = window.PampaAvatar, AA = window.PampaAvatarArte;
    const pm = this.game.registry.get("poses");
    const def = pm && pm.poses && pm.poses[id];
    if (!A || !AA || !def || !def.tonos) return base;
    let look;
    try { look = A.validarLook(this.lookGuardado()); } catch (e) { return base; }
    if (!look || (!look.tPiel && !look.tPelo && !look.tCam)) return base;
    const key = "poseM_" + id + "_" + look.tPiel + "_" + look.tPelo + "_" + look.tCam;
    if (this.textures.exists(key)) return key;
    try {
      const CAT = A.CATALOGO, CM = this.game.registry.get("caras");
      const hx = v => parseInt(String(v).slice(1), 16);
      const T = def.tonos, tol = def.tolerancias || {}, mapa = [];
      if (look.tPelo > 0 && T.pelo) mapa.push({ de: hx(T.pelo), a: hx(CAT.colores_pelo[look.tPelo - 1].hex), tol: tol.pelo || 60, y1: def.pelo_y1 != null ? def.pelo_y1 : 0.45 });
      if (look.tPiel > 0 && T.piel) mapa.push({ de: hx(T.piel), a: hx(CAT.pieles[look.tPiel - 1].hex), tol: tol.piel || 80 });
      if (look.tCam > 0 && T.camiseta && CM && CM.camisetas) mapa.push({ de: hx(T.camiseta), a: hx(CM.camisetas[(look.tCam - 1) % CM.camisetas.length].hex), tol: tol.camiseta || 95 });
      if (!mapa.length) return base;
      AA.tenirImagen(this, base, key, mapa);
    } catch (e) { return base; }
    return this.textures.exists(key) ? key : base;
  }

  /* el look guardado del editor, sin depender de que la escena lo tenga */
  lookGuardado() {
    try {
      const s = JSON.parse(localStorage.getItem("pampa_star_v1") || "null");
      if (s && s.look) return s.look;
    } catch (e) { }
    return null;
  }

  /* ============ V8 A1 · PARTE 2: LA SEMANA (antes de cada fecha) ============ */
  /* ============ LA VIDA v2 · LA SEMANA CON ENERGÍA ============
     Una sola pantalla: arriba los dos medidores con NÚMERO (nunca solo barra),
     en el medio las tres ranuras (lunes, miércoles, viernes), abajo el botón
     de jugar. Tres toques y estás en la cancha. El evento pampeano queda
     arriba, como sabor, y puede cambiar los costos de la semana. */
  vistaSemana(rival, alJugar) {
    /* PASADA DE COHERENCIA · esto se llamaba en CADA repintado de la vista, o
       sea 3 o 4 veces al armar la semana. No se escucha (el motor ignora el
       pedido si ya suena ese tema) pero es una llamada de mas por cuadro y
       ensucia cualquier medicion de musica. Se pide una sola vez por entrada. */
    if (this._musicaSemanaPuesta !== true) {
      this.pedirMusica("semana");
      this._musicaSemanaPuesta = true;
    }
    const W = this.scale.width, H = this.scale.height;
    const S = window.PampaSemana, D = this.game.registry.get("semana");
    if (!S || !D) { this.vistaEvento(rival, alJugar); return; }
    const cfg = (this.game.registry.get("balance") || {}).semana || {};
    if (!this.save.semana) this.save.semana = S.nuevaSemana(this.save, cfg);
    const sem = this.save.semana;
    this._semRival = rival; this._semJugar = alJugar;
    this.children.removeAll();

    /* E · el PRINCIPAL de esta pantalla es contra quién jugás: es para lo que
       te estás preparando. El título de la pantalla pasa a apoyo. */
    this.add.text(W / 2, 16, "LA SEMANA · fecha " + ((this.save.temporada.fecha | 0) + 1), { fontFamily: window.PF.texto, fontSize: window.PampaPiel.nivel(4), color: "#9fb3a5" }).setOrigin(0.5);
    this.add.text(W / 2, 42, "contra " + rival.toUpperCase(), { fontFamily: window.PF.display, fontSize: window.PampaPiel.nivel(1), color: "#f6efdc" }).setOrigin(0.5);

    /* --- LOS DOS MEDIDORES: barra Y número, siempre --- */
    const medidor = (x, y, etiqueta, valor, color) => {
      this.add.text(x, y - 16, etiqueta + " " + Math.round(valor) + "/100", { fontFamily: window.PF.texto, fontSize: window.PampaPiel.nivel(3), fontStyle: "bold", color: "#f6efdc" }).setOrigin(0, 0.5);
      const g = this.add.graphics();
      g.fillStyle(0x0a1f13, 0.9); g.fillRect(x, y, 300, 18);
      g.fillStyle(color, 1); g.fillRect(x + 2, y + 2, Math.max(0, Math.min(296, 296 * valor / 100)), 14);
      g.lineStyle(2, 0xf6efdc, 0.8); g.strokeRect(x, y, 300, 18);
    };
    medidor(W / 2 - 320, 80, "⚡ ENERGÍA", sem.energia, 0x7ee08a);
    medidor(W / 2 + 20, 80, "🧠 ÁNIMO", sem.animo, 0x4fc3f7);
    if (sem.molestia) this.add.text(W / 2, 116, "🩹 arrastrás una molestia de la fecha pasada", { fontFamily: window.PF.texto, fontSize: "13px", color: "#e3503e" }).setOrigin(0.5);

    /* --- EL EVENTO DE LA SEMANA (sabor + modificador) --- */
    if (this._semEvento === undefined) this._semEvento = this.eventoDeLaSemana(rival);
    const ev = this._semEvento;
    if (ev && ev.texto) {
      this.add.text(W / 2, 116, "📰 " + ev.texto, { fontFamily: window.PF.texto, fontSize: window.PampaPiel.nivel(3), color: "#ffd84d", align: "center", wordWrap: { width: 860 } }).setOrigin(0.5);
    }

    /* ══════════════════════════════════════════════════════════════════════
       D2 · LA SEMANA SE ELIGE POR ACCIÓN, NO POR DÍA.

       Antes: tocabas LUNES, se abría otra pantalla con las diez acciones,
       elegías una, volvías; tocabas MIÉRCOLES, otra vez lo mismo. Seis toques
       y dos pantallas para tres decisiones, y el día no significaba nada —
       ninguna acción cambia según sea lunes o viernes.

       Ahora: las diez acciones están A LA VISTA y elegís tres. El juego las
       reparte en los días en el orden en que las elegiste y te lo CUENTA en el
       repaso, que es donde el día sí sirve para algo: para leerse como una
       semana. Misma lógica, mismos números, las mismas tres ranuras — lo único
       que cambia es que no hay que ir a buscarlas.

       Lo que se elige queda arriba, en una tira, con su pose. Lo que se puede
       elegir, abajo. Y el repaso al pie.
       ══════════════════════════════════════════════════════════════════════ */
    const nombres = ["el lunes", "el miércoles", "el viernes"];
    const hechas = sem.elegidas.filter(Boolean).length;

    /* --- LA TIRA DE LO ELEGIDO --- */
    const anchoR = 236, x0 = W / 2 - anchoR - 12;
    nombres.forEach((n, i) => {
      const x = x0 + i * (anchoR + 12), y = 176;
      const elegida = sem.elegidas[i];
      const op = elegida ? D.opciones.find(o => o.id === elegida) : null;
      if (window.PampaSemanaUI) window.PampaSemanaUI.escenario(this, x, y, anchoR, 84, op ? op.lugar : "vacio");
      this.add.rectangle(x, y, anchoR, 84, op ? 0x2e7d32 : 0x0a1f13, op ? 0.24 : 0.44)
        .setStrokeStyle(3, op ? 0x7ee08a : 0x555f57, 0.9);
      this.add.text(x, y - 30, n.toUpperCase(), { fontFamily: window.PF.display, fontSize: "12px",
        color: op ? "#ffd84d" : "#9fb3a5", backgroundColor: "#0a1f13cc", padding: { x: 6, y: 2 } }).setOrigin(0.5);
      if (op) {
        /* D3 · la pose de esa acción, adentro del escenario */
        /* 54 y no 66: con 66 la cabeza se salía por arriba del marco de 84 —
           se ve en la captura de la primera vuelta. Anclada por los pies a
           y+34, la figura entera entra adentro. */
        this.figuraDeAccion(op, x + anchoR * 0.32, y + 34, 54);
        this.add.rectangle(x - 22, y + 22, anchoR - 66, 32, 0x0a1f13, 0.86);
        this.add.text(x - 22, y + 22, op.n, { fontFamily: window.PF.texto, fontSize: "13px",
          color: "#f6efdc", align: "center", wordWrap: { width: anchoR - 70 } }).setOrigin(0.5);
        /* se puede deshacer: si te arrepentís, la sacás y elegís otra */
        const q = this.add.text(x + anchoR / 2 - 14, y - 30, "✕", { fontFamily: window.PF.texto,
          fontSize: "14px", color: "#e3503e", backgroundColor: "#0a1f13cc", padding: { x: 5, y: 2 } })
          .setOrigin(0.5).setInteractive({ useHandCursor: true });
        q.on("pointerdown", (pp, xx, yy, e2) => {
          e2 && e2.stopPropagation && e2.stopPropagation();
          this.sacarDeLaSemana(i);
        });
      } else {
        this.add.text(x, y + 12, hechas === i ? "elegí de la lista ▼" : "todavía no",
          { fontFamily: window.PF.texto, fontSize: "13px", color: hechas === i ? "#f6efdc" : "#7a8a80" }).setOrigin(0.5);
      }
    });

    /* --- LA LISTA DE ACCIONES, A LA VISTA --- */
    /* TODAS las marcas, no solo la primera: el origen son TRES preguntas y
     cualquiera de ellas puede dejar una. Con marcas[0] alcanzaba con que la
     que importaba fuera la segunda para que no contara. */
  const ctxL = { marcas: (this.save.origen && this.save.origen.marcas) || [],
    origen: (this.save.origen && this.save.origen.marcas && this.save.origen.marcas[0]) || null };
    const ops = S.opcionesPara(D, sem, ctxL);
    this.add.text(W / 2, 286, hechas >= 3 ? "LA SEMANA ESTÁ ARMADA · a la cancha" : "¿QUÉ HACÉS ESTA SEMANA? · elegiste " + hechas + " de 3 (teclas 1 a 0)",
      { fontFamily: window.PF.display, fontSize: "12px", color: hechas >= 3 ? "#7ee08a" : "#ffd84d" }).setOrigin(0.5);
    /* O1 · las opciones van en la FRANJA DE DECISIÓN, ubicadas con el helper —
       no clavadas a mano. Tres filas: dos de acciones y la del botón de jugar,
       que es la tercera decisión de esta pantalla. */
    const pielCfgS = (this.game.registry.get("balance") || {}).piel;
    const porFila = 5, anchoO = 178, altoO = 64;
    ops.slice(0, 10).forEach((o, i) => {
      const cx = W / 2 + (i % porFila - (porFila - 1) / 2) * (anchoO + 8);
      const cy = Math.round(window.PampaPiel.yDeOpcion(Math.floor(i / porFila), 3, altoO, pielCfgS));
      const sinEnergia = (o.energia_costo || 0) > sem.energia;
      const alcanza = !sinEnergia && hechas < 3;
      const usada = sem.elegidas.indexOf(o.id) >= 0;
      /* DALTONISMO: apagado no puede ser SOLO un color más oscuro. La tarjeta
         que no se puede tocar se dice con PALABRA (el motivo, abajo) y con
         BORDE punteado por grosor; y el fondo se mantiene claro para que el
         texto siga leyéndose — antes quedaba texto oscuro sobre fondo oscuro. */
      const r = this.add.rectangle(cx, cy, anchoO, altoO, alcanza ? 0xf6efdc : 0xc9c3b2, alcanza ? 0.97 : 0.9)
        .setStrokeStyle(usada ? 4 : (alcanza ? 3 : 1), usada ? 0x7ee08a : 0x0a1f13, alcanza ? 1 : 0.55);
      this.add.text(cx, cy - 18, o.n, { fontFamily: window.PF.texto, fontSize: "13px", fontStyle: "bold",
        color: "#0a1f13", align: "center", wordWrap: { width: anchoO - 12 } }).setOrigin(0.5);
      /* PASADA DE COHERENCIA · una vez armada la semana, las SIETE tarjetas
         decian "la semana ya esta armada". Siete veces el mismo renglon en
         rojo es ruido, y encima tapa el efecto de cada accion, que es lo unico
         que te sirve mirar mientras decidis si sacar una y poner otra.
         Ahora: el motivo se dice UNA vez, arriba del grupo (ver el titulo de la
         lista), y la tarjeta sigue mostrando SU efecto. */
      this.add.text(cx, cy + 14, sinEnergia ? "sin energía para esto" : this.textoEfecto(o),
        { fontFamily: window.PF.texto, fontSize: "12px",
          color: sinEnergia ? "#8a3226" : (alcanza ? "#365a41" : "#5a6b60"),
          fontStyle: sinEnergia ? "italic" : "normal", align: "center", wordWrap: { width: anchoO - 10 } }).setOrigin(0.5);
      /* se puede repetir una acción: son tres días distintos. La marca dice
         cuántas veces ya la elegiste, para que no haya que contarlas a ojo. */
      const veces = sem.elegidas.filter(e => e === o.id).length;
      if (veces) this.add.text(cx + anchoO / 2 - 12, cy - altoO / 2 + 9, "×" + veces,
        { fontFamily: window.PF.texto, fontSize: "12px", color: "#0a1f13", backgroundColor: "#7ee08a", padding: { x: 4, y: 1 } }).setOrigin(0.5);
      if (!alcanza) return;
      r.setInteractive({ useHandCursor: true });
      r.on("pointerdown", (pp, xx, yy, e2) => {
        e2 && e2.stopPropagation && e2.stopPropagation();
        if (window.PampaFeel) window.PampaFeel.pulsar(this, r);
        this.ponerEnLaSemana(o);
      });
      if (this.input.keyboard && i < 10) {
        const tecla = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "ZERO"][i];
        this.input.keyboard.once("keydown-" + tecla, () => { if (alcanza) this.ponerEnLaSemana(o); });
      }
    });

    /* --- CÓMO LLEGÁS + JUGAR --- */
    const llega = S.comoLlegas(sem, cfg);
    /* N4 · EL REPASO: la semana contada como la contaría alguien, no una lista.
       Sale de lo que ya elegiste; no calcula nada. */
    /* D2 · el repaso es DONDE SIRVE EL DÍA: contarte la semana como se la
       contarías a alguien. Por eso las acciones se eligen sueltas y los días
       aparecen recién acá, ya repartidos. */
    if (window.PampaSemanaUI) {
      this.add.text(W / 2, 240, window.PampaSemanaUI.repaso(sem.elegidas, D.opciones),
        { fontFamily: window.PF.texto, fontSize: "13px", color: "#dcd6c2", align: "center", wordWrap: { width: 880 } }).setOrigin(0.5);
    }
    this.add.text(W / 2, 264, "🗓 " + llega.resumen + " · con " + llega.aguanteInicial + " de aguante y " + llega.envionInicial + " de envión",
      { fontFamily: window.PF.texto, fontSize: "13px", color: "#7ee08a", align: "center", wordWrap: { width: 880 } }).setOrigin(0.5);
    if (sem.espiado) this.add.text(W / 2, 136, "👀 los fuiste a ver: sabés a qué juegan", { fontFamily: window.PF.texto, fontSize: "13px", color: "#ffd84d" }).setOrigin(0.5);

    const listo = sem.elegidas.every(e => e);
    /* boton() toma x como CENTRO. Acá había un W/2-170 heredado del layout de
       DOS botones lado a lado de la vista de temporada, pero en la semana hay
       uno solo: quedaba corrido a la izquierda. Se ve en la captura vieja. */
    const yJugar = Math.round(window.PampaPiel.yDeOpcion(2, 3, 64, (this.game.registry.get("balance") || {}).piel));
    this.boton(W / 2, yJugar, 340, listo ? "▶ JUGAR LA FECHA" : "▶ JUGAR ASÍ (te queda semana sin usar)", listo ? 0x7ee08a : 0xdcd6c2, () => {
      this.cerrarSemana(alJugar);
    });
    /* la ayuda vivía en H-22 y ahí abajo ahora está el botón: se pisaban. Sube
       al título de la lista, que es donde hace falta leerla. */
    this.relojDeLaSemana(listo, alJugar);
  }

  /* ══════════════════════════════════════════════════════════════════════
     D2 · EL RELOJ DE LA SEMANA: APAGADO POR DEFECTO.

     La semana es la única pantalla tranquila del juego. Todo lo demás —el
     partido, el pasillo, el jugadón— te apura a propósito; acá te sentás a
     pensar qué clase de jugador querés ser esa semana, y meterle una cuenta
     regresiva de 15 segundos convierte la única pausa en otra urgencia.

     Queda como MODO OPCIONAL porque hay a quien le gusta esa presión, y
     porque apagarlo cuesta una línea: balance.semana.reloj_seg en 0 (que es
     el default) no dibuja nada y no arma ningún temporizador. Con un número
     mayor a 0 aparece la cuenta y al llegar a cero se juega con lo que haya —
     nunca se elige por vos.
     ══════════════════════════════════════════════════════════════════════ */
  /* D3 · la figura chica de una acción, dentro de su escenario. Recortada por
     arriba: la pose es de cuerpo entero y en 66 px de alto lo que se lee es el
     gesto, no el detalle. Si la pose no cargó no se dibuja nada y la ranura
     sigue funcionando — nunca un hueco con signo de pregunta. */
  figuraDeAccion(op, x, y, alto) {
    if (!op || !op.pose) return null;
    const key = this.poseConTuPinta(op.pose);
    if (!key) return null;
    const im = this.add.image(x, y, key);
    im.setScale(alto / im.height);
    im.setOrigin(0.5, 1);
    return im;
  }

  relojDeLaSemana(listo, alJugar) {
    const cfg = (this.game.registry.get("balance") || {}).semana || {};
    const seg = cfg.reloj_seg | 0;
    if (seg <= 0) return false;                  // el default: no existe
    const W = this.scale.width;
    let quedan = seg;
    const t = this.add.text(W - 20, 20, "⏱ " + quedan + "s", { fontFamily: window.PF.display,
      fontSize: "14px", color: "#ffd84d", backgroundColor: "#0a1f13cc", padding: { x: 8, y: 4 } }).setOrigin(1, 0);
    this._relojSem = this.time.addEvent({
      delay: 1000, repeat: seg - 1,
      callback: () => {
        quedan--;
        t.setText("⏱ " + quedan + "s").setColor(quedan <= 5 ? "#e3503e" : "#ffd84d");
        if (quedan <= 0) { this._relojSem = null; this.cerrarSemana(alJugar); }
      }
    });
    return true;
  }

  /* ══════════════════════════════════════════════════════════════════════
     D2 · PONER Y SACAR. El juego reparte los días; vos elegís las acciones.

     La ranura es la primera libre, en orden. Eso es lo que hace que el repaso
     se lea como una semana ("el lunes X, el miércoles Y") sin que hayas tenido
     que pensar en días: contás lo que hiciste, no lo agendás.

     La lógica de abajo (logic/semana.js) no se toca: sigue recibiendo una
     ranura y un id, y sigue devolviendo la misma semana con los mismos números.
     ══════════════════════════════════════════════════════════════════════ */
  ponerEnLaSemana(op) {
    const S = window.PampaSemana, D = this.game.registry.get("semana");
    const bal = (this.game.registry.get("balance") || {}).semana || {};
    const sem = this.save.semana;
    const ranura = sem.elegidas.findIndex(e => !e);
    if (ranura < 0) return false;
    const nueva = S.elegir(D, sem, ranura, op.id, bal);
    if (!nueva) return false;
    this.save.semana = nueva;
    if (op.riesgo_golpe && Math.random() < op.riesgo_golpe) this.save.semana.molestia = true;
    this.guardar();
    /* D3 · el momento de la acción, antes de repintar */
    this.momentoDeAccion(op, ranura);
    return true;
  }
  sacarDeLaSemana(ranura) {
    const S = window.PampaSemana, D = this.game.registry.get("semana");
    const bal = (this.game.registry.get("balance") || {}).semana || {};
    const sem = this.save.semana;
    if (!sem || !sem.elegidas[ranura]) return false;
    /* rehacer la semana desde cero con las que quedan: así los números salen
       de la MISMA función que los puso y no hay que restar a mano (restar a
       mano es de donde salen los desajustes que después nadie encuentra) */
    const quedan = sem.elegidas.filter((e, i) => e && i !== ranura);
    let nueva = S.nuevaSemana(this.save, bal);
    nueva.molestia = sem.molestia;
    quedan.forEach((id, i) => { nueva = S.elegir(D, nueva, i, id, bal) || nueva; });
    this.save.semana = nueva;
    this.guardar();
    this.vistaSemana(this._semRival, this._semJugar);
    return true;
  }

  /* ══════════════════════════════════════════════════════════════════════
     D3 · CADA ACCIÓN DE LA SEMANA TIENE SU ANIMACIÓN.

     Sin arte nuevo: la pose sale de data/semana.json, que ahora declara cuál le
     toca a cada acción — todas del manifest que ya existe. Las que están de
     prestado están marcadas con pose_falta y son el pedido de arte de la tanda.

     El momento usa el Bloque B que ya está: anticipación y rebote al entrar
     (PampaFeel.aparecer), un golpe corto de sonido, y el escenario N4 detrás
     reaccionando. Dura lo que dura un gesto — no es una escena de partido, es
     el acuse de recibo de una decisión.
     ══════════════════════════════════════════════════════════════════════ */
  momentoDeAccion(op, ranura) {
    /* ══════════════════════════════════════════════════════════════════════
       REHECHO despues de mirarlo con el metodo correcto.

       La primera version la "verifique" pisando loop.step() en bucle, que NO
       le da delta a los tweens: se veia la figura quieta en su posicion final
       y todo parecia bien. Dejando correr tiempo real aparecieron dos cosas:

         · la figura se salia del marco por abajo (entra con rebote y el
           rebote se pasa del destino, que es justamente para lo que sirve)
         · el texto caia ENCIMA de las lineas que dibuja el escenario del club
           y quedaba tachado, ilegible

       Ahora: la figura tiene su propia mascara contra el marco, y el texto vive
       en una banda opaca a la izquierda que no comparte lugar con el dibujo.
       El marco es la unidad: nada se sale de ahi.
       ══════════════════════════════════════════════════════════════════════ */
    const W = this.scale.width, H = this.scale.height;
    const MX = W / 2, MY = H / 2 - 10, MW = 620, MH = 300;
    const x0 = MX - MW / 2, y0 = MY - MH / 2;
    const capa = this.add.container(0, 0).setDepth(900);
    const velo = this.add.rectangle(W / 2, H / 2, W, H, 0x0a1f13, 0.78);
    capa.add(velo);

    /* el LUGAR donde pasa */
    if (window.PampaSemanaUI) {
      const cont = window.PampaSemanaUI.escenario(this, MX, MY, MW, MH, op.lugar || "vacio");
      if (cont) capa.add(cont);
    }

    /* la figura, recortada contra el marco: el rebote de PampaFeel se pasa del
       destino a proposito, asi que sin mascara asoma por afuera. */
    const key = op.pose ? this.poseConTuPinta(op.pose) : null;
    if (key) {
      const im = this.add.image(x0 + MW * 0.72, y0 + MH - 8, key);
      im.setOrigin(0.5, 1);
      im.setScale((MH * 0.82) / im.height);
      const mk = this.make.graphics({ x: 0, y: 0, add: false });
      mk.fillStyle(0xffffff); mk.fillRect(x0, y0, MW, MH);
      im.setMask(mk.createGeometryMask());
      capa.add(im);
      if (window.PampaFeel) {
        window.PampaFeel.aparecer(this, im,
          { x: x0 + MW * 0.72, y: y0 + MH - 8, scale: im.scale, desdeX: x0 + MW + 160 }, 2);
      }
    }

    /* LA BANDA DEL TEXTO: opaca y a la izquierda. El escenario dibuja lineas
       (la cancha del club, la ruta, el patio) y el texto encima quedaba
       tachado — se ve en la captura de la primera version. */
    const bw = Math.round(MW * 0.46);
    const banda = this.add.rectangle(x0, y0, bw, MH, 0x0a1f13, 0.88).setOrigin(0, 0);
    capa.add(banda);

    const dias = ["EL LUNES", "EL MIÉRCOLES", "EL VIERNES"];
    const cx = x0 + bw / 2;
    const tD = this.add.text(cx, y0 + 28, dias[ranura] || "", { fontFamily: window.PF.display,
      fontSize: "13px", color: "#ffd84d" }).setOrigin(0.5);
    const tN = this.add.text(cx, y0 + 96, op.n, { fontFamily: window.PF.texto, fontSize: "20px",
      fontStyle: "bold", color: "#f6efdc", align: "center", wordWrap: { width: bw - 28 } }).setOrigin(0.5);
    const tS = this.add.text(cx, y0 + 176, op.sub || "", { fontFamily: window.PF.texto,
      fontSize: "14px", color: "#dcd6c2", align: "center", wordWrap: { width: bw - 28 } }).setOrigin(0.5);
    /* lo que te deja, con numeros: la misma linea que muestra la tarjeta */
    const tE = this.add.text(cx, y0 + MH - 30, this.textoEfecto(op), { fontFamily: window.PF.texto,
      fontSize: "13px", color: "#7ee08a", align: "center", wordWrap: { width: bw - 28 } }).setOrigin(0.5);

    const marco = this.add.rectangle(MX, MY, MW, MH, 0x000000, 0).setStrokeStyle(4, 0x7ee08a, 0.9);
    capa.add([marco, tD, tN, tS, tE]);
    if (window.PampaFeel) window.PampaFeel.pulsar(this, tN);
    const S = window.PampaSFX;
    if (S && S.temaCampo) S.temaCampo("rival");

    /* dura lo que dura un gesto, y se puede saltear tocando */
    const cerrar = () => {
      if (capa.__ido) return; capa.__ido = true;
      capa.destroy(true);
      this.vistaSemana(this._semRival, this._semJugar);
    };
    const ms = ((this.game.registry.get("balance") || {}).semana || {}).momento_ms;
    this.time.delayedCall(ms != null ? ms : 950, cerrar);
    velo.setInteractive().on("pointerdown", cerrar);
  }
  /* el texto del efecto, en números claros (nunca solo color) */
  textoEfecto(o) {
    const t = [];
    if (o.energia_costo) t.push("−" + o.energia_costo + " energía");
    if (o.energia_recupera) t.push("+" + o.energia_recupera + " energía");
    if (o.animo) t.push((o.animo > 0 ? "+" : "") + o.animo + " ánimo");
    if (o.stat) t.push("+" + (o.stat_mas || 1) + " " + (o.stat === "azar" ? "a una stat al azar" : o.stat));
    if (o.cura_molestia) t.push("cura la molestia");
    if (o.espia_rival) t.push("ves cómo juega el rival");
    if (o.evita) t.push("te sacás el problema de encima");
    if (o.riesgo_golpe) t.push("riesgo de llegar golpeado");
    return t.join(" · ");
  }
  /* la elección de UN día: las opciones disponibles, con su costo a la vista */
  vistaElegirDia(ranura) {
    const W = this.scale.width, H = this.scale.height;
    const S = window.PampaSemana, D = this.game.registry.get("semana");
    const cfg = (this.game.registry.get("balance") || {}).balance || {};
    const bal = (this.game.registry.get("balance") || {}).semana || {};
    const sem = this.save.semana;
    /* TODAS las marcas, no solo la primera: el origen son TRES preguntas y
     cualquiera de ellas puede dejar una. Con marcas[0] alcanzaba con que la
     que importaba fuera la segunda para que no contara. */
  const ctx = { marcas: (this.save.origen && this.save.origen.marcas) || [],
    origen: (this.save.origen && this.save.origen.marcas && this.save.origen.marcas[0]) || null };
    const ops = S.opcionesPara(D, sem, ctx);
    this.children.removeAll();
    this.add.text(W / 2, 34, ["LUNES", "MIÉRCOLES", "VIERNES"][ranura] + " · ¿qué hacés?", { fontFamily: window.PF.display, fontSize: "13px", color: "#ffd84d" }).setOrigin(0.5);
    this.add.text(W / 2, 60, "te quedan " + sem.energia + " de energía", { fontFamily: window.PF.texto, fontSize: "14px", color: "#f6efdc" }).setOrigin(0.5);
    const porFila = 2, ancho = 380, alto = 74;
    ops.slice(0, 8).forEach((o, i) => {
      const cx = W / 2 + (i % porFila === 0 ? -ancho / 2 - 10 : ancho / 2 + 10);
      const cy = 118 + Math.floor(i / porFila) * (alto + 12);
      const alcanza = (o.energia_costo || 0) <= sem.energia;
      const r = this.add.rectangle(cx, cy, ancho, alto, alcanza ? 0xf6efdc : 0x555f57, alcanza ? 0.97 : 0.6).setStrokeStyle(3, 0x0a1f13);
      this.add.text(cx, cy - 16, o.n, { fontFamily: window.PF.display, fontSize: "10px", color: "#0a1f13" }).setOrigin(0.5);
      this.add.text(cx, cy + 6, o.sub, { fontFamily: window.PF.texto, fontSize: "12px", color: "#365a41" }).setOrigin(0.5);
      this.add.text(cx, cy + 26, this.textoEfecto(o), { fontFamily: window.PF.texto, fontSize: "12px", color: alcanza ? "#0a1f13" : "#e3503e", align: "center", wordWrap: { width: ancho - 16 } }).setOrigin(0.5);
      if (!alcanza) return;
      r.setInteractive({ useHandCursor: true });
      r.on("pointerdown", (pp, xx, yy, e2) => {
        e2 && e2.stopPropagation && e2.stopPropagation();
        const nueva = S.elegir(D, sem, ranura, o.id, bal);
        if (nueva) {
          this.save.semana = nueva;
          if (o.riesgo_golpe && Math.random() < o.riesgo_golpe) this.save.semana.molestia = true;
          this.guardar();
        }
        this.vistaSemana(this._semRival, this._semJugar);
      });
    });
    this.boton(W / 2 - 110, H - 60, 220, "◀ VOLVER", 0xdcd6c2, () => this.vistaSemana(this._semRival, this._semJugar));
  }
  /* el evento pampeano de la semana: sabor arriba + posible modificador */
  eventoDeLaSemana(rival) {
    const V = window.PampaVida, D = this.game.registry.get("vida"), t = this.save.temporada;
    if (!V || !D || !D.eventos) return null;
    const pos = this.T.posiciones(t);
    const idxMio = pos.findIndex(f => f.equipo === t.miClub), idxRival = pos.findIndex(f => f.equipo === rival);
    const ctx = {
      fecha: t.fecha, division: this.save.division,
      clasico: (this.save.pueblo && rival.indexOf(this.save.pueblo) >= 0) || false,
      posMia: idxMio + 1, posRival: idxRival + 1, racha: this.save.racha | 0,
      marcas: (this.save.origen && this.save.origen.marcas) || []
    };
    const sel = V.elegirEvento(D, this.save.bolsaEventos || [], ctx, this.Ma.hashClub(this.save.club) + t.fecha * 7919 + this.save.temporadaN * 13);
    if (!sel) return null;
    this.save.bolsaEventos = sel.vistos;
    return sel.evento;
  }
  /* cerrar la semana: lo que elegiste se convierte en cómo llegás al domingo */
  cerrarSemana(alJugar) {
    this._musicaSemanaPuesta = false;   // la proxima semana vuelve a pedir su tema
    const S = window.PampaSemana;
    const cfg = (this.game.registry.get("balance") || {}).semana || {};
    const sem = this.save.semana || S.nuevaSemana(this.save, cfg);
    const llega = S.comoLlegas(sem, cfg);
    /* los permanentes se guardan en la carrera (chiquitos, para siempre) */
    this.save.mejoras = this.save.mejoras || {};
    Object.keys(sem.permanentes || {}).forEach(k => {
      this.save.mejoras[k] = (this.save.mejoras[k] || 0) + sem.permanentes[k];
    });
    this.save.semanaResumen = llega;
    this._semEvento = undefined;
    this.guardar();
    alJugar();
  }

  vistaEvento(rival, alJugar) {
    const W = this.scale.width, H = this.scale.height;
    const V = window.PampaVida, D = this.game.registry.get("vida"), t = this.save.temporada;
    if (!V || !D || !D.eventos) { alJugar(); return; }
    const pos = this.T.posiciones(t);
    const idxMio = pos.findIndex(f => f.equipo === t.miClub), idxRival = pos.findIndex(f => f.equipo === rival);
    const ctx = {
      fecha: t.fecha, division: this.save.division,
      clasico: (this.save.pueblo && rival.indexOf(this.save.pueblo) >= 0) || false,
      posMia: idxMio + 1, posRival: idxRival + 1, racha: this.save.racha | 0,
      marcas: (this.save.origen && this.save.origen.marcas) || []
    };
    const sel = V.elegirEvento(D, this.save.bolsaEventos || [], ctx, this.Ma.hashClub(this.save.club) + t.fecha * 7919 + this.save.temporadaN * 13);
    if (!sel) { alJugar(); return; }
    this.save.bolsaEventos = sel.vistos;
    this.children.removeAll();
    /* E · acá el PRINCIPAL es lo que pasó: el resto es marco. */
    this.add.text(W / 2, 44, "LA SEMANA", { fontFamily: window.PF.texto, fontSize: window.PampaPiel.nivel(4), color: "#9fb3a5" }).setOrigin(0.5);
    this.add.text(W / 2, 140, sel.evento.texto, { fontFamily: window.PF.display, fontSize: window.PampaPiel.nivel(1), color: "#f6efdc", align: "center", wordWrap: { width: 800 }, lineSpacing: 10 }).setOrigin(0.5);
    /* D1 · las dos opciones del evento arrancaban en y=280, apenas fuera de la
       franja. Lo cazó el guardián ampliado, no el ojo. */
    const pielEv = (this.game.registry.get("balance") || {}).piel;
    sel.evento.opciones.forEach((o, i) => {
      const y = Math.round(window.PampaPiel.yDeOpcion(i, sel.evento.opciones.length, 72, pielEv));
      const r = this.add.rectangle(W / 2, y, 700, 72, 0xf6efdc, 0.97).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
      this.add.text(W / 2, y, (i + 1) + " · " + o.texto, { fontFamily: window.PF.display, fontSize: "11px", color: "#0a1f13" }).setOrigin(0.5);
      const elegir = () => {
        this.save.modFecha = V.aplicarEleccion(sel.evento, i);
        this.guardar();
        alJugar();
      };
      r.on("pointerdown", (pp, xx, yy, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); elegir(); });
      if (this.input.keyboard) this.input.keyboard.once("keydown-" + ["ONE", "TWO"][i], elegir);
    });
    /* V1 (cantidad): decía cómo se toca, que el jugador ya sabe a esta altura */
  }

  /* ============ VISTA 2: LA TEMPORADA ============ */
  vistaTemporada() {
    const W = this.scale.width, H = this.scale.height;
    this.pedirMusica("espera");
    const t = this.save.temporada, T = this.T, Ma = this.Ma;
    const div = Ma.DIVISIONES.find(d => d.id === this.save.division) || Ma.DIVISIONES[0];
    /* C2 · el PRINCIPAL de la temporada es en qué escalón estás: es el dato que
       ordena todo lo demás de la pantalla, y la tabla es la consulta. */
    /* D2 · EL NOMBRE DEL JUEGO, ARRIBA DE TODO. El Master nunca mostro su
       propio nombre dibujado. La version horizontal es exactamente para esta
       franja: va chica, arriba del titulo de la division, sin robarle
       protagonismo al escalon en el que estas (que es el principal de la
       pantalla por C2). */
    if (this.textures.exists("d_logo_h")) {
      const lg = this.add.image(W / 2, 14, "d_logo_h").setOrigin(0.5, 0);
      lg.setScale(Math.min(230 / lg.width, 26 / lg.height));
      lg.setAlpha(0.9);
    }
    this.add.text(W / 2, 56, div.n + " · TEMPORADA " + this.save.temporadaN, { fontFamily: window.PF.display, fontSize: window.PampaPiel.nivel(1), color: "#ffd84d" }).setOrigin(0.5);
    this.add.text(W / 2, 78, this.save.club + (this.save.titulos.length ? " · ★".repeat(Math.min(5, this.save.titulos.length)) + " " + this.save.titulos.length + " títulos" : ""), { fontFamily: window.PF.texto, fontSize: "12px", color: "#f6efdc" }).setOrigin(0.5);

    /* resultado de la última fecha jugada (si venimos del partido) */
    if (this._ultimo) {
      const gano = this._ultimo.golesMio > this._ultimo.golesRival;
      const empate = this._ultimo.golesMio === this._ultimo.golesRival;
      this.add.text(W / 2, 84, (gano ? "✔ GANASTE " : empate ? "= EMPATASTE " : "✘ PERDISTE ") + this._ultimo.golesMio + "-" + this._ultimo.golesRival, { fontFamily: window.PF.texto, fontSize: "12px", fontStyle: "bold", color: gano ? "#7ee08a" : empate ? "#f6c11d" : "#e3503e" }).setOrigin(0.5);
    }

    /* LA TABLA (monospace, forma antes que color: ► marca mi fila) */
    const pos = T.posiciones(t);
    const x0 = 70, y0 = 116;
    /* A4 · la zona de descenso se marca con FORMA (▼ + línea de corte), no con
       color: el color solo no sirve. La zona no existe en la división más baja. */
    const cfgP = (this.game.registry.get("balance") || {}).partido || {};
    const idsDiv = Ma.DIVISIONES.map(d => d.id);
    const hayAbajo = idsDiv.indexOf(t.division) > 0;
    const zona = hayAbajo ? T.zonaDescenso(t, cfgP) : [];
    /* ══════════════════════════════════════════════════════════════════════
       LAS COLUMNAS, CADA UNA EN SU X.

       Antes cada fila era UN texto armado con padStart/padEnd, y el
       comentario de abajo decia "la tabla es monospace". No lo es:
       window.PF.texto es Pixelify Sans, que es PROPORCIONAL. Rellenar con
       espacios en una fuente proporcional no alinea nada — medido en la
       pasada de coherencia, los anchos de fila iban de 201 a 229 px y los
       numeros no caian debajo de su encabezado.

       Ahora cada columna es su propio texto en una x fija, con origen a la
       DERECHA en las numericas (que es como se leen los numeros) y a la
       izquierda en el nombre. Asi alinea con cualquier fuente, hoy y el dia
       que se cambie.
       ══════════════════════════════════════════════════════════════════════ */
    var COLS = [
      { k: "pj",  n: "PJ",  x: 250 },
      { k: "g",   n: "G",   x: 288 },
      { k: "e",   n: "E",   x: 322 },
      { k: "p",   n: "P",   x: 356 },
      { k: "gf",  n: "GF",  x: 402 },
      { k: "gc",  n: "GC",  x: 442 },
      { k: "dg",  n: "DG",  x: 486 },
      { k: "pts", n: "PTS", x: 534 }
    ];
    var estiloCab = { fontFamily: window.PF.texto, fontSize: "12px", color: "#f6c11d" };
    this.add.text(x0, y0 - 2, "#", estiloCab);
    this.add.text(x0 + 34, y0 - 2, "EQUIPO", estiloCab);
    COLS.forEach(function (c) {
      this.add.text(x0 + c.x, y0 - 2, c.n, estiloCab).setOrigin(1, 0);
    }, this);
    pos.forEach((f, i) => {
      const mio = f.equipo === t.miClub;
      const enZona = zona.indexOf(i + 1) >= 0;
      const dg = f.gf - f.gc;
      const y = y0 + 18 + i * 19;
      /* el nombre pasa por el mismo recorte que el marcador del partido: por
         palabra, nunca a la mitad. Antes era slice(0,17) y salia "Deportivo
         Winifre". */
      const nomClub = (window.PampaPiel && window.PampaPiel.nombreCorto)
        ? window.PampaPiel.nombreCorto(f.equipo, 18)
        : String(f.equipo).toUpperCase().slice(0, 18);
      const tinta = mio ? "#ffd84d" : (enZona ? "#e3a0a0" : "#f6efdc");
      const negrita = mio ? "bold" : "normal";
      /* N3 · el escudo del club, generado por código a partir del nombre.
         Chico (15 px) va sin inicial a propósito: a ese tamaño la letra no se
         lee y ensucia — manda la silueta, que es lo que distingue. */
      if (window.PampaEscudosUI && window.PampaEscudos) {
        const esc = window.PampaEscudosUI.deClub(this, f.equipo, pos.map(p => p.equipo), t.division);
        /* a la IZQUIERDA del número: ahí el margen ya estaba libre y no le
           entra en el medio a ninguna columna.
           (el comentario que estaba acá decía "la tabla es monospace con
           padStart" — no lo era: PF.texto es Pixelify Sans, proporcional, y
           esa premisa falsa es la que tenía las columnas desalineadas.) */
        window.PampaEscudosUI.dibujar(this, x0 - 20, y + 6, 15, esc);
      }
      /* la línea de corte: se ve DÓNDE empieza la zona aunque no leas los ▼.
         Va en y-4 y no en el medio del paso (y-9): el texto tiene origen
         arriba-izquierda, así que a media distancia la línea TACHA la fila
         de arriba en vez de separarla. Verificado en captura. */
      if (enZona && zona.indexOf(i) < 0) this.add.rectangle(x0 + 230, y - 4, 470, 1, 0xe3503e).setOrigin(0.5, 0.5).setAlpha(0.7);
      /* ── la fila, columna por columna ── */
      const est = { fontFamily: window.PF.texto, fontSize: "12px", fontStyle: negrita, color: tinta };
      /* el puesto, alineado a la derecha: 1 y 10 caen en la misma raya */
      this.add.text(x0 + 16, y, String(i + 1), est).setOrigin(1, 0);
      /* las marcas por FORMA, no por color: ► sos vos, ▼ zona de descenso */
      this.add.text(x0 + 20, y, (enZona ? "▼" : "") + (mio ? "►" : ""),
        { fontFamily: window.PF.texto, fontSize: "12px", color: mio ? "#ffd84d" : "#e3503e" });
      this.add.text(x0 + 34, y, nomClub, est);
      const vals = { pj: f.pj, g: f.g, e: f.e, p: f.p, gf: f.gf, gc: f.gc, dg: dg, pts: f.pts };
      COLS.forEach(function (c) {
        this.add.text(x0 + c.x, y, String(vals[c.k]), est).setOrigin(1, 0);
      }, this);
    });
    /* PASADA DE COHERENCIA · quedaban 85 px muertos entre la ultima fila y el
     renglon de la fecha — un sexto de pantalla vacio. Lo que sigue baja el
     bloque de la fecha para que respire arriba en vez de dejar un pozo. */
  /* A4 · el aviso: ver venir el golpe ANTES de la última fecha */
    if (T.enZonaDescenso(t, idsDiv, cfgP)) {
      const faltan = t.fixture.length - t.fecha;
      const abajo = (Ma.DIVISIONES[idsDiv.indexOf(t.division) - 1] || {}).n || "abajo";
      this.add.text(W / 2, y0 - 22,
        faltan > 0
          ? "▼ ZONA DE DESCENSO · " + T.miPosicion(t) + "º · si termina así te vas a " + abajo + " (faltan " + faltan + ")"
          : "▼ ZONA DE DESCENSO · " + T.miPosicion(t) + "º",
        /* 14 y no 12 como la tabla: es el aviso más importante de la pantalla y
           a 12 lógicos son 8.7 px reales en teléfono (la deuda de legibilidad) */
        { fontFamily: window.PF.texto, fontSize: "14px", fontStyle: "bold", color: "#e3503e" }).setOrigin(0.5);
    }

    if (!T.terminada(t)) {
      /* la PRÓXIMA fecha: rival + su perfil de IA con nombre (sabés a qué venís) */
      const mp = T.miPartido(t);
      const fechaTxt = "FECHA " + (t.fecha + 1) + " de " + t.fixture.length;
      if (mp) {
        const rival = mp.local === t.miClub ? mp.visita : mp.local;
        const localia = mp.local === t.miClub ? "(de local)" : "(de visita)";
        const perfil = Ma.perfilRival(rival);
        const tFecha = this.add.text(W / 2 + 16, H - 150, fechaTxt + " · vs " + rival.toUpperCase() + " " + localia, { fontFamily: window.PF.texto, fontSize: "13px", fontStyle: "bold", color: "#f6efdc" }).setOrigin(0.5);
        /* N3 · acá el escudo va GRANDE y con inicial: es el rival del domingo,
           la única pantalla donde mirás a un club a la cara */
        if (window.PampaEscudosUI && window.PampaEscudos) {
          const escR = window.PampaEscudosUI.deClub(this, rival, pos.map(p => p.equipo), t.division);
          window.PampaEscudosUI.dibujar(this, tFecha.x - tFecha.width / 2 - 24, H - 150, 30, escR);
        }
        this.add.text(W / 2, H - 128, "un equipo " + perfil.n, { fontFamily: window.PF.texto, fontSize: "11px", color: "#7ee08a" }).setOrigin(0.5);
        this.boton(W / 2 - 170, H - 80, 300, "▶ JUGAR LA FECHA", 0x7ee08a, () => {
          /* V8 A1: primero LA SEMANA (dos toques), después la cancha */
          this.vistaSemana(rival, () => {
            this.game.registry.set("masterPartido", {
              rival, division: this.save.division,
              mod: this.save.modFecha || null,
              origen: this.save.origen || null,
              semana: this.save.semanaResumen || null,
              mejoras: this.save.mejoras || null
            });
            /* M5 · el tema de la semana no cruza a la cancha. No hace falta
               pedir nada acá: el corte cuelga del shutdown de la escena (una
               vez, en el mixin) y funde 300 ms mientras el partido pide su
               entrada. Probé poner "entrada" acá primero y se cortaba a los dos
               cuadros — vive en match.js, que es donde tiene lugar para sonar. */
            this.scene.start("match");
          });
        });
      } else {
        this.add.text(W / 2, H - 140, fechaTxt + " · FECHA LIBRE (descansás)", { fontFamily: window.PF.texto, fontSize: "13px", color: "#f6efdc" }).setOrigin(0.5);
        this.boton(W / 2 - 170, H - 80, 300, "▶ PASAR LA FECHA", 0x7ee08a, () => {
          this.T.jugarFecha(t, null, null);
          this.guardar();
          this.scene.restart();
        });
      }
      this.boton(W / 2 + 170, H - 80, 280, "✎ EDITOR / PINTA", 0xf6efdc, () => this.scene.start("editor"));
    } else {
      /* FIN DE TEMPORADA: el veredicto de la escalera */
      const v = T.veredicto(t, Ma.DIVISIONES.map(d => d.id), cfgP);
      let msj, color;
      /* M4 · idem "hype" (Ascenso, título, gloria): declarado, con archivo y sin
         nadie que lo pida. Este es el momento para el que fue escrito. */
      if (v.gloria || v.asciende || v.campeon) this.pedirMusica("hype");
      if (v.gloria) { msj = "🏆 ¡CAMPEÓN DEL MUNDO! LA GLORIA ETERNA"; color = "#ffd84d"; }
      else if (v.asciende) { msj = "🏆 ¡CAMPEÓN! SUBÍS A " + (Ma.DIVISIONES.find(d => d.id === v.proximaDivision) || {}).n; color = "#ffd84d"; }
      /* A4 · con todas las letras: se dice que se descendió y a dónde */
      else if (v.desciende) { msj = "▼ DESCENSO · terminaste " + v.posicion + "º y bajás a " + (Ma.DIVISIONES.find(d => d.id === v.proximaDivision) || {}).n; color = "#e3503e"; }
      else { msj = "Terminaste " + v.posicion + "º — otra temporada en " + div.n; color = "#f6efdc"; }
      this.add.text(W / 2, H - 140, msj, { fontFamily: window.PF.display, fontSize: "11px", color }).setOrigin(0.5);
      this.boton(W / 2 - 170, H - 80, 320, "▶ NUEVA TEMPORADA", 0x7ee08a, () => {
        if (v.campeon) this.save.titulos.push({ division: this.save.division, temporada: this.save.temporadaN });
        this.save.division = v.proximaDivision;
        this.save.temporadaN++;
        this.save.temporada = this.T.crear({
          division: this.save.division, miClub: this.save.club,
          rivales: this.DIV.divisiones[this.save.division].rivales,
          semilla: this.Ma.hashClub(this.save.club) * 31 + this.save.temporadaN
        });
        this.guardar();
        this.scene.restart();
      });
      this.boton(W / 2 + 170, H - 80, 280, "✎ EDITOR / PINTA", 0xf6efdc, () => this.scene.start("editor"));
    }
  }
};

/* PIEL P2: las pantallas de esta escena se arman de una sola vez (no hay
   update que barra), así que se visten los botones al terminar de construir
   cada vista. Se envuelven los métodos en vez de tocar su cuerpo: así el día
   que se agregue una vista nueva, basta con sumarla a esta lista. */
["create", "vistaSemana", "vistaElegirDia", "vistaFecha", "vistaTabla", "vistaResultado"]
  .forEach(function (n) {
    var orig = window.PampaMasterScene.prototype[n];
    if (typeof orig !== "function") return;
    window.PampaMasterScene.prototype[n] = function () {
      var r = orig.apply(this, arguments);
      if (this.vestirPendientes) this.vestirPendientes();
      return r;
    };
  });

