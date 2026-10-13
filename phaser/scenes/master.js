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

  /* ══════════════════════════════════════════════════════════════════════
     P1 · ESTA ESCENA NO TENÍA init().

     Phaser reusa la instancia en cada scene.start("master") y en cada
     restart(), así que lo que una vista deja anotado (los atajos de teclado
     vivos, el reloj de la semana, el evento sorteado) llegaba prendido a la
     entrada siguiente. Lo que es memoria de UNA entrada arranca acá de cero.
     ══════════════════════════════════════════════════════════════════════ */
  init() {
    this._atajos = [];
    this._relojSem = null;
    this._mapaCapa = null;
    this._semEvento = undefined;
    this._semEventoResuelto = false;
    this._musicaSemanaPuesta = false;
    /* la caja del código de carrera (DOM): si quedó abierta, se va */
    this.cerrarCaja();
    this._cajaGancho = false;
    /* L04: a dónde lleva el atrás del teléfono desde la vista a la vista
       (null = al editor, que es de donde se entra al Master) */
    this._atrasVista = null;
    /* L07: la marca "⚠ ESTE NAVEGADOR NO GUARDA TU CARRERA" es de cada vista */
    this._marcaSG = null;
  }

  /* ══════════════════════════════════════════════════════════════════════
     VACIAR LA VISTA, DE VERDAD.

     Las cinco vistas que se repintan sin cambiar de escena (la entrevista, la
     semana, el evento, el día suelto y la confirmación de borrar) limpiaban
     con el removeAll del DisplayList. En Phaser 3.80.1 eso es
     Structs.List.removeAll(skipCallback): SACA de la lista de dibujo pero NO
     DESTRUYE, y con removeAll(true) tampoco (el true solo saltea los
     callbacks). Los objetos quedaban vivos, invisibles y TOCABLES. Medido en la
     auditoría: tocar un rincón vacío de la semana abría "¿EMPEZAR OTRA
     CARRERA?" (el ✕ de la tabla seguía ahí abajo), y la semana pasaba de 14
     zonas táctiles a 47 después de tres elecciones.

     Ahora se destruye todo lo que hay, y con ello sus zonas táctiles. Antes se
     cierran el cursor (su contenedor también es un hijo), los atajos de
     teclado de la vista y el reloj de la semana, que si no seguían corriendo
     detrás de la vista nueva.
     ══════════════════════════════════════════════════════════════════════ */
  vaciarVista() {
    if (this.cerrarFoco) this.cerrarFoco();
    this.soltarAtajos();
    this._atrasVista = null;   // L04: cada vista dice a dónde vuelve (ver alAtras)
    if (this._relojSem) { this._relojSem.remove(false); this._relojSem = null; }
    this._mapaCapa = null;
    this.children.list.slice().forEach((o) => { if (o && o.destroy) o.destroy(); });
  }

  /* ══════════════════════════════════════════════════════════════════════
     LOS ATAJOS DE UNA VISTA SE VAN CON LA VISTA.

     Eran keyboard.once en cada repintado: cada once que no se disparaba
     quedaba vivo, y al repintar se sumaban diez más. Medido: después de un
     toque con el mouse, UNA tecla llenaba DOS días de la semana (y en la
     entrevista, la tecla de la pregunta 2 contestaba también la 1). Ahora
     cada atajo se anota, y vaciarVista() los suelta todos antes de pintar la
     vista siguiente: una tecla, una ranura, siempre.
     ══════════════════════════════════════════════════════════════════════ */
  atajo(tecla, fn) {
    const kb = this.input && this.input.keyboard;
    if (!kb) return null;
    const ev = "keydown-" + tecla;
    kb.on(ev, fn);
    this._atajos.push([ev, fn]);
    return fn;
  }
  soltarAtajos() {
    const kb = this.input && this.input.keyboard;
    (this._atajos || []).forEach((p) => { if (kb) kb.off(p[0], p[1]); });
    this._atajos = [];
  }

  /* ══════════════════════════════════════════════════════════════════════
     L04 · EL ATRÁS DEL TELÉFONO EN EL MASTER: la vista anterior.

     Antes el gesto atrás del teléfono sacaba de la página desde cualquier
     vista (0 oyentes de popstate). Ahora cada vista que no es "la de
     arriba" deja dicho a dónde vuelve en _atrasVista, y vaciarVista() lo
     borra al cambiar: la semana y el evento vuelven a la tabla, el día
     suelto a la semana, la entrevista a la pregunta anterior, el código y
     ¿EMPEZAR OTRA CARRERA? a la tabla. La tabla, elegir club y el save roto
     vuelven al editor, que es de donde se entra. Con la caja del código
     abierta, atrás la cierra (como su ✕ CANCELAR).
     ══════════════════════════════════════════════════════════════════════ */
  estadoAtras() {
    return { escena: "master", cajaAbierta: !!(this._caja && this._caja.el) };
  }
  alAtras(d) {
    if (d === "cerrar_menu") { this.cerrarCaja(); return true; }
    if (d !== "volver") return false;
    if (this._caja && this._caja.el) { this.cerrarCaja(); return true; }
    const S = window.PampaSFX; if (S && S.ui) S.ui("volver");
    if (this._atrasVista) this._atrasVista();
    else this.irA("editor");
    return true;
  }

  /* A1 · los retratos de los personajes CON NOMBRE (Nito, el DT, el utilero).
     Viven en portraits_manifest.personajes y no en el pool `retratos`, que el
     partido usa para dar cara al azar: si estuvieran ahi, Nito podria salir de
     defensor del rival. */
  preload() {
    /* L05: lo que no baja se vuelve a pedir una vez (logic/carga.js). Antes
       el Master no escuchaba el error: un logo o una pose que fallaban
       quedaban afuera sin reintento. */
    if (window.PampaCarga) window.PampaCarga.reintentarUnaVez(this.load);
    if (this.barraDeCarga) this.barraDeCarga("la carrera");   // L06: el avance con número, no el lienzo en negro
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
    this.entrarDesdeNegro();
    /* L06 (carga-liviana): lo del partido, en segundo plano mientras se mira
       la tabla y la semana (si se entró directo al Master, sin pasar por el editor) */
    if (this.calentarElPartido) this.calentarElPartido();
    /* L04 · EL ATRÁS DEL TELÉFONO. index.html decide con logic/atras.js
       (estadoAtras, abajo) y manda la decisión. Va arriba de todo: create()
       sale temprano en varias vistas (save roto, falta de datos) y en todas
       el atrás tiene que andar. El emisor del juego sobrevive a la escena:
       el oyente se va con el shutdown, como el del partido. */
    const alAtrasDelTelefono = (ev) => { if (ev && ev.escena === "master") this.alAtras(ev.decision); };
    this.game.events.on("atras", alAtrasDelTelefono);
    this.events.once("shutdown", () => this.game.events.off("atras", alAtrasDelTelefono));
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
      this.input.once("pointerdown", () => this.irA("editor"));
      return;
    }

    /* ══════════════════════════════════════════════════════════════════════
       TANDA 1.0 · EL SAVE SE SANEA ANTES DE USARLO.

       Era JSON.parse y adelante: medido en el navegador, un save sin `titulos`
       tiraba TypeError en la tabla y uno sin `tabla` en la temporada, y la
       pantalla quedaba sin botones en CADA entrada. Un texto cortado caía en
       silencio a elegir club y la carrera nueva lo pisaba sin respaldo.

       Ahora logic/save_master.sanear() completa lo que falta, valida la
       temporada y la prueba con la lógica de verdad. Lo que arregla se guarda
       arreglado. Lo que no tiene arreglo se RESPALDA tal cual en
       pampa_master_v1_corrupta y se dice en pantalla (vistaSaveRoto).
       ══════════════════════════════════════════════════════════════════════ */
    this.save = null;
    let crudo = null;
    try { crudo = localStorage.getItem("pampa_master_v1"); } catch (e) { }
    const SM = window.PampaSaveMaster;
    if (SM && SM.sanear) {
      const r = SM.sanear(crudo, this.idsDeDivisiones(), this.opcionesDeSaneo());
      if (r.irrecuperable) {
        this.respaldarCorrupta(crudo);
        this.vistaSaveRoto(r.motivo);
        return;
      }
      this.save = r.save;
      if (this.save && r.reparado.length) {
        console.warn("[master] la carrera guardada se reparó: " + r.reparado.join(" · "));
        this.guardar();
      }
    } else {
      try { if (crudo) this.save = JSON.parse(crudo); } catch (e) { }
    }
    /* SECCIÓN 11 · LA PARTIDA GUARDADA SE PONE AL DÍA. Los rivales de las
       divisiones pasaron de clubes reales a ficticios y tu club dejó de
       llamarse "Club " + localidad. Una temporada en curso los tiene escritos:
       los rivales se traducen por POSICIÓN (la tabla guarda el orden de la
       división) y tu club por su nombre viejo reconocible. Se guarda una vez. */
    if (this.save && this.save.temporada && this.T && this.T.renombrarPorPosicion) {
      let cambio = false;
      const tp = this.save.temporada, dvs = this.DIV.divisiones[tp.division];
      if (this.Ma.esNombreViejoDeTuClub(this.save.club, this.save.pueblo)) {
        const nuevo = this.Ma.nombreDeTuClub(this.save.pueblo, this.game.registry.get("roster"));
        const mapa = {}; mapa[this.save.club] = nuevo;
        this.T.renombrarEquipos(tp, mapa);
        this.save.club = nuevo;
        cambio = true;
      }
      if (dvs && this.T.renombrarPorPosicion(tp, dvs.rivales)) cambio = true;
      if (cambio) this.guardar();
    }
    /* ARTE: con la partida leída ya se sabe la división: su cancha va de fondo */
    if (this.fondoDeLaDivision) { try { this.fondoDeLaDivision(); } catch (e) { /* queda el radial */ } }

    /* ¿volvemos de un partido de la fecha? el resultado viene por el registry.
       (§4 inline: scene.restart() reusa la instancia — _ultimo se limpia acá
       para que el cartel del resultado viejo no reaparezca tras un restart) */
    this._ultimo = null;
    /* TANDA 1.0 · EL RESULTADO LLEGA POR DOS LADOS Y SE APLICA UNA VEZ.
       Antes venía SOLO por el registry, que es memoria de la página: cerrar la
       pestaña en GANASTE perdía la fecha. Ahora el partido lo anota en el save
       al pitazo (resultadoPendiente) y el registry queda de respaldo por si el
       save no se pudo escribir. Vale el que es de ESTA fecha (temporada +
       fecha): aplicado, la fecha avanza y ningún resultado vuelve a coincidir,
       así que crear la escena dos veces no juega la fecha dos veces. */
    const S0 = window.PampaSemana;
    const resReg = this.game.registry.get("masterResultado");
    this.game.registry.remove("masterResultado");
    let res = null;
    if (this.save && this.save.temporada) {
      res = S0 && S0.resultadoQueCorresponde
        ? S0.resultadoQueCorresponde(this.save, this.save.resultadoPendiente, resReg)
        : resReg;
      /* un pendiente que no es de esta fecha ya se aplicó o es de otra carrera */
      if (this.save.resultadoPendiente && res !== this.save.resultadoPendiente) {
        this.save.resultadoPendiente = null;
        this.guardar();
      }
    }
    if (res) {
      this.save.resultadoPendiente = null;
      this.save.enCancha = null;
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

    /* L07 · ¿este navegador guarda? (ver sinGuardar). Con la partida ya
       leída, para que el aviso sepa si ofrecer el código de carrera */
    if (!this.guardadoAnda()) this.sinGuardar();

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



  /* L07 · guardar() DICE SI GUARDÓ. Era "try { localStorage.setItem(…) }
     catch (e) { }": con el almacenamiento bloqueado (el iframe de un medio
     con las cookies de terceros bloqueadas, un navegador con los datos del
     sitio bloqueados) o lleno, el error se tragaba en silencio y se jugaban
     horas creyendo que quedaba guardado. Ahora devuelve true o false, y la
     primera vez que da false se avisa (sinGuardar, abajo). */
  guardar() {
    let ok = false;
    try { localStorage.setItem("pampa_master_v1", JSON.stringify(this.save)); ok = true; } catch (e) { ok = false; }
    if (!ok) this.sinGuardar();
    return ok;
  }

  /* ══════════════════════════════════════════════════════════════════════
     L07 · "EN ESTE NAVEGADOR TU CARRERA NO SE GUARDA"
     (navegadores-de-redes-y-guardado)

     Dos maneras de enterarse: al entrar al Master se prueba el
     almacenamiento (logic/entorno.js, guardadoAndando: escribir, leer y
     borrar una clave), y cada guardar() que falla. Lo que se sabe queda en
     el registry ("sinGuardar"), que dura toda la sesión, porque el Master
     se reinicia en cada vista.
       · la PRIMERA vez en la sesión, la caja con qué pasa y qué hacer:
         💾 CÓDIGO DE CARRERA (si ya hay carrera) y ▶ SEGUIR IGUAL;
       · y FIJO, en la tabla y al elegir club, arriba a la izquierda (el
         hueco medido en captura: el logo de arriba al centro empieza en
         x≈365 y el título de elegir club en x≈370): "⚠ ESTE NAVEGADOR NO
         GUARDA TU CARRERA", que vuelve a abrir la caja. Con el ⚠ y las
         palabras, no solo el color.
     ══════════════════════════════════════════════════════════════════════ */
  guardadoAnda() {
    /* la prueba que hizo index.html al abrir (window.PAMPA_GUARDADO); si dio
       que no, no hace falta volver a probar */
    if (window.PAMPA_GUARDADO === false) return false;
    const E = window.PampaEntorno;
    if (!E || !E.guardadoAndando) return true;
    let almacen = null;
    try { almacen = localStorage; } catch (e) { almacen = null; }
    return E.guardadoAndando(almacen);
  }
  sinGuardar() {
    const reg = this.game.registry;
    reg.set("sinGuardar", true);
    if (this.add) this.marcaSinGuardar();
    if (!reg.get("sinGuardarAvisado")) {
      reg.set("sinGuardarAvisado", true);
      this.avisoSinGuardar();
    }
  }
  avisoSinGuardar() {
    const hay = !!this.save;
    return this.cajaDeTexto({
      titulo: "⚠ En este navegador tu carrera NO se guarda",
      texto: hay
        ? "Si cerrás esta página, la carrera se pierde. Guardá tu código de carrera en un mensaje o en una nota: con él la seguís en otro navegador. Para que se guarde sola, abrí el juego en el navegador del teléfono (Chrome o Safari) o instalalo."
        : "Podés jugar igual, pero al cerrar esta página la carrera se pierde. Para que se guarde, abrí el juego en el navegador del teléfono (Chrome o Safari) o instalalo.",
      sinCaja: true,
      botones: (hay && window.PampaCarrera ? [{ texto: "💾 CÓDIGO DE CARRERA", principal: true, accion: () => { this.cerrarCaja(); this.vistaCodigo(); } }] : [])
        .concat([{ texto: "▶ SEGUIR IGUAL", principal: !hay, accion: () => this.cerrarCaja() }])
    });
  }
  marcaSinGuardar() {
    if (!this.game.registry.get("sinGuardar")) return null;
    if (this._marcaSG && this._marcaSG.scene) return this._marcaSG;
    const t = this.add.text(12, 8, "⚠ ESTE NAVEGADOR NO GUARDA TU CARRERA", {
      fontFamily: window.PF.texto, fontSize: "13px", color: "#ffd84d",
      backgroundColor: "#0a1f13ee", padding: { x: 8, y: 4 }
    }).setOrigin(0, 0).setDepth(80);
    if (this.pisoTactil) this.pisoTactil(t);
    if (!t.input) t.setInteractive({ useHandCursor: true });
    t.on("pointerdown", (p, xx, yy, ev) => {
      ev && ev.stopPropagation && ev.stopPropagation();
      const S = window.PampaSFX; if (S && S.ui) S.ui("abrir");
      this.avisoSinGuardar();
    });
    this._marcaSG = t;
    return t;
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
  /* ══════════════════════════════════════════════════════════════════════
     NO SE PODIA EMPEZAR DE NUEVO. NUNCA.

     Verificado: no habia UNA SOLA linea en todo el juego que borrara o
     reiniciara el save. El que elegia mal el club en la primera pantalla, o el
     que despues queria probar otro pueblo, quedaba encerrado en esa carrera
     para siempre. No es de los bugs que molestan: es de los que hacen dejar
     el juego.

     DOS DECISIONES SOBRE COMO SE HACE, Y LAS DOS IMPORTAN:

     1. LA SALIDA ESTA DONDE SE ENTRA. El acceso vive en la pantalla de la
        temporada y lleva a la de elegir club, que es donde empezaste. Nadie
        va a buscar "borrar carrera" en un menu de opciones que no existe.

     2. PIDE CONFIRMACION EXPLICITA, NO UN TOQUE SUELTO. Borrar una carrera de
        cinco temporadas por accidente es peor que no poder borrarla. La
        pantalla de confirmacion DICE QUE SE PIERDE con numeros —el club, la
        division, la temporada, los titulos, las fechas jugadas— y el boton
        que borra dice lo que hace, no dice "OK".

     Y ademas GUARDA UN RESPALDO antes de borrar. No hay como recuperarlo desde
     el juego (eso seria otra pantalla), pero queda en localStorage bajo
     pampa_master_v1_borrada y se puede rescatar a mano. Borrar sin red no hace
     falta cuando la red cuesta una linea.
     ══════════════════════════════════════════════════════════════════════ */
  /* ══════════════════════════════════════════════════════════════════════
     TUS STATS DE HOY.

     logic/semana.js tiene rendimiento decreciente desde A1 —cuanto mas alta
     la stat, menos suma entrenar— con toda su calibracion y su test. Y NUNCA
     CORRIO EN EL JUEGO: rendimiento() arranca con

         if (!cfg || !cfg.stats || ...) return cuanto;

     y los dos llamadores reales pasaban balance.semana pelado, sin stats. El
     comentario de esa funcion lo dice sin querer: "sin cfg.stats esto devuelve
     el valor entero y todo se comporta como antes: los llamadores viejos no se
     enteran". Era un camino de migracion seguro y la migracion nunca se hizo.

     Medido: con la stat en 95, el JUEGO sumaba +1,00 y el TEST +0,13. Siete
     veces y media de diferencia. Toda la tabla de calibracion de
     balance.semana._rendimiento describia una curva que solo existia en la
     simulacion — igual que ayudar_casa y estudiar, construido, documentado,
     discutido y desconectado.

     Se componen como las compone el partido: la base del catalogo, mas lo que
     dejo el origen, mas las mejoras acumuladas de las semanas.
     ══════════════════════════════════════════════════════════════════════ */
  statsDeHoy() {
    const cfg = (this.game.registry.get("balance") || {}).semana || {};
    const base = cfg.stat_inicial != null ? cfg.stat_inicial : 50;
    const techo = cfg.stat_techo != null ? cfg.stat_techo : 99;
    const out = {};
    ["tiro", "gambeta", "pase", "resistencia", "fisico", "velocidad", "aereo", "caracter"]
      .forEach((k) => { out[k] = base; });
    const org = this.save && this.save.origen && this.save.origen.stats;
    if (org) Object.keys(org).forEach((k) => { if (out[k] != null) out[k] += org[k]; });
    const mej = this.save && this.save.mejoras;
    if (mej) Object.keys(mej).forEach((k) => { if (out[k] != null) out[k] += mej[k]; });
    Object.keys(out).forEach((k) => { out[k] = Math.max(1, Math.min(techo, out[k])); });
    return out;
  }
  /* ══════════════════════════════════════════════════════════════════════
     REVISIÓN L03 · LOS DOS ACCESOS DE ABAJO, AL PISO TÁCTIL.
     "✕ empezar otra carrera" y "💾 código de carrera" son textos chicos (no
     botones), y vestirPendientes solo agranda Rectangles: medido en el
     navegador, el 💾 tocaba en 140x21 lógicos, unos 15 px CSS de alto en el
     teléfono contra el piso de 61 lógicos (44 CSS) de legibilidad.tap_min.
     Ahora pasan por pisoTactil, que agranda el ÁREA centrada sin tocar el
     dibujo, y la letra sube de 12 a 13. Siguen siendo discretos a propósito:
     no compiten con JUGAR.
     OJO CON EL ORDEN: pisoTactil va ANTES de hacerlo tocable. En Phaser 3.80
     setInteractive(área) sobre un objeto que ya tiene input solo lo habilita
     y IGNORA el área nueva (InputPlugin.enable). Medido en el navegador: con
     el orden al revés quedaba en 178x22 aunque _tapArea dijera 61. */
  accesoDeAbajo(x, H, texto, origenX, cb) {
    const t = this.add.text(x, H - 26, texto, {
      fontFamily: window.PF.texto, fontSize: "13px", color: "#9fb3a5",
      backgroundColor: "#0a1f13aa", padding: { x: 8, y: 4 }
    }).setOrigin(origenX, 0.5);
    if (this.pisoTactil) this.pisoTactil(t);
    if (!t.input) t.setInteractive({ useHandCursor: true });
    t.on("pointerdown", (p, xx, yy, ev) => {
      ev && ev.stopPropagation && ev.stopPropagation();
      const S = window.PampaSFX; if (S && S.ui) S.ui("abrir");
      cb();
    });
    return t;
  }
  salidaDeLaCarrera(W, H) {
    return this.accesoDeAbajo(20, H, "✕ empezar otra carrera", 0, () => this.vistaBorrarCarrera());
  }

  /* "temporada 2 · fecha 8 de 18", o "temporada 2 terminada · 18 de 18
     fechas" si ya se jugó todo. Revisión L03: con la temporada terminada
     t.fecha === fixture.length (temporada.terminada) y las dos pantallas que
     muestran esto (el código de carrera y ¿EMPEZAR OTRA CARRERA?, las dos
     alcanzables desde FIN DE TEMPORADA) decían "fecha 19 de 18". */
  lineaDeLaTemporada(n, t) {
    const total = ((t && t.fixture) || []).length, f = (t && t.fecha) | 0;
    if (total && f >= total) return "temporada " + n + " terminada · " + total + " de " + total + " fechas";
    return "temporada " + n + " · fecha " + (f + 1) + " de " + (total || "?");
  }
  /* el resumen de lo que estas por perder, con numeros */
  resumenDeLaCarrera() {
    const sv = this.save;
    if (!sv) return null;
    const t = sv.temporada || {};
    const div = (this.Ma.DIVISIONES.find(d => d.id === sv.division) || {}).n || sv.division;
    return {
      club: sv.club, division: div,
      temporada: sv.temporadaN | 0,
      titulos: (sv.titulos || []).length,
      fechas: t.fecha | 0,
      total: (t.fixture || []).length,
      linea: this.lineaDeLaTemporada(sv.temporadaN | 0, t)
    };
  }

  vistaBorrarCarrera() {
    const W = this.scale.width, H = this.scale.height;
    const r = this.resumenDeLaCarrera();
    if (!r) { this.scene.restart(); return; }
    this.vaciarVista();
    this._atrasVista = () => this.scene.restart();   // L04: atrás = SEGUIR, a la tabla
    /* ARTE: el radial y la cancha de tu división (cine_arte.js) */
    if (this.fondoDelMaster) this.fondoDelMaster(); else this.fondoDePiel();

    this.add.text(W / 2, 60, "¿EMPEZAR OTRA CARRERA?", {
      fontFamily: window.PF.display, fontSize: "18px", color: "#e3503e" }).setOrigin(0.5);
    this.add.text(W / 2, 94, "esto BORRA la carrera que estás jugando. No se puede deshacer desde el juego.", {
      fontFamily: window.PF.texto, fontSize: "14px", color: "#f6efdc" }).setOrigin(0.5);

    /* LO QUE SE PIERDE, con numeros. Un "¿estás seguro?" pelado no le dice a
       nadie cuanto vale lo que esta por tirar. */
    const caja = this.add.rectangle(W / 2, 210, 560, 150, 0x0a1f13, 0.8).setStrokeStyle(3, 0xe3503e, 0.9);
    this.add.text(W / 2, 152, "LO QUE SE PIERDE", {
      fontFamily: window.PF.texto, fontSize: "12px", color: "#e3503e" }).setOrigin(0.5);
    const lineas = [
      r.club + " · " + r.division,
      r.linea,
      r.titulos === 1 ? "1 título ganado" : r.titulos + " títulos ganados"
    ];
    lineas.forEach((l, i) => {
      this.add.text(W / 2, 186 + i * 28, l, {
        fontFamily: window.PF.texto, fontSize: i === 0 ? "17px" : "14px",
        fontStyle: i === 0 ? "bold" : "normal", color: i === 0 ? "#f6efdc" : "#dcd6c2" }).setOrigin(0.5);
    });

    /* los caminos, y el que borra DICE que borra.
       REVISIÓN L03 · el del medio: el código de carrera dice "pegalo en
       MODO MASTER → PEGAR UN CÓDIGO", pero ese botón está solo en elegir
       club, que no aparece si el teléfono ya tiene una carrera. Acá, donde
       ya se dice qué se pierde, se puede traer otra con un código: la de
       ahora queda respaldada igual que al borrarla (importarCarrera). */
    const piel = (this.game.registry.get("balance") || {}).piel;
    const yA = Math.round(window.PampaPiel.yDeOpcion(0, 3, 60, piel));
    const yP = Math.round(window.PampaPiel.yDeOpcion(1, 3, 60, piel));
    const yB = Math.round(window.PampaPiel.yDeOpcion(2, 3, 60, piel));
    const seguir = this.boton(W / 2, yA, 460, "◀ NO, SEGUIR CON ESTA CARRERA", 0x7ee08a, () => {
      const S = window.PampaSFX; if (S && S.ui) S.ui("volver");
      this.scene.restart();
    });
    const pegarEnSuLugar = () => { const S = window.PampaSFX; if (S && S.ui) S.ui("abrir"); this.pegarCodigo(true); };
    const pegar = window.PampaCarrera ? this.boton(W / 2, yP, 460, "📋 PEGAR UN CÓDIGO EN SU LUGAR", 0xffd84d, pegarEnSuLugar) : null;
    const borrar = this.boton(W / 2, yB, 460, "✕ SÍ, BORRAR Y ELEGIR OTRO CLUB", 0xe3503e, () => {
      const S = window.PampaSFX; if (S && S.ui) S.ui("confirmar");
      this.borrarCarrera();
    });
    /* arriba de los botones y no en H-22: ahi abajo cae el boton rojo y el pie
       le quedaba encima (se ve en SALIDA_02). Y aca ademas se lee ANTES de
       elegir, que es cuando sirve. */
    this.add.text(W / 2, 297, "el respaldo queda guardado en el navegador, pero no se puede volver desde acá", {
      fontFamily: window.PF.texto, fontSize: "12px", color: "#7a8a80" }).setOrigin(0.5);

    /* el cursor arranca en SEGUIR, nunca en borrar: si te equivocaste de tecla
       al llegar acá, el Enter de reflejo no te tiene que costar la carrera */
    if (this.grupoFoco) {
      this.grupoFoco([
        { obj: seguir, cb: () => { this.scene.restart(); } },
        pegar ? { obj: pegar, cb: pegarEnSuLugar } : null,
        { obj: borrar, cb: () => { this.borrarCarrera(); } }
      ].filter(Boolean), { inicial: 0, volver: () => this.scene.restart() });
    }
    this.vestirPendientes && this.vestirPendientes();
  }

  borrarCarrera() {
    try {
      const viejo = localStorage.getItem("pampa_master_v1");
      /* la red: se guarda antes de borrar. Cuesta una linea. */
      if (viejo) localStorage.setItem("pampa_master_v1_borrada", viejo);
      localStorage.removeItem("pampa_master_v1");
    } catch (e) { }
    this.save = null;
    /* la semana y el partido pendiente mueren con la carrera: si quedaran,
       la carrera nueva arrancaria con la semana de la vieja */
    this.game.registry.set("masterPartido", null);
    this.game.registry.set("masterResultado", null);
    this.game.registry.set("carreraPendiente", null);
    this.scene.restart();
  }

  /* ══════════════════════════════════════════════════════════════════════
     TANDA 1.0 · LO QUE NECESITA EL SANEO DEL SAVE (logic/save_master.js)

     Las divisiones que valen son las que están en la escalera (logic/master)
     Y tienen rivales en data/divisiones.json: una sin la otra no se juega.
     Si la temporada guardada no tiene arreglo, se vuelve a empezar con la
     misma cuenta de siempre (la de _crearCarrera y NUEVA TEMPORADA).
     ══════════════════════════════════════════════════════════════════════ */
  idsDeDivisiones() {
    const divs = (this.DIV && this.DIV.divisiones) || {};
    return this.Ma.DIVISIONES.map(d => d.id).filter(id => divs[id] && Array.isArray(divs[id].rivales));
  }
  opcionesDeSaneo() {
    return {
      rivalesDe: (div) => ((this.DIV.divisiones[div] || {}).rivales || null),
      crearTemporada: (div, club, n) => this.T.crear({
        division: div, miClub: club,
        rivales: this.DIV.divisiones[div].rivales,
        semilla: this.Ma.hashClub(club) * 31 + (n | 0 || 1)
      })
    };
  }
  /* el texto tal cual estaba, aparte: si alguien que sabe lo arregla, la
     carrera se recupera. Se pisa solo con otro texto roto. */
  respaldarCorrupta(crudo) {
    try { if (crudo != null) localStorage.setItem("pampa_master_v1_corrupta", String(crudo)); } catch (e) { }
  }
  /* la carrera guardada no se pudo leer: se dice, y hay dos salidas */
  vistaSaveRoto(motivo) {
    const W = this.scale.width, H = this.scale.height;
    this.vaciarVista();
    if (this.fondoDelMaster) this.fondoDelMaster(); else this.fondoDePiel();
    /* ✗ + palabras: el rojo solo no dice nada (Rodri es daltónico). El
       título no repite la frase de abajo (revisión L03: decía lo mismo dos
       veces seguidas y se leía como un error de armado) */
    this.add.text(W / 2, 96, "✗ HAY UN PROBLEMA CON TU CARRERA", {
      fontFamily: window.PF.display, fontSize: "15px", color: "#e3503e" }).setOrigin(0.5);
    this.add.text(W / 2, 140, "Tu carrera guardada no se pudo leer. Quedó un respaldo.", {
      fontFamily: window.PF.texto, fontSize: "17px", color: "#f6efdc" }).setOrigin(0.5);
    this.add.text(W / 2, 176, (motivo ? "(" + motivo + ") " : "") +
      "El texto quedó guardado aparte en este navegador: si tenés un código de carrera, podés pegarlo al empezar otra.", {
      fontFamily: window.PF.texto, fontSize: "13px", color: "#dcd6c2", align: "center", wordWrap: { width: 760 } }).setOrigin(0.5, 0);
    const piel = (this.game.registry.get("balance") || {}).piel;
    const yA = Math.round(window.PampaPiel.yDeOpcion(0, 2, 60, piel));
    const yB = Math.round(window.PampaPiel.yDeOpcion(1, 2, 60, piel));
    const empezar = this.boton(W / 2, yA, 420, "▶ EMPEZAR OTRA", 0x7ee08a, () => this.empezarDeCero());
    const volver = this.boton(W / 2, yB, 420, "✎ VOLVER AL EDITOR", 0xf6efdc, () => this.irA("editor"));
    /* el cursor arranca en VOLVER: empezar otra no se elige con un Enter de reflejo */
    if (this.grupoFoco) {
      this.grupoFoco([
        { obj: empezar, cb: () => this.empezarDeCero() },
        { obj: volver, cb: () => this.irA("editor") }
      ], { inicial: 1, volver: () => this.irA("editor") });
    }
    this.vestirPendientes && this.vestirPendientes();
  }
  /* empezar de cero después de un save roto: el texto ya quedó en
     pampa_master_v1_corrupta, así que acá se borra sin tocar el respaldo de
     una carrera borrada a propósito (pampa_master_v1_borrada) */
  empezarDeCero() {
    try { localStorage.removeItem("pampa_master_v1"); } catch (e) { }
    this.save = null;
    this.game.registry.set("masterPartido", null);
    this.game.registry.set("masterResultado", null);
    this.scene.restart();
  }

  /* ══════════════════════════════════════════════════════════════════════
     TANDA 1.0 · EL CÓDIGO DE CARRERA (logic/carrera.js)

     La carrera son de 10 a 37 horas y vivía solo en localStorage, sin forma
     de sacarla ni de pasarla a otro teléfono. Ahora:
       · en la tabla, "💾 código de carrera" la muestra como texto para
         copiar o compartir (por mensaje, a una nota);
       · al elegir club, "📋 PEGAR UN CÓDIGO" la trae de vuelta, con la misma
         fecha y la misma tabla. Lo que hubiera antes queda respaldado en
         pampa_master_v1_borrada, y un código alterado se rechaza con su
         motivo SIN tocar nada;
       · al crear o traer una carrera se le pide al navegador que no borre el
         almacenamiento (navigator.storage.persist).
     El texto se pega en una caja del DOM (un textarea): es lo único que
     acepta "mantener apretado → pegar" en cualquier teléfono.
     ══════════════════════════════════════════════════════════════════════ */
  pedirQueNoSeBorre() {
    try {
      if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(() => { });
      }
    } catch (e) { }
  }
  accesoAlCodigo(W, H) {
    if (!window.PampaCarrera) return null;
    /* espejo de la salida (abajo a la izquierda): el mismo tamaño, la misma
       forma y el mismo piso táctil, abajo a la derecha. No compite con JUGAR. */
    return this.accesoDeAbajo(W - 20, H, "💾 código de carrera", 1, () => this.vistaCodigo());
  }
  vistaCodigo() {
    const W = this.scale.width, H = this.scale.height, C = window.PampaCarrera;
    if (!C || !this.save) { this.scene.restart(); return; }
    const codigo = C.exportar(this.save);
    this.vaciarVista();
    this._atrasVista = () => this.scene.restart();   // L04: como ◀ VOLVER A LA TABLA
    if (this.fondoDelMaster) this.fondoDelMaster(); else this.fondoDePiel();
    this.add.text(W / 2, 46, "💾 CÓDIGO DE CARRERA", { fontFamily: window.PF.display, fontSize: "16px", color: "#ffd84d" }).setOrigin(0.5);
    /* revisión L03: PEGAR UN CÓDIGO está en elegir club, que no aparece si el
       teléfono ya tiene una carrera; ahí está en ✕ empezar otra carrera */
    this.add.text(W / 2, 74, "Tu carrera entera, en un texto. Guardalo en un mensaje o en una nota: si el teléfono borra el juego, o si cambiás de teléfono, lo pegás en MODO MASTER → PEGAR UN CÓDIGO y seguís desde esta fecha (si ese teléfono ya tiene otra carrera: ✕ empezar otra carrera → PEGAR UN CÓDIGO EN SU LUGAR).", {
      fontFamily: window.PF.texto, fontSize: "14px", color: "#f6efdc", align: "center", wordWrap: { width: 780 }, lineSpacing: 2 }).setOrigin(0.5, 0);
    /* lo que lleva, con números: así se reconoce un código viejo de uno nuevo */
    const t = this.save.temporada || {};
    const div = (this.Ma.DIVISIONES.find(d => d.id === this.save.division) || {}).n || this.save.division;
    this.add.rectangle(W / 2, 196, 640, 92, 0x0a1f13, 0.82).setStrokeStyle(3, 0xffd84d, 0.9);
    this.add.text(W / 2, 166, this.save.club + " · " + div, { fontFamily: window.PF.texto, fontSize: "15px", fontStyle: "bold", color: "#f6efdc" }).setOrigin(0.5);
    const nTit = (this.save.titulos || []).length;
    this.add.text(W / 2, 192, this.lineaDeLaTemporada(this.save.temporadaN | 0, t) +
      " · " + (nTit === 1 ? "1 título" : nTit + " títulos"), { fontFamily: window.PF.texto, fontSize: "13px", color: "#dcd6c2" }).setOrigin(0.5);
    this.add.text(W / 2, 220, codigo.length.toLocaleString("es-AR") + " letras · empieza con " + codigo.slice(0, 20) + "…", {
      fontFamily: window.PF.texto, fontSize: "12px", color: "#9fb3a5" }).setOrigin(0.5);
    /* el resultado de copiar o compartir, con su signo (no solo color) */
    const estado = this.add.text(W / 2, 258, "", { fontFamily: window.PF.texto, fontSize: "14px", color: "#7ee08a", align: "center", wordWrap: { width: 780 } }).setOrigin(0.5);
    const decir = (txt) => { if (estado.scene) estado.setText(txt).setColor(/^✗/.test(txt) ? "#e3503e" : "#7ee08a"); };

    const piel = (this.game.registry.get("balance") || {}).piel;
    const puedeCompartir = typeof navigator !== "undefined" && typeof navigator.share === "function";
    const ops = [{ t: "📋 COPIAR EL CÓDIGO", c: 0x7ee08a, cb: () => this.copiarCodigo(codigo, decir) }];
    if (puedeCompartir) ops.push({ t: "📤 COMPARTIR", c: 0xffd84d, cb: () => this.compartirCodigo(codigo, decir) });
    ops.push({ t: "◀ VOLVER A LA TABLA", c: 0xf6efdc, cb: () => this.scene.restart() });
    const items = ops.map((o, i) => {
      const y = Math.round(window.PampaPiel.yDeOpcion(i, ops.length, 52, piel));
      return { obj: this.boton(W / 2, y, 420, o.t, o.c, o.cb), cb: o.cb };
    });
    if (this.grupoFoco) this.grupoFoco(items, { inicial: 0, volver: () => this.scene.restart() });
    this.vestirPendientes && this.vestirPendientes();
  }
  copiarCodigo(codigo, decir) {
    const aMano = () => {
      const caja = this.cajaDeTexto({
        titulo: "💾 Tu código de carrera",
        texto: "No se pudo copiar solo. Está todo seleccionado: copialo (mantené apretado, o Ctrl+C) y guardalo donde quieras.",
        valor: codigo, soloLectura: true,
        botones: [{ texto: "✔ LISTO", principal: true, accion: () => this.cerrarCaja() }]
      });
      /* el camino viejo de copiar, por si el navegador lo deja. Si anda,
         cambia TAMBIÉN el párrafo (revisión L03): si no, la caja decía a la
         vez "No se pudo copiar solo…" y "✔ Ya quedó copiado." */
      try {
        if (caja && document.execCommand && document.execCommand("copy")) {
          if (caja.p) caja.p.textContent = "Ya quedó copiado. Igual lo tenés acá abajo, por si querés guardarlo de otra forma.";
          caja.decir("✔ Ya quedó copiado.");
        }
      } catch (e) { }
    };
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(codigo).then(() => decir("✔ Copiado. Pegalo en un mensaje o en una nota para guardarlo."), aMano);
        return;
      }
    } catch (e) { }
    aMano();
  }
  compartirCodigo(codigo, decir) {
    try {
      navigator.share({ title: "Pampa Star · código de carrera",
        text: "Mi carrera de Pampa Star. Para seguirla: MODO MASTER → PEGAR UN CÓDIGO (si ya hay otra carrera: ✕ empezar otra carrera → PEGAR UN CÓDIGO EN SU LUGAR).\n\n" + codigo })
        .then(() => decir("✔ Listo."), () => { });
    } catch (e) { decir("✗ No se pudo compartir: probá con COPIAR EL CÓDIGO."); }
  }
  /* enSuLugar: se llega desde ¿EMPEZAR OTRA CARRERA? con una carrera en
     curso, y se dice qué pasa con ella */
  pegarCodigo(enSuLugar) {
    this.cajaDeTexto({
      titulo: "📋 PEGAR UN CÓDIGO DE CARRERA",
      texto: "Pegá acá el código que guardaste (empieza con PAMPA1.). La carrera sigue en la fecha en que lo copiaste." +
        (enSuLugar ? " La carrera de ahora deja de jugarse: queda respaldada en este navegador, como al borrarla." : ""),
      valor: "", soloLectura: false,
      botones: [
        { texto: "▶ SEGUIR ESA CARRERA", principal: true, accion: (valor, decir) => {
          const r = window.PampaCarrera.importar(valor, { ids: this.idsDeDivisiones(), saneo: this.opcionesDeSaneo() });
          /* un código que no sirve se dice, y no se toca nada */
          if (!r.ok) { decir("✗ " + r.error); return; }
          this.cerrarCaja();
          this.importarCarrera(r.save);
        } },
        { texto: "✕ CANCELAR", accion: () => this.cerrarCaja() }
      ]
    });
  }
  importarCarrera(save) {
    try {
      /* la red, como en borrarCarrera: lo que hubiera se guarda antes */
      const viejo = localStorage.getItem("pampa_master_v1");
      if (viejo) localStorage.setItem("pampa_master_v1_borrada", viejo);
    } catch (e) { }
    this.save = save;
    this.guardar();
    this.pedirQueNoSeBorre();
    this.game.registry.set("masterPartido", null);
    this.game.registry.set("masterResultado", null);
    this.game.registry.set("carreraPendiente", null);
    this.scene.restart();
  }
  /* la caja de texto, en el DOM (estilos en index.html, #cajacodigo) */
  cajaDeTexto(o) {
    this.cerrarCaja();
    if (typeof document === "undefined" || !document.body) return null;
    const kb = this.input && this.input.keyboard;
    if (kb) kb.enabled = false;
    const fondo = document.createElement("div");
    fondo.id = "cajacodigo";
    fondo.setAttribute("role", "dialog");
    fondo.setAttribute("aria-modal", "true");
    const caja = document.createElement("div");
    caja.className = "caja";
    const h = document.createElement("h1");
    h.textContent = o.titulo;
    const p = document.createElement("p");
    p.textContent = o.texto;
    const ta = document.createElement("textarea");
    ta.value = o.valor || "";
    ta.readOnly = !!o.soloLectura;
    ta.spellcheck = false;
    ta.setAttribute("autocapitalize", "off");
    ta.setAttribute("autocomplete", "off");
    ta.setAttribute("aria-label", o.titulo);
    const msg = document.createElement("p");
    msg.className = "msg";
    msg.setAttribute("role", "alert");
    const decir = (t) => { msg.textContent = t || ""; msg.className = "msg" + (/^✗/.test(t || "") ? " mal" : ""); };
    const fila = document.createElement("div");
    fila.className = "botones";
    (o.botones || []).forEach((b) => {
      const el = document.createElement("button");
      el.type = "button";
      el.textContent = b.texto;
      if (b.principal) el.className = "prim";
      el.addEventListener("click", () => b.accion(ta.value, decir));
      fila.appendChild(el);
    });
    /* L07: sinCaja = un aviso con botones y sin texto para copiar o pegar
       ("En este navegador tu carrera NO se guarda") */
    caja.appendChild(h); caja.appendChild(p); if (!o.sinCaja) caja.appendChild(ta); caja.appendChild(msg); caja.appendChild(fila);
    fondo.appendChild(caja);
    /* las teclas son de la caja: Phaser escucha en window, y un Enter o un
       espacio tipeados acá movían el cursor de la pantalla de atrás */
    ["keydown", "keyup", "keypress"].forEach((t) => fondo.addEventListener(t, (e) => {
      e.stopPropagation();
      if (t === "keydown" && e.key === "Escape") this.cerrarCaja();
    }));
    /* Y LOS TOQUES TAMBIÉN. Phaser escucha mousedown y touchstart en window
       (para los que caen fuera del lienzo) y les hace el hit test con la
       posición: verificado con un clic de verdad en el navegador, tocar
       "SEGUIR ESA CARRERA" apretaba también ARRANCAR EN LA PRIMERA B, que
       estaba debajo, y se iba al editor. Se cortan en la caja, y además la
       entrada de la escena se apaga mientras la caja está abierta. */
    ["mousedown", "mouseup", "touchstart", "touchend", "touchmove", "pointerdown", "pointerup", "wheel"]
      .forEach((t) => fondo.addEventListener(t, (e) => e.stopPropagation()));
    if (this.input) this.input.enabled = false;
    document.body.appendChild(fondo);
    try {
      if (o.sinCaja) { if (fila.children && fila.children[0] && fila.children[0].focus) fila.children[0].focus(); }
      else { ta.focus(); if (o.soloLectura) ta.select(); }
    } catch (e) { }
    this._caja = { el: fondo, ta, decir, p };
    /* si la escena se apaga con la caja abierta (VOLVER AL MENÚ del aviso de
       error, por ejemplo), la caja se va con ella. Un gancho por vida de la
       escena, como el del cursor. */
    if (!this._cajaGancho) {
      this._cajaGancho = true;
      this.events.once("shutdown", () => { this._cajaGancho = false; this.cerrarCaja(); });
    }
    return this._caja;
  }
  cerrarCaja() {
    const c = this._caja;
    if (c && c.el && c.el.parentNode) c.el.parentNode.removeChild(c.el);
    this._caja = null;
    if (this.input) this.input.enabled = true;
    const kb = this.input && this.input.keyboard;
    if (kb) kb.enabled = true;
  }

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
      this.irA("editor");
    };
    this._crearCarrera = (divId, origen) => {
      /* Sección 11: tu club lleva el APODO de tu localidad, no "Club " +
         localidad (así se nombra a clubes reales). Ver logic/master.js */
      const club = this.Ma.nombreDeTuClub(this.pueblos[this.pSel], this.game.registry.get("roster"));
      this.save = {
        v: (window.PampaSaveMaster && window.PampaSaveMaster.VERSION) || 1, club, pueblo: this.pueblos[this.pSel], division: divId, temporadaN: 1, titulos: [],
        origen: origen || null, bolsaEventos: [], modFecha: null, racha: 0,
        temporada: this.T.crear({
          division: divId, miClub: club,
          rivales: this.DIV.divisiones[divId].rivales,
          semilla: this.Ma.hashClub(club) * 31 + 1
        })
      };
      this.guardar();
      /* tanda 1.0: que el navegador no la borre por falta de uso */
      this.pedirQueNoSeBorre();
      this.scene.restart();
    };
    this.boton(W / 2, H - 156, 420, "▶ ARRANCAR EN LA PRIMERA B", 0x7ee08a, () => arrancarEn(this.Ma.DIVISIONES[0].id));
    /* V7 §3 LA MUDANZA: si el clásico tiene carrera, se puede IMPORTAR — tu
       nivel de allá te ubica en la división que corresponde (con backup) */
    let clasico = null;
    try { clasico = JSON.parse(localStorage.getItem("pampa_star_v1")); } catch (e) { }
    /* el gate era `clasico.nivel`, un campo que el clasico no guarda nunca:
       el boton no aparecio jamas y la mudanza entera era inalcanzable. El nivel
       se CALCULA (logic/master.nivelDeCarreraClasica). Gate nuevo: que haya
       carrera de verdad, o sea nombre — un save recien creado con 0 goles da
       nivel 1 y tambien merece el boton. */
    if (clasico && clasico.name) {
      const nvImp = this.Ma.nivelDeCarreraClasica(clasico);
      const divImp = this.Ma.divisionPorNivel(nvImp);
      this.boton(W / 2, H - 100, 480, "⬆ IMPORTAR TU CARRERA (nivel " + nvImp + " → " + divImp.n + ")", 0xffd84d, () => arrancarEn(divImp.id));
      this.add.text(W / 2, H - 72, "el save del clásico queda RESPALDADO (pampa_star_v1_backup_pre_v7) y no se toca", { fontFamily: window.PF.texto, fontSize: "10px", color: "#7ee08a" }).setOrigin(0.5).setAlpha(0.9);
    }
    /* tanda 1.0: el código de carrera se pega acá, donde se empieza. Va al
       lado de VOLVER, del mismo tamaño: es la otra forma de entrar */
    if (window.PampaCarrera) {
      this.boton(W / 2 - 160, H - 40, 300, "✎ VOLVER AL EDITOR", 0xf6efdc, () => this.irA("editor"));
      this.boton(W / 2 + 160, H - 40, 300, "📋 PEGAR UN CÓDIGO", 0xffd84d, () => this.pegarCodigo());
    } else {
      this.boton(W / 2, H - 40, 300, "✎ VOLVER AL EDITOR", 0xf6efdc, () => this.irA("editor"));
    }
    /* L07: si este navegador no guarda, se dice antes de empezar la carrera */
    this.marcaSinGuardar();
  }
  /* ══════════════════════════════════════════════════════════════════════
     ¿ES EL CLÁSICO?

     Se deducía buscando el nombre de tu pueblo ADENTRO del nombre del rival:
     `rival.indexOf(save.pueblo) >= 0`. Cruzado contra divisiones.json, eso
     significaba que para Toay, Eduardo Castex, Intendente Alvear y Guatraché
     NO matcheaba ningún rival de ninguna división, y que de los seis que sí,
     cinco matcheaban SOLO en Primera A. O sea: en Primera B, donde empieza
     toda carrera, el clásico existía únicamente para Winifreda, y en Regional,
     Nacional y Mundial para nadie.

     El evento con más carga emocional del juego era, para casi todo el mundo,
     contenido que no se veía nunca. Y encima la subcadena PERDÍA dos derbis de
     verdad: los de Eduardo Castex y de Intendente Alvear, cuyo rival no llevaba
     el nombre completo del pueblo.

     Ahora el rival clásico está declarado en data/roster_pampeano.json y acá se
     compara por igualdad. Los diez pueblos tienen el suyo.
     ══════════════════════════════════════════════════════════════════════ */
  esClasico(rival) {
    const R = this.game.registry.get("roster");
    const meta = R && R.clubes_por_pueblo && R.clubes_por_pueblo[this.save.pueblo];
    if (!meta || !meta.clasico) return false;
    const lista = Array.isArray(meta.clasico) ? meta.clasico : [meta.clasico];
    return lista.indexOf(rival) >= 0;
  }
  /* el nivel de ESTA carrera: el escalon de la liga, con marca de agua alta.
     Un save viejo sin nivelMax deriva del escalon actual, asi que nadie queda
     peor que antes. */
  nivelDeLaCarrera() {
    const s = this.save || {};
    const nv = this.Ma.nivelDeDivision(s.division);
    return Math.max(nv, s.nivelMax | 0);
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
    /* EL CURSOR EN EL MAPA. Ya se navegaba con ◄► pero en una lista circular:
       en un mapa eso no tiene sentido, porque los pueblos estan en el espacio.
       Con foco geometrico, la flecha de abajo lleva al pueblo de abajo. */
    const _focoMapa = [];
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
      _focoMapa.push({ obj: punto, cb: () => {
        const k = this.pueblos.indexOf(p.nombre);
        if (k >= 0 && k !== this.pSel) { this.pSel = k; this.dibujarMapa(); }
      } });
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
    /* Sección 11: el nombre del club ES el apodo (antes: "Club " + localidad
       arriba y el apodo entre comillas abajo). Abajo va la localidad. */
    capa.add(this.add.text(fx + medioF, fichaY + 44, this.Ma.nombreDeTuClub(sel, this.game.registry.get("roster")), { fontFamily: window.PF.texto, fontSize: "15px", fontStyle: "bold", color: "#f6efdc", align: "center", wordWrap: { width: 200 } }).setOrigin(0.5));
    capa.add(this.add.text(fx + medioF, fichaY + 82, "de " + sel, { fontFamily: window.PF.texto, fontSize: "12px", color: "#7ee08a", align: "center", wordWrap: { width: 200 } }).setOrigin(0.5));
    capa.add(this.add.text(fx + medioF, fichaY + 112, "arranca en " + divN, { fontFamily: window.PF.texto, fontSize: "12px", color: "#dcd6c2" }).setOrigin(0.5));
    const zN = (M.ZONAS[info.zona] || {}).n || "—";
    capa.add(this.add.text(fx + medioF, fichaY + 132, "zona " + zN.toLowerCase(), { fontFamily: window.PF.texto, fontSize: "12px", color: "#9fb3a5" }).setOrigin(0.5));

    /* --- y se dice que el mapa es esquemático --- */
    if (this.grupoFoco && _focoMapa.length) {
      const iSel = ubic.findIndex(p => p.nombre === sel);
      this.grupoFoco(_focoMapa, { inicial: iSel >= 0 ? iSel : 0, sinTeclado: false });
    }
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
    this.vaciarVista();
    /* L04: atrás = la pregunta anterior (con lo que se había contestado
       antes de ella); desde la primera, a elegir club */
    this._atrasVista = paso > 0
      ? () => this.vistaOrigen(divId, paso - 1, elegidas.slice(0, paso - 1))
      : () => this.scene.restart();
    if (this.fondoDelMaster) this.fondoDelMaster();   // ARTE: vaciarVista se lleva el fondo
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
    const _focoEnt = [];
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
      /* atajo de ESTA pregunta: se suelta al pintar la siguiente (antes era un
         once que sobrevivía y la tecla contestaba dos preguntas) */
      this.atajo(["ONE", "TWO", "THREE", "FOUR"][i], elegir);
      _focoEnt.push({ obj: r, cb: elegir });
    });
    /* EL CURSOR EN LA ENTREVISTA. Cuatro respuestas en columna y ningun atajo
       mas que los numeros: con las flechas ahora se recorren, y ninguna es
       "la correcta", asi que el foco arranca en la primera y listo. */
    if (this.grupoFoco) this.grupoFoco(_focoEnt, { inicial: 0 });
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
    const AA = window.PampaAvatarArte;
    if (!AA || !AA.poseTenida) return base;
    /* L06 (texturas-presupuesto): la misma clave que el partido ("poseT_…",
       scenes/avatar_arte.js). Antes era "poseM_…" y el partido teñía la
       misma pose otra vez como "poseV_…": 45 MB repetidos en memoria */
    return AA.poseTenida(this, id, this.lookGuardado()) || base;
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
     de jugar. Tres toques y estás en la cancha.

     El evento pampeano se decide ANTES (vistaEvento) y acá queda arriba su
     titular más lo que elegiste. Lo que deja no toca los costos de la semana:
     deja el MODIFICADOR DE LA FECHA (save.modFecha), que viaja a la cancha y
     ahí sí cambia el partido. El comentario viejo decía "puede cambiar los
     costos de la semana" y nunca fue cierto — el evento no entra ni al ctx de
     la semana ni al balance. */
  vistaSemana(rival, alJugar) {
    /* PASADA DE COHERENCIA · esto se llamaba en CADA repintado de la vista, o
       sea 3 o 4 veces al armar la semana. No se escucha (el motor ignora el
       pedido si ya suena ese tema) pero es una llamada de mas por cuadro y
       ensucia cualquier medicion de musica. Se pide una sola vez por entrada. */
    if (this._musicaSemanaPuesta !== true) {
      /* revisión L06: en la última fecha, también baja el tema del título */
      this.pedirMusica("semana", { cierre: this.T.ultimaFecha(this.save && this.save.temporada) });
      this._musicaSemanaPuesta = true;
    }
    const W = this.scale.width, H = this.scale.height;
    const S = window.PampaSemana, D = this.game.registry.get("semana");
    if (!S || !D) { this.vistaEvento(rival, alJugar); return; }
    const cfg = (this.game.registry.get("balance") || {}).semana || {};
    /* TANDA 1.0 · una semana ya cerrada (saliste a la cancha y volviste sin
       resultado) no se rearma: se vuelve a la cancha como se llegó */
    if (S.semanaCerrada && S.semanaCerrada(this.save)) { alJugar(); return; }
    if (!this.save.semana) this.save.semana = S.nuevaSemana(this.save, cfg);
    const sem = this.save.semana;
    this._semRival = rival; this._semJugar = alJugar;
    /* EL EVENTO SE DECIDE ANTES DE ARMAR LA SEMANA. Antes esta llamada vivía
       detrás de `if (!S || !D)`, una guarda que no se cumple nunca, y las dos
       opciones de los 28 eventos no se ofrecieron jamás. Ver vistaEvento(). */
    this.prepararEvento(rival);
    if (!this._semEventoResuelto && this._semEvento && this._semEvento.opciones && this._semEvento.opciones.length) {
      this.vistaEvento(rival, () => this.vistaSemana(rival, alJugar));
      return;
    }
    this.vaciarVista();
    /* L04: atrás = a la tabla. Lo elegido ya está en el save (guardar() en
       cada ranura): JUGAR LA FECHA vuelve a esta misma semana */
    this._atrasVista = () => this.scene.restart();
    if (this.fondoDelMaster) this.fondoDelMaster();   // ARTE: vaciarVista se lleva el fondo

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
    /* la molestia y el evento se dibujaban LOS DOS en y=116, uno encima del
       otro: con molestia arrastrada las dos líneas quedaban ilegibles. Se
       apilan, midiendo la de arriba (el evento envuelve a dos renglones). */
    let ySup = 108;
    if (sem.molestia) {
      const tm = this.add.text(W / 2, ySup, "🩹 arrastrás una molestia de la fecha pasada", { fontFamily: window.PF.texto, fontSize: "13px", color: "#e3503e" }).setOrigin(0.5, 0);
      ySup += tm.height + 4;
    }

    /* --- EL EVENTO DE LA SEMANA: el titular, y qué decidiste --- */
    const ev = this._semEvento;
    if (ev && ev.texto) {
      const te = this.add.text(W / 2, ySup, "📰 " + ev.texto, { fontFamily: window.PF.texto, fontSize: window.PampaPiel.nivel(3), color: "#ffd84d", align: "center", wordWrap: { width: 860 } }).setOrigin(0.5, 0);
      ySup += te.height + 2;
      /* lo que ELEGISTE queda a la vista mientras armás la semana: es la mitad
         de la decisión que antes no existía */
      const md = this.save.modFecha;
      if (md && md.opcion) {
        const tl = this.add.text(W / 2, ySup, "↳ " + md.opcion, { fontFamily: window.PF.texto, fontSize: "12px", color: "#7ee08a", align: "center", wordWrap: { width: 860 } }).setOrigin(0.5, 0);
        /* abajo del titular pisaba el borde de la tira de los días (arranca en
           y=134). Si entra a lo ancho, va en el MISMO renglón que el titular:
           los dos se corren para quedar centrados juntos. La flecha lo separa
           del titular por forma, no solo por color. */
        const junto = te.width + 14 + tl.width;
        if (ySup + tl.height > 130 && te.height < 24 && junto <= W - 60) {
          te.setOrigin(0, 0).setX(W / 2 - junto / 2);
          tl.setOrigin(0, 0).setPosition(te.x + te.width + 14, te.y + (te.height - tl.height) / 2);
        }
      }
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
  const ctxL = { stats: this.statsDeHoy(), stat_techo: ((this.game.registry.get("balance") || {}).semana || {}).stat_techo, marcas: (this.save.origen && this.save.origen.marcas) || [],
    origen: (this.save.origen && this.save.origen.marcas && this.save.origen.marcas[0]) || null };
    const ops = S.opcionesPara(D, sem, ctxL);
    this.add.text(W / 2, 286, hechas >= 3 ? "LA SEMANA ESTÁ ARMADA · a la cancha" : "¿QUÉ HACÉS ESTA SEMANA? · elegiste " + hechas + " de 3 (teclas 1 a 0)",
      { fontFamily: window.PF.display, fontSize: "12px", color: hechas >= 3 ? "#7ee08a" : "#ffd84d" }).setOrigin(0.5);
    /* O1 · las opciones van en la FRANJA DE DECISIÓN, ubicadas con el helper —
       no clavadas a mano. Tres filas: dos de acciones y la del botón de jugar,
       que es la tercera decisión de esta pantalla. */
    const pielCfgS = (this.game.registry.get("balance") || {}).piel;
    const porFila = 5, anchoO = 178, altoO = 64;
    /* EL CURSOR EN LA SEMANA. Eran diez tarjetas con atajos numericos sueltos:
       sin flechas, sin nadie enfocado. Y los atajos se apilaban — apretabas 1 y
       te llenaba media semana de una. Ahora se navega la grilla 5x2 con las
       flechas y el cursor cae en la celda de al lado, no en una diagonal (eso
       lo resuelve logic/foco.js: es geometrico, no declara layout). */
    const _focoSem = [];
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
      /* la bloqueada TAMBIEN entra al grupo: se puede enfocar y te dice por que
         no se puede. Saltearla seria peor — no te enterarias de que existe. */
      _focoSem.push({ obj: r, bloqueada: !alcanza,
        motivo: sinEnergia ? "sin energía para esto" : "la semana ya está armada",
        cb: () => { if (window.PampaFeel) window.PampaFeel.pulsar(this, r); this.ponerEnLaSemana(o); } });
      if (!alcanza) return;
      r.setInteractive({ useHandCursor: true });
      r.on("pointerdown", (pp, xx, yy, e2) => {
        e2 && e2.stopPropagation && e2.stopPropagation();
        if (window.PampaFeel) window.PampaFeel.pulsar(this, r);
        this.ponerEnLaSemana(o);
      });
      /* el atajo vive lo que vive esta vista (ver atajo()): antes era un once
         por repintado y una tecla llenaba dos días */
      if (i < 10) this.atajo(["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "ZERO"][i], () => this.ponerEnLaSemana(o));
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
    const _btnJugar = this.boton(W / 2, yJugar, 340, listo ? "▶ JUGAR LA FECHA" : "▶ JUGAR ASÍ (te queda semana sin usar)", listo ? 0x7ee08a : 0xdcd6c2, () => {
      this.cerrarSemana(alJugar);
    });
    _focoSem.push({ obj: _btnJugar, cb: () => this.cerrarSemana(alJugar) });
    /* el foco arranca en la primera que se pueda elegir; con la semana armada,
       en el boton de jugar, que es lo unico que queda por hacer */
    if (this.grupoFoco) this.grupoFoco(_focoSem, { inicial: listo ? _focoSem.length - 1 : undefined });
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
    /* CON las stats: sin ellas, el rendimiento decreciente devuelve el valor
       entero y toda la curva de A1 no corre (ver statsDeHoy). */
    const bal = Object.assign({}, (this.game.registry.get("balance") || {}).semana || {},
      { stats: this.statsDeHoy() });
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
    /* CON las stats: sin ellas, el rendimiento decreciente devuelve el valor
       entero y toda la curva de A1 no corre (ver statsDeHoy). */
    const bal = Object.assign({}, (this.game.registry.get("balance") || {}).semana || {},
      { stats: this.statsDeHoy() });
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
    /* mientras el momento está a la vista, la semana de abajo NO se toca: sus
       atajos y su cursor quedaban vivos y una segunda tecla (o un Enter sobre
       la tarjeta enfocada) llenaba otra ranura con el momento todavía abierto.
       La vista se vuelve a armar entera al cerrar. */
    this.soltarAtajos();
    if (this.cerrarFoco) this.cerrarFoco();
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
    /* y con teclado también se saltea (el dedo ya podía) */
    this.atajo("ENTER", cerrar);
    this.atajo("SPACE", cerrar);
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
    /* CON las stats: sin ellas, el rendimiento decreciente devuelve el valor
       entero y toda la curva de A1 no corre (ver statsDeHoy). */
    const bal = Object.assign({}, (this.game.registry.get("balance") || {}).semana || {},
      { stats: this.statsDeHoy() });
    const sem = this.save.semana;
    /* TODAS las marcas, no solo la primera: el origen son TRES preguntas y
     cualquiera de ellas puede dejar una. Con marcas[0] alcanzaba con que la
     que importaba fuera la segunda para que no contara. */
  const ctx = { stats: this.statsDeHoy(), stat_techo: ((this.game.registry.get("balance") || {}).semana || {}).stat_techo, marcas: (this.save.origen && this.save.origen.marcas) || [],
    origen: (this.save.origen && this.save.origen.marcas && this.save.origen.marcas[0]) || null };
    const ops = S.opcionesPara(D, sem, ctx);
    this.vaciarVista();
    this._atrasVista = () => this.vistaSemana(this._semRival, this._semJugar);   // L04: como su ◀ VOLVER
    if (this.fondoDelMaster) this.fondoDelMaster();   // ARTE: vaciarVista se lleva el fondo
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
  /* ══════════════════════════════════════════════════════════════════════
     TANDA 1.0 · EL EVENTO SE SORTEA UNA VEZ POR FECHA, Y QUEDA EN EL SAVE.

     Vivía solo en la escena (_semEvento): al recargar se volvía a sortear con
     la bolsa ya gastada, así que salía OTRO evento y se podía elegir de nuevo.
     Ahora logic/semana.eventoDeLaFecha() lo anota en save.eventoFecha con la
     fecha, y si ya se decidió (resuelto) no se vuelve a preguntar.
     ══════════════════════════════════════════════════════════════════════ */
  prepararEvento(rival) {
    if (this._semEvento !== undefined) return this._semEvento;
    this._semEvento = this.eventoDeLaSemana(rival);
    const S = window.PampaSemana, ef = this.save.eventoFecha;
    this._semEventoResuelto = !!(S && S.esLaFecha && ef && S.esLaFecha(this.save, ef) && ef.resuelto);
    return this._semEvento;
  }
  eventoDeLaSemana(rival) {
    const V = window.PampaVida, D = this.game.registry.get("vida");
    if (!V || !D || !D.eventos) return null;
    const S = window.PampaSemana;
    const sortear = () => this.sortearEvento(rival);
    if (!S || !S.eventoDeLaFecha) return sortear();
    const anotado = S.eventoDeLaFecha(this.save, sortear);
    this.guardar();
    return anotado.id != null ? (D.eventos.find(e => e.id === anotado.id) || null) : null;
  }
  /* el sorteo de siempre, con la bolsa (no repite hasta agotarla) */
  sortearEvento(rival) {
    const V = window.PampaVida, D = this.game.registry.get("vida"), t = this.save.temporada;
    const pos = this.T.posiciones(t);
    const idxMio = pos.findIndex(f => f.equipo === t.miClub), idxRival = pos.findIndex(f => f.equipo === rival);
    const ctx = {
      fecha: t.fecha, division: this.save.division,
      clasico: this.esClasico(rival),
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
    /* TANDA 1.0 · LA CUENTA SE MUDÓ A logic/semana.js (cerrarSemana), donde
       se testea en node. Hace lo mismo que hacía acá —el domingo hasta TU
       techo de aguante, los permanentes a la carrera, la molestia de la
       semana commiteada— pero UNA vez por fecha: antes cada llamada sumaba,
       y recargar en medio del partido llevó tiro de +3 a +15. */
    S.cerrarSemana(this.save, cfg);
    this._semEvento = undefined;
    this._semEventoResuelto = false;   // la próxima fecha vuelve a decidir el suyo
    this.guardar();
    alJugar();
  }

  /* ══════════════════════════════════════════════════════════════════════
     EL EVENTO, CON SUS DOS OPCIONES.

     Esta pantalla estaba entera, terminada y funcionando — y era INALCANZABLE.
     Vivía detrás de `if (!S || !D)` en vistaSemana, o sea "si no cargó el
     sistema de la semana". S es window.PampaSemana (lo deja el UMD de
     logic/semana.js, que index.html carga siempre) y D es el registry de
     data/semana.json (que index.html fetchea y mete en el preBoot). Los dos
     existen siempre: la guarda no se cumplió nunca.

     Cuando la V8 trajo LA SEMANA de diez tarjetas, el evento quedó de fallback
     y ahí murió sin que nadie lo viera morir. Lo que se perdía: los 28 eventos
     de data/eventos_temporada.json nunca se ELEGÍAN — sólo se leía su texto
     como decorado. Con ellos quedaban muertas sus 56 opciones, los 56 bloques
     `efecto`, las 56 frases del relator, y de paso toda la cadena de abajo:
     save.modFecha se quedaba en null SIEMPRE, así que `if (md && md.mod)` de
     match.js no entraba nunca, y con él aplicarEleccion() y el vocabulario
     entero de TOPES eran código que sólo tocaban los tests.

     Ahora el evento es un PASO PROPIO y va ANTES de armar la semana, que es el
     orden en que se lee: pasó esto → cómo lo tomás → ahora planificá. No pisa
     nada de la V8; le devuelve la decisión al evento y deja la semana igual.

     El evento lo elige eventoDeLaSemana() UNA vez y queda en _semEvento: si lo
     eligiera acá otra vez, la bolsa se consumiría dos veces por fecha.
     ══════════════════════════════════════════════════════════════════════ */
  vistaEvento(rival, alSeguir) {
    const W = this.scale.width, H = this.scale.height;
    const V = window.PampaVida;
    this.prepararEvento(rival);
    const ev = this._semEvento;
    if (!V || !ev || !ev.opciones || !ev.opciones.length) { this._semEventoResuelto = true; alSeguir(); return; }
    this.vaciarVista();
    /* L04: atrás = a la tabla; el evento quedó anotado con su fecha
       (eventoDeLaFecha) y vuelve el mismo, sin sortear otro */
    this._atrasVista = () => this.scene.restart();
    if (this.fondoDelMaster) this.fondoDelMaster();   // ARTE: vaciarVista se lleva el fondo
    /* E · acá el PRINCIPAL es lo que pasó: el resto es marco. */
    this.add.text(W / 2, 44, "LA SEMANA", { fontFamily: window.PF.texto, fontSize: window.PampaPiel.nivel(4), color: "#9fb3a5" }).setOrigin(0.5);
    this.add.text(W / 2, 140, ev.texto, { fontFamily: window.PF.display, fontSize: window.PampaPiel.nivel(1), color: "#f6efdc", align: "center", wordWrap: { width: 800 }, lineSpacing: 10 }).setOrigin(0.5);
    /* D1 · las dos opciones del evento arrancaban en y=280, apenas fuera de la
       franja. Lo cazó el guardián ampliado, no el ojo. */
    const pielEv = (this.game.registry.get("balance") || {}).piel;
    const items = ev.opciones.map((o, i) => {
      const y = Math.round(window.PampaPiel.yDeOpcion(i, ev.opciones.length, 72, pielEv));
      const r = this.add.rectangle(W / 2, y, 700, 72, 0xf6efdc, 0.97).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
      this.add.text(W / 2, y, (i + 1) + " · " + o.texto, { fontFamily: window.PF.display, fontSize: "11px", color: "#0a1f13" }).setOrigin(0.5);
      const elegir = () => {
        this.save.modFecha = V.aplicarEleccion(ev, i);
        this._semEventoResuelto = true;
        /* decidido queda decidido: recargar no lo vuelve a preguntar */
        if (this.save.eventoFecha) this.save.eventoFecha.resuelto = true;
        this.guardar();
        alSeguir();
      };
      r.on("pointerdown", (pp, xx, yy, e2) => { e2 && e2.stopPropagation && e2.stopPropagation(); elegir(); });
      return { obj: r, cb: elegir };
    });
    /* el cursor, como en los demás grupos: no hay salida (el evento SE DECIDE,
       no se saltea), así que no lleva `volver` */
    if (this.grupoFoco) this.grupoFoco(items, { inicial: 0 });
    /* V1 (cantidad): decía cómo se toca, que el jugador ya sabe a esta altura */
  }

  /* ══════════════════════════════════════════════════════════════════════
     A LA CANCHA. Lo que viaja al partido sale del save, así que entrar por
     primera vez y REPETIR después de una recarga mandan lo mismo.

     temporadaN y fecha viajan para que el partido anote su resultado en el
     save AL PITAZO (match.js, anotarResultadoEnLaCarrera) marcado con la
     fecha; enCancha deja dicho que se salió a jugar esa fecha.
     ══════════════════════════════════════════════════════════════════════ */
  irALaCancha(rival) {
    const c = window.PampaSemana && window.PampaSemana.claveDeFecha
      ? window.PampaSemana.claveDeFecha(this.save)
      : { temporadaN: this.save.temporadaN | 0, fecha: this.save.temporada.fecha | 0 };
    this.game.registry.set("masterPartido", {
      rival, division: this.save.division,
      temporadaN: c.temporadaN, fecha: c.fecha,
      /* el nivel VIAJA: sin esto la cancha caia al del clasico (que no
         existe) y se quedaba en 1 para siempre. nivelMax es marca de
         agua alta a proposito — un descenso no te saca un especial que
         ya te habias ganado. */
      nivel: this.nivelDeLaCarrera(),
      mod: this.save.modFecha || null,
      origen: this.save.origen || null,
      semana: this.save.semanaResumen || null,
      mejoras: this.save.mejoras || null
    });
    this.save.enCancha = { temporadaN: c.temporadaN, fecha: c.fecha, rival };
    this.guardar();
    /* M5 · el tema de la semana no cruza a la cancha. No hace falta
       pedir nada acá: el corte cuelga del shutdown de la escena (una
       vez, en el mixin) y funde 300 ms mientras el partido pide su
       entrada. Probé poner "entrada" acá primero y se cortaba a los dos
       cuadros — vive en match.js, que es donde tiene lugar para sonar. */
    this.irA("match");
  }

  /* ============ VISTA 2: LA TEMPORADA ============ */
  vistaTemporada() {
    const W = this.scale.width, H = this.scale.height;
    /* revisión L06: en la última fecha, la tabla ya baja el tema del título
       ("hype"), que antes nadie precargaba: sonaba recién cuando bajaba */
    this.pedirMusica("espera", { cierre: this.T.ultimaFecha(this.save && this.save.temporada) });
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
    /* revisión L04b: con un título decía "★ 1 títulos"; el singular como en
       el código de la carrera (vistaCodigo) */
    const nTitClub = this.save.titulos.length;
    const clubTxt = this.add.text(W / 2, 78, this.save.club + (nTitClub ? " · ★".repeat(Math.min(5, nTitClub)) + " " + (nTitClub === 1 ? "1 título" : nTitClub + " títulos") : ""), { fontFamily: window.PF.texto, fontSize: "12px", color: "#f6efdc" }).setOrigin(0.5);

    /* resultado de la última fecha jugada (si venimos del partido) */
    /* L04b · EL RESULTADO PISABA AL CLUB. Iba centrado en y=84 y el club en
       y=78, los dos de 12 px: seis píxeles de diferencia, el "✔ GANASTE 2-1"
       montado sobre "El Bagual de Winifreda" (l03_v2_volver_tabla_sumada.png).
       Abajo no hay lugar libre: en y=94 vive el aviso de ZONA DE DESCENSO y
       en y=114 los encabezados de la tabla. Va en el MISMO renglón que el
       club, a la derecha, y los dos se centran juntos con su ancho medido
       (Text.width, que Phaser calcula al crearlo): el club con sus títulos
       más largo (≈52 caracteres) y el resultado entran en unos 430 px de 960.
       La marca ✔ / = / ✘ dice el resultado sin el color. */
    if (this._ultimo) {
      const gano = this._ultimo.golesMio > this._ultimo.golesRival;
      const empate = this._ultimo.golesMio === this._ultimo.golesRival;
      const resTxt = this.add.text(W / 2, 78, (gano ? "✔ GANASTE " : empate ? "= EMPATASTE " : "✘ PERDISTE ") + this._ultimo.golesMio + "-" + this._ultimo.golesRival, { fontFamily: window.PF.texto, fontSize: "12px", fontStyle: "bold", color: gano ? "#7ee08a" : empate ? "#f6c11d" : "#e3503e" }).setOrigin(0, 0.5);
      const aire = 22, total = clubTxt.width + aire + resTxt.width;
      const x0 = Math.round(W / 2 - total / 2);
      clubTxt.setOrigin(0, 0.5).setX(x0);
      resTxt.setX(Math.round(x0 + clubTxt.width + aire));
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
      /* los dos accesos de abajo se crean ANTES que los botones (revisión
         L03): con el piso táctil su área sube unos píxeles sobre el borde de
         abajo de JUGAR / NUEVA TEMPORADA, y Phaser le da el toque al objeto
         dibujado más arriba. Creados antes, en ese borde gana el botón. */
      this.salidaDeLaCarrera(W, H);
      this.accesoAlCodigo(W, H);
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
        /* TANDA 1.0 · SALISTE A LA CANCHA Y VOLVISTE SIN RESULTADO (recargaste,
           se cerró la pestaña en medio del partido): la semana ya está jugada
           y no se rehace —ni se vuelven a sumar sus mejoras—. Se repite el
           partido, entrando como habías llegado. Es la regla de Rodri para
           abandonar una fecha. */
        const SemT = window.PampaSemana;
        const repetir = !!(SemT && SemT.semanaCerrada && SemT.semanaCerrada(this.save));
        if (repetir) {
          this.add.text(W / 2, H - 172, "↺ volviste sin terminar el partido: la semana ya está jugada y entrás como llegaste",
            { fontFamily: window.PF.texto, fontSize: "12px", color: "#ffd84d" }).setOrigin(0.5);
        }
        this.boton(W / 2 - 170, H - 80, 300, repetir ? "↺ REPETIR EL PARTIDO" : "▶ JUGAR LA FECHA", 0x7ee08a, () => {
          if (repetir) { this.irALaCancha(rival); return; }
          /* V8 A1: primero LA SEMANA (dos toques), después la cancha */
          this.vistaSemana(rival, () => this.irALaCancha(rival));
        });
      } else {
        this.add.text(W / 2, H - 140, fechaTxt + " · FECHA LIBRE (descansás)", { fontFamily: window.PF.texto, fontSize: "13px", color: "#f6efdc" }).setOrigin(0.5);
        this.boton(W / 2 - 170, H - 80, 300, "▶ PASAR LA FECHA", 0x7ee08a, () => {
          this.T.jugarFecha(t, null, null);
          this.guardar();
          this.scene.restart();
        });
      }
      this.boton(W / 2 + 170, H - 80, 280, "✎ EDITOR / PINTA", 0xf6efdc, () => this.irA("editor"));
    } else {
      /* FIN DE TEMPORADA: el veredicto de la escalera */
      /* (los accesos antes que los botones: ver la otra rama) */
      this.salidaDeLaCarrera(W, H);
      this.accesoAlCodigo(W, H);
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
        /* marca de agua: el nivel sube con el ascenso y NO baja con el descenso.
           Perder el Tornado Pampeano por haber terminado noveno seria sacarte
           algo que ya te ganaste. */
        this.save.nivelMax = Math.max(this.save.nivelMax | 0, this.Ma.nivelDeDivision(this.save.division));
        this.save.temporadaN++;
        this.save.temporada = this.T.crear({
          division: this.save.division, miClub: this.save.club,
          rivales: this.DIV.divisiones[this.save.division].rivales,
          semilla: this.Ma.hashClub(this.save.club) * 31 + this.save.temporadaN
        });
        this.guardar();
        this.scene.restart();
      });
      this.boton(W / 2 + 170, H - 80, 280, "✎ EDITOR / PINTA", 0xf6efdc, () => this.irA("editor"));
    }
    /* L07: fijo en la tabla mientras este navegador no guarde */
    this.marcaSinGuardar();
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

