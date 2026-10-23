/* ============================================================================
   PAMPA STAR · phaser/logic/semana.js — LA SEMANA CON ENERGÍA (V10, LA VIDA v2)
   Reemplaza al §2.4 del V7: el evento de texto suelto queda como sabor, pero la
   vida de verdad es ésta.

   Entre fecha y fecha hay UNA SEMANA con TRES ranuras (lunes, miércoles,
   viernes) y dos medidores. Lo que hacés define cómo llegás al domingo:

     ENERGÍA (0-100) · es lo que GASTÁS. Con la que terminás la semana se
       calcula tu AGUANTE INICIAL del partido: 100 = tanque completo, 40 = se
       nota.
     ÁNIMO (0-100) · es la CABEZA. Define tu ENVIÓN INICIAL y cuánto mejor leés
       en los duelos.

   Las monedas de este juego son energía y ánimo. No hay plata, ni sueldo, ni
   nada que se compre. Los efectos permanentes son MINÚSCULOS (+1): los que se
   sienten son los del domingo. Así el que juega diez temporadas no lo rompe.

   Lógica PURA, requerible en node. El render vive en scenes/master.js.
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaSemana = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var RANURAS = ["lunes", "miercoles", "viernes"];

  /* ---------- arranque de la semana ----------
     Se arranca en 100, menos lo que traés: un partido duro y una molestia
     sin curar te dejan con menos tanque desde el lunes. */
  function nuevaSemana(save, cfg) {
    cfg = cfg || {};
    var base = cfg.energia_max != null ? cfg.energia_max : 100;
    var penalMolestia = cfg.penal_molestia != null ? cfg.penal_molestia : 15;
    var e = base - (save && save.desgaste ? save.desgaste : 0) - (save && save.molestia ? penalMolestia : 0);
    /* A3: y lo que arrastrás de tu propia semana (0 si no hay resaca) */
    e -= (save && save.resaca ? save.resaca : 0);
    /* el piso jugable: la resaca cansa, no te deja tirado */
    var piso = cfg.resaca_piso != null ? cfg.resaca_piso : 35;
    if (save && save.resaca) e = Math.max(piso, e);
    return {
      energia: clamp(Math.round(e), 0, base),
      animo: clamp(Math.round((save && save.animo != null) ? save.animo : (cfg.animo_inicial != null ? cfg.animo_inicial : 60)), 0, 100),
      elegidas: [null, null, null],
      molestia: !!(save && save.molestia),
      fecha: (save && save.fecha) || 1
    };
  }

  /* ---------- el catálogo ----------
     Nunca hay una opción objetivamente mejor: entrenar te hace mejor pero
     llegás cansado; descansar te deja fresco pero no mejorás. Esa es toda la
     tensión, y por eso los costos y los premios son del mismo orden. */
  function catalogo(data) {
    return (data && data.opciones) || [];
  }
  /* qué se puede ofrecer en esta ranura, según origen, molestia y el evento */
  /* A1 · ¿esta stat ya está en el techo?
     ctx.stats trae las stats actuales del jugador y ctx.stat_techo el tope
     (99 por defecto, que es donde clampea el partido). Sin ctx.stats esto
     devuelve false y todo se comporta como antes: es opcional a propósito,
     para no romper a ningún llamador viejo. */
  function statEnElTecho(ctx, stat) {
    if (!ctx || !ctx.stats || !stat) return false;
    var techo = ctx.stat_techo != null ? ctx.stat_techo : 99;
    return (ctx.stats[stat] != null) && ctx.stats[stat] >= techo;
  }

  var _vida = null;
  function tryVida() {
    if (_vida !== null) return _vida;
    try { _vida = require("./vida.js"); } catch (e) { _vida = false; }
    return _vida;
  }
  function opcionesPara(data, semana, ctx) {
    ctx = ctx || {};
    var out = [];
    catalogo(data).forEach(function (o) {
      if (o.requiere === "molestia" && !semana.molestia) return;
      /* requiere_origen es un FILTRO DURO (no "aparece mas seguido"), y hasta
         la auditoria comparaba la condicion contra la marca cruda: ayudar_casa
         pedia "campo" y la marca era "cosecha", asi que no salia nunca. La
         traduccion vive en logic/vida.js y la usan los dos. */
      if (o.requiere_origen) {
        var V = (typeof window !== "undefined" && window.PampaVida) ||
                (typeof require === "function" ? tryVida() : null);
        var marcas = ctx.marcas || (ctx.origen ? [ctx.origen] : []);
        var ok = V && V.cumpleOrigen ? V.cumpleOrigen(o.requiere_origen, marcas)
                                     : marcas.indexOf(o.requiere_origen) >= 0;
        if (!ok) return;
      }
      if (o.una_vez && semana.elegidas.indexOf(o.id) >= 0) return;
      /* A1 · LA OPCIÓN QUE YA NO SIRVE LO DICE, Y NO TE COBRA.
         Simulado a 90 semanas: entrenando siempre el mismo stat el techo se
         toca en la semana 25, y desde ahí quedan 65 semanas en las que
         entrenar cuesta 25 de energía y no cambia un número. El jugador no
         tiene forma de enterarse: la opción se ve igual y se cobra igual.
         Ahora la opción sigue apareciendo (para que se entienda que existe)
         pero marcada, sin costo y sin efecto. Que desaparezca sería peor:
         parecería un bug. */
      if (o.stat && statEnElTecho(ctx, o.stat)) {
        out.push(Object.assign({}, o, {
          en_techo: true,
          energia_costo: 0,
          nota_techo: "ya está al máximo · no suma nada"
        }));
        return;
      }
      out.push(o);
    });
    return out;
  }

  /* ---------- A1 · RENDIMIENTO DECRECIENTE ----------
     Cuanto más alta está la stat, menos suma cada punto de entrenamiento.
     Elegida entre las tres opciones porque es la única que sigue significando
     algo en la temporada cinco: las otras corren el techo más lejos pero no lo
     resuelven, y "no repetir stat" no cambia nada para el que ya juega mixto.
     Y tiene una virtud de diseño: la mejora se encarece justo cuando el rival
     se endurece, así que entrenar nunca se vuelve trámite.

     La curva es lineal sobre lo que FALTA para el techo, con un piso para que
     nunca deje de sumar del todo:
        factor = max(piso, (techo - stat) / (techo - inicial))
     Medido a 90 semanas con esta calibración: entrenando SIEMPRE el mismo stat
     el techo llega en la semana 71 (temporada 4), y con estrategia mixta no se
     toca nunca. Los dos criterios pedidos.

     Sin cfg.stats esto devuelve el valor entero y todo se comporta como antes:
     los llamadores viejos no se enteran. */
  function rendimiento(cuanto, cfg, stat) {
    if (!cfg || !cfg.stats || !stat || cfg.stats[stat] == null) return cuanto;
    if (cfg.rendimiento_decreciente === false) return cuanto;
    var techo = cfg.stat_techo != null ? cfg.stat_techo : 99;
    var ini = cfg.stat_inicial != null ? cfg.stat_inicial : 50;
    var piso = cfg.rendimiento_piso != null ? cfg.rendimiento_piso : 0.15;
    var margen = (techo - cfg.stats[stat]) / Math.max(1, techo - ini);
    return cuanto * Math.max(piso, Math.min(1, margen));
  }

  /* ---------- A3 · LA RESACA DE LA SEMANA ----------
     lunesDespues no devolvía 'energia', así que con cuánta energía TERMINABAS
     la semana no arrastraba: podías gastar todo el viernes y el lunes arrancar
     como si nada. Ahora arrastra, pero SUAVE: la penalización es una fracción
     de lo que faltó para llenar el tanque, no el total, y tiene un piso para
     que nunca arranques por debajo de lo jugable.
        faltante  = energia_max - energia_con_la_que_terminaste
        penaliza  = faltante * resaca_frac
        arranque  = max(resaca_piso, energia_max - desgaste - molestia - penaliza)
     Con resaca_frac 0.33 y piso 35, medido a 90 semanas, "entrenar siempre"
     —que es el que más gasta— se estabiliza cerca del piso sin quedar
     injugable, y descansar no lo nota. */
  function resacaDeLaSemana(energiaFinal, cfg) {
    cfg = cfg || {};
    if (energiaFinal == null) return 0;
    var max = cfg.energia_max != null ? cfg.energia_max : 100;
    var frac = cfg.resaca_frac != null ? cfg.resaca_frac : 0.33;
    return Math.round(Math.max(0, max - energiaFinal) * frac);
  }

  /* ---------- elegir ----------
     Devuelve la semana NUEVA (no muta) o null si no se puede (sin energía,
     ranura ocupada, opción desconocida). El costo se cobra siempre; el efecto
     permanente se acumula aparte, para que el llamador lo aplique a las stats. */
  function elegir(data, semana, ranura, opcionId, cfg) {
    cfg = cfg || {};
    if (ranura < 0 || ranura > 2) return null;
    if (semana.elegidas[ranura]) return null;
    var o = null, lista = catalogo(data);
    for (var i = 0; i < lista.length; i++) if (lista[i].id === opcionId) o = lista[i];
    if (!o) return null;
    var costo = o.energia_costo || 0;
    if (costo > semana.energia) return null;             // no te da el cuerpo
    var s = {
      energia: clamp(semana.energia - costo + (o.energia_recupera || 0), 0, cfg.energia_max != null ? cfg.energia_max : 100),
      animo: clamp(semana.animo + (o.animo || 0), 0, 100),
      elegidas: semana.elegidas.slice(),
      molestia: o.cura_molestia ? false : semana.molestia,
      fecha: semana.fecha,
      permanentes: Object.assign({}, semana.permanentes || {}),
      espiado: semana.espiado || o.espia_rival || false
    };
    s.elegidas[ranura] = o.id;
    /* los permanentes son MINÚSCULOS y se topean por semana */
    var tope = cfg.permanente_max_semana != null ? cfg.permanente_max_semana : 3;
    var suma = 0, k;
    for (k in s.permanentes) suma += s.permanentes[k];
    /* A1: una stat en el techo no suma ni descuenta del tope semanal — si
       descontara, entrenar algo inútil te sacaría el permanente de otra cosa. */
    if (o.stat && suma < tope && !statEnElTecho(cfg, o.stat)) {
      var cuanto = Math.min(o.stat_mas || 1, tope - suma);
      cuanto = rendimiento(cuanto, cfg, o.stat);
      if (cuanto > 0) s.permanentes[o.stat] = (s.permanentes[o.stat] || 0) + cuanto;
    }
    return s;
  }

  /* ---------- cómo llegás al domingo ----------
     La energía que te queda se convierte en AGUANTE INICIAL y el ánimo en
     ENVIÓN INICIAL. Nunca te deja en cero: el piso es jugable. */
  /* ══════════════════════════════════════════════════════════════════════
     EL TECHO DE AGUANTE QUE COMPRASTE ENTRENANDO.

     ENTRENAR AGUANTE es la ÚNICA opción de la semana con stat_mas 2 —el doble
     que las otras nueve— y la más cara junto con AYUDAR EN CASA (30 y 35 de
     energía). Las dos suben `resistencia`. Y `resistencia` NO LA LEÍA NINGÚN
     MOTOR: la única línea que la tocaba escribía `j.aguanteMax`, un campo del
     jugador que tampoco leía nadie, porque los seis clamps de aguante de
     partido.js usaban el global `bal.aguante.max`.

     O sea: las dos opciones más caras del juego entrenaban una stat muerta.
     Entrenabas aguante toda la carrera y nunca aguantabas más.

     La cuenta vive acá, en un solo lugar, porque la usan los dos extremos de la
     cadena: la semana (para saber desde dónde llegás el domingo) y la cancha
     (para saber hasta dónde podés recuperar). Si se separan, vuelve el bug.

     MEDIDO: entrenando aguante todas las semanas, `resistencia` toca el techo
     de 99 alrededor de la temporada 2 y queda en +49,3, o sea +197 de tanque
     (1000 → 1197, un 19,7% más). Con los costos de hoy eso son 2 gambetas o 2
     remates más por partido, todo por ARRIBA del umbral de rendido (110).
     ══════════════════════════════════════════════════════════════════════ */
  function techoDeAguante(mejoras, cfg) {
    cfg = cfg || {};
    var base = cfg.aguante_max || 1000;
    var porPunto = cfg.aguante_por_resistencia != null ? cfg.aguante_por_resistencia : 4;
    return Math.round(base + ((((mejoras || {}).resistencia) || 0) * porPunto));
  }

  function comoLlegas(semana, cfg) {
    cfg = cfg || {};
    var aguanteMax = cfg.aguante_max || 1000;
    var piso = cfg.aguante_piso_frac != null ? cfg.aguante_piso_frac : 0.45;
    var frac = piso + (1 - piso) * (semana.energia / (cfg.energia_max || 100));
    var envionMax = cfg.envion_max || 100;
    var envion = Math.round(envionMax * (semana.animo / 100) * (cfg.envion_frac != null ? cfg.envion_frac : 0.5));
    /* la cabeza también ayuda a LEER: un bonus chico a la lectura de duelos */
    var lectura = Math.round((semana.animo - 50) / 10);   // -5 .. +5
    return {
      aguanteInicial: Math.round(aguanteMax * frac),
      aguanteFrac: Math.round(frac * 100) / 100,
      envionInicial: clamp(envion, 0, envionMax),
      lectura: clamp(lectura, -5, 5),
      resumen: resumen(semana)
    };
  }
  /* la línea que se lee antes de entrar a la cancha */
  /* A2 · CÓMO LLEGÁS — CALIBRADO AL RANGO QUE EL JUEGO PRODUCE DE VERDAD.
     La versión anterior tenía los umbrales del ánimo en 35/40/70/80, pero
     simuladas 90 semanas con tres estrategias el ánimo casi nunca baja de 75:
     entra más de lo que sale (el asado da +15, ganar +12, y solo perder resta).
     O sea que las ramas de "cabeza en otra cosa" y "golpeado" no se veían
     NUNCA, y el resumen quedaba clavado en 2 o 3 textos de 8 durante toda la
     carrera — que es justo lo único que le cuenta al jugador que la semana
     tuvo consecuencia.

     Ahora el eje principal es la ENERGÍA, que sí recorre todo el rango (medido:
     5 a 100 según cómo juegues), en los CUATRO escalones pedidos:
        entero (>=75) · normal (55-74) · cansado (35-54) · fundido (<35)
     y el ánimo matiza cada escalón, con los cortes puestos donde el ánimo de
     verdad se mueve (85 y 65), no donde nunca llega.

     nivel() se exporta aparte para que la UI pueda mostrar la etiqueta corta
     al lado de la frase: la palabra es el dato, la frase es el color. */
  function nivelEnergia(e) {
    if (e >= 75) return "entero";
    if (e >= 55) return "normal";
    if (e >= 35) return "cansado";
    return "fundido";
  }
  /* ══════════════════════════════════════════════════════════════════════
     LA MOLESTIA SE SUMA AL RESUMEN, NO LO REEMPLAZA.

     Esta función cortaba en seco: `if (semana.molestia) return "Arrastrás una
     molestia..."`. Se tragaba la energía y el ánimo enteros, así que con una
     molestia sin curar el resumen decía LO MISMO todas las semanas.

     Nadie lo había visto porque esa rama nunca se ejecutaba: la molestia no
     nacía de ningún lado (ver balance.aguante._golpe_nota). Al conectarla
     quedó a la vista, y carrera.test.js la cazó en el acto — con la estrategia
     'entrenar' el texto se repetía en el 83% de las 90 semanas contra el 48%
     de antes. Es la enfermedad al revés: conectar algo muerto destapa lo que
     ese algo tapaba.

     Ahora es una coletilla. El resumen sigue contando cómo llegás —que es lo
     único que le dice al jugador que su semana tuvo consecuencia— y además
     avisa de la molestia.
     ══════════════════════════════════════════════════════════════════════ */
  function resumen(semana) {
    var base = resumenBase(semana);
    return semana.molestia ? base + ", y con una molestia encima" : base;
  }
  function resumenBase(semana) {
    var e = semana.energia, a = semana.animo;
    var n = nivelEnergia(e);
    if (n === "entero") {
      if (a >= 85) return "Llegás con las piernas enteras y muchas ganas";
      if (a >= 65) return "Llegás con las piernas enteras y la cabeza en calma";
      return "Llegás bien de piernas pero con la cabeza en otra cosa";
    }
    if (n === "normal") {
      if (a >= 85) return "Estás caliente para este partido";
      if (a >= 65) return "Llegás normal, como cualquier domingo";
      return "Llegás normal, pero con algo dando vueltas";
    }
    if (n === "cansado") {
      if (a >= 85) return "Venís con poco aire, pero con muchas ganas";
      if (a >= 65) return "La semana te dejó con poco aire";
      return "Venís con poco aire y con la cabeza en otra cosa";
    }
    if (a >= 85) return "Venís sin nafta, y aun así querés jugarlo";
    if (a >= 65) return "Venís sin nafta: las piernas no te van a responder";
    return "Venís sin nafta y con lo del domingo pasado encima";
  }

  /* ---------- el lunes después ----------
     Terminado el partido: se recupera según resultado y minutos, el ánimo sube
     o baja, y si te dieron un golpe fuerte arrastrás una molestia. */
  function lunesDespues(save, resultado, cfg) {
    cfg = cfg || {};
    save = save || {};
    var r = resultado || {};
    var gano = r.golesMio > r.golesRival, empate = r.golesMio === r.golesRival;
    var animo = clamp((save.animo != null ? save.animo : 60)
      + (gano ? (cfg.animo_gana || 12) : empate ? (cfg.animo_empata || 2) : -(cfg.animo_pierde || 10))
      + (r.golesMio > 0 && r.hiceGol ? (cfg.animo_gol || 6) : 0), 0, 100);
    /* el desgaste del partido: cuánto te costó (0 = fresco, 40 = fundido) */
    var fracFinal = r.aguanteFinalFrac != null ? r.aguanteFinalFrac : 0.6;
    var desgaste = Math.round((1 - fracFinal) * (cfg.desgaste_max || 40));
    /* la molestia viene de DOS lados y antes no venía de ninguno: del partido
       (r.golpeFuerte, que no lo escribía nadie) y de la semana (las acciones
       con riesgo_golpe, que se guardaban en un objeto que el lunes anulaba).
       El OR es lo que hace que arrastre en vez de evaporarse: si la curaste, el
       llamador ya dejó save.molestia en false y no vuelve sola. */
    var molestia = !!r.golpeFuerte || !!save.molestia;
    return {
      animo: animo,
      desgaste: clamp(desgaste, 0, cfg.desgaste_max || 40),
      molestia: molestia,
      /* A3: cuánto te arrastra tu propia semana. save.energiaFinal la pone el
         llamador con la energía que te quedó el viernes. */
      resaca: resacaDeLaSemana(save.energiaFinal, cfg),
      fecha: (save.fecha || 1) + 1
    };
  }

  /* ══════════════════════════════════════════════════════════════════════
     TANDA 1.0 · RECARGAR NO PUEDE DUPLICAR NADA.

     Medido con master.js real: entrenar tiro tres veces (+3), entrar al
     partido y recargar la página 4 veces en medio del partido dejaba tiro en
     +15. cerrarSemana sumaba los permanentes en CADA llamada, y la semana solo
     se daba por terminada al volver con el resultado, que vivía en el registry
     (memoria de la página) y se escribía recién al tocar SEGUIR: cerrar la
     pestaña en GANASTE perdía la fecha. Y el evento de la semana se volvía a
     sortear (con la bolsa ya gastada, otro evento).

     Ahora todo lo que pasa en una fecha se marca con LA FECHA: temporada +
     número de fecha. Lo marcado ya no se repite:
       · semanaCerradaEnFecha  → cerrar otra vez no suma ni recalcula
       · eventoFecha           → el evento sorteado (y si ya se decidió)
       · enCancha              → saliste a jugar esa fecha
       · resultadoPendiente    → el pitazo, escrito en el save al terminar
     ══════════════════════════════════════════════════════════════════════ */
  function claveDeFecha(save) {
    var t = save && save.temporada;
    return { temporadaN: (save && save.temporadaN) | 0, fecha: t ? (t.fecha | 0) : 0 };
  }
  /* ¿esta marca es de la fecha que se está jugando ahora? */
  function esLaFecha(save, marca) {
    if (!save || !marca || typeof marca !== "object") return false;
    var c = claveDeFecha(save);
    return (marca.temporadaN | 0) === c.temporadaN && (marca.fecha | 0) === c.fecha &&
      marca.temporadaN != null && marca.fecha != null;
  }
  /* ¿la semana de esta fecha ya se cerró? Un save escrito ANTES de esta tanda
     no tiene la marca, pero se reconoce igual: semanaResumen solo lo escribe
     cerrarSemana y el lunes lo vuelve a null, así que resumen + semana armada
     sin marca = la cerró el código viejo y el resultado nunca llegó. */
  function semanaCerrada(save) {
    if (!save) return false;
    if (save.semanaCerradaEnFecha) return esLaFecha(save, save.semanaCerradaEnFecha);
    return !!(save.semanaResumen && save.semana);
  }

  /* cerrar la semana: lo que elegiste se convierte en cómo llegás al domingo.
     Los permanentes se suman UNA vez por fecha; la segunda llamada devuelve lo
     que dejó la primera (sin recalcular: el techo de aguante ya incluye la
     resistencia de esta semana y la cuenta daría otra cosa). */
  function cerrarSemana(save, cfg) {
    cfg = cfg || {};
    var sem = save.semana || nuevaSemana(save, cfg);
    /* el domingo se llega hasta TU techo, no hasta el global */
    var cfgLlega = Object.assign({}, cfg, { aguante_max: techoDeAguante(save.mejoras, cfg) });
    if (semanaCerrada(save)) {
      /* ya cerrada: nada se suma. Si el resumen se perdió, se rearma sin tocar
         las mejoras (que ya tienen lo de esta semana). */
      if (!save.semanaResumen) save.semanaResumen = comoLlegas(sem, cfgLlega);
      save.semanaCerradaEnFecha = claveDeFecha(save);
      save.semana = sem;
      sem.cerrada = true;
      return { llega: save.semanaResumen, yaEstaba: true };
    }
    var llega = comoLlegas(sem, cfgLlega);
    /* los permanentes se guardan en la carrera (chiquitos, para siempre) */
    save.mejoras = save.mejoras || {};
    Object.keys(sem.permanentes || {}).forEach(function (k) {
      save.mejoras[k] = (save.mejoras[k] || 0) + sem.permanentes[k];
    });
    save.semanaResumen = llega;
    /* la molestia de la semana se commitea acá: el lunes anula save.semana,
       y sin esto te lastimabas entrenando y el lunes no había pasado nada */
    save.molestia = !!sem.molestia;
    save.semana = sem;
    sem.cerrada = true;
    save.semanaCerradaEnFecha = claveDeFecha(save);
    return { llega: llega, yaEstaba: false };
  }

  /* el evento de la fecha se sortea UNA vez y queda en el save. sortear() es
     del llamador (usa la bolsa y la data de eventos) y devuelve el evento o
     null; acá solo se decide si hace falta llamarlo. */
  function eventoDeLaFecha(save, sortear) {
    if (esLaFecha(save, save.eventoFecha)) return save.eventoFecha;
    var ev = sortear ? sortear() : null;
    var c = claveDeFecha(save);
    save.eventoFecha = {
      temporadaN: c.temporadaN, fecha: c.fecha, id: ev && ev.id != null ? ev.id : null,
      /* sin opciones no hay nada que decidir: nace resuelto */
      resuelto: !(ev && ev.opciones && ev.opciones.length)
    };
    return save.eventoFecha;
  }

  /* el resultado AL PITAZO: se anota en el save si es de la fecha que se está
     jugando. Si no coincide (otra carrera, una fecha que ya se aplicó) no se
     escribe nada. Devuelve true si lo anotó. */
  function anotarResultado(save, res) {
    if (!save || !res || !esLaFecha(save, res)) return false;
    save.resultadoPendiente = {
      temporadaN: res.temporadaN | 0, fecha: res.fecha | 0,
      golesMio: res.golesMio | 0, golesRival: res.golesRival | 0,
      hiceGol: !!res.hiceGol,
      aguanteFinalFrac: typeof res.aguanteFinalFrac === "number" && isFinite(res.aguanteFinalFrac) ? res.aguanteFinalFrac : 0.6,
      golpeFuerte: !!res.golpeFuerte
    };
    return true;
  }
  /* de los resultados que llegan (el anotado en el save y el del registry, si
     se tocó SEGUIR), el que corresponde a esta fecha. Uno SIN marca de fecha
     no vale: es de un partido que el Master no mandó (el arnés de pruebas arma
     masterPartido a mano) y aplicarlo le sumaría a la carrera una fecha que
     no se jugó. */
  function resultadoQueCorresponde(save, pendiente, delRegistry) {
    var lista = [pendiente, delRegistry];
    for (var i = 0; i < lista.length; i++) if (esLaFecha(save, lista[i])) return lista[i];
    return null;
  }

  /* ══════════════════════════════════════════════════════════════════════
     23/oct, PEDIDO DE RODRI · LA SEMANA DE CUATRO COSAS (flags.semana_cuatro).
     "Capaz que tiene MUCHO y eso RESTA; algo simple de 3 o 4 cosas, claras
     en qué influyen." Una sola decisión por semana, y cada una dice qué te
     da en la cancha:
       ENTRENAR (TIRO, PASE o GAMBETA)  +N a esa, solo el próximo partido
       DESCANSAR                        llegás con el AGUANTE lleno
       VER AL RIVAL                     ves su defensa y su estrella
       SALIR CON LA BARRA               más ÁNIMO: suma en el SÚPER TIRO,
                                        EL TOQUE y el tiro libre
     La elección vive en save.eleccion, marcada con la fecha como lo demás:
     la semana vieja (save.semana) no se toca, así que con la perilla en false
     vuelve tal cual. balance.semana.cuatro tiene los números.
     ══════════════════════════════════════════════════════════════════════ */
  var CUATRO = ["entrenar", "descansar", "ver_rival", "barra"];
  var ENTRENABLES = ["tiro", "pase", "gambeta"];

  function eleccionDeLaFecha(save) {
    return save && esLaFecha(save, save.eleccion) && CUATRO.indexOf(save.eleccion.id) >= 0 ? save.eleccion : null;
  }
  /* elegir otra pisa la anterior: es una sola por semana */
  function elegirCuatro(save, id, que) {
    if (CUATRO.indexOf(id) < 0) return null;
    if (id === "entrenar" && ENTRENABLES.indexOf(que) < 0) return null;
    var c = claveDeFecha(save);
    save.eleccion = { temporadaN: c.temporadaN, fecha: c.fecha, id: id, que: id === "entrenar" ? que : null };
    return save.eleccion;
  }
  /* el ánimo de una jugada grande, en puntos de poder del remate */
  function bonusGrande(animo, C) {
    return clamp(Math.round((animo - C.grande_desde) * C.grande_por_punto), 0, C.grande_max);
  }
  /* lo que vas a tener en la cancha con esta elección (o sin ninguna) */
  function enLaCancha(save, eleccion, cfg) {
    var C = cfg.cuatro, id = eleccion ? eleccion.id : null;
    var conBarra = Math.round((save.animo != null ? save.animo : cfg.animo_inicial) + (id === "barra" ? C.barra_animo : 0));
    var animo = clamp(conBarra, 0, 100);
    /* revisión final del 23/oct: con el ÁNIMO lleno la barra no sumaba nada.
       Lo que no entra en el ánimo va a las jugadas grandes */
    var sobra = C.barra_sobra_a_grande ? Math.max(0, conBarra - 100) : 0;
    var sinDescanso = clamp(Math.round(C.llegada_base - (save.desgaste || 0) * C.llegada_por_desgaste), 0, 100);
    return {
      id: id,
      entrena: id === "entrenar" ? { stat: eleccion.que, mas: C.entrenar_mas } : null,
      aguantePct: id === "descansar" ? C.llegada_descanso : sinDescanso,
      aguanteSinDescanso: sinDescanso,
      animo: animo,
      grande: bonusGrande(animo, C) + Math.round(sobra * C.grande_por_punto),
      espiado: id === "ver_rival"
    };
  }
  /* lo mismo dicho con las cinco palabras: TIRO, PASE, GAMBETA, AGUANTE, ÁNIMO */
  function renglonesDeLaCancha(lc) {
    var r = [];
    if (lc.entrena) r.push("+" + lc.entrena.mas + " de " + lc.entrena.stat.toUpperCase());
    r.push("AGUANTE al " + lc.aguantePct + "%");
    r.push("ÁNIMO " + lc.animo + (lc.grande ? ": +" + lc.grande + " en las jugadas grandes" : ""));
    if (lc.espiado) r.push("ves su defensa y su estrella");
    return r;
  }
  /* cerrar con la elección: lo que viaja a la cancha. No suma mejoras para
     siempre (lo de entrenar es para esta fecha) y una vez por fecha, igual
     que cerrarSemana */
  function cerrarSemanaCuatro(save, cfg) {
    if (semanaCerrada(save) && save.semanaResumen) {
      save.semanaCerradaEnFecha = claveDeFecha(save);
      return { llega: save.semanaResumen, yaEstaba: true };
    }
    var lc = enLaCancha(save, eleccionDeLaFecha(save), cfg);
    var techo = techoDeAguante(save.mejoras, cfg);
    var envionMax = cfg.envion_max || 100;
    var llega = {
      cuatro: lc.id,
      aguanteInicial: Math.round(techo * lc.aguantePct / 100),
      aguanteFrac: lc.aguantePct / 100,
      envionInicial: clamp(Math.round(envionMax * (lc.animo / 100) * (cfg.envion_frac != null ? cfg.envion_frac : 0.5)), 0, envionMax),
      lectura: 0,
      entrena: lc.entrena, animo: lc.animo, grande: lc.grande, espiado: lc.espiado,
      renglones: renglonesDeLaCancha(lc),
      resumen: "Esta fecha: " + renglonesDeLaCancha(lc).join(" · ")
    };
    save.semanaResumen = llega;
    save.semanaCerradaEnFecha = claveDeFecha(save);
    return { llega: llega, yaEstaba: false };
  }

  return {
    CUATRO: CUATRO, ENTRENABLES: ENTRENABLES, eleccionDeLaFecha: eleccionDeLaFecha, elegirCuatro: elegirCuatro,
    bonusGrande: bonusGrande, enLaCancha: enLaCancha, renglonesDeLaCancha: renglonesDeLaCancha, cerrarSemanaCuatro: cerrarSemanaCuatro,
    RANURAS: RANURAS, clamp: clamp,
    claveDeFecha: claveDeFecha, esLaFecha: esLaFecha, semanaCerrada: semanaCerrada,
    cerrarSemana: cerrarSemana, eventoDeLaFecha: eventoDeLaFecha,
    anotarResultado: anotarResultado, resultadoQueCorresponde: resultadoQueCorresponde,
    nuevaSemana: nuevaSemana, opcionesPara: opcionesPara, elegir: elegir,
    comoLlegas: comoLlegas, resumen: resumen, lunesDespues: lunesDespues,
    techoDeAguante: techoDeAguante,
    nivelEnergia: nivelEnergia, statEnElTecho: statEnElTecho,
    rendimiento: rendimiento, resacaDeLaSemana: resacaDeLaSemana
  };
});
