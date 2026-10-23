/* PAMPA STAR · el tutorial en contexto (ola 3, L13): cada cosa una vez, en
   su momento (logic/tutorial.js), y la escena del partido que lo usa.
   node phaser/test/tutorial.test.js */
"use strict";
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..", "..");
const T = require(path.join(RAIZ, "phaser/logic/tutorial.js"));
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), "utf8").replace(/\r\n/g, "\n");
let ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("✗ " + m); } }

/* ---------- [1] los disparadores ---------- */
(function () {
  const v0 = {};
  const libre = T.cartel("libre", v0, { tactil: false, split: true });
  assert(libre && libre.id === "libre", "al arrancar el primer partido toca la tarjeta de LIBRE");
  assert(/MAPA, el círculo es tu equipo y el triángulo, el rival/.test(libre.texto), "con la leyenda del MAPA, en palabras (" + libre.texto + ")");
  assert(/ESPACIO/.test(libre.texto) && /flechas/.test(libre.texto), "en la PC nombra las teclas");
  const tel = T.cartel("libre", v0, { tactil: true, split: true });
  assert(!/ESPACIO|WASD|ENTER|MOUSE|clic/.test(tel.texto) && /DEDO/.test(tel.texto), "en el teléfono, ni teclas ni mouse (" + tel.texto + ")");
  assert(tel.texto.split("\n").length === 3, "una sola tarjeta de tres renglones: mover, ACCIÓN y la leyenda");
  /* revisión final del 23/oct: con el flujo prendido seguía enseñando a arrastrar */
  const fPC = T.cartel("libre", v0, { tactil: false, split: true, flujo: true }), fTel = T.cartel("libre", v0, { tactil: true, split: true, flujo: true });
  [fPC, fTel].forEach(function (f) {
    assert(/avanza SOLO/.test(f.texto) && /el pase, el centro o el tiro/.test(f.texto) && !/Movés con/.test(f.texto) && f.texto.split("\n").length === 3,
      "con el flujo dice que avanza solo y que lo tuyo es decidir (" + f.texto + ")");
  });
  assert(/ESPACIO/.test(fPC.texto) && /flechas/.test(fPC.texto) && !/ESPACIO|WASD|MOUSE|clic/.test(fTel.texto) && /DEDO/.test(fTel.texto), "con el flujo, teclas en la PC y dedo en el teléfono");

  const d = T.cartel("menu_ataque", v0, { rival: "Dylan", sinAguante: true });
  assert(d && d.id === "duelo" && /DYLAN te sale al cruce/.test(d.texto) && /en secreto/.test(d.texto) && /si adivina tu jugada, te la saca/.test(d.texto),
    "el primer cruce con la pelota explica la elección secreta (" + (d && d.texto) + ")");
  assert(T.cartel("menu_ataque", v0, { rival: null, sinAguante: false }) === null, "un menú sin cruce y con aguante no dice nada");
  const dd = T.cartel("menu_defensa", v0, { rival: "Espejo de Sal" });
  assert(dd && dd.id === "duelo_def" && /si adivinás su jugada, se la sacás/.test(dd.texto), "el primer cruce defendiendo, en voseo (" + (dd && dd.texto) + ")");

  const conDuelo = T.marcar(v0, "duelo");
  const sa = T.cartel("menu_ataque", conDuelo, { rival: "Dylan", sinAguante: true });
  assert(sa && sa.id === "sin_aguante" && /^SIN AGUANTE: /.test(sa.texto) && /PASE/.test(sa.texto), "visto el duelo, la primera jugada SIN AGUANTE se explica (" + (sa && sa.texto) + ")");
  const saDef = T.cartel("menu_defensa", T.marcar(conDuelo, "duelo_def"), { rival: "X", sinAguante: true });
  assert(saDef && saDef.id === "sin_aguante" && /marca/.test(saDef.texto), "también defendiendo, con su texto");
  assert(T.cartel("toque", v0, {}).id === "toque", "el primer EL TOQUE pide la consigna larga");
})();

/* ---------- [2] una sola vez ---------- */
(function () {
  let v = {};
  ["libre", "duelo", "duelo_def", "sin_aguante", "toque"].forEach(id => { v = T.marcar(v, id); });
  assert(T.cartel("libre", v, {}) === null, "la tarjeta de LIBRE no vuelve");
  assert(T.cartel("menu_ataque", v, { rival: "Dylan", sinAguante: true }) === null, "ni el duelo ni SIN AGUANTE");
  assert(T.cartel("menu_defensa", v, { rival: "X", sinAguante: true }) === null, "ni el duelo defendiendo");
  assert(T.cartel("toque", v, {}) === null, "ni la consigna larga de EL TOQUE");
  const guardado = JSON.stringify(v);
  assert(JSON.stringify(T.leerVistos(guardado)) === guardado, "lo visto se guarda y se lee igual");
  assert(JSON.stringify(T.leerVistos(null)) === "{}" && JSON.stringify(T.leerVistos("{roto")) === "{}" && JSON.stringify(T.leerVistos('{"x":true,"libre":1}')) === "{}",
    "lo guardado vacío, roto o ajeno se lee como nada visto");
  assert(Object.keys(T.marcar({}, "inventado")).length === 0, "un id que no existe no se guarda");
})();

/* ---------- [3] la escena lo usa ---------- */
(function () {
  const M = leer("phaser/scenes/match.js"), TQ = leer("phaser/scenes/toque_ui.js"), H = leer("phaser/index.html"), SW = leer("phaser/sw.js");
  assert(/<script src="logic\/tutorial\.js"><\/script>/.test(H) && /"\.\/logic\/tutorial\.js"/.test(SW), "index.html carga logic/tutorial.js y el service worker lo guarda");
  assert(/cartelTutorial\("menu_ataque"/.test(M) && /cartelTutorial\("menu_defensa"/.test(M), "los dos menús de cruce piden su cartel");
  assert(/titulo: tut \? tut\.texto : rival \?/.test(M) && /titulo: tut \? tut\.texto : "¡" \+ this\.nombreRival/.test(M), "y el cartel va en el título, donde se decide");
  assert(/cartelTutorial\("toque"/.test(TQ) && !/toqueExplicado/.test(TQ), "EL TOQUE usa lo guardado, no la marca de la sesión");
  const i = M.indexOf("  tutorialSiHaceFalta() {"), cuerpo = M.slice(i, M.indexOf("\n  }\n", i));
  assert(/PampaTutorial\.cartel\("libre"/.test(cuerpo) && !/1\/3|2\/3|3\/3/.test(cuerpo), "la tarjeta del arranque sale de tutorial.js y ya no numera pasos");
  assert(/keydown-ENTER/.test(cuerpo) && /keydown-SPACE/.test(cuerpo) && /time\.now - desde < 300/.test(cuerpo), "se cierra con ENTER o ESPACIO, con antirrebote");
  assert(/marcarTutorial\("libre"\)/.test(cuerpo), "y al cerrarla queda vista");
})();

console.log((mal ? "✗" : "✓") + " tutorial: " + ok + " ok, " + mal + " mal");
process.exit(mal ? 1 : 0);
