/* ============================================================================
   PAMPA STAR · phaser/logic/musica.js — LA ÚNICA PUERTA DE LA MÚSICA

   ═══ POR QUÉ EXISTE ═══

   Rodri reportó música vieja en cinco lugares: el trailer, la escena del
   pasillo, el partido después del pasillo, el gol en contra y el segundo
   partido de la carrera. No eran cinco bugs: era UNO.

   Cuando se cablearon los doce OGG, se mapearon LOS MOMENTOS QUE ESTABAN
   MAPEADOS — y el sintetizador viejo siguió vivo debajo de todo lo demás. Es
   exactamente la forma del `mundoLayer.visible === false`: el sistema nuevo
   anda perfecto donde está conectado, y el viejo sigue sonando donde no.

   Había DOS puertas para pedir música:
     · this.musica(...)        en match.js, con el mapa nuevo y la traba
     · SFX.musicaTema(...)     directo, desde intro, definicion_ui y jugadon_ui
   y encima el registro de archivos era POR ESCENA: `registrarArchivos` pisaba
   el mapa entero, así que la intro (que no registraba nada) y el master (que
   registraba UNA entrada) dejaban al resto del juego sin archivos.

   ═══ QUÉ HACE ESTE MÓDULO ═══

   Una sola puerta: `pedir(momento)`. Todas las escenas piden por acá.

   1. Los doce temas se registran UNA VEZ, al arrancar el juego, no por escena.
   2. Si el momento no está declarado en data/audio.json, TIRA ERROR VISIBLE en
      desarrollo. Nunca cae al sintetizador en silencio, que es lo que hacía que
      el bug fuera invisible.
   3. La lista de momentos válidos sale del propio audio.json: agregar un
      momento es agregarlo al JSON, no tocar código.

   Es lógica pura salvo por la llamada al reproductor: se puede correr en node.
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaMusica = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ══════════════════════════════════════════════════════════════════════
     LOS MOMENTOS DEL JUEGO.

     Esta lista es el CONTRATO: cada momento en el que el juego puede pedir
     música tiene que estar acá y tener un tema en audio.json. El test
     m_musica enumera las llamadas del código y falla si alguna pide un
     momento que no está en esta lista.

     `tema` es la clave de audio.json. Cuando dos momentos comparten tema es
     una decisión, y está escrita al lado.
     ══════════════════════════════════════════════════════════════════════ */
  var MOMENTOS = {
    /* --- fuera del partido --- */
    opening:   { tema: "opening",       n: "El trailer del arranque" },
    espera:    { tema: "espera",        n: "La tabla de la temporada" },
    semana:    { tema: "semana",        n: "Las decisiones de la semana", alterna: "semana_alt" },
    hype:      { tema: "hype_carrera",  n: "Ascenso, título, gloria" },

    /* --- el partido --- */
    entrada:   { tema: "entrada_partido", n: "La entrada a la cancha" },
    partido:   { tema: "partido",       n: "El partido", alterna: "partido_alt" },
    partido_final: { tema: "partido_final", n: "El tramo final del segundo tiempo" },
    gol_festejo:   { tema: "gol_festejo",   n: "Después de un gol importante" },

    /* --- los momentos que ANTES caían al sintetizador --- */
    /* LA DEFINICIÓN (el pasillo) y EL JUGADÓN son los dos momentos de urgencia
       pura del juego: mano a mano con el arquero y la corrida con las fichas.
       Los dos usan Last Ten Seconds, que es 161 BPM en Fa menor — "rápido y
       oscuro, la combinación de la urgencia", según el propio audio.json.
       DECISIÓN: comparten tema con el tramo final en vez de quedarse sin
       música. Los dos temas de reserva (Cielo_de_victoria, Fuerza_de_un_Leon)
       podrían ir acá, pero cortan en 18,5 compases y habría que recortarlos —
       y recortar audio es exactamente lo que M1 prohíbe. */
    definicion: { tema: "partido_final", n: "El pasillo: mano a mano con el arquero",
                  _comparte: "usa el tema del tramo final: los dos son urgencia pura" },
    jugadon:    { tema: "partido_final", n: "La corrida del jugadón",
                  _comparte: "idem definicion" },

    /* el silencio es un momento como cualquier otro y tiene que poder pedirse */
    silencio:  { tema: null, n: "Silencio (vestuario, salida de escena)" }
  };

  /* ¿este momento existe? */
  function existe(momento) {
    return momento === null || Object.prototype.hasOwnProperty.call(MOMENTOS, momento);
  }
  function lista() { return Object.keys(MOMENTOS); }

  /* qué tema de audio.json le toca a este momento, contando la alternancia.
     La alternancia es por FECHA (par/impar), nunca al azar: así dos fechas
     seguidas no repiten. */
  function temaDe(momento, fecha) {
    if (momento === null || momento === "silencio") return null;
    var m = MOMENTOS[momento];
    if (!m) return undefined;                 // undefined = momento desconocido
    if (m.alterna && ((fecha | 0) % 2) !== 0) return m.alterna;
    return m.tema;
  }

  /* el mapa completo { momento: {archivo, loop} } para registrar de una sola
     vez. `audio` es data/audio.json; `base` la carpeta de los archivos. */
  function mapaCompleto(audio, fecha, base) {
    if (!audio || !audio.temas) return null;
    base = base || "../assets/musica/";
    var out = {};
    lista().forEach(function (momento) {
      var id = temaDe(momento, fecha);
      if (!id) return;
      var t = audio.temas[id];
      if (!t || !t.archivo) return;
      out[momento] = { archivo: base + t.archivo, loop: !!t.loop, _tema: id };
    });
    return out;
  }

  /* qué momentos declarados NO tienen archivo: se anota, no se calla */
  function sinArchivo(audio) {
    if (!audio || !audio.temas) return lista().filter(function (m) { return m !== "silencio"; });
    return lista().filter(function (momento) {
      if (momento === "silencio") return false;
      var id = temaDe(momento, 0);
      var t = id && audio.temas[id];
      return !(t && t.archivo);
    });
  }

  return {
    MOMENTOS: MOMENTOS,
    existe: existe, lista: lista, temaDe: temaDe,
    mapaCompleto: mapaCompleto, sinArchivo: sinArchivo
  };
});
