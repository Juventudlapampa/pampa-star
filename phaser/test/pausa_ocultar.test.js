/* ============================================================================
   PAMPA STAR · L04 — GIRAR A VERTICAL O SALIR A OTRA APP PAUSA EL PARTIDO
                       Y LA MÚSICA

   LO QUE ESTABA MAL (medido en el código de antes de este lote):
     · matchMedia y visibilitychange daban 0 resultados en phaser/ (grep);
     · el "Girá el celular" era solo CSS (@media de #rotate en index.html):
       Phaser no se pausa porque se esconda el lienzo, la página sigue
       visible y el rival avanzaba sin que se viera;
     · la música es un new Audio (sfx.js, registrarArchivos) y con la pestaña
       oculta seguía con paused=false: pasabas a otra app y sonaba encima.

   LO QUE SE PRUEBA:
     [1] index.html y sfx.js tienen los oyentes: matchMedia con la MISMA
         consulta que el @media del aviso de girar (si difieren, hay un
         ancho donde se ve el aviso y el juego corre, o al revés) y
         visibilitychange; la consulta se evalúa al cargar y al crear el juego.
     [2] el reproductor de verdad (sfx.js) en node, con <audio> y relojes de
         mentira: con la pestaña oculta 3 s ningún elemento de música tiene
         paused=false (el criterio de aceptación); al volver suena EL MISMO
         tema, desde donde estaba; el contexto de los efectos se suspende y
         vuelve; un tema pedido con la pestaña oculta no suena hasta volver;
         el mute se respeta; los motivos se suman.
     [3] la pausa de afuera de index.html (PampaPausa) corriendo con un juego
         de mentira: vertical → game.pause() + música + aviso "ocultar" al
         juego; horizontal → game.resume(), salvo que el aviso "Algo se
         trabó" lo tenga parado.
     [4] el partido escucha "ocultar" y abre su PAUSA si estaba en LIBRE,
         callada (revisión L04: la cruz no se ve, el "abrir" no suena).

   Corré:  node phaser/test/pausa_ocultar.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var RAIZ = path.join(__dirname, "..", "..");
function leer(f) { return fs.readFileSync(path.join(RAIZ, f), "utf8"); }
var INDEX = leer("phaser/index.html"), SFXSRC = leer("phaser/audio/sfx.js");

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* ---------- [1] LOS OYENTES EXISTEN Y CONSULTAN LO MISMO QUE EL CSS ---------- */
var CONSULTA_CSS = null;
(function () {
  var mcss = INDEX.match(/@media\s*(\([^{]*\))\s*\{\s*#rotate\{display:flex;\}/);
  CONSULTA_CSS = mcss ? mcss[1].replace(/\s+/g, " ").trim() : null;
  assert(!!CONSULTA_CSS, "el aviso de girar sigue siendo un @media en index.html");
  var mjs = INDEX.match(/var CONSULTA = "([^"]+)"/);
  assert(!!mjs, "SÍNTOMA: index.html no consulta la orientación con matchMedia");
  var norm = function (s) { return String(s || "").replace(/\s+/g, "").toLowerCase(); };
  assert(mjs && norm(mjs[1]) === norm(CONSULTA_CSS),
    "la consulta del JS es la misma del CSS (" + (mjs && mjs[1]) + " vs " + CONSULTA_CSS + ")");
  assert(/window\.matchMedia\(CONSULTA\)/.test(INDEX), "index.html llama a matchMedia con esa consulta");
  assert(/mq\.addEventListener\("change", P\.evaluar\)/.test(INDEX) && /mq\.addListener\(P\.evaluar\)/.test(INDEX),
    "y escucha sus cambios (con el addListener de los navegadores viejos)");
  /* el "change" de una consulta se despacha en el paso de render del
     navegador: en el panel integrado oculto no llegó nunca (medido: la
     consulta daba true y el oyente no corrió). resize y orientationchange
     son la red: evaluar() es idempotente */
  assert(/window\.addEventListener\("resize", P\.evaluar\)/.test(INDEX) && /window\.addEventListener\("orientationchange", P\.evaluar\)/.test(INDEX),
    "también evalúa con resize y orientationchange");
  var iPausa = INDEX.indexOf("window.PampaPausa = "), iEval = INDEX.indexOf("P.evaluar();", iPausa);
  assert(iPausa > 0 && iEval > iPausa, "se evalúa al cargar: un teléfono que abre en vertical arranca en pausa");
  var iJuego = INDEX.indexOf("window.PAMPA_GAME = new Phaser.Game(config);");
  var iAplicar = INDEX.indexOf("window.PampaPausa.aplicar()", iJuego);
  assert(iJuego > 0 && iAplicar > iJuego && iAplicar - iJuego < 200, "y otra vez al crear el juego, que nace después del oyente");
  assert(/document\.addEventListener\("visibilitychange"/.test(INDEX), "index.html escucha visibilitychange (avisa al partido)");
  assert(/document\.addEventListener\("visibilitychange", alCambiarVisibilidad\)/.test(SFXSRC), "sfx.js escucha visibilitychange (calla la música y los efectos)");
  assert(/ctx\.suspend\(\)/.test(SFXSRC) && /ctx\.resume\(\)/.test(SFXSRC), "sfx.js suspende y reanuda el contexto de los efectos");
  console.log("[1] matchMedia('" + (mjs && mjs[1]) + "') = el @media del aviso · visibilitychange en index.html y sfx.js");
})();

/* ---------- [2] EL REPRODUCTOR DE VERDAD, CON LA PESTAÑA OCULTA ---------- */
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
  this.currentTime = 0; this._l = {}; this.plays = 0;
  creados.push(this);
}
FakeAudio.prototype.play = function () { this.paused = false; this.plays++; return { catch: function () { } }; };
FakeAudio.prototype.pause = function () { this.paused = true; };
FakeAudio.prototype.addEventListener = function (ev, fn) { this._l[ev] = fn; };
FakeAudio.prototype.removeEventListener = function (ev) { delete this._l[ev]; };
/* el contexto de los efectos: lo mínimo que usa ensure() */
var ctxCreado = null;
function FakeCtx() {
  ctxCreado = this; this.state = "running"; this.currentTime = 0; this.destination = {}; this.sampleRate = 44100;
  this.suspensiones = 0; this.reanudaciones = 0;
}
FakeCtx.prototype.createGain = function () { return { gain: { value: 1 }, connect: function () { } }; };
FakeCtx.prototype.createDynamicsCompressor = function () {
  var p = function () { return { value: 0 }; };
  return { threshold: p(), knee: p(), ratio: p(), attack: p(), release: p(), connect: function () { } };
};
FakeCtx.prototype.suspend = function () { this.state = "suspended"; this.suspensiones++; return { catch: function () { } }; };
FakeCtx.prototype.resume = function () { this.state = "running"; this.reanudaciones++; return { catch: function () { } }; };
var oyentesDoc = {};
global.document = {
  hidden: false,
  addEventListener: function (ev, fn) { (oyentesDoc[ev] = oyentesDoc[ev] || []).push(fn); }
};
function ocultar(si) { global.document.hidden = si; (oyentesDoc.visibilitychange || []).forEach(function (f) { f(); }); }
global.Audio = FakeAudio;
global.window = global;
global.AudioContext = FakeCtx;
global.localStorage = { getItem: function () { return null; }, setItem: function () { } };

var S = require(path.join(RAIZ, "phaser/audio/sfx.js"));
var MUS = require(path.join(RAIZ, "phaser/logic/musica.js"));
var A = require(path.join(RAIZ, "data/audio.json"));
function nombre(e) { return String(e.src).split("/").pop().replace(".ogg", ""); }
function sinPausa() { return creados.filter(function (e) { return !e.paused; }); }
function oido() { return creados.filter(function (e) { return !e.paused && !e.muted && e.volume > 0.02; }).map(nombre).sort().join(" + ") || "(nada)"; }

(function () {
  assert(typeof S.pausarMusica === "function" && typeof S.reanudarMusica === "function",
    "SÍNTOMA: sfx.js no tiene pausarMusica()/reanudarMusica()");
  if (typeof S.pausarMusica !== "function") return;
  S.registrarArchivos(MUS.mapaCompleto(A, 0, "../assets/musica/"), 0.42);
  S.unlock();                                         // el primer toque crea el contexto
  assert(!!ctxCreado && ctxCreado.state === "running", "el contexto de los efectos existe y corre");
  S.musicaTema("partido"); avanzar(1000);
  var tema = sinPausa()[0];
  assert(!!tema && oido() === nombre(tema), "suena el tema del partido (" + oido() + ")");
  tema.currentTime = 37.5;                            // va por la mitad

  ocultar(true);
  avanzar(3000);
  assert(sinPausa().length === 0, "SÍNTOMA: con la pestaña oculta 3 s hay elementos de música con paused=false (" + sinPausa().map(nombre).join(", ") + ")");
  assert(ctxCreado.state === "suspended", "y el contexto de los efectos se suspende");
  /* un pedido que llega oculto (el tope de alTerminarMusica es un setTimeout y corre igual) */
  S.musicaTema("partido_final"); avanzar(1000);
  assert(sinPausa().length === 0, "un tema pedido con la pestaña oculta no suena todavía (" + sinPausa().map(nombre).join(", ") + ")");
  S.musicaTema("partido"); avanzar(500);             // y vuelve a pedirse el de antes
  assert(sinPausa().length === 0, "ni el de antes");

  ocultar(false);
  avanzar(600);
  var vuelve = sinPausa();
  assert(vuelve.length === 1 && vuelve[0] === tema, "al volver suena EL MISMO tema, uno solo (" + vuelve.map(nombre).join(", ") + ")");
  assert(tema.currentTime === 37.5, "desde donde estaba: currentTime intacto (" + tema.currentTime + ")");
  assert(Math.abs(tema.volume - 0.42) < 0.01, "a su volumen, después del fundido de entrada (" + tema.volume.toFixed(2) + ")");
  assert(ctxCreado.state === "running" && ctxCreado.reanudaciones >= 1, "y el contexto de los efectos vuelve");
  console.log("[2] oculta 3 s: 0 elementos sin pausa · al volver: " + oido() + " desde " + tema.currentTime + " s");

  /* el pedido que cambió el tema mientras estaba oculto, es el que vuelve */
  ocultar(true); avanzar(100);
  S.musicaTema("partido_final"); avanzar(200);
  ocultar(false); avanzar(600);
  assert(oido() === "Last_Ten_Seconds_loop", "si el tema cambió con la pestaña oculta, al volver suena el nuevo (" + oido() + ")");

  /* el mute se respeta: lo muteado vuelve muteado */
  S.setMuted(true);
  ocultar(true); avanzar(500); ocultar(false); avanzar(600);
  var pf = sinPausa()[0];
  assert(pf && pf.muted === true && oido() === "(nada)", "con el mute puesto, al volver el tema sigue muteado (no se oye nada)");
  S.setMuted(false); avanzar(100);
  assert(oido() === "Last_Ten_Seconds_loop", "y al sacar el mute se oye (" + oido() + ")");

  /* un tema de una pasada que ya terminó no vuelve a empezar */
  S.musicaTema("entrada"); avanzar(400);
  var ent = sinPausa()[0];
  ent.pause();                                       // terminó ('ended' deja el elemento en pausa)
  var antes = ent.plays;
  ocultar(true); avanzar(200); ocultar(false); avanzar(400);
  assert(ent.plays === antes && sinPausa().length === 0, "un tema que ya terminó no vuelve a sonar al reanudar");

  /* los motivos se suman: oculto + vertical, y vuelve cuando no queda ninguno */
  S.musicaTema("partido"); avanzar(600);
  S.pausarMusica("vertical");
  ocultar(true); avanzar(100); ocultar(false); avanzar(400);
  assert(sinPausa().length === 0, "volver a la app con el teléfono todavía en vertical no reanuda la música");
  S.reanudarMusica("vertical"); avanzar(400);
  assert(oido() === "The_Winning_Strike_loop", "girar a horizontal sí (" + oido() + ")");

  /* el contexto que nunca arrancó (sin toque todavía) no lo arranca la vuelta */
  ctxCreado.state = "suspended"; var r0 = ctxCreado.reanudaciones;
  ocultar(true); ocultar(false);
  assert(ctxCreado.reanudaciones === r0, "un contexto suspendido por el navegador (sin toque) no se reanuda al volver: eso es de unlock()");
  console.log("[2] tema nuevo oculto · mute respetado · una pasada no se repite · oculto+vertical se suman");
})();

/* ---------- [2b] EL TEMA REEMPLAZADO EN LA PAUSA NO QUEDA A MITAD DE CAMINO (revisión L04) ----------
   El caso del revisor: suena la entrada (una pasada), a los 5 s la pestaña
   se oculta, corre el tope de 11 s de alTerminarMusica (un setTimeout) y
   pide el tema del partido. pausarMusica había pausado la entrada EN EL
   LUGAR, y despedirLosDemas solo rebobina lo que suena: la entrada quedaba
   en currentTime=5 y el partido siguiente la arrancaba desde el medio.
   Antes de L04, despedir() siempre la dejaba en 0. */
(function () {
  if (typeof S.pausarMusica !== "function") return;
  ctxCreado.state = "running";
  S.musicaTema("entrada"); avanzar(600);
  var ent = sinPausa()[0];
  assert(!!ent && nombre(ent) === "Under_the_Floodlights", "control: suena la entrada (" + oido() + ")");
  ent.currentTime = 5;
  ocultar(true); avanzar(100);
  S.musicaTema("partido"); avanzar(200);              // el tope de alTerminarMusica, con la pestaña oculta
  ocultar(false); avanzar(600);
  assert(oido() === "The_Winning_Strike_loop", "al volver suena el tema del partido (" + oido() + ")");
  assert(ent.paused && ent.currentTime === 0, "SÍNTOMA: la entrada reemplazada en la pausa quedó en currentTime=" + ent.currentTime + " (tiene que volver a 0)");
  /* el partido siguiente: la ceremonia, entera */
  S.musicaTema("entrada"); avanzar(100);
  assert(!ent.paused && ent.currentTime === 0, "la entrada del partido siguiente arranca desde 0 (" + ent.currentTime + ")");
  /* lo mismo si en la pausa se pide silencio (pararArchivo) */
  ent.currentTime = 4;
  ocultar(true); avanzar(100);
  S.musicaTema(null); avanzar(100);
  ocultar(false); avanzar(600);
  assert(sinPausa().length === 0 && ent.currentTime === 0, "un silencio pedido en la pausa también la rebobina (" + ent.currentTime + ")");
  /* y el que vuelve sigue donde estaba: el arreglo no rebobina al pendiente */
  S.musicaTema("partido"); avanzar(600);
  var ws = sinPausa()[0]; ws.currentTime = 21;
  ocultar(true); avanzar(300); ocultar(false); avanzar(600);
  assert(sinPausa()[0] === ws && ws.currentTime === 21, "el tema que vuelve después de la pausa sigue desde donde estaba (" + ws.currentTime + ")");
  console.log("[2b] reemplazado en la pausa: rebobinado a 0 · la entrada siguiente desde 0 · el que vuelve, en su lugar");
})();

/* ---------- [3] LA PAUSA DE AFUERA (index.html) CON UN JUEGO DE MENTIRA ---------- */
(function () {
  var bloque = null;
  (INDEX.match(/<script>([\s\S]*?)<\/script>/g) || []).forEach(function (s) { if (/window\.PampaPausa = /.test(s)) bloque = s.replace(/^<script>|<\/script>$/g, ""); });
  assert(!!bloque, "index.html tiene el script de PampaPausa");
  if (!bloque) return;
  var mqOyentes = [], mq = { matches: true, addEventListener: function (ev, f) { mqOyentes.push(f); } };
  var docOy = {};
  var juego = { pausas: 0, reanudas: 0, emitidos: [],
    pause: function () { this.pausas++; this.isPaused = true; }, resume: function () { this.reanudas++; this.isPaused = false; },
    events: { emit: function (n, d) { juego.emitidos.push(n + ":" + (d && d.motivo)); } } };
  var musica = [];
  var winOy = {};
  var W = { matchMedia: function (q) { W._q = q; return mq; },
    addEventListener: function (ev, f) { (winOy[ev] = winOy[ev] || []).push(f); }, PampaSFX: {
    pausarMusica: function (m) { musica.push("pausa:" + m); }, reanudarMusica: function (m) { musica.push("sigue:" + m); } } };
  var ctx = { window: W, document: { hidden: false, addEventListener: function (ev, f) { (docOy[ev] = docOy[ev] || []).push(f); } } };
  vm.createContext(ctx);
  vm.runInContext(bloque, ctx);
  var P = W.PampaPausa;
  assert(P && P.motivos.vertical === true, "abrir la página en vertical deja el motivo puesto antes de que exista el juego");
  W.PAMPA_GAME = juego;
  assert(P.aplicar() === true && juego.pausas === 1 && musica.indexOf("pausa:vertical") >= 0, "al crear el juego, nace en pausa (y la música también)");
  /* gira a horizontal */
  mq.matches = false; mqOyentes.forEach(function (f) { f(); });
  assert(juego.reanudas === 1 && !P.retiene() && musica.indexOf("sigue:vertical") >= 0, "a horizontal: el juego y la música siguen");
  /* gira a vertical en medio del partido */
  mq.matches = true; mqOyentes.forEach(function (f) { f(); });
  assert(juego.pausas === 2, "a vertical: game.pause() (no corre ni el update ni los tweens)");
  assert(juego.emitidos.indexOf("ocultar:vertical") >= 0, "y le avisa al juego (\"ocultar\"): el partido abre su PAUSA");
  /* el aviso de error aparece con el teléfono en vertical y se va: no reanuda */
  W.PampaRed = { tipo: "trabado" };
  mq.matches = false; mqOyentes.forEach(function (f) { f(); });
  assert(juego.reanudas === 1, "con 'Algo se trabó' a la vista, girar a horizontal no reanuda (lo tiene parado el aviso)");
  W.PampaRed.tipo = null;
  /* sin "change" de la consulta (navegador viejo, panel oculto): el resize
     también la evalúa, y dos evaluaciones iguales no pausan dos veces */
  mq.matches = true;
  (winOy.resize || []).forEach(function (f) { f(); });
  (winOy.orientationchange || []).forEach(function (f) { f(); });
  assert(juego.pausas === 3 && P.motivos.vertical === true, "un resize a vertical pausa, y el orientationchange de atrás no pausa de nuevo (" + juego.pausas + ")");
  mq.matches = false; (winOy.resize || []).forEach(function (f) { f(); });
  assert(juego.reanudas === 2, "y un resize a horizontal reanuda");
  /* pestaña oculta: aviso al juego (la música la maneja sfx.js) */
  ctx.document.hidden = true; (docOy.visibilitychange || []).forEach(function (f) { f(); });
  assert(juego.emitidos.indexOf("ocultar:oculto") >= 0, "pestaña oculta: el juego recibe \"ocultar\"");
  /* y el aviso de error no reanuda con el teléfono en vertical */
  var seguir = INDEX.slice(INDEX.indexOf("R.seguir = function"), INDEX.indexOf("R.copiar = function"));
  assert(/g\.resume && !\(window\.PampaPausa && window\.PampaPausa\.retiene\(\)\)\) g\.resume\(\)/.test(seguir),
    "SEGUIR IGUAL no reanuda el juego con el teléfono en vertical");
  var menu = INDEX.slice(INDEX.indexOf("R.volverAlMenu = function"), INDEX.indexOf("R.soltarTeclas = function"));
  assert(/g\.resume && !\(window\.PampaPausa && window\.PampaPausa\.retiene\(\)\)\) g\.resume\(\)/.test(menu),
    "VOLVER AL MENÚ del aviso tampoco");
  console.log("[3] vertical → pause + música + \"ocultar\" · horizontal → resume (salvo con el aviso de error)");
})();

/* ---------- [4] EL PARTIDO ABRE SU PAUSA AL OCULTARSE ---------- */
(function () {
  var M = leer("phaser/scenes/match.js").replace(/\r\n/g, "\n");
  var cre = M.slice(M.indexOf("  create() {"));
  cre = cre.slice(0, cre.indexOf("\n  }\n"));
  assert(/const alOcultar = \(\) => \{ if \(this\.estado === "LIBRE"\) this\.abrirPausa\(\{ callada: true \}\); \};/.test(cre),
    "create() tiene un oyente que abre la PAUSA, callada, si el reloj corría (LIBRE)");
  assert(/this\.game\.events\.on\("ocultar", alOcultar\)/.test(cre), "colgado del evento \"ocultar\" del juego");
  assert(/this\.events\.once\("shutdown", \(\) => this\.game\.events\.off\("ocultar", alOcultar\)\)/.test(cre),
    "y se descuelga con el shutdown: el emisor del juego sobrevive a la escena (si no, se apilan)");
  /* corriendo: el oyente de VERDAD (los tres renglones de create(), con
     this = el partido de mentira) */
  var PM = require("./_partido_de_mentira.js"), E = PM.escena(), s = E.s;
  var i0 = M.indexOf("    const alOcultar = "), fin = 'this.events.once("shutdown", () => this.game.events.off("ocultar", alOcultar));';
  var i1 = M.indexOf(fin, i0);
  (new Function(M.slice(i0, i1 + fin.length))).call(s);
  s.st.modo = "juego";
  s.game.events.emit("ocultar", { motivo: "oculto" });
  assert(s.estado === "PAUSA" && s.st.modo === "congelado", "con el reloj corriendo, irse a otra app abre la PAUSA");
  /* REVISIÓN L04 · la partitura: en vertical el contexto de los efectos no
     se suspende, y el "abrir" sonaba con el "Girá el celular" a la vista */
  assert(E.ui.indexOf("abrir") < 0, "SÍNTOMA: la PAUSA que abre 'ocultar' suena 'abrir' con la cruz sin verse (" + E.ui.join(",") + ")");
  var C = PM.escena(); C.s.st.modo = "juego"; C.s.pedirPausa();
  assert(C.ui.indexOf("abrir") >= 0, "control: la PAUSA pedida a mano (⏸, P, atrás) sí suena 'abrir'");
  var min = s.st.minuto;
  for (var k = 0; k < 33; k++) s.update(k * 300, 300);   // 10 s de cuadros
  assert(s.st.minuto === min, "y 10 s después el minuto no avanzó (" + min + " → " + s.st.minuto + ")");
  s.cerrarPausa(); s.estado = "MENU";
  s.game.events.emit("ocultar", { motivo: "vertical" });
  assert(s.estado === "MENU" && !s._pausaPedida, "en un menú no abre ni pide nada: el juego entero quedó quieto");
  console.log("[4] \"ocultar\" en LIBRE abre la PAUSA; 10 s después el minuto sigue en " + min);
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
