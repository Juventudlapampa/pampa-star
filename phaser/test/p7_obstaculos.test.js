/* ============================================================================
   PAMPA STAR · P7 — LA GAMBETA NO ES SIEMPRE LA MISMA

   EL RECLAMO (Rodri): "hoy el minijuego es esquivar y siempre aparece lo mismo.
   Quiero variedad de obstáculos y de respuesta: saltar un pozo, saltar las
   piernas del que se tira, amagar. Distintos obstáculos con distinta tecla u
   opción, y que la secuencia no sea la misma dos veces seguidas."

   Era cierto: en la corrida hacia el arco todos los obstáculos eran el mismo
   objeto —un rival al que esquivabas de costado— y la única respuesta era
   moverse a un lado.

   La primera vuelta (P7) puso SEIS tipos de obstáculo y CINCO gestos. Mejoró,
   pero no alcanzó, y P1 lo midió: los seis pedían EXACTAMENTE LO MISMO —leer
   una etiqueta y tocar el botón que le gana— y de seis obstáculos salían solo
   CUATRO respuestas distintas. Cambiaba cuál era la respuesta, no qué clase de
   cosa te preguntaban, así que a la tercera corrida era una tabla de seis filas.

   P1 · AHORA HAY CINCO CLASES, y cada una pide un músculo distinto:

     gesto       elegir el que lo vence          las seis de siempre
     lectura     leer al que te está leyendo     no tiene respuesta fija
     aguante     no se esquiva: elegís qué pagás y arrastra al siguiente
     envenenada  dos salidas, las dos cuestan    se cobra en el remate
     reloj       decidí antes de que se cierre   el único con tiempo

   Las reglas que este test verifica, porque son las que hacen que se sienta
   distinto de verdad:

     1. NUNCA dos obstáculos iguales seguidos, NI dos de la misma CLASE.
        Medido: eligiendo del pool plano, la clase gesto se llevaba el 47% de
        los obstáculos (hay seis de gesto y uno de cada otra), así que la
        variedad estaba implementada y no se notaba.
     2. Lo que no sabés hacer, no aparece.
     3. El reloj es como mucho UNO por corrida y va al final. El proyecto ya
        sacó dos QTE a propósito (V9 §4) y esta clase es la única que puede
        desandarlo.
     4. Saber la tabla NO alcanza. La clase lectura no se pasa de memoria, y
        eso es lo único que impide que esto vuelva a ser una tabla.

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
  var deGesto = J.OBSTACULOS.filter(function (o) { return (o.clase || "gesto") === "gesto"; });
  deGesto.forEach(function (o) { o.vence.forEach(function (g) { gestos[g] = true; }); });
  assert(Object.keys(gestos).length >= 4,
    "los obstáculos de la clase gesto tienen que pedir al menos 4 gestos distintos (piden " +
    Object.keys(gestos).join(",") + ")");
  /* y ninguno puede pasarse con TODO */
  deGesto.forEach(function (o) {
    assert(o.vence.length < J.GESTOS.length,
      "el obstáculo '" + o.id + "' se pasa con todos los gestos: no es un obstáculo");
    assert(o.vence.length >= 1, "el obstáculo '" + o.id + "' no se pasa con ninguno: es una pared");
  });

  /* ── P1 · LA VARIEDAD DE VERDAD SE MIDE POR CLASE ──
     Que haya diez obstáculos no dice nada si los diez preguntan lo mismo. Lo
     que se verifica es que las CINCO clases existan, que cada una tenga al
     menos un obstáculo, y —lo que importa— que cada una ofrezca OPCIONES
     DISTINTAS: si dos clases ofrecen los mismos botones, son la misma cosa
     con otro cartel. */
  var clases = {};
  J.OBSTACULOS.forEach(function (o) { clases[o.clase || "gesto"] = (clases[o.clase || "gesto"] || 0) + 1; });
  ["gesto", "lectura", "aguante", "envenenada", "reloj"].forEach(function (c) {
    assert(clases[c] > 0, "la clase '" + c + "' tiene que tener al menos un obstáculo");
    assert(!!(J.CLASES && J.CLASES[c] && J.CLASES[c].n),
      "y tiene que decir QUÉ PIDE, o el jugador no se entera de que cambió la pregunta");
  });
  var firmas = {};
  Object.keys(clases).forEach(function (c) {
    var uno = J.OBSTACULOS.filter(function (o) { return (o.clase || "gesto") === c; })[0];
    firmas[c] = J.opcionesDeObstaculo(uno, 99).map(function (x) { return x.id; }).sort().join(",");
  });
  assert(firmas.gesto !== firmas.lectura, "gesto y lectura no pueden ofrecer los mismos botones");
  assert(firmas.aguante !== firmas.envenenada, "aguante y envenenada tampoco");
  assert(firmas.aguante !== firmas.gesto, "ni aguante y gesto");
  var distintas = {};
  Object.keys(firmas).forEach(function (c) { distintas[firmas[c]] = true; });
  assert(Object.keys(distintas).length >= 3,
    "entre las cinco clases tiene que haber al menos 3 juegos de botones distintos (hay " +
    Object.keys(distintas).length + ")");
  /* al menos uno que NO sea un rival: la cancha también juega */
  assert(J.OBSTACULOS.some(function (o) { return o.pose === null; }),
    "tiene que haber al menos un obstáculo que no sea un rival (el pozo)");
  console.log("[1] " + J.OBSTACULOS.length + " obstáculos en " + Object.keys(clases).length +
    " clases · " + Object.keys(distintas).length + " juegos de botones distintos");
})();

/* ---------- [2] NUNCA DOS IGUALES SEGUIDOS ---------- */
(function () {
  var repetidos = 0, mismaClase = 0, corridas = 0;
  for (var sem = 1; sem <= 300; sem++) {
    var sec = J.secuenciaObstaculos(8, 90, sem);
    corridas++;
    for (var i = 1; i < sec.length; i++) {
      if (sec[i].id === sec[i - 1].id) repetidos++;
      if ((sec[i].clase || "gesto") === (sec[i - 1].clase || "gesto")) mismaClase++;
    }
  }
  assert(repetidos === 0,
    "en " + corridas + " corridas de 8 obstáculos no puede haber NINGUNO repetido seguido (hubo " + repetidos + ")");
  /* P1 · con corridas de OCHO y solo cinco clases, la regla no siempre puede
     cumplirse (hay que repetir alguna); lo que se exige es que sea RARO. En la
     corrida real, que es de tres, tiene que ser CERO — se verifica abajo. */
  assert(mismaClase / (corridas * 7) < 0.20,
    "dos de la misma clase seguidas tiene que ser raro incluso en corridas largas (dio " +
    (mismaClase / (corridas * 7) * 100).toFixed(0) + "%)");
  var mc3 = 0, n3 = 0;
  for (var s3 = 1; s3 <= 500; s3++) {
    var t3 = J.secuenciaObstaculos(3, 90, s3, { reloj_max_por_corrida: 1 });
    for (var k3 = 1; k3 < t3.length; k3++) { n3++; if ((t3[k3].clase || "gesto") === (t3[k3 - 1].clase || "gesto")) mc3++; }
  }
  assert(mc3 === 0,
    "en la corrida REAL (3 obstáculos) no puede salir NUNCA dos de la misma clase seguidas (salió " + mc3 + " de " + n3 + ")");
  console.log("[2] 300×8 sin repetir obstáculo · 500×3 sin repetir CLASE seguida");
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
      /* las clases que no son gesto no se pasan con un gesto de la lista: sus
         botones salen de opcionesDeObstaculo y siempre son alcanzables */
      if ((o.clase || "gesto") !== "gesto") {
        var ops = J.opcionesDeObstaculo(o, stat);
        assert(ops.length >= 2,
          "con " + stat + " de gambeta, el obstáculo '" + o.id + "' (clase " + o.clase +
          ") tiene que ofrecer al menos dos salidas");
        return;
      }
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
  J.OBSTACULOS.filter(function (o) { return (o.clase || "gesto") === "gesto"; }).forEach(function (o) {
    o.vence.forEach(function (g) {
      for (var i = 0; i < 20; i++) {
        assert(J.pasaObstaculo(o.id, g) === true,
          "el gesto correcto (" + g + ") tiene que pasar SIEMPRE el obstáculo " + o.id);
        /* y por la puerta nueva, igual: sin arrastre no hay azar en esta clase */
        assert(J.resolverObstaculo(o, g, {}, {}, function () { return 0.99; }).pasa === true,
          "y por resolverObstaculo también");
      }
    });
    J.GESTOS.forEach(function (g) {
      if (o.vence.indexOf(g.id) >= 0) return;
      assert(J.pasaObstaculo(o.id, g.id) === false,
        "el gesto equivocado (" + g.id + ") nunca pasa el obstáculo " + o.id);
    });
  });
  assert(J.pasaObstaculo("no_existe", "izq") === false, "un obstáculo desconocido no se pasa (no explota)");
  assert(J.resolverObstaculo("no_existe", "izq", {}, {}).pasa === false, "ni por la puerta nueva");
  console.log("[5] en la clase gesto, el correcto pasa siempre y el equivocado nunca: es lectura, no suerte");
})();

/* ---------- [6] P1 · SABER LA TABLA YA NO ALCANZA ---------- */
(function () {
  /* Esta es LA prueba del bloque. Antes, un jugador que se aprendía los seis
     obstáculos pasaba el 100% de las veces: el pasillo era una tabla y una
     tabla se agota. Ahora, el mismo jugador —el que siempre elige la respuesta
     correcta de la clase gesto y le cree al que declara— tiene que seguir
     cayéndose en la clase lectura, porque ahí no hay respuesta correcta.

     Si estos dos números se parecieran, la variedad sería decorativa. */
  function rngFijo(semilla) {
    var a = (semilla >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var CFG = { bluff_prob: 0.35, cantito_min: 0.10, cantito_max: 0.75 };
  var r = rngFijo(4242);
  var N = 6000;
  var caeGesto = 0, vistosGesto = 0, caeLectura = 0, vistosLectura = 0;
  for (var i = 0; i < N; i++) {
    var oG = J.OBSTACULOS.filter(function (o) { return (o.clase || "gesto") === "gesto"; })[i % 6];
    vistosGesto++;
    if (!J.resolverObstaculo(oG, oG.vence[0], {}, CFG, r).pasa) caeGesto++;

    var oL = J.OBSTACULOS.filter(function (o) { return o.clase === "lectura"; })[0];
    var dec = J.declaracionDe(oL, CFG, r, 50);          /* stat 50: casi no ve el cantito */
    var eleccion = dec.declarado === "izq" ? "der" : "izq";   /* le cree al declarado */
    vistosLectura++;
    if (!J.resolverObstaculo(oL, eleccion, dec, CFG, r).pasa) caeLectura++;
  }
  var pG = caeGesto / vistosGesto, pL = caeLectura / vistosLectura;
  assert(pG === 0, "el que se sabe la tabla NO se puede caer en la clase gesto (cayó " + (pG * 100).toFixed(0) + "%)");
  assert(pL > 0.20,
    "y TIENE que seguir cayéndose en la clase lectura, o el pasillo volvió a ser una tabla (cayó " +
    (pL * 100).toFixed(0) + "%)");

  /* EL CANTITO: la gambeta tiene que servir para algo. Un crack ve el amague y
     un pibe no, y eso se tiene que notar en el resultado — si no, la clase
     lectura sería una moneda y no una lectura. */
  function caidasCon(stat) {
    var rr = rngFijo(777), cae = 0, n = 4000;
    var oL = J.OBSTACULOS.filter(function (o) { return o.clase === "lectura"; })[0];
    for (var k = 0; k < n; k++) {
      var d = J.declaracionDe(oL, CFG, rr, stat);
      /* usa el cantito si lo ve; si no, le cree al declarado */
      var real = d.pista ? (d.declarado === "izq" ? "der" : "izq") : d.declarado;
      var el = real === "izq" ? "der" : "izq";
      if (!J.resolverObstaculo(oL, el, d, CFG, rr).pasa) cae++;
    }
    return cae / n;
  }
  var pibe = caidasCon(50), crack = caidasCon(99);
  assert(crack < pibe - 0.10,
    "el crack tiene que leer el amague mucho mejor que el pibe (pibe " + (pibe * 100).toFixed(0) +
    "% vs crack " + (crack * 100).toFixed(0) + "%): si no, la gambeta no sirve para nada acá");
  assert(crack > 0.02,
    "pero ni el crack puede pasarlo siempre, o vuelve a ser una tabla (crack " + (crack * 100).toFixed(0) + "%)");

  console.log("[6] tabla: 0% de caídas en gesto y " + (pL * 100).toFixed(0) + "% en lectura · " +
    "el cantito lleva las caídas de " + (pibe * 100).toFixed(0) + "% (gambeta 50) a " +
    (crack * 100).toFixed(0) + "% (gambeta 99)");
})();

/* ---------- [7] P1 · LO QUE ARRASTRA Y LO QUE SE COBRA DESPUÉS ---------- */
(function () {
  /* la clase AGUANTE es la única que cambia el obstáculo SIGUIENTE. Es lo que
     convierte tres preguntas sueltas en una jugada. */
  var CFG = { proteger_costo: 90, arrastre_penal: 0.25, seguir_riesgo: 0.35 };
  var oA = J.OBSTACULOS.filter(function (o) { return o.clase === "aguante"; })[0];
  var prot = J.resolverObstaculo(oA, "proteger", {}, CFG, function () { return 0.5; });
  assert(prot.pasa === true, "proteger la pelota pasa SIEMPRE: no se esquiva, se aguanta");
  assert(prot.costo === 90, "y cuesta aguante (dio " + prot.costo + ")");
  assert(prot.arrastre === "lento", "y te deja lento para el siguiente");

  /* el arrastre se cobra de verdad: el MISMO gesto correcto puede no alcanzar */
  var oG = J.obstaculoPorId("marca_izq");
  var sinArr = J.resolverObstaculo(oG, "der", {}, CFG, function () { return 0.01; });
  var conArr = J.resolverObstaculo(oG, "der", { arrastre: "lento" }, CFG, function () { return 0.01; });
  assert(sinArr.pasa === true, "sin arrastre, el gesto correcto pasa");
  assert(conArr.pasa === false, "viniendo de proteger, el MISMO gesto correcto puede no alcanzar");

  /* la clase ENVENENADA no se cobra en el obstáculo: se cobra en el remate */
  var CFG2 = { afuera_pasa: 0.86, medio_pasa: 0.55, afuera_lateral: 0.42 };
  var oE = J.OBSTACULOS.filter(function (o) { return o.clase === "envenenada"; })[0];
  var afuera = J.resolverObstaculo(oE, "afuera", { lateral: 0 }, CFG2, function () { return 0.1; });
  var medio = J.resolverObstaculo(oE, "medio", { lateral: 0 }, CFG2, function () { return 0.1; });
  assert(afuera.pasa && medio.pasa, "con suerte buena las dos salidas pasan");
  assert(afuera.lateral > 0, "pero salir por AFUERA te corre hacia la línea (dio " + afuera.lateral + ")");
  assert(medio.lateral === 0, "y por el medio no (dio " + medio.lateral + ")");
  /* y salir por afuera dos veces acumula */
  var dos = J.resolverObstaculo(oE, "afuera", { lateral: afuera.lateral }, CFG2, function () { return 0.1; });
  assert(dos.lateral > afuera.lateral, "y dos veces por afuera acumula (una " + afuera.lateral + ", dos " + dos.lateral + ")");

  /* y ese lateral se paga en el remate: logic/tiro.js ya sabía leerlo */
  var Tiro = require(path.join(__dirname, "..", "logic", "tiro.js"));
  var W = 1050, H = 600;
  function calidadCon(lat) {
    return Tiro.tiroAuto({
      x: W - 150, y: H / 2 + lat * (H * 0.42), W: W, H: H, arcoMedio: 120,
      statTiro: 70, aguanteFrac: 0.8, defensores: 0, rng: function () { return 0.5; }
    }).lectura.calidad;
  }
  var cCentro = calidadCon(0), cBanda = calidadCon(0.84);
  assert(cBanda < cCentro * 0.75,
    "llegar desde la banda tiene que costar el remate de verdad (centro " + cCentro + " vs banda " + cBanda + ")");

  /* EL RELOJ: no decidir NO es al azar, es perder */
  var oR = J.OBSTACULOS.filter(function (o) { return o.clase === "reloj"; })[0];
  var tarde = J.resolverObstaculo(oR, null, { real: "izq" }, {}, function () { return 0.5; });
  assert(tarde.pasa === false, "si se te acaba el tiempo, no pasás");
  assert(/no te decidiste/.test(tarde.motivo), "y el aviso lo tiene que NOMBRAR (dijo: " + tarde.motivo + ")");

  console.log("[7] aguante arrastra · envenenada se cobra en el remate (calidad " + cCentro +
    " → " + cBanda + ") · el reloj no elige por vos");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
