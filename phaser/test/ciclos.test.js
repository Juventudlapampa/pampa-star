/* ============================================================================
   PAMPA STAR · test de LOS CICLOS DE ANIMACIÓN
   Nació de un error real: se cablearon tres cuadros de corrida creyendo que
   venían alineados, y se recortaron con una CAJA COMÚN. Pero la caja común
   alinea el LIENZO, no la FIGURA: los cuadros tenían el pie a distintas
   alturas (68px de deriva), el alto variaba 9,6% y el centro se corría 70px.
   A 120ms eso no se lee como zancada: se lee como rebote y pulso de tamaño.

   Este test mide la FIGURA de cada cuadro (su caja de píxeles opacos) de
   cualquier ciclo declarado en un manifest y falla si:
     · el PISO difiere más de 4px entre cuadros,
     · el ALTO de figura varía más del 3%,
     · el CENTRO DE LA CADERA se corre más del 6% del alto de figura.

   Lo de la cadera no es un detalle: la primera versión de este test medía el
   centro de la CAJA COMPLETA y estaba mal planteado. Al correr, los brazos y
   las piernas se abren y se cierran, así que la caja se ensancha y se angosta
   POR DISEÑO y su centro se mueve aunque el cuerpo esté quieto.

   MEDICIÓN REAL de los dos sets, con la banda de cadera (42-55% del alto):
     set viejo (el que rebotaba): piso 68px · alto 9,6% · cadera 4,33%
     set nuevo (alineado)       : piso  0px · alto 0,0% · cadera 4,51%
   O sea: la cadera se corre CASI IGUAL en los dos. No es lo que separa un
   ciclo roto de uno bueno — eso lo separan el piso y el alto. Ese ~4,4% es la
   inclinación del torso, que es dibujo, no defecto: a la escala del panel
   (figura de 213px) son 9px, medidos en pantalla con el ciclo andando.
   Por eso el tercer criterio queda con tope 6% y en PORCENTAJE, no en píxeles
   (los lienzos cambian de tamaño entre entregas: 739x700 vs 1500x1400). Sirve
   para cazar un cuadro corrido de verdad, no para juzgar la zancada.

   Corré:  node phaser/test/ciclos.test.js
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

let ok = 0, mal = 0;
function assert(cond, msg) { if (cond) ok++; else { mal++; console.error("  ✗ " + msg); } }

const RAIZ = path.join(__dirname, "..", "..");
const TOL_PISO = 4;        // px  · el que de verdad separa un ciclo roto de uno bueno
const TOL_ALTO = 3;        // %   · idem
/* La CADERA se mide en la banda 42-55% de la altura de figura (no en la caja
   completa: los brazos y las piernas se abren al correr y mueven ese centro
   aunque el cuerpo esté quieto).
   El TOPE va en % del alto de figura, no en píxeles: un mismo salto se ve
   distinto según el tamaño del lienzo, y estos cuadros vienen a 1500x1400
   mientras los anteriores venían a 739x700.
   Calibrado con los dos sets reales (ver el comentario de arriba): los dos dan
   ~4,4%, así que 6% caza un cuadro DESPLAZADO de verdad sin castigar la
   inclinación del torso, que es dibujo, no defecto. */
const TOL_CADERA_PCT = 6;
const CADERA_DE = 0.42;    // fracción de la altura de figura donde empieza la cintura
const CADERA_A = 0.55;     // y donde termina

/* ---------- lector de PNG mínimo (sin dependencias) ----------
   Solo necesita el canal alfa, así que descomprime los IDAT con zlib y
   deshace el filtrado por scanline. Soporta color tipo 6 (RGBA, 8 bits),
   que es lo que exporta cualquier herramienta con transparencia. */
function leerPNG(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) return { error: "no es PNG (¿webp con extensión png?)" };
  let p = 8, W = 0, H = 0, bits = 0, tipo = 0, idat = [];
  while (p < buf.length - 8) {
    const len = buf.readUInt32BE(p), tag = buf.toString("ascii", p + 4, p + 8);
    if (tag === "IHDR") {
      W = buf.readUInt32BE(p + 8); H = buf.readUInt32BE(p + 12);
      bits = buf[p + 16]; tipo = buf[p + 17];
    } else if (tag === "IDAT") idat.push(buf.slice(p + 8, p + 8 + len));
    else if (tag === "IEND") break;
    p += 12 + len;
  }
  if (tipo !== 6 || bits !== 8) return { error: "se esperaba RGBA 8 bits (tipo 6), vino tipo " + tipo + " bits " + bits };
  const raw = require("zlib").inflateSync(Buffer.concat(idat));
  const canales = 4, stride = W * canales;
  const px = Buffer.alloc(H * stride);
  let off = 0;
  for (let y = 0; y < H; y++) {
    const filtro = raw[off++];
    const linea = raw.slice(off, off + stride); off += stride;
    const dest = px.slice(y * stride, (y + 1) * stride);
    const prev = y > 0 ? px.slice((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= canales ? dest[i - canales] : 0, b = prev[i], c = i >= canales ? prev[i - canales] : 0;
      let v = linea[i];
      if (filtro === 1) v += a;
      else if (filtro === 2) v += b;
      else if (filtro === 3) v += (a + b) >> 1;
      else if (filtro === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      dest[i] = v & 0xff;
    }
  }
  return { W, H, px };
}

/* la CAJA DE LA FIGURA: los píxeles que de verdad se ven.
   Además devuelve el centro de la BANDA DE CADERA, que es el eje del cuerpo:
   los brazos y las piernas se abren al correr y mueven el centro de la caja
   completa; la cintura, no. */
function cajaFigura(png) {
  const { W, H, px } = png;
  let minX = W, maxX = -1, minY = H, maxY = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (px[(y * W + x) * 4 + 3] > 32) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  if (maxY < 0) return null;
  const alto = maxY - minY + 1;
  /* el centro de la cintura: promedio de los centros de cada fila de la banda
     (promediar por fila pesa igual a toda la cintura y no se lo lleva un brazo
     que asome en una sola línea) */
  const y0 = Math.round(minY + alto * CADERA_DE), y1 = Math.round(minY + alto * CADERA_A);
  let suma = 0, filas = 0;
  for (let y = y0; y <= y1 && y < H; y++) {
    let a = W, b = -1;
    for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] > 32) { if (x < a) a = x; if (x > b) b = x; }
    if (b >= 0) { suma += (a + b) / 2; filas++; }
  }
  return {
    pie: maxY, cabeza: minY, alto: alto,
    centroCaja: Math.round((minX + maxX) / 2),
    centroCadera: filas ? Math.round(suma / filas) : null,
    W, H
  };
}

/* ---------- recorre los manifests buscando ciclos declarados ---------- */
const manifests = [
  { archivo: "data/poses_manifest.json", entradas: (m) => m.poses || {} }
];
let ciclosRevisados = 0;

manifests.forEach(({ archivo, entradas }) => {
  const ruta = path.join(RAIZ, archivo);
  if (!fs.existsSync(ruta)) return;
  const man = JSON.parse(fs.readFileSync(ruta, "utf8"));
  const base = man.base || "assets/poses/";
  const items = entradas(man);
  Object.keys(items).forEach(id => {
    const def = items[id];
    if (!def || !def.ciclo || !Array.isArray(def.ciclo.cuadros) || def.ciclo.cuadros.length < 2) return;
    ciclosRevisados++;
    const cajas = [];
    def.ciclo.cuadros.forEach(f => {
      const ruta2 = path.join(RAIZ, base, f);
      if (!fs.existsSync(ruta2)) { assert(false, "el ciclo '" + id + "' declara " + f + " y el archivo NO existe"); return; }
      const png = leerPNG(ruta2);
      if (png.error) { assert(false, id + " · " + f + ": " + png.error); return; }
      const c = cajaFigura(png);
      if (!c) { assert(false, id + " · " + f + ": el PNG está vacío (todo transparente)"); return; }
      cajas.push({ f, ...c });
    });
    if (cajas.length < 2) return;

    const pies = cajas.map(c => c.pie);
    const altos = cajas.map(c => c.alto);
    const caderas = cajas.map(c => c.centroCadera).filter(v => v != null);
    const derivaPiso = Math.max(...pies) - Math.min(...pies);
    const varAlto = (Math.max(...altos) - Math.min(...altos)) / Math.max(...altos) * 100;
    const derivaCadera = caderas.length === cajas.length ? Math.max(...caderas) - Math.min(...caderas) : null;
    const detalle = cajas.map(c => c.f.replace(/^.*[\\/]/, "") + "(pie " + c.pie + ", alto " + c.alto + ", cadera " + c.centroCadera + ")").join(" · ");

    assert(derivaPiso <= TOL_PISO,
      "ciclo '" + id + "': el PISO de los cuadros difiere " + derivaPiso + "px (tope " + TOL_PISO + "). Se ve como REBOTE. → " + detalle);
    assert(varAlto <= TOL_ALTO,
      "ciclo '" + id + "': el ALTO de figura varía " + varAlto.toFixed(1) + "% (tope " + TOL_ALTO + "%). Se ve como PULSO DE TAMAÑO. → " + detalle);
    assert(derivaCadera != null,
      "ciclo '" + id + "': no se pudo medir la banda de cadera en algún cuadro");
    const altoMedio = altos.reduce((a, b) => a + b, 0) / altos.length;
    const caderaPct = derivaCadera != null ? derivaCadera / altoMedio * 100 : 0;
    if (derivaCadera != null) assert(caderaPct <= TOL_CADERA_PCT,
      "ciclo '" + id + "': el CENTRO DE LA CADERA se corre " + derivaCadera + "px = " + caderaPct.toFixed(1) +
      "% del alto de figura (tope " + TOL_CADERA_PCT + "%). Se ve como SALTO LATERAL. → " + detalle);
    /* que todos los lienzos midan igual: si no, el escalado por alto los desiguala */
    const anchos = new Set(cajas.map(c => c.W)), altosL = new Set(cajas.map(c => c.H));
    assert(anchos.size === 1 && altosL.size === 1,
      "ciclo '" + id + "': los cuadros tienen LIENZOS distintos (" + [...anchos].join("/") + " x " + [...altosL].join("/") + ")");
    if (derivaPiso <= TOL_PISO && varAlto <= TOL_ALTO && derivaCadera != null && caderaPct <= TOL_CADERA_PCT)
      console.log("  ✓ ciclo '" + id + "': " + cajas.length + " cuadros alineados (piso ±" + derivaPiso + "px, alto ±" + varAlto.toFixed(1) + "%, cadera ±" + derivaCadera + "px = " + caderaPct.toFixed(1) + "%)");
  });
});

console.log("[1] ciclos declarados revisados: " + ciclosRevisados);
if (ciclosRevisados === 0) console.log("  (no hay ninguno declarado ahora mismo — el test queda listo para el que venga)");

if (mal === 0) console.log("\n✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("\n✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
