/* ============================================================================
   PAMPA STAR · phaser/logic/halo.js — EL ANILLO VIOLETA DEL RECORTE (lógica pura)

   Muchas ilustraciones se recortaron de un fondo magenta y quedó un anillo de
   1-2 px violeta alrededor de la figura. Medido sobre el borde exterior (los
   píxeles opacos que tocan transparencia): en las afectadas, el 96-100% de ese
   borde es violeta (jugador_largo, las caras, corriendo, barrida, festejo,
   gambeta_gana…); en las sanas, 0% (cabezazo_v2, quite). Sobre los fondos
   pintados nuevos —el cielo claro de la siesta— el anillo se ve.

   La regla de Rodri es no reprocesar los archivos. Esto no los toca: se aplica
   en memoria cuando la textura se carga (index.html, postBoot), y la figura
   pierde solo ese anillo. Se come de afuera hacia adentro, de a una capa, y
   solo lo que es violeta: la línea de tinta (negra) frena el avance, así que
   el contorno del dibujo queda entero.

   Trabaja sobre los bytes RGBA de un ImageData; sin DOM ni Phaser.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PampaHalo = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var DEF = {
    hueMin: 255, hueMax: 345,   // violeta y magenta
    sMin: 0.22, vMin: 0.12,     // con color de verdad (no un gris)
    capas: 3,                   // de afuera hacia adentro, como mucho
    alfaVacio: 20,              // por debajo de esto, es transparente
    minRatio: 0.3,              // si menos del 30% del borde es violeta, no hay halo
    franja: 4,                  // px junto al borde donde lo violeta atrapado pasa a tinta
    sMinAdentro: 0.35,          // y ahí adentro, solo lo claramente violeta
    vMinAdentro: 0.05,          // aunque sea oscuro: tinta teñida de violeta
    tinta: [22, 18, 26]         // el color de la línea del dibujo
  };

  function violeta(d, i, c) {
    var r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), dd = mx - mn;
    if (!dd || mx / 255 < c.vMin || dd / mx < c.sMin) return false;
    var h;
    if (mx === r) h = ((g - b) / dd) % 6;
    else if (mx === g) h = (b - r) / dd + 2;
    else h = (r - g) / dd + 4;
    h *= 60; if (h < 0) h += 360;
    return h >= c.hueMin && h <= c.hueMax;
  }
  function esBorde(d, i, W, H, c) {
    if (d[i * 4 + 3] < c.alfaVacio) return false;
    var x = i % W, y = (i / W) | 0;
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1) return true;
    return d[(i - 1) * 4 + 3] < c.alfaVacio || d[(i + 1) * 4 + 3] < c.alfaVacio ||
      d[(i - W) * 4 + 3] < c.alfaVacio || d[(i + W) * 4 + 3] < c.alfaVacio;
  }

  /* qué fracción del borde exterior es violeta (0 a 1) */
  function medir(d, W, H, cfg) {
    var c = Object.assign({}, DEF, cfg || {}), borde = 0, vio = 0;
    for (var i = 0; i < W * H; i++) {
      if (!esBorde(d, i, W, H, c)) continue;
      borde++;
      if (violeta(d, i, c)) vio++;
    }
    return { borde: borde, violeta: vio, ratio: borde ? vio / borde : 0 };
  }

  /* come el anillo: capa por capa, lo violeta del borde se vuelve
     transparente. Devuelve cuántos píxeles se limpiaron (0 = no había halo).
     El borde se calcula UNA vez; cada capa nueva solo puede salir de los
     vecinos de lo que se acaba de sacar (una pasada entera por capa costaba
     2,3 s en la carga de un partido). */
  function quitar(d, W, H, cfg) {
    var c = Object.assign({}, DEF, cfg || {}), N = W * H, i;
    var borde = [];
    for (i = 0; i < N; i++) if (esBorde(d, i, W, H, c)) borde.push(i);
    if (!borde.length) return { limpiados: 0, ratio: 0 };
    var vio = 0;
    for (i = 0; i < borde.length; i++) if (violeta(d, borde[i], c)) vio++;
    var ratio = vio / borde.length;
    if (ratio < c.minRatio) return { limpiados: 0, ratio: ratio };
    var total = 0, candidatos = borde, marca = new Uint8Array(N);
    for (var capa = 0; capa < c.capas && candidatos.length; capa++) {
      var fuera = [];
      for (i = 0; i < candidatos.length; i++) {
        var p = candidatos[i];
        if (d[p * 4 + 3] >= c.alfaVacio && esBorde(d, p, W, H, c) && violeta(d, p, c)) fuera.push(p);
      }
      if (!fuera.length) break;
      for (i = 0; i < fuera.length; i++) d[fuera[i] * 4 + 3] = 0;
      total += fuera.length;
      var sig = [];
      for (i = 0; i < fuera.length; i++) {
        var q = fuera[i], x = q % W;
        var vec = [x > 0 ? q - 1 : -1, x < W - 1 ? q + 1 : -1, q - W, q + W];
        for (var k = 0; k < 4; k++) {
          var v = vec[k];
          if (v >= 0 && v < N && !marca[v] && d[v * 4 + 3] >= c.alfaVacio) { marca[v] = 1; sig.push(v); }
        }
      }
      for (i = 0; i < sig.length; i++) marca[sig[i]] = 0;
      candidatos = sig;
    }
    /* LO QUE SE COLÓ ENTRE MECHONES. En el pelo al viento el fondo magenta
       quedó atrapado entre líneas de tinta: no toca la transparencia, así que
       no es "borde" y la pasada de arriba no lo ve. En una franja de pocos
       píxeles junto al borde, lo violeta que queda pasa a color tinta (el
       dibujo ahí es tinta de todos modos). La franja se mide desde el borde
       NUEVO, con una búsqueda en anchura acotada. */
    var dist = new Uint8Array(N), frente = [];
    for (i = 0; i < N; i++) if (esBorde(d, i, W, H, c)) { dist[i] = 1; frente.push(i); }
    for (var paso = 1; paso < c.franja && frente.length; paso++) {
      var nuevo = [];
      for (i = 0; i < frente.length; i++) {
        var a = frente[i], xa = a % W;
        var ve = [xa > 0 ? a - 1 : -1, xa < W - 1 ? a + 1 : -1, a - W, a + W];
        for (var k2 = 0; k2 < 4; k2++) {
          var b = ve[k2];
          if (b >= 0 && b < N && !dist[b] && d[b * 4 + 3] >= c.alfaVacio) { dist[b] = paso + 1; nuevo.push(b); }
        }
      }
      frente = nuevo;
    }
    /* acá sí entra lo oscuro: la tinta con tinte violeta pasa a tinta neutra
       (mismo oscuro, sin el color). En el borde exterior no se toca lo oscuro,
       porque volverlo transparente se comería el contorno del dibujo. */
    var entintados = 0, cf = Object.assign({}, c, { sMin: c.sMinAdentro, vMin: c.vMinAdentro });
    for (i = 0; i < N; i++) {
      if (!dist[i] || !violeta(d, i, cf)) continue;
      d[i * 4] = c.tinta[0]; d[i * 4 + 1] = c.tinta[1]; d[i * 4 + 2] = c.tinta[2];
      entintados++;
    }
    return { limpiados: total, entintados: entintados, ratio: ratio };
  }

  /* la muestra: ¿tiene halo esta imagen? Mira solo algunas FILAS (le llegan
     como una lista de filas RGBA de ancho W) y cuenta, en cada salto de
     transparente a opaco, si el primer píxel opaco es violeta. Sirve para no
     leer entera una imagen sana. */
  function muestra(filas, W, cfg) {
    var c = Object.assign({}, DEF, cfg || {}), saltos = 0, vio = 0;
    for (var f = 0; f < filas.length; f++) {
      var d = filas[f];
      for (var x = 1; x < W; x++) {
        var a0 = d[(x - 1) * 4 + 3] >= c.alfaVacio, a1 = d[x * 4 + 3] >= c.alfaVacio;
        if (a0 === a1) continue;
        saltos++;
        if (violeta(d, a1 ? x : x - 1, c)) vio++;
      }
    }
    return { saltos: saltos, ratio: saltos ? vio / saltos : 0 };
  }

  /* qué texturas se miran: las ilustraciones de personajes */
  function aplica(key) { return /^(pose_|cara_|ident_)/.test(String(key)); }

  /* ══════════════════════════════════════════════════════════════════════
     23/oct · EL NÚMERO DE LA ESPALDA. En "te rematan" el rival sin pose de su
     número salía con el 10 de pose_remate teñido de naranja (AXEL, el 6, con
     el 10). Igual que el anillo, sin tocar el archivo: en memoria, cuando se
     tiñe la copia naranja, el número se borra. Cada píxel del número (lo
     blanco de la caja, con 5 px de aire para su línea) toma el color de
     camiseta más cercano, que en un dibujo de sombras planas sigue la sombra
     que ya estaba; después, un promedio de 3x3 adentro de lo borrado. La
     línea de la figura (a 3 px de lo transparente) no se toca.
     d: los bytes RGBA de un rectángulo de W x H. z, en píxeles de ese
     rectángulo: la caja {x0, y0, x1, y1} y la esquina que no se toca, de
     arriba a la izquierda hasta (sx, sy) (en pose_remate, el puño blanco).
     Devuelve cuántos píxeles cambió. */
  var NUM = { blanco: 190, aire: 5, borde: 3, croma: 60, brillo: 110, opaco: 250 };
  function borrarNumero(d, W, H, z) {
    var N = W * H, c = NUM;
    function enCaja(x, y) { return x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1 && !(x < z.sx && y < z.sy); }
    var opaco = new Uint8Array(N), blanco = new Uint8Array(N), i, x, y, k, dx, dy;
    for (i = 0; i < N; i++) {
      opaco[i] = d[i * 4 + 3] >= c.opaco ? 1 : 0;
      blanco[i] = enCaja(i % W, (i / W) | 0) && d[i * 4] > c.blanco && d[i * 4 + 1] > c.blanco && d[i * 4 + 2] > c.blanco ? 1 : 0;
    }
    function cercaDelVacio(x, y) {
      for (dy = -c.borde; dy <= c.borde; dy++) for (dx = -c.borde; dx <= c.borde; dx++) {
        var xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < W && yy < H && !opaco[yy * W + xx]) return true;
      }
      return false;
    }
    var borrar = new Uint8Array(N);
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      i = y * W + x;
      if (!opaco[i] || !enCaja(x, y)) continue;
      if (blanco[i]) { borrar[i] = 1; continue; }
      var junto = false;
      for (dy = -c.aire; dy <= c.aire && !junto; dy++) for (dx = -c.aire; dx <= c.aire; dx++) {
        var xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < W && yy < H && blanco[yy * W + xx]) { junto = true; break; }
      }
      if (junto && !cercaDelVacio(x, y)) borrar[i] = 1;
    }
    /* lo que da color: camiseta (con color de verdad y no oscura), afuera de lo borrado */
    var cola = new Int32Array(N), ini = 0, fin = 0, de = new Int32Array(N).fill(-1);
    for (i = 0; i < N; i++) {
      if (borrar[i] || !opaco[i]) continue;
      var r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2], mx = Math.max(r, g, b);
      if (mx >= c.brillo && mx - Math.min(r, g, b) >= c.croma) { de[i] = i; cola[fin++] = i; }
    }
    /* el color más cercano: se expande desde todas las fuentes a la vez */
    while (ini < fin) {
      i = cola[ini++]; x = i % W; y = (i / W) | 0;
      for (dy = -1; dy <= 1; dy++) for (dx = -1; dx <= 1; dx++) {
        var nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        k = ny * W + nx;
        if (!borrar[k] || de[k] >= 0) continue;
        de[k] = de[i]; cola[fin++] = k;
      }
    }
    var cambiados = 0;
    for (i = 0; i < N; i++) {
      if (!borrar[i] || de[i] < 0) continue;
      d[i * 4] = d[de[i] * 4]; d[i * 4 + 1] = d[de[i] * 4 + 1]; d[i * 4 + 2] = d[de[i] * 4 + 2];
      cambiados++;
    }
    var suave = new Uint8ClampedArray(d);
    for (i = 0; i < N; i++) {
      if (!borrar[i]) continue;
      x = i % W; y = (i / W) | 0;
      var sr = 0, sg = 0, sb = 0, n = 0;
      for (dy = -1; dy <= 1; dy++) for (dx = -1; dx <= 1; dx++) {
        var px = x + dx, py = y + dy;
        if (px < 0 || py < 0 || px >= W || py >= H) continue;
        k = py * W + px;
        if (!borrar[k] && de[k] !== k) continue;
        sr += suave[k * 4]; sg += suave[k * 4 + 1]; sb += suave[k * 4 + 2]; n++;
      }
      if (n) { d[i * 4] = sr / n; d[i * 4 + 1] = sg / n; d[i * 4 + 2] = sb / n; }
    }
    return cambiados;
  }
  /* la caja del manifiesto (poses.<id>.numero, fracciones del dibujo) en
     píxeles de un rectángulo que empieza en (ox, oy) de un dibujo de W x H */
  function cajaDeNumero(num, W, H, ox, oy) {
    return {
      x0: Math.round(num.caja[0] * W) - ox, y0: Math.round(num.caja[1] * H) - oy,
      x1: Math.round(num.caja[2] * W) - ox, y1: Math.round(num.caja[3] * H) - oy,
      sx: Math.round(num.sin_tocar[0] * W) - ox, sy: Math.round(num.sin_tocar[1] * H) - oy
    };
  }

  return { DEF: DEF, medir: medir, quitar: quitar, muestra: muestra, aplica: aplica, borrarNumero: borrarNumero, cajaDeNumero: cajaDeNumero };
});
