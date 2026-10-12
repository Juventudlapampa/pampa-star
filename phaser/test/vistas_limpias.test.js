/* ============================================================================
   PAMPA STAR · LAS VISTAS DEL MASTER SE VACÍAN DE VERDAD (tanda 1.0, L03)

   EL BUG, medido en la auditoría y otra vez acá con master.js real:
     · las cinco vistas que se repintan sin cambiar de escena limpiaban con el
       removeAll del DisplayList. En Phaser 3.80.1 eso es
       Structs.List.removeAll(skipCallback): saca de la lista de dibujo pero
       NO DESTRUYE (y removeAll(true) tampoco: el true solo saltea callbacks).
       Los objetos quedaban invisibles y TOCABLES: tocar un rincón vacío de la
       semana abría "¿EMPEZAR OTRA CARRERA?", y la semana pasaba de 14 zonas
       táctiles a 47 después de tres elecciones;
     · los atajos 1..0 eran keyboard.once en cada repintado: se apilaban, y
       UNA tecla llenaba dos días (en la entrevista, contestaba dos preguntas);
     · foco_ui.js colgaba un `events.on("shutdown")` por cada arranque de la
       escena (14 → 17).

   Este test tiene dos mitades:
     [1] el GUARDIÁN ESTÁTICO: ninguna escena puede volver a usar el removeAll
         de la lista de hijos ni colgar oyentes de shutdown con `on`, y el
         master no usa keyboard.once para sus atajos;
     [2..5] master.js y foco_ui.js REALES corriendo sobre la escena de mentira
         (phaser/test/_escena_de_mentira.js), contando zonas táctiles, ranuras
         llenas y oyentes. Probado contra el master.js de antes: falla.

   Corré:  node phaser/test/vistas_limpias.test.js
           node phaser/test/vistas_limpias.test.js <otro/master.js> [<otro/foco_ui.js>]
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var M = require("./_escena_de_mentira.js");
var RAIZ = M.RAIZ;
var ESC = path.join(RAIZ, "phaser/scenes");

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* para probar el test contra otra versión de master.js (la de antes) */
var OTRO = process.argv[2] ? path.resolve(process.argv[2]) : null;
var OTRO_FOCO = process.argv[3] ? path.resolve(process.argv[3]) : null;

/* ---------- [1] EL GUARDIÁN ESTÁTICO ---------- */
(function () {
  var malos = [];
  fs.readdirSync(ESC).filter(function (f) { return /\.js$/.test(f); }).forEach(function (f) {
    var src = fs.readFileSync(path.join(ESC, f), "utf8");
    src.split("\n").forEach(function (l, i) {
      /* el texto exacto, también en comentarios: si alguien lo escribe en un
         comentario como receta, el próximo lo copia */
      if (l.indexOf("children.removeAll(") >= 0) malos.push(f + ":" + (i + 1) + " children.removeAll( — no destruye: usá vaciarVista()");
      if (/events\.on\(\s*["']shutdown["']/.test(l)) malos.push(f + ":" + (i + 1) + " events.on(\"shutdown\") — apila un oyente por arranque: usá once");
    });
  });
  malos.forEach(function (m) { assert(false, m); });
  var MASTER = fs.readFileSync(OTRO || path.join(ESC, "master.js"), "utf8");
  assert(!/keyboard\.once\(/.test(MASTER), "master.js no puede volver a los keyboard.once por repintado: los atajos van por atajo()");
  assert(/vaciarVista\(\) \{/.test(MASTER), "master.js tiene que tener vaciarVista()");
  console.log("[1] guardián estático · " + malos.length + " usos prohibidos en phaser/scenes");
})();

var A = M.armar({ master: OTRO || undefined, foco: OTRO_FOCO || undefined });
var W = A.window;
function escenaConCarrera() {
  var s = A.nueva();
  s.save = A.carreraNueva();
  s.T = W.PampaTemporada; s.Ma = W.PampaMaster; s.DIV = A.datos.divisiones;
  return s;
}
/* lo interactivo que está EN la lista de dibujo (lo que se ve), contra lo que
   el InputPlugin tiene anotado como tocable: tienen que ser lo mismo */
function interactivosVisibles(s) {
  var n = 0;
  (function barrer(l) { l.forEach(function (o) { if (o.input && o.input.enabled) n++; if (o.list) barrer(o.list); }); })(s.children.list);
  return n;
}

/* ---------- [2] LA TABLA NO DEJA FANTASMAS EN LA SEMANA ---------- */
(function () {
  var s = escenaConCarrera();
  s.vistaTemporada();
  var enTabla = s.tocables().length;
  assert(s.textos().indexOf("✕ empezar otra carrera") >= 0, "la tabla tiene su salida (control del test)");
  /* ▶ JUGAR LA FECHA, con el dedo, como en el juego */
  var b = s.tocar(310, 460);
  assert(b && b.type === "Rectangle", "el toque en (310,460) tiene que caer en JUGAR LA FECHA");
  /* si la semana abre con un evento, se elige con Enter (el cursor arranca en la primera) */
  if (s._semEvento && !s._semEventoResuelto) s.teclas("ENTER");
  assert(s.textos().some(function (x) { return /^LA SEMANA · fecha/.test(x); }), "estamos en la semana");
  var tocablesSemana = s.tocables().length, visibles = interactivosVisibles(s);
  assert(tocablesSemana === visibles,
    "SÍNTOMA: en la semana, las zonas táctiles (" + tocablesSemana + ") tienen que ser las interactivas que se ven (" + visibles + ")");
  /* los dos rincones de la auditoría: ahí abajo estaba el ✕ de la tabla */
  [[100, 514], [60, 514], [200, 470]].forEach(function (p) {
    var antes = s.textos().join("|");
    var o = s.tocar(p[0], p[1]);
    assert(!o || o.scene, "un toque en (" + p + ") no puede caer en un objeto destruido");
    assert(s.textos().indexOf("¿EMPEZAR OTRA CARRERA?") < 0,
      "SÍNTOMA: tocar el rincón vacío (" + p + ") de la semana abría ¿EMPEZAR OTRA CARRERA?");
    assert(!o || s.textos().join("|") === antes || o.type !== "Text",
      "el toque en (" + p + ") no cambia de pantalla");
  });
  console.log("[2] tabla " + enTabla + " zonas → semana " + tocablesSemana + " = " + visibles + " visibles · los rincones vacíos no hacen nada");
})();

/* ---------- [3] UNA TECLA, UNA RANURA, AUNQUE SE REPINTE ---------- */
(function () {
  var s = escenaConCarrera();
  s._semEventoResuelto = true;            // el evento no es lo que se mide acá
  s._semEvento = null;
  var rival = W.PampaTemporada.miPartido(s.save.temporada);
  rival = rival.local === s.save.temporada.miClub ? rival.visita : rival.local;
  var jugadas = 0;
  s.vistaSemana(rival, function () { jugadas++; });
  var n1 = s.tocables().length;
  /* tres repintados más, como los que hace la vista al sacar y poner */
  for (var k = 0; k < 3; k++) s.vistaSemana(rival, function () { jugadas++; });
  var n4 = s.tocables().length;
  assert(n4 === n1, "las zonas táctiles no se acumulan al repintar (1 pintada: " + n1 + ", 4 pintadas: " + n4 + ")");
  assert(s.input.keyboard.listenerCount("keydown-ONE") === 1,
    "después de 4 pintadas hay UN oyente de la tecla 1 (hay " + s.input.keyboard.listenerCount("keydown-ONE") + ")");
  s.teclas("ONE");
  var llenas = s.save.semana.elegidas.filter(Boolean).length;
  assert(llenas === 1, "SÍNTOMA: una tecla tiene que llenar UNA ranura (llenó " + llenas + ")");
  /* con el momento de la acción abierto, otra tecla no llena nada */
  s.teclas("TWO");
  assert(s.save.semana.elegidas.filter(Boolean).length === 1,
    "con el momento de la acción a la vista, la semana de abajo no se toca");
  /* el momento se cierra (su delayedCall) y la vista se rearma */
  s.correrTimers();
  s.teclas("TWO");
  assert(s.save.semana.elegidas.filter(Boolean).length === 2, "cerrado el momento, la tecla siguiente llena la segunda");
  s.correrTimers();
  assert(s.tocables().length === interactivosVisibles(s), "y las zonas táctiles siguen siendo las que se ven");
  console.log("[3] 4 repintados: " + n1 + " → " + n4 + " zonas · tecla 1 → " + llenas + " ranura(s) · tecla 2 con el momento abierto → nada");
})();

/* ---------- [4] LA ENTREVISTA: CUATRO ZONAS EN LAS TRES PREGUNTAS ---------- */
(function () {
  var s = escenaConCarrera();
  s.save = null;
  var creada = [];
  s._crearCarrera = function (div, origen) { creada.push({ div: div, origen: origen }); };
  s.vistaOrigen("primera_b");
  var zonas = [s.tocables().length];
  s.teclas("TWO");
  zonas.push(s.tocables().length);
  s.teclas("ONE");
  zonas.push(s.tocables().length);
  assert(zonas.every(function (z) { return z === 4; }), "SÍNTOMA: la entrevista tiene 4 zonas táctiles en cada pregunta (" + zonas.join(" → ") + ")");
  s.teclas("THREE");
  assert(creada.length === 1, "la tercera respuesta crea la carrera UNA vez (" + creada.length + ")");
  var V = W.PampaVida, D = A.datos.vida;
  var esperado = JSON.stringify(V.aplicarOrigen(D, [1, 0, 2]));
  assert(creada[0] && JSON.stringify(creada[0].origen) === esperado,
    "y con las respuestas que se tocaron, en orden (2, 1, 3): cada tecla contestó SU pregunta");
  console.log("[4] entrevista: zonas " + zonas.join(" → ") + " · la carrera se crea una vez con las respuestas 2-1-3");
})();

/* ---------- [5] EL CURSOR DEJA UN SOLO OYENTE DE SHUTDOWN ---------- */
(function () {
  var s = A.nueva();
  var cuentas = [];
  for (var k = 0; k < 4; k++) {
    var r = s.add.rectangle(480, 270, 200, 52, 0xffffff, 1);
    s.grupoFoco([{ obj: r, cb: function () { } }]);
    s.grupoFoco([{ obj: r, cb: function () { } }]);   // dos grupos en la misma vista
    cuentas.push(s.events.listenerCount("shutdown"));
    s.events.emit("shutdown");                          // la escena se apaga
    if (s.init) s.init();                               // y Phaser la vuelve a arrancar
  }
  assert(cuentas.every(function (c) { return c === 1; }),
    "SÍNTOMA: después de cada arranque queda UN oyente de shutdown del cursor (" + cuentas.join(", ") + ")");
  console.log("[5] oyentes de shutdown en 4 arranques: " + cuentas.join(", "));
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
