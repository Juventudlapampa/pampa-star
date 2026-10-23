/* PAMPA STAR · test del FESTEJO DEL GOL DE UN COMPAÑERO (23/oct, pedido de
   Rodri): "hoy sale como si lo hubieras hecho vos". El saque del medio que
   sigue al gol cambia st.ctrl ANTES de que la escena festeje, y el festejo
   leía st.ctrl: la silueta, la ilustración y el relator eran del que quedaba
   más cerca de la pelota en el medio. Ahora quien la metió queda en
   st.goleador; festeja su identidad, el cartel lo nombra con su número y la
   tribuna dice su nombre.
   node phaser/test/festejo_companero.test.js */
"use strict";
const fs = require("fs");
const path = require("path");
const RAIZ = path.join(__dirname, "..", "..");
const MAN = JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "identidades_manifest.json"), "utf8"));
const TRIBUNA = JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "tribuna.json"), "utf8"));

let ok = 0, mal = 0;
function assert(cond, msg) { if (cond) ok++; else { mal++; console.error("✗ " + msg); } }

function escena() {
  const E = require("./_partido_de_mentira.js").escena({ mixins: ["phaser/scenes/escenas_v9.js", "phaser/scenes/tribuna_ui.js"] });
  const s = E.s, P = E.W.PampaPartido;
  const mios = [{ nombre: "Arquero", pos: "ARQ" }];
  for (let i = 0; i < 10; i++) mios.push({ nombre: "C" + i, pos: "X" });
  mios[6] = { nombre: "Mateo", pos: "ATA" };
  mios[8] = { nombre: "Rodri", esVos: true };
  s.BAL = E.BAL;
  s.st = P.crearPartido({ bal: E.BAL, mios: mios, rivales: [], rng: function () { return 0.5; } });
  s._identMan = MAN;
  s.textures = {
    exists: function (k) { return /^ident_/.test(k); },
    get: function () { return { getSourceImage: function () { return { height: 420 }; } }; }
  };
  return { E: E, s: s, P: P, mateo: s.st.mios[6], vos: s.st.mios[8] };
}

/* ---------- [1] la lógica: quién la metió sobrevive al saque del medio ---------- */
(function () {
  const C = escena(), st = C.s.st;
  st.ctrl = 6;
  C.P.golMio(st);
  assert(st.goleador === 6, "SÍNTOMA: el gol de Mateo no queda anotado a su nombre (goleador " + st.goleador + ")");
  assert(st.ctrl !== 6, "control: después del gol el saque del medio le pasa el control a otro (ctrl " + st.ctrl + "), que es lo que confundía al festejo");
  assert(!st.hiceGol, "el gol de un compañero no es tuyo para el ánimo de la semana");
  st.ctrl = 8;
  C.P.golMio(st);
  assert(st.goleador === 8 && st.hiceGol, "el tuyo queda a tu nombre (" + st.goleador + ")");
  console.log("[1] st.goleador guarda quién la metió aunque el saque cambie el control");
})();

/* ---------- [2] el festejo: su identidad, no tu ilustración ---------- */
(function () {
  const C = escena(), s = C.s, st = s.st;
  const vistos = [];
  s.texturaEscena = function (j) { vistos.push(j); return null; };
  C.E.W.PampaFeel = { golPico: function () { return 0; }, segunda: function () { }, redSacudida: function () { } };
  st.ctrl = 6;
  s.anotarGolPropio();
  s.festejarGolPropio();
  assert(vistos[0] === C.mateo, "SÍNTOMA: la silueta del festejo es de " + (vistos[0] && vistos[0].nombre) + " y no de Mateo, que la metió");
  delete s.texturaEscena;
  const k = s.festejoDe(C.mateo);
  assert(/^ident_jugador_/.test(k || ""), "Mateo festeja con su identidad (" + k + ")");
  assert(s.texturaEscena(C.mateo, false, "festejo", 0) === k, "y la silueta del cuadro de impacto sale de esa misma ilustración");
  assert(s.festejoDe(C.vos) === null && s.festejoDe(st.mios[0]) === null, "VOS y el arquero siguen con sus poses");
  console.log("[2] la silueta y la ilustración del festejo son del compañero que la metió");
})();

/* ---------- [3] el cartel y el relator lo nombran ---------- */
(function () {
  const C = escena(), s = C.s, st = s.st;
  st.ctrl = 6;
  assert(s.tituloDelGol() === "¡GOOOL DE MATEO!", "SÍNTOMA: el título del cartel no dice quién la metió (" + s.tituloDelGol() + ")");
  assert(s.subDelGol() === "¡El " + C.mateo.numero + " la clavó donde el viento no la saca!", "el sub dice su número (" + s.subDelGol() + ")");
  assert(s.tituloDelGol("¡GOLAZO!") === "¡GOLAZO DE MATEO!", "el grito del súper tiro también lo nombra (" + s.tituloDelGol("¡GOLAZO!") + ")");
  /* el remate por comandos fijaba "¡GOOOL!" en _megaGrito y el cartel del
     cine lo usaba antes que el título: visto en pantalla el 23/oct */
  const M = fs.readFileSync(path.join(RAIZ, "phaser", "scenes", "match.js"), "utf8");
  assert(!/_megaGrito = "¡GOOOL!"|mega\.grito \|\| "¡GOOOL!"/.test(M), "SÍNTOMA: el grito del cine sigue fijo en ¡GOOOL! y tapa el nombre del compañero");
  /* el gol de EL TOQUE (planoDesenlace) no llamaba al relator: ni la viñeta
     ni la tribuna lo comentaban */
  const pd = C.E.W.PampaMatch.prototype.planoDesenlace.toString();
  assert(/this\.golPropio\(\)[\s\S]{0,400}this\.relatar\("gol"\)/.test(pd), "SÍNTOMA: el gol del cine de EL TOQUE no se relata y la tribuna no lo nombra");
  C.P.golMio(st);
  let ctx = null;
  s.REL = { frase: function (sit, c) { ctx = c; return null; } };
  s.tickerTxt = {};
  /* la tribuna de mentira anota qué evento le mandan */
  const eventos = [];
  C.E.W.PampaTribunaUI = { comentar: function (sc, ev) { eventos.push(ev); } };
  s._tribuna = {};
  const relatar = C.E.W.PampaMatch.prototype.relatar;   // el partido de mentira lo apaga: el de verdad
  relatar.call(s, "gol");
  assert(ctx && ctx.jugador === "Mateo", "SÍNTOMA: el relator del gol nombra a " + (ctx && ctx.jugador) + " y no a Mateo");
  assert(eventos[0] === "gol_companero", "SÍNTOMA: la tribuna comenta el gol de Mateo como uno cualquiera (" + eventos[0] + ")");
  st.ctrl = 8;
  C.P.golMio(st);
  relatar.call(s, "gol");
  assert(eventos[1] === "gol" && ctx.jugador === "VOS", "tu gol, con las frases de siempre (" + eventos[1] + ", " + ctx.jugador + ")");
  console.log("[3] el cartel dice su nombre y su número; el relator y la tribuna, el suyo");
})();

/* ---------- [4] la tribuna lo nombra ---------- */
(function () {
  const T = require("./_partido_de_mentira.js").cargar({ mixins: ["phaser/scenes/tribuna_ui.js"] }).W.PampaTribunaUI;
  function objeto() {
    return {
      x: 0, y: 0, alpha: 1, texto: "",
      setPosition(x, y) { this.x = x; this.y = y; return this; },
      setAlpha(a) { this.alpha = a; return this; },
      setVisible() { return this; }, setText(t) { this.texto = t; return this; },
      setTexture() { return this; }, setScale() { return this; }
    };
  }
  function oir(goleador, evento) {
    const st = { golesMio: 1, golesRival: 0, minuto: 30, mios: [{ nombre: "Mateo", numero: 7 }, { nombre: "Rodri", esVos: true }], goleador: goleador };
    const sc = {
      estado: "LIBRE", st: st,
      game: { registry: { get: k => (k === "tribuna" ? TRIBUNA : null) } },
      add: {
        container() { const c = objeto(); c.list = []; c.add = a => { c.list.push(...a); return c; }; return c; },
        graphics() {
          const g = objeto();
          ["fillStyle", "lineStyle", "strokeRoundedRect", "fillTriangle", "strokeCircle", "fillCircle", "fillRoundedRect", "clear"].forEach(m => { g[m] = () => g; });
          return g;
        },
        image: objeto, text: objeto
      },
      textures: { exists: () => false },
      time: { delayedCall: () => ({ remove() { } }) },
      tweens: { add() { }, killTweensOf() { } }
    };
    T.montar(sc);
    const oido = new Set();
    for (let k = 0; k < 40; k++) if (T.comentar(sc, evento, "gol")) oido.add(sc._tribuna.globos.map(b => b.dice.texto).join(" / "));
    return [...oido];
  }
  const suyo = oir(0, "gol_companero"), tuyo = oir(1, "gol");
  assert(suyo.length >= 2, "con el gol de Mateo hay más de una charla (" + suyo.length + ")");
  assert(suyo.every(f => /Mateo/.test(f)), "SÍNTOMA: con el gol de Mateo la tribuna no lo nombra (" + suyo.filter(f => !/Mateo/.test(f)).join(" | ") + ")");
  assert(suyo.concat(tuyo).every(f => f.indexOf("{goleador}") < 0), "ninguna frase sale con la marca {goleador} sin llenar");
  assert(tuyo.length >= 2 && tuyo.every(f => !/Mateo/.test(f)), "con tu gol siguen las de siempre (" + tuyo.length + ")");
  console.log("[4] la tribuna nombra al compañero que la metió; con tu gol, las de siempre");
})();

console.log("\nfestejo_companero: " + ok + " ok, " + mal + " mal");
process.exit(mal ? 1 : 0);
