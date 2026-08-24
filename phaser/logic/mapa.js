/* ============================================================================
   PAMPA STAR · phaser/logic/mapa.js — EL MAPA DE LA PAMPA

   ═══ POR QUÉ ES POR ZONAS Y NO POR COORDENADAS ═══

   D4 pide el mapa de La Pampa en vez de la lista con flechitas, y dice con
   todas las letras: "No inventes coordenadas: si no hay posiciones
   disponibles, hacé un mapa esquemático por zonas y anotá que Rodri carga las
   coordenadas exactas".

   Se buscó y NO HAY: data/roster_pampeano.json tiene los diez pueblos con su
   apodo y sus jugadores, y nada de ubicación. Ningún otro archivo del proyecto
   tiene latitud, longitud ni x/y de pueblo.

   Así que este módulo trabaja con ZONAS —norte, centro, oeste, sur, este— que
   son un dato del roster y no un número inventado. Cada zona es una CAJA en el
   esquema, y los pueblos de esa zona se reparten adentro de su caja.

   ═══ CUANDO LLEGUEN LAS COORDENADAS ═══

   Si un pueblo trae `x` e `y` (0..1, con 0,0 arriba a la izquierda del rectángulo
   de la provincia), se usan ESOS y la zona se ignora. O sea: Rodri carga las
   coordenadas de a uno, sin tocar código, y cada pueblo que las tenga deja de
   ser esquemático. No hay migración: conviven.

   La forma de la provincia también es dato (CONTORNO), esquemática a propósito:
   es un rectángulo con la punta de abajo recortada, que es lo que se reconoce
   de un vistazo sin pretender ser un mapa de verdad.

   Es lógica pura: se puede correr en node.
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaMapa = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* las cinco zonas, cada una una caja en el rectángulo 0..1 de la provincia.
     Las cajas se solapan a propósito en los bordes: una provincia no tiene
     líneas adentro, y un pueblo del "centro-norte" tiene que poder caer entre
     las dos sin quedar pegado a un borde inventado. */
  var ZONAS = {
    norte:  { n: "NORTE",  x0: 0.10, y0: 0.04, x1: 0.92, y1: 0.30 },
    oeste:  { n: "OESTE",  x0: 0.06, y0: 0.28, x1: 0.44, y1: 0.72 },
    centro: { n: "CENTRO", x0: 0.36, y0: 0.30, x1: 0.76, y1: 0.66 },
    este:   { n: "ESTE",   x0: 0.66, y0: 0.28, x1: 0.96, y1: 0.70 },
    sur:    { n: "SUR",    x0: 0.16, y0: 0.66, x1: 0.86, y1: 0.94 }
  };

  /* el contorno esquemático: rectángulo con la esquina de abajo a la derecha
     comida, que es la silueta que se reconoce. Puntos en 0..1. */
  var CONTORNO = [
    [0.04, 0.02], [0.97, 0.02], [0.97, 0.62], [0.78, 0.79],
    [0.62, 0.98], [0.04, 0.98]
  ];

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* dónde va cada pueblo. `pueblos` es una lista de {nombre, zona, x, y}.
     Devuelve [{nombre, zona, x, y, exacto}] con x/y en 0..1.

     Los de la misma zona se reparten en una grilla adentro de su caja, en el
     orden en que vienen: es estable (el mismo roster da siempre el mismo mapa)
     y no depende del azar, que en un mapa se vería como que los pueblos se
     mudan entre partidas. */
  function ubicar(pueblos) {
    if (!pueblos || !pueblos.length) return [];
    var porZona = {};
    pueblos.forEach(function (p) {
      var z = (p && p.zona) || "centro";
      (porZona[z] = porZona[z] || []).push(p);
    });
    var out = [];
    Object.keys(porZona).forEach(function (z) {
      var caja = ZONAS[z] || ZONAS.centro;
      var lista = porZona[z];
      var n = lista.length;
      var cols = Math.ceil(Math.sqrt(n));
      var filas = Math.ceil(n / cols);
      lista.forEach(function (p, i) {
        if (typeof p.x === "number" && typeof p.y === "number") {
          out.push({ nombre: p.nombre, zona: z, x: clamp(p.x, 0, 1), y: clamp(p.y, 0, 1), exacto: true });
          return;
        }
        var c = i % cols, f = Math.floor(i / cols);
        /* el centro de la celda, no la esquina: así el punto nunca toca el
           borde de la caja y las etiquetas tienen aire */
        var fx = cols > 1 ? (c + 0.5) / cols : 0.5;
        var fy = filas > 1 ? (f + 0.5) / filas : 0.5;
        out.push({
          nombre: p.nombre, zona: z, exacto: false,
          x: caja.x0 + fx * (caja.x1 - caja.x0),
          y: caja.y0 + fy * (caja.y1 - caja.y0)
        });
      });
    });
    return out;
  }

  /* ¿cuántos de los pueblos tienen coordenada de verdad? Sirve para decirlo en
     pantalla: un mapa esquemático que se presenta como exacto miente. */
  function cuantosExactos(ubicados) {
    return (ubicados || []).filter(function (p) { return p.exacto; }).length;
  }

  /* el más cercano a un punto (para tocar el mapa con el dedo y que agarre) */
  function masCerca(ubicados, x, y, radio) {
    var mejor = null, md = radio != null ? radio : 1e9;
    (ubicados || []).forEach(function (p) {
      var d = Math.sqrt((p.x - x) * (p.x - x) + (p.y - y) * (p.y - y));
      if (d < md) { md = d; mejor = p; }
    });
    return mejor;
  }

  return {
    ZONAS: ZONAS, CONTORNO: CONTORNO,
    ubicar: ubicar, cuantosExactos: cuantosExactos, masCerca: masCerca, clamp: clamp
  };
});
