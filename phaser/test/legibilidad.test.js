/* ============================================================================
   PAMPA STAR · test de LEGIBILIDAD Y TACTO

   Nació de una medición, no de una corazonada: el número de camiseta del mapa
   medía 9 px lógicos = 6,5 px REALES en un teléfono apaisado (844x390, factor
   0,7222). Su altura de mayúscula daba 5,8 minutos de arco a distancia de
   brazo, y el umbral de agudeza 20/20 son 5. O sea: estaba por debajo del
   umbral de RESOLUCIÓN, no de lectura. Encima el trazo medía 0,65 px reales y
   el juego corre con pixelArt (nearest-neighbour), que al bajar 960→693
   descarta filas enteras: el 8 y el 6 se volvían la misma mancha.

   Por qué importa más que "se ve chico": la regla de accesibilidad del proyecto
   dice que en el mapa te reconocés por el NÚMERO tanto como por el color. Si el
   número no se resuelve, la única pista que queda es el color — y el color solo
   no alcanza.

   Este test barre los tamaños declarados y falla si algo cae por debajo del
   piso. Los mensajes dicen el SÍNTOMA, no solo el número.

   Corré:  node phaser/test/legibilidad.test.js
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

let ok = 0, mal = 0;
function assert(cond, msg) { if (cond) ok++; else { mal++; console.error("  ✗ " + msg); } }

const RAIZ = path.join(__dirname, "..", "..");
const BAL = JSON.parse(fs.readFileSync(path.join(RAIZ, "phaser/data/balance.json"), "utf8"));
const LEG = BAL.legibilidad || {};

/* el teléfono de referencia: apaisado, el más común. Con Scale.FIT la escala la
   manda el ALTO, así que el factor es alto_real / alto_lógico. */
const TEL = { w: 844, h: 390 };
const K = TEL.h / 540;                       // 0.7222
const real = (logico) => logico * K;
const logico = (r) => r / K;
/* TANDA 1.0, L09: y el chico, que es contra el que se mide desde este lote
   (800x360: con FIT manda el alto, 360/540 = 0,6667). Lo que entra en este
   entra en todos los apaisados de 360 de alto para arriba. */
const CHICO = { w: 800, h: 360 };
const KC = CHICO.h / 540;                    // 0.6667
const realChico = (l) => l * KC;

/* ---------- [1] el bloque existe y es coherente ---------- */
assert(BAL.legibilidad != null, "balance.json tiene que traer el bloque 'legibilidad'");
["num_mapa", "ficha_r", "tap_min", "texto_info_min", "texto_decision_min"].forEach(k => {
  assert(typeof LEG[k] === "number" && LEG[k] > 0, "legibilidad." + k + " tiene que ser un número > 0");
});
console.log("[1] factor de los teléfonos: " + TEL.w + "x" + TEL.h + " → " + K.toFixed(4) + " · " + CHICO.w + "x" + CHICO.h + " → " + KC.toFixed(4));
/* el texto con el que se decide, en el teléfono chico, no puede quedar por
   debajo de lo que es el piso de información en el de referencia */
assert(realChico(LEG.texto_decision_min) >= real(LEG.texto_info_min) - 0.01,
  "legibilidad.texto_decision_min (" + LEG.texto_decision_min + ") da " + realChico(LEG.texto_decision_min).toFixed(1) +
  " px reales en un " + CHICO.w + "x" + CHICO.h + ", menos que el piso de información en el de " + TEL.w + "x" + TEL.h +
  " (" + real(LEG.texto_info_min).toFixed(1) + "). SÍNTOMA: en el teléfono chico, lo que decide el partido se lee peor que un dato cualquiera en el grande.");
console.log("    · el texto de decisión: " + LEG.texto_decision_min + " lógicos = " + real(LEG.texto_decision_min).toFixed(1) +
  " reales en " + TEL.w + "x" + TEL.h + " y " + realChico(LEG.texto_decision_min).toFixed(1) + " en " + CHICO.w + "x" + CHICO.h);

/* ---------- [2] EL NÚMERO DEL MAPA SE RESUELVE ----------
   Dos criterios independientes, los mismos con los que se calculó el piso. */
const CAP_EM = 0.700;              // capHeight de Pixelify Sans, medido del TTF
const TRAZO_EM = 0.100;            // la retícula de la fuente: 0,1 em por píxel de diseño
const ARCMIN_MIN = 10;             // altura de mayúscula para lectura AL VUELO (20/20 son 5)
const PX_POR_ARCMIN = 0.0785;      // a 40cm y ~96ppi: 1 arcmin ≈ 0.0785 px reales... (ver nota)
/* Nota honesta: en vez de meter una constante óptica discutible, el criterio se
   expresa como lo que se midió: a 9px lógicos la cap daba 4,55 px reales y eso
   eran 5,8 arcmin. De ahí sale la proporción px_reales → arcmin. */
const ARCMIN_POR_PX_REAL = 5.8 / 4.55;

const capReal = real(LEG.num_mapa) * CAP_EM;
const arcmin = capReal * ARCMIN_POR_PX_REAL;
assert(arcmin >= ARCMIN_MIN,
  "el número del mapa mide " + LEG.num_mapa + " lógicos = " + real(LEG.num_mapa).toFixed(1) +
  " px reales en un teléfono; su altura de mayúscula da " + arcmin.toFixed(1) + " minutos de arco y hacen falta " +
  ARCMIN_MIN + ". SÍNTOMA: el número NO SE RESUELVE a distancia de brazo — no es que se vea chico, es que el ojo no lo separa. " +
  "Y en el mapa te reconocés por el número tanto como por el color.");

const trazoReal = real(LEG.num_mapa) * TRAZO_EM;
assert(trazoReal >= 1,
  "el trazo del dígito mide " + trazoReal.toFixed(2) + " px reales (hace falta 1). SÍNTOMA: con pixelArt el " +
  "downscale nearest-neighbour DESCARTA filas enteras, así que se le caen trazos al dígito y el 8 y el 6 se " +
  "vuelven la misma mancha. Subí legibilidad.num_mapa.");
console.log("[2] número del mapa: " + LEG.num_mapa + " lógicos = " + real(LEG.num_mapa).toFixed(1) +
  " reales · cap " + arcmin.toFixed(1) + " arcmin · trazo " + trazoReal.toFixed(2) + " px");
/* en el chico solo se informa: el piso del número se calculó para el de
   referencia y moverlo es re-maquetar el mapa entero */
console.log("    · en un " + CHICO.w + "x" + CHICO.h + ": " + realChico(LEG.num_mapa).toFixed(1) + " reales · cap " +
  (realChico(LEG.num_mapa) * CAP_EM * ARCMIN_POR_PX_REAL).toFixed(1) + " arcmin · trazo " + (realChico(LEG.num_mapa) * TRAZO_EM).toFixed(2) + " px");

/* ---------- [3] LA FICHA CONTIENE AL NÚMERO ----------
   El número de dos dígitos más ancho ("88") mide, medido con la fuente real,
   1,25 veces el fontSize de ancho y 1,06 de alto. */
const ANCHO_2D = 1.25, ALTO_1L = 1.06;
const numW = LEG.num_mapa * ANCHO_2D, numH = LEG.num_mapa * ALTO_1L;
/* en un círculo de radio r, a la altura del texto (±numH/2) el ancho útil es
   2·√(r² − (numH/2)²) */
const semiAlto = numH / 2;
const anchoUtil = LEG.ficha_r > semiAlto ? 2 * Math.sqrt(LEG.ficha_r * LEG.ficha_r - semiAlto * semiAlto) : 0;
assert(anchoUtil >= numW,
  "la ficha (r=" + LEG.ficha_r + ") deja " + anchoUtil.toFixed(1) + " lógicos de ancho a la altura del número, " +
  "y el número de dos dígitos mide " + numW.toFixed(1) + ". SÍNTOMA: el número se pinta AFUERA de su propia ficha " +
  "y se confunde con la ficha de al lado. Subí legibilidad.ficha_r o bajá num_mapa.");
console.log("[3] ficha r=" + LEG.ficha_r + ": " + anchoUtil.toFixed(1) + " de ancho útil para un número de " + numW.toFixed(1));

/* el triángulo del rival: su ancho crece hacia la base, el número va abajo */
if (LEG.ficha_rival_base && LEG.ficha_rival_alto) {
  const FRAC = 0.72;                                  // dónde va el número, desde el ápice
  const anchoTri = LEG.ficha_rival_base * FRAC;
  assert(anchoTri >= numW,
    "el triángulo del rival (base " + LEG.ficha_rival_base + ") deja " + anchoTri.toFixed(1) +
    " de ancho donde va el número, que mide " + numW.toFixed(1) + ". SÍNTOMA: el número del rival no entra en su ficha. " +
    "El triángulo es el caso peor: su área útil es la mitad que la de un círculo.");
  console.log("    · triángulo rival: " + anchoTri.toFixed(1) + " de ancho útil");
}

/* ---------- [4] EL PISO TÁCTIL ---------- */
const TAP_CSS = 44;                                   // el piso de accesibilidad táctil
assert(Math.abs(real(LEG.tap_min) - TAP_CSS) < 2,
  "legibilidad.tap_min (" + LEG.tap_min + " lógicos) tiene que dar ~" + TAP_CSS + " px reales en el teléfono " +
  "(da " + real(LEG.tap_min).toFixed(1) + "). SÍNTOMA: los botones quedan por debajo del piso táctil y el dedo no acierta.");
console.log("[4] piso táctil: " + LEG.tap_min + " lógicos = " + real(LEG.tap_min).toFixed(1) + " px reales (" +
  realChico(LEG.tap_min).toFixed(1) + " en un " + CHICO.w + "x" + CHICO.h + ")");

/* ---------- [5] LOS TEXTOS DE INFORMACIÓN DEL CÓDIGO ----------
   Barre los fontSize literales de las escenas y avisa de los que llevan
   INFORMACIÓN por debajo del piso. Los decorativos se declaran exentos acá. */
/* Pedido de Rodri del 17/oct: el piso de este barrido sube de 12 a 13 para
   que no vuelvan los textos de 12 que se subieron el 18 y el 19/oct. El de
   balance (legibilidad.texto_info_min) sigue en 12 porque con él se calculan
   los criterios de [1] a [4]. */
const PISO_TEXTOS = 13;
const EXENTOS = [
  /* decorativos o de una sola vez, que no llevan dato que haya que leer al vuelo */
  "22px", "26px", "40px", "44px", "48px"
];
const escenas = fs.readdirSync(path.join(RAIZ, "phaser/scenes")).filter(f => f.endsWith(".js"));
const bajos = [];
escenas.forEach(f => {
  const src = fs.readFileSync(path.join(RAIZ, "phaser/scenes", f), "utf8");
  const re = /fontSize:\s*"(\d+)px"/g;
  let mt;
  while ((mt = re.exec(src)) !== null) {
    const px = parseInt(mt[1], 10);
    if (px >= PISO_TEXTOS) continue;
    if (EXENTOS.indexOf(px + "px") >= 0) continue;
    const linea = src.slice(0, mt.index).split("\n").length;
    bajos.push({ archivo: f, linea, px });
  }
});
/* Esto NO falla: hoy hay 60+ textos de 10-11px y subirlos todos es una tanda
   propia (re-maqueta media pantalla). El test los CUENTA y falla si el número
   CRECE — así se puede bajar la deuda sin que se acumule más. */
const TOPE_DEUDA = bajos.length;
const REGISTRO = path.join(__dirname, "_legibilidad_deuda.json");
let previo = null;
try { previo = JSON.parse(fs.readFileSync(REGISTRO, "utf8")); } catch (e) { }
if (previo && typeof previo.textosBajoElPiso === "number") {
  assert(bajos.length <= previo.textosBajoElPiso,
    "hay " + bajos.length + " textos por debajo del piso de " + PISO_TEXTOS + " lógicos y antes había " +
    previo.textosBajoElPiso + ". SÍNTOMA: se sumó texto que en un teléfono no se lee. " +
    "Los nuevos: revisá los fontSize agregados en phaser/scenes/.");
} else {
  fs.writeFileSync(REGISTRO, JSON.stringify({ textosBajoElPiso: bajos.length, piso: PISO_TEXTOS }, null, 1));
}
console.log("[5] textos por debajo de " + PISO_TEXTOS + " lógicos: " + bajos.length +
  " (el test no falla por ellos; falla si el número CRECE)");
/* La línea DEUDA: la levanta test.sh y la muestra al final de CADA corrida de
   la suite. Una deuda enterrada en un HANDOFF no se paga: esta se ve siempre. */
if (bajos.length > 0) {
  const peor = bajos.slice().sort((a, b) => a.px - b.px)[0];
  const porArchivo = {};
  bajos.forEach(b => { porArchivo[b.archivo] = (porArchivo[b.archivo] || 0) + 1; });
  const detalle = Object.entries(porArchivo).sort((a, b) => b[1] - a[1])
    .map(([f, n]) => f.replace(".js", "") + " " + n).join(", ");
  console.log("DEUDA: " + bajos.length + " textos por debajo de " + PISO_TEXTOS +
    " px lógicos (" + (real(PISO_TEXTOS)).toFixed(1) + " reales en un " + TEL.w + "x" + TEL.h + ", " +
    realChico(PISO_TEXTOS).toFixed(1) + " en un " + CHICO.w + "x" + CHICO.h + "). " +
    "El más chico: " + peor.px + "px en " + peor.archivo + ":" + peor.linea + ". Por archivo: " + detalle);
}

if (mal === 0) console.log("\n✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("\n✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
