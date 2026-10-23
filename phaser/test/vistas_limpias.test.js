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
  /* si la semana abre con un evento, se elige con Enter (el cursor arranca en la primera).
     20/oct, Rodri: las opciones salen cuando el evento terminó de escribirse */
  s.leerHastaElFinal();
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
    /* revisión L03: antes era `!o || textos === antes || o.type !== "Text"`,
       que pasaba igual si el toque caía en un Rectangle (un botón) que SÍ
       cambiaba la vista. Ahora se pide lo que dice el mensaje */
    assert(s.textos().join("|") === antes,
      "el toque en (" + p + ") no cambia de pantalla (tocó: " + (o ? o.type + " " + (o.text || "") : "nada") + ")");
  });
  console.log("[2] tabla " + enTabla + " zonas → semana " + tocablesSemana + " = " + visibles + " visibles · los rincones vacíos no hacen nada");
})();

/* ---------- [3] UNA TECLA, UNA RANURA, AUNQUE SE REPINTE ---------- */
(function () {
  var s = escenaConCarrera();
  /* 23/oct, pedido de Rodri: la semana de fábrica es la de cuatro cosas
     (test/semana_cuatro.test.js). Esto prueba la de tres días, que sigue
     en el código y vuelve con flags.semana_cuatro en false */
  s.game.registry.get("balance").flags.semana_cuatro = false;
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
  /* 20/oct, Rodri: las respuestas salen cuando la pregunta terminó de
     escribirse; antes de eso no hay ninguna zona */
  s.vistaOrigen("primera_b");
  var antes = s.tocables().length;
  s.leerHastaElFinal();
  var zonas = [s.tocables().length];
  s.teclas("TWO");
  s.leerHastaElFinal();
  zonas.push(s.tocables().length);
  s.teclas("ONE");
  s.leerHastaElFinal();
  zonas.push(s.tocables().length);
  assert(antes === 0, "con la pregunta escribiéndose no hay respuestas para tocar (" + antes + ")");
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

/* ---------- [6] LA ENTREVISTA, UNA VOZ POR VEZ ----------
   23/oct, Rodri: "en la entrevista los diálogos están mal puestos y no se
   leen". Tu respuesta salía en una franja oscura suelta debajo del globo de
   Nito, con el globo de Nito vacío al lado. Ahora (flags.entrevista_un_globo)
   hay un solo globo: su nombre arriba, el texto adentro, el que escucha
   apagado y las respuestas cuando terminó la pregunta. */
(function () {
  var s = escenaConCarrera();
  s.save = null;
  s._crearCarrera = function () { };
  var Wd = s.scale.width;
  var bx = 168, derecha = Wd - 160;
  var dialogo = function () {
    return s.children.list.filter(function (o) { return o.type === "Text" && o.active !== false && o.x === bx + 18; });
  };
  var velos = function () { return s.children.list.filter(function (o) { return o.type === "Rectangle" && o.fillColor === 0x060f0a; }); };
  s.vistaOrigen("primera_b");
  var d = dialogo();
  assert(d.length === 2 && /NITO CARRIZO/.test(d[0].text) && d[0].y < d[1].y, "pregunta Nito: su nombre arriba y el texto abajo, en el mismo globo (" + d.map(function (t) { return t.text.slice(0, 20); }).join(" | ") + ")");
  assert(parseInt(d[1].style.fontSize, 10) >= 17 && parseInt(d[0].style.fontSize, 10) >= 13, "el texto del globo va a 17 px y el nombre a 14");
  var v = velos();
  assert(v.length === 2 && v.filter(function (r) { return r.visible; }).length === 1 && v.filter(function (r) { return r.visible; })[0].x > Wd / 2,
    "mientras pregunta Nito, el apagado es tu retrato (derecha)");
  assert(s.tocables().length === 0, "con la pregunta escribiéndose no hay respuestas");
  s.leerHastaElFinal();
  var b = d[1].getBounds();
  assert(b.left >= bx + 18 && b.right <= derecha - 18, "el texto entero entra en el ancho del globo (" + Math.round(b.left) + " a " + Math.round(b.right) + ", globo de " + bx + " a " + derecha + ")");
  assert(s.tocables().length === 4 && s.textos().some(function (t) { return /no hay opción mala/.test(t); }), "terminada la pregunta, abajo las cuatro respuestas y la ayuda");
  /* contestar: primero hablás vos, en el mismo globo, y Nito escucha */
  s.teclas("ONE");
  d = dialogo();
  assert(d.length === 2 && d[0].text === "VOS", "tu respuesta la decís vos, con VOS arriba (" + d.map(function (t) { return t.text.slice(0, 20); }).join(" | ") + ")");
  v = velos();
  assert(v.filter(function (r) { return r.visible; }).length === 1 && v.filter(function (r) { return r.visible; })[0].x < Wd / 2, "mientras hablás vos, el apagado es Nito (izquierda)");
  var sueltos = s.children.list.filter(function (o) { return o.type === "Text" && o.style && o.style.backgroundColor === "#0a1f13dd"; });
  assert(sueltos.length === 0, "SÍNTOMA: la respuesta en una franja oscura suelta, fuera del globo (" + sueltos.length + ")");
  s.tocarAfuera();
  d = dialogo();
  assert(/NITO CARRIZO/.test(d[0].text) && v.filter(function (r) { return r.visible; })[0].x > Wd / 2, "terminada tu respuesta, el globo vuelve a Nito para la pregunta siguiente");
  assert(s.textos().filter(function (t) { return t === "VOS"; }).length === 0, "y una sola voz por vez: VOS ya no está arriba del globo");
  /* con la perilla apagada vuelve lo de antes */
  var s2 = escenaConCarrera();
  s2.save = null;
  s2.game.registry.set("balance", Object.assign({}, s2.game.registry.get("balance"), { flags: Object.assign({}, s2.game.registry.get("balance").flags, { entrevista_un_globo: false }) }));
  s2.vistaOrigen("primera_b"); s2.leerHastaElFinal(); s2.teclas("ONE");
  assert(s2.children.list.some(function (o) { return o.type === "Text" && o.style && o.style.backgroundColor === "#0a1f13dd"; }), "con flags.entrevista_un_globo en false vuelve la respuesta en su franja");
  s2.game.registry.set("balance", Object.assign({}, s2.game.registry.get("balance"), { flags: Object.assign({}, s2.game.registry.get("balance").flags, { entrevista_un_globo: true }) }));
  console.log("[6] la entrevista: un globo, nombre arriba, el que escucha apagado, respuestas al final");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
