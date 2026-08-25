/* ============================================================================
   PAMPA STAR · A5 — LA CARRERA COMPLETA, 90 SEMANAS

   Simula 18 fechas x 5 temporadas con TRES estrategias de jugador (entrenar
   siempre, descansar siempre, mixta) usando la LÓGICA REAL (logic/semana.js,
   logic/temporada.js). Si el simulador y el juego se separan, el simulador
   miente — por eso no reimplementa nada.

   Falla si:
     · entrenando siempre el mismo stat NO se toca el techo, o se toca antes de
       la temporada 4 (semana 55) — A1 pide que llegue, pero cerca del final;
     · con estrategia mixta SÍ se toca el techo en las 90 semanas (A1);
     · la resaca de la semana no arrastra, o deja la energía por debajo del
       piso jugable (A3);
     · ganando todo no se llega a la gloria.

   MIDE y muestra como DEUDA, sin frenar: la variedad del resumen de la semana
   (A2, declarado cerrado en la orden de trabajo).

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
const SEM_TEMPORADA_4 = FECHAS * 3 + 1;              // 55

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
    const ctx = { stats: stats, stat_techo: STAT_TECHO, stat_inicial: STAT_INI };
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
    historia.push({ w, energia: semana.energia, animo: semana.animo, resumen: llegas.resumen, tiro: stats.tiro });

    const gano = rnd() < 0.5;
    save = S.lunesDespues(Object.assign({}, save, { animo: semana.animo, energiaFinal: semana.energia }),
      { golesMio: gano ? 2 : 0, golesRival: gano ? 0 : 1, hiceGol: gano,
        aguanteFinalFrac: Math.max(0.05, llegas.aguanteFrac - 0.3), golpeFuerte: rnd() < 0.08 }, CFG);
  }
  const top = Object.entries(textos).sort((a, b) => b[1] - a[1]);
  return { stats, techoEn, textos: top, pctTop: Math.round(top[0][1] / TOTAL * 100), historia };
}

/* ================== CÓMO SE COMPORTA ESTE TEST ==================
   El patrón es el que Rodri validó con la deuda de legibilidad: un criterio
   cuya solución todavía es una decisión de diseño no frena el commit —se MIDE,
   se imprime en cada corrida con "DEUDA:" y el test falla solo si EMPEORA
   respecto de la línea base de _carrera_base.json—, y pasa a bloquear el día
   que la decisión está tomada.

   El TECHO ya está decidido (A1, opción b: rendimiento decreciente), así que
   bloquea. El TEXTO depende de A2, que la orden de trabajo declaró cerrado y
   fuera de alcance: sigue como deuda a la vista.
   ================================================================ */
const BLOQUEA_TECHO = true;    /* A1 decidido en la Tanda 0: opción (b) */
const BLOQUEA_TEXTO = false;   /* A2 cerrado por orden; lo que falta no está en alcance */
const BASE_FILE = path.join(__dirname, "_carrera_base.json");
let BASE = null;
try { BASE = JSON.parse(fs.readFileSync(BASE_FILE, "utf8")); } catch (e) { }

/* ---------- [1] EL TECHO: LLEGA EL QUE SE ESPECIALIZA, Y TARDE ----------
   A1 pide DOS cosas a la vez, y son las dos las que calibran la curva:
     · entrenando SIEMPRE el mismo stat se toca el techo, pero "cerca del
       final, no antes de la temporada 4" (semana 55 en adelante);
     · con estrategia MIXTA no se toca nunca en las 90 semanas.
   La perilla es balance.semana.rendimiento_piso: cuánto vale el último punto
   de entrenamiento comparado con el primero. Más bajo = el techo llega más
   tarde. Medido: 0.10→sem 80 · 0.13→73 · 0.16→68 · 0.19→64 · 0.25→58. */
const sims = {};
["entrenar", "descansar", "mixta"].forEach(e => { sims[e] = simular(e); });

const esp = sims.entrenar;
assert(esp.techoEn !== null,
  "entrenando SIEMPRE el mismo stat no se toca nunca el techo (quedó en " + esp.stats.tiro + "): " +
  "especializarse tiene que tener premio. Perilla: subir balance.semana.rendimiento_piso.");
assert(esp.techoEn >= SEM_TEMPORADA_4,
  "entrenando siempre el mismo stat el techo se toca en la semana " + esp.techoEn + ", antes de la temporada 4 " +
  "(semana " + SEM_TEMPORADA_4 + "). SÍNTOMA: el resto de la carrera entrenar deja de cambiar un número, pero te " +
  "sigue costando energía. Perilla: bajar balance.semana.rendimiento_piso.");
assert(sims.mixta.techoEn === null,
  "con estrategia MIXTA se toca el techo en la semana " + sims.mixta.techoEn + ". A1 pide que no se toque nunca " +
  "en 90 semanas: si el que reparte también llega, especializarse no significa nada. " +
  "Perilla: bajar balance.semana.rendimiento_piso.");
console.log("[1] techo por estrategia: " + Object.entries(sims)
  .map(([e, r]) => e + " " + (r.techoEn ? "sem " + r.techoEn : "nunca (" + r.stats.tiro + ")")).join(" · "));
console.log("      curva del tiro entrenando siempre: " + [18, 36, 54, 72, 90]
  .map(w => "s" + w + " " + Math.round(esp.historia[w - 1].tiro * 10) / 10).join(" · "));

/* ---------- [2] EL RESUMEN DE LA SEMANA SEPARA ---------- */
Object.entries(sims).forEach(([e, r]) => {
  const msg = "con la estrategia '" + e + "' el resumen de comoLlegas devuelve el MISMO texto en el " + r.pctTop +
    "% de las 90 semanas (\"" + r.textos[0][0] + "\"). SÍNTOMA: ese texto es lo único que le dice al jugador " +
    "que su semana tuvo consecuencia — si no cambia, la semana no se siente. " +
    "Suele ser porque un medidor quedó saturado: revisá el rango que recorre el ánimo.";
  if (BLOQUEA_TEXTO) { assert(r.pctTop <= 80, msg); return; }
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
/* A3 (Tanda 0): ahora la semana TAMBIÉN arrastra. lunesDespues devuelve
   'resaca' = una fracción de lo que faltó para llenar el tanque. */
const conResaca = S.nuevaSemana({ animo: 60, desgaste: 0, molestia: false, resaca: 20 }, CFG);
assert(conResaca.energia < sinDesgaste.energia,
  "A3: la resaca de tu propia semana tiene que bajar la energía de arranque de la siguiente");
assert(conResaca.energia >= (CFG.resaca_piso || 35),
  "A3: la resaca nunca puede dejarte por debajo del piso jugable (" + (CFG.resaca_piso || 35) + ")");
const lunes = S.lunesDespues({ animo: 60, fecha: 1, energiaFinal: 10 },
  { golesMio: 1, golesRival: 0, aguanteFinalFrac: 0.5 }, CFG);
assert(lunes.resaca > 0, "A3: terminando la semana con 10 de energía tiene que haber resaca");
console.log("[5] A3 resaca: terminás con 10 → resaca " + lunes.resaca +
  " · arranque con resaca 20 = " + conResaca.energia + " (piso " + (CFG.resaca_piso || 35) + ")");

/* ---------- LAS DEUDAS ABIERTAS, A LA VISTA EN CADA CORRIDA ----------
   Cada deuda mira SU flag, no un flag global. Estaba todo adentro de un
   if (!BLOQUEA): al volver bloqueante el techo, la deuda del TEXTO dejó de
   imprimirse sin que nadie la hubiera pagado. Una deuda que no se ve no se
   paga, así que el criterio es por deuda. */
if (!BLOQUEA_TECHO) {
  const peorTecho = Object.entries(sims).filter(([, r]) => r.techoEn != null)
    .sort((a, b) => a[1].techoEn - b[1].techoEn)[0];
  if (peorTecho && peorTecho[1].techoEn < SEM_TEMPORADA_3) {
    console.log("DEUDA: el techo de stats se toca en la semana " + peorTecho[1].techoEn + " de 90 (estrategia '" +
      peorTecho[0] + "'), antes de la temporada 3. Quedan " + (TOTAL - peorTecho[1].techoEn) +
      " semanas en las que entrenar no cambia un número.");
  }
}
if (!BLOQUEA_TEXTO) {
  const peorTexto = Object.entries(sims).sort((a, b) => b[1].pctTop - a[1].pctTop)[0];
  if (peorTexto && peorTexto[1].pctTop > 80) {
    const cuantos = Object.entries(sims).filter(([, r]) => r.pctTop > 80).map(([e, r]) => e + " " + r.pctTop + "%");
    console.log("DEUDA: el resumen de la semana repite el mismo texto más del 80% de las 90 semanas en " +
      cuantos.length + " de las 3 estrategias (" + cuantos.join(", ") + "). El ánimo se satura (llega a 100 y se " +
      "queda) y deja de ser un medidor, y desde la Tanda 0 la resaca clava la energía en un valor fijo por " +
      "estrategia (50/60/88), así que el resumen tiene menos de dónde variar. " +
      /* el número de comparación se LEE de la línea base. Estaba cableado a mano
         ("mixta pasó de 79% a X") y la base decía 94: un texto que mentía sobre
         su propio dato, que es justo lo que estamos barriendo del proyecto. */
      (BASE && BASE.pctTop ? "Contra la línea base: " + Object.entries(sims)
        .map(([e, r]) => e + " " + (BASE.pctTop[e] != null ? BASE.pctTop[e] + "% → " : "") + r.pctTop + "%")
        .join(" · ") + ". " : "") +
      "Es A2, declarado cerrado en la orden de trabajo — pagarlo toca el valor de las 10 " +
      "opciones de data/semana.json, que es balance de carrera.");
  }
}
/* la línea base, para que la próxima corrida detecte si algo EMPEORÓ */
if (!BASE) {
  const nueva = { techo: {}, pctTop: {} };
  Object.entries(sims).forEach(([e, r]) => { nueva.techo[e] = r.techoEn; nueva.pctTop[e] = r.pctTop; });
  fs.writeFileSync(BASE_FILE, JSON.stringify(nueva, null, 1));
}

if (mal === 0) console.log("\n✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("\n✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
