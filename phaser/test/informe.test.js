/* ============================================================================
   PAMPA STAR · LA VERSIÓN A LA VISTA Y EL INFORME DE ERROR (tanda 1.0)

   LO QUE ESTABA MAL, MEDIDO: `version` y `VERSION` daban 0 resultados en
   intro.js y en editor.js; la única versión del juego era VERSION="v16-toma"
   adentro de sw.js:10, donde nadie la ve. Si alguien de una localidad avisa
   "se me trabó", no había forma de saber qué versión tenía ni en qué pantalla
   estaba. La red de errores guarda pampa_ultimo_error, pero no daba forma de
   mandarlo.

   QUÉ MIRA ESTE TEST:
     [1] el informe (logic/informe.js) trae la versión y la escena, y es corto.
     [2] con un save que tiene nombre, apodo, club y amigos, NINGUNO aparece,
         aunque el mensaje del error los traiga adentro.
     [3] las piezas: dónde (stack con "at" y con "@", prefiere el código propio
         al motor), el estado del partido sólo con números.
     [4] window.PAMPA_VERSION de index.html es IGUAL a la VERSION de sw.js, el
         informe está en el precache, el editor muestra la versión y el
         destino del informe vive en balance.contacto (vacío por defecto).

   Corré:  node phaser/test/informe.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var I = require(path.join(RAIZ, "phaser/logic/informe.js"));
function leer(p) { return fs.readFileSync(path.join(RAIZ, p), "utf8"); }

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

var BASE = {
  version: "v16-toma", escena: "match",
  estado: { estado: "LIBRE", tiempo: 2, minuto: 85.4, golesMio: 1, golesRival: 0 },
  error: new TypeError("Cannot read properties of null (reading 'x')"),
  stack: "TypeError: Cannot read properties of null (reading 'x')\n    at PampaMatch.avisar (http://localhost:8123/phaser/scenes/match.js:5447:12)\n    at x (http://localhost:8123/phaser/vendor/phaser.min.js:1:2)",
  pantalla: { w: 800, h: 360, dpr: 2.625, horizontal: true },
  instalada: true, ua: "Mozilla/5.0 (Linux; Android 13; SM-A135M) AppleWebKit/537.36 Chrome/129 Mobile Safari/537.36",
  hora: new Date(2026, 9, 12, 14, 3, 22).getTime()
};

/* ---------- [1] LO QUE TRAE ---------- */
(function () {
  var t = I.armar(BASE);
  assert(t.indexOf("versión: v16-toma") >= 0, "el informe trae la versión");
  assert(t.indexOf("escena: match · LIBRE · 2T 85' · 1-0") >= 0, "trae la escena y el estado del partido (" + t.split("\n")[2] + ")");
  assert(t.indexOf("error: TypeError: Cannot read properties of null (reading 'x')") >= 0, "trae la primera línea del error");
  assert(t.indexOf("dónde: scenes/match.js:5447:12") >= 0, "trae dónde, con la ruta corta");
  assert(t.indexOf("pantalla: 800x360 · x2.63 · horizontal") >= 0, "trae la pantalla");
  assert(t.indexOf("instalada: sí") >= 0, "si está instalada");
  assert(t.indexOf("navegador: Mozilla/5.0") >= 0, "el navegador");
  assert(t.indexOf("hora: 2026-10-12 14:03:22") >= 0, "y la hora");
  var L = t.split("\n");
  assert(L.length <= 12 && t.length <= 900, "es CORTO: entra en un mensaje (" + L.length + " líneas, " + t.length + " caracteres)");
  /* un error larguísimo no estira el informe */
  var largo = I.armar(Object.assign({}, BASE, { error: new Error("x".repeat(5000)) }));
  assert(largo.length < 1100, "un mensaje de error enorme se corta (" + largo.length + ")");
  /* sin error (lo pidieron a mano) igual sirve */
  var sinErr = I.armar({ version: "v16-toma", escena: "editor" });
  assert(/versión: v16-toma/.test(sinErr) && /escena: editor/.test(sinErr) && !/error:/.test(sinErr), "sin error, trae versión y escena igual");
  console.log("[1] el informe: " + L.length + " líneas, " + t.length + " caracteres");
  console.log("    " + L.join("\n    "));
})();

/* ---------- [2] NUNCA LLEVA NOMBRE, APODO NI CLUB ---------- */
(function () {
  var saveClasico = { name: "Rocío Benítez", pueblo: "Intendente Alvear", vida: { amigos: [{ nombre: "Pato Quiroga" }, { nombre: "Ceci" }] } };
  var saveMaster = { miClub: "Halcones de Toay", apodo: "la Rayo", division: "primera_b", tabla: [{ equipo: "Halcones de Toay", pts: 3 }] };
  var sec = I.secretosDelSave([saveClasico, saveMaster]);
  ["Rocío Benítez", "Pato Quiroga", "Ceci", "Halcones de Toay", "la Rayo", "Intendente Alvear"].forEach(function (s) {
    assert(sec.indexOf(s) >= 0, "secretosDelSave junta '" + s + "'");
  });
  assert(sec.indexOf("primera_b") < 0, "y no junta lo que no es de la persona (la división)");
  /* el peor caso: el mensaje del error TRAE el nombre y el club */
  var d = Object.assign({}, BASE, {
    error: new Error("no encontré a Rocío Benítez en el plantel de HALCONES DE TOAY (apodo la rayo)"),
    stack: "Error: Rocío Benítez\n    at f (http://localhost:8123/phaser/scenes/master.js:10:2)",
    /* y un campo de más con el save entero: armar() lo tiene que ignorar */
    save: saveClasico, club: "Halcones de Toay", nombre: "Rocío Benítez"
  });
  var t = I.armar(d, { secretos: sec });
  ["Rocío", "Benítez", "Halcones", "HALCONES", "Toay", "TOAY", "rayo", "Rayo", "Pato", "Quiroga", "Alvear"].forEach(function (s) {
    assert(t.indexOf(s) < 0, "el informe NO lleva '" + s + "' (dato del save)");
  });
  assert(t.indexOf("[…]") >= 0, "lo tapado se marca con […]");
  assert(/versión: v16-toma/.test(t) && /escena: match/.test(t), "y sigue trayendo la versión y la escena");
  /* sin pasarle los secretos, armar tampoco mete el save que venga de contrabando */
  var t2 = I.armar(d);
  assert(t2.indexOf("Halcones de Toay\n") < 0 && t2.indexOf("club:") < 0 && t2.indexOf("nombre:") < 0,
    "armar() sólo escribe sus campos: un save que entra por la ventana no sale");
  /* tapar: largos primero, sin importar mayúsculas, y los cortos no tapan media frase */
  assert(I.tapar("Rocío Benítez y Rocío", ["Rocío", "Rocío Benítez"].sort(function (a, b) { return b.length - a.length; })) === "[…] y […]", "tapa el nombre largo entero, no '[…] Benítez'");
  assert(I.tapar("Mi error", ["Mi"]) === "Mi error", "un secreto de 2 letras no tapa (se comería palabras del mensaje)");
  console.log("[2] con nombre, apodo, club, localidad y amigos en el save: ninguno sale (" + sec.length + " datos tapados)");
})();

/* ---------- [3] LAS PIEZAS ---------- */
(function () {
  assert(I.lugar("TypeError: x\n    at a (http://h/phaser/scenes/match.js?v=3:10:5)") === "scenes/match.js:10:5", "stack con 'at', con ?v= en la ruta");
  assert(I.lugar("avisar@http://h/phaser/scenes/match.js:5447:12\nstep@http://h/phaser/vendor/phaser.min.js:1:9") === "scenes/match.js:5447:12", "stack con '@'");
  assert(I.lugar("    at a (http://h/phaser/vendor/phaser.min.js:1:812345)\n    at b (http://h/phaser/scenes/editor.js:40:3)") === "scenes/editor.js:40:3",
    "prefiere el código del juego al motor");
  assert(I.lugar("    at a (http://h/phaser/vendor/phaser.min.js:1:812345)") === "vendor/phaser.min.js:1:812345", "si sólo está el motor, el motor");
  assert(I.lugar("") === "", "sin stack, nada");
  assert(I.resumenEstado({ estado: "MENU", tiempo: 1, minuto: 12.7, golesMio: 0, golesRival: 2 }) === "MENU · 1T 12' · 0-2", "el estado del partido en una línea");
  assert(I.resumenEstado({ estado: "<script>Rocío" }) === "R", "el estado sólo deja pasar MAYÚSCULAS (las constantes del partido): nada de texto libre");
  assert(I.primeraLinea("uno\ndos") === "uno", "primeraLinea corta en el primer renglón");
  assert(I.primeraLinea(null) === "", "y aguanta null");
  var t = I.armar({ version: "v1", faltan: ["http://h/phaser/scenes/match.js"], errores: 3 });
  assert(/no bajó: scenes\/match\.js/.test(t), "si un script no bajó, el informe lo nombra");
  assert(/errores en la sesión: 3/.test(t), "y cuenta los errores de la sesión");
  /* revisión del lote: el script que BAJÓ pero el navegador no pudo leer. El
     SyntaxError no trae renglones "at …"; el lugar viene del evento */
  var t2 = I.armar({ version: "v1", error: "SyntaxError: Unexpected token '?'", stack: "SyntaxError: Unexpected token '?'",
    lugar: "scenes/match.js:812:31", noArranco: ["PampaMatch"] });
  assert(/error: SyntaxError: Unexpected token/.test(t2), "el informe lleva el SyntaxError, no un 'no bajó' que lo pisa");
  assert(/dónde: scenes\/match\.js:812:31/.test(t2), "con el lugar del evento cuando el stack no lo trae");
  assert(/no arrancó: PampaMatch/.test(t2) && !/no bajó/.test(t2), "y nombra la clase que no arrancó (sin decir que no bajó)");
  assert(!/dónde/.test(I.armar({ version: "v1", lugar: "Rocío <b>" })), "un lugar que no tiene forma de archivo.js:línea:col no entra");
  console.log("[3] dónde (stack con at y con @, motor) · estado sólo con números · scripts que no bajaron");
})();

/* ---------- [4] LA VERSIÓN, UNA SOLA, Y A LA VISTA ---------- */
(function () {
  var html = leer("phaser/index.html"), sw = leer("phaser/sw.js"), editor = leer("phaser/scenes/editor.js");
  var mV = html.match(/window\.PAMPA_VERSION\s*=\s*"([^"]+)"/);
  var mS = sw.match(/const VERSION\s*=\s*"([^"]+)"/);
  assert(!!mV, "index.html define window.PAMPA_VERSION");
  assert(!!mS, "sw.js define VERSION");
  assert(mV && mS && mV[1] === mS[1], "window.PAMPA_VERSION (" + (mV && mV[1]) + ") tiene que ser IGUAL a la VERSION de sw.js (" + (mS && mS[1]) +
    "). SÍNTOMA: el informe dice una versión y el celular tiene otra. Se suben juntas.");
  /* REVISIÓN DEL LOTE: VERSION era también el nombre del caché, y activate
     barre todo caché que no se llame así. Subirla le hacía bajar de nuevo los
     assets a quien ya jugó, así que el lote salió sin subirla y el informe no
     distinguía builds. Ahora la versión que se ve y el nombre del caché van
     separados: subir VERSION no barre nada. */
  var mC = sw.match(/const CACHE\s*=\s*"([^"]+)"/);
  assert(!!mC, "sw.js define CACHE, el nombre del caché, aparte de VERSION");
  assert(!/caches\.open\(VERSION\)/.test(sw) && !/k !== VERSION/.test(sw) && /caches\.open\(CACHE\)/.test(sw) && /k !== CACHE/.test(sw),
    "SÍNTOMA DE LA VERSIÓN CONGELADA: caches.open y el barrido de activate usan CACHE; si usaran VERSION, subir la versión que se ve tiraría las poses ya bajadas");
  assert(mV && mV[1] !== "v16-toma", "la versión que se ve ya no es la de antes de la tanda 1.0 (" + (mV && mV[1]) + ")");
  assert(html.indexOf('<script src="logic/informe.js"></script>') >= 0, "index.html carga logic/informe.js");
  assert(sw.indexOf('"./logic/informe.js"') >= 0, "sw.js lo tiene en el PRECACHE (sin red, el informe también tiene que andar)");
  assert(/window\.PAMPA_VERSION/.test(editor) && /"versión " \+ window\.PAMPA_VERSION/.test(editor), "el editor muestra la versión");
  var B = JSON.parse(leer("phaser/data/balance.json"));
  var C = B.contacto;
  assert(C && typeof C._nota === "string" && C._nota.length > 60, "balance.contacto existe y explica qué es");
  assert(C && C.mail === "" && C.formulario === "", "y viene VACÍO: el destino lo define la Subsecretaría, no se inventa");
  console.log("[4] versión " + (mV && mV[1]) + " = sw.js · en el precache · en el editor · balance.contacto vacío");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
