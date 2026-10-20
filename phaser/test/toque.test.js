/* PAMPA STAR · test de EL TOQUE (playtest del 20/oct, punto 5): la pelota
   viene con su curva y su gravedad, te acomodás y le pegás. Que sea justo:
   leyendo bien se gana seguido, al azar casi nunca, y el crack rinde más.
   node phaser/test/toque.test.js */
"use strict";
const path = require("path");
const fs = require("fs");
const T = require(path.join(__dirname, "..", "logic", "toque.js"));
const BAL = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "balance.json"), "utf8"));
const C = BAL.toque;

let ok = 0, mal = 0;
function assert(cond, msg) { if (cond) ok++; else { mal++; console.error("✗ " + msg); } }

const DT = 1 / 60;
const medio = { tiro: 60, aereo: 60, velocidad: 60 };
function jugada(semilla, stats, pie) {
  return T.crearJugada({ semilla, cfg: C, jugador: { stats: stats || medio, aguanteFrac: 1, pie: pie || "der" } });
}
function gauss(r) { return Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r()); }

/* el que LEE: ve venir la pelota, calcula dónde va a estar y se para con el
   pie hábil; tiene reacción humana y le tiembla un poco el cuerpo y el dedo */
function lector(e, r, ruidoPos, ruidoT, ladoForzado) {
  const tec = e.T.h <= C.tecnicas.remate.h[1] ? "remate" : (e.T.h <= C.tecnicas.volea.h[1] ? "volea" : "cabezazo");
  const t = C.tecnicas[tec];
  const lado = ladoForzado != null ? ladoForzado : e.jug.lado;
  const obj = { x: e.T.x - t.dx + gauss(r) * ruidoPos, z: e.T.z - lado * t.dz + gauss(r) * ruidoPos };
  const ts = e.tT - t.swing + gauss(r) * ruidoT;
  while (!e.fin) {
    if (!e.golpe && e.t >= ts) T.pegar(e);
    T.paso(e, DT, e.t >= C.reaccion_s ? obj : null);
  }
  return e.fin;
}
/* el que NO lee: va a cualquier lado y le pega cuando se le canta */
function alAzar(e, r) {
  const obj = { x: r() * C.cancha.L, z: r() * C.cancha.D };
  const ts = 0.3 + r() * (e.tT + 0.3);
  while (!e.fin) {
    if (!e.golpe && e.t >= ts) T.pegar(e);
    T.paso(e, DT, obj);
  }
  return e.fin;
}

/* --- la pelota: determinista y pasa por donde se la tiró --- */
const a = jugada(77), b = jugada(77);
assert(JSON.stringify(a.T) === JSON.stringify(b.T) && a.tT === b.tT, "misma semilla, misma pelota");
const enT = T.bolaEn(a, a.tT);
assert(Math.abs(enT.x - a.T.x) < 1e-6 && Math.abs(enT.z - a.T.z) < 1e-6 && Math.abs(enT.h - a.T.h) < 1e-6, "la pelota pasa por el punto de llegada a su tiempo");
let curvas = 0;
for (let s = 1; s <= 200; s++) if (Math.abs(jugada(s).curva) > 0.5) curvas++;
assert(curvas > 100, "la mayoría de las pelotas vienen con comba (" + curvas + "/200)");
let piso = true;
for (let s = 1; s <= 100; s++) { const e = jugada(s); for (let t = 0; t < 4; t += 0.05) if (T.bolaEn(e, t).h < 0) piso = false; }
assert(piso, "la pelota nunca atraviesa el piso: pica");

/* --- justo: leyendo bien se gana seguido, al azar casi nunca --- */
const N = 1500;
function tasa(fn, stats, pie) {
  let buenas = 0, justas = 0, suma = 0;
  for (let s = 1; s <= N; s++) {
    const r = T.rng(s * 7919);
    const f = fn(jugada(s, stats, pie), r);
    if (f.calidad >= C.zonas[1].q) buenas++;
    if (f.calidad >= C.zonas[0].q) justas++;
    suma += f.calidad;
  }
  return { buenas: buenas / N, justas: justas / N, media: suma / N };
}
const L = tasa((e, r) => lector(e, r, 0.12, 0.035));
const Z = tasa(alAzar);
assert(L.buenas >= 0.7, "leyendo bien, bien pegada o justa 7 de cada 10 o más (" + L.buenas.toFixed(2) + ")");
assert(L.justas >= 0.3, "leyendo bien, justa 3 de cada 10 o más (" + L.justas.toFixed(2) + ")");
assert(Z.buenas <= 0.08, "al azar, bien pegada menos de 8 de cada 100 (" + Z.buenas.toFixed(3) + ")");
const torpe = tasa((e, r) => lector(e, r, 0.35, 0.09));
assert(torpe.media < L.media - 0.1, "leer a medias rinde menos que leer bien (" + torpe.media.toFixed(2) + " < " + L.media.toFixed(2) + ")");

/* --- el jugador importa: el crack rinde más que el tronco con la misma lectura --- */
const crack = tasa((e, r) => lector(e, r, 0.2, 0.05), { tiro: 90, aereo: 90, velocidad: 90 });
const tronco = tasa((e, r) => lector(e, r, 0.2, 0.05), { tiro: 35, aereo: 35, velocidad: 35 });
assert(crack.media > tronco.media + 0.03, "el crack le pega mejor que el tronco (" + crack.media.toFixed(2) + " > " + tronco.media.toFixed(2) + ")");

/* --- el pie: con la hábil se pega mejor que con la otra --- */
let habil = 0, otro = 0, nh = 0, no = 0;
for (let s = 1; s <= 600; s++) {
  const e1 = jugada(s, medio, "der");
  if (e1.T.h > C.tecnicas.volea.h[1]) continue;
  const f1 = lector(e1, T.rng(s), 0.1, 0.03, 1);
  const f2 = lector(jugada(s, medio, "der"), T.rng(s), 0.1, 0.03, -1);
  if (f1.pie === "habil") { habil += f1.calidad; nh++; }
  if (f2.pie === "otro") { otro += f2.calidad; no++; }
}
assert(nh > 100 && no > 100, "las dos piernas se usan en el test (" + nh + "/" + no + ")");
assert(habil / nh > otro / no + 0.05, "con el pie hábil se pega mejor (" + (habil / nh).toFixed(2) + " > " + (otro / no).toFixed(2) + ")");
const zh = T.zonaDeContacto({ calidad: 0.6, tecnica: "remate", pie: "habil", bola: { z: 3 } }, C);
const zo = T.zonaDeContacto({ calidad: 0.6, tecnica: "remate", pie: "otro", bola: { z: 3 } }, C);
assert(zo.bonus < zh.bonus && zo.fuera > zh.fuera, "la zona con la menos hábil castiga");

/* --- el gesto sale de la altura: si viene alta saltás, de atrás es chilena --- */
let gestos = {};
for (let s = 1; s <= 400; s++) { const f = lector(jugada(s), T.rng(s), 0.05, 0.02); gestos[f.tecnica] = (gestos[f.tecnica] || 0) + 1; }
assert(gestos.remate > 50 && gestos.volea > 50 && gestos.cabezazo > 50, "salen remate, volea y cabezazo según cómo viene (" + JSON.stringify(gestos) + ")");
let chilena = null;
for (let s = 1; s <= 400 && !chilena; s++) {
  const e = jugada(s);
  if (e.T.h <= C.tecnicas.volea.h[1]) continue;
  e.jug.x = e.T.x + 0.6; e.jug.z = e.T.z;   // la pelota le pasa por arriba, por detrás
  while (!e.fin) { if (!e.golpe && e.t >= e.tT - 0.3) T.pegar(e); T.paso(e, DT, null); }
  chilena = e.fin.tecnica === "chilena" ? e.fin : null;
}
assert(chilena, "con la pelota alta por detrás, el gesto es la chilena");

/* --- los extremos --- */
const apurado = jugada(5);
while (!apurado.fin) { if (!apurado.golpe && apurado.t >= 0.05) T.pegar(apurado); T.paso(apurado, DT, null); }
assert(apurado.fin.calidad < C.zonas[2].q, "pegarle apenas sale la pelota es pifia");
const quieto = jugada(6);
while (!quieto.fin) T.paso(quieto, DT, null);
assert(quieto.fin.motivo === "se_paso" && quieto.fin.calidad === 0, "si no le pegás, se pasa");
assert(T.textoDeContacto(quieto.fin, C) === "la dejaste pasar", "y se dice");
/* revisión del 20/oct: sin tocarla salía gol 47 de cada 100 contra la Primera B */
const Duel = require(path.join(__dirname, "..", "logic", "duel.js"));
const pifia = { contacto: false, calidad: 0, tecnica: "remate", pie: "habil", motivo: "pifia", bola: { z: 2 } };
let golesSin = 0;
[pifia, quieto.fin].forEach(function (res) {
  const z = T.zonaDeContacto(res, C), rr = T.rng(77);
  for (let i = 0; i < 3000; i++) {
    const r = Duel.resolveShot({ rng: rr, shotPower: 70, keeperSkill: 40, zone: z, cfg: BAL.duelo, distancia: 120, tiro: BAL.tiro });
    if (r.outcome === "gol") golesSin++;
  }
});
assert(golesSin === 0, "pifiar o dejarla pasar nunca es gol (" + golesSin + " de 6000)");
assert(T.zonaDeContacto(quieto.fin, C).dice !== T.zonaDeContacto(pifia, C).dice, "se_paso y pifia no dicen lo mismo");
const g1 = T.pegar(jugada(9)), e9 = jugada(9); T.pegar(e9);
assert(g1 && T.pegar(e9) === null, "un solo golpe por jugada");
let mono = true, prev = -99;
for (let q = 0; q <= 1.0001; q += 0.05) { const z = T.zonaDeContacto({ calidad: q, tecnica: "volea", pie: "habil", bola: { z: 1 } }, C); if (z.bonus < prev) mono = false; prev = z.bonus; }
assert(mono, "mejor contacto, mejor zona (nunca al revés)");
assert(T.pieDe({ rasgo: "zurda de ruta 35" }) === "izq" && T.pieDe({ pie: "der", rasgo: "zurda" }) === "der", "el pie: el que dice el jugador, o la zurda del rasgo");
assert(T.pieDe({ nombre: "Ramiro", numero: 9 }) === T.pieDe({ nombre: "Ramiro", numero: 9 }), "el pie de un jugador es siempre el mismo");

console.log((mal ? "✗" : "✓") + " toque: " + ok + " ok, " + mal + " mal · lector " + L.buenas.toFixed(2) + "/" + L.justas.toFixed(2) + " · azar " + Z.buenas.toFixed(3) + " · crack " + crack.media.toFixed(2) + " vs tronco " + tronco.media.toFixed(2));
process.exit(mal ? 1 : 0);
