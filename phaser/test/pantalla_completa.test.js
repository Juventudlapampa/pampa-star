/* ============================================================================
   PAMPA STAR · L07 — PANTALLA COMPLETA Y HORIZONTAL AL TOCAR LA COMPUERTA

   LO QUE ESTABA MAL (medido antes de este lote):
     · requestFullscreen, startFullscreen y orientation.lock daban 0 en
       phaser/ (grep). En un Android apaisado de 915x412 con la barra de
       Chrome el lienzo se ve a 0,659; a pantalla completa, a 0,763 (un 16%
       más grande). Quien tiene la rotación automática apagada quedaba
       trabado en "Girá el celular";
     · la compuerta escuchaba pointerdown (intro.js), que con el dedo llega
       con el touchstart y NO da permiso para pedir pantalla completa: la
       activación de un toque es al soltar (pointerup o touchend);
     · y Phaser 3.80.1 tira la promesa de requestFullscreen: medido en el
       navegador del panel, un startFullscreen() sin gesto terminó en "Algo se
       trabó" con "TypeError: Permissions check failed" (unhandledrejection).

   LO QUE SE PRUEBA:
     [1] la tabla de logic/entorno.js decidirPantallaCompleta: la compuerta
         la pide solo con API, sin instalar, sin estar ya, fuera de un
         iframe y (con auto "tactil") con el dedo; el botón, siempre que haya API;
     [2] intro.js (el criterio de aceptación): la compuerta escucha
         POINTERUP y su manejador llama a pantallaCompleta("compuerta"), y
         pantallaCompleta (scenes/pantalla_ui.js) llama a startFullscreen con
         la guarda de logic/entorno.js (instalada y capacidad);
     [3] el mixin CORRIENDO con una escena y un navegador de mentira: pide
         cuando corresponde (y no en iPhone, instalada, en la compu ni en un
         iframe sin permiso) y al entrar traba la orientación en horizontal,
         con el rechazo de lock() atrapado;
     [4] el parche de Phaser: un requestFullscreen que el navegador rechaza
         termina en FULLSCREEN_FAILED, sin rechazos sueltos; (revisión L07)
         con requestFullscreen sin prefijo y la constante vieja de WebKit
         (Safari), van las opciones y no el número;
     [5] el botón PANTALLA: no existe sin API ni instalada, pide AL SOLTAR,
         cambia de texto y de ícono, y en el partido se esconde adentro;
     [5b] (revisión L07) en el partido, pegado al reloj MÁS ANCHO medido
         ("⏰ 90:00+ 2T" lo pisaba 6 px), no a un x fijo;
     [6] el cableado: index.html (mixin, script, fullscreenTarget = la página
         entera), el partido y el editor lo dibujan, balance.pantalla.

   Corré:  node phaser/test/pantalla_completa.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var RAIZ = path.join(__dirname, "..", "..");
function leer(f) { return fs.readFileSync(path.join(RAIZ, f), "utf8").replace(/\r\n/g, "\n"); }
var E = require(path.join(RAIZ, "phaser/logic/entorno.js"));

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* los rechazos sueltos que aparezcan durante el test (el parche existe para que no haya) */
var sueltos = [];
process.on("unhandledRejection", function (r) { sueltos.push(String(r)); });

/* ---------- [1] la tabla ---------- */
(function () {
  var base = { disponible: true, activa: false, instalada: false, tactil: true, embebido: false, auto: "tactil" };
  function d(cambios, origen) {
    var e = Object.assign({}, base, cambios || {}, { origen: origen || "compuerta" });
    return E.decidirPantallaCompleta(e);
  }
  assert(d().pedir === true && d().motivo === "compuerta", "Android en el navegador, con el dedo: la compuerta la pide");
  assert(d({ disponible: false }).pedir === false && d({ disponible: false }).motivo === "sin_api", "sin API (iPhone, o un iframe sin permiso) no se pide");
  assert(d({ instalada: true }).pedir === false, "instalada no: ya abre sin barra y apaisada");
  assert(d({ activa: true }).pedir === false, "si ya está a pantalla completa, nada");
  assert(d({ tactil: false }).pedir === false && d({ tactil: false }).motivo === "no_tactil", "en la compu, con auto 'tactil', la compuerta no la pide sola");
  assert(d({ tactil: false, auto: "siempre" }).pedir === true, "con auto 'siempre', también en la compu");
  assert(d({ auto: "nunca" }).pedir === false, "con auto 'nunca', solo con el botón");
  assert(d({ auto: "cualquiera" }).pedir === true && d({ auto: "cualquiera", tactil: false }).pedir === false, "un auto desconocido vale como 'tactil'");
  assert(d({ embebido: true }).pedir === false, "adentro de la página de otro sitio no se agranda sola");
  assert(d({ tactil: false, auto: "nunca", embebido: true }, "boton").pedir === true, "el botón la pide siempre que haya API");
  assert(d({ disponible: false }, "boton").pedir === false && d({ activa: true }, "boton").pedir === false, "el botón tampoco pide sin API o si ya está");
  assert(E.mostrarBotonPantalla(base) && !E.mostrarBotonPantalla(Object.assign({}, base, { disponible: false })) &&
    !E.mostrarBotonPantalla(Object.assign({}, base, { instalada: true })), "el botón se ofrece con API y sin instalar");
  console.log("[1] decidirPantallaCompleta: compuerta con el dedo; nunca instalada, sin API, ya activa ni embebida; botón siempre que haya API");
})();

/* ---------- [2] intro.js y pantalla_ui.js, leídos ---------- */
var INTRO = leer("phaser/scenes/intro.js");
var PUI = leer("phaser/scenes/pantalla_ui.js");
(function () {
  var comp = INTRO.slice(INTRO.indexOf("  compuerta() {"), INTRO.indexOf("  arrancarOpening() {"));
  var go = comp.slice(comp.indexOf("const go = () => {"), comp.indexOf("};", comp.indexOf("const go = () => {")));
  assert(/this\.input\.once\("pointerup", go\)/.test(comp), "SÍNTOMA: la compuerta escucha POINTERUP (con el dedo, el pointerdown no da permiso)");
  assert(!/this\.input\.once\("pointerdown", go\)/.test(comp), "y ya no pointerdown");
  assert(/this\.pantallaCompleta\("compuerta"\)/.test(go), "el manejador de la compuerta llama a pantallaCompleta(\"compuerta\")");
  assert(go.indexOf("pantallaCompleta") < go.indexOf("seguirAlOpening"), "y la pide antes de seguir al opening (en el mismo manejador, con el permiso del toque)");
  var pc = PUI.slice(PUI.indexOf("pantallaCompleta: function"), PUI.indexOf("trabarHorizontal: function"));
  assert(/startFullscreen\(/.test(pc), "pantallaCompleta llama a startFullscreen");
  assert(/E\.decidirPantallaCompleta\(this\.entornoPantalla\(origen\)\)/.test(pc) && /if \(!d\.pedir\) return false;/.test(pc) &&
    pc.indexOf("if (!d.pedir)") < pc.indexOf("startFullscreen("), "con la guarda ANTES: decidirPantallaCompleta");
  var ent = PUI.slice(PUI.indexOf("entornoPantalla: function"), PUI.indexOf("pantallaCompleta: function"));
  assert(/instalada: instalada\(\)/.test(ent) && /fsDev\.available/.test(ent) && /fullscreenEnabled === false/.test(ent),
    "y la guarda mira instalada (standalone) y la capacidad (fullscreen.available y fullscreenEnabled)");
  assert(/display-mode: standalone/.test(PUI), "instalada = display-mode standalone");
  console.log("[2] la compuerta: pointerup → pantallaCompleta → (guarda) → startFullscreen");
})();

/* ---------- un navegador y un Phaser de mentira para pantalla_ui.js ---------- */
function Emisor() { this._ev = {}; }
Emisor.prototype.on = function (n, f) { (this._ev[n] = this._ev[n] || []).push({ f: f, once: false }); return this; };
Emisor.prototype.once = function (n, f) { (this._ev[n] = this._ev[n] || []).push({ f: f, once: true }); return this; };
Emisor.prototype.off = function (n, f) { if (this._ev[n]) this._ev[n] = this._ev[n].filter(function (l) { return l.f !== f; }); return this; };
Emisor.prototype.emit = function (n) {
  var a = [].slice.call(arguments, 1), ls = (this._ev[n] || []).slice();
  this._ev[n] = (this._ev[n] || []).filter(function (l) { return !l.once; });
  ls.forEach(function (l) { l.f.apply(null, a); });
  return ls.length > 0;
};
Emisor.prototype.cuantos = function (n) { return (this._ev[n] || []).length; };
var EV = { ENTER_FULLSCREEN: "enterfullscreen", LEAVE_FULLSCREEN: "leavefullscreen", FULLSCREEN_FAILED: "fullscreenfailed", FULLSCREEN_UNSUPPORTED: "fullscreenunsupported" };

function navegador(op) {
  op = op || {};
  var doc = { fullscreenElement: null, fullscreenEnabled: op.habilitada !== false };
  var registro = { pedidos: [], locks: [], salidas: 0 };
  var html = { requestFullscreen: function (o) {
    registro.pedidos.push(o);
    if (op.rechaza) return Promise.reject(new TypeError("Permissions check failed"));
    /* revisión L07: el sin prefijo pide un FullscreenOptions (WebIDL): un
       número es un TypeError, que con una promesa llega como rechazo */
    if (o !== undefined && o !== null && typeof o !== "object") return Promise.reject(new TypeError("The provided value is not of type 'FullscreenOptions'."));
    return Promise.resolve();
  }, webkitRequestFullscreen: function (o) { registro.pedidos.push(o); return undefined; } };
  var win = {
    matchMedia: function (q) {
      return { matches: /pointer: coarse/.test(q) ? !!op.tactil : /standalone/.test(q) ? !!op.instalada : false };
    },
    screen: { orientation: { lock: function (o) { registro.locks.push(o); return Promise.reject(new Error("NotSupportedError: lock() no anda acá")); } } },
    PF: { texto: "Pixelify Sans" }
  };
  /* el ScaleManager de Phaser con lo que usa el parche (y el original, para comparar) */
  function SM() { Emisor.call(this); this.fullscreen = { available: op.api !== false, request: op.request || "requestFullscreen", cancel: "exitFullscreen", keyboard: !!op.teclado }; this.fullscreenTarget = html; }
  SM.prototype = Object.create(Emisor.prototype);
  SM.prototype.getFullscreenTarget = function () { return this.fullscreenTarget; };
  SM.prototype.fullscreenErrorHandler = function (e) { this.emit(EV.FULLSCREEN_FAILED, e); };
  SM.prototype.stopFullscreen = function () { registro.salidas++; doc.fullscreenElement = null; this.emit(EV.LEAVE_FULLSCREEN); };
  /* el de Phaser 3.80.1, tal cual (vendor/phaser.min.js): tira la promesa */
  SM.prototype.startFullscreen = function (t) {
    void 0 === t && (t = { navigationUI: "hide" });
    var e = this.fullscreen;
    if (e.available) { if (!e.active) { var i = this.getFullscreenTarget(); e.keyboard ? i[e.request](1) : i[e.request](t); } }
    else this.emit(EV.FULLSCREEN_UNSUPPORTED);
  };
  var Phaser = { Scale: { ScaleManager: SM, Events: EV }, Geom: { Rectangle: function (x, y, w, h) { this.x = x; this.y = y; this.width = w; this.height = h; this.setTo = function (a, b, c, d) { this.x = a; this.y = b; this.width = c; this.height = d; return this; }; } } };
  Phaser.Geom.Rectangle.Contains = function () { return true; };
  /* teclado: el navegador tiene la constante vieja de WebKit (Safari), y la detección del vendor pone keyboard = true */
  var ctx = { window: win, document: doc, Phaser: Phaser, Element: op.teclado ? { ALLOW_KEYBOARD_INPUT: 1 } : {}, Promise: Promise, Math: Math, console: console };
  win.Phaser = Phaser;
  vm.createContext(ctx);
  vm.runInContext(leer("phaser/scenes/pantalla_ui.js"), ctx, { filename: "pantalla_ui.js" });
  win.PampaEntorno = E;
  /* "entrar": lo que hace el navegador cuando acepta (fullscreenchange → Phaser emite ENTER) */
  registro.entrar = function (sc) { doc.fullscreenElement = html; sc.emit(EV.ENTER_FULLSCREEN); };
  return { win: win, doc: doc, SM: SM, registro: registro, html: html };
}
/* una escena de mentira con lo que usa el mixin */
function escena(N, balance) {
  var s = Object.create(N.win.PampaPantallaUI);
  s.scale = new N.SM();
  s.events = new Emisor();
  s.game = { registry: { get: function (k) { return k === "balance" ? (balance || { pantalla: { auto: "tactil" }, legibilidad: { tap_min: 61 } }) : null; } } };
  s.objetos = [];
  function go(tipo) {
    var o = new Emisor();
    o.tipo = tipo; o.visible = true; o.scene = s; o.x = 0; o.y = 0; o.text = ""; o.width = 0;
    ["clear", "fillStyle", "fillRoundedRect", "lineStyle", "strokeRoundedRect", "beginPath", "moveTo", "lineTo", "strokePath", "setOrigin"]
      .forEach(function (m) { o[m] = function () { if (tipo === "graphics") o._dibujo = (o._dibujo || 0) + 1; return o; }; });
    o.setVisible = function (v) { o.visible = v; return o; };
    o.setText = function (t) { o.text = t; o.width = t.length * 7; return o; };
    o.setX = function (x) { o.x = x; return o; };
    o.setPosition = function (x, y) { o.x = x; o.y = y; return o; };
    o.setSize = function (w, h) { o.w = w; o.h = h; return o; };
    o.setInteractive = function (area) { if (!o.input) o.input = { enabled: true, hitArea: area }; return o; };
    s.objetos.push(o);
    return o;
  }
  s.add = { graphics: function () { return go("graphics"); }, text: function () { return go("text"); }, rectangle: function () { return go("rectangle"); } };
  return s;
}
function esperar() { return new Promise(function (r) { setTimeout(r, 0); }); }

/* ---------- [3] el mixin corriendo ---------- */
var pasos = [];
pasos.push(async function () {
  /* Android, Chrome, con el dedo */
  var N = navegador({ tactil: true });
  var s = escena(N);
  assert(s.pantallaCompleta("compuerta") === true && N.registro.pedidos.length === 1, "Android con el dedo: la compuerta pide pantalla completa");
  assert(N.registro.pedidos[0] && N.registro.pedidos[0].navigationUI === "hide", "con navigationUI: 'hide' (sin la barra de navegación)");
  assert(N.registro.locks.length === 0, "la orientación se traba recién al entrar (lock() solo anda a pantalla completa)");
  N.registro.entrar(s.scale);
  assert(N.registro.locks.length === 1 && N.registro.locks[0] === "landscape", "al entrar: screen.orientation.lock('landscape')");
  await esperar(); await esperar();
  assert(s.scale.cuantos(EV.FULLSCREEN_FAILED) === 0 && s.scale.cuantos(EV.ENTER_FULLSCREEN) === 0, "y no quedan oyentes colgados del ScaleManager");
  assert(s.pantallaCompleta("compuerta") === false && N.registro.pedidos.length === 1, "ya a pantalla completa: no se vuelve a pedir");
  /* los que no */
  var casos = [
    ["iPhone (sin API para la página)", { tactil: true, api: false }],
    ["instalada", { tactil: true, instalada: true }],
    ["en la compu", { tactil: false }],
    ["un iframe sin allow=\"fullscreen\"", { tactil: true, habilitada: false }]
  ];
  casos.forEach(function (c) {
    var N2 = navegador(c[1]), s2 = escena(N2);
    assert(s2.pantallaCompleta("compuerta") === false && N2.registro.pedidos.length === 0, c[0] + ": la compuerta no pide nada");
  });
  var N3 = navegador({ tactil: false }), s3 = escena(N3, { pantalla: { auto: "siempre" } });
  assert(s3.pantallaCompleta("compuerta") === true, "en la compu con balance.pantalla.auto = 'siempre', sí");
  var N4 = navegador({ tactil: true }); N4.win.PAMPA_EMBEBIDO = true;
  assert(escena(N4).pantallaCompleta("compuerta") === false, "embebida en otro sitio, la compuerta no la pide");
  console.log("[3] el mixin: pide en Android con el dedo y traba en horizontal; nada en iPhone, instalada, la compu ni un iframe sin permiso");
});

/* ---------- [4] el parche de Phaser ---------- */
pasos.push(async function () {
  var N = navegador({ tactil: true, rechaza: true });
  var s = escena(N);
  var fallas = 0;
  s.scale.on(EV.FULLSCREEN_FAILED, function () { fallas++; });
  var antes = sueltos.length;
  s.pantallaCompleta("compuerta");
  await esperar(); await esperar();
  assert(N.registro.pedidos.length === 1 && fallas === 1, "el navegador dice que no: Phaser emite FULLSCREEN_FAILED");
  assert(sueltos.length === antes, "SÍNTOMA: sin rechazos sueltos (antes llegaba a la red de errores y salía 'Algo se trabó'): " + sueltos.slice(antes).join(" · "));
  assert(s.scale.cuantos(EV.ENTER_FULLSCREEN) === 0, "y el oyente de ENTER se va con la falla (no traba la orientación en un éxito de otro día)");
  /* y el ORIGINAL de Phaser sí lo dejaba suelto: el test sabe ver el bug */
  var N0 = navegador({ rechaza: true });
  var SM0 = function () { N0.SM.call(this); };
  SM0.prototype = Object.create(N0.SM.prototype);
  SM0.prototype.startFullscreen = function (t) {
    var e = this.fullscreen; var i = this.getFullscreenTarget(); if (e.available) i[e.request](t);
  };
  new SM0().startFullscreen({ navigationUI: "hide" });
  await esperar(); await esperar();
  assert(sueltos.length === antes + 1, "control: el startFullscreen de Phaser sin parche deja el rechazo suelto (" + sueltos.length + ")");
  sueltos.length = antes;
  assert(/SM\.__pampaPantalla = true/.test(PUI) && /p\.then\(null, function \(e\) \{ sm\.fullscreenErrorHandler\(e\); \}\)/.test(PUI),
    "el parche se aplica una vez y atrapa la promesa con el manejador de error de Phaser");
  /* revisión L07 · Safari (Mac, iPad): requestFullscreen SIN prefijo y Element.ALLOW_KEYBOARD_INPUT
     a la vez. La rama "keyboard" de Phaser le pasaba el número y el pedido fallaba SIEMPRE */
  var NS = navegador({ tactil: true, teclado: true });
  var sS = escena(NS), fallasS = 0;
  sS.scale.on(EV.FULLSCREEN_FAILED, function () { fallasS++; });
  sS.pantallaCompleta("boton");
  await esperar(); await esperar();
  assert(NS.registro.pedidos.length === 1 && typeof NS.registro.pedidos[0] === "object" && NS.registro.pedidos[0].navigationUI === "hide",
    "SÍNTOMA: Safari con requestFullscreen sin prefijo recibe las opciones, no el número de ALLOW_KEYBOARD_INPUT (" + JSON.stringify(NS.registro.pedidos[0]) + ")");
  assert(fallasS === 0, "y el pedido no falla (" + fallasS + " FULLSCREEN_FAILED)");
  var NW = navegador({ tactil: true, teclado: true, request: "webkitRequestFullscreen" });
  escena(NW).pantallaCompleta("boton");
  assert(NW.registro.pedidos.length === 1 && NW.registro.pedidos[0] === 1, "con el pedido viejo con prefijo, sí va ALLOW_KEYBOARD_INPUT (el WebKit de antes lo espera)");
  console.log("[4] el parche: un no del navegador es FULLSCREEN_FAILED, no 'Algo se trabó'; en Safari, las opciones y no el número");
});

/* ---------- [5] el botón ---------- */
pasos.push(async function () {
  assert(escena(navegador({ api: false })).botonPantalla(806, 15, {}) === null, "sin API (iPhone): no hay botón");
  assert(escena(navegador({ instalada: true })).botonPantalla(806, 15, {}) === null, "instalada: no hay botón");
  var N = navegador({ tactil: false });
  var s = escena(N);
  var apoyos = 0;
  var b = s.botonPantalla(806, 15, { soloEntrar: true, desdeArriba: true, alApoyar: function () { apoyos++; } });
  assert(b && b.t.text === "PANTALLA", "en la compu hay botón, y dice PANTALLA");
  assert(b.zona.input && b.zona.input.hitArea && b.zona.input.hitArea.height === 61 && b.zona.input.hitArea.y === -(15 - 12),
    "su área táctil mide tap_min (61) de alto y baja desde y=0 (" + JSON.stringify(b.zona.input && b.zona.input.hitArea) + ")");
  var cortado = 0, ev = { stopPropagation: function () { cortado++; } };
  b.zona.emit("pointerdown", {}, 0, 0, ev);
  assert(N.registro.pedidos.length === 0 && apoyos === 1 && cortado === 1, "AL APOYAR no pide nada (con el dedo no hay permiso): corta el toque y avisa (el partido no mueve al jugador)");
  b.zona.emit("pointerup", {}, 0, 0, ev);
  assert(N.registro.pedidos.length === 1, "AL SOLTAR pide pantalla completa (el botón, también en la compu)");
  N.registro.entrar(s.scale);
  assert(!b.t.visible && !b.g.visible && b.zona.input.enabled === false, "en el partido (soloEntrar), a pantalla completa el botón se esconde");
  s.scale.stopFullscreen();
  assert(b.t.visible && b.zona.input.enabled === true && b.t.text === "PANTALLA", "y vuelve al salir");
  /* el del editor: cambia de texto y alterna */
  var N2 = navegador({ tactil: true }), s2 = escena(N2);
  var b2 = s2.botonPantalla(100, 22, { largo: true, desdeArriba: true, desdeIzquierda: true });
  assert(b2.t.text === "PANTALLA COMPLETA", "en el editor dice PANTALLA COMPLETA");
  var dib0 = b2.g._dibujo;
  b2.zona.emit("pointerup", {}, 0, 0, ev);
  N2.registro.entrar(s2.scale);
  assert(b2.t.text === "SALIR DE PANTALLA COMPLETA" && b2.t.visible, "adentro dice SALIR DE PANTALLA COMPLETA (texto, no solo el ícono)");
  assert(b2.g._dibujo > dib0, "y el ícono se vuelve a dibujar (esquinas hacia adentro)");
  b2.zona.emit("pointerup", {}, 0, 0, ev);
  assert(N2.registro.salidas === 1 && b2.t.text === "PANTALLA COMPLETA", "tocarlo otra vez sale");
  s2.events.emit("shutdown");
  assert(s2.scale.cuantos(EV.ENTER_FULLSCREEN) === 0 && s2.scale.cuantos(EV.LEAVE_FULLSCREEN) === 0, "al apagarse la escena, el botón suelta los oyentes del ScaleManager (que es del juego)");
  var icono = PUI.slice(PUI.indexOf("el ícono: cuatro esquinas"), PUI.indexOf("zona.setPosition"));
  assert(/dentro \? px - s\[0\] \* b : px/.test(icono), "el ícono de esquinas cambia de forma con el estado");
  console.log("[5] el botón: sin API no existe; pide al soltar; texto e ícono según el estado; se esconde en el partido a pantalla completa");
});

/* ---------- [5b] revisión L07: el reloj de los últimos minutos pisaba la pastilla ----------
   LO QUE ESTABA MAL (medido en el navegador): la pastilla iba centrada en
   806 (de 758 a 854) porque el reloj se había medido como "90:00 2T"; pero
   desde el 85 del 2T va "⏰ 90:00+ 2T", que mide 100 y arranca en 848, 6 px
   debajo de la pastilla. Ahora el partido ubica el borde DERECHO de la
   pastilla con el reloj más ancho, medido con el mismo objeto. */
pasos.push(async function () {
  var s = escena(navegador({ tactil: false }));
  var bordes = [840, 840];
  var b = s.botonPantalla(806, 15, { desdeDerecha: true, xDe: function () { return bordes.shift() || 820; } });
  var W = b.zona.w;
  assert(Math.round(b.zona.x + W / 2) === 840, "desdeDerecha: el borde derecho queda donde dice xDe (" + (b.zona.x + W / 2) + ")");
  s.scale.emit(EV.ENTER_FULLSCREEN); s.scale.emit(EV.LEAVE_FULLSCREEN);
  assert(Math.round(b.zona.x + W / 2) === 820, "xDe se vuelve a preguntar en cada pintada (la tipografía puede bajar después)");
  /* bordeIzqDelReloj de match.js de verdad, con un reloj de mentira que mide 7 px por letra (el ⏰ cuenta 14) */
  var PM = require("./_partido_de_mentira.js");
  var C = PM.cargar();
  var textos = [];
  function medir(t) { return Array.from(t).reduce(function (a, c) { return a + (c === "⏰" ? 14 : 7); }, 0); }
  var reloj = { scene: {}, x: 948, originX: 1, text: "12:15 1T", width: 0,
    setText: function (t) { this.text = t; textos.push(t); this.width = medir(t); return this; } };
  var borde = C.W.PampaMatch.prototype.bordeIzqDelReloj.call({ txtReloj: reloj, BAL: { tempo: { tramo_seg: 15 } } });
  assert(borde === 948 - medir("⏰ 90:00+ 2T"), "mide los relojes de los últimos minutos y del descuento y se queda con el más ancho (" + borde + ")");
  assert(textos.indexOf("⏰ 90:45+ 2T") >= 0 && textos.indexOf("45:30+ 1T") >= 0, "con los segundos del tramo (15) y el descuento del 1T");
  assert(reloj.text === "12:15 1T", "y el reloj queda con el texto que tenía");
  assert(C.W.PampaMatch.prototype.bordeIzqDelReloj.call({ txtReloj: null, BAL: {} }) === 856, "sin reloj, el borde de antes (856)");
  console.log("[5b] revisión: la pastilla del partido va pegada al reloj más ancho, medido, sin pisarlo");
});

/* ---------- [6] el cableado ---------- */
pasos.push(async function () {
  var INDEX = leer("phaser/index.html");
  assert(/<script src="scenes\/pantalla_ui\.js"><\/script>/.test(INDEX) && /<script src="logic\/entorno\.js"><\/script>/.test(INDEX), "index.html carga pantalla_ui.js y entorno.js");
  assert(/Object\.assign\(S\.prototype, window\.PampaPantallaUI\)/.test(INDEX), "el mixin entra en las cuatro escenas");
  assert(/fullscreenTarget: document\.documentElement/.test(INDEX), "a pantalla completa va la página entera (los avisos DOM siguen a la vista)");
  var SW = leer("phaser/sw.js");
  assert(SW.indexOf("\"./logic/entorno.js\"") >= 0 && SW.indexOf("\"./scenes/pantalla_ui.js\"") >= 0, "los dos archivos nuevos van al precache del worker");
  var M = leer("phaser/scenes/match.js");
  var hud = M.slice(M.indexOf("  buildHUD() {"), M.indexOf("  buildBotonPausa() {"));
  assert(/this\.buildBotonPantalla\(\);/.test(hud), "el HUD del partido arma el botón PANTALLA");
  var bp = M.slice(M.indexOf("  buildBotonPantalla() {"), M.indexOf("  buildBotonPausa() {"));
  assert(/this\.botonPantalla\(840, 15, \{/.test(bp) && /soloEntrar: true/.test(bp) && /this\._uiTocado = this\.time\.now/.test(bp),
    "en la barra del marcador, solo para entrar, y el toque no llega al mapa");
  /* revisión L07: pegado al reloj MÁS ANCHO, medido, y no a un x fijo */
  assert(/desdeDerecha: true, xDe: \(\) => this\.bordeIzqDelReloj\(\) - 8/.test(bp), "el borde derecho sale del reloj medido, con 8 px de aire");
  var ED = leer("phaser/scenes/editor.js");
  assert(/this\.botonPantalla\(100, 22, \{ largo: true/.test(ED), "el editor lo dibuja al lado de VER INTRO");
  var B = JSON.parse(leer("phaser/data/balance.json"));
  assert(B.pantalla && E.AUTO.indexOf(B.pantalla.auto) >= 0 && /0,659/.test(B.pantalla._nota || ""), "balance.pantalla.auto es una opción válida, con su _nota");
  console.log("[6] cableado: index.html, sw.js, partido, editor y balance");
});

(async function () {
  for (var i = 0; i < pasos.length; i++) await pasos[i]();
  await esperar();
  assert(sueltos.length === 0, "ningún rechazo suelto en todo el test (" + sueltos.join(" · ") + ")");
  console.log("\n" + (mal ? "✗ " + mal + " FALLARON" : "✓ TODOS OK") + " — " + (ok + mal) + " asserts, " + mal + " fallaron.");
  process.exit(mal ? 1 : 0);
})();
