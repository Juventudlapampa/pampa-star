/* ============================================================================
   PAMPA STAR · EL MODIFICADOR DE LA FECHA

   EL BUG: logic/vida.js declara doce efectos en TOPES y los 28 eventos los
   usan. Siete los aplicaba la escena. Los otros CINCO no los leia NADIE:

     duelo         se sumaba a mano en UNA sola de las cuatro vias de remate
                   (tiroPorComandos), asi que el mismo evento pegaba o no segun
                   por donde hubieras entrado al tiro — y no tocaba la gambeta,
                   el uno-dos, el quite ni el bloqueo, aunque el _efectos lo
                   describe como "bonus al poder de TUS acciones"
     arranque      "bonus en el 1er tiempo" · 10 opciones lo usan
     final         "bonus en el 2do tiempo" · 6 opciones
     recuperacion  "multiplicador de regeneracion" · 3 opciones
     keeper        la escena lo escribia en stats.quite, un campo que no existe
                   en el esquema y que nadie lee para el arquero

   Y al lado de la linea que los guardaba habia un comentario que decia
   "duelo/arranque/final/recuperación se leen en juego". No se leian.

   Corré:  node phaser/test/mod_fecha.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var P = require(path.join(RAIZ, "phaser/logic/partido.js"));
var V = require(path.join(RAIZ, "phaser/logic/vida.js"));
var bal = JSON.parse(fs.readFileSync(path.join(RAIZ, "phaser/data/balance.json"), "utf8"));
var EVS = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/eventos_temporada.json"), "utf8"));

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }
function nuevo(mod, tiempo) {
  var st = P.crearPartido({ bal: bal, semilla: 7 });
  st.modVida = mod || null;
  st.tiempo = tiempo || 1;
  return st;
}
function poderDe(st, id) {
  var l = P.accionesAtaque(st).concat(P.accionesDefensa(st));
  var a = l.find(function (x) { return x.id === id; });
  return a ? a.poder : null;
}

/* ---------- [1] duelo PEGA EN TODAS TUS ACCIONES, NO EN UNA ---------- */
(function () {
  var sin = nuevo(null, 1), con = nuevo({ duelo: 6 }, 1);
  ["gambeta", "pared", "tiro", "quite", "corte", "bloqueo"].forEach(function (id) {
    assert(Math.abs((poderDe(con, id) - poderDe(sin, id)) - 6) < 0.001,
      "duelo tiene que sumar 6 al poder de " + id + " (dio " + (poderDe(con, id) - poderDe(sin, id)) + ")");
  });
  console.log("[1] duelo pega en las seis acciones · antes solo en una via de tiro");
})();

/* ---------- [2] arranque Y final SEGUN EL TIEMPO ---------- */
(function () {
  var base = poderDe(nuevo(null, 1), "gambeta");
  assert(poderDe(nuevo({ arranque: 8 }, 1), "gambeta") === base + 8, "arranque tiene que pegar en el 1er tiempo");
  assert(poderDe(nuevo({ arranque: 8 }, 2), "gambeta") === base, "arranque se APAGA en el 2do tiempo");
  assert(poderDe(nuevo({ final: 7 }, 2), "gambeta") === base + 7, "final tiene que pegar en el 2do tiempo");
  assert(poderDe(nuevo({ final: 7 }, 1), "gambeta") === base, "final NO pega en el 1er tiempo");
  /* y los negativos tambien: los eventos dan de -6 a +8 */
  assert(poderDe(nuevo({ arranque: -6 }, 1), "gambeta") === base - 6, "un arranque malo tiene que costar");
  console.log("[2] arranque solo en el 1T y final solo en el 2T · los negativos tambien pegan");
})();

/* ---------- [3] keeper VA A LO QUE EL ARQUERO USA ---------- */
(function () {
  var sin = P.opcionesArquero(nuevo(null, 1))[0].poder;
  var con = P.opcionesArquero(nuevo({ keeper: 8 }, 1))[0].poder;
  assert(Math.abs((con - sin) - 8) < 0.001, "keeper tiene que subir el poder de atajar (dio " + (con - sin) + ")");
  /* la prueba de que el bug no vuelve: stats.quite NO puede ser el destino,
     porque no existe en el esquema */
  var esquema = Object.keys(P.crearPartido({ bal: bal }).mios[0].stats || {});
  assert(esquema.indexOf("quite") < 0,
    "si 'quite' pasa a existir en el esquema de stats, revisar este test (hoy NO existe: por eso escribir ahi era escribir al vacio)");
  console.log("[3] keeper sube la atajada · 'quite' sigue sin existir en el esquema (" + esquema.length + " stats)");
})();

/* ---------- [4] recuperacion MULTIPLICA TU REGENERACION ---------- */
(function () {
  function trasEntretiempo(mult) {
    var st = nuevo(mult ? { recuperacion: mult } : null, 1);
    st.mios.forEach(function (j) { j.aguante = 400; });
    var antesRival = st.aguanteRival = 400;
    P.entretiempo(st);
    return { mio: st.mios[2].aguante, rival: st.aguanteRival, antesRival: antesRival };
  }
  var a = trasEntretiempo(null), b = trasEntretiempo(1.5);
  assert(b.mio > a.mio, "con recuperacion 1.5 tenes que recuperar MAS (" + a.mio + " -> " + b.mio + ")");
  assert(b.rival === a.rival, "el rival NO se beneficia de TU evento (mio " + b.mio + ", rival " + b.rival + ")");
  /* sin evento el multiplicador es 1, no 0: si no, no recuperarias nada */
  assert(a.mio > 400, "sin evento tenes que recuperar igual (dio " + a.mio + ")");
  console.log("[4] recuperacion multiplica SOLO tu regeneracion · sin evento vale 1, no 0");
})();

/* ---------- [5] TODO EL VOCABULARIO DECLARADO TIENE QUIEN LO LEA ---------- */
(function () {
  /* la regla que evita que esto vuelva: si TOPES declara un efecto, alguien lo
     tiene que consumir. Un vocabulario mas grande que sus lectores es
     exactamente como nacieron estos cinco. */
  var CODIGO = ["phaser/logic/partido.js", "phaser/scenes/match.js"].map(function (f) {
    return fs.readFileSync(path.join(RAIZ, f), "utf8");
  }).join("\n");
  Object.keys(V.TOPES).forEach(function (k) {
    var leido = CODIGO.indexOf('"' + k + '"') >= 0 || CODIGO.indexOf("M." + k) >= 0 || CODIGO.indexOf("mod." + k) >= 0;
    assert(leido, "el efecto '" + k + "' esta en TOPES y no lo consume nadie: es contenido muerto");
  });
  console.log("[5] los " + Object.keys(V.TOPES).length + " efectos de TOPES tienen quien los lea");
})();

/* ---------- [6] LOS RANGOS REALES ESTAN ADENTRO DE LOS TOPES ---------- */
(function () {
  var lista = Array.isArray(EVS) ? EVS : (EVS.eventos || []);
  var usos = {};
  lista.forEach(function (e) {
    (e.opciones || []).forEach(function (o) {
      Object.keys(o.efecto || {}).forEach(function (k) { (usos[k] = usos[k] || []).push(o.efecto[k]); });
    });
  });
  Object.keys(usos).forEach(function (k) {
    assert(V.TOPES[k] != null, "el efecto '" + k + "' lo usan los eventos y no esta en TOPES");
    var max = Math.max.apply(null, usos[k].map(Math.abs));
    assert(max <= V.TOPES[k], "'" + k + "' llega a " + max + " y el tope es " + V.TOPES[k]);
  });
  assert(Object.keys(usos).length >= 10, "los eventos tienen que usar el vocabulario (usan " + Object.keys(usos).length + ")");
  console.log("[6] " + Object.keys(usos).length + " efectos usados por los eventos, todos adentro de su tope");
})();

/* ---- 7) pedido de Rodri del 22/oct: con el envión apagado (la poda) las
   opciones que SOLO daban envión decían "todo igual" y el relato seguía
   diciendo "entra encendido". Cada una tiene ahora un efecto que la cancha
   lee, y el relato tiene de qué hablar. ---- */
(function () {
  var D = require(path.join(RAIZ, "phaser/logic/dialogo.js"));
  var leidos = ["aguante", "duelo", "keeper", "tiro", "pase", "gambeta", "fisico", "caracter", "recuperacion", "arranque", "final"];
  var soloEnvion = [];
  EVS.eventos.forEach(function (e) {
    e.opciones.forEach(function (o) {
      var ks = Object.keys(o.efecto || {});
      if (ks.length && ks.every(function (k) { return k === "envion"; })) soloEnvion.push(e.id + ": " + o.texto);
    });
  });
  assert(soloEnvion.length === 0, "SÍNTOMA: opciones que con el envión apagado no hacen nada: " + soloEnvion.join(" | "));
  ["micro", "asado", "fiesta", "radio", "mala_racha"].forEach(function (id) {
    var e = EVS.eventos.find(function (x) { return x.id === id; });
    var o = e.opciones.find(function (op) { return (op.efecto || {}).envion > 0; });
    var sinEnvion = Object.assign({}, o.efecto); delete sinEnvion.envion;
    assert(D.bajadaDeEfecto(sinEnvion) !== "todo igual", id + ": '" + o.texto + "' dice " + D.bajadaDeEfecto(sinEnvion));
    assert(Object.keys(sinEnvion).every(function (k) { return leidos.indexOf(k) >= 0; }), id + ": su efecto lo lee la cancha (" + Object.keys(sinEnvion).join(",") + ")");
    /* y la cancha lo lee de verdad: el modificador cambia un número del partido */
    var st = P.crearPartido({ bal: bal, mios: [{ nombre: "Vos", esVos: true, pos: "ATA" }], rivales: [], rng: function () { return 0.5; } });
    var mod = V.aplicarEleccion(e, e.opciones.indexOf(o)).mod;
    st.modVida = mod;
    var k = Object.keys(sinEnvion)[0];
    var real;
    if (k === "arranque" || k === "final") { st.tiempo = k === "final" ? 2 : 1; real = P.bonusAccion(st) > 0; }
    else real = mod[k] > 0;   // tiro, pase, gambeta y carácter: match.js los suma a tus stats al armar la fecha
    assert(real, id + ": el efecto " + k + " no llega a la cancha");
  });
  console.log("[7] ninguna opción de la semana depende solo del envión (pedido del 22/oct)");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
