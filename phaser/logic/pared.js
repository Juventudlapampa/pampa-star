/* ============================================================================
   PAMPA STAR · phaser/logic/pared.js — LA PARED ESPECIAL (lógica pura)

   Pedido de Rodri (25/oct): "le hago el pase a uno, yo salgo corriendo al
   centro, me tira el centro y ahí hago chilena o cabeza, o se activa la
   animación para pegarle el súper tiro. Tal vez eso se puede ir ganando".

   Tres golpes: la pasás al compañero de mejor PASE cerca, picás al área y te
   la tira. Acá se decide la pared (pase y devolución) y adónde picás; el
   centro lo resuelve logic/flujo.js (resolverCentro) como cualquier centro,
   así la altura de la caída elige el remate de EL TOQUE (cabeza, volea,
   chilena). Se destraba con la barrita del puesto (logic/puesto.js) y gasta
   aguante. Las perillas viven en balance.pared. Sin Phaser: corre en node
   (phaser/test/pared.test.js).
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory(require("./partido.js"));
  else root.PampaPared = factory(root.PampaPartido);
})(typeof self !== "undefined" ? self : this, function (P) {
  "use strict";

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  /* el de mejor PASE cerca de VOS, sin el arquero y sin quedar muy atrás */
  function companero(st, cfg) {
    var vos = st.mios[st.ctrl], mejor = -1;
    st.mios.forEach(function (j, i) {
      if (i === st.ctrl || j.pos === "ARQ" || j.x < vos.x - cfg.atras_px || dist(j, vos) > cfg.radio_px) return;
      if (mejor < 0 || (j.stats.pase || 0) > (st.mios[mejor].stats.pase || 0)) mejor = i;
    });
    return mejor;
  }

  function marcasCerca(st, j, cfg) {
    return st.rivales.filter(function (r) { return r.pos !== "ARQ" && dist(r, j) < cfg.marca_px; }).length;
  }

  /* la chance de la pared (tu pase y su devolución); el centro va aparte */
  function chance(st, c, cfg) {
    var vos = st.mios[st.ctrl], compa = st.mios[c];
    var p = cfg.base + (vos.stats.pase || 0) * cfg.por_pase_vos + (compa.stats.pase || 0) * cfg.por_pase_compa
      - (marcasCerca(st, vos, cfg) + marcasCerca(st, compa, cfg)) * cfg.por_marca;
    return Math.round(clamp(p, cfg.min, cfg.max));
  }

  function chanceDelCentro(st, c, cfg) {
    return Math.round(clamp(cfg.centro_base + (st.mios[c].stats.pase || 0) * cfg.centro_por_pase, cfg.centro_min, cfg.centro_max));
  }

  function disponible(st, cfg) {
    var vos = st.mios[st.ctrl];
    if (!vos || !vos.esVos || st.posesion !== "mia") return null;
    if (vos.x < st.W * cfg.desde_frac || vos.aguante < cfg.costo) return null;
    var c = companero(st, cfg);
    if (c < 0) return null;
    return { companero: c, costo: cfg.costo, pct: chance(st, c, cfg), pctCentro: chanceDelCentro(st, c, cfg) };
  }

  /* adónde picás: al área, del lado en que venías */
  function pique(st, cfg) {
    var vos = st.mios[st.ctrl];
    return { x: st.W - cfg.pique_x_px, y: st.H / 2 + (vos.y >= st.H / 2 ? 1 : -1) * cfg.pique_y_px };
  }

  /* los dos primeros golpes. Ganada: VOS quedó en el área, la pelota en el
     compañero y él tiene el control para tirar el centro (flujo.resolverCentro
     con vosIdx). Perdida: pelota del rival */
  function resolver(st, cfg, rng) {
    rng = rng || Math.random;
    var d = disponible(st, cfg);
    if (!d) throw new Error("la pared especial no estaba disponible");
    var vosIdx = st.ctrl, vos = st.mios[vosIdx];
    vos.aguante = clamp(vos.aguante - d.costo, 0, P.techoAguante(vos, st.bal));
    var win = rng() * 100 < d.pct;
    if (!win) {
      P.perderPelota(st, rng);
      return { win: false, companero: d.companero, vosIdx: vosIdx, pct: d.pct };
    }
    var a = pique(st, cfg), c = st.mios[d.companero];
    vos.x = a.x; vos.y = a.y;
    st.ctrl = d.companero;
    st.pelota.x = c.x + 12; st.pelota.y = c.y;
    return { win: true, companero: d.companero, vosIdx: vosIdx, pct: d.pct, pctCentro: d.pctCentro };
  }

  /* la clavaste en el momento justo de EL TOQUE: va el súper tiro */
  function esSuperTiro(salidaDelToque, cfg) {
    var r = salidaDelToque && salidaDelToque.res;
    return !!(r && r.contacto && r.calidad >= cfg.super_calidad);
  }

  return {
    companero: companero, chance: chance, chanceDelCentro: chanceDelCentro,
    disponible: disponible, pique: pique, resolver: resolver, esSuperTiro: esSuperTiro
  };
});
