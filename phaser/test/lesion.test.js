/* ============================================================================
   PAMPA STAR · LA RAMA DE LESIÓN ESTABA APAGADA ENTERA

   DOS BUGS, uno en cada punta, y cada uno solo ya bastaba para apagarla:

   1. EL PARTIDO NUNCA LA PRODUCÍA. `this._golpeFuerte` se LEÍA en match.js al
      armar masterResultado y no lo escribía NADIE en todo el proyecto. Así que
      lunesDespues() devolvía siempre molestia:false, y con eso quedaban muertos
      los 15 puntos de penal_molestia y la acción CURAR, que sólo se ofrece si
      hay molestia y por lo tanto no se ofrecía jamás.

   2. LA SEMANA LA PRODUCÍA Y EL LUNES LA BORRABA. Las acciones con riesgo_golpe
      escribían `save.semana.molestia`, pero al cerrar la semana ese objeto se
      anula y el lunes hacía `save.molestia = lunes.molestia`, que salía sólo
      del partido. Te lastimabas entrenando y el lunes no había pasado nada. Y
      al revés: CURAR tampoco se guardaba.

   Y el bonus de ánimo por meterla vos tenía la misma forma: `this._hiceGol` se
   leía y no lo escribía nadie, así que animo_gol = 6 no se cobraba nunca.
   Metieras tres goles o ninguno, el lunes te daba lo mismo.

   Corré:  node phaser/test/lesion.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var P = require(path.join(RAIZ, "phaser/logic/partido.js"));
var S = require(path.join(RAIZ, "phaser/logic/semana.js"));
var bal = JSON.parse(fs.readFileSync(path.join(RAIZ, "phaser/data/balance.json"), "utf8"));
var SEM = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/semana.json"), "utf8"));
var MATCH = fs.readFileSync(path.join(RAIZ, "phaser/scenes/match.js"), "utf8");
var MASTER = fs.readFileSync(path.join(RAIZ, "phaser/scenes/master.js"), "utf8");
var A = bal.aguante;

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }
function once() {
  var m = [];
  for (var i = 0; i < 11; i++) m.push({ nombre: "J" + i, pos: i === 0 ? "ARQ" : (i < 5 ? "DEF" : (i < 9 ? "VOL" : "ATA")), esVos: i === 9 });
  return m;
}
function estado(semilla) {
  var st = P.crearPartido({ bal: bal, semilla: semilla || 3, mios: once() });
  st.ctrl = st.mios.findIndex(function (j) { return j.esVos; });
  return st;
}

/* ---------- [1] LA METISTE VOS ---------- */
(function () {
  var st = estado();
  var vos = st.mios[st.ctrl], compa = st.mios.find(function (j) { return !j.esVos && j.pos === "ATA"; });
  assert(!st.hiceGol, "arranca sin marca");
  P.golMio(st, compa);
  assert(!st.hiceGol, "un gol del compañero NO cuenta como tuyo");
  P.golMio(st, vos);
  assert(!!st.hiceGol, "un gol TUYO sí");
  assert(st.golesMio === 2, "y los dos suman al marcador igual (dio " + st.golesMio + ")");
  /* la marca tiene que LLEGAR al lunes */
  assert(!/this\._hiceGol/.test(MATCH.replace(/\/\*[\s\S]*?\*\//g, "")),
    "match.js no puede volver a leer el campo fantasma _hiceGol");
  var sinGol = S.lunesDespues({ animo: 60 }, { golesMio: 2, golesRival: 1, aguanteFinalFrac: 0.5, hiceGol: false });
  var conGol = S.lunesDespues({ animo: 60 }, { golesMio: 2, golesRival: 1, aguanteFinalFrac: 0.5, hiceGol: true });
  assert(conGol.animo === sinGol.animo + bal.semana.animo_gol,
    "meterla vos tiene que valer animo_gol (" + sinGol.animo + " → " + conGol.animo + ")");
  console.log("[1] la metiste vos: ánimo " + sinGol.animo + " → " + conGol.animo + " (animo_gol = " + bal.semana.animo_gol + ")");
})();

/* ---------- [2] EL GOLPE SALE DE PONER EL CUERPO, Y CON EL TANQUE EN EL PISO ---------- */
(function () {
  function duelo(accion, aguante, prob, semilla) {
    var b = JSON.parse(JSON.stringify(bal));
    b.aguante.golpe_prob = prob;
    var st = P.crearPartido({ bal: b, semilla: semilla, mios: once() });
    st.ctrl = st.mios.findIndex(function (j) { return j.esVos; });
    st.mios[st.ctrl].aguante = aguante;
    st.posesion = "rival";
    var s = semilla * 7919 + 1;
    var rng = function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    P.resolverDuelo(st, { accion: accion, poder: 50, costo: b.aguante["costo_" + accion] || 50, rng: rng });
    return !!st.golpeFuerte;
  }
  /* con el tanque entero NO puede pasar, por más veces que se intente */
  var conTanque = 0;
  for (var k = 0; k < 300; k++) if (duelo("bloqueo", A.max, 1, k + 1)) conTanque++;
  assert(conTanque === 0, "con el tanque lleno no te podés lesionar (pasó " + conTanque + " de 300)");
  /* en el piso, sí */
  var enElPiso = 0;
  for (var j = 0; j < 300; j++) if (duelo("bloqueo", A.umbral_rendido + 20, 1, j + 1)) enElPiso++;
  assert(enElPiso > 0, "con el tanque en el piso tiene que poder pasar");
  /* y sólo poniendo el CUERPO: el corte no cuesta lo mismo */
  var conCorte = 0;
  for (var c = 0; c < 300; c++) if (duelo("corte", A.umbral_rendido + 20, 1, c + 1)) conCorte++;
  assert(conCorte === 0, "el corte de pase no es poner el cuerpo: no lesiona (pasó " + conCorte + ")");
  console.log("[2] sólo con quite/bloqueo y el tanque bajo el umbral · con el tanque lleno, nunca");
})();

/* ---------- [3] LA PERILLA MANDA, Y EN 0 SE APAGA ---------- */
(function () {
  assert(A.golpe_prob != null, "golpe_prob tiene que ser una perilla de balance");
  assert(typeof A._golpe_nota === "string" && A._golpe_nota.indexOf("0.25") >= 0,
    "la nota tiene que decir el valor elegido y la calibración");
  function tasa(prob) {
    var b = JSON.parse(JSON.stringify(bal));
    b.aguante.golpe_prob = prob;
    var n = 0, N = 400;
    for (var k = 0; k < N; k++) {
      var st = P.crearPartido({ bal: b, semilla: k + 1, mios: once() });
      st.ctrl = st.mios.findIndex(function (j) { return j.esVos; });
      st.mios[st.ctrl].aguante = A.umbral_rendido + 20;
      st.posesion = "rival";
      var s = (k + 1) * 7919 + 1;
      var rng = function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
      P.resolverDuelo(st, { accion: "bloqueo", poder: 50, costo: b.aguante.costo_bloqueo, rng: rng });
      if (st.golpeFuerte) n++;
    }
    return n / N;
  }
  assert(tasa(0) === 0, "en 0 la rama se apaga entera");
  assert(tasa(1) > tasa(0.25), "y la perilla tiene que mover de verdad");
  console.log("[3] golpe_prob = " + A.golpe_prob + " · en 0 se apaga, en 1 se dispara siempre que se pueda");
})();

/* ---------- [4] LA MOLESTIA DE LA SEMANA YA NO SE EVAPORA ---------- */
(function () {
  /* el segundo bug: te lastimabas entrenando y el lunes no había pasado nada */
  var conSemana = S.lunesDespues({ animo: 60, molestia: true }, { golesMio: 1, golesRival: 0, aguanteFinalFrac: 0.6, golpeFuerte: false });
  assert(conSemana.molestia === true, "una molestia que venías arrastrando tiene que sobrevivir al lunes");
  var curada = S.lunesDespues({ animo: 60, molestia: false }, { golesMio: 1, golesRival: 0, aguanteFinalFrac: 0.6, golpeFuerte: false });
  assert(curada.molestia === false, "y si la curaste, no vuelve sola");
  var delPartido = S.lunesDespues({ animo: 60, molestia: false }, { golesMio: 1, golesRival: 0, aguanteFinalFrac: 0.6, golpeFuerte: true });
  assert(delPartido.molestia === true, "y la del partido también entra");
  /* y la escena tiene que COMMITEAR lo que dejó la semana */
  assert(/this\.save\.molestia = !!sem\.molestia/.test(MASTER),
    "cerrarSemana tiene que guardar la molestia de la semana, o se pierde al anular save.semana");
  console.log("[4] la molestia arrastra desde la semana Y desde el partido · curarla la saca");
})();

/* ---------- [5] Y CUESTA ALGO, QUE ES EL PUNTO ---------- */
(function () {
  var cfg = bal.semana;
  var sin = S.nuevaSemana({ animo: 60 }, cfg), con = S.nuevaSemana({ animo: 60, molestia: true }, cfg);
  assert(con.energia === sin.energia - cfg.penal_molestia,
    "la molestia tiene que costar penal_molestia de energía (" + sin.energia + " → " + con.energia + ")");
  /* y destrabar la acción que la cura, que sin molestia no se ofrece nunca */
  var opSin = S.opcionesPara(SEM, sin, {}), opCon = S.opcionesPara(SEM, con, {});
  var curaSin = opSin.filter(function (o) { return o.cura_molestia; }).length;
  var curaCon = opCon.filter(function (o) { return o.cura_molestia; }).length;
  assert(curaSin === 0 && curaCon > 0,
    "CURAR sólo se ofrece con molestia (sin: " + curaSin + ", con: " + curaCon + ") — por eso no se ofrecía nunca");
  var lSin = S.comoLlegas(sin, cfg), lCon = S.comoLlegas(con, cfg);
  assert(lCon.aguanteInicial < lSin.aguanteInicial, "y se siente en el aguante inicial del domingo");
  console.log("[5] cuesta " + cfg.penal_molestia + " de energía (" + lSin.aguanteInicial + " → " + lCon.aguanteInicial +
    " de tanque) y destraba CURAR");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
