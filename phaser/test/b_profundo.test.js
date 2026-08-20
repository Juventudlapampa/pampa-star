/* ============================================================================
   PAMPA STAR · P6-B — LA CANCHA PROFUNDA

   Rodri: "en Captain Tsubasa, cuando hay un pase largo o un remate, la
   composición del campo CAMBIA — la cámara avanza, las distancias se
   reencuadran, aparece una nueva realidad espacial. Acá todo pasa siempre en
   el mismo plano fijo y por eso no hay espacio."

   Hasta acá el panel tenía UN encuadre y nada más: de perfil, con parallax. Un
   pase de 40 metros y un toque de 3 se dibujaban con la misma cámara. La
   distancia se nombraba pero no se representaba.

   Ahora hay dos modos y el panel corta entre ellos. Este test cubre la parte
   que se puede medir sin pantalla: CUÁNDO se cambia de modo y CÓMO se mueve
   todo durante el viaje. Que se vea lindo se mira en las capturas B_*.png.

   Corré:  node phaser/test/b_profundo.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var P = require(path.join(RAIZ, "phaser/logic/perspectiva.js"));
var BAL = JSON.parse(fs.readFileSync(path.join(RAIZ, "phaser/data/balance.json"), "utf8"));
var SRC = fs.readFileSync(path.join(RAIZ, "phaser/scenes/match.js"), "utf8");
var V = (BAL.vista && BAL.vista.profundo) || {};

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* ---------- [1] B2 · CUÁNDO CAMBIA DE PLANO ---------- */
(function () {
  /* el pase CORTO no corta de cámara: si cada toque cortara, el corte dejaría
     de significar algo. Ese es el criterio de diseño, no un número al azar. */
  assert(P.esProfundo("pase", { distancia: V.pase_dist - 1 }, V) === false,
    "un pase por debajo del umbral se queda en el plano lateral");
  assert(P.esProfundo("pase", { distancia: V.pase_dist }, V) === true,
    "justo en el umbral ya corta");
  assert(P.esProfundo("pase", { distancia: V.pase_dist + 500 }, V) === true,
    "y un pase largo, obviamente");

  assert(P.esProfundo("tiro", { distanciaArco: V.tiro_dist - 1 }, V) === false,
    "el remate desde adentro del área NO cambia de plano (ahí ya hay viñeta propia)");
  assert(P.esProfundo("tiro", { distanciaArco: V.tiro_dist + 100 }, V) === true,
    "el remate desde afuera sí");

  assert(P.esProfundo("megacorrida", {}, V) === true, "la megacorrida siempre");
  assert(P.esProfundo("saque", {}, V) === true, "el saque del arquero siempre");

  /* lo que NO cambia de plano: el trámite de todos los días */
  ["gambeta", "quite", "corte", "bloqueo", "pared", "cabezazo", ""].forEach(function (a) {
    assert(P.esProfundo(a, { distancia: 9999, distanciaArco: 9999 }, V) === false,
      "'" + a + "' no puede cambiar de plano: el corte se gasta si se usa siempre");
  });

  /* la perilla de apagado */
  assert(P.esProfundo("pase", { distancia: 9999 }, { activo: false }) === false,
    "activo:false devuelve todo al modo lateral de siempre");
  console.log("[1] corta con: pase ≥" + V.pase_dist + " · tiro ≥" + V.tiro_dist +
    " · megacorrida · saque. No corta con nada más.");
})();

/* ---------- [2] B1 · LOS DOS SE ACERCAN (o no es una cámara que avanza) ---------- */
(function () {
  /* ESTE es el assert que define el punto. Si solo se moviera la pelota sería
     el mismo plano con un objeto cruzándolo — o sea lo que había antes. Para
     que se lea "la cámara avanzó", el que tiró Y el que recibe tienen que
     venir los dos hacia la cámara. */
  var a = P.viajeProfundo(0, V), b = P.viajeProfundo(1, V);
  assert(b.receptor < a.receptor,
    "el que recibe tiene que ACERCARSE (de " + a.receptor + " a " + b.receptor + ")");
  assert(b.tirador <= a.tirador,
    "y el que tiró también se acerca a la cámara (de " + a.tirador + " a " + b.tirador + ")");
  assert(b.tiradorEscala > a.tiradorEscala,
    "el que tiró CRECE mientras la cámara lo pasa (de " + a.tiradorEscala + " a " + b.tiradorEscala + ")");
  assert(b.tiradorAlpha < a.tiradorAlpha && b.tiradorAlpha === 0,
    "y se va de cuadro: termina en alpha 0");

  /* monotonía: nada puede ir y volver, eso se leería como un rebote */
  var prevR = 2, prevE = -1, monoR = true, monoE = true;
  for (var i = 0; i <= 20; i++) {
    var v = P.viajeProfundo(i / 20, V);
    if (v.receptor > prevR + 1e-9) monoR = false;
    if (v.tiradorEscala < prevE - 1e-9) monoE = false;
    prevR = v.receptor; prevE = v.tiradorEscala;
  }
  assert(monoR, "el que recibe se acerca sin ir y volver");
  assert(monoE, "y el que tiró crece sin encogerse en el medio");
  console.log("[2] receptor " + a.receptor + "→" + b.receptor + " · tirador crece ×" +
    b.tiradorEscala + " y se desvanece: los dos vienen hacia la cámara");
})();

/* ---------- [3] LA PELOTA VA DE UNO AL OTRO, Y CON ARCO ---------- */
(function () {
  var a = P.viajeProfundo(0, V), z = P.viajeProfundo(1, V);
  assert(Math.abs(a.pelota - a.tirador) < 1e-6, "al empezar, la pelota está en el pie del que tira");
  assert(Math.abs(z.pelota - z.receptor) < 1e-6, "al terminar, la pelota está en el que recibe");
  /* la parábola: 0 en las puntas y el pico al medio. Con el tiempo suavizado
     el pico caía en t=0.25 y la pelota parecía subir de golpe y planear. */
  assert(P.viajeProfundo(0, V).alto === 0 && P.viajeProfundo(1, V).alto === 0,
    "el vuelo arranca y termina a ras del piso");
  var pico = 0, tPico = 0;
  for (var i = 0; i <= 100; i++) {
    var h = P.viajeProfundo(i / 100, V).alto;
    if (h > pico) { pico = h; tPico = i / 100; }
  }
  assert(Math.abs(tPico - 0.5) < 0.02, "y el pico de la parábola cae al medio (dio t=" + tPico + ")");
  assert(Math.abs(pico - 1) < 1e-6, "con altura normalizada a 1");
  console.log("[3] la pelota va del pie del que tira al que recibe, con el pico en t=" + tPico);
})();

/* ---------- [4] B3 · EL CORTE ES SECO, PERO SE SIENTE ---------- */
(function () {
  var f = P.frenoDelCorte("pase", V);
  var g = P.frenoDelCorte("tiro", V);
  assert(f > 0, "el corte tiene un freno (el hitstop del bloque B)");
  assert(g > f, "y el del remate pesa más que el del pase (dio " + g + " contra " + f + ")");
  /* y en el código: el corte usa el hitstop, no un fundido */
  assert(/PampaFeel\.hitstop/.test(SRC) && /frenoDelCorte/.test(SRC),
    "entrarProfundo tiene que usar el hitstop del bloque B");
  assert(!/fadeOut[^)]*profundo|profundo[^;]*fadeIn/.test(SRC),
    "el corte NO puede tener transición suave: lo que se pidió es que la cámara SALGA de donde estaba");
  console.log("[4] freno del corte: pase " + f + " ms · remate " + g + " ms, sin fundido");
})();

/* ---------- [5] B4 · EL MAPA ES EL ANCLA ---------- */
(function () {
  /* el riesgo real de esto es que el jugador se pierda al cambiar el punto de
     vista. El mapa de abajo no puede cambiar NUNCA: es donde se contesta
     "dónde estoy". Lo que se verifica acá es que el modo profundo no toque
     ninguna pieza del mapa ni del HUD. */
  var cuerpo = SRC.slice(SRC.indexOf("  modoLateralVisible(v) {"));
  cuerpo = cuerpo.slice(0, cuerpo.indexOf("\n  }") + 4);
  ["radarG", "radarMarco", "radarNumsMios", "radarNumsRiv", "_radarTuArco",
   "hudLayer", "radarZona", "txtMarcador", "txtReloj"].forEach(function (k) {
    assert(cuerpo.indexOf(k) < 0,
      "modoLateralVisible NO puede tocar '" + k + "': el mapa y el HUD son el ancla y no cambian de modo");
  });
  /* y las piezas que sí apaga son todas del panel */
  assert(/panelTribuna/.test(cuerpo) && /panelPasto/.test(cuerpo) && /panelJug/.test(cuerpo),
    "sí tiene que apagar las piezas del modo lateral del panel");
  /* el modo profundo vive DENTRO del panel, así que hereda su máscara */
  assert(/this\.panelLayer\.add\(\[p\.g, p\.sombraR, p\.receptor, p\.pelota, p\.tirador\]\)/.test(SRC),
    "las piezas del modo profundo van adentro de panelLayer (heredan la máscara del panel)");
  console.log("[5] el modo profundo no toca ni el mapa ni el HUD, y vive adentro del panel");
})();

/* ---------- [6] LOS CUATRO DISPARADORES ESTÁN CABLEADOS ---------- */
(function () {
  var V9 = fs.readFileSync(path.join(RAIZ, "phaser/scenes/escenas_v9.js"), "utf8");
  assert(/quizasProfundo\("pase"/.test(SRC), "el pase largo llama al modo profundo");
  assert(/quizasProfundo\("tiro"/.test(SRC), "el remate desde afuera también");
  assert(/quizasProfundo\("megacorrida"/.test(SRC), "la megacorrida también");
  assert(/quizasProfundo\("saque"/.test(V9), "y el saque del arquero, en escenas_v9");
  /* que no se cuele en el update: el modo lateral y el profundo son excluyentes */
  assert(/if \(this\._prof && this\._prof\.activo\) this\.updatePanelProfundo\(\);\s*\n\s*else/.test(SRC),
    "mientras dura el viaje, el modo lateral NI SE ACTUALIZA: son excluyentes");
  console.log("[6] los cuatro disparadores cableados y los dos modos excluyentes");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
