/* ============================================================================
   PAMPA STAR · TANDA 1.0 (OJOS) — LOS PERSONAJES CON LOS OJOS CERRADOS

   El pedido de Rodri: "hay un personaje que tiene los ojos cerrados, o
   acomodalo o sacalo". La auditoría miró las 85 ilustraciones; lo que estaba
   mal, medido:
     · la cara 'Tranqui' (cara_tranqui.png, la 8ª del manifest de caras) es la
       única de las ocho con los ojos cerrados. No salía solo en el editor: el
       partido les pone cara por hash del nombre a quienes no elegiste, y con
       data/roster_pampeano.json Santi y Mateo (el que juega al lado tuyo)
       caían en ella en TODOS los partidos (Damián y Santiago V. también,
       cuando les toca tu equipo). En el editor, desde Clásico, un solo toque
       a la izquierda caía en ella;
     · pose_cabezazo_v2 se bajaba en cada partido (104 KB) y no la pedía
       nadie: ojos cerrados y la pelota pintada adentro.
   Los PNG no se tocan (son de Rodri): se sacan de la rotación y de la carga.

   LO QUE SE PRUEBA:
     [1] el roster, con el manifest real y el _pedidoDeBusto de verdad de
         match.js: los 50 nombres, en los dos bandos, nunca resuelven a
         'tranqui' (antes: 4), y cambian SOLO los que caían ahí;
     [2] un look guardado con cara 7 da una cara que existe (Rulos, el
         reemplazo) y no tira; el editor cicla 7 caras y vuelve a la primera;
     [3] la carga: ni cara_tranqui.png ni pose_cabezazo_v2.webp están en lo
         que bajan el editor y el partido, ni en el PRECACHE de sw.js; los
         dos archivos siguen en disco con el mismo hash.

   Corré:  node phaser/test/ojos.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path"), crypto = require("crypto");
var RAIZ = path.join(__dirname, "..", "..");
function leer(f) { return fs.readFileSync(path.join(RAIZ, f), "utf8"); }
function json(f) { return JSON.parse(leer(f)); }

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

var A = require(path.join(RAIZ, "phaser/logic/avatar.js"));
var C = require(path.join(RAIZ, "phaser/logic/carga.js"));
var CARAS = json("data/caras_manifest.json"), POSES = json("data/poses_manifest.json");
var ROSTER = json("data/roster_pampeano.json");
var BAL = json("phaser/data/balance.json");

/* así lo hace index.html al arrancar */
A.setCatalogoManifest(A.configDeCaras(CARAS));
var iTranqui = CARAS.caras.findIndex(function (c) { return c.id === "tranqui"; });
var iRulos = CARAS.caras.findIndex(function (c) { return c.id === "rulos"; });

/* el partido de verdad (match.js) con un Phaser de mentira: solo hace falta
   _pedidoDeBusto, que lee el registry, las banderas y si la textura existe */
var W = { Phaser: { Scene: function () { } }, PF: {}, PampaAvatar: A };
new Function("window", "Phaser", leer("phaser/scenes/match.js").replace(/\r\n/g, "\n"))(W, W.Phaser);
var escena = Object.create(W.PampaMatch.prototype);
escena.FLAGS = { v7_caras: true };
escena.game = { registry: { get: function (k) { return k === "caras" ? CARAS : null; } } };
escena.textures = { exists: function (k) { return /^cara_/.test(k); } };

/* ---------- [1] EL ROSTER NUNCA CAE EN LA CARA DE OJOS CERRADOS ---------- */
(function () {
  assert(iTranqui >= 0 && CARAS.caras[iTranqui].en_rotacion === false,
    "data/caras_manifest.json marca 'tranqui' con en_rotacion:false");
  assert(CARAS.caras[iTranqui].reemplazo === "rulos" && typeof CARAS.caras[iTranqui]._fuera === "string" && CARAS.caras[iTranqui]._fuera.length > 60,
    "y dice quién toma su lugar (rulos) y por qué está afuera");
  var nombres = ROSTER.jugadores.map(function (j) { return j.nombre; });
  assert(nombres.length === 50, "el roster tiene los 50 nombres (" + nombres.length + ")");
  var antes = [], ahora = [], cambiaron = [];
  nombres.forEach(function (n) {
    [false, true].forEach(function (esRival) {
      var crudo = A.hashSemilla(n + (esRival ? "|r" : "|m")) % CARAS.caras.length;   // lo de antes
      if (crudo === iTranqui) antes.push(n + (esRival ? " (rival)" : ""));
      var P = escena._pedidoDeBusto({ nombre: n }, esRival);
      if (!P) { assert(false, "_pedidoDeBusto devolvió null para " + n); return; }
      if (P.base === "cara_tranqui") ahora.push(n + (esRival ? " (rival)" : ""));
      var idCrudo = CARAS.caras[crudo].id;
      if (P.base !== "cara_" + idCrudo) cambiaron.push(n + (esRival ? "|r" : "|m") + ": " + idCrudo + " → " + P.base.slice(5));
    });
  });
  /* la regresión con nombre: la auditoría los midió así */
  ["Santi", "Mateo", "Damián", "Santiago V."].forEach(function (n) {
    assert(antes.indexOf(n) >= 0, "antes del arreglo, " + n + " caía en 'tranqui' en tu equipo (el hash no cambió)");
  });
  assert(ahora.length === 0, "SÍNTOMA: estos siguen con la cara de ojos cerrados: " + ahora.join(", "));
  assert(cambiaron.length === antes.length && cambiaron.every(function (c) { return / → rulos$/.test(c); }),
    "cambian SOLO los que caían en 'tranqui', y pasan a Rulos (" + cambiaron.join(" · ") + ")");
  /* VOS y amigos: la cara elegida, con su reemplazo */
  var Pv = escena._pedidoDeBusto({ nombre: "VOS", esVos: true, look: { cara: iTranqui } }, false);
  assert(Pv && Pv.base === "cara_rulos", "VOS con un look guardado en 'tranqui' sale con Rulos (" + (Pv && Pv.base) + ")");
  console.log("[1] roster: antes " + antes.length + " en 'tranqui' (" + antes.join(", ") + "), ahora " + ahora.length + "; cambiaron " + cambiaron.length + ": " + cambiaron.join(" · "));
})();

/* ---------- [2] EL LOOK GUARDADO Y EL EDITOR ---------- */
(function () {
  var l;
  try { l = A.validarLook({ cara: iTranqui }); } catch (e) { assert(false, "validarLook({cara:7}) tiró: " + e.message); return; }
  assert(l.cara === iRulos && !!CARAS.caras[l.cara] && CARAS.caras[l.cara].en_rotacion !== false,
    "validarLook({cara:" + iTranqui + "}) da una cara que existe y está en rotación: Rulos (" + l.cara + ")");
  assert(A.validarLook({ cara: iTranqui + CARAS.caras.length }).cara === iRulos, "y con la vuelta del módulo (cara " + (iTranqui + CARAS.caras.length) + ") también");
  assert(A.validarLook({ cara: 0 }).cara === 0 && A.validarLook({}).cara === 0, "las demás no se tocan (Clásico sigue en 0)");
  /* el stepper del editor: siete pasos y vuelve a la primera, nunca la apagada */
  var vistas = [], v = 0;
  for (var k = 0; k < 7; k++) { v = A.ciclarCara(v, 1); vistas.push(v); }
  assert(v === 0 && vistas.indexOf(iTranqui) < 0 && new Set(vistas).size === 7,
    "► recorre 7 caras distintas y vuelve a Clásico (" + vistas.join(",") + ")");
  assert(A.ciclarCara(0, -1) !== iTranqui && CARAS.caras[A.ciclarCara(0, -1)].id === "mohicano",
    "◄ desde Clásico va a Mohicano, no a la de ojos cerrados (antes caía justo ahí)");
  var vueltas = [], w = 0;
  for (var q = 0; q < 7; q++) { w = A.ciclarCara(w, -1); vueltas.push(w); }
  assert(w === 0 && vueltas.indexOf(iTranqui) < 0, "◄ también da la vuelta entera sin pasar por ella (" + vueltas.join(",") + ")");
  /* el editor usa ese ciclo (y no el módulo de antes) */
  var ED = leer("phaser/scenes/editor.js");
  assert(/A\.ciclarCara\(A\.validarLook\(p\.look\)\.cara, d\)/.test(ED), "editor.js cicla la CARA con ciclarCara");
  assert(/c\.en_rotacion !== false/.test(ED), "y no baja la cara apagada");
  /* index.html le pasa al módulo el manifest entero (con los reemplazos) */
  assert(/setCatalogoManifest\(window\.PampaAvatar\.configDeCaras/.test(leer("phaser/index.html")), "index.html arranca con configDeCaras(caras)");
  console.log("[2] look guardado con cara " + iTranqui + " → " + CARAS.caras[l.cara].n + " · el editor cicla " + vistas.length + " caras y vuelve");
})();

/* ---------- [3] LA CARGA Y LOS ARCHIVOS ---------- */
(function () {
  var NO_SE_BAJAN = ["assets/poses/caras/cara_tranqui.png", "assets/poses/pose_cabezazo_v2.webp"];
  var editor = C.listaDelEditor(CARAS).map(function (x) { return x.ruta.replace(/^\.\.\//, ""); });
  var partido = C.listaDelPartido({ poses: POSES, caras: CARAS, portraits: json("data/portraits_manifest.json"), tribuna: json("data/tribuna.json") })
    .map(function (x) { return x.ruta.replace(/^\.\.\//, ""); });
  var opening = C.listaDelOpening(BAL.intro, POSES, []).map(function (x) { return x.ruta.replace(/^\.\.\//, ""); });
  var SW = leer("phaser/sw.js");
  var precache = SW.slice(SW.indexOf("const PRECACHE = ["), SW.indexOf("];", SW.indexOf("const PRECACHE = [")));
  NO_SE_BAJAN.forEach(function (f) {
    var nombre = f.split("/").pop();
    assert(editor.indexOf(f) < 0, nombre + " no está en lo que baja el editor");
    assert(partido.indexOf(f) < 0, nombre + " no está en lo que baja el partido");
    assert(opening.indexOf(f) < 0, nombre + " no está en lo del opening");
    assert(precache.indexOf(nombre) < 0, nombre + " no está en el PRECACHE de sw.js");
  });
  assert(editor.length === 7, "el editor baja 7 caras (" + editor.length + ")");
  assert(POSES.poses.cabezazo_v2.cargar === false && typeof POSES.poses.cabezazo_v2._W2 === "string" && POSES.poses.cabezazo_v2._W2.length > 40,
    "cabezazo_v2 está apagada (cargar:false) y dice por qué y dónde podría ir");
  /* el arte de Rodri no se toca: mismos bytes que antes del lote */
  var HASH = {
    "assets/poses/caras/cara_tranqui.png": "02126604f58ba0c17e87250aac84daa6e269bf27308b9f1ff706eee10eb88471",
    "assets/poses/pose_cabezazo_v2.webp": "eb9a5a08cd9afb990ff2ae042b09fc024accb4f746c1cd9e5e6ab894d032f561"
  };
  Object.keys(HASH).forEach(function (f) {
    var p = path.join(RAIZ, f);
    assert(fs.existsSync(p), f + " sigue en disco");
    if (fs.existsSync(p)) assert(crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex") === HASH[f], f + " tiene el mismo hash que antes (no se reprocesó)");
  });
  console.log("[3] ni la cara de ojos cerrados ni cabezazo_v2 se bajan (editor " + editor.length + " caras, partido " + partido.length + " archivos); los dos archivos intactos en disco");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
