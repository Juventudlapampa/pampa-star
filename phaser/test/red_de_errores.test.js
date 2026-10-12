/* ============================================================================
   PAMPA STAR · LA RED DE ERRORES (tanda 1.0)

   LO QUE ESTABA MAL, MEDIDO:
     · `grep onerror|unhandledrejection` en phaser/ (sin vendor) daba 0.
     · El loop de Phaser 3.80 es `step(t){ callback(t); if (running) raf(step) }`:
       si el callback tira, el cuadro siguiente no se pide nunca. Un delayedCall
       que tiraba dejó loop.frame clavado en 4119→4119 durante 1,5 s con
       loop.running=true: el juego congelado y nadie que se entere.
     · Con scenes/match.js sin bajar, el juego arrancaba igual en la intro y al
       ir a la cancha quedaban 0 escenas: lienzo negro, sin mensaje.
     · La PWA instalada (display: standalone) no tiene botón de recargar.

   QUÉ MIRA ESTE TEST:
     [1] index.html tiene la red ANTES del motor, los dos listeners, el paso
         del juego envuelto, la lista de globales con las 4 clases de escena,
         el .catch del arranque y el chequeo antes de new Phaser.Game.
     [2] la red DE VERDAD: se corre el script de index.html con un window de
         mentira y un juego de mentira cuyo step tira. El error no se escapa,
         se guarda pampa_ultimo_error, aparece el aviso, el juego se pausa,
         al tope el loop se duerme, y VOLVER AL MENÚ lo despierta y arranca el
         editor sin tocar el save.
     [3] los errores de afuera del loop, los scripts que no bajan, las
         promesas, y lo que se ignora (extensiones, audio).

   Corré:  node phaser/test/red_de_errores.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var HTML = fs.readFileSync(path.join(RAIZ, "phaser/index.html"), "utf8").replace(/\r\n/g, "\n");
var Informe = require(path.join(RAIZ, "phaser/logic/informe.js"));

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

var scripts = [];
HTML.replace(/<script>([\s\S]*?)<\/script>/g, function (_, c) { scripts.push(c); return _; });
var RED = scripts.filter(function (c) { return c.indexOf("window.PampaRed") >= 0; })[0] || "";
var ARRANQUE = scripts.filter(function (c) { return c.indexOf("function arrancarCon") >= 0; })[0] || "";

/* ---------- [1] LO QUE TIENE QUE ESTAR EN index.html ---------- */
(function () {
  assert(RED.length > 0, "index.html tiene que traer el script de la red (window.PampaRed)");
  var iRed = HTML.indexOf("window.PampaRed = {");
  var iMotor = HTML.indexOf('src="vendor/phaser.min.js"');
  assert(iRed > 0 && iMotor > 0 && iRed < iMotor,
    "la red va ANTES de vendor/phaser.min.js: si el motor no baja, el script que lo usa tira y alguien tiene que verlo");
  assert(/addEventListener\("error"/.test(RED), "falta el listener de 'error'");
  assert(/addEventListener\("error"[\s\S]*?\}, true\)/.test(RED),
    "el listener de 'error' va en CAPTURA: un <script> que no baja dispara en el elemento y no burbujea");
  assert(/addEventListener\("unhandledrejection"/.test(RED), "falta el listener de 'unhandledrejection'");
  assert(/Ph\.Game\.prototype/.test(RED) && /P\.step = function \(time, delta\) \{\s*try \{/.test(RED) && /\} catch \(e\) \{\s*R\.registrar\(e, "cuadro"\)/.test(RED),
    "el paso del juego (Phaser.Game.prototype.step) va envuelto en try/catch y registra el error");
  assert(/loop\.sleep\(\)/.test(RED), "al tope de errores el loop se duerme (loop.sleep)");
  assert(/pampa_ultimo_error/.test(RED), "el error se guarda en localStorage pampa_ultimo_error");
  ["Algo se trabó", "VOLVER AL MENÚ", "RECARGAR", "REINTENTAR", "No terminó de bajar el juego", "COPIAR INFORME"].forEach(function (t) {
    assert(HTML.indexOf(t) >= 0, "el aviso tiene que decir '" + t + "'");
  });
  /* la lista de globales con las 4 clases de escena, y que sean LAS MISMAS que
     el juego registra en config.scene (si una cambia de nombre, se cambian las dos) */
  var mLista = RED.match(/OBLIGATORIOS:\s*\[([^\]]*)\]/);
  var lista = mLista ? mLista[1].replace(/[\s"]/g, "").split(",") : [];
  var mScene = ARRANQUE.match(/scene:\s*\[([^\]]*)\]/);
  var clases = mScene ? mScene[1].replace(/\s|window\./g, "").split(",") : [];
  assert(clases.length === 4, "config.scene registra las 4 escenas (intro, editor, master, match)");
  clases.forEach(function (c) { assert(lista.indexOf(c) >= 0, "la lista de obligatorios tiene que traer " + c); });
  ["Phaser", "PampaPartido", "PampaTemporada", "PampaMaster", "PampaAvatar", "PampaSFX"].forEach(function (g) {
    assert(lista.indexOf(g) >= 0, "la lista de obligatorios tiene que traer " + g);
  });
  /* cada clase obligatoria la publica de verdad algún script que index.html carga */
  var cargados = [];
  HTML.replace(/<script src="([^"]+)"/g, function (_, s) { cargados.push(s); return _; });
  lista.filter(function (g) { return g !== "Phaser"; }).forEach(function (g) {
    var lo = cargados.some(function (s) {
      var src = ""; try { src = fs.readFileSync(path.join(RAIZ, "phaser", s), "utf8"); } catch (e) { }
      return src.indexOf("window." + g + " =") >= 0 || src.indexOf("root." + g + " =") >= 0;
    });
    assert(lo, g + " está en la lista de obligatorios pero ningún script de index.html lo publica");
  });
  /* el arranque: chequeo antes del juego, envoltorio antes del juego, catch */
  var iChequeo = ARRANQUE.indexOf("R.faltantes()"), iEnv = ARRANQUE.indexOf("R.envolver(window.Phaser)");
  var iJuego = ARRANQUE.indexOf("new Phaser.Game(config)");
  assert(iChequeo > 0 && iChequeo < iJuego, "arrancarCon chequea los obligatorios ANTES de new Phaser.Game");
  assert(iEnv > 0 && iEnv < iJuego, "el step se envuelve ANTES de new Phaser.Game (Game.start ata this.step.bind(this))");
  assert(/R\.mostrar\("no_bajo"\);\s*return;/.test(ARRANQUE), "si falta algo, avisa 'no terminó de bajar' y NO crea el juego");
  assert(/\}\)\.catch\(\(e\)=>\{/.test(ARRANQUE), "el Promise.all del arranque tiene su .catch");
  assert(ARRANQUE.indexOf("R.arrancado = true") > iJuego, "R.arrancado se prende después de crear el juego");
  console.log("[1] index.html: red antes del motor · 2 listeners · step envuelto · " + lista.length + " obligatorios · catch del arranque");
})();

/* ---------- el entorno de mentira ---------- */
function entorno() {
  var els = {}, store = {}, wl = {}, recargas = { n: 0 };
  function el(id) {
    if (!els[id]) {
      els[id] = {
        id: id, hidden: id === "trabado" || id === "tb-informe", textContent: "", value: "", hijos: [], ls: {},
        addEventListener: function (t, f) { (this.ls[t] = this.ls[t] || []).push(f); },
        appendChild: function (c) { this.hijos.push(c); },
        focus: function () { env.foco = id; }, select: function () { },
        click: function () { (this.ls.click || []).forEach(function (f) { f({}); }); }
      };
    }
    return els[id];
  }
  var win = {
    addEventListener: function (t, f, cap) { (wl[t] = wl[t] || []).push({ f: f, cap: !!cap }); },
    innerWidth: 800, innerHeight: 360, devicePixelRatio: 2,
    matchMedia: function () { return { matches: false }; }
  };
  var env = {
    win: win, el: el, store: store, wl: wl, recargas: recargas, foco: null,
    nav: { userAgent: "Mozilla/5.0 (Linux; Android 13) Prueba", clipboard: null },
    disparar: function (t, ev) { (wl[t] || []).forEach(function (l) { l.f(ev); }); }
  };
  var doc = { getElementById: el, createElement: function (t) { return { tag: t }; }, createTextNode: function (t) { return { text: t }; } };
  var ls = { getItem: function (k) { return store[k] == null ? null : store[k]; }, setItem: function (k, v) { store[k] = String(v); } };
  var loc = { origin: "http://localhost:8123", protocol: "http:", reload: function () { recargas.n++; } };
  var consola = { error: function () { }, log: function () { } };
  win.PampaInforme = Informe;
  new Function("window", "document", "localStorage", "navigator", "location", "console", RED)(win, doc, ls, env.nav, loc, consola);
  env.R = win.PampaRed;
  return env;
}

/* un Phaser y un juego de mentira: el step tira mientras romper sea true */
function juegoDeMentira(env) {
  function Game() { }
  Game.prototype.step = function () { if (this.romper) { var x = null; return x.x; } this.pasos++; };
  var Ph = { Game: Game };
  var g = Object.create(Game.prototype);
  /* el KeyboardPlugin de cada escena: resetKeys suelta todas (como Key.reset de Phaser) */
  function teclado() {
    return { flecha: { isDown: false }, resets: 0, resetKeys: function () { this.resets++; this.flecha.isDown = false; return this; } };
  }
  var match = { sys: { settings: { key: "match", status: 5 } }, input: { keyboard: teclado() }, estado: "LIBRE", st: { tiempo: 2, minuto: 85, golesMio: 1, golesRival: 0 } };
  var editor = { sys: { settings: { key: "editor", status: 8 } }, input: { keyboard: teclado() } };
  g.romper = true; g.pasos = 0; g.isPaused = false; g.pausas = 0; g.isRunning = true;
  g.pause = function () { this.isPaused = true; this.pausas++; };
  g.resume = function () { this.isPaused = false; };
  g.loop = { running: true, dormidas: 0, sleep: function () { this.running = false; this.dormidas++; }, wake: function () { this.running = true; } };
  g.paradas = []; g.arrancadas = []; g.sacados = [];
  g.scene = {
    getScenes: function (act) { return act ? [match].filter(function (s) { return s.sys.settings.status === 5; }) : [editor, match]; },
    getScene: function (k) { return k === "match" ? match : editor; },
    stop: function (k) { g.paradas.push(k); g.scene.getScene(k).sys.settings.status = 8; },
    start: function (k) { g.arrancadas.push(k); g.scene.getScene(k).sys.settings.status = 5; }
  };
  g.registry = { get: function () { return null; }, remove: function (k) { g.sacados.push(k); } };
  env.win.PAMPA_GAME = g;
  env.R.arrancado = true;
  return { Ph: Ph, g: g, match: match, editor: editor };
}

/* ---------- [2] LA RED, CORRIENDO ---------- */
(function () {
  var env = entorno(), R = env.R;
  assert(!!R, "el script de la red publica window.PampaRed");
  assert(env.win.PAMPA_VERSION && /^v\d+/.test(env.win.PAMPA_VERSION), "y window.PAMPA_VERSION");
  var J = juegoDeMentira(env), g = J.g;
  /* el save existe y NO se toca */
  env.store.pampa_master_v1 = JSON.stringify({ miClub: "Halcones de Toay", division: "primera_b" });
  var saveAntes = env.store.pampa_master_v1;

  assert(R.envolver(J.Ph) === true, "envolver() envuelve el step");
  assert(R.envolver(J.Ph) === false, "y una segunda vez no lo envuelve encima (un solo try)");
  var escapo = false;
  try { g.step(0, 16); } catch (e) { escapo = true; }
  assert(!escapo, "SÍNTOMA DEL BUG: la excepción del step se escapa y el loop deja de pedir cuadros");
  var reg = null; try { reg = JSON.parse(env.store.pampa_ultimo_error); } catch (e) { }
  assert(reg && /Cannot read|null/.test(reg.mensaje), "se guarda pampa_ultimo_error con el mensaje (" + (reg && reg.mensaje) + ")");
  assert(reg && reg.escena === "match" && reg.estado && reg.estado.minuto === 85, "con la escena y el estado del partido");
  assert(reg && reg.origen === "cuadro" && reg.v === env.win.PAMPA_VERSION, "con el origen y la versión");
  assert(env.el("trabado").hidden === false, "aparece el aviso");
  assert(env.el("tb-tit").textContent === "Algo se trabó", "que dice 'Algo se trabó'");
  assert(!env.el("tb-menu").hidden && !env.el("tb-recargar").hidden && env.el("tb-reintentar").hidden,
    "con VOLVER AL MENÚ y RECARGAR (REINTENTAR es del otro caso)");
  assert(env.foco === "tb-menu", "el foco arranca en VOLVER AL MENÚ (teclado)");
  assert(g.isPaused, "el partido se PAUSA detrás del aviso (no sigue corriendo tapado)");
  assert(/versión v/.test(env.el("tb-version").textContent), "el aviso muestra la versión");

  /* SEGUIR IGUAL y el tope: tres errores sin juego limpio en el medio */
  env.el("tb-seguir").click();
  assert(!g.isPaused && env.el("trabado").hidden, "SEGUIR IGUAL saca el aviso y despausa");
  g.step(0, 16);
  assert(R.seguidos === 2 && g.loop.dormidas === 0, "segundo error seguido: todavía no se duerme");
  env.el("tb-seguir").click();
  g.step(0, 16);
  assert(g.loop.dormidas === 1 && R.dormido, "al tercero el loop se duerme (loop.sleep)");
  assert(env.el("tb-seguir").hidden, "y ya no se ofrece SEGUIR IGUAL");

  /* VOLVER AL MENÚ */
  env.el("tb-menu").click();
  assert(g.loop.running, "VOLVER AL MENÚ despierta el loop: el juego vuelve a pedir cuadros");
  assert(!g.isPaused, "y lo despausa");
  assert(g.paradas.indexOf("match") >= 0 && g.arrancadas.indexOf("editor") >= 0, "frena el partido y arranca el editor");
  assert(g.paradas.indexOf("editor") < 0, "el editor estaba apagado (SHUTDOWN): no hay nada que frenar, se arranca");
  assert(g.sacados.indexOf("masterPartido") >= 0, "la fecha del Master no queda colgada en el registry");
  assert(env.store.pampa_master_v1 === saveAntes, "el save NO se toca");
  assert(env.el("trabado").hidden, "el aviso se va");

  /* el juego limpio hace olvidar */
  g.romper = false;
  for (var i = 0; i < 130; i++) g.step(0, 16);
  assert(R.seguidos === 0, "después de ~2 s de juego limpio la cuenta vuelve a cero");
  console.log("[2] el step que tira: no se escapa · se guarda · aviso · pausa · al 3ro loop.sleep · VOLVER AL MENÚ despierta y va al editor");
})();

/* ---------- [3] AFUERA DEL LOOP ---------- */
(function () {
  var env = entorno(), R = env.R;
  /* antes de que exista el juego, un error se registra pero no se muestra:
     decide arrancarCon */
  env.disparar("error", { target: env.win, message: "x", error: new Error("de arranque"), filename: "http://localhost:8123/phaser/scenes/jugadon_ui.js" });
  assert(env.el("trabado").hidden && R.errores === 1, "antes del juego: se registra y no se muestra");

  /* un script que no baja: aviso de 'no bajó' aunque sea en el arranque */
  env.disparar("error", { target: { tagName: "SCRIPT", src: "http://localhost:8123/phaser/scenes/match.js" } });
  assert(R.faltan.length === 1, "el script que no bajó queda anotado");
  assert(!env.el("trabado").hidden && R.tipo === "no_bajo", "y se ve el aviso al toque");
  assert(env.el("tb-tit").textContent === "No terminó de bajar el juego", "que dice 'No terminó de bajar el juego'");
  assert(!env.el("tb-reintentar").hidden && env.el("tb-menu").hidden && env.el("tb-seguir").hidden, "con REINTENTAR (sin juego no hay menú al que volver)");
  env.el("tb-reintentar").click();
  assert(env.recargas.n === 1, "REINTENTAR recarga");
  /* faltantes: los globales y el script */
  var falt = R.faltantes();
  assert(falt.indexOf("PampaMatch") >= 0 && falt.indexOf("Phaser") >= 0, "faltantes() nombra los globales que no están");
  assert(falt.indexOf("scenes/match.js") >= 0, "y el script que no bajó, con ruta corta");
  /* un 'se trabó' no pisa al 'no bajó' */
  R.mostrar("trabado");
  assert(R.tipo === "no_bajo", "un 'se trabó' posterior no tapa el 'no bajó'");

  /* el script que BAJÓ pero el navegador no pudo leer (revisión del lote): se
     corre el arrancarCon real de index.html, con todo presente menos la clase
     del script que tiró un SyntaxError al leerse */
  var fuenteArranque = ARRANQUE.slice(ARRANQUE.indexOf("function arrancarCon"));
  function arranqueCon(envX) {
    return new Function("window", "Phaser", "localStorage", fuenteArranque + "\nreturn arrancarCon;")(envX.win, undefined, null);
  }
  var env4 = entorno(), R4 = env4.R;
  ["Phaser", "PampaIntro", "PampaEditor", "PampaMasterScene", "PampaPartido", "PampaTemporada", "PampaMaster", "PampaAvatar", "PampaSFX"]
    .forEach(function (n) { env4.win[n] = {}; });
  /* un SyntaxError de lectura trae el stack sin renglones "at …" (visto en
     el navegador): el lugar sólo está en el evento */
  var se = new SyntaxError("Unexpected token '?'"); se.stack = "SyntaxError: Unexpected token '?'";
  env4.disparar("error", { target: env4.win, message: "Uncaught SyntaxError: Unexpected token '?'",
    error: se, filename: "http://localhost:8123/phaser/scenes/match.js", lineno: 812, colno: 31 });
  arranqueCon(env4)();
  assert(env4.el("tb-tit").textContent === "El juego no pudo arrancar" && R4.tipo === "no_abre",
    "SÍNTOMA DEL DIAGNÓSTICO FALSO: con el script bajado y una clase que falta, el aviso NO dice 'No terminó de bajar' (dice '" + env4.el("tb-tit").textContent + "')");
  assert(!/conexión está floja/.test(env4.el("tb-txt").textContent) && /navegador/.test(env4.el("tb-txt").textContent),
    "y no culpa a la conexión: habla del navegador");
  assert(!env4.el("tb-reintentar").hidden && env4.el("tb-menu").hidden && env4.el("tb-seguir").hidden, "con REINTENTAR (no hay juego)");
  var reg4 = null; try { reg4 = JSON.parse(env4.store.pampa_ultimo_error); } catch (e) { }
  assert(reg4 && /SyntaxError/.test(reg4.mensaje), "pampa_ultimo_error guarda el SyntaxError, no lo pisa un 'no bajó: PampaMatch' (" + (reg4 && reg4.mensaje) + ")");
  var inf4 = R4.informe();
  assert(/error: SyntaxError/.test(inf4) && /no arrancó: PampaMatch/.test(inf4) && /dónde: scenes\/match\.js:812:31/.test(inf4),
    "el informe cuenta el SyntaxError, dónde, y qué no arrancó");
  R4.mostrar("trabado");
  assert(R4.tipo === "no_abre", "un 'se trabó' posterior no tapa el 'no pudo arrancar'");
  /* y si el script de verdad no bajó, sigue siendo 'no bajó' */
  var env5 = entorno(), R5 = env5.R;
  env5.disparar("error", { target: { tagName: "SCRIPT", src: "http://localhost:8123/phaser/scenes/match.js" } });
  arranqueCon(env5)();
  assert(R5.tipo === "no_bajo" && env5.el("tb-tit").textContent === "No terminó de bajar el juego", "un script que no bajó sigue diciendo 'No terminó de bajar'");

  var env2 = entorno(), R2 = env2.R, J = juegoDeMentira(env2);
  /* lo que se ignora */
  env2.disparar("error", { target: env2.win, message: "Script error.", error: null, filename: "" });
  env2.disparar("error", { target: env2.win, message: "boom", error: new Error("boom"), filename: "chrome-extension://abc/inyectado.js" });
  env2.disparar("error", { target: env2.win, message: "ResizeObserver loop completed with undelivered notifications.", error: null });
  env2.disparar("unhandledrejection", { reason: { name: "AbortError", message: "play() interrupted by pause()" } });
  env2.disparar("unhandledrejection", { reason: { name: "NotAllowedError", message: "play() sin gesto" } });
  assert(R2.errores === 0 && env2.el("trabado").hidden, "se ignoran: extensiones, 'Script error.' de otro origen, ResizeObserver y el audio sin gesto");
  /* un error de un toque (afuera del cuadro) */
  env2.disparar("error", { target: env2.win, message: "TypeError: x", error: new TypeError("x is undefined"), filename: "http://localhost:8123/phaser/scenes/match.js" });
  assert(!env2.el("trabado").hidden && R2.tipo === "trabado" && J.g.isPaused, "un error de un toque muestra 'Algo se trabó' y pausa");
  env2.el("tb-seguir").click();
  env2.disparar("unhandledrejection", { reason: new Error("promesa rota") });
  assert(!env2.el("trabado").hidden, "una promesa rechazada también");
  /* con el aviso, el teclado no le llega al juego de atrás */
  var cortado = false;
  env2.disparar("keydown", { stopImmediatePropagation: function () { cortado = true; } });
  assert(cortado, "con el aviso a la vista, las teclas no le llegan a Phaser");
  var keyCap = (env2.wl.keydown || []).every(function (l) { return l.cap; });
  assert(keyCap, "y se cortan EN CAPTURA (Phaser escucha en window, en burbuja)");
  /* la flecha que quedaba apretada: el keydown llegó ANTES del error, el keyup
     se cortó con el aviso encima, y el KeyboardPlugin no resetea con
     game.pause(). Al salir del aviso, las teclas se sueltan. */
  var flecha = J.match.input.keyboard.flecha;
  flecha.isDown = true;
  var keyupCortado = false;
  env2.disparar("keyup", { stopImmediatePropagation: function () { keyupCortado = true; } });
  assert(keyupCortado, "con el aviso a la vista, el keyup tampoco le llega a Phaser");
  env2.el("tb-seguir").click();
  assert(flecha.isDown === false,
    "SÍNTOMA DE LA FLECHA PEGADA: después de SEGUIR IGUAL la tecla soltada con el aviso encima tiene que quedar suelta (el jugador corría solo)");
  flecha.isDown = true;
  env2.disparar("unhandledrejection", { reason: new Error("otra promesa rota") });
  env2.el("tb-menu").click();
  assert(flecha.isDown === false, "y lo mismo con VOLVER AL MENÚ");
  console.log("[3] afuera del loop: script que no baja → REINTENTAR · toque y promesa → aviso · ruido del navegador ignorado");
})();

/* ---------- [4] COPIAR INFORME ---------- */
(function () {
  var env = entorno(), R = env.R, J = juegoDeMentira(env);
  env.store.pampa_star_v1 = JSON.stringify({ name: "Rocío Benítez", vida: { amigos: [{ nombre: "Pato Quiroga" }] } });
  env.store.pampa_master_v1 = JSON.stringify({ miClub: "Halcones de Toay" });
  R.envolver(J.Ph);
  J.g.romper = true; J.g.step(0, 16);
  /* sin portapapeles: el texto queda seleccionable */
  env.el("tb-copiar").click();
  var txt = env.el("tb-informe").value;
  assert(!env.el("tb-informe").hidden && txt.length > 0, "sin navigator.clipboard, el informe queda a la vista para copiar a mano");
  assert(txt.indexOf("versión: " + env.win.PAMPA_VERSION) >= 0 && /escena: match/.test(txt), "el informe trae la versión y la escena");
  ["Rocío", "Benítez", "Pato", "Halcones"].forEach(function (s) {
    assert(txt.indexOf(s) < 0, "el informe NO lleva '" + s + "' (dato del save)");
  });
  assert(/quien te pasó el juego/.test(env.el("tb-ayuda").textContent), "sin contacto cargado, la ayuda dice a quién mandarlo sin inventar un destino");
  /* con portapapeles */
  var copiado = null;
  env.nav.clipboard = { writeText: function (t) { copiado = t; return Promise.resolve(); } };
  env.el("tb-copiar").click();
  return Promise.resolve().then(function () { return null; }).then(function () {
    assert(copiado && copiado.indexOf("versión:") >= 0, "con navigator.clipboard, se copia el informe");
    assert(/COPIADO/.test(env.el("tb-copiar").textContent) && /✓/.test(env.el("tb-copiar").textContent),
      "y el botón lo dice con texto y tilde (no sólo un color)");
    console.log("[4] COPIAR INFORME: con y sin portapapeles · versión y escena · sin nombre ni club");
  });
})().then(function () {
  parte5();
  console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
  process.exit(mal === 0 ? 0 : 1);
});

/* ---------- [5] VOLVER AL MENÚ CONTRA EL SceneManager DE PHASER 3.80 ----------
   Lo que encontró la revisión del lote, medido después en el navegador con el
   Phaser de verdad: el juego de mentira de [2] no tiene cola ni estados de
   escena, así que no podía ver que
     · processQueue es `for (i...) this[op](...); this._queue.length = 0`: si
       un create() tira adentro de un cambio de pantalla, la cola NO se vacía, y
       el cuadro siguiente la vuelve a correr (editor 5→8, master 8→4: volvía a
       la escena rota, no al menú);
     · SceneManager.start hace `if (status >= START && status <= CREATING)
       return this`: con el editor roto en CREATING, VOLVER AL MENÚ escondía el
       aviso y no pasaba nada (editor a medio armar, sin aviso);
     · si el juego nunca arrancó (isRunning false), loop.wake() sólo prende un
       requestAnimationFrame vacío.
   Este SceneManager de mentira copia esas tres semánticas de vendor/phaser.min.js. */
function juegoConEscenas(env, rotas) {
  var C = { PENDING: 0, INIT: 1, START: 2, LOADING: 3, CREATING: 4, RUNNING: 5, SHUTDOWN: 8 };
  var esc = {};
  ["intro", "editor", "master", "match"].forEach(function (k) {
    esc[k] = { creadas: 0, sys: { settings: { key: k, status: C.INIT, active: false } } };   // agregada, nunca arrancada
  });
  var sm = {
    _queue: [],
    getScenes: function (act) {
      var l = Object.keys(esc).map(function (k) { return esc[k]; });
      return act ? l.filter(function (s) { return s.sys.settings.status === C.RUNNING; }) : l;
    },
    getScene: function (k) { return esc[k] || null; },
    queueOp: function (op, a, b) { this._queue.push({ op: op, keyA: a, keyB: b }); },
    /* como Phaser 3.80: si una op tira, la cola queda como estaba */
    processQueue: function () {
      for (var i = 0; i < this._queue.length; i++) { var s = this._queue[i]; this[s.op](s.keyA, s.keyB); }
      this._queue.length = 0;
    },
    start: function (k) {
      var s = esc[k], c = s.sys.settings;
      if (c.status >= C.START && c.status <= C.CREATING) return this;   // como Phaser 3.80
      c.status = C.START; c.active = true;      // Systems.start
      c.status = C.INIT;                        // bootScene: después de init()
      c.status = C.CREATING; s.creadas++;       // nada que bajar: create() corre acá mismo
      if (rotas[k] > 0) { rotas[k]--; throw new TypeError(k + ".create: Cannot read properties of undefined (reading 'x')"); }
      c.status = C.RUNNING;
      return this;
    },
    stop: function (k) { var c = esc[k].sys.settings; if (c.status !== C.SHUTDOWN) { c.status = C.SHUTDOWN; c.active = false; } return this; }
  };
  function Game() { }
  Game.prototype.step = function () { if (this.isPaused) return; this.scene.processQueue(); this.cuadros++; };
  var g = Object.create(Game.prototype);
  g.scene = sm; g.cuadros = 0; g.isPaused = false; g.isRunning = true;
  g.pause = function () { this.isPaused = true; };
  g.resume = function () { this.isPaused = false; };
  g.loop = { running: true, sleep: function () { this.running = false; }, wake: function () { this.running = true; } };
  g.registry = { get: function () { return null; }, remove: function () { } };
  /* ScenePlugin.start desde una escena: encola el stop de sí misma y el start del destino */
  g.irA = function (desde, hacia) { sm.queueOp("stop", desde); sm.queueOp("start", hacia); };
  env.win.PAMPA_GAME = g;
  env.R.arrancado = true;
  env.R.envolver({ Game: Game });
  return { g: g, esc: esc, C: C };
}
function parte5() {
  function estados(J) { return Object.keys(J.esc).map(function (k) { return k + ":" + J.esc[k].sys.settings.status; }).join(" "); }

  /* A · el create del Master tira en el cambio de pantalla (la cola vieja) */
  var env = entorno(), R = env.R, J = juegoConEscenas(env, { master: 99 }), g = J.g;
  g.scene.start("editor"); g.step(0, 16);
  g.irA("editor", "master");
  g.step(0, 16);
  assert(!env.el("trabado").hidden && J.esc.master.sys.settings.status === J.C.CREATING,
    "el create del Master tira en el cambio de pantalla: aviso a la vista y Master a medio armar (" + estados(J) + ")");
  assert(g.scene._queue.length === 2, "(la semántica de Phaser 3.80: la cola del cambio de pantalla quedó sin vaciar)");
  assert(env.el("tb-seguir").hidden, "con una escena a medio armar no se ofrece SEGUIR IGUAL: esa pantalla quedaría congelada");
  assert(!env.el("tb-menu").hidden, "VOLVER AL MENÚ sí se ofrece");
  var errAntes = R.errores;
  env.el("tb-menu").click();
  for (var i = 0; i < 10; i++) g.step(0, 16);
  assert(J.esc.editor.sys.settings.status === J.C.RUNNING,
    "SÍNTOMA DE LA COLA VIEJA: después de VOLVER AL MENÚ y diez cuadros el editor tiene que seguir RUNNING (" + estados(J) + ")");
  assert(J.esc.master.sys.settings.status !== J.C.CREATING && R.errores === errAntes,
    "y no se vuelve a la escena rota ni se repite el error (" + (R.errores - errAntes) + " errores nuevos)");
  assert(env.el("trabado").hidden && g.cuadros >= 10, "el aviso se fue y el juego pasa cuadros");

  /* B · el que tiró es el propio editor, una vez (un save raro que VOLVER AL MENÚ ya sacó) */
  env = entorno(); R = env.R; J = juegoConEscenas(env, { editor: 1 }); g = J.g;
  g.scene.start("master"); g.step(0, 16);
  g.irA("master", "editor");
  g.step(0, 16);
  assert(J.esc.editor.sys.settings.status === J.C.CREATING && !env.el("trabado").hidden, "el create del editor tira: queda en CREATING y sale el aviso");
  env.el("tb-menu").click();
  assert(J.esc.editor.creadas === 2 && J.esc.editor.sys.settings.status === J.C.RUNNING,
    "SÍNTOMA DEL EDITOR EN CREATING: VOLVER AL MENÚ tiene que frenarlo y arrancarlo de nuevo, no quedarse en el start que no hace nada (" + estados(J) + ", create x" + J.esc.editor.creadas + ")");
  assert(env.el("trabado").hidden, "y el aviso se va porque el menú arrancó");

  /* C · el editor tira siempre: el aviso vuelve, ahora sólo con RECARGAR */
  env = entorno(); R = env.R; J = juegoConEscenas(env, { editor: 99 }); g = J.g;
  g.scene.start("master"); g.step(0, 16);
  g.irA("master", "editor");
  g.step(0, 16);
  env.el("tb-menu").click();
  assert(!env.el("trabado").hidden, "si el menú tampoco arranca, el aviso NO desaparece en silencio");
  assert(env.el("tb-menu").hidden && env.el("tb-seguir").hidden && !env.el("tb-recargar").hidden,
    "y queda sólo RECARGAR (VOLVER AL MENÚ ya no lleva a ningún lado)");
  assert(env.foco === "tb-recargar", "con el foco en RECARGAR");
  assert(/recargar no lo toca/.test(env.el("tb-txt").textContent), "y el texto habla de recargar, no de volver al menú");
  assert(R.menuRoto && R.ultimo && R.ultimo.origen === "menu", "el error del menú queda registrado (origen 'menu')");

  /* D · el juego existe pero nunca arrancó (el init de la primera escena tiró
     adentro de texturesReady, antes de Game.start) */
  env = entorno(); R = env.R; J = juegoConEscenas(env, {}); g = J.g;
  g.isRunning = false;
  env.disparar("error", { target: env.win, message: "x", error: new TypeError("intro.init roto"), filename: "http://localhost:8123/phaser/scenes/intro.js" });
  assert(!env.el("trabado").hidden, "un error antes de que el loop arranque muestra el aviso");
  assert(env.el("tb-menu").hidden && env.el("tb-seguir").hidden && !env.el("tb-recargar").hidden,
    "SÍNTOMA DEL LOOP VACÍO: sin juego andando sólo se ofrece RECARGAR (VOLVER AL MENÚ y SEGUIR IGUAL dejaban la pantalla muerta)");
  R.volverAlMenu();
  assert(env.recargas.n === 1, "y si igual se llama a volverAlMenu, recarga");
  console.log("[5] contra la semántica de Phaser 3.80: cola vieja vaciada · el menú roto se frena y rearranca · si no arranca, sólo RECARGAR · sin loop, sólo RECARGAR");
}
