/* ============================================================================
   PAMPA STAR · EN EL TELÉFONO NO SE HABLA DE TECLAS (tanda 1.0, textos-tactiles)

   LO QUE ESTABA MAL, medido: la primera semana de toda carrera decía, en el
   celular, "¿QUÉ HACÉS ESTA SEMANA? · elegiste 0 de 3 (teclas 1 a 0)" y
   "🗓 Llegás bien de piernas… · con 1000 de aguante y 30 de envión": teclas
   que no hay y números que nada presentó. El PASE se explicaba con "◄► +
   ENTER, ▲ = al vacío, ESC = volver", el tutorial con "(o con las flechas /
   WASD)" y "(en teclado: ESPACIO)", la corrida del jugadón con "con las
   FLECHAS", y sus botones, la entrevista y el evento de la semana llevaban
   el número de la tecla adelante ("1·", "1 · "). Una opción de la semana
   prometía "+1 a una stat al azar".

   Lo que fija este test, con device.input.touch = true (el teléfono):
     [1] el Master: la semana de la fecha 1, su evento y la entrevista
     [2] el partido: lo que escribe su create() (la guía y el tutorial), el
         PASE y la corrida del jugadón con sus botones
   y que con teclado (sin pantalla táctil) las ayudas de teclado siguen: la
   guarda es del aparato, no un borrado.

   Corré:  node phaser/test/textos_tactiles.test.js
   ========================================================================== */
"use strict";
var M = require("./_escena_de_mentira.js");
var C = require("./_create_de_mentira.js");

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* lo que en un teléfono no tiene que leerse */
var TECLAS = /\bteclas?\b|\bteclado\b|\bENTER\b|\bESC\b|WASD|flechas|ESPACIO|◄►|◀▶/i;
var NUMERO_DE_TECLA = /^\d+\s?·/;
function malos(textos) {
  return textos.filter(function (t) { return TECLAS.test(t) || NUMERO_DE_TECLA.test(t); });
}

/* ---------- [1] EL MASTER EN EL TELÉFONO ---------- */
function semanaDeLaFecha1(tactil) {
  var A = M.armar({ tactil: tactil });
  A.localStorage.setItem("pampa_master_v1", JSON.stringify(A.carreraNueva()));
  var s = A.nueva(); s.create();
  s.tocar(310, 460);                                   // ▶ JUGAR LA FECHA
  s.leerHastaElFinal();                                // 20/oct, Rodri: las opciones salen al terminar el texto
  var evento = s._semEvento && !s._semEventoResuelto ? s.textos().slice() : [];
  if (evento.length) s.teclas("ENTER");
  return { s: s, A: A, evento: evento, semana: s.textos().slice() };
}
(function () {
  var T = semanaDeLaFecha1(true);
  assert(T.semana.some(function (t) { return /LA SEMANA · fecha 1/.test(t); }), "control: es la semana de la fecha 1 (" + T.semana.slice(0, 2).join(" | ") + ")");
  assert(T.evento.length > 0, "control: la fecha 1 trae su evento (" + T.evento.join(" | ") + ")");
  var m1 = malos(T.semana.concat(T.evento));
  assert(m1.length === 0, "SÍNTOMA: en el teléfono la semana habla de teclas: " + m1.join(" | "));
  var crudos = T.semana.filter(function (t) { return /\b1000\b|de envión|\bstat\b/.test(t); });
  assert(crudos.length === 0, "SÍNTOMA: la semana muestra números crudos o 'stat': " + crudos.join(" | "));
  assert(T.semana.some(function (t) { return /las piernas al \d+%/.test(t); }), "cómo llegás se dice con las piernas en porcentaje (" + T.semana.filter(function (t) { return /🗓/.test(t); }).join("") + ")");
  /* "a una cualidad al azar" y no "a una de tus cualidades, al azar": con la
     segunda la tarjeta del picadito pasa a cuatro renglones y se sale (medido) */
  assert(T.semana.some(function (t) { return /a una cualidad al azar/.test(t); }), "el picadito suma a una cualidad, no a una stat");
  /* la entrevista */
  var A = M.armar({ tactil: true });
  var e = A.nueva(); e.vistaOrigen("primera_b");
  e.leerHastaElFinal();
  var te = e.textos();
  assert(te.some(function (t) { return /TU HISTORIA/.test(t); }), "control: es la entrevista");
  assert(malos(te).length === 0, "SÍNTOMA: la entrevista numera las respuestas con la tecla: " + malos(te).join(" | "));
  /* con teclado, siguen las ayudas de teclado */
  var K = semanaDeLaFecha1(false);
  assert(K.semana.some(function (t) { return /\(teclas 1 a 0\)/.test(t); }), "con teclado la semana sigue diciendo las teclas");
  assert(K.evento.some(function (t) { return /^1 · /.test(t); }), "y el evento, el número de la opción");
  var Ak = M.armar({ tactil: false }), ek = Ak.nueva(); ek.vistaOrigen("primera_b"); ek.leerHastaElFinal();
  assert(ek.textos().some(function (t) { return /^1 · /.test(t); }), "y la entrevista también");
  console.log("[1] el Master en el teléfono: semana, evento y entrevista sin teclas · " + T.semana.filter(function (t) { return /🗓/.test(t); })[0]);
})();

/* ---------- [2] EL PARTIDO EN EL TELÉFONO ---------- */
(function () {
  var mp = { rival: "Espejo de Sal", division: "primera_b", nivel: 3 };
  var P = C.jugar(mp, { tactil: true });
  assert(P.estados.indexOf("TUTORIAL") >= 0, "control: el primer partido abre el tutorial");
  var arranque = P.textos.slice();
  assert(arranque.some(function (t) { return /^1\/3 · Movés con el DEDO/.test(t); }),
    "control: se escribió el tutorial (" + arranque.filter(function (t) { return /DEDO/.test(t); }).join(" | ") + ")");
  /* la guía pegada al portador sale solo sin pantalla partida */
  var sinSplit = C.jugar(mp, { tactil: true, flags: { pantalla_partida: false } });
  assert(sinSplit.textos.indexOf("tocá la cancha para correr") >= 0 && malos(sinSplit.textos).length === 0,
    "sin pantalla partida, la guía dice \"tocá la cancha para correr\", sin flechas (" + sinSplit.textos.filter(function (t) { return /cancha/.test(t); }).join(" | ") + ")");
  assert(malos(arranque).length === 0, "SÍNTOMA: el arranque del partido habla de teclas en el teléfono: " + malos(arranque).join(" | "));
  /* el PASE */
  var s = P.s, n0 = P.textos.length;
  s.limpiarMenu(); s.estado = "LIBRE";
  s.iniciarPaseDirigido(null, true);
  var pase = P.textos.slice(n0);
  assert(pase.some(function (t) { return /tocá en el mapa a quién se la pasás/.test(t); }), "el PASE en el teléfono: \"tocá en el mapa a quién se la pasás\" (" + pase.join(" | ") + ")");
  assert(malos(pase).length === 0, "SÍNTOMA: el PASE se explica con teclas: " + malos(pase).join(" | "));
  /* la corrida del jugadón y sus botones */
  var n1 = P.textos.length, st = s.st;
  var ri = st.rivales.findIndex(function (r) { return r.pos !== "ARQ"; });
  s.entrarJugadonGambeta(ri, { marcadores: 2 });
  s.jugadonBoton(480, 480, 200, "◀ SALIR POR IZQUIERDA", 0xf6efdc, function () { });
  var jug = P.textos.slice(n1);
  /* pedido de Rodri del 17/oct: la corrida de esquivar se cambió por los
     cruces, y la ayuda dice "tocá por dónde lo pasás" en vez de "esquivá con
     el DEDO". Lo que se fija es lo mismo: en el teléfono, ni una tecla. */
  assert(jug.some(function (t) { return /tocá por dónde lo pasás/.test(t); }) && jug.indexOf("◀ SALIR POR IZQUIERDA") >= 0,
    "control: la corrida escribió su ayuda y su botón (" + jug.join(" | ") + ")");
  assert(malos(jug).length === 0, "SÍNTOMA: la corrida del jugadón habla de teclas: " + malos(jug).join(" | "));
  /* con teclado: las ayudas siguen */
  var K = C.jugar(mp, { tactil: false });
  assert(K.textos.some(function (t) { return /WASD/.test(t); }) && K.textos.some(function (t) { return /ESPACIO/.test(t); }),
    "con teclado el tutorial sigue diciendo las flechas y el ESPACIO");
  /* 20/oct, Rodri: en la PC el primer paso decía "con el DEDO" */
  assert(K.textos.some(function (t) { return /^1\/3 · Movés con el MOUSE/.test(t); }) && !K.textos.some(function (t) { return /DEDO/.test(t); }),
    "en la PC el primer paso habla del mouse, no del dedo");
  var k0 = K.textos.length;
  K.s.limpiarMenu(); K.s.estado = "LIBRE"; K.s.iniciarPaseDirigido(null, true);
  assert(K.textos.slice(k0).some(function (t) { return /ENTER/.test(t); }), "y el PASE, las teclas");
  console.log("[2] el partido en el teléfono: guía, tutorial, PASE y jugadón sin teclas · con teclado siguen");
})();

if (mal === 0) console.log("\n✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("\n✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
