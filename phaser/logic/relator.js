/* ============================================================================
   PAMPA STAR · phaser/logic/relator.js — EL RELATOR (lógica pura, sin Phaser)
   ANIME v4 Bloque E: el partido se cuenta solo. Toma las frases de
   data/relatos.json (bloque "relator": variantes por situación, tono pampeano
   de cancha, 100% original) y las sirve SIN repetir la última de cada
   situación. Reemplaza {jugador} / {rival} / {pueblo}.
   Hook del futuro modo streamer: escuchar(fn) recibe cada frase emitida
   (la voz sintetizada NO se implementa en esta tanda — solo el enchufe).
   Corre en node (tests) y en el browser.
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaRelator = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  function crear(data, opts) {
    opts = opts || {};
    var rng = opts.rng || Math.random;
    var R = (data && data.relator) || {};
    var ultima = {};    // última frase servida por situación (no repetir dos veces seguidas)
    var oyentes = [];
    function frase(situacion, ctx) {
      var lista = R[situacion];
      if (!lista || !lista.length) return null;
      var i = Math.floor(rng() * lista.length) % lista.length;
      if (lista.length > 1 && i === ultima[situacion]) i = (i + 1) % lista.length;
      ultima[situacion] = i;
      ctx = ctx || {};
      var f = String(lista[i])
        .replace(/\{jugador\}/g, ctx.jugador || "el pibe")
        .replace(/\{rival\}/g, ctx.rival || "el rival")
        .replace(/\{pueblo\}/g, ctx.pueblo || "La Pampa");
      for (var k = 0; k < oyentes.length; k++) { try { oyentes[k]({ situacion: situacion, frase: f }); } catch (e) { } }
      return f;
    }
    return { frase: frase, escuchar: function (fn) { if (typeof fn === "function") oyentes.push(fn); } };
  }
  return { crear: crear };
});
