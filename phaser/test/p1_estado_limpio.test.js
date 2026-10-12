/* ============================================================================
   PAMPA STAR · P1 — LA ESCENA DEL PARTIDO ARRANCA LIMPIA

   EL BUG: Rodri llegó al segundo partido del Modo Master y el mapa apareció
   vacío. Sin cancha, sin jugadores, sin "◄ TU ARCO". Y así quedaba para el
   resto de la carrera.

   LA CAUSA: Phaser NO crea una escena nueva en cada `scene.start("match")`.
   Reusa la MISMA instancia y solo vuelve a correr init() y create(). Entonces
   todo campo que se escriba durante el partido y no se reinicie en init()
   llega prendido al partido siguiente.

   El culpable fue `_finalApagado`: se prende al terminar el partido (PIEL P9,
   para que el mapa no se repinte encima de la pantalla de final) y nunca se
   apagaba. En la fecha 2, `dibujarRadar()` salía por esa guarda en el primer
   renglón.

   POR QUÉ ESTE TEST Y NO UN ARREGLO SUELTO: el bug no es una línea, es una
   CLASE de bug. Cada vez que alguien agregue una bandera nueva al partido va a
   poder repetirlo. Este test busca, en el archivo, toda asignación de `true` /
   `false` / `!!` a un campo de la escena hecha FUERA de init()/create(), y
   exige que init() la reinicie.

   Los objetos (sprites, textos, gráficos) no hacen falta: create() los vuelve
   a construir. Las banderas no las reconstruye nadie.

   TANDA 1.0 · EL GUARDIÁN ESTABA CIEGO. Lo midió la auditoría y lo volví a
   medir: la regex del paso [4] había perdido las barras invertidas
   (`/ifs*(s*!s*this.(_?[A-Za-z][w]*)s*)/`) y matcheaba 0 líneas contra 19
   reales, o sea que pasaba en verde sin mirar nada. Además el barrido leía
   solo match.js, y los mixins (definicion_ui, escenas_v9, piel_ui…) escriben
   en la MISMA instancia. Y [1] solo mira booleanos, así que no veía los
   caches de texto. Por esos tres agujeros se colaron:
     · _hudDiv — desde la fecha 2 el marcador mostraba la división VACÍA
       (medido en vivo: 'PRIMERA B' en la fecha 1 y '' en la 2), porque el
       texto nace vacío en buildHUD y el cache decía que ya estaba puesto;
     · _tribunaCansancio — el partido 2 heredaba la marca 't2' y la tribuna
       no comentaba el cansancio (1 comentario en el partido 1, 0 en el 2);
     · _hudEnvionEst, _escalonActual, _poseArqueroUltima, y más.
   Ahora: [4] con la regex arreglada y sobre todos los archivos, [5] barre
   match.js y sus mixins buscando todo campo que se use como MEMORIA (se
   compara, se niega, hace de guarda o tiene un valor por defecto con ||) y
   que init() no reinicie, y [6] es el guardián probándose a sí mismo: le saca
   a init dos reinicios a propósito y exige que los cace.

   Corré:  node phaser/test/p1_estado_limpio.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var ESC = path.join(RAIZ, "phaser/scenes");
function leer(f) { return fs.readFileSync(path.join(ESC, f), "utf8"); }

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* los comentarios afuera, conservando los saltos de línea (los números de
   línea de los mensajes siguen siendo los del archivo). Hace falta: el propio
   init() tiene un comentario que dice `this._radarTuArco = this.add.text(...)`,
   y leído crudo eso contaba como un reinicio que no existe. */
function sinComentarios(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, function (m) { return m.replace(/[^\n]/g, " "); })
    .replace(/(^|[^:"'\\])\/\/[^\n]*/g, function (m, a) { return a + m.slice(a.length).replace(/[^\n]/g, " "); });
}
function lineas(texto) { return sinComentarios(texto).split("\n"); }

/* ---------- QUÉ ARCHIVOS ESCRIBEN EN LA ESCENA DEL PARTIDO ----------
   1) los que se mezclan a mano: Object.assign(window.PampaMatch.prototype, …)
   2) los que index.html mezcla en las cuatro escenas (piel y foco)
   3) los ayudantes que reciben la escena por parámetro (`sc`) y le escriben
      campos: el hitstop de feel_ui y la tribuna. */
var MEZCLADOS = fs.readdirSync(ESC).filter(function (f) {
  return /\.js$/.test(f) && f !== "match.js" && /Object\.assign\(window\.PampaMatch\.prototype/.test(leer(f));
});
var INDEX = fs.readFileSync(path.join(RAIZ, "phaser/index.html"), "utf8");
var DE_TODAS = [];
(INDEX.match(/Object\.assign\(S\.prototype, window\.(Pampa\w+)\)/g) || []).forEach(function (m) {
  var global = m.match(/window\.(Pampa\w+)/)[1];
  fs.readdirSync(ESC).forEach(function (f) {
    if (/\.js$/.test(f) && new RegExp("window\\." + global + "\\s*=").test(leer(f))) DE_TODAS.push(f);
  });
});
var CON_SC = ["feel_ui.js", "tribuna_ui.js"];
var MIXINS = MEZCLADOS.concat(DE_TODAS, CON_SC).filter(function (f, i, a) { return a.indexOf(f) === i; });

function fuentesReales() {
  var F = { "match.js": leer("match.js") };
  MIXINS.forEach(function (f) { F[f] = leer(f); });
  return F;
}

/* ══════════════════════════════════════════════════════════════════════════
   EL ANÁLISIS, como función: [5] lo corre sobre los archivos de verdad y [6]
   sobre una copia rota a propósito.
   ══════════════════════════════════════════════════════════════════════════ */
function metodo(M, nombre) {
  var i = M.findIndex(function (l) { return new RegExp("^  " + nombre + "\\(").test(l); });
  if (i < 0) return null;
  for (var j = i + 1; j < M.length; j++) if (/^  [a-zA-Z_]+\(/.test(M[j])) return [i, j];
  return [i, M.length];
}
function analizar(F) {
  var M = lineas(F["match.js"]);
  var rInit = metodo(M, "init"), rCreate = metodo(M, "create");
  var limpios = {};
  function anotar(l) {
    (l.match(/this\.(_?[A-Za-z]\w*)\s*=(?!=)/g) || []).forEach(function (m) { limpios[m.match(/this\.(_?\w+)/)[1]] = true; });
  }
  /* init() y create(), enteros */
  for (var i = rInit[0]; i < rCreate[1]; i++) anotar(M[i]);
  /* LOS CONSTRUCTORES: los build* que create() llama (y los que llaman ellos)
     más armarPlanteles. Lo que asignan EN SU CUERPO se rehace en cada
     partido. Solo el cuerpo (sangría de 4) y solo antes de un callback en la
     misma línea: `r.on("pointerdown", () => { this._uiTocado = … })` no
     reinicia nada, corre cuando tocás. */
  var cuerpoCreate = M.slice(rCreate[0] + 1, rCreate[1]).join("\n");
  var constructores = {}, cola = [], m;
  var reB = /this\.(build[A-Za-z]*|armarPlanteles)\(/g;
  while ((m = reB.exec(cuerpoCreate))) cola.push(m[1]);
  while (cola.length) {
    var b = cola.shift();
    if (constructores[b]) continue;
    var r = metodo(M, b);
    if (!r) continue;
    constructores[b] = r;
    var cuerpo = M.slice(r[0] + 1, r[1]).join("\n"), mb, reB2 = /this\.(build[A-Za-z]*)\(/g;
    while ((mb = reB2.exec(cuerpo))) cola.push(mb[1]);
  }
  Object.keys(constructores).forEach(function (b) {
    for (var i = constructores[b][0] + 1; i < constructores[b][1]; i++) {
      if (!/^    \S/.test(M[i])) continue;
      anotar(M[i].split(/=>|function\s*\(/)[0]);
    }
  });

  /* quién se ESCRIBE fuera de init/create y quién se lee como MEMORIA */
  var escritos = {}, memoria = {}, guardasPerezosas = 0, perezosos = [];
  Object.keys(F).forEach(function (nom) {
    var L = nom === "match.js" ? M : lineas(F[nom]);
    var yo = CON_SC.indexOf(nom) >= 0 ? "(?:this|self|sc)" : "(?:this|self)";
    L.forEach(function (l, n) {
      if (nom === "match.js" && n >= rInit[0] && n < rCreate[1]) return;
      var donde = nom + ":" + (n + 1), mm;
      var reW = new RegExp(yo + "\\.(_?[A-Za-z]\\w*)\\s*=(?!=)", "g");
      while ((mm = reW.exec(l))) (escritos[mm[1]] = escritos[mm[1]] || []).push(donde);
      [new RegExp(yo + "\\.(_?[A-Za-z]\\w*)\\s*[!=]==", "g"),                 // this._x !== algo
       new RegExp("[!=]==\\s*" + yo + "\\.(_?[A-Za-z]\\w*)\\b(?!\\s*\\()", "g"),  // algo === this._x
       new RegExp("if\\s*\\(\\s*!?\\s*" + yo + "\\.(_?[A-Za-z]\\w*)\\s*\\)", "g"),  // if (this._x) / if (!this._x)
       new RegExp(yo + "\\.(_?[A-Za-z]\\w*)\\s*\\|\\|", "g")                    // this._x || porDefecto
      ].forEach(function (re) { while ((mm = re.exec(l))) (memoria[mm[1]] = memoria[mm[1]] || []).push(donde); });
      /* [4] el cache perezoso: if (!this.X) … this.add/make en las líneas de al lado */
      var g = l.match(/if\s*\(\s*!\s*this\.(_?[A-Za-z]\w*)\s*\)/);
      if (g) {
        guardasPerezosas++;
        var ctx = l + " " + (L[n + 1] || "") + " " + (L[n + 2] || "");
        if (/this\.(add|make)\./.test(ctx) && !limpios[g[1]]) perezosos.push("this." + g[1] + " (" + donde + ")");
      }
    });
  });
  var sucios = Object.keys(memoria).filter(function (k) { return escritos[k] && !limpios[k]; }).sort();
  return { M: M, rInit: rInit, rCreate: rCreate, limpios: limpios, constructores: constructores,
    escritos: escritos, memoria: memoria, sucios: sucios, guardasPerezosas: guardasPerezosas, perezosos: perezosos };
}

/* LO QUE PUEDE CRUZAR DE PARTIDO A PROPÓSITO, con el motivo. NO agregar acá
   para poner el test en verde: si es estado del partido, va a init(). Cada
   motivo que dice "se restaura solo" trae la prueba de que eso sigue siendo
   cierto (si alguien borra la restauración, este test lo dice). */
var CRUZA_A_PROPOSITO = {
  "_piel": { motivo: "la paleta sale de balance.json, que no cambia entre partidos: es un cache de sesión",
    prueba: ["piel_ui.js", /if \(!this\._piel\)/] },
  "_pielTick": { motivo: "contador de cuadros para vestir botones cada N: cruzar solo corre la fase del módulo, no guarda nada del partido" },
  "_yendo": { motivo: "lo apaga entrarDesdeNegro(), que es lo primero que corre en create()",
    prueba: ["piel_ui.js", /entrarDesdeNegro: function \(\) \{[\s\S]{0,900}this\._yendo = false;/] },
  "_corteMusicaArmado": { motivo: "lo rearma el once('shutdown') del corte de música, al apagarse la escena",
    prueba: ["piel_ui.js", /esc\._corteMusicaArmado = false;/] },
  "_focoShutdown": { motivo: "lo apaga el on('shutdown') que él mismo engancha",
    prueba: ["foco_ui.js", /self\._focoShutdown = false;/] },
  "_enHitstop": { motivo: "feel_ui lo apaga en el mismo setTimeout que lo prende (dura milisegundos)",
    prueba: ["feel_ui.js", /sc\._enHitstop = false;/] },
  "_faltanPoses": { motivo: "registro de desarrollo: avisa UNA vez por pose faltante y por sesión en la consola; cruzar es a propósito" }
};

var A = analizar(fuentesReales());
var M = A.M;

/* ---------- [0] EL BARRIDO VE LO QUE TIENE QUE VER ---------- */
(function () {
  assert(A.rInit && A.rCreate && A.rCreate[0] > A.rInit[0], "match.js tiene que tener un init() y un create() después");
  ["cartas_ui.js", "cine_arte.js", "definicion_ui.js", "escenas_v9.js", "jugadon_ui.js", "toma_remate.js",
    "piel_ui.js", "foco_ui.js", "feel_ui.js"].forEach(function (f) {
    assert(MIXINS.indexOf(f) >= 0, "el barrido tiene que leer " + f + " (escribe en la misma instancia que match.js)");
  });
  ["buildHUD", "buildRadar", "buildBotonAccion", "buildCineBase", "armarPlanteles"].forEach(function (b) {
    assert(A.constructores[b], "create() tiene que seguir llamando a " + b + "() (el barrido lo cuenta como constructor)");
  });
  console.log("[0] " + (MIXINS.length + 1) + " archivos barridos (match.js + " + MIXINS.join(", ") + ") · " +
    Object.keys(A.constructores).length + " constructores de create()");
})();

/* ---------- [1] NINGUNA BANDERA SOBREVIVE AL PARTIDO ---------- */
(function () {
  var banderas = {};
  M.forEach(function (l, n) {
    if (n >= A.rInit[0] && n < A.rCreate[1]) return;
    (l.match(/this\.(_?[A-Za-z][\w]*)\s*=\s*(true|false|!!)/g) || []).forEach(function (m) {
      var k = m.match(/this\.(_?\w+)/)[1];
      (banderas[k] = banderas[k] || []).push(n + 1);
    });
  });
  var nombres = Object.keys(banderas);
  assert(nombres.length > 0, "el barrido tiene que encontrar banderas (si da 0, el regex se rompió)");

  var sucias = nombres.filter(function (k) { return !A.limpios[k]; });
  assert(sucias.length === 0,
    "estas banderas se escriben durante el partido y init() no las reinicia, así que llegan\n" +
    "      prendidas al partido siguiente (es exactamente el bug de la fecha 2):\n" +
    sucias.map(function (k) { return "        this." + k + " (líneas " + banderas[k].join(",") + ")"; }).join("\n"));
  console.log("[1] " + nombres.length + " banderas se escriben en el partido · " +
    (nombres.length - sucias.length) + " reiniciadas en init/create · " + sucias.length + " sucias");
})();

/* ---------- [2] LAS DEL ARREGLO, POR NOMBRE ---------- */
(function () {
  /* si alguien saca una de estas del init, que falle diciendo cuál */
  var bloqueInit = M.slice(A.rInit[0], A.rCreate[0]).join("\n");
  [["_finalApagado", "el mapa no se dibuja más: ES el bug de la fecha 2"],
   ["_medidoresOcultos", "AGUANTE y ENVIÓN quedan prendidos en el menú previo"],
   ["_panVivo", "si el partido terminó a mitad de un paneo, la cámara arranca creyendo que está paneando"],
   ["_esHeroico", "el portador arranca con la clase de sprite del partido anterior"],
   ["_radarTuArco", "el texto murió con la escena y la guarda perezosa no lo recrea: crash por cuadro"],
   /* TANDA 1.0 */
   ["_hudDiv", "desde la fecha 2 el marcador muestra la división VACÍA"],
   ["_hudEnvionEst", "'🌟 ENVIÓN LLENO' no se escribe si el partido anterior terminó igual"],
   ["_tribunaCansancio", "la tribuna no comenta el cansancio en el segundo partido"],
   ["_escalonActual", "el primer golpe del partido usa el escalón de la última escena del anterior"],
   ["_poseArqueroUltima", "la escala del arquero sale de la pose del partido anterior"],
   ["_relPendiente", "una frase que quedó esperando al final de la fecha 1 sale al arrancar la 2"],
   ["_lecturaSemana", "la semana de la fecha anterior seguiría valiendo en un amistoso"],
   ["_semanaResumen", "idem, el resumen de la semana"]
  ].forEach(function (par) {
    assert(bloqueInit.indexOf("this." + par[0] + " =") >= 0,
      "init() tiene que reiniciar this." + par[0] + " — si no: " + par[1]);
  });
  console.log("[2] las banderas y caches del arreglo siguen reiniciados por nombre");
})();

/* ---------- [3] LA GUARDA QUE CAUSÓ EL BUG SIGUE SIENDO NECESARIA ---------- */
(function () {
  /* no alcanza con limpiar la bandera: la guarda tiene que seguir existiendo,
     porque su motivo (que el mapa no se repinte sobre la pantalla final) es
     real. El arreglo era el reinicio, no borrar la guarda. */
  var SRC = leer("match.js");
  assert(/if \(this\._finalApagado\) return;/.test(SRC),
    "dibujarRadar tiene que seguir saliendo con _finalApagado: la guarda no era el error, " +
    "el error era que la bandera nunca se apagaba");
  var iRadar = M.findIndex(function (l) { return /^  dibujarRadar\(\)/.test(l); });
  var iGuarda = M.findIndex(function (l) { return /if \(this\._finalApagado\) return;/.test(l); });
  assert(iRadar > 0 && iGuarda > iRadar && iGuarda - iRadar < 12,
    "y la guarda vive adentro de dibujarRadar(), cerca del principio");
  console.log("[3] la guarda de la pantalla final sigue en pie (línea " + (iGuarda + 1) + ")");
})();

/* ---------- [4] LOS CACHES PEREZOSOS: LA OTRA MITAD DEL BUG ---------- */
(function () {
  /* Un objeto creado perezoso —  if (!this.X) this.X = this.add.text(...)  —
     muere con la escena anterior, pero la REFERENCIA sobrevive al
     scene.start(). La guarda da falso, no lo recrea, y el frame siguiente le
     manda setText() a un objeto destruido: crash por frame. Eso pasaba con
     _radarTuArco y tiraba abajo el update entero del segundo partido.
     La regex de este paso había perdido las barras y daba 0: ahora se cuenta
     cuántas guardas ve, para que un regex roto no vuelva a pasar en verde. */
  assert(A.guardasPerezosas >= 15,
    "el barrido tiene que ver las guardas `if (!this.X)` (vio " + A.guardasPerezosas + "; si da 0, el regex se rompió otra vez)");
  assert(A.perezosos.length === 0,
    "estos objetos se crean perezoso y init() no borra la referencia, así que en el partido" +
    " siguiente la guarda da falso y se le pegan métodos a un objeto DESTRUIDO: " + A.perezosos.join(" · "));
  console.log("[4] " + A.guardasPerezosas + " guardas `if (!this.X)` vistas · ningún cache perezoso queda con la referencia muerta");
})();

/* ---------- [5] TODA LA MEMORIA DEL PARTIDO ARRANCA DE CERO ---------- */
(function () {
  var conMemoria = Object.keys(A.memoria).filter(function (k) { return A.escritos[k]; });
  assert(conMemoria.length >= 60,
    "el barrido tiene que encontrar los campos que se usan como memoria (encontró " + conMemoria.length + "; si da poco, el regex se rompió)");
  var sucios = A.sucios.filter(function (k) { return !CRUZA_A_PROPOSITO[k]; });
  assert(sucios.length === 0,
    "estos campos se escriben durante el partido, se LEEN como memoria (se comparan, hacen de guarda o tienen\n" +
    "      un valor por defecto) y init() no los reinicia: llegan con el valor del partido anterior.\n" +
    "      Reinicialos en init() de match.js (o, si cruzar es a propósito, anotalo con el motivo en CRUZA_A_PROPOSITO):\n" +
    sucios.map(function (k) {
      return "        this." + k + " · se escribe en " + A.escritos[k].slice(0, 2).join(", ") + " · se lee en " + A.memoria[k].slice(0, 2).join(", ");
    }).join("\n"));
  /* la lista blanca no se pudre: cada entrada tiene que seguir siendo
     necesaria, y la restauración que alega tiene que seguir existiendo */
  Object.keys(CRUZA_A_PROPOSITO).forEach(function (k) {
    var e = CRUZA_A_PROPOSITO[k];
    assert(A.sucios.indexOf(k) >= 0,
      "CRUZA_A_PROPOSITO['" + k + "'] ya no hace falta (o init lo reinicia o no se usa más): sacala de la lista");
    if (e.prueba) assert(e.prueba[1].test(leer(e.prueba[0])),
      "CRUZA_A_PROPOSITO['" + k + "'] dice '" + e.motivo + "' y en " + e.prueba[0] + " ya no está esa restauración");
  });
  console.log("[5] " + conMemoria.length + " campos usados como memoria · " + (A.sucios.length - sucios.length) +
    " cruzan a propósito (con motivo) · " + sucios.length + " sucios");
})();

/* ---------- [6] EL GUARDIÁN SE PRUEBA A SÍ MISMO ----------
   El agujero de antes fue un guardián que pasaba en verde sin mirar. Acá se le
   rompe el init a propósito, en una copia, y tiene que cazarlo. */
(function () {
  function sinLinea(re) {
    var F = fuentesReales();
    var antes = F["match.js"];
    F["match.js"] = antes.replace(re, "");
    assert(F["match.js"] !== antes, "la mutación de prueba tiene que encontrar su línea (" + re + ")");
    return analizar(F);
  }
  var a = sinLinea(/this\._radarTuArco = null;/);
  assert(a.sucios.indexOf("_radarTuArco") >= 0, "sin `this._radarTuArco = null` en init, [5] tiene que nombrar _radarTuArco");
  assert(a.perezosos.some(function (p) { return p.indexOf("_radarTuArco") >= 0; }), "y [4] también (es un cache perezoso)");
  var b = sinLinea(/this\._hudDiv = null;/);
  assert(b.sucios.indexOf("_hudDiv") >= 0, "sin el reinicio de _hudDiv en init, [5] tiene que nombrar _hudDiv");
  var c = sinLinea(/this\._tribunaCansancio = null;/);
  assert(c.sucios.indexOf("_tribunaCansancio") >= 0, "y sin el de _tribunaCansancio, nombrarlo");
  console.log("[6] roto a propósito: caza _radarTuArco ([4] y [5]), _hudDiv y _tribunaCansancio");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
