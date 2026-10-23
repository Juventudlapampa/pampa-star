/* ============================================================================
   PAMPA STAR · phaser/logic/tutorial.js — EL TUTORIAL EN CONTEXTO (ola 3, L13)

   Antes el primer partido abría tres tarjetas juntas (mover, ACCIÓN, PASE),
   la primera y la tercera decían lo mismo, y nada explicaba lo que más se
   repite: el rival elige en secreto. Tampoco el aguante: en el primer partido
   GAMBETA quedaba "SIN AGUANTE" sin una palabra de por qué.

   Ahora cada cosa se explica UNA vez, en el momento en que pasa:
     libre        al arrancar el primer partido: cómo se mueve, ACCIÓN y qué es
                  cada forma del MAPA (círculo tu equipo, triángulo el rival)
     duelo        el primer cruce con la pelota, en el título del menú
     duelo_def    el primer cruce defendiendo, en el título del menú
     sin_aguante  la primera vez que el menú tiene una jugada SIN AGUANTE
     toque        el primer EL TOQUE: la consigna larga (la arma toque_ui.js)
   El PASE se explica solo: su menú dice dónde tocar.

   Lo visto se guarda (match.js, localStorage pampa_tutorial) y no vuelve.
   Las teclas se nombran solo donde hay teclado.

   Lógica pura: corre en node (phaser/test/tutorial.test.js).
   ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PampaTutorial = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var IDS = ["libre", "duelo", "duelo_def", "sin_aguante", "toque"];

  var TEXTOS = {
    libre: function (c) {
      var donde = c.split ? "en el MAPA de abajo" : "sobre la cancha";
      var mover = c.tactil ? "Movés con el DEDO " + donde : "Movés con el MOUSE: clic " + donde + " (o con las flechas / WASD)";
      var accion = "ACCIÓN abre el menú de jugadas" + (c.tactil ? "" : " (en teclado: ESPACIO)");
      var leyenda = (c.split ? "En el MAPA" : "En la cancha") + ", el círculo es tu equipo y el triángulo, el rival";
      return [mover, accion, leyenda].join("\n");
    },
    duelo: function (c) {
      return "¡" + c.rival + " te sale al cruce! Va a elegir en secreto: si adivina tu jugada, te la saca";
    },
    duelo_def: function (c) {
      return "¡" + c.rival + " avanza! Elegís en secreto: si adivinás su jugada, se la sacás";
    },
    sin_aguante: function (c) {
      return c.lado === "defensa"
        ? "SIN AGUANTE: a quien marca no le dan las piernas para esa jugada. Quien no corre ni marca, recupera"
        : "SIN AGUANTE: a quien la lleva no le dan las piernas para gambetear ni patear. El PASE sigue, y sin la pelota se recupera";
    },
    toque: function () { return null; }
  };

  /* qué cartel toca en este momento, o null. momento: "libre", "menu_ataque",
     "menu_defensa" o "toque". ctx: tactil, split, rival (el nombre, si hay
     cruce) y sinAguante (si el menú tiene una jugada SIN AGUANTE). */
  function cartel(momento, vistos, ctx) {
    vistos = vistos || {};
    ctx = ctx || {};
    var id = null;
    if (momento === "libre") id = "libre";
    else if (momento === "toque") id = "toque";
    else if (momento === "menu_ataque" || momento === "menu_defensa") {
      var duelo = momento === "menu_ataque" ? "duelo" : "duelo_def";
      if (ctx.rival && !vistos[duelo]) id = duelo;
      else if (ctx.sinAguante) id = "sin_aguante";
    }
    if (!id || vistos[id]) return null;
    return { id: id, texto: TEXTOS[id]({ tactil: !!ctx.tactil, split: !!ctx.split, rival: String(ctx.rival || "").toUpperCase(), lado: momento === "menu_defensa" ? "defensa" : "ataque" }) };
  }

  /* lo guardado → { id: true }; acepta lo que haya (vacío, roto o viejo) */
  function leerVistos(raw) {
    var v = {};
    if (!raw) return v;
    var o;
    try { o = JSON.parse(raw); } catch (e) { return v; }
    if (o && typeof o === "object") IDS.forEach(function (id) { if (o[id] === true) v[id] = true; });
    return v;
  }

  function marcar(vistos, id) {
    var v = {};
    Object.keys(vistos || {}).forEach(function (k) { v[k] = vistos[k]; });
    if (IDS.indexOf(id) >= 0) v[id] = true;
    return v;
  }

  return { IDS: IDS, cartel: cartel, leerVistos: leerVistos, marcar: marcar };
});
