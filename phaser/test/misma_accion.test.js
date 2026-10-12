/* ============================================================================
   PAMPA STAR · MISMA ACCIÓN, MISMA ANIMACIÓN (oct 2026)

   Rodri, cuarta vez: "es azaroso las mecánicas: a veces tiene animación y a
   veces no". Las veces anteriores se buscó QUÉ escena faltaba (P3 encontró
   que el trámite se dibujaba en una capa invisible y lo pasó al panel). Esta
   vez se recorrió cada salida de cada duelo y quedaban CINCO que terminaban en
   un renglón de texto mientras la misma acción, en otra situación, tenía
   viñeta:
     · el quite ganado en el medio de la cancha (en zona de peligro: viñeta)
     · el corte ganado en el medio (en zona: viñeta de 0,6 s, porque cobraba
       el presupuesto del trámite — casi no se veía)
     · la pared perdida (la gambeta perdida: viñeta)
     · perder la gambeta o la pared contra una megacosa (sin megacosa: viñeta)
     · el tiro tapado por una megacosa (sin megacosa: la escena del bloqueo)
   Y el remate desde afuera armaba el plano profundo DEBAJO de su viñeta: no
   se veía, pero sonaba y frenaba.

   Ahora toda acción resuelta tiene viñeta; el escalón decide si va rápida o
   entera. Perilla: balance.drama.tramite_con_vinieta (false = Bloque A).

   Corré:  node phaser/test/misma_accion.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..");
var SRC = fs.readFileSync(path.join(RAIZ, "scenes/match.js"), "utf8").replace(/\r\n/g, "\n");
var BAL = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/balance.json"), "utf8"));

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }
function cuerpo(firma) {
  var i = SRC.indexOf(firma); if (i < 0) return "";
  var fin = SRC.indexOf("\n  }\n", i);
  return SRC.slice(i, fin < 0 ? undefined : fin);
}

/* [1] la perilla existe y está prendida */
var D = BAL.drama || {};
assert(D.tramite_con_vinieta === true, "balance.drama.tramite_con_vinieta tiene que existir y estar en true");
assert(typeof D._tramite === "string" && D._tramite.length > 80, "y explicar qué hace y cómo se vuelve atrás");
console.log("[1] perilla tramite_con_vinieta: " + D.tramite_con_vinieta);

/* [2] la defensa ganada: quite y corte con viñeta siempre (rápida en el medio) */
(function () {
  var def = cuerpo("  resolverAccionDefensa(a) {");
  assert(/quiteFuerte \|\| vinTramite/.test(def), "el quite ganado tiene viñeta también en el medio de la cancha");
  assert(/accion: "quite_area", rapida: !quiteFuerte/.test(def), "rápida en el medio, entera en zona de peligro");
  assert(/corteFuerte \|\| vinTramite/.test(def), "el corte ganado, idem");
  assert(!/etiqueta: "· el corte ·", accion: "corte"/.test(def),
    "la viñeta del corte no puede cobrar el presupuesto del trámite (duraba 0,6 s)");
  console.log("[2] quite y corte ganados: viñeta siempre, el escalón decide la duración");
})();

/* [3] el ataque perdido: la pared y las megacosas tienen viñeta */
(function () {
  var at = cuerpo("  resolverAccionAtaque(a, rivalIdx) {");
  assert(/a\.id === "pared" && this\.hayEscenas\(\) && rivalJ/.test(at), "la pared perdida tiene su viñeta");
  assert(/TE CORTARON LA PARED/.test(at), "con su título");
  /* después del cut-in de la megacosa rival hay viñeta, no solo texto */
  var iCut = at.indexOf("this.cutInEspecial(\"¡\" + megaR.n.toUpperCase() + \"!\", megaR.grito, () => {\n        /* oct 2026");
  assert(iCut > 0, "perder contra una megacosa: el cut-in sigue con una viñeta");
  var tiro = cuerpo("  resolverTiro(esCalden, rivalIdx, libre) {");
  assert(/cutInEspecial\([^]*?this\.escenaDelBloqueo\(rival, \{[^]*?desenlace: "ya"/.test(tiro),
    "el tiro tapado por una megacosa termina en la escena del bloqueo (sin tocar el estado otra vez)");
  assert(/cfg\.desenlace !== "ya"/.test(cuerpo("  escenaDelBloqueo(defensor, cfg) {")),
    "escenaDelBloqueo con desenlace 'ya' no vuelve a perder la pelota");
  console.log("[3] pared perdida y megacosas del rival: con viñeta");
})();

/* [4] el remate no arma un plano profundo debajo de su viñeta */
(function () {
  var tiro = cuerpo("  resolverTiro(esCalden, rivalIdx, libre) {");
  assert(/if \(!this\.hayEscenas\(\)\) \{\n\s+const j = st\.mios\[st\.ctrl\];\n\s+if \(j\) this\.quizasProfundo\("tiro"/.test(tiro),
    "el plano profundo del remate desde afuera va solo cuando no hay escenas");
  console.log("[4] el remate desde afuera no esconde un plano profundo debajo de la escena");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
