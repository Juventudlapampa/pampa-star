/* ============================================================================
   PAMPA STAR · phaser/audio/sfx.js — los efectos por WebAudio
   Los golpes, el silbato, la hinchada y la interfaz son muestras grabadas
   (assets/sonidos/, ver LAS MUESTRAS); los motivos musicales cortos (el gol,
   el cambio de posesión, el cruce de campo, el tictac, el lamento y los
   risers) se sintetizan en vivo. Se desbloquea con el primer toque (política
   de audio móvil).
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PampaSFX = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var ctx = null, master = null, muted = false;
  /* ANIME v4 Bloque D: el mute se COMPARTE con el botón SONIDO del juego clásico
     (misma clave pampa_star_audio) — un solo interruptor para todo PAMPA STAR */
  var PREF_KEY = "pampa_star_audio";
  try { var _p = JSON.parse(localStorage.getItem(PREF_KEY) || "null"); if (_p && typeof _p === "object") muted = !!_p.muted; } catch (e) { }
  function persistirMute() {
    try {
      var p = JSON.parse(localStorage.getItem(PREF_KEY) || "null") || { vol: 0.6 };
      p.muted = muted;
      localStorage.setItem(PREF_KEY, JSON.stringify(p));
    } catch (e) { }
  }

  /* ══════════════════════════════════════════════════════════════════════
     LA MEZCLA (oct 2026, "me descajetaste los audios").

     Medido renderizando cada efecto en un OfflineAudioContext y cada OGG
     decodificado, en dBFS (RMS de la ventana más fuerte de 50 ms en los
     efectos, mediana de ventanas de 400 ms en la música, ya multiplicada por
     su volumen 0,42):

       música del partido   -22      la red        -24      el gol      -23
       la patada            -25      los guantes   -26      el silbato  -29
       el afuera            -32      el whoosh     -35/-37  la hinchada -44

     La música tapaba casi todo: la patada sonaba por DEBAJO del tema y la
     "explosión de la hinchada" del gol, a -44, no se escuchaba nunca. Un
     golpe que el oído no separa de la música no está sincronizado con nada,
     porque no está.

     Por eso cada efecto tiene su ganancia acá (perillas en
     balance.json → audio_mezcla, que pisa estos números) y el bus de efectos
     termina en un LIMITADOR: con los golpes más arriba, dos que coinciden
     (la red y la fanfarria) pasarían de 0 dBFS y el navegador los recortaría
     con distorsión. El limitador los aplana sin que se note.

     17/OCT, RODRI: "EL SONIDO ES CHILLÓN EN GENERAL". Se pasó para el otro
     lado. Medido igual que arriba (y además el brillo: centroide del
     espectro y cuánta energía cae arriba de 2 kHz): la red tenía 87% de su
     energía arriba de 2 kHz, el tic del menú 47%, la hinchada 32%, y casi
     todo era onda cuadrada o diente de sierra, el timbre de las consolas de
     8 bits, sonando ENCIMA de una música que no es de 8 bits. Ahora: ondas
     triangulares y senoidales, un pasabajos de 4 kHz en el bus antes del
     limitador, y de nuevo por debajo de la música todo lo que no es un golpe
     (patada, red, guantes). Los números de antes y después están en
     docs/TANDA_1_0.md, "Pedido de Rodri del 17/oct".

     17/OCT, MÁS TARDE: LAS MUESTRAS. Los golpes, el silbato, la hinchada,
     el whoosh y la interfaz dejaron de sintetizarse: son grabaciones (LAS
     MUESTRAS, más abajo), todas con el pico en -3 dBFS. Con el mismo pico no
     suenan igual: un silbato sostenido mide 14 dB más que la patada y el
     grito de gol 7 dB más. Estos números los nivelan, medidos igual que
     arriba contra la música del partido (-21,7):

       patada        -19,2    red      -18,9    festejo       -24,1
       súper tiro    -18,9    palo     -19,5    silbato       -25,1
       guantes       -19,5    rumor    -27/-30  afuera (uhhh) -26,5
       whoosh        -29,0    cama de hinchada (mediana)      -34,3
       interfaz      -33,4 a -38,5

     Los cinco golpes quedan apenas arriba de la música; todo lo demás, por
     debajo, y la cama es eso: una cama.
     ══════════════════════════════════════════════════════════════════════ */
  var MEZCLA = {
    bus: 0.8,
    kick: 0.46, kickFuerte: 0.46, net: 0.59, gloves: 0.83, palo: 0.46, choque: 0.23,
    whistle: 0.16, afuera: 0.15, festejo: 0.21, crowd: 0.4, cama: 0.24, whoosh: 0.15, ui: 0.11,
    golEnContra: 0.15, riserRemate: 0.6
  };
  var PASABAJOS_HZ = 4000;
  var ganancia = 1;          // la del efecto que está sonando ahora (ver con())
  var atenua = 1;            // el factor de debajo(): la intro pone sus golpes bajo el tema
  /* 20/oct · OPCIONES: los volúmenes de quien juega (0 a 1, logic/opciones.js).
     En 1 suena la mezcla medida tal cual; los efectos escalan el bus entero
     y la música, el volumen de crucero de los archivos (setVolumenes) */
  var volEfectos = 1, volMusica = 1;
  function configurarMezcla(cfg) {
    if (!cfg || typeof cfg !== "object") return;
    Object.keys(cfg).forEach(function (k) { if (k.charAt(0) !== "_" && typeof cfg[k] === "number") MEZCLA[k] = cfg[k]; });
    if (master) master.gain.value = MEZCLA.bus * volEfectos;
  }
  /* corre fn con la ganancia del efecto `nombre`: muestra() la lee */
  function con(nombre, fn) {
    var antes = ganancia;
    ganancia = (MEZCLA[nombre] != null ? MEZCLA[nombre] : 1) * atenua;
    try { return fn(); } finally { ganancia = antes; }
  }

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = MEZCLA.bus * volEfectos;
    var pb = ctx.createBiquadFilter();
    pb.type = "lowpass"; pb.frequency.value = PASABAJOS_HZ; pb.Q.value = 0.6;
    master.connect(pb);
    /* el limitador: umbral -6 dBFS, relación 20:1, ataque de 3 ms */
    var lim = ctx.createDynamicsCompressor ? ctx.createDynamicsCompressor() : null;
    if (lim) {
      lim.threshold.value = -6; lim.knee.value = 3; lim.ratio.value = 20;
      lim.attack.value = 0.003; lim.release.value = 0.12;
      pb.connect(lim); lim.connect(ctx.destination);
    } else pb.connect(ctx.destination);
    Object.keys(bytes).forEach(decodificar);
    return ctx;
  }

  /* ══════════════════════════════════════════════════════════════════════
     LAS MUESTRAS (17/oct, Rodri: el sonido seguía siendo de sintetizador).

     Catorce grabaciones en assets/sonidos/, OGG Vorbis mono a 44,1 kHz
     (288 KB las catorce), todas con el pico en -3 dBFS. Qué reemplaza cada
     una y cuánto mide en el juego, en docs/TANDA_1_0.md (Pedido de Rodri
     del 17/oct).

     Se bajan una vez, con la compuerta de la intro ya a la vista
     (intro.js, create), y se decodifican en ESTE contexto apenas existe: el
     contexto nace con el primer toque, como siempre, así que la
     decodificación arranca ahí y termina mucho antes del primer partido.
     Una muestra que todavía no llegó no suena: no hay síntesis de reserva.
     Suenan por el mismo bus que todo lo demás (la mezcla, el pasabajos y el
     limitador).
     ══════════════════════════════════════════════════════════════════════ */
  var MUESTRAS = {
    patada: "patada.ogg", patada_fuerte: "patada_fuerte.ogg", red: "red.ogg",
    guantes: "guantes.ogg", palo: "palo.ogg", silbato: "silbato.ogg",
    silbato_final: "silbato_final.ogg", viento_remate: "viento_remate.ogg",
    hinchada_loop: "hinchada_loop.ogg", hinchada_uh: "hinchada_uh.ogg",
    hinchada_gol: "hinchada_gol.ogg",
    ui_mover: "ui_mover.ogg", ui_confirmar: "ui_confirmar.ogg", ui_volver: "ui_volver.ogg"
  };
  var bytes = {}, buffers = {}, muestrasPedidas = false;
  function cargarMuestras(base) {
    if (muestrasPedidas) return false;
    muestrasPedidas = true;
    Object.keys(MUESTRAS).forEach(function (k) {
      var ruta = base + MUESTRAS[k];
      fetch(ruta).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.arrayBuffer();
      }).then(function (ab) {
        bytes[k] = ab;
        if (ctx) decodificar(k);
      }).catch(function (e) { console.error("[SFX] no bajó " + ruta + ": " + e.message); });
    });
    return true;
  }
  function decodificar(k) {
    var ab = bytes[k];
    delete bytes[k];
    var p = ctx.decodeAudioData(ab, function (b) { buffers[k] = b; },
      function (e) { console.error("[SFX] no se pudo leer " + MUESTRAS[k] + ": " + (e && e.message)); });
    if (p && p.catch) p.catch(function () { });   // el error ya lo dijo el callback
  }
  /* la muestra k por el bus, con la ganancia del efecto que suena (con()).
     o: { gain, rate (playbackRate), desde (s), loop } */
  function muestra(k, o) {
    var b = buffers[k];
    if (!ctx || muted || !b) return null;
    o = o || {};
    var s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = b;
    s.loop = !!o.loop;
    if (o.rate) s.playbackRate.value = o.rate;
    g.gain.value = (o.gain != null ? o.gain : 1) * ganancia;
    s.connect(g); g.connect(master);
    s.start(now(), o.desde || 0);
    return { src: s, g: g };
  }

  /* LA CAMA: la hinchada de fondo del partido, en loop (hinchada_loop, 12 s
     que empalman sin clic). Va por debajo de la música y la sigue: baja con
     musicaDuck, se calla con la pausa de la música y con el mute. */
  var camaEstado = { quiere: false, nodo: null };
  function ponerCama() {
    var b = buffers.hinchada_loop, n = camaEstado.nodo, t = now();
    if (!camaEstado.quiere || muted || musicaEnPausa() || !ctx || !b) {
      if (n) {
        camaEstado.nodo = null;
        n.g.gain.cancelScheduledValues(t); n.g.gain.setValueAtTime(n.g.gain.value, t);
        n.g.gain.linearRampToValueAtTime(0.0001, t + 0.3);
        n.src.stop(t + 0.35);
      }
      return;
    }
    var nivel = MEZCLA.cama * (duck.el ? DUCK : 1);
    if (!n) {
      n = camaEstado.nodo = muestra("hinchada_loop", { gain: 0.0001, loop: true, desde: Math.random() * b.duration });
      n.g.gain.setValueAtTime(0.0001, t);
      n.g.gain.linearRampToValueAtTime(nivel, t + 1.2);
      return;
    }
    n.g.gain.cancelScheduledValues(t); n.g.gain.setValueAtTime(n.g.gain.value, t);
    n.g.gain.linearRampToValueAtTime(nivel, t + 0.2);
  }
  /* 23/oct, Rodri escuchó los menús sin música: con la intro ya vista, el
     título pide su tema antes de cualquier gesto y el navegador frena el
     play() (autoplay). Nadie lo volvía a intentar. Ahora el primer toque o
     tecla arranca el tema que quedó pedido (no uno que ya terminó) */
  function unlock() {
    var c = ensure(); if (c && c.state === "suspended") c.resume();
    var el = archivoSonando;
    if (!el || !el.paused || el.ended || el.__saliendo || musicaEnPausa()) return;
    tocar(el);
  }
  function now() { return ctx ? ctx.currentTime : 0; }

  /* M3 · lo que queda de 'mus': banderas, no un bus de audio. gain/paso/prox
     eran del secuenciador borrado; timer y viento se conservan porque
     musicaTema() los apaga por las dudas, y urgente porque la escena la
     consulta. Sin generador, gain nunca se crea y las ramas que lo miran
     salen por el guard. */
  /* ══════════════════════════════════════════════════════════════════════
     M3 · ACTA DE LO QUE SE FUE Y LO QUE SE QUEDÓ.

     SE FUE (era música y ya no la hace nadie): el secuenciador programar(),
     la capa de viento vientoOn(), el bus musEnsure() con notaMus()/golpeMus(),
     los helpers semi()/temaActivo(), musicaZona(), y en match.js el segundo
     mapa (mapaDeAudio + registrarMusicaDeArchivo). Todo eso generaba el
     chiptune que Rodri escuchaba en cinco lugares distintos.

     SE QUEDA Y NO ES MÚSICA: los GOLPES CORTOS. Duran menos de medio segundo,
     acentúan un momento y suenan ENCIMA del tema que esté puesto, igual que
     un silbato o una patada. Ninguno hace loop y ninguno pasa por el bus que
     se borró. Hasta el 17/oct eran notas en onda triangular (sonaban a
     consola vieja, pedido de Rodri) y desde entonces son la hinchada grabada:

       temaPosesion(quien)  el rumor que crece cuando la recuperás (la de ellos, nada)
       temaCampo(zona)      el rumor que crece al cruzar a campo rival
       temaUrgente()        el rumor largo de los últimos 5 minutos
       golEnContra()        el "uhhh" de la hinchada, más grave

     El grito de gol (goal()) se fue: el festejo grabado ya explota en el gol.

     Se quedan porque hacen falta: los doce OGG son loops de ambiente y no
     pueden reaccionar a un cambio de posesión sin cortar la pista. La regla
     que los separa de la música es simple — un golpe corto NO se registra en
     audio.json y NO se pide por pedirMusica().
     ══════════════════════════════════════════════════════════════════════ */
  var mus = { gain: null, timer: null, base: null, urgente: false, viento: null };

  /* M3 · se fue vientoOn(): la capa de viento pampeano del sintetizador. Era
     ruido filtrado por debajo del loop generado; sin loop generado no tiene
     nada debajo de qué ir. vientoOff() se conserva porque musicaTema la llama
     para asegurarse de que no quede nada sonando. */
  function vientoOff() { if (mus.viento) { try { mus.viento.src.stop(); } catch (e) { } mus.viento = null; } }

  /* ══════════════════════════════════════════════════════════════════════
     M3 · SE FUE EL GENERADOR DE MÚSICA DEL SINTETIZADOR (42 líneas).

     Era el que programaba el chiptune compás a compás: la progresión, el
     motivo de cuatro notas, la percusión y el bajo. Funcionó como música del
     juego hasta que llegaron los doce OGG, y desde entonces sonaba SOLO donde
     el mapa nuevo no llegaba — que es exactamente el bug de los cinco lugares.

     Con la puerta única de M2, ningún momento cae acá. Se borra, que es lo que
     lo hace irreversible: si quedara, la próxima vez que alguien pida un
     momento sin mapear volvería a sonar.

     LO QUE NO SE BORRÓ Y NO ES MÚSICA: los golpes cortos siguen vivos porque
     son EFECTOS, no loops — temaPosesion (3 notas al cambiar de mano),
     temaCampo (3 notas al cruzar de campo), temaUrgente (el tictac de los
     últimos 5') y golEnContra (el lamento de 4 notas). Duran menos de medio
     segundo y acentúan un momento; no compiten con el tema que está sonando.
     ══════════════════════════════════════════════════════════════════════ */
  /* API: acepta los nombres nuevos y los viejos ("propia"→propia_propio) */
  /* ══════════════════════════════════════════════════════════════════════
     M2 · LOS ARCHIVOS MANDAN SOBRE EL SINTETIZADOR.

     La música era chiptune generado por código. Ahora, si el tema tiene un
     archivo declarado en data/audio.json, suena ESE y el sintetizador ni
     arranca. El que no tenga archivo sigue sintetizado — así el cambio es
     tema por tema y nada queda mudo.

     M1 · LOS ARCHIVOS NO SE TOCAN. Los _loop vienen cortados a compás exacto
     con crossfade de 40 ms: se reproducen con loop nativo del elemento Audio y
     NO se les cambia currentTime ni se los recorta. Cualquier cosa que se les
     haga rompe el empalme.

     M3 · LAS TRES REGLAS DEL JSON, todas acá:
       · corte al terminar el partido → musicaTema(null) para de verdad
       · fundido de 300 ms entre momentos, salvo cuando se pide seco (el gol,
         donde el silencio previo ES el efecto y ya estaba implementado)
       · la música baja 40% con hitstop o cartel de gol → musicaDuck
     ══════════════════════════════════════════════════════════════════════ */
  /* ══════════════════════════════════════════════════════════════════════
     EL REPRODUCTOR (oct 2026): UN TEMA A LA VEZ, SIEMPRE.

     EL BUG ("me descajetaste los audios"): había DOS y hasta TRES temas
     sonando juntos. Medido en vivo con un oído de prueba que muestrea los
     <audio> cuadro a cuadro:
       · volvés del partido al master → "Under the Floodlights" seguía debajo
         de "The Longest Minute" y después debajo de la semana
       · vas de la semana al partido → "Low Light Protocol" seguía en loop,
         a volumen pleno, durante TODO el partido

     La causa era un solo renglón: matarFundidos(). El tema que sale no se
     pausa de golpe: baja de volumen en 300 ms y RECIÉN AL FINAL se pausa. Y
     cualquier otro pedido —el tema de la escena que entra, el bajón de
     música de una jugada— mataba TODOS los fundidos en curso, incluido el de
     salida. El que salía quedaba congelado a mitad de camino, sin pausa,
     dando vueltas para siempre. Al cambiar de escena pasaba siempre: el
     shutdown pide silencio y el create() de la escena nueva pide su tema en
     el mismo cuadro. (Y además el shutdown se enganchaba de nuevo en cada
     reinicio de escena: con la segunda vuelta ya había dos ganchos, y el
     segundo mataba el fundido del primero sin que entrara nadie.)

     LAS TRES REGLAS NUEVAS:
       1. cada elemento tiene SU rampa. Una rampa nueva pisa solo la de ese
          mismo elemento, nunca la de otro: el que sale termina de salir.
       2. cada vez que entra un tema, todo lo demás que esté sonando se va.
          No hace falta acordarse de quién sonaba: se recorren los elementos.
       3. los bajones de música (duck) no se pisan entre sí: hay UNA ventana,
          que se estira hasta el final del último pedido, y UN solo reloj que
          la suelta.
     ══════════════════════════════════════════════════════════════════════ */
  var archivos = {};        // id -> { audio, loop }
  var elementos = [];       // todos los <audio> creados (uno por archivo)
  var archivoSonando = null;
  var volBase = 0.5;        // el de la mezcla (balance.musica.vol_archivo)
  var volArchivo = 0.5;     // el volumen "de crucero" de los archivos: volBase * volMusica
  var FUNDIDO_MS = 300;
  var DUCK = 0.6;           // "la música baja 40%" (audio.json _reglas)

  function detenerRampa(el) { if (el && el.__rampa) { clearInterval(el.__rampa); el.__rampa = null; } }

  /* sube o baja el volumen de UN elemento en ms, sin tocar el archivo.
     La rampa vive en el elemento: otra rampa del mismo elemento la reemplaza,
     la de otro elemento no la toca. */
  function rampa(el, desde, hasta, ms, alFinal) {
    if (!el) { if (alFinal) alFinal(); return; }
    detenerRampa(el);
    var pasos = Math.max(1, Math.round(ms / 25)), i = 0;
    try { el.volume = Math.max(0, Math.min(1, desde)); } catch (e) {}
    el.__rampa = setInterval(function () {
      i++;
      var v = desde + (hasta - desde) * (i / pasos);
      try { el.volume = Math.max(0, Math.min(1, v)); } catch (e) {}
      if (i >= pasos) { detenerRampa(el); if (alFinal) alFinal(); }
    }, 25);
  }

  /* el que sale: baja y SE PAUSA. Marcado como saliendo para que nadie lo
     cuente como "sonando" ni lo vuelva a agarrar a mitad de camino. */
  function despedir(el, seco) {
    if (!el) return;
    if (seco) { detenerRampa(el); el.__saliendo = false; try { el.pause(); el.currentTime = 0; } catch (e) {} return; }
    if (el.__saliendo) return;           // ya se está yendo: no se reinicia la bajada
    el.__saliendo = true;
    rampa(el, el.volume, 0, FUNDIDO_MS, function () {
      el.__saliendo = false;
      try { el.pause(); el.currentTime = 0; } catch (e) {}
    });
  }
  /* regla 2: todo lo que suena y no es `menos`, afuera */
  function despedirLosDemas(menos, seco) {
    elementos.forEach(function (el) {
      if (el === menos) return;
      var suena = false;
      try { suena = !el.paused; } catch (e) { }
      if (suena) despedir(el, seco);
      else detenerRampa(el);
    });
  }

  function pararArchivo(seco) {
    archivoSonando = null;
    pendiente = null;          // L04: lo que se calló a propósito no vuelve al reanudar
    soltarDuckYa();
    despedirLosDemas(null, seco);
  }

  /* ══════════════════════════════════════════════════════════════════════
     TANDA 1.0 (L04) · LA MÚSICA SE CALLA CUANDO NO SE VE EL JUEGO.

     Medido: la música es un new Audio (registrarArchivos) y con la pestaña
     oculta seguía con paused=false. Phaser frena su loop al ocultarse, pero
     estos <audio> no son de Phaser: pasabas a otra app y el tema seguía
     sonando arriba de tu chat. Lo mismo al girar el teléfono a vertical,
     donde el lienzo se esconde por CSS y la página sigue "visible".

     pausarMusica(motivo) / reanudarMusica(motivo). Los motivos se suman
     ("oculto", "vertical"): la música vuelve recién cuando no queda ninguno.
     Al pausar se recuerda el tema que SONABA (no el último pedido: un tema
     de una pasada que ya terminó no tiene que volver a empezar) y se pausa
     en el lugar, sin tocar currentTime: al volver sigue el mismo tema desde
     donde estaba, con un fundido de entrada. Un tema que se estaba yendo
     termina de irse. Un pedido que llega con la música en pausa (el tope de
     alTerminarMusica, que es un setTimeout y corre igual) cambia el tema
     pendiente pero no suena hasta volver. El mute no se toca: es otra cosa,
     y lo que estaba muteado vuelve muteado.

     REVISIÓN L04 · EL QUE SE PAUSÓ EN EL LUGAR Y NO VUELVE, A 0. Si en la
     pausa cambia el tema (el tope de alTerminarMusica pide el del partido
     con la pestaña oculta) o se pide silencio, el que se pausó a mitad de
     camino ya no vuelve, y despedirLosDemas solo rebobina lo que suena:
     quedaba donde se cortó. Medido con el reproductor de verdad en node:
     la entrada pausada a los 5 s quedaba con el cabezal en 5 y el partido
     siguiente la arrancaba desde el medio (antes de L04, despedir() siempre
     la dejaba en 0). Se rebobina AL VOLVER, no al cambiar: si en la misma
     pausa se vuelve a pedir el de antes, sigue desde donde estaba.
     ══════════════════════════════════════════════════════════════════════ */
  var motivosPausa = {};
  var pendiente = null;      // el elemento que vuelve a sonar al reanudar
  var enElLugar = null;      // el que se pausó a mitad de camino (revisión L04)
  function rebobinar(el) { try { el.pause(); el.currentTime = 0; } catch (e) { } }
  function musicaEnPausa() {
    for (var k in motivosPausa) if (motivosPausa[k]) return true;
    return false;
  }
  function pausarMusica(motivo) {
    var ya = musicaEnPausa();
    motivosPausa[motivo || "pausa"] = true;
    if (ya) return false;
    soltarDuckYa();
    pendiente = (archivoSonando && !archivoSonando.__saliendo && !archivoSonando.paused) ? archivoSonando : null;
    elementos.forEach(function (el) {
      detenerRampa(el);
      if (el.__saliendo) { el.__saliendo = false; try { el.pause(); el.currentTime = 0; } catch (e) { } return; }
      /* en el lugar, solo el que vuelve; otro que sonara (colgado) no vuelve: a 0 */
      try { if (!el.paused) { el.pause(); if (el !== pendiente) el.currentTime = 0; } } catch (e) { }
    });
    if (pendiente) { try { pendiente.volume = volArchivo; } catch (e) { } }
    enElLugar = pendiente;
    return true;
  }
  function reanudarMusica(motivo) {
    if (!motivosPausa[motivo || "pausa"]) return false;
    delete motivosPausa[motivo || "pausa"];
    if (musicaEnPausa()) return false;
    var el = pendiente, quieto = enElLugar;
    pendiente = null; enElLugar = null;
    ponerCama();
    if (el && el !== archivoSonando) { rebobinar(el); el = null; }   // ya no es el tema
    if (quieto && quieto !== el) rebobinar(quieto);                  // se cambió o se calló en la pausa
    /* 25/oct: el de turno que estaba parado sin terminar (su play() no
       arrancó) vuelve a tener su vigía */
    if (!el) { if (archivoSonando && parado(archivoSonando)) vigilar(archivoSonando, 1); return true; }
    try { el.volume = 0; } catch (e) { }
    tocar(el);
    rampa(el, 0, volArchivo, FUNDIDO_MS);
    vigilar(el, 1);
    return true;
  }

  /* los EFECTOS (WebAudio) también: el contexto se suspende al ocultarse y
     vuelve al mostrarse, solo si lo suspendimos nosotros (si estaba
     suspendido porque todavía no hubo un toque, lo destraba unlock(), como
     siempre). Con el mute puesto los efectos no suenan igual: muestra() lo
     mira, y la cama se apaga (ponerCama). */
  var ctxSuspendidoPorOculto = false;
  function suspenderEfectos() {
    if (!ctx || ctx.state !== "running" || !ctx.suspend) return false;
    ctxSuspendidoPorOculto = true;
    try { var p = ctx.suspend(); if (p && p.catch) p.catch(function () { }); } catch (e) { }
    return true;
  }
  function reanudarEfectos() {
    if (!ctx || !ctxSuspendidoPorOculto) return false;
    ctxSuspendidoPorOculto = false;
    try { var p = ctx.resume(); if (p && p.catch) p.catch(function () { }); } catch (e) { }
    return true;
  }
  /* pestaña oculta = otra app de mensajes, la pantalla de inicio, el teléfono
     bloqueado. Lo engancha el propio motor de sonido, una vez, al cargar: no
     depende de que exista el juego ni de en qué escena está. */
  function alCambiarVisibilidad() {
    if (typeof document === "undefined") return;
    if (document.hidden) { pausarMusica("oculto"); suspenderEfectos(); }
    else { reanudarMusica("oculto"); reanudarEfectos(); }
  }
  if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
  }

  /* mapa: { id: { archivo, loop } }. Devuelve cuántos quedaron listos. */
  /* ══════════════════════════════════════════════════════════════════════
     LOS TEMAS DE UNA PASADA. "Under the Floodlights" (la entrada a la cancha)
     y el festejo de gol no hacen loop: terminan. Antes de esto, cuando
     terminaban quedaba silencio y nadie se enteraba.

     alTerminarMusica(cb) avisa una sola vez. Trae DOS relojes porque el
     navegador puede negarse a reproducir sin gesto del usuario: si el elemento
     nunca arranca, 'ended' no llega nunca. El tope por tiempo garantiza que el
     partido igual pase a su tema, con o sin audio habilitado. */
  var avisoFin = null;
  function limpiarAvisoFin() {
    if (!avisoFin) return;
    try { avisoFin.el.removeEventListener("ended", avisoFin.fn); } catch (e) { }
    clearTimeout(avisoFin.tope);
    avisoFin = null;
  }
  function alTerminarMusica(cb, topeMs) {
    limpiarAvisoFin();
    if (typeof cb !== "function") return false;
    var el = archivoSonando;
    var disparar = function () { limpiarAvisoFin(); cb(); };
    var tope = setTimeout(disparar, Math.max(500, topeMs || 12000));
    if (!el) { return true; }              // sin elemento: manda el tope
    avisoFin = { el: el, fn: disparar, tope: tope };
    el.addEventListener("ended", disparar, { once: true });
    return true;
  }

  /* cfg: balance.musica (vigia_ms, vigia_intentos), ver EL TEMA QUE NO ARRANCÓ */
  function registrarArchivos(mapa, volumen, cfg) {
    if (volumen != null) volBase = volumen;
    if (cfg) { VIGIA.ms = cfg.vigia_ms | 0; VIGIA.intentos = cfg.vigia_intentos | 0; }
    volArchivo = volBase * volMusica;
    /* UN ARCHIVO = UN ELEMENTO. definicion, jugadon y partido_final comparten
       pista (Last Ten Seconds); si cada uno tuviera su propio <audio>, entrar
       al pasillo en el minuto 88 REINICIARÍA el tema desde cero en vez de
       seguirlo. Compartiendo el elemento, el guard de musicaTema ("el mismo ya
       sonando: no se reinicia") hace que el cambio sea inaudible, que es lo que
       corresponde: es el mismo tema.
       Y SE REUSAN ENTRE REGISTROS: el mapa se vuelve a registrar cuando cambia
       la fecha (la alternancia es por fecha). Antes eso creaba doce <audio>
       nuevos y dejaba los viejos sin pausar; ahora el archivo que sigue en el
       mapa conserva su elemento —y si estaba sonando, sigue sonando— y el que
       sale del mapa se despide. */
    var viejos = {};
    elementos.forEach(function (el) { viejos[el.__ruta] = el; });
    var porRuta = {}, n = 0;
    archivos = {};
    if (mapa) Object.keys(mapa).forEach(function (id) {
      var e = mapa[id];
      if (id.charAt(0) === "_" || !e) return;
      var ruta = typeof e === "string" ? e : e.archivo;
      if (!ruta) return;
      var a = porRuta[ruta];
      if (!a) {
        a = viejos[ruta];
        if (!a) {
          a = new Audio(ruta);
          /* L06 (carga-liviana): nace SIN bajar. Antes era "auto" y el mapa
             entero (8 archivos, 2,5 MB) se bajaba junto apenas se registraba,
             peleándole la señal a las imágenes. Se baja cuando suena
             (musicaTema) o cuando es el tema que viene (precargarTemas). */
          a.preload = "none";
          a.volume = 0;
          a.__ruta = ruta;
        }
        a.loop = typeof e === "object" ? !!e.loop : true;
        try { a.muted = muted; } catch (er) { }
        porRuta[ruta] = a;
      }
      archivos[id] = { audio: a, loop: a.loop };
      n++;
    });
    var siguen = [];
    elementos.forEach(function (el) {
      if (porRuta[el.__ruta]) siguen.push(el);
      else { if (el === archivoSonando) archivoSonando = null; despedir(el, true); }
    });
    Object.keys(porRuta).forEach(function (r) { if (siguen.indexOf(porRuta[r]) < 0) siguen.push(porRuta[r]); });
    elementos = siguen;
    return n;
  }
  function hayArchivo(id) { return !!archivos[id]; }

  /* L06 (carga-liviana) · EL TEMA QUE VIENE. Los <audio> nacen con
     preload="none"; esto les pone "auto" a los momentos que pueden sonar
     después (logic/musica.js, siguientes) para que el navegador los tenga
     cuando se los pida. Un elemento que nunca empezó a bajar (readyState 0)
     y no está sonando se arranca con load(): hay navegadores que no
     retoman la descarga solo porque cambie el atributo. Devuelve cuántos
     empezaron a bajar (0 si quedaron esperando al que suena, ver abajo).

     EL QUE SUENA, PRIMERO. Medido en el navegador con "Slow 4G" simulado
     (1,44 Mbps compartidos, 562 ms por pedido): al pedir el opening se
     precargaban en el mismo instante los dos temas que vienen, y los tres
     (más lo que bajaba en segundo plano) se repartían la señal: el opening,
     422 KB, seguía sin poder sonar 20 s después. Ahora lo que viene espera a
     que el que suena pueda llegar al final (canplaythrough) o falle. */
  function cuandoSuenaListo(cb) {
    if (typeof cb !== "function") return false;
    var el = archivoSonando;
    if (!el || el.__saliendo) { cb(); return true; }
    return cuandoListo(el, cb);
  }
  /* revisión L06: lo mismo para un tema que NO suena todavía, por su
     momento: la compuerta espera al del opening antes de arrancarlo (con su
     tope en la intro). Sin archivo para ese momento, avisa en el acto */
  function cuandoTemaListo(id, cb) {
    if (typeof cb !== "function") return false;
    var e = archivos[id];
    if (!e || !e.audio) { cb(); return true; }
    return cuandoListo(e.audio, cb);
  }
  /* puede llegar al final sin cortarse (canplaythrough), o falló (un iOS
     viejo que no lee OGG Opus da error enseguida: tampoco hay que esperarlo) */
  function cuandoListo(el, cb) {
    if (el.readyState >= 4 || el.error || typeof el.addEventListener !== "function") { cb(); return true; }   // el error ya pasó: no vuelve a avisar
    var hecho = false;
    var f = function () {
      if (hecho) return;
      hecho = true;
      try { el.removeEventListener("canplaythrough", f); el.removeEventListener("error", f); } catch (e) { }
      cb();
    };
    el.addEventListener("canplaythrough", f);
    el.addEventListener("error", f);
    return false;
  }
  function precargarTemas(ids) {
    var n = 0;
    cuandoSuenaListo(function () { n = precargarYa(ids); });
    return n;
  }
  function precargarYa(ids) {
    var n = 0;
    (ids || []).forEach(function (id) {
      var e = archivos[id], el = e && e.audio;
      if (!el || el.preload === "auto") return;
      try { el.preload = "auto"; } catch (er) { }
      try {
        if (el.paused && !el.readyState && el.networkState !== 2 && typeof el.load === "function") el.load();
      } catch (er) { }
      n++;
    });
    return n;
  }

  /* ══════════════════════════════════════════════════════════════════════
     25/oct · EL TEMA QUE NO ARRANCÓ ("arranco el partido y es solo
     murmullo, sin música" y "se activa y se desactiva la música").

     Con cuarteto, rock y rap la entrada a la cancha y el partido son el
     MISMO archivo (los estilos no traen entrada propia: logic/musica.js), o
     sea el mismo elemento. Si el play() de la entrada no arrancaba (el
     navegador lo frenó, o un pause o un load lo cortó antes de que llegara
     el archivo), el pedido del partido a los 11 s encontraba "el mismo tema
     ya sonando" y se iba sin volver a intentar: el partido con la cama de la
     hinchada sola, la música recién en el remate (que pide el tema del
     jugadón, otro archivo) y al volver al partido otra vez el elemento
     parado. La música se prendía y se apagaba.

     Ahora: (1) pedir el tema que ya es el de turno, si está parado sin haber
     terminado, lo vuelve a tocar; (2) cada tema que entra tiene un vigía
     (balance.musica.vigia_ms): si a ese tiempo sigue parado, o dice que
     suena pero no tiene datos y no está bajando (o dio error), se lo vuelve
     a pedir, hasta vigia_intentos veces. Un
     tema que todavía baja (networkState 2) no se corta: se lo espera. El
     motivo del último freno queda en el elemento (__frenado). vigia_ms en 0
     apaga el vigía.
     ══════════════════════════════════════════════════════════════════════ */
  var VIGIA = { ms: 0, intentos: 0 };
  function tocar(el) {
    try { el.muted = muted; } catch (e) { }
    el.__frenado = null;
    try {
      var pr = el.play();
      if (pr && pr.catch) pr.catch(function (er) { el.__frenado = (er && er.name) || "Error"; });
    } catch (e) { el.__frenado = (e && e.name) || "Error"; }
  }
  function parado(el) {
    return el === archivoSonando && !el.__saliendo && !el.ended && el.paused && !musicaEnPausa();
  }
  function vigilar(el, intento) {
    if (!(VIGIA.ms > 0) || intento > VIGIA.intentos) return;
    clearTimeout(el.__vigia);
    el.__vigia = setTimeout(function () {
      el.__vigia = null;
      if (el !== archivoSonando || el.__saliendo || el.ended || musicaEnPausa()) return;
      var trabado = !el.paused && (!!el.error || el.readyState < 3);
      if (trabado && !el.error && el.networkState === 2) { vigilar(el, intento); return; }   // todavía baja: se espera
      if (!el.paused && !trabado) return;
      if (trabado && typeof el.load === "function") { try { el.load(); } catch (e) { } }
      tocar(el);
      rampa(el, el.volume, duck.el === el ? volArchivo * DUCK : volArchivo, FUNDIDO_MS);
      vigilar(el, intento + 1);
    }, VIGIA.ms);
  }

  function musicaTema(nombre, seco) {
    var id = nombre === "propia" ? "propia_propio" : nombre;
    /* el mismo tema ya sonando: no se reinicia (cortaría el loop al pedo).
       Pero los demás se van igual: si algo quedó colgado, éste es el momento
       de limpiarlo. 25/oct: y si el de turno quedó parado sin terminar (su
       play() no arrancó), se lo vuelve a tocar */
    if (id && archivos[id] && archivoSonando === archivos[id].audio && !archivoSonando.__saliendo) {
      despedirLosDemas(archivoSonando, seco);
      if (parado(archivoSonando)) {
        tocar(archivoSonando);
        rampa(archivoSonando, 0, volArchivo, FUNDIDO_MS);
        vigilar(archivoSonando, 1);
      }
      return;
    }

    if (id && archivos[id]) {
      /* apagar el sintetizador si estaba */
      if (mus && mus.timer) { clearInterval(mus.timer); mus.timer = null; mus.base = null; vientoOff(); }
      var entrante = archivos[id].audio;
      /* L06: el que se pide se baja entero (nació con preload="none") */
      try { if (entrante.preload !== "auto") entrante.preload = "auto"; } catch (e) { }
      soltarDuckYa();
      archivoSonando = entrante;
      entrante.__saliendo = false;
      /* L04: con la música en pausa (pestaña oculta, teléfono en vertical)
         el pedido cambia el tema que va a volver, pero no suena todavía */
      if (musicaEnPausa()) {
        pendiente = entrante;
        despedirLosDemas(entrante, true);
        detenerRampa(entrante);
        try { entrante.volume = volArchivo; } catch (e) {}
        return;
      }
      despedirLosDemas(entrante, seco);
      tocar(entrante);
      vigilar(entrante, 1);
      /* el volumen de destino es siempre el de crucero: el mute lo hace la
         propiedad muted del elemento. Antes el destino era 0 si estabas en
         mute, y al sacar el mute el tema quedaba en volumen 0 hasta el
         próximo cambio de tema. */
      if (seco) { detenerRampa(entrante); try { entrante.volume = volArchivo; } catch (e) {} }
      else rampa(entrante, entrante.paused ? 0 : entrante.volume, volArchivo, FUNDIDO_MS);
      return;
    }

    /* ══════════════════════════════════════════════════════════════════════
       M3 · SIN ARCHIVO NO SUENA NADA. El sintetizador NO vuelve.

       Acá estaba la fuga: cuando un momento no tenía archivo, esta función
       arrancaba el chiptune sin avisar. Como la intro, la definición y el
       jugadón pedían momentos que no estaban mapeados, sonaba el sintetizador
       — y quedaba prendido, así que también contaminaba lo que venía después.
       Cinco síntomas, una sola causa.

       Ahora: si no hay archivo, silencio. Un momento sin tema es un bug de
       datos y se arregla en audio.json, no tapándolo con música vieja. La
       puerta (pedirMusica) grita en desarrollo cuando el momento no existe.
       ══════════════════════════════════════════════════════════════════════ */
    pararArchivo(seco);
    if (id) {
      var av = "[MUSICA] '" + id + "' no tiene archivo registrado: queda en silencio. " +
        "Declaralo en data/audio.json y mapealo en phaser/logic/musica.js.";
      if (typeof console !== "undefined" && console.warn) console.warn(av);
    }
    vientoOff();
    if (mus && mus.timer) { clearInterval(mus.timer); mus.timer = null; mus.base = null; }
  }
  /* M3 · SE FUE musicaZona(). Hacía crecer el motivo DEL SINTETIZADOR al
     cruzar de campo (modulaba al mayor relativo). Con archivos no hay motivo
     que crecer: lo que quedó de ese momento es temaCampo(), que es un golpe
     corto de tres notas — efecto, no música. */

  /* ══════════════════════════════════════════════════════════════════════
     EL BAJÓN DE MÚSICA (duck): UNA VENTANA, UN RELOJ.

     Antes cada pedido bajaba la música y programaba SU propia subida con un
     setTimeout que nadie podía cancelar. Dos pedidos cerca —el silencio
     antes del desenlace y el del gol, que van uno atrás del otro— y la
     subida del primero entraba EN MEDIO del silencio del segundo: la música
     volvía justo cuando tenía que callar.

     Ahora el pedido nuevo ESTIRA la ventana (nunca la achica) y hay un solo
     reloj de salida. Si en el medio entra otro tema, el bajón se suelta: el
     tema nuevo entra a su volumen. */
  var duck = { hasta: 0, timer: null, el: null };
  function ahoraMs() { return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now(); }
  function soltarDuckYa() {
    if (duck.timer) { clearTimeout(duck.timer); duck.timer = null; }
    duck.el = null; duck.hasta = 0;
    ponerCama();
  }
  function musicaDuck(ms) {
    var el = archivoSonando;
    if (!el || el.__saliendo || musicaEnPausa()) return;   // L04: no se baja lo que está en pausa
    ms = Math.max(160, ms || 500);
    var fin = ahoraMs() + ms;
    if (duck.el !== el) {
      soltarDuckYa();
      duck.el = el;
      rampa(el, el.volume, volArchivo * DUCK, 90);
      ponerCama();
    }
    if (fin <= duck.hasta) return;         // la ventana ya cubre este pedido
    duck.hasta = fin;
    if (duck.timer) clearTimeout(duck.timer);
    /* sube 200 ms antes del final de la ventana, en 320 ms (como antes) */
    duck.timer = setTimeout(function () {
      duck.timer = null;
      var e = duck.el; duck.el = null; duck.hasta = 0;
      if (e && e === archivoSonando && !e.__saliendo) rampa(e, e.volume, volArchivo, 320);
      ponerCama();
    }, Math.max(80, ms - 200));
  }

  var SFX = {
    unlock: unlock,
    setMuted: function (m) {
      muted = !!m;
      /* M3 · el mute de la música lo maneja el reproductor de archivo
         (pararArchivo / rampa); el bus del sintetizador ya no existe. */
      /* sobre TODOS los elementos: antes solo el que sonaba, y el resto
         quedaba con el mute viejo pegado para cuando volviera a entrar */
      elementos.forEach(function (el) { try { el.muted = muted; } catch (e) { } });
      ponerCama();
      persistirMute();
    },
    isMuted: function () { return muted; },
    setVolumenes: function (musica, efectos) {
      volMusica = musica; volEfectos = efectos;
      volArchivo = volBase * volMusica;
      if (master) master.gain.value = MEZCLA.bus * volEfectos;
      var el = archivoSonando;
      if (el && !el.__saliendo) { detenerRampa(el); try { el.volume = duck.el === el ? volArchivo * DUCK : volArchivo; } catch (e) { } }
    },
    volumenes: function () { return { musica: volMusica, efectos: volEfectos }; },
    configurarMezcla: configurarMezcla,
    cargarMuestras: cargarMuestras,
    MUESTRAS: MUESTRAS,
    muestrasListas: function () { return Object.keys(buffers); },
    musicaTema: musicaTema,
    musicaDuck: musicaDuck,
    /* L04: la pausa de la música (pestaña oculta, teléfono en vertical) */
    pausarMusica: pausarMusica, reanudarMusica: reanudarMusica, musicaEnPausa: musicaEnPausa,
    registrarArchivos: registrarArchivos, hayArchivo: hayArchivo,   // M2: data/audio.json
    precargarTemas: precargarTemas, cuandoSuenaListo: cuandoSuenaListo,   // L06: el tema que viene, después del que suena
    cuandoTemaListo: cuandoTemaListo,   // revisión L06: el del opening, con la compuerta a la vista
    alTerminarMusica: alTerminarMusica,
    /* M3 · musicaUrgente() sigue existiendo porque el partido la llama en el
       minuto 85 y al final, pero ya NO cambia la música: cuando la música se
       generaba, prendía la variante urgente del loop. Ahora la urgencia es un
       archivo — "partido_final" — y lo pide chequearTramoFinal() por la puerta.
       Queda la bandera, que es lo que consultan los tests y el HUD. */
    musicaUrgente: function (on) { mus.urgente = !!on; },
    estaUrgente: function () { return !!mus.urgente; },

    /* ══════════════════════════════════════════════════════════════════════
       LA VOZ DE LA INTERFAZ.

       No habia NI UNO. El juego tenia patada, silbato, guantes, red, tribuna
       y hasta cuatro motivos musicales cortos — y cero sonidos de menu. Tocabas
       una opcion y no pasaba nada, que es lo que hace que una pantalla se
       sienta una pagina web en vez de un juego.

       Siete, y ni uno mas. Entran todos por UNA puerta: SFX.ui(nombre). Un
       solo lugar donde engancharlos y un solo lugar donde apagarlos. La
       interfaz suena varias veces más bajo que el juego, porque suena todo el
       tiempo: un menú que compite con un gol está mal mezclado.

       17/oct, Rodri: moverte entre botones con las teclas sonaba "como si
       cambiaras de juego". Eran pitidos de onda cuadrada en 880 Hz con un
       chasquido de ruido arriba de 3 kHz: 8 bits sobre una música que no lo
       es. A la mañana pasaron a senoidales; a la tarde, a madera: toques de
       nudillo en un cajón hueco (ui_mover, ui_confirmar, ui_volver). Los
       otros cuatro salen de esas mismas tres muestras, más agudas o más
       graves, para que sean del mismo mundo:
         abrir      el de mover, una cuarta arriba
         cerrar     el de mover, una cuarta abajo
         bloqueado  el de volver, una cuarta abajo: el "no", más sordo
         cartel     el de confirmar, una quinta arriba
       Confirmar son dos toques que suben y volver la misma figura al revés:
       que sea la MISMA figura invertida es lo que hace que se entienda sin
       aprenderla.
       ══════════════════════════════════════════════════════════════════════ */
    ui: (function () {
      /* anti-metralla: moviendo rapido el cursor, "mover" se dispara cada dos
         cuadros y suena a lluvia. Cada sonido tiene su propio piso. */
      var ultimo = {};
      var PISO = { mover: 45, bloqueado: 300, cartel: 120 };
      /* nombre: [muestra, playbackRate, ganancia relativa] */
      var VOZ = {
        mover: ["ui_mover", 1, 0.48], confirmar: ["ui_confirmar", 1, 1], volver: ["ui_volver", 1, 0.89],
        abrir: ["ui_mover", 1.335, 0.65], cerrar: ["ui_mover", 0.749, 0.43],
        bloqueado: ["ui_volver", 0.749, 1.05], cartel: ["ui_confirmar", 1.498, 0.94]
      };
      return function (nombre) {
        var v = VOZ[nombre];
        if (!v || !ensure()) return false;
        var ahora = now() * 1000;
        var piso = PISO[nombre] || 0;
        if (piso && ultimo[nombre] != null && (ahora - ultimo[nombre]) < piso) return false;
        ultimo[nombre] = ahora;
        return !!muestra(v[0], { rate: v[1], gain: v[2] });
      };
    })(),

    /* 20/oct · LA VOZ DE LOS DIÁLOGOS: la misma madera de mover el cursor,
       bajita y cortada, con el tono de quien habla (balance.dialogo). El
       piso evita la metralla cuando las letras salen más rápido que él. */
    voz: (function () {
      var ultimo = -1e9;
      return function (t, pisoMs, corteMs) {
        if (!ensure()) return false;
        var ahora = now() * 1000;
        if (ahora - ultimo < pisoMs) return false;
        ultimo = ahora;
        var m = muestra("ui_mover", { rate: t.rate, gain: t.gain });
        if (!m) return false;
        m.g.gain.setTargetAtTime(0, now() + corteMs / 1000, 0.012);
        m.src.stop(now() + corteMs / 1000 + 0.08);
        return true;
      };
    })(),

    kick: function () { if (ensure()) muestra("patada"); },
    /* el contacto del súper tiro: más cuerpo y el chasquido del cuero */
    kickFuerte: function () { if (ensure()) muestra("patada_fuerte"); },
    whoosh: function () { if (ensure()) muestra("viento_remate"); },
    /* 25/oct, Rodri: "HAY QUE HACER SONIDO Y EFECTO CUANDO PATEA, Y CUANDO
       PATEA ÉPICAMENTE". La patada épica (súper tiro, EL TOQUE al ángulo,
       el tiro de frente bien perfilado) son tres capas encima del golpe
       fuerte: el silbido de la pelota que sale (silbido_ms después del
       contacto) y la hinchada que se levanta (hinchada_ms de largo, sube en
       hinchada_sube_ms). El golpe fuerte lo da la escena en el contacto, como
       en cualquier remate, y también pide el corte de música (musicaDuck).
       e = balance.patada_epica */
    patadaEpica: function (e) {
      setTimeout(function () { SFX.whoosh(); }, e.silbido_ms);
      SFX.crowd(e.hinchada_ms, e.hinchada_sube_ms);
    },
    /* el golpe en la RED y el roce de la malla */
    net: function () { if (ensure()) muestra("red"); },
    /* los guantes son solo del arquero; el choque de un quite, un corte o un
       bloqueo es la patada, 6 dB más baja (pedido de Rodri del 17/oct) */
    gloves: function () { if (ensure()) muestra("guantes"); },
    choque: function () { if (ensure()) muestra("patada"); },
    /* el caño de metal: suena y vibra un instante */
    palo: function () { if (ensure()) muestra("palo"); },
    /* el "uhhh" de la hinchada cuando se va cerca */
    afuera: function () { if (ensure()) muestra("hinchada_uh"); },
    /* silbato del árbitro: un pitazo, o con "final" los tres del final */
    whistle: function (cual) { if (ensure()) muestra(cual === "final" ? "silbato_final" : "silbato"); },
    /* el rumor de la tribuna que crece y se apaga en ms (la colita de la
       tensión): un pedazo de la cama, desde cualquier lugar del loop. Con
       subeMs, crece hasta ahí (el riser) y se apaga en lo que queda */
    crowd: function (ms, subeMs) {
      if (!ensure() || !buffers.hinchada_loop) return;
      var d = (ms || 700) / 1000, t = now();
      var m = muestra("hinchada_loop", { loop: true, desde: Math.random() * buffers.hinchada_loop.duration });
      if (!m) return;
      var pico = m.g.gain.value;
      m.g.gain.setValueAtTime(0.0001, t);
      m.g.gain.linearRampToValueAtTime(pico, t + (subeMs != null ? subeMs / 1000 : d * 0.4));
      m.g.gain.linearRampToValueAtTime(0.0001, t + d);
      m.src.stop(t + d + 0.02);
    },
    /* la hinchada que explota (el gol, el atajadón): entera, o cortada en ms
       con un fundido de salida */
    festejo: function (ms) {
      if (!ensure()) return;
      var m = muestra("hinchada_gol");
      if (!m || !ms) return;
      var d = ms / 1000, t = now(), v = m.g.gain.value;
      m.g.gain.setValueAtTime(v, t + d * 0.6);
      m.g.gain.linearRampToValueAtTime(0.0001, t + d);
      m.src.stop(t + d + 0.02);
    },
    /* 20/oct · EL RISER DEL REMATE, derivado de la cama de hinchada: un
       pedazo del rumor que sube de volumen y de altura (playbackRate de 0,8
       a 1,35) durante ms y se corta seco al final, que es donde el remate se
       clava. La grabación del whoosh dura 0,48 s y no alcanza para el viaje. */
    riserRemate: function (ms) {
      if (!ensure() || !buffers.hinchada_loop) return;
      var d = (ms || 1000) / 1000, t = now();
      var m = muestra("hinchada_loop", { loop: true, rate: 0.8, desde: Math.random() * buffers.hinchada_loop.duration });
      if (!m) return;
      var pico = m.g.gain.value;
      m.src.playbackRate.setValueAtTime(0.8, t);
      m.src.playbackRate.exponentialRampToValueAtTime(1.35, t + d);
      m.g.gain.setValueAtTime(0.0001, t);
      m.g.gain.linearRampToValueAtTime(pico, t + d * 0.92);
      m.g.gain.linearRampToValueAtTime(0.0001, t + d);
      m.src.stop(t + d + 0.02);
    },
    /* corre fn con todos los efectos multiplicados por f */
    debajo: function (f, fn) {
      var antes = atenua; atenua = f;
      try { return fn(); } finally { atenua = antes; }
    },
    /* la cama de hinchada del partido: prendida o apagada (ver ponerCama) */
    cama: function (on) {
      camaEstado.quiere = !!on;
      if (on) ensure();
      ponerCama();
    },

    /* ===== LOS GOLPES CORTOS (v2 §9): reaccionan a la jugada encima del tema
       que esté puesto. Desde el 17/oct son la hinchada grabada, no notas: en
       onda triangular sonaban a consola vieja (pedido de Rodri). Llaman al
       crowd() de afuera, así suenan con su mezcla. ===== */
    temaPosesion: function (quien) { if (quien === "mia") SFX.crowd(450); },
    /* RISER del beat de tensión (Feel B1): el rumor crece durante el beat y
       se apaga cuando abre el menú. Con megacosa el beat es más largo. */
    riser: function (dur) {
      var ms = (dur || 0.75) * 1000;
      SFX.crowd(ms + 250, ms);
    },
    /* Feel B8: al cruzar a campo rival la tribuna empuja */
    temaCampo: function (zona) { if (zona === "rival") SFX.crowd(900); },
    temaUrgente: function () { SFX.crowd(1400); },
    /* gol EN CONTRA: el "uhhh" de la hinchada, más grave */
    golEnContra: function () { if (ensure()) muestra("hinchada_uh", { rate: 0.8 }); }
  };
  /* LA MEZCLA, aplicada en un solo lugar: cada efecto suena con su ganancia
     de MEZCLA (arriba de todo) sin tocar la muestra. La cama no pasa por acá:
     lee MEZCLA.cama en ponerCama, porque su nivel cambia mientras suena (el
     duck). */
  ["kick", "kickFuerte", "choque", "whoosh", "net", "gloves", "palo", "afuera", "whistle", "crowd",
    "festejo", "golEnContra", "ui", "riserRemate"].forEach(function (k) {
    var f = SFX[k]; if (typeof f !== "function") return;
    SFX[k] = function () { var a = arguments, self = this; return con(k, function () { return f.apply(self, a); }); };
  });
  return SFX;
});
