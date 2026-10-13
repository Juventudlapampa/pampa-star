/* ============================================================================
   PAMPA STAR · L05 — EL PRECACHE COMPLETO Y LA HUELLA DE LOS ASSETS

   LO QUE ESTABA MAL (medido con node sobre el sw.js de antes de este lote):
     · al PRECACHE le faltaban 8 de los recursos que carga index.html:
       logic/musica.js, logic/mapa.js, logic/cartas.js, logic/foco.js,
       scenes/cartas_ui.js, scenes/foco_ui.js, ../data/eventos_temporada.json
       y ../data/audio.json. El service worker se registra en "load", así que
       en la primera visita esos pedidos no pasan por él: sin red, la segunda
       visita abría sin mapa de La Pampa (la lista de localidades en su
       lugar), sin cartas, sin cursor, sin eventos de la vida y sin música. No
       explotaba porque cada módulo tiene su guarda, que es justamente por qué
       nadie lo vio;
     · el único test que miraba sw.js revisaba un solo archivo
       (un_solo_reloj.test.js, scenes/reloj.js), y cada módulo nuevo repetía
       el olvido (lo dijeron tres informes de la auditoría);
     · los assets (poses, caras, fondos, música, tipografías) se sirven
       primero de la caché, y para que un cambio llegara había que acordarse
       de subir la versión: 13 de los 16 commits que tocaron assets/ desde el
       17/jul no tocaron sw.js. Uno era d6c88ae, el fondo del menú con el
       logo de una marca: quien ya lo tenía en caché lo siguió viendo.

   LO QUE SE PRUEBA:
     [1] la regla general: todo <script src>, todo fetch()/jsonConTope() de un
         .json, toda @font-face, el manifest y los íconos de index.html, los
         íconos del manifest y los load.json() de las escenas están en el
         PRECACHE. Así el próximo módulo (compartir, entorno, destellos,
         tutorial…) no puede repetir el olvido;
     [2] cada entrada del PRECACHE existe en disco: con la instalación
         atómica (red_lenta.test.js) un nombre mal escrito dejaría al service
         worker sin poder instalarse NUNCA;
     [3] los 8 de la auditoría, uno por uno (la regresión con nombre);
     [4] ASSETS_HUELLA de sw.js es IGUAL a la huella que da el disco. Si
         cambiaste, agregaste o borraste un asset, corré
           node phaser/test/sw_precache.test.js --escribir
         y commiteá sw.js junto con el asset;
     [5] el guardián se prueba a sí mismo: en una copia (los originales de
         assets/ no se tocan) un byte cambiado en una pose cambia su huella y
         [4] lo marca como "cambiado"; assets/_fuente y los .md no entran;
     [6] lo que el PRECACHE manda a la caché de assets (tipografías, motor,
         íconos) tiene huella: si no, el service worker lo volvería a bajar en
         cada versión.

   Con PAMPA_SW=<ruta> se corre contra otro sw.js (por ejemplo el de antes del
   lote: falla [1], [3] y [4]).

   Corré:  node phaser/test/sw_precache.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm"), os = require("os");
var H = require("./_huella.js");
var RAIZ = H.RAIZ;
function leer(f) { return fs.readFileSync(path.join(RAIZ, f), "utf8"); }

var SW_RUTA = process.env.PAMPA_SW ? path.resolve(process.env.PAMPA_SW) : path.join(RAIZ, "phaser/sw.js");

/* --escribir: regenera ASSETS_HUELLA en sw.js y sale */
if (process.argv.indexOf("--escribir") >= 0) {
  var nueva = H.calcularHuella();
  var antes = H.leerHuella(fs.readFileSync(SW_RUTA, "utf8")) || {};
  H.escribirHuella(SW_RUTA, nueva);
  var d = H.diferencias(antes, nueva);
  console.log("ASSETS_HUELLA reescrita en " + path.relative(RAIZ, SW_RUTA) + ": " + Object.keys(nueva).length + " archivos" +
    (d.nuevos.length ? " · nuevos: " + d.nuevos.join(", ") : "") +
    (d.cambiados.length ? " · cambiados: " + d.cambiados.join(", ") : "") +
    (d.sobran.length ? " · ya no están: " + d.sobran.join(", ") : ""));
  process.exit(0);
}

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

var SW_TEXTO = fs.readFileSync(SW_RUTA, "utf8");
var INDEX = leer("phaser/index.html");

/* sw.js se evalúa con un self de mentira para leer PRECACHE (las constantes
   de arriba del archivo quedan en el ámbito global del contexto) */
function cargarSW(texto) {
  var ctx = { console: console, URL: URL, Request: typeof Request !== "undefined" ? Request : function () { },
    Response: typeof Response !== "undefined" ? Response : function () { } };
  ctx.self = ctx;
  ctx.location = new URL("https://x.test/repo/phaser/sw.js");
  ctx.addEventListener = function () { };
  ctx.caches = {}; ctx.fetch = function () { return Promise.reject(new Error("sin red")); };
  vm.createContext(ctx);
  vm.runInContext(texto, ctx, { filename: "sw.js" });
  return {
    precache: vm.runInContext("typeof PRECACHE !== 'undefined' ? PRECACHE : null", ctx),
    huella: vm.runInContext("typeof ASSETS_HUELLA !== 'undefined' ? ASSETS_HUELLA : null", ctx),
    ctx: ctx
  };
}
var SW = null;
try { SW = cargarSW(SW_TEXTO); } catch (e) { assert(false, "sw.js no se puede evaluar: " + e.message); }
var PRECACHE = (SW && SW.precache) || [];

/* "./logic/x.js" y "logic/x.js" (relativas a phaser/) → "phaser/logic/x.js";
   "../data/x.json" → "data/x.json" */
function aRepo(ref) {
  return path.posix.normalize(path.posix.join("phaser", String(ref).split("?")[0].split("#")[0]));
}
var ENTRADAS = PRECACHE.map(aRepo);

/* ---------- [1] TODO LO QUE CARGA INDEX.HTML ESTÁ EN EL PRECACHE ---------- */
(function () {
  var refs = [];
  function sumar(ref, de) { if (ref && !/^(https?:|data:|\/\/)/.test(ref)) refs.push({ r: aRepo(ref), de: de }); }
  var m, re;
  re = /<script\b[^>]*\bsrc="([^"]+)"/g;
  while ((m = re.exec(INDEX))) sumar(m[1], "<script src>");
  re = /\b(?:fetch|jsonConTope)\(\s*"([^"]+\.json)"/g;
  while ((m = re.exec(INDEX))) sumar(m[1], "fetch");
  re = /@font-face\s*\{[^}]*url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
  while ((m = re.exec(INDEX))) sumar(m[1], "@font-face");
  re = /<link\b[^>]*\brel="(?:manifest|icon|apple-touch-icon)"[^>]*\bhref="([^"]+)"/g;
  while ((m = re.exec(INDEX))) sumar(m[1], "<link>");
  var man = JSON.parse(leer("phaser/manifest.webmanifest"));
  (man.icons || []).forEach(function (i) { sumar(i.src, "manifest.webmanifest"); });
  fs.readdirSync(path.join(RAIZ, "phaser/scenes")).filter(function (f) { return /\.js$/.test(f); }).forEach(function (f) {
    var t = leer("phaser/scenes/" + f), r = /\.load\.json\(\s*"[^"]+"\s*,\s*"([^"]+)"/g, mm;
    while ((mm = r.exec(t))) sumar(mm[1], "scenes/" + f + " load.json");
  });
  var scripts = refs.filter(function (x) { return x.de === "<script src>"; }).length;
  var jsons = refs.filter(function (x) { return x.de === "fetch"; }).length;
  assert(scripts >= 45, "index.html carga al menos 45 scripts (encontré " + scripts + "): si la regex dejó de ver, este test pasa sin mirar");
  assert(jsons >= 14, "index.html pide al menos 14 JSON al arrancar (encontré " + jsons + ")");
  var faltan = refs.filter(function (x) { return ENTRADAS.indexOf(x.r) < 0; });
  faltan.forEach(function (x) {
    assert(false, "SÍNTOMA: " + x.r + " (" + x.de + ") no está en el PRECACHE de sw.js: sin red, después de una visita, eso no abre");
  });
  if (!faltan.length) ok++;
  console.log("[1] " + refs.length + " recursos de arranque (" + scripts + " scripts, " + jsons + " JSON, fuentes, íconos, load.json) · faltan " + faltan.length);
})();

/* ---------- [2] CADA ENTRADA DEL PRECACHE EXISTE ---------- */
(function () {
  var rotas = ENTRADAS.filter(function (r) { return !fs.existsSync(path.join(RAIZ, r)); });
  rotas.forEach(function (r) { assert(false, "el PRECACHE pide " + r + " y no existe: la instalación atómica fallaría siempre"); });
  if (!rotas.length) ok++;
  var dup = ENTRADAS.filter(function (r, i) { return ENTRADAS.indexOf(r) !== i; });
  assert(dup.length === 0, "el PRECACHE no repite entradas (repetidas: " + dup.join(", ") + ")");
  console.log("[2] " + ENTRADAS.length + " entradas del PRECACHE, todas en disco");
})();

/* ---------- [3] LOS 8 DE LA AUDITORÍA ---------- */
(function () {
  ["phaser/logic/musica.js", "phaser/logic/mapa.js", "phaser/logic/cartas.js", "phaser/logic/foco.js",
   "phaser/scenes/cartas_ui.js", "phaser/scenes/foco_ui.js", "data/eventos_temporada.json", "data/audio.json"]
    .forEach(function (r) { assert(ENTRADAS.indexOf(r) >= 0, "SÍNTOMA DE LA AUDITORÍA: " + r + " no está en el PRECACHE"); });
  console.log("[3] musica, mapa, cartas, foco, cartas_ui, foco_ui, eventos_temporada y audio, en el PRECACHE");
})();

/* ---------- [4] LA HUELLA DE SW.JS ES LA DEL DISCO ---------- */
var HUELLA_DISCO = H.calcularHuella();
(function () {
  var enSw = (SW && SW.huella) || H.leerHuella(SW_TEXTO);
  assert(!!enSw, "SÍNTOMA: sw.js no tiene ASSETS_HUELLA. Un asset que cambia no le llega a quien ya jugó");
  if (!enSw) return;
  var d = H.diferencias(enSw, HUELLA_DISCO);
  var n = d.nuevos.length + d.cambiados.length + d.sobran.length;
  assert(n === 0, "ASSETS_HUELLA de sw.js no coincide con assets/ " +
    (d.cambiados.length ? "· cambiados: " + d.cambiados.join(", ") + " " : "") +
    (d.nuevos.length ? "· nuevos: " + d.nuevos.join(", ") + " " : "") +
    (d.sobran.length ? "· ya no están: " + d.sobran.join(", ") + " " : "") +
    "→ corré: node phaser/test/sw_precache.test.js --escribir (y commiteá sw.js con el asset)");
  assert(Object.keys(HUELLA_DISCO).length >= 100, "la huella cubre todos los assets servidos (" + Object.keys(HUELLA_DISCO).length + ")");
  var formato = Object.keys(enSw).every(function (k) { return /^\d+-[0-9a-f]{12}$/.test(enSw[k]); });
  assert(formato, "cada huella es tamaño-hash12 (lo que el service worker recalcula con crypto.subtle)");
  /* la huella se saca de los bytes EN DISCO y el sitio sirve los bytes
     COMMITEADOS. En esta compu git tiene core.autocrlf=true: un archivo de
     texto con saltos de línea quedaría con CRLF en disco y LF en el sitio, y
     la huella no coincidiría en otra máquina. Hoy el único de texto es
     phaser.min.js, que es una sola línea; si algún día entra otro, que
     vaya sin CR (o se normaliza acá). */
  var conCR = Object.keys(HUELLA_DISCO).filter(function (k) {
    return /\.(js|json|css|svg|txt)$/i.test(k) && fs.readFileSync(path.join(RAIZ, k)).indexOf(13) >= 0;
  });
  assert(conCR.length === 0, "archivos de texto con huella y CR en disco (su huella dependería de core.autocrlf): " + conCR.join(", "));
  console.log("[4] ASSETS_HUELLA = disco: " + Object.keys(HUELLA_DISCO).length + " archivos (assets/ sin _fuente, motor, íconos)");
})();

/* ---------- [5] EL GUARDIÁN SE PRUEBA A SÍ MISMO ---------- */
(function () {
  var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pampa-huella-"));
  try {
    var pose = Object.keys(HUELLA_DISCO).filter(function (k) { return /^assets\/poses\/[^/]+\.webp$/.test(k); })[0];
    assert(!!pose, "hay al menos una pose .webp para probar");
    function poner(rel, buf) { var f = path.join(tmp, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, buf); }
    var orig = fs.readFileSync(path.join(RAIZ, pose));
    poner(pose, orig);
    poner("assets/_fuente/crudo.png", Buffer.from("no se sirve"));
    poner("assets/fonts/README.md", Buffer.from("texto"));
    poner("phaser/vendor/phaser.min.js", Buffer.from("// motor"));
    poner("phaser/icon-192.png", Buffer.from("icono"));
    var h1 = H.calcularHuella(tmp);
    assert(h1[pose] === HUELLA_DISCO[pose], "la copia intacta da la misma huella que el original");
    assert(!("assets/_fuente/crudo.png" in h1) && !("assets/fonts/README.md" in h1), "assets/_fuente y los .md no entran en la huella");
    var cambiado = Buffer.from(orig); cambiado[Math.floor(cambiado.length / 2)] ^= 0x01;
    poner(pose, cambiado);
    var h2 = H.calcularHuella(tmp);
    var d = H.diferencias(h1, h2);
    assert(d.cambiados.length === 1 && d.cambiados[0] === pose && !d.nuevos.length && !d.sobran.length,
      "un byte cambiado en " + pose + " (misma medida: " + orig.length + " bytes) aparece como cambiado y nada más: " + JSON.stringify(d));
    console.log("[5] un byte cambiado en una copia de " + pose.split("/").pop() + " → huella distinta (" + h1[pose] + " → " + h2[pose] + ")");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})();

/* ---------- [6] LO QUE VA A LA CACHÉ DE ASSETS TIENE HUELLA ---------- */
(function () {
  var enSw = (SW && SW.huella) || {};
  var deAssets = ENTRADAS.filter(function (r) { return /^assets\//.test(r) || /^phaser\/vendor\//.test(r) || /^phaser\/icon-\d+(-maskable)?\.png$/.test(r); });
  var sin = deAssets.filter(function (r) { return !(r in enSw); });
  assert(deAssets.length >= 8, "el PRECACHE trae tipografías, motor e íconos (" + deAssets.length + ")");
  assert(sin.length === 0, "entradas del PRECACHE que irían a la caché de assets sin huella: " + sin.join(", "));
  console.log("[6] " + deAssets.length + " entradas del PRECACHE van a la caché de assets, todas con huella");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
