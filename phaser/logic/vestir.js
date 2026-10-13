/* ============================================================================
   PAMPA STAR · phaser/logic/vestir.js — VESTIR CON NUESTRA CAMISETA (lógica pura)

   El problema: `pose_bloqueo` y `pose_barrida` existen solo con el kit del
   RIVAL (naranja a rayas negras). Cuando el que bloquea es de tu equipo, salía
   con la camiseta del otro. Y no se podía teñir por color: en el bloqueo la
   piel es casi del mismo naranja que la camiseta (camiseta ~#fc844c, piel
   ~#fca46c) y un teñido por distancia de color pinta los brazos.

   Lo que sí separa, medido sobre las dos poses:
     1. LA TINTA. En un cel, la camiseta está encerrada por líneas negras; la
        luz y la sombra de la piel NO (el borde de la sombra es un corte de
        color, sin línea). Así que se agrupa por REGIONES cerradas por la tinta
        y se decide por región, no por píxel.
     2. LA TONALIDAD Y LA SATURACIÓN. La tela anda por los 19-20° y bien
        saturada; la piel por los 22-24° y menos saturada. El umbral de
        saturación se calcula por imagen (Otsu), no se clava.
     3. EL CONTACTO. Si una línea de tinta tiene un hueco y la tela quedó
        pegada a la piel en una misma región (el puño de la media con el
        muslo), dentro de esa región los grupos "tipo tela" que TOCAN una
        región de tela cruzando la tinta son tela; las sombras de la piel no
        tocan tela.

   Y las RAYAS se borran: en el GDD las rayas son la marca no-cromática del
   rival (§10.5: "equipo rival · camiseta a rayas"; propio · "camiseta lisa").
   Un defensor tuyo a rayas confundiría justo a quien distingue por forma. Una
   raya es una corrida oscura de 8 px o más con tela de los dos lados; se
   rellena interpolando la tela ya teñida de sus dos bordes, así la luz y la
   sombra del dibujo siguen de corrido.

   Trabaja sobre los bytes RGBA de un ImageData (Uint8ClampedArray) y no sabe
   nada de Phaser ni del DOM: se prueba en node con imágenes sintéticas.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PampaVestir = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var DEF = {
    tinta: 70,          // luma por debajo = línea de tinta (o raya, o short negro)
    hueMin: 5, hueMax: 40, vMin: 0.35,   // qué es "naranja" (tela o piel)
    hueTela: 20.5,      // la tela está por debajo; la piel, por arriba
    fracTela: 0.45,     // región con esta fracción de píxeles saturados = tela
    sMinTela: 0.6,      // saturación media mínima para decidir por tonalidad
    tocar: 5,           // px de "contacto" a través de la tinta
    grupoMin: 150,      // un grupo tipo tela dentro de una región de piel, mínimo
    rayaMin: 8,         // corrida oscura más angosta = línea de tinta (se respeta)
    rayaMaxFrac: 0.06,  // y más ancha que esto (del ancho de la imagen) no es raya
    destino: "#4fc3f7"  // el celeste del equipo propio (GDD §10.5)
  };

  function hsv(r, g, b) {
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0;
    if (d) {
      if (mx === r) h = ((g - b) / d) % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return [h, mx ? d / mx : 0, mx / 255];
  }
  function luma(r, g, b) { return 0.299 * r + 0.587 * g + 0.114 * b; }
  function hex(c) { var n = parseInt(String(c).replace("#", ""), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

  /* umbral de Otsu sobre valores en [0,1] */
  function otsu(vals) {
    var h = new Array(100).fill(0), i;
    for (i = 0; i < vals.length; i++) h[Math.min(99, Math.floor(vals[i] * 100))]++;
    var tot = vals.length, sum = 0;
    for (i = 0; i < 100; i++) sum += i * h[i];
    var sB = 0, wB = 0, max = 0, th = 0;
    for (i = 0; i < 100; i++) {
      wB += h[i]; if (!wB) continue;
      var wF = tot - wB; if (!wF) break;
      sB += i * h[i];
      var mB = sB / wB, mF = (sum - sB) / wF, btw = wB * wF * (mB - mF) * (mB - mF);
      if (btw > max) { max = btw; th = i; }
    }
    return (th + 0.5) / 100;
  }

  /* regiones 4-conexas de píxeles opacos y NO tinta */
  function regiones(d, W, H, tinta) {
    var N = W * H, lab = new Int32Array(N).fill(-1), pila = new Int32Array(N), regs = [];
    function ok(i) { return d[i * 4 + 3] >= 128 && luma(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) >= tinta; }
    for (var s = 0; s < N; s++) {
      if (lab[s] >= 0 || !ok(s)) continue;
      var id = regs.length, top = 0, px = [];
      pila[top++] = s; lab[s] = id;
      while (top) {
        var i = pila[--top], x = i % W;
        px.push(i);
        if (x > 0 && lab[i - 1] < 0 && ok(i - 1)) { lab[i - 1] = id; pila[top++] = i - 1; }
        if (x < W - 1 && lab[i + 1] < 0 && ok(i + 1)) { lab[i + 1] = id; pila[top++] = i + 1; }
        if (i >= W && lab[i - W] < 0 && ok(i - W)) { lab[i - W] = id; pila[top++] = i - W; }
        if (i < N - W && lab[i + W] < 0 && ok(i + W)) { lab[i + W] = id; pila[top++] = i + W; }
      }
      regs.push(px);
    }
    return { lab: lab, regs: regs };
  }

  /* la máscara de la TELA: 1 = tela del kit (camiseta, medias) */
  function mascaraTela(d, W, H, cfg) {
    cfg = Object.assign({}, DEF, cfg || {});
    var N = W * H, i, sats = [];
    for (i = 0; i < N; i++) {
      if (d[i * 4 + 3] < 128) continue;
      var c = hsv(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
      if (c[2] >= cfg.vMin && c[0] >= cfg.hueMin && c[0] <= cfg.hueMax) sats.push(c[1]);
    }
    var m = new Uint8Array(N);
    if (sats.length < 50) return { m: m, th: 1, regiones: 0, tela: 0 };
    var th = otsu(sats);
    function saturado(k) { var c = hsv(d[k * 4], d[k * 4 + 1], d[k * 4 + 2]); return c[2] >= cfg.vMin && c[0] >= cfg.hueMin && c[0] <= cfg.hueMax && c[1] >= th; }
    var R = regiones(d, W, H, cfg.tinta), piel = [], nTela = 0;
    R.regs.forEach(function (px, id) {
      var ss = 0, hh = 0, n = 0, nn = 0;
      for (var q = 0; q < px.length; q++) {
        var k = px[q], c = hsv(d[k * 4], d[k * 4 + 1], d[k * 4 + 2]);
        if (c[2] < 0.3) continue;
        ss += c[1]; hh += c[0]; nn++;
        if (saturado(k)) n++;
      }
      if (!nn) return;
      var frac = n / nn, hMed = hh / nn, sMed = ss / nn;
      var tela = frac >= cfg.fracTela || (hMed <= cfg.hueTela && hMed >= cfg.hueMin + 3 && sMed >= cfg.sMinTela);
      if (tela) { nTela++; for (q = 0; q < px.length; q++) m[px[q]] = 1; }
      else piel.push(id);
    });
    /* el contacto: tela engordada unos píxeles (cruza la línea de tinta) */
    var cerca = m.slice();
    for (var k2 = 0; k2 < cfg.tocar; k2++) {
      var n2 = cerca.slice();
      for (i = 0; i < N; i++) {
        if (cerca[i]) continue;
        var x = i % W;
        if ((x > 0 && cerca[i - 1]) || (x < W - 1 && cerca[i + 1]) || (i >= W && cerca[i - W]) || (i < N - W && cerca[i + W])) n2[i] = 1;
      }
      cerca = n2;
    }
    var tipoTela = function (k) { var c = hsv(d[k * 4], d[k * 4 + 1], d[k * 4 + 2]); return c[2] >= cfg.vMin && c[0] >= cfg.hueMin + 3 && c[0] <= cfg.hueTela + 0.5 && c[1] >= Math.max(0.62, th); };
    var visto = new Uint8Array(N);
    piel.forEach(function (id) {
      var px = R.regs[id];
      /* una región CHICA, casi toda "tipo tela" y pegada a la tela (los
         pedacitos de manga entre los trazos de un número) es tela entera */
      if (px.length < 3000) {
        var nt = 0, toca = false;
        for (var q0 = 0; q0 < px.length; q0++) { if (tipoTela(px[q0])) nt++; if (cerca[px[q0]]) toca = true; }
        if (toca && nt / px.length >= 0.5) { for (q0 = 0; q0 < px.length; q0++) m[px[q0]] = 1; return; }
      }
      for (var q = 0; q < px.length; q++) {
        var s0 = px[q];
        if (visto[s0] || !tipoTela(s0)) continue;
        var comp = [], pila = [s0]; visto[s0] = 1;
        while (pila.length) {
          var a = pila.pop(), xa = a % W; comp.push(a);
          var vec = [xa > 0 ? a - 1 : -1, xa < W - 1 ? a + 1 : -1, a - W, a + W];
          for (var v = 0; v < 4; v++) {
            var b = vec[v];
            if (b >= 0 && b < N && !visto[b] && R.lab[b] === id && tipoTela(b)) { visto[b] = 1; pila.push(b); }
          }
        }
        if (comp.length >= cfg.grupoMin && comp.some(function (z) { return cerca[z]; })) {
          for (var z = 0; z < comp.length; z++) m[comp[z]] = 1;
        }
      }
    });
    return { m: m, th: th, regiones: R.regs.length, tela: nTela };
  }

  /* las rayas: corridas oscuras, anchas, con tela de los DOS lados. Devuelve
     la lista de corridas {i0, i1, paso} (índices de píxel, paso 1 = fila,
     paso W = columna) sin tocar la imagen */
  function rayas(d, W, H, m, cfg) {
    cfg = Object.assign({}, DEF, cfg || {});
    var max = Math.max(cfg.rayaMin + 1, Math.round(W * cfg.rayaMaxFrac)), out = [];
    function oscuro(i) { return d[i * 4 + 3] >= 128 && luma(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) < cfg.tinta; }
    function telaCerca(i, dir, lim, W2, fila) {
      for (var k = 1; k <= 2; k++) {
        var j = i + dir * k;
        if (j < 0 || j >= W2 * H) return false;
        if (fila != null && ((j / W) | 0) !== fila) return false;
        if (m[j] === 1) return true;
      }
      return false;
    }
    var x, y, i, ini;
    for (y = 0; y < H; y++) {
      x = 0;
      while (x < W) {
        i = y * W + x;
        if (!oscuro(i)) { x++; continue; }
        ini = x;
        while (x < W && oscuro(y * W + x)) x++;
        var largo = x - ini;
        if (largo >= cfg.rayaMin && largo <= max && telaCerca(y * W + ini, -1, 2, W, y) && telaCerca(y * W + x - 1, 1, 2, W, y)) {
          out.push({ i0: y * W + ini, i1: y * W + x - 1, paso: 1 });
        }
      }
    }
    for (x = 0; x < W; x++) {
      y = 0;
      while (y < H) {
        if (!oscuro(y * W + x)) { y++; continue; }
        ini = y;
        while (y < H && oscuro(y * W + x)) y++;
        var largoV = y - ini;
        if (largoV >= cfg.rayaMin && largoV <= max && telaCerca(ini * W + x, -W, 2, W, null) && telaCerca((y - 1) * W + x, W, 2, W, null)) {
          out.push({ i0: ini * W + x, i1: (y - 1) * W + x, paso: W });
        }
      }
    }
    return out;
  }

  /* todo junto: tiñe la tela al destino conservando la luz del dibujo y
     rellena las rayas con la tela de sus bordes. Modifica d. */
  function vestir(d, W, H, cfg) {
    cfg = Object.assign({}, DEF, cfg || {});
    var M = mascaraTela(d, W, H, cfg), m = M.m, N = W * H, i;
    var R = rayas(d, W, H, m, cfg);
    /* la luz de referencia: la mediana de la luma de la tela */
    var lumas = [];
    for (i = 0; i < N; i++) if (m[i] === 1) lumas.push(luma(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]));
    if (!lumas.length) return { tela: 0, rayas: 0, th: M.th };
    lumas.sort(function (a, b) { return a - b; });
    var ref = Math.max(20, lumas[(lumas.length / 2) | 0]), D = hex(cfg.destino);
    function tono(l) {
      var k = l / ref, c = [0, 0, 0];
      for (var q = 0; q < 3; q++) c[q] = k <= 1 ? D[q] * k : D[q] + (255 - D[q]) * Math.min(1, (k - 1) * 1.4);
      return c;
    }
    for (i = 0; i < N; i++) {
      if (m[i] !== 1) continue;
      var t = tono(luma(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]));
      d[i * 4] = t[0]; d[i * 4 + 1] = t[1]; d[i * 4 + 2] = t[2];
    }
    /* LAS RAYAS SE RELLENAN POR DIFUSIÓN. Interpolar fila por fila dejaba
       el relleno rayado (cada fila con sus dos bordes, un tono distinto).
       Ahora: la raya y 2 px de tela a cada lado (el antialias del borde de
       la raya vieja, que si no queda como una línea fina) son "incógnita";
       se llenan desde la tela conocida en ondas, y después se alisan con
       varias pasadas de promedio — un relleno armónico, sin vetas. */
    var U = new Uint8Array(N), nr = 0;
    R.forEach(function (r) {
      var n = (r.i1 - r.i0) / r.paso + 1;
      for (var k = 0, j = r.i0; k < n; k++, j += r.paso) U[j] = 1;
    });
    for (var pas = 0; pas < 2; pas++) {
      var U2 = U.slice();
      for (i = 0; i < N; i++) {
        if (U[i] || m[i] !== 1) continue;
        var xi = i % W;
        if ((xi > 0 && U[i - 1]) || (xi < W - 1 && U[i + 1]) || (i >= W && U[i - W]) || (i < N - W && U[i + W])) U2[i] = 1;
      }
      U = U2;
    }
    var cola = [], conocido = new Uint8Array(N);
    for (i = 0; i < N; i++) if (m[i] === 1 && !U[i]) conocido[i] = 1;
    var vecinos = function (p) { var xp = p % W; return [xp > 0 ? p - 1 : -1, xp < W - 1 ? p + 1 : -1, p >= W ? p - W : -1, p < N - W ? p + W : -1]; };
    for (i = 0; i < N; i++) if (U[i] && vecinos(i).some(function (j) { return j >= 0 && conocido[j]; })) cola.push(i);
    var enCola = new Uint8Array(N); cola.forEach(function (p) { enCola[p] = 1; });
    for (var qi = 0; qi < cola.length; qi++) {
      var p = cola[qi], sr = 0, sg = 0, sb = 0, c = 0;
      vecinos(p).forEach(function (j) { if (j >= 0 && conocido[j]) { sr += d[j * 4]; sg += d[j * 4 + 1]; sb += d[j * 4 + 2]; c++; } });
      if (!c) continue;
      d[p * 4] = sr / c; d[p * 4 + 1] = sg / c; d[p * 4 + 2] = sb / c; conocido[p] = 1; nr++;
      vecinos(p).forEach(function (j) { if (j >= 0 && U[j] && !conocido[j] && !enCola[j]) { enCola[j] = 1; cola.push(j); } });
    }
    for (var it = 0; it < 24; it++) {
      for (qi = 0; qi < cola.length; qi++) {
        p = cola[qi]; sr = 0; sg = 0; sb = 0; c = 0;
        vecinos(p).forEach(function (j) { if (j >= 0 && conocido[j]) { sr += d[j * 4]; sg += d[j * 4 + 1]; sb += d[j * 4 + 2]; c++; } });
        if (c) { d[p * 4] = sr / c; d[p * 4 + 1] = sg / c; d[p * 4 + 2] = sb / c; }
      }
    }
    /* los píxeles de raya ahora son tela: 2 en la máscara (para quien mire) */
    for (i = 0; i < N; i++) if (U[i] && conocido[i] && m[i] !== 1) m[i] = 2;
    return { tela: lumas.length, rayas: nr, th: M.th, m: m };
  }

  /* ══════════════════════════════════════════════════════════════════════
     L08c · QUÉ SE VISTE, CON QUÉ CLAVE Y DE QUÉ COLOR (para prepararlo antes)
     vestir() cuesta 120-240 ms por pose en node (medido con pose_bloqueo
     799x900 y pose_barrida 900x683) y más en el navegador de la compu, y es
     de una sola pieza. Se hacía en el create del partido: medido en el
     navegador, los dos cuadros más largos de los primeros 3 s eran esos, de
     382 y 313 ms. Ahora se prepara antes (la tabla del
     Master, y en un hilo aparte: logic/vestir_obrero.js) y el partido usa lo
     que ya está. Para eso la escena que prepara y la que usa tienen que
     coincidir en la CLAVE de la textura y en el COLOR, y eso vive acá. */
  /* la textura vestida: "poseE_<pose>_<hex sin #>" (la de siempre), con el
     hex en minúscula: la camiseta "Celeste titular" del manifiesto de caras
     es #4FC3F7, el mismo color que el celeste del equipo (#4fc3f7), y con la
     clave tal cual eran dos texturas iguales vestidas dos veces */
  function claveVestida(id, destino) {
    return "poseE_" + id + "_" + String(destino || DEF.destino).replace("#", "").toLowerCase();
  }
  /* el color: el celeste del equipo propio, o la camiseta que elegiste en el
     editor (tCam > 0 en tu look ya validado: 0 es "Original") */
  function destinoDelLook(look, camisetas) {
    if (look && look.tCam > 0 && camisetas && camisetas.length) {
      var c = camisetas[(look.tCam - 1) % camisetas.length];
      if (c && c.hex) return c.hex;
    }
    return DEF.destino;
  }
  /* las poses del manifiesto que hay que vestir (kit "rival" y que se
     cargan) por cada color distinto: [{ id, destino, clave }] */
  function paresAVestir(manifiesto, destinos) {
    var poses = (manifiesto && manifiesto.poses) || {}, out = [], vistos = {};
    var ds = (destinos && destinos.length ? destinos : [DEF.destino]);
    Object.keys(poses).forEach(function (id) {
      var p = poses[id];
      if (!p || p.kit !== "rival" || p.cargar === false || !p.archivo) return;
      ds.forEach(function (d) {
        var clave = claveVestida(id, d);
        if (vistos[clave]) return;
        vistos[clave] = true;
        out.push({ id: id, destino: d || DEF.destino, clave: clave });
      });
    });
    return out;
  }

  return { DEF: DEF, hsv: hsv, otsu: otsu, regiones: regiones, mascaraTela: mascaraTela, rayas: rayas, vestir: vestir,
    claveVestida: claveVestida, destinoDelLook: destinoDelLook, paresAVestir: paresAVestir };
});
