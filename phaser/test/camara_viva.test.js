/* ============================================================================
   PAMPA STAR · LA CÁMARA VIVA (oct 2026, "mejorale las dinámicas a todo el arte")

   Las viñetas eran fotos: la pose entraba, temblaba 2 px y quedaba. La pose
   NO se anima (doctrina V6: pose quieta, corte seco); lo que faltaba mover
   era la cámara. Ahora, mientras la pose se sostiene, la cámara se acerca y
   las figuras se acercan más que el fondo, que además se corre al revés (el
   paralaje de la cámara multiplano). Se clava en el silencio y en la
   revelación golpea con un zoom que entra y vuelve.

   Dos cosas que se vieron en las capturas y quedan fijadas acá:
     · el golpe de zoom pedido desde el callback del primero quedaba clavado
       en 1,05 (Phaser cierra el efecto después del callback)
     · el fondo corrido 11 px y agrandado 1,1% dejaba una franja de 5 px sin
       pintura en el borde derecho

   Corré:  node phaser/test/camara_viva.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..");
var SRC = fs.readFileSync(path.join(RAIZ, "scenes/match.js"), "utf8").replace(/\r\n/g, "\n");
var V9 = fs.readFileSync(path.join(RAIZ, "scenes/escenas_v9.js"), "utf8").replace(/\r\n/g, "\n");
var BAL = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/balance.json"), "utf8"));

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }
function cuerpo(txt, firma) {
  var i = txt.indexOf(firma); if (i < 0) return "";
  var fin = txt.indexOf("\n  }\n", i);
  return txt.slice(i, fin < 0 ? undefined : fin);
}

/* [1] las perillas */
var CV = (BAL.cine || {}).camara_viva || {};
/* Pedido de Rodri del 17/oct ("las animaciones 3D rompieron el juego"): la
   cámara viva queda apagada por perilla. Antes este assert pedía activa:true.
   El código sigue; lo que se fija es que la perilla la apague de verdad. */
assert(CV.activa === false, "balance.cine.camara_viva.activa queda en false (pedido de Rodri del 17/oct)");
assert(/if \(CV\.activa === false \|\| !this\.cineContent\) return;/.test(cuerpo(SRC, "  dollyCine(ms, fuerza) {")),
  "con activa:false dollyCine no mueve nada");
assert(/if \(CV\.activa === false \|\| !this\.uiCam\) return;/.test(cuerpo(SRC, "  golpeDeCamara(fuerza) {")),
  "con activa:false golpeDeCamara no hace el golpe de zoom");
assert(CV.acercar_figuras > CV.acercar_fondo, "las figuras se acercan MÁS que el fondo: eso es el paralaje");
console.log("[1] perillas: figuras " + CV.acercar_figuras + " · fondo " + CV.acercar_fondo + " · corrida " + CV.corrida_fondo_px + " px");

/* [2] el fondo siempre tapa el borde: con lo que se corre, crece al menos 2·dx/W */
(function () {
  var W = 960;
  [1, 1.25, 1.6].forEach(function (k) {
    var dx = CV.corrida_fondo_px * k;
    var sf = Math.max(1 + CV.acercar_fondo * k, 1 + 2 * dx / W + 0.002);
    var izq = W / 2 - dx - W * sf / 2, der = W / 2 - dx + W * sf / 2;
    assert(izq <= 0 && der >= W, "con fuerza " + k + " el fondo tiene que cubrir de 0 a 960 (va de " + izq.toFixed(1) + " a " + der.toFixed(1) + ")");
  });
  var dolly = cuerpo(SRC, "  dollyCine(ms, fuerza) {");
  assert(/Math\.max\(1 \+ lejos \* p\.v, 1 \+ 2 \* dx \/ W/.test(dolly), "dollyCine agranda el fondo según lo que lo corre");
  console.log("[2] el fondo cubre el cuadro en las tres fuerzas");
})();

/* [3] en la escena: se acerca en la pose, se clava en el silencio, golpea en la revelación */
(function () {
  var esc = cuerpo(SRC, "  escenaCine(cfg) {");
  assert(/this\.dollyCine\(tPose/.test(esc), "la escena arranca la cámara viva durante la pose");
  assert(/la cámara también se clava/.test(esc), "y la clava en el freeze");
  assert(/this\.golpeDeCamara\(/.test(esc), "y golpea en la revelación");
  var golpe = cuerpo(SRC, "  golpeDeCamara(fuerza) {");
  assert(/this\.time\.delayedCall\(90, \(\) => \{ if \(this\.uiCam\) this\.uiCam\.zoomTo\(1,/.test(golpe),
    "la vuelta del zoom se programa aparte (desde el callback quedaba clavado en 1,05)");
  assert(/this\.resetDolly\(\)/.test(cuerpo(SRC, "  limpiarContenido() {")), "limpiarContenido deja la cámara en su lugar");
  assert(/this\.uiCam\.setZoom\(1\)/.test(cuerpo(SRC, "  cerrarEscena(alFinal) {")), "y el zoom no cruza al partido");
  /* el remate rival y el pase también */
  assert((V9.match(/this\.dollyCine\(/g) || []).length >= 2, "el remate rival y el pase usan la cámara viva");
  assert((V9.match(/self\.pararDolly\(\)/g) || []).length >= 2, "y se clavan en su silencio");
  console.log("[3] escenas: se acerca, se clava, golpea; remate rival y pase incluidos");
})();

/* [4] los carteles de información no se van de la pantalla */
assert(/this\.cineInfo = this\.add\.container/.test(SRC), "existe la capa de información fuera de lo que se acerca");
assert(/\(this\.cineInfo \|\| this\.cineContent\)\.add\(tS\)/.test(SRC), "el cartel de cuántos hay en el camino va ahí");
console.log("[4] los carteles quedan quietos en el borde");

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
