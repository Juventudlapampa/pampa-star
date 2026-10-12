/* ============================================================================
   PAMPA STAR · L04b — LAS DEUDAS QUE DEJÓ LA OLA 1

   Tres lotes las vieron en sus capturas y las anotaron como deudas porque no
   eran su ítem. Acá cada una tiene su prueba, con los métodos REALES de las
   escenas sobre las escenas de mentira (_partido_de_mentira.js para el
   partido, _escena_de_mentira.js para el Master) o con la lógica pura.

     [1] EL BOTÓN ⚡ACCIÓN EN LA PANTALLA FINAL. pantallaFinal() lo apagaba y
         refrescarHUD(), que corre en cada cuadro, lo volvía a prender junto
         con "ESPACIO = ACCIÓN" (l03_v2_ganaste.png, y otra vez en
         l02_p1_fecha1_final.png). Lo arregló L04 (69ade45) sin test: acá se
         fija. Se corre refrescarHUD() de VERDAD: primero en LIBRE con la
         pelota (control: el botón SÍ se ve, si no el test no mide nada) y
         después 30 cuadros en FINAL. Contra el match.js de antes de 69ade45
         (PAMPA_MATCH_VIEJO=ruta) falla con el síntoma.

   Corré:  node phaser/test/deudas_ola1.test.js
   ========================================================================== */
"use strict";
var PM = require("./_partido_de_mentira.js");

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }
var VIEJO = process.env.PAMPA_MATCH_VIEJO || null;

/* un jugador de mentira con lo que lee el HUD */
function jug(i, rival) {
  return { nombre: (rival ? "R" : "M") + i, numero: i + 1, x: 400, y: 300, ax: 400, banda: [100, 500], aguante: 800, pos: i === 0 ? "ARQ" : i < 5 ? "DEF" : i < 8 ? "VOL" : "DEL",
    esVos: !rival && i === 9, esRival: !!rival, stats: {} };
}
/* el HUD que arma create(): textos y gráficos que refrescarHUD escribe */
function conHUD(E) {
  var s = E.s, W = E.W;
  W.Phaser.Math = { Clamp: function (v, a, b) { return Math.max(a, Math.min(b, v)); } };
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
  /* el botón ⚡ACCIÓN: el contenedor, su pulso y la ayuda de teclado */
  s._btnAccionCont = s.add.container(838, 456);
  s._hintEspacio = txt(838, 428);
  s._btnPulso = { paused: true, pause: function () { this.paused = true; }, resume: function () { this.paused = false; } };
  return s;
}
function refrescar(E) { return E.W.PampaMatch.prototype.refrescarHUD.call(E.s); }

/* ---------- [1] EL ⚡ACCIÓN NO VUELVE EN LA PANTALLA FINAL ---------- */
(function () {
  var E = PM.escena({ match: VIEJO }), s = conHUD(E);
  /* control: en LIBRE con la pelota, refrescarHUD SÍ lo muestra */
  s.estado = "LIBRE"; s._btnAccionCont.setVisible(false); s._hintEspacio.setVisible(false);
  refrescar(E);
  assert(s._btnAccionCont.visible === true && s._hintEspacio.visible === true,
    "control: en LIBRE refrescarHUD muestra ⚡ACCIÓN y su ayuda (si no, este test no mide nada)");
  /* el pitazo: finDelPartido → pantallaFinal, y el HUD sigue refrescándose */
  s.st.golesMio = 2; s.st.golesRival = 1;
  s.finDelPartido();
  assert(s.estado === "FINAL" && s._finalApagado === true, "el final es su estado y apaga el partido");
  assert(s._btnAccionCont.visible === false && s._hintEspacio.visible === false, "pantallaFinal apaga ⚡ACCIÓN y 'ESPACIO = ACCIÓN'");
  var prendido = 0;
  for (var k = 0; k < 30; k++) {
    refrescar(E);
    if (s._btnAccionCont.visible || s._hintEspacio.visible) prendido++;
  }
  assert(prendido === 0, "SÍNTOMA: refrescarHUD volvió a prender ⚡ACCIÓN o 'ESPACIO = ACCIÓN' en " + prendido + " de 30 cuadros del FINAL");
  /* las salidas del final entran a los 700 ms: el botón sigue apagado con ellas */
  E.correrTimers(); refrescar(E);
  assert(!s._btnAccionCont.visible && !s._hintEspacio.visible, "con las salidas del final a la vista, ⚡ACCIÓN sigue apagado");
  /* y si alguien deja el estado en otra cosa, _finalApagado alcanza solo */
  s.estado = "LIBRE"; refrescar(E);
  assert(!s._btnAccionCont.visible, "_finalApagado solo ya lo deja apagado (el partido terminó)");
  console.log("[1] FINAL: 30 cuadros de refrescarHUD con ⚡ACCIÓN y su ayuda apagados (control en LIBRE: prendidos)");
})();

/* ---------- [2] EL TÍTULO DEL MENÚ Y EL TICKER NO SE PISAN ---------- */
(function () {
  var E = PM.escena({ match: VIEJO }), s = conHUD(E);
  var hold = E.BAL.relator.hold_ms;
  /* el ticker como lo arma create(): en la franja de balance.relator.y */
  s.tickerTxt = s.add.text(480, E.BAL.relator.y, "", {}); s.tickerTxt.setAlpha(0);
  s.tweens.killTweensOf = function () { };
  var CRUZ = { titulo: "⚔ ¡ESPEJO te sale al cruce!", opciones: { N: { texto: "⚡ GAMBETA", sub: "~50%", cb: function () { } } } };
  /* la geometría que obliga: el título va a y=306 y el ticker a balance.relator.y */
  var SRC = PM.leer(VIEJO || "phaser/scenes/match.js");
  assert(/this\.add\.text\(480, 306, cfg\.titulo/.test(SRC) && Math.abs(E.BAL.relator.y - 306) < 21,
    "el título de la cruz (y=306) y el ticker (y=" + E.BAL.relator.y + ") comparten la franja: por eso uno se aparta");

  /* a) la frase recién dicha (200 ms) se aparta y vuelve a esperar */
  s.estado = "LIBRE"; s.time.now = 1000;
  s.anunciarEnTicker("Metió el cuerpo y la pelota cambió de dueño.", "🎙");
  assert(s.tickerTxt.alpha === 1, "control: en LIBRE la frase se pinta en el ticker");
  s.time.now = 1200;
  s.abrirMenuCruz(CRUZ);
  assert(s.estado === "MENU", "la cruz está abierta");
  assert(s.tickerTxt.alpha === 0, "SÍNTOMA: con la cruz abierta el ticker sigue a la vista debajo del título (alpha " + s.tickerTxt.alpha + ")");
  assert(s._relPendiente === "🎙 Metió el cuerpo y la pelota cambió de dueño.", "la frase que no llegó a leerse vuelve a esperar (" + s._relPendiente + ")");
  /* b) lo que dice el relator con el menú abierto también espera (y es lo más nuevo) */
  s.anunciarEnTicker("Se la llevó puesta.", "🎙");
  assert(s.tickerTxt.alpha === 0, "con el menú abierto la frase nueva no se pinta debajo del título");
  assert(s._relPendiente === "🎙 Se la llevó puesta.", "y espera; la más nueva reemplaza a la vieja (" + s._relPendiente + ")");
  /* c) al cerrar el menú, sale */
  s.limpiarMenu(); s.estado = "LIBRE"; s.time.now = 3000;
  s.soltarRelatoPendiente();
  assert(s.tickerTxt.alpha === 1 && s.tickerTxt.text === "🎙 Se la llevó puesta.", "al cerrar el menú, la frase que esperaba sale (" + s.tickerTxt.text + ")");
  /* d) una frase que ya se leyó (más de la mitad de su tiempo) no vuelve */
  s._relPendiente = null; s.time.now = 10000;
  s.anunciarEnTicker("Toque y a seguir.", "🎙");
  s.time.now = 10000 + Math.round(hold * 0.6);
  s.abrirMenuCruz(CRUZ);
  assert(s.tickerTxt.alpha === 0 && s._relPendiente === null, "la frase ya leída se aparta y no se repite al cerrar (" + s._relPendiente + ")");
  /* e) la ficha de la semana (prioridad) vuelve siempre, con su prioridad */
  s.limpiarMenu(); s.estado = "LIBRE"; s.time.now = 20000;
  s.anunciarEnTicker("por qué hoy te cuesta: dormiste poco", "📋", { prioridad: true });
  s.time.now = 20000 + Math.round(hold * 0.8);
  s.abrirMenuCruz(CRUZ);
  assert(s._relPendiente === "📋 por qué hoy te cuesta: dormiste poco" && s._relPendientePrio === true, "la ficha de la semana vuelve a esperar, con prioridad");
  /* f) el pase dirigido: su ayuda también va en la franja */
  s.limpiarMenu(); s.estado = "PASE";
  assert(s.tickerSeLee() === false, "con el pase dirigido abierto el ticker espera");
  s.estado = "LIBRE";
  assert(s.tickerSeLee() === true, "control: en LIBRE el ticker se lee");
  var paseSrc = SRC.slice(SRC.indexOf("  iniciarPaseDirigido(rivalIdx, libre) {"));
  paseSrc = paseSrc.slice(0, paseSrc.indexOf("\n  }\n"));
  assert(/this\.estado = "PASE";\s*\n\s*this\.apartarTicker\(\)/.test(paseSrc.replace(/\r/g, "")), "iniciarPaseDirigido aparta el ticker al abrir");
  console.log("[2] con la cruz o el pase abiertos el ticker se aparta; la frase sin leer espera y sale al cerrar");
})();

/* ---------- [3] EN LA TABLA DEL MASTER, EL RESULTADO NO PISA AL CLUB ---------- */
(function () {
  var M = require("./_escena_de_mentira.js");
  var A = M.armar({ master: process.env.PAMPA_MASTER_VIEJO || undefined }), W = A.window;
  /* la caja de un texto con su origen (la escena de mentira mide 0,55 x tamaño por letra) */
  function caja(o) {
    var w = o.displayWidth, h = o.displayHeight;
    var x0 = o.x - w * (o.originX || 0), y0 = o.y - h * (o.originY || 0);
    return { x0: x0, y0: y0, x1: x0 + w, y1: y0 + h };
  }
  /* con un píxel de tolerancia: la escena de mentira mide el alto como 1,25 x
     el tamaño, más generoso que el de verdad (el título de 24 px y el club de
     12, que nunca se tocaron en pantalla, daban medio píxel de cruce) */
  function cruzan(a, b) { var t = 1; return a.x0 + t < b.x1 - t && b.x0 + t < a.x1 - t && a.y0 + t < b.y1 - t && b.y0 + t < a.y1 - t; }
  function textos(s) {
    var out = [];
    (function barrer(l) { l.forEach(function (o) { if (o.type === "Text" && o.text) out.push(o); if (o.list) barrer(o.list); }); })(s.children.list);
    return out;
  }
  [
    { n: "club sin títulos, ganaste 2-1", titulos: 0, ultimo: { golesMio: 2, golesRival: 1 }, re: /^✔ GANASTE 2-1$/ },
    { n: "club con 5 títulos, empataste 0-0", titulos: 5, ultimo: { golesMio: 0, golesRival: 0 }, re: /^= EMPATASTE 0-0$/ },
    { n: "perdiste 1-3", titulos: 1, ultimo: { golesMio: 1, golesRival: 3 }, re: /^✘ PERDISTE 1-3$/ }
  ].forEach(function (c) {
    var s = A.nueva();
    s.save = A.carreraNueva();
    for (var k = 0; k < c.titulos; k++) s.save.titulos.push({ temporadaN: k + 1, division: "primera_b" });
    s.T = W.PampaTemporada; s.Ma = W.PampaMaster; s.DIV = A.datos.divisiones;
    s._ultimo = c.ultimo;
    s.vistaTemporada();
    var ts = textos(s);
    var res = ts.filter(function (o) { return c.re.test(o.text); })[0];
    var club = ts.filter(function (o) { return o.text.indexOf(s.save.club) === 0; })[0];
    assert(!!res && !!club, c.n + ": están el resultado y el club (" + (res && res.text) + " / " + (club && club.text) + ")");
    if (!res || !club) return;
    var cr = caja(res), cc = caja(club);
    assert(!cruzan(cr, cc), "SÍNTOMA: " + c.n + ": el resultado [" + Math.round(cr.x0) + "," + Math.round(cr.y0) + "→" + Math.round(cr.x1) + "," + Math.round(cr.y1) +
      "] pisa al club [" + Math.round(cc.x0) + "," + Math.round(cc.y0) + "→" + Math.round(cc.x1) + "," + Math.round(cc.y1) + "]");
    /* ni a ningún otro texto de la vista */
    var otros = ts.filter(function (o) { return o !== res && cruzan(caja(o), cr); }).map(function (o) { return o.text; });
    assert(otros.length === 0, c.n + ": el resultado no pisa ningún otro texto (" + otros.join(" | ") + ")");
    /* en el renglón del club, a su derecha, y el par centrado y adentro del lienzo */
    assert(Math.abs(res.y - club.y) < 1 && cr.x0 >= cc.x1 + 12, c.n + ": va en el renglón del club, a la derecha, con aire (" + Math.round(cr.x0 - cc.x1) + " px)");
    var centro = (cc.x0 + cr.x1) / 2;
    assert(Math.abs(centro - 480) <= 2 && cc.x0 >= 20 && cr.x1 <= 940, c.n + ": el par queda centrado (" + Math.round(centro) + ") y adentro del lienzo");
  });
  /* sin partido recién jugado, el club sigue centrado solo */
  var s0 = A.nueva(); s0.save = A.carreraNueva(); s0.T = W.PampaTemporada; s0.Ma = W.PampaMaster; s0.DIV = A.datos.divisiones;
  s0.vistaTemporada();
  var club0 = textos(s0).filter(function (o) { return o.text === s0.save.club; })[0];
  assert(!!club0 && club0.x === 480 && club0.originX === 0.5, "sin resultado, el club queda centrado como siempre");
  console.log("[3] tabla del Master: ✔/=/✘ en el renglón del club, a la derecha, sin pisar ningún texto");
})();

/* ---------- [4] LA SÚPER DEFENSA SE PUEDE USAR JUGANDO ---------- */
(function () {
  var fs = require("fs"), path = require("path");
  /* a) la lógica pura: la lectura queda bloqueada con su motivo y quien se tira */
  var Dmod = require("../logic/definicion.js");
  assert(typeof Dmod.conSuperDefensa === "function", "SÍNTOMA: logic/definicion.js no tiene conSuperDefensa (la súper defensa no tiene lógica viva)");
  if (typeof Dmod.conSuperDefensa !== "function") return;
  var orig = { bloqueado: false, motivo: "solo_ante_el_arquero", defensoresEnLinea: 0, defensorMasCerca: null, bonusArquero: 7, distanciaRemate: 300 };
  var vos = { nombre: "VOS", esVos: true };
  var l = Dmod.conSuperDefensa(orig, vos);
  assert(l.bloqueado === true && l.superDefensa === true && l.motivo === "super_defensa", "con súper defensa el remate queda bloqueado, con su motivo");
  assert(l.defensorMasCerca === vos && l.defensoresEnLinea === 1, "se tira quien juega, aunque no hubiera nadie en la línea");
  assert(l.bonusArquero === 7 && l.distanciaRemate === 300, "lo demás de la lectura se conserva");
  assert(orig.bloqueado === false && orig.motivo === "solo_ante_el_arquero", "no toca la lectura original");
  assert(Dmod.conSuperDefensa({ defensoresEnLinea: 3 }, null).defensoresEnLinea === 3, "con tres en la línea siguen siendo tres");

  /* b) la escena de verdad (escenas_v9.js sobre el partido de mentira) */
  var tap = null;
  function armar(op) {
    op = op || {};
    var E = PM.escena({ match: VIEJO, logicaAntes: ["phaser/logic/duel.js", "phaser/logic/lectura.js"], logica: ["phaser/logic/definicion.js"], mixins: [process.env.PAMPA_V9_VIEJO || "phaser/scenes/escenas_v9.js", "phaser/scenes/tribuna_ui.js"] });
    var s = conHUD(E);
    tap = E.BAL.legibilidad.tap_min;
    if (op.sinPregunta) E.BAL.envion.super_pregunta = false;
    s.st.posesion = "rival"; s.st.portadorRival = 9; s.estado = "BEAT";
    s.st.envion = op.envion != null ? op.envion : E.BAL.envion.max;
    /* el cine: capas y lo que dibuja (no es lo que se mide) */
    s.cineLayer = s.add.container(); s.cineContent = s.add.container(); s.cineInfo = s.add.container();
    s.cineFX = s.add.graphics(); s.cineLabel = s.add.text(0, 0, "", {}); s.cineBlack = s.add.rectangle(0, 0, 960, 540);
    s.cineFondo = null; s.resetDolly = function () { };
    s.uiCam = { setZoom: function () { }, centerOn: function () { }, flash: function () { }, shake: function () { }, ignore: function () { } };
    s.add.sprite = function (x, y) { var o = s.add.rectangle(x, y, 10, 10); o.setFlipX = function () { return o; }; o.setTexture = function () { return o; }; return o; };
    s.fondoDeCancha = function () { return 183; };
    s.figuraDePlano = function (pose, j, esRival, x, y, alto) { var o = s.add.sprite(x, y); o.pose = pose; o.j = j; o.height = alto; return o; };
    s.placaDePlano = function (x, y, j) { return s.add.text(x, y, j && j.esVos ? "VOS" : (j && j.nombre) || "", {}); };
    E.punch = [];
    s.punch = function (a, b) { E.punch.push(a + " / " + b); };
    ["dollyCine", "pararDolly", "musicaDuck", "lineasVelocidad", "golpeDeCamara", "tribunaSaltando", "hinchadaEstalla", "efectoGol", "poseDePlano"].forEach(function (k) { s[k] = function () { return null; }; });
    /* los dos de la tribuna, hablando (comentar() los dejó a la vista) */
    s._tribuna = { cont: s.add.container(), _irse: { remove: function () { E.tribunaIrse = (E.tribunaIrse | 0) + 1; } } };
    s.cerrarEscena = function (alFinal) { s.estado = "RESOLUCION"; alFinal && alFinal(); if (s.estado === "RESOLUCION") s.estado = "LIBRE"; };
    ["kick", "gloves", "crowd", "net"].forEach(function (k) { s.SFX[k] = function () { }; });
    return E;
  }
  function botonesCine(E) {
    return E.s.cineContent.list.filter(function (o) { return o.type === "Rectangle" && o.input && o.input.enabled && !o.destruido && o.listenerCount("pointerdown") > 0; });
  }
  function textosCine(E) { return E.s.cineContent.list.filter(function (o) { return o.type === "Text" && !o.destruido; }); }
  function correrTodo(E) { for (var k = 0; k < 8 && E.timers.length; k++) E.correrTimers(); }

  /* con el envión lleno, el remate rival PREGUNTA antes de resolverse */
  var E = armar(), s = E.s, max = E.BAL.envion.max;
  s.escenaRemateRival(9);
  assert(s.estado === "SUPERDEF", "SÍNTOMA: con el envión lleno el remate rival no pregunta por la SÚPER DEFENSA (estado " + s.estado + ")");
  assert(s.st.envion === max && s.st.posesion === "rival" && E.punch.length === 0, "mientras pregunta no se resolvió nada (envión " + s.st.envion + ", " + s.st.posesion + ")");
  var espera = E.BAL.envion.super_espera_ms;
  assert(botonesCine(E).length === 0 && E.timers.some(function (t) { return t.ms === espera; }), "los botones responden a los " + espera + " ms (ESPACIO venía apretado)");
  E.tecla("ENTER", {});
  assert(s.estado === "SUPERDEF" && s.st.envion === max, "un ENTER antes de la espera no decide nada");
  E.correrTimers();
  var bs = botonesCine(E), ts = textosCine(E).map(function (t) { return t.text; });
  assert(bs.length === 2, "dos botones: SÚPER DEFENSA y GUARDAR (" + bs.length + ")");
  assert(ts.indexOf("🌟 SÚPER DEFENSA") >= 0 && ts.indexOf("◀ GUARDAR EL ENVIÓN") >= 0, "con ícono y palabra (" + ts.join(" | ") + ")");
  assert(bs.every(function (b) { return b.height >= tap; }), "los botones miden el piso táctil (" + tap + ") de alto");
  var chicos = textosCine(E).filter(function (t) { return parseInt(t.style && t.style.fontSize, 10) < 13; }).map(function (t) { return t.text; });
  assert(chicos.length === 0, "ningún texto de la pregunta baja de 13 px (" + chicos.join(" | ") + ")");
  assert(s._foco && s._foco.vivo && s._foco.i === 0 && /SÚPER DEFENSA/.test(textosCine(E).filter(function (t) { return Math.abs(t.y - (s._foco.items[0].obj.y - 11)) < 1; }).map(function (t) { return t.text; }).join("")),
    "el cursor arranca en la SÚPER DEFENSA");
  /* un toque fuera de los botones no decide (no hay _escSkip ni apuntar en SUPERDEF) */
  assert(!s._escSkip, "en la pregunta un toque suelto no saltea nada");
  assert(s._tribuna.cont.alpha === 0 && E.tribunaIrse === 1, "los dos de la tribuna se callan: sus globos caían sobre la pregunta");
  /* tocar SÚPER DEFENSA: gasta el envión, no es gol, la pelota es tuya */
  var golesAntes = s.st.golesRival;
  E.tocar(bs[0]);
  assert(s.st.envion === 0, "la SÚPER DEFENSA gasta el envión entero (" + s.st.envion + ")");
  assert(s.st.posesion === "mia", "la pelota es tuya después de la súper defensa");
  correrTodo(E);
  assert(E.punch.some(function (p) { return /SÚPER DEFENSA/.test(p); }), "la escena lo dice: " + E.punch.join(" · "));
  assert(s.st.golesRival === golesAntes, "y no es gol");
  assert(s.estado === "LIBRE", "y el partido sigue (" + s.estado + ")");

  /* GUARDAR: el remate de siempre y el envión queda lleno */
  var E2 = armar(), s2 = E2.s;
  s2.escenaRemateRival(9); E2.correrTimers();
  E2.tocar(botonesCine(E2)[1]);
  assert(s2.st.envion === max, "GUARDAR EL ENVIÓN no lo gasta");
  correrTodo(E2);
  assert(!E2.punch.some(function (p) { return /SÚPER DEFENSA/.test(p); }) && E2.punch.length === 1, "y el remate se resuelve como siempre (" + E2.punch.join(" · ") + ")");

  /* con el teclado: ENTER confirma lo que tiene el cursor; la repetición no */
  var E3 = armar(), s3 = E3.s;
  s3.escenaRemateRival(9); E3.correrTimers();
  E3.tecla("ENTER", { repeat: true });
  assert(s3.estado === "SUPERDEF", "ENTER sostenido no decide");
  E3.tecla("ENTER", {});
  assert(s3.st.envion === 0 && s3.st.posesion === "mia", "ENTER elige la SÚPER DEFENSA");

  /* 200 remates con súper defensa: ninguno entra */
  var goles = 0;
  for (var k = 0; k < 200; k++) {
    var Ek = armar(), sk = Ek.s;
    sk.escenaRemateRival(9); Ek.correrTimers(); Ek.tocar(botonesCine(Ek)[0]); correrTodo(Ek);
    if (sk.st.golesRival > 0) goles++;
  }
  assert(goles === 0, "con súper defensa no entra ninguno de 200 remates (" + goles + ")");

  /* sin el envión lleno, o con la pregunta apagada, no pregunta */
  var E4 = armar({ envion: max - 1 });
  E4.s.escenaRemateRival(9);
  assert(E4.s.estado === "ESCENA" && botonesCine(E4).length === 0, "sin el envión lleno no hay pregunta (" + E4.s.estado + ")");
  var E5 = armar({ sinPregunta: true });
  E5.s.escenaRemateRival(9);
  assert(E5.s.estado === "ESCENA" && E5.s.st.envion === max, "con balance.envion.super_pregunta en false no hay pregunta");

  /* la pregunta espera a quien juega: el vigía de SEGUIR IGUAL no la cuenta como trabada */
  var HTML = fs.readFileSync(path.join(PM.RAIZ, "phaser/index.html"), "utf8");
  assert(/var ESPERAN = \{[^}]*SUPERDEF: 1/.test(HTML), "index.html: SUPERDEF está entre los estados que esperan a quien juega (ESPERAN)");
  console.log("[4] súper defensa: con el envión lleno el remate pregunta; SÍ gasta y bloquea (0 goles en 200), GUARDAR no gasta");
})();

/* ---------- [5] LA COMPUERTA DE LA INTRO NO SE PISA A 800x360 ---------- */
(function () {
  var fs = require("fs"), path = require("path"), vm = require("vm");
  var BAL = JSON.parse(PM.leer("phaser/data/balance.json"));
  var W = { PF: { texto: "Pixelify Sans", display: "Pixelify Sans" } };
  var ctx = { window: W, Phaser: { Scene: function () { } }, console: console, Math: Math };
  vm.createContext(ctx);
  vm.runInContext(PM.leer(process.env.PAMPA_INTRO_VIEJO || "phaser/scenes/intro.js"), ctx, { filename: "intro.js" });
  /* EL LOGO, MEDIDO: pampa-star-logo.webp es de 2400x2200 y su dibujo (alfa
     > 16, leído con getImageData en el navegador) ocupa las filas 22 a 2115 */
  var LOGO = { w: 2400, h: 2200, fila0: 22, fila1: 2115 };
  /* el alto de los textos, medido en el navegador: Pixelify 15 px = 19,1 y
     12 px = 13 (Text.height). Acá va un poco más generoso: 1,3 x tamaño */
  function correr(tactil) {
    var s = Object.create(W.PampaIntro.prototype), objs = [], tweens = [];
    s.I = BAL.intro;
    s.textures = { exists: function (k) { return k === "d_logo"; } };
    function obj(tipo, x, y) {
      var o = { type: tipo, x: x, y: y, originX: 0.5, originY: 0.5, scale: 1 };
      o.setOrigin = function (a, b) { o.originX = a; o.originY = b == null ? a : b; return o; };
      o.setScale = function (k) { o.scale = k; return o; };
      objs.push(o); return o;
    }
    s.add = {
      image: function (x, y, k) { var o = obj("Image", x, y); o.key = k; o.width = LOGO.w; o.height = LOGO.h; return o; },
      text: function (x, y, t, st) { var o = obj("Text", x, y); o.text = t; o.height = (parseInt(st.fontSize, 10) || 12) * 1.3; return o; }
    };
    s.capa = { add: function () { } };
    s.tweens = { add: function (c) { tweens.push(c); return c; } };
    s.input = { once: function () { }, keyboard: { once: function () { } } };
    s.sys = { game: { device: { input: { touch: !!tactil } } } };
    s.compuerta();
    return { objs: objs, tweens: tweens };
  }
  var R = correr(false);
  var logo = R.objs.filter(function (o) { return o.type === "Image"; })[0];
  var toca = R.objs.filter(function (o) { return /TOCÁ PARA EMPEZAR/.test(o.text); })[0];
  var tecla = R.objs.filter(function (o) { return /cualquier tecla/.test(o.text); })[0];
  assert(!!logo && !!toca && !!tecla, "la compuerta tiene logo, TOCÁ PARA EMPEZAR y el renglón del teclado");
  if (!logo || !toca || !tecla) return;
  var top = logo.y - LOGO.h * logo.scale * logo.originY;
  var dib0 = top + LOGO.fila0 * logo.scale, dib1 = top + LOGO.fila1 * logo.scale;
  var pulso = (R.tweens.filter(function (t) { return t.targets === toca; })[0] || {}).scale || 1;
  var t0 = toca.y - toca.height * pulso / 2, t1 = toca.y + toca.height * pulso / 2;
  var k0 = tecla.y - tecla.height / 2, k1 = tecla.y + tecla.height / 2;
  assert(dib0 >= 0, "el dibujo del logo no se sale por arriba (arranca en y=" + Math.round(dib0) + ")");
  assert(dib1 + 8 <= t0, "SÍNTOMA: el dibujo del logo (hasta y=" + Math.round(dib1) + ") pisa 'TOCÁ PARA EMPEZAR' (desde y=" + Math.round(t0) + ", latiendo al " + pulso + ")");
  assert(t1 <= k0, "'TOCÁ PARA EMPEZAR' (hasta " + Math.round(t1) + ") no pisa el renglón del teclado (desde " + Math.round(k0) + ")");
  /* EL AVISO DEL ATRÁS: DOM, abajo de todo. Su borde de abajo sale del CSS;
     el alto (50) se midió con getBoundingClientRect a 800x360 (18 px de letra
     fija, más relleno y borde: no escala con el lienzo) */
  var HTML = fs.readFileSync(path.join(PM.RAIZ, "phaser/index.html"), "utf8");
  var m = /#atras-aviso\{[^}]*bottom:(\d+)px/.exec(HTML);
  assert(!!m, "index.html: el aviso del atrás tiene su bottom en px");
  var abajo = m ? +m[1] : 18, ALTO_AVISO = 50;
  var techo = Infinity, donde = "";
  [[800, 360], [640, 360], [568, 320], [844, 390], [960, 540]].forEach(function (v) {
    var k = Math.min(v[0] / 960, v[1] / 540), off = (v[1] - 540 * k) / 2;
    var yJuego = (v[1] - abajo - ALTO_AVISO - off) / k;
    if (yJuego < techo) { techo = yJuego; donde = v.join("x"); }
  });
  assert(k1 <= techo, "SÍNTOMA: el renglón del teclado (hasta y=" + Math.round(k1) + ") queda debajo del aviso del atrás, que a " + donde + " arranca en y=" + Math.round(techo));
  assert(t1 <= techo, "'TOCÁ PARA EMPEZAR' queda arriba del aviso del atrás (" + Math.round(t1) + " ≤ " + Math.round(techo) + ")");
  /* en el teléfono no hay renglón de teclado, y lo demás queda igual */
  var RT = correr(true);
  assert(!RT.objs.some(function (o) { return /cualquier tecla/.test(o.text || ""); }), "en el teléfono no sale el renglón del teclado");
  console.log("[5] compuerta: dibujo del logo " + Math.round(dib0) + "→" + Math.round(dib1) + " · TOCÁ " + Math.round(t0) + "→" + Math.round(t1) +
    " · teclado " + Math.round(k0) + "→" + Math.round(k1) + " · el aviso del atrás arranca en " + Math.round(techo) + " (" + donde + ")");
})();

/* ---------- [6] EL PUENTE CON EL CLÁSICO NO TAPA EL RESULTADO ---------- */
(function () {
  function caja(o) { return { x0: o.x - o.width / 2, x1: o.x + o.width / 2, y0: o.y - o.height / 2, y1: o.y + o.height / 2 }; }
  function cruzan(a, b) { return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1; }
  [{ n: "partido pedido por el clásico", o: { pedido: true }, cuantos: 3 }, { n: "amistoso", o: {}, cuantos: 2 }].forEach(function (c) {
    var E = PM.escena(Object.assign({ match: VIEJO }, c.o)), s = E.s;
    s.st.golesMio = 2; s.st.golesRival = 1;
    s.finDelPartido(); E.correrTimers();
    var franja = s.menuLayer.list.filter(function (o) { return o.type === "Rectangle" && o.width === 960 && o.height === 86; })[0];
    assert(!!franja, c.n + ": la franja del resultado está (960x86)");
    if (!franja) return;
    var cf = caja(franja), bs = E.botones();
    assert(bs.length === c.cuantos, c.n + ": " + c.cuantos + " salidas (" + bs.length + ")");
    bs.forEach(function (b) {
      assert(!cruzan(caja(b), cf), "SÍNTOMA: " + c.n + ": el botón '" + E.textoCerca(b) + "' (y " + caja(b).y0 + "→" + caja(b).y1 + ") tapa la franja del resultado (" + cf.y0 + "→" + cf.y1 + ")");
      assert(caja(b).x0 >= 0 && caja(b).x1 <= 960 && b.height >= E.BAL.legibilidad.tap_min, c.n + ": '" + E.textoCerca(b) + "' entra en el lienzo y mide el piso táctil de alto");
    });
    for (var i = 0; i < bs.length; i++) for (var j = i + 1; j < bs.length; j++) {
      assert(!cruzan(caja(bs[i]), caja(bs[j])), c.n + ": los botones no se pisan entre ellos");
    }
    /* los textos de las salidas, a 13 px o más (criterio 8 de terminado) */
    var chicos = s.menuLayer.list.filter(function (o) {
      return o.type === "Text" && /VOLVER|APLICAR|OTRO PARTIDO/.test(o.text) && parseInt(o.style.fontSize, 10) < 13;
    }).map(function (o) { return o.text + " " + o.style.fontSize; });
    assert(chicos.length === 0, c.n + ": las salidas a 13 px o más (" + chicos.join(" | ") + ")");
    if (c.o.pedido) assert(/APLICAR/.test(E.textoCerca(s._foco.items[0].obj)), "el cursor arranca en APLICAR Y VOLVER A LA CARRERA");
  });
  console.log("[6] final del puente con el clásico: APLICAR en la fila de abajo, a 13 px, sin tapar la franja del resultado");
})();

if (mal) { console.log("\n✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
console.log("\n✓ deudas de la ola 1: " + ok + " asserts");
process.exit(0);
