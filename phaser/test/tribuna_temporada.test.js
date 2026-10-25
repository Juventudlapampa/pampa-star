/* ============================================================================
   PAMPA STAR · en una temporada Nelda y el Tuli no repiten, y en una carrera
   las ceremonias tampoco
   Corré:  node phaser/test/tribuna_temporada.test.js

   Pedido de Rodri del 25/oct: la tribuna tenía pocos intercambios para 18
   fechas y las ceremonias alternaban dos frases. Ahora en una fecha de la
   carrera la memoria de lo dicho viene del save (masterPartido.tribuna) y
   vuelve con el resultado; cada evento habla a lo sumo
   balance.tribuna.tope_por_partido veces por partido, y si no queda nada
   nuevo que valga para ese marcador, se callan. Las ceremonias dicen su
   lista en orden, contando las anteriores en el historial.

   Acá se juegan temporadas simuladas enteras (CORTA de 9 fechas y LARGA de
   18) con la tribuna de verdad (scenes/tribuna_ui.js) y una escena falsa con
   marcador, y se mide: que ningún intercambio salga dos veces en la misma
   temporada y cuántas veces se quedaron sin nada nuevo que decir.
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

let ok = 0, mal = 0;
function assert(cond, msg) { if (cond) ok++; else { mal++; console.error("  ✗ " + msg); } }

const RAIZ = path.join(__dirname, "..", "..");
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), "utf8");
const TRIBUNA = JSON.parse(leer("data/tribuna.json"));
const FINAL = JSON.parse(leer("data/final.json"));
const BAL = JSON.parse(leer("phaser/data/balance.json"));
global.window = { PF: { texto: "texto" } };
require("../scenes/tribuna_ui.js");
const T = window.PampaTribunaUI;
const Fi = require("../logic/final.js");
const SM = require("../logic/save_master.js");

function semilla(s) {
  let a = s >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function objeto() {
  return {
    x: 0, y: 0, alpha: 1, texto: "",
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setAlpha(a) { this.alpha = a; return this; },
    setVisible() { return this; }, setText(s) { this.texto = s; return this; },
    setTexture() { return this; }, setScale() { return this; },
    getBounds() { return { x: this.x, y: this.y, right: this.x, bottom: this.y, width: 0, height: 0 }; }
  };
}
function escena(memoria, quedan) {
  return {
    estado: "LIBRE", BAL: BAL,
    _masterPartido: memoria ? { tribuna: memoria, fechasQuedan: quedan } : null,
    st: { golesMio: 0, golesRival: 0, minuto: 0, mios: [{ nombre: "Rulo" }], goleador: 0 },
    game: { registry: { get: k => (k === "tribuna" ? TRIBUNA : null) } },
    add: {
      container() { const c = objeto(); c.list = []; c.add = a => { c.list.push(...a); return c; }; return c; },
      graphics() {
        const g = objeto();
        ["fillStyle", "lineStyle", "strokeRoundedRect", "fillTriangle", "strokeCircle", "fillCircle", "fillRoundedRect", "clear"].forEach(m => { g[m] = () => g; });
        return g;
      },
      image: objeto, text: objeto
    },
    textures: { exists: () => false },
    time: { delayedCall: () => ({ remove() { } }) },
    tweens: { add() { }, killTweensOf() { } }
  };
}

/* UN PARTIDO: 30 momentos con lo que comenta la tribuna, los goles mueven el
   marcador antes de comentarse (como en match.js), el apuro del final y el
   pitazo. Cada evento lleva la jugada del relator que lo dispara. */
const QUITES = ["quite_win", "corte_win", "bloqueo_win"];
const ERRORES = ["corte", "pared_lose", "defensa_lose", "gambeta_lose", "afuera"];
function partido(sc, rng, oir) {
  const st = sc.st;
  for (let m = 3; m <= 90; m += 3) {
    st.minuto = m;
    const r = rng();
    if (r < 0.25) oir("quite", QUITES[Math.floor(rng() * 3)]);
    else if (r < 0.50) oir("error", ERRORES[Math.floor(rng() * 5)]);
    else if (r < 0.58) oir("atajada_rival", "atajada");
    else if (r < 0.64) oir("atajada", "arquero_mio");
    else if (r < 0.70) oir("falta_a_favor", "falta_a_favor");
    else if (r < 0.76) oir("falta_en_contra", "falta_en_contra");
    else if (r < 0.78) oir("penal_a_favor", "penal_a_favor");
    else if (r < 0.80) oir("penal_en_contra", "penal_en_contra");
    else if (r < 0.88) { st.golesMio++; oir(rng() < 0.4 ? "gol_companero" : "gol", "gol"); }
    else if (r < 0.95) { st.golesRival++; oir("gol_rival", "gol_rival"); }
    if (m >= 60 && rng() < 0.1) oir("cansancio");
  }
  st.minuto = 86;
  const dif = st.golesMio - st.golesRival;
  oir(dif > 0 ? "ganando_final" : dif < 0 ? "perdiendo_final" : "empate", "urgente");
  st.minuto = 92;
  oir(dif > 0 ? "resultado_gana" : dif < 0 ? "resultado_pierde" : "resultado_empate", "final");
}
/* UNA TEMPORADA: la memoria pasa de fecha en fecha como lo hace el save */
/* reparto: el partido sabe cuántas fechas quedan (masterPartido.fechasQuedan) */
function temporada(fechas, s, reparto) {
  const rng = semilla(s);
  let memoria = {};
  const dichos = new Map();
  let ocasiones = 0, callados = 0, repetidos = 0, pedidos = 0, mudos = 0;
  const calladosPor = {};
  for (let f = 0; f < fechas; f++) {
    const sc = escena(memoria, reparto ? fechas - f : undefined);
    T.montar(sc);
    const t = sc._tribuna;
    const pedidoAca = {};
    partido(sc, rng, (evento, jugada) => {
      pedidoAca[evento] = true;
      if ((t.dichos[evento] || 0) >= t.tope[evento]) return;
      ocasiones++;
      if (!T.comentar(sc, evento, jugada)) { callados++; calladosPor[evento] = (calladosPor[evento] || 0) + 1; return; }
      const clave = evento + "#" + t.ultimo[evento];
      if (dichos.has(clave)) repetidos++;
      dichos.set(clave, true);
    });
    /* lo que vuelve con el resultado y el save guarda (y sanear deja pasar) */
    memoria = JSON.parse(JSON.stringify(t.usados));
    /* un evento que se pidió en la fecha y no dijo nada: la tribuna muda */
    Object.keys(pedidoAca).forEach(e => { pedidos++; if (!t.dichos[e]) mudos++; });
  }
  return { ocasiones, callados, repetidos, calladosPor, fechas, pedidos, mudos };
}

/* ---------- [1] los topes de balance cubren cada evento de la data ---------- */
(function () {
  const tope = (BAL.tribuna || {}).tope_por_partido || {};
  TRIBUNA.dialogos.forEach(d => assert(Number.isInteger(tope[d.evento]) && tope[d.evento] >= 1,
    "balance.tribuna.tope_por_partido tiene el evento " + d.evento));
  console.log("[1] los " + TRIBUNA.dialogos.length + " eventos tienen su tope por partido");
})();

/* ---------- [2] ni un intercambio repetido en una temporada, CORTA ni LARGA ---------- */
const N = 200;
const medir = (fechas, reparto) => {
  const t = { ocasiones: 0, callados: 0, repetidos: 0, calladosPor: {}, pedidos: 0, mudos: 0 };
  for (let s = 1; s <= N; s++) {
    const r = temporada(fechas, 9000 + s, reparto);
    t.ocasiones += r.ocasiones; t.callados += r.callados; t.repetidos += r.repetidos;
    t.pedidos += r.pedidos; t.mudos += r.mudos;
    Object.keys(r.calladosPor).forEach(e => { t.calladosPor[e] = (t.calladosPor[e] || 0) + r.calladosPor[e]; });
  }
  return t;
};
const VUELTAS = require("../logic/temporada.js").VUELTAS;
const CORTA = medir(VUELTAS.corta * 9);
const LARGA = medir(VUELTAS.larga * 9);
(function () {
  assert(CORTA.repetidos === 0, "SÍNTOMA: en una temporada CORTA salió un intercambio repetido (" + CORTA.repetidos + " en " + N + " temporadas)");
  assert(LARGA.repetidos === 0, "SÍNTOMA: en una temporada LARGA salió un intercambio repetido (" + LARGA.repetidos + " en " + N + " temporadas)");
  console.log("[2] " + N + " temporadas CORTAS y " + N + " LARGAS sin un intercambio repetido");
})();

/* ---------- [3] y alcanzan: casi nunca se quedan sin nada nuevo que decir ---------- */
(function () {
  const pct = t => 100 * t.callados / t.ocasiones;
  const peores = t => Object.keys(t.calladosPor).sort((a, b) => t.calladosPor[b] - t.calladosPor[a]).slice(0, 3)
    .map(e => e + " " + t.calladosPor[e]).join(", ");
  console.log("    CORTA: " + CORTA.callados + " silencios en " + CORTA.ocasiones + " ocasiones (" + pct(CORTA).toFixed(2) + "%)");
  console.log("    LARGA: " + LARGA.callados + " silencios en " + LARGA.ocasiones + " ocasiones (" + pct(LARGA).toFixed(2) + "%; " + peores(LARGA) + ")");
  assert(pct(CORTA) <= 0.5, "SÍNTOMA: en la CARRERA CORTA la tribuna se queda sin frases nuevas en más del 0,5% de las veces (" + pct(CORTA).toFixed(2) + "%)");
  assert(pct(LARGA) <= 3, "SÍNTOMA: en la CARRERA LARGA la tribuna se queda sin frases nuevas en más del 3% de las veces (" + pct(LARGA).toFixed(2) + "%: " + peores(LARGA) + ")");
  console.log("[3] la data alcanza para la temporada");
})();

/* ---------- [4] la memoria viaja: save → partido → resultado → save ---------- */
(function () {
  const MASTER = leer("phaser/scenes/master.js"), MATCH = leer("phaser/scenes/match.js");
  assert(/tribuna: this\.save\.tribuna && this\.save\.tribuna\.temporadaN === c\.temporadaN/.test(MASTER),
    "irALaCancha manda al partido lo dicho en ESTA temporada (la de otra temporada no cuenta)");
  assert(/this\.save\.tribuna = \{ temporadaN: res\.temporadaN, usados: res\.tribuna \}/.test(MASTER), "el resultado de la fecha guarda en el save lo que dijo la tribuna");
  /* el resultado se anota en el save al pitazo (resultadoPendiente) y tiene que
     llevarla: en el navegador, la primera vez, la memoria se perdía ahí */
  const S = require("../logic/semana.js");
  const sv = { temporadaN: 1, temporada: { fecha: 0 } };
  S.anotarResultado(sv, { temporadaN: 1, fecha: 0, golesMio: 1, golesRival: 0, tribuna: { gol: [2], error: [5] } });
  assert(sv.resultadoPendiente && sv.resultadoPendiente.tribuna && sv.resultadoPendiente.tribuna.gol[0] === 2,
    "el resultado anotado al pitazo lleva lo que dijo la tribuna (" + JSON.stringify(sv.resultadoPendiente) + ")");
  assert(/tribuna: \(this\._tribuna && this\._tribuna\.usados\) \|\| null/.test(MATCH), "el resultado del partido lleva lo que dijo la tribuna");
  /* sanear: una memoria con forma pasa, una rota se olvida */
  const base = () => ({ v: 1, club: "Toay", division: "primera_b", temporadaN: 1, titulos: [], bolsaEventos: [], racha: 0,
    temporada: { division: "primera_b", miClub: "Toay", semilla: 1, fixture: [[{ local: "Toay", visita: "Espejo de Sal" }]],
      tabla: [{ equipo: "Toay", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 }, { equipo: "Espejo de Sal", pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 }], fecha: 0, resultados: [] } });
  const bueno = base(); bueno.tribuna = { temporadaN: 1, usados: { gol: [3, 0], error: [] } };
  const sb = SM.sanear(bueno).save;
  assert(sb.tribuna && sb.tribuna.usados.gol.length === 2, "sanear deja pasar la memoria de la tribuna con forma");
  const roto = base(); roto.tribuna = { temporadaN: 1, usados: { gol: ["x"] } };
  const sr = SM.sanear(roto).save;
  assert(sr && sr.tribuna === undefined, "sanear olvida una memoria de la tribuna rota");
  /* en el partido rápido no hay memoria: la rueda de siempre */
  const sc = escena(null); T.montar(sc);
  assert(sc._tribuna.usados === null, "en el partido rápido no hay memoria de temporada");
  console.log("[4] la memoria va del save al partido y vuelve con el resultado");
})();

/* ---------- [5] las ceremonias: en una carrera no se repite una frase ---------- */
(function () {
  const C = FINAL.ceremonias;
  /* una carrera larga y accidentada: sube, baja, vuelve, gana el Mundial y
     defiende como leyenda nueve veces */
  const fila = tipo => ({ campeon: tipo !== "descenso", asciende: tipo === "titulo", desciende: tipo === "descenso",
    gloria: tipo === "gloria", defendido: tipo === "defendido" });
  const carrera = ["titulo", "descenso", "titulo", "titulo", "descenso", "titulo", "titulo", "titulo", "gloria"]
    .concat(Array(9).fill("defendido"));
  const save = { historial: [] };
  const vistas = {};
  carrera.forEach(tipo => {
    assert(Fi.ceremoniaDe(fila(tipo)) === tipo, "control: la fila del historial de " + tipo + " se reconoce");
    const v = Fi.vueltaDeCeremonia(save, tipo);
    ["dice", "tribuna"].forEach(campo => {
      const lista = C[tipo][campo];
      const k = tipo + "." + campo + "#" + (v % lista.length);
      assert(!vistas[k], "SÍNTOMA: la ceremonia " + tipo + " repite " + campo + " en la carrera (la " + (v + 1) + "ª de ese tipo)");
      vistas[k] = true;
    });
    save.historial.push(fila(tipo));
  });
  assert(/Fi\.vueltaDeCeremonia\(this\.save, tipo\)/.test(leer("phaser/scenes/ceremonia_ui.js")), "la escena elige la frase con vueltaDeCeremonia");
  console.log("[5] en una carrera con 6 títulos, 2 descensos, el Mundial y 9 defendidos no se repite una frase de ceremonia");
})();

/* ---------- [6] y hablan: lo que queda sin decir se reparte entre las fechas que faltan ----------
   Revisión del 25/oct: con el tope fijo, dos partidos enteros con piloto
   tuvieron 16 y 22 pedidos a la tribuna y 5 dichos en cada uno (el error se
   pidió de 7 a 11 veces y salió una). Con balance.tribuna.reparto_por_temporada
   cada evento puede decir, en cada fecha, lo que le queda dividido las fechas
   que faltan (el tope de balance es el piso). Rodri pidió más frases: tienen
   que escucharse más, sin repetir en la temporada y sin quedarse sin nada. */
(function () {
  assert(BAL.tribuna.reparto_por_temporada === true, "la perilla balance.tribuna.reparto_por_temporada está prendida");
  const dichos = t => t.ocasiones - t.callados;
  const C2 = medir(VUELTAS.corta * 9, true), L2 = medir(VUELTAS.larga * 9, true);
  const pct = t => 100 * t.callados / t.ocasiones;
  console.log("    con reparto, por partido: CORTA " + (dichos(C2) / N / (VUELTAS.corta * 9)).toFixed(1) + " dichos (antes " + (dichos(CORTA) / N / (VUELTAS.corta * 9)).toFixed(1) +
    "), LARGA " + (dichos(L2) / N / (VUELTAS.larga * 9)).toFixed(1) + " (antes " + (dichos(LARGA) / N / (VUELTAS.larga * 9)).toFixed(1) + ")");
  const peores = t => Object.keys(t.calladosPor).sort((a, b) => t.calladosPor[b] - t.calladosPor[a]).slice(0, 3)
    .map(e => e + " " + t.calladosPor[e]).join(", ");
  console.log("    silencios: CORTA " + pct(C2).toFixed(2) + "% (" + peores(C2) + "), LARGA " + pct(L2).toFixed(2) + "% (" + peores(L2) + ")");
  assert(C2.repetidos === 0 && L2.repetidos === 0, "SÍNTOMA: con reparto salió un intercambio repetido en la temporada (" + C2.repetidos + " y " + L2.repetidos + ")");
  assert(dichos(C2) >= 1.5 * dichos(CORTA), "SÍNTOMA DE LA TRIBUNA MUDA: en la CARRERA CORTA el reparto tiene que hablar al menos 1,5 veces lo del tope fijo (" + dichos(C2) + " contra " + dichos(CORTA) + ")");
  assert(dichos(L2) > dichos(LARGA), "en la CARRERA LARGA el reparto habla más que el tope fijo (" + dichos(L2) + " contra " + dichos(LARGA) + ")");
  /* con reparto un error de una jugada puede no tener frase propia y callarse,
     y el siguiente error del partido habla: lo que cuenta es el evento que se
     pidió en la fecha y no dijo nada */
  const muda = t => 100 * t.mudos / t.pedidos;
  console.log("    eventos pedidos que no dijeron nada en la fecha: CORTA " + muda(C2).toFixed(2) + "% (antes " + muda(CORTA).toFixed(2) + "%), LARGA " + muda(L2).toFixed(2) + "% (antes " + muda(LARGA).toFixed(2) + "%)");
  assert(muda(C2) <= muda(CORTA) + 0.5 && muda(L2) <= muda(LARGA) + 0.5,
    "SÍNTOMA: con reparto la tribuna se queda muda en más fechas que con el tope fijo (" + muda(C2).toFixed(2) + "% y " + muda(L2).toFixed(2) + "%)");
  const MASTER = leer("phaser/scenes/master.js");
  assert(/fechasQuedan: this\.save\.temporada\.fixture\.length - this\.save\.temporada\.fecha/.test(MASTER),
    "irALaCancha manda al partido cuántas fechas quedan, esta incluida");
  console.log("[6] con reparto la tribuna habla más, sin repetir y sin quedarse sin frases");
})();

if (mal === 0) console.log("\n✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("\n✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
