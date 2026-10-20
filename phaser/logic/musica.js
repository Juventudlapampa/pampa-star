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
    gol_festejo:   { tema: "gol_festejo",   n: "El cierre del partido: ganaste o empataste" },
    derrota:       { tema: "derrota",       n: "El cierre del partido: perdiste" },

    /* --- los momentos que ANTES caían al sintetizador --- */
    /* LA DEFINICIÓN (el pasillo) y EL JUGADÓN son los dos momentos de urgencia
       pura del juego: mano a mano con el arquero y la corrida con las fichas.
       Los dos usan el tema del tramo final, tenso y en menor a 152 BPM.
       DECISIÓN: comparten tema con el tramo final en vez de quedarse sin
       música. La tanda del 17/oct no trajo un tema propio para la Definición. */
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
     vez. `audio` es data/audio.json; `base` la carpeta de los archivos.
     `estilo` (OPCIONES, 20/oct): con un estilo de audio.estilos el juego
     suena ENTERO en ese estilo. Cada momento busca su tema; si el estilo no
     lo tiene, el tema base del momento (de semana_alt a semana) y después el
     del partido. El FOLKLORE de audio.temas no entra: un tema de otro estilo
     en medio suena a error. */
  function mapaCompleto(audio, fecha, base, estilo) {
    if (!audio || !audio.temas) return null;
    base = base || "../assets/musica/";
    var propios = estilo && audio.estilos && audio.estilos[estilo];
    var out = {};
    lista().forEach(function (momento) {
      var id = temaDe(momento, fecha);
      if (!id) return;
      var clave = !propios ? id : [id, MOMENTOS[momento].tema, "partido"].filter(function (k) { return propios[k]; })[0];
      var t = propios ? propios[clave] : audio.temas[id];
      if (!t || !t.archivo) return;
      out[momento] = { archivo: base + t.archivo, loop: !!t.loop, _tema: clave };
    });
    return out;
  }

  /* ══════════════════════════════════════════════════════════════════════
     EL TEMA QUE VIENE (tanda 1.0, L06 · carga-liviana).

     Lo que estaba mal, medido: el primer pedirMusica registraba el mapa
     entero (10 momentos, 8 archivos: 2,49 MB en las fechas pares y 2,59 en
     las impares, sumado con node sobre assets/musica) en <audio
     preload="auto">, y el navegador los empezaba a bajar TODOS juntos,
     encima de las imágenes que la pantalla estaba esperando. Ahora nacen con
     preload="none" y, cada vez que suena un momento, se precargan solo los
     que pueden venir después (esta tabla, sacada de los pedirMusica del
     código: la intro pide opening; el Master, espera, semana y hype; el
     partido, entrada, partido, partido_final y gol_festejo; la Definición y
     el jugadón usan el tema del tramo final). Así el tema siguiente ya está
     cuando se lo pide, y lo que no se escucha en la sesión no se baja. */
  var SIGUIENTES = {
    opening: ["espera", "entrada"],         // del opening al editor: después, el Master o el amistoso
    espera: ["semana", "entrada"],
    semana: ["entrada"],
    hype: ["espera"],
    entrada: ["partido"],
    partido: ["partido_final", "gol_festejo", "derrota"],
    partido_final: ["gol_festejo", "derrota"],
    gol_festejo: ["partido", "partido_final"],
    definicion: ["partido", "gol_festejo"],
    jugadon: ["partido", "gol_festejo"],
    derrota: ["espera"]                    // perdiste: lo que sigue es la tabla del Master
  };
  /* REVISIÓN DEL LOTE · EL TEMA DEL TÍTULO. Ninguna entrada de la tabla
     llevaba a 'hype' (el ascenso, el título, la gloria): el Master lo pide en
     la tabla del final de la temporada, en la misma pasada que 'espera', y
     el <audio> nace con preload="none". Con el worker en la página, un
     pedido de rango espera a que el worker baje el archivo entero (363 KB):
     el primer ascenso de cada aparato, con poca señal, eran 2-5 s de
     silencio justo en el momento más grande de la carrera. Ahora, en la
     última fecha (ctx.cierre, que el Master saca de
     PampaTemporada.ultimaFecha), la tabla y la semana también precargan
     'hype'. Solo ahí: en las otras 17 fechas no se escucha. */
  var SIGUIENTES_CIERRE = { espera: ["hype"], semana: ["hype"] };
  function siguientes(momento, ctx) {
    var out = (SIGUIENTES[momento] || []).slice();
    if (ctx && ctx.cierre) (SIGUIENTES_CIERRE[momento] || []).forEach(function (m) { if (out.indexOf(m) < 0) out.push(m); });
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
    mapaCompleto: mapaCompleto, sinArchivo: sinArchivo,
    SIGUIENTES: SIGUIENTES, SIGUIENTES_CIERRE: SIGUIENTES_CIERRE, siguientes: siguientes
  };
});
