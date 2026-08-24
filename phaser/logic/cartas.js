/* ============================================================================
   PAMPA STAR · phaser/logic/cartas.js — LAS CARTAS POR PUESTO

   ═══ QUÉ CAMBIA ═══

   Antes las megacosas eran del EQUIPO: si tenías aguante y nivel, el que
   estuvieras controlando podía tirar el Caldén o el superbloqueo. El puesto no
   decía nada, y por eso elegir a quién le pasabas era una decisión de posición
   y nada más.

   Ahora cada jugador tiene DOS CARTAS según dónde juega:

     ATA   dos de ataque         un remate especial y una definición
     VOL   una y una             una de ataque y una de recuperación
     DEF   un megapase y una supersacada
     ARQ   una atajada especial y un saque largo

   Lo que cambia NO es la economía —se gastan y vuelven con el tiempo, igual
   que las fichas del jugadón—: es que EL JUGADOR QUE CONTROLÁS DECIDE QUÉ
   PODÉS HACER. Pasarle al 5 y pasarle al 9 dejan de ser lo mismo.

   ═══ LA RECARGA ═══

   La carta vuelve sola después de `recarga_min` MINUTOS DE PARTIDO (no reales:
   el reloj del juego va a saltos, así que se cuenta con el minuto). Eso hace
   que la pregunta no sea "¿me alcanza el aguante?" sino "¿la quemo ahora o me
   la guardo?", que es una decisión y no una cuenta.

   Cada carta cuesta aguante además de la recarga: las dos cosas, porque con
   solo recarga se usarían siempre al toque de estar listas, y con solo aguante
   volveríamos a la economía de equipo que esto reemplaza.

   Es lógica pura: se puede correr en node y por eso se puede simular.
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaCartas = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* las cartas de un puesto, tal como vienen del dato */
  function cartasDe(data, puesto) {
    var lista = (data && data.cartas) || [];
    return lista.filter(function (c) { return c.puesto === puesto; });
  }

  /* el estado arranca con TODAS listas: el partido empieza con todo cargado,
     que es lo que hace que el primer momento importante pueda ser grande. */
  function estadoNuevo() { return { usadas: {}, gastadas: 0 }; }

  /* clave por JUGADOR y carta: dos delanteros distintos tienen su propio
     fogonazo. Si fuera por carta nomás, gastarla con uno se la sacaría al otro
     y volveríamos a que el puesto no importe. */
  function clave(idxJugador, cartaId) { return idxJugador + ":" + cartaId; }

  /* ¿cuánto falta para que vuelva? En minutos de partido. 0 = está lista. */
  function faltaPara(estado, idxJugador, carta, minutoAhora) {
    var t = estado && estado.usadas ? estado.usadas[clave(idxJugador, carta.id)] : null;
    if (t == null) return 0;
    /* en MINUTOS DE PARTIDO. La primera vuelta lo puso en segundos y la
       simulación lo delató: 150 s son dos momentos y medio, así que la carta
       volvía antes de que la extrañaras y la recarga no decidía nada (0% de
       los intentos caía en recarga). Con minutos, "¿la quemo ahora?" es una
       pregunta de verdad. */
    var recargaMin = carta.recarga_min != null ? carta.recarga_min : 20;
    var falta = (t + recargaMin) - minutoAhora;
    return falta > 0 ? falta : 0;
  }

  /* ¿se puede usar? Devuelve {puede, motivo} — el motivo se muestra, nunca se
     desactiva un botón en silencio (eso es lo que hace que el jugador crea que
     está roto). */
  function puedeUsar(estado, idxJugador, carta, jugador, minutoAhora) {
    if (!carta) return { puede: false, motivo: "no hay carta" };
    if (!jugador) return { puede: false, motivo: "no hay jugador" };
    if (jugador.pos !== carta.puesto) return { puede: false, motivo: "no es de este puesto" };
    var falta = faltaPara(estado, idxJugador, carta, minutoAhora);
    if (falta > 0) return { puede: false, motivo: "vuelve en " + Math.ceil(falta) + "'", falta: falta };
    var ag = jugador.aguante != null ? jugador.aguante : 0;
    if (ag < (carta.aguante || 0)) return { puede: false, motivo: "te faltan " + Math.ceil((carta.aguante || 0) - ag) + " de aguante" };
    return { puede: true, motivo: null };
  }

  function usar(estado, idxJugador, carta, jugador, minutoAhora) {
    var v = puedeUsar(estado, idxJugador, carta, jugador, minutoAhora);
    if (!v.puede) return false;
    estado.usadas[clave(idxJugador, carta.id)] = minutoAhora;
    estado.gastadas = (estado.gastadas || 0) + 1;
    if (jugador.aguante != null) jugador.aguante = clamp(jugador.aguante - (carta.aguante || 0), 0, 1e9);
    return true;
  }

  /* las dos cartas del que estás controlando, con su estado. Esto es lo que
     mira el HUD: no "qué megacosas hay" sino "qué puede hacer ÉSTE". */
  function manoDe(data, estado, idxJugador, jugador, minutoAhora) {
    if (!jugador) return [];
    return cartasDe(data, jugador.pos).map(function (c) {
      var v = puedeUsar(estado, idxJugador, c, jugador, minutoAhora);
      return {
        carta: c, puede: v.puede, motivo: v.motivo,
        falta: faltaPara(estado, idxJugador, c, minutoAhora)
      };
    });
  }

  /* ¿el equipo tiene ALGUNA carta de ataque disponible? Sirve para el caso que
     pidió la simulación: quedarte solo con defensores. */
  function hayDeClase(data, estado, jugadores, clase, minutoAhora) {
    for (var i = 0; i < jugadores.length; i++) {
      var j = jugadores[i];
      var cs = cartasDe(data, j.pos);
      for (var k = 0; k < cs.length; k++) {
        if (cs[k].clase !== clase) continue;
        if (puedeUsar(estado, i, cs[k], j, minutoAhora).puede) return true;
      }
    }
    return false;
  }

  return {
    cartasDe: cartasDe, estadoNuevo: estadoNuevo, clave: clave,
    faltaPara: faltaPara, puedeUsar: puedeUsar, usar: usar,
    manoDe: manoDe, hayDeClase: hayDeClase, clamp: clamp
  };
});
