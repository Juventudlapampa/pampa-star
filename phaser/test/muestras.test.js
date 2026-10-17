/* ============================================================================
   PAMPA STAR · LAS MUESTRAS (17/oct, pedido de Rodri: el sonido seguía
   sonando a sintetizador)

   Los golpes, el silbato, la hinchada, el whoosh y la interfaz son
   grabaciones en assets/sonidos/ (audio/sfx.js, LAS MUESTRAS). Este test fija
   tres cosas:
     [1] cada muestra declarada tiene su archivo, y cada archivo de la carpeta
         está declarado
     [2] cada efecto con muestra la nombra, la muestra está declarada, y el
         efecto no tiene síntesis de reserva (ni tone ni noise)
     [3] el reproductor de verdad, en node con un contexto de audio de
         mentira: sin muestra cargada no suena nada; cargada, suena por el bus
         con la ganancia de la mezcla; el mute, la cama y la interfaz derivada

   Corré:  node phaser/test/muestras.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* ---------- el mundo de mentira ---------- */
global.window = global;
global.localStorage = { getItem: function () { return null; }, setItem: function () { } };
var ctxs = [];
function Param(v) {
  return { value: v, setValueAtTime: function (x) { this.value = x; }, linearRampToValueAtTime: function (x) { this.value = x; },
    exponentialRampToValueAtTime: function (x) { this.value = x; }, cancelScheduledValues: function () { } };
}
function Nodo(tipo, c) { this.tipo = tipo; this.salidas = []; c.nodos.push(this); }
Nodo.prototype.connect = function (n) { this.salidas.push(n); return n; };
function FakeCtx() {
  this.nodos = []; this.decodificadas = []; this.state = "suspended"; this.currentTime = 0; this.sampleRate = 48000;
  this.destination = new Nodo("destino", this);
  ctxs.push(this);
}
FakeCtx.prototype.createGain = function () { var n = new Nodo("gain", this); n.gain = Param(1); return n; };
FakeCtx.prototype.createBiquadFilter = function () { var n = new Nodo("filtro", this); n.frequency = Param(350); n.Q = Param(1); return n; };
FakeCtx.prototype.createDynamicsCompressor = function () {
  var n = new Nodo("limitador", this);
  n.threshold = Param(0); n.knee = Param(0); n.ratio = Param(1); n.attack = Param(0); n.release = Param(0);
  return n;
};
FakeCtx.prototype.createOscillator = function () {
  var n = new Nodo("osc", this); n.frequency = Param(440);
  n.start = function () { }; n.stop = function () { };
  return n;
};
FakeCtx.prototype.createBuffer = function () { return { getChannelData: function () { return []; } }; };
FakeCtx.prototype.createBufferSource = function () {
  var n = new Nodo("fuente", this); n.playbackRate = Param(1); n.loop = false; n.parada = false;
  n.start = function (t, desde) { this.arranco = true; this.desde = desde; };
  n.stop = function () { this.parada = true; };
  return n;
};
FakeCtx.prototype.resume = function () { this.state = "running"; };
FakeCtx.prototype.decodeAudioData = function (ab, bien) {
  this.decodificadas.push(ab.ruta);
  bien({ ruta: ab.ruta, duration: 12 });
};
global.AudioContext = FakeCtx;
var pedidos = [], fallar = {};
global.fetch = function (ruta) {
  pedidos.push(ruta);
  var nombre = ruta.split("/").pop();
  return Promise.resolve(fallar[nombre] ? { ok: false, status: 404 } : { ok: true, arrayBuffer: function () { return Promise.resolve({ ruta: ruta }); } });
};
function esperar() { return new Promise(function (r) { setImmediate(r); }); }
function fuentes(c) { return c.nodos.filter(function (n) { return n.tipo === "fuente"; }); }
function nombreDe(f) { return f.buffer && String(f.buffer.ruta).split("/").pop().replace(".ogg", ""); }

var SFXSRC = fs.readFileSync(path.join(RAIZ, "phaser/audio/sfx.js"), "utf8");
var S = require(path.join(RAIZ, "phaser/audio/sfx.js"));
var BAL = require(path.join(RAIZ, "phaser/data/balance.json"));
var CARPETA = path.join(RAIZ, "assets/sonidos");

/* ---------- [1] declaradas y en disco ---------- */
(function () {
  var M = S.MUESTRAS || {};
  var declaradas = Object.keys(M).map(function (k) { return M[k]; });
  assert(declaradas.length === 14, "son catorce muestras (hay " + declaradas.length + ")");
  declaradas.forEach(function (a) { assert(fs.existsSync(path.join(CARPETA, a)), "la muestra " + a + " está declarada y no existe en assets/sonidos/"); });
  var enDisco = fs.readdirSync(CARPETA);
  enDisco.forEach(function (a) { assert(declaradas.indexOf(a) >= 0, "assets/sonidos/" + a + " no lo declara nadie en LAS MUESTRAS"); });
  var bytes = enDisco.reduce(function (s, a) { return s + fs.statSync(path.join(CARPETA, a)).size; }, 0);
  assert(bytes < 400 * 1024, "las muestras pesan " + Math.round(bytes / 1024) + " KB: se bajan todas al arrancar, que no crezcan sin pensarlo");
  console.log("[1] " + declaradas.length + " muestras declaradas, todas en disco (" + Math.round(bytes / 1024) + " KB)");
})();

/* ---------- [2] cada efecto con su muestra, sin síntesis de reserva ---------- */
(function () {
  var sinComentarios = SFXSRC.replace(/\/\*[\s\S]*?\*\//g, "");
  function cuerpo(desde) {
    var i = sinComentarios.indexOf(desde);
    if (i < 0) return "";
    var j = sinComentarios.indexOf("{", i), prof = 0;
    for (var k = j; k < sinComentarios.length; k++) {
      if (sinComentarios[k] === "{") prof++;
      else if (sinComentarios[k] === "}" && --prof === 0) return sinComentarios.slice(j, k + 1);
    }
    return "";
  }
  var EFECTOS = {
    "kick: function": ["patada"], "kickFuerte: function": ["patada_fuerte"], "net: function": ["red"],
    "gloves: function": ["guantes"], "palo: function": ["palo"], "whoosh: function": ["viento_remate"],
    "whistle: function": ["silbato", "silbato_final"], "afuera: function": ["hinchada_uh"],
    "festejo: function": ["hinchada_gol"], "crowd: function": ["hinchada_loop"],
    "function ponerCama()": ["hinchada_loop"], "ui: (function": ["ui_mover", "ui_confirmar", "ui_volver"]
  };
  Object.keys(EFECTOS).forEach(function (ef) {
    var c = cuerpo(ef);
    assert(c.length > 0, "no encuentro el efecto '" + ef + "' en sfx.js");
    EFECTOS[ef].forEach(function (m) {
      assert(c.indexOf('"' + m + '"') >= 0, "'" + ef + "' tendría que sonar con la muestra " + m);
      assert(!!S.MUESTRAS[m], "'" + ef + "' usa la muestra " + m + " y no está declarada");
    });
    assert(!/\btone\(|\bnoise\(/.test(c), "'" + ef + "' tiene síntesis de reserva: sin muestra no tiene que sonar nada");
  });
  /* los siete de la interfaz salen de las tres de madera */
  var ui = cuerpo("ui: (function");
  ["mover", "confirmar", "volver", "abrir", "cerrar", "bloqueado", "cartel"].forEach(function (n) {
    assert(new RegExp(n + ': \\["ui_(mover|confirmar|volver)"').test(ui), "el sonido de interfaz '" + n + "' tiene que salir de una muestra de madera");
  });
  /* el gol (el motivo) sigue siendo música sintetizada */
  assert(/\btone\(/.test(cuerpo("goal: function")), "SFX.goal() es el motivo musical: sigue sintetizado");
  console.log("[2] " + Object.keys(EFECTOS).length + " efectos con muestra, ninguno con síntesis de reserva");
})();

/* ---------- [3] el reproductor de verdad ---------- */
(async function () {
  S.configurarMezcla(BAL.audio_mezcla);
  S.kick();                                            // sin contexto todavía: lo crea, pero no hay muestras
  var c = ctxs[0];
  assert(!!c, "el primer efecto crea el contexto");
  assert(fuentes(c).length === 0 && c.nodos.filter(function (n) { return n.tipo === "osc"; }).length === 0,
    "sin muestras cargadas la patada no suena (ni muestra ni síntesis)");

  assert(S.cargarMuestras("../assets/sonidos/") === true, "cargarMuestras arranca la carga");
  assert(S.cargarMuestras("../assets/sonidos/") === false && pedidos.length === 14, "y una sola vez: catorce pedidos (" + pedidos.length + ")");
  assert(pedidos.every(function (p) { return p.indexOf("../assets/sonidos/") === 0; }), "de la carpeta de las muestras");
  await esperar(); await esperar();
  assert(c.decodificadas.length === 14 && S.muestrasListas().length === 14, "con el contexto ya creado se decodifican al llegar (" + S.muestrasListas().length + ")");

  var bus = c.nodos.filter(function (n) { return n.tipo === "gain"; })[0];
  S.kick();
  var f = fuentes(c).pop();
  assert(nombreDe(f) === "patada" && f.arranco, "la patada suena con su muestra");
  var g = f.salidas[0];
  assert(g && g.tipo === "gain" && g.salidas[0] === bus, "por el bus de efectos (el del pasabajos y el limitador)");
  assert(Math.abs(g.gain.value - BAL.audio_mezcla.kick) < 1e-9, "con la ganancia de balance.audio_mezcla.kick (" + g.gain.value + ")");

  S.kickFuerte(); assert(nombreDe(fuentes(c).pop()) === "patada_fuerte", "el súper tiro, con la patada fuerte");
  S.palo(); assert(nombreDe(fuentes(c).pop()) === "palo", "el palo, con el caño");
  S.whistle(); assert(nombreDe(fuentes(c).pop()) === "silbato", "un pitazo");
  S.whistle("final"); assert(nombreDe(fuentes(c).pop()) === "silbato_final", "y los tres del final");

  S.ui("cerrar");
  var u = fuentes(c).pop();
  assert(nombreDe(u) === "ui_mover" && Math.abs(u.playbackRate.value - 0.749) < 1e-6, "cerrar es el toque de mover una cuarta abajo");

  var n0 = fuentes(c).length;
  S.setMuted(true); S.kick(); S.net(); S.ui("confirmar");
  assert(fuentes(c).length === n0, "con el mute no suena ninguna muestra");
  S.setMuted(false);

  S.cama(true);
  var cama = fuentes(c).pop();
  assert(nombreDe(cama) === "hinchada_loop" && cama.loop && !cama.parada, "la cama es el loop de la hinchada");
  S.pausarMusica("oculto");
  assert(cama.parada, "con la música en pausa la cama se calla");
  S.reanudarMusica("oculto");
  var otra = fuentes(c).pop();
  assert(otra !== cama && nombreDe(otra) === "hinchada_loop" && !otra.parada, "y vuelve al reanudar");
  S.cama(false);
  assert(otra.parada, "cama(false) la apaga");

  /* una muestra que no llega no suena, y lo dice */
  delete require.cache[require.resolve(path.join(RAIZ, "phaser/audio/sfx.js"))];
  var S2 = require(path.join(RAIZ, "phaser/audio/sfx.js"));
  var errores = [], errorReal = console.error;
  console.error = function (m) { errores.push(String(m)); };
  fallar["red.ogg"] = true;
  S2.cargarMuestras("../assets/sonidos/");
  await esperar(); await esperar();
  S2.unlock();
  var c2 = ctxs[ctxs.length - 1];
  S2.net();
  console.error = errorReal;
  assert(S2.muestrasListas().length === 13 && S2.muestrasListas().indexOf("red") < 0, "sin red.ogg quedan trece");
  assert(fuentes(c2).length === 0 && c2.nodos.filter(function (n) { return n.tipo === "osc"; }).length === 0, "y la red no suena con nada");
  assert(errores.some(function (e) { return /red\.ogg/.test(e); }), "con un error claro en la consola");
  assert(c2.decodificadas.length === 13, "las que llegaron antes del contexto se decodifican cuando nace");
  console.log("[3] reproductor: sin carga no suena, cargada por el bus y la mezcla, mute, cama, interfaz derivada, falla con aviso");

  console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
  process.exit(mal === 0 ? 0 : 1);
})();
