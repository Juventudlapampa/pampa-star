/* ============================================================================
   PAMPA STAR · LA PARTITURA DEL REMATE Y DEL GOL (oct 2026)

   Rodri: "está desincronizado el tema de tiros, de cuándo festeja goles".

   Medido con un oído de prueba que registra cada sonido contra lo que se ve
   en ese cuadro (.claude/oido.js), ANTES de este arreglo:
     · cabezazo que es gol: la fanfarria sonaba TRES veces — al decidir (con
       la escena recién entrando: te enterabas del gol por el sonido), al
       revelar, y al cerrar la escena
     · súper tiro: TRES patadas (la carga, el alFinal y el plano del pie)
     · remate común: dos patadas (la segunda con la pelota ya viajando) y
       dos redes y dos fanfarrias en el gol del cine
     · chilena atajada: los guantes y el congelado en el cuadro 0, antes de
       ver nada, y los guantes otra vez al revelar
     · definición y jugadón: el gol se festejaba dos veces
   Y DESPUÉS (verificado en el juego, los siete caminos):
     patada en el contacto → red en el impacto → silencio → fanfarria y
     hinchada, UNA vez cada una.

   LA REGLA: la verdad se toca cuando se decide; lo que se siente, cuando se
   ve. La red y la fanfarria de un gol tienen UN dueño: festejarGolPropio().

   Corré:  node phaser/test/partitura.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..");
function leer(f) { return fs.readFileSync(path.join(RAIZ, f), "utf8").replace(/\r\n/g, "\n"); }
/* sin comentarios: este proyecto nombra en los comentarios lo que se prohíbe */
function codigo(txt) {
  return txt.replace(/\/\*[\s\S]*?\*\//g, function (b) { return b.replace(/[^\n]/g, " "); }).replace(/\/\/[^\n]*/g, "");
}
var MATCH = codigo(leer("scenes/match.js"));
var V9 = codigo(leer("scenes/escenas_v9.js"));
var DEF = codigo(leer("scenes/definicion_ui.js"));
var JUG = codigo(leer("scenes/jugadon_ui.js"));
var ESCENAS = { "match.js": MATCH, "escenas_v9.js": V9, "definicion_ui.js": DEF, "jugadon_ui.js": JUG };

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }
/* el cuerpo de un método de clase (match.js) o de un mixin (los otros) */
function cuerpo(txt, firma) {
  var i = txt.indexOf(firma);
  if (i < 0) return "";
  var ind = txt.lastIndexOf("\n", i) + 1, sangria = txt.slice(ind, i);
  var fin = txt.indexOf("\n" + sangria + "}", i);
  return txt.slice(i, fin < 0 ? undefined : fin);
}
function lineasCon(re) {
  var out = [];
  Object.keys(ESCENAS).forEach(function (f) {
    ESCENAS[f].split("\n").forEach(function (l, n) { if (re.test(l)) out.push(f + ":" + (n + 1)); });
  });
  return out;
}

/* ---------- [1] LA RED Y LA FANFARRIA DEL GOL TIENEN UN DUEÑO ---------- */
(function () {
  var fest = cuerpo(V9, "festejarGolPropio(opts) {");
  assert(fest.length > 0, "tiene que existir festejarGolPropio en escenas_v9.js");
  assert(/SFX\.net\(\)/.test(fest), "festejarGolPropio toca la red en el impacto");
  /* la red: solo el festejo propio y el gol rival (escenaRemateRival) */
  var redes = lineasCon(/\.net\(\)/);
  /* L04b: la firma suma superDef (lo que se contestó a la pregunta de la
     SÚPER DEFENSA); la red del gol rival sigue sonando una vez, acá */
  var remRival = cuerpo(V9, "escenaRemateRival(tiradorIdx, superDef) {");
  var redesRival = (remRival.match(/\.net\(\)/g) || []).length;
  assert(redes.length === 1 + redesRival && redesRival === 1,
    "la red de un gol suena en DOS lugares: el festejo propio y el gol rival. Hay " + redes.length + ": " + redes.join(", "));
  /* efectoGol es la explosión: ya no toca la red (si la toca, cada gol tiene dos) */
  var ef = cuerpo(MATCH, "efectoGol(arcoIzquierdo) {");
  assert(ef.length > 0 && !/\.net\(\)/.test(ef), "efectoGol es la EXPLOSIÓN y no puede tocar la red");
  /* Pedido de Rodri del 17/oct: la fanfarria sintetizada (SFX.goal) se fue
     porque sonaba a consola vieja; hasta hoy este test pedía que sonara en un
     solo lugar, efectoGol. El grito del gol propio es el festejo grabado. */
  var fanfarrias = lineasCon(/\.goal\(\)/);
  assert(fanfarrias.length === 0, "la fanfarria sintetizada del gol no tiene que volver. Hay: " + fanfarrias.join(", "));
  assert(/SFX\.festejo\(\)/.test(ef), "efectoGol hace explotar el festejo grabado");
  /* escenaCine ya no sabe hacer sonar un gol */
  assert(!/sfx === "goal"/.test(MATCH) && !/sfx: (gol \? )?"goal"/.test(MATCH),
    "escenaCine no puede volver a sonar red+fanfarria por su cuenta (era la segunda de tres)");
  console.log("[1] red: festejo propio + gol rival · grito: el festejo de efectoGol · escenaCine no suena goles");
})();

/* ---------- [2] LA VERDAD AL DECIDIR, LA FIESTA AL VER ---------- */
(function () {
  /* los dos caminos que deciden ANTES de abrir la escena difieren lo sensorial */
  var simple = cuerpo(MATCH, "dispararSimple(mega, ej) {");
  var aereo = cuerpo(MATCH, "dispararAereo(id, ej) {");
  assert(/desenlaceRemate\(res, \{ diferir: true \}\)/.test(simple), "dispararSimple tiene que diferir lo que se siente");
  assert(/desenlaceRemate\(res, \{ diferir: this\.hayEscenas\(\) \}\)/.test(aereo), "dispararAereo tiene que diferir lo que se siente cuando hay escena");
  [["dispararSimple", simple], ["dispararAereo", aereo]].forEach(function (p) {
    assert(/alRevelar: \(\) => d\.sentir\(\)/.test(p[1]), p[0] + ": el desenlace se siente al REVELAR");
    assert(!/efectoGol\(/.test(p[1]), p[0] + ": no puede llamar a efectoGol (era la tercera fanfarria, al cerrar la escena)");
  });
  /* desenlaceRemate: sin diferir siente ya; con diferir, no */
  var des = cuerpo(MATCH, "desenlaceRemate(res, opts) {");
  assert(/if \(!opts\.diferir\) d\.sentir\(/.test(des), "desenlaceRemate siente en el momento solo si no se difiere");
  assert(!/golPropio\(\)/.test(des.replace(/anotarGolPropio|festejarGolPropio/g, "")),
    "desenlaceRemate no puede llamar a golPropio entero: anota ya y festeja al sentir");
  /* la definición y el jugadón: anotan al decidir y festejan una vez */
  var vuelo = cuerpo(DEF, "defVueloOf() {");
  assert(/anotarGolPropio\(\)/.test(vuelo) && !/[^r]golPropio\(\)/.test(vuelo.replace(/anotarGolPropio/g, "")),
    "la definición anota el gol al decidir (no lo festeja con la pelota en el aire)");
  var rev = cuerpo(DEF, "defRevelacion(o) {");
  assert(/festejarGolPropio\(\)/.test(rev), "y lo festeja en la revelación");
  var tirar = cuerpo(JUG, "jugadonTirar(zona, ax, ayPiso, AW, AH) {");
  assert((tirar.match(/festejarGolPropio\(\)/g) || []).length === 1 && !/self\.golPropio\(\)/.test(tirar),
    "el jugadón festeja UNA vez, en el impacto (antes otra vez al cerrar)");
  console.log("[2] la verdad al decidir, la fiesta al ver: simple, aéreo, definición, jugadón");
})();

/* ---------- [3] UNA PATADA POR REMATE ---------- */
(function () {
  var porCom = cuerpo(MATCH, "tiroPorComandos(rivalIdx) {");
  /* la del bloqueo (previo) y la del contacto de la escena. Pedido de Rodri
     del 20/oct ("el tiro tiene que sonar más épico"): el contacto del remate
     común es la patada fuerte (sfx "kickFuerte"), como el súper tiro */
  var kicks = (porCom.match(/\.kick\(\)/g) || []).length;
  assert(kicks === 1, "tiroPorComandos: solo la patada del bloqueo puede sonar a mano (hay " + kicks + "); la del remate es el sfx de la escena");
  assert(/sfx: "kickFuerte"/.test(porCom) && !/sfx: "kick"/.test(porCom), "y la escena del remate suena la patada fuerte en el contacto");
  var mega = cuerpo(MATCH, "dispararConCine(mega, ej) {");
  assert(!/\.kick\(\)/.test(mega) && !/sfx: "kick"/.test(mega),
    "el súper tiro no patea en la carga ni al cerrarla: la patada es del plano del pie (eran tres)");
  /* pedido de Rodri del 17/oct: el súper tiro suena con su propia muestra,
     la patada fuerte (audio/sfx.js, LAS MUESTRAS) */
  assert(/\.kickFuerte\(\)/.test(cuerpo(MATCH, "planoPie() {")), "planoPie es el contacto del súper tiro y suena la patada fuerte");
  var bloq = cuerpo(MATCH, "escenaDelBloqueo(defensor, cfg) {");
  /* Pedido de Rodri del 17/oct: los guantes son solo del arquero; el bloqueo
     de un defensor suena el choque (la patada más baja). Hasta hoy este test
     contaba guantes acá. Sigue sonando una vez a mano (el cartel sin escena);
     con escena, en la revelación. */
  var choques = (bloq.match(/\.choque\(\)/g) || []).length;
  assert(choques === 1 && !/\.gloves\(\)|sfx: "gloves"/.test(bloq), "el bloqueo suena el choque una vez a mano y nunca los guantes (choques: " + choques + ")");
  console.log("[3] una patada por remate: comandos, súper tiro, bloqueo");
})();

/* ---------- [4] LA ESCENA CIERRA DESPUÉS DE LA FIESTA ---------- */
(function () {
  var esc = cuerpo(MATCH, "escenaCine(cfg) {");
  assert(/hastaExplosion/.test(esc), "escenaCine tiene que esperar la explosión del gol antes de cerrar");
  assert(!/delayedCall\(tPose \+ silencio \+ this\.msV\(F\.hold_ms \|\| 1150\), cerrarYa\)/.test(esc),
    "el cierre ya no puede ser un reloj fijo desde que abre (cerraba encima de la fiesta)");
  var des = cuerpo(MATCH, "planoDesenlace() {");
  assert(/hastaLaExplosion/.test(des), "el desenlace del cine se queda abierto hasta la explosión");
  console.log("[4] las escenas cierran después de la explosión del gol");
})();

/* ---------- [5] LOS GOLPES CORTOS RESPETAN EL RESPIRO ---------- */
(function () {
  /* en el partido (el jugadón usa temaCampo ADENTRO de su escena, como la
     señal de que le leíste el amague: eso no es volver de una escena) */
  var directos = lineasCon(/SFX\.(temaPosesion|temaCampo)\(/).filter(function (l) { return /^match\.js/.test(l); });
  assert(directos.length === 0, "las notas de posesión y de campo pasan por golpeCorto() (respiro al volver de una escena): " + directos.join(", "));
  assert(/respirar\(\)/.test(cuerpo(MATCH, "cerrarEscena(alFinal) {")), "cerrarEscena abre el respiro");
  assert(/respirar\(\)/.test(cuerpo(MATCH, "salirCine(despues) {")), "salirCine abre el respiro");
  console.log("[5] golpes cortos con respiro después de cada escena");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
