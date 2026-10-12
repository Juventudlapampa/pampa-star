/* ============================================================================
   PAMPA STAR · EL PARTIDO DE MENTIRA (ayudante de tests, no es un test)

   Para correr métodos REALES de phaser/scenes/match.js en node, sin
   navegador: la pausa, la pantalla final, el atrás del teléfono. Es el
   hermano de _escena_de_mentira.js (que hace lo mismo con master.js) y sigue
   su idea: imitar de Phaser 3.80 solo lo que importa para la cuenta.

     · los OBJETOS son emisores: un rectángulo interactivo recibe
       pointerdown; tocar(obj) se lo emite como el InputPlugin.
     · los CONTENEDORES (menuLayer, hudLayer) guardan su lista y
       removeAll(true) destruye lo que tenían, como el de Phaser.
     · el RELOJ no corre solo: los delayedCall se anotan y se disparan con
       correrTimers() (así se prueba la espera de las salidas del final).
     · el TECLADO es un emisor: tecla("P") emite keydown-P con un evento que
       puede traer repeat:true.
     · grupoFoco es el de VERDAD (scenes/foco_ui.js + logic/foco.js), con
       tweens que no corren: el cursor se mueve y confirma igual.

   Lo que NO imita: el render, la cámara, los tweens (se anotan), el audio
   (un SFX de mentira que cuenta) y la carga de archivos.

   Uso: var PM = require("./_partido_de_mentira.js");
        var E = PM.escena({ master: true });   // E.s es la escena; E.irA, E.restarts…
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var RAIZ = path.join(__dirname, "..", "..");
function leer(f) { return fs.readFileSync(path.isAbsolute(f) ? f : path.join(RAIZ, f), "utf8"); }

function Emisor() { this._ev = {}; }
Emisor.prototype.on = function (n, fn) { (this._ev[n] = this._ev[n] || []).push({ fn: fn, once: false }); return this; };
Emisor.prototype.once = function (n, fn) { (this._ev[n] = this._ev[n] || []).push({ fn: fn, once: true }); return this; };
Emisor.prototype.off = function (n, fn) {
  if (!this._ev[n]) return this;
  this._ev[n] = fn ? this._ev[n].filter(function (l) { return l.fn !== fn; }) : [];
  return this;
};
Emisor.prototype.emit = function (n) {
  var a = [].slice.call(arguments, 1), ls = (this._ev[n] || []).slice();
  if (!ls.length) return false;
  this._ev[n] = this._ev[n].filter(function (l) { return !l.once; });
  ls.forEach(function (l) { l.fn.apply(null, a); });
  return true;
};
Emisor.prototype.listenerCount = function (n) { return (this._ev[n] || []).length; };

/* la clase de verdad, cargada una vez por contexto */
function cargar() {
  var W = {
    Phaser: { Scene: function () { }, Geom: { Rectangle: function (x, y, w, h) { this.x = x; this.y = y; this.width = w; this.height = h; } } },
    PF: { texto: "Pixelify Sans", display: "Press Start 2P" }
  };
  W.Phaser.Geom.Rectangle.Contains = function () { return true; };
  var ctx = { window: W, self: W, Phaser: W.Phaser, console: console, Math: Math, JSON: JSON, Object: Object,
    Array: Array, String: String, Number: Number, Date: Date, Promise: Promise, Error: Error, isFinite: isFinite };
  vm.createContext(ctx);
  ["phaser/logic/partido.js", "phaser/logic/foco.js", "phaser/logic/atras.js"].forEach(function (f) {
    if (!fs.existsSync(path.join(RAIZ, f))) return;
    vm.runInContext(leer(f), ctx, { filename: f });
  });
  Object.keys(ctx).forEach(function (k) { if (/^Pampa/.test(k)) W[k] = ctx[k]; });
  Object.keys(W).forEach(function (k) { if (/^Pampa/.test(k)) ctx[k] = W[k]; });
  vm.runInContext(leer("phaser/scenes/foco_ui.js"), ctx, { filename: "foco_ui.js" });
  vm.runInContext(leer("phaser/scenes/match.js"), ctx, { filename: "match.js" });
  return { W: W, ctx: ctx };
}

function escena(opts) {
  opts = opts || {};
  var C = cargar(), W = C.W;
  var BAL = JSON.parse(leer("phaser/data/balance.json"));
  var s = Object.create(W.PampaMatch.prototype);
  if (W.PampaFocoUI) Object.keys(W.PampaFocoUI).forEach(function (k) { s[k] = W.PampaFocoUI[k]; });
  var E = { s: s, W: W, BAL: BAL, irA: [], restarts: 0, timers: [], tweens: [], ui: [], avisos: [], ignorados: [] };
  /* revisión L04: un localStorage de mentira (vacío), para ver lo que el
     partido escribe — el puente con el clásico deja pampa_resultado_phaser */
  var guardado = {};
  E.ls = C.ctx.localStorage = W.localStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(guardado, k) ? guardado[k] : null; },
    setItem: function (k, v) { guardado[k] = String(v); },
    removeItem: function (k) { delete guardado[k]; },
    datos: guardado
  };

  function go(tipo, x, y, w, h) {
    var o = new Emisor();
    o.type = tipo; o.x = x || 0; o.y = y || 0; o.width = w || 0; o.height = h || 0;
    o.visible = true; o.alpha = 1; o.active = true; o.input = null; o.scale = 1; o.fillAlpha = 1;
    o.setOrigin = function () { return this; };
    o.setDepth = function () { return this; };
    o.setStrokeStyle = function () { return this; };
    o.setFillStyle = function (c, a) { this.fillAlpha = a == null ? 1 : a; return this; };
    o.setInteractive = function (area) { this.input = { enabled: true, hitArea: area || null }; return this; };
    o.disableInteractive = function () { if (this.input) this.input.enabled = false; return this; };
    o.setVisible = function (v) { this.visible = v; return this; };
    o.setAlpha = function (v) { this.alpha = v; return this; };
    o.setScale = function (v) { this.scale = v; return this; };
    o.setPosition = function (a, b) { this.x = a; this.y = b; return this; };
    o.setText = function (t) { this.text = String(t); return this; };
    o.setY = function (v) { this.y = v; return this; };
    o.destroy = function () { this.active = false; this.destruido = true; this.input = null; };
    return o;
  }
  function contenedor(nombre) {
    var c = go("Container", 0, 0, 0, 0);
    c.nombre = nombre; c.list = [];
    c.add = function (o) { (Array.isArray(o) ? o : [o]).forEach(function (x) { c.list.push(x); x.parentContainer = c; }); return c; };
    c.removeAll = function (destruir) { var l = c.list.slice(); c.list.length = 0; if (destruir) l.forEach(function (x) { x.destroy(); }); return c; };
    c.getIndex = function (o) { return c.list.indexOf(o); };
    c.addAt = function (o, i) { c.list.splice(i, 0, o); return c; };
    return c;
  }
  function graficos() {
    var g = go("Graphics");
    ["fillStyle", "lineStyle", "fillRoundedRect", "strokeRoundedRect", "fillRect", "strokeRect", "clear", "beginPath",
      "moveTo", "lineTo", "strokePath", "fillCircle", "strokeCircle"].forEach(function (k) { g[k] = function () { return g; }; });
    return g;
  }
  s.add = {
    rectangle: function (x, y, w, h, c, a) { var o = go("Rectangle", x, y, w, h); o.fillAlpha = a == null ? 1 : a; return o; },
    text: function (x, y, t, st) { var o = go("Text", x, y, 0, 0); o.text = String(t); o.style = st; return o; },
    graphics: function () { return graficos(); },
    container: function () { return contenedor("cap"); }
  };
  s.BAL = BAL;
  s.FLAGS = Object.assign({ e3_menus: true, e5_guts: true, e6_cine: true, v4_vista: true, pantalla_partida: true, pulso: true }, BAL.flags || {});
  s._split = true;
  s.menuLayer = contenedor("menuLayer");
  s.hudLayer = contenedor("hudLayer");
  s.mundoLayer = contenedor("mundoLayer");
  s.cameras = { main: { ignore: function (o) { E.ignorados.push(o); } } };
  s.uiCam = { ignore: function () { } };
  s.time = {
    now: 0,
    delayedCall: function (ms, fn) { var t = { ms: ms, fn: fn, remove: function () { this.quitado = true; } }; E.timers.push(t); return t; }
  };
  s.tweens = { add: function (c) { var t = { cfg: c, stop: function () { }, remove: function () { } }; E.tweens.push(t); return t; }, killTweensOf: function () { } };
  s.input = new Emisor();
  s.input.keyboard = new Emisor();
  s.input.enabled = true;
  s.events = new Emisor();
  var reg = new Map();
  reg.set("balance", BAL);
  s.game = { registry: { get: function (k) { return reg.get(k); }, set: function (k, v) { reg.set(k, v); }, remove: function (k) { reg.delete(k); } }, events: new Emisor() };
  s.scene = { restart: function () { E.restarts++; }, start: function (k) { E.irA.push("start:" + k); } };
  /* opts.tactil: un teléfono (device.input.touch de Phaser) */
  s.sys = { settings: { key: "match", status: 5 }, isActive: function () { return true; },
    game: { device: { input: { touch: !!opts.tactil } } } };
  s.irA = function (k) { E.irA.push(k); return true; };
  var muted = false;
  s.SFX = W.PampaSFX = {
    isMuted: function () { return muted; }, setMuted: function (m) { muted = !!m; },
    ui: function (n) { E.ui.push(n); }, whistle: function () { }, musicaUrgente: function () { }
  };
  s.avisar = function (t, op) { E.avisos.push({ t: t, op: op }); };
  /* lo que dibuja y no importa para la cuenta */
  ["refrescarHUD", "dibujarRadar", "updatePanelEscena", "velarPanel", "updatePanelProfundo", "vestirPendientes",
    "cerrarMusica", "relatar", "quitarDuelo", "teclasDeMenu", "updateFichas", "dibujarPaseCancha"].forEach(function (k) {
    s[k] = function () { };
  });
  s.piel = function () { return { n: { caja: 0, acento: 0 }, acento: "#ffd84d", calido: "#ff6b4a" }; };
  s._avisos = []; s._avisosCola = [];
  s.estado = "LIBRE";
  s.st = W.PampaPartido.crearPartido({ bal: BAL, mios: [], rivales: [], rng: function () { return 0.5; } });
  s.nombreRival = "ESPEJO DE SAL";
  s._masterPartido = opts.master ? { rival: "Espejo de Sal", division: "primera_b", temporadaN: 1, fecha: 2 } : null;
  s._pedido = opts.pedido ? { rival: "Toay", fecha: 3 } : null;
  if (opts.master) s.game.registry.set("masterPartido", s._masterPartido);
  s._pausaPedida = false; s._pausaModo = null; s._salidaFinal = null; s._foco = null;
  W.location = { href: "" };

  E.tocar = function (obj) { if (obj && obj.input && obj.input.enabled && !obj.destruido) obj.emit("pointerdown", {}, 0, 0, { stopPropagation: function () { } }); };
  E.tecla = function (k, ev) { s.input.keyboard.emit("keydown-" + k, ev || {}); };
  E.correrTimers = function () { var l = E.timers.slice(); E.timers.length = 0; l.forEach(function (t) { if (!t.quitado) t.fn(); }); };
  /* los botones a la vista en una capa: rectángulos interactivos vivos */
  E.botones = function (capa) {
    return (capa || s.menuLayer).list.filter(function (o) { return o.type === "Rectangle" && o.input && o.input.enabled && !o.destruido && o.listenerCount("pointerdown") > 0 && o.width < 900; });
  };
  E.textos = function (capa) { return (capa || s.menuLayer).list.filter(function (o) { return o.type === "Text" && !o.destruido; }).map(function (o) { return o.text; }); };
  E.textoCerca = function (obj) {
    var t = s.menuLayer.list.filter(function (o) { return o.type === "Text" && !o.destruido && Math.abs(o.x - obj.x) < 2 && Math.abs(o.y - obj.y) < 20; });
    return t.map(function (o) { return o.text; }).join(" / ");
  };
  return E;
}

module.exports = { escena: escena, cargar: cargar, Emisor: Emisor, leer: leer, RAIZ: RAIZ };
