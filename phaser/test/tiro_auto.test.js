/* PAMPA STAR · test del TIRO TSUBASA (V8 B) — sin minijuego: la zona y la
   fuerza salen de DÓNDE disparás, el cansancio, la puntería y los defensores.
   node phaser/test/tiro_auto.test.js */
"use strict";
const path = require("path");
const T = require(path.join(__dirname, "..", "logic", "tiro.js"));

let ok = 0, mal = 0;
function assert(cond, msg) { if (cond) ok++; else { mal++; console.error("✗ " + msg); } }
const base = { W: 1050, H: 680, arcoMedio: 55 };
const fijo = (v) => () => v;   // rng determinista para los asserts duros

/* --- la UBICACIÓN es lo decisivo --- */
const cerquita = T.tiroAuto(Object.assign({ x: 990, y: 340, statTiro: 60, aguanteFrac: 1, defensores: 0, rng: fijo(0.5) }, base));
const lejos = T.tiroAuto(Object.assign({ x: 560, y: 340, statTiro: 60, aguanteFrac: 1, defensores: 0, rng: fijo(0.5) }, base));
assert(cerquita.ajustePoder > lejos.ajustePoder, "de cerca el tiro sale MÁS fuerte (" + cerquita.ajustePoder + " vs " + lejos.ajustePoder + ")");
assert(cerquita.lectura.cerca > lejos.lectura.cerca, "la lectura refleja la distancia");
const centrado = T.tiroAuto(Object.assign({ x: 900, y: 340, statTiro: 60, aguanteFrac: 1, rng: fijo(0.5) }, base));
const alBorde = T.tiroAuto(Object.assign({ x: 900, y: 40, statTiro: 60, aguanteFrac: 1, rng: fijo(0.5) }, base));
assert(centrado.ajustePoder > alBorde.ajustePoder, "de frente pega mejor que desde la banda");
assert(centrado.lectura.calidad > alBorde.lectura.calidad, "de frente la jugada es de mejor calidad");

/* --- el CANSANCIO y la PUNTERÍA pesan --- */
const entero = T.tiroAuto(Object.assign({ x: 900, y: 340, statTiro: 80, aguanteFrac: 1, rng: fijo(0.5) }, base));
const fundido = T.tiroAuto(Object.assign({ x: 900, y: 340, statTiro: 80, aguanteFrac: 0.1, rng: fijo(0.5) }, base));
assert(fundido.riesgoFuera > entero.riesgoFuera, "cansado, más riesgo de irse afuera (" + fundido.riesgoFuera.toFixed(2) + " vs " + entero.riesgoFuera.toFixed(2) + ")");
const torpe = T.tiroAuto(Object.assign({ x: 900, y: 340, statTiro: 20, aguanteFrac: 1, rng: fijo(0.5) }, base));
assert(torpe.riesgoFuera > entero.riesgoFuera, "sin puntería, más riesgo de irse afuera");

/* --- los DEFENSORES en el camino estorban --- */
const solo = T.tiroAuto(Object.assign({ x: 900, y: 340, statTiro: 60, aguanteFrac: 1, defensores: 0, rng: fijo(0.5) }, base));
const entreTres = T.tiroAuto(Object.assign({ x: 900, y: 340, statTiro: 60, aguanteFrac: 1, defensores: 3, rng: fijo(0.5) }, base));
assert(entreTres.ajustePoder < solo.ajustePoder - 10, "3 defensores restan de verdad (" + entreTres.ajustePoder + " vs " + solo.ajustePoder + ")");
assert(entreTres.riesgoFuera > solo.riesgoFuera, "con defensores, más chance de que se desvíe");
assert(entreTres.lectura.defensores === 3 && T.tiroAuto(Object.assign({ x: 900, y: 340, defensores: 9, rng: fijo(0.5) }, base)).lectura.defensores === 3, "los defensores se topean en 3");

/* --- la ZONA la elige el JUEGO (nadie la toca) y es coherente --- */
const zonas = {};
for (let i = 0; i < 400; i++) {
  const r = T.tiroAuto(Object.assign({ x: 700 + (i % 300), y: 100 + (i % 480), statTiro: 40 + (i % 55), aguanteFrac: (i % 10) / 10, defensores: i % 4, rng: (() => { let s = i + 1; return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); })() }, base));
  zonas[r.zona.id] = (zonas[r.zona.id] || 0) + 1;
  assert(Number.isFinite(r.ajustePoder) && Number.isFinite(r.riesgoFuera) && r.zona.gy !== undefined, "salida sana en i=" + i);
  assert(r.riesgoFuera >= 0 && r.riesgoFuera <= 0.55, "riesgo acotado en i=" + i);
}
assert(Object.keys(zonas).length >= 3, "el juego usa varias zonas según la situación: " + JSON.stringify(zonas));
/* de muy cerca y de frente, casi nunca la tira al medio flojito */
let alMedio = 0;
for (let i = 0; i < 200; i++) {
  const r = T.tiroAuto(Object.assign({ x: 1000, y: 340, statTiro: 85, aguanteFrac: 1, defensores: 0, rng: (() => { let s = i + 7; return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); })() }, base));
  if (r.zona.id === "medio") alMedio++;
}
assert(alMedio < 10, "mano a mano con todo a favor casi nunca sale un tiro flojo al medio (" + alMedio + "/200)");

/* --- determinismo con rng fijo --- */
const a = T.tiroAuto(Object.assign({ x: 880, y: 300, statTiro: 70, aguanteFrac: 0.8, defensores: 1, rng: fijo(0.33) }, base));
const b = T.tiroAuto(Object.assign({ x: 880, y: 300, statTiro: 70, aguanteFrac: 0.8, defensores: 1, rng: fijo(0.33) }, base));
assert(JSON.stringify(a) === JSON.stringify(b), "mismo escenario + mismo azar → mismo tiro");

if (mal === 0) console.log("✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
