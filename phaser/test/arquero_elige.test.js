/* PAMPA STAR · EL ARQUERO ELIGE (pedido de Rodri del 25/oct)
   "El arquero tiene que elegir puños, atrapar, súper atajada... y que se
   cargue % de más acierto, y que dependa de qué tan bueno sea lo del otro."
   logic/partido.js: eleccionArquero, duelAtajada; perillas en
   balance.partido.arquero_elige. node phaser/test/arquero_elige.test.js */
"use strict";
const path = require("path"), fs = require("fs");
const RAIZ = path.join(__dirname, "..");
const P = require(path.join(RAIZ, "logic", "partido.js"));
const Duel = require(path.join(RAIZ, "logic", "duel.js"));
const BAL = JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "balance.json"), "utf8"));
let ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("✗ " + m); } }
function partido(bal, tiro, x, y) {
  const plantel = [];
  for (let i = 0; i < 11; i++) plantel.push({ nombre: "J" + i, esVos: i === 9 });
  const st = P.crearPartido({ bal: bal || BAL, plantel, rival: "Test" });
  P.kickoff(st, "rival");
  const i = st.rivales.findIndex(r => r.pos === "ATA");
  st.portadorRival = i;
  const r = st.rivales[i];
  r.stats = Object.assign({}, r.stats, { tiro: tiro != null ? tiro : 60 });
  r.x = x != null ? x : 180; r.y = y != null ? y : st.H / 2;
  return st;
}
const arqDe = st => st.mios.find(j => j.pos === "ARQ");
const AE = BAL.partido.arquero_elige;

/* [1] tres botones, en orden, con su % */
{
  const ops = P.eleccionArquero(partido(), 25);
  assert(ops && ops.map(o => o.id).join() === "atajar,despejar,super", "los tres: ATRAPARLA, DE PUÑOS, SÚPER ATAJADA");
  assert(ops.every(o => Number.isInteger(o.pct) && o.pct >= 0 && o.pct <= 100), "cada uno con su % entero");
  assert(ops[2].pct > ops[1].pct && ops[1].pct > ops[0].pct, "la súper es la de más chance y atraparla la de menos (" + ops.map(o => o.pct).join("/") + ")");
}

/* [2] depende de qué tan bueno es lo del otro: contra un remate más fuerte
   bajan las tres y atraparla pierde más que los puños */
{
  const flojo = P.eleccionArquero(partido(null, 40), 30), fuerte = P.eleccionArquero(partido(null, 75), 30);
  assert(fuerte.every((o, k) => o.pct <= flojo[k].pct), "con más TIRO de quien patea ninguna sube");
  assert(fuerte[1].pct - fuerte[0].pct > flojo[1].pct - flojo[0].pct, "contra el remate fuerte, DE PUÑOS le saca más ventaja a ATRAPARLA");
}

/* [3] el arquero tuyo también cuenta, y el ángulo cerrado lo ayuda */
{
  const malo = P.eleccionArquero(partido(), 0), bueno = P.eleccionArquero(partido(), 30);
  assert(bueno.every((o, k) => o.pct >= malo[k].pct) && bueno[0].pct > malo[0].pct, "con más bonus de tu arquero, más %");
  const st0 = partido(null, 60, 200), stC = partido(null, 60, 60, 60);
  const fr = P.eleccionArquero(st0, 25), ce = P.eleccionArquero(stC, 25);
  assert(ce[0].pct > fr[0].pct, "de ángulo cerrado (pegado a la línea de fondo) le cuesta más al que patea");
}

/* [4] el % que se ve es el que se juega */
{
  for (const id of ["atajar", "despejar", "super"]) {
    const pct = P.eleccionArquero(partido(), 25).find(o => o.id === id).pct;
    const stA = partido(), stB = partido();
    const bajo = Math.max(0, pct / 100 - 0.02), alto = Math.min(0.999, pct / 100 + 0.02);
    const a = P.resolverAtajada(stA, id, () => bajo, 25, null, true);
    const b = P.resolverAtajada(stB, id, () => alto, 25, null, true);
    assert(!a.golRival && b.golRival, id + ": con la tirada justo abajo del " + pct + "% la ataja y justo arriba es gol");
  }
}

/* [5] la súper gasta aguante de tu arquero y sin ese aguante no se ofrece */
{
  /* el reloj salta en las dos y el arquero recupera lo mismo: se compara
     contra atraparla, desde un tanque a medias para que el techo no corte */
  const st = partido(), stA = partido();
  arqDe(st).aguante = 600; arqDe(stA).aguante = 600;
  P.resolverAtajada(st, "super", () => 0, 25, null, true);
  P.resolverAtajada(stA, "atajar", () => 0, 25, null, true);
  assert(Math.abs(arqDe(stA).aguante - arqDe(st).aguante - AE.super_costo) < 1e-9, "la SÚPER ATAJADA le saca super_costo de aguante (" + AE.super_costo + ")");
  const st2 = partido(); arqDe(st2).aguante = AE.super_costo - 1;
  assert(P.eleccionArquero(st2, 25)[2].puede === false, "sin aguante para la súper, el botón no se puede usar");
  const st3 = partido(); const r3 = P.resolverAtajada(st3, "super", () => 0, 25, null, true);
  assert(r3.retiene && st3.posesion === "mia", "la súper atajada la retiene: la pelota es tuya");
  const st4 = partido(); const r4 = P.resolverAtajada(st4, "despejar", () => 0, 25, null, true);
  assert(r4.dividida, "de puños la saca y queda dividida");
}

/* [6] sin la pregunta todo queda como antes */
{
  const off = JSON.parse(JSON.stringify(BAL)); off.partido.arquero_elige.activo = false;
  assert(P.eleccionArquero(partido(off), 25) === null, "activo:false = no hay pregunta");
  const st = partido(), op = P.opcionesArquero(st)[0];
  const RR = BAL.partido.remate_rival, pat = st.rivales[st.portadorRival];
  const atk = P.poderRival(st) + 12 + RR.extra + (pat.stats.tiro - 50) * RR.por_tiro;
  const pct = Duel.duelChance(op.poder + 25, atk, BAL.duelo);
  const r = P.resolverAtajada(st, "atajar", () => pct - 0.001, 25);
  assert(!r.golRival && arqDe(st).aguante === arqDe(partido()).aguante, "el remate sin elegir sigue con el duelo de siempre y sin gasto del arquero");
}

console.log("arquero_elige: " + ok + " ok, " + mal + " mal");
if (mal) process.exit(1);
