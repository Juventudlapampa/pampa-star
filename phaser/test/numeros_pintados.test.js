/* PAMPA STAR · test de LOS NÚMEROS PINTADOS (pedido de Rodri del 23/oct). El
   cine del pase mostraba a un 8 (la ilustración del colorado) cuando la
   llevaba otro, y de frente al arco quien patea se veía de espaldas con el
   10 pintado. Ahora, en memoria y sin tocar el archivo, se borra el pintado
   (logic/halo.js, borrarNumero, con la caja medida del manifiesto) y se
   escribe el número de quien juega (logic/halo.js, dorsal), girado y del
   alto del original. VOS con el 10 queda con el dibujo tal cual.
   node phaser/test/numeros_pintados.test.js */
"use strict";
const fs = require("fs");
const path = require("path");
const RAIZ = path.join(__dirname, "..", "..");
const HALO = require(path.join(__dirname, "..", "logic", "halo.js"));
const PNG = require("./_png.js");
const MAN = JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "identidades_manifest.json"), "utf8"));
const POSES = JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "poses_manifest.json"), "utf8"));

let ok = 0, mal = 0;
function assert(cond, msg) { if (cond) ok++; else { mal++; console.error("✗ " + msg); } }
const blancosEn = (img, z) => {
  let n = 0;
  for (let y = z.y0; y <= z.y1; y++) for (let x = z.x0; x <= z.x1; x++) {
    if (x < z.sx && y < z.sy) continue;
    const i = (y * img.ancho + x) * 4, d = img.datos;
    if (d[i + 3] >= 250 && d[i] > 190 && d[i + 1] > 190 && d[i + 2] > 190) n++;
  }
  return n;
};

/* [1] cada dibujo de los tuyos dice dónde está su número y cómo es */
const CAMPOS = ["caja", "sin_tocar", "centro", "alto", "ancho", "inclinacion", "trazo", "linea"];
const mios = MAN.identidades.filter(d => d.equipo === "mio");
mios.forEach(d => {
  const lista = [["numero", d.numero]].concat(d.izq ? [["numero_izq", d.numero_izq]] : []).concat(d.remate ? [["remate.numero", d.remate.numero]] : []);
  lista.forEach(([n, v]) => {
    assert(v && CAMPOS.every(c => v[c] != null), "[1] " + d.id + " tiene " + n + " con " + CAMPOS.join(", "));
    assert(v && v.caja[0] < v.centro[0] && v.centro[0] < v.caja[2] && v.caja[1] < v.centro[1] && v.centro[1] < v.caja[3], "[1] " + d.id + " " + n + ": el centro adentro de la caja");
  });
});
const ESP = POSES.poses.de_espaldas_sin_pelota.numero;
assert(ESP.dibujado === 10 && CAMPOS.every(c => ESP[c] != null), "[1] la pose de espaldas dice que tiene el 10 pintado y cómo es");
console.log("[1] " + mios.length + " identidades tuyas con su número medido, y la pose de espaldas");

/* [2] sobre el dibujo de verdad: la caja agarra el número entero y
   borrarNumero lo saca (el 8 del colorado y el 10 de la espalda) */
[["jugador_colorado (el 8)", "assets/poses/identidades/jugador_colorado.png", MAN.identidades.find(d => d.id === "jugador_colorado").numero, 1500],
 ["de espaldas (el 10)", "assets/_fuente/poses/pose_de_espaldas_sin_pelota.png", ESP, 20000]].forEach(([n, f, num, min]) => {
  const img = PNG.leer(fs.readFileSync(path.join(RAIZ, f)));
  const z = HALO.cajaDeNumero(num, img.ancho, img.alto, 0, 0);
  /* la caja con 6 px de aire: si el número se saliera de la caja, se vería */
  const z2 = { x0: z.x0 - 6, y0: z.y0 - 6, x1: z.x1 + 6, y1: z.y1 + 6, sx: z.x0 - 6, sy: z.y0 - 6 };
  const b0 = blancosEn(img, z), b0aire = blancosEn(img, z2);
  assert(b0 > min, "[2] " + n + ": control, el número está en la caja (" + b0 + " píxeles blancos)");
  assert(b0aire - b0 < 0.02 * b0, "[2] " + n + ": la caja lo agarra entero (" + (b0aire - b0) + " blancos más a 6 px)");
  HALO.borrarNumero(img.datos, img.ancho, img.alto, z);
  assert(blancosEn(img, z) === 0, "[2] SÍNTOMA: " + n + " deja " + blancosEn(img, z) + " píxeles del número");
  console.log("[2] " + n + ": " + b0 + " píxeles del número, borrados");
});

/* [3] el dorsal nuevo: en el lugar del original, de su alto y girado igual */
{
  const col = MAN.identidades.find(d => d.id === "jugador_colorado"), W = 596, H = 620, num = col.numero;
  const D = HALO.dorsal("2", num, W, H);
  const xs = D.trazos.flat().map(p => p.x), ys = D.trazos.flat().map(p => p.y), m = D.grosor / 2 + D.borde;
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  assert(Math.hypot(cx - num.centro[0] * W, cy - num.centro[1] * H) < 0.12 * num.alto * H, "[3] el 2 va donde estaba el 8");
  assert(Math.min(...xs) - m > num.caja[0] * W - 0.25 * num.alto * H && Math.max(...xs) + m < num.caja[2] * W + 0.25 * num.alto * H, "[3] y no se sale del lugar del 8");
  assert(Math.abs(D.alto - num.alto * H) < 1, "[3] del alto del 8: " + D.alto.toFixed(1) + " px");
  /* el palo del 1 va por el eje del número: girado como el 8 */
  const uno = HALO.dorsal("1", num, W, H).trazos[0], a = uno[1], b = uno[2];
  const ang = Math.atan2(-(b.x - a.x), b.y - a.y) * 180 / Math.PI;
  assert(Math.abs(ang - num.inclinacion) < 0.5, "[3] el 1 se inclina como el 8: " + ang.toFixed(1) + " contra " + num.inclinacion);
  const d11 = HALO.dorsal("11", num, W, H), d1 = HALO.dorsal("1", num, W, H);
  assert(d11.trazos.length === 2 && d11.alto <= d1.alto, "[3] el 11 sobre el 8: dos palos, del mismo alto o más chico si no entra");
  assert(Object.keys(HALO.DIG).length === 10, "[3] hay trazos para los diez dígitos");
  const e4 = HALO.dorsal("4", ESP, 872, 1711);
  assert(e4.linea === ESP.linea && e4.grosor > 10, "[3] en la espalda, el 4 con la línea del 10 y su grosor (" + e4.grosor.toFixed(1) + " px)");
  console.log("[3] el dorsal: alto " + D.alto.toFixed(1) + " px, girado " + num.inclinacion + "°, trazo " + D.grosor.toFixed(1) + " px");
}

/* [4] quién lleva qué: conSuNumero en la escena (match.js) */
{
  const E = require("./_partido_de_mentira.js").escena({ mixins: ["phaser/scenes/escenas_v9.js"] });
  const s = E.s, pedidos = [];
  s._identMan = MAN;
  s.game = { registry: { get: k => (k === "poses" ? POSES : null) } };
  E.W.PampaAvatarArte = { renumerarImagen: (sc, src, dst, num, txt) => { pedidos.push({ src, dst, num, txt }); return dst; } };
  const col = MAN.identidades.find(d => d.id === "jugador_colorado");
  assert(s.conSuNumero("ident_jugador_colorado", { nombre: "Lautaro", numero: 2 }) === "ident_jugador_colorado_n2"
    && pedidos[0].num === col.numero && pedidos[0].txt === "2", "[4] SÍNTOMA: el 2 que corre con la del colorado sale con el 8");
  assert(s.conSuNumero("ident_jugador_colorado", { nombre: "Fede", numero: 8 }) === "ident_jugador_colorado", "[4] el 8 sigue con el dibujo tal cual");
  assert(s.conSuNumero("ident_jugador_colorado_remate", { numero: 4 }) === "ident_jugador_colorado_remate_n4" && pedidos[1].num === col.remate.numero, "[4] la de remate, con su caja");
  assert(s.conSuNumero("ident_jugador_rulos_izq", { numero: 3 }) === "ident_jugador_rulos_izq_n3" && pedidos[2].num === MAN.identidades[0].numero_izq, "[4] la que mira a la izquierda, con la suya");
  assert(s.conSuNumero("pose_de_espaldas_sin_pelota", { esVos: true, numero: 10 }, "de_espaldas_sin_pelota") === "pose_de_espaldas_sin_pelota", "[4] VOS con el 10, de espaldas, el original");
  assert(s.conSuNumero("pose_de_espaldas_sin_pelota", { nombre: "Bruno", numero: 6 }, "de_espaldas_sin_pelota") === "pose_de_espaldas_sin_pelota_n6", "[4] SÍNTOMA: BRUNO, el 6, patea de espaldas con el 10");
  assert(s.conSuNumero("poseR_de_espaldas_sin_pelota", { nombre: "Eze", numero: 10 }, "de_espaldas_sin_pelota") === "poseR_de_espaldas_sin_pelota_n10", "[4] el rival con el 10: la copia naranja viene sin número y se le escribe");
  const n = pedidos.length;
  assert(s.conSuNumero("ident_rival_mohicano", { numero: 3 }) === "ident_rival_mohicano" && pedidos.length === n, "[4] las del rival (a rayas) quedan como están");
  assert(s.conSuNumero("pose_remate", { numero: 3 }, "remate") === "pose_remate", "[4] una pose sin medidas para escribir queda como está");
  const V9 = fs.readFileSync(path.join(RAIZ, "phaser/scenes/escenas_v9.js"), "utf8");
  assert(/this\.add\.image\(x, y, this\.conSuNumero \? this\.conSuNumero\(k, j, poseId\) : k\)/.test(V9), "[4] el cine (figuraDePlano) pide la copia con su número");
  console.log("[4] el 2 con la del colorado, BRUNO de espaldas y el rival con el 10, con su número; VOS y el 8, el dibujo tal cual");
}

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
