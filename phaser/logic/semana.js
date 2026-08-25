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
  function resumen(semana) {
    var e = semana.energia, a = semana.animo;
    if (semana.molestia) return "Arrastrás una molestia de la fecha pasada";
    var n = nivelEnergia(e);
    if (n === "entero") {
      if (a >= 85) return "Llegás entero y con muchas ganas";
      if (a >= 65) return "Llegás entero y tranquilo";
      return "Llegás bien de piernas pero con la cabeza en otra cosa";
    }
    if (n === "normal") {
      if (a >= 85) return "Estás caliente para este partido";
      if (a >= 65) return "Llegás normal, como cualquier domingo";
      return "Llegás normal, pero con algo dando vueltas";
    }
    if (n === "cansado") {
      if (a >= 85) return "Venís cansado, pero con muchas ganas";
      if (a >= 65) return "Venís cansado de la semana";
      return "Venís cansado y con la cabeza en otra cosa";
    }
    if (a >= 85) return "Venís fundido, y aun así querés jugarlo";
    if (a >= 65) return "Venís fundido: las piernas no te van a responder";
    return "Venís fundido y golpeado por lo del domingo pasado";
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
    var molestia = !!r.golpeFuerte;
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

  return {
    RANURAS: RANURAS, clamp: clamp,
    nuevaSemana: nuevaSemana, opcionesPara: opcionesPara, elegir: elegir,
    comoLlegas: comoLlegas, resumen: resumen, lunesDespues: lunesDespues,
    techoDeAguante: techoDeAguante,
    nivelEnergia: nivelEnergia, statEnElTecho: statEnElTecho,
    rendimiento: rendimiento, resacaDeLaSemana: resacaDeLaSemana
  };
});
