/* ============================================================================
   PAMPA STAR · L05 — "HAY UNA VERSIÓN NUEVA · TOCÁ PARA ACTUALIZAR"

   LO QUE ESTABA MAL (leído en el código de antes): no había ningún oyente de
   controllerchange (grep vacío en phaser/). Con skipWaiting + clients.claim,
   un worker nuevo toma la página en el medio de la sesión y la página sigue
   con el código viejo hasta que alguien la cierra; en la PWA instalada,
   que no tiene botón de recargar, eso puede ser días. Nadie se enteraba.
   (El ítem sw-robusto pedía además el tope de 3 s y la música sin Range: por
   la corrección del crítico eso pasó a arranque-con-senal-floja y a
   cache-que-no-se-tira, y lo prueban red_lenta y cache_versiones.)

   REVISIÓN L05 (lo que encontraron los revisores, medido con este mismo
   script cortado de index.html): el cartel solo se MOSTRABA. Si aparecía en
   el Master y quien juega lo ignoraba y tocaba JUGAR LA FECHA, seguía arriba
   a la izquierda durante todo el partido: a 800x360 cubre del x lógico 0 al
   573 y del y 0 al 84, justo el 🔊, ⏸ PAUSA (x=88, toque hasta y=61) y la
   mano de cartas. Un toque ahí recargaba la página y se perdía el partido.
   Con el script de antes, partido=true y 60 s después: visible = true.
   Además "en el partido" era scene.isActive("match"), que solo mira RUNNING:
   mientras el partido carga sus poses (LOADING) contaba como "afuera".

   LO QUE SE PRUEBA:
     [1] logic/carga.js decidirAvisoVersion: misma versión → nada (la página
         ya bajó el código nuevo: recargar no cambia nada); versión nueva en
         pleno partido o con "Algo se trabó" → esperar; fuera → mostrar; ya
         mostrado o descartado con DESPUÉS → nada; A LA VISTA y arranca un
         partido (o "Algo se trabó") → esconder;
     [2] index.html: el cartel con el texto exacto, dos botones con ícono y
         texto (no solo color), de 48 px, y por encima del juego pero debajo
         de los avisos que mandan;
     [3] el script de LA RED de index.html CORRIENDO (cortado del texto) con
         un navegador de mentira: al cambiar de worker pregunta la versión;
         con la misma, nada; con otra en pleno partido, espera, y aparece
         cuando el partido termina; ACTUALIZAR recarga; DESPUÉS lo esconde
         hasta la versión siguiente; con "Algo se trabó", espera; y EL CASO
         QUE FALTABA: a la vista en el Master, arranca un partido → se
         esconde al toque (al evento "start" de la escena, antes de que cargue)
         y, aunque ese aviso no llegue, a lo sumo en version_reintento_ms;
         sigue escondido mientras carga, se juega y se pausa; termina el
         partido → vuelve;
     [3b] ACTUALIZAR desde el editor guarda la pinta antes de recargar (el
         toque recargaba y la pinta sin guardar se perdía);
     [4] sw.js de verdad: contesta "version?" con su VERSION y la anuncia a
         las páginas al activarse.

   Corré:  node phaser/test/aviso_version.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var M = require("./_sw_de_mentira.js");
var RAIZ = M.RAIZ;
function leer(f) { return fs.readFileSync(path.join(RAIZ, f), "utf8"); }
var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }
var C = require(path.join(RAIZ, "phaser/logic/carga.js"));
var INDEX = leer("phaser/index.html");
var TEXTO = "Hay una versión nueva · TOCÁ PARA ACTUALIZAR";

(async function () {
  /* ---------- [1] la decisión ---------- */
  var D = C.decidirAvisoVersion;
  assert(typeof D === "function", "SÍNTOMA: logic/carga.js no tiene decidirAvisoVersion");
  var base = { versionPagina: "v1", versionSW: "v2", enPartido: false, trabado: false, descartado: false, mostrado: false };
  function con(x) { return Object.assign({}, base, x); }
  assert(D(con({})) === "mostrar", "versión nueva, fuera del partido: mostrar");
  assert(D(con({ versionSW: "v1" })) === "nada", "misma versión: nada (la página ya bajó el código nuevo)");
  assert(D(con({ versionSW: null })) === "nada", "sin saber la versión del worker: nada");
  assert(D(con({ enPartido: true })) === "esperar", "en pleno partido: esperar");
  assert(D(con({ trabado: true })) === "esperar", "con 'Algo se trabó' a la vista: esperar");
  assert(D(con({ descartado: true })) === "nada" && D(con({ mostrado: true })) === "nada", "descartado con DESPUÉS, o ya mostrado: nada");
  assert(D(con({ mostrado: true, enPartido: true })) === "esconder", "SÍNTOMA DEL CARTEL SOBRE LA PAUSA: a la vista y arranca un partido → esconder");
  assert(D(con({ mostrado: true, trabado: true })) === "esconder", "a la vista y aparece \"Algo se trabó\" → esconder");
  assert(D(con({ mostrado: true, versionSW: "v1" })) === "esconder", "a la vista y la versión ya no es nueva → esconder");
  console.log("[1] misma versión → nada · nueva en el partido → esperar · nueva afuera → mostrar · a la vista y arranca el partido → esconder");

  /* ---------- [2] index.html ---------- */
  assert(INDEX.indexOf('<button type="button" id="vn-actualizar">↻ ' + TEXTO + '</button>') >= 0, "el cartel dice \"" + TEXTO + "\" con su ícono");
  assert(INDEX.indexOf('<button type="button" id="vn-despues">✕ DESPUÉS</button>') >= 0, "y tiene DESPUÉS, con ícono y texto");
  var css = (INDEX.match(/#version-nueva\{[^}]*\}/) || [""])[0];
  var z = +((css.match(/z-index:(\d+)/) || [])[1] || 0);
  assert(z > 50 && z < 60, "por encima del \"Girá el celular\" (50) y debajo de la caja del código (60), del atrás (70) y de \"Algo se trabó\" (100): z-index " + z);
  assert(/#version-nueva button\{[^}]*min-height:48px/.test(INDEX), "botones de 48 px de alto, para el dedo");
  assert(/addEventListener\("controllerchange"/.test(INDEX) && /tipo: "version\?"/.test(INDEX), "index.html escucha controllerchange y pregunta la versión");
  var B = JSON.parse(leer("phaser/data/balance.json"));
  assert(B.red_floja && B.red_floja.version_reintento_ms > 0 && /partido/.test(B.red_floja._version || ""), "balance.red_floja.version_reintento_ms, con su explicación");
  console.log("[2] el cartel, sus dos botones de 48 px y su lugar entre los avisos (z " + z + ")");

  /* ---------- [3] el script de LA RED, corriendo ---------- */
  var i0 = INDEX.indexOf("LA RED (tanda 1.0, L05)");
  var ini = INDEX.indexOf("*/", i0) + 2;
  var fin = INDEX.indexOf("</script>", ini);
  var codigo = INDEX.slice(ini, fin);
  assert(i0 > 0 && /PampaVersionNueva/.test(codigo), "se puede cortar el script de LA RED de index.html");
  var reloj = M.crearReloj();
  function elemento() {
    var e = { hidden: true, textContent: "", oyentes: {} };
    e.addEventListener = function (t, fn) { (e.oyentes[t] = e.oyentes[t] || []).push(fn); };
    e.click = function () { (e.oyentes.click || []).forEach(function (fn) { fn(); }); };
    return e;
  }
  var els = { "perf": elemento(), "version-nueva": elemento(), "vn-actualizar": elemento(), "vn-despues": elemento() };
  var aLaPagina = [], swOyentes = {}, recargas = 0, partido = true;
  /* las escenas, como las ve Phaser 3.80: sys.settings.status (INIT 1,
     START 2, LOADING 3, CREATING 4, RUNNING 5, PAUSED 6, SLEEPING 7,
     SHUTDOWN 8) y sys.events, que sobrevive a cada scene.start
     (Systems.shutdown solo apaga los de transición). Una escena creada que
     NUNCA arrancó queda en INIT (1): medido en el juego, "editor:1,
     master:1, match:1" con la intro corriendo. El partido arranca en
     RUNNING para el primer tramo. */
  function escena() {
    var s = { sys: { settings: { status: 1 }, oyentes: {} } };
    s.sys.events = { on: function (t, fn) { (s.sys.oyentes[t] = s.sys.oyentes[t] || []).push(fn); } };
    s.emitir = function (t) { (s.sys.oyentes[t] || []).forEach(function (fn) { fn(); }); };
    return s;
  }
  var escenas = { match: escena(), editor: escena(), master: escena() };
  escenas.match.sys.settings.status = 5;
  var guardadas = 0, ordenGuardarRecargar = [];
  escenas.editor.guardar = function () { guardadas++; ordenGuardarRecargar.push("guardar"); };
  var controlador = { postMessage: function (d) { aLaPagina.push(d); } };
  var ctx = {
    PampaCarga: C, PAMPA_VERSION: "v17-prueba", PampaRed: { tipo: null },
    PAMPA_GAME: { registry: { get: function () { return { red_floja: { version_reintento_ms: 2000 } }; } },
      scene: {
        getScene: function (k) { return escenas[k] || null; },
        isActive: function (k) { var s = escenas[k]; return !!s && s.sys.settings.status === 5; }
      } },
    document: { getElementById: function (id) { return els[id] || null; } },
    performance: { setResourceTimingBufferSize: function () { }, getEntriesByType: function () { return []; }, now: function () { return reloj.t; } },
    location: { search: "", protocol: "https:", hostname: "x.test", reload: function () { recargas++; ordenGuardarRecargar.push("recargar"); } },
    navigator: { serviceWorker: { controller: controlador,
      addEventListener: function (t, fn) { (swOyentes[t] = swOyentes[t] || []).push(fn); },
      startMessages: function () { }, register: function () { return Promise.resolve(); } } },
    addEventListener: function () { }, setTimeout: reloj.setTimeout, clearTimeout: reloj.clearTimeout, console: console
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(codigo, ctx, { filename: "index.html (LA RED)" });
  function swDice(d) { (swOyentes.message || []).forEach(function (fn) { fn({ data: d }); }); }
  function cambioDeWorker() { (swOyentes.controllerchange || []).forEach(function (fn) { fn(); }); }
  var cartel = els["version-nueva"];
  cambioDeWorker();
  assert(aLaPagina.some(function (d) { return d.tipo === "version?"; }), "SÍNTOMA: al cambiar de worker se le pregunta la versión");
  swDice({ tipo: "pampa-version", version: "v17-prueba" });
  assert(cartel.hidden, "con la misma versión que la página, no aparece nada");
  swDice({ tipo: "pampa-version", version: "v18" });
  assert(cartel.hidden, "con una versión nueva en pleno partido, no aparece");
  await reloj.avanzar(2000);
  assert(cartel.hidden, "a los 2 s, con el partido todavía en juego, sigue sin aparecer");
  escenas.match.sys.settings.status = 8;            // SHUTDOWN: se fue al Master
  escenas.master.sys.settings.status = 5;
  await reloj.avanzar(2000);
  assert(!cartel.hidden, "terminado el partido, aparece \"" + TEXTO + "\"");

  /* EL CASO QUE FALTABA: a la vista en el Master, quien juega no lo toca y
     entra a la fecha. Primero con el aviso "start" de la escena (lo que pasa
     en el juego: Systems.start lo emite antes del init y del preload) */
  escenas.master.sys.settings.status = 8;
  escenas.match.sys.settings.status = 2;            // START
  escenas.match.emitir("start");
  assert(cartel.hidden, "SÍNTOMA DEL CARTEL SOBRE LA PAUSA: estaba a la vista y arranca el partido → se esconde al toque (evento start)");
  escenas.match.sys.settings.status = 3;            // LOADING: el partido baja sus poses
  await reloj.avanzar(2000);
  assert(cartel.hidden, "mientras el partido carga, sigue escondido (isActive solo miraba RUNNING)");
  escenas.match.sys.settings.status = 5;            // RUNNING
  await reloj.avanzar(60000);
  assert(cartel.hidden, "60 s de partido: sigue escondido");
  swDice({ tipo: "pampa-version", version: "v18" });
  await reloj.avanzar(10);
  assert(cartel.hidden, "si el worker vuelve a avisar en pleno partido, sigue escondido");
  escenas.match.sys.settings.status = 8;
  escenas.master.sys.settings.status = 5;
  await reloj.avanzar(2000);
  assert(!cartel.hidden, "termina el partido: el cartel vuelve (no se dio por descartado)");
  /* y aunque el aviso "start" no llegue (la escena todavía no existía al
     engancharse, por ejemplo): lo ve el que mira cada version_reintento_ms */
  escenas.match.sys.settings.status = 5;
  await reloj.avanzar(2000);
  assert(cartel.hidden, "sin el evento start, el que vigila lo esconde a lo sumo en version_reintento_ms (2 s)");
  escenas.match.sys.settings.status = 8;
  await reloj.avanzar(2000);
  assert(!cartel.hidden, "y vuelve al terminar");

  /* [3b] ACTUALIZAR desde el editor: la pinta sin guardar no se pierde */
  escenas.master.sys.settings.status = 8;
  escenas.editor.sys.settings.status = 5;
  els["vn-actualizar"].click();
  assert(recargas === 1, "ACTUALIZAR recarga la página");
  assert(guardadas === 1 && ordenGuardarRecargar.join() === "guardar,recargar",
    "SÍNTOMA DE LA PINTA PERDIDA: desde el editor, ACTUALIZAR guarda la pinta y DESPUÉS recarga (" + ordenGuardarRecargar.join() + ")");
  escenas.editor.sys.settings.status = 8;
  escenas.master.sys.settings.status = 5;
  els["vn-actualizar"].click();
  assert(recargas === 2 && guardadas === 1, "fuera del editor, ACTUALIZAR recarga sin tocar la pinta");
  els["vn-despues"].click();
  assert(cartel.hidden, "DESPUÉS lo esconde");
  swDice({ tipo: "pampa-version", version: "v18" });
  await reloj.avanzar(4000);
  assert(cartel.hidden, "y no vuelve por la misma versión");
  ctx.PampaRed.tipo = "trabado";
  swDice({ tipo: "pampa-version", version: "v19" });
  assert(cartel.hidden, "con \"Algo se trabó\" a la vista, espera");
  ctx.PampaRed.tipo = null;
  await reloj.avanzar(2000);
  assert(!cartel.hidden, "una versión más nueva vuelve a aparecer cuando se puede");
  /* con el cartel a la vista llega otra versión y es en pleno partido */
  escenas.match.sys.settings.status = 5;
  swDice({ tipo: "pampa-version", version: "v20" });
  assert(cartel.hidden, "a la vista, llega otra versión en pleno partido: se saca de encima");
  /* un partido que todavía no arrancó nunca (INIT, 1) es AFUERA */
  escenas.match.sys.settings.status = 1;
  await reloj.avanzar(2000);
  assert(!cartel.hidden, "con la escena del partido en INIT (creada, nunca arrancada, como antes del primer partido) el cartel aparece");
  console.log("[3] pregunta al cambiar de worker · misma: nada · nueva en el partido: espera y aparece al terminar · a la vista y arranca el partido: se esconde (start o vigía de 2 s) y vuelve · ACTUALIZAR guarda la pinta en el editor y recarga · DESPUÉS hasta la próxima");

  /* ---------- [4] el worker dice su versión ---------- */
  var mundo = { caches: M.crearCaches(), red: M.crearRed(), reloj: M.crearReloj(), mensajes: [] };
  var W = M.cargar(M.leerSW(), mundo);
  var V = W.leer("VERSION");
  var respuesta = [];
  await W.mensaje({ tipo: "version?" }, { postMessage: function (d) { respuesta.push(d); } });
  assert(respuesta.length === 1 && respuesta[0].tipo === "pampa-version" && respuesta[0].version === V, "sw.js contesta \"version?\" con su VERSION (" + JSON.stringify(respuesta) + ")");
  await W.instalar(); await W.activar();
  assert(mundo.mensajes.some(function (d) { return d.tipo === "pampa-version" && d.version === V; }), "y la anuncia a las páginas al activarse");
  console.log("[4] sw.js contesta su versión (" + V + ") y la anuncia al activarse");

  console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
  process.exit(mal === 0 ? 0 : 1);
})().catch(function (e) {
  console.error("  ✗ el test se cortó: " + (e && e.stack || e));
  process.exit(1);
});
