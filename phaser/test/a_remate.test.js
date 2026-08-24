/* ============================================================================
   PAMPA STAR · BLOQUE 2 — ANIMACIONES Y FÍSICA DEL REMATE

   Cinco reportes de Rodri que resultaron ser cuatro bugs, tres de ellos de la
   misma familia: un sistema nuevo montado sobre uno viejo, y un renglón que
   quedó hablando el idioma del viejo.

     A1 · el jugador corre para atrás
          El panel calculaba la dirección con el vx de la SIMULACIÓN, que ataca
          siempre a +x. En el segundo tiempo el render se espeja (ladoVisual=2)
          y el panel no se enteraba: ibas al arco y la figura miraba al revés.
          Medido: el 1er tiempo siempre bien, el 2do siempre mal, los dos lados.

     A2 · "pateo y no hay animación", tercera vez
          No faltaba una escena: resolverTiro tenía CINCO salidas y una de ellas
          —el marcador que te gana el duelo— no pasaba por escenaCine. Salía un
          renglón de texto, con anim "gambeta", que encima es la equivocada.

     A3 · nadie corta el remate
          La lectura posicional existía desde C1 y la usaba un solo arco.
          remateRivalAuto no tenía nada de "rival": recibe tirador y arco.

     A4 · la pelota vuelve al medio después de la atajada
          Los cuatro desenlaces terminaban en DOS funciones. Atajada, afuera y
          córner iban todos a tiroFallado() → perderPelota(), que es la función
          de "te robaron en juego": le da la pelota al rival de campo más cerca
          y te muda el control a tu mitad.

     A5 · "cuando pateo está bugueado"
          Medido en el cuadro de la revelación: el arquero pasaba de 250 px a
          2.923 px de alto, en un lienzo de 540. El golpe de escala del final
          usaba las constantes de los sprites viejos sobre una ilustración.

   Corré:  node phaser/test/a_remate.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var SRC = fs.readFileSync(path.join(RAIZ, "phaser/scenes/match.js"), "utf8");
var BAL = JSON.parse(fs.readFileSync(path.join(RAIZ, "phaser/data/balance.json"), "utf8"));
var REL = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/relatos.json"), "utf8"));
var Pt = require(path.join(RAIZ, "phaser/logic/partido.js"));
var D = require(path.join(RAIZ, "phaser/logic/definicion.js"));

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

function partido() {
  var plantel = [];
  for (var i = 0; i < 11; i++) plantel.push({ nombre: "J" + i, esVos: i === 9 });
  return Pt.crearPartido({ bal: BAL, plantel: plantel, planteRival: null, rival: "Test" });
}
/* la foto de una jugada: vos rematando desde el área rival */
function rematando() {
  var st = partido();
  st.posesion = "mia"; st.modo = "juego"; st.ctrl = 9;
  var j = st.mios[9]; j.x = st.W - 160; j.y = st.H / 2;
  st.pelota.x = j.x + 12; st.pelota.y = j.y;
  return st;
}

/* ---------- [1] A1 · LA DIRECCIÓN SALE DE LA PANTALLA, NO DE LA SIMULACIÓN ---------- */
(function () {
  /* el punto de verdad del espejo ya existía y se llama fx(); lo que faltaba
     era que el panel lo usara. Se verifica que el flip, el parallax y las
     siluetas salgan todos del mismo espejo. */
  assert(/const espejo = \(st\.ladoVisual === 2\) \? -1 : 1;/.test(SRC),
    "A1: el panel tiene que leer ladoVisual para saber hacia dónde es 'adelante'");
  assert(/const vxP = vx \* espejo;/.test(SRC), "y derivar la velocidad EN PANTALLA");
  assert(/if \(Math\.abs\(vxP\) > 0\.02\) this\._panelFlip = vxP < 0;/.test(SRC),
    "A1: el flip sale de vxP (pantalla), no de vx (simulación)");
  assert(/tilePositionX \+= vxP \*/.test(SRC), "y el parallax del pasto también");
  assert(/const dx = \(r\.x - j\.x\) \* espejo/.test(SRC), "y las siluetas de los rivales");
  /* la regla, en números: en el 2T, ir a +x en la simulación es ir a la
     IZQUIERDA en pantalla, así que la figura tiene que mirar a la izquierda */
  function miraDerecha(ladoVisual, dxSim) { return !((dxSim * (ladoVisual === 2 ? -1 : 1)) < 0); }
  function vaDerechaEnPantalla(ladoVisual, dxSim) { return (dxSim * (ladoVisual === 2 ? -1 : 1)) > 0; }
  var casos = 0;
  [1, 2].forEach(function (lv) {
    [+40, -40].forEach(function (dx) {
      casos++;
      assert(miraDerecha(lv, dx) === vaDerechaEnPantalla(lv, dx),
        "A1: en el " + lv + "T yendo a " + (dx > 0 ? "+x" : "-x") + " la figura tiene que mirar hacia donde se mueve EN PANTALLA");
    });
  });
  assert(casos === 4, "las dos mitades por los dos lados: cuatro casos");
  console.log("[1] A1 · flip, parallax y siluetas pasan por el mismo espejo · 4 casos (2 mitades × 2 lados)");
})();

/* ---------- [2] A2 · NINGUNA SALIDA DEL REMATE SE QUEDA SIN ESCENA ---------- */
(function () {
  /* el bloqueo del marcador ya no cae a un renglón de texto con anim "gambeta" */
  assert(!/mostrarResolucion\([^)]*TE LO TAPARON/.test(SRC),
    "A2: 'TE LO TAPARON' no puede resolverse con un cartel de texto");
  assert(/escenaDelBloqueo\(/.test(SRC), "A2: tiene que existir la escena del bloqueo");
  /* y hay UNA sola, usada por los dos modos de que te corten */
  var usos = (SRC.match(/this\.escenaDelBloqueo\(/g) || []).length;
  assert(usos === 2, "A2: la escena del bloqueo se usa en los DOS casos —el marcador y el que se " +
    "interpone en el camino— y en ningún otro lado (encontró " + usos + ")");
  /* la pose del bloqueo existe en el manifest y ahora la usa alguien */
  var MAN = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/poses_manifest.json"), "utf8"));
  assert(!!MAN.poses.bloqueo, "la pose 'bloqueo' tiene que estar en el manifest");
  assert(/pose: "bloqueo"/.test(SRC), "y la escena tiene que pedirla");
  /* el protagonista del bloqueo es EL QUE BLOQUEA, no vos */
  assert(/prota: \{ j: defensor, esRival: true, anim: "bloqueo" \}/.test(SRC),
    "A2: el protagonista de un bloqueo es el defensor, es su momento");
  console.log("[2] A2 · una sola escena de bloqueo, para los dos modos · la pose ya existía y no la usaba nadie");
})();

/* ---------- [3] A3 · LA MISMA LEY PARA LOS DOS ARCOS ---------- */
(function () {
  assert(typeof D.remateAuto === "function", "A3: remateAuto tiene que existir (el nombre honesto)");
  assert(D.remateAuto === D.remateRivalAuto, "y ser LA MISMA función: nunca tuvo nada de 'rival'");
  /* la lectura es simétrica: la misma jugada espejada da el mismo resultado */
  var cfg = BAL.definicion;
  function leer(arcoX, defs) {
    return D.remateAuto({
      tirador: { x: arcoX > 500 ? 400 : 600, y: 300 },
      arco: { x: arcoX, y: 300 },
      defensores: defs, arquero: { nivel: 55, aguante: 1000 },
      aguanteMax: 1000, cfg: cfg, rng: function () { return 0.99; }   // sin azar: nunca bloquea
    });
  }
  var izq = leer(0, [{ x: 500, y: 300 }]);
  var der = leer(1000, [{ x: 500, y: 300 }]);
  assert(izq.defensoresEnLinea === der.defensoresEnLinea,
    "A3: un defensor en el medio de la línea de tiro cuenta igual para los dos arcos");
  assert(izq.pBloqueo === der.pBloqueo, "y la chance de bloqueo es la misma");
  /* el juego pide la lectura con el arco RIVAL: es lo que faltaba */
  assert(/arco: \{ x: st\.W, y: st\.H \/ 2 \}/.test(SRC),
    "A3: tu remate tiene que leerse contra el arco rival (x = W)");
  /* un bloqueo no es una pelota perdida */
  assert(typeof D.desenlaceBloqueo === "function", "A3: el bloqueo tiene que tener desenlace");
  var R = BAL.definicion.bloqueo_reparto;
  assert(!!R && typeof R.corner === "number" && typeof R.rebote === "number",
    "y el reparto tiene que ser DATO, no un número escondido en el código");
  assert(R.corner + R.rebote < 1, "y dejar lugar al despeje (corner + rebote < 1)");
  var c = { corner: 0, rebote: 0, despeje: 0 }, x = 7;
  var rng = function () { x = (x * 9301 + 49297) % 233280; return x / 233280; };
  for (var i = 0; i < 6000; i++) c[D.desenlaceBloqueo(BAL.definicion, rng)]++;
  assert(c.corner > 0 && c.rebote > 0 && c.despeje > 0, "los tres desenlaces tienen que poder salir");
  assert(Math.abs(c.corner / 6000 - R.corner) < 0.04, "y el reparto tiene que respetarse (córner)");
  /* la perilla es compartida a propósito */
  assert(typeof cfg.bloqueo_base === "number", "bloqueo_base tiene que ser la perilla");
  assert(/bloqueo_base/.test(fs.readFileSync(path.join(RAIZ, "phaser/logic/definicion.js"), "utf8")),
    "y vivir en un solo lado");
  console.log("[3] A3 · la lectura es simétrica · el bloqueo reparte en córner/rebote/despeje · perilla compartida");
})();

/* ---------- [4] A4 · LOS CUATRO DESENLACES DEJAN LA PELOTA DONDE VA ---------- */
(function () {
  assert(typeof Pt.saqueArquero === "function", "A4: tiene que existir el saque del arquero");
  var st, W = partido().W;
  var iArq = partido().rivales.findIndex(function (r) { return r.pos === "ARQ"; });

  /* GOL → del medio, para el rival */
  st = rematando(); Pt.golMio(st); Pt.kickoff(st, "rival");
  assert(Math.abs(st.pelota.x - st.W / 2) < 40, "A4 gol: la pelota va al MEDIO (dio " + Math.round(st.pelota.x) + ")");
  assert(st.posesion === "rival", "y saca el rival");

  /* CÓRNER → tuya, EN el vértice, con la pelota al pie */
  st = rematando(); Pt.cornerMio(st);
  assert(st.posesion === "mia", "A4 córner: la pelota sigue siendo tuya");
  var jc = st.mios[st.ctrl];
  var dPel = Math.hypot(jc.x - st.pelota.x, jc.y - st.pelota.y);
  assert(dPel < 30, "A4 córner: la pelota va CON el jugador al vértice, no se queda donde terminó el " +
    "remate (quedó a " + Math.round(dPel) + " px)");
  assert(jc.x > st.W * 0.9, "y el vértice es el del arco rival");

  /* ATAJADA → la tiene el ARQUERO rival, en su área */
  st = rematando(); Pt.saqueArquero(st, "atajada");
  assert(st.posesion === "rival", "A4 atajada: la pelota es del rival");
  assert(st.portadorRival === iArq, "y la tiene EL ARQUERO, no un defensor cualquiera");
  assert(st.pelota.x > st.W * 0.9, "y está en SU área, no en el medio (dio " + Math.round(st.pelota.x) + ")");
  assert(st.esperaRival > 0, "y la pisa un momento: te da tiempo de armarte");

  /* AFUERA → saque de arco, mismo lugar */
  st = rematando(); Pt.saqueArquero(st, "afuera");
  assert(st.portadorRival === iArq && st.pelota.x > st.W * 0.9, "A4 afuera: saque de arco, igual");
  assert(st.ultimoSaque === "afuera", "y queda anotado el motivo, que es lo que cuenta el relator");

  /* la vieja perderPelota NO puede seguir resolviendo un remate */
  st = rematando(); Pt.perderPelota(st);
  assert(st.rivales[st.portadorRival].pos !== "ARQ",
    "perderPelota (robo en juego) excluye al arquero a propósito: por eso no servía para la atajada");
  assert(/P\.saqueArquero\(st, "atajada"\)/.test(SRC), "A4: la atajada tiene que llamar al saque del arquero");
  assert(/P\.saqueArquero\(st, "afuera"\)/.test(SRC), "y el afuera también");
  console.log("[4] A4 · gol→medio · córner→vértice CON la pelota · atajada y afuera→el arquero rival en su área");
})();

/* ---------- [5] A5 · EL GOLPE DE ESCALA NO PUEDE REVENTAR LA PANTALLA ---------- */
(function () {
  /* medido en vivo: el arquero pasaba de 250 px a 2.923 px en un lienzo de 540 */
  assert(/if \(sr\._esPose\) sr\.setScale\(sr\.scaleX \* GOLPE\);/.test(SRC),
    "A5: para una ILUSTRACIÓN el golpe tiene que ser relativo a su escala actual");
  assert(/if \(sp\._esPose\) sp\.setScale\(sp\.scaleX \* GOLPE\);/.test(SRC),
    "A5: y lo mismo del lado del protagonista (la rama gemela tenía el mismo error)");
  assert(/var GOLPE = 1\.12;/.test(SRC), "el 12% en un solo lugar");
  /* las constantes viejas quedan SOLO en la rama del muñequito paramétrico:
     nunca más sueltas sobre una figura que puede ser una ilustración */
  assert(/else sp\.setScale\(\(F\.escala_prota \|\| 3\.4\)/.test(SRC),
    "escala_prota solo puede usarse en la rama del muñequito (else de _esPose)");
  assert(/else sr\.setScale\(\(F\.escala_rival \|\| 2\.9\) \* GOLPE\);/.test(SRC),
    "y escala_rival igual");
  var sueltas = (SRC.match(/(?<!else )s[pr]\.setScale\(\(F\.escala_(prota|rival)/g) || []);
  assert(sueltas.length === 0,
    "ninguna de las dos constantes puede aplicarse sin preguntar antes si es ilustración (encontró " + sueltas.length + ")");
  /* la cuenta que lo delató: una ilustración de 853 px por 2,9 no entra en 540 */
  var fuente = 853, canvas = 540;
  assert(fuente * (BAL.escena.escala_rival || 2.9) > canvas * 4,
    "la constante vieja aplicada a una ilustración da " +
    Math.round(fuente * (BAL.escena.escala_rival || 2.9)) + " px en un lienzo de " + canvas +
    ": por eso se veía una pierna a pantalla completa");
  console.log("[5] A5 · el golpe es relativo en las ilustraciones · medido: 250→280 px, antes 250→2923");
})();

/* ---------- [6] EL RELATOR NO PUEDE FALLAR EN SILENCIO ---------- */
(function () {
  /* la lección del Bloque 1: pedirle al relator una situación que no existe
     no da error, da silencio. Así que se enumeran las situaciones que el
     código pide y se cruzan con las que el JSON declara. */
  var pedidas = {};
  var re = /this\.relatar\(\s*"([a-z_]+)"/g, m;
  var sinComentarios = SRC.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, "");
  while ((m = re.exec(sinComentarios)) !== null) pedidas[m[1]] = true;
  /* las que salen de una expresión (cfg.relato || ...) se listan aparte */
  ["bloqueo", "bloqueo_leido", "corner", "rebote"].forEach(function (k) { pedidas[k] = true; });
  var faltan = Object.keys(pedidas).filter(function (k) { return !REL.relator[k]; });
  assert(faltan.length === 0,
    "el código le pide al relator situaciones que data/relatos.json no declara (silencio, no error): " + faltan.join(", "));
  ["bloqueo", "bloqueo_leido", "corner", "rebote", "saque_arquero"].forEach(function (k) {
    assert(Array.isArray(REL.relator[k]) && REL.relator[k].length >= 3,
      "'" + k + "' necesita al menos 3 variantes (el relator sirve por bolsa barajada)");
  });
  console.log("[6] el relator declara las " + Object.keys(pedidas).length + " situaciones que el código pide · 0 mudas");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
