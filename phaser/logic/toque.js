/* ============================================================================
   PAMPA STAR · phaser/logic/toque.js — EL TOQUE (lógica PURA)
   Playtest de Rodri del 20/oct, punto 5: volver a LA CANCHA del jugadón de V8,
   con el posicionamiento como mecánica. La pelota viene con su curva y su
   gravedad; te acomodás para que caiga en tu pie hábil (o saltás si viene
   alta) y le pegás en el momento justo.

   El mundo va en metros y de perfil: x hacia el arco (0..L), z hacia la
   cámara (0..D), h la altura. Lo que sale de acá es una ZONA para
   duel.resolveShot, igual que la de logic/tiro.js: acá no se decide el gol.
   Todas las perillas viven en balance.toque. SIN Phaser: corre en node.
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaToque = factory();
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
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function entre(r, par) { return par[0] + r() * (par[1] - par[0]); }

  /* el pie hábil: el que diga el jugador; si no dice, la zurda sale del rasgo
     ("zurda de ruta 35") o de su nombre, uno de cada cinco, siempre el mismo */
  function pieDe(j) {
    if (j.pie === "der" || j.pie === "izq") return j.pie;
    if (/zurd/i.test(j.rasgo || "")) return "izq";
    var s = String(j.nombre || "") + "#" + String(j.numero || ""), h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h) % 5 === 0 ? "izq" : "der";
  }

  /* la pelota en tramos: el vuelo (con la comba) y los piques, hasta rodar */
  function tramos(p0, v, az, cfg) {
    var g = cfg.gravedad, out = [], t0 = 0, p = p0, vel = v, a = az;
    for (var i = 0; i < 4; i++) {
      var tg = (vel.h + Math.sqrt(vel.h * vel.h + 2 * g * p.h)) / g;
      out.push({ t0: t0, p: p, v: vel, az: a, dur: tg, rueda: false });
      p = { x: p.x + vel.x * tg, z: p.z + vel.z * tg + 0.5 * a * tg * tg, h: 0 };
      vel = { x: vel.x * cfg.pique.roce, z: (vel.z + a * tg) * cfg.pique.roce, h: (g * tg - vel.h) * cfg.pique.rebote };
      a = 0; t0 += tg;
      if (vel.h < cfg.pique.minimo) break;
    }
    out.push({ t0: t0, p: p, v: { x: vel.x, z: vel.z, h: 0 }, az: 0, dur: Infinity, rueda: true });
    return out;
  }
  function bolaEn(e, t) {
    var s = e.tramos[0];
    for (var i = 0; i < e.tramos.length; i++) if (t >= e.tramos[i].t0) s = e.tramos[i];
    var dt = Math.max(0, t - s.t0);
    return {
      x: s.p.x + s.v.x * dt,
      z: s.p.z + s.v.z * dt + 0.5 * s.az * dt * dt,
      h: s.rueda ? 0 : Math.max(0, s.p.h + s.v.h * dt - 0.5 * e.cfg.gravedad * dt * dt)
    };
  }

  /* jugador: { stats, aguanteFrac, pie } · cfg = balance.toque
     origen: "propia" para el SÚPER TIRO (pedido de Rodri del 22/oct): la
     pelota es tuya y sale de tus pies, te la acomodás y le pegás. Sin origen,
     se sortea uno de cfg.origenes, como en el remate del área. */
  function crearJugada(o) {
    var c = o.cfg, r = rng(o.semilla), J = o.jugador, s = J.stats || {};
    var propia = o.origen === "propia";
    var org = propia ? c.propia : c.origenes[Math.floor(r() * c.origenes.length)];
    var p0 = { x: entre(r, org.x), z: entre(r, org.z), h: org.h };
    var tira = r(), acc = 0, tramo = c.alturas[c.alturas.length - 1];
    for (var i = 0; i < c.alturas.length; i++) { acc += c.alturas[i].p; if (tira < acc) { tramo = c.alturas[i]; break; } }
    var T = { x: entre(r, c.llegada.x), z: entre(r, c.llegada.z), h: entre(r, propia && org.h_llegada ? org.h_llegada : tramo.h) };
    var tT = entre(r, c.vuelo_s), az = (r() * 2 - 1) * c.curva_max * (org.curva != null ? org.curva : 1);
    var frac = clamp(J.aguanteFrac, 0, 1);
    var vmax = (c.vel_base + ((s.velocidad || 50) - 50) * c.vel_stat) * (1 - c.vel_cansancio * (1 - frac));
    /* arranca lejos, pero siempre a una distancia que se llega leyendo bien */
    var d = Math.min(entre(r, c.distancia_m), vmax * (tT - c.reaccion_s) * 0.9);
    /* con tu pelota arrancás DETRÁS de donde cae (a no más de 60 grados de
       la línea del arco): te la adelantás y vas a buscarla. Con el ángulo
       libre, la mitad de las veces la pelota salía de tus pies para atrás */
    var ang = propia ? Math.PI + (r() * 2 - 1) * Math.PI / 3 : r() * Math.PI * 2;
    var pie = J.pie;
    var jx = clamp(T.x + Math.cos(ang) * d, 0.4, c.cancha.L - 0.4), jz = clamp(T.z + Math.sin(ang) * d, 0.3, c.cancha.D - 0.3);
    /* la tuya arranca pegada a tu pie: org.x y org.z son cuánto adelante y al costado */
    if (propia) p0 = { x: jx + p0.x, z: clamp(jz + p0.z, 0.2, c.cancha.D - 0.2), h: org.h };
    var v = {
      x: (T.x - p0.x) / tT,
      z: (T.z - p0.z - 0.5 * az * tT * tT) / tT,
      h: (T.h - p0.h + 0.5 * c.gravedad * tT * tT) / tT
    };
    return {
      cfg: c, r: r, t: 0, tT: tT, T: T, origen: org,
      tramos: tramos(p0, v, az, c), curva: az,
      jug: {
        x: jx,
        z: jz,
        vmax: vmax, salto: c.salto_base + ((s.aereo || 50) - 50) * c.salto_stat,
        pie: pie, lado: pie === "izq" ? -1 : 1, stats: s
      },
      golpe: null, fin: null, tFin: tT + c.tope_pasada_s
    };
  }

  /* un cuadro: el jugador corre hacia `objetivo` ({x,z} en metros) hasta que
     le pega; de ahí en más queda clavado en el gesto */
  function paso(e, dt, objetivo) {
    var j = e.jug, c = e.cfg;
    if (!e.fin) {
      e.t += dt;
      if (!e.golpe && objetivo) {
        var dx = objetivo.x - j.x, dz = objetivo.z - j.z, dist = Math.hypot(dx, dz), mov = j.vmax * dt;
        if (dist > 0.0001) {
          var k = Math.min(1, mov / dist);
          j.x = clamp(j.x + dx * k, 0.4, c.cancha.L - 0.4);
          j.z = clamp(j.z + dz * k, 0.3, c.cancha.D - 0.3);
        }
      }
      if (e.golpe && e.t >= e.golpe.tc) e.fin = evaluar(e);
      else if (!e.golpe && e.t >= e.tFin) e.fin = { contacto: false, calidad: 0, tecnica: null, pie: null, motivo: "se_paso" };
    }
    return e;
  }

  /* el clic: el gesto sale de la altura de la pelota; si viene alta, saltás
     (y el contacto llega más tarde, por eso hay que anticiparse) */
  function pegar(e) {
    if (e.fin || e.golpe) return null;
    var T = e.cfg.tecnicas, id;
    var hp = bolaEn(e, e.t + T.remate.swing).h;
    if (hp <= T.remate.h[1]) id = "remate";
    else if (hp <= T.volea.h[1]) id = "volea";
    else {
      var b = bolaEn(e, e.t + T.cabezazo.swing);
      id = (b.x - e.jug.x) < e.cfg.chilena_detras ? "chilena" : "cabezazo";
    }
    e.golpe = { ts: e.t, tc: e.t + T[id].swing, tecnica: id };
    return e.golpe;
  }

  /* dónde tiene que estar la pelota, respecto del jugador, para cada gesto */
  function puntoDulce(e, tecnica, lado) {
    var tec = e.cfg.tecnicas[tecnica], j = e.jug;
    return { x: j.x + tec.dx, z: j.z + lado * tec.dz };
  }
  function bandaDeAltura(e, tec) {
    if (!tec.h_cabeza) return tec.h;
    var cab = e.cfg.cabeza_m + e.jug.salto;
    return [cab + tec.h_cabeza[0], cab + tec.h_cabeza[1]];
  }

  function evaluar(e) {
    var c = e.cfg, g = e.golpe, tec = c.tecnicas[g.tecnica], j = e.jug;
    var b = bolaEn(e, g.tc), banda = bandaDeAltura(e, tec);
    var dh = b.h < banda[0] ? banda[0] - b.h : (b.h > banda[1] ? b.h - banda[1] : 0);
    var stat = j.stats[tec.stat] || 50;
    var tol = tec.tol * (c.tol_stat[0] + stat * c.tol_stat[1]);
    var lados = tec.dz ? [j.lado, -j.lado] : [0];
    var mejor = null;
    lados.forEach(function (lado) {
      var p = puntoDulce(e, g.tecnica, lado);
      var err = Math.sqrt(Math.pow(b.x - p.x, 2) + Math.pow(b.z - p.z, 2) + Math.pow(c.peso_altura * dh, 2));
      var tolL = lado === -j.lado && lado !== 0 ? tol * c.pie_otro.tol : tol;
      var ratio = err / tolL;
      if (!mejor || ratio < mejor.ratio) mejor = { lado: lado, err: err, ratio: ratio };
    });
    var contacto = mejor.ratio < c.contacto_max;
    /* 25/oct, Rodri: "tiré el centro, medio que le erré y igual cabeceó".
       Pasado el tope de contacto no la tocó; si quedó cerca, no la alcanzó */
    var noLlego = !contacto && c.no_llego_max != null && mejor.ratio < c.no_llego_max;
    var q = contacto ? clamp(1 - mejor.ratio + (e.r() - 0.5) * c.azar, 0, 1) : 0;
    return {
      contacto: contacto, calidad: q, tecnica: g.tecnica,
      pie: mejor.lado === 0 ? null : (mejor.lado === j.lado ? "habil" : "otro"),
      pieUsado: mejor.lado === 0 ? null : (mejor.lado > 0 ? "der" : "izq"),
      error: mejor.err, bola: b, motivo: contacto ? "golpe" : (noLlego ? "no_llego" : "pifia")
    };
  }

  /* el contacto, traducido a la zona que ya entiende duel.resolveShot.
     deOtro: remata un compañero y el cartel habla de él (revisión del 22/oct) */
  function zonaDeContacto(res, cfg, deOtro) {
    /* sin tocarla no hay gol: la pifia y la que se pasa van por su zona */
    if (res.contacto === false) {
      var sc = cfg.sin_contacto;
      var dice = res.motivo === "se_paso" ? (deOtro ? sc.dice_se_paso_otro : sc.dice_se_paso)
        : res.motivo === "no_llego" ? (deOtro ? sc.dice_no_llego_otro : sc.dice_no_llego)
        : (deOtro ? sc.dice_otro : sc.dice);
      return { id: sc.id, n: sc.n, dice: dice, bonus: sc.bonus, fuera: sc.fuera, gy: 0 };
    }
    var z = cfg.zonas[cfg.zonas.length - 1];
    for (var i = 0; i < cfg.zonas.length; i++) if (res.calidad >= cfg.zonas[i].q) { z = cfg.zonas[i]; break; }
    var tec = res.tecnica ? cfg.tecnicas[res.tecnica] : null, otro = res.pie === "otro";
    var lado = res.bola && res.bola.z < cfg.cancha.D / 2 ? -1 : 1;
    return {
      id: z.id, n: z.n, dice: z.dice,
      bonus: z.bonus + (tec ? tec.bonus : 0) + (otro ? cfg.pie_otro.bonus : 0),
      fuera: clamp(z.fuera + (otro ? cfg.pie_otro.fuera : 0), 0, 0.95),
      gy: z.gy * lado
    };
  }
  function textoDeContacto(res, cfg, deOtro) {
    if (res.motivo === "se_paso") return deOtro ? "la dejó pasar" : "la dejaste pasar";
    if (res.motivo === "no_llego") return deOtro ? "no la alcanzó" : "no la alcanzaste";
    var tec = cfg.tecnicas[res.tecnica];
    var pie = res.pieUsado ? (res.pieUsado === "der" ? " con la derecha" : " con la izquierda") : "";
    return tec.de + pie + (res.pie === "otro" ? ", la menos hábil" : "");
  }

  return {
    rng: rng, pieDe: pieDe, crearJugada: crearJugada, bolaEn: bolaEn,
    paso: paso, pegar: pegar, puntoDulce: puntoDulce, bandaDeAltura: bandaDeAltura,
    zonaDeContacto: zonaDeContacto, textoDeContacto: textoDeContacto
  };
});
