/* ============================================================================
   PAMPA STAR · phaser/logic/vida.js — LA VIDA DE LA CARRERA (lógica PURA, V8 A1)
   PARTE 1 · EL ORIGEN: tres preguntas al crear la carrera (potrero/escuelita/
   galpón/hermano · campo/escuela/changas/taller · el consejo del que enseñó).
   Reparten stats iniciales y dejan una FRASE que el relator cita después.
   PARTE 2 · LA SEMANA: antes de cada fecha, un evento corto con dos respuestas
   y un modificador CHICO para ESA fecha. La BOLSA no repite hasta agotarse y
   los condicionales solo salen cuando corresponde (clásico, racha, cosecha…).
   SIN Phaser, SIN Math.random suelto (PRNG con semilla): corre en node.
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaVida = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function rng(semilla) {
    var a = (semilla >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- PARTE 1: EL ORIGEN ----------
     elecciones = [idxPantalla0, idxPantalla1, idxPantalla2] */
  function aplicarOrigen(data, elecciones) {
    var pant = (data && data.origen) || [];
    var stats = {}, frases = [], marcas = [];
    (elecciones || []).forEach(function (idx, i) {
      var p = pant[i];
      if (!p || !p.opciones) return;
      var o = p.opciones[((idx | 0) % p.opciones.length + p.opciones.length) % p.opciones.length];
      if (!o) return;
      Object.keys(o.stats || {}).forEach(function (k) { stats[k] = (stats[k] || 0) + o.stats[k]; });
      if (o.frase) frases.push(o.frase);
      if (o.marca) marcas.push(o.marca);
    });
    return { stats: stats, frases: frases, marcas: marcas };
  }
  /* la ficha corta: "Thiago, el que aprendió en el potrero de Winifreda" */
  function fichaOrigen(nombre, origen, pueblo) {
    var f = (origen && origen.frases && origen.frases[0]) || "el del pueblo";
    return (nombre || "VOS") + ", " + f + (pueblo ? " de " + pueblo : "");
  }

  /* ---------- PARTE 2: LA SEMANA ----------
     ctx = { fecha, division, clasico, posRival, posMia, racha, marcas } */
  function aplicaCondicion(ev, ctx) {
    if (!ev.condicion) return true;
    ctx = ctx || {};
    switch (ev.condicion) {
      case "clasico": return !!ctx.clasico;
      case "rival_arriba": return ctx.posRival != null && ctx.posMia != null && ctx.posRival < ctx.posMia - 1;
      case "rival_abajo": return ctx.posRival != null && ctx.posMia != null && ctx.posRival > ctx.posMia + 1;
      case "racha_buena": return (ctx.racha | 0) >= 3;
      case "racha_mala": return (ctx.racha | 0) <= -3;
      case "campo": return (ctx.marcas || []).indexOf("cosecha") >= 0;
      case "primera": return (ctx.fecha | 0) === 0;
      default: return true;
    }
  }
  /* elegir SIN repetir: la bolsa guarda los ids ya vistos y se vacía al agotarse */
  function elegirEvento(data, bolsaVistos, ctx, semilla) {
    var evs = (data && data.eventos) || [];
    var vistos = bolsaVistos || [];
    var elegibles = evs.filter(function (e) { return aplicaCondicion(e, ctx); });
    if (!elegibles.length) return null;
    var frescos = elegibles.filter(function (e) { return vistos.indexOf(e.id) < 0; });
    var reinicia = false;
    if (!frescos.length) { frescos = elegibles; reinicia = true; }   // bolsa agotada: se da vuelta
    var r = rng(semilla || 1);
    var ev = frescos[Math.floor(r() * frescos.length) % frescos.length];
    return { evento: ev, vistos: (reinicia ? [] : vistos).concat([ev.id]), reinicio: reinicia };
  }

  /* efectos → el modificador de ESA fecha (vocabulario cerrado y acotado) */
  var TOPES = { aguante: 120, envion: 60, duelo: 10, keeper: 12, tiro: 10, pase: 10, gambeta: 10, fisico: 10, caracter: 10, arranque: 10, final: 10, recuperacion: 2 };
  function aplicarEleccion(evento, idxOpcion) {
    if (!evento || !evento.opciones) return null;
    var o = evento.opciones[((idxOpcion | 0) % evento.opciones.length + evento.opciones.length) % evento.opciones.length];
    if (!o) return null;
    var mod = {};
    Object.keys(o.efecto || {}).forEach(function (k) {
      var tope = TOPES[k] != null ? TOPES[k] : 10;
      var v = o.efecto[k];
      mod[k] = k === "recuperacion" ? Math.max(0.5, Math.min(tope, v)) : Math.max(-tope, Math.min(tope, v));
    });
    return { eventoId: evento.id, opcion: o.texto, frase: o.frase_relator || "", mod: mod };
  }
  /* se limpia al terminar la fecha (nunca arrastra) */
  function limpiar(save) { if (save) save.modFecha = null; return save; }

  return {
    aplicarOrigen: aplicarOrigen, fichaOrigen: fichaOrigen,
    aplicaCondicion: aplicaCondicion, elegirEvento: elegirEvento,
    aplicarEleccion: aplicarEleccion, limpiar: limpiar, TOPES: TOPES, rng: rng
  };
});
