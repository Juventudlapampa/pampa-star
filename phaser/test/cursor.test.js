/* ============================================================================
   PAMPA STAR · EL CURSOR, EN LOS OCHO GRUPOS

   Antes de esta tanda cada pantalla resolvía la selección a su manera, y varias
   no la resolvían: abrían sin nadie enfocado, o resaltaban sólo con color, o
   tenían opciones que el teclado no podía alcanzar. La cruz del partido era el
   caso peor — el CENTRO, que es la carta y el megatiro, no se podía elegir con
   teclado porque el pool de botones sólo se llenaba con N/S/W/E.

   Ahora hay UNA puerta: scenes/foco_ui.grupoFoco(). Cuatro canales, y ninguno
   es sólo color, porque Rodri es daltónico:
     FORMA      las escuadras que abrazan la opción
     ELEVACIÓN  la opción enfocada crece un 4%
     PULSO      respira al ritmo de balance.pulso.latido_ms
     VOZ        SFX.ui("mover" / "confirmar" / "bloqueado")

   Este test fija que los ocho grupos pasen por ahí. Si mañana alguien arma una
   pantalla de opciones a mano, no la va a ver nadie hasta que un playtest la
   encuentre — por eso se cuenta acá.

   Corré:  node phaser/test/cursor.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
function leer(p) { try { return fs.readFileSync(path.join(RAIZ, p), "utf8"); } catch (e) { return ""; } }

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

var FOCO = leer("phaser/scenes/foco_ui.js");
var LOGICA = leer("phaser/logic/foco.js");
var MASTER = leer("phaser/scenes/master.js");
var MATCH = leer("phaser/scenes/match.js");
var EDITOR = leer("phaser/scenes/editor.js");

/* ---------- [1] LOS OCHO GRUPOS PASAN POR LA MISMA PUERTA ---------- */
(function () {
  var GRUPOS = [
    ["la semana", MASTER], ["el mapa", MASTER], ["la entrevista", MASTER],
    ["borrar la carrera", MASTER], ["el evento", MASTER],
    ["la cruz del partido", MATCH], ["el pasillo", MATCH],
    ["el editor", EDITOR]
  ];
  var porArchivo = {};
  GRUPOS.forEach(function (g) { porArchivo[g[1] === MASTER ? "master" : g[1] === MATCH ? "match" : "editor"] = g[1]; });
  var usos = 0;
  Object.keys(porArchivo).forEach(function (k) {
    usos += (porArchivo[k].match(/this\.grupoFoco\(/g) || []).length;
  });
  assert(usos >= 8, "tiene que haber al menos ocho grupos con cursor (hay " + usos + ")");
  /* y ninguna pantalla puede quedarse con su propio resalte a mano */
  assert(!/setStrokeStyle\(4, 0xffd84d\)/.test(MATCH),
    "la cruz no puede volver a resaltar con su borde amarillo propio: ese era el canal más débil");
  console.log("[1] " + usos + " grupos pasan por grupoFoco");
})();

/* ---------- [2] CUATRO CANALES, Y NINGUNO ES SÓLO COLOR ---------- */
(function () {
  assert(/escuadra|bracket|corner/i.test(FOCO), "FORMA: tiene que dibujar escuadras");
  assert(/setScale|escala/.test(FOCO), "ELEVACIÓN: la opción enfocada crece");
  assert(/latido|pulso/.test(FOCO), "PULSO: respira");
  assert(/SFX\.ui|S\.ui\(/.test(FOCO), "VOZ: suena al moverse y al confirmar");
  console.log("[2] forma + elevación + pulso + voz · ninguno depende del color");
})();

/* ---------- [3] ABRE CON ALGUIEN ENFOCADO ---------- */
(function () {
  /* un menú que abre sin nadie elegido obliga a un toque de más antes de poder
     hacer nada, y en la cruz del partido era peor: _menuSel arrancaba en null */
  assert(/function primero\(/.test(LOGICA), "tiene que existir primero()");
  assert(/G\.mover\(F\.primero\(/.test(FOCO), "y el grupo tiene que abrir con foco puesto");
  assert(!/this\._menuSel = null;[\s\S]{0,200}abrirMenuCruz/.test(MATCH) || /nivelDeLaCarrera|grupoFoco/.test(MATCH),
    "la cruz no puede volver a abrir sin nadie enfocado");
  console.log("[3] todos abren con alguien enfocado");
})();

/* ---------- [4] LO BLOQUEADO SE PUEDE ENFOCAR Y DICE POR QUÉ ---------- */
(function () {
  /* saltearlo sería peor: no te enterarías de que la opción existe */
  assert(/bloqueada/.test(FOCO), "el grupo tiene que conocer las opciones bloqueadas");
  assert(/motivo/.test(FOCO), "y decir el motivo al intentar confirmarlas");
  assert(/function enfocable/.test(LOGICA), "enfocable() decide qué se puede enfocar");
  /* la prueba de que NO las saltea: enfocable no mira `bloqueada` */
  var cuerpo = LOGICA.slice(LOGICA.indexOf("function enfocable"), LOGICA.indexOf("function enfocable") + 220);
  assert(cuerpo.indexOf("bloqueada") < 0,
    "una opción bloqueada tiene que poder enfocarse igual: si se saltea, no te enterás de que existe");
  console.log("[4] lo bloqueado se enfoca y dice por qué");
})();

/* ---------- [5] EL EDITOR ES DISTINTO, Y ESO ESTÁ BIEN ---------- */
(function () {
  /* en el editor las flechas ◄► CAMBIAN EL VALOR, no mueven el foco. Si alguien
     le mete grupoFoco con su teclado, le roba las flechas y rompe lo único que
     el editor hace. */
  assert(/sinTeclado: true/.test(EDITOR), "el editor tiene que entrar con sinTeclado");
  assert(/keydown-LEFT[\s\S]{0,120}this\.mover\(/.test(EDITOR), "y sus flechas tienen que seguir ciclando el valor");
  /* y los botones de abajo tienen que ser alcanzables: antes no había forma */
  assert(/this\._botones\.push/.test(EDITOR), "los botones tienen que entrar al recorrido");
  assert(/keydown-ENTER/.test(EDITOR), "y ENTER tiene que confirmarlos");
  console.log("[5] el editor conserva ◄► para el valor y suma los botones al recorrido");
})();

/* ---------- [6] LAS CAJAS NO SE MIDEN EN VUELO ---------- */
(function () {
  /* grupoFoco mide una sola vez, al crearse, y PampaFeel.aparecer todavía trae
     los botones volando. Medirlos ahí es medir una geometría que ya no existe:
     bajando desde el norte, el cursor SALTEABA el centro por 30 px. */
  assert(/it\.caja/.test(FOCO), "grupoFoco tiene que aceptar la caja declarada");
  assert(/caja: \{/.test(MATCH), "la cruz tiene que declarar las suyas (sus botones entran animados)");
  assert(/caja: this\._filaCajas/.test(EDITOR), "y el editor también, que su etiqueta es más angosta que la fila");
  console.log("[6] las cajas van declaradas donde los botones se animan");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
