/* ============================================================================
   PAMPA STAR · EL ANILLO VIOLETA DEL RECORTE (logic/halo.js)

   Medido: en las ilustraciones recortadas de un fondo magenta, el 96-100% del
   borde exterior es violeta; en las sanas, 0%. halo.js lo come en memoria al
   cargar la textura (sin tocar los archivos: regla de Rodri).

   Se prueba con una figura SINTÉTICA: un disco de piel con contorno de tinta,
   un anillo violeta de 2 px por fuera, y un poco de violeta atrapado junto al
   borde (como entre mechones de pelo).

   Corré:  node phaser/test/halo.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "..", "..");
var HA = require(path.join(RAIZ, "phaser/logic/halo.js"));
function leer(p) { try { return fs.readFileSync(path.join(RAIZ, p), "utf8"); } catch (e) { return ""; } }
var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

var W = 80, H = 80, CX = 40, CY = 40;
var PIEL = [240, 190, 150], TINTA = [18, 14, 16], VIOLETA = [150, 40, 160];
function figura(conHalo) {
  var d = new Uint8ClampedArray(W * H * 4);
  for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
    var r = Math.hypot(x - CX, y - CY), i = (y * W + x) * 4, c = null;
    if (r <= 24) c = PIEL;
    else if (r <= 27) c = TINTA;                  // el contorno del dibujo, 3 px
    else if (conHalo && r <= 29) c = VIOLETA;     // el anillo del recorte, 2 px
    if (c) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; }
  }
  /* violeta atrapado: un punto adentro de la tinta, pegado al borde */
  if (conHalo) { var j = (CY * W + (CX + 26)) * 4; d[j] = VIOLETA[0]; d[j + 1] = VIOLETA[1]; d[j + 2] = VIOLETA[2]; }
  return d;
}
function px(d, x, y) { var i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; }

(function () {
  var d = figura(true);
  var m = HA.medir(d, W, H);
  assert(m.ratio > 0.9, "el borde exterior de la figura con halo es violeta (" + Math.round(m.ratio * 100) + "%)");
  var r = HA.quitar(d, W, H);
  assert(r.limpiados > 0, "se limpió el anillo (" + r.limpiados + " px)");
  assert(px(d, CX + 28, CY)[3] === 0, "el anillo violeta es transparente ahora");
  assert(px(d, CX + 25, CY)[3] === 255 && px(d, CX + 25, CY)[0] < 40, "la tinta del contorno quedó entera y opaca");
  assert(px(d, CX, CY).slice(0, 3).join() === PIEL.join(), "la piel no se tocó");
  var atrapado = px(d, CX + 26, CY);
  assert(atrapado[3] === 255 && atrapado[0] < 40 && atrapado[2] < 40, "el violeta atrapado junto al borde pasó a tinta (opaco): " + atrapado);
  var m2 = HA.medir(d, W, H);
  assert(m2.ratio < 0.05, "después, el borde ya no es violeta (" + Math.round(m2.ratio * 100) + "%)");
  console.log("[1] figura con halo: anillo afuera, tinta y piel intactas, violeta atrapado a tinta");
})();

(function () {
  var d = figura(false), antes = d.slice();
  var r = HA.quitar(d, W, H);
  assert(r.limpiados === 0 && d.every(function (v, k) { return v === antes[k]; }), "una figura sana no se toca (ni un píxel)");
  console.log("[2] figura sana: intacta");
})();

(function () {
  /* la muestra por filas decide igual que la medición entera */
  function filas(d) { var out = []; for (var f = 1; f <= 24; f++) { var y = Math.floor(H * f / 25); out.push(d.slice(y * W * 4, (y + 1) * W * 4)); } return out; }
  assert(HA.muestra(filas(figura(true)), W).ratio > 0.8, "la muestra ve el halo");
  assert(HA.muestra(filas(figura(false)), W).ratio < 0.1, "la muestra ve la figura sana");
  assert(HA.aplica("pose_remate") && HA.aplica("cara_rulos") && HA.aplica("ident_jugador_largo"), "aplica a poses, caras e identidades");
  assert(!HA.aplica("fondo_tribuna") && !HA.aplica("ball") && !HA.aplica("cine_escena_siesta"), "no aplica a fondos, pelota ni pinturas");
  console.log("[3] la muestra decide bien y el filtro de claves es el correcto");
})();

(function () {
  var idx = leer("phaser/index.html"), c = leer("phaser/scenes/cine_arte.js"), a = leer("phaser/scenes/avatar_arte.js");
  assert(idx.indexOf('src="logic/halo.js"') >= 0, "index.html carga logic/halo.js");
  assert(/postBoot:[^\n]*PampaHaloEnganchar\(game\)/.test(idx), "el juego engancha la limpieza al arrancar (postBoot)");
  assert(/fuente\.image = cv;[\s\S]{0,80}fuente\.update\(\)/.test(c), "la textura se reemplaza EN EL LUGAR (los sprites que la usan no quedan apuntando a una muerta)");
  assert(/PampaHaloAsegurar\(srcKey\)/.test(a), "el teñido de tu pinta pide la fuente limpia antes de derivar");
  assert(/PampaHaloAsegurar\(src\)/.test(c), "la camiseta del equipo pide la fuente limpia antes de derivar");
  console.log("[4] enganchado al arranque, reemplazo en el lugar, derivaciones con la fuente limpia");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
