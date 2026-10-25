/* PAMPA STAR · el lenguaje institucional en todo texto que se ve (ola 3, L12)
   El juego es de la Subsecretaría de Juventudes: sin masculino genérico, sin
   "e" ni barras, "localidades" y nunca "pueblos", "jóvenes" y nunca "pibes",
   y voseo de punta a punta (nada de tuteo mezclado). Antes de este guardián
   la semana decía "Llegás entero", el opening abría con "En algún pueblo de
   La Pampa" y el manifiesto, lo que muestra el celular al instalar, hablaba
   de "un pibe pampeano".
   Lo que mira: los literales de texto (no los comentarios ni los ids) de
   phaser/scenes y phaser/logic, los valores de data/ y phaser/data (no las
   notas "_..." ni los ids), los scripts y el texto de phaser/index.html, de
   la portada (index.html) y del modo retro (clasico/index.html), el
   manifiesto y los dos README. Los {marcadores} se reemplazan al jugar y no
   se leen: {pueblo} pone el nombre de la localidad.
   node phaser/test/lenguaje.test.js */
"use strict";
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..", "..");
let ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("✗ " + m); } }
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), "utf8");

const L = "A-Za-zÁÉÍÓÚÜÑáéíóúüñ";
const palabra = p => new RegExp("(^|[^" + L + "])(" + p + ")(?![" + L + "])", "i");
const PROHIBIDAS = [
  { re: palabra("pibes?|pibas?"), por: "pibes: va jóvenes, juventudes o el nombre" },
  { re: palabra("pueblos?"), por: "pueblo: va localidad" },
  { re: palabra("muchach[oa]s?"), por: "muchachos: masculino genérico" },
  { re: palabra("bienvenidos?"), por: "bienvenido: masculino genérico" },
  { re: palabra("compañeros"), por: "compañeros: masculino genérico (el equipo, el plantel)" },
  { re: palabra("nuestros"), por: "nuestros: masculino genérico" },
  /* 25/oct, pedido de Rodri (la parte no jugable): "gol de ellos", "penal para
     ellos", "Señores" en la previa y "nosotros" en la tribuna */
  { re: palabra("ellos|nosotros|señores"), por: "ellos, nosotros, señores: masculino genérico (el rival, el equipo)" },
  { re: palabra("todos"), por: "todos: masculino genérico" },
  { re: palabra("enteros?|cansados?|fundidos?|golpeados?|tranquilos?|contentos?|nerviosos?|preparados?|convocados?"), por: "adjetivo con género para quien juega" },
  { re: palabra("tú|tienes|puedes|quieres|eres|vienes|sabes|haces|juegas|elige|pulsa|presiona|haz|contigo"), por: "tuteo: el juego habla de vos" },
  { re: palabra("todes|elles|chiques|amigues|compañeres|nosotres|jugadores?/as?|[" + L + "]+@s?|[" + L + "]+xs"), por: "lenguaje con e, x o arroba" },
  { re: new RegExp("[" + L + "]/(a|as|o|os)(?![" + L + "])|(^|[^" + L + "])(el|los|un|unos)/(la|las|una|unas)(?![" + L + "])", "i"), por: "barras de género" }
];
/* lo que se queda, con su porqué: el texto exacto (o un pedazo) y el archivo */
const PERMITIDOS = [
  { archivo: "phaser/scenes/match.js", texto: "el quite estaba preparado", porque: "preparado es el quite, la jugada" },
  { archivo: "phaser/logic/avatar.js", texto: "Tranquilos", porque: "los ojos del editor: Despiertos, Tranquilos, Pícaros" },
  { archivo: "data/relatos.json", texto: "todos los equipos arrancan sin puntos", porque: "los equipos, no personas (lo fija dialogo.test.js)" }
];
const permitido = (rel, txt) => PERMITIDOS.some(p => p.archivo === rel && txt.indexOf(p.texto) >= 0);

/* claves de nota que no empiezan con "_": pose_falta es el pedido de arte de la semana */
const NOTAS = new Set(["pose_falta"]);
const pareceId = s => /^[a-z0-9_.\-\/:#?=&%+]*$/.test(s);
const limpio = s => s.replace(/\{[A-Za-z_]+\}/g, " ");
const hallados = [];
function revisar(rel, donde, txt) {
  if (!txt || pareceId(txt)) return;
  const t = limpio(txt);
  for (const P of PROHIBIDAS) {
    const m = t.match(P.re);
    if (m && !permitido(rel, txt)) { hallados.push(rel + " " + donde + " «" + t.trim().slice(0, 90) + "» (" + P.por + ")"); return; }
  }
}

/* los literales de un JS, sin comentarios ni expresiones regulares; de las
   plantillas `...${x}...` quedan las partes de texto */
function literales(src) {
  const out = [];
  let i = 0, linea = 1, prev = "";
  const n = src.length;
  /* el valor de una clave "_nota" o _doc: es nota, no se ve */
  const esNota = k => /(^|[^\w$])["']?_\w*["']?\s*:\s*$/.test(src.slice(Math.max(0, k - 40), k));
  const antesDeRegex = c => c === "" || "(,=:[!&|?{};+-*%<>~^".indexOf(c) >= 0;
  while (i < n) {
    const c = src[i];
    if (c === "\n") { linea++; i++; continue; }
    if (c === "/" && src[i + 1] === "/") { while (i < n && src[i] !== "\n") i++; continue; }
    if (c === "/" && src[i + 1] === "*") {
      const j = src.indexOf("*/", i + 2), fin = j < 0 ? n : j + 2;
      linea += (src.slice(i, fin).match(/\n/g) || []).length; i = fin; continue;
    }
    if (c === "'" || c === "\"") {
      let j = i + 1, s = "";
      while (j < n && src[j] !== c && src[j] !== "\n") { if (src[j] === "\\") { s += src[j + 1] === "n" ? " " : src[j + 1]; j += 2; continue; } s += src[j]; j++; }
      out.push({ txt: s, linea, nota: esNota(i) }); i = j + 1; prev = c; continue;
    }
    if (c === "`") {
      let j = i + 1, s = ""; const l0 = linea;
      while (j < n && src[j] !== "`") {
        if (src[j] === "\\") { s += src[j + 1] === "n" ? " " : src[j + 1]; j += 2; continue; }
        if (src[j] === "$" && src[j + 1] === "{") { let d = 1; j += 2; while (j < n && d) { if (src[j] === "{") d++; else if (src[j] === "}") d--; j++; } s += " "; continue; }
        if (src[j] === "\n") linea++;
        s += src[j]; j++;
      }
      out.push({ txt: s, linea: l0, nota: esNota(i) }); i = j + 1; prev = "`"; continue;
    }
    if (c === "/" && antesDeRegex(prev)) {
      let j = i + 1, clase = false;
      while (j < n && src[j] !== "\n") {
        if (src[j] === "\\") { j += 2; continue; }
        if (src[j] === "[") clase = true; else if (src[j] === "]") clase = false; else if (src[j] === "/" && !clase) break;
        j++;
      }
      i = j + 1; while (i < n && /[a-z]/.test(src[i])) i++; prev = "/"; continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i; while (j < n && /[\w$]/.test(src[j])) j++;
      const w = src.slice(i, j); prev = (w === "return" || w === "typeof" || w === "case") ? "(" : "a"; i = j; continue;
    }
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return out;
}
function revisarJs(rel, src) { literales(src).forEach(l => { if (!l.nota) revisar(rel, ":" + l.linea, l.txt); }); }
function revisarJson(rel) {
  (function andar(v, donde) {
    if (typeof v === "string") revisar(rel, donde, v);
    else if (Array.isArray(v)) v.forEach((x, i) => andar(x, donde + "[" + i + "]"));
    else if (v && typeof v === "object") Object.keys(v).forEach(k => { if (k[0] !== "_" && !NOTAS.has(k)) andar(v[k], donde + "." + k); });
  })(JSON.parse(leer(rel)), "");
}
function revisarHtml(rel) {
  const html = leer(rel).replace(/<!--[\s\S]*?-->/g, "");
  html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/g, (_, js) => { revisarJs(rel + " (script)", js); return ""; })
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, "\n").split(/\n/).forEach((l, i) => revisar(rel, "(texto)", l.trim()));
}
function revisarProsa(rel) {
  leer(rel).replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, " ").split(/\r?\n/).forEach((l, i) => revisar(rel, ":" + (i + 1), l.trim()));
}

["phaser/scenes", "phaser/logic"].forEach(d => fs.readdirSync(path.join(RAIZ, d)).filter(f => f.endsWith(".js")).forEach(f => revisarJs(d + "/" + f, leer(d + "/" + f))));
["data", "phaser/data"].forEach(d => fs.readdirSync(path.join(RAIZ, d)).filter(f => f.endsWith(".json")).forEach(f => revisarJson(d + "/" + f)));
revisarHtml("phaser/index.html");
revisarHtml("index.html");
revisarHtml("clasico/index.html");
revisarJson("phaser/manifest.webmanifest");
revisarProsa("README.md");
revisarProsa("phaser/README.md");
assert(hallados.length === 0, "SÍNTOMA: textos con lenguaje fuera de la regla (" + hallados.length + "):\n  " + hallados.join("\n  "));

/* el guardián se prueba a sí mismo: lo que tiene que agarrar, lo agarra */
const agarra = t => PROHIBIDAS.some(P => P.re.test(limpio(t)));
["Llegás entero", "En algún pueblo de La Pampa", "ASADO CON LOS PIBES", "¡Gol de los nuestros!", "Bienvenido a La Pampa.",
  "Dos compañeros se pelearon", "¿Tú qué haces?", "Elige una jugada", "todes", "jugador/a", "los/las jóvenes", "tod@s", "amigxs"]
  .forEach(t => assert(agarra(t), "el guardián tiene que agarrar «" + t + "»"));
["¡GRITALO, {pueblo}!", "Llegás con las piernas enteras", "En alguna localidad de La Pampa", "Elegí una jugada", "1/2", "Tenés aguante"]
  .forEach(t => assert(!agarra(t), "el guardián no tiene que agarrar «" + t + "»"));
const lits = literales("var a = 'Llegás entero'; // pueblo\n/* pibes */ var b = x / 2; var r = /pueblo/g; var c = `hola ${d.pueblo} che`;");
assert(lits.length === 2 && lits[0].txt === "Llegás entero" && !/pueblo/.test(lits[1].txt), "los literales salen sin comentarios, regex ni expresiones (" + JSON.stringify(lits) + ")");

console.log((mal ? "✗" : "✓") + " lenguaje: " + ok + " ok, " + mal + " mal");
process.exit(mal ? 1 : 0);
