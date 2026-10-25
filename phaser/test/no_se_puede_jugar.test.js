/* PAMPA STAR · test del lote "POR AHORA NO SE PUEDE JUGAR" (25/oct)
   Pedidos de Rodri del 25/oct: "es todo recuperar, recuperar, recuperar",
   "cuando están todos juntos... que cambien los jugadores del campo" y "en 5
   partidos no me hicieron goles". Las perillas: balance.ritmo.cruce_def
   (bonus_decisiva, salto_al_remate), balance.partido.reacomodo y
   balance.partido.remate_rival. node phaser/test/no_se_puede_jugar.test.js */
"use strict";
const path = require("path"), fs = require("fs");
const RAIZ = path.join(__dirname, "..");
const P = require(path.join(RAIZ, "logic", "partido.js"));
const Duel = require(path.join(RAIZ, "logic", "duel.js"));
const BAL = JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "balance.json"), "utf8"));
let ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("✗ " + m); } }
function rngDe(s) { return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function partido(bal) {
  const plantel = [];
  for (let i = 0; i < 11; i++) plantel.push({ nombre: "J" + i, esVos: i === 9 });
  return P.crearPartido({ bal: bal || BAL, plantel, rival: "Test" });
}

/* [1] la defensa decisiva trae la ventaja de tu equipo, y el % del botón la cuenta */
{
  const st = partido(); P.kickoff(st, "rival");
  st._crucesDef = 0; const sin = P.accionesDefensa(st);
  st._crucesDef = 1; const con = P.accionesDefensa(st);
  const B = BAL.ritmo.cruce_def.bonus_decisiva;
  assert(B > 0 && con.every((a, i) => Math.abs(a.poder - sin[i].poder - B) < 1e-9),
    "en la defensa decisiva las tres acciones suman bonus_decisiva al poder (" + B + "), y el % del botón sale de ese poder");
}

/* [2] el reacomodo: después de un duelo nadie queda pegado */
{
  const st = partido(); st.posesion = "mia"; st.modo = "congelado"; st.ctrl = 9;
  const c = st.mios[9]; c.x = 600; c.y = 340;
  st.mios.concat(st.rivales).forEach((j, k) => { if (j.pos !== "ARQ" && j !== c) { j.x = 600 + (k % 5) * 6; j.y = 340 + (k % 7) * 5; } });
  P.ganarAtaque(st, "gambeta", 3, { chancePct: 60, roll: 0.4, matriz: "zafaste" });
  const todos = st.mios.concat(st.rivales).filter(j => j.pos !== "ARQ");
  let minD = 1e9;
  for (let a = 0; a < todos.length; a++) for (let b = a + 1; b < todos.length; b++) minD = Math.min(minD, Math.hypot(todos[a].x - todos[b].x, todos[a].y - todos[b].y));
  assert(minD >= BAL.partido.reacomodo.dist_min_px * 0.5, "con los 20 apilados en un punto, después de la gambeta el más cerca queda a " + Math.round(minD) + " px (piso " + BAL.partido.reacomodo.dist_min_px + ")");
}

/* [3] medido en partidos de lógica pura: menos amontonamientos con el reacomodo */
function amontonados(bal) {
  let lat = 0, junt = 0;
  for (let s = 1; s <= 16; s++) {
    const rg = rngDe(s * 104729), st = partido(bal); P.kickoff(st, "mia");
    for (let t = 0; t < 500; t++) {
      const ev = P.tick(st, 300, st.posesion === "mia" ? { dx: 1, dy: rg() - 0.5 } : null);
      let fin = false;
      ev.forEach(e => {
        if (e.tipo === "encuentro") { if (rg() < 0.55) P.ganarAtaque(st, "gambeta", e.rivalIdx, { chancePct: 60, roll: rg() * 0.6, matriz: "zafaste" }); else P.perderPelota(st, rg); }
        else if (e.tipo === "encuentroDef") { if (rg() < 0.6) P.ganarDefensa(st); else P.perderDefensa(st); }
        else if (e.tipo === "rivalTira") P.resolverAtajada(st, "atajar", rg, 20);
        else if (e.tipo === "entretiempo") P.entretiempo(st);
        else if (e.tipo === "final") fin = true;
      });
      if (fin) break;
      if (st.posesion === "mia" && st.mios[st.ctrl].x > st.W - 150) P.saqueArquero(st, "atajada");
      const t2 = st.mios.concat(st.rivales).filter(j => j.pos !== "ARQ");
      lat++;
      if (t2.some(a => t2.filter(b => Math.hypot(a.x - b.x, a.y - b.y) < 60).length >= 4)) junt++;
    }
  }
  return junt / lat;
}
{
  const sinR = JSON.parse(JSON.stringify(BAL)); sinR.partido.reacomodo.activo = false;
  const antes = amontonados(sinR), despues = amontonados(BAL);
  console.log("[3] latidos con 4 o más en 60 px: sin reacomodo " + Math.round(antes * 100) + "%, con reacomodo " + Math.round(despues * 100) + "%");
  assert(despues < antes * 0.85, "el reacomodo baja los amontonamientos por lo menos 15% (" + Math.round(antes * 100) + "% → " + Math.round(despues * 100) + "%)");
}

/* [4] el remate rival: entra a veces, y más en las divisiones altas */
{
  const Ma = require(path.join(RAIZ, "logic", "master.js"));
  const tasa = (div) => {
    let goles = 0, n = 0;
    for (let s = 1; s <= 60; s++) {
      const st = partido(); Ma.aplicar(st, Ma.DIVISIONES ? Ma.DIVISIONES.find(d => d.id === div) : { primera_b: { keeper: 40, mult_stats: 0.82 }, nacional: { keeper: 74, mult_stats: 1.16 } }[div], { mult: 1 });
      const ata = st.rivales.findIndex(r => r.pos === "ATA");
      st.rivales[ata].stats.tiro = Math.round(67 * (div === "primera_b" ? 0.82 : 1.16));
      Object.assign(st.mios.find(j => j.pos === "ARQ").stats, { fisico: 60, caracter: 60 });   // el arquero promedio de roster_pampeano
      const rg = rngDe(s * 7);
      for (let k = 0; k < 20; k++) { P.kickoff(st, "rival"); st.portadorRival = ata; n++; if (P.resolverAtajada(st, "atajar", rg, 20).golRival) goles++; }
    }
    return goles / n;
  };
  const b = tasa("primera_b"), nac = tasa("nacional");
  console.log("[4] remate rival contra un arquero promedio con +20 de bonus: entra " + Math.round(b * 100) + "% en la B y " + Math.round(nac * 100) + "% en el Nacional");
  assert(b >= 0.15 && b <= 0.5, "SÍNTOMA: el remate rival en la B no entra nunca o entra de más (" + Math.round(b * 100) + "%)");
  assert(nac > b + 0.05, "en las divisiones altas el remate rival pega más (" + Math.round(b * 100) + "% → " + Math.round(nac * 100) + "%)");
}

/* [5] las faltas: la tuya al perder la decisiva solo a tiro del arco, y es penal en el área */
{
  const Fa = BAL.frente.falta;
  assert(Fa.base.al_perder > 0 && Fa.solo_a_tiro.indexOf("al_perder") >= 0 && BAL.penal.acciones.indexOf("al_perder") >= 0,
    "al_perder existe, se cobra solo a tiro del arco y en el área es penal");
  const M = fs.readFileSync(path.join(RAIZ, "scenes", "match.js"), "utf8");
  assert(/accion: "al_perder"/.test(M), "la escena la cobra al perder la defensa");
}

/* [6] el saque de tu arquero se elige: corto (seguro) o largo (al delantero) */
{
  const SL = BAL.partido.saque_largo;
  const armar = () => { const st = partido(); P.kickoff(st, "rival"); P.resolverAtajada(st, "atajar", () => 0.5, 200); return st; };
  let st = armar();
  assert(st.posesion === "mia" && st.mios[st.ctrl].pos === "DEF", "después de la atajada la tiene un defensor tuyo: es el SAQUE CORTO");
  const s0 = P.saqueLargoPct(st);
  assert(s0 && st.mios[s0.idx].pos === "ATA" && s0.pct >= SL.min && s0.pct <= SL.max, "el SAQUE LARGO va a un delantero tuyo, con su % (" + (s0 && s0.pct) + ")");
  st.rivales.forEach(r => { if (r.pos !== "ARQ") { r.x = s0.x + 10; r.y = s0.y + 10; } });
  assert(P.saqueLargoPct(st).pct < s0.pct, "con rivales donde cae, la chance baja");
  st = armar(); let r = P.saqueLargo(st, () => 0);
  assert(r.win && st.posesion === "mia" && st.ctrl === r.receptorIdx && st.mios[st.ctrl].x >= st.W * SL.x_min - 1, "si sale, la baja el delantero pasando la mitad de la cancha");
  st = armar(); r = P.saqueLargo(st, () => 0.999);
  assert(!r.win && st.posesion === "rival" && st.rivales[st.portadorRival].pos !== "ARQ" && st._crucesDef === 0 && st.modo === "juego",
    "si sale mal, la gana un rival de campo y vuelve a haber defensa");
  const V9 = fs.readFileSync(path.join(RAIZ, "scenes", "escenas_v9.js"), "utf8");
  assert(V9.indexOf("if (res.retiene && self.abrirSaqueArquero) self.abrirSaqueArquero();") >= 0, "la escena pregunta el saque cuando tu arquero la retiene");
}

console.log((mal ? "✗" : "✓") + " no_se_puede_jugar: " + ok + " ok, " + mal + " mal");
process.exit(mal ? 1 : 0);
