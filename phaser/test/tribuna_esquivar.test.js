/* ============================================================================
   PAMPA STAR · los globos de Nelda y el Tuli no tapan figuras (esquivar)
   Corré:  node phaser/test/tribuna_esquivar.test.js

   tribuna_ui.js corre la franja al lugar libre más cercano a su sitio cuando
   la escena anota figuras en sc._figurasCine, y si no hay lugar se calla. Acá
   se arma una escena falsa que anota dónde se dibuja cada globo y se le ponen
   figuras falsas: el globo queda fuera de todas las cajas, o no se ve.
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

let ok = 0, mal = 0;
function assert(cond, msg) { if (cond) ok++; else { mal++; console.error("  ✗ " + msg); } }

const RAIZ = path.join(__dirname, "..", "..");
const TRIBUNA = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/tribuna.json"), "utf8"));
global.window = { PF: { texto: "texto" } };
require("../scenes/tribuna_ui.js");
const T = window.PampaTribunaUI;
const W = 960, H = 540;

function objeto() {
  return {
    x: 0, y: 0, alpha: 1,
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setAlpha(a) { this.alpha = a; return this; },
    setVisible() { return this; }, setText() { return this; },
    setTexture() { return this; }, setScale() { return this; }
  };
}
function escena() {
  return {
    game: { registry: { get: k => (k === "tribuna" ? TRIBUNA : null) } },
    add: {
      container() { const c = objeto(); c.list = []; c.add = a => { c.list.push(...a); return c; }; return c; },
      graphics() {
        const g = objeto(); g.globos = [];
        ["fillStyle", "lineStyle", "strokeRoundedRect", "fillTriangle", "strokeCircle", "fillCircle"].forEach(m => { g[m] = () => g; });
        g.clear = () => { g.globos = []; return g; };
        g.fillRoundedRect = (x, y, w, h) => { g.globos.push({ x, y, w, h }); return g; };
        return g;
      },
      image: objeto, text: objeto
    },
    textures: { exists: () => false },
    time: { delayedCall: () => ({ remove() { } }) },
    tweens: { add() { }, killTweensOf() { } }
  };
}
/* la caja en pantalla del fondo de cada globo: lo dibujado más el corrimiento de la franja */
function globosEnPantalla(sc) {
  const t = sc._tribuna;
  return t.globos.map(b => {
    const r = b.g.globos[0];
    return { left: r.x + t.cont.x, top: r.y + t.cont.y, right: r.x + r.w + t.cont.x, bottom: r.y + r.h + t.cont.y };
  });
}
function cajaDe(f) {
  const izq = f.x - f.displayWidth * f.originX, arriba = f.y - f.displayHeight * f.originY;
  return { left: izq, top: arriba, right: izq + f.displayWidth, bottom: arriba + f.displayHeight };
}
function seCruzan(a, b) { return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top; }
const EVENTO = TRIBUNA.dialogos[0].evento;

/* ---------- [1] sin figuras: la franja en su sitio ---------- */
(function () {
  const sc = escena();
  T.montar(sc);
  assert(T.comentar(sc, EVENTO) === true, "sin figuras la tribuna comenta");
  assert(sc._tribuna.cont.x === 0 && sc._tribuna.cont.y === 0, "sin figuras la franja no se corre (vino " + sc._tribuna.cont.x + "," + sc._tribuna.cont.y + ")");
  const g = globosEnPantalla(sc);
  assert(g.length === 2 && g.every(b => b.right > b.left && b.bottom > b.top), "control: se midieron los dos globos dibujados");
  console.log("[1] sin figuras: los dos globos en su sitio (" + g.map(b => b.left + "," + b.top).join(" y ") + ")");
})();

/* ---------- [2] el arquero de "te rematan" (x 699-981, y 176-320) ---------- */
(function () {
  const sc = escena();
  T.montar(sc);
  const arquero = { x: 840, y: 320, displayWidth: 282, displayHeight: 144, originX: 0.5, originY: 1 };
  sc._figurasCine = [arquero];
  assert(T.comentar(sc, EVENTO) === true, "con lugar libre la tribuna comenta");
  const g = globosEnPantalla(sc);
  assert(g.every(b => !seCruzan(b, cajaDe(arquero))), "SÍNTOMA: un globo tapa al arquero (" + JSON.stringify(g) + ")");
  assert(g.every(b => b.left >= 0 && b.right <= W && b.top >= 0 && b.bottom <= H), "los globos quedan dentro del lienzo (" + JSON.stringify(g) + ")");
  assert(sc._tribuna.cont.alpha === 1, "y se ven");
  console.log("[2] el arquero: la franja se corrió " + sc._tribuna.cont.x + "," + sc._tribuna.cont.y + " y no lo toca");
})();

/* ---------- [3] figuras al azar: fuera de todas las cajas, o callados ---------- */
(function () {
  let semilla = 17;
  function azar() { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; }
  let corridos = 0, callados = 0;
  for (let n = 0; n < 300; n++) {
    const sc = escena();
    T.montar(sc);
    const figuras = [];
    const cuantas = 1 + Math.floor(azar() * 5);
    for (let k = 0; k < cuantas; k++) {
      figuras.push({ x: azar() * W, y: azar() * H, displayWidth: 40 + azar() * 420, displayHeight: 40 + azar() * 360, originX: 0.5, originY: azar() < 0.5 ? 0.5 : 1 });
    }
    sc._figurasCine = figuras;
    const habla = T.comentar(sc, EVENTO);
    if (!habla) {
      callados++;
      assert(sc._tribuna.cont.alpha === 0, "caso " + n + ": sin lugar libre se callan (alpha " + sc._tribuna.cont.alpha + ")");
      continue;
    }
    corridos++;
    const g = globosEnPantalla(sc);
    const pisa = figuras.map(cajaDe).find(c => g.some(b => seCruzan(b, c)));
    assert(!pisa, "caso " + n + ": SÍNTOMA: un globo queda encima de una figura (" + JSON.stringify(pisa) + ")");
    assert(g.every(b => b.left >= 0 && b.right <= W && b.top >= 0 && b.bottom <= H), "caso " + n + ": los globos quedan dentro del lienzo");
  }
  assert(corridos > 0 && callados > 0, "control: hubo casos con lugar y casos sin lugar (" + corridos + " y " + callados + ")");
  console.log("[3] 300 escenas al azar: " + corridos + " con los globos fuera de las figuras, " + callados + " callados");
})();

/* ---------- [4] una figura que tapa todo: se callan ---------- */
(function () {
  const sc = escena();
  T.montar(sc);
  sc._figurasCine = [{ x: W / 2, y: H / 2, displayWidth: W, displayHeight: H, originX: 0.5, originY: 0.5 }];
  assert(T.comentar(sc, EVENTO) === false && sc._tribuna.cont.alpha === 0, "con la pantalla tapada no comentan");
  console.log("[4] sin lugar libre: callados");
})();

/* ---------- [5] revisión del 22/oct: durante el cine no hay globos ---------- */
(function () {
  const sc = escena();
  T.montar(sc);
  assert(T.comentar(sc, EVENTO) === true && sc._tribuna.cont.alpha === 1, "control: en el partido comentan");
  assert(T.callar(sc) && sc._tribuna.cont.alpha === 0, "al entrar al cine se callan (match.js, entrarCine)");
  sc.estado = "CINE";
  assert(T.comentar(sc, EVENTO) === false && sc._tribuna.cont.alpha === 0, "SÍNTOMA: lo que comentan durante el cine sale encima del cine");
  sc.estado = "LIBRE";
  assert(T.soltar(sc) === true && sc._tribuna.cont.alpha === 1, "al volver el partido sale lo que comentaron (match.js, salirCine)");
  assert(T.soltar(sc) === false, "y una sola vez");
  console.log("[5] durante el cine se callan y al volver comentan");
})();

/* ---------- [6] segunda revisión del 22/oct: EL TOQUE tampoco ----------
   EL TOQUE entra por jugadonAbrir con estado TOQUE, no por entrarCine: tras
   un bloqueo, Nelda y el Tuli quedaban encima del arco */
(function () {
  const sc = escena();
  T.montar(sc);
  assert(T.comentar(sc, EVENTO) === true && sc._tribuna.cont.alpha === 1, "control: en el partido comentan");
  const TOQUE_UI = require("fs").readFileSync(require("path").join(__dirname, "..", "scenes", "toque_ui.js"), "utf8");
  assert(/this\.estado = "TOQUE";[\s\S]{0,400}?PampaTribunaUI\.callar\(this\)/.test(TOQUE_UI), "SÍNTOMA: al entrar a EL TOQUE los globos siguen a la vista (toque_ui.js, entrarToque)");
  T.callar(sc);
  sc.estado = "TOQUE";
  assert(T.comentar(sc, EVENTO) === false && sc._tribuna.cont.alpha === 0, "SÍNTOMA: lo que comentan durante EL TOQUE sale encima del arco");
  sc.estado = "LIBRE";
  assert(T.soltar(sc) === true && sc._tribuna.cont.alpha === 1, "al volver el partido sale lo que comentaron en EL TOQUE");
  console.log("[6] durante EL TOQUE se callan y al volver comentan");
})();

/* ---------- [7] pedido de Rodri del 22/oct: la misma frase tres veces en un partido ----------
   Un intercambio no vuelve hasta que salieron todos los otros de su evento:
   en cualquier tramo de n seguidos (n = los de ese evento) no hay dos iguales. */
(function () {
  const sc = escena();
  sc.estado = "LIBRE";
  T.montar(sc);
  let malos = [];
  TRIBUNA.dialogos.forEach(function (d) {
    const n = d.intercambios.length, vistos = [];
    for (let k = 0; k < n * 4; k++) { T.comentar(sc, d.evento); vistos.push(sc._tribuna.ultimo[d.evento]); }
    for (let k = 0; k + n <= vistos.length; k++) {
      if (new Set(vistos.slice(k, k + n)).size !== n) malos.push(d.evento + " desde " + k + ": " + vistos.slice(k, k + n).join(","));
    }
    for (let k = 1; k < vistos.length; k++) if (n > 1 && vistos[k] === vistos[k - 1]) malos.push(d.evento + " seguido en " + k);
  });
  assert(malos.length === 0, "SÍNTOMA: una frase de la tribuna vuelve antes de usar las otras de su grupo (" + malos.slice(0, 4).join(" | ") + ")");
  console.log("[7] la tribuna no repite una frase hasta haber usado las otras de su evento (" + TRIBUNA.dialogos.length + " eventos)");
})();

/* ---------- [8] revisión del 23/oct: las viñetas tampoco ----------
   El cut-in del SÚPER TIRO y "te rematan" van en estado ESCENA, no en CINE:
   los globos seguían a la vista encima del cut-in y del rematador. Toda
   entrada a ESCENA los calla, y lo que comenten sale al cerrar la viñeta. */
(function () {
  const sc = escena();
  T.montar(sc);
  assert(T.comentar(sc, EVENTO) === true && sc._tribuna.cont.alpha === 1, "control: en el partido comentan");
  const fuentes = ["match.js", "escenas_v9.js", "toma_remate.js"].map(f => [f, fs.readFileSync(path.join(__dirname, "..", "scenes", f), "utf8")]);
  let entradas = 0;
  fuentes.forEach(([f, src]) => {
    const re = /this\.estado = "ESCENA";/g;
    let m;
    while ((m = re.exec(src))) {
      entradas++;
      const despues = src.slice(m.index, m.index + 500);
      assert(/PampaTribunaUI\.callar\(this\)/.test(despues), "SÍNTOMA: una entrada a ESCENA deja los globos a la vista (" + f + ", carácter " + m.index + ")");
    }
  });
  assert(entradas >= 4, "control: se encontraron las entradas a ESCENA (_abrirEscena, cutInEspecial, escenaCine, la toma del remate): " + entradas);
  const MATCH = fuentes[0][1];
  const cerrar = MATCH.slice(MATCH.indexOf("  cerrarEscena(alFinal) {"), MATCH.indexOf("  cerrarEscena(alFinal) {") + 1400);
  assert(/this\.estado = "LIBRE";\s*\r?\n\s*if \(window\.PampaTribunaUI\) window\.PampaTribunaUI\.soltar\(this\);/.test(cerrar), "al cerrar la viñeta sale lo que comentaron (match.js, cerrarEscena)");
  T.callar(sc);
  sc.estado = "ESCENA";
  assert(T.comentar(sc, EVENTO) === false && sc._tribuna.cont.alpha === 0, "SÍNTOMA: lo que comentan durante una viñeta sale encima de la viñeta");
  sc.estado = "LIBRE";
  assert(T.soltar(sc) === true && sc._tribuna.cont.alpha === 1, "al volver el partido sale lo que comentaron en la viñeta");
  console.log("[8] en las " + entradas + " entradas a ESCENA se callan y al cerrar la viñeta comentan");
})();

if (mal === 0) console.log("\n✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("\n✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
