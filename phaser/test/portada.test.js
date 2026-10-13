/* ============================================================================
   PAMPA STAR · L07 — LA PORTADA EN VERTICAL, EL PÓSTER PARA MEDIOS E INSTALAR

   LO QUE ESTABA MAL (medido antes de este lote):
     · quien abre el link de un mensaje en vertical veía solo "📱↻ Girá el
       celular" (index.html): sin el nombre, sin qué es, y con la rotación
       automática apagada, sin salida;
     · embebido como lo embebe un medio local (iframe width:100%,
       height:1100px, sin allow) el juego quedaba en "Girá el celular" a 358,
       700 y 780 px: el @media se evalúa contra el iframe, que con 1100 de
       alto es siempre vertical. self !== top y embed daban 0 (grep);
     · index.html usaba 100dvh sin respaldo: un navegador que no entiende dvh
       descarta la regla y el juego quedaba sin alto;
     · beforeinstallprompt e "instalar" daban 0 (grep).

   LO QUE SE PRUEBA:
     [1] index.html, leído (el criterio de aceptación): el texto de la
         rotación automática, 100vh antes de cada 100dvh, la detección de
         embed en el <head> y el oyente de beforeinstallprompt; la portada
         con logo, qué es, JUGAR EN HORIZONTAL y cuánto baja (MEDIDO);
     [2] logic/entorno.js: embebido, modoEmbebido (los tres anchos del medio
         y el 16:9 de PARA_MEDIOS), urlParaJugar, horizontalPosible,
         ofrecerInstalar;
     [3] el script del <head> CORRIENDO dice lo mismo que entorno.embebido;
     [4] la portada CORRIENDO con un DOM de mentira: el póster y el arranque
         que espera, la pausa, JUGAR EN HORIZONTAL (pantalla completa y
         después horizontal, con los rechazos atrapados) e INSTALAR (Android
         con el evento, iPhone con los pasos, escondido instalada);
     [5] el worker no se instala embebido;
     [6] embed.html, la página liviana: qué baja, el póster y el salto a
         index.html?embed=1 cuando alcanza para jugar;
     [7] docs/PARA_MEDIOS.md tiene el iframe 16:9 con allow;
     [8] los textos nuevos con lenguaje institucional.

   Corré:  node phaser/test/portada.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm"), zlib = require("zlib"), cp = require("child_process");
var RAIZ = path.join(__dirname, "..", "..");
function leer(f) { return fs.readFileSync(path.join(RAIZ, f), "utf8").replace(/\r\n/g, "\n"); }
var E = require(path.join(RAIZ, "phaser/logic/entorno.js"));
var INDEX = leer("phaser/index.html");
var HEAD = INDEX.slice(0, INDEX.indexOf("</head>"));
var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }
function bloque(marca) {
  var b = null;
  (INDEX.match(/<script>([\s\S]*?)<\/script>/g) || []).forEach(function (s) { if (s.indexOf(marca) >= 0) b = s.replace(/^<script>|<\/script>$/g, ""); });
  return b;
}
var sueltos = [];
process.on("unhandledRejection", function (r) { sueltos.push(String(r)); });

/* ---------- [1] index.html, leído ---------- */
(function () {
  assert(/Rotación automática/.test(INDEX), "la portada dice cómo activar la Rotación automática");
  assert(/Bloqueo de rotación/.test(INDEX), "y en iPhone, cómo sacar el Bloqueo de rotación");
  /* cada 100dvh con su 100vh adelante, en la misma regla y la misma propiedad */
  var css = INDEX.slice(INDEX.indexOf("<style>"), INDEX.indexOf("</style>"));
  var dvh = css.match(/[a-z-]+:100dvh/g) || [];
  assert(dvh.length >= 2, "index.html usa 100dvh (" + dvh.length + ")");
  dvh.forEach(function (d) {
    var prop = d.split(":")[0];
    assert(css.indexOf(prop + ":100vh;" + prop + ":100dvh") >= 0, "SÍNTOMA: " + prop + ":100dvh lleva su respaldo " + prop + ":100vh adelante");
  });
  assert(/window\.self !== window\.top/.test(HEAD) && /embed=1/.test(HEAD) && /window\.PAMPA_EMBEBIDO = emb/.test(HEAD),
    "la detección de embed (iframe o ?embed=1) está en el <head>, antes de pintar");
  assert(/html\.embebido #rotate\{display:none !important;\}/.test(css), "embebido, la portada no se muestra nunca");
  assert(/html\.embebido\.poster #poster\{display:flex;\}/.test(css), "embebido y chico, va el póster");
  assert(/@media \(orientation:portrait\) and \(max-width:820px\)\{ #rotate\{display:flex;\} #game\{display:none;\} \}/.test(css),
    "el @media de la portada sigue igual (PampaPausa usa la misma consulta)");
  /* la portada */
  var rot = INDEX.slice(INDEX.indexOf('<div id="rotate"'), INDEX.indexOf('<div id="poster"'));
  assert(/pampa-star-logo\.webp/.test(rot) && /alt="PAMPA STAR"/.test(rot), "la portada tiene el logo (con su texto alternativo)");
  assert(/Fútbol pampeano/.test(rot) && /localidad/.test(rot), "y una línea de qué es");
  assert(/id="pt-horizontal"/.test(rot) && /JUGAR EN HORIZONTAL/.test(rot), "y JUGAR EN HORIZONTAL");
  assert(/url\('\.\.\/assets\/ui\/portada\.webp'\)/.test(css), "la ilustración de portada de fondo, por CSS (el archivo, tal cual)");
  /* cuánto baja: MEDIDO. Lo que carga el juego de verdad (w1_peso: imágenes),
     más la música y las tipografías (la huella de sw.js) y el código y los
     datos en gzip (como los sirve el hosting) */
  var mbDicho = +((rot.match(/data-mb="(\d+)"/) || [])[1] || 0);
  var w1 = cp.execFileSync(process.execPath, [path.join(RAIZ, "phaser/test/w1_peso.test.js")], { encoding: "utf8" });
  var img = +((w1.match(/DE VERDAD: ([\d.]+) MB/) || [])[1] || 0);
  var SW = leer("phaser/sw.js");
  var H = JSON.parse(SW.match(/const ASSETS_HUELLA = (\{[\s\S]*?\});/)[1]);
  var mus = 0, fon = 0;
  Object.keys(H).forEach(function (k) { var b = +H[k].split("-")[0]; if (/musica\//.test(k)) mus += b; if (/fonts\//.test(k)) fon += b; });
  var gz = function (rel) { return zlib.gzipSync(fs.readFileSync(path.join(RAIZ, rel)), { level: 9 }).length; };
  var cod = 0;
  INDEX.replace(/<script src="([^"]+)"/g, function (_, f) { cod += gz("phaser/" + f); });
  INDEX.replace(/jsonConTope\("([^"]+)"/g, function (_, f) { cod += gz(f.indexOf("../") === 0 ? f.slice(3) : "phaser/" + f); });
  var medido = img + (mus + fon + cod) / 1048576;
  assert(img > 5 && mbDicho > 0 && Math.abs(mbDicho - medido) <= 1,
    "la portada dice 'unos " + mbDicho + " MB' y lo medido es " + medido.toFixed(2) + " (imágenes " + img + " + música " + (mus / 1048576).toFixed(2) +
    " + tipografías " + (fon / 1048576).toFixed(2) + " + código y datos " + (cod / 1048576).toFixed(2) + ")");
  assert(/Wi-Fi/.test(rot), "y que conviene con Wi-Fi");
  /* instalar */
  assert(/addEventListener\("beforeinstallprompt"/.test(INDEX), "hay oyente de beforeinstallprompt");
  assert(/id="pt-instalar"/.test(rot) && /INSTALAR/.test(rot), "la portada tiene el botón INSTALAR");
  assert(/html\.instalada #pt-instalar/.test(css), "instalada, el botón se esconde antes de pintar");
  console.log("[1] index.html: rotación automática, 100vh de respaldo, embed en el <head>, beforeinstallprompt; la portada dice " + mbDicho + " MB (medido " + medido.toFixed(2) + ")");
})();

/* ---------- [2] logic/entorno.js ---------- */
(function () {
  assert(E.embebido({ enIframe: true, busqueda: "" }) && E.embebido({ enIframe: false, busqueda: "?embed=1" }) &&
    E.embebido({ busqueda: "?ref=x&embed=1" }) && !E.embebido({ enIframe: false, busqueda: "?embed=10" }) && !E.embebido({}),
    "embebido: iframe o ?embed=1 (y no ?embed=10)");
  /* el iframe del medio: 100% de la columna y 1100 de alto */
  [358, 700, 780].forEach(function (w) {
    assert(E.modoEmbebido({ ancho: w, alto: 1100, tactil: false }) === "poster" && E.modoEmbebido({ ancho: w, alto: 1100, tactil: true }) === "poster",
      "SÍNTOMA: el iframe del medio a " + w + " px (alto 1100) muestra el póster");
  });
  /* el 16:9 de PARA_MEDIOS */
  assert(E.modoEmbebido({ ancho: 676, alto: 380, tactil: false }) === "adentro", "16:9 en una columna de 700 en la compu: se juega adentro");
  assert(E.modoEmbebido({ ancho: 640, alto: 360, tactil: false }) === "adentro" && E.modoEmbebido({ ancho: 600, alto: 338, tactil: false }) === "poster",
    "con el mouse, desde 640 (la escala de un teléfono de 800x360)");
  assert(E.modoEmbebido({ ancho: 676, alto: 380, tactil: true }) === "poster" && E.modoEmbebido({ ancho: 900, alto: 506, tactil: true }) === "adentro",
    "con el dedo, desde 820 (una tableta apaisada sí; la columna de un teléfono no)");
  assert(E.modoEmbebido({ ancho: 334, alto: 188, tactil: true }) === "poster", "el 16:9 en la columna de un teléfono (334x188): póster");
  /* revisión L07: el alto también cuenta. Sin aspect-ratio (navegadores de
     antes de 2021) el iframe de PARA_MEDIOS queda en 150 de alto */
  assert(E.modoEmbebido({ ancho: 700, alto: 150, tactil: false }) === "poster", "SÍNTOMA: un recuadro de 700x150 (el iframe sin aspect-ratio) contaba como 'adentro' (" + E.modoEmbebido({ ancho: 700, alto: 150, tactil: false }) + ")");
  assert(E.modoEmbebido({ ancho: 1200, alto: 0, tactil: false }) === "poster" && E.modoEmbebido({ ancho: 900, alto: 300, tactil: true }) === "poster",
    "de alto 0, o de 300 con el dedo: póster");
  assert(E.EMBED_MIN.alto === 360 && E.modoEmbebido({ ancho: 800, alto: 360, tactil: false }) === "adentro" && E.modoEmbebido({ ancho: 800, alto: 359, tactil: false }) === "poster",
    "el corte de alto es 360 (un teléfono de 800x360 apaisado)");
  /* revisión L07: sin ?ref=embed. PARA_MEDIOS decía que servía "para saber
     que la visita vino de una nota", pero no lo leía nada y la decisión de
     Rodri es que no se mide nada */
  assert(E.urlParaJugar("https://x.io/pampa-star/phaser/index.html?embed=1") === "https://x.io/pampa-star/phaser/index.html",
    "el link del póster: sin embed y sin ref (" + E.urlParaJugar("https://x.io/pampa-star/phaser/index.html?embed=1") + ")");
  assert(E.urlParaJugar("https://x.io/p/?v=3&embed=1#a") === "https://x.io/p/?v=3" && E.urlParaJugar("https://x.io/p/?ref=embed") === "https://x.io/p/",
    "conserva lo demás del link, saca el # y el ref de un link viejo");
  var cap = { disponible: true, lock: true, instalada: false, embebido: false };
  assert(E.horizontalPosible(cap) && !E.horizontalPosible(Object.assign({}, cap, { lock: false })) &&
    !E.horizontalPosible(Object.assign({}, cap, { disponible: false })) && !E.horizontalPosible(Object.assign({}, cap, { instalada: true })) &&
    !E.horizontalPosible(Object.assign({}, cap, { embebido: true })), "JUGAR EN HORIZONTAL: con pantalla completa Y lock, sin instalar ni embeber");
  assert(E.ofrecerInstalar({ hayPrompt: true }) === "prompt" && E.ofrecerInstalar({ sistema: "ios" }) === "ios" &&
    E.ofrecerInstalar({ sistema: "android" }) === null && E.ofrecerInstalar({ instalada: true, hayPrompt: true }) === null &&
    E.ofrecerInstalar({ embebido: true, hayPrompt: true }) === null && E.ofrecerInstalar({ integrado: true, sistema: "ios" }) === null,
    "INSTALAR: con el evento, o los pasos en iPhone; nunca instalada, embebida ni adentro de una red social");
  console.log("[2] entorno: el medio a 358/700/780 → póster; 16:9 de 676 con el mouse → adentro; urlParaJugar, horizontalPosible, ofrecerInstalar");
})();

/* ---------- [3] el <head> corriendo dice lo mismo que entorno.embebido ---------- */
(function () {
  var cab = HEAD.slice(HEAD.lastIndexOf("<script>") + 8, HEAD.lastIndexOf("</script>"));
  assert(/PAMPA_EMBEBIDO/.test(cab), "se puede cortar el script del <head>");
  [[false, ""], [true, ""], [false, "?embed=1"], [false, "?embed=10"], [false, "?v=2&embed=1"]].forEach(function (c) {
    var top = {}, win = { matchMedia: function () { return { matches: false }; } };
    win.self = win; win.top = c[0] ? top : win;
    var html = { className: "" };
    var ctx = { window: win, document: { documentElement: html }, location: { search: c[1] }, navigator: {} };
    vm.createContext(ctx); vm.runInContext(cab, ctx);
    var esperado = E.embebido({ enIframe: c[0], busqueda: c[1] });
    assert(win.PAMPA_EMBEBIDO === esperado && /embebido/.test(html.className) === esperado,
      "el <head> y entorno.embebido coinciden (iframe " + c[0] + ", '" + c[1] + "' → " + esperado + ")");
  });
  /* un navegador que tira al mirar top cuenta como embebido */
  var w2 = { matchMedia: function () { return { matches: true }; } };
  Object.defineProperty(w2, "top", { get: function () { throw new Error("SecurityError"); } });
  w2.self = w2;
  var h2 = { className: "x" };
  var c2 = { window: w2, document: { documentElement: h2 }, location: { search: "" }, navigator: {} };
  vm.createContext(c2); vm.runInContext(cab, c2);
  assert(w2.PAMPA_EMBEBIDO === true && h2.className === "x embebido instalada", "si mirar top tira, cuenta como embebido; standalone → 'instalada' (" + h2.className + ")");
})();

/* ---------- [4] la portada corriendo, con un DOM de mentira ---------- */
function dom(op) {
  op = op || {};
  var els = {};
  function el(id) {
    return els[id] = els[id] || { id: id, hidden: !!op["oculto_" + id], oyentes: {}, href: "", textContent: "",
      addEventListener: function (t, f) { (this.oyentes[t] = this.oyentes[t] || []).push(f); },
      click: function () { (this.oyentes.click || []).forEach(function (f) { f({ stopPropagation: function () { } }); }); } };
  }
  ["pt-horizontal", "pt-instalar", "pt-ios", "ps-jugar", "rotate", "poster"].forEach(function (id) { el(id).hidden = id !== "rotate" && id !== "poster" && id !== "ps-jugar"; });
  var registro = { fs: [], locks: [], prompts: 0 };
  var html = { className: op.embebido ? "embebido" : "",
    requestFullscreen: op.sinApi ? undefined : function (o) { registro.fs.push(o); return op.fsRechaza ? Promise.reject(new TypeError("Permissions check failed")) : Promise.resolve(); } };
  var oyWin = {};
  var win = {
    innerWidth: op.w || 390, innerHeight: op.h || 844,
    matchMedia: function (q) { return { matches: /coarse/.test(q) ? !!op.tactil : /standalone/.test(q) ? !!op.instalada : false }; },
    addEventListener: function (t, f) { (oyWin[t] = oyWin[t] || []).push(f); },
    PAMPA_EMBEBIDO: !!op.embebido, PampaEntorno: E,
    PampaRed: { instalada: function () { return !!op.instalada; }, registrar: function () { }, mostrar: function () { } }
  };
  var scr = { orientation: op.sinLock ? {} : { lock: function (o) { registro.locks.push(o); return Promise.reject(new Error("NotSupportedError")); } } };
  win.screen = scr;
  var ctx = { window: win, document: { documentElement: html, getElementById: function (id) { return els[id] || null; }, fullscreenEnabled: op.fsEnabled !== false },
    screen: scr, location: { href: op.href || "https://x.io/pampa-star/phaser/index.html", search: op.embebido ? "?embed=1" : "" },
    navigator: { userAgent: op.ua || "", standalone: false }, setTimeout: setTimeout, Promise: Promise, console: console };
  return { ctx: ctx, win: win, els: els, html: html, registro: registro, oyWin: oyWin,
    disparar: function (t, ev) { (oyWin[t] || []).forEach(function (f) { f(ev || {}); }); } };
}
var PORTADA = bloque("window.PampaPortada = {}");
var PAUSA = bloque("window.PampaPausa = ");
function correr(D) {
  /* la pausa primero (como en la página), con su consulta de mentira */
  var mq = { matches: D.win.innerHeight > D.win.innerWidth, addEventListener: function () { } };
  D.win.matchMedia = (function (orig) { return function (q) { return /orientation/.test(q) ? mq : orig(q); }; })(D.win.matchMedia);
  D.ctx.document.addEventListener = function () { };
  D.juego = { pausas: 0, reanudas: 0, pause: function () { this.pausas++; }, resume: function () { this.reanudas++; }, events: { emit: function () { } } };
  vm.createContext(D.ctx);
  vm.runInContext(PAUSA, D.ctx);
  vm.runInContext(PORTADA, D.ctx);
  D.mq = mq;
  return D.win.PampaPortada;
}
function esperar() { return new Promise(function (r) { setTimeout(r, 0); }); }
var pasos = [];
pasos.push(async function () {
  assert(!!PORTADA && !!PAUSA, "index.html tiene el script de la portada y el de la pausa");
  /* EMBEBIDO, el iframe del medio a 358: póster y el juego sin crear */
  var D = dom({ embebido: true, w: 334, h: 1100, tactil: true });
  var PT = correr(D);
  assert(PT.modo === "poster" && /\bposter\b/.test(D.html.className) && /embebido/.test(D.html.className), "SÍNTOMA: embebido a 358 px (iframe 334x1100): clase 'poster' (" + D.html.className + ")");
  var arranco = 0;
  assert(PT.cuandoAdentro(function () { arranco++; }) === false && arranco === 0, "con el póster, el juego NO se crea (el arranque espera)");
  assert(D.els["ps-jugar"].href === "https://x.io/pampa-star/phaser/index.html", "el link del póster es esta página, sin datos (" + D.els["ps-jugar"].href + ")");
  assert(D.win.PampaPausa.motivos.vertical === true, "y la pausa de afuera queda puesta (si el juego existiera, estaría parado)");
  /* el recuadro crece: una tableta que gira */
  D.win.innerWidth = 1000; D.win.innerHeight = 560;
  D.disparar("resize");
  assert(PT.modo === "adentro" && !/\bposter\b/.test(D.html.className) && arranco === 1, "SÍNTOMA: al alcanzar para jugar, se va el póster y el juego arranca (una vez)");
  assert(!D.win.PampaPausa.motivos.vertical, "y la pausa de afuera se saca (manda el póster, no la orientación del iframe)");
  D.disparar("resize");
  assert(arranco === 1, "otro resize no lo arranca de nuevo");
  /* vuelve a achicarse: el juego se para como en vertical */
  D.win.innerWidth = 334; D.win.innerHeight = 1100; D.disparar("resize");
  assert(PT.modo === "poster" && D.win.PampaPausa.motivos.vertical === true, "si se achica de nuevo, vuelve el póster y el juego se pausa");
  var otro = 0;
  /* un arranque que tira va a la red de errores, no se pierde */
  var D2 = dom({ embebido: true, w: 334, h: 1100 });
  var PT2 = correr(D2), reg = [];
  D2.win.PampaRed.registrar = function (e, o) { reg.push(o + ":" + e.message); };
  PT2.cuandoAdentro(function () { throw new Error("se rompió el arranque"); });
  D2.win.innerWidth = 1000; D2.win.innerHeight = 560; D2.disparar("resize");
  assert(reg.length === 1 && /arranque:se rompió/.test(reg[0]), "un arranque diferido que tira llega a la red de errores (" + reg.join(",") + ")");
  /* SIN EMBEBER: arranca en el acto, el póster no existe */
  var D3 = dom({ embebido: false, w: 390, h: 844 });
  var PT3 = correr(D3);
  assert(PT3.cuandoAdentro(function () { otro++; }) === true && otro === 1 && !/poster/.test(D3.html.className), "sin embeber, el juego arranca en el acto");
  console.log("[4a] embebido: póster y arranque en espera; al crecer arranca una vez; al achicarse pausa; sin embeber, en el acto");
});
pasos.push(async function () {
  /* JUGAR EN HORIZONTAL */
  var D = dom({ tactil: true, ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/129 Mobile Safari/537.36" });
  correr(D);
  assert(D.els["pt-horizontal"].hidden === false, "Android con pantalla completa y lock: aparece JUGAR EN HORIZONTAL");
  var antes = sueltos.length;
  D.els["pt-horizontal"].click();
  assert(D.registro.fs.length === 1 && D.registro.fs[0].navigationUI === "hide", "tocarlo pide pantalla completa para la página");
  assert(D.registro.locks.length === 0, "la orientación se traba después, ya a pantalla completa");
  await esperar(); await esperar();
  assert(D.registro.locks.length === 1 && D.registro.locks[0] === "landscape", "y ahí: lock('landscape')");
  assert(sueltos.length === antes, "el rechazo de lock() (la compu, Firefox) se atrapa");
  var Dr = dom({ tactil: true, fsRechaza: true }); correr(Dr);
  Dr.els["pt-horizontal"].click(); await esperar(); await esperar();
  assert(sueltos.length === antes && Dr.registro.locks.length === 0, "si el navegador dice que no a la pantalla completa, nada suelto y no se traba nada");
  [["iPhone (sin API)", { sinApi: true }], ["sin lock()", { sinLock: true }], ["instalada", { instalada: true }], ["un iframe sin permiso", { fsEnabled: false }]].forEach(function (c) {
    var Dx = dom(c[1]); correr(Dx);
    assert(Dx.els["pt-horizontal"].hidden === true, c[0] + ": no aparece JUGAR EN HORIZONTAL");
  });
  console.log("[4b] JUGAR EN HORIZONTAL: pantalla completa y después horizontal; escondido donde no anda");
});
pasos.push(async function () {
  /* INSTALAR */
  var UA_A = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36";
  var UA_I = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
  var D = dom({ ua: UA_A });
  var PT = correr(D);
  assert(D.els["pt-instalar"].hidden === true, "Android antes del evento: no hay botón (no hay con qué instalar)");
  var prevenido = 0, elegido = null;
  var ev = { preventDefault: function () { prevenido++; }, prompt: function () { D.registro.prompts++; return Promise.resolve(); },
    userChoice: Promise.resolve({ outcome: "accepted" }) };
  D.disparar("beforeinstallprompt", ev);
  assert(D.els["pt-instalar"].hidden === false, "llega beforeinstallprompt: aparece 📲 INSTALAR");
  assert(prevenido === 0, "sin preventDefault: el navegador conserva su propio aviso de instalar (la portada no siempre se ve)");
  D.els["pt-instalar"].click();
  assert(D.registro.prompts === 1, "tocarlo abre el diálogo del navegador (prompt)");
  await esperar(); await esperar();
  assert(D.els["pt-instalar"].hidden === true, "y después se esconde (el evento se usa una vez)");
  D.disparar("beforeinstallprompt", ev);
  D.disparar("appinstalled", {});
  assert(D.els["pt-instalar"].hidden === true, "appinstalled: el botón se va");
  /* iPhone: los pasos */
  var Di = dom({ ua: UA_I });
  correr(Di);
  assert(Di.els["pt-instalar"].hidden === false && Di.els["pt-ios"].hidden === true, "iPhone sin instalar: 📲 INSTALAR, con los pasos escondidos");
  Di.els["pt-instalar"].click();
  assert(Di.els["pt-ios"].hidden === false, "tocarlo muestra los pasos (Compartir → Agregar a inicio)");
  /* instalada o embebida: nada */
  var Dn = dom({ ua: UA_I, instalada: true }); correr(Dn);
  assert(Dn.els["pt-instalar"].hidden === true, "instalada: no hay INSTALAR");
  var De = dom({ ua: UA_A, embebido: true, w: 334, h: 1100 }); correr(De);
  De.disparar("beforeinstallprompt", ev);
  assert(De.els["pt-instalar"].hidden === true, "embebida (se instalaría la página del medio): no hay INSTALAR");
  /* el prompt que tira: quedan los pasos del menú */
  var Dt = dom({ ua: UA_A }); correr(Dt);
  Dt.disparar("beforeinstallprompt", { prompt: function () { throw new Error("no"); } });
  Dt.els["pt-instalar"].click();
  assert(Dt.els["pt-ios"].hidden === false && /menú/.test(Dt.els["pt-ios"].textContent), "si el diálogo no abre, se muestran los pasos del menú del navegador (" + Dt.els["pt-ios"].textContent + ")");
  /* L08c · LA INTERFAZ PARA EL JUEGO APAISADO (el acceso de la tabla del
     Master, deudas_ola2 [5]): quien se anota se entera de cada cambio, y
     PT.instalar() es lo mismo que tocar el botón de acá */
  var Dk = dom({ ua: UA_A }), PTk = correr(Dk), oidos = [];
  var soltarK = PTk.alCambiarInstalar(function (q) { oidos.push(q); });
  assert(typeof PTk.instalar === "function" && typeof soltarK === "function" && PTk.ofrece === null, "PampaPortada.instalar y alCambiarInstalar existen; sin el evento no se ofrece");
  assert(PTk.instalar() === "nada" && Dk.registro.prompts === 0, "sin el evento, instalar() no hace nada");
  var evK = { prompt: function () { Dk.registro.prompts++; return Promise.resolve(); }, userChoice: Promise.resolve({ outcome: "dismissed" }) };
  Dk.disparar("beforeinstallprompt", evK);
  assert(oidos[oidos.length - 1] === "prompt", "llega el evento: el anotado se entera ('prompt')");
  assert(PTk.instalar() === "dialogo" && Dk.registro.prompts === 1, "instalar() abre el diálogo una vez");
  await esperar(); await esperar();
  assert(oidos[oidos.length - 1] === null && PTk.ofrece === null, "contestado el diálogo, deja de ofrecerse y el anotado se entera");
  Dk.disparar("beforeinstallprompt", evK);
  Dk.disparar("appinstalled", {});
  assert(oidos[oidos.length - 1] === null && Dk.els["pt-instalar"].hidden === true, "appinstalled: también se avisa");
  Dk.disparar("beforeinstallprompt", evK);
  assert(PTk.ofrece === null, "instalada, un evento que llegue después ya no lo ofrece");
  var n0 = oidos.length; soltarK(); Dk.disparar("beforeinstallprompt", evK);
  assert(oidos.length === n0, "quien se suelta no se entera más");
  var Dm = dom({ ua: UA_A }), PTm = correr(Dm);
  Dm.disparar("beforeinstallprompt", { prompt: function () { throw new Error("no"); } });
  assert(PTm.instalar() === "menu" && /menú/.test(PTm.textoMenu), "si el diálogo no abre, instalar() da 'menu' con el texto de los pasos");
  var Dio = dom({ ua: UA_I }), PTio = correr(Dio);
  assert(PTio.instalar() === "pasos", "en iPhone instalar() da 'pasos' (no hay diálogo)");
  console.log("[4c] INSTALAR: Android con el evento (sin preventDefault), iPhone con los pasos, nunca instalada ni embebida");
});

/* ---------- [5] el worker no se instala embebido ---------- */
pasos.push(async function () {
  var red = bloque("LA RED (tanda 1.0, L05)");
  var reg = red.slice(red.indexOf("function registrar()"), red.indexOf("window.PampaRegistrarSW = function"));
  assert(/if \(window\.PAMPA_EMBEBIDO\) return false;/.test(reg), "registrar() no instala el worker embebido");
  var arr = INDEX.slice(INDEX.indexOf("Promise.all([pBal"), INDEX.indexOf("function arrancarCon("));
  assert(/window\.PampaPortada\.cuandoAdentro\(arrancar\)/.test(arr), "el arranque de Phaser pasa por PampaPortada.cuandoAdentro");
});

/* ---------- [6] embed.html ---------- */
pasos.push(async function () {
  var EMB = leer("phaser/embed.html");
  var srcs = EMB.match(/<script src="([^"]+)"/g) || [];
  assert(srcs.length === 1 && /logic\/entorno\.js/.test(srcs[0]), "embed.html carga un solo script: logic/entorno.js (" + srcs.join(",") + ")");
  assert(!/<link[^>]+stylesheet/.test(EMB) && !/@font-face/.test(EMB), "ni hojas de estilo ni tipografías aparte");
  var peso = Buffer.byteLength(EMB) + ["assets/ui/portada.webp", "assets/ui/pampa-star-logo.webp", "phaser/logic/entorno.js"]
    .reduce(function (t, f) { return t + fs.statSync(path.join(RAIZ, f)).size; }, 0);
  assert(peso < 200 * 1024, "lo que baja quien lee la nota: " + Math.round(peso / 1024) + " KB (menos de 200)");
  assert(/<a id="ps-jugar"[^>]+href="\.\/index\.html"[^>]+target="_blank"[^>]+rel="noopener"/.test(EMB), "el póster: ▶ JUGAR con target=_blank a index.html");
  assert(!/ref=embed/.test(EMB.replace(/<!--[\s\S]*?-->/g, "")) && !/ref=embed/.test(INDEX.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "")),
    "ningún link lleva ?ref=embed (no se mide nada)");
  assert(/JUGAR EN PANTALLA COMPLETA/.test(EMB), "con el texto");
  var js = EMB.slice(EMB.lastIndexOf("<script>") + 8, EMB.lastIndexOf("</script>"));
  function correrEmbed(op) {
    var rep = [], oy = {};
    var win = { innerWidth: op.w, innerHeight: op.h, PampaEntorno: E, matchMedia: function () { return { matches: !!op.tactil }; },
      addEventListener: function (t, f) { (oy[t] = oy[t] || []).push(f); } };
    win.self = win; win.top = op.iframe ? {} : win;
    var ctx = { window: win, location: { replace: function (u) { rep.push(u); } } };
    vm.createContext(ctx); vm.runInContext(js, ctx);
    return { rep: rep, win: win, resize: function () { (oy.resize || []).forEach(function (f) { f(); }); } };
  }
  var a = correrEmbed({ iframe: true, w: 334, h: 1100, tactil: true });
  assert(a.rep.length === 0, "en el iframe del medio (334x1100): queda el póster");
  var b = correrEmbed({ iframe: true, w: 676, h: 380, tactil: false });
  assert(b.rep.length === 1 && b.rep[0] === "./index.html?embed=1", "en el 16:9 de 676 en la compu: salta a index.html?embed=1 y se juega adentro (" + b.rep.join(",") + ")");
  var c = correrEmbed({ iframe: true, w: 334, h: 188, tactil: true });
  c.win.innerWidth = 1000; c.win.innerHeight = 560; c.resize(); c.resize();
  assert(c.rep.length === 1, "si el recuadro crece, salta una vez");
  var d = correrEmbed({ iframe: false, w: 390, h: 844 });
  assert(d.rep.length === 1 && d.rep[0] === "./index.html", "abierta sola, va directo al juego");
});

/* ---------- [7] PARA_MEDIOS ---------- */
pasos.push(async function () {
  var PM = leer("docs/PARA_MEDIOS.md");
  assert(/<iframe src="https:\/\/juventudlapampa\.github\.io\/pampa-star\/phaser\/embed\.html"/.test(PM), "PARA_MEDIOS: el iframe apunta a embed.html");
  assert(/aspect-ratio:16\/9/.test(PM) && /allow="autoplay; fullscreen"/.test(PM), "16:9 y allow=\"autoplay; fullscreen\"");
  /* revisión L07: lo que se reparte a los medios dice la verdad */
  assert(!/ref=embed/.test(PM) && /no lleva ningún dato: el juego no mide visitas/.test(PM), "PARA_MEDIOS no promete una medición que no existe");
  /* L08 (url-oficial): el recuadro de provisorio se fue el día que la raíz
     pasó a ser la portada; ahora el link que se reparte ES la raíz (lo
     vigila además url_oficial.test.js) */
  assert(!/\*\*Provisorio\.\*\*/.test(PM) && /```\s*\nhttps:\/\/juventudlapampa\.github\.io\/pampa-star\/\s*\n```/.test(PM.replace(/\r\n/g, "\n")),
    "el link que reparte PARA_MEDIOS es la raíz (la portada), sin el recuadro de provisorio");
});

/* ---------- [8] lenguaje ---------- */
pasos.push(async function () {
  var textos = [INDEX.slice(INDEX.indexOf('<div id="rotate"'), INDEX.indexOf('<div id="atras-aviso"')), leer("phaser/embed.html").slice(leer("phaser/embed.html").indexOf("<body>")), leer("docs/PARA_MEDIOS.md")]
    .join("\n").replace(/<[^>]+>/g, " ");
  var MAL = [/\bpueblos?\b/i, /\blos jugadores\b/i, /\blos pibes\b/i, /\bbienvenid[oa]s?\b/i, /\btodos\b/i, /\blos chicos\b/i, /\b\w+@s\b/, /\b\w+[aoe]\/[ao]s?\b/, /\bchiques\b/i, /\btodes\b/i];
  MAL.forEach(function (re) { var h = textos.match(re); assert(!h, "lenguaje institucional: «" + (h && h[0]) + "» en la portada, el póster o PARA_MEDIOS"); });
});

(async function () {
  for (var i = 0; i < pasos.length; i++) await pasos[i]();
  await esperar();
  assert(sueltos.length === 0, "ningún rechazo suelto (" + sueltos.join(" · ") + ")");
  console.log("\n" + (mal ? "✗ " + mal + " FALLARON" : "✓ TODOS OK") + " — " + (ok + mal) + " asserts, " + mal + " fallaron.");
  process.exit(mal ? 1 : 0);
})();
