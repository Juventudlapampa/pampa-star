/* ============================================================================
   PAMPA STAR · SIN TRABAS LA PRIMERA VEZ (tanda 1.0, L06 · trabas-cine)

   Lo que estaba mal, medido en el navegador con una pinta que no es la
   Original: lo pesado se hacía la PRIMERA vez que hacía falta, adentro del
   momento. Primera gambeta: abrir la cruz 107 ms (retratos), elegir GAMBETA
   64,5 ms (teñir gambeta_gana, la barrida naranja, los pies). Primer remate:
   el toque de TIRO 43,6 ms (teñir el remate; y en CADA remate 31 ms de los
   pesos de la pierna de la toma). Primer gol: teñir el festejo, 70,8 ms en
   pleno cine (un cuadro de 73). Y sin fps.limit, en una pantalla de 120 Hz
   el juego corría el doble de cuadros.

   Qué se prueba:
     [1] la cola por tajadas (logic/carga.js): gasta su presupuesto y le
         devuelve el cuadro al juego, sigue los trabajos partidos donde
         quedaron, no corre fuera de los ratos tranquilos y se vacía;
     [2] el teñido por tajadas da EXACTAMENTE los mismos bytes que el entero,
         y la textura recién existe al final (si la escena la tiñó antes, se
         descarta);
     [3] el partido encola lo de la primera gambeta, el primer remate y el
         primer gol con las mismas opciones que usa cada plano;
     [4] el tope de cuadros: con el algoritmo de Phaser 3.80 sacado del
         vendor, 60 justo da 46 cuadros por segundo en una pantalla de 60 Hz;
         61 da 60 en 60 y en 120 Hz;
     [5] ?perf=1: el cuadro más largo de los últimos 10 s, la cola y el halo.

   Corré:  node phaser/test/trabas_cine.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var RAIZ = path.join(__dirname, "..", "..");
function leer(f) { return fs.readFileSync(path.join(RAIZ, f), "utf8"); }
function json(f) { return JSON.parse(leer(f)); }

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

var BAL = json("phaser/data/balance.json");
var POSES = json("data/poses_manifest.json"), CARAS = json("data/caras_manifest.json");
var C = require(path.join(RAIZ, "phaser/logic/carga.js"));

/* =========================================================================
   [1] · LA COLA POR TAJADAS
   ========================================================================= */
(function () {
  var reloj = 0, programadas = [], calmo = true;
  var Q = C.crearColaPorTajadas({
    ahora: function () { return reloj; },
    programar: function (f) { programadas.push(f); },
    presupuestoMs: 12,
    permitido: function () { return calmo; }
  });
  function correrUna() { var f = programadas.shift(); return f ? f() : null; }
  /* tres trabajos atómicos de 5 ms y uno partido de 4 pasos de 5 ms */
  var hechos = [];
  function atomico(n) { return { clave: "a" + n, paso: function () { reloj += 5; hechos.push("a" + n); return true; } }; }
  var pasos = 0;
  var partido = { clave: "p", paso: function (fin, ahora) {
    while (pasos < 4) { reloj += 5; pasos++; if (pasos < 4 && ahora() >= fin) return false; }
    hechos.push("p"); return true;
  } };
  assert(Q.agregar(atomico(1)) && Q.agregar(atomico(2)) && Q.agregar(partido) && Q.agregar(atomico(3)), "entran los trabajos");
  assert(!Q.agregar(atomico(1)), "la misma clave no entra dos veces");
  assert(programadas.length === 1, "se programa UNA tajada (no una por trabajo)");
  correrUna();
  assert(hechos.join(",") === "a1,a2" && reloj === 15 && pasos === 1, "la primera tajada corre hasta gastar los 12 ms y devuelve el cuadro (" + hechos.join(",") + ", " + reloj + " ms, el partido en el paso " + pasos + ")");
  assert(programadas.length === 1, "y deja programada la siguiente");
  correrUna();
  assert(pasos === 4 && hechos.indexOf("p") >= 0, "el trabajo partido sigue donde quedó (paso " + pasos + ")");
  calmo = false;
  assert(correrUna() === 0 || Q.pendientes() > 0, "fuera de un rato tranquilo la tajada no corre");
  assert(Q.pendientes() === 1 && programadas.length === 0, "y la cola queda esperando (" + Q.pendientes() + " pendiente)");
  assert(!Q.empujar(), "empujar no la programa mientras no sea un rato tranquilo");
  calmo = true;
  assert(Q.empujar() && programadas.length === 1, "en el rato tranquilo, empujar la despierta");
  correrUna();
  assert(Q.pendientes() === 0 && hechos.join(",") === "a1,a2,p,a3", "termina todo, en orden (" + hechos.join(",") + ")");
  var s = Q.stats();
  assert(s.hechos === 4 && s.tajadas >= 3 && s.tajadaMax >= 10, "lleva sus números (tajadas " + s.tajadas + ", la más larga " + s.tajadaMax + " ms)");
  Q.agregar(atomico(9)); Q.agregar(atomico(8));
  assert(Q.vaciar() === 2 && Q.pendientes() === 0, "vaciar() tira lo pendiente (se va la escena)");
  assert(Q.agregar(atomico(9)), "y lo vaciado se puede volver a pedir");
  var Q2 = C.crearColaPorTajadas({ ahora: function () { return 0; }, programar: function (f) { f(); } });
  var rompe = Q2.agregar({ clave: "x", paso: function () { throw new Error("roto"); } });
  assert(rompe && Q2.pendientes() === 0 && Q2.stats().fallas === 1, "un trabajo que tira no traba la cola");
  console.log("[1] la cola: tajadas de 12 ms, el trabajo partido sigue donde quedó, espera fuera de los ratos tranquilos y se vacía");
})();

/* =========================================================================
   [2] · EL TEÑIDO POR TAJADAS ES EL MISMO TEÑIDO
   ========================================================================= */
var W = { PF: {}, PampaAvatar: require(path.join(RAIZ, "phaser/logic/avatar.js")), PampaCarga: C };
W.PampaAvatar.setCatalogoManifest && W.PampaAvatar.setCatalogoManifest({ caras: CARAS.caras.length, camisetas: CARAS.camisetas.length });
(function () {
  new Function("window", "document", leer("phaser/scenes/avatar_arte.js"))(W, null);
  var AA = W.PampaAvatarArte;
  assert(AA && typeof AA.tenirFilas === "function" && typeof AA.trabajoDeTinte === "function", "avatar_arte.js trae tenirFilas y trabajoDeTinte");
  /* una imagen sintética: los tonos de origen de la pose del remate, con bordes y tinta */
  var def = POSES.poses.remate, w = 40, h = 70;
  var look = W.PampaAvatar.validarLook({ cara: 2, tPiel: 3, tPelo: 2, tCam: 3 });
  var mapa = AA.mapaDeTinte(def, look, CARAS);
  var declarados = ["pelo", "piel", "camiseta"].filter(function (k) { return def.tonos[k]; }).length;
  assert(mapa.length === declarados && mapa.length >= 2, "el mapa de tonos tiene un cambio por cada tono que declara la pose (" + mapa.length + " de " + declarados + ")");
  var hx = function (v) { var n = parseInt(String(v).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  var tonos = ["pelo", "piel", "camiseta"].filter(function (k) { return def.tonos[k]; }).map(function (k) { return hx(def.tonos[k]); }).concat([[10, 10, 10], [200, 200, 200]]);
  var base = new Uint8ClampedArray(w * h * 4);
  for (var i = 0; i < w * h; i++) {
    var t = tonos[(i * 7 + ((i / w) | 0)) % tonos.length];
    base[i * 4] = Math.min(255, t[0] + (i % 9) - 4); base[i * 4 + 1] = Math.min(255, t[1] + (i % 5) - 2); base[i * 4 + 2] = t[2];
    base[i * 4 + 3] = (i % 11 === 0) ? 90 : 255;
  }
  var entero = new Uint8ClampedArray(base);
  AA.tenirFilas(entero, w, AA.reglasDeTinte(mapa, h), 0);
  var porBandas = new Uint8ClampedArray(base);
  var reglas = AA.reglasDeTinte(mapa, h);
  for (var y = 0; y < h; y += 13) {
    var alto = Math.min(13, h - y), banda = porBandas.subarray(y * w * 4, (y + alto) * w * 4);
    AA.tenirFilas(banda, w, reglas, y);
  }
  var distintos = 0, cambiados = 0;
  for (var k = 0; k < entero.length; k++) { if (entero[k] !== porBandas[k]) distintos++; if (entero[k] !== base[k]) cambiados++; }
  assert(cambiados > 0, "el teñido cambia algo (" + cambiados + " bytes)");
  assert(distintos === 0, "SÍNTOMA: el teñido por bandas da otros bytes que el entero (" + distintos + " distintos): la pinta se vería distinta según cuándo se tiñó");
  /* el trabajo con una escena de mentira: la textura recién existe al final */
  var texturas = { pose_remate: { w: w, h: h } }, creadas = [];
  function lienzo(cw, ch) {
    var datos = new Uint8ClampedArray(base);
    var ctx = {
      drawImage: function () { }, putImageData: function (img, x, yy) { datos.set(img.data, yy * cw * 4); },
      getImageData: function (x, yy, ww, hh) { return { data: new Uint8ClampedArray(datos.subarray(yy * cw * 4, (yy + hh) * cw * 4)) }; }
    };
    return { width: cw, height: ch, getContext: function () { return ctx; }, datos: datos };
  }
  var docFalso = { createElement: function () { var o = { width: 0, height: 0 }; o.getContext = function () { var L = lienzo(o.width, o.height); o.datos = L.datos; return L.getContext(); }; return o; } };
  var W2 = Object.assign({}, W);
  new Function("window", "document", leer("phaser/scenes/avatar_arte.js"))(W2, docFalso);
  var AA2 = W2.PampaAvatarArte;
  var escena = {
    sys: { settings: { status: 5 } },
    game: { registry: { get: function (kk) { return kk === "poses" ? POSES : kk === "caras" ? CARAS : null; } } },
    textures: {
      exists: function (kk) { return !!texturas[kk]; },
      get: function (kk) { return { getSourceImage: function () { return { width: texturas[kk].w, height: texturas[kk].h }; } }; },
      createCanvas: function (kk, cw, ch) { texturas[kk] = { w: cw, h: ch }; creadas.push(kk); var L = lienzo(cw, ch); return { getContext: L.getContext, refresh: function () { } }; }
    }
  };
  var reloj = 0;
  var T = AA2.trabajoDeTinte(escena, "remate", look);
  assert(!!T && /^tinte:poseT_remate_/.test(T.clave), "el trabajo de teñido lleva la clave de la pose teñida (" + (T && T.clave) + ")");
  var vueltas = 0, listo = false;
  while (!listo && vueltas < 50) { vueltas++; listo = T.paso(reloj + 1, function () { reloj += 1; return reloj; }); }
  assert(vueltas > 2, "se parte en varias tajadas (" + vueltas + ")");
  assert(listo && creadas.length === 1 && /^poseT_remate_3_2_3$/.test(creadas[0]), "al final crea la textura con la clave de siempre (" + creadas.join(",") + ")");
  /* si la escena la tiñó entera mientras tanto, el trabajo se descarta */
  delete texturas[creadas[0]]; creadas.length = 0;
  var T2 = AA2.trabajoDeTinte(escena, "remate", look);
  T2.paso(0, function () { return 99; });
  texturas["poseT_remate_3_2_3"] = { w: w, h: h };
  assert(T2.paso(1e9, function () { return 0; }) === true && creadas.length === 0, "si la textura ya existe, el trabajo termina sin crear otra");
  /* todo en Original: no hay nada que teñir */
  assert(AA2.trabajoDeTinte(escena, "remate", { cara: 1, tPiel: 0, tPelo: 0, tCam: 0 }) === null, "con la pinta en Original no hay trabajo");
  console.log("[2] el teñido por bandas da los mismos bytes que el entero (" + cambiados + " bytes teñidos, 0 distintos); el trabajo se parte en " + vueltas + " pasos y crea poseT_ al final");
})();

/* =========================================================================
   [3] · LO QUE ENCOLA EL PARTIDO
   ========================================================================= */
(function () {
  var Wm = { Phaser: { Scene: function () { } }, PF: W.PF };
  new Function("window", "Phaser", leer("phaser/scenes/match.js").replace(/\r\n/g, "\n"))(Wm, Wm.Phaser);
  new Function("window", "Phaser", leer("phaser/scenes/toma_remate.js").replace(/\r\n/g, "\n"))(Wm, Wm.Phaser);
  var P = Wm.PampaMatch.prototype;
  assert(typeof P.armarPrecalentamiento === "function" && typeof P.fugaDelViaje === "function" && typeof P.prepararTomaDelRemate === "function",
    "el partido trae armarPrecalentamiento, fugaDelViaje y prepararTomaDelRemate");
  var trabajos = [];
  Wm.PampaPrecalentar = { agregar: function (t) { if (trabajos.some(function (x) { return x.clave === t.clave; })) return false; trabajos.push(t); return true; }, vaciar: function () { trabajos.length = 0; } };
  var llamadas = [], apagados = [];
  var s = Object.create(P);
  s.BAL = BAL; s.FLAGS = {};
  s.sys = { settings: { status: 5 } };
  s.events = { once: function (n, f) { if (n === "shutdown") apagados.push(f); } };
  var vos = { esVos: true, look: { cara: 2, tPiel: 3, tPelo: 2, tCam: 3 } };
  s.st = { mios: [{}, vos], rivales: [{ pos: "ARQ" }, { pos: "DEF", nombre: "A" }, { pos: "VOL", nombre: "B" }, { pos: "ATA", nombre: "C" }] };
  s.retratoKey = function (j, r, e) { llamadas.push("retrato:" + (r ? j.nombre : "vos") + ":" + e); return "k"; };
  s.poseHeroeTenida = function (j, id) { llamadas.push("tenida:" + id); return "poseT_" + id; };
  s.pieDePose = function (k) { llamadas.push("pie:" + k); };
  s.poseRivalNaranja = function (id) { llamadas.push("naranja:" + id); return "poseR_" + id; };
  s.prepararTomaDelRemate = function () { llamadas.push("toma"); return true; };
  s.arcoCine = P.arcoCine;
  s.texturaDeFondo = function (tipo, o) { llamadas.push("pintura:" + tipo + ":" + JSON.stringify(o)); return "cine_" + tipo; };
  Wm.PampaAvatarArte = { trabajoDeTinte: function (sc, id) { return { clave: "tinte:" + id, paso: function () { llamadas.push("tinte:" + id); return true; } }; } };
  var n = s.armarPrecalentamiento();
  var R = BAL.rendimiento;
  var esperado = 1 + 3 + R.precalentar_poses.length * 2 + R.precalentar_rival.length + 1 + R.precalentar_pinturas.length;
  assert(n === esperado, "encola " + esperado + " trabajos: tu retrato, el de cada rival de campo, las poses y sus pies, la del rival, la toma y las pinturas (encoló " + n + ")");
  trabajos.forEach(function (t) { t.paso(); });
  assert(llamadas.indexOf("retrato:vos:concentrado") >= 0 && ["A", "B", "C"].every(function (x) { return llamadas.indexOf("retrato:" + x + ":concentrado") >= 0; }) && llamadas.every(function (l) { return l.indexOf("retrato:undefined") < 0; }),
    "los retratos de la cruz: el tuyo y el de cada rival de campo, no el del arquero");
  R.precalentar_poses.forEach(function (id) {
    assert(llamadas.indexOf("tinte:" + id) >= 0 && llamadas.indexOf("pie:poseT_" + id) > llamadas.indexOf("tinte:" + id), "'" + id + "': se tiñe por tajadas y después se miden sus pies");
  });
  assert(["gambeta_gana", "gambeta_pierde", "remate", "festejo"].every(function (id) { return R.precalentar_poses.indexOf(id) >= 0; }),
    "las poses de la primera gambeta (gane o pierda), el primer remate y el primer gol están en la lista");
  assert(llamadas.indexOf("naranja:barrida") >= 0 && llamadas.indexOf("toma") >= 0, "la barrida del rival en naranja y la toma del remate");
  var F = P.fugaDelViaje();
  assert(llamadas.indexOf("pintura:profunda:" + JSON.stringify({ vp: F.vp, nearY: F.nearY, k: BAL.cine.persp.k })) >= 0, "la cancha en fuga se pinta con la MISMA fuga que el plano del viaje (la clave no la lleva)");
  assert(llamadas.indexOf("pintura:arco:" + JSON.stringify({ arco: P.arcoCine() })) >= 0, "el arco, con el arco del cine");
  assert(llamadas.indexOf("pintura:golpe:" + JSON.stringify({ bando: "mio", cx: 0.5, cy: 0.52 })) >= 0, "el golpe de color del cine del remate");
  var src = leer("phaser/scenes/match.js").replace(/\r\n/g, "\n");
  assert(/const \{ vp, nearY \} = this\.fugaDelViaje\(\);\n\s*this\.dibujarCanchaProfunda\(vp, nearY\)/.test(src), "el plano del viaje usa fugaDelViaje() (la misma que el precalentamiento)");
  /* si la escena ya no corre, el trabajo no hace nada */
  llamadas.length = 0; s.sys.settings.status = 8;
  trabajos.forEach(function (t) { t.paso(); });
  assert(llamadas.filter(function (l) { return /^(retrato|pintura|naranja|toma)/.test(l); }).length === 0, "con la escena apagada, los trabajos no tocan nada");
  assert(apagados.length === 1, "al apagarse la escena, la cola se vacía");
  apagados[0]();
  assert(trabajos.length === 0, "vaciada");
  /* sin pinta (todo Original) no se encolan teñidos */
  trabajos.length = 0; llamadas.length = 0; s.sys.settings.status = 5;
  Wm.PampaAvatarArte = { trabajoDeTinte: function () { return null; } };
  var n2 = s.armarPrecalentamiento();
  assert(n2 === esperado - R.precalentar_poses.length, "con la pinta en Original no hay teñidos (los pies igual, por si los usa otro)");
  /* el update la empuja, y la cola vive en cine_arte.js con los estados tranquilos */
  assert(/update\(time, delta\) \{[\s\S]{0,400}window\.PampaPrecalentar\.empujar\(\)/.test(src), "el update del partido empuja la cola");
  var CA = leer("phaser/scenes/cine_arte.js");
  var m = CA.match(/var CALMOS = \{([^}]*)\}/);
  var calmos = m ? m[1].replace(/\s/g, "").split(",").map(function (x) { return x.split(":")[0]; }) : [];
  assert(calmos.indexOf("LIBRE") >= 0 && calmos.indexOf("TEMPO_MENU") >= 0 && calmos.indexOf("ESCENA") < 0 && calmos.indexOf("CINE") < 0 && calmos.indexOf("DEFINICION") < 0,
    "la cola trabaja en LIBRE y los menús, nunca en la escena, el cine ni la Definición (" + calmos.join(",") + ")");
  assert(/PampaPrecalentarEnganchar\(game\)/.test(leer("phaser/index.html")), "el postBoot del juego arma la cola");
  console.log("[3] el partido encola " + n + " trabajos: retratos (vos + " + 3 + " rivales), " + R.precalentar_poses.join("/") + " con sus pies, barrida naranja, la toma y " + R.precalentar_pinturas.length + " pinturas con las opciones de cada plano");
})();

/* =========================================================================
   [4] · EL TOPE DE CUADROS, CON EL ALGORITMO DEL VENDOR
   ========================================================================= */
(function () {
  var V = leer("phaser/vendor/phaser.min.js");
  function sacar(nombre, hasta) {
    var a = V.indexOf(nombre + ":function"), b = V.indexOf(hasta, a);
    return a > 0 && b > a ? V.slice(a + nombre.length + 1, b) : null;
  }
  var fSmooth = sacar("smoothDelta", ",updateFPS:function"), fStep = sacar("stepLimitFPS", ",step:function");
  assert(!!fSmooth && !!fStep, "se pueden sacar smoothDelta y stepLimitFPS de vendor/phaser.min.js");
  if (!fSmooth || !fStep) return;
  function TimeStep(limit) {
    this.deltaHistory = []; for (var i = 0; i < 10; i++) this.deltaHistory[i] = 1000 / 60;
    this.deltaIndex = 0; this.deltaSmoothingMax = 10; this._coolDown = 0; this.inFocus = true;
    this._min = 1000 / 5; this._target = 1000 / 60; this._limitRate = 1000 / limit; this.smoothStep = true;
    this.delta = 0; this.lastTime = 0; this.time = 0; this.nextFpsUpdate = 1e12; this.framesThisSecond = 0; this.frame = 0;
    this.llamadas = 0; var self = this; this.callback = function () { self.llamadas++; };
  }
  TimeStep.prototype.smoothDelta = eval("(" + fSmooth + ")");
  TimeStep.prototype.stepLimitFPS = eval("(" + fStep + ")");
  TimeStep.prototype.updateFPS = function () { };
  function cuadros(hz, limit) {
    var ts = new TimeStep(limit), t = 0;
    for (var i = 0; i < hz * 10; i++) { t += 1000 / hz; ts.stepLimitFPS(t); }
    return ts.llamadas / 10;
  }
  var lim = BAL.rendimiento.fps_limite;
  var c60a60 = cuadros(60, 60), c61a60 = cuadros(60, lim), c61a120 = cuadros(120, lim), c0a120 = cuadros(120, 1e9);
  assert(c60a60 < 50, "SÍNTOMA: con tope 60 justo, una pantalla de 60 Hz da " + c60a60 + " cuadros por segundo (por eso no es 60)");
  assert(lim === 61 && Math.abs(c61a60 - 60) < 0.5, "con fps_limite " + lim + ", 60 Hz da " + c61a60 + " cuadros por segundo");
  assert(Math.abs(c61a120 - 60) < 0.5 && c0a120 > 100, "y en 120 Hz, " + c61a120 + " (sin tope eran " + c0a120 + ")");
  var IDX = leer("phaser/index.html");
  assert(/fps: \{ target: 60, limit: \(balance && balance\.rendimiento && balance\.rendimiento\.fps_limite != null\) \? balance\.rendimiento\.fps_limite : 61 \}/.test(IDX),
    "la config del juego toma el tope de balance.rendimiento.fps_limite");
  assert(/61 y no 60/.test(BAL.rendimiento._nota), "la _nota cuenta por qué 61");
  console.log("[4] el tope, con el algoritmo de Phaser del vendor: 60 justo da " + c60a60 + " cuadros/s en 60 Hz; " + lim + " da " + c61a60 + " en 60 Hz y " + c61a120 + " en 120 Hz (sin tope, " + c0a120 + ")");
})();

/* =========================================================================
   [5] · ?perf=1: EL CUADRO MÁS LARGO
   ========================================================================= */
(function () {
  var p = { cuadros: [] };
  C.anotarCuadro(p, 0, 10, 16);
  C.anotarCuadro(p, 5000, 80, 95);
  C.anotarCuadro(p, 9000, 12, 17);
  assert(p.trabajoMax === 80 && p.intervaloMax === 95, "el más largo de los últimos 10 s (trabajo 80, intervalo 95)");
  C.anotarCuadro(p, 15500, 9, 16);
  assert(p.cuadros.length === 2 && p.trabajoMax === 12, "lo de hace más de 10 s se va (" + p.cuadros.length + " cuadros, máx " + p.trabajoMax + ")");
  assert(p.trabajoMaxSesion === 80, "el de la sesión queda aparte");
  var t = C.textoCuadros(p, { pendientes: 3, tajadaMax: 14.2 }, { ms: 812.4 });
  assert(t === "CUADRO máx 10 s 17 ms (trabajo 12 ms) · COLA 3 (tajada máx 14 ms) · HALO 812 ms", "el renglón: " + t);
  var IDX = leer("phaser/index.html");
  assert(/window\.PampaPerf = \{/.test(IDX) && /if \(!perf \|\| !C \|\| !C\.anotarCuadro/.test(IDX), "index.html engancha el cuadro más largo solo con ?perf=1");
  assert(/"prestep"/.test(IDX) && /"postrender"/.test(IDX) && /PampaPerf\.enganchar\(game\)/.test(IDX), "mide de prestep a postrender, desde el postBoot");
  console.log("[5] ?perf=1: " + t);
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
