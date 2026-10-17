/* ============================================================================
   PAMPA STAR · LOS NOMBRES VAN EN LA TIPOGRAFÍA QUE SE LEE (pedido de Rodri
   del 17/oct)

   Lo que estaba mal: las placas y etiquetas con nombre iban en PF.texto
   (Pixelify Sans), cuya E mayúscula es redonda: "EZE" se leía "383". Medido
   a 13 px y a 9,4 px reales (13 lógicos en un 844x390), binarizando cada
   glifo y comparando pares que se confunden: en Pixelify la B y el 8 salen
   idénticos, la O y el 0 también, y la Z casi igual al 2. Archivo Black
   (PF.display) es la que más los separa.

   Lo que fija: cada lugar que dibuja un nombre suelto usa PF.display, y
   también la cabecera del cruce, donde "rival 1 de 2" se leía "1 de 8", y
   la bajada del golpe, que arranca con el nombre ("EZE QUEDA ATRÁS").
   Corré:  node phaser/test/nombres_tipografia.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var D = path.join(__dirname, "..", "scenes");
var mal = 0;
function assert(c, m) { if (!c) { mal++; console.log("  FALLA " + m); } else console.log("  ok " + m); }
[
  ["escenas_v9.js", "var t = this.add.text(x, y, (j && j.esVos ? \"VOS\"", 1],
  ["match.js", "const t = this.add.text(x, H * 0.84, (j.esVos ? \"VOS\"", 1],
  ["match.js", "this.panelNombre = this.add.text(", 0],
  ["match.js", "this.marker = this.add.text(", 0],
  ["match.js", "const nom = this.add.text(x, 464,", 0],
  ["jugadon_ui.js", "\" TE SALE AL CRUCE\", {", 0],
  ["jugadon_ui.js", "this.add.text(W / 2, 20, cab, {", 0],
  ["jugadon_ui.js", "self.add.text(W / 2, H - 36, texto, {", 0],
  ["jugadon_ui.js", "\"▲ \" + nombre, {", 0],
  ["editor.js", "p.nombre.toUpperCase(), {", 0]
].forEach(function (c) {
  var src = fs.readFileSync(path.join(D, c[0]), "utf8").split(/\r?\n/);
  var i = src.findIndex(function (x) { return x.indexOf(c[1]) >= 0; });
  assert(i >= 0, c[0] + ": está " + c[1].slice(0, 40));
  var l = i >= 0 ? src[i + c[2]] : "";
  assert(/fontFamily: window\.PF\.display/.test(l) && !/PF\.texto/.test(l), c[0] + ": " + c[1].slice(0, 40) + " va en PF.display");
});
var bal = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "balance.json"), "utf8"));
assert(/^'Archivo Black'/.test(bal.tipografia.display), "la display de balance es Archivo Black, la medida");
if (mal) { console.log(mal + " fallas"); process.exit(1); }
console.log("nombres_tipografia: todo bien");
