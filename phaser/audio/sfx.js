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
  var mus = { gain: null, timer: null, base: null, urgente: false, paso: 0, prox: 0, viento: null };
  function semi(f, n) { return f * Math.pow(2, n / 12); }
  function temaActivo() { return mus.urgente && mus.base ? "urgente" : mus.base; }

  function musEnsure() {
    if (!ensure()) return null;
    if (!mus.gain) { mus.gain = ctx.createGain(); mus.gain.gain.value = MUSICA.vol; mus.gain.connect(master); }
    return ctx;
  }
  function notaMus(type, f, t0, dur, g) {
    if (muted || !f) return;
    var o = ctx.createOscillator(), gn = ctx.createGain();
    o.type = type; o.frequency.value = f;
    gn.gain.setValueAtTime(0.0001, t0);
    gn.gain.exponentialRampToValueAtTime(g, t0 + 0.012);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(gn); gn.connect(mus.gain);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  /* percusión de ruido al bus de música (bombo grave / hi-hat agudo) */
  function golpeMus(t0, dur, gain, freq, tipo) {
    if (muted || !ctx) return;
    var n = Math.max(1, Math.floor(ctx.sampleRate * dur)), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = ctx.createBufferSource(); s.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = tipo; f.frequency.value = freq;
    var g = ctx.createGain(); g.gain.value = gain;
    s.connect(f); f.connect(g); g.connect(mus.gain);
    s.start(t0); s.stop(t0 + dur);
  }
  /* la capa PAMPEANA: viento sutil, presente en todos los temas de partido */
  function vientoOn() {
    if (mus.viento || !ctx || !MUSICA.viento) return;
    var n = ctx.sampleRate * 2, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    var s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
    var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 420;
    var g = ctx.createGain(); g.gain.value = MUSICA.viento;
    s.connect(f); f.connect(g); g.connect(mus.gain);
    s.start();
    mus.viento = { src: s, gain: g };
  }
  function vientoOff() { if (mus.viento) { try { mus.viento.src.stop(); } catch (e) { } mus.viento = null; } }

  /* el secuenciador dirigido: 32 pasos = 4 compases = una vuelta de progresión */
  function programar() {
    var id = temaActivo(); if (!id || !ctx) return;
    var T = MUSICA.temas[id]; if (!T) return;
    var paso = 60 / T.bpm / 2;
    if (mus.prox < ctx.currentTime) mus.prox = ctx.currentTime + 0.03;   // pestaña dormida: re-engancha
    while (mus.prox < ctx.currentTime + 0.4) {
      var i = mus.paso % 32, t0 = mus.prox;
      var compas = Math.floor(i / 8), enCompas = i % 8;
      var grado = T.prog[compas % T.prog.length];
      /* modo del compás: el opening MODULA de menor a mayor en la 2da mitad */
      var mayor = T.modo === "mayor" || (T.modo === "menor_a_mayor" && compas >= 2);
      var raiz = semi(T.tonica, grado);
      /* CAPA 1 · BAJO: corcheas en la fundamental, grave (cuadrada) */
      if (enCompas % 2 === 0) notaMus("square", raiz / 2, t0, paso * 0.85, 0.055);
      /* CAPA 2 · ARPEGIO del acorde (triangular): 1 - 3/b3 - 5 (+ la 2da menor incómoda del rival) */
      if (enCompas === 0 || enCompas === 3 || enCompas === 5) {
        var tercera = mayor ? 4 : 3;
        var notaArp = enCompas === 0 ? 0 : enCompas === 3 ? tercera : 7;
        if (T.segunda_menor && enCompas === 5) notaArp = 1;   // la segunda menor: la amenaza
        notaMus("triangle", semi(raiz, notaArp), t0, paso * 1.5, 0.04);
      }
      /* CAPA 3 · EL MOTIVO (pulso brillante), transformado por tema */
      var M = MUSICA.motivo;
      if (T.motivo === "completo" && (compas === 0 || compas === 2) && enCompas % 2 === 0)
        notaMus("square", semi(T.tonica * 2, M[enCompas / 2]), t0, paso * 1.7, 0.045);
      else if (T.motivo === "insinuado" && compas === 3 && (enCompas === 4 || enCompas === 6))
        notaMus("square", semi(T.tonica * 2, M[(enCompas - 4) / 2]), t0, paso * 1.9, 0.035);
      else if (T.motivo === "invertido" && (compas === 0 || compas === 2) && enCompas % 2 === 0)
        notaMus("square", semi(T.tonica * 2, M[3 - enCompas / 2]), t0, paso * 1.6, 0.04);
      else if (T.motivo === "principal" && enCompas % 2 === 0)
        notaMus("square", semi(T.tonica * 2, M[enCompas / 2 % 4] + (mayor ? 0 : 0)), t0, paso * 1.8, 0.055);
      /* CAPA 4 · PERCUSIÓN (bombo + hat) escalada por carácter */
      var P = T.percusion || 0;
      if (P > 0) {
        if (enCompas === 0 || enCompas === 4 || (P >= 1 && enCompas === 6)) { golpeMus(t0, 0.09, 0.15 * P, 190, "lowpass"); notaMus("triangle", 56, t0, 0.06, 0.05 * P); }
        if (enCompas % 2 === 1) golpeMus(t0, 0.03, 0.05 * P, 6200, "highpass");
      }
      /* URGENTE: el tictac de corcheas encima de todo */
      if (T.tictac && enCompas % 2 === 0) notaMus("square", 880, t0, 0.05, 0.055);
      mus.paso++; mus.prox += paso;
    }
  }
  /* API: acepta los nombres nuevos y los viejos ("propia"→propia_propio) */
  function musicaTema(nombre) {
    if (!musEnsure()) return;
    var id = nombre === "propia" ? "propia_propio" : nombre;
    if (id === mus.base) return;
    var eraPropia = mus.base && mus.base.indexOf("propia") === 0;
    mus.base = id || null;
    /* entre campo propio y rival NO se resetea el compás (el tema CRECE, no cambia) */
    if (!(eraPropia && id && id.indexOf("propia") === 0)) { mus.paso = 0; mus.prox = ctx.currentTime + 0.05; }
    if (mus.base) { vientoOn(); if (!mus.timer) mus.timer = setInterval(programar, 120); }
    else { vientoOff(); if (mus.timer) { clearInterval(mus.timer); mus.timer = null; } }
  }
  /* al cruzar de campo con la pelota, MODULA al mayor relativo y entra el motivo completo */
  function musicaZona(zona) {
    if (!mus.base || mus.base.indexOf("propia") !== 0) return;
    musicaTema(zona === "rival" ? "propia_rival" : "propia_propio");
  }
  function musicaDuck(ms) {
    if (!ctx || !mus.gain) return;
    var t = ctx.currentTime, s = Math.max(0.1, (ms || 500) / 1000);
    mus.gain.gain.cancelScheduledValues(t);
    mus.gain.gain.setValueAtTime(0.0001, t);
    mus.gain.gain.setValueAtTime(0.0001, t + s);
    mus.gain.gain.linearRampToValueAtTime(muted ? 0.0001 : MUSICA.vol, t + s + 0.3);
  }

  var SFX = {
    unlock: unlock,
    setMuted: function (m) {
      muted = !!m;
      if (mus.gain && ctx) { mus.gain.gain.cancelScheduledValues(ctx.currentTime); mus.gain.gain.value = muted ? 0.0001 : MUSICA.vol; }
      persistirMute();
    },
    isMuted: function () { return muted; },
    configurarMusica: configurarMusica,
    musicaTema: musicaTema,
    musicaZona: musicaZona,
    musicaDuck: musicaDuck,
    musicaUrgente: function (on) { mus.urgente = !!on; },

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
