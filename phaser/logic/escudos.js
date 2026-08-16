/* ============================================================================
   PAMPA STAR · phaser/logic/escudos.js — LÓGICA PURA (sin Phaser, sin DOM)
   N3 · EL ESCUDO DE CADA CLUB, GENERADO POR CÓDIGO

   45 clubes rivales en 5 divisiones y ninguno tenía escudo. Dibujarlos a mano
   era la opción cara; esto los deriva del NOMBRE por semilla, así el día que se
   agregue un club nuevo su escudo ya existe sin tocar nada.

   Este módulo NO dibuja: devuelve una DESCRIPCIÓN declarativa
   {forma, patron, colorA, colorB, colorC, inicial}. La escena la interpreta.
   Así la generación entera se puede probar en node.

   ── DOS REGLAS QUE MANDAN SOBRE LO DEMÁS ────────────────────────────────────

   1. TODOS FICTICIOS. Ningún escudo puede parecerse a uno real, ni en forma ni
      en colores ni en nombre. Por eso los colores NO son libres: salen de una
      paleta cerrada, la del propio juego. Un generador con colores libres
      termina, tarde o temprano, sacando la combinación de algún club o alguna
      bandera de verdad; con paleta cerrada eso no puede pasar, y de paso todos
      los escudos se ven de la misma familia.

   2. SE DISTINGUEN POR FORMA, NO SOLO POR COLOR. Son 7 siluetas x 7 patrones
      internos: dos clubes distintos se separan aunque no se vea un solo color.
      Y dentro de una misma división está GARANTIZADO que no se repita la
      combinación (forma, patrón) — ver desempate abajo.

   ── EL DESEMPATE, que es la parte que no es obvia ───────────────────────────
   escudoDe(nombre) depende solo del nombre. Pero con 49 combinaciones (forma x
   patrón) y 10 clubes por división, la probabilidad de que dos caigan en la
   misma es alta (paradoja del cumpleaños: ~65%). Y dos escudos con la misma
   silueta y el mismo patrón, distinguibles solo por color, es exactamente lo
   que no se puede hacer.

   Por eso escudosDe(lista) corre un desempate: recorre la lista en orden
   alfabético —para que el resultado no dependa del orden en que venga la
   lista— y al que colisiona le rota el patrón hasta encontrar uno libre. Sigue
   siendo determinista: la misma división da siempre los mismos escudos.
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaEscudos = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* Las 7 siluetas. El orden importa: es el que usa la semilla. */
  var FORMAS = [
    "escudo",      // el clásico: hombros rectos y punta abajo
    "circulo",     // redondo entero
    "rombo",       // parado sobre una punta
    "hexagono",    // seis lados, plano arriba
    "cuadrado",    // cuadrado de esquinas redondeadas
    "punta",       // triángulo invertido, base ancha arriba
    "banderin"     // rectángulo con una muesca en V abajo
  ];

  /* Los 7 patrones internos. Todos legibles en 1 bit: se distinguen en blanco
     y negro, que es el criterio que importa. */
  var PATRONES = [
    "liso",        // sin nada
    "vertical",    // franja vertical al medio
    "horizontal",  // franja horizontal al medio
    "diagonal",    // banda en diagonal
    "cuartos",     // cuatro cuadrantes alternados
    "aro",         // anillo concéntrico
    "chevron"      // galón en V
  ];

  /* PALETA CERRADA. Salen del juego: la piel (acento, cálido, texto) y las
     camisetas del editor. Ningún tono es de libre elección. */
  var PALETA = [
    "#F5C400",   // acento (amarillo pampa)
    "#FF6B4A",   // cálido
    "#F6EFDC",   // crema del texto
    "#54BCEC",   // celeste titular
    "#2E7D32",   // verde caldén
    "#7B2233",   // bordó salitral
    "#E8712F",   // naranja atardecer
    "#6A3FA0",   // violeta jarilla
    "#E8C33A",   // amarillo trigo
    "#232323",   // negro tranquera
    "#0E2A1A",   // marco (verde muy oscuro)
    "#9FB3A5"    // gris verdoso del texto apagado
  ];

  /* Luma aproximada, para no poner dos colores que se confundan entre sí ni
     una inicial que no se lea sobre el fondo. */
  function luma(hex) {
    var n = parseInt(String(hex).replace("#", ""), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }

  /* hash determinista del nombre (FNV-1a de 32 bits). Estable entre corridas y
     entre node y el browser, que es lo que hace falta para que el escudo de un
     club sea siempre el mismo. */
  function hash(str) {
    var h = 2166136261 >>> 0;
    str = String(str);
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  /* de un hash saco varios números independientes sin que se correlacionen */
  function bits(h, corrimiento) {
    return (Math.imul(h ^ (corrimiento * 2654435761), 2246822519) >>> 0);
  }

  /* LA INICIAL. Una o dos letras que ayuden a leer el club de un vistazo.
     Se saltean las palabras de relleno ("de", "del", "la") porque una "D" no
     dice nada. Con una sola palabra, se usan sus dos primeras letras. */
  var RELLENO = { de: 1, del: 1, la: 1, las: 1, los: 1, el: 1, y: 1, fc: 1 };
  function inicialDe(nombre) {
    var palabras = String(nombre || "").trim().split(/\s+/)
      .filter(function (p) { return p && !RELLENO[p.toLowerCase()]; });
    if (!palabras.length) return "?";
    if (palabras.length === 1) {
      var u = palabras[0].toUpperCase();
      return u.length > 1 ? u.slice(0, 2) : u;
    }
    return (palabras[0][0] + palabras[1][0]).toUpperCase();
  }

  /* EL ESCUDO DE UN CLUB, solo a partir de su nombre. */
  function escudoDe(nombre) {
    var h = hash(nombre);
    var iForma = bits(h, 1) % FORMAS.length;
    var iPatron = bits(h, 2) % PATRONES.length;
    var iA = bits(h, 3) % PALETA.length;

    /* el segundo color tiene que CONTRASTAR con el primero: si no, el patrón
       existe pero no se ve, y el escudo pasa a distinguirse solo por silueta */
    var iB = bits(h, 4) % PALETA.length;
    var vueltas = 0;
    while (Math.abs(luma(PALETA[iA]) - luma(PALETA[iB])) < 0.25 && vueltas < PALETA.length) {
      iB = (iB + 1) % PALETA.length; vueltas++;
    }
    /* el tercero es el de la inicial: el que más contraste contra el fondo */
    var colorA = PALETA[iA], colorB = PALETA[iB];
    var colorC = luma(colorA) > 0.5 ? "#0A1F13" : "#F6EFDC";

    return {
      nombre: nombre,
      forma: FORMAS[iForma],
      patron: PATRONES[iPatron],
      colorA: colorA,        // fondo del escudo
      colorB: colorB,        // el patrón
      colorC: colorC,        // la inicial
      inicial: inicialDe(nombre),
      semilla: h
    };
  }

  /* LOS ESCUDOS DE UN CONJUNTO, con el desempate de (forma, patrón).
     Determinista: no depende del orden en que venga la lista. */
  function escudosDe(nombres) {
    var lista = (nombres || []).slice().sort();
    var usadas = {}, out = {};
    lista.forEach(function (n) {
      var e = escudoDe(n);
      var iP = PATRONES.indexOf(e.patron);
      var giros = 0;
      while (usadas[e.forma + "|" + PATRONES[iP]] && giros < PATRONES.length) {
        iP = (iP + 1) % PATRONES.length; giros++;
      }
      /* si los 7 patrones de esa forma están tomados, se rota la FORMA */
      if (giros >= PATRONES.length) {
        var iF = FORMAS.indexOf(e.forma), gf = 0;
        while (gf < FORMAS.length) {
          iF = (iF + 1) % FORMAS.length; gf++;
          iP = PATRONES.indexOf(e.patron);
          var libre = false, g2 = 0;
          while (g2 < PATRONES.length) {
            if (!usadas[FORMAS[iF] + "|" + PATRONES[iP]]) { libre = true; break; }
            iP = (iP + 1) % PATRONES.length; g2++;
          }
          if (libre) break;
        }
        e.forma = FORMAS[iF];
      }
      e.patron = PATRONES[iP];
      usadas[e.forma + "|" + e.patron] = true;
      out[n] = e;
    });
    /* LAS INICIALES TAMBIÉN SE DESEMPATAN. En primera_b, "Centro Oeste" y
       "Cochico FC" daban las dos "CO", y "Atlético Carro Quemado" y "Atlético
       Caleufú" las dos "AC". La silueta ya los separa, pero la inicial está
       para leer el club de un vistazo y dos "CO" no ayudan a nadie. Al segundo
       (alfabético, así es estable) se le agrega una letra más de la palabra
       que los diferencia. */
    var vistas = {};
    lista.forEach(function (n) {
      var e = out[n], ini = e.inicial;
      if (!vistas[ini]) { vistas[ini] = n; return; }
      var palabras = String(n).split(/\s+/).filter(function (p) { return p && !RELLENO[p.toLowerCase()]; });
      var cands = [];
      if (palabras.length > 1) cands.push((palabras[0][0] + palabras[1].slice(0, 2)).toUpperCase());
      cands.push((palabras[0].slice(0, 3)).toUpperCase());
      if (palabras.length > 2) cands.push((palabras[0][0] + palabras[1][0] + palabras[2][0]).toUpperCase());
      cands.push((palabras[0][0] + palabras[0].slice(-1)).toUpperCase());
      for (var c = 0; c < cands.length; c++) {
        if (!vistas[cands[c]]) { e.inicial = cands[c]; break; }
      }
      vistas[e.inicial] = n;
    });
    return out;
  }

  return {
    escudoDe: escudoDe, escudosDe: escudosDe,
    inicialDe: inicialDe, hash: hash, luma: luma,
    FORMAS: FORMAS, PATRONES: PATRONES, PALETA: PALETA
  };
});
