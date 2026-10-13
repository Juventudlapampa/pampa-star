/* ============================================================================
   PAMPA STAR · L08c — LAS DEUDAS QUE DEJÓ LA OLA 2 SIN DUEÑO

   Los lotes L04b a L08 las vieron (con su medición o su captura) y las
   anotaron porque no eran su ítem. Acá cada una tiene su prueba:

     [2] LA MANO DE CARTAS EN LA PANTALLA FINAL. "◆ FOGONAZO ◆ PUÑALADA"
         (txtMano) seguía arriba a la izquierda en GANASTE
         (l04b_1_final_master_4s.png): pantallaFinal() apagaba las fichas
         pero no la mano. Se corren pantallaFinal() y refrescarHUD() de
         VERDAD sobre el partido de mentira: control en LIBRE (la mano SÍ se
         ve), después 30 cuadros en FINAL; y si el texto no existía antes del
         pitazo, tampoco nace después. Con PAMPA_MATCH_VIEJO=ruta corre
         contra otro match.js (el de antes falla con el síntoma).

   (La [3], red_lenta que fallaba al azar, se prueba en red_lenta.test.js y
   en _sw_de_mentira.js; la [1], la [4] y la [5] se suman abajo.)

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

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
