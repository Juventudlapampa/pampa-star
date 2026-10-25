/* PAMPA STAR · EL FINAL DE LA CARRERA (25/oct, pedido de Rodri)
   "Ganar el Mundial es una línea chica y un botón que te lo hace jugar de
   nuevo, y los ascensos no tienen escena." Una carrera entera en node, con
   la lógica de verdad, hasta cada momento: los cuatro ascensos, un descenso,
   la gloria, la segunda entrevista de Nito, TU CARRERA, la leyenda y un
   título defendido. Después, las vistas reales del Master en la escena de
   mentira: la ceremonia, el cierre y que el Mundial ganado no se pueda volver
   a jugar con un botón.
   node phaser/test/carrera_final.test.js */
"use strict";
const path = require("path"), fs = require("fs");
const RAIZ = path.join(__dirname, "..", "..");
const json = f => JSON.parse(fs.readFileSync(path.join(RAIZ, f), "utf8"));
const T = require("../logic/temporada.js"), Ma = require("../logic/master.js");
const Fi = require("../logic/final.js"), V = require("../logic/vida.js"), SM = require("../logic/save_master.js");
const BAL = json("phaser/data/balance.json"), DIV = json("data/divisiones.json"), MEGA = json("data/megacosas.json");
const VIDA = json("data/eventos_temporada.json"), ENT = json("data/entrevista.json"), FIN = json("data/final.json");
let ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("✗ " + m); } }

const ids = Ma.DIVISIONES.map(d => d.id);
const cfgP = BAL.partido;
const club = "El Bagual de Winifreda";
const crear = (d, n) => T.crear({ division: d, miClub: club, rivales: DIV.divisiones[d].rivales, semilla: Ma.hashClub(club) * 31 + n });
function carrera(elecciones) {
  return { v: 1, club, pueblo: "Winifreda", division: "primera_b", temporadaN: 1, titulos: [],
    origen: V.aplicarOrigen(VIDA, elecciones), bolsaEventos: [], modFecha: null, racha: 0,
    historial: [], golesTuyosTemporada: 0, temporada: crear("primera_b", 1) };
}
/* juega la temporada entera: cada fecha tuya con ese resultado y tus goles */
function jugar(save, mio, rival, tuyos) {
  const t = save.temporada;
  while (!T.terminada(t)) {
    const mp = T.miPartido(t);
    if (mp) { T.jugarFecha(t, mio, rival); if (typeof save.golesTuyosTemporada === "number") save.golesTuyosTemporada += tuyos; }
    else T.jugarFecha(t, null, null);
  }
}
const cerrar = (save, v) => Fi.cerrarTemporada(T, save, v, Ma.DIVISIONES, { crear });

/* ── 1 · la primera entrevista queda guardada ── */
const s = carrera([0, 3, 1]);
assert(JSON.stringify(s.origen.elecciones) === "[0,3,1]", "aplicarOrigen guarda qué contestaste (" + JSON.stringify(s.origen.elecciones) + ")");

/* ── 2 · la escalera: cuatro títulos con su ceremonia ── */
const vistas = [];
for (let k = 0; k < 4; k++) {
  jugar(s, 3, 0, 1);
  const nivelAntes = Math.max(Ma.nivelDeDivision(s.division), s.nivelMax | 0);
  const v = Fi.veredicto(T, s, ids, cfgP);
  assert(v.campeon && v.asciende && Fi.ceremoniaDe(v) === "titulo", "temporada " + s.temporadaN + ": campeón, sube y tiene ceremonia de título (" + Fi.ceremoniaDe(v) + ")");
  vistas.push({ de: s.division, a: v.proximaDivision, des: Fi.desbloqueosDe(nivelAntes, Ma.nivelDeDivision(v.proximaDivision), MEGA, BAL),
    cambios: Fi.cambiosDeDivision(Ma.DIVISIONES, s.division, v.proximaDivision) });
  cerrar(s, v);
}
assert(s.division === "mundial" && s.temporadaN === 5 && s.titulos.length === 4, "cuatro ascensos llevan al Mundial (" + s.division + ", t" + s.temporadaN + ")");
assert(s.historial.length === 4 && s.historial.every(f => f.campeon && f.asciende && f.golesTuyos === 18), "el historial anota cada temporada con tus goles (" + s.historial.map(f => f.golesTuyos).join(",") + ")");
assert(vistas.every(x => x.cambios.length === 1 && x.cambios[0].marca === "▲"), "cada ascenso dice cómo cambian los rivales, con ▲");
/* con la poda: solo el súper tiro cambia, en el 3 (Atuel) y en el 5 (Tornado) */
assert(vistas[0].des.length === 0 && vistas[2].des.length === 0, "con la poda, subir al 2 y al 4 no anuncia nada apagado");
assert(vistas[1].des.length === 1 && /×1,3 a ×1,45/.test(vistas[1].des[0].texto), "subir al Regional: el súper tiro pega más fuerte (" + (vistas[1].des[0] || {}).texto + ")");
assert(vistas[3].des.length === 1 && /×1,6/.test(vistas[3].des[0].texto), "subir al Mundial: el súper tiro del Tornado");
/* con todo prendido: lo del olas.json L20 (las 4 cosas del 2 y el Tornado del 5) */
const PRENDIDO = Object.assign({}, BAL, { flags: Object.assign({}, BAL.flags, { megatiros_con_nombre: true, megadefensas: true, v6_secuencias: true }) });
const d12 = Fi.desbloqueosDe(1, 2, MEGA, PRENDIDO).map(x => x.id).sort().join(",");
assert(d12 === "combinada,medano,megacorrida,pampero", "desbloqueosDe(1,2) con todo prendido: las 4 cosas (" + d12 + ")");
assert(Fi.desbloqueosDe(4, 5, MEGA, PRENDIDO).map(x => x.texto).join("|").indexOf("Tornado Pampeano") === 0, "desbloqueosDe(4,5): el Tornado con su nombre");
assert(Fi.desbloqueosDe(3, 3, MEGA, PRENDIDO).length === 0, "un nivel que no sube no destraba nada");

/* ── 3 · el descenso, con su ceremonia y la marca de agua ── */
const b = carrera([2, 0, 3]);
jugar(b, 3, 0, 0); cerrar(b, Fi.veredicto(T, b, ids, cfgP));
jugar(b, 0, 3, 0);
const vb = Fi.veredicto(T, b, ids, cfgP);
assert(vb.desciende && Fi.ceremoniaDe(vb) === "descenso" && vb.proximaDivision === "primera_b", "perder todo en la Primera A: descenso con ceremonia");
assert(Fi.cambiosDeDivision(Ma.DIVISIONES, "primera_a", "primera_b")[0].marca === "▼", "el descenso dice que los rivales bajan, con ▼");
cerrar(b, vb);
assert(b.division === "primera_b" && b.nivelMax === 2 && b.historial[1].desciende, "bajás sin perder el nivel (" + b.nivelMax + ") y queda anotado");
/* terminar en el medio no tiene ceremonia */
jugar(b, 1, 1, 0);
assert(Fi.ceremoniaDe(Fi.veredicto(T, b, ids, cfgP)) === null, "una temporada de empates no tiene ceremonia");

/* ── 4 · la gloria y el cierre ── */
jugar(s, 3, 0, 2);
const vg = Fi.veredicto(T, s, ids, cfgP);
assert(vg.gloria && Fi.ceremoniaDe(vg) === "gloria", "campeón del Mundial: la gloria");
const charla = Fi.segundaEntrevista(s, VIDA.origen, ENT, FIN.cierre, vg);
const dichas = [ENT.preguntas.donde.respuestas[0], ENT.preguntas.afuera.respuestas[3], ENT.preguntas.consejo.respuestas[1]];
assert(dichas.every(r => charla.some(l => l.quien === "nito" && l.texto.indexOf("«" + r + "»") >= 0)), "Nito cita palabra por palabra las tres respuestas de la primera entrevista");
assert(charla.some(l => l.quien === "vos" && l.texto === FIN.cierre.preguntas.afuera.vos[3]), "y vos contestás según lo que dijiste aquella vez");
assert(charla[charla.length - 1].texto.indexOf("Winifreda") >= 0 && charla[charla.length - 1].texto.indexOf("5 títulos") >= 0, "el cierre nombra la localidad y cuenta el Mundial, que todavía no se anotó");
const tc = Fi.tuCarrera(T, s, Ma.DIVISIONES, vg);
assert(tc.titulos === 5 && tc.filas.length === 5 && tc.filas[4].gloria && tc.golesTuyos === 4 * 18 + 18 * 2 && !tc.golesSinAnotar && tc.temporadasSinAnotar === 0,
  "TU CARRERA: 5 filas, la última es la gloria, tus goles suman (" + tc.golesTuyos + ")");

/* ── 5 · SEGUIR COMO LEYENDA: el Mundial ganado no vuelve como si nada ── */
Fi.seguirComoLeyenda(T, s, vg, Ma.DIVISIONES, { crear }, BAL.final);
assert(s.final_visto && s.leyenda && s.leyenda.defendidos === 0 && s.division === BAL.final.leyenda_division && s.titulos.length === 5,
  "la leyenda arranca en " + s.division + " con el título del mundo anotado");
assert(T.zonaDescenso(s.temporada, Fi.cfgDeLaTemporada(s, cfgP)).length === 0, "la leyenda no tiene zona de descenso");
jugar(s, 0, 3, 0);
const vl = Fi.veredicto(T, s, ids, cfgP);
assert(!vl.desciende && !vl.gloria && Fi.ceremoniaDe(vl) === null && vl.proximaDivision === "mundial", "último como leyenda: no baja, no hay gloria ni ceremonia");
cerrar(s, vl);
jugar(s, 3, 0, 1);
const vd = Fi.veredicto(T, s, ids, cfgP);
assert(vd.defendido && !vd.gloria && Fi.ceremoniaDe(vd) === "defendido", "ganar como leyenda es título DEFENDIDO, no la gloria otra vez");
cerrar(s, vd);
assert(s.leyenda.defendidos === 1 && s.titulos.length === 6 && s.historial[s.historial.length - 1].defendido, "el defendido se cuenta");

/* ── 6 · los saves viejos ── */
/* una carrera de antes: origen sin elecciones, sin historial, con títulos */
const viejo = { v: 1, club, pueblo: "Winifreda", division: "regional", temporadaN: 4, titulos: [{ division: "primera_b", temporada: 1 }, { division: "primera_a", temporada: 3 }],
  origen: { stats: {}, frases: ["el que le pegaba a la pared del galpón", "el de las changas", "el que juega para el equipo"], marcas: [] },
  bolsaEventos: [], modFecha: null, racha: 0, temporada: crear("regional", 4) };
const r = SM.sanear(JSON.stringify(viejo), ids, {});
assert(r.save && !r.irrecuperable && r.save.historial === undefined, "el save viejo pasa el saneo sin inventarle historial");
assert(Fi.migrarElecciones(r.save, VIDA.origen) && JSON.stringify(r.save.origen.elecciones) === "[2,2,2]", "las respuestas se recuperan de las frases (" + JSON.stringify(r.save.origen.elecciones) + ")");
assert(!Fi.migrarElecciones(r.save, VIDA.origen), "la migración se hace una sola vez");
const raro = { origen: { frases: ["algo que no está en la data"] } };
assert(!Fi.migrarElecciones(raro, VIDA.origen) && raro.origen.elecciones === undefined, "frases que no se reconocen no inventan respuestas");
const sinGrab = Fi.segundaEntrevista(Object.assign({}, r.save, { origen: null }), VIDA.origen, ENT, FIN.cierre);
assert(sinGrab.some(l => l.texto === FIN.cierre.sin_grabacion.nito), "sin la primera entrevista, Nito dice que no quedó grabada");
jugar(r.save, 3, 0, 0);
const tv = Fi.tuCarrera(T, r.save, Ma.DIVISIONES, Fi.veredicto(T, r.save, ids, cfgP));
assert(tv.filas.length === 3 && tv.filas[0].soloTitulo && tv.filas[1].soloTitulo && tv.temporadasSinAnotar === 3 && tv.golesSinAnotar,
  "TU CARRERA de un save viejo: los títulos sin tabla y lo que falta, dicho (" + tv.temporadasSinAnotar + " sin anotar)");
/* el saneo valida los campos nuevos */
const sucio = JSON.parse(JSON.stringify(s));
sucio.historial = [{ temporada: 1, division: "primera_b" }, "basura"]; sucio.leyenda = "sí"; sucio.final_visto = 1; sucio.golesTuyosTemporada = "x";
const rs = SM.sanear(sucio, ids, {});
assert(rs.save.historial.length === 1 && rs.save.leyenda.defendidos === 0 && rs.save.final_visto === true && rs.save.golesTuyosTemporada === undefined,
  "el saneo arregla historial, leyenda, final_visto y los goles (" + rs.reparado.join(" · ") + ")");

/* ── 7 · tus goles viajan del partido al save ── */
const P = require("../logic/partido.js");
const misP = [{ nombre: "Arquero", pos: "ARQ" }];
for (let i = 0; i < 10; i++) misP.push({ nombre: "C" + i, pos: "X" });
misP[8] = { nombre: "Vos", esVos: true };
const stP = P.crearPartido({ bal: BAL, mios: misP, rivales: [], rng: function () { return 0.5; } });
stP.ctrl = 6; P.golMio(stP);
stP.ctrl = 8; P.golMio(stP);
stP.ctrl = 8; P.golMio(stP);
assert(stP.golesMio === 3 && stP.golesVos === 2, "golMio cuenta solo tus goles (" + stP.golesVos + " de " + stP.golesMio + ")");
const Sem = require("../logic/semana.js");
const sv = { temporadaN: 2, temporada: { fecha: 4 } };
Sem.anotarResultado(sv, { temporadaN: 2, fecha: 4, golesMio: 3, golesRival: 1, golesVos: 2 });
assert(sv.resultadoPendiente && sv.resultadoPendiente.golesVos === 2, "anotarResultado guarda tus goles del partido");

/* ── 7b · data/final.json llega al registry. Medido en el navegador: el
   preBoot nombraba `final` y arrancarCon no lo recibía, y el juego entero no
   arrancaba ("No terminó de bajar el juego"). Cada valor que preBoot pone en
   el registry tiene que ser un parámetro de arrancarCon ── */
const IDX = fs.readFileSync(path.join(RAIZ, "phaser/index.html"), "utf8");
const params = ((IDX.match(/function arrancarCon\(([^)]*)\)/) || [])[1] || "").split(",").map(x => x.trim());
const pre = (IDX.match(/preBoot: \(game\)=>\{([^}]*)\}/) || [])[1] || "";
const valores = (pre.match(/registry\.set\("[a-z]+", (\w+)\)/g) || []).map(x => x.replace(/.*, (\w+)\)$/, "$1"));
assert(valores.indexOf("final") >= 0 && valores.every(x => params.indexOf(x) >= 0), "lo que preBoot guarda en el registry lo recibe arrancarCon (" + valores.filter(x => params.indexOf(x) < 0).join(", ") + ")");
assert(/arrancarCon\([^)]*ambientes, final\)/.test(IDX), "y arrancar le pasa el final");

/* ── 8 · las vistas reales del Master, en la escena de mentira ── */
const M = require("./_escena_de_mentira.js");
const A = M.armar({ logicaExtra: ["phaser/logic/final.js"], escena: "phaser/scenes/ceremonia_ui.js" });
["final", "megacosas", "relatos", "tribuna"].forEach(k => A.reg.set(k, { final: FIN, megacosas: MEGA, relatos: json("data/relatos.json"), tribuna: json("data/tribuna.json") }[k]));
A.reg.set("poses", json("data/poses_manifest.json"));
function escena() {
  const e = A.nueva();
  e.destello = function () { e._destellos = (e._destellos | 0) + 1; return true; };
  e.load = { image: function () { }, once: function (n, fn) { e._alCargar = fn; }, start: function () { if (e._alCargar) e._alCargar(); } };
  return e;
}
const tocarTexto = (e, txt) => {
  const o = e.children.list.find(x => x.type === "Text" && x.text === txt && x.scene);
  return o ? e.tocar(o.x, o.y) : null;
};
/* un save al final del Mundial (la carrera de arriba, antes de la leyenda) */
const g = carrera([3, 1, 0]);
for (let k = 0; k < 4; k++) { jugar(g, 3, 0, 1); cerrar(g, Fi.veredicto(T, g, ids, cfgP)); }
jugar(g, 3, 0, 1);
A.store.pampa_master_v1 = JSON.stringify(g);
let e = escena();
e.create();
assert(e.textos().indexOf("CAMPEÓN DEL MUNDO") >= 0 && e.textos().indexOf("▶ NUEVA TEMPORADA") < 0, "al terminar el Mundial, la ceremonia de la gloria (corte 1)");
assert(e._destellos === 1, "un solo destello en la ceremonia");
e.teclas("ENTER");
assert(e.textos().some(t => /Nelda|NELDA/.test(t)) && e.textos().indexOf("▶ A LA RADIO") >= 0, "ENTER saltea al último corte: la tribuna y A LA RADIO");
e.teclas("ENTER");
const enRadio = e.textos().join("|");
assert(enRadio.indexOf("TERCER TIEMPO") >= 0, "A LA RADIO lleva a la segunda entrevista de Nito");
assert(JSON.parse(A.store.pampa_master_v1).ceremoniaVista === 5, "la ceremonia queda vista (no se repite al volver a la tabla)");
let vueltas = 0;
while (e.textos().indexOf("TU CARRERA") < 0 && vueltas++ < 40) { e.leerHastaElFinal(); e.teclas("ENTER"); }
const enCarrera = e.textos();
assert(enCarrera.indexOf("TU CARRERA") >= 0 && enCarrera.some(t => /CAMPEÓN DEL MUNDO/.test(t)), "después de Nito, TU CARRERA con la fila de la gloria");
assert(enCarrera.some(t => /aprendiste: Con mi hermano mayor$/.test(t)), "TU CARRERA dice dónde aprendiste, con el rótulo de la entrevista y sin comillas (pedido del 25/oct: la cita es la de Nito)");
e.teclas("ENTER");
const enCreditos = e.textos();
assert(enCreditos.indexOf("CRÉDITOS") >= 0 && enCreditos.some(t => /Subsecretaría de Juventudes/.test(t)) && enCreditos.some(t => /Phaser 3\.80\.1/.test(t)), "los créditos de la página");
assert(enCreditos.indexOf("▶ SEGUIR COMO LEYENDA") >= 0 && enCreditos.indexOf("NUEVA CARRERA") >= 0 && enCreditos.indexOf("▶ NUEVA TEMPORADA") < 0, "las dos salidas, y ninguna repite el Mundial");
/* revisión del 25/oct: un ENTER de más al pasar desde TU CARRERA elegía la leyenda */
assert(enCreditos.indexOf("◀ TU CARRERA") >= 0 && e._foco && e._foco.i === 0, "en los créditos el cursor arranca en ◀ TU CARRERA y no en SEGUIR COMO LEYENDA");
assert(!enCreditos.some(t => /a confirmar|confirma la Subsecretaría/.test(t)), "los créditos no muestran notas internas de licencias");
/* volver a la tabla sin elegir: el botón lleva al cierre, no a otra temporada */
e = escena(); e.create();
assert(e.textos().indexOf("▶ EL CIERRE DE TU CARRERA") >= 0 && e.textos().indexOf("▶ NUEVA TEMPORADA") < 0, "en la tabla, el Mundial ganado ofrece EL CIERRE y no NUEVA TEMPORADA");
tocarTexto(e, "▶ EL CIERRE DE TU CARRERA");
assert(e.textos().indexOf("▶ SEGUIR COMO LEYENDA") >= 0, "con el cierre ya visto, el botón va directo a la elección");
tocarTexto(e, "▶ SEGUIR COMO LEYENDA");
const gl = JSON.parse(A.store.pampa_master_v1);
assert(gl.leyenda && gl.temporadaN === 6 && gl.division === "mundial" && gl.titulos.length === 5 && gl.historial.length === 5, "SEGUIR COMO LEYENDA guarda la temporada 6 como leyenda");
e = escena(); e.create();
assert(e.textos().some(t => /EL MUNDIAL · LEYENDA · TEMPORADA 6/.test(t)), "la tabla de la leyenda lo dice arriba");

/* un ascenso: la ceremonia del título, con lo que cambia, y SEGUIR vuelve a la tabla */
const a = carrera([0, 0, 0]);
jugar(a, 3, 0, 1);
A.store.pampa_master_v1 = JSON.stringify(a);
e = escena(); e.create();
e.teclas("ENTER");
const tx = e.textos();
assert(tx.indexOf("CAMPEÓN DE LA PRIMERA B") >= 0 && tx.indexOf("▲ SUBÍS A LA PRIMERA A") >= 0 && tx.some(t => /^▲ Los rivales: \+16%/.test(t)), "la ceremonia del título: titular, ascenso y lo que cambia");
assert(!tx.some(t => /^[▲▼] [A-ZÁÉÍÓÚ ]+: /.test(t)) && tx.some(t => /^NELDA: /.test(t)), "la tribuna de la ceremonia va con el nombre y sin ▲ ni ▼, que ahí dicen subir y bajar (revisión del 25/oct)");
tocarTexto(e, "▶ SEGUIR");
assert(e._restarts === 1, "SEGUIR vuelve a la tabla");
e = escena(); e.create();
assert(e.textos().indexOf("▶ NUEVA TEMPORADA") >= 0 && e.textos().indexOf("CAMPEÓN DE LA PRIMERA B") < 0, "en la tabla la ceremonia no se repite y está NUEVA TEMPORADA");
assert(e.textos().indexOf("¡CAMPEÓN! SUBÍS A LA PRIMERA A") >= 0, "la tabla dice a dónde subís con el artículo, como la ceremonia (revisión del 25/oct: decía SUBÍS A EL MUNDIAL)");
tocarTexto(e, "▶ NUEVA TEMPORADA");
const a2 = JSON.parse(A.store.pampa_master_v1);
assert(a2.division === "primera_a" && a2.historial.length === 1 && a2.golesTuyosTemporada === 0 && a2.ceremoniaVista === undefined, "NUEVA TEMPORADA cierra con historial y la ceremonia queda para la próxima");

/* volver de un partido con dos goles tuyos: TU CARRERA los cuenta */
const cg = carrera([0, 0, 0]);
A.store.pampa_master_v1 = JSON.stringify(cg);
A.reg.set("masterResultado", { temporadaN: 1, fecha: 0, golesMio: 3, golesRival: 1, golesVos: 2, hiceGol: true, aguanteFinalFrac: 0.5, golpeFuerte: false });
e = escena(); e.create();
const cg2 = JSON.parse(A.store.pampa_master_v1);
assert(cg2.temporada.fecha === 1 && cg2.golesTuyosTemporada === 2, "el resultado del partido suma tus goles a la temporada (" + cg2.golesTuyosTemporada + ")");

/* el descenso en pantalla */
A.store.pampa_master_v1 = JSON.stringify((function () { const d = carrera([1, 1, 1]); jugar(d, 3, 0, 0); cerrar(d, Fi.veredicto(T, d, ids, cfgP)); jugar(d, 0, 3, 0); return d; })());
/* con el arte ya cargado (la segunda ceremonia de la sesión) se arma en el
   mismo create, sin esperar al cargador: medido en el navegador, esa vuelta
   quedaba en negro */
e = escena();
e.textures.exists = function () { return true; };
e.sys.settings.status = 3;
e.create(); e.teclas("ENTER");
assert(e.textos().indexOf("▼ BAJÁS A LA PRIMERA B") >= 0 && e.textos().some(t => /^■ Lo que destrabaste se queda/.test(t)) && !e._destellos, "la ceremonia del descenso: sin destello y con lo que conservás");

console.log((mal ? "✗" : "✓") + " carrera_final: " + ok + " bien, " + mal + " mal");
process.exit(mal ? 1 : 0);
