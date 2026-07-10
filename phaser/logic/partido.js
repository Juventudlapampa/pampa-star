/* ============================================================================
   PAMPA STAR · phaser/logic/partido.js — LÓGICA PURA DEL PARTIDO (sin Phaser)
   El partido entero vive acá: mundo lógico 1050×680 (x = avance hacia el arco
   rival, y = lateral), formaciones, movimiento con propósito, reloj a saltos,
   economía de AGUANTE, encuentros, duelos con matriz de ventajas, pases y
   remates. El render (Phaser) solo dibuja este estado y pide acciones.
   Corre en node (tests) y en el browser. Portable a Godot.

   Calibración del playtest (balance.velocidad): el portador va MÁS LENTO que
   el defensor que cierra; perseguir drena aguante y no es infinito.
   El bug del arquero sigue cerrado: el remate usa duel.resolveShot (invariante
   keeperWins ⇔ no-gol) y acá NADA lo pisa.
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory(require("./duel.js"));
  else root.PampaPartido = factory(root.PampaDuel);
})(typeof self !== "undefined" ? self : this, function (Duel) {
  "use strict";

  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var dist = function (ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); };

  /* ---------- creación ---------- */
  function bandas(n, H) {           // reparte n franjas laterales parejas
    var out = [], h = (H - 40) / n;
    for (var i = 0; i < n; i++) out.push([20 + i * h, 20 + (i + 1) * h]);
    return out;
  }

  /* plantel: array de {nombre, pos, stats, esVos?, esAmigo?, vinculo?} ya ordenado
     por slots de la formación (el creador de la escena arma esto con amigos/roster). */
  function crearPartido(opts) {
    var bal = opts.bal, P = bal.partido, W = bal.mundo.ancho, H = bal.mundo.alto;
    var rng = opts.rng || Math.random;

    function armarLado(plantel, esMio) {
      var out = [], slot = 0;
      P.formacion.forEach(function (linea) {
        var bs = bandas(linea.n, H);
        for (var i = 0; i < linea.n; i++) {
          var p = plantel[slot] || {};
          var ax = esMio ? linea.ax : (W - linea.ax);
          var banda = bs[i];
          out.push({
            nombre: p.nombre || (esMio ? "Cantera " + (slot + 1) : "Rival " + (slot + 1)),
            pos: linea.pos,
            stats: p.stats || { pase: 50, tiro: 50, gambeta: 50, velocidad: 50, resistencia: 50, fisico: 50, aereo: 50, caracter: 50 },
            esVos: !!p.esVos, esAmigo: !!p.esAmigo, vinculo: p.vinculo || 0,
            aguante: bal.aguante.max,
            ax: ax, banda: banda,
            x: ax, y: (banda[0] + banda[1]) / 2,
            idle: rng() * 6
          });
          slot++;
        }
      });
      return out;
    }

    var st = {
      bal: bal, W: W, H: H,
      mios: armarLado(opts.mios || [], true),
      rivales: armarLado(opts.rivales || [], false),
      aguanteRival: bal.aguante.max,             // la CPU comparte tanque (pero GASTA, no es infinita)
      rivalKeeperSkill: opts.rivalKeeperSkill != null ? opts.rivalKeeperSkill : bal.duelo.keeper_skill.normal,
      minuto: 0, tiempo: 1,
      /* descuento OCULTO e impredecible por tiempo (doc §6: nadie sabe cuándo pita) */
      desc1: P.descuento_min + Math.floor(rng() * (P.descuento_max - P.descuento_min + 1)),
      desc2: P.descuento_min + Math.floor(rng() * (P.descuento_max - P.descuento_min + 1)),
      golesMio: 0, golesRival: 0,
      posesion: "mia", modo: "juego",
      ctrl: idxDelVos(null), pelota: { x: W / 2, y: H / 2 },
      portadorRival: 0,
      cooldown: 0, _t: 0
    };
    // el 9 (VOS o el primero ATA) arranca con la pelota
    st.ctrl = st.mios.findIndex(function (j) { return j.esVos; });
    if (st.ctrl < 0) st.ctrl = st.mios.findIndex(function (j) { return j.pos === "ATA"; });
    kickoff(st, "mia");
    return st;
  }
  function idxDelVos() { return 0; }

  /* ---------- saques y reposicionamiento ---------- */
  function kickoff(st, quien) {
    var W = st.W, H = st.H;
    st.posesion = quien; st.modo = "juego"; st.cooldown = 1200;
    st.mios.forEach(function (j) { j.x = j.ax; j.y = (j.banda[0] + j.banda[1]) / 2; });
    st.rivales.forEach(function (j) { j.x = j.ax; j.y = (j.banda[0] + j.banda[1]) / 2; });
    if (quien === "mia") {
      st.ctrl = st.mios.findIndex(function (j) { return j.esVos; });
      if (st.ctrl < 0) st.ctrl = st.mios.length - 2;
      st.mios[st.ctrl].x = W / 2 - 20; st.mios[st.ctrl].y = H / 2;
      st.pelota.x = W / 2 - 12; st.pelota.y = H / 2;
    } else {
      st.portadorRival = st.rivales.length - 2;      // un ATA rival
      st.rivales[st.portadorRival].x = W / 2 + 20; st.rivales[st.portadorRival].y = H / 2;
      st.ctrl = masCercanoAPelota(st);
      st.pelota.x = W / 2 + 12; st.pelota.y = H / 2;
    }
  }
  function masCercanoAPelota(st) {
    var mejor = 0, md = 1e9;
    st.mios.forEach(function (j, i) {
      if (j.pos === "ARQ") return;
      var d = dist(j.x, j.y, st.pelota.x, st.pelota.y);
      if (d < md) { md = d; mejor = i; }
    });
    return mejor;
  }

  /* ---------- el TICK del modo juego ---------- */
  function tick(st, dtMs, input) {
    if (st.modo !== "juego") return [];
    var ev = [], dt = dtMs / 1000, bal = st.bal, V = bal.velocidad, P = bal.partido;
    st._t += dtMs;
    if (st.cooldown > 0) st.cooldown = Math.max(0, st.cooldown - dtMs);

    /* reloj: corre en tiempo real solo acá (menús y cine lo congelan) */
    st.minuto += dt / P.seg_por_minuto;
    var limite = (st.tiempo === 1 ? 45 + st.desc1 : 90 + st.desc2);
    if (st.minuto >= limite) { ev.push({ tipo: st.tiempo === 1 ? "entretiempo" : "final" }); st.modo = "congelado"; return ev; }

    var ctrl = st.mios[st.ctrl];

    /* --- tu jugador controlado --- */
    if (input && (input.dx || input.dy)) {
      var m = Math.hypot(input.dx, input.dy) || 1;
      var vel, drena = 0;
      if (st.posesion === "mia") { vel = V.portador_con_pelota; drena = bal.conduccion.aguante_por_segundo; }
      else {
        vel = V.perseguidor_sin_pelota; drena = bal.persecucion.aguante_por_segundo;
        if (ctrl.aguante < bal.persecucion.aguante_minimo_para_correr) vel *= bal.persecucion.factor_trote;   // rendido: trota
      }
      ctrl.aguante = clamp(ctrl.aguante - drena * dt, 0, bal.aguante.max);
      ctrl.x = clamp(ctrl.x + input.dx / m * vel * dt, 14, st.W - 14);
      ctrl.y = clamp(ctrl.y + input.dy / m * vel * dt, 14, st.H - 14);
    }

    /* --- posicionales de ambos lados (escenografía viva, elástica a la pelota) --- */
    var empuje = (st.pelota.x - st.W / 2);
    function moverPosicional(j, esMio, i) {
      var el = P.elasticidad[j.pos] != null ? P.elasticidad[j.pos] : 0.4;
      var tx = clamp(j.ax + empuje * el * (esMio ? 1 : 1), 20, st.W - 20);
      var ty = clamp(st.pelota.y, j.banda[0], j.banda[1]) + Math.sin(st._t * 0.003 + j.idle) * 3;
      var v = V.posicionales_por_segundo || 90;
      j.x += clamp(tx - j.x, -v * dt, v * dt);
      j.y += clamp(ty - j.y, -v * dt, v * dt);
    }
    st.mios.forEach(function (j, i) { if (i !== st.ctrl) moverPosicional(j, true, i); });

    if (st.posesion === "mia") {
      /* la pelota va con tu portador */
      st.pelota.x += (ctrl.x + 12 - st.pelota.x) * Math.min(1, dt * 10);
      st.pelota.y += (ctrl.y - st.pelota.y) * Math.min(1, dt * 10);
      /* los N rivales más cercanos te CIERRAN (más rápidos que vos: te alcanzan) */
      var caza = st.rivales.map(function (j, i) { return { i: i, d: dist(j.x, j.y, ctrl.x, ctrl.y) }; })
        .filter(function (o) { return st.rivales[o.i].pos !== "ARQ"; })
        .sort(function (a, b) { return a.d - b.d; }).slice(0, P.cpu_persecutores);
      st.rivales.forEach(function (j, i) {
        var esCaza = caza.some(function (o) { return o.i === i; });
        if (esCaza) {
          var d = dist(j.x, j.y, ctrl.x, ctrl.y) || 1;
          var v = V.defensor_cerrando * dt;
          j.x += (ctrl.x - j.x) / d * Math.min(v, d);
          j.y += (ctrl.y - j.y) / d * Math.min(v, d);
        } else moverPosicional(j, false, i);
      });
      /* encuentro: te salieron al cruce */
      if (st.cooldown === 0) {
        for (var k = 0; k < caza.length; k++) {
          if (caza[k].d < bal.conduccion.radio_encuentro) {
            st.modo = "congelado";
            ev.push({ tipo: "encuentro", rivalIdx: caza[k].i });
            return ev;
          }
        }
      }
    } else {
      /* la CPU ataca: su portador avanza hacia TU arco (x → 0) */
      var pr = st.rivales[st.portadorRival];
      pr.x = clamp(pr.x - V.rival_con_pelota * dt, 20, st.W - 20);
      pr.y = clamp(pr.y + Math.sin(pr.x * 0.02) * 26 * dt, 20, st.H - 20);
      st.pelota.x += (pr.x - 12 - st.pelota.x) * Math.min(1, dt * 10);
      st.pelota.y += (pr.y - st.pelota.y) * Math.min(1, dt * 10);
      st.rivales.forEach(function (j, i) { if (i !== st.portadorRival) moverPosicional(j, false, i); });
      /* encuentro defensivo: TU marcador lo alcanzó */
      if (st.cooldown === 0 && dist(ctrl.x, ctrl.y, pr.x, pr.y) < bal.conduccion.radio_encuentro) {
        st.modo = "congelado";
        ev.push({ tipo: "encuentroDef" });
        return ev;
      }
      /* llegó a tu área: remata */
      if (pr.x < P.dist_remate_rival) {
        st.modo = "congelado";
        ev.push({ tipo: "rivalTira" });
        return ev;
      }
    }
    return ev;
  }

  /* ---------- reloj a saltos ---------- */
  function saltoReloj(st, rng) {
    rng = rng || Math.random;
    var P = st.bal.partido;
    st.minuto += P.salto_accion_min + rng() * (P.salto_accion_max - P.salto_accion_min);
  }
  /* tras un salto, ¿pitó? (para que el árbitro pueda cortar después de una acción) */
  function chequearTiempo(st) {
    var limite = (st.tiempo === 1 ? 45 + st.desc1 : 90 + st.desc2);
    if (st.minuto >= limite) return st.tiempo === 1 ? "entretiempo" : "final";
    return null;
  }
  function entretiempo(st) {
    st.tiempo = 2; st.minuto = 45;
    var rec = st.bal.aguante.max * st.bal.aguante.recuperacion_entretiempo_frac;
    st.mios.forEach(function (j) { j.aguante = clamp(j.aguante + rec, 0, st.bal.aguante.max); });
    st.aguanteRival = clamp(st.aguanteRival + rec, 0, st.bal.aguante.max);
    kickoff(st, "rival");   // el segundo tiempo lo saca el rival
  }

  /* ---------- aguante ---------- */
  function poderRival(st) {    // la fuerza de la CPU cae con su tanque (no energía infinita)
    var base = 52;
    return base * (0.86 + 0.14 * clamp(st.aguanteRival, 0, 100) / 100);
  }
  function gastar(st, quien, costo) {
    if (quien === "rival") st.aguanteRival = clamp(st.aguanteRival - costo * st.bal.aguante.cpu_factor_costo, 0, st.bal.aguante.max);
    else { var j = st.mios[st.ctrl]; j.aguante = clamp(j.aguante - costo, 0, st.bal.aguante.max); }
  }
  function rendido(st) { return st.mios[st.ctrl].aguante < st.bal.aguante.umbral_rendido; }

  /* ---------- menús de encuentro (por rol) ---------- */
  function statCtrl(st, k) { return st.mios[st.ctrl].stats[k] || 45; }
  function bonusAguante(st) { var a = st.mios[st.ctrl].aguante; return (a - 50) * 0.08; }

  function accionesAtaque(st) {
    var A = st.bal.aguante, puedeT = puedeTirar(st), rend = rendido(st);
    var acc = [
      { id: "gambeta", n: "GAMBETA", ico: "🌀", costo: A.costo_gambeta, poder: statCtrl(st, "gambeta"), bloqueada: rend },
      { id: "pase", n: "PASE ▸", ico: "➡️", costo: A.costo_pase, poder: statCtrl(st, "pase"), bloqueada: false, submenu: true },
      { id: "pared", n: "PARED (1-2)", ico: "🔁", costo: A.costo_pared, poder: statCtrl(st, "pase") * 0.8 + mejorVinculo(st) * 0.2, bloqueada: rend || !hayCompaCerca(st) },
      { id: "tiro", n: "TIRO", ico: "🎯", costo: A.costo_tiro, poder: statCtrl(st, "tiro"), bloqueada: rend || !puedeT, motivo: !puedeT ? "LEJOS DEL ARCO" : (rend ? "SIN AGUANTE" : null) }
    ];
    if (rend) acc.forEach(function (a) { if (a.id !== "pase") { a.bloqueada = true; a.motivo = "SIN AGUANTE"; } });
    return acc;
  }
  function accionesDefensa(st) {
    var A = st.bal.aguante, rend = rendido(st);
    return [
      { id: "quite", n: "QUITE", ico: "🦵", costo: A.costo_quite, poder: statCtrl(st, "fisico"), bloqueada: rend, motivo: rend ? "SIN AGUANTE" : null },
      { id: "corte", n: "CORTE DE PASE", ico: "✂️", costo: A.costo_corte, poder: statCtrl(st, "velocidad"), bloqueada: false },
      { id: "bloqueo", n: "BLOQUEO", ico: "🧱", costo: A.costo_bloqueo, poder: statCtrl(st, "fisico") * 0.55 + statCtrl(st, "aereo") * 0.45, bloqueada: rend, motivo: rend ? "SIN AGUANTE" : null }
    ];
  }
  function hayCompaCerca(st) {
    var c = st.mios[st.ctrl];
    return st.mios.some(function (j, i) { return i !== st.ctrl && j.pos !== "ARQ" && dist(j.x, j.y, c.x, c.y) < 200; });
  }
  function mejorVinculo(st) {
    var v = 0; st.mios.forEach(function (j) { if (j.esAmigo && j.vinculo > v) v = j.vinculo; });
    return v;
  }

  /* la CPU elige su intención OCULTA (con pesos): la adivinanza es el juego mental */
  function eleccionCPU(st, rng) {
    rng = rng || Math.random;
    var pesos = st.bal.partido.cpu_pesos, r = rng(), acc = 0;
    var claves = Object.keys(pesos);
    for (var i = 0; i < claves.length; i++) { acc += pesos[claves[i]]; if (r < acc) return claves[i]; }
    return claves[claves.length - 1];
  }

  /* MATRIZ DE VENTAJAS: quite>gambeta · corte>pase(y pared) · bloqueo>tiro */
  var CONTRA = { gambeta: "quite", pase: "corte", pared: "corte", tiro: "bloqueo" };

  /* duelo del encuentro (ataque MÍO vs defensa CPU, o al revés) */
  function resolverDuelo(st, opts) {
    var rng = opts.rng || Math.random, bal = st.bal, B = bal.partido.matriz_bonus;
    var win, accionRival, matriz;
    if (st.posesion === "mia") {
      accionRival = eleccionCPU(st, rng);
      var atk = (opts.poder != null ? opts.poder : statCtrl(st, opts.accion === "tiro" ? "tiro" : opts.accion === "gambeta" ? "gambeta" : "pase")) + bonusAguante(st);
      var def = poderRival(st);
      if (CONTRA[opts.accion] === accionRival) { def += B; matriz = "leyeron"; }   // te adivinaron
      else { atk += B * 0.6; matriz = "zafaste"; }                                  // esquivaste la marca equivocada
      gastar(st, "mio", opts.costo || 0); gastar(st, "rival", (bal.aguante["costo_" + accionRival] || 6));
      win = rng() < Duel.duelChance(atk, def, bal.duelo);
    } else {
      /* defiendo: la CPU "ataca" con intención oculta */
      accionRival = ["gambeta", "pase", "tiro"][Math.floor(rng() * 3)];
      var defMio = (opts.poder != null ? opts.poder : 50) + bonusAguante(st);
      var atkRiv = poderRival(st) + 4;
      if (CONTRA[accionRival] === opts.accion) { defMio += B; matriz = "leiste"; }  // le adivinaste la intención
      else { atkRiv += B * 0.6; matriz = "teEngano"; }
      gastar(st, "mio", opts.costo || 0); gastar(st, "rival", (bal.aguante["costo_" + accionRival] || 6));
      win = rng() < Duel.duelChance(defMio, atkRiv, bal.duelo);
    }
    saltoReloj(st, rng);
    return { win: win, accionRival: accionRival, matriz: matriz };
  }

  /* efectos de mundo tras el duelo de ataque */
  function ganarAtaque(st, accion) {
    var c = st.mios[st.ctrl];
    c.x = clamp(c.x + (accion === "pared" ? 60 : accion === "gambeta" ? 46 : 30), 14, st.W - 14);
    st.cooldown = 1400; st.modo = "juego";
  }
  function perderPelota(st, rng) {
    rng = rng || Math.random;
    st.posesion = "rival"; st.modo = "juego"; st.cooldown = 1400;
    /* el rival más cercano se la lleva */
    var c = st.mios[st.ctrl], mejor = 0, md = 1e9;
    st.rivales.forEach(function (j, i) { if (j.pos === "ARQ") return; var d = dist(j.x, j.y, c.x, c.y); if (d < md) { md = d; mejor = i; } });
    st.portadorRival = mejor;
    st.ctrl = masCercanoAPelota(st);
  }
  function ganarDefensa(st) {
    st.posesion = "mia"; st.modo = "juego"; st.cooldown = 1400;
    /* recuperaste: seguís con el que marcó */
    st.pelota.x = st.mios[st.ctrl].x + 12; st.pelota.y = st.mios[st.ctrl].y;
  }
  function perderDefensa(st) {
    var pr = st.rivales[st.portadorRival];
    pr.x = clamp(pr.x - 60, 20, st.W - 20);   // te dejó atrás: gana metros
    st.modo = "juego"; st.cooldown = 1400;
  }

  /* ---------- pases ---------- */
  function receptoresPase(st) {
    var bal = st.bal, c = st.mios[st.ctrl], out = [];
    st.mios.forEach(function (j, i) {
      if (i === st.ctrl || j.pos === "ARQ") return;
      var d = dist(j.x, j.y, c.x, c.y);
      if (d > bal.partido.pase_radio) return;
      /* riesgo: rival cerca de la línea de pase */
      var riesgo = 0;
      st.rivales.forEach(function (r) {
        if (r.pos === "ARQ") return;
        var t = clamp(((r.x - c.x) * (j.x - c.x) + (r.y - c.y) * (j.y - c.y)) / (d * d || 1), 0, 1);
        var px = c.x + (j.x - c.x) * t, py = c.y + (j.y - c.y) * t;
        var dr = dist(r.x, r.y, px, py);
        if (dr < 60) riesgo = Math.max(riesgo, (60 - dr) * 0.5);
      });
      var pct = 68 + (statCtrl(st, "pase") - 50) * 0.5 + ((j.stats.pase || 50) - 50) * 0.2 + (j.vinculo || 0) * 0.12 - riesgo;
      if (d > 200) pct -= (d - 200) * bal.partido.pase_penal_lejano;
      out.push({ idx: i, nombre: j.nombre, pos: j.pos, adelante: j.x > c.x + 20, pct: clamp(Math.round(pct), 15, 95), d: Math.round(d) });
    });
    out.sort(function (a, b) { return b.pct + (b.adelante ? 6 : 0) - (a.pct + (a.adelante ? 6 : 0)); });
    return out.slice(0, 4);
  }
  function resolverPase(st, receptorIdx, pct, rng) {
    rng = rng || Math.random;
    gastar(st, "mio", st.bal.aguante.costo_pase);
    saltoReloj(st, rng);
    var win = rng() * 100 < pct;
    if (win) {
      st.ctrl = receptorIdx;                       // el control VIAJA con el pase
      var r = st.mios[receptorIdx];
      st.pelota.x = r.x + 12; st.pelota.y = r.y;
      st.cooldown = 1200; st.modo = "juego";
    } else {
      perderPelota(st, rng);
    }
    return { win: win };
  }

  /* ---------- tiro / Caldén ---------- */
  function puedeTirar(st) {
    return st.posesion === "mia" && st.mios[st.ctrl].x > st.W - st.bal.partido.dist_tiro;
  }
  function puedeCalden(st) {
    var C = st.bal.partido.calden, j = st.mios[st.ctrl];
    return st.posesion === "mia" && j.esVos && j.x > C.x_min && j.aguante >= st.bal.aguante.costo_calden;
  }
  /* parámetros del remate (la ESCENA llama a Duel.resolveShot con esto: una sola fuente de verdad).
     El salto de reloj del remate vive ACÁ (lógica), no en la escena. */
  function prepararRemate(st, esCalden, rng) {
    var j = st.mios[st.ctrl], C = st.bal.partido.calden;
    var poder = (j.stats.tiro || 50) + (j.stats.caracter || 50) * 0.12 + bonusAguante(st);
    if (esCalden) poder *= C.mult;
    gastar(st, "mio", esCalden ? st.bal.aguante.costo_calden : st.bal.aguante.costo_tiro);
    saltoReloj(st, rng);
    return { shotPower: poder, keeperSkill: st.rivalKeeperSkill };
  }
  function golMio(st) { st.golesMio++; kickoff(st, "rival"); }
  function tiroFallado(st, rng) { perderPelota(st, rng); st.cooldown = 1800; }

  /* ---------- el remate RIVAL contra tu arquero ---------- */
  function opcionesArquero(st) {
    var arq = st.mios.find(function (j) { return j.pos === "ARQ"; }) || { stats: {} };
    var base = (arq.stats.fisico || 50) * 0.7 + (arq.stats.caracter || 50) * 0.4;
    return [
      { id: "atajar", n: "ATAJAR", ico: "🧤", poder: base, riesgo: "retiene, más difícil" },
      { id: "despejar", n: "DESPEJAR", ico: "👊", poder: base + 8, riesgo: "más seguro · pelota dividida" }
    ];
  }
  function resolverAtajada(st, eleccion, rng) {
    rng = rng || Math.random;
    var ops = opcionesArquero(st);
    var op = ops.find(function (o) { return o.id === eleccion; }) || ops[0];
    var atkRiv = poderRival(st) + 12;
    gastar(st, "rival", st.bal.aguante.costo_tiro);
    saltoReloj(st, rng);
    var ataja = rng() < Duel.duelChance(op.poder, atkRiv, st.bal.duelo);
    if (!ataja) { st.golesRival++; kickoff(st, "mia"); return { golRival: true, eleccion: eleccion }; }
    if (eleccion === "despejar") {
      /* dividida al medio: 50/50 */
      var mia = rng() < 0.5;
      if (mia) { st.posesion = "mia"; st.ctrl = masCercanoAPelota(st); st.pelota.x = st.W / 2; st.pelota.y = st.H / 2; st.modo = "juego"; st.cooldown = 1400; reubicar(st); }
      else { st.posesion = "rival"; st.portadorRival = st.rivales.length - 2; st.rivales[st.portadorRival].x = st.W / 2; st.rivales[st.portadorRival].y = st.H / 2; st.pelota.x = st.W / 2; st.pelota.y = st.H / 2; st.ctrl = masCercanoAPelota(st); st.modo = "juego"; st.cooldown = 1400; }   // auto-switch: marcás con el más cercano a la dividida
      return { golRival: false, dividida: true, mia: mia, eleccion: eleccion };
    }
    /* atajó y retiene: salís jugando desde tu área */
    st.posesion = "mia";
    st.ctrl = st.mios.findIndex(function (j) { return j.pos === "DEF"; });
    var d0 = st.mios[st.ctrl]; d0.x = 200; d0.y = st.H / 2;
    st.pelota.x = 212; st.pelota.y = st.H / 2;
    st.modo = "juego"; st.cooldown = 1600;
    return { golRival: false, retiene: true, eleccion: eleccion };
  }
  function reubicar(st) {
    var c = st.mios[st.ctrl]; c.x = st.W / 2 - 14; c.y = st.H / 2;
  }

  /* ---------- cambio de jugador (defensa) ---------- */
  function cambiarA(st, idx) {
    if (st.posesion !== "rival") return false;
    if (idx < 0 || idx >= st.mios.length || st.mios[idx].pos === "ARQ") return false;
    st.ctrl = idx; return true;
  }
  function cambiarAlMasCercano(st) { if (st.posesion === "rival") st.ctrl = masCercanoAPelota(st); }

  return {
    crearPartido: crearPartido, tick: tick, kickoff: kickoff,
    saltoReloj: saltoReloj, chequearTiempo: chequearTiempo, entretiempo: entretiempo,
    accionesAtaque: accionesAtaque, accionesDefensa: accionesDefensa,
    resolverDuelo: resolverDuelo, ganarAtaque: ganarAtaque, perderPelota: perderPelota,
    ganarDefensa: ganarDefensa, perderDefensa: perderDefensa,
    receptoresPase: receptoresPase, resolverPase: resolverPase,
    puedeTirar: puedeTirar, puedeCalden: puedeCalden, prepararRemate: prepararRemate,
    golMio: golMio, tiroFallado: tiroFallado,
    opcionesArquero: opcionesArquero, resolverAtajada: resolverAtajada,
    cambiarA: cambiarA, cambiarAlMasCercano: cambiarAlMasCercano,
    poderRival: poderRival, rendido: rendido, masCercanoAPelota: masCercanoAPelota
  };
});
