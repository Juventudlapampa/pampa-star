/* PAMPA STAR · test de "TIRÉ EL CENTRO, MEDIO QUE LE ERRÉ Y IGUAL CABECEÓ"
   Pedido de Rodri del 25/oct: lo que se ve sigue a lo que pasó en EL TOQUE.
   Si no la tocaste, no hay cabezazo: la pelota pasa de largo y la sigue el
   que esté más cerca en la cancha (un rival, un compañero tuyo o el saque de
   arco). node phaser/test/no_llego.test.js */
"use strict";
const path = require("path"), fs = require("fs");
const RAIZ = path.join(__dirname, "..");
const P = require(path.join(RAIZ, "logic", "partido.js"));
const F = require(path.join(RAIZ, "logic", "flujo.js"));
const T = require(path.join(RAIZ, "logic", "toque.js"));
const BAL = JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "balance.json"), "utf8"));
let ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("✗ " + m); } }

/* [1] el tope de contacto: pasada la tolerancia no la tocó */
const C = BAL.toque;
assert(C.contacto_max === 1.0 && C.no_llego_max > C.contacto_max, "contacto_max en 1.0 y no_llego_max arriba (" + C.contacto_max + ", " + C.no_llego_max + ")");
let cuenta = { golpe: 0, no_llego: 0, pifia: 0, se_paso: 0 }, golpesFlojos = 0;
for (let s = 1; s <= 400; s++) {
  const e = T.crearJugada({ semilla: s, cfg: C, jugador: { stats: { tiro: 60, aereo: 60 }, aguanteFrac: 1, pie: "der" } });
  const tGolpe = 0.2 + (s % 9) * 0.12;
  while (!e.fin) { if (!e.golpe && e.t >= tGolpe) T.pegar(e); T.paso(e, 1 / 60, null); }
  cuenta[e.fin.motivo] = (cuenta[e.fin.motivo] || 0) + 1;
  if (e.fin.contacto && e.fin.calidad <= 0) golpesFlojos++;
  if (!e.fin.contacto) assert(e.fin.calidad === 0, "sin contacto la calidad es 0");
}
assert(cuenta.no_llego > 0 && cuenta.golpe > 0, "con golpes al azar hay de todo: " + JSON.stringify(cuenta));
const noLlego = { contacto: false, calidad: 0, tecnica: "cabezazo", motivo: "no_llego", bola: { z: 2 } };
assert(T.zonaDeContacto(noLlego, C).dice === "¡NO LA ALCANZASTE!" && T.zonaDeContacto(noLlego, C, true).dice === "¡NO LA ALCANZÓ!",
  "se dice NO LA ALCANZASTE (y NO LA ALCANZÓ con un compañero)");
assert(T.textoDeContacto(noLlego, C) === "no la alcanzaste" && T.textoDeContacto(noLlego, C, true) === "no la alcanzó", "y el renglón de abajo no nombra un cabezazo que no hubo");
assert(T.zonaDeContacto(noLlego, C).fuera === 1, "sin contacto nunca es gol (fuera 1)");

/* [2] quién la sigue */
function partido() {
  const plantel = [];
  for (let i = 0; i < 11; i++) plantel.push({ nombre: "J" + i, esVos: i === 9 });
  const st = P.crearPartido({ bal: BAL, plantel, rival: "Test" });
  st.posesion = "mia"; st.modo = "congelado"; st.ctrl = 9;
  const c = st.mios[9]; c.x = st.W - 200; c.y = st.H / 2;
  st.mios.forEach((j, i) => { if (i !== 9 && j.pos !== "ARQ") { j.x = 100; j.y = 60; } });
  st.rivales.forEach(r => { if (r.pos !== "ARQ") { r.x = 100; r.y = st.H - 60; } });
  return st;
}
const NL = BAL.flujo.no_llego;
let st = partido();
const iR = st.rivales.findIndex(r => r.pos === "DEF");
st.rivales[iR].x = st.mios[9].x + NL.pasa_px + 20; st.rivales[iR].y = st.H / 2 + 10;
let r = F.quienLaSigue(st);
assert(r.quien === "rival" && r.idx === iR && st.posesion === "rival" && st.portadorRival === iR && st.modo === "juego",
  "con un rival al lado de donde pica, la recupera él (" + JSON.stringify(r) + ")");
assert(st.rivales[st.portadorRival].pos !== "ARQ", "y nunca la levanta el arquero rival por la cancha");

st = partido();
const iM = st.mios.findIndex((j, i) => j.pos === "VOL");
st.mios[iM].x = st.mios[9].x + NL.pasa_px - 30; st.mios[iM].y = st.H / 2 - 20;
r = F.quienLaSigue(st);
assert(r.quien === "mio" && st.posesion === "mia" && st.ctrl === iM && Math.hypot(st.pelota.x - st.mios[iM].x, st.pelota.y - st.mios[iM].y) < 20,
  "con un compañero tuyo que viene, sigue la jugada con él (" + JSON.stringify(r) + ")");

st = partido();
r = F.quienLaSigue(st);
assert(r.quien === "saque" && st.posesion === "rival" && st.rivales[st.portadorRival].pos === "DEF", "sin nadie cerca, saque de arco (y saca corto el arquero)");

/* [3] la escena: sin contacto en el centro no se dispara el remate */
const UI = fs.readFileSync(path.join(RAIZ, "scenes", "toque_ui.js"), "utf8");
const sin = UI.slice(UI.indexOf("toqueSinRemate() {"), UI.indexOf("toqueSinRemate() {") + 900);
assert(/if \(!tq\.propia && FLU && FLU\.activo\(this\.st\) && this\.BAL\.flujo\.no_llego\) \{ this\.toquePasaDeLargo\(tq\); return; \}/.test(sin),
  "en el centro sin contacto la escena va a toquePasaDeLargo, sin cine de remate");
const pasa = UI.slice(UI.indexOf("toquePasaDeLargo(tq) {"), UI.indexOf("toqueSinRemate() {"));
assert(/quienLaSigue\(st\)/.test(pasa) && !/dispararConCine|entrarCine|planoViaje|dispararFirulete/.test(pasa), "y ahí solo se ve la pelota que pasa y quién la sigue");

console.log((mal ? "✗" : "✓") + " no_llego: " + ok + " ok, " + mal + " mal · " + JSON.stringify(cuenta) + " · golpes de calidad 0: " + golpesFlojos);
process.exit(mal ? 1 : 0);
