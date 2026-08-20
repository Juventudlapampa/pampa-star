/* ============================================================================
   PAMPA STAR · P7 — LA GAMBETA NO ES SIEMPRE LA MISMA

   EL RECLAMO (Rodri): "hoy el minijuego es esquivar y siempre aparece lo mismo.
   Quiero variedad de obstáculos y de respuesta: saltar un pozo, saltar las
   piernas del que se tira, amagar. Distintos obstáculos con distinta tecla u
   opción, y que la secuencia no sea la misma dos veces seguidas."

   Era cierto: en la corrida hacia el arco todos los obstáculos eran el mismo
   objeto —un rival al que esquivabas de costado— y la única respuesta era
   moverse a un lado.

   Ahora hay SEIS tipos de obstáculo y CINCO gestos, con dos reglas que este
   test verifica porque son las que hacen que se sienta distinto:

     1. NUNCA dos obstáculos iguales seguidos. Es lo que obliga a MIRAR en vez
        de apretar de memoria.
     2. Lo que no sabés hacer, no aparece. No se puede poner una traba que el
        jugador no tenga con qué pasar.

   Corré:  node phaser/test/p7_obstaculos.test.js
   ========================================================================== */
"use strict";
var path = require("path");
var J = require(path.join(__dirname, "..", "logic", "jugadon.js"));

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* ---------- [1] HAY VARIEDAD DE VERDAD, NO UN TIPO DISFRAZADO ---------- */
(function () {
  assert(J.OBSTACULOS.length >= 5, "tiene que haber al menos 5 tipos de obstáculo (hay " + J.OBSTACULOS.length + ")");
  assert(J.GESTOS.length >= 4, "y al menos 4 gestos de respuesta (hay " + J.GESTOS.length + ")");
  /* el punto no es la cantidad: es que pidan GESTOS DISTINTOS. Si los seis se
     pasaran con el mismo gesto, seguiría siendo un solo obstáculo con seis
     nombres, que es exactamente lo que Rodri estaba viendo. */
  var gestos = {};
  J.OBSTACULOS.forEach(function (o) { o.vence.forEach(function (g) { gestos[g] = true; }); });
  assert(Object.keys(gestos).length >= 4,
    "los obstáculos tienen que pedir al menos 4 gestos distintos entre todos (piden " +
    Object.keys(gestos).join(",") + ")");
  /* y ninguno puede pasarse con TODO */
  J.OBSTACULOS.forEach(function (o) {
    assert(o.vence.length < J.GESTOS.length,
      "el obstáculo '" + o.id + "' se pasa con todos los gestos: no es un obstáculo");
    assert(o.vence.length >= 1, "el obstáculo '" + o.id + "' no se pasa con ninguno: es una pared");
  });
  /* al menos uno que NO sea un rival: la cancha también juega */
  assert(J.OBSTACULOS.some(function (o) { return o.pose === null; }),
    "tiene que haber al menos un obstáculo que no sea un rival (el pozo)");
  console.log("[1] " + J.OBSTACULOS.length + " obstáculos · " + J.GESTOS.length + " gestos · " +
    Object.keys(gestos).length + " gestos distintos en juego");
})();

/* ---------- [2] NUNCA DOS IGUALES SEGUIDOS ---------- */
(function () {
  var repetidos = 0, corridas = 0;
  for (var sem = 1; sem <= 300; sem++) {
    var sec = J.secuenciaObstaculos(8, 90, sem);
    corridas++;
    for (var i = 1; i < sec.length; i++) if (sec[i].id === sec[i - 1].id) repetidos++;
  }
  assert(repetidos === 0,
    "en " + corridas + " corridas de 8 obstáculos no puede haber NINGUNO repetido seguido (hubo " + repetidos + ")");
  console.log("[2] 300 corridas × 8 obstáculos: 0 repeticiones seguidas");
})();

/* ---------- [3] Y ADEMÁS NO SON LA MISMA CORRIDA ---------- */
(function () {
  /* no alcanza con no repetir adentro de una corrida: dos partidos seguidos
     tienen que dar corridas distintas, o vuelve el "siempre lo mismo" */
  var vistas = {};
  for (var sem = 1; sem <= 100; sem++) {
    vistas[J.secuenciaObstaculos(5, 90, sem).map(function (o) { return o.id; }).join("-")] = true;
  }
  var distintas = Object.keys(vistas).length;
  assert(distintas >= 60,
    "100 semillas tienen que dar al menos 60 corridas distintas (dieron " + distintas + ")");
  /* y la misma semilla tiene que dar SIEMPRE lo mismo: el save es reproducible */
  var a = J.secuenciaObstaculos(6, 90, 42).map(function (o) { return o.id; }).join("-");
  var b = J.secuenciaObstaculos(6, 90, 42).map(function (o) { return o.id; }).join("-");
  assert(a === b, "la misma semilla tiene que dar la misma corrida (determinismo)");
  console.log("[3] 100 semillas → " + distintas + " corridas distintas · misma semilla, misma corrida");
})();

/* ---------- [4] LO QUE NO SABÉS HACER, NO APARECE ---------- */
(function () {
  /* un obstáculo que solo se pasa con un gesto que el jugador no tiene sería
     una traba imposible. Se verifica para todo el rango de stat. */
  [0, 30, 54, 55, 69, 70, 85, 100].forEach(function (stat) {
    var gestos = J.gestosDe(stat).map(function (g) { return g.id; });
    var sec = J.secuenciaObstaculos(12, stat, stat + 7);
    sec.forEach(function (o) {
      var puede = o.vence.some(function (g) { return gestos.indexOf(g) >= 0; });
      assert(puede,
        "con " + stat + " de gambeta salió el obstáculo '" + o.id + "', que se pasa con [" +
        o.vence.join(",") + "] y el jugador solo tiene [" + gestos.join(",") + "]");
    });
  });
  /* y el crack tiene MÁS opciones que el pibe: la progresión se tiene que notar */
  assert(J.gestosDe(90).length > J.gestosDe(20).length,
    "un crack tiene que tener más gestos que un pibe (" + J.gestosDe(90).length + " contra " + J.gestosDe(20).length + ")");
  assert(J.obstaculosDe(90).length > J.obstaculosDe(20).length,
    "y enfrentar más variedad de obstáculos");
  console.log("[4] con 20 de gambeta: " + J.gestosDe(20).length + " gestos y " + J.obstaculosDe(20).length +
    " obstáculos · con 90: " + J.gestosDe(90).length + " y " + J.obstaculosDe(90).length);
})();

/* ---------- [5] LA RESOLUCIÓN ES LECTURA, NO SUERTE ---------- */
(function () {
  /* pasar un obstáculo no puede depender del azar: el azar vive en el duelo
     cara a cara (resolverMovida). Acá, el gesto correcto SIEMPRE pasa. */
  J.OBSTACULOS.forEach(function (o) {
    o.vence.forEach(function (g) {
      for (var i = 0; i < 20; i++) {
        assert(J.pasaObstaculo(o.id, g) === true,
          "el gesto correcto (" + g + ") tiene que pasar SIEMPRE el obstáculo " + o.id);
      }
    });
    J.GESTOS.forEach(function (g) {
      if (o.vence.indexOf(g.id) >= 0) return;
      assert(J.pasaObstaculo(o.id, g.id) === false,
        "el gesto equivocado (" + g.id + ") nunca pasa el obstáculo " + o.id);
    });
  });
  assert(J.pasaObstaculo("no_existe", "izq") === false, "un obstáculo desconocido no se pasa (no explota)");
  console.log("[5] el gesto correcto pasa siempre y el equivocado nunca: es lectura, no suerte");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
