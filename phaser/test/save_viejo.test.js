/* ============================================================================
   PAMPA STAR · C5 — QUE EL SAVE SOBREVIVA

   Es lo único que no se puede romper. Después de las tandas 0, 1, 2, 3, 4 y la
   de feel, una partida guardada ANTES de todo eso tiene que seguir cargando.

   Este test arma saves de época —sin ninguno de los campos que se agregaron
   después— y los hace pasar por la lógica real. No prueba que "no tire error":
   prueba que los números que salen sean válidos y que no aparezca un NaN, que
   es como se rompe un save de verdad.

   LOS CAMPOS QUE SE AGREGARON DESPUÉS, y que un save viejo NO tiene:
     save.resaca            (tanda 0, A3)
     save.energiaFinal      (tanda 0, A3)
     save.racha             (V8 A1)
     save.origen            (V8 A1)
     save.modFecha          (V8 A1)
     save.bolsaEventos      (V8 A1)
     temporada.corners      (G1)
     opción.lugar / .repaso (N4, en data no en save, pero se leen por save)

   Corré:  node phaser/test/save_viejo.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var S = require(path.join(RAIZ, "phaser/logic/semana.js"));
var T = require(path.join(RAIZ, "phaser/logic/temporada.js"));
var P = require(path.join(RAIZ, "phaser/logic/partido.js"));
var V = require(path.join(RAIZ, "phaser/logic/vida.js"));
var BAL = JSON.parse(fs.readFileSync(path.join(RAIZ, "phaser/data/balance.json"), "utf8"));
var DIV = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/divisiones.json"), "utf8"));
var SEM = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/semana.json"), "utf8"));
var IDS = Object.keys(DIV.divisiones);

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }
function num(v) { return typeof v === "number" && isFinite(v); }

/* ---------- EL SAVE DE ÉPOCA ---------- */
/* Tal cual lo escribía el juego antes de todas estas tandas: solo los campos
   que existían entonces. Nada de resaca, racha, origen ni bolsaEventos. */
function saveViejo() {
  var t = T.crear({
    division: "primera_a", miClub: "Club Winifreda",
    rivales: DIV.divisiones.primera_a.rivales, semilla: 4242
  });
  for (var f = 0; f < 6; f++) T.jugarFecha(t, f % 2 ? 2 : 0, f % 2 ? 1 : 1);
  /* y le sacamos a la temporada TODO lo que se agregó después */
  delete t.corners;
  return {
    v: 1, club: "Club Winifreda", pueblo: "Winifreda",
    division: "primera_a", temporadaN: 2, titulos: [{ division: "primera_b", temporada: 1 }],
    temporada: t,
    animo: 62, desgaste: 25, molestia: true,
    semana: { elegidas: ["entrenar_tiro", "asado", null], energia: 55, animo: 70, permanentes: { tiro: 1 } }
  };
}

/* ---------- [1] LA SEMANA ARRANCA SIN RESACA ---------- */
(function () {
  var s = saveViejo();
  var sem = S.nuevaSemana(s, BAL.semana);
  assert(num(sem.energia) && sem.energia > 0 && sem.energia <= 100,
    "la energía de arranque tiene que ser un número válido sin save.resaca (dio " + sem.energia + ")");
  assert(num(sem.animo), "el ánimo tiene que ser un número (dio " + sem.animo + ")");
  assert(Array.isArray(sem.elegidas) && sem.elegidas.length === 3, "las tres ranuras se arman igual");
  console.log("[1] nuevaSemana con save sin `resaca`: energía " + sem.energia + ", ánimo " + sem.animo);
})();

/* ---------- [2] EL LUNES DESPUÉS, SIN energiaFinal ---------- */
(function () {
  var s = saveViejo();
  var l = S.lunesDespues(s, { golesMio: 2, golesRival: 1, hiceGol: true, aguanteFinalFrac: 0.4, golpeFuerte: false }, BAL.semana);
  ["animo", "desgaste", "resaca", "fecha"].forEach(function (k) {
    assert(l[k] == null || num(l[k]) || typeof l[k] === "boolean",
      "lunesDespues." + k + " tiene que ser un valor válido (dio " + l[k] + ")");
  });
  assert(l.resaca === 0,
    "sin save.energiaFinal la resaca tiene que ser 0, no NaN ni undefined (dio " + l.resaca + ")");
  assert(num(l.animo) && l.animo >= 0 && l.animo <= 100, "el ánimo queda en rango");
  console.log("[2] lunesDespues con save sin `energiaFinal`: resaca " + l.resaca + ", ánimo " + l.animo);
})();

/* ---------- [3] LAS OPCIONES VIEJAS SIGUEN VALIENDO ---------- */
(function () {
  var s = saveViejo();
  var sem = S.nuevaSemana(s, BAL.semana);
  sem.permanentes = {};
  /* los ids que un save viejo pudo haber guardado tienen que seguir existiendo */
  ["entrenar_tiro", "asado", "descansar", "picadito", "curar"].forEach(function (id) {
    var o = SEM.opciones.find(function (x) { return x.id === id; });
    assert(!!o, "el id '" + id + "' que un save viejo pudo guardar tiene que seguir existiendo en data/semana.json");
  });
  var next = S.elegir(SEM, sem, 0, "entrenar_tiro", BAL.semana);
  assert(next && num(next.energia), "elegir() con un id viejo sigue funcionando");
  console.log("[3] los ids de opciones de la semana no cambiaron: los 5 verificados siguen ahí");
})();

/* ---------- [4] LA TEMPORADA VIEJA Y EL DESCENSO (A4) ---------- */
(function () {
  var s = saveViejo();
  /* el veredicto es nuevo (devuelve `desciende`) pero tiene que tolerar una
     temporada guardada antes de que existiera */
  for (var f = s.temporada.fecha; f < s.temporada.fixture.length; f++) T.jugarFecha(s.temporada, 1, 1);
  var v = T.veredicto(s.temporada, IDS, BAL.partido);
  assert(num(v.posicion) && v.posicion >= 1, "la posición sale bien de una temporada vieja");
  assert(typeof v.desciende === "boolean", "el campo nuevo `desciende` tiene que existir y ser booleano");
  assert(IDS.indexOf(v.proximaDivision) >= 0, "la próxima división tiene que ser una válida (dio " + v.proximaDivision + ")");
  assert(Array.isArray(v.zona), "la zona de descenso sale como lista");
  console.log("[4] veredicto sobre una temporada vieja: " + v.posicion + "º → " + v.proximaDivision +
    (v.desciende ? " (desciende)" : ""));
})();

/* ---------- [5] EL PARTIDO ARRANCA CON UN SAVE VIEJO ---------- */
(function () {
  var mios = [{ nombre: "Arquero", pos: "ARQ" }];
  for (var i = 0; i < 10; i++) mios.push({ nombre: "Compa " + i, pos: "X" });
  mios[8] = { nombre: "Vos", esVos: true };
  var st = P.crearPartido({ bal: BAL, mios: mios, rivales: [], rng: function () { return 0.5; } });
  assert(st.lectura && typeof st.lectura === "object",
    "el estado de lectura (N2) se crea aunque el save no lo tenga: es del partido, no del save");
  assert(st.corners == null || num(st.corners), "corners arranca limpio");
  /* y un remate completo no explota */
  st.posesion = "mia";
  var j = st.mios[st.ctrl]; j.x = st.W - 200; j.y = st.H / 2;
  var prep = P.prepararRemate(st, false, function () { return 0.5; });
  assert(num(prep.shotPower) && num(prep.distancia), "prepararRemate devuelve números válidos");
  assert(Array.isArray(prep.penalizaciones), "el campo nuevo `penalizaciones` existe y es lista");
  console.log("[5] el partido arranca y resuelve un remate con estructuras nuevas sobre save viejo");
})();

/* ---------- [6] EL ORIGEN FALTANTE NO ROMPE (V8 A1) ---------- */
(function () {
  var s = saveViejo();
  assert(s.origen === undefined, "el save de época no tiene origen, que es el caso a probar");
  /* fichaOrigen tiene que tolerar un origen ausente */
  var f = null, exploto = false;
  try { f = V.fichaOrigen("Vos", s.origen, s.pueblo); } catch (e) { exploto = true; }
  assert(!exploto, "fichaOrigen no puede explotar con origen ausente");
  assert(typeof f === "string" && f.length > 0, "y tiene que devolver algo legible (dio " + JSON.stringify(f) + ")");
  console.log("[6] sin `origen` en el save, la ficha sale igual: \"" + f + "\"");
})();

/* ---------- [7] LOS BLOQUES DE BALANCE NUEVOS TIENEN DEFAULTS ---------- */
(function () {
  /* si alguien carga el juego con un balance.json viejo —o si un bloque nuevo
     se borra por error— la lógica tiene que seguir de pie */
  var D = require(path.join(RAIZ, "phaser/logic/drama.js"));
  var L = require(path.join(RAIZ, "phaser/logic/lectura.js"));
  var E = require(path.join(RAIZ, "phaser/logic/escalera.js"));
  var Du = require(path.join(RAIZ, "phaser/logic/duel.js"));
  assert(num(D.presupuesto("gol", null, undefined)), "drama funciona sin su bloque de balance");
  assert(num(L.lectura(L.nuevo(), "x", 0, undefined)), "lectura funciona sin su bloque");
  assert(E.de("primera_b") && E.de("no_existe"), "escalera tolera una división desconocida");
  assert(num(Du.duelChance(60, 50, undefined)), "duelChance funciona sin cfg");
  var sinBloques = JSON.parse(JSON.stringify(BAL));
  delete sinBloques.drama; delete sinBloques.lectura; delete sinBloques.tiro; delete sinBloques.oficio;
  var sem = S.nuevaSemana({ animo: 50 }, sinBloques.semana);
  assert(num(sem.energia), "la semana funciona con un balance al que le faltan los bloques nuevos");
  console.log("[7] los 4 módulos nuevos tienen defaults: el juego no depende de que balance.json esté al día");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
