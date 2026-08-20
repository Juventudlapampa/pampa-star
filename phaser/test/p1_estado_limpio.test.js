/* ============================================================================
   PAMPA STAR · P1 — LA ESCENA DEL PARTIDO ARRANCA LIMPIA

   EL BUG: Rodri llegó al segundo partido del Modo Master y el mapa apareció
   vacío. Sin cancha, sin jugadores, sin "◄ TU ARCO". Y así quedaba para el
   resto de la carrera.

   LA CAUSA: Phaser NO crea una escena nueva en cada `scene.start("match")`.
   Reusa la MISMA instancia y solo vuelve a correr init() y create(). Entonces
   todo campo que se escriba durante el partido y no se reinicie en init()
   llega prendido al partido siguiente.

   El culpable fue `_finalApagado`: se prende al terminar el partido (PIEL P9,
   para que el mapa no se repinte encima de la pantalla de final) y nunca se
   apagaba. En la fecha 2, `dibujarRadar()` salía por esa guarda en el primer
   renglón.

   POR QUÉ ESTE TEST Y NO UN ARREGLO SUELTO: el bug no es una línea, es una
   CLASE de bug. Cada vez que alguien agregue una bandera nueva al partido va a
   poder repetirlo. Este test busca, en el archivo, toda asignación de `true` /
   `false` / `!!` a un campo de la escena hecha FUERA de init()/create(), y
   exige que init() la reinicie.

   Los objetos (sprites, textos, gráficos) no hacen falta: create() los vuelve
   a construir. Las banderas no las reconstruye nadie.

   Corré:  node phaser/test/p1_estado_limpio.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var SRC = fs.readFileSync(path.join(RAIZ, "phaser/scenes/match.js"), "utf8");
var L = SRC.split("\n");

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* ---------- dónde empieza y termina cada cosa ---------- */
var iInit = L.findIndex(function (l) { return /^  init\(\)/.test(l); });
var iCreate = L.findIndex(function (l) { return /^  create\(\)/.test(l); });
assert(iInit > 0, "match.js tiene que tener un init()");
assert(iCreate > iInit, "y un create() después del init()");
var finCreate = (function () {
  for (var i = iCreate + 1; i < L.length; i++) if (/^  [a-zA-Z_]+\(/.test(L[i])) return i;
  return L.length;
})();

/* campos que init() o create() reinician */
var limpios = {};
for (var i = iInit; i < finCreate; i++) {
  (L[i].match(/this\.(_?[A-Za-z][\w]*)\s*=/g) || []).forEach(function (m) {
    limpios[m.match(/this\.(_?\w+)/)[1]] = true;
  });
}

/* ---------- [1] NINGUNA BANDERA SOBREVIVE AL PARTIDO ---------- */
(function () {
  var banderas = {};
  L.forEach(function (l, n) {
    if (n >= iInit && n < finCreate) return;
    (l.match(/this\.(_?[A-Za-z][\w]*)\s*=\s*(true|false|!!)/g) || []).forEach(function (m) {
      var k = m.match(/this\.(_?\w+)/)[1];
      (banderas[k] = banderas[k] || []).push(n + 1);
    });
  });
  var nombres = Object.keys(banderas);
  assert(nombres.length > 0, "el barrido tiene que encontrar banderas (si da 0, el regex se rompió)");

  var sucias = nombres.filter(function (k) { return !limpios[k]; });
  assert(sucias.length === 0,
    "estas banderas se escriben durante el partido y init() no las reinicia, así que llegan\n" +
    "      prendidas al partido siguiente (es exactamente el bug de la fecha 2):\n" +
    sucias.map(function (k) { return "        this." + k + " (líneas " + banderas[k].join(",") + ")"; }).join("\n"));
  console.log("[1] " + nombres.length + " banderas se escriben en el partido · " +
    (nombres.length - sucias.length) + " reiniciadas en init/create · " + sucias.length + " sucias");
})();

/* ---------- [2] LAS CUATRO DEL ARREGLO, POR NOMBRE ---------- */
(function () {
  /* si alguien saca una de estas del init, que falle diciendo cuál */
  var bloqueInit = L.slice(iInit, iCreate).join("\n");
  [["_finalApagado", "el mapa no se dibuja más: ES el bug de la fecha 2"],
   ["_medidoresOcultos", "AGUANTE y ENVIÓN quedan prendidos en el menú previo"],
   ["_panVivo", "si el partido terminó a mitad de un paneo, la cámara arranca creyendo que está paneando"],
   ["_esHeroico", "el portador arranca con la clase de sprite del partido anterior"]
  ].forEach(function (par) {
    assert(bloqueInit.indexOf("this." + par[0] + " =") >= 0,
      "init() tiene que reiniciar this." + par[0] + " — si no: " + par[1]);
  });
  console.log("[2] las cuatro banderas del arreglo siguen reiniciadas por nombre");
})();

/* ---------- [3] LA GUARDA QUE CAUSÓ EL BUG SIGUE SIENDO NECESARIA ---------- */
(function () {
  /* no alcanza con limpiar la bandera: la guarda tiene que seguir existiendo,
     porque su motivo (que el mapa no se repinte sobre la pantalla final) es
     real. El arreglo era el reinicio, no borrar la guarda. */
  assert(/if \(this\._finalApagado\) return;/.test(SRC),
    "dibujarRadar tiene que seguir saliendo con _finalApagado: la guarda no era el error, " +
    "el error era que la bandera nunca se apagaba");
  var iRadar = L.findIndex(function (l) { return /^  dibujarRadar\(\)/.test(l); });
  var iGuarda = L.findIndex(function (l) { return /if \(this\._finalApagado\) return;/.test(l); });
  assert(iRadar > 0 && iGuarda > iRadar && iGuarda - iRadar < 12,
    "y la guarda vive adentro de dibujarRadar(), cerca del principio");
  console.log("[3] la guarda de la pantalla final sigue en pie (línea " + (iGuarda + 1) + ")");
})();

/* ---------- [4] LOS CACHES PEREZOSOS: LA OTRA MITAD DEL BUG ---------- */
(function () {
  /* Un objeto creado perezoso —  if (!this.X) this.X = this.add.text(...)  —
     muere con la escena anterior, pero la REFERENCIA sobrevive al
     scene.start(). La guarda da falso, no lo recrea, y el frame siguiente le
     manda setText() a un objeto destruido: crash por frame. Eso pasaba con
     _radarTuArco y tiraba abajo el update entero del segundo partido. */
  var sucios = [];
  L.forEach(function (l, n) {
    var m = l.match(/ifs*(s*!s*this.(_?[A-Za-z][w]*)s*)/);
    if (!m) return;
    var ctx = l + " " + (L[n + 1] || "") + " " + (L[n + 2] || "");
    if (!/this.add.|this.make./.test(ctx)) return;
    if (!limpios[m[1]]) sucios.push("this." + m[1] + " (linea " + (n + 1) + ")");
  });
  assert(sucios.length === 0,
    "estos objetos se crean perezoso y init() no borra la referencia, asi que en el partido" +
    " siguiente la guarda da falso y se le pegan metodos a un objeto DESTRUIDO: " + sucios.join(" · "));
  console.log("[4] ningun cache perezoso queda con la referencia muerta entre partidos");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
