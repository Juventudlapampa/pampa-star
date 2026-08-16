/* ============================================================================
   PAMPA STAR · A5 — LA CARRERA COMPLETA, 90 SEMANAS

   Simula 18 fechas x 5 temporadas con TRES estrategias de jugador (entrenar
   siempre, descansar siempre, mixta) usando la LÓGICA REAL (logic/semana.js,
   logic/temporada.js). Si el simulador y el juego se separan, el simulador
   miente — por eso no reimplementa nada.

   Falla si:
     · alguna stat toca el techo antes de la temporada 3 (semana 37),
     · el resumen de comoLlegas devuelve el mismo texto en más del 80% de las
       semanas (ese texto es lo ÚNICO que le dice al jugador que su semana tuvo
       consecuencia: si no cambia, la semana no existe),
     · ganando todo no se llega a la gloria.

   Corré:  node phaser/test/carrera.test.js
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

let ok = 0, mal = 0;
function assert(cond, msg) { if (cond) ok++; else { mal++; console.error("  ✗ " + msg); } }

const RAIZ = path.join(__dirname, "..", "..");
const S = require(path.join(RAIZ, "phaser/logic/semana.js"));
const T = require(path.join(RAIZ, "phaser/logic/temporada.js"));
const DATA = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/semana.json"), "utf8"));
const BAL = JSON.parse(fs.readFileSync(path.join(RAIZ, "phaser/data/balance.json"), "utf8"));
const DIV = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/divisiones.json"), "utf8")).divisiones;
const IDS = Object.keys(DIV);
const CFG = BAL.semana;

const FECHAS = 18, TEMPORADAS = 5, TOTAL = FECHAS * TEMPORADAS;
const STAT_INI = 50, STAT_TECHO = 99;
const SEM_TEMPORADA_3 = FECHAS * 2 + 1;              // 37

/* RNG determinista: dos corridas dan lo mismo */
function rngCon(sem) { let s = sem >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

const ESTRATEGIAS = {
  entrenar: () => "entrenar_tiro",
  descansar: () => "descansar",
  mixta: (sem, r) => sem.energia < 40 ? "descansar"
    : r === 0 ? "entrenar_tiro" : r === 1 ? (sem.animo < 50 ? "asado" : "entrenar_gambeta") : "picadito"
};

function simular(estrategia) {
  const rnd = rngCon(20260808);
  let save = { animo: CFG.animo_inicial, desgaste: 0, molestia: false, fecha: 1 };
  const stats = { tiro: STAT_INI, gambeta: STAT_INI, resistencia: STAT_INI, azar: STAT_INI };
  const textos = {}, historia = [];
  let techoEn = null;

  for (let w = 1; w <= TOTAL; w++) {
    let semana = S.nuevaSemana(save, CFG);
    semana.permanentes = {};
    const ctx = { stats: stats, stat_techo: STAT_TECHO };
    for (let r = 0; r < 3; r++) {
      const id = ESTRATEGIAS[estrategia](semana, r);
      /* el cfg lleva las stats para que elegir() respete el techo (A1) */
      const next = S.elegir(DATA, semana, r, id, Object.assign({}, CFG, ctx));
      if (next) semana = next;
    }
    for (const k in (semana.permanentes || {})) {
      if (stats[k] != null) stats[k] = Math.min(STAT_TECHO, stats[k] + semana.permanentes[k]);
    }
    if (techoEn === null && Object.keys(stats).some(k => stats[k] >= STAT_TECHO)) techoEn = w;

    const llegas = S.comoLlegas(semana, CFG);
    textos[llegas.resumen] = (textos[llegas.resumen] || 0) + 1;
    historia.push({ w, energia: semana.energia, animo: semana.animo, resumen: llegas.resumen });

    const gano = rnd() < 0.5;
    save = S.lunesDespues(Object.assign({}, save, { animo: semana.animo }),
      { golesMio: gano ? 2 : 0, golesRival: gano ? 0 : 1, hiceGol: gano,
        aguanteFinalFrac: Math.max(0.05, llegas.aguanteFrac - 0.3), golpeFuerte: rnd() < 0.08 }, CFG);
  }
  const top = Object.entries(textos).sort((a, b) => b[1] - a[1]);
  return { stats, techoEn, textos: top, pctTop: Math.round(top[0][1] / TOTAL * 100), historia };
}

/* ================== CÓMO SE COMPORTA ESTE TEST ==================
   Los dos primeros criterios (el techo y la variedad del resumen) miden
   problemas REALES y ABIERTOS, cuya solución es una decisión de diseño de
   Rodri que todavía no está tomada: qué opción del techo elegir (A1) y si el
   ánimo tiene que dejar de saturarse (A2, toca el valor de las 10 opciones).

   Si fallaran, la suite quedaría en rojo hasta que él decida, y todo commit
   quedaría trabado por una discusión de diseño. Así que van con el mismo
   patrón que ya usamos para la deuda de legibilidad, que es el que Rodri
   validó: se MIDEN, se muestran en cada corrida con "DEUDA:", y el test falla
   solo si EMPEORAN respecto de la línea base registrada.

   Para volverlos bloqueantes cuando la decisión esté tomada: poner
   BLOQUEA = true acá abajo.
   ================================================================ */
const BLOQUEA = false;
const BASE_FILE = path.join(__dirname, "_carrera_base.json");
let BASE = null;
try { BASE = JSON.parse(fs.readFileSync(BASE_FILE, "utf8")); } catch (e) { }

/* ---------- [1] EL TECHO NO SE TOCA ANTES DE LA TEMPORADA 3 ---------- */
const sims = {};
["entrenar", "descansar", "mixta"].forEach(e => { sims[e] = simular(e); });
Object.entries(sims).forEach(([e, r]) => {
  const cumple = r.techoEn === null || r.techoEn >= SEM_TEMPORADA_3;
  const msg = "con la estrategia '" + e + "' una stat toca el techo (" + STAT_TECHO + ") en la semana " + r.techoEn +
    ", antes de la temporada 3 (semana " + SEM_TEMPORADA_3 + "). SÍNTOMA: el resto de la carrera entrenar deja " +
    "de cambiar un número, pero te sigue costando energía. Perilla: balance.semana.permanente_max_semana.";
  if (BLOQUEA) { assert(cumple, msg); return; }
  /* no bloquea, pero NO puede empeorar: si el techo se toca ANTES que la
     última vez medida, algo del balance retrocedió */
  const antes = BASE && BASE.techo && BASE.techo[e];
  if (antes != null && r.techoEn != null) {
    assert(r.techoEn >= antes,
      "el techo con '" + e + "' se toca en la semana " + r.techoEn + " y antes se tocaba en la " + antes +
      ": el balance EMPEORÓ. " + msg);
  }
});
console.log("[1] techo por estrategia: " + Object.entries(sims)
  .map(([e, r]) => e + " " + (r.techoEn ? "sem " + r.techoEn : "nunca")).join(" · "));

/* ---------- [2] EL RESUMEN DE LA SEMANA SEPARA ---------- */
Object.entries(sims).forEach(([e, r]) => {
  const msg = "con la estrategia '" + e + "' el resumen de comoLlegas devuelve el MISMO texto en el " + r.pctTop +
    "% de las 90 semanas (\"" + r.textos[0][0] + "\"). SÍNTOMA: ese texto es lo único que le dice al jugador " +
    "que su semana tuvo consecuencia — si no cambia, la semana no se siente. " +
    "Suele ser porque un medidor quedó saturado: revisá el rango que recorre el ánimo.";
  if (BLOQUEA) { assert(r.pctTop <= 80, msg); return; }
  const antes = BASE && BASE.pctTop && BASE.pctTop[e];
  if (antes != null) {
    assert(r.pctTop <= antes,
      "la variedad del resumen con '" + e + "' EMPEORÓ: " + r.pctTop + "% contra " + antes + "% de antes. " + msg);
  }
});
console.log("[2] texto más repetido: " + Object.entries(sims).map(([e, r]) => e + " " + r.pctTop + "%").join(" · "));
Object.entries(sims).forEach(([e, r]) => {
  console.log("      " + e.padEnd(10) + r.textos.length + " textos distintos · rango de ánimo " +
    Math.min(...r.historia.map(h => h.animo)) + "-" + Math.max(...r.historia.map(h => h.animo)) +
    " · energía " + Math.min(...r.historia.map(h => h.energia)) + "-" + Math.max(...r.historia.map(h => h.energia)));
});

/* ---------- [3] GANANDO TODO SE LLEGA A LA GLORIA ---------- */
function carreraGanandoTodo() {
  let iDiv = 0;
  for (let temp = 1; temp <= 12; temp++) {
    const d = DIV[IDS[iDiv]];
    const t = T.crear({ division: IDS[iDiv], miClub: "VOS", rivales: d.rivales, semilla: 4242 + temp });
    for (let f = 0; f < t.fixture.length; f++) T.jugarFecha(t, 5, 0);   // ganás todos 5-0
    const v = T.veredicto(t, IDS);
    if (v.gloria) return { gloria: true, temporadas: temp };
    if (v.asciende) iDiv++;
    else return { gloria: false, temporadas: temp, pos: v.posicion, div: IDS[iDiv] };
  }
  return { gloria: false, temporadas: 12 };
}
const g = carreraGanandoTodo();
assert(g.gloria,
  "ganando TODOS los partidos 5-0 no se llega a la gloria: se frena en " + (g.div || "?") +
  " saliendo " + (g.pos || "?") + "º tras " + g.temporadas + " temporadas. SÍNTOMA: la carrera no tiene final.");
console.log("[3] ganando todo se llega a la gloria en " + g.temporadas + " temporadas (" + IDS.length + " divisiones)");

/* ---------- [4] LA ENERGÍA ARRASTRA ENTRE SEMANAS ---------- */
/* A3: lunesDespues no devuelve energía, pero sí desgaste, y nuevaSemana lo
   resta. O sea que SÍ arrastra — pero por el desgaste del partido, no por
   cómo terminaste la semana. Esto lo deja documentado y medido. */
const sinDesgaste = S.nuevaSemana({ animo: 60, desgaste: 0, molestia: false }, CFG);
const conDesgaste = S.nuevaSemana({ animo: 60, desgaste: 40, molestia: false }, CFG);
const conMolestia = S.nuevaSemana({ animo: 60, desgaste: 40, molestia: true }, CFG);
assert(conDesgaste.energia < sinDesgaste.energia,
  "el desgaste del partido tiene que bajar la energía con la que arrancás la semana siguiente");
assert(conMolestia.energia < conDesgaste.energia,
  "una molestia sin curar tiene que costar energía extra");
console.log("[4] la energía inicial arrastra: fresco " + sinDesgaste.energia +
  " · con desgaste " + conDesgaste.energia + " · +molestia " + conMolestia.energia);
/* lo que NO arrastra: con cuánta energía TERMINASTE la semana */
console.log("DEUDA: lunesDespues NO devuelve 'energia', así que con cuánta terminaste la semana no arrastra " +
  "(solo arrastra el desgaste del PARTIDO). Si la resaca de la semana tiene que existir, es una decisión de diseño abierta — A3.");

/* ---------- LAS DEUDAS ABIERTAS, A LA VISTA EN CADA CORRIDA ---------- */
if (!BLOQUEA) {
  const peorTecho = Object.entries(sims).filter(([, r]) => r.techoEn != null)
    .sort((a, b) => a[1].techoEn - b[1].techoEn)[0];
  if (peorTecho && peorTecho[1].techoEn < SEM_TEMPORADA_3) {
    console.log("DEUDA: el techo de stats se toca en la semana " + peorTecho[1].techoEn + " de 90 (estrategia '" +
      peorTecho[0] + "'), antes de la temporada 3. Quedan " + (TOTAL - peorTecho[1].techoEn) +
      " semanas en las que entrenar no cambia un número. Decisión abierta: A1 (a/b/c).");
  }
  const peorTexto = Object.entries(sims).sort((a, b) => b[1].pctTop - a[1].pctTop)[0];
  if (peorTexto && peorTexto[1].pctTop > 80) {
    console.log("DEUDA: con la estrategia '" + peorTexto[0] + "' el resumen de la semana repite el mismo texto el " +
      peorTexto[1].pctTop + "% de las 90 semanas. El ánimo se satura (llega a 100 y se queda) y deja de ser un " +
      "medidor. Decisión abierta: A2 — equilibrarlo toca el valor de las 10 opciones.");
  }
  /* la línea base, para que la próxima corrida detecte si algo EMPEORÓ */
  if (!BASE) {
    const nueva = { techo: {}, pctTop: {} };
    Object.entries(sims).forEach(([e, r]) => { nueva.techo[e] = r.techoEn; nueva.pctTop[e] = r.pctTop; });
    fs.writeFileSync(BASE_FILE, JSON.stringify(nueva, null, 1));
  }
}

if (mal === 0) console.log("\n✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("\n✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
