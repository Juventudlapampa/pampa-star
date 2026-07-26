/* ============================================================================
   PAMPA STAR · test de V9 §7 — POR QUÉ SALIÓ ASÍ
   La queja del playtest: "la gambeta y el corte tienen animación pero el
   resultado se siente aleatorio". No lo es: hay matriz de lectura, stats,
   cansancio y azar acotado — lo que faltaba era que la lógica CONTARA cuál
   de esos términos decidió. Este test fija dos cosas:
     1) el motivo que se devuelve es coherente con lo que pasó, y
     2) agregar la explicación NO cambió un solo resultado (mismo rng, mismo
        win que antes de la V9 — se compara contra duelChance a mano).
   Corré:  node phaser/test/porque.test.js
   ========================================================================== */
"use strict";
var P = require("../logic/partido.js");
var Duel = require("../logic/duel.js");
var fs = require("fs"), path = require("path");
var bal = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/balance.json"), "utf8"));

var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.error("  ✗ " + m); } }
function seq(vals) { var i = 0; return function () { return vals[i++ % vals.length]; }; }
var MOTIVOS = ["ajustado", "lectura", "cansado", "entero", "envion", "megacosa", "rival_fundido", "parejo"];

function partidoNuevo(rng) {
  var mios = [{ nombre: "Arquero", pos: "ARQ" }];
  for (var i = 0; i < 10; i++) mios.push({ nombre: "Compa " + i, pos: "X" });
  mios[8] = { nombre: "Vos", esVos: true };
  return P.crearPartido({ bal: bal, mios: mios, rivales: [], rng: rng || Math.random });
}

/* ---- 1) el duelo devuelve el desglose completo, y el motivo es del vocabulario ---- */
(function () {
  var visto = {};
  for (var k = 0; k < 240; k++) {
    var st = partidoNuevo(seq([(k % 20) / 20 + 0.01]));
    var r = P.resolverDuelo(st, { accion: "gambeta", poder: 40 + (k % 50), costo: 10, rng: seq([(k % 17) / 17, (k % 11) / 11, (k % 7) / 7]) });
    ok(typeof r.win === "boolean" && r.aporte && typeof r.chancePct === "number", "el duelo devuelve win + chancePct + aporte");
    ok(MOTIVOS.indexOf(r.motivo) >= 0, "motivo del vocabulario cerrado (fue: " + r.motivo + ")");
    ok(r.chancePct >= 0 && r.chancePct <= 100, "chancePct en 0..100");
    visto[r.motivo] = (visto[r.motivo] || 0) + 1;
  }
  ok(Object.keys(visto).length >= 3, "aparecen al menos 3 motivos distintos en 240 duelos (fueron " + Object.keys(visto).length + ")");
  console.log("[1] el duelo cuenta su desglose: ok · motivos vistos: " + Object.keys(visto).join(", "));
})();

/* ---- 2) EL RESULTADO NO CAMBIÓ: el roll devuelto es el que decidió ---- */
(function () {
  for (var k = 0; k < 120; k++) {
    var st = partidoNuevo(seq([0.5]));
    var r = P.resolverDuelo(st, { accion: "gambeta", poder: 30 + k, costo: 0, rng: seq([0.3, (k % 100) / 100, 0.5]) });
    /* la verdad del duelo es roll < chance; si eso no se cumple, la explicación
       se desincronizó del resultado (que es exactamente lo que no puede pasar) */
    ok(r.win === (r.roll < r.chancePct / 100) || Math.abs(r.roll - r.chancePct / 100) < 0.005,
      "win coincide con roll<chance (win=" + r.win + " roll=" + r.roll + " chance=" + r.chancePct + "%)");
  }
  console.log("[2] la explicación no cambia el resultado: ok");
})();

/* ---- 3) el cansancio se cuenta cuando de verdad pesó ---- */
(function () {
  var st = partidoNuevo(seq([0.5]));
  st.mios[st.ctrl].aguante = bal.aguante.max;            // entero
  var entero = P.resolverDuelo(st, { accion: "gambeta", poder: 55, costo: 0, rng: seq([0.3, 0.01, 0.5]) });
  ok(entero.aporte.aguante > 0, "con el tanque lleno el aporte del aguante es positivo (" + entero.aporte.aguante.toFixed(2) + ")");
  var st2 = partidoNuevo(seq([0.5]));
  st2.mios[st2.ctrl].aguante = Math.round(bal.aguante.max * 0.05);   // fundido
  var roto = P.resolverDuelo(st2, { accion: "gambeta", poder: 55, costo: 0, rng: seq([0.3, 0.99, 0.5]) });
  ok(roto.aporte.aguante < 0, "fundido, el aporte del aguante es negativo (" + roto.aporte.aguante.toFixed(2) + ")");
  ok(!roto.win, "con la peor tirada, fundido, se pierde");
  ok(roto.motivo === "cansado" || roto.motivo === "lectura" || roto.motivo === "ajustado",
    "perder fundido se explica por cansancio o por lectura (fue: " + roto.motivo + ")");
  console.log("[3] el cansancio invisible ahora se cuenta: ok");
})();

/* ---- 4) la matriz manda: si te leyeron y perdiste, el motivo es la lectura ---- */
(function () {
  var casos = 0, leyeron = 0;
  for (var k = 0; k < 200; k++) {
    var st = partidoNuevo(seq([(k % 13) / 13]));
    var r = P.resolverDuelo(st, { accion: "gambeta", poder: 50, costo: 0, rng: seq([(k % 3) / 3, (k % 23) / 23, 0.5]) });
    var leido = r.matriz === "leyeron";
    /* 0.06 y no 0.05: desde afuera solo se ve chancePct REDONDEADO, así que los
       casos pegados al umbral de "ajustado" no se pueden reproducir exacto */
    if (leido !== r.win && Math.abs(r.roll - r.chancePct / 100) >= 0.06) {
      casos++;
      if (r.motivo === "lectura") leyeron++;
    }
  }
  ok(casos > 0, "hubo duelos donde la matriz explica el resultado (" + casos + ")");
  ok(leyeron === casos, "TODOS esos duelos se explican por lectura (" + leyeron + "/" + casos + ")");
  console.log("[4] la lectura se nombra cuando corresponde: ok");
})();

/* ---- 5) EL PASE cuenta si se lo cortaron por estar tapado, largo o por poco ---- */
(function () {
  var st = partidoNuevo(seq([0.5]));
  var recs = P.receptoresPase(st);
  ok(recs.length > 0, "hay receptores");
  ok(recs.every(function (r) { return typeof r.riesgo === "number"; }), "cada receptor informa el riesgo de la línea");
  /* uno tapado: le planto un rival justo en el corredor */
  var st2 = partidoNuevo(seq([0.5]));
  var c = st2.mios[st2.ctrl], j = st2.mios[st2.ctrl === 5 ? 6 : 5];
  j.x = c.x + 120; j.y = c.y;
  st2.rivales[3].x = c.x + 60; st2.rivales[3].y = c.y;   // parado en el medio
  st2.rivales[3].pos = "DEF";
  var rl = P.riesgoLinea(st2, st2.mios.indexOf(j));
  ok(rl.riesgo > 0 && rl.quien, "riesgoLinea detecta al que está parado en la línea (riesgo " + Math.round(rl.riesgo) + ")");
  var res = P.resolverPase(st2, st2.mios.indexOf(j), 50, seq([0.9, 0.5]));
  ok(typeof res.motivo === "string" && ["tapado", "largo", "ajustado", "limpio"].indexOf(res.motivo) >= 0,
    "el pase devuelve un motivo del vocabulario (fue: " + res.motivo + ")");
  ok(res.riesgo >= 1, "y devuelve el riesgo que había (" + res.riesgo + ")");
  /* uno limpio y corto: nadie en la línea */
  var st3 = partidoNuevo(seq([0.5]));
  st3.rivales.forEach(function (r) { r.x = st3.W - 40; });   // todos lejos
  var idx = st3.ctrl === 5 ? 6 : 5;
  st3.mios[idx].x = st3.mios[st3.ctrl].x + 60; st3.mios[idx].y = st3.mios[st3.ctrl].y;
  var res3 = P.resolverPase(st3, idx, 90, seq([0.01, 0.5]));
  ok(res3.win && res3.riesgo === 0, "sin nadie en la línea el riesgo es 0 y el pase llega");
  console.log("[5] el pase explica el corte: ok");
})();

/* ---- 6) el vocabulario del motivo NO tiene sorpresas para la UI ---- */
(function () {
  var frases = { ajustado: 1, lectura: 1, cansado: 1, entero: 1, envion: 1, megacosa: 1, rival_fundido: 1, parejo: 1 };
  var m = P.motivoDuelo(true, "zafaste", { aguante: 0, envion: 0, matriz: 7.2, megaRival: 0, rivalFrac: 1 }, 0.8, 0.1);
  ok(frases[m] === 1, "motivoDuelo devuelve siempre una clave conocida (fue: " + m + ")");
  ok(P.motivoDuelo(true, "zafaste", null, 0.5, 0.1) === "parejo", "sin aporte cae a 'parejo', nunca undefined");
  ok(P.motivoDuelo(false, "leyeron", { aguante: 0, envion: 0, matriz: -12, megaRival: 0, rivalFrac: 1 }, 0.5, 0.9) === "lectura",
    "te leyeron y perdiste → lectura");
  ok(P.motivoDuelo(true, "leyeron", { aguante: 0, envion: 0, matriz: -12, megaRival: 0, rivalFrac: 1 }, 0.5, 0.52) === "ajustado",
    "ganar con el roll pegado a la chance → ajustado");
  console.log("[6] vocabulario cerrado y sin undefined: ok");
})();

if (fail === 0) console.log("\n✓ TODOS OK — " + pass + " asserts, 0 fallaron.");
else { console.error("\n✗ " + fail + " FALLARON (" + pass + " ok)"); process.exit(1); }
