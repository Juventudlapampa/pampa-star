/* ============================================================================
   PAMPA STAR · phaser/logic/temporada.js — LA TEMPORADA DEL MODO MASTER
   (lógica PURA, V7 §2: la carrera adentro del Phaser)
   Fixture round-robin por el método del círculo (10 equipos, 18 fechas ida y
   vuelta — el mismo esquema que la temporada del clásico), tabla con
   PJ G E P GF GC DG PTS, simulación DETERMINISTA de los partidos ajenos
   (PRNG con semilla: misma temporada, mismos resultados — resumible), y el
   veredicto de fin de temporada (el CAMPEÓN asciende; nadie desciende).
   SIN Phaser, SIN Math.random: corre en node y se testea.
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaTemporada = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* PRNG chico y determinista (mulberry32) — la temporada es reproducible */
  function rng(semilla) {
    var a = semilla >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* método del círculo: n equipos (si viene impar se agrega "LIBRE"),
     n-1 fechas de ida + espejo de vuelta con localía invertida */
  function fixture(equipos) {
    var eqs = equipos.slice();
    if (eqs.length % 2 === 1) eqs.push("LIBRE");
    var n = eqs.length, fechas = [];
    var rueda = eqs.slice(1);
    for (var f = 0; f < n - 1; f++) {
      var partidos = [];
      var arr = [eqs[0]].concat(rueda);
      for (var i = 0; i < n / 2; i++) {
        var a = arr[i], b = arr[n - 1 - i];
        /* alternar localía del fijo para que no sea siempre local */
        if (f % 2 === 1 && i === 0) { var t = a; a = b; b = t; }
        partidos.push({ local: a, visita: b });
      }
      fechas.push(partidos);
      rueda.push(rueda.shift());
    }
    var vuelta = fechas.map(function (ps) {
      return ps.map(function (p) { return { local: p.visita, visita: p.local }; });
    });
    return fechas.concat(vuelta);
  }

  function filaNueva(nombre) {
    return { equipo: nombre, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 };
  }

  /* crea la temporada: miClub + 9 rivales de la división */
  function crear(opts) {
    var equipos = [opts.miClub].concat(opts.rivales);
    return {
      division: opts.division,
      miClub: opts.miClub,
      semilla: (opts.semilla || 1) >>> 0,
      fixture: fixture(equipos),
      tabla: equipos.filter(function (e) { return e !== "LIBRE"; }).map(filaNueva),
      fecha: 0,          // próxima fecha a jugar (0-based)
      resultados: []     // [{fecha, partidos:[{local,visita,gl,gv}]}]
    };
  }

  function fila(t, nombre) {
    for (var i = 0; i < t.tabla.length; i++) if (t.tabla[i].equipo === nombre) return t.tabla[i];
    return null;
  }
  function cargarEnTabla(t, p) {
    if (p.local === "LIBRE" || p.visita === "LIBRE") return;
    var L = fila(t, p.local), V = fila(t, p.visita);
    if (!L || !V) return;
    L.pj++; V.pj++;
    L.gf += p.gl; L.gc += p.gv; V.gf += p.gv; V.gc += p.gl;
    if (p.gl > p.gv) { L.g++; L.pts += 3; V.p++; }
    else if (p.gl < p.gv) { V.g++; V.pts += 3; L.p++; }
    else { L.e++; V.e++; L.pts++; V.pts++; }
  }

  /* goles de un partido ajeno (~3 por partido, como la sim del clásico) */
  function golesAjenos(r) {
    var g = 0, p = r();
    if (p < 0.16) g = 0; else if (p < 0.48) g = 1; else if (p < 0.78) g = 2; else if (p < 0.93) g = 3; else g = 4;
    return g;
  }

  /* mi partido de la fecha actual (null si estoy LIBRE) */
  function miPartido(t) {
    var ps = t.fixture[t.fecha] || [];
    for (var i = 0; i < ps.length; i++) {
      if (ps[i].local === t.miClub || ps[i].visita === t.miClub) {
        if (ps[i].local === "LIBRE" || ps[i].visita === "LIBRE") return null;
        return ps[i];
      }
    }
    return null;
  }

  /* juega la fecha: MI resultado viene del partido real (golesMio/golesRival,
     null si fecha libre); el resto se simula determinista */
  function jugarFecha(t, golesMio, golesRival) {
    if (t.fecha >= t.fixture.length) return null;
    var r = rng(t.semilla * 1000 + t.fecha * 7 + 13);
    var mio = miPartido(t);
    var jugados = [];
    t.fixture[t.fecha].forEach(function (p) {
      if (p.local === "LIBRE" || p.visita === "LIBRE") return;
      var res;
      if (mio && p === mio) {
        var soyLocal = p.local === t.miClub;
        res = { local: p.local, visita: p.visita, gl: soyLocal ? golesMio : golesRival, gv: soyLocal ? golesRival : golesMio };
      } else {
        res = { local: p.local, visita: p.visita, gl: golesAjenos(r), gv: golesAjenos(r) };
      }
      cargarEnTabla(t, res);
      jugados.push(res);
    });
    t.resultados.push({ fecha: t.fecha, partidos: jugados });
    t.fecha++;
    return jugados;
  }

  /* tabla ordenada: PTS → DG → GF → nombre (estable y legible) */
  function posiciones(t) {
    return t.tabla.slice().sort(function (a, b) {
      return (b.pts - a.pts) || ((b.gf - b.gc) - (a.gf - a.gc)) || (b.gf - a.gf) || a.equipo.localeCompare(b.equipo);
    });
  }
  function miPosicion(t) {
    var pos = posiciones(t);
    for (var i = 0; i < pos.length; i++) if (pos[i].equipo === t.miClub) return i + 1;
    return pos.length;
  }
  function terminada(t) { return t.fecha >= t.fixture.length; }

  /* fin de temporada: el CAMPEÓN asciende (orden de logic/master.js DIVISIONES);
     nadie desciende. En EL MUNDIAL, salir campeón es LA GLORIA. */
  function veredicto(t, divisionesIds) {
    var pos = miPosicion(t);
    var campeon = pos === 1;
    var i = divisionesIds.indexOf(t.division);
    var ultima = i === divisionesIds.length - 1;
    return {
      posicion: pos,
      campeon: campeon,
      asciende: campeon && !ultima,
      proximaDivision: campeon && !ultima ? divisionesIds[i + 1] : t.division,
      gloria: campeon && ultima
    };
  }

  return {
    fixture: fixture, crear: crear, jugarFecha: jugarFecha, miPartido: miPartido,
    posiciones: posiciones, miPosicion: miPosicion, terminada: terminada,
    veredicto: veredicto, rng: rng
  };
});
