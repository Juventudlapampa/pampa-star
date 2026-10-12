/* ============================================================================
   PAMPA STAR · phaser/scenes/reloj.js — UN SOLO RELOJ (oct 2026)

   ═══ EL BUG ═══

   Rodri: "está desincronizado el tema de tiros, de cuándo festeja goles".

   En Phaser hay DOS relojes y el juego usaba los dos a la vez sin saberlo:

     · this.time (delayedCall, addEvent) avanza con el delta del LOOP del
       juego, que Phaser suaviza: promedia los últimos cuadros y, si un cuadro
       tarda más de 200 ms, lo descarta y usa uno viejo. Después de una traba
       el reloj del juego queda ATRÁS de la hora real, para siempre.
     · this.tweens NO usa ese delta: mide con Date.now(), la hora de la pared,
       y solo recorta saltos de más de medio segundo.

   Todo el teatro del juego está armado con los dos: la pelota VIAJA con un
   tween y el sonido de la red, el temblor y el cartel llegan con un
   delayedCall. Con el juego fluido coinciden. Con una traba —un fondo que se
   pinta, una pose que se viste, un celular lento— el tween ya llegó y el
   delayedCall todavía no: la pelota entra y la red suena después. En la
   escena del remate, la pose termina de entrar y el golpe llega tarde. Por
   eso "a veces" estaba sincronizado y a veces no: dependía de si ese cuadro
   se había trabado.

   ═══ EL ARREGLO ═══

   Los tweens pasan a medir con el MISMO delta que this.time. Si el juego se
   traba, se traban los dos juntos y al volver siguen juntos: lo que se ve y
   lo que suena no se pueden separar.

   Efecto lateral buscado: el congelado del hitstop (feel_ui.js) ya bajaba la
   escala de los dos relojes por separado; ahora además miden igual.

   Se instala una sola vez, sobre el prototipo, desde el postBoot de
   index.html. Para volver atrás: no llamar a PampaUnSoloReloj ahí.
   ========================================================================== */
(function () {
  "use strict";
  window.PampaUnSoloReloj = function () {
    var TM = window.Phaser && window.Phaser.Tweens && window.Phaser.Tweens.TweenManager;
    if (!TM || !TM.prototype || TM.prototype.__unSoloReloj) return false;
    var original = TM.prototype.getDelta;
    TM.prototype.getDelta = function (tick) {
      var sys = this.systems || (this.scene && this.scene.sys);
      var loop = sys && sys.game && sys.game.loop;
      /* sin loop (no debería pasar) se queda con el reloj de Phaser */
      if (!loop || typeof loop.delta !== "number") return original.call(this, tick);
      return loop.delta;
    };
    TM.prototype.__unSoloReloj = true;
    return true;
  };
})();
