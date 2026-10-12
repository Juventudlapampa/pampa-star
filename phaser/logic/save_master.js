/* ============================================================================
   PAMPA STAR · phaser/logic/save_master.js — LA CARRERA GUARDADA, SANEADA
   (tanda 1.0, L03 · save-saneado)

   EL BUG, medido en el navegador: master.create hacía JSON.parse del save y lo usaba
   tal cual. Un save sin `titulos` tiraba TypeError en la tabla
   (this.save.titulos.length) y uno sin `tabla` en temporada.posiciones(): la
   pantalla quedaba sin botones, en cada entrada, para siempre. Un JSON
   cortado (el teléfono se quedó sin batería escribiendo) caía en silencio a
   "elegí tu club", y la carrera nueva pisaba el texto viejo sin respaldo. Y
   el `v: 1` se escribía y no lo leía nadie.

   sanear(crudo, idsDivisiones, opts) devuelve:
     { save, reparado: [qué se arregló], irrecuperable, motivo }
       · save null y no irrecuperable → no hay carrera (elegir club)
       · irrecuperable → no se puede jugar; el llamador respalda el texto
       · si no, `save` es JUGABLE: se probó con la lógica de la temporada

   Qué completa y qué valida:
     · los campos que se agregaron con las tandas (titulos, mejoras, racha…)
       se completan con lo de una carrera nueva;
     · la temporada: tabla (filas con números), fixture (fechas de partidos),
       resultados, fecha entre 0 y el largo del fixture, tu club adentro de
       la tabla, la división entre las que existen. Lo que se puede rearmar
       (la tabla desde los resultados, el fixture desde los equipos) se
       rearma; si la temporada entera no sirve, opts.crearTemporada la vuelve
       a empezar y la carrera (títulos, mejoras, origen) se conserva.

   Lógica PURA: corre en node (phaser/test/save_corrupto.test.js).
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaSaveMaster = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* la versión del esquema que escribe el juego hoy. El día que cambie la
     forma del save, acá se agrega la migración desde la anterior. */
  var VERSION = 1;
  var NUMEROS_FILA = ["pj", "g", "e", "p", "gf", "gc", "pts"];

  var _T = null;
  function temporadaLogica() {
    if (typeof window !== "undefined" && window.PampaTemporada) return window.PampaTemporada;
    if (_T !== null) return _T;
    try { _T = require("./temporada.js"); } catch (e) { _T = false; }
    return _T;
  }

  function esObjeto(x) { return !!x && typeof x === "object" && !Array.isArray(x); }
  function esTexto(x) { return typeof x === "string" && x.trim().length > 0; }
  function esNumero(x) { return typeof x === "number" && isFinite(x); }
  function entero(x) { return esNumero(x) ? Math.floor(x) : null; }

  /* ---------- las piezas de la temporada ---------- */
  function filaValida(f) { return esObjeto(f) && esTexto(f.equipo); }
  function partidoValido(p) { return esObjeto(p) && esTexto(p.local) && esTexto(p.visita); }
  function fixtureValido(fx) {
    return Array.isArray(fx) && fx.length > 0 && fx.every(function (fe) {
      return Array.isArray(fe) && fe.length > 0 && fe.every(partidoValido);
    });
  }
  function resultadoValido(r) {
    return esObjeto(r) && Array.isArray(r.partidos) && r.partidos.every(function (p) {
      return partidoValido(p) && esNumero(p.gl) && esNumero(p.gv);
    });
  }
  function equiposDelFixture(fx) {
    var out = [];
    fx.forEach(function (fe) { fe.forEach(function (p) {
      [p.local, p.visita].forEach(function (e) { if (e !== "LIBRE" && out.indexOf(e) < 0) out.push(e); });
    }); });
    return out;
  }
  /* la tabla desde los resultados: la misma cuenta que temporada.cargarEnTabla */
  function tablaDesdeResultados(equipos, resultados) {
    var tabla = equipos.map(function (e) { return { equipo: e, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 }; });
    var fila = function (n) { for (var i = 0; i < tabla.length; i++) if (tabla[i].equipo === n) return tabla[i]; return null; };
    resultados.forEach(function (r) { r.partidos.forEach(function (p) {
      var L = fila(p.local), V = fila(p.visita);
      if (!L || !V) return;
      L.pj++; V.pj++;
      L.gf += p.gl; L.gc += p.gv; V.gf += p.gv; V.gc += p.gl;
      if (p.gl > p.gv) { L.g++; L.pts += 3; V.p++; }
      else if (p.gl < p.gv) { V.g++; V.pts += 3; L.p++; }
      else { L.e++; V.e++; L.pts++; V.pts++; }
    }); });
    return tabla;
  }

  /* ---------- ¿se puede jugar? se prueba con la lógica de verdad ---------- */
  function sePuedeJugar(save, ids) {
    var T = temporadaLogica();
    if (!T) return true;                      // sin la lógica no hay cómo probar: vale lo validado
    try {
      var t = JSON.parse(JSON.stringify(save.temporada));
      var pos = T.posiciones(t);
      if (!pos.length || pos.every(function (f) { return f.equipo !== t.miClub; })) return false;
      T.miPartido(t);
      if (!T.terminada(t)) T.jugarFecha(t, 1, 0);
      T.veredicto(t, ids || [t.division], {});
      return (save.titulos.length | 0) >= 0;
    } catch (e) { return false; }
  }

  function sanear(crudo, idsDivisiones, opts) {
    opts = opts || {};
    var reparado = [];
    var resultado = function (save, irrecuperable, motivo) {
      return { save: save, reparado: reparado, irrecuperable: !!irrecuperable, motivo: motivo || null };
    };
    if (crudo == null || crudo === "") return resultado(null, false);
    var s = crudo;
    if (typeof crudo === "string") {
      try { s = JSON.parse(crudo); } catch (e) { return resultado(null, true, "el texto guardado está cortado"); }
    }
    if (s === null) return resultado(null, false);
    if (!esObjeto(s)) return resultado(null, true, "lo guardado no es una carrera");
    try { s = JSON.parse(JSON.stringify(s)); } catch (e) { return resultado(null, true, "lo guardado no se puede copiar"); }
    var ids = Array.isArray(idsDivisiones) && idsDivisiones.length ? idsDivisiones : null;
    var divOk = function (d) { return esTexto(d) && (!ids || ids.indexOf(d) >= 0); };

    /* --- la versión: se lee (antes se escribía y nadie la miraba) --- */
    if (!esNumero(s.v) || s.v < 1) { s.v = VERSION; reparado.push("versión"); }

    /* --- lo de la carrera, que no es la temporada --- */
    if (!Array.isArray(s.titulos)) { s.titulos = []; reparado.push("títulos"); }
    else {
      var tit = s.titulos.filter(function (x) { return esObjeto(x); });
      if (tit.length !== s.titulos.length) { s.titulos = tit; reparado.push("títulos"); }
    }
    var tn = entero(s.temporadaN);
    if (tn == null || tn < 1) {
      var maxT = 0;
      s.titulos.forEach(function (x) { if (esNumero(x.temporada)) maxT = Math.max(maxT, x.temporada); });
      s.temporadaN = maxT + 1; reparado.push("número de temporada");
    } else if (tn !== s.temporadaN) { s.temporadaN = tn; reparado.push("número de temporada"); }
    if (!Array.isArray(s.bolsaEventos) || !s.bolsaEventos.every(esTexto)) {
      s.bolsaEventos = Array.isArray(s.bolsaEventos) ? s.bolsaEventos.filter(esTexto) : [];
      reparado.push("eventos vistos");
    }
    if (s.mejoras != null) {
      if (!esObjeto(s.mejoras)) { s.mejoras = {}; reparado.push("mejoras"); }
      else Object.keys(s.mejoras).forEach(function (k) { if (!esNumero(s.mejoras[k])) { delete s.mejoras[k]; reparado.push("mejora " + k); } });
    }
    if (s.racha != null && entero(s.racha) == null) { s.racha = 0; reparado.push("racha"); }
    if (s.racha == null) s.racha = 0;
    if (s.modFecha != null && !esObjeto(s.modFecha)) { s.modFecha = null; reparado.push("evento de la fecha"); }
    if (s.modFecha === undefined) s.modFecha = null;
    if (s.origen != null && !esObjeto(s.origen)) { s.origen = null; reparado.push("origen"); }
    if (s.origen === undefined) s.origen = null;
    ["animo", "desgaste", "resaca", "energiaFinal", "nivelMax"].forEach(function (k) {
      if (s[k] != null && !esNumero(s[k])) { delete s[k]; reparado.push(k); }
    });
    if (s.molestia != null && typeof s.molestia !== "boolean") { s.molestia = !!s.molestia; reparado.push("molestia"); }
    if (s.pueblo != null && typeof s.pueblo !== "string") { s.pueblo = ""; reparado.push("localidad"); }
    /* la semana en curso: si no tiene forma, se arma de nuevo al entrar */
    if (s.semana != null && !(esObjeto(s.semana) && Array.isArray(s.semana.elegidas) && s.semana.elegidas.length === 3 && esNumero(s.semana.energia))) {
      s.semana = null; s.semanaResumen = null; reparado.push("semana en curso");
    }
    if (s.semanaResumen != null && !esObjeto(s.semanaResumen)) { s.semanaResumen = null; reparado.push("cómo llegás"); }
    /* las marcas por fecha (tanda 1.0): objeto o nada */
    ["semanaCerradaEnFecha", "eventoFecha", "enCancha", "resultadoPendiente"].forEach(function (k) {
      if (s[k] != null && !esObjeto(s[k])) { delete s[k]; reparado.push(k); }
    });

    /* --- la temporada --- */
    var t = esObjeto(s.temporada) ? s.temporada : null;
    var club = esTexto(s.club) ? s.club : (t && esTexto(t.miClub) ? t.miClub : null);
    var division = divOk(s.division) ? s.division : (t && divOk(t.division) ? t.division : null);
    if (division && division !== s.division) { s.division = division; reparado.push("división"); }
    if (!club) return resultado(null, true, "la carrera guardada no dice cuál es tu club");

    var rehacer = function (div, por) {
      if (!opts.crearTemporada) return false;
      var nueva = null;
      try { nueva = opts.crearTemporada(div, club, s.temporadaN); } catch (e) { nueva = null; }
      if (!esObjeto(nueva)) return false;
      s.division = div; s.temporada = nueva; t = nueva;
      s.semana = null; s.semanaResumen = null;
      ["semanaCerradaEnFecha", "eventoFecha", "enCancha", "resultadoPendiente"].forEach(function (k) { delete s[k]; });
      reparado.push(por);
      return true;
    };

    if (!division) {
      /* la división guardada no existe: la temporada vuelve a empezar en la
         que corresponde a tu marca de agua (o en la primera) */
      if (!ids) return resultado(null, true, "la división guardada no existe");
      var nv = entero(s.nivelMax);
      var div = ids[Math.max(0, Math.min(ids.length - 1, (nv || 1) - 1))];
      if (!rehacer(div, "la división no existía: la temporada vuelve a empezar")) return resultado(null, true, "la división guardada no existe");
    } else if (!t) {
      if (!rehacer(division, "la temporada no estaba: vuelve a empezar")) return resultado(null, true, "falta la temporada");
    } else {
      /* tu club en la temporada */
      if (!esTexto(t.miClub)) { t.miClub = club; reparado.push("tu club en la temporada"); }
      if (t.division !== division) { t.division = division; reparado.push("división de la temporada"); }
      if (!esNumero(t.semilla)) { t.semilla = 1; reparado.push("semilla"); }
      /* los resultados que se pueden leer */
      if (!Array.isArray(t.resultados)) { t.resultados = []; reparado.push("resultados"); }
      else {
        var rs = t.resultados.filter(resultadoValido);
        if (rs.length !== t.resultados.length) { t.resultados = rs; reparado.push("resultados"); }
      }
      var tablaOk = Array.isArray(t.tabla) && t.tabla.length > 1 && t.tabla.every(filaValida);
      var fixtureOk = fixtureValido(t.fixture);
      /* el orden de los equipos: la tabla lo guarda (tu club primero y los
         rivales en el orden de la división), y si no está, la división */
      var equipos = null;
      if (tablaOk) equipos = t.tabla.map(function (f) { return f.equipo; });
      else if (opts.rivalesDe) {
        var rv = null;
        try { rv = opts.rivalesDe(division); } catch (e) { rv = null; }
        if (Array.isArray(rv) && rv.length) equipos = [t.miClub].concat(rv.filter(function (x) { return x !== t.miClub; }));
      }
      if (!equipos && fixtureOk) {
        equipos = equiposDelFixture(t.fixture);
        var im = equipos.indexOf(t.miClub);
        if (im > 0) { equipos.splice(im, 1); equipos.unshift(t.miClub); }
      }
      if (!equipos || equipos.length < 2) {
        if (!rehacer(division, "la tabla y el fixture no se podían leer: la temporada vuelve a empezar")) return resultado(null, true, "la tabla y el fixture no se pueden leer");
      } else {
        if (!fixtureOk) {
          var T = temporadaLogica();
          if (!T) return resultado(null, true, "el fixture no se puede leer");
          t.fixture = T.fixture(equipos); reparado.push("fixture");
        }
        if (!tablaOk) {
          t.tabla = tablaDesdeResultados(equipos, t.resultados); reparado.push("tabla (rearmada desde los resultados)");
        } else {
          t.tabla.forEach(function (f) {
            NUMEROS_FILA.forEach(function (k) {
              var v = entero(f[k]);
              if (v == null || v < (k === "pts" ? -999 : 0)) { f[k] = 0; reparado.push("tabla: " + f.equipo + " " + k); }
              else if (v !== f[k]) { f[k] = v; }
            });
          });
        }
        /* tu club tiene que estar en la tabla */
        var enTabla = function (n) { return t.tabla.some(function (f) { return f.equipo === n; }); };
        if (!enTabla(t.miClub)) {
          if (enTabla(club)) t.miClub = club;
          else t.miClub = t.tabla[0].equipo;
          reparado.push("tu club en la tabla");
        }
        /* la fecha, entre 0 y el largo del fixture */
        var f = entero(t.fecha);
        if (f == null || f < 0 || f > t.fixture.length) {
          t.fecha = Math.max(0, Math.min(t.fixture.length, t.resultados.length));
          reparado.push("fecha");
        } else if (f !== t.fecha) t.fecha = f;
      }
    }
    if (s.club !== t.miClub) { s.club = t.miClub; reparado.push("nombre de tu club"); }

    if (!sePuedeJugar(s, ids)) return resultado(null, true, "la temporada guardada no se puede jugar");
    return resultado(s, false);
  }

  return { VERSION: VERSION, sanear: sanear, sePuedeJugar: sePuedeJugar, tablaDesdeResultados: tablaDesdeResultados };
});
