/* ============================================================================
   PAMPA STAR · test del TELÉFONO LEGIBLE (pedido de Rodri del 25/oct)

   En la auditoría no se leían los porcentajes de la cruz. Con Scale.FIT el
   lienzo de 960x540 se ve a 640x360 en un teléfono apaisado de 360 de alto y
   13 px lógicos daban 8,7 px reales. Ahora la letra pasa por un factor según
   cuánto se ve el lienzo (balance.legibilidad.telefono, logic/piel.js) en un
   solo lugar, la fábrica de textos de index.html, y en la PC nada cambia.

   Fija: [1] el factor en cada pantalla, [2] el mínimo real (unos 12 px),
   [3] que la fábrica lo aplica y nadie más, [4] que en el teléfono el título,
   OPCIONES y la semana no se pisan ni se salen, y que en la PC quedan igual.

   Corré:  node phaser/test/telefono_legible.test.js
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

let ok = 0, mal = 0;
function assert(cond, msg) { if (cond) ok++; else { mal++; console.error("  ✗ " + msg); } }

const RAIZ = path.join(__dirname, "..", "..");
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), "utf8");
const BAL = JSON.parse(leer("phaser/data/balance.json"));
const P = require("../logic/piel.js");
const CFG = BAL.legibilidad.telefono;

/* la escala de Scale.FIT: manda el lado que primero se queda corto */
const escalaDe = (w, h) => Math.min(w / 960, h / 540);
const PANTALLAS = { "740x360": [740, 360], "844x390": [844, 390], "800x360": [800, 360], "1280x720": [1280, 720], "1920x1080": [1920, 1080] };
const F = {};
Object.keys(PANTALLAS).forEach((k) => { F[k] = P.factorTexto(escalaDe(PANTALLAS[k][0], PANTALLAS[k][1]), CFG); });

/* ---------- [1] el factor ---------- */
assert(CFG && CFG.min_real_px === 12 && CFG.ref_logico_px === 13 && CFG.tope_factor >= 1.4,
  "balance.legibilidad.telefono: 13 lógicos llevados a 12 reales, con un tope que deja pasar el teléfono de 360 (" + JSON.stringify(CFG) + ")");
assert(Math.abs(F["740x360"] - 12 / (13 * 640 / 960)) < 1e-9 && Math.abs(F["740x360"] - 1.3846) < 0.001,
  "a 740x360 el lienzo se ve a 640 de ancho y el factor es 1,385 (" + F["740x360"].toFixed(4) + ")");
assert(Math.abs(F["844x390"] - 1.2781) < 0.001, "a 844x390 el factor es 1,278 (" + F["844x390"].toFixed(4) + ")");
assert(F["800x360"] === F["740x360"], "800x360 y 740x360 tienen el mismo alto: el mismo factor");
assert(F["1280x720"] === 1 && F["1920x1080"] === 1, "en la PC (1280x720 o más) el factor es 1: nada cambia");
assert(P.factorTexto(0.3, CFG) === CFG.tope_factor, "una ventana muy chica no pasa del tope");
assert(P.factorTexto(0.5, null) === 1, "sin el bloque del balance, el factor es 1");
console.log("[1] factor · 740x360 " + F["740x360"].toFixed(3) + " · 844x390 " + F["844x390"].toFixed(3) + " · PC " + F["1280x720"]);

/* ---------- [2] el mínimo real ---------- */
const ESCENAS = fs.readdirSync(path.join(RAIZ, "phaser/scenes")).filter((f) => /\.js$/.test(f));
const tams = new Set([BAL.legibilidad.texto_decision_min]);
ESCENAS.forEach((f) => {
  const src = leer("phaser/scenes/" + f);
  (src.match(/fontSize: *["'](\d+)px["']/g) || []).forEach((m) => tams.add(+m.match(/(\d+)px/)[1]));
  (src.match(/PampaPiel\.nivel\((\d)\)/g) || []).forEach((m) => tams.add(P.nivelPx(+m.match(/\((\d)\)/)[1])));
});
const lista = [...tams].sort((a, b) => a - b);
const minimo = lista[0];
assert(minimo >= 13, "ningún texto declarado baja de 13 px lógicos (" + lista.join(", ") + ")");
["740x360", "844x390", "800x360"].forEach((k) => {
  const esc = escalaDe(PANTALLAS[k][0], PANTALLAS[k][1]);
  const real = P.tamTexto(minimo, F[k], CFG) * esc;
  assert(real >= CFG.min_real_px - 0.05 && real <= CFG.min_real_px + 0.4,
    "a " + k + " el texto más chico (" + minimo + " lógicos) se ve a " + real.toFixed(2) + " px reales: unos 12. SÍNTOMA si no: los porcentajes de la cruz no se leen");
  lista.forEach((px) => {
    const t = P.tamTexto(px, F[k], CFG);
    assert(t >= px && t - px <= CFG.ref_logico_px * (F[k] - 1) + 0.05,
      "a " + k + ", " + px + " px crece lo mismo que el de 13 o menos (" + t + "): un título de 40 no se come la pantalla");
  });
});
lista.forEach((px) => { assert(P.tamTexto(px, F["1280x720"], CFG) === px, "en la PC " + px + " px queda en " + px); });
const real13 = P.tamTexto(13, F["740x360"], CFG) * escalaDe(740, 360);
console.log("[2] mínimo " + minimo + " lógicos · a 740x360: " + P.tamTexto(13, F["740x360"], CFG) + " px = " + real13.toFixed(2) + " reales (antes " + (13 * escalaDe(740, 360)).toFixed(2) + ")");

/* ---------- [3] la fábrica, en un solo lugar ---------- */
const INDEX = leer("phaser/index.html");
const bloques = INDEX.split("<script>").map((b) => b.split("</script>")[0]);
const fabrica = bloques.find((b) => /EL TELÉFONO LEGIBLE/.test(b));
assert(!!fabrica && /Object\.defineProperty\(Phaser\.GameObjects\.TextStyle\.prototype, "_font"/.test(fabrica),
  "la letra crece en TextStyle._font, por donde pasan el texto nuevo, setStyle y setFontSize");
const TextStyle = function () { };
const registro = {};
const ctx = {
  window: { PF: { sombra: null, letras: 0 }, PampaPiel: P },
  Phaser: { GameObjects: { TextStyle: TextStyle, Text: function () { },
    GameObjectFactory: { prototype: { text: function () { } }, register: function (n, fn) { registro[n] = fn; } } } }
};
vm.createContext(ctx);
vm.runInContext(fabrica, ctx, { filename: "index.html (fábrica de textos)" });
const juego = (ancho) => ({ registry: { get: (k) => (k === "balance" ? BAL : null) }, scale: { width: 960, height: 540, displaySize: { width: ancho, height: ancho * 540 / 960 } } });
const estilo = (px, ancho) => {
  const s = Object.create(TextStyle.prototype);
  s.parent = { scene: { sys: { game: juego(ancho) } } };
  s.fontStyle = ""; s.fontSize = px + "px"; s.fontFamily = "'VT323',monospace";
  s._font = [s.fontStyle, s.fontSize, s.fontFamily].join(" ").trim();
  return s;
};
assert(estilo(13, 640)._font === "18px 'VT323',monospace", "a 640 de ancho visible, 13 px se dibuja a 18 (" + estilo(13, 640)._font + ")");
assert(estilo(24, 640)._font === "29px 'VT323',monospace", "y 24 a 29: suma lo mismo que el de 13 (" + estilo(24, 640)._font + ")");
assert(estilo(13, 960)._font === "13px 'VT323',monospace" && estilo(40, 1280)._font === "40px 'VT323',monospace", "en la PC la letra es la de siempre");
const s13 = estilo(13, 640);
assert(s13.fontSize === "13px", "style.fontSize queda lógico: lo que mide el código es la letra que se ve, no un número cambiado");
assert(!!registro.text, "la fábrica de Text sigue registrada");
ESCENAS.forEach((f) => {
  assert(!/tamTexto\(|_font\b/.test(leer("phaser/scenes/" + f)), "scenes/" + f + " no agranda la letra por su cuenta: es la fábrica, en un solo lugar");
});
console.log("[3] la fábrica: 13 → 18 y 24 → 29 a 640 de ancho; en la PC igual");

/* ---------- [4] las pantallas a 640 de ancho visible, y en la PC ---------- */
const M = require("./_escena_de_mentira.js");
const caja = (o) => o.getBounds();
const pisa = (a, b, tol) => Math.min(a.right, b.right) - Math.max(a.x, b.x) > tol && Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > tol;
const dentro = (t, r, tol) => t.x >= r.x - tol && t.right <= r.right + tol && t.y >= r.y - tol && t.bottom <= r.bottom + tol;
const textos = (s) => s.children.list.filter((o) => o.type === "Text" && o.visible !== false && String(o.text).trim());
const enPantalla = (s) => textos(s).filter((t) => { const b = caja(t); return b.x < -1 || b.y < -1 || b.right > 961 || b.bottom > 541; }).map((t) => t.text);

function titulo(lienzo) {
  const A = M.armar({ logicaExtra: ["phaser/logic/opciones.js"], escena: "phaser/scenes/titulo.js", clase: "PampaTitulo", key: "titulo", lienzo: lienzo });
  A.window.PampaSFX = { ui: function () { }, isMuted: function () { return false; }, setMuted: function () { }, setVolumenes: function () { } };
  const s = A.nueva();
  s.crudoDelMaster = function () { return null; };
  s.pedirMusica = function () { return true; };
  s.create();
  return s;
}
function botonesDelTitulo(s) {
  return s.children.list.filter((o) => o.type === "Rectangle" && o.width === 450).map((r) => {
    const R = caja(r);
    return { R: R, adentro: textos(s).filter((t) => { const b = caja(t); return b.y + b.height / 2 > R.y && b.y + b.height / 2 < R.bottom && Math.abs(t.x - r.x) < 1; }) };
  });
}
const tel = titulo(640), pc = titulo();
const bT = botonesDelTitulo(tel), bP = botonesDelTitulo(pc);
assert(bT.length === 3 && bT.every((b) => b.adentro.length === 2), "en el título del teléfono, los tres botones con su título y su bajada");
bT.forEach((b, i) => {
  const [a, c] = b.adentro.map(caja);
  assert(dentro(a, b.R, 0.5) && dentro(c, b.R, 0.5) && !pisa(a, c, 0.5), "título · botón " + (i + 1) + ": lo de adentro entra y no se pisa (el botón mide " + Math.round(b.R.height) + ")");
});
for (let i = 1; i < bT.length; i++) assert(bT[i].R.y > bT[i - 1].R.bottom, "título · los botones " + i + " y " + (i + 1) + " no se tocan");
assert(bP.every((b) => b.R.height === 76), "en la PC los botones del título miden 76, como antes");
assert(enPantalla(tel).length === 0, "nada del título se sale de la pantalla (" + enPantalla(tel).join(" | ") + ")");

tel.vistaOpciones(); pc.vistaOpciones();
const pastillas = (s) => s.children.list.filter((o) => o.type === "Rectangle" && o.height >= 52 && o.height <= 58 && o.width <= 320 && o.x > 280).map((r) => ({ r: r, R: caja(r) }));
const tP = pastillas(tel);
let fueraDeSuPastilla = [];
textos(tel).forEach((t) => {
  const b = caja(t), cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  const suya = tP.find((p) => cx > p.R.x && cx < p.R.right && cy > p.R.y && cy < p.R.bottom);
  if (suya && !dentro(b, suya.R, 0.5)) fueraDeSuPastilla.push(t.text);
});
assert(tP.length >= 9 && fueraDeSuPastilla.length === 0, "OPCIONES en el teléfono: cada pastilla contiene sus palabras (" + fueraDeSuPastilla.join(" | ") + ")");
const rotulos = textos(tel).filter((t) => t.x === 40);
const pisados = [];
rotulos.forEach((a, i) => rotulos.slice(i + 1).forEach((c) => { if (pisa(caja(a), caja(c), 0.5)) pisados.push(a.text + " / " + c.text); }));
assert(pisados.length === 0, "OPCIONES: los rótulos de la izquierda y sus bajadas no se pisan (" + pisados.join(" | ") + ")");
const finRotulos = Math.max(...rotulos.map((t) => caja(t).right));
assert(tP.every((p) => p.R.x > finRotulos), "OPCIONES: las pastillas arrancan después del rótulo más largo (" + Math.round(finRotulos) + ")");
assert(pastillas(pc).every((p) => p.R.x >= 300 - 75 && p.R.height === 52), "en la PC las pastillas siguen arrancando en 300 y miden 52");
console.log("[4] título y OPCIONES a 640 de ancho visible");

function semana(lienzo) {
  const A = M.armar({ lienzo: lienzo });
  A.registry.set("relatos", JSON.parse(leer("data/relatos.json")));
  A.localStorage.setItem("pampa_master_v1", JSON.stringify(A.carreraNueva()));
  const s = A.nueva(); s.create();
  s.tocar(310, 460);
  return s;
}
const tarjetasDe = (s) => s.children.list.filter((o) => o.type === "Rectangle" && o.width === 222).map((r) => caja(r));
const sT = semana(640), sP = semana();
const cT = tarjetasDe(sT), cP = tarjetasDe(sP);
assert(cT.length === 4 && cP.length === 4, "la semana tiene sus cuatro tarjetas en el teléfono y en la PC");
const pisan = [];
cT.forEach((R, i) => {
  const suyos = textos(sT).filter((t) => { const b = caja(t); return b.x + b.width / 2 > R.x && b.x + b.width / 2 < R.right && b.y + b.height / 2 > R.y && b.y + b.height / 2 < R.bottom; });
  suyos.forEach((t) => { if (!dentro(caja(t), R, 0.5)) pisan.push("tarjeta " + (i + 1) + ": se sale «" + t.text + "»"); });
  suyos.forEach((a, k) => suyos.slice(k + 1).forEach((c) => { if (pisa(caja(a), caja(c), 0.5)) pisan.push("tarjeta " + (i + 1) + ": «" + a.text + "» pisa «" + c.text + "»"); }));
});
assert(pisan.length === 0, "semana en el teléfono: lo de cada tarjeta entra y no se pisa (" + pisan.join(" | ") + ")");
assert(cT[0].height > 140, "en el teléfono las tarjetas crecen a lo que piden (" + Math.round(cT[0].height) + ")");
assert(cP.every((R) => R.height === 140), "en la PC las tarjetas miden 140, como antes");
const jugar = textos(sT).find((t) => /JUGAR/.test(t.text));
assert(!!jugar && caja(jugar).bottom <= 540 && caja(jugar).y > Math.max(...cT.map((R) => R.bottom)), "JUGAR queda abajo de las tarjetas y adentro de la pantalla");
assert(enPantalla(sT).length === 0, "nada de la semana se sale de la pantalla (" + enPantalla(sT).join(" | ") + ")");
console.log("[4] la semana a 640: tarjetas de " + Math.round(cT[0].height) + " (en la PC, 140)");

if (mal === 0) console.log("\n✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("\n✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
