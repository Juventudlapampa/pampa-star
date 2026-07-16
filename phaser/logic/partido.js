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
            look: p.look || null,               // el avatar por capas (Bloque C) viaja con el plantel
            numero: slot + 1,                   // camiseta 1-11 por orden de formación (radar v2)

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
      desc1: bal.ritmo.descuento_min + Math.floor(rng() * (bal.ritmo.descuento_max - bal.ritmo.descuento_min + 1)),
      desc2: bal.ritmo.descuento_min + Math.floor(rng() * (bal.ritmo.descuento_max - bal.ritmo.descuento_min + 1)),
      golesMio: 0, golesRival: 0,
      envion: 0, _envionHasta: 0,               // V6 §2 R3: mérito acumulado (0..envion.max)
      posesion: "mia", modo: "juego",
      ctrl: idxDelVos(null), pelota: { x: W / 2, y: H / 2 },
      portadorRival: 0,
      cooldown: 0, esperaRival: 0, _t: 0
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
    st.posesion = quien; st.modo = "juego"; st.cooldown = st.bal.ritmo.cooldown_encuentro_ms;
    /* Feel B2: como arranca el fútbol — CADA equipo EN SU MITAD, en su formación.
       Nadie empieza en campo rival (los ATA se paran al borde del círculo central). */
    st.mios.forEach(function (j) { j.x = Math.min(j.ax, W / 2 - 40); j.y = (j.banda[0] + j.banda[1]) / 2; });
    st.rivales.forEach(function (j) { j.x = Math.max(j.ax, W / 2 + 40); j.y = (j.banda[0] + j.banda[1]) / 2; });
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
      st.esperaRival = st.bal.ritmo.arranque_rival_ms;   // la pisa un momento: tenés tiempo de reaccionar
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

  /* V6 §2 R1: MODELO DE SALTOS — el partido es una sucesión de MOMENTOS.
     Con modo_saltos, el portador va rápido y esquemático (no hay carrera que
     valga: al rival con pelota no lo alcanzás por atrás, lo ANTICIPÁS). */
  function esSaltos(bal) { return !!(bal.ritmo && bal.ritmo.modo_saltos); }

  /* reloj continuo (solo entre momentos): con el reloj a saltos de R4 el
     goteo es lento — el grueso del tiempo lo ponen los BLOQUES por momento */
  function segPorMinuto(bal) {
    if (bal.tempo && bal.tempo.minutos_por_momento > 0) return bal.tempo.goteo_seg_por_minuto || 8;
    if (bal.tempo && bal.tempo.duracion_real_min > 0) return (bal.tempo.duracion_real_min * 60) / 90;
    return bal.ritmo.seg_por_minuto;
  }

  /* ANIME v4 Bloque A: el mejor MARCADOR es el más cercano a la pelota con
     preferencia por el que está ENTRE la pelota y tu arco (x=0).
     V6 §1 F4: EXCLUYENDO al que acaba de perderla (queda fuera de la jugada). */
  function scoreMarcador(st, i) {
    var j = st.mios[i];
    if (!j || j.pos === "ARQ") return 1e9;
    var d = dist(j.x, j.y, st.pelota.x, st.pelota.y);
    return j.x < st.pelota.x ? d * 0.72 : d;   // bien parado (entre pelota y arco) pesa menos
  }
  function mejorMarcador(st, excluir) {
    var mejor = -1, ms = 1e9;
    st.mios.forEach(function (j, i) {
      if (excluir != null && i === excluir) return;
      var s = scoreMarcador(st, i);
      if (s < ms) { ms = s; mejor = i; }
    });
    return mejor;
  }

  /* ---------- el TICK del modo juego ---------- */
  function tick(st, dtMs, input) {
    if (st.modo !== "juego") return [];
    var ev = [], dt = dtMs / 1000, bal = st.bal, V = bal.ritmo, P = bal.partido, R = bal.ritmo;
    st._t += dtMs;
    if (st.cooldown > 0) st.cooldown = Math.max(0, st.cooldown - dtMs);

    /* reloj: corre en tiempo real solo acá (menús y cine lo congelan) */
    st.minuto += dt / segPorMinuto(bal);
    var limite = (st.tiempo === 1 ? 45 + st.desc1 : 90 + st.desc2);
    if (st.minuto >= limite) { ev.push({ tipo: st.tiempo === 1 ? "entretiempo" : "final" }); st.modo = "congelado"; return ev; }

    var ctrl = st.mios[st.ctrl];

    /* --- tu jugador controlado --- */
    if (input && (input.dx || input.dy)) {
      var m = Math.hypot(input.dx, input.dy) || 1;
      var vel, drena = 0;
      /* R1: en modo saltos el desplazamiento CON pelota es rápido y esquemático.
         El marcador SIN pelota NO escala: al rival no lo alcanzás corriendo —
         lo anticipás (test de corrección del §0: si podés perseguir, está mal). */
      var multSaltos = esSaltos(bal) ? (V.saltos_vel_mult || 2.4) : 1;
      if (st.posesion === "mia") { vel = V.portador_con_pelota * multSaltos; drena = bal.conduccion.aguante_por_segundo; }
      else {
        vel = V.perseguidor_sin_pelota; drena = bal.persecucion.aguante_por_segundo;
        if (ctrl.aguante < bal.persecucion.aguante_minimo_para_correr) vel *= bal.persecucion.factor_trote;   // rendido: trota
      }
      ctrl.aguante = clamp(ctrl.aguante - drena * dt, 0, bal.aguante.max);
      ctrl.x = clamp(ctrl.x + input.dx / m * vel * dt, 14, st.W - 14);
      ctrl.y = clamp(ctrl.y + input.dy / m * vel * dt, 14, st.H - 14);
    }
    /* v2 §7: recuperación SIN pelota (~2 aguante/10s) — el que no conduce ni marca, respira.
       El tanque rival también (si no, muere al minuto 25 y el partido pierde dinámica). */
    var regen = bal.aguante.recuperacion_por_segundo || 0;
    if (regen) {
      st.mios.forEach(function (j, i) {
        var conduce = st.posesion === "mia" && i === st.ctrl;
        var marca = st.posesion === "rival" && i === st.ctrl;
        if (!conduce && !marca) j.aguante = clamp(j.aguante + regen * dt, 0, bal.aguante.max);
      });
      st.aguanteRival = clamp(st.aguanteRival + regen * dt, 0, bal.aguante.max);
    }

    /* --- posicionales de ambos lados (escenografía viva, elástica a la pelota) --- */
    var empuje = (st.pelota.x - st.W / 2);
    function moverPosicional(j, esMio, i) {
      var el = P.elasticidad[j.pos] != null ? P.elasticidad[j.pos] : 0.4;
      var tx = clamp(j.ax + empuje * el * (esMio ? 1 : 1), 20, st.W - 20);
      var ty = clamp(st.pelota.y, j.banda[0], j.banda[1]) + Math.sin(st._t * 0.003 + j.idle) * 3;
      var v = V.posicionales_por_segundo || 55;
      j.x += clamp(tx - j.x, -v * dt, v * dt);
      j.y += clamp(ty - j.y, -v * dt, v * dt);
    }
    st.mios.forEach(function (j, i) { if (i !== st.ctrl) moverPosicional(j, true, i); });

    if (st.posesion === "mia") {
      /* la pelota va con tu portador */
      st.pelota.x += (ctrl.x + 12 - st.pelota.x) * Math.min(1, dt * 10);
      st.pelota.y += (ctrl.y - st.pelota.y) * Math.min(1, dt * 10);
      /* los N rivales más cercanos te CIERRAN (más rápidos que vos: te alcanzan) */
      /* R1: en modo saltos NADIE te corre por atrás — te CORTAN EL PASO los que
         están adelante (entre vos y el arco rival). El cruce es emboscada, no carrera. */
      var caza = st.rivales.map(function (j, i) { return { i: i, d: dist(j.x, j.y, ctrl.x, ctrl.y) }; })
        .filter(function (o) {
          var r = st.rivales[o.i];
          if (r.pos === "ARQ") return false;
          if (esSaltos(bal) && r.x < ctrl.x - 40) return false;   // quedó atrás: fuera de la jugada
          return true;
        })
        .sort(function (a, b) { return a.d - b.d; }).slice(0, R.persecutores);
      /* V6 §1 F5: la defensa MARCA — cada receptor tuyo adelantado tiene un rival
         encima cerrándole la línea (el libre más cercano), no mirando de lejos */
      var marcas = {};
      var nMarc = R.marcadores != null ? R.marcadores : 2;
      if (nMarc > 0) {
        var ocupados = caza.map(function (o) { return o.i; });
        st.mios.map(function (j, i) { return { i: i, x: j.x }; })
          .filter(function (o) { return o.i !== st.ctrl && st.mios[o.i].pos !== "ARQ" && o.x > st.W * 0.45; })
          .sort(function (a, b) { return b.x - a.x; }).slice(0, nMarc)
          .forEach(function (obj) {
            var m = st.mios[obj.i], mejorR = -1, mdR = 1e9;
            st.rivales.forEach(function (r, ri) {
              if (r.pos === "ARQ" || ocupados.indexOf(ri) >= 0) return;
              var dd = dist(r.x, r.y, m.x, m.y);
              if (dd < mdR) { mdR = dd; mejorR = ri; }
            });
            if (mejorR < 0) return;
            ocupados.push(mejorR);
            marcas[mejorR] = { x: m.x + 26, y: m.y };   // se planta ENTRE el receptor y su arco
          });
      }
      st.rivales.forEach(function (j, i) {
        var esCaza = caza.some(function (o) { return o.i === i; });
        if (esCaza) {
          var d = dist(j.x, j.y, ctrl.x, ctrl.y) || 1;
          var v = V.defensor_cerrando * dt;
          j.x += (ctrl.x - j.x) / d * Math.min(v, d);
          j.y += (ctrl.y - j.y) / d * Math.min(v, d);
        } else if (marcas[i]) {
          var d2 = dist(j.x, j.y, marcas[i].x, marcas[i].y) || 1;
          var v2 = (V.posicionales_por_segundo || 36) * (R.marca_vel_mult || 1.3) * dt;
          j.x += (marcas[i].x - j.x) / d2 * Math.min(v2, d2);
          j.y += (marcas[i].y - j.y) / d2 * Math.min(v2, d2);
        } else moverPosicional(j, false, i);
      });
      /* encuentro: te salieron al cruce */
      if (st.cooldown === 0) {
        for (var k = 0; k < caza.length; k++) {
          if (caza[k].d < R.radio_encuentro) {
            st.modo = "congelado";
            ev.push({ tipo: "encuentro", rivalIdx: caza[k].i });
            return ev;
          }
        }
      }
    } else {
      /* la CPU ataca: su portador avanza hacia TU arco (x → 0).
         RITMO: recién recibida, la PISA un momento (arranque_rival_ms) — tu ventana de reacción. */
      var pr = st.rivales[st.portadorRival];
      /* ANIME A: cambio de marcador AUTOMÁTICO (con histéresis para no titilar).
         No pisa al jugador mientras conduce (input) ni justo tras un cambio manual. */
      if ((!bal.vista || bal.vista.cambio_auto !== false) && (!input || (!input.dx && !input.dy)) && st._t > (st._noAutoHasta || 0)) {
        /* V6 F4: el que acaba de perderla queda excluido un rato del automático */
        var excl = (st._perdioHasta && st._t < st._perdioHasta) ? st._perdioIdx : null;
        var cand = mejorMarcador(st, excl);
        if (cand >= 0 && cand !== st.ctrl &&
          (st.mios[st.ctrl].pos === "ARQ" || scoreMarcador(st, cand) < scoreMarcador(st, st.ctrl) * 0.7)) st.ctrl = cand;
      }
      if (st.esperaRival > 0) { st.esperaRival = Math.max(0, st.esperaRival - dtMs); }
      else {
        /* R1: el rival con pelota también va a saltos — no lo alcanzás corriéndolo,
           lo esperás con el marcador bien parado (la ceguera lo vuelve una apuesta) */
        var velR = V.rival_con_pelota * (esSaltos(bal) ? (V.saltos_vel_mult || 2.4) : 1);
        pr.x = clamp(pr.x - velR * dt, 20, st.W - 20);
        pr.y = clamp(pr.y + Math.sin(pr.x * 0.02) * 26 * dt, 20, st.H - 20);
      }
      st.pelota.x += (pr.x - 12 - st.pelota.x) * Math.min(1, dt * 10);
      st.pelota.y += (pr.y - st.pelota.y) * Math.min(1, dt * 10);
      st.rivales.forEach(function (j, i) { if (i !== st.portadorRival) moverPosicional(j, false, i); });
      /* encuentro defensivo: TU marcador lo alcanzó */
      if (st.cooldown === 0 && dist(ctrl.x, ctrl.y, pr.x, pr.y) < R.radio_encuentro) {
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

  /* ---------- reloj a saltos ----------
     V6 §2 R4: cada MOMENTO consume un bloque fijo de minutos (la perilla única
     TEMPO.MINUTOS_POR_MOMENTO define duración, decisiones y ritmo de una vez).
     Sin la perilla, cae al salto aleatorio clásico. */
  function saltoReloj(st, rng) {
    rng = rng || Math.random;
    var R = st.bal.ritmo, T = st.bal.tempo || {};
    var salto = T.minutos_por_momento > 0
      ? T.minutos_por_momento
      : R.salto_accion_min + rng() * (R.salto_accion_max - R.salto_accion_min);
    st.minuto += salto;
    /* el tiempo que SALTA también recupera (si no, la regen del §7 es simbólica:
       el partido tiene ~10 min reales de juego libre y ~60' de saltos) */
    var porMin = st.bal.aguante.recuperacion_por_minuto_salto || 0;
    if (porMin) {
      st.mios.forEach(function (j, i) {
        if (!(st.posesion === "mia" && i === st.ctrl)) j.aguante = clamp(j.aguante + porMin * salto, 0, st.bal.aguante.max);
      });
      st.aguanteRival = clamp(st.aguanteRival + porMin * salto, 0, st.bal.aguante.max);
    }
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
  /* V6 §5: la CPU tiene aguante "infinito" pero con un LÍMITE INVISIBLE —
     nunca se le bloquean acciones, pero pasado el umbral sus habilidades
     caen EN PICADA. El rival se desgasta solo, sin que administres nada. */
  function poderRival(st) {
    var base = 52, A = st.bal.aguante;
    var frac = clamp(st.aguanteRival / A.max, 0, 1);
    if (frac < (A.cpu_umbral_frac != null ? A.cpu_umbral_frac : 0.3)) return base * (A.cpu_picada != null ? A.cpu_picada : 0.62);
    return base * (0.86 + 0.14 * frac);   // fracción: sirve en cualquier escala
  }
  function gastar(st, quien, costo) {
    if (quien === "rival") st.aguanteRival = clamp(st.aguanteRival - costo * st.bal.aguante.cpu_factor_costo, 0, st.bal.aguante.max);
    else { var j = st.mios[st.ctrl]; j.aguante = clamp(j.aguante - costo, 0, st.bal.aguante.max); }
  }
  function rendido(st) { return st.mios[st.ctrl].aguante < st.bal.aguante.umbral_rendido; }

  /* ---------- menús de encuentro (por rol) ---------- */
  function statCtrl(st, k) { return st.mios[st.ctrl].stats[k] || 45; }
  function bonusAguante(st) { var frac = st.mios[st.ctrl].aguante / st.bal.aguante.max; return (frac - 0.5) * 8; }   // ±4, en cualquier escala

  function accionesAtaque(st) {
    var A = st.bal.aguante, puedeT = puedeTirar(st), rend = rendido(st);
    var acc = [
      { id: "gambeta", n: "GAMBETA", ico: "🌀", costo: A.costo_gambeta, poder: statCtrl(st, "gambeta"), bloqueada: rend },
      { id: "pase", n: "PASE ▸", ico: "➡️", costo: A.costo_pase, poder: statCtrl(st, "pase"), bloqueada: false, submenu: true },
      { id: "pared", n: "PARED (1-2)", ico: "🔁", costo: A.costo_pared, poder: statCtrl(st, "pase") * 0.8 + mejorVinculo(st) * 0.2, bloqueada: rend || !hayCompaCerca(st), motivo: rend ? "SIN AGUANTE" : (!hayCompaCerca(st) ? "SIN COMPAÑERO CERCA" : null) },
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

  /* ---------- V6 §2 R3: el MEDIDOR DE ENVIÓN (mérito acumulado, no reflejo) ----------
     Se llena ganando quites, gambetas y duelos. Lleno, se gasta en POTENCIAR
     al equipo unos momentos o en una SÚPER DEFENSA que bloquea seguro. */
  function envionCfg(st) { return st.bal.envion || { max: 100, gana_duelo: 18, potencia_bonus: 10, potencia_ms: 20000 }; }
  function sumarEnvion(st, n) { st.envion = clamp((st.envion || 0) + n, 0, envionCfg(st).max); }
  function envionLleno(st) { return (st.envion || 0) >= envionCfg(st).max; }
  function envionActivo(st) { return !!(st._envionHasta && st._t < st._envionHasta); }
  function gastarEnvionPotencia(st) {
    if (!envionLleno(st)) return false;
    st.envion = 0;
    st._envionHasta = st._t + envionCfg(st).potencia_ms;
    return true;
  }
  function gastarEnvionSuper(st) {
    if (!envionLleno(st)) return false;
    st.envion = 0;
    return true;
  }

  /* MATRIZ DE VENTAJAS: quite>gambeta · corte>pase(y pared) · bloqueo>tiro */
  var CONTRA = { gambeta: "quite", pase: "corte", pared: "corte", tiro: "bloqueo" };

  /* duelo del encuentro (ataque MÍO vs defensa CPU, o al revés) */
  function resolverDuelo(st, opts) {
    var rng = opts.rng || Math.random, bal = st.bal, B = bal.partido.matriz_bonus;
    var win, accionRival, matriz;
    /* R3: el ENVIÓN activo potencia al equipo entero unos momentos */
    var envBonus = envionActivo(st) ? (envionCfg(st).potencia_bonus || 10) : 0;
    if (st.posesion === "mia") {
      accionRival = eleccionCPU(st, rng);
      var atk = (opts.poder != null ? opts.poder : statCtrl(st, opts.accion === "tiro" ? "tiro" : opts.accion === "gambeta" ? "gambeta" : "pase")) + bonusAguante(st) + envBonus;
      var def = poderRival(st);
      if (CONTRA[opts.accion] === accionRival) { def += B; matriz = "leyeron"; }   // te adivinaron
      else { atk += B * 0.6; matriz = "zafaste"; }                                  // esquivaste la marca equivocada
      def += opts.bonusRival || 0;   // Feel B6: la megacosa defensiva del rival pega acá
      gastar(st, "mio", opts.costo || 0); gastar(st, "rival", (bal.aguante["costo_" + accionRival] || bal.aguante.max * 0.06));
      win = rng() < Duel.duelChance(atk, def, bal.duelo);
    } else {
      /* defiendo: la CPU "ataca" con intención oculta */
      accionRival = ["gambeta", "pase", "tiro"][Math.floor(rng() * 3)];
      var defMio = (opts.poder != null ? opts.poder : 50) + bonusAguante(st) + envBonus;
      var atkRiv = poderRival(st) + 4;
      if (CONTRA[accionRival] === opts.accion) { defMio += B; matriz = "leiste"; }  // le adivinaste la intención
      else { atkRiv += B * 0.6; matriz = "teEngano"; }
      gastar(st, "mio", opts.costo || 0); gastar(st, "rival", (bal.aguante["costo_" + accionRival] || bal.aguante.max * 0.06));
      win = rng() < Duel.duelChance(defMio, atkRiv, bal.duelo);
    }
    if (win) sumarEnvion(st, envionCfg(st).gana_duelo);   // R3: el mérito se ACUMULA ganando
    saltoReloj(st, rng);
    return { win: win, accionRival: accionRival, matriz: matriz };
  }

  /* efectos de mundo tras el duelo de ataque.
     V6 §2 R2: SEPARACIÓN POST-DUELO — el perdedor queda NOTABLEMENTE lejos,
     como el gambeteado del anime que queda tirado metros atrás. */
  function ganarAtaque(st, accion, rivalIdx) {
    var c = st.mios[st.ctrl];
    var sep = st.bal.partido.separacion_duelo || 90;
    c.x = clamp(c.x + (accion === "pared" ? sep * 0.7 : accion === "gambeta" ? sep : sep * 0.4), 14, st.W - 14);
    if (rivalIdx != null && st.rivales[rivalIdx])
      st.rivales[rivalIdx].x = clamp(st.rivales[rivalIdx].x + sep * 0.8, 20, st.W - 20);   // queda pagando, atrás
    st.cooldown = st.bal.ritmo.cooldown_encuentro_ms; st.modo = "juego";
  }
  function perderPelota(st, rng) {
    rng = rng || Math.random;
    st.posesion = "rival"; st.modo = "juego"; st.cooldown = st.bal.ritmo.cooldown_encuentro_ms;
    /* el rival más cercano se la lleva, y la PISA: tenés tiempo de acomodarte */
    var c = st.mios[st.ctrl], mejor = 0, md = 1e9;
    st.rivales.forEach(function (j, i) { if (j.pos === "ARQ") return; var d = dist(j.x, j.y, c.x, c.y); if (d < md) { md = d; mejor = i; } });
    st.portadorRival = mejor;
    /* V6 §2 R1+R2: tras el robo, corte — la pelota YA está lejos, en poder del
       rival en su próximo momento. No hay persecución que valga. */
    var pr2 = st.rivales[mejor];
    pr2.x = clamp(pr2.x - (st.bal.partido.separacion_duelo || 90) * 0.6, 20, st.W - 20);
    st.pelota.x = pr2.x - 12; st.pelota.y = pr2.y;
    /* V6 §1 F4: el control pasa al MEJOR posicionado, EXCLUYENDO al que la perdió
       (y lo recuerda un rato para que el automático tampoco vuelva a él) */
    st._perdioIdx = st.ctrl;
    st._perdioHasta = st._t + 3000;
    var cand = mejorMarcador(st, st._perdioIdx);
    st.ctrl = cand >= 0 ? cand : masCercanoAPelota(st);
    st.esperaRival = st.bal.ritmo.arranque_rival_ms;
  }
  function ganarDefensa(st) {
    st.posesion = "mia"; st.modo = "juego"; st.cooldown = st.bal.ritmo.cooldown_encuentro_ms;
    /* recuperaste: seguís con el que marcó; el gambeteado queda ATRÁS (R2) */
    var sep = st.bal.partido.separacion_duelo || 90;
    var pr = st.rivales[st.portadorRival];
    if (pr) pr.x = clamp(pr.x + sep * 0.8, 20, st.W - 20);
    st.pelota.x = st.mios[st.ctrl].x + 12; st.pelota.y = st.mios[st.ctrl].y;
  }
  function perderDefensa(st) {
    var pr = st.rivales[st.portadorRival];
    var sep = st.bal.partido.separacion_duelo || 90;
    pr.x = clamp(pr.x - sep, 20, st.W - 20);   // R2: te dejó pagando, gana metros de verdad
    st.modo = "juego"; st.cooldown = st.bal.ritmo.cooldown_encuentro_ms;
  }

  /* ---------- pases ---------- */
  function receptoresPase(st) {
    var bal = st.bal, c = st.mios[st.ctrl], out = [];
    st.mios.forEach(function (j, i) {
      if (i === st.ctrl || j.pos === "ARQ") return;
      var d = dist(j.x, j.y, c.x, c.y);
      if (d > bal.partido.pase_radio) return;
      /* riesgo: rival EN EL CORREDOR de la línea de pase.
         V6 §1 F3: uno que está detrás del pasador o pasado el receptor NO corta. */
      var riesgo = 0;
      st.rivales.forEach(function (r) {
        if (r.pos === "ARQ") return;
        var t = ((r.x - c.x) * (j.x - c.x) + (r.y - c.y) * (j.y - c.y)) / (d * d || 1);
        if (t < 0.1 || t > 0.92) return;
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
    var o = st.mios[st.ctrl];
    var dPase = dist(o.x, o.y, st.mios[receptorIdx].x, st.mios[receptorIdx].y);
    gastar(st, "mio", st.bal.aguante.costo_pase);
    saltoReloj(st, rng);
    var win = rng() * 100 < pct;
    if (win) {
      st.ctrl = receptorIdx;                       // el control VIAJA con el pase
      var r = st.mios[receptorIdx];
      st.pelota.x = r.x + 12; st.pelota.y = r.y;
      st.cooldown = st.bal.ritmo.cooldown_encuentro_ms; st.modo = "juego";
      marcarPelotaAlta(st, dPase);                 // Anime F: el pase LARGO llega alto
    } else {
      perderPelota(st, rng);
    }
    return { win: win };
  }

  /* ---------- PASE AL VACÍO (v2 §7 "Through") ----------
     Dejás pasar la pelota al espacio de un compañero adelantado: más riesgo
     que el pase al pie, pero si sale, el receptor gana metros y el ARQUERO
     QUEDA VENDIDO por una ventana corta (bonus al próximo remate). */
  function receptorAlVacio(st) {
    var c = st.mios[st.ctrl], mejor = null;
    st.mios.forEach(function (j, i) {
      if (i === st.ctrl || j.pos === "ARQ") return;
      if (j.x <= c.x + 40) return;                        // tiene que estar ADELANTE
      if (dist(j.x, j.y, c.x, c.y) > st.bal.partido.pase_radio) return;
      if (!mejor || j.x > st.mios[mejor].x) mejor = i;
    });
    return mejor;
  }
  function resolverPaseAlVacio(st, receptorIdx, pctBase, rng) {
    rng = rng || Math.random;
    var P = st.bal.partido;
    gastar(st, "mio", st.bal.aguante.costo_pase);
    saltoReloj(st, rng);
    var pct = clamp(pctBase - P.vacio_penal, 10, 92);
    var win = rng() * 100 < pct;
    if (win) {
      var o = st.mios[st.ctrl];
      var r = st.mios[receptorIdx];
      r.x = clamp(r.x + P.vacio_avance, 20, st.W - 60);   // corre al espacio
      st.ctrl = receptorIdx;
      st.pelota.x = r.x + 12; st.pelota.y = r.y;
      st._vendidoHasta = st._t + P.vacio_ventana_ms;      // el arquero quedó a contrapié
      st.cooldown = st.bal.ritmo.cooldown_encuentro_ms; st.modo = "juego";
      marcarPelotaAlta(st, dist(o.x, o.y, r.x, r.y));     // Anime F: el vacío largo también viene alto
    } else {
      perderPelota(st, rng);
    }
    return { win: win, pct: pct };
  }

  /* NO MOVERSE (v2 §7): no disputás — el rival sigue, vos recuperás aire */
  function esperarDefensa(st) {
    var j = st.mios[st.ctrl];
    j.aguante = clamp(j.aguante + st.bal.aguante.recupera_no_moverse, 0, st.bal.aguante.max);
    st.modo = "juego"; st.cooldown = st.bal.ritmo.cooldown_encuentro_ms;
    return { recupero: st.bal.aguante.recupera_no_moverse };
  }

  /* ---------- ANIME v4 Bloque F: PELOTA ALTA y tiros situacionales ----------
     Un pase LARGO ganado llega alto: por una ventana corta se abren las
     opciones aéreas (cabezazo / volea / chilena — la chilena exige juego
     aéreo alto y MUCHOS aguante). Bajarla la apaga. Todo parametrizado. */
  function pelotaAltaVigente(st) { return !!(st._altaHasta && st._t < st._altaHasta); }
  function marcarPelotaAlta(st, distancia) {
    var P = st.bal.partido;
    if (distancia >= (P.alto_desde || 240)) st._altaHasta = st._t + (P.alto_ventana_ms || 6000);
  }
  function bajarla(st) { st._altaHasta = 0; }
  function accionesAereas(st) {
    if (!pelotaAltaVigente(st) || st.posesion !== "mia") return [];
    var A = st.bal.aguante, P = st.bal.partido, j = st.mios[st.ctrl];
    var puedeT = puedeTirar(st);
    var aereo = j.stats.aereo || 45, tiro = j.stats.tiro || 45;
    var CH = P.chilena || {};
    var mk = function (id, n, poder, costo, extraBloq, extraMotivo) {
      var bloq = !puedeT || j.aguante < costo || !!extraBloq;
      return {
        id: id, n: n, poder: poder, costo: costo, bloqueada: bloq,
        motivo: !puedeT ? "LEJOS DEL ARCO" : (extraBloq ? extraMotivo : (j.aguante < costo ? "SIN AGUANTE" : null))
      };
    };
    return [
      mk("cabezazo", "CABEZAZO", aereo * (P.cabezazo_mult || 0.95), A.costo_cabezazo || 70),
      mk("volea", "VOLEA", (tiro * 0.6 + aereo * 0.4) * (P.volea_mult || 1.15), A.costo_volea || 90),
      mk("chilena", "CHILENA", (tiro * 0.5 + aereo * 0.5) * (CH.mult || 1.35), A.costo_chilena || 250,
        aereo < (CH.aereo_min || 65), "TE FALTA JUEGO AÉREO (" + aereo + "/" + (CH.aereo_min || 65) + ")")
    ];
  }
  function prepararRemateAereo(st, id, rng) {
    var acc = accionesAereas(st).find(function (a) { return a.id === id; });
    var P = st.bal.partido;
    var poder = (acc ? acc.poder : 50) + bonusAguante(st);
    var vendido = st._vendidoHasta && st._t < st._vendidoHasta;
    if (vendido) { poder += P.bonus_arquero_vendido; st._vendidoHasta = 0; }
    gastar(st, "mio", acc ? acc.costo : (st.bal.aguante.costo_cabezazo || 70));
    st._altaHasta = 0;                          // la pelota bajó, sea cual sea el desenlace
    saltoReloj(st, rng);
    return { shotPower: poder, keeperSkill: st.rivalKeeperSkill, tipo: id, arqueroVendido: !!vendido };
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
  /* esCalden: true = Caldén clásico (compat tests) · objeto {aguante, mult} = MEGATIRO de data (Feel B5) */
  function prepararRemate(st, esCalden, rng) {
    var j = st.mios[st.ctrl], P = st.bal.partido, C = P.calden;
    var mega = (esCalden && typeof esCalden === "object") ? esCalden : null;
    var especial = !!esCalden;
    var poder = (j.stats.tiro || 50) + (j.stats.caracter || 50) * 0.12 + bonusAguante(st);
    /* v2 §7: desde lejos el tiro normal pierde fuerza (los especiales no) */
    var d = dist(j.x, j.y, st.W, st.H / 2);
    if (!especial) poder -= Math.max(0, d - P.tiro_lejos_desde) * P.tiro_lejos_penal;
    /* pase al vacío reciente: el arquero quedó vendido */
    var vendido = st._vendidoHasta && st._t < st._vendidoHasta;
    if (vendido) { poder += P.bonus_arquero_vendido; st._vendidoHasta = 0; }
    if (mega) poder *= (mega.mult || 1.3);
    else if (especial) poder *= C.mult;
    gastar(st, "mio", mega ? (mega.aguante || st.bal.aguante.costo_calden) : (especial ? st.bal.aguante.costo_calden : st.bal.aguante.costo_tiro));
    saltoReloj(st, rng);
    return { shotPower: poder, keeperSkill: st.rivalKeeperSkill, arqueroVendido: !!vendido, distancia: Math.round(d) };
  }
  function golMio(st) { st.golesMio++; kickoff(st, "rival"); }
  function tiroFallado(st, rng) { perderPelota(st, rng); st.cooldown = st.bal.ritmo.cooldown_encuentro_ms; }

  /* ---------- el remate RIVAL contra tu arquero ---------- */
  function opcionesArquero(st) {
    var arq = st.mios.find(function (j) { return j.pos === "ARQ"; }) || { stats: {} };
    var base = (arq.stats.fisico || 50) * 0.7 + (arq.stats.caracter || 50) * 0.4;
    return [
      { id: "atajar", n: "ATAJAR", ico: "🧤", poder: base, riesgo: "retiene, más difícil" },
      { id: "despejar", n: "DESPEJAR", ico: "👊", poder: base + 8, riesgo: "más seguro · pelota dividida" }
    ];
  }
  function resolverAtajada(st, eleccion, rng, bonus) {
    rng = rng || Math.random;
    var ops = opcionesArquero(st);
    var op = ops.find(function (o) { return o.id === eleccion; }) || ops[0];
    op = { id: op.id, n: op.n, poder: op.poder + (bonus || 0) };   // Feel B6: MEGAATAJADA suma acá
    var atkRiv = poderRival(st) + 12;
    gastar(st, "rival", st.bal.aguante.costo_tiro);
    saltoReloj(st, rng);
    var ataja = rng() < Duel.duelChance(op.poder, atkRiv, st.bal.duelo);
    if (!ataja) { st.golesRival++; kickoff(st, "mia"); return { golRival: true, eleccion: eleccion }; }
    if (eleccion === "despejar") {
      /* dividida al medio: 50/50 */
      var mia = rng() < 0.5;
      if (mia) { st.posesion = "mia"; st.ctrl = masCercanoAPelota(st); st.pelota.x = st.W / 2; st.pelota.y = st.H / 2; st.modo = "juego"; st.cooldown = st.bal.ritmo.cooldown_encuentro_ms; reubicar(st); }
      else { st.posesion = "rival"; st.portadorRival = st.rivales.length - 2; st.rivales[st.portadorRival].x = st.W / 2; st.rivales[st.portadorRival].y = st.H / 2; st.pelota.x = st.W / 2; st.pelota.y = st.H / 2; st.ctrl = masCercanoAPelota(st); st.modo = "juego"; st.cooldown = st.bal.ritmo.cooldown_encuentro_ms; }   // auto-switch: marcás con el más cercano a la dividida
      return { golRival: false, dividida: true, mia: mia, eleccion: eleccion };
    }
    /* atajó y retiene: salís jugando desde tu área */
    st.posesion = "mia";
    st.ctrl = st.mios.findIndex(function (j) { return j.pos === "DEF"; });
    var d0 = st.mios[st.ctrl]; d0.x = 200; d0.y = st.H / 2;
    st.pelota.x = 212; st.pelota.y = st.H / 2;
    st.modo = "juego"; st.cooldown = st.bal.ritmo.cooldown_encuentro_ms;
    return { golRival: false, retiene: true, eleccion: eleccion };
  }
  function reubicar(st) {
    var c = st.mios[st.ctrl]; c.x = st.W / 2 - 14; c.y = st.H / 2;
  }

  /* ---------- cambio de jugador (defensa) ---------- */
  /* el cambio MANUAL frena el automático un rato (Anime A: la elección tuya vale) */
  function cambiarA(st, idx) {
    if (st.posesion !== "rival") return false;
    if (idx < 0 || idx >= st.mios.length || st.mios[idx].pos === "ARQ") return false;
    st.ctrl = idx; st._noAutoHasta = st._t + 2500; return true;
  }
  function cambiarAlMasCercano(st) { if (st.posesion === "rival") { st.ctrl = masCercanoAPelota(st); st._noAutoHasta = st._t + 2500; } }

  return {
    crearPartido: crearPartido, tick: tick, kickoff: kickoff,
    saltoReloj: saltoReloj, chequearTiempo: chequearTiempo, entretiempo: entretiempo,
    accionesAtaque: accionesAtaque, accionesDefensa: accionesDefensa,
    receptorAlVacio: receptorAlVacio, resolverPaseAlVacio: resolverPaseAlVacio, esperarDefensa: esperarDefensa,
    resolverDuelo: resolverDuelo, ganarAtaque: ganarAtaque, perderPelota: perderPelota,
    ganarDefensa: ganarDefensa, perderDefensa: perderDefensa,
    receptoresPase: receptoresPase, resolverPase: resolverPase,
    puedeTirar: puedeTirar, puedeCalden: puedeCalden, prepararRemate: prepararRemate,
    golMio: golMio, tiroFallado: tiroFallado,
    opcionesArquero: opcionesArquero, resolverAtajada: resolverAtajada,
    cambiarA: cambiarA, cambiarAlMasCercano: cambiarAlMasCercano,
    poderRival: poderRival, rendido: rendido, masCercanoAPelota: masCercanoAPelota,
    mejorMarcador: mejorMarcador, segPorMinuto: segPorMinuto,
    pelotaAltaVigente: pelotaAltaVigente, accionesAereas: accionesAereas,
    prepararRemateAereo: prepararRemateAereo, bajarla: bajarla,
    sumarEnvion: sumarEnvion, envionLleno: envionLleno, envionActivo: envionActivo,
    gastarEnvionPotencia: gastarEnvionPotencia, gastarEnvionSuper: gastarEnvionSuper
  };
});
