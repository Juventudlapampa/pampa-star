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
    /* la caja del código de carrera (DOM): si quedó abierta, se va (y si
       era el aviso de que no se guarda, queda pendiente: revisión L07) */
    if (this.game) this.soltarAvisoPorApagado();
    this.cerrarCaja();
    this._cajaGancho = false;
    /* L04: a dónde lleva el atrás del teléfono desde la vista a la vista
       (null = al editor, que es de donde se entra al Master) */
    this._atrasVista = null;
    /* L07: la marca "⚠ ESTE NAVEGADOR NO GUARDA TU CARRERA" es de cada vista */
    this._marcaSG = null;
    /* L08c: el acceso 📲 de la tabla se anota en la portada; la anotación de
       la entrada anterior se suelta acá (P1: la instancia se reusa) */
    if (this._soltarInstalar) { try { this._soltarInstalar(); } catch (e) { } }
    this._soltarInstalar = null;
    /* L08c: las poses vestidas del partido se piden una vez por entrada a la
       tabla (prepararVestidas); la cola que las viste es del juego */
    this._vestidasPedidas = false;
    /* TEMPO-1: el tempo que se marca en la creación (NORMAL de entrada) y el
       que viaja por el editor en carreraPendiente hasta _crearCarrera */
    /* 20/oct: la carrera nueva trae marcada la duración de OPCIONES.
       Segunda revisión del 22/oct: de vuelta del paso 1 (◀ VOLVER del
       editor), la que habías marcado */
    const tempoDeVuelta = this.game.registry.get("tempoDeVuelta");
    this.game.registry.set("tempoDeVuelta", null);
    this._tempoElegido = tempoDeVuelta || (window.PampaOpciones
      ? window.PampaOpciones.leer(localStorage, this.game.registry.get("balance"), this.game.registry.get("audio")).duracion
      : window.PampaSaveMaster.duracionesActivas(this.game.registry.get("balance")).porDefecto);
    this._tempoDeLaCarrera = null;
    this._tempoFoco = null;
    this._botonesElegir = null;
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
    this.cortarEscritura();
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
     vuelven a la pantalla de título, que es de donde se entra. Con la caja del código
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
    else this.irA("titulo");
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
      /* 23/oct · y las de la semana de cuatro cosas (ENTRENAR trae una por cualidad) */
      (dSem.cuatro || []).forEach((c) => [c].concat(Object.values(c.que || {})).forEach((o) => { if (o.pose && necesarias.indexOf(o.pose) < 0) necesarias.push(o.pose); }));
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
    /* 20/oct · las caras de los relatores, para la previa de la fecha */
    if (man && man.relator && !this.textures.exists("relatores")) this.load.image("relatores", "../" + man.relator.archivo);
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
      this._tempoDeLaCarrera = pend.tempo;
    }
    const W = this.scale.width, H = this.scale.height;
    /* PIEL P1: fondo radial (ver editor.js) */
    this.cameras.main.setBackgroundColor(this.piel().fondo_borde);
    this.fondoDePiel();
    this.T = window.PampaTemporada;
    this.Ma = window.PampaMaster;
    this.DIV = this.game.registry.get("divisiones");
    if (!this.T || !this.Ma || !this.DIV || !this.DIV.divisiones) {
      /* fallback tolerante: sin data no hay carrera — se vuelve al título */
      this.add.text(W / 2, H / 2, "La carrera no pudo cargar\n(faltó data/divisiones.json)\n\nTOCÁ PARA VOLVER", { fontFamily: window.PF.texto, fontSize: "16px", color: "#f6efdc", align: "center" }).setOrigin(0.5);
      this.input.once("pointerdown", () => this.irA("titulo"));
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
    /* revisión L07: la copia de la sesión primero, si un guardar() falló
       (crudoDeLaCarrera, abajo de guardar) */
    const crudo = this.crudoDeLaCarrera();
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
    /* 25/oct · Nito cita al final lo que contestaste en la primera
       entrevista: una carrera de antes guardaba las frases y no qué
       respuesta era. Se recupera una vez (logic/final.js) */
    const vidaD = this.game.registry.get("vida");
    if (this.save && window.PampaFinal && vidaD && window.PampaFinal.migrarElecciones(this.save, vidaD.origen)) this.guardar();
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
      /* 25/oct · TU CARRERA cuenta tus goles. Una temporada que empezó antes
         de que se contaran no tiene el campo y queda sin anotar */
      if (typeof this.save.golesTuyosTemporada === "number") this.save.golesTuyosTemporada += res.golesVos | 0;
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
       leída, para que el aviso sepa si ofrecer el código de carrera.
       Revisión L07: también si ya se sabe que no (un guardar() que falló en
       la sesión, aunque la prueba de ahora dé bien: el almacenamiento
       lleno), así la marca sigue y un aviso que se cerró con el apagado de
       la escena vuelve a abrirse (soltarAvisoPorApagado) */
    if (!this.guardadoAnda() || this.game.registry.get("sinGuardar")) this.sinGuardar();

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
    const texto = JSON.stringify(this.save);
    try { localStorage.setItem("pampa_master_v1", texto); ok = true; } catch (e) { ok = false; }
    /* revisión L07 · LA COPIA DE LA SESIÓN. Antes, con el guardado
       bloqueado, cada scene.restart() (crear la carrera, PEGAR UN CÓDIGO,
       volver a la tabla, cada fecha) releía un almacenamiento vacío y se
       volvía a elegir club, en un bucle; con el almacenamiento lleno se
       releía la carrera VIEJA. Ahora lo que no se pudo escribir queda en el
       registry, que dura lo que dura la página, y create() lo lee primero
       (logic/save_master.js, crudoDeLaSesion). Un guardar() que anda la
       borra: el almacenamiento ya tiene lo último. */
    if (ok) this.game.registry.remove("masterSaveMemoria");
    else this.game.registry.set("masterSaveMemoria", texto);
    if (!ok) this.sinGuardar();
    return ok;
  }
  /* el texto de la carrera: la copia de la sesión si un guardar() falló, si
     no el almacenamiento (sin almacenamiento, null: elegir club) */
  crudoDeLaCarrera() {
    const SM = window.PampaSaveMaster;
    const leer = () => localStorage.getItem("pampa_master_v1");
    if (SM && SM.crudoDeLaSesion) return SM.crudoDeLaSesion(this.game.registry.get("masterSaveMemoria"), leer);
    try { return leer(); } catch (e) { return null; }
  }
  /* borrar la carrera borra también su copia de la sesión: si no, el
     create() siguiente la traía de vuelta */
  soltarCopiaDeLaSesion() {
    this.game.registry.remove("masterSaveMemoria");
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
    this.game.registry.set("sinGuardar", true);
    if (this.add) this.marcaSinGuardar();
    if (!this.game.registry.get("sinGuardarAvisado")) {
      this.game.registry.set("sinGuardarAvisado", true);
      const c = this.avisoSinGuardar();
      if (c) c.avisoSG = true;
    }
  }
  /* revisión L07 · EL AVISO QUE SE CERRABA EN EL ACTO. El primer guardar()
     que falla puede ser uno que sigue con scene.restart() o irA (crear la
     carrera, PEGAR UN CÓDIGO, ir a la cancha, PASAR LA FECHA, la temporada
     nueva): la caja se abría, el apagado de la escena la cerraba en el mismo
     paso y, como ya estaba marcado "avisado", no volvía en la sesión. Le
     pasa justo a quien tiene el almacenamiento LLENO, donde la prueba de
     entrada da bien y el que falla es el guardar de después. Ahora, si la
     escena se apaga con el aviso abierto, queda pendiente, y el create()
     siguiente lo vuelve a abrir (ver la llamada en create). */
  soltarAvisoPorApagado() {
    if (this._caja && this._caja.avisoSG) this.game.registry.set("sinGuardarAvisado", false);
  }
  /* revisión L07: el texto dice lo que pasa sin suponer la causa. Antes
     mandaba a "abrí el juego en el navegador del teléfono (…) o instalalo",
     y en el caso típico (un navegador con los datos del sitio bloqueados)
     ya se está ahí, e instalar no cambia el bloqueo. Y "Podés jugar igual"
     no era cierto: ver crudoDeLaCarrera. */
  avisoSinGuardar() {
    const hay = !!this.save;
    return this.cajaDeTexto({
      titulo: "En este navegador tu carrera NO se guarda",
      texto: hay
        ? "Este navegador no deja guardar datos de este sitio: puede estar bloqueado o lleno. Podés seguir jugando mientras esta página siga abierta, pero si la cerrás, la carrera se pierde. Guardá tu código de carrera en un mensaje o en una nota: con él la seguís en otro navegador."
        : "Este navegador no deja guardar datos de este sitio: puede estar bloqueado o lleno. Podés jugar igual mientras esta página siga abierta, pero si la cerrás, la carrera se pierde. Para que quede guardada, abrí el juego en otro navegador, o fuera de la página donde lo encontraste.",
      sinCaja: true,
      botones: (hay && window.PampaCarrera ? [{ texto: "CÓDIGO DE CARRERA", principal: true, accion: () => { this.cerrarCaja(); this.vistaCodigo(); } }] : [])
        .concat([{ texto: "▶ SEGUIR IGUAL", principal: !hay, accion: () => this.cerrarCaja() }])
    });
  }
  marcaSinGuardar() {
    if (!this.game.registry.get("sinGuardar")) return null;
    if (this._marcaSG && this._marcaSG.scene) return this._marcaSG;
    const t = this.add.text(12, 8, "ESTE NAVEGADOR NO GUARDA TU CARRERA", {
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
  boton(x, y, w, texto, bg, cb, sub) {
    const r = this.add.rectangle(x, y, w, 52, bg, 1).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
    const t = this.add.text(x, sub ? y - 9 : y, texto, { fontFamily: window.PF.display, fontSize: "13px", color: "#0a1f13" }).setOrigin(0.5);
    const s = sub ? this.add.text(x, y + 11, sub, { fontFamily: window.PF.texto, fontSize: "13px", color: "#365a41", align: "center", wordWrap: { width: w - 16 } }).setOrigin(0.5) : null;
    /* en el teléfono la bajada crece (y puede ir en dos renglones): los dos
       se abren y el botón se estira a lo que ocupan */
    const alto = s ? window.PampaPiel.separarRenglones(t, s, 0) + 8 : 0;
    if (alto > 52) {
      window.PampaPiel.estirar(r, w, alto);
      const corre = y - (t.getBounds().y + s.getBounds().bottom) / 2;
      t.y += corre; s.y += corre;
    }
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
      fontFamily: window.PF.texto, fontSize: "13px", color: "#e3503e" }).setOrigin(0.5);
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
    const pegar = window.PampaCarrera ? this.boton(W / 2, yP, 460, "PEGAR UN CÓDIGO EN SU LUGAR", 0xffd84d, pegarEnSuLugar) : null;
    const borrar = this.boton(W / 2, yB, 460, "✕ SÍ, BORRAR Y ELEGIR OTRO CLUB", 0xe3503e, () => {
      const S = window.PampaSFX; if (S && S.ui) S.ui("confirmar");
      this.borrarCarrera();
    });
    /* arriba de los botones y no en H-22: ahi abajo cae el boton rojo y el pie
       le quedaba encima (se ve en SALIDA_02). Y aca ademas se lee ANTES de
       elegir, que es cuando sirve. */
    this.add.text(W / 2, 297, "el respaldo queda guardado en el navegador, pero no se puede volver desde acá", {
      fontFamily: window.PF.texto, fontSize: "13px", color: "#7a8a80" }).setOrigin(0.5);

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
      /* la red: se guarda antes de borrar. Cuesta una linea. (Revisión
         L07: lo último es la copia de la sesión, si la hay) */
      const viejo = this.crudoDeLaCarrera();
      if (viejo) localStorage.setItem("pampa_master_v1_borrada", viejo);
      localStorage.removeItem("pampa_master_v1");
    } catch (e) { }
    this.soltarCopiaDeLaSesion();
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
    const volver = this.boton(W / 2, yB, 420, "◀ VOLVER AL MENÚ", 0xf6efdc, () => this.irA("titulo"));
    /* el cursor arranca en VOLVER: empezar otra no se elige con un Enter de reflejo */
    if (this.grupoFoco) {
      this.grupoFoco([
        { obj: empezar, cb: () => this.empezarDeCero() },
        { obj: volver, cb: () => this.irA("titulo") }
      ], { inicial: 1, volver: () => this.irA("titulo") });
    }
    this.vestirPendientes && this.vestirPendientes();
  }
  /* empezar de cero después de un save roto: el texto ya quedó en
     pampa_master_v1_corrupta, así que acá se borra sin tocar el respaldo de
     una carrera borrada a propósito (pampa_master_v1_borrada) */
  empezarDeCero() {
    try { localStorage.removeItem("pampa_master_v1"); } catch (e) { }
    this.soltarCopiaDeLaSesion();
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
    return this.accesoDeAbajo(W - 20, H, "código de carrera", 1, () => this.vistaCodigo());
  }
  /* ══════════════════════════════════════════════════════════════════════
     L08c · 📲 INSTALAR, TAMBIÉN APAISADO.
     El botón vivía solo en la portada de index.html, que se ve en vertical:
     quien abría el juego apaisado (casi todos: se juega así) no lo veía.
     Ahora es el tercer acceso de abajo de la tabla, en el medio, entre la
     salida y el código: la tabla es la pantalla a la que se vuelve cada
     fecha y es quieta. Aparece SOLO cuando el navegador lo ofrece (el evento
     beforeinstallprompt guardado por la portada: PampaPortada.ofrece ===
     "prompt"); si llega con la tabla abierta, aparece en ese momento, y se va
     cuando ya no se ofrece (se usó, se instaló). En iPhone no hay diálogo:
     los pasos siguen en la portada vertical.
     AL SOLTAR, no al apoyar: el navegador abre el diálogo solo con un gesto,
     y con el dedo el gesto cuenta al soltar (como PANTALLA, pantalla_ui.js).
     Si el diálogo no abre, se dice qué hacer con el menú del navegador.
     ══════════════════════════════════════════════════════════════════════ */
  accesoAInstalar(W, H) {
    const PT = window.PampaPortada;
    if (!PT || typeof PT.instalar !== "function" || typeof PT.alCambiarInstalar !== "function") return null;
    if (this._soltarInstalar) { this._soltarInstalar(); this._soltarInstalar = null; }
    const t = this.add.text(W / 2, H - 26, "instalar el juego", {
      fontFamily: window.PF.texto, fontSize: "13px", color: "#9fb3a5",
      backgroundColor: "#0a1f13aa", padding: { x: 8, y: 4 }
    }).setOrigin(0.5, 0.5);
    if (this.pisoTactil) this.pisoTactil(t);
    if (!t.input) t.setInteractive({ useHandCursor: true });
    t.on("pointerdown", (p, xx, yy, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); });
    t.on("pointerup", (p, xx, yy, ev) => {
      ev && ev.stopPropagation && ev.stopPropagation();
      if (!t.visible) return;
      const S = window.PampaSFX; if (S && S.ui) S.ui("abrir");
      const r = PT.instalar();
      if (r === "menu") {
        this.cajaDeTexto({
          titulo: "Instalar el juego",
          texto: PT.textoMenu || "Para instalarlo: abrí el menú del navegador y elegí «Instalar app».",
          sinCaja: true,
          botones: [{ texto: "▶ VOLVER A LA TABLA", principal: true, accion: () => this.cerrarCaja() }]
        });
      }
    });
    const pintar = (ofrece) => {
      if (!t.scene) return;
      const si = ofrece === "prompt";
      t.setVisible(si);
      if (t.input) t.input.enabled = si;
    };
    pintar(PT.ofrece);
    const soltar = PT.alCambiarInstalar(pintar);
    this._soltarInstalar = soltar;
    t.once("destroy", () => { soltar(); if (this._soltarInstalar === soltar) this._soltarInstalar = null; });
    return t;
  }
  vistaCodigo() {
    const W = this.scale.width, H = this.scale.height, C = window.PampaCarrera;
    if (!C || !this.save) { this.scene.restart(); return; }
    const codigo = C.exportar(this.save);
    this.vaciarVista();
    this._atrasVista = () => this.scene.restart();   // L04: como ◀ VOLVER A LA TABLA
    if (this.fondoDelMaster) this.fondoDelMaster(); else this.fondoDePiel();
    this.add.text(W / 2, 46, "CÓDIGO DE CARRERA", { fontFamily: window.PF.display, fontSize: "16px", color: "#ffd84d" }).setOrigin(0.5);
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
      fontFamily: window.PF.texto, fontSize: "13px", color: "#9fb3a5" }).setOrigin(0.5);
    /* el resultado de copiar o compartir, con su signo (no solo color) */
    const estado = this.add.text(W / 2, 258, "", { fontFamily: window.PF.texto, fontSize: "14px", color: "#7ee08a", align: "center", wordWrap: { width: 780 } }).setOrigin(0.5);
    const decir = (txt) => { if (estado.scene) estado.setText(txt).setColor(/^✗/.test(txt) ? "#e3503e" : "#7ee08a"); };

    const piel = (this.game.registry.get("balance") || {}).piel;
    const puedeCompartir = typeof navigator !== "undefined" && typeof navigator.share === "function";
    const ops = [{ t: "COPIAR EL CÓDIGO", c: 0x7ee08a, cb: () => this.copiarCodigo(codigo, decir) }];
    if (puedeCompartir) ops.push({ t: "COMPARTIR", c: 0xffd84d, cb: () => this.compartirCodigo(codigo, decir) });
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
        titulo: "Tu código de carrera",
        texto: "No se pudo copiar solo. Está todo seleccionado: copialo (mantené apretado, o Ctrl+C) y guardalo donde quieras.",
        valor: codigo, soloLectura: true,
        botones: [{ texto: "LISTO", principal: true, accion: () => this.cerrarCaja() }]
      });
      /* el camino viejo de copiar, por si el navegador lo deja. Si anda,
         cambia TAMBIÉN el párrafo (revisión L03): si no, la caja decía a la
         vez "No se pudo copiar solo…" y "✔ Ya quedó copiado." */
      try {
        if (caja && document.execCommand && document.execCommand("copy")) {
          if (caja.p) caja.p.textContent = "Ya quedó copiado. Igual lo tenés acá abajo, por si querés guardarlo de otra forma.";
          caja.decir("Ya quedó copiado.");
        }
      } catch (e) { }
    };
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(codigo).then(() => decir("Copiado. Pegalo en un mensaje o en una nota para guardarlo."), aMano);
        return;
      }
    } catch (e) { }
    aMano();
  }
  compartirCodigo(codigo, decir) {
    try {
      navigator.share({ title: "Pampa Star · código de carrera",
        text: "Mi carrera de Pampa Star. Para seguirla: MODO MASTER → PEGAR UN CÓDIGO (si ya hay otra carrera: ✕ empezar otra carrera → PEGAR UN CÓDIGO EN SU LUGAR).\n\n" + codigo })
        .then(() => decir("Listo."), () => { });
    } catch (e) { decir("✗ No se pudo compartir: probá con COPIAR EL CÓDIGO."); }
  }
  /* enSuLugar: se llega desde ¿EMPEZAR OTRA CARRERA? con una carrera en
     curso, y se dice qué pasa con ella */
  pegarCodigo(enSuLugar) {
    this.cajaDeTexto({
      titulo: "PEGAR UN CÓDIGO DE CARRERA",
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
      const viejo = this.crudoDeLaCarrera();
      if (viejo) localStorage.setItem("pampa_master_v1_borrada", viejo);
    } catch (e) { }
    this.save = save;
    /* revisión L07: con el guardado bloqueado, la carrera del código queda
       en la copia de la sesión (guardar) y el restart la encuentra */
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
      this.events.once("shutdown", () => { this._cajaGancho = false; this.soltarAvisoPorApagado(); this.cerrarCaja(); });
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
    this._botonesElegir = null;
    /* 23/oct, Rodri: los menús sin música. El mapa y la entrevista suenan
       con el tema del título */
    this.pedirMusica("espera");
    this.add.text(W / 2, 26, "MODO MASTER", { fontFamily: window.PF.display, fontSize: "18px", color: "#ffd84d" }).setOrigin(0.5);
    this.add.text(W / 2, 54, "de la PRIMERA B de tu localidad al MUNDIAL · el campeón SUBE de división", { fontFamily: window.PF.texto, fontSize: "13px", color: "#f6efdc" }).setOrigin(0.5);

    /* tu club: pueblo del roster con su apodo (stepper con flechas dibujadas) */
    const roster = this.game.registry.get("roster");
    /* revisión del 22/oct: volviendo de la pinta (◀ VOLVER del editor) queda
       marcada la localidad que habías elegido */
    const elegida = this.pueblos && this.pueblos[this.pSel];
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
    if (this.pueblos.indexOf(elegida) >= 0) this.pSel = this.pueblos.indexOf(elegida);

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
       ve en la primera captura). Y el alto termina arriba del botón.
       TEMPO-1: el mapa bajó de 254 a 242 de alto y la nota de las ubicaciones
       pasó debajo de la ficha, para que entre la pregunta del tempo. */
    /* el mapa es esquemático: en el teléfono, con la letra más grande, se
       ensancha para que los diez nombres no se pisen */
    const anchoFicha = 232, aire = 18, anchoMapa = Math.round(330 * window.PampaPiel.factorDe(this.game));
    const x0Bloque = Math.round((W - (anchoMapa + aire + anchoFicha)) / 2);
    this.mapaCaja = { x: x0Bloque, y: 66, w: anchoMapa, h: 242, wFicha: anchoFicha, aire };

    /* ══════════════════════════════════════════════════════════════════════
       TEMPO-1 · CUÁNTO DURA CADA PARTIDO. Se elige UNA vez, acá, y queda en
       la carrera (save.tempo): antes era un menú antes de cada partido.
       NORMAL viene marcado, así que crear la carrera sin tocar nada no suma
       ningún toque. La elegida se distingue por FORMA y PALABRA, no solo por
       el color: borde grueso, un tilde dibujado (los glifos de tilde no
       están en las tipografías del juego) y ELEGIDO debajo. Las opciones
       entran al cursor del mapa (dibujarMapa arma el grupo con ellas).
       ══════════════════════════════════════════════════════════════════════ */
    const TB = this.game.registry.get("balance").tempo;
    const yT = 362, anchoT = 200, altoT = 48, pasoT = 216;
    this.add.text(W / 2, yT - 38, TB.titulo_creacion, { fontFamily: window.PF.display, fontSize: "14px", color: "#ffd84d" }).setOrigin(0.5);
    const caraT = this.add.graphics();
    const marcaT = this.add.text(0, yT + 37, "ELEGIDO", { fontFamily: window.PF.display, fontSize: "13px", color: "#ffd84d" }).setOrigin(0.5);
    const durT = window.PampaSaveMaster.duracionesActivas(this.game.registry.get("balance")).opciones;
    const opsT = durT.map((o, i) => ({ o, x: W / 2 + (i - (durT.length - 1) / 2) * pasoT }));
    const pintarT = () => {
      const PP = window.PampaPiel, P = this.piel();
      caraT.clear();
      opsT.forEach(({ o, x }) => {
        const sel = o.k === this._tempoElegido;
        const C = PP.capasBoton(sel ? 0xffd84d : 0xf6efdc, P);
        const x0 = x - anchoT / 2, y0 = yT - altoT / 2;
        caraT.fillStyle(C.canto, 1).fillRoundedRect(x0, y0 + C.cantoPx, anchoT, altoT, C.radio);
        caraT.fillStyle(C.cara, 1).fillRoundedRect(x0, y0, anchoT, altoT, C.radio);
        caraT.lineStyle(sel ? 5 : 2, 0x0a1f13, 1).strokeRoundedRect(x0, y0, anchoT, altoT, C.radio);
        if (sel) {
          const tx = x0 + 16, ty = yT - 9;
          caraT.lineStyle(4, 0x0a1f13, 1).beginPath();
          caraT.moveTo(tx - 6, ty).lineTo(tx - 1, ty + 6).lineTo(tx + 8, ty - 7).strokePath();
          marcaT.setX(x);
        }
      });
    };
    this._tempoFoco = opsT.map(({ o, x }) => {
      this.add.text(x, yT - 9, o.n, { fontFamily: window.PF.display, fontSize: "14px", color: "#0a1f13" }).setOrigin(0.5);
      this.add.text(x, yT + 11, o.d, { fontFamily: window.PF.texto, fontSize: "13px", color: "#365a41" }).setOrigin(0.5);
      /* zona de toque transparente: la cara la pinta pintarT (vestirPendientes no la viste) */
      const zona = this.add.rectangle(x, yT, anchoT, altoT, 0x000000, 0);
      if (this.pisoTactil) this.pisoTactil(zona);
      if (!zona.input) zona.setInteractive({ useHandCursor: true });
      const elegir = () => { this._tempoElegido = o.k; pintarT(); };
      zona.on("pointerdown", (p, xx, yy, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); elegir(); });
      return { obj: zona, cb: elegir };
    });
    pintarT();
    this.dibujarMapa();
    /* ola 3: con el cursor, las flechas van por el mapa, la duración y los
       botones, y ENTER elige. Estas dos cambiaban la localidad desde
       cualquier lado y devolvían el cursor al mapa: no se llegaba a ARRANCAR */
    if (this.input.keyboard && !this.grupoFoco) {
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
      this.game.registry.set("carreraPendiente", { division: divId, tempo: this._tempoElegido });
      this.irA("editor");
    };
    this._crearCarrera = (divId, origen) => {
      /* Sección 11: tu club lleva el APODO de tu localidad, no "Club " +
         localidad (así se nombra a clubes reales). Ver logic/master.js */
      const club = this.Ma.nombreDeTuClub(this.pueblos[this.pSel], this.game.registry.get("roster"));
      this.save = {
        v: (window.PampaSaveMaster && window.PampaSaveMaster.VERSION) || 1, club, pueblo: this.pueblos[this.pSel], division: divId, temporadaN: 1, titulos: [],
        origen: origen || null, bolsaEventos: [], modFecha: null, racha: 0,
        historial: [], golesTuyosTemporada: 0,
        tempo: window.PampaSaveMaster.tempoDe(this._tempoDeLaCarrera),
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
    /* V7 §3 LA MUDANZA: si el clásico tiene carrera, se puede IMPORTAR — tu
       nivel de allá te ubica en la división que corresponde (con backup) */
    let clasico = null;
    try { clasico = JSON.parse(localStorage.getItem("pampa_star_v1")); } catch (e) { }
    /* TEMPO-1: con IMPORTAR, los dos arranques van lado a lado en la misma fila */
    const hayClasico = !!(clasico && clasico.name);
    const botones = [];
    botones.push(this.boton(hayClasico ? W / 2 - 205 : W / 2, H - 102, hayClasico ? 400 : 420, "▶ ARRANCAR EN LA PRIMERA B", 0x7ee08a, () => arrancarEn(this.Ma.DIVISIONES[0].id)));
    /* el gate era `clasico.nivel`, un campo que el clasico no guarda nunca:
       el boton no aparecio jamas y la mudanza entera era inalcanzable. El nivel
       se CALCULA (logic/master.nivelDeCarreraClasica). Gate nuevo: que haya
       carrera de verdad, o sea nombre — un save recien creado con 0 goles da
       nivel 1 y tambien merece el boton. */
    if (hayClasico) {
      const nvImp = this.Ma.nivelDeCarreraClasica(clasico);
      const divImp = this.Ma.divisionPorNivel(nvImp);
      /* TEMPO-1: lo del respaldo va adentro del botón (era un renglón de
         10 px abajo, con el nombre de la clave de localStorage, y ya no
         entraba entre esta fila y la de abajo) */
      botones.push(this.boton(W / 2 + 205, H - 102, 400, "IMPORTAR TU CARRERA (nivel " + nvImp + " → " + divImp.n + ")", 0xffd84d, () => arrancarEn(divImp.id),
        "tu carrera de antes queda guardada, sin tocar"));
    }
    /* tanda 1.0: el código de carrera se pega acá, donde se empieza. Va al
       lado de VOLVER, del mismo tamaño: es la otra forma de entrar */
    if (window.PampaCarrera) {
      botones.push(this.boton(W / 2 - 160, H - 40, 300, "◀ VOLVER AL MENÚ", 0xf6efdc, () => this.irA("titulo")));
      botones.push(this.boton(W / 2 + 160, H - 40, 300, "PEGAR UN CÓDIGO", 0xffd84d, () => this.pegarCodigo()));
    } else {
      botones.push(this.boton(W / 2, H - 40, 300, "◀ VOLVER AL MENÚ", 0xf6efdc, () => this.irA("titulo")));
    }
    /* ola 3 · TECLADO: con flechas se elegía la localidad y la duración, pero
       ARRANCAR, IMPORTAR, VOLVER y PEGAR UN CÓDIGO solo andaban con el
       puntero. Entran al cursor del mapa (dibujarMapa lo rearma) */
    this._botonesElegir = botones.map(o => ({ obj: o, cb: () => o.emit("pointerdown", null, 0, 0, null) }));
    this.dibujarMapa();
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
  /* 25/oct · el final de la carrera: la lógica (logic/final.js) si la
     perilla está prendida y data/final.json cargó; si no, null */
  finalDeCarrera() {
    const B = this.game.registry.get("balance") || {};
    return B.flags && B.flags.carrera_final && window.PampaFinal && this.game.registry.get("final") ? window.PampaFinal : null;
  }
  /* la temporada n de tu club en esa división (la cuenta de _crearCarrera) */
  temporadaNueva(division, n) {
    return this.T.crear({
      division, miClub: this.save.club,
      rivales: this.DIV.divisiones[division].rivales,
      semilla: this.Ma.hashClub(this.save.club) * 31 + n
    });
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


    /* --- los pueblos --- */
    const sel = this.pueblos[this.pSel];
    /* EL CURSOR EN EL MAPA. Ya se navegaba con ◄► pero en una lista circular:
       en un mapa eso no tiene sentido, porque los pueblos estan en el espacio.
       Con foco geometrico, la flecha de abajo lleva al pueblo de abajo. */
    const _focoMapa = [], blancos = [], _nombresMapa = [];
    const pSel = ubic.find(p => p.nombre === sel);
    const est = pSel ? this.add.text(aX(pSel.x) - 26, aY(pSel.y), "★", { fontFamily: window.PF.texto, fontSize: "16px", color: "#ffd84d" }).setOrigin(0.5) : null;
    if (est) _nombresMapa.push(est.getBounds());
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
        capa.add([anillo, est]);
      }
      /* el nombre siempre visible: son diez, entran */
      const nom = this.add.text(x, y + (esSel ? 16 : 11), p.nombre,
        { fontFamily: window.PF.texto, fontSize: "13px",
          fontStyle: esSel ? "bold" : "normal", color: esSel ? "#ffd84d" : "#dcd6c2",
          backgroundColor: "#0a1f13cc", padding: { x: 3, y: 1 } }).setOrigin(0.5, 0);
      /* en el teléfono la letra crece y dos nombres vecinos se pisan: el que
         llega después prueba arriba de su punto, a la derecha y a la izquierda */
      const d = esSel ? 16 : 11;
      const lugares = [[x, y + d, 0.5, 0], [x, y - d, 0.5, 1], [x + d, y, 0, 0.5], [x - d, y, 1, 0.5]];
      const pisa = () => { const b = nom.getBounds(); return _nombresMapa.some(o => b.x < o.right && o.x < b.right && b.y < o.bottom && o.y < b.bottom); };
      const afuera = () => { const b = nom.getBounds(); return b.x < C.x || b.right > C.x + C.w; };
      if (pisa()) {
        let k = 1;
        for (; k < lugares.length; k++) {
          nom.setPosition(lugares[k][0], lugares[k][1]).setOrigin(lugares[k][2], lugares[k][3]);
          if (!pisa() && !afuera()) break;
        }
        if (k === lugares.length) nom.setPosition(lugares[0][0], lugares[0][1]).setOrigin(0.5, 0);
      }
      _nombresMapa.push(nom.getBounds());
      capa.add(nom);
      _focoMapa.push({ obj: punto, cb: () => {
        const k = this.pueblos.indexOf(p.nombre);
        if (k >= 0 && k !== this.pSel) { this.pSel = k; this.dibujarMapa(); }
      } });
      blancos.push({ nombre: p.nombre, x, y, caja: nom.getBounds() });
    });
    /* L10 · EL MAPA SE TOCA ENTERO. El punto medía 10 de diámetro (6,6 px CSS
       en el teléfono) y el nombre unos 17 de alto, contra los 61 lógicos de
       legibilidad.tap_min. Agrandar cada uno a 61 no servía: hay localidades
       a menos de 40 una de otra y el área de una tapaba el nombre de la
       vecina (medido en el navegador). Ahora el mapa es UNA zona y el toque
       elige la localidad más cercana a su punto o a su nombre, si está a
       menos de tap_min de alguno: cada una se queda con lo que tiene más
       cerca y ninguna le tapa nada a otra. */
    const tapMapa = ((this.game.registry.get("balance") || {}).legibilidad || {}).tap_min || 61;
    const zonaMapa = this.add.zone(C.x - 20, C.y - 10, C.w + 40, C.h + 30).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    zonaMapa.on("pointerdown", (pp, xx, yy, e2) => {
      e2 && e2.stopPropagation && e2.stopPropagation();
      const px = pp.worldX, py = pp.worldY;
      let mejor = null, dMejor = Infinity;
      blancos.forEach(b => {
        const dx = Math.max(b.caja.x - px, 0, px - b.caja.right), dy = Math.max(b.caja.y - py, 0, py - b.caja.bottom);
        const d = Math.min(Math.hypot(px - b.x, py - b.y), Math.hypot(dx, dy));
        if (d < dMejor) { dMejor = d; mejor = b; }
      });
      if (!mejor || dMejor > tapMapa) return;
      const i = this.pueblos.indexOf(mejor.nombre);
      if (i >= 0 && i !== this.pSel) { this.pSel = i; this.dibujarMapa(); }
    });
    capa.add(zonaMapa);

    /* --- las zonas, nombradas: el mapa es esquemático y se dice --- */
    /* la etiqueta va en una ESQUINA de su caja, no en el medio: en el medio
       quedaba abajo de los nombres de los pueblos y las dos cosas se pisaban
       (se ve en la primera captura). TEMPO-1: aun en la esquina, CENTRO caía
       sobre la estrella de Winifreda y ESTE sobre Intendente Alvear (medido
       con getBounds). Ahora se prueba esquina por esquina, después de ubicar
       los pueblos, y va en la primera que no pisa ninguno; si ninguna sirve,
       esa zona queda sin rótulo (la de tu localidad la dice la ficha). */
    const caja = (o) => ({ x: o.x - o.width * (o.originX || 0), y: o.y - o.height * (o.originY || 0), w: o.width, h: o.height });
    const ocupado = capa.list.filter(o => o.type === "Text" || o.type === "Arc").map(caja);
    const pisa = (b) => ocupado.some(o => b.x < o.x + o.w && o.x < b.x + b.w && b.y < o.y + o.h && o.y < b.y + b.h);
    /* adentro del contorno, no solo de la caja: la punta de abajo está recortada */
    const enProvincia = (x, y) => {
      let dentro = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) dentro = !dentro;
      }
      return dentro;
    };
    Object.keys(M.ZONAS).forEach(z => {
      const Z = M.ZONAS[z];
      /* 20/oct: era #2f5c40 sobre el #14301f del mapa (1,8 a 1, no se leía);
         #8fb89c da 6,4 a 1. Se distingue de los nombres de las localidades
         por la forma, no solo por el color: va en mayúsculas y sin chapita.
         CENTRO no entraba en ninguna esquina (le caen localidades en las
         cuatro): después de las esquinas se busca un hueco en toda la caja,
         de a 6 px */
      const t = this.add.text(0, 0, Z.n, { fontFamily: window.PF.texto, fontSize: "13px", color: "#8fb89c" });
      const lugares = [[aX(Z.x0) + 4, aY(Z.y0) + 2, 0, 0], [aX(Z.x1) - 4, aY(Z.y0) + 2, 1, 0],
        [aX(Z.x0) + 4, aY(Z.y1) - 2, 0, 1], [aX(Z.x1) - 4, aY(Z.y1) - 2, 1, 1]];
      for (let y = aY(Z.y0) + 8; y <= aY(Z.y1) - 8; y += 6) for (let x = aX(Z.x0) + 24; x <= aX(Z.x1) - 24; x += 6) lugares.push([x, y, 0.5, 0.5]);
      const lugar = lugares.find(([x, y, ox, oy]) => {
          t.setPosition(x, y).setOrigin(ox, oy);
          const b = caja(t);
          return [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]].every(([px, py]) => enProvincia(px, py)) && !pisa(b);
        });
      if (!lugar) { t.destroy(); return; }
      ocupado.push(caja(t));
      capa.add(t);
    });

    /* --- la ficha del elegido: club, apodo y en qué división arranca --- */
    const info = clubes[sel] || {};
    const divN = (this.Ma && this.Ma.DIVISIONES && this.Ma.DIVISIONES[0]) ? this.Ma.DIVISIONES[0].n : "PRIMERA B";
    const anchoF = C.wFicha || 216, medioF = anchoF / 2;
    const fx = C.x + C.w + (C.aire || 18);
    const fichaY = C.y + 14;
    const ficha = this.add.rectangle(fx + medioF, fichaY + 66, anchoF, 148, 0x0a1f13, 0.72).setStrokeStyle(3, 0xffd84d, 0.9);
    capa.add(ficha);
    const renglones = [];
    renglones.push(this.add.text(fx + medioF, fichaY + 12, "★ TU CLUB", { fontFamily: window.PF.texto, fontSize: "13px", color: "#f6c11d" }).setOrigin(0.5));
    /* Sección 11: el nombre del club ES el apodo (antes: "Club " + localidad
       arriba y el apodo entre comillas abajo). Abajo va la localidad. */
    renglones.push(this.add.text(fx + medioF, fichaY + 44, this.Ma.nombreDeTuClub(sel, this.game.registry.get("roster")), { fontFamily: window.PF.texto, fontSize: "15px", fontStyle: "bold", color: "#f6efdc", align: "center", wordWrap: { width: 200 } }).setOrigin(0.5));
    /* si el nombre ya trae la localidad ("El Bagual de Winifreda"), abajo no se repite */
    if (this.Ma.nombreDeTuClub(sel, this.game.registry.get("roster")).indexOf(sel) < 0) renglones.push(this.add.text(fx + medioF, fichaY + 82, "de " + sel, { fontFamily: window.PF.texto, fontSize: "13px", color: "#7ee08a", align: "center", wordWrap: { width: 200 } }).setOrigin(0.5));
    renglones.push(this.add.text(fx + medioF, fichaY + 112, "arranca en " + divN, { fontFamily: window.PF.texto, fontSize: "13px", color: "#dcd6c2" }).setOrigin(0.5));
    const zN = (M.ZONAS[info.zona] || {}).n || "—";
    renglones.push(this.add.text(fx + medioF, fichaY + 132, "zona " + zN.toLowerCase(), { fontFamily: window.PF.texto, fontSize: "13px", color: "#9fb3a5" }).setOrigin(0.5));
    capa.add(renglones);
    /* en el teléfono la letra crece: los renglones bajan y la ficha se estira */
    const antes = renglones.map(t => t.y);
    const finTexto = window.PampaPiel.apilarSiPisa(renglones, 0);
    const finFicha = renglones.some((t, i) => t.y !== antes[i]) ? Math.max(fichaY + 140, finTexto + 4) : fichaY + 140;
    if (finFicha > fichaY + 140) window.PampaPiel.estirar(ficha, anchoF, finFicha - (fichaY - 8)).setY((fichaY - 8 + finFicha) / 2);

    if (this.grupoFoco && _focoMapa.length) {
      const iSel = ubic.findIndex(p => p.nombre === sel);
      this.grupoFoco(_focoMapa.concat(this._tempoFoco || [], this._botonesElegir || []), { inicial: iSel >= 0 ? iSel : 0, sinTeclado: false });
      /* el cursor hace tocable cada punto; en el mapa el dedo va a la zona */
      _focoMapa.forEach(it => it.obj.disableInteractive());
    }
    /* TEMPO-1: va debajo de la ficha y no debajo del mapa, donde ahora está
       la pregunta del tempo. 20/oct, Rodri: la nota "mapa por zonas · las
       ubicaciones exactas van cuando estén los datos" sonaba a pendiente de
       desarrollo; la zona ya la dice la ficha, y acá va cómo se cambia */
    capa.add(this.add.text(fx + medioF, Math.max(fichaY + 152, finFicha + 12), "tocá otra localidad para cambiar",
      { fontFamily: window.PF.texto, fontSize: "13px", color: "#9fb3a5", align: "center", wordWrap: { width: anchoF } }).setOrigin(0.5, 0));
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
    this.pedirMusica("espera");
    const p = D.origen[paso];
    /* O2 · LA ENTREVISTA. El contenido y las consecuencias son EXACTAMENTE las
       mismas —los stats salen de D.origen y esta pantalla no los mira—; lo que
       cambia es que ahora hay alguien enfrente preguntando. Si falta
       data/entrevista.json, se cae al texto plano de siempre. */
    const E = this.game.registry.get("entrevista");
    const qe = E && E.preguntas && E.preguntas[p.id];
    /* revisión final del 23/oct: si aprendiste solo, Nito no pregunta por quien te enseñó */
    const sg = qe && qe.segun;
    const dice = sg && elegidas[D.origen.findIndex(o => o.id === sg.pregunta)] === sg.respuesta ? sg.dice : qe && qe.dice;
    this.add.text(W / 2, 34, "TU HISTORIA · " + (paso + 1) + " de 3", { fontFamily: window.PF.display, fontSize: "13px", color: "#ffd84d" }).setOrigin(0.5);
    /* 23/oct, Rodri: "los diálogos están mal puestos y no se leen". Con
       flags.entrevista_un_globo habla uno por vez, en un globo que sale de
       quien habla (globosDeLaEntrevista); con false, lo de antes */
    const unGlobo = !!(qe && this.game.registry.get("balance").flags.entrevista_un_globo);
    const voces = unGlobo ? this.globosDeLaEntrevista(E) : null;
    const tDice = qe && !unGlobo ? this.entrevistador(E, dice) : null;
    /* D5 · y de este lado estás vos, con la pinta que elegiste recién */
    if (qe) { if (!unGlobo) this.entrevistado(); }
    else this.add.text(W / 2, 84, p.pregunta, { fontFamily: window.PF.texto, fontSize: "19px", color: "#f6efdc" }).setOrigin(0.5);
    /* O1 · las cuatro respuestas estaban en columna desde y=150, o sea ARRIBA.
       Bajan a la franja de decisión: 4 de 52 px entran justo en los 212 útiles
       (piel.caben lo confirma). Arriba queda el que pregunta, que es lo que se
       mira; abajo lo que se toca. */
    /* 20/oct, Rodri: las respuestas estaban a la vista y se podían tocar
       antes de que Nito terminara de preguntar. Aparecen cuando la pregunta
       terminó de escribirse, o cuando un toque la completa */
    const ponerOpciones = () => {
      /* con un globo, la ayuda de las respuestas sale con ellas */
      if (unGlobo) ayuda();
      const pielCfg = (this.game.registry.get("balance") || {}).piel;
      const _focoEnt = [];
      p.opciones.forEach((o, i) => {
        const y = Math.round(window.PampaPiel.yDeOpcion(i, p.opciones.length, 52, pielCfg));
        const r = this.add.rectangle(W / 2, y, 720, 52, 0xf6efdc, 0.97).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
        /* la respuesta DICHA reemplaza al rótulo, pero el subtítulo original
           queda: es lo que le dice al jugador qué tipo de jugador está eligiendo */
        /* 20/oct · una línea corta (corto) y la bajada (sub) abajo, con su
           dibujito. textos-tactiles: el número es el atajo de teclado; en el
           teléfono no va */
        this.dibujarIcono(W / 2 - 360 + 32, y, o.ico);
        this.add.text(W / 2, y - 9, (this.sys.game.device.input.touch ? "" : (i + 1) + " · ") + o.corto, { fontFamily: window.PF.display, fontSize: "13px", color: "#0a1f13", align: "center" }).setOrigin(0.5);
        /* revisión final del 23/oct, pedido de Rodri: claras en qué influyen.
           Después de la bajada, lo que suma y lo que resta, con palabras */
        const efO = window.PampaDialogo ? ": " + window.PampaDialogo.bajadaDeEfecto(o.stats) : "";
        this.add.text(W / 2, y + 13, o.sub + efO, { fontFamily: window.PF.texto, fontSize: "15px", color: "#365a41" }).setOrigin(0.5);
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
    };
    /* 20/oct · las respuestas en pantalla son cortas; lo que contestaste
       DICHO (entrevista.json, respuestas) lo decís vos al arrancar la
       pregunta siguiente, y recién después pregunta Nito */
    if (qe) {
      const qAntes = paso > 0 && E.preguntas[D.origen[paso - 1].id];
      const dichaAntes = qAntes && qAntes.respuestas && qAntes.respuestas[elegidas[paso - 1]];
      const preguntar = () => voces.decir("nito", dice, ponerOpciones);
      if (unGlobo && dichaAntes) voces.decir("vos", "«" + dichaAntes + "»", preguntar);
      else if (unGlobo) preguntar();
      else if (dichaAntes) {
        tDice.setText("");
        const tEco = this.add.text(W - 156, 196, "", { fontFamily: window.PF.texto, fontSize: "15px", color: "#f6efdc", backgroundColor: "#0a1f13dd", padding: { x: 8, y: 3 } }).setOrigin(1, 0.5);
        /* 22/oct, Rodri: el eco decía "▼ VOS:" al lado de la placa "▼ VOS" de
           tu retrato; quién habla ya lo dicen la placa y el lado */
        this.escribir(tEco, "«" + dichaAntes + "»", "vos", () => this.escribir(tDice, dice, "nito", ponerOpciones));
      } else this.escribir(tDice, dice, "nito", ponerOpciones);
    } else ponerOpciones();
    /* V1 (cantidad + alineación): estaba en H-26, o sea DEBAJO de la cuarta
       opción, y quedaba tapado. Y decía dos cosas: cómo se toca (que el jugador
       descubre solo) y que no hay opción mala (que sí importa, porque saca el
       miedo a equivocarse). Queda la segunda, arriba de las opciones. */
    const ayuda = () => this.add.text(W / 2, 246, "no hay opción mala: cada respuesta te da algo distinto", { fontFamily: window.PF.texto, fontSize: "13px", color: "#7ee08a" }).setOrigin(0.5).setAlpha(0.9);
    if (!unGlobo) ayuda();
  }

  /* ══════════════════════════════════════════════════════════════════════
     23/oct · LA ENTREVISTA, UNA VOZ POR VEZ (flags.entrevista_un_globo).

     Rodri: "los diálogos están mal puestos y no se leen". Medido a 960x540
     con getBounds: tu respuesta salía en una franja oscura suelta (x 300 a
     804, y 184 a 209), debajo del globo de Nito y lejos de tu retrato,
     mientras el globo de Nito quedaba vacío al lado; el nombre de Nito
     ocupaba un renglón de 449 px y la pregunta iba a 15 px.

     Ahora hay UN globo entre los dos retratos: sale de quien habla (la cola
     apunta a su cara), lleva su nombre arriba, crece con el texto y el que
     escucha queda apagado. Quién habla se lee por la cola, el nombre y el
     retrato encendido, no por un color. Las respuestas aparecen abajo
     cuando terminó la pregunta (vistaOrigen, ponerOpciones).
     ══════════════════════════════════════════════════════════════════════ */
  globosDeLaEntrevista(E) {
    const W = this.scale.width;
    const y = 118;                                  // la altura de las dos caras
    this.entrevistador(E, null, y);
    this.entrevistado();
    /* las placas con el nombre debajo de cada cara */
    this.add.text(96, y + 80, "NITO", {
      fontFamily: window.PF.texto, fontSize: "13px", fontStyle: "bold",
      color: "#0a1f13", backgroundColor: "#F5C400", padding: { x: 8, y: 3 }
    }).setOrigin(0.5);
    /* el que escucha, apagado: un velo sobre su marco y su placa */
    const velo = {
      nito: this.add.rectangle(96, y + 17, 112, 150, 0x060f0a, 0.6).setVisible(false),
      vos: this.add.rectangle(W - 92, y + 17, 112, 150, 0x060f0a, 0.6).setVisible(false)
    };
    const bx = 168, bw = (W - 160) - bx, top = y - 52;
    const globo = this.add.graphics();
    const nombre = this.add.text(bx + 18, top + 12, "", { fontFamily: window.PF.texto, fontSize: "14px", fontStyle: "bold", color: "#365a41" });
    const cuerpo = this.add.text(bx + 18, top + 36, "", {
      fontFamily: window.PF.texto, fontSize: "17px", color: "#0a1f13", wordWrap: { width: bw - 36 }, lineSpacing: 3
    });
    const nombres = { nito: (E.entrevistador && E.entrevistador.placa) || "NITO", vos: "VOS" };
    const decir = (quien, texto, alTerminar) => {
      /* el alto sale del texto entero ya envuelto: el globo no crece letra a letra */
      cuerpo.setText(texto);
      const alto = Math.max(100, 36 + cuerpo.height + 18);
      cuerpo.setText("");
      nombre.setText(nombres[quien]);
      globo.clear();
      globo.fillStyle(0xf6efdc, 0.97);
      globo.fillRoundedRect(bx, top, bw, alto, 8);
      if (quien === "nito") globo.fillTriangle(bx + 1, y - 10, bx + 1, y + 14, bx - 18, y + 2);
      else globo.fillTriangle(bx + bw - 1, y - 10, bx + bw - 1, y + 14, bx + bw + 18, y + 2);
      globo.lineStyle(3, 0x0a1f13, 1);
      globo.strokeRoundedRect(bx, top, bw, alto, 8);
      velo.nito.setVisible(quien !== "nito");
      velo.vos.setVisible(quien !== "vos");
      this.escribir(cuerpo, texto, quien, alTerminar);
    };
    return { decir, globo, nombre, cuerpo, velo };
  }

  /* O2 · EL ENTREVISTADOR: quién pregunta, y la pregunta como globo de diálogo.
     Se dibuja con Graphics — no hay retrato de periodista en assets/, y pedirlo
     era detener el punto. La silueta con el micrófono alcanza para que se
     entienda que hay alguien enfrente; el retrato queda como pedido de arte. */
  entrevistador(E, dice, yRetrato) {
    const W = this.scale.width;
    const x = 96, y = yRetrato || 108;
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
    /* sin pregunta, solo el retrato (la entrevista de un globo) */
    if (dice == null) return null;
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
      fontFamily: window.PF.texto, fontSize: "13px", fontStyle: "bold", color: "#365a41", wordWrap: { width: bw - 32 }
    });
    return this.add.text(bx + 16, y - 18, dice, {
      fontFamily: window.PF.texto, fontSize: "15px", color: "#0a1f13", wordWrap: { width: bw - 32 }, lineSpacing: 2
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     20/oct · LETRA POR LETRA (playtest de Rodri, punto 3).

     El texto se envuelve UNA vez con su ancho final y se va mostrando ese
     texto ya envuelto: así una palabra no arranca en un renglón y salta al
     otro a mitad de escribirse. Las letras salen por reloj (letrasA), no por
     cuadro, y cada tanda nueva con letras suena con la voz de quien habla
     (SFX.voz, la madera de la interfaz con su tono). Un toque en cualquier
     lado de la pantalla lo completa. Uno a la vez: el que arranca corta al
     anterior, y vaciarVista corta el que haya.
     ══════════════════════════════════════════════════════════════════════ */
  escribir(txt, texto, quien, alTerminar) {
    this.cortarEscritura();
    this.escucharToque();
    const cfg = this.game.registry.get("balance").dialogo;
    const D = window.PampaDialogo, S = window.PampaSFX;
    const envuelto = txt.runWordWrap ? txt.runWordWrap(texto) : texto;
    txt.setText("");
    const t0 = this.time.now;
    let n = 0, golpes = 0;
    const e = {};
    e.terminar = () => {
      e.ev.remove(false);
      this._escritura = null;
      txt.setText(envuelto);
      if (alTerminar) alTerminar();
    };
    e.ev = this.time.addEvent({
      delay: cfg.ms_letra, loop: true, callback: () => {
        const k = D.letrasA(this.time.now - t0, envuelto.length, cfg.ms_letra);
        if (k <= n) return;
        const nuevas = envuelto.slice(n, k);
        n = k;
        txt.setText(envuelto.slice(0, k));
        if (S && S.voz && [...nuevas].some(D.conVoz)) S.voz(D.tono(cfg, quien, golpes++), cfg.piso_voz_ms, cfg.corte_ms);
        if (k >= envuelto.length) e.terminar();
      }
    });
    this._escritura = e;
  }
  /* true si había algo escribiéndose (y quedó completo) */
  completarEscritura() {
    if (!this._escritura) return false;
    this._escritura.terminar();
    return true;
  }
  cortarEscritura() {
    if (!this._escritura) return;
    this._escritura.ev.remove(false);
    this._escritura = null;
  }
  /* el toque que completa: uno por escena. Los botones cortan la propagación,
     así que tocar una opción elige y no completa */
  escucharToque() {
    if (this._toqueEscritura) return;
    const fn = this._toqueEscritura = () => this.completarEscritura();
    this.input.on("pointerdown", fn);
    /* ola 3 · TECLADO: mientras se escribe todavía no hay opciones ni cursor
       (la previa, la entrevista, el evento) y ENTER no hacía nada. ENTER o
       ESPACIO completan, como el toque; las opciones llegan con su cursor */
    const kb = this.input.keyboard, teclas = kb ? ["keydown-ENTER", "keydown-SPACE"] : [];
    /* con un cursor vivo, la tecla es suya (el de la previa completa y pasa de página) */
    const conTecla = () => {
      const F = this._foco;
      if (F && F.vivo && F.items.some(it => it.obj && it.obj.active)) return;
      this.completarEscritura();
    };
    teclas.forEach(k => kb.on(k, conTecla));
    this.events.once("shutdown", () => { this.input.off("pointerdown", fn); teclas.forEach(k => kb.off(k, conTecla)); this._toqueEscritura = null; });
  }

  /* ══════════════════════════════════════════════════════════════════════
     20/oct · EL DIBUJITO DE CADA OPCIÓN. Hecho con Graphics, sin arte nuevo
     y sin baldosa ni círculo detrás: la figura sola, maciza, en el color del
     texto. Se distinguen por FORMA. El de la entrevista lo declara
     data/eventos_temporada.json (origen[].opciones[].ico); el del evento
     sale de su efecto (logic/dialogo.js iconoDeEfecto).
     ══════════════════════════════════════════════════════════════════════ */
  dibujarIcono(x, y, id) {
    const g = this.add.graphics({ x, y });
    const c = 0x0a1f13;
    g.fillStyle(c, 1); g.lineStyle(3, c, 1);
    const flechaA = (x1, y1, x2, y2) => {
      g.lineBetween(x1, y1, x2, y2);
      const a = Math.atan2(y2 - y1, x2 - x1), L = 8;
      g.fillTriangle(x2 + Math.cos(a) * 3, y2 + Math.sin(a) * 3,
        x2 - Math.cos(a - 0.5) * L, y2 - Math.sin(a - 0.5) * L,
        x2 - Math.cos(a + 0.5) * L, y2 - Math.sin(a + 0.5) * L);
    };
    const DIBUJO = {
      pelota: () => { g.strokeCircle(0, 0, 12); g.fillCircle(0, 0, 4); g.lineBetween(0, -4, 0, -12); g.lineBetween(4, 1, 11, 4); g.lineBetween(-4, 1, -11, 4); },
      escudo: () => { g.strokePoints([{ x: -11, y: -12 }, { x: 11, y: -12 }, { x: 11, y: 2 }, { x: 0, y: 13 }, { x: -11, y: 2 }], true); g.lineBetween(-11, -4, 11, -4); },
      casa: () => { g.strokeRect(-12, -9, 24, 19); g.lineBetween(-12, -3, 12, -3); g.lineBetween(-12, 4, 12, 4); g.lineBetween(-3, -9, -3, -3); g.lineBetween(5, -3, 5, 4); g.lineBetween(-3, 4, -3, 10); },
      dos: () => { g.fillCircle(-6, -6, 5); g.fillCircle(7, -6, 5); g.fillRoundedRect(-12, 1, 11, 12, 3); g.fillRoundedRect(2, 1, 11, 12, 3); },
      sol: () => { g.fillCircle(0, -2, 6); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.lineBetween(Math.cos(a) * 9, -2 + Math.sin(a) * 9, Math.cos(a) * 13, -2 + Math.sin(a) * 13); } },
      libro: () => { g.strokePoints([{ x: 0, y: -8 }, { x: -12, y: -11 }, { x: -12, y: 9 }, { x: 0, y: 12 }, { x: 12, y: 9 }, { x: 12, y: -11 }], true); g.lineBetween(0, -8, 0, 12); },
      pala: () => { g.lineBetween(0, -13, 0, 3); g.lineBetween(-5, -13, 5, -13); g.fillRoundedRect(-6, 2, 12, 11, 3); },
      llave: () => {
        g.lineStyle(5, c, 1); g.lineBetween(-11, 11, 3, -3);
        /* la boca abierta hacia afuera: sin ella se lee como una lupa */
        g.lineStyle(4, c, 1); g.beginPath(); g.arc(6, -6, 6, -Math.PI / 4 + 0.8, -Math.PI / 4 - 0.8 + Math.PI * 2, false); g.strokePath();
      },
      corazon: () => { g.fillCircle(-5, -3, 6); g.fillCircle(5, -3, 6); g.fillTriangle(-11, -1, 11, -1, 0, 12); },
      flecha: () => { g.lineStyle(5, c, 1); g.lineBetween(-12, 0, 4, 0); g.fillTriangle(2, -9, 13, 0, 2, 9); },
      rayo: () => { g.fillPoints([{ x: 3, y: -13 }, { x: -8, y: 2 }, { x: -1, y: 2 }, { x: -4, y: 13 }, { x: 8, y: -3 }, { x: 1, y: -3 }], true); },
      botin: () => { g.fillPoints([{ x: -12, y: -7 }, { x: -4, y: -7 }, { x: -2, y: 1 }, { x: 12, y: 3 }, { x: 12, y: 8 }, { x: -12, y: 8 }], true); g.fillRect(-10, 9, 3, 3); g.fillRect(-2, 9, 3, 3); g.fillRect(7, 9, 3, 3); },
      pase: () => { g.fillCircle(-9, 7, 4); flechaA(-4, 4, 11, -7); },
      gambeta: () => { g.lineBetween(-12, 8, -5, -6); g.lineBetween(-5, -6, 2, 8); flechaA(2, 8, 11, -7); },
      pesa: () => { g.lineBetween(-8, 0, 8, 0); g.fillRect(-13, -7, 5, 14); g.fillRect(8, -7, 5, 14); },
      cruz: () => { g.strokeCircle(0, 0, 13); g.fillRect(-3, -9, 6, 18); g.fillRect(-9, -3, 18, 6); },
      reloj1: () => { g.strokeCircle(0, 0, 12); g.slice(0, 0, 12, -Math.PI / 2, Math.PI / 2, false); g.fillPath(); },
      reloj2: () => { g.strokeCircle(0, 0, 12); g.slice(0, 0, 12, Math.PI / 2, Math.PI * 1.5, false); g.fillPath(); },
      guante: () => { g.fillRoundedRect(-9, -2, 18, 14, 4); g.fillRect(-9, -11, 4, 10); g.fillRect(-4, -13, 4, 12); g.fillRect(1, -12, 4, 11); g.fillRect(6, -9, 4, 8); },
      choque: () => { g.fillTriangle(-13, -9, -13, 9, -2, 0); g.fillTriangle(13, -9, 13, 9, 2, 0); },
      igual: () => { g.fillRect(-11, -7, 22, 5); g.fillRect(-11, 3, 22, 5); }
    };
    if (!DIBUJO[id]) throw new Error("no hay dibujito '" + id + "'");
    DIBUJO[id]();
    return g;
  }

  /* 20/oct · la cara de un relator: un cuadro de assets/ui/relatores.webp
     (portraits_manifest.relator.caras), sin tocar el archivo */
  caraDeRelator(x, y, lado, id) {
    const man = this.game.registry.get("portraits");
    const tex = this.textures.get("relatores");
    if (!tex.has(id)) { const r = man.relator.caras[id]; tex.add(id, 0, r[0], r[1], r[2], r[3]); }
    return this.add.image(x, y, "relatores", id).setDisplaySize(lado, lado);
  }

  /* ══════════════════════════════════════════════════════════════════════
     20/oct · LA PREVIA DE LA FECHA (playtest de Rodri, punto 3).

     Va después de cerrar la semana y antes de salir a la cancha. Un relator
     de la previa cuenta, de a una página, quién es el rival, su estrella (que
     después juega de verdad en la cancha: viaja en masterPartido.estrella),
     algo de su localidad y su frase de previa. Todo sale de data
     (relatos.previa_fecha, relatos.relatores, el roster); el armado, de
     logic/dialogo.js. Un toque completa la página o pasa a la siguiente; A LA
     CANCHA está siempre, para el que no quiere leer.

     Atrás también va a la cancha: la semana ya se cerró y no se rehace.
     ══════════════════════════════════════════════════════════════════════ */
  vistaPrevia(rival, alSeguir) {
    const W = this.scale.width, H = this.scale.height;
    const D = window.PampaDialogo, REL = this.game.registry.get("relatos");
    const t = this.save.temporada;
    const puesto = this.T.posiciones(t).findIndex(f => f.equipo === rival) + 1;
    const pv = D.previaDeLaFecha({
      rival, division: this.save.division, roster: this.game.registry.get("roster"),
      previa: REL.previa_fecha, relatores: REL.relatores, perfil: this.Ma.perfilRival(rival).n,
      puesto: puesto + "º", fecha: t.fecha, hash: D.hash
    });
    this.vaciarVista();
    this._atrasVista = () => alSeguir();
    if (this.fondoDelMaster) this.fondoDelMaster();
    this.add.text(W / 2, 16, "LA PREVIA · fecha " + ((t.fecha | 0) + 1), { fontFamily: window.PF.texto, fontSize: window.PampaPiel.nivel(3), color: "#f6efdc", backgroundColor: "#0a1f13cc", padding: { x: 6, y: 2 } }).setOrigin(0.5);
    const tR = this.add.text(W / 2, 50, "contra " + rival.toUpperCase(), { fontFamily: window.PF.display, fontSize: window.PampaPiel.nivel(1), color: "#f6efdc" }).setOrigin(0.5);
    if (window.PampaEscudosUI && window.PampaEscudos) {
      const esc = window.PampaEscudosUI.deClub(this, rival, this.T.posiciones(t).map(p => p.equipo), t.division);
      window.PampaEscudosUI.dibujar(this, tR.x - tR.width / 2 - 26, 50, 30, esc);
    }
    /* el relator a la izquierda, con su nombre en placa */
    const xc = 120, yc = 214, lado = 150;
    const marco = this.add.graphics();
    marco.fillStyle(0x0e2a1a, 1); marco.fillRect(xc - lado / 2 - 6, yc - lado / 2 - 6, lado + 12, lado + 12);
    this.caraDeRelator(xc, yc, lado, pv.relator);
    marco.lineStyle(3, 0xf5c400, 1); marco.strokeRect(xc - lado / 2 - 6, yc - lado / 2 - 6, lado + 12, lado + 12);
    this.add.text(xc, yc + lado / 2 + 18, pv.nombre, { fontFamily: window.PF.texto, fontSize: "15px", color: "#0a1f13", backgroundColor: "#f5c400", padding: { x: 6, y: 2 } }).setOrigin(0.5);
    /* el globo, con la cola hacia la cara */
    const bx = 216, by = 128, bw = W - 40 - bx, bh = 176;
    const globo = this.add.rectangle(bx + bw / 2, by + bh / 2, bw, bh, 0xf6efdc, 0.97).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
    const cola = this.add.graphics();
    cola.fillStyle(0xf6efdc, 1); cola.fillTriangle(bx + 2, yc - 12, bx + 2, yc + 12, bx - 18, yc);
    const txt = this.add.text(bx + 18, by + 16, "", { fontFamily: window.PF.texto, fontSize: "19px", color: "#0a1f13", wordWrap: { width: bw - 36 }, lineSpacing: 4 });
    const pag = this.add.text(bx + bw - 12, by + bh - 10, "", { fontFamily: window.PF.texto, fontSize: "13px", color: "#365a41" }).setOrigin(1, 1);
    /* la semana de cuatro cosas: lo que elegiste, dicho antes de entrar */
    const sr = this.save.semanaResumen;
    /* arriba fijo y no al medio: en el teléfono va en dos renglones y crece
       para abajo, sin tapar el nombre de quien habla */
    if (sr && sr.renglones) this.add.text(W / 2, 333, "ESTA FECHA VAS A TENER: " + sr.renglones.join(" · "), { fontFamily: window.PF.texto, fontSize: "15px", color: "#7ee08a", align: "center", wordWrap: { width: 880 }, backgroundColor: "#0a1f13cc", padding: { x: 8, y: 4 } }).setOrigin(0.5, 0);
    let i = 0, b = null;
    const mostrar = () => {
      pag.setText((i + 1) + " de " + pv.paginas.length + (i < pv.paginas.length - 1 ? "  ▸ seguir" : ""));
      this.escribir(txt, pv.paginas[i], pv.relator, b ? null : ponerBoton);
    };
    const seguir = () => {
      if (this.completarEscritura()) return;
      if (i < pv.paginas.length - 1) { i++; mostrar(); }
    };
    globo.on("pointerdown", (p, xx, yy, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); seguir(); });
    const irse = () => { this.cortarEscritura(); alSeguir(); };
    /* con teclado, ENTER y ESPACIO (los del cursor) leen de a una página y en
       la última salen a la cancha; el botón, tocado, sale siempre */
    const conTeclado = () => {
      if (this.completarEscritura()) return;
      if (i < pv.paginas.length - 1) { i++; mostrar(); } else irse();
    };
    /* 20/oct, Rodri: el botón aparece cuando la primera página terminó de
       escribirse (o un toque la completó), no antes */
    const ponerBoton = () => {
      b = this.boton(W / 2, H - 70, 320, "▶ A LA CANCHA", 0x7ee08a, irse);
      if (this.grupoFoco) this.grupoFoco([{ obj: b, cb: conTeclado }], { inicial: 0 });
    };
    mostrar();
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
    /* revisión final del 22/oct: el editor dice "te van a ver así" con el
       busto de la cara elegida, y acá salía la pose, con otro peinado. Va ese
       busto (el mismo que el retrato del partido); sin él, la pose teñida */
    const busto = this.game.registry.get("bustoElegido");
    const key = busto && this.textures.exists(busto) ? busto : this.poseConTuPinta("recibiendo");
    if (key) {
      const R = 40, cy = y + 4;
      const im = this.add.image(x, cy, key);
      /* encuadrado en la CARA: la pose es de cuerpo entero y acá se mira a los
         ojos, así que se escala grande y se recorta en redondo por arriba */
      if (key === busto) { im.setScale((R * 2) / im.height); im.y = cy + R * 0.05; }
      else { im.setScale((R * 5.6) / im.height); im.y = cy + im.displayHeight * 0.30; }
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
      /* revisión final del 22/oct: leía solo el look del clásico, y sin ese
         save la entrevista y la semana salían con la pinta original. Es el
         mismo orden que match.armarPlanteles: el del editor (en el save o
         suelto) y si no, el del clásico */
      const A = window.PampaAvatar;
      let sueltos = null;
      try { sueltos = JSON.parse(localStorage.getItem("pampa_star_avatares") || "null"); } catch (e) { }
      const avs = (s && s.avatares) || sueltos || {};
      if (A && (avs.vos || (s && s.look))) return A.validarLook(avs.vos || A.migrarDelClasico(s.look));
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
      /* 23/oct · MEZCLA: cada semana, otro estilo (la misma semana, al volver, no cambia) */
      this.cambiarEstiloDeMezcla("semana:" + (this.save.temporadaN | 0) + ":" + (this.save.temporada.fecha | 0));
      this.pedirMusica("semana", { cierre: this.T.ultimaFecha(this.save && this.save.temporada) });
      this._musicaSemanaPuesta = true;
    }
    if (this.semanaDeCuatro()) { this.vistaSemanaCuatro(rival, alJugar); return; }
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
    this.add.text(W / 2, 16, "LA SEMANA · fecha " + ((this.save.temporada.fecha | 0) + 1), { fontFamily: window.PF.texto, fontSize: window.PampaPiel.nivel(3), color: "#f6efdc", backgroundColor: "#0a1f13cc", padding: { x: 6, y: 2 } }).setOrigin(0.5);
    const tContra = this.add.text(W / 2, 42, "contra " + rival.toUpperCase(), { fontFamily: window.PF.display, fontSize: window.PampaPiel.nivel(1), color: "#f6efdc" }).setOrigin(0.5);
    /* revisión final del 23/oct: en y=136 pisaba el rótulo EL MIÉRCOLES y la
       línea del evento. Va al lado del rival, que es de quien habla, y los
       dos quedan centrados juntos */
    if (sem.espiado) {
      const tVer = this.add.text(0, 42, "fuiste a ver al rival: sabés a qué juega", { fontFamily: window.PF.texto, fontSize: "13px", color: "#ffd84d" }).setOrigin(0, 0.5);
      const x0 = Math.round(W / 2 - (tContra.width + 16 + tVer.width) / 2);
      tContra.setOrigin(0, 0.5).setX(x0);
      tVer.setX(x0 + tContra.width + 16);
    }

    /* --- LOS DOS MEDIDORES: barra Y número, siempre --- */
    const medidor = (x, y, etiqueta, valor, color) => {
      this.add.text(x, y - 16, etiqueta + " " + Math.round(valor) + "/100", { fontFamily: window.PF.texto, fontSize: window.PampaPiel.nivel(3), fontStyle: "bold", color: "#f6efdc" }).setOrigin(0, 0.5);
      const g = this.add.graphics();
      g.fillStyle(0x0a1f13, 0.9); g.fillRect(x, y, 300, 18);
      g.fillStyle(color, 1); g.fillRect(x + 2, y + 2, Math.max(0, Math.min(296, 296 * valor / 100)), 14);
      g.lineStyle(2, 0xf6efdc, 0.8); g.strokeRect(x, y, 300, 18);
    };
    medidor(W / 2 - 320, 80, "ENERGÍA", sem.energia, 0x7ee08a);
    medidor(W / 2 + 20, 80, "ÁNIMO", sem.animo, 0x4fc3f7);
    /* la molestia, el titular del evento y lo que elegiste van entre los
       medidores (terminan en y=98) y la tira de los días (arranca en y=134):
       entran dos renglones de 14. Cada renglón junta lo que entra a lo ancho,
       centrado; el titular y lo elegido van juntos antes que la molestia.
       La flecha separa lo elegido del titular por forma, no solo por color. */
    const sup = [];
    const ev = this._semEvento;
    const md = this.save.modFecha;
    const tm = sem.molestia ? this.add.text(0, 0, "arrastrás una molestia de la fecha pasada", { fontFamily: window.PF.texto, fontSize: "13px", color: "#e3503e" }) : null;
    const te = ev && ev.texto ? this.add.text(0, 0, ev.texto, { fontFamily: window.PF.texto, fontSize: window.PampaPiel.nivel(3), color: "#ffd84d", align: "center", wordWrap: { width: 860 } }) : null;
    /* lo que ELEGISTE queda a la vista mientras armás la semana: es la mitad
       de la decisión que antes no existía */
    const tl = te && md && md.opcion ? this.add.text(0, 0, "↳ " + md.opcion, { fontFamily: window.PF.texto, fontSize: "13px", color: "#7ee08a", align: "center", wordWrap: { width: 860 } }) : null;
    const cabe = (f) => f.every(o => o.height < 24) && f.reduce((a, o) => a + o.width, 0) + 14 * (f.length - 1) <= W - 60;
    if (tm) sup.push([tm]);
    if (te) sup.push(tl && cabe([te, tl]) ? [te, tl] : [te]);
    if (tl && sup[sup.length - 1].indexOf(tl) < 0) sup.push([tl]);
    if (sup.length > 2 && cabe([tm, te])) sup.splice(0, 2, [tm, te]);
    let ySup = sup.length > 1 ? 103 : 108;
    sup.forEach(f => {
      const alto = Math.max(...f.map(o => o.height));
      let x = W / 2 - (f.reduce((a, o) => a + o.width, 0) + 14 * (f.length - 1)) / 2;
      f.forEach(o => { o.setPosition(x, ySup + (alto - o.height) / 2); x += o.width + 14; });
      ySup += alto + 1;
    });

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
      /* D3 · la pose de esa acción, adentro del escenario */
      /* 54 y no 66: con 66 la cabeza se salía por arriba del marco de 84 —
         se ve en la captura de la primera vuelta. Anclada por los pies a
         y+34, la figura entera entra adentro.
         Revisión de OJOS: va ANTES de la etiqueta del día. Una pieza a sangre
         (el caldén de DESCANSAR) llena la ranura entera y tapaba "EL
         MIÉRCOLES"; la figura chica no la toca, así que para ella no cambia
         nada. La ranura, adentro del trazo de 3 px del marco. */
      if (op) this.figuraDeAccion(op, x + anchoR * 0.32, y + 34, 54, { x: x - anchoR / 2 + 2, y: y - 40, w: anchoR - 4, h: 80 });
      this.add.text(x, y - 30, n.toUpperCase(), { fontFamily: window.PF.display, fontSize: "13px",
        color: op ? "#ffd84d" : "#9fb3a5", backgroundColor: "#0a1f13cc", padding: { x: 6, y: 2 } }).setOrigin(0.5);
      if (op) {
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
    /* textos-tactiles: "(teclas 1 a 0)" salía en el teléfono, en la primera
       semana de toda carrera. Revisión del 23/oct: decía "1 a 0" con ocho
       opciones; dice las teclas que hay (la décima es el 0) */
    const nTeclas = Math.min(ops.length, 10);
    const teclas = nTeclas === 1 ? "tecla 1" : "teclas 1 a " + (nTeclas === 10 ? 0 : nTeclas);
    this.add.text(W / 2, 286, hechas >= 3 ? "LA SEMANA ESTÁ ARMADA · a la cancha"
      : "¿QUÉ HACÉS ESTA SEMANA? · elegiste " + hechas + " de 3" + (this.sys.game.device.input.touch ? "" : " (" + teclas + ")"),
      { fontFamily: window.PF.display, fontSize: "13px", color: hechas >= 3 ? "#7ee08a" : "#ffd84d" }).setOrigin(0.5);
    /* O1 · las opciones van en la FRANJA DE DECISIÓN, ubicadas con el helper —
       no clavadas a mano. Tres filas: dos de acciones y la del botón de jugar,
       que es la tercera decisión de esta pantalla. */
    const pielCfgS = (this.game.registry.get("balance") || {}).piel;
    /* 19/oct · a 13 px el nombre y el efecto juntos llegan a cuatro renglones
       (el PICADITO: nombre en uno y efecto en tres) y en 64 de alto no
       entraban. Con 66 las filas quedan a 7 px; el nombre va pegado arriba y
       el efecto pegado abajo. */
    const porFila = 5, anchoO = 178, altoO = 66;
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
      /* 20/oct: con VT323 (más alta que Pixelify) el efecto del picadito
         eran cuatro renglones y se le subía encima al nombre. El nombre va
         3 px más arriba, el efecto 1 px más abajo y con los renglones 4 px
         más juntos, y el riesgo se dice corto (textoEfecto): tres renglones
         que entran */
      const tN = this.add.text(cx, cy - altoO / 2 + 3, o.n, { fontFamily: window.PF.texto, fontSize: "13px", fontStyle: "bold",
        color: "#0a1f13", align: "center", wordWrap: { width: anchoO - 6 } }).setOrigin(0.5, 0);
      /* PASADA DE COHERENCIA · una vez armada la semana, las SIETE tarjetas
         decian "la semana ya esta armada". Siete veces el mismo renglon en
         rojo es ruido, y encima tapa el efecto de cada accion, que es lo unico
         que te sirve mirar mientras decidis si sacar una y poner otra.
         Ahora: el motivo se dice UNA vez, arriba del grupo (ver el titulo de la
         lista), y la tarjeta sigue mostrando SU efecto. */
      const tE = this.add.text(cx, cy + altoO / 2 - 2, sinEnergia ? "sin energía para esto" : this.textoEfecto(o, sem.energia),
        { fontFamily: window.PF.texto, fontSize: "13px", lineSpacing: -4,
          color: sinEnergia ? "#8a3226" : (alcanza ? "#365a41" : "#5a6b60"),
          fontStyle: sinEnergia ? "italic" : "normal", align: "center", wordWrap: { width: anchoO - 10 } }).setOrigin(0.5, 1);
      /* se puede repetir una acción: son tres días distintos. La marca dice
         cuántas veces ya la elegiste, para que no haya que contarlas a ojo. */
      const veces = sem.elegidas.filter(e => e === o.id).length;
      /* adentro tapaba la punta de los nombres de un renglón, y sobre el
         borde de arriba la de la segunda fila caía entre las dos filas (7 px
         de canaleta para 18 de marca). 20/oct: en el borde derecho, a media
         altura. 23/oct, Rodri: ahí iba montada sobre el borde. Va adentro,
         donde no pisa nada (marcarVeces). Encima de las tarjetas: la de al
         lado se dibuja después */
      if (veces) this.marcarVeces(r, tN, tE, veces);
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
    /* textos-tactiles: decía "con 1000 de aguante y 30 de envión", números
       crudos que nada presentó todavía en la primera semana. Revisión del
       23/oct: "las piernas al 86%" al lado de ENERGÍA 75/100 eran dos números
       para lo mismo; va el del medidor, con su palabra */
    this.add.text(W / 2, 264, llega.resumen + " · ENERGÍA " + Math.round(sem.energia) + "/100",
      { fontFamily: window.PF.texto, fontSize: "13px", color: "#7ee08a", align: "center", wordWrap: { width: 880 } }).setOrigin(0.5);

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
  figuraDeAccion(op, x, y, alto, ranura) {
    if (!op || !op.pose) return null;
    const key = this.poseConTuPinta(op.pose);
    if (!key) return null;
    /* revisión de OJOS: una pieza de fondo no se dibuja chica en el medio
       (se le verían los cortes del archivo): llena la ranura, a sangre */
    if (this.poseASangre(op.pose)) return ranura ? this.encuadreASangre(this.add.image(0, 0, key), ranura) : null;
    const im = this.add.image(x, y, key);
    im.setScale(alto / im.height);
    im.setOrigin(0.5, 1);
    return im;
  }

  /* ══════════════════════════════════════════════════════════════════════
     Revisión de OJOS · LA PIEZA A SANGRE.

     DESCANSAR pasó a usar el caldén, y el caldén no es una figura recortada:
     es una pieza de fondo, y la copa toca los bordes del archivo (medido
     con Pillow en calden.webp, 1600x1569: la primera columna tiene 463
     píxeles opacos, filas 711-1173, y la última 559, filas 309-972). Puesto
     como figura, chico y en el medio del cuadro, la copa terminaba en dos
     líneas verticales rectas en el aire: en el momento, en x 490 y 742 de un
     marco que va de 170 a 790 (ojos_22), y lo mismo en la tira. Se lee como
     un error de recorte.

     El manifest lo marca (a_sangre) y acá se encuadra como lo que es, un
     fondo: llena la ventana de lado a lado con 4 px de aire, apoyado en su
     piso, y se recorta con la ventana. Los dos cortes del archivo caen
     afuera, y lo que se ve terminar son bordes que ya están (el de la banda
     del texto, el del marco). El archivo no se toca.
     ══════════════════════════════════════════════════════════════════════ */
  poseASangre(id) {
    const pm = this.game.registry.get("poses");
    return !!(pm && pm.poses && pm.poses[id] && pm.poses[id].a_sangre);
  }
  /* ventana: {x, y, w, h} en coordenadas de pantalla. Devuelve la imagen */
  encuadreASangre(im, ventana) {
    const aire = 4;
    im.setOrigin(0.5, 1);
    im.setScale((ventana.w + 2 * aire) / im.width);
    im.setPosition(ventana.x + ventana.w / 2, ventana.y + ventana.h);
    const mk = this.make.graphics({ x: 0, y: 0, add: false });
    mk.fillStyle(0xffffff); mk.fillRect(ventana.x, ventana.y, ventana.w, ventana.h);
    im.setMask(mk.createGeometryMask());
    return im;
  }

  /* ══════════════════════════════════════════════════════════════════════
     23/oct, PEDIDO DE RODRI · LA SEMANA DE CUATRO COSAS (flags.semana_cuatro).
     "Capaz que tiene MUCHO y eso RESTA." Una sola decisión por semana:
     ENTRENAR (TIRO, PASE o GAMBETA), DESCANSAR, VER AL RIVAL o SALIR CON LA
     BARRA. Cada tarjeta dice con palabras qué te da en la cancha, y arriba
     queda lo que vas a tener esta fecha, que la previa repite. Sin energía,
     sin molestias y sin el evento de dos opciones (la entrevista y la previa
     siguen: son la historia). La cuenta, en logic/semana.js (enLaCancha).
     ══════════════════════════════════════════════════════════════════════ */
  semanaDeCuatro() {
    return ((this.game.registry.get("balance") || {}).flags || {}).semana_cuatro === true;
  }
  vistaSemanaCuatro(rival, alJugar) {
    const S = window.PampaSemana, D = this.game.registry.get("semana");
    const balS = this.game.registry.get("balance"), cfg = balS.semana;
    /* ya cerrada (saliste a la cancha y volviste sin resultado): a la cancha como se llegó */
    if (S.semanaCerrada(this.save)) { alJugar(); return; }
    this._semRival = rival; this._semJugar = alJugar;
    this.vaciarVista();
    this._atrasVista = () => this.scene.restart();
    if (this.fondoDelMaster) this.fondoDelMaster();
    const W = this.scale.width;
    const el = S.eleccionDeLaFecha(this.save), lc = S.enLaCancha(this.save, el, cfg);
    const semL1 = this.add.text(W / 2, 16, "LA SEMANA · fecha " + ((this.save.temporada.fecha | 0) + 1), { fontFamily: window.PF.texto, fontSize: window.PampaPiel.nivel(3), color: "#f6efdc", backgroundColor: "#0a1f13cc", padding: { x: 6, y: 2 } }).setOrigin(0.5);
    const semTit = this.add.text(W / 2, 42, "contra " + rival.toUpperCase(), { fontFamily: window.PF.display, fontSize: window.PampaPiel.nivel(1), color: "#f6efdc" }).setOrigin(0.5);
    /* en el teléfono los medidores bajan lo que crece el título */
    const yMed = Math.max(80, Math.ceil(window.PampaPiel.apilarSiPisa([semL1, semTit], 2) + 30));
    /* los dos medidores, con barra y con número: con lo elegido ya puesto */
    const medidor = (x, y, etiqueta, valor, color) => {
      this.add.text(x, y - 16, etiqueta, { fontFamily: window.PF.texto, fontSize: window.PampaPiel.nivel(3), fontStyle: "bold", color: "#f6efdc" }).setOrigin(0, 0.5);
      const g = this.add.graphics();
      g.fillStyle(0x0a1f13, 0.9); g.fillRect(x, y, 300, 18);
      g.fillStyle(color, 1); g.fillRect(x + 2, y + 2, Math.max(0, Math.min(296, 296 * valor / 100)), 14);
      g.lineStyle(2, 0xf6efdc, 0.8); g.strokeRect(x, y, 300, 18);
    };
    medidor(W / 2 - 320, yMed, "AGUANTE al " + lc.aguantePct + "%", lc.aguantePct, 0x7ee08a);
    medidor(W / 2 + 20, yMed, "ÁNIMO " + lc.animo + "/100", lc.animo, 0x4fc3f7);
    /* LO QUE VAS A TENER EN LA CANCHA, con la pose de lo que elegiste */
    const op = el ? this.opDeLaSemana(D, el) : null;
    const desdePanel = this.children.list.length;
    const PX = W / 2, PY = 176, PW = 720;
    /* revisión final del 23/oct: sin elegir no hay pose, y la franja quedaba
       corrida con la mitad izquierda vacía. Sin pose va al medio y a lo ancho */
    const fx = op ? PX + 72 : PX, fw = op ? PW - 168 : PW - 28;
    const tFranja = this.add.text(fx, PY - 18, op ? "ESTA FECHA, EN LA CANCHA VAS A TENER" : "TODAVÍA NO ELEGISTE · así llegás", { fontFamily: window.PF.display, fontSize: "13px", color: "#ffd84d" }).setOrigin(0.5);
    const rFranja = this.add.text(fx, PY + 10, S.renglonesDeLaCancha(lc).join(" · "), { fontFamily: window.PF.texto, fontSize: "15px", color: "#f6efdc", align: "center", wordWrap: { width: fw - 22 } }).setOrigin(0.5);
    /* en el teléfono lo de la cancha va en dos renglones: la franja crece */
    const PH = Math.max(84, Math.ceil(window.PampaPiel.separarRenglones(tFranja, rFranja, 2) + 24));
    if (PH > 84) { const corre = PY - (tFranja.getBounds().y + rFranja.getBounds().bottom) / 2; tFranja.y += corre; rFranja.y += corre; }
    if (window.PampaSemanaUI) window.PampaSemanaUI.escenario(this, PX, PY, PW, PH, op ? op.lugar : "vacio");
    this.add.rectangle(PX, PY, PW, PH, op ? 0x2e7d32 : 0x0a1f13, op ? 0.24 : 0.44).setStrokeStyle(3, op ? 0x7ee08a : 0x555f57, 0.9);
    if (op) this.figuraDeAccion(op, PX - PW / 2 + 72, PY + 34, 66, { x: PX - PW / 2 + 2, y: PY - 40, w: 140, h: 80 });
    this.add.rectangle(fx, PY, fw, PH - 14, 0x0a1f13, 0.86);
    this.children.bringToTop(tFranja); this.children.bringToTop(rFranja);
    const repaso = !op ? null : this.add.text(W / 2, 246, "Esta semana " + op.repaso + ".", { fontFamily: window.PF.texto, fontSize: "13px", color: "#dcd6c2", align: "center", wordWrap: { width: 880 } }).setOrigin(0.5);
    const touch = this.sys.game.device.input.touch;
    this.add.text(W / 2, 282, el ? "ELEGISTE " + op.n + " · la podés cambiar" : "¿QUÉ HACÉS ESTA SEMANA? · una sola cosa" + (touch ? "" : " (teclas 1 a 6)"),
      { fontFamily: window.PF.display, fontSize: "13px", color: el ? "#7ee08a" : "#ffd84d" }).setOrigin(0.5);
    const hastaPanel = this.children.list.length;
    /* LAS CUATRO, a la vista. ENTRENAR lleva adentro sus tres botones */
    const piel = balS.piel, anchoC = 222, altoC = 140, gap = 8;
    const yC = Math.round(window.PampaPiel.yDeOpcion(0, 2, altoC, piel));
    const TECLAS = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX"];
    const foco = [];
    /* area: la zona táctil, si el dibujo es más chico que el piso de un dedo */
    const tocar = (obj, cb, area) => {
      obj.setInteractive(area ? { hitArea: area, hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true } : { useHandCursor: true })
        .on("pointerdown", (pp, xx, yy, e2) => { e2 && e2.stopPropagation && e2.stopPropagation(); cb(); });
      this.atajo(TECLAS[foco.length], cb);
      foco.push({ obj: obj, cb: cb });
    };
    const tarjetas = D.cuatro.map((c, i) => {
      const cx = W / 2 + (i - 1.5) * (anchoC + gap), top = yC - altoC / 2;
      const elegida = !!el && el.id === c.id;
      const T = { botones: [] };
      /* la elegida se dice con palabra (✓) y con borde grueso, no solo con color */
      T.r = this.add.rectangle(cx, yC, anchoC, altoC, 0xf6efdc, 0.97).setStrokeStyle(elegida ? 6 : 3, 0x0a1f13, 1);
      /* revisión final del 23/oct: en la PC decía "teclas 1 a 6" sin decir cuál
         era cuál. Cada tarjeta lleva su número (ENTRENAR, los de sus botones) */
      if (!touch && c.id !== "entrenar") T.num = this.add.text(cx - anchoC / 2 + 8, top + 6, String(foco.length + 1), { fontFamily: window.PF.display, fontSize: "13px", color: "#0a1f13", backgroundColor: "#ffd84d", padding: { x: 4, y: 2 } });
      T.tit = this.add.text(cx, top + 6, (elegida ? "✓ " : "") + c.n, { fontFamily: window.PF.texto, fontSize: "15px", fontStyle: "bold", color: "#0a1f13", align: "center", wordWrap: { width: anchoC - 10 } }).setOrigin(0.5, 0);
      T.efe = this.add.text(cx, top + 28, c.efecto, { fontFamily: window.PF.texto, fontSize: "13px", color: "#365a41", align: "center", lineSpacing: -2, wordWrap: { width: anchoC - 14 } }).setOrigin(0.5, 0);
      T.fec = this.add.text(cx, top + altoC - 6, this.textoDeLaFecha(c.id, elegida ? el.que : null), { fontFamily: window.PF.texto, fontSize: "13px", fontStyle: "bold", color: "#0a1f13", align: "center", wordWrap: { width: anchoC - 12 } }).setOrigin(0.5, 1);
      if (c.id !== "entrenar") { tocar(T.r, () => this.ponerCuatro(c.id, null)); return T; }
      S.ENTRENABLES.forEach((k, q) => {
        /* revisión final del 23/oct: medían 46x23 px reales en el teléfono. El
           dibujo crece y la zona táctil llega al piso de un dedo (piel.tap_min
           de alto, a 740x360 son 44 px reales) */
        const sel = elegida && el.que === k, bx = cx + (q - 1) * 72, by = top + 90, bw = 70, bh = 46;
        const b = this.add.rectangle(bx, by, bw, bh, sel ? 0x0a1f13 : 0xffffff, 1).setStrokeStyle(sel ? 4 : 2, 0x0a1f13, 1);
        const n = !touch ? this.add.text(bx, by - 11, String(foco.length + 1), { fontFamily: window.PF.display, fontSize: "13px", color: sel ? "#ffd84d" : "#365a41" }).setOrigin(0.5) : null;
        const t = this.add.text(bx, touch ? by : by + 9, k.toUpperCase(), { fontFamily: window.PF.texto, fontSize: "13px", fontStyle: "bold", color: sel ? "#f6efdc" : "#0a1f13" }).setOrigin(0.5);
        if (n) window.PampaPiel.separarRenglones(n, t, 0);
        const zt = Math.max(bh, (piel.tap_min || 61) + 6);
        tocar(b, () => this.ponerCuatro("entrenar", k), new Phaser.Geom.Rectangle(-1, (bh - zt) / 2, bw + 2, zt));
        T.botones.push([b, n, t]);
      });
      return T;
    });
    let yJugar = Math.round(window.PampaPiel.yDeOpcion(2, 3, 64, piel));
    /* EL TELÉFONO LEGIBLE (25/oct). Con la letra grande el efecto y lo de la
       fecha van en tres renglones y no entran en 140: la tarjeta crece a lo
       que pide la más llena, lo de arriba (la franja, el repaso y la pregunta)
       sube hasta 8 debajo de los medidores y JUGAR baja lo que haga falta. En
       la PC entran y nada se mueve. */
    const pideC = Math.max(...tarjetas.map(T => {
      const medio = T.botones.length ? 46 + 12 : 8;
      return Math.ceil(6 + T.tit.height + 2 + T.efe.height + medio + T.fec.height + 6);
    }));
    if (pideC > altoC) {
      const arriba = this.children.list.slice(desdePanel, hastaPanel);
      const sube = Math.max(0, PY - PH / 2 - (yMed + 18 + 8));
      arriba.forEach(o => { o.y -= sube; });
      const pregunta = this.children.list[hastaPanel - 1];
      /* [DECISIÓN MÍA] con algo elegido, el repaso ("Esta semana te quedaste
         pateando...") ya se vio en la escena de lo que elegiste: en el
         teléfono, si las tarjetas no entran, se deja para la PC */
      if (repaso) repaso.setVisible(false);
      pregunta.setY(Math.ceil(PY + PH / 2 - sube + 6 + pregunta.height / 2));
      const topC = Math.ceil(pregunta.getBounds().bottom + 6);
      yJugar = Math.max(yJugar, topC + pideC + 8 + 26);
      tarjetas.forEach(T => {
        window.PampaPiel.estirar(T.r, anchoC, pideC).setY(topC + pideC / 2);
        if (T.num) T.num.setY(topC + 6);
        T.tit.setY(topC + 6);
        T.efe.setY(T.tit.getBounds().bottom + 2);
        const by = T.efe.getBounds().bottom + 6 + 23;
        T.botones.forEach(([b, n, t]) => { const dy = by - b.y; b.y += dy; t.y += dy; if (n) n.y += dy; });
        T.fec.setY(topC + pideC - 6);
      });
    }
    const jugar = () => this.cerrarSemana(alJugar);
    const btn = this.boton(W / 2, yJugar, 340, el ? "▶ JUGAR LA FECHA" : "▶ JUGAR SIN ELEGIR NADA", el ? 0x7ee08a : 0xdcd6c2, jugar);
    foco.push({ obj: btn, cb: jugar });
    if (this.grupoFoco) this.grupoFoco(foco, { inicial: el ? foco.length - 1 : 0 });
  }
  /* lo de cada tarjeta, con las cinco palabras (y lo que dice el momento) */
  textoDeLaFecha(id, que) {
    const S = window.PampaSemana, cfg = this.game.registry.get("balance").semana;
    /* decisión que Rodri delegó (23/oct): entrenar dice las dos cosas */
    if (id === "entrenar") return que ? S.textoEntrena(S.enLaCancha(this.save, { id: id, que: que }, cfg).entrena)
      : "+" + cfg.cuatro.entrenar_mas + " esta fecha, +" + cfg.cuatro.entrenar_siempre + " para siempre";
    const lc = S.enLaCancha(this.save, { id: id }, cfg);
    if (id === "descansar") return "esta fecha: AGUANTE al " + lc.aguantePct + "% (sin descansar, " + lc.aguanteSinDescanso + "%)";
    if (id === "ver_rival") return "esta fecha: su defensa y su estrella, en el mapa";
    return "esta fecha: ÁNIMO " + lc.animo + ", +" + lc.grande + " en las jugadas grandes";
  }
  opDeLaSemana(D, el) {
    const c = D.cuatro.find(o => o.id === el.id), q = c.que ? c.que[el.que] : null;
    return { id: c.id, n: q ? c.n + " " + el.que.toUpperCase() : c.n, sub: q ? q.sub : c.sub, lugar: c.lugar, pose: q ? q.pose : c.pose, repaso: q ? q.repaso : c.repaso };
  }
  ponerCuatro(id, que) {
    const S = window.PampaSemana;
    if (!S.elegirCuatro(this.save, id, que)) return false;
    this.guardar();
    const op = this.opDeLaSemana(this.game.registry.get("semana"), this.save.eleccion);
    op.efectoCancha = this.textoDeLaFecha(id, que);
    this.momentoDeAccion(op, "ESTA SEMANA");
    return true;
  }
  relojDeLaSemana(listo, alJugar) {
    const cfg = (this.game.registry.get("balance") || {}).semana || {};
    const seg = cfg.reloj_seg | 0;
    if (seg <= 0) return false;                  // el default: no existe
    const W = this.scale.width;
    let quedan = seg;
    const t = this.add.text(W - 20, 20, quedan + "s", { fontFamily: window.PF.display,
      fontSize: "14px", color: "#ffd84d", backgroundColor: "#0a1f13cc", padding: { x: 8, y: 4 } }).setOrigin(1, 0);
    this._relojSem = this.time.addEvent({
      delay: 1000, repeat: seg - 1,
      callback: () => {
        quedan--;
        t.setText(quedan + "s").setColor(quedan <= 5 ? "#e3503e" : "#ffd84d");
        if (quedan <= 0) { this._relojSem = null; this.cerrarSemana(alJugar); }
      }
    });
    return true;
  }

  /* 23/oct · los renglones de un texto centrado como rectángulos de lo que
     se ve (la letra, no la caja del texto: con lineSpacing -4 las cajas de
     los renglones de la tarjeta se pisan entre sí) */
  renglonesDe(t) {
    const b = t.getBounds(), st = t.style, m = st.metrics, ctx = t.context;
    st.syncFont(t.canvas, ctx);
    const paso = m.fontSize + st.strokeThickness + t.lineSpacing;
    return t.getWrappedText(t.text).map((l, i) => {
      const me = ctx.measureText(l), base = b.top + t.padding.top + st.strokeThickness / 2 + i * paso + m.ascent;
      return { x: b.centerX - me.width / 2, y: base - me.actualBoundingBoxAscent, w: me.width, h: me.actualBoundingBoxAscent + me.actualBoundingBoxDescent };
    });
  }
  /* LA MARCA ×N DE LA SEMANA, ADENTRO DE SU TARJETA. Iba montada sobre el
     borde derecho (23/oct, Rodri: que respire). Es la etiqueta verde de
     siempre, del alto de la letra más 1 px por lado, en el lugar de la
     tarjeta con 4 px de aire del borde (del lado de adentro de la línea) y
     de lo escrito: a media altura entre el nombre y el efecto, arriba del
     efecto o al lado de un renglón suyo, primero a la derecha
     (logic/piel.js, lugarLibre). En la tarjeta llena (PICADITO) el nombre
     se corre a la izquierda lo que haga falta para que entre a su lado; si
     ni así llega a 4 px, va donde más aire tenga, sin pisar el borde */
  marcarVeces(r, tN, tE, veces) {
    const t = this.add.text(0, 0, "×" + veces, { fontFamily: window.PF.texto, fontSize: "13px", color: "#0a1f13" }).setOrigin(0.5).setDepth(2);
    const gl = this.renglonesDe(t)[0], tam = { w: Math.ceil(gl.w) + 4, h: Math.ceil(gl.h) + 2 };
    const rb = r.getBounds(), borde = r.lineWidth / 2, AIRE = 4;
    const caja = { x: rb.left + borde, y: rb.top + borde, w: rb.width - 2 * borde, h: rb.height - 2 * borde };
    const nom = this.renglonesDe(tN), efe = this.renglonesDe(tE);
    const finNombre = Math.max(...nom.map(q => q.y + q.h)), tope = Math.min(...efe.map(q => q.y));
    const adentro = y => Math.min(Math.max(y, caja.y + AIRE + tam.h / 2), caja.y + caja.h - AIRE - tam.h / 2);
    const ys = [(finNombre + tope) / 2, (caja.y + tope) / 2].concat(efe.map(q => q.y + q.h / 2)).map(adentro);
    const der = caja.x + caja.w - AIRE - tam.w / 2, izq = caja.x + AIRE + tam.w / 2;
    const lugares = ys.map(y => ({ x: der, y: y })).concat(ys.map(y => ({ x: izq, y: y })));
    const probar = (renglones) => window.PampaPiel.lugarLibre(caja, tam, renglones.concat(efe), lugares, AIRE);
    let L = probar(nom), dx = 0;
    const corrida = -(nom[0].x + nom[0].w + AIRE + tam.w + AIRE - (caja.x + caja.w));
    if (L.aire < AIRE && nom.length === 1 && corrida < 0 && nom[0].x + corrida - caja.x >= AIRE) {
      const L2 = probar([Object.assign({}, nom[0], { x: nom[0].x + corrida })]);
      if (L2.aire > L.aire) { L = L2; dx = corrida; }
    }
    if (dx) tN.setX(tN.x + dx);
    const fondo = this.add.rectangle(L.x, L.y, tam.w, tam.h, 0x7ee08a).setDepth(1);
    t.setPosition(L.x - (gl.x + gl.w / 2), L.y - (gl.y + gl.h / 2));
    return { marca: t, fondo: fondo, aire: L.aire, corrida: dx };
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
    const bw = Math.round(MW * 0.46);
    const key = op.pose ? this.poseConTuPinta(op.pose) : null;
    if (key && this.poseASangre(op.pose)) {
      /* revisión de OJOS: la pieza de fondo (el caldén) llena la parte del
         dibujo, de la banda del texto al borde del marco, sin entrada con
         rebote: es el lugar, no alguien que entra (y con el rebote y la
         escala de 0,86 se le verían los cortes mientras entra) */
      capa.add(this.encuadreASangre(this.add.image(0, 0, key), { x: x0 + bw, y: y0, w: MW - bw, h: MH }));
    } else if (key) {
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
       tachado — se ve en la captura de la primera version. (bw, el ancho
       de la banda, se calcula arriba: la pieza a sangre termina ahí) */
    const banda = this.add.rectangle(x0, y0, bw, MH, 0x0a1f13, 0.88).setOrigin(0, 0);
    capa.add(banda);

    const dias = ["EL LUNES", "EL MIÉRCOLES", "EL VIERNES"];
    const cx = x0 + bw / 2;
    const tD = this.add.text(cx, y0 + 28, typeof ranura === "string" ? ranura : (dias[ranura] || ""), { fontFamily: window.PF.display,
      fontSize: "13px", color: "#ffd84d" }).setOrigin(0.5);
    const tN = this.add.text(cx, y0 + 96, op.n, { fontFamily: window.PF.texto, fontSize: "20px",
      fontStyle: "bold", color: "#f6efdc", align: "center", wordWrap: { width: bw - 28 } }).setOrigin(0.5);
    const tS = this.add.text(cx, y0 + 176, op.sub || "", { fontFamily: window.PF.texto,
      fontSize: "14px", color: "#dcd6c2", align: "center", wordWrap: { width: bw - 28 } }).setOrigin(0.5);
    /* lo que te deja, con numeros: la misma linea que muestra la tarjeta */
    const tE = this.add.text(cx, y0 + MH - 30, op.efectoCancha || this.textoEfecto(op), { fontFamily: window.PF.texto,
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
  /* el texto del efecto, en números claros (nunca solo color). Con la
     energía de ahora, lo que se recupera se dice como queda: DESCANSAR con
     75 sube 25, no 30, porque el medidor no pasa del tope */
  textoEfecto(o, energia) {
    const t = [];
    if (o.energia_costo) t.push("−" + o.energia_costo + " energía");
    if (o.energia_recupera) {
      const tope = this.game.registry.get("balance").semana.energia_max;
      const sube = energia == null ? o.energia_recupera
        : Math.min(o.energia_recupera, Math.max(0, tope - energia + (o.energia_costo || 0)));
      t.push("+" + sube + " energía" + (sube < o.energia_recupera ? " (tope " + tope + ")" : ""));
    }
    if (o.animo) t.push((o.animo > 0 ? "+" : "") + o.animo + " ánimo");
    /* revisión final del 23/oct: ENTRENAR AGUANTE decía "+2 resistencia"; es
       la misma cualidad (logic/semana.js techoDeAguante) y se dice como en la tarjeta */
    if (o.stat) t.push("+" + (o.stat_mas || 1) + " " + (o.stat === "azar" ? "a una cualidad al azar" : o.stat === "resistencia" ? "aguante" : o.stat));
    if (o.cura_molestia) t.push("cura la molestia");
    if (o.espia_rival) t.push("ves cómo juega el rival");
    if (o.evita) t.push("te sacás el problema");
    if (o.riesgo_golpe) t.push("riesgo de golpe");
    return t.join(" · ");
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
    if (this.semanaDeCuatro()) S.cerrarSemanaCuatro(this.save, cfg);
    else S.cerrarSemana(this.save, cfg);
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
    this.add.text(W / 2, 44, "LA SEMANA", { fontFamily: window.PF.texto, fontSize: window.PampaPiel.nivel(3), color: "#f6efdc", backgroundColor: "#0a1f13cc", padding: { x: 6, y: 2 } }).setOrigin(0.5);
    const tEv = this.add.text(W / 2, 140, ev.texto, { fontFamily: window.PF.display, fontSize: window.PampaPiel.nivel(1), color: "#f6efdc", align: "center", wordWrap: { width: 800 }, lineSpacing: 10 }).setOrigin(0.5);
    /* 20/oct · el texto sale letra por letra: con el tamaño ya medido sobre
       el texto entero, así el centro no baila mientras se escribe */
    tEv.setFixedSize(tEv.width, tEv.height);
    /* 20/oct, Rodri: las opciones se podían tocar antes de que el evento
       terminara de escribirse; aparecen cuando terminó o lo completa un toque */
    const ponerOpciones = () => {
      const D = window.PampaDialogo;
      /* D1 · las dos opciones del evento arrancaban en y=280, apenas fuera de la
         franja. Lo cazó el guardián ampliado, no el ojo. */
      const pielEv = (this.game.registry.get("balance") || {}).piel;
      const flagsEv = (this.game.registry.get("balance") || {}).flags || {};
      const items = ev.opciones.map((o, i) => {
        /* la poda del 22/oct: con el envión apagado la bajada no lo nombra */
        const efecto = Object.assign({}, o.efecto);
        if (flagsEv.envion === false) delete efecto.envion;
        const y = Math.round(window.PampaPiel.yDeOpcion(i, ev.opciones.length, 72, pielEv));
        const r = this.add.rectangle(W / 2, y, 700, 72, 0xf6efdc, 0.97).setStrokeStyle(3, 0x0a1f13).setInteractive({ useHandCursor: true });
        /* 20/oct · el dibujito y la bajada salen de lo que la opción cambia,
           dicho con palabras y sin números */
        this.dibujarIcono(W / 2 - 350 + 32, y, D.iconoDeEfecto(efecto));
        this.add.text(W / 2, y - 10, (this.sys.game.device.input.touch ? "" : (i + 1) + " · ") + o.texto, { fontFamily: window.PF.display, fontSize: "13px", color: "#0a1f13", align: "center", wordWrap: { width: 600 } }).setOrigin(0.5);
        this.add.text(W / 2, y + 14, D.bajadaDeEfecto(efecto), { fontFamily: window.PF.texto, fontSize: "15px", color: "#365a41" }).setOrigin(0.5);
        const elegir = () => {
          this.save.modFecha = V.aplicarEleccion(ev, i);
          this._semEventoResuelto = true;
          /* decidido queda decidido: recargar no lo vuelve a preguntar */
          if (this.save.eventoFecha) this.save.eventoFecha.resuelto = true;
          this.guardar();
          alSeguir();
        };
        r.on("pointerdown", (pp, xx, yy, e2) => { e2 && e2.stopPropagation && e2.stopPropagation(); elegir(); });
        /* revisión final del 23/oct: el rótulo decía "1 · " y la tecla no hacía nada */
        if (i < 4) this.atajo(["ONE", "TWO", "THREE", "FOUR"][i], elegir);
        return { obj: r, cb: elegir };
      });
      /* el cursor, como en los demás grupos: no hay salida (el evento SE DECIDE,
         no se saltea), así que no lleva `volver` */
      if (this.grupoFoco) this.grupoFoco(items, { inicial: 0 });
    };
    this.escribir(tEv, ev.texto, "semana", ponerOpciones);
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
      mod: this.semanaDeCuatro() ? null : (this.save.modFecha || null),
      origen: this.save.origen || null,
      pueblo: this.save.pueblo || null,
      semana: this.save.semanaResumen || null,
      mejoras: this.save.mejoras || null,
      tempo: window.PampaSaveMaster.tempoDe(this.save, this.game.registry.get("balance")),
      /* 20/oct · la estrella que nombró la previa juega de verdad (match.js armarPlanteles) */
      estrella: this.estrellaDeLaFecha(rival)
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

  estrellaDeLaFecha(rival) {
    const D = window.PampaDialogo;
    const e = D.estrellaDe(rival, this.save.division, this.game.registry.get("roster"), D.hash);
    return e ? e.id : null;
  }

  /* ============ VISTA 2: LA TEMPORADA ============ */
  vistaTemporada() {
    const W = this.scale.width, H = this.scale.height;
    const t = this.save.temporada, T = this.T, Ma = this.Ma;
    /* 25/oct · EL FINAL DE LA CARRERA (flags.carrera_final): la temporada
       terminada con título, ascenso, descenso o gloria pasa primero por su
       ceremonia (scenes/ceremonia_ui.js), una vez por temporada */
    const FIN = this.finalDeCarrera();
    const cfgP = FIN ? FIN.cfgDeLaTemporada(this.save, (this.game.registry.get("balance") || {}).partido || {})
      : (this.game.registry.get("balance") || {}).partido || {};
    const vFin = FIN && T.terminada(t) ? FIN.veredicto(T, this.save, Ma.DIVISIONES.map(d => d.id), cfgP) : null;
    if (vFin && FIN.ceremoniaDe(vFin) && this.save.ceremoniaVista !== this.save.temporadaN) {
      this.vistaCeremonia(vFin);
      return;
    }
    /* revisión L06: en la última fecha, la tabla ya baja el tema del título
       ("hype"), que antes nadie precargaba: sonaba recién cuando bajaba */
    this.pedirMusica("espera", { cierre: this.T.ultimaFecha(this.save && this.save.temporada) });
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
    /* 20/oct: la salida a la pantalla de título, arriba a la derecha (arriba
       a la izquierda va la marca de "este navegador no guarda") */
    const menu = this.add.text(W - 14, 12, "◀ MENÚ", {
      fontFamily: window.PF.texto, fontSize: "13px", color: "#f6efdc",
      backgroundColor: "#0a1f13aa", padding: { x: 8, y: 4 }
    }).setOrigin(1, 0);
    if (this.pisoTactil) this.pisoTactil(menu);
    if (!menu.input) menu.setInteractive({ useHandCursor: true });
    menu.on("pointerdown", (p, xx, yy, ev) => {
      ev && ev.stopPropagation && ev.stopPropagation();
      const S = window.PampaSFX; if (S && S.ui) S.ui("volver");
      this.irA("titulo");
    });
    const titTabla = this.add.text(W / 2, 56, div.n + (FIN && this.save.leyenda ? " · LEYENDA" : "") + " · TEMPORADA " + this.save.temporadaN, { fontFamily: window.PF.display, fontSize: window.PampaPiel.nivel(1), color: "#ffd84d" }).setOrigin(0.5);
    /* revisión L04b: con un título decía "★ 1 títulos"; el singular como en
       el código de la carrera (vistaCodigo) */
    const nTitClub = this.save.titulos.length;
    const clubTxt = this.add.text(W / 2, 78, this.save.club + (nTitClub ? " · ★".repeat(Math.min(5, nTitClub)) + " " + (nTitClub === 1 ? "1 título" : nTitClub + " títulos") : ""), { fontFamily: window.PF.texto, fontSize: "13px", color: "#f6efdc" }).setOrigin(0.5);

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
      const resTxt = this.add.text(W / 2, 78, (gano ? "GANASTE " : empate ? "EMPATASTE " : "PERDISTE ") + this._ultimo.golesMio + "-" + this._ultimo.golesRival, { fontFamily: window.PF.texto, fontSize: "13px", fontStyle: "bold", color: gano ? "#7ee08a" : empate ? "#f6c11d" : "#e3503e" }).setOrigin(0, 0.5);
      const aire = 22, total = clubTxt.width + aire + resTxt.width;
      const x0 = Math.round(W / 2 - total / 2);
      clubTxt.setOrigin(0, 0.5).setX(x0);
      resTxt.setX(Math.round(x0 + clubTxt.width + aire));
      window.PampaPiel.separarRenglones(titTabla, clubTxt, 0);
      resTxt.setY(clubTxt.y);
    } else window.PampaPiel.separarRenglones(titTabla, clubTxt, 0);

    /* LA TABLA (monospace, forma antes que color: ► marca mi fila) */
    const pos = T.posiciones(t);
    const x0 = 70, y0 = 116;
    /* A4 · la zona de descenso se marca con FORMA (▼ + línea de corte), no con
       color: el color solo no sirve. La zona no existe en la división más baja
       ni para la leyenda (cfgP, arriba). */
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
    var estiloCab = { fontFamily: window.PF.texto, fontSize: "13px", color: "#f6c11d" };
    const cab = this.add.text(x0, y0 - 2, "#", estiloCab);
    /* en el teléfono la letra crece: las filas se abren a su alto medido */
    const paso = Math.max(19, Math.ceil(cab.height) - 1);
    this.add.text(x0 + 34, y0 - 2, "EQUIPO", estiloCab);
    COLS.forEach(function (c) {
      this.add.text(x0 + c.x, y0 - 2, c.n, estiloCab).setOrigin(1, 0);
    }, this);
    pos.forEach((f, i) => {
      const mio = f.equipo === t.miClub;
      const enZona = zona.indexOf(i + 1) >= 0;
      const dg = f.gf - f.gc;
      const y = y0 - 2 + Math.max(20, paso) + i * paso;
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
      const est = { fontFamily: window.PF.texto, fontSize: "13px", fontStyle: negrita, color: tinta };
      /* el puesto, alineado a la derecha: 1 y 10 caen en la misma raya */
      this.add.text(x0 + 16, y, String(i + 1), est).setOrigin(1, 0);
      /* las marcas por FORMA, no por color: ► sos vos, ▼ zona de descenso */
      this.add.text(x0 + 20, y, (enZona ? "▼" : "") + (mio ? "►" : ""),
        { fontFamily: window.PF.texto, fontSize: "13px", color: mio ? "#ffd84d" : "#e3503e" });
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

    let principal = null, editor = null;
    const accesos = [];
    if (!T.terminada(t)) {
      /* los dos accesos de abajo se crean ANTES que los botones (revisión
         L03): con el piso táctil su área sube unos píxeles sobre el borde de
         abajo de JUGAR / NUEVA TEMPORADA, y Phaser le da el toque al objeto
         dibujado más arriba. Creados antes, en ese borde gana el botón. */
      const salida = this.salidaDeLaCarrera(W, H);
      const codigo = this.accesoAlCodigo(W, H);
      const instalar = this.accesoAInstalar(W, H);   // L08c: solo si el navegador lo ofrece
      accesos.push(salida, codigo, instalar);
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
        this.add.text(W / 2, H - 128, "un equipo " + perfil.n, { fontFamily: window.PF.texto, fontSize: "13px", color: "#7ee08a" }).setOrigin(0.5);
        /* TANDA 1.0 · SALISTE A LA CANCHA Y VOLVISTE SIN RESULTADO (recargaste,
           se cerró la pestaña en medio del partido): la semana ya está jugada
           y no se rehace —ni se vuelven a sumar sus mejoras—. Se repite el
           partido, entrando como habías llegado. Es la regla de Rodri para
           abandonar una fecha. */
        const SemT = window.PampaSemana;
        const repetir = !!(SemT && SemT.semanaCerrada && SemT.semanaCerrada(this.save));
        if (repetir) {
          this.add.text(W / 2, H - 172, "↺ volviste sin terminar el partido: la semana ya está jugada y entrás como llegaste",
            { fontFamily: window.PF.texto, fontSize: "13px", color: "#ffd84d" }).setOrigin(0.5);
        }
        principal = this.boton(W / 2 - 170, H - 80, 300, repetir ? "↺ REPETIR EL PARTIDO" : "▶ JUGAR LA FECHA", 0x7ee08a, () => {
          if (repetir) { this.irALaCancha(rival); return; }
          /* V8 A1: primero LA SEMANA (dos toques), después la cancha */
          this.vistaSemana(rival, () => this.vistaPrevia(rival, () => this.irALaCancha(rival)));
        });
      } else {
        this.add.text(W / 2, H - 140, fechaTxt + " · FECHA LIBRE (descansás)", { fontFamily: window.PF.texto, fontSize: "13px", color: "#f6efdc" }).setOrigin(0.5);
        principal = this.boton(W / 2 - 170, H - 80, 300, "▶ PASAR LA FECHA", 0x7ee08a, () => {
          this.T.jugarFecha(t, null, null);
          this.guardar();
          this.scene.restart();
        });
      }
      editor = this.boton(W / 2 + 170, H - 80, 280, "EDITOR / PINTA", 0xf6efdc, () => this.irA("editor"));
    } else {
      /* FIN DE TEMPORADA: el veredicto de la escalera */
      /* (los accesos antes que los botones: ver la otra rama) */
      const salida = this.salidaDeLaCarrera(W, H);
      const codigo = this.accesoAlCodigo(W, H);
      const instalar = this.accesoAInstalar(W, H);
      accesos.push(salida, codigo, instalar);
      const v = vFin || T.veredicto(t, Ma.DIVISIONES.map(d => d.id), cfgP);
      let msj, color;
      /* M4 · idem "hype" (Ascenso, título, gloria): declarado, con archivo y sin
         nadie que lo pida. Este es el momento para el que fue escrito. */
      if (v.gloria || v.asciende || v.campeon) this.pedirMusica("hype");
      if (v.gloria) { msj = FIN ? "★ CAMPEÓN DEL MUNDO · falta el cierre de tu carrera" : "¡CAMPEÓN DEL MUNDO! LA GLORIA ETERNA"; color = "#ffd84d"; }
      else if (v.defendido) { msj = "★ TÍTULO DEFENDIDO · el " + (((this.save.leyenda || {}).defendidos | 0) + 1) + "º como leyenda"; color = "#ffd84d"; }
      else if (v.asciende) { msj = "¡CAMPEÓN! SUBÍS A " + (Ma.DIVISIONES.find(d => d.id === v.proximaDivision) || {}).n; color = "#ffd84d"; }
      /* A4 · con todas las letras: se dice que se descendió y a dónde */
      else if (v.desciende) { msj = "▼ DESCENSO · terminaste " + v.posicion + "º y bajás a " + (Ma.DIVISIONES.find(d => d.id === v.proximaDivision) || {}).n; color = "#e3503e"; }
      else if (v.leyenda) { msj = "Terminaste " + v.posicion + "º · la leyenda sigue en " + div.n; color = "#f6efdc"; }
      else { msj = "Terminaste " + v.posicion + "º y seguís en " + div.n; color = "#f6efdc"; }
      this.add.text(W / 2, H - 140, msj, { fontFamily: window.PF.display, fontSize: "13px", color }).setOrigin(0.5);
      /* 25/oct · el Mundial ganado ya no se vuelve a jugar con un botón: la
         salida es el cierre (Nito, TU CARRERA, créditos y la elección) */
      if (FIN && v.gloria) {
        principal = this.boton(W / 2 - 170, H - 80, 320, "▶ EL CIERRE DE TU CARRERA", 0xffd84d, () => (this.save.final_visto ? this.vistaCreditos(v) : this.vistaCierre(v)));
      } else {
        principal = this.boton(W / 2 - 170, H - 80, 320, "▶ NUEVA TEMPORADA", 0x7ee08a, () => {
          window.PampaFinal.cerrarTemporada(T, this.save, v, Ma.DIVISIONES, { crear: (d, n) => this.temporadaNueva(d, n) });
          this.guardar();
          this.scene.restart();
        });
      }
      editor = this.boton(W / 2 + 170, H - 80, 280, "EDITOR / PINTA", 0xf6efdc, () => this.irA("editor"));
    }
    /* ola 3 · TECLADO: la tabla es el paso entre fecha y fecha y solo andaba
       con el puntero. Flechas y ENTER, empezando por jugar */
    if (this.grupoFoco) {
      const items = [principal, editor, menu].concat(accesos).filter(Boolean)
        .map(o => ({ obj: o, cb: () => o.emit("pointerdown", null, 0, 0, null) }));
      this.grupoFoco(items, { inicial: 0 });
    }
    /* L07: fijo en la tabla mientras este navegador no guarde */
    this.marcaSinGuardar();
    /* L08c: con la tabla dibujada y quieta, las poses vestidas del partido */
    const VS = (this.game.registry.get("balance") || {}).vestidas || {};
    this.time.delayedCall(VS.espera_tabla_ms != null ? VS.espera_tabla_ms : 700, () => this.prepararVestidas());
  }

  /* ══════════════════════════════════════════════════════════════════════
     L08c · LAS POSES VESTIDAS DEL PARTIDO, PREPARADAS EN LA TABLA.
     Vestir pose_bloqueo y pose_barrida con tu camiseta (logic/vestir.js) es
     de una sola pieza; en el create del partido eran los dos cuadros más
     largos de sus primeros 3 s (382 y 313 ms, en la compu). La tabla está
     quieta y se pasa por ella antes de cada fecha: acá se bajan esas dos
     poses (si todavía no están; el partido las iba a bajar igual) y se
     piden a la cola de scenes/vestidas_ui.js, que las viste en un hilo
     aparte. Las texturas quedan en el juego y el partido las usa al entrar.
     Los colores son los que va a usar el partido: el celeste del equipo y,
     si elegiste otra camiseta en el editor, la tuya. */
  prepararVestidas() {
    if (this._vestidasPedidas) return 0;
    const V = window.PampaVestir, PV = window.PampaVestidas;
    if (!V || !V.paresAVestir || !PV) return 0;
    this._vestidasPedidas = true;
    const man = this.game.registry.get("poses");
    const pares = V.paresAVestir(man, [V.DEF.destino, this.colorDeTuCamiseta()])
      .filter((p) => !this.textures.exists(p.clave));
    if (!pares.length) return 0;
    const faltan = [];
    pares.forEach((p) => { if (!this.textures.exists("pose_" + p.id) && faltan.indexOf(p.id) < 0) faltan.push(p.id); });
    /* escena: el permiso para vestir en el hilo del juego (sin Worker) vale
       mientras la tabla siga a la vista; si arranca el partido, lo que
       falte se viste al usarlo (revisión L08c, vestidas_ui.js puedeAca) */
    const pedir = () => PV.preparar(this.game, pares, { hilo: true, escena: this });
    if (!faltan.length) return pedir();
    const base = (man && man.base) || "assets/poses/";
    faltan.forEach((id) => this.load.image("pose_" + id, "../" + base + man.poses[id].archivo));
    this.load.once("complete", pedir);
    this.load.start();
    return 0;
  }
  /* el color de tu camiseta en el partido: el mismo look que arma
     match.armarPlanteles para VOS (el del editor). Sin uno elegido, el
     partido usa uno armado por nombre, que no trae camiseta propia: celeste */
  colorDeTuCamiseta() {
    const V = window.PampaVestir, A = window.PampaAvatar;
    let career = null, sueltos = null;
    try { career = JSON.parse(localStorage.getItem("pampa_star_v1") || "null"); } catch (e) { }
    try { sueltos = JSON.parse(localStorage.getItem("pampa_star_avatares") || "null"); } catch (e) { }
    const avs = (career && career.avatares) || sueltos || {};
    const look = avs.vos && A ? A.validarLook(avs.vos) : null;
    const CM = this.game.registry.get("caras");
    return V.destinoDelLook(look, CM && CM.camisetas);
  }
};

/* PIEL P2: las pantallas de esta escena se arman de una sola vez (no hay
   update que barra), así que se visten los botones al terminar de construir
   cada vista. Se envuelven los métodos en vez de tocar su cuerpo.
   L10: la lista era a mano y nombraba cuatro vistas que ya no existen
   mientras dejaba afuera vistaOrigen,
   vistaBorrarCarrera y las demás. Ahora sale de la clase: create y toda
   vista* que tenga, así una vista nueva entra sola. Las vistas que llegan
   después en otro archivo (scenes/ceremonia_ui.js) se envuelven al
   sumarse, con envolverVistas. */
window.PampaMasterScene.envolverVistas = function (nombres) {
  nombres.forEach(function (n) {
    var orig = window.PampaMasterScene.prototype[n];
    if (typeof orig !== "function") return;
    window.PampaMasterScene.prototype[n] = function () {
      var r = orig.apply(this, arguments);
      if (this.vestirPendientes) this.vestirPendientes();
      /* L10: SONIDO en todas las vistas (la tabla, la semana, el mapa, la
         entrevista), arriba a la izquierda: arriba a la derecha está el
         ◀ MENÚ de la tabla. Si está la marca de "este navegador no guarda",
         va a su lado. */
      if (this.botonSonido) {
        var m = this._marcaSG && this._marcaSG.scene ? this._marcaSG : null;
        this.botonSonido(m ? m.x + m.width + 8 : 12, 8, 0);
      }
      return r;
    };
  });
};
window.PampaMasterScene.envolverVistas(Object.getOwnPropertyNames(window.PampaMasterScene.prototype)
  .filter(function (n) { return n === "create" || /^vista[A-Z]/.test(n); }));

