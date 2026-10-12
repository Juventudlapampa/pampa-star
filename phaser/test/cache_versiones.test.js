/* ============================================================================
   PAMPA STAR · L05 — UN DEPLOY NUEVO NO LE HACE BAJAR TODO A QUIEN YA JUGÓ

   LO QUE ESTABA MAL (sw.js de antes de este lote, leído y corrido acá):
     · todo, imágenes de /assets/ incluidas, iba a UNA caché, y activate
       borraba toda caché que no se llamara igual. Cada versión nueva tiraba
       las poses, caras y fondos ya bajados: unos 12 MB por persona y por
       deploy (14.102.712 bytes de assets servidos, du sobre git ls-files),
       con datos prepagos. Por eso desde L01 el nombre de la caché estaba
       congelado en "v16-toma";
     · la música no entraba nunca: el <audio> pide con Range, el server
       contesta 206 y Cache.put rechaza los 206. Volvía a bajar en cada
       sesión;
     · además activate borraba TODA caché con otro nombre, aunque fuera de
       otro juego de la misma cuenta (el hosting comparte el origen entre los repos).

   LO QUE SE PRUEBA (phaser/sw.js de verdad, corriendo en node sobre un
   CacheStorage y una red de mentira: test/_sw_de_mentira.js):
     [1] se instala v1: el código va a pampa-codigo-<VERSION>, los assets
         del PRECACHE y los tres temas a pampa-assets, con su huella en la
         clave;
     [2] se piden 3 poses: la primera vez a la red (sin Range y revalidando),
         la segunda de la caché;
     [3] EL CRITERIO: se instala v2 con otra VERSION y los mismos assets. Se
         va la caché de código vieja, queda pampa-assets, y ni la instalación
         ni los pedidos de las 3 poses tocan la red para un asset;
     [4] v3 con la huella de UNA pose cambiada: activate borra su entrada
         vieja y, de las 3, se pide a la red exactamente esa;
     [5] la música: un pedido con Range a un .ogg deja en la caché un 200
         (el archivo entero, pedido sin Range) y contesta 206 con el pedazo
         justo; el segundo pedido no toca la red;
     [6] la mudanza: lo de la caché vieja "v16-toma" que coincide con la
         huella pasa a pampa-assets sin red; lo que no coincide, no; activate
         borra las cachés viejas NUESTRAS y deja la de otro juego;
     [7] calentar: lo que la página bajó antes de que el worker la
         controlara se guarda desde la caché HTTP ("force-cache"), y solo si
         su huella es la de ahora;
     [8] window.__PAMPA_RED: los avisos del worker (red con bytes, caché) y
         lo que la página bajó por fuera (logic/carga.js), y el renglón de
         ?perf=1;
     [9] un archivo nuevo de assets/ sin huella todavía se sirve, y se barre
         en la activación siguiente (no queda colgado para siempre);
     [10] (revisión L05) una copia vieja que devuelve la red (la CDN del
         hosting mientras se propaga un deploy) se sirve pero NO se guarda
         con la huella nueva; al instalar cuenta como no bajada (frena la
         instalación atómica, salvo que el reintento traiga la buena); un
         tema viejo del precache no entra y la instalación sigue.
   Con PAMPA_SW=<ruta> corre contra otro sw.js (el de antes falla [1], [3],
   [5] y [6]).

   Corré:  node phaser/test/cache_versiones.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var M = require("./_sw_de_mentira.js");
var RAIZ = M.RAIZ;
var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

var SW = M.leerSW();
var POSES = ["assets/poses/pose_remate.webp", "assets/poses/pose_quite.webp", "assets/poses/pose_festejo.webp"];
var esAssetRuta = function (r) { return /^assets\//.test(r) || /^phaser\/vendor\//.test(r) || /^phaser\/icon-/.test(r); };

(async function () {
  var caches = M.crearCaches(), red = M.crearRed(), reloj = M.crearReloj(), mensajes = [];
  var mundo = { caches: caches, red: red, reloj: reloj, mensajes: mensajes };
  var W1 = M.cargar(SW, mundo);
  var V1 = W1.leer("typeof VERSION !== 'undefined' ? VERSION : null");
  var CODIGO1 = W1.leer("typeof CODIGO !== 'undefined' ? CODIGO : null");
  var HUELLA = W1.leer("typeof ASSETS_HUELLA !== 'undefined' ? ASSETS_HUELLA : {}");
  var hDe = function (ruta) { return HUELLA[ruta]; };

  /* ---------- [1] instalar v1 ---------- */
  var ins = await W1.instalar();
  await W1.activar();
  var nombres = await caches.keys();
  assert(ins.ok && W1.estado.skipWaiting, "v1 se instala entera y pide skipWaiting (" + (ins.error && ins.error.message) + ")");
  assert(!!CODIGO1 && nombres.indexOf(CODIGO1) >= 0 && nombres.indexOf("pampa-assets") >= 0,
    "SÍNTOMA: una sola caché para todo. Quedan pampa-codigo-<VERSION> y pampa-assets (hay: " + nombres.join(", ") + ")");
  var enAssets = caches.claves("pampa-assets");
  var enCodigo = caches.claves(CODIGO1);
  assert(enAssets.some(function (k) { return k === "phaser/vendor/phaser.min.js?h=" + hDe("phaser/vendor/phaser.min.js"); }),
    "el motor va a pampa-assets con su huella en la clave");
  assert(enAssets.filter(function (k) { return /^assets\/fonts\//.test(k); }).length === 5, "las 5 tipografías, en pampa-assets");
  assert(!enCodigo.some(function (k) { return /^assets\//.test(k); }) && enCodigo.indexOf("phaser/index.html") >= 0 && enCodigo.indexOf("data/audio.json") >= 0,
    "el código y los datos van a la caché de código, y ningún asset");
  var temas = enAssets.filter(function (k) { return /^assets\/musica\//.test(k); });
  assert(temas.length === 3, "los tres temas del PRECACHE (menú y partido) entran al instalar: " + temas.join(", "));
  var ent = caches.entrada("pampa-assets", temas[0] || "x");
  assert(ent && ent.status === 200, "y entran como 200, el archivo entero");
  console.log("[1] v1 (" + V1 + "): " + enCodigo.length + " de código en " + CODIGO1 + " · " + enAssets.length + " en pampa-assets (motor, íconos, tipografías, " + temas.length + " temas)");

  /* ---------- [2] tres poses: red la primera vez, caché la segunda ---------- */
  red.limpiar();
  for (var i = 0; i < POSES.length; i++) {
    var ev = W1.pedir(POSES[i]);
    var r = await M.leerRes(await ev.res); await ev.lista();
    assert(r.status === 200 && r.bytes === fs.statSync(path.join(RAIZ, POSES[i])).size, POSES[i] + " llega entera (" + r.bytes + " bytes)");
  }
  var aRed = red.pedidosA(/^assets\/poses\//);
  assert(aRed.length === 3 && aRed.every(function (x) { return x.cache === "no-cache" && !x.rango; }),
    "la primera vez van a la red, revalidando y sin Range: " + JSON.stringify(aRed.map(function (x) { return [x.ruta, x.cache]; })));
  assert(POSES.every(function (p) { return caches.claves("pampa-assets").indexOf(p + "?h=" + hDe(p)) >= 0; }), "y quedan guardadas con su huella");
  red.limpiar();
  for (i = 0; i < POSES.length; i++) { ev = W1.pedir(POSES[i]); await ev.res; await ev.lista(); }
  assert(red.pedidosA(/^assets\//).length === 0, "la segunda vez salen de la caché, sin red");
  console.log("[2] 3 poses: a la red una vez (no-cache, sin Range), después de la caché");

  /* ---------- [3] EL CRITERIO: v2 con otra VERSION y los mismos assets ---------- */
  red.limpiar();
  var W2 = M.cargar(M.variante(SW, { version: "v-prueba-2" }), mundo);
  var CODIGO2 = W2.leer("typeof CODIGO !== 'undefined' ? CODIGO : null");
  ins = await W2.instalar();
  await W2.activar();
  nombres = await caches.keys();
  assert(ins.ok, "v2 se instala");
  assert(nombres.indexOf(CODIGO1) < 0 && nombres.indexOf(CODIGO2) >= 0, "la caché de código de v1 se fue y está la de v2 (" + nombres.join(", ") + ")");
  assert(nombres.indexOf("pampa-assets") >= 0, "pampa-assets sobrevive a la versión nueva");
  for (i = 0; i < POSES.length; i++) { ev = W2.pedir(POSES[i]); await ev.res; await ev.lista(); }
  var assetsARed = red.log.filter(function (x) { return esAssetRuta(x.ruta); });
  assert(assetsARed.length === 0, "SÍNTOMA DEL DEPLOY QUE TIRA TODO: con v2, ni la instalación ni las 3 poses piden un asset a la red (pidieron: " +
    assetsARed.map(function (x) { return x.ruta; }).join(", ") + ")");
  var codigoARed = red.log.filter(function (x) { return !esAssetRuta(x.ruta); }).length;
  console.log("[3] v2: 0 assets a la red (las 3 poses, tipografías, motor y temas siguen); " + codigoARed + " pedidos de código, revalidando");

  /* ---------- [4] v3 con la huella de UNA pose cambiada ---------- */
  red.limpiar();
  /* la pose retocada DE VERDAD: bytes nuevos en el server y su huella en
     sw.js (desde la revisión L05 el worker no guarda lo que no coincide con
     la huella, así que cambiar solo la huella ya no alcanza para simularlo) */
  var retocada = Buffer.concat([fs.readFileSync(path.join(RAIZ, POSES[1])), Buffer.from("retoque")]);
  red.cambios[POSES[1]] = retocada;
  var huellaRetocada = {}; huellaRetocada[POSES[1]] = require("./_huella.js").huellaDeBuffer(retocada);
  var W3 = M.cargar(M.variante(SW, { version: "v-prueba-3", huellaNueva: huellaRetocada }), mundo);
  var H3 = W3.leer("typeof ASSETS_HUELLA !== 'undefined' ? ASSETS_HUELLA : {}");
  await W3.instalar(); await W3.activar();
  var claves = caches.claves("pampa-assets");
  assert(claves.indexOf(POSES[1] + "?h=" + hDe(POSES[1])) < 0, "activate borró la entrada vieja de la pose cambiada");
  assert(claves.indexOf(POSES[0] + "?h=" + hDe(POSES[0])) >= 0 && claves.indexOf(POSES[2] + "?h=" + hDe(POSES[2])) >= 0, "y dejó las otras dos");
  for (i = 0; i < POSES.length; i++) { ev = W3.pedir(POSES[i]); await ev.res; await ev.lista(); }
  var pedidas = red.log.filter(function (x) { return esAssetRuta(x.ruta); }).map(function (x) { return x.ruta; });
  assert(pedidas.length === 1 && pedidas[0] === POSES[1], "de las 3, se pide a la red exactamente la que cambió: " + pedidas.join(", "));
  assert(caches.claves("pampa-assets").indexOf(POSES[1] + "?h=" + H3[POSES[1]]) >= 0, "y queda guardada con la huella nueva");
  console.log("[4] v3 con " + POSES[1].split("/").pop() + " cambiada: se pide esa sola");

  /* ---------- [5] la música: Range → 200 en la caché, 206 a la página ---------- */
  var tema = "assets/musica/Low_Light_Protocol_loop.ogg";
  var crudo = fs.readFileSync(path.join(RAIZ, tema));
  red.limpiar();
  ev = W3.pedir(tema, { headers: { range: "bytes=0-" } });
  var r1 = await M.leerRes(await ev.res); await ev.lista();
  var ped = red.pedidosA(/\.ogg$/);
  assert(ped.length === 1 && !ped[0].rango, "SÍNTOMA DE LA MÚSICA QUE NO ENTRA: al server se le pide el archivo entero, SIN Range (" + JSON.stringify(ped.map(function (x) { return x.rango; })) + ")");
  var e5 = caches.entrada("pampa-assets", tema + "?h=" + H3[tema]);
  assert(e5 && e5.status === 200 && e5.buf.byteLength === crudo.length, "en la caché queda un 200 con el archivo entero (" + (e5 && e5.buf.byteLength) + " de " + crudo.length + ")");
  assert(r1.status === 206 && r1.headers["content-range"] === "bytes 0-" + (crudo.length - 1) + "/" + crudo.length && r1.bytes === crudo.length,
    "a la página le llega 206 con Content-Range " + r1.headers["content-range"]);
  red.limpiar();
  ev = W3.pedir(tema, { headers: { range: "bytes=100-199" } });
  var r2 = await M.leerRes(await ev.res); await ev.lista();
  assert(red.log.length === 0, "el segundo pedido no toca la red");
  assert(r2.status === 206 && r2.bytes === 100 && r2.buf.equals(crudo.slice(100, 200)) && r2.headers["content-range"] === "bytes 100-199/" + crudo.length,
    "bytes=100-199 devuelve justo esos 100 bytes del archivo");
  ev = W3.pedir(tema, { headers: { range: "bytes=" + (crudo.length + 10) + "-" } });
  var r3 = await M.leerRes(await ev.res);
  assert(r3.status === 416, "un rango fuera del archivo da 416");
  ev = W3.pedir(tema);
  var r4 = await M.leerRes(await ev.res);
  assert(r4.status === 200 && r4.bytes === crudo.length, "sin Range, el 200 entero");
  console.log("[5] música: Range → al server sin Range, 200 en la caché, 206 justo a la página (0-, 100-199), 416 afuera");

  /* ---------- [6] la mudanza desde "v16-toma" ---------- */
  var c2 = M.crearCaches(), red2 = M.crearRed();
  var vieja = await c2.open("v16-toma");
  var buena = "assets/ui/fondo_menu.webp", mala = "assets/ui/heroe.webp";
  await vieja.put(M.BASE + buena, new Response(fs.readFileSync(path.join(RAIZ, buena)), { status: 200 }));
  await vieja.put(M.BASE + mala, new Response(Buffer.from("una versión vieja del archivo"), { status: 200 }));
  await vieja.put(M.BASE + "phaser/logic/duel.js", new Response("viejo", { status: 200 }));
  await (await c2.open("otro-juego-v1")).put(M.BASE + "../otro/x.png", new Response("x", { status: 200 }));
  var W6 = M.cargar(SW, { caches: c2, red: red2, reloj: M.crearReloj(), mensajes: [] });
  await W6.instalar();
  var a6 = c2.claves("pampa-assets");
  assert(a6.indexOf(buena + "?h=" + hDe(buena)) >= 0, "la pose que coincide con la huella pasa de v16-toma a pampa-assets");
  assert(red2.pedidosA(new RegExp(buena.replace(/[.]/g, "\\."))).length === 0, "sin pedirla a la red");
  assert(a6.indexOf(mala + "?h=" + hDe(mala)) < 0, "la que no coincide (bytes de otra versión) no se muda");
  await W6.activar();
  var n6 = await c2.keys();
  assert(n6.indexOf("v16-toma") < 0, "activate borra la caché vieja nuestra");
  assert(n6.indexOf("otro-juego-v1") >= 0, "y deja la de otro juego del mismo origen");
  console.log("[6] mudanza: " + buena.split("/").pop() + " pasa sin red, la vieja no; se va v16-toma y queda otro-juego-v1");

  /* ---------- [7] calentar ---------- */
  var c7 = M.crearCaches(), red7 = M.crearRed();
  var W7 = M.cargar(SW, { caches: c7, red: red7, reloj: M.crearReloj(), mensajes: [] });
  var calA = "assets/poses/pose_tiro.webp", calB = "assets/poses/pose_pase.webp";
  red7.cambios[calB] = Buffer.from("copia de antes del deploy");
  await W7.mensaje({ tipo: "calentar", urls: [M.BASE + calA, M.BASE + calB, M.BASE + calA, M.BASE + "assets/musica/Victory_Lap_At_Dawn.ogg", "https://otro.test/x.webp"] });
  var a7 = c7.claves("pampa-assets");
  var p7 = red7.log;
  assert(a7.indexOf(calA + "?h=" + hDe(calA)) >= 0, "calentar guarda lo que la página bajó por fuera");
  assert(p7.length === 2 && p7.every(function (x) { return x.cache === "force-cache"; }), "una vez cada uno, de la caché HTTP (force-cache), sin música ni otros orígenes: " + JSON.stringify(p7.map(function (x) { return [x.ruta, x.cache]; })));
  assert(a7.indexOf(calB + "?h=" + hDe(calB)) < 0, "una copia que no coincide con la huella no se guarda");
  console.log("[7] calentar: " + calA.split("/").pop() + " guardada (force-cache), la copia vieja no");

  /* ---------- [8] __PAMPA_RED ---------- */
  var C = require(path.join(RAIZ, "phaser/logic/carga.js"));
  var cuenta = C.nuevaCuenta();
  mensajes.length = 0;
  ev = W3.pedir(POSES[0]); await ev.res; await ev.lista();
  await W3.tiempos([{ name: M.BASE + 'phaser/index.html', transferSize: 310 }, { name: M.BASE + POSES[1], transferSize: 65000 }, { name: M.BASE + 'phaser/logic/duel.js', transferSize: 0 }]);
  var deRed = mensajes.filter(function (m) { return m.tipo === "pampa-red"; });
  var tanda = deRed.filter(function (m) { return m.origen === "red"; })[0];
  assert(tanda && tanda.bytes === 65310 && tanda.pedidos === 2,
    "lo que el worker bajó se cuenta por transferSize (un 304 suma sus 310 bytes, lo que no salió a la red, 0): " + JSON.stringify(tanda));
  assert(deRed.some(function (m) { return m.origen === "cache" && m.ruta === POSES[0]; }), "y cada respuesta de la caché se le avisa a la página que la pidió");
  deRed.forEach(function (m) { C.sumarRed(cuenta, m); });
  C.sumarDirecto(cuenta, { workerStart: 0, transferSize: 1000 });
  C.sumarDirecto(cuenta, { workerStart: 12, transferSize: 5000 });
  C.sumarDirecto(cuenta, { workerStart: 0, transferSize: 0 });
  assert(cuenta.directos === 1, "por fuera del worker cuenta solo lo que vino de la red y no pasó por él");
  var linea = C.textoRed(cuenta);
  assert(/^RED \d+,\d\d MB en \d+ pedidos/.test(linea) && /de la caché \d+/.test(linea), "el renglón de ?perf=1: " + linea);
  var html = fs.readFileSync(path.join(RAIZ, "phaser/index.html"), "utf8");
  assert(/<div id="perf" hidden><\/div>/.test(html) && /perf=1/.test(html) && /__PAMPA_RED/.test(html), "index.html tiene el renglón de ?perf=1 y window.__PAMPA_RED");
  assert(/addEventListener\("controllerchange"/.test(html) && /tipo: "calentar"/.test(html), "index.html manda calentar cuando el worker toma la página");
  assert(/<script src="logic\/carga\.js"><\/script>/.test(html), "index.html carga logic/carga.js");
  console.log("[8] " + linea);

  /* ---------- [9] un asset nuevo sin huella ---------- */
  var c9 = M.crearCaches(), red9 = M.crearRed();
  var W9 = M.cargar(SW, { caches: c9, red: red9, reloj: M.crearReloj(), mensajes: [] });
  red9.cambios["assets/ui/nuevo.webp"] = Buffer.from("un asset que todavía no tiene huella");
  ev = W9.pedir("assets/ui/nuevo.webp");
  var r9 = await M.leerRes(await ev.res); await ev.lista();
  assert(r9.status === 200 && c9.claves("pampa-assets").indexOf("assets/ui/nuevo.webp?h=sin") >= 0, "un asset sin huella se sirve y se guarda como ?h=sin");
  await W9.activar();
  assert(c9.claves("pampa-assets").indexOf("assets/ui/nuevo.webp?h=sin") < 0, "y la activación siguiente lo barre");
  console.log("[9] asset sin huella: se sirve y se barre en la activación siguiente");

  /* ---------- [10] una copia vieja de la red no se guarda con la huella nueva ---------- */
  /* REVISIÓN L05: responderAsset e instalar guardaban lo que devolvía la red
     sin calcular su huella (calentar y la mudanza sí la calculaban). El
     "no-cache" no cubre la copia vieja que puede tener la CDN del hosting
     mientras se propaga un deploy: esa copia quedaba con la clave de la
     huella NUEVA y nada la volvía a revisar hasta el próximo cambio de ese
     asset (el mismo síntoma de d6c88ae, en una ventana chica). */
  var c10 = M.crearCaches(), red10 = M.crearRed();
  var W10 = M.cargar(SW, { caches: c10, red: red10, reloj: M.crearReloj(), mensajes: [] });
  await W10.instalar(); await W10.activar();
  var vieja10 = "assets/poses/pose_volea.webp";
  red10.cambios[vieja10] = Buffer.from("la pose de antes del deploy, todavía en la CDN");
  ev = W10.pedir(vieja10);
  var r10 = await M.leerRes(await ev.res); await ev.lista();
  assert(r10.status === 200 && r10.texto === "la pose de antes del deploy, todavía en la CDN", "la copia vieja se sirve (es lo que hay)");
  assert(c10.claves("pampa-assets").indexOf(vieja10 + "?h=" + hDe(vieja10)) < 0,
    "SÍNTOMA DE LA COPIA VIEJA CON CLAVE NUEVA: no se guarda con la huella de ahora (hay: " + c10.claves("pampa-assets").filter(function (k) { return k.indexOf("pose_volea") >= 0; }).join(", ") + ")");
  delete red10.cambios[vieja10];
  red10.limpiar();
  ev = W10.pedir(vieja10); await ev.res; await ev.lista();
  assert(red10.pedidosA(/pose_volea/).length === 1 && c10.claves("pampa-assets").indexOf(vieja10 + "?h=" + hDe(vieja10)) >= 0,
    "el pedido siguiente vuelve a la red y, ya con la buena, la guarda");
  /* al instalar: un asset del PRECACHE con otra huella cuenta como no bajado */
  var fuente = "assets/fonts/VT323-Regular.ttf";
  var c10b = M.crearCaches(), red10b = M.crearRed();
  red10b.cambios[fuente] = Buffer.from("la tipografía de antes");
  var W10b = M.cargar(SW, { caches: c10b, red: red10b, reloj: M.crearReloj(), mensajes: [] });
  var ins10 = await W10b.instalar();
  assert(!ins10.ok && !W10b.estado.skipWaiting && c10b.claves("pampa-assets").every(function (k) { return k.indexOf("VT323") < 0; }),
    "al instalar, una tipografía con otra huella (dos veces: con el reintento) frena la instalación atómica y no se guarda");
  var c10c = M.crearCaches(), red10c = M.crearRed(), vez = 0;
  Object.defineProperty(red10c.cambios, fuente, { configurable: true, enumerable: true,
    get: function () { return vez++ === 0 ? Buffer.from("la tipografía de antes") : undefined; } });
  var W10c = M.cargar(SW, { caches: c10c, red: red10c, reloj: M.crearReloj(), mensajes: [] });
  var ins10c = await W10c.instalar();
  assert(ins10c.ok && c10c.claves("pampa-assets").indexOf(fuente + "?h=" + hDe(fuente)) >= 0 &&
    c10c.entrada("pampa-assets", fuente + "?h=" + hDe(fuente)).buf.byteLength === fs.statSync(path.join(RAIZ, fuente)).size,
    "si la copia vieja era de un momento, el reintento trae la buena, se instala y se guarda la de verdad");
  /* la música del precache, igual (a lo que dé: la instalación sigue) */
  var c10d = M.crearCaches(), red10d = M.crearRed();
  var temasPre = temas.map(function (k) { return k.split("?")[0]; });
  red10d.cambios[temasPre[0]] = Buffer.from("un tema de antes");
  var W10d = M.cargar(SW, { caches: c10d, red: red10d, reloj: M.crearReloj(), mensajes: [] });
  var ins10d = await W10d.instalar();
  assert(ins10d.ok && c10d.claves("pampa-assets").every(function (k) { return k.indexOf(temasPre[0]) < 0; }) &&
    c10d.claves("pampa-assets").filter(function (k) { return /^assets\/musica\//.test(k); }).length === 2,
    "un tema del precache con otra huella no se guarda, y la instalación sigue con los otros dos");
  console.log("[10] copia vieja de la red: se sirve pero no se guarda con la huella nueva; al instalar frena (o el reintento trae la buena); un tema viejo, afuera");

  console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
  process.exit(mal === 0 ? 0 : 1);
})().catch(function (e) {
  console.error("  ✗ el test se cortó: " + (e && e.stack || e));
  process.exit(1);
});
