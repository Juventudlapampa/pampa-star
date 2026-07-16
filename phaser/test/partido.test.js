/* ============================================================================
   PAMPA STAR · test de la lógica pura del partido (node, sin dependencias)
   Corré:  node phaser/test/partido.test.js
   ========================================================================== */
"use strict";
var P = require("../logic/partido.js");
var fs = require("fs"), path = require("path");
var bal = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/balance.json"), "utf8"));

var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.error("  ✗ " + m); } }
function seq(vals) { var i = 0; return function () { return vals[i++ % vals.length]; }; }

function partidoNuevo(rng) {
  var mios = [{ nombre: "Arquero", pos: "ARQ" }];
  for (var i = 0; i < 10; i++) mios.push({ nombre: "Compa " + i, pos: "X" });
  mios[8] = { nombre: "Vos", esVos: true };
  return P.crearPartido({ bal: bal, mios: mios, rivales: [], rng: rng || Math.random });
}

/* ---- 1) creación: 11 por lado, VOS con la pelota, formación en cancha ---- */
(function () {
  var st = partidoNuevo(seq([0.5]));
  ok(st.mios.length === 11 && st.rivales.length === 11, "11 por lado (fueron " + st.mios.length + "/" + st.rivales.length + ")");
  ok(st.mios.filter(function (j) { return j.pos === "ARQ"; }).length === 1, "exactamente 1 ARQ mío");
  ok(st.mios[st.ctrl].esVos, "VOS arrancás con la pelota");
  ok(st.posesion === "mia" && st.modo === "juego", "arranca jugando en posesión mía");
  /* Feel B2: el saque es de fútbol — cada equipo EN SU MITAD, pelota al centro */
  ok(st.mios.every(function (j) { return j.x <= st.W / 2; }), "ninguno de los míos arranca en campo rival");
  ok(st.rivales.every(function (j) { return j.x >= st.W / 2; }), "ningún rival arranca en mi campo");
  ok(Math.abs(st.pelota.x - st.W / 2) <= 20 && Math.abs(st.pelota.y - st.H / 2) < 1, "la pelota sale del círculo central");
  P.golMio(st);   // tras el gol: saque del que lo recibió, todos reposicionados
  ok(st.posesion === "rival" && st.rivales.every(function (j) { return j.x >= st.W / 2; }), "tras tu gol: saca el rival desde el centro, cada uno en su mitad");
  console.log("[1] creación 11v11 + saque real: ok");
})();

/* ---- 2) reloj: corre en juego, entretiempo y final con descuento oculto ---- */
(function () {
  var st = partidoNuevo(seq([0.0]));   // descuento mínimo
  ok(st.desc1 >= bal.ritmo.descuento_min && st.desc1 <= bal.ritmo.descuento_max, "descuento en rango");
  st.cooldown = 9e9;                    // aislar el reloj: sin encuentros en este test
  st.minuto = 44.9 + st.desc1;
  var evs = [];
  for (var i = 0; i < 400 && !evs.length; i++) evs = P.tick(st, 100, null);
  ok(evs.length && evs[0].tipo === "entretiempo", "pita el entretiempo tras 45+descuento (evento: " + (evs[0] && evs[0].tipo) + ")");
  P.entretiempo(st);
  ok(st.tiempo === 2 && st.minuto === 45 && st.posesion === "rival", "2T: saca el rival, minuto 45");
  st.cooldown = 9e9;
  st.minuto = 89.9 + st.desc2;
  evs = [];
  for (i = 0; i < 400 && !evs.length; i++) evs = P.tick(st, 100, null);
  ok(evs.length && evs[0].tipo === "final", "pita el final tras 90+descuento");
  console.log("[2] reloj + entretiempo + final: ok");
})();

/* ---- 3) CALIBRACIÓN: el defensor que cierra es MÁS RÁPIDO que tu portador ---- */
(function () {
  ok(bal.ritmo.defensor_cerrando > bal.ritmo.portador_con_pelota, "defensor_cerrando > portador (te alcanzan)");
  var st = partidoNuevo();
  var masCerca = function () {
    var c = st.mios[st.ctrl];
    return Math.min.apply(null, st.rivales.filter(function (j) { return j.pos !== "ARQ"; })
      .map(function (j) { return Math.hypot(j.x - c.x, j.y - c.y); }));
  };
  var d0 = masCerca();
  st.cooldown = 999999;   // sin encuentro para medir la persecución
  for (var i = 0; i < 30; i++) P.tick(st, 100, { dx: 1, dy: 0 });   // corro hacia el arco
  var d1 = masCerca();
  ok(d1 < d0, "no te escapás: el rival más cercano se ACERCA aunque corras (d " + Math.round(d0) + "→" + Math.round(d1) + ")");
  console.log("[3] calibración (te alcanzan): ok");
})();

/* ---- 4) AGUANTE: perseguir drena; rendido trota y bloquea acciones caras ---- */
(function () {
  var st = partidoNuevo();
  st.posesion = "rival"; st.portadorRival = 9; st.cooldown = 999999;
  st.rivales[9].x = 900; st.rivales[9].y = 60;   // lejos: no hay encuentro
  var j = st.mios[st.ctrl], a0 = j.aguante;
  for (var i = 0; i < 20; i++) P.tick(st, 250, { dx: 1, dy: 0 });   // 5s persiguiendo
  ok(j.aguante < a0, "perseguir drena aguante (" + a0 + "→" + j.aguante.toFixed(1) + ")");
  j.aguante = bal.aguante.umbral_rendido - 5;
  var acc = P.accionesAtaque(st);
  var gam = acc.find(function (a) { return a.id === "gambeta"; }), pas = acc.find(function (a) { return a.id === "pase"; });
  ok(gam.bloqueada, "rendido: gambeta bloqueada");
  ok(!pas.bloqueada, "rendido: el pase sigue disponible");
  /* E5: RECUPERACIÓN sin pelota — un compañero que no marca ni conduce respira */
  var st2 = partidoNuevo();
  st2.cooldown = 999999;
  var otro = st2.mios.findIndex(function (x, i) { return i !== st2.ctrl && x.pos === "VOL"; });
  st2.mios[otro].aguante = 500;
  for (var k = 0; k < 10; k++) P.tick(st2, 1000, null);   // 10 segundos
  var esperado = bal.aguante.recuperacion_por_segundo * 10;
  ok(Math.abs(st2.mios[otro].aguante - 500 - esperado) < 0.01, "regen sin pelota ≈ " + esperado + "/10s (dio +" + (st2.mios[otro].aguante - 500).toFixed(2) + ")");
  /* E5: el salto de reloj también recupera (y al tanque rival) */
  var riv0 = st2.aguanteRival = 500;
  st2.mios[otro].aguante = 500;
  P.saltoReloj(st2, seq([0.5]));
  ok(st2.mios[otro].aguante > 500 && st2.aguanteRival > riv0, "el salto de reloj regenera a ambos lados");
  console.log("[4] aguante, rendido y recuperación: ok");
})();

/* ---- 5) MATRIZ: que te lean la jugada tiene que doler ---- */
(function () {
  var st = partidoNuevo();
  st.posesion = "mia";
  // CPU siempre elige quite (peso r=0 → primera clave)
  var winsLeido = 0, winsZafado = 0, N = 3000;
  for (var i = 0; i < N; i++) {
    var st2 = partidoNuevo(); st2.posesion = "mia";
    var r1 = P.resolverDuelo(st2, { accion: "gambeta", costo: 0, rng: seq([0.0, 0.5]) });  // rng1: CPU elige quite (lee) · rng2: tirada
    if (r1.matriz === "leyeron" && r1.win) winsLeido++;
    var st3 = partidoNuevo(); st3.posesion = "mia";
    var r2 = P.resolverDuelo(st3, { accion: "pase", costo: 0, rng: seq([0.0, 0.5]) });     // CPU quite pero vos pasás (zafás)
    if (r2.matriz === "zafaste" && r2.win) winsZafado++;
  }
  ok(winsZafado > winsLeido, "zafar la matriz gana MÁS que ser leído (" + winsZafado + " > " + winsLeido + ")");
  console.log("[5] matriz de ventajas: ok (" + winsLeido + " vs " + winsZafado + " en " + N + ")");
})();

/* ---- 6) PASES: el control viaja con el pase; la CPU roba si falla ---- */
(function () {
  var st = partidoNuevo();
  var rs = P.receptoresPase(st);
  ok(rs.length > 0 && rs.length <= 4, "hay receptores (" + rs.length + ")");
  ok(rs.every(function (r) { return r.pct >= 15 && r.pct <= 95; }), "pct acotado");
  var antes = st.ctrl;
  var res = P.resolverPase(st, rs[0].idx, 100, seq([0.0]));   // pase seguro
  ok(res.win && st.ctrl === rs[0].idx && st.ctrl !== antes, "el control viajó al receptor");
  var res2 = P.resolverPase(st, rs[0].idx, 0, seq([0.99]));   // pase imposible
  ok(!res2.win && st.posesion === "rival", "pase interceptado → posesión rival");
  console.log("[6] pases: ok");
})();

/* ---- 7) TIRO y CALDÉN por condición; el remate usa resolveShot (bug cerrado) ---- */
(function () {
  var st = partidoNuevo();
  st.mios[st.ctrl].x = 400;
  ok(!P.puedeTirar(st), "lejos: no podés tirar");
  st.mios[st.ctrl].x = st.W - 100;
  ok(P.puedeTirar(st), "cerca: podés tirar");
  ok(P.puedeCalden(st), "VOS + posición + aguante: Caldén habilitado");
  st.mios[st.ctrl].aguante = bal.aguante.costo_calden - 1;   // agnóstico de la escala de aguante
  ok(!P.puedeCalden(st), "sin aguante: Caldén bloqueado");
  st.mios[st.ctrl].aguante = bal.aguante.max;
  var prep = P.prepararRemate(st, true);
  ok(prep.shotPower > 0 && prep.keeperSkill > 0, "prepararRemate da los parámetros para duel.resolveShot");
  // invariante del arquero (integración): resolveShot jamás da gol si el arquero gana
  var D = require("../logic/duel.js");
  var r = D.resolveShot({ shotPower: prep.shotPower, keeperSkill: 999, zone: { bonus: 0, fuera: 0, gy: 0 }, rng: seq([0.99]) });
  ok(r.keeperWins && r.outcome !== "gol", "bug del arquero sigue cerrado en el flujo del partido");
  console.log("[7] tiro + Caldén + arquero: ok");
})();

/* ---- 8) REMATE RIVAL: atajar/despejar y gol rival correcto ---- */
(function () {
  var st = partidoNuevo();
  st.posesion = "rival";
  var ops = P.opcionesArquero(st);
  ok(ops.length === 2 && ops[1].poder > ops[0].poder, "despejar es más seguro que atajar");
  var res = P.resolverAtajada(st, "atajar", seq([0.99]));    // falla la atajada
  ok(res.golRival && st.golesRival === 1 && st.posesion === "mia", "gol rival → sacás vos");
  st.posesion = "rival";
  var res2 = P.resolverAtajada(st, "atajar", seq([0.0]));    // ataja
  ok(!res2.golRival && res2.retiene && st.posesion === "mia", "atajó y retiene → salís jugando");
  console.log("[8] remate rival: ok");
})();

/* ---- 9) cambio de jugador: libre en defensa, nunca al ARQ ---- */
(function () {
  var st = partidoNuevo();
  st.posesion = "rival";
  var arq = st.mios.findIndex(function (j) { return j.pos === "ARQ"; });
  ok(!P.cambiarA(st, arq), "no se puede tomar el ARQ");
  var def = st.mios.findIndex(function (j) { return j.pos === "DEF"; });
  ok(P.cambiarA(st, def) && st.ctrl === def, "cambio libre a un DEF");
  st.posesion = "mia";
  ok(!P.cambiarA(st, def + 1), "en ataque no hay cambio manual (el control viaja con el pase)");
  console.log("[9] cambio de jugador: ok");
})();

/* ---- 10) ANIME v4 G: tempo — jugadores lentos, PARTIDO CORTO ---- */
(function () {
  /* V6: con reloj a saltos, el continuo es solo GOTEO; la jerarquía de fallbacks se sostiene */
  ok(P.segPorMinuto(bal) === bal.tempo.goteo_seg_por_minuto, "con minutos_por_momento el continuo es el goteo");
  var soloDur = JSON.parse(JSON.stringify(bal)); delete soloDur.tempo.minutos_por_momento;
  ok(Math.abs(P.segPorMinuto(soloDur) - (bal.tempo.duracion_real_min * 60) / 90) < 1e-9, "sin momentos cae a duracion_real_min (v4)");
  var sinTempo = JSON.parse(JSON.stringify(bal)); delete sinTempo.tempo;
  ok(P.segPorMinuto(sinTempo) === bal.ritmo.seg_por_minuto, "sin tempo cae al seg_por_minuto clásico");
  var st = partidoNuevo();
  st.cooldown = 9e9;
  var m0 = st.minuto;
  P.tick(st, 1000, null);
  ok(Math.abs((st.minuto - m0) - 1 / P.segPorMinuto(bal)) < 1e-6, "el reloj corre al ritmo del tempo");
  console.log("[10] tempo v4 (partido corto): ok");
})();

/* ---- 11) ANIME v4 A: marcador automático con preferencia por el bien parado ---- */
(function () {
  var st = partidoNuevo();
  st.posesion = "rival"; st.modo = "juego"; st.esperaRival = 0; st.cooldown = 9e9;
  st.pelota.x = 500; st.pelota.y = 340;
  var iA = st.mios.findIndex(function (j) { return j.pos === "VOL"; });
  var iB = st.mios.findIndex(function (j, k) { return j.pos === "VOL" && k !== iA; });
  st.mios.forEach(function (j) { j.x = 100; j.y = 60; });   // todos lejos
  st.mios[iA].x = 560; st.mios[iA].y = 340;                 // d=60 pero DETRÁS de la pelota
  st.mios[iB].x = 430; st.mios[iB].y = 340;                 // d=70 y ENTRE la pelota y tu arco
  ok(P.mejorMarcador(st) === iB, "prefiere al que está entre la pelota y tu arco");
  st.ctrl = st.mios.findIndex(function (j, k) { return j.pos === "DEF" && k !== iA && k !== iB; });
  st.mios[st.ctrl].x = 100; st.mios[st.ctrl].y = 600;       // el actual quedó lejísimos
  P.tick(st, 16, null);
  ok(st.ctrl === iB, "el tick cambió solo al mejor marcador");
  var iC = st.mios.findIndex(function (j, k) { return j.pos === "DEF" && k !== st.ctrl; });
  P.cambiarA(st, iC);
  P.tick(st, 16, null);
  ok(st.ctrl === iC, "tras el cambio manual, el automático respeta tu elección");
  st._noAutoHasta = 0;
  P.tick(st, 16, { dx: 1, dy: 0 });
  ok(st.ctrl === iC, "con input activo no te saca el marcador de las manos");
  console.log("[11] marcador automático v4: ok");
})();

/* ---- 12) ANIME v4 F: pelota alta y tiros situacionales ---- */
(function () {
  var st = partidoNuevo();
  /* pase corto: NO viene alta */
  var rs = P.receptoresPase(st);
  var cerca = rs.reduce(function (a, b) { return a.d < b.d ? a : b; });
  P.resolverPase(st, cerca.idx, 100, seq([0.0]));
  ok(!P.pelotaAltaVigente(st) || cerca.d >= bal.partido.alto_desde, "el pase corto no marca pelota alta");
  /* pase largo ganado: viene ALTA por una ventana */
  st = partidoNuevo();
  var lejos = st.mios.findIndex(function (j, i) { return i !== st.ctrl && j.pos !== "ARQ"; });
  st.mios[lejos].x = st.mios[st.ctrl].x + bal.partido.alto_desde + 60; st.mios[lejos].y = st.mios[st.ctrl].y;
  P.resolverPase(st, lejos, 100, seq([0.0]));
  ok(P.pelotaAltaVigente(st), "el pase largo marca pelota ALTA");
  /* opciones aéreas: cerca del arco, con stats y aguante */
  var j = st.mios[st.ctrl];
  j.x = st.W - 120; j.aguante = 1000; j.stats.aereo = 80; j.stats.tiro = 70;
  var acc = P.accionesAereas(st);
  ok(acc.length === 3, "3 opciones aéreas");
  var chi = acc.find(function (a) { return a.id === "chilena"; });
  var cab = acc.find(function (a) { return a.id === "cabezazo"; });
  ok(!chi.bloqueada && !cab.bloqueada, "con aereo 80 y aguante: chilena y cabezazo habilitados");
  ok(chi.poder > cab.poder, "la chilena pega más fuerte que el cabezazo");
  /* chilena exige juego aéreo */
  j.stats.aereo = 40;
  var chi2 = P.accionesAereas(st).find(function (a) { return a.id === "chilena"; });
  ok(chi2.bloqueada && /AÉREO/.test(chi2.motivo || ""), "sin juego aéreo la chilena se bloquea con motivo");
  j.stats.aereo = 80;
  /* el remate aéreo consume aguante, apaga la pelota alta y da parámetros al duelo */
  var g0 = j.aguante;
  var prep = P.prepararRemateAereo(st, "chilena");
  ok(prep.shotPower > 0 && prep.tipo === "chilena", "prepararRemateAereo entrega el remate");
  ok(j.aguante === g0 - bal.aguante.costo_chilena, "la chilena costó " + bal.aguante.costo_chilena + " aguante");
  ok(!P.pelotaAltaVigente(st), "tras el remate la pelota bajó");
  /* la ventana expira sola */
  st._altaHasta = st._t + 100; st._t += 200;
  ok(!P.pelotaAltaVigente(st), "la ventana de pelota alta expira");
  ok(P.accionesAereas(st).length === 0, "sin pelota alta no hay menú aéreo");
  console.log("[12] pelota alta + tiros situacionales: ok");
})();

/* ---- 13) V6 §1: fixes urgentes F3/F4/F5/F6 ---- */
(function () {
  /* F4: al perder la pelota, el control NO va al que la perdió */
  var st = partidoNuevo();
  var perdedor = st.ctrl;
  st.mios.forEach(function (j) { j.x = 400; j.y = 340; });          // todos igual de cerca
  st.mios[perdedor].x = 500; st.mios[perdedor].y = 340;             // el que la pierde, pegado a la pelota
  P.perderPelota(st, seq([0.5]));
  ok(st.ctrl !== perdedor, "F4: el que la perdió queda excluido del cambio");
  ok(st._perdioIdx === perdedor && st._perdioHasta > st._t, "F4: la exclusión queda anotada con ventana");
  /* F3: un rival DETRÁS del pasador no genera riesgo de corte */
  var st2 = partidoNuevo();
  var c = st2.mios[st2.ctrl];
  c.x = 500; c.y = 340;
  var rec = st2.mios.findIndex(function (j, i) { return i !== st2.ctrl && j.pos !== "ARQ"; });
  st2.mios.forEach(function (j, i) { if (i !== st2.ctrl && i !== rec) { j.x = 60; j.y = 60; } });   // único receptor en radio
  st2.mios[rec].x = 700; st2.mios[rec].y = 340;                     // receptor adelante
  st2.rivales.forEach(function (r) { r.x = 100; r.y = 60; });       // todos lejos
  st2.rivales[5].x = 480; st2.rivales[5].y = 345;                   // pegado al pasador pero DETRÁS (t<0.1)
  var pctAtras = P.receptoresPase(st2).find(function (r) { return r.idx === rec; });
  st2.rivales[5].x = 600; st2.rivales[5].y = 345;                   // ahora sí, en el corredor
  var pctMedio = P.receptoresPase(st2).find(function (r) { return r.idx === rec; });
  ok(pctAtras && pctMedio && pctAtras.pct > pctMedio.pct, "F3: el riesgo solo existe EN el corredor (" + pctAtras.pct + " > " + pctMedio.pct + ")");
  /* F5: un rival libre va a MARCAR a tu receptor adelantado */
  var st3 = partidoNuevo();
  st3.cooldown = 9e9; st3.posesion = "mia";
  var ade = st3.mios.findIndex(function (j, i) { return i !== st3.ctrl && j.pos === "ATA"; });
  st3.mios[ade].x = st3.W * 0.7; st3.mios[ade].y = 340;
  var libre = st3.rivales.findIndex(function (j) { return j.pos === "VOL"; });
  st3.rivales[libre].x = st3.W * 0.7 + 200; st3.rivales[libre].y = 500;
  var d0 = Math.hypot(st3.rivales[libre].x - st3.mios[ade].x, st3.rivales[libre].y - st3.mios[ade].y);
  for (var i = 0; i < 40; i++) P.tick(st3, 100, null);
  var dMin = Math.min.apply(null, st3.rivales.filter(function (r) { return r.pos !== "ARQ"; })
    .map(function (r) { return Math.hypot(r.x - st3.mios[ade].x, r.y - st3.mios[ade].y); }));
  ok(dMin < d0 - 30, "F5: hay un rival cerrando al receptor adelantado (d " + Math.round(d0) + "→" + Math.round(dMin) + ")");
  /* F6: la terminología de terceros no existe en la data */
  var mega = JSON.parse(fs.readFileSync(path.join(__dirname, "../../data/megacosas.json"), "utf8"));
  ok(!/guts/i.test(JSON.stringify(mega)), "F6: megacosas.json sin terminología de terceros");
  ok(!/guts/i.test(JSON.stringify(bal)), "F6: balance.json sin terminología de terceros");
  console.log("[13] fixes urgentes V6 §1: ok");
})();

/* ---- 16) V6 §2 R3: el medidor de ENVIÓN (mérito acumulado) ---- */
(function () {
  var st = partidoNuevo();
  ok(st.envion === 0, "R3: arranca vacío");
  /* ganar duelos lo llena; perder no */
  var antes = st.envion;
  st.posesion = "mia";
  P.resolverDuelo(st, { accion: "gambeta", costo: 0, rng: seq([0.9, 0.0]) });   // rng2 bajo = gano
  ok(st.envion === antes + bal.envion.gana_duelo, "R3: ganar un duelo suma " + bal.envion.gana_duelo);
  var conEnvion = st.envion;
  P.resolverDuelo(st, { accion: "gambeta", poder: -999, costo: 0, rng: seq([0.0, 0.99]) });   // pierdo seguro
  ok(st.envion === conEnvion, "R3: perder no suma");
  /* lleno → potenciar da bonus temporal y se gasta */
  st.envion = bal.envion.max;
  ok(P.envionLleno(st), "R3: lleno al llegar al máximo");
  ok(P.gastarEnvionPotencia(st) && st.envion === 0 && P.envionActivo(st), "R3: potenciar gasta a 0 y activa el buff");
  st._t += bal.envion.potencia_ms + 1;
  ok(!P.envionActivo(st), "R3: el buff expira solo");
  /* súper defensa: solo con el medidor lleno */
  ok(!P.gastarEnvionSuper(st), "R3: sin envión no hay súper defensa");
  st.envion = bal.envion.max;
  ok(P.gastarEnvionSuper(st) && st.envion === 0, "R3: la súper defensa gasta el mérito entero");
  /* nunca pasa del máximo */
  st.envion = bal.envion.max - 2;
  P.sumarEnvion(st, 999);
  ok(st.envion === bal.envion.max, "R3: acotado al máximo");
  console.log("[16] medidor de envión: ok");
})();

/* ---- 15) V6 §5: el balance del aguante contra el original ---- */
(function () {
  var A = bal.aguante;
  /* la regla de oro es ARITMÉTICA: dos tiros top y chau */
  ok(A.costo_calden * 2 <= A.max && A.costo_calden * 3 > A.max, "§5: el Caldén (450) se usa exactamente DOS veces");
  ok(A.costo_calden === 450 && A.umbral_rendido === 110, "§5: Caldén 450, umbral de inutilidad 110");
  ok(A.costo_pared === 120 && A.costo_gambeta === 90 && A.costo_tiro === 90, "§5: pared 120, gambeta 90, tiro 90");
  ok(A.costo_quite === 50 && A.costo_pase === 20 && A.costo_chilena === 180 && A.costo_cabezazo === 200, "§5: quite 50, pase 20, chilena 180, cabezazo 200");
  /* el entretiempo recupera ALTO: el crack que gastó su Caldén vuelve cerca de 800 */
  var st = partidoNuevo();
  st.mios.forEach(function (j) { j.aguante = 480; });
  P.entretiempo(st);
  ok(st.mios[0].aguante >= 800, "§5: entretiempo alto — el crack vuelve a " + Math.round(st.mios[0].aguante));
  /* la CPU: límite invisible — pasado el umbral cae EN PICADA */
  var st2 = partidoNuevo();
  st2.aguanteRival = A.max;
  var pAlto = P.poderRival(st2);
  st2.aguanteRival = A.max * (A.cpu_umbral_frac - 0.05);
  var pPicada = P.poderRival(st2);
  ok(pPicada < pAlto * 0.72, "§5: la CPU en picada pierde MUCHO (" + pAlto.toFixed(1) + "→" + pPicada.toFixed(1) + ")");
  /* la data de megacosas acompaña la tabla */
  var mega = JSON.parse(fs.readFileSync(path.join(__dirname, "../../data/megacosas.json"), "utf8"));
  var porId = {}; mega.megatiros.forEach(function (t) { porId[t.id] = t.aguante; });
  ok(porId.calden === 450 && porId.atuel >= 250 && porId.atuel <= 280 && porId.tornado >= 250 && porId.tornado <= 280, "§5: megacosas.json en la escala del doc");
  console.log("[15] balance del aguante v6: ok");
})();

/* ---- 14) V6 §2: modelo de saltos, separación, reloj por momentos ---- */
(function () {
  /* R4: el reloj avanza EN BLOQUES fijos por momento */
  var st = partidoNuevo();
  var m0 = st.minuto;
  P.saltoReloj(st, seq([0.5]));
  ok(Math.abs((st.minuto - m0) - bal.tempo.minutos_por_momento) < 1e-9,
    "R4: cada momento consume exactamente " + bal.tempo.minutos_por_momento + " minutos");
  /* R4: entre momentos el reloj solo GOTEA */
  st.cooldown = 9e9; m0 = st.minuto;
  P.tick(st, 1000, null);
  ok(Math.abs((st.minuto - m0) - 1 / bal.tempo.goteo_seg_por_minuto) < 1e-6, "R4: goteo lento entre momentos");
  /* R4: la aritmética cierra — 45' = ~18 momentos INTERMEDIO */
  ok(Math.round(45 / bal.tempo.presets.intermedio) === 18, "R4: INTERMEDIO da 18 momentos por tiempo");
  /* R1: en modo saltos el portador va rápido y esquemático */
  ok(bal.ritmo.modo_saltos === true, "R1: modo_saltos encendido");
  var st2 = partidoNuevo(); st2.cooldown = 9e9;
  var x0 = st2.mios[st2.ctrl].x;
  P.tick(st2, 1000, { dx: 1, dy: 0 });
  var avance = st2.mios[st2.ctrl].x - x0;
  ok(Math.abs(avance - bal.ritmo.portador_con_pelota * bal.ritmo.saltos_vel_mult) < 2,
    "R1: el portador avanza a velocidad de salto (" + Math.round(avance) + " px/s)");
  /* R1 test de corrección §0: NO podés perseguir al rival que te robó — él escala, vos no */
  ok(bal.ritmo.rival_con_pelota * bal.ritmo.saltos_vel_mult > bal.ritmo.perseguidor_sin_pelota,
    "R1: el rival con pelota es inalcanzable corriendo (se lo anticipa)");
  /* R1: nadie te caza desde ATRÁS — un rival pegado atrás no dispara encuentro */
  var st3 = partidoNuevo(); st3.cooldown = 0;
  var c3 = st3.mios[st3.ctrl]; c3.x = 600; c3.y = 340;
  st3.rivales.forEach(function (r) { r.x = 100; r.y = 60; });
  var atras = st3.rivales.findIndex(function (r) { return r.pos !== "ARQ"; });
  st3.rivales[atras].x = 570; st3.rivales[atras].y = 340;   // a 30px pero DETRÁS
  var evs = P.tick(st3, 16, null);
  ok(!evs.some(function (e) { return e.tipo === "encuentro"; }), "R1: el que quedó atrás no te embosca");
  st3.rivales[atras].x = 625;                                // ahora ADELANTE, a 25px
  evs = P.tick(st3, 16, null);
  ok(evs.some(function (e) { return e.tipo === "encuentro"; }), "R1: el cruce llega de ADELANTE");
  /* R2: separación post-duelo — el perdedor queda lejos */
  var st4 = partidoNuevo();
  var rIdx = st4.rivales.findIndex(function (r) { return r.pos !== "ARQ"; });
  var rx0 = st4.rivales[rIdx].x, cx0 = st4.mios[st4.ctrl].x;
  P.ganarAtaque(st4, "gambeta", rIdx);
  ok(st4.mios[st4.ctrl].x - cx0 >= bal.partido.separacion_duelo - 1, "R2: el ganador gana metros de verdad");
  ok(st4.rivales[rIdx].x > rx0 + 40, "R2: el gambeteado queda pagando atrás");
  /* R2: tras un robo la pelota YA está lejos (no se persigue) */
  var st5 = partidoNuevo();
  var px0 = st5.pelota.x;
  P.perderPelota(st5, seq([0.5]));
  ok(st5.pelota.x < px0, "R2: tras el robo la pelota se fue con el rival, lejos");
  console.log("[14] modelo de saltos + separación + reloj v6: ok");
})();

console.log("\n" + (fail === 0 ? "✓ TODOS OK" : "✗ HUBO FALLAS") + " — " + pass + " asserts, " + fail + " fallaron.");
process.exit(fail === 0 ? 0 : 1);
