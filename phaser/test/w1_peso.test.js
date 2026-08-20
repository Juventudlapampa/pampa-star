/* ============================================================================
   PAMPA STAR · W1 — LO QUE CARGA EL JUEGO NO PUEDE ENGORDAR SOLO

   El problema: las 32 piezas de arte entraron como PNG y el juego pasó a pedir
   34 MB en cada arranque. Este juego se comparte por link de WhatsApp: 34 MB
   con datos es gente que cierra la pestaña antes de ver nada.

   Convertidos a WEBP calidad 88 quedaron en 5,28 MB — el 15%. En cel shading de
   tres tonos la diferencia visual es nula (verificado en pantalla).

   Este test no mide lo lindo: mide EL PESO, que es lo que se olvida. Y la
   trampa que evita es concreta — que la próxima tanda de arte entre en PNG "por
   ahora" y nadie se entere hasta que alguien vuelva a cronometrar.

   El procedimiento para convertir una tanda está en
   docs/COMO_PESAN_LOS_ASSETS.md.

   Corré:  node phaser/test/w1_peso.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }
function mb(b) { return +(b / 1048576).toFixed(2); }

/* ---------- qué archivos pide el juego, según los manifiestos ---------- */
function loQueCarga() {
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

/* ---------- [1] NINGÚN PNG EN LO QUE CARGA EL JUEGO ---------- */
(function () {
  var lista = loQueCarga();
  assert(lista.length > 40, "el barrido tiene que encontrar los assets (encontró " + lista.length + ")");
  var pngs = lista.filter(function (f) { return /\.png$/i.test(f); });
  assert(pngs.length === 0,
    "estos assets se cargan en PNG y tendrían que ser .webp (pesan ~7 veces más):\n        " + pngs.join("\n        "));
  console.log("[1] " + lista.length + " assets declarados, 0 en PNG");
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
  /* el tope: 8 MB. Está por encima de lo que pesa hoy (5,3) para dejar lugar a
     una tanda más, y muy por debajo de los 34 que había. Si una tanda futura lo
     pasa, el test lo dice antes de que alguien tenga que cronometrar. */
  var TOPE = 8;
  assert(mb(total) <= TOPE,
    "lo que carga el juego pesa " + mb(total) + " MB y el tope es " + TOPE +
    ". Convertí la tanda nueva a webp (ver docs/COMO_PESAN_LOS_ASSETS.md).");
  console.log("[2] lo que carga el juego: " + mb(total) + " MB (tope " + TOPE + ")");
})();

/* ---------- [3] LA FUENTE NO SE PERDIÓ ---------- */
(function () {
  /* la copia .webp no reemplaza al original: lo deriva. Si se pierde el PNG no
     se puede volver a generar con otra calidad ni medir la geometría. */
  var F = path.join(RAIZ, "assets/_fuente");
  assert(fs.existsSync(F), "tiene que existir assets/_fuente con los PNG originales");
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

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
