/* PAMPA STAR · CARRERA CORTA o CARRERA LARGA (25/oct, pedido de Rodri)
   "Una opción al crear la carrera: CARRERA CORTA (temporadas de solo ida, 9
   fechas) o CARRERA LARGA (ida y vuelta, 18), con la corta por defecto; las
   carreras guardadas, como LARGA." La lógica (logic/temporada.js, VUELTAS y
   fixture), el save (logic/save_master.js) y la creación con master.js REAL
   en la escena de mentira.
   node phaser/test/carrera_corta.test.js */
"use strict";
var fs = require("fs"), path = require("path");
var M = require("./_escena_de_mentira.js");
var RAIZ = path.join(__dirname, "..", "..");
var T = require(path.join(RAIZ, "phaser/logic/temporada.js"));
var SM = require(path.join(RAIZ, "phaser/logic/save_master.js"));
var BAL = JSON.parse(fs.readFileSync(path.join(RAIZ, "phaser/data/balance.json"), "utf8"));
var DIV = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/divisiones.json"), "utf8"));

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

var EQ = ["Toay"].concat(DIV.divisiones.primera_b.rivales);
function cruces(fx) {
  var n = {};
  fx.forEach(function (fe) { fe.forEach(function (p) { var k = [p.local, p.visita].sort().join(" | "); n[k] = (n[k] || 0) + 1; }); });
  return n;
}

/* ---------- [1] el fixture: 9 fechas de ida o 18 de ida y vuelta ---------- */
(function () {
  var c = T.fixture(EQ, T.VUELTAS.corta), l = T.fixture(EQ, T.VUELTAS.larga);
  assert(c.length === 9 && l.length === 18, "CORTA 9 fechas y LARGA 18 (" + c.length + " y " + l.length + ")");
  var nc = cruces(c), nl = cruces(l);
  assert(Object.keys(nc).length === 45 && Object.keys(nc).every(function (k) { return nc[k] === 1; }), "en la CORTA cada par de equipos se cruza una vez");
  assert(Object.keys(nl).length === 45 && Object.keys(nl).every(function (k) { return nl[k] === 2; }), "en la LARGA, dos veces");
  assert(c.every(function (fe) { return fe.some(function (p) { return p.local === "Toay" || p.visita === "Toay"; }); }), "en la CORTA jugás todas las fechas");
  assert(JSON.stringify(T.fixture(EQ)) === JSON.stringify(l), "sin el dato, ida y vuelta: las carreras de antes");
  /* una temporada CORTA se juega entera y termina en la fecha 9 */
  var t = T.crear({ division: "primera_b", miClub: "Toay", rivales: DIV.divisiones.primera_b.rivales, semilla: 7, vueltas: T.VUELTAS.corta });
  for (var f = 0; f < 9; f++) T.jugarFecha(t, 1, 0);
  var yo = t.tabla.find(function (x) { return x.equipo === "Toay"; });
  assert(T.terminada(t) && yo.pj === 9 && yo.pts === 27, "nueve fechas y la temporada CORTA terminó (PJ " + yo.pj + ", " + yo.pts + " pts)");
  assert(t.tabla.every(function (x) { return x.pj === 9; }), "los diez equipos jugaron nueve");
  console.log("[1] CORTA: 9 fechas, cada cruce una vez · LARGA: 18, cada cruce dos");
})();

/* ---------- [2] el balance: la perilla y las opciones ---------- */
(function () {
  var C = BAL.carrera;
  assert(C && C.por_defecto === "corta", "la CORTA viene marcada (balance.carrera.por_defecto)");
  assert(C.opciones.map(function (o) { return o.k; }).join(",") === "corta,larga" && C.opciones.every(function (o) { return T.VUELTAS[o.k]; }),
    "las dos opciones existen en logic/temporada.js");
  console.log("[2] balance.carrera: " + C.opciones.map(function (o) { return o.n + " (" + o.d + ")"; }).join(" y "));
})();

/* ---------- [3] el save: las de antes son LARGAS y no se tocan ---------- */
(function () {
  function save(extra, vueltas) {
    var s = { v: 1, club: "Toay", division: "primera_b", temporadaN: 1, titulos: [], bolsaEventos: [], racha: 0,
      temporada: T.crear({ division: "primera_b", miClub: "Toay", rivales: DIV.divisiones.primera_b.rivales, semilla: 3, vueltas: vueltas }) };
    return Object.assign(s, extra);
  }
  var vieja = save({});
  var txt = JSON.stringify(vieja);
  var r = SM.sanear(JSON.parse(txt), null, {});
  /* que el save entero sale igual que entró lo fijan save_corrupto.test.js y tempo_carrera.test.js */
  assert(!("largoCarrera" in r.save) && r.reparado.length === 0 && JSON.stringify(r.save.temporada) === JSON.stringify(vieja.temporada) && r.save.temporada.fixture.length === 18,
    "una carrera de antes no gana el campo, no se repara nada y sigue con sus 18 fechas (reparó: " + r.reparado.join(", ") + ")");
  var rara = save({ largoCarrera: "eterna" });
  r = SM.sanear(rara, null, {});
  assert(r.save.largoCarrera === undefined && r.reparado.indexOf("largo de la carrera") >= 0, "un largo que no existe se borra y queda LARGA");
  /* un fixture roto se rearma con el largo de la carrera */
  var corta = save({ largoCarrera: "corta" }, 1);
  corta.temporada.fixture = "roto";
  r = SM.sanear(corta, null, {});
  assert(r.save.temporada.fixture.length === 9, "el fixture roto de una CORTA se rearma con 9 fechas (" + r.save.temporada.fixture.length + ")");
  var larga = save({}, 2);
  larga.temporada.fixture = "roto";
  r = SM.sanear(larga, null, {});
  assert(r.save.temporada.fixture.length === 18, "y el de una carrera de antes, con 18");
  console.log("[3] las carreras guardadas se leen como LARGA sin tocarlas; el fixture roto respeta el largo");
})();

/* ---------- [4] la creación: master.js REAL ---------- */
(function () {
  var A = M.armar();
  var s = A.nueva(); s.create();
  var C = BAL.carrera;
  var tx = s.textos();
  assert(tx.indexOf(C.titulo_creacion) >= 0 && C.opciones.every(function (o) { return tx.indexOf(o.n) >= 0 && tx.indexOf(o.d) >= 0; }),
    "la creación pregunta " + C.titulo_creacion + " con " + C.opciones.map(function (o) { return o.n; }).join(" y "));
  var marca = s.children.list.find(function (o) { return o.type === "Text" && o.text === "ELEGIDA"; });
  var xDe = function (n) { var o = s.children.list.find(function (x) { return x.type === "Text" && x.text === n; }); return o && o.x; };
  assert(s._largoElegido === "corta" && marca && marca.x === xDe("CORTA"), "CORTA viene marcada: ELEGIDA está debajo de CORTA");
  var zonas = (s._carreraFoco || []).map(function (it) { return it.obj; });
  assert(zonas.length === 2 && s._foco && zonas.every(function (z) { return s._foco.items.some(function (it) { return it.obj === z; }); }),
    "las dos opciones están en el cursor del mapa");
  /* los textos nuevos a 13 px o más, y adentro del lienzo */
  var nuevos = s.children.list.filter(function (o) { return o.type === "Text" && (o.text === C.titulo_creacion || o.text === "ELEGIDA" || C.opciones.some(function (op) { return op.n === o.text || op.d === o.text; })); });
  assert(nuevos.length === 6 && nuevos.every(function (o) { return parseInt(o.style.fontSize, 10) >= 13; }), "los seis textos de la carrera van a 13 px o más");
  /* ARRANCAR sin tocar nada: CORTA, y llega al save con 9 fechas */
  s.tocar(480, 438);
  var pend = A.registry.get("carreraPendiente");
  assert(pend && pend.largo === "corta", "ARRANCAR sin tocar nada lleva CORTA (" + JSON.stringify(pend) + ")");
  s.children.list.slice().forEach(function (o) { if (o && o.destroy) o.destroy(); });
  s.events.emit("shutdown"); s.init(); s.create();
  s._crearCarrera("primera_b", null);
  var sv = JSON.parse(A.localStorage.getItem("pampa_master_v1"));
  assert(sv.largoCarrera === "corta" && sv.temporada.fixture.length === 9, "la carrera queda CORTA con 9 fechas (" + sv.largoCarrera + ", " + sv.temporada.fixture.length + ")");
  /* elegir LARGA: la marca se muda, viaja y vuelve si se toca VOLVER en el paso 1 */
  var A2 = M.armar();
  var s2 = A2.nueva(); s2.create();
  var zL = s2._carreraFoco[1].obj;
  s2.tocar(zL.x, zL.y);
  var marca2 = s2.children.list.find(function (o) { return o.type === "Text" && o.text === "ELEGIDA"; });
  var x2 = s2.children.list.find(function (x) { return x.type === "Text" && x.text === "LARGA"; });
  assert(s2._largoElegido === "larga" && marca2.x === x2.x, "tocar LARGA la elige y ELEGIDA se muda debajo de LARGA");
  s2.tocar(480, 438);
  assert(A2.registry.get("carreraPendiente").largo === "larga", "ARRANCAR lleva LARGA en el pendiente");
  A2.registry.set("carreraPendiente", null);             // lo que hace VOLVER en el paso 1
  s2.children.list.slice().forEach(function (o) { if (o && o.destroy) o.destroy(); });
  s2.events.emit("shutdown"); s2.init(); s2.create();
  assert(s2._largoElegido === "larga", "de vuelta del paso 1, LARGA sigue marcada");
  console.log("[4] la creación: CORTA marcada, ARRANCAR solo = 9 fechas, LARGA llega al pendiente y vuelve marcada");
})();

if (mal === 0) console.log("\n✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("\n✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
