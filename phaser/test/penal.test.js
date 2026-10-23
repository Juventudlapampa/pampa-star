/* ============================================================================
   PAMPA STAR · phaser/test/penal.test.js — EL PENAL (decisión que Rodri
   delegó, 23/oct; logic/penal.js, scenes/frente_ui.js, balance.penal)
     [1] las zonas y los cinco lados del arquero, como se ven en la pantalla
     [2] cuánto ataja cada lado: el que adivina ataja, el que no, casi nunca
     [3] tu penal contra el arquero de la CPU: medido con la geometría del
         remate de frente al arco (frente.resolver), en la B y en el Mundial
     [4] el penal de ellos: la pista dice la verdad con fiable, y seguirla ataja más
     [5] la tanda: cinco por lado, se corta cuando ya no se alcanza, muerte súbita
     [6] conectado: la falta en el área va al penal en frente_ui.js
   Corré:  node phaser/test/penal.test.js
   ========================================================================== */
"use strict";
const fs = require("fs"), path = require("path");
const Pn = require(path.join(__dirname, "..", "logic", "penal.js"));
const Fr = require(path.join(__dirname, "..", "logic", "frente.js"));
const BAL = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "balance.json"), "utf8"));
const PC = BAL.penal, C = BAL.frente;
let ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }
const pct = (x) => Math.round(x * 100) + "%";

assert(BAL.flags.penales === true && C.falta.en_area === true, "flags.penales prendido y la falta en el área se cobra");

/* [1] */
assert(Pn.zonaDe(-0.8, 0.2, PC) === "izq_bajo" && Pn.zonaDe(0.8, 0.9, PC) === "der_alto" && Pn.zonaDe(0, 0.2, PC) === "medio_bajo" && Pn.zonaDe(0.1, 0.8, PC) === "medio_alto", "[1] las seis zonas");
assert(Pn.dirDeZona("izq_alto") === "izquierda" && Pn.dirDeZona("der_bajo") === "derecha" && Pn.dirDeZona("medio_alto") === "arriba" && Pn.dirDeZona("medio_bajo") === "medio", "[1] el lado que corresponde a cada zona");
assert(Pn.dirDePunto(-0.7, 0.4, PC) === "izquierda" && Pn.dirDePunto(0.7, 0.4, PC) === "derecha" && Pn.dirDePunto(0, 0.8, PC) === "arriba" && Pn.dirDePunto(0, 0.05, PC) === "abajo" && Pn.dirDePunto(0, 0.35, PC) === "medio",
  "[1] tocar el arco elige el lado: costados, arriba, abajo y al medio");
assert(Pn.DIRS.length === 5 && Pn.DIRS.every(d => PC.cubre[d]), "[1] cinco lados, cada uno con su tabla");
console.log("[1] zonas y lados");

/* [2] */
const T = C.tipos;
const p = (d, u, h, t, n) => Pn.probAtajar(d, u, h, t || T.colocado, n, PC);
assert(Math.abs(p("izquierda", -0.6, 0.2) - p("derecha", 0.6, 0.2)) < 1e-9, "[2] la izquierda y la derecha son espejo");
assert(p("izquierda", -0.6, 0.2) > 0.6 && p("derecha", -0.6, 0.2) === 0, "[2] adivinar el lado ataja mucho; el lado contrario, nada");
assert(p("izquierda", -0.95, 0.2) < p("izquierda", -0.6, 0.2), "[2] pegada al palo cuesta más");
assert(p("izquierda", -0.6, 0.2, T.fuerte) < p("izquierda", -0.6, 0.2, T.colocado), "[2] la FUERTE entra más que la COLOCADA");
assert(p("izquierda", -0.6, 0.2, null, 88) > p("izquierda", -0.6, 0.2, null, 40), "[2] el arquero mejor ataja más");
assert(p("arriba", 0, 0.8) > 0.7 && p("abajo", 0, 0.8) === 0 && p("abajo", 0, 0.1) > 0.7, "[2] arriba y abajo cubren el medio alto y el bajo");
let maxP = 0; Pn.DIRS.forEach(d => [-0.9, -0.5, 0, 0.5, 0.9].forEach(u => [0.1, 0.5, 0.9].forEach(h => { maxP = Math.max(maxP, p(d, u, h, null, 99)); })));
assert(maxP <= PC.max, "[2] nunca pasa del tope de atajar (" + maxP.toFixed(2) + ")");
const r1 = Pn.resolver({ u: -0.6, h: 0.2, tipo: T.colocado, dir: "izquierda", nivel: 55 }, PC, () => 0.99);
const r2 = Pn.resolver({ u: -0.6, h: 0.2, tipo: T.colocado, dir: "izquierda", nivel: 55 }, PC, () => 0.01);
const r3 = Pn.resolver({ u: 1.3, h: 0.2, fuera: true, dir: "medio" }, PC, () => 0.01);
assert(r1.resultado === "gol" && r2.resultado === "atajada" && r3.resultado === "afuera", "[2] resolver: gol, atajada y afuera");
console.log("[2] adivinando el lado: " + pct(p("izquierda", -0.6, 0.2)) + " · al palo " + pct(p("izquierda", -0.95, 0.2)) + " · FUERTE " + pct(p("izquierda", -0.6, 0.2, T.fuerte)));

/* [3] tu penal: la mira, la pegada y la calidad de la marca, por la
   geometría del remate (el error de la pierna) y después el arquero */
function tuPenal(nivel, semilla, apunta) {
  const r = Fr.rng(semilla);
  let g = 0, at = 0, af = 0, N = 3000;
  for (let i = 0; i < N; i++) {
    const foto = Fr.foto({ tirador: { x: 1050 - PC.punto_px, y: 340 }, arco: { x: 1050, y: 340 }, am: BAL.mundo.arco_medio, arquero: { x: 1046, y: 340, nivel } });
    const mira = apunta(r), tipo = r() < 0.4 ? "fuerte" : "colocado", calidad = 0.4 + r() * 0.5;
    const res = Fr.resolver(foto, { mira, tipo, calidad }, { tiro: 60, aguanteFrac: 0.8 }, C, r);
    const dir = Pn.arqueroCPU(mira, nivel, PC, r).dir;
    const pn = Pn.resolver({ u: res.fin.u, h: res.fin.h, fuera: res.resultado === "afuera", palo: res.resultado === "palo", tipo: T[tipo], dir, nivel }, PC, r);
    if (pn.resultado === "gol") g++; else if (pn.resultado === "atajada") at++; else af++;
  }
  return { gol: g / N, atajada: at / N, afuera: af / N };
}
const aLosPalos = r => ({ u: (r() < 0.5 ? -1 : 1) * (0.55 + r() * 0.3), h: 0.15 + r() * 0.6 });
const alMedio = r => ({ u: (r() - 0.5) * 0.3, h: 0.2 + r() * 0.3 });
const enB = tuPenal(40, 7, aLosPalos), enMundial = tuPenal(88, 7, aLosPalos), medioB = tuPenal(40, 9, alMedio);
console.log("MEDIDA tu penal a los palos: en la B gol " + pct(enB.gol) + ", atajada " + pct(enB.atajada) + ", afuera " + pct(enB.afuera) +
  " · en el Mundial gol " + pct(enMundial.gol) + ", atajada " + pct(enMundial.atajada) + " · al medio en la B gol " + pct(medioB.gol));
assert(enB.gol > 0.65 && enB.gol < 0.9, "[3] en la B el penal se mete casi siempre, no siempre (" + pct(enB.gol) + ")");
assert(enMundial.gol < enB.gol - 0.04 && enMundial.gol > 0.5, "[3] en el Mundial el arquero ataja más (" + pct(enMundial.gol) + " contra " + pct(enB.gol) + ")");
assert(enB.afuera > 0.02 && enB.afuera < 0.2, "[3] alguno se va afuera (" + pct(enB.afuera) + ")");
assert(medioB.gol > 0.5, "[3] al medio también vale, si el arquero se tira (" + pct(medioB.gol) + ")");
const leeB = Pn.arqueroCPU({ u: 0.7, h: 0.3 }, 40, PC, () => 0).lee, leeM = Pn.arqueroCPU({ u: 0.7, h: 0.3 }, 88, PC, () => 0).lee;
assert(leeM > leeB && leeM <= PC.cpu.lee_max, "[3] el arquero del Mundial lee más tu tiro (" + pct(leeB) + " → " + pct(leeM) + ")");
assert(Pn.arqueroCPU({ u: 0.7, h: 0.3 }, 55, PC, () => 0).dir === "derecha", "[3] cuando lee, va adonde apuntaste");

/* [4] el penal de ellos */
function suPenal(estrategia, tiro, semilla) {
  const r = Fr.rng(semilla);
  let at = 0, sigue = 0, N = 4000;
  for (let i = 0; i < N; i++) {
    const dec = Pn.pateadorCPU(tiro, PC, r);
    if (dec.pista.dir === dec.verdad) sigue++;
    const dir = estrategia === "pista" ? dec.pista.dir : Pn.DIRS[Math.floor(r() * 5)];
    const pn = Pn.resolver({ u: dec.mira.u, h: dec.mira.h, tipo: T[dec.tipo], dir, nivel: 55 }, PC, r);
    if (pn.resultado === "atajada") at++;
  }
  return { ataja: at / N, verdad: sigue / N };
}
const conPista = suPenal("pista", 55, 11), aLaSuerte = suPenal("suerte", 55, 11), crack = suPenal("pista", 85, 11);
console.log("MEDIDA su penal: siguiendo la pista atajás " + pct(conPista.ataja) + " (la pista dice la verdad " + pct(conPista.verdad) + "), a la suerte " + pct(aLaSuerte.ataja) +
  " · contra uno de 85 de TIRO, siguiendo la pista " + pct(crack.ataja) + " (verdad " + pct(crack.verdad) + ")");
assert(Math.abs(conPista.verdad - PC.pista.fiable) < 0.03, "[4] la pista dice la verdad con fiable (" + pct(conPista.verdad) + ")");
assert(conPista.ataja > aLaSuerte.ataja + 0.12, "[4] mirar la postura ataja más que tirarse a la suerte");
assert(conPista.ataja < 0.6, "[4] y no lo ataja siempre: hay algo de azar");
assert(crack.verdad < conPista.verdad, "[4] el que tiene más TIRO disimula mejor");
const d1 = Pn.pateadorCPU(55, PC, Fr.rng(2));
assert(typeof d1.pista.texto === "string" && d1.pista.texto.length > 10 && T[d1.tipo] && Math.abs(d1.mira.u) <= 1, "[4] la CPU dice adónde, con qué pegada y la postura");
const frases = Object.keys(PC.pista.textos).reduce((a, k) => a.concat(PC.pista.textos[k]), []);
assert(frases.every(f => !/\b(tú|tienes|puedes|fíjate|mira tú)\b/i.test(f)), "[4] las pistas sin tuteo");

/* [5] la tanda */
const tanda = (seq) => { const t = Pn.nuevaTanda(5); seq.forEach(g => { if (!t.terminada) Pn.anotar(t, g); }); return t; };
const t1 = tanda([1, 0, 1, 0, 1, 0]);
assert(t1.terminada && t1.ganador === "a" && t1.a.length === 3 && t1.b.length === 3, "[5] 3 a 0 después de tres cada uno: ya no se alcanza");
const t2 = tanda([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
assert(!t2.terminada && Pn.marcador(t2).a === 5 && Pn.marcador(t2).b === 5, "[5] 5 a 5 sigue");
Pn.anotar(t2, true); Pn.anotar(t2, false);
assert(t2.terminada && t2.ganador === "a", "[5] muerte súbita: mete uno y el otro no");
let tiro = false; try { Pn.anotar(t2, true); } catch (e) { tiro = /termin/.test(e.message); }
assert(tiro, "[5] patear con la tanda terminada es un error, no se cuenta");
const t3 = tanda([1, 1, 1, 1, 1, 1, 0, 1, 0]);
assert(t3.terminada && t3.ganador === "b" && t3.a.length === 5 && t3.b.length === 4, "[5] el último de b ni hace falta");
const r = Fr.rng(5); let largo = 0;
for (let k = 0; k < 300; k++) { const t = Pn.nuevaTanda(5); let n = 0; while (!t.terminada && n < 200) { Pn.anotar(t, r() < 0.75); n++; } if (!t.terminada) largo++; assert(!t.terminada || t.ganador !== null, "[5] termina con ganador"); }
assert(largo === 0, "[5] ninguna tanda queda sin terminar");
console.log("[5] la tanda: cinco por lado y muerte súbita");

/* [6] conectado */
const FU = fs.readFileSync(path.join(__dirname, "..", "scenes", "frente_ui.js"), "utf8");
const IDX = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
assert(/this\.penalMio\(avisoP\)/.test(FU) && /this\.penalRival\(st\.portadorRival, avisoP\)/.test(FU), "[6] cobrarFalta manda la falta del área al penal, a favor y en contra");
assert(/Pn\.arqueroCPU\(fr\.mira/.test(FU) && /Pn\.resolver\(/.test(FU) && /pateadorCPU\(/.test(FU), "[6] frente_ui usa la lógica pura del penal");
assert(IDX.indexOf('<script src="logic/penal.js"></script>') >= 0, "[6] index.html carga logic/penal.js");
const REL = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "data", "relatos.json"), "utf8"));
const busca = (o, k) => o && typeof o === "object" ? (Array.isArray(o[k]) ? o[k] : Object.keys(o).reduce((a, x) => a || busca(o[x], k), null)) : null;
assert(["penal_a_favor", "penal_en_contra", "penal_errado"].every(k => (busca(REL, k) || []).length >= 3), "[6] el relator tiene frases del penal");
const TRI = fs.readFileSync(path.join(__dirname, "..", "..", "data", "tribuna.json"), "utf8");
assert(TRI.indexOf('"evento": "penal_a_favor"') >= 0 && TRI.indexOf('"evento": "penal_en_contra"') >= 0, "[6] la tribuna comenta el penal");

console.log(mal ? "✗ " + mal + " FALLARON (" + ok + " ok)" : "✓ penal: " + ok + " ok");
process.exit(mal ? 1 : 0);
