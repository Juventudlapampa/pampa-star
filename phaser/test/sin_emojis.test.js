/* PAMPA STAR · test de los textos sin emojis (pedido de Rodri del 22/oct)
   "TOCÁ PARA EMPEZAR", "PEGAR UN CÓDIGO", "código de carrera", "GUARDAR
   PINTA", los nombres de la semana y otros 120 textos llevaban un emoji
   adelante. El navegador los dibuja con la tipografía de emojis del sistema:
   salen distintos en cada teléfono y no son de la pieza. Si hace falta un
   ícono, va dibujado por código o es un signo de la tipografía (los que
   están en Press Start 2P: ▶ ◀ ★ ☆ ♥ ♪ ▲ ▼).
   Lo que mira: las líneas de código (no los comentarios) de phaser/scenes y
   phaser/logic, los valores de data/ y phaser/data (no las notas "_...") y
   el texto visible de phaser/index.html.
   node phaser/test/sin_emojis.test.js */
"use strict";
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..", "..");
let ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("✗ " + m); } }

const SIGNOS = new Set(["▶", "◀", "★", "☆", "♥", "♪", "▲", "▼"]);
const emojisDe = s => [...s].filter(c => /\p{Extended_Pictographic}/u.test(c) && !SIGNOS.has(c));

const hallados = [];
function revisarJs(rel) {
  let enCom = false;
  fs.readFileSync(path.join(RAIZ, rel), "utf8").split(/\r?\n/).forEach((l, i) => {
    const s = l.trim();
    if (enCom) { if (s.includes("*/")) enCom = false; return; }
    if (s.startsWith("//") || s.startsWith("*")) return;
    if (s.startsWith("/*")) { if (!s.includes("*/")) enCom = true; return; }
    const m = l.match(/(^|[^:"'])\/\/ |\/\*/);
    const cod = m ? l.slice(0, m.index + (m[1] || "").length) : l;
    const e = emojisDe(cod);
    if (e.length) hallados.push(rel + ":" + (i + 1) + " " + e.join(""));
  });
}
function revisarJson(rel) {
  (function andar(v, donde) {
    if (typeof v === "string") { const e = emojisDe(v); if (e.length) hallados.push(rel + " " + donde + " " + e.join("")); }
    else if (Array.isArray(v)) v.forEach((x, i) => andar(x, donde + "[" + i + "]"));
    else if (v && typeof v === "object") Object.keys(v).forEach(k => { if (k[0] !== "_") andar(v[k], donde + "." + k); });
  })(JSON.parse(fs.readFileSync(path.join(RAIZ, rel), "utf8")), "");
}
["phaser/scenes", "phaser/logic"].forEach(d => fs.readdirSync(path.join(RAIZ, d)).filter(f => f.endsWith(".js")).forEach(f => revisarJs(d + "/" + f)));
["data", "phaser/data"].forEach(d => fs.readdirSync(path.join(RAIZ, d)).filter(f => f.endsWith(".json")).forEach(f => revisarJson(d + "/" + f)));
/* el HTML: sin comentarios, y los scripts como código */
const html = fs.readFileSync(path.join(RAIZ, "phaser/index.html"), "utf8").replace(/<!--[\s\S]*?-->/g, "");
html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/g, function (_, js) {
  js.replace(/\/\*[\s\S]*?\*\//g, "").split(/\r?\n/).forEach(l => {
    const m = l.match(/(^|[^:"'\\])\/\/ /);
    const e = emojisDe(m ? l.slice(0, m.index) : l);
    if (e.length) hallados.push("phaser/index.html (script) " + e.join("") + " " + l.trim().slice(0, 60));
  });
  return "";
}).replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, "").split(/\r?\n/).forEach(l => {
  const e = emojisDe(l);
  if (e.length) hallados.push("phaser/index.html " + e.join("") + " " + l.trim().slice(0, 60));
});
/* los dos README son la cara pública del repo (ola 3, L12): el de la raíz
   abría con una pelota y nombraba los botones con 💾 y 📋, que el juego ya no tiene */
["README.md", "phaser/README.md"].forEach(rel => fs.readFileSync(path.join(RAIZ, rel), "utf8").split(/\r?\n/).forEach((l, i) => {
  const e = emojisDe(l);
  if (e.length) hallados.push(rel + ":" + (i + 1) + " " + e.join(""));
}));
assert(hallados.length === 0, "SÍNTOMA: textos del juego con emojis (" + hallados.length + "): " + hallados.slice(0, 12).join(" | "));

/* los que nombró Rodri, con su texto nuevo */
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), "utf8");
const BAL = JSON.parse(leer("phaser/data/balance.json"));
assert(BAL.intro.t_compuerta === "TOCÁ PARA EMPEZAR", "la compuerta dice TOCÁ PARA EMPEZAR (" + BAL.intro.t_compuerta + ")");
assert(/"PEGAR UN CÓDIGO"/.test(leer("phaser/scenes/master.js")) && /"código de carrera"/.test(leer("phaser/scenes/master.js")), "PEGAR UN CÓDIGO y código de carrera, sin 📋 ni 💾");
assert((leer("phaser/scenes/editor.js").match(/"GUARDAR PINTA"/g) || []).length === 2, "GUARDAR PINTA, sin 💾");
const SEM = JSON.parse(leer("data/semana.json"));
assert(SEM.opciones.every(o => /^[A-ZÁÉÍÓÚÑ]/.test(o.n)), "los nombres de la semana empiezan con la palabra (" + SEM.opciones.map(o => o.n).join(", ") + ")");

console.log((mal ? "✗" : "✓") + " sin emojis: " + ok + " ok, " + mal + " mal");
process.exit(mal ? 1 : 0);
