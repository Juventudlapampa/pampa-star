/* PAMPA STAR · test de QUE NO SE GANE APRETANDO ENTER (balance.partido.lee_repeticion)
   Pedido de Rodri del 25/oct: "Que no se gane apretando ENTER. El agente ganó
   un partido eligiendo siempre lo que venía marcado. Hay que medirlo con el
   simulador y, si se repite, ajustar."

   LA MEDICIÓN: partidos enteros con la lógica de verdad (partido.js, flujo.js,
   frente.js, duel.js, master.js), el mismo piloto de flujo.test.js, en las
   cinco divisiones y con los cuatro perfiles de rival, con dos jugadores:
   · ENTER SIEMPRE: en cada menú confirma lo que el cursor trae marcado, como
     lo arma la escena (match.js: abrirMenuCruz arranca en la primera que se
     puede usar en el orden N, W, E, S, SW; el pase en el primero de la lista;
     de frente al arco con la mira al medio, la primera pegada y la marca de la
     barra donde caiga; en el penal de ellos, tu arquero al medio).
   · ELIGE BIEN: patea cerca del arco apuntando al hueco y bien perfilado,
     tira el centro cuando cae en la zona, gambetea o pasa según la chance
     contra lo que marca ese rival (y lo que ya le leyó), sigue corriendo
     cuando nadie lo apura, en defensa usa la acción con más chance y en el
     penal de ellos se tira para donde dice la postura.
   Las faltas, los penales y los tiros libres van como en frente_ui.cobrarFalta.
   Se mide con la lectura de la repetición apagada (ANTES) y prendida
   (DESPUÉS). Imprime los números por división.
   node phaser/test/enter_siempre.test.js */
"use strict";
const path = require("path");
const fs = require("fs");
const RAIZ = path.join(__dirname, "..");
const P = require(path.join(RAIZ, "logic", "partido.js"));
const F = require(path.join(RAIZ, "logic", "flujo.js"));
const Duel = require(path.join(RAIZ, "logic", "duel.js"));
const Fr = require(path.join(RAIZ, "logic", "frente.js"));
const Ma = require(path.join(RAIZ, "logic", "master.js"));
const SM = require(path.join(RAIZ, "logic", "save_master.js"));
const Pn = require(path.join(RAIZ, "logic", "penal.js"));
const Df = require(path.join(RAIZ, "logic", "definicion.js"));

let ok = 0, mal = 0;
function assert(cond, msg) { if (cond) ok++; else { mal++; console.error("✗ " + msg); } }

const BAL = JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "balance.json"), "utf8"));

function semilla(s) {
  let a = s >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function partidoNuevo(division, perfil, rng, lee) {
  const bal = SM.balConTempo(JSON.parse(JSON.stringify(BAL)), "intermedio");
  bal.partido.lee_repeticion.activo = lee;
  const mk = (pos, i) => ({ nombre: "J" + pos + i, pos, stats: { pase: 55 + Math.floor(rng() * 20), tiro: 55 + Math.floor(rng() * 20), gambeta: 50 + Math.floor(rng() * 25), aereo: 50 + Math.floor(rng() * 25), velocidad: 55 + Math.floor(rng() * 15), fisico: 55 + Math.floor(rng() * 15), resistencia: 60, caracter: 55 } });
  const pos = ["ARQ", "DEF", "DEF", "DEF", "DEF", "VOL", "VOL", "VOL", "ATA", "ATA", "ATA"];
  const mios = pos.map(mk), rivales = pos.map(mk);
  mios[8].esVos = true;
  const st = P.crearPartido({ bal, mios, rivales, rng });
  Ma.aplicar(st, division, perfil);
  return st;
}

/* LO QUE TRAE MARCADO CADA MENÚ, en el orden de la escena */
function cruzAtaque(st, rivalIdx, libre) {
  const acc = P.accionesAtaque(st), A = id => acc.find(a => a.id === id);
  const rs = P.receptoresPase(st), aereo = F.receptorAereo(st);
  const op = {
    N: { id: "gambeta", bloq: libre || A("gambeta").bloqueada },
    W: { id: "pase", bloq: !rs.length },
    E: { id: "tiro", bloq: !P.puedeTirar(st) || A("tiro").bloqueada },
    S: { id: "pared", bloq: A("pared").bloqueada },
    SW: { id: "centro", bloq: !aereo }
  };
  return { acc, A, rs, aereo, op, orden: ["N", "W", "E", "S", "SW"] };
}
function marcadaAtaque(st, rivalIdx, libre) {
  const c = cruzAtaque(st, rivalIdx, libre);
  const k = c.orden.find(d => !c.op[d].bloq);
  return { op: k ? c.op[k].id : "seguir", rec: c.rs[0], aereo: c.aereo, A: c.A };
}
function buenaAtaque(st, rivalIdx, libre) {
  const c = cruzAtaque(st, rivalIdx, libre), yo = st.mios[st.ctrl];
  if (!c.op.E.bloq && st.W - yo.x < 300) return { op: "tiro", A: c.A };
  if (c.aereo && c.aereo.zona && c.aereo.pct >= 55) return { op: "centro", aereo: c.aereo, A: c.A };
  const pesos = P.pesosCPU(st), B = st.bal.partido.matriz_bonus, CONTRA = { gambeta: "quite", pared: "corte" };
  const chance = id => {
    const a = c.A(id);
    return Object.keys(pesos).reduce((s, cpu) => {
      const leido = CONTRA[id] === cpu;
      return s + pesos[cpu] * Duel.duelChance(a.poder + (leido ? 0 : B * 0.6), P.poderRival(st) + (leido ? B : 0), st.bal.duelo);
    }, 0);
  };
  const pase = c.rs.find(r => r.adelante) || c.rs[0];
  if (libre) {
    if (pase && pase.adelante && pase.pct >= 72) return { op: "pase", rec: pase, A: c.A };
    return { op: "seguir", A: c.A };
  }
  const cg = c.op.N.bloq ? 0 : chance("gambeta"), cp = c.op.S.bloq ? 0 : chance("pared"), cpa = pase ? pase.pct / 100 : 0;
  if (cg >= cpa - 0.05 && cg >= cp) return { op: "gambeta", A: c.A };
  if (cp > cpa) return { op: "pared", A: c.A };
  if (pase) return { op: "pase", rec: pase, A: c.A };
  return { op: c.op.N.bloq ? "seguir" : "gambeta", A: c.A };
}
function marcadaDefensa(st) {
  const acc = P.accionesDefensa(st);
  return ["quite", "corte", "bloqueo"].map(id => acc.find(a => a.id === id)).find(a => !a.bloqueada);
}
function buenaDefensa(st) {
  const B = st.bal.partido.matriz_bonus, CONTRA = { gambeta: "quite", pase: "corte", tiro: "bloqueo" }, rep = P.repeticion(st, "defensa");
  const peso = x => rep && CONTRA[x] === rep.accion ? 1 - rep.k : 1;
  const chance = a => ["gambeta", "pase", "tiro"].reduce((s, x) => {
    const lei = CONTRA[x] === a.id;
    return s + peso(x) * Duel.duelChance(a.poder + (lei ? B : 0), P.poderRival(st) + 4 + (lei ? 0 : B * 0.6), st.bal.duelo);
  }, 0);
  return P.accionesDefensa(st).filter(a => !a.bloqueada).sort((a, b) => chance(b) - chance(a))[0];
}

/* DE FRENTE AL ARCO, como frente_ui.entrarFrente y frenteRematar */
function deFrente(st, sinIdx, buena, rng) {
  const j = st.mios[st.ctrl], C = st.bal.frente;
  const iArq = st.rivales.findIndex(r => r.pos === "ARQ"), arq = st.rivales[iArq];
  const defs = [];
  st.rivales.forEach((r, i) => { if (r.pos !== "ARQ" && i !== sinIdx) defs.push({ ref: i, x: r.x, y: r.y }); });
  const foto = Fr.foto({ tirador: { x: j.x, y: j.y }, arco: { x: st.W, y: st.H / 2 }, am: st.bal.mundo.arco_medio, defensores: defs,
    arquero: { ref: iArq, x: arq.x, y: arq.y, seTira: 0, nivel: st.rivalKeeperSkill || 50 } });
  let dec;
  if (buena) { const e = Fr.elegirCPU(foto, C, rng, 99); dec = { mira: e.mira, tipo: e.tipo, calidad: 0.9 }; }
  else dec = { mira: { u: 0, h: 0.35 }, tipo: C.menu_remate[0], calidad: Fr.calidadDePerfil(rng(), C) };
  const res = Fr.resolver(foto, dec, { tiro: j.stats.tiro, aguanteFrac: j.aguante / st.bal.aguante.max }, C, rng);
  if (res.resultado !== "al_arco") return { outcome: res.resultado === "desvio" ? "corner" : "afuera" };
  const prep = P.prepararRemate(st, null, rng, false);
  return Duel.resolveShot({ shotPower: prep.shotPower, keeperSkill: prep.keeperSkill, zone: res.zona, cfg: st.bal.duelo,
    distancia: prep.distancia, especial: prep.especial, tiro: st.bal.tiro, penalizaciones: prep.penalizaciones, rng });
}

/* TU PENAL (frente_ui.penalMio y penalRematar): la mira, la pegada y la
   marca; el arquero de ellos lee o se tira a la suerte (logic/penal.js) */
function penalMio(st, buena, rng) {
  const j = st.mios[st.ctrl], C = st.bal.frente, PC = st.bal.penal;
  const arq = st.rivales.find(r => r.pos === "ARQ");
  const foto = Fr.foto({ tirador: { x: st.W - PC.punto_px, y: st.H / 2 }, arco: { x: st.W, y: st.H / 2 }, am: st.bal.mundo.arco_medio, defensores: [],
    arquero: { x: st.W - 4, y: st.H / 2, seTira: 0, nivel: st.rivalKeeperSkill || 50 } });
  const dec = buena ? { mira: { u: rng() < 0.5 ? -0.8 : 0.8, h: 0.3 }, tipo: "colocado", calidad: 0.9 }
    : { mira: { u: 0, h: 0.35 }, tipo: C.menu_remate[0], calidad: Fr.calidadDePerfil(rng(), C) };
  const res = Fr.resolver(foto, dec, { tiro: j.stats.tiro, aguanteFrac: j.aguante / st.bal.aguante.max }, C, rng);
  const dir = Pn.arqueroCPU(dec.mira, foto.arquero.nivel, PC, rng).dir;
  const pn = Pn.resolver({ u: res.fin.u, h: res.fin.h, fuera: res.resultado === "afuera", palo: res.resultado === "palo", tipo: C.tipos[dec.tipo], dir, nivel: foto.arquero.nivel }, PC, rng);
  return { outcome: pn.resultado === "gol" ? "gol" : pn.resultado === "atajada" ? "atajada" : "afuera", arq };
}
/* EL PENAL DE ELLOS (frente_ui.penalRival): ENTER deja a tu arquero al medio;
   el que elige bien se tira para donde dice la postura */
function penalRival(st, buena, rng) {
  const C = st.bal.frente, PC = st.bal.penal, t = st.rivales[st.portadorRival];
  const arqM = st.mios.find(x => x.pos === "ARQ"), nivel = P.nivelArqueroDe(arqM && arqM.stats);
  const dec = Pn.pateadorCPU((t.stats && t.stats.tiro) || 55, PC, rng);
  const foto = Fr.foto({ tirador: { x: PC.punto_px, y: st.H / 2 }, arco: { x: 0, y: st.H / 2 }, am: st.bal.mundo.arco_medio, defensores: [],
    arquero: { x: 4, y: st.H / 2, seTira: 0, nivel } });
  const res = Fr.resolver(foto, dec, { tiro: (t.stats && t.stats.tiro) || 55, aguanteFrac: 1 }, C, rng);
  const pn = Pn.resolver({ u: res.fin.u, h: res.fin.h, fuera: res.resultado === "afuera", palo: res.resultado === "palo", tipo: C.tipos[dec.tipo], dir: buena ? dec.pista.dir : "medio", nivel }, PC, rng);
  return pn.resultado === "gol";
}

function jugar(division, perfil, politica, s, lee) {
  const rng = semilla(s), st = partidoNuevo(division, perfil, rng, lee), buena = politica === "buena";
  const azar = Math.random; Math.random = rng;
  const m = { goles: 0, golesRival: 0, tiros: 0, penales: 0, libres: 0, deJugada: 0 };
  const remate = (res) => {
    m.tiros++;
    if (res.outcome === "gol") { m.goles++; P.golMio(st, st.mios[st.ctrl]); }
    else if (res.outcome === "corner") P.cornerMio(st, rng);
    else P.saqueArquero(st, res.outcome === "atajada" ? "atajada" : "afuera");
  };
  const golDeEllos = () => { m.golesRival++; st.golesRival++; P.kickoff(st, "mia"); };
  /* LA FALTA, como frente_ui.cobrarFalta. true: se cobró y la jugada terminó */
  const falta = (aFavor, infractor, accion, holgura) => {
    const C = st.bal.frente, AR = st.bal.toque.area;
    const sobre = aFavor ? st.mios[st.ctrl] : st.rivales[st.portadorRival];
    if (!sobre || !infractor || infractor.pos === "ARQ") return false;
    const arco = aFavor ? { x: st.W, y: st.H / 2 } : { x: 0, y: st.H / 2 };
    const enArea = Math.abs(arco.x - sobre.x) < AR.largo_px && Math.abs(sobre.y - arco.y) < AR.ancho_medio_px;
    if (enArea && st.bal.penal.acciones.indexOf(accion) < 0) return false;
    const tl = Fr.tiroLibre(sobre.x, sobre.y, arco, C);
    if (C.falta.solo_a_tiro.indexOf(accion) >= 0 && !tl.directo) return false;
    const cans = 1 - Math.max(0, Math.min(1, infractor.aguante / st.bal.aguante.max));
    if (!Fr.hayFalta({ accion, perfil: aFavor ? st._master.perfil : "vos", holgura, cansancio: cans, enArea }, C, rng)) return false;
    st._golDeFalta = aFavor;
    if (enArea) {
      m.penales++;
      if (aFavor) remate(penalMio(st, buena, rng));
      else if (penalRival(st, buena, rng)) golDeEllos();
      else { st.posesion = "mia"; st.modo = "juego"; P.saltoReloj(st); }
      return true;
    }
    if (!tl.directo) return false;
    m.libres++;
    const cand = (aFavor ? st.rivales : st.mios).map((r, i) => ({ ref: i, x: r.x, y: r.y, pos: r.pos })).filter(r => r.pos !== "ARQ");
    const B = Fr.barrera({ x: sobre.x, y: sobre.y }, arco, st.bal.mundo.arco_medio, cand, C, rng);
    if (aFavor) {
      const j = sobre, foto = Fr.foto({ tirador: { x: j.x, y: j.y }, arco, am: st.bal.mundo.arco_medio, defensores: [], barrera: B.jugadores, salta: B.salta,
        arquero: { x: B.arquero.x, y: B.arquero.y, seTira: B.arquero.seTira, nivel: st.rivalKeeperSkill || 50 } });
      const dec = buena ? Object.assign(Fr.elegirCPU(foto, C, rng, 99), { calidad: 0.9 })
        : { mira: { u: 0, h: 0.35 }, tipo: C.menu_libre[0], calidad: Fr.calidadDePerfil(rng(), C) };
      const res = Fr.resolver(foto, dec, { tiro: j.stats.tiro, aguanteFrac: j.aguante / st.bal.aguante.max }, C, rng);
      if (res.resultado !== "al_arco") { remate({ outcome: res.resultado === "desvio" ? "corner" : "afuera" }); return true; }
      const prep = P.prepararRemate(st, null, rng, true);
      remate(Duel.resolveShot({ shotPower: prep.shotPower, keeperSkill: prep.keeperSkill, zone: res.zona, cfg: st.bal.duelo,
        distancia: prep.distancia, especial: prep.especial, tiro: st.bal.tiro, penalizaciones: prep.penalizaciones, rng }));
      return true;
    }
    const t = sobre, arqM = st.mios.find(x => x.pos === "ARQ");
    const foto = Fr.foto({ tirador: { x: t.x, y: t.y }, arco, am: st.bal.mundo.arco_medio, defensores: [], barrera: B.jugadores, salta: B.salta,
      arquero: { x: B.arquero.x, y: B.arquero.y, seTira: B.arquero.seTira, nivel: P.nivelArqueroDe(arqM && arqM.stats) } });
    const res = Fr.resolver(foto, Fr.elegirCPU(foto, C, rng, (t.stats && t.stats.tiro) || 55), { tiro: (t.stats && t.stats.tiro) || 55, aguanteFrac: 1 }, C, rng);
    if (res.resultado === "al_arco" && P.resolverAtajada(st, "atajar", rng, -res.zona.bonus).golRival) m.golesRival++;
    else if (res.resultado !== "al_arco") { st.posesion = "mia"; st.modo = "juego"; P.saltoReloj(st); }
    return true;
  };
  const decidir = (rivalIdx, libre) => {
    const g0 = m.goles;
    decidir2(rivalIdx, libre);
    if (m.goles > g0 && !st._golDeFalta) m.deJugada++;
    st._golDeFalta = false;
  };
  const decidir2 = (rivalIdx, libre) => {
    if (rivalIdx != null && falta(true, st.rivales[rivalIdx], "al_cierre", 0)) return;
    const d = buena ? buenaAtaque(st, rivalIdx, libre) : marcadaAtaque(st, rivalIdx, libre);
    if (d.op === "seguir") { st.modo = "juego"; F.seguir(st); return; }
    if (d.op === "pase") { P.resolverPase(st, d.rec.idx, d.rec.pct, rng); return; }
    if (d.op === "centro") {
      const res = F.resolverCentro(st, d.aereo.idx, d.aereo.pct, rng);
      if (res.win && res.firulete) {
        const prep = F.prepararFirulete(st, res.firulete, rng), FI = st.bal.flujo.firuletes[res.firulete];
        remate(Duel.resolveShot({ shotPower: prep.shotPower, keeperSkill: prep.keeperSkill, zone: { bonus: FI.bonus, fuera: FI.fuera }, cfg: st.bal.duelo,
          distancia: prep.distancia, especial: prep.especial, tiro: st.bal.tiro, penalizaciones: prep.penalizaciones, rng }));
      } else if (res.win && res.toque) remate(deFrente(st, null, buena, rng));
      return;
    }
    if (d.op === "tiro") {
      if (!libre && rivalIdx != null) {
        const r = P.resolverDuelo(st, { accion: "tiro", poder: d.A("tiro").poder, costo: 0, rng });
        if (!r.win && falta(true, st.rivales[rivalIdx], r.accionRival, r.roll - r.chancePct / 100)) return;
        if (!r.win) { P.perderPelota(st, rng); return; }
      }
      remate(deFrente(st, libre ? null : rivalIdx, buena, rng));
      return;
    }
    const a = d.A(d.op), rivalJ = st.rivales[rivalIdx != null ? rivalIdx : st.portadorRival];
    const r = P.resolverDuelo(st, { accion: d.op, poder: a.poder, costo: a.costo, rng });
    if (r.win && falta(true, rivalJ, "al_pasar", r.chancePct / 100 - r.roll)) return;
    if (!r.win && falta(true, rivalJ, r.accionRival, r.roll - r.chancePct / 100)) return;
    if (r.win) P.ganarAtaque(st, d.op, rivalIdx, r); else P.perderPelota(st, rng);
  };
  const defender = () => {
    const a = buena ? buenaDefensa(st) : marcadaDefensa(st);
    const r = P.resolverDuelo(st, { accion: a.id, poder: a.poder, costo: a.costo, rng });
    if (r.win && falta(false, st.mios[st.ctrl], a.id, r.chancePct / 100 - r.roll)) return;
    if (r.win) P.ganarDefensa(st); else P.perderDefensa(st);
  };
  let vueltas = 0, fin = false;
  while (!fin && vueltas++ < 60000) {
    const evs = P.tick(st, BAL.pulso.dt_ms, st.posesion === "mia" ? F.autoInput(st) : null);
    for (const ev of evs) {
      if (ev.tipo === "encuentro") decidir(ev.rivalIdx, false);
      else if (ev.tipo === "encuentroDef") defender();
      /* 25/oct (lote "no se puede jugar"): TE REMATAN como la escena
         (escenas_v9.escenaRemateRival): tus defensores en la línea pueden
         bloquearla y el arquero suma su bonus de nivel, tanque y distancia.
         Antes el piloto lo resolvía sin nada de eso y daba 1,1 goles en contra
         por partido con ELIGE BIEN, contra 0 en la temporada de Rodri. */
      else if (ev.tipo === "rivalTira") {
        const t = st.rivales[ev.rivalIdx != null ? ev.rivalIdx : st.portadorRival], arq = st.mios.find(j => j.pos === "ARQ");
        const lec = Df.remateRivalAuto({ tirador: { x: t.x, y: t.y }, arco: { x: 0, y: st.H / 2 }, defensores: st.mios.filter(j => j.pos !== "ARQ").map(j => ({ x: j.x, y: j.y })),
          arquero: { nivel: P.nivelArqueroDe(arq.stats), aguante: arq.aguante }, aguanteMax: st.bal.aguante.max, cfg: st.bal.definicion, rng });
        if (lec.bloqueado) { P.saltoReloj(st, rng); P.ganarDefensa(st); }
        else if (P.resolverAtajada(st, "atajar", rng, lec.bonusArquero).golRival) m.golesRival++;
      }
      else if (ev.tipo === "entretiempo") P.entretiempo(st);
      else if (ev.tipo === "final") fin = true;
    }
    if (!evs.length && st.modo === "juego") {
      const d = F.chequear(st);
      if (d) { if (d.motivo === "defensa") defender(); else decidir(d.rivalIdx, d.rivalIdx == null); }
    }
  }
  Math.random = azar;
  return m;
}

const N = 40;
function medir(division, politica, lee) {
  const t = { g: 0, e: 0, p: 0, goles: 0, golesRival: 0, deJugada: 0 };
  for (let s = 1; s <= N; s++) {
    const m = jugar(division, Ma.PERFILES[s % Ma.PERFILES.length], politica, 7000 + s, lee);
    t.goles += m.goles; t.golesRival += m.golesRival; t.deJugada += m.deJugada;
    if (m.goles > m.golesRival) t.g++; else if (m.goles === m.golesRival) t.e++; else t.p++;
  }
  return { gana: Math.round(t.g / N * 100), empata: Math.round(t.e / N * 100), pierde: Math.round(t.p / N * 100),
    puntos: (3 * t.g + t.e) / N, gf: t.goles / N, gc: t.golesRival / N, deJugada: t.deJugada / N };
}
const txt = o => o.gana + "/" + o.empata + "/" + o.pierde + "% (" + o.gf.toFixed(2) + " a " + o.gc.toFixed(2) + ", " + o.puntos.toFixed(2) + " pts, de jugada " + o.deJugada.toFixed(2) + ")";
/* ---------- 1) LA LECTURA, pieza por pieza ---------- */
{
  const st = partidoNuevo(Ma.DIVISIONES[0], Ma.PERFILES[3], semilla(1), true);
  st.posesion = "mia";
  const cpu = st.bal.partido.cpu_pesos;
  assert(P.repeticion(st, "ataque") === null && P.pesosCPU(st) === cpu, "[1] sin duelos no hay nada leído y la CPU marca con sus pesos");
  for (let i = 0; i < 4; i++) P.resolverDuelo(st, { accion: "gambeta", poder: 60, costo: 0, rng: semilla(10 + i) });
  st.posesion = "mia";
  const r = P.repeticion(st, "ataque"), w = P.pesosCPU(st);
  assert(r && r.accion === "gambeta" && Math.abs(r.k - st.bal.partido.lee_repeticion.peso_max) < 1e-9, "[1] cuatro gambetas seguidas: te leen la gambeta con todo (" + (r && r.k.toFixed(2)) + ")");
  let leida = null;
  for (let i = 0; i < 40 && !leida; i++) { st.posesion = "mia"; const d = P.resolverDuelo(st, { accion: "gambeta", poder: 60, costo: 0, rng: semilla(200 + i) }); if (d.matriz === "leyeron") leida = d; }
  assert(leida && leida.repetida === true, "[1] el duelo que perdés por repetir lo dice (repetida)");
  assert(/res\.repetida \? "te leyeron: venís haciendo siempre lo mismo"/.test(fs.readFileSync(path.join(RAIZ, "scenes", "escenas_v9.js"), "utf8")), "[1] y la escena lo cuenta: te leyeron, venís haciendo siempre lo mismo");
  assert(w.quite > cpu.quite + 0.3 && Math.abs(w.quite + w.corte + w.bloqueo - 1) < 1e-9, "[1] y la CPU se corre al QUITE (" + cpu.quite + " a " + w.quite.toFixed(2) + ")");
  ["pared", "tiro", "gambeta", "pared", "tiro"].forEach((a, i) => { st.posesion = "mia"; P.resolverDuelo(st, { accion: a, poder: 60, costo: 0, rng: semilla(30 + i) }); });
  st.posesion = "mia";
  assert(P.repeticion(st, "ataque") === null, "[1] si variás, se olvidan y vuelven a sus pesos");
  const sd = partidoNuevo(Ma.DIVISIONES[0], Ma.PERFILES[3], semilla(2), true);
  sd.posesion = "rival";
  for (let i = 0; i < 4; i++) { sd.posesion = "rival"; P.resolverDuelo(sd, { accion: "quite", poder: 60, costo: 0, rng: semilla(50 + i) }); }
  const rd = P.repeticion(sd, "defensa");
  let gam = 0;
  for (let i = 0; i < 600; i++) { sd.posesion = "rival"; if (P.resolverDuelo(sd, { accion: "corte", poder: 60, costo: 0, rng: semilla(100 + i) }).accionRival === "gambeta") gam++; sd.repeticion.defensa = { quite: 4 }; }
  assert(rd && rd.accion === "quite" && gam / 600 < 0.25, "[1] siempre QUITE: la CPU casi no te encara con gambeta (" + Math.round(gam / 6) + "% en vez de 33%)");
  const so = partidoNuevo(Ma.DIVISIONES[0], Ma.PERFILES[3], semilla(1), false);
  for (let i = 0; i < 4; i++) { so.posesion = "mia"; P.resolverDuelo(so, { accion: "gambeta", poder: 60, costo: 0, rng: semilla(10 + i) }); }
  assert(!so.repeticion && P.repeticion(so, "ataque") === null, "[1] con la perilla apagada no se anota nada");
}

/* ---------- 2) LA MEDICIÓN ---------- */
const filas = [];
Ma.DIVISIONES.forEach(div => {
  const antes = { marcada: medir(div, "marcada", false), buena: medir(div, "buena", false) };
  const despues = { marcada: medir(div, "marcada", true), buena: medir(div, "buena", true) };
  console.log("MEDIDA " + div.n + " · ANTES: ENTER SIEMPRE " + txt(antes.marcada) + ", ELIGE BIEN " + txt(antes.buena)
    + " · DESPUÉS: ENTER SIEMPRE " + txt(despues.marcada) + ", ELIGE BIEN " + txt(despues.buena));
  filas.push({ n: div.n, antes, despues });
});
filas.forEach(({ n, antes, despues }) => {
  assert(despues.marcada.deJugada === 0, "[2] " + n + ": apretando ENTER no se hace un gol de jugada (" + despues.marcada.deJugada.toFixed(2) + " por partido)");
  assert(despues.marcada.gana <= 20, "[2] " + n + ": apretando ENTER se gana a lo sumo uno de cada cinco, y solo de penal o tiro libre (" + despues.marcada.gana + "%)");
  assert(despues.marcada.puntos * 3 <= despues.buena.puntos, "[2] " + n + ": ENTER SIEMPRE suma menos de un tercio que ELIGE BIEN (" + despues.marcada.puntos.toFixed(2) + " contra " + despues.buena.puntos.toFixed(2) + ")");
  assert(despues.marcada.puntos <= antes.marcada.puntos, "[2] " + n + ": con la lectura, ENTER SIEMPRE no suma más que antes");
  assert(despues.buena.puntos >= antes.buena.puntos - 0.1, "[2] " + n + ": la lectura no castiga al que varía (" + antes.buena.puntos.toFixed(2) + " a " + despues.buena.puntos.toFixed(2) + ")");
});
const suma = k => filas.reduce((a, f) => a + f[k].marcada.puntos, 0);
assert(suma("despues") < suma("antes"), "[2] la lectura le saca puntos a ENTER SIEMPRE (" + (suma("antes") / 5).toFixed(2) + " a " + (suma("despues") / 5).toFixed(2) + " por partido)");

console.log((mal ? "✗" : "✓") + " enter_siempre: " + ok + " ok, " + mal + " mal");
process.exit(mal ? 1 : 0);
