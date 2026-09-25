/* ============================================================================
   PAMPA STAR · LOS CLUBES DEJARON DE SER LOS REALES, Y LAS PARTIDAS SIGUEN

   Sección 11 (sept 2026): los nueve clubes de la Primera B eran los reales de
   una liga pampeana (con sus colores), y algunos de las otras divisiones
   también coincidían con clubes o ligas reales. Se renombraron a ficticios, en
   el MISMO ORDEN. Y tu club del Master dejó de llamarse "Club " + localidad.

   Las partidas guardadas tienen los nombres viejos escritos. Este test prueba
   que se migran sin perder nada — y sin que el código del juego tenga
   escritos los nombres reales: el Master traduce por POSICIÓN y el clásico
   por HASH del nombre viejo.

   Acá, en test/, sí están los nombres viejos: es lo que se prueba, y esta
   carpeta no es producto (seccion11.test.js no la barre).

   Corré:  node phaser/test/migracion_nombres.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var RAIZ = path.join(__dirname, "..", "..");
var T = require(path.join(RAIZ, "phaser/logic/temporada.js"));
var M = require(path.join(RAIZ, "phaser/logic/master.js"));
var DIV = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/divisiones.json"), "utf8")).divisiones;
var ROSTER = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/roster_pampeano.json"), "utf8"));
var CLASICO = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8");
var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

var VIEJOS_B = ["Deportivo Winifreda", "El Pampero", "Centro Oeste", "Atlético Carro Quemado",
  "Deportivo Luan Toro", "Cochico FC", "Deportivo Telén", "Atlético Caleufú", "Cultural Argentino"];

function todosLosNombres(t) {
  var s = [];
  t.tabla.forEach(function (f) { s.push(f.equipo); });
  t.fixture.forEach(function (fe) { fe.forEach(function (p) { s.push(p.local, p.visita); }); });
  t.resultados.forEach(function (r) { r.partidos.forEach(function (p) { s.push(p.local, p.visita); }); });
  return s;
}

/* ---------- [1] EL MASTER: los rivales, por posición ---------- */
(function () {
  var nuevos = DIV.primera_b.rivales;
  assert(nuevos.length === VIEJOS_B.length, "la Primera B sigue teniendo 9 rivales");
  VIEJOS_B.forEach(function (v) { assert(nuevos.indexOf(v) < 0, "la Primera B ya no tiene a " + v); });
  /* una temporada VIEJA, a mitad de camino */
  var t = T.crear({ division: "primera_b", miClub: "El Bagual de Winifreda", rivales: VIEJOS_B, semilla: 77 });
  for (var f = 0; f < 6; f++) T.jugarFecha(t, f % 3, (f + 1) % 2);
  var ptsAntes = t.tabla.map(function (x) { return x.pts; }), posAntes = T.miPosicion(t), fechaAntes = t.fecha;
  var cambio = T.renombrarPorPosicion(t, nuevos);
  assert(cambio === true, "la temporada vieja se migra");
  var nombres = todosLosNombres(t);
  VIEJOS_B.forEach(function (v) { assert(nombres.indexOf(v) < 0, "no queda " + v + " en tabla, fixture ni resultados"); });
  assert(t.tabla.map(function (x) { return x.pts; }).join() === ptsAntes.join(), "los puntos de cada fila siguen iguales");
  assert(T.miPosicion(t) === posAntes && t.fecha === fechaAntes, "tu posición y la fecha siguen iguales");
  var mp = T.miPartido(t);
  var rivalMp = mp ? (mp.local === t.miClub ? mp.visita : mp.local) : null;
  assert(mp === null || nuevos.indexOf(rivalMp) >= 0, "tu próximo partido es contra un rival NUEVO (o fecha libre): " + JSON.stringify(mp));
  T.jugarFecha(t, 2, 1);
  assert(t.fecha === fechaAntes + 1, "y se puede seguir jugando");
  assert(T.renombrarPorPosicion(t, nuevos) === false, "migrar dos veces no cambia nada");
  console.log("[1] Master: temporada vieja migrada por posición, sin perder puntos ni fecha");
})();

/* ---------- [2] el orden cambió: NO se toca ---------- */
(function () {
  var t = T.crear({ division: "primera_b", miClub: "X", rivales: VIEJOS_B, semilla: 3 });
  var otroOrden = VIEJOS_B.slice(1).concat([VIEJOS_B[0]]);
  var antes = JSON.stringify(t);
  assert(T.renombrarPorPosicion(t, otroOrden) === false && JSON.stringify(t) === antes, "si la lista es la misma en otro orden, no se traduce nada");
  var t2 = T.crear({ division: "primera_b", miClub: "X", rivales: VIEJOS_B.slice(0, 8), semilla: 3 });
  assert(T.renombrarPorPosicion(t2, DIV.primera_b.rivales) === false, "si cambia la cantidad de rivales, no se traduce nada");
  console.log("[2] con otro orden u otra cantidad, la migración no adivina");
})();

/* ---------- [3] tu club ya no se llama "Club " + localidad ---------- */
(function () {
  Object.keys(ROSTER.clubes_por_pueblo).forEach(function (p) {
    var n = M.nombreDeTuClub(p, ROSTER);
    assert(n && n.indexOf("Club ") !== 0, "tu club de " + p + " tiene nombre propio: " + n);
  });
  assert(M.nombreDeTuClub("Localidad Sin Apodo", ROSTER).indexOf("Club ") !== 0, "sin apodo, igual no es 'Club ' + localidad");
  assert(M.esNombreViejoDeTuClub("Club Winifreda", "Winifreda") && !M.esNombreViejoDeTuClub("El Bagual de Winifreda", "Winifreda"), "reconoce el nombre viejo y solo el viejo");
  /* la migración del save: tu club y los rivales */
  var t = T.crear({ division: "primera_b", miClub: "Club Winifreda", rivales: VIEJOS_B, semilla: 9 });
  T.jugarFecha(t, 1, 0);
  var nuevo = M.nombreDeTuClub("Winifreda", ROSTER), mapa = {}; mapa["Club Winifreda"] = nuevo;
  T.renombrarEquipos(t, mapa);
  assert(t.miClub === nuevo && t.tabla[0].equipo === nuevo, "tu club se renombra en la temporada");
  assert(T.renombrarPorPosicion(t, DIV.primera_b.rivales) === true, "y después los rivales, por posición");
  assert(todosLosNombres(t).indexOf("Club Winifreda") < 0, "no queda 'Club Winifreda' en ningún lado");
  var master = fs.readFileSync(path.join(RAIZ, "phaser/scenes/master.js"), "utf8");
  var i = master.indexOf("LA PARTIDA GUARDADA SE PONE AL DÍA"), j = master.indexOf("masterResultado", i);
  assert(i > 0 && j > i, "la migración del Master corre al leer la partida y ANTES de cargar un resultado");
  console.log("[3] tu club: nombre propio, y la partida vieja se pone al día");
})();

/* ---------- [4] el clásico: por hash, sin nombres escritos ---------- */
(function () {
  var m = CLASICO.match(/const CLUBES = \[([\s\S]*?)\];/);
  assert(m, "index.html tiene CLUBES");
  var CLUBES = vm.runInNewContext("[" + m[1] + "]");
  assert(CLUBES.length === 9, "el clásico sigue con 9 clubes");
  VIEJOS_B.forEach(function (v) { assert(!CLUBES.some(function (c) { return c.n === v; }), "el clásico ya no tiene a " + v); });
  CLUBES.forEach(function (c, k) { assert(c.n === DIV.primera_b.rivales[k], "el club " + k + " del clásico es el mismo que el rival " + k + " del Master (" + c.n + ")"); });
  /* las funciones de migración, sacadas del archivo y corridas acá */
  var fns = ["hashNombre", "indiceViejo", "migrarClub"].map(function (n) {
    var i = CLASICO.indexOf("function " + n + "(");
    assert(i >= 0, "index.html define " + n);
    var d = 0, k = CLASICO.indexOf("{", i);
    for (var z = k; z < CLASICO.length; z++) { if (CLASICO[z] === "{") d++; else if (CLASICO[z] === "}") { d--; if (!d) return CLASICO.slice(i, z + 1); } }
    return "";
  }).join("\n");
  var ctx = { CLUBES: CLUBES };
  vm.runInNewContext(fns + "\nthis.indiceViejo = indiceViejo; this.migrarClub = migrarClub;", ctx);
  VIEJOS_B.forEach(function (v, k) {
    assert(ctx.indiceViejo(v) === k, v + " se reconoce como el club " + k);
    var o = { club: v };
    assert(ctx.migrarClub(o) === true && o.club === CLUBES[k].n, "una carrera de " + v + " pasa a " + CLUBES[k].n);
  });
  var yaNueva = { club: CLUBES[3].n };
  assert(ctx.migrarClub(yaNueva) === false && yaNueva.club === CLUBES[3].n, "una carrera ya nueva no se toca");
  assert(ctx.migrarClub({ club: "Cualquiera" }) === false, "un nombre desconocido no se toca");
  assert(/migrarClub\(o\)/.test(CLASICO.slice(CLASICO.indexOf("function loadCareer"), CLASICO.indexOf("function loadCareer") + 400)), "loadCareer migra al leer");
  console.log("[4] clásico: cada nombre viejo encuentra su club nuevo por hash");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
