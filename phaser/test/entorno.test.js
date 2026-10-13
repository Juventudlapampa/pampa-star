/* ============================================================================
   PAMPA STAR · L07 — ABIERTO DESDE UNA RED SOCIAL, Y CON EL GUARDADO BLOQUEADO

   LO QUE ESTABA MAL (medido antes de este lote):
     · userAgent, Instagram, FBAN y TikTok daban 0 en phaser/ (grep). La
       difusión es por redes, y en Instagram, Facebook o TikTok el link se abre
       en el navegador de la app: la carrera queda en ESE almacenamiento y
       después no aparece en Chrome ni en la app instalada;
     · master.js guardaba con "try { localStorage.setItem(…) } catch (e) { }":
       con el almacenamiento bloqueado o lleno (o el iframe de un medio con
       las cookies de terceros bloqueadas) se jugaban horas creyendo que
       quedaba guardado.

   LO QUE SE PRUEBA:
     [1] navegadorIntegrado con 16 user agents de verdad (el criterio pide 8
         o más): Instagram en Android y en iPhone, Facebook en los dos,
         Messenger, TikTok en los dos, un WebView suelto, y los navegadores
         de verdad (Chrome en Android, en iPhone y en la compu, Samsung
         Internet, Safari, Firefox en Android y en iPhone, Edge);
     [2] el texto del cartel por sistema, el link intent:// de ABRIR EN
         CHROME y el link limpio;
     [3] guardadoAndando: con un almacenamiento que anda, que tira en setItem,
         que no devuelve lo escrito, que tira al borrar, y sin almacenamiento;
     [4] el cartel de index.html CORRIENDO con un DOM de mentira: aparece en
         Instagram y no en Chrome ni embebido, ABRIR EN CHROME, los pasos en
         iPhone, COPIAR EL LINK, SEGUIR ACÁ IGUAL (una vez por sesión), los
         toques y las teclas cortados, y PAMPA_GUARDADO;
     [5] master.js REAL con un almacenamiento que tira: guardar() da false y
         el Master arma el aviso (la caja con 💾 CÓDIGO DE CARRERA, una vez
         por sesión) y la marca fija en la tabla; con uno que anda, nada;
     [6] el cableado: el precache y INSTALAR, que no se ofrece en una red social.

   Corré:  node phaser/test/entorno.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var M = require("./_escena_de_mentira.js");
var RAIZ = M.RAIZ;
function leer(f) { return fs.readFileSync(path.join(RAIZ, f), "utf8").replace(/\r\n/g, "\n"); }
var E = require(path.join(RAIZ, "phaser/logic/entorno.js"));
var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* ---------- [1] los user agents ---------- */
var UA = {
  instagram_android: "Mozilla/5.0 (Linux; Android 13; SM-A135M Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.5993.111 Mobile Safari/537.36 Instagram 307.0.0.34.111 Android (33/13; 450dpi; 1080x2208; samsung; SM-A135M; a13; exynos850; es_US; 532277035)",
  instagram_ios: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 307.0.2.17.106 (iPhone13,2; iOS 17_1; es_AR; es; scale=3.00; 1170x2532; 532461240)",
  facebook_android: "Mozilla/5.0 (Linux; Android 12; moto g(60) Build/S2RIS32.32-20-11; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.5993.65 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/439.0.0.29.119;]",
  facebook_ios: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBDV/iPhone12,1;FBMD/iPhone;FBSN/iOS;FBSV/16.6;FBSS/2;FBID/phone;FBLC/es_LA;FBOP/5;FBRV/0]",
  messenger_android: "Mozilla/5.0 (Linux; Android 11; SM-A107M Build/RP1A.200720.012; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/117.0.5938.153 Mobile Safari/537.36 [FB_IAB/Orca-Android;FBAV/428.0.0.20.104;]",
  tiktok_android: "Mozilla/5.0 (Linux; Android 11; Redmi Note 8 Build/RKQ1.201004.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/106.0.5249.126 Mobile Safari/537.36 trill_310404 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/31.4.4 ByteLocale/es ByteFullLocale/es Region/AR BytedanceWebview/d8a21c6",
  tiktok_ios: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_31.5.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/es Region/AR isDarkMode/0 WKWebView/1 RevealType/Dialog BytedanceWebview/d8a21c6",
  webview_android: "Mozilla/5.0 (Linux; Android 10; K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.144 Mobile Safari/537.36",
  chrome_android: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
  samsung: "Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-A135M) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36",
  safari_ios: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  firefox_android: "Mozilla/5.0 (Android 14; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0",
  chrome_ios: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1",
  firefox_ios: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/130.0 Mobile/15E148 Safari/605.1.15",
  chrome_compu: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  edge_compu: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0"
};
var ESPERADO = {
  instagram_android: ["instagram", "android"], instagram_ios: ["instagram", "ios"],
  facebook_android: ["facebook", "android"], facebook_ios: ["facebook", "ios"], messenger_android: ["facebook", "android"],
  tiktok_android: ["tiktok", "android"], tiktok_ios: ["tiktok", "ios"], webview_android: ["otro", "android"],
  chrome_android: [null, "android"], samsung: [null, "android"], safari_ios: [null, "ios"], firefox_android: [null, "android"],
  chrome_ios: [null, "ios"], firefox_ios: [null, "ios"], chrome_compu: [null, "otro"], edge_compu: [null, "otro"]
};
(function () {
  var n = 0;
  Object.keys(UA).forEach(function (k) {
    var r = E.navegadorIntegrado(UA[k]), s = E.sistema(UA[k]);
    assert(r === ESPERADO[k][0], k + ": navegadorIntegrado da " + r + " (se esperaba " + ESPERADO[k][0] + ")");
    assert(s === ESPERADO[k][1], k + ": sistema da " + s + " (se esperaba " + ESPERADO[k][1] + ")");
    n++;
  });
  assert(n >= 8, "se clasifican 8 o más user agents (" + n + ")");
  assert(E.navegadorIntegrado("") === null && E.navegadorIntegrado(null) === null, "sin user agent: null");
  console.log("[1] " + n + " user agents: Instagram, Facebook, Messenger y TikTok en Android y iPhone; los navegadores de verdad dan null");
})();

/* ---------- [2] textos y links ---------- */
(function () {
  var a = E.textoIntegrado("instagram", "android");
  assert(a.titulo === "Estás en el navegador de Instagram" && /quede guardada y se juegue a pantalla completa, abrilo en Chrome/.test(a.texto) && a.chrome === true && !a.pasos,
    "Instagram en Android: el texto del ítem y ABRIR EN CHROME");
  var i = E.textoIntegrado("tiktok", "ios");
  assert(i.titulo === "Estás en el navegador de TikTok" && /Safari/.test(i.texto) && /···/.test(i.pasos) && i.chrome === false, "TikTok en iPhone: Safari y los pasos del menú ···");
  var o = E.textoIntegrado("otro", "android");
  assert(o.titulo === "Estás en el navegador de una app", "otra app: sin nombre");
  assert(E.textoIntegrado(null, "android") === null, "sin app no hay cartel");
  var todos = [a, i, o, E.textoIntegrado("facebook", "otro")].map(function (t) { return [t.titulo, t.texto, t.pasos || "", t.nota].join(" "); }).join(" ");
  assert(!/\bpueblo|\blos jugadores|\bbienvenid|\btodos\b|\w+@s|\w[ao]\/[ao]/i.test(todos), "los textos del cartel sin masculino genérico, sin 'pueblo', sin barras ni arrobas");
  assert(/Se puede jugar igual/.test(a.nota), "y dice que se puede seguir igual");
  var href = "https://juventudlapampa.github.io/pampa-star/phaser/index.html?ref=embed&v=2#x";
  assert(E.linkLimpio(href) === "https://juventudlapampa.github.io/pampa-star/phaser/index.html?v=2", "el link limpio saca ref, embed y # (" + E.linkLimpio(href) + ")");
  var it = E.linkAbrirEnChrome(href);
  assert(it === "intent://juventudlapampa.github.io/pampa-star/phaser/index.html?v=2#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=" +
    encodeURIComponent("https://juventudlapampa.github.io/pampa-star/phaser/index.html?v=2") + ";end", "ABRIR EN CHROME: intent:// a la misma dirección, con Chrome y la dirección de respaldo (" + it + ")");
  assert(E.linkAbrirEnChrome("file:///c/x.html") === null, "sin http(s) no hay intent");
  console.log("[2] textos por sistema, intent:// con Chrome y respaldo, link limpio");
})();

/* ---------- [3] guardadoAndando ---------- */
(function () {
  function almacen(op) {
    op = op || {};
    var d = {};
    return {
      setItem: function (k, v) { if (op.tiraSet) throw new Error("QuotaExceededError"); d[k] = String(v); },
      getItem: function (k) { return op.miente ? null : (k in d ? d[k] : null); },
      removeItem: function (k) { if (op.tiraRemove) throw new Error("SecurityError"); delete d[k]; },
      _d: d
    };
  }
  var bien = almacen();
  assert(E.guardadoAndando(bien) === true && !(E.CLAVE_PRUEBA in bien._d), "un almacenamiento que anda: true, y la clave de prueba no queda");
  assert(E.guardadoAndando(almacen({ tiraSet: true })) === false, "SÍNTOMA: el que tira en setItem (bloqueado o lleno): false");
  assert(E.guardadoAndando(almacen({ miente: true })) === false, "el que no devuelve lo escrito: false");
  assert(E.guardadoAndando(almacen({ tiraRemove: true })) === false, "el que tira al borrar: false");
  assert(E.guardadoAndando(null) === false && E.guardadoAndando({}) === false, "sin almacenamiento (leer window.localStorage tiró): false");
  console.log("[3] guardadoAndando: true solo si escribe, lee y borra");
})();

/* ---------- [4] el cartel de index.html, corriendo ---------- */
var INDEX = leer("phaser/index.html");
var CARTEL = null;
(INDEX.match(/<script>([\s\S]*?)<\/script>/g) || []).forEach(function (s) { if (/window\.PampaIntegrado = /.test(s)) CARTEL = s.replace(/^<script>|<\/script>$/g, ""); });
function domCartel(op) {
  op = op || {};
  var els = {};
  function el(id, tag) {
    return els[id] = { id: id, tagName: tag || "p", hidden: true, textContent: "", href: "#", oyentes: {}, enfocado: false,
      addEventListener: function (t, f) { (this.oyentes[t] = this.oyentes[t] || []).push(f); },
      emitir: function (t, ev) { (this.oyentes[t] || []).forEach(function (f) { f(ev || { stopPropagation: function () { } }); }); },
      focus: function () { this.enfocado = true; } };
  }
  el("integrado", "div"); el("ig-tit"); el("ig-txt"); el("ig-pasos"); el("ig-chrome", "a"); el("ig-copiar", "button"); el("ig-seguir", "button"); el("ig-link"); el("ig-nota");
  els["ig-copiar"].hidden = false; els["ig-seguir"].hidden = false; els["ig-tit"].hidden = false; els["ig-txt"].hidden = false; els["ig-nota"].hidden = false;
  var sesion = op.sesion || {};
  var win = { PampaEntorno: E, PAMPA_EMBEBIDO: !!op.embebido,
    sessionStorage: { getItem: function (k) { return k in sesion ? sesion[k] : null; }, setItem: function (k, v) { sesion[k] = String(v); } },
    getSelection: function () { return { removeAllRanges: function () { }, addRange: function () { } }; } };
  if (op.sinAlmacen) Object.defineProperty(win, "localStorage", { get: function () { throw new Error("SecurityError"); } });
  else win.localStorage = op.almacen || { setItem: function () { }, getItem: function () { return "1"; }, removeItem: function () { } };
  var copiado = [];
  var ctx = { window: win, document: { getElementById: function (id) { return els[id] || null; }, createRange: function () { return { selectNodeContents: function () { } }; } },
    location: { href: op.href || "https://juventudlapampa.github.io/pampa-star/phaser/index.html?ref=compartir" },
    navigator: { userAgent: op.ua || "", clipboard: op.sinPortapapeles ? undefined : { writeText: function (t) { copiado.push(t); return Promise.resolve(); } } },
    Promise: Promise, String: String };
  vm.createContext(ctx);
  vm.runInContext(CARTEL, ctx);
  return { win: win, els: els, sesion: sesion, copiado: copiado, IG: win.PampaIntegrado };
}
var pasos = [];
pasos.push(async function () {
  assert(!!CARTEL, "index.html tiene el script del cartel");
  var D = domCartel({ ua: UA.instagram_android });
  assert(D.els.integrado.hidden === false && D.IG.visible === true, "SÍNTOMA: abierto desde Instagram en Android, aparece el cartel");
  assert(D.els["ig-tit"].textContent === "Estás en el navegador de Instagram" && /abrilo en Chrome/.test(D.els["ig-txt"].textContent), "con el título y el texto del ítem");
  assert(D.els["ig-chrome"].hidden === false && /^intent:\/\/juventudlapampa\.github\.io\/pampa-star\/phaser\/index\.html#Intent;scheme=https;package=com\.android\.chrome;/.test(D.els["ig-chrome"].href),
    "🌐 ABRIR EN CHROME con el intent:// a esta dirección, sin el ?ref (" + D.els["ig-chrome"].href + ")");
  assert(D.els["ig-chrome"].enfocado, "y el foco arranca en ABRIR EN CHROME");
  assert(D.els["ig-pasos"].hidden === true, "en Android no hay pasos del menú");
  /* los toques y las teclas del cartel no llegan al juego */
  var cortes = ["mousedown", "touchstart", "touchend", "pointerdown", "pointerup", "keydown", "keyup"];
  assert(cortes.every(function (t) { return (D.els.integrado.oyentes[t] || []).length > 0; }), "el cartel corta " + cortes.join(", ") + " (Phaser los escucha en window)");
  var cortado = false; D.els.integrado.emitir("keydown", { stopPropagation: function () { cortado = true; } });
  assert(cortado, "y los corta de verdad (stopPropagation)");
  /* COPIAR EL LINK */
  D.els["ig-copiar"].emitir("click");
  await new Promise(function (r) { setTimeout(r, 0); });
  assert(D.copiado[0] === "https://juventudlapampa.github.io/pampa-star/phaser/index.html" && D.els["ig-copiar"].textContent === "✓ LINK COPIADO", "COPIAR EL LINK copia la dirección limpia y lo dice");
  /* SEGUIR ACÁ IGUAL */
  D.els["ig-seguir"].emitir("click");
  assert(D.els.integrado.hidden === true && D.sesion.pampa_integrado_seguir === "1", "▶ SEGUIR ACÁ IGUAL lo cierra y lo anota en la sesión");
  var D2 = domCartel({ ua: UA.instagram_android, sesion: D.sesion });
  assert(D2.els.integrado.hidden === true, "recargando en la misma sesión, no vuelve a aparecer");
  /* iPhone */
  var Di = domCartel({ ua: UA.facebook_ios });
  assert(Di.els.integrado.hidden === false && Di.els["ig-chrome"].hidden === true && Di.els["ig-pasos"].hidden === false && /···/.test(Di.els["ig-pasos"].textContent),
    "Facebook en iPhone: sin ABRIR EN CHROME, con los pasos del menú ···");
  var Dp = domCartel({ ua: UA.tiktok_ios, sinPortapapeles: true });
  Dp.els["ig-copiar"].emitir("click");
  assert(Dp.els["ig-link"].hidden === false && Dp.els["ig-link"].textContent === "https://juventudlapampa.github.io/pampa-star/phaser/index.html" && /Safari/.test(Dp.els["ig-nota"].textContent),
    "sin portapapeles: el link a la vista, seleccionado, para copiarlo a mano y pegarlo en Safari");
  /* donde NO va */
  ["chrome_android", "samsung", "safari_ios", "firefox_android", "chrome_compu"].forEach(function (k) {
    assert(domCartel({ ua: UA[k] }).els.integrado.hidden === true, k + ": no hay cartel");
  });
  assert(domCartel({ ua: UA.instagram_android, embebido: true }).els.integrado.hidden === true, "embebido en la nota de un medio, no (el póster ya manda a otra pestaña)");
  /* el guardado, al abrir */
  assert(D.win.PAMPA_GUARDADO === true, "con un almacenamiento que anda, PAMPA_GUARDADO es true");
  var tira = { setItem: function () { throw new Error("SecurityError"); }, getItem: function () { return null; }, removeItem: function () { } };
  assert(domCartel({ ua: UA.chrome_android, almacen: tira }).win.PAMPA_GUARDADO === false, "con setItem que tira, PAMPA_GUARDADO es false");
  assert(domCartel({ ua: UA.chrome_android, sinAlmacen: true }).win.PAMPA_GUARDADO === false, "si leer window.localStorage tira (iframe con las cookies bloqueadas), false");
  console.log("[4] el cartel: Instagram/Facebook/TikTok sí, navegadores de verdad y embebido no; ABRIR EN CHROME, pasos, copiar, seguir (una vez por sesión)");
});

/* ---------- [5] master.js real, con el guardado bloqueado ---------- */
function domDeMentira() {
  function el(tag) {
    return { tagName: tag, children: [], attrs: {}, oyentes: {}, parentNode: null, textContent: "", value: "", className: "", style: {},
      setAttribute: function (k, v) { this.attrs[k] = v; },
      appendChild: function (c) { c.parentNode = this; this.children.push(c); return c; },
      removeChild: function (c) { var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; },
      addEventListener: function (t, fn) { (this.oyentes[t] = this.oyentes[t] || []).push(fn); },
      focus: function () { this.enfocado = true; }, select: function () { } };
  }
  var body = el("body");
  return { body: body, createElement: el,
    buscar: function (pred) { var out = []; (function b(n) { n.children.forEach(function (c) { if (pred(c)) out.push(c); b(c); }); })(body); return out; } };
}
pasos.push(async function () {
  var A = M.armar({ logicaExtra: ["phaser/logic/entorno.js"] });
  var doc = domDeMentira(); A.ctx.document = doc;
  assert(!!A.window.PampaEntorno, "el Master tiene logic/entorno.js");
  /* una carrera guardada… y después el almacenamiento deja de escribir */
  var sv = A.carreraNueva ? A.carreraNueva() : null;
  if (!sv) {
    var T = A.window.PampaTemporada, Ma = A.window.PampaMaster, DIV = A.datos.divisiones;
    sv = { v: 1, club: "El Bagual de Winifreda", pueblo: "Winifreda", division: "primera_b", temporadaN: 1, titulos: [], origen: null, bolsaEventos: [], racha: 0,
      temporada: T.crear({ division: "primera_b", miClub: "El Bagual de Winifreda", rivales: DIV.divisiones.primera_b.rivales, semilla: 7 }) };
  }
  A.localStorage.setItem("pampa_master_v1", JSON.stringify(sv));
  var setOrig = A.localStorage.setItem;
  A.localStorage.setItem = function () { throw new Error("QuotaExceededError: el almacenamiento está bloqueado"); };
  var s = A.nueva();
  s.create();
  var cajas = doc.buscar(function (n) { return n.attrs && n.attrs.role === "dialog"; });
  var h1 = doc.buscar(function (n) { return n.tagName === "h1"; })[0];
  assert(cajas.length === 1 && h1 && h1.textContent === "⚠ En este navegador tu carrera NO se guarda", "SÍNTOMA: el Master arma el aviso (" + (h1 && h1.textContent) + ")");
  assert(doc.buscar(function (n) { return n.tagName === "textarea"; }).length === 0, "es un aviso, sin caja de texto");
  var botones = doc.buscar(function (n) { return n.tagName === "button"; });
  var cod = botones.find(function (b) { return b.textContent === "💾 CÓDIGO DE CARRERA"; });
  assert(!!cod && botones.some(function (b) { return b.textContent === "▶ SEGUIR IGUAL"; }), "con 💾 CÓDIGO DE CARRERA y ▶ SEGUIR IGUAL");
  assert(cod && cod.enfocado, "el foco arranca en CÓDIGO DE CARRERA");
  assert(s.textos().indexOf("⚠ ESTE NAVEGADOR NO GUARDA TU CARRERA") >= 0, "y la marca fija en la tabla");
  var marca = s.tocables().find(function (o) { return o.text === "⚠ ESTE NAVEGADOR NO GUARDA TU CARRERA"; });
  assert(!!marca && marca.x < 40 && marca.y < 20, "arriba a la izquierda, y se puede tocar");
  assert(s.guardar() === false, "guardar() devuelve false");
  cod.oyentes.click[0]("", function () { });
  assert(doc.buscar(function (n) { return n.attrs && n.attrs.role === "dialog"; }).length === 0 && s.textos().indexOf("💾 CÓDIGO DE CARRERA") >= 0,
    "💾 CÓDIGO DE CARRERA cierra el aviso y abre la vista del código");
  /* otra entrada al Master en la misma sesión: la marca sí, la caja no otra vez */
  var s2 = A.nueva(); s2.create();
  assert(doc.buscar(function (n) { return n.attrs && n.attrs.role === "dialog"; }).length === 0, "la segunda vez en la sesión no vuelve la caja");
  assert(s2.textos().indexOf("⚠ ESTE NAVEGADOR NO GUARDA TU CARRERA") >= 0, "pero la marca sigue fija");
  var m2 = s2.tocables().find(function (o) { return o.text === "⚠ ESTE NAVEGADOR NO GUARDA TU CARRERA"; });
  s2.tocar(m2.x + 5, m2.y + 5);
  assert(doc.buscar(function (n) { return n.attrs && n.attrs.role === "dialog"; }).length === 1, "tocar la marca vuelve a abrir el aviso");
  s2.cerrarCaja();

  /* sin carrera (elegir club) y bloqueado: el aviso sin código */
  var B = M.armar({ logicaExtra: ["phaser/logic/entorno.js"] });
  var doc2 = domDeMentira(); B.ctx.document = doc2;
  B.localStorage.setItem = function () { throw new Error("SecurityError"); };
  var e = B.nueva(); e.create();
  var bot2 = doc2.buscar(function (n) { return n.tagName === "button"; }).map(function (b) { return b.textContent; });
  assert(bot2.length === 1 && bot2[0] === "▶ SEGUIR IGUAL", "sin carrera: el aviso ofrece solo SEGUIR IGUAL (" + bot2.join(", ") + ")");
  assert(e.textos().indexOf("⚠ ESTE NAVEGADOR NO GUARDA TU CARRERA") >= 0 && e.textos().indexOf("🏆 MODO MASTER") >= 0, "y la marca en elegir club");

  /* un guardar() que falla en medio de la carrera, con la prueba de entrada en verde */
  var C = M.armar({ logicaExtra: ["phaser/logic/entorno.js"] });
  var doc3 = domDeMentira(); C.ctx.document = doc3;
  C.localStorage.setItem("pampa_master_v1", JSON.stringify(sv));
  var c = C.nueva(); c.create();
  assert(doc3.buscar(function (n) { return n.attrs && n.attrs.role === "dialog"; }).length === 0 && c.textos().indexOf("⚠ ESTE NAVEGADOR NO GUARDA TU CARRERA") < 0,
    "con un almacenamiento que anda: ni aviso ni marca");
  assert(c.guardar() === true, "y guardar() devuelve true");
  C.localStorage.setItem = function () { throw new Error("QuotaExceededError"); };
  assert(c.guardar() === false && doc3.buscar(function (n) { return n.attrs && n.attrs.role === "dialog"; }).length === 1, "el primer guardar() que falla abre el aviso");
  assert(c.textos().indexOf("⚠ ESTE NAVEGADOR NO GUARDA TU CARRERA") >= 0, "y pone la marca en la vista de ahora");
  c.cerrarCaja();
  assert(c.guardar() === false && doc3.buscar(function (n) { return n.attrs && n.attrs.role === "dialog"; }).length === 0, "los siguientes no lo vuelven a abrir");
  A.localStorage.setItem = setOrig;
  /* la prueba de index.html al abrir (PAMPA_GUARDADO) también cuenta */
  var Dd = M.armar({ logicaExtra: ["phaser/logic/entorno.js"] });
  var doc4 = domDeMentira(); Dd.ctx.document = doc4;
  Dd.window.PAMPA_GUARDADO = false;
  var dd = Dd.nueva(); dd.create();
  assert(doc4.buscar(function (n) { return n.attrs && n.attrs.role === "dialog"; }).length === 1 && dd.textos().indexOf("⚠ ESTE NAVEGADOR NO GUARDA TU CARRERA") >= 0,
    "si la prueba de index.html al abrir dio que no (PAMPA_GUARDADO false), el Master avisa igual");
  var MS = leer("phaser/scenes/master.js");
  var g = MS.slice(MS.indexOf("  guardar() {"), MS.indexOf("  guardadoAnda() {"));
  assert(/return ok;/.test(g) && !/catch \(e\) \{ \}/.test(g), "guardar() ya no traga el error: devuelve si guardó");
  console.log("[5] master real: con el guardado bloqueado, guardar() da false, el aviso (una vez) y la marca fija; con el que anda, nada");
});

/* ---------- [6] cableado ---------- */
pasos.push(async function () {
  var SW = leer("phaser/sw.js");
  assert(SW.indexOf("\"./logic/entorno.js\"") >= 0, "logic/entorno.js en el PRECACHE del worker");
  var iE = INDEX.indexOf('<script src="logic/entorno.js"></script>'), iC = INDEX.indexOf("window.PampaIntegrado = ");
  assert(iE > 0 && iE < iC, "entorno.js carga antes del cartel");
  var PORT = INDEX.slice(INDEX.indexOf("window.PampaPortada = {}"), INDEX.indexOf("window.PampaIntegrado = "));
  assert(/E\.navegadorIntegrado\(ua\)/.test(PORT) && /integrado: integrado/.test(PORT), "INSTALAR mira si es el navegador de una red social (ahí no se instala)");
  assert(E.ofrecerInstalar({ integrado: true, hayPrompt: true }) === null, "y en ese caso no se ofrece");
});

(async function () {
  for (var i = 0; i < pasos.length; i++) await pasos[i]();
  console.log("\n" + (mal ? "✗ " + mal + " FALLARON" : "✓ TODOS OK") + " — " + (ok + mal) + " asserts, " + mal + " fallaron.");
  process.exit(mal ? 1 : 0);
})();
