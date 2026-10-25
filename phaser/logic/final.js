/* ============================================================================
   PAMPA STAR · phaser/logic/final.js — EL FINAL DE LA CARRERA (lógica pura)

   Pedido de Rodri (25/oct): "ganar el Mundial es una línea chica y un botón
   que te lo hace jugar de nuevo, y los ascensos no tienen escena". Acá vive
   todo lo que se decide sin dibujar:

     · qué ceremonia toca al terminar una temporada (título y ascenso,
       descenso, la gloria del Mundial, el título defendido como leyenda);
     · qué cambia y qué se destraba en la división nueva, leído de
       data/megacosas.json y de las perillas de la poda (lo apagado no se
       anuncia);
     · el cierre de la temporada (el historial, los títulos, la división, el
       nivel, la temporada nueva), que antes vivía adentro del botón NUEVA
       TEMPORADA y no se podía probar;
     · SEGUIR COMO LEYENDA: temporadas sin fin en la división de
       balance.final.leyenda_division, sin descenso y con los títulos
       contados como defendidos;
     · la segunda entrevista de Nito, que cita lo que contestaste en la
       primera (save.origen.elecciones; los saves viejos se migran desde las
       frases que ya guardaban);
     · TU CARRERA: de dónde saliste, por dónde pasaste, goles y títulos, con
       lo que el save tiene anotado y sin inventar lo que no.

   Sin Phaser: corre en node (phaser/test/carrera_final.test.js).
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaFinal = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function divDe(divs, id) {
    for (var i = 0; i < divs.length; i++) if (divs[i].id === id) return divs[i];
    return null;
  }
  function nivelDe(divs, id) {
    for (var i = 0; i < divs.length; i++) if (divs[i].id === id) return i + 1;
    return 1;
  }
  function coma(x) { return String(x).replace(".", ","); }
  function poner(txt, datos) {
    return String(txt).replace(/\{([a-z_]+)\}/g, function (m, k) { return datos[k] != null ? datos[k] : m; });
  }

  /* ══ LA LEYENDA NO DESCIENDE ══
     Con save.leyenda la zona de descenso no existe (descenso_plazas 0): la
     tabla no marca ▼ y el veredicto no baja a nadie. */
  function cfgDeLaTemporada(save, cfgPartido) {
    if (save && save.leyenda) return Object.assign({}, cfgPartido, { descenso_plazas: 0 });
    return cfgPartido;
  }

  /* el veredicto de temporada.js, con la regla de la leyenda encima */
  function veredicto(T, save, ids, cfgPartido) {
    var v = T.veredicto(save.temporada, ids, cfgDeLaTemporada(save, cfgPartido));
    v.leyenda = !!save.leyenda;
    v.defendido = false;
    if (v.leyenda) {
      v.defendido = v.campeon;
      v.gloria = false;
      v.asciende = false;
      v.proximaDivision = save.temporada.division;
    }
    return v;
  }

  /* la ceremonia de fin de temporada (null: terminaste en el medio) */
  function ceremoniaDe(v) {
    if (v.gloria) return "gloria";
    if (v.defendido) return "defendido";
    if (v.asciende) return "titulo";
    if (v.desciende) return "descenso";
    return null;
  }

  /* 25/oct, pedido de Rodri: en una carrera no se repiten las frases de las
     ceremonias. Cada tipo dice su lista en orden: la n-ésima ceremonia de un
     tipo dice la n-ésima frase. Las anteriores las cuenta el historial (la
     fila de esta temporada entra recién al cerrarla, después de la ceremonia) */
  function vueltaDeCeremonia(save, tipo) {
    return (Array.isArray(save.historial) ? save.historial : []).filter(function (f) { return ceremoniaDe(f) === tipo; }).length;
  }

  /* ══ LO QUE CAMBIA EN LA DIVISIÓN NUEVA ══
     Los rivales y su arquero salen de la escalera (logic/master.js,
     DIVISIONES). Dicho en palabras y con un solo número (pedido de Rodri del
     25/oct: "+16% en todo; el arquero, de 40 a 50" era lenguaje de desarrollo). */
  function cambiosDeDivision(divs, deId, aId) {
    var a = divDe(divs, deId), b = divDe(divs, aId);
    if (!a || !b || a === b) return [];
    var pct = Math.round((b.mult_stats / a.mult_stats - 1) * 100);
    var sube = pct > 0;
    return [{
      tipo: "rivales", marca: sube ? "▲" : "▼",
      texto: "Los rivales juegan un " + Math.abs(pct) + "% " + (sube ? "mejor" : "peor") +
        " y los arqueros atajan " + (b.keeper > a.keeper ? "más" : b.keeper < a.keeper ? "menos" : "igual")
    }];
  }

  /* ══ LO QUE SE DESTRABA ══
     Entre el nivel de antes (sin incluir) y el de después (incluido). Con la
     poda (balance.flags) lo apagado no se anuncia: sin megatiros con nombre,
     el megatiro del nivel nuevo es el SÚPER TIRO que pega más fuerte. */
  function desbloqueosDe(nivelAntes, nivelDespues, mega, bal) {
    var F = (bal && bal.flags) || {}, SEC = (bal && bal.secuencias) || {};
    var out = [];
    var entra = function (n) { return n > nivelAntes && n <= nivelDespues; };
    var tiros = ((mega && mega.megatiros) || []).slice().sort(function (x, y) { return (x.nivel || 1) - (y.nivel || 1); });
    tiros.forEach(function (m, i) {
      if (!entra(m.nivel || 1)) return;
      if (F.megatiros_con_nombre === false) {
        var antes = i > 0 ? tiros[i - 1] : null;
        out.push({ tipo: "tiro", id: m.id, marca: "★",
          texto: "El súper tiro pega más fuerte: " + (antes ? "×" + coma(antes.mult) + " a " : "") + "×" + coma(m.mult) });
      } else {
        out.push({ tipo: "tiro", id: m.id, marca: "★", texto: m.n + ": " + (m.sub || "un megatiro nuevo") });
      }
    });
    if (F.megadefensas !== false) {
      ((mega && mega.megadefensas) || []).forEach(function (d) {
        if (entra(d.nivel || 1)) out.push({ tipo: "defensa", id: d.id, marca: "◆", texto: d.n + ": una megadefensa nueva" });
      });
    }
    if (F.v6_secuencias !== false) {
      if (SEC.megacorrida_nivel != null && entra(SEC.megacorrida_nivel)) out.push({ tipo: "secuencia", id: "megacorrida", marca: "»", texto: "MEGACORRIDA: dejás rivales atrás y rematás" });
      if (SEC.combinada_nivel != null && entra(SEC.combinada_nivel)) out.push({ tipo: "secuencia", id: "combinada", marca: "»", texto: "COMBINADA: pared y define el equipo" });
    }
    return out;
  }

  /* ══ LA FILA DE LA TEMPORADA PARA EL HISTORIAL ══ */
  function filaDeTemporada(T, save, v) {
    var t = save.temporada;
    var f = null;
    T.posiciones(t).forEach(function (x) { if (x.equipo === t.miClub) f = x; });
    f = f || { pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 };
    return {
      temporada: save.temporadaN | 0, division: t.division, puesto: v.posicion,
      pj: f.pj, g: f.g, e: f.e, p: f.p, gf: f.gf, gc: f.gc, pts: f.pts,
      /* null: la temporada empezó antes de que el juego contara tus goles */
      golesTuyos: typeof save.golesTuyosTemporada === "number" ? save.golesTuyosTemporada : null,
      campeon: !!v.campeon, asciende: !!v.asciende, desciende: !!v.desciende,
      gloria: !!v.gloria, defendido: !!v.defendido
    };
  }

  /* ══ CERRAR LA TEMPORADA ══
     Lo que hacía el botón NUEVA TEMPORADA, más el historial.
     opts.crear(division, temporadaN) arma la temporada nueva (la misma
     cuenta de siempre, en la escena). Marca de agua: el nivel sube con el
     ascenso y NO baja con el descenso. */
  function cerrarTemporada(T, save, v, divs, opts) {
    save.historial = (Array.isArray(save.historial) ? save.historial : []).concat([filaDeTemporada(T, save, v)]);
    if (v.campeon) save.titulos.push({ division: save.temporada.division, temporada: save.temporadaN });
    if (v.defendido && save.leyenda) save.leyenda.defendidos = (save.leyenda.defendidos | 0) + 1;
    save.division = v.proximaDivision;
    save.nivelMax = Math.max(save.nivelMax | 0, nivelDe(divs, save.division));
    save.temporadaN++;
    save.temporada = opts.crear(save.division, save.temporadaN);
    save.golesTuyosTemporada = 0;
    delete save.ceremoniaVista;
    return save;
  }

  /* ══ SEGUIR COMO LEYENDA ══
     Después de la gloria. La temporada siguiente se juega en
     cfgFinal.leyenda_division y desde ahí no se desciende nunca. */
  function seguirComoLeyenda(T, save, v, divs, opts, cfgFinal) {
    var div = (cfgFinal && cfgFinal.leyenda_division) || divs[divs.length - 1].id;
    if (!divDe(divs, div)) div = divs[divs.length - 1].id;
    save.final_visto = true;
    cerrarTemporada(T, save, Object.assign({}, v, { proximaDivision: div }), divs, opts);
    save.leyenda = { desde: save.temporadaN, defendidos: 0 };
    return save;
  }

  /* ══ LAS RESPUESTAS DE LA PRIMERA ENTREVISTA ══
     La carrera nueva guarda los índices elegidos (origen.elecciones). Una
     vieja tiene origen.frases, una por pregunta y en orden, y cada frase es
     única en su pregunta: con eso se recupera qué contestaste. Devuelve
     true si escribió algo. */
  function eleccionesValidas(e, preguntas) {
    return Array.isArray(e) && e.length === preguntas.length && e.every(function (x, i) {
      return typeof x === "number" && x >= 0 && x < preguntas[i].opciones.length && Math.floor(x) === x;
    });
  }
  function migrarElecciones(save, origenData) {
    var o = save && save.origen;
    if (!o || !Array.isArray(origenData) || !origenData.length) return false;
    if (eleccionesValidas(o.elecciones, origenData)) return false;
    var frases = Array.isArray(o.frases) ? o.frases : [];
    var elegidas = origenData.map(function (p, i) {
      for (var k = 0; k < p.opciones.length; k++) if (p.opciones[k].frase && p.opciones[k].frase === frases[i]) return k;
      return -1;
    });
    if (elegidas.some(function (x) { return x < 0; })) {
      if (o.elecciones === undefined) return false;
      delete o.elecciones;
      return true;
    }
    o.elecciones = elegidas;
    return true;
  }

  function titulosTexto(n) { return n === 1 ? "1 título" : n + " títulos"; }
  /* los títulos de la carrera contando el de esta temporada, si se ganó y
     todavía no se cerró (la gloria se festeja antes de anotarse) */
  function titulosConEsta(save, v) {
    var n = (save.titulos || []).length;
    var anotado = (save.titulos || []).some(function (x) { return x.temporada === save.temporadaN; });
    return n + (v && v.campeon && !anotado ? 1 : 0);
  }

  /* ══ LA SEGUNDA ENTREVISTA ══
     Nito cita, palabra por palabra, la respuesta DICHA de la primera
     (data/entrevista.json, respuestas) y vos contestás desde hoy
     (data/final.json, cierre.preguntas[id].vos, una por respuesta).
     Sin respuestas guardadas no se inventan: Nito dice que la primera no
     quedó grabada. Devuelve [{quien, texto, ref}]; ref es la pregunta de la
     primera entrevista de la que se habla (la libretita la marca). */
  function segundaEntrevista(save, origenData, entrevista, cierre, v) {
    var datos = {
      pueblo: save.pueblo || "tu localidad", club: save.club,
      titulos: titulosTexto(titulosConEsta(save, v))
    };
    var out = [{ quien: "nito", texto: poner(cierre.abre, datos) }];
    var el = save.origen && save.origen.elecciones;
    var ok = Array.isArray(origenData) && eleccionesValidas(el, origenData) && entrevista && entrevista.preguntas;
    if (ok) {
      origenData.forEach(function (p, i) {
        var qe = entrevista.preguntas[p.id], qc = cierre.preguntas[p.id];
        if (!qe || !qc || !qe.respuestas || !qe.respuestas[el[i]]) return;
        out.push({ quien: "nito", ref: i, texto: poner(qc.nito, Object.assign({ respuesta: qe.respuestas[el[i]] }, datos)) });
        if (qc.vos && qc.vos[el[i]]) out.push({ quien: "vos", ref: i, texto: poner(qc.vos[el[i]], datos) });
      });
    } else {
      out.push({ quien: "nito", texto: poner(cierre.sin_grabacion.nito, datos) });
      out.push({ quien: "vos", texto: poner(cierre.sin_grabacion.vos, datos) });
    }
    out.push({ quien: "nito", texto: poner(cierre.cierra, datos) });
    return out;
  }

  /* ══ TU CARRERA ══
     Las filas salen del historial. Una carrera de antes del historial no
     tiene anotadas sus temporadas viejas: de esas solo se saben los títulos
     (save.titulos), y se dicen así. La temporada en curso (la del Mundial
     ganado, que todavía no se cerró) entra con su tabla de hoy. */
  function tuCarrera(T, save, divs, v) {
    var hist = Array.isArray(save.historial) ? save.historial.slice() : [];
    var anotadas = {};
    hist.forEach(function (f) { anotadas[f.temporada] = true; });
    var filas = hist.slice();
    if (save.temporada && T.terminada(save.temporada) && !anotadas[save.temporadaN] && v) {
      filas.push(filaDeTemporada(T, save, v));
      anotadas[save.temporadaN] = true;
    }
    /* los títulos de temporadas sin fila: se sabe la división y nada más */
    var sinFila = [];
    (save.titulos || []).forEach(function (x) {
      if (!anotadas[x.temporada]) sinFila.push({ temporada: x.temporada, division: x.division, soloTitulo: true });
    });
    filas = filas.concat(sinFila).sort(function (a, b) { return a.temporada - b.temporada; });
    var golesEquipo = 0, golesTuyos = 0, golesSinAnotar = false;
    filas.forEach(function (f) {
      if (f.soloTitulo) return;
      golesEquipo += f.gf | 0;
      if (typeof f.golesTuyos === "number") golesTuyos += f.golesTuyos; else golesSinAnotar = true;
    });
    var temporadas = save.temporadaN | 0;
    var conDatos = filas.filter(function (f) { return !f.soloTitulo; }).length;
    return {
      pueblo: save.pueblo || null, club: save.club,
      deDonde: (save.origen && save.origen.frases && save.origen.frases[0]) || null,
      filas: filas.map(function (f) {
        var d = divDe(divs, f.division);
        return Object.assign({}, f, { divisionN: d ? d.n : f.division });
      }),
      titulos: titulosConEsta(save, v),
      temporadas: temporadas,
      temporadasSinAnotar: Math.max(0, temporadas - conDatos),
      golesEquipo: golesEquipo,
      golesTuyos: golesTuyos,
      golesSinAnotar: golesSinAnotar
    };
  }

  return {
    cfgDeLaTemporada: cfgDeLaTemporada, veredicto: veredicto, ceremoniaDe: ceremoniaDe, vueltaDeCeremonia: vueltaDeCeremonia,
    cambiosDeDivision: cambiosDeDivision, desbloqueosDe: desbloqueosDe,
    filaDeTemporada: filaDeTemporada, cerrarTemporada: cerrarTemporada, seguirComoLeyenda: seguirComoLeyenda,
    migrarElecciones: migrarElecciones, segundaEntrevista: segundaEntrevista, tuCarrera: tuCarrera,
    poner: poner, titulosTexto: titulosTexto, titulosConEsta: titulosConEsta
  };
});
