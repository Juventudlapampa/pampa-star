/* PAMPA STAR · EL LUGAR DEL REMATE (pedido de Rodri del 25/oct)
   "Le pegué desde un ángulo de abajo, casi lateral, y me mostró la animación
   como si le pegara de mitad de cancha." logic/perspectiva.js, lugarDelRemate;
   perillas en balance.cine.lugares. node phaser/test/lugar_remate.test.js */
"use strict";
const path = require("path"), fs = require("fs");
const RAIZ = path.join(__dirname, "..");
const Pp = require(path.join(RAIZ, "logic", "perspectiva.js"));
const P = require(path.join(RAIZ, "logic", "partido.js"));
const A = require(path.join(RAIZ, "logic", "ambiente.js"));
const BAL = JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "balance.json"), "utf8"));
const L = BAL.cine.lugares, W = BAL.mundo.ancho, H = BAL.mundo.alto;
let ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("✗ " + m); } }
const lugar = (x, y) => Pp.lugarDelRemate(x, y, W, H, L);

/* [1] los cinco lugares (el lateral y el ángulo, de cada lado) */
{
  const casos = [
    [W - 120, H / 2, "frente_cerca"], [W - 300, H / 2 + 30, "frente_lejos"],
    [W - 150, H / 2 - 190, "lateral_izq"], [W - 150, H / 2 + 190, "lateral_der"],
    [W - 30, H / 2 - 160, "angulo_izq"], [W - 30, H / 2 + 160, "angulo_der"]
  ];
  casos.forEach(c => { const l = lugar(c[0], c[1]); assert(l.id === c[2], "desde (" + c[0] + ", " + c[1] + ") es " + c[2] + " (salió " + l.id + ", " + l.grados + "°)"); });
  assert(lugar(W - 30, H / 2 + 20).id === "frente_cerca", "pegado a la línea pero entre los palos sigue siendo de frente");
  assert(lugar(W / 2, H / 2).id === "frente_lejos", "de mitad de cancha, de frente y lejos");
}

/* [2] cómo se ve: de costado el arco angosto y la cancha girada; el otro lado es el espejo */
{
  const fc = lugar(W - 120, H / 2), fl = lugar(W - 300, H / 2), la = lugar(W - 150, H / 2 + 190), an = lugar(W - 30, H / 2 + 160);
  assert(fc.giro === 0 && fl.giro === 0 && fc.vpX === 0.5, "de frente la línea de gol queda derecha y el arco al medio");
  assert(fc.arcoW > fl.arcoW && fc.viaje < fl.viaje, "de cerca el arco se ve más grande y el viaje es más corto");
  assert(an.giro > la.giro && la.giro > 0, "más cerrado el ángulo, más gira la cancha");
  assert(an.arcoW < la.arcoW && la.arcoW < fl.arcoW, "de costado se ve menos arco");
  const iz = lugar(W - 150, H / 2 - 190);
  assert(iz.espejo && !la.espejo && iz.pintura === la.pintura && Math.abs(iz.vpX - (1 - la.vpX)) < 1e-9, "del otro lado es la misma pintura en espejo, con el arco corrido al revés");
}

/* [3] el lugar sale de la posición real: prepararRemate la guarda */
{
  const pl = []; for (let i = 0; i < 11; i++) pl.push({ nombre: "J" + i, esVos: i === 9 });
  const st = P.crearPartido({ bal: BAL, plantel: pl, rival: "T" });
  P.kickoff(st, "mia"); st.ctrl = 9; st.mios[9].x = W - 30; st.mios[9].y = H / 2 + 160;
  P.prepararRemate(st, false);
  assert(st.remateDesde && st.remateDesde.x === W - 30 && st.remateDesde.y === H / 2 + 160, "prepararRemate guarda desde dónde se pateó");
  assert(lugar(st.remateDesde.x, st.remateDesde.y).id === "angulo_der", "y desde ahí el cine es el ángulo cerrado");
}

/* [4] una pintura por vista, que no pisa a la de siempre */
{
  const k0 = A.claveDeFondo("profunda", "dia", {}), kl = A.claveDeFondo("profunda", "dia", { lugar: lugar(W - 150, H / 2 + 190) });
  const ki = A.claveDeFondo("profunda", "dia", { lugar: lugar(W - 150, H / 2 - 190) }), ka = A.claveDeFondo("profunda", "dia", { lugar: lugar(W - 30, H / 2 + 160) });
  assert(k0 !== kl && kl === ki && kl !== ka, "lateral tiene su pintura, la izquierda usa la misma y el ángulo otra (" + [k0, kl, ka].join(", ") + ")");
}

console.log("lugar_remate: " + ok + " ok, " + mal + " mal");
if (mal) process.exit(1);
