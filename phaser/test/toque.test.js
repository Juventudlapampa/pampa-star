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
/* revisión del 22/oct: cuando remata un compañero, el cartel habla de él */
const deOtro = [T.zonaDeContacto(pifia, C, true).dice, T.zonaDeContacto(quieto.fin, C, true).dice, T.textoDeContacto(quieto.fin, C, true)];
assert(deOtro.join(" | ") === "¡LA PIFIÓ! | ¡SE LE PASÓ! | la dejó pasar", "SÍNTOMA: con un compañero el cartel le habla a quien juega (" + deOtro.join(" | ") + ")");
assert(T.zonaDeContacto(pifia, C, true).bonus === T.zonaDeContacto(pifia, C).bonus && T.zonaDeContacto(pifia, C, true).fuera === T.zonaDeContacto(pifia, C).fuera, "y la pifia de un compañero vale lo mismo");
const g1 = T.pegar(jugada(9)), e9 = jugada(9); T.pegar(e9);
assert(g1 && T.pegar(e9) === null, "un solo golpe por jugada");
let mono = true, prev = -99;
for (let q = 0; q <= 1.0001; q += 0.05) { const z = T.zonaDeContacto({ calidad: q, tecnica: "volea", pie: "habil", bola: { z: 1 } }, C); if (z.bonus < prev) mono = false; prev = z.bonus; }
assert(mono, "mejor contacto, mejor zona (nunca al revés)");
assert(T.pieDe({ rasgo: "zurda de ruta 35" }) === "izq" && T.pieDe({ pie: "der", rasgo: "zurda" }) === "der", "el pie: el que dice el jugador, o la zurda del rasgo");
assert(T.pieDe({ nombre: "Ramiro", numero: 9 }) === T.pieDe({ nombre: "Ramiro", numero: 9 }), "el pie de un jugador es siempre el mismo");

/* segunda revisión del 22/oct: EL TOQUE de un compañero, en la escena
   (toque_ui.js y match.js sobre la escena de mentira). El golpe terminaba
   echado atrás (tween con yoyo); la lectura decía "tu pie" / "ponete abajo
   y saltá" y el gol de MATEO, "¡La clavaste...!" */
(function () {
  const E = require("./_partido_de_mentira.js").escena({ logica: ["phaser/logic/toque.js"], mixins: ["phaser/scenes/toque_ui.js"] });
  const s = E.s;
  const cosa = function () {
    const o = { angle: 0 };
    ["setTexture", "setScale", "setPosition", "setFlipX", "setOrigin", "setAlpha", "clear", "fillStyle", "fillEllipse", "lineStyle", "strokeEllipse", "lineBetween"].forEach(function (k) { o[k] = function () { return o; }; });
    o.setAngle = function (a) { o.angle = a; return o; };
    o.setText = function (t) { o.text = t; return o; };
    return o;
  };
  s.identidadDe = function () { return "ident_mateo"; };
  /* 22/oct: el partido de verdad tiene el manifiesto de identidades cuando identidadDe
     devuelve una; la de Mateo no trae pose de remate (remates_identidad.test.js prueba la que sí) */
  s._identMan = { identidades: [{ id: "mateo" }] };
  s.poseDePlano = function () { return "pose"; };
  s.escalaDePose = function () { return 1; };
  s.lineasVelocidad = function () { };
  require("./_cuidado_de_mentira.js")(s);
  s.cineContent = { bringToTop: function () { }, getIndex: function () { return 0; }, moveTo: function () { } };
  s.cursors = null;
  const mateo = { esVos: false, nombre: "Mateo" }, vos = { esVos: true, nombre: "Rodri" };
  const armar = function (e, j) {
    return s._tq = { e: e, j: j, pre: 0.01, obj: null, teclado: false, alta: e.T.h > C.tecnicas.volea.h[1], bolaEsc: 1,
      lectura: cosa(), prota: cosa(), anillo: cosa(), marca: cosa(), mira: cosa(), sombra: cosa(), bola: cosa() };
  };
  let alta = null, baja = null;
  for (let sm = 1; sm < 400 && (!alta || !baja); sm++) {
    const e = jugada(sm);
    if (e.T.h > C.tecnicas.volea.h[1]) alta = alta || sm;
    else if (e.T.h <= C.tecnicas.remate.h[1]) baja = baja || sm;
  }
  const leer = function (sm, j) { const tq = armar(jugada(sm), j); s.updateToque(50); return tq.lectura.text; };
  assert(leer(baja, vos) === "VIENE BAJA · que caiga en tu pie" && leer(alta, vos) === "VIENE ALTA · ponete abajo y saltá", "con vos, la lectura te habla a vos");
  assert(leer(baja, mateo) === "VIENE BAJA · que caiga en su pie" && leer(alta, mateo) === "VIENE ALTA · se pone abajo y salta",
    "SÍNTOMA: con MATEO la lectura le habla a quien juega (" + leer(baja, mateo) + " | " + leer(alta, mateo) + ")");
  /* el golpe: dos poses quietas con corte seco, y queda en la del golpe */
  const tq = armar(jugada(baja), mateo);
  tq.pre = 0; tq.poseAhora = "corriendo";
  T.pegar(tq.e);
  E.timers.length = 0; E.tweens.length = 0;
  s.toqueDibujar(0.016);
  assert(tq.prota.angle === -14 && !E.tweens.some(function (t) { return t.cfg.targets === tq.prota; }), "al pegarle se echa atrás, quieto, sin tween (" + tq.prota.angle + ")");
  E.timers.forEach(function (t) { t.fn(); });
  s.toqueDibujar(0.016);
  assert(tq.prota.angle === 10, "SÍNTOMA: el golpe de MATEO termina echado atrás y no en la pose del golpe (" + tq.prota.angle + "°)");
  /* el gol. 23/oct, pedido de Rodri (el festejo del compañero salía como
     tuyo): su nombre pasa al título del cartel y en el sub va su número */
  mateo.numero = 7;
  s.st.mios = [mateo, vos];
  s.st.ctrl = 0;
  assert(s.tituloDelGol() === "¡GOOOL DE MATEO!", "SÍNTOMA: el cartel del gol de MATEO no lo nombra (" + s.tituloDelGol() + ")");
  assert(s.subDelGol() === "¡El 7 la clavó donde el viento no la saca!", "SÍNTOMA: el gol de MATEO dice '¡La clavaste...!' (" + s.subDelGol() + ")");
  s.st.ctrl = 1;
  assert(s.tituloDelGol() === "¡GOOOL!", "el tuyo, el grito de siempre (" + s.tituloDelGol() + ")");
  assert(s.subDelGol() === "¡La clavaste donde el viento no la saca!", "y el tuyo te habla a vos");
})();

/* --- pedido de Rodri del 22/oct: en el SÚPER TIRO la pelota es tuya ---
   EL TOQUE la tiraba de atrás como un pase ("TE LA TIRAN DE ATRÁS") aunque
   la tenías en el pie. Con origen "propia" sale de tus pies, el rótulo lo
   dice y sigue siendo justa. El remate del área sigue sorteando. */
(function () {
  const propia = function (sm) { return T.crearJugada({ semilla: sm, cfg: C, origen: "propia", jugador: { stats: medio, aguanteFrac: 1, pie: "der" } }); };
  let pegada = true, rotulo = true, noAtras = true, adelante = true;
  for (let sm = 1; sm <= 200; sm++) {
    const e = propia(sm), b0 = T.bolaEn(e, 0);
    if (Math.hypot(b0.x - e.jug.x, b0.z - e.jug.z) > 0.5) pegada = false;
    if (!(e.T.x > b0.x && e.T.x > e.jug.x)) adelante = false;
    if (e.origen.id !== "propia" || !/ACOMOD/.test(e.origen.n)) rotulo = false;
    if (/ATR[AÁ]S/.test(e.origen.n)) noAtras = false;
  }
  assert(pegada, "SÍNTOMA: en el súper tiro la pelota no arranca en tus pies");
  /* visto en pantalla el 22/oct: salía de tus pies y se iba para atrás, por
     al lado tuyo. Te la adelantás: cae entre vos y el arco */
  assert(adelante, "SÍNTOMA: con tu pelota, la pelota sale de tus pies para atrás");
  assert(rotulo && noAtras, "el rótulo dice que te la acomodás, no que te la tiran de atrás");
  let buenas = 0;
  for (let s2 = 1; s2 <= 600; s2++) if (lector(propia(s2), T.rng(s2 * 7919), 0.12, 0.035).calidad >= C.zonas[1].q) buenas++;
  assert(buenas / 600 >= 0.7, "con tu pelota, leyendo bien, bien pegada 7 de cada 10 o más (" + (buenas / 600).toFixed(2) + ")");
  assert(JSON.stringify(jugada(77).T) === JSON.stringify(T.crearJugada({ semilla: 77, cfg: C, jugador: { stats: medio, aguanteFrac: 1, pie: "der" } }).T)
    && C.origenes.every(function (o) { return o.id !== "propia"; }), "el remate del área sigue con su sorteo de siempre");
  const MATCH = fs.readFileSync(path.join(__dirname, "..", "scenes", "match.js"), "utf8");
  assert(/entrarToque\(t => this\.dispararConCine\(mega, [^\n]*\), "propia"\)/.test(MATCH), "el súper tiro entra a EL TOQUE con su propia pelota");
  /* el cartel: el cut-in lo anuncia y la toma no lo repite */
  const disparar = MATCH.slice(MATCH.indexOf("  dispararConCine(mega, ej) {"), MATCH.indexOf("\n  /* ============ ANIME v4 Bloque B"));
  assert(disparar.indexOf("junta todo lo que le queda") < 0 && (disparar.match(/titulo: ""/g) || []).length === 2,
    "SÍNTOMA: el cartel ¡SÚPER TIRO! · junta todo lo que le queda sale dos veces (en el cut-in y en la toma)");
  const TOMA = fs.readFileSync(path.join(__dirname, "..", "scenes", "toma_remate.js"), "utf8");
  assert(/if \(cfg\.titulo !== ""\) this\.punch\(cfg\.titulo \|\| "¡SÚPER TIRO!"/.test(TOMA), "la toma especial sin título no pone el cartel");
})();

/* --- revisión final del 22/oct: sin contacto no hay remate que mostrar ---
   NICO en EL TOQUE: "¡SE LE PASÓ! la dejó pasar · pifiada" y después el
   viaje, el esfuerzo, el arquero y "¡AFUERA! Se fue por centímetros". Sin
   contacto, el TIRO del área y el SÚPER TIRO van a toqueSinRemate: ni
   bloqueo, ni carga, ni pie, ni viaje, y el cartel dice que nadie la tocó.
   Y un SÚPER TIRO de cabeza salía con la patada y "· el pie ·": la carga va
   con la pose del cabezazo y corta al viaje sin el plano del pie. */
(function () {
  const E = require("./_partido_de_mentira.js").escena({ logicaAntes: ["phaser/logic/duel.js", "phaser/logic/lectura.js"],
    logica: ["phaser/logic/toque.js", "phaser/logic/tiro.js", "phaser/logic/definicion.js"], mixins: ["phaser/scenes/toque_ui.js"] });
  const s = E.s, st = s.st;
  let vistos = [];
  ["toqueSinRemate", "planoViaje", "planoPie", "escenaDelBloqueo", "entrarCine"].forEach(function (k) { s[k] = function () { vistos.push(k); }; });
  s.escenaCine = function (cfg) { vistos.push("carga:" + cfg.pose); cfg.alFinal(); };
  s.hayEscenas = function () { return true; };
  s.cameras.main.flash = function () { };
  const j = st.mios[st.ctrl];
  st.posesion = "mia"; j.esVos = true; j.x = st.W - 60; j.y = st.H / 2;
  st.rivales.forEach(function (r) { if (r.pos !== "ARQ") { r.x = 80; r.y = 40; } });   // nadie en la línea del remate
  const toque = function (res) { return { zona: T.zonaDeContacto(res, C, false), texto: T.textoDeContacto(res, C, false), res: res }; };
  const pasada = { contacto: false, calidad: 0, tecnica: null, pie: null, motivo: "se_paso" };
  const pifia = { contacto: false, calidad: 0, tecnica: "remate", pie: "habil", motivo: "pifia", bola: { z: 2 } };
  const golpe = function (tec) { return { contacto: true, calidad: 1, tecnica: tec, pie: tec === "cabezazo" ? null : "habil", motivo: "golpe", bola: { z: 2 } }; };
  [pasada, pifia].forEach(function (r) {
    vistos = []; s._toqueRemate = toque(r); s.tiroPorComandos(null);
    assert(vistos.join() === "toqueSinRemate" && s.res.outcome !== "gol",
      "SÍNTOMA: en el TIRO del área, con '" + r.motivo + "' en EL TOQUE igual sale el cine del remate (" + vistos.join() + ")");
  });
  vistos = []; s._toqueRemate = toque(golpe("remate")); s.tiroPorComandos(null);
  assert(vistos.join() === "entrarCine,planoViaje", "con contacto, el TIRO del área sigue al viaje (" + vistos.join() + ")");
  const mega = { n: "Súper tiro", grito: "¡GOLAZO!" };
  const disparar = function (r) { vistos = []; s.dispararConCine(mega, s.ejDeLaSituacion(mega, null, toque(r))); return vistos.join(); };
  assert(disparar(pasada) === "toqueSinRemate", "SÍNTOMA: en el SÚPER TIRO, con la pelota pasada, igual hay carga, pie y viaje (" + disparar(pasada) + ")");
  assert(disparar(golpe("cabezazo")) === "carga:cabezazo,entrarCine,planoViaje",
    "SÍNTOMA: el SÚPER TIRO de cabeza se ve con la patada y el plano del pie (" + disparar(golpe("cabezazo")) + ")");
  assert(disparar(golpe("remate")) === "carga:remate,entrarCine,planoPie" && disparar(golpe("volea")) === "carga:remate,entrarCine,planoPie",
    "con el pie, la carga del remate y el plano del pie, como antes (" + disparar(golpe("remate")) + ")");
  /* el cartel: nadie la tocó, y nunca "por centímetros" */
  ["afuera", "atajada", "corner"].forEach(function (o) {
    const d = s.desenlaceRemate({ outcome: o }, { sinContacto: true, diferir: true });
    assert(/^Nadie la tocó/.test(d.sub) && !/centímetros/.test(d.sub) && (o !== "afuera" || d.titulo === "¡DE LARGO!"),
      "sin contacto, '" + o + "' dice que nadie la tocó (" + d.titulo + " " + d.sub + ")");
  });
  /* y se ve en la misma cancha: la pelota va a las manos del arquero o de largo, cartel y al partido */
  delete s.toqueSinRemate;
  ["gloves", "afuera"].forEach(function (k) { if (!s.SFX[k]) s.SFX[k] = function () { }; });
  s.game.registry.set("poses", { poses: { arquero_ataja: { pelota: { x: 0.775, y: 0.405 } } } });
  const obj = function () { const o = { x: 0, y: 0, visible: true }; o.setVisible = function (v) { o.visible = v; return o; }; return o; };
  ["atajada", "afuera"].forEach(function (o) {
    const tq = { e: jugada(5), arq: { x: 800, y: 380, displayWidth: 100, displayHeight: 160 }, bola: obj(), sombra: obj(), bolaEsc: 1, abajo: [obj()] };
    tq.e.t = tq.e.tFin;
    s._tqSigue = tq; s.res = { outcome: o };
    let salio = 0, cartel = null;
    s.salirCine = function () { salio++; };
    s.punch = function (t) { cartel = t; };
    E.tweens.length = 0; E.timers.length = 0;
    s.toqueSinRemate();
    const tw = E.tweens.filter(function (t) { return t.cfg.targets === tq.bola; })[0];
    assert(tw && !tq.abajo[0].visible, "sin contacto, la pelota de EL TOQUE sigue y la ayuda de abajo se apaga");
    if (o === "atajada") assert(Math.abs(tw.cfg.x - (800 + 0.275 * 100)) < 0.01 && Math.abs(tw.cfg.y - (380 - 0.595 * 160)) < 0.01, "la atajada va a las manos del arquero de EL TOQUE");
    tw.cfg.onComplete();
    E.correrTimers();
    assert(cartel === (o === "atajada" ? "¡LA AGARRÓ!" : "¡DE LARGO!") && salio === 1, "el cartel sale al llegar y se vuelve al partido (" + cartel + ", " + salio + ")");
  });
})();

/* --- revisión final del 22/oct: el tema del partido vuelve después de EL TOQUE ---
   EL TOQUE pide "jugadon" (el tramo final) y nadie volvía a pedir el del
   partido: en rock sonó rock_tramo_final_loop desde el 35 del 1T hasta el
   pitazo, entretiempo incluido. Corre el update de verdad. */
(function () {
  const E = require("./_partido_de_mentira.js").escena({ logica: ["phaser/logic/toque.js"], mixins: ["phaser/scenes/toque_ui.js"] });
  const s = E.s;
  let pedidos = [];
  s.pedirMusica = function (m) { pedidos.push(m); s._musicaMomento = m; return true; };
  s._musicaMomento = "jugadon";
  s.estado = "CINE"; s.update(0, 16);
  assert(pedidos.length === 0, "durante el cine del remate sigue el tema de EL TOQUE (" + pedidos.join() + ")");
  s.estado = "LIBRE"; s.update(0, 16); s.update(0, 16);
  assert(pedidos.join() === "partido", "SÍNTOMA: al volver al partido después de EL TOQUE no vuelve el tema del partido (" + pedidos.join() + ")");
  pedidos = []; s._musicaMomento = "jugadon"; s._temaFinalPuesto = true; s.update(0, 16);
  assert(pedidos.join() === "partido_final", "si ya había entrado el tramo final, vuelve el tramo final (" + pedidos.join() + ")");
})();

console.log((mal ? "✗" : "✓") + " toque: " + ok + " ok, " + mal + " mal · lector " + L.buenas.toFixed(2) + "/" + L.justas.toFixed(2) + " · azar " + Z.buenas.toFixed(3) + " · crack " + crack.media.toFixed(2) + " vs tronco " + tronco.media.toFixed(2));
process.exit(mal ? 1 : 0);
