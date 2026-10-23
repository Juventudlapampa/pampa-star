/* PAMPA STAR · se juega entero con teclado (ola 3, L13: escuelas con
   computadoras y sin mouse). El GDD §14.4 dice "dedo o teclado", y había
   pantallas a las que solo se llegaba con el puntero: la tabla entre fecha y
   fecha (vistaTemporada), la tarjeta del primer partido, el salteo de las
   escenas y lo que se escribe letra por letra antes de que aparezcan las
   opciones (la previa, la entrevista, el evento).
   El guardián es de lectura del código: cada vista del Master que dibuja un
   botón tiene su cursor (grupoFoco), con las excepciones escritas acá.
   node phaser/test/teclado.test.js */
"use strict";
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..", "..");
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), "utf8").replace(/\r\n/g, "\n");
let ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("✗ " + m); } }

/* el cuerpo de un método de clase (dos espacios de sangría) */
function metodo(src, nombre) {
  const i = src.indexOf("\n  " + nombre + "(");
  if (i < 0) return "";
  const j = src.indexOf("\n  }\n", i);
  return src.slice(i, j < 0 ? src.length : j);
}

/* ---------- [1] el Master: cada vista con botones tiene cursor ---------- */
const MA = leer("phaser/scenes/master.js");
/* las que no: con su porqué */
const SIN_CURSOR = {
  vistaPrevia: "su cursor nace con el botón, cuando termina la primera página (ponerBoton)"
};
/* las que lo arman en otro método que llaman */
const DELEGA = { vistaElegir: "dibujarMapa" };
const vistas = (MA.match(/\n  (vista[A-Za-z]+)\(/g) || []).map(s => s.trim().replace("(", ""));
assert(vistas.length >= 8, "se encuentran las vistas del Master (" + vistas.join(", ") + ")");
vistas.forEach(v => {
  const c = metodo(MA, v);
  if (!/this\.boton\(|setInteractive\(/.test(c)) return;
  const d = DELEGA[v];
  assert(/grupoFoco\(/.test(c) || (d && c.indexOf("this." + d + "()") >= 0 && /grupoFoco\(/.test(metodo(MA, d))) ||
    (SIN_CURSOR[v] && /grupoFoco\(/.test(MA.slice(MA.indexOf("\n  " + v + "("), MA.indexOf("\n  " + v + "(") + 9000))),
    "SÍNTOMA: " + v + " dibuja botones y no tiene cursor de teclado (grupoFoco)");
});
/* el mapa: la localidad y la duración se elegían con flechas, pero ARRANCAR,
   IMPORTAR, VOLVER y PEGAR UN CÓDIGO solo andaban con el puntero */
const elegir = metodo(MA, "vistaElegir");
assert((elegir.match(/botones\.push\(this\.boton\(/g) || []).length === 5 && /this\._botonesElegir = botones\.map/.test(elegir),
  "los botones del mapa (ARRANCAR, IMPORTAR, VOLVER y PEGAR UN CÓDIGO) quedan anotados para el cursor");
assert(/_focoMapa\.concat\(this\._tempoFoco \|\| \[\], this\._botonesElegir \|\| \[\]\)/.test(metodo(MA, "dibujarMapa")),
  "y el cursor del mapa los suma después de las localidades y la duración");
const tabla = metodo(MA, "vistaTemporada");
assert(/const items = \[principal, editor, menu\]\.concat\(accesos\)/.test(tabla) && /this\.grupoFoco\(items, \{ inicial: 0 \}\)/.test(tabla),
  "la tabla arranca el cursor en JUGAR (o PASAR, o NUEVA TEMPORADA), con el editor, el menú y los accesos");
assert((tabla.match(/principal = this\.boton\(/g) || []).length === 3 && (tabla.match(/editor = this\.boton\(/g) || []).length === 2,
  "los tres botones principales y los dos del editor entran al cursor");
const esc = metodo(MA, "escucharToque");
assert(/keydown-ENTER/.test(esc) && /keydown-SPACE/.test(esc) && /completarEscritura\(\)/.test(esc),
  "lo que se escribe letra por letra se completa con ENTER o ESPACIO, como con el toque");
assert(/F\.vivo && F\.items\.some\(it => it\.obj && it\.obj\.active\)\) return;/.test(esc),
  "con un cursor vivo la tecla es del cursor (si no, en la previa una tecla completaba y pasaba de página)");
assert(/kb\.off\(k, conTecla\)/.test(esc), "y las teclas se sueltan al salir de la escena");

/* ---------- [2] el partido ---------- */
const M = leer("phaser/scenes/match.js");
const crear = metodo(M, "create");
assert(/keydown-SPACE[\s\S]{0,120}if \(this\.saltearConTecla\(\)\) return;/.test(crear) && /keydown-ENTER", \(\) => this\.saltearConTecla\(\)/.test(crear),
  "ESPACIO y ENTER saltean la escena y el cine");
const salteo = metodo(M, "saltearConTecla");
assert(/skip_min_ms/.test(salteo) && /_escSkip/.test(salteo) && /_cineSkip/.test(salteo), "con el mismo antirrebote que el toque");
["abrirMenuCruz", "abrirPausa", "salidasDelFinal", "iniciarPaseDirigido"].forEach(n =>
  assert(/grupoFoco\(/.test(metodo(M, n)), n + " tiene cursor de teclado"));
assert(/keydown-ESC/.test(crear) && /keydown-P"/.test(crear), "ESC es el atrás y P la pausa");
const tut = metodo(M, "tutorialSiHaceFalta");
assert(/keydown-ENTER/.test(tut) && /keydown-SPACE/.test(tut), "la tarjeta del primer partido se cierra con ENTER o ESPACIO");

/* ---------- [3] EL TOQUE, el título, el editor y el opening ---------- */
const TQ = leer("phaser/scenes/toque_ui.js");
assert(/keydown-SPACE/.test(TQ) && /keydown-ENTER/.test(TQ), "EL TOQUE le pega con ESPACIO o ENTER");
const TI = leer("phaser/scenes/titulo.js");
assert((TI.match(/grupoFoco\(/g) || []).length >= 2, "el título y OPCIONES tienen cursor");
const ED = leer("phaser/scenes/editor.js");
assert(/keydown-UP/.test(ED) && /keydown-DOWN/.test(ED) && /keydown-LEFT/.test(ED) && /keydown-ENTER/.test(ED), "el editor se maneja con flechas y ENTER");
const IN = leer("phaser/scenes/intro.js");
assert(/keyboard\.(once|on)\("keydown"/.test(IN), "el opening sigue con cualquier tecla");

console.log((mal ? "✗" : "✓") + " teclado: " + ok + " ok, " + mal + " mal");
process.exit(mal ? 1 : 0);
