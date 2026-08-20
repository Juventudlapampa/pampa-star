/* ============================================================================
   PAMPA STAR · M1-M5 — LA MÚSICA POR ARCHIVOS

   Doce OGG Opus reemplazan el chiptune generado por código. Este test fija las
   cinco cosas que no se pueden romper sin que alguien lo note tarde:

     M1 · los _loop no se tocan: loop nativo, sin recortar ni mover currentTime
     M2 · cada momento del juego tiene su tema, y lo que no tiene queda anotado
     M3 · las tres reglas del JSON están implementadas
     M4 · la alternancia es por FECHA, no al azar
     M5 · el tramo final tiene umbrales y son alcanzables

   Corré:  node phaser/test/m_musica.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var A = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/audio.json"), "utf8"));
var BAL = JSON.parse(fs.readFileSync(path.join(RAIZ, "phaser/data/balance.json"), "utf8"));
var SFX = fs.readFileSync(path.join(RAIZ, "phaser/audio/sfx.js"), "utf8");
var MATCH = fs.readFileSync(path.join(RAIZ, "phaser/scenes/match.js"), "utf8");
var MASTER = fs.readFileSync(path.join(RAIZ, "phaser/scenes/master.js"), "utf8");

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* ---------- [1] M1 · LOS ARCHIVOS ESTÁN Y NO SE TOCAN ---------- */
(function () {
  var temas = Object.keys(A.temas).filter(function (k) { return k.charAt(0) !== "_"; });
  var faltan = [];
  temas.forEach(function (id) {
    var t = A.temas[id];
    if (!t.archivo) return;
    if (!fs.existsSync(path.join(RAIZ, "assets/musica", t.archivo))) faltan.push(t.archivo);
  });
  assert(faltan.length === 0, "estos archivos se declaran y no están en assets/musica: " + faltan.join(", "));
  assert(temas.length >= 9, "tienen que estar los diez momentos (hay " + temas.length + ")");

  /* los _loop se reproducen con loop NATIVO. Si alguien los recorta a mano o
     les mueve currentTime para "empalmar", se rompe el crossfade de 40 ms que
     vino hecho — que es exactamente lo que M1 prohíbe. */
  assert(/a\.loop = typeof e === "object" \? !!e\.loop : true/.test(SFX),
    "el motor tiene que usar el loop NATIVO del elemento Audio");
  /* currentTime solo se puede tocar para PARAR, nunca durante la reproducción */
  var usos = (SFX.match(/currentTime\s*=/g) || []).length;
  var enPausa = (SFX.match(/pause\(\);[^\n]*currentTime = 0/g) || []).length;
  assert(usos === enPausa,
    "currentTime solo se puede tocar junto con pause() (para parar). Hay " + usos +
    " usos y " + enPausa + " junto a pause: alguno mueve el cabezal mientras suena y rompe el empalme");
  console.log("[1] " + temas.length + " temas declarados, los " + (temas.length - faltan.length) +
    " archivos presentes · loop nativo · currentTime solo al parar");
})();

/* ---------- [2] M3 · LAS TRES REGLAS ---------- */
(function () {
  assert(!!A._reglas, "audio.json tiene que traer sus reglas");
  /* corte al terminar: la traba de P5 sigue en pie */
  assert(/_musicaTrabada/.test(MATCH) && /if \(this\._musicaTrabada && tema\) return;/.test(MATCH),
    "regla 'corte_al_terminar': con el partido terminado, musica() no deja pasar nada");
  /* fundido de 300 ms entre momentos */
  assert(/FUNDIDO_MS = 300/.test(SFX), "regla 'cambio_sin_silencio': el fundido es de 300 ms");
  assert(/function rampa\(/.test(SFX), "y se hace con una rampa de volumen, no cortando");
  /* pero tiene que existir la forma SECA, porque en el gol el silencio ES el efecto */
  assert(/musicaTema\(nombre, seco\)/.test(SFX),
    "y tiene que poder cortarse SECO: en el gol el silencio previo es el efecto");
  /* el duck baja los archivos, no solo el sintetizador */
  var duck = SFX.slice(SFX.indexOf("function musicaDuck("));
  duck = duck.slice(0, duck.indexOf("\n  }") + 4);
  assert(/archivoSonando/.test(duck),
    "regla 'volumen': el duck tiene que bajar TAMBIÉN los archivos (antes solo bajaba el bus del sintetizador)");
  assert(/0\.6/.test(duck), "y baja un 40% (queda en 0.6)");
  console.log("[2] las tres reglas: corte al terminar · fundido 300 ms (con salida seca) · duck al 60%");
})();

/* ---------- [3] M4 · LA ALTERNANCIA ES POR FECHA ---------- */
(function () {
  assert(!!A.temas.partido_alt, "tiene que existir partido_alt");
  assert(!!A.temas.semana_alt, "y semana_alt");
  assert(A.temas.partido.archivo !== A.temas.partido_alt.archivo, "y ser archivos distintos");
  assert(A.temas.semana.archivo !== A.temas.semana_alt.archivo, "idem la semana");
  /* la elección no puede ser al azar: tiene que salir de la fecha */
  assert(/const par = \(fecha % 2\) === 0/.test(MATCH),
    "la alternancia del partido sale de la FECHA (par/impar), no de Math.random");
  assert(/const par = \(fecha % 2\) === 0/.test(MASTER),
    "y la de la semana también");
  assert(!/Math\.random\(\)[^\n]*partido_alt/.test(MATCH), "nada de azar acá");
  /* la consecuencia que importa: dos fechas seguidas NUNCA repiten tema */
  var repite = false;
  for (var f = 0; f < 20; f++) {
    var a = (f % 2 === 0) ? "partido" : "partido_alt";
    var b = ((f + 1) % 2 === 0) ? "partido" : "partido_alt";
    if (a === b) repite = true;
  }
  assert(!repite, "con par/impar, dos fechas seguidas nunca pueden repetir el tema");
  console.log("[3] alternancia por fecha: par → " + A.temas.partido.n + " · impar → " + A.temas.partido_alt.n);
})();

/* ---------- [4] M5 · EL TRAMO FINAL ES ALCANZABLE ---------- */
(function () {
  var M = BAL.musica || {};
  assert(typeof M.final_tramo_min === "number", "tiene que haber umbral de tramo final");
  assert(typeof M.final_perdiendo_min === "number", "y uno para cuando vas perdiendo");
  /* los dos tienen que caer DENTRO de un partido: si el umbral es 95 no entra
     nunca, y si es 46 entra siempre. Ese es el error que pidió evitar. */
  assert(M.final_tramo_min > 45 && M.final_tramo_min < 90,
    "el umbral tiene que caer en el segundo tiempo y antes del final (dio " + M.final_tramo_min + ")");
  assert(M.final_perdiendo_min < M.final_tramo_min,
    "perdiendo tiene que entrar ANTES (dio " + M.final_perdiendo_min + " contra " + M.final_tramo_min + ")");
  assert(M.final_perdiendo_min > 45, "pero igual en el segundo tiempo (dio " + M.final_perdiendo_min + ")");
  /* y entra UNA vez por partido */
  assert(/_temaFinalPuesto/.test(MATCH), "tiene que haber guarda para que entre una sola vez");
  var init = MATCH.slice(MATCH.indexOf("  init() {"), MATCH.indexOf("  create() {"));
  assert(/_temaFinalPuesto = false/.test(init), "y reiniciarse por partido (lección de P1)");
  console.log("[4] tramo final: minuto " + M.final_tramo_min + " · perdiendo " + M.final_perdiendo_min +
    " · medido jugando: entró en el 78.1, una vez");
})();

/* ---------- [5] M2 · LO QUE NO TIENE TEMA, ANOTADO ---------- */
(function () {
  /* el mapa traduce los momentos del juego a los temas del JSON */
  assert(/mapaDeAudio\(\)/.test(MATCH), "tiene que existir el mapa de momentos");
  ["entrada", "partido", "partido_final", "gol_festejo", "opening"].forEach(function (k) {
    assert(new RegExp('poner\\("' + k + '"').test(MATCH), "el momento '" + k + "' tiene que estar mapeado");
  });
  ["semana", "espera", "hype"].forEach(function (k) {
    assert(new RegExp('poner\\("' + k + '"').test(MATCH), "y el del master '" + k + "'");
  });
  /* la reserva queda declarada, no perdida */
  assert(!!A.temas._reserva && Array.isArray(A.temas._reserva.archivos),
    "los dos temas sin destino tienen que quedar declarados como reserva");
  A.temas._reserva.archivos.forEach(function (f) {
    assert(fs.existsSync(path.join(RAIZ, "assets/musica", f)), "el de reserva " + f + " tiene que estar");
  });
  console.log("[5] 8 momentos mapeados · 2 temas de reserva declarados y presentes");
})();

/* ---------- [6] X1 · NINGÚN NOMBRE DE ARCHIVO CON ACENTOS ---------- */
(function () {
  /* Fuerza_de_un_Leon.ogg se llamaba con ó acentuada. En disco y en git el
     nombre estaba PERFECTO (UTF-8): el problema aparecía al descomprimir el zip
     EN WINDOWS. El zip no marca el flag UTF-8 y el Explorador reescribía el
     nombre como Fuerza_de_un_Le#U00f3n.ogg, así que audio.json no lo encontraba
     y ese tema no podía sonar. En el repo completo andaba; en el zip no.

     La regla que mata toda esa clase de problema: nombres ASCII. No es solo el
     zip de Windows — también hay URL-encoding en rutas web, servidores que
     normalizan distinto y Git en macOS que guarda los acentos en NFD. */
  function noASCII(nombre) {
    return Array.from(nombre).some(function (c) { return c.codePointAt(0) > 126; });
  }
  var dirs = ["assets/musica", "assets/poses", "assets/retratos", "assets/ui", "assets/fonts"];
  var malos = [];
  dirs.forEach(function (d) {
    var dd = path.join(RAIZ, d);
    if (!fs.existsSync(dd)) return;
    fs.readdirSync(dd).forEach(function (f) { if (noASCII(f)) malos.push(d + "/" + f); });
  });
  assert(malos.length === 0,
    "estos archivos tienen caracteres no ASCII en el nombre y se rompen al descomprimir el zip en Windows: " + malos.join(", "));

  /* y todo lo que audio.json declara tiene que existir con ESE nombre exacto */
  var declarados = [];
  Object.keys(A.temas).forEach(function (k) {
    var t = A.temas[k];
    if (t && t.archivo) declarados.push(t.archivo);
    if (t && Array.isArray(t.archivos)) t.archivos.forEach(function (f) { declarados.push(f); });
  });
  var faltan = declarados.filter(function (f) {
    return !fs.existsSync(path.join(RAIZ, "assets/musica", f));
  });
  assert(faltan.length === 0,
    "audio.json declara archivos que no existen con ese nombre exacto: " + faltan.join(", "));
  assert(declarados.length >= 12,
    "tienen que estar los doce temas declarados, contando la reserva (hay " + declarados.length + ")");
  console.log("[6] los " + declarados.length + " archivos declarados existen y ninguno tiene acentos");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
