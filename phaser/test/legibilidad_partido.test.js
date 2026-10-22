/* ============================================================================
   PAMPA STAR · EL TEXTO QUE DECIDE EL PARTIDO, A 13 PX Y ADENTRO DE SU CAJA
   (tanda 1.0, L09 · legibilidad-partido)

   LO QUE ESTABA MAL, medido: los rótulos de la cruz del partido iban a 10 px,
   7,2 px reales en un teléfono de 844x390 (factor 0,7222) y 6,7 en uno de
   800x360 (0,6667). Los de la Definición a 9, los del jugadón a 10. Los
   botones medían 176x50 y el centro 150: en una captura del duelo
   (l04b_2_duelo_sin_ticker.png) EL FOGONAZO se montaba sobre PASE y TIRO, y
   el subtítulo de MEGACORRIDA se salía de su botón. El motivo de una opción
   bloqueada iba en #c76a5e sobre #333d36: 3,04:1 de contraste (2,49 con
   protanopía).

   Este test arma la cruz con el código de verdad (abrirMenuAtaque y
   abrirMenuDefensa de match.js, cartas_ui.js y jugadon_ui.js sobre el
   partido de mentira) en las situaciones con los rótulos más largos, y mide
   cada texto con la tipografía real (_metricas.js lee los .ttf). Como
   o1_franja, falla si algo se sale de su lugar:
     [1] ningún texto de la cruz baja de balance.legibilidad.texto_decision_min
     [2] cada rótulo entra en su botón (con el aire de cada lado)
     [3] los botones no se pisan entre sí, ni con los retratos, ni con la
         fila de las fichas, contando el canto de abajo; todo en el lienzo
     [4] la etiqueta más larga, "🌟 GAMBETA-TIRO (quedan 2)", entra entera
     [5] el contraste del motivo bloqueado: 4,5:1 o más, también con protanopía
     [6] la Definición y el jugadón: sus botones a 13 px o más
     [7] el botón DIBUJADO cae en su caja aunque se vista en pleno vuelo

   Pedido de Rodri del 17/oct ("hay muchos botones de acciones"): lo
   especial (el megatiro, las fichas del jugadón, la megacorrida, la
   combinada, las megadefensas, la carta) salió de la cruz y vive atrás de
   ★ ESPECIAL, en una grilla propia. Por eso se suman dos situaciones que
   abren esa grilla tocando el centro, y [4] busca GAMBETA-TIRO ahí.

   La poda pedida por Rodri el 22/oct apaga casi todo eso con sus perillas
   (balance.flags). Se fija que vienen apagadas y que la cruz queda con el
   SÚPER TIRO solo en el centro; las demás situaciones prenden las perillas
   y miden el peor caso de siempre, que es lo que vuelve si se prenden.

   Corré:  node phaser/test/legibilidad_partido.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var PM = require("./_partido_de_mentira.js");
var MET = require("./_metricas.js");
var RAIZ = PM.RAIZ;
var BAL = JSON.parse(fs.readFileSync(path.join(RAIZ, "phaser/data/balance.json"), "utf8"));
var MEGA = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/megacosas.json"), "utf8"));
var L = BAL.legibilidad, CZ = L.cruz, PISO = L.texto_decision_min;
var CANTO = BAL.piel.canto_px;

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* el partido de mentira con lo que la cruz necesita, y los textos MEDIDOS */
function escena(mixinsExtra, comoViene) {
  var E = PM.escena({
    logicaAntes: ["phaser/logic/duel.js", "phaser/logic/lectura.js"],
    logica: ["phaser/logic/cartas.js", "phaser/logic/jugadon.js", "phaser/logic/piel.js"],
    mixins: ["phaser/scenes/cartas_ui.js", "phaser/scenes/jugadon_ui.js", "phaser/scenes/toque_ui.js"].concat(mixinsExtra || [])   // 20/oct: el rótulo del TIRO pregunta toqueEnArea
  });
  var s = E.s, W = E.W;
  W.PF = { texto: BAL.tipografia.texto, display: BAL.tipografia.display };
  W.Phaser.Math = { Clamp: function (v, a, b) { return Math.max(a, Math.min(b, v)); } };
  var crearTexto = s.add.text, crearRect = s.add.rectangle;
  var medir = function (o) {
    var px = parseInt(o.style.fontSize, 10);
    o.width = MET.ancho(o.text, { fuente: o.style.fontFamily, px: px });
    o.height = Math.round(px * 1.25);
  };
  s.add.text = function (x, y, t, st) {
    var o = crearTexto(x, y, t, st);
    var setText = o.setText;
    o.setText = function (v) { setText.call(o, v); medir(o); return o; };
    medir(o);
    return o;
  };
  s.add.rectangle = function (x, y, w, h, c, a) { var o = crearRect(x, y, w, h, c, a); o.fillColor = c; return o; };
  /* el retrato más ancho que hay: retrato_nelda.webp, 1600x1542 */
  s.add.image = function (x, y) { var o = crearRect(x, y, 1600, 1542); o.type = "Image"; return o; };
  s.retratoKey = function () { return "retrato"; };
  s.materializarDuelo = function () { };
  s.hayEscenas = function () { return true; };
  if (!comoViene) {
    s.FLAGS.v6_secuencias = true;
    ["cartas", "jugadon", "megadefensas", "pase_al_vacio", "megatiros_con_nombre"].forEach(function (k) { s.FLAGS[k] = true; });
    s.BAL.flags.envion = true;
  }
  s.MEGA = MEGA;
  s.game.registry.set("megacosas", MEGA);
  s.cameras.main.ignore = function () { };
  return E;
}
/* el botón del centro de la cruz (★ ESPECIAL), para abrir la grilla */
function centro(s) {
  return s.menuLayer.list.filter(function (o) {
    return o.type === "Rectangle" && !o.destruido && o.input && o.input.enabled && o.x === CZ.C[0] && o.y === CZ.C[1] && o.width === CZ.C[2];
  })[0];
}
function vos(s) { return s.st.mios.findIndex(function (j) { return j.pos === "ATA"; }); }

/* las cajas de lo que se ve en la capa del menú */
function cajas(s) {
  var out = [];
  s.menuLayer.list.forEach(function (o) {
    if (o.destruido) return;
    if (o.type === "Rectangle" || o.type === "Image") {
      var w = o.width * (o.type === "Image" ? (132 / o.height) : 1), h = o.type === "Image" ? 132 : o.height;
      out.push({ o: o, tipo: o.type, x0: o.x - w / 2, y0: o.y - h / 2, x1: o.x + w / 2, y1: o.y + h / 2, interactivo: !!(o.input && o.input.enabled) });
    }
  });
  return out;
}
function textos(s) { return s.menuLayer.list.filter(function (o) { return o.type === "Text" && !o.destruido; }); }
function cajaDeTexto(t) { return { x0: t.x - t.width / 2, x1: t.x + t.width / 2, y0: t.y - t.height / 2, y1: t.y + t.height / 2 }; }
function adentro(a, b, aire) { return a.x0 >= b.x0 + aire - 0.5 && a.x1 <= b.x1 - aire + 0.5 && a.y0 >= b.y0 - 0.5 && a.y1 <= b.y1 + 0.5; }
function sePisan(a, b) { return Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.5 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0.5; }

/* las situaciones con los rótulos más largos */
var SITUACIONES = [
  { n: "ataque en el área, nivel 5: MEGACORRIDA, TORNADO PAMPEANO con lectura, GAMBETA-TIRO", armar: function (s) {
    var st = s.st, i = vos(s);
    st.ctrl = i; st.posesion = "mia"; st.mios[i].esVos = true; st.mios[i].aguante = 1000; st.mios[i].x = 900;
    s._nivelCarrera = 5; st.minuto = 40;
    st.lectura = { usos: { tornado: { nivel: 0.95, ultimo: 40 } } };
    s.abrirMenuAtaque(1, false);
  } },
  { n: "ataque rendido en campo propio: todo bloqueado, la carta sin aguante", armar: function (s) {
    var st = s.st, i = vos(s);
    st.ctrl = i; st.posesion = "mia"; st.mios[i].esVos = true; st.mios[i].aguante = 20; st.mios[i].x = 200;
    st.mios.forEach(function (j, k) { if (k !== i) j.x = 20; });
    s._nivelCarrera = 1;
    s.abrirMenuAtaque(1, false);
  } },
  { n: "defensa, nivel 5: QUITE PAMPERO, BLOQUEO MÉDANO, la carta, SÚPER QUITE", armar: function (s) {
    var st = s.st, i = st.mios.findIndex(function (j) { return j.pos === "DEF"; });
    st.ctrl = i; st.posesion = "rival"; st.portadorRival = 9; st.mios[i].aguante = 1000; st.aguanteRival = 1000;
    s._nivelCarrera = 5;
    s.abrirMenuDefensa();
  } },
  { n: "ataque en el área, nivel 5, ★ ESPECIAL abierto", armar: function (s, E) {
    SITUACIONES[0].armar(s);
    assert(!!centro(s), "la cruz de ataque con algo especial disponible tiene ★ ESPECIAL en el centro");
    E.tocar(centro(s));
  } },
  { n: "defensa, nivel 5, ★ ESPECIAL abierto", armar: function (s, E) {
    SITUACIONES[2].armar(s);
    assert(!!centro(s), "la cruz de defensa tiene ★ ESPECIAL en el centro");
    E.tocar(centro(s));
  } },
  { n: "defensa rendida: la carta pide aguante", armar: function (s) {
    var st = s.st, i = st.mios.findIndex(function (j) { return j.pos === "DEF"; });
    st.ctrl = i; st.posesion = "rival"; st.portadorRival = 9; st.mios[i].aguante = 30;
    s._nivelCarrera = 1;
    s.abrirMenuDefensa();
  } },
  { n: "la poda: ataque en el área, nivel 5, con las perillas como vienen", comoViene: true, armar: function (s) {
    SITUACIONES[0].armar(s);
    var T = textos(s).map(function (t) { return t.text; });
    assert(!!centro(s) && T.indexOf("★ SÚPER TIRO") >= 0 && T.indexOf("★ ESPECIAL") < 0,
      "poda 22/oct: el centro de la cruz de ataque es el SÚPER TIRO, sin la grilla de ★ ESPECIAL (" + T.join(" | ") + ")");
    assert(!T.some(function (t) { return /GAMBETA-TIRO|MEGACORRIDA|COMBINADA|POTENCIAR|AL VACÍO|TORNADO|ATUEL|CALDÉN/.test(t); }),
      "poda 22/oct: la cruz no nombra nada de lo apagado");
  } },
  { n: "la poda: defensa, nivel 5, con las perillas como vienen", comoViene: true, armar: function (s) {
    SITUACIONES[2].armar(s);
    assert(!centro(s) && !textos(s).some(function (t) { return /ESPECIAL|PAMPERO|MÉDANO|SÚPER QUITE|PRESIÓN|BARRIDA/.test(t.text); }),
      "poda 22/oct: la cruz de defensa queda con QUITE, CORTE, BLOQUEO y NO MOVERSE, sin centro");
  } }
];

var vistos = [], chicos = [], afuera = [], pisados = [], fueraLienzo = [], gambetaTiro = null, bloqueados = 0;
assert(["cartas", "jugadon", "megadefensas", "pase_al_vacio", "megatiros_con_nombre", "envion", "v6_secuencias", "v6_definicion"].every(function (k) { return BAL.flags[k] === false; }),
  "poda 22/oct: balance.flags trae apagados cartas, jugadon, megadefensas, pase_al_vacio, megatiros_con_nombre, envion, v6_secuencias y v6_definicion");
SITUACIONES.forEach(function (sit) {
  var E = escena(null, sit.comoViene), s = E.s;
  sit.armar(s, E);
  var T = textos(s), C = cajas(s);
  /* [1] el tamaño */
  T.forEach(function (t) {
    vistos.push(t.text);
    if (parseInt(t.style.fontSize, 10) < PISO) chicos.push(sit.n + ": \"" + t.text + "\" a " + t.style.fontSize);
  });
  /* [2] cada rótulo adentro del botón que lo contiene (el centro del texto cae en él) */
  var botones = C.filter(function (c) { return c.tipo === "Rectangle" && c.x1 - c.x0 < 900 && c.o.fillAlpha > 0; });
  T.forEach(function (t) {
    var b = cajaDeTexto(t);
    var suyo = botones.filter(function (c) { return t.x > c.x0 && t.x < c.x1 && t.y > c.y0 && t.y < c.y1; })
      .sort(function (p, q) { return (p.x1 - p.x0) - (q.x1 - q.x0); })[0];
    if (!suyo) return;            // el título del menú, los nombres de los retratos
    if (!adentro(b, suyo, CZ.aire)) afuera.push(sit.n + ": \"" + t.text + "\" mide " + Math.round(t.width) + " y su botón deja " + Math.round(suyo.x1 - suyo.x0 - 2 * CZ.aire));
    if (/GAMBETA-TIRO \(quedan 2\)/.test(t.text)) gambetaTiro = { t: t, b: b, caja: suyo };
  });
  /* [3] los botones y los retratos no se pisan; los vestidos suman su canto */
  var solidos = C.filter(function (c) { return (c.tipo === "Image" || c.x1 - c.x0 < 900) && !(c.tipo === "Rectangle" && c.o.width === 96); });
  var botonesYRetratos = solidos.filter(function (c) { return c.tipo === "Image" || (c.tipo === "Rectangle" && c.o.fillAlpha > 0.9 && c.o.height >= 40); });
  botonesYRetratos.forEach(function (c) {
    if (c.x0 < 0 || c.x1 > 960 || c.y1 + (c.interactivo ? CANTO : 0) > 540) fueraLienzo.push(sit.n + ": " + c.tipo + " en " + Math.round(c.x0) + ".." + Math.round(c.x1));
  });
  for (var a = 0; a < botonesYRetratos.length; a++) for (var b2 = a + 1; b2 < botonesYRetratos.length; b2++) {
    var p = botonesYRetratos[a], q = botonesYRetratos[b2];
    if (p.tipo === "Image" && q.tipo === "Rectangle" && q.o.height === 142) continue;     // el retrato y su marco
    if (q.tipo === "Image" && p.tipo === "Rectangle" && p.o.height === 142) continue;
    var pc = { x0: p.x0, x1: p.x1, y0: p.y0, y1: p.y1 + (p.interactivo ? CANTO : 0) };
    var qc = { x0: q.x0, x1: q.x1, y0: q.y0, y1: q.y1 + (q.interactivo ? CANTO : 0) };
    if (sePisan(pc, qc)) pisados.push(sit.n + ": " + p.tipo + "@" + Math.round(p.o.x) + "," + Math.round(p.o.y) + " × " + q.tipo + "@" + Math.round(q.o.x) + "," + Math.round(q.o.y));
  }
  if (sit.n.indexOf("rendido") >= 0) bloqueados += s.menuLayer.list.filter(function (o) { return o.type === "Graphics"; }).length;
});

/* 20/oct, Rodri: en el área el TIRO decía "39% de zafar" y después decidía EL TOQUE */
(function () {
  var E = escena(), s = E.s, st = s.st, i = vos(s), A = s.BAL.toque.area;
  st.ctrl = i; st.posesion = "mia"; st.mios[i].esVos = true; st.mios[i].aguante = 1000;
  st.mios[i].x = st.W - A.largo_px / 2; st.mios[i].y = st.H / 2;
  s.abrirMenuAtaque(null, true);
  var t = textos(s).filter(function (o) { return /TOQUE|zafar/.test(o.text); })[0];
  var CE = CZ.E;
  assert(s.toqueEnArea() && t && t.text === "EL TOQUE: acomodate y pegá" && t.width <= CE[2] - 2 * CZ.aire,
    "en el área y sin marca, el TIRO dice EL TOQUE entero, sin recortar (" + (t && t.text) + ", " + (t && Math.round(t.width)) + " de " + (CE[2] - 2 * CZ.aire) + ")");
  /* pedido de Rodri del 20/oct, revisado: con un defensor al cruce el duelo
     del bloqueo se juega ANTES de EL TOQUE (resolverTiro), así que el TIRO
     muestra cuánto zafás y cuánto aguante gasta, y avisa que sigue EL TOQUE */
  s.limpiarMenu();
  s.abrirMenuAtaque(1, false);
  var u = textos(s).filter(function (o) { return /TOQUE|zafar/.test(o.text); })[0];
  assert(u && /^\d+% · \d+ aguante · TOQUE$/.test(u.text) && u.text.indexOf(" " + s.BAL.aguante.costo_tiro + " aguante") > 0 && u.width <= CE[2] - 2 * CZ.aire,
    "en el área con un defensor al cruce, el TIRO dice el porcentaje de zafar, el aguante y TOQUE, sin recortar (" + (u && u.text) + ", " + (u && Math.round(u.width)) + ")");
})();
assert(vistos.length > 40,"se armaron las cuatro cruces y las dos grillas de ★ ESPECIAL (" + vistos.length + " textos)");
assert(chicos.length === 0, "ningún texto de la cruz baja de " + PISO + " px:\n     " + chicos.join("\n     "));
console.log("[1] " + vistos.length + " textos en 4 cruces y 2 grillas, todos a " + PISO + " px o más");
assert(afuera.length === 0, "cada rótulo entra en su botón:\n     " + afuera.join("\n     "));
console.log("[2] cada rótulo adentro de su botón, con " + CZ.aire + " de aire de cada lado");
assert(pisados.length === 0, "SÍNTOMA DEL FOGONAZO ENCIMA DE PASE Y TIRO: botones o retratos que se pisan:\n     " + pisados.join("\n     "));
assert(fueraLienzo.length === 0, "nada se sale del lienzo de 960x540:\n     " + fueraLienzo.join("\n     "));
console.log("[3] ni los botones ni los retratos se pisan (con el canto de " + CANTO + " px), todo en el lienzo");
assert(!!gambetaTiro, "★ ESPECIAL ofrece \"🌟 GAMBETA-TIRO (quedan 2)\"");
if (gambetaTiro) {
  assert(gambetaTiro.t.text === "🌟 GAMBETA-TIRO (quedan 2)" && adentro(gambetaTiro.b, gambetaTiro.caja, CZ.aire),
    "\"🌟 GAMBETA-TIRO (quedan 2)\" entra ENTERA (" + Math.round(gambetaTiro.t.width) + " en " + Math.round(gambetaTiro.caja.x1 - gambetaTiro.caja.x0 - 2 * CZ.aire) + ")");
  console.log("[4] \"🌟 GAMBETA-TIRO (quedan 2)\": " + Math.round(gambetaTiro.t.width) + " px en un botón que deja " + Math.round(gambetaTiro.caja.x1 - gambetaTiro.caja.x0 - 2 * CZ.aire));
}
/* lo que se recorta para que entre: nunca una palabra a la mitad, y la
   lectura del rival ("👁👁👁 te la vieron toda") queda con sus ojos. Desde el
   17/oct el botón de ★ ESPECIAL mide 290 y no 180: ahora entran el ícono y
   el costo, y lo que se pide es lo mismo, el nombre entero y los ojos. */
assert(vistos.some(function (t) { return /^(🔥 )?TORNADO PAMPEANO$/.test(t); }) && !vistos.some(function (t) { return /DISPARO DEL CAL$|TORNADO PAMPE$/.test(t); }),
  "el especial va con su nombre entero (sin el ícono si no entra), no cortado a 15 letras");
assert(vistos.some(function (t) { return t.indexOf("👁👁👁 te la vieron toda") === 0; }), "si te tienen leído, ★ ESPECIAL lo dice con los ojos y la palabra (" + vistos.filter(function (t) { return /vieron|leído|ficha/.test(t); }).join(" | ") + ")");
assert(bloqueados >= 3, "las opciones bloqueadas llevan el rayado dibujado (" + bloqueados + " de 3)");
assert(!vistos.some(function (t) { return /▨/.test(t); }), "el bloqueo no viaja en el glifo ▨, que no está en las tipografías del juego");
assert(MET.ajenas("▨", "texto").length === 1, "control: ▨ no está en Pixelify Sans ni en VT323 (por eso se dibuja)");

/* ---------- [5] EL CONTRASTE DEL MOTIVO BLOQUEADO ----------
   Los colores salen de lo que pintó la cruz, no de una constante del test. */
function lin(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
function rgb(c) { c = typeof c === "number" ? c : parseInt(String(c).replace("#", ""), 16); return [(c >> 16) & 255, (c >> 8) & 255, c & 255]; }
function lum(L3) { return 0.2126 * L3[0] + 0.7152 * L3[1] + 0.0722 * L3[2]; }
function contraste(a, b) { var x = lum(rgb(a).map(lin)), y = lum(rgb(b).map(lin)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
/* protanopía: Viénot, Brettel y Mollon (1999), en RGB lineal */
function contrasteProt(a, b) {
  var p = function (c) { var v = rgb(c).map(lin); var rg = 0.11238 * v[0] + 0.88762 * v[1]; return [rg, rg, 0.00401 * v[0] - 0.00401 * v[1] + v[2]]; };
  var x = lum(p(a)), y = lum(p(b));
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
(function () {
  assert(Math.abs(contraste("#c76a5e", 0x333d36) - 3.04) < 0.01 && Math.abs(contrasteProt("#c76a5e", 0x333d36) - 2.49) < 0.02,
    "control: el rojo de antes da 3,04:1 y 2,49 con protanopía, lo que midió la auditoría");
  var E = escena(), s = E.s;
  SITUACIONES[1].armar(s);
  var rects = s.menuLayer.list.filter(function (o) { return o.type === "Rectangle" && o.fillColor === 0x333d36; });
  var motivos = textos(s).filter(function (t) { return /SIN AGUANTE|no llega|COMPAÑERO/i.test(t.text); });
  assert(rects.length >= 3 && motivos.length >= 3, "control: la cruz rendida tiene tres opciones bloqueadas con su motivo (" + rects.length + ", " + motivos.length + ")");
  var peor = 99, peorP = 99;
  motivos.forEach(function (t) { peor = Math.min(peor, contraste(t.style.color, 0x333d36)); peorP = Math.min(peorP, contrasteProt(t.style.color, 0x333d36)); });
  assert(peor >= 4.5 && peorP >= 4.5, "SÍNTOMA DEL MOTIVO QUE NO SE LEE: el motivo bloqueado da " + peor.toFixed(2) + ":1 (" + peorP.toFixed(2) + " con protanopía) y hacen falta 4,5");
  var titulos = textos(s).filter(function (t) { return t.style.color === "#b9c3bc"; });
  var tPeor = 99;
  titulos.forEach(function (t) { tPeor = Math.min(tPeor, contraste(t.style.color, 0x333d36), contrasteProt(t.style.color, 0x333d36)); });
  assert(titulos.length >= 3 && tPeor >= 4.5, "y el nombre de la opción bloqueada también (" + tPeor.toFixed(2) + ":1)");
  console.log("[5] el motivo bloqueado: " + peor.toFixed(2) + ":1 (" + peorP.toFixed(2) + " con protanopía) · el nombre: " + tPeor.toFixed(2) + ":1 · antes 3,04 (2,49)");
})();

/* ---------- [6] LA DEFINICIÓN Y EL JUGADÓN ---------- */
(function () {
  var mal6 = [];
  ["definicion_ui.js", "jugadon_ui.js", "cartas_ui.js"].forEach(function (f) {
    var src = fs.readFileSync(path.join(RAIZ, "phaser/scenes", f), "utf8");
    var re = /fontSize:\s*"(\d+)px"/g, m;
    while ((m = re.exec(src))) if (+m[1] < PISO) mal6.push(f + ":" + src.slice(0, m.index).split("\n").length + " a " + m[1] + " px");
    var rn = /PampaPiel\.nivel\((\d)\)/g;
    while ((m = rn.exec(src))) if (BAL.piel && [null, 24, 16, 13, 12][+m[1]] < PISO) mal6.push(f + ":" + src.slice(0, m.index).split("\n").length + " nivel(" + m[1] + ")");
  });
  assert(mal6.length === 0, "ningún texto de la Definición ni del jugadón baja de " + PISO + " px:\n     " + mal6.join("\n     "));
  /* los botones de verdad, armados con su código */
  var E = escena(), s = E.s;
  s.cineContent = s.add.container();
  s._jg = { sprites: [], botones: [] };
  s.input.keyboard = null;
  var J = E.W.PampaJugadon;
  J.CIERRES.forEach(function (c, i) {
    var x = 480 + (i - (J.CIERRES.length - 1) / 2) * (224 + 8);
    s.jugadonBoton(x, 480, 224, c.n, 0xf6efdc, function () { });
  });
  var tj = s.cineContent.list.filter(function (o) { return o.type === "Text"; });
  assert(tj.length === J.CIERRES.length && tj.every(function (t) { return parseInt(t.style.fontSize, 10) >= PISO; }),
    "los botones del jugadón a " + PISO + " px (" + tj.map(function (t) { return t.style.fontSize; }).join(", ") + ")");
  var largo = tj.reduce(function (a, t) { return t.width > a.width ? t : a; }, { width: 0 });
  assert(largo.width <= 224 - 12, "\"" + largo.text + "\" entra en su botón de 224 (" + Math.round(largo.width) + ")");
  console.log("[6] Definición, jugadón y cartas sin textos debajo de " + PISO + " px · el cierre más largo, \"" + largo.text + "\", mide " + Math.round(largo.width));
})();

/* ---------- [7] EL BOTÓN DIBUJADO, EN SU CAJA ----------
   Revisión final del 17/oct: en la grilla de ★ ESPECIAL los botones se
   veían corridos y la columna derecha tapaba media izquierda ("a JUAN ·
   57%" salía cortado). Los botones entran volando (PampaFeel.aparecer) y
   vestirPendientes los viste en cualquier cuadro del vuelo: la cara quedaba
   pintada donde estaba el rect en ese cuadro. [1] a [3] miden la caja
   declarada y no lo veían. Esto viste los botones recién abiertos, en pleno
   vuelo, termina los tweens, corre un cuadro y mide la cara dibujada. */
(function () {
  var E = escena(["phaser/scenes/feel_ui.js", "phaser/scenes/piel_ui.js"]), s = E.s;
  Object.keys(E.W.PampaPielUI).forEach(function (k) { s[k] = E.W.PampaPielUI[k]; });
  s.game.registry.set("balance", BAL);
  var crearG = s.add.graphics;
  s.add.graphics = function () {
    var g = crearG();
    g.fillRoundedRect = function (x, y, w, h) { g.dibujo = { x: x, y: y, w: w, h: h }; return g; };
    return g;
  };
  SITUACIONES[3].armar(s, E);
  var botones = s.menuLayer.list.filter(function (o) {
    return o.type === "Rectangle" && !o.destruido && o.input && o.input.enabled && o.width === CZ.lista.w && o.height === CZ.lista.h;
  });
  var alAbrir = botones.map(function (r) { return { x: r.x, y: r.y }; });
  botones.forEach(function (r) { s.vestirBoton(r); });
  for (var i = 0; i < E.tweens.length; i++) {
    var c = E.tweens[i].cfg;
    [].concat(c.targets).forEach(function (t) {
      if (botones.indexOf(t) < 0) return;
      ["x", "y", "scale"].forEach(function (k) { if (typeof c[k] === "number") t[k] = c[k]; });
    });
    if (c.onComplete) c.onComplete();
  }
  s.events.emit("postupdate");
  var corridos = [];
  botones.forEach(function (r) {
    var cara = r._pielCapas[2], d = cara.dibujo;
    var x0 = cara.x + d.x * cara.scale, x1 = x0 + d.w * cara.scale, y0 = cara.y + d.y * cara.scale;
    var cx0 = r.x - r.width / 2, cy0 = r.y - r.height / 2;
    if (Math.abs(x0 - cx0) > 0.5 || Math.abs(x1 - (cx0 + r.width)) > 0.5 || Math.abs(y0 - cy0) > 0.5)
      corridos.push("caja " + Math.round(cx0) + ".." + Math.round(cx0 + r.width) + ", dibujado " + Math.round(x0) + ".." + Math.round(x1));
  });
  assert(botones.length >= 4, "la grilla de ★ ESPECIAL tiene sus botones de " + CZ.lista.w + " (" + botones.length + ")");
  assert(botones.some(function (r, k) { return r.x !== alAbrir[k].x; }),
    "los botones salen de su lugar al abrir (si no vuelan, [7] no prueba nada)");
  assert(corridos.length === 0, "SÍNTOMA DE LA COLUMNA TAPADA: la cara del botón no cae en su caja:\n     " + corridos.join("\n     "));
  console.log("[7] " + botones.length + " botones de ★ ESPECIAL vestidos en vuelo: la cara cae en su caja de " + CZ.lista.w + " al aterrizar");
})();

if (mal === 0) console.log("\n✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("\n✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
