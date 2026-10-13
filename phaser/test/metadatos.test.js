/* ============================================================================
   PAMPA STAR · L08 — EL LINK SE VE BIEN AL COMPARTIRLO

   Lo que estaba mal (medido con grep y en vivo con curl): phaser/index.html
   se titulaba "PAMPA STAR (Phaser) — tu pinta + el partido" y no tenía meta
   description, ni og:, ni twitter:. Pegado en un mensaje, el link salía sin
   imagen y sin bajada. El manifest decía "la carrera de un pibe pampeano"
   (masculino genérico, y es lo que muestra el teléfono al instalar), y su
   único ícono grande era "any maskable": medido decodificando el PNG, con
   esquinas de alfa 0 y la pelota a 221 px del centro y los rayos del sol a
   227, cuando la zona segura de un ícono maskable es un círculo de 205 (el
   40% de 512). En los lanzadores de Android que recortan en círculo, la
   pelota se cortaba y las esquinas salían de otro color.

     [1] la página del juego: título, description, og:, twitter:, canónica e
         ícono, con direcciones absolutas https, y la imagen existe en el
         repo con las medidas que declara;
     [2] el lenguaje: nada de "pibe", masculino genérico ni "pueblo" en lo
         que se lee al compartir o instalar;
     [3] el manifest: el ícono "any" separado del "maskable", y cada uno con
         el tamaño que dice;
     [4] icon-512-maskable.png: sin alfa 0, el contenido adentro de 205 px
         del centro, y es EXACTAMENTE lo que sale de componer icon-512.png
         (fondo a sangre con los dos colores del ícono, el ícono al 78%). Si
         alguien cambia el ícono, este test pide regenerarlo:
           node phaser/test/metadatos.test.js --escribir
     [5] el worker lo tiene en el precache y con huella.

   Corré:  node phaser/test/metadatos.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var RAIZ = path.join(__dirname, "..", "..");
var PNG = require("./_png.js");
function leer(f) { return fs.readFileSync(path.join(RAIZ, f), "utf8"); }

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

var SITIO = "https://juventudlapampa.github.io/pampa-star/";
var TITULO = "PAMPA STAR · Del potrero al Mundial";

/* ---------- la composición del ícono maskable ----------
   El ícono de 512 (medido con _png.js): cielo #06120b de arriba hasta la
   fila 387, pasto #2e7d32 desde la 388 hasta abajo, las esquinas de arriba
   redondeadas con alfa 0. El maskable lleva un fondo A SANGRE con esos dos
   mismos colores (el horizonte, escalado) y encima el ícono entero al 78%,
   centrado: así el recorte de cada lanzador (círculo, gota, cuadrado
   redondeado) cae siempre sobre cielo o pasto, y el sol y la pelota quedan
   adentro del círculo seguro. Los colores y el horizonte se MIDEN del ícono
   cada vez, no se escriben acá. */
var ESCALA = 0.78;
function medirIcono(ic) {
  var cielo = PNG.pixel(ic, ic.ancho >> 1, 4), pasto = PNG.pixel(ic, ic.ancho >> 1, ic.alto - 5);
  var col = 20, horizonte = -1;
  for (var y = 0; y < ic.alto; y++) {
    var p = PNG.pixel(ic, col, y);
    if (p[3] === 255 && p[0] === pasto[0] && p[1] === pasto[1] && p[2] === pasto[2]) { horizonte = y; break; }
  }
  return { cielo: cielo, pasto: pasto, horizonte: horizonte };
}
function generarMaskable(ic) {
  var W = ic.ancho, H = ic.alto, M = medirIcono(ic), c = W / 2;
  var out = new Uint8Array(W * H * 4);
  function px(x, y) { x = Math.max(0, Math.min(W - 1, x)); y = Math.max(0, Math.min(H - 1, y)); var i = (y * W + x) * 4; return ic.datos.subarray(i, i + 4); }
  for (var Y = 0; Y < H; Y++) {
    var syC = c + (Y + 0.5 - c) / ESCALA;           // la fila de origen, en coordenadas continuas
    var fondo = syC < M.horizonte ? M.cielo : M.pasto;
    for (var X = 0; X < W; X++) {
      var sx = c + (X + 0.5 - c) / ESCALA - 0.5, sy = syC - 0.5;
      var r = 0, g = 0, b = 0, a = 0;
      if (sx >= -0.5 && sx <= W - 0.5 && sy >= -0.5 && sy <= H - 0.5) {
        var x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
        [[x0, y0, (1 - fx) * (1 - fy)], [x0 + 1, y0, fx * (1 - fy)], [x0, y0 + 1, (1 - fx) * fy], [x0 + 1, y0 + 1, fx * fy]].forEach(function (q) {
          var p = px(q[0], q[1]), al = p[3] / 255 * q[2];
          r += p[0] * al; g += p[1] * al; b += p[2] * al; a += al;
        });
      }
      var o = (Y * W + X) * 4;
      out[o] = Math.round(r + fondo[0] * (1 - a));
      out[o + 1] = Math.round(g + fondo[1] * (1 - a));
      out[o + 2] = Math.round(b + fondo[2] * (1 - a));
      out[o + 3] = 255;
    }
  }
  return { ancho: W, alto: H, datos: out, medida: M };
}
var ICONO = PNG.leer(fs.readFileSync(path.join(RAIZ, "phaser/icon-512.png")));
var RUTA_MASK = path.join(RAIZ, "phaser/icon-512-maskable.png");
if (process.argv.indexOf("--escribir") >= 0) {
  var gen = generarMaskable(ICONO);
  fs.writeFileSync(RUTA_MASK, PNG.escribir(gen));
  console.log("icon-512-maskable.png escrito: " + fs.statSync(RUTA_MASK).size + " bytes (cielo " + gen.medida.cielo.slice(0, 3) + ", pasto " + gen.medida.pasto.slice(0, 3) + ", horizonte en la fila " + gen.medida.horizonte + ")");
  console.log("→ ahora: node phaser/test/sw_precache.test.js --escribir (la huella del ícono nuevo)");
  process.exit(0);
}

/* ---------- utilería: las etiquetas del <head> ---------- */
function cabeza(html) { var i = html.indexOf("</head>"); return i < 0 ? html : html.slice(0, i); }
function meta(html, attr, nombre) {
  var re = new RegExp('<meta\\s+' + attr + '="' + nombre.replace(/[:.]/g, "\\$&") + '"\\s+content="([^"]*)"', "i");
  var m = cabeza(html).match(re);
  return m ? m[1] : null;
}
function link(html, rel) {
  var m = cabeza(html).match(new RegExp('<link\\s+rel="' + rel + '"[^>]*\\shref="([^"]+)"', "i"));
  return m ? m[1] : null;
}
/* el tamaño de una imagen del repo, de su cabecera (PNG o WebP) */
function medidas(rel) {
  var b = fs.readFileSync(path.join(RAIZ, rel));
  if (b.slice(1, 4).toString() === "PNG") return { tipo: "image/png", w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b.slice(0, 4).toString() === "RIFF" && b.slice(8, 12).toString() === "WEBP") {
    var f = b.slice(12, 16).toString();
    if (f === "VP8X") return { tipo: "image/webp", w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
    if (f === "VP8 ") return { tipo: "image/webp", w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if (f === "VP8L") { var v = b.readUInt32LE(21); return { tipo: "image/webp", w: 1 + (v & 0x3fff), h: 1 + ((v >> 14) & 0x3fff) }; }
  }
  if (b[0] === 0xff && b[1] === 0xd8) return { tipo: "image/jpeg", w: 0, h: 0 };
  return { tipo: "?", w: 0, h: 0 };
}
/* "https://juventudlapampa.github.io/pampa-star/x/y.png" → "x/y.png" (o null) */
function delSitio(url) { return url && url.indexOf(SITIO) === 0 ? url.slice(SITIO.length) : null; }
/* lo que no va en un texto para quien juega (lenguaje institucional): "pibe"
   y "piba", el masculino genérico de siempre, "pueblo" (son localidades), la
   arroba y la barra ("chicos/as") */
var PROHIBIDO = /\bpib[ea]s?\b|\blos jugadores\b|\bbienvenid[oa]s?\b|\bpueblos?\b|@|\w\/\w/i;

/* las páginas que se comparten. La raíz entra con la portada (url-oficial):
   hasta entonces es el clásico y su <head> no se toca acá */
var PAGINAS = [{ archivo: "phaser/index.html", canonica: SITIO + "phaser/" }];

/* ---------- [1] LAS ETIQUETAS ---------- */
PAGINAS.forEach(function (P) {
  var html = leer(P.archivo);
  var t = (cabeza(html).match(/<title>([^<]*)<\/title>/) || [])[1];
  assert(t === TITULO, P.archivo + ": el título es \"" + TITULO + "\" (es \"" + t + "\")");
  assert(t && !/\(Phaser\)/.test(t), P.archivo + ": SÍNTOMA: el título no dice \"(Phaser)\"");
  var desc = meta(html, "name", "description");
  assert(!!desc && desc.length >= 60 && desc.length <= 200, P.archivo + ": meta description de 60 a 200 caracteres (" + (desc ? desc.length : 0) + ")");
  ["og:type", "og:site_name", "og:title", "og:description", "og:url", "og:image", "og:image:alt", "og:locale"].forEach(function (k) {
    assert(!!meta(html, "property", k), P.archivo + ": SÍNTOMA: falta " + k);
  });
  assert(meta(html, "property", "og:type") === "website" && meta(html, "property", "og:locale") === "es_AR" && meta(html, "property", "og:site_name") === "PAMPA STAR",
    P.archivo + ": og:type website, og:locale es_AR, og:site_name PAMPA STAR");
  assert(meta(html, "property", "og:title") === TITULO, P.archivo + ": og:title igual al título");
  assert(meta(html, "property", "og:description") === desc, P.archivo + ": og:description igual a la description");
  assert(meta(html, "name", "twitter:card") === "summary_large_image", P.archivo + ": twitter:card summary_large_image");
  ["twitter:title", "twitter:description", "twitter:image"].forEach(function (k) { assert(!!meta(html, "name", k), P.archivo + ": falta " + k); });
  var can = link(html, "canonical"), url = meta(html, "property", "og:url");
  assert(can === P.canonica && url === P.canonica, P.archivo + ": canónica y og:url = " + P.canonica + " (" + can + " · " + url + ")");
  var img = meta(html, "property", "og:image"), tw = meta(html, "name", "twitter:image");
  assert(/^https:\/\//.test(img) && img === tw, P.archivo + ": og:image absoluta con https e igual a twitter:image (" + img + ")");
  var rel = delSitio(img);
  assert(!!rel && fs.existsSync(path.join(RAIZ, rel)), P.archivo + ": la og:image es un archivo del repo (" + rel + ")");
  if (rel && fs.existsSync(path.join(RAIZ, rel))) {
    var md = medidas(rel), w = +meta(html, "property", "og:image:width"), h = +meta(html, "property", "og:image:height");
    assert(!w || (md.w === w && md.h === h), P.archivo + ": og:image:width/height son las del archivo (" + md.w + "x" + md.h + " contra " + w + "x" + h + ")");
    var ty = meta(html, "property", "og:image:type");
    assert(!ty || ty === md.tipo, P.archivo + ": og:image:type es el del archivo (" + md.tipo + ")");
  }
  var ic = link(html, "icon");
  assert(!!ic && fs.existsSync(path.join(RAIZ, path.dirname(P.archivo), ic)), P.archivo + ": rel=icon a un archivo que existe (" + ic + ")");
  console.log("[1] " + P.archivo + ": \"" + t + "\", description de " + desc.length + ", og y twitter completos, imagen " + rel);
});

/* ---------- [2] EL LENGUAJE DE LO QUE SE COMPARTE O SE INSTALA ---------- */
(function () {
  var MAN = JSON.parse(leer("phaser/manifest.webmanifest"));
  var textos = [["manifest description", MAN.description], ["manifest name", MAN.name]];
  PAGINAS.forEach(function (P) {
    var html = leer(P.archivo);
    textos.push([P.archivo + " description", meta(html, "name", "description")]);
    textos.push([P.archivo + " og:image:alt", meta(html, "property", "og:image:alt")]);
    textos.push([P.archivo + " title", (cabeza(html).match(/<title>([^<]*)<\/title>/) || [])[1]]);
  });
  var malos = textos.filter(function (t) { return !t[1] || PROHIBIDO.test(t[1]); });
  assert(malos.length === 0, "SÍNTOMA: masculino genérico, \"pibe\" o \"pueblo\" en: " + malos.map(function (t) { return t[0] + " (\"" + t[1] + "\")"; }).join(" · "));
  assert(PROHIBIDO.test("la carrera de un pibe pampeano") && PROHIBIDO.test("En algún pueblo de La Pampa") && !PROHIBIDO.test("elegí tu localidad"),
    "el filtro caza lo que decía el manifest y deja pasar lo que va");
  console.log("[2] " + textos.length + " textos de compartir e instalar, sin \"pibe\", masculino genérico ni \"pueblo\"");
})();

/* ---------- [3] EL MANIFEST ---------- */
var MAN = JSON.parse(leer("phaser/manifest.webmanifest"));
(function () {
  var icons = MAN.icons || [];
  var juntos = icons.filter(function (i) { return /any/.test(i.purpose || "any") && /maskable/.test(i.purpose || ""); });
  assert(juntos.length === 0, "SÍNTOMA: ningún ícono es \"any maskable\" a la vez (" + juntos.map(function (i) { return i.src; }).join(", ") + ")");
  var any = icons.filter(function (i) { return (i.purpose || "any") === "any"; }), mk = icons.filter(function (i) { return i.purpose === "maskable"; });
  assert(any.some(function (i) { return i.sizes === "512x512"; }) && any.some(function (i) { return i.sizes === "192x192"; }), "los íconos any de 192 y 512 siguen");
  assert(mk.length === 1 && mk[0].src === "icon-512-maskable.png" && mk[0].sizes === "512x512", "un ícono maskable aparte: icon-512-maskable.png de 512");
  icons.forEach(function (i) {
    var f = path.join(RAIZ, "phaser", i.src);
    var ex = fs.existsSync(f), md = ex ? medidas("phaser/" + i.src) : null;
    assert(ex && md.w + "x" + md.h === i.sizes && i.type === "image/png" && md.tipo === "image/png", "el ícono " + i.src + " existe y mide " + i.sizes + " (" + (md ? md.w + "x" + md.h : "no está") + ")");
  });
  console.log("[3] manifest: " + any.length + " íconos any y " + mk.length + " maskable, todos con su tamaño");
})();

/* ---------- [4] EL ÍCONO MASKABLE ---------- */
(function () {
  if (!fs.existsSync(RUTA_MASK)) { assert(false, "falta phaser/icon-512-maskable.png → node phaser/test/metadatos.test.js --escribir"); return; }
  var mk = PNG.leer(fs.readFileSync(RUTA_MASK));
  assert(mk.ancho === 512 && mk.alto === 512, "el maskable mide 512x512");
  var M = medirIcono(ICONO);
  assert(M.horizonte > 300 && M.horizonte < 450 && M.cielo[3] === 255 && M.pasto[3] === 255, "el ícono de 512 se mide: cielo, pasto y horizonte (fila " + M.horizonte + ")");
  var transp = 0, lejos = 0, maxR = 0, c = 255.5;
  function esFondo(p) {
    return [M.cielo, M.pasto].some(function (f) { return Math.abs(p[0] - f[0]) <= 8 && Math.abs(p[1] - f[1]) <= 8 && Math.abs(p[2] - f[2]) <= 8; });
  }
  for (var y = 0; y < 512; y++) for (var x = 0; x < 512; x++) {
    var p = PNG.pixel(mk, x, y);
    if (p[3] < 255) transp++;
    if (!esFondo(p)) { var r = Math.hypot(x - c, y - c); if (r > maxR) maxR = r; if (r > 205) lejos++; }
  }
  assert(transp === 0, "SÍNTOMA: el maskable no tiene alfa por debajo de 255 (" + transp + " píxeles)");
  assert(lejos === 0, "SÍNTOMA: todo lo que no es fondo cae adentro de 205 px del centro (" + lejos + " píxeles afuera; el más lejano a " + maxR.toFixed(1) + ")");
  /* el original, medido igual, para el registro: antes se salía */
  var maxO = 0;
  for (var y2 = 0; y2 < 512; y2++) for (var x2 = 0; x2 < 512; x2++) {
    var q = PNG.pixel(ICONO, x2, y2);
    if (q[3] === 255 && !esFondo(q)) { var r2 = Math.hypot(x2 - c, y2 - c); if (r2 > maxO) maxO = r2; }
  }
  assert(maxO > 205, "el original, medido igual, se salía de la zona segura (" + maxO.toFixed(1) + " px): si no, el test no está midiendo");
  /* y es lo que sale de componer el ícono de hoy */
  var gen = generarMaskable(ICONO), dif = 0;
  for (var i = 0; i < gen.datos.length; i++) if (Math.abs(gen.datos[i] - mk.datos[i]) > 1) dif++;
  assert(dif === 0, "icon-512-maskable.png es la composición de icon-512.png de hoy (" + dif + " valores distintos) → node phaser/test/metadatos.test.js --escribir");
  var kb = fs.statSync(RUTA_MASK).size / 1024;
  assert(kb < 60, "el maskable pesa poco (" + kb.toFixed(1) + " KB)");
  console.log("[4] maskable: 0 transparentes, el contenido llega a " + maxR.toFixed(1) + " px del centro (tope 205; el original, " + maxO.toFixed(1) + "), " + kb.toFixed(1) + " KB, igual a la composición");
})();

/* ---------- [5] EL WORKER LO TIENE ---------- */
(function () {
  var ctx = { self: { addEventListener: function () { }, location: { href: "https://x/pampa-star/phaser/sw.js" } }, URL: URL, console: console };
  vm.createContext(ctx);
  vm.runInContext(leer("phaser/sw.js") + "\n;this.__P = PRECACHE; this.__H = ASSETS_HUELLA;", ctx);
  assert(ctx.__P.indexOf("./icon-512-maskable.png") >= 0, "el PRECACHE de sw.js tiene el ícono maskable (sin red, el teléfono instalado lo pide)");
  assert(!!ctx.__H["phaser/icon-512-maskable.png"], "y tiene huella (va a la caché de assets, como los otros íconos)");
  console.log("[5] el maskable, en el PRECACHE y con huella");
})();

/* ---------- [6] LA TARJETA DEL LINK (og-card) ----------
   No había ninguna imagen de 1200x630: la portada mide 1024x576 y es WebP,
   y las vistas previas de los mensajes son más confiables con PNG o JPG. La
   tarjeta se compone (docs/og-card.html, Chrome sin ventana) con la portada
   y el logo horizontal TAL CUAL: los dos originales tienen que seguir byte a
   byte como estaban cuando se compuso (si cambian, hay que recomponerla y
   que Rodri la apruebe de nuevo). */
var ORIGINALES_DE_LA_TARJETA = {
  "assets/ui/portada.webp": "55732-cbb1e9a4ea31",
  "assets/ui/pampa-star-logo-horizontal.webp": "63116-8cc0ef1ded46"
};
(function () {
  var H = require("./_huella.js");
  var f = "phaser/og-card.png";
  assert(fs.existsSync(path.join(RAIZ, f)), "SÍNTOMA: falta la tarjeta del link (" + f + ")");
  if (!fs.existsSync(path.join(RAIZ, f))) return;
  var md = medidas(f), kb = fs.statSync(path.join(RAIZ, f)).size / 1024;
  assert(md.tipo === "image/png" && md.w === 1200 && md.h === 630, "la tarjeta es un PNG de 1200x630 (" + md.tipo + " " + md.w + "x" + md.h + ")");
  assert(kb < 300, "la tarjeta pesa menos de 300 KB (" + kb.toFixed(1) + ")");
  PAGINAS.forEach(function (P) {
    var html = leer(P.archivo);
    assert(meta(html, "property", "og:image") === SITIO + f && meta(html, "name", "twitter:image") === SITIO + f,
      P.archivo + ": og:image y la imagen de la tarjeta grande apuntan a " + SITIO + f);
  });
  var cambiados = Object.keys(ORIGINALES_DE_LA_TARJETA).filter(function (r) {
    return H.huellaArchivo(path.join(RAIZ, r)) !== ORIGINALES_DE_LA_TARJETA[r];
  });
  assert(cambiados.length === 0, "los originales de la tarjeta siguen byte a byte como al componerla (cambiaron: " + cambiados.join(", ") +
    ") → recomponer con docs/og-card.html y que Rodri la apruebe");
  /* lo que se lee, adentro del cuadrado del centro (x de 285 a 915): con la
     imagen chica, algunas vistas previas muestran solo ese cuadrado. Se mide
     por las letras amarillas (R>230, G>180, B<120) del logo (filas 40-127) y
     de la bajada (150-191); la primera composición, con el logo de 860 y la
     bajada abajo, daba "MPA STA" en el cuadrado */
  var card = PNG.leer(fs.readFileSync(path.join(RAIZ, f)));
  function franja(y0, y1) {
    var xs = [];
    for (var x = 0; x < card.ancho; x++) for (var y = y0; y < y1; y++) { var p = PNG.pixel(card, x, y); if (p[0] > 230 && p[1] > 180 && p[2] < 120) { xs.push(x); break; } }
    return xs.length ? [xs[0], xs[xs.length - 1]] : null;
  }
  var cuad = [(card.ancho - card.alto) / 2, (card.ancho + card.alto) / 2];
  [["el logo", franja(40, 128)], ["la bajada", franja(150, 192)]].forEach(function (z) {
    assert(!!z[1] && z[1][0] >= cuad[0] && z[1][1] <= cuad[1], z[0] + " de la tarjeta cae adentro del cuadrado del centro (" + (z[1] ? z[1].join("-") : "no se encontró") + "; cuadrado " + cuad.join("-") + ")");
  });
  var receta = leer("docs/og-card.html");
  assert(Object.keys(ORIGINALES_DE_LA_TARJETA).every(function (r) { return receta.indexOf("../" + r) >= 0; }) && /DEL POTRERO AL MUNDIAL/.test(receta),
    "la receta (docs/og-card.html) usa esos dos originales y la bajada");
  console.log("[6] la tarjeta: PNG 1200x630, " + kb.toFixed(1) + " KB, en og:image de " + PAGINAS.length + " página(s), con los dos originales intactos");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
