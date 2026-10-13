/* ============================================================================
   PAMPA STAR — Módulo de audio (chiptune ORIGINAL sintetizado con WebAudio)
   Composiciones y efectos propios, sin samples de terceros.
   - SFX: menú, encuentro, ganar/perder duelo, patada, gol, atajada, silbato, pasos.
   - Música: dos loops (posesión / minutos finales), secuenciados en vivo.
   - Volumen + mute persistidos. Desbloqueo con el primer toque (celu).
   ========================================================================== */
"use strict";
var PSAUDIO = (function(){
  const PREF_KEY = "pampa_star_audio";
  let ctx=null, master=null, sfxBus=null, musicBus=null;
  let prefs = {vol:0.6, muted:false};
  try{ const p=JSON.parse(localStorage.getItem(PREF_KEY)||"null"); if(p&&typeof p==="object") prefs=Object.assign(prefs,p); }catch(e){}
  function savePrefs(){ try{ localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); }catch(e){} }

  function ensure(){
    if(ctx) return ctx;
    const AC = window.AudioContext||window.webkitAudioContext;
    if(!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value=0.9; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value=0.3; musicBus.connect(master);
    applyVol();
    return ctx;
  }
  function applyVol(){ if(master) master.gain.value = prefs.muted ? 0 : prefs.vol; }
  function unlock(){ if(!ensure()) return; if(ctx.state==="suspended") ctx.resume(); }

  /* ---------- síntesis básica ---------- */
  function tone(freq, dur, type, when, gain, slide){
    if(!ensure() || prefs.muted) return;
    const t = ctx.currentTime + (when||0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type||"square"; o.frequency.setValueAtTime(freq, t);
    if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide), t+dur);
    g.gain.setValueAtTime(gain!=null?gain:0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t+dur);
    o.connect(g); g.connect(sfxBus);
    o.start(t); o.stop(t+dur+0.02);
  }
  function noise(dur, when, gain){
    if(!ensure() || prefs.muted) return;
    const t = ctx.currentTime + (when||0);
    const n = Math.floor(ctx.sampleRate*dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0;i<n;i++) d[i] = (Math.random()*2-1)*(1-i/n);
    const src = ctx.createBufferSource(); src.buffer=buf;
    const g = ctx.createGain(); g.gain.value=gain!=null?gain:0.2;
    src.connect(g); g.connect(sfxBus); src.start(t);
  }

  /* ---------- SFX ---------- */
  const sfx = {
    menu(){ tone(880,0.05,"square",0,0.1); },
    sting(){ tone(196,0.16,"square",0,0.18); tone(147,0.22,"square",0.09,0.18); },        // encuentro
    win(){ tone(523,0.09,"square",0,0.14); tone(659,0.09,"square",0.08,0.14); tone(784,0.14,"square",0.16,0.16); },
    lose(){ tone(392,0.1,"square",0,0.14); tone(311,0.1,"square",0.09,0.14); tone(233,0.18,"square",0.18,0.15); },
    kick(){ noise(0.07,0,0.28); tone(160,0.08,"triangle",0,0.3,-60); },
    goal(){ [523,659,784,1046].forEach((f,i)=>tone(f,0.12,"square",i*0.09,0.17)); noise(0.6,0.35,0.10); },
    save(){ noise(0.05,0,0.22); tone(120,0.12,"triangle",0.02,0.26); },
    golRival(){ tone(233,0.16,"square",0,0.17); tone(175,0.3,"square",0.13,0.17); },
    whistle(n){ for(let i=0;i<(n||1);i++){ tone(2300,0.22,"square",i*0.3,0.12,-250); } },
    paso(){ tone(190,0.025,"triangle",0,0.05); },
    especial(){ tone(660,0.08,"sawtooth",0,0.15); tone(880,0.1,"sawtooth",0.07,0.15); noise(0.25,0.05,0.12); },
  };

  /* ---------- música: dos loops originales (secuenciador con lookahead) ----------
     Notas MIDI (null = silencio). "posesion": aire pampeano tranquilo.
     "final": minutos finales, más urgente. */
  const LOOPS = {
    posesion:{ bpm:104,
      bass:[45,null,40,null,45,null,43,null,41,null,48,null,43,null,40,null],
      lead:[69,72,76,null,67,69,null,76,74,72,69,null,72,74,76,null] },
    final:{ bpm:138,
      bass:[45,45,null,45,48,48,null,48,50,50,null,50,52,null,43,null],
      lead:[76,null,76,74,72,null,69,72,74,null,74,76,null,81,79,76] },
  };
  const mfreq = m => 440*Math.pow(2,(m-69)/12);
  let mus = {timer:null, cual:null, step:0, next:0};
  function scheduleNote(midi, t, dur, type, gain){
    if(midi==null) return;
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.type=type; o.frequency.value=mfreq(midi);
    g.gain.setValueAtTime(gain,t); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t+dur+0.02);
  }
  function musicPlay(cual){
    if(!ensure()) return;
    if(mus.cual===cual && mus.timer) return;
    musicStop();
    mus.cual=cual; mus.step=0; mus.next=ctx.currentTime+0.06;
    const L=LOOPS[cual]; if(!L) return;
    const stepDur = 60/L.bpm/2; // corcheas
    mus.timer=setInterval(()=>{
      if(prefs.muted){ return; }
      if(mus.next < ctx.currentTime) mus.next = ctx.currentTime + 0.02;  // no acumular atraso (mute o pestaña en background): evita ráfaga de notas al reengancharse
      while(mus.next < ctx.currentTime+0.18){
        const i=mus.step%16;
        scheduleNote(L.bass[i], mus.next, stepDur*0.95, "triangle", 0.20);
        scheduleNote(L.lead[i], mus.next, stepDur*0.85, "square", 0.07);
        mus.next+=stepDur; mus.step++;
      }
    }, 60);
  }
  function musicStop(){ if(mus.timer){ clearInterval(mus.timer); mus.timer=null; } mus.cual=null; }

  /* ---------- API ---------- */
  return {
    unlock, sfx,
    music:{ play:musicPlay, stop:musicStop, actual:()=>mus.cual },
    setVolume(v){ prefs.vol=Math.max(0,Math.min(1,v)); savePrefs(); applyVol(); },
    getVolume(){ return prefs.vol; },
    toggleMute(){ prefs.muted=!prefs.muted; savePrefs(); applyVol(); return prefs.muted; },
    isMuted(){ return prefs.muted; },
  };
})();
