/* ============================================================================
   PAMPA STAR · phaser/logic/flujo.js — QUE EL PARTIDO FLUYA (lógica PURA)
   Pedido de Rodri del 23/oct: "a veces queda muy trabado en el medio, que se
   sienta más movido para pasar, tomar decisiones de dar pases, de tirar centro
   y que pasen cosas mágicas; que fluya más en vez de correr con el cursor".

   Tres cosas, todas con las perillas en balance.flujo (activo false = como
   antes):
   · EL AUTO-AVANCE: con la pelota, el que la lleva va solo hacia el arco por
     el carril más libre. Tocar el mapa fija un carril un rato.
   · LA DECISIÓN: cada cada_ms de juego, cuando un rival se acerca a
     radio_aviso o enseguida de recibir un pase, el partido para y elegís.
   · EL CENTRO / PASE AL AIRE: al compañero mejor ubicado; si le cae en la zona
     de remate hace su firulete según dónde le cae (chilena, volea, cabezazo,
     de taco, de palomita). Si la recibe VOS, juega EL TOQUE.
   Los tiempos van en ms de SIMULACIÓN (el pulso corre dt_ms por cada
   latido_ms reales: con 300 y 440, 1 s de juego son 1,47 s de reloj real).
   SIN Phaser: corre en node.
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory(require("./partido.js"));
  else root.PampaFlujo = factory(root.PampaPartido);
})(typeof self !== "undefined" ? self : this, function (P) {
  "use strict";

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
  function cfg(st) { var F = st.bal.flujo; return F && F.activo ? F : null; }
  function activo(st) { return !!cfg(st); }

  /* ---------- EL AUTO-AVANCE ---------- */
  function carriles(st, F) {
    var n = F.carriles, m = F.margen_px, out = [];
    for (var k = 0; k < n; k++) out.push(m + (st.H - 2 * m) * k / (n - 1));
    return out;
  }
  /* cuánto tapan ese carril los rivales que están adelante (los de cerca pesan más) */
  function presion(st, y, F) {
    var c = st.mios[st.ctrl], p = 0;
    st.rivales.forEach(function (r) {
      if (r.pos === "ARQ") return;
      var adelante = r.x - c.x;
      if (adelante < -20 || adelante > F.mira_px) return;
      var lat = Math.abs(r.y - y);
      if (lat >= F.ancho_carril_px) return;
      p += (1 - Math.max(0, adelante) / F.mira_px) * (1 - lat / F.ancho_carril_px);
    });
    return p;
  }
  function elegirCarril(st) {
    var F = cfg(st), c = st.mios[st.ctrl];
    if (st._flujoCarrilHasta && st._t < st._flujoCarrilHasta) return st._flujoCarrilY;
    var cerca = st.W - c.x < F.centrar_desde_px;
    var costo = function (y) {
      var yy = cerca ? (y + st.H / 2) / 2 : y;
      return { y: yy, v: presion(st, yy, F) + Math.abs(yy - c.y) * F.peso_cambio };
    };
    var mejor = null;
    carriles(st, F).forEach(function (y) { var o = costo(y); if (!mejor || o.v < mejor.v) mejor = o; });
    /* histéresis: el carril que traía se mantiene si no es claramente peor */
    if (st._flujoCarrilY != null) {
      var actual = costo(st._flujoCarrilY);
      if (actual.v <= mejor.v + F.histeresis) mejor = actual;
    }
    st._flujoCarrilY = mejor.y;
    return mejor.y;
  }
  function fijarCarril(st, y) {
    var F = cfg(st);
    if (!F) return;
    st._flujoCarrilY = clamp(y, F.margen_px, st.H - F.margen_px);
    st._flujoCarrilHasta = st._t + F.carril_tocado_ms;
  }
  /* el input que mueve al portador cuando nadie lo mueve a mano */
  function autoInput(st) {
    var F = cfg(st);
    if (!F || st.posesion !== "mia" || st.modo !== "juego") return null;
    var c = st.mios[st.ctrl];
    var y = elegirCarril(st);
    var dy = clamp((y - c.y) / F.giro_px, -1, 1);
    var dx = st.W - c.x > F.frena_px ? 1 : 0;
    if (!dx && Math.abs(dy) < 0.15) return null;
    return { dx: dx, dy: dy };
  }

  /* ---------- LA DECISIÓN ---------- */
  function rivalQueSeAcerca(st, F) {
    var c = st.mios[st.ctrl], mejor = -1, md = F.radio_aviso;
    st.rivales.forEach(function (r, i) {
      if (r.pos === "ARQ" || r.x < c.x - 10) return;
      var d = dist(r.x, r.y, c.x, c.y);
      if (d < md) { md = d; mejor = i; }
    });
    return mejor;
  }
  /* se llama después de cada latido; devuelve { motivo, rivalIdx } o null.
     motivo: "recibe" (le acaba de llegar un pase), "rival" (se le viene uno),
     "tiempo" (pasaron cada_ms sin decidir nada). */
  function chequear(st) {
    var F = cfg(st);
    if (!F) return null;
    if (st.posesion !== "mia" || st._flujoPos !== st.posesion) {
      st._flujoPos = st.posesion; st._flujoUlt = st._t; st._flujoCtrl = st.ctrl; st._flujoRecibe = 0;
      return null;
    }
    if (st.modo !== "juego") return null;
    if (st._flujoCtrl !== st.ctrl) {
      st._flujoCtrl = st.ctrl; st._flujoRecibe = st._t + F.recibe_ms; st._flujoCarrilY = null; st._flujoCarrilHasta = 0;
    }
    var out = null;
    if (st._flujoRecibe && st._t >= st._flujoRecibe) out = { motivo: "recibe", rivalIdx: null };
    else if (st._t - st._flujoUlt >= F.min_ms) {
      var r = rivalQueSeAcerca(st, F);
      if (r >= 0) out = { motivo: "rival", rivalIdx: r };
      else if (st._t - st._flujoUlt >= F.cada_ms) out = { motivo: "tiempo", rivalIdx: null };
    }
    if (!out) return null;
    st._flujoUlt = st._t; st._flujoRecibe = 0;
    st._flujoN = (st._flujoN || 0) + 1;
    st.modo = "congelado";
    return out;
  }
  /* SEGUIR (o cualquier decisión que no cambia de dueño): la cuenta arranca de nuevo */
  function seguir(st) {
    var F = cfg(st);
    st._flujoUlt = st._t; st._flujoRecibe = 0;
    /* y el cruce no le cae encima apenas sigue: la seguidilla de menús es lo que no hay que hacer */
    if (F) st.cooldown = Math.max(st.cooldown || 0, F.min_ms);
  }

  /* ---------- EL CENTRO / PASE AL AIRE ---------- */
  function enZona(st, j) {
    var C = cfg(st).centro;
    return st.W - j.x < C.zona_px && Math.abs(j.y - st.H / 2) < C.zona_ancho_px;
  }
  /* el mejor para recibirla en el aire: en la zona de remate, de cabeza, sin marca */
  function receptorAereo(st) {
    var F = cfg(st);
    if (!F || st.posesion !== "mia") return null;
    var C = F.centro, c = st.mios[st.ctrl], pase = c.stats.pase || 50, mejor = null;
    st.mios.forEach(function (j, i) {
      if (i === st.ctrl || j.pos === "ARQ" || j.x < c.x - 60) return;
      var d = dist(j.x, j.y, c.x, c.y);
      if (d > C.radio_px || d < C.d_min_px) return;
      var marca = 0;
      st.rivales.forEach(function (r) {
        if (r.pos === "ARQ") return;
        var dr = dist(r.x, r.y, j.x, j.y);
        if (dr < C.marca_px) marca = Math.max(marca, (C.marca_px - dr) * C.por_marca);
      });
      var aereo = j.stats.aereo || 50, zona = enZona(st, j);
      var pct = clamp(Math.round(C.base + (pase - 50) * C.por_pase + (aereo - 50) * C.por_aereo - marca
        - Math.max(0, d - C.d_ok_px) * C.penal_lejos), C.min, C.max);
      var puntaje = pct + (zona ? C.bonus_zona : 0) + (j.esVos ? C.bonus_vos : 0) + (j.x - c.x) * 0.02;
      if (!mejor || puntaje > mejor.puntaje) mejor = { idx: i, nombre: j.nombre, pct: pct, zona: zona, d: Math.round(d), puntaje: puntaje };
    });
    return mejor;
  }
  /* dónde le cae: la altura sale del largo del envío; el lado, de dónde viene */
  function caidaDe(st, desde, rec, rng) {
    var C = cfg(st).centro;
    var d = dist(desde.x, desde.y, rec.x, rec.y);
    var h = clamp(C.h_base + d / C.h_por_px + (rng() - 0.5) * C.h_azar, 0.3, 2.8);
    var adelante = rec.x - desde.x, lateral = Math.abs(rec.y - desde.y);
    var lado = adelante < -30 ? "fondo" : (lateral > Math.abs(adelante) ? "costado" : "atras");
    return { h: Math.round(h * 100) / 100, lado: lado };
  }
  /* el firulete de cada uno según dónde le cae y lo que sabe hacer */
  function firuleteDe(st, caida, j, rng) {
    var FI = cfg(st).firuletes, s = j.stats || {}, h = caida.h;
    if (h >= FI.chilena.h_desde) {
      var puede = (s.aereo || 45) >= FI.chilena.aereo_min;
      return puede && (caida.lado === "fondo" || rng() < 0.5) ? "chilena" : "cabezazo";
    }
    if (h >= FI.palomita.h_desde) return caida.lado === "atras" ? "volea" : "palomita";
    if (caida.lado !== "fondo" && (s.gambeta || 45) >= FI.taco.gambeta_min && rng() < 0.6) return "taco";
    return "volea";
  }
  /* EL TOQUE ya tiene de dónde viene la pelota: el origen que le corresponde */
  function origenToque(caida) { return caida.lado === "fondo" ? "fondo" : (caida.lado === "costado" ? "cerca" : "atras"); }

  function resolverCentro(st, receptorIdx, pct, rng) {
    rng = rng || Math.random;
    var F = cfg(st), o = st.mios[st.ctrl], r = st.mios[receptorIdx];
    var desde = { x: o.x, y: o.y };
    var caida = caidaDe(st, desde, r, rng);
    var zona = enZona(st, r);
    o.aguante = clamp(o.aguante - F.centro.costo, 0, P.techoAguante(o, st.bal));
    P.saltoReloj(st, rng, F.reloj.centro);
    var win = rng() * 100 < pct;
    if (!win) { P.perderPelota(st, rng); return { win: false, pct: pct, zona: zona, caida: caida }; }
    st.ctrl = receptorIdx;
    st.pelota.x = r.x + 12; st.pelota.y = r.y;
    st.cooldown = st.bal.ritmo.cooldown_encuentro_ms; st.modo = "juego";
    st._altaHasta = st._t + (st.bal.partido.alto_ventana_ms || 6000);
    var out = { win: true, pct: pct, zona: zona, caida: caida, desde: desde };
    if (zona) {
      if (r.esVos) out.toque = origenToque(caida);
      else out.firulete = firuleteDe(st, caida, r, rng);
    }
    return out;
  }
  /* el remate del firulete: mismo contrato que prepararRemateAereo */
  function prepararFirulete(st, id, rng) {
    var FI = cfg(st).firuletes[id], j = st.mios[st.ctrl], s = j.stats || {};
    var poder = 0;
    Object.keys(FI.stat).forEach(function (k) { poder += (s[k] || 45) * FI.stat[k]; });
    poder = poder * FI.mult + (j.aguante / st.bal.aguante.max - 0.5) * 8;
    var vendido = st._vendidoHasta && st._t < st._vendidoHasta;
    if (vendido) { poder += st.bal.partido.bonus_arquero_vendido; st._vendidoHasta = 0; }
    j.aguante = clamp(j.aguante - FI.costo, 0, P.techoAguante(j, st.bal));
    st._altaHasta = 0;
    P.saltoReloj(st, rng);
    return { shotPower: poder, keeperSkill: st.rivalKeeperSkill, tipo: id, arqueroVendido: !!vendido,
      distancia: dist(j.x, j.y, st.W, st.H / 2) };
  }

  return {
    activo: activo, autoInput: autoInput, elegirCarril: elegirCarril, fijarCarril: fijarCarril,
    chequear: chequear, seguir: seguir,
    enZona: enZona, receptorAereo: receptorAereo, caidaDe: caidaDe, firuleteDe: firuleteDe,
    origenToque: origenToque, resolverCentro: resolverCentro, prepararFirulete: prepararFirulete
  };
});
