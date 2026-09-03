/* ============================================================================
   PAMPA STAR · EL CACHE PEREZOSO QUE NO SE LIMPIA EN init()

   EL BUG, y congelaba el juego entero. El HUD dibuja con cache perezoso:

       if (this._hudX !== txt) { this._hudX = txt;
         if (!this.txtX) { this.txtX = this.add.text(...); }
         this.txtX.setText(txt); }

   Phaser REUSA la instancia de la escena en scene.start()/restart(): solo
   vuelven a correr init() y create(). Si init() no pone `this.txtX = null`, la
   referencia sigue apuntando al Text DESTRUIDO del partido anterior — la
   guarda `if (!this.txtX)` da FALSO, no lo recrea, y el primer setText tira

       TypeError: Cannot read properties of null (reading 'cut')

   Y en Phaser eso no es un error mas. El RAF es:
       step(t) { callback(t); if (isRunning) requestAnimationFrame(step) }
   Si el callback tira, NO SE VUELVE A PEDIR EL FRAME. El juego queda clavado.

   Paso de verdad: `txtMano` (la linea del HUD con tu mano de cartas) se cableo
   copiando el patron de DIBUJO de txtFichas y no el de LIMPIEZA, que estaba
   tres lineas mas arriba. El segundo partido de cada sesion se congelaba apenas
   cambiaba la mano — al defender, o cuando una carta entraba en recarga. En la
   fecha 2 del Master y en "OTRO PARTIDO".

   Es la leccion de P1 otra vez. Este test la convierte en algo que la suite ve:
   TODO par (_hudX, txtX) que la escena dibuje con cache perezoso tiene que
   reiniciarse en init().

   Corré:  node phaser/test/cache_hud.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
function leer(p) { try { return fs.readFileSync(path.join(RAIZ, p), "utf8"); } catch (e) { return ""; } }
function archivos(dir) {
  try { return fs.readdirSync(path.join(RAIZ, dir)).filter(function (f) { return f.slice(-3) === ".js"; }).map(function (f) { return dir + "/" + f; }); }
  catch (e) { return []; }
}
function sinComentarios(s) {
  var out = "", i = 0, n = s.length, j;
  while (i < n) {
    if (s[i] === "/" && s[i + 1] === "*") { j = s.indexOf("*/", i + 2); i = j < 0 ? n : j + 2; continue; }
    if (s[i] === "/" && s[i + 1] === "/") { j = s.indexOf("\n", i); i = j < 0 ? n : j; continue; }
    out += s[i++];
  }
  return out;
}

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* el cuerpo de init(), donde tiene que estar la limpieza */
function cuerpoDeInit(cod) {
  var i = cod.indexOf("\n  init(");
  if (i < 0) return "";
  var j = cod.indexOf("\n  ", i + 8);
  /* hasta el proximo metodo a la misma indentacion */
  var re = /\n  [a-zA-Z_$][\w$]*\s*\(/g;
  re.lastIndex = i + 8;
  var m = re.exec(cod);
  return cod.slice(i, m ? m.index : Math.min(cod.length, i + 12000));
}

/* ---------- [1] TODO CACHE PEREZOSO SE LIMPIA EN init() ---------- */
(function () {
  var sueltos = [], total = 0;
  archivos("phaser/scenes").forEach(function (f) {
    var cod = sinComentarios(leer(f));
    var init = cuerpoDeInit(cod);
    if (!init) return;
    /* el patron: `if (!this.txtX) { this.txtX = this.add.` */
    var re = /if\s*\(\s*!\s*this\.([A-Za-z_$][\w$]*)\s*\)\s*\{[\s\S]{0,200}?this\.\1\s*=\s*this\.add\./g, m;
    while ((m = re.exec(cod))) {
      var campo = m[1];
      total++;
      var limpio = new RegExp("this\\." + campo + "\\s*=\\s*(?:null|this\\.[A-Za-z_$][\\w$]*\\s*=)").test(init) ||
        new RegExp("=\\s*this\\." + campo + "\\s*=").test(init);
      if (!limpio) sueltos.push(f + " → this." + campo);
    }
  });
  sueltos.forEach(function (s) {
    assert(false, "CACHE SIN LIMPIAR EN init() · " + s + " se crea con `if (!this.X)` y no se reinicia. " +
      "Phaser reusa la instancia: en el segundo partido la referencia apunta al objeto DESTRUIDO, " +
      "setText tira TypeError y el RAF de Phaser deja de pedir frames — el juego se CONGELA.");
  });
  assert(total >= 3, "tiene que haber caches perezosos que vigilar (hay " + total + ")");
  console.log("[1] " + total + " caches perezosos · " + sueltos.length + " sin limpiar en init()");
})();

/* ---------- [2] LOS DEL HUD DEL PARTIDO, CON NOMBRE Y APELLIDO ---------- */
(function () {
  /* los que ya nos mordieron, fijados uno por uno para que el mensaje sea claro
     si alguien saca la linea */
  var init = cuerpoDeInit(sinComentarios(leer("phaser/scenes/match.js")));
  assert(init.length > 0, "match.js tiene que tener init()");
  [["txtMano", "la mano de cartas — congelaba el segundo partido"],
  ["txtFichas", "las fichas del jugadón"],
  ["_hudMano", "el cache de texto de la mano"],
  ["_hudFichas", "el cache de texto de las fichas"]].forEach(function (par) {
    assert(new RegExp("this\\." + par[0] + "\\s*=").test(init),
      "init() tiene que reiniciar this." + par[0] + " (" + par[1] + ")");
  });
  console.log("[2] los cuatro caches del HUD del partido se reinician por partido");
})();

/* ---------- [3] Y EL PATRON SE ESCRIBE JUNTO ---------- */
(function () {
  /* la causa raiz fue copiar el DIBUJO sin la LIMPIEZA. Que queden pegados en
     el archivo hace mucho mas dificil repetirlo. */
  var init = cuerpoDeInit(sinComentarios(leer("phaser/scenes/match.js")));
  var iF = init.indexOf("txtFichas"), iM = init.indexOf("txtMano");
  assert(iF >= 0 && iM >= 0, "los dos tienen que estar en init()");
  assert(Math.abs(iF - iM) < 1400,
    "la limpieza de txtFichas y txtMano tiene que quedar junta: separarlas es como nacio el bug");
  console.log("[3] las limpiezas viven juntas, a " + Math.abs(iF - iM) + " caracteres");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
