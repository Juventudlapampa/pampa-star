/* logic/puesto.js · TU PUESTO, TU NÚMERO Y LA BARRITA (pedido de Rodri del 25/oct).
   Lo que se prueba: los números que se ofrecen por puesto, el lugar en la
   formación, el cambio de número con el compañero, la barrita que sube por lo
   propio del puesto y destraba su perilla, y que una carrera vieja sin puesto
   se sanea sin perder nada y queda pidiendo la pantalla corta. */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const PU = require("../logic/puesto.js");
const SM = require("../logic/save_master.js");
const BAL = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/balance.json"), "utf8"));
const cfg = BAL.puesto, F = BAL.partido.formacion;
let n = 0;
const t = (nombre, fn) => { fn(); n++; };

t("la perilla existe y los números son pocos y con sentido", () => {
  assert.strictEqual(BAL.flags.puesto, true);
  assert.deepStrictEqual(PU.numeros("ATA", cfg), [7, 9, 11]);
  assert.deepStrictEqual(PU.numeros("VOL", cfg), [5, 8, 10]);
  assert.deepStrictEqual(PU.numeros("DEF", cfg), [2, 3, 4, 6]);
  assert.deepStrictEqual(PU.numeros("ARQ", cfg), []);
});

t("elegir valida: lo que no se ofrece no entra", () => {
  const s = {};
  assert.strictEqual(PU.falta(s, cfg), true);
  assert.throws(() => PU.elegir(s, "ATA", 10, cfg));
  assert.throws(() => PU.elegir(s, "ARQ", 1, cfg));
  PU.elegir(s, "VOL", 10, cfg);
  assert.strictEqual(PU.falta(s, cfg), false);
  assert.deepStrictEqual(s.barrita, {});
});

t("el lugar en la formación: con ATA, el mismo de siempre (el 10)", () => {
  const slots = [];
  F.forEach(l => { for (let i = 0; i < l.n; i++) slots.push(l.pos); });
  ["DEF", "VOL", "ATA"].forEach(p => assert.strictEqual(slots[PU.slotDeVos(F, p)], p));
  assert.strictEqual(PU.slotDeVos(F, "ATA") + 1, 10);
});

t("tu número es tuyo y el compañero que lo tenía se queda con el libre", () => {
  ["DEF", "VOL", "ATA"].forEach(p => PU.numeros(p, cfg).forEach(num => {
    const vi = PU.slotDeVos(F, p);
    const arr = PU.numerosDelPlantel(F, vi, num);
    assert.strictEqual(arr[vi], num);
    assert.strictEqual(new Set(arr).size, arr.length, "números repetidos con " + p + " " + num);
    assert.deepStrictEqual(arr.slice().sort((a, b) => a - b), arr.map((x, i) => i + 1));
  }));
  /* delantero con el 9: el que era 9 pasa al 10 que dejaste libre */
  const arr = PU.numerosDelPlantel(F, PU.slotDeVos(F, "ATA"), 9);
  assert.strictEqual(arr[8], 10);
});

t("la barrita sube por lo propio del puesto", () => {
  const b = cfg.barrita;
  assert.strictEqual(PU.puntosDelPartido("ATA", { golesMio: 2, golesRival: 1, golesVos: 2 }, cfg), b.por_partido + 2 * b.por_gol_tuyo);
  assert.strictEqual(PU.puntosDelPartido("VOL", { golesMio: 2, golesRival: 1, golesVos: 0 }, cfg), b.por_partido + b.por_triunfo);
  assert.strictEqual(PU.puntosDelPartido("DEF", { golesMio: 0, golesRival: 0 }, cfg), b.por_partido + b.por_valla_invicta);
  assert.strictEqual(PU.puntosDelPartido("DEF", { golesMio: 3, golesRival: 1 }, cfg), b.por_partido);
});

t("destraba de a una, y la próxima dice cuánto falta", () => {
  const s = PU.elegir({}, "ATA", 9, cfg);
  assert.deepStrictEqual(PU.destrabados(s, cfg), []);
  const d = cfg.destrabes.ATA[0];
  assert.strictEqual(PU.proximo(s, cfg).falta, d.umbral);
  let jugados = 0;
  while (PU.destrabados(s, cfg).length === 0) { PU.sumar(s, { golesMio: 0, golesRival: 1, golesVos: 0 }, cfg); jugados++; }
  assert.ok(jugados > 1, "no se destraba en un partido");
  assert.deepStrictEqual(PU.destrabados(s, cfg), [d.flag]);
  /* la que sigue cuenta desde la anterior, y al final no queda ninguna */
  cfg.destrabes.ATA.slice(1).forEach((d2, k) => {
    const pr = PU.proximo(s, cfg);
    assert.strictEqual(pr.nombre, d2.nombre);
    assert.strictEqual(pr.desde, cfg.destrabes.ATA[k].umbral);
    while (PU.destrabados(s, cfg).length < k + 2) PU.sumar(s, { golesMio: 0, golesRival: 1, golesVos: 0 }, cfg);
  });
  assert.strictEqual(PU.proximo(s, cfg), null);
  assert.strictEqual(PU.destrabados(s, cfg).length, cfg.destrabes.ATA.length);
  /* cada puesto tiene la suya: cambiar de puesto no trae lo del otro */
  PU.elegir(s, "DEF", 2, cfg);
  assert.deepStrictEqual(PU.destrabados(s, cfg), []);
  PU.elegir(s, "ATA", 7, cfg);
  assert.deepStrictEqual(PU.destrabados(s, cfg), cfg.destrabes.ATA.map(x => x.flag));
});

t("cada destrabe prende una perilla que existe y que la poda apagó", () => {
  Object.keys(cfg.destrabes).forEach(p => cfg.destrabes[p].forEach(d => {
    assert.ok(Object.prototype.hasOwnProperty.call(BAL.flags, d.flag), d.flag);
    assert.strictEqual(BAL.flags[d.flag], false, d.flag + " ya está prendida para todos");
  }));
  const f = PU.flagsDelPartido(BAL.flags, ["megatiros_con_nombre"]);
  assert.strictEqual(f.megatiros_con_nombre, true);
  assert.strictEqual(BAL.flags.megatiros_con_nombre, false, "no toca el balance");
});

t("la carrera de Rodri (sin puesto) se sanea entera y queda pidiendo la pantalla", () => {
  const crudo = JSON.parse(fs.readFileSync(path.join(__dirname, "_carrera_rodri_25oct.json"), "utf8"));
  const save = crudo;
  const r = SM.sanear(JSON.stringify(save), null);
  assert.ok(r.save && !r.irrecuperable);
  assert.strictEqual(r.save.club, save.club);
  assert.deepStrictEqual(r.save.titulos, save.titulos);
  assert.strictEqual(PU.falta(r.save, cfg), true);
  PU.elegir(r.save, "ATA", 9, cfg);
  const r2 = SM.sanear(JSON.stringify(r.save), null);
  assert.strictEqual(r2.save.puesto, "ATA");
  assert.strictEqual(r2.save.numero, 9);
  assert.deepStrictEqual(r2.reparado.filter(x => /puesto|barrita/.test(x)), []);
});

t("un puesto o una barrita sin forma se borran sin tocar lo demás", () => {
  const base = JSON.parse(fs.readFileSync(path.join(__dirname, "_carrera_rodri_25oct.json"), "utf8"));
  const roto = Object.assign({}, base, { puesto: "ARQUERO", numero: "nueve", barrita: { ATA: "mucho" } });
  const r = SM.sanear(JSON.stringify(roto), null);
  assert.strictEqual(r.save.puesto, undefined);
  assert.strictEqual(r.save.numero, undefined);
  assert.deepStrictEqual(r.save.barrita, {});
  assert.strictEqual(r.save.club, base.club);
});

console.log("puesto.test.js: " + n + " ok");
