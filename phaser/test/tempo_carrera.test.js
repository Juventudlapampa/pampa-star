/* ============================================================================
   PAMPA STAR · EL TEMPO ES DE LA CARRERA (tanda 1.0, TEMPO-1)

   LO QUE ESTABA MAL, medido: antes de CADA partido se abría un menú de tempo
   ("⏱ ¿QUÉ PARTIDO JUGAMOS?") con tres presets que hablaban en la jerga del
   código ("5' por momento", "≈35 momentos por tiempo · el clásico entero"),
   73 palabras a 10 px. Son 18 veces la misma pregunta por temporada. Lo
   elegido se guardaba en pampa_tempo (localStorage), afuera de la carrera, y
   se escribía en el balance COMPARTIDO del registry: el tempo de un partido
   quedaba puesto para el siguiente.

   Decisión de Rodri (13/oct): el tempo se elige UNA vez, al crear la carrera,
   con NORMAL ya marcado, y no se cambia después.

   Lo que fija este test:
     [1] la lógica pura (logic/save_master.js): un save sin tempo juega
         INTERMEDIO sin que se le escriba nada; 'largo' da el preset del
         balance; el balance del partido es una copia
     [2] la creación (master.js real): la pregunta con tres opciones, NORMAL
         marcado por forma y palabra, 13 px o más, área táctil de tap_min, en
         el cursor; sin "momento" ni "clásico"; ARRANCAR sin tocar nada lleva
         INTERMEDIO (cero toques de más) y CORTO viaja hasta el save
     [3] 18 fechas seguidas: el create() REAL del partido, con stubs, no arma
         nunca el menú de tempo y juega con el tempo de la carrera
     [4] no queda nada del menú viejo (TEMPO_MENU, pampa_tempo)

   Corré:  node phaser/test/tempo_carrera.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var M = require("./_escena_de_mentira.js");
var RAIZ = M.RAIZ;
function leer(f) { return fs.readFileSync(path.join(RAIZ, f), "utf8"); }
function json(f) { return JSON.parse(leer(f)); }
var SM = require(path.join(RAIZ, "phaser/logic/save_master.js"));
var BAL = json("phaser/data/balance.json");

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }
function copia(o) { return JSON.parse(JSON.stringify(o)); }

/* ---------- [1] LA LÓGICA PURA ---------- */
(function () {
  var P = BAL.tempo.presets;
  assert(SM.tempoDe(null) === "intermedio" && SM.tempoDe({}) === "intermedio" && SM.tempoDe({ tempo: "turbo" }) === "intermedio",
    "sin dato (o con uno que no existe) el tempo es INTERMEDIO");
  assert(SM.tempoDe({ tempo: "largo" }) === "largo" && SM.tempoDe("relampago") === "relampago", "el tempo de un save o de una clave suelta");
  assert(SM.minutosPorMomento({ tempo: "largo" }, BAL.tempo) === P.largo && SM.minutosPorMomento(null, BAL.tempo) === P.intermedio,
    "'largo' da el preset del balance (" + P.largo + "') y sin dato el de INTERMEDIO (" + P.intermedio + "')");
  var antes = JSON.stringify(BAL);
  var b = SM.balConTempo(BAL, { tempo: "largo" });
  assert(b.tempo.minutos_por_momento === P.largo && b.ritmo === BAL.ritmo, "el balance del partido lleva el preset; lo demás es lo mismo");
  assert(JSON.stringify(BAL) === antes && BAL.tempo.minutos_por_momento === 2.2,
    "SÍNTOMA DEL TEMPO HEREDADO: el balance compartido no se toca (el menú viejo le escribía minutos_por_momento)");
  var continuo = copia(BAL); delete continuo.tempo.minutos_por_momento;
  assert(SM.balConTempo(continuo, { tempo: "largo" }).tempo.minutos_por_momento === undefined,
    "sin minutos_por_momento (el reloj continuo de v4) el tempo no aplica");
  /* el save: uno viejo, sin el campo, sale igual que entró */
  var Ma = require(path.join(RAIZ, "phaser/logic/master.js"));
  var DIV = json("data/divisiones.json");
  var ids = Ma.DIVISIONES.map(function (d) { return d.id; });
  var opts = { rivalesDe: function (d) { return (DIV.divisiones[d] || {}).rivales || null; } };
  var base = M.armar().carreraNueva();
  var viejo = copia(base);
  var r = SM.sanear(JSON.stringify(viejo), ids, opts);
  assert(r.save && r.save.tempo === undefined && r.reparado.length === 0 && JSON.stringify(r.save) === JSON.stringify(viejo) && SM.tempoDe(r.save) === "intermedio",
    "una carrera de antes del tempo sale igual que entró y juega INTERMEDIO (reparó: " + (r.reparado || []).join(", ") + ")");
  var raro = copia(base); raro.tempo = "turbo";
  var r2 = SM.sanear(JSON.stringify(raro), ids, opts);
  assert(r2.save && r2.save.tempo === "intermedio" && r2.reparado.indexOf("tempo") >= 0, "un tempo que no existe se repara a INTERMEDIO y se anota");
  var largo = copia(base); largo.tempo = "largo";
  var r3 = SM.sanear(JSON.stringify(largo), ids, opts);
  assert(r3.save && r3.save.tempo === "largo" && r3.reparado.length === 0, "uno que existe queda");
  console.log("[1] sin dato: INTERMEDIO (" + P.intermedio + "') · largo: " + P.largo + "' · el balance compartido intacto · el save viejo no se reescribe");
})();

/* ---------- [2] LA CREACIÓN: master.js REAL ---------- */
var A = M.armar();
var W = A.window;
function reiniciar(s) {
  s.children.list.slice().forEach(function (o) { if (o && o.destroy) o.destroy(); });
  s.events.emit("shutdown"); s.init(); s.create();
}
(function () {
  /* el piso táctil de verdad (el del arnés no agranda nada) */
  var pisos = [];
  var s = A.nueva();
  s.pisoTactil = function (o) { pisos.push(o); o._tapArea = { w: Math.max(o.width, BAL.legibilidad.tap_min), h: Math.max(o.height, BAL.legibilidad.tap_min) }; return o; };
  s.create();
  var T = BAL.tempo;
  var tx = s.textos();
  assert(tx.indexOf(T.titulo_creacion) >= 0, "la creación pregunta " + T.titulo_creacion);
  T.opciones.forEach(function (o) {
    assert(tx.indexOf(o.n) >= 0 && tx.indexOf(o.d) >= 0, "la opción " + o.n + " con su duración (" + o.d + ")");
  });
  assert(T.opciones.map(function (o) { return o.n; }).join(",") === "CORTO,NORMAL,LARGO", "en pantalla se llaman CORTO, NORMAL y LARGO");
  /* ningún texto de la creación habla en la jerga del código */
  var jerga = tx.filter(function (t) { return /momento|cl[aá]sico/i.test(t); });
  assert(jerga.length === 0, "ningún texto de la creación dice 'momento' ni 'clásico' (" + jerga.join(" | ") + ")");
  /* y tampoco con una carrera del clásico para importar (el botón ⬆ IMPORTAR) */
  var Ac = M.armar();
  Ac.localStorage.setItem("pampa_star_v1", JSON.stringify({ name: "Prueba", goles: 3 }));
  var sc = Ac.nueva(); sc.create();
  var txc = sc.textos();
  var jergaC = txc.filter(function (t) { return /momento|cl[aá]sico/i.test(t); });
  assert(txc.some(function (t) { return /IMPORTAR TU CARRERA/.test(t); }) && jergaC.length === 0,
    "con IMPORTAR a la vista, tampoco dice 'momento' ni 'clásico' (" + jergaC.join(" | ") + ")");
  /* los textos del tempo, a 13 px o más */
  var delTempo = s.children.list.filter(function (o) {
    return o.type === "Text" && (o.text === T.titulo_creacion || o.text === "ELEGIDO" || T.opciones.some(function (op) { return op.n === o.text || op.d === o.text; }));
  });
  assert(delTempo.length === 2 + T.opciones.length * 2, "los " + (2 + T.opciones.length * 2) + " textos del tempo están (" + delTempo.length + ")");
  assert(delTempo.every(function (o) { return parseInt(o.style.fontSize, 10) >= 13; }),
    "los textos del tempo van a 13 px o más (" + delTempo.map(function (o) { return o.text + " " + o.style.fontSize; }).join(", ") + ")");
  /* NORMAL marcado por forma y palabra: ELEGIDO debajo de NORMAL */
  var xDe = function (n) { var o = s.children.list.find(function (x) { return x.type === "Text" && x.text === n; }); return o && o.x; };
  var marca = s.children.list.find(function (o) { return o.type === "Text" && o.text === "ELEGIDO"; });
  assert(s._tempoElegido === "intermedio" && marca && marca.x === xDe("NORMAL"), "NORMAL viene marcado: ELEGIDO está debajo de NORMAL");
  /* las tres zonas: tocables, con el piso táctil, adentro del cursor */
  var zonas = (s._tempoFoco || []).map(function (it) { return it.obj; });
  assert(zonas.length === 3 && zonas.every(function (z) { return z.input && z.input.enabled && pisos.indexOf(z) >= 0 && z._tapArea.h >= BAL.legibilidad.tap_min; }),
    "las tres opciones tienen el área táctil de " + BAL.legibilidad.tap_min + " (pisoTactil antes de hacerlas tocables)");
  assert(s._foco && zonas.every(function (z) { return s._foco.items.some(function (it) { return it.obj === z; }); }),
    "las tres opciones están en el cursor (grupoFoco), junto con las localidades del mapa");
  /* ARRANCAR sin tocar nada: INTERMEDIO, cero toques de más */
  var toques = 0;
  var tocar = function (x, y) { toques++; return s.tocar(x, y); };
  tocar(480, 438);
  var pend = A.registry.get("carreraPendiente");
  assert(toques === 1 && s._irA.indexOf("editor") >= 0 && pend && pend.tempo === "intermedio",
    "un solo toque (ARRANCAR) y la carrera sale con INTERMEDIO (" + JSON.stringify(pend) + ")");
  /* elegir CORTO: la marca se muda y viaja por el editor hasta el save */
  A.registry.remove("carreraPendiente"); s._irA.length = 0;
  var zCorto = zonas[0];
  tocar(zCorto.x, zCorto.y);
  assert(s._tempoElegido === "relampago" && marca.x === xDe("CORTO"), "tocar CORTO lo elige y ELEGIDO se muda debajo de CORTO");
  assert(s._foco.items[s._foco.i].obj === zCorto, "y el cursor queda en CORTO");
  tocar(480, 438);
  assert(A.registry.get("carreraPendiente").tempo === "relampago", "ARRANCAR lleva CORTO en el pendiente");
  reiniciar(s);                                     // de vuelta del editor: la entrevista
  assert(/TU HISTORIA/.test(s.textos().join("|")) && s._tempoDeLaCarrera === "relampago", "de vuelta del editor, la entrevista con el tempo pendiente");
  s._crearCarrera("primera_b", null);
  var sv = JSON.parse(A.localStorage.getItem("pampa_master_v1"));
  assert(sv.tempo === "relampago", "la carrera queda guardada con CORTO (save.tempo = relampago)");
  console.log("[2] la creación: 3 opciones a 13 px o más, NORMAL con ELEGIDO, piso táctil y cursor · ARRANCAR solo = INTERMEDIO (1 toque) · CORTO llega al save");
})();

/* ---------- [3] 18 FECHAS SEGUIDAS, CON EL create() DEL PARTIDO ----------
   El partido corre su create() de verdad (_create_de_mentira.js): lo de
   Phaser es un stub universal y la lógica y los datos son los de verdad. */
var PARTIDO = require("./_create_de_mentira.js").jugar;

(function () {
  /* una carrera nueva con LARGO, jugada 18 fechas por el Master real */
  var A3 = M.armar();
  var sv0 = A3.carreraNueva(); sv0.tempo = "largo";
  A3.localStorage.setItem("pampa_master_v1", JSON.stringify(sv0));
  var Tlog = A3.window.PampaTemporada;
  var menus = 0, conJerga = [], tempos = [], fechas = [];
  for (var f = 0; f < 18; f++) {
    var m = A3.nueva(); m.create();
    var mp = Tlog.miPartido(m.save.temporada);
    var rival = mp.local === m.save.temporada.miClub ? mp.visita : mp.local;
    m.irALaCancha(rival);
    var mpReg = A3.registry.get("masterPartido");
    var P = PARTIDO(mpReg);
    if (P.estados.indexOf("TEMPO_MENU") >= 0 || P.textos.some(function (t) { return /QUÉ PARTIDO JUGAMOS/.test(t); })) menus++;
    P.textos.forEach(function (t) { if (/momento|el clásico entero|Tempo /i.test(t)) conJerga.push(t); });
    tempos.push(mpReg.tempo + ":" + P.s.st.bal.tempo.minutos_por_momento);
    fechas.push(mpReg.fecha);
    /* el pitazo: el resultado vuelve al Master, que avanza la fecha */
    A3.registry.remove("masterPartido");
    A3.registry.set("masterResultado", { temporadaN: mpReg.temporadaN, fecha: mpReg.fecha, golesMio: 1, golesRival: 0 });
  }
  assert(menus === 0, "SÍNTOMA DEL MENÚ DE CADA FECHA: en 18 fechas el partido armó el menú de tempo " + menus + " veces");
  assert(conJerga.length === 0, "el arranque del partido no habla de momentos ni de tempo (" + Array.from(new Set(conJerga)).slice(0, 3).join(" | ") + ")");
  assert(tempos.every(function (t) { return t === "largo:" + BAL.tempo.presets.largo; }),
    "las 18 fechas juegan con el tempo de la carrera, LARGO (" + Array.from(new Set(tempos)).join(", ") + ")");
  assert(fechas.join(",") === "0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17", "son 18 fechas seguidas de la misma temporada (" + fechas.join(",") + ")");
  assert(BAL.tempo.minutos_por_momento === 2.2, "y el balance compartido sigue en 2.2 después de 18 partidos");
  /* el amistoso (sin masterPartido) juega INTERMEDIO sin preguntar */
  var Am = PARTIDO(undefined);
  assert(Am.estados.indexOf("TEMPO_MENU") < 0 && Am.s.st.bal.tempo.minutos_por_momento === BAL.tempo.presets.intermedio,
    "el partido sin carrera (amistoso) juega INTERMEDIO sin preguntar");
  console.log("[3] 18 fechas con el create() real: 0 menús de tempo · todas en " + tempos[0] + "' · el amistoso en INTERMEDIO");
})();

/* ---------- [4] NO QUEDA NADA DEL MENÚ VIEJO ---------- */
(function () {
  var escenas = fs.readdirSync(path.join(RAIZ, "phaser/scenes")).filter(function (f) { return /\.js$/.test(f); });
  var sucios = [];
  escenas.concat(["../logic/atras.js", "../index.html"]).forEach(function (f) {
    var src = leer(path.join("phaser/scenes", f));
    if (/TEMPO_MENU|menuTempoSiCorresponde|"pampa_tempo"/.test(src)) sucios.push(f);
  });
  assert(sucios.length === 0, "no queda el estado TEMPO_MENU, el menú ni la clave pampa_tempo (" + sucios.join(", ") + ")");
  console.log("[4] sin TEMPO_MENU, sin menuTempoSiCorresponde, sin pampa_tempo");
})();

if (mal === 0) console.log("\n✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("\n✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
