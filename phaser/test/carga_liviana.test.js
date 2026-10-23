/* ============================================================================
   PAMPA STAR · CARGA LIVIANA (tanda 1.0, L06 · carga-liviana)

   Lo que estaba mal, medido con node sobre los archivos:
     · antes de la compuerta ("TOCÁ PARA EMPEZAR") bajaban 4,28 MB con el
       lienzo en NEGRO: 0,73 MB de scripts en gzip, 0,07 de JSON, 0,15 de
       tipografías y 3,33 MB del preload de la intro, que pedía las 40
       imágenes de los manifiestos cuando el opening usa 18 (1,45 MB). A
       1 Mbps son 35 s sin nada en pantalla;
     · ningún preload escuchaba "progress": entre pantallas, el lienzo negro
       mientras bajaban las poses o las caras;
     · el primer pedirMusica registraba el mapa entero de música en <audio
       preload="auto">: 8 archivos (2,5 MB) bajando juntos, encima de las
       imágenes.

   Qué se prueba, corriendo el código de verdad (no leyendo el texto):
     [1] el preload de la intro pide SOLO la compuerta, y la intro entera
         (compuerta + opening) pesa 1,6 MB o menos;
     [2] las poses que usa intro.js (corriendo la compuerta y los ocho planos
         con una escena de mentira) son exactamente las que baja; ni una de
         menos (el plano se saltearía) ni una de más (peso muerto);
     [3] intro, editor, master y match registran "progress" (la barra de la
         piel), y la barra se ve, dice el porcentaje en texto y se va;
     [4] el cartel de la página: está antes de cualquier script con archivo,
         cuenta bien, sus pesos son los medidos y la compuerta llega con
         2 MB o menos;
     [5] la música nace con preload="none" y se precarga solo el tema que
         viene;
     [6] la cola de segundo plano y lo que baja: la lista del partido es la
         MISMA que pide el preload del partido; el editor y el Master la
         piden; el worker se registra cuando abre la intro.

   Corré:  node phaser/test/carga_liviana.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm"), zlib = require("zlib");
var RAIZ = path.join(__dirname, "..", "..");
function leer(f) { return fs.readFileSync(path.join(RAIZ, f), "utf8"); }
function json(f) { return JSON.parse(leer(f)); }
function peso(rel) { return fs.statSync(path.join(RAIZ, rel)).size; }
/* "../assets/x" (relativa a phaser/index.html) → "assets/x" */
function delRepo(ruta) { return path.normalize(path.join("phaser", ruta)).replace(/\\/g, "/"); }
function mb(b) { return (b / 1048576).toFixed(2).replace(".", ",") + " MB"; }

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

var BAL = json("phaser/data/balance.json");
var POSES = json("data/poses_manifest.json"), CARAS = json("data/caras_manifest.json");
var PORTRAITS = json("data/portraits_manifest.json"), TRIBUNA = json("data/tribuna.json");
var IDENT = json("data/identidades_manifest.json");
var C = require(path.join(RAIZ, "phaser/logic/carga.js"));
var MUS = require(path.join(RAIZ, "phaser/logic/musica.js"));

/* ---------- utilería: un emisor, un loader y una escena de mentira ---------- */
function Emisor() { this._ev = {}; }
Emisor.prototype.on = function (n, fn) { (this._ev[n] = this._ev[n] || []).push({ fn: fn, once: false }); return this; };
Emisor.prototype.once = function (n, fn) { (this._ev[n] = this._ev[n] || []).push({ fn: fn, once: true }); return this; };
Emisor.prototype.off = function (n, fn) { if (this._ev[n]) this._ev[n] = fn ? this._ev[n].filter(function (l) { return l.fn !== fn; }) : []; return this; };
Emisor.prototype.emit = function (n) {
  var a = [].slice.call(arguments, 1), ls = (this._ev[n] || []).slice();
  this._ev[n] = (this._ev[n] || []).filter(function (l) { return !l.once; });
  ls.forEach(function (l) { l.fn.apply(null, a); });
  return ls.length > 0;
};
Emisor.prototype.cuantos = function (n) { return (this._ev[n] || []).length; };
function loaderDeMentira() {
  var L = new Emisor();
  L.pedidos = []; L.list = { size: 0 };
  L.image = function (k, u) { L.pedidos.push({ clave: k, ruta: u, tipo: "image" }); L.list.size++; return L; };
  L.json = function (k, u) { L.pedidos.push({ clave: k, ruta: u, tipo: "json" }); L.list.size++; return L; };
  L.start = function () { L.arrancado = true; L.emit("start", L); };
  return L;
}
function objeto(tipo, extra) {
  var o = { type: tipo, width: 100, height: 100, scale: 1, active: true, destruido: false, texto: "" };
  ["setOrigin", "setScale", "setAlpha", "setDepth", "setVisible", "setAngle", "setTint", "setStrokeStyle", "setScrollFactor",
    "lineStyle", "strokeRect", "fillStyle", "fillRect", "clear", "beginPath", "moveTo", "lineTo", "strokePath", "add", "removeAll"]
    .forEach(function (m) { o[m] = function () { return o; }; });
  o.setText = function (t) { o.texto = String(t); return o; };
  o.destroy = function () { o.destruido = true; o.active = false; };
  return Object.assign(o, extra || {});
}

/* =========================================================================
   [1] y [2] · LA INTRO: QUÉ BAJA Y QUÉ USA
   ========================================================================= */
var W = { PF: { texto: "Pixelify Sans", display: "Pixelify Sans" }, PampaCarga: C };
var ctxI = { window: W, Phaser: { Scene: function () { } }, console: console, Math: Math, JSON: JSON, String: String, localStorage: { getItem: function () { return null; } } };
vm.createContext(ctxI);
vm.runInContext(leer("phaser/scenes/intro.js"), ctxI, { filename: "intro.js" });
var Intro = W.PampaIntro;
var registro = { poses: POSES, caras: CARAS, portraits: PORTRAITS, tribuna: TRIBUNA, balance: BAL };
function registry() { return { get: function (k) { return registro[k]; }, set: function () { } }; }

(function () {
  assert(!!Intro && Array.isArray(Intro.UI_COMPUERTA) && Array.isArray(Intro.UI_OPENING), "intro.js declara PampaIntro.UI_COMPUERTA y UI_OPENING");
  /* el preload, de verdad */
  var s = Object.create(Intro.prototype);
  s.load = loaderDeMentira();
  s.textures = { exists: function () { return false; } };
  s.game = { registry: registry() };
  var barras = 0;
  s.barraDeCarga = function () { barras++; s.load.on("progress", function () { }); };
  s.preload();
  var antes = s.load.pedidos.map(function (p) { return p.clave; });
  assert(antes.length === 1 && antes[0] === "d_logo",
    "SÍNTOMA: el preload de la intro (antes de la compuerta) tiene que pedir SOLO el logo de la compuerta; pidió " + antes.length + ": " + antes.slice(0, 6).join(", "));
  var pesoCompuerta = s.load.pedidos.reduce(function (t, p) { return t + peso(delRepo(p.ruta)); }, 0);
  assert(barras === 1, "el preload de la intro llama a la barra de carga");

  /* lo del opening, con el create de verdad hasta la compuerta */
  s.I = BAL.intro;
  var lista = s.listaOpening();
  var pesoOpening = lista.reduce(function (t, p) { return t + peso(delRepo(p.ruta)); }, 0);
  var total = pesoCompuerta + pesoOpening;
  assert(total <= 1.6 * 1048576, "SÍNTOMA: la intro entera (compuerta + opening) pesa " + mb(total) + " y el tope es 1,6 MB (antes 3,33)");
  console.log("[1] la intro: antes de la compuerta " + mb(pesoCompuerta) + " (1 archivo) · lo del opening " + mb(pesoOpening) + " (" + lista.length + " archivos) · total " + mb(total) + " (tope 1,6; antes 3,33 en 40)");

  /* el opening se baja con la compuerta a la vista: cargarOpening encola,
     arranca el loader y al terminar avisa */
  var s2 = Object.create(Intro.prototype);
  s2.init();
  s2.I = BAL.intro;
  s2.load = loaderDeMentira();
  s2.textures = { exists: function () { return false; } };
  s2.game = { registry: registry() };
  var calentado = [];
  s2.calentarEnSegundoPlano = function (l) { calentado = calentado.concat(l); return l.length; };
  s2.cargarOpening();
  assert(s2.load.arrancado && s2.load.pedidos.length === lista.length, "cargarOpening() pide lo del opening y arranca el loader (" + s2.load.pedidos.length + ")");
  assert(!s2._openingListo, "mientras baja, el opening no está listo");
  var arranco = 0;
  s2.arrancarOpening = function () { arranco++; };
  s2.mostrarEspera = function () { };
  s2.seguirAlOpening();
  assert(arranco === 0 && s2._esperando, "si se toca antes de que baje, espera (no arranca con los planos vacíos)");
  s2.load.emit("progress", 0.5);
  assert(s2._cargaOpening.v === 0.5, "el avance queda anotado para el cartel de la espera");
  s2.load.emit("complete");
  assert(s2._openingListo && arranco === 1, "al terminar de bajar, el opening arranca solo (" + arranco + ")");
  var carasEd = C.listaDelEditor(CARAS).map(function (x) { return x.ruta; });
  /* OJOS (tanda 1.0): 7 y no 8 — la cara de ojos cerrados quedó fuera de
     rotación y no se baja (data/caras_manifest.json, en_rotacion:false) */
  assert(carasEd.length >= 7 && carasEd.every(function (r) { return calentado.some(function (c) { return c.ruta === r; }); }),
    "terminado lo del opening, se bajan en segundo plano las caras del editor (" + calentado.length + ")");
  /* y si ya está todo (VER INTRO desde el editor) arranca de una */
  var s3 = Object.create(Intro.prototype);
  s3.init(); s3.I = BAL.intro; s3.load = loaderDeMentira(); s3.game = { registry: registry() };
  s3.textures = { exists: function () { return true; } };
  var arr3 = 0; s3.arrancarOpening = function () { arr3++; };
  s3.seguirAlOpening();
  assert(arr3 === 1 && !s3.load.arrancado, "con todo en memoria (VER INTRO), el opening arranca sin pedir nada");
  /* P1: init() deja todo de cero */
  var s4 = Object.create(Intro.prototype);
  s4._openingListo = true; s4._esperando = true; s4._cargaOpening = { v: 1 }; s4._salteoArmado = true;
  s4._imgsListas = true; s4._temaPedido = true; s4._temaListo = true; s4._topeTema = {};
  s4.init();
  assert(!s4._openingListo && !s4._esperando && !s4._cargaOpening && !s4._salteoArmado && !s4._imgsListas && !s4._temaPedido && !s4._temaListo && !s4._topeTema,
    "init() reinicia lo de la carga, también lo del tema (Phaser reusa la escena: P1)");

  /* REVISIÓN DEL LOTE · EL TEMA DEL OPENING, CON LA COMPUERTA. Antes la
     música se registraba recién en p2 (preload="none"): con poca señal, el
     opening de la primera visita arrancaba mudo (4,2 s medidos) */
  function introConTema(conArchivo) {
    var X = { pedidos: [], avisos: {}, demoras: [], regs: 0, arranco: 0 };
    var q = Object.create(Intro.prototype);
    q.init(); q.I = BAL.intro; q.load = loaderDeMentira(); q.game = { registry: registry() };
    q.textures = { exists: function () { return false; } };
    q.time = { delayedCall: function (ms, fn) { var d = { ms: ms, fn: fn }; X.demoras.push(d); return d; } };
    q.registrarMusicaGlobal = function () { X.regs++; return 10; };
    q.arrancarOpening = function () { X.arranco++; }; q.mostrarEspera = function () { }; q.calentarEnSegundoPlano = function () { return 0; };
    W.PampaSFX = { precargarTemas: function (ids) { X.pedidos.push(ids.join(",")); return 1; }, hayArchivo: function (id) { return conArchivo && id === "opening"; },
      cuandoTemaListo: function (id, cb) { X.avisos[id] = cb; return false; } };
    X.q = q;
    return X;
  }
  var A5 = introConTema(true);
  A5.q.cargarOpening();
  assert(A5.regs === 1 && A5.pedidos.join("|") === "opening" && typeof A5.avisos.opening === "function",
    "SÍNTOMA: con la compuerta a la vista se registra la música y se baja el tema del opening (antes, recién en p2: el opening arrancaba mudo)");
  A5.q.seguirAlOpening();          // tocan antes de que baje
  A5.q.load.emit("complete");
  assert(A5.arranco === 0 && !A5.q._openingListo, "con las imágenes ya bajadas, la espera sigue esperando al tema");
  assert(A5.demoras.length === 1 && A5.demoras[0].ms === BAL.intro.tema_tope_ms && BAL.intro.tema_tope_ms > 0, "con su tope, balance.intro.tema_tope_ms (" + BAL.intro.tema_tope_ms + ")");
  A5.avisos.opening();
  assert(A5.arranco === 1 && A5.q._openingListo, "cuando el tema puede sonar entero, el opening arranca solo");
  var B5 = introConTema(true);
  B5.q.cargarOpening(); B5.q.seguirAlOpening(); B5.q.load.emit("complete");
  B5.demoras[0].fn();
  assert(B5.arranco === 1, "si el tema no llega (red colgada), al vencer el tope el opening arranca igual");
  var C5 = introConTema(false);
  C5.q.cargarOpening(); C5.q.seguirAlOpening(); C5.q.load.emit("complete");
  assert(C5.arranco === 1 && C5.pedidos.length === 0, "sin archivo para el opening, no hay nada que esperar");
  /* el cartel de la espera: "CARGANDO LA INTRO… NN%" (decía "EL OPENING"; el
     botón del editor que lleva acá dice "▶ VER INTRO") */
  var D5 = introConTema(true);
  D5.q._espera = { txt: objeto("Text"), g: objeto("Graphics"), y: 360 };
  D5.q._cargaOpening = { v: 0.5 };
  D5.q.pintarEspera();
  var txtEspera = D5.q._espera.txt.texto;
  assert(BAL.intro.t_cargando_intro === "CARGANDO LA INTRO…" && /^CARGANDO LA INTRO… \d+%$/.test(txtEspera) && !/OPENING/.test(txtEspera),
    "la espera dice " + txtEspera + " (el texto en balance.intro.t_cargando_intro)");
  assert(/VER INTRO/.test(leer("phaser/scenes/editor.js")), "y el botón del editor sigue diciendo VER INTRO (la misma palabra)");
  /* el tema pesa en la barra lo que pesa en el disco */
  var m5 = leer("phaser/scenes/intro.js").match(/const PESO_TEMA = ([0-9.]+);/);
  var temaOp = peso("assets/musica/" + json("data/audio.json").temas.opening.archivo);
  var pesoImgs = C.listaDelOpening(BAL.intro, POSES, Intro.UI_OPENING).reduce(function (t, p) { return t + peso(delRepo(p.ruta)); }, 0);
  var medido = temaOp / (temaOp + pesoImgs);
  assert(m5 && Math.abs(Number(m5[1]) - medido) < 0.03, "PESO_TEMA (" + (m5 && m5[1]) + ") es lo que pesa el tema al lado de las imágenes, medido en el disco (" + medido.toFixed(3) + ")");
  delete W.PampaSFX;
  console.log("[1b] el tema del opening se baja con la compuerta; la espera dice \"" + txtEspera + "\" y espera al tema (tope " + BAL.intro.tema_tope_ms + " ms)");
})();

(function () {
  /* [2] los ocho planos, con una escena que anota qué texturas pregunta y usa */
  var usadas = {};
  var s = Object.create(Intro.prototype);
  s.init(); s.I = BAL.intro;
  s.textures = { exists: function (k) { usadas[k] = 1; return true; } };
  function img(x, y, k) { usadas[k] = 1; return objeto("Image"); }
  s.add = { image: img, sprite: img, text: function () { return objeto("Text"); }, rectangle: function () { return objeto("Rectangle"); },
    graphics: function () { return objeto("Graphics"); }, circle: function () { return objeto("Arc"); }, container: function () { return objeto("Container"); } };
  s.capa = objeto("Container"); s.fxG = objeto("Graphics");
  s.tweens = { add: function () { }, killAll: function () { }, killTweensOf: function () { } };
  s.time = { now: 0, delayedCall: function (ms, fn) { fn(); }, addEvent: function () { } };
  s.cameras = { main: { shake: function () { }, flash: function () { }, fadeOut: function () { } } };
  s.input = { once: function () { }, on: function () { }, keyboard: { once: function () { }, on: function () { } } };
  s.sys = { game: { device: { input: { touch: true } } } };
  s.pedirMusica = function () { };
  /* OJOS (tanda 1.0): poseImg mira en el manifest si la pose declara
     'pelota' (para ponerle la pelota de potrero en el hueco), así que la
     escena de mentira lleva su registry, como la de verdad */
  s.game = { registry: registry() };
  require("./_cuidado_de_mentira.js")(s);
  s.compuerta();
  [s.p1, s.p2, s.p3, s.p4, s.p5, s.p6, s.p7, s.p8].forEach(function (fn) { s.corteSeco(); fn.call(s, 1000); });
  var deAsset = Object.keys(usadas).filter(function (k) { return /^(pose_|fondo_|i_|bg\d|d_)/.test(k); });
  var baja = {};
  Intro.UI_COMPUERTA.concat(C.listaDelOpening(BAL.intro, POSES, Intro.UI_OPENING)).forEach(function (x) { baja[x.clave] = 1; });
  var faltan = deAsset.filter(function (k) { return !baja[k]; });
  var sobran = Object.keys(baja).filter(function (k) { return !usadas[k]; });
  assert(faltan.length === 0, "SÍNTOMA: intro.js usa ilustraciones que la intro no baja (el plano se saltearía): " + faltan.join(", ") +
    " → sumalas a balance.intro.poses_intro / fondos_intro o a PampaIntro.UI_OPENING");
  assert(sobran.length === 0, "la intro baja ilustraciones que ningún plano usa (peso muerto antes del opening): " + sobran.join(", "));
  var poses = deAsset.filter(function (k) { return /^pose_/.test(k); }).map(function (k) { return k.slice(5); }).sort();
  assert(JSON.stringify(poses) === JSON.stringify(BAL.intro.poses_intro.slice().sort()),
    "las poses que usan los planos son las de balance.intro.poses_intro (" + poses.join(", ") + ")");
  assert(typeof BAL.intro._carga === "string" && /poses_intro/.test(BAL.intro._carga), "balance.intro._carga explica las listas");
  /* revisión del lote: si balance.json pasa su tope de 8 s, index.html
     sigue con BALANCE_FALLBACK, que no trae las listas: el opening bajaba
     sin poses ni tribuna. logic/carga.js tiene el mismo respaldo */
  var HTMLi = leer("phaser/index.html").replace(/\r\n/g, "\n");
  var mFB = HTMLi.match(/const BALANCE_FALLBACK = (\{[\s\S]*?\n  \});/);
  var FB = mFB ? new Function("return " + mFB[1])() : null;
  var conFB = FB ? C.listaDelOpening(FB.intro, POSES, Intro.UI_OPENING).map(function (x) { return x.clave; }).sort() : [];
  var conBAL = C.listaDelOpening(BAL.intro, POSES, Intro.UI_OPENING).map(function (x) { return x.clave; }).sort();
  assert(!!FB && JSON.stringify(conFB) === JSON.stringify(conBAL),
    "SÍNTOMA: con el balance de respaldo (BALANCE_FALLBACK) la intro baja las mismas " + conBAL.length + " ilustraciones que con el de verdad (bajaba " + conFB.length + ")");
  assert(JSON.stringify(C.OPENING_DEF.poses_intro) === JSON.stringify(BAL.intro.poses_intro) && JSON.stringify(C.OPENING_DEF.fondos_intro) === JSON.stringify(BAL.intro.fondos_intro),
    "el respaldo de logic/carga.js (OPENING_DEF) es igual a balance.intro: si cambia uno, hay que cambiar el otro");
  console.log("[2] los ocho planos usan " + deAsset.length + " ilustraciones y la intro baja esas mismas (" + poses.length + " poses: " + poses.join(", ") + ")");
})();

/* =========================================================================
   [3] · LA BARRA DE CARGA EN LOS CUATRO PRELOAD
   ========================================================================= */
var Wp = { PF: { texto: "Pixelify Sans", display: "Pixelify Sans" }, PampaPiel: require(path.join(RAIZ, "phaser/logic/piel.js")) };
var ctxP = { window: Wp, Phaser: { Scenes: { LOADING: 3, CREATING: 4, SLEEPING: 7 } }, console: console, Math: Math, JSON: JSON, String: String };
vm.createContext(ctxP);
vm.runInContext(leer("phaser/scenes/piel_ui.js"), ctxP, { filename: "piel_ui.js" });
var PIEL = Wp.PampaPielUI;

function escenaConBarra(Clase, extra) {
  var s = Object.create(Clase.prototype);
  Object.keys(PIEL).forEach(function (k) { if (!s[k]) s[k] = PIEL[k]; });
  s.barraDeCarga = PIEL.barraDeCarga;
  s.load = loaderDeMentira();
  s.events = new Emisor();
  s.sys = { settings: { status: 3 } };
  s.textures = { exists: function () { return false; } };
  s.game = { registry: registry() };
  var dibujados = [];
  s.add = {
    text: function (x, y, t) { var o = objeto("Text"); o.setText(t); dibujados.push(o); return o; },
    graphics: function () { var o = objeto("Graphics"); dibujados.push(o); return o; },
    image: function () { return objeto("Image"); }
  };
  s.dibujados = dibujados;
  return Object.assign(s, extra || {});
}
function cargarClase(archivo, global) {
  var Wc = { Phaser: { Scene: function () { } }, PF: Wp.PF };
  try { new Function("window", "Phaser", leer(archivo).replace(/\r\n/g, "\n"))(Wc, Wc.Phaser); } catch (e) { assert(false, archivo + " no carga con el Phaser de mentira: " + e.message); }
  return Wc[global];
}
(function () {
  var clases = { intro: Intro, editor: cargarClase("phaser/scenes/editor.js", "PampaEditor"),
    master: cargarClase("phaser/scenes/master.js", "PampaMasterScene"), match: cargarClase("phaser/scenes/match.js", "PampaMatch") };
  Object.keys(clases).forEach(function (k) {
    var Cl = clases[k];
    if (!Cl) { assert(false, "no se pudo cargar la escena " + k); return; }
    var s = escenaConBarra(Cl);
    try { s.preload(); } catch (e) { assert(false, k + ".preload() tiró con la escena de mentira: " + e.message); return; }
    assert(s.load.cuantos("progress") >= 1, "SÍNTOMA: el preload de " + k + " no escucha 'progress' (sin barra de carga, el lienzo queda negro)");
  });

  /* la barra de verdad: aparece al arrancar con algo para bajar, dice el % y se va */
  var s = escenaConBarra(clases.editor);
  s.preload();
  s.load.emit("start", s.load);
  var txt = s.dibujados.filter(function (o) { return o.type === "Text"; })[0];
  assert(!!txt && /CARGANDO LAS CARAS… 0%/.test(txt.texto), "al arrancar la carga se ve \"CARGANDO LAS CARAS… 0%\" (" + (txt && txt.texto) + ")");
  s.load.emit("progress", 0.437);
  assert(txt && /43%/.test(txt.texto), "el porcentaje va ESCRITO (no solo la barra): " + (txt && txt.texto));
  s.load.emit("complete");
  assert(s.dibujados.every(function (o) { return o.destruido; }), "al terminar la carga la barra se va");
  s.load.emit("progress", 0.9);
  assert(s.dibujados.filter(function (o) { return o.type === "Text"; }).length === 1, "terminada, ya no escucha (la intro reusa el loader en create)");
  /* sin nada que bajar no aparece; en create (CREATING) no dibuja */
  var s2 = escenaConBarra(clases.master);
  s2.textures = { exists: function () { return true; } };
  s2.barraDeCarga("la carrera");
  s2.load.list.size = 0;
  s2.load.emit("start", s2.load);
  assert(s2.dibujados.length === 0, "sin nada que bajar (todo en memoria) la barra no aparece");
  var s3 = escenaConBarra(clases.master);
  s3.barraDeCarga("la carrera");
  s3.sys.settings.status = 4;
  s3.load.list.size = 3;
  s3.load.emit("start", s3.load); s3.load.emit("progress", 0.5);
  assert(s3.dibujados.length === 0, "fuera del preload (escena en CREATING) la barra no se dibuja");
  s3.events.emit("create");
  assert(s3.load.cuantos("progress") === 0, "al crear la escena la barra se desengancha del loader");
  /* con el cartel de la página a la vista, el avance va ahí */
  var fases = [];
  Wp.PampaCartel = { visible: function () { return true; }, fase: function (n, v) { fases.push(n + ":" + v); } };
  var s4 = escenaConBarra(Intro);
  s4.barraDeCarga("el arranque");
  s4.load.list.size = 1;
  s4.load.emit("start", s4.load); s4.load.emit("progress", 1);
  assert(s4.dibujados.length === 0 && fases.join(",") === "escena:0,escena:1", "con el cartel de la página a la vista, el avance va al cartel (" + fases.join(",") + ")");
  delete Wp.PampaCartel;
  /* P1: la barra no deja nada en la escena */
  var s5 = escenaConBarra(clases.match);
  var antes = Object.keys(s5).length;
  s5.barraDeCarga("el partido");
  assert(Object.keys(s5).length === antes, "la barra no escribe campos en la escena (su estado vive en el cierre: P1)");
  /* revisión del 20/oct: setText sobre el texto destruido tiraba "reading 'cut'" */
  var s6 = escenaConBarra(clases.match);
  s6.barraDeCarga("el partido");
  s6.load.list.size = 3;
  s6.load.emit("start", s6.load);
  s6.dibujados.forEach(function (o) { o.destroy(); });
  s6.load.emit("progress", 0.5);
  var vivos = s6.dibujados.filter(function (o) { return o.type === "Text" && o.active; });
  assert(vivos.length === 1 && /50%/.test(vivos[0].texto), "si la escena borró la barra, el avance la arma de nuevo y no escribe en la destruida");
  s6.events.emit("shutdown");
  assert(s6.load.cuantos("progress") === 0 && !vivos[0].active, "la escena cortada con el loader andando cierra la barra");
  console.log("[3] intro, editor, master y match escuchan 'progress'; la barra dice \"" + txt.texto + "\" y se va al terminar");
})();

/* =========================================================================
   [4] · EL CARTEL DE LA PÁGINA Y LA COMPUERTA EN 2 MB
   ========================================================================= */
var HTML = leer("phaser/index.html").replace(/\r\n/g, "\n");
(function () {
  var iCartel = HTML.indexOf('<div id="cargando"'), iScript = HTML.indexOf("<script src"), iRed = HTML.indexOf("window.PampaRed = {");
  assert(iCartel > 0 && iCartel < iScript && iCartel < iRed, "el cartel de carga está en el HTML antes de cualquier script (se ve desde el primer byte)");
  assert(/PAMPA STAR<\/b> · cargando… <span id="cg-pct">0%<\/span>/.test(HTML), "el cartel dice \"PAMPA STAR · cargando… NN%\"");
  var z = function (sel) { var m = HTML.match(new RegExp(sel + "\\{[^}]*z-index:(\\d+)")); return m ? +m[1] : null; };
  assert(z("#cargando") > 0 && z("#cargando") < z("#rotate") && z("#cargando") < z("#trabado"),
    "el cartel va debajo del \"Girá el celular\" (" + z("#rotate") + ") y de \"Algo se trabó\" (" + z("#trabado") + "): z " + z("#cargando"));
  var scripts = [];
  HTML.replace(/<script>([\s\S]*?)<\/script>/g, function (_, c) { scripts.push(c); return _; });
  var codigo = scripts.filter(function (c) { return c.indexOf("window.PampaCartel = {") >= 0; })[0] || "";
  assert(codigo.length > 0, "se puede cortar el script del cartel");
  /* corre con un DOM de mentira */
  var els = {}, oyentes = {}, timers = [];
  ["cargando", "cg-pct", "cg-relleno", "cg-barra", "cg-nota", "rot-carga"].forEach(function (id) {
    els[id] = { hidden: id === "cg-nota", textContent: "", style: {}, attrs: {}, setAttribute: function (k, v) { this.attrs[k] = v; } };
  });
  var win = { addEventListener: function (t, fn, cap) { (oyentes[t] = oyentes[t] || []).push({ fn: fn, cap: cap }); } };
  var doc = { getElementById: function (id) { return els[id] || null; }, addEventListener: function (t, fn, cap) { (oyentes["doc:" + t] = oyentes["doc:" + t] || []).push({ fn: fn, cap: cap }); } };
  var ctx = { window: win, document: doc, setTimeout: function (fn, ms) { timers.push({ fn: fn, ms: ms }); }, String: String, Math: Math };
  vm.createContext(ctx);
  vm.runInContext(codigo, ctx, { filename: "index.html (cartel)" });
  var K = win.PampaCartel;
  var nSrc = (HTML.match(/<script src="/g) || []).length;
  assert(K && K.SCRIPTS === nSrc, "PampaCartel.SCRIPTS (" + (K && K.SCRIPTS) + ") es la cantidad de scripts con archivo de index.html (" + nSrc + ")");
  var nJson = (HTML.match(/jsonConTope\("[^"]+"/g) || []).length;
  assert(K && K.DATOS === nJson + 1, "PampaCartel.DATOS (" + (K && K.DATOS) + ") son los " + nJson + " JSON del arranque más las tipografías");
  var carga = (oyentes["doc:load"] || []).filter(function (o) { return o.cap; })[0];
  assert(!!carga && !(oyentes.load || []).length, "SÍNTOMA: el load de cada script se escucha en CAPTURA en el DOCUMENTO (a la ventana no le llega ningún load de un elemento: el cartel quedaba en 27% con el juego creado)");
  function cargoScript() { carga.fn({ target: { tagName: "SCRIPT", src: "x.js" } }); }
  for (var i = 0; i < nSrc; i++) cargoScript();
  var p1 = K.pct;
  assert(p1 >= 70 && p1 <= 76 && els["cg-pct"].textContent === p1 + "%", "con los scripts bajados el cartel dice " + p1 + "% (el peso de los scripts)");
  carga.fn({ target: doc }); carga.fn({ target: { tagName: "IMG", src: "a.png" } });
  assert(K.pct === p1, "el load del documento o de una imagen no cuenta como script");
  for (var j = 0; j < K.DATOS; j++) K.dato();
  K.fase("escena", 0.5);
  var p2 = K.pct;
  K.fase("escena", 0.2);
  assert(K.pct === p2 && p2 > p1 && p2 < 100, "el cartel nunca va para atrás (" + p1 + " → " + p2 + ")");
  K.fase("escena", 1);
  assert(K.pct === 100 && els["cg-relleno"].style.width === "100%" && els["cg-barra"].attrs["aria-valuenow"] === "100", "todo bajado: 100% en el texto, la barra y aria-valuenow");
  assert(els["rot-carga"].textContent === "cargando… 100%", "en vertical, el \"Girá el celular\" repite el porcentaje");
  var nota = timers.filter(function (t) { return t.ms === 6000; })[0];
  assert(!!nota, "a los 6 s aparece la nota de la señal floja");
  nota.fn();
  assert(!els["cg-nota"].hidden, "la nota se ve si el cartel sigue");
  assert(K.sacar() && els.cargando.hidden && !K.visible() && !K.sacar(), "sacar() lo esconde una vez");
  var intro = leer("phaser/scenes/intro.js");
  assert(/create\(\) \{[\s\S]{0,900}window\.PampaCartel\.sacar\(\)/.test(intro), "la intro saca el cartel en su create");

  /* los pesos del cartel, medidos con el disco (gzip 9, como sirve el hosting) */
  var gz = function (rel) { return zlib.gzipSync(fs.readFileSync(path.join(RAIZ, rel)), { level: 9 }).length; };
  var bS = 0; HTML.replace(/<script src="([^"]+)"/g, function (_, f) { bS += gz("phaser/" + f); });
  var bJ = 0; HTML.replace(/jsonConTope\("([^"]+)"/g, function (_, f) { bJ += gz(delRepo(f)); });
  var bF = 0; ["PressStart2P-Regular.ttf", "PixelifySans-Regular.ttf", "VT323-Regular.ttf"].forEach(function (f) { bF += gz("assets/fonts/" + f); });
  var bE = Intro.UI_COMPUERTA.reduce(function (t, u) { return t + peso(delRepo(u.ruta)); }, 0);
  var tot = bS + bJ + bF + bE;
  var medidos = { scripts: bS / tot, datos: (bJ + bF) / tot, escena: bE / tot };
  Object.keys(medidos).forEach(function (k) {
    assert(Math.abs(K.PESOS[k] - medidos[k]) <= 0.05, "el peso '" + k + "' del cartel (" + K.PESOS[k] + ") es el medido (" + medidos[k].toFixed(3) + ")");
  });
  /* LA COMPUERTA EN 2 MB: el html, los scripts, los JSON, las tipografías y
     el preload de la intro. El criterio pide sumar transferSize en el
     navegador (eso se mide en pantalla); esto es la cuenta con el disco,
     para que una tanda futura no lo pase sin que nadie se entere. */
  var bHtml = gz("phaser/index.html");
  var compuerta = bHtml + tot;
  assert(compuerta <= 2 * 1048576, "SÍNTOMA: la compuerta llega con " + mb(compuerta) + " bajados y el tope es 2 MB (antes 4,28)");
  console.log("[4] el cartel cuenta " + nSrc + " scripts y " + K.DATOS + " datos, pesos medidos " + medidos.scripts.toFixed(2) + "/" + medidos.datos.toFixed(2) + "/" + medidos.escena.toFixed(2) + " · la compuerta llega con " + mb(compuerta) + " (tope 2; antes 4,28)");
})();

/* =========================================================================
   [5] · LA MÚSICA NACE SIN BAJAR; SE PRECARGA EL TEMA QUE VIENE
   ========================================================================= */
(function () {
  var creados = [];
  function FakeAudio(src) { this.src = src; this.paused = true; this.volume = 1; this.muted = false; this.loop = false; this.currentTime = 0; this.readyState = 0; this.networkState = 0; this.cargas = 0; this.preload = "auto"; creados.push(this); }
  FakeAudio.prototype.play = function () { this.paused = false; this.networkState = 2; return { catch: function () { } }; };
  FakeAudio.prototype.pause = function () { this.paused = true; };
  FakeAudio.prototype.load = function () { this.cargas++; this.networkState = 2; };
  FakeAudio.prototype.addEventListener = function (ev, fn) { (this._l = this._l || {}); (this._l[ev] = this._l[ev] || []).push(fn); };
  FakeAudio.prototype.removeEventListener = function (ev, fn) { if (this._l && this._l[ev]) this._l[ev] = this._l[ev].filter(function (x) { return x !== fn; }); };
  FakeAudio.prototype.disparar = function (ev) { ((this._l && this._l[ev]) || []).slice().forEach(function (fn) { fn(); }); };
  var g = { Audio: FakeAudio, setTimeout: function () { return 1; }, clearTimeout: function () { }, setInterval: function () { return 1; }, clearInterval: function () { },
    performance: { now: function () { return 0; } }, localStorage: { getItem: function () { return null; }, setItem: function () { } }, console: console, Math: Math };
  g.window = g; g.self = g;
  var ctx = vm.createContext(g);
  vm.runInContext(leer("phaser/audio/sfx.js"), ctx, { filename: "sfx.js" });
  var S = g.PampaSFX;
  S.registrarArchivos(MUS.mapaCompleto(json("data/audio.json"), 0, "../assets/musica/"), 0.42);
  assert(creados.length >= 6 && creados.every(function (a) { return a.preload === "none"; }),
    "SÍNTOMA: los <audio> nacen con preload=\"none\" (antes \"auto\": el mapa entero bajando junto) — " + creados.map(function (a) { return a.preload; }).join(","));
  S.musicaTema("opening");
  var ab = creados.filter(function (a) { return a.preload === "auto"; }).map(function (a) { return a.src.split("/").pop(); });
  assert(ab.length === 1 && /Victory/.test(ab[0]), "al pedir el opening se baja SOLO el opening (" + ab.join(", ") + ")");
  var opening = creados.filter(function (a) { return /Victory/.test(a.src); })[0];
  var n0 = S.precargarTemas(MUS.siguientes("opening"));
  assert(n0 === 0 && creados.filter(function (a) { return a.preload === "auto"; }).length === 1,
    "SÍNTOMA: mientras el opening no puede sonar, lo que viene NO se baja (medido con Slow 4G: los tres juntos dejaban al opening mudo 20 s)");
  opening.readyState = 4; opening.disparar("canplaythrough");
  var auto = creados.filter(function (a) { return a.preload === "auto"; });
  assert(auto.length === 3, "con el opening listo para sonar, el tema que viene (espera y entrada) se precarga y el resto no (" + auto.length + " de " + creados.length + ")");
  var n = 2;
  assert(auto.filter(function (a) { return a.cargas === 1; }).length === 2, "los que nunca empezaron a bajar arrancan con load()");
  assert(S.precargarTemas(MUS.siguientes("opening")) === 0 && creados.filter(function (a) { return a.preload === "auto"; }).length === 3, "precargar dos veces no repite");
  var listo = 0; S.cuandoSuenaListo(function () { listo++; });
  assert(listo === 1, "con el tema que suena ya listo, cuandoSuenaListo avisa en el acto");
  /* revisión del lote: cuandoTemaListo, para un tema que todavía no suena
     (la compuerta espera al del opening) */
  var espera = creados.filter(function (a) { return a.src === MUS.mapaCompleto(json("data/audio.json"), 0, "../assets/musica/").espera.archivo; })[0];
  var avisoE = 0;
  assert(S.cuandoTemaListo("espera", function () { avisoE++; }) === false && avisoE === 0, "cuandoTemaListo espera a que el tema pueda sonar");
  espera.disparar("canplaythrough");
  assert(avisoE === 1, "y avisa con canplaythrough");
  var avisoX = 0; S.cuandoTemaListo("no_existe", function () { avisoX++; });
  assert(avisoX === 1, "sin archivo para ese momento, avisa en el acto");
  var hype = creados.filter(function (a) { return /Beyond_the_Mushroom/.test(a.src); })[0];
  hype.error = { code: 4 };
  var avisoH = 0; S.cuandoTemaListo("hype", function () { avisoH++; });
  assert(avisoH === 1, "si el tema ya falló (un iOS viejo sin OGG Opus), avisa en el acto: no queda esperando un evento que no vuelve");
  hype.error = null;
  /* la tabla: cada momento con tema tiene su siguiente, y todos existen */
  var conTema = MUS.lista().filter(function (m) { return MUS.temaDe(m, 0); });
  conTema.forEach(function (m) {
    var sig = MUS.siguientes(m);
    assert(sig.length >= 1 && sig.every(function (x) { return MUS.existe(x) && MUS.temaDe(x, 0); }), "'" + m + "' tiene tema siguiente válido (" + sig.join(",") + ")");
  });
  var piel = leer("phaser/scenes/piel_ui.js");
  assert(/S\.precargarTemas\(M\.siguientes\(momento, \{ cierre: !!opts\.cierre \}\)\)/.test(piel), "la puerta de la música (pedirMusica) precarga el tema que viene (con el cierre de la temporada)");
  /* REVISIÓN DEL LOTE · CADA TEMA TIENE UN CAMINO DE PRECARGA. 'hype' (el
     ascenso, el título) no estaba en ningún "siguientes": sonaba recién
     cuando bajaba, con el worker esperando el archivo entero (363 KB). Cada
     momento con archivo tiene que llegar precargado por algún lado: por la
     tabla (con o sin el cierre de la temporada), por compartir el archivo
     con uno que sí, o, el del opening, por la compuerta (intro.js) */
  var mapa0 = MUS.mapaCompleto(json("data/audio.json"), 0, "../assets/musica/");
  var precargados = {};
  MUS.lista().forEach(function (m) {
    MUS.siguientes(m).concat(MUS.siguientes(m, { cierre: true })).forEach(function (x) { if (mapa0[x]) precargados[mapa0[x].archivo] = true; });
  });
  if (/S\.precargarTemas\(\["opening"\]\)/.test(leer("phaser/scenes/intro.js")) && mapa0.opening) precargados[mapa0.opening.archivo] = true;
  var sinCamino = Object.keys(mapa0).filter(function (m) { return !precargados[mapa0[m].archivo]; });
  assert(sinCamino.length === 0, "SÍNTOMA: estos momentos tienen archivo y nadie los precarga: " + sinCamino.join(", "));
  assert(MUS.siguientes("espera").indexOf("hype") < 0 && MUS.siguientes("espera", { cierre: true }).indexOf("hype") >= 0 && MUS.siguientes("semana", { cierre: true }).indexOf("hype") >= 0,
    "'hype' se precarga solo en la última fecha, desde la tabla y la semana (en las otras no se escucha)");
  var TEMP = require(path.join(RAIZ, "phaser/logic/temporada.js"));
  var fx = new Array(18);
  assert(!TEMP.ultimaFecha({ fecha: 0, fixture: fx }) && !TEMP.ultimaFecha({ fecha: 16, fixture: fx }) && TEMP.ultimaFecha({ fecha: 17, fixture: fx }) && TEMP.ultimaFecha({ fecha: 18, fixture: fx }) && !TEMP.ultimaFecha(null),
    "PampaTemporada.ultimaFecha: la fecha 18 de 18 (y la temporada terminada), no antes");
  var srcM = leer("phaser/scenes/master.js");
  assert(/this\.pedirMusica\("espera", \{ cierre: this\.T\.ultimaFecha\(/.test(srcM) && /this\.pedirMusica\("semana", \{ cierre: this\.T\.ultimaFecha\(/.test(srcM),
    "el Master pasa el cierre en la tabla y en la semana");
  console.log("[5] música: " + creados.length + " <audio> con preload=none; con el opening sonando se bajan 3 (" + auto.map(function (a) { return a.src.split("/").pop().replace(".ogg", ""); }).join(", ") + ")");
})();

/* =========================================================================
   [6] · EN SEGUNDO PLANO: LA COLA, LA LISTA DEL PARTIDO Y EL WORKER
   ========================================================================= */
(function () {
  /* la cola: de a dos, sin repetir, frena cuando alguien carga de verdad */
  var pend = [];
  var K = C.crearCalentador({ paralelas: 2, pedir: function (r) { return new Promise(function (res, rej) { pend.push({ r: r, res: res, rej: rej }); }); } });
  assert(K.agregar(["a", "b", "c", { ruta: "d" }, "a"]) === 4, "la cola no repite rutas");
  assert(pend.length === 2 && K.estado().pendientes === 2, "baja de a dos (" + pend.length + ")");
  assert(K.frenar() === 2 && K.estado().pendientes === 0, "frenar() saca lo que no salió");
  pend[0].res(); pend[1].rej();
  return new Promise(function (r) { setImmediate(r); }).then(function () {
    var e = K.estado();
    assert(e.hechos === 1 && e.fallados === 1 && e.enCurso === 0, "lo que estaba bajando termina (" + JSON.stringify(e) + ")");
    assert(K.agregar(["b", "c"]) === 2, "lo que falló o se frenó se puede volver a pedir");
  }).then(function () {
    /* la lista del partido es LA MISMA que pide el preload del partido */
    var Wm = { Phaser: { Scene: function () { } }, PF: Wp.PF };
    new Function("window", "Phaser", leer("phaser/scenes/match.js").replace(/\r\n/g, "\n"))(Wm, Wm.Phaser);
    var s = Object.create(Wm.PampaMatch.prototype);
    s.load = loaderDeMentira();
    s.textures = { exists: function () { return false; } };
    s.game = { registry: registry() };
    s.preload();
    s.load.emit("filecomplete-json-identidades_man", "identidades_man", "json", IDENT);
    var pide = s.load.pedidos.filter(function (p) { return p.tipo === "image"; }).map(function (p) { return p.ruta; }).sort();
    var lista = C.listaDelPartido({ poses: POSES, caras: CARAS, portraits: PORTRAITS, tribuna: TRIBUNA, identidades: IDENT }).map(function (x) { return x.ruta; }).sort();
    var faltan = pide.filter(function (r) { return lista.indexOf(r) < 0; }), sobran = lista.filter(function (r) { return pide.indexOf(r) < 0; });
    assert(faltan.length === 0 && sobran.length === 0, "SÍNTOMA: listaDelPartido (lo que bajan el editor y el Master) no es lo que pide el partido · faltan: " + faltan.join(", ") + " · sobran: " + sobran.join(", "));
    /* 23/oct, pedido de Rodri: con una cara de VOS que tiene su corrida, el
       partido pide ese par y no el ciclo, y la lista dice lo mismo */
    Wm.PampaCarga = C;
    var s2 = Object.create(Wm.PampaMatch.prototype);
    s2.load = loaderDeMentira();
    s2.textures = { exists: function () { return false; } };
    s2.game = { registry: registry() };
    s2.caraDeVos = function () { return "rulos"; };
    s2.preload();
    s2.load.emit("filecomplete-json-identidades_man", "identidades_man", "json", IDENT);
    var pide2 = s2.load.pedidos.filter(function (p) { return p.tipo === "image"; }).map(function (p) { return p.ruta; }).sort();
    var lista2 = C.listaDelPartido({ poses: POSES, caras: CARAS, portraits: PORTRAITS, tribuna: TRIBUNA, identidades: IDENT, caraVos: "rulos" }).map(function (x) { return x.ruta; }).sort();
    assert(pide2.join("|") === lista2.join("|"), "con la cara de VOS, listaDelPartido es lo que pide el partido");
    assert(pide2.some(function (r) { return /pose_corriendo_rulos\.webp$/.test(r); }) && pide2.some(function (r) { return /pose_corriendo_rulos_izq\.webp$/.test(r); }) &&
      !pide2.some(function (r) { return /pose_corriendo_[123]\.webp$/.test(r) || /pose_corriendo_melena/.test(r); }) &&
      !pide.some(function (r) { return /pose_corriendo_rulos/.test(r); }),
      "con rulos se pide su corrida y no el ciclo ni otro pelo; sin cara, la clásica con su ciclo");
    var pesoP = lista.reduce(function (t, r) { return t + peso(delRepo(r)); }, 0);
    ["editor", "master"].forEach(function (k) {
      var src = leer("phaser/scenes/" + k + ".js").replace(/\r\n/g, "\n");
      assert(/create\(\) \{[\s\S]{0,700}this\.calentarElPartido\(\)/.test(src), k + ".js: create() baja lo del partido en segundo plano");
    });
    /* el worker se registra cuando abre la intro, no en "load" */
    var i0 = HTML.indexOf("LA RED (tanda 1.0, L05)");
    var ini = HTML.indexOf("*/", i0) + 2, fin = HTML.indexOf("</script>", ini);
    var codigo = HTML.slice(ini, fin);
    function correrRed(controlador) {
      var oy = {}, regs = 0, timers = [];
      var ctx = {
        PampaCarga: C, PAMPA_VERSION: "v", PampaRed: { tipo: null },
        document: { getElementById: function () { return null; } },
        performance: { setResourceTimingBufferSize: function () { }, getEntriesByType: function () { return []; }, now: function () { return 0; } },
        location: { search: "", protocol: "https:", hostname: "x.test", reload: function () { } },
        navigator: { serviceWorker: { controller: controlador, addEventListener: function () { }, startMessages: function () { },
          register: function () { regs++; return Promise.resolve(); } } },
        addEventListener: function (t, fn) { (oy[t] = oy[t] || []).push(fn); },
        setTimeout: function (fn, ms) { timers.push({ fn: fn, ms: ms }); return timers.length; }, clearTimeout: function () { }, console: console
      };
      ctx.window = ctx;
      vm.createContext(ctx);
      vm.runInContext(codigo, ctx, { filename: "index.html (LA RED)" });
      return { ctx: ctx, regs: function () { return regs; }, load: function () { (oy.load || []).forEach(function (f) { f(); }); }, timers: timers };
    }
    var R1 = correrRed(null);
    R1.load();
    assert(R1.regs() === 0, "SÍNTOMA: en la primera visita el worker NO se registra en \"load\" (su instalación le peleaba la señal a la compuerta)");
    R1.ctx.PampaRegistrarSW("espera");
    assert(R1.regs() === 0, "SÍNTOMA (revisión del lote): tampoco al ABRIR la intro, que es cuando baja lo del opening (antes se registraba ahí)");
    R1.timers.filter(function (t) { return t.ms === 20000; }).forEach(function (t) { t.fn(); });
    assert(R1.regs() === 0, "con la intro abierta, el tope corto no lo registra");
    R1.ctx.PampaRegistrarSW();
    assert(R1.regs() === 1, "se registra cuando la intro TERMINA (PampaRegistrarSW())");
    R1.ctx.PampaRegistrarSW();
    assert(R1.regs() === 1, "una sola vez");
    var R2 = correrRed(null);
    R2.ctx.PampaRegistrarSW();
    assert(R2.regs() === 0, "si la intro termina antes de \"load\", espera al load");
    R2.load();
    assert(R2.regs() === 1, "y se registra al llegar el load");
    var R3 = correrRed(null);
    R3.load();
    var tope = R3.timers.filter(function (t) { return t.ms >= 10000 && t.ms < 60000; })[0];
    assert(!!tope, "hay un tope por si la intro no abre");
    tope.fn();
    assert(R3.regs() === 1, "vencido el tope, se registra igual");
    var R3b = correrRed(null);
    R3b.load(); R3b.ctx.PampaRegistrarSW("espera");
    var topeLargo = R3b.timers.filter(function (t) { return t.ms >= 60000; })[0];
    assert(!!topeLargo, "si la intro abrió y nunca termina (nadie toca la compuerta), hay un tope largo");
    topeLargo.fn();
    assert(R3b.regs() === 1, "y al vencer se registra");
    var R4 = correrRed({ postMessage: function () { } });
    R4.load();
    assert(R4.regs() === 1, "con un worker que ya controla la página, se registra en \"load\" como antes");
    var srcI = leer("phaser/scenes/intro.js").replace(/\r\n/g, "\n");
    assert(/window\.PampaRegistrarSW\("espera"\)/.test(srcI) && /salir\(\) \{[\s\S]{0,400}window\.PampaRegistrarSW\(\)/.test(srcI) && /PampaRegistrarSW\(\);\n\s*this\.irA\("titulo"\)/.test(srcI),
      "la intro avisa que espera al abrir, y que terminó al salir (o al ir directo al editor)");
    assert(!/se registra en "load", y\n/.test(leer("phaser/sw.js").replace(/\r\n/g, "\n")), "el comentario de sw.js ya no dice que se registra en \"load\"");
    console.log("[6] la cola baja de a 2 sin repetir y frena con la carga de verdad · el editor y el Master bajan lo del partido (" + lista.length + " archivos, " + mb(pesoP) + ", igual a lo que pide su preload) · el worker se registra cuando termina la intro");
  });
})().then(function () {
  console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
  process.exit(mal === 0 ? 0 : 1);
}, function (e) {
  console.error("  ✗ el test tiró: " + (e && e.stack || e));
  process.exit(1);
});
