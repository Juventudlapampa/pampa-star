/* ============================================================================
   PAMPA STAR · UN SAVE ROTO NO TRABA EL MASTER (tanda 1.0, L03 · save-saneado)

   EL BUG, medido en el navegador: master.create hacía JSON.parse y usaba el save tal
   cual. Sin `titulos` tiraba TypeError en la tabla (master.js:1404), sin
   `tabla` en temporada.js:131: la pantalla quedaba sin botones en cada
   entrada. Un JSON cortado caía en silencio a "elegí tu club" y la carrera
   nueva pisaba el texto sin respaldo. Y `v: 1` se escribía y no lo leía nadie.

   Lo que fija este test, con logic/save_master.sanear():
     [1] las variantes de la auditoría y más (texto cortado, [], {}, sin
         títulos, sin tabla, división inexistente, fecha 99, sin miClub,
         fixture roto, números rotos, temporada que no es objeto…): sanear
         NUNCA tira, y devuelve algo JUGABLE o "irrecuperable"
     [2] lo que se rearma, se rearma bien (la tabla desde los resultados es
         la misma, el fixture rearmado es el mismo). Y TU CLUB NO CAMBIA
         (revisión L03): si falta tu fila, antes se adoptaba tabla[0] y la
         carrera pasaba a ser de otro club; ahora la tabla se rearma con vos
         adentro, y si tu club no está en ningún lado la temporada vuelve a
         empezar con tu club
     [3] 400 saves mutados al azar: ninguno tira, ninguno sale a medias
     [4] master.js REAL: un save sin títulos muestra la tabla con sus botones;
         uno cortado muestra "Tu carrera guardada no se pudo leer. Quedó un
         respaldo." con EMPEZAR OTRA y VOLVER AL EDITOR, y el texto queda en
         pampa_master_v1_corrupta
     [5] cableado: index.html lo carga y sw.js lo precachea

   Corré:  node phaser/test/save_corrupto.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var M = require("./_escena_de_mentira.js");
var RAIZ = M.RAIZ;
var SM = require(path.join(RAIZ, "phaser/logic/save_master.js"));
var T = require(path.join(RAIZ, "phaser/logic/temporada.js"));
var Ma = require(path.join(RAIZ, "phaser/logic/master.js"));
var S = require(path.join(RAIZ, "phaser/logic/semana.js"));
var DIV = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/divisiones.json"), "utf8"));
var IDS = Ma.DIVISIONES.map(function (d) { return d.id; });

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }
function copia(o) { return JSON.parse(JSON.stringify(o)); }
var OPTS = {
  rivalesDe: function (d) { return (DIV.divisiones[d] || {}).rivales || null; },
  crearTemporada: function (d, club, n) { return T.crear({ division: d, miClub: club, rivales: DIV.divisiones[d].rivales, semilla: Ma.hashClub(club) * 31 + (n || 1) }); }
};

/* una carrera de verdad a mitad de temporada: Primera A, fecha 7, un título */
function carrera() {
  var club = "El Bagual de Winifreda";
  var t = T.crear({ division: "primera_a", miClub: club, rivales: DIV.divisiones.primera_a.rivales, semilla: 4242 });
  for (var f = 0; f < 7; f++) T.jugarFecha(t, f % 3, 1);
  return { v: 1, club: club, pueblo: "Winifreda", division: "primera_a", temporadaN: 2,
    titulos: [{ division: "primera_b", temporada: 1 }], origen: { stats: { tiro: 2 }, frases: ["x"], marcas: ["potrero"] },
    bolsaEventos: ["hermanito"], modFecha: null, racha: 1, mejoras: { tiro: 3, pase: 1 }, animo: 70, temporada: t };
}
/* JUGABLE = lo que hace el juego con el save no tira y da números */
function jugable(s) {
  try {
    if (!s || typeof s !== "object") return "no es objeto";
    var t = s.temporada;
    var pos = T.posiciones(t);
    if (!pos.some(function (f) { return f.equipo === t.miClub; })) return "tu club no está en la tabla";
    if (IDS.indexOf(s.division) < 0) return "división " + s.division;
    if (!(t.fecha >= 0 && t.fecha <= t.fixture.length)) return "fecha " + t.fecha;
    if (!Array.isArray(s.titulos)) return "titulos";
    var c = copia(t), n = 0;
    while (!T.terminada(c) && n++ < 40) { T.miPartido(c); T.jugarFecha(c, 1, 1); }
    var v = T.veredicto(c, IDS, {});
    if (IDS.indexOf(v.proximaDivision) < 0) return "veredicto";
    var sem = S.nuevaSemana(s, {});
    if (!isFinite(sem.energia)) return "semana";
    if (pos.some(function (f) { return !isFinite(f.pts) || !isFinite(f.gf - f.gc); })) return "NaN en la tabla";
    return true;
  } catch (e) { return "tiró: " + e.message; }
}
function correr(crudo, opts) {
  try { return SM.sanear(crudo, IDS, opts === undefined ? OPTS : opts); }
  catch (e) { return { tiro: e }; }
}
function chequear(nombre, crudo, espera, opts) {
  var r = correr(crudo, opts);
  assert(!r.tiro, nombre + ": sanear no puede tirar (" + (r.tiro && r.tiro.message) + ")");
  if (r.tiro) return r;
  if (espera === "nada") assert(!r.irrecuperable && r.save === null, nombre + ": sin carrera → elegir club");
  else if (espera === "roto") assert(r.irrecuperable && r.save === null && typeof r.motivo === "string", nombre + ": irrecuperable, con motivo");
  else {
    assert(!r.irrecuperable && r.save, nombre + ": tiene que salir jugable (" + r.motivo + ")");
    var j = r.save ? jugable(r.save) : "sin save";
    assert(j === true, nombre + ": el save saneado se juega (" + j + ")");
  }
  return r;
}

/* ---------- [1] LAS VARIANTES ---------- */
var resumen = [];
(function () {
  var base = carrera(), txt = JSON.stringify(base);
  chequear("texto cortado", txt.slice(0, Math.floor(txt.length * 0.6)), "roto");
  chequear("[]", "[]", "roto");
  chequear("{}", "{}", "roto");
  chequear("un texto suelto", "\"hola\"", "roto");
  chequear("un número", "42", "roto");
  chequear("nada guardado", null, "nada");
  chequear("vacío", "", "nada");
  chequear("null guardado", "null", "nada");

  var r = chequear("intacto", txt, "ok");
  assert(r.reparado && r.reparado.length === 0, "un save sano no se toca (reparó: " + (r.reparado || []).join(", ") + ")");
  assert(JSON.stringify(r.save) === txt, "y sale igual que entró");

  var s1 = copia(base); delete s1.titulos;
  r = chequear("sin titulos", JSON.stringify(s1), "ok");
  assert(r.save && Array.isArray(r.save.titulos) && r.save.titulos.length === 0 && r.reparado.indexOf("títulos") >= 0, "sin titulos: se completa con []");
  resumen.push("sin titulos");

  var s2 = copia(base); delete s2.temporada.tabla;
  r = chequear("sin tabla", JSON.stringify(s2), "ok");
  assert(r.save && JSON.stringify(r.save.temporada.tabla) === JSON.stringify(base.temporada.tabla),
    "sin tabla: se rearma desde los resultados, IGUAL a la que había");
  resumen.push("sin tabla");

  var s3 = copia(base); s3.division = "segunda_z"; s3.temporada.division = "segunda_z";
  r = chequear("división inexistente", JSON.stringify(s3), "ok");
  assert(r.save && r.save.division === "primera_b" && r.save.temporada.fecha === 0 && r.save.titulos.length === 1 && r.save.mejoras.tiro === 3,
    "división inexistente: la temporada vuelve a empezar y la carrera (títulos, mejoras) se conserva");
  chequear("división inexistente sin forma de rehacer", JSON.stringify(s3), "roto", {});
  var s3b = copia(base); s3b.division = "segunda_z";
  r = chequear("división del save rota, la de la temporada sana", JSON.stringify(s3b), "ok");
  assert(r.save && r.save.division === "primera_a" && r.save.temporada.fecha === 7, "se toma la de la temporada y no se pierde nada");
  resumen.push("división inexistente");

  var s4 = copia(base); s4.temporada.fecha = 99;
  r = chequear("fecha 99", JSON.stringify(s4), "ok");
  assert(r.save && r.save.temporada.fecha === 7, "fecha 99: vuelve a la de los resultados (7), no a cero");
  var s4b = copia(base); s4b.temporada.fecha = -3;
  chequear("fecha negativa", JSON.stringify(s4b), "ok");
  var s4c = copia(base); s4c.temporada.fecha = "siete";
  chequear("fecha de texto", JSON.stringify(s4c), "ok");
  resumen.push("fecha 99");

  var s5 = copia(base); delete s5.temporada.miClub;
  r = chequear("miClub ausente", JSON.stringify(s5), "ok");
  assert(r.save && r.save.temporada.miClub === base.club, "miClub ausente: es tu club");
  var s5b = copia(base); delete s5b.temporada.miClub; delete s5b.club;
  r = chequear("sin miClub ni club", JSON.stringify(s5b), "roto");
  var s5c = copia(base); s5c.temporada.miClub = "Otro Club Cualquiera";
  r = chequear("miClub que no está en la tabla", JSON.stringify(s5c), "ok");
  assert(r.save && r.save.temporada.miClub === base.club, "se vuelve al club del save, que sí está");
  resumen.push("miClub ausente");

  var s6 = copia(base); s6.temporada.fixture = [[{ local: 1 }]];
  r = chequear("fixture roto", JSON.stringify(s6), "ok");
  assert(r.save && JSON.stringify(r.save.temporada.fixture) === JSON.stringify(base.temporada.fixture), "el fixture se rearma igual (sale del orden de la tabla)");

  var s7 = copia(base); s7.temporada.tabla[3].pts = "muchos"; s7.temporada.tabla[0].gf = null;
  chequear("números rotos en la tabla", JSON.stringify(s7), "ok");

  var s8 = copia(base); s8.temporada = "temporada";
  r = chequear("temporada que no es objeto", JSON.stringify(s8), "ok");
  assert(r.save && r.save.temporada.fecha === 0 && r.save.division === "primera_a", "vuelve a empezar la temporada en su división");

  var s9 = copia(base); s9.semana = { elegidas: "tres" }; s9.mejoras = { tiro: "NaN", pase: 1 }; s9.titulos = [null, { division: "primera_b", temporada: 1 }];
  r = chequear("semana, mejoras y títulos con basura", JSON.stringify(s9), "ok");
  assert(r.save && r.save.semana === null && r.save.mejoras.tiro === undefined && r.save.mejoras.pase === 1 && r.save.titulos.length === 1,
    "lo que no tiene forma se limpia y lo bueno queda");

  var s10 = copia(base); delete s10.v; delete s10.racha; delete s10.bolsaEventos; s10.temporadaN = 0;
  r = chequear("save viejo sin campos nuevos", JSON.stringify(s10), "ok");
  assert(r.save && r.save.v === SM.VERSION && r.save.racha === 0 && Array.isArray(r.save.bolsaEventos) && r.save.temporadaN === 2,
    "v se lee y se completa; temporadaN sale de los títulos (2)");

  var s11 = copia(base); s11.temporada.tabla = [];
  r = chequear("tabla vacía", JSON.stringify(s11), "ok");
  var s12 = copia(base); delete s12.temporada.resultados; delete s12.temporada.tabla;
  r = chequear("sin tabla ni resultados", JSON.stringify(s12), "ok");
  assert(r.save && r.save.temporada.fecha <= r.save.temporada.fixture.length, "la fecha queda dentro del fixture");
  var s13 = copia(base); s13.temporada.tabla.splice(1, 1);   // falta un rival en la tabla
  r = chequear("un rival menos en la tabla", JSON.stringify(s13), "ok");
  /* revisión L03: antes quedaba con 9 filas y cargarEnTabla salteaba el
     partido contra ese rival (TU resultado no sumaba). Ahora se rearma desde
     los resultados, en el orden de la división: igual a la que había */
  assert(r.save && JSON.stringify(r.save.temporada.tabla) === JSON.stringify(base.temporada.tabla),
    "un rival menos: la tabla se rearma con las 10 filas, IGUAL a la que había");

  /* ── REVISIÓN DEL LOTE L03 · FALTA TU FILA ──
     Medido: sin la fila de El Bagual de Winifreda, sanear adoptaba tabla[0]
     y la carrera pasaba a ser de Sportivo General Acha (club, escudo, próximo
     partido), guardada en silencio. jugable() la daba por buena porque
     miClub estaba en la tabla, aunque fuera OTRO club. */
  var s15 = copia(base);
  s15.temporada.tabla = s15.temporada.tabla.filter(function (f) { return f.equipo !== base.club; });
  r = chequear("falta tu fila en la tabla", JSON.stringify(s15), "ok");
  assert(r.save && r.save.club === base.club && r.save.temporada.miClub === base.club,
    "SÍNTOMA: falta tu fila: tu club SIGUE siendo " + base.club + " (salió " + (r.save && r.save.club) + ")");
  assert(r.save && JSON.stringify(r.save.temporada.tabla) === JSON.stringify(base.temporada.tabla),
    "falta tu fila: la tabla se rearma desde los resultados, IGUAL a la que había");
  assert(r.save && r.save.temporada.fecha === 7 && r.reparado.indexOf("nombre de tu club") < 0,
    "falta tu fila: la fecha sigue (7) y el nombre de tu club no se toca (reparó: " + (r && r.reparado || []).join(", ") + ")");
  var mp = r.save && T.miPartido(r.save.temporada);
  assert(mp && (mp.local === base.club || mp.visita === base.club), "falta tu fila: el próximo partido es TUYO");
  var s16 = copia(s15); s16.temporada.fixture = [[{ local: 1 }]];
  r = chequear("falta tu fila y el fixture roto", JSON.stringify(s16), "ok");
  assert(r.save && r.save.club === base.club && JSON.stringify(r.save.temporada.fixture) === JSON.stringify(base.temporada.fixture),
    "falta tu fila y el fixture roto: tu club sigue y el fixture se rearma igual (con vos adentro)");
  /* tu club no está en NINGÚN lado de la temporada: no es tuya → vuelve a
     empezar con TU club y la carrera se conserva; sin forma de rehacer, rota */
  var s17 = copia(base); s17.club = "Los Teros de Winifreda"; s17.temporada.miClub = "Los Teros de Winifreda";
  r = chequear("tu club no está en la temporada", JSON.stringify(s17), "ok");
  assert(r.save && r.save.club === "Los Teros de Winifreda" && r.save.temporada.miClub === "Los Teros de Winifreda" &&
    r.save.temporada.fecha === 0 && r.save.titulos.length === 1 && r.save.mejoras.tiro === 3,
    "tu club no está en la temporada: vuelve a empezar con TU club, nunca con uno de la tabla");
  chequear("tu club no está en la temporada, sin forma de rehacer", JSON.stringify(s17), "roto", {});
  var s14 = copia(base); s14.resultadoPendiente = "x"; s14.eventoFecha = 3;
  r = chequear("marcas por fecha rotas", JSON.stringify(s14), "ok");
  assert(r.save && r.save.resultadoPendiente === undefined && r.save.eventoFecha === undefined, "las marcas sin forma se sacan");
  /* el objeto de entrada no se toca */
  var ent = copia(base); delete ent.titulos; var antes = JSON.stringify(ent);
  SM.sanear(ent, IDS, OPTS);
  assert(JSON.stringify(ent) === antes, "sanear no muta lo que recibe");
  console.log("[1] " + ok + " asserts sobre 25 variantes (" + resumen.join(", ") + ", y más): ninguna tira");
})();

/* ---------- [2] (dentro de [1]) + LA MUESTRA AL AZAR ---------- */
(function () {
  var base = carrera();
  var claves = function (o, pre, out) {
    Object.keys(o).forEach(function (k) {
      out.push(pre.concat([k]));
      if (o[k] && typeof o[k] === "object" && pre.length < 4) claves(o[k], pre.concat([k]), out);
    });
    return out;
  };
  var todas = claves(base, [], []);
  var basura = [undefined, null, 0, -1, 99, "x", "", [], {}, true, NaN, [[]], { a: 1 }];
  /* PRNG propio: mismo azar en cada corrida */
  var a = 12345; var rnd = function () { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; };
  var tiros = 0, jugables = 0, rotos = 0, aMedias = 0;
  for (var i = 0; i < 400; i++) {
    var s = copia(base);
    var n = 1 + Math.floor(rnd() * 3);
    for (var k = 0; k < n; k++) {
      var ruta = todas[Math.floor(rnd() * todas.length)];
      var o = s;
      for (var j = 0; j < ruta.length - 1 && o && typeof o === "object"; j++) o = o[ruta[j]];
      if (!o || typeof o !== "object") continue;
      var v = basura[Math.floor(rnd() * basura.length)];
      if (v === undefined) delete o[ruta[ruta.length - 1]]; else o[ruta[ruta.length - 1]] = v;
    }
    var txt = rnd() < 0.1 ? JSON.stringify(s).slice(0, Math.floor(rnd() * 400)) : JSON.stringify(s);
    var r = correr(txt);
    if (r.tiro) { tiros++; continue; }
    if (r.irrecuperable) { rotos++; continue; }
    if (jugable(r.save) === true) jugables++; else aMedias++;
  }
  assert(tiros === 0, "400 saves al azar: sanear no tira nunca (tiró " + tiros + ")");
  assert(aMedias === 0, "400 saves al azar: lo que sale es jugable o irrecuperable, nunca a medias (" + aMedias + ")");
  console.log("[2] 400 saves mutados al azar: " + jugables + " jugables, " + rotos + " irrecuperables, " + tiros + " excepciones, " + aMedias + " a medias");
})();

/* ---------- [3] master.js REAL CON SAVES ROTOS ---------- */
(function () {
  var A = M.armar();
  /* sin títulos: la tabla con sus botones */
  var s1 = A.carreraNueva(); delete s1.titulos;
  A.localStorage.setItem("pampa_master_v1", JSON.stringify(s1));
  var e1 = A.nueva(), err = null;
  try { e1.create(); } catch (e) { err = e; }
  assert(!err, "SÍNTOMA: con un save sin titulos, create() no tira (" + (err && err.message) + ")");
  var tx = e1.textos();
  assert(tx.indexOf("PRIMERA B · TEMPORADA 1") >= 0, "aparece la tabla");
  assert(tx.indexOf("▶ JUGAR LA FECHA") >= 0 && tx.indexOf("✎ EDITOR / PINTA") >= 0 && e1.tocables().length >= 3, "con sus botones");
  var guard = JSON.parse(A.localStorage.getItem("pampa_master_v1"));
  assert(Array.isArray(guard.titulos), "y el save queda guardado reparado");

  /* sin tabla */
  var s2 = A.carreraNueva(); delete s2.temporada.tabla;
  A.localStorage.setItem("pampa_master_v1", JSON.stringify(s2));
  var e2 = A.nueva(); err = null;
  try { e2.create(); } catch (e) { err = e; }
  assert(!err && e2.textos().indexOf("▶ JUGAR LA FECHA") >= 0, "SÍNTOMA: sin tabla, la tabla se rearma y hay botones (" + (err && err.message) + ")");

  /* cortado: el aviso, las dos salidas y el respaldo */
  var txt = JSON.stringify(A.carreraNueva());
  var cortado = txt.slice(0, 300);
  A.localStorage.setItem("pampa_master_v1", cortado);
  A.localStorage.removeItem("pampa_master_v1_corrupta");
  var e3 = A.nueva(); err = null;
  try { e3.create(); } catch (e) { err = e; }
  assert(!err, "con un texto cortado create() no tira");
  tx = e3.textos();
  assert(tx.indexOf("Tu carrera guardada no se pudo leer. Quedó un respaldo.") >= 0, "SÍNTOMA: se dice que no se pudo leer (antes caía en silencio a elegir club)");
  /* revisión L03: el título decía "✗ TU CARRERA GUARDADA NO SE PUDO LEER"
     y justo abajo la misma frase. Ningún texto puede repetir a otro */
  var plano = function (t) { return t.toLowerCase().replace(/[^a-záéíóúñü ]/g, "").trim(); };
  var titulo = tx.find(function (t) { return /^✗ /.test(t); });
  assert(!!titulo && tx.every(function (t) { return t === titulo || plano(t).indexOf(plano(titulo)) < 0; }),
    "el título (" + titulo + ") no repite la frase de abajo");
  assert(tx.indexOf("▶ EMPEZAR OTRA") >= 0 && tx.indexOf("✎ VOLVER AL EDITOR") >= 0 && e3.tocables().length === 2, "con EMPEZAR OTRA y VOLVER AL EDITOR");
  assert(A.localStorage.getItem("pampa_master_v1_corrupta") === cortado, "el texto quedó respaldado tal cual en pampa_master_v1_corrupta");
  assert(A.localStorage.getItem("pampa_master_v1") === cortado, "y el save no se tocó todavía");
  assert(e3._foco && e3._foco.i === 1, "el cursor arranca en VOLVER AL EDITOR");
  /* VOLVER no borra nada */
  e3.teclas("ENTER");
  assert(e3._irA.indexOf("editor") >= 0 && A.localStorage.getItem("pampa_master_v1") === cortado, "VOLVER AL EDITOR no toca nada");
  /* EMPEZAR OTRA: borra el roto (el respaldo queda) y vuelve a elegir club */
  var e4 = A.nueva(); e4.create();
  A.localStorage.setItem("pampa_master_v1_borrada", "{\"una\":\"carrera borrada antes\"}");
  /* el de arriba de los dos es EMPEZAR OTRA: se toca con el dedo */
  var bs = e4.tocables().filter(function (o) { return o.type === "Rectangle"; }).sort(function (a, b) { return a.y - b.y; });
  if (bs[0]) e4.tocar(bs[0].x, bs[0].y);
  assert(A.localStorage.getItem("pampa_master_v1") === null && e4._restarts === 1, "EMPEZAR OTRA borra el save roto y reinicia la escena");
  assert(A.localStorage.getItem("pampa_master_v1_corrupta") === cortado, "el respaldo del roto queda");
  assert(A.localStorage.getItem("pampa_master_v1_borrada") === "{\"una\":\"carrera borrada antes\"}", "y no pisa el respaldo de una carrera borrada a propósito");
  var e5 = A.nueva(); e5.create();
  assert(e5.textos().indexOf("🏆 MODO MASTER") >= 0, "después de EMPEZAR OTRA se elige club");
  console.log("[3] master real: sin titulos y sin tabla → tabla con botones · cortado → aviso, 2 salidas y respaldo");
})();

/* ---------- [4] CABLEADO ---------- */
(function () {
  var html = fs.readFileSync(path.join(RAIZ, "phaser/index.html"), "utf8");
  var sw = fs.readFileSync(path.join(RAIZ, "phaser/sw.js"), "utf8");
  assert(html.indexOf('<script src="logic/save_master.js"></script>') >= 0, "index.html carga logic/save_master.js");
  assert(sw.indexOf('"./logic/save_master.js"') >= 0, "sw.js lo precachea (sin red, el Master también sanea)");
  var MASTER = fs.readFileSync(path.join(RAIZ, "phaser/scenes/master.js"), "utf8");
  assert(/SM\.sanear\(crudo, this\.idsDeDivisiones\(\), this\.opcionesDeSaneo\(\)\)/.test(MASTER), "master.create sanea antes de usar");
  assert(!/this\.save = JSON\.parse\(r\)/.test(MASTER), "y ya no usa el JSON.parse pelado de antes");
  console.log("[4] index.html y sw.js cargan save_master.js · master.create sanea");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
