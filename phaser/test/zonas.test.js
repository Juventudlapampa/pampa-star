/* ============================================================================
   PAMPA STAR · phaser/test/zonas.test.js — EL PELO Y LA PIEL POR ZONAS

   Pedido de Rodri del 25/oct, con la captura del editor (Flequillo, piel
   morena, pelo rubio: el pelo salía rubio arriba y negro abajo): "que tenga
   sentido el pelo y la piel, todo mezclado". El teñido viejo cambiaba un
   solo tono por zona; ahora cada ilustración de VOS tiene una máscara con
   la zona entera (herramientas/mascaras_zonas.py) y cada color es una
   rampa [sombra, medio, brillo] (logic/avatar.js, RAMPAS).

   [1] las rampas, fijas, con el medio igual a la muestra del editor
   [2] el mapa de degradé: la luz de la ilustración elige el tono
   [3] cada combinación cara x pelo x piel tiene su máscara, del tamaño de
       la ilustración, con solo los cuatro grises y las zonas que declara
   [4] las opciones que no tienen sentido no aparecen
   [5] la misma pinta: con el Original de tu cara, las poses genéricas
       llevan los colores de tu cara
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

let ok = 0, mal = 0;
function assert(cond, msg) { if (cond) ok++; else { mal++; console.error("  ✗ " + msg); } }

const RAIZ = path.join(__dirname, "..", "..");
const json = (r) => JSON.parse(fs.readFileSync(path.join(RAIZ, r), "utf8"));
const A = require("../logic/avatar.js");
const CARAS = json("data/caras_manifest.json");
const POSES = json("data/poses_manifest.json");
const ZM = json("data/zonas_manifest.json");
const Z = ZM.imagenes;
A.setCatalogoManifest(A.configDeCaras(CARAS));

const hexRGB = (h) => { const v = parseInt(String(h).slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
const luma = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];

/* ---------- [1] LAS RAMPAS ---------- */
(function () {
  const FIJAS = {
    pelo: {
      negro: ["#0a0807", "#1c1613", "#3d342e"],
      castano: ["#26170a", "#4a2e15", "#7a5532"],
      rubio: ["#8c6a12", "#c9a227", "#f0d77a"],
      colorado: ["#6b2410", "#a53f1f", "#d9703f"],
      canoso: ["#77736a", "#b9b4a8", "#ebe8e1"]
    },
    piel: {
      clara: ["#c48a64", "#e9b58c", "#f8d6b8"],
      triguena: ["#9a6740", "#c68e5f", "#e0ae82"],
      morena: ["#663e26", "#8d5a3a", "#b07a56"],
      oscura: ["#3f2515", "#5f3a24", "#83563a"]
    },
    camiseta: {
      "Celeste titular": ["#2a87b8", "#4FC3F7", "#a8e2fb"],
      "Celeste profundo": ["#1a6e9c", "#2FA8E0", "#86cdee"],
      "Blanco pampa": ["#a9bcc8", "#E8F4FA", "#ffffff"],
      "Verde caldén": ["#1a4d1d", "#2E7D32", "#5fa863"],
      "Bordó salitral": ["#4a121e", "#7B2233", "#a94a5c"],
      "Naranja atardecer": ["#a84a17", "#E8712F", "#f6a36f"],
      "Violeta jarilla": ["#41246a", "#6A3FA0", "#9a74c8"],
      "Amarillo trigo": ["#a8851a", "#E8C33A", "#f6e08a"],
      "Negro tranquera": ["#0e0e0e", "#232323", "#4a4a4a"],
      "Naranja rival": ["#c4561f", "#FF8A50", "#ffbe94"]
    }
  };
  assert(JSON.stringify(A.RAMPAS) === JSON.stringify(FIJAS), "las rampas de logic/avatar.js son las fijadas el 25/oct");
  A.CATALOGO.colores_pelo.forEach((c) => {
    const r = A.RAMPAS.pelo[c.id];
    assert(r && r[1].toLowerCase() === c.hex.toLowerCase(), "pelo " + c.n + ": el medio de la rampa es la muestra del editor (" + (r && r[1]) + " / " + c.hex + ")");
  });
  A.CATALOGO.pieles.forEach((c) => {
    const r = A.RAMPAS.piel[c.id];
    assert(r && r[1].toLowerCase() === c.hex.toLowerCase(), c.n + ": el medio de la rampa es la muestra del editor");
  });
  CARAS.camisetas.forEach((c) => {
    const r = A.RAMPAS.camiseta[c.n];
    assert(r && r[1].toLowerCase() === c.hex.toLowerCase(), "camiseta " + c.n + ": tiene rampa y su medio es el de la muestra");
  });
  assert(A.RAMPAS.camiseta["Naranja rival"][1].toLowerCase() === "#ff8a50", "el naranja rival es el 0xFF8A50 de siempre");
  ["pelo", "piel", "camiseta"].forEach((t) => Object.keys(A.RAMPAS[t]).forEach((n) => {
    const l = A.RAMPAS[t][n].map((h) => luma(hexRGB(h)));
    assert(l[0] < l[1] && l[1] < l[2], t + " " + n + ": la sombra es más oscura que el medio y el medio que el brillo");
  }));
  console.log("[1] " + Object.keys(A.RAMPAS.pelo).length + " pelos, " + Object.keys(A.RAMPAS.piel).length + " pieles y " + Object.keys(A.RAMPAS.camiseta).length + " camisetas con rampa");
})();

/* ---------- [2] EL MAPA DE DEGRADÉ ---------- */
(function () {
  /* la luz del pelo del Flequillo, la de la captura de Rodri */
  const luz = Z.cara_flequillo.zonas.pelo.luz;
  const lut = A.lutDeZona(luz, A.RAMPAS.pelo.rubio);
  const en = (y) => [lut[y * 3], lut[y * 3 + 1], lut[y * 3 + 2]];
  assert(en(0).join() === "0,0,0", "luminancia 0 (la tinta) sigue negra");
  /* con una luz entera, cada punto medido cae justo en su tono */
  const lutE = A.lutDeZona([20, 50, 90], A.RAMPAS.pelo.rubio), enE = (y) => [lutE[y * 3], lutE[y * 3 + 1], lutE[y * 3 + 2]].join();
  assert(enE(50) === hexRGB("#c9a227").join(), "el tono base del pelo pasa al rubio de la muestra");
  assert(enE(20) === hexRGB("#8c6a12").join() && enE(90) === hexRGB("#f0d77a").join(), "la sombra y el brillo, a la sombra y al brillo del rubio: la sombra no queda negra");
  let sube = true;
  for (let y = 1; y < 256; y++) if (luma(en(y)) + 0.5 < luma(en(y - 1))) sube = false;
  assert(sube, "más luz en la ilustración, más luz en el color (nunca se invierte)");
  /* teñir de verdad tres píxeles del pelo: sombra, base y brillo medidos */
  const R = Z.cara_flequillo.zonas.pelo.rampa.map(hexRGB);
  const d = new Uint8ClampedArray(16), m = new Uint8ClampedArray(16);
  R.concat([[0, 0, 0]]).forEach((c, i) => { d.set([c[0], c[1], c[2], 255], i * 4); m[i * 4] = 80; });
  m[12] = 0;
  A.tenirZonas(d, m, [lut, null, null]);
  const sal = [0, 1, 2].map((i) => [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]);
  assert(sal.every((c) => c[0] > c[2] + 30), "los tres tonos del pelo salen amarillos (rojo bastante más que azul): " + JSON.stringify(sal));
  assert(luma(sal[0]) < luma(sal[1]) && luma(sal[1]) < luma(sal[2]), "y conservan la luz: sombra, medio y brillo");
  assert(d[12] === 0 && d[13] === 0 && d[14] === 0, "lo que está afuera de la máscara no se toca");
  console.log("[2] el pelo del Flequillo en rubio: " + sal.map((c) => c.join(",")).join(" · "));
})();

/* ---------- [3] CADA COMBINACIÓN CON SU MÁSCARA ---------- */
/* PNG gris de 8 bits (lo que escribe Pillow en modo L): IHDR y los filtros de fila */
function leerPNGGris(ruta) {
  const b = fs.readFileSync(ruta);
  let p = 8, w = 0, h = 0, tipo = -1, prof = 0;
  const idat = [];
  while (p < b.length) {
    const n = b.readUInt32BE(p), t = b.toString("ascii", p + 4, p + 8), dat = b.slice(p + 8, p + 8 + n);
    if (t === "IHDR") { w = dat.readUInt32BE(0); h = dat.readUInt32BE(4); prof = dat[8]; tipo = dat[9]; }
    if (t === "IDAT") idat.push(dat);
    p += 12 + n;
  }
  if (tipo !== 0 || prof !== 8) throw new Error(ruta + ": no es gris de 8 bits (tipo " + tipo + ", " + prof + " bits)");
  const raw = zlib.inflateSync(Buffer.concat(idat)), px = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (w + 1)], o = y * (w + 1) + 1;
    for (let x = 0; x < w; x++) {
      const a = x ? px[y * w + x - 1] : 0, u = y ? px[(y - 1) * w + x] : 0, c = x && y ? px[(y - 1) * w + x - 1] : 0;
      let v = raw[o + x];
      if (f === 1) v += a; else if (f === 2) v += u; else if (f === 3) v += (a + u) >> 1;
      else if (f === 4) { const pp = a + u - c, pa = Math.abs(pp - a), pb = Math.abs(pp - u), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : (pb <= pc ? u : c); }
      px[y * w + x] = v & 255;
    }
  }
  return { w, h, px };
}
/* el tamaño de la ilustración, del encabezado (PNG o WebP) */
function tamDe(ruta) {
  const b = fs.readFileSync(ruta);
  if (b.toString("ascii", 1, 4) === "PNG") return [b.readUInt32BE(16), b.readUInt32BE(20)];
  const t = b.toString("ascii", 12, 16);
  if (t === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (t === "VP8L") { const v = b.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)]; }
  if (t === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  throw new Error(ruta + ": formato desconocido");
}
(function () {
  const CODIGO = { pelo: 80, piel: 160, camiseta: 240 };
  const revisar = (clave, quiere) => {
    const e = Z[clave];
    assert(!!e, clave + ": tiene entrada en data/zonas_manifest.json");
    if (!e) return;
    const ruta = path.join(RAIZ, e.mascara);
    assert(fs.existsSync(ruta), clave + ": la máscara existe (" + e.mascara + ")");
    if (!fs.existsSync(ruta)) return;
    const M = leerPNGGris(ruta), T = tamDe(path.join(RAIZ, e.fuente));
    assert(M.w === T[0] && M.h === T[1] && e.tam[0] === T[0] && e.tam[1] === T[1], clave + ": la máscara mide lo mismo que la ilustración (" + M.w + "x" + M.h + " / " + T.join("x") + ")");
    const cuenta = { 0: 0, 80: 0, 160: 0, 240: 0 }, otros = new Set();
    for (let i = 0; i < M.px.length; i++) { if (M.px[i] in cuenta) cuenta[M.px[i]]++; else otros.add(M.px[i]); }
    assert(otros.size === 0, clave + ": solo los grises de las zonas (" + [...otros].slice(0, 4).join(",") + ")");
    quiere.forEach((z) => {
      assert(!!e.zonas[z] && e.zonas[z].px === cuenta[CODIGO[z]] && cuenta[CODIGO[z]] >= 1000,
        clave + ": la zona " + z + " está y tiene los píxeles que dice el manifiesto (" + cuenta[CODIGO[z]] + ")");
      const L = e.zonas[z] && e.zonas[z].luz;
      assert(L && L[0] < L[1] && L[1] < L[2], clave + ": la luz medida de " + z + " va de la sombra al brillo (" + L + ")");
    });
    Object.keys(e.zonas).forEach((z) => assert(quiere.indexOf(z) >= 0, clave + ": no trae una zona que no se tiñe (" + z + ")"));
  };
  let combos = 0;
  const nPelo = A.CATALOGO.colores_pelo.length, nPiel = A.CATALOGO.pieles.length;
  CARAS.caras.forEach((c) => {
    if (c.en_rotacion === false) return;
    const zonas = ["pelo", "piel", "camiseta"].filter((z) => z !== "pelo" || c.tintes_pelo !== false);
    revisar("cara_" + c.id, zonas);
    for (let tp = 0; tp <= nPelo; tp++) for (let ts = 0; ts <= nPiel; ts++) {
      if (!A.tintePeloValido(c, tp)) continue;
      combos++;
      const e = Z["cara_" + c.id];
      if (tp > 0) assert(e && e.zonas.pelo, c.n + " con pelo " + A.CATALOGO.colores_pelo[tp - 1].n + ": tiene zona de pelo");
      if (ts > 0) assert(e && e.zonas.piel, c.n + " con " + A.CATALOGO.pieles[ts - 1].n + ": tiene zona de piel");
    }
  });
  let poses = 0;
  Object.keys(POSES.poses).forEach((id) => {
    const d = POSES.poses[id];
    if (d.quien !== "heroe" || !d.tonos) return;
    poses++;
    const deCara = d.de_cara && CARAS.caras.find((c) => c.id === d.de_cara);
    revisar("pose_" + id, ["pelo", "piel", "camiseta"].filter((z) => z !== "pelo" || !(deCara && deCara.tintes_pelo === false)));
  });
  assert(combos >= 7 * 5 * 5 - 30, "las combinaciones de retrato son todas las del editor (" + combos + ")");
  console.log("[3] " + combos + " combinaciones de retrato y " + poses + " poses de VOS, cada una con su máscara");
})();

/* ---------- [4] LO QUE NO TIENE SENTIDO NO APARECE ---------- */
(function () {
  const idx = (id) => A.CATALOGO.colores_pelo.findIndex((c) => c.id === id) + 1;
  const cara = (id) => CARAS.caras.find((c) => c.id === id);
  assert(cara("colorado").pelo_propio === "colorado" && !A.tintePeloValido(cara("colorado"), idx("colorado")), "el Colorado no ofrece colorado (ya lo es)");
  assert(A.tintePeloValido(cara("colorado"), idx("rubio")) && A.tintePeloValido(cara("colorado"), idx("canoso")),
    "y desde el teñido por zonas admite rubio y canoso (el bicolor era el teñido viejo)");
  assert(cara("rapado").tintes_pelo === false && [1, 2, 3, 4, 5].every((t) => !A.tintePeloValido(cara("rapado"), t)), "el Rapado no ofrece ningún color de pelo");
  CARAS.caras.filter((c) => c.en_rotacion !== false && c.tintes_pelo !== false).forEach((c) => {
    assert(!!c.pelo_propio && !A.tintePeloValido(c, idx(c.pelo_propio)), c.n + ": dice qué pelo trae y ese color no se repite como opción");
  });
  const ed = fs.readFileSync(path.join(RAIZ, "phaser/scenes/editor.js"), "utf8");
  assert(/"Sin pelo para teñir"/.test(ed) && /"Original \(" \+ propio\.n\.toLowerCase\(\) \+ "\)"/.test(ed),
    "el editor lo explica: \"Sin pelo para teñir\" y \"Original (negro)\"");
  console.log("[4] el Colorado sin colorado, el Rapado sin pelo, y cada Original con el nombre de su color");
})();

/* ---------- [5] LA MISMA PINTA ---------- */
(function () {
  const W = { PampaAvatar: A, __PAMPA_ZONAS: { def: Z, img: {} } };
  new Function("window", "document", fs.readFileSync(path.join(RAIZ, "phaser/scenes/avatar_arte.js"), "utf8"))(W, null);
  const AA = W.PampaAvatarArte;
  const iRulos = CARAS.caras.findIndex((c) => c.id === "rulos"), iClasico = CARAS.caras.findIndex((c) => c.id === "clasico");
  const reg = { get: (k) => (k === "poses" ? POSES : k === "caras" ? CARAS : null) };
  const esc = { game: { registry: reg }, textures: { exists: (k) => k === "pose_remate" || k === "pose_corriendo_rulos" } };
  const Pr = AA.pedidoDeTinte(esc, "remate", { cara: iRulos });
  const piel = Pr && Pr.mapa.find((m) => m.zona === "piel");
  assert(piel && JSON.stringify(piel.rampa) === JSON.stringify(Z.cara_rulos.zonas.piel.rampa),
    "los Rulos en Original: el remate lleva la piel de la cara de los Rulos (" + (Pr && Pr.clave) + ")");
  assert(Pr && /^poseT_remate_o\d+_o\d+_0$/.test(Pr.clave), "y la clave dice que es el Original de esa cara (" + (Pr && Pr.clave) + ")");
  assert(AA.pedidoDeTinte(esc, "remate", { cara: iClasico }) === null, "el Clásico en Original: el remate ya trae sus colores, no se tiñe");
  assert(AA.pedidoDeTinte(esc, "corriendo_rulos", { cara: iRulos }) === null, "la corrida dibujada con los Rulos en Original no se tiñe");
  const Pt = AA.pedidoDeTinte(esc, "remate", { cara: iRulos, tPelo: 3, tPiel: 3 });
  const z = (P, n) => P.mapa.find((m) => m.zona === n);
  const Bt = AA.mapaDeBusto(CARAS.caras[iRulos], { tPelo: 3, tPiel: 3, tCam: 0 }, CARAS);
  assert(Pt && JSON.stringify(z(Pt, "pelo").rampa) === JSON.stringify(Bt.find((m) => m.zona === "pelo").rampa) &&
    JSON.stringify(z(Pt, "piel").rampa) === JSON.stringify(Bt.find((m) => m.zona === "piel").rampa),
    "rubio y morena: el retrato y la pose usan la misma rampa de pelo y de piel");
  console.log("[5] el Original de tu cara viaja a las poses; lo elegido, igual en el retrato y en las poses");
})();

if (mal === 0) console.log("\n✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("\n✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
