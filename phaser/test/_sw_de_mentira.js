/* ============================================================================
   PAMPA STAR · phaser/test/_sw_de_mentira.js — el service worker en node

   No es un test (no termina en .test.js). Corre phaser/sw.js de verdad en un
   contexto de vm con:
     · un CacheStorage de mentira que se porta como el de los navegadores en
       lo que importa acá: Cache.put RECHAZA las respuestas 206 (por eso la
       música no entraba nunca), match acepta ignoreSearch, y las cachés
       sobreviven entre una versión del worker y la siguiente;
     · una red de mentira que sirve los archivos del repo como el hosting del sitio
       (con Range devuelve 206) y que se puede caer (el fetch rechaza),
       colgar (el fetch no vuelve nunca) o fallar en una ruta (404). Anota
       cada pedido: ruta, modo de caché y Range;
     · un reloj de mentira para setTimeout y Date.now: "3,1 s simulados" son
       3,1 s de este reloj, no de verdad;
     · clientes de mentira que juntan lo que el worker les manda.

   Lo usan cache_versiones.test.js, red_lenta.test.js y aviso_version.test.js.
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var RAIZ = path.join(__dirname, "..", "..");
var ORIGEN = "https://x.test";
var BASE = ORIGEN + "/repo/";                  // la raíz del sitio (como un repo publicado en el hosting)
var SW_URL = BASE + "phaser/sw.js";

/* ---------- el CacheStorage ---------- */
function crearCaches() {
  var mapa = new Map();
  function Cache(nombre) { this.nombre = nombre; this.m = new Map(); }
  function urlDe(req) { return typeof req === "string" ? req : req.url; }
  Cache.prototype.match = async function (req, opts) {
    var u = urlDe(req);
    var e = this.m.get(u);
    if (!e && opts && opts.ignoreSearch) {
      var base = u.split("?")[0];
      for (var [k, v] of this.m) { if (k.split("?")[0] === base) { e = v; break; } }
    }
    if (!e) return undefined;
    return new Response(e.buf.slice(0), { status: e.status, statusText: e.statusText, headers: e.headers });
  };
  Cache.prototype.put = async function (req, res) {
    if (res.status === 206) throw new TypeError("Partial response (status code 206) is unsupported");
    if (res.bodyUsed) throw new TypeError("Response body is already used");
    var buf = await res.arrayBuffer();
    var h = {}; res.headers.forEach(function (v, k) { h[k] = v; });
    this.m.set(urlDe(req), { buf: buf, status: res.status, statusText: res.statusText, headers: h });
  };
  /* add/addAll: los usaba el sw.js de antes (para poder correrlo contra este mismo test) */
  Cache.prototype.add = async function (req) {
    if (typeof req === 'string') req = new URL(req, SW_URL).href;
    var res = await CS._fetch(req);
    if (!res.ok) throw new TypeError('Request failed: ' + res.status);
    return this.put(req, res);
  };
  Cache.prototype.addAll = async function (reqs) { for (var r of reqs) await this.add(r); };
  Cache.prototype.keys = async function () { return Array.from(this.m.keys()).map(function (u) { return { url: u }; }); };
  Cache.prototype.delete = async function (req) { return this.m.delete(urlDe(req)); };
  var CS = {
    open: async function (n) { if (!mapa.has(n)) mapa.set(n, new Cache(n)); return mapa.get(n); },
    has: async function (n) { return mapa.has(n); },
    delete: async function (n) { return mapa.delete(n); },
    keys: async function () { return Array.from(mapa.keys()); },
    match: async function (req, opts) {
      for (var c of mapa.values()) { var r = await c.match(req, opts); if (r) return r; }
      return undefined;
    }
  };
  CS._mapa = mapa;
  /* para los asserts: las URLs guardadas en una caché, sin el origen */
  CS.claves = function (n) { var c = mapa.get(n); return c ? Array.from(c.m.keys()).map(function (u) { return u.replace(BASE, ""); }) : []; };
  CS.entrada = function (n, u) { var c = mapa.get(n); return c ? c.m.get(u.indexOf("http") === 0 ? u : BASE + u) : undefined; };
  return CS;
}

/* ---------- el reloj ---------- */
function crearReloj() {
  var R = { t: 1.79e12, timers: [], id: 1 };
  R.setTimeout = function (fn, ms) { var id = R.id++; R.timers.push({ id: id, at: R.t + Math.max(0, +ms || 0), fn: fn }); return id; };
  R.clearTimeout = function (id) { R.timers = R.timers.filter(function (x) { return x.id !== id; }); };
  R.ahora = function () { return R.t; };
  /* avanza ms de reloj, disparando los timers en orden y dejando correr las
     promesas entre uno y otro */
  R.avanzar = async function (ms) {
    var fin = R.t + ms;
    await vaciar();
    for (;;) {
      R.timers.sort(function (a, b) { return a.at - b.at; });
      var p = R.timers[0];
      if (!p || p.at > fin) break;
      R.timers.shift();
      R.t = p.at;
      p.fn();
      await vaciar();
    }
    R.t = fin;
    await vaciar();
  };
  return R;
}
async function vaciar() { for (var i = 0; i < 30; i++) await new Promise(function (r) { setImmediate(r); }); }

/* ---------- la red ---------- */
function crearRed() {
  var N = { modo: "normal", log: [], fallar: {}, fallarVeces: {}, colgar: {}, colgados: [], cambios: {} };
  N.fetch = function (input, init) {
    var url = typeof input === "string" ? input : input.url;
    var headers = (input && input.headers) || new Headers();
    var rango = headers.get ? headers.get("range") : null;
    if (init && init.headers) { var hh = new Headers(init.headers); rango = hh.get("range") || rango; }
    var modoCache = (init && init.cache) || (input && input.cache) || "default";
    var u = new URL(url);
    var ruta = u.pathname.indexOf("/repo/") === 0 ? decodeURIComponent(u.pathname.slice(6)) : u.pathname;
    if (ruta === "" || ruta.slice(-1) === "/") ruta += "index.html";
    N.log.push({ ruta: ruta, url: url, rango: rango, cache: modoCache, modoRed: N.modo });
    if (N.modo === "caida" || N.fallar[ruta] === "caida") return Promise.reject(new TypeError("Failed to fetch"));
    /* colgar[ruta] = "a_mano": queda esperando hasta que el test llame soltar() */
    if (N.colgar[ruta] === "a_mano") return new Promise(function (res) { N.colgados.push({ ruta: ruta, soltar: function () { delete N.colgar[ruta]; res(N.fetch(input, init)); } }); });
    if (N.modo === "colgada" || N.colgar[ruta]) return new Promise(function () { });
    if (N.fallarVeces[ruta] > 0) { N.fallarVeces[ruta]--; return Promise.reject(new TypeError("Failed to fetch")); }
    if (N.fallar[ruta] === 404) return Promise.resolve(new Response("no", { status: 404, statusText: "Not Found" }));
    var buf;
    if (N.cambios[ruta]) buf = N.cambios[ruta];
    else {
      var f = path.join(RAIZ, ruta);
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return Promise.resolve(new Response("no", { status: 404, statusText: "Not Found" }));
      buf = fs.readFileSync(f);
    }
    var tipo = /\.ogg$/.test(ruta) ? "audio/ogg" : /\.webp$/.test(ruta) ? "image/webp" : /\.png$/.test(ruta) ? "image/png" :
      /\.json$/.test(ruta) ? "application/json" : /\.html$/.test(ruta) ? "text/html" : /\.ttf$/.test(ruta) ? "font/ttf" : "text/javascript";
    var m = rango && /^bytes=(\d*)-(\d*)$/.exec(rango);
    if (m) {
      var ini = m[1] === "" ? Math.max(0, buf.length - +m[2]) : +m[1];
      var fin = m[2] === "" || m[1] === "" ? buf.length - 1 : Math.min(+m[2], buf.length - 1);
      var parte = buf.slice(ini, fin + 1);
      return Promise.resolve(new Response(parte, { status: 206, headers: { "content-type": tipo, "content-length": String(parte.length),
        "content-range": "bytes " + ini + "-" + fin + "/" + buf.length } }));
    }
    return Promise.resolve(new Response(buf, { status: 200, headers: { "content-type": tipo, "content-length": String(buf.length) } }));
  };
  N.pedidosA = function (re) { return N.log.filter(function (x) { return re.test(x.ruta); }); };
  N.limpiar = function () { N.log = []; };
  return N;
}

/* ---------- un worker (una versión de sw.js) sobre cachés, red y reloj compartidos ---------- */
function cargar(texto, mundo) {
  mundo = mundo || {};
  var caches = mundo.caches || crearCaches();
  var red = mundo.red || crearRed();
  var reloj = mundo.reloj || crearReloj();
  var mensajes = mundo.mensajes || [];
  var handlers = {};
  var estado = { skipWaiting: false, claim: false };
  var cliente = { id: "c1", postMessage: function (d) { mensajes.push(d); } };
  /* PerformanceObserver de mentira: W.tiempos([...]) le pasa entradas como si el worker hubiera bajado algo */
  var observadores = [];
  var FakePO = function (cb) { this.cb = cb; };
  FakePO.prototype.observe = function () { observadores.push(this); };
  var FakeDate = function () { return new Date(reloj.t); };
  FakeDate.now = function () { return reloj.t; };
  caches._fetch = red.fetch;
  var ctx = {
    console: console, URL: URL, Request: Request, Response: Response, Headers: Headers, Blob: Blob,
    crypto: globalThis.crypto, TextEncoder: TextEncoder, TextDecoder: TextDecoder, Uint8Array: Uint8Array,
    caches: caches, fetch: red.fetch, setTimeout: reloj.setTimeout, clearTimeout: reloj.clearTimeout, Date: FakeDate,
    location: new URL(SW_URL), PerformanceObserver: FakePO, performance: { clearResourceTimings: function () { } },
    addEventListener: function (t, fn) { handlers[t] = fn; },
    skipWaiting: function () { estado.skipWaiting = true; return Promise.resolve(); },
    clients: {
      claim: function () { estado.claim = true; return Promise.resolve(); },
      get: function (id) { return Promise.resolve(id === cliente.id ? cliente : undefined); },
      matchAll: function () { return Promise.resolve([cliente]); }
    }
  };
  ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(texto, ctx, { filename: "sw.js" });

  function evento(extra) {
    var ev = Object.assign({ esperas: [] }, extra);
    ev.waitUntil = function (p) { ev.esperas.push(Promise.resolve(p)); };
    return ev;
  }
  async function esperarTodo(ev) {
    var n = 0;
    while (n < ev.esperas.length) { var lote = ev.esperas.slice(n); n = ev.esperas.length; await Promise.allSettled(lote); }
  }
  var W = {
    ctx: ctx, handlers: handlers, estado: estado, caches: caches, red: red, reloj: reloj, mensajes: mensajes,
    leer: function (expr) { return vm.runInContext(expr, ctx); },
    /* install: devuelve { ok, error } y deja estado.skipWaiting */
    instalar: async function () {
      var ev = evento({});
      handlers.install(ev);
      var r = await Promise.allSettled(ev.esperas);
      await esperarTodo(ev);
      var mal = r.filter(function (x) { return x.status === "rejected"; })[0];
      return { ok: !mal, error: mal && mal.reason };
    },
    activar: async function () {
      var ev = evento({});
      handlers.activate(ev);
      await esperarTodo(ev);
      var r = await Promise.allSettled(ev.esperas);
      return { ok: r.every(function (x) { return x.status === "fulfilled"; }) };
    },
    /* un pedido de la página. opts: { headers, navegar, clientId }.
       Devuelve { ev, respondio, res (promesa), lista() } */
    pedir: function (url, opts) {
      opts = opts || {};
      var abs = url.indexOf("http") === 0 ? url : BASE + url;
      var req = opts.navegar
        ? { url: abs, method: "GET", mode: "navigate", headers: new Headers(opts.headers || {}), cache: "default" }
        : new Request(abs, { headers: opts.headers || {} });
      var ev = evento({ request: req, clientId: opts.navegar ? "" : (opts.clientId || "c1"), resultingClientId: opts.navegar ? "c1" : "" });
      ev.respondio = false;
      ev.respondWith = function (p) {
        ev.respondio = true;
        ev.res = Promise.resolve(p);
        ev.esperas.push(ev.res.then(function () { }, function () { }));
      };
      handlers.fetch(ev);
      ev.lista = function () { return esperarTodo(ev); };
      return ev;
    },
    tiempos: function (entradas) {
      observadores.forEach(function (o) { o.cb({ getEntries: function () { return entradas; } }); });
      return vaciar();
    },
    mensaje: async function (data, source) {
      var ev = evento({ data: data, source: source || cliente });
      handlers.message(ev);
      await esperarTodo(ev);
      return ev;
    }
  };
  return W;
}

/* una respuesta → { status, texto, bytes, headers } */
async function leerRes(res) {
  var buf = Buffer.from(await res.arrayBuffer());
  var h = {}; res.headers.forEach(function (v, k) { h[k] = v; });
  return { status: res.status, bytes: buf.length, buf: buf, texto: buf.toString("utf8"), headers: h };
}

/* el texto de sw.js con una VERSION y/o una huella cambiadas (un "deploy").
   huellas: [ruta] cambia un carácter de la huella (el archivo del server
   ya no coincide: como una copia vieja); huellaNueva: { ruta: "n-hex" } la
   pone exacta (para un asset retocado de verdad, con sus bytes nuevos en
   red.cambios: desde la revisión L05 el worker no guarda lo que no
   coincide con la huella) */
function variante(texto, cambios) {
  var t = texto;
  if (cambios.version) t = t.replace(/const VERSION = "[^"]+";/, 'const VERSION = "' + cambios.version + '";');
  function reRuta(ruta) { return new RegExp('("' + ruta.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&") + '": ")(\\d+)-([0-9a-f]+)"'); }
  (cambios.huellas || []).forEach(function (ruta) {
    t = t.replace(reRuta(ruta), function (m, a, n, h) { return a + n + "-" + (h.slice(0, -1) + (h.slice(-1) === "0" ? "1" : "0")) + '"'; });
  });
  Object.keys(cambios.huellaNueva || {}).forEach(function (ruta) {
    t = t.replace(reRuta(ruta), function (m, a) { return a + cambios.huellaNueva[ruta] + '"'; });
  });
  if (cambios.precacheExtra) t = t.replace('const PRECACHE = [', 'const PRECACHE = [\n  ' + cambios.precacheExtra.map(JSON.stringify).join(", ") + ",");
  return t;
}

/* un deploy en el server de mentira: index.html con otra window.PAMPA_VERSION.
   Va junto con variante(SW, { version }): desde la revisión L05 el worker no
   termina de instalarse si el index.html que baja no es de su VERSION */
function publicar(red, version) {
  var idx = fs.readFileSync(path.join(RAIZ, "phaser/index.html"), "utf8");
  red.cambios["phaser/index.html"] = Buffer.from(idx.replace(/window\.PAMPA_VERSION = "[^"]+";/, 'window.PAMPA_VERSION = "' + version + '";'));
}

module.exports = {
  RAIZ: RAIZ, BASE: BASE, SW_URL: SW_URL,
  crearCaches: crearCaches, crearRed: crearRed, crearReloj: crearReloj, cargar: cargar,
  leerRes: leerRes, variante: variante, vaciar: vaciar, publicar: publicar,
  leerSW: function () { return fs.readFileSync(process.env.PAMPA_SW ? path.resolve(process.env.PAMPA_SW) : path.join(RAIZ, "phaser/sw.js"), "utf8"); }
};
