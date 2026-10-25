/* PAMPA STAR · LOS EVENTOS DE LA SEMANA, UNO POR UNO (pedido de Rodri, 25/oct)
   "Ya se vio un evento que todavía da envión, que está apagado": la opción
   "Que sueñen, total ganamos" de la racha daba ENVIÓN, que la poda apagó.
   Este test recorre todos los eventos de data/eventos_temporada.json y falla
   si alguna opción:
     [1] da algo apagado (ENVIÓN con flags.envion en false) o algo que no es
         una de las palabras de la semana (TIRO, PASE, GAMBETA, AGUANTE, ÁNIMO)
     [2] no tiene efecto, solo resta o es igual a la otra
     [3] dice su efecto con otras palabras
     [4] no le cambia nada al partido: create real (escena de mentira), con la
         semana de antes, y cada cosa que suma tiene que verse en la cancha
     [5] tiene una frase del relator que nombra el envión
   Corré:  node phaser/test/eventos_efecto.test.js */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var C = require("./_create_de_mentira.js");
var V = require("../logic/vida.js"), D = require("../logic/dialogo.js");
function json(f) { return JSON.parse(fs.readFileSync(path.join(RAIZ, f), "utf8")); }
var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

var EVS = json("data/eventos_temporada.json"), BAL = json("phaser/data/balance.json");
var PALABRAS = { tiro: "TIRO", pase: "PASE", gambeta: "GAMBETA", aguante: "AGUANTE", animo: "ÁNIMO" };
var opciones = [];
EVS.eventos.forEach(function (e) { e.opciones.forEach(function (o, i) { opciones.push({ e: e, o: o, i: i, n: e.id + " «" + o.texto + "»" }); }); });

/* ---------- [1] nada apagado, solo las palabras de la semana ---------- */
(function () {
  assert(BAL.flags.envion === false, "la poda tiene el envión apagado (si vuelve, este test se revisa)");
  opciones.forEach(function (x) {
    var ks = Object.keys(x.o.efecto || {});
    assert(ks.indexOf("envion") < 0, x.n + ": da ENVIÓN, que está apagado");
    var otras = ks.filter(function (k) { return !PALABRAS[k]; });
    assert(otras.length === 0, x.n + ": da " + otras.join(", ") + ", que no es una palabra de la semana");
  });
  console.log("[1] " + opciones.length + " opciones, ninguna da envión ni algo fuera de TIRO, PASE, GAMBETA, AGUANTE y ÁNIMO");
})();

/* ---------- [2] todas suman algo y las dos de cada evento son distintas ---------- */
(function () {
  opciones.forEach(function (x) {
    var ef = x.o.efecto || {}, ks = Object.keys(ef);
    assert(ks.length > 0, x.n + ": no tiene efecto");
    assert(ks.some(function (k) { return ef[k] > 0; }), x.n + ": solo resta (" + JSON.stringify(ef) + ")");
    ks.forEach(function (k) { assert(Math.abs(ef[k]) <= V.TOPES[k], x.n + ": " + k + " " + ef[k] + " pasa el tope " + V.TOPES[k]); });
  });
  EVS.eventos.forEach(function (e) {
    assert(JSON.stringify(e.opciones[0].efecto) !== JSON.stringify(e.opciones[1].efecto), e.id + ": las dos opciones dan lo mismo");
  });
  console.log("[2] todas suman algo; ninguna da lo mismo que la otra de su evento");
})();

/* ---------- [3] el efecto se dice con las palabras de la semana ---------- */
(function () {
  var una = "(más|menos) (" + Object.keys(PALABRAS).map(function (k) { return PALABRAS[k]; }).join("|") + ")";
  var re = new RegExp("^" + una + "(, " + una + ")?$");
  opciones.forEach(function (x) {
    var b = D.bajadaDeEfecto(x.o.efecto);
    assert(re.test(b), x.n + ": la bajada dice «" + b + "»");
  });
  assert(D.bajadaDeEfecto({ animo: 20, aguante: -40 }) === "más ÁNIMO, menos AGUANTE", "lo que suma primero (" + D.bajadaDeEfecto({ animo: 20, aguante: -40 }) + ")");
  assert(D.iconoDeEfecto({ animo: 20 }) === "sol", "el ÁNIMO tiene su dibujito");
  console.log("[3] cada bajada usa solo las cinco palabras");
})();

/* ---------- [4] lo que suma se ve en la cancha ---------- */
(function () {
  C.W.Phaser.Math.Clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
  /* la semana de antes (flags.semana_cuatro en false), la única que manda el
     evento al partido: llegás con 700 de aguante */
  var mp = function (mod) { return { rival: "Espejo de Sal", division: "primera_b", nivel: 3, mod: mod, semana: { aguanteInicial: 700, envionInicial: 0 } }; };
  var mirar = function (P) {
    var st = P.s.st, vos = st.mios.find(function (j) { return j.esVos; });
    return { tiro: vos.stats.tiro, pase: vos.stats.pase, gambeta: vos.stats.gambeta, aguante: vos.aguante, animo: st.animoGrande || 0 };
  };
  var base = mirar(C.jugar(mp(null)));
  assert(base.aguante === 700, "sin evento llegás con el aguante de la semana (" + base.aguante + ")");
  var vistos = {};
  opciones.forEach(function (x) {
    var mod = V.aplicarEleccion(x.e, x.i), con = mirar(C.jugar(mp(mod)));
    Object.keys(x.o.efecto).forEach(function (k) {
      var v = x.o.efecto[k];
      if (v > 0) assert(con[k] > base[k], x.n + ": " + PALABRAS[k] + " no cambia en la cancha (" + base[k] + " → " + con[k] + ")");
      else assert(con[k] < base[k], x.n + ": el menos " + PALABRAS[k] + " no se ve en la cancha (" + base[k] + " → " + con[k] + ")");
      vistos[k] = true;
    });
  });
  assert(Object.keys(PALABRAS).every(function (k) { return vistos[k]; }), "los eventos usan las cinco palabras (" + Object.keys(vistos).join(", ") + ")");
  console.log("[4] cada opción le cambia al partido lo que dice (base: aguante " + base.aguante + ", ánimo +" + base.animo + ")");
})();

/* ---------- [5] el relato no promete lo apagado ---------- */
(function () {
  opciones.forEach(function (x) {
    assert(!/envi[oó]n|encendid/i.test(x.o.frase_relator + " " + x.o.texto), x.n + ": nombra el envión");
    assert(x.o.frase_relator && x.o.frase_relator.length > 10, x.n + ": tiene frase del relator");
  });
  console.log("[5] ninguna frase nombra el envión");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
