/* ============================================================================
   PAMPA STAR · EL GUARDIÁN DE LO CONSTRUIDO Y DESCONECTADO

   Este proyecto tiene una enfermedad estructural con nombre propio, y ya la
   agarramos NUEVE veces:

     1. el muñequito en una capa invisible (mundoLayer.visible === false)
     2. el relator detrás de un flag que nadie prendía
     3. la plataforma del jugadón, sin invocarse
     4. las animaciones dibujadas en la capa que no se ve
     5. la MEGACORRIDA: secuenciaDisponible() con un solo llamador que
        preguntaba por "combinada", así que la rama "megacorrida" era inalcanzable
     6. ayudar_casa y estudiar: `requiere_origen` comparaba la condición "campo"
        contra la marca "cosecha", que no existe. Dos de diez acciones de la
        semana, inalcanzables
     7. el preset de tempo: guardado, leído... y usado por nadie
     8. el rendimiento decreciente: diseñado, simulado, calibrado con barridos
        finos, documentado y DISCUTIDO — sobre una función que devolvía el valor
        sin tocar en su primera línea, porque ningún llamador le pasaba cfg.stats
     9. el nivel de carrera clavado en 1, que se llevaba puestos los dos
        megatiros altos, las tres megadefensas y las dos secuencias

   Ninguno tiró un error. Ninguno puso un test en rojo. Y los nueve tenían
   comentarios que hablaban de ellos como si anduvieran. El de la curva de
   rendimiento lo decía sin querer: "los llamadores viejos no se enteran". Era
   un camino de migración seguro y la migración nunca se hizo.

   No es descuido: es lo que le pasa a un proyecto que creció por capas rápidas,
   donde cada capa deja cables sueltos de la anterior y nada avisa.

   ESTE ARCHIVO ES EL QUE AVISA. Enumera tres formas del mismo bicho:

     [1] GUARDA DE MIGRACIÓN SEGURA · una función de lógica pura que sale
         temprano devolviendo un argumento sin tocar. Si ningún llamador cruza
         la guarda, la función está CALIBRADA PERO DESCONECTADA.
     [2] CAMPO SIN LA OTRA MITAD · un `_campo` de escena leído y nunca escrito
         (la condición nunca da verdadero) o escrito y nunca leído (el valor no
         llega a ningún lado).
     [3] LO QUE SE GUARDA TIENE QUE TENER CONSUMIDOR · claves del registry.

   Cómo se usa cuando falla: NO agregues el caso a la lista permitida para que
   se ponga verde. La lista es para lo que ya se miró y se decidió que está
   bien. Un caso nuevo es un cable suelto hasta que se demuestre lo contrario.

   LO QUE ESTE GUARDIÁN TODAVÍA NO VE, y conviene saberlo:
     · la parte [2] sólo mira campos que empiezan con `_`. Es la convención del
       proyecto para lo privado, pero no la respeta todo: `this.hinchadaViva`
       —una llamada a un método que no existe en ningún archivo, escondida
       detrás de `&& this.hinchadaViva` que la volvía un no-op silencioso— pasó
       por abajo del radar y la encontró la barrida a mano, no el test.
     · nada de esto ve los DATOS: un valor declarado en un JSON que ningún
       código consume (el `cansancio` de tribuna.json, el `saque_arquero` de
       relatos.json) necesita su propio chequeo por vocabulario, como el que
       hace mod_fecha.test.js con TOPES.

   Censo completo:  node phaser/test/desconectados.test.js --censo
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var CENSO = process.argv.indexOf("--censo") >= 0;

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

function leer(p) { try { return fs.readFileSync(path.join(RAIZ, p), "utf8"); } catch (e) { return ""; } }
function archivos(dir, ext) {
  try {
    return fs.readdirSync(path.join(RAIZ, dir)).filter(function (f) { return f.slice(-ext.length) === ext; })
      .map(function (f) { return dir + "/" + f; });
  } catch (e) { return []; }
}
/* mirar CÓDIGO, no prosa: los comentarios que explican un bug lo CITAN, y si
   no se los saca, el comentario que documenta el arreglo hace fallar al test
   que lo cuida. (Ya pasó una vez, con este mismo patrón.) */
function sinComentarios(s) {
  var out = s.replace(/\/\*[\s\S]*?\*\//g, function (m) { return m.replace(/[^\n]/g, " "); });
  return out.split("\n").map(function (l) {
    var i = l.indexOf("//");
    if (i < 0) return l;
    var antes = l.slice(0, i);
    var comillas = (antes.match(/"/g) || []).length + (antes.match(/'/g) || []).length;
    return comillas % 2 === 0 ? antes : l;
  }).join("\n");
}

var LOGIC = archivos("phaser/logic", ".js");
var SCENES = archivos("phaser/scenes", ".js");

/* ══════════════════════════════════════════════════════════════════════════
   [1] GUARDAS DE MIGRACIÓN SEGURA
   ══════════════════════════════════════════════════════════════════════════ */

/* lo ya mirado, con el motivo. NO agregar acá para poner el test en verde. */
var GUARDAS_OK = {
  "foco.js:vecino": "sin cajas no hay a dónde ir: devolver el índice actual es la respuesta correcta, no una migración pendiente",
  "foco.js:primero": "idem — con la lista vacía no hay primero"
};

function cuerpoDe(txt, desde) {
  var prof = 0, i = txt.indexOf("{", desde);
  if (i < 0) return "";
  for (var k = i; k < txt.length; k++) {
    if (txt[k] === "{") prof++;
    else if (txt[k] === "}") { prof--; if (prof === 0) return txt.slice(i + 1, k); }
  }
  return txt.slice(i + 1);
}

var guardas = [];
LOGIC.forEach(function (f) {
  var cod = sinComentarios(leer(f));
  var re = /function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/g, m;
  while ((m = re.exec(cod))) {
    var nombre = m[1];
    var params = m[2].split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    if (!params.length) continue;
    var primeras = cuerpoDe(cod, m.index).split("\n").slice(0, 8).join("\n");
    var rg = /if\s*\(([^{]*?)\)\s*(?:\{\s*)?return\s+([A-Za-z_$][\w$]*)\s*;/g, g;
    while ((g = rg.exec(primeras))) {
      if (params.indexOf(g[2]) < 0) continue;   /* no devuelve un argumento: no es este patrón */
      var pide = [];
      params.forEach(function (p) {
        var rp = new RegExp("\\b" + p.replace(/\$/g, "\\$") + "\\.([A-Za-z_$][\\w$]*)", "g"), x;
        while ((x = rp.exec(g[1]))) pide.push({ param: p, prop: x[1] });
      });
      if (!pide.length) continue;
      guardas.push({
        archivo: f, base: f.split("/").pop(), nombre: nombre, params: params, devuelve: g[2],
        linea: cod.slice(0, m.index).split("\n").length,
        pide: pide.filter(function (p, i2, a) { return a.findIndex(function (q) { return q.param === p.param && q.prop === p.prop; }) === i2; })
      });
      break;
    }
  }
});

/* ¿algún llamador CRUZA la guarda? Se busca, en todo el código que llama, que
   alguien construya el argumento con la propiedad que la guarda pide. */
/* corta la lista de argumentos de una llamada respetando paréntesis, llaves y
   corchetes: `f(a, {b: 1, c: 2}, d)` son TRES argumentos, no cuatro */
function argumentosDe(txt, desdeParen) {
  var prof = 0, args = [], act = "";
  for (var i = desdeParen; i < txt.length; i++) {
    var c = txt[i];
    if (c === "(" || c === "{" || c === "[") { prof++; if (prof === 1 && c === "(") continue; }
    else if (c === ")" || c === "}" || c === "]") { prof--; if (prof === 0) { args.push(act); return args; } }
    else if (c === "," && prof === 1) { args.push(act); act = ""; continue; }
    act += c;
  }
  return args;
}

/* ¿algún llamador CRUZA la guarda? Se buscan LAS LLAMADAS A ESA FUNCIÓN, se
   toma el argumento que ocupa el lugar del parámetro que la guarda mira, y se
   ve si ese argumento trae la propiedad — puesta ahí mismo, o en la variable
   que se le pasa. Buscar la propiedad "en algún lado del código" no sirve:
   `stats:` aparece en veinte lugares que no tienen nada que ver, y el guardián
   daría verde justo en el caso que lo justifica. */
var FUENTES = SCENES.concat(LOGIC).map(function (f) { return { f: f, cod: sinComentarios(leer(f)) }; });

function traeLaProp(txt, prop) { return new RegExp("[{,]\\s*" + prop + "\\s*:").test(txt); }

/* la función que ENVUELVE una posición del archivo, con sus parámetros */
function envolvente(cod, pos) {
  var re = /function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/g, m, ult = null;
  while ((m = re.exec(cod)) && m.index < pos) ult = m;
  if (!ult) return null;
  return { nombre: ult[1], params: ult[2].split(",").map(function (s) { return s.trim(); }).filter(Boolean) };
}

/* todas las llamadas a `nombre` (con o sin `Modulo.` adelante), con sus args */
function llamadasA(nombre) {
  var out = [];
  var re = new RegExp("(?:^|[^\\w$])(?:[A-Za-z_$][\\w$]*\\.)?" + nombre + "\\s*\\(", "g");
  FUENTES.forEach(function (src) {
    var m;
    re.lastIndex = 0;
    while ((m = re.exec(src.cod))) {
      if (/function\s*$/.test(src.cod.slice(Math.max(0, m.index - 12), m.index + m[0].length - nombre.length - 1))) continue;
      var paren = src.cod.indexOf("(", m.index + m[0].length - 1);
      out.push({ src: src, pos: m.index, args: argumentosDe(src.cod, paren) });
    }
  });
  return out;
}

/* ¿este argumento trae la propiedad? Puesta ahí mismo, en la variable local que
   se le pasa, o —UN SALTO MÁS— viniendo del llamador de la función que lo
   recibe como parámetro. Ese salto es justo el del caso que originó todo:
   rendimiento() recibe `cfg`, que es un PARÁMETRO de elegir(), y quien arma el
   objeto con `stats` es la escena, un nivel más arriba. Sin seguirlo, el
   guardián da rojo donde está bien y verde donde está mal. */
function cruzaArg(src, pos, arg, prop, salto) {
  arg = (arg || "").trim();
  if (!arg) return false;
  if (traeLaProp(arg, prop)) return true;
  var v = arg.match(/^[A-Za-z_$][\w$]*/);
  if (!v) return false;
  /* armada como variable local en el mismo archivo */
  var a = src.cod.match(new RegExp("(?:var|let|const)\\s+" + v[0] + "\\s*=([\\s\\S]{0,240})"));
  if (a && traeLaProp(a[1], prop)) return true;
  if (salto <= 0) return false;
  /* o es un parámetro: subir un nivel y mirar qué le pasan a ESA función */
  var env = envolvente(src.cod, pos);
  if (!env) return false;
  var i = env.params.indexOf(v[0]);
  if (i < 0) return false;
  return llamadasA(env.nombre).some(function (ll) {
    return cruzaArg(ll.src, ll.pos, ll.args[i], prop, salto - 1);
  });
}

guardas.forEach(function (g) {
  g.permitida = GUARDAS_OK[g.base + ":" + g.nombre] || null;
  g.llamadas = 0;
  g.cruzada = false;
  llamadasA(g.nombre).forEach(function (ll) {
    g.llamadas++;
    var todas = g.pide.every(function (p) {
      return cruzaArg(ll.src, ll.pos, ll.args[g.params.indexOf(p.param)], p.prop, 2);
    });
    if (todas) g.cruzada = true;
  });
});

if (CENSO) {
  console.log("═══ CENSO [1] · GUARDAS QUE DEVUELVEN EL ARGUMENTO SIN TOCAR ═══");
  guardas.forEach(function (g) {
    console.log("  " + (g.cruzada ? "cruzada    " : g.permitida ? "correcta   " : "DESCONECTADA") +
      " " + g.archivo + ":" + g.linea + " " + g.nombre + "() pide " +
      g.pide.map(function (p) { return p.param + "." + p.prop; }).join(", "));
  });
  console.log("");
}

(function () {
  var sueltas = guardas.filter(function (g) { return !g.cruzada && !g.permitida; });
  sueltas.forEach(function (g) {
    assert(false, "CALIBRADA PERO DESCONECTADA · " + g.archivo + ":" + g.linea + " " + g.nombre +
      "() sale temprano devolviendo `" + g.devuelve + "` sin tocar si falta " +
      g.pide.map(function (p) { return p.param + "." + p.prop; }).join(" / ") +
      ", y ningún llamador se lo pasa. Es la firma exacta del rendimiento decreciente.");
  });
  /* y la que ya nos mordió, con nombre y apellido: que no se desmigre */
  var rend = guardas.find(function (g) { return g.nombre === "rendimiento"; });
  assert(rend, "rendimiento() tiene que seguir teniendo su guarda (si desapareció, revisar este test)");
  if (rend) assert(rend.cruzada, "rendimiento() volvió a quedar sin un llamador que le pase cfg.stats");
  console.log("[1] " + guardas.length + " guardas de salida temprana en lógica pura · " +
    guardas.filter(function (g) { return g.cruzada; }).length + " cruzadas · " +
    guardas.filter(function (g) { return g.permitida; }).length + " correctas por diseño · " +
    sueltas.length + " sueltas");
})();

/* ══════════════════════════════════════════════════════════════════════════
   [2] CAMPOS DE ESCENA SIN LA OTRA MITAD
   ══════════════════════════════════════════════════════════════════════════ */

/* leídos y nunca escritos = la condición nunca da verdadero.
   escritos y nunca leídos = el valor no llega a ningún lado. */
/* ── DEUDA CONOCIDA ────────────────────────────────────────────────────────
   Casos REALES de la enfermedad, ya mirados y medidos, que todavía no se
   cablearon porque conectarlos MUEVE EL BALANCE y esa decisión es de Rodri.
   No están perdonados: están contados. El test falla si aparece uno nuevo, y
   los lista en cada corrida para que no se hagan invisibles.
   ────────────────────────────────────────────────────────────────────────── */
/* Vacía, y que se note: la deuda de CAMPO quedó en cero. Los tres casos que
   había (_hiceGol, _golpeFuerte, _teniaVis) están cableados. Lo que queda es
   deuda de CONTENIDO, más abajo, y es una decisión de diseño. */
var PENDIENTES = {};

var DEUDA_HOY = null;
var LEIDOS_OK = {
  /* L06: la función que repinta el renglón de ?perf=1 la escribe index.html
     (el script de LA RED), que este barrido no lee; si no está, no se pinta */
  "__PAMPA_RED_PINTAR": "la escribe index.html (LA RED): repinta ?perf=1 cuando cambian las texturas"
};
/* asas y sellos: referencias que se dejan puestas para limpiar, para inspeccionar
   o para que las use quien tenga el objeto. No son contenido que no corre. */
var ESCRITOS_OK = {
  "_mascara": "referencia a la máscara, puesta en el container para poder destruirla con él",
  "_mascara2": "idem, la segunda máscara del escudo",
  "_pielRepintar": "asa de repintado que queda en el rect para quien tenga el objeto",
  "_pielCapas": "idem, las capas del rect",
  "_tapArea": "sello del área táctil agrandada, para poder verificarla desde afuera",
  "_pisoTactil": "sello de que ya se le puso piso táctil al objeto",
  "_master": "sello de división y perfil sobre el estado, para inspección",
  "_tema": "sello de qué tema produjo esa entrada del mapa de música, para poder verificarlo desde afuera",
  "__PAMPA_MUSICA_FECHA": "contador de diagnóstico de música, se lee desde la verificación",
  "__PAMPA_MUSICA_MALOS": "idem, momentos desconocidos",
  "__PAMPA_MUSICA_TARDIOS": "idem, pedidos de escenas muertas",
  /* L06: lo lee el renglón de ?perf=1 en index.html (LA RED, pintar), que este barrido no mira */
  "__PAMPA_TEX": "cuánto ocupan las texturas ({n, mb}): lo lee ?perf=1 en index.html y la verificación",
  "__PAMPA_HALO": "estadísticas de la limpieza del anillo violeta (cuántas imágenes, cuántos píxeles, cuánto tardó): se leen desde la verificación, como los contadores de música",
  "_entrarDefinicionDefVieja": "el camino viejo de la definición, que se conserva a propósito para poder volver",
  "_panelReveal": "bandera de una sola pasada: se escribe para NO repetir el reveal, no para leerse",
  "_tramiteMudoUltimo": "marca anti-repetición del trámite mudo",
  "_temaFinalMin": "marca anti-repetición del tema final",
  "_profUltimo": "marca anti-repetición del profundo",
  "_musicaMomento": "el momento que suena, que se lee desde la verificación y el HANDOFF",
  "_relojSem": "el reloj de la semana, que se destruye por referencia",
  "_panelMaskG": "la máscara del panel, que se guarda para destruirla",
  "_lunes": "el resumen del lunes, que se lee desde la vista siguiente",
  "_lecturaSemana": "se pasa al estado del partido en la misma línea",
  "_semanaResumen": "idem"
};

var escritos = {}, leidos = {};
/* la LÓGICA también cuenta: muchos de estos campos viven en `st`, que la escena
   escribe y partido.js lee. Mirando solo scenes/ daban falsos positivos. */
SCENES.concat(LOGIC).forEach(function (f) {
  var cod = sinComentarios(leer(f));
  cod.split("\n").forEach(function (l, i) {
    var m2, donde = f + ":" + (i + 1);
    /* asignación por CUALQUIER receptor: this._x, sc._x, self._x — el montar()
       de la tribuna escribe sc._tribuna desde otro archivo, y sin esto parecía
       un huérfano cuando no lo era */
    /* el receptor puede ser un identificador (`this.x`) pero tambien el
       resultado de un indice o una llamada (`pool[k]._x`, `buscar()._x`). Sin
       los cierres, `this.panelSil[k]._teniaVis = false` no contaba como
       escritura y el campo quedaba figurando como deuda cuando ya estaba
       cableado — el guardian mintiendo sobre su propia lista. */
    var rw = /(?:[A-Za-z_$][\w$]*|\]|\))\.(_[A-Za-z_$][\w$]*)\s*(?:=[^=]|\+=|-=)/g;
    while ((m2 = rw.exec(l))) (escritos[m2[1]] = escritos[m2[1]] || []).push(donde);
    /* método o propiedad de una escena/mixin: `_caraDe(x) {`, `_caraDe: function`, `_pivote: {` */
    var mm = l.match(/^\s{2,6}(_[A-Za-z_$][\w$]*)\s*(?:\([^)]*\)\s*\{|:)/);
    if (mm) (escritos[mm[1]] = escritos[mm[1]] || []).push(donde);
    /* clave de OBJETO LITERAL: `{ obj: r, _dir: dir }` también es escribir el
       campo. Sin esto, un `it._dir` leído más tarde parecía una condición que
       nunca da verdadero — y no lo era. */
    var rk = /[{,]\s*(_[A-Za-z_$][\w$]*)\s*:/g;
    while ((m2 = rk.exec(l))) (escritos[m2[1]] = escritos[m2[1]] || []).push(donde);
    /* LECTURAS: por cualquier receptor, igual que las escrituras. Contarlas
       solo sobre `this.` daba 25 falsos positivos — un `g._pulso` escrito sobre
       un Graphics y leído como `G._pulso` parecía un valor sin consumidor. Los
       dos lados tienen que mirar lo mismo o el guardián miente. */
    var rr = /\b[A-Za-z_$][\w$]*\.(_[A-Za-z_$][\w$]*)\s*(?!=[^=])/g;
    while ((m2 = rr.exec(l))) {
      var resto = l.slice(m2.index + m2[0].length);
      if (/^\s*=[^=]/.test(resto)) continue;        // eso es la escritura, no una lectura
      (leidos[m2[1]] = leidos[m2[1]] || []).push(donde);
    }
  });
});

var soloLeidos = Object.keys(leidos).filter(function (k) { return !escritos[k]; });
var soloEscritos = Object.keys(escritos).filter(function (k) { return !leidos[k]; });

if (CENSO) {
  console.log("═══ CENSO [2] · CAMPOS DE ESCENA ═══");
  console.log("  leídos y NUNCA escritos (" + soloLeidos.length + "):");
  soloLeidos.forEach(function (k) { console.log("    this." + k + "  ← " + leidos[k].slice(0, 2).join(", ")); });
  console.log("  escritos y NUNCA leídos (" + soloEscritos.length + "):");
  soloEscritos.forEach(function (k) { console.log("    this." + k + "  → " + escritos[k].slice(0, 2).join(", ")); });
  console.log("");
}

(function () {
  var deuda = [];
  soloLeidos.forEach(function (k) {
    if (LEIDOS_OK[k]) return;
    if (PENDIENTES[k]) { deuda.push(k); return; }
    assert(false, "CONDICIÓN QUE NUNCA DA VERDADERO · this." + k + " se LEE en " + leidos[k][0] +
      " y no lo escribe nadie. Es la familia de `requiere_origen` comparando \"campo\" contra \"cosecha\".");
  });
  soloEscritos.forEach(function (k) {
    if (ESCRITOS_OK[k]) return;
    if (PENDIENTES[k]) { deuda.push(k); return; }
    assert(false, "VALOR SIN CONSUMIDOR · this." + k + " se ESCRIBE en " + escritos[k][0] +
      " y no lo lee nadie. Es la familia del preset de tempo: guardado, y usado por nadie.");
  });
  /* la deuda no crece y no se esconde: se cuenta y se lee en cada corrida */
  Object.keys(PENDIENTES).forEach(function (k) {
    assert(deuda.indexOf(k) >= 0,
      "'" + k + "' figura como deuda conocida y ya no aparece: si se cableó, saludos — sacalo de PENDIENTES");
  });
  console.log("[2] " + Object.keys(escritos).length + " campos · " +
    soloLeidos.length + " leídos sin escritor · " + soloEscritos.length + " escritos sin lector · " +
    Object.keys(ESCRITOS_OK).length + " asas y sellos");
  DEUDA_HOY = deuda.length;
  if (deuda.length) {
    console.log("    DEUDA CONOCIDA (" + deuda.length + ") — real, medida, sin cablear porque mueve el balance:");
    deuda.forEach(function (k) { console.log("      · " + k + ": " + PENDIENTES[k]); });
  }
})();

/* ══════════════════════════════════════════════════════════════════════════
   [3] LO QUE SE GUARDA TIENE QUE TENER CONSUMIDOR
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  var cod = sinComentarios(SCENES.map(leer).join("\n") + "\n" + leer("phaser/index.html"));
  var sets = [], gets = {}, m;
  var rs = /registry\.set\(\s*"([^"]+)"/g;
  while ((m = rs.exec(cod))) if (sets.indexOf(m[1]) < 0) sets.push(m[1]);
  var rg = /registry\.get\(\s*"([^"]+)"/g;
  while ((m = rg.exec(cod))) gets[m[1]] = true;
  var huerfanas = sets.filter(function (k) { return !gets[k]; });
  huerfanas.forEach(function (k) {
    assert(false, "VALOR SIN CONSUMIDOR · registry \"" + k + "\" se guarda y no lo lee nadie");
  });
  assert(sets.length >= 15, "el registry tiene que seguir teniendo sus claves (hay " + sets.length + ")");
  console.log("[3] " + sets.length + " claves del registry · " + huerfanas.length + " sin consumidor");
})();

/* ══════════════════════════════════════════════════════════════════════════
   [4] UN CONSUMIDOR QUE NO TIENE LLAMADOR NO ES UN CONSUMIDOR

   La versión profunda del chequeo, y nació de un error mío. Al cablear las
   megadefensas declaré que las TRES quedaban alcanzables porque
   `megaDefensaDisponible(["atajada"])` aparecía en definicion_ui.js. Aparecía,
   sí — adentro de defBotonesDef(), que NO TIENE UN SOLO LLAMADOR: la definición
   defensiva entera murió cuando la V9 C1 sacó la pantalla de gestión y el
   cuerpo viejo se borró en B3.

   O sea que conté como consumidor a una función muerta. Es la enfermedad una
   capa más abajo: no alcanza con que ALGUIEN pida la cosa, hay que ver si a ese
   alguien lo llama alguien.

   Y de paso cazó otra: textoDeLaMano(), la línea de HUD con tu mano de cartas,
   escrita entera y sin llamador.
   ══════════════════════════════════════════════════════════════════════════ */

/* lo ya mirado, con el motivo. NO agregar acá para poner el test en verde. */
var MUERTOS_OK = {
  "defCargaLista": "compat declarado: el propio comentario dice 'si algo todavía llama a defCargaLista'",
  "entrarDefinicionDef": "la puerta vieja de la definición defensiva; sale siempre por escenaRemateRival",
  "defBotonesDef": "la pantalla de gestión defensiva que la V9 C1 sacó a propósito · balance.json lo documenta",
  "entrarJugadonTiro": "marcado ⚠ PENDIENTE DE RODRI en el propio archivo: NO BORRAR SIN DECIDIR",
  "jugadonFuerza": "idem, del mismo bloque",
  "jugadonTirar": "idem, del mismo bloque",
  "jugadonPintarDefensores": "stub vacío a propósito: los rivales viven en updateJugadonMini",
  "jugadonPintarOpciones": "idem",
  "pelotaImpacto": "efecto de Feel sin uso hoy, se conserva con el resto de la caja de herramientas",
  "botonPielEn": "variante de botón de la caja de piel, sin uso hoy",
  /* semana_ui: los escenarios se llaman por nombre desde un mapa, no por punto */
  "club": "escenario de semana_ui, se invoca por nombre desde ESCENARIOS",
  "potrero": "idem", "casa": "idem", "patio": "idem", "ruta": "idem",
  "escuela": "idem", "vacio": "idem", "lugares": "idem"
};

(function () {
  var CICLO = {};
  ["create", "init", "update", "preload", "constructor", "shutdown", "destroy", "render",
    "if", "for", "while", "switch", "catch", "function", "return", "do", "else", "try", "with"]
    .forEach(function (k) { CICLO[k] = true; });

  var TODO = FUENTES.map(function (s) { return s.cod; }).join("\n") + "\n" + sinComentarios(leer("phaser/index.html"));
  /* sin regex a propósito: la definición no lleva punto adelante, así que
     contar ".nombre(" cuenta llamadas y nunca la propia definición */
  function llamadas(nombre) {
    var aguja = "." + nombre + "(", n = 0, i = 0;
    while ((i = TODO.indexOf(aguja, i)) >= 0) { n++; i += aguja.length; }
    return n;
  }

  var defs = [], muertos = [];
  SCENES.forEach(function (f) {
    sinComentarios(leer(f)).split("\n").forEach(function (l, i) {
      var m = l.match(/^\s{4,6}([A-Za-z_$][\w$]*)\s*(?:\([^)]*\)\s*\{|:\s*function)/);
      if (!m || CICLO[m[1]]) return;
      defs.push(m[1]);
      if (llamadas(m[1]) === 0) muertos.push({ f: f, linea: i + 1, n: m[1] });
    });
  });

  if (CENSO) {
    console.log("═══ CENSO [4] · MÉTODOS DE ESCENA SIN LLAMADOR ═══");
    muertos.forEach(function (d) {
      console.log("  " + (MUERTOS_OK[d.n] ? "mirado " : "SUELTO ") + d.f + ":" + d.linea + " " + d.n + "()");
    });
    console.log("");
  }

  muertos.forEach(function (d) {
    if (MUERTOS_OK[d.n]) return;
    assert(false, "MÉTODO SIN LLAMADOR · " + d.f + ":" + d.linea + " " + d.n + "() está escrito entero y " +
      "no lo invoca nadie. Ojo: si adentro pide algo (una carta, una megacosa, un dato), ese algo TAMPOCO " +
      "está conectado — un consumidor sin llamador no es un consumidor.");
  });
  console.log("[4] " + defs.length + " métodos de escena · " + muertos.length + " sin llamador (" +
    Object.keys(MUERTOS_OK).length + " ya mirados)");
})();

/* ══════════════════════════════════════════════════════════════════════════
   [5] LO QUE SE ESCRIBE PARA QUE SE LEA TIENE QUE CAER EN UNA CAPA QUE SE VE

   El caso diez, y es el uno otra vez: avisar() hacía mundoLayer.add(t), y con
   pantalla_partida (el default) esa capa se apaga en create(). Diez avisos no
   se vieron nunca —"⏰ ¡ÚLTIMOS MINUTOS!", "No hay a quién dársela…" al tocar
   PASE, el perfil del rival, "Marcás con…", "🌟 ¡EQUIPO ENCENDIDO!", el "✗
   motivo" de una opción bloqueada— y cuatro auditorías lo marcaron antes de
   que se arreglara. Nada tiraba error: el texto existía, con su tween, en una
   capa invisible.

   Dos partes:
     (a) avisar() DE VERDAD: se carga la clase de match.js con un Phaser de
         mentira y se llama sobre una escena de mentira con pantalla partida.
         El texto tiene que quedar en un contenedor VISIBLE que la cámara del
         HUD no ignore, a la altura de la franja, y con su cola.
     (b) el censo: todo texto que match.js manda a mundoLayer tiene que estar
         detrás de la guarda de pantalla partida, o mirado y anotado acá.
   ══════════════════════════════════════════════════════════════════════════ */
var TEXTOS_MUNDO_OK = {
  "avisarEnElMundo": "la llama avisar() SÓLO con pantalla_partida apagada, que es el único caso en que el mundo se ve",
  "buildPortador": "el ▼ del portador en el mundo; en pantalla partida no se actualiza y lo reemplaza panelNombre, en la franja del panel",
  "buildFichas": "create() la llama sólo con pantalla_partida apagada (`if (!this.FLAGS.pantalla_partida) this.buildFichas()`)"
};
(function () {
  var SRC_M = leer("phaser/scenes/match.js").replace(/\r\n/g, "\n");
  var BAL5 = JSON.parse(leer("phaser/data/balance.json"));

  /* ---- (a) avisar(), corriendo ---- */
  var W5 = { Phaser: { Scene: function () { } }, PF: { texto: "Pixelify Sans" } };
  try { new Function("window", "Phaser", SRC_M)(W5, W5.Phaser); } catch (e) { assert(false, "match.js no carga con el Phaser de mentira: " + e.message); }
  var P5 = W5.PampaMatch && W5.PampaMatch.prototype;
  assert(!!(P5 && P5.avisar), "PampaMatch.prototype.avisar existe");
  if (!P5 || !P5.avisar) return;
  function contenedor(nombre, visible) {
    return { nombre: nombre, visible: visible, list: [],
      add: function (o) { var self = this; (Array.isArray(o) ? o : [o]).forEach(function (x) { self.list.push(x); x.parentContainer = self; }); return this; } };
  }
  function escena(split) {
    var s = Object.create(P5), ign = [], tw = [];
    s.BAL = { avisos: BAL5.avisos };
    s._split = split; s._finalApagado = false; s.estado = "LIBRE";
    s.mundoLayer = contenedor("mundoLayer", !split); s.hudLayer = contenedor("hudLayer", true);
    s.uiCam = { ignore: function (o) { ign.push(o); } };
    s.sprPortador = { x: 400, y: 300 };
    s.time = { now: 0 };
    /* killTweensOf mata de verdad (como Phaser): un tween muerto no completa */
    s.tweens = { add: function (c) { tw.push(c); return c; },
      killTweensOf: function (o) { tw.forEach(function (c) { if (c.targets === o) c.muerto = true; }); } };
    s.add = { text: function (x, y, txt, style) {
      return { x: x, y: y, text: txt, style: style, height: 27, active: true,
        setOrigin: function () { return this; }, setDepth: function () { return this; },
        setY: function (v) { this.y = v; return this; }, destroy: function () { this.active = false; },
        setText: function (v) { this.text = v; return this; }, setAlpha: function (v) { this.alpha = v; return this; } };
    } };
    s._avisos = []; s._avisosCola = [];
    return { s: s, ign: ign, tw: tw };
  }
  var E = escena(true), s = E.s;
  s.avisar("⏰ ¡ÚLTIMOS MINUTOS!");
  var t = s._avisos.length ? s._avisos[0].obj : null;
  assert(!!t, "con pantalla partida, avisar() crea el texto");
  assert(t && t.parentContainer === s.hudLayer && s.hudLayer.visible,
    "SÍNTOMA DEL CASO DIEZ: el aviso tiene que quedar en un contenedor VISIBLE (hudLayer), no en " + (t && t.parentContainer && t.parentContainer.nombre));
  assert(s.mundoLayer.list.length === 0, "y nada de avisar() cae en mundoLayer, que con pantalla partida está apagado");
  assert(E.ign.indexOf(t) < 0 && E.ign.indexOf(s.hudLayer) < 0, "la cámara del HUD (uiCam) no lo ignora");
  var fsz = t ? parseInt(t.style.fontSize, 10) : 0;
  assert(fsz >= 13, "el aviso mide 13 px o más (mide " + fsz + "): es texto que hay que leer al vuelo");
  assert(t && t.y >= 250 && t.y <= 300, "va en la franja entre la ilustración y el relator (y=" + (t && t.y) + ")");
  assert(t && /^#0a1f13/i.test(t.style.backgroundColor), "con fondo oscuro");
  /* la cola: dos a la vez, el tercero espera, el más nuevo abajo */
  s.avisar("Marcás con PEREYRA");
  s.avisar("No hay a quién dársela…");
  assert(s._avisos.length === 2 && s._avisosCola.length === 1, "dos a la vez y el tercero en cola (" + s._avisos.length + "+" + s._avisosCola.length + ")");
  assert(s._avisos[1].obj.y > s._avisos[0].obj.y, "el más nuevo abajo, el anterior sube");
  s.avisar("No hay a quién dársela…");
  assert(s._avisosCola.length === 1, "el mismo aviso repetido no se encola dos veces");
  E.tw[0].onComplete();
  assert(s._avisos.length === 2 && s._avisosCola.length === 0 && s._avisos[1].txt === "No hay a quién dársela…",
    "cuando uno se va, sale el que esperaba");
  /* con el HUD apagado espera, como la frase del relator */
  var E2 = escena(true), s2 = E2.s;
  s2.hudLayer.visible = false;
  s2.avisar("🌟 ¡EQUIPO ENCENDIDO! (+bonus un rato)");
  assert(s2._avisos.length === 0 && s2._avisosCola.length === 1, "con el HUD apagado (cine, Definición, Jugadón) el aviso espera");
  s2.hudLayer.visible = true; s2.soltarAvisos();
  assert(s2._avisos.length === 1, "y sale cuando el HUD vuelve");
  /* detrás del menú de tempo espera, y esa espera no lo vence */
  var E3 = escena(true), s3 = E3.s;
  s3.estado = "TEMPO_MENU";
  s3.avisar("⚔ ESPEJO DE SAL juega con una ESTRELLA");
  s3.time.now = 30000; s3.soltarAvisos();
  assert(s3._avisos.length === 0, "con el menú de tempo abierto (velo encima) el perfil del rival espera");
  s3.estado = "LIBRE"; s3.time.now = 30016; s3.soltarAvisos();
  assert(s3._avisos.length === 1, "y se lee al cerrar el menú, aunque haya tardado (no vence detrás del menú)");
  /* el que esperó demasiado al HUD, vence */
  var E4 = escena(true), s4 = E4.s;
  s4.hudLayer.visible = false; s4.avisar("Marcás con GÓMEZ");
  s4.hudLayer.visible = true; s4.time.now = (BAL5.avisos && BAL5.avisos.vence_ms || 8000) + 1; s4.soltarAvisos();
  assert(s4._avisos.length === 0 && s4._avisosCola.length === 0, "un aviso viejo que esperó al HUD más que vence_ms ya no sale");
  /* con el partido terminado no se escribe encima de la ilustración */
  s._finalApagado = true; s.limpiarAvisos();
  assert(s._avisos.length === 0, "limpiarAvisos() se lleva lo que estaba a la vista");
  s.avisar("⏰ ¡ÚLTIMOS MINUTOS!");
  assert(s._avisos.length === 0 && s._avisosCola.length === 0, "con _finalApagado, avisar() no escribe ni encola");
  assert(/this\._finalApagado = true;\s*\n[^\n]*\n\s*this\.limpiarAvisos\(\);/.test(SRC_M), "pantallaFinal() limpia los avisos al apagar el partido");
  /* sin pantalla partida, el aviso viejo pegado al portador (el mundo se ve) */
  var E5 = escena(false), s5 = E5.s;
  s5.avisar("Marcás con PEREYRA");
  assert(s5.mundoLayer.list.length === 1 && s5.mundoLayer.visible, "con pantalla_partida apagada sigue el aviso del mundo, que ahí sí se ve");
  /* REVISIÓN DEL LOTE · la clave y el toque. Cuatro toques al mapa en defensa
     dejaban "Marcás con A" y "Marcás con B" a la vez y C salía 2,7 s después,
     cuando ya marcabas con D; y la respuesta a un toque esperaba detrás de
     dos avisos viejos. */
  var E6 = escena(true), s6 = E6.s;
  ["ACOSTA", "BRIZUELA", "CÁCERES", "DOMÍNGUEZ"].forEach(function (n) {
    s6.avisar("Marcás con " + n, { clave: "marcacion", toque: true });
  });
  var marc = s6._avisos.filter(function (a) { return /^Marcás con/.test(a.txt); });
  assert(marc.length === 1 && marc[0].obj.text === "Marcás con DOMÍNGUEZ" && s6._avisosCola.length === 0,
    "SÍNTOMA DE LOS DOS 'MARCÁS CON': cuatro toques seguidos dejan UN aviso, el último (" +
    s6._avisos.map(function (a) { return a.obj.text; }).join(" / ") + " · cola " + s6._avisosCola.length + ")");
  var vivos6 = E6.tw.filter(function (c) { return !c.muerto && c.targets === marc[0].obj; });
  assert(vivos6.length === 1, "y con su tiempo de lectura entero otra vez (un solo fade vivo, el viejo se mató)");
  var E7 = escena(true), s7 = E7.s;
  s7.avisar("⚔ ESPEJO DE SAL juega con una ESTRELLA"); s7.avisar("Tempo INTERMEDIO · 2.2' por momento");
  assert(s7._avisos.length === 2, "(dos avisos a la vista, como al arrancar)");
  s7.avisar("No hay a quién dársela…", { clave: "pase", toque: true });
  assert(s7._avisos.some(function (a) { return a.txt === "No hay a quién dársela…"; }) && s7._avisos.length === 2,
    "SÍNTOMA DEL TOQUE QUE NO ANDA: la respuesta a un toque sale YA, sacando al más viejo, no 2,7 s después");
  assert(!s7._avisos.some(function (a) { return /ESPEJO DE SAL/.test(a.txt); }), "el que se fue es el más viejo (el perfil del rival)");
  var E8 = escena(true), s8 = E8.s;
  s8.hudLayer.visible = false;
  s8.avisar("Marcás con ACOSTA", { clave: "marcacion", toque: true });
  s8.avisar("Marcás con BRIZUELA", { clave: "marcacion", toque: true });
  ["uno", "dos", "tres", "cuatro", "cinco"].forEach(function (x) { s8.avisar("aviso " + x); });
  assert(s8._avisosCola.filter(function (a) { return a.clave === "marcacion"; }).length === 1 &&
    s8._avisosCola[0].txt === "Marcás con BRIZUELA",
    "con el HUD apagado, el de la misma clave se reemplaza en la cola y el de un toque espera ADELANTE");
  assert(s8._avisosCola.length === (BAL5.avisos.cola_max || 4), "el tope de la cola se cobra en los viejos, no en la respuesta al toque");
  var claveMarc = (SRC_M.match(/this\.avisar\("Marcás con [^;]*\{ clave: "marcacion", toque: true \}\);/g) || []).length;
  assert(claveMarc === (SRC_M.match(/this\.avisar\("Marcás con /g) || []).length && claveMarc >= 3,
    "las " + claveMarc + " llamadas de 'Marcás con' llevan la clave 'marcacion' y son respuesta a un toque");
  assert(/this\.avisar\("No hay a quién dársela…", \{ clave: "pase", toque: true \}\)/.test(SRC_M) &&
    /self\.avisar\("✗ " \+ it\.motivo, \{ clave: "motivo", toque: true \}\)/.test(leer("phaser/scenes/foco_ui.js")),
    "'No hay a quién dársela…' y el '✗ motivo' contestan a un toque");

  /* REVISIÓN DEL LOTE · LA FICHA DE LA SEMANA EN EL TICKER. Salía 1,4 s
     después de elegir el tempo; con el tutorial pendiente (primera fecha de
     una carrera nueva) se pintaba detrás de su velo y se iba a los 2,8 s, y
     cualquier frase del relator en ese rato la borraba. */
  var HOLD = (BAL5.relator && BAL5.relator.hold_ms) || 2800;
  var E9 = escena(true), s9 = E9.s;
  s9.BAL.relator = BAL5.relator;
  s9.tickerTxt = { text: "", alpha: 0, setText: function (v) { this.text = v; return this; }, setAlpha: function (v) { this.alpha = v; return this; } };
  s9._relPendiente = null; s9._relPendientePrio = false; s9._tickerFijo = 0;
  s9.time.now = 500;
  s9.estado = "TUTORIAL";
  s9.anunciarEnTicker("Llegás con poca energía", "📋", { prioridad: true });
  assert(s9.tickerTxt.text === "", "SÍNTOMA DE LA FICHA PERDIDA: detrás del velo del tutorial la ficha no se pinta (" + s9.tickerTxt.text + ")");
  s9.anunciarEnTicker("¡Arranca el partido!", "🎙");
  assert(s9._relPendiente === "📋 Llegás con poca energía", "una frase del relator no desplaza a la ficha que espera");
  s9.estado = "LIBRE"; s9.soltarRelatoPendiente();
  assert(s9.tickerTxt.text === "📋 Llegás con poca energía", "al cerrar el tutorial la ficha sale");
  s9.time.now = 1500; s9.anunciarEnTicker("¡Qué gambeta!", "🎙");
  assert(s9.tickerTxt.text === "📋 Llegás con poca energía", "SÍNTOMA DE LA FICHA PISADA: durante su tiempo, la frase del relator no la borra");
  s9.soltarRelatoPendiente();
  assert(s9.tickerTxt.text === "📋 Llegás con poca energía" && s9._relPendiente === "🎙 ¡Qué gambeta!", "la frase espera detrás");
  s9.time.now = 500 + HOLD + 1; s9.soltarRelatoPendiente();
  assert(s9.tickerTxt.text === "🎙 ¡Qué gambeta!", "y sale cuando la ficha cumplió su tiempo");
  s9.estado = "TEMPO_MENU"; s9.anunciarEnTicker("Se juega.", "🎙");
  assert(s9.tickerTxt.text === "🎙 ¡Qué gambeta!", "detrás del menú de tempo tampoco se escribe");
  /* y lo que se encontró verificando esto en pantalla: el tempo y el perfil
     del rival se soltaban en el instante de elegir el tempo, con el estado
     todavía en LIBRE, y el tutorial se abría encima un renglón después */
  var iElegir = SRC_M.indexOf("const elegir = (k) => {"), finElegir = SRC_M.indexOf("};", iElegir);
  var cuerpoElegir = SRC_M.slice(iElegir, finElegir);
  assert(iElegir > 0 && cuerpoElegir.indexOf("this.tutorialSiHaceFalta();") >= 0 &&
    cuerpoElegir.indexOf("this.tutorialSiHaceFalta();") < cuerpoElegir.indexOf('this.avisar("Tempo "'),
    "SÍNTOMA DE LOS AVISOS DETRÁS DEL TUTORIAL: al elegir el tempo, el tutorial se abre ANTES de avisar (si no, el aviso se pinta y queda tapado)");
  assert(/this\._relPendiente = null;/.test(SRC_M.slice(SRC_M.indexOf("  init() {"), SRC_M.indexOf("  create() {"))),
    "init() vacía la frase que esperaba (patrón P1: si no, salía al arrancar la fecha siguiente)");

  /* las llamadas de verdad y el update que suelta la cola */
  var llamadas = (SRC_M.match(/this\.avisar\(/g) || []).length;
  assert(llamadas >= 9, "match.js sigue llamando a avisar() (" + llamadas + " llamadas)");
  assert(/if \(this\._avisosCola && this\._avisosCola\.length\) this\.soltarAvisos\(\);/.test(SRC_M), "el update suelta la cola de avisos");
  assert(!/this\.avisar\("📋/.test(SRC_M) && /anunciarEnTicker\(this\._vidaFicha, "📋", \{ prioridad: true \}\)/.test(SRC_M),
    "la ficha de la semana va al ticker del relator (que tiene su espera), no a avisar()");

  /* ---- (b) el censo: textos que van a mundoLayer ----
     REVISIÓN DEL LOTE: "guardado" era `/if \(!this\._split\)/` sobre el
     método ENTERO hasta la línea. En create() (el método más largo) el único
     `if (!this._split)` es el de la guía: un mundoLayer.add(texto) agregado
     más abajo, FUERA de la guarda, pasaba el censo. Ahora se sigue la
     profundidad de llaves: cuenta como guardada sólo la línea que cae ADENTRO
     de un bloque `if (!this._split) {` que todavía no cerró, o la que trae la
     guarda en el mismo renglón, antes del add. Las cadenas se vacían antes de
     contar llaves (un "{" adentro de un texto no abre nada). */
  function sinCadenas(l) {
    return l.replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\\n]|\\.)*`/g, '""');
  }
  function censoMundo(cod) {
    var L = cod.split("\n"), metodo = "?", inicio = 0, out = [], prof = 0, guardas = [];
    L.forEach(function (l, i) {
      var mh = l.match(/^  (?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{\s*$/);
      if (mh) { metodo = mh[1]; inicio = i; guardas = []; }
      var limpia = sinCadenas(l);
      var mg = limpia.match(/if \(!this\._split\)\s*\{/), iLlaveGuarda = mg ? mg.index + mg[0].length - 1 : -1;
      var iAdd = limpia.indexOf("mundoLayer.add("), guardadoAca = null;
      for (var c = 0; c < limpia.length; c++) {
        if (c === iAdd) {
          var iG = limpia.indexOf("if (!this._split)");
          guardadoAca = guardas.length > 0 || (iG >= 0 && iG < iAdd);
        }
        if (limpia[c] === "{") { if (c === iLlaveGuarda) guardas.push(prof); prof++; }
        else if (limpia[c] === "}") { prof--; while (guardas.length && prof <= guardas[guardas.length - 1]) guardas.pop(); }
      }
      var ma = l.match(/mundoLayer\.add\(([^;]*)\)/);
      if (!ma) return;
      var cuerpoHasta = L.slice(inicio, i + 1).join("\n");
      (ma[1].match(/(?:this\.)?[A-Za-z_$][\w$]*/g) || []).forEach(function (tok) {
        var id = tok.replace(/^this\./, ""), esText;
        if (/^this\./.test(tok)) esText = new RegExp("this\\." + id + "\\s*=\\s*this\\.add\\.text\\(").test(cod);
        else esText = new RegExp("(?:const|let|var)\\s+" + id + "\\s*=\\s*this\\.add\\.text\\(").test(cuerpoHasta);
        if (!esText) return;
        out.push({ metodo: metodo, linea: i + 1, id: id, guardado: !!guardadoAca });
      });
    });
    return out;
  }
  /* el censo, probado contra un create() de mentira: la guía adentro de la
     guarda, y un texto nuevo DESPUÉS de que la guarda cerró */
  var DE_MENTIRA = [
    "  create() {",
    "    if (!this._split) {",
    "      const guia = this.add.text(0, 0, \"tocá { la cancha\", {});",
    "      this.mundoLayer.add(guia);",
    "    }",
    "    const nuevo = this.add.text(0, 0, \"¡GOL!\", {});",
    "    this.mundoLayer.add(nuevo);",
    "    if (!this._split) this.mundoLayer.add(this.add.text(0, 0, \"x\", {}));",
    "    const otro = this.add.text(0, 0, \"y\", {});",
    "    if (!this._split) this.mundoLayer.add(otro);",
    "  }"
  ].join("\n");
  var cm = censoMundo(DE_MENTIRA);
  var porId = {}; cm.forEach(function (x) { porId[x.id] = x.guardado; });
  assert(porId.guia === true, "censo: el texto ADENTRO del bloque `if (!this._split) {` cuenta como guardado");
  assert(porId.nuevo === false,
    "SÍNTOMA DEL CENSO CIEGO: un mundoLayer.add(texto) DESPUÉS de que cerró la guarda, en el mismo método, NO está guardado");
  assert(porId.otro === true, "y la guarda de una sola línea, antes del add, sí cuenta");
  var cod = sinComentarios(SRC_M), textosMundo = censoMundo(cod);
  if (CENSO) {
    console.log("═══ CENSO [5] · TEXTOS QUE VAN A mundoLayer ═══");
    textosMundo.forEach(function (x) { console.log("  match.js:" + x.linea + " " + x.metodo + "() → " + x.id + (x.guardado ? "  (detrás de !this._split)" : TEXTOS_MUNDO_OK[x.metodo] ? "  (mirado)" : "  ⚠")); });
  }
  textosMundo.forEach(function (x) {
    assert(x.guardado || TEXTOS_MUNDO_OK[x.metodo],
      "TEXTO EN UNA CAPA QUE NO SE VE · match.js:" + x.linea + " " + x.metodo + "() manda '" + x.id + "' a mundoLayer, y con " +
      "pantalla_partida (el default) esa capa está apagada. Ponelo en hudLayer o detrás de `if (!this._split)`.");
  });
  Object.keys(TEXTOS_MUNDO_OK).forEach(function (k) {
    assert(textosMundo.some(function (x) { return x.metodo === k; }),
      "TEXTOS_MUNDO_OK nombra a " + k + "() y ya no manda texto al mundo: sacalo de la lista");
  });
  console.log("[5] avisar() con pantalla partida: en el HUD, visible, con cola · " + textosMundo.length +
    " textos al mundo, todos detrás de la guarda o mirados (" + Object.keys(TEXTOS_MUNDO_OK).length + ")");
})();

/* ══════════════════════════════════════════════════════════════════════════
   EL NÚMERO DE LA DEUDA, EN CADA CORRIDA

   Pedido de Rodri: "hoy son 3; si mañana son 5 sin que nadie lo haya decidido,
   quiero que se vea sin leer el HANDOFF". Va al final y solo, porque un número
   metido entre líneas de detalle no se ve.

   DEUDA_TOPE es la afirmación explícita de cuánta deuda se ACEPTÓ. Que el test
   falle al subirla obliga a que agregar deuda sea una decisión y no un
   descuido: hay que tocar este número a mano y explicar el caso en PENDIENTES.
   ══════════════════════════════════════════════════════════════════════════ */
/* deuda de CONTENIDO: cosas que existen, están dibujadas o escritas, y no se
   pueden alcanzar hasta que Rodri tome una decisión de diseño. No son campos
   sueltos, así que no las ve la parte [2] — pero cuentan igual. */
var DEUDA_CONTENIDO = {
  /* UNA sola decisión de diseño, tres cosas colgando de ella. Se cuenta como
     una porque se resuelve de una: o el arquero recupera un momento propio, o
     las tres se borran. */
  "el arquero no tiene momento": "cuelgan TRES cosas: (1) LA TRANQUERA y EL PATADÓN, 2 de las 8 cartas — el 25% " +
    "del sistema — porque la mano se arma con st.ctrl y el arquero nunca lo es (lo excluyen masCercanoAPelota, " +
    "receptoresPase, receptorAlVacio, scoreMarcador, cambiarA, el saque tras atajada y el kickoff); " +
    "(2) la situación `saque_arquero` de data/relatos.json, declarada con sus frases y que nadie pide nunca; " +
    "(3) el arte arquero_despeje_celeste, que existe sólo para una de esas cartas. " +
    "Darle un momento significa devolverle al arquero una decisión, y la V9 C1 sacó esa pantalla a propósito.",
  "megadefensa TRANQUERA": "único pedido en defBotonesDef(), que no tiene llamador. Misma raíz que las cartas.",
  "física del súper tiro": "resolverSuperTiro y ARCO solo corren en el test; ya marcado ⚠ PENDIENTE DE RODRI en jugadon_ui.js."
};

var DEUDA_TOPE = 3;
(function () {
  var n = (DEUDA_HOY != null ? DEUDA_HOY : Object.keys(PENDIENTES).length) + Object.keys(DEUDA_CONTENIDO).length;
  assert(n <= DEUDA_TOPE,
    "LA DEUDA SUBIÓ: hay " + n + " casos y el tope aceptado es " + DEUDA_TOPE +
    ". Si es a propósito, subí DEUDA_TOPE y explicá el caso nuevo en PENDIENTES.");
  var campos = DEUDA_HOY != null ? DEUDA_HOY : Object.keys(PENDIENTES).length;
  assert(campos === Object.keys(PENDIENTES).length,
    "PENDIENTES declara " + Object.keys(PENDIENTES).length + " campos y se encontraron " + campos +
    ": la lista y la realidad tienen que coincidir");
  console.log("\n──────────────────────────────────────────────");
  console.log("  DEUDA CONOCIDA: " + n + " (tope aceptado: " + DEUDA_TOPE + ")");
  console.log("    " + campos + " de campo · " + Object.keys(DEUDA_CONTENIDO).length + " de contenido");
  Object.keys(DEUDA_CONTENIDO).forEach(function (k) { console.log("      · " + k); });
  console.log("──────────────────────────────────────────────");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
