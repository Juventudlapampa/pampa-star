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

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    return ctx;
  }
  function unlock() { var c = ensure(); if (c && c.state === "suspended") c.resume(); }
  function now() { return ctx ? ctx.currentTime : 0; }

  /* osc simple con envolvente ADSR corta */
  function tone(type, f0, f1, t0, dur, gain) {
    if (!ctx || muted) return;
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
  var archivos = {};        // id -> { audio, loop }
  var archivoSonando = null;
  var volArchivo = 0.5;     // el volumen "de crucero" de los archivos
  var FUNDIDO_MS = 300;
  var fundidos = [];        // timers vivos, para poder matarlos

  function matarFundidos() { fundidos.forEach(clearInterval); fundidos = []; }

  /* sube o baja el volumen de un elemento Audio en ms, sin tocar el archivo */
  function rampa(el, desde, hasta, ms, alFinal) {
    if (!el) { if (alFinal) alFinal(); return; }
    var pasos = Math.max(1, Math.round(ms / 25)), i = 0;
    try { el.volume = Math.max(0, Math.min(1, desde)); } catch (e) {}
    var t = setInterval(function () {
      i++;
      var v = desde + (hasta - desde) * (i / pasos);
      try { el.volume = Math.max(0, Math.min(1, v)); } catch (e) {}
      if (i >= pasos) { clearInterval(t); fundidos = fundidos.filter(function (x) { return x !== t; }); if (alFinal) alFinal(); }
    }, 25);
    fundidos.push(t);
  }

  function pararArchivo(seco) {
    var el = archivoSonando; archivoSonando = null;
    if (!el) return;
    if (seco) { try { el.pause(); el.currentTime = 0; } catch (e) {} return; }
    rampa(el, el.volume, 0, FUNDIDO_MS, function () {
      try { el.pause(); el.currentTime = 0; } catch (e) {}
    });
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
    matarFundidos(); pararArchivo(true); archivos = {};
    if (volumen != null) volArchivo = volumen;
    if (!mapa) return 0;
    var n = 0;
    /* UN ARCHIVO = UN ELEMENTO. definicion, jugadon y partido_final comparten
       pista (Last Ten Seconds); si cada uno tuviera su propio <audio>, entrar
       al pasillo en el minuto 88 REINICIARÍA el tema desde cero en vez de
       seguirlo. Compartiendo el elemento, el guard de musicaTema ("el mismo ya
       sonando: no se reinicia") hace que el cambio sea inaudible, que es lo que
       corresponde: es el mismo tema. */
    var porRuta = {};
    Object.keys(mapa).forEach(function (id) {
      var e = mapa[id];
      if (id.charAt(0) === "_" || !e) return;
      var ruta = typeof e === "string" ? e : e.archivo;
      if (!ruta) return;
      var a = porRuta[ruta];
      if (!a) {
        a = new Audio(ruta);
        a.loop = typeof e === "object" ? !!e.loop : true;
        a.preload = "auto";
        a.volume = 0;
        porRuta[ruta] = a;
      }
      archivos[id] = { audio: a, loop: a.loop };
      n++;
    });
    return n;
  }
  function hayArchivo(id) { return !!archivos[id]; }

  function musicaTema(nombre, seco) {
    var id = nombre === "propia" ? "propia_propio" : nombre;
    /* el mismo tema ya sonando: no se reinicia (cortaría el loop al pedo) */
    if (id && archivos[id] && archivoSonando === archivos[id].audio) return;
    matarFundidos();

    if (id && archivos[id]) {
      /* apagar el sintetizador si estaba */
      if (mus && mus.timer) { clearInterval(mus.timer); mus.timer = null; mus.base = null; vientoOff(); }
      var saliente = archivoSonando;
      var entrante = archivos[id].audio;
      archivoSonando = entrante;
      var destino = muted ? 0 : volArchivo;
      if (saliente && saliente !== entrante) {
        if (seco) { try { saliente.pause(); saliente.currentTime = 0; } catch (e) {} }
        else rampa(saliente, saliente.volume, 0, FUNDIDO_MS, function () {
          try { saliente.pause(); saliente.currentTime = 0; } catch (e) {}
        });
      }
      try { entrante.play(); } catch (e) {}
      if (seco) { try { entrante.volume = destino; } catch (e) {} }
      else rampa(entrante, 0, destino, FUNDIDO_MS);
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
    if (archivoSonando) pararArchivo(seco);
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

  /* M3 · la música baja 40% con hitstop o cartel de gol, y vuelve. Vale para
     el sintetizador Y para los archivos: antes solo bajaba el bus del synth. */
  function musicaDuck(ms) {
    if (archivoSonando) {
      var el = archivoSonando, tope = muted ? 0 : volArchivo;
      matarFundidos();
      rampa(el, el.volume, tope * 0.6, 90, function () {
        setTimeout(function () { rampa(el, el.volume, tope, 320); }, Math.max(80, (ms || 500) - 200));
      });
    }
    /* M3 · acá había una segunda rama que agachaba el bus DEL SINTETIZADOR.
       Ese bus lo creaba musEnsure(), que se borró con el generador: ya no hay
       nada que agachar más que el archivo, que es lo de arriba. */
  }

  var SFX = {
    unlock: unlock,
    setMuted: function (m) {
      muted = !!m;
      /* M3 · el mute de la música lo maneja el reproductor de archivo
         (pararArchivo / rampa); el bus del sintetizador ya no existe. */
      if (archivoSonando) archivoSonando.muted = muted;
      persistirMute();
    },
    isMuted: function () { return muted; },
    configurarMusica: configurarMusica,
    musicaTema: musicaTema,
    musicaDuck: musicaDuck,
    registrarArchivos: registrarArchivos, hayArchivo: hayArchivo,   // M2: data/audio.json
    alTerminarMusica: alTerminarMusica,
    /* M3 · musicaUrgente() sigue existiendo porque el partido la llama en el
       minuto 85 y al final, pero ya NO cambia la música: cuando la música se
       generaba, prendía la variante urgente del loop. Ahora la urgencia es un
       archivo — "partido_final" — y lo pide chequearTramoFinal() por la puerta.
       Queda la bandera, que es lo que consultan los tests y el HUD. */
    musicaUrgente: function (on) { mus.urgente = !!on; },
    estaUrgente: function () { return !!mus.urgente; },

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
  return SFX;
});
