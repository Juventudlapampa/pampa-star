/* logic/pared.js · LA PARED ESPECIAL (pedido de Rodri del 25/oct): la pasás
   al de mejor pase cerca, picás al área, te la tira y rematás con EL TOQUE.
   Lo que se prueba: cuándo se ofrece, quién te la devuelve, que gasta aguante,
   que te deja en el área para que el centro termine en EL TOQUE, y que no se
   gana siempre. */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const P = require("../logic/partido.js");
const F = require("../logic/flujo.js");
const PA = require("../logic/pared.js");
const BAL = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/balance.json"), "utf8"));
const C = BAL.pared;
let n = 0;
const t = (nombre, fn) => { fn(); n++; };

function semilla(s) {
  let a = s >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let q = Math.imul(a ^ (a >>> 15), 1 | a);
    q = (q + Math.imul(q ^ (q >>> 7), 61 | q)) ^ q;
    return ((q ^ (q >>> 14)) >>> 0) / 4294967296;
  };
}
/* VOS con la pelota en tres cuartos de cancha, un volante cerca y otro lejos */
function partido(rng) {
  const mios = [], rivales = [];
  const forma = [["ARQ", 30], ["DEF", 190], ["DEF", 190], ["DEF", 190], ["DEF", 190], ["VOL", 460], ["VOL", 460], ["VOL", 460], ["ATA", 730], ["ATA", 730], ["ATA", 730]];
  forma.forEach(([pos, ax], i) => {
    const st = { pase: 60, tiro: 60, gambeta: 60, aereo: 60, quite: 60, velocidad: 60, resistencia: 60, fisico: 60, caracter: 60 };
    mios.push({ nombre: "M" + i, pos, stats: Object.assign({}, st), esVos: i === 9 });
    rivales.push({ nombre: "R" + i, pos, stats: Object.assign({}, st) });
  });
  const st = P.crearPartido({ bal: BAL, mios, rivales, rng });
  st.posesion = "mia"; st.modo = "juego"; st.ctrl = 9;
  const vos = st.mios[9]; vos.x = 760; vos.y = 300; vos.aguante = 1000;
  st.mios.forEach((j, i) => { if (i !== 9) { j.x = 200; j.y = 100; } });
  st.mios[6].x = 820; st.mios[6].y = 420; st.mios[6].stats.pase = 80;   // el de mejor pase, cerca
  st.mios[7].x = 700; st.mios[7].y = 200; st.mios[7].stats.pase = 65;   // cerca, peor pase
  st.mios[5].x = 300; st.mios[5].y = 300; st.mios[5].stats.pase = 99;   // el mejor, pero lejos
  st.rivales.forEach(r => { r.x = r.pos === "ARQ" ? st.W - 20 : 100; r.y = 340; });
  st.pelota.x = vos.x + 12; st.pelota.y = vos.y;
  return st;
}

t("te la devuelve el de mejor pase CERCA, y se ofrece con aguante y del medio para adelante", () => {
  const st = partido(semilla(1));
  const d = PA.disponible(st, C);
  assert.ok(d);
  assert.strictEqual(d.companero, 6);
  assert.ok(d.pct >= C.min && d.pct <= C.max && d.pctCentro >= C.centro_min && d.pctCentro <= C.centro_max);
  st.mios[9].aguante = C.costo - 1;
  assert.strictEqual(PA.disponible(st, C), null, "sin aguante no hay pared");
  st.mios[9].aguante = 1000; st.mios[9].x = st.W * C.desde_frac - 10;
  assert.strictEqual(PA.disponible(st, C), null, "en campo propio no se ofrece");
  const st2 = partido(semilla(1)); st2.posesion = "rival";
  assert.strictEqual(PA.disponible(st2, C), null);
  const st3 = partido(semilla(1)); st3.ctrl = 8; st3.mios[8].x = 760;
  assert.strictEqual(PA.disponible(st3, C), null, "la pared especial es tuya");
  assert.throws(() => PA.resolver(st3, C, semilla(2)));
});

t("las marcas cerca la hacen más difícil", () => {
  const st = partido(semilla(1));
  const libre = PA.disponible(st, C).pct;
  st.rivales[2].x = st.mios[9].x + 20; st.rivales[2].y = st.mios[9].y;
  st.rivales[3].x = st.mios[6].x + 20; st.rivales[3].y = st.mios[6].y;
  assert.strictEqual(PA.disponible(st, C).pct, Math.max(C.min, libre - 2 * C.por_marca));
});

t("ganada: gasta aguante, picás al área y el centro termina en EL TOQUE", () => {
  let vistas = 0;
  for (let s = 1; s < 60 && vistas < 3; s++) {
    const rng = semilla(s), st = partido(rng);
    const r = PA.resolver(st, C, rng);
    assert.strictEqual(st.mios[9].aguante, 1000 - C.costo);
    if (!r.win) { assert.strictEqual(st.posesion, "rival"); continue; }
    assert.strictEqual(st.ctrl, 6, "el compañero la tiene para tirar el centro");
    assert.ok(F.enZona(st, st.mios[9]), "picaste al área");
    const c = F.resolverCentro(st, r.vosIdx, r.pctCentro, rng);
    if (c.win) {
      assert.strictEqual(st.ctrl, 9);
      assert.ok(c.toque, "el centro a VOS en el área va a EL TOQUE");
      vistas++;
    }
  }
  assert.ok(vistas >= 1);
});

t("no se gana siempre ni se pierde siempre", () => {
  let gana = 0;
  const N = 600;
  for (let s = 1; s <= N; s++) {
    const rng = semilla(s * 7), st = partido(rng);
    const r = PA.resolver(st, C, rng);
    if (r.win && F.resolverCentro(st, r.vosIdx, r.pctCentro, rng).win) gana++;
  }
  const pct = gana / N;
  assert.ok(pct > 0.25 && pct < 0.8, "llega al remate el " + Math.round(pct * 100) + "%");
});

t("el súper tiro sale solo si la clavás en el momento justo", () => {
  assert.strictEqual(PA.esSuperTiro({ res: { contacto: true, calidad: C.super_calidad } }, C), true);
  assert.strictEqual(PA.esSuperTiro({ res: { contacto: true, calidad: C.super_calidad - 0.01 } }, C), false);
  assert.strictEqual(PA.esSuperTiro({ res: { contacto: false, calidad: 0 } }, C), false);
  assert.strictEqual(BAL.flags.pared_especial, false, "apagada para todos: la prende la barrita");
  ["ATA", "VOL"].forEach(p => assert.ok(BAL.puesto.destrabes[p].some(d => d.flag === "pared_especial"), p));
});

console.log("pared.test.js: " + n + " ok");
