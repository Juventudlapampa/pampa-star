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

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
