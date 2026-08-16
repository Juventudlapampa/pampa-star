/* ============================================================================
   PAMPA STAR · C4 — EL EMPUJE NO TOCA LA CÁMARA DE LA INTERFAZ

   El bug: el empuje de cámara del Bloque B (B6) se enchufó a `uiCam`, que es la
   cámara que dibuja el HUD entero — marcador, reloj, radar, menús. Con 6% de
   zoom se comía 16 px arriba y 16 abajo, así que CADA vez que se abría un menú
   el marcador quedaba cortado al medio y la última carta se salía de pantalla.
   Se veía en la captura del estado MENU en 1366x768.

   El arreglo: `empujar`/`soltar` ya no reciben cámara. Empujan el PANEL DE LA
   ESCENA, que tiene máscara fija (el contenido crece adentro de una ventana que
   no se mueve — que es lo que hace una cámara al acercarse a un plano). Si el
   flag pantalla_partida se apaga y vuelve la cancha entera, el empuje cae sobre
   la cámara del MUNDO, que ahí sí muestra la acción.

   Este test guarda las dos mitades del arreglo:
     [1] nadie llama a empujar/soltar pasándole uiCam
     [2] empujar() sobre un doble de escena mueve el panel y NO la uiCam
     [3] lo que vive en el panel aguanta el recorte del empuje (el margen)

   Corré:  node phaser/test/c4_empuje.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var MATCH = fs.readFileSync(path.join(RAIZ, "phaser/scenes/match.js"), "utf8");
var FEEL = fs.readFileSync(path.join(RAIZ, "phaser/scenes/feel_ui.js"), "utf8");
var BAL = JSON.parse(fs.readFileSync(path.join(RAIZ, "phaser/data/balance.json"), "utf8"));

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* ---------- [1] NADIE LE PASA uiCam AL EMPUJE ---------- */
(function () {
  var sospechosas = [];
  MATCH.split("\n").forEach(function (l, i) {
    if (/PampaFeel\s*\.\s*(empujar|soltar)\s*\(/.test(l) && /uiCam/.test(l)) {
      sospechosas.push((i + 1) + ": " + l.trim());
    }
  });
  assert(sospechosas.length === 0,
    "empujar/soltar no pueden recibir uiCam — zoomear la cámara del HUD recorta el marcador:\n      " + sospechosas.join("\n      "));
  /* y que efectivamente se sigan llamando (si no, el arreglo sería borrarlo) */
  assert(/PampaFeel\s*\.\s*empujar\s*\(/.test(MATCH), "el empuje tiene que seguir existiendo, no desaparecer");
  assert(/PampaFeel\s*\.\s*soltar\s*\(/.test(MATCH), "y el soltar también");
  console.log("[1] ninguna llamada a empujar/soltar le pasa la cámara del HUD");
})();

/* ---------- [2] EL EMPUJE MUEVE EL PANEL, NO LA uiCam ---------- */
(function () {
  /* doble mínimo de escena Phaser: lo justo para que feel_ui.js corra en node */
  var root = { window: {} };
  var mod = { exports: {} };
  new Function("window", "module", FEEL)(root.window, mod);
  var F = root.window.PampaFeel;
  assert(!!F, "feel_ui.js tiene que publicar window.PampaFeel");

  var tweens = [];
  var panel = { x: 0, y: 0, scaleX: 1, scaleY: 1, setScale: function (s) { this.scaleX = this.scaleY = s; } };
  var uiCam = { zoom: 1 };
  var sc = {
    panelLayer: panel,
    uiCam: uiCam,
    cameras: { main: { zoom: 0.5 } },
    game: { registry: { get: function () { return BAL; } } },
    tweens: {
      add: function (cfg) { tweens.push(cfg); cfg.stop = function () {}; return cfg; },
      addCounter: function (cfg) { tweens.push(cfg); cfg.stop = function () {}; return cfg; }
    }
  };
  /* correr el tween a mano hasta el final */
  function correr(cfg) {
    if (!cfg || !cfg.onUpdate) return;
    cfg.onUpdate({ getValue: function () { return cfg.to; } });
  }

  F.empujar(sc, 2);
  assert(tweens.length === 1, "empujar tiene que arrancar exactamente un tween (dio " + tweens.length + ")");
  correr(tweens[0]);
  assert(uiCam.zoom === 1, "la cámara del HUD NO se puede mover (quedó en " + uiCam.zoom + ")");
  assert(panel.scaleX > 1, "el panel de la escena sí se agranda (quedó en " + panel.scaleX + ")");
  var pz = (BAL.oficio && BAL.oficio.push_zoom) || 0.06;
  assert(Math.abs(panel.scaleX - (1 + pz)) < 1e-6,
    "y se agranda exactamente lo que dice balance.oficio.push_zoom (" + pz + ", dio " + (panel.scaleX - 1).toFixed(4) + ")");
  /* el pivote: el panel crece desde SU centro, no desde la esquina */
  assert(panel.x < 0 && panel.y < 0,
    "la posición se corrige para crecer desde el centro del panel (dio " + panel.x + "," + panel.y + ")");

  tweens.length = 0;
  F.soltar(sc);
  correr(tweens[0]);
  assert(Math.abs(panel.scaleX - 1) < 1e-6, "soltar devuelve el panel a su escala (dio " + panel.scaleX + ")");
  assert(uiCam.zoom === 1, "y sigue sin tocar la cámara del HUD");

  /* escalón 1 = trámite: no se mueve nada */
  tweens.length = 0;
  F.empujar(sc, 1);
  assert(tweens.length === 0, "en el escalón 1 (trámite) el empuje no existe");

  /* sin panel (flag pantalla_partida apagado) cae sobre la cámara del MUNDO */
  tweens.length = 0;
  var sc2 = Object.assign({}, sc, { panelLayer: null });
  F.empujar(sc2, 2);
  assert(tweens.length === 1 && tweens[0].targets === sc2.cameras.main,
    "sin panel de escena, el empuje va a la cámara del MUNDO, nunca a la del HUD");
  console.log("[2] empujar mueve el panel (+" + Math.round(pz * 100) + "%) con uiCam clavada en 1");
})();

/* ---------- [3] EL MARGEN: LO QUE VIVE EN EL PANEL SOBREVIVE AL RECORTE ---------- */
(function () {
  var pz = (BAL.oficio && BAL.oficio.push_zoom) || 0.06;
  var comido = 960 * pz / 2;   // px que el empuje se come de cada costado
  /* el texto del portador es el único que vive pegado al borde del panel */
  var m = MATCH.match(/this\.panelNombre = this\.add\.text\(\s*(\d+)/);
  assert(!!m, "tiene que existir el texto del portador en el panel");
  var x = m ? +m[1] : 0;
  var xEmpujado = x * (1 + pz) - comido;
  assert(xEmpujado > 0,
    "la etiqueta del portador tiene que quedar DENTRO con el panel empujado: x=" + x +
    " → " + xEmpujado.toFixed(1) + " (el empuje come " + comido.toFixed(1) + " px por lado)");
  console.log("[3] la etiqueta del portador arranca en x=" + x + " y con el empuje queda en " +
    xEmpujado.toFixed(1) + " — adentro");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
