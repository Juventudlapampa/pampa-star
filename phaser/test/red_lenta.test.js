/* ============================================================================
   PAMPA STAR · L05 — CON SEÑAL QUE SE CUELGA (NO QUE FALTA), EL JUEGO ARRANCA

   LA META es el celular de una localidad con mala señal, donde la red casi
   nunca falta: se cuelga. LO QUE ESTABA MAL (leído en el código de antes):
     (1) index.html: los 14 fetch del arranque tenían .catch, que atrapa el
         rechazo pero no la espera, y el Promise.all esperaba a los catorce.
         Un JSON colgado dejaba la pantalla negra sin aviso. Solo las fuentes
         tenían tope (8 s);
     (2) la config de Phaser no fijaba "loader": el valor por defecto es
         loaderTimeout = 0 (vendor/phaser.min.js), sin tope, y los cuatro
         preload se tragaban el "loaderror" sin reintentar;
     (3) sw.js respondía de la caché solo si la red FALLABA, no si TARDABA;
     (4) el precache era Promise.allSettled + skipWaiting, y activate
         borraba la caché vieja: una instalación a medias por la señal se
         activaba igual y lo que no bajó se perdía con la caché anterior;
     (5) caches.match sin ignoreSearch: un link con ?ref= (los que proponen
         compartir y la portada) no encontraba sin red el index.html.

   LO QUE SE PRUEBA:
     [a] index.html: los 14 JSON van por jsonConTope (y ningún fetch suelto),
         el tope es de 8 s o menos, y la función CORRIENDO (cortada del
         texto de index.html): un fetch que no vuelve nunca da el respaldo a
         los 8 s simulados y corta el pedido; un JSON bien llega; un 404 o
         un JSON roto dan el respaldo. La config de Phaser fija
         loader.timeout > 0 desde balance.red_floja, y los cuatro preload
         llaman al reintento;
     [a2] logic/carga.js reintentarUnaVez con un loader de mentira: lo que
         falla se vuelve a encolar UNA vez con la misma clave y dirección, la
         segunda vez se deja; un preload nuevo arranca de cero;
     [b] EL CRITERIO: con un fetch que nunca resuelve y la respuesta en
         caché, sw.js responde en 3,1 s simulados o menos; el pedido
         siguiente, con la señal "floja", sale de la caché al toque; cuando la
         red por fin contesta, la caché se actualiza; una red que contesta a
         tiempo gana y apaga lo "flojo";
     [c] EL CRITERIO: con una URL del PRECACHE que falla, la instalación no
         termina, no hay skipWaiting y la caché anterior sigue existiendo
         entera; con una falla que se arregla al reintentar, se instala;
     [d] EL CRITERIO: sin red, una navegación a ./?ref=compartir (y a
         index.html?embed=1) devuelve el index.html guardado;
     [e] (revisión L05) el reintento del loader no baja dos veces lo mismo:
         con la cara colgada, el pedido que venció y el reintento hacen UN
         pedido a la red (antes, dos: el XHR que vence no corta la descarga
         del worker), y si esa descarga falla, el que esperaba la pide.
   REVISIÓN L05, el tope del loader: era 15 s con la cuenta de UN archivo,
   pero Phaser baja varios a la vez (6 en Android, 32 en el resto) y el tope
   es total por archivo. [a] ahora rehace la cuenta con el disco: el archivo
   más pesado × 8 × loader_paralelas ÷ 180 kbps tiene que entrar en el tope.
   Con PAMPA_SW=<ruta> corre contra otro sw.js (el de antes falla [b], [c] y
   [d]).

   Corré:  node phaser/test/red_lenta.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var M = require("./_sw_de_mentira.js");
var RAIZ = M.RAIZ;
function leer(f) { return fs.readFileSync(path.join(RAIZ, f), "utf8"); }
var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

var INDEX = leer("phaser/index.html");
var SW = M.leerSW();

(async function () {
  /* ---------- [a] index.html ---------- */
  var boot = INDEX.slice(INDEX.indexOf("const BALANCE_FALLBACK"));
  var sueltos = (boot.match(/\bfetch\(\s*"[^"]+\.json"/g) || []);
  assert(sueltos.length === 0, "SÍNTOMA: quedan fetch de JSON sin tope en el arranque: " + sueltos.join(" | "));
  var conTope = (boot.match(/jsonConTope\(\s*"[^"]+\.json"/g) || []);
  assert(conTope.length >= 14, "los 14 JSON del arranque van por jsonConTope (" + conTope.length + ")");
  var mT = INDEX.match(/const TOPE_JSON_MS = (\d+);/);
  var TOPE = mT ? +mT[1] : 0;
  assert(TOPE > 0 && TOPE <= 8000, "TOPE_JSON_MS entre 1 y 8000 ms (" + TOPE + ")");
  var ini = INDEX.indexOf("const TOPE_JSON_MS"), fin = INDEX.indexOf("/* balance + roster", ini);
  assert(ini > 0 && fin > ini, "se puede cortar jsonConTope del texto de index.html");
  var reloj = M.crearReloj();
  var abortados = [];
  var respuestas = {};
  var fetchMentira = function (url, opts) {
    var r = respuestas[url];
    var signal = opts && opts.signal;
    return new Promise(function (res, rej) {
      if (signal) signal.addEventListener("abort", function () { abortados.push(url); rej(new Error("AbortError")); });
      if (r === "colgada") return;
      if (r === 404) return res(new Response("no", { status: 404 }));
      if (r === "roto") return res(new Response("{ esto no es json", { status: 200 }));
      res(new Response(JSON.stringify(r || { ok: 1 }), { status: 200 }));
    });
  };
  var ctx = { window: { __PAMPA_RED: { topes: [] } }, fetch: fetchMentira, AbortController: AbortController,
    setTimeout: reloj.setTimeout, clearTimeout: reloj.clearTimeout, Promise: Promise, Response: Response };
  vm.createContext(ctx);
  vm.runInContext(INDEX.slice(ini, fin) + "\n;this.jsonConTope = jsonConTope;", ctx);
  respuestas["a.json"] = "colgada"; respuestas["b.json"] = { hola: "pampa" }; respuestas["c.json"] = 404; respuestas["d.json"] = "roto";
  var resA = "pendiente", resB, resC, resD;
  ctx.jsonConTope("a.json", { respaldo: true }).then(function (v) { resA = v; });
  ctx.jsonConTope("b.json", null).then(function (v) { resB = v; });
  ctx.jsonConTope("c.json", null).then(function (v) { resC = v; });
  ctx.jsonConTope("d.json", "R").then(function (v) { resD = v; });
  await reloj.avanzar(TOPE - 10);
  assert(resA === "pendiente", "antes del tope, el colgado sigue esperando");
  assert(resB && resB.hola === "pampa" && resC === null && resD === "R", "el JSON bien llega; el 404 y el roto dan el respaldo");
  await reloj.avanzar(20);
  assert(resA && resA.respaldo === true, "SÍNTOMA DE LA PANTALLA NEGRA: a los " + TOPE + " ms simulados el colgado da su respaldo (" + JSON.stringify(resA) + ")");
  assert(abortados.indexOf("a.json") >= 0, "y el pedido colgado se corta (AbortController)");
  assert(ctx.window.__PAMPA_RED.topes.join() === "a.json", "el tope vencido queda en __PAMPA_RED.topes (se ve con ?perf=1)");
  /* la config de Phaser y el balance */
  assert(/loader:\s*\{\s*timeout:\s*\(balance && balance\.red_floja && balance\.red_floja\.loader_timeout_ms\) \|\| \d+,\s*maxParallelDownloads:\s*\(balance && balance\.red_floja && balance\.red_floja\.loader_paralelas\) \|\| \d+\s*\}/.test(INDEX),
    "SÍNTOMA DEL PRELOAD ETERNO: la config de Phaser fija loader.timeout y loader.maxParallelDownloads desde balance.red_floja");
  var B = JSON.parse(leer("phaser/data/balance.json"));
  assert(B.red_floja && B.red_floja.loader_timeout_ms > 0 && typeof B.red_floja._nota === "string" && B.red_floja._nota.length > 100,
    "balance.red_floja.loader_timeout_ms > 0, con su _nota");
  /* REVISIÓN L05 · LA CUENTA DEL TOPE CON EL PARALELISMO DE VERDAD. El
     tope del XHR de Phaser es TOTAL desde send() y los archivos que bajan a
     la vez se reparten la señal (loaderMaxParallelDownloads: 6 en Android,
     32 en el resto, vendor/phaser.min.js). El tope de antes (15 s) era la
     cuenta de UN archivo: con 6 en paralelo a 180 kbps vencía todo lo de más
     de 56 KB, se pedía dos veces y quedaba el respaldo. La cuenta se rehace
     acá con el disco: si aparece un arte más pesado o suben las paralelas,
     rojo. */
  var KBPS_MIN = 180;   // la señal mínima de la _nota de balance.red_floja
  var pesado = { b: 0, f: "" };
  require("child_process").execSync("git ls-files assets", { cwd: RAIZ, encoding: "utf8" }).split(/\r?\n/)
    .filter(function (f) { return /\.(png|webp)$/.test(f) && f.indexOf("_fuente") < 0; })
    .forEach(function (f) { var b = fs.statSync(path.join(RAIZ, f)).size; if (b > pesado.b) pesado = { b: b, f: f }; });
  var par = B.red_floja.loader_paralelas;
  var necesario = pesado.b * 8 * par / KBPS_MIN;     // bits ÷ kbps = ms
  assert(par >= 1 && par <= 6, "balance.red_floja.loader_paralelas fija cuántos baja a la vez, entre 1 y 6 (" + par + ")");
  assert(B.red_floja.loader_timeout_ms >= necesario,
    "SÍNTOMA DE LAS POSES QUE NO LLEGAN: el tope alcanza para " + pesado.f + " (" + pesado.b + " B) con " + par + " a la vez a " + KBPS_MIN + " kbps: " +
    Math.round(necesario) + " ms necesarios, hay " + B.red_floja.loader_timeout_ms);
  assert(B.red_floja._nota.indexOf(String(B.red_floja.loader_timeout_ms).replace(/\B(?=(\d{3})+(?!\d))/g, ".")) >= 0 && /paralel/.test(B.red_floja._nota) && /180 kbps/.test(B.red_floja._nota),
    "la _nota cuenta la cuenta con el paralelismo y el valor que quedó");
  ["intro", "editor", "master", "match"].forEach(function (s) {
    var cod = leer("phaser/scenes/" + s + ".js");
    var pre = cod.slice(cod.indexOf("preload()"), cod.indexOf("preload()") + 900);
    assert(/window\.PampaCarga\.reintentarUnaVez\(this\.load\)/.test(pre), s + ".js: el preload engancha el reintento");
    assert(!/load\.on\("loaderror",\s*\([^)]*\)\s*=>\s*\{\s*(\/\*[^*]*\*\/\s*)?\}\)/.test(cod), s + ".js: no queda un loaderror que se traga el error sin reintentar");
  });
  console.log("[a] 14 JSON con tope de " + TOPE + " ms (el colgado da su respaldo y se corta) · loader.timeout " + B.red_floja.loader_timeout_ms +
    " con " + par + " a la vez (necesita " + Math.round(necesario) + " para " + pesado.f.split("/").pop() + " a " + KBPS_MIN + " kbps) · 4 preload con reintento");

  /* ---------- [a2] el reintento del loader ---------- */
  var C = require(path.join(RAIZ, "phaser/logic/carga.js"));
  function loaderMentira() {
    var L = { oyentes: {}, encolados: [] };
    L.on = function (ev, fn) { (L.oyentes[ev] = L.oyentes[ev] || []).push(fn); return L; };
    L.emitir = function (ev, a) { (L.oyentes[ev] || []).forEach(function (fn) { fn(a); }); };
    L.image = function (k, u) { L.encolados.push(["image", k, u]); return L; };
    L.json = function (k, u) { L.encolados.push(["json", k, u]); return L; };
    return L;
  }
  var L1 = loaderMentira();
  var reg = C.reintentarUnaVez(L1);
  L1.emitir("loaderror", { type: "image", key: "pose_remate", url: "../assets/poses/pose_remate.webp" });
  assert(L1.encolados.length === 1 && L1.encolados[0].join() === "image,pose_remate,../assets/poses/pose_remate.webp",
    "la primera falla se vuelve a encolar con la misma clave y dirección");
  L1.emitir("loaderror", { type: "image", key: "pose_remate", url: "../assets/poses/pose_remate.webp" });
  assert(L1.encolados.length === 1 && reg.perdidos.join() === "pose_remate", "la segunda falla se deja (el juego sigue con su respaldo)");
  L1.emitir("loaderror", { type: "json", key: "identidades_man", url: "../data/identidades_manifest.json" });
  assert(L1.encolados[1] && L1.encolados[1].join() === "json,identidades_man,../data/identidades_manifest.json", "un JSON también se reintenta");
  L1.emitir("loaderror", { type: "audio", key: "x", url: "x.ogg" });
  assert(L1.encolados.length === 2, "un tipo que no se sabe reencolar no se toca");
  var L2 = loaderMentira();
  C.reintentarUnaVez(L2);
  L2.emitir("loaderror", { type: "image", key: "pose_remate", url: "../assets/poses/pose_remate.webp" });
  assert(L2.encolados.length === 1, "un preload nuevo (otro scene.start) arranca de cero: nada queda guardado en la escena");
  assert(C.historial().length >= 4, "lo que pasó queda en PampaCarga.historial() para diagnóstico");
  console.log("[a2] reintento: una vez por archivo (imagen y JSON), la segunda se deja, cada preload de cero");

  /* ---------- [b] la red que se cuelga ---------- */
  var mundo = { caches: M.crearCaches(), red: M.crearRed(), reloj: M.crearReloj(), mensajes: [] };
  var W = M.cargar(SW, mundo);
  var ins = await W.instalar(); await W.activar();
  assert(ins.ok, "se instala (para tener copia en la caché)");
  var red = mundo.red, rl = mundo.reloj;
  red.colgar["phaser/logic/duel.js"] = "a_mano";
  var t0 = rl.t, cuando = null, res1 = null;
  var ev = W.pedir("phaser/logic/duel.js");
  assert(ev.respondio, "el worker toma el pedido");
  ev.res.then(function (r) { cuando = rl.t; res1 = r; }, function () { cuando = -1; });
  await rl.avanzar(3100);
  assert(cuando !== null && cuando > 0 && cuando - t0 <= 3100, "SÍNTOMA DE LA RED QUE SE CUELGA: con la red colgada y copia en caché responde en 3,1 s simulados o menos (" +
    (cuando === null ? "no respondió" : (cuando - t0) + " ms") + ")");
  var r1 = res1 && await M.leerRes(res1);
  assert(r1 && r1.status === 200 && r1.texto === fs.readFileSync(path.join(RAIZ, "phaser/logic/duel.js"), "utf8"), "y responde con la copia guardada");
  /* señal floja: el siguiente sale de la caché sin esperar */
  red.colgar["phaser/logic/tiro.js"] = "a_mano";
  var t1 = rl.t, cuando2 = null;
  W.pedir("phaser/logic/tiro.js").res.then(function () { cuando2 = rl.t; });
  await rl.avanzar(0);
  assert(cuando2 !== null && cuando2 - t1 === 0, "con la señal floja, el pedido siguiente sale de la caché al toque (" + (cuando2 === null ? "esperando" : (cuando2 - t1) + " ms") + ")");
  /* la red llega tarde: actualiza la caché */
  red.cambios["phaser/logic/duel.js"] = Buffer.from("// duel.js nuevo, llegado tarde");
  red.colgados.filter(function (c) { return c.ruta === "phaser/logic/duel.js"; }).forEach(function (c) { c.soltar(); });
  await ev.lista();
  var codigo = W.leer("CODIGO");
  var ent = mundo.caches.entrada(codigo, "phaser/logic/duel.js");
  assert(ent && Buffer.from(ent.buf).toString() === "// duel.js nuevo, llegado tarde", "cuando la red por fin contesta, la caché se actualiza de fondo");
  /* una red a tiempo gana y apaga lo flojo */
  red.colgados.forEach(function (c) { c.soltar(); });
  delete red.cambios["phaser/logic/duel.js"];
  var resRed = null;
  W.pedir("phaser/logic/perspectiva.js").res.then(function (r) { resRed = r; });
  await rl.avanzar(0);
  assert(resRed && resRed.status === 200, "una red que contesta a tiempo responde ella");
  var pedidoNoCache = red.log.filter(function (x) { return x.ruta === "phaser/logic/perspectiva.js"; }).pop();
  assert(pedidoNoCache && pedidoNoCache.cache === "no-cache", "el código se pide revalidando (no-cache): después de un deploy no se mezcla un script viejo de la caché HTTP");
  red.colgar["phaser/logic/avatar.js"] = "a_mano";
  var cuando3 = null, t3 = rl.t;
  W.pedir("phaser/logic/avatar.js").res.then(function () { cuando3 = rl.t; });
  await rl.avanzar(1000);
  assert(cuando3 === null, "y apaga lo flojo: el pedido siguiente vuelve a darle 3 s a la red (" + (cuando3 === null ? "esperando" : (cuando3 - t3) + " ms") + ")");
  await rl.avanzar(2100);
  assert(cuando3 !== null && cuando3 - t3 <= 3100, "y a los 3 s contesta la copia");
  red.colgados.forEach(function (c) { c.soltar(); });
  console.log("[b] red colgada: copia a los " + (cuando - t0) + " ms · floja: 0 ms · la red tarde actualiza · la red a tiempo gana");

  /* ---------- [c] instalación atómica ---------- */
  var mundoC = { caches: M.crearCaches(), red: M.crearRed(), reloj: M.crearReloj(), mensajes: [] };
  var Wc1 = M.cargar(SW, mundoC);
  await Wc1.instalar(); await Wc1.activar();
  var codigo1 = Wc1.leer("typeof CODIGO !== 'undefined' ? CODIGO : 'v16-toma'");
  var antes = mundoC.caches.claves(codigo1).length;
  mundoC.red.fallar["phaser/scenes/match.js"] = 404;
  var Wc2 = M.cargar(M.variante(SW, { version: "v-prueba-atomica" }), mundoC);
  var insC = await Wc2.instalar();
  var nombres = await mundoC.caches.keys();
  assert(!insC.ok, "SÍNTOMA DE LA INSTALACIÓN A MEDIAS: con scenes/match.js fallando, la instalación no termina");
  assert(!Wc2.estado.skipWaiting, "y no hay skipWaiting: el worker nuevo no se activa");
  assert(nombres.indexOf(codigo1) >= 0 && mundoC.caches.claves(codigo1).length === antes,
    "la caché anterior sigue existiendo entera (" + mundoC.caches.claves(codigo1).length + " de " + antes + ")");
  assert(nombres.indexOf("pampa-codigo-v-prueba-atomica") < 0, "y no queda una caché de código a medias (" + nombres.join(", ") + ")");
  delete mundoC.red.fallar["phaser/scenes/match.js"];
  mundoC.red.fallarVeces["phaser/scenes/match.js"] = 1;
  var Wc3 = M.cargar(M.variante(SW, { version: "v-prueba-atomica" }), mundoC);
  var insC3 = await Wc3.instalar();
  assert(insC3.ok && Wc3.estado.skipWaiting, "una falla que se arregla al reintentar no frena la instalación");
  console.log("[c] atómica: match.js en 404 → no se instala y quedan las " + antes + " entradas de " + codigo1 + "; con un tropiezo, reintenta y se instala");

  /* ---------- [d] sin red, ?ref= ---------- */
  var mundoD = { caches: M.crearCaches(), red: M.crearRed(), reloj: M.crearReloj(), mensajes: [] };
  var Wd = M.cargar(SW, mundoD);
  await Wd.instalar(); await Wd.activar();
  mundoD.red.modo = "caida";
  var indexTxt = leer("phaser/index.html");
  var casos = ["phaser/?ref=compartir", "phaser/index.html?embed=1", "phaser/"];
  for (var i = 0; i < casos.length; i++) {
    var evd = Wd.pedir(casos[i], { navegar: true });
    var rd = null, err = null;
    try { rd = await M.leerRes(await evd.res); } catch (e) { err = e; }
    assert(rd && rd.status === 200 && rd.texto === indexTxt, "SÍNTOMA DEL LINK COMPARTIDO: sin red, " + casos[i] + " devuelve el index.html guardado (" + (rd ? rd.status : err) + ")");
  }
  var Wd2 = M.cargar(SW, { caches: M.crearCaches(), red: mundoD.red, reloj: M.crearReloj(), mensajes: [] });
  var evd2 = Wd2.pedir("phaser/?ref=compartir", { navegar: true });
  var rd2 = await evd2.res;
  assert(rd2 && rd2.type === "error", "sin red y sin copia, error de red (el navegador muestra su aviso)");
  console.log("[d] sin red: ./?ref=compartir, index.html?embed=1 y ./ abren el index.html guardado");

  /* ---------- [e] el reintento del loader no baja dos veces lo mismo ---------- */
  var mundoE = { caches: M.crearCaches(), red: M.crearRed(), reloj: M.crearReloj(), mensajes: [] };
  var We = M.cargar(SW, mundoE);
  await We.instalar(); await We.activar();
  var cara = "assets/poses/caras/cara_colorado.png";
  var crudaCara = fs.readFileSync(path.join(RAIZ, cara));
  mundoE.red.limpiar();
  mundoE.red.colgar[cara] = "a_mano";
  var e1 = We.pedir(cara);
  await mundoE.reloj.avanzar(B.red_floja.loader_timeout_ms);       // el loader da por vencido el primero…
  var e2 = We.pedir(cara);                                           // …y lo vuelve a pedir
  await mundoE.reloj.avanzar(100);
  assert(mundoE.red.pedidosA(/cara_colorado/).length === 1,
    "SÍNTOMA DEL DOBLE DE DATOS: con la cara colgada, el reintento del loader se cuelga de la descarga que ya corre (pedidos a la red: " + mundoE.red.pedidosA(/cara_colorado/).length + ")");
  mundoE.red.colgados.forEach(function (c) { c.soltar(); });
  var re1 = await M.leerRes(await e1.res), re2 = await M.leerRes(await e2.res);
  await e1.lista(); await e2.lista();
  assert(re1.status === 200 && re1.buf.equals(crudaCara) && re2.status === 200 && re2.buf.equals(crudaCara), "cuando llega, los dos pedidos reciben la cara entera");
  assert(mundoE.caches.claves("pampa-assets").some(function (k) { return k.indexOf(cara + "?h=") === 0; }), "y queda en la caché");
  /* una descarga en vuelo que FALLA: el que esperaba la pide él */
  var otra = "assets/poses/caras/cara_melena.png";
  mundoE.red.limpiar();
  mundoE.red.colgar[otra] = "a_mano";
  var e3 = We.pedir(otra);
  await mundoE.reloj.avanzar(100);
  var e4 = We.pedir(otra);
  await mundoE.reloj.avanzar(100);
  mundoE.red.fallarVeces[otra] = 1;                 // la descarga en vuelo se corta (una vez)
  mundoE.red.colgados.forEach(function (c) { c.soltar(); });
  var r3 = "pendiente";
  try { await e3.res; r3 = "llegó"; } catch (err) { r3 = "error de red"; }
  var r4 = await M.leerRes(await e4.res); await e4.lista();
  assert(r3 === "error de red" && r4.status === 200 && r4.bytes === fs.statSync(path.join(RAIZ, otra)).size,
    "si la descarga en vuelo falla, el pedido que la esperaba la pide de nuevo y llega (" + r3 + " / " + r4.status + ")");
  console.log("[e] reintento del loader con la cara colgada: 1 pedido a la red, los dos reciben la cara; si la descarga en vuelo falla, el que esperaba la pide");

  console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
  process.exit(mal === 0 ? 0 : 1);
})().catch(function (e) {
  console.error("  ✗ el test se cortó: " + (e && e.stack || e));
  process.exit(1);
});
