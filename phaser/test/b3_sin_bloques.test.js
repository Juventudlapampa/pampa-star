/* ============================================================================
   PAMPA STAR · B3 — EL PANEL DE CINE NO PUEDE DIBUJAR BLOQUES

   Este bug volvió CINCO veces: una figura del panel de cine sale dibujada con
   el muñequito paramétrico de bloques en medio de las ilustraciones.

   Las cuatro veces anteriores se arregló recorriendo las escenas UNA POR UNA.
   Eso cubre las que existían ese día. La quinta aparición no estaba en las
   escenas: estaba en la cadena de planos del cine viejo (planoPie →
   planoEsfuerzo → planoArquero → planoDesenlace), que dibujaba "cine_arquero"
   y "cine_jugador" cableados a mano y que ningún barrido de escenas miraba.

   Por eso este test NO tiene una lista escrita a mano. Barre los archivos del
   panel de cine buscando CUALQUIER uso de una textura de bloques, y enumera
   las escenas leyéndolas del código. Si mañana alguien agrega una escena y le
   cablea un muñequito, la suite frena el commit.

   Corré:  node phaser/test/b3_sin_bloques.test.js
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

let ok = 0, mal = 0;
function assert(cond, msg) { if (cond) ok++; else { mal++; console.error("  ✗ " + msg); } }

const RAIZ = path.join(__dirname, "..", "..");
const ESC = path.join(RAIZ, "phaser/scenes");
/* El test analiza CÓDIGO, no prosa: se sacan los comentarios antes de barrer.
   Sin esto, los propios comentarios que explican el bug ("acá se llamaba a
   PampaAvatarArte.heroico()") se cuentan como el bug — y la salida se llena de
   falsos positivos que tapan los de verdad.
   Se preservan los saltos de línea para que los números de línea sigan siendo
   los del archivo real. */
const sinComentarios = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
  .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + m.slice(p1.length).replace(/./g, " "));
const leer = (f) => sinComentarios(fs.readFileSync(path.join(ESC, f), "utf8"));
/* algunos chequeos necesitan el texto tal cual (buscar que exista una función) */
const leerCrudo = (f) => fs.readFileSync(path.join(ESC, f), "utf8");

/* los archivos que dibujan el panel de cine (los que NO son el generador de
   bloques ni el editor, que sí puede usarlos legítimamente) */
const ARCHIVOS_DE_CINE = ["match.js", "escenas_v9.js", "definicion_ui.js", "jugadon_ui.js"];

/* las texturas de bloques que genera scenes/sprites.js para figuras humanas.
   cine_red NO está: es una textura de red, no un muñequito. */
const BLOQUES = ["cine_jugador", "cine_pie", "cine_arquero", "cine_arquero_mio"];

/* ---------- [1] NINGÚN ARCHIVO DEL CINE USA UNA TEXTURA DE BLOQUES ----------
   Se busca el uso REAL (pasarla como textura), no la mención en un comentario:
   por eso se exige que esté dentro de add.sprite/add.image/setTexture/return. */
const USO_REAL = (clave) => new RegExp(
  "(add\\s*\\.\\s*(sprite|image)\\s*\\([^)]*|setTexture\\s*\\(\\s*|return\\s+)[\"']" + clave + "[\"']", "g");

let usos = 0;
ARCHIVOS_DE_CINE.forEach(f => {
  const src = leer(f);
  BLOQUES.forEach(clave => {
    const re = USO_REAL(clave);
    let m;
    while ((m = re.exec(src)) !== null) {
      const linea = src.slice(0, m.index).split("\n").length;
      usos++;
      assert(false, f + ":" + linea + " usa la textura de bloques '" + clave + "' en el panel de cine. " +
        "SÍNTOMA: el muñequito paramétrico aparece en medio de las ilustraciones — es el bug que ya volvió 5 veces. " +
        "Usá this.figuraCine(id, 'quien') o this.figuraArquero(accion, 'quien'), que nunca devuelven bloques.");
    }
  });
});
if (usos === 0) console.log("[1] ningún archivo del cine usa texturas de bloques (" + ARCHIVOS_DE_CINE.length + " archivos, " + BLOQUES.length + " claves)");

/* ---------- [1b] NI LLAMA AL GENERADOR DE BLOQUES ----------
   La primera versión de este test solo buscaba las CLAVES de textura
   ("cine_arquero"). Se le escaparon 7 de los 9 caminos reales, porque la otra
   mitad del bug no pasa por una clave: llama directo al generador paramétrico
   —PampaAvatarArte.jugador() / heroico() / cineJugador()— que dibuja el
   muñequito al vuelo. Ese era el agujero.

   La regla es simple: dentro del panel de cine, NADIE llama al generador. */
const GENERADORES = ["jugador", "heroico", "cineJugador"];
let usosGen = 0;
ARCHIVOS_DE_CINE.forEach(f => {
  const src = leer(f);
  GENERADORES.forEach(fn => {
    const re = new RegExp("PampaAvatarArte\\s*\\.\\s*" + fn + "\\s*\\(", "g");
    let m;
    while ((m = re.exec(src)) !== null) {
      const linea = src.slice(0, m.index).split("\n").length;
      usosGen++;
      assert(false, f + ":" + linea + " llama a PampaAvatarArte." + fn + "() desde el panel de cine. " +
        "SÍNTOMA: dibuja el muñequito de bloques al vuelo, sin pasar por ninguna clave de textura — " +
        "por eso el barrido que solo miraba claves no lo encontraba. Usá figuraCine()/figuraArquero().");
    }
  });
});
if (usosGen === 0) console.log("[1b] ningún archivo del cine llama al generador de bloques (" + GENERADORES.join("/") + ")");

/* ---------- [2] LA PUERTA EXISTE Y NO SABE DEVOLVER BLOQUES ---------- */
const defUI = leerCrudo("definicion_ui.js");
assert(/figuraCine\s*\(/.test(defUI), "tiene que existir figuraCine(): es la única puerta por la que entra una figura al panel");
assert(/figuraArquero\s*\(/.test(defUI), "tiene que existir figuraArquero(): el arquero es el que más veces volvió como bloques");
/* que el cuerpo de figuraCine no mencione ninguna clave de bloques */
const cuerpoFig = defUI.slice(defUI.indexOf("figuraCine("), defUI.indexOf("figuraArquero("));
BLOQUES.forEach(clave => {
  assert(cuerpoFig.indexOf('"' + clave + '"') < 0 && cuerpoFig.indexOf("'" + clave + "'") < 0,
    "figuraCine() menciona '" + clave + "': la puerta del cine NO puede conocer los bloques ni para el fallback");
});
console.log("[2] figuraCine() y figuraArquero() existen y no conocen los bloques");

/* ---------- [3] ENUMERAR LAS ESCENAS Y VERIFICAR QUE TENGAN POSE ----------
   Por enumeración automática: se buscan las llamadas a escenaCine({...}) en
   todos los archivos del cine y se mira que cada una declare cómo se resuelve
   la figura del protagonista. No hay lista escrita a mano: si mañana aparece
   una escena nueva, aparece acá sola. */
const escenas = [];
ARCHIVOS_DE_CINE.forEach(f => {
  const src = leer(f);
  const re = /escenaCine\s*\(\s*\{/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    /* recorto el objeto de configuración contando llaves */
    let i = src.indexOf("{", m.index), prof = 0, fin = i;
    for (; fin < src.length; fin++) {
      if (src[fin] === "{") prof++;
      else if (src[fin] === "}") { prof--; if (prof === 0) break; }
    }
    const cfg = src.slice(i, fin + 1);
    const linea = src.slice(0, m.index).split("\n").length;
    const etq = (cfg.match(/etiqueta\s*:\s*["'`]([^"'`]{0,40})/) || [])[1] || "(sin etiqueta)";
    escenas.push({
      archivo: f, linea, etiqueta: etq,
      declaraProta: /\bprota\s*:/.test(cfg),
      declaraRival: /\brival\s*:/.test(cfg),
      poseExplicita: /\bpose\s*:|\bposeRival\s*:|\bposeFinalProta\s*:|\bposeFinalRival\s*:/.test(cfg)
    });
  }
});
assert(escenas.length > 0, "no se encontró NINGUNA llamada a escenaCine: cambió la forma de declarar escenas y este test quedó ciego");
escenas.forEach(e => {
  assert(e.declaraProta,
    "la escena de " + e.archivo + ":" + e.linea + " (" + e.etiqueta + ") no declara 'prota'. " +
    "SÍNTOMA: el panel no sabe a quién dibujar y la figura queda sin pose asignada.");
});
console.log("[3] " + escenas.length + " escenas enumeradas del código, todas con protagonista declarado");
escenas.forEach(e => console.log("      · " + e.etiqueta + "  (" + e.archivo + ":" + e.linea + ")" +
  (e.declaraRival ? " +antagonista" : "")));

/* ---------- [4] LA RESOLUCIÓN DE POSE NUNCA TERMINA EN BLOQUES ----------
   poseParaEscena es la que traduce una acción a un id de pose. Su último
   recurso tiene que ser una pose ilustrada. */
const matchSrc = leerCrudo("match.js");
const iPPE = matchSrc.indexOf("poseParaEscena(p, anim)");
assert(iPPE > 0, "no se encontró poseParaEscena(): cambió de nombre y este test quedó ciego");
const cuerpoPPE = matchSrc.slice(iPPE, matchSrc.indexOf("poseDelAntagonista", iPPE));
BLOQUES.forEach(clave => {
  assert(cuerpoPPE.indexOf(clave) < 0, "poseParaEscena() menciona '" + clave + "': su último recurso tiene que ser una pose ilustrada");
});
assert(/return\s+["']corriendo["']/.test(cuerpoPPE),
  "poseParaEscena() tiene que terminar con una pose ilustrada genérica ('corriendo') como último recurso");
console.log("[4] poseParaEscena() termina en una pose ilustrada, no en bloques");

/* ---------- [5] LAS POSES DE ARQUERO QUE EL CÓDIGO PIDE, EXISTEN ---------- */
const man = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/poses_manifest.json"), "utf8"));
const declaradas = Object.keys(man.poses || {});
const pedidas = new Set();
/* Solo los strings que se piden COMO POSE. No alcanza con buscar "arquero_*":
   el relator tiene claves con ese mismo prefijo —relatar("arquero_mio") es una
   frase, no un dibujo— y la primera versión de este test las contaba como
   poses faltantes. Se exige el contexto: poseKey, figuraCine, figuraArquero o
   un return de poseParaEscena. */
const COMO_POSE = /(?:poseKey|figuraCine|figuraArquero|poseSprite)\s*\(\s*["'](arquero_[a-z_]+)["']|return\s+\(?[^;\n]*\?\s*["'](arquero_[a-z_]+)["']\s*:\s*["'](arquero_[a-z_]+)["']/g;
ARCHIVOS_DE_CINE.forEach(f => {
  const src = leer(f);
  let m;
  while ((m = COMO_POSE.exec(src)) !== null) {
    [m[1], m[2], m[3]].forEach(v => { if (v) pedidas.add(v); });
  }
});
pedidas.forEach(id => {
  assert(declaradas.indexOf(id) >= 0,
    "el código pide la pose de arquero '" + id + "' y el manifest no la declara. " +
    "SÍNTOMA: figuraCine cae a la genérica y el arquero se ve como cualquier jugador.");
});
console.log("[5] poses de arquero pedidas por el código: " + [...pedidas].join(", ") + " — todas en el manifest");

if (mal === 0) console.log("\n✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("\n✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
