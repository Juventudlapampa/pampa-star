/* ============================================================================
   PAMPA STAR · C4 — LAS SECUENCIAS TIENEN QUIÉN SE LAS PIDA

   El hallazgo: la MEGACORRIDA (V6 §3.4) estaba implementada ENTERA —
   `secuenciaMegacorrida()` con sus dos escenas, y su rama en
   `secuenciaDisponible()` calculando nivel y aguante— pero no se podía ver
   jugando: el único llamador de `secuenciaDisponible()` preguntaba solo por
   "combinada". Una función declarada hecha que Rodri nunca pudo ver.

   No era código muerto para borrar: era un CABLE SUELTO. Esa diferencia es el
   punto de este test. Un método de secuencia sin llamador es una promesa
   incumplida, no basura.

   Lo que se guarda acá:
     [1] cada tipo que `secuenciaDisponible` sabe contestar tiene alguien que
         se lo pide (si mañana se agrega un tipo y no se cablea, esto falla)
     [2] cada `secuenciaX()` que existe tiene un llamador
     [3] las perillas de balance de cada secuencia siguen estando
     [4] las claves que se borraron en C4 NO están ni en el balance ni en el
         fallback embebido de index.html — que es la copia que se olvida

   Corré:  node phaser/test/c4_secuencias.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var MATCH = fs.readFileSync(path.join(RAIZ, "phaser/scenes/match.js"), "utf8");
var HTML = fs.readFileSync(path.join(RAIZ, "phaser/index.html"), "utf8");
var BAL = JSON.parse(fs.readFileSync(path.join(RAIZ, "phaser/data/balance.json"), "utf8"));

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* ---------- [1] CADA TIPO QUE LA FUNCIÓN CONTESTA, ALGUIEN LO PIDE ---------- */
(function () {
  /* los tipos que secuenciaDisponible sabe distinguir salen de sus comparaciones */
  var cuerpo = MATCH.slice(MATCH.indexOf("secuenciaDisponible(tipo)"));
  cuerpo = cuerpo.slice(0, cuerpo.indexOf("\n  }") + 4);
  var tipos = {};
  (cuerpo.match(/tipo\s*===\s*"([a-z_]+)"/g) || []).forEach(function (m) {
    tipos[m.match(/"([a-z_]+)"/)[1]] = true;
  });
  /* la rama que cae por defecto (el else final) es la combinada */
  if (/combinada_aguante/.test(cuerpo)) tipos.combinada = true;
  assert(Object.keys(tipos).length >= 2,
    "secuenciaDisponible tiene que distinguir al menos megacorrida y combinada (encontré " + Object.keys(tipos).join(",") + ")");

  /* quién los pide: todas las llamadas del archivo, menos la definición */
  var pedidos = {};
  (MATCH.match(/secuenciaDisponible\(\s*"([a-z_]+)"\s*\)/g) || []).forEach(function (m) {
    pedidos[m.match(/"([a-z_]+)"/)[1]] = true;
  });

  Object.keys(tipos).forEach(function (t) {
    assert(pedidos[t] === true,
      "el tipo '" + t + "' lo sabe contestar secuenciaDisponible pero NADIE se lo pide: " +
      "está implementado y no se puede ver jugando");
  });
  console.log("[1] tipos que contesta: " + Object.keys(tipos).join(", ") +
    " · tipos que alguien pide: " + Object.keys(pedidos).join(", "));
})();

/* ---------- [2] CADA secuenciaX() TIENE LLAMADOR ---------- */
(function () {
  var defs = (MATCH.match(/^\s{2}(secuencia[A-Z][A-Za-z]*)\(/gm) || []).map(function (m) {
    return m.trim().replace("(", "");
  }).filter(function (n) { return n !== "secuenciaDisponible"; });
  assert(defs.length >= 2, "tienen que existir al menos dos secuencias (hay " + defs.length + ")");
  defs.forEach(function (n) {
    /* llamadas: this.secuenciaX(  — descontando la definición */
    var llamadas = (MATCH.match(new RegExp("this\\." + n + "\\s*\\(", "g")) || []).length;
    assert(llamadas > 0,
      n + "() existe pero no la llama nadie — es una secuencia que el jugador no puede alcanzar");
  });
  console.log("[2] secuencias con llamador: " + defs.join(", "));
})();

/* ---------- [3] LAS PERILLAS DE CADA SECUENCIA SIGUEN AHÍ ---------- */
(function () {
  var S = BAL.secuencias || {};
  ["megacorrida_nivel", "megacorrida_aguante", "megacorrida_rivales",
    "combinada_nivel", "combinada_aguante"].forEach(function (k) {
      assert(typeof S[k] === "number",
        "balance.secuencias." + k + " tiene que existir y ser número (dio " + S[k] + ")");
    });
  console.log("[3] megacorrida: nivel " + S.megacorrida_nivel + " · " + S.megacorrida_aguante +
    " aguante · " + S.megacorrida_rivales + " rivales que quedan atrás");
})();

/* ---------- [4] LO BORRADO EN C4 NO VOLVIÓ, NI ACÁ NI EN EL FALLBACK ---------- */
(function () {
  /* el fallback embebido de index.html es una COPIA del balance escrita en
     literal JS: borrar del .json y olvidarse de acá deja la perilla viva en el
     modo sin server, que es el que corre en GitHub Pages si falla el fetch */
  var BORRADAS = ["zoom_encuentro", "zoom_encuentro_ms", "panel_escena_frac",
    "jugadores_por_lado", "tiro_lejos_desde", "tiro_lejos_penal", "shot_power",
    "sens_arrastre", "sens_comba", "tecla_paso", "tecla_osc_ms",
    "vel_avance_auto", "zona_remate_y", "barra_periodo_ms", "barra_zona_normal"];
  var txtBal = JSON.stringify(BAL);
  BORRADAS.forEach(function (k) {
    assert(txtBal.indexOf('"' + k + '"') < 0, "balance.json no puede tener '" + k + "': se borró en C3/C4");
    assert(!new RegExp("\\b" + k + "\\s*:").test(HTML),
      "el BALANCE_FALLBACK de index.html tampoco puede tener '" + k + "' (si no, revive sin server)");
  });
  /* y el comentario del bloque partido no puede seguir documentando lo borrado */
  var com = (BAL.partido && BAL.partido.comentario) || "";
  assert(!/pasando esa distancia el tiro NORMAL pierde fuerza/.test(com),
    "partido.comentario no puede seguir explicando tiro_lejos_*, que ya no existe");
  console.log("[4] las " + BORRADAS.length + " claves borradas no están ni en balance.json ni en el fallback");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
