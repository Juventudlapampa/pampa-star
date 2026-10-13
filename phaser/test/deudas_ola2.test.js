/* ============================================================================
   PAMPA STAR · L08c — LAS DEUDAS QUE DEJÓ LA OLA 2 SIN DUEÑO

   Los lotes L04b a L08 las vieron (con su medición o su captura) y las
   anotaron porque no eran su ítem. Acá cada una tiene su prueba:

     [1] LA TRABA AL EMPEZAR EL PARTIDO. Las vestidas de bloqueo y barrida
         (poseDelEquipo, dos delayedCall del create del partido) eran los dos
         cuadros más largos de sus primeros 3 s: 382 y 313 ms en la compu.
         Ahora las prepara la tabla del Master y las viste un Worker; el
         partido solo las usa. Se corren el obrero, la cola
         (scenes/vestidas_ui.js) con un Worker de mentira, poseDelEquipo,
         pedirVestidas y prepararVestidas de verdad (abajo, al final: es la
         única parte asíncrona). Con PAMPA_MATCH_VIEJO=ruta, el create de
         antes falla con el síntoma.
     [2] LA MANO DE CARTAS EN LA PANTALLA FINAL. "◆ FOGONAZO ◆ PUÑALADA"
         (txtMano) seguía arriba a la izquierda en GANASTE
         (l04b_1_final_master_4s.png): pantallaFinal() apagaba las fichas
         pero no la mano. Se corren pantallaFinal() y refrescarHUD() de
         VERDAD sobre el partido de mentira: control en LIBRE (la mano SÍ se
         ve), después 30 cuadros en FINAL; y si el texto no existía antes del
         pitazo, tampoco nace después. Con PAMPA_MATCH_VIEJO=ruta corre
         contra otro match.js (el de antes falla con el síntoma).

     [4] /favicon.ico daba 404: un ICO nuevo en la raíz, derivado del ícono.
     [5] INSTALAR solo en la portada vertical: ahora también en la tabla del
         Master, apaisado, cuando el navegador lo ofrece.

   (La [3], red_lenta que fallaba al azar, se prueba en red_lenta.test.js [g]
   y en _sw_de_mentira.js.)

   Corré:  node phaser/test/deudas_ola2.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var PM = require("./_partido_de_mentira.js");
var RAIZ = path.join(__dirname, "..", "..");
function leer(f) { return fs.readFileSync(path.join(RAIZ, f), "utf8"); }

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }
var VIEJO = process.env.PAMPA_MATCH_VIEJO || null;

/* un jugador de mentira con lo que lee el HUD (el de deudas_ola1) */
function jug(i, rival) {
  return { nombre: (rival ? "R" : "M") + i, numero: i + 1, x: 400, y: 300, ax: 400, banda: [100, 500], aguante: 800, pos: i === 0 ? "ARQ" : i < 5 ? "DEF" : i < 8 ? "VOL" : "DEL",
    esVos: !rival && i === 9, esRival: !!rival, stats: {} };
}
function conHUD(E) {
  var s = E.s;
  E.W.Phaser.Math = { Clamp: function (v, a, b) { return Math.max(a, Math.min(b, v)); } };
  s.st.mios = []; s.st.rivales = [];
  for (var i = 0; i < 11; i++) { s.st.mios.push(jug(i, false)); s.st.rivales.push(jug(i, true)); }
  s.st.ctrl = 9; s.st.portadorRival = 9; s.st.posesion = "mia";
  function txt(x, y) { var t = s.add.text(x, y, "", {}); t.setColor = function () { return t; }; return t; }
  s.txtMarcador = txt(480, 14); s.txtDivision = txt(480, 26); s.txtReloj = txt(900, 14);
  s.gutsG = s.add.graphics(); s.envionG = s.add.graphics();
  s.lblGuts = txt(754, 522); s.txtGuts = txt(948, 522);
  s.lblEnvion = txt(754, 500); s.txtEnvion = txt(948, 500); s.txtEnvionEstado = txt(838, 480);
  s.MEDIDORES = { xEtq: 754, xBarra: 820, xNum: 948, yEnvion: 500, yGuts: 522, wBarra: 84 };
  s._division = { n: "PRIMERA B" };
  s._btnAccionCont = s.add.container(838, 456);
  s._hintEspacio = txt(838, 428);
  s._btnPulso = { paused: true, pause: function () { this.paused = true; }, resume: function () { this.paused = false; } };
  /* la mano: cartas_ui.textoDeLaMano devuelve el renglón; acá, el de la captura */
  s.textoDeLaMano = function () { return "◆ FOGONAZO ◆ PUÑALADA"; };
  return s;
}
function refrescar(E) { return E.W.PampaMatch.prototype.refrescarHUD.call(E.s); }

/* ---------- [2] LA MANO DE CARTAS NO QUEDA EN LA PANTALLA FINAL ---------- */
(function () {
  var E = PM.escena({ match: VIEJO }), s = conHUD(E);
  s.estado = "LIBRE";
  refrescar(E);
  assert(s.txtMano && s.txtMano.visible === true && s.txtMano.text === "◆ FOGONAZO ◆ PUÑALADA",
    "control: en LIBRE refrescarHUD escribe la mano y se ve (si no, este test no mide nada)");
  s.st.golesMio = 2; s.st.golesRival = 1;
  s.finDelPartido();
  assert(s.estado === "FINAL" && s._finalApagado === true, "el pitazo apaga el partido");
  assert(s.txtMano.visible === false, "SÍNTOMA DE LA CAPTURA l04b_1: pantallaFinal deja a la vista '" + s.txtMano.text + "' (txtMano)");
  var prendida = 0;
  for (var k = 0; k < 30; k++) {
    s.textoDeLaMano = function () { return "◆ FOGONAZO · " + k + "'"; };   // la recarga cambia el texto
    refrescar(E);
    if (s.txtMano.visible) prendida++;
  }
  assert(prendida === 0, "en 30 cuadros de refrescarHUD en FINAL la mano no vuelve (" + prendida + ")");
  E.correrTimers(); refrescar(E);
  assert(!s.txtMano.visible, "con las salidas del final a la vista, la mano sigue apagada");

  /* sin mano antes del pitazo (ninguna carta todavía): no nace después */
  var E2 = PM.escena({ match: VIEJO }), s2 = conHUD(E2);
  s2.textoDeLaMano = function () { return ""; };
  s2.estado = "LIBRE"; refrescar(E2);
  s2.st.golesMio = 0; s2.st.golesRival = 0;
  s2.finDelPartido();
  s2.textoDeLaMano = function () { return "◆ FOGONAZO"; };
  for (var k2 = 0; k2 < 5; k2++) refrescar(E2);
  assert(!s2.txtMano || s2.txtMano.visible === false, "si la mano aparece recién después del pitazo, no se dibuja sobre el resultado");
  console.log("[2] FINAL: la mano de cartas se apaga con el pitazo y no vuelve en 30 cuadros (control en LIBRE: a la vista)");
})();

/* ---------- [4] /favicon.ico EXISTE (y los íconos de antes, intactos) ----------
   Daba 404 a quien lo pide directo (curl del 12/oct, en el origen y en la
   carpeta del sitio): las páginas declaran rel=icon con el PNG, pero quien
   pide /favicon.ico sin leer la página (un lector de links, la barra de
   favoritos de algunos navegadores) recibía nada. Ahora hay un archivo
   NUEVO en la raíz del repo, derivado de phaser/icon-512.png con Pillow
   (16, 32 y 48 px, PNG adentro del ICO): la raíz del repo es la raíz del
   sitio publicado y la del server de desarrollo. */
(function () {
  var crypto = require("crypto");
  var f = path.join(RAIZ, "favicon.ico");
  assert(fs.existsSync(f), "SÍNTOMA DEL 404: hay favicon.ico en la raíz del sitio");
  if (!fs.existsSync(f)) return;
  var b = fs.readFileSync(f);
  /* el encabezado ICO: reservado 0, tipo 1 (ícono), cantidad de imágenes */
  var n = b.readUInt16LE(4);
  assert(b.readUInt16LE(0) === 0 && b.readUInt16LE(2) === 1 && n >= 2, "favicon.ico es un ICO de verdad con varias medidas (" + n + ")");
  var medidas = [];
  for (var i = 0; i < n; i++) {
    var e = 6 + i * 16, w = b[e] || 256, h = b[e + 1] || 256, largo = b.readUInt32LE(e + 8), off = b.readUInt32LE(e + 12);
    medidas.push(w + "x" + h);
    assert(off + largo <= b.length && b.slice(off, off + 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
      "la imagen de " + w + "x" + h + " está entera y es PNG (con transparencia)");
  }
  assert(medidas.indexOf("16x16") >= 0 && medidas.indexOf("32x32") >= 0, "trae 16 y 32, las que pide la pestaña (" + medidas.join(", ") + ")");
  assert(b.length < 20000, "es liviano (" + b.length + " B)");
  /* lo que no se toca: los íconos de los que sale */
  var HUELLAS = { "phaser/icon-512.png": "880063768ecc97add04b7c0cacd51faea8c6285964e027a1ffc39a0e409d4ae1",
    "phaser/icon-192.png": "3f00ab2c0d5cf5efdb4f93e7b298ad0d613ad505477e80059a949e518bae4842" };
  Object.keys(HUELLAS).forEach(function (k) {
    assert(crypto.createHash("sha256").update(fs.readFileSync(path.join(RAIZ, k))).digest("hex") === HUELLAS[k], k + " intacto (el favicon es un archivo nuevo)");
  });
  /* que se publique: no lo ignora git, y el server de desarrollo lo sirve con su tipo */
  var ignorado = true;
  try { require("child_process").execSync("git check-ignore -q favicon.ico", { cwd: RAIZ }); } catch (err) { ignorado = false; }
  assert(!ignorado, "git no ignora favicon.ico (si no, no llega al sitio)");
  assert(/"\.ico":\s*"image\/x-icon"/.test(leer("server.js")), "server.js lo sirve como image/x-icon");
  console.log("[4] /favicon.ico: ICO de " + b.length + " B con " + medidas.join(", ") + " (PNG adentro), los íconos de origen intactos");
})();

/* ---------- [5] 📲 INSTALAR APAISADO: EL ACCESO DE LA TABLA ----------
   El botón vivía solo en la portada vertical de index.html: quien abría el
   juego apaisado no lo veía. Ahora es el tercer acceso de abajo de la tabla
   del Master, y aparece solo cuando el navegador lo ofrece. Se corre
   vistaTemporada() de verdad sobre la escena de mentira, con una portada de
   mentira que tiene la misma interfaz que la de index.html (ofrece,
   instalar(), alCambiarInstalar(fn), textoMenu): portada.test.js [4c] prueba
   esa interfaz con la portada de verdad. */
(function () {
  var M = require("./_escena_de_mentira.js");
  var A = M.armar(), W = A.window;
  function portada(ofrece, resultado) {
    var PT = { ofrece: ofrece, textoMenu: "abrí el menú", instalados: 0, oyentes: [] };
    PT.alCambiarInstalar = function (fn) { PT.oyentes.push(fn); return function () { var i = PT.oyentes.indexOf(fn); if (i >= 0) PT.oyentes.splice(i, 1); }; };
    PT.cambiar = function (q) { PT.ofrece = q; PT.oyentes.slice().forEach(function (fn) { fn(q); }); };
    PT.instalar = function () { PT.instalados++; return resultado || "dialogo"; };
    return PT;
  }
  function tabla(PT) {
    W.PampaPortada = PT;
    var s = A.nueva();
    s.save = A.carreraNueva();
    s.T = W.PampaTemporada; s.Ma = W.PampaMaster; s.DIV = A.datos.divisiones;
    s.cajas = []; s.cajaDeTexto = function (o) { s.cajas.push(o); return null; };
    s.vistaTemporada();
    return s;
  }
  function caja(o) {
    var w = o.displayWidth, h = o.displayHeight, x0 = o.x - w * (o.originX || 0), y0 = o.y - h * (o.originY || 0);
    return { x0: x0, y0: y0, x1: x0 + w, y1: y0 + h };
  }
  /* el acceso, buscado por su texto en la lista de dibujo (como lo ve quien juega) */
  function acceso(s) { return s.children.list.filter(function (o) { return o.type === "Text" && /instalar el juego/.test(o.text) && o.scene; })[0] || null; }
  function soltarDedo(o) { var ev = { stopPropagation: function () { } }; o.emit("pointerup", { x: o.x, y: o.y }, 0, 0, ev); }

  /* sin el evento del navegador: el acceso está, pero ni se ve ni se toca */
  var PT = portada(null), s = tabla(PT), t = acceso(s);
  assert(!!t && /instalar el juego/.test(t.text), "la tabla arma el acceso '📲 instalar el juego' (" + (t && t.text) + ")");
  if (!t) return;
  assert(t.visible === false && !(t.input && t.input.enabled), "sin beforeinstallprompt no se ve ni se toca (el navegador no lo ofrece)");
  assert(PT.oyentes.length === 1, "la tabla se anota para enterarse si el navegador lo ofrece después");
  /* llega el evento con la tabla abierta */
  PT.cambiar("prompt");
  assert(t.visible === true && t.input && t.input.enabled, "SÍNTOMA DEL APAISADO SIN INSTALAR: llega el evento y el acceso aparece en la tabla");
  /* al apoyar no pasa nada; al soltar se abre el diálogo (el gesto del navegador) */
  t.emit("pointerdown", {}, 0, 0, { stopPropagation: function () { } });
  assert(PT.instalados === 0, "al apoyar el dedo no se abre (con el dedo el navegador da el gesto al soltar)");
  soltarDedo(t);
  assert(PT.instalados === 1, "al soltar abre el diálogo del navegador (PampaPortada.instalar)");
  PT.cambiar(null);
  assert(t.visible === false && !t.input.enabled, "usado el evento, el acceso se va");
  soltarDedo(t);
  assert(PT.instalados === 1, "escondido no abre nada");
  /* EN SU LUGAR: abajo, en el medio, sin pisar a los otros dos accesos ni a los botones */
  PT.cambiar("prompt");
  var otros = s.children.list.filter(function (o) { return o.type === "Text" && /empezar otra carrera|código de carrera/.test(o.text); });
  assert(otros.length === 2, "están los otros dos accesos de abajo (" + otros.length + ")");
  var ci = caja(t);
  otros.forEach(function (o) {
    var co = caja(o);
    assert(ci.x1 < co.x0 || co.x1 < ci.x0, "no pisa a '" + o.text + "' (x " + Math.round(ci.x0) + "-" + Math.round(ci.x1) + " contra " + Math.round(co.x0) + "-" + Math.round(co.x1) + ")");
    assert(Math.abs(o.y - t.y) < 1, "va en el renglón de los otros accesos (y=" + t.y + ")");
  });
  var jugar = s.children.list.filter(function (o) { return o.type === "Rectangle" && o.input && o.y > 400; });
  var iAcc = s.children.list.indexOf(t);
  assert(jugar.length >= 2 && jugar.every(function (r) { return s.children.list.indexOf(r) > iAcc; }),
    "se crea ANTES que JUGAR y EDITOR: en el borde que comparten con el piso táctil, gana el botón (como los otros accesos)");
  /* P1: la escena se reusa; init() suelta la anotación de la entrada anterior */
  s.init();
  assert(PT.oyentes.length === 0, "al volver a entrar (init) la anotación anterior se suelta");
  /* el diálogo que no abre: se dice qué hacer con el menú del navegador */
  var PT2 = portada("prompt", "menu"), s2 = tabla(PT2);
  soltarDedo(acceso(s2));
  assert(s2.cajas.length === 1 && /menú/.test(s2.cajas[0].texto) && s2.cajas[0].sinCaja === true, "si el diálogo no abre, una caja con los pasos del menú (" + (s2.cajas[0] && s2.cajas[0].texto) + ")");
  /* la temporada terminada también lo tiene */
  var PT3 = portada("prompt");
  W.PampaPortada = PT3;
  var s3 = A.nueva();
  s3.save = A.carreraNueva();
  s3.T = W.PampaTemporada; s3.Ma = W.PampaMaster; s3.DIV = A.datos.divisiones;
  var tp = s3.save.temporada;
  while (!s3.T.terminada(tp)) s3.T.jugarFecha(tp, 1, 0);
  s3.vistaTemporada();
  assert(acceso(s3) && acceso(s3).visible === true, "con la temporada terminada (NUEVA TEMPORADA) también está");
  /* sin portada (el juego embebido de una versión vieja, un test): nada, sin romper */
  W.PampaPortada = undefined;
  var s4 = A.nueva(); s4.save = A.carreraNueva(); s4.T = W.PampaTemporada; s4.Ma = W.PampaMaster; s4.DIV = A.datos.divisiones;
  var tiro = null;
  try { s4.vistaTemporada(); } catch (e) { tiro = e; }
  assert(!tiro && !acceso(s4), "sin PampaPortada la tabla se arma igual, sin el acceso");
  console.log("[5] 📲 en la tabla: escondido sin el evento, aparece cuando llega, abre al soltar, se va al usarse; abajo al medio sin pisar a nadie");
})();

/* ---------- [1] LAS VESTIDAS NO TRABAN EL ARRANQUE DEL PARTIDO ----------
   Vestir pose_bloqueo y pose_barrida (logic/vestir.js) es de una sola pieza
   y se hacía en el create del partido: en el navegador de la compu, los dos
   cuadros más largos de sus primeros 3 s (382 y 313 ms). Ahora las prepara
   la tabla del Master, las viste un Worker (logic/vestir_obrero.js) y el
   partido solo las usa. Se prueba, en node:
     (a) la clave y el color, que el que prepara y el que usa calculan igual;
     (b) el obrero corriendo de verdad (con un importScripts de mentira): da
         lo mismo que vestir() y devuelve los píxeles transferidos;
     (c) la cola de scenes/vestidas_ui.js con un Worker de mentira que corre
         ese obrero: el hilo de la página NO llama a vestir(); sin Worker, la
         tabla viste de a una con aire y el partido no viste nada; un Worker
         que falla o no contesta no rompe nada (y el error no llega a la red
         de errores);
     (d) poseDelEquipo y pedirVestidas (cine_arte.js) y prepararVestidas
         (master.js) de verdad, y el create del partido sin las dos vestidas. */
var vm = require("vm");
var V = require(path.join(RAIZ, "phaser/logic/vestir.js"));
/* una pose sintética: camiseta naranja a rayas encerrada en tinta y piel al
   lado (la trampa de vestir.test.js), chica para que corra rápido */
function poseSintetica(W, H) {
  var d = new Uint8ClampedArray(W * H * 4);
  function px(x, y, c) { var i = (y * W + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; }
  for (var y = 10; y < H - 10; y++) for (var x = 10; x < 90; x++) {
    var borde = x < 12 || x > 87 || y < 12 || y > H - 13;
    px(x, y, borde ? [20, 16, 14] : (((x - 12) % 24) >= 14 ? [26, 24, 22] : [252, 132, 76]));
  }
  for (y = 10; y < H - 10; y++) for (x = 100; x < 150; x++) px(x, y, (x < 102 || x > 147 || y < 12 || y > H - 13) ? [20, 16, 14] : [252, 180, 130]);
  return { width: W, height: H, datos: d };
}
function iguales(a, b) { if (!a || !b || a.length !== b.length) return false; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }
function turnos(n) { var p = Promise.resolve(); for (var i = 0; i < (n || 6); i++) p = p.then(function () { return new Promise(function (r) { setImmediate(r); }); }); return p; }

/* el obrero, cargado en su propio contexto como lo carga el navegador */
function contextoObrero() {
  var w = { console: console, Uint8ClampedArray: Uint8ClampedArray, Date: Date, enviados: [] };
  w.self = w;
  w.importScripts = function (f) { vm.runInContext(leer("phaser/logic/" + f), w, { filename: f }); };
  w.postMessage = function (m, tr) { w.enviados.push({ m: m, tr: tr }); };
  vm.createContext(w);
  vm.runInContext(leer("phaser/logic/vestir_obrero.js"), w, { filename: "vestir_obrero.js" });
  return w;
}

/* el juego de mentira: texturas del administrador, lienzos y un Worker */
function mundoDeVestidas(op) {
  op = op || {};
  var timers = [], asegurados = [], llamadasVestir = 0, workers = [];
  var T = { m: {} };
  T.exists = function (k) { return Object.prototype.hasOwnProperty.call(T.m, k); };
  T.get = function (k) { return { getSourceImage: function () { return T.m[k].img; } }; };
  T.createCanvas = function (k, w, h) {
    var c = { w: w, h: h, pix: null, refrescos: 0 };
    c.getContext = function () { return { putImageData: function (d) { c.pix = new Uint8ClampedArray(d.data); } }; };
    c.refresh = function () { c.refrescos++; };
    T.m[k] = { canvas: c };
    return c;
  };
  T.remove = function (k) { delete T.m[k]; };
  var BAL = { vestidas: { espera_tabla_ms: 700, hilo_espera_ms: 400, obrero_tope_ms: 15000, obrero: true } };
  var game = { textures: T, registry: { get: function (k) { return k === "balance" ? BAL : null; } } };
  function lienzo() {
    var cv = { width: 0, height: 0, img: null };
    cv.getContext = function () {
      return {
        drawImage: function (img) { cv.img = img; },
        getImageData: function (x, y, w, h) { return { data: new Uint8ClampedArray(cv.img.datos), width: w, height: h }; }
      };
    };
    return cv;
  }
  function Obrero(url) {
    var self = this;
    this.url = url; this.terminado = false; this.mensajes = 0;
    workers.push(this);
    var w = contextoObrero();
    w.postMessage = function (m) { setImmediate(function () { if (!self.terminado && self.onmessage) self.onmessage({ data: m }); }); };
    this.postMessage = function (m, tr) {
      self.mensajes++;
      self.transferido = !!(tr && tr[0] === m.buf);
      if (op.obrero === "error") {
        var ev = { message: "no cargó", prevenido: false, preventDefault: function () { this.prevenido = true; } };
        self.errorEv = ev;
        setImmediate(function () { if (self.onerror) self.onerror(ev); });
        return;
      }
      if (op.obrero === "mudo") return;
      var copia = { n: m.n, w: m.w, h: m.h, buf: m.buf, destino: m.destino };
      setImmediate(function () { w.onmessage({ data: copia }); });
    };
    this.terminate = function () { self.terminado = true; };
  }
  var win = {
    PampaVestir: Object.assign({}, V, { vestir: function () { llamadasVestir++; return V.vestir.apply(null, arguments); } }),
    PampaHaloAsegurar: function (k) { asegurados.push(k); }
  };
  var ctx = {
    window: win, console: { error: function () { }, log: console.log, warn: function () { } },
    document: { createElement: function () { return lienzo(); } },
    ImageData: function (data, w, h) { this.data = data; this.width = w; this.height = h; },
    Uint8ClampedArray: Uint8ClampedArray, Date: Date, Object: Object, Math: Math, String: String,
    performance: { now: function () { return Date.now(); } },
    setTimeout: function (fn, ms) { var t = { fn: fn, ms: ms, vivo: true }; timers.push(t); return t; },
    clearTimeout: function (t) { if (t) t.vivo = false; }
  };
  if (op.obrero !== "ninguno") ctx.Worker = Obrero;
  vm.createContext(ctx);
  vm.runInContext(leer("phaser/scenes/vestidas_ui.js"), ctx, { filename: "vestidas_ui.js" });
  return {
    game: game, T: T, PV: win.PampaVestidas, ESTADO: win.__PAMPA_VESTIDAS, workers: workers, timers: timers, asegurados: asegurados,
    llamadasVestir: function () { return llamadasVestir; },
    /* dispara los timers vivos (el reloj no corre solo) */
    correrTimers: function () { var t = timers.splice(0); t.forEach(function (x) { if (x.vivo) x.fn(); }); return t.length; },
    pose: function (id, W, H) { T.m["pose_" + id] = { img: poseSintetica(W || 160, H || 100) }; }
  };
}
/* lo que tiene que quedar: vestir() de verdad sobre la misma pose */
function esperado(W, H, destino) { var p = poseSintetica(W, H); V.vestir(p.datos, W, H, { destino: destino }); return p.datos; }

async function prueba1() {
  var MAN = JSON.parse(leer("data/poses_manifest.json")), CM = JSON.parse(leer("data/caras_manifest.json"));
  var CEL = V.DEF.destino;
  /* (a) la clave y el color */
  assert(V.claveVestida("bloqueo", "#4fc3f7") === "poseE_bloqueo_4fc3f7", "la clave de siempre: poseE_<pose>_<hex>");
  assert(V.claveVestida("bloqueo", "#4FC3F7") === V.claveVestida("bloqueo", "#4fc3f7"), "la camiseta 'Celeste titular' (#4FC3F7) y el celeste del equipo son la misma textura");
  assert(V.destinoDelLook(null, CM.camisetas) === CEL && V.destinoDelLook({ tCam: 0 }, CM.camisetas) === CEL, "sin camiseta elegida (o Original): el celeste del equipo");
  assert(V.destinoDelLook({ tCam: 5 }, CM.camisetas) === CM.camisetas[4].hex, "con camiseta elegida: esa (" + CM.camisetas[4].n + ")");
  var pares = V.paresAVestir(MAN, [CEL, CM.camisetas[4].hex]);
  assert(pares.length === 4 && pares.every(function (p) { return (p.id === "bloqueo" || p.id === "barrida") && MAN.poses[p.id].kit === "rival"; }),
    "a vestir: bloqueo y barrida (las de kit rival), por los dos colores (" + pares.map(function (p) { return p.clave; }).join(", ") + ")");
  assert(V.paresAVestir(MAN, [CEL, CM.camisetas[0].hex]).length === 2, "si tu camiseta es el mismo celeste, se visten una vez");

  /* (b) el obrero de verdad */
  var w = contextoObrero(), p0 = poseSintetica(160, 100);
  w.onmessage({ data: { n: 7, w: 160, h: 100, buf: p0.datos.buffer, destino: "#e8712f" } });
  var env = w.enviados[0];
  assert(env && env.m.ok === true && env.m.n === 7 && env.tr && env.tr[0] === env.m.buf, "el obrero contesta con el mismo número y los píxeles TRANSFERIDOS (sin copia)");
  assert(env && iguales(new Uint8ClampedArray(env.m.buf), esperado(160, 100, "#e8712f")), "y viste igual que vestir() en el hilo de la página");
  w.onmessage({ data: { n: 8, w: 10, h: 10, buf: -1, destino: CEL } });   // un buffer imposible
  assert(w.enviados[1] && w.enviados[1].m.ok === false && w.enviados[1].m.n === 8, "si algo falla, contesta ok:false (no se cuelga)");

  /* (c1) con Worker, como pide el partido (hilo: false): nada en el hilo de la página */
  var M1 = mundoDeVestidas({});
  M1.pose("bloqueo", 160, 100); M1.pose("barrida", 120, 90);
  var p1 = V.paresAVestir(MAN, [CEL]);
  var n1 = M1.PV.preparar(M1.game, p1, { hilo: false });
  assert(n1 === 2 && M1.workers.length === 1 && M1.workers[0].url === "logic/vestir_obrero.js", "encola las dos y arranca UN obrero (logic/vestir_obrero.js)");
  assert(M1.workers[0].mensajes === 1 && M1.workers[0].transferido, "de a una: manda la primera, con los píxeles transferidos");
  assert(M1.PV.preparar(M1.game, p1, { hilo: false }) === 0, "pedirlas otra vez mientras se visten no las encola de nuevo");
  await turnos(12);
  assert(M1.T.exists("poseE_bloqueo_4fc3f7") && M1.T.exists("poseE_barrida_4fc3f7"), "vuelven las dos y quedan como texturas del juego");
  assert(M1.llamadasVestir() === 0, "SÍNTOMA DE LA TRABA: el hilo de la página no corrió vestir() ni una vez (" + M1.llamadasVestir() + ")");
  assert(iguales(M1.T.m["poseE_bloqueo_4fc3f7"].canvas.pix, esperado(160, 100, CEL)) && iguales(M1.T.m["poseE_barrida_4fc3f7"].canvas.pix, esperado(120, 90, CEL)),
    "las texturas son exactamente la pose vestida (la misma función)");
  assert(M1.T.m["poseE_bloqueo_4fc3f7"].canvas.refrescos === 1, "y se suben una vez a la placa (refresh)");
  assert(M1.asegurados.indexOf("pose_bloqueo") >= 0, "antes de leer la pose se limpia su halo (como antes)");
  assert(M1.ESTADO.obrero === 2 && M1.ESTADO.hilo === 0 && M1.ESTADO.fallas.length === 0, "__PAMPA_VESTIDAS: 2 en el hilo aparte, 0 en este");
  assert(M1.PV.preparar(M1.game, p1, { hilo: false }) === 0 && M1.workers[0].mensajes === 2, "las que ya están no se vuelven a vestir");
  /* la pose que no está todavía: se saltea sin romper */
  var M1b = mundoDeVestidas({});
  M1b.PV.preparar(M1b.game, p1, { hilo: false });
  await turnos(6);
  assert(!M1b.T.exists("poseE_bloqueo_4fc3f7") && M1b.ESTADO.fallas.length === 0, "sin la pose de origen cargada, no hay nada que vestir (y no es un error)");

  /* (c2) sin Worker: el partido no viste nada; la tabla, de a una con aire */
  var M2 = mundoDeVestidas({ obrero: "ninguno" });
  M2.pose("bloqueo"); M2.pose("barrida");
  M2.PV.preparar(M2.game, p1, { hilo: false });
  M2.correrTimers(); await turnos(4);
  assert(!M2.T.exists("poseE_bloqueo_4fc3f7") && M2.llamadasVestir() === 0, "sin Worker, lo que pide el partido NO se viste en su arranque (se viste al usarla)");
  M2.PV.preparar(M2.game, p1, { hilo: true });
  assert(M2.llamadasVestir() === 0 && M2.timers.length === 1 && M2.timers[0].ms === 400, "sin Worker, la tabla espera balance.vestidas.hilo_espera_ms (400) antes de la primera");
  M2.correrTimers();
  assert(M2.llamadasVestir() === 1 && M2.timers.length === 1, "y viste UNA por vez, con aire antes de la siguiente");
  M2.correrTimers();
  assert(M2.llamadasVestir() === 2 && M2.T.exists("poseE_barrida_4fc3f7") && M2.ESTADO.hilo === 2, "las dos, en este hilo (__PAMPA_VESTIDAS.hilo = 2)");

  /* (c3) un Worker que falla al cargar: el error no llega a la red de errores y la tabla sigue en este hilo */
  var M3 = mundoDeVestidas({ obrero: "error" });
  M3.pose("bloqueo"); M3.pose("barrida");
  M3.PV.preparar(M3.game, p1, { hilo: true });
  await turnos(4);
  assert(M3.workers[0].errorEv && M3.workers[0].errorEv.prevenido === true, "el error del Worker se ataja (preventDefault): no sale 'Algo se trabó'");
  assert(M3.workers[0].terminado && M3.ESTADO.fallas.length >= 1, "el obrero se da por muerto y queda anotado (" + M3.ESTADO.fallas.join(" | ") + ")");
  M3.correrTimers(); M3.correrTimers();
  assert(M3.T.exists("poseE_bloqueo_4fc3f7") && M3.T.exists("poseE_barrida_4fc3f7") && M3.workers.length === 1, "y la tabla las viste en este hilo, sin volver a crear el obrero");

  /* (c4) un Worker que no contesta: a los obrero_tope_ms se lo da por muerto */
  var M4 = mundoDeVestidas({ obrero: "mudo" });
  M4.pose("bloqueo"); M4.pose("barrida");
  M4.PV.preparar(M4.game, p1, { hilo: true });
  await turnos(4);
  var tope = M4.timers.filter(function (t) { return t.vivo; })[0];
  assert(tope && tope.ms === 15000 && !M4.T.exists("poseE_bloqueo_4fc3f7"), "mientras el obrero trabaja, hay un tope de balance.vestidas.obrero_tope_ms (15000)");
  M4.correrTimers();
  assert(M4.workers[0].terminado && /no contestó/.test(M4.ESTADO.fallas.join(" ")), "vencido el tope, el obrero se termina");
  M4.correrTimers(); M4.correrTimers();
  assert(M4.T.exists("poseE_bloqueo_4fc3f7") && M4.T.exists("poseE_barrida_4fc3f7"), "y la tabla sigue en este hilo");

  /* (d1) poseDelEquipo y pedirVestidas, de cine_arte.js, sobre el partido de mentira */
  var E = PM.escena({ mixins: ["phaser/scenes/cine_arte.js"], logica: ["phaser/logic/ambiente.js", "phaser/logic/vestir.js", "phaser/logic/avatar.js"] });
  var s = E.s, MD = mundoDeVestidas({});
  MD.pose("bloqueo"); MD.pose("barrida"); MD.pose("remate");
  var usadas = [], pedidos = [];
  E.W.PampaVestidas = {
    vestirYa: function (g, id, d) { usadas.push(id + d); return MD.PV.vestirYa(g, id, d); },
    preparar: function (g, ps, op) { pedidos.push({ ps: ps, op: op }); return MD.PV.preparar(g, ps, op); }
  };
  E.W.PampaAvatar.setCatalogoManifest && E.W.PampaAvatar.setCatalogoManifest({ camisetas: CM.camisetas.length, caras: CM.caras.length });
  s.game = { registry: { get: function (k) { return k === "poses" ? MAN : k === "caras" ? CM : null; } }, textures: MD.T };
  s.textures = MD.T;
  s.poseKey = function (id) { return MD.T.exists("pose_" + id) ? "pose_" + id : null; };
  assert(s.poseDelEquipo("remate") === "pose_remate", "una pose que no es de kit rival vuelve tal cual");
  var vos = { esVos: true, look: { tCam: 6 } };
  s.st = { mios: [{ esVos: false }, vos] };
  s.pedirVestidas();
  assert(pedidos.length === 1 && pedidos[0].op.hilo === false, "el partido las pide SOLO al hilo aparte (hilo: false)");
  var claves = pedidos[0].ps.map(function (p) { return p.clave; }).sort().join(",");
  assert(claves === ["poseE_barrida_4fc3f7", "poseE_barrida_" + CM.camisetas[5].hex.slice(1).toLowerCase(), "poseE_bloqueo_4fc3f7", "poseE_bloqueo_" + CM.camisetas[5].hex.slice(1).toLowerCase()].sort().join(","),
    "con el celeste del equipo y la camiseta de VOS (" + claves + ")");
  await turnos(20);
  assert(s.poseDelEquipo("bloqueo") === "poseE_bloqueo_4fc3f7" && usadas.length === 0, "ya vestida: el partido la usa sin vestir nada");
  assert(s.poseDelEquipo("bloqueo", vos) === "poseE_bloqueo_" + CM.camisetas[5].hex.slice(1).toLowerCase() && usadas.length === 0, "VOS con tu camiseta: la tuya, ya vestida");
  assert(MD.llamadasVestir() === 0, "y en todo esto el hilo del partido no corrió vestir()");
  MD.T.remove("poseE_barrida_4fc3f7");
  var k = s.poseDelEquipo("barrida");
  assert(k === "poseE_barrida_4fc3f7" && usadas.length === 1, "si al usarla falta, se viste en el acto (último recurso: nunca con las rayas del rival)");

  /* (d2) el create del partido ya no viste */
  var SRC = VIEJO ? fs.readFileSync(VIEJO, "utf8") : leer("phaser/scenes/match.js"), cre = SRC.slice(SRC.indexOf("  create() {"), SRC.indexOf("this.armarPrecalentamiento();"));
  assert(!/poseDelEquipo\("(bloqueo|barrida)"\)/.test(cre) && /this\.pedirVestidas\(\)/.test(cre),
    "SÍNTOMA: el create del partido vestía bloqueo y barrida en dos delayedCall; ahora solo las pide (pedirVestidas)");

  /* (d3) la tabla del Master las prepara, con los colores del partido */
  var MM = require("./_escena_de_mentira.js"), A = MM.armar({ logicaExtra: ["phaser/logic/avatar.js"] }), WM = A.window, MT = mundoDeVestidas({});
  var pedidosM = [];
  WM.PampaVestir = V;
  WM.PampaVestidas = { preparar: function (g, ps, op) { pedidosM.push({ ps: ps, op: op }); return ps.length; } };
  A.reg.set("poses", MAN); A.reg.set("caras", CM);
  A.reg.set("balance", Object.assign({}, A.reg.get("balance") || {}, { vestidas: { espera_tabla_ms: 700 } }));
  A.store.pampa_star_avatares = JSON.stringify({ vos: { tCam: 5 } });
  WM.PampaAvatar.setCatalogoManifest && WM.PampaAvatar.setCatalogoManifest({ camisetas: CM.camisetas.length, caras: CM.caras.length });
  var sm = A.nueva();
  sm.save = A.carreraNueva(); sm.T = WM.PampaTemporada; sm.Ma = WM.PampaMaster; sm.DIV = A.datos.divisiones;
  sm.textures = MT.T;
  var cargas = [], completo = [], arranques = 0;
  sm.load = { image: function (k2, u) { cargas.push(k2 + " " + u); }, once: function (ev, fn) { if (ev === "complete") completo.push(fn); }, start: function () { arranques++; } };
  sm.vistaTemporada();
  var tVest = sm._timers.filter(function (t) { return t.ms === 700; });
  assert(tVest.length === 1, "la tabla, al dibujarse, programa las vestidas a los balance.vestidas.espera_tabla_ms (700)");
  assert(pedidosM.length === 0 && cargas.length === 0, "y no hace nada antes (la tabla se dibuja limpia)");
  tVest[0].fn();
  assert(cargas.slice().sort().join(" | ") === "pose_barrida ../assets/poses/pose_barrida.webp | pose_bloqueo ../assets/poses/pose_bloqueo.webp" && arranques === 1,
    "baja las dos poses que el partido iba a bajar igual (" + cargas.join(" | ") + ")");
  completo.forEach(function (fn) { fn(); });
  assert(pedidosM.length === 1 && pedidosM[0].op.hilo === true, "bajadas, las pide a la cola con permiso para este hilo si no hubiera Worker (la tabla está quieta)");
  var clavesM = pedidosM[0].ps.map(function (p) { return p.clave; }).sort().join(",");
  var tuya = CM.camisetas[4].hex.slice(1).toLowerCase();
  assert(clavesM === ["poseE_barrida_4fc3f7", "poseE_barrida_" + tuya, "poseE_bloqueo_4fc3f7", "poseE_bloqueo_" + tuya].sort().join(","),
    "con los colores que va a usar el partido: el celeste y tu camiseta del editor (" + clavesM + ")");
  assert(sm.prepararVestidas() === 0 && pedidosM.length === 1, "una vez por entrada a la tabla");
  sm.init();
  assert(sm._vestidasPedidas === false, "P1: init() deja volver a pedirlas en la entrada siguiente");
  /* con las poses ya en memoria (volviste de un partido): se piden sin bajar nada */
  MT.pose("bloqueo"); MT.pose("barrida");
  cargas.length = 0; pedidosM.length = 0;
  sm.prepararVestidas();
  assert(cargas.length === 0 && pedidosM.length === 1, "con las poses ya cargadas, se piden directo");
  MT.T.m[pedidosM[0].ps[0].clave] = { canvas: {} };
  sm.init(); pedidosM.length = 0;
  sm.prepararVestidas();
  assert(pedidosM.length === 1 && pedidosM[0].ps.length === 3, "y las que ya están vestidas no se vuelven a pedir");

  /* (d4) lo que hace falta para que llegue al teléfono */
  var SW = leer("phaser/sw.js"), IDX = leer("phaser/index.html");
  assert(/"\.\/scenes\/vestidas_ui\.js"/.test(SW) && /"\.\/logic\/vestir_obrero\.js"/.test(SW), "el PRECACHE del worker tiene vestidas_ui.js y el obrero (sin red, igual anda)");
  assert(IDX.indexOf('src="logic/vestir.js"') < IDX.indexOf('src="scenes/vestidas_ui.js"') && IDX.indexOf('src="scenes/vestidas_ui.js"') < IDX.indexOf('src="scenes/master.js"'),
    "index.html carga vestidas_ui.js después de vestir.js y antes de las escenas");
  console.log("[1] vestidas: el obrero viste igual que vestir() y devuelve transferido; con Worker el hilo de la página no corre vestir(); sin Worker, la tabla de a una con aire y el partido nada; " +
    "error y tope atajados; el partido solo usa (último recurso: en el acto); la tabla baja las poses y pide los dos colores");
}

prueba1().catch(function (e) { mal++; console.error("  ✗ [1] se cortó: " + (e && e.stack || e)); }).then(function () {
  console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
  process.exit(mal === 0 ? 0 : 1);
});
