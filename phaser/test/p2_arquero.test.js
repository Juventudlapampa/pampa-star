/* ============================================================================
   PAMPA STAR · P2 — EL ARQUERO VIVE EN EL ARCO, NO EN LA PANTALLA

   EL BUG (Rodri): el arquero se dibujaba en (W/2 + 40, H/2), una coordenada de
   PANTALLA que no miraba dónde se había dibujado el arco. Volaba abajo y al
   costado, con más de la mitad del cuerpo por debajo de la línea de gol — sobre
   el pasto — y encima le tapaba el cartel de ¡GOOOL!, que también vive clavado
   en el centro de la pantalla.

   Medido antes del arreglo, en el plano del desenlace:
     arco:     boca de y=120 a y=270 (la línea de gol en 270)
     arquero:  cuerpo de y=174 a y=346  → 76 px HUNDIDO bajo la línea
     cartel:   y=250                    → adentro de la boca y bajo el cuerpo
     y el arco flotaba 86 px por encima del pasto (que arrancaba en 356)

   EL ARREGLO: una sola fuente de verdad, `arcoCine()`. El arco se describe una
   vez y todo se cuelga de ahí: el arquero se para en la LÍNEA (origen en los
   pies, así la Y que se le da es el piso y no el ombligo), la pelota apunta a
   la BOCA, el pasto arranca en la línea —el arco se apoya en la cancha— y los
   carteles bajan a la franja libre de abajo.

   Este test verifica la geometría y las relaciones, que es lo que se puede
   medir. Que se vea lindo se mira en las capturas P2_*.png.

   Corré:  node phaser/test/p2_arquero.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var SRC = fs.readFileSync(path.join(RAIZ, "phaser/scenes/match.js"), "utf8");

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* ---------- la geometría, sacada del propio código ---------- */
/* arcoCine() no depende de nada de Phaser: se puede evaluar tal cual está
   escrita, así que el test mide LA MISMA función que corre el juego. */
var cuerpo = SRC.slice(SRC.indexOf("  arcoCine() {"));
cuerpo = cuerpo.slice(0, cuerpo.indexOf("\n  }") + 4);
var arcoCine = new Function("return function " + cuerpo.trim().replace(/^arcoCine/, "") + "")();
var A = arcoCine();
var W = 960, H = 540;

/* ---------- [1] EL ARCO SE APOYA EN LA CANCHA ---------- */
(function () {
  assert(A.travesano === A.linea - A.h, "el travesaño está a una altura de arco de la línea");
  assert(A.izq === A.cx - A.w / 2 && A.der === A.cx + A.w / 2, "los palos son simétricos respecto del centro");
  assert(A.bocaY > A.travesano && A.bocaY < A.linea, "el centro de la boca cae entre el travesaño y la línea");
  assert(A.linea > 0 && A.linea < H, "la línea de gol está dentro de la pantalla");
  /* el pasto se dibuja DESDE A.linea: el que lo dibuje tiene que usar esa misma
     variable, no un H * 0.66 suelto como antes */
  assert(/fillRect\(0, A\.linea, W, H - A\.linea\)/.test(SRC),
    "el pasto tiene que arrancar en A.linea — si no, el arco vuelve a flotar sobre el césped");
  console.log("[1] arco: palos " + A.izq + "–" + A.der + " · travesaño " + A.travesano +
    " · línea " + A.linea + " (y ahí empieza el pasto)");
})();

/* ---------- [2] EL ARQUERO SE PARA EN LA LÍNEA ---------- */
(function () {
  /* el origen tiene que estar en los PIES: si el origen queda en el centro, la
     mitad del cuerpo se hunde bajo la línea, que es exactamente lo que pasaba */
  assert(/arq\.setOrigin\(0\.5, 1\)/.test(SRC),
    "el arquero del desenlace necesita setOrigin(0.5, 1): la Y que se le da es el PISO, no el ombligo");
  /* los DOS arqueros del cine llevan el origen en los pies. Se cuentan las
     apariciones en vez de exigir un orden de cadena: A3 metio .setAngle() en
     el medio de una de las dos y el assert viejo se rompio por la forma, no
     por el fondo. */
  var conOrigenPie = SRC.split("\n").filter(function (l) {
    return l.indexOf("arq.setOrigin(0.5, 1)") >= 0;
  }).length;
  assert(conOrigenPie >= 2,
    "los dos arqueros del cine (desenlace y planoArquero) llevan el origen en los pies; encontre " + conOrigenPie);
  /* ninguna rama puede volver a poner al arquero con una coordenada de pantalla */
  assert(!/arq\.setPosition\([^)]*H \/ 2/.test(SRC),
    "ninguna rama puede posicionar al arquero con H/2 (coordenada de pantalla)");
  assert(!/add\.sprite\(W \/ 2 \+ 40, H \/ 2/.test(SRC),
    "el (W/2 + 40, H/2) que marcó Rodri no puede volver");
  /* las cuatro ramas lo paran en gy, que es A.linea */
  /* el argumento tiene parentesis adentro, asi que se cuentan las LINEAS que
     terminan parando al arquero en gy, no un match con [^)]* que corta antes */
  var enLinea = SRC.split("\n").filter(function (l) {
    return l.indexOf("arq.setPosition(") >= 0 && l.indexOf(", gy)") >= 0;
  }).length;
  assert(enLinea >= 3,
    "las ramas de gol, atajada y afuera tienen que pararlo en gy (= la línea); encontré " + enLinea);
  console.log("[2] el arquero se para en la línea en las " + enLinea + " ramas que lo mueven");
})();

/* ---------- [3] LA VOLADA NO SE SALE DE LOS PALOS ---------- */
(function () {
  /* el desvío lateral sale del ANCHO DEL ARCO, no de un 90 clavado */
  assert(!/setPosition\(gx \+ \(this\.zona\.gy < 0 \? 90 : -90\)/.test(SRC),
    "el desvío de 90 px clavado no puede volver: tiene que salir de voladaX");
  assert(A.voladaX > 0 && A.voladaX < A.w / 2,
    "voladaX tiene que ser menor que medio arco (dio " + A.voladaX + " contra " + (A.w / 2) + ")");
  /* el cuerpo del arquero mide alto = A.h * 1.15; parado en la línea, su cabeza
     queda por encima del travesaño pero el cuerpo entra en la boca */
  var alto = A.h * 1.15;
  var cabeza = A.linea - alto;
  assert(cabeza < A.travesano, "estirado, la cabeza pasa el travesaño — es una volada, tiene que verse");
  assert(cabeza > 0, "pero no se sale de la pantalla por arriba (dio " + cabeza + ")");
  console.log("[3] volada ±" + A.voladaX + " px sobre un arco de " + A.w + " · cuerpo de " +
    Math.round(cabeza) + " a " + A.linea);
})();

/* ---------- [4] EL CARTEL NO PISA AL ARQUERO ---------- */
(function () {
  var alto = A.h * 1.15, cabeza = A.linea - alto;
  assert(A.carteles > A.linea,
    "el cartel tiene que caer por DEBAJO de la línea de gol (cartel " + A.carteles + ", línea " + A.linea + ")");
  assert(A.carteles > A.linea && A.carteles > cabeza + alto - 1,
    "y por lo tanto por debajo de todo el cuerpo del arquero");
  assert(A.carteles + 42 < H, "el subtítulo tampoco se sale por abajo (dio " + (A.carteles + 42) + ")");
  assert(/this\.cineBig\.setY\(A\.carteles\)/.test(SRC),
    "planoDesenlace tiene que bajar el cartel a A.carteles");
  console.log("[4] cartel en y=" + A.carteles + ", o sea " + (A.carteles - A.linea) +
    " px por debajo de la línea: no toca al arquero");
})();

/* ---------- [5] LOS CUATRO DESENLACES SIGUEN EXISTIENDO ---------- */
(function () {
  var plano = SRC.slice(SRC.indexOf("  planoDesenlace() {"));
  plano = plano.slice(0, plano.indexOf("\n  /* BLOQUE A"));
  assert(/res\.outcome === "gol"/.test(plano), "la rama del gol");
  assert(/res\.outcome === "atajada" \|\| res\.outcome === "corner"/.test(plano), "la rama de atajada y córner");
  assert(/const corner = res\.outcome === "corner"/.test(plano), "y adentro se separan");
  assert(/} else {/.test(plano), "y la rama de afuera");
  /* las cuatro usan la geometría */
  assert((plano.match(/A\./g) || []).length >= 8, "las cuatro ramas se cuelgan de la geometría del arco");
  console.log("[5] los cuatro desenlaces (gol · atajada · córner · afuera) usan la misma geometría");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
