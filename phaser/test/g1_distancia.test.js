/* ============================================================================
   PAMPA STAR · G1 — LA DISTANCIA PESA Y EL ARQUERO INTERVIENE

   El bug: "Rodri patea desde mitad de cancha y entra siempre". Medido con la
   lógica real antes del arreglo, un jugador de tiro 85 contra arquero normal
   tenía 95% desde el área chica y 91% desde SU PROPIO CAMPO, y el Caldén ni
   calculaba la distancia. La causa no era que faltara penalización: era que la
   penalización se aplicaba restándole poder al remate, y duelChance está
   topeada en 0.95, así que en cuanto el poder le sacaba ~26 puntos al arquero
   la chance quedaba pegada al techo y los metros no movían nada.

   Este test fija el comportamiento nuevo y IMPRIME LA TABLA en cada corrida,
   para que el balance del remate sea algo que se ve, no algo que se supone.

   Corré:  node phaser/test/g1_distancia.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var P = require(path.join(__dirname, "..", "logic", "partido.js"));
var D = require(path.join(__dirname, "..", "logic", "duel.js"));
var BAL = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "balance.json"), "utf8"));
var W = BAL.mundo.ancho, H = BAL.mundo.alto;

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

var PUNTOS = [
  { n: "área chica", x: W - 60 },
  { n: "área grande", x: W - 165 },
  { n: "borde del área", x: W - 260 },
  { n: "media cancha", x: W / 2 },
  { n: "campo propio", x: W * 0.35 }
];
var ARQUEROS = [
  { n: "flojo", v: 30 },
  { n: "normal", v: BAL.duelo.keeper_skill.normal },
  { n: "figura", v: BAL.duelo.keeper_skill.figura }
];
var ZONA = { bonus: 0, fuera: 0, gy: 0 };

function estadoEn(x, keeper, tiro) {
  var mios = [{ nombre: "Arquero", pos: "ARQ" }];
  for (var i = 0; i < 10; i++) mios.push({ nombre: "Compa " + i, pos: "X" });
  mios[8] = { nombre: "Vos", esVos: true };
  var st = P.crearPartido({ bal: BAL, mios: mios, rivales: [], rng: function () { return 0.5; } });
  st.rivalKeeperSkill = keeper;
  st.posesion = "mia";
  var j = st.mios[st.ctrl];
  j.x = x; j.y = H / 2;
  j.stats = Object.assign({}, j.stats, { tiro: tiro, caracter: 50 });
  j.aguante = BAL.aguante.max;
  return st;
}
function chanceEn(x, keeper, tiro, especial) {
  var st = estadoEn(x, keeper, tiro);
  var prep = P.prepararRemate(st, especial || false, function () { return 0.5; });
  var r = D.resolveShot({
    shotPower: prep.shotPower, keeperSkill: prep.keeperSkill, zone: ZONA, cfg: BAL.duelo,
    distancia: prep.distancia, especial: prep.especial, tiro: BAL.tiro, rng: function () { return 0.5; }
  });
  return { pct: r.chancePct, d: prep.distancia, fd: r.factorDist };
}

/* ---------- LA TABLA, IMPRESA SIEMPRE ---------- */
function tabla(titulo, tiro, especial) {
  console.log("\n" + titulo);
  console.log("  desde              dist   flojo(30)  normal(" + ARQUEROS[1].v + ")  figura(" + ARQUEROS[2].v + ")   factor");
  PUNTOS.forEach(function (p) {
    var rs = ARQUEROS.map(function (a) { return chanceEn(p.x, a.v, tiro, especial); });
    console.log("  " + p.n + Array(19 - p.n.length).join(" ") + String(rs[1].d) + "   " +
      rs.map(function (r) { return (r.pct + "%").length < 4 ? " " + r.pct + "%   " : r.pct + "%   "; }).join("   ") +
      "  x" + rs[1].fd);
  });
}
console.log("PROBABILIDAD DE GOL POR DISTANCIA (zona central, aguante lleno)");
tabla("[tabla 1] jugador que arranca — tiro 50", 50);
tabla("[tabla 2] jugador crack — tiro 85", 85);
tabla("[tabla 3] Caldén/megatiro (x" + BAL.partido.calden.mult + ") — tiro 70", 70, true);

/* ---------- [1] LA CURVA BAJA, Y BAJA DE VERDAD ---------- */
var crack = PUNTOS.map(function (p) { return chanceEn(p.x, ARQUEROS[1].v, 85); });
for (var i = 1; i < crack.length; i++) {
  assert(crack[i].pct <= crack[i - 1].pct,
    "la chance tiene que bajar con la distancia: " + PUNTOS[i - 1].n + " " + crack[i - 1].pct +
    "% y " + PUNTOS[i].n + " " + crack[i].pct + "%");
}

/* ---------- [2] DESDE MEDIA CANCHA ES UNA RAREZA ---------- */
var mediaCancha = chanceEn(W / 2, ARQUEROS[1].v, 85);
assert(mediaCancha.pct <= 15,
  "un crack (tiro 85) mete desde MEDIA CANCHA el " + mediaCancha.pct + "% de las veces. Tiene que ser una rareza " +
  "celebrable, no el camino óptimo. Perilla: bajar balance.tiro.media_vida.");
var propio = chanceEn(W * 0.35, ARQUEROS[1].v, 85);
assert(propio.pct <= 8,
  "desde el CAMPO PROPIO un crack mete el " + propio.pct + "%. Perilla: balance.tiro.media_vida.");

/* ---------- [3] PERO EL ÁREA NO SE CASTIGA ---------- */
var areaChica = chanceEn(W - 60, ARQUEROS[1].v, 85);
var areaGrande = chanceEn(W - 165, ARQUEROS[1].v, 85);
assert(areaChica.pct >= 80,
  "un crack solo en el ÁREA CHICA mete el " + areaChica.pct + "%: adentro del área tiene que decidir el duelo, " +
  "no la distancia. Perilla: subir balance.tiro.referencia.");
assert(areaGrande.pct >= 70,
  "en el ÁREA GRANDE un crack mete el " + areaGrande.pct + "%, demasiado castigado para estar adentro del área.");

/* ---------- [4] EL ESPECIAL AGUANTA MÁS METROS, PERO NO ES INMUNE ---------- */
var normalLejos = chanceEn(W / 2, ARQUEROS[1].v, 70).pct;
var especialLejos = chanceEn(W / 2, ARQUEROS[1].v, 70, true).pct;
assert(especialLejos > normalLejos,
  "el Caldén desde media cancha (" + especialLejos + "%) tiene que rendir MÁS que el tiro normal (" + normalLejos + "%): " +
  "para eso cuesta aguante");
assert(especialLejos < 60,
  "el Caldén desde media cancha entra el " + especialLejos + "% de las veces: sigue siendo demasiado. Antes de G1 " +
  "el especial ni calculaba la distancia. Perilla: balance.tiro.media_vida_especial.");
var especialCerca = chanceEn(W - 60, ARQUEROS[1].v, 70, true).pct;
assert(especialCerca > especialLejos, "al especial también le tiene que pesar la distancia");

/* ---------- [5] LOS CUATRO DESENLACES EXISTEN ---------- */
(function () {
  var cuenta = {}, n = 4000;
  for (var k = 0; k < n; k++) {
    var st = estadoEn(W - 200, ARQUEROS[1].v, 65);
    var prep = P.prepararRemate(st, false, Math.random);
    var r = D.resolveShot({
      shotPower: prep.shotPower, keeperSkill: prep.keeperSkill, zone: { bonus: 0, fuera: 0.05, gy: 0 },
      cfg: BAL.duelo, distancia: prep.distancia, tiro: BAL.tiro, rng: Math.random
    });
    cuenta[r.outcome] = (cuenta[r.outcome] || 0) + 1;
  }
  ["gol", "atajada", "corner", "afuera"].forEach(function (o) {
    assert(cuenta[o] > 0, "el desenlace '" + o + "' no aparece nunca en " + n + " remates desde el borde del área. " +
      "Los cuatro tienen que existir: si el arquero solo puede atajar o comerse el gol, no interviene de verdad.");
  });
  /* y ninguno de los dos "el arquero llegó" puede ser anecdótico. La primera
     calibración daba 566 córners contra 76 agarradas: con esa proporción
     "la agarró" no existía en la práctica y el córner regalaba posesión. */
  var prop = cuenta.atajada / cuenta.corner;
  assert(prop > 0.4 && prop < 2.5,
    "agarradas y córners tienen que ser comparables: " + cuenta.atajada + " vs " + cuenta.corner +
    " (proporción " + Math.round(prop * 100) / 100 + "). Perilla: balance.tiro.retiene_base.");
  console.log("\n[5] desenlaces en " + n + " remates desde 200px: " +
    ["gol", "atajada", "corner", "afuera"].map(function (o) { return o + " " + (cuenta[o] || 0); }).join(" · "));
})();

/* ---------- [6] LOS TRES NO-GOLES TERMINAN DISTINTO EN EL ESTADO ---------- */
(function () {
  /* la agarró: la pelota es del arquero, la perdés */
  var a = estadoEn(W - 200, 46, 65);
  P.tiroFallado(a);
  assert(a.posesion !== "mia", "'la agarró' tiene que hacerte PERDER la pelota");

  /* la sacó al córner: la jugada sigue siendo tuya */
  var b = estadoEn(W - 200, 46, 65);
  var c = P.cornerMio(b, function () { return 0.2; });
  assert(b.posesion === "mia", "'la sacó al córner' NO puede hacerte perder la pelota: es saque de esquina tuyo");
  assert(b.mios[b.ctrl].x > W - 60, "el córner se saca desde el vértice, no desde donde pateaste (x=" + Math.round(b.mios[b.ctrl].x) + ")");
  assert(c.arriba === true && b.mios[b.ctrl].y < H / 2, "el córner de arriba se saca arriba");
  var d = estadoEn(W - 200, 46, 65);
  P.cornerMio(d, function () { return 0.8; });
  assert(d.mios[d.ctrl].y > H / 2, "el córner de abajo se saca abajo");
  assert(b.corners === 1, "el córner se cuenta");
  console.log("[6] consecuencias distintas: agarrada → perdés · córner → seguís vos, desde el vértice");
})();

console.log("\n" + (mal === 0 ? "✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "✗ " + mal + " FALLARON (" + ok + " ok)"));
process.exit(mal === 0 ? 0 : 1);
