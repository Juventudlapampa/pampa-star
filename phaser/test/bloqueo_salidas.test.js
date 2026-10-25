/* PAMPA STAR · EL BLOQUEO (pedido de Rodri del 25/oct)
   "En el bloqueo se pone de brazos cruzados. Que haga la animación como que
   salta o se tira, o se da vuelta, de acuerdo a la posición en el mapa
   respecto del tiro." Y seis salidas con su probabilidad. logic/definicion.js:
   bloqueoDelTiro, poseDeBloqueo y remateRivalAuto con p.salidas; perillas en
   balance.definicion.bloqueo_salidas. node phaser/test/bloqueo_salidas.test.js */
"use strict";
const path = require("path"), fs = require("fs");
const RAIZ = path.join(__dirname, "..");
const D = require(path.join(RAIZ, "logic", "definicion.js"));
const BAL = JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "balance.json"), "utf8"));
const S = BAL.definicion.bloqueo_salidas;
let ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("✗ " + m); } }
const sumaFrena = pr => pr.bloquea_mismo + pr.bloquea_otro + pr.queda_atacante;
const base = { pBloqueo: 0.4, tiro: 60, cerca: 260, lat: 40, companeros: 0, cfg: S };
const con = o => D.bloqueoDelTiro(Object.assign({}, base, o, { rng: () => 0.5 }));

/* [1] la pose sale de dónde está respecto del tiro */
{
  const tir = { x: 600, y: 340 }, arco = { x: 0, y: 340 };
  assert(D.poseDeBloqueo(tir, arco, { x: 520, y: 345 }, S).pose === "espaldas", "pegado al que patea se da vuelta de espaldas");
  assert(D.poseDeBloqueo(tir, arco, { x: 300, y: 345 }, S).pose === "salto", "en la línea y con tiempo salta de frente");
  const a = D.poseDeBloqueo(tir, arco, { x: 300, y: 430 }, S), b = D.poseDeBloqueo(tir, arco, { x: 300, y: 250 }, S);
  assert(a.pose === "piso" && b.pose === "piso", "corrido de la línea se tira al piso de costado");
  assert(a.lado === -b.lado, "y el lado dice de qué lado de la línea está (para el flip)");
}

/* [2] las seis salidas suman 1 y todas pueden pasar */
{
  const pr = con({}).probs;
  assert(Math.abs(D.SALIDAS.reduce((t, k) => t + pr[k], 0) - 1) < 1e-9 && D.SALIDAS.every(k => pr[k] > 0), "las seis con su probabilidad, sumando 1 (" + D.SALIDAS.map(k => k + " " + pr[k].toFixed(3)).join(", ") + ")");
  const vistas = {};
  for (let r = 0; r < 1; r += 0.002) vistas[D.bloqueoDelTiro(Object.assign({}, base, { rng: () => r })).salida] = 1;
  assert(D.SALIDAS.every(k => vistas[k]), "barriendo la tirada salen las seis (" + Object.keys(vistas).join(", ") + ")");
}

/* [3] dependen del remate, la distancia y los jugadores */
{
  const flojo = con({ tiro: 40 }).probs, fuerte = con({ tiro: 90 }).probs;
  assert(fuerte.roza + fuerte.descoloca > flojo.roza + flojo.descoloca && fuerte.bloquea_mismo + fuerte.bloquea_otro < flojo.bloquea_mismo + flojo.bloquea_otro,
    "contra un remate fuerte se roza y se desvía más y se frena menos");
  const enLinea = con({ lat: 0 }).probs, corrido = con({ lat: 110 }).probs;
  assert(corrido.roza > enLinea.roza && corrido.bloquea_mismo < enLinea.bloquea_mismo, "corrido de la línea, más roce y menos bloqueo");
  const solo = con({ companeros: 0 }).probs, acompanado = con({ companeros: 3 }).probs;
  assert(acompanado.bloquea_otro > solo.bloquea_otro, "con compañeros cerca, más veces la agarra otro de su equipo");
  const lejos = con({ cerca: 400 }).probs, pegado = con({ cerca: 60 }).probs;
  assert(pegado.queda_atacante > lejos.queda_atacante && pegado.bloquea_otro > lejos.bloquea_otro, "pegado al que patea, le pega en el cuerpo y rebota");
  assert(con({ pBloqueo: 0 }).probs.no_toca === 1, "sin nadie en la línea (chance 0) no la toca nadie");
}

/* [4] lo que se frena queda cerca del bloqueo de antes */
{
  [0.2, 0.4, 0.6].forEach(pB => {
    const pr = con({ pBloqueo: pB }).probs, f = sumaFrena(pr);
    assert(Math.abs(f - pB) <= pB * 0.25, "con chance " + pB + " de bloqueo se frena " + f.toFixed(3) + " (antes " + pB + ", tolerancia 25%)");
  });
}

/* [5] remateRivalAuto con las salidas */
{
  const params = (rng, salidas) => ({
    tirador: { x: 300, y: 340 }, arco: { x: 0, y: 340 }, tiro: 60,
    defensores: [{ x: 150, y: 345, nombre: "A" }, { x: 200, y: 420, nombre: "B" }, { x: 600, y: 100, nombre: "C" }],
    arquero: { nivel: 55, aguante: 1000 }, aguanteMax: 1000, cfg: BAL.definicion, rng, salidas
  });
  const sin = D.remateRivalAuto(params(() => 0.5));
  assert(sin.salida === undefined && sin.poseBloqueo === undefined, "sin salidas, la lectura de siempre");
  const pr = D.remateRivalAuto(params(() => 0.5, S)).probs;
  let acum = 0; const tirada = {};
  D.SALIDAS.forEach(k => { tirada[k] = acum + pr[k] / 2; acum += pr[k]; });
  const L = k => D.remateRivalAuto(params(() => tirada[k], S));
  assert(D.SALIDAS.every(k => L(k).salida === k), "cada tirada da su salida");
  assert(L("bloquea_mismo").bloqueado && L("bloquea_mismo").recupera.nombre === "A", "la bloquea y la agarra el mismo (A)");
  assert(L("bloquea_otro").bloqueado && L("bloquea_otro").recupera.nombre === "B", "la bloquea y la agarra otro de su equipo, el más cerca (B)");
  assert(!L("queda_atacante").bloqueado && L("queda_atacante").motivo === "no_alcanza", "la toca y no alcanza: no es bloqueo y lo dice");
  const nt = L("no_toca").bonusArquero;
  assert(L("roza").bonusArquero === nt + S.roza_bonus && L("roza").motivo === "roce", "la roza: el tiro sigue con menos fuerza (roza_bonus para el arquero)");
  assert(L("descoloca").bonusArquero === nt - S.descoloca_malus && L("descoloca").motivo === "descoloco", "la desvía y descoloca al arquero (descoloca_malus)");
  assert(L("no_toca").poseBloqueo.pose === "salto", "A está en la línea, a 150 del que patea: salta de frente");
  const off = Object.assign({}, S, { activo: false });
  assert(D.remateRivalAuto(params(() => 0.5, off)).salida === undefined, "activo:false = el bloqueo de siempre");
}

console.log("bloqueo_salidas: " + ok + " ok, " + mal + " mal");
if (mal) process.exit(1);
