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
    /* EDITOR v2: la CARA ilustrada (0-7 del manifest de bustos). Look viejo sin
       cara → 0 (Clásico): retrocompatible. El campo viaja con el look siempre. */
    out.cara = typeof l.cara === "number" && isFinite(l.cara) ? Math.abs(Math.floor(l.cara)) % 8 : 0;
    /* V7 §0.2: los TINTES de la cara ilustrada son OPCIONALES — 0 = "Original"
       (respeta los colores propios de la ilustración), k>0 = catálogo[k-1].
       tCam cicla los tonos de camiseta del manifest de caras (3) + Original. */
    var tin = function (v, n) { return typeof v === "number" && isFinite(v) ? Math.abs(Math.floor(v)) % n : 0; };
    out.tPiel = tin(l.tPiel, CATALOGO.pieles.length + 1);
    out.tPelo = tin(l.tPelo, CATALOGO.colores_pelo.length + 1);
    out.tCam = tin(l.tCam, 4);
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

  /* etiqueta corta legible ("Piel morena · Rulos negro · Vincha") */
  function lookLabel(look) {
    var r = resolver(look);
    var partes = [r.piel.n, r.corte.n + " " + r.colorPelo.n.toLowerCase()];
    if (r.acc.id !== "nada") partes.push(r.acc.n);
    return partes.join(" · ");
  }

  /* "#rrggbb" → número (para Phaser fillStyle) */
  function hexNum(hex) { return parseInt(String(hex).replace("#", ""), 16); }

  return {
    CATALOGO: CATALOGO, CAMPOS: CAMPOS,
    crearLook: crearLook, validarLook: validarLook, resolver: resolver,
    migrarDelClasico: migrarDelClasico, lookProcedural: lookProcedural,
    lookLabel: lookLabel, hexNum: hexNum, hashSemilla: hashSemilla
  };
});
