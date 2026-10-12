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

   LO QUE SE PRUEBA:
     [1] logic/carga.js decidirAvisoVersion: misma versión → nada (la página
         ya bajó el código nuevo: recargar no cambia nada); versión nueva en
         pleno partido o con "Algo se trabó" → esperar; fuera → mostrar; ya
         mostrado o descartado con DESPUÉS → nada;
     [2] index.html: el cartel con el texto exacto, dos botones con ícono y
         texto (no solo color), de 48 px, y por encima del juego pero debajo
         de los avisos que mandan;
     [3] el script de LA RED de index.html CORRIENDO (cortado del texto) con
         un navegador de mentira: al cambiar de worker pregunta la versión;
         con la misma, nada; con otra en pleno partido, espera, y aparece
         cuando el partido termina; ACTUALIZAR recarga; DESPUÉS lo esconde
         hasta la versión siguiente; con "Algo se trabó", espera;
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
  console.log("[1] misma versión → nada · nueva en el partido → esperar · nueva afuera → mostrar");

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
  var controlador = { postMessage: function (d) { aLaPagina.push(d); } };
  var ctx = {
    PampaCarga: C, PAMPA_VERSION: "v17-prueba", PampaRed: { tipo: null },
    PAMPA_GAME: { registry: { get: function () { return { red_floja: { version_reintento_ms: 2000 } }; } },
      scene: { isActive: function (k) { return k === "match" && partido; } } },
    document: { getElementById: function (id) { return els[id] || null; } },
    performance: { setResourceTimingBufferSize: function () { }, getEntriesByType: function () { return []; }, now: function () { return reloj.t; } },
    location: { search: "", protocol: "https:", hostname: "x.test", reload: function () { recargas++; } },
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
  partido = false;
  await reloj.avanzar(2000);
  assert(!cartel.hidden, "terminado el partido, aparece \"" + TEXTO + "\"");
  els["vn-actualizar"].click();
  assert(recargas === 1, "ACTUALIZAR recarga la página");
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
  console.log("[3] pregunta al cambiar de worker · misma: nada · nueva en el partido: espera y aparece al terminar · ACTUALIZAR recarga · DESPUÉS hasta la próxima");

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
