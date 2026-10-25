/* PAMPA STAR · test de EL ERROR DEL TIRO DE FRENTE (scenes/frente_ui.js)
   Pedido de Rodri del 25/oct: "Un error que se vio una vez en el tiro de
   frente al arco. No se sabe si sigue pasando." En el registro del navegador
   de la auditoría quedó frenteDibujar sin su gráfico (frente_ui.js:593 de
   entonces, g.clear() con fr.g sin crear).

   Cómo pasaba: frenteAbrir ponía el estado FRENTE al principio y creaba fr.g
   recién después de las figuras. Si algo tiraba en el medio, el partido
   quedaba en FRENTE con un frente a medio armar: cada cuadro, match.update
   llamaba a updateFrente, frenteDibujar caía en fr.g.clear() y la red de
   errores guardaba ese error, que tapaba al de verdad. Reproducido acá con
   una figura que tira en el medio del armado.
   Y con dos frentes seguidos, el cierre del primero (a los 900 ms del
   remate) cerraba al segundo con el resultado del primero.

   Corré:  node phaser/test/frente_sin_grafico.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var PM = require("./_partido_de_mentira.js");
var RAIZ = PM.RAIZ;
var BAL = JSON.parse(fs.readFileSync(path.join(RAIZ, "phaser/data/balance.json"), "utf8"));

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

function escena() {
  var E = PM.escena({
    logicaAntes: ["phaser/logic/duel.js", "phaser/logic/lectura.js"],
    logica: ["phaser/logic/frente.js", "phaser/logic/penal.js", "phaser/logic/jugadon.js"],
    mixins: ["phaser/scenes/jugadon_ui.js", "phaser/scenes/frente_ui.js"]
  });
  var s = E.s, W = E.W;
  W.PF = { texto: BAL.tipografia.texto, display: BAL.tipografia.display };
  W.Phaser.Math = { Clamp: function (v, a, b) { return Math.max(a, Math.min(b, v)); } };
  var graficoBase = s.add.graphics;
  var grafico = function () {
    var g = graficoBase();
    ["lineBetween", "fillTriangle", "setVisible"].forEach(function (k) { g[k] = function () { return g; }; });
    return g;
  };
  s.add.graphics = grafico;
  /* lo que se encadena (setX, setStyle, setScale...) devuelve el mismo objeto */
  var encadenable = function (o) {
    var p = new Proxy(o, { get: function (t, k) { if (!(k in t) && typeof k === "string" && /^set/.test(k)) return function () { return p; }; if (typeof t[k] === "function") return function () { var r = t[k].apply(t, arguments); return r === t ? p : r; }; return t[k]; } });
    return p;
  };
  var objeto = function (tipo) {
    var o = s.add.rectangle(0, 0, 10, 10);
    o.type = tipo; o.displayWidth = 40; o.displayHeight = 80; o.width = 40; o.height = 80;
    ["setOrigin", "setScale", "setPosition", "setVisible", "setFlipX", "setTint", "setText", "setFillStyle", "setStrokeStyle", "setInteractive", "setDepth", "setWordWrapWidth"].forEach(function (k) { o[k] = function () { return o; }; });
    return encadenable(o);
  };
  s.add.image = function () { return objeto("Image"); };
  var texto = s.add.text;
  s.add.text = function (x, y, t, st) { var o = texto(x, y, t, st); ["setOrigin", "setVisible", "setWordWrapWidth", "setDepth"].forEach(function (k) { o[k] = function () { return o; }; }); o.setText = function (v) { o.text = String(v); return o; }; o.displayWidth = 100; o.displayHeight = 20; o.getBounds = function () { return { x: o.x, y: o.y, width: 100, height: 20, right: o.x + 100, bottom: o.y + 20 }; }; return encadenable(o); };
  s.cineBG = grafico(); s.cineContent = s.add.container(); s.cineLayer = s.add.container();
  ["setVisible"].forEach(function (k) { s.cineLayer[k] = s.mundoLayer[k] = s.hudLayer[k] = function () { return this; }; });
  s.uiCam = { ignore: function () { }, setZoom: function () { }, centerOn: function () { } };
  s.cineLabel = { setText: function () { } };
  s.limpiarContenido = function () { s.cineContent.removeAll(true); };
  s.limpiarMenu = function () { };
  s.pedirMusica = function () { };
  s.msV = function (ms) { return ms; };
  s.frenteFondo = function () { };
  s.figuraDePlano = function () { return objeto("Image"); };
  s.poseDePlano = function () { return null; };
  s.figuraArquero = function () { return "arquero"; };
  s.escalaDePose = function () { return 1; };
  s.frenteNumero = function () { };
  s.marcaDeBando = function () { return grafico(); };
  s.texPelota = function () { return { key: "pelota", esc: 1 }; };
  s.jugadonBoton = function () { var b = objeto("Rectangle"); s._jg.botones.push(objeto("Text")); return b; };
  s.textures = { exists: function () { return false; } };
  /* un partido con sus 22 y la pelota a 230 del arco de ellos */
  var mios = [], rivales = [];
  ["ARQ", "DEF", "DEF", "DEF", "DEF", "VOL", "VOL", "VOL", "ATA", "ATA", "ATA"].forEach(function (pos, i) {
    mios.push({ nombre: "M" + i, pos: pos, stats: { tiro: 60 } }); rivales.push({ nombre: "R" + i, pos: pos, stats: { tiro: 60 } });
  });
  mios[8].esVos = true;
  s.st = W.PampaPartido.crearPartido({ bal: BAL, mios: mios, rivales: rivales, rng: function () { return 0.5; } });
  var c = s.st.mios[s.st.ctrl]; c.x = s.st.W - 230; c.y = s.st.H / 2;
  return E;
}

/* [1] el frente a medio armar: una figura tira en el medio */
{
  var E = escena(), s = E.s;
  s.figuraDePlano = function () { throw new Error("la figura no se pudo armar"); };
  var tiro = null;
  try { s.entrarFrente({}); } catch (e) { tiro = e; }
  assert(tiro && /la figura no se pudo armar/.test(tiro.message), "[1] el error de verdad sale de frenteAbrir, con su mensaje");
  assert(s._fr && !s._fr.g, "[1] el frente quedó a medio armar, sin su gráfico (la situación de la auditoría)");
  var sintoma = null;
  try { s.updateFrente(16); } catch (e) { sintoma = e; }
  assert(sintoma && /clear/.test(sintoma.message), "[1] dibujarlo así es el error de la auditoría (" + (sintoma && sintoma.message) + ")");
  assert(s.estado !== "FRENTE", "[1] pero el estado no quedó en FRENTE: match.update no lo dibuja cada cuadro (" + s.estado + ")");
  var M = fs.readFileSync(path.join(RAIZ, "phaser/scenes/match.js"), "utf8");
  assert(/if \(this\.estado === "FRENTE"\) \{ this\.updateFrente\(delta\); return; \}/.test(M), "[1] updateFrente solo corre en el estado FRENTE");
}

/* [2] armado entero, el remate tuyo, el tiro libre de ellos y el penal de ellos quedan en FRENTE y se dibujan */
{
  var E2 = escena(), s2 = E2.s;
  s2.entrarFrente({});
  assert(s2.estado === "FRENTE" && s2._fr && s2._fr.g, "[2] tu remate armado entero queda en FRENTE con su gráfico");
  var e2 = null;
  try { s2.updateFrente(16); s2.updateFrente(16); } catch (e) { e2 = e; }
  assert(!e2, "[2] y se dibuja cuadro a cuadro sin error" + (e2 ? " (" + e2.message + ")" : ""));
  var src = fs.readFileSync(path.join(RAIZ, "phaser/scenes/frente_ui.js"), "utf8");
  var abrir = src.slice(src.indexOf("    frenteAbrir(cfg) {"), src.indexOf("    /* proyección: d hacia el arco"));
  assert((abrir.match(/this\.estado = "FRENTE";/g) || []).length === 3, "[2] las tres salidas de frenteAbrir (penal de ellos, tiro de la CPU, el tuyo) ponen el estado al final");
  assert(abrir.indexOf('this.estado = "FRENTE"') > abrir.indexOf("fr.g = this.add.graphics()"), "[2] el estado FRENTE va después de crear fr.g");
}

/* [3] dos frentes seguidos: el cierre del primero no se lleva al segundo */
{
  var E3 = escena(), s3 = E3.s, cerrados = [];
  s3.frenteRematar = function (res) { cerrados.push(res); };
  s3.entrarFrente({});
  var fr1 = s3._fr;
  s3.frenteGolpe();
  assert(fr1.resuelto && E3.timers.length > 0, "[3] el primero pateó y espera su cierre");
  var cierre = E3.timers.slice();
  E3.timers.length = 0;
  s3.entrarFrente({});
  var fr2 = s3._fr;
  cierre.forEach(function (t) { if (!t.quitado) t.fn(); });
  assert(s3._fr === fr2 && s3.estado === "FRENTE" && cerrados.length === 0, "[3] el cierre del primero no cerró al segundo (" + s3.estado + ", " + cerrados.length + " cerrados)");
  s3.frenteGolpe();
  E3.correrTimers();
  assert(s3._fr === null && cerrados.length === 1 && s3.estado === "RESOLUCION", "[3] el segundo se cierra con su propio remate");
}

console.log((mal ? "✗" : "✓") + " frente_sin_grafico: " + ok + " ok, " + mal + " mal");
process.exit(mal ? 1 : 0);
