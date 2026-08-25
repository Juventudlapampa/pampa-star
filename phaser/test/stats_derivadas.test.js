/* ============================================================================
   PAMPA STAR · LAS DOS STATS QUE NINGÚN JUGADOR TIENE

   EL BUG: el esquema de stats son OCHO claves —pase, tiro, gambeta, velocidad,
   resistencia, fisico, aereo, caracter— y el juego leía otras dos que no
   existen en ningún registro:

     `quite`   lo pide el JUGADÓN, la función estrella de la V8, en elegirCierre
               y en el desempate de resolverMovida. Con el `|| 55` cobrándose el
               100% de las veces, los pesos de cierre eran [1, 1, 1.1, 0.9167]
               SIEMPRE, y el comentario que dice "quite alto → más firme y
               se_tira" describía algo que no pasaba. Un central del Mundial y
               uno de Primera B cerraban idéntico.
     `keeper`  lo piden las TRES pantallas donde el nivel de tu arquero decide:
               la definición ofensiva, la defensiva y TE REMATAN. Tu arquero era
               un maniquí de 55 en toda la carrera.

   Verificado sobre los 50 jugadores de data/roster_pampeano.json: 0 tienen
   `quite` y 0 tienen `keeper`.

   Ahora se DERIVAN de lo que el jugador sí tiene. Dos razones: no hay que tocar
   datos, y —la que importa— PampaMaster.aplicar() multiplica las claves que YA
   existen, así que al derivarlas escalan solas con la división.

   Corré:  node phaser/test/stats_derivadas.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var P = require(path.join(RAIZ, "phaser/logic/partido.js"));
var J = require(path.join(RAIZ, "phaser/logic/jugadon.js"));
var Ma = require(path.join(RAIZ, "phaser/logic/master.js"));
var roster = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/roster_pampeano.json"), "utf8"));

var JUG = [];
Object.keys(roster).forEach(function (k) {
  var v = roster[k];
  if (Array.isArray(v)) v.forEach(function (x) { if (x && x.stats_auto) JUG.push(x); });
});

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }
function prom(v) { return v.reduce(function (a, b) { return a + b; }, 0) / v.length; }

/* ---------- [1] EL ESQUEMA NO LAS TIENE, Y POR ESO HAY QUE DERIVARLAS ---------- */
(function () {
  assert(JUG.length >= 40, "tiene que haber roster para medir (hay " + JUG.length + ")");
  ["quite", "keeper"].forEach(function (k) {
    var con = JUG.filter(function (j) { return j.stats_auto[k] != null; }).length;
    assert(con === 0,
      "si '" + k + "' pasa a existir en el roster (" + con + " de " + JUG.length + "), revisá este test: " +
      "los helpers respetan el dato explícito, pero la calibración se hizo sobre la derivada");
  });
  console.log("[1] ni 'quite' ni 'keeper' existen en los " + JUG.length + " jugadores · por eso se derivan");
})();

/* ---------- [2] EL DATO EXPLÍCITO MANDA ---------- */
(function () {
  assert(P.quiteDe({ quite: 88, fisico: 50, velocidad: 50 }) === 88, "si algún día hay quite, manda el dato");
  assert(P.nivelArqueroDe({ keeper: 91, fisico: 50, caracter: 50 }) === 91, "idem keeper");
  /* y sin stats no puede reventar */
  assert(P.quiteDe(null) > 0 && P.nivelArqueroDe(null) > 0, "sin stats tiene que devolver algo usable");
  console.log("[2] el dato explícito manda · sin stats no revienta");
})();

/* ---------- [3] CALIBRADAS PARA NO MOVER LA DIFICULTAD ---------- */
(function () {
  /* la regla de esta tanda: agregar VARIEDAD no puede regalar dificultad.
     Si el promedio se corre del 55 que había, el cambio deja de ser de variedad
     y pasa a ser de balance sin que nadie lo haya decidido. */
  var qs = JUG.map(function (j) { return P.quiteDe(j.stats_auto); });
  var ks = JUG.map(function (j) { return P.nivelArqueroDe(j.stats_auto); });
  assert(Math.abs(prom(qs) - 55) <= 2.5,
    "el promedio de quite tiene que quedar cerca del 55 fijo de antes (dio " + prom(qs).toFixed(1) + ")");
  assert(Math.abs(prom(ks) - 55) <= 2.5,
    "el promedio del arquero también (dio " + prom(ks).toFixed(1) + "). Con pesos 0,7/0,4 daba 61,4 y eso solo " +
    "bajaba los goles en contra de 39,4% a 34,3%: cinco puntos de regalo por un cambio de variedad.");
  /* pero TIENE que haber rango, o no arreglamos nada */
  assert(Math.max.apply(null, qs) - Math.min.apply(null, qs) >= 10,
    "y tiene que haber rango de verdad en quite (dio " + (Math.max.apply(null, qs) - Math.min.apply(null, qs)).toFixed(1) + ")");
  assert(Math.max.apply(null, ks) - Math.min.apply(null, ks) >= 10, "y en el arquero");
  console.log("[3] quite prom " + prom(qs).toFixed(1) + " (rango " + Math.min.apply(null, qs).toFixed(0) + "-" + Math.max.apply(null, qs).toFixed(0) +
    ") · arquero prom " + prom(ks).toFixed(1) + " (rango " + Math.min.apply(null, ks).toFixed(0) + "-" + Math.max.apply(null, ks).toFixed(0) + ")");
})();

/* ---------- [4] LA ESCALERA DE DIVISIONES SE NOTA ---------- */
(function () {
  /* lo que estaba muerto: un rival del Mundial cerraba igual que uno de
     Primera B. Al derivar de fisico/velocidad, PampaMaster.aplicar los escala. */
  var previo = -1;
  var lineas = [];
  Ma.DIVISIONES.forEach(function (d) {
    var v = JUG.map(function (j) {
      return P.quiteDe({ fisico: (j.stats_auto.fisico || 50) * d.mult_stats, velocidad: (j.stats_auto.velocidad || 50) * d.mult_stats });
    });
    var p = prom(v);
    assert(p > previo, "cada división tiene que ser más dura que la anterior (" + d.id + " dio " + p.toFixed(1) + ")");
    previo = p;
    lineas.push(d.id + " " + Math.min.apply(null, v).toFixed(0) + "-" + Math.max.apply(null, v).toFixed(0));
  });
  console.log("[4] " + lineas.join(" · "));
})();

/* ---------- [5] Y EL JUGADÓN POR FIN VARÍA ---------- */
(function () {
  /* la prueba de que sirve: los pesos de cierre tienen que dejar de ser
     los mismos cuatro números para todo el mundo */
  function pesos(q) { return [1, 1, q / 50, q / 60]; }
  var flojo = pesos(P.quiteDe({ fisico: 45, velocidad: 45 }));
  var duro = pesos(P.quiteDe({ fisico: 69 * 1.3, velocidad: 67 * 1.3 }));
  assert(Math.abs(duro[2] - flojo[2]) > 0.3,
    "un defensor duro tiene que plantarse mucho más que uno flojo (firme " + flojo[2].toFixed(2) + " vs " + duro[2].toFixed(2) + ")");
  /* y el desempate: contra el más duro, tu gambeta tiene que sufrir */
  function ganadas(g, q) {
    var s = 99, gan = 0, N = 20000;
    var r = function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    var MOV = ["izq", "der", "canio", "sombrerito", "enganche"];
    for (var i = 0; i < N; i++) {
      var c = J.elegirCierre({ quite: q }, r);
      var res = J.resolverMovida(MOV[Math.floor(r() * MOV.length) % MOV.length], c, { gambeta: g }, { quite: q }, r);
      if (res.gana) gan++;
    }
    return gan / N;
  }
  var enB = ganadas(55, P.quiteDe({ fisico: 55.7 * 0.82, velocidad: 58.4 * 0.82 }));
  var enMundial = ganadas(55, P.quiteDe({ fisico: 55.7 * 1.3, velocidad: 58.4 * 1.3 }));
  assert(enB > enMundial + 0.02,
    "gambetear en Primera B tiene que ser más fácil que en el Mundial (" + (enB * 100).toFixed(1) + "% vs " + (enMundial * 100).toFixed(1) + "%)");
  console.log("[5] gambetas ganadas: Primera B " + (enB * 100).toFixed(1) + "% · Mundial " + (enMundial * 100).toFixed(1) + "% (antes: 40,2% en las cinco)");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
