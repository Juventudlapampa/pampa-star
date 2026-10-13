/* ============================================================================
   PAMPA STAR · L08 — EL OPENING SE VE UNA VEZ POR APARATO

   Lo que estaba mal (medido en el código y en balance.json): la marca de
   "ya se vio" vivía solo en el registry de Phaser (intro.js: get/set
   "introVista"), que muere con la página. Cada vez que se abría el link o se
   recargaba, otra vez la compuerta, otra vez los 19.500 ms de planos (la suma
   de balance.intro.planos_ms) y otra vez a bajar lo del opening (1,45 MB,
   carga_liviana.test.js) antes de llegar al editor.

   Ahora la marca va también a localStorage (pampa_intro_vista = "1") y se
   escribe cuando el opening ARRANCA. Con la marca, la compuerta sigue (su
   toque desbloquea el audio y en Android pide la pantalla completa) pero va
   directo al editor. Este test corre el create() de verdad de intro.js con
   una escena y un localStorage de mentira:

     [1] la primera vez: la compuerta, lo del opening bajando, el toque arma
         los ocho planos y la marca queda escrita;
     [2] LA SEGUNDA CARGA (el criterio de aceptación): con la marca y una
         página nueva (registry vacío) no se baja ni se arma ningún plano; el
         toque desbloquea el audio, pide la pantalla completa y va al editor;
     [3] VER INTRO (introPedida) con la marca: los planos se arman igual;
     [4] los bordes: el almacenamiento bloqueado (se ve como la primera vez y
         nada tira), la perilla en false (una vez por sesión, como antes),
         sin compuerta, la misma sesión, y saltear mientras baja (no lo vio:
         no hay marca);
     [5] P1: init() apaga el modo directo, y la perilla está con su _nota.

   Corré:  node phaser/test/opening_una_vez.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var RAIZ = path.join(__dirname, "..", "..");
function leer(f) { return fs.readFileSync(path.join(RAIZ, f), "utf8"); }
function json(f) { return JSON.parse(leer(f)); }

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

var BAL = json("phaser/data/balance.json");
var POSES = json("data/poses_manifest.json"), CARAS = json("data/caras_manifest.json");
var C = require(path.join(RAIZ, "phaser/logic/carga.js"));
var CLAVE = "pampa_intro_vista";

/* ---------- utilería: emisor, loader, objetos y almacenamiento ---------- */
function Emisor() { this._ev = {}; }
Emisor.prototype.on = function (n, fn) { (this._ev[n] = this._ev[n] || []).push({ fn: fn, once: false }); return this; };
Emisor.prototype.once = function (n, fn) { (this._ev[n] = this._ev[n] || []).push({ fn: fn, once: true }); return this; };
Emisor.prototype.emit = function (n) {
  var a = [].slice.call(arguments, 1), ls = (this._ev[n] || []).slice();
  this._ev[n] = (this._ev[n] || []).filter(function (l) { return !l.once; });
  ls.forEach(function (l) { l.fn.apply(null, a); });
  return ls.length > 0;
};
function loaderDeMentira() {
  var L = new Emisor();
  L.pedidos = [];
  L.image = function (k, u) { L.pedidos.push({ clave: k, ruta: u }); return L; };
  L.start = function () { L.arrancado = true; };
  return L;
}
function objeto(tipo) {
  var o = { type: tipo, width: 100, height: 100, active: true, texto: "" };
  ["setOrigin", "setScale", "setAlpha", "setDepth", "setVisible", "setAngle", "setTint", "setStrokeStyle",
    "lineStyle", "strokeRect", "fillStyle", "fillRect", "clear", "add", "removeAll", "beginPath", "moveTo", "lineTo", "strokePath"]
    .forEach(function (m) { o[m] = function () { return o; }; });
  o.setText = function (t) { o.texto = String(t); return o; };
  o.destroy = function () { o.active = false; };
  return o;
}
/* un localStorage como el del navegador; "bloqueado" tira en todo, como un
   navegador con los datos del sitio bloqueados */
function almacen(inicial, bloqueado) {
  var store = Object.assign({}, inicial || {});
  return {
    _store: store,
    getItem: function (k) { if (bloqueado) throw new Error("SecurityError"); return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { if (bloqueado) throw new Error("SecurityError"); store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  };
}

/* una "carga de la página": contexto nuevo (registry vacío, como al
   recargar) con el intro.js de verdad y el almacenamiento que se le pase */
function abrir(op) {
  op = op || {};
  var X = { irA: [], pantalla: [], desbloqueos: 0, sw: [], musica: [], planos: [], timers: [], calentado: [], textos: [] };
  var W = {
    PF: { texto: "Pixelify Sans", display: "Pixelify Sans" }, PampaCarga: C,
    PampaRegistrarSW: function (c) { X.sw.push(c || "ya"); },
    PampaCartel: { sacar: function () { } },
    PampaSFX: { unlock: function () { X.desbloqueos++; } }
  };
  var ls = op.almacen || almacen();
  var ctx = { window: W, localStorage: ls, Phaser: { Scene: function () { } }, console: console, Math: Math, JSON: JSON, String: String, Object: Object, Array: Array, Error: Error };
  vm.createContext(ctx);
  vm.runInContext(leer("phaser/scenes/intro.js"), ctx, { filename: "intro.js" });
  var Intro = W.PampaIntro;
  var reg = new Map();
  reg.set("balance", op.balance || BAL); reg.set("poses", POSES); reg.set("caras", CARAS);
  (op.registry || []).forEach(function (kv) { reg.set(kv[0], kv[1]); });
  var s = Object.create(Intro.prototype);
  s.init();
  s.game = { registry: { get: function (k) { return reg.get(k); }, set: function (k, v) { reg.set(k, v); } } };
  s.load = loaderDeMentira();
  var enMemoria = !!op.todoEnMemoria;
  s.textures = { exists: function () { return enMemoria; } };
  s.add = {
    container: function () { return objeto("Container"); },
    graphics: function () { return objeto("Graphics"); },
    image: function () { return objeto("Image"); },
    rectangle: function () { return objeto("Rectangle"); },
    text: function (x, y, t) { var o = objeto("Text"); o.texto = String(t); X.textos.push(o.texto); return o; }
  };
  s.tweens = { add: function () { }, killAll: function () { }, killTweensOf: function () { } };
  s.cameras = { main: { setBackgroundColor: function () { }, flash: function () { }, fadeOut: function () { } } };
  s.input = new Emisor(); s.input.keyboard = new Emisor();
  s.sys = { game: { device: { input: { touch: false } } } };
  s.time = {
    now: 0,
    delayedCall: function (ms, fn) { var t = { ms: ms, fn: fn, remove: function () { } }; X.timers.push(t); return t; },
    addEvent: function (c) { return { cfg: c, remove: function () { } }; }
  };
  s.entrarDesdeNegro = function () { };
  s.irA = function (k) { X.irA.push(k); return true; };
  s.pedirMusica = function (id) { X.musica.push(id); };
  s.pantallaCompleta = function (o) { X.pantalla.push(o); };
  s.registrarMusicaGlobal = function () { return 0; };   // sin temas: no hay tema que esperar
  s.calentarEnSegundoPlano = function (l) { X.calentado = X.calentado.concat(l); return l.length; };
  /* los ocho planos, espiados: cuántos se dibujan */
  ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"].forEach(function (p) { s[p] = function () { X.planos.push(p); }; });
  X.s = s; X.ls = ls;
  /* correr el reloj: dispara todo lo agendado (y lo que eso agende) */
  X.correr = function () {
    s.time.now += 100000;
    for (var i = 0; i < X.timers.length && i < 500; i++) X.timers[i].fn();
  };
  return X;
}
var LISTA_OPENING = (function () { var q = abrir(); q.s.I = BAL.intro; return q.s.listaOpening(); })();

/* ---------- [1] LA PRIMERA VEZ ---------- */
(function () {
  var A = abrir();
  A.s.create();
  assert(A.irA.length === 0, "la primera vez no se va al editor sin tocar (" + A.irA.join(",") + ")");
  assert(A.textos.indexOf(BAL.intro.t_compuerta) >= 0, "la primera vez está la compuerta (\"" + BAL.intro.t_compuerta + "\")");
  assert(LISTA_OPENING.length > 0 && A.s.load.pedidos.length === LISTA_OPENING.length,
    "con la compuerta a la vista se baja lo del opening (" + A.s.load.pedidos.length + " de " + LISTA_OPENING.length + ")");
  assert(A.ls._store[CLAVE] == null, "la marca NO se escribe con la compuerta: todavía no se vio nada");
  A.s.input.emit("pointerup");
  assert(A.desbloqueos === 1 && A.pantalla.join() === "compuerta", "el toque desbloquea el audio y pide la pantalla completa");
  A.s.load.emit("complete");
  assert(A.ls._store[CLAVE] === "1", "cuando el opening ARRANCA, la marca del aparato queda en localStorage (" + A.ls._store[CLAVE] + ")");
  A.correr();
  assert(A.planos.length === 8, "la primera vez se dibujan los ocho planos (" + A.planos.length + ")");
  assert(A.irA.join() === "editor", "y al terminar, el editor (" + A.irA.join(",") + ")");
  var total = (BAL.intro.planos_ms || []).reduce(function (t, v) { return t + v; }, 0);
  assert(total === 19500, "los planos suman 19.500 ms (lo que costaba cada recarga): " + total);
  console.log("[1] la primera vez: compuerta, " + LISTA_OPENING.length + " archivos del opening, 8 planos (" + total + " ms) y la marca escrita al arrancar");
})();

/* ---------- [2] LA SEGUNDA CARGA (el criterio de aceptación) ---------- */
(function () {
  var mark = {}; mark[CLAVE] = "1";
  var B = abrir({ almacen: almacen(mark) });   // página nueva: el registry no sabe nada
  B.s.create();
  assert(B.irA.length === 0 && B.textos.indexOf(BAL.intro.t_compuerta) >= 0,
    "con la marca la compuerta sigue: su toque es el gesto del audio y de la pantalla completa");
  assert(B.s.load.pedidos.length === 0 && !B.s.load.arrancado,
    "SÍNTOMA: con la marca no se baja nada del opening (pidió " + B.s.load.pedidos.length + ")");
  var carasEd = C.listaDelEditor(CARAS);
  assert(carasEd.length > 0 && B.calentado.length === carasEd.length,
    "mientras espera el toque, se bajan las caras del editor, que es adonde va (" + B.calentado.length + ")");
  B.s.input.emit("pointerup");
  assert(B.desbloqueos === 1, "el toque desbloquea el audio igual");
  assert(B.pantalla.join() === "compuerta", "y pide la pantalla completa igual (Android)");
  assert(B.irA.join() === "editor", "SÍNTOMA: con la marca, el toque va directo al editor (" + B.irA.join(",") + ")");
  B.s.load.emit("complete");   // si algo del opening estuviera bajando, acá arrancaría
  B.correr();
  assert(B.planos.length === 0, "SÍNTOMA: en la segunda carga no se arma ningún plano (se armaron " + B.planos.length + ")");
  assert(B.irA.length === 1, "y se va al editor una sola vez (" + B.irA.length + ")");
  assert(B.sw.indexOf("ya") >= 0, "al salir se avisa que se puede instalar el worker, como al terminar el opening");
  /* la tecla también (la compu) */
  var B2 = abrir({ almacen: almacen(mark) });
  B2.s.create();
  B2.s.input.keyboard.emit("keydown");
  assert(B2.irA.join() === "editor" && B2.desbloqueos === 1, "con la marca, una tecla en la compuerta también va al editor");
  console.log("[2] la segunda carga: compuerta, 0 archivos del opening, 0 planos y directo al editor con el toque");
})();

/* ---------- [3] VER INTRO LO SIGUE MOSTRANDO ---------- */
(function () {
  var mark = {}; mark[CLAVE] = "1";
  var V = abrir({ almacen: almacen(mark), registry: [["introVista", true], ["introPedida", true]], todoEnMemoria: true });
  V.s.create();
  V.correr();
  assert(V.planos.length === 8, "SÍNTOMA: VER INTRO (introPedida) con la marca tiene que mostrar los ocho planos (" + V.planos.length + ")");
  assert(V.irA.join() === "editor", "y volver al editor al terminar (" + V.irA.join(",") + ")");
  /* VER INTRO en una página nueva con la marca (introPedida sin introVista: no pasa hoy, pero no tiene que romper) */
  var V2 = abrir({ almacen: almacen(mark), registry: [["introPedida", true]], todoEnMemoria: true });
  V2.s.create(); V2.correr();
  assert(V2.planos.length === 8, "introPedida manda aunque la marca esté (" + V2.planos.length + ")");
  console.log("[3] VER INTRO con la marca: los ocho planos");
})();

/* ---------- [4] LOS BORDES ---------- */
(function () {
  var mark = {}; mark[CLAVE] = "1";
  /* el almacenamiento bloqueado: se ve como la primera vez, nada tira */
  var Z = abrir({ almacen: almacen({}, true) });
  var tiro = null;
  try { Z.s.create(); Z.s.input.emit("pointerup"); Z.s.load.emit("complete"); Z.correr(); } catch (e) { tiro = e; }
  assert(!tiro, "con el almacenamiento bloqueado nada tira (" + (tiro && tiro.message) + ")");
  assert(Z.planos.length === 8 && Z.irA.join() === "editor", "y el opening se ve como la primera vez (" + Z.planos.length + " planos)");
  /* la perilla en false: una vez por sesión, como antes */
  var BAL2 = JSON.parse(JSON.stringify(BAL)); BAL2.intro.una_vez_por_aparato = false;
  var P = abrir({ almacen: almacen(mark), balance: BAL2 });
  P.s.create();
  assert(P.s.load.pedidos.length === LISTA_OPENING.length, "con una_vez_por_aparato en false, la marca no cuenta: se baja el opening");
  P.s.input.emit("pointerup"); P.s.load.emit("complete"); P.correr();
  assert(P.planos.length === 8, "y se ven los ocho planos (" + P.planos.length + ")");
  var P2 = abrir({ balance: BAL2 });
  P2.s.create(); P2.s.input.emit("pointerup"); P2.s.load.emit("complete");
  assert(P2.ls._store[CLAVE] == null, "en false tampoco se escribe la marca");
  /* sin compuerta y con la marca: no hay gesto que cuidar, directo al editor */
  var BAL3 = JSON.parse(JSON.stringify(BAL)); BAL3.intro.compuerta = false;
  var S = abrir({ almacen: almacen(mark), balance: BAL3 });
  S.s.create();
  assert(S.irA.join() === "editor" && S.s.load.pedidos.length === 0, "sin compuerta y con la marca, directo al editor sin bajar nada");
  /* la misma sesión (lo de siempre): sin compuerta, al editor */
  var M = abrir({ registry: [["introVista", true]] });
  M.s.create();
  assert(M.irA.join() === "editor" && M.textos.length === 0, "en la misma sesión, como antes: directo al editor, sin compuerta");
  /* saltear mientras todavía bajaba: no lo vio, no hay marca */
  var Q = abrir();
  Q.s.create();
  Q.s.input.emit("pointerup");          // toca la compuerta: espera ("CARGANDO LA INTRO… NN%")
  Q.s.time.now += 1000;
  Q.s.input.emit("pointerdown");        // y saltea antes de que baje
  assert(Q.irA.join() === "editor" && Q.planos.length === 0, "saltear mientras baja lleva al editor (" + Q.irA.join(",") + ")");
  assert(Q.ls._store[CLAVE] == null, "saltear ANTES de que arranque no escribe la marca: no lo vio y la próxima vez le toca");
  console.log("[4] bloqueado, perilla en false, sin compuerta, misma sesión y salteo durante la espera: como corresponde");
})();

/* ---------- [5] P1 Y LA PERILLA ---------- */
(function () {
  var src = leer("phaser/scenes/intro.js").replace(/\r\n/g, "\n");
  var init = src.slice(src.indexOf("  init() {"), src.indexOf("\n  }", src.indexOf("  init() {")));
  assert(/this\._directo = false;/.test(init), "P1: init() apaga el modo directo (Phaser reusa la escena en VER INTRO)");
  var q = abrir(); q.s._directo = true; q.s.init();
  assert(q.s._directo === false, "init() deja _directo en false");
  assert(/localStorage\.getItem\(window\.PampaIntro\.CLAVE_VISTA\)/.test(src) && /localStorage\.setItem\(window\.PampaIntro\.CLAVE_VISTA, "1"\)/.test(src),
    "la marca se lee y se escribe con la misma clave");
  assert(/try \{ return localStorage\.getItem/.test(src) && /try \{ localStorage\.setItem/.test(src), "las dos lecturas de localStorage van dentro de try");
  assert(BAL.intro.una_vez_por_aparato === true && typeof BAL.intro._una_vez === "string" && /pampa_intro_vista/.test(BAL.intro._una_vez),
    "balance.intro.una_vez_por_aparato en true, con su _nota (_una_vez)");
  /* el texto del editor sigue llevando a la intro con introPedida */
  var ed = leer("phaser/scenes/editor.js");
  assert(/registry\.set\("introPedida", true\); this\.irA\("intro"\)/.test(ed), "VER INTRO del editor sigue pidiendo la intro (introPedida)");
  console.log("[5] P1 (init apaga _directo), la clave, los try, la perilla con _nota y VER INTRO");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
