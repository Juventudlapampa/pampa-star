/* ============================================================================
   PAMPA STAR · LA ESCENA DE MENTIRA (ayudante de tests, no es un test)

   Para correr métodos REALES de phaser/scenes/master.js en node, sin
   navegador. La auditoría de la tanda 1.0 midió los botones fantasma y las
   mejoras que se duplicaban así, con scripts sueltos fuera del repo; esto es
   lo mismo pero adentro, para que los tests de L03 lo usen y no se pierda.

   Lo que imita de Phaser 3.80, y por qué importa cada cosa:
     · la LISTA DE DIBUJO (children.list) y la de ENTRADA (input._list): un
       objeto destruido sale de las dos; uno sacado de la lista de dibujo sin
       destruir (lo que hacía el removeAll del DisplayList) sigue tocable.
     · el EMISOR con la semántica de eventemitter3: emit recorre una COPIA de
       los oyentes, así que sacar uno durante el emit no lo salva de que lo
       llamen en esa misma vuelta. Es justo lo que hace apilarse a los once.
     · el TOQUE: tocar(x, y) busca el objeto interactivo vivo de más arriba
       que contiene el punto y le emite pointerdown, como el InputPlugin.
     · el TECLADO es un emisor más: teclas("ONE") emite keydown-ONE.

   Lo que NO imita: el render, los tweens (no corren: se anotan) y el reloj
   (los delayedCall se anotan y se disparan a mano con correrTimers()).

   Uso: var M = require("./_escena_de_mentira.js"); var A = M.armar();
        var s = A.nueva();           // escena master con stubs de piel
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var RAIZ = path.join(__dirname, "..", "..");
function leer(f) { return fs.readFileSync(path.isAbsolute(f) ? f : path.join(RAIZ, f), "utf8"); }
function json(f) { return JSON.parse(leer(f)); }

/* ---------- el emisor, con la semántica de eventemitter3 ---------- */
function Emisor() { this._ev = {}; }
Emisor.prototype.on = function (n, fn, ctx) { (this._ev[n] = this._ev[n] || []).push({ fn: fn, ctx: ctx, once: false }); return this; };
Emisor.prototype.once = function (n, fn, ctx) { (this._ev[n] = this._ev[n] || []).push({ fn: fn, ctx: ctx, once: true }); return this; };
Emisor.prototype.off = function (n, fn) {
  if (!this._ev[n]) return this;
  this._ev[n] = fn ? this._ev[n].filter(function (l) { return l.fn !== fn; }) : [];
  return this;
};
Emisor.prototype.emit = function (n) {
  var a = [].slice.call(arguments, 1);
  var ls = (this._ev[n] || []).slice();
  if (!ls.length) return false;
  this._ev[n] = this._ev[n].filter(function (l) { return !l.once; });
  ls.forEach(function (l) { l.fn.apply(l.ctx, a); });
  return true;
};
Emisor.prototype.listenerCount = function (n) { return (this._ev[n] || []).length; };
Emisor.prototype.removeAllListeners = function () { this._ev = {}; return this; };

/* métodos de dibujo que no importan para la cuenta: devuelven el objeto */
var ENCADENA = /^(set|fill|line|stroke|clear|begin|move|close|arc|generate|play|stop|refresh|enable|disable|draw|create|slice|translate|rotate|save|restore|copy|flip|tint|pause|resume)/;

function armar(opts) {
  opts = opts || {};
  var store = {};
  var localStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; },
    _store: store
  };
  var window = { PF: { texto: "Pixelify Sans", display: "Press Start 2P" } };
  var navegador = { storage: { persist: function () { window.__persistPedido = (window.__persistPedido | 0) + 1; return Promise.resolve(true); } } };
  var ctx = { window: window, localStorage: localStorage, navigator: navegador, console: console, Math: Math, JSON: JSON,
    Object: Object, Array: Array, String: String, Number: Number, Date: Date, Promise: Promise, require: require,
    parseInt: parseInt, isFinite: isFinite, Error: Error, TypeError: TypeError,
    Phaser: { Scene: function () { } } };
  ctx.self = ctx; ctx.document = undefined;
  vm.createContext(ctx);
  var LOGICA = ["phaser/logic/temporada.js", "phaser/logic/master.js", "phaser/logic/semana.js",
    "phaser/logic/vida.js", "phaser/logic/piel.js", "phaser/logic/foco.js", "phaser/logic/mapa.js",
    "phaser/logic/save_master.js", "phaser/logic/carrera.js", "phaser/logic/dialogo.js"]
    .concat(opts.logicaExtra || []);
  LOGICA.forEach(function (f) {
    if (!fs.existsSync(path.join(RAIZ, f))) return;
    vm.runInContext(leer(f), ctx, { filename: f });
  });
  /* los UMD dejan su global en `self` (que acá es el contexto): se pasan a window */
  Object.keys(ctx).forEach(function (k) { if (/^Pampa/.test(k)) window[k] = ctx[k]; });
  vm.runInContext(leer(opts.foco || "phaser/scenes/foco_ui.js"), ctx, { filename: "foco_ui.js" });
  vm.runInContext(leer(opts.master || "phaser/scenes/master.js"), ctx, { filename: "master.js" });
  /* otra escena en vez del Master (la pantalla de título): opts.escena es el
     archivo, opts.clase su global y opts.key su clave de Phaser */
  if (opts.escena) vm.runInContext(leer(opts.escena), ctx, { filename: opts.escena });
  var Escena = window[opts.clase || "PampaMasterScene"];
  if (window.PampaFocoUI) Object.assign(Escena.prototype, window.PampaFocoUI);

  var datos = {
    balance: json("phaser/data/balance.json"), semana: json("data/semana.json"),
    vida: json("data/eventos_temporada.json"), roster: json("data/roster_pampeano.json"),
    divisiones: json("data/divisiones.json"), entrevista: json("data/entrevista.json")
  };
  var reg = new Map();
  Object.keys(datos).forEach(function (k) { reg.set(k, datos[k]); });
  var registry = { get: function (k) { return reg.get(k); }, set: function (k, v) { reg.set(k, v); }, remove: function (k) { reg.delete(k); } };
  var juegoEventos = new Emisor();

  function nueva() {
    var s = new Escena();
    var children = { list: [] };
    /* el removeAll del DisplayList de 3.80.1, tal cual: SACA y no destruye.
       Está para poder correr el master.js de antes y ver el bug */
    children.removeAll = function () { children.list.length = 0; return children; };
    var input = new Emisor();
    input._list = [];
    input.keyboard = new Emisor();
    input.keyboard.enabled = true;
    s.children = children; s.input = input;
    s.events = new Emisor();
    /* el emisor del JUEGO (game.events), que sobrevive a las escenas: desde
       L04 el Master se cuelga ahí del atrás del teléfono ("atras") */
    s.game = { registry: registry, events: juegoEventos };
    s.scale = { width: 960, height: 540 };
    /* get: una textura con todos sus cuadros (la cara del relator de la previa) */
    s.textures = { exists: function () { return false; }, get: function () { return { has: function () { return true; }, add: function () { } }; } };
    s.cameras = { main: { setBackgroundColor: function () { return this; } } };
    /* L09 (textos-tactiles): el Master pregunta si hay pantalla táctil para
       no mostrar teclas en el teléfono; opts.tactil es el teléfono */
    s.sys = { settings: { status: 5 }, game: { device: { input: { touch: !!opts.tactil } } } };
    s._tweens = []; s._timers = []; s._restarts = 0; s._irA = [];
    s.tweens = { add: function (c) { var t = { cfg: c, stop: function () { }, pause: function () { }, remove: function () { } }; s._tweens.push(t); return t; },
      killTweensOf: function () { } };
    s.time = {
      now: 0,
      delayedCall: function (ms, fn) { var e = { ms: ms, fn: fn, remove: function () { this.quitado = true; } }; s._timers.push(e); return e; },
      addEvent: function (c) { var e = { cfg: c, remove: function () { this.quitado = true; } }; s._timers.push(e); return e; }
    };
    s.scene = { key: opts.key || "master", restart: function () { s._restarts++; }, start: function (k) { s._irA.push(k); } };

    /* ---- los objetos de juego ---- */
    function go(tipo, x, y, w, h, ox, oy) {
      var o = new Emisor();
      o.type = tipo; o.x = x || 0; o.y = y || 0; o.width = w || 0; o.height = h || 0;
      o.originX = ox; o.originY = oy; o.scaleX = 1; o.scaleY = 1;
      o.visible = true; o.alpha = 1; o.active = true; o.scene = s; o.input = null;
      o.parentContainer = null; o.depth = 0;
      o.setOrigin = function (a, b) { this.originX = a; this.originY = b == null ? a : b; return this; };
      /* el área, como Phaser 3.80: se toma al hacerlo tocable; si ya lo era,
         setInteractive solo lo habilita y se queda con la que tenía */
      o.setInteractive = function (area) {
        if (!this.input) { this.input = { enabled: true, hitArea: area && area.width != null ? area : null }; input._list.push(this); }
        else this.input.enabled = true;
        return this;
      };
      o.disableInteractive = function () { if (this.input) this.input.enabled = false; return this; };
      o.setVisible = function (v) { this.visible = v; return this; };
      o.setAlpha = function (v) { this.alpha = v; return this; };
      o.setScale = function (a, b) { this.scaleX = a; this.scaleY = b == null ? a : b; return this; };
      o.setPosition = function (a, b) { this.x = a; if (b != null) this.y = b; return this; };
      o.setX = function (v) { this.x = v; return this; };
      o.setY = function (v) { this.y = v; return this; };
      o.setDepth = function (v) { this.depth = v; return this; };
      o.setText = function (t) { this.text = String(t); medirTexto(this); return this; };
      /* 23/oct: la ×N de la semana se ubica midiendo (master.js, marcarVeces):
         la caja en pantalla y el grosor de la línea, como en Phaser */
      o.lineWidth = 0;
      o.setStrokeStyle = function (w) { this.lineWidth = w || 0; return this; };
      o.getBounds = function () {
        var w = this.width * this.scaleX, h = this.height * this.scaleY;
        var l = this.x - (this.originX || 0) * w, t = this.y - (this.originY || 0) * h;
        return { x: l, y: t, left: l, top: t, width: w, height: h, right: l + w, bottom: t + h, centerX: l + w / 2, centerY: t + h / 2 };
      };
      o.destroy = function () {
        if (!this.scene) return;
        this.emit("destroy", this);
        if (this.list) this.list.slice().forEach(function (c) { c.destroy(); });
        var i = children.list.indexOf(this); if (i >= 0) children.list.splice(i, 1);
        if (this.parentContainer) { var j = this.parentContainer.list.indexOf(this); if (j >= 0) this.parentContainer.list.splice(j, 1); }
        if (this.input) { var k = input._list.indexOf(this); if (k >= 0) input._list.splice(k, 1); this.input = null; }
        this.scene = undefined; this.active = false;
        this.removeAllListeners();
      };
      Object.defineProperty(o, "scale", { get: function () { return this.scaleX; }, set: function (v) { this.scaleX = this.scaleY = v; } });
      Object.defineProperty(o, "displayWidth", { get: function () { return this.width * this.scaleX; } });
      Object.defineProperty(o, "displayHeight", { get: function () { return this.height * this.scaleY; } });
      /* lo que no está definido y suena a dibujo (setStrokeStyle, fillRect…)
         devuelve el mismo objeto, para que las cadenas sigan */
      var p = new Proxy(o, {
        get: function (t, k) {
          if (k in t) return t[k];
          if (typeof k === "string" && ENCADENA.test(k)) return function () { return p; };
          return undefined;
        }
      });
      return p;
    }
    function nuevo(tipo, x, y, w, h, ox, oy, sinLista) {
      var o = go(tipo, x, y, w, h, ox, oy);
      if (!sinLista) children.list.push(o);
      return o;
    }
    function medirTexto(o) {
      var fsz = parseInt(o.style && o.style.fontSize, 10) || 14;
      var lineas = String(o.text).split("\n");
      o.width = Math.max.apply(null, lineas.map(function (l) { return l.length; })) * fsz * 0.55;
      o.height = lineas.length * fsz * 1.25;
    }
    /* lo que lee master.js renglonesDe de un Text de Phaser: los renglones,
       la métrica de la letra (con los mismos números que medirTexto) y el
       contexto que mide cada renglón */
    function renglonesDeMentira(o) {
      var fsz = parseInt(o.style.fontSize, 10) || 14;
      o.lineSpacing = o.style.lineSpacing || 0;
      o.padding = { left: 0, right: 0, top: 0, bottom: 0 };
      o.canvas = {};
      o.context = { measureText: function (l) { return { width: l.length * fsz * 0.55, actualBoundingBoxAscent: fsz * 0.75, actualBoundingBoxDescent: fsz * 0.2 }; } };
      o.style.metrics = { ascent: fsz * 0.95, descent: fsz * 0.3, fontSize: fsz * 1.25 };
      o.style.strokeThickness = o.style.strokeThickness || 0;
      o.style.syncFont = function () { };
      o.getWrappedText = function (t) { return String(t).split("\n"); };
    }
    s.add = {
      text: function (x, y, t, style) { var o = nuevo("Text", x, y, 0, 0, 0, 0); o.text = String(t); o.style = style || {}; medirTexto(o); renglonesDeMentira(o); return o; },
      rectangle: function (x, y, w, h, color, alpha) { var o = nuevo("Rectangle", x, y, w, h, 0.5, 0.5); o.fillColor = color; o.fillAlpha = alpha == null ? 1 : alpha; return o; },
      image: function (x, y, k) { var o = nuevo("Image", x, y, 100, 100, 0.5, 0.5); o.textureKey = k; return o; },
      sprite: function (x, y, k) { return s.add.image(x, y, k); },
      graphics: function () { return nuevo("Graphics", 0, 0, 0, 0, 0, 0); },
      circle: function (x, y, r) { return nuevo("Arc", x, y, 2 * (r || 1), 2 * (r || 1), 0.5, 0.5); },
      zone: function (x, y, w, h) { return nuevo("Zone", x, y, w, h, 0.5, 0.5); },
      container: function (x, y, hijos) {
        var c = nuevo("Container", x, y, 0, 0, 0, 0);
        c.list = [];
        c.add = function (h) {
          (Array.isArray(h) ? h : [h]).forEach(function (o) {
            if (!o) return;
            var i = children.list.indexOf(o); if (i >= 0) children.list.splice(i, 1);
            o.parentContainer = c; c.list.push(o);
          });
          return c;
        };
        if (hijos) c.add(hijos);
        return c;
      }
    };
    s.make = { graphics: function () { return nuevo("Graphics", 0, 0, 0, 0, 0, 0, true); } };

    /* ---- la piel y el arte, sin dibujo (no es lo que se mide) ---- */
    s.piel = function () { return { fondo_borde: "#06120b" }; };
    s.fondoDePiel = function () { };
    s.fondoDelMaster = function () { };
    s.fondoDeLaDivision = function () { };
    s.vestirPendientes = function () { return 0; };
    s.pisoTactil = function (o) { return o; };
    s.pedirMusica = function () { };
    s.entrarDesdeNegro = function () { };
    s.irA = function (k) { s._irA.push(k); };

    /* ---- lo que hace quien juega ---- */
    s.tocar = function (x, y) {
      /* con la entrada de la escena apagada, Phaser no procesa toques */
      if (input.enabled === false) return null;
      var vivos = input._list.filter(function (o) { return o.input && o.input.enabled && o.scene; });
      var tocados = vivos.filter(function (o) {
        var ox = o.parentContainer ? o.parentContainer.x : 0, oy = o.parentContainer ? o.parentContainer.y : 0;
        var w = o.displayWidth, h = o.displayHeight;
        var x0 = ox + o.x - w * (o.originX || 0), y0 = oy + o.y - h * (o.originY || 0);
        /* con área propia (el piso táctil), manda el área: va en coordenadas
           locales, con (0,0) en la esquina del objeto */
        var ha = o.input.hitArea;
        if (ha) { x0 += ha.x * o.scaleX; y0 += ha.y * o.scaleY; w = ha.width * o.scaleX; h = ha.height * o.scaleY; }
        return x >= x0 && x <= x0 + w && y >= y0 && y <= y0 + h;
      });
      if (!tocados.length) return null;
      var o = tocados[tocados.length - 1];
      var ev = { cancelado: false, stopPropagation: function () { this.cancelado = true; } };
      o.emit("pointerdown", { x: x, y: y, worldX: x, worldY: y }, 0, 0, ev);
      return o;
    };
    s.teclas = function (t) { return input.keyboard.emit("keydown-" + t, { keyCode: 0 }); };
    /* un toque en el fondo, sin objeto debajo: en Phaser llega al
       "pointerdown" de la escena, que completa el texto que se escribe letra
       por letra (master.js escribir). Desde el 20/oct las opciones de los
       diálogos aparecen recién ahí (pedido de Rodri), así que los tests que
       las tocan primero leen el diálogo hasta el final, como quien juega */
    s.tocarAfuera = function () {
      if (input.enabled === false) return;
      input.emit("pointerdown", { x: -1, y: -1 });
    };
    s.leerHastaElFinal = function () {
      var n = 0;
      while (s._escritura && n < 10) { s.tocarAfuera(); n++; }
      return n;
    };
    s.correrTimers = function () {
      var t = s._timers.splice(0);
      t.forEach(function (e) { if (!e.quitado && e.fn) e.fn(); });
      return t.length;
    };
    s.tocables = function () { return input._list.filter(function (o) { return o.input && o.input.enabled && o.scene; }); };
    s.textos = function () {
      var out = [];
      (function barrer(l) { l.forEach(function (o) { if (o.type === "Text") out.push(o.text); if (o.list) barrer(o.list); }); })(children.list);
      return out;
    };
    /* Phaser corre init() antes de create() en cada arranque */
    if (s.init) s.init();
    return s;
  }

  /* una carrera recién creada, como _crearCarrera (Winifreda, Primera B) */
  function carreraNueva(pueblo) {
    var T = window.PampaTemporada, Ma = window.PampaMaster;
    pueblo = pueblo || "Winifreda";
    var club = Ma.nombreDeTuClub(pueblo, datos.roster);
    return {
      v: 1, club: club, pueblo: pueblo, division: "primera_b", temporadaN: 1, titulos: [],
      origen: null, bolsaEventos: [], modFecha: null, racha: 0,
      temporada: T.crear({ division: "primera_b", miClub: club, rivales: datos.divisiones.divisiones.primera_b.rivales,
        semilla: Ma.hashClub(club) * 31 + 1 })
    };
  }

  return { window: window, ctx: ctx, Escena: Escena, nueva: nueva, registry: registry, reg: reg,
    localStorage: localStorage, store: store, datos: datos, carreraNueva: carreraNueva, Emisor: Emisor,
    juegoEventos: juegoEventos };
}

module.exports = { armar: armar, Emisor: Emisor, RAIZ: RAIZ };
