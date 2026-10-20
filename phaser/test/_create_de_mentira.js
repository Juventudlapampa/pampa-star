/* ============================================================================
   PAMPA STAR · EL create() DEL PARTIDO, DE VERDAD (ayudante de tests, no es un test)

   _partido_de_mentira.js arma una escena a mano y no corre create(): sirve
   para la pausa, el final o la cruz. Esto corre el create() REAL de
   match.js, con su init(), sobre la lógica y los datos de verdad. Lo de
   Phaser (cámaras, capas, tweens, texturas, teclado) es un stub universal:
   todo lo que se pide existe, no hace nada y devuelve otro stub. Lo que se
   escribe con add.text se anota, y el estado del partido también.

   Nació en TEMPO-1 (tempo_carrera.test.js: 18 fechas sin menú de tempo) y lo
   usa también textos_tactiles.test.js (lo que el arranque le escribe a un
   teléfono).

   Uso: var C = require("./_create_de_mentira.js");
        var P = C.jugar(masterPartido, { tactil: true });  // P.s, P.textos, P.estados
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var RAIZ = path.join(__dirname, "..", "..");
function leer(f) { return fs.readFileSync(path.join(RAIZ, f), "utf8"); }
function json(f) { return JSON.parse(leer(f)); }

function stub(nombre, anotar) {
  var t = function () { };
  var p = new Proxy(t, {
    get: function (o, k) {
      if (k === Symbol.toPrimitive) return function () { return 0; };
      if (k === "then") return undefined;
      if (k === Symbol.iterator) return function* () { };
      if (k === "length") return 0;
      if (Object.prototype.hasOwnProperty.call(o, k) && k !== "prototype" && k !== "name") return o[k];
      return (o[k] = stub(nombre + "." + String(k), anotar));
    },
    set: function (o, k, v) { o[k] = v; return true; },
    apply: function (o, self, args) { if (anotar) anotar(nombre, args); return stub(nombre + "()", anotar); },
    construct: function () { return stub(nombre + "(new)", anotar); },
    has: function () { return true; }
  });
  return p;
}

var Wv = {};
var ls = {};
var ctx = { window: Wv, self: Wv, console: console, Math: Math, JSON: JSON, Object: Object, Array: Array, String: String,
  Number: Number, Date: Date, Promise: Promise, Error: Error, isFinite: isFinite, parseInt: parseInt, parseFloat: parseFloat,
  Set: Set, Map: Map, Symbol: Symbol, performance: { now: function () { return 0; } },
  localStorage: { getItem: function (k) { return ls[k] == null ? null : ls[k]; }, setItem: function (k, v) { ls[k] = String(v); }, removeItem: function (k) { delete ls[k]; } } };
Wv.Phaser = stub("Phaser"); ctx.Phaser = Wv.Phaser;
Wv.document = ctx.document = stub("document");
vm.createContext(ctx);
/* la lógica, en el orden de index.html */
var INDEX = leer("phaser/index.html");
var scripts = (INDEX.match(/<script src="(logic\/[^"]+)"><\/script>/g) || []).map(function (s) { return s.match(/src="([^"]+)"/)[1]; });
scripts.forEach(function (f) { if (f !== "logic/entorno.js") vm.runInContext(leer("phaser/" + f), ctx, { filename: f }); });
Object.keys(ctx).forEach(function (k) { if (/^Pampa/.test(k)) Wv[k] = ctx[k]; });
Wv.PF = { texto: "Pixelify Sans", display: "Archivo Black" };
vm.runInContext("window.Phaser.Scene = function () {};", ctx);
["piel_ui.js", "match.js", "definicion_ui.js", "jugadon_ui.js", "cartas_ui.js", "foco_ui.js", "escenas_v9.js"].forEach(function (f) {
  vm.runInContext(leer("phaser/scenes/" + f), ctx, { filename: f });
});
var Escena = Wv.PampaMatch;
Object.assign(Escena.prototype, Wv.PampaPielUI, Wv.PampaFocoUI);
/* lo que index.html carga y acá no hace falta (sprites, arte, sonido): stub */
ctx.window = new Proxy(Wv, { get: function (o, k) { if (k in o) return o[k]; return typeof k === "string" && /^Pampa/.test(k) ? stub("window." + k) : undefined; } });
var BAL = json("phaser/data/balance.json");
var datos = {
  balance: BAL, roster: json("data/roster_pampeano.json"), portraits: json("data/portraits_manifest.json"),
  megacosas: json("data/megacosas.json"), relatos: json("data/relatos.json"), poses: json("data/poses_manifest.json"),
  caras: json("data/caras_manifest.json"), divisiones: json("data/divisiones.json"), vida: json("data/eventos_temporada.json"),
  semana: json("data/semana.json"), tribuna: json("data/tribuna.json"), audio: json("data/audio.json"), ambientes: json("data/ambientes.json")
};

/* opts.tactil: un teléfono (device.input.touch de Phaser) · opts.flags: los
   que pisan a balance.flags en este partido · opts.registro: más claves del
   registry (el partidoRapido de la pantalla de título) */
function jugar(masterPartido, opts) {
  opts = opts || {};
  var reg = Object.assign({}, datos, { masterPartido: masterPartido }, opts.registro || {});
  if (opts.flags) reg.balance = Object.assign({}, BAL, { flags: Object.assign({}, BAL.flags, opts.flags) });
  var textos = [], estados = [];
  /* lo que se escribe: al crear el texto y cada vez que se le cambia */
  var anotar = function (n, a) {
    if (!a) return;
    if (/add\.text$/.test(n)) textos.push(String(a[2]));
    else if (/\.setText$/.test(n)) textos.push(String(a[0]));
  };
  var s = Object.create(Escena.prototype);
  ["add", "cameras", "tweens", "time", "input", "scale", "textures", "load", "events", "children", "sound", "make", "renderer", "plugins", "cache"]
    .forEach(function (k) { s[k] = stub("this." + k, anotar); });
  s.sys = stub("this.sys", anotar);
  s.sys.game = { device: { input: { touch: !!opts.tactil } } };
  s.game = { registry: { get: function (k) { return reg[k]; }, set: function (k, v) { reg[k] = v; }, remove: function (k) { delete reg[k]; } },
    events: stub("game.events"), scene: stub("game.scene"), canvas: stub("canvas"), loop: stub("loop"), device: stub("device") };
  s.scene = stub("this.scene");
  var e;
  Object.defineProperty(s, "estado", { get: function () { return e; }, set: function (v) { e = v; estados.push(v); } });
  s.init(); s.create();
  return { s: s, textos: textos, estados: estados };
}

module.exports = { jugar: jugar, localStorage: ctx.localStorage, ls: ls, W: Wv };
