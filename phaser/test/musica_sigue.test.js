/* ============================================================================
   PAMPA STAR · phaser/test/musica_sigue.test.js

   Rodri, 25/oct: "la música tiene que seguir al partido, como en los juegos
   de fútbol de NES" y "que te gusten 3 estilos". Lo que se prueba:
     [1] cada estilo trae su defensa (loop) y su remate (corto), propios
     [2] seguirPosesion: con la pelota el partido, sin la pelota la defensa,
         sin prender y apagar (estable_ms y minimo_ms de balance.musica.sigue)
     [3] el partido: el cine pide el remate y la vuelta pide el que toque
     [4] los gustos: la MEZCLA rota solo entre los estilos marcados
   ========================================================================== */
var path = require("path");
var fs = require("fs");
var RAIZ = path.join(__dirname, "..", "..");
function assert(c, m) { if (!c) { console.error("FALLA: " + m); process.exit(1); } }
function json(r) { return JSON.parse(fs.readFileSync(path.join(RAIZ, r), "utf8")); }

var MUS = require("../logic/musica.js");
var O = require("../logic/opciones.js");
var A = json("data/audio.json"), BAL = json("phaser/data/balance.json");
var B = "../assets/musica/";

(function () {
  [null, "cuarteto", "rock", "rap"].forEach(function (k) {
    var mapa = MUS.mapaCompleto(A, 0, B, k);
    assert(mapa.defensa && mapa.defensa.loop && /defensa_loop\.ogg$/.test(mapa.defensa.archivo), (k || "folklore") + ": la defensa es un loop propio (" + (mapa.defensa && mapa.defensa.archivo) + ")");
    assert(mapa.remate && !mapa.remate.loop && /_remate\.ogg$/.test(mapa.remate.archivo), (k || "folklore") + ": el remate es corto y propio");
    assert(fs.existsSync(path.join(RAIZ, "assets/musica", mapa.defensa.archivo.replace(B, ""))) && fs.existsSync(path.join(RAIZ, "assets/musica", mapa.remate.archivo.replace(B, ""))), (k || "folklore") + ": los archivos existen");
    assert(mapa.partido.archivo !== mapa.defensa.archivo, (k || "folklore") + ": sin la pelota suena otro tema");
  });
  var sinDefensa = { temas: A.temas, estilos: { rock: { partido: A.estilos.rock.partido } } };
  assert(MUS.mapaCompleto(sinDefensa, 0, B, "rock").defensa.archivo === B + A.estilos.rock.partido.archivo, "un estilo sin defensa cae en su partido: mismo archivo, no se corta");
  assert(MUS.siguientes("partido").indexOf("defensa") >= 0 && MUS.siguientes("partido").indexOf("remate") >= 0, "con el partido sonando se precargan la defensa y el remate");
  console.log("[1] los cuatro estilos traen defensa y remate propios");
})();

(function () {
  var cfg = BAL.musica.sigue;
  assert(cfg && cfg.estable_ms > 0 && cfg.minimo_ms >= cfg.estable_ms, "balance.musica.sigue trae estable_ms y minimo_ms");
  var mem = { suena: "partido", quiere: null, desde: 0, cambio: null };
  assert(MUS.seguirPosesion(mem, "mia", 0, cfg) === null, "con la pelota y el partido sonando no se toca nada");
  assert(MUS.seguirPosesion(mem, "rival", 100, cfg) === null, "la pérdida recién empezada no cambia el tema");
  assert(MUS.seguirPosesion(mem, "rival", 100 + cfg.estable_ms, cfg) === "defensa", "la pérdida sostenida pasa a la defensa");
  var t = 100 + cfg.estable_ms;
  assert(MUS.seguirPosesion(mem, "mia", t + 10, cfg) === null && MUS.seguirPosesion(mem, "mia", t + cfg.estable_ms + 10, cfg) === null, "recuperarla enseguida no prende y apaga: falta minimo_ms");
  assert(MUS.seguirPosesion(mem, "mia", t + cfg.minimo_ms, cfg) === "partido", "pasado minimo_ms vuelve el partido");
  assert(MUS.seguirPosesion(mem, null, t + cfg.minimo_ms * 3, cfg) === null && mem.suena === "partido", "la pelota suelta no cambia nada");
  console.log("[2] con la pelota, sin la pelota: cambia con " + cfg.estable_ms + " ms de posesión y " + cfg.minimo_ms + " ms entre cambios");
})();

(function () {
  var src = fs.readFileSync(path.join(RAIZ, "phaser/scenes/match.js"), "utf8").replace(/\r\n/g, "\n");
  var cine = src.slice(src.indexOf("  entrarCine() {"), src.indexOf("  salirCine("));
  assert(/this\.FLAGS\.musica_sigue\) this\.pedirMusica\("remate"\)/.test(cine), "el cine del remate pide el tema del remate");
  assert(/this\._musicaMomento === "remate"\) this\.musicaDelJuego\(\)/.test(src), "al volver del remate suena el que toque");
  assert(/else this\.seguirMusica\(\);/.test(src), "el juego corrido sigue la posesión");
  assert(BAL.flags.musica_sigue === true && BAL.flags.musica_tres_estilos === true, "las dos perillas del 25/oct, prendidas");
  console.log("[3] el partido pide el remate en el cine y vuelve con o sin la pelota");
})();

(function () {
  function guarda() { var d = {}; return { getItem: function (k) { return d[k] == null ? null : d[k]; }, setItem: function (k, v) { d[k] = String(v); }, removeItem: function (k) { delete d[k]; } }; }
  var st = guarda();
  st.setItem(O.CLAVE, JSON.stringify({ v: O.VERSION, estilo: "mezcla", gustos: ["rock", "rap", "folklore"] }));
  assert(O.leer(st, BAL, A).gustos.join() === "rock,rap,folklore", "los gustos guardados se leen");
  var vistos = {};
  for (var i = 0; i < 40; i++) vistos[O.rotarMezcla(st, BAL, A, "f" + i, Math.random)] = 1;
  assert(Object.keys(vistos).sort().join() === "folklore,rap,rock", "la MEZCLA rota solo entre los tres que te gustan (" + Object.keys(vistos).join() + ")");
  var largo = O.sanear({ v: O.VERSION, estilo: "mezcla", gustos: ["rock", "rap", "folklore", "cuarteto", "rock", "otro"] }, BAL, A).gustos;
  assert(largo.length === BAL.musica.gustos_max && largo.indexOf("otro") < 0, "los gustos se sanean: sin repetidos, sin estilos que no existen, hasta " + BAL.musica.gustos_max);
  assert(O.sanear({ v: 1, estilo: "folklore" }, BAL, A).gustos.length === 0, "unas opciones viejas sin gustos rotan entre los cuatro, como antes");
  var BAL0 = JSON.parse(JSON.stringify(BAL)); BAL0.flags.musica_tres_estilos = false;
  var todos = {};
  for (var j = 0; j < 60; j++) todos[O.rotarMezcla(st, BAL0, A, "g" + j, Math.random)] = 1;
  assert(Object.keys(todos).length === 4, "con la perilla apagada rota entre los cuatro");
  console.log("[4] la MEZCLA rota entre los gustos (" + Object.keys(vistos).join(", ") + ")");
})();

console.log("musica_sigue: OK");
