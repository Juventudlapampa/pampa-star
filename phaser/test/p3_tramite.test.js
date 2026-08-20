/* ============================================================================
   PAMPA STAR · P3 — EL TRÁMITE SE VE

   EL REPORTE (Rodri, tercera vez): "a veces me quitan o pateo y no pasa nada
   en pantalla". Ya se había barrido dos veces buscando QUÉ escena faltaba.

   NO FALTABA NINGUNA ESCENA. El camino terminaba en una capa INVISIBLE.

   Bloque A manda las acciones de escalón 1 —un quite o un corte fuera del
   último tercio— a mostrarResolucion() en vez de a una viñeta, y eso está
   bien: es el diseño. mostrarResolucion llama a animarResolucion(), que anima
   `sprDuelo` o `sprPortador`. Los dos viven en `mundoLayer`, y mundoLayer
   tiene visible = false desde la pantalla partida de V7-1.

   Verificado en vivo: mundoLayer.visible === false, con 5 hijos adentro.

   Medido con contadores, forzando un quite ganado en el mediocampo:
     quite_ganado 1
     quite_SIN_ESCENA_por_escalon 1   ← correcto: es trámite
     animarResolucion 1
     QUITE_SIN_DUELO 1                ← la rama del quite se saltea
     generica_gambeta 1               ← cae a animar sprPortador, que es el
                                        RIVAL que acababa de perder la pelota
   O sea: se animaba al jugador equivocado, con la animación equivocada, en una
   capa que nadie ve. En pantalla quedaba solo el renglón de texto.

   EL ARREGLO: el trámite se muestra en el PANEL DE LA ESCENA, que es la
   superficie que el jugador está mirando — pose de la acción por unos cuadros
   más un golpe de escala (doctrina V6: pose quieta, corte seco). Y si por lo
   que sea no se puede mostrar, se CUENTA como deuda en vez de callarse.

   Corré:  node phaser/test/p3_tramite.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var SRC = fs.readFileSync(path.join(RAIZ, "phaser/scenes/match.js"), "utf8");
var MAN = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/poses_manifest.json"), "utf8"));

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* ---------- [1] EL TRÁMITE PASA POR EL PANEL, NO SOLO POR mundoLayer ---------- */
(function () {
  assert(/poseTramite\(poseId, ms\)/.test(SRC), "tiene que existir poseTramite()");
  var anim = SRC.slice(SRC.indexOf("  animarResolucion(cfg) {"));
  anim = anim.slice(0, anim.indexOf("\n  }") + 4);
  assert(/this\._split/.test(anim),
    "animarResolucion tiene que mirar si está la pantalla partida");
  assert(/this\.poseTramite\(/.test(anim),
    "y mostrar la acción en el PANEL — mundoLayer no se ve (visible=false desde V7-1)");
  /* el panel tiene que ganarle al update, que repinta la pose cada cuadro */
  var pose = SRC.slice(SRC.indexOf("  poseDelPanel(p, corriendo) {"));
  pose = pose.slice(0, pose.indexOf("\n  }") + 4);
  assert(/_poseForzada/.test(pose),
    "poseDelPanel tiene que respetar la pose forzada: si no, el update la pisa en el cuadro siguiente");
  var iForzada = pose.indexOf("_poseForzada"), iVos = pose.indexOf("p.j.esVos");
  assert(iForzada >= 0 && (iVos < 0 || iForzada < iVos),
    "y tiene que mirarla ANTES que todo lo demás, o nunca gana");
  console.log("[1] el trámite se dibuja en el panel y la pose forzada tiene prioridad");
})();

/* ---------- [2] LAS POSES QUE PIDE EXISTEN DE VERDAD ---------- */
(function () {
  /* pedir una pose que no está en el manifiesto es volver al silencio: poseKey
     devuelve null, poseTramite devuelve false, y no se ve nada. */
  var disponibles = Object.keys(MAN.poses || {});
  assert(disponibles.length > 0, "el manifiesto de poses tiene que tener poses");
  var bloque = SRC.slice(SRC.indexOf("      const POSE = {"));
  bloque = bloque.slice(0, bloque.indexOf("};") + 2);
  var pedidas = (bloque.match(/"([a-z_0-9]+)"/g) || [])
    .map(function (s) { return s.replace(/"/g, ""); })
    .filter(function (s) { return ["quite", "corte", "bloqueo", "tiro", "gambeta", "pase", "arquero"].indexOf(s) < 0; });
  /* y las dos del fallback */
  var linea = SRC.slice(SRC.indexOf("      const id = POSE[cfg.anim]"));
  linea = linea.slice(0, linea.indexOf("\n"));
  (linea.match(/"([a-z_0-9]+)"/g) || []).forEach(function (s) { pedidas.push(s.replace(/"/g, "")); });

  assert(pedidas.length >= 6, "el mapa tiene que cubrir las acciones (encontré " + pedidas.length + ")");
  var faltan = pedidas.filter(function (p) { return disponibles.indexOf(p) < 0; });
  assert(faltan.length === 0,
    "estas poses se piden y NO están en data/poses_manifest.json, así que no se vería nada: " + faltan.join(", "));
  console.log("[2] las " + pedidas.length + " poses del trámite existen: " + pedidas.join(", "));
})();

/* ---------- [3] UNA ACCIÓN MUDA SE CUENTA, NO SE CALLA ---------- */
(function () {
  /* la razón por la que esto volvió dos veces es que fallaba en silencio.
     Ahora, si no se puede mostrar, queda anotado. */
  assert(/_tramitesMudos/.test(SRC), "tiene que existir un contador de acciones que no se vieron");
  var anim = SRC.slice(SRC.indexOf("  animarResolucion(cfg) {"));
  anim = anim.slice(0, anim.indexOf("\n  }") + 4);
  assert(/if \(!listo\)/.test(anim), "y se incrementa cuando poseTramite no pudo");
  assert(/_tramiteMudoUltimo/.test(anim), "guardando además cuál fue, para poder buscarlo");
  /* y se reinicia por partido, como todo lo demás (lección de P1) */
  var iInit = SRC.indexOf("  init() {"), iCreate = SRC.indexOf("  create() {");
  var init = SRC.slice(iInit, iCreate);
  assert(/this\._tramitesMudos = 0/.test(init), "el contador se reinicia en init() (P1: nada cruza de partido)");
  assert(/this\._poseForzada = null/.test(init), "y la pose forzada tampoco cruza de partido");
  console.log("[3] una acción que no se ve queda contada como deuda, y el contador no cruza de partido");
})();

/* ---------- [4] LA VIEJA GUARDA MUDA YA NO ES LA PRIMERA ---------- */
(function () {
  var anim = SRC.slice(SRC.indexOf("  animarResolucion(cfg) {"));
  anim = anim.slice(0, anim.indexOf("\n  }") + 4);
  var iHeroico = anim.indexOf("this._esHeroico");
  var iPanel = anim.indexOf("this.poseTramite");
  assert(iHeroico > 0, "la guarda de _esHeroico sigue existiendo (protege la rama de mundoLayer)");
  assert(iPanel > 0 && iPanel < iHeroico,
    "pero el panel se dibuja ANTES: si _esHeroico manda primero, volvemos a que no se vea nada");
  console.log("[4] el panel se atiende antes que la guarda de _esHeroico, que era la que cortaba todo");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
