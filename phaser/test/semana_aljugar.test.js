/* PAMPA STAR · "alJugar is not a function" (25/oct)
   En la consola de una sesión anterior quedó ese error, con la pila en el
   cierre del momento de la semana (master.js). Por la pantalla no se llega:
   todas las llamadas a vistaSemana le pasan la función que juega la fecha.
   Se llega abriendo la semana sin esa función, como se hizo desde la consola
   (vistaSemana con el rival solo, o una tarjeta sin la semana abierta): la
   semana se dibujaba igual y reventaba recién al cerrarla, lejos de la causa.
   Ahora la entrada lo dice en el momento, el momento vuelve a la semana de la
   que salió y su reloj se va con la vista.
   node phaser/test/semana_aljugar.test.js */
"use strict";
var fs = require("fs"), path = require("path");
var M = require("./_escena_de_mentira.js");
var RAIZ = path.join(__dirname, "..", "..");
var MASTER = fs.readFileSync(path.join(RAIZ, "phaser/scenes/master.js"), "utf8");

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }
function reiniciar(s) {
  s.children.list.slice().forEach(function (o) { if (o && o.destroy) o.destroy(); });
  s.events.emit("shutdown"); s.init(); s.create();
}
function lanza(fn) { try { fn(); return null; } catch (e) { return e; } }

/* una carrera recién creada (cada bloque con la suya: JUGAR cierra la semana) */
function carreraNueva() {
  var A = M.armar();
  var s0 = A.nueva(); s0.create();
  s0.tocar(480, 438);
  reiniciar(s0);
  s0._crearCarrera("primera_b", null);
  return A;
}
var RIVAL = "Espejo de Sal";

/* ---------- [1] todas las llamadas le pasan la función ---------- */
(function () {
  var llamadas = MASTER.match(/this\.vistaSemana\([^;]*?\);/g) || [];
  var sinFn = llamadas.filter(function (c) { return !/this\.vistaSemana\([^,]+, /.test(c); });
  assert(llamadas.length >= 3 && sinFn.length === 0, "cada this.vistaSemana(...) pasa el rival y la función (" + llamadas.length + " llamadas, sin función: " + sinFn.join(" | ") + ")");
  console.log("[1] las " + llamadas.length + " llamadas de vistaSemana pasan la función que juega la fecha");
})();

/* ---------- [2] lo de la consola: falla en la entrada, con un mensaje claro ---------- */
(function () {
  var s = carreraNueva().nueva(); s.create();
  var e = lanza(function () { s.vistaSemana(RIVAL); });
  assert(e && /falta la función que juega la fecha/.test(e.message), "abrir la semana sin la función avisa ahí mismo (" + (e && e.message) + ")");
  var e2 = lanza(function () { s.ponerCuatro("descansar", null); });
  assert(e2 && /la semana no está abierta/.test(e2.message), "una tarjeta sin la semana abierta avisa ahí mismo (" + (e2 && e2.message) + ")");
  assert(!lanza(function () { s.correrTimers(); }), "y después no queda nada colgado que reviente");
  console.log("[2] sin la función, el error sale en la entrada y no al cerrar la semana");
})();

/* ---------- [3] el camino de la pantalla: tarjeta, momento, JUGAR ---------- */
(function () {
  var s = carreraNueva().nueva(); s.create();
  var jugadas = 0;
  s.vistaSemana(RIVAL, function () { jugadas++; });
  assert(s.textos().some(function (t) { return /^LA SEMANA/.test(t); }), "la semana abierta");
  s.ponerCuatro("descansar", null);
  var e = lanza(function () { s.correrTimers(); });
  assert(!e, "el momento cierra sin error (" + (e && e.message) + ")");
  var jugar = s.children.list.find(function (o) { return o.type === "Text" && /JUGAR LA FECHA/.test(o.text); });
  assert(!!jugar, "de vuelta en la semana, con JUGAR LA FECHA");
  var e3 = lanza(function () { s.tocar(jugar.x, jugar.y); });
  assert(!e3 && jugadas === 1, "JUGAR juega la fecha una vez (" + jugadas + (e3 ? ", " + e3.message : "") + ")");
  console.log("[3] tarjeta, momento y JUGAR: la fecha se juega una vez");
})();

/* ---------- [4] el reloj del momento se va con la vista ---------- */
(function () {
  var s = carreraNueva().nueva(); s.create();
  s.vistaSemana(RIVAL, function () { });
  s.ponerCuatro("descansar", null);
  s.vaciarVista();                                   // otra vista, antes de que cierre el momento
  s.correrTimers();
  assert(!s.textos().some(function (t) { return /^LA SEMANA/.test(t); }), "el momento no vuelve a pintar la semana encima de otra vista");
  reiniciar(s);
  assert(s._semJugar === null && s._semRival === null, "al reiniciar la escena no queda la semana de la vuelta anterior");
  console.log("[4] el momento no pinta una semana que ya no está, y reiniciar la olvida");
})();

if (mal === 0) console.log("\n✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("\n✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
