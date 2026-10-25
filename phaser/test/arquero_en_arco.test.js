/* PAMPA STAR · EL ARQUERO, DENTRO DEL ARCO (pedido de Rodri del 25/oct)
   "En la animación del arquero de ¡LA AGARRÓ! está arriba de las redes del
   arco, volando. Acomodá todas." Con el arco del cine (match.js, arcoCine) y
   las medidas reales de las poses, la caja de la que agarra y la del despeje
   tienen que quedar entre los palos, debajo del travesaño y con los pies
   delante de la línea. logic/perspectiva.js, arqueroEnArco; perillas en
   balance.cine.arquero_en_arco. node phaser/test/arquero_en_arco.test.js */
"use strict";
const path = require("path"), fs = require("fs");
const RAIZ = path.join(__dirname, ".."), REPO = path.join(RAIZ, "..");
const Pp = require(path.join(RAIZ, "logic", "perspectiva.js"));
const BAL = JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "balance.json"), "utf8"));
const MAN = JSON.parse(fs.readFileSync(path.join(REPO, "data", "poses_manifest.json"), "utf8"));
let ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("✗ " + m); } }
function medidas(rel) {
  const b = fs.readFileSync(path.join(REPO, rel)), f = b.slice(12, 16).toString();
  if (f === "VP8X") return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (f === "VP8 ") return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  const v = b.readUInt32LE(21); return { w: 1 + (v & 0x3fff), h: 1 + ((v >> 14) & 0x3fff) };
}
/* el arco del cine, el de match.js */
const Wm = { Phaser: { Scene: function () { } }, PF: {} };
new Function("window", "Phaser", fs.readFileSync(path.join(RAIZ, "scenes", "match.js"), "utf8").replace(/\r\n/g, "\n"))(Wm, Wm.Phaser);
const A = Wm.PampaMatch.prototype.arcoCine();
const CA = BAL.cine.arquero_en_arco;

[["arquero_ataja", "agarra"], ["arquero_despeje_celeste", "despeje"]].forEach(([id, cual]) => {
  const tex = medidas((MAN.base || "assets/poses/") + MAN.poses[id].archivo);
  [A.cx, A.izq, A.der, A.izq - 200, A.der + 200].forEach(x => {
    const L = Pp.arqueroEnArco(A, tex, x, CA[cual]), c = L.caja;
    assert(c.izq >= A.izq - 1e-6 && c.der <= A.der + 1e-6, id + " (pedido en x " + x + "): entre los palos (" + Math.round(c.izq) + " a " + Math.round(c.der) + ", palos " + A.izq + " a " + A.der + ")");
    assert(c.arriba >= A.travesano, id + ": por debajo del travesaño, nunca encima de la red (arriba " + Math.round(c.arriba) + ", travesaño " + A.travesano + ")");
    assert(c.abajo > A.linea && c.abajo - A.linea <= 12, id + ": los pies delante de la línea de gol (" + Math.round(c.abajo) + " contra " + A.linea + ")");
  });
});
const ag = Pp.arqueroEnArco(A, medidas("assets/poses/" + MAN.poses.arquero_ataja.archivo), A.cx, CA.agarra);
const de = Pp.arqueroEnArco(A, medidas("assets/poses/" + MAN.poses.arquero_despeje_celeste.archivo), A.cx, CA.despeje);
assert(ag.caja.abajo - ag.caja.arriba < de.caja.abajo - de.caja.arriba, "de rodillas es más bajo que parado despejando");

console.log("arquero_en_arco: " + ok + " ok, " + mal + " mal");
if (mal) process.exit(1);
