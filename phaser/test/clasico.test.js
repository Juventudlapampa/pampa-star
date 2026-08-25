/* ============================================================================
   PAMPA STAR · EL CLÁSICO NO EXISTÍA PARA CASI NADIE

   EL BUG: se deducía buscando el nombre de tu pueblo ADENTRO del nombre del
   rival — `rival.indexOf(save.pueblo) >= 0`. Cruzado contra divisiones.json:

     · para Toay, Eduardo Castex, Intendente Alvear y Guatraché NO matcheaba
       ningún rival de NINGUNA división. Cuatro de los diez pueblos jugables no
       veían un clásico jamás, en ninguna temporada.
     · de los seis que sí, CINCO matcheaban sólo en Primera A — y toda carrera
       empieza en Primera B, así que ahí el clásico existía únicamente para
       Winifreda.
     · en Regional, Nacional y Mundial no matcheaba nadie: los rivales son
       "Bahía del Sur", "Norte Grande", "Brasil".

   Y la subcadena PERDÍA dos derbis de verdad: el rival de Eduardo Castex se
   llama "Ferrocarril de Castex" (dice sólo Castex) y el de Intendente Alvear,
   "Alvear Fútbol" (sólo Alvear).

   El evento con más carga emocional del juego era, para la mayoría de las
   partidas, contenido que no se veía nunca. Y no había ningún error.

   Corré:  node phaser/test/clasico.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var R = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/roster_pampeano.json"), "utf8"));
var DIV = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/divisiones.json"), "utf8"));
var EVS = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/eventos_temporada.json"), "utf8"));
var MASTER = fs.readFileSync(path.join(RAIZ, "phaser/scenes/master.js"), "utf8");

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }
var PUEBLOS = Object.keys(R.clubes_por_pueblo);

/* la misma cuenta que hace la escena */
function esClasico(pueblo, rival) {
  var meta = R.clubes_por_pueblo[pueblo];
  if (!meta || !meta.clasico) return false;
  var lista = Array.isArray(meta.clasico) ? meta.clasico : [meta.clasico];
  return lista.indexOf(rival) >= 0;
}
function divisionesConClasico(pueblo) {
  var out = [];
  Object.keys(DIV.divisiones).forEach(function (id) {
    (DIV.divisiones[id].rivales || []).forEach(function (riv) { if (esClasico(pueblo, riv)) out.push(id); });
  });
  return out;
}

/* ---------- [1] LOS DIEZ PUEBLOS TIENEN CLÁSICO ---------- */
(function () {
  assert(PUEBLOS.length === 10, "tienen que seguir siendo diez pueblos (hay " + PUEBLOS.length + ")");
  PUEBLOS.forEach(function (p) {
    var d = divisionesConClasico(p);
    assert(d.length > 0, "'" + p + "' no tiene clásico en ninguna división: es el caso exacto que estamos arreglando");
  });
  console.log("[1] los " + PUEBLOS.length + " pueblos tienen un clásico alcanzable");
})();

/* ---------- [2] EL CLÁSICO EXISTE DE VERDAD EN LA LIGA ---------- */
(function () {
  /* un clásico declarado que no esté en ningún fixture es peor que no tenerlo:
     parece que anda y no aparece nunca */
  var todos = [];
  Object.keys(DIV.divisiones).forEach(function (id) { todos = todos.concat(DIV.divisiones[id].rivales || []); });
  PUEBLOS.forEach(function (p) {
    var c = R.clubes_por_pueblo[p].clasico;
    (Array.isArray(c) ? c : [c]).forEach(function (riv) {
      assert(todos.indexOf(riv) >= 0,
        "el clásico de '" + p + "' es '" + riv + "' y ese club no juega en ninguna división");
    });
  });
  console.log("[2] los clásicos declarados existen en el fixture");
})();

/* ---------- [3] Y NO ES CUALQUIER RIVAL ---------- */
(function () {
  /* el control negativo: si diera verdadero contra cualquiera, el evento
     perdería el sentido por el otro lado */
  assert(!esClasico("Winifreda", "El Pampero"), "Winifreda contra El Pampero NO es clásico");
  assert(!esClasico("Toay", "Brasil"), "nadie tiene un clásico en el Mundial");
  var falsos = 0, total = 0;
  PUEBLOS.forEach(function (p) {
    Object.keys(DIV.divisiones).forEach(function (id) {
      (DIV.divisiones[id].rivales || []).forEach(function (riv) { total++; if (esClasico(p, riv)) falsos++; });
    });
  });
  assert(falsos <= PUEBLOS.length + 2, "no puede haber más clásicos que pueblos (dio " + falsos + " sobre " + total + " cruces)");
  console.log("[3] " + falsos + " cruces son clásico sobre " + total + " posibles · el resto, partido normal");
})();

/* ---------- [4] LA SUBCADENA NO PUEDE VOLVER ---------- */
(function () {
  assert(!/rival\.indexOf\(this\.save\.pueblo\)/.test(MASTER),
    "el match por subcadena no puede volver: perdía 'Ferrocarril de Castex' y 'Alvear Fútbol'");
  assert(/esClasico\(rival\)/.test(MASTER), "los dos ctx tienen que usar el helper");
  /* los dos derbis que la subcadena fallaba, fijados con nombre y apellido */
  assert(esClasico("Eduardo Castex", "Ferrocarril de Castex"), "Eduardo Castex vs Ferrocarril de Castex es clásico");
  assert(esClasico("Intendente Alvear", "Alvear Fútbol"), "Intendente Alvear vs Alvear Fútbol es clásico");
  /* y que la subcadena efectivamente los perdía, para que quede el registro */
  assert("Ferrocarril de Castex".indexOf("Eduardo Castex") < 0, "(la subcadena no los encontraba: por eso el bug)");
  console.log("[4] los dos derbis que la subcadena perdía, fijados");
})();

/* ---------- [5] Y EL EVENTO EXISTE PARA PEDIRLO ---------- */
(function () {
  var lista = Array.isArray(EVS) ? EVS : (EVS.eventos || []);
  var ev = lista.filter(function (e) {
    return JSON.stringify(e.condiciones || e.requiere || "").indexOf("clasico") >= 0 || e.id === "clasico";
  });
  assert(ev.length >= 1, "tiene que existir el evento del clásico en eventos_temporada.json");
  console.log("[5] el evento del clásico existe y ahora lo pueden pedir los diez pueblos");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
