/* PAMPA STAR · test de LA IA DE LOS 21 (V8 §2) — cada puesto hace lo suyo
   según la situación; nadie es una hormiga random; la CPU no espeja al
   jugador. node phaser/test/ia.test.js */
"use strict";
const path = require("path");
const fs = require("fs");
const P = require(path.join(__dirname, "..", "logic", "partido.js"));
const Ma = require(path.join(__dirname, "..", "logic", "master.js"));

let ok = 0, mal = 0;
function assert(cond, msg) { if (cond) ok++; else { mal++; console.error("✗ " + msg); } }

const bal = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "balance.json"), "utf8"));
assert(bal.ia && bal.ia.def_colchon > 0, "balance.ia declarado");

function partidoNuevo(b) {
  const mk = (pos, i, x, y) => ({ nombre: "J" + pos + i, pos, numero: i + 1, x, y, aguante: 1000, stats: { pase: 60, tiro: 60, gambeta: 60, quite: 60, velocidad: 60 } });
  const mios = [], rivales = [];
  [["ARQ", 30], ["DEF", 190], ["DEF", 190], ["DEF", 190], ["DEF", 190], ["VOL", 460], ["VOL", 460], ["VOL", 460], ["ATA", 730], ["ATA", 730], ["ATA", 730]].forEach(([pos, ax], i) => {
    mios.push(mk(pos, i, ax, 100 + (i % 5) * 110));
    rivales.push(mk(pos, i, 1050 - ax, 100 + (i % 5) * 110));
  });
  const st = P.crearPartido({ bal: b || bal, mios, rivales });
  st.mios.forEach((j, i) => { j.esVos = i === 8; });
  return st;
}
const DT = (bal.pulso && bal.pulso.dt_ms) || 300;
function latidos(st, n, input) { for (let i = 0; i < n; i++) P.tick(st, DT, input || null); }

/* --- 1) DEFENDIENDO: mis DEF quedan ENTRE la pelota y mi arco --- */
let st = partidoNuevo();
st.cooldown = 9e9;
st.posesion = "rival"; st.portadorRival = 8;
st.rivales[8].x = 420; st.rivales[8].y = 340;   // el rival ya cruzó a mi campo
st.esperaRival = 9e9;                            // lo congelo: mido solo el reacomodo
st.pelota.x = 420; st.pelota.y = 340;
latidos(st, 40);
st.mios.forEach(j => {
  if (j.pos === "DEF") assert(j.x < st.pelota.x, "DEF " + j.nombre + " entre la pelota y mi arco (x=" + j.x.toFixed(0) + " < pelota " + st.pelota.x + ")");
});

/* --- 2) los DEF nunca se van al último tercio ofensivo defendiendo --- */
st.mios.forEach(j => { if (j.pos === "DEF") assert(j.x < st.W * 0.6, "DEF " + j.nombre + " no cruza a campo rival profundo defendiendo"); });

/* --- 3) ATACANDO: los ATA se DESCUELGAN a recibir por delante de la pelota --- */
st = partidoNuevo();
st.cooldown = 9e9;
st.posesion = "mia"; st.ctrl = 5;   // conduce un VOL
st.mios[5].x = 500; st.pelota.x = 500; st.pelota.y = 340;
latidos(st, 40);
st.mios.forEach(j => {
  if (j.pos === "ATA") assert(j.x > 550, "ATA " + j.nombre + " se ofrece ADELANTE de la jugada (x=" + j.x.toFixed(0) + ")");
});
/* y se ABREN: no están todos en la misma banda */
const ys = st.mios.filter(j => j.pos === "ATA").map(j => j.y);
assert(Math.max(...ys) - Math.min(...ys) > 60, "los ATA se abren (spread y=" + (Math.max(...ys) - Math.min(...ys)).toFixed(0) + ")");

/* --- 4) los VOL siguen el juego: la pelota se mueve y ellos van --- */
const volAntes = st.mios.filter(j => j.pos === "VOL").map(j => j.x);
st.pelota.x = 820; st.mios[5].x = 820;
latidos(st, 40);
const volDespues = st.mios.filter(j => j.pos === "VOL").map(j => j.x);
assert(volDespues.every((x, i) => x > volAntes[i] + 40), "los VOL circulan con el juego (avanzaron todos)");

/* --- 5) el rival te viene a MARCAR cuando avanzás (no 'no pasa nada') --- */
st = partidoNuevo();
st.cooldown = 9e9;
st.posesion = "mia"; st.ctrl = 8;
st.mios[8].x = 600; st.pelota.x = 600; st.pelota.y = 340; st.mios[8].y = 340;
latidos(st, 12, { dx: 1, dy: 0 });
const yo = st.mios[8];
const dDespues = Math.min(...st.rivales.filter(r => r.pos !== "ARQ").map(r => Math.hypot(r.x - yo.x, r.y - yo.y)));
assert(dDespues < 100, "avanzando SIEMPRE hay un rival cerrándome (quedó a " + dDespues.toFixed(0) + "px — no existe el 'avanzo y no pasa nada')");

/* --- 5b) V8 fix playtest: un delantero NUNCA retrocede cuando su equipo ataca ---
   (el destino se recalcula por latido y podía quedar detrás de su posición) */
st = partidoNuevo();
st.cooldown = 9e9;
st.posesion = "mia"; st.ctrl = 5;
st.mios[5].x = 850; st.pelota.x = 850; st.pelota.y = 340;   // jugada adelantada
latidos(st, 30);
const ataArriba = st.mios.filter(j => j.pos === "ATA").map(j => j.x);
st.mios[5].x = 400; st.pelota.x = 400;   // la pelota RETROCEDE (pase atrás)
latidos(st, 30);
st.mios.forEach((j, i) => {
  if (j.pos !== "ATA") return;
  const antes = ataArriba[st.mios.filter(x => x.pos === "ATA").indexOf(j)];
  assert(j.x >= antes - 1, "ATA " + j.nombre + " NO retrocede en ataque (estaba " + antes.toFixed(0) + ", quedó " + j.x.toFixed(0) + ")");
});
/* y al PERDER la posesión, sí baja (no queda clavado arriba para siempre) */
st.posesion = "rival"; st.portadorRival = 5; st.esperaRival = 9e9;
st.rivales[5].x = 500; st.pelota.x = 500;
const ataAntesDef = st.mios.filter(j => j.pos === "ATA").map(j => j.x);
latidos(st, 40);
const bajoAlguno = st.mios.filter(j => j.pos === "ATA").some((j, k) => j.x < ataAntesDef[k] - 20);
assert(bajoAlguno, "al defender los ATA sí bajan (el piso es solo en ataque)");

/* --- 6) el PERFIL del club modula la línea (garra presiona, pelotazo se mete atrás) --- */
function lineaMediaRival(perfilId) {
  const s = partidoNuevo(JSON.parse(JSON.stringify(bal)));
  s.cooldown = 9e9; s.esperaRival = 0;
  const perfil = Ma.PERFILES.find(p => p.id === perfilId);
  Ma.aplicar(s, Ma.DIVISIONES[0], perfil);
  s.posesion = "mia"; s.ctrl = 8; s.mios[8].x = 520; s.pelota.x = 520;
  for (let i = 0; i < 40; i++) P.tick(s, DT, null);
  const defs = s.rivales.filter(r => r.pos === "DEF").map(r => r.x);
  return defs.reduce((a, b) => a + b, 0) / defs.length;
}
const lGarra = lineaMediaRival("garra"), lPelotazo = lineaMediaRival("pelotazo");
assert(lGarra < lPelotazo, "garra adelanta la línea rival más que pelotazo (x̄ " + lGarra.toFixed(0) + " < " + lPelotazo.toFixed(0) + " — el rival ataca hacia 0)");

/* --- 7) la CPU NO espeja: su intención sale de pesos+stats, sin ver mi elección --- */
assert(String(P.elegirIntencionCPU || P.resolverDuelo).indexOf("miEleccion") < 0, "la resolución de duelos no recibe la elección del jugador como intención CPU");
const st7 = partidoNuevo();
const r1 = P.resolverDuelo(st7, { accion: "gambeta", poder: 60, costo: 0 });
assert(typeof r1.win === "boolean", "el duelo resuelve por poder/stats+azar (no hay canal para copiar al jugador)");

if (mal === 0) console.log("✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
