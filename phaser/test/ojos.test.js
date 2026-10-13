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
     [4] el arquero: el cine del remate común le pedía a figuraArquero
         "planoArquero" y "planoDesenlace" a secas, y todo pedido sin la
         palabra "rival" era TU arquero: el rival te retenía el remate con tu
         buzo azul, de rodillas y con los ojos cerrados
         (arquero_ataja_celeste), y esa pose estaba desde el primer cuadro.
         Se prueba el bando explícito, que tu arquero ataja con el despeje
         (ojos abiertos) en la Definición y en "te rematan", que nadie pide
         ya arquero_ataja_celeste (apagada) y, con la escena de verdad, que
         en la revelación el rival pasa a su pose de rodillas con la pelota
         del juego en el hueco del manifest.
     [5] el cabezazo: el hueco de la pelota recortada se come la frente, los
         ojos y la nariz. En la Definición la pelota arrancaba en un punto
         fijo (W*0,42, H*0,6) y la figura salía SIN CARA a 400 px; en la
         ráfaga del opening, también (y la chilena pateaba un agujero). Con
         el teatro de verdad: remate, chilena y cabezazo arrancan con la
         pelota en su hueco y de su tamaño; la del cabezazo no se despega
         (va detrás y sigue la sacudida); el opening la pone en su lugar.
     [6] el festejo: el gol (remate, aéreo, Definición, jugadón, opening)
         mostraba pose_festejo, con los ojos en arquito; en el teléfono se
         lee como ojos cerrados y es la que más se ve (una por gol). Se
         cruzaron las entradas del manifest: 'festejo' apunta al grito con
         los ojos abiertos (pose_celebracion.webp) y 'celebracion', que pide
         solo el asado de la semana, a la risa. Cada archivo con SUS tonos.
         REVISIÓN DEL LOTE: con el archivo nuevo, la sombra gris del short
         caía en la camiseta (a 66 de su tono, tolerancia 95) y salía con
         manchas del color de tu camiseta. Se tiñe de verdad (tenirFilas)
         con cada piel y cada camiseta: el short no cambia (croma_min) y la
         camiseta y la piel se tiñen igual.
     [7] la semana: la de cansado (ojos apretados, sudando) estaba en
         DESCANSAR (agotada después de no hacer nada) y en ESTUDIAR (se leía
         dormida sobre los apuntes). Pasa a ENTRENAR AGUANTE; DESCANSAR va
         con el caldén y ESTUDIAR con la de espaldas; ninguna figura se
         repite en la tira, con ningún origen.

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

/* ---------- [4] EL ARQUERO: EL BANDO Y LOS OJOS CERRADOS ---------- */
/* el ancho y alto de un webp/png del repo, leyendo la cabecera */
function medidas(rel) {
  var b = fs.readFileSync(path.join(RAIZ, rel));
  if (b[0] === 0x89 && b.toString("ascii", 1, 4) === "PNG") return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  var t = b.toString("ascii", 12, 16);
  if (t === "VP8 ") return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  if (t === "VP8L") { var v = b.readUInt32LE(21); return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 }; }
  return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };   // VP8X
}
new Function("window", "Phaser", leer("phaser/scenes/definicion_ui.js").replace(/\r\n/g, "\n"))(W, W.Phaser);
function escenaConPoses() {
  var cargadas = {};
  Object.keys(POSES.poses).forEach(function (id) { if (POSES.poses[id].cargar !== false) cargadas["pose_" + id] = true; });
  var e = Object.create(W.PampaMatch.prototype);
  e.FLAGS = {}; e.BAL = BAL;
  e.game = { registry: { get: function (k) { return k === "poses" ? POSES : k === "caras" ? CARAS : null; } } };
  e.textures = {
    exists: function (k) { return !!cargadas[k] || k === "ball" || k === "ball_hd"; },
    get: function (k) { return { getSourceImage: function () { return { height: k === "ball_hd" ? 128 : 16, width: k === "ball_hd" ? 128 : 16 }; } }; }
  };
  e.tweens = { killTweensOf: function () { } };
  return e;
}
(function () {
  var e = escenaConPoses();
  /* el cine del remate es SIEMPRE tu remate: el arquero es el rival */
  assert(e.figuraArquero("vuela", "planoArquero (arquero rival)", true) === "pose_arquero_vuela", "el arquero rival vuela con SU arte (arquero_vuela)");
  assert(e.figuraArquero("ataja", "planoDesenlace (arquero rival)", true) === "pose_arquero_ataja", "y la agarra con SU arte (arquero_ataja)");
  /* el bando explícito manda sobre el nombre de quien la pide */
  assert(e.figuraArquero("vuela", "planoArquero", true) === "pose_arquero_vuela", "esRival=true sin la palabra 'rival' en el pedido: igual es el rival");
  assert(e.figuraArquero("vuela", "algo rival", false) === "pose_arquero_vuela_celeste", "esRival=false manda aunque el pedido diga 'rival'");
  /* TU arquero: ataja con el despeje (ojos abiertos), nunca de rodillas con los ojos cerrados */
  ["ataja", "atajada", "retiene", "despeje"].forEach(function (a) {
    assert(e.figuraArquero(a, "texturaEscena(tu arquero)") === "pose_arquero_despeje_celeste",
      "tu arquero que '" + a + "' es arquero_despeje_celeste (" + e.figuraArquero(a, "texturaEscena(tu arquero)") + ")");
  });
  assert(e.figuraArquero("vuela", "texturaEscena(tu arquero)") === "pose_arquero_vuela_celeste", "y vuela con la estirada celeste");
  /* los dos planos del remate dicen el bando (la regresión con nombre) */
  var M = leer("phaser/scenes/match.js");
  assert(/figuraArquero\("vuela", "planoArquero \(arquero rival\)", true\)/.test(M), "SÍNTOMA: planoArquero no le dice a figuraArquero que el arquero es el rival");
  assert(/figuraArquero\("vuela", "planoDesenlace \(arquero rival\)", true\)/.test(M),
    "SÍNTOMA: planoDesenlace no arranca con el arquero rival estirado (antes la pose de 'la agarró' estaba desde el primer cuadro y era la tuya)");
  assert(/if \(!corner && this\.ponerArqueroQueAtaja\(arq, ball\)\) return;/.test(M), "la atajada pasa a la pose de rodillas RECIÉN en la revelación");
  /* nadie pide la de los ojos cerrados, y está apagada */
  var ESC = ["match.js", "definicion_ui.js", "escenas_v9.js", "jugadon_ui.js", "cine_arte.js", "intro.js", "master.js"].map(function (f) {
    return leer("phaser/scenes/" + f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  }).join("\n");
  assert(ESC.indexOf("arquero_ataja_celeste") < 0, "ninguna escena pide arquero_ataja_celeste");
  assert(!/"arquero_ataja"/.test(leer("phaser/scenes/escenas_v9.js").replace(/\/\*[\s\S]*?\*\//g, "")), "'te rematan' ya no pasa a arquero_ataja (+_celeste)");
  assert(/poseDePlano\("arquero_despeje_celeste", arqM, false\)/.test(leer("phaser/scenes/escenas_v9.js")), "'te rematan': tu atajada es el despeje, con el id completo");
  var D = leer("phaser/scenes/definicion_ui.js");
  assert(/poseId = o\.gol \? "arquero_vuela" : "arquero_despeje";/.test(D), "el ¡ATAJADÓN! de la Definición es el despeje");
  var MEGA = json("data/megacosas.json");
  var usos = [];
  (function andar(x) { if (Array.isArray(x)) x.forEach(andar); else if (x && typeof x === "object") Object.keys(x).forEach(function (k) { if (k === "pose" && x[k] === "arquero_ataja_celeste") usos.push(x.id || "?"); andar(x[k]); }); })(MEGA);
  assert(usos.length === 0, "ninguna carta usa arquero_ataja_celeste (" + usos.join(", ") + ")");
  var tranquera = null;
  (function andar(x) { if (Array.isArray(x)) x.forEach(andar); else if (x && typeof x === "object") { if (x.id === "atajadon_arq") tranquera = x; Object.keys(x).forEach(function (k) { andar(x[k]); }); } })(MEGA);
  assert(tranquera && tranquera.pose === "arquero_vuela_celeste" && tranquera.momento === "salto", "LA TRANQUERA: la estirada (ojos abiertos) con su momento 'salto'");
  var at = POSES.poses.arquero_ataja_celeste;
  assert(at.cargar === false && typeof at._W2 === "string" && at._W2.length > 40, "arquero_ataja_celeste apagada (cargar:false) y dice dónde sí iría");
  assert(POSES.poses.arquero_despeje_celeste.cargar !== false && !POSES.poses.arquero_despeje_celeste.pelota,
    "el despeje se carga y no declara 'pelota' (la trae pintada: no se le dibuja otra)");

  /* la revelación de la atajada del remate común, con la escena de verdad */
  var dAt = medidas("assets/poses/" + POSES.poses.arquero_ataja.archivo);
  var arq = {
    active: true, x: 400, y: 330, flipX: false, angle: 0,
    setTexture: function (k) { this.k = k; this.width = dAt.w; this.height = dAt.h; return this; },
    setAngle: function (a) { this.angle = a; return this; },
    setScale: function (s) { this.scaleX = this.scaleY = s; this.displayWidth = this.width * s; this.displayHeight = this.height * s; return this; }
  };
  arq.setTexture("pose_arquero_vuela");
  var ball = {
    active: true, alpha: 0.4,
    setTexture: function (k) { this.k = k; return this; }, setScale: function (s) { this.s = s; return this; },
    setAlpha: function (a) { this.alpha = a; return this; }, setAngle: function () { return this; },
    setPosition: function (x, y) { this.x = x; this.y = y; return this; }
  };
  var debajo = null;
  e.cineContent = { moveBelow: function (a, b) { debajo = [a, b]; } };
  var hizo = e.ponerArqueroQueAtaja(arq, ball);
  var A = e.arcoCine(), p = POSES.poses.arquero_ataja.pelota;
  var esperaX = arq.x + (p.x - 0.5) * arq.displayWidth, esperaY = arq.y - arq.displayHeight + p.y * arq.displayHeight;
  assert(hizo && arq.k === "pose_arquero_ataja", "en la revelación, el arquero rival pasa a arquero_ataja (" + arq.k + ")");
  assert(Math.abs(arq.displayHeight - A.h * 1.15) < 0.5, "con la misma altura que el plano le da al arquero (" + arq.displayHeight.toFixed(1) + ")");
  assert(Math.abs(ball.x - esperaX) < 0.5 && Math.abs(ball.y - esperaY) < 0.5,
    "la pelota del juego queda en el hueco del manifest (" + ball.x.toFixed(1) + "," + ball.y.toFixed(1) + " contra " + esperaX.toFixed(1) + "," + esperaY.toFixed(1) + ")");
  var altoBola = ball.s * (ball.k === "ball_hd" ? 128 : 16);
  assert(Math.abs(altoBola - p.r * 2 * arq.displayHeight) < 0.5, "con el tamaño del hueco (" + altoBola.toFixed(1) + " px)");
  assert(ball.alpha === 1 && debajo && debajo[0] === ball && debajo[1] === arq, "entera y DETRÁS de la pose");
  console.log("[4] el arquero rival con su arte en el remate (estirado, y de rodillas recién al revelar, pelota en " + Math.round(ball.x) + "," + Math.round(ball.y) + "); tu arquero ataja con el despeje; nadie pide arquero_ataja_celeste");
})();

/* ---------- [5] EL CABEZAZO NO SE QUEDA SIN CARA ---------- */
W.PampaDefinicion = require(path.join(RAIZ, "phaser/logic/definicion.js"));
/* el teatro final de la Definición, de verdad, con una escena de mentira que
   anota qué se creó y qué se movió */
function teatro(poseTiro) {
  var e = escenaConPoses();
  var R = { sprites: [], tweens: [], debajo: null };
  function fig(x, y, key) {
    var id = String(key).replace(/^pose_/, ""), def = POSES.poses[id];
    var m = def ? medidas("assets/poses/" + def.archivo) : { w: key === "ball_hd" ? 128 : 16, h: key === "ball_hd" ? 128 : 16 };
    var o = {
      k: key, x: x, y: y, width: m.w, height: m.h, scaleX: 1, active: true, flipX: false,
      setScale: function (s) { this.scaleX = s; this.displayWidth = this.width * s; this.displayHeight = this.height * s; return this; },
      setPosition: function (a, b) { this.x = a; this.y = b; return this; },
      setOrigin: function () { return this; }, setAlpha: function () { return this; }, setAngle: function () { return this; },
      setFlipX: function (f) { this.flipX = f; return this; }
    };
    o.setScale(1);
    R.sprites.push(o);
    return o;
  }
  e.add = { image: fig, sprite: fig };
  e.cineContent = { add: function () { }, moveBelow: function (a, b) { R.debajo = [a, b]; } };
  e.tweens = { add: function (t) { R.tweens.push(t); }, killTweensOf: function () { } };
  e.time = { delayedCall: function () { } };
  e.cineBG = { clear: function () { }, fillStyle: function () { }, fillRect: function () { }, fillTriangle: function () { } };
  e.uiCam = { flash: function () { } };
  e.limpiarContenido = function () { }; e.fondoCine = function () { return true; };
  e.lineasVelocidad = function () { }; e.musicaDuck = function () { }; e.msV = function (v) { return v; };
  e.FLAGS = {};
  e.st = { mios: [{ nombre: "VOS", esVos: true }], ctrl: 0, rivales: [{ nombre: "R" }] };
  e._def = { fase: 3, zonaMia: 0, zonaCPU: 3, t: 0 };
  e.defTeatroFinal({ ofensiva: true, gol: false, bloqueado: false, poseTiro: poseTiro, res: { outcome: "atajada" }, dz: 1 });
  R.escena = e;
  R.pose = R.sprites.filter(function (s) { return s.k === "pose_" + poseTiro; })[0];
  R.pelota = R.sprites.filter(function (s) { return /^ball/.test(s.k); })[0];
  return R;
}
(function () {
  var cab = POSES.poses.cabezazo;
  assert(cab.pelota_en_la_cara === true && typeof cab._pelota_en_la_cara === "string" && cab._pelota_en_la_cara.length > 60,
    "el manifest marca el cabezazo con pelota_en_la_cara y dice por qué (el hueco se come la cara)");
  var conCara = Object.keys(POSES.poses).filter(function (id) { return POSES.poses[id].pelota_en_la_cara; });
  assert(conCara.join(",") === "cabezazo", "es la única pose con el hueco en la cara (" + conCara.join(",") + ")");
  ["cabezazo", "remate", "chilena"].forEach(function (id) {
    var R = teatro(id), p = POSES.poses[id].pelota, s = R.pose, b = R.pelota;
    if (!s || !b) { assert(false, id + ": el teatro no creó la pose o la pelota"); return; }
    var ex = s.x + (p.x - 0.5) * s.displayWidth, ey = s.y + (p.y - 0.5) * s.displayHeight;
    assert(Math.abs(b.x - ex) < 0.5 && Math.abs(b.y - ey) < 0.5,
      id + ": la pelota arranca en el hueco de la pose (" + b.x.toFixed(1) + "," + b.y.toFixed(1) + " contra " + ex.toFixed(1) + "," + ey.toFixed(1) + "; antes 403,324)");
    var alto = b.displayHeight;
    assert(Math.abs(alto - p.r * 2 * s.displayHeight) < 0.5, id + ": del tamaño del hueco (" + alto.toFixed(1) + " px)");
    var vuela = R.tweens.some(function (t) { return t.targets === b; });
    if (id === "cabezazo") {
      assert(!vuela, "cabezazo: la pelota NO se despega de la cara (si viajara, la figura queda sin cara todo el vuelo)");
      assert(R.debajo && R.debajo[0] === b && R.debajo[1] === s, "cabezazo: va detrás de la pose");
      var d = R.escena._def;
      assert(d.pelotaPegada && d.pelotaPegada.spr === b, "cabezazo: queda anotada para seguir la sacudida");
      /* la sacudida de esfuerzo mueve la pose: la pelota va con ella */
      d.shakeSpr = s; d.fase = 4;
      var x0 = s.x, y0 = s.y;
      for (var i = 0; i < 40; i++) R.escena.updateDefinicion(16);
      assert(Math.hypot(s.x - x0, s.y - y0) > 0.3, "cabezazo: la sacudida movió la pose (" + Math.hypot(s.x - x0, s.y - y0).toFixed(2) + " px)");
      assert(Math.abs(b.x - (s.x + d.pelotaPegada.dx)) < 0.01 && Math.abs(b.y - (s.y + d.pelotaPegada.dy)) < 0.01,
        "cabezazo: y la pelota la siguió, clavada en el hueco");
    } else {
      assert(vuela, id + ": la pelota sale del pie y viaja a la zona, como antes");
    }
  });
  /* el opening: la ráfaga pone la pelota en el hueco */
  var I = leer("phaser/scenes/intro.js");
  assert(/def && def\.pelota && this\.textures\.exists\("pose_pelota_vieja"\)/.test(I) && /this\.add\.container\(x, y, \[b, s\]\)/.test(I),
    "intro.js: poseImg pone la pelota de potrero DETRÁS de la pose que declara 'pelota', en un contenedor con ella");
  console.log("[5] el cabezazo con la pelota en la cara (detrás, pegada a la sacudida); remate y chilena salen del hueco y viajan; el opening la pone en su lugar");
})();

/* ---------- [6] EL FESTEJO DEL GOL CON LOS OJOS ABIERTOS ---------- */
(function () {
  var fe = POSES.poses.festejo, ce = POSES.poses.celebracion;
  /* cada archivo viaja con SUS tonos (los sampleados de ese webp): si no, el
     tinte con tu pinta reemplaza colores que no están en la ilustración */
  assert(fe.archivo === "pose_celebracion.webp" && fe.tonos.piel === "#fac194" && fe.tonos.camiseta === "#8cc5e9",
    "'festejo' (el gol, el opening, el precalentado) apunta a pose_celebracion.webp, con los tonos de ese archivo");
  assert(ce.archivo === "pose_festejo.webp" && ce.tonos.piel === "#fcceb4" && ce.tonos.camiseta === "#4bbff8",
    "'celebracion' (el asado de la semana) apunta a pose_festejo.webp, con los suyos");
  assert(typeof fe._cruce === "string" && /celebracion/.test(fe._cruce) && typeof ce._cruce === "string", "las dos dicen que están cruzadas y cómo volver");
  /* con 80 de tolerancia la sombra gris del short (a 70-80 de #fac194) se
     teñía con la piel, y el lote la bajó a 66 */
  assert(fe.tolerancias.piel <= 68 && typeof fe._tolerancias === "string" && fe._tolerancias.length > 60,
    "'festejo' tiñe la piel con tolerancia 66 (medida: la sombra del short está a 70-80) y lo dice (" + fe.tolerancias.piel + ")");
  /* REVISIÓN DEL LOTE: "con 66 el short queda blanco" no era cierto. Esa
     sombra está a 66,0 del tono de CAMISETA (#8cc5e9, tolerancia 95): lo que
     la piel dejó de agarrar lo agarraba la camiseta y el short salía con
     manchas del color de tu camiseta (ojos_27, bordó). Antes este bloque
     medía solo la distancia a la piel y pasaba en verde con la mancha puesta.
     Ahora se tiñe DE VERDAD, con mapaDeTinte, reglasDeTinte y tenirFilas de
     avatar_arte.js, para cada piel y cada camiseta del catálogo. Node no
     decodifica webp, así que los píxeles salen de lo medido con Pillow sobre
     pose_celebracion.webp: los 6 colores más comunes del short que alcanza
     la camiseta, el sobre de colores del short (croma 0-9 y luma 144 o más:
     32.215 de los 32.268 píxeles del short que alcanza alguna regla), los 6
     más comunes de la camiseta (65.592 píxeles) y los 6 más comunes de la
     piel (93.211). */
  new Function("window", "document", leer("phaser/scenes/avatar_arte.js"))(W, null);
  var AA = W.PampaAvatarArte;
  var SHORT_COMUNES = [[184, 186, 185], [185, 187, 186], [184, 186, 187], [186, 188, 187], [185, 187, 188], [185, 185, 185]];
  var CAMISETA_COMUNES = [[141, 197, 232], [139, 197, 232], [139, 197, 234], [138, 196, 233], [142, 198, 234], [140, 195, 231]];
  var PIEL_COMUNES = [[250, 193, 148], [251, 192, 148], [250, 194, 146], [251, 194, 150], [248, 194, 148], [251, 195, 148]];
  var sobre = SHORT_COMUNES.slice();
  for (var mn = 140; mn <= 255; mn++) for (var a1 = 0; a1 <= 9; a1++) for (var a2 = 0; a2 <= 9; a2++) for (var a3 = 0; a3 <= 9; a3++) {
    if (Math.min(a1, a2, a3) !== 0 || mn + Math.max(a1, a2, a3) > 255) continue;   // el mínimo es mn: cada color una vez
    if (0.299 * (mn + a1) + 0.587 * (mn + a2) + 0.114 * (mn + a3) < 144) continue;
    sobre.push([mn + a1, mn + a2, mn + a3]);
  }
  /* tiñe una fila de colores con la entrada y el look; devuelve cuáles cambiaron */
  function tenidos(def, look, colores) {
    var d = new Uint8ClampedArray(colores.length * 4);
    colores.forEach(function (c, i) { d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255; });
    var antes = new Uint8ClampedArray(d);
    AA.tenirFilas(d, colores.length, AA.reglasDeTinte(AA.mapaDeTinte(def, look, CARAS), 1), 0);
    return colores.filter(function (c, i) { return d[i * 4] !== antes[i * 4] || d[i * 4 + 1] !== antes[i * 4 + 1] || d[i * 4 + 2] !== antes[i * 4 + 2]; });
  }
  assert(fe.croma_min >= 10 && typeof fe._croma_min === "string" && fe._croma_min.length > 100,
    "'festejo' declara croma_min (el piso de color: blancos y grises no se tiñen) y dice lo medido (" + fe.croma_min + ")");
  var nPieles = A.CATALOGO.pieles.length, nCam = CARAS.camisetas.length;
  var shortTenido = [], camSinTenir = [], pielSinTenir = [];
  for (var tp = 1; tp <= nPieles; tp++) for (var tc = 1; tc <= nCam; tc++) {
    var look = A.validarLook({ tPiel: tp, tCam: tc });
    var t = tenidos(fe, look, sobre);
    if (t.length) shortTenido.push("piel " + tp + "/camiseta " + tc + ": " + t.length + " (ej. " + t[0].join(",") + ")");
    if (tenidos(fe, look, CAMISETA_COMUNES).length !== CAMISETA_COMUNES.length) camSinTenir.push(tp + "/" + tc);
    if (tenidos(fe, look, PIEL_COMUNES).length !== PIEL_COMUNES.length) pielSinTenir.push(tp + "/" + tc);
  }
  assert(shortTenido.length === 0,
    "SÍNTOMA: el short del festejo se tiñe (" + sobre.length + " colores del short, " + nPieles + " pieles x " + nCam + " camisetas): " + shortTenido.slice(0, 3).join(" · "));
  assert(camSinTenir.length === 0, "y la camiseta se sigue tiñendo entera con todas las combinaciones (" + camSinTenir.join(", ") + ")");
  assert(pielSinTenir.length === 0, "y la piel también (" + pielSinTenir.join(", ") + ")");
  /* la regresión: sin el piso, la sombra del short cae en la camiseta */
  var sinPiso = Object.assign({}, fe); delete sinPiso.croma_min;
  var bordo = CARAS.camisetas.findIndex(function (c) { return /bord/i.test(c.n); }) + 1;
  var conMancha = tenidos(sinPiso, A.validarLook({ tPiel: 2, tCam: bordo }), SHORT_COMUNES);
  assert(bordo > 0 && conMancha.length === SHORT_COMUNES.length,
    "sin croma_min, los 6 grises más comunes del short se tiñen con la camiseta bordó (" + conMancha.length + " de 6): el test muerde");
  /* quién pide cada una: el gol pide 'festejo' (sigue igual), solo el asado pide 'celebracion' */
  var D = leer("phaser/scenes/definicion_ui.js"), J = leer("phaser/scenes/jugadon_ui.js"), I = leer("phaser/scenes/intro.js");
  assert(/poseId = o\.gol \? "festejo"/.test(D), "el gol de la Definición pide 'festejo'");
  assert(/"festejo"/.test(J), "el gol del jugadón pide 'festejo'");
  assert(/this\.poseImg\("festejo"/.test(I) && BAL.intro.poses_intro.indexOf("festejo") >= 0, "el plano del gol del opening pide 'festejo'");
  var SEM = json("data/semana.json");
  var piden = SEM.opciones.filter(function (o) { return o.pose === "celebracion"; }).map(function (o) { return o.id; });
  assert(piden.join(",") === "asado", "'celebracion' la pide solo el asado (" + piden.join(",") + ")");
  var ESC = ["match.js", "definicion_ui.js", "escenas_v9.js", "jugadon_ui.js", "intro.js"].map(function (f) {
    return leer("phaser/scenes/" + f).replace(/\/\*[\s\S]*?\*\//g, "");
  }).join("\n");
  assert(!/"celebracion"/.test(ESC), "ninguna escena del partido ni el opening pide 'celebracion' (la risa de ojos cerrados queda para el asado)");
  var HASH = {
    "assets/poses/pose_festejo.webp": "f5ea764d04cfb5034cbb142a32778dc176f54147ca02b02958031641176abcd0",
    "assets/poses/pose_celebracion.webp": "48c49c0c7c8d216b1206d5d8d32b09a053787b80b9a61df6e0b9762fbb6c53d4"
  };
  Object.keys(HASH).forEach(function (f) {
    assert(crypto.createHash("sha256").update(fs.readFileSync(path.join(RAIZ, f))).digest("hex") === HASH[f], f + " intacto (se cruzó la entrada, no el archivo)");
  });
  console.log("[6] el gol muestra el grito con los ojos abiertos; la risa de ojos en arquito queda para el asado; los dos archivos intactos; teñido de verdad con " +
    nPieles + " pieles x " + nCam + " camisetas: " + sobre.length + " colores del short sin tocar (croma_min " + fe.croma_min + ")");
})();

/* ---------- [7] LA SEMANA: CANSADO DONDE ES ESFUERZO ---------- */
(function () {
  var SEM = json("data/semana.json");
  var op = function (id) { return SEM.opciones.filter(function (o) { return o.id === id; })[0]; };
  assert(op("entrenar_aguante").pose === "cansado", "ENTRENAR AGUANTE va con la de cansado (los ojos apretados son del esfuerzo: 'te dolió todo')");
  assert(op("descansar").pose === "calden" && op("descansar").pose_falta && op("descansar").pose_falta.length > 25,
    "DESCANSAR va con el caldén (la siesta), marcada de prestado con su porqué");
  assert(op("estudiar").pose === "de_espaldas_sin_pelota" && op("estudiar").pose_falta.length > 25,
    "ESTUDIAR va con la de espaldas (antes la de cansado se leía dormida sobre los apuntes)");
  var conCansado = SEM.opciones.filter(function (o) { return o.pose === "cansado"; }).map(function (o) { return o.id; });
  assert(conCansado.join(",") === "entrenar_aguante", "la de cansado sale solo en ENTRENAR AGUANTE (" + conCansado.join(",") + ")");
  /* en la tira de la semana dos acciones nunca tienen la misma figura: las
     marcas de origen salen de UNA sola pregunta (campo o escuela, no las dos) */
  var EV = json("data/eventos_temporada.json");
  var conMarca = (EV.origen || []).map(function (p, i) { return (p.opciones || []).some(function (o) { return o.marca; }) ? i : -1; }).filter(function (i) { return i >= 0; });
  assert(conMarca.length === 1, "las marcas de origen salen de una sola pantalla (" + conMarca.join(",") + "): campo y escuela no se juntan");
  var origenes = [null].concat(SEM.opciones.map(function (o) { return o.requiere_origen; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; }));
  origenes.forEach(function (og) {
    var poses = SEM.opciones.filter(function (o) { return !o.requiere_origen || o.requiere_origen === og; }).map(function (o) { return o.pose; });
    var rep = poses.filter(function (p, i) { return poses.indexOf(p) !== i; });
    assert(rep.length === 0, "con origen " + (og || "ninguno") + " ninguna figura se repite en la semana (" + rep.join(",") + ")");
  });
  /* el caldén está apagado para el partido pero la semana lo baja por dato */
  assert(POSES.poses.calden.cargar === false && /semana/i.test(POSES.poses.calden._W2), "el caldén sigue apagado para el partido y su _W2 dice que lo usa la semana");
  assert(/dSem\.opciones\.forEach\(\(o\) => \{ if \(o && o\.pose && necesarias\.indexOf\(o\.pose\) < 0\) necesarias\.push\(o\.pose\); \}\)/.test(leer("phaser/scenes/master.js")),
    "master.js baja las poses de la semana por dato (sin mirar cargar)");
  console.log("[7] la semana: cansado en ENTRENAR AGUANTE, el caldén en DESCANSAR, la de espaldas en ESTUDIAR; ninguna figura repetida por origen");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
