/* ============================================================================
   PAMPA STAR · phaser/logic/jugadon.js — EL JUGADÓN (lógica PURA, V8 §3)
   La plataforma de acción con fichas limitadas: 2 SÚPER QUITES + 2 GAMBETAS
   + 2 SÚPER TIROS por partido. Acá viven:
   - la GAMBETA/ESQUIVE: rivales que VIENEN, opciones según la carta del
     jugador, LECTURA MUTUA (el rival INSINÚA su intención — elegida por sus
     stats + azar acotado ANTES de ver la tuya; la CPU nunca copia).
   - el SÚPER QUITE: el espejo defensivo (te metés en la jugada del rival).
   - el SÚPER TIRO con FÍSICA REAL: fuerza del pateador vs manos del arquero
     vs zona elegida. GEOMETRÍA, no dados: si el arquero no llega a la
     trayectoria en el tiempo de vuelo, es gol; si llega, fuerza vs manos
     (la pelota puede REVENTARLE las manos). El azar existe pero acotado
     por la física (el error de lectura del arquero y el desempate).
   SIN Phaser, SIN Math.random suelto (PRNG con semilla): corre en node.
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaJugadon = factory();
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

  /* ---------- LAS FICHAS (6 por partido) ---------- */
  function fichasNuevas() { return { quites: 2, gambetas: 2, tiros: 2 }; }
  function gastarFicha(fichas, tipo) {
    if (!fichas || !fichas[tipo] || fichas[tipo] <= 0) return false;
    fichas[tipo]--;
    return true;
  }

  /* ---------- LA CARTA: qué opciones tiene cada jugador ----------
     Un jugador random tiene pocas; un crack tiene más — por eso al crack
     no lo pasás con lo básico y hay que arriesgar el caño o el sombrerito. */
  var MOVIDAS = [
    { id: "izq", n: "A LA IZQUIERDA", min: 0 },
    { id: "der", n: "A LA DERECHA", min: 0 },
    { id: "enganche", n: "ENGANCHE", min: 55 },
    { id: "canio", n: "CAÑO", min: 70 },
    { id: "sombrerito", n: "SOMBRERITO", min: 82 }
  ];
  function opcionesDe(statGambeta) {
    return MOVIDAS.filter(function (m) { return (statGambeta || 0) >= m.min; });
  }

  /* ---------- LA GAMBETA: lectura mutua, sin trampa ----------
     El rival DECLARA su cierre (insinuado en pantalla) ANTES de tu elección:
     sale de sus stats + azar acotado — nunca de copiarte. La matriz decide:
     - cierra_izq pierde contra "der" (y viceversa): leíste el cierre.
     - se_tira (barrida) pierde contra "sombrerito" (salta) y "enganche"
       (frenás y la barrida pasa de largo); gana contra izq/der.
     - cierra el medio (firme) pierde contra "canio"; gana contra enganche.
     El desempate fino: tu gambeta vs su quite (+azar acotado). */
  var CIERRES = [
    { id: "cierra_izq", n: "TE CIERRA LA IZQUIERDA" },
    { id: "cierra_der", n: "TE CIERRA LA DERECHA" },
    { id: "firme", n: "SE PLANTA FIRME" },
    { id: "se_tira", n: "SE TIRA AL PISO" }
  ];
  function elegirCierre(defensor, r) {
    /* por sus stats: quite alto → más "firme" y "se_tira"; sin ver al jugador */
    var q = (defensor && defensor.quite) || 50;
    var pesos = [1, 1, q / 50, q / 60];
    var total = pesos.reduce(function (a, b) { return a + b; }, 0);
    var t = r() * total, acc = 0;
    for (var i = 0; i < CIERRES.length; i++) {
      acc += pesos[i];
      if (t < acc) return CIERRES[i];
    }
    return CIERRES[0];
  }
  function resolverMovida(movida, cierre, atacante, defensor, r) {
    var gana;   // ¿lo pasás?
    if (cierre.id === "cierra_izq") gana = movida === "der" || movida === "canio";
    else if (cierre.id === "cierra_der") gana = movida === "izq" || movida === "canio";
    else if (cierre.id === "firme") gana = movida === "canio" || movida === "sombrerito";
    else gana = movida === "sombrerito" || movida === "enganche";   // se_tira
    /* el desempate fino: stats + azar ACOTADO (±18%) — leer bien manda */
    var g = (atacante && atacante.gambeta) || 50, q = (defensor && defensor.quite) || 50;
    var margen = (g - q) / 100 + (r() - 0.5) * 0.36;
    if (gana && margen < -0.32) gana = false;    // te leyó el cuerpo igual (crack defensivo)
    if (!gana && margen > 0.38) gana = true;     // tu jerarquía lo pasa por arriba
    return { gana: gana, cierre: cierre, margen: margen };
  }

  /* estado de la PLATAFORMA (cancha más ancha que larga) */
  function crearGambeta(opts) {
    var r = rng(opts.semilla || 7);
    var n = clamp(opts.marcadores || 1, 1, 2);   // ves cuántos vienen: uno o dos
    var defs = [];
    for (var i = 0; i < n; i++) {
      var d = opts.defensores && opts.defensores[i] ? opts.defensores[i] : { quite: 55 };
      defs.push({
        quite: d.quite || 55, nombre: d.nombre || "RIVAL",
        x: 480 + (i === 0 ? 0 : (r() < 0.5 ? -170 : 170)),
        y: 70 + i * 60,
        cierre: elegirCierre(d, r)   // su intención YA declarada (se insinúa)
      });
    }
    return {
      W: 960, H: 400,                 // más ancha que larga (el prototipo aprobado)
      modo: "gambeta",
      atacante: opts.atacante || { gambeta: 60 },
      defensores: defs, paso: 0,
      opciones: opcionesDe((opts.atacante && opts.atacante.gambeta) || 0),
      _r: r, terminado: false, exito: null
    };
  }
  /* un CRUCE de la plataforma: tu movida contra el defensor del paso */
  function cruceGambeta(g, movidaId) {
    if (g.terminado) return null;
    var d = g.defensores[g.paso];
    var res = resolverMovida(movidaId, d.cierre, g.atacante, d, g._r);
    res.defensor = d;
    if (!res.gana) { g.terminado = true; g.exito = false; }
    else {
      g.paso++;
      if (g.paso >= g.defensores.length) { g.terminado = true; g.exito = true; }
      else g.defensores[g.paso].cierre = elegirCierre(g.defensores[g.paso], g._r);
    }
    return res;
  }

  /* ---------- EL SÚPER QUITE: el espejo defensivo ----------
     El rival conduce; vos elegís CÓMO meterte. Él insinúa su movida (por sus
     stats, sin verte); tu respuesta correcta se la roba. */
  function crearQuite(opts) {
    var r = rng(opts.semilla || 11);
    var mov = MOVIDAS[Math.floor(r() * Math.min(3 + Math.floor(((opts.rival && opts.rival.gambeta) || 50) / 30), MOVIDAS.length))];
    return {
      W: 960, H: 400, modo: "quite",
      defensor: opts.defensor || { quite: 60 },
      rival: opts.rival || { gambeta: 55, nombre: "RIVAL" },
      movidaRival: mov,   // se INSINÚA en pantalla
      _r: r, terminado: false, exito: null
    };
  }
  function resolverQuite(q, cierreId) {
    if (q.terminado) return null;
    var cierre = null;
    for (var i = 0; i < CIERRES.length; i++) if (CIERRES[i].id === cierreId) cierre = CIERRES[i];
    if (!cierre) cierre = CIERRES[2];
    /* el espejo exacto de la matriz: si TU cierre vence su movida, se la robás */
    var res = resolverMovida(q.movidaRival.id, cierre, q.rival, q.defensor, q._r);
    q.terminado = true;
    q.exito = !res.gana;   // si su movida NO lo pasa, el quite fue tuyo
    return { gana: q.exito, movidaRival: q.movidaRival, margen: res.margen };
  }

  /* ---------- EL SÚPER TIRO: FÍSICA REAL (lo clave) ----------
     Arco de 400×140 (px de plataforma). zona = {x: -200..200, y: 0..140}
     (0 = centro abajo; |x| grande = palo; y alto = ángulo).
     1) el ARQUERO ELIGE dónde volar: lee tu cuerpo con ERROR según sus
        reflejos (mejor arquero = menos error) — NUNCA conoce la zona exacta.
     2) GEOMETRÍA: ¿llega? distancia de su vuelo vs alcance en el tiempo de
        vuelo (la fuerza acorta el tiempo). Si no llega: GOL. Sin dados.
     3) si llega: FUERZA vs MANOS — pAtaja = manos/(manos + fuerza·k). Si la
        fuerza lo revienta (margen grande), la pelota se le escapa: REBOTE.
     4) la PRECISIÓN del pateador mueve la zona real (un tiro al ángulo con
        poca técnica puede irse AFUERA). */
  var ARCO = { w: 400, h: 140 };
  function resolverSuperTiro(opts) {
    var r = rng(opts.semilla || 13);
    var fuerza = clamp(opts.fuerza || 60, 1, 200);          // stat tiro + energía
    var precision = clamp(opts.precision || 60, 1, 99);
    var A = opts.arquero || {};
    var reflejos = clamp(A.reflejos || 50, 1, 99);
    var manos = clamp(A.manos || reflejos, 1, 120);
    var zona = { x: clamp(opts.zona.x, -ARCO.w / 2, ARCO.w / 2), y: clamp(opts.zona.y || 0, 0, ARCO.h) };

    /* 4) la zona REAL: el error del pateador crece con la ambición (al ángulo)
       y baja con su técnica */
    var ambicion = (Math.abs(zona.x) / (ARCO.w / 2) + zona.y / ARCO.h) / 2;
    var errPate = (1 - precision / 100) * 90 * (0.5 + ambicion);
    var zx = zona.x + (r() * 2 - 1) * errPate;
    var zy = clamp(zona.y + (r() * 2 - 1) * errPate * 0.5, 0, ARCO.h + 40);
    if (Math.abs(zx) > ARCO.w / 2 + 6 || zy > ARCO.h + 6) {
      return { outcome: "afuera", detalle: { zonaReal: { x: zx, y: zy }, errPate: errPate } };
    }
    zx = clamp(zx, -ARCO.w / 2, ARCO.w / 2); zy = clamp(zy, 0, ARCO.h);

    /* 1) el arquero LEE con error (nunca 0: no adivina) y a veces se la juega */
    var errArq = Math.max(24, (100 - reflejos) * 2.2);
    var lee = zona.x + (r() * 2 - 1) * errArq;
    if (r() < 0.12) lee = (r() < 0.5 ? -1 : 1) * ARCO.w * 0.33;   // se la jugó a un palo
    var arqX = clamp(lee, -ARCO.w / 2, ARCO.w / 2);

    /* 2) GEOMETRÍA: tiempo de vuelo (la fuerza lo achica) vs su alcance */
    var tVuelo = clamp(0.9 - fuerza / 260, 0.25, 0.9);            // seg
    var alcance = 36 + reflejos * 2.1 * tVuelo;                    // px que cubre volando
    var dist = Math.hypot(zx - arqX, zy * 0.55);                   // llegar ARRIBA cuesta más
    if (dist > alcance) {
      return { outcome: "gol", detalle: { llego: false, dist: dist, alcance: alcance, arqX: arqX, zonaReal: { x: zx, y: zy } } };
    }

    /* 3) llegó: FUERZA vs MANOS (k=0.55: el tiro flojo se retiene; el
       fuerte pelea; el brutal revienta) */
    var pAtaja = manos / (manos + fuerza * 0.55);
    var tirada = r();
    if (tirada < pAtaja) {
      return { outcome: "atajada", detalle: { llego: true, dist: dist, alcance: alcance, arqX: arqX, pAtaja: pAtaja } };
    }
    /* no la retuvo: ¿se la reventó (rebote vivo) o se le escapó adentro? */
    var reventada = fuerza > manos * 1.35;
    return {
      outcome: reventada && tirada < pAtaja + 0.22 ? "rebote" : "gol",
      detalle: { llego: true, dist: dist, alcance: alcance, arqX: arqX, pAtaja: pAtaja, reventada: reventada }
    };
  }

  return {
    fichasNuevas: fichasNuevas, gastarFicha: gastarFicha,
    MOVIDAS: MOVIDAS, CIERRES: CIERRES, opcionesDe: opcionesDe,
    elegirCierre: elegirCierre, resolverMovida: resolverMovida,
    crearGambeta: crearGambeta, cruceGambeta: cruceGambeta,
    crearQuite: crearQuite, resolverQuite: resolverQuite,
    ARCO: ARCO, resolverSuperTiro: resolverSuperTiro, rng: rng
  };
});
