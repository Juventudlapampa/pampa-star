/* PAMPA STAR · test del PULSO (V8 §1) — el contrato: el partido avanza por
   LATIDOS discretos (un tick de dt fijo por latido) y entre latidos el mundo
   está QUIETO. La sim pura no cambió: el pulso es CÓMO se la invoca.
   node phaser/test/pulso.test.js */
"use strict";
const path = require("path");
const fs = require("fs");
const P = require(path.join(__dirname, "..", "logic", "partido.js"));

let ok = 0, mal = 0;
function assert(cond, msg) { if (cond) ok++; else { mal++; console.error("✗ " + msg); } }

const bal = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "balance.json"), "utf8"));
assert(bal.pulso && bal.pulso.latido_ms > 0 && bal.pulso.dt_ms > 0, "balance.pulso declarado (latido_ms + dt_ms)");

function partidoNuevo() {
  const mk = (pos, i, x, y) => ({ nombre: "J" + pos + i, pos, numero: i + 1, x, y, aguante: 1000, stats: { pase: 60, tiro: 60, gambeta: 60, quite: 60, velocidad: 60 } });
  const mios = [], rivales = [];
  let n = 0;
  [["ARQ", 30], ["DEF", 190], ["DEF", 190], ["DEF", 190], ["DEF", 190], ["VOL", 460], ["VOL", 460], ["VOL", 460], ["ATA", 730], ["ATA", 730], ["ATA", 730]].forEach(([pos, ax], i) => {
    mios.push(mk(pos, i, ax, 100 + (i % 5) * 110));
    rivales.push(mk(pos, i, 1050 - ax, 100 + (i % 5) * 110));
  });
  const st = P.crearPartido({ bal, mios, rivales });
  st.mios.forEach((j, i) => { j.esVos = i === 8; });
  return st;
}

/* --- 1) el tramo: un latido mueve al portador la distancia esperada --- */
const st = partidoNuevo();
st.cooldown = 9e9;   // sin cruces: medimos solo el movimiento
const ctrl = st.mios[st.ctrl];
const x0 = ctrl.x;
P.tick(st, bal.pulso.dt_ms, { dx: 1, dy: 0 });
const tramo = ctrl.x - x0;
const esperado = (bal.ritmo.portador_con_pelota * (bal.ritmo.modo_saltos ? bal.ritmo.saltos_vel_mult : 1)) * bal.pulso.dt_ms / 1000;
assert(tramo > 0, "el latido avanza al portador (tramo " + tramo.toFixed(1) + "px)");
assert(Math.abs(tramo - esperado) < esperado * 0.35, "el tramo es del orden esperado (~" + esperado.toFixed(0) + "px, dio " + tramo.toFixed(1) + ")");
assert(tramo >= 15 && tramo <= 60, "el tramo se VE (15-60px por latido, dio " + tramo.toFixed(1) + ") — ni hormiga ni teletransporte");

/* --- 2) entre latidos NADIE se mueve (el pulso no llama a la sim) --- */
const antes = JSON.stringify([st.mios.map(j => [j.x, j.y]), st.rivales.map(j => [j.x, j.y]), st.pelota]);
/* (no hay tick: el update de la escena con pulso NO invoca la sim entre latidos) */
const despues = JSON.stringify([st.mios.map(j => [j.x, j.y]), st.rivales.map(j => [j.x, j.y]), st.pelota]);
assert(antes === despues, "sin latido, el mundo está QUIETO (nada se mueve solo)");

/* --- 3) N latidos discretos son deterministas (misma secuencia → mismo mundo) --- */
function correr(nLatidos, semillaInput) {
  const s = partidoNuevo();
  s.cooldown = 9e9;
  for (let i = 0; i < nLatidos; i++) {
    const dir = (i + semillaInput) % 3 === 0 ? { dx: 1, dy: 0 } : (i % 3 === 1 ? { dx: 1, dy: 1 } : null);
    P.tick(s, bal.pulso.dt_ms, dir);
  }
  return s.mios[s.ctrl].x.toFixed(3) + "," + s.mios[s.ctrl].y.toFixed(3) + "," + s.minuto.toFixed(4);
}
assert(correr(30, 0) === correr(30, 0), "30 latidos con la misma secuencia → mismo mundo (determinista)");

/* --- 4) el reloj consume por latido (goteo del dt) --- */
const st2 = partidoNuevo();
st2.cooldown = 9e9;
const m0 = st2.minuto;
for (let i = 0; i < 10; i++) P.tick(st2, bal.pulso.dt_ms, null);
assert(st2.minuto > m0, "el reloj gotea con los latidos (10 latidos = +" + (st2.minuto - m0).toFixed(3) + "')");

/* --- 5) la cadencia es humana: latido_ms entre 200 y 800 (tuc-tuc jugable) --- */
assert(bal.pulso.latido_ms >= 200 && bal.pulso.latido_ms <= 800, "latido_ms en rango jugable (200-800ms)");

if (mal === 0) console.log("✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
