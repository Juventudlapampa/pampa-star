/* ============================================================================
   PAMPA STAR · D2 — EL TOPE DE 0.95 ERA UNA TRAMPA ESTRUCTURAL

   LA TRAMPA, para que no vuelva una tercera vez:
   duelChance() acotaba la chance con clamp(v, min, max). Apenas la diferencia
   de fuerza pasaba de 26 puntos, la chance quedaba CLAVADA en 0.95 y ahí la
   derivada es cero. Cualquier palanca que intentara bajar la efectividad
   restándole poder al remate no movía un solo punto porcentual, y fallaba EN
   SILENCIO: sin excepción, sin test rojo, solo el número que no se mueve.

   Cayeron dos:
     · G1 — la penalización por distancia. Un crack tenía 95% desde el área y
       91% desde su propio campo, aunque el descuento por metros ya existía.
     · N2 — el multiplicador del especial leído. El Tornado pasaba de 96 a 83
       de poder y la chance seguía en 95%.
   Las dos se resolvieron a mano, cada una con su parche distinto. La tercera
   iba a caer igual.

   LA SALIDA, en dos partes:
   1. El techo dejó de ser un muro: por encima de `max` el exceso se comprime
      exponencialmente hacia `techo` sin llegar nunca, así que SIEMPRE queda
      sensibilidad. Por debajo de max no cambia nada — el balance de la zona
      normal de juego quedó igual.
   2. Hay UNA vía para las penalizaciones: resolveShot({penalizaciones}), que
      las aplica como factor sobre la chance ya resuelta. Un factor 0.8 saca el
      20% pase lo que pase, y el desglose viaja en el resultado.

   Corré:  node phaser/test/d2_tope.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var D = require(path.join(__dirname, "..", "logic", "duel.js"));
var P = require(path.join(__dirname, "..", "logic", "partido.js"));
var BAL = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "balance.json"), "utf8"));
var CFG = BAL.duelo;

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* ---------- [1] SIEMPRE HAY SENSIBILIDAD, POR ALTO QUE ESTÉ ---------- */
(function () {
  console.log("sacarle 10 de poder al remate, según la diferencia de fuerza:");
  var muertos = [];
  [0, 20, 26, 40, 60, 80, 120].forEach(function (dif) {
    var a = D.duelChance(50 + dif, 50, CFG);
    var b = D.duelChance(50 + dif - 10, 50, CFG);
    var mueve = (a - b) * 100;
    console.log("   dif " + String(dif).padStart(3) + "   chance " + (a * 100).toFixed(1) + "%   se mueve " + mueve.toFixed(2) + " puntos");
    if (mueve <= 0.001) muertos.push(dif);
  });
  assert(muertos.length === 0,
    "con diferencia de fuerza " + muertos.join(", ") + " la chance NO SE MUEVE al sacarle poder al remate: " +
    "ahí está la trampa de vuelta. Perillas: balance.duelo.techo y balance.duelo.suavidad.");
  console.log("[1] no hay ninguna zona con derivada cero: toda palanca que reste poder se nota");
})();

/* ---------- [2] Y LA VÍA DE FACTORES SE NOTA SIEMPRE ---------- */
(function () {
  console.log("\nun factor de penalización de 0.8, según la diferencia de fuerza:");
  var flojos = [];
  [0, 40, 80, 120].forEach(function (dif) {
    var sin = D.resolveShot({ shotPower: 50 + dif, keeperSkill: 50, zone: {}, cfg: CFG, rng: function () { return 0.5; } });
    var con = D.resolveShot({
      shotPower: 50 + dif, keeperSkill: 50, zone: {}, cfg: CFG, rng: function () { return 0.5; },
      penalizaciones: [{ id: "prueba", factor: 0.8 }]
    });
    var baja = sin.chancePct - con.chancePct;
    console.log("   dif " + String(dif).padStart(3) + "   " + sin.chancePct + "% → " + con.chancePct + "%   (" + baja + " puntos)");
    if (baja < 8) flojos.push(dif + " (" + baja + " puntos)");
  });
  assert(flojos.length === 0,
    "un factor 0.8 tiene que sacar cerca del 20% de la chance SIEMPRE, y con diferencia " + flojos.join(", ") +
    " casi no se notó. Si esto falla, la vía de penalizaciones dejó de ser confiable y volvemos a los parches.");
  console.log("[2] la vía de resolveShot({penalizaciones}) se nota en todo el rango");
})();

/* ---------- [3] EL DESGLOSE ES AUDITABLE ---------- */
(function () {
  var r = D.resolveShot({
    shotPower: 90, keeperSkill: 46, zone: {}, cfg: CFG, distancia: 200, tiro: BAL.tiro,
    rng: function () { return 0.5; },
    penalizaciones: [{ id: "lectura", factor: 0.7 }, { id: "barro", factor: 0.9 }]
  });
  assert(Array.isArray(r.factores) && r.factores.length === 3,
    "el resultado tiene que traer el desglose de factores (distancia + los dos pasados), trajo " +
    (r.factores ? r.factores.length : "nada"));
  var ids = r.factores.map(function (f) { return f.id; });
  assert(ids.indexOf("lectura") >= 0 && ids.indexOf("barro") >= 0 && ids.indexOf("distancia") >= 0,
    "los tres factores tienen que estar identificados (dio " + ids.join(", ") + ")");
  var esperado = r.basePct / 100;
  r.factores.forEach(function (f) { esperado *= f.factor; });
  assert(Math.abs(esperado * 100 - r.chancePct) < 1.5,
    "la chance final tiene que ser la base por todos los factores: " + Math.round(esperado * 100) + " contra " + r.chancePct);
  console.log("[3] desglose auditable: " + r.factores.map(function (f) { return f.id + " x" + f.factor.toFixed(2); }).join(" · ") +
    "  →  " + r.basePct + "% base, " + r.chancePct + "% final");
})();

/* ---------- [4] LA ZONA NORMAL DE JUEGO NO CAMBIÓ ---------- */
(function () {
  /* el arreglo no puede haber movido el balance donde el juego pasa el 90% del
     tiempo: por debajo del tope, la fórmula tiene que dar exactamente lo mismo */
  var difs = [-40, -20, -10, 0, 10, 20, 25];
  var cambios = difs.filter(function (dif) {
    var v = 0.5 + dif / (CFG.spread || 58);
    var viejo = Math.max(CFG.min, Math.min(CFG.max, v));
    var nuevo = D.duelChance(50 + dif, 50, CFG);
    return Math.abs(viejo - nuevo) > 0.0001;
  });
  assert(cambios.length === 0,
    "por debajo del tope la chance tiene que ser IDÉNTICA a la de antes (cambió en dif " + cambios.join(", ") + "): " +
    "si no, el arreglo movió el balance de toda la zona normal de juego.");
  console.log("[4] por debajo del tope no cambió nada: el balance de la zona normal quedó intacto");
})();

/* ---------- [5] LAS DOS PALANCAS QUE YA CAYERON, VERIFICADAS ---------- */
(function () {
  function partido() {
    var mios = [{ nombre: "Arquero", pos: "ARQ" }];
    for (var i = 0; i < 10; i++) mios.push({ nombre: "C" + i, pos: "X" });
    mios[8] = { nombre: "Vos", esVos: true };
    var st = P.crearPartido({ bal: BAL, mios: mios, rivales: [], rng: function () { return 0.5; } });
    st.posesion = "mia";
    return st;
  }
  function gol(x, mega, st) {
    st = st || partido();
    var j = st.mios[st.ctrl];
    j.stats.tiro = 85; j.aguante = BAL.aguante.max; j.x = x; j.y = st.H / 2;
    var p = P.prepararRemate(st, mega || false, function () { return 0.5; });
    return D.resolveShot({
      shotPower: p.shotPower, keeperSkill: p.keeperSkill, zone: { bonus: 0, fuera: 0, gy: 0 },
      cfg: CFG, distancia: p.distancia, especial: p.especial, tiro: BAL.tiro,
      penalizaciones: p.penalizaciones, rng: function () { return 0.5; }
    }).chancePct;
  }
  /* G1: la distancia */
  var area = gol(1050 - 60), medio = gol(525);
  assert(medio < area * 0.3,
    "G1 tiene que seguir valiendo: desde media cancha (" + medio + "%) contra el área chica (" + area + "%)");
  /* N2: la lectura, ahora por la vía de factores */
  var st = partido();
  var primero = gol(1050 - 260, { id: "tornado", mult: 1.6 }, st);
  for (var k = 0; k < 5; k++) { st.minuto = k * 3; gol(1050 - 260, { id: "tornado", mult: 1.6 }, st); }
  st.minuto = 15;
  var leido = gol(1050 - 260, { id: "tornado", mult: 1.6 }, st);
  assert(leido < primero - 8,
    "N2 tiene que seguir valiendo por la vía nueva: primer uso " + primero + "%, leído " + leido + "%");
  console.log("[5] las dos palancas que cayeron en la trampa siguen funcionando: distancia " +
    area + "%→" + medio + "% · lectura " + primero + "%→" + leido + "%");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
