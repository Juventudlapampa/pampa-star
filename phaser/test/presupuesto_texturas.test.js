/* ============================================================================
   PAMPA STAR · EL PRESUPUESTO DE TEXTURAS (tanda 1.0, L06 · texturas-presupuesto)

   Lo que estaba mal, medido con node sobre los encabezados de los webp/png:
   los cuatro preload pedían 69 texturas, 100,8 Mpx = 384,6 MB en la placa de
   video (RGBA: 4 bytes por píxel), nada se liberaba, había archivos cargados
   dos veces con dos claves (Nelda y el Tuli: "personaje_" en el Master y
   "tribuna_" en el partido) y la misma pose teñida dos veces ("poseM_" en el
   Master, "poseV_" en el partido: las nueve poses de la semana, 45 MB). El
   logo de la compuerta (2400x2200, 20 MB) se ve a 360x330; el horizontal
   (4280x640) a 230x34. Y "webglcontextlost" no aparecía en ningún lado: con
   la placa llena, el lienzo quedaba negro sin aviso.

   Qué se prueba:
     [1] el CENSO del preload (los manifiestos y las rutas que piden intro,
         editor, Master y partido), con el tope de balance.arte y una clave
         por archivo: la base es 270 MB o menos (antes 384,6);
     [2] poseM_ y poseV_ ya no existen: el Master y el partido, corridos de
         verdad, tiñen la misma pose con la MISMA clave (poseT_) y una vez;
     [3] el gancho de texturas de verdad (scenes/cine_arte.js) achica lo que
         pasa el tope, deja las poses como están, no toca los lienzos del
         código y cuenta window.__PAMPA_TEX;
     [4] perder el contexto WebGL pausa el juego y espera a que el
         navegador lo devuelva (Phaser 3.80.1 lo recupera solo; revisión del
         lote: antes salía RECARGAR en el acto y se perdía el partido); si no
         vuelve, "Se cortó el dibujo" con RECARGAR (el script de LA RED DE
         ERRORES corriendo).

   Corré:  node phaser/test/presupuesto_texturas.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var RAIZ = path.join(__dirname, "..", "..");
function leer(f) { return fs.readFileSync(path.join(RAIZ, f), "utf8"); }
function json(f) { return JSON.parse(leer(f)); }
function delRepo(ruta) { return path.normalize(path.join("phaser", ruta)).replace(/\\/g, "/"); }

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

var BAL = json("phaser/data/balance.json");
var POSES = json("data/poses_manifest.json"), CARAS = json("data/caras_manifest.json");
var PORTRAITS = json("data/portraits_manifest.json"), TRIBUNA = json("data/tribuna.json");
var IDENT = json("data/identidades_manifest.json"), SEMANA = json("data/semana.json");
var C = require(path.join(RAIZ, "phaser/logic/carga.js"));
var MEM = require(path.join(RAIZ, "phaser/logic/memoria.js"));

/* las medidas de una imagen, leídas del encabezado (webp con VP8/VP8L/VP8X, o png) */
function medidas(rel) {
  var b = fs.readFileSync(path.join(RAIZ, rel));
  if (b[0] === 0x89 && b.toString("ascii", 1, 4) === "PNG") return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b.toString("ascii", 0, 4) === "RIFF") {
    var t = b.toString("ascii", 12, 16);
    if (t === "VP8 ") return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if (t === "VP8L") { var v = b.readUInt32LE(21); return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 }; }
    if (t === "VP8X") return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  }
  throw new Error("formato desconocido: " + rel);
}

/* ---------- la intro, cargada con un Phaser de mentira (sus listas de assets/ui) ---------- */
var WI = { PF: {}, PampaCarga: C };
vm.createContext(Object.assign({ window: WI, Phaser: { Scene: function () { } } }, { console: console }));
vm.runInContext(leer("phaser/scenes/intro.js"), vm.createContext({ window: WI, Phaser: { Scene: function () { } }, console: console }), { filename: "intro.js" });

/* =========================================================================
   [1] · EL CENSO DEL PRELOAD
   ========================================================================= */
/* OJOS (tanda 1.0): lo que se dejó de bajar después de la auditoría */
var AGREGADAS_DESPUES = ["assets/poses/calden.webp"];
var SACADAS_DESPUES = ["assets/poses/caras/cara_tranqui.png", "assets/poses/pose_cabezazo_v2.webp", "assets/poses/pose_arquero_ataja_celeste.webp"];
/* 20/oct: las caras de los relatores (assets/ui/relatores.webp, que ya estaba): la viñeta del partido y la previa de la fecha */
AGREGADAS_DESPUES.push("assets/ui/relatores.webp");
/* 17/oct, pedido de Rodri: el arte nuevo del arquero, la súper gambeta y las
   figuras del panel mirando a la izquierda; salen el quite del rival con la
   pelota pintada (lo reemplaza poseR_quite_sin_pelota) y la estirada vieja
   del rival, que nadie pedía */
AGREGADAS_DESPUES.push("assets/poses/poseR_arquero_estirada.webp", "assets/poses/pose_arquero_estirada_celeste.webp",
  "assets/poses/poseR_arquero_caido.webp", "assets/poses/pose_arquero_caido_celeste.webp", "assets/poses/poseR_superado.webp",
  "assets/poses/pose_gambeta_encara.webp", "assets/poses/poseR_quite_sin_pelota.webp", "assets/poses/pose_corriendo_izq.webp",
  "assets/poses/identidades/jugador_rulos_izq.webp", "assets/poses/identidades/jugador_largo_izq.webp",
  "assets/poses/identidades/jugador_rapado_izq.webp", "assets/poses/identidades/rival_flequillo_izq.webp",
  "assets/poses/identidades/rival_mohicano_izq.webp");
SACADAS_DESPUES.push("assets/poses/poseR_quite.webp", "assets/poses/poseR_arquero_vuela.webp");
/* 22/oct, pedido de Rodri: la pose de remate de cada identidad (data/identidades_manifest.json, 'remate') */
AGREGADAS_DESPUES.push("assets/poses/identidades/jugador_rulos_remate.webp", "assets/poses/identidades/jugador_largo_remate.webp",
  "assets/poses/identidades/jugador_rapado_remate.webp", "assets/poses/identidades/jugador_colorado_remate.webp",
  "assets/poses/identidades/rival_flequillo_remate.webp", "assets/poses/identidades/rival_mohicano_remate.webp");
(function () {
  var tex = {};                       // clave → archivo
  var conflictos = [];
  function poner(clave, rel, quien) {
    if (tex[clave] && tex[clave].f !== rel) conflictos.push(clave + ": " + tex[clave].f + " y " + rel);
    if (!tex[clave]) tex[clave] = { f: rel, quien: quien };
  }
  /* intro: la compuerta y el opening */
  WI.PampaIntro.UI_COMPUERTA.concat(C.listaDelOpening(BAL.intro, POSES, WI.PampaIntro.UI_OPENING))
    .forEach(function (x) { poner(x.clave, delRepo(x.ruta), "intro"); });
  /* editor: las caras */
  C.listaDelEditor(CARAS).forEach(function (x) { poner(x.clave, delRepo(x.ruta), "editor"); });
  /* Master: las rutas literales de su preload, las poses de la semana y los personajes */
  var MASTER = leer("phaser/scenes/master.js");
  var lit = 0;
  MASTER.replace(/this\.load\.image\("(d_\w+)", "\.\.\/(assets\/ui\/[^"]+)"\)/g, function (_, k, f) { lit++; poner(k, f, "master"); return _; });
  assert(lit === 2, "el Master pide sus dos ilustraciones por ruta (los logos y el escudo): " + lit);
  ["recibiendo"].concat((SEMANA.opciones || []).map(function (o) { return o.pose; })).forEach(function (id) {
    var p = id && POSES.poses[id];
    if (p && p.archivo) poner("pose_" + id, "assets/poses/" + p.archivo, "master");
  });
  PORTRAITS.personajes.forEach(function (p) { if (p.cargar !== false && p.archivo) poner("personaje_" + p.id, p.archivo, "master"); });
  /* partido */
  C.listaDelPartido({ poses: POSES, caras: CARAS, portraits: PORTRAITS, tribuna: TRIBUNA, identidades: IDENT })
    .forEach(function (x) { poner(x.clave, delRepo(x.ruta), "partido"); });

  assert(conflictos.length === 0, "SÍNTOMA: una clave con dos archivos (el primero que llega gana): " + conflictos.join(" · "));
  /* una sola clave por archivo */
  var porArchivo = {};
  Object.keys(tex).forEach(function (k) { (porArchivo[tex[k].f] = porArchivo[tex[k].f] || []).push(k); });
  var dobles = Object.keys(porArchivo).filter(function (f) { return porArchivo[f].length > 1; });
  assert(dobles.length === 0, "SÍNTOMA: el mismo archivo con dos claves (dos texturas en memoria): " + dobles.map(function (f) { return porArchivo[f].join("+"); }).join(" · "));
  /* la tribuna y el Master dicen el mismo archivo para la misma persona */
  TRIBUNA.personajes.forEach(function (p) {
    var q = PORTRAITS.personajes.filter(function (x) { return x.id === p.id; })[0];
    assert(!q || !p.retrato || q.archivo === p.retrato, "data/tribuna.json y portraits_manifest dicen otro archivo para '" + p.id + "' (" + p.retrato + " / " + (q && q.archivo) + "): con una sola clave, uno de los dos no se vería");
  });

  var antes = 0, base = 0, n = 0, topadas = [];
  Object.keys(tex).forEach(function (k) {
    var d = medidas(tex[k].f);
    antes += MEM.mb(d.w, d.h);
    var m = MEM.medidaConTope(k, d.w, d.h, BAL.arte);
    if (m) topadas.push(k + " " + d.w + "x" + d.h + "→" + m.w + "x" + m.h);
    base += m ? MEM.mb(m.w, m.h) : MEM.mb(d.w, d.h);
    n++;
  });
  /* lo de antes, para el registro: las dos claves de la tribuna, sin tope */
  TRIBUNA.personajes.forEach(function (p) { if (p.retrato) { var d = medidas(p.retrato); antes += MEM.mb(d.w, d.h); } });
  /* y lo que la tanda 1.0 sacó del preload DESPUÉS de la auditoría (OJOS: la
     cara de ojos cerrados y las dos poses que ya nadie pide). Se suma solo a
     "antes", para que el número siga replicando la medición de la auditoría
     y no se mueva cada vez que se apaga una pieza; la base ya no las cuenta. */
  SACADAS_DESPUES.forEach(function (f) { var d = medidas(f); antes += MEM.mb(d.w, d.h); });
  /* y lo que entró después (OJOS: el caldén de la semana, DESCANSAR) se resta */
  AGREGADAS_DESPUES.forEach(function (f) { var d = medidas(f); antes -= MEM.mb(d.w, d.h); });
  assert(Math.abs(antes - 384.6) < 0.5, "el censo replica la medición de la auditoría (384,6 MB sin tope y con la tribuna doble): " + antes.toFixed(1));
  assert(base <= 270, "SÍNTOMA: la base de texturas es " + base.toFixed(1) + " MB y el tope es 270 (antes 384,6)");
  /* 23/oct, pedido de Rodri · la corrida de tu pelo: con una cara que tiene la
     suya, el partido baja ese par y no el ciclo de 'corriendo'. El censo de
     arriba es el del clásico; el peor caso de cada cara también entra en el tope */
  var mbDeLista = function (l) { return l.reduce(function (t, x) { var d = medidas(delRepo(x.ruta)); return t + MEM.mb(d.w, d.h); }, 0); };
  var clasico = C.listaDelPartido({ poses: POSES, caras: CARAS });
  var conCorrida = CARAS.caras.filter(function (c) { return C.corridaDeCara(POSES, c.id); });
  assert(conCorrida.length >= 1, "hay caras con su corrida (data/poses_manifest.json, 'de_cara')");
  conCorrida.forEach(function (c) {
    var suya = C.listaDelPartido({ poses: POSES, caras: CARAS, caraVos: c.id });
    var claves = suya.map(function (x) { return x.clave; });
    assert(claves.indexOf("pose_corriendo_" + c.id) >= 0 && claves.indexOf("pose_corriendo_" + c.id + "_izq") >= 0 && !claves.some(function (k) { return /^pose_corriendo_c\d$/.test(k); }),
      "con la cara '" + c.id + "' se baja su corrida (y su _izq) y no el ciclo del clásico");
    assert(!claves.some(function (k) { return /^pose_corriendo_/.test(k) && k.indexOf("pose_corriendo_" + c.id) < 0 && k !== "pose_corriendo_izq"; }), "con la cara '" + c.id + "' no se baja la corrida de otro pelo");
    var conEsa = base + mbDeLista(suya) - mbDeLista(clasico);
    assert(conEsa <= 270, "SÍNTOMA: con la cara '" + c.id + "' las texturas son " + conEsa.toFixed(1) + " MB y el tope es 270");
  });
  /* lo que no se toca */
  Object.keys(tex).forEach(function (k) {
    if (/^(pose_|cara_|ident_)/.test(k)) assert(MEM.ladoMaximo(k, BAL.arte) === 0, "'" + k + "' no lleva tope (vestir.js y halo.js miden en píxeles)");
  });
  assert(MEM.ladoMaximo("fondo_tribuna", BAL.arte) === 0, "fondo_tribuna queda entera (el cine la acerca hasta 1,25)");
  assert(typeof BAL.arte._nota === "string" && /384,6/.test(BAL.arte._nota) && BAL.arte.max_lado_px === 1024, "balance.arte tiene su _nota con la medición y el tope de 1024");
  console.log("[1] censo del preload: " + n + " texturas · antes " + antes.toFixed(1) + " MB · con el tope y una clave por archivo " + base.toFixed(1) + " MB (tope 270) · achicadas " + topadas.length + ": " + topadas.join(", "));
})();

/* =========================================================================
   [2] · UNA SOLA POSE TEÑIDA PARA EL MASTER Y EL PARTIDO
   ========================================================================= */
(function () {
  ["master.js", "match.js", "avatar_arte.js", "escenas_v9.js", "toma_remate.js", "jugadon_ui.js", "definicion_ui.js"].forEach(function (f) {
    var sinCom = leer("phaser/scenes/" + f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    assert(!/poseM_|poseV_/.test(sinCom), "SÍNTOMA: " + f + " todavía arma una clave poseM_ o poseV_ (la misma pose teñida dos veces)");
  });
  /* corriendo los dos de verdad */
  var W = { PF: {}, PampaAvatar: require(path.join(RAIZ, "phaser/logic/avatar.js")), PampaCarga: C };
  W.PampaAvatar.setCatalogoManifest && W.PampaAvatar.setCatalogoManifest({ caras: CARAS.caras.length, camisetas: CARAS.camisetas.length });
  new Function("window", leer("phaser/scenes/avatar_arte.js"))(W);
  var Ph = { Scene: function () { }, Textures: { FilterMode: { NEAREST: 1 } } };
  new Function("window", "Phaser", leer("phaser/scenes/master.js").replace(/\r\n/g, "\n"))(W, Ph);
  new Function("window", "Phaser", leer("phaser/scenes/match.js").replace(/\r\n/g, "\n"))(W, Ph);
  new Function("window", "Phaser", leer("phaser/scenes/definicion_ui.js").replace(/\r\n/g, "\n"))(W, Ph);
  var texturas = { "pose_remate": { w: 6, h: 6 } }, creadas = [];
  function lienzo(w, h) {
    var datos = new Uint8ClampedArray(w * h * 4);
    return { getContext: function () { return { drawImage: function () { }, getImageData: function () { return { data: datos }; }, putImageData: function () { } }; }, refresh: function () { } };
  }
  var TM = {
    exists: function (k) { return !!texturas[k]; },
    get: function (k) { return { getSourceImage: function () { return { width: texturas[k].w, height: texturas[k].h }; } }; },
    createCanvas: function (k, w, h) { texturas[k] = { w: w, h: h }; creadas.push(k); return lienzo(w, h); }
  };
  var reg = { poses: POSES, caras: CARAS };
  var look = { cara: 1, tPiel: 2, tPelo: 3, tCam: 4 };
  var sM = Object.create(W.PampaMasterScene.prototype);
  sM.textures = TM; sM.game = { registry: { get: function (k) { return reg[k]; } } };
  sM.lookGuardado = function () { return look; };
  var kM = sM.poseConTuPinta("remate");
  var sP = Object.create(W.PampaMatch.prototype);
  sP.textures = TM; sP.game = sM.game; sP.FLAGS = {};
  var kP = sP.poseHeroeTenida({ look: look }, "remate");
  assert(/^poseT_remate_/.test(kM || ""), "el Master tiñe con la clave poseT_ (" + kM + ")");
  assert(kM === kP, "SÍNTOMA: el Master y el partido usan la MISMA clave para la misma pose y la misma pinta (" + kM + " / " + kP + ")");
  assert(creadas.length === 1, "la pose se tiñe UNA vez para las dos escenas (" + creadas.join(", ") + ")");
  /* todo en Original: no se tiñe nada */
  var orig = { cara: 1, tPiel: 0, tPelo: 0, tCam: 0 };
  sM.lookGuardado = function () { return orig; };
  assert(sM.poseConTuPinta("remate") === "pose_remate" && sP.poseHeroeTenida({ look: orig }, "remate") === null && creadas.length === 1,
    "con la pinta en Original no se tiñe nada: el Master usa la pose tal cual y el partido también");
  console.log("[2] el Master y el partido tiñen la pose con la misma clave (" + kM + "), una sola vez; poseM_ y poseV_ no existen más");
})();

/* =========================================================================
   [3] · EL GANCHO DE TEXTURAS DE VERDAD
   ========================================================================= */
(function () {
  function Emisor() { this._ev = {}; }
  Emisor.prototype.on = function (n, fn) { (this._ev[n] = this._ev[n] || []).push(fn); };
  Emisor.prototype.emit = function (n) { var a = [].slice.call(arguments, 1); (this._ev[n] || []).slice().forEach(function (fn) { fn.apply(null, a); }); };
  function HTMLImageElement(w, h) { this.width = w; this.height = h; }
  var dibujos = [];
  var doc = { createElement: function () {
    var cv = { width: 0, height: 0, esLienzo: true };
    cv.getContext = function () { return { set imageSmoothingQuality(v) { cv.calidad = v; }, imageSmoothingEnabled: false, drawImage: function (src, x, y, w, h) { dibujos.push({ w: w, h: h }); } }; };
    return cv;
  } };
  var TM = new Emisor();
  TM.list = {};
  function textura(key, fuente) { return { key: key, customData: {}, source: [{ image: fuente, width: fuente.width, height: fuente.height }] }; }
  TM.exists = function (k) { return !!TM.list[k]; };
  TM.get = function (k) { return TM.list[k]; };
  TM.addImage = function (k, img) { TM.list[k] = textura(k, img); TM.emit("addtexture", k, TM.list[k]); return TM.list[k]; };
  TM.addCanvas = function (k, cv) { TM.list[k] = textura(k, cv); TM.emit("addtexture", k, TM.list[k]); return TM.list[k]; };
  TM.remove = function (k) { delete TM.list[k]; TM.emit("removetexture", k); };
  var W = { PampaAmbiente: require(path.join(RAIZ, "phaser/logic/ambiente.js")), PampaHalo: require(path.join(RAIZ, "phaser/logic/halo.js")), PampaMemoria: MEM };
  var pintados = 0;
  W.__PAMPA_RED_PINTAR = function () { pintados++; };
  var ctx = { window: W, document: doc, HTMLImageElement: HTMLImageElement, performance: { now: function () { return 0; } }, console: console, Math: Math, MessageChannel: undefined, setTimeout: function () { } };
  vm.createContext(ctx);
  vm.runInContext(leer("phaser/scenes/cine_arte.js"), ctx, { filename: "cine_arte.js" });
  var juego = { textures: TM, registry: { get: function (k) { return k === "balance" ? BAL : null; } } };
  W.PampaHaloEnganchar(juego);
  TM.addImage("d_logo", new HTMLImageElement(2400, 2200));
  var t = TM.get("d_logo");
  assert(t && t.source[0].width === 512 && t.source[0].height === 469, "SÍNTOMA: d_logo (2400x2200) queda en memoria a 512x469 (quedó " + (t && t.source[0].width + "x" + t.source[0].height) + ")");
  assert(t && t.customData.ladoOriginal && t.customData.ladoOriginal.w === 2400, "la medida original queda anotada (customData.ladoOriginal)");
  assert(dibujos.length === 1 && dibujos[0].w === 512, "se redibuja una vez, a la medida nueva");
  TM.addImage("bg1", new HTMLImageElement(1920, 1080));
  assert(TM.get("bg1").source[0].width === 1024 && TM.get("bg1").source[0].height === 576, "un fondo de la intro (1920x1080) queda a 1024x576");
  TM.addImage("pose_remate", new HTMLImageElement(900, 854));
  TM.addImage("pose_recibiendo", new HTMLImageElement(1250, 1818));
  assert(TM.get("pose_recibiendo").source[0].width === 1250, "las poses quedan como están (vestir.js y halo.js miden en píxeles)");
  TM.addImage("fondo_tribuna", new HTMLImageElement(1280, 720));
  assert(TM.get("fondo_tribuna").source[0].width === 1280, "fondo_tribuna queda entera");
  var lienzoDelCodigo = { width: 2560, height: 720, esLienzo: true };
  TM.addCanvas("fondo_tribuna_esp", lienzoDelCodigo);
  assert(TM.get("fondo_tribuna_esp").source[0].image === lienzoDelCodigo, "un lienzo que dibuja el código (el espejo de la tribuna) no se reemplaza aunque pase el tope: alguien está por pintarlo");
  var TX = W.__PAMPA_TEX;
  var esperado = MEM.mb(512, 469) + MEM.mb(1024, 576) + MEM.mb(900, 854) + MEM.mb(1250, 1818) + MEM.mb(1280, 720) + MEM.mb(2560, 720);
  assert(TX && TX.n === 6 && Math.abs(TX.mb - esperado) < 0.2, "window.__PAMPA_TEX cuenta lo que hay en memoria (" + (TX && TX.n) + " texturas, " + (TX && TX.mb) + " MB; esperado " + esperado.toFixed(1) + ")");
  assert(pintados > 0, "cada cambio repinta el renglón de ?perf=1");
  TM.remove("bg1");
  assert(W.__PAMPA_TEX.n === 5, "al sacar una textura la cuenta baja");
  assert(C.textoTex(W.__PAMPA_TEX) === "TEX " + W.__PAMPA_TEX.mb.toFixed(1).replace(".", ",") + " MB en 5 texturas", "el renglón de ?perf=1: " + C.textoTex(W.__PAMPA_TEX));
  console.log("[3] el gancho achica d_logo a 512x469 y los fondos a 1024x576, deja poses, fondo_tribuna y los lienzos del código; __PAMPA_TEX = " + JSON.stringify(W.__PAMPA_TEX));
})();

/* =========================================================================
   [4] · SIN EL CONTEXTO DE DIBUJO: PAUSA, ESPERA Y, SI NO VUELVE, EL AVISO
   Revisión del lote: el lote mostraba el aviso con RECARGAR en el acto,
   pero Phaser 3.80.1 recupera el contexto solo cuando el navegador lo
   devuelve. Una pérdida pasajera (el teléfono que vuelve de otra app)
   terminaba en una recarga y se perdía el partido.
   ========================================================================= */
(function () {
  var HTML = leer("phaser/index.html").replace(/\r\n/g, "\n");
  var scripts = [];
  HTML.replace(/<script>([\s\S]*?)<\/script>/g, function (_, c) { scripts.push(c); return _; });
  var RED = scripts.filter(function (c) { return c.indexOf("window.PampaRed = {") >= 0; })[0] || "";
  /* Phaser recupera el contexto solo: si el vendor deja de hacerlo, esta
     espera no tiene sentido y hay que volver al aviso en el acto */
  var V = leer("phaser/vendor/phaser.min.js");
  assert(/this\.contextRestoredHandler=function/.test(V) && /n\.addEventListener\("webglcontextrestored",this\.contextRestoredHandler/.test(V) && /contextLostHandler=function\(t\)\{[^}]*t\.preventDefault\(\)\}/.test(V),
    "el vendor (Phaser 3.80.1) hace preventDefault al perder el contexto y lo recrea al volver (por eso se espera)");
  function armar(conPausa) {
    var els = {};
    function el(id) {
      if (!els[id]) els[id] = { id: id, hidden: id === "trabado" || id === "tb-informe", textContent: "", ls: {}, hijos: [],
        addEventListener: function (t, f) { (this.ls[t] = this.ls[t] || []).push(f); }, appendChild: function (c) { this.hijos.push(c); },
        focus: function () { }, click: function () { (this.ls.click || []).forEach(function (f) { f({}); }); } };
      return els[id];
    }
    var win = { addEventListener: function () { }, innerWidth: 800, innerHeight: 360, devicePixelRatio: 2, matchMedia: function () { return { matches: false }; } };
    var store = {}, X = { recargas: 0, relojes: [], pausado: 0, reanudado: 0, motivos: [] };
    var ls = { getItem: function (k) { return store[k] == null ? null : store[k]; }, setItem: function (k, v) { store[k] = String(v); } };
    win.PampaInforme = require(path.join(RAIZ, "phaser/logic/informe.js"));
    function pon(fn, ms) { X.relojes.push({ fn: fn, ms: ms, vivo: true }); return X.relojes.length; }
    function saca(id) { if (X.relojes[id - 1]) X.relojes[id - 1].vivo = false; }
    new Function("window", "document", "localStorage", "navigator", "location", "console", "setTimeout", "clearTimeout", RED)(win,
      { getElementById: el, createElement: function (t) { return { tag: t }; }, createTextNode: function (t) { return { text: t }; } },
      ls, { userAgent: "prueba" }, { origin: "http://localhost:8123", protocol: "http:", reload: function () { X.recargas++; } }, { error: function () { }, log: function () { } }, pon, saca);
    var oyentes = {};
    var juego = { isRunning: true, pause: function () { X.pausado++; }, resume: function () { X.reanudado++; },
      registry: { get: function (k) { return k === "balance" ? BAL : null; } },
      scene: { getScenes: function () { return []; }, getScene: function () { return null; } },
      canvas: { addEventListener: function (t, f) { (oyentes[t] = oyentes[t] || []).push(f); } } };
    win.PAMPA_GAME = juego;
    /* PampaPausa de verdad suma motivos y reanuda si no queda ninguno ni un aviso */
    if (conPausa) win.PampaPausa = {
      m: {},
      poner: function (k) { this.m[k] = true; X.motivos.push("+" + k); juego.pause(); },
      sacar: function (k) { delete this.m[k]; X.motivos.push("-" + k); if (!Object.keys(this.m).length && !win.PampaRed.tipo) juego.resume(); }
    };
    return { R: win.PampaRed, el: el, X: X, oyentes: oyentes, juego: juego, store: store,
      perder: function () { (oyentes.webglcontextlost || []).forEach(function (f) { f({ preventDefault: function () { } }); }); },
      volver: function () { (oyentes.webglcontextrestored || []).forEach(function (f) { f({ preventDefault: function () { } }); }); },
      vencer: function () { X.relojes.filter(function (r) { return r.vivo; }).forEach(function (r) { r.vivo = false; r.fn(); }); } };
  }
  var tope = BAL.rendimiento.contexto_tope_ms;
  assert(tope > 0 && tope <= 10000 && /contexto_tope_ms/.test(BAL.rendimiento._contexto || ""), "balance.rendimiento.contexto_tope_ms (" + tope + ") con su _contexto");

  /* 1) se pierde y VUELVE antes del tope: sin aviso, el juego sigue */
  var A = armar(true);
  assert(A.R && typeof A.R.vigilarMemoria === "function", "LA RED trae vigilarMemoria");
  assert(A.R.vigilarMemoria(A.juego) && !A.R.vigilarMemoria(A.juego), "se engancha una vez al lienzo");
  assert((A.oyentes.webglcontextlost || []).length === 1 && (A.oyentes.webglcontextrestored || []).length === 1, "escucha webglcontextlost Y webglcontextrestored en el lienzo");
  A.perder();
  assert(A.el("trabado").hidden, "SÍNTOMA: al perder el contexto el aviso NO sale en el acto (Phaser lo puede recuperar solo)");
  assert(A.X.motivos.join(",") === "+sin_dibujo" && A.X.pausado === 1, "el juego se pausa con PampaPausa, motivo sin_dibujo (la música también; el partido abre su PAUSA)");
  assert(A.X.relojes.length === 1 && A.X.relojes[0].ms === tope, "y espera contexto_tope_ms (" + (A.X.relojes[0] && A.X.relojes[0].ms) + ")");
  A.volver();
  assert(A.el("trabado").hidden && A.X.motivos.join(",") === "+sin_dibujo,-sin_dibujo" && A.X.reanudado === 1, "si vuelve antes del tope, el juego sigue sin aviso (" + A.X.motivos.join(",") + ")");
  A.vencer();
  assert(A.el("trabado").hidden, "el tope que llega después de volver no muestra nada");
  var rec = JSON.parse(A.store.pampa_ultimo_error || "{}");
  assert(rec.origen === "memoria" && /volvió el contexto WebGL/.test(rec.mensaje || "") && A.R.errores === 2, "las dos cosas quedan en el informe (" + rec.mensaje + ")");

  /* 2) se pierde y NO vuelve: el aviso con RECARGAR */
  var B = armar(true);
  B.R.vigilarMemoria(B.juego);
  B.perder();
  B.vencer();
  assert(!B.el("trabado").hidden && B.el("tb-tit").textContent === "Se cortó el dibujo", "si no vuelve en el tope, sale el aviso (" + B.el("tb-tit").textContent + ")");
  var txt = B.el("tb-txt").textContent;
  assert(/Tocá para recargar/.test(txt) && /guardado sigue ahí/.test(txt) && !/teléfono|memoria/i.test(txt + B.el("tb-tit").textContent),
    "dice que hay que tocar para recargar y que lo guardado sigue ahí, sin afirmar la causa ni el aparato (" + txt + ")");
  assert(!B.el("tb-recargar").hidden && B.el("tb-menu").hidden && B.el("tb-seguir").hidden, "la salida es RECARGAR");
  B.R.mostrar("trabado");
  assert(B.el("tb-tit").textContent === "Se cortó el dibujo", "un \"se trabó\" que llega después no lo pisa (es consecuencia)");
  B.el("tb-recargar").click();
  assert(B.X.recargas === 1, "RECARGAR recarga");
  var recB = JSON.parse(B.store.pampa_ultimo_error || "{}");
  assert(recB.origen === "memoria" && /se perdió el contexto WebGL/.test(recB.mensaje || ""), "la pérdida queda en el informe (origen memoria)");

  /* 3) vuelve con el aviso ya a la vista: el aviso se va y el juego sigue */
  var C3 = armar(true);
  C3.R.vigilarMemoria(C3.juego);
  C3.perder(); C3.vencer();
  assert(!C3.el("trabado").hidden, "(el aviso a la vista)");
  C3.volver();
  assert(C3.el("trabado").hidden && C3.R.tipo === null && C3.X.reanudado === 1, "si vuelve con el aviso a la vista, el aviso se va y el juego sigue (antes: solo RECARGAR, se perdía el partido)");

  /* 4) sin PampaPausa (el script de la pausa no bajó): pausa y reanuda el juego directo */
  var D = armar(false);
  D.R.vigilarMemoria(D.juego);
  D.perder();
  assert(D.X.pausado === 1 && D.el("trabado").hidden, "sin PampaPausa, pausa el juego directo");
  D.volver();
  assert(D.X.reanudado === 1, "y lo reanuda al volver");
  /* el motivo nuevo no lo pisa nadie: la pausa del teléfono en vertical, aparte */
  assert(/P\.poner\("sin_dibujo"\)/.test(HTML) && /P\.sacar\("sin_dibujo"\)/.test(HTML), "usa la pausa del juego (PampaPausa) con su propio motivo");
  assert(/vigilarMemoria\(game\)/.test(HTML), "el postBoot del juego engancha la vigilancia");
  console.log("[4] sin el contexto de dibujo: pausa y espera " + tope + " ms; si vuelve, sigue sin aviso; si no, \"Se cortó el dibujo\" con RECARGAR, que se va si vuelve después");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
