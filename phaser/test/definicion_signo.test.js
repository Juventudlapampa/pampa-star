/* ============================================================================
   PAMPA STAR · LA DEFINICIÓN ESTABA DADA VUELTA

   EL BUG, y es de signo, no de cable suelto. Desde la V9 §4 la ejecución del
   remate sale del que patea: su stat de tiro y lo que le queda de aguante. La
   escena lo armaba así:

       off = (0.5 - pun) * 0.5     con  pun = tiro*0.6 + tanque*0.4

   O sea que CUANTO MEJOR DEFINÍAS Y MÁS ENTERO LLEGABAS, MÁS LEJOS QUEDABA LA
   ZONA DULCE. Medido con el balance real: con el tanque lleno los cinco
   niveles de tiro (58, 70, 82, 90, 99) comían floja_penal −22, y el
   dulce_bonus de +8 no se vio NUNCA en ese estado desde que existe. Para tocar
   el punto dulce había que estar fundido, tanto más cuanto mejor fueras: tiro
   58 al 88% del tanque, tiro 99 al 27%.

   El juego te premiaba por ser peor y por llegar roto.

   Y LO QUE LO HIZO POSIBLE: la fórmula vivía en definicion_ui.js, o sea en la
   ESCENA, que no corre en node. Por eso sobrevivió a tres tandas de
   calibración de la Definición — nadie la pudo simular. Ahora vive en
   logic/definicion.desvioDeEjecucion() y este test la mira.

   El arquero tenía el MISMO signo invertido, más un segundo bug propio: leía
   el cansancio de st.mios[st.ctrl], el jugador de campo que controlás. Tu
   arquero se cansaba de correr vos.

   Corré:  node phaser/test/definicion_signo.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var D = require(path.join(RAIZ, "phaser/logic/definicion.js"));
var bal = JSON.parse(fs.readFileSync(path.join(RAIZ, "phaser/data/balance.json"), "utf8"));
var DL = bal.definicion;
var UI = fs.readFileSync(path.join(RAIZ, "phaser/scenes/definicion_ui.js"), "utf8");

/* el comentario del arreglo CITA la fórmula vieja, para que el próximo sepa qué
   estaba roto. Así que la prueba mira código y no prosa: si no, el comentario
   que explica el bug hace fallar el test que lo cuida.

   En este proyecto los comentarios de bloque NO prefijan sus líneas de
   continuación con `*`, así que filtrar por línea no alcanza: hay que cortar el
   bloque entero. Sin regex, para no pelear con los escapes. */
function sinComentarios(s) {
  var out = "", i = 0, n = s.length, j;
  while (i < n) {
    if (s[i] === "/" && s[i + 1] === "*") { j = s.indexOf("*/", i + 2); i = j < 0 ? n : j + 2; continue; }
    if (s[i] === "/" && s[i + 1] === "/") { j = s.indexOf("\n", i); i = j < 0 ? n : j; continue; }
    out += s[i++];
  }
  return out;
}
var UI_COD = sinComentarios(UI);

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }
function dulce(off) { return D.efectoTiming(off, DL.zona_timing, DL).enZona; }

/* ---------- [1] MEJORAR SIEMPRE TE ACERCA AL CERO ---------- */
(function () {
  /* la propiedad que estaba rota, y la que Rodri pidió: monotonía.
     Es una sola línea de test y habría cazado el bug el día que nació. */
  var TIROS = [40, 50, 58, 70, 82, 90, 99];
  [1.0, 0.75, 0.5, 0.25].forEach(function (t) {
    var prev = Infinity;
    TIROS.forEach(function (tiro) {
      var d = Math.abs(D.desvioDeEjecucion(tiro / 100, t, DL));
      assert(d <= prev + 1e-9,
        "con el tanque al " + Math.round(t * 100) + "%, subir de tiro tiene que ACERCAR la zona dulce, y con " +
        tiro + " se alejó (" + prev.toFixed(3) + " → " + d.toFixed(3) + ")");
      prev = d;
    });
  });
  /* y llegar más entero, también */
  [40, 58, 82, 99].forEach(function (tiro) {
    var prev = Infinity;
    [0.25, 0.5, 0.75, 1.0].forEach(function (t) {
      var d = Math.abs(D.desvioDeEjecucion(tiro / 100, t, DL));
      assert(d <= prev + 1e-9,
        "con tiro " + tiro + ", llegar con más tanque tiene que ACERCAR la zona dulce (se alejó al " + Math.round(t * 100) + "%)");
      prev = d;
    });
  });
  console.log("[1] monótona en las dos variables: mejor tiro y más tanque siempre acercan el punto dulce");
})();

/* ---------- [2] EL CASO EXACTO QUE ESTABA AL REVÉS ---------- */
(function () {
  /* con el tanque lleno TODOS comían −22. Que no vuelva a pasar. */
  [58, 70, 82, 90, 99].forEach(function (tiro) {
    var off = D.desvioDeEjecucion(tiro / 100, 1, DL);
    assert(dulce(off), "con el tanque LLENO, tiro " + tiro + " tiene que poder tocar el punto dulce (off " + off.toFixed(3) + ")");
  });
  /* y la fórmula vieja, para dejar constancia de qué se arregló */
  function vieja(tiro, t) { return (0.5 - (tiro / 100 * 0.6 + t * 0.4)) * 0.5; }
  var viejosDulces = [58, 70, 82, 90, 99].filter(function (tiro) { return dulce(vieja(tiro, 1)); });
  assert(viejosDulces.length === 0,
    "la fórmula vieja no le daba el punto dulce a NADIE con el tanque lleno (si ahora sí, revisar este test)");
  console.log("[2] con el tanque lleno los cinco niveles llegan al punto dulce · con la vieja, ninguno");
})();

/* ---------- [3] LLEGAR FUNDIDO TIENE QUE COSTAR ---------- */
(function () {
  /* el otro lado de la moneda: si llegar entero no vale nada, la semana tampoco */
  var entero = D.desvioDeEjecucion(0.58, 1, DL);
  var roto = D.desvioDeEjecucion(0.58, 0.25, DL);
  assert(dulce(entero) && !dulce(roto),
    "tiro 58: entero tiene que ser dulce y fundido no (entero " + entero.toFixed(3) + ", fundido " + roto.toFixed(3) + ")");
  /* pero un crack aguanta el cansancio mejor que un pibe: para eso está la stat */
  var crackRoto = D.desvioDeEjecucion(0.99, 0.25, DL);
  assert(dulce(crackRoto),
    "tiro 99 al 25% del tanque todavía tiene que ejecutar: la stat es lo que te banca el cansancio");
  console.log("[3] llegar fundido cuesta, y la stat es lo que te banca el cansancio");
})();

/* ---------- [4] LAS DOS COLAS SIGUEN VIVAS ---------- */
(function () {
  /* si el desvío fuera siempre negativo, la rama `pasada` de efectoTiming
     quedaría inalcanzable y pasada_fuera_mult / pasada_fuera_max serían dos
     perillas de adorno. O sea: arreglar un signo creando un desconectado. */
  var hayFloja = false, hayPasada = false;
  for (var tiro = 30; tiro <= 99; tiro += 1) {
    for (var t = 0; t <= 1.0001; t += 0.05) {
      var off = D.desvioDeEjecucion(tiro / 100, t, DL);
      if (dulce(off)) continue;
      if (off < 0) hayFloja = true; else hayPasada = true;
    }
  }
  assert(hayFloja, "tiene que existir el caso 'la pegó floja'");
  assert(hayPasada, "tiene que existir el caso 'pasada', o pasada_fuera_mult y pasada_fuera_max quedan de adorno");
  /* y el lado tiene que ser legible: te falta tanque → floja, te falta muñeca → larga */
  assert(D.desvioDeEjecucion(0.9, 0.2, DL) < 0, "con muñeca y sin tanque, la pegás floja");
  assert(D.desvioDeEjecucion(0.4, 0.9, DL) > 0, "con tanque y sin muñeca, se te va larga");
  console.log("[4] las dos colas vivas · sin tanque floja, sin muñeca larga");
})();

/* ---------- [5] LA FÓRMULA NO PUEDE VOLVER A LA ESCENA ---------- */
(function () {
  /* la razón de fondo por la que el bug duró tanto: en definicion_ui.js no se
     puede correr en node, así que ninguna calibración lo podía tocar */
  assert(/desvioDeEjecucion\(/.test(UI), "la escena tiene que usar el helper de la lógica pura");
  assert(!/\(0\.5 - pun\)/.test(UI_COD), "la cuenta invertida no puede volver a la escena");
  assert(!/0\.5 - \(nivelArq/.test(UI_COD), "ni la del arquero");
  /* y el arquero tiene que cansarse de lo suyo, no de lo que corrés vos */
  var i = UI.indexOf("var arqM = st.mios.find");
  var trozo = UI.slice(i, i + 420);
  assert(/arqM \? arqM\.aguante/.test(trozo),
    "el cansancio del arquero tiene que salir del ARQUERO, no de st.mios[st.ctrl]");
  console.log("[5] la fórmula vive en la lógica pura y el arquero se cansa de lo suyo");
})();

/* ---------- [6] LA CALIBRACIÓN ESTÁ ESCRITA Y ES LA QUE SE USA ---------- */
(function () {
  assert(DL.timing_desvio != null, "timing_desvio tiene que ser una perilla de balance, no un número suelto");
  assert(typeof DL._timing_nota === "string" && DL._timing_nota.indexOf("0.30") >= 0,
    "la nota tiene que decir el valor elegido y por qué (un comentario que miente es peor que un número mal puesto)");
  /* la perilla tiene que MOVER algo: si no, es de adorno */
  var suave = D.desvioDeEjecucion(0.58, 0.6, { timing_desvio: 0.1 });
  var duro = D.desvioDeEjecucion(0.58, 0.6, { timing_desvio: 0.5 });
  assert(Math.abs(duro) > Math.abs(suave), "subir timing_desvio tiene que endurecer");
  console.log("[6] timing_desvio = " + DL.timing_desvio + ", documentada y con efecto");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
