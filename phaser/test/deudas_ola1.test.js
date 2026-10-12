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
  return { nombre: (rival ? "R" : "M") + i, numero: i + 1, x: 400, y: 300, aguante: 800, pos: i === 0 ? "ARQ" : "VOL",
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

if (mal) { console.log("\n✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
console.log("\n✓ deudas de la ola 1: " + ok + " asserts");
process.exit(0);
