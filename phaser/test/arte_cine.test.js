/* ============================================================================
   PAMPA STAR · LOS FONDOS PINTADOS DEL CINE (la luz de la escalera)

   Lo que se puede vigilar sin navegador de scenes/cine_arte.js: que cada
   división tenga su luz, que las paletas estén completas y bien escritas,
   que el azar con semilla dé siempre el mismo fondo, que dos pedidos
   distintos no compartan textura, que la limpieza al cambiar de ambiente
   suelte solo lo que tiene que soltar, y que los once lugares que pintaban
   plano pidan la pintura SIN perder su fondo de respaldo.

   Lo que se ve —que la pintura sea linda— no lo decide un test: está en las
   capturas de .claude/shots/JUEGO_* y LAB_*.

   Corré:  node phaser/test/arte_cine.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var A = require(path.join(RAIZ, "phaser/logic/ambiente.js"));
var DATA = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/ambientes.json"), "utf8"));
var DIV = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/divisiones.json"), "utf8"));
function leer(p) { try { return fs.readFileSync(path.join(RAIZ, p), "utf8"); } catch (e) { return ""; } }
var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }
var HEX = /^#[0-9a-f]{6}$/i;

/* ---------- [1] CADA DIVISIÓN JUEGA A SU HORA ---------- */
(function () {
  var divs = Object.keys(DIV.divisiones);
  divs.forEach(function (d) {
    var id = DATA.por_division[d];
    assert(id && DATA.ambientes[id], "la división " + d + " tiene que tener un ambiente que exista (tiene '" + id + "')");
  });
  assert(DATA.ambientes[DATA.por_division.sin_division], "el amistoso y el clásico (sin división) tienen su ambiente");
  var ids = divs.map(function (d) { return DATA.por_division[d]; });
  assert(new Set(ids).size === divs.length, "cada escalón de la escalera tiene su PROPIA luz (subir se tiene que ver): " + ids.join(", "));
  console.log("[1] " + divs.length + " divisiones → " + ids.join(" · "));
})();

/* ---------- [2] LAS PALETAS ESTÁN COMPLETAS ---------- */
(function () {
  var n = 0;
  Object.keys(DATA.ambientes).forEach(function (id) {
    var p = DATA.ambientes[id];
    assert(Array.isArray(p.cielo) && p.cielo.length >= 3 && p.cielo.every(function (c) { return HEX.test(c); }), id + ": el cielo son 3 o más colores #rrggbb");
    assert(Array.isArray(p.pasto) && p.pasto.length === 4 && p.pasto.every(function (c) { return HEX.test(c); }), id + ": el pasto son 4 colores, de lejos a cerca");
    ["lejos", "monte", "monte_luz", "tierra", "bruma", "chapa"].forEach(function (k) { assert(HEX.test(p[k]), id + "." + k + " es un color"); });
    assert(p.campo && p.campo.length === 2, id + ": el campo son dos colores");
    assert(p.nube && HEX.test(p.nube.luz) && HEX.test(p.nube.sombra) && HEX.test(p.nube.base), id + ": la nube tiene luz, sombra y base");
    assert(["pueblo", "estadio_chico", "estadio", "estadio_grande"].indexOf(p.tribuna) >= 0, id + ": la tribuna es de un tipo que el pintor sabe dibujar");
    assert(p.sol === null || (p.sol.y >= 0 && p.sol.y <= 1 && p.sol.x >= 0 && p.sol.x <= 1), id + ": el sol va en fracciones (o no hay sol)");
    assert(p.gente && p.gente.length >= 3, id + ": la hinchada tiene al menos tres tonos");
    /* el pasto de lejos es más claro que el de cerca: es la bruma, lo que da
       la profundidad. Al revés, la cancha se ve como una pared */
    assert(A.luminancia(p.pasto[0]) > A.luminancia(p.pasto[3]), id + ": el pasto de lejos tiene que ser más claro que el de cerca");
    n++;
  });
  ["mio", "rival", "oro"].forEach(function (b) {
    var c = DATA.golpe[b];
    assert(c && c.length === 4 && c.every(function (x) { return HEX.test(x); }), "el golpe '" + b + "' son 4 colores");
    assert(A.luminancia(c[0]) > A.luminancia(c[3]), "el golpe '" + b + "' va de claro (centro) a oscuro (bordes)");
  });
  console.log("[2] " + n + " paletas completas · 3 juegos de golpe");
})();

/* ---------- [3] LA LÓGICA ---------- */
(function () {
  assert(A.ambienteDe("primera_b", DATA).id === "siesta", "la Primera B es la siesta");
  assert(A.ambienteDe("mundial", DATA).id === "gran_noche", "el Mundial es la gran noche");
  assert(A.ambienteDe(null, DATA).id === DATA.por_division.sin_division, "sin división, el ambiente de sin división");
  assert(A.ambienteDe("no_existe", DATA).id === DATA.por_division.sin_division, "una división desconocida cae al de sin división");
  var roto = { por_division: { primera_b: "fantasma" }, ambientes: { tarde: {} } };
  assert(A.ambienteDe("primera_b", roto).id === "tarde", "si el mapa nombra un ambiente que no está, cae al primero que haya");
  assert(A.ambienteDe("primera_b", null).pal === null, "sin datos no hay paleta (y el plano dibuja su fondo viejo)");

  var r1 = A.rngDe("cine_escena_siesta"), r2 = A.rngDe("cine_escena_siesta"), r3 = A.rngDe("cine_escena_tarde");
  var a = [r1(), r1(), r1()], b = [r2(), r2(), r2()], c = [r3(), r3(), r3()];
  assert(a.join() === b.join(), "misma semilla, mismo fondo (la cancha del pueblo es la misma toda la temporada)");
  assert(a.join() !== c.join(), "otra semilla, otro fondo");
  assert(a.every(function (x) { return x >= 0 && x < 1; }), "el azar da números en [0,1)");

  assert(A.multiplicar("#d1a36f", "#ffffff") === "#d1a36f", "multiplicar por blanco no cambia nada (como setTint)");
  assert(A.multiplicar("#d1a36f", "#000000") === "#000000", "multiplicar por negro da negro");
  assert(A.aNumero("#7d8cc0") === 0x7d8cc0, "el color pasa a número para Phaser");
  assert(A.mezclar("#000000", "#ffffff", 0.5) === "#808080", "la mezcla por la mitad");
  console.log("[3] ambiente por división, semilla, color");
})();

/* ---------- [4] DOS PEDIDOS DISTINTOS, DOS TEXTURAS ---------- */
(function () {
  var pie = A.claveDeFondo("golpe", "siesta", { bando: "oro", cx: 0.5, cy: 0.5 });
  var chilena = A.claveDeFondo("golpe", "siesta", { bando: "oro", cx: 0.3, cy: 0.5 });
  assert(pie !== chilena, "el golpe del pie (centrado) y el de la chilena (corrido) NO comparten textura — pasó: la chilena heredaba el centro del pie");
  assert(A.claveDeFondo("golpe", "siesta", { bando: "oro", cx: 0.5, cy: 0.5 }) === pie, "el mismo pedido reusa la textura");
  assert(A.claveDeFondo("golpe", "siesta", { bando: "oro" }) === A.claveDeFondo("golpe", "noche", { bando: "oro" }), "el golpe no depende de la hora");
  assert(A.claveDeFondo("escena", "siesta") !== A.claveDeFondo("escena", "tarde"), "la escena sí depende de la hora");
  assert(A.claveDeFondo("cancha_alta", "noche", { y0: 184 }) !== A.claveDeFondo("cancha_alta", "noche", { y0: 128 }), "la cancha alta depende de dónde empieza");
  /* la limpieza al cambiar de ambiente: exacta */
  var pintadas = {};
  pintadas[A.claveDeFondo("escena", "noche")] = "noche";
  pintadas[A.claveDeFondo("escena", "gran_noche")] = "gran_noche";
  pintadas[A.claveDeFondo("arco", "noche")] = "noche";
  var fuera = A.pinturasDeOtroAmbiente(pintadas, "noche");
  assert(fuera.length === 1 && fuera[0] === A.claveDeFondo("escena", "gran_noche"), "al quedarse en 'noche' se va SOLO la de 'gran_noche' (buscar por texto borraría de más: 'noche' está adentro de 'gran_noche')");
  assert(A.pinturasDeOtroAmbiente({}, "noche").length === 0, "sin pinturas, nada que soltar");
  console.log("[4] claves de textura y limpieza exacta");
})();

/* ---------- [5] LOS ONCE LUGARES PIDEN LA PINTURA Y CONSERVAN EL RESPALDO ---------- */
(function () {
  var m = leer("phaser/scenes/match.js"), e = leer("phaser/scenes/escenas_v9.js"), d = leer("phaser/scenes/definicion_ui.js");
  /* el cuerpo de un método: hasta el próximo método CON LA MISMA SANGRÍA
     (en match.js son 2 espacios, en los mixins 4; un `if (…) {` de adentro
     tiene más y no corta) */
  function cuerpo(cod, firma) {
    var i = cod.indexOf(firma);
    if (i < 0) return "";
    var ini = cod.lastIndexOf("\n", i) + 1, sangria = cod.slice(ini, i);
    if (!/^ *$/.test(sangria)) return "";
    var re = new RegExp("\\n" + sangria + "(?!if\\b|for\\b|while\\b|switch\\b|catch\\b|function\\b|return\\b)[a-zA-Z_$][\\w$]*\\s*\\([^)]*\\)\\s*\\{", "g");
    re.lastIndex = i + firma.length;
    var s = re.exec(cod);
    return cod.slice(i, s ? s.index : i + 8000);
  }
  var lugares = [
    [m, "escenaCine(cfg) {", "escena"], [m, "cutInEspecial(titulo", "golpe"], [m, "planoPie() {", "golpe"],
    [m, "planoEsfuerzo() {", "golpe"], [m, "planoArquero() {", "arco"], [m, "planoDesenlace() {", "arco"],
    [m, "dibujarCanchaProfunda(vp, nearY) {", "profunda"], [e, "fondoDeCancha(conTribuna) {", "cancha_alta"],
    [d, "defFondo(esMiArco) {", "cancha_alta"], [d, "defTeatroFinal(o) {", "golpe"], [d, "defRevelacion(o) {", "golpe"]
  ];
  lugares.forEach(function (l) {
    var c = cuerpo(l[0], l[1]);
    assert(c.length > 0, "existe " + l[1]);
    assert(c.indexOf("fondoCine(\"" + l[2] + "\"") >= 0, l[1] + " pide la pintura '" + l[2] + "'");
  });
  /* el respaldo: si la pintura no está (sin datos, sin canvas), el plano
     dibuja lo de siempre. Se vigila en los que tenían fondo opaco propio */
  ["escenaCine(cfg) {", "planoPie() {", "planoArquero() {", "planoDesenlace() {", "cutInEspecial(titulo"].forEach(function (f) {
    assert(/if \(!(?:this\.fondoCine \|\| !this\.fondoCine|pintado)/.test(cuerpo(m, f)), f + " conserva el fondo viejo como respaldo");
  });
  /* limpiarContenido apaga la pintura: el que no la pide no hereda la del anterior */
  assert(/cineFondo\) this\.cineFondo\.setVisible\(false\)/.test(cuerpo(m, "limpiarContenido() {")), "limpiarContenido apaga la pintura");
  /* la capa de la pintura va PRIMERA en el cine (debajo de lo que dibuja cada plano) */
  var base = cuerpo(m, "buildCineBase() {");
  assert(base.indexOf("this.cineFondo =") >= 0 && base.indexOf("this.cineFondo =") < base.indexOf("this.cineBG ="), "cineFondo se crea antes que cineBG: la pintura queda debajo del arco y las siluetas");
  console.log("[5] " + lugares.length + " lugares piden su pintura, con respaldo");
})();

/* ---------- [6] LA LUZ NUNCA ES INFORMACIÓN ---------- */
(function () {
  /* Rodri es daltónico: el bando no se distingue solo por color. La pintura
     del rival se entibia apenas (un acento), y la palabra la ponen las placas */
  var m = leer("phaser/scenes/match.js");
  var i = m.indexOf("escenaCine(cfg) {"), c = m.slice(i, m.indexOf("cerrarEscena(alFinal) {", i));
  assert(/j\.esVos \? "VOS"/.test(c), "la viñeta sigue poniendo la placa con la palabra VOS");
  assert(/placa\(W \* 0\.3/.test(c) && /placa\(W \* 0\.72/.test(c), "las dos placas con nombre siguen en la viñeta");
  var t = c.match(/tinte: rivProta \? (0x[0-9a-f]{6})/i);
  assert(t, "el tinte del rival es un acento declarado");
  if (t) {
    var n = parseInt(t[1], 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    assert(Math.min(r, g, b) >= 0xc0, "el tinte del rival es SUAVE (ningún canal por debajo de c0): es ambiente, no código de color");
  }
  console.log("[6] el bando lo dicen las placas; la luz es ambiente");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
