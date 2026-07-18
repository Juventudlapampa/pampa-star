/* ============================================================================
   PAMPA STAR · test del avatar por capas (node, sin dependencias)
   Corré:  node phaser/test/avatar.test.js
   ========================================================================== */
"use strict";
var A = require("../logic/avatar.js");

var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.error("  ✗ " + m); } }

/* ---- 1) REGLA DALTONISMO: toda variante tiene NOMBRE, todo color tiene HEX válido ---- */
(function () {
  var C = A.CATALOGO;
  Object.keys(C).forEach(function (cat) {
    C[cat].forEach(function (v, i) {
      ok(typeof v.n === "string" && v.n.length > 1, cat + "[" + i + "] tiene nombre");
      ok(typeof v.id === "string" && v.id.length > 1, cat + "[" + i + "] tiene id");
      if (v.hex != null) ok(/^#[0-9a-f]{6}$/i.test(v.hex), cat + "[" + i + "] hex válido (" + v.hex + ")");
    });
  });
  // los cortes son FORMAS (6 distintas), no tintes: ids únicos
  var ids = C.cortes.map(function (c) { return c.id; });
  ok(new Set(ids).size === ids.length && ids.length >= 5, "cortes: formas distintas (" + ids.length + ")");
  console.log("[1] catálogo etiquetado (daltonismo): ok");
})();

/* ---- 2) validarLook: tolera basura, campos faltantes y fuera de rango ---- */
(function () {
  var l = A.validarLook(null);
  ok(l.piel === 0 && l.corte === 1, "null → defaults");
  var l2 = A.validarLook({ piel: 99, corte: -3, ojos: 2.7, boca: "x" });
  ok(l2.piel < A.CATALOGO.pieles.length && l2.corte >= 0 && l2.ojos === 2 && l2.boca === 0, "clampa índices y basura");
  var l3 = A.validarLook({ piel: 1 });   // save viejo sin los campos nuevos
  ok(l3.colorPelo === 0 && l3.acc === 0 && l3.camiseta === 0, "retrocompatible: campos faltantes → default");
  console.log("[2] validación tolerante: ok");
})();

/* ---- 3) migración del save clásico: los 3×5×3 combos dan looks válidos ---- */
(function () {
  for (var pi = 0; pi < 3; pi++) for (var pe = 0; pe < 5; pe++) for (var ca = 0; ca < 3; ca++) {
    var l = A.migrarDelClasico({ piel: pi, pelo: pe, camiseta: ca });
    var v = A.validarLook(l);
    ok(JSON.stringify(l) === JSON.stringify(v), "combo " + pi + "/" + pe + "/" + ca + " válido");
  }
  var vincha = A.migrarDelClasico({ piel: 0, pelo: 4, camiseta: 0 });
  ok(vincha.acc === 1, "el 'largo colorado (vincha)' clásico conserva la VINCHA");
  ok(A.migrarDelClasico({ piel: 0, pelo: 1, camiseta: 1 }).camiseta === 1, "franjas clásicas → banda (las franjas son del rival)");
  ok(A.migrarDelClasico(null) === null, "sin look clásico → null (usar procedural)");
  console.log("[3] migración del clásico: ok");
})();

/* ---- 4) procedural: determinista, variado y siempre válido ---- */
(function () {
  var a = A.lookProcedural("Delfina Roldán"), b = A.lookProcedural("Delfina Roldán");
  ok(JSON.stringify(a) === JSON.stringify(b), "misma semilla → mismo look");
  var distintos = new Set();
  ["Pichi", "El Profe", "Delfina", "Bagual", "Colo", "Turco", "Flaca", "Rulo"].forEach(function (n) {
    var l = A.lookProcedural(n);
    ok(JSON.stringify(l) === JSON.stringify(A.validarLook(l)), "procedural válido (" + n + ")");
    distintos.add(l.piel + "-" + l.corte + "-" + l.colorPelo);
  });
  ok(distintos.size >= 4, "hay variedad entre 8 NPCs (" + distintos.size + " combos)");
  console.log("[4] procedural determinista: ok");
})();

/* ---- 5) resolver + label + hex ---- */
(function () {
  var r = A.resolver({ piel: 2, corte: 3, colorPelo: 0, acc: 3 });
  ok(r.piel.n === "Piel morena" && r.corte.id === "rulos", "resolver da piezas con nombre");
  ok(r.conVincha && r.conMunequeras, "acc 'ambas' resuelve vincha+muñequeras");
  var lbl = A.lookLabel({ piel: 2, corte: 3, colorPelo: 0, acc: 1 });
  ok(lbl.indexOf("Piel morena") >= 0 && lbl.indexOf("Vincha") >= 0, "label legible: " + lbl);
  ok(A.hexNum("#e9b58c") === 0xe9b58c, "hexNum parsea");
  console.log("[5] resolver/label/hex: ok");
})();

/* [6] V7 fix editor: lookParaBloques — el muñequito insinúa la cara + tintes */
(function () {
  var caraRulos = { tonos: { pelo: "#332222", piel: "#cc9966" }, corte_bloques: "rulos" };
  var caraColorado = { tonos: { pelo: "#ff4422", piel: "#ffeedd" }, corte_bloques: "corto" };
  var caraRapado = { tonos: { pelo: "#885533", piel: "#885533" }, corte_bloques: "rapado" };
  /* Original puro: piel/pelo salen de la ILUSTRACIÓN (tono más cercano) */
  var b1 = A.lookParaBloques({ cara: 1, tPiel: 0, tPelo: 0 }, caraRulos);
  ok(A.CATALOGO.cortes[b1.corte].id === "rulos", "bloques: corte insinúa la cara (rulos)");
  ok(A.CATALOGO.pieles[b1.piel].id === "triguena", "bloques: piel de la ilustración (cc9966→trigueña)");
  var b2 = A.lookParaBloques({ cara: 4, tPiel: 0, tPelo: 0 }, caraColorado);
  ok(A.CATALOGO.colores_pelo[b2.colorPelo].id === "colorado", "bloques: pelo de la ilustración (ff4422→colorado)");
  /* tintes elegidos MANDAN sobre la ilustración */
  var b3 = A.lookParaBloques({ cara: 1, tPiel: 4, tPelo: 3 }, caraRulos);
  ok(b3.piel === 3 && b3.colorPelo === 2, "bloques: los tintes elegidos mandan");
  /* rapado (pelo==piel): la regla de pelo no aplica, el corte sí */
  var b4 = A.lookParaBloques({ cara: 3, tPiel: 0, tPelo: 0 }, caraRapado);
  ok(A.CATALOGO.cortes[b4.corte].id === "rapado", "bloques: rapado conserva su corte");
  /* sin manifest: no crashea, devuelve el look validado */
  var b5 = A.lookParaBloques({ piel: 2 }, null);
  ok(b5.piel === 2, "bloques: sin caraDef devuelve el look tal cual");
  console.log("[6] lookParaBloques: ok");
})();

console.log("\n" + (fail === 0 ? "✓ TODOS OK" : "✗ HUBO FALLAS") + " — " + pass + " asserts, " + fail + " fallaron.");
process.exit(fail === 0 ? 0 : 1);
