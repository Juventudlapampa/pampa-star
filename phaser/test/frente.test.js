/* PAMPA STAR · test de EL TIRO DE FRENTE AL ARCO y EL TIRO LIBRE (pedido de
   Rodri del 23/oct). La geometría manda: el defensor en la línea la tapa, el
   arquero cerca del punto la ataja, la barrera se salta por arriba o se pasa
   por abajo. Leyendo bien se gana seguido y al azar poco.
   node phaser/test/frente.test.js */
"use strict";
const path = require("path");
const fs = require("fs");
const F = require(path.join(__dirname, "..", "logic", "frente.js"));
const Duel = require(path.join(__dirname, "..", "logic", "duel.js"));
const BAL = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "balance.json"), "utf8"));
const C = BAL.frente, W = BAL.mundo.ancho, H = BAL.mundo.alto, AM = BAL.mundo.arco_medio;

let ok = 0, mal = 0;
function assert(cond, msg) { if (cond) ok++; else { mal++; console.error("✗ " + msg); } }
function gauss(r) { return Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r()); }
const ARCO = { x: W, y: H / 2 };

/* [1] el marco: la derecha de quien patea es u positivo, ataque de los dos lados */
{
  const m = F.marco({ x: W - 200, y: H / 2 }, ARCO, AM);
  const p = F.puntoDeArco(m, 1);
  assert(p.y > H / 2 && F.local(m, p).u > 0, "[1] atacando a la derecha, u=+1 queda a la derecha de quien patea");
  const m2 = F.marco({ x: 200, y: H / 2 }, { x: 0, y: H / 2 }, AM);
  assert(F.local(m2, F.puntoDeArco(m2, 1)).u > 0 && F.puntoDeArco(m2, 1).y < H / 2, "[1] atacando a la izquierda, también");
  assert(Math.abs(F.uDe(m, p.y) - 1) < 1e-9, "[1] uDe deshace puntoDeArco");
  console.log("[1] el marco de quien patea");
}

/* [2] el defensor parado en la línea la tapa; apuntando al otro palo, no */
{
  const S = { x: W - 220, y: H / 2 };
  const m = F.marco(S, ARCO, AM), T = F.puntoDeArco(m, 0.8);
  const def = { ref: 4, nombre: "DYLAN", numero: 4, x: S.x + (T.x - S.x) * 0.4, y: S.y + (T.y - S.y) * 0.4 };
  const foto = F.foto({ tirador: S, arco: ARCO, am: AM, defensores: [def], arquero: { x: W - 4, y: H / 2, nivel: 55 } });
  const a = F.leer(foto, { u: 0.8, h: 0.3 }, "colocado", C);
  assert(a.tapa && a.tapa.ref === 4, "[2] el 4 en la línea la tapa");
  const b = F.leer(foto, { u: -0.8, h: 0.3 }, "colocado", C);
  assert(!b.tapa, "[2] al otro palo no la tapa nadie");
  const c = F.leer(foto, { u: 0.8, h: 1.0 }, "fuerte", C);
  const enDef = F.trayectoria(m, { u: 0.8, h: 1.0 }, C.tipos.fuerte)(0.4).z;
  assert(enDef < C.alcance_defensor ? !!c.tapa : !c.tapa, "[2] la que pasa por arriba de su alcance no la toca");
  /* CON EFECTO la abre: la curva rodea al que está en la recta */
  const d = F.leer(foto, { u: 0.8, h: 0.3 }, "efecto", C);
  assert(!d.tapa, "[2] con efecto la abre y lo rodea");
  /* resolver: con el 4 en la línea, lo que sale es bloqueo o desvío casi siempre */
  const r = F.rng(7); let tapadas = 0;
  for (let i = 0; i < 400; i++) {
    const res = F.resolver(foto, { mira: { u: 0.8, h: 0.3 }, tipo: "colocado", calidad: 0.9 }, { tiro: 70, aguanteFrac: 1 }, C, r);
    if (res.resultado === "bloqueo" || res.desviada) tapadas++;
  }
  assert(tapadas / 400 > 0.75, "[2] con el defensor en la línea, " + Math.round(tapadas / 4) + "% bloqueadas o desviadas (más de 75)");
  console.log("[2] el defensor en la línea: " + Math.round(tapadas / 4) + "% tapadas o desviadas");
}

/* [3] el arquero: encima de él resta, lejos suma */
{
  const S = { x: W - 150, y: H / 2 };
  const foto = F.foto({ tirador: S, arco: ARCO, am: AM, defensores: [], arquero: { x: W - 4, y: H / 2 - 0.5 * AM, nivel: 55 } });
  const cerca = F.leer(foto, { u: -0.5, h: 0.3 }, "colocado", C), lejos = F.leer(foto, { u: 0.85, h: 0.3 }, "colocado", C);
  assert(cerca.margen < 0 && lejos.margen > 0, "[3] al lado del arquero el margen es negativo y al otro palo positivo");
  const nivel = n => F.leer(F.foto({ tirador: S, arco: ARCO, am: AM, defensores: [], arquero: { x: W - 4, y: H / 2, nivel: n } }), { u: 0.6, h: 0.3 }, "colocado", C).margen;
  assert(nivel(88) < nivel(40), "[3] el arquero mejor llega más lejos");
  const lejosTiro = F.leer(F.foto({ tirador: { x: W - 330, y: H / 2 }, arco: ARCO, am: AM, defensores: [], arquero: { x: W - 4, y: H / 2, nivel: 55 } }), { u: 0.6, h: 0.3 }, "colocado", C).margen;
  const cercaTiro = F.leer(F.foto({ tirador: { x: W - 90, y: H / 2 }, arco: ARCO, am: AM, defensores: [], arquero: { x: W - 4, y: H / 2, nivel: 55 } }), { u: 0.6, h: 0.3 }, "colocado", C).margen;
  assert(cercaTiro > lejosTiro, "[3] de cerca al arquero no le da el tiempo");
  console.log("[3] el arquero cerca del punto la ataja");
}

/* [4] LEYENDO BIEN SE GANA SEGUIDO Y AL AZAR POCO. Situaciones de partido:
   quien patea en la zona de remate, de 0 a 4 defensores adelante y el
   arquero cerrando el ángulo. El que lee mira la foto y elige; el del azar,
   cualquier hueco, cualquier pegada y el toque cuando cae */
function situacion(r) {
  const S = { x: W - 90 - r() * 240, y: H / 2 + (r() - 0.5) * 300 };
  const defs = [];
  const n = Math.floor(r() * 5);
  for (let k = 0; k < n; k++) {
    const t = 0.15 + r() * 0.7;
    defs.push({ ref: k, nombre: "D" + k, numero: 2 + k, x: S.x + (W - S.x) * t, y: S.y + (H / 2 - S.y) * t + (r() - 0.5) * 70 });
  }
  const arq = { x: W - 6, y: H / 2 + (S.y - H / 2) * 0.18, nivel: 50 };
  return F.foto({ tirador: S, arco: ARCO, am: AM, defensores: defs, arquero: arq });
}
function grillaLector(foto, menu) {
  let mejor = null;
  menu.forEach(tid => {
    for (let u = -0.9; u <= 0.91; u += 0.15) [0.1, 0.5, 0.85].forEach(h => {
      const L = F.leer(foto, { u, h }, tid, C);
      const v = (L.tapa ? -3 : 0) + (L.roza ? -0.6 : 0) + (L.fuera ? -3 : 0) + Math.min(L.margen, 0.35) - Math.max(0, Math.abs(u) - 0.75) * 1.5;
      if (!mejor || v > mejor.v) mejor = { v, tipo: tid, mira: L.mira };
    });
  });
  return mejor;
}
function golDe(foto, res, r, poder) {
  if (res.resultado !== "al_arco") return false;
  return Duel.resolveShot({ shotPower: poder || 66, keeperSkill: 50, zone: res.zona, cfg: BAL.duelo, distancia: foto.m.dist, tiro: BAL.tiro, rng: r }).outcome === "gol";
}
function tanda(n, semilla, jugar, jug) {
  const r = F.rng(semilla); let goles = 0, cuenta = {};
  for (let i = 0; i < n; i++) {
    const foto = situacion(r);
    const dec = jugar(foto, r);
    const res = F.resolver(foto, dec, jug || { tiro: 60, aguanteFrac: 0.8 }, C, r);
    cuenta[res.resultado] = (cuenta[res.resultado] || 0) + 1;
    if (golDe(foto, res, r)) goles++;
  }
  return { pct: goles / n, cuenta };
}
{
  const lector = (foto, r) => { const g = grillaLector(foto, C.menu_remate); return { mira: g.mira, tipo: g.tipo, calidad: F.calidadDePerfil(C.perfil.dulce + gauss(r) * 0.05, C) }; };
  const azar = (foto, r) => ({ mira: { u: (r() - 0.5) * 2.2, h: r() }, tipo: C.menu_remate[Math.floor(r() * 3)], calidad: F.calidadDePerfil(r() < 0.2 ? null : r(), C) });
  const L = tanda(3000, 11, lector), A = tanda(3000, 12, azar);
  assert(L.pct >= 0.5, "[4] leyendo bien se gana seguido: " + Math.round(L.pct * 100) + "% (50 o más)");
  assert(A.pct <= 0.25, "[4] al azar poco: " + Math.round(A.pct * 100) + "% (25 o menos)");
  assert(L.pct - A.pct >= 0.3, "[4] leer vale por lo menos 30 puntos");
  /* el perfil a tiempo vale: el mismo lector tocando cuando cae */
  const tarde = (foto, r) => Object.assign(lector(foto, r), { calidad: F.calidadDePerfil(r() < 0.2 ? null : r(), C) });
  const T = tanda(3000, 11, tarde);
  assert(L.pct > T.pct + 0.04, "[4] perfilarse a tiempo vale: " + Math.round(L.pct * 100) + "% contra " + Math.round(T.pct * 100) + "%");
  console.log("[4] lector " + Math.round(L.pct * 100) + "% · al azar " + Math.round(A.pct * 100) + "% · lector sin perfil " + Math.round(T.pct * 100) + "% · " + JSON.stringify(L.cuenta) + " · " + JSON.stringify(A.cuenta));
}

/* [5] la falta: el club de garra pega más que el de toque, adentro del área no se cobra */
{
  const cuenta = perfil => { const r = F.rng(3); let n = 0; for (let i = 0; i < 4000; i++) if (F.hayFalta({ accion: "quite", perfil, holgura: r() * 0.4 }, C, r)) n++; return n / 4000; };
  const garra = cuenta("garra"), toque = cuenta("toque");
  assert(garra > toque * 1.6, "[5] garra pega más que toque (" + Math.round(garra * 100) + "% contra " + Math.round(toque * 100) + "%)");
  assert(garra < 0.35 && toque > 0.04, "[5] la falta es una cosa de vez en cuando");
  assert(!F.hayFalta({ accion: "quite", perfil: "garra", enArea: true }, C, () => 0), "[5] adentro del área no se cobra");
  assert(!F.hayFalta({ accion: "corte", perfil: "garra" }, C, () => 0), "[5] cortar un pase no es falta");
  const justo = F.hayFalta({ accion: "quite", perfil: "estrella", holgura: 0 }, C, () => 0.15), holgado = F.hayFalta({ accion: "quite", perfil: "estrella", holgura: 0.5 }, C, () => 0.15);
  assert(justo && !holgado, "[5] el quite ganado justo es más falta que el holgado");
  console.log("[5] la falta: garra " + Math.round(garra * 100) + "% de los quites, toque " + Math.round(toque * 100) + "%");
}

/* [6] el tiro libre: cerca, al arco; lejos, rápido. La barrera son los
   reales, a 9 metros, y tapa el palo de su lado */
{
  assert(F.tiroLibre(W - 220, H / 2 + 60, ARCO, C).directo, "[6] a 22 metros, al arco");
  assert(!F.tiroLibre(W - 520, H / 2, ARCO, C).directo, "[6] a 52 metros se juega rápido");
  assert(!F.tiroLibre(W - 120, 20, ARCO, C).directo, "[6] pegado a la línea de costado, sin ángulo, se juega rápido");
  const S = { x: W - 230, y: H / 2 + 80 };
  const cand = [0, 1, 2, 3, 4, 5, 6].map(k => ({ ref: k, nombre: "R" + k, numero: k + 2, x: W - 100 - k * 40, y: H / 2 + (k - 3) * 50 }));
  const B = F.barrera(S, ARCO, AM, cand, C, F.rng(5));
  const m = F.marco(S, ARCO, AM);
  assert(B.jugadores.length === C.barrera.n[1], "[6] a 23 metros, barrera de " + C.barrera.n[1]);
  assert(B.jugadores.every(j => cand.some(c => c.ref === j.ref)), "[6] la barrera la forman los del partido");
  assert(B.jugadores.every(j => Math.abs(Math.hypot(j.x - S.x, j.y - S.y) - C.barrera.dist_px) < 8), "[6] a la distancia reglamentaria");
  const foto = salta => F.foto({ tirador: S, arco: ARCO, am: AM, defensores: [], barrera: B.jugadores, arquero: Object.assign({ nivel: 55 }, B.arquero, { seTira: 0 }), salta });
  assert(F.leer(foto(false), { u: B.lado * 0.85, h: 0.05 }, "rasante", C).tapa, "[6] la rasante al palo de la barrera choca con la barrera quieta");
  const tr = F.trayectoria(m, { u: B.lado * 0.85, h: 0.05 }, C.tipos.rasante);
  const r = F.rng(9); let bloq = 0;
  for (let i = 0; i < 200; i++) if (F.resolver(foto(true), { mira: { u: B.lado * 0.85, h: 0.05 }, tipo: "rasante", calidad: 1 }, { tiro: 80, aguanteFrac: 1 }, C, r).resultado === "bloqueo") bloq++;
  assert(tr(0.5).z < C.rasante_bajo && bloq < 20, "[6] con la barrera que salta, la rasante pasa por abajo (" + bloq + " de 200 bloqueadas)");
  const arriba = F.leer(foto(false), { u: B.lado * 0.7, h: 0.8 }, "por_arriba", C);
  assert(!arriba.tapa, "[6] por arriba pasa la barrera quieta");
  assert(F.leer(foto(true), { u: B.lado * 0.7, h: 0.8 }, "por_arriba", C).tapa === null, "[6] leer no sabe si salta: muestra la barrera quieta");
  console.log("[6] el tiro libre: barrera de " + B.jugadores.length + " a " + C.barrera.dist_px + " px, lado " + B.lado);
}

/* [7] el rival patea su tiro libre: elige con lo que ve y a veces la mete */
{
  const r = F.rng(21); let goles = 0, n = 600, bloq = 0;
  for (let i = 0; i < n; i++) {
    const S = { x: 120 + r() * 160, y: H / 2 + (r() - 0.5) * 260 };
    const arco = { x: 0, y: H / 2 };
    const cand = [0, 1, 2, 3, 4, 5].map(k => ({ ref: k, x: 60 + k * 30, y: H / 2 + (k - 2.5) * 60 }));
    const B = F.barrera(S, arco, AM, cand, C, r);
    const foto = F.foto({ tirador: S, arco, am: AM, barrera: B.jugadores, arquero: Object.assign({ nivel: 50 }, B.arquero), salta: B.salta });
    const dec = F.elegirCPU(foto, C, r, 55);
    assert(C.menu_libre.indexOf(dec.tipo) >= 0, "[7] la CPU elige del menú del tiro libre");
    const res = F.resolver(foto, dec, { tiro: 60, aguanteFrac: 1 }, C, r);
    if (res.resultado === "bloqueo") bloq++;
    if (golDe(foto, res, r, 60)) goles++;
  }
  assert(goles / n > 0.08 && goles / n < 0.45, "[7] el tiro libre del rival entra de vez en cuando: " + Math.round(goles / n * 100) + "%");
  console.log("[7] el tiro libre del rival: " + Math.round(goles / n * 100) + "% goles, " + Math.round(bloq / n * 100) + "% en la barrera");
}

/* [9] EL TIRO CON EL DEDO (idea de Rodri del 23/oct): gestos de ejemplo dan
   la pegada y el hueco esperados. La pelota abajo al medio de la pantalla y
   los palos arriba, como de frente al arco */
{
  const o = { menu: C.menu_remate, pelota: { x: 480, y: 500 }, palos: [{ x: 380, y: 200 }, { x: 580, y: 200 }] };
  const ol = Object.assign({}, o, { menu: C.menu_libre });
  const recta = (x0, y0, x1, y1, n) => Array.from({ length: (n || 8) + 1 }, (_, k) => ({ x: x0 + (x1 - x0) * k / (n || 8), y: y0 + (y1 - y0) * k / (n || 8) }));
  /* la curva: el medio del camino se aparta "lejos" px a la derecha de la pantalla */
  const curva = (x0, y0, x1, y1, lejos) => recta(x0, y0, x1, y1, 10).map((p, k) => ({ x: p.x + lejos * Math.sin(Math.PI * k / 10), y: p.y }));
  const L = C.gesto.largo_px;

  const g1 = F.gesto(recta(480, 500, 480, 500 - 0.25 * L), o, C);
  assert(g1 && g1.tipo === "colocado" && Math.abs(g1.mira.u) < 0.02 && !g1.mira.lado && !g1.curvo, "[9] corto y recto al medio: COLOCADO al medio, sin efecto");
  assert(g1.palabra === "BAJA", "[9] corto dice fuerza BAJA: " + (g1 && g1.palabra));

  /* hacia el palo derecho desde la pelota: x 570 en la línea de los palos */
  const dirX = (570 - 480) / 300, len = 0.8 * L, n = Math.hypot(dirX, 1);
  const g2 = F.gesto(recta(480, 500, 480 + len * dirX / n, 500 - len / n), o, C);
  assert(g2 && g2.tipo === "fuerte" && Math.abs(g2.mira.u - 0.9) < 0.03, "[9] largo y recto al palo derecho: FUERTE con u 0,9: " + (g2 && g2.tipo + " " + g2.mira.u.toFixed(2)));
  assert(g2.palabra === "ALTA", "[9] largo dice fuerza ALTA");
  /* la dirección vale aunque el dedo arranque en otro lado: lo que cuenta es para dónde va */
  const g2b = F.gesto(recta(300, 520, 300 + len * dirX / n, 520 - len / n), o, C);
  assert(g2b && Math.abs(g2b.mira.u - g2.mira.u) < 1e-9 && g2b.tipo === g2.tipo, "[9] el mismo gesto en otro lugar de la pantalla apunta igual");

  const g3 = F.gesto(curva(480, 500, 480, 500 - 0.6 * L, 0.25 * 0.6 * L), o, C);
  assert(g3 && g3.tipo === "efecto" && g3.curvo && g3.mira.lado === 1, "[9] el dedo que curva a la derecha: CON EFECTO para la derecha");
  const g4 = F.gesto(curva(480, 500, 480, 500 - 0.6 * L, -0.25 * 0.6 * L), o, C);
  assert(g4 && g4.tipo === "efecto" && g4.mira.lado === -1, "[9] y a la izquierda, para la izquierda");
  const g5 = F.gesto(curva(480, 500, 480, 500 - 0.6 * L, 0.05 * 0.6 * L), o, C);
  assert(g5 && g5.tipo !== "efecto" && !g5.curvo, "[9] un temblor del dedo no es efecto");

  /* la curva del gesto es la curva de la pelota: se abre para ese lado */
  const m = F.marco({ x: W - 260, y: H / 2 }, ARCO, AM);
  const medio = (lado) => F.local(m, F.trayectoria(m, { u: 0.4, h: 0.4, lado }, C.tipos.efecto)(0.5)).u;
  assert(medio(1) > 0.4 * AM * 0.5 + 5 && medio(-1) < medio(1) - 20, "[9] la trayectoria CON EFECTO se abre para el lado del gesto");
  const res = F.resolver(F.foto({ tirador: { x: W - 260, y: H / 2 }, arco: ARCO, am: AM, defensores: [], arquero: { x: W - 4, y: H / 2, nivel: 55 } }),
    { mira: g4.mira, tipo: "efecto", calidad: 1 }, { tiro: 70 }, C, F.rng(3));
  assert(res.fin.lado === -1, "[9] el remate de verdad lleva el lado del gesto");

  const g6 = F.gesto(recta(480, 500, 480, 500 - 1.25 * L), o, C);
  const F6 = F.foto({ tirador: { x: W - 260, y: H / 2 }, arco: ARCO, am: AM, defensores: [], arquero: { x: W - 4, y: H / 2, nivel: 55 } });
  assert(g6 && g6.palabra === "DE MÁS" && F.leer(F6, g6.mira, g6.tipo, C).fuera, "[9] de más: se va por arriba y la lectura lo dice");
  assert(F.gesto(recta(480, 500, 480, 500 + 0.5 * L), o, C) === null, "[9] para atrás no le pega");
  assert(F.gesto(recta(480, 500, 480, 500 - 0.6 * C.gesto.min_px), o, C) === null, "[9] un toque corto no le pega");

  /* el tiro libre: corto POR ARRIBA (pasa la barrera), medio RASANTE, largo AL PALO */
  const l1 = F.gesto(recta(480, 500, 480, 500 - 0.2 * L), ol, C), l2 = F.gesto(recta(480, 500, 480, 500 - 0.5 * L), ol, C), l3 = F.gesto(recta(480, 500, 480, 500 - 0.85 * L), ol, C);
  assert(l1.tipo === "por_arriba" && l2.tipo === "rasante" && l3.tipo === "al_palo", "[9] tiro libre: " + [l1.tipo, l2.tipo, l3.tipo].join(", "));
  const Fl = F.foto({ tirador: { x: W - 260, y: H / 2 }, arco: ARCO, am: AM, defensores: [], arquero: { x: W - 4, y: H / 2, nivel: 55 } });
  assert(F.leer(Fl, l1.mira, l1.tipo, C).mira.h >= C.tipos.por_arriba.h_min, "[9] POR ARRIBA con el dedo va por arriba de la barrera");
  assert(F.gesto(curva(480, 500, 480, 500 - 0.5 * L, 0.2 * 0.5 * L), ol, C).tipo === "efecto", "[9] tiro libre con curva: CON EFECTO");
  assert(C.gesto.activo === true, "[9] la perilla del dedo, prendida de fábrica");
  console.log("[9] el tiro con el dedo: " + [g1, g2, g3, g6].map(g => g.tipo + "/" + g.palabra + "/u " + g.mira.u.toFixed(2) + "/h " + g.mira.h.toFixed(2)).join(" · "));
}

/* [8] las perillas */
{
  assert(BAL.flags.tiro_frente === true && BAL.flags.tiro_libre === true, "[8] las dos perillas prendidas de fábrica");
  assert(C.menu_remate.every(t => C.tipos[t]) && C.menu_libre.every(t => C.tipos[t]), "[8] los menús nombran tipos que existen");
  assert(Object.keys(C.tipos).every(t => /^[A-ZÁÉÍÓÚÑ ]+$/.test(C.tipos[t].n)), "[8] cada pegada tiene su nombre");
  console.log("[8] las perillas en balance.frente y balance.flags");
}

console.log("\n" + ok + " ok, " + mal + " mal");
if (mal) process.exit(1);
