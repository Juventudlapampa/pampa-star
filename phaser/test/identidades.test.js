/* PAMPA STAR · test de las IDENTIDADES (V7-1 §3) — manifest sano + asignación
   determinista. Correr: node phaser/test/identidades.test.js */
"use strict";
const fs = require("fs");
const path = require("path");
const A = require(path.join(__dirname, "..", "logic", "avatar.js"));

let ok = 0, mal = 0;
function assert(cond, msg) {
  if (cond) ok++;
  else { mal++; console.error("✗ " + msg); }
}

const raiz = path.join(__dirname, "..", "..");
const man = JSON.parse(fs.readFileSync(path.join(raiz, "data", "identidades_manifest.json"), "utf8"));

assert(Array.isArray(man.identidades) && man.identidades.length === 6, "6 identidades en el manifest");
assert(typeof man.base === "string", "base declarada");
man.identidades.forEach(d => {
  assert(typeof d.id === "string" && d.id, "id presente: " + JSON.stringify(d));
  assert(typeof d.n === "string" && d.n, "nombre legible presente: " + d.id);
  assert(d.equipo === "mio" || d.equipo === "rival", "equipo mio/rival: " + d.id);
  assert(fs.existsSync(path.join(raiz, man.base, d.archivo)), "archivo existe: " + d.archivo);
});
assert(man.identidades.filter(d => d.equipo === "mio").length === 4, "4 identidades propias");
assert(man.identidades.filter(d => d.equipo === "rival").length === 2, "2 identidades rivales");

/* asignación determinista: mismo nombre → mismo índice, SIEMPRE */
const del = man.identidades.filter(d => d.equipo === "rival");
const nombres = ["Quemú Quemú", "Macachín", "Ingeniero Luiggi", "Rancul", "Parera"];
nombres.forEach(n => {
  const a = A.hashSemilla(n) % del.length;
  for (let k = 0; k < 5; k++) assert(A.hashSemilla(n) % del.length === a, "determinista: " + n);
});
/* y nombres distintos no caen todos en la misma (con 5 nombres y 2 opciones, esperable variedad) */
const idx = new Set(nombres.map(n => A.hashSemilla(n) % del.length));
assert(idx.size > 1, "hay variedad de identidades entre nombres distintos");

if (mal === 0) console.log("✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
