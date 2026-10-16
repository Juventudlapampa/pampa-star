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
     · tu club es el que nombra el save: si falta tu fila, la tabla se rearma
       con vos adentro; si tu club no está en ningún lado de la temporada, la
       temporada vuelve a empezar. Nunca se adopta otro equipo de la tabla.

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

  /* ══════════════════════════════════════════════════════════════════════
     TEMPO-1 · EL TEMPO ES DE LA CARRERA.

     Antes se elegía ANTES DE CADA PARTIDO, en un menú de tres presets
     ("⏱ ¿QUÉ PARTIDO JUGAMOS?") que hablaba de "momentos" y del "clásico
     entero": 18 veces la misma pregunta por temporada, en la jerga del
     código, y guardada en pampa_tempo (localStorage), afuera de la carrera.
     Decisión de Rodri (13/oct): se elige UNA vez, al crear la carrera, con
     NORMAL ya marcado, y no se cambia después. Vive en el save (save.tempo)
     y viaja al partido en masterPartido.tempo.

     Los valores son las claves de balance.tempo.presets (relampago,
     intermedio, largo); en pantalla se dicen CORTO / NORMAL / LARGO
     (balance.tempo.opciones). Una carrera vieja sin el campo juega
     INTERMEDIO sin que se le escriba nada (el save sano sale igual que
     entró); un valor que no se conoce se repara a INTERMEDIO.
     ══════════════════════════════════════════════════════════════════════ */
  var TEMPOS = ["relampago", "intermedio", "largo"];
  var TEMPO_POR_DEFECTO = "intermedio";
  function tempoValido(t) { return TEMPOS.indexOf(t) >= 0; }
  /* el tempo de un save, de un masterPartido o de una clave suelta */
  function tempoDe(x) {
    var t = esObjeto(x) ? x.tempo : x;
    return tempoValido(t) ? t : TEMPO_POR_DEFECTO;
  }
  /* los minutos de partido que consume cada momento con ese tempo
     (logic/partido.js los lee de st.bal.tempo) */
  function minutosPorMomento(tempo, balTempo) {
    return balTempo.presets[tempoDe(tempo)];
  }
  /* el balance del partido con ese tempo puesto, en una copia: el menú viejo
     escribía minutos_por_momento en el balance compartido del registry, y el
     tempo de un partido quedaba puesto para el siguiente. Sin
     minutos_por_momento el reloj es el continuo de v4 y el tempo no aplica. */
  function balConTempo(bal, tempo) {
    var T = Object.assign({}, bal.tempo);
    if (T.minutos_por_momento > 0) T.minutos_por_momento = minutosPorMomento(tempo, bal.tempo);
    return Object.assign({}, bal, { tempo: T });
  }

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

  /* ---------- la temporada en curso, pieza por pieza ----------
     Arregla en el lugar lo que se puede y anota en `reparado` lo que tocó.
     Devuelve null si quedó jugable; { rehacer, motivo } si no tiene arreglo
     y conviene empezarla de nuevo (la carrera se conserva); { roto } si no
     hay forma. */
  function repararTemporada(t, club, division, opts, reparado) {
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
    var equiposFx = fixtureOk ? equiposDelFixture(t.fixture) : [];
    var enLaTabla = function (n) { return tablaOk && t.tabla.some(function (f) { return f.equipo === n; }); };
    var enLoJugado = function (n) {
      return equiposFx.indexOf(n) >= 0 || t.resultados.some(function (r) {
        return r.partidos.some(function (p) { return p.local === n || p.visita === n; });
      });
    };

    /* ── CUÁL ES TU CLUB (revisión del lote L03) ──
       Antes, si tu fila faltaba en la tabla, se adoptaba tabla[0]. Medido en
       node con una Primera A en la fecha 7 sin la fila de El Bagual de
       Winifreda: la carrera pasaba a ser de Sportivo General Acha (el club, el
       escudo, el clásico, el próximo partido) y master.create la guardaba así,
       en silencio.
       Ahora tu club es el que nombra el save (si no, la temporada), y vale el
       primero que aparece en la tabla; si no, el que aparece en el fixture o
       en los resultados. Si no aparece en NINGÚN lado, la temporada no es de
       tu club: vuelve a empezar y la carrera se conserva. Nunca se adopta otro
       equipo. Sin nada legible donde buscar, vale el que nombra el save. */
    var candidatos = [];
    [club, t.miClub].forEach(function (n) { if (esTexto(n) && candidatos.indexOf(n) < 0) candidatos.push(n); });
    var hayDondeBuscar = tablaOk || fixtureOk || t.resultados.length > 0;
    var tuyo = !hayDondeBuscar ? candidatos[0]
      : (candidatos.filter(enLaTabla)[0] || candidatos.filter(enLoJugado)[0] || null);
    if (!tuyo) return { rehacer: "tu club no estaba en la temporada guardada: vuelve a empezar", motivo: "la temporada guardada no es de tu club" };
    if (t.miClub !== tuyo) { t.miClub = tuyo; reparado.push("tu club en la temporada"); }
    /* un fixture donde no jugás no es el tuyo: se rearma como uno roto */
    if (fixtureOk && equiposFx.indexOf(tuyo) < 0) { fixtureOk = false; equiposFx = []; }
    /* una fila que falta, la tuya o la de un rival del fixture: la tabla se
       rearma desde los resultados. La de un rival también, porque
       cargarEnTabla saltea el partido si falta una de las dos filas: TU
       partido contra ese rival no sumaba. */
    var faltanFilas = tablaOk && [tuyo].concat(equiposFx).some(function (e) { return !enLaTabla(e); });

    /* el orden de los equipos: la tabla lo guarda (tu club primero y los
       rivales en el orden de la división), y si no está, la división */
    var rv = null;
    if (opts.rivalesDe) { try { rv = opts.rivalesDe(division); } catch (e) { rv = null; } }
    if (!Array.isArray(rv) || !rv.length) rv = null;
    var equipos = null;
    if (tablaOk) {
      equipos = t.tabla.map(function (f) { return f.equipo; });
      if (faltanFilas) {
        /* tu club primero y los que faltan al final (con solo tu fila
           perdida, eso ya es el orden de la división). Si los rivales son
           justo los de la división, va su orden, el de crear() */
        equipos = [tuyo].concat(equipos.filter(function (e) { return e !== tuyo; }));
        equiposFx.forEach(function (e) { if (equipos.indexOf(e) < 0) equipos.push(e); });
        var resto = equipos.slice(1);
        if (rv && rv.length === resto.length && rv.every(function (x) { return resto.indexOf(x) >= 0; })) equipos = [tuyo].concat(rv);
      }
    } else if (rv) {
      equipos = [tuyo].concat(rv.filter(function (x) { return x !== tuyo; }));
    }
    if (!equipos && fixtureOk) {
      equipos = equiposFx.slice();
      var im = equipos.indexOf(tuyo);
      if (im > 0) { equipos.splice(im, 1); equipos.unshift(tuyo); }
    }
    if (!equipos || equipos.length < 2) {
      return { rehacer: "la tabla y el fixture no se podían leer: la temporada vuelve a empezar", motivo: "la tabla y el fixture no se pueden leer" };
    }
    if (!fixtureOk) {
      var T = temporadaLogica();
      if (!T) return { roto: "el fixture no se puede leer" };
      t.fixture = T.fixture(equipos); reparado.push("fixture");
    }
    if (!tablaOk || faltanFilas) {
      t.tabla = tablaDesdeResultados(equipos, t.resultados);
      reparado.push(faltanFilas ? "filas que faltaban en la tabla (rearmada desde los resultados)" : "tabla (rearmada desde los resultados)");
    } else {
      t.tabla.forEach(function (f) {
        NUMEROS_FILA.forEach(function (k) {
          var v = entero(f[k]);
          if (v == null || v < (k === "pts" ? -999 : 0)) { f[k] = 0; reparado.push("tabla: " + f.equipo + " " + k); }
          else if (v !== f[k]) { f[k] = v; }
        });
      });
    }
    /* la red: tu club tiene que haber quedado en la tabla. Si no quedó, no
       se adivina quién sos */
    if (!t.tabla.some(function (f) { return f.equipo === t.miClub; })) {
      return { rehacer: "tu club no quedaba en la tabla: la temporada vuelve a empezar", motivo: "tu club no está en la tabla" };
    }
    /* la fecha, entre 0 y el largo del fixture */
    var f = entero(t.fecha);
    if (f == null || f < 0 || f > t.fixture.length) {
      t.fecha = Math.max(0, Math.min(t.fixture.length, t.resultados.length));
      reparado.push("fecha");
    } else if (f !== t.fecha) t.fecha = f;
    return null;
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
    if (s.tempo != null && !tempoValido(s.tempo)) { s.tempo = TEMPO_POR_DEFECTO; reparado.push("tempo"); }
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
      var rt = repararTemporada(t, club, division, opts, reparado);
      if (rt && rt.roto) return resultado(null, true, rt.roto);
      if (rt && !rehacer(division, rt.rehacer)) return resultado(null, true, rt.motivo);
    }
    if (s.club !== t.miClub) { s.club = t.miClub; reparado.push("nombre de tu club"); }

    if (!sePuedeJugar(s, ids)) return resultado(null, true, "la temporada guardada no se puede jugar");
    return resultado(s, false);
  }

  /* ══════════════════════════════════════════════════════════════════════
     REVISIÓN L07 · ¿DE DÓNDE SE LEE LA CARRERA?

     Con el guardado bloqueado (los datos del sitio bloqueados, el iframe de
     un medio con el almacenamiento cortado) el Master no se podía jugar,
     aunque el aviso decía "Podés jugar igual". Medido en node con master.js
     real: setItem y getItem tiran → elegir club → la entrevista →
     _crearCarrera: guardar() da false → scene.restart() → create() relee el
     almacenamiento, no hay nada y vuelve a "🏆 MODO MASTER", en un bucle.
     Lo mismo con PEGAR UN CÓDIGO. Y con el almacenamiento LLENO, getItem
     devuelve la carrera VIEJA: la fecha recién jugada se rebobinaba sola.

     Ahora un guardar() que falla deja el texto de la carrera en el registry
     ("masterSaveMemoria"), que dura lo que dura la página, y se lee ANTES
     que el almacenamiento: la copia de la sesión es la última. Un guardar()
     que anda la borra (el almacenamiento vuelve a tener lo último). Así
     "si cerrás esta página, la carrera se pierde" pasa a ser cierto, y
     mientras siga abierta, se juega.

     leer: una función que lee el almacenamiento (puede tirar: en un iframe
     con el almacenamiento bloqueado, LEER window.localStorage ya tira). */
  var CLAVE = "pampa_master_v1";
  function crudoDeLaSesion(memoria, leer) {
    if (typeof memoria === "string" && memoria) return memoria;
    try { return typeof leer === "function" ? leer() : null; } catch (e) { return null; }
  }

  return { VERSION: VERSION, CLAVE: CLAVE, sanear: sanear, sePuedeJugar: sePuedeJugar, tablaDesdeResultados: tablaDesdeResultados, crudoDeLaSesion: crudoDeLaSesion,
    TEMPOS: TEMPOS, TEMPO_POR_DEFECTO: TEMPO_POR_DEFECTO, tempoValido: tempoValido, tempoDe: tempoDe,
    minutosPorMomento: minutosPorMomento, balConTempo: balConTempo };
});
