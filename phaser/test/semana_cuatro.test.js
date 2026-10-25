/* ============================================================================
   PAMPA STAR · LA SEMANA DE CUATRO COSAS (23/oct, pedido de Rodri)

   "Falta desarrollar la ÉPICA del jugador de afuera: capaz que tiene MUCHO y
   eso RESTA; algo simple de 3 o 4 cosas, claras en qué influyen." La semana
   es UNA decisión entre cuatro, y cada una se siente en la cancha:
     ENTRENAR TIRO, PASE o GAMBETA   +8 a esa, solo el próximo partido
     DESCANSAR                       llegás con el AGUANTE lleno
     VER AL RIVAL                    su defensa y su estrella, en el mapa
     SALIR CON LA BARRA              más ÁNIMO: suma en el SÚPER TIRO, EL
                                     TOQUE y el tiro libre
   Lo que fija:
     [1] la cuenta (logic/semana.js): enLaCancha, las palabras, una sola
         elección, cerrar una vez por fecha y sin mejoras para siempre
     [2] el remate (logic/partido.js): el ánimo entra solo en las jugadas
         grandes tuyas
     [3] la semana en pantalla (master.js real, escena de mentira): cuatro
         tarjetas, una tecla una elección, el momento, solo las cinco
         palabras, nada de teclas en el teléfono, la previa
     [4] una semana entera: elegir, la previa, la cancha, el resultado y la
         semana siguiente; recargar en medio del partido no duplica nada
     [5] el partido (create real): +8 de PASE, el ánimo, VER AL RIVAL
     [6] una carrera guardada con la semana vieja no pierde nada
     [7] con flags.semana_cuatro en false vuelve la semana de tres días

   Corré:  node phaser/test/semana_cuatro.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var M = require("./_escena_de_mentira.js");
var C = require("./_create_de_mentira.js");
var RAIZ = path.join(__dirname, "..", "..");
function json(f) { return JSON.parse(fs.readFileSync(path.join(RAIZ, f), "utf8")); }
var S = require("../logic/semana.js");
var BAL = json("phaser/data/balance.json"), SEM = json("data/semana.json");
var CFG = BAL.semana, K = CFG.cuatro;

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

/* ---------- [1] LA CUENTA ---------- */
(function () {
  assert(BAL.flags.semana_cuatro === true && typeof BAL.flags._semana_cuatro === "string", "la perilla está prendida y dice qué apaga");
  assert(SEM.cuatro.map(function (c) { return c.id; }).join(",") === S.CUATRO.join(","), "data/semana.json trae las cuatro, en orden");
  var save = { temporadaN: 1, temporada: { fecha: 3 }, animo: 60, desgaste: 20 };
  var nada = S.enLaCancha(save, null, CFG);
  assert(nada.aguantePct === K.llegada_base - 20 * K.llegada_por_desgaste && nada.animo === 60 && !nada.entrena && !nada.espiado,
    "sin elegir: AGUANTE de la llegada de siempre (" + nada.aguantePct + "%) y el ÁNIMO que traés");
  assert(S.elegirCuatro(save, "entrenar", "aereo") === null && S.elegirCuatro(save, "asado", null) === null, "solo se entrena TIRO, PASE o GAMBETA, y solo hay cuatro");
  S.elegirCuatro(save, "entrenar", "pase");
  var e = S.enLaCancha(save, S.eleccionDeLaFecha(save), CFG);
  assert(e.entrena && e.entrena.stat === "pase" && e.entrena.mas === K.entrenar_mas, "ENTRENAR PASE: +" + K.entrenar_mas + " de PASE");
  S.elegirCuatro(save, "descansar", null);
  assert(S.eleccionDeLaFecha(save).id === "descansar", "elegir otra pisa la anterior: una sola por semana");
  assert(S.enLaCancha(save, S.eleccionDeLaFecha(save), CFG).aguantePct === K.llegada_descanso, "DESCANSAR: AGUANTE al " + K.llegada_descanso + "%");
  var barra = S.enLaCancha(save, { id: "barra" }, CFG);
  assert(barra.animo === 60 + K.barra_animo && barra.grande > nada.grande, "LA BARRA: ÁNIMO " + barra.animo + " y +" + barra.grande + " en las jugadas grandes (sin ella, +" + nada.grande + ")");
  assert(S.bonusGrande(40, K) === 0 && S.bonusGrande(100, K) === K.grande_max, "el ánimo bajo no resta y el tope es " + K.grande_max);
  /* revisión final del 23/oct: con el ÁNIMO lleno, la barra no sumaba nada */
  var lleno = { animo: 100, temporadaN: 1, temporada: { fecha: 4 } };
  var llenoNada = S.enLaCancha(lleno, null, CFG), llenoBarra = S.enLaCancha(lleno, { id: "barra" }, CFG);
  assert(llenoBarra.grande - llenoNada.grande === barra.grande - nada.grande && llenoBarra.animo === 100,
    "SÍNTOMA: con el ÁNIMO a 100 la barra no suma (sin ella +" + llenoNada.grande + ", con ella +" + llenoBarra.grande + ")");
  assert(S.enLaCancha(save, { id: "ver_rival" }, CFG).espiado === true, "VER AL RIVAL: lo ves en el partido");
  /* las palabras: TIRO, PASE, GAMBETA, AGUANTE, ÁNIMO */
  var todas = S.renglonesDeLaCancha(e).concat(S.renglonesDeLaCancha(barra), S.renglonesDeLaCancha(S.enLaCancha(save, { id: "ver_rival" }, CFG)));
  assert(todas.every(function (t) { return !/energ|molestia|cualidad|envi[oó]n|resistencia|f[ií]sico|car[aá]cter|stat/i.test(t); }), "lo que se lee usa solo las cinco palabras (" + todas.join(" | ") + ")");
  /* pedido de Rodri del 23/oct (decidí vos): entrenar deja +1 para siempre y la semana lo dice */
  assert(todas.indexOf("+8 de PASE esta fecha, +1 para siempre") >= 0, "se dice como pidió Rodri: \"+8 de PASE esta fecha, +1 para siempre\" (" + todas.join(" | ") + ")");
  /* la eleccion vieja no vale para otra fecha */
  save.temporada.fecha = 4;
  assert(S.eleccionDeLaFecha(save) === null, "la elección de la fecha pasada no cuenta en la nueva");
  /* cerrar: una vez por fecha. Pedido de Rodri del 23/oct: entrenar deja +1 para siempre */
  var sv = { temporadaN: 1, temporada: { fecha: 0 }, animo: 70, desgaste: 10, mejoras: { tiro: 2, resistencia: 5 } };
  S.elegirCuatro(sv, "entrenar", "tiro");
  var r1 = S.cerrarSemanaCuatro(sv, CFG);
  assert(!r1.yaEstaba && sv.semanaResumen.entrena.stat === "tiro" && S.semanaCerrada(sv), "cerrar arma lo que viaja a la cancha");
  assert(JSON.stringify(sv.mejoras) === JSON.stringify({ tiro: 2 + K.entrenar_siempre, resistencia: 5 }) && sv.entrenado.tiro === K.entrenar_siempre,
    "entrenar TIRO suma +" + K.entrenar_siempre + " para siempre a lo que ya tenía (" + JSON.stringify(sv.mejoras) + ")");
  assert(sv.semanaResumen.aguanteInicial === Math.round(S.techoDeAguante(sv.mejoras, CFG) * (K.llegada_base - 10 * K.llegada_por_desgaste) / 100),
    "el aguante llega hasta TU techo (las mejoras de antes siguen contando)");
  S.elegirCuatro(sv, "barra", null);
  var r2 = S.cerrarSemanaCuatro(sv, CFG);
  assert(r2.yaEstaba && r2.llega.entrena.stat === "tiro", "cerrada, no se recalcula: lo que salió a la cancha queda");
  console.log("[1] la cuenta: " + S.renglonesDeLaCancha(e).join(" · ") + " | barra " + S.renglonesDeLaCancha(barra).join(" · "));
})();

/* ---------- [2] EL ÁNIMO EN LAS JUGADAS GRANDES ---------- */
(function () {
  var P = C.jugar({ rival: "Espejo de Sal", division: "primera_b", nivel: 3 }), st = P.s.st, Pt = C.W.PampaPartido;
  var vos = st.mios.findIndex(function (j) { return j.esVos; }), otro = st.mios.findIndex(function (j) { return !j.esVos && j.pos === "ATA"; });
  st.animoGrande = 6;
  var tirar = function (idx, esp, grande) {
    st.ctrl = idx; var j = st.mios[idx], ag = j.aguante;
    var p = Pt.prepararRemate(st, esp, function () { return 0.5; }, grande);
    j.aguante = ag;
    return p;
  };
  var comun = tirar(vos, null, false), toque = tirar(vos, null, true), suyo = tirar(otro, null, true);
  assert(comun.animo === 0 && toque.animo === 6 && Math.abs(toque.shotPower - comun.shotPower - 6) < 1e-9,
    "EL TOQUE y el tiro libre tuyos suman el ánimo (+" + toque.animo + "); el remate común no (" + comun.animo + ")");
  assert(suyo.animo === 0, "el ánimo es tuyo: el compañero que patea no lo suma");
  var mega = { id: "mega", aguante: 300, mult: 1.3 };
  assert(tirar(vos, mega, false).animo === 6, "el SÚPER TIRO lo suma siempre");
  var M_ = fs.readFileSync(path.join(RAIZ, "phaser/scenes/match.js"), "utf8"), F_ = fs.readFileSync(path.join(RAIZ, "phaser/scenes/frente_ui.js"), "utf8");
  assert(/P\.prepararRemate\(st, null, undefined, !!toque\)/.test(M_), "EL TOQUE pide la jugada grande (tiroPorComandos)");
  assert(/P\.prepararRemate\(st, null, undefined, libre\)/.test(F_), "el tiro libre la pide (frenteRematar)");
  console.log("[2] ánimo +6: remate común " + comun.animo + " · EL TOQUE " + toque.animo + " · súper tiro 6 · compañero " + suyo.animo);
})();

/* ---------- [3] LA SEMANA EN PANTALLA ---------- */
function armarSemana(tactil) {
  var A = M.armar({ tactil: !!tactil });
  A.registry.set("relatos", json("data/relatos.json"));
  A.localStorage.setItem("pampa_master_v1", JSON.stringify(A.carreraNueva()));
  var s = A.nueva(); s.create();
  s.tocar(310, 460);                                   // ▶ JUGAR LA FECHA
  return { A: A, s: s };
}
var PALABRAS_VIEJAS = /energ|molestia|cualidad|envi[oó]n|resistencia|f[ií]sico|car[aá]cter|\bstat\b|el lunes|el mi[eé]rcoles|el viernes/i;
(function () {
  var X = armarSemana(false), s = X.s, A = X.A;
  var t = s.textos();
  assert(t.indexOf("LA SEMANA · fecha 1") >= 0, "control: la semana de la fecha 1");
  assert(!s._semEvento, "no hay evento de dos opciones: la decisión de la semana es una");
  ["ENTRENAR", "DESCANSAR", "VER AL RIVAL", "SALIR CON LA BARRA", "TIRO", "PASE", "GAMBETA"].forEach(function (n) {
    assert(t.indexOf(n) >= 0, "a la vista: " + n);
  });
  SEM.cuatro.forEach(function (c) { assert(t.indexOf(c.efecto) >= 0, c.n + " dice qué te da en la cancha (" + c.efecto + ")"); });
  /* pedido de Rodri del 23/oct: ENTRENAR dice las dos cosas (esta fecha y para siempre) */
  assert(t.filter(function (x) { return /^esta fecha: /.test(x); }).length === 3 && t.indexOf("+" + K.entrenar_mas + " esta fecha, +" + K.entrenar_siempre + " para siempre") >= 0,
    "cada tarjeta dice lo que vas a tener esta fecha, y ENTRENAR también lo de para siempre");
  assert(t.some(function (x) { return /^AGUANTE al \d+%$/.test(x); }) && t.some(function (x) { return /^ÁNIMO \d+\/100$/.test(x); }), "los dos medidores: AGUANTE y ÁNIMO");
  var viejas = t.filter(function (x) { return PALABRAS_VIEJAS.test(x); });
  assert(viejas.length === 0, "SÍNTOMA: la semana nombra lo que se apagó: " + viejas.join(" | "));
  assert(t.some(function (x) { return /teclas 1 a 6/.test(x); }), "con teclado dice las seis teclas");
  /* una tecla, una elección; con el momento abierto no se toca nada */
  for (var k = 0; k < 3; k++) s.vistaSemana(s._semRival, s._semJugar);
  assert(s.input.keyboard.listenerCount("keydown-TWO") === 1, "repintada cuatro veces, UN oyente de la tecla 2 (" + s.input.keyboard.listenerCount("keydown-TWO") + ")");
  s.teclas("TWO");
  assert(s.save.eleccion && s.save.eleccion.id === "entrenar" && s.save.eleccion.que === "pase", "la tecla 2 es ENTRENAR PASE");
  var tm = s.textos();
  assert(tm.indexOf("ESTA SEMANA") >= 0 && tm.indexOf("ENTRENAR PASE") >= 0 && tm.indexOf("+8 de PASE esta fecha, +1 para siempre") >= 0, "el momento dice qué elegiste y qué te da (" + tm.slice(-6).join(" | ") + ")");
  s.teclas("FOUR");
  assert(s.save.eleccion.id === "entrenar", "con el momento a la vista, otra tecla no cambia nada");
  s.correrTimers();
  var t2 = s.textos();
  assert(t2.indexOf("+8 de PASE esta fecha, +1 para siempre · AGUANTE al " + (K.llegada_base) + "% · ÁNIMO 60: +2 en las jugadas grandes") >= 0,
    "arriba queda lo que vas a tener en la cancha (" + t2.filter(function (x) { return /AGUANTE al/.test(x); }).join(" | ") + ")");
  assert(t2.indexOf("✓ ENTRENAR") >= 0 && t2.indexOf("▶ JUGAR LA FECHA") >= 0, "la elegida lleva la marca con palabra y el botón dice JUGAR LA FECHA");
  s.teclas("FOUR");
  s.correrTimers();
  assert(s.save.eleccion.id === "descansar" && s.textos().indexOf("✓ DESCANSAR") >= 0 && s.textos().indexOf("✓ ENTRENAR") < 0, "cambiar a DESCANSAR deja una sola elegida");
  var guardado = JSON.parse(A.localStorage.getItem("pampa_master_v1"));
  assert(guardado.eleccion && guardado.eleccion.id === "descansar", "la elección queda en el save");
  /* en el teléfono no se habla de teclas */
  var Tt = armarSemana(true).s.textos();
  assert(!Tt.some(function (x) { return /\bteclas?\b/i.test(x); }), "en el teléfono no se habla de teclas");
  console.log("[3] la semana: 4 tarjetas, tecla 2 = ENTRENAR PASE, el momento, cambiar a DESCANSAR; sin palabras viejas");
})();

/* ---------- [4] UNA SEMANA ENTERA, HASTA LA SIGUIENTE ---------- */
(function () {
  var X = armarSemana(false), s = X.s, A = X.A;
  var mp0 = A.window.PampaTemporada.miPartido(s.save.temporada), rival = mp0.local === s.save.temporada.miClub ? mp0.visita : mp0.local;
  s.teclas("SIX");                                     // SALIR CON LA BARRA
  s.correrTimers();
  assert(s.save.eleccion.id === "barra", "la tecla 6 es SALIR CON LA BARRA");
  s.teclas("ENTER");                                   // el foco quedó en JUGAR LA FECHA
  var tp = s.textos();
  assert(tp.some(function (x) { return /^LA PREVIA · fecha 1$/.test(x); }), "JUGAR LA FECHA lleva a la previa");
  var previa = tp.filter(function (x) { return /^ESTA FECHA VAS A TENER: /.test(x); })[0];
  assert(previa === "ESTA FECHA VAS A TENER: AGUANTE al " + K.llegada_base + "% · ÁNIMO 80: +6 en las jugadas grandes", "la previa repite lo que vas a tener (" + previa + ")");
  s.irALaCancha(rival);
  var mp = A.registry.get("masterPartido");
  assert(mp.semana && mp.semana.cuatro === "barra" && mp.semana.grande === 6 && mp.mod === null, "a la cancha viaja la barra (+6) y ningún evento");
  /* recargar en medio del partido, tres veces: nada se duplica */
  for (var k = 0; k < 3; k++) {
    A.registry.remove("masterPartido");
    var s2 = A.nueva(); s2.create();
    assert(s2.textos().indexOf("↺ REPETIR EL PARTIDO") >= 0, "recarga " + (k + 1) + ": REPETIR EL PARTIDO");
    s2.tocar(310, 460);
    assert(JSON.stringify(A.registry.get("masterPartido").semana) === JSON.stringify(mp.semana), "recarga " + (k + 1) + ": entra como había llegado");
  }
  /* el pitazo: 2 a 1 con gol tuyo, y el lunes */
  var sv = JSON.parse(A.localStorage.getItem("pampa_master_v1"));
  var c = S.claveDeFecha(sv);
  assert(S.anotarResultado(sv, { temporadaN: c.temporadaN, fecha: c.fecha, golesMio: 2, golesRival: 1, hiceGol: true, aguanteFinalFrac: 0.4 }), "el resultado se anota en la fecha");
  A.localStorage.setItem("pampa_master_v1", JSON.stringify(sv));
  A.registry.remove("masterPartido");
  var s3 = A.nueva(); s3.create();
  assert(s3.save.temporada.fecha === 1 && s3.save.animo === 60 + CFG.animo_gana + CFG.animo_gol, "pasó la fecha y el ánimo sube por ganar y por tu gol (" + s3.save.animo + ")");
  s3.tocar(310, 460);
  var t3 = s3.textos();
  var desg = Math.round(0.6 * CFG.desgaste_max), pct = Math.round(K.llegada_base - desg * K.llegada_por_desgaste);
  assert(t3.indexOf("LA SEMANA · fecha 2") >= 0 && t3.indexOf("TODAVÍA NO ELEGISTE · así llegás") >= 0, "la semana 2 arranca sin elegir");
  assert(t3.indexOf("AGUANTE al " + pct + "%") >= 0 && t3.indexOf("ÁNIMO 78/100") >= 0, "el partido te dejó el AGUANTE al " + pct + "% y el ÁNIMO en 78 (la barra no se arrastra)");
  console.log("[4] semana entera: barra → previa → cancha (+6) → 3 recargas → 2 a 1 → fecha 2 con ÁNIMO 78 y AGUANTE al " + pct + "%");
})();

/* ---------- [5] EL PARTIDO, CON LO QUE ELEGISTE ---------- */
(function () {
  var roster = json("data/roster_pampeano.json");
  var estrella = roster.jugadores.find(function (j) { return j.posicion_motor === "ATA"; });
  var sv = { temporadaN: 1, temporada: { fecha: 0 }, animo: 60, desgaste: 0 };
  var mpCon = function (id, que) {
    var x = JSON.parse(JSON.stringify(sv)); S.elegirCuatro(x, id, que); S.cerrarSemanaCuatro(x, CFG);
    return { rival: "Espejo de Sal", division: "primera_b", nivel: 3, semana: x.semanaResumen, estrella: estrella.id };
  };
  /* el stub de Phaser no hace cuentas: el Clamp de verdad, para leer los números */
  C.W.Phaser.Math.Clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
  var vosDe = function (P) { return P.s.st.mios.find(function (j) { return j.esVos; }); };
  var base = C.jugar(mpCon("descansar", null)), pase = C.jugar(mpCon("entrenar", "pase"));
  assert(vosDe(pase).stats.pase === Math.min(99, vosDe(base).stats.pase + K.entrenar_mas), "ENTRENAR PASE: en la cancha tenés +" + K.entrenar_mas + " de PASE (" + vosDe(base).stats.pase + " → " + vosDe(pase).stats.pase + ")");
  assert(vosDe(pase).stats.tiro === vosDe(base).stats.tiro, "y el TIRO queda igual");
  assert(vosDe(base).aguante > vosDe(pase).aguante, "DESCANSAR: llegás con más aguante (" + vosDe(base).aguante + " contra " + vosDe(pase).aguante + ")");
  var barra = C.jugar(mpCon("barra", null));
  assert(barra.s.st.animoGrande === 6 && pase.s.st.animoGrande === 2, "el ánimo de la semana llega al partido (barra +" + barra.s.st.animoGrande + ", sin barra +" + pase.s.st.animoGrande + ")");
  var ver = C.jugar(mpCon("ver_rival", null)), s = ver.s;
  assert(s._vioAlRival === true && base.s._vioAlRival === false, "VER AL RIVAL prende el mapa; las otras no");
  assert(s._estrellaIdx >= 0 && s.st.rivales[s._estrellaIdx].nombre === estrella.nombre, "la estrella que nombró la previa queda marcada (" + estrella.nombre + ")");
  var avisos = (s._avisosCola || []).concat(s._avisos || []).map(function (a) { return a.txt; });
  assert(avisos.some(function (x) { return /^Los fuiste a ver: su defensa juega /.test(x); }) && avisos.some(function (x) { return x === "Su estrella es el " + s.st.rivales[s._estrellaIdx].numero + ", " + estrella.nombre.toUpperCase(); }),
    "al arrancar te dice cómo se para su defensa y quién es la estrella (" + avisos.join(" | ") + ")");
  var MS = fs.readFileSync(path.join(RAIZ, "phaser/scenes/match.js"), "utf8");
  /* 25/oct, pedido de Rodri ("no sé qué son esas flechas"): el rótulo pasó
     de SU DEFENSA a SU LÍNEA DE DEFENSA */
  assert(/if \(this\._vioAlRival\) this\.dibujarLoQueViste\(g, R, RF\);/.test(MS) && /"SU LÍNEA DE DEFENSA"/.test(MS) && /"ESTRELLA"/.test(MS), "el mapa dibuja su defensa y la estrella, con palabra");
  /* 25/oct, pedido de Rodri: el renglón de números sale en LA SEMANA y en la
     previa; en el partido lo dice el relator una vez, sin el cartel ESTA FECHA */
  assert(/anunciarEnTicker\(this\._llegadaRelato, null, \{ prioridad: true \}\)/.test(MS) && MS.indexOf('"ESTA FECHA: "') < 0,
    "el relator dice al arrancar lo que trajiste de la semana, sin el cartel ESTA FECHA");
  var semP = mpCon("entrenar", "pase").semana;
  assert(pase.s._llegadaRelato === "¡Llegás con +" + semP.entrena.mas + " de PASE, el aguante al " + Math.round(semP.aguanteFrac * 100) + "% y el ánimo en " + semP.animo + "!",
    "lo que dice el relator con PASE entrenado (" + pase.s._llegadaRelato + ")");
  assert(/^¡Llegás con el aguante al \d+% y el ánimo en \d+!$/.test(base.s._llegadaRelato), "sin entrenar, el aguante y el ánimo (" + base.s._llegadaRelato + ")");
  console.log("[5] el partido: PASE " + vosDe(base).stats.pase + " → " + vosDe(pase).stats.pase + " · ánimo barra +6 · VER AL RIVAL con " + avisos.length + " avisos");
})();

/* ---------- [6] LA CARRERA GUARDADA CON LA SEMANA VIEJA ---------- */
(function () {
  var A = M.armar();
  var vieja = A.carreraNueva();
  vieja.mejoras = { tiro: 3, gambeta: 1.4, resistencia: 6 };
  vieja.animo = 71; vieja.desgaste = 12; vieja.molestia = true; vieja.resaca = 8;
  vieja.semana = { energia: 55, animo: 76, elegidas: ["entrenar_tiro", "asado", null], molestia: true, fecha: 1, permanentes: { tiro: 1 } };
  vieja.modFecha = { mod: { tiro: 2 }, frase: "algo de la semana vieja" };
  A.localStorage.setItem("pampa_master_v1", JSON.stringify(vieja));
  var s = A.nueva(); s.create();
  assert(s.save && JSON.stringify(s.save.mejoras) === JSON.stringify(vieja.mejoras), "la carrera vieja abre con sus mejoras intactas");
  s.tocar(310, 460);
  assert(s.textos().indexOf("SALIR CON LA BARRA") >= 0, "y juega la semana de cuatro cosas");
  s.teclas("ONE"); s.correrTimers();
  var mp0 = A.window.PampaTemporada.miPartido(s.save.temporada), rival = mp0.local === s.save.temporada.miClub ? mp0.visita : mp0.local;
  s.cerrarSemana(function () { s.irALaCancha(rival); });
  var mp = A.registry.get("masterPartido");
  /* pedido de Rodri del 23/oct: a lo de la semana vieja se le suma el +1 para siempre de ENTRENAR TIRO */
  var conElUno = Object.assign({}, vieja.mejoras, { tiro: vieja.mejoras.tiro + K.entrenar_siempre });
  assert(JSON.stringify(mp.mejoras) === JSON.stringify(conElUno), "lo ganado en las semanas viejas sigue viajando a la cancha, con el +1 de entrenar (" + JSON.stringify(mp.mejoras) + ")");
  assert(mp.semana.entrena.stat === "tiro" && mp.semana.animo === 71, "con el ÁNIMO que traía (71) y +8 de TIRO");
  assert(mp.semana.aguanteInicial === Math.round(S.techoDeAguante(vieja.mejoras, CFG) * (K.llegada_base - 12 * K.llegada_por_desgaste) / 100), "y el techo de aguante que se había entrenado");
  var g = JSON.parse(A.localStorage.getItem("pampa_master_v1"));
  assert(g.molestia === true && g.resaca === 8 && g.modFecha && g.modFecha.frase === vieja.modFecha.frase && g.semana && g.semana.elegidas[1] === "asado",
    "lo de la semana vieja queda guardado (si se apaga la perilla, vuelve)");
  assert(JSON.stringify(g.mejoras) === JSON.stringify(conElUno), "y la semana nueva le sumó solo el +1 de entrenar, una vez");
  console.log("[6] carrera vieja: mejoras " + JSON.stringify(g.mejoras) + " intactas, ánimo 71, la semana vieja guardada");
})();

/* ---------- [7] LA PERILLA EN FALSE ---------- */
(function () {
  var A = M.armar();
  A.registry.get("balance").flags.semana_cuatro = false;
  A.localStorage.setItem("pampa_master_v1", JSON.stringify(A.carreraNueva()));
  var s = A.nueva(); s.create();
  s.tocar(310, 460);
  if (s._semEvento && !s._semEventoResuelto) { s.leerHastaElFinal(); s.teclas("ENTER"); }
  var t = s.textos();
  assert(t.some(function (x) { return /^ENERGÍA \d+\/100$/.test(x); }) && t.indexOf("EL LUNES") >= 0, "con false vuelve la semana de tres días, con ENERGÍA");
  console.log("[7] flags.semana_cuatro false: la semana de tres días");
})();

/* ---------- [8] ENTRENAR DEJA ALGO (decisión que Rodri delegó, 23/oct) ---------- */
(function () {
  assert(K.entrenar_siempre === 1 && K.entrenar_siempre_tope > 0, "las perillas entrenar_siempre y entrenar_siempre_tope existen");
  var sv = { temporadaN: 1, temporada: { fecha: 0 }, animo: 60, desgaste: 0 };
  for (var f = 0; f < K.entrenar_siempre_tope + 3; f++) {
    sv.temporada.fecha = f;
    S.elegirCuatro(sv, "entrenar", "gambeta");
    S.cerrarSemanaCuatro(sv, CFG);
    S.cerrarSemanaCuatro(sv, CFG);
  }
  assert(sv.mejoras.gambeta === K.entrenar_siempre_tope && sv.entrenado.gambeta === K.entrenar_siempre_tope,
    "entrenando GAMBETA " + (K.entrenar_siempre_tope + 3) + " fechas (cerrando dos veces cada una) queda el tope, +" + K.entrenar_siempre_tope + " (" + sv.mejoras.gambeta + ")");
  assert(!sv.mejoras.tiro && !sv.mejoras.pase, "lo de GAMBETA no se le suma a las otras");
  var lleno = S.enLaCancha(sv, { id: "entrenar", que: "gambeta" }, CFG).entrena;
  assert(lleno.mas === K.entrenar_mas && lleno.siempre === 0 && S.textoEntrena(lleno) === "+" + K.entrenar_mas + " de GAMBETA esta fecha, ya tenés el +" + K.entrenar_siempre_tope + " para siempre",
    "con el tope, el +" + K.entrenar_mas + " de la fecha sigue y la semana lo dice (" + S.textoEntrena(lleno) + ")");
  var otra = S.enLaCancha(sv, { id: "entrenar", que: "tiro" }, CFG).entrena;
  assert(otra.siempre === 1 && S.textoEntrena(otra) === "+" + K.entrenar_mas + " de TIRO esta fecha, +1 para siempre", "TIRO todavía suma (" + S.textoEntrena(otra) + ")");
  sv.temporada.fecha = 40; S.elegirCuatro(sv, "descansar", null); S.cerrarSemanaCuatro(sv, CFG);
  assert(sv.mejoras.gambeta === K.entrenar_siempre_tope && !sv.mejoras.tiro, "DESCANSAR no deja nada para siempre");
  console.log("[8] entrenar deja algo: GAMBETA +" + sv.mejoras.gambeta + " con tope " + K.entrenar_siempre_tope + " · " + S.textoEntrena(otra));
})();

console.log(mal ? "✗ " + mal + " FALLARON (" + ok + " ok)" : "✓ semana_cuatro: " + ok + " ok");
process.exit(mal ? 1 : 0);
