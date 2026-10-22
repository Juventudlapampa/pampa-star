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

if (mal === 0) console.log("\n✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("\n✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
