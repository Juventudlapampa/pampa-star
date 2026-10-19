/* ============================================================================
   PAMPA STAR · test de LA PIEL (lógica pura)
   Corré:  node phaser/test/piel.test.js
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const P = require("../logic/piel.js");

let ok = 0, mal = 0;
function assert(cond, msg) { if (cond) ok++; else { mal++; console.error("  ✗ " + msg); } }

const RAIZ = path.join(__dirname, "..", "..");
const BAL = JSON.parse(fs.readFileSync(path.join(RAIZ, "phaser/data/balance.json"), "utf8"));

/* ---------- [1] la paleta sale de balance ---------- */
const pal = P.paleta(BAL.piel);
assert(BAL.piel != null, "balance.json tiene que traer el bloque 'piel'");
["fondo_centro", "fondo_borde", "caja", "marco", "acento", "calido", "texto"].forEach(k => {
  assert(/^#[0-9a-f]{6}$/i.test(String(pal[k])), "piel." + k + " tiene que ser #rrggbb (vino " + pal[k] + ")");
});
assert(pal.n.fondo_centro === 0x14301f, "el centro del radial tiene que resolver a 0x14301f (dio " + pal.n.fondo_centro.toString(16) + ")");
assert(pal.n.fondo_borde === 0x060f0a, "el borde del radial tiene que resolver a 0x060f0a");
/* el centro es MÁS CLARO que el borde: si se invierte, el radial se ve como un agujero */
assert(P.luma(pal.fondo_centro) > P.luma(pal.fondo_borde),
  "el centro del radial tiene que ser más claro que el borde (centro " + P.luma(pal.fondo_centro).toFixed(0) +
  " vs borde " + P.luma(pal.fondo_borde).toFixed(0) + ")");
/* que sea OSCURO de verdad: el punto 1 es sacarle el verde al marco */
assert(P.luma(pal.fondo_centro) < 70,
  "el fondo del marco tiene que ser oscuro (luma " + P.luma(pal.fondo_centro).toFixed(0) + ", tope 70) — si no, vuelve el verde sobre verde");
console.log("[1] paleta: centro luma " + P.luma(pal.fondo_centro).toFixed(0) + " · borde luma " + P.luma(pal.fondo_borde).toFixed(0));

/* ---------- [2] el canto del botón ---------- */
const capas = P.capasBoton(pal.acento, pal);
assert(capas.cara === P.num(pal.acento), "la cara del botón es el color pedido");
assert(P.luma(capas.canto) < P.luma(capas.cara),
  "el canto tiene que ser MÁS OSCURO que la cara (canto " + P.luma(capas.canto).toFixed(0) + " vs cara " + P.luma(capas.cara).toFixed(0) + ")");
/* el canto es el MISMO tono, no negro: si fuera negro, un botón amarillo
   tendría el costado gris sucio en vez de ámbar */
const cCara = [(capas.cara >> 16) & 255, (capas.cara >> 8) & 255, capas.cara & 255];
const cCanto = [(capas.canto >> 16) & 255, (capas.canto >> 8) & 255, capas.canto & 255];
/* Se compara la proporción canto/cara canal por canal, y tiene que ser la
   misma en los tres: eso es "el mismo tono, más oscuro".
   Los canales que valen 0 en la cara se saltean — 0/0 no es una proporción, y
   el amarillo del juego (#F5C400) tiene el azul en 0. */
const razon = cCara.map((v, i) => v === 0 ? null : cCanto[i] / v).filter(r => r != null);
assert(cCanto.every((v, i) => cCara[i] !== 0 || v === 0),
  "un canal que vale 0 en la cara tiene que seguir en 0 en el canto (si no, el canto cambia de tono)");
assert(Math.max(...razon) - Math.min(...razon) < 0.02,
  "el canto tiene que ser el mismo tono oscurecido (proporciones RGB " + razon.map(r => r.toFixed(2)).join("/") + ")");
assert(capas.cantoPx >= 6 && capas.cantoPx <= 10,
  "el canto va entre 6 y 10px como pide el diseño (vino " + capas.cantoPx + ")");
assert(capas.hunde > 0 && capas.hunde <= capas.cantoPx,
  "al presionar el botón baja, y no más que el propio canto (hunde " + capas.hunde + ", canto " + capas.cantoPx + ")");
assert(capas.sombra.alpha > 0.3 && capas.sombra.alpha < 0.6, "la sombra difusa va cerca del 45%");
/* la tinta del botón se lee sobre su color */
assert(capas.tinta === P.num(pal.caja), "sobre el amarillo la tinta tiene que ser oscura");
assert(P.capasBoton("#232323", pal).tinta === P.num(pal.texto), "sobre un botón oscuro la tinta tiene que ser clara");
console.log("[2] botón: cara " + capas.cara.toString(16) + " · canto " + capas.canto.toString(16) + " (-" + Math.round(pal.canto_oscurece * 100) + "%) · " + capas.cantoPx + "px");

/* ---------- [3] las mayúsculas ---------- */
assert(P.esMayusculas("QUITES 2 · GAMBETAS 2 · TIROS 1"), "el chorizo del HUD es mayúsculas");
assert(P.esMayusculas("ENVIÓN"), "con acento sigue siendo mayúsculas");
assert(P.esMayusculas("AGUANTE"), "AGUANTE es mayúsculas");
assert(!P.esMayusculas("Amague, quiebre y adiós"), "una frase del relator NO es mayúsculas");
assert(!P.esMayusculas("VOS 2 - 1 General Pico"), "mezcla de cajas NO cuenta como mayúsculas");
assert(!P.esMayusculas("· 12"), "sin letras no es mayúsculas (si no, cada número lleva tracking de título)");
assert(!P.esMayusculas("A"), "una sola letra no alcanza");
assert(P.trackingPx(20, 0.16) === 3.2, "20px con .16em = 3.2px (dio " + P.trackingPx(20, 0.16) + ")");
assert(pal.tracking_mayus >= 0.14 && pal.tracking_mayus <= 0.22,
  "el tracking va entre .14em y .22em como pide el diseño (vino " + pal.tracking_mayus + ")");
console.log("[3] mayúsculas: tracking " + pal.tracking_mayus + "em = " + P.trackingPx(12, pal.tracking_mayus) + "px a 12px");

/* ---------- [4] la escala tipográfica ---------- */
assert(P.escala(960, 960) === 1, "a ancho nominal la escala es 1");
assert(P.escala(1920, 960, 0.85, 1.15) === 1.15, "una pantalla enorme se topea en esc_max");
assert(P.escala(320, 960, 0.85, 1.15) === 0.85, "una pantalla chica se topea en esc_min");
assert(P.tam(12, 960) === 12, "a ancho nominal el tamaño no cambia");
assert(P.tam(12, 1920, { esc_min: 0.85, esc_max: 1.15 }) === 14, "12px escalados al máximo dan 14");
assert(P.tam(4, 320) >= 8, "ningún texto baja de 8px, o deja de leerse");
console.log("[4] escala: " + pal.esc_min + " a " + pal.esc_max + " (a 960 = 1.00)");

/* ---------- [5] utilidades de color ---------- */
assert(P.hex(0x0a1f13) === "#0a1f13", "hex() redondea bien");
assert(P.num("#F5C400") === 0xf5c400, "num() acepta con #");
assert(P.num(0xf5c400) === 0xf5c400, "num() acepta número");
assert(P.luma("#FFFFFF") > 250 && P.luma("#000000") < 5, "luma en los extremos");
assert(P.esOscuro("#232323") && !P.esOscuro("#F6EFDC"), "esOscuro discrimina");
assert(P.oscurecer("#FFFFFF", 1) === 0, "oscurecer al 100% da negro");
assert(P.oscurecer("#FFFFFF", 0) === 0xffffff, "oscurecer al 0% no toca");
assert(P.aclarar("#000000", 1) === 0xffffff, "aclarar al 100% da blanco");
console.log("[5] utilidades de color ok");

/* ---------- [6] LA REGLA QUE NO SE CRUZA: el verde de la cancha ---------- */
/* La paleta viste el MARCO. Si alguno de estos tonos de pasto aparece en el
   bloque piel, alguien confundió marco con campo de juego. */
const VERDES_DE_CANCHA = ["#2e7d32", "#388e3c", "#1e6b33", "#236f38", "#1f7a3c", "#2a9d4f", "#259247"];
const enPiel = Object.keys(BAL.piel).filter(k => k.charAt(0) !== "_")
  .map(k => String(BAL.piel[k]).toLowerCase());
VERDES_DE_CANCHA.forEach(v => {
  assert(enPiel.indexOf(v) < 0,
    "el tono de PASTO " + v + " no puede estar en balance.piel: la cancha es campo de juego, no marco");
});
console.log("[6] la paleta del marco no pisa ninguno de los " + VERDES_DE_CANCHA.length + " verdes de cancha");

/* ---------- [7] nombreCorto contra los clubes del juego ----------
   A 14 letras (avisos, relato, marcador) y a 18 (tabla): GENERAL, INGENIERO,
   SANTA y COLONIA se abrevian como en los carteles de ruta, la localidad queda
   entera y ningún club queda escrito igual que otro. */
const DIV = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/divisiones.json"), "utf8")).divisiones;
const CLUBES = [].concat.apply([], Object.keys(DIV).map(k => DIV[k].rivales));
assert(CLUBES.length >= 45, "control: los clubes de las divisiones (vinieron " + CLUBES.length + ")");
const CARTEL = { GENERAL: "GRAL.", INGENIERO: "ING.", SANTA: "STA.", COLONIA: "COL." };
/* ING. y COL. no aparecen en las divisiones: van dos localidades pampeanas de verdad */
const PRUEBA = CLUBES.concat(["Atlético Ingeniero Luiggi", "Deportivo Colonia Barón"]);
[14, 18].forEach(tope => {
  const vistos = {};
  PRUEBA.forEach(club => {
    const largo = club.toUpperCase().split(/\s+/);
    const corto = P.nombreCorto(club, tope);
    const palabras = corto.split(" ");
    assert(corto.length <= tope, club + " a " + tope + ": \"" + corto + "\" tiene " + corto.length + " letras");
    assert(palabras[palabras.length - 1] === largo[largo.length - 1],
      club + " a " + tope + ": \"" + corto + "\" perdió la localidad. SÍNTOMA: el club no se reconoce");
    Object.keys(CARTEL).forEach(w => {
      if (largo.indexOf(w) < 0 || palabras.indexOf(w) >= 0) return;
      const raiz = w.slice(0, 3);
      const malAbreviada = palabras.some(p => p !== CARTEL[w] && p.endsWith(".") && p.startsWith(raiz));
      assert(!malAbreviada, club + " a " + tope + ": \"" + corto + "\" abrevia " + w + " distinto de " + CARTEL[w]);
    });
    if (vistos[corto]) assert(false, "a " + tope + " letras \"" + corto + "\" es " + vistos[corto] + " y también " + club);
    vistos[corto] = club;
  });
});
assert(P.nombreCorto("Estrella de General Pico", 14) === "GRAL. PICO", "a 14, \"GRAL. PICO\" (vino " + P.nombreCorto("Estrella de General Pico", 14) + ")");
assert(P.nombreCorto("Capital de Santa Rosa", 14) === "CAP. STA. ROSA", "a 14, \"CAP. STA. ROSA\" (vino " + P.nombreCorto("Capital de Santa Rosa", 14) + ")");
[13, 12, 11, 10, 9].forEach(tope => {
  const r = P.nombreCorto("Capital de Santa Rosa", tope);
  assert(r === "STA. ROSA", "Capital de Santa Rosa a " + tope + ": \"STA. ROSA\" y nunca \"SAN. ROSA\" (vino " + r + ")");
});
assert(P.nombreCorto("Atlético Ingeniero Luiggi", 14) === "ING. LUIGGI" && P.nombreCorto("Deportivo Colonia Barón", 14) === "COL. BARÓN",
  "a 14, \"ING. LUIGGI\" y \"COL. BARÓN\" (vinieron " + P.nombreCorto("Atlético Ingeniero Luiggi", 14) + " y " + P.nombreCorto("Deportivo Colonia Barón", 14) + ")");
/* un par unido por Y va entero o no va: "CAL MACACHÍN" se lee como otro club */
assert(P.nombreCorto("Sal y Cal de Macachín", 18) === "SAL Y CAL MACACHÍN", "a 18, \"SAL Y CAL MACACHÍN\" (vino " + P.nombreCorto("Sal y Cal de Macachín", 18) + ")");
[14, 13].forEach(tope => {
  const r = P.nombreCorto("Sal y Cal de Macachín", tope);
  assert(r === "MACACHÍN", "Sal y Cal de Macachín a " + tope + ": la mitad del par sola confunde (vino " + r + ")");
});
console.log("[7] nombreCorto: " + CLUBES.length + " clubes a 14 y 18 letras, carteles de ruta, localidad entera, sin repetidos");

if (mal === 0) console.log("\n✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("\n✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
