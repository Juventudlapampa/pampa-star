/* ============================================================================
   PAMPA STAR · EL TEMA QUE NO ARRANCÓ (25/oct)

   Rodri, en vivo: "ARRANCO EL PARTIDO Y ES SOLO MURMULLO, SIN MÚSICA",
   "CUANDO LE PEGA (O ES QUE ARRANCÓ LA MÚSICA)..." y "SE ACTIVA Y SE
   DESACTIVA LA MÚSICA". Con cuarteto, rock y rap la entrada a la cancha y el
   partido son el MISMO archivo, o sea el mismo elemento <audio>. Si el
   play() de la entrada no arrancaba, el pedido del partido encontraba "el
   mismo tema ya sonando" y se iba sin volver a intentar: la cama de la
   hinchada sola, la música recién en el remate (el tema del jugadón es otro
   archivo) y otra vez nada al volver al partido.

   Corre el reproductor de verdad (phaser/audio/sfx.js) en node con <audio>
   y relojes de mentira, como audio_un_tema.test.js.

   Corré:  node phaser/test/musica_arranca.test.js
   ========================================================================== */
"use strict";
var path = require("path");
var fs = require("fs");

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

/* el navegador de mentira: `modo` decide qué hace el próximo play() */
var creados = [], modo = "anda";
function FakeAudio(src) {
  this.src = src; this.paused = true; this.volume = 1; this.muted = false; this.loop = false; this.ended = false;
  this.currentTime = 0; this.readyState = 0; this.networkState = 0; this.error = null; this.cargas = 0; this.plays = 0; this._l = {};
  creados.push(this);
}
FakeAudio.prototype.play = function () {
  this.plays++;
  if (modo === "frena") { var n = { name: "AbortError" }; return { catch: function (fn) { fn(n); } }; }
  this.paused = false;
  if (modo === "trabado") { this.networkState = 1; this.readyState = 0; }       // dice que suena y no le llega nada
  else if (modo === "bajando") { this.networkState = 2; this.readyState = 0; }  // todavía baja
  else { this.networkState = 1; this.readyState = 4; this.currentTime += 0.5; }
  return { catch: function () { } };
};
FakeAudio.prototype.pause = function () { this.paused = true; };
FakeAudio.prototype.load = function () { this.cargas++; this.currentTime = 0; };
FakeAudio.prototype.addEventListener = function (ev, fn) { this._l[ev] = fn; };
FakeAudio.prototype.removeEventListener = function (ev) { delete this._l[ev]; };
global.Audio = FakeAudio;
global.window = global;
global.localStorage = { getItem: function () { return null; }, setItem: function () { } };

var S = require(path.join(__dirname, "..", "audio", "sfx.js"));
var MUS = require(path.join(__dirname, "..", "logic", "musica.js"));
var A = require(path.join(__dirname, "..", "..", "data", "audio.json"));
var BAL = require(path.join(__dirname, "..", "data", "balance.json"));

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }
function nombre(e) { return String(e.src).split("/").pop().replace(".ogg", ""); }
function suenan() { return creados.filter(function (e) { return !e.paused && !e.muted && e.volume > 0.02; }); }
function oido() { return suenan().map(nombre).sort().join(" + ") || "(nada)"; }
/* el último creado con ese archivo: cada registro de otro estilo arma elementos nuevos */
function elDe(nom) { return creados.filter(function (e) { return nombre(e) === nom; }).pop(); }
function registrar(estilo, cfg) {
  S.musicaTema(null, true); avanzar(400);
  S.registrarArchivos(MUS.mapaCompleto(A, 0, "../assets/musica/", estilo), BAL.musica.vol_archivo, cfg);
}

/* ---------- [1] el pedido del partido rescata la entrada que no arrancó ---------- */
(function () {
  ["cuarteto", "rock", "rap"].forEach(function (estilo) {
    registrar(estilo, { vigia_ms: 0 });
    var mapa = MUS.mapaCompleto(A, 0, "../assets/musica/", estilo);
    assert(mapa.entrada.archivo === mapa.partido.archivo,
      estilo + ": la entrada y el partido son el mismo archivo (es lo que hace caer el bug)");
    modo = "frena";
    S.musicaTema("entrada"); avanzar(1000);
    assert(oido() === "(nada)", estilo + ": la entrada frenada no suena (oye: " + oido() + ")");
    modo = "anda";
    S.musicaTema("partido"); avanzar(400);
    assert(oido() === estilo + "_partido_loop",
      estilo + ": el pedido del partido vuelve a tocar el mismo elemento parado; era el solo murmullo (oye: " + oido() + ")");
    var el = elDe(estilo + "_partido_loop");
    assert(Math.abs(el.volume - BAL.musica.vol_archivo) < 0.01, estilo + ": y sube a su volumen de crucero (" + el.volume + ")");
    var antes = el.plays;
    S.musicaTema("partido"); avanzar(400);
    assert(el.plays === antes, estilo + ": con el tema sonando, pedirlo de nuevo no lo vuelve a tocar");
  });
  /* un cierre de una pasada que ya terminó no se repite por pedirlo otra vez */
  registrar("cuarteto", { vigia_ms: 0 });
  S.musicaTema("gol_festejo", true); avanzar(400);
  var f = elDe("cuarteto_cierre"); f.paused = true; f.ended = true;
  S.musicaTema("gol_festejo"); avanzar(400);
  assert(oido() === "(nada)", "el cierre que terminó no vuelve a sonar al pedirlo (oye: " + oido() + ")");
  f.ended = false;
  console.log("[1] cuarteto, rock y rap: la entrada frenada la rescata el pedido del partido");
})();

/* ---------- [2] el vigía ---------- */
(function () {
  var cfg = { vigia_ms: BAL.musica.vigia_ms, vigia_intentos: BAL.musica.vigia_intentos };
  assert(cfg.vigia_ms > 0 && cfg.vigia_intentos > 0, "balance.musica trae vigia_ms y vigia_intentos");

  /* a) frenado y nadie más lo pide: el vigía lo vuelve a tocar */
  registrar("rock", cfg);
  modo = "frena";
  S.musicaTema("entrada"); avanzar(cfg.vigia_ms - 100);
  assert(oido() === "(nada)", "frenado, antes del vigía no suena (oye: " + oido() + ")");
  modo = "anda";
  avanzar(800);
  assert(oido() === "rock_partido_loop", "el vigía vuelve a tocar el tema frenado (oye: " + oido() + ")");

  /* b) dice que suena, no le llega nada y no está bajando: se lo vuelve a pedir */
  registrar("rap", cfg);
  modo = "trabado";
  S.musicaTema("partido"); avanzar(100);
  var el = elDe("rap_partido_loop");
  assert(el.cargas === 0, "recién pedido no se recarga");
  modo = "anda";
  avanzar(cfg.vigia_ms + 100);
  assert(el.cargas === 1 && el.readyState === 4, "trabado: el vigía lo recarga y lo vuelve a tocar (cargas " + el.cargas + ")");

  /* c) todavía baja (señal floja): no se corta la descarga */
  registrar("cuarteto", cfg);
  modo = "bajando";
  S.musicaTema("partido"); avanzar(cfg.vigia_ms * 3 + 100);
  el = elDe("cuarteto_partido_loop");
  assert(el.cargas === 0, "bajando: el vigía espera y no corta la descarga (cargas " + el.cargas + ")");
  el.networkState = 1; el.readyState = 4; el.currentTime = 3;
  avanzar(cfg.vigia_ms * 3);
  assert(el.cargas === 0 && oido() === "cuarteto_partido_loop", "cuando llegó, suena y el vigía se calla");

  /* d) tope de intentos: no insiste para siempre */
  registrar("rock", cfg);
  modo = "frena";
  S.musicaTema("partido");
  el = elDe("rock_partido_loop");
  avanzar(cfg.vigia_ms * (cfg.vigia_intentos + 4));
  assert(el.plays === 1 + cfg.vigia_intentos, "frenado siempre: " + cfg.vigia_intentos + " intentos y para (plays " + el.plays + ")");

  /* e) lo que se calló no vuelve por el vigía */
  registrar("rap", cfg);
  modo = "frena";
  S.musicaTema("partido"); avanzar(100);
  modo = "anda";
  S.musicaTema(null); avanzar(cfg.vigia_ms * 2);
  assert(oido() === "(nada)", "pedido el silencio, el vigía no resucita el tema (oye: " + oido() + ")");

  /* f) con la música en pausa (pestaña oculta) el vigía no la arranca */
  registrar("cuarteto", cfg);
  modo = "frena";
  S.musicaTema("partido"); avanzar(100);
  modo = "anda";
  S.pausarMusica("oculto"); avanzar(cfg.vigia_ms * 2);
  assert(oido() === "(nada)", "en pausa, el vigía no toca nada (oye: " + oido() + ")");
  S.reanudarMusica("oculto"); avanzar(cfg.vigia_ms + 400);
  assert(oido() === "cuarteto_partido_loop", "al volver, el vigía toca el tema que había quedado frenado (oye: " + oido() + ")");
  console.log("[2] el vigía: rescata lo frenado y lo trabado, espera lo que baja, tiene tope y respeta la pausa y el silencio");
})();

/* ---------- [3] la patada épica: el silbido y la hinchada encima del golpe ---------- */
(function () {
  var E = BAL.patada_epica;
  assert(E && E.silbido_ms > 0 && E.hinchada_ms > 0 && E.musica_corte_ms > 0, "balance.patada_epica trae sus perillas");
  var hechos = [], orig = { kickFuerte: S.kickFuerte, whoosh: S.whoosh, crowd: S.crowd };
  S.kickFuerte = function () { hechos.push(["golpe", T]); };
  S.whoosh = function () { hechos.push(["silbido", T]); };
  S.crowd = function (ms, sube) { hechos.push(["hinchada", T, ms, sube]); };
  var t0 = T;
  S.patadaEpica(E);
  avanzar(E.silbido_ms + 10);
  Object.keys(orig).forEach(function (k) { S[k] = orig[k]; });
  var de = function (k) { return hechos.filter(function (h) { return h[0] === k; })[0]; };
  assert(!de("golpe"), "el golpe fuerte no se duplica: lo da la escena en el contacto, como en todo remate");
  assert(de("silbido") && de("silbido")[1] === t0 + E.silbido_ms, "el silbido de la pelota, " + E.silbido_ms + " ms después");
  assert(de("hinchada") && de("hinchada")[2] === E.hinchada_ms && de("hinchada")[3] === E.hinchada_sube_ms, "la hinchada que se levanta");

  /* quién la pide: el súper tiro, EL TOQUE al ángulo y el tiro de frente bien perfilado */
  var leer = function (f) { return fs.readFileSync(path.join(__dirname, "..", "scenes", f), "utf8"); };
  assert(/if \(especial\) self\.patadaEpica\(\);/.test(leer("toma_remate.js")), "el súper tiro pide la patada épica");
  assert(/if \(zona\.id === "angulo"\) \{ this\.patadaEpica\(\);/.test(leer("toque_ui.js")), "EL TOQUE al ángulo pide la patada épica");
  assert(/q >= this\.BAL\.patada_epica\.frente_q_min\) this\.patadaEpica\(\);/.test(leer("frente_ui.js")), "el tiro de frente bien perfilado pide la patada épica");
  assert(/this\.musicaDuck\(E\.musica_corte_ms\)/.test(fs.readFileSync(path.join(__dirname, "..", "scenes", "match.js"), "utf8")), "y la patada épica corta la música");
  console.log("[3] la patada épica: golpe, silbido, hinchada y corte de música");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
