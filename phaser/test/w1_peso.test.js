/* ============================================================================
   PAMPA STAR · W1 — LO QUE CARGA EL JUEGO NO PUEDE ENGORDAR SOLO

   El problema: las 32 piezas de arte entraron como PNG y el juego pasó a pedir
   34 MB en cada arranque. Este juego se comparte por link en un mensaje: 34 MB
   con datos es gente que cierra la pestaña antes de ver nada.

   Convertidos a WEBP calidad 88 quedaron en 5,28 MB — el 15%. En cel shading de
   tres tonos la diferencia visual es nula (verificado en pantalla).

   Este test no mide lo lindo: mide EL PESO, que es lo que se olvida. Y la
   trampa que evita es concreta — que la próxima tanda de arte entre en PNG "por
   ahora" y nadie se entere hasta que alguien vuelva a cronometrar.

   El procedimiento para convertir una tanda está en
   docs/COMO_PESAN_LOS_ASSETS.md.

   TANDA 1.0 (L06): el barrido no veía las caras, las identidades ni las
   rutas literales de intro.js y master.js: decía 3,43 MB y el juego carga
   7,77. Ahora las cuenta y los 14 PNG que quedan son una DEUDA a la vista
   (convertirlos espera el OK de Rodri). Ver "EL PESO REAL", abajo.

   Corré:  node phaser/test/w1_peso.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");

var ok = 0, mal = 0;
var omitidos = [];
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }
function mb(b) { return +(b / 1048576).toFixed(2); }

/* ---------- qué archivos pide el juego, según los manifiestos ---------- */
function loQueCargaPorManifiesto() {
  var out = [];
  var P = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/poses_manifest.json"), "utf8"));
  var base = P.base || "assets/poses/";
  Object.keys(P.poses || {}).forEach(function (id) {
    var p = P.poses[id];
    if (!p || p.cargar === false) return;                 // W2: guardada pero no cargada
    if (p.archivo) out.push(base + p.archivo);
    if (p.ciclo && p.ciclo.cuadros) p.ciclo.cuadros.forEach(function (c) { out.push(base + c); });
  });
  Object.keys(P.fondos || {}).forEach(function (id) {
    if (P.fondos[id].archivo) out.push(base + P.fondos[id].archivo);
  });
  ((P.hinchada && P.hinchada.siluetas) || []).forEach(function (s) {
    if (s.archivo) out.push((P.hinchada.base || base) + s.archivo);
  });
  var R = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/portraits_manifest.json"), "utf8"));
  (R.retratos || []).concat(R.personajes || []).forEach(function (r) {
    if (r && r.cargar !== false && r.archivo) out.push(r.archivo);
  });
  var T = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/tribuna.json"), "utf8"));
  (T.personajes || []).forEach(function (p) { if (p.retrato) out.push(p.retrato); });
  return out.filter(function (v, i, a) { return a.indexOf(v) === i; });
}

/* ══════════════════════════════════════════════════════════════════════
   TANDA 1.0 (L06, peso-real-y-webp) · EL PESO REAL.
   Lo que estaba mal, medido: este barrido leía solo poses, retratos y la
   tribuna, y decía "3,43 MB". El juego carga además las caras del editor
   (data/caras_manifest.json: 8 PNG, 2,11 MB; las piden el editor y el
   partido), las identidades de corrida (data/identidades_manifest.json:
   6 PNG, 1,51 MB; las pide el partido) y lo que intro.js y master.js piden
   por RUTA LITERAL, sin manifiesto (assets/ui: 12 archivos, 0,72 MB). El
   total real era 7,77 MB, a 0,23 del tope, y la regla "ningún PNG" no se
   cumplía para esos 14.
   Ahora el barrido los cuenta. Los 14 PNG quedan como DEUDA (no como
   falla): pasarlos a webp q88 (el procedimiento W1) deriva archivos de las
   ilustraciones de Rodri, y eso espera su OK. Un PNG NUEVO, que no sea uno
   de esos 14, sí es falla. */
var PNG_DEUDA = [
  "assets/poses/caras/cara_clasico.png", "assets/poses/caras/cara_rulos.png", "assets/poses/caras/cara_melena.png",
  "assets/poses/caras/cara_rapado.png", "assets/poses/caras/cara_colorado.png", "assets/poses/caras/cara_flequillo.png",
  /* OJOS (tanda 1.0): cara_tranqui.png salió de esta lista porque ya no se
     carga (en_rotacion:false en data/caras_manifest.json): quedan 13 */
  "assets/poses/caras/cara_mohicano.png",
  "assets/poses/identidades/jugador_rulos.png", "assets/poses/identidades/jugador_largo.png",
  "assets/poses/identidades/jugador_rapado.png", "assets/poses/identidades/jugador_colorado.png",
  "assets/poses/identidades/rival_flequillo.png", "assets/poses/identidades/rival_mohicano.png"
];
function leerJson(f) { return JSON.parse(fs.readFileSync(path.join(RAIZ, f), "utf8")); }
function loQueCargaAparte() {
  var out = [];
  var C = leerJson("data/caras_manifest.json");
  /* OJOS (tanda 1.0): la que está fuera de rotación no se baja, no pesa */
  (C.caras || []).forEach(function (c) { if (c && c.archivo && c.en_rotacion !== false) out.push({ f: (C.base || "assets/poses/caras/") + c.archivo, de: "caras" }); });
  var I = leerJson("data/identidades_manifest.json");
  /* 17/oct: y las versiones mirando a la izquierda ('izq'), que el partido también baja */
  (I.identidades || []).forEach(function (d) {
    if (d && d.archivo) out.push({ f: (I.base || "assets/poses/identidades/") + d.archivo, de: "identidades" });
    if (d && d.izq) out.push({ f: (I.base || "assets/poses/identidades/") + d.izq, de: "identidades" });
    /* 22/oct: y su pose de remate ('remate.archivo'), que el partido también baja */
    if (d && d.remate && d.remate.archivo) out.push({ f: (I.base || "assets/poses/identidades/") + d.remate.archivo, de: "identidades" });
  });
  /* OJOS (tanda 1.0): las poses de la semana se bajan POR DATO (master.js
     lee data/semana.json) sin mirar cargar:false; el caldén de DESCANSAR es
     la primera apagada que usa la semana, y sin esto su peso no se contaba */
  var P = leerJson("data/poses_manifest.json"), S = leerJson("data/semana.json");
  (S.opciones || []).forEach(function (o) {
    var p = o && o.pose && P.poses[o.pose];
    if (p && p.archivo && p.cargar === false) out.push({ f: (P.base || "assets/poses/") + p.archivo, de: "semana" });
  });
  /* las rutas literales: "../assets/…" escritas en el código de las escenas
     que las piden por nombre (como pide docs/COMO_PESAN_LOS_ASSETS.md) */
  ["phaser/scenes/intro.js", "phaser/scenes/master.js"].forEach(function (f) {
    fs.readFileSync(path.join(RAIZ, f), "utf8").replace(/"\.\.\/(assets\/[^"]+\.(?:webp|png|jpe?g))"/g, function (_, ruta) {
      out.push({ f: ruta, de: "literales" }); return _;
    });
  });
  return out;
}
function loQueCarga() {
  return loQueCargaPorManifiesto().concat(loQueCargaAparte().map(function (x) { return x.f; }))
    .filter(function (v, i, a) { return a.indexOf(v) === i; });
}

/* ---------- [1] NINGÚN PNG EN LO QUE CARGA EL JUEGO (salvo la deuda) ---------- */
(function () {
  var lista = loQueCarga();
  assert(lista.length > 40, "el barrido tiene que encontrar los assets (encontró " + lista.length + ")");
  var aparte = loQueCargaAparte();
  ["caras", "identidades", "literales"].forEach(function (g) {
    assert(aparte.some(function (x) { return x.de === g; }), "el barrido cuenta también " + g);
  });
  var pngs = lista.filter(function (f) { return /\.png$/i.test(f); });
  var nuevos = pngs.filter(function (f) { return PNG_DEUDA.indexOf(f) < 0; });
  assert(nuevos.length === 0,
    "estos assets se cargan en PNG y tendrían que ser .webp (pesan ~7 veces más):\n        " + nuevos.join("\n        "));
  var deuda = pngs.filter(function (f) { return PNG_DEUDA.indexOf(f) >= 0; });
  if (deuda.length) {
    var pd = deuda.reduce(function (t, f) { return t + fs.statSync(path.join(RAIZ, f)).size; }, 0);
    console.log("DEUDA: " + deuda.length + " PNG en lo que carga el juego (" + mb(pd) + " MB: las caras del editor y las identidades de corrida). " +
      "Pasarlos a webp q88 (procedimiento W1, docs/COMO_PESAN_LOS_ASSETS.md) los baja a una fracción, pero deriva archivos de las ilustraciones de Rodri: espera su OK. " +
      deuda.map(function (f) { return f.split("/").pop(); }).join(", "));
  }
  console.log("[1] " + lista.length + " assets cargados, " + (pngs.length - deuda.length) + " PNG fuera de la deuda" + (deuda.length ? " (" + deuda.length + " en la deuda)" : ""));
})();

/* ---------- [2] EL PESO TOTAL, CON TOPE ---------- */
(function () {
  var lista = loQueCarga(), total = 0, faltan = [];
  lista.forEach(function (f) {
    var p = path.join(RAIZ, f);
    if (!fs.existsSync(p)) { faltan.push(f); return; }
    total += fs.statSync(p).size;
  });
  assert(faltan.length === 0, "estos archivos se declaran y NO existen: " + faltan.join(", "));
  /* el tope: 8 MB. Se puso cuando el barrido decía 5,3 (y después 3,43) para
     dejar lugar a una tanda más, muy por debajo de los 34 que había. L06:
     contado de verdad (con caras, identidades y rutas literales) son 7,77,
     a 0,23 del tope: la próxima pieza que entre en PNG lo pasa. Convertir los
     14 PNG de la deuda lo deja en unos 5. Si una tanda futura lo pasa, el
     test lo dice antes de que alguien tenga que cronometrar. */
  var TOPE = 8;
  assert(mb(total) <= TOPE,
    "lo que carga el juego pesa " + mb(total) + " MB y el tope es " + TOPE +
    ". Convertí la tanda nueva a webp (ver docs/COMO_PESAN_LOS_ASSETS.md).");
  /* L06: el total REAL, por partes, y la meta de la conversión: con los 14
     PNG en webp, 5 MB o menos */
  var porGrupo = { manifiestos: 0, caras: 0, identidades: 0, literales: 0, semana: 0 };
  loQueCargaPorManifiesto().forEach(function (f) { var p = path.join(RAIZ, f); if (fs.existsSync(p)) porGrupo.manifiestos += fs.statSync(p).size; });
  var vistos = {};
  loQueCargaAparte().forEach(function (x) {
    if (vistos[x.f]) return; vistos[x.f] = 1;
    var p = path.join(RAIZ, x.f); if (fs.existsSync(p)) porGrupo[x.de] += fs.statSync(p).size;
  });
  var pngsAhora = lista.filter(function (f) { return /\.png$/i.test(f); }).length;
  if (pngsAhora === 0) assert(mb(total) <= 5, "convertidos los PNG, lo que carga el juego tiene que quedar en 5 MB o menos (pesa " + mb(total) + ")");
  console.log("[2] lo que carga el juego, DE VERDAD: " + mb(total) + " MB (tope " + TOPE + "): manifiestos " + mb(porGrupo.manifiestos) +
    " + caras " + mb(porGrupo.caras) + " + identidades " + mb(porGrupo.identidades) + " + rutas literales " + mb(porGrupo.literales) + " + semana (apagadas) " + mb(porGrupo.semana));
})();

/* ---------- [3] LA FUENTE NO SE PERDIÓ ---------- */
(function () {
  /* la copia .webp no reemplaza al original: lo deriva. Si se pierde el PNG no
     se puede volver a generar con otra calidad ni medir la geometría. */
  var F = path.join(RAIZ, "assets/_fuente");
  /* X2 · SIN FUENTE NO ES UNA FALLA, ES UN OMITIDO.
     El zip de distribución deja esta carpeta afuera a propósito: son 36 MB de
     PNG que no hacen falta para jugar. Marcarlo como falla haría que el juego
     pareciera roto en el zip cuando está perfecto.
     Lo que SÍ se sigue verificando siempre, esté o no la fuente, es que ningún
     manifiesto apunte ahí — eso no depende de que la carpeta exista. */
  if (!fs.existsSync(F)) {
    omitidos.push("[3] la fuente no se perdió — no está assets/_fuente (el zip de distribución la deja afuera a propósito; con el repo completo este bloque corre)");
    var todosSinFuente = loQueCarga().join("|");
    assert(todosSinFuente.indexOf("_fuente") < 0, "ningún manifiesto puede apuntar a assets/_fuente: es fuente, no carga");
    return;
  }
  var n = 0, peso = 0;
  ["poses", "retratos", "ui"].forEach(function (d) {
    var dd = path.join(F, d);
    if (!fs.existsSync(dd)) return;
    fs.readdirSync(dd).forEach(function (f) {
      if (!/\.png$/i.test(f)) return;
      n++; peso += fs.statSync(path.join(dd, f)).size;
    });
  });
  assert(n >= 50, "la carpeta de fuente tiene que tener los originales (encontré " + n + ")");
  /* y NO puede estar adentro de lo que sirve el juego por accidente: se
     verifica que ningún manifiesto apunte ahí */
  var todos = loQueCarga().join("|");
  assert(todos.indexOf("_fuente") < 0, "ningún manifiesto puede apuntar a assets/_fuente: es fuente, no carga");
  console.log("[3] fuente a salvo: " + n + " PNG originales (" + mb(peso) + " MB) fuera de la carga");
})();

/* ---------- [4] W2 · LO QUE NO SE VE, NO SE CARGA ---------- */
(function () {
  var P = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/poses_manifest.json"), "utf8"));
  var apagadas = Object.keys(P.poses || {}).filter(function (id) { return P.poses[id].cargar === false; });
  assert(apagadas.length >= 5, "las piezas sin lugar tienen que estar apagadas (hay " + apagadas.length + ")");
  apagadas.forEach(function (id) {
    assert(typeof P.poses[id]._W2 === "string" && P.poses[id]._W2.length > 40,
      "'" + id + "' está apagada pero no dice DÓNDE iría — sin eso nadie la va a prender nunca");
  });
  /* y el cargador tiene que respetarlo, o la perilla no sirve */
  var SRC = fs.readFileSync(path.join(RAIZ, "phaser/scenes/match.js"), "utf8");
  assert(/p\.cargar === false/.test(SRC), "el preload de poses tiene que saltear las que tienen cargar:false");
  var MAS = fs.readFileSync(path.join(RAIZ, "phaser/scenes/master.js"), "utf8");
  assert(/p\.cargar === false/.test(MAS), "y el de personajes también");
  console.log("[4] " + apagadas.length + " poses apagadas con su lugar propuesto escrito: " + apagadas.join(", "));
})();

/* ---------- [5] W3 · EL RIVAL SE LLAMA COMO RIVAL ---------- */
(function () {
  var P = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/poses_manifest.json"), "utf8"));
  var r = P.poses.r_corriendo;
  assert(!!r, "tiene que existir la pose r_corriendo");
  assert(/^poseR_/.test(r.archivo),
    "el archivo del rival tiene que empezar con poseR_ como los otros dos del bando (dio " + r.archivo + ")");
  assert(!fs.existsSync(path.join(RAIZ, "assets/poses/pose_corriendo_v2.webp")),
    "pose_corriendo_v2 no puede seguir existiendo con ese nombre: hacía pasar a un rival por pose propia");
  /* la convención completa */
  ["r_corriendo", "r_arquero_vuela", "r_quite"].forEach(function (id) {
    assert(P.poses[id] && /^poseR_/.test(P.poses[id].archivo),
      "'" + id + "' tiene que apuntar a un archivo poseR_*");
  });
  console.log("[5] las tres poses del rival usan la convención poseR_*");
})();

omitidos.forEach(function (o) { console.log("  ⊘ OMITIDO · " + o); });
console.log(mal === 0
  ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." + (omitidos.length ? " (" + omitidos.length + " omitido)" : "")
  : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
