/* PAMPA STAR · los detalles chicos de la ola 3 (L12)
   [1] El freno del corte (bloque B) le pasaba los ms medidos a hitstop, que
       solo entendía "gol", "fuerte" o "chico": con un número caía en el chico
       y congelaba 40 ms en vez de 90, o de 144 en el tiro.
   [2] El porqué del desenlace de tu remate (atajada, palo, afuera) se veía
       625 ms (388 en RÁPIDA) antes del negro: ahora sigue como aviso.
   node phaser/test/detalles_ola3.test.js */
"use strict";
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..", "..");
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), "utf8");
const BAL = JSON.parse(leer("phaser/data/balance.json"));
let ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("✗ " + m); } }

/* ---------- [1] hitstop acepta ms ---------- */
(function () {
  const win = { setTimeout: () => 0 };
  new Function("window", "module", leer("phaser/scenes/feel_ui.js"))(win, { exports: {} });
  const PERSP = require(path.join(RAIZ, "phaser/logic/perspectiva.js"));
  const escena = () => ({ BAL, time: { timeScale: 1 }, tweens: { timeScale: 1 } });
  const k = (BAL.oficio && BAL.oficio.intensidad != null) ? BAL.oficio.intensidad : 1;
  const msTiro = PERSP.frenoDelCorte("tiro", (BAL.vista && BAL.vista.profundo) || {});
  assert(msTiro === 144, "el freno del corte del tiro mide 144 con el balance de hoy (" + msTiro + ")");
  assert(win.PampaFeel.hitstop(escena(), msTiro) === Math.round(msTiro * k), "hitstop con " + msTiro + " ms congela " + Math.round(msTiro * k) + " (no 40)");
  assert(win.PampaFeel.hitstop(escena(), 90) === Math.round(90 * k), "hitstop con 90 ms congela 90");
  const C = win.PampaFeel.cfg(escena());
  assert(win.PampaFeel.hitstop(escena(), "fuerte") === Math.round(C.hit_fuerte * k), "con la palabra sigue igual: fuerte");
  assert(win.PampaFeel.hitstop(escena(), 144, 1) === 0, "el escalón 1 no se congela");
  const M = leer("phaser/scenes/match.js");
  assert(/PampaFeel\.hitstop\(this, ms\)/.test(M), "el freno del corte le pasa los ms a hitstop");
})();

/* ---------- [2] el porqué del desenlace queda como aviso ---------- */
(function () {
  const M = leer("phaser/scenes/match.js").replace(/\r\n/g, "\n");
  const i = M.indexOf("else if (res.outcome !== \"gol\") luego(this.msV(C.desenlace_hold_ms)");
  const tramo = i >= 0 ? M.slice(i, i + 420) : "";
  assert(i >= 0, "el desenlace de tu remate que no es gol sale por salirCine");
  assert(/const sub = this\.cineSub && this\.cineSub\.text/.test(tramo) && /this\.salirCine\(\);\s*if \(sub\) this\.avisar\(sub/.test(tramo),
    "el sub del desenlace se lee antes de salir del cine y sigue como aviso");
  const A = (BAL.avisos || {});
  assert((A.hold_ms != null ? A.hold_ms : 2200) >= 2000, "el aviso se queda al menos 2 s (" + (A.hold_ms || 2200) + ")");
})();

console.log((mal ? "✗" : "✓") + " detalles de la ola 3: " + ok + " ok, " + mal + " mal");
process.exit(mal ? 1 : 0);
