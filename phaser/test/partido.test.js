/* ============================================================================
   PAMPA STAR · test de la lógica pura del partido (node, sin dependencias)
   Corré:  node phaser/test/partido.test.js
   ========================================================================== */
"use strict";
var P = require("../logic/partido.js");
var fs = require("fs"), path = require("path");
var bal = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/balance.json"), "utf8"));

var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.error("  ✗ " + m); } }
function seq(vals) { var i = 0; return function () { return vals[i++ % vals.length]; }; }

function partidoNuevo(rng) {
  var mios = [{ nombre: "Arquero", pos: "ARQ" }];
  for (var i = 0; i < 10; i++) mios.push({ nombre: "Compa " + i, pos: "X" });
  mios[8] = { nombre: "Vos", esVos: true };
  return P.crearPartido({ bal: bal, mios: mios, rivales: [], rng: rng || Math.random });
}

/* ---- 1) creación: 11 por lado, VOS con la pelota, formación en cancha ---- */
(function () {
  var st = partidoNuevo(seq([0.5]));
  ok(st.mios.length === 11 && st.rivales.length === 11, "11 por lado (fueron " + st.mios.length + "/" + st.rivales.length + ")");
  ok(st.mios.filter(function (j) { return j.pos === "ARQ"; }).length === 1, "exactamente 1 ARQ mío");
  ok(st.mios[st.ctrl].esVos, "VOS arrancás con la pelota");
  ok(st.posesion === "mia" && st.modo === "juego", "arranca jugando en posesión mía");
  console.log("[1] creación 11v11: ok");
})();

/* ---- 2) reloj: corre en juego, entretiempo y final con descuento oculto ---- */
(function () {
  var st = partidoNuevo(seq([0.0]));   // descuento mínimo
  ok(st.desc1 >= bal.ritmo.descuento_min && st.desc1 <= bal.ritmo.descuento_max, "descuento en rango");
  st.cooldown = 9e9;                    // aislar el reloj: sin encuentros en este test
  st.minuto = 44.9 + st.desc1;
  var evs = [];
  for (var i = 0; i < 400 && !evs.length; i++) evs = P.tick(st, 100, null);
  ok(evs.length && evs[0].tipo === "entretiempo", "pita el entretiempo tras 45+descuento (evento: " + (evs[0] && evs[0].tipo) + ")");
  P.entretiempo(st);
  ok(st.tiempo === 2 && st.minuto === 45 && st.posesion === "rival", "2T: saca el rival, minuto 45");
  st.cooldown = 9e9;
  st.minuto = 89.9 + st.desc2;
  evs = [];
  for (i = 0; i < 400 && !evs.length; i++) evs = P.tick(st, 100, null);
  ok(evs.length && evs[0].tipo === "final", "pita el final tras 90+descuento");
  console.log("[2] reloj + entretiempo + final: ok");
})();

/* ---- 3) CALIBRACIÓN: el defensor que cierra es MÁS RÁPIDO que tu portador ---- */
(function () {
  ok(bal.ritmo.defensor_cerrando > bal.ritmo.portador_con_pelota, "defensor_cerrando > portador (te alcanzan)");
  var st = partidoNuevo();
  var ctrl = st.mios[st.ctrl];
  var caza0 = st.rivales.map(function (j, i) { return { i: i, d: Math.hypot(j.x - ctrl.x, j.y - ctrl.y) }; })
    .filter(function (o) { return st.rivales[o.i].pos !== "ARQ"; }).sort(function (a, b) { return a.d - b.d; })[0];
  var d0 = caza0.d;
  st.cooldown = 999999;   // sin encuentro para medir la persecución
  for (var i = 0; i < 30; i++) P.tick(st, 100, { dx: 1, dy: 0 });   // corro hacia el arco
  var r = st.rivales[caza0.i];
  var d1 = Math.hypot(r.x - st.mios[st.ctrl].x, r.y - st.mios[st.ctrl].y);
  ok(d1 < d0, "el cazador se ACERCA aunque corras (d " + Math.round(d0) + "→" + Math.round(d1) + ")");
  console.log("[3] calibración (te alcanzan): ok");
})();

/* ---- 4) AGUANTE: perseguir drena; rendido trota y bloquea acciones caras ---- */
(function () {
  var st = partidoNuevo();
  st.posesion = "rival"; st.portadorRival = 9; st.cooldown = 999999;
  st.rivales[9].x = 900; st.rivales[9].y = 60;   // lejos: no hay encuentro
  var j = st.mios[st.ctrl], a0 = j.aguante;
  for (var i = 0; i < 20; i++) P.tick(st, 250, { dx: 1, dy: 0 });   // 5s persiguiendo
  ok(j.aguante < a0, "perseguir drena aguante (" + a0 + "→" + j.aguante.toFixed(1) + ")");
  j.aguante = bal.aguante.umbral_rendido - 5;
  var acc = P.accionesAtaque(st);
  var gam = acc.find(function (a) { return a.id === "gambeta"; }), pas = acc.find(function (a) { return a.id === "pase"; });
  ok(gam.bloqueada, "rendido: gambeta bloqueada");
  ok(!pas.bloqueada, "rendido: el pase sigue disponible");
  console.log("[4] aguante y rendido: ok");
})();

/* ---- 5) MATRIZ: que te lean la jugada tiene que doler ---- */
(function () {
  var st = partidoNuevo();
  st.posesion = "mia";
  // CPU siempre elige quite (peso r=0 → primera clave)
  var winsLeido = 0, winsZafado = 0, N = 3000;
  for (var i = 0; i < N; i++) {
    var st2 = partidoNuevo(); st2.posesion = "mia";
    var r1 = P.resolverDuelo(st2, { accion: "gambeta", costo: 0, rng: seq([0.0, 0.5]) });  // rng1: CPU elige quite (lee) · rng2: tirada
    if (r1.matriz === "leyeron" && r1.win) winsLeido++;
    var st3 = partidoNuevo(); st3.posesion = "mia";
    var r2 = P.resolverDuelo(st3, { accion: "pase", costo: 0, rng: seq([0.0, 0.5]) });     // CPU quite pero vos pasás (zafás)
    if (r2.matriz === "zafaste" && r2.win) winsZafado++;
  }
  ok(winsZafado > winsLeido, "zafar la matriz gana MÁS que ser leído (" + winsZafado + " > " + winsLeido + ")");
  console.log("[5] matriz de ventajas: ok (" + winsLeido + " vs " + winsZafado + " en " + N + ")");
})();

/* ---- 6) PASES: el control viaja con el pase; la CPU roba si falla ---- */
(function () {
  var st = partidoNuevo();
  var rs = P.receptoresPase(st);
  ok(rs.length > 0 && rs.length <= 4, "hay receptores (" + rs.length + ")");
  ok(rs.every(function (r) { return r.pct >= 15 && r.pct <= 95; }), "pct acotado");
  var antes = st.ctrl;
  var res = P.resolverPase(st, rs[0].idx, 100, seq([0.0]));   // pase seguro
  ok(res.win && st.ctrl === rs[0].idx && st.ctrl !== antes, "el control viajó al receptor");
  var res2 = P.resolverPase(st, rs[0].idx, 0, seq([0.99]));   // pase imposible
  ok(!res2.win && st.posesion === "rival", "pase interceptado → posesión rival");
  console.log("[6] pases: ok");
})();

/* ---- 7) TIRO y CALDÉN por condición; el remate usa resolveShot (bug cerrado) ---- */
(function () {
  var st = partidoNuevo();
  st.mios[st.ctrl].x = 400;
  ok(!P.puedeTirar(st), "lejos: no podés tirar");
  st.mios[st.ctrl].x = st.W - 100;
  ok(P.puedeTirar(st), "cerca: podés tirar");
  ok(P.puedeCalden(st), "VOS + posición + aguante: Caldén habilitado");
  st.mios[st.ctrl].aguante = 10;
  ok(!P.puedeCalden(st), "sin aguante: Caldén bloqueado");
  st.mios[st.ctrl].aguante = 90;
  var prep = P.prepararRemate(st, true);
  ok(prep.shotPower > 0 && prep.keeperSkill > 0, "prepararRemate da los parámetros para duel.resolveShot");
  // invariante del arquero (integración): resolveShot jamás da gol si el arquero gana
  var D = require("../logic/duel.js");
  var r = D.resolveShot({ shotPower: prep.shotPower, keeperSkill: 999, zone: { bonus: 0, fuera: 0, gy: 0 }, rng: seq([0.99]) });
  ok(r.keeperWins && r.outcome !== "gol", "bug del arquero sigue cerrado en el flujo del partido");
  console.log("[7] tiro + Caldén + arquero: ok");
})();

/* ---- 8) REMATE RIVAL: atajar/despejar y gol rival correcto ---- */
(function () {
  var st = partidoNuevo();
  st.posesion = "rival";
  var ops = P.opcionesArquero(st);
  ok(ops.length === 2 && ops[1].poder > ops[0].poder, "despejar es más seguro que atajar");
  var res = P.resolverAtajada(st, "atajar", seq([0.99]));    // falla la atajada
  ok(res.golRival && st.golesRival === 1 && st.posesion === "mia", "gol rival → sacás vos");
  st.posesion = "rival";
  var res2 = P.resolverAtajada(st, "atajar", seq([0.0]));    // ataja
  ok(!res2.golRival && res2.retiene && st.posesion === "mia", "atajó y retiene → salís jugando");
  console.log("[8] remate rival: ok");
})();

/* ---- 9) cambio de jugador: libre en defensa, nunca al ARQ ---- */
(function () {
  var st = partidoNuevo();
  st.posesion = "rival";
  var arq = st.mios.findIndex(function (j) { return j.pos === "ARQ"; });
  ok(!P.cambiarA(st, arq), "no se puede tomar el ARQ");
  var def = st.mios.findIndex(function (j) { return j.pos === "DEF"; });
  ok(P.cambiarA(st, def) && st.ctrl === def, "cambio libre a un DEF");
  st.posesion = "mia";
  ok(!P.cambiarA(st, def + 1), "en ataque no hay cambio manual (el control viaja con el pase)");
  console.log("[9] cambio de jugador: ok");
})();

console.log("\n" + (fail === 0 ? "✓ TODOS OK" : "✗ HUBO FALLAS") + " — " + pass + " asserts, " + fail + " fallaron.");
process.exit(fail === 0 ? 0 : 1);
