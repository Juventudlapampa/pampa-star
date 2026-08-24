/* ============================================================================
   PAMPA STAR · LA SALIDA DE LA CARRERA

   EL BUG: no había NINGUNA forma de empezar de nuevo. Ni una sola línea del
   juego borraba o reiniciaba el save. El que elegía mal el club en la primera
   pantalla, o el que después quería probar otro pueblo, quedaba encerrado en
   esa carrera para siempre.

   No es de los bugs que molestan: es de los que hacen dejar el juego.

   Este test fija las cuatro cosas que lo hacen seguro, porque una salida mal
   hecha es peor que no tenerla — borrar cinco temporadas por accidente no se
   deshace:

     1. LA SALIDA EXISTE y está donde se entra
     2. PIDE CONFIRMACIÓN EXPLÍCITA, y la pantalla dice QUÉ SE PIERDE con números
     3. EL CURSOR ARRANCA EN "NO": un Enter de reflejo no te cuesta la carrera
     4. HAY RESPALDO antes de borrar

   Corré:  node phaser/test/salida_carrera.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var MASTER = fs.readFileSync(path.join(RAIZ, "phaser/scenes/master.js"), "utf8");

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* ---------- [1] LA SALIDA EXISTE Y ESTÁ DONDE SE ENTRA ---------- */
(function () {
  assert(/borrarCarrera\(\)/.test(MASTER), "tiene que existir borrarCarrera()");
  assert(/localStorage\.removeItem\("pampa_master_v1"\)/.test(MASTER),
    "y tiene que BORRAR el save de verdad — antes no había una sola línea que lo hiciera");
  assert(/salidaDeLaCarrera\(W, H\)/.test(MASTER), "tiene que existir el acceso");
  /* está en la pantalla de la temporada, que es de donde se sale, y lleva a la
     de elegir club, que es donde se entró. Nadie busca "borrar carrera" en un
     menú de opciones que no existe. */
  var usos = (MASTER.match(/this\.salidaDeLaCarrera\(W, H\);/g) || []).length;
  assert(usos >= 2, "el acceso tiene que estar en las DOS ramas de la vista de temporada (dio " + usos + ")");
  console.log("[1] la salida existe, borra de verdad y está en las " + usos + " ramas de la pantalla de la temporada");
})();

/* ---------- [2] CONFIRMACIÓN EXPLÍCITA, CON NÚMEROS ---------- */
(function () {
  assert(/vistaBorrarCarrera\(\)/.test(MASTER), "tiene que haber pantalla de confirmación");
  /* el acceso NO borra: abre la confirmación */
  var acc = MASTER.slice(MASTER.indexOf("salidaDeLaCarrera(W, H) {"));
  acc = acc.slice(0, acc.indexOf("\n  }") + 4);
  assert(/vistaBorrarCarrera\(\)/.test(acc), "el acceso tiene que ABRIR la confirmación");
  assert(!/removeItem/.test(acc), "y NO puede borrar directo: un toque suelto no puede costar una carrera");

  /* la pantalla dice qué se pierde, CON NÚMEROS. Un "¿estás seguro?" pelado no
     le dice a nadie cuánto vale lo que está por tirar. */
  assert(/resumenDeLaCarrera\(\)/.test(MASTER), "tiene que haber un resumen de lo que se pierde");
  var vis = MASTER.slice(MASTER.indexOf("vistaBorrarCarrera() {"));
  vis = vis.slice(0, vis.indexOf("\n  borrarCarrera()"));
  assert(/LO QUE SE PIERDE/.test(vis), "y decirlo con todas las letras");
  ["r.club", "r.division", "r.temporada", "r.titulos", "r.fechas"].forEach(function (campo) {
    assert(vis.indexOf(campo) >= 0, "la confirmación tiene que mostrar " + campo);
  });
  /* y el botón que borra DICE que borra */
  assert(/BORRAR Y ELEGIR OTRO CLUB/.test(vis), "el botón que borra tiene que decir lo que hace, no 'OK'");
  assert(/SEGUIR CON ESTA CARRERA/.test(vis), "y la otra salida tiene que ser explícita también");
  console.log("[2] confirmación con club, división, temporada, títulos y fechas · los botones dicen lo que hacen");
})();

/* ---------- [3] EL CURSOR ARRANCA EN "NO" ---------- */
(function () {
  var vis = MASTER.slice(MASTER.indexOf("vistaBorrarCarrera() {"));
  vis = vis.slice(0, vis.indexOf("\n  borrarCarrera()"));
  /* el orden importa: el primero del grupo es el que queda enfocado, y con
     inicial:0 el foco cae en SEGUIR. Si llegaste acá por error de tecla, el
     Enter de reflejo no te tiene que costar la carrera. */
  var iSeguir = vis.indexOf("SEGUIR CON ESTA CARRERA");
  var iBorrar = vis.indexOf("BORRAR Y ELEGIR OTRO CLUB");
  assert(iSeguir >= 0 && iBorrar >= 0 && iSeguir < iBorrar,
    "SEGUIR tiene que declararse ANTES que BORRAR: el primero es el que queda enfocado");
  assert(/inicial: 0/.test(vis), "y el foco arranca explícitamente en 0 (SEGUIR)");
  /* ESC también sale sin borrar */
  assert(/volver: \(\) => this\.scene\.restart\(\)/.test(vis), "ESC tiene que salir sin borrar");
  console.log("[3] el cursor arranca en NO y ESC sale sin borrar");
})();

/* ---------- [4] HAY RESPALDO, Y LA CARRERA NUEVA ARRANCA LIMPIA ---------- */
(function () {
  var b = MASTER.slice(MASTER.indexOf("borrarCarrera() {"));
  b = b.slice(0, b.indexOf("\n  vistaElegir()"));
  /* la red cuesta una línea: se guarda antes de borrar */
  var iGuarda = b.indexOf('setItem("pampa_master_v1_borrada"');
  var iBorra = b.indexOf('removeItem("pampa_master_v1")');
  assert(iGuarda >= 0, "tiene que guardar un respaldo antes de borrar");
  assert(iBorra >= 0 && iGuarda < iBorra, "y guardarlo ANTES, no después");

  /* lo que quedaría colgado de la carrera vieja. Es la lección de P1: lo que no
     se limpia llega prendido a lo siguiente y se queda para siempre. */
  ["masterPartido", "masterResultado", "carreraPendiente"].forEach(function (k) {
    assert(b.indexOf('"' + k + '"') >= 0,
      "borrar la carrera tiene que limpiar el registry '" + k + "' o la carrera nueva arranca con restos de la vieja");
  });
  assert(/this\.save = null/.test(b), "y soltar el save en memoria");
  console.log("[4] respaldo antes de borrar · el registry queda limpio para la carrera nueva");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
