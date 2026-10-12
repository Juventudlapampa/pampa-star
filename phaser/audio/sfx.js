/* ============================================================================
   PAMPA STAR · phaser/audio/sfx.js — SFX ORIGINALES por WebAudio (sin archivos)
   Cada beat del remate tiene su sonido, sintetizado en vivo. 100% original,
   nada de terceros. Se desbloquea con el primer toque (política de audio móvil).
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
     ══════════════════════════════════════════════════════════════════════ */
  var MEZCLA = {
    bus: 0.8,
    kick: 2.0, net: 1.6, gloves: 2.0, afuera: 2.6, goal: 1.4, whistle: 2.0,
    crowd: 6.0, whoosh: 3.0, riser: 1.6, riserGrande: 1.3,
    temaPosesion: 1, temaCampo: 1, temaUrgente: 1, golEnContra: 1, ui: 1
  };
  var ganancia = 1;          // la del efecto que está sonando ahora (ver con())
  function configurarMezcla(cfg) {
    if (!cfg || typeof cfg !== "object") return;
    Object.keys(cfg).forEach(function (k) { if (k.charAt(0) !== "_" && typeof cfg[k] === "number") MEZCLA[k] = cfg[k]; });
    if (master) master.gain.value = MEZCLA.bus;
  }
  /* corre fn con la ganancia del efecto `nombre`: tone() y noise() la leen */
  function con(nombre, fn) {
    var antes = ganancia;
    ganancia = MEZCLA[nombre] != null ? MEZCLA[nombre] : 1;
    try { return fn(); } finally { ganancia = antes; }
  }

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = MEZCLA.bus;
    /* el limitador: umbral -6 dBFS, relación 20:1, ataque de 3 ms */
    var lim = ctx.createDynamicsCompressor ? ctx.createDynamicsCompressor() : null;
    if (lim) {
      lim.threshold.value = -6; lim.knee.value = 3; lim.ratio.value = 20;
      lim.attack.value = 0.003; lim.release.value = 0.12;
      master.connect(lim); lim.connect(ctx.destination);
    } else master.connect(ctx.destination);
    return ctx;
  }
  function unlock() { var c = ensure(); if (c && c.state === "suspended") c.resume(); }
  function now() { return ctx ? ctx.currentTime : 0; }

  /* osc simple con envolvente ADSR corta */
  function tone(type, f0, f1, t0, dur, gain) {
    if (!ctx || muted) return;
    gain = gain * ganancia;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  /* ruido blanco filtrado (para impactos / red / multitud) */
  function noise(t0, dur, gain, freq, q, type) {
    if (!ctx || muted) return;
    gain = gain * ganancia;
    var n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = ctx.createBufferSource(); s.buffer = buf;
    var bp = ctx.createBiquadFilter(); bp.type = type || "bandpass"; bp.frequency.value = freq || 900; bp.Q.value = q || 1;
    var g = ctx.createGain(); g.gain.value = gain;
    s.connect(bp); bp.connect(g); g.connect(master);
    s.start(t0); s.stop(t0 + dur);
  }

  /* ===== ANIME v4 Bloque D · MÚSICA CHIPTUNE EN LOOP (secuenciador propio) =====
     Dos temas de 16 pasos 100% originales: PROPIA (pausado, mayor, respirado) y
     RIVAL (tenso, menor, pulso corto). Un timer JS programa notas por delante
     en el reloj de WebAudio (no se traba con el frame rate). El silencio
     pre-desenlace se logra con musicaDuck (baja el bus de música y vuelve). */
  /* ============================================================================
     ADDENDUM v6 Parte B (REEMPLAZA al §6): música CON DIRECCIÓN, no "que suene
     mejor". EL MOTIVO de 4 notas ascendente (tónica→quinta→sexta→octava)
     aparece en TODOS los temas transformado: insinuado en campo propio,
     completo al cruzar, INVERTIDO cuando la tiene el rival, a toda máquina en
     el opening. Tres capas mínimo (bajo + melodía + percusión), progresiones
     heroicas del anime ochentoso (i–VI–III–VII), y la capa de VIENTO pampeano
     apenas audible. Los parámetros llegan de balance.json → musica
     (configurarMusica); este default es el mismo brief.
     ========================================================================== */
  var MUSICA = {
    vol: 0.5,
    viento: 0.014,
    motivo: [0, 7, 9, 12],                       // tónica → quinta → sexta → octava
    temas: {
      propia_propio: { tonica: 220, modo: "menor", bpm: 92, prog: [0, 8, 3, 10], percusion: 0.35, motivo: "insinuado" },
      propia_rival: { tonica: 261.63, modo: "mayor", bpm: 112, prog: [0, 9, 5, 7], percusion: 1, motivo: "completo" },
      rival: { tonica: 220, modo: "menor", bpm: 100, prog: [0, -1, -2, -3], percusion: 0.8, motivo: "invertido", segunda_menor: true },
      urgente: { tonica: 220, modo: "menor", bpm: 138, prog: [0, 8, 3, 10], percusion: 1, motivo: "completo", tictac: true },
      opening: { tonica: 220, modo: "menor_a_mayor", bpm: 140, prog: [0, 8, 3, 10], percusion: 1, motivo: "principal" }
    },
    gol_bpm: 150,
    lamento_bpm: 70
  };
  function configurarMusica(cfg) { if (cfg && typeof cfg === "object") MUSICA = Object.assign({}, MUSICA, cfg); }
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
     se borró — todos usan tone()/noise() sobre el master, como el resto de los
     efectos. Son estos cinco:

       temaPosesion(quien)  3 notas al cambiar de mano (sube la tuya, baja la de ellos)
       temaCampo(zona)      3 notas al cruzar la mitad de la cancha
       temaUrgente()        el tictac de los últimos 5 minutos
       golEnContra()        el lamento de 4 notas: EL MOTIVO invertido y lento
       goal()               EL MOTIVO a toda potencia cuando la metés

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
  var volArchivo = 0.5;     // el volumen "de crucero" de los archivos
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
     estos <audio> no son de Phaser: pasabas a WhatsApp y el tema seguía
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
     ══════════════════════════════════════════════════════════════════════ */
  var motivosPausa = {};
  var pendiente = null;      // el elemento que vuelve a sonar al reanudar
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
      try { if (!el.paused) el.pause(); } catch (e) { }
    });
    if (pendiente) { try { pendiente.volume = volArchivo; } catch (e) { } }
    return true;
  }
  function reanudarMusica(motivo) {
    if (!motivosPausa[motivo || "pausa"]) return false;
    delete motivosPausa[motivo || "pausa"];
    if (musicaEnPausa()) return false;
    var el = pendiente;
    pendiente = null;
    if (!el || el !== archivoSonando) return true;
    try { el.muted = muted; } catch (e) { }
    try { el.volume = 0; var pr = el.play(); if (pr && pr.catch) pr.catch(function () { }); } catch (e) { }
    rampa(el, 0, volArchivo, FUNDIDO_MS);
    return true;
  }

  /* los EFECTOS (WebAudio) también: el contexto se suspende al ocultarse y
     vuelve al mostrarse, solo si lo suspendimos nosotros (si estaba
     suspendido porque todavía no hubo un toque, lo destraba unlock(), como
     siempre). Con el mute puesto los efectos no suenan igual: tone() y
     noise() lo miran. */
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
  /* pestaña oculta = WhatsApp, la pantalla de inicio, otra app, el teléfono
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

  function registrarArchivos(mapa, volumen) {
    if (volumen != null) volArchivo = volumen;
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
          a.preload = "auto";
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

  function musicaTema(nombre, seco) {
    var id = nombre === "propia" ? "propia_propio" : nombre;
    /* el mismo tema ya sonando: no se reinicia (cortaría el loop al pedo).
       Pero los demás se van igual: si algo quedó colgado, éste es el momento
       de limpiarlo. */
    if (id && archivos[id] && archivoSonando === archivos[id].audio && !archivoSonando.__saliendo) {
      despedirLosDemas(archivoSonando, seco);
      return;
    }

    if (id && archivos[id]) {
      /* apagar el sintetizador si estaba */
      if (mus && mus.timer) { clearInterval(mus.timer); mus.timer = null; mus.base = null; vientoOff(); }
      var entrante = archivos[id].audio;
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
      try { entrante.muted = muted; } catch (e) {}
      try { var pr = entrante.play(); if (pr && pr.catch) pr.catch(function () { }); } catch (e) {}
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
    }
    if (fin <= duck.hasta) return;         // la ventana ya cubre este pedido
    duck.hasta = fin;
    if (duck.timer) clearTimeout(duck.timer);
    /* sube 200 ms antes del final de la ventana, en 320 ms (como antes) */
    duck.timer = setTimeout(function () {
      duck.timer = null;
      var e = duck.el; duck.el = null; duck.hasta = 0;
      if (e && e === archivoSonando && !e.__saliendo) rampa(e, e.volume, volArchivo, 320);
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
      persistirMute();
    },
    isMuted: function () { return muted; },
    configurarMusica: configurarMusica,
    configurarMezcla: configurarMezcla,
    musicaTema: musicaTema,
    musicaDuck: musicaDuck,
    /* L04: la pausa de la música (pestaña oculta, teléfono en vertical) */
    pausarMusica: pausarMusica, reanudarMusica: reanudarMusica, musicaEnPausa: musicaEnPausa,
    registrarArchivos: registrarArchivos, hayArchivo: hayArchivo,   // M2: data/audio.json
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

       Siete, y ni uno mas. Todos sintetizados con tone()/noise() sobre el
       master que ya existe (nada de archivos: son respuestas, tienen que salir
       en el mismo cuadro que el toque).

       DOS REGLAS QUE LOS MANTIENEN EN SU LUGAR:

       1. NINGUNO PASA DE 220 ms NI DE 0,10 DE GANANCIA. La patada usa 0,35 y
          el gol 0,15: la interfaz suena SEIS VECES mas bajo que el juego,
          porque suena todo el tiempo. Un menu que compite con un gol esta mal
          mezclado.
       2. ESTAN AFINADOS AL MOTIVO DEL JUEGO (balance.musica.motivo [0,7,9,12]
          sobre La): tonica 440/880, quinta 660, sexta 1480. Asi la interfaz
          suena del mismo juego que la musica, no de otro.

       Y el bloqueado usa la SEGUNDA MENOR cayendo, que es el idioma que
       audio.json ya le tiene asignado al rival. El "no" del menu suena como
       el "no" del partido.

       Entran todos por UNA puerta: SFX.ui(nombre). Un solo lugar donde
       engancharlos y un solo lugar donde apagarlos.
       ══════════════════════════════════════════════════════════════════════ */
    ui: (function () {
      /* anti-metralla: moviendo rapido el cursor, "mover" se dispara cada dos
         cuadros y suena a lluvia. Cada sonido tiene su propio piso. */
      var ultimo = {};
      var PISO = { mover: 45, bloqueado: 300, cartel: 120 };
      return function (nombre) {
        var c = ensure(); if (!c) return false;
        var ahora = now() * 1000;
        var piso = PISO[nombre] || 0;
        if (piso && ultimo[nombre] != null && (ahora - ultimo[nombre]) < piso) return false;
        ultimo[nombre] = ahora;
        var t = now();
        switch (nombre) {
          /* el tic de mover el cursor: SIEMPRE la misma nota. Si cambiara con
             la posicion, moverse sonaria a melodia y distraeria de lo que
             estas leyendo. */
          case "mover":
            tone("square", 880, 880, t, 0.028, 0.055);
            noise(t, 0.018, 0.05, 3200, 2, "highpass");
            return true;
          /* confirmar: dos notas SUBIENDO la quinta, con cuerpo abajo */
          case "confirmar":
            tone("square", 660, 660, t, 0.045, 0.09);
            tone("square", 880, 880, t + 0.045, 0.075, 0.09);
            tone("triangle", 330, 330, t, 0.10, 0.05);
            return true;
          /* volver: la misma figura al reves y mas grave. Que sea la MISMA
             figura invertida es lo que hace que se entienda sin aprenderla. */
          case "volver":
            tone("square", 587, 587, t, 0.040, 0.075);
            tone("square", 392, 392, t + 0.040, 0.085, 0.075);
            return true;
          /* bloqueado: segunda menor cayendo — el idioma del rival */
          case "bloqueado":
            tone("square", 233, 220, t, 0.075, 0.10);
            tone("square", 220, 208, t + 0.075, 0.11, 0.10);
            noise(t, 0.06, 0.06, 300, 0.8, "lowpass");
            return true;
          /* abrir un menu: el hermanito chico del riser del partido */
          case "abrir":
            tone("sawtooth", 300, 760, t, 0.13, 0.055);
            noise(t, 0.13, 0.03, 1200, 0.7, "bandpass");
            return true;
          case "cerrar":
            tone("sawtooth", 700, 260, t, 0.10, 0.05);
            return true;
          /* el cartel que aparece: campanita tonica + sexta */
          case "cartel":
            tone("triangle", 880, 880, t, 0.07, 0.06);
            tone("triangle", 1480, 1480, t + 0.06, 0.16, 0.045);
            return true;
        }
        return false;
      };
    })(),

    /* patada seca: click grave + thump */
    kick: function () { var c = ensure(); if (!c) return; var t = now(); noise(t, 0.06, 0.5, 220, 0.7, "lowpass"); tone("triangle", 180, 90, t, 0.09, 0.35); },
    /* silbido del vuelo: sube de tono */
    whoosh: function (ms) { var c = ensure(); if (!c) return; var t = now(); tone("sawtooth", 300, 900, t, (ms || 600) / 1000, 0.06); },
    /* impacto en la RED: golpe + roce de la malla */
    net: function () { var c = ensure(); if (!c) return; var t = now(); noise(t, 0.12, 0.45, 500, 0.8, "lowpass"); noise(t + 0.02, 0.22, 0.16, 2600, 3, "highpass"); },
    /* GUANTES del arquero: palmada + agarre */
    gloves: function () { var c = ensure(); if (!c) return; var t = now(); noise(t, 0.05, 0.5, 1200, 1, "bandpass"); tone("square", 140, 120, t, 0.05, 0.18); },
    /* la pelota que se va afuera y pega en la tribuna */
    afuera: function () { var c = ensure(); if (!c) return; var t = now(); tone("sine", 700, 240, t, 0.25, 0.08); },
    /* GRITO de gol: fanfarria ascendente */
    /* GRITO de gol: EL MOTIVO a toda potencia — rápido, alto y en MAYOR (brief B.3) */
    goal: function () {
      var c = ensure(); if (!c) return; var t = now();
      var dur = 60 / (MUSICA.gol_bpm || 150);
      for (var i = 0; i < 4; i++) {
        var f = 523.25 * Math.pow(2, MUSICA.motivo[i] / 12);
        tone("square", f, f, t + i * dur * 0.5, dur * 0.8, 0.15);
        tone("triangle", f / 2, f / 2, t + i * dur * 0.5, dur * 0.8, 0.08);
      }
      tone("square", 523.25 * 2, 523.25 * 2, t + 2 * dur, dur * 2.2, 0.12);   // la octava sostenida
      noise(t, 0.5, 0.10, 1400, 0.6, "bandpass");
    },
    /* silbato del árbitro */
    whistle: function () { var c = ensure(); if (!c) return; var t = now(); tone("square", 1900, 2100, t, 0.14, 0.12); },
    /* rumor de la tribuna (colita para la tensión) */
    crowd: function (ms) { var c = ensure(); if (!c) return; var t = now(); noise(t, (ms || 700) / 1000, 0.05, 500, 0.4, "bandpass"); },

    /* ===== HOOKS DE MÚSICA (v2 §9) — motivos ORIGINALES cortos como placeholder.
       La música en loop por posesión es etapa posterior: el partido YA llama a
       estos hooks; acá se decide qué suena (hoy: un motivo de 3 notas). ===== */
    temaPosesion: function (quien) {
      var c = ensure(); if (!c) return; var t = now();
      var notas = quien === "mia" ? [392, 494, 587] : [440, 349, 294];   // sube con la tuya, baja con la de ellos
      for (var i = 0; i < notas.length; i++) tone("triangle", notas[i], notas[i], t + i * 0.07, 0.1, 0.1);
    },
    /* RISER del beat de tensión (Feel B1): sube y se corta justo cuando abre el menú */
    riser: function (dur) {
      var c = ensure(); if (!c) return; var t = now();
      tone("sawtooth", 160, 720, t, dur || 0.75, 0.07);
      noise(t, dur || 0.75, 0.04, 900, 0.6, "bandpass");
    },
    /* RISER GRANDE (Feel B6): cuando el rival anuncia una MEGACOSA — más grave, más largo */
    riserGrande: function (dur) {
      var c = ensure(); if (!c) return; var t = now();
      tone("sawtooth", 80, 500, t, dur || 1.4, 0.09);
      tone("triangle", 55, 110, t, dur || 1.4, 0.08);
      noise(t, dur || 1.4, 0.05, 400, 0.5, "lowpass");
    },
    /* Feel B8: el tema del avance — pausado y tenso en campo propio, CRECE al cruzar */
    temaCampo: function (zona) {
      var c = ensure(); if (!c) return; var t = now();
      if (zona === "rival") {
        var arriba = [392, 440, 523];
        for (var i = 0; i < arriba.length; i++) tone("triangle", arriba[i], arriba[i], t + i * 0.09, 0.14, 0.11);
        noise(t, 0.4, 0.03, 700, 0.5, "bandpass");
      } else {
        tone("triangle", 220, 220, t, 0.22, 0.09);
        tone("triangle", 262, 262, t + 0.16, 0.24, 0.08);
      }
    },
    temaUrgente: function () {
      var c = ensure(); if (!c) return; var t = now();
      for (var i = 0; i < 4; i++) tone("square", 880, 880, t + i * 0.12, 0.06, 0.12);   // tictac de los últimos 5'
    },
    /* gol EN CONTRA: EL MOTIVO INVERTIDO y lento, solo bajo — el lamento (brief B.3) */
    golEnContra: function () {
      var c = ensure(); if (!c) return; var t = now();
      var dur = 60 / (MUSICA.lamento_bpm || 70);
      for (var i = 0; i < 4; i++) {
        var f = 110 * Math.pow(2, MUSICA.motivo[3 - i] / 12);
        tone("square", f, f, t + i * dur * 0.5, dur * 0.9, 0.12);
      }
    }
  };
  /* LA MEZCLA, aplicada en un solo lugar: cada efecto suena con su ganancia
     de MEZCLA (arriba de todo) sin tocar los números de su síntesis */
  ["kick", "whoosh", "net", "gloves", "afuera", "goal", "whistle", "crowd", "temaPosesion",
    "riser", "riserGrande", "temaCampo", "temaUrgente", "golEnContra", "ui"].forEach(function (k) {
    var f = SFX[k]; if (typeof f !== "function") return;
    SFX[k] = function () { var a = arguments, self = this; return con(k, function () { return f.apply(self, a); }); };
  });
  return SFX;
});
