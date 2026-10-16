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
     [1b] (revisión del lote) lo que no se parte corre SOLO en un rato largo
         (un menú quieto): en uno corto (LIBRE, la cruz) solo lo que se
         parte; lo grande va primero, uno por tajada; la cola aprende el
         factor del aparato; y los pesos de la pierna por tramos son los
         mismos que de una vez;
     [2] el teñido por tajadas da EXACTAMENTE los mismos bytes que el entero,
         y la textura recién existe al final (si la escena la tiñó antes, se
         descarta);
     [3] el partido encola lo de la primera gambeta, el primer remate y el
         primer gol con las mismas opciones que usa cada plano; con la cola
         de verdad: los bustos y la barrida van por bandas, los pesos de la
         toma por tramos, lo que depende de otro trabajo lo espera, y en un
         rato corto lo grande no corre;
     [4] el tope de cuadros, con el algoritmo de Phaser 3.80 sacado del
         vendor: sale de MEDIR la pantalla (revisión del lote: el 61 fijo
         bajaba 75, 90 y 100 Hz a la mitad); 60, 75, 90 y 100 Hz corren
         libres, 120 → 60, 144 → 72;
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
  /* tres trabajos atómicos de 5 ms (con su costo) y uno partido de 4 pasos de 5 ms */
  var hechos = [];
  function atomico(n) { return { clave: "a" + n, costoMs: 5, paso: function () { reloj += 5; hechos.push("a" + n); return true; } }; }
  var pasos = 0;
  var partido = { clave: "p", partible: true, paso: function (fin, ahora) {
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
   [1b] · LO QUE NO SE PARTE, SOLO DONDE ENTRA (revisión del lote)
   Lo que estaba mal, medido: la tajada se miraba ENTRE trabajos, así que
   uno de una pieza corría entero aunque costara más: tajadas de 24 a 61 ms
   en la compu (el retrato de VOS 48, los pesos de la toma 31, cada pintura
   14), en LIBRE o en la cruz si quien juega elegía rápido el tempo. En un
   teléfono de gama baja, 200-350 ms de traba en pleno juego.
   ========================================================================= */
(function () {
  function armar(nivel) {
    var X = { reloj: 0, prog: [], hechos: [], nivel: nivel, llamadas: {} };
    X.Q = C.crearColaPorTajadas({ ahora: function () { return X.reloj; }, programar: function (f) { X.prog.push(f); }, presupuestoMs: 12,
      permitido: function () { return X.nivel; } });
    X.uno = function () { var f = X.prog.shift(); return f ? f() : null; };
    X.todo = function (tope) { var v = 0; while (X.prog.length && v++ < (tope || 50)) X.uno(); return v; };
    X.atom = function (clave, costo, real) {
      return { clave: clave, costoMs: costo, paso: function () { X.llamadas[clave] = (X.llamadas[clave] || 0) + 1; X.reloj += real; X.hechos.push(clave); return true; } };
    };
    X.part = function (clave, pasos, ms) {
      var hechos = 0;
      return { clave: clave, partible: true, paso: function (fin, ahora) {
        while (hechos < pasos) { X.reloj += ms; hechos++; if (hechos < pasos && ahora() >= fin) return false; }
        X.hechos.push(clave); return true;
      } };
    };
    return X;
  }
  /* rato CORTO (1: LIBRE, la cruz, el pase): lo grande espera */
  var A = armar(1);
  A.Q.agregar(A.atom("grande", 30, 30));
  A.Q.agregar(A.atom("sinCosto", undefined, 3));
  A.Q.agregar(A.atom("chico", 4, 4));
  A.Q.agregar(A.part("bandas", 6, 3));
  A.uno();
  assert(A.hechos.indexOf("grande") < 0 && A.hechos.indexOf("sinCosto") < 0, "SÍNTOMA: en un rato corto, un trabajo de una pieza que no entra en la tajada NO corre (antes corría entero: 30 ms en LIBRE)");
  assert(A.hechos.indexOf("chico") < 0, "ni siquiera uno de una pieza que \"entra\" (4 ms de 12): su costo es de la compu, y en un teléfono no se sabe hasta correrlo");
  assert(A.Q.stats().tajadaMax <= 12 + 3, "la tajada no pasa de 12 ms más una banda (" + A.Q.stats().tajadaMax + " ms)");
  assert(A.prog.length === 0, "en un rato corto, una tajada por cuadro: la siguiente la empuja el update, no se encadena");
  A.Q.empujar(); A.uno(); A.Q.empujar(); A.uno();
  assert(A.hechos.indexOf("bandas") >= 0 && A.Q.pendientes() === 3, "lo que se parte termina en rato corto; los tres de una pieza siguen esperando (" + A.hechos.join(",") + ")");
  /* rato LARGO (2: el tempo, la pausa, el tutorial): lo grande, primero y uno por tajada */
  A.nivel = 2;
  A.Q.agregar(A.atom("otroGrande", 20, 20));
  A.Q.agregar(A.part("masBandas", 2, 3));
  A.Q.empujar(); A.uno();
  assert(A.hechos.slice(-1)[0] === "grande" && A.Q.pendientes() === 4, "en un rato largo, lo grande va PRIMERO y uno solo por tajada (" + A.hechos.join(",") + ")");
  assert(A.prog.length === 1, "y en un rato largo la tajada siguiente se encadena (un menú quieto)");
  A.todo();
  assert(A.Q.pendientes() === 0 && A.hechos.indexOf("sinCosto") >= 0 && A.hechos.indexOf("otroGrande") >= 0 && A.hechos.indexOf("chico") >= 0, "en el rato largo termina todo; uno sin costo declarado cuenta como grande (" + A.hechos.join(",") + ")");
  assert(A.Q.stats().grandes === 3, "tres grandes, cada uno en su tajada (" + A.Q.stats().grandes + ")");

  /* el FACTOR del aparato: uno declarado de 4 que tarda 20 (un teléfono 5
     veces más lento); desde ahí uno de 4 se estima en 20: es grande y corre
     solo, primero en su tajada, en vez de compartirla */
  var B = armar(2);
  B.Q.agregar(B.atom("primero", 4, 20));
  B.uno();
  assert(B.hechos.join(",") === "primero" && Math.abs(B.Q.stats().factor - 5) < 1e-9, "la cola aprende el factor del aparato (" + B.Q.stats().factor + ")");
  B.Q.agregar(B.part("p", 2, 3)); B.Q.agregar(B.atom("segundo", 4, 4));
  var g0 = B.Q.stats().grandes;
  B.todo();
  assert(B.hechos.join(",") === "primero,segundo,p" && B.Q.stats().grandes === g0 + 1, "con el factor 5, uno de 4 ms (20 estimados) pasa a ser grande: primero y solo (" + B.hechos.join(",") + ")");
  var C2 = armar(2);
  C2.Q.agregar(C2.atom("raro", 4, 100));
  C2.uno();
  assert(C2.Q.stats().factor === 8, "el factor tiene techo (un cuadro de 100 ms por un recolector no deja la cola muda: tope 8)");

  /* lo que ESPERA a otro (paso da false con tiempo de sobra) no frena a los de atrás ni gira en vacío */
  var D = armar(2);
  var vueltas = 0, listo = false;
  D.Q.agregar({ clave: "espera", costoMs: 2, paso: function () { vueltas++; D.reloj += 0.1; return listo ? (D.hechos.push("espera"), true) : false; } });
  D.Q.agregar(D.atom("despues", 3, 3));
  assert(D.Q.tiene("espera") && D.Q.tiene("despues") && !D.Q.tiene("nada"), "tiene(clave): si un trabajo sigue en la cola");
  D.uno();
  assert(D.hechos.join(",") === "despues" && vueltas === 1, "el que espera se saltea UNA vez por tajada y los de atrás siguen (vueltas " + vueltas + ")");
  listo = true; D.Q.empujar(); D.todo();
  assert(D.hechos.join(",") === "despues,espera" && D.Q.pendientes() === 0, "cuando lo que esperaba está, termina");
  console.log("[1b] lo que no se parte, solo en rato largo: en rato corto corre solo lo que se parte y la tajada no pasa de 12 + una banda; en rato largo, lo grande primero y uno por tajada; el factor del aparato se aprende (5, con techo 8)");
})();

/* los pesos de la pierna por tramos dan los MISMOS números que de una vez */
(function () {
  var PI = require(path.join(RAIZ, "phaser/logic/pierna.js"));
  var def = POSES.poses.remate;
  var tw = 600, th = 900, B = PI.huesos(def.pierna, tw, th), n = 2000, xs = new Float32Array(n), ys = new Float32Array(n);
  for (var i = 0; i < n; i++) { xs[i] = ((i * 37) % 600); ys[i] = ((i * 53) % 900); }
  var entero = PI.pesos(xs, ys, B);
  var W8 = { hw: new Float32Array(n), kw: new Float32Array(n), largo: 0 };
  for (var d = 0; d < n; d += 333) PI.pesosTramo(xs, ys, B, d, Math.min(n, d + 333), W8);
  var dist = 0;
  for (var k = 0; k < n; k++) if (entero.hw[k] !== W8.hw[k] || entero.kw[k] !== W8.kw[k]) dist++;
  assert(typeof PI.pesosTramo === "function" && dist === 0 && entero.largo === W8.largo && entero.hw.some(function (v) { return v > 0; }),
    "los pesos por tramos son los mismos que de una vez (" + dist + " distintos de " + n + ")");
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
  /* revisión del lote: la banda va por píxeles y dibuja SU pedazo de la
     fuente (en el navegador, la tajada en LIBRE llegó a 21,6 ms con 48 filas
     fijas y la fuente entera dibujada de una vez al empezar) */
  var bandas = [], dibujos = [];
  var docB = { createElement: function () { return { width: 0, height: 0, getContext: function () {
    var o = this;
    return { drawImage: function () { dibujos.push([].slice.call(arguments, 1)); },
      getImageData: function (x, yy, ww, hh) { bandas.push(ww * hh); return { data: new Uint8ClampedArray(ww * hh * 4) }; },
      putImageData: function () { } };
  } }; } };
  var W3 = Object.assign({}, W);
  new Function("window", "document", leer("phaser/scenes/avatar_arte.js"))(W3, docB);
  var anchos = { cara_ancha: { w: 2000, h: 120 } };
  var esc3 = { sys: { settings: { status: 5 } }, textures: { exists: function (kk) { return !!anchos[kk]; },
    get: function (kk) { return { getSourceImage: function () { return { width: anchos[kk].w, height: anchos[kk].h }; } }; },
    createCanvas: function (kk) { anchos[kk] = { w: 1, h: 1 }; return { getContext: function () { return { drawImage: function () { } }; }, refresh: function () { } }; } } };
  var T3 = W3.PampaAvatarArte.trabajoDeTinteImagen(esc3, "cara_ancha", "caraT_ancha", mapa);
  var r3 = 0;
  while (!T3.paso(1e12, function () { return r3; })) { }
  assert(T3.partible === true && bandas.length === 15 && Math.max.apply(null, bandas) <= 2000 * 8 && dibujos.length === 15 && dibujos.every(function (d) { return d.length === 8; }),
    "una imagen de 2000 de ancho va en bandas de 8 filas (16.000 píxeles) y cada banda dibuja su pedazo de la fuente (" + bandas.length + " bandas, la mayor " + Math.max.apply(null, bandas) + " px)");
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
  assert(typeof P.armarPrecalentamiento === "function" && typeof P.fugaDelViaje === "function" && typeof P.prepararTomaDelRemate === "function" && typeof P.trabajoDePesosDeLaToma === "function",
    "el partido trae armarPrecalentamiento, fugaDelViaje, prepararTomaDelRemate y trabajoDePesosDeLaToma");
  /* la cola DE VERDAD, con un reloj en la mano */
  var reloj = 0, prog = [], nivel = 2;
  Wm.PampaPrecalentar = C.crearColaPorTajadas({ ahora: function () { return reloj; }, programar: function (f) { prog.push(f); }, presupuestoMs: 12, permitido: function () { return nivel; } });
  var Q = Wm.PampaPrecalentar;
  function correr(tope) { var v = 0; while (prog.length && v++ < (tope || 200)) prog.shift()(); }
  var llamadas = [], apagados = [], texturas = {};
  var s = Object.create(P);
  s.BAL = BAL; s.FLAGS = {};
  s.sys = { settings: { status: 5 } };
  s.events = { once: function (n, f) { if (n === "shutdown") apagados.push(f); } };
  s.textures = { exists: function (k) { return !!texturas[k]; } };
  var vos = { esVos: true, look: { cara: 2, tPiel: 3, tPelo: 2, tCam: 3 } };
  s.st = { mios: [{}, vos], rivales: [{ pos: "ARQ" }, { pos: "DEF", nombre: "A" }, { pos: "VOL", nombre: "B" }, { pos: "ATA", nombre: "C" }] };
  /* los bustos: A y C comparten el mismo (sale del nombre) */
  var bustoDe = { A: "caraT_1_0_0_0_r", B: "caraT_4_0_0_0_r", C: "caraT_1_0_0_0_r" };
  s._pedidoDeBusto = function (j, r) { return { base: "cara_x", clave: r ? bustoDe[j.nombre] : "caraT_2_3_2_3", mapa: [{ de: 1, a: 2 }] }; };
  s.retratoKey = function (j, r) { llamadas.push("retratoKey:" + (r ? j.nombre : "vos")); return "k"; };
  s.poseHeroeTenida = function (j, id) { llamadas.push("tenida:" + id + (texturas["poseT_" + id] ? "" : ":INLINE")); return "poseT_" + id; };
  s.pieDePose = function (k) { llamadas.push("pie:" + k); };
  s.pedidoRivalNaranja = function (id) { return { base: "pose_" + id, clave: "poseR_" + id, mapa: [{ de: 3, a: 4 }] }; };
  s.poseRivalNaranja = function (id) { llamadas.push("naranja:" + id + (texturas["poseR_" + id] ? "" : ":INLINE")); return "poseR_" + id; };
  s.trabajoDePesosDeLaToma = function () {
    var k = 0;
    return { clave: "toma:pesos", partible: true, paso: function (fin, ahora) { while (k < 5) { reloj += 4; k++; if (k < 5 && ahora() >= fin) return false; } llamadas.push("pesos"); return true; } };
  };
  s.prepararTomaDelRemate = function () { llamadas.push("toma" + (texturas.poseT_remate ? "" : ":SIN_TEÑIR")); reloj += 5; return true; };
  s.arcoCine = P.arcoCine;
  s.texturaDeFondo = function (tipo, o) { llamadas.push("pintura:" + tipo + ":" + JSON.stringify(o)); reloj += 15; return "cine_" + tipo; };
  /* el teñido por bandas, de mentira: tres bandas de 5 ms y la textura al final */
  function tinte(clave, etiqueta) {
    var b = 0;
    return { clave: "tinte:" + clave, partible: true, paso: function (fin, ahora) {
      while (b < 3) { reloj += 5; b++; if (b < 3 && ahora() >= fin) return false; }
      texturas[clave] = 1; llamadas.push(etiqueta + ":" + clave); return true;
    } };
  }
  Wm.PampaAvatarArte = {
    trabajoDeTinte: function (sc, id) { return tinte("poseT_" + id, "tinte"); },
    trabajoDeTinteImagen: function (sc, base, clave) { return tinte(clave, "bandas"); },
    pedidoDeTinte: function (sc, id) { return { clave: "poseT_" + id }; }
  };
  var n = s.armarPrecalentamiento();
  var R = BAL.rendimiento;
  /* tu busto + 2 bustos naranja (A y C son el mismo) · las poses y sus pies · la barrida y su pie · los pesos y el ensayo · las pinturas */
  var esperado = 1 + 2 + R.precalentar_poses.length * 2 + R.precalentar_rival.length * 2 + 2 + R.precalentar_pinturas.length;
  assert(n === esperado, "encola " + esperado + " trabajos (encoló " + n + ")");
  /* cada trabajo de una pieza lleva su costo medido */
  assert(R.costo_ms && R.costo_ms.pie > 0 && R.costo_ms.toma_ensayo >= 40 && R.costo_ms.pintura > 12 && /costo_ms/.test(R._costo || ""), "balance.rendimiento.costo_ms (pie, toma_ensayo, pintura, retrato) con su _costo");
  correr();
  assert(Q.pendientes() === 0, "con calma larga, la cola termina todo (" + Q.pendientes() + " pendientes)");
  assert(llamadas.indexOf("bandas:caraT_2_3_2_3") >= 0 && llamadas.indexOf("bandas:caraT_1_0_0_0_r") >= 0 && llamadas.indexOf("bandas:caraT_4_0_0_0_r") >= 0 && !llamadas.some(function (l) { return /^retratoKey/.test(l); }),
    "SÍNTOMA: los bustos del duelo (el tuyo y el naranja de cada rival) se tiñen POR BANDAS (antes, retratoKey de una pieza: 48 ms el tuyo)");
  R.precalentar_poses.forEach(function (id) {
    assert(llamadas.indexOf("tinte:poseT_" + id) >= 0 && llamadas.indexOf("tenida:" + id) > llamadas.indexOf("tinte:poseT_" + id), "'" + id + "': se tiñe por bandas y RECIÉN después se miden sus pies (sin teñirla entera en el medio)");
  });
  assert(llamadas.indexOf("bandas:poseR_barrida") >= 0 && llamadas.indexOf("naranja:barrida") > llamadas.indexOf("bandas:poseR_barrida"), "la barrida del rival en naranja, por bandas, y después sus pies");
  assert(llamadas.indexOf("toma") > llamadas.indexOf("pesos") && llamadas.indexOf("toma") > llamadas.indexOf("tinte:poseT_remate"), "el ensayo de la toma espera a los pesos (por tramos) y a tu remate teñido");
  assert(!llamadas.some(function (l) { return /INLINE|SIN_TEÑIR/.test(l); }), "nada se tiñe entero en el medio por adelantarse a su teñido (" + llamadas.filter(function (l) { return /INLINE|SIN/.test(l); }).join(",") + ")");
  var F = P.fugaDelViaje();
  assert(llamadas.indexOf("pintura:profunda:" + JSON.stringify({ vp: F.vp, nearY: F.nearY, k: BAL.cine.persp.k })) >= 0, "la cancha en fuga se pinta con la MISMA fuga que el plano del viaje (la clave no la lleva)");
  assert(llamadas.indexOf("pintura:arco:" + JSON.stringify({ arco: P.arcoCine() })) >= 0, "el arco, con el arco del cine");
  assert(llamadas.indexOf("pintura:golpe:" + JSON.stringify({ bando: "mio", cx: 0.5, cy: 0.52 })) >= 0, "el golpe de color del cine del remate");
  var tajMax = Q.stats().tajadaMax;
  /* en un rato corto (LIBRE, la cruz): lo de una pieza grande espera */
  Q.vaciar(); llamadas.length = 0; texturas = {}; s.textures.exists = function (k) { return !!texturas[k]; };
  nivel = 1;
  s.armarPrecalentamiento();
  for (var v = 0; v < 40; v++) { Q.empujar(); correr(1); }
  var grandes = llamadas.filter(function (l) { return /^(pintura|toma)/.test(l); });
  assert(grandes.length === 0, "SÍNTOMA: en un rato corto no corren las pinturas (15 ms) ni el ensayo de la toma (~50): esperan al menú (" + grandes.join(",") + ")");
  assert(llamadas.indexOf("bandas:caraT_2_3_2_3") >= 0 && llamadas.indexOf("pesos") >= 0 && llamadas.indexOf("tinte:poseT_remate") >= 0, "pero los teñidos y los pesos (que se parten) sí avanzan");
  assert(llamadas.indexOf("tenida:remate") < 0, "y los pies (de una pieza, 5-22 ms medidos) también esperan al menú");
  assert(Q.stats().tajadaMax <= 12 + 5, "y ninguna tajada pasa de 12 ms más una banda (" + Q.stats().tajadaMax + " ms)");
  nivel = 2; Q.empujar(); correr();
  assert(Q.pendientes() === 0 && llamadas.indexOf("toma") >= 0, "al llegar un menú quieto, lo grande termina");
  var src = leer("phaser/scenes/match.js").replace(/\r\n/g, "\n");
  assert(/const \{ vp, nearY \} = this\.fugaDelViaje\(\);\n\s*this\.dibujarCanchaProfunda\(vp, nearY\)/.test(src), "el plano del viaje usa fugaDelViaje() (la misma que el precalentamiento)");
  /* si la escena ya no corre, el trabajo no hace nada */
  Q.vaciar(); llamadas.length = 0; s.sys.settings.status = 8;
  s.armarPrecalentamiento(); correr();
  assert(llamadas.filter(function (l) { return /^(retrato|pintura|naranja|toma|tenida)/.test(l); }).length === 0, "con la escena apagada, los trabajos no tocan nada");
  assert(apagados.length >= 1, "al apagarse la escena, la cola se vacía");
  Q.agregar({ clave: "x", paso: function () { return false; } });
  apagados[0]();
  assert(Q.pendientes() === 0, "vaciada");
  /* sin pinta (todo Original) no se encolan teñidos de pose */
  s.sys.settings.status = 5;
  Wm.PampaAvatarArte = { trabajoDeTinte: function () { return null; }, trabajoDeTinteImagen: function (sc, b, clave) { return tinte(clave, "bandas"); }, pedidoDeTinte: function () { return null; } };
  var n2 = s.armarPrecalentamiento();
  assert(n2 === esperado - R.precalentar_poses.length, "con la pinta en Original no hay teñidos de pose (los pies igual, por si los usa otro)");
  Q.vaciar();
  /* sin busto ilustrado, el retrato de siempre, de una pieza con su costo */
  s._pedidoDeBusto = function () { return null; };
  var antes = Q.pendientes();
  s.armarPrecalentamiento();
  assert(Q.tiene("retrato:vos") && Q.tiene("retrato:rival:1"), "sin busto ilustrado, el retrato de siempre (retratoKey), de una pieza");
  Q.vaciar();
  /* el update la empuja, y la cola vive en cine_arte.js con la calma de cada estado */
  assert(/update\(time, delta\) \{[\s\S]{0,400}window\.PampaPrecalentar\.empujar\(\)/.test(src), "el update del partido empuja la cola");
  var CA = leer("phaser/scenes/cine_arte.js");
  var m = CA.match(/var CALMA = \{([^}]*)\}/);
  var calma = {};
  (m ? m[1].replace(/\s/g, "").split(",") : []).forEach(function (x) { var p = x.split(":"); calma[p[0]] = Number(p[1]); });
  /* TANDA 1.0, TEMPO-1: el menú de tempo de antes de cada partido ya no
     existe (decisión de Rodri, 13/oct: se elige al crear la carrera), así
     que tampoco su rato largo */
  assert(calma.PAUSA === 2 && calma.TUTORIAL === 2 && !("TEMPO_MENU" in calma), "rato LARGO (2): la pausa y el tutorial (" + JSON.stringify(calma) + ")");
  assert(calma.LIBRE === 1 && calma.MENU === 1 && calma.PASE === 1, "SÍNTOMA: LIBRE, la cruz del duelo y el pase son rato CORTO (1): antes eran iguales que un menú y lo de una pieza corría entero ahí");
  assert(!calma.ESCENA && !calma.CINE && !calma.DEFINICION, "nunca en la escena, el cine ni la Definición");
  assert(/PampaPrecalentarEnganchar\(game\)/.test(leer("phaser/index.html")), "el postBoot del juego arma la cola");
  console.log("[3] el partido encola " + n + " trabajos: los bustos y las poses por bandas, los pesos de la toma por tramos; lo de una pieza (pies, ensayo de la toma, " + R.precalentar_pinturas.length + " pinturas) con su costo y esperando a lo que necesita · tajada máx " + tajMax + " ms en calma larga");
})();

/* el busto: _pedidoDeBusto da la MISMA clave y el MISMO mapa que teñía el
   duelo, y _bustoIlustrado tiñe con eso (corridos de verdad con avatar.js) */
(function () {
  var Wm = { Phaser: { Scene: function () { } }, PF: W.PF, PampaAvatar: W.PampaAvatar };
  new Function("window", "Phaser", leer("phaser/scenes/match.js").replace(/\r\n/g, "\n"))(Wm, Wm.Phaser);
  var s = Object.create(Wm.PampaMatch.prototype);
  var hechos = [];
  Wm.PampaAvatarArte = { tenirImagen: function (sc, base, clave, mapa) { hechos.push({ base: base, clave: clave, mapa: mapa }); } };
  s.FLAGS = {};
  s.game = { registry: { get: function (k) { return k === "caras" ? CARAS : null; } } };
  s.textures = { exists: function (k) { return /^cara_/.test(k); } };
  var vos = { esVos: true, look: { cara: 2, tPiel: 3, tPelo: 2, tCam: 3 } };
  var Pv = s._pedidoDeBusto(vos, false);
  s._bustoIlustrado(vos, false);
  var cara = CARAS.caras[2 % CARAS.caras.length];
  assert(Pv && Pv.base === "cara_" + cara.id && /^caraT_2_3_[02]_3$/.test(Pv.clave) && Pv.mapa.length >= 2,
    "tu busto: la clave caraT_ de siempre y los tonos de la cara (" + (Pv && Pv.clave) + ", " + (Pv && Pv.mapa.length) + " tonos)");
  assert(hechos.length === 1 && hechos[0].clave === Pv.clave && JSON.stringify(hechos[0].mapa) === JSON.stringify(Pv.mapa), "_bustoIlustrado tiñe con el mismo pedido (el precalentamiento y el duelo hacen lo mismo)");
  var Pr = s._pedidoDeBusto({ nombre: "Ceferino" }, true);
  assert(Pr && /_r$/.test(Pr.clave) && Pr.mapa.some(function (m) { return m.a === 0xFF8A50; }), "el rival: su busto con la camiseta naranja");
  var Po = s._pedidoDeBusto({ esVos: true, look: { cara: 1, tPiel: 0, tPelo: 0, tCam: 0 } }, false);
  assert(Po && Po.mapa === null && s._bustoIlustrado({ esVos: true, look: { cara: 1, tPiel: 0, tPelo: 0, tCam: 0 } }, false) === Po.base, "todo en Original: la ilustración tal cual, sin teñir");
})();

/* los pesos de la toma, POR TRAMOS, corridos de verdad (toma_remate.js):
   se parten, dan los mismos números que de una vez y quedan para la toma */
(function () {
  var PI = require(path.join(RAIZ, "phaser/logic/pierna.js"));
  var tramos = 0, W8visto = null;
  var PIespia = Object.assign({}, PI, { pesosTramo: function (xs, ys, B, d, h, W8) { tramos++; W8visto = W8; return PI.pesosTramo(xs, ys, B, d, h, W8); } });
  var Wm = { Phaser: { Scene: function () { } }, PF: W.PF, PampaPierna: PIespia };
  new Function("window", "Phaser", leer("phaser/scenes/match.js").replace(/\r\n/g, "\n"))(Wm, Wm.Phaser);
  new Function("window", "Phaser", leer("phaser/scenes/toma_remate.js").replace(/\r\n/g, "\n"))(Wm, Wm.Phaser);
  var s = Object.create(Wm.PampaMatch.prototype);
  var GX = (BAL.toma && BAL.toma.malla) || 48, tw = 600, th = 900, vs = [], planos = 0, destruidos = 0;
  for (var i = 0; i < 6 * GX * GX; i++) vs.push({ u: (i % (GX + 1)) / GX, v: (((i / (GX + 1)) | 0) % (GX + 1)) / GX });
  s.puedeTomaDelRemate = function () { return true; };
  s.game = { registry: { get: function (k) { return k === "poses" ? POSES : null; } } };
  s.poseKey = function () { return "pose_remate"; };
  s.textures = { get: function () { return { getSourceImage: function () { return { width: tw, height: th }; }, get: function () { return { u0: 0, u1: 1, v0: 0, v1: 1 }; } }; } };
  s.BAL = BAL; s.sys = { settings: { status: 5 } };
  s.add = { plane: function () { planos++; return { vertices: vs, destroy: function () { destruidos++; } }; } };
  var T = s.trabajoDePesosDeLaToma();
  assert(T && T.clave === "toma:pesos" && T.partible === true, "trabajoDePesosDeLaToma da un trabajo que se parte");
  var reloj = 0, vueltas = 0, listo = false;
  function ahora() { reloj += 3; return reloj; }
  while (!listo && vueltas < 100) { vueltas++; listo = T.paso(reloj + 12, ahora); }
  assert(listo && vueltas > 3 && tramos === Math.ceil(6 * GX * GX / 1024), "se parte en " + vueltas + " tajadas, de a tramos (" + tramos + " tramos para " + 6 * GX * GX + " vértices)");
  assert(planos === 0, "no arma ninguna malla para saber los vértices (armarla eran 10-20 ms de una vez, medido)");
  /* dónde cae cada vértice: la cuenta de Phaser 3.80.1 (GenerateGridVerts),
     leída del vendor, y la de toma_remate.js (uvDeLaMalla) */
  var V = leer("phaser/vendor/phaser.min.js");
  assert(V.indexOf("var K=Y+W*(P/F),Z=G+H*(R/D);U.push(K,Z)") > 0 &&
    V.indexOf("$=2*(P+k*R),tt=2*(P+k*(R+1)),et=2*(P+1+k*(R+1)),it=2*(P+1+k*R)") > 0 &&
    V.indexOf("M.verts.push(rt,ot,at,ht,lt,ut)") > 0 && /rt=new a\(X\[\$\],X\[\$\+1\],0,U\[\$\],U\[\$\+1\]/.test(V) &&
    /ot=new a\(X\[tt\][^)]*U\[tt\][^)]*\)\.transformMat4\(u\),at=new a\(X\[it\][^)]*\)\.transformMat4\(u\),ht=new a\(X\[tt\][^)]*\)\.transformMat4\(u\),lt=new a\(X\[et\][^)]*\)\.transformMat4\(u\),ut=new a\(X\[it\]/.test(V),
    "el vendor arma los vértices de la malla con la cuenta que copia uvDeLaMalla (si se actualiza Phaser, esto avisa)");
  var UV = Wm.PampaUvDeLaMalla(GX, { u0: 0, u1: 1, v0: 0, v1: 1 }, tw, th);
  assert(UV.n === 6 * GX * GX && UV.rx[0] === 0 && UV.ry[1] === th / GX && UV.rx[2] === tw / GX && UV.rx[4] === tw / GX && UV.ry[4] === th / GX,
    "uvDeLaMalla: 6 vértices por celda en el orden de Phaser ((i,j) (i,j+1) (i+1,j) (i,j+1) (i+1,j+1) (i+1,j))");
  var B = PI.huesos(POSES.poses.remate.pierna, tw, th);
  var rx = UV.rx, ry = UV.ry;
  var entero = PI.pesos(rx, ry, B), dist = 0;
  for (var k = 0; k < UV.n; k++) if (entero.hw[k] !== W8visto.hw[k] || entero.kw[k] !== W8visto.kw[k]) dist++;
  assert(dist === 0, "los pesos por tramos son los de una vez (" + dist + " distintos)");
  tramos = 0;
  var T2 = s.trabajoDePesosDeLaToma();
  assert(T2.paso(1e9, function () { return 0; }) === true && tramos === 0, "la segunda vez ya están: termina sin calcular nada (los usa la toma)");
})();

/* =========================================================================
   [4] · EL TOPE DE CUADROS, CON EL ALGORITMO DEL VENDOR
   Revisión del lote: el tope fijo de 61 dejaba 60 y 120 Hz en 60 cuadros,
   pero bajaba a la mitad las pantallas de 75, 90 y 100 Hz (37,5, 45 y 50:
   stepLimitFPS pone el delta en cero sin arrastrar el resto). Ahora el tope
   sale de medir la pantalla (logic/carga.js, topeDeCuadros) y cada pantalla
   se simula con el algoritmo de Phaser sacado del vendor.
   ========================================================================= */
(function () {
  var V = leer("phaser/vendor/phaser.min.js");
  /* todo dentro del TimeStep: "step:function" y "tick:function" aparecen en
     otras clases del vendor, así que se busca desde su stepLimitFPS */
  var desde = V.indexOf("stepLimitFPS:function") - 2000;
  function sacar(nombre, hasta) {
    var a = V.indexOf("," + nombre + ":function", desde) + 1, b = V.indexOf(hasta, a);
    return a > 0 && b > a ? V.slice(a + nombre.length + 1, b) : null;
  }
  var fSmooth = sacar("smoothDelta", ",updateFPS:function"), fStep = sacar("stepLimitFPS", ",step:function");
  var fPaso = sacar("step", ",tick:function"), fTick = sacar("tick", "},sleep:function");
  assert(!!fSmooth && !!fStep && !!fPaso && !!fTick, "se pueden sacar smoothDelta, stepLimitFPS, step y tick de vendor/phaser.min.js");
  if (!fSmooth || !fStep || !fPaso || !fTick) return;
  /* tick: hasFpsLimit ? stepLimitFPS : step — el campo que prende y apaga
     PampaTopeDeCuadros se lee en CADA cuadro */
  assert(/this\.hasFpsLimit\?this\.stepLimitFPS\(t\):this\.step\(t\)/.test(fTick), "TimeStep.tick elige con hasFpsLimit en cada cuadro (por eso se puede cambiar en marcha)");
  function TimeStep(limit) {
    this.deltaHistory = []; for (var i = 0; i < 10; i++) this.deltaHistory[i] = 1000 / 60;
    this.deltaIndex = 0; this.deltaSmoothingMax = 10; this._coolDown = 0; this.inFocus = true;
    this._min = 1000 / 5; this._target = 1000 / 60; this.smoothStep = true;
    this.fpsLimit = limit || 0; this.hasFpsLimit = limit > 0; this._limitRate = limit > 0 ? 1000 / limit : 0;
    this.delta = 0; this.lastTime = 0; this.time = 0; this.nextFpsUpdate = 1e12; this.framesThisSecond = 0; this.frame = 0;
    this.llamadas = 0; var self = this; this.callback = function () { self.llamadas++; };
  }
  TimeStep.prototype.smoothDelta = eval("(" + fSmooth + ")");
  TimeStep.prototype.stepLimitFPS = eval("(" + fStep + ")");
  TimeStep.prototype.step = eval("(" + fPaso + ")");
  TimeStep.prototype.updateFPS = function () { };
  /* la pantalla, con un temblor de ±0,4 ms entre cuadros (determinista) */
  function intervalos(hz, n, temblor) {
    var out = [], semilla = 7;
    for (var i = 0; i < n; i++) { semilla = (semilla * 9301 + 49297) % 233280; out.push(1000 / hz + ((semilla / 233280) - 0.5) * 2 * (temblor || 0)); }
    return out;
  }
  /* cuadros por segundo del juego con un tope dado, 10 s de pantalla */
  function cuadros(hz, limit, temblor) {
    var ts = new TimeStep(limit), t = 0;
    intervalos(hz, hz * 10, temblor).forEach(function (d) {
      t += d;
      if (ts.hasFpsLimit) ts.stepLimitFPS(t); else ts.step(t);
    });
    return ts.llamadas / 10;
  }
  var R = BAL.rendimiento;
  assert(R.fps_libre_hasta_hz === 100 && R.fps_muestras >= 30 && R.fps_limite === undefined, "balance.rendimiento: fps_libre_hasta_hz 100 y fps_muestras (el fps_limite fijo se fue)");
  /* lo que estaba mal: el 61 fijo del lote */
  var c75 = cuadros(75, 61), c90 = cuadros(90, 61), c100 = cuadros(100, 61);
  assert(Math.abs(c75 - 37.5) < 0.6 && Math.abs(c90 - 45) < 0.6 && Math.abs(c100 - 50) < 0.6,
    "SÍNTOMA (el tope fijo de 61): 75 Hz da " + c75 + " cuadros por segundo, 90 Hz " + c90 + " y 100 Hz " + c100 + " (la mitad)");
  assert(cuadros(60, 60) < 50, "y 60 justo daba " + cuadros(60, 60) + " en 60 Hz (por eso el tope nunca va justo en n cuadros)");
  /* lo de ahora: cada pantalla, medida y simulada */
  var esperado = { 60: 60, 75: 75, 90: 90, 100: 100, 120: 60, 144: 72, 165: 82.5, 240: 80 };
  var linea = [];
  Object.keys(esperado).forEach(function (k) {
    var hz = Number(k);
    [0, 0.4, 1.2].forEach(function (temblor) {
      var d = C.topeDeCuadros(intervalos(hz, R.fps_muestras, temblor), R);
      var fps = d ? cuadros(hz, d.limite, temblor) : -1;
      assert(!!d && Math.abs(fps - esperado[k]) < 0.6,
        hz + " Hz (temblor ±" + temblor + " ms): el juego corre a " + fps + " cuadros por segundo y tiene que ser " + esperado[k] + " (divisor " + (d && d.divisor) + ", tope " + (d && d.limite.toFixed(1)) + ")");
      if (temblor === 0.4) linea.push(hz + "→" + fps);
    });
  });
  var d75 = C.topeDeCuadros(intervalos(75, 60, 0.4), R), d120 = C.topeDeCuadros(intervalos(120, 60, 0.4), R);
  assert(d75.limite === 0 && d75.divisor === 1, "75 Hz corre SIN tope");
  assert(d120.divisor === 2 && d120.limite > 61 && d120.limite < 120, "120 Hz: 1 de cada 2, con el tope a mitad de camino (" + d120.limite.toFixed(1) + ")");
  /* sin muestras que sirvan (la pestaña atrás, el juego trabado) no decide */
  assert(C.topeDeCuadros([], R) === null && C.topeDeCuadros(intervalos(2, 60, 0), R) === null, "sin muestras de pantalla (intervalos de 500 ms) no se decide nada");
  /* el medidor: decide cada fps_muestras y avisa solo cuando cambia el divisor */
  var aplicados = [];
  var M = C.crearMedidorDeCuadros(R, function (d) { aplicados.push(d.divisor); });
  intervalos(120, R.fps_muestras * 3, 0.4).forEach(function (x) { M.anotar(x); });
  assert(aplicados.join(",") === "2", "con la pantalla a 120 Hz se aplica UNA vez (" + aplicados.join(",") + ")");
  intervalos(60, R.fps_muestras * 2, 0.4).forEach(function (x) { M.anotar(x); });
  assert(aplicados.join(",") === "2,1" && M.actual().limite === 0, "si la pantalla baja a 60 Hz (ahorro de batería), el tope se apaga (" + aplicados.join(",") + ")");
  intervalos(2, R.fps_muestras, 0).forEach(function (x) { M.anotar(x); });
  assert(aplicados.length === 2, "una tanda sin muestras de pantalla no cambia nada");
  /* el enganche en el juego de verdad: cine_arte.js con un juego de mentira */
  var Wc = { PampaCarga: C, PampaAmbiente: require(path.join(RAIZ, "phaser/logic/ambiente.js")), PampaHalo: require(path.join(RAIZ, "phaser/logic/halo.js")) };
  var oyentes = {};
  var juego = { loop: { rawDelta: 0, fpsLimit: 0, hasFpsLimit: false, _limitRate: 0, delta: 5 },
    events: { on: function (n, f) { (oyentes[n] = oyentes[n] || []).push(f); } },
    registry: { get: function (k) { return k === "balance" ? BAL : null; } } };
  var ctxC = { window: Wc, document: {}, performance: { now: function () { return 0; } }, console: console, Math: Math, MessageChannel: undefined, setTimeout: function () { } };
  vm.createContext(ctxC);
  vm.runInContext(leer("phaser/scenes/cine_arte.js"), ctxC, { filename: "cine_arte.js" });
  assert(typeof Wc.PampaTopeDeCuadros === "function", "cine_arte.js trae PampaTopeDeCuadros");
  if (typeof Wc.PampaTopeDeCuadros === "function") {
    assert(!!Wc.PampaTopeDeCuadros(juego) && Wc.PampaTopeDeCuadros(juego) === null, "se engancha una vez");
    intervalos(120, R.fps_muestras, 0.4).forEach(function (x) { juego.loop.rawDelta = x; (oyentes.prestep || []).forEach(function (f) { f(); }); });
    var L = juego.loop;
    assert(L.hasFpsLimit && Math.abs(L._limitRate - 1000 / L.fpsLimit) < 1e-9 && L.delta === 0 && Wc.__PAMPA_FPS && Wc.__PAMPA_FPS.divisor === 2,
      "en 120 Hz prende el tope del TimeStep (fpsLimit " + (L.fpsLimit && L.fpsLimit.toFixed(1)) + ", hasFpsLimit, _limitRate) y lo deja en __PAMPA_FPS");
  }
  var IDX = leer("phaser/index.html");
  assert(/fps: \{ target: 60 \},/.test(IDX) && !/fps_limite/.test(IDX), "la config del juego arranca SIN tope fijo");
  assert(/window\.PampaTopeDeCuadros\(game\)/.test(IDX), "el postBoot engancha el tope según la pantalla");
  assert(/fps_libre_hasta_hz/.test(R._nota) && /37,5/.test(R._nota), "la _nota cuenta la regla y lo que pasaba con el 61 fijo");
  console.log("[4] el tope según la pantalla, con el algoritmo de Phaser del vendor: " + linea.join(" · ") + " (con el 61 fijo: 75→" + c75 + ", 90→" + c90 + ", 100→" + c100 + ")");
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
  var tp = C.textoCuadros(p, null, null, { hz: 119.8, divisor: 2, limite: 80 });
  assert(/ · PANTALLA 120 Hz · 1 de cada 2$/.test(tp) && / · PANTALLA 90 Hz · sin tope$/.test(C.textoCuadros(p, null, null, { hz: 90.1, divisor: 1, limite: 0 })),
    "y lo que decidió el tope según la pantalla (" + tp + ")");
  assert(/window\.__PAMPA_FPS\)/.test(leer("phaser/index.html")), "?perf=1 le pasa la decisión (__PAMPA_FPS)");
  var IDX = leer("phaser/index.html");
  assert(/window\.PampaPerf = \{/.test(IDX) && /if \(!perf \|\| !C \|\| !C\.anotarCuadro/.test(IDX), "index.html engancha el cuadro más largo solo con ?perf=1");
  assert(/"prestep"/.test(IDX) && /"postrender"/.test(IDX) && /PampaPerf\.enganchar\(game\)/.test(IDX), "mide de prestep a postrender, desde el postBoot");
  console.log("[5] ?perf=1: " + t);
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
