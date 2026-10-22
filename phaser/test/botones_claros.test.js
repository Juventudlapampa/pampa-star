/* ============================================================================
   PAMPA STAR · POCOS BOTONES Y CADA UNO CON PALABRA (pedido de Rodri del
   17/oct: "un juego CLARO")

   Lo que había en juego libre, medido en el navegador contra Espejo de Sal:
     · ⚡ ACCIÓN, siempre a la vista. En defensa no hacía nada
       (onBotonAccion solo abre la cruz de ataque).
     · 🌟 POTENCIAR, un botón suelto del HUD con el envión lleno y la pelota.
     · ⇄ OTRO, en defensa: cambia el jugador que marca. "OTRO" no decía qué.
     · 🔊, un ícono sin palabra. El sonido ya estaba en la PAUSA con la suya.
     · en la cruz de defensa, NO MOVERSE adentro de ★ ESPECIAL, así que
       ESPECIAL aparecía siempre; y el ✕ de seguir corriendo era un ícono.

   Lo que fija este test, con abrirMenuAtaque, abrirMenuDefensa y
   refrescarHUD de verdad:
     [1] defensa: NO MOVERSE es el ✕ de abajo, con su palabra, y sale con
         ESC; ★ ESPECIAL no lo tiene y no aparece si no hay nada especial
     [2] ataque: con el envión lleno, POTENCIAR está en ★ ESPECIAL; usarlo
         gasta el envión y vuelve a la cruz; sin envión lleno no está
     La poda pedida por Rodri el 22/oct apaga las megadefensas y el envión
     (balance.flags): [1] y [2] fijan primero que no están y después que su
     perilla los vuelve a prender, con las comprobaciones de siempre.
     [3] ataque sin rival: el ✕ dice SEGUIR; con rival no hay ✕
     [4] el HUD: ⚡ ACCIÓN solo con la pelota; no queda el botón suelto del
         envión ni el 🔊; el ⇄ dice qué hace

   Corré:  node phaser/test/botones_claros.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var PM = require("./_partido_de_mentira.js");
var BAL = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "balance.json"), "utf8"));
var MATCH = fs.readFileSync(path.join(__dirname, "..", "scenes", "match.js"), "utf8");

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

function escena() {
  var E = PM.escena({
    logicaAntes: ["phaser/logic/duel.js", "phaser/logic/lectura.js"],
    logica: ["phaser/logic/cartas.js", "phaser/logic/jugadon.js", "phaser/logic/piel.js"],
    mixins: ["phaser/scenes/cartas_ui.js", "phaser/scenes/jugadon_ui.js", "phaser/scenes/toque_ui.js"]   // 20/oct: el rótulo del TIRO pregunta toqueEnArea
  });
  var s = E.s;
  E.W.PF = { texto: BAL.tipografia.texto, display: BAL.tipografia.display };
  E.W.Phaser.Math = { Clamp: function (v, a, b) { return Math.max(a, Math.min(b, v)); } };
  s.add.image = function (x, y) { var o = s.add.rectangle(x, y, 132, 132); o.type = "Image"; return o; };
  s.retratoKey = function () { return "retrato"; };
  s.materializarDuelo = function () { };
  s.hayEscenas = function () { return true; };
  s.cameras.main.ignore = function () { };
  s.noMoverse = 0;
  s.resolverNoMoverse = function () { this.noMoverse++; };
  s.SFX.festejo = function () { };
  return E;
}
function vivos(s, tipo) { return s.menuLayer.list.filter(function (o) { return o.type === tipo && !o.destruido; }); }
function hayTexto(s, t) { return vivos(s, "Text").some(function (o) { return o.text === t; }); }
var CZ = BAL.legibilidad.cruz;
function centro(s) {
  return vivos(s, "Rectangle").filter(function (o) { return o.input && o.input.enabled && o.x === CZ.C[0] && o.y === CZ.C[1]; })[0];
}
function defensa(s, nivel, aguante) {
  var st = s.st, i = st.mios.findIndex(function (j) { return j.pos === "DEF"; });
  st.ctrl = i; st.posesion = "rival"; st.portadorRival = 9; st.mios[i].aguante = aguante; st.aguanteRival = 1000;
  s._nivelCarrera = nivel;
  s.abrirMenuDefensa();
}
function ataque(s, rivalIdx, libre) {
  var st = s.st, i = st.mios.findIndex(function (j) { return j.pos === "ATA"; });
  st.ctrl = i; st.posesion = "mia"; st.mios[i].esVos = true; st.mios[i].aguante = 1000; st.mios[i].x = 900;
  s._nivelCarrera = 1;
  s.abrirMenuAtaque(rivalIdx, libre);
}

/* ---------- [1] defensa ---------- */
(function () {
  var E = escena(), s = E.s;
  defensa(s, 5, 1000);
  var S = s._menuOps.S;
  assert(S && S.texto === "✕ NO MOVERSE", "[1] abajo de la cruz de defensa va ✕ NO MOVERSE");
  assert(S && /aguante/.test(S.sub), "[1] y dice cuánto aguante recuperás");
  E.tocar(s._menuBtns.S);
  assert(s.noMoverse === 1, "[1] tocarlo es NO MOVERSE");
  defensa(s, 5, 1000);
  s._menuVolver();
  assert(s.noMoverse === 2, "[1] ESC (volver) también es NO MOVERSE, como seguir corriendo en ataque");
  defensa(s, 5, 1000);
  assert(!centro(s) && !hayTexto(s, "★ ESPECIAL"), "[1] poda 22/oct: con balance.flags.megadefensas y jugadon en false, a nivel 5 la cruz de defensa no tiene centro");
  /* las perillas los vuelven a prender; este partido de mentira no trae la
     data de las megadefensas, así que lo que aparece es el SÚPER QUITE */
  s.FLAGS.megadefensas = true; s.FLAGS.jugadon = true;
  defensa(s, 5, 1000);
  assert(!!centro(s), "[1] nivel 5: hay megadefensas, aparece ★ ESPECIAL");
  E.tocar(centro(s));
  assert(!vivos(s, "Text").some(function (o) { return /NO MOVERSE/.test(o.text); }), "[1] ★ ESPECIAL ya no tiene NO MOVERSE");
  var E2 = escena(), s2 = E2.s;
  s2.jugadonFichas = function () { return { tiros: 0, gambetas: 0, quites: 0 }; };
  defensa(s2, 1, 30);
  assert(!centro(s2), "[1] sin nada especial para usar, ★ ESPECIAL no aparece");
  console.log("[1] defensa: ✕ NO MOVERSE abajo y con ESC; ESPECIAL solo si hay algo");
})();

/* ---------- [2] el envión, adentro de ★ ESPECIAL ---------- */
(function () {
  var E0 = escena(), s0 = E0.s;
  s0.MEGA = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "data", "megacosas.json"), "utf8"));
  s0.st.envion = BAL.envion.max;
  ataque(s0, 1, false);
  assert(!hayTexto(s0, "🌟 POTENCIAR") && !hayTexto(s0, "★ ESPECIAL"), "[2] poda 22/oct: con balance.flags.envion en false no hay POTENCIAR ni ★ ESPECIAL, aunque el envión venga cargado");
  assert(hayTexto(s0, "★ SÚPER TIRO"), "[2] poda 22/oct: el centro de la cruz es el SÚPER TIRO solo");
  var E = escena(), s = E.s;
  s.BAL.flags.envion = true;   // la perilla lo vuelve a prender
  s.st.envion = BAL.envion.max;
  ataque(s, 1, false);
  assert(!!centro(s), "[2] con el envión lleno hay ★ ESPECIAL");
  E.tocar(centro(s));
  var pot = vivos(s, "Rectangle").filter(function (o) {
    return o.input && o.input.enabled && vivos(s, "Text").some(function (t) { return t.text === "🌟 POTENCIAR" && Math.abs(t.x - o.x) < 2 && Math.abs(t.y - o.y) < 12; });
  })[0];
  assert(!!pot, "[2] POTENCIAR está en la grilla de ★ ESPECIAL");
  E.tocar(pot);
  assert(s.st.envion === 0 && E.W.PampaPartido.envionActivo(s.st), "[2] usarlo gasta el envión y enciende al equipo");
  assert(s.estado === "MENU" && s._menuOps.N && s._menuOps.N.texto === "⚡ GAMBETA", "[2] y vuelve a la cruz para elegir la jugada");
  var E2 = escena(), s2 = E2.s;
  s2.BAL.flags.envion = true;
  s2.st.envion = BAL.envion.max - 1;
  ataque(s2, 1, false);
  /* con un solo especial el centro es ese botón (el SÚPER TIRO) y tocarlo
     patea: la grilla se abre solo si el centro es ★ ESPECIAL */
  if (centro(s2) && hayTexto(s2, "★ ESPECIAL")) E2.tocar(centro(s2));
  assert(!hayTexto(s2, "🌟 POTENCIAR"), "[2] sin el envión lleno no se ofrece");
  console.log("[2] POTENCIAR vive en ★ ESPECIAL y vuelve a la cruz");
})();

/* ---------- [3] el ✕ de ataque ---------- */
(function () {
  var E = escena(), s = E.s;
  ataque(s, null, true);
  assert(hayTexto(s, "✕ SEGUIR") && hayTexto(s, "corriendo"), "[3] sin rival, el ✕ dice SEGUIR corriendo");
  ataque(s, 1, false);
  assert(!hayTexto(s, "✕ SEGUIR"), "[3] con rival encima no hay ✕ (no hay corrida que seguir)");
  console.log("[3] el ✕ de ataque tiene palabra");
})();

/* ---------- [4] el HUD ---------- */
(function () {
  var hud = MATCH.slice(MATCH.indexOf("  refrescarHUD("));
  hud = hud.slice(0, hud.indexOf("\n  }\n"));
  assert(/const verAccion = !conMenu && st\.posesion === "mia";/.test(hud) && /this\._btnAccionCont\.setVisible\(verAccion\)/.test(hud),
    "[4] ⚡ ACCIÓN se ve solo con la pelota");
  assert(!/_btnEnvion/.test(MATCH), "[4] no queda el botón suelto del envión");
  assert(!/_muteTxt/.test(MATCH), "[4] no queda el 🔊 suelto de la barra");
  assert(/"⇄ MARCAR CON OTRO"/.test(MATCH) && !/"⇄ OTRO"/.test(MATCH), "[4] el ⇄ dice qué hace");
  console.log("[4] HUD: ACCIÓN solo en ataque, sin envión suelto ni 🔊, ⇄ con palabra");
})();

console.log(mal === 0 ? "\nTODOS OK: " + ok + " asserts, 0 fallaron." : "\n" + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
