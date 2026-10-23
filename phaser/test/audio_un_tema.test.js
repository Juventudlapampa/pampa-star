/* ============================================================================
   PAMPA STAR · UN TEMA A LA VEZ (oct 2026, "me descajetaste los audios")

   Rodri jugó y escuchó la música rota. Medido en vivo con un oído de prueba
   que muestrea los <audio> cuadro a cuadro, eran DOS y hasta TRES temas
   sonando juntos:
     · del partido al master: "Under the Floodlights" seguía debajo de la
       espera, y después debajo de la semana
     · de la semana al partido: "Low Light Protocol" seguía en loop, a volumen
       pleno, el partido entero

   La causa: el tema que sale baja en 300 ms y RECIÉN AL FINAL se pausa, y
   cualquier otro pedido mataba TODOS los fundidos, incluido ese. Al cambiar de
   escena pasaba siempre: el shutdown pide silencio y el create() de la escena
   nueva pide su tema en el MISMO cuadro.

   Este test corre el reproductor de verdad (phaser/audio/sfx.js) en node, con
   elementos <audio> y relojes de mentira, y repite las secuencias exactas que
   rompían. No revisa el texto del código: escucha.

   Corré:  node phaser/test/audio_un_tema.test.js
   ========================================================================== */
"use strict";
var path = require("path");

/* ---------- el mundo de mentira: relojes y <audio> ---------- */
var T = 0, timers = [], nid = 1;
global.setTimeout = function (fn, ms) { var id = nid++; timers.push({ id: id, fn: fn, at: T + (ms || 0), rep: 0 }); return id; };
global.setInterval = function (fn, ms) { var id = nid++; timers.push({ id: id, fn: fn, at: T + ms, rep: ms }); return id; };
global.clearTimeout = global.clearInterval = function (id) { timers = timers.filter(function (t) { return t.id !== id; }); };
global.performance = { now: function () { return T; } };
function avanzar(ms) {
  var fin = T + ms;
  for (;;) {
    var prox = null;
    timers.forEach(function (t) { if (t.at <= fin && (!prox || t.at < prox.at)) prox = t; });
    if (!prox) break;
    T = prox.at;
    if (prox.rep) prox.at += prox.rep; else timers = timers.filter(function (t) { return t !== prox; });
    prox.fn();
  }
  T = fin;
}
var creados = [];
function FakeAudio(src) {
  this.src = src; this.paused = true; this.volume = 1; this.muted = false; this.loop = false;
  this.currentTime = 0; this._l = {};
  creados.push(this);
}
FakeAudio.prototype.play = function () { this.paused = false; return { catch: function () { } }; };
FakeAudio.prototype.pause = function () { this.paused = true; };
FakeAudio.prototype.addEventListener = function (ev, fn) { this._l[ev] = fn; };
FakeAudio.prototype.removeEventListener = function (ev) { delete this._l[ev]; };
global.Audio = FakeAudio;
global.window = global;
global.localStorage = { getItem: function () { return null; }, setItem: function () { } };

var S = require(path.join(__dirname, "..", "audio", "sfx.js"));
var MUS = require(path.join(__dirname, "..", "logic", "musica.js"));
var A = require(path.join(__dirname, "..", "..", "data", "audio.json"));

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }
function nombre(e) { return String(e.src).split("/").pop().replace(".ogg", ""); }
/* lo que se OYE: elementos sin pausa, sin mute y con volumen */
function suenan() { return creados.filter(function (e) { return !e.paused && !e.muted && e.volume > 0.02; }); }
function oido() { return suenan().map(nombre).sort().join(" + ") || "(nada)"; }

S.registrarArchivos(MUS.mapaCompleto(A, 0, "../assets/musica/"), 0.42);
var VOL = 0.42;

/* ---------- [1] EL CAMBIO DE ESCENA: silencio y tema nuevo en el mismo cuadro ---------- */
(function () {
  S.musicaTema("espera"); avanzar(1000);
  assert(oido() === "The_Longest_Minute_loop", "arranca la espera sola (oye: " + oido() + ")");
  /* el shutdown pide silencio y el create() de la escena nueva pide su tema, mismo cuadro */
  S.musicaTema(null); S.musicaTema("entrada");
  avanzar(400);
  assert(oido() === "Under_the_Floodlights",
    "después del cambio de escena tiene que sonar SOLO la entrada; era el bug de los dos temas (oye: " + oido() + ")");
  avanzar(20000);
  assert(suenan().length === 1, "y veinte segundos después sigue habiendo uno solo (oye: " + oido() + ")");
  console.log("[1] cambio de escena (silencio + tema en el mismo cuadro): " + oido());
})();

/* ---------- [2] EL GANCHO DOBLE: dos silencios seguidos y el tema nuevo ---------- */
(function () {
  S.musicaTema("semana"); avanzar(1000);
  /* con el gancho repetido, el shutdown pedía silencio DOS veces */
  S.musicaTema(null); S.musicaTema(null); avanzar(50); S.musicaTema("partido");
  avanzar(600);
  assert(oido() === "The_Winning_Strike_loop",
    "dos silencios seguidos no pueden dejar la semana colgada (oye: " + oido() + ")");
  console.log("[2] gancho doble de shutdown: " + oido());
})();

/* ---------- [3] EL BAJÓN EN MEDIO DE UN CAMBIO DE TEMA ---------- */
(function () {
  S.musicaTema("partido"); avanzar(1000);
  S.musicaTema("partido_final");            // entra el tramo final…
  avanzar(100);
  S.musicaDuck(800);                         // …y a los 100 ms una escena pide silencio
  avanzar(3000);
  assert(oido() === "Last_Ten_Seconds_loop",
    "un duck en medio del fundido no puede dejar el tema anterior sonando (oye: " + oido() + ")");
  console.log("[3] duck durante un cruce de temas: " + oido());
})();

/* ---------- [4] LOS BAJONES NO SE PISAN ---------- */
(function () {
  S.musicaTema("partido"); avanzar(2000);
  var el = suenan()[0];
  S.musicaDuck(800);                         // el silencio antes del desenlace
  avanzar(300);
  S.musicaDuck(1500);                        // y el del gol, enseguida
  /* el primero, solo, subía a los 600 ms: en el medio del silencio del segundo */
  avanzar(700);
  assert(el.volume <= VOL * 0.6 + 0.01,
    "a los 1000 ms el segundo bajón todavía manda: la música tiene que seguir baja (está en " + el.volume.toFixed(2) + ")");
  avanzar(1500);
  assert(Math.abs(el.volume - VOL) < 0.01, "y cuando termina la ventana vuelve a su volumen (está en " + el.volume.toFixed(2) + ")");
  console.log("[4] dos bajones seguidos: la música queda baja hasta el final del último y vuelve a " + el.volume.toFixed(2));
})();

/* ---------- [5] EL MUTE ES DE TODOS LOS TEMAS ---------- */
(function () {
  S.musicaTema("partido"); avanzar(1000);
  S.setMuted(true);
  S.musicaTema("partido_final"); avanzar(1000);
  assert(suenan().length === 0, "en mute no se oye nada, ni el tema que entra después (oye: " + oido() + ")");
  S.setMuted(false); avanzar(100);
  assert(oido() === "Last_Ten_Seconds_loop",
    "y al sacar el mute se oye el tema que está puesto; antes quedaba en volumen 0 (oye: " + oido() + ")");
  var pf = suenan()[0];
  assert(pf && Math.abs(pf.volume - VOL) < 0.01, "a su volumen de crucero");
  /* el elemento que sonaba cuando se puso el mute no puede quedar muteado para siempre */
  S.musicaTema("partido"); avanzar(1000);
  assert(oido() === "The_Winning_Strike_loop", "el tema de antes del mute vuelve a oírse (oye: " + oido() + ")");
  console.log("[5] mute y unmute: " + oido());
})();

/* ---------- [6] VOLVER A REGISTRAR NO DUPLICA NI CORTA ---------- */
(function () {
  S.musicaTema("partido"); avanzar(1000);
  var antes = creados.length;
  /* cambia la fecha: se vuelve a registrar el mapa entero */
  S.registrarArchivos(MUS.mapaCompleto(A, 1, "../assets/musica/"), 0.42);
  avanzar(100);
  var nuevos = creados.length - antes;
  assert(nuevos <= 2, "registrar de nuevo reusa los elementos de los archivos que siguen (creó " + nuevos + ")");
  S.musicaTema("partido"); avanzar(600);   // con fecha impar, partido = el alternativo
  assert(suenan().length === 1, "y sigue habiendo un solo tema (oye: " + oido() + ")");
  console.log("[6] re-registro por cambio de fecha: " + nuevos + " elementos nuevos · oye " + oido());
})();

/* ---------- [7] LA SALIDA SECA TAMBIÉN DEJA UNO SOLO ---------- */
(function () {
  S.musicaTema("opening"); avanzar(500);
  S.musicaTema(null, true); S.musicaTema("opening", true);   // el plano 6 de la intro
  avanzar(50);
  assert(oido() === "Victory_Lap_At_Dawn", "silencio seco + el mismo tema seco: suena uno (oye: " + oido() + ")");
  S.musicaTema(null); avanzar(400);
  assert(suenan().length === 0, "y el silencio es silencio (oye: " + oido() + ")");
  console.log("[7] salidas secas: ok");
})();

/* ---------- [8] LA MEZCLA: cada perilla mueve un efecto que existe ---------- */
(function () {
  var BAL = require(path.join(__dirname, "..", "data", "balance.json"));
  var MZ = BAL.audio_mezcla || {};
  var claves = Object.keys(MZ).filter(function (k) { return k.charAt(0) !== "_"; });
  assert(claves.length >= 10, "balance.audio_mezcla tiene que tener las perillas de los efectos (hay " + claves.length + ")");
  /* una perilla mal escrita no tira error: simplemente no mueve nada. Por eso
     se cruza contra los efectos que el reproductor exporta de verdad. */
  var huerfanas = claves.filter(function (k) { return k !== "bus" && typeof S[k] !== "function"; });
  assert(huerfanas.length === 0, "estas perillas de mezcla no corresponden a ningún efecto: " + huerfanas.join(", "));
  /* los golpes tienen que quedar arriba de la música y todo lo demás por
     debajo. Hasta el 17/oct a la mañana eso era "ganancia mayor que 1" sobre
     la síntesis, y antes también para afuera, silbato, hinchada y whoosh.
     Pedido de Rodri del 17/oct: los efectos son muestras grabadas, todas con
     el pico en -3 dBFS, y con el mismo pico un golpe es corto y mide menos
     que un silbato o una hinchada sostenidos (14 y 7 dB menos). Para quedar
     arriba de la música, cada golpe necesita más ganancia que cualquier otro
     efecto con muestra. Los niveles medidos, en docs/TANDA_1_0.md. */
  var GOLPES = ["kick", "kickFuerte", "net", "gloves", "palo"];
  var RESTO = ["whistle", "afuera", "festejo", "crowd", "cama", "whoosh", "ui"];
  GOLPES.concat(RESTO).forEach(function (k) {
    assert(typeof MZ[k] === "number", "'" + k + "' tiene muestra y le falta su perilla en balance.audio_mezcla");
  });
  var masBajoGolpe = Math.min.apply(null, GOLPES.map(function (k) { return MZ[k]; }));
  var masAltoResto = Math.max.apply(null, RESTO.map(function (k) { return MZ[k]; }));
  assert(masBajoGolpe > masAltoResto, "un golpe quedó con menos ganancia que un efecto que va debajo de la música (golpe más bajo " +
    masBajoGolpe + ", resto más alto " + masAltoResto + ")");
  /* y lo chillón no vuelve: ni onda cuadrada ni diente de sierra (el timbre
     de 8 bits, que no es el de la música), y el bus pasa por un pasabajos */
  var FX = require("fs").readFileSync(path.join(__dirname, "..", "audio", "sfx.js"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  assert(!/"square"|"sawtooth"/.test(FX), "un efecto volvió a la onda cuadrada o al diente de sierra (lo chillón del 17/oct)");
  assert(/master\.connect\(pb\)/.test(FX) && /type = "lowpass"; pb\.frequency\.value = PASABAJOS_HZ/.test(FX), "el bus de efectos tiene que pasar por el pasabajos");
  assert(typeof S.configurarMezcla === "function", "el reproductor tiene que aceptar la mezcla de balance");
  console.log("[8] mezcla: " + claves.length + " perillas, todas sobre efectos que existen");
})();

/* ---------- [9] CON UN ESTILO ELEGIDO: un tema a la vez y siempre del estilo ---------- */
(function () {
  /* 22/oct: cuarteto, rock y rap traen opening, tramo final, cierre y
     derrota. Se recorre una carrera de punta a punta con el reproductor de
     verdad: en cada momento suena UNO y es el del estilo */
  var folklore = Object.keys(A.temas).filter(function (k) { return A.temas[k] && A.temas[k].archivo; })
    .map(function (k) { return A.temas[k].archivo.replace(".ogg", ""); });
  var recorrido = [
    ["opening", "opening"], [null, null], ["espera", "espera"], ["semana", "semana"], [null, null],
    ["entrada", "partido"], ["partido", "partido"], ["partido_final", "partido_final"], ["definicion", "partido_final"],
    ["jugadon", "partido_final"], ["gol_festejo", "gol_festejo"], [null, null], ["entrada", "partido"],
    ["partido_final", "partido_final"], ["derrota", "derrota"], [null, null], ["hype", "hype_carrera"]
  ];
  var vistos = [];
  ["cuarteto", "rock", "rap"].forEach(function (k) {
    var E = A.estilos[k];
    S.musicaTema(null); avanzar(400);
    S.registrarArchivos(MUS.mapaCompleto(A, 0, "../assets/musica/", k), VOL);
    recorrido.forEach(function (paso) {
      S.musicaTema(paso[0]); avanzar(400);
      var esperado = paso[1] ? E[paso[1]].archivo.replace(".ogg", "") : "(nada)";
      assert(oido() === esperado, k + ", " + (paso[0] || "silencio") + ": suena " + esperado + " y nada más (oye: " + oido() + ")");
      assert(suenan().every(function (e) { return folklore.indexOf(nombre(e)) < 0; }), k + ", " + paso[0] + ": no se cuela un tema de folklore (oye: " + oido() + ")");
      if (paso[0] && vistos.indexOf(oido()) < 0) vistos.push(oido());
    });
  });
  assert(vistos.length === 18, "las tres carreras pasaron por los 6 temas de cada estilo (" + vistos.length + ")");
  console.log("[9] cuarteto, rock y rap: " + recorrido.length + " pasos cada uno, un tema a la vez y del estilo (" + vistos.length + " temas)");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
