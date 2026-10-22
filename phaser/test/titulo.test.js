/* ============================================================================
   PAMPA STAR · LA PANTALLA DE TÍTULO (pedido de Rodri del 20/oct)

   Después de la intro aparecían "¡A LA CANCHA!" y "🏆 CARRERA" sueltos en el
   editor de la pinta: "no es un juego así". Ahora la intro lleva a
   scenes/titulo.js, con el logo y tres opciones: JUGAR CARRERA, PARTIDO
   RÁPIDO y OPCIONES. Este test recorre las tres con la escena de verdad
   (teclado y toque), y prueba que lo de OPCIONES se guarda saneado
   (logic/opciones.js) y que el partido rápido no toca la carrera.
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var M = require("./_escena_de_mentira.js");
var RAIZ = M.RAIZ;
function leer(f) { return fs.readFileSync(path.join(RAIZ, f), "utf8").replace(/\r\n/g, "\n"); }
var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

var O = require("../logic/opciones.js");
var AT = require("../logic/atras.js");
var BAL = JSON.parse(leer("phaser/data/balance.json"));

/* ---------- [1] LAS OPCIONES SE LEEN SANEADAS ---------- */
(function () {
  var def = O.porDefecto(BAL);
  assert(def.musica === O.NIVELES && def.efectos === O.NIVELES && def.estilo === "folklore" && def.duracion === "intermedio",
    "de fábrica: volúmenes al tope (la mezcla medida), FOLKLORE e INTERMEDIO");
  var est = O.estilos(BAL, JSON.parse(leer("data/audio.json")));
  assert(est.map(function (e) { return e.n; }).join() === "FOLKLORE,CUARTETO,ROCK,RAP", "la perilla lista los cuatro estilos en orden (" + est.map(function (e) { return e.n; }).join() + ")");
  assert(est.filter(function (e) { return e.disponible; }).map(function (e) { return e.k; }).join() === "folklore,cuarteto,rock,rap", "desde el 20/oct los cuatro estilos traen el tema del partido y se pueden elegir");
  var raro = O.sanear({ musica: 11, efectos: -1, estilo: "rock", duracion: "eterno" }, BAL, null);
  assert(raro.musica === 10 && raro.efectos === 10 && raro.estilo === "folklore" && raro.duracion === "intermedio",
    "valores fuera de rango, un estilo sin temas y una duración que no existe vuelven a fábrica");
  var sinPartido = O.sanear({ estilo: "rock", musica: 3 }, BAL, { estilos: { rock: { opening: { archivo: "x.ogg" } } } });
  assert(sinPartido.estilo === "folklore" && sinPartido.musica === 3, "un ROCK sin tema del partido no se puede elegir: es el que cubre los momentos que el estilo no tiene");
  var conRock = O.sanear({ estilo: "rock", musica: 3 }, BAL, { estilos: { rock: { partido: { archivo: "x.ogg" } } } });
  assert(conRock.estilo === "rock" && conRock.musica === 3, "con el tema del partido de ROCK en audio.json, ROCK se puede elegir (el lote de música solo suma temas)");
  var store = {};
  var ls = { getItem: function (k) { return store[k] == null ? null : store[k]; }, setItem: function (k, v) { store[k] = String(v); }, removeItem: function (k) { delete store[k]; } };
  store[O.CLAVE] = "{roto";
  assert(O.leer(ls, BAL, null).musica === 10, "un save roto se lee como de fábrica");
  O.guardar(ls, Object.assign(O.porDefecto(BAL), { musica: 4, duracion: "largo" }));
  var vuelta = O.leer(ls, BAL, null);
  assert(vuelta.musica === 4 && vuelta.duracion === "largo" && vuelta.v === O.VERSION, "lo guardado vuelve igual, con su versión");
  console.log("[1] opciones saneadas: fábrica, rangos, estilos con temas, save roto");
})();

/* ---------- [2] NO QUEDAN LOS CAMINOS VIEJOS ---------- */
(function () {
  var intro = leer("phaser/scenes/intro.js"), editor = leer("phaser/scenes/editor.js"), html = leer("phaser/index.html");
  assert(!/irA\("editor"\)/.test(intro) && (intro.match(/irA\("titulo"\)/g) || []).length === 2, "la intro sale siempre a la pantalla de título");
  assert(!/btn\([^\n]*A LA CANCHA/.test(editor) && !/add\.text\([^\n]*🏆 CARRERA/.test(editor), "el editor ya no ofrece ¡A LA CANCHA! ni 🏆 CARRERA");
  assert(/scene: \[ window\.PampaIntro, window\.PampaTitulo,/.test(html) && /menu: "titulo"/.test(html), "index.html registra el título después de la intro y VOLVER AL MENÚ lleva ahí");
  assert(/"\.\/logic\/opciones\.js", "\.\/scenes\/titulo\.js"/.test(leer("phaser/sw.js")), "y los dos archivos nuevos van en el PRECACHE");
  assert(AT.decidir({ escena: "titulo", vista: "opciones" }, Infinity) === "volver" && AT.decidir({ escena: "titulo", vista: "menu" }, Infinity) === "confirmar_salida",
    "el atrás del teléfono: en OPCIONES vuelve al título; en el título pide confirmar");
  console.log("[2] intro → título, el editor sin las salidas sueltas, index.html y sw.js");
})();

/* ---------- [3] LAS TRES OPCIONES, CON LA ESCENA DE VERDAD ---------- */
function armarTitulo(store) {
  var A = M.armar({ logicaExtra: ["phaser/logic/opciones.js"], escena: "phaser/scenes/titulo.js", clase: "PampaTitulo", key: "titulo" });
  Object.keys(store || {}).forEach(function (k) { A.store[k] = store[k]; });
  var sonidos = [], vol = [];
  var mudo = false;
  A.window.PampaSFX = {
    ui: function (n) { sonidos.push(n); return true; },
    isMuted: function () { return mudo; }, setMuted: function (m) { mudo = !!m; },
    setVolumenes: function (m, e) { vol.push([m, e]); }
  };
  var s = A.nueva(), musica = [];
  s.crudoDelMaster = function () { return A.localStorage.getItem("pampa_master_v1"); };
  /* la puerta de la música (piel_ui.js pedirMusica), anotada */
  s.pedirMusica = function (m) { musica.push("pedir:" + m); return true; };
  s.create();
  return { A: A, s: s, sonidos: sonidos, vol: vol, musica: musica, mudo: function () { return mudo; } };
}
function centro(s, texto) {
  var t = s.children.list.filter(function (o) { return o.type === "Text" && o.text === texto; })[0];
  return t ? [t.x, t.y] : null;
}

(function () {
  /* JUGAR CARRERA, con el dedo */
  var T = armarTitulo();
  var tx = T.s.textos();
  assert(tx.indexOf("▶ JUGAR CARRERA") >= 0 && tx.indexOf("PARTIDO RÁPIDO") >= 0 && tx.indexOf("OPCIONES") >= 0, "el título muestra las tres opciones (" + tx.join(" | ") + ")");
  assert(T.s._foco && T.s._foco.i === 0, "el cursor arranca en JUGAR CARRERA");
  var c = centro(T.s, "▶ JUGAR CARRERA");
  T.A.registry.set("partidoRapido", { rival: "x" });
  T.s.tocar(c[0], c[1]);
  assert(T.s._irA.join() === "master" && T.sonidos.indexOf("confirmar") >= 0, "tocar JUGAR CARRERA va al Master (" + T.s._irA.join() + "), con su sonido");
  assert(T.A.registry.get("partidoRapido") === undefined, "y un partido rápido anterior no se cuela en la carrera");

  /* PARTIDO RÁPIDO, con el teclado; la carrera guardada no se toca */
  var guardada = JSON.stringify({ club: "El Bagual de Winifreda", temporada: { fecha: 4 } });
  var R = armarTitulo({ pampa_master_v1: guardada });
  assert(R.s.textos().indexOf("seguís con El Bagual de Winifreda") >= 0, "con carrera guardada, JUGAR CARRERA dice con qué club se sigue");
  R.s.teclas("DOWN");
  assert(R.s._foco.i === 1 && R.sonidos.indexOf("mover") >= 0, "flecha abajo: PARTIDO RÁPIDO, con el sonido del cursor");
  R.s.teclas("ENTER");
  var pr = R.A.registry.get("partidoRapido");
  var rivales = R.A.datos.divisiones.divisiones.primera_b.rivales;
  assert(R.s._irA.join() === "match" && pr && rivales.indexOf(pr.rival) >= 0 && pr.division === "primera_b" && pr.nivel === R.A.window.PampaMaster.nivelDeDivision("primera_b"),
    "ENTER arma un partido contra un rival de la Primera B y va a la cancha (" + JSON.stringify(pr) + ")");
  assert(pr && pr.tempo === "intermedio" && R.A.registry.get("masterPartido") === undefined && R.A.store.pampa_master_v1 === guardada,
    "con la duración de OPCIONES, sin masterPartido y con la carrera guardada intacta");

  /* OPCIONES */
  var P = armarTitulo();
  var co = centro(P.s, "OPCIONES");
  P.s.tocar(co[0], co[1]);
  var to = P.s.textos();
  assert(P.s._vista === "opciones" && ["SONIDO", "MÚSICA", "EFECTOS", "ESTILO DE MÚSICA", "DURACIÓN", "VELOCIDAD", "◀ VOLVER"].every(function (n) { return to.indexOf(n) >= 0; }),
    "OPCIONES tiene sonido, música, efectos, estilo, duración, velocidad y VOLVER (" + to.join(" | ") + ")");
  assert(to.indexOf("✔ FOLKLORE") >= 0 && ["CUARTETO", "ROCK", "RAP"].every(function (n) { return to.indexOf(n) >= 0; }) &&
    to.filter(function (t) { return t === "próximamente"; }).length === 3, "FOLKLORE elegido con ✔; CUARTETO, ROCK y RAP listados con \"próximamente\"");
  /* música: abajo y tres a la izquierda */
  P.s.teclas("DOWN"); P.s.teclas("LEFT"); P.s.teclas("LEFT"); P.s.teclas("LEFT");
  var g = JSON.parse(P.A.store[O.CLAVE]);
  assert(g.musica === 7 && P.vol[P.vol.length - 1][0] === 0.7 && P.s.textos().indexOf("7 de 10") >= 0, "◄ tres veces en MÚSICA: 7 de 10, guardado y aplicado al sonido");
  /* efectos ya está al tope: ► suena el "no" */
  P.s.teclas("DOWN"); P.sonidos.length = 0; P.s.teclas("RIGHT");
  assert(JSON.parse(P.A.store[O.CLAVE]).efectos === 10 && P.sonidos.join() === "bloqueado", "EFECTOS al tope: ► no pasa de 10 y suena el no");
  /* estilo: no se puede elegir uno sin temas, ni con flechas ni con el dedo */
  P.s.teclas("DOWN"); P.sonidos.length = 0; P.s.teclas("RIGHT");
  assert(JSON.parse(P.A.store[O.CLAVE]).estilo === "folklore" && P.sonidos.join() === "bloqueado" &&
    P.s.textos().some(function (t) { return /próximamente, todavía no tienen temas/.test(t); }), "► en ESTILO: sigue FOLKLORE, suena el no y se dice por qué");
  var cq = centro(P.s, "CUARTETO");
  P.s.tocar(cq[0], cq[1]);
  assert(JSON.parse(P.A.store[O.CLAVE]).estilo === "folklore", "tocar CUARTETO tampoco lo elige");
  /* duración y velocidad */
  P.s._fila = 3; P.s.teclas("DOWN"); P.s.teclas("RIGHT");
  assert(JSON.parse(P.A.store[O.CLAVE]).duracion === "largo" && P.s.textos().indexOf("✔ LARGO") >= 0, "► en DURACIÓN: de NORMAL a LARGO, guardado");
  P.s.teclas("DOWN"); P.s.teclas("RIGHT");
  assert(P.A.store.pampa_velocidad === "rapida", "► en VELOCIDAD: RÁPIDA, en la misma clave que usa la PAUSA");
  /* sonido, con el dedo */
  var cn = centro(P.s, "NO");
  P.s.tocar(cn[0], cn[1]);
  assert(P.mudo() === true && P.s.textos().indexOf("✔ NO") >= 0, "tocar NO en SONIDO apaga el sonido");
  /* el atrás del teléfono y ESC vuelven al título */
  P.A.juegoEventos.emit("atras", { decision: "volver", escena: "titulo" });
  assert(P.s._vista === "menu" && P.s.textos().indexOf("▶ JUGAR CARRERA") >= 0, "atrás del teléfono en OPCIONES: vuelve al título");
  P.s.vistaOpciones(); P.s.teclas("ESC");
  assert(P.s._vista === "menu", "ESC en OPCIONES también vuelve");

  /* lo guardado se respeta al volver a abrir: el partido rápido sale LARGO */
  var Z = armarTitulo(P.A.store);
  assert(Z.s.op.musica === 7 && Z.s.op.duracion === "largo", "al volver a abrir el juego, las opciones siguen");
  Z.s.partidoRapido();
  assert(Z.A.registry.get("partidoRapido").tempo === "largo", "y el partido rápido juega con la duración elegida");

  /* con data/audio.json en el registro (como en el juego): ► en ESTILO elige
     CUARTETO, lo guarda y vuelve a registrar la música con el estilo nuevo */
  var E = armarTitulo();
  /* 20/oct, Rodri: el estilo se elegía a ciegas; el título ya suena */
  assert(E.musica.join() === "pedir:espera", "el título pide la música de espera al abrir (" + E.musica.join() + ")");
  E.A.registry.set("audio", JSON.parse(leer("data/audio.json")));
  var registros = [];
  E.s.registrarMusicaGlobal = function (forzar) { registros.push(forzar); E.musica.push("registrar"); };
  E.s.vistaOpciones();
  assert(E.s.textos().indexOf("próximamente") < 0, "con los temas del 20/oct ningún estilo dice próximamente");
  E.s._fila = 3; E.sonidos.length = 0; E.s.teclas("RIGHT");
  assert(JSON.parse(E.A.store[O.CLAVE]).estilo === "cuarteto" && E.s.textos().indexOf("✔ CUARTETO") >= 0 && registros.join() === "true" && E.sonidos.join() === "confirmar",
    "► en ESTILO: CUARTETO, guardado, con su sonido y la música registrada de nuevo (" + E.sonidos.join() + ")");
  var cr = centro(E.s, "RAP");
  E.s.tocar(cr[0], cr[1]);
  assert(JSON.parse(E.A.store[O.CLAVE]).estilo === "rap" && registros.length === 2, "tocar RAP lo elige y vuelve a registrar la música");
  assert(E.musica.join() === "pedir:espera,registrar,pedir:espera,registrar,pedir:espera",
    "cada estilo elegido suena en el momento: primero el registro con el estilo nuevo y después la espera (" + E.musica.join() + ")");
  console.log("[3] JUGAR CARRERA (dedo), PARTIDO RÁPIDO (teclado), OPCIONES (las seis filas, guardadas)");
})();

/* ---------- [4] EL PARTIDO RÁPIDO EN LA CANCHA, Y LA CARRERA NUEVA ---------- */
(function () {
  var C = require("./_create_de_mentira.js");
  var BALj = JSON.parse(leer("phaser/data/balance.json"));
  var P = C.jugar(undefined, { registro: { partidoRapido: { rival: "Espejo de Sal", division: "primera_b", nivel: 1, tempo: "largo" } } });
  assert(P.s.rivalEntero === "Espejo de Sal" && P.s._masterPartido === null && P.s._division && P.s._division.id === "primera_b",
    "el partido rápido juega contra su rival de la Primera B, sin carrera (" + P.s.rivalEntero + ")");
  assert(P.s.st.bal.tempo.minutos_por_momento === BALj.tempo.presets.largo, "y con la duración que trae");
  /* la carrera nueva trae marcada la duración de OPCIONES */
  var A = M.armar({ logicaExtra: ["phaser/logic/opciones.js"] });
  A.store[O.CLAVE] = JSON.stringify({ v: 1, musica: 10, efectos: 10, estilo: "folklore", duracion: "relampago" });
  var m = A.nueva();
  assert(m._tempoElegido === "relampago", "al crear la carrera, el tempo arranca en la duración de OPCIONES (" + m._tempoElegido + ")");
  console.log("[4] el partido rápido en la cancha y la carrera nueva con la duración elegida");
})();

if (mal === 0) console.log("\n✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("\n✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
