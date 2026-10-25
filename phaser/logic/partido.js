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
  if (typeof module !== "undefined" && module.exports) module.exports = factory(require("./duel.js"), require("./lectura.js"));
  else root.PampaPartido = factory(root.PampaDuel, root.PampaLectura);
})(typeof self !== "undefined" ? self : this, function (Duel, Lect) {
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
      minuto: 0, tiempo: 1, ladoVisual: 1,   // V9 §10: 2 en el segundo tiempo (solo render)
      /* descuento OCULTO e impredecible por tiempo (doc §6: nadie sabe cuándo pita) */
      desc1: bal.ritmo.descuento_min + Math.floor(rng() * (bal.ritmo.descuento_max - bal.ritmo.descuento_min + 1)),
      desc2: bal.ritmo.descuento_min + Math.floor(rng() * (bal.ritmo.descuento_max - bal.ritmo.descuento_min + 1)),
      golesMio: 0, golesRival: 0,
      envion: 0, _envionHasta: 0,               // V6 §2 R3: mérito acumulado (0..envion.max)
      posesion: "mia", modo: "juego",
      ctrl: idxDelVos(null), pelota: { x: W / 2, y: H / 2 },
      portadorRival: 0,
      cooldown: 0, esperaRival: 0, _t: 0,
      /* N2: la lectura de tus especiales. Arranca en cero cada domingo: es
         local al partido y no ensucia el balance de la carrera. */
      lectura: Lect ? Lect.nuevo() : null
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
      ctrl.aguante = clamp(ctrl.aguante - drena * dt, 0, techoAguante(ctrl, bal));
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
        if (!conduce && !marca) j.aguante = clamp(j.aguante + regen * multVida(st, "recuperacion") * dt, 0, techoAguante(j, bal));
      });
      st.aguanteRival = clamp(st.aguanteRival + regen * dt, 0, bal.aguante.max);
    }

    /* --- posicionales de ambos lados ---
       V8 §2 · LA IA DE LOS 21: cada uno hace lo de su PUESTO según la
       SITUACIÓN (posesión + altura de la pelota) — nadie es una hormiga.
       DEF: marcan la zona y quedan SIEMPRE entre la pelota y su arco (en
       ataque apoyan hasta media cancha). VOL: circulan siguiendo el juego.
       ATA: en ataque se DESCUELGAN a recibir y se abren a las bandas; en
       defensa presionan poco. El perfil del club rival (partido.ia_linea,
       del Modo Master) adelanta o repliega su línea entera. Con ia.v8=false
       vuelve la elasticidad vieja, solo para comparar. */
    var empuje = (st.pelota.x - st.W / 2);
    var IA = bal.ia || {};
    var FLUJO = bal.flujo;
    /* 22/oct, Rodri: "quien juega tiene que defender". Con la pelota del
       rival, el primero de los tuyos que está en su camino SALE AL CRUCE: le
       va de frente y lo sigue siendo mientras el portador no lo pase. Al que
       ya lo pasó no lo persigue nadie (R1). El que conducís vos sale solo si
       no lo estás moviendo. Con el cooldown corriendo no sale nadie, y hay un
       tope de salidas por cada pelota del rival para que defender no sea una
       seguidilla de menús. Perillas en balance.ritmo.cruce_def. */
    var CD = R.cruce_def || {}, salidor = -1;
    var velSal = V.posicionales_por_segundo * (CD.vel_mult || 1.3);
    if (st.posesion === "mia") { st._crucesDef = 0; st._salidor = -1; }
    else if (CD.activo !== false && st.cooldown === 0 && (st._crucesDef || 0) < (CD.por_posesion || 1)) {
      var prc = st.rivales[st.portadorRival];
      var velRc = V.rival_con_pelota * (esSaltos(bal) ? (V.saltos_vel_mult || 2.4) : 1);
      var puedeSalir = function (j, i) {
        if (j.pos === "ARQ") return false;
        if (i === st.ctrl && input && (input.dx || input.dy)) return false;
        if (st._perdioHasta && st._t < st._perdioHasta && i === st._perdioIdx) return false;
        return prc.x - j.x >= R.radio_encuentro;
      };
      if (st._salidor >= 0 && st.mios[st._salidor] && puedeSalir(st.mios[st._salidor], st._salidor)) salidor = st._salidor;
      else {
        var mejorGap = 1e9;
        st.mios.forEach(function (j, i) {
          if (!puedeSalir(j, i)) return;
          var gap = prc.x - j.x;
          var costado = (gap - R.radio_encuentro) / (velRc + velSal) * velSal + R.radio_encuentro;
          if (Math.abs(j.y - prc.y) > Math.min(costado, CD.alcance_y || 160)) return;
          if (gap < mejorGap) { mejorGap = gap; salidor = i; }
        });
      }
      st._salidor = salidor;
    }
    function moverPosicional(j, esMio, i) {
      var tx;
      /* 20/oct, Rodri: "se ven amontonados". Medido en node (600 latidos
         de un partido con crearPartido y tick): dos de la misma línea uno
         ENCIMA del otro casi dos veces por latido, a distancia 0. Era la altura: cada
         uno iba a la de la pelota recortada a su franja, y con la pelota en
         y=340 el de la franja de arriba se pegaba a su borde de abajo y el de
         la de abajo a su borde de arriba, que es el mismo punto. Ahora la
         línea entera se corre hacia la pelota (balance.ia.corre_linea) y cada
         uno se queda en su franja, a una franja del de al lado. */
      var mitad = (j.banda[0] + j.banda[1]) / 2;
      var ty = clamp(mitad + (st.pelota.y - st.H / 2) * (IA.corre_linea != null ? IA.corre_linea : 0.5), j.banda[0], j.banda[1])
        + Math.sin(st._t * 0.003 + j.idle) * 3;
      if (IA.v8 === false || (j.pos !== "DEF" && j.pos !== "VOL" && j.pos !== "ATA")) {
        var el = P.elasticidad[j.pos] != null ? P.elasticidad[j.pos] : 0.4;
        tx = clamp(j.ax + empuje * el, 20, st.W - 20);
      } else {
        var ataco = esMio ? (st.posesion === "mia") : (st.posesion === "rival");
        /* coordenadas DE EQUIPO: adelante = hacia el arco rival (espejo limpio) */
        var eq = function (x) { return esMio ? x : st.W - x; };
        var axE = eq(j.ax), pxE = eq(st.pelota.x);
        var linea = !esMio ? (P.ia_linea || 0) : 0;
        var txE;
        if (j.pos === "DEF") {
          if (ataco) txE = Math.min(axE + (IA.def_apoyo || 90) + linea, st.W * 0.55);
          else txE = Math.max(Math.min(axE + linea, pxE - (IA.def_colchon || 60)), 30);   // la espalda SIEMPRE cubierta
        } else if (j.pos === "VOL") {
          var s = IA.vol_sigue || 0.7;
          txE = pxE * s + axE * (1 - s) + linea;
        } else {   // ATA
          if (ataco) {
            txE = Math.min(Math.max(axE, pxE + (IA.ata_descuelga || 120)) + linea, st.W - 70);
            /* V8 fix (playtest): PISO anti-retroceso — el destino se recalcula
               cada latido y podía quedar DETRÁS de donde el delantero ya
               estaba parado (se veía caminando para atrás en pleno ataque).
               Un delantero NUNCA retrocede cuando su equipo ataca: sube o
               se queda. Al perder la posesión, baja normal. */
            txE = Math.max(txE, eq(j.x));
          }
          else txE = Math.max(axE - (IA.ata_baja || 140), st.W * 0.42);
        }
        tx = clamp(eq(txE), 20, st.W - 20);
        if (j.pos === "ATA" && ataco) {
          var abre = (i % 2 === 0 ? -1 : 1) * (IA.ata_abre || 70);   // se ofrecen a las bandas
          ty = clamp(ty + abre, j.banda[0], j.banda[1]);
        }
        /* 23/oct, Rodri: "que sea mucho de decisiones de pasarla". Con
           balance.flujo, volantes y delanteros se DESMARCAN para ofrecer la
           línea de pase: se abren del rival que tienen encima y, si uno se
           para en la línea desde el portador, se corren de costado. Cada
           uno sigue adentro de su franja. */
        var DM = FLUJO && FLUJO.activo && esMio && ataco && j.pos !== "DEF" ? FLUJO.desmarque : null;
        if (DM) {
          var rc = null, drc = DM.radio_px;
          st.rivales.forEach(function (r) {
            if (r.pos === "ARQ") return;
            var dd = dist(r.x, r.y, j.x, j.y);
            if (dd < drc) { drc = dd; rc = r; }
          });
          if (rc) {
            var s2 = 1 - drc / DM.radio_px;
            ty += (j.y >= rc.y ? 1 : -1) * DM.px * s2;
            tx = clamp(tx + DM.adelante_px * s2, 20, st.W - 70);
          }
          var tapa = riesgoLinea(st, i).quien;
          if (tapa) ty += (j.y >= tapa.y ? 1 : -1) * DM.linea_px;
          /* revisión final del 23/oct: casi ningún centro caía en la zona de
             remate. Con la pelota pasando al_area_desde, el delantero pica al área */
          if (DM.al_area_desde && j.pos === "ATA" && i !== st.ctrl && st.pelota.x > st.W * DM.al_area_desde) {
            tx = Math.max(tx, st.W - FLUJO.centro.zona_px * DM.al_area_hondo);
            ty += (st.H / 2 - ty) * DM.al_area_cierra;
          }
          ty = clamp(ty, j.banda[0], j.banda[1]);
        }
      }
      var v = V.posicionales_por_segundo || 55;
      j.x += clamp(tx - j.x, -v * dt, v * dt);
      j.y += clamp(ty - j.y, -v * dt, v * dt);
    }
    st.mios.forEach(function (j, i) {
      if (i === salidor) {
        /* primero se pone en su línea, después le sale de frente */
        var prs = st.rivales[st.portadorRival], vs = velSal * dt;
        var my = clamp(prs.y - j.y, -vs, vs);
        var mx = Math.sqrt(Math.max(0, vs * vs - my * my));
        j.y += my;
        j.x += clamp(prs.x - R.radio_encuentro * 0.5 - j.x, -mx, mx);
      } else if (i !== st.ctrl) moverPosicional(j, true, i);
    });

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
           lo esperás con el marcador bien parado (la ceguera lo vuelve una adivinanza) */
        var velR = V.rival_con_pelota * (esSaltos(bal) ? (V.saltos_vel_mult || 2.4) : 1);
        pr.x = clamp(pr.x - velR * dt, 20, st.W - 20);
        pr.y = clamp(pr.y + Math.sin(pr.x * 0.02) * 26 * dt, 20, st.H - 20);
      }
      st.pelota.x += (pr.x - 12 - st.pelota.x) * Math.min(1, dt * 10);
      st.pelota.y += (pr.y - st.pelota.y) * Math.min(1, dt * 10);
      st.rivales.forEach(function (j, i) { if (i !== st.portadorRival) moverPosicional(j, false, i); });
      /* encuentro defensivo: TU marcador lo alcanzó, o le salió al cruce
         uno de los tuyos que estaba adelante (con el tope de salidas) */
      if (st.cooldown === 0) {
        var quien = dist(ctrl.x, ctrl.y, pr.x, pr.y) < R.radio_encuentro ? st.ctrl : -1;
        if (quien < 0 && CD.activo !== false && (st._crucesDef || 0) < (CD.por_posesion || 1)) {
          var dq = R.radio_encuentro;
          st.mios.forEach(function (j, i) {
            if (j.pos === "ARQ" || j.x > pr.x + 8) return;
            if (st._perdioHasta && st._t < st._perdioHasta && i === st._perdioIdx) return;
            var dj = dist(j.x, j.y, pr.x, pr.y);
            if (dj < dq) { dq = dj; quien = i; }
          });
        }
        if (quien >= 0) {
          st.ctrl = quien;
          st._crucesDef = (st._crucesDef || 0) + 1;
          st.modo = "congelado";
          ev.push({ tipo: "encuentroDef" });
          return ev;
        }
      }
      /* llegó a tu área: remata */
      if (pr.x < P.dist_remate_rival) {
        /* revisión final del 22/oct: la pelota robada cerca de tu área llegaba
           al remate con el cooldown corriendo y sin que nadie saliera (2 de
           4 remates rivales en un partido rápido, 6 segundos mirando). Si en
           esta pelota no hubo cruz, antes del remate sale el tuyo que está
           más cerca, aunque corra el cooldown (cruce_def.ultimo) */
        if (CD.activo !== false && CD.ultimo !== false && !(st._crucesDef > 0)) {
          var ult = -1, du = 1e9;
          st.mios.forEach(function (j, i) {
            if (j.pos === "ARQ") return;
            if (st._perdioHasta && st._t < st._perdioHasta && i === st._perdioIdx) return;
            var d = dist(j.x, j.y, pr.x, pr.y);
            if (d < du) { du = d; ult = i; }
          });
          if (ult >= 0) {
            var u = st.mios[ult];
            u.x = clamp(pr.x - R.radio_encuentro * 0.8, 14, st.W - 14); u.y = pr.y;
            st.ctrl = ult;
            st._crucesDef = 1;
            st.modo = "congelado";
            ev.push({ tipo: "encuentroDef", ultimo: true });
            return ev;
          }
        }
        st._crucesDef = 0;
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
  /* frac: 23/oct, con balance.flujo el pase y el centro gastan una parte del
     momento (flujo.reloj); si no, con el doble de decisiones el partido duraba
     la mitad */
  function saltoReloj(st, rng, frac) {
    rng = rng || Math.random;
    var R = st.bal.ritmo, T = st.bal.tempo || {};
    var salto = (T.minutos_por_momento > 0
      ? T.minutos_por_momento
      : R.salto_accion_min + rng() * (R.salto_accion_max - R.salto_accion_min)) * (frac != null ? frac : 1);
    st.minuto += salto;
    /* el tiempo que SALTA también recupera (si no, la regen del §7 es simbólica:
       el partido tiene ~10 min reales de juego libre y ~60' de saltos) */
    var porMin = st.bal.aguante.recuperacion_por_minuto_salto || 0;
    if (porMin) {
      st.mios.forEach(function (j, i) {
        if (!(st.posesion === "mia" && i === st.ctrl)) j.aguante = clamp(j.aguante + porMin * multVida(st, "recuperacion") * salto, 0, techoAguante(j, st.bal));
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
    /* V9 §10 · CAMBIO DE LADO. Dato INFORMATIVO para el render: la simulación
       sigue atacando a +x (no se espeja ni una regla, ni un umbral, ni la IA
       de los 21 — sus tests siguen valiendo). El que se da vuelta es el
       dibujo: aRender, aSim y el radar leen esto y espejan la cancha. */
    st.ladoVisual = 2;
    var rec = st.bal.aguante.max * st.bal.aguante.recuperacion_entretiempo_frac;
    st.mios.forEach(function (j) { j.aguante = clamp(j.aguante + rec * multVida(st, "recuperacion"), 0, techoAguante(j, st.bal)); });
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
    else { var j = st.mios[st.ctrl]; j.aguante = clamp(j.aguante - costo, 0, techoAguante(j, st.bal)); }
  }
  function rendido(st) { return st.mios[st.ctrl].aguante < st.bal.aguante.umbral_rendido; }
  /* EL TECHO DE CADA JUGADOR. Los seis clamps de aguante usaban el global
     bal.aguante.max, asi que j.aguanteMax —lo que compras entrenando— no lo
     leia nadie y ENTRENAR AGUANTE, la opcion mas cara de la semana, no hacia
     absolutamente nada. El global sigue siendo el default: quien no entreno
     nada juega exactamente como antes. */
  function techoAguante(j, bal) {
    return (j && j.aguanteMax) || bal.aguante.max;
  }

  /* ══════════════════════════════════════════════════════════════════════
     STATS DERIVADAS · las dos que el juego leía y NINGÚN jugador tiene.

     El esquema de stats son OCHO claves: pase, tiro, gambeta, velocidad,
     resistencia, fisico, aereo, caracter. Verificado sobre los 50 jugadores de
     data/roster_pampeano.json: 0 tienen `quite` y 0 tienen `keeper`.

     Y sin embargo el juego las leía:
       · `quite`  lo pide el JUGADÓN —la función estrella de la V8— en
         elegirCierre y resolverMovida. Con el `|| 55` cobrándose el 100% de las
         veces, los pesos de cierre eran [1, 1, 1.1, 0.9167] SIEMPRE, y el
         comentario que dice "quite alto → más firme y se_tira" describía algo
         que no pasaba. Un central del Mundial y uno de Primera B cerraban igual.
       · `keeper` lo piden las tres pantallas donde el nivel de TU arquero
         decide: la definición ofensiva, la defensiva y TE REMATAN.

     Se DERIVAN de lo que el jugador sí tiene, en vez de agregarle claves a los
     50 registros. Dos razones: no hay que tocar datos, y —la que importa—
     PampaMaster.aplicar() multiplica las claves que YA existen, así que al
     derivarlas de fisico/velocidad/caracter escalan solas con la división. Un
     rival del Mundial cierra distinto que uno de Primera B sin una línea más.

     CALIBRADO para no mover lo que ya se jugó: quite da un promedio de 56,8
     sobre los 50 contra el 55 fijo de hoy (rango 49 a 66). Medido en 100.000
     gambetas, ganar el uno-contra-uno pasa de 40,2% a: Primera B 40,3%,
     Primera A 40,2%, Regional 39,9%, Nacional 39,9%, Mundial 34,4%. O sea que
     las divisiones de abajo quedan como estaban y el Mundial se pone duro, que
     es para lo que existe la escalera.
     ══════════════════════════════════════════════════════════════════════ */
  function quiteDe(stats) {
    var s = stats || {};
    if (s.quite != null) return s.quite;          /* si algún día existe, manda el dato */
    return (s.fisico || 50) * 0.6 + (s.velocidad || 50) * 0.4;
  }
  /* el nivel del ARQUERO, en la misma escala 1-99 en la que se lo compara.
     Sale de lo mismo que ya usa opcionesArquero para resolver la atajada
     (fisico y caracter), pero con los pesos SUMANDO 1 y no 1,1, y esa
     diferencia no es cosmética: es lo que lo deja neutral.

     Medido sobre los 50 jugadores: con 0,7/0,4 el promedio da 61,4 contra el 55
     fijo de hoy, y eso solo ya bajaba los goles en contra de 39,4% a 34,3% —
     cinco puntos de regalo por un cambio que era de VARIEDAD, no de dificultad.
     Con 0,6/0,4 el promedio da 55,9: tu arquero pasa a valer entre 48 y 66
     según quién te tocó, y el promedio queda donde estaba. */
  function nivelArqueroDe(stats) {
    var s = stats || {};
    if (s.keeper != null) return s.keeper;
    return (s.fisico || 50) * 0.6 + (s.caracter || 50) * 0.4;
  }

  /* ---------- menús de encuentro (por rol) ---------- */
  function statCtrl(st, k) { return st.mios[st.ctrl].stats[k] || 45; }
  function bonusAguante(st) { var frac = st.mios[st.ctrl].aguante / st.bal.aguante.max; return (frac - 0.5) * 8; }   // ±4, en cualquier escala

  /* ══════════════════════════════════════════════════════════════════════
     EL MODIFICADOR DE LA FECHA · lo que elegiste en el evento de la semana.

     El vocabulario de logic/vida.js TOPES declara doce efectos y los eventos
     los usan. Cinco (tiro, pase, gambeta, fisico, caracter) los aplicaba la
     escena sobre tus stats, y dos más (aguante, envion) sobre el estado. Los
     otros CINCO no los leía nadie:

       · duelo         se sumaba a mano en UNA sola de las cuatro vías de
                       remate (tiroPorComandos), así que el mismo evento pegaba
                       o no según por dónde hubieras entrado al tiro — y no
                       tocaba la gambeta, el uno-dos, el quite ni el bloqueo,
                       aunque el _efectos lo describe como "bonus al poder de
                       TUS acciones"
       · arranque      "bonus en el 1er tiempo, se apaga en el 2º" · 10 opciones
       · final         "bonus en el 2º tiempo" · 6 opciones
       · recuperacion  "multiplicador de regeneración" · 3 opciones
       · keeper        la escena lo escribía en stats.quite, un campo que no
                       existe en el esquema y que NADIE lee para el arquero (su
                       poder sale de fisico*0.7 + caracter*0.4)

     match.js:259 tenía el comentario "duelo/arranque/final/recuperación se leen
     en juego" al lado de la línea que los guardaba. No se leían: el grep de
     _modVida daba dos líneas, la que guardaba y una que usaba `.duelo`.

     Ahora el modificador viaja en `st.modVida` y lo lee la LÓGICA PURA, que es
     lo único que se puede simular en node antes de tocar el balance.
     ══════════════════════════════════════════════════════════════════════ */
  function bonusVida(st, clave) {
    var m = st && st.modVida, v = m && m[clave];
    return typeof v === "number" ? v : 0;
  }
  /* recuperacion es MULTIPLICADOR: sin evento vale 1, no 0 */
  function multVida(st, clave) {
    var m = st && st.modVida, v = m && m[clave];
    return (typeof v === "number" && v > 0) ? v : 1;
  }
  /* el bonus al poder de TUS acciones: `duelo` pega siempre, y arranque/final
     según el tiempo — salir a matarlos los primeros veinte, o guardarse */
  function bonusAccion(st) {
    return bonusVida(st, "duelo") + (st.tiempo === 2 ? bonusVida(st, "final") : bonusVida(st, "arranque"));
  }
  function conBonusVida(st, lista) {
    var b = bonusAccion(st);
    if (b) for (var i = 0; i < lista.length; i++) lista[i].poder += b;
    return lista;
  }

  function accionesAtaque(st) {
    var A = st.bal.aguante, puedeT = puedeTirar(st), rend = rendido(st);
    var acc = [
      { id: "gambeta", n: "GAMBETA", ico: "", costo: A.costo_gambeta, poder: statCtrl(st, "gambeta"), bloqueada: rend },
      { id: "pase", n: "PASE", ico: "", costo: A.costo_pase, poder: statCtrl(st, "pase"), bloqueada: false },
      { id: "pared", n: "PARED (1-2)", ico: "", costo: A.costo_pared, poder: statCtrl(st, "pase") * 0.8 + mejorVinculo(st) * 0.2, bloqueada: rend || !hayCompaCerca(st), motivo: rend ? "SIN AGUANTE" : (!hayCompaCerca(st) ? "SIN COMPAÑERO CERCA" : null) },
      { id: "tiro", n: "TIRO", ico: "", costo: A.costo_tiro, poder: statCtrl(st, "tiro"), bloqueada: rend || !puedeT, motivo: !puedeT ? "LEJOS DEL ARCO" : (rend ? "SIN AGUANTE" : null) }
    ];
    if (rend) acc.forEach(function (a) { if (a.id !== "pase") { a.bloqueada = true; a.motivo = "SIN AGUANTE"; } });
    return conBonusVida(st, acc);
  }
  function accionesDefensa(st) {
    var A = st.bal.aguante, rend = rendido(st);
    return conBonusVida(st, [
      { id: "quite", n: "QUITE", ico: "", costo: A.costo_quite, poder: statCtrl(st, "fisico"), bloqueada: rend, motivo: rend ? "SIN AGUANTE" : null },
      { id: "corte", n: "CORTE DE PASE", ico: "", costo: A.costo_corte, poder: statCtrl(st, "velocidad"), bloqueada: false },
      { id: "bloqueo", n: "BLOQUEO", ico: "", costo: A.costo_bloqueo, poder: statCtrl(st, "fisico") * 0.55 + statCtrl(st, "aereo") * 0.45, bloqueada: rend, motivo: rend ? "SIN AGUANTE" : null }
    ]);
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
    var pesos = pesosCPU(st), r = rng(), acc = 0;
    var claves = Object.keys(pesos);
    for (var i = 0; i < claves.length; i++) { acc += pesos[claves[i]]; if (r < acc) return claves[i]; }
    return claves[claves.length - 1];
  }
  /* los pesos con que marca la CPU, ya corridos si te leyó la repetición */
  function pesosCPU(st) {
    var pesos = st.bal.partido.cpu_pesos, rep = repeticion(st, "ataque");
    if (!rep) return pesos;
    var out = {};
    Object.keys(pesos).forEach(function (k) { out[k] = pesos[k] * (1 - rep.k) + (k === CONTRA[rep.accion] ? rep.k : 0); });
    return out;
  }

  /* 25/oct, pedido de Rodri ("que no se gane apretando ENTER"): la CPU te lee
     la REPETICIÓN. Cada duelo anota lo que elegiste, con olvido; si una acción
     pasa de `desde` de lo último que hiciste, la CPU se corre hacia la que le
     gana, hasta peso_max: en ataque marca lo que le gana a tu jugada, en
     defensa evita lo que le gana tu defensa. Variar la deja en sus pesos de
     siempre. Perillas en balance.partido.lee_repeticion (activo false: como antes) */
  function leeCfg(st) { var L = st.bal.partido.lee_repeticion; return L && L.activo ? L : null; }
  function anotarEleccion(st, lado, accion) {
    if (!leeCfg(st)) return;
    var olvido = leeCfg(st).olvido;
    var m = (st.repeticion = st.repeticion || { ataque: {}, defensa: {} })[lado];
    Object.keys(m).forEach(function (k) { m[k] *= 1 - olvido; });
    m[accion] = (m[accion] || 0) + 1;
  }
  /* lo que te tienen leído de ese lado y cuánto se corren (k de 0 a peso_max), o null */
  function repeticion(st, lado) {
    var L = leeCfg(st), m = st.repeticion && st.repeticion[lado];
    if (!L || !m) return null;
    var tot = 0, top = null;
    Object.keys(m).forEach(function (k) { tot += m[k]; if (!top || m[k] > m[top]) top = k; });
    if (tot < L.min_peso) return null;
    var k = clamp((m[top] / tot - L.desde) / (1 - L.desde), 0, 1) * L.peso_max;
    return k > 0 ? { accion: top, k: k } : null;
  }
  /* defiendo: la intención oculta de la CPU, pareja entre las tres si no te leyó */
  function ataqueCPU(st, rng) {
    var tres = ["gambeta", "pase", "tiro"], rep = repeticion(st, "defensa"), r = rng();
    if (!rep) return tres[Math.floor(r * 3)];
    var w = tres.map(function (a) { return CONTRA[a] === rep.accion ? (1 - rep.k) / 3 : 1 / 3; });
    var tot = w[0] + w[1] + w[2], acc = 0;
    for (var i = 0; i < 3; i++) { acc += w[i] / tot; if (r < acc) return tres[i]; }
    return tres[2];
  }

  /* ---------- V6 §2 R3: el MEDIDOR DE ENVIÓN (mérito acumulado, no reflejo) ----------
     Se llena ganando quites, gambetas y duelos. Lleno, se gasta en POTENCIAR
     al equipo unos momentos o en una SÚPER DEFENSA que bloquea seguro. */
  function envionCfg(st) { return st.bal.envion || { max: 100, gana_duelo: 18, potencia_bonus: 10, potencia_ms: 20000 }; }
  /* la poda del 22/oct: balance.flags.envion en false lo apaga entero (no
     se llena ni se puede gastar, aunque la semana lo haya cargado) */
  function envionApagado(st) { return !!(st.bal.flags && st.bal.flags.envion === false); }
  function sumarEnvion(st, n) { if (envionApagado(st)) return; st.envion = clamp((st.envion || 0) + n, 0, envionCfg(st).max); }
  function envionLleno(st) { return !envionApagado(st) && (st.envion || 0) >= envionCfg(st).max; }
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

  /* ---------- V9 §7 · POR QUÉ SALIÓ ASÍ ----------
     El duelo aplana 4-5 factores en un solo número y hasta ahora devolvía solo
     el booleano: el término que decidió moría adentro de la función, y por eso
     el resultado se sentía un dado. Esto NO cambia ningún resultado — nombra
     el término que más movió la aguja con lo que ya estaba calculado.
     Vocabulario cerrado (el texto lo pone la UI):
       ajustado · lectura · cansado · entero · envion · megacosa · rival_fundido · parejo */
  function motivoDuelo(win, matriz, aporte, chance, roll) {
    if (!aporte) return "parejo";
    if (Math.abs(roll - chance) < 0.05) return "ajustado";          // por centímetros
    var leido = matriz === "leyeron" || matriz === "teEngano";      // te adivinaron
    if (leido !== win) return "lectura";                            // la matriz explica el resultado
    if (!win && aporte.aguante <= -2.5) return "cansado";
    if (win && aporte.aguante >= 2.5) return "entero";
    if (win && aporte.envion > 0) return "envion";
    if (!win && aporte.megaRival < 0) return "megacosa";
    if (win && aporte.rivalFrac < 0.35) return "rival_fundido";     // el tanque de la CPU en el piso
    return "parejo";
  }

  /* duelo del encuentro (ataque MÍO vs defensa CPU, o al revés) */
  function resolverDuelo(st, opts) {
    var rng = opts.rng || Math.random, bal = st.bal, B = bal.partido.matriz_bonus;
    var win, accionRival, matriz;
    /* R3: el ENVIÓN activo potencia al equipo entero unos momentos */
    var envBonus = envionActivo(st) ? (envionCfg(st).potencia_bonus || 10) : 0;
    /* V9 §7: el aguante entra ANTES de gastar — se guarda para poder contarlo */
    var bA = bonusAguante(st);
    var fracRival = clamp((st.aguanteRival || 0) / bal.aguante.max, 0, 1);
    var chance = 0, roll = 1, aporte = null, repetida = false;
    if (st.posesion === "mia") {
      var repA = repeticion(st, "ataque");
      accionRival = eleccionCPU(st, rng);
      anotarEleccion(st, "ataque", opts.accion);
      var atk = (opts.poder != null ? opts.poder : statCtrl(st, opts.accion === "tiro" ? "tiro" : opts.accion === "gambeta" ? "gambeta" : "pase")) + bA + envBonus;
      var def = poderRival(st);
      if (CONTRA[opts.accion] === accionRival) { def += B; matriz = "leyeron"; repetida = !!repA && repA.accion === opts.accion; }   // te adivinaron
      else { atk += B * 0.6; matriz = "zafaste"; }                                  // esquivaste la marca equivocada
      def += opts.bonusRival || 0;   // Feel B6: la megacosa defensiva del rival pega acá
      gastar(st, "mio", opts.costo || 0); gastar(st, "rival", (bal.aguante["costo_" + accionRival] || bal.aguante.max * 0.06));
      chance = Duel.duelChance(atk, def, bal.duelo);
      roll = rng();
      win = roll < chance;
      aporte = { aguante: bA, envion: envBonus, matriz: matriz === "leyeron" ? -B : B * 0.6, megaRival: -(opts.bonusRival || 0), rivalFrac: fracRival };
    } else {
      /* defiendo: la CPU "ataca" con intención oculta */
      var repD = repeticion(st, "defensa");
      accionRival = ataqueCPU(st, rng);
      anotarEleccion(st, "defensa", opts.accion);
      var defMio = (opts.poder != null ? opts.poder : 50) + bA + envBonus;
      var atkRiv = poderRival(st) + 4;
      if (CONTRA[accionRival] === opts.accion) { defMio += B; matriz = "leiste"; }  // le adivinaste la intención
      else { atkRiv += B * 0.6; matriz = "teEngano"; repetida = !!repD && repD.accion === opts.accion; }
      gastar(st, "mio", opts.costo || 0); gastar(st, "rival", (bal.aguante["costo_" + accionRival] || bal.aguante.max * 0.06));
      chance = Duel.duelChance(defMio, atkRiv, bal.duelo);
      roll = rng();
      win = roll < chance;
      aporte = { aguante: bA, envion: envBonus, matriz: matriz === "leiste" ? B : -B * 0.6, megaRival: 0, rivalFrac: fracRival };
    }
    if (win) sumarEnvion(st, envionCfg(st).gana_duelo);   // R3: el mérito se ACUMULA ganando
    /* ══════════════════════════════════════════════════════════════════════
       EL GOLPE FUERTE · la molestia que nunca nacía del partido.

       `this._golpeFuerte` se LEÍA en match.js al armar masterResultado y no lo
       escribía NADIE en todo el proyecto, así que `lunesDespues` devolvía
       siempre molestia:false y la rama de lesión entera estaba apagada: los 15
       puntos de energía de penal_molestia, y la acción CURAR, que sólo se
       ofrece si hay molestia y por lo tanto no se ofrecía nunca.

       El disparador NO inventa azar nuevo: es el momento en que el partido ya
       modela el castigo físico — perdés un duelo poniendo el CUERPO (quite o
       bloqueo) y el gasto te deja por debajo del umbral de rendido. "Te
       pasaron por arriba cuando ya no dabas más". Es autolimitado por
       construcción: sólo puede pasar con el tanque en el piso.
       ══════════════════════════════════════════════════════════════════════ */
    if (!win && st.posesion !== "mia" && (opts.accion === "quite" || opts.accion === "bloqueo")) {
      var yo = st.mios[st.ctrl];
      var pGolpe = bal.aguante.golpe_prob != null ? bal.aguante.golpe_prob : 0.35;
      if (yo && yo.aguante < bal.aguante.umbral_rendido && rng() < pGolpe) st.golpeFuerte = true;
    }
    saltoReloj(st, rng);
    return {
      win: win, accionRival: accionRival, matriz: matriz, repetida: repetida,
      chancePct: Math.round(chance * 100), roll: Math.round(roll * 1000) / 1000,
      aporte: aporte, motivo: motivoDuelo(win, matriz, aporte, chance, roll)
    };
  }

  /* efectos de mundo tras el duelo de ataque.
     V6 §2 R2: SEPARACIÓN POST-DUELO — el perdedor queda NOTABLEMENTE lejos,
     como el gambeteado del anime que queda tirado metros atrás. */
  /* r: lo que devolvió resolverDuelo, si lo hay. 22/oct, Rodri: cada gambeta
     ganada avanzaba lo mismo (212, 302, 392, 482). Ahora la base de la acción
     se estira con tu stat de esa acción (50 = la base), con lo holgado que
     ganaste el duelo y con haber esquivado su lectura; y salís hacia el
     costado contrario al que dejaste atrás. Perillas en balance.partido.avance. */
  function ganarAtaque(st, accion, rivalIdx, r) {
    var c = st.mios[st.ctrl];
    var sep = st.bal.partido.separacion_duelo || 90, AV = st.bal.partido.avance || {};
    var base = accion === "pared" ? sep * 0.7 : accion === "gambeta" ? sep : sep * 0.4;
    var stat = statCtrl(st, accion === "gambeta" ? "gambeta" : "pase");
    var holgura = r && r.chancePct != null ? clamp(r.chancePct / 100 - r.roll, 0, 1) : 0;
    var mult = 1 + (stat - 50) * (AV.por_punto_stat != null ? AV.por_punto_stat : 0.008)
      + holgura * (AV.por_holgura != null ? AV.por_holgura : 0.6)
      + (r && r.matriz === "zafaste" ? (AV.por_zafar != null ? AV.por_zafar : 0.15) : 0);
    c.x = clamp(c.x + base * clamp(mult, AV.min_mult || 0.7, AV.max_mult || 1.8), 14, st.W - 14);
    var dejado = rivalIdx != null ? st.rivales[rivalIdx] : null;
    if (dejado) {
      var lado = c.y >= dejado.y ? 1 : -1;
      c.y = clamp(c.y + lado * (AV.costado_px != null ? AV.costado_px : 40) * (0.4 + holgura), 20, st.H - 20);
    }
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
  /* riesgo de la LÍNEA DE PASE: quién está parado en el corredor y cuánto pesa.
     V6 §1 F3: uno que está detrás del pasador o pasado el receptor NO corta.
     V9 §7: se factorizó para que el pase pueda CONTAR por qué se lo cortaron. */
  function riesgoLinea(st, receptorIdx) {
    var c = st.mios[st.ctrl], j = st.mios[receptorIdx];
    var d = dist(j.x, j.y, c.x, c.y), riesgo = 0, quien = null;
    st.rivales.forEach(function (r) {
      if (r.pos === "ARQ") return;
      var t = ((r.x - c.x) * (j.x - c.x) + (r.y - c.y) * (j.y - c.y)) / (d * d || 1);
      if (t < 0.1 || t > 0.92) return;
      var px = c.x + (j.x - c.x) * t, py = c.y + (j.y - c.y) * t;
      var dr = dist(r.x, r.y, px, py);
      if (dr < 60 && (60 - dr) * 0.5 > riesgo) { riesgo = (60 - dr) * 0.5; quien = r; }
    });
    return { riesgo: riesgo, quien: quien, d: d };
  }
  function receptoresPase(st) {
    var bal = st.bal, c = st.mios[st.ctrl], out = [];
    st.mios.forEach(function (j, i) {
      if (i === st.ctrl || j.pos === "ARQ") return;
      var d = dist(j.x, j.y, c.x, c.y);
      if (d > bal.partido.pase_radio) return;
      var riesgo = riesgoLinea(st, i).riesgo;
      var pct = 68 + (statCtrl(st, "pase") - 50) * 0.5 + ((j.stats.pase || 50) - 50) * 0.2 + (j.vinculo || 0) * 0.12 - riesgo;
      if (d > 200) pct -= (d - 200) * bal.partido.pase_penal_lejano;
      out.push({ idx: i, nombre: j.nombre, pos: j.pos, adelante: j.x > c.x + 20, pct: clamp(Math.round(pct), 15, 95), d: Math.round(d), riesgo: Math.round(riesgo) });
    });
    out.sort(function (a, b) { return b.pct + (b.adelante ? 6 : 0) - (a.pct + (a.adelante ? 6 : 0)); });
    return out.slice(0, 4);
  }
  function resolverPase(st, receptorIdx, pct, rng) {
    rng = rng || Math.random;
    var o = st.mios[st.ctrl];
    var dPase = dist(o.x, o.y, st.mios[receptorIdx].x, st.mios[receptorIdx].y);
    var rl = riesgoLinea(st, receptorIdx);          // V9 §7: quién estaba en la línea
    gastar(st, "mio", st.bal.aguante.costo_pase);
    var FL = st.bal.flujo;
    saltoReloj(st, rng, FL && FL.activo ? FL.reloj.pase : 1);
    var roll = rng() * 100;
    var win = roll < pct;
    if (win) {
      st.ctrl = receptorIdx;                       // el control VIAJA con el pase
      var r = st.mios[receptorIdx];
      st.pelota.x = r.x + 12; st.pelota.y = r.y;
      st.cooldown = st.bal.ritmo.cooldown_encuentro_ms; st.modo = "juego";
      marcarPelotaAlta(st, dPase);                 // Anime F: el pase LARGO llega alto
    } else {
      perderPelota(st, rng);
    }
    /* V9 §7: el pase cuenta POR QUÉ salió así — tapado (había uno en la línea),
       largo (la distancia se comió el porcentaje) o ajustado (por centímetros) */
    var motivo = Math.abs(roll - pct) < 8 ? "ajustado"
      : (rl.riesgo >= 12 ? "tapado" : (dPase > 200 ? "largo" : "limpio"));
    return { win: win, pct: Math.round(pct), riesgo: Math.round(rl.riesgo), motivo: motivo };
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
    j.aguante = clamp(j.aguante + st.bal.aguante.recupera_no_moverse, 0, techoAguante(j, st.bal));
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
  /* grande: el remate es una jugada grande tuya (EL TOQUE, el tiro libre;
     el especial lo es siempre) y suma el ÁNIMO de la semana, st.animoGrande
     (23/oct, pedido de Rodri, balance.semana.cuatro) */
  function prepararRemate(st, esCalden, rng, grande) {
    var j = st.mios[st.ctrl], P = st.bal.partido, C = P.calden;
    var mega = (esCalden && typeof esCalden === "object") ? esCalden : null;
    var especial = !!esCalden;
    var poder = (j.stats.tiro || 50) + (j.stats.caracter || 50) * 0.12 + bonusAguante(st);
    var d = dist(j.x, j.y, st.W, st.H / 2);
    /* G1: la distancia YA NO se descuenta del poder. Restarle fuerza al remate
       no alcanzaba, porque duelChance está topeada en 0.95 y el descuento se
       comía adentro del tope: con tiro 85 daba 95% desde el área y 91% desde
       el campo propio. Ahora la distancia viaja cruda hasta resolveShot, que
       la aplica como factor DESPUÉS del tope (balance.tiro). El especial la
       aguanta mejor —media_vida_especial— pero tampoco es inmune, que era el
       otro agujero: el Caldén ni siquiera la calculaba. */
    /* pase al vacío reciente: el arquero quedó vendido */
    var vendido = st._vendidoHasta && st._t < st._vendidoHasta;
    if (vendido) { poder += P.bonus_arquero_vendido; st._vendidoHasta = 0; }
    /* N2 · EL RIVAL TE LEE. La penalización se aplica sobre el multiplicador
       del especial, no sobre el poder base: te sacan lo que el especial te
       daba de más, nunca te dejan peor que pateando normal. */
    var idEsp = mega ? (mega.id || "mega") : (especial ? "calden" : null);
    var bonusArq = 0, quedaDeEspecial = especial ? 1 : 0, factorLectura = 1;
    if (idEsp && Lect && st.lectura) {
      var lec = Lect.lectura(st.lectura, idEsp, st.minuto, st.bal.lectura);
      var pen = Lect.penalidad(lec, st.bal.lectura);
      var mult = mega ? (mega.mult || 1.3) : C.mult;
      poder *= 1 + (mult - 1) * (1 - pen);
      /* D2 · LA LECTURA VIAJA COMO FACTOR, no como parche.
         Antes acá había dos parches para esquivar el tope de duelChance: subirle
         la capacidad al arquero y sacarle metros al especial. El primero
         desaparece — ahora la penalización entra por resolveShot como factor
         sobre la chance final, que es la vía única que dejó D2 y que se nota
         siempre. El bonus al arquero queda en 0 y se conserva la perilla en
         balance por si Rodri quiere volver al comportamiento viejo. */
      var frac = pen / ((st.bal.lectura && st.bal.lectura.penal_max) || 0.42);
      bonusArq = frac * ((st.bal.lectura && st.bal.lectura.arquero_bonus_max) || 0);
      factorLectura = 1 - pen;
      /* y pierde metros: un especial leído deja de aguantar la distancia que
         aguantaba y termina llegando como un tiro normal */
      quedaDeEspecial = 1 - frac;
      Lect.registrar(st.lectura, idEsp, st.minuto, st.bal.lectura);
    }
    else if (mega) poder *= (mega.mult || 1.3);
    else if (especial) poder *= C.mult;
    /* el bonus de la fecha, para las CUATRO vias de remate. Antes se sumaba a
       mano en tiroPorComandos y solo ahi: el mismo evento pegaba o no segun por
       donde hubieras entrado al tiro. */
    poder += bonusAccion(st);
    var animo = (grande || especial) && j.esVos ? (st.animoGrande || 0) : 0;
    poder += animo;
    gastar(st, "mio", mega ? (mega.aguante || st.bal.aguante.costo_calden) : (especial ? st.bal.aguante.costo_calden : st.bal.aguante.costo_tiro));
    saltoReloj(st, rng);
    return { shotPower: poder, keeperSkill: st.rivalKeeperSkill + bonusArq, arqueroVendido: !!vendido,
      distancia: Math.round(d), especial: especial ? quedaDeEspecial : false,
      lecturaArq: Math.round(bonusArq * 10) / 10, animo: animo,
      /* la vía única de D2: quien resuelve el remate se lo pasa tal cual a
         resolveShot y no tiene que saber cómo se aplica */
      penalizaciones: factorLectura < 1 ? [{ id: "lectura", factor: factorLectura }] : [] };
  }
  /* LA METISTE VOS. `this._hiceGol` se LEIA en match.js al armar
     masterResultado y no lo escribia NADIE en todo el proyecto: el bonus de
     animo por meterla vos (semana.animo_gol = 6) no se cobraba nunca. Metieras
     tres goles o ninguno, el lunes te daba lo mismo mientras el resultado
     fuera el mismo. Ahora la marca vive en el ESTADO, que es lo que se puede
     simular, y la pone el unico lugar por el que entra un gol tuyo. */
  function golMio(st, quien) {
    st.golesMio++;
    var j = quien || st.mios[st.ctrl];
    if (j && j.esVos) { st.hiceGol = true; st.golesVos = (st.golesVos | 0) + 1; }
    /* 23/oct, Rodri: el gol de un compañero se festejaba como tuyo. El
       saque del medio cambia st.ctrl antes de que la escena festeje, así
       que quién la metió se guarda acá (índice en st.mios). */
    st.goleador = st.mios.indexOf(j);
    kickoff(st, "rival");
  }
  /* ══════════════════════════════════════════════════════════════════════
     A4 · LOS CUATRO DESENLACES DEL REMATE.

     El reporte de Rodri: "la pelota vuelve al medio después de la atajada".

     Los cuatro terminaban en DOS funciones. El gol en kickoff() —bien— y los
     otros tres en tiroFallado(), que era una línea: perderPelota(). Y
     perderPelota() es la función de TE ROBARON EN JUEGO: le da la pelota al
     rival de campo MÁS CERCA DEL QUE LA PERDIÓ (excluyendo explícitamente al
     arquero), lo corre 54 px para atrás y te pasa el control a tu mejor
     marcador, que está en tu mitad.

     O sea: el arquero rival atajaba, la pelota le aparecía en los pies a un
     defensor cerca del área, y a vos te mudaban a un central en tu campo. Lo
     que se ve es exactamente lo que dijo Rodri — la jugada se teletransporta
     al medio. Igual la de afuera, que debería ser saque de arco.

     Cuatro desenlaces distintos necesitan cuatro reinicios distintos, y el
     único que importa distinguir acá es de quién es la pelota y DÓNDE:

       gol       kickoff(st, "rival")   desde el medio          (ya estaba)
       córner    cornerMio(st)          tuya, desde el vértice  (ya estaba)
       atajada   saqueArquero(st)       del arquero rival, en su área
       afuera    saqueArquero(st)       saque de arco, mismo lugar

     Los dos últimos comparten función porque la consecuencia de juego es la
     misma —la tiene el arquero y va a sacar— y se distinguen por el motivo,
     que es lo que cuenta el relator y lo que mira la escena.
     ══════════════════════════════════════════════════════════════════════ */
  function saqueArquero(st, motivo) {
    var iArq = -1;
    for (var i = 0; i < st.rivales.length; i++) if (st.rivales[i].pos === "ARQ") { iArq = i; break; }
    /* sin arquero declarado no hay a quién dársela: se cae a lo de antes, que
       es feo pero no rompe. No debería pasar nunca; si pasa, queda anotado. */
    if (iArq < 0) { st._saqueSinArquero = (st._saqueSinArquero || 0) + 1; perderPelota(st); return { motivo: motivo, arquero: false }; }
    var arq = st.rivales[iArq];
    st.posesion = "rival"; st.modo = "juego";
    st.cooldown = st.bal.ritmo.cooldown_encuentro_ms;
    /* el arquero vuelve a SU lugar: ax ya es donde lo puso la formación
       (W - linea.ax para el rival), así que no hace falta una perilla nueva —
       el dato ya estaba y es el que manda en todo el resto del partido. */
    arq.x = clamp(arq.ax, 12, st.W - 12);
    arq.y = (arq.banda[0] + arq.banda[1]) / 2;
    st.portadorRival = iArq;
    st.pelota.x = arq.x - 12;
    st.pelota.y = arq.y;
    /* los tuyos vuelven a su posición: la jugada terminó, se rearma el equipo.
       Es lo que hace que se LEA como un saque de arco y no como un robo. */
    st.mios.forEach(function (j) {
      j.x = clamp(j.ax, 12, st.W - 12);
      j.y = (j.banda[0] + j.banda[1]) / 2;
    });
    /* y el control queda en el que va a recibir el saque, no en un central
       cualquiera: el más cercano a la pelota que no sea tu arquero */
    st.ctrl = masCercanoAPelota(st);
    st._perdioIdx = -1;
    st._perdioHasta = 0;
    /* el arquero la pisa un momento: te da tiempo de armarte, igual que el
       saque del medio. Sin esto, saca de una y no llegás a acomodarte. */
    st.esperaRival = st.bal.ritmo.arranque_rival_ms;
    st.ultimoSaque = motivo || "saque";
    return { motivo: motivo, arquero: true, arqueroIdx: iArq };
  }
  /* la vieja tiroFallado queda como alias: había un solo llamador por fuera de
     acá y no vale la pena romper una firma pública por un rename. */
  function tiroFallado(st, rng) { return saqueArquero(st, "atajada"); }

  /* G1 · LA SACÓ AL CÓRNER. El arquero llegó pero no la retuvo, así que la
     jugada sigue siendo tuya: no perdés la pelota, la reponés desde el vértice.
     No hay escena de saque de esquina —eso sería otra tanda—, pero la
     consecuencia de juego SÍ existe y es distinta de "la agarró", que es lo que
     hace que los dos resultados signifiquen algo. */
  function cornerMio(st, rng) {
    rng = rng || Math.random;
    var P = st.bal.partido;
    var arriba = rng() < 0.5;
    var j = st.mios[st.ctrl];
    st.posesion = "mia";
    j.x = st.W - (P.corner_x || 30);
    j.y = arriba ? (P.corner_y || 40) : st.H - (P.corner_y || 40);
    /* A4 · LA PELOTA TAMBIÉN. Esto movía al jugador al vértice y dejaba la
       pelota donde había terminado el remate, a 100 px de distancia: ibas a
       sacar el córner y la pelota estaba en el área. Todas las demás funciones
       de posesión la ponen al pie (ganarDefensa, perderPelota, kickoff); esta
       era la única que se olvidaba. */
    st.pelota.x = j.x - 12;
    st.pelota.y = j.y;
    st.corners = (st.corners || 0) + 1;
    /* TANDA 1.0 · EL CÓRNER CONGELABA EL PARTIDO. Todo córner llega con
       st.modo = "congelado" (lo pone tick() en el encuentro o la escena al
       abrir el remate), y esta era la ÚNICA salida de un remate que no lo
       devolvía a "juego": kickoff y saqueArquero sí. Como tick() sale en su
       primer renglón si el modo no es "juego", después de "¡LA SACÓ AL
       CÓRNER!" el reloj quedaba parado, las flechas muertas y el partido no
       podía terminar, hasta que alguien tocara ACCIÓN. Medido en node: 50
       ticks con input daban minuto +0 y x +0; en 400 partidos simulados hubo
       0,94 congelamientos por partido, en el 58-63% de los partidos.
       La escena no corre la sim fuera de LIBRE, así que dejarlo en "juego"
       acá no adelanta nada mientras se ve la escena: arranca cuando vuelve. */
    st.modo = "juego";
    st.cooldown = st.bal.ritmo.cooldown_encuentro_ms;
    /* el saque es tuyo: si la pelota venía de un rival que la pisaba, esa
       espera no tiene por qué cruzar al córner */
    st.esperaRival = 0;
    return { corner: true, arriba: arriba };
  }

  /* ---------- el remate RIVAL contra tu arquero ---------- */
  function opcionesArquero(st) {
    var arq = st.mios.find(function (j) { return j.pos === "ARQ"; }) || { stats: {} };
    /* el efecto `keeper` del evento entra ACA. Antes la escena lo escribia en
       arq.stats.quite, un campo que no existe en el esquema (pase, tiro,
       gambeta, velocidad, resistencia, fisico, aereo, caracter) y que nadie lee
       para el arquero: los dos eventos que premian cuidarlo no cambiaban una
       sola atajada. */
    var base = (arq.stats.fisico || 50) * 0.7 + (arq.stats.caracter || 50) * 0.4 + bonusVida(st, "keeper");
    return [
      { id: "atajar", n: "ATAJAR", ico: "", poder: base, riesgo: "retiene, más difícil" },
      { id: "despejar", n: "DESPEJAR", ico: "", poder: base + 8, riesgo: "más seguro · pelota dividida" }
    ];
  }
  /* esGol: el resultado ya decidido afuera (el penal, logic/penal.js); el
     estado del partido se mueve igual que con el duelo */
  function resolverAtajada(st, eleccion, rng, bonus, esGol) {
    rng = rng || Math.random;
    var ops = opcionesArquero(st);
    var op = ops.find(function (o) { return o.id === eleccion; }) || ops[0];
    op = { id: op.id, n: op.n, poder: op.poder + (bonus || 0) };   // Feel B6: MEGAATAJADA suma acá
    var atkRiv = poderRival(st) + 12;
    gastar(st, "rival", st.bal.aguante.costo_tiro);
    saltoReloj(st, rng);
    var ataja = esGol != null ? !esGol : rng() < Duel.duelChance(op.poder, atkRiv, st.bal.duelo);
    if (!ataja) { st.golesRival++; kickoff(st, "mia"); return { golRival: true, eleccion: eleccion }; }
    if (eleccion === "despejar") {
      /* dividida al medio: 50/50 */
      var mia = rng() < 0.5;
      if (mia) { st.posesion = "mia"; st.ctrl = masCercanoAPelota(st); st.pelota.x = st.W / 2; st.pelota.y = st.H / 2; st.modo = "juego"; st.cooldown = st.bal.ritmo.cooldown_encuentro_ms; reubicar(st); }
      else { st.posesion = "rival"; st.portadorRival = st.rivales.length - 2; st.rivales[st.portadorRival].x = st.W / 2; st.rivales[st.portadorRival].y = st.H / 2; st.pelota.x = st.W / 2; st.pelota.y = st.H / 2; st.ctrl = masCercanoAPelota(st); st.modo = "juego"; st.cooldown = st.bal.ritmo.cooldown_encuentro_ms; }   // auto-switch: marcás con el más cercano a la dividida
      return { golRival: false, dividida: true, mia: mia, eleccion: eleccion };
    }
    /* atajó y retiene: salís jugando desde tu área. 22/oct, Rodri: arrancaba
       siempre en el mismo lugar (200, al medio). El arquero se la da a uno de
       los dos defensores del lado contrario al remate, donde hay espacio, y
       la saca más larga cuanto mejor es: el físico del arquero corre la
       salida y el resto lo pone cómo quedó la jugada. Perillas en
       balance.partido.salida_arquero. */
    st.posesion = "mia";
    var SA = st.bal.partido.salida_arquero || {};
    var tirador = st.rivales[st.portadorRival] || { y: st.H / 2 };
    var defs = [];
    st.mios.forEach(function (j, i) { if (j.pos === "DEF") defs.push(i); });
    defs.sort(function (a, b) { return Math.abs(st.mios[b].y - tirador.y) - Math.abs(st.mios[a].y - tirador.y); });
    st.ctrl = defs.length ? defs[Math.floor(rng() * Math.min(2, defs.length))] : st.ctrl;
    var arqM = st.mios.find(function (j) { return j.pos === "ARQ"; }) || { stats: {} };
    var d0 = st.mios[st.ctrl];
    var xs = SA.x || [160, 300];
    d0.x = clamp(xs[0] + ((arqM.stats.fisico || 50) - 50) * (SA.por_fisico != null ? SA.por_fisico : 1.2) + rng() * (xs[1] - xs[0]), 120, st.W / 2 - 40);
    d0.y = clamp((d0.banda[0] + d0.banda[1]) / 2 + (rng() - 0.5) * (SA.y_juego || 60), 30, st.H - 30);
    st.pelota.x = d0.x + 12; st.pelota.y = d0.y;
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
    bonusVida: bonusVida, multVida: multVida, bonusAccion: bonusAccion,
    quiteDe: quiteDe, nivelArqueroDe: nivelArqueroDe, techoAguante: techoAguante,
    saltoReloj: saltoReloj, chequearTiempo: chequearTiempo, entretiempo: entretiempo,
    accionesAtaque: accionesAtaque, accionesDefensa: accionesDefensa,
    receptorAlVacio: receptorAlVacio, resolverPaseAlVacio: resolverPaseAlVacio, esperarDefensa: esperarDefensa,
    resolverDuelo: resolverDuelo, ganarAtaque: ganarAtaque, perderPelota: perderPelota,
    ganarDefensa: ganarDefensa, perderDefensa: perderDefensa,
    receptoresPase: receptoresPase, resolverPase: resolverPase,
    riesgoLinea: riesgoLinea, motivoDuelo: motivoDuelo,
    puedeTirar: puedeTirar, puedeCalden: puedeCalden, prepararRemate: prepararRemate,
    golMio: golMio, tiroFallado: tiroFallado, cornerMio: cornerMio,
    saqueArquero: saqueArquero,   // A4: atajada y afuera dejan la pelota en el arquero rival
    opcionesArquero: opcionesArquero, resolverAtajada: resolverAtajada,
    repeticion: repeticion, pesosCPU: pesosCPU,
    cambiarA: cambiarA, cambiarAlMasCercano: cambiarAlMasCercano,
    poderRival: poderRival, rendido: rendido, masCercanoAPelota: masCercanoAPelota,
    mejorMarcador: mejorMarcador, segPorMinuto: segPorMinuto,
    pelotaAltaVigente: pelotaAltaVigente, accionesAereas: accionesAereas,
    prepararRemateAereo: prepararRemateAereo, bajarla: bajarla,
    sumarEnvion: sumarEnvion, envionLleno: envionLleno, envionActivo: envionActivo,
    gastarEnvionPotencia: gastarEnvionPotencia, gastarEnvionSuper: gastarEnvionSuper
  };
});
