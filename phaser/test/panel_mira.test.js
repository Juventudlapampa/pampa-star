/* ============================================================================
   PAMPA STAR · HACIA DÓNDE MIRA CADA FIGURA DEL PANEL (pedido de Rodri del 17/oct)

   El reporte: "jugando, el jugador que está atrás corre para atrás y para
   adelante, no se entiende o hace lo opuesto a lo que sale".

   LO QUE ESTABA MAL (medido en el navegador, partido contra Espejo de Sal):
     · las siluetas del panel (los rivales que se ven detrás del portador)
       miraban SIEMPRE para el lado contrario al portador: setFlipX(dx < 0).
       El que te perseguía desde atrás se veía corriendo de espaldas, el que
       venía de frente se veía escapando. En 5 s de corrida al arco, 27
       latidos de silueta mirando al revés de hacia donde corría ese rival
       (1er tiempo) y 22 en 4 s de defensa en el 2do. Y cuando un rival
       quedaba de un lado o del otro del portador se daba vuelta sin moverse;
     · la figura grande heredaba la memoria del portador ANTERIOR: después de
       un robo, el rival quedaba mirando a su propio arco durante el arranque
       y se daba vuelta al primer paso.

   LO QUE SE PRUEBA (con updatePanelEscena REAL de match.js):
     [1] 1er tiempo: el que persigue desde atrás y el que viene de frente
         miran hacia donde corren EN PANTALLA;
     [2] 2do tiempo, la misma corrida en la simulación: todo se espeja junto
         (figura grande y siluetas);
     [3] el que todavía no se movió mira al portador;
     [4] lo que se reacomoda detrás de un menú (un hueco de cuadros) no da
         vuelta a nadie;
     [5] el nuevo portador arranca mirando hacia donde ataca su equipo, en
         los dos tiempos;
     [6] la figura grande corriendo queda quieta en pose: sin la zancada
         de V8 (inclinarse 3,5 grados en latidos alternados) ni el rebote.
         También pedido de Rodri del 17/oct: se leía como que iba y venía.
         Con balance.vista.zancada en true vuelve.

   Corré:  node phaser/test/panel_mira.test.js
   ========================================================================== */
"use strict";
var PM = require("./_partido_de_mentira.js");
var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  MAL: " + m); } }

function sprite() {
  return {
    x: 0, y: 0, visible: false, flipX: false, height: 100, displayWidth: 100, rotation: 0, scaleX: 1,
    texture: { key: "" },
    setTexture: function (k) { this.texture.key = k; return this; },
    setOrigin: function () { return this; },
    setScale: function () { return this; },
    setPosition: function (x, y) { this.x = x; if (y != null) this.y = y; return this; },
    setVisible: function (v) { this.visible = v; return this; },
    setFlipX: function (f) { this.flipX = !!f; return this; },
    angle: 0,
    setAngle: function (a) { this.angle = a; return this; },
    setTintFill: function () { return this; },
    setAlpha: function () { return this; },
    clearTint: function () { return this; }
  };
}

/* una escena con el panel armado, el portador en el medio y dos rivales cerca:
   A detrás (índice 3) y B adelante (índice 5); el resto lejos del radio */
function armar(ladoVisual) {
  var E = PM.escena(), s = E.s, st = s.st;
  E.W.Phaser.Math = { Clamp: function (v, a, b) { return Math.max(a, Math.min(b, v)); } };
  s.updatePanelEscena = Object.getPrototypeOf(s).updatePanelEscena;
  s.VI = s.BAL.vista || {};
  s.poseDelPanel = function () { return "pose"; };
  s.identidadDe = function () { return "silueta"; };
  s.panelJug = sprite(); s.panelPelota = sprite();
  s.panelPasto = { tilePositionX: 0, tilePositionY: 0 }; s.panelTribuna = { tilePositionX: 0 };
  s.panelNombre = { text: "", setText: function (t) { this.text = t; return this; } };
  /* L11: la forma del bando, dibujada al lado del nombre */
  s.panelMarca = { clear: function () { return this; }, fillStyle: function () { return this; }, fillCircle: function () { return this; }, fillTriangle: function () { return this; } };
  s.panelSil = [sprite(), sprite(), sprite()];
  s.time.now = 1000;
  st.ladoVisual = ladoVisual;
  st.posesion = "mia"; st.ctrl = 9;
  var j = st.mios[9]; j.x = 500; j.y = 340;
  st.rivales.forEach(function (r) { r.x = 1040; r.y = 340; });
  st.rivales[3].x = 420; st.rivales[5].x = 650;
  return { E: E, s: s, st: st, j: j, A: st.rivales[3], B: st.rivales[5] };
}
/* cuadros de 16 ms; cada 25 cuadros un latido mueve lo que diga mover() */
function correr(T, latidos, mover) {
  for (var n = 0; n < latidos * 25; n++) {
    T.s.time.now += 16;
    if (n % 25 === 24) mover(T);
    T.s.updatePanelEscena(16);
  }
}
function persecucion(T) { T.j.x += 17; T.A.x += 11; T.B.x -= 11; }
var miraDerecha = function (spr) { return !spr.flipX; };

/* ---------- [1] 1er tiempo ---------- */
(function () {
  var T = armar(1);
  correr(T, 4, persecucion);
  assert(T.s.panelSil[0].visible && T.s.panelSil[1].visible, "[1] las dos siluetas a la vista");
  assert(miraDerecha(T.s.panelSil[0]), "[1] el que te persigue desde atrás corre a la derecha: tiene que mirar a la derecha");
  assert(!miraDerecha(T.s.panelSil[1]), "[1] el que viene de frente corre a la izquierda: tiene que mirar a la izquierda");
  assert(miraDerecha(T.s.panelJug), "[1] el portador va al arco rival (derecha en el 1T)");
  console.log("[1] 1er tiempo · perseguidor y el que viene de frente miran hacia donde corren");
})();

/* ---------- [2] 2do tiempo: la misma corrida, el dibujo espejado ---------- */
(function () {
  var T = armar(2);
  correr(T, 4, persecucion);
  assert(!miraDerecha(T.s.panelSil[0]), "[2] en el 2T el perseguidor corre a la izquierda en pantalla");
  assert(miraDerecha(T.s.panelSil[1]), "[2] en el 2T el que viene de frente corre a la derecha en pantalla");
  assert(!miraDerecha(T.s.panelJug), "[2] en el 2T el portador va al arco rival, que está a la izquierda");
  /* la silueta de atrás se dibuja detrás también en el 2T (a la derecha del portador) */
  assert(T.s.panelSil[0].x > T.s.panelSil[1].x, "[2] el de atrás queda del lado de atrás en pantalla");
  console.log("[2] 2do tiempo · figura y siluetas se espejan juntas");
})();

/* ---------- [3] quieto desde siempre: mira al portador ---------- */
(function () {
  [1, 2].forEach(function (lv) {
    var T = armar(lv);
    correr(T, 3, function (T) { T.j.x += 17; });
    var detrasMiraAlPortador = miraDerecha(T.s.panelSil[0]) === (T.s.panelSil[0].x < 430);
    assert(detrasMiraAlPortador, "[3] " + lv + "T: el de atrás, quieto, mira hacia el portador");
    var adelanteMiraAlPortador = miraDerecha(T.s.panelSil[1]) === (T.s.panelSil[1].x < 430);
    assert(adelanteMiraAlPortador, "[3] " + lv + "T: el de adelante, quieto, mira hacia el portador");
  });
  console.log("[3] el que no se movió mira al portador, en los dos tiempos");
})();

/* ---------- [4] lo que pasa detrás de un menú no da vuelta a nadie ---------- */
(function () {
  var T = armar(1);
  correr(T, 3, persecucion);
  var antes = [T.s.panelSil[0].flipX, T.s.panelSil[1].flipX];
  T.s.time.now += 2500;              // el menú: el panel no se actualizó
  T.A.x -= 70; T.B.x += 70;          // la resolución reacomodó a los dos
  T.s.updatePanelEscena(16);
  assert(T.s.panelSil[0].flipX === antes[0] && T.s.panelSil[1].flipX === antes[1],
    "[4] el salto de posición detrás del menú no cuenta como corrida");
  console.log("[4] un reacomodo detrás de un menú no gira las siluetas");
})();

/* ---------- [5] el nuevo portador mira hacia donde ataca su equipo ---------- */
(function () {
  [1, 2].forEach(function (lv) {
    var T = armar(lv);
    correr(T, 3, function (T) { T.j.x += 17; });
    T.st.posesion = "rival"; T.st.portadorRival = 7;
    T.st.rivales[7].x = T.j.x + 10; T.st.rivales[7].y = T.j.y;
    T.s.time.now += 16; T.s.updatePanelEscena(16);
    /* el rival ataca a -x en la simulación: izquierda en el 1T, derecha en el 2T */
    assert(miraDerecha(T.s.panelJug) === (lv === 2), "[5] " + lv + "T: el rival que roba mira hacia tu arco desde el primer cuadro");
    T.st.posesion = "mia"; T.st.ctrl = 6;
    T.s.time.now += 16; T.s.updatePanelEscena(16);
    assert(miraDerecha(T.s.panelJug) === (lv === 1), "[5] " + lv + "T: el tuyo que la recupera mira hacia el arco rival");
  });
  console.log("[5] cambio de portador · arranca mirando hacia donde ataca su equipo, los dos tiempos");
})();

/* ---------- [6] corriendo, la pose queda quieta ---------- */
(function () {
  function medir(zancada) {
    var T = armar(1);
    T.s.VI = Object.assign({}, T.s.VI, { zancada: zancada });
    T.s._pulsoMovioHasta = Infinity;
    var ang = {}, ys = {}, xs = {};
    for (var n = 0; n < 120; n++) {
      T.s.time.now += 16; T.s.updatePanelEscena(16);
      ang[T.s.panelJug.angle] = 1; ys[Math.round(T.s.panelJug.y)] = 1; xs[Math.round(T.s.panelJug.x)] = 1;
    }
    return { ang: Object.keys(ang), ys: Object.keys(ys), xs: Object.keys(xs) };
  }
  assert(require("../data/balance.json").vista.zancada === false, "[6] la zancada viene apagada en balance");
  var q = medir(false);
  assert(q.ang.length === 1 && q.ang[0] === "0", "[6] apagada, la figura no se inclina (ángulos: " + q.ang + ")");
  assert(q.ys.length === 1 && q.xs.length === 1, "[6] apagada, la figura no rebota ni se hamaca");
  var z = medir(true);
  assert(z.ang.indexOf("3.5") >= 0 && z.ang.indexOf("-3.5") >= 0, "[6] con la perilla en true vuelve la zancada de V8");
  console.log("[6] corriendo, la pose queda quieta; la perilla la vuelve");
})();

console.log(mal === 0 ? "\nTODOS OK: " + ok + " asserts, 0 fallaron." : "\n" + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
