/* ============================================================================
   PAMPA STAR · test de LA SEMANA CON ENERGÍA (V10 · LA VIDA v2)
   Lo que fija este test:
     · los medidores NO se desbordan (ni por arriba ni por abajo),
     · el aguante inicial del domingo sale bien de la energía que te quedó,
     · los permanentes son CHICOS (el que juega diez temporadas no rompe nada),
     · y ninguna opción es objetivamente mejor que otra.
   Corré:  node phaser/test/semana.test.js
   ========================================================================== */
"use strict";
var S = require("../logic/semana.js");
var fs = require("fs"), path = require("path");
var data = JSON.parse(fs.readFileSync(path.join(__dirname, "../../data/semana.json"), "utf8"));
var bal = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/balance.json"), "utf8"));
var cfg = bal.semana || {};

var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.error("  ✗ " + m); } }

/* ---- 1) la DATA cumple las reglas duras ---- */
(function () {
  var ops = data.opciones;
  ok(ops.length >= 8, "hay al menos 8 opciones (" + ops.length + ")");
  ops.forEach(function (o) {
    ok(!!o.id && !!o.n && !!o.sub, "la opción " + o.id + " tiene id, nombre y aclaración");
    ok((o.energia_costo || 0) <= 40, "el costo de " + o.id + " es razonable (" + (o.energia_costo || 0) + ")");
    ok((o.stat_mas || 0) <= 2, "la mejora permanente de " + o.id + " es minúscula (" + (o.stat_mas || 0) + ")");
    /* CERO plata: las monedas son energía y ánimo */
    var txt = JSON.stringify(o).toLowerCase();
    ok(!/plata|peso|sueldo|dinero|cobra|pagar|comprar|apuesta/.test(txt), "la opción " + o.id + " no habla de plata ni de apuestas");
  });
  /* cada opción da algo: ninguna es un botón muerto */
  ops.forEach(function (o) {
    var da = (o.stat_mas || 0) + (o.animo || 0) + (o.energia_recupera || 0) + (o.cura_molestia ? 1 : 0) + (o.espia_rival ? 1 : 0) + (o.evita ? 1 : 0);
    ok(da > 0, "la opción " + o.id + " da algo a cambio");
  });
  console.log("[1] la data cumple las reglas: ok (" + ops.length + " opciones)");
})();

/* ---- 2) NINGUNA opción es objetivamente mejor ----
   El criterio correcto no es un ratio (las monedas son distintas: ánimo no es
   lo mismo que una stat permanente), sino la DOMINANCIA ESTRICTA: A domina a B
   si cuesta lo mismo o menos y da lo mismo o más en TODO, con algo estrictamente
   mejor. Si una opción está dominada, no la elige nadie nunca — y esa es
   exactamente la regla de diseño que pidió el brief. */
(function () {
  var ops = data.opciones;
  function perfil(o) {
    /* una mejora AL AZAR vale menos que una dirigida (no elegís qué sube), y
       el riesgo de llegar golpeado es un costo real: sin contarlos, el
       picadito parecería dominar a entrenar — y no lo hace, esa es la
       tensión que pide el brief (barato y con suerte vs caro y seguro). */
    var dirigida = o.stat && o.stat !== "azar";
    return {
      costo: (o.energia_costo || 0) - (o.energia_recupera || 0) + (o.riesgo_golpe || 0) * 100,
      animo: o.animo || 0,
      stat: (o.stat_mas || 0) * (dirigida ? 1 : 0.5),
      extra: (o.cura_molestia ? 1 : 0) + (o.espia_rival ? 1 : 0) + (o.evita ? 1 : 0)
    };
  }
  var dominadas = [];
  ops.forEach(function (a) {
    ops.forEach(function (b) {
      if (a.id === b.id) return;
      /* solo se comparan las que compiten de verdad (las condicionadas
         aparecen en semanas distintas, no compiten por la misma ranura) */
      if (a.requiere || b.requiere) return;
      if (a.requiere_origen !== b.requiere_origen) return;
      var A = perfil(a), B = perfil(b);
      var noPeor = A.costo <= B.costo && A.animo >= B.animo && A.stat >= B.stat && A.extra >= B.extra;
      var mejorEnAlgo = A.costo < B.costo || A.animo > B.animo || A.stat > B.stat || A.extra > B.extra;
      if (noPeor && mejorEnAlgo) dominadas.push(b.id + " (la domina " + a.id + ")");
    });
  });
  ok(dominadas.length === 0, "ninguna opción está dominada por otra: " + dominadas.join(", "));
  console.log("[2] ninguna opción domina a las otras: ok");
})();

/* ---- 3) los medidores no se desbordan ---- */
(function () {
  var s = S.nuevaSemana({}, cfg);
  ok(s.energia === 100 && s.elegidas.length === 3, "la semana arranca en 100 con tres ranuras vacías");
  /* descansar mil veces no pasa de 100 */
  var d = s;
  for (var i = 0; i < 3; i++) { var n = S.elegir(data, d, i, "descansar", cfg); if (n) d = n; }
  ok(d.energia <= 100, "descansar no desborda la energía (" + d.energia + ")");
  ok(d.animo <= 100, "el ánimo no desborda (" + d.animo + ")");
  /* sin energía no se puede entrenar */
  var seco = S.nuevaSemana({}, cfg); seco.energia = 5;
  ok(S.elegir(data, seco, 0, "entrenar_aguante", cfg) === null, "sin energía no te da el cuerpo para entrenar");
  ok(S.elegir(data, seco, 0, "descansar", cfg) !== null, "pero siempre podés descansar");
  /* la ranura ocupada no se pisa */
  var una = S.elegir(data, S.nuevaSemana({}, cfg), 0, "asado", cfg);
  ok(S.elegir(data, una, 0, "descansar", cfg) === null, "una ranura ya elegida no se pisa");
  /* opción inexistente */
  ok(S.elegir(data, una, 1, "comprar_auto", cfg) === null, "una opción que no existe no hace nada");
  console.log("[3] los medidores no se desbordan: ok");
})();

/* ---- 4) el AGUANTE INICIAL sale de la energía, con piso jugable ---- */
(function () {
  var lleno = S.comoLlegas({ energia: 100, animo: 80, elegidas: [] }, cfg);
  var vacio = S.comoLlegas({ energia: 0, animo: 20, elegidas: [] }, cfg);
  var medio = S.comoLlegas({ energia: 40, animo: 50, elegidas: [] }, cfg);
  ok(lleno.aguanteInicial > medio.aguanteInicial && medio.aguanteInicial > vacio.aguanteInicial,
    "más energía = más aguante inicial (" + vacio.aguanteInicial + " < " + medio.aguanteInicial + " < " + lleno.aguanteInicial + ")");
  ok(lleno.aguanteInicial === (cfg.aguante_max || 1000), "con energía 100 arrancás con el tanque completo");
  ok(vacio.aguanteInicial >= (cfg.aguante_max || 1000) * 0.4, "aun fundido, el piso es jugable (" + vacio.aguanteInicial + ")");
  ok(lleno.envionInicial > vacio.envionInicial, "más ánimo = más envión inicial");
  ok(lleno.lectura > vacio.lectura, "más ánimo = mejor lectura en los duelos");
  ok(Math.abs(lleno.lectura) <= 5 && Math.abs(vacio.lectura) <= 5, "la lectura se mantiene en +/-5 (no rompe los duelos)");
  ok(typeof lleno.resumen === "string" && lleno.resumen.length > 10, "y viene la línea que resume cómo llegás");
  console.log("[4] energía → aguante, ánimo → envión: ok");
})();

/* ---- 5) los PERMANENTES son chicos y topean ---- */
(function () {
  var s = S.nuevaSemana({}, cfg);
  s = S.elegir(data, s, 0, "entrenar_tiro", cfg);
  s = S.elegir(data, s, 1, "entrenar_gambeta", cfg);
  s = S.elegir(data, s, 2, "entrenar_aguante", cfg);
  var suma = 0, k;
  for (k in s.permanentes) suma += s.permanentes[k];
  ok(suma <= (cfg.permanente_max_semana || 3), "una semana entera entrenando da como mucho " + (cfg.permanente_max_semana || 3) + " puntos (dio " + suma + ")");
  /* diez temporadas de 18 fechas entrenando SIEMPRE */
  var total = suma * 18 * 10;
  ok(total <= 600, "ni jugando 10 temporadas enteras se rompe el juego (" + total + " puntos en total)");
  console.log("[5] los permanentes son minúsculos: ok");
})();

/* ---- 6) el LUNES DESPUÉS: se recupera, el ánimo se mueve, la molestia queda ---- */
(function () {
  var ganando = S.lunesDespues({ animo: 60, fecha: 3 }, { golesMio: 2, golesRival: 0, hiceGol: true, aguanteFinalFrac: 0.5 }, cfg);
  var perdiendo = S.lunesDespues({ animo: 60, fecha: 3 }, { golesMio: 0, golesRival: 3, aguanteFinalFrac: 0.2 }, cfg);
  ok(ganando.animo > 60, "ganar levanta el ánimo (" + ganando.animo + ")");
  ok(perdiendo.animo < 60, "perder lo baja (" + perdiendo.animo + ")");
  ok(ganando.animo <= 100 && perdiendo.animo >= 0, "el ánimo no se desborda por ningún lado");
  ok(perdiendo.desgaste > ganando.desgaste, "el partido más duro deja más desgaste (" + ganando.desgaste + " vs " + perdiendo.desgaste + ")");
  ok(ganando.fecha === 4, "avanza la fecha");
  var golpe = S.lunesDespues({ animo: 60 }, { golesMio: 1, golesRival: 1, golpeFuerte: true, aguanteFinalFrac: 0.4 }, cfg);
  ok(golpe.molestia === true, "un golpe fuerte deja molestia para la semana que viene");
  /* y la semana siguiente arranca con menos tanque */
  var siguiente = S.nuevaSemana(golpe, cfg);
  ok(siguiente.energia < 100, "con molestia y desgaste arrancás la semana con menos de 100 (" + siguiente.energia + ")");
  var curada = S.elegir(data, siguiente, 0, "curar", cfg);
  ok(curada && curada.molestia === false, "y la podés curar en una ranura");
  console.log("[6] el lunes después: ok");
})();

/* ---- 7) las opciones condicionadas aparecen cuando corresponde ---- */
(function () {
  var sinMolestia = S.nuevaSemana({}, cfg);
  var conMolestia = S.nuevaSemana({ molestia: true }, cfg);
  var ops1 = S.opcionesPara(data, sinMolestia, {}).map(function (o) { return o.id; });
  var ops2 = S.opcionesPara(data, conMolestia, {}).map(function (o) { return o.id; });
  ok(ops1.indexOf("curar") < 0, "sin molestia no se ofrece curarla");
  ok(ops2.indexOf("curar") >= 0, "con molestia sí");
  var ops3 = S.opcionesPara(data, sinMolestia, { origen: "escuela" }).map(function (o) { return o.id; });
  ok(ops3.indexOf("estudiar") >= 0, "el del origen escuela puede estudiar");
  ok(ops1.indexOf("estudiar") < 0, "y el que no viene de ahí, no");
  ok(ops1.length >= 5, "siempre quedan al menos 5 opciones para elegir (" + ops1.length + ")");
  console.log("[7] las condicionadas: ok");
})();


/* ---- 8) TODA ACCIÓN DEL CATÁLOGO TIENE QUE PODER APARECER ----
   La auditoría encontró que ayudar_casa y estudiar eran INALCANZABLES, y no
   había ningún error: requiere_origen es un filtro DURO y se comparaba la
   condición ("campo") contra la marca cruda ("cosecha"), que nunca coinciden.
   Y "escuela" ni siquiera existía como marca. Dos de las diez acciones no las
   vio nadie jugando nunca — y el _nota_diseno de ayudar_casa documenta una
   discusión entera de balance sobre una de ellas.

   Este bloque ENUMERA: para cada acción con requiere_origen busca si hay alguna
   respuesta del origen que la habilite. Si mañana alguien agrega una acción con
   una condición que nadie deja, corta acá. */
(function () {
  var V = require("../logic/vida.js");
  var EV = JSON.parse(fs.readFileSync(path.join(__dirname, "../../data/eventos_temporada.json"), "utf8"));
  var marcas = [];
  (EV.origen || []).forEach(function (p) {
    (p.opciones || []).forEach(function (o) {
      if (o.marca && marcas.indexOf(o.marca) < 0) marcas.push(o.marca);
    });
  });
  ok(typeof V.cumpleOrigen === "function", "la traducción condición→marca tiene que vivir en UN solo lugar");

  var conOrigen = data.opciones.filter(function (o) { return o.requiere_origen; });
  ok(conOrigen.length > 0, "tiene que haber acciones condicionadas por origen");

  conOrigen.forEach(function (o) {
    ok(V.cumpleOrigen(o.requiere_origen, marcas),
      "la acción '" + o.id + "' pide requiere_origen '" + o.requiere_origen +
      "' y NINGUNA respuesta del origen deja esa marca: es inalcanzable. Marcas que existen: [" +
      marcas.join(", ") + "]");
  });

  /* y la consecuencia, medida: con la marca puesta aparece, sin ella no */
  var semX = S.nuevaSemana({ animo: 60, desgaste: 0, molestia: false }, cfg);
  var sinNada = S.opcionesPara(data, semX, { marcas: [] }).map(function (x) { return x.id; });
  conOrigen.forEach(function (o) {
    var m = [(V.MARCA_DE && V.MARCA_DE[o.requiere_origen]) || o.requiere_origen];
    var conMarca = S.opcionesPara(data, semX, { marcas: m }).map(function (x) { return x.id; });
    ok(conMarca.indexOf(o.id) >= 0, "con la marca puesta, '" + o.id + "' tiene que aparecer");
    ok(sinNada.indexOf(o.id) < 0, "y sin ella NO: requiere_origen es filtro duro, no probabilidad");
  });
  console.log("[8] " + conOrigen.length + " acciones condicionadas por origen, todas alcanzables · marcas: " + marcas.join(", "));
})();

if (fail === 0) console.log("\n✓ TODOS OK — " + pass + " asserts, 0 fallaron.");
else { console.error("\n✗ " + fail + " FALLARON (" + pass + " ok)"); process.exit(1); }
