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

  var SFX = {
    unlock: unlock,
    setMuted: function (m) { muted = !!m; },
    isMuted: function () { return muted; },

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
    goal: function () { var c = ensure(); if (!c) return; var t = now(); var notes = [392, 523, 659, 784]; for (var i = 0; i < notes.length; i++) tone("square", notes[i], notes[i], t + i * 0.09, 0.16, 0.16); noise(t, 0.5, 0.10, 1400, 0.6, "bandpass"); },
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
    /* gol EN CONTRA: mismas notas del festejo pero CAYENDO (el oído distingue el lado) */
    golEnContra: function () {
      var c = ensure(); if (!c) return; var t = now();
      var notes = [784, 659, 523, 392];
      for (var i = 0; i < notes.length; i++) tone("square", notes[i], notes[i], t + i * 0.09, 0.16, 0.13);
    }
  };
  return SFX;
});
