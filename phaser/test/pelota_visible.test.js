/* ============================================================================
   PAMPA STAR · LA PELOTA INVISIBLE

   EL BUG, y duró cinco semanas (19/ago → 24/sep de 2026). pelotaVieja()
   cambiaba la pelota de gajos por la de potrero así:

       const rt = this.make.renderTexture(...); rt.draw(img); rt.saveTexture("ball_potrero");
       this.textures.addImage("ball", this.textures.get("ball_potrero").getSourceImage());

   En WebGL la "fuente" de una renderTexture no es una imagen: es su textura
   de GPU. addImage la acepta sin quejarse y registra una "ball" VACÍA. Todo
   sprite "ball" del juego dibujaba nada: la pelota pegada a las poses, la del
   viaje del remate, la que abraza el arquero. Las poses tienen un HUECO donde
   se recortó la pelota dibujada (V7 §0.1: "la pelota es SIEMPRE la del
   juego"), así que el arquero abrazaba un agujero negro. Estaba en las
   capturas —A5_atajada_arreglada.png— y nadie lo leyó como bug.

   Lo encontró la tanda de arte al preguntar por qué la chilena pateaba el
   aire: el sprite existía, era visible, medía 113 px y no se dibujaba.

   Este test no puede renderizar WebGL, pero puede prohibir la forma exacta
   del error: registrar una textura con la fuente de otra que salió de una
   renderTexture. Y fija el arreglo: "ball" se registra desde un canvas 2D.

   Corré:  node phaser/test/pelota_visible.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
function leer(p) { try { return fs.readFileSync(path.join(RAIZ, p), "utf8"); } catch (e) { return ""; } }
function sinComentarios(s) {
  var out = "", i = 0, n = s.length, j;
  while (i < n) {
    if (s[i] === "/" && s[i + 1] === "*") { j = s.indexOf("*/", i + 2); i = j < 0 ? n : j + 2; continue; }
    if (s[i] === "/" && s[i + 1] === "/" && s[i - 1] !== ":") { j = s.indexOf("\n", i); i = j < 0 ? n : j; continue; }
    out += s[i++];
  }
  return out;
}
var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

var archivos = fs.readdirSync(path.join(RAIZ, "phaser/scenes")).filter(function (f) { return /\.js$/.test(f); })
  .map(function (f) { return "phaser/scenes/" + f; });
var codigo = {};
archivos.forEach(function (f) { codigo[f] = sinComentarios(leer(f)); });

/* ---------- [1] NINGUNA TEXTURA SE REGISTRA CON LA FUENTE DE UNA RENDERTEXTURE ---------- */
(function () {
  var guardadas = {};
  archivos.forEach(function (f) {
    var re = /saveTexture\(\s*"([^"]+)"\s*\)/g, m;
    while ((m = re.exec(codigo[f]))) guardadas[m[1]] = f;
  });
  var hallazgos = [];
  archivos.forEach(function (f) {
    var re = /addImage\(\s*"([^"]+)"\s*,\s*this\.textures\.get\(\s*"([^"]+)"\s*\)\.getSourceImage\(\)\s*\)/g, m;
    while ((m = re.exec(codigo[f]))) {
      if (guardadas[m[2]]) hallazgos.push(f + " · addImage(\"" + m[1] + "\") con la fuente de \"" + m[2] + "\" (una renderTexture guardada en " + guardadas[m[2]] + ")");
    }
  });
  hallazgos.forEach(function (h) {
    assert(false, "TEXTURA VACÍA EN WEBGL · " + h + ". La fuente de una renderTexture es su textura de GPU, no una imagen: la textura nueva queda vacía y todo sprite que la use no dibuja nada. Rasterizá en un canvas 2D y registrá con addCanvas.");
  });
  console.log("[1] " + Object.keys(guardadas).length + " renderTextures guardadas · " + hallazgos.length + " registradas de nuevo con addImage");
})();

/* ---------- [2] LA PELOTA SE REGISTRA DESDE UN CANVAS ---------- */
(function () {
  var m = codigo["phaser/scenes/match.js"] || "";
  var i = m.indexOf("pelotaVieja() {");
  assert(i >= 0, "match.js tiene que tener pelotaVieja()");
  var cuerpo = m.slice(i, m.indexOf("\n  }", i));
  assert(/addCanvas\(\s*"ball"/.test(cuerpo), "pelotaVieja() tiene que registrar \"ball\" con addCanvas (un canvas 2D es una imagen para cualquier renderer)");
  assert(!/renderTexture/.test(cuerpo), "pelotaVieja() no puede volver a pasar la pelota por una renderTexture: así quedó invisible cinco semanas");
  assert(/addCanvas\(\s*"ball_hd"/.test(cuerpo), "la pelota en alta (ball_hd) para los planos de cerca");
  console.log("[2] la pelota sale de un canvas 2D, en 16 px y en alta");
})();

/* ---------- [3] LA PELOTA PEGADA A LAS POSES USA EL TAMAÑO EN PANTALLA ---------- */
(function () {
  /* los dos lugares donde la pelota se ve más grande (100 px o más): la
     viñeta y la revelación de la Definición. Tienen que pedir la textura por
     su alto en pantalla, así sale la de alta y no una de 16 px estirada. */
  var m = codigo["phaser/scenes/match.js"] || "", d = codigo["phaser/scenes/definicion_ui.js"] || "";
  assert(/texPelota\(/.test(m.slice(m.indexOf("escenaCine(cfg) {"), m.indexOf("cerrarEscena(alFinal) {"))), "escenaCine pide la pelota con texPelota()");
  assert(/texPelota\(/.test(d.slice(d.indexOf("defRevelacion("), d.indexOf("defRevelacion(") + 4000)), "defRevelacion pide la pelota con texPelota()");
  console.log("[3] la viñeta y la revelación piden la pelota por su tamaño en pantalla");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
