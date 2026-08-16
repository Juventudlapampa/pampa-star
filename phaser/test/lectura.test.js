/* ============================================================================
   PAMPA STAR · N2 — EL RIVAL TE LEE LOS ESPECIALES

   Imprime en cada corrida la tabla de "cuántos usos hacen falta para que deje
   de rendir y cuánto tarda en recuperarse", que es lo que el punto pedía medir.

   Falla si: la lectura no sube con el uso · no baja con el tiempo · se contagia
   entre especiales · el especial leído queda peor que un tiro normal · no hay
   aviso antes de intentarlo · la lectura sobrevive al partido.

   Corré:  node phaser/test/lectura.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var L = require(path.join(__dirname, "..", "logic", "lectura.js"));
var P = require(path.join(__dirname, "..", "logic", "partido.js"));
var D = require(path.join(__dirname, "..", "logic", "duel.js"));
var BAL = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "balance.json"), "utf8"));
var CFG = BAL.lectura;

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

var MEGA = { id: "tornado", n: "Tornado Pampeano", aguante: 280, mult: 1.6 };
function partido() {
  var mios = [{ nombre: "Arquero", pos: "ARQ" }];
  for (var i = 0; i < 10; i++) mios.push({ nombre: "Compa " + i, pos: "X" });
  mios[8] = { nombre: "Vos", esVos: true };
  var st = P.crearPartido({ bal: BAL, mios: mios, rivales: [], rng: function () { return 0.5; } });
  st.posesion = "mia";
  return st;
}
function golDesde(st, x, mega) {
  var j = st.mios[st.ctrl];
  j.stats.tiro = 70; j.aguante = BAL.aguante.max; j.x = x; j.y = st.H / 2;
  var p = P.prepararRemate(st, mega || false, function () { return 0.5; });
  var r = D.resolveShot({
    shotPower: p.shotPower, keeperSkill: p.keeperSkill, zone: { bonus: 0, fuera: 0, gy: 0 },
    cfg: BAL.duelo, distancia: p.distancia, especial: p.especial, tiro: BAL.tiro, rng: function () { return 0.5; }
  });
  return { pct: r.chancePct, arq: p.lecturaArq, queda: p.especial };
}

/* ---------- LA TABLA QUE PIDE EL PUNTO ---------- */
console.log("EL TORNADO USO TRAS USO (jugador con tiro 70, arquero normal, uno cada 6 minutos)");
console.log("  uso   lectura   +arquero   le queda de especial   gol desde 260px   desde media cancha");
var st = partido(), fila = [];
for (var n = 1; n <= 6; n++) {
  var min = (n - 1) * 6;
  st.minuto = min;
  var lec = L.lectura(st.lectura, "tornado", min, CFG);
  var guardado = JSON.parse(JSON.stringify(st.lectura));
  var a = golDesde(st, 1050 - 260, MEGA);
  st.lectura = JSON.parse(JSON.stringify(guardado));  /* el tiro de arriba ya registró: se vuelve atrás */
  var b = golDesde(st, 525, MEGA);
  fila.push({ n: n, lec: lec, cerca: a.pct, lejos: b.pct, arq: a.arq });
  console.log("   " + n + "     " + lec.toFixed(2) + "      +" + String(a.arq).padStart(4) +
    "          " + String(typeof a.queda === "number" ? a.queda.toFixed(2) : a.queda).padStart(4) +
    "             " + String(a.pct + "%").padStart(5) + "             " + String(b.pct + "%").padStart(5));
}

/* ---------- [1] EL ABUSO SE PAGA ---------- */
assert(fila[5].lejos < fila[0].lejos * 0.5,
  "abusando del especial desde media cancha la chance tiene que caer a menos de la mitad: pasó de " +
  fila[0].lejos + "% a " + fila[5].lejos + "%. Perillas: balance.lectura.penal_max / arquero_bonus_max.");
assert(fila[5].cerca < fila[0].cerca,
  "cerca del arco también tiene que bajar algo (" + fila[0].cerca + "% → " + fila[5].cerca + "%)");
console.log("\n[1] el abuso se paga: desde media cancha " + fila[0].lejos + "% → " + fila[5].lejos +
  "% · desde 260px " + fila[0].cerca + "% → " + fila[5].cerca + "%");

/* ---------- [2] SE RECUPERA SI DEJÁS DE ABUSAR ---------- */
(function () {
  var est = L.nuevo();
  for (var k = 0; k < 5; k++) est = L.registrar(est, "tornado", k * 5, CFG);
  var pico = L.lectura(est, "tornado", 20, CFG);
  var limpio = null;
  for (var m = 20; m <= 120; m++) {
    if (L.lectura(est, "tornado", m, CFG) < CFG.avisa_desde) { limpio = m - 20; break; }
  }
  assert(pico > 0.9, "cinco usos seguidos tienen que dejar la lectura casi al tope (dio " + pico.toFixed(2) + ")");
  assert(limpio !== null && limpio > 10 && limpio < 60,
    "la recuperación tiene que llevar un rato pero caber en un partido: tardó " + limpio + " minutos");
  console.log("[2] recuperación: del tope a limpio en " + limpio + " minutos sin usarlo");
})();

/* ---------- [3] CADA ESPECIAL POR SEPARADO ---------- */
(function () {
  var est = L.nuevo();
  for (var k = 0; k < 4; k++) est = L.registrar(est, "tornado", k * 4, CFG);
  assert(L.lectura(est, "tornado", 12, CFG) > 0.8, "el tornado quedó leído");
  assert(L.lectura(est, "calden", 12, CFG) === 0,
    "que te lean el Tornado NO les puede decir nada del Caldén: la gracia es que variar sirva");
  console.log("[3] por separado: tornado " + L.lectura(est, "tornado", 12, CFG).toFixed(2) +
    " · caldén " + L.lectura(est, "calden", 12, CFG).toFixed(2));
})();

/* ---------- [4] LEÍDO NO ES PEOR QUE UN TIRO NORMAL ---------- */
(function () {
  var st2 = partido();
  for (var k = 0; k < 8; k++) { st2.minuto = k * 3; golDesde(st2, 1050 - 260, MEGA); }
  st2.minuto = 24;
  var leido = golDesde(st2, 1050 - 260, MEGA).pct;
  var normal = golDesde(partido(), 1050 - 260, false).pct;
  assert(leido >= normal,
    "un especial leído del todo (" + leido + "%) no puede rendir MENOS que un tiro normal (" + normal + "%): " +
    "se le saca lo que daba de más, no se lo convierte en un castigo por haberlo usado.");
  console.log("[4] leído del todo " + leido + "% contra tiro normal " + normal + "%: el piso se respeta");
})();

/* ---------- [5] SE AVISA ANTES, NO DESPUÉS ---------- */
(function () {
  assert(L.etiqueta(0.1, CFG) === null, "con la lectura baja no se avisa nada (un aviso siempre presente no comunica)");
  var e2 = L.etiqueta(0.5, CFG), e3 = L.etiqueta(0.95, CFG);
  assert(e2 && e3 && e2.texto !== e3.texto, "los avisos tienen que escalar");
  assert(e3.nivel > e2.nivel, "el nivel tiene que subir, para poder mostrarlo con forma y no solo con color");
  console.log("[5] avisos: <" + CFG.avisa_desde + " nada · 0.50 \"" + e2.texto + "\" · 0.95 \"" + e3.texto + "\"");
})();

/* ---------- [6] LA LECTURA NO VIAJA A LA CARRERA ---------- */
(function () {
  var a = partido();
  for (var k = 0; k < 5; k++) { a.minuto = k * 4; golDesde(a, 1050 - 260, MEGA); }
  assert(L.lectura(a.lectura, "tornado", 16, CFG) > 0.5, "el partido de arriba dejó lectura acumulada");
  var b = partido();
  assert(L.lectura(b.lectura, "tornado", 0, CFG) === 0,
    "el partido siguiente tiene que arrancar con la lectura EN CERO: el efecto es local al partido y no " +
    "ensucia el balance de la carrera, que es la razón por la que se eligió esta salida y no subirle el nivel al rival.");
  console.log("[6] partido nuevo, lectura en cero");
})();

console.log(mal === 0 ? "✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
