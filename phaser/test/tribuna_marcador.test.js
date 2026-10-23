/* ============================================================================
   PAMPA STAR · lo que dicen Nelda y el Tuli no contradice el marcador
   Corré:  node phaser/test/tribuna_marcador.test.js

   Revisión del 23/oct: después del 1-1 del rival Nelda decía "Ese gol lo
   hicimos nosotros, no ellos."; ganando 2-1 salía "no nos hicieron ni una
   clara"; cuando el arquero de ellos te sacaba el remate, el Tuli decía "Y la
   sacó el nuestro". Cada intercambio de data/tribuna.json puede traer "si" y
   tribuna_ui.js lo mira contra el marcador del partido (sc.st) y contra la
   jugada que lo disparó. Acá se arma una escena falsa con marcador y se
   escucha lo que dicen.
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

let ok = 0, mal = 0;
function assert(cond, msg) { if (cond) ok++; else { mal++; console.error("  ✗ " + msg); } }

const RAIZ = path.join(__dirname, "..", "..");
const TRIBUNA = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/tribuna.json"), "utf8"));
const MATCH = fs.readFileSync(path.join(RAIZ, "phaser/scenes/match.js"), "utf8");
global.window = { PF: { texto: "texto" } };
require("../scenes/tribuna_ui.js");
const T = window.PampaTribunaUI;

function objeto() {
  return {
    x: 0, y: 0, alpha: 1, texto: "",
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setAlpha(a) { this.alpha = a; return this; },
    setVisible() { return this; }, setText(s) { this.texto = s; return this; },
    setTexture() { return this; }, setScale() { return this; }
  };
}
function escena(golesMio, golesRival, minuto) {
  return {
    estado: "LIBRE",
    st: { golesMio: golesMio, golesRival: golesRival, minuto: minuto },
    game: { registry: { get: k => (k === "tribuna" ? TRIBUNA : null) } },
    add: {
      container() { const c = objeto(); c.list = []; c.add = a => { c.list.push(...a); return c; }; return c; },
      graphics() {
        const g = objeto();
        ["fillStyle", "lineStyle", "strokeRoundedRect", "fillTriangle", "strokeCircle", "fillCircle", "fillRoundedRect", "clear"].forEach(m => { g[m] = () => g; });
        return g;
      },
      image: objeto, text: objeto
    },
    textures: { exists: () => false },
    time: { delayedCall: () => ({ remove() { } }) },
    tweens: { add() { }, killTweensOf() { } }
  };
}
/* lo que dijeron los dos en el último comentario */
function dicho(sc) { return sc._tribuna.globos.map(b => b.dice.texto).join(" / "); }
/* todo lo que dicen en 40 comentarios seguidos de un evento */
function escuchar(gm, gr, min, evento, jugada) {
  const sc = escena(gm, gr, min);
  T.montar(sc);
  const oido = new Set();
  for (let k = 0; k < 40; k++) if (T.comentar(sc, evento, jugada)) oido.add(dicho(sc));
  return oido;
}

/* el mapa del relator a la tribuna, leído de match.js */
const bloqueMapa = MATCH.match(/const MAPA = \{([\s\S]*?)\n\s*\};/);
assert(!!bloqueMapa, "control: se encontró el MAPA de relatar() en match.js");
const MAPA_TXT = bloqueMapa ? bloqueMapa[1].replace(/\/\*[\s\S]*?\*\//g, "") : "";
const SALE = new Set((MAPA_TXT.match(/"([a-z_]+)"/g) || []).map(s => s.slice(1, -1)));
/* y los que match.js le pasa directo (el cansancio) */
(MATCH.match(/PampaTribunaUI\.comentar\(this, "([a-z_]+)"/g) || []).forEach(s => SALE.add(s.match(/"([a-z_]+)"/)[1]));
const JUGADAS_DE = {};
(MAPA_TXT.match(/([a-z_]+): "([a-z_]+)"/g) || []).forEach(par => {
  const m = par.match(/([a-z_]+): "([a-z_]+)"/);
  (JUGADAS_DE[m[2]] = JUGADAS_DE[m[2]] || []).push(m[1]);
});

/* ---------- [1] cada evento de la data lo dispara el partido, y al revés ---------- */
(function () {
  const eventos = TRIBUNA.dialogos.map(d => d.evento);
  const sinDisparo = eventos.filter(e => !SALE.has(e));
  assert(sinDisparo.length === 0, "SÍNTOMA: hay eventos de la tribuna que el partido no dispara nunca (" + sinDisparo.join(", ") + ")");
  const sinData = Array.from(SALE).filter(e => eventos.indexOf(e) < 0);
  assert(sinData.length === 0, "SÍNTOMA: match.js manda a la tribuna eventos que no tienen frases (" + sinData.join(", ") + ")");
  ["atajada_rival", "resultado_empate"].forEach(e => assert(eventos.indexOf(e) >= 0 && SALE.has(e), "el evento " + e + " existe y lo dispara el partido"));
  console.log("[1] los " + eventos.length + " eventos de la tribuna los dispara el partido");
})();

/* ---------- [2] con cualquier marcador hay al menos dos intercambios que valen ---------- */
(function () {
  const flacos = [];
  TRIBUNA.dialogos.forEach(d => {
    const jugadas = JUGADAS_DE[d.evento] || [undefined];
    for (let gm = 0; gm <= 4; gm++) for (let gr = 0; gr <= 4; gr++) [10, 50, 88].forEach(min => jugadas.forEach(j => {
      const n = escuchar(gm, gr, min, d.evento, j).size;
      if (n < 2) flacos.push(d.evento + " " + gm + "-" + gr + " min " + min + " " + j + ": " + n);
    }));
  });
  assert(flacos.length === 0, "SÍNTOMA: con algún marcador un evento se queda con menos de dos frases (" + flacos.slice(0, 5).join(" | ") + ")");
  console.log("[2] cada evento tiene dos o más intercambios que valen en todos los marcadores de 0-0 a 4-4");
})();

/* ---------- [3] los casos de la revisión del 23/oct ---------- */
(function () {
  const contradice = (oido, re) => Array.from(oido).filter(s => re.test(s));
  /* el rival empata 1-1 */
  const empatan = escuchar(1, 1, 60, "gol_rival", "gol_rival");
  assert(contradice(empatan, /lo hicimos nosotros/).length === 0, "SÍNTOMA: después del 1-1 del rival Nelda dice que el gol lo hicimos nosotros");
  assert(contradice(empatan, /Uno solo no pierde|Seguimos arriba/).length === 0, "SÍNTOMA: con el 1-1 del rival hablan como si fueran perdiendo o ganando (" + contradice(empatan, /Uno solo|Seguimos/).join(" | ") + ")");
  assert(contradice(empatan, /empataron/i).length === 1, "con el 1-1 del rival sale el que dice que nos empataron");
  /* ganamos 2-1 */
  const gana21 = escuchar(2, 1, 92, "resultado_gana", "final");
  assert(contradice(gana21, /no nos hicieron/).length === 0, "SÍNTOMA: ganando 2-1 dicen que no nos hicieron ni una clara");
  assert(contradice(escuchar(2, 0, 92, "resultado_gana", "final"), /no nos hicieron/).length === 1, "control: ganando 2-0 sí lo dicen");
  /* nuestro gol del empate y el del descuento */
  const empatamos = escuchar(1, 1, 60, "gol", "gol");
  assert(contradice(empatamos, /aguantar|Descontamos/).length === 0, "SÍNTOMA: con nuestro gol del 1-1 hablan de aguantar o de descontar");
  assert(contradice(escuchar(1, 2, 60, "gol", "gol"), /Descontamos/).length === 1, "con nuestro 1-2 sale el descuento");
  /* el arquero de ellos ataja tu remate */
  const teAtajan = new Set();
  [[0, 0], [1, 0], [0, 1]].forEach(m => escuchar(m[0], m[1], 30, "atajada_rival", "atajada").forEach(s => teAtajan.add(s)));
  assert(contradice(teAtajan, /el nuestro|gracias|Menos mal/).length === 0, "SÍNTOMA: cuando te atajan el remate festejan como si atajara el nuestro");
  assert(/atajada: "atajada_rival"/.test(MAPA_TXT) && /arquero_mio: "atajada"/.test(MAPA_TXT), "en match.js la atajada del arquero de ellos y la del nuestro van a eventos distintos");
  /* el remate que se va afuera no es un duelo perdido, y al revés */
  assert(contradice(escuchar(0, 0, 30, "error", "afuera"), /pasaron por al lado/).length === 0, "SÍNTOMA: con un remate afuera dicen que le pasaron por al lado");
  assert(contradice(escuchar(0, 0, 30, "error", "gambeta_lose"), /zurda|afuera/).length === 0, "SÍNTOMA: con un duelo perdido hablan de un remate");
  /* el pitazo final con empate no habla de un partido que sigue */
  const final11 = escuchar(1, 1, 92, "resultado_empate", "final");
  assert(contradice(final11, /Si sigue así|Cero a cero/).length === 0, "SÍNTOMA: al final del 1-1 hablan como si siguiera o de un cero a cero");
  assert(/"resultado_empate"/.test(MAPA_TXT), "el final empatado va a resultado_empate");
  /* un gol del rival en el minuto 88 no es "queda mucho" */
  assert(contradice(escuchar(0, 1, 88, "gol_rival", "gol_rival"), /Queda mucho/).length === 0, "SÍNTOMA: con un gol del rival a los 88 dicen que queda mucho");
  console.log("[3] el 1-1 del rival, el 2-1, el gol del empate, la atajada de ellos, el remate afuera y el final empatado dicen lo que corresponde");
})();

/* ---------- [4] lo comentado durante el cine sale después con su jugada ---------- */
(function () {
  const sc = escena(0, 0, 30);
  T.montar(sc);
  sc.estado = "CINE";
  assert(T.comentar(sc, "error", "afuera") === false, "control: en el cine no comentan");
  sc.estado = "LIBRE";
  const oido = [];
  assert(T.soltar(sc) === true, "al volver sale lo que quedó pendiente");
  oido.push(dicho(sc));
  assert(!/pasaron por al lado/.test(oido[0]), "SÍNTOMA: lo pendiente del cine pierde la jugada que lo disparó (" + oido[0] + ")");
  console.log("[4] lo pendiente del cine conserva su jugada");
})();

/* ---------- [5] ninguna frase nueva pasa de 60 caracteres ---------- */
(function () {
  const largas = [];
  TRIBUNA.dialogos.forEach(d => d.intercambios.forEach(x => [x.a, x.b].forEach(s => { if (s.length > 60) largas.push(s); })));
  assert(largas.length === 0, "SÍNTOMA: frases de más de 60 caracteres se salen del globo (" + largas.join(" | ") + ")");
  console.log("[5] todas las frases entran en el globo");
})();

/* ---------- [6] revisión final del 23/oct: el pase tuyo cortado no se festeja ---------- */
(function () {
  assert((JUGADAS_DE.quite || []).indexOf("corte") < 0, "SÍNTOMA: el pase tuyo que cortó el rival va al evento quite (lo festejan como recuperación)");
  assert((JUGADAS_DE.error || []).indexOf("corte") >= 0 && (JUGADAS_DE.error || []).indexOf("defensa_lose") >= 0, "el pase cortado y el duelo de defensa perdido van al evento error");
  ["quite_win", "corte_win", "bloqueo_win"].forEach(j => assert((JUGADAS_DE.quite || []).indexOf(j) >= 0, "la recuperación tuya (" + j + ") va al evento quite"));
  const tuGambeta = escuchar(0, 0, 30, "error", "gambeta_lose");
  assert(Array.from(tuGambeta).every(s => !/pasaron por al lado|taquito/.test(s)), "SÍNTOMA: con tu gambeta perdida dicen que te pasaron por al lado o que la quisiste de taquito");
  const teGanaron = escuchar(0, 0, 30, "error", "defensa_lose");
  assert(Array.from(teGanaron).some(s => /pasaron por al lado/.test(s)), "con el duelo de defensa perdido sale la de que le pasaron por al lado");
  console.log("[6] el pase cortado y el duelo perdido no se festejan");
})();

/* ---------- [7] revisión final del 23/oct: en el partido rápido no hay puntos ---------- */
(function () {
  ["resultado_gana", "resultado_empate"].forEach(ev => {
    for (let gm = 0; gm <= 3; gm++) {
      const gr = ev === "resultado_gana" ? 0 : gm;
      if (ev === "resultado_gana" && gm === 0) continue;
      const sc = escena(gm, gr, 90); sc._rapido = true;
      T.montar(sc);
      const oido = new Set();
      for (let k = 0; k < 40; k++) if (T.comentar(sc, ev, "final")) oido.add(dicho(sc));
      assert(oido.size >= 2, ev + " " + gm + "-" + gr + " en el partido rápido: dos o más intercambios valen (" + oido.size + ")");
      assert(Array.from(oido).every(t => !/punto/i.test(t)), "SÍNTOMA: en el partido rápido hablan de puntos (" + Array.from(oido).filter(t => /punto/i.test(t)).join(" | ") + ")");
    }
  });
  const enLaCarrera = escuchar(2, 0, 90, "resultado_gana", "final");
  assert(Array.from(enLaCarrera).some(t => /Tres puntos/.test(t)), "en una fecha de la carrera los tres puntos siguen saliendo");
  console.log("[7] en el partido rápido no se cuentan puntos");
})();

if (mal === 0) console.log("\n✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("\n✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
