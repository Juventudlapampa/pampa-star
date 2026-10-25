/* ============================================================================
   PAMPA STAR · test de LOS DIÁLOGOS (playtest de Rodri del 20/oct, puntos 3 y 4)
   Corré:  node phaser/test/dialogo.test.js
   La entrevista, el evento y la previa salen letra por letra con voz; cada
   opción tiene una línea corta y su dibujito; la previa cuenta rival,
   estrella, localidad y relator; el relato fuerte va en viñeta.
   ========================================================================== */
"use strict";
var D = require("../logic/dialogo.js");
var fs = require("fs"), path = require("path");
var RAIZ = path.join(__dirname, "../..");
function json(f) { return JSON.parse(fs.readFileSync(path.join(RAIZ, f), "utf8")); }
function leer(f) { return fs.readFileSync(path.join(RAIZ, f), "utf8").replace(/\r\n/g, "\n"); }
var BAL = json("phaser/data/balance.json"), REL = json("data/relatos.json"), VIDA = json("data/eventos_temporada.json");
var ROSTER = json("data/roster_pampeano.json"), DIV = json("data/divisiones.json"), MAN = json("data/portraits_manifest.json");
var MASTER = leer("phaser/scenes/master.js"), MATCH = leer("phaser/scenes/match.js");

var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.error("  ✗ " + m); } }

/* los dibujitos que existen: las claves de DIBUJO en master.js dibujarIcono */
var bloque = MASTER.slice(MASTER.indexOf("const DIBUJO = {"), MASTER.indexOf("if (!DIBUJO[id])"));
var DIBUJOS = (bloque.match(/^ {6}(\w+): \(\) =>/gm) || []).map(function (l) { return l.trim().split(":")[0]; });

/* ---------- [1] letra por letra, con voz ---------- */
(function () {
  var cfg = BAL.dialogo;
  ok(D.letrasA(0, 40, cfg.ms_letra) === 0, "al arrancar no hay letras");
  ok(D.letrasA(cfg.ms_letra * 10, 40, cfg.ms_letra) === 10, "las letras salen por reloj, no por cuadro");
  ok(D.letrasA(1e6, 40, cfg.ms_letra) === 40, "y nunca pasan del texto");
  ok(D.conVoz("a") && D.conVoz("Ñ") && D.conVoz("é") && !D.conVoz(" ") && !D.conVoz(",") && !D.conVoz("¿"), "suenan las letras, no los espacios ni la puntuación");
  /* la voz no es metralla: con el piso, a lo sumo un golpe cada dos letras */
  ok(cfg.piso_voz_ms >= cfg.ms_letra * 2, "el piso de la voz deja sonar a lo sumo una letra de cada dos (" + cfg.piso_voz_ms + " ms)");
  /* suave: bajita y sin agudos de pito */
  Object.keys(cfg.voces).forEach(function (q) {
    var v = cfg.voces[q];
    ok(v.gain > 0 && v.gain <= 0.25 && v.rate >= 0.6 && v.rate <= 1.4, "la voz de '" + q + "' es bajita y no chilla (" + v.rate + ", " + v.gain + ")");
  });
  var conPrevia = REL.relatores.filter(function (r) { return r.previa && r.previa.length; }).map(function (r) { return r.id; });
  ["nito", "vos", "semana", MAN.relator.partido].concat(conPrevia).forEach(function (q) {
    var t = null; try { t = D.tono(cfg, q, 0); } catch (e) { }
    ok(!!t, "hay voz para '" + q + "'");
  });
  var tonos = [0, 1, 2].map(function (n) { return D.tono(cfg, "nito", n).rate; });
  ok(tonos[0] !== tonos[1] && tonos[1] !== tonos[2], "el tono da una vuelta chica cada tres letras");
  ok(/voz: \(function \(\)/.test(leer("phaser/audio/sfx.js")) && /muestra\("ui_mover"/.test(leer("phaser/audio/sfx.js")), "la voz sale de la madera de la interfaz (ui_mover), no de un sintetizador");
  ["vistaOrigen", "vistaEvento", "vistaPrevia"].forEach(function (v) {
    var cuerpo = MASTER.slice(MASTER.indexOf("  " + v + "("), MASTER.indexOf("\n  }\n", MASTER.indexOf("  " + v + "(")));
    ok(/this\.escribir\(/.test(cuerpo), v + " escribe letra por letra");
  });
  console.log("[1] letra por letra con voz · " + Object.keys(cfg.voces).length + " voces · dibujitos: " + DIBUJOS.length);
})();

/* ---------- [2] las opciones: una línea corta, bajada y dibujito ---------- */
(function () {
  VIDA.origen.forEach(function (p) {
    p.opciones.forEach(function (o) {
      ok(typeof o.corto === "string" && o.corto.length <= 26, "entrevista '" + p.id + "': la línea corta entra en un renglón (" + o.corto + ")");
      ok(typeof o.sub === "string" && o.sub.length <= 32, "y la bajada es corta (" + o.sub + ")");
      ok(DIBUJOS.indexOf(o.ico) >= 0, "y su dibujito existe (" + o.ico + ")");
    });
  });
  VIDA.eventos.forEach(function (e) {
    e.opciones.forEach(function (o) {
      var ico = D.iconoDeEfecto(o.efecto), baj = D.bajadaDeEfecto(o.efecto);
      ok(DIBUJOS.indexOf(ico) >= 0, "evento '" + e.id + "': el dibujito existe (" + ico + ")");
      ok(baj.length > 0 && baj.length <= 40 && !/\d/.test(baj), "evento '" + e.id + "': la bajada dice el efecto con palabras y sin números (" + baj + ")");
    });
  });
  /* 25/oct, pedido de Rodri: con las palabras de la semana, como en sus tarjetas */
  ok(D.bajadaDeEfecto({ pase: 6, tiro: -3 }) === "más PASE, menos TIRO", "lo que suma va antes que lo que resta");
  ok(D.iconoDeEfecto({ pase: 6, tiro: -3 }) === "pase", "el dibujito es el de lo que suma");
  ok(D.bajadaDeEfecto({ recuperacion: 1.5 }) === "más recuperación", "la recuperación es un multiplicador: 1,5 es más");
  ok(D.iconoDeEfecto({}) === "igual" && D.bajadaDeEfecto({}) === "todo igual", "la opción que no cambia nada lo dice");
  /* visto en pantalla el 22/oct: decía "más primer tiempo" */
  ok(D.bajadaDeEfecto({ arranque: 5 }) === "arrancás con todo" && D.bajadaDeEfecto({ final: -4 }) === "cerrás sin piernas",
    "los tramos del partido se dicen con su frase (" + D.bajadaDeEfecto({ arranque: 5 }) + " / " + D.bajadaDeEfecto({ final: -4 }) + ")");
  VIDA.eventos.forEach(function (e) {
    e.opciones.forEach(function (o) { ok(!/(más|menos) (primer|segundo) tiempo/.test(D.bajadaDeEfecto(o.efecto)), "evento '" + e.id + "': la bajada no dice más o menos de un tiempo (" + D.bajadaDeEfecto(o.efecto) + ")"); });
  });
  console.log("[2] opciones cortas con bajada y dibujito: " + VIDA.origen.length * 4 + " de la entrevista, " + VIDA.eventos.length * 2 + " de eventos");
})();

/* ---------- [3] la previa de la fecha, para cada rival de cada división ---------- */
(function () {
  var n = 0, conEstrella = 0, conLocalidad = 0;
  Object.keys(DIV.divisiones).forEach(function (div) {
    DIV.divisiones[div].rivales.forEach(function (rival, k) {
      var pv = D.previaDeLaFecha({ rival: rival, division: div, roster: ROSTER, previa: REL.previa_fecha, relatores: REL.relatores, perfil: "de toque", puesto: (k + 2) + "º", fecha: k, hash: D.hash });
      n++;
      ok(pv.paginas.every(function (p) { return p.length > 10 && p.indexOf("{") < 0; }), rival + ": las páginas están completas");
      ok(pv.paginas[0].indexOf(rival) >= 0, rival + ": la primera página dice quién es el rival");
      /* 20/oct, Rodri: el puesto (o la tabla en cero) va en una oración aparte del perfil */
      ok(k === 0 ? /\. Es la primera fecha: todos los equipos arrancan sin puntos\.$/.test(pv.paginas[0])
        : /\. Llega \d+º en la tabla\.$/.test(pv.paginas[0]), rival + ": la tabla en su propia oración (" + pv.paginas[0] + ")");
      var baja = div === "primera_b" || div === "primera_a";
      ok(baja ? !!pv.estrella : pv.estrella === null, rival + ": estrella del roster en la B y la A, ninguna inventada más arriba");
      ok(pv.paginas.length === (pv.estrella ? 4 : 3), rival + ": rival, estrella si hay, localidad y relator");
      var rel = REL.relatores.filter(function (r) { return r.id === pv.relator; })[0];
      ok(rel && rel.previa.indexOf(pv.paginas[pv.paginas.length - 1]) >= 0, rival + ": la última es una frase de previa del relator, tal cual está en data");
      ok(!!MAN.relator.caras[pv.relator], rival + ": el relator de la previa tiene cara");
      if (pv.estrella) {
        conEstrella++;
        var j = ROSTER.jugadores.filter(function (x) { return x.id === pv.estrella; })[0];
        /* 23/oct, pedido de Rodri: la previa no repite la localidad. El apodo ya
           la dice («Mate de Intendente Alvear»), así que la historia va sin su
           "De Intendente Alvear, " del principio y sin las oraciones que
           repiten lo dicho; la primera oración queda siempre */
        var sinDe = j.historia.replace("De " + j.pueblo + ", ", "");
        var primera = (sinDe.charAt(0).toUpperCase() + sinDe.slice(1)).split(/(?<=\.) /)[0];
        ok(j.posicion_motor !== "ARQ" && pv.paginas[1].indexOf(j.nombre) >= 0 && pv.paginas[1].indexOf(primera) >= 0, rival + ": la estrella con su nombre y su historia del roster");
        ok(pv.paginas[1].indexOf("De " + j.pueblo + ",") < 0, rival + ": SÍNTOMA: la historia repite la localidad que el apodo ya dijo (" + pv.paginas[1] + ")");
        ok(D.estrellaDe(rival, div, ROSTER, D.hash).id === pv.estrella, rival + ": la misma estrella que viaja al partido");
      }
      if (pv.localidad) { conLocalidad++; ok(pv.paginas.join(" ").indexOf(pv.localidad) >= 0, rival + ": la localidad aparece"); }
      var todo = pv.paginas.join(" ");
      ok(!/\bpueblos?\b|\bpibes?\b/i.test(todo), rival + ": lenguaje institucional (" + todo + ")");
      /* 23/oct: ni la localidad ni las palabras de no_repetir dos veces (el nombre del club no cuenta) */
      var sinClub = todo.split(rival).join(" ");
      if (pv.localidad) ok(sinClub.split(pv.localidad).length - 1 <= 1, rival + ": SÍNTOMA: la previa repite la localidad (" + todo + ")");
      var dosVeces = REL.previa_fecha.no_repetir.filter(function (w) { return sinClub.toLowerCase().split(w).length - 1 > 1; });
      ok(dosVeces.length === 0, rival + ": SÍNTOMA: la previa repite " + dosVeces.join(", ") + " (" + todo + ")");
    });
  });
  ok(D.localidadDe("Jagüel Viejo", ROSTER) === "Winifreda", "el clásico declarado en el roster da la localidad");
  ok(D.localidadDe("Capital de Santa Rosa", ROSTER) === "Santa Rosa", "el nombre del club manda sobre el clásico de otra localidad");
  ok(/estrella: this\.estrellaDeLaFecha\(rival\)/.test(MASTER) && /mpE\.estrella/.test(MATCH), "la estrella viaja en masterPartido y juega en el rival");
  ok(/this\.vistaPrevia\(rival, \(\) => this\.irALaCancha\(rival\)\)/.test(MASTER), "la previa va después de la semana y antes de la cancha");
  console.log("[3] la previa: " + n + " rivales · " + conEstrella + " con estrella · " + conLocalidad + " con localidad");
})();

/* ---------- [4] el relato fuerte en viñeta ---------- */
(function () {
  var R = BAL.relator;
  ok(R.ticker_px >= 16, "los comentarios comunes crecieron (" + R.ticker_px + " px)");
  R.fuertes.forEach(function (s) {
    ok(Array.isArray(REL.relator[s]) && REL.relator[s].length >= 2, "la situación fuerte '" + s + "' tiene frases en relatos.json");
  });
  ["gol", "atajada", "palo", "final"].forEach(function (s) { ok(R.fuertes.indexOf(s) >= 0, "'" + s + "' sale en viñeta"); });
  ok(/c\.mega\) \{ this\.vinietaRelator\(f\)/.test(MATCH) && /palo: !!d\.palo, mega: !!mega/.test(MATCH), "el súper tiro y el palo llegan a la viñeta");
  ok(/fontSize: "2[2-9]px"/.test(MATCH.slice(MATCH.indexOf("  armarVinieta()"), MATCH.indexOf("  _pintarVinieta("))), "la frase de la viñeta va grande");
  ok(!!REL.relatores.filter(function (r) { return r.id === MAN.relator.partido; })[0], "el relator del partido existe en relatos.json");
  var a = MAN.relator.caras;
  Object.keys(a).forEach(function (k) {
    var r = a[k];
    ok(r[0] >= 0 && r[1] >= 0 && r[0] + r[2] <= 1024 && r[1] + r[3] <= 335, "la cara de '" + k + "' cae adentro de relatores.webp");
  });
  console.log("[4] relato fuerte en viñeta: " + R.fuertes.join(", ") + " y el súper tiro");
})();

/* ---------- [5] revisión del 23/oct: lo que elegiste en la semana, dicho a vos ----------
   "En la radio nombró a todos" salía cuando habías ido vos: el evento te
   habla de vos ("te quiere hacer una nota"), la opción es tuya ("Voy y hablo
   del equipo") y la frase que sale en el partido te nombraba en tercera
   persona, como si hubiera ido otro. Las 56 frases van ahora en segunda
   persona con voseo, como las de LA SEMANA (data/semana.json: "Te quedaste
   pateando..."). */
(function () {
  var EV = json("data/eventos_temporada.json"), frases = [];
  JSON.stringify(EV, function (k, v) { if (k === "frase_relator") frases.push(v); return v; });
  var TERCERA = /\b(nombró|Firmó|Habló él|Mandó|Durmió|Prefiere|Prefirió|Eligió|Avisó|Pidió|Se perdió|Se quedó|Se cuidó|Le pegó|Le pateó|Viene|Sale|Sabe|Quiere|Va a|Estrena|Debuta|Empieza|Fue a|lo esperan|lo respeta|lo están)\b/;
  var malas = frases.filter(function (f) { return TERCERA.test(f); });
  ok(frases.length >= 50, "control: se leyeron las frases de los eventos (" + frases.length + ")");
  ok(malas.length === 0, "SÍNTOMA: frases de la semana que te nombran en tercera persona: " + malas.slice(0, 4).join(" | "));
  ok(frases.indexOf("En la radio nombraste a todo el plantel: el equipo se agrandó.") >= 0, "la de la radio dice que nombraste vos");
  ok(!frases.some(function (f) { return /\b(tenés|sabés)\b/.test(f) && /\b(tienes|sabes)\b/.test(f); }), "sin mezclar voseo y tuteo");
  console.log("[5] las " + frases.length + " frases de los eventos de la semana te hablan de vos");
})();

console.log((fail ? "✗ " + fail + " FALLARON" : "✓ todo ok") + " (" + pass + " ok)");
process.exit(fail ? 1 : 0);
