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
  /* v2 (23/oct): llegó MEZCLA. Una opción v1 con FOLKLORE no dice si se
     eligió o si era el de fábrica (se guardaba todo junto al tocar cualquier
     perilla), así que pasa a MEZCLA; desde v2, FOLKLORE elegido queda */
  var VERSION = 2;
  var NIVELES = 10;
  var CLAVE_VELOCIDAD = "pampa_velocidad";
  var CLAVE_MEZCLA = "pampa_mezcla";

  function conMezcla(bal) { return !!(bal.flags && bal.flags.musica_mezcla && bal.musica.mezcla); }

  function estiloPorDefecto(bal) {
    return conMezcla(bal) ? bal.musica.mezcla.k : bal.musica.estilo_por_defecto;
  }

  /* los estilos de la perilla, con `disponible`: el de fábrica siempre; los
     demás cuando data/audio.json trae el tema del partido en estilos[k]: es
     el que suena en todo momento que el estilo no tenga (logic/musica.js).
     MEZCLA va primero y se puede elegir con dos estilos o más para rotar */
  function estilos(bal, audio) {
    var base = bal.musica.estilo_por_defecto;
    var lista = bal.musica.estilos.map(function (e) {
      var temas = audio && audio.estilos && audio.estilos[e.k];
      var tiene = !!(temas && temas.partido && temas.partido.archivo);
      return { k: e.k, n: e.n, d: e.d || "", disponible: e.k === base || tiene };
    });
    if (!conMezcla(bal)) return lista;
    var M = bal.musica.mezcla;
    return [{ k: M.k, n: M.n, d: M.d || "", disponible: lista.filter(function (e) { return e.disponible; }).length >= 2 }].concat(lista);
  }

  /* ══════════════════════════════════════════════════════════════════════
     23/oct · MEZCLA. Rodri: "la música es toda folklore, ya me aburrió".
     Con MEZCLA el juego suena en uno de los cuatro estilos y cambia en cada
     partido y en cada semana, nunca al mismo que venía. Los menús siguen con
     el que está sonando. El que suena se recuerda en pampa_mezcla (un gusto
     de este aparato: sin almacenamiento, vale la copia de la sesión).
     ══════════════════════════════════════════════════════════════════════ */
  var mezclaSesion = { k: null, turno: null };
  function paraRotar(bal, audio) {
    return estilos(bal, audio).filter(function (e) { return e.disponible && e.k !== bal.musica.mezcla.k; }).map(function (e) { return e.k; });
  }
  function leerMezcla(storage) {
    try { var g = JSON.parse(storage.getItem(CLAVE_MEZCLA)); if (g && typeof g === "object") return g; } catch (e) { }
    return mezclaSesion;
  }
  /* el estilo que suena de verdad: el elegido, o el de turno si es MEZCLA */
  function estiloQueSuena(storage, bal, audio) {
    var elegido = leer(storage, bal, audio).estilo;
    if (!conMezcla(bal) || elegido !== bal.musica.mezcla.k) return elegido;
    var lista = paraRotar(bal, audio), g = leerMezcla(storage);
    if (lista.indexOf(g.k) >= 0) return g.k;
    /* la primera vez no arranca en FOLKLORE, que es lo que aburrió */
    var otros = lista.filter(function (k) { return k !== bal.musica.estilo_por_defecto; });
    return guardarMezcla(storage, (otros.length ? otros : lista)[Math.floor(Math.random() * (otros.length || lista.length))], null);
  }
  function guardarMezcla(storage, k, turno) {
    mezclaSesion = { k: k, turno: turno };
    try { storage.setItem(CLAVE_MEZCLA, JSON.stringify(mezclaSesion)); } catch (e) { }
    return k;
  }
  /* cambia de estilo al empezar un partido o una semana. `turno` nombra ese
     partido o esa semana: si es el mismo que la vez anterior (volver atrás
     y entrar de nuevo), no cambia. Devuelve el estilo que queda sonando */
  function rotarMezcla(storage, bal, audio, turno, rng) {
    var antes = estiloQueSuena(storage, bal, audio);
    if (!conMezcla(bal) || leer(storage, bal, audio).estilo !== bal.musica.mezcla.k) return antes;
    var g = leerMezcla(storage);
    if (turno != null && g.turno === turno && g.k === antes) return antes;
    var otros = paraRotar(bal, audio).filter(function (k) { return k !== antes; });
    var nuevo = otros.length ? otros[Math.floor((rng || Math.random)() * otros.length)] : antes;
    return guardarMezcla(storage, nuevo, turno == null ? null : turno);
  }

  /* las duraciones que se ofrecen hoy las decide logic/save_master.js
     (flags.duracion_dos): las mismas en OPCIONES, en la carrera y en el
     partido rápido */
  var _SM = null;
  function saveMaster() {
    if (typeof window !== "undefined" && window.PampaSaveMaster) return window.PampaSaveMaster;
    if (!_SM) _SM = require("./save_master.js");
    return _SM;
  }
  function duraciones(bal) {
    var A = saveMaster().duracionesActivas(bal);
    return A.opciones.filter(function (o) { return A.presets[o.k] != null; });
  }

  function porDefecto(bal) {
    return { v: VERSION, musica: NIVELES, efectos: NIVELES, estilo: estiloPorDefecto(bal), duracion: saveMaster().duracionesActivas(bal).porDefecto };
  }

  function nivelValido(n) { return typeof n === "number" && n === Math.round(n) && n >= 0 && n <= NIVELES; }

  function sanear(crudo, bal, audio) {
    var op = porDefecto(bal);
    if (!crudo || typeof crudo !== "object") return op;
    if (nivelValido(crudo.musica)) op.musica = crudo.musica;
    if (nivelValido(crudo.efectos)) op.efectos = crudo.efectos;
    var estilo = crudo.estilo;
    if (conMezcla(bal) && !(crudo.v >= 2) && estilo === bal.musica.estilo_por_defecto) estilo = bal.musica.mezcla.k;
    if (estilos(bal, audio).some(function (e) { return e.k === estilo && e.disponible; })) op.estilo = estilo;
    /* una duración de antes del 23/oct se traduce (el corto viejo va a
       CORTO; normal y largo, a LARGO) */
    var dur = saveMaster().duracionesActivas(bal).migrar[crudo.duracion] || crudo.duracion;
    if (duraciones(bal).some(function (o) { return o.k === dur; })) op.duracion = dur;
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
    CLAVE: CLAVE, VERSION: VERSION, NIVELES: NIVELES, CLAVE_VELOCIDAD: CLAVE_VELOCIDAD, CLAVE_MEZCLA: CLAVE_MEZCLA,
    estiloQueSuena: estiloQueSuena, rotarMezcla: rotarMezcla,
    estilos: estilos, duraciones: duraciones, porDefecto: porDefecto, sanear: sanear,
    leer: leer, guardar: guardar, velocidadRapida: velocidadRapida, ponerVelocidad: ponerVelocidad,
    aplicar: aplicar
  };
});
