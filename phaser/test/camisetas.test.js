/* ============================================================================
   PAMPA STAR · test del CATÁLOGO DE CAMISETAS (y del tope del manifest)

   Nació de un bug real: el editor ofrecía las camisetas del manifest con
   .length dinámico, pero validarLook plegaba el índice con un módulo CLAVADO
   en 4 (3 camisetas + Original). Al pasar de 3 a 9, elegías la séptima y el
   juego te mostraba la tercera — en el busto, en la pose y en el radar, porque
   todos validan el look antes de indexar.

   Este test cubre las dos mitades del problema:
     · el DATO — que cada camiseta del manifest tenga nombre distinguible por
       la palabra (regla de daltonismo del proyecto) y un hex parseable;
     · el CÓDIGO — que validarLook respete el tope declarado y no pliegue los
       índices altos, con el manifest real y con topes arbitrarios.

   Corré:  node phaser/test/camisetas.test.js
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

let ok = 0, mal = 0;
function assert(cond, msg) { if (cond) ok++; else { mal++; console.error("  ✗ " + msg); } }

const RAIZ = path.join(__dirname, "..", "..");
const A = require("../logic/avatar.js");
const MAN = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/caras_manifest.json"), "utf8"));
const CAMS = MAN.camisetas || [];

/* ---------- [1] el dato: nombre y color de cada camiseta ---------- */
assert(CAMS.length >= 3, "el manifest tiene que declarar al menos las 3 camisetas originales (hay " + CAMS.length + ")");

const HEX = /^#[0-9a-f]{6}$/i;
CAMS.forEach((c, i) => {
  assert(c && typeof c.n === "string" && c.n.trim().length >= 3,
    "camiseta[" + i + "]: falta el nombre 'n' o es muy corto → " + JSON.stringify(c));
  assert(c && HEX.test(String(c.hex || "")),
    "camiseta[" + i + "] '" + (c && c.n) + "': el hex tiene que ser #rrggbb de 6 dígitos (vino " + (c && c.hex) + "). " +
    "El editor lo pasa por parseInt(hex.slice(1),16) para teñir: un hex corto tiñe cualquier cosa.");
});

/* REGLA DE DALTONISMO: cada camiseta se distingue por la PALABRA, no por el
   color. Dos nombres que solo se diferencian en el tono ("Celeste 1"/"Celeste 2")
   no sirven: hay que poder nombrarla sin verla. */
const nombres = CAMS.map(c => String((c && c.n) || "").trim().toLowerCase());
assert(new Set(nombres).size === nombres.length,
  "hay nombres de camiseta REPETIDOS: " + nombres.filter((n, i) => nombres.indexOf(n) !== i).join(", "));

const PALABRA_VACIA = new Set(["claro", "oscuro", "clarito", "oscurito", "1", "2", "3", "a", "b", "alt", "alternativa"]);
CAMS.forEach(c => {
  const palabras = String(c.n).trim().toLowerCase().split(/\s+/);
  const distintiva = palabras.filter(p => !PALABRA_VACIA.has(p) && p.length >= 4);
  assert(distintiva.length >= 1,
    "camiseta '" + c.n + "': el nombre no tiene ninguna palabra distintiva (solo tono o numeración). " +
    "Regla de daltonismo: se tiene que poder nombrar sin ver el color.");
});

/* que no haya dos camisetas con el MISMO hex: serían la misma opción dos veces */
const hexes = CAMS.map(c => String(c.hex).toLowerCase());
assert(new Set(hexes).size === hexes.length,
  "hay hex REPETIDOS entre camisetas: " + hexes.filter((h, i) => hexes.indexOf(h) !== i).join(", "));

console.log("[1] " + CAMS.length + " camisetas: " + CAMS.map(c => c.n).join(" · "));

/* ---------- [2] el código: validarLook respeta el tope del manifest ---------- */
/* así lo hace index.html al arrancar, con el manifest ya cargado */
A.setCatalogoManifest({ caras: (MAN.caras || []).length, camisetas: CAMS.length });

assert(A.MANIFEST.camisetas === CAMS.length,
  "setCatalogoManifest no tomó el largo de camisetas (esperaba " + CAMS.length + ", quedó " + A.MANIFEST.camisetas + ")");
assert(A.MANIFEST.caras === (MAN.caras || []).length,
  "setCatalogoManifest no tomó el largo de caras (esperaba " + (MAN.caras || []).length + ", quedó " + A.MANIFEST.caras + ")");

/* EL BUG QUE ORIGINÓ ESTE TEST: cada índice ofrecido tiene que sobrevivir la
   validación tal cual. 0 = "Original", 1..N = las del manifest. */
for (let v = 0; v <= CAMS.length; v++) {
  const l = A.validarLook({ tCam: v });
  assert(l.tCam === v,
    "tCam " + v + " se plegó a " + l.tCam + ": el editor ofrece esa camiseta y el juego muestra otra. " +
    "(tope del manifest: " + CAMS.length + " + Original)");
}
/* y el primero FUERA de rango sí tiene que plegarse a Original */
const fuera = A.validarLook({ tCam: CAMS.length + 1 });
assert(fuera.tCam === 0,
  "tCam " + (CAMS.length + 1) + " está fuera de rango y tendría que volver a Original (dio " + fuera.tCam + ")");

/* lo mismo para las CARAS, que tenían el mismo número clavado (% 8) */
for (let v = 0; v < (MAN.caras || []).length; v++) {
  assert(A.validarLook({ cara: v }).cara === v,
    "cara " + v + " se plegó: el manifest declara " + (MAN.caras || []).length + " caras y validarLook no las respeta");
}

console.log("[2] validarLook respeta el tope: tCam 0-" + CAMS.length + " y cara 0-" + ((MAN.caras || []).length - 1));

/* ---------- [3] el tope es de verdad dinámico, no otro número clavado ---------- */
A.setCatalogoManifest({ caras: 14, camisetas: 20 });
assert(A.validarLook({ tCam: 20 }).tCam === 20, "con 20 camisetas declaradas, tCam 20 se plegó");
assert(A.validarLook({ cara: 13 }).cara === 13, "con 14 caras declaradas, cara 13 se plegó");
/* valores inválidos no pueden romper el tope vigente */
A.setCatalogoManifest({ camisetas: 0 });
assert(A.MANIFEST.camisetas === 20, "un largo 0 no tiene que pisar el tope vigente (quedó " + A.MANIFEST.camisetas + ")");
A.setCatalogoManifest(null);
assert(A.MANIFEST.camisetas === 20, "setCatalogoManifest(null) no tiene que romper nada");

/* lo dejamos como está en el juego real, por si otro test comparte el módulo */
A.setCatalogoManifest({ caras: (MAN.caras || []).length, camisetas: CAMS.length });
console.log("[3] el tope sigue al manifest (probado con 20 camisetas y 14 caras)");

if (mal === 0) console.log("\n✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("\n✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
