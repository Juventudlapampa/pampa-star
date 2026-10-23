/* PAMPA STAR · test de LA POSE DE REMATE DE CADA IDENTIDAD (22/oct, pedido de
   Rodri): cuando remataba un compañero o un rival salía el 10 o la
   ilustración de correr. Ahora va la pose de remate de su identidad, con su
   número, en EL TOQUE, la escena del remate, el súper tiro, "te rematan" y el
   pase; la que no tiene pose sigue como antes.
   node phaser/test/remates_identidad.test.js */
"use strict";
const fs = require("fs");
const path = require("path");
const RAIZ = path.join(__dirname, "..", "..");
const T = require(path.join(__dirname, "..", "logic", "toque.js"));
const CG = require(path.join(__dirname, "..", "logic", "carga.js"));
const BAL = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "balance.json"), "utf8"));
const MAN = JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "identidades_manifest.json"), "utf8"));
const C = BAL.toque;

let ok = 0, mal = 0;
function assert(cond, msg) { if (cond) ok++; else { mal++; console.error("✗ " + msg); } }

function medidas(rel) {
  const b = fs.readFileSync(path.join(RAIZ, rel));
  const t = b.toString("ascii", 12, 16);
  if (t === "VP8 ") return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  if (t === "VP8L") { const v = b.readUInt32LE(21); return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 }; }
  if (t === "VP8X") return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  throw new Error("no es webp: " + rel);
}

/* ---------- [1] el manifiesto, los archivos y la carga ---------- */
(function () {
  const con = MAN.identidades.filter(d => d.remate);
  assert(con.length === MAN.identidades.length, "todas las identidades tienen pose de remate (" + con.length + " de " + MAN.identidades.length + ")");
  const lista = CG.listaDelPartido({ identidades: MAN });
  con.forEach(d => {
    const f = MAN.base + d.remate.archivo, p = d.remate.pelota;
    assert(/\.webp$/.test(d.remate.archivo) && fs.existsSync(path.join(RAIZ, f)), "existe en webp: " + f);
    assert(fs.existsSync(path.join(RAIZ, "assets/_fuente/poses", d.remate.archivo.replace(/\.webp$/, ".png"))), "su PNG de fuente está en assets/_fuente/poses: " + d.id);
    assert(p && p.x > 0 && p.x < 1 && p.y > 0.8 && p.y < 1 && p.r > 0.05 && p.r < 0.15, "la pelota medida va al pie: " + d.id + " " + JSON.stringify(p));
    assert(medidas(f).h <= 420, "bajada a 420 de alto o menos (peso y placa de video): " + d.id + " mide " + medidas(f).h);
    assert(lista.some(x => x.clave === "ident_" + d.id + "_remate" && x.ruta === "../" + f), "la carga del partido la pide como ident_" + d.id + "_remate");
  });
  const MATCH = fs.readFileSync(path.join(RAIZ, "phaser/scenes/match.js"), "utf8");
  assert(/this\.load\.image\("ident_" \+ d\.id \+ "_remate", "\.\.\/" \+ baseI \+ d\.remate\.archivo\)/.test(MATCH), "y el preload del partido también");
  console.log("[1] " + con.length + " poses de remate en webp, con su fuente, su pelota y su clave de carga");
})();

/* la escena de mentira, con las texturas que se digan */
function escena(hay) {
  const E = require("./_partido_de_mentira.js").escena({ logica: ["phaser/logic/toque.js"], mixins: ["phaser/scenes/toque_ui.js", "phaser/scenes/escenas_v9.js"] });
  const s = E.s;
  s._identMan = MAN;
  s.textures = {
    exists: function (k) { return hay.indexOf(k) >= 0; },
    get: function () { return { getSourceImage: function () { return { height: 16 }; } }; }
  };
  return E;
}
const pelotaDe = id => MAN.identidades.find(d => d.id === id).remate.pelota;
const siete = { esVos: false, nombre: "Mateo", numero: 7 }, ocho = { esVos: false, nombre: "Lito", numero: 8 };
const cinco = { esVos: false, nombre: "Toro", numero: 5 }, vos = { esVos: true, nombre: "Rodri", numero: 7 };

/* ---------- [2] remateDe: la de su identidad, o nada ---------- */
(function () {
  const s = escena(["ident_jugador_rulos", "ident_jugador_rulos_remate", "ident_rival_mohicano", "ident_rival_mohicano_remate", "ident_jugador_colorado"]).s;
  const r = s.remateDe(siete, false);
  assert(r && r.key === "ident_jugador_rulos_remate" && r.pelota === pelotaDe("jugador_rulos"), "el 7 remata con la pose del de los rulos y su pelota (" + JSON.stringify(r) + ")");
  const rr = s.remateDe(cinco, true);
  assert(rr && rr.key === "ident_rival_mohicano_remate", "el 5 rival, con la del mohicano (" + (rr && rr.key) + ")");
  assert(s.remateDe(vos, false) === null, "VOS sigue con tu pose (teñida con tu pinta)");
  assert(s.remateDe({ esVos: false, nombre: "Pato", numero: 1, pos: "ARQ" }, false) === null, "un arquero, con las suyas");
  assert(s.remateDe(ocho, false) === null, "si su pose de remate no cargó, sigue como antes");
  console.log("[2] remateDe: el compañero y el rival con la suya; vos, el arquero y la que no cargó, como antes");
})();

/* ---------- [3] EL TOQUE: el golpe de pie es su pose de remate, quieta ---------- */
(function () {
  const E = escena(["ident_jugador_rulos", "ident_jugador_rulos_remate"]), s = E.s;
  const cosa = function () {
    const o = { angle: 0, tex: null };
    ["setScale", "setPosition", "setFlipX", "setOrigin", "setAlpha", "clear", "fillStyle", "fillEllipse", "lineStyle", "strokeEllipse", "lineBetween"].forEach(function (k) { o[k] = function () { return o; }; });
    o.setTexture = function (k) { o.tex = k; return o; };
    o.setAngle = function (a) { o.angle = a; return o; };
    o.setText = function (t) { o.text = t; return o; };
    return o;
  };
  s.poseDePlano = function (p) { return "pose_" + p; };
  s.escalaDePose = function () { return 1; };
  let lineas = 0;
  s.lineasVelocidad = function () { lineas++; };
  s.cineContent = { bringToTop: function () { }, getIndex: function () { return 0; }, moveTo: function () { } };
  s.cursors = null;
  const jugada = function (sm) { return T.crearJugada({ semilla: sm, cfg: C, jugador: { stats: { tiro: 60, aereo: 60, velocidad: 60 }, aguanteFrac: 1, pie: "der" } }); };
  /* el gesto se fija a mano: pegar() lo elige por la altura de la pelota en ese instante */
  const golpe = function (tecnica, j) {
    const e = jugada(9);
    const tq = s._tq = { e: e, j: j, pre: 0, obj: null, teclado: false, alta: e.T.h > C.tecnicas.volea.h[1], bolaEsc: 1, poseAhora: "corriendo",
      lectura: cosa(), prota: cosa(), anillo: cosa(), marca: cosa(), mira: cosa(), sombra: cosa(), bola: cosa() };
    T.pegar(e);
    e.golpe.tecnica = tecnica;
    E.timers.length = 0;
    s.toqueDibujar(0.016);
    E.timers.forEach(function (t) { t.fn(); });
    return tq;
  };
  const a = golpe("remate", siete);
  assert(a.prota.tex === "ident_jugador_rulos_remate", "SÍNTOMA: el 7 le pega de pie con la ilustración de correr (" + a.prota.tex + ")");
  assert(a.prota.angle === 0 && lineas === 1, "la pose de remate queda quieta, sin el giro de la de correr; las líneas sí (" + a.prota.angle + "°, " + lineas + ")");
  const v = golpe("volea", siete);
  assert(v.prota.tex === "ident_jugador_rulos_remate", "de volea también, que es un golpe de pie (" + v.prota.tex + ")");
  lineas = 1;
  const b = golpe("cabezazo", siete);
  assert(b.prota.tex === "ident_jugador_rulos" && b.prota.angle === 10, "de cabeza no hay pose suya: la de correr con el giro, como antes (" + b.prota.tex + ", " + b.prota.angle + "°)");
  const c = golpe("remate", vos);
  assert(c.prota.tex === "pose_remate", "VOS, con tu pose de remate (" + c.prota.tex + ")");
  console.log("[3] EL TOQUE: el compañero le pega con su pose de remate, quieta; de cabeza y vos, como antes");
})();

/* ---------- [4] las escenas: su pose, sin espejar, y la pelota en su pie ---------- */
(function () {
  const E = escena(["ident_rival_mohicano", "ident_rival_mohicano_remate", "pose_remate", "pose_pared", "ball"]), s = E.s;
  const img = function (x, y, k) {
    const o = { x: x, y: y, key: k, width: 400, height: 420, scaleX: 1, scaleY: 1, flipX: false };
    o.setScale = function (v) { o.scaleX = o.scaleY = v; o.displayWidth = o.width * v; o.displayHeight = o.height * v; return o; };
    o.setFlipX = function (f) { o.flipX = f; return o; };
    o.setTint = function () { return o; };
    return o.setScale(1);
  };
  s.poseKey = function (id) { return s.textures.exists("pose_" + id) ? "pose_" + id : null; };
  s.add.image = img;
  s.add.sprite = img;
  s.cineContent = { add: function () { } };
  s.poseRivalNaranja = function (id) { return "poseR_" + id; };
  s.poseDelEquipo = function (id) { return "pose_" + id; };
  s.escalaDePose = function (id, alto, sp) { return alto / sp.height; };
  const rem = s.figuraDePlano("remate", cinco, true, 300, 356, 300, false);
  assert(rem.key === "ident_rival_mohicano_remate" && rem._pelota === pelotaDe("rival_mohicano"), "SÍNTOMA: 'te rematan' con el 10 teñido de naranja (" + rem.key + ")");
  const p = pelotaDe("rival_mohicano"), bola = s.bolaDePlano(rem);
  assert(bola && Math.abs(bola.x - (300 + (p.x - 0.5) * rem.displayWidth)) < 0.01 && Math.abs(bola.y - (356 + (p.y - 0.5) * 300)) < 0.01,
    "la pelota del juego va donde el dibujo la tenía (" + (bola && bola.x.toFixed(1)) + ", " + (bola && bola.y.toFixed(1)) + ")");
  /* la textura de la pelota mide 16 de alto en la escena de mentira */
  assert(Math.abs(bola.scaleX * 16 - p.r * 2 * 300) < 0.01, "y del tamaño del hueco que dejó la recortada (" + (bola.scaleX * 16).toFixed(1) + " px)");
  assert(s.figuraDePlano("remate", cinco, true, 300, 356, 300, true).key === "poseR_remate", "espejada no: el número se leería al revés");
  assert(s.figuraDePlano("pared", vos, false, 130, 356, 300, false).key === "pose_pared", "VOS tocás el pase con tu pose");
  assert(s.bolaDePlano(s.figuraDePlano("pared", vos, false, 130, 356, 300, false)) === null, "y la pelota del pase sigue donde estaba");
  const V9 = fs.readFileSync(path.join(RAIZ, "phaser/scenes/escenas_v9.js"), "utf8");
  assert(/var bola = this\.bolaDePlano\(rem\), alPie = !!bola;/.test(V9) && /var bola = this\.bolaDePlano\(pat\), alPie = !!bola;/.test(V9),
    "'te rematan' y el pase ponen la pelota con bolaDePlano");
  const MATCH = fs.readFileSync(path.join(RAIZ, "phaser/scenes/match.js"), "utf8");
  assert(/remProta = \(poseId === "remate" \|\| poseId === "pared"\) && !cfg\.poseFlip && cfg\.prota \? this\.remateDe\(cfg\.prota\.j, cfg\.prota\.esRival\) : null;/.test(MATCH)
    && /if \(remProta\) posePel = remProta\.pelota;/.test(MATCH), "la escena del remate y la carga del súper tiro usan su pose y su pelota");
  const pie = MATCH.slice(MATCH.indexOf("  planoPie() {"), MATCH.indexOf("  planoViaje() {"));
  assert(/const rem = this\.remateDe\(j, false\), pel = rem \? rem\.pelota : def\.pelota;/.test(pie), "el plano del pie del súper tiro de un compañero, con su pose");
  const cut = MATCH.slice(MATCH.indexOf("  cutInEspecial("), MATCH.indexOf("  cutInEspecial(") + 3000);
  assert(/const remCut = idCut === "remate" \? this\.remateDe\(j, false\) : null;/.test(cut), "y el anuncio del súper tiro");
  console.log("[4] te rematan y el pase: su pose sin espejar, la pelota en su pie y de su tamaño; la escena, la carga, el pie y el anuncio la piden");
})();

/* ---------- [5] revisión del 23/oct: el rival con su número o sin número ----------
   AXEL, el 6, salía en "te rematan" con el 10: o la identidad que le tocaba
   por nombre (la del flequillo, el 10) o pose_remate teñida de naranja, que
   lleva el 10 del héroe en la espalda. Ahora el rival usa una identidad solo
   si es la de SU número, y si no, la copia naranja de pose_remate sale con el
   número borrado en memoria (logic/halo.js, borrarNumero; el archivo no se
   toca). */
(function () {
  const HALO = require(path.join(__dirname, "..", "logic", "halo.js"));
  const PNG = require("./_png.js");
  const POSES = JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "poses_manifest.json"), "utf8"));
  const todas = MAN.identidades.reduce((a, d) => a.concat(["ident_" + d.id, "ident_" + d.id + "_remate"]), []);
  /* la escena de mentira, con lo que hace falta para elegir por nombre y teñir */
  const E = require("./_partido_de_mentira.js").escena({ logica: ["phaser/logic/toque.js", "phaser/logic/avatar.js"], mixins: ["phaser/scenes/toque_ui.js", "phaser/scenes/escenas_v9.js", "phaser/scenes/definicion_ui.js"] });
  const s = E.s;
  s._identMan = MAN;
  s.textures = { exists: k => todas.indexOf(k) >= 0, get: () => ({ getSourceImage: () => ({ height: 16 }) }) };
  const seis = { esVos: false, nombre: "Axel", numero: 6 };
  assert(s.remateDe(seis, true) === null, "SÍNTOMA: el 6 rival remata con la pose de otro número (" + JSON.stringify(s.remateDe(seis, true)) + ")");
  assert(s.remateDe(cinco, true).key === "ident_rival_mohicano_remate", "el 5 rival sigue con la del mohicano, que es su número");
  const diez = { esVos: false, nombre: "Lucho", numero: 10 };
  assert(s.remateDe(diez, true).key === "ident_rival_flequillo_remate", "y el 10 rival con la del flequillo");
  /* la copia naranja de pose_remate pide borrar el número; las otras no */
  const DEF = fs.readFileSync(path.join(RAIZ, "phaser/scenes/definicion_ui.js"), "utf8");
  s.game = { registry: { get: k => (k === "poses" ? POSES : null) } };
  s.poseKey = id => "pose_" + id;
  const pr = s.pedidoRivalNaranja("remate"), pb = s.pedidoRivalNaranja("barrida");
  assert(pr.clave === "poseR_remate" && pr.numero === POSES.poses.remate.numero, "el remate del rival en naranja lleva la caja del número del manifiesto");
  assert(pb && !pb.numero, "la barrida, que no tiene número, se tiñe como antes");
  const AA = fs.readFileSync(path.join(RAIZ, "phaser/scenes/avatar_arte.js"), "utf8");
  assert(/c2\.putImageData\(img, 0, 0\);\s*\r?\n\s*if \(numero\) borrarNumeroEnCanvas\(c2, src\.width, src\.height, numero\);/.test(AA)
    && /if \(P\.numero\) borrarNumeroEnCanvas\(c, w, h, P\.numero\);/.test(AA), "el teñido entero y el de a tajadas borran el número");
  assert(/tenirImagen\(this, P\.base, P\.clave, P\.mapa, P\.numero\)/.test(DEF), "poseRivalNaranja le pasa el número al teñido");
  /* sobre el dibujo de verdad (el PNG de fuente, mismo lienzo que el webp) */
  const img = PNG.leer(fs.readFileSync(path.join(RAIZ, "assets/_fuente/poses/pose_remate.png")));
  const W = img.ancho, H = img.alto, d = img.datos, antes = Buffer.from(d);
  const z = HALO.cajaDeNumero(POSES.poses.remate.numero, W, H, 0, 0);
  const blancos = () => { let n = 0; for (let y = z.y0; y <= z.y1; y++) for (let x = z.x0; x <= z.x1; x++) { if (x < z.sx && y < z.sy) continue; const i = (y * W + x) * 4; if (d[i + 3] >= 250 && d[i] > 190 && d[i + 1] > 190 && d[i + 2] > 190) n++; } return n; };
  const b0 = blancos();
  assert(b0 > 3000, "control: el 10 está en la caja del manifiesto (" + b0 + " píxeles blancos)");
  const n = HALO.borrarNumero(d, W, H, z);
  assert(blancos() === 0, "SÍNTOMA: quedan " + blancos() + " píxeles del número en la espalda");
  let afuera = 0, alfa = 0, puno = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (d[i + 3] !== antes[i + 3]) alfa++;
    const enCaja = x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1;
    if (d[i] === antes[i] && d[i + 1] === antes[i + 1] && d[i + 2] === antes[i + 2]) continue;
    if (!enCaja) afuera++;
    else if (x < z.sx && y < z.sy) puno++;
  }
  assert(afuera === 0 && alfa === 0 && puno === 0, "fuera de la caja, en el puño y en la transparencia no cambia nada (" + afuera + ", " + puno + ", " + alfa + ")");
  console.log("[5] el rival con la pose de su número o con el 10 borrado: " + b0 + " píxeles del número, " + n + " cambiados, nada afuera de la caja");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
