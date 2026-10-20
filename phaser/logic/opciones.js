/* ============================================================================
   PAMPA STAR · phaser/logic/opciones.js — LAS OPCIONES DEL JUEGO (lógica pura)

   Pedido de Rodri del 20/oct: una pantalla de título con OPCIONES. Lo que se
   elige ahí vive en localStorage bajo pampa_opciones_v1 y se lee SANEADO,
   como el save del Master: un campo roto o de otra versión vuelve a su valor
   de fábrica y el resto se respeta.

     musica, efectos   volumen de 0 a NIVELES (10 = la mezcla medida de
                       audio/sfx.js tal cual; menos, la atenúa)
     estilo            una clave de balance.musica.estilos con tema del partido
     duracion          una clave de balance.tempo.presets (la del partido
                       rápido y la que la carrera nueva trae marcada)

   El sonido sí/no no va acá: ya vivía en pampa_star_audio (audio/sfx.js,
   compartido con el clásico) y la PAUSA lo cambia ahí. Tampoco la velocidad,
   que vive en pampa_velocidad desde TEMPO-1. Un dato, un lugar.

   Sin DOM ni Phaser: lo prueba phaser/test/titulo.test.js en node.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PampaOpciones = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var CLAVE = "pampa_opciones_v1";
  var VERSION = 1;
  var NIVELES = 10;
  var CLAVE_VELOCIDAD = "pampa_velocidad";

  function estiloPorDefecto(bal) {
    return bal.musica.estilo_por_defecto;
  }

  /* los estilos de la perilla, con `disponible`: el de fábrica siempre; los
     demás cuando data/audio.json trae el tema del partido en estilos[k]: es
     el que suena en todo momento que el estilo no tenga (logic/musica.js) */
  function estilos(bal, audio) {
    var def = estiloPorDefecto(bal);
    return bal.musica.estilos.map(function (e) {
      var temas = audio && audio.estilos && audio.estilos[e.k];
      var tiene = !!(temas && temas.partido && temas.partido.archivo);
      return { k: e.k, n: e.n, d: e.d || "", disponible: e.k === def || tiene };
    });
  }

  function duraciones(bal) {
    return bal.tempo.opciones.filter(function (o) { return bal.tempo.presets[o.k] != null; });
  }

  function porDefecto(bal) {
    return { v: VERSION, musica: NIVELES, efectos: NIVELES, estilo: estiloPorDefecto(bal), duracion: "intermedio" };
  }

  function nivelValido(n) { return typeof n === "number" && n === Math.round(n) && n >= 0 && n <= NIVELES; }

  function sanear(crudo, bal, audio) {
    var op = porDefecto(bal);
    if (!crudo || typeof crudo !== "object") return op;
    if (nivelValido(crudo.musica)) op.musica = crudo.musica;
    if (nivelValido(crudo.efectos)) op.efectos = crudo.efectos;
    if (estilos(bal, audio).some(function (e) { return e.k === crudo.estilo && e.disponible; })) op.estilo = crudo.estilo;
    if (duraciones(bal).some(function (o) { return o.k === crudo.duracion; })) op.duracion = crudo.duracion;
    return op;
  }

  function leer(storage, bal, audio) {
    var crudo = null;
    try { crudo = JSON.parse(storage.getItem(CLAVE)); } catch (e) { crudo = null; }
    return sanear(crudo, bal, audio);
  }

  /* devuelve false si el navegador no deja guardar: la opción vale igual
     en esta sesión, porque se aplica antes de guardarla */
  function guardar(storage, op) {
    try { storage.setItem(CLAVE, JSON.stringify(op)); return true; } catch (e) { return false; }
  }

  function velocidadRapida(storage) {
    try { return storage.getItem(CLAVE_VELOCIDAD) === "rapida"; } catch (e) { return false; }
  }
  function ponerVelocidad(storage, rapida) {
    try {
      if (rapida) storage.setItem(CLAVE_VELOCIDAD, "rapida");
      else storage.removeItem(CLAVE_VELOCIDAD);
    } catch (e) { }
  }

  /* los volúmenes, al motor de sonido */
  function aplicar(SFX, op) {
    SFX.setVolumenes(op.musica / NIVELES, op.efectos / NIVELES);
  }

  return {
    CLAVE: CLAVE, VERSION: VERSION, NIVELES: NIVELES, CLAVE_VELOCIDAD: CLAVE_VELOCIDAD,
    estilos: estilos, duraciones: duraciones, porDefecto: porDefecto, sanear: sanear,
    leer: leer, guardar: guardar, velocidadRapida: velocidadRapida, ponerVelocidad: ponerVelocidad,
    aplicar: aplicar
  };
});
