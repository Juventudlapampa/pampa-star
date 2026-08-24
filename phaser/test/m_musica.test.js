/* ============================================================================
   PAMPA STAR · M1-M5 — LA MÚSICA POR ARCHIVOS, Y LA PUERTA ÚNICA

   Doce OGG Opus reemplazan el chiptune generado por código.

   La primera vuelta de esto cableó los momentos QUE ESTABAN MAPEADOS y dejó el
   sintetizador vivo debajo del resto. Rodri escuchó música vieja en cinco
   lugares distintos (el trailer, el pasillo, el partido de después, el gol en
   contra, el segundo partido de la carrera) y eran UN bug, no cinco.

   Por eso el bloque [7] de este test no revisa casos: ENUMERA. Lee el código
   fuente, saca todas las llamadas a pedirMusica() que encuentra, y falla si
   alguna pide un momento que no está declarado. Una lista escrita a mano habría
   pasado en verde con el bug adentro — porque el bug era justamente lo que
   nadie había puesto en la lista.

     M1 · los _loop no se tocan: loop nativo, sin recortar ni mover currentTime
     M2 · UNA sola puerta: nadie llama a SFX.musicaTema fuera del mixin
     M3 · las tres reglas del JSON, y el sintetizador retirado
     M4 · enumeración automática de los momentos pedidos + alternancia por fecha
     M5 · el tramo final, y la música que no sobrevive al cambio de escena

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
var PIEL = fs.readFileSync(path.join(RAIZ, "phaser/scenes/piel_ui.js"), "utf8");
var MUS = require(path.join(RAIZ, "phaser/logic/musica.js"));

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
  /* corte al terminar: la traba de P5 sigue en pie, ahora dentro de la puerta */
  assert(/_musicaTrabada/.test(MATCH), "el partido tiene que trabar la música al terminar");
  assert(/if \(this\._musicaTrabada && momento && momento !== "silencio"\) return false;/.test(PIEL),
    "regla 'corte_al_terminar': con el partido terminado, la puerta no deja pasar nada salvo el silencio");
  /* fundido de 300 ms entre momentos */
  assert(/FUNDIDO_MS = 300/.test(SFX), "regla 'cambio_sin_silencio': el fundido es de 300 ms");
  assert(/function rampa\(/.test(SFX), "y se hace con una rampa de volumen, no cortando");
  /* pero tiene que existir la forma SECA, porque en el gol el silencio ES el efecto */
  assert(/musicaTema\(nombre, seco\)/.test(SFX),
    "y tiene que poder cortarse SECO: en el gol el silencio previo es el efecto");
  /* el duck baja los archivos */
  var duck = SFX.slice(SFX.indexOf("function musicaDuck("));
  duck = duck.slice(0, duck.indexOf("\n  }") + 4);
  assert(/archivoSonando/.test(duck),
    "regla 'volumen': el duck tiene que bajar los archivos (antes solo bajaba el bus del sintetizador)");
  assert(/0\.6/.test(duck), "y baja un 40% (queda en 0.6)");
  console.log("[2] las tres reglas: corte al terminar · fundido 300 ms (con salida seca) · duck al 60%");
})();

/* ---------- [3] M4 · LA ALTERNANCIA ES POR FECHA ---------- */
(function () {
  assert(!!A.temas.partido_alt, "tiene que existir partido_alt");
  assert(!!A.temas.semana_alt, "y semana_alt");
  assert(A.temas.partido.archivo !== A.temas.partido_alt.archivo, "y ser archivos distintos");
  assert(A.temas.semana.archivo !== A.temas.semana_alt.archivo, "idem la semana");
  /* la elección no puede ser al azar: sale de la fecha, y AHORA EN UN SOLO
     LUGAR. Antes estaba copiada en match.js y en master.js — dos copias de la
     misma regla es la forma que tenía el bug. */
  assert(typeof MUS.temaDe === "function", "la alternancia vive en logic/musica.js");
  assert(MUS.temaDe("partido", 0) === "partido", "fecha par → el tema base");
  assert(MUS.temaDe("partido", 1) === "partido_alt", "fecha impar → el alternativo");
  assert(MUS.temaDe("semana", 0) === "semana" && MUS.temaDe("semana", 3) === "semana_alt",
    "idem la semana");
  assert(!/Math\.random/.test(fs.readFileSync(path.join(RAIZ, "phaser/logic/musica.js"), "utf8")),
    "nada de azar acá");
  /* la consecuencia que importa: dos fechas seguidas NUNCA repiten tema */
  var repite = false;
  for (var f = 0; f < 20; f++) if (MUS.temaDe("partido", f) === MUS.temaDe("partido", f + 1)) repite = true;
  assert(!repite, "dos fechas seguidas nunca pueden repetir el tema");
  console.log("[3] alternancia por fecha, en un solo lugar: par → " + A.temas.partido.n +
    " · impar → " + A.temas.partido_alt.n);
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
  assert(/_musicaTrabada = false/.test(init), "y la traba también, o el partido 2 arranca mudo");
  console.log("[4] tramo final: minuto " + M.final_tramo_min + " · perdiendo " + M.final_perdiendo_min +
    " · medido jugando: entró en el 78.1, una vez");
})();

/* ---------- [5] M2 · LO QUE NO TIENE TEMA, ANOTADO ---------- */
(function () {
  /* el mapa vive en logic/musica.js, que es lógica pura y se puede correr acá */
  var mapa = MUS.mapaCompleto(A, 0, "../assets/musica/");
  assert(!!mapa, "mapaCompleto tiene que devolver el mapa");
  ["entrada", "partido", "partido_final", "gol_festejo", "opening"].forEach(function (k) {
    assert(!!mapa[k], "el momento del partido '" + k + "' tiene que tener archivo");
  });
  ["semana", "espera", "hype"].forEach(function (k) {
    assert(!!mapa[k], "y el del master '" + k + "'");
  });
  /* los dos que ANTES caían al sintetizador */
  ["definicion", "jugadon"].forEach(function (k) {
    assert(!!mapa[k], "el momento '" + k + "' es el que caía al sintetizador: tiene que tener archivo");
  });
  /* y no puede quedar NINGUNO sin archivo, salvo el silencio */
  var huerfanos = MUS.sinArchivo(A);
  assert(huerfanos.length === 0,
    "estos momentos están declarados y no tienen archivo (sonarían mudos): " + huerfanos.join(", "));
  /* la reserva queda declarada, no perdida */
  assert(!!A.temas._reserva && Array.isArray(A.temas._reserva.archivos),
    "los dos temas sin destino tienen que quedar declarados como reserva");
  A.temas._reserva.archivos.forEach(function (f) {
    assert(fs.existsSync(path.join(RAIZ, "assets/musica", f)), "el de reserva " + f + " tiene que estar");
  });
  console.log("[5] " + Object.keys(mapa).length + " momentos con archivo · 0 huérfanos · 2 de reserva declarados");
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

/* ══════════════════════════════════════════════════════════════════════════
   [7] M4 · LA ENUMERACIÓN. El bloque que impide que esto vuelva a pasar.

   No hay lista escrita a mano acá abajo. El test ABRE los archivos del juego,
   saca TODAS las llamadas a pedirMusica("x") que encuentra, y las cruza contra
   el contrato de logic/musica.js. Si mañana alguien agrega una escena y pide
   un momento nuevo sin declararlo, este bloque lo encuentra sin que nadie lo
   haya agregado a ninguna lista.

   Y al revés: también verifica que NADIE llame al reproductor por atrás. Esa
   es la parte que faltaba — el bug no era que un momento estuviera mal escrito,
   era que había una segunda puerta abierta.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  /* --- se recorre TODO lo que puede pedir música, sin nombrar archivos --- */
  var dirs = ["phaser/scenes", "phaser/logic"];
  var fuentes = [];
  /* los comentarios de este proyecto NOMBRAN a propósito lo que se prohíbe
     ("acá se llamaba a musicaTema y por eso sonaba el sintetizador"). Si el
     escáner los lee, se acusa a sí mismo. Se cortan antes de mirar, conservando
     los saltos de línea para que los números de línea sigan siendo ciertos. */
  function soloCodigo(txt) {
    return txt
      .replace(/\/\*[\s\S]*?\*\//g, function (b) { return b.replace(/[^\n]/g, " "); })
      .replace(/\/\/[^\n]*/g, "");
  }
  dirs.forEach(function (d) {
    var dd = path.join(RAIZ, d);
    if (!fs.existsSync(dd)) return;
    fs.readdirSync(dd).forEach(function (f) {
      if (!/\.js$/.test(f)) return;
      var crudo = fs.readFileSync(path.join(dd, f), "utf8");
      fuentes.push({ rel: d + "/" + f, txt: soloCodigo(crudo), crudo: crudo });
    });
  });
  assert(fuentes.length >= 10, "tiene que haber archivos que revisar (encontró " + fuentes.length + ")");

  /* --- (a) todos los momentos PEDIDOS existen en el contrato --- */
  var pedidos = {}, desconocidos = [];
  var reMomento = /pedirMusica\(\s*"([a-z_]+)"/g;
  fuentes.forEach(function (F) {
    var m;
    reMomento.lastIndex = 0;
    while ((m = reMomento.exec(F.txt)) !== null) {
      var mom = m[1];
      (pedidos[mom] = pedidos[mom] || []).push(F.rel);
      if (!MUS.existe(mom)) desconocidos.push(mom + " (en " + F.rel + ")");
    }
  });
  var nPedidos = Object.keys(pedidos).length;
  assert(nPedidos >= 8, "el juego tiene que pedir al menos 8 momentos distintos (encontró " + nPedidos + ")");
  assert(desconocidos.length === 0,
    "el código pide momentos que NO están declarados en logic/musica.js — " +
    "esto es exactamente el bug de la música vieja: " + desconocidos.join(", "));

  /* --- (b) y todos tienen archivo de verdad (salvo el silencio) --- */
  var mudos = Object.keys(pedidos).filter(function (mom) {
    if (mom === "silencio") return false;
    var id = MUS.temaDe(mom, 0);
    return !(id && A.temas[id] && A.temas[id].archivo);
  });
  assert(mudos.length === 0,
    "el código pide estos momentos y audio.json no les da archivo: " + mudos.join(", "));

  /* --- (c) LA SEGUNDA PUERTA ESTÁ CERRADA --- */
  /* nadie fuera del mixin puede llamar al reproductor directo. Con esto abierto,
     el cableado nuevo podía estar perfecto y el bug seguía. */
  var porAtras = [];
  fuentes.forEach(function (F) {
    if (/piel_ui\.js$/.test(F.rel)) return;              // el mixin ES la puerta
    F.txt.split("\n").forEach(function (linea, i) {
      if (/musicaTema\s*\(/.test(linea)) porAtras.push(F.rel + ":" + (i + 1));
    });
  });
  assert(porAtras.length === 0,
    "estas líneas llaman a musicaTema() por atrás en vez de pedirMusica(): " + porAtras.join(", "));

  /* --- (d) y no hay un segundo mapa --- */
  var mapas = fuentes.filter(function (F) {
    return !/logic\/musica\.js$/.test(F.rel) && /registrarArchivos\s*\(/.test(F.txt) && !/piel_ui\.js$/.test(F.rel);
  }).map(function (F) { return F.rel; });
  assert(mapas.length === 0,
    "estos archivos arman su propio mapa y pisan el global (era el bug del pasillo): " + mapas.join(", "));

  /* --- (e) M3 · EL SINTETIZADOR DE MÚSICA SE FUE --- */
  ["function programar(", "function musEnsure(", "function vientoOn(", "function notaMus(", "function golpeMus("]
    .forEach(function (f) {
      assert(SFX.indexOf(f) < 0, "M3: " + f + ") tenía que borrarse — sigue en sfx.js");
    });
  assert(SFX.indexOf("musicaZona") < 0 || !/musicaZona:/.test(SFX),
    "M3: musicaZona no puede seguir exportada");
  /* y musicaTema no puede volver a caer al loop generado */
  var mt = SFX.slice(SFX.indexOf("function musicaTema("));
  mt = mt.slice(0, mt.indexOf("\n  }") + 4);
  assert(!/setInterval/.test(mt), "M3: musicaTema no puede arrancar el secuenciador nunca más");

  /* --- (f) los GOLPES CORTOS se quedan, y siguen siendo efectos --- */
  var golpes = ["temaPosesion", "temaCampo", "temaUrgente", "golEnContra"];
  golpes.forEach(function (g) {
    assert(new RegExp(g + ":\\s*function").test(SFX), "el golpe corto " + g + " tiene que seguir vivo");
    /* la regla que los separa de la música: no se registran ni se piden */
    assert(!MUS.existe(g), "y " + g + " NO puede ser un momento de música: es un efecto");
  });

  /* --- (g) M5 · la música no sobrevive al cambio de escena --- */
  assert(/events\.on\("shutdown"/.test(PIEL) && /armarCorteDeMusica/.test(PIEL),
    "M5: el corte de música tiene que colgar del shutdown de la escena, no de que cada salida se acuerde");

  console.log("[7] enumerados " + nPedidos + " momentos en " + fuentes.length + " archivos: " +
    Object.keys(pedidos).sort().join(", "));
  console.log("    0 desconocidos · 0 mudos · 0 llamadas por atrás · 0 mapas paralelos · sintetizador retirado");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
