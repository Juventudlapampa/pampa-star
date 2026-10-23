/* PAMPA STAR · test de QUE EL PARTIDO FLUYA (logic/flujo.js, balance.flujo)
   Pedido de Rodri del 23/oct: "que fluya más en vez de correr con el cursor;
   que sea mucho de decisiones de pasarla, de hacer alguna cosita loca para dar
   pase al aire y que el otro tire firuletes".
   Primero el contrato de cada pieza; después la MEDICIÓN: partidos enteros con
   un piloto, antes (arrastra al arco y decide solo en los cruces) y después
   (auto-avance y decisiones del flujo). Imprime los números.
   node phaser/test/flujo.test.js */
"use strict";
const path = require("path");
const fs = require("fs");
const P = require(path.join(__dirname, "..", "logic", "partido.js"));
const F = require(path.join(__dirname, "..", "logic", "flujo.js"));
const Duel = require(path.join(__dirname, "..", "logic", "duel.js"));
const Fr = require(path.join(__dirname, "..", "logic", "frente.js"));

let ok = 0, mal = 0;
function assert(cond, msg) { if (cond) ok++; else { mal++; console.error("✗ " + msg); } }

const BAL = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "balance.json"), "utf8"));
assert(BAL.flujo && BAL.flujo.activo === true, "balance.flujo existe y viene prendido (pedido del 23/oct)");

function semilla(s) {
  let a = s >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function balCon(activo) {
  const b = JSON.parse(JSON.stringify(BAL));
  b.flujo.activo = activo;
  b.tempo.minutos_por_momento = b.tempo.dos.presets.corto;
  return b;
}
function partidoNuevo(bal, rng) {
  const mk = (pos, i, x, y) => ({ nombre: "J" + pos + i, pos, numero: i + 1, x, y, aguante: 1000,
    stats: { pase: 55 + Math.floor(rng() * 20), tiro: 55 + Math.floor(rng() * 20), gambeta: 50 + Math.floor(rng() * 25), aereo: 50 + Math.floor(rng() * 25), quite: 60, velocidad: 60, fisico: 60 } });
  const mios = [], rivales = [];
  [["ARQ", 30], ["DEF", 190], ["DEF", 190], ["DEF", 190], ["DEF", 190], ["VOL", 460], ["VOL", 460], ["VOL", 460], ["ATA", 730], ["ATA", 730], ["ATA", 730]].forEach(([pos, ax], i) => {
    mios.push(mk(pos, i, ax, 100 + (i % 5) * 110));
    rivales.push(mk(pos, i, 1050 - ax, 100 + (i % 5) * 110));
  });
  const st = P.crearPartido({ bal, mios, rivales, rng });
  st.mios.forEach((j, i) => { j.esVos = i === 8; });
  return st;
}

/* ---------- 1) EL AUTO-AVANCE ---------- */
{
  const bal = balCon(true), st = partidoNuevo(bal, semilla(1));
  st.posesion = "mia"; st.modo = "juego";
  const c = st.mios[st.ctrl];
  c.x = 400; c.y = 340;
  st.rivales.forEach(r => { if (r.pos !== "ARQ") { r.x = 1000; r.y = 40; } });
  const r0 = st.rivales.find(r => r.pos !== "ARQ");
  r0.x = 480; r0.y = 340;   // uno parado en el medio, adelante
  const inp = F.autoInput(st);
  assert(inp && inp.dx === 1, "con la pelota y sin tocar nada, avanza hacia el arco rival");
  const y = F.elegirCarril(st);
  assert(Math.abs(y - 340) > 60, "esquiva el carril que tapa el rival de adelante (eligió y " + Math.round(y) + ")");
  const x0 = c.x;
  for (let k = 0; k < 6; k++) P.tick(st, bal.pulso.dt_ms, F.autoInput(st));
  assert(c.x > x0 + 40, "en seis latidos avanzó solo (" + Math.round(c.x - x0) + " px)");
  F.fijarCarril(st, 600);
  assert(F.elegirCarril(st) === 600, "tocar el mapa fija el carril");
  c.x = st.W - bal.flujo.frena_px + 5; c.y = F.elegirCarril(st);
  const fr = F.autoInput(st);
  assert(!fr || fr.dx === 0, "a frena_px del fondo deja de avanzar");
  const apagado = balCon(false), st2 = partidoNuevo(apagado, semilla(1));
  st2.posesion = "mia"; st2.modo = "juego";
  assert(F.autoInput(st2) === null && F.chequear(st2) === null, "con flujo.activo false no hay auto-avance ni decisiones");
}

/* ---------- 2) LA DECISIÓN ---------- */
{
  const bal = balCon(true), st = partidoNuevo(bal, semilla(2)), FL = bal.flujo;
  st.posesion = "mia"; st.modo = "juego";
  st.rivales.forEach(r => { r.x = 1040; r.y = 20; });
  F.chequear(st);   // arranca la cuenta
  let d = null, t0 = st._t;
  while (!d && st._t - t0 < 20000) { st._t += 100; d = F.chequear(st); }
  assert(d && d.motivo === "tiempo", "sin nadie cerca, la decisión llega por tiempo");
  assert(st._t - t0 >= FL.cada_ms && st._t - t0 <= FL.cada_ms + 100, "a cada_ms (" + (st._t - t0) + " ms)");
  assert(st.modo === "congelado", "al decidir, el partido se congela");
  st.modo = "juego";
  const c = st.mios[st.ctrl], r = st.rivales[3];
  r.x = c.x + FL.radio_aviso - 10; r.y = c.y;
  st._t += 100;
  assert(F.chequear(st) === null, "nunca antes de min_ms de la anterior");
  st._t += FL.min_ms;
  const dr = F.chequear(st);
  assert(dr && dr.motivo === "rival" && dr.rivalIdx === 3, "un rival a menos de radio_aviso abre la decisión con él");
  st.modo = "juego";
  r.x = 1040; r.y = 20;
  st.ctrl = st.mios.findIndex((j, i) => i !== st.ctrl && j.pos === "VOL");
  st._t += 100; F.chequear(st);
  st._t += FL.recibe_ms;
  const drec = F.chequear(st);
  assert(drec && drec.motivo === "recibe", "al recibir un pase decide enseguida (recibe_ms), aunque no pasó min_ms");
}

/* ---------- 2b) CON LA PELOTA DEL RIVAL (revisión final del 23/oct) ----------
   Medido en el teléfono: ratos de 7 s de mediana y 10,4 s de máximo con la
   pelota de ellos sin que pasara nada. Si nadie le salió en defensa.cada_ms,
   le sale el tuyo más cerca de los que están entre el portador y tu arco */
{
  const bal = balCon(true), st = partidoNuevo(bal, semilla(4));
  const D = bal.flujo.defensa;
  st.posesion = "rival"; st.modo = "juego"; st.portadorRival = 8; st.esperaRival = 0; st.cooldown = 9e9;
  const pr = st.rivales[8];
  pr.x = 600; pr.y = 340;
  st.mios.forEach(j => { if (j.pos !== "ARQ") { j.x = 900; j.y = 40; } });
  const cerca = st.mios[6]; cerca.x = 470; cerca.y = 300;
  const lejos = st.mios[2]; lejos.x = 300; lejos.y = 340;
  assert(F.chequear(st) === null, "al cambiar de dueño no decide en el acto");
  const t0 = st._t;
  let d = null;
  while (!d && st._t - t0 < D.cada_ms + 1000) { st._t += 100; d = F.chequear(st); }
  assert(d && d.motivo === "defensa" && d.rivalIdx === 8, "si nadie le salió, a cada_ms se abre la cruz de defensa");
  assert(st._t - t0 >= D.cada_ms && st._t - t0 <= D.cada_ms + 100, "a defensa.cada_ms (" + (st._t - t0) + " ms)");
  assert(st.ctrl === 6 && Math.abs(st.mios[6].x - (pr.x - bal.ritmo.radio_encuentro * 0.8)) < 1 && st.modo === "congelado", "sale el más cerca de los que están adelante del portador, y se congela");
  st._crucesDef = D.tope; st.modo = "juego"; st._t += D.cada_ms * 2;
  assert(F.chequear(st) === null, "con el tope de cruces de esa pelota, no sale nadie más");
  const st2 = partidoNuevo(balCon(true), semilla(4));
  st2.bal.flujo.defensa.activo = false; st2.posesion = "rival"; st2.modo = "juego";
  F.chequear(st2); st2._t += D.cada_ms * 3;
  assert(F.chequear(st2) === null, "con defensa.activo false, como antes");
  const st3 = partidoNuevo(balCon(true), semilla(5));
  st3.posesion = "rival"; st3.modo = "juego"; F.chequear(st3);
  st3.posesion = "mia"; F.chequear(st3);
  const t3 = st3._t;
  let d3 = null;
  while (!d3 && st3._t - t3 < 6000) { st3._t += 100; d3 = F.chequear(st3); }
  assert(d3 && d3.motivo === "recibe" && st3._t - t3 <= D.recupera_ms + 100, "la que recuperás se decide a recupera_ms, como un pase recibido");
}

/* ---------- 3) EL CENTRO Y LOS FIRULETES ---------- */
{
  const bal = balCon(true), st = partidoNuevo(bal, semilla(3));
  const rng = semilla(9);
  const j = { stats: { aereo: 80, gambeta: 80 } };
  const vistos = {};
  for (let k = 0; k < 200; k++) {
    const caida = { h: 0.4 + (k % 25) * 0.1, lado: ["atras", "costado", "fondo"][k % 3] };
    vistos[F.firuleteDe(st, caida, j, rng)] = true;
  }
  ["chilena", "cabezazo", "volea", "taco", "palomita"].forEach(id => assert(vistos[id], "el firulete " + id + " sale según dónde le cae"));
  const flojo = { stats: { aereo: 40, gambeta: 40 } };
  let chilenaFloja = false, tacoFlojo = false;
  for (let k = 0; k < 100; k++) {
    const f = F.firuleteDe(st, { h: k % 2 ? 2.4 : 0.6, lado: "costado" }, flojo, rng);
    if (f === "chilena") chilenaFloja = true;
    if (f === "taco") tacoFlojo = true;
  }
  assert(!chilenaFloja && !tacoFlojo, "sin juego aéreo no hay chilena y sin gambeta no hay taco");

  st.posesion = "mia"; st.modo = "juego";
  const pas = st.mios[st.ctrl];
  pas.x = 820; pas.y = 80;
  const vos = st.mios.find(x => x.esVos);
  vos.x = st.W - 120; vos.y = st.H / 2;
  st.rivales.forEach(r => { if (r.pos !== "ARQ") { r.x = 300; r.y = 600; } });
  const rec = F.receptorAereo(st);
  assert(rec && st.mios[rec.idx].esVos && rec.zona, "el centro busca al que está en la zona de remate (VOS)");
  const res = F.resolverCentro(st, rec.idx, 100, semilla(4));
  assert(res.win && res.toque === "cerca", "si la recibe VOS juega EL TOQUE con el origen de donde viene (" + res.toque + ")");
  assert(P.pelotaAltaVigente(st), "el centro llega alto");
  const compa = st.mios.find(x => !x.esVos && x !== pas && x.pos !== "ARQ");
  st.ctrl = st.mios.indexOf(pas); vos.x = 300;
  compa.x = st.W - 110; compa.y = st.H / 2 + 30;
  const rc = F.receptorAereo(st);
  const res2 = F.resolverCentro(st, rc.idx, 100, semilla(5));
  assert(res2.win && res2.firulete && !res2.toque, "si la recibe un compañero, hace su firulete (" + res2.firulete + ")");
  const ag0 = st.mios[st.ctrl].aguante;
  const prep = F.prepararFirulete(st, res2.firulete, semilla(6));
  assert(prep.shotPower > 20 && st.mios[st.ctrl].aguante < ag0, "el firulete tiene poder y gasta aguante");
  const ant = st.minuto; P.saltoReloj(st, null, bal.flujo.reloj.pase);
  assert(Math.abs(st.minuto - ant - bal.tempo.minutos_por_momento * bal.flujo.reloj.pase) < 1e-9, "el pase gasta flujo.reloj.pase del momento");
}

/* ---------- 4) LA MEDICIÓN: partidos enteros, antes y después ---------- */
const LATIDO = BAL.pulso.latido_ms, DT = BAL.pulso.dt_ms;
const ESCENA_MS = 3200;   // lo que tarda en promedio elegir y ver la jugada
function jugar(activo, s) {
  const rng = semilla(s), bal = balCon(activo), st = partidoNuevo(bal, rng);
  const azar = Math.random; Math.random = rng;
  const m = { decisiones: 0, libreMs: 0, gaps: [], gapsConPelota: [], jugadas: 0, conPase: 0, conCentro: 0, conAlguno: 0, pases: 0, centros: 0, goles: 0, golesRival: 0, firuletes: {}, toques: 0, real: 0, gapsRival: [], faltasTiro: 0, ocasionesTiro: 0 };
  let desdeAlgo = 0, desdeDecConPelota = 0, desdeRival = 0, jug = null;
  const algo = () => { m.gaps.push(desdeAlgo); desdeAlgo = 0; if (desdeRival) { m.gapsRival.push(desdeRival); desdeRival = 0; } };
  const cierraJugada = () => { if (jug) { m.jugadas++; if (jug.pase) m.conPase++; if (jug.centro) m.conCentro++; if (jug.pase || jug.centro) m.conAlguno++; } jug = null; };
  const remate = (prep) => {
    const res = Duel.resolveShot({ shotPower: prep.shotPower, keeperSkill: prep.keeperSkill, zone: { bonus: 0, fuera: 0.1 }, cfg: bal.duelo,
      distancia: prep.distancia, especial: prep.especial, tiro: bal.tiro, penalizaciones: prep.penalizaciones, rng });
    cierraJugada();
    if (res.outcome === "gol") { m.goles++; m.real += 4000; P.golMio(st, st.mios[st.ctrl]); }
    else if (res.outcome === "corner") P.cornerMio(st, rng);
    else P.saqueArquero(st, res.outcome === "atajada" ? "atajada" : "afuera");
  };
  /* LA FALTA A FAVOR, como frente_ui.js cobrarFalta: la del quite o el
     bloqueo que te la saca y (revisión final del 23/oct) la del que quedó
     pagando a tiro del arco. Cuenta los tiros libres directos */
  const falta = (accion, holgura) => {
    const c2 = st.mios[st.ctrl], arco = { x: st.W, y: st.H / 2 }, AR = bal.toque.area;
    const enArea = st.W - c2.x < AR.largo_px && Math.abs(c2.y - arco.y) < AR.ancho_medio_px;
    const directo = Fr.tiroLibre(c2.x, c2.y, arco, bal.frente).directo;
    if (bal.frente.falta.solo_a_tiro.indexOf(accion) >= 0 && !directo) return false;
    if (directo && !enArea) m.ocasionesTiro++;
    if (!Fr.hayFalta({ accion, perfil: "otro", holgura, cansancio: 0, enArea }, bal.frente, rng)) return false;
    if (!directo) return false;   // se juega rápido: sigue la jugada
    m.faltasTiro++; m.real += ESCENA_MS;
    remate(P.prepararRemate(st, false, rng));
    return true;
  };
  const decidir = (rivalIdx, libre) => {
    m.decisiones++; m.real += ESCENA_MS;
    if (st.posesion === "mia") { m.gapsConPelota.push(desdeDecConPelota); desdeDecConPelota = 0; }
    algo();
    if (rivalIdx != null && falta("al_cierre", 0)) return;
    const c = st.mios[st.ctrl], acc = P.accionesAtaque(st);
    const A = id => acc.find(a => a.id === id);
    const ops = [];
    if (P.puedeTirar(st) && !A("tiro").bloqueada) ops.push(["tiro", st.W - c.x < 300 ? 5 : 1]);
    const ra = activo ? F.receptorAereo(st) : null;
    if (ra) ops.push(["centro", ra.zona ? 3 : 1]);
    const rs = P.receptoresPase(st);
    if (rs.length) ops.push(["pase", 3]);
    if (rivalIdx != null && !A("gambeta").bloqueada) ops.push(["gambeta", 3]);
    if (rivalIdx != null && !A("pared").bloqueada) ops.push(["pared", 1]);
    if (libre) ops.push(["seguir", 2]);
    const tot = ops.reduce((a, o) => a + o[1], 0);
    let r = rng() * tot, op = ops.length ? ops[ops.length - 1][0] : "seguir";
    for (const o of ops) { if (r < o[1]) { op = o[0]; break; } r -= o[1]; }
    if (op === "seguir") { st.modo = "juego"; F.seguir(st); return; }
    if (op === "pase") {
      m.pases++; if (jug) jug.pase = true;
      P.resolverPase(st, rs[0].idx, rs[0].pct, rng);
      return;
    }
    if (op === "centro") {
      m.centros++; if (jug) jug.centro = true;
      const res = F.resolverCentro(st, ra.idx, ra.pct, rng);
      if (res.win && res.firulete) { m.firuletes[res.firulete] = (m.firuletes[res.firulete] || 0) + 1; remate(F.prepararFirulete(st, res.firulete, rng)); }
      else if (res.win && res.toque) { m.toques++; remate(P.prepararRemate(st, false, rng)); }
      return;
    }
    if (op === "tiro") {
      if (rivalIdx != null) {
        const d = P.resolverDuelo(st, { accion: "tiro", poder: A("tiro").poder, costo: 0, rng });
        if (!d.win && falta(d.accionRival, d.roll - d.chancePct / 100)) return;
        if (!d.win) { P.perderPelota(st, rng); return; }
      }
      remate(P.prepararRemate(st, false, rng));
      return;
    }
    const a = A(op);
    const d = P.resolverDuelo(st, { accion: op, poder: a.poder, costo: a.costo, rng });
    if (falta(d.win ? "al_pasar" : d.accionRival, d.win ? d.chancePct / 100 - d.roll : d.roll - d.chancePct / 100)) return;
    if (d.win) P.ganarAtaque(st, op, rivalIdx, d); else P.perderPelota(st, rng);
  };
  const defender = () => {
    algo(); m.real += ESCENA_MS;
    const accion = ["quite", "corte", "bloqueo"][Math.floor(rng() * 3)];
    const a = P.accionesDefensa(st).find(x => x.id === accion);
    const d = P.resolverDuelo(st, { accion, poder: a.poder, costo: a.costo, rng });
    if (d.win) P.ganarDefensa(st); else P.perderDefensa(st);
  };
  let vueltas = 0, fin = false;
  while (!fin && vueltas++ < 40000) {
    if (st.posesion === "mia" && !jug) { jug = { pase: false, centro: false }; desdeDecConPelota = 0; }
    if (st.posesion !== "mia") cierraJugada();
    let input = null;
    if (st.posesion === "mia") input = activo ? F.autoInput(st) : { dx: 1, dy: 0 };
    const evs = P.tick(st, DT, input);
    m.libreMs += LATIDO; m.real += LATIDO; desdeAlgo += LATIDO;
    if (st.posesion !== "mia") desdeRival += LATIDO;
    if (st.posesion === "mia") desdeDecConPelota += LATIDO;
    for (const ev of evs) {
      if (ev.tipo === "encuentro") decidir(ev.rivalIdx, false);
      else if (ev.tipo === "encuentroDef") defender();
      else if (ev.tipo === "rivalTira") {
        algo(); m.real += ESCENA_MS;
        const r = P.resolverAtajada(st, rng() < 0.5 ? "atajar" : "despejar", rng);
        if (r.golRival) m.golesRival++;
      } else if (ev.tipo === "entretiempo") P.entretiempo(st);
      else if (ev.tipo === "final") fin = true;
    }
    if (!evs.length && st.modo === "juego") {
      if (activo) { const d = F.chequear(st); if (d) { if (d.motivo === "defensa") defender(); else decidir(d.rivalIdx, d.rivalIdx == null); } }
      else if (st.posesion === "mia" && P.puedeTirar(st) && st.W - st.mios[st.ctrl].x < 260) decidir(null, true);
    }
  }
  cierraJugada();
  Math.random = azar;
  return m;
}
function medir(activo) {
  const tot = { decisiones: 0, libreMs: 0, gaps: [], gapsConPelota: [], jugadas: 0, conPase: 0, conCentro: 0, conAlguno: 0, goles: 0, golesRival: 0, firuletes: {}, toques: 0, real: 0, n: 0, gapsRival: [], faltasTiro: 0, ocasionesTiro: 0 };
  for (let s = 1; s <= 12; s++) {
    const m = jugar(activo, 1000 + s);
    tot.n++;
    ["decisiones", "libreMs", "jugadas", "conPase", "conCentro", "conAlguno", "goles", "golesRival", "toques", "real", "faltasTiro", "ocasionesTiro"].forEach(k => { tot[k] += m[k]; });
    tot.gaps.push(...m.gaps); tot.gapsConPelota.push(...m.gapsConPelota); tot.gapsRival.push(...m.gapsRival);
    Object.keys(m.firuletes).forEach(k => { tot.firuletes[k] = (tot.firuletes[k] || 0) + m.firuletes[k]; });
  }
  const orden = a => a.slice().sort((x, y) => x - y);
  const g = orden(tot.gaps), gp = orden(tot.gapsConPelota), gr = orden(tot.gapsRival);
  const prom = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
  return {
    porMin: tot.decisiones / (tot.libreMs / 60000),
    cadaSeg: prom(gp) / 1000,
    maxQuieto: g[g.length - 1] / 1000, maxConPelota: gp[gp.length - 1] / 1000, p90Quieto: g[Math.floor(g.length * 0.9)] / 1000,
    pase: Math.round(tot.conPase / tot.jugadas * 100), alguno: Math.round(tot.conAlguno / tot.jugadas * 100), centro: Math.round(tot.conCentro / tot.jugadas * 100),
    decisiones: tot.decisiones / tot.n, goles: tot.goles / tot.n, golesRival: tot.golesRival / tot.n,
    minutos: tot.real / tot.n / 60000, firuletes: tot.firuletes, toques: tot.toques,
    medRival: gr[Math.floor(gr.length / 2)] / 1000, maxRival: gr[gr.length - 1] / 1000,
    faltasTiro: tot.faltasTiro / tot.n, ocasionesTiro: tot.ocasionesTiro / tot.n,
    firuletesPorPartido: Object.keys(tot.firuletes).reduce((a, k) => a + tot.firuletes[k], 0) / tot.n
  };
}
const antes = medir(false), despues = medir(true);
const linea = (n, m) => console.log("MEDIDA " + n + ": " + m.porMin.toFixed(1) + " decisiones por minuto de juego · una cada " + m.cadaSeg.toFixed(1)
  + " s con la pelota (lo más largo con la pelota sin decidir " + m.maxConPelota.toFixed(1) + " s) · lo más largo sin que pase nada " + m.maxQuieto.toFixed(1) + " s (p90 " + m.p90Quieto.toFixed(1) + " s) · jugadas con pase "
  + m.pase + "%, con centro " + m.centro + "%, con alguno de los dos " + m.alguno + "% · " + m.decisiones.toFixed(1) + " decisiones y " + m.goles.toFixed(2) + " a " + m.golesRival.toFixed(2)
  + " por partido · unos " + m.minutos.toFixed(1) + " min" + (m.toques ? " · firuletes " + JSON.stringify(m.firuletes) + ", toques " + m.toques : "")
  + " · con la pelota del rival, sin que pase nada: mediana " + m.medRival.toFixed(1) + " s, máximo " + m.maxRival.toFixed(1) + " s"
  + " · tiros libres a tiro por partido " + m.faltasTiro.toFixed(2) + " (de " + m.ocasionesTiro.toFixed(1) + " duelos a tiro)");
linea("ANTES", antes); linea("DESPUÉS", despues);
assert(despues.cadaSeg >= 3 && despues.cadaSeg <= 5, "con la pelota, una decisión cada 3 a 5 s de juego (" + despues.cadaSeg.toFixed(1) + ")");
const topeReal = (BAL.flujo.cada_ms * LATIDO / DT + 2 * LATIDO) / 1000;
assert(despues.maxConPelota <= topeReal, "con la pelota nunca pasan más de cada_ms sin decidir (" + despues.maxConPelota.toFixed(1) + " s, tope " + topeReal.toFixed(1) + ")");
assert(despues.alguno > antes.alguno, "más jugadas con pase o centro (" + antes.alguno + "% → " + despues.alguno + "%)");
assert(despues.centro > 0 && Object.keys(despues.firuletes).length >= 3, "hay centros y firuletes de varios tipos");
assert(despues.minutos > antes.minutos * 0.8 && despues.minutos < 6, "el partido CORTO no se acorta de más ni se estira (" + despues.minutos.toFixed(1) + " min)");
/* revisión final del 23/oct */
assert(despues.maxRival < antes.maxRival * 0.6 && despues.medRival < antes.medRival * 0.7,
  "con la pelota del rival se destraba (mediana " + antes.medRival.toFixed(1) + " → " + despues.medRival.toFixed(1) + " s, máximo " + antes.maxRival.toFixed(1) + " → " + despues.maxRival.toFixed(1) + " s)");
assert(despues.faltasTiro >= 0.4, "SÍNTOMA: tu tiro libre directo casi no sale (" + despues.faltasTiro.toFixed(2) + " por partido)");

console.log((mal ? "✗" : "✓") + " flujo: " + ok + " ok, " + mal + " mal");
process.exit(mal ? 1 : 0);
