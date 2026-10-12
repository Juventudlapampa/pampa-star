/* ============================================================================
   PAMPA STAR · UN SOLO RELOJ (oct 2026, "está desincronizado el tema de tiros,
   de cuándo festeja goles")

   En Phaser los tweens miden con la hora de la pared (Date.now) y this.time
   (delayedCall) con el delta suavizado del loop, que DESCARTA los cuadros de
   más de 200 ms. Después de una traba larga los dos relojes quedan separados.
   Todo el teatro del juego mezcla los dos: la pelota viaja con un tween, la
   red suena con un delayedCall.

   Medido en el juego, en tiempo real, con una traba de 380 ms en el medio de
   un viaje de 1 s (lo que tarda un teléfono en pintar un fondo o vestir una
   pose):
       dos relojes → la pelota llega a 1.027 ms, la red suena a 1.378: 351 tarde
       un reloj    → llegan juntas (la diferencia es un cuadro, fija)
   Con trabas de menos de 200 ms no hay desfase en ninguno de los dos: por eso
   era "a veces", y más en el teléfono que en la compu.

   Este test no puede correr Phaser en node; fija que el arreglo esté
   enchufado y que mida con el delta del loop, que es lo que importa.

   Corré:  node phaser/test/un_solo_reloj.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..");
var RELOJ = fs.readFileSync(path.join(RAIZ, "scenes/reloj.js"), "utf8");
var INDEX = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8");
var SW = fs.readFileSync(path.join(RAIZ, "sw.js"), "utf8");

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* [1] el archivo se carga y se llama, y entra en la PWA */
assert(/<script src="scenes\/reloj\.js"><\/script>/.test(INDEX), "index.html tiene que cargar scenes/reloj.js");
assert(/postBoot:[^\n]*PampaUnSoloReloj\(game\)/.test(INDEX), "y llamarlo en el postBoot");
assert(/\.\/scenes\/reloj\.js/.test(SW), "y el service worker tiene que cachearlo");
console.log("[1] reloj.js cargado, llamado en el postBoot y en la PWA");

/* [2] lo que hace: los tweens miden con el delta del LOOP */
(function () {
  /* se corre el archivo contra un Phaser de mentira y se mira qué devuelve */
  var proto = { getDelta: function () { return 999; } };
  global.window = { Phaser: { Tweens: { TweenManager: function () { } } } };
  global.window.Phaser.Tweens.TweenManager.prototype = proto;
  new Function(RELOJ)();
  var instalado = global.window.PampaUnSoloReloj();
  assert(instalado === true, "PampaUnSoloReloj tiene que instalarse");
  var tm = Object.create(proto);
  tm.systems = { game: { loop: { delta: 16.7 } } };
  assert(tm.getDelta(false) === 16.7, "un TweenManager tiene que medir con game.loop.delta (dio " + tm.getDelta(false) + ")");
  tm.systems.game.loop.delta = 33.3;
  assert(tm.getDelta(false) === 33.3, "y seguirlo cuadro a cuadro");
  var sinLoop = Object.create(proto);
  assert(sinLoop.getDelta(false) === 999, "sin loop, se queda con el reloj de Phaser (no rompe)");
  assert(global.window.PampaUnSoloReloj() === false, "y se instala una sola vez");
  console.log("[2] los tweens miden con el mismo delta que this.time");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
