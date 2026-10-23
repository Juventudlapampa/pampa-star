/* ============================================================================
   PAMPA STAR · RECARGAR NO DUPLICA NADA, Y EL RESULTADO SE GUARDA AL PITAZO
   (tanda 1.0, L03 · save-idempotente)

   EL BUG, medido dos veces con master.js real: entrenar tiro tres veces (+3),
   entrar al partido y recargar 4 veces en medio del partido dejaba tiro en
   +15. cerrarSemana sumaba los permanentes en cada llamada y la semana solo
   se daba por terminada al volver con el resultado. Ese resultado vivía en el
   registry (memoria de la página) y se escribía recién al tocar SEGUIR: cerrar
   la pestaña en la pantalla de GANASTE perdía la fecha. Y el evento de la
   semana se volvía a sortear con la bolsa ya gastada.

   Lo que fija este test:
     [1] la lógica pura: cerrar la misma semana 5 veces (con el save ida y
         vuelta por JSON, como una recarga) deja tiro en +3
     [2] master.js REAL: semana, a la cancha, 4 recargas → REPETIR EL PARTIDO,
         la semana no se rearma, las mejoras y el evento no cambian
     [3] con un resultadoPendiente, crear la escena dos veces avanza la fecha
         exactamente 1 (y un resultado de otra fecha no se aplica)
     [4] el partido escribe el resultado AL PITAZO, con la fecha marcada

   Corré:  node phaser/test/save_idempotente.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var M = require("./_escena_de_mentira.js");
var RAIZ = M.RAIZ;
var S = require(path.join(RAIZ, "phaser/logic/semana.js"));
var BAL = JSON.parse(fs.readFileSync(path.join(RAIZ, "phaser/data/balance.json"), "utf8"));
var SEM = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/semana.json"), "utf8"));

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }
function copia(o) { return JSON.parse(JSON.stringify(o)); }

var A = M.armar();
var W = A.window;

/* ---------- [1] LA LÓGICA PURA: CINCO CIERRES, UNA SUMA ---------- */
(function () {
  var sv = A.carreraNueva();
  var cfg = Object.assign({}, BAL.semana, { stats: { tiro: 50 } });
  var sem = S.nuevaSemana(sv, BAL.semana);
  for (var i = 0; i < 3; i++) sem = S.elegir(SEM, sem, i, "entrenar_tiro", cfg) || sem;
  sv.semana = sem;
  var perm = (sem.permanentes || {}).tiro;
  assert(perm > 0, "control: la semana de tres ENTRENAR TIRO deja permanentes de tiro (" + perm + ")");
  var r1 = S.cerrarSemana(sv, BAL.semana);
  assert(r1.yaEstaba === false, "el primer cierre es el de verdad");
  var tras1 = sv.mejoras.tiro, resumen1 = JSON.stringify(sv.semanaResumen);
  for (var k = 0; k < 4; k++) {
    sv = copia(sv);                                   // la recarga: el save pasa por localStorage
    var r = S.cerrarSemana(sv, BAL.semana);
    assert(r.yaEstaba === true, "el cierre " + (k + 2) + " sabe que la semana ya estaba cerrada");
  }
  assert(sv.mejoras.tiro === tras1 && Math.abs(tras1 - perm) < 1e-9,
    "SÍNTOMA: cerrar la misma semana 5 veces deja tiro en +" + perm + " (dio +" + sv.mejoras.tiro + ")");
  assert(JSON.stringify(sv.semanaResumen) === resumen1, "y cómo llegás al domingo no se recalcula");
  assert(S.esLaFecha(sv, sv.semanaCerradaEnFecha), "la marca dice qué fecha se cerró");
  /* la fecha siguiente se cierra de nuevo (la marca es POR FECHA) */
  sv.temporada.fecha++; sv.semana = S.nuevaSemana(sv, BAL.semana); sv.semanaResumen = null;
  sv.semana = S.elegir(SEM, sv.semana, 0, "entrenar_tiro", cfg);
  S.cerrarSemana(sv, BAL.semana);
  assert(sv.mejoras.tiro > tras1, "la semana de la fecha siguiente sí suma (+" + tras1 + " → +" + sv.mejoras.tiro + ")");
  console.log("[1] 5 cierres de la misma semana: tiro +" + tras1 + " (sin duplicar) · la fecha siguiente suma: +" + sv.mejoras.tiro);
})();

/* ---------- [2] master.js REAL: A LA CANCHA Y CUATRO RECARGAS ---------- */
function escenaDesdeElSave() {
  var s = A.nueva();
  s.create();                                         // lee pampa_master_v1, como al volver a entrar
  return s;
}
function rivalDe(sv) {
  var mp = W.PampaTemporada.miPartido(sv.temporada);
  return mp.local === sv.temporada.miClub ? mp.visita : mp.local;
}
(function () {
  /* 23/oct, pedido de Rodri: la semana de fábrica es la de cuatro cosas
     (test/semana_cuatro.test.js). Esto prueba la de tres días, que sigue
     en el código y vuelve con flags.semana_cuatro en false */
  A.registry.get("balance").flags.semana_cuatro = false;
  A.localStorage.setItem("pampa_master_v1", JSON.stringify(A.carreraNueva()));
  var s = escenaDesdeElSave();
  assert(s.textos().indexOf("PRIMERA B · TEMPORADA 1") >= 0, "control: la escena abre en la tabla");
  s.tocar(310, 460);                                  // ▶ JUGAR LA FECHA
  if (s._semEvento && !s._semEventoResuelto) s.teclas("ENTER");
  var op = A.datos.semana.opciones.find(function (o) { return o.id === "entrenar_tiro"; });
  for (var i = 0; i < 3; i++) { s.ponerEnLaSemana(op); s.correrTimers(); }
  var bolsa0 = JSON.stringify(s.save.bolsaEventos);
  var evento0 = s.save.eventoFecha && s.save.eventoFecha.id;
  var mod0 = JSON.stringify(s.save.modFecha);
  s.cerrarSemana(function () { s.irALaCancha(rivalDe(s.save)); });
  assert(s._irA.indexOf("match") >= 0, "con la semana cerrada se va a la cancha");
  var mp = A.registry.get("masterPartido");
  assert(mp && mp.temporadaN === 1 && mp.fecha === 0, "el partido lleva la fecha que juega (temporada 1, fecha 0)");
  var guardado = JSON.parse(A.localStorage.getItem("pampa_master_v1"));
  var tiro0 = guardado.mejoras.tiro;
  assert(tiro0 > 0, "las mejoras de la semana quedaron en el save (+" + tiro0 + ")");
  assert(S.esLaFecha(guardado, guardado.enCancha), "y dice que se salió a jugar esta fecha (enCancha)");

  /* el teléfono recarga en medio del partido, cuatro veces */
  var rep = [];
  for (var k = 0; k < 4; k++) {
    A.registry.remove("masterPartido");
    var s2 = escenaDesdeElSave();
    var hayRepetir = s2.textos().indexOf("↺ REPETIR EL PARTIDO") >= 0;
    rep.push(hayRepetir);
    s2.tocar(310, 460);                               // el mismo botón
    assert(s2._irA.indexOf("match") >= 0, "recarga " + (k + 1) + ": el botón lleva directo a la cancha");
    assert(s2.textos().indexOf("LA SEMANA · fecha 1") < 0 && !s2._semEvento,
      "recarga " + (k + 1) + ": la semana NO se rearma ni se vuelve a sortear el evento");
  }
  assert(rep.every(Boolean), "SÍNTOMA: después de recargar, la tabla ofrece ↺ REPETIR EL PARTIDO (" + rep.join(",") + ")");
  var fin = JSON.parse(A.localStorage.getItem("pampa_master_v1"));
  assert(fin.mejoras.tiro === tiro0, "SÍNTOMA: 4 recargas dejan tiro en +" + tiro0 + " (dio +" + fin.mejoras.tiro + ")");
  assert(JSON.stringify(fin.bolsaEventos) === bolsa0, "la bolsa de eventos no se vuelve a gastar");
  assert((fin.eventoFecha && fin.eventoFecha.id) === evento0, "el evento de la fecha es el mismo");
  assert(JSON.stringify(fin.modFecha) === mod0, "y lo que se decidió en el evento también");
  var mp2 = A.registry.get("masterPartido");
  assert(mp2 && JSON.stringify(mp2.mejoras) === JSON.stringify(mp.mejoras) && JSON.stringify(mp2.semana) === JSON.stringify(mp.semana),
    "REPETIR manda a la cancha lo mismo que la primera vez (semana y mejoras)");
  console.log("[2] semana + 4 recargas: REPETIR en las 4 · tiro +" + fin.mejoras.tiro + " · evento " + evento0 + " igual · bolsa igual");
})();

/* ---------- [3] EL RESULTADO PENDIENTE SE APLICA UNA VEZ ---------- */
(function () {
  var sv = JSON.parse(A.localStorage.getItem("pampa_master_v1"));
  var res = { temporadaN: 1, fecha: 0, golesMio: 2, golesRival: 1, hiceGol: true, aguanteFinalFrac: 0.5, golpeFuerte: false };
  /* el pitazo: lo que hace match.js, con la lógica de semana.js */
  assert(S.anotarResultado(sv, res) === true, "el resultado de esta fecha se anota");
  A.localStorage.setItem("pampa_master_v1", JSON.stringify(sv));
  /* se cerró la pestaña en GANASTE: nadie tocó SEGUIR, el registry está vacío */
  A.registry.remove("masterResultado");
  var s1 = escenaDesdeElSave();
  var f1 = s1.save.temporada.fecha;
  /* y el registry también lo trae (se tocó SEGUIR): las dos fuentes a la vez */
  A.registry.set("masterResultado", res);
  var s2 = escenaDesdeElSave();
  var f2 = s2.save.temporada.fecha;
  var s3 = escenaDesdeElSave();
  var guard = JSON.parse(A.localStorage.getItem("pampa_master_v1"));
  assert(f1 === 1 && f2 === 1 && s3.save.temporada.fecha === 1 && guard.temporada.fecha === 1,
    "SÍNTOMA: crear la escena varias veces avanza la fecha EXACTAMENTE 1 (" + [f1, f2, s3.save.temporada.fecha, guard.temporada.fecha].join(", ") + ")");
  assert(!guard.resultadoPendiente && !guard.enCancha, "aplicado, el pendiente y la marca de cancha se borran");
  assert(guard.semana == null && guard.semanaResumen == null, "y la semana nueva se arma al entrar (el lunes)");
  var fila = guard.temporada.tabla.find(function (f) { return f.equipo === guard.temporada.miClub; });
  assert(fila.pj === 1 && fila.g === 1 && fila.gf === 2 && fila.gc === 1, "la tabla tiene la fecha sumada (2-1)");
  assert(s1.textos().some(function (t) { return /GANASTE 2-1/.test(t); }), "y la tabla dice ✔ GANASTE 2-1");
  /* la semana de la fecha siguiente arranca de cero y suma de nuevo */
  assert(!S.semanaCerrada(guard), "la fecha nueva no hereda la semana cerrada");

  /* un resultado de OTRA fecha (viejo, o de otra carrera) no se aplica */
  var otro = copia(guard);
  otro.resultadoPendiente = { temporadaN: 1, fecha: 0, golesMio: 5, golesRival: 0 };
  A.localStorage.setItem("pampa_master_v1", JSON.stringify(otro));
  A.registry.remove("masterResultado");
  var s4 = escenaDesdeElSave();
  assert(s4.save.temporada.fecha === 1, "un pendiente de una fecha ya jugada no se vuelve a aplicar");
  assert(!JSON.parse(A.localStorage.getItem("pampa_master_v1")).resultadoPendiente, "y se tira");
  assert(S.anotarResultado(copia(guard), { temporadaN: 2, fecha: 1, golesMio: 1, golesRival: 0 }) === false,
    "anotar un resultado de otra temporada no escribe nada");
  /* un resultado SIN marca de fecha (un partido armado a mano, como el del
     arnés de pruebas) no le suma a la carrera una fecha que no se jugó */
  A.registry.set("masterResultado", { golesMio: 3, golesRival: 0 });
  var s5 = escenaDesdeElSave();
  assert(s5.save.temporada.fecha === 1, "un resultado sin marca de fecha no se aplica");
  assert(A.registry.get("masterResultado") === undefined, "y el registry queda limpio igual");
  console.log("[3] pendiente + registry, 3 entradas: fecha " + f1 + "/" + f2 + "/" + s3.save.temporada.fecha + " · un pendiente viejo se tira");
})();

/* ---------- [4] EL PARTIDO ESCRIBE AL PITAZO ---------- */
(function () {
  /* las escenas tienen fin de línea CRLF: se normaliza para recortar el método */
  var MATCH = fs.readFileSync(path.join(RAIZ, "phaser/scenes/match.js"), "utf8").replace(/\r\n/g, "\n");
  var fin = MATCH.slice(MATCH.indexOf("  finDelPartido() {"));
  fin = fin.slice(0, fin.indexOf("\n  }\n") + 4);
  var iAnota = fin.indexOf("this.anotarResultadoEnLaCarrera(resultado)");
  var iBoton = fin.indexOf('b3.on("pointerdown"');
  assert(iAnota > 0 && iBoton > 0 && iAnota < iBoton,
    "SÍNTOMA: finDelPartido anota el resultado en el save ANTES del botón SEGUIR (al pitazo), no al tocarlo");
  assert(/temporadaN: this\._masterPartido\.temporadaN, fecha: this\._masterPartido\.fecha/.test(fin),
    "el resultado lleva la fecha que mandó el Master");
  assert(/S\.anotarResultado\(sv, res\)/.test(MATCH), "y la decisión de escribir es de logic/semana.anotarResultado");
  /* eventoDeLaFecha: se sortea una vez */
  var sv = A.carreraNueva(), veces = 0;
  var sortear = function () { veces++; return { id: "x", opciones: [{}, {}] }; };
  S.eventoDeLaFecha(sv, sortear); S.eventoDeLaFecha(copia(sv), sortear);
  var e3 = S.eventoDeLaFecha(sv, sortear);
  assert(veces === 1 && e3.id === "x" && e3.resuelto === false, "el evento de la fecha se sortea UNA vez (" + veces + ")");
  console.log("[4] el resultado se anota al pitazo con su fecha · el evento se sortea una vez");
})();

console.log(mal === 0 ? "\n✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "\n✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
