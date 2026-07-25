/* PAMPA STAR · test de LA VIDA DE LA CARRERA (V8 A1) — origen, bolsa sin
   repetir, condicionales y modificadores acotados que se limpian.
   node phaser/test/vida.test.js */
"use strict";
const path = require("path");
const fs = require("fs");
const V = require(path.join(__dirname, "..", "logic", "vida.js"));

let ok = 0, mal = 0;
function assert(cond, msg) { if (cond) ok++; else { mal++; console.error("✗ " + msg); } }

const D = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "data", "eventos_temporada.json"), "utf8"));

/* --- data sana --- */
assert(D.origen && D.origen.length === 3, "3 pantallas de origen");
D.origen.forEach(p => {
  assert(p.pregunta && p.opciones && p.opciones.length === 4, "pantalla " + p.id + ": pregunta + 4 opciones");
  p.opciones.forEach(o => assert(o.t && o.frase && o.stats, "opción con texto, frase y stats: " + p.id));
});
assert(D.eventos.length >= 24, "al menos 24 eventos (hay " + D.eventos.length + ")");
const cats = new Set(D.eventos.map(e => e.categoria));
["clima", "pueblo", "equipo", "rival", "vida"].forEach(c => assert(cats.has(c), "existe la categoría " + c));
assert(new Set(D.eventos.map(e => e.id)).size === D.eventos.length, "ids de evento únicos");
D.eventos.forEach(e => {
  assert(e.texto && e.texto.length > 20, e.id + ": texto presente");
  assert(e.opciones && e.opciones.length === 2, e.id + ": exactamente 2 respuestas");
  e.opciones.forEach(o => {
    assert(o.texto && o.frase_relator, e.id + ": opción con texto y frase del relator");
    assert(o.efecto && typeof o.efecto === "object", e.id + ": opción con efecto (puede ser {})");
    Object.keys(o.efecto).forEach(k => assert(V.TOPES[k] !== undefined, e.id + ": efecto desconocido '" + k + "'"));
  });
  /* ninguna opción es objetivamente la mejor: si una tiene efectos y la otra
     también, ninguna debe dominar en TODO (o una es el "neutro" explícito) */
  const [a, b] = e.opciones;
  const na = Object.keys(a.efecto).length, nb = Object.keys(b.efecto).length;
  assert(na === 0 || nb === 0 || !(na > 0 && nb > 0 && JSON.stringify(a.efecto) === JSON.stringify(b.efecto)), e.id + ": las dos opciones son idénticas");
});
/* §11: nada de plata, apuestas ni marcas en los TEXTOS DE JUEGO (los _doc del
   manifest quedan fuera: ahí justamente se documenta la prohibición) */
const todoTexto = JSON.stringify({
  origen: D.origen,
  eventos: D.eventos.map(e => ({ t: e.texto, o: e.opciones.map(o => [o.texto, o.frase_relator]) }))
}).toLowerCase();
["apuesta", "apostar", "quiniela", "casino", "sueldo", "$", "pesos", "cobrar", "presupuesto"].forEach(p =>
  assert(todoTexto.indexOf(p) < 0, "§11: aparece '" + p + "' en los textos de la vida"));

/* --- PARTE 1: el origen reparte y deja frase --- */
const or = V.aplicarOrigen(D, [0, 0, 1]);
assert(or.stats.gambeta > 0 && or.stats.resistencia > 0, "origen potrero+campo suma gambeta y resistencia");
assert(or.frases.length === 3, "el origen deja 3 frases");
assert(or.marcas.indexOf("cosecha") >= 0, "elegir 'laburo en el campo' deja la marca cosecha");
const ficha = V.fichaOrigen("Thiago", or, "Winifreda");
assert(/Thiago/.test(ficha) && /potrero/.test(ficha) && /Winifreda/.test(ficha), "ficha corta legible: " + ficha);
assert(V.aplicarOrigen(D, [99, -3, 1.7]).frases.length === 3, "índices raros no rompen el origen");
assert(V.aplicarOrigen(null, null).frases.length === 0, "origen sin data no explota");

/* --- PARTE 2: la bolsa NO repite hasta agotarse --- */
const ctxLibre = { fecha: 3, clasico: false, posRival: 5, posMia: 5, racha: 0, marcas: [] };
const universo = D.eventos.filter(e => V.aplicaCondicion(e, ctxLibre)).length;
let vistos = [], salieron = [], reinicios = 0;
for (let i = 0; i < universo * 2; i++) {
  const r = V.elegirEvento(D, vistos, ctxLibre, 1000 + i);
  assert(r && r.evento, "la bolsa siempre devuelve un evento (i=" + i + ")");
  if (r.reinicio) reinicios++;
  if (i < universo) salieron.push(r.evento.id);
  vistos = r.vistos;
}
assert(new Set(salieron).size === universo, "la bolsa recorrió los " + universo + " sin repetir (dio " + new Set(salieron).size + ")");
assert(reinicios === 1, "la bolsa se dio vuelta UNA vez al agotarse (dio " + reinicios + ")");

/* --- condicionales: solo cuando corresponde --- */
const soloClasico = D.eventos.find(e => e.condicion === "clasico");
assert(!V.aplicaCondicion(soloClasico, { clasico: false }), "el evento del clásico NO sale sin clásico");
assert(V.aplicaCondicion(soloClasico, { clasico: true }), "el evento del clásico sale con clásico");
const cosecha = D.eventos.find(e => e.condicion === "campo");
assert(!V.aplicaCondicion(cosecha, { marcas: [] }), "la cosecha NO sale si no laburás el campo");
assert(V.aplicaCondicion(cosecha, { marcas: ["cosecha"] }), "la cosecha sale si laburás el campo");
const primera = D.eventos.find(e => e.condicion === "primera");
assert(V.aplicaCondicion(primera, { fecha: 0 }) && !V.aplicaCondicion(primera, { fecha: 4 }), "'primera fecha' solo en la fecha 1");
const rachaB = D.eventos.find(e => e.condicion === "racha_buena");
assert(V.aplicaCondicion(rachaB, { racha: 3 }) && !V.aplicaCondicion(rachaB, { racha: 1 }), "racha buena pide 3+");
/* y en un contexto sin ninguna condición cumplida, los condicionales NO aparecen */
let v2 = [], apareceCondicional = false;
for (let i = 0; i < 40; i++) {
  const r = V.elegirEvento(D, v2, ctxLibre, 7000 + i);
  if (r.evento.condicion && !V.aplicaCondicion(r.evento, ctxLibre)) apareceCondicional = true;
  v2 = r.vistos;
}
assert(!apareceCondicional, "nunca sale un condicional que no corresponde");

/* --- modificadores: chicos, acotados, y se limpian --- */
const ev = D.eventos.find(e => e.id === "pampero");
const m0 = V.aplicarEleccion(ev, 0), m1 = V.aplicarEleccion(ev, 1);
assert(m0.mod.tiro === 6 && m0.frase.length > 10, "elección 0 del pampero: +6 tiro y frase del relator");
assert(m1.mod.pase === 6 && m1.mod.tiro === -3, "elección 1 del pampero: +pase -tiro");
assert(V.aplicarEleccion(ev, 99).eventoId === "pampero", "índice fuera de rango no rompe");
D.eventos.forEach(e => e.opciones.forEach((o, i) => {
  const m = V.aplicarEleccion(e, i);
  Object.keys(m.mod).forEach(k => {
    const tope = V.TOPES[k];
    assert(Math.abs(m.mod[k]) <= tope, e.id + ": efecto " + k + "=" + m.mod[k] + " excede el tope " + tope);
  });
}));
const save = { modFecha: m0 };
V.limpiar(save);
assert(save.modFecha === null, "el modificador se limpia al terminar la fecha");

if (mal === 0) console.log("✓ TODOS OK — " + ok + " asserts, 0 fallaron.");
else { console.error("✗ " + mal + " FALLARON (" + ok + " ok)"); process.exit(1); }
