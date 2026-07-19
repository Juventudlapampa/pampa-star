/* PAMPA STAR · test del JUGADÓN (V8 §3) — fichas, cartas, lectura mutua sin
   trampa, y la FÍSICA del súper tiro (geometría + fuerza vs manos, no dados).
   node phaser/test/jugadon.test.js */
"use strict";
const path = require("path");
const J = require(path.join(__dirname, "..", "logic", "jugadon.js"));

let ok = 0, mal = 0;
function assert(cond, msg) { if (cond) ok++; else { mal++; console.error("✗ " + msg); } }

/* --- las FICHAS: 6 por partido, se gastan y se acaban --- */
const f = J.fichasNuevas();
assert(f.quites === 2 && f.gambetas === 2 && f.tiros === 2, "6 fichas: 2+2+2");
assert(J.gastarFicha(f, "tiros") && J.gastarFicha(f, "tiros"), "los 2 súper tiros se gastan");
assert(!J.gastarFicha(f, "tiros"), "el tercero NO existe");
assert(f.gambetas === 2, "gastar tiros no toca gambetas");

/* --- la CARTA: un random tiene poco, un crack tiene más --- */
assert(J.opcionesDe(40).length === 2, "jugador random: solo izquierda/derecha");
assert(J.opcionesDe(75).some(m => m.id === "canio"), "con 75 de gambeta aparece el caño");
assert(J.opcionesDe(90).length === 5, "el crack tiene la carta completa");

/* --- LECTURA MUTUA sin trampa: el cierre se declara ANTES y sin ver tu movida --- */
const r1 = J.rng(42);
const c1 = J.elegirCierre({ quite: 55 }, r1);
assert(J.CIERRES.some(c => c.id === c1.id), "el cierre sale del catálogo (por stats+azar)");
assert(String(J.elegirCierre).indexOf("movida") < 0, "elegirCierre NO recibe la movida del jugador (sin espejo)");
/* la matriz: leer bien gana */
const rOk = J.rng(1);
const mAlta = { gambeta: 95 }, dBajo = { quite: 20 };
const res1 = J.resolverMovida("der", { id: "cierra_izq", n: "" }, mAlta, dBajo, rOk);
assert(res1.gana, "cierra la izquierda + vos vas a la derecha = lo pasás");
const res2 = J.resolverMovida("izq", { id: "cierra_izq", n: "" }, { gambeta: 50 }, { quite: 50 }, J.rng(2));
assert(!res2.gana || res2.margen > 0.38, "ir justo adonde te cierran solo pasa con jerarquía enorme");
const res3 = J.resolverMovida("sombrerito", { id: "se_tira", n: "" }, mAlta, dBajo, J.rng(3));
assert(res3.gana, "se tira al piso + sombrerito = por arriba");

/* --- la PLATAFORMA: cancha más ancha que larga, ves cuántos vienen --- */
const g = J.crearGambeta({ semilla: 5, marcadores: 2, atacante: { gambeta: 88 }, defensores: [{ quite: 50 }, { quite: 70 }] });
assert(g.W > g.H, "la plataforma es más ANCHA que larga");
assert(g.defensores.length === 2 && g.defensores[0].cierre, "los 2 marcadores vienen con intención declarada (insinuable)");
assert(g.opciones.length === 5, "el crack entra con la carta completa");
const cr1 = J.cruceGambeta(g, g.defensores[0].cierre.id === "cierra_izq" ? "der" : (g.defensores[0].cierre.id === "cierra_der" ? "izq" : (g.defensores[0].cierre.id === "firme" ? "canio" : "sombrerito")));
assert(cr1 !== null && typeof cr1.gana === "boolean", "el cruce resuelve");

/* --- el SÚPER QUITE: espejo defensivo con la misma lectura --- */
const q = J.crearQuite({ semilla: 9, defensor: { quite: 85 }, rival: { gambeta: 40 } });
assert(q.movidaRival && q.movidaRival.id, "la movida del rival se insinúa");
const rq = J.resolverQuite(q, q.movidaRival.id === "izq" ? "cierra_izq" : (q.movidaRival.id === "der" ? "cierra_der" : "firme"));
assert(typeof rq.gana === "boolean", "el quite resuelve por lectura");

/* ============ LA FÍSICA DEL SÚPER TIRO (lo clave del doc) ============ */
function muchas(opts, n) {
  const out = { gol: 0, atajada: 0, rebote: 0, afuera: 0 };
  for (let s = 1; s <= n; s++) out[J.resolverSuperTiro(Object.assign({}, opts, { semilla: s })).outcome]++;
  return out;
}
/* 1) GEOMETRÍA no dados: al ángulo contra arquero que no llega = gol SIEMPRE que la embocás */
const angulo = muchas({ fuerza: 95, precision: 95, zona: { x: 195, y: 130 }, arquero: { reflejos: 40, manos: 40 } }, 200);
assert(angulo.gol > angulo.atajada * 2 && angulo.gol > 90, "al ángulo con técnica, el arquero flojo casi nunca llega (" + angulo.gol + " goles vs " + angulo.atajada + " atajadas)");
/* 2) al MEDIO con fuerza normal, el arquero decente la ataja casi siempre */
const alMedio = muchas({ fuerza: 55, precision: 80, zona: { x: 0, y: 20 }, arquero: { reflejos: 75, manos: 80 } }, 200);
assert(alMedio.atajada > alMedio.gol * 2, "al medio flojito, el arquero la come (" + alMedio.atajada + " atajadas vs " + alMedio.gol + " goles)");
/* 3) LE REVIENTA LAS MANOS: fuerza brutal contra manos flojas = goles/rebotes aunque llegue */
const brutal = muchas({ fuerza: 170, precision: 85, zona: { x: 60, y: 40 }, arquero: { reflejos: 80, manos: 45 } }, 300);
assert(brutal.gol + brutal.rebote > brutal.atajada, "la fuerza le revienta las manos (" + (brutal.gol + brutal.rebote) + " pasan vs " + brutal.atajada + " retiene)");
assert(brutal.rebote > 0, "existe el REBOTE vivo (se le escapa)");
/* 4) el NIVEL del arquero importa: mismo tiro, más reflejos = más atajadas */
const vsMalo = muchas({ fuerza: 75, precision: 75, zona: { x: 120, y: 60 }, arquero: { reflejos: 30, manos: 55 } }, 300);
const vsCrack = muchas({ fuerza: 75, precision: 75, zona: { x: 120, y: 60 }, arquero: { reflejos: 92, manos: 85 } }, 300);
assert(vsCrack.atajada > vsMalo.atajada * 1.5, "el arquero crack ataja MUCHO más el mismo tiro (" + vsCrack.atajada + " vs " + vsMalo.atajada + ")");
/* 5) la PRECISIÓN importa: ambicioso sin técnica se va afuera seguido */
const torpe = muchas({ fuerza: 90, precision: 25, zona: { x: 195, y: 135 }, arquero: { reflejos: 60, manos: 60 } }, 300);
const fino = muchas({ fuerza: 90, precision: 95, zona: { x: 195, y: 135 }, arquero: { reflejos: 60, manos: 60 } }, 300);
assert(torpe.afuera > fino.afuera * 2, "al ángulo sin técnica se va afuera (" + torpe.afuera + " vs " + fino.afuera + ")");
/* 6) el arquero NUNCA adivina exacto (error mínimo garantizado) */
let adivinadas = 0;
for (let s = 1; s <= 200; s++) {
  const res = J.resolverSuperTiro({ fuerza: 60, precision: 90, zona: { x: 150, y: 30 }, arquero: { reflejos: 99, manos: 90 }, semilla: s });
  if (res.detalle && res.detalle.arqX !== undefined && Math.abs(res.detalle.arqX - 150) < 1) adivinadas++;
}
assert(adivinadas < 20, "ni el arquero 99 adivina la zona exacta (cayó clavado " + adivinadas + "/200 veces, por azar acotado)");
/* 7) determinista con semilla */
const d1 = J.resolverSuperTiro({ fuerza: 80, precision: 80, zona: { x: 100, y: 50 }, arquero: { reflejos: 70, manos: 70 }, semilla: 77 });
const d2 = J.resolverSuperTiro({ fuerza: 80, precision: 80, zona: { x: 100, y: 50 }, arquero: { reflejos: 70, manos: 70 }, semilla: 77 });
assert(JSON.stringify(d1) === JSON.stringify(d2), "misma semilla → mismo resultado (testeable)");

if (mal === 0) console.log("✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
