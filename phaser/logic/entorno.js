/* ============================================================================
   PAMPA STAR · phaser/logic/entorno.js — EL LUGAR DONDE CORRE EL JUEGO
   (lógica pura, tanda 1.0, lote L07-celular)

   El juego se difunde por link: se abre en el teléfono de una piba o un pibe
   de 12 a 25 años, casi siempre desde un mensaje o una red social, muchas
   veces en vertical. Lo que estaba mal, medido con grep sobre phaser/ antes
   de este lote: requestFullscreen, startFullscreen y orientation.lock daban
   0. Con la barra de Chrome el lienzo se ve a 0,659; a pantalla completa, a
   0,763 (16% más grande). Y quien tiene la rotación bloqueada quedaba
   trabado en "Girá el celular".

   Acá van las DECISIONES, como funciones puras que reciben lo que hay que
   saber del navegador (index.html y las escenas lo miden y se lo pasan): así
   corren en node y se prueban sin teléfono (phaser/test/pantalla_completa.test.js).
   ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PampaEntorno = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var E = {};

  /* ══════════════════════════════════════════════════════════════════════
     PANTALLA COMPLETA (pantalla-completa)

     e = { origen: "compuerta" | "boton", disponible, activa, instalada,
           tactil, embebido, auto }
       · disponible: el navegador tiene la API y la deja usar (Phaser dice
         fullscreen.available y document.fullscreenEnabled no es false: en
         un iframe sin allow="fullscreen" es false). En iPhone no hay API
         para elementos: queda en false y no se pide nada;
       · instalada: display-mode standalone. La app instalada ya abre sin
         barra y apaisada (manifest: orientation landscape);
       · tactil: el puntero principal es un dedo (pointer: coarse).
     auto (balance.pantalla.auto): cuándo la COMPUERTA la pide sola.
       "tactil"  (por defecto) solo en teléfonos y tabletas;
       "siempre" también en la compu;
       "nunca"   solo con el botón.
     El botón la pide siempre que se pueda: lo tocó quien juega. */
  E.AUTO = ["tactil", "siempre", "nunca"];
  E.decidirPantallaCompleta = function (e) {
    e = e || {};
    if (!e.disponible) return { pedir: false, motivo: "sin_api" };
    if (e.activa) return { pedir: false, motivo: "ya_esta" };
    if (e.origen === "boton") return { pedir: true, motivo: "boton" };
    if (e.instalada) return { pedir: false, motivo: "instalada" };
    /* adentro de la página de otro sitio no se agranda sola: el juego es un
       invitado ahí (le queda el botón) */
    if (e.embebido) return { pedir: false, motivo: "embebido" };
    var auto = E.AUTO.indexOf(e.auto) >= 0 ? e.auto : "tactil";
    if (auto === "nunca") return { pedir: false, motivo: "apagada" };
    if (auto === "tactil" && !e.tactil) return { pedir: false, motivo: "no_tactil" };
    return { pedir: true, motivo: "compuerta" };
  };
  /* el botón PANTALLA se ofrece si sirve: hay API y no está instalada */
  E.mostrarBotonPantalla = function (e) {
    return !!(e && e.disponible && !e.instalada);
  };

  return E;
});
