/* ============================================================================
   PAMPA STAR · LO QUE QUEDÓ DE LA v20c (23/oct): QUE RESPIREN

   Rodri, jugando la v20c: la marca ×N de LA SEMANA iba montada sobre el borde
   de la tarjeta, el aguante del botón TIRO iba pegado al borde de abajo y el
   pase decía "AHORA JUGÁS: VOS". Medido con getBounds en el navegador:

     TIRO (46 de alto)          título 7 px arriba, bajada 3 abajo
     GAMBETA / PARED (44)       6 arriba, 2 abajo
     compañeros del pase (40)   4 arriba, 1 abajo
     ×N de la semana            la mitad afuera de la tarjeta

   Después del arreglo: 7 y 7, 6 y 6, 4 y 4, y la ×N adentro con 4 px de aire
   del borde y de lo escrito en ocho de las diez acciones; en las dos que
   llenan la tarjeta (PICADITO: el nombre se corre y la marca va a su lado,
   3 px; ESTUDIAR PARA LA ESCUELA, entre el nombre y el efecto, 2,5 px).

   Corré:  node phaser/test/aire_marcas.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var Piel = require(path.join(__dirname, "..", "logic", "piel.js"));
var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("✗ " + m); } }
function leer(rel) { return fs.readFileSync(path.join(RAIZ, rel), "utf8"); }

/* [1] lugarLibre: el primero con aire suficiente, o el de más aire */
(function () {
  var caja = { x: 0, y: 0, w: 100, h: 60 }, tam = { w: 16, h: 12 };
  var escrito = [{ x: 10, y: 4, w: 80, h: 12 }, { x: 10, y: 44, w: 80, h: 12 }];
  var L = Piel.lugarLibre(caja, tam, escrito, [{ x: 50, y: 10 }, { x: 88, y: 30 }, { x: 12, y: 30 }], 4);
  assert(L.x === 88 && L.y === 30, "salta el lugar que pisa lo escrito y toma el siguiente que respira (" + JSON.stringify(L) + ")");
  assert(L.aire === 4, "su aire es el menor: al borde derecho, 100 − 96 = 4 (" + L.aire + ")");
  var pisa = Piel.lugarLibre(caja, tam, escrito, [{ x: 50, y: 10 }], 4);
  assert(pisa.aire < 0, "si se mete en lo escrito el aire es negativo (" + pisa.aire + ")");
  var afuera = Piel.lugarLibre(caja, tam, [], [{ x: 100, y: 30 }], 4);
  assert(afuera.aire === -8, "montada sobre el borde, como estaba, también da negativo (" + afuera.aire + ")");
  var mejor = Piel.lugarLibre(caja, tam, escrito, [{ x: 50, y: 10 }, { x: 50, y: 27 }], 20);
  assert(mejor.y === 27 && mejor.aire > 0, "si ninguno llega, el de más aire (" + JSON.stringify(mejor) + ")");
  console.log("[1] lugarLibre elige el lugar con aire y mide lo que falta");
})();

/* [2] las tarjetas de LA SEMANA con lo medido en el navegador (Pixelify a
   13 px, tarjeta de 178 x 66 con línea de 4, coordenadas desde su centro):
   los renglones de la letra del nombre y del efecto */
(function () {
  var caja = { x: -87, y: -31, w: 174, h: 62 }, tam = { w: 17, h: 12 }, AIRE = 4;
  function lugares(nom, efe) {
    var fin = Math.max.apply(null, nom.map(function (q) { return q.y + q.h; })), tope = Math.min.apply(null, efe.map(function (q) { return q.y; }));
    var adentro = function (y) { return Math.min(Math.max(y, caja.y + AIRE + tam.h / 2), caja.y + caja.h - AIRE - tam.h / 2); };
    var ys = [(fin + tope) / 2, (caja.y + tope) / 2].concat(efe.map(function (q) { return q.y + q.h / 2; })).map(adentro);
    var der = caja.x + caja.w - AIRE - tam.w / 2, izq = caja.x + AIRE + tam.w / 2;
    return ys.map(function (y) { return { x: der, y: y }; }).concat(ys.map(function (y) { return { x: izq, y: y }; }));
  }
  var linea = function (y, h, mitad) { return { x: -mitad, y: y, w: 2 * mitad, h: h }; };
  /* ASADO CON LA BARRA: un renglón de nombre y uno de efecto */
  var asado = [linea(-26, 11, 58.5)], asadoE = [linea(18, 13, 75)];
  var L = Piel.lugarLibre(caja, tam, asado.concat(asadoE), lugares(asado, asadoE), AIRE);
  assert(L.aire >= AIRE && L.x > 60, "ASADO: a la derecha, adentro, con 4 px de aire (" + JSON.stringify(L) + ")");
  /* PICADITO EN EL POTRERO: nombre ancho y tres renglones de efecto; sin
     correr el nombre no hay lugar que no pise */
  var pic = [linea(-26, 11, 72)], picE = [linea(-12, 15, 81), linea(4, 10, 68), linea(18, 13, 72)];
  var P0 = Piel.lugarLibre(caja, tam, pic.concat(picE), lugares(pic, picE), AIRE);
  assert(P0.aire < 0, "PICADITO sin correr el nombre: no hay lugar (" + P0.aire + ")");
  var corrida = -(pic[0].x + pic[0].w + AIRE + tam.w + AIRE - (caja.x + caja.w));
  var picC = [{ x: pic[0].x + corrida, y: pic[0].y, w: pic[0].w, h: pic[0].h }];
  var P1 = Piel.lugarLibre(caja, tam, picC.concat(picE), lugares(picC, picE), AIRE);
  assert(corrida < 0 && picC[0].x - caja.x >= AIRE && P1.aire >= 3, "PICADITO con el nombre corrido " + (-corrida) + " px: la marca a su lado, con " + P1.aire + " px");
  console.log("[2] la ×N de la semana: 4 px en las tarjetas con lugar, 3 en PICADITO");
})();

/* [3] el código usa lo medido: la marca ya no va en el borde, los rótulos
   de los botones se centran por su alto y el pase dice quién la tiene */
(function () {
  var master = leer("phaser/scenes/master.js"), match = leer("phaser/scenes/match.js");
  assert(!/this\.add\.text\(cx \+ anchoO \/ 2, cy, "×" \+ veces/.test(master), "SÍNTOMA: la ×N sigue clavada en el borde derecho de la tarjeta");
  assert(/if \(veces\) this\.marcarVeces\(r, tN, tE, veces\);/.test(master) && /window\.PampaPiel\.lugarLibre\(caja, tam,/.test(master),
    "la semana ubica la ×N con marcarVeces (lugarLibre sobre los renglones medidos)");
  assert(!/texto = res\.win \? "AHORA JUGÁS/.test(match), "SÍNTOMA: el pase sigue diciendo AHORA JUGÁS");
  assert(/rj\.esVos \? "¡LA TENÉS VOS!" : "LA TIENE " \+ rj\.nombre\.toUpperCase\(\)/.test(match), "el pase dice ¡LA TENÉS VOS! o LA TIENE y el nombre");
  assert(/if \(s\) this\.centrarRotulos\(t, s, y\);/.test(match) && /this\.centrarRotulos\(t, s, y\);\s*\r?\n\s*this\.menuLayer\.add\(\[b, t, s\]\);/.test(match),
    "la cruz y los compañeros del pase centran título y bajada por su alto");
  assert(!/this\.add\.text\(x, y \+ 11, sub/.test(match) && !/this\.add\.text\(CP\.x, y \+ 10, r\.pct/.test(match), "quedó la bajada clavada a y+11 / y+10");
  /* centrarRotulos con los altos medidos (título 14, bajada 18) */
  var cuerpo = match.slice(match.indexOf("  centrarRotulos(t, s, y) {"));
  cuerpo = cuerpo.slice(cuerpo.indexOf("{") + 1, cuerpo.indexOf("\n  }"));
  var centrar = new Function("t", "s", "y", cuerpo);
  function texto(h) { return { height: h, y: 0, setY: function (v) { this.y = v; return this; } }; }
  [[44, 395], [46, 395], [40, 356]].forEach(function (c) {
    var t = texto(14), s = texto(18), alto = c[0], y = c[1];
    centrar(t, s, y);
    var arriba = (t.y - 7) - (y - alto / 2), abajo = (y + alto / 2) - (s.y + 9);
    assert(Math.abs(arriba - abajo) <= 1 && abajo >= 4, "botón de " + alto + ": " + arriba + " px arriba y " + abajo + " abajo");
    assert(s.y - 9 === t.y + 7, "la bajada empieza donde termina el título");
  });
  console.log("[3] la ×N se ubica midiendo, los rótulos se centran y el pase dice quién la tiene");
})();

console.log(mal === 0 ? "✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
