/* ============================================================================
   PAMPA STAR · ENTRENAR AGUANTE NO HACÍA ABSOLUTAMENTE NADA

   EL BUG. `entrenar_aguante` es la ÚNICA opción de la semana con stat_mas 2 —el
   doble que las otras nueve— y la más cara junto con `ayudar_casa` (30 y 35 de
   energía). Las dos suben `resistencia`. Y `resistencia` no la leía NINGÚN
   motor: la única línea que la tocaba escribía `j.aguanteMax`, un campo del
   jugador que tampoco leía nadie, porque los SEIS clamps de aguante de
   partido.js usaban el global `bal.aguante.max`.

   O sea: las dos opciones más caras del juego entrenaban una stat muerta.
   Entrenabas aguante toda la carrera y nunca aguantabas más.

   Y la cadena tenía TRES eslabones rotos, no uno:
     1. los seis clamps del partido, que topeaban en el global
     2. `comoLlegas`, que calcula el aguante inicial con cfg.aguante_max global
     3. match.js, que clampeaba ese inicial otra vez contra A.max

   Cortar uno solo no se hubiera notado: el tanque grande se perdía en el
   siguiente eslabón. Es la firma de esta enfermedad — la mejora existe, viaja
   un tramo, y muere sin avisar.

   Corré:  node phaser/test/aguante_entrenado.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var S = require(path.join(RAIZ, "phaser/logic/semana.js"));
var P = require(path.join(RAIZ, "phaser/logic/partido.js"));
var bal = JSON.parse(fs.readFileSync(path.join(RAIZ, "phaser/data/balance.json"), "utf8"));
var SEM = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/semana.json"), "utf8"));

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }
var MAX = bal.aguante.max;

/* ---------- [1] LA CUENTA VIVE EN UN SOLO LUGAR ---------- */
(function () {
  assert(typeof S.techoDeAguante === "function", "tiene que existir techoDeAguante");
  assert(S.techoDeAguante(null, bal.semana) === MAX, "sin mejoras, el techo es el global");
  assert(S.techoDeAguante({}, bal.semana) === MAX, "sin resistencia, tampoco cambia");
  var t = S.techoDeAguante({ resistencia: 49.3 }, bal.semana);
  assert(t > MAX, "con resistencia entrenada el techo tiene que subir (dio " + t + ")");
  /* el factor era un `* 4` suelto en la escena: ahora es perilla */
  var doble = S.techoDeAguante({ resistencia: 10 }, Object.assign({}, bal.semana, { aguante_por_resistencia: 8 }));
  var simple = S.techoDeAguante({ resistencia: 10 }, Object.assign({}, bal.semana, { aguante_por_resistencia: 4 }));
  assert(doble - MAX === (simple - MAX) * 2, "aguante_por_resistencia tiene que ser una perilla de verdad");
  console.log("[1] techoDeAguante en un solo lugar · +49,3 de resistencia = " + t + " de tanque");
})();

/* ---------- [2] EL MOTOR RESPETA TU TECHO, Y SOLO EL TUYO ---------- */
(function () {
  assert(typeof P.techoAguante === "function", "tiene que existir techoAguante");
  assert(P.techoAguante({}, bal) === MAX, "el que no entrenó juega exactamente como antes");
  assert(P.techoAguante({ aguanteMax: 1197 }, bal) === 1197, "y el que entrenó, con su techo");

  /* la prueba de verdad: recuperar de verdad, con la lógica de verdad */
  var st = P.crearPartido({ bal: bal, semilla: 5 });
  var vos = st.mios.find(function (j) { return j.esVos; }) || st.mios[1];
  var compa = st.mios.find(function (j) { return j !== vos && j.pos !== "ARQ"; });
  vos.aguanteMax = 1197;
  st.mios.forEach(function (j) { j.aguante = 200; });
  st.aguanteRival = 200;
  for (var i = 0; i < 30; i++) P.entretiempo(st);
  assert(Math.round(vos.aguante) === 1197, "vos tenés que poder recuperar hasta TU techo (diste " + Math.round(vos.aguante) + ")");
  assert(Math.round(compa.aguante) === MAX, "y el compañero hasta el global (dio " + Math.round(compa.aguante) + ")");
  assert(Math.round(st.aguanteRival) === MAX, "el rival no se beneficia de que vos entrenes");
  console.log("[2] el motor te deja llegar a " + Math.round(vos.aguante) + " y al compañero a " + Math.round(compa.aguante));
})();

/* ---------- [3] LOS CLAMPS NO PUEDEN VOLVER AL GLOBAL ---------- */
(function () {
  /* si alguno vuelve a topear en bal.aguante.max, el tanque entrenado se pierde
     ahí y no hay error que lo delate */
  var COD = fs.readFileSync(path.join(RAIZ, "phaser/logic/partido.js"), "utf8");
  var lineas = COD.split("\n").filter(function (l) {
    return /j\.aguante\s*=\s*clamp|ctrl\.aguante\s*=\s*clamp/.test(l);
  });
  assert(lineas.length >= 5, "tienen que seguir estando los clamps del jugador (hay " + lineas.length + ")");
  lineas.forEach(function (l) {
    assert(/techoAguante\(/.test(l),
      "este clamp volvió al tope global y ahí se pierde lo entrenado: " + l.trim().slice(0, 90));
  });
  console.log("[3] los " + lineas.length + " clamps del jugador respetan su techo");
})();

/* ---------- [4] Y LA STAT QUE SE ENTRENA ES LA QUE PAGA ---------- */
(function () {
  var conStat = (SEM.opciones || []).filter(function (o) { return o.stat === "resistencia"; });
  assert(conStat.length >= 2, "resistencia la entrenan al menos dos opciones (son " + conStat.length + ")");
  /* y son las más caras: si eso cambia, hay que recalibrar */
  var todas = (SEM.opciones || []).filter(function (o) { return o.energia_costo; });
  var maxCosto = Math.max.apply(null, todas.map(function (o) { return o.energia_costo; }));
  assert(conStat.some(function (o) { return o.energia_costo === maxCosto; }),
    "la opción más cara del juego (" + maxCosto + " de energía) tiene que seguir siendo una de resistencia");
  console.log("[4] " + conStat.map(function (o) { return o.id + " (" + o.energia_costo + ")"; }).join(" y ") + " · la más cara del juego cuesta " + maxCosto);
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
