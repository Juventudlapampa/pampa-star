/* PAMPA STAR · test de LA TEMPORADA del Modo Master (V7 §2) — fixture del
   círculo, tabla, determinismo, veredicto. node phaser/test/temporada.test.js */
"use strict";
const path = require("path");
const T = require(path.join(__dirname, "..", "logic", "temporada.js"));
const Ma = require(path.join(__dirname, "..", "logic", "master.js"));
const fs = require("fs");

let ok = 0, mal = 0;
function assert(cond, msg) { if (cond) ok++; else { mal++; console.error("✗ " + msg); } }

const DIV = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "data", "divisiones.json"), "utf8"));

/* --- el data de divisiones calza con master.js --- */
const ids = Ma.DIVISIONES.map(d => d.id);
assert(ids.every(id => DIV.divisiones[id]), "cada división de master.js tiene rivales en divisiones.json");
ids.forEach(id => {
  const d = DIV.divisiones[id];
  assert(d.rivales.length === 9, id + ": 9 rivales (+vos = 10 equipos)");
  assert(new Set(d.rivales).size === 9, id + ": sin rivales repetidos");
});

/* --- fixture del círculo --- */
const eqs = ["VOS"].concat(DIV.divisiones.primera_b.rivales);
const fx = T.fixture(eqs);
assert(fx.length === 18, "10 equipos → 18 fechas (ida y vuelta)");
fx.forEach((ps, f) => {
  const vistos = new Set();
  ps.forEach(p => {
    assert(!vistos.has(p.local) && !vistos.has(p.visita), "fecha " + f + ": nadie juega dos veces");
    vistos.add(p.local); vistos.add(p.visita);
  });
  assert(vistos.size === 10, "fecha " + f + ": juegan los 10");
});
/* ida y vuelta: cada cruce existe una vez por lado */
const cruces = {};
fx.forEach(ps => ps.forEach(p => {
  const k = p.local + "|" + p.visita;
  cruces[k] = (cruces[k] || 0) + 1;
}));
assert(Object.keys(cruces).length === 90 && Object.values(cruces).every(v => v === 1),
  "90 cruces distintos, cada uno una vez (ida y vuelta con localía invertida)");

/* --- temporada: mi resultado entra, el resto se simula determinista --- */
const t1 = T.crear({ division: "primera_b", miClub: "CLUB DE PRUEBA", rivales: DIV.divisiones.primera_b.rivales, semilla: 42 });
const t2 = T.crear({ division: "primera_b", miClub: "CLUB DE PRUEBA", rivales: DIV.divisiones.primera_b.rivales, semilla: 42 });
assert(T.miPartido(t1) !== null, "tengo partido en la fecha 1");
const j1 = T.jugarFecha(t1, 3, 1);
const j2 = T.jugarFecha(t2, 3, 1);
assert(JSON.stringify(j1) === JSON.stringify(j2), "misma semilla → misma fecha simulada (determinista)");
const yo = t1.tabla.find(f => f.equipo === "CLUB DE PRUEBA");
assert(yo.pj === 1 && yo.g === 1 && yo.pts === 3 && yo.gf === 3 && yo.gc === 1, "mi 3-1 entró bien a la tabla");
const t3 = T.crear({ division: "primera_b", miClub: "CLUB DE PRUEBA", rivales: DIV.divisiones.primera_b.rivales, semilla: 99 });
T.jugarFecha(t3, 3, 1);
assert(JSON.stringify(t3.resultados) !== JSON.stringify(t1.resultados), "semilla distinta → resultados ajenos distintos");

/* --- temporada completa: 18 fechas, tabla consistente, veredicto --- */
const t4 = T.crear({ division: "primera_b", miClub: "CLUB DE PRUEBA", rivales: DIV.divisiones.primera_b.rivales, semilla: 7 });
for (let f = 0; f < 18; f++) T.jugarFecha(t4, 2, 0);   // gano todo 2-0
assert(T.terminada(t4), "18 fechas jugadas → terminada");
t4.tabla.forEach(fi => assert(fi.pj === 18, fi.equipo + " jugó 18"));
assert(fila(t4, "CLUB DE PRUEBA").pts === 54, "18 victorias = 54 puntos");
assert(T.miPosicion(t4) === 1, "ganando todo salgo campeón");
const v = T.veredicto(t4, ids);
assert(v.campeon && v.asciende && v.proximaDivision === "primera_a" && !v.gloria, "campeón de la B asciende a la A");
/* campeón del MUNDIAL = la gloria, no asciende a ningún lado */
const t5 = T.crear({ division: "mundial", miClub: "ARGENTINA PAMPA", rivales: DIV.divisiones.mundial.rivales, semilla: 7 });
for (let f = 0; f < 18; f++) T.jugarFecha(t5, 1, 0);
const v5 = T.veredicto(t5, ids);
assert(v5.gloria && !v5.asciende && v5.proximaDivision === "mundial", "campeón del Mundial = LA GLORIA");
/* sin campeonato: misma división */
const t6 = T.crear({ division: "regional", miClub: "CLUB DE PRUEBA", rivales: DIV.divisiones.regional.rivales, semilla: 3 });
for (let f = 0; f < 18; f++) T.jugarFecha(t6, 0, 3);   // pierdo todo
const v6 = T.veredicto(t6, ids);
assert(!v6.campeon && !v6.asciende && v6.proximaDivision === "regional", "sin campeonato repito división (nadie desciende)");

function fila(t, n) { return t.tabla.find(f => f.equipo === n); }

/* consistencia global: suma de GF == suma de GC */
const sgf = t4.tabla.reduce((a, f) => a + f.gf, 0), sgc = t4.tabla.reduce((a, f) => a + f.gc, 0);
assert(sgf === sgc, "los goles a favor y en contra cierran (" + sgf + "=" + sgc + ")");

if (mal === 0) console.log("✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
