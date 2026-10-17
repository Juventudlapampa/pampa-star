/* ============================================================================
   PAMPA STAR · EL ARQUERO DE LA VIÑETA NO ADELANTA EL DESENLACE (pedido de
   Rodri del 17/oct)

   Lo que estaba mal: en la viñeta de la chilena (y del cabezazo, la volea y
   el remate por viñeta) el arquero rival entraba ya en la pose de atajar
   cuando el tiro iba a ser atajado, y con las manos vacías: la pelota de esa
   ilustración está recortada y la del juego quedaba en el pie de quien
   remata. La viñeta contaba el final antes de la revelación.

   Lo que fija:
     [1] las dos llamadas a escenaCine del remate hacen entrar al arquero
         estirándose, sin mirar el desenlace, y piden la atajada como pose
         final (poseFinalRival)
     [2] la revelación de escenaCine cambia la pose ilustrada del antagonista
         a la final y lleva ahí la pelota del juego, detrás de la pose
     [3] la pose de atajar del rival declara dónde va la pelota

   Corré:  node phaser/test/arquero_vinieta.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var MATCH = fs.readFileSync(path.join(RAIZ, "phaser", "scenes", "match.js"), "utf8").replace(/\r/g, "");
var POSES = JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "poses_manifest.json"), "utf8"));

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* ---------- [1] ---------- */
var entra = MATCH.match(/rival: arqR \? \{ j: arqR, esRival: true, anim: "estirada" \} : null,\n\s*poseFinalRival: res\.outcome === "atajada" \? "atajada" : undefined,/g) || [];
assert(entra.length === 2, "[1] el aéreo y el remate por viñeta: el arquero entra estirándose y la atajada es la pose final (" + entra.length + " de 2)");
assert(!/anim: res\.outcome === "atajada" \? "atajada" : "estirada"/.test(MATCH), "[1] ninguna viñeta elige la pose de entrada del arquero por el desenlace");

/* ---------- [2] ---------- */
var cine = MATCH.slice(MATCH.indexOf("  escenaCine(cfg) {"));
var revelar = cine.slice(cine.indexOf("    const revelar = () => {"), cine.indexOf("    const cerrarYa = () => {"));
assert(/if \(sr && sr\.active && sr\._esPose && cfg\.poseFinalRival\)/.test(revelar), "[2] la revelación atiende la pose final del antagonista ilustrado");
assert(/sr\.setTexture\(this\.poseDelAntagonista\(\{ rival: rivFin \}\)\)/.test(revelar), "[2] cambia la pose en seco (setTexture, sin tween)");
assert(/bolaProta\.setTexture\(TP\.key\)/.test(revelar) && /this\.cineContent\.moveBelow\(bolaProta, sr\)/.test(revelar),
  "[2] la pelota del juego va a las manos, detrás de la pose");
assert(/const bb = bolaProta = this\.add\.sprite\(/.test(cine), "[2] es la misma pelota que estaba en el pie de quien remata (una sola en pantalla)");

/* ---------- [3] ---------- */
var ataja = POSES.poses.arquero_ataja;
assert(ataja && ataja.pelota && ataja.pelota.x != null && ataja.pelota.y != null && ataja.pelota.r > 0, "[3] arquero_ataja declara {x,y,r} de la pelota");

console.log(mal === 0 ? "TODOS OK: " + ok + " asserts, 0 fallaron." : mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
