/* ============================================================================
   PAMPA STAR · EL PISO TÁCTIL EN TODO LO QUE SE TOCA (ola 3, L10)

   El piso es legibilidad.tap_min (61 lógicos = 44 px CSS en el teléfono).
   Quedaban afuera los puntos del mapa (10 de diámetro), el VER INTRO del
   editor, los textos tocables, las pastillas de OPCIONES (52 de alto), las
   flechas del editor y de OPCIONES, y todo botón que ya era tocable cuando
   vestirPendientes lo quería agrandar: en Phaser 3.80 setInteractive(área)
   sobre un objeto con input solo lo habilita y se queda con el área vieja.

   Este test corre el pisoTactil y el pisoTactilTodo DE VERDAD (piel_ui.js)
   sobre la escena de mentira, que guarda el área como Phaser y la usa al
   tocar. Recorre las vistas del Master y OPCIONES del título y mide cada
   objeto tocable. Suma el SONIDO a la vista en cada pantalla.
   node phaser/test/piso_tactil.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var M = require("./_escena_de_mentira.js");
function leer(f) { return fs.readFileSync(path.join(M.RAIZ, f), "utf8").replace(/\r\n/g, "\n"); }
var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }
var BAL = JSON.parse(leer("phaser/data/balance.json"));
var TAP = BAL.legibilidad.tap_min;

/* la piel de verdad, dentro del contexto de la escena de mentira */
function conPiel(A) {
  var R = function (x, y, w, h) { this.x = x; this.y = y; this.width = w; this.height = h; };
  R.Contains = function () { return true; };
  A.ctx.Phaser.Geom = { Rectangle: R };
  vm.runInContext(leer("phaser/scenes/piel_ui.js"), A.ctx, { filename: "piel_ui.js" });
  var mudo = false;
  A.window.PampaSFX = { ui: function () { }, isMuted: function () { return mudo; }, setMuted: function (m) { mudo = !!m; } };
  return A.window.PampaPielUI;
}
function vestir(s, P) {
  s.pisoTactil = P.pisoTactil; s.pisoTactilTodo = P.pisoTactilTodo; s.botonSonido = P.botonSonido;
  s._vestidas = 0;
  /* lo que vestirPendientes hace con el piso (lo demás es el dibujo del botón) */
  s.vestirPendientes = function () { this._vestidas++; this.pisoTactilTodo(); return 0; };
  return s;
}
/* el área real en pantalla de un tocable: la suya si la tiene, si no su tamaño */
function area(o) {
  var ha = o.input.hitArea;
  return ha ? { w: ha.width * o.scaleX, h: ha.height * o.scaleY } : { w: o.displayWidth, h: o.displayHeight };
}
function chicos(s) {
  return s.tocables().filter(function (o) { var a = area(o); return a.w < TAP - 0.01 || a.h < TAP - 0.01; })
    .map(function (o) { var a = area(o); return o.type + " " + Math.round(a.w) + "x" + Math.round(a.h) + (o.text ? " '" + o.text + "'" : ""); });
}

/* ---------- [1] pisoTactil, objeto por objeto ---------- */
(function () {
  var A = M.armar(), P = conPiel(A), s = vestir(A.nueva(), P);
  var t = s.add.text(100, 100, "▶ VER INTRO", { fontSize: "13px" });
  s.pisoTactil(t);
  assert(t.input && area(t).w >= TAP && area(t).h >= TAP, "un texto que no era tocable queda tocable y con el piso (" + JSON.stringify(area(t)) + ")");
  assert(t.input.hitArea.x <= 0 && t.input.hitArea.y < 0, "y el área crece centrada: corre su esquina en negativo");
  var r = s.add.rectangle(300, 300, 52, 44, 0xf6efdc, 1).setInteractive();
  s.pisoTactil(r);
  assert(area(r).h >= TAP && area(r).w >= TAP, "SÍNTOMA: un botón que YA era tocable sigue en 52x44 (Phaser 3.80 ignora el área nueva en setInteractive)");
  var e = s.add.zone(500, 300, 40, 30).setScale(0.5).setInteractive();
  s.pisoTactil(e);
  assert(Math.abs(area(e).w - TAP) < 0.01 && Math.abs(area(e).h - TAP) < 0.01, "achicado a la mitad, el área local se duplica para llegar al piso en pantalla (" + JSON.stringify(area(e)) + ")");
  var g = s.add.rectangle(480, 270, 300, 80, 0, 1).setInteractive();
  s.pisoTactil(g);
  assert(g.input.hitArea === null, "uno que ya llega al piso no se toca");
  var c = s.add.container(0, 0), dentro = s.add.circle(50, 50, 5).setInteractive();
  c.add(dentro);
  s.pisoTactilTodo();
  assert(area(dentro).w >= TAP && area(dentro).h >= TAP, "pisoTactilTodo entra en los contenedores (un círculo de r=5 llega al piso)");
  var p = P.vestirPendientes.toString();
  assert(/this\.pisoTactilTodo\(\)/.test(p), "vestirPendientes pasa todo lo tocable por el piso, no solo los botones con relleno");
  console.log("[1] texto, botón ya tocable, achicado, grande, contenedor");
})();

/* ---------- [2] las vistas del Master ---------- */
(function () {
  var A = M.armar(), P = conPiel(A);
  A.localStorage.setItem("pampa_master_v1", JSON.stringify(A.carreraNueva()));
  A.registry.set("relatos", JSON.parse(leer("data/relatos.json")));
  var MASTER = leer("phaser/scenes/master.js");
  assert(!/\["create", "vista/.test(MASTER) && /Object\.getOwnPropertyNames\(window\.PampaMasterScene\.prototype\)\s*\.filter\(function \(n\) \{ return n === "create" \|\| \/\^vista\[A-Z\]\/\.test\(n\); \}\)/.test(MASTER),
    "las vistas que se visten salen de la clase: no hay una lista a mano que nombre vistas que no existen");
  var proto = A.window.PampaMasterScene.prototype;
  var vistas = Object.getOwnPropertyNames(proto).filter(function (n) { return /^vista[A-Z]/.test(n); });
  assert(vistas.indexOf("vistaOrigen") >= 0 && vistas.indexOf("vistaBorrarCarrera") >= 0 && vistas.indexOf("vistaElegirDia") < 0,
    "entran vistaOrigen y vistaBorrarCarrera, que la lista vieja dejaba afuera (" + vistas.join(", ") + ")");
  var s = vestir(A.nueva(), P);
  var v00 = s._vestidas;
  s.create();
  var tablaVestida = s._vestidas > v00, chTabla = chicos(s);
  var rival = (function () { var mp = A.window.PampaTemporada.miPartido(s.save.temporada); return mp.local === s.save.temporada.miClub ? mp.visita : mp.local; })();
  var pasos = [
    ["la tabla", function () { s.vistaTemporada(); }],
    ["la semana", function () { s.vistaSemana(rival, function () { }); }],
    ["el evento", function () { s._semEventoResuelto = false; s.vistaEvento(rival, function () { }); }],
    ["la previa", function () { s.vistaPrevia(rival, function () { }); }],
    ["el código", function () { s.vistaCodigo(); }],
    ["empezar otra", function () { s.vistaBorrarCarrera(); }],
    ["el mapa", function () { s.vistaElegir(); }],
    ["la entrevista", function () { s.vistaOrigen("primera_b", 0, []); }],
    ["el save roto", function () { s.vistaSaveRoto("prueba"); }]
  ];
  assert(tablaVestida && chTabla.length === 0, "create (la tabla al entrar): al piso (" + chTabla.join(" | ") + ")");
  pasos.forEach(function (p) {
    var v0 = s._vestidas;
    p[1]();
    assert(s._vestidas > v0, p[0] + ": la vista pasa por el piso al terminar de armarse");
    var ch = chicos(s);
    assert(ch.length === 0, p[0] + ": todo lo tocable mide " + TAP + " o más (" + ch.join(" | ") + ")");
    var son = s._btnSonido;
    assert(son && son.scene && /^SONIDO: (SÍ|NO)$/.test(son.text), p[0] + ": SONIDO a la vista, con su palabra");
  });
  /* el mapa: el dedo al costado del punto elige la localidad */
  s.vistaElegir();
  var capa = s._mapaCapa;
  var puntos = capa.list.filter(function (o) { return o.type === "Arc" && o.width === 10; });
  var antes = s.pueblos[s.pSel];
  var nombreDe = function (pt) { return capa.list.filter(function (o) { return o.type === "Text" && Math.abs(o.x - pt.x) < 1 && o.y > pt.y; })[0]; };
  /* una localidad que no sea la elegida y cuyo costado no quede pegado a
     otra (a menos de 25 de otro punto o de otro nombre): ahí no hay duda */
  var lejos = function (px, py, pt) {
    return puntos.every(function (q) {
      if (q === pt) return true;
      var b = nombreDe(q).getBounds();
      var dx = Math.max(b.left - px, 0, px - b.right), dy = Math.max(b.top - py, 0, py - b.bottom);
      return Math.hypot(px - q.x, py - q.y) > 25 && Math.hypot(dx, dy) > 25;
    });
  };
  var otro = null, lado = 0;
  puntos.forEach(function (pt) { [-15, 15].forEach(function (d) { if (!otro && nombreDe(pt).text !== antes && lejos(pt.x + d, pt.y, pt)) { otro = pt; lado = d; } }); });
  var nombre = otro && nombreDe(otro).text;
  s.tocar(otro.x + lado, otro.y);
  assert(s.pueblos[s.pSel] === nombre && nombre !== antes, "tocar 15 px al costado del punto de " + nombre + " la elige (quedó " + s.pueblos[s.pSel] + ")");
  assert(s._mapaCapa.list.filter(function (o) { return o.type === "Arc" && o.input && o.input.enabled; }).length === 0,
    "los puntos no reciben el dedo (lo recibe la zona del mapa, que no tapa a la vecina)");
  /* el sonido: el mismo interruptor que la PAUSA */
  var son = s._btnSonido;
  s.tocar(son.x + 2, son.y + 2);
  assert(A.window.PampaSFX.isMuted() === true && son.text === "SONIDO: NO", "tocar SONIDO lo apaga y lo dice");
  s.tocar(son.x + 2, son.y - 12);
  assert(A.window.PampaSFX.isMuted() === false && son.text === "SONIDO: SÍ", "y con el piso táctil se toca aunque el dedo caiga arriba del texto");
  console.log("[2] Master: " + pasos.length + " vistas al piso, con SONIDO · el mapa por cercanía");
})();

/* ---------- [3] OPCIONES del título ---------- */
(function () {
  var A = M.armar({ logicaExtra: ["phaser/logic/opciones.js"], escena: "phaser/scenes/titulo.js", clase: "PampaTitulo", key: "titulo" });
  var P = conPiel(A), s = vestir(A.nueva(), P);
  s.crudoDelMaster = function () { return null; };
  s.create();
  assert(chicos(s).length === 0, "el título: todo lo tocable al piso (" + chicos(s).join(" | ") + ")");
  s.vistaOpciones();
  assert(chicos(s).length === 0, "OPCIONES: pastillas y flechas al piso (" + chicos(s).join(" | ") + ")");
  console.log("[3] el título y OPCIONES");
})();

/* ---------- [4] lo que se mira en el código: el partido, el editor, la intro ---------- */
(function () {
  var MATCH = leer("phaser/scenes/match.js"), EDITOR = leer("phaser/scenes/editor.js"), INTRO = leer("phaser/scenes/intro.js");
  var upd = MATCH.slice(MATCH.indexOf("  update(time, delta) {"));
  assert(/this\.vestirPendientes\(6\)/.test(upd.slice(0, 2500)), "el partido barre lo que nace (menús, pase, cruz) cada 6 cuadros, y vestirPendientes lleva todo al piso");
  var m = EDITOR.match(/const pasoFila = this\._v2 \? (\d+) : 46;/);
  assert(m && +m[1] > TAP, "las filas del editor van cada " + (m && m[1]) + ": más que el piso, así el área de una flecha no pisa a la de abajo");
  assert(/if \(this\.botonSonido\) this\.botonSonido\(W - 10, 32, 1\);/.test(EDITOR), "el editor tiene SONIDO");
  assert(/armarSalteo\(\) \{[\s\S]{0,1400}?this\.botonSonido\(948, 14, 1\)/.test(INTRO), "el opening tiene SONIDO (y su toque no saltea: corta la propagación)");
  assert(/SONIDO: NO" : "SONIDO: SÍ"/.test(leer("phaser/scenes/piel_ui.js")) && /SONIDO: NO" : "SONIDO: SÍ"/.test(MATCH),
    "las mismas palabras que la PAUSA del partido");
  console.log("[4] partido, editor e intro");
})();

if (mal === 0) console.log("\n✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("\n✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
