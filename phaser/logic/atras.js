/* ============================================================================
   PAMPA STAR · phaser/logic/atras.js — QUÉ HACE EL "ATRÁS" (lógica pura)

   Lo que estaba mal, medido: popstate, pushState, beforeunload y pagehide
   daban 0 resultados en phaser/ (grep). En el teléfono el gesto atrás (deslizar
   desde el borde, que en horizontal queda justo bajo los pulgares) o la tecla
   atrás SALE de la página: si el juego se abrió desde un mensaje en una pestaña
   sin historial, la cierra; en la PWA instalada, cierra la app. Y el partido
   en curso se pierde entero, porque nada del partido vive en el save hasta el
   pitazo.

   index.html deja un escalón propio en el historial (pushState) y, cuando el
   gesto lo consume (popstate), le pregunta a esta función qué hacer según la
   pantalla que está a la vista. Las cinco respuestas:

     'pausa'             el partido se pausa (en LIBRE abre la PAUSA; en una
                         jugada que está corriendo, la pide para cuando termine)
     'cerrar_menu'       hay algo abierto que se cierra: lo mismo que hace ESC
                         (la PAUSA misma, el pase dirigido, la cruz con ✕, la
                         caja del código de carrera)
     'volver'            a la pantalla anterior (las vistas del Master; la
                         pantalla final del partido sale por su botón principal;
                         el menú de tempo, antes de empezar, vuelve sin jugar)
     'confirmar_salida'  en el editor y en la intro: "Tocá ATRÁS otra vez para
                         salir" durante VENTANA_MS
     'salir'             el segundo atrás dentro de la ventana: index.html no
                         vuelve a poner el escalón y hace history.back()

   El "anterior" de msDesdeElAnterior es el atrás anterior QUE PIDIÓ CONFIRMAR,
   no cualquier atrás: si no, volver del Master al editor y tocar atrás un
   segundo después ya te sacaba del juego sin aviso.

   Sin DOM ni Phaser: lo prueba phaser/test/atras.test.js en node.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PampaAtras = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VENTANA_MS = 2000;
  var DECISIONES = ["pausa", "cerrar_menu", "volver", "confirmar_salida", "salir"];
  var MENSAJE = "Tocá ATRÁS otra vez para salir";

  /* estado: lo que la escena a la vista cuenta de sí (estadoAtras() en cada
     escena; index.html completa `escena` con la clave de Phaser):
       { escena: "match" | "master" | "editor" | "intro",
         estado: el estado del partido ("LIBRE", "MENU", "PASE", "PAUSA",
                 "FINAL", "DEFINICION"…),
         menuConSalida: el menú abierto del partido se puede cerrar (la cruz
                 tiene ✕, el pase dirigido se cancela),
         cajaAbierta: la caja DOM del código de carrera está a la vista (Master) }
     ms: milisegundos desde el atrás anterior que pidió confirmar (Infinity,
     null o negativo = no hubo). opciones.ventana pisa VENTANA_MS. */
  function decidir(estado, ms, opciones) {
    var e = estado || {};
    var ventana = opciones && opciones.ventana > 0 ? opciones.ventana : VENTANA_MS;
    if (e.escena === "match") {
      /* el partido terminó: atrás es la salida principal de la pantalla final,
         el botón donde arranca el cursor (SEGUIR LA CARRERA, VOLVER AL MENÚ o,
         en el partido que pide el clásico, APLICAR Y VOLVER A LA CARRERA, que
         es la que anota el resultado). El partido la cumple recién cuando los
         botones están a la vista (match.js, salidasDelFinal) */
      if (e.estado === "FINAL") return "volver";
      /* antes de que empiece (el menú de tempo, con el reloj en 0:00) no hay
         partido que perder: atrás vuelve a donde se venía */
      if (e.estado === "TEMPO_MENU") return "volver";
      /* con la PAUSA abierta, atrás es SEGUIR: lo que se abre con atrás se
         cierra con atrás, como cualquier diálogo del teléfono */
      if (e.estado === "PAUSA") return "cerrar_menu";
      if ((e.estado === "MENU" || e.estado === "PASE") && e.menuConSalida) return "cerrar_menu";
      /* todo lo demás pausa: en LIBRE al instante, en una jugada que está
         corriendo (o un menú que hay que contestar) apenas vuelve a LIBRE.
         Nunca sale del partido: para eso está VOLVER AL MENÚ en la pausa. */
      return "pausa";
    }
    if (e.escena === "master") {
      if (e.cajaAbierta) return "cerrar_menu";
      return "volver";
    }
    /* editor, intro, o una pantalla que no se presentó: dos atrás seguidos */
    var dentro = typeof ms === "number" && isFinite(ms) && ms >= 0 && ms < ventana;
    return dentro ? "salir" : "confirmar_salida";
  }

  return { VENTANA_MS: VENTANA_MS, DECISIONES: DECISIONES, MENSAJE: MENSAJE, decidir: decidir };
});
