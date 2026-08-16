/* ============================================================================
   PAMPA STAR · test de la lógica de duelo (node, sin dependencias)
   Corré:  node phaser/test/duel.test.js
   Cubre el BUG CRÍTICO del playtest: "el arquero atajó y marcó gol igual".

   EL INVARIANTE, en su forma de hoy. Era  keeperWins <=> outcome != 'gol',
   pero esa forma ya no alcanza desde que el no-gol se reparte en tres
   (G1: 'atajada' = la agarró, 'corner' = la sacó pero se le escapó, 'afuera').
   keeperWins significa "el arquero SE QUEDA con la pelota", y con un córner no
   se queda. Lo que se prueba, entonces:
       outcome === 'gol'   ⇒  keeperWins === false      (el bug, cerrado)
       keeperWins === true ⇒  outcome === 'atajada'     (nada más se la queda)
   Es más fuerte que antes, no más flojo: la implicación de la izquierda sigue
   igual y la de la derecha pasó de "cualquier no-gol" a un único outcome.
   ========================================================================== */
"use strict";
var D = require("../logic/duel.js");

var pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.error("  ✗ FALLA: " + msg); } }

/* rng determinista: devuelve los valores de la lista, en orden (loop). */
function seq(vals) { var i = 0; return function () { return vals[i++ % vals.length]; }; }

/* ---- 1) El invariante duro: si el arquero gana, NUNCA hay gol --------------- */
(function () {
  // arquero dominante (keeperSkill altísimo): la chance es baja; con rolls altos, siempre atajada.
  var goles = 0, total = 2000, cuenta = {};
  for (var i = 0; i < total; i++) {
    var r = D.resolveShot({ shotPower: 40, keeperSkill: 95, zone: { bonus: 0, fuera: 0, gy: 0 }, rng: Math.random });
    if (r.keeperWins) ok(r.outcome === "atajada", "keeperWins=true con outcome=" + r.outcome + " (EL BUG)");
    if (r.outcome === "gol") ok(r.keeperWins === false, "outcome=gol pero keeperWins=true (EL BUG)");
    if (r.outcome === "gol") goles++;
    cuenta[r.outcome] = (cuenta[r.outcome] || 0) + 1;
  }
  ok(goles < total, "con un arquero dominante deberían atajarse casi todos (hubo " + goles + "/" + total + " goles)");
  console.log("[1] invariante gol⇒!keeperWins y keeperWins⇒atajada: verificado en " + total + " tiros · " +
    Object.keys(cuenta).map(function (k) { return k + " " + cuenta[k]; }).join(" · "));
})();

/* ---- 2) Forzar el no-gol: roll alto ⇒ el arquero llegó ⇒ jamás gol --------- */
(function () {
  /* rolls: [ganó el tiro?] [se fue afuera?] [la retuvo?]
     0.999 pierde el primero (no hay gol). Sin distancia el "afuera de lejos"
     es 0, así que el tercero decide agarrada vs córner. */
  var agarro = D.resolveShot({ shotPower: 60, keeperSkill: 55, zone: { bonus: 0, fuera: 0.5, gy: 0 }, rng: seq([0.999, 0.5, 0.01]) });
  ok(agarro.outcome === "atajada", "roll bajo de retención debe ser atajada (la agarró), fue " + agarro.outcome);
  ok(agarro.keeperWins === true, "atajada debe marcar keeperWins=true");

  var corner = D.resolveShot({ shotPower: 60, keeperSkill: 55, zone: { bonus: 0, fuera: 0.5, gy: 0 }, rng: seq([0.999, 0.5, 0.999]) });
  ok(corner.outcome === "corner", "roll alto de retención debe ser córner (la sacó), fue " + corner.outcome);
  ok(corner.keeperWins === false, "el córner NO es keeperWins: la pelota no se la queda el arquero");
  console.log("[2] no-gol desdoblado: la agarró (keeperWins) vs la sacó al córner (no): ok");
})();

/* ---- 2b) La fuerza decide si la agarra o se le escapa ---------------------- */
(function () {
  /* mismo arquero, dos remates: el flojo lo abraza, el fuerte se le va */
  /* Se compara la PROPORCIÓN de córners sobre los NO-GOLES, no el número
     absoluto. En absoluto se mezclan dos cosas: un remate flojo produce muchos
     más no-goles que uno fuerte, así que puede acumular tantos córners como el
     fuerte aunque los retenga mejor. Lo que dice la regla es "de las que le
     llegan, las fuertes se le escapan más", y eso es una proporción. */
  var n = 3000, cta = { flojo: { corner: 0, nogol: 0 }, fuerte: { corner: 0, nogol: 0 } };
  for (var i = 0; i < n; i++) {
    var f = D.resolveShot({ shotPower: 20, keeperSkill: 95, zone: {}, rng: Math.random });
    var g = D.resolveShot({ shotPower: 88, keeperSkill: 95, zone: {}, rng: Math.random });
    if (f.outcome !== "gol") { cta.flojo.nogol++; if (f.outcome === "corner") cta.flojo.corner++; }
    if (g.outcome !== "gol") { cta.fuerte.nogol++; if (g.outcome === "corner") cta.fuerte.corner++; }
  }
  var pFlojo = cta.flojo.corner / Math.max(1, cta.flojo.nogol);
  var pFuerte = cta.fuerte.corner / Math.max(1, cta.fuerte.nogol);
  ok(pFuerte > pFlojo + 0.05,
    "de los remates que NO son gol, al fuerte se le tiene que escapar al córner más seguido que al flojo " +
    "(fuerte " + (pFuerte * 100).toFixed(0) + "% vs flojo " + (pFlojo * 100).toFixed(0) + "%)");
  console.log("[2b] de los no-goles van al córner: fuerte " + (pFuerte * 100).toFixed(0) +
    "% · flojo " + (pFlojo * 100).toFixed(0) + "%");
})();

/* ---- 3) Forzar GOL: roll bajo y sin 'afuera' ⇒ gol, arquero NO gana -------- */
(function () {
  var r = D.resolveShot({ shotPower: 60, keeperSkill: 40, zone: { bonus: 0, fuera: 0, gy: 44 }, rng: seq([0.01]) });
  ok(r.outcome === "gol", "roll=0.01 sin fuera debe ser gol, fue " + r.outcome);
  ok(r.keeperWins === false, "gol debe marcar keeperWins=false");
  ok(r.gy === 44, "gy debe viajar tal cual de la zona (44), fue " + r.gy);
  console.log("[3] roll bajo ⇒ gol, keeperWins=false, gy propagado: ok");
})();

/* ---- 4) La esquina puede irse AFUERA (ganaba el tiro pero se fue) ---------- */
(function () {
  // primer rng (0.01) hace ganar el tiro; segundo (0.01 < fuera 0.9) lo manda afuera.
  var r = D.resolveShot({ shotPower: 80, keeperSkill: 30, zone: { bonus: 6, fuera: 0.9, gy: -44 }, rng: seq([0.01, 0.01]) });
  ok(r.outcome === "afuera", "debía irse afuera, fue " + r.outcome);
  ok(r.keeperWins === false, "afuera NO es atajada (el arquero no la toca)");
  console.log("[4] esquina afuera: outcome=afuera, keeperWins=false: ok");
})();

/* ---- 5) chancePct coherente y acotado ------------------------------------- */
(function () {
  var a = D.resolveShot({ shotPower: 200, keeperSkill: 0, zone: {}, rng: seq([0.5]) });
  var b = D.resolveShot({ shotPower: 0, keeperSkill: 200, zone: {}, rng: seq([0.5]) });
  /* D2: el techo dejó de ser 0.95 duro. Por encima de max el exceso se comprime
     hacia `techo` (0.99) sin llegar nunca, para que siempre quede sensibilidad
     — con el clamp viejo, cualquier penalización que restara poder en la zona
     alta no movía la chance ni un punto. Lo que sigue valiendo es que nunca hay
     100% ni 0%: la épica del "¿entra?" no se toca. */
  ok(a.chancePct < 100 && a.chancePct >= 7, "la chance nunca llega a 100 (fue " + a.chancePct + ")");
  ok(b.chancePct < 100 && b.chancePct >= 7, "la chance nunca baja del piso (fue " + b.chancePct + ")");
  ok(a.chancePct > 95, "con poder abrumador la chance pasa de 95 pero se comprime (fue " + a.chancePct + ")");
  console.log("[5] chancePct sin 0% ni 100%, con compresión arriba: ok (" + a.chancePct + " / " + b.chancePct + ")");
})();

/* ---- resumen -------------------------------------------------------------- */
console.log("\n" + (fail === 0 ? "✓ TODOS OK" : "✗ HUBO FALLAS") + " — " + pass + " asserts pasaron, " + fail + " fallaron.");
process.exit(fail === 0 ? 0 : 1);
