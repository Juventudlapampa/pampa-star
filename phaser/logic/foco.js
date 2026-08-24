/* ============================================================================
   PAMPA STAR · phaser/logic/foco.js — A DÓNDE VA EL CURSOR

   ═══ POR QUÉ EXISTE ═══

   El juego tenía CUATRO navegaciones por teclado —la cruz del partido, el pase
   dirigido, el mapa de clubes y las filas del editor— y cada una había
   inventado su propio resalte: la cruz cambia el grosor del borde de 2 a 4, el
   mapa pone anillo + estrella, el editor pega un "► " al texto, y el pase
   dibuja el mismo foco con dos grosores distintos según qué capa lo pinte.
   Cuatro soluciones al mismo problema, ninguna reusable.

   Y los otros CINCO grupos de opciones (los presets de tempo, las diez tarjetas
   de la semana, las cuatro respuestas de la entrevista, los botones del jugadón
   y los botones sueltos) no tienen navegación ninguna: son atajos numéricos y
   listo. Si soltás el mouse, el juego no te contesta.

   ═══ QUÉ RESUELVE ESTE MÓDULO ═══

   Una sola pregunta, y es puramente geométrica: **dada una lista de cajas y una
   dirección, ¿cuál es la siguiente?**

   Geométrica a propósito: así el MISMO llamado sirve para la cruz (cuatro cajas
   en aspa), para la grilla de 5×2 de la semana, para la columna de 4 respuestas
   y para los 10 puntos desparramados del mapa, sin que nadie declare "esto es
   una grilla" ni "esto es una lista". El layout no se declara: se mide.

   Es lógica pura y se puede correr en node, que es lo que permite probar los
   casos raros (cajas solapadas, una sola opción, todo bloqueado) sin abrir el
   navegador.
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaFoco = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var DIRS = { izq: [-1, 0], der: [1, 0], arriba: [0, -1], abajo: [0, 1] };

  function centro(c) {
    return { x: c.x + (c.w || 0) / 2, y: c.y + (c.h || 0) / 2 };
  }

  /* ¿se puede parar acá? Una opción bloqueada SÍ se puede enfocar —se enfoca y
     te dice por qué no podés—, pero una oculta no existe. Saltear las
     bloqueadas sería peor: el jugador no se enteraría de que están. */
  function enfocable(c) { return !!c && c.oculta !== true; }

  /* ══════════════════════════════════════════════════════════════════════
     EL VECINO EN UNA DIRECCIÓN.

     La regla, en orden:
       1. solo cuenta lo que está DE ESE LADO (proyección positiva sobre el eje)
       2. entre esos, gana el que está más ALINEADO — la distancia perpendicular
          pesa el doble que la del eje. Es lo que hace que bajando en una grilla
          caigas en la celda de abajo y no en la diagonal.
       3. si no hay nadie de ese lado, NO se envuelve al otro extremo: el cursor
          se queda. Envolver en una cruz de cuatro hace que "arriba" y "abajo"
          lleven al mismo lado y se pierde el mapa mental.
     ══════════════════════════════════════════════════════════════════════ */
  function vecino(cajas, desde, dir, opts) {
    opts = opts || {};
    var d = DIRS[dir];
    if (!d || !cajas || !cajas.length) return desde;
    var i = (desde == null || !cajas[desde]) ? -1 : desde;
    if (i < 0) return primero(cajas);
    var o = centro(cajas[i]);
    var mejor = -1, mejorPeso = Infinity;
    var pesoPerp = opts.peso_perpendicular != null ? opts.peso_perpendicular : 2;
    for (var k = 0; k < cajas.length; k++) {
      if (k === i || !enfocable(cajas[k])) continue;
      var c = centro(cajas[k]);
      var dx = c.x - o.x, dy = c.y - o.y;
      var eje = dx * d[0] + dy * d[1];
      if (eje <= 1) continue;                          // no está de ese lado
      var perp = Math.abs(dx * d[1] - dy * d[0]);      // cuánto se desvía
      var peso = eje + perp * pesoPerp;
      if (peso < mejorPeso) { mejorPeso = peso; mejor = k; }
    }
    return mejor >= 0 ? mejor : i;
  }

  /* el primero enfocable, para abrir con foco puesto. Un menú que abre sin
     nadie elegido obliga a un toque de más antes de poder hacer nada. */
  function primero(cajas, preferido) {
    if (!cajas || !cajas.length) return -1;
    if (preferido != null && enfocable(cajas[preferido])) return preferido;
    /* se prefiere una que se pueda usar; si todas están bloqueadas, la primera */
    for (var k = 0; k < cajas.length; k++) if (enfocable(cajas[k]) && !cajas[k].bloqueada) return k;
    for (var j = 0; j < cajas.length; j++) if (enfocable(cajas[j])) return j;
    return -1;
  }

  /* ciclar en orden de lectura, para Tab y para los grupos que no tienen forma
     espacial clara (una fila de botones sueltos) */
  function siguiente(cajas, desde, paso) {
    if (!cajas || !cajas.length) return -1;
    paso = paso || 1;
    var n = cajas.length, i = (desde == null || desde < 0) ? -1 : desde;
    for (var k = 1; k <= n; k++) {
      var j = ((i + paso * k) % n + n) % n;
      if (enfocable(cajas[j])) return j;
    }
    return i;
  }

  /* el más cercano a un punto: para que tocar con el dedo TAMBIÉN mueva el
     cursor. Si el dedo y el teclado dejan el foco en lugares distintos, el
     jugador pierde el hilo de dónde estaba. */
  function masCerca(cajas, x, y) {
    var mejor = -1, md = Infinity;
    for (var k = 0; k < (cajas || []).length; k++) {
      if (!enfocable(cajas[k])) continue;
      var c = centro(cajas[k]);
      var d = (c.x - x) * (c.x - x) + (c.y - y) * (c.y - y);
      if (d < md) { md = d; mejor = k; }
    }
    return mejor;
  }

  return {
    DIRS: DIRS, vecino: vecino, primero: primero,
    siguiente: siguiente, masCerca: masCerca, enfocable: enfocable, centro: centro
  };
});
