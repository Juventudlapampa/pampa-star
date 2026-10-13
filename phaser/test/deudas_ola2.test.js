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

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
