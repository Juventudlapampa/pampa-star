/* ============================================================================
   PAMPA STAR · phaser/logic/avatar.js — LÓGICA PURA del AVATAR POR CAPAS
   El personaje se arma con CAPAS combinables: piel, corte y color de pelo,
   ojos, cejas, boca, accesorios y camiseta. Acá vive el CATÁLOGO (cada
   variante con NOMBRE — regla daltonismo: nunca se distingue solo por color,
   los cortes/ojos/bocas son FORMAS distintas y todo color tiene etiqueta),
   la validación, la migración del save clásico y el generador procedural
   para los NPC del roster. SIN Phaser: portable a Godot y testeable en node.
   El dibujo vive en scenes/avatar_arte.js.
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaAvatar = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------- EL CATÁLOGO (todo con nombre + HEX) ---------- */
  var CATALOGO = {
    pieles: [
      { id: "clara", n: "Piel clara", hex: "#e9b58c" },
      { id: "triguena", n: "Piel trigueña", hex: "#c68e5f" },
      { id: "morena", n: "Piel morena", hex: "#8d5a3a" },
      { id: "oscura", n: "Piel oscura", hex: "#5f3a24" }
    ],
    /* cada corte es una FORMA distinta (no un tinte) */
    cortes: [
      { id: "rapado", n: "Rapado" },
      { id: "corto", n: "Corto" },
      { id: "flequillo", n: "Flequillo" },
      { id: "rulos", n: "Rulos" },
      { id: "colita", n: "Colita" },
      { id: "melena", n: "Melena" }
    ],
    colores_pelo: [
      { id: "negro", n: "Negro", hex: "#1c1613" },
      { id: "castano", n: "Castaño", hex: "#4a2e15" },
      { id: "rubio", n: "Rubio", hex: "#c9a227" },
      { id: "colorado", n: "Colorado", hex: "#a53f1f" },
      { id: "canoso", n: "Canoso", hex: "#b9b4a8" }
    ],
    ojos: [
      { id: "despiertos", n: "Despiertos" },
      { id: "tranquilos", n: "Tranquilos" },
      { id: "picaros", n: "Pícaros" }
    ],
    cejas: [
      { id: "finas", n: "Finas" },
      { id: "gruesas", n: "Gruesas" },
      { id: "fruncidas", n: "Fruncidas" }
    ],
    bocas: [
      { id: "sonrisa", n: "Sonrisa" },
      { id: "seria", n: "Seria" },
      { id: "gritando", n: "Gritando" }
    ],
    accesorios: [
      { id: "nada", n: "Sin accesorio" },
      { id: "vincha", n: "Vincha" },
      { id: "munequeras", n: "Muñequeras" },
      { id: "ambas", n: "Vincha y muñequeras" }
    ],
    /* estilos de camiseta = FORMA (los colores los pone el equipo; el rival
       siempre juega A FRANJAS — esa identidad no se toca) */
    camisetas: [
      { id: "lisa", n: "Lisa" },
      { id: "banda", n: "Con banda" },
      { id: "cuello", n: "Cuello en V" }
    ]
  };
  var CAMPOS = { piel: "pieles", corte: "cortes", colorPelo: "colores_pelo", ojos: "ojos", cejas: "cejas", boca: "bocas", acc: "accesorios", camiseta: "camisetas" };

  function crearLook() { return { piel: 0, corte: 1, colorPelo: 0, ojos: 0, cejas: 0, boca: 0, acc: 0, camiseta: 0 }; }

  /* CUÁNTO HAY EN EL MANIFEST DE CARAS.
     validarLook tiene que plegar los índices al rango real, pero este módulo es
     lógica pura y no lee JSON (los tests lo requieren sin manifest). Así que el
     que carga el manifest avisa acá cuántas caras y cuántos tonos de camiseta
     hay, una sola vez, y validarLook deja de tener números clavados.
     Antes estaban a mano (8 caras, 3+1 camisetas) y agregar arte en el manifest
     no alcanzaba: los índices nuevos se plegaban con módulo y el jugador elegía
     una camiseta y veía otra. */
  var MANIFEST = { caras: 8, camisetas: 3, reemplazos: {} };
  function setCatalogoManifest(cfg) {
    if (!cfg || typeof cfg !== "object") return MANIFEST;
    ["caras", "camisetas"].forEach(function (k) {
      var v = cfg[k];
      if (typeof v === "number" && isFinite(v) && v >= 1) MANIFEST[k] = Math.floor(v);
    });
    /* OJOS: las caras fuera de rotación y quién toma su lugar (índice → índice).
       Solo se pisa si viene: un cfg sin reemplazos deja los que había. */
    if (cfg.reemplazos && typeof cfg.reemplazos === "object") {
      var r = {};
      Object.keys(cfg.reemplazos).forEach(function (k) {
        var de = parseInt(k, 10), a = cfg.reemplazos[k];
        if (isFinite(de) && typeof a === "number" && isFinite(a) && a >= 0 && a !== de) r[de] = Math.floor(a);
      });
      MANIFEST.reemplazos = r;
    }
    return MANIFEST;
  }

  /* ══════════════════════════════════════════════════════════════════════
     OJOS (tanda 1.0) · LAS CARAS FUERA DE ROTACIÓN.
     Pedido de Rodri: "hay un personaje que tiene los ojos cerrados, o
     acomodalo o sacalo". Era la cara 'Tranqui' (la 8ª, índice 7): dos
     párpados bajos y la cabeza gacha. No salía solo en el editor: el partido
     les pone cara por hash del nombre a quienes no elegiste, y medido en node
     con data/roster_pampeano.json, Santi y Mateo (el que juega al lado tuyo)
     caían en ella en TODOS los partidos; Damián y Santiago V. también, cuando
     les toca tu equipo. Acomodarla sería redibujarle los ojos, y el PNG es
     arte de Rodri: se SACA de la rotación sin tocar el archivo.
     El manifest la marca con en_rotacion:false y un reemplazo (Rulos). Esto
     lo traduce a índices, para que validarLook (un look guardado con esa
     cara), el roster y el ciclo del editor no la vean nunca. No se borra la
     entrada porque el hash del roster va con módulo del largo: con 7 caras
     tu equipo quedaba con 6 Melenas de 10 (medido). Así cambian SOLO los
     que caían en ella. cm = el JSON de data/caras_manifest.json. */
  function configDeCaras(cm) {
    var caras = (cm && Array.isArray(cm.caras)) ? cm.caras : [];
    var enRot = function (c) { return !!c && c.en_rotacion !== false; };
    var primera = -1;
    caras.forEach(function (c, i) { if (primera < 0 && enRot(c)) primera = i; });
    var reemplazos = {};
    caras.forEach(function (c, i) {
      if (!c || enRot(c)) return;
      var a = -1;
      caras.forEach(function (d, k) { if (a < 0 && enRot(d) && c.reemplazo && d.id === c.reemplazo) a = k; });
      /* sin reemplazo válido (o apunta a otra apagada): la primera en rotación */
      reemplazos[i] = a >= 0 ? a : Math.max(0, primera);
    });
    return {
      caras: caras.length || undefined,
      camisetas: cm && Array.isArray(cm.camisetas) ? cm.camisetas.length : undefined,
      reemplazos: reemplazos
    };
  }
  /* el índice que de verdad se ve (el reemplazo si esa cara está apagada) */
  function caraEnRotacion(i) {
    var r = MANIFEST.reemplazos[i];
    return typeof r === "number" ? r : i;
  }
  /* la cara de quien no la eligió (roster y rivales): por hash del nombre,
     el mismo de siempre ("|m" tu equipo, "|r" el rival) — mismo nombre,
     misma cara en todos los partidos — y nunca una fuera de rotación */
  function caraDelRoster(nombre, esRival) {
    return caraEnRotacion(hashSemilla((nombre || "x") + (esRival ? "|r" : "|m")) % MANIFEST.caras);
  }
  /* el stepper CARA del editor: un paso (d = -1 / +1) salteando las apagadas,
     como el de color de pelo saltea los tintes que una cara no admite */
  function ciclarCara(actual, d) {
    var n = MANIFEST.caras, paso = d < 0 ? -1 : 1;
    var v = ((Math.floor(Number(actual)) || 0) % n + n) % n;
    for (var k = 0; k < n; k++) {
      v = ((v + paso) % n + n) % n;
      if (typeof MANIFEST.reemplazos[v] !== "number") return v;
    }
    return caraEnRotacion(v);
  }

  /* tolerante: campos faltantes → default; índices fuera de rango → módulo */
  function validarLook(l) {
    var base = crearLook();
    l = (l && typeof l === "object") ? l : {};
    var out = {};
    Object.keys(CAMPOS).forEach(function (k) {
      var n = CATALOGO[CAMPOS[k]].length;
      var v = typeof l[k] === "number" && isFinite(l[k]) ? Math.abs(Math.floor(l[k])) : base[k];
      out[k] = v % n;
    });
    /* EDITOR v2: la CARA ilustrada (del manifest de bustos). Look viejo sin
       cara → 0 (Clásico): retrocompatible. El campo viaja con el look siempre. */
    out.cara = typeof l.cara === "number" && isFinite(l.cara) ? Math.abs(Math.floor(l.cara)) % MANIFEST.caras : 0;
    /* OJOS: una cara fuera de rotación guardada en un look (la eligió alguien
       antes de la tanda 1.0) pasa a su reemplazo: el editor abre con una cara
       de ojos abiertos y el partido muestra esa misma */
    out.cara = caraEnRotacion(out.cara);
    /* V7 §0.2: los TINTES de la cara ilustrada son OPCIONALES — 0 = "Original"
       (respeta los colores propios de la ilustración), k>0 = catálogo[k-1].
       tCam cicla los tonos de camiseta del manifest de caras + Original. */
    var tin = function (v, n) { return typeof v === "number" && isFinite(v) ? Math.abs(Math.floor(v)) % n : 0; };
    out.tPiel = tin(l.tPiel, CATALOGO.pieles.length + 1);
    out.tPelo = tin(l.tPelo, CATALOGO.colores_pelo.length + 1);
    out.tCam = tin(l.tCam, MANIFEST.camisetas + 1);
    return out;
  }

  /* piezas resueltas para el dibujo (ids + hex, no índices) */
  function resolver(look) {
    var l = validarLook(look);
    return {
      piel: CATALOGO.pieles[l.piel],
      corte: CATALOGO.cortes[l.corte],
      colorPelo: CATALOGO.colores_pelo[l.colorPelo],
      ojos: CATALOGO.ojos[l.ojos],
      cejas: CATALOGO.cejas[l.cejas],
      boca: CATALOGO.bocas[l.boca],
      acc: CATALOGO.accesorios[l.acc],
      camiseta: CATALOGO.camisetas[l.camiseta],
      conVincha: l.acc === 1 || l.acc === 3,
      conMunequeras: l.acc === 2 || l.acc === 3
    };
  }

  /* ---------- MIGRACIÓN del save clásico (career.look / amigo.look) ----------
     Clásico: {piel:0-2, pelo:0-4, camiseta:0-2} con
       pelos: 0 Rapado · 1 Corto oscuro · 2 Corto claro (flequillo) ·
              3 Largo oscuro · 4 Largo colorado (vincha)
       camisetas: 0 Lisa · 1 A franjas · 2 Con banda
     Las franjas quedaron como identidad DEL RIVAL en Phaser → van a "banda". */
  var MIGRA_PELO = [
    { corte: 0, colorPelo: 0 },            // rapado → Rapado negro
    { corte: 1, colorPelo: 1 },            // corto oscuro → Corto castaño
    { corte: 2, colorPelo: 2 },            // corto claro flequillo → Flequillo rubio
    { corte: 5, colorPelo: 0 },            // largo oscuro → Melena negra
    { corte: 4, colorPelo: 3, acc: 1 }     // largo colorado (vincha) → Colita colorada + vincha
  ];
  function migrarDelClasico(viejo) {
    if (!viejo || typeof viejo !== "object") return null;
    var l = crearLook();
    var pi = Math.abs((viejo.piel | 0)) % 3, pe = Math.abs((viejo.pelo | 0)) % 5, ca = Math.abs((viejo.camiseta | 0)) % 3;
    l.piel = pi;
    var m = MIGRA_PELO[pe];
    l.corte = m.corte; l.colorPelo = m.colorPelo; if (m.acc != null) l.acc = m.acc;
    l.camiseta = ca === 0 ? 0 : 1;         // lisa→Lisa · franjas/banda→Con banda
    return validarLook(l);
  }

  /* ---------- PROCEDURAL determinista (NPCs del roster, por nombre) ---------- */
  function hashSemilla(s) {
    s = String(s == null ? "" : s);
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h >>> 0;
  }
  function lookProcedural(semilla) {
    var h = hashSemilla(semilla);
    var sig = function (n) { var v = h % n; h = ((h * 1103515245 + 12345) & 0x7fffffff) >>> 0; return v; };
    return validarLook({
      piel: sig(CATALOGO.pieles.length),
      corte: sig(CATALOGO.cortes.length),
      colorPelo: sig(CATALOGO.colores_pelo.length),
      ojos: sig(CATALOGO.ojos.length),
      cejas: sig(CATALOGO.cejas.length),
      boca: sig(3) === 2 ? 2 : sig(2),                    // gritando es raro en NPCs
      acc: sig(4) === 3 ? sig(CATALOGO.accesorios.length) : 0,   // la mayoría sin accesorio
      camiseta: sig(CATALOGO.camisetas.length)
    });
  }

  /* V7: el look de BLOQUES derivado de la cara ilustrada + tintes — el
     muñequito del mapa/editor INSINÚA lo elegido. caraDef = la entrada del
     caras_manifest (tonos + corte_bloques). Tintes en 0 (Original) → los
     colores salen de la ILUSTRACIÓN (tono más cercano del catálogo). */
  function hexDist2(a, b) {
    var pa = parseInt(String(a).replace("#", ""), 16), pb = parseInt(String(b).replace("#", ""), 16);
    var dr = ((pa >> 16) & 255) - ((pb >> 16) & 255), dg = ((pa >> 8) & 255) - ((pb >> 8) & 255), db = (pa & 255) - (pb & 255);
    return dr * dr + dg * dg + db * db;
  }
  function masCercano(hex, lista) {
    var mejor = 0, d = Infinity;
    for (var i = 0; i < lista.length; i++) {
      var di = hexDist2(hex, lista[i].hex);
      if (di < d) { d = di; mejor = i; }
    }
    return mejor;
  }
  function lookParaBloques(look, caraDef) {
    var l = validarLook(look);
    var out = {};
    Object.keys(l).forEach(function (k) { out[k] = l[k]; });
    var T = caraDef && caraDef.tonos ? caraDef.tonos : null;
    if (l.tPiel > 0) out.piel = l.tPiel - 1;
    else if (T && T.piel) out.piel = masCercano(T.piel, CATALOGO.pieles);
    if (l.tPelo > 0) out.colorPelo = l.tPelo - 1;
    else if (T && T.pelo && T.pelo !== T.piel) out.colorPelo = masCercano(T.pelo, CATALOGO.colores_pelo);
    if (caraDef && caraDef.corte_bloques) {
      for (var c = 0; c < CATALOGO.cortes.length; c++) {
        if (CATALOGO.cortes[c].id === caraDef.corte_bloques) { out.corte = c; break; }
      }
    }
    return validarLook(out);
  }

  /* etiqueta corta legible ("Piel morena · Rulos negro · Vincha") */
  function lookLabel(look) {
    var r = resolver(look);
    var partes = [r.piel.n, r.corte.n + " " + r.colorPelo.n.toLowerCase()];
    if (r.acc.id !== "nada") partes.push(r.acc.n);
    return partes.join(" · ");
  }

  /* "#rrggbb" → número (para Phaser fillStyle) */
  function hexNum(hex) { return parseInt(String(hex).replace("#", ""), 16); }

  /* ---------- LAS RAMPAS DE COLOR (pedido de Rodri del 25/oct) ----------
     "Que tenga sentido el pelo y la piel": el teñido viejo cambiaba un solo
     tono por zona y las sombras quedaban con el color de la ilustración (el
     rubio del Flequillo salía rubio arriba y negro abajo, porque la sombra
     del pelo, #04121f, es más de la mitad del pelo). Ahora cada color es una
     RAMPA de tres tonos [sombra, medio, brillo] y cada píxel de la zona
     (máscaras de herramientas/mascaras_zonas.py) toma el tono de la rampa
     que le toca por su luz: las sombras del rubio son rubio oscuro.
     El tono MEDIO es el de la muestra del editor (el hex del catálogo; lo
     fija la suite, phaser/test/zonas.test.js). Un solo lugar para todas.
     "Naranja rival" es la camiseta de bando del rival en las ilustraciones. */
  var RAMPAS = {
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
  /* el MAPA DE DEGRADÉ de una zona: luz = [sombra, base, brillo] medidos en
     la ilustración (luminancia 0-255, data/zonas_manifest.json) y rampa =
     los tres tonos destino. Devuelve 256 colores RGB: la luminancia de cada
     píxel elige el suyo. Abajo de la sombra va hacia el negro de la línea
     (el borde suavizado de la tinta sigue siendo tinta) y arriba del brillo,
     hacia medio camino del blanco (los reflejos). */
  function lutDeZona(luz, rampa) {
    var ym = Math.max(3, Math.min(252, +luz[1]));
    var ys = Math.min(+luz[0], ym - 2), yb = Math.max(+luz[2], ym + 2);
    if (!(ys > 0)) ys = Math.max(1, ym * 0.6);
    if (yb >= 254) yb = ym + (255 - ym) / 2;
    var c = rampa.map(function (h) { var v = hexNum(h); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; });
    var tope = c[2].map(function (v) { return v + (255 - v) * 0.5; });
    var paradas = [[0, [0, 0, 0]], [ys, c[0]], [ym, c[1]], [yb, c[2]], [255, tope]];
    var lut = new Uint8Array(768);
    for (var y = 0, k = 0; y < 256; y++) {
      while (k < paradas.length - 2 && y > paradas[k + 1][0]) k++;
      var a = paradas[k], b = paradas[k + 1], t = Math.max(0, Math.min(1, (y - a[0]) / Math.max(1e-6, b[0] - a[0])));
      for (var ch = 0; ch < 3; ch++) lut[y * 3 + ch] = Math.round(a[1][ch] + (b[1][ch] - a[1][ch]) * t);
    }
    return lut;
  }
  /* la zona de cada píxel en la máscara (gris: 80 pelo, 160 piel, 240 camiseta) */
  var ZONAS = ["pelo", "piel", "camiseta"];
  function zonaDeMascara(v) { return v < 40 ? -1 : (v < 120 ? 0 : (v < 200 ? 1 : 2)); }
  /* tiñe bytes RGBA por zonas: d y m (la máscara, mismos píxeles) arrancan en
     la misma fila; luts[z] null = esa zona queda como está. Lo transparente
     (alfa < 128, el borde del recorte) no se toca, como antes */
  function tenirZonas(d, m, luts) {
    for (var i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 128) continue;
      var z = zonaDeMascara(m[i]);
      if (z < 0 || !luts[z]) continue;
      var k = ((d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000 | 0) * 3, L = luts[z];
      d[i] = L[k]; d[i + 1] = L[k + 1]; d[i + 2] = L[k + 2];
    }
  }
  /* qué color de pelo admite una cara (o una pose dibujada con su pelo):
     'tintes_pelo': false = ninguno (el Rapado: el pelo es la piel);
     'pelo_propio' = el color que ya trae (el Colorado no se tiñe de
     colorado: es lo mismo que el Original, que en el editor se llama
     "Original (colorado)"); 'tintes_pelo_excluye' = otros que no van */
  function tintePeloValido(def, tPelo) {
    if (!(tPelo > 0)) return true;
    if (!def || def.tintes_pelo === false) return false;
    var c = CATALOGO.colores_pelo[tPelo - 1];
    return !!c && c.id !== def.pelo_propio && !(Array.isArray(def.tintes_pelo_excluye) && def.tintes_pelo_excluye.indexOf(c.id) >= 0);
  }

  /* la pinta de VOS desde lo guardado (la carrera y los avatares sueltos del
     editor): la arma el partido y la mira lo que baja la corrida de tu pelo */
  function lookDeVos(career, sueltos) {
    var avs = (career && career.avatares) || sueltos || {};
    var nombre = career && career.name ? String(career.name).slice(0, 10) : "VOS";
    return validarLook(avs.vos || migrarDelClasico(career && career.look) || lookProcedural(nombre));
  }

  return {
    CATALOGO: CATALOGO, CAMPOS: CAMPOS,
    crearLook: crearLook, validarLook: validarLook, resolver: resolver,
    migrarDelClasico: migrarDelClasico, lookProcedural: lookProcedural,
    lookLabel: lookLabel, hexNum: hexNum, hashSemilla: hashSemilla,
    lookParaBloques: lookParaBloques, masCercano: masCercano,
    setCatalogoManifest: setCatalogoManifest, MANIFEST: MANIFEST,
    configDeCaras: configDeCaras, caraEnRotacion: caraEnRotacion,
    caraDelRoster: caraDelRoster, ciclarCara: ciclarCara, lookDeVos: lookDeVos,
    RAMPAS: RAMPAS, ZONAS: ZONAS, lutDeZona: lutDeZona, zonaDeMascara: zonaDeMascara,
    tenirZonas: tenirZonas, tintePeloValido: tintePeloValido
  };
});
