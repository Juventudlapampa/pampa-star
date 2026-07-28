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
  function opcionesPara(data, semana, ctx) {
    ctx = ctx || {};
    var out = [];
    catalogo(data).forEach(function (o) {
      if (o.requiere === "molestia" && !semana.molestia) return;
      if (o.requiere_origen && ctx.origen !== o.requiere_origen) return;
      if (o.una_vez && semana.elegidas.indexOf(o.id) >= 0) return;
      out.push(o);
    });
    return out;
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
    if (o.stat && suma < tope) {
      var cuanto = Math.min(o.stat_mas || 1, tope - suma);
      s.permanentes[o.stat] = (s.permanentes[o.stat] || 0) + cuanto;
    }
    return s;
  }

  /* ---------- cómo llegás al domingo ----------
     La energía que te queda se convierte en AGUANTE INICIAL y el ánimo en
     ENVIÓN INICIAL. Nunca te deja en cero: el piso es jugable. */
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
  function resumen(semana) {
    var e = semana.energia, a = semana.animo;
    if (semana.molestia) return "Arrastrás una molestia de la fecha pasada";
    if (e >= 75 && a >= 70) return "Llegás entero y con la cabeza tranquila";
    if (e >= 75 && a < 40) return "Llegás bien de piernas pero con la cabeza en otra cosa";
    if (e < 45 && a >= 70) return "Venís cansado de la semana, pero con muchas ganas";
    if (e < 45) return "Venís cansado de la semana";
    if (a >= 80) return "Estás caliente para este partido";
    if (a < 35) return "Venís golpeado por lo del domingo pasado";
    return "Llegás normal, como cualquier domingo";
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
      fecha: (save.fecha || 1) + 1
    };
  }

  return {
    RANURAS: RANURAS, clamp: clamp,
    nuevaSemana: nuevaSemana, opcionesPara: opcionesPara, elegir: elegir,
    comoLlegas: comoLlegas, resumen: resumen, lunesDespues: lunesDespues
  };
});
