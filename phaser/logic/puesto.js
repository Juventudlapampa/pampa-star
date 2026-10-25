/* ============================================================================
   PAMPA STAR · phaser/logic/puesto.js — TU PUESTO, TU NÚMERO Y LA BARRITA
   (lógica pura)

   Pedido de Rodri (25/oct): "que puedas elegir tu posición y que en la cancha
   sepas cuál sos vos... y una barrita para ir destrabando cosas según la
   posición", y "en personalizar, que te deje optar por número de remera, que
   no estén todas las opciones".

     · el puesto (DEF, VOL o ATA) y el número, con pocas opciones por puesto
       (balance.puesto.numeros);
     · en qué lugar de la formación jugás y qué número lleva cada compañero:
       el que tenía tu número se queda con el que dejaste libre;
     · la barrita de cada puesto: sube jugando por lo que hacés bien en tu
       puesto y destraba, de a una, lo que la poda apagó (balance.puesto.
       destrabes: cada una prende su perilla de balance.flags en tu partido).

   Una carrera sin puesto (las de antes de este cambio) pasa por la pantalla
   corta de scenes/master.js (vistaPuesto) y no pierde nada.

   Sin Phaser: corre en node (phaser/test/puesto.test.js).
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaPuesto = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var PUESTOS = ["DEF", "VOL", "ATA"];

  function numeros(puesto, cfg) {
    return PUESTOS.indexOf(puesto) >= 0 ? cfg.numeros[puesto].slice() : [];
  }

  function falta(save, cfg) {
    return !save || numeros(save.puesto, cfg).indexOf(save.numero) < 0;
  }

  function elegir(save, puesto, numero, cfg) {
    if (numeros(puesto, cfg).indexOf(numero) < 0) {
      throw new Error("puesto o número que no se ofrecen: " + puesto + " " + numero);
    }
    save.puesto = puesto;
    save.numero = numero;
    if (!save.barrita || typeof save.barrita !== "object") save.barrita = {};
    return save;
  }

  function slots(formacion) {
    var out = [];
    formacion.forEach(function (l) { for (var i = 0; i < l.n; i++) out.push(l.pos); });
    return out;
  }

  /* el del medio de tu línea: con ATA es el mismo lugar de siempre (el 10) */
  function slotDeVos(formacion, puesto) {
    var idx = [];
    slots(formacion).forEach(function (p, i) { if (p === puesto) idx.push(i); });
    if (!idx.length) throw new Error("la formación no tiene " + puesto);
    return idx[Math.floor((idx.length - 1) / 2)];
  }

  function numerosDelPlantel(formacion, vosIdx, numero) {
    var arr = slots(formacion).map(function (p, i) { return i + 1; });
    var k = arr.indexOf(numero);
    if (k >= 0 && k !== vosIdx) arr[k] = arr[vosIdx];
    arr[vosIdx] = numero;
    return arr;
  }

  function puntosDelPartido(puesto, res, cfg) {
    var b = cfg.barrita, pts = b.por_partido;
    var gm = res.golesMio | 0, gr = res.golesRival | 0;
    if (puesto === "ATA") pts += (res.golesVos | 0) * b.por_gol_tuyo;
    if (puesto === "VOL" && gm > gr) pts += b.por_triunfo;
    if (puesto === "DEF" && gr === 0) pts += b.por_valla_invicta;
    return pts;
  }

  function progreso(save, cfg) {
    return falta(save, cfg) ? 0 : ((save.barrita && save.barrita[save.puesto]) | 0);
  }

  function sumar(save, res, cfg) {
    if (falta(save, cfg)) return 0;
    var pts = puntosDelPartido(save.puesto, res, cfg);
    if (!save.barrita || typeof save.barrita !== "object") save.barrita = {};
    save.barrita[save.puesto] = progreso(save, cfg) + pts;
    return pts;
  }

  function destrabados(save, cfg) {
    if (falta(save, cfg)) return [];
    var p = progreso(save, cfg);
    return cfg.destrabes[save.puesto].filter(function (d) { return p >= d.umbral; }).map(function (d) { return d.flag; });
  }

  /* la próxima por destrabar, con lo que falta; null si ya están todas */
  function proximo(save, cfg) {
    if (falta(save, cfg)) return null;
    var p = progreso(save, cfg), desde = 0;
    var lista = cfg.destrabes[save.puesto];
    for (var i = 0; i < lista.length; i++) {
      if (p < lista[i].umbral) {
        return { nombre: lista[i].nombre, umbral: lista[i].umbral, desde: desde, progreso: p, falta: lista[i].umbral - p };
      }
      desde = lista[i].umbral;
    }
    return null;
  }

  /* las perillas de la poda que tu puesto ya destrabó, prendidas sobre las del
     balance (el partido las lee de masterPartido.destrabados) */
  function flagsDelPartido(flags, destrabadas) {
    var out = Object.assign({}, flags);
    (destrabadas || []).forEach(function (f) { out[f] = true; });
    return out;
  }

  return {
    PUESTOS: PUESTOS, numeros: numeros, falta: falta, elegir: elegir,
    slotDeVos: slotDeVos, numerosDelPlantel: numerosDelPlantel,
    puntosDelPartido: puntosDelPartido, progreso: progreso, sumar: sumar,
    destrabados: destrabados, proximo: proximo, flagsDelPartido: flagsDelPartido
  };
});
